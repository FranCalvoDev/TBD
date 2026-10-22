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
- El servidor lee `MONGODB_URI`, `MONGODB_DB`, el puerto y el dominio de `selfhost/.env`. La URI y las credenciales solo se usan en el servidor; nunca se incluyen en la app ni se suben al repositorio.

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

## Persistencia MongoDB

El servidor de [`selfhost/`](../selfhost/) usa el driver oficial de MongoDB y se conecta a Atlas mediante `MONGODB_URI`. En MongoDB se guardan documentos en tres colecciones:

| Colección | Documento y propósito |
|---|---|
| `users` | `{_id, name, tokenHash, createdAt, revoked}`. Guarda solo el hash SHA-256 de cada clave; `name` y `tokenHash` tienen índices únicos. |
| `records` | `{userId, col, recordId, data, updatedAt, deviceId, deleted, seq}`. Un documento por registro de app, con índice único `{userId, col, recordId}`. `data` conserva el registro de la app como documento BSON. |
| `counters` | `{_id: "changes", value}`. Contador secuencial que proporciona cursores crecientes. |

Al arrancar, el servidor crea los índices requeridos con `createIndex`; no hace falta ejecutar scripts ni configurar tablas manualmente. `records` contiene la versión ganadora más reciente de cada registro. Cada escritura aceptada actualiza ese documento y el contador dentro de una transacción, así se conserva el cursor y la regla de conflictos. La base de datos de Atlas debe admitir transacciones (los clústeres Atlas las admiten).

El usuario asociado se obtiene de la clave de acceso, nunca del cuerpo de la petición. El servidor valida `col`, `id` y `updatedAt`, ignora entradas inválidas y usa la misma regla de conflictos que la app. La app se conecta únicamente al servidor HTTP: **no pongas la URI ni credenciales de Atlas en el cliente**.

## Otros servidores

Cualquier servidor que cumpla el contrato de arriba sirve (por ejemplo, uno sobre SQLite). También se puede escribir un objeto con `pull`, `push` y, opcionalmente, `subscribe` y pasarlo a `initData({remote})` en `src/main.js`.
