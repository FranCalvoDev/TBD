# Base de datos y sincronización

El servidor listo para usar está en [`selfhost/`](../selfhost) y se instala con la guía [AUTOALOJADO.md](AUTOALOJADO.md). Este documento describe lo que hay por dentro, por si alguien quiere adaptar el servidor o escribir otro.

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

## Configuración

- La app no trae direcciones ni claves. Cada dispositivo guarda su propio servidor (dirección, clave y nombre) en `localStorage` (`tbd:servidor`); no se sincroniza ni entra en las copias de seguridad.
- El servidor lee su configuración de `selfhost/.env` (contraseña de la base, puerto y dominio). Ese archivo nunca se sube al repositorio.

## Contrato de la API

La app usa `createHttpRemote` (`src/storage/remote.js`) contra el servidor configurado:

```
GET  /changes?since=<cursor>   → 200 {"changes": [{"col": "tasks", "rec": {...}}], "cursor": 123}
GET  /changes                  → todo (primera sincronización del dispositivo)
POST /changes  {"changes": [...]}  → 204
```

- `cursor` es un número que crece con cada escritura aceptada en el servidor. El cliente lo guarda y lo envía en el siguiente pull.
- El POST guarda cada registro solo si le gana al que ya existe (regla de arriba). Los que pierden se ignoran sin error.
- La autenticación va en `Authorization: Bearer <clave de acceso>`. El servidor deduce la persona de la clave, nunca del cuerpo.
- `GET /me` devuelve `{"name": "..."}`: la app lo usa para probar la dirección y la clave antes de conectar.

`src/storage/memoryRemote.js` implementa este mismo comportamiento en memoria y los tests de `tests/storage.test.js` lo usan como servidor: sirve de especificación ejecutable.

## Esquema para PostgreSQL

El script listo para ejecutar está en [`sql/schema.sql`](../sql/schema.sql) (PostgreSQL 13 o superior):

```bash
psql "$DATABASE_URL" -f sql/schema.sql
```

Crea las tablas `tbd_users` (personas y hash de sus claves) y `tbd_records`, y dos funciones que implementan el contrato de arriba, así la API solo tiene que llamarlas:

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

## Otros servidores

Cualquier servidor que cumpla el contrato de arriba sirve (por ejemplo, uno sobre SQLite). También se puede escribir un objeto con `pull`, `push` y, opcionalmente, `subscribe` y pasarlo a `initData({remote})` en `src/main.js`.
