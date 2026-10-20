-- TBD · MiSemana — base de datos para sincronizar entre dispositivos (PostgreSQL 13 o superior).
-- El servidor autoalojado (selfhost/) lo aplica solo al arrancar. También se puede ejecutar a mano:
--   psql "$DATABASE_URL" -f sql/schema.sql
-- Se puede volver a ejecutar sin perder datos: todo usa IF NOT EXISTS / CREATE OR REPLACE.
--
-- Una fila por registro de la app. La regla de conflictos es la misma que en la app
-- (isNewer en src/state/store.js): gana updated_at mayor y, si empatan, device_id mayor.

begin;

-- Personas que usan el servidor. La clave de acceso se guarda solo como hash SHA-256:
-- quien tenga la base de datos no puede leer las claves.
create table if not exists tbd_users (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  token_hash text        not null unique,
  created_at timestamptz not null default now(),
  revoked    boolean     not null default false
);

create sequence if not exists tbd_records_seq;

create table if not exists tbd_records (
  user_id    uuid    not null,
  col        text    not null,
  id         text    not null,
  data       jsonb   not null,              -- el registro completo, tal como lo manda la app
  updated_at bigint  not null,              -- updatedAt del registro (milisegundos)
  device_id  text    not null,              -- deviceId de la última edición
  deleted    boolean not null default false,
  seq        bigint  not null default nextval('tbd_records_seq'),  -- orden del servidor: es el cursor
  primary key (user_id, col, id)
);

create index if not exists tbd_records_user_seq on tbd_records (user_id, seq);

-- Nombres de colección válidos: minúsculas, hasta 30 letras. Las versiones anteriores tenían una
-- lista fija; se reemplaza para que una colección nueva de la app no requiera migrar el servidor.
alter table tbd_records drop constraint if exists tbd_records_col_check;
alter table tbd_records add constraint tbd_records_col_check check (col ~ '^[a-z]{1,30}$');

-- POST /changes ---------------------------------------------------------------
-- Guarda los cambios de un usuario. Acepta el cuerpo que manda la app ({"changes": [...]})
-- o directamente el arreglo. Cada registro se guarda solo si le gana al que ya existe.
-- Devuelve cuántos registros se aceptaron.
create or replace function tbd_push(p_user uuid, p_changes jsonb)
returns integer
language plpgsql
as $$
declare
  accepted integer;
begin
  with incoming as (
    -- Si el lote trae el mismo registro dos veces, se queda con la versión más nueva.
    select distinct on (c->>'col', c->'rec'->>'id')
           c->>'col'                                    as col,
           c->'rec'->>'id'                              as id,
           c->'rec'                                     as rec,
           (c->'rec'->>'updatedAt')::bigint             as updated_at,
           coalesce(c->'rec'->>'deviceId', '')          as device_id,
           coalesce((c->'rec'->>'deleted')::boolean, false) as deleted
    from jsonb_array_elements(
           case when jsonb_typeof(p_changes) = 'object' then p_changes->'changes' else p_changes end
         ) as c
    where c->>'col' ~ '^[a-z]{1,30}$'
      and c->'rec'->>'id' is not null
      and c->'rec'->>'updatedAt' is not null
    order by c->>'col', c->'rec'->>'id',
             (c->'rec'->>'updatedAt')::bigint desc,
             coalesce(c->'rec'->>'deviceId', '') collate "C" desc
  ),
  saved as (
    insert into tbd_records as r (user_id, col, id, data, updated_at, device_id, deleted)
    select p_user, col, id, rec, updated_at, device_id, deleted
    from incoming
    on conflict (user_id, col, id) do update
      set data       = excluded.data,
          updated_at = excluded.updated_at,
          device_id  = excluded.device_id,
          deleted    = excluded.deleted,
          seq        = nextval('tbd_records_seq')
      -- collate "C": compara device_id igual que JavaScript (por código de carácter)
      where (excluded.updated_at, excluded.device_id collate "C") > (r.updated_at, r.device_id collate "C")
    returning 1
  )
  select count(*) into accepted from saved;
  return accepted;
end;
$$;

-- GET /changes?since=<cursor> --------------------------------------------------
-- Devuelve lo que cambió después del cursor (todo si es null o 0) con el formato que
-- espera la app: {"changes": [{"col": ..., "rec": {...}}], "cursor": <número>}.
create or replace function tbd_pull(p_user uuid, p_since bigint default 0)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
           'changes', coalesce(jsonb_agg(jsonb_build_object('col', col, 'rec', data) order by seq), '[]'::jsonb),
           'cursor',  coalesce(max(seq), coalesce(p_since, 0))
         )
  from tbd_records
  where user_id = p_user
    and seq > coalesce(p_since, 0);
$$;

commit;

-- Uso desde el servidor (el usuario sale de la clave de acceso, nunca del cuerpo de la petición):
--   select tbd_push($1::uuid, $2::jsonb);   -- POST /changes  → responde 204
--   select tbd_pull($1::uuid, $2::bigint);  -- GET  /changes  → responde el JSON tal cual
