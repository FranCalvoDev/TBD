# Conectar una base de datos

> **Privacidad:** el repositorio es público. Las claves y URLs de tu base de datos van en variables de entorno (`.env`, ignorado por git) o en los secretos de GitHub Actions, nunca en el código. Cada usuario solo debe poder leer y escribir sus propias filas (por ejemplo, con Row Level Security por `user_id`).

La app ya tiene todo el lado del cliente: cola de cambios sin conexión, reintentos, resolución de conflictos y migración. Para sincronizar entre dispositivos falta un backend que cumpla el contrato de `src/storage/remote.js`.

## Modelo de datos

Cinco colecciones. Cada registro es un objeto JSON con estos campos comunes:

| Campo       | Tipo    | Descripción                                             |
|-------------|---------|---------------------------------------------------------|
| `id`        | texto   | Único dentro de la colección                            |
| `updatedAt` | número  | Milisegundos; siempre crece en cada edición             |
| `deviceId`  | texto   | Dispositivo que hizo la última edición                  |
| `deleted`   | booleano| Solo en lápidas (`{id, deleted:true, updatedAt, deviceId}`) |

| Colección | id                  | Contenido |
|-----------|---------------------|-----------|
| `categories` | `trabajo`, `cat…` | `name`, `color` (`c1`…`c8`, la paleta de `tokens.css`), `order` |
| `blocks`  | `u…`                | `day` (0 = lunes), `s`, `e` ("HH:MM", hasta "24:30"), `cat` (id de categoría), `title`, `p` (nota), `l` (tips) |
| `goals`   | `g…`                | `label`, `cat`, `target`, `order` |
| `tasks`   | `t…`                | `title`, `est` (min), `cat`, `due` ("AAAA-MM-DD"), `done`, `doneAt`, `doneWeek`, `slot` `{week, day, s, e}` |
| `weeks`   | `2026-S42`          | `label`, `done` y `off` (`{[blockId]: {cat, min, day, title, at}}`), `goals` (`{[goalId]: número}`), `planned` |

## Regla de conflictos

Cuando llegan dos versiones del mismo registro gana la de `updatedAt` mayor; si empatan, la de `deviceId` mayor (función `isNewer` en `src/state/store.js`). El servidor tiene que aplicar exactamente la misma regla al guardar.

**Límite conocido:** una semana es un solo registro. Si dos dispositivos sin conexión marcan bloques distintos de la misma semana, al sincronizar queda solo la última versión. Si eso molesta, el siguiente paso es separar cada marca y cada meta semanal en su propio registro.

## Configuración sin exponer datos

- **Desarrollo:** copia `.env.example` a `.env` y completa `VITE_SYNC_URL`. `.env` está en `.gitignore`.
- **APK en GitHub Actions:** crea la variable `VITE_SYNC_URL` en *Settings → Secrets and variables → Actions → Variables*. El workflow la usa al compilar. Si tu backend necesita otras variables públicas (por ejemplo la URL y la clave anónima de Supabase), agrégalas igual y pásalas en el paso «Compilar la web» de `.github/workflows/android.yml`.
- Todo lo que empieza con `VITE_` termina dentro de la app compilada: úsalo solo para valores pensados para ser públicos (URLs, claves anónimas). Las claves de servidor nunca van en la app.

## Contrato de la API

Por defecto se usa `createHttpRemote` con `VITE_SYNC_URL`:

```
GET  /changes?since=<cursor>   → 200 {"changes": [{"col": "tasks", "rec": {...}}], "cursor": 123}
GET  /changes                  → todo (primera sincronización del dispositivo)
POST /changes  {"changes": [...]}  → 204
```

- `cursor` es un número que crece con cada escritura aceptada en el servidor. El cliente lo guarda y lo envía en el siguiente pull.
- El POST guarda cada registro solo si le gana al que ya existe (regla de arriba). Los que pierden se ignoran sin error.
- La autenticación va en `Authorization: Bearer <token>` (`getToken` en `createHttpRemote`). El servidor deduce el usuario del token; nunca del cuerpo.

`src/storage/memoryRemote.js` implementa este mismo comportamiento en memoria y los tests de `tests/storage.test.js` lo usan como servidor: sirve de especificación ejecutable.

## Esquema para PostgreSQL

El script listo para ejecutar está en [`sql/schema.sql`](../sql/schema.sql) (PostgreSQL 13 o superior):

```bash
psql "$DATABASE_URL" -f sql/schema.sql
```

Crea la tabla `tbd_records` y dos funciones que implementan el contrato de arriba, así la API solo tiene que llamarlas:

| Endpoint | Consulta | Respuesta |
|---|---|---|
| `GET /changes?since=<cursor>` | `select tbd_pull($1::uuid, $2::bigint)` | el JSON tal cual: `{"changes": [...], "cursor": n}` |
| `POST /changes` | `select tbd_push($1::uuid, $2::jsonb)` con el cuerpo recibido | `204` |

`$1` es el id del usuario sacado del token de sesión, nunca del cuerpo de la petición.

Qué resuelve el script:
- Aplica la misma regla de conflictos que la app (compara `deviceId` igual que JavaScript, con `collate "C"`).
- Si un lote trae el mismo registro dos veces, se queda con el más nuevo en vez de fallar.
- Ignora colecciones desconocidas o registros sin `id` sin rechazar el resto del lote.
- Se puede volver a ejecutar sin perder datos.
- Al final tiene, comentadas, las reglas de seguridad por fila para Supabase.

## Otros backends

Cualquier servicio sirve si se escribe un objeto con `pull`, `push` y, opcionalmente, `subscribe` (para avisos en tiempo real), y se pasa en `src/main.js`:

```js
const {store, sync} = initData({remote: miBackend, onStatus: showSyncStatus});
```

- **Supabase**: ejecuta `sql/schema.sql` en el editor SQL y activa la seguridad por fila (las líneas comentadas al final). Desde la app, `push` llama a `supabase.rpc("tbd_push", {p_user, p_changes})` y `pull` a `supabase.rpc("tbd_pull", {p_user, p_since})`; `subscribe` puede escuchar Realtime sobre `tbd_records`. Con la seguridad por fila activa, aunque alguien mande otro `p_user` solo puede leer y escribir lo suyo, porque las funciones corren con los permisos de quien llama.
- **Firebase / Firestore**: un documento por registro en `users/{uid}/{col}/{id}`; la regla de conflictos se aplica en una transacción y `pull` consulta por un campo de orden del servidor.
