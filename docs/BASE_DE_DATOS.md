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

## Esquema sugerido (PostgreSQL)

```sql
create sequence records_seq;

create table records (
  user_id    uuid    not null,
  col        text    not null check (col in ('categories', 'blocks', 'goals', 'tasks', 'weeks')),
  id         text    not null,
  data       jsonb   not null,              -- el registro completo, tal como lo manda la app
  updated_at bigint  not null,
  device_id  text    not null,
  deleted    boolean not null default false,
  seq        bigint  not null default nextval('records_seq'),
  primary key (user_id, col, id)
);
create index records_user_seq on records (user_id, seq);

-- POST /changes: una fila por cambio, solo si es más nuevo
insert into records (user_id, col, id, data, updated_at, device_id, deleted)
values ($1, $2, $3, $4, $5, $6, $7)
on conflict (user_id, col, id) do update
  set data = excluded.data, updated_at = excluded.updated_at, device_id = excluded.device_id,
      deleted = excluded.deleted, seq = nextval('records_seq')
  where (excluded.updated_at, excluded.device_id) > (records.updated_at, records.device_id);

-- GET /changes?since=$2
select col, data as rec, seq from records where user_id = $1 and seq > $2 order by seq;
-- cursor de respuesta: el mayor seq devuelto (o $2 si no hubo cambios)
```

## Otros backends

Cualquier servicio sirve si se escribe un objeto con `pull`, `push` y, opcionalmente, `subscribe` (para avisos en tiempo real), y se pasa en `src/main.js`:

```js
const {store, sync} = initData({remote: miBackend, onStatus: showSyncStatus});
```

- **Supabase**: la tabla de arriba con Row Level Security por `user_id`; `push` llama a una función RPC con el `insert … on conflict`, `pull` hace el `select` y `subscribe` usa Realtime sobre la tabla.
- **Firebase / Firestore**: un documento por registro en `users/{uid}/{col}/{id}`; la regla de conflictos se aplica en una transacción y `pull` consulta por un campo de orden del servidor.
