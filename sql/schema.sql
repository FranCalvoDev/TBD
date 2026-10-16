-- TBD · MiSemana — base de datos para sincronizar entre dispositivos (PostgreSQL 13 o superior).
-- Se ejecuta tal cual, por ejemplo:  psql "$DATABASE_URL" -f sql/schema.sql
-- Se puede volver a ejecutar sin perder datos: todo usa IF NOT EXISTS / CREATE OR REPLACE.
--
-- Una fila por registro de la app. La regla de conflictos es la misma que en la app
-- (isNewer en src/state/store.js): gana updated_at mayor y, si empatan, device_id mayor.

begin;

create sequence if not exists tbd_records_seq;

create table if not exists tbd_records (
  user_id    uuid    not null,
  col        text    not null check (col in ('categories', 'blocks', 'goals', 'tasks', 'weeks')),
  id         text    not null,
  data       jsonb   not null,              -- el registro completo, tal como lo manda la app
  updated_at bigint  not null,              -- updatedAt del registro (milisegundos)
  device_id  text    not null,              -- deviceId de la última edición
  deleted    boolean not null default false,
  seq        bigint  not null default nextval('tbd_records_seq'),  -- orden del servidor: es el cursor
  primary key (user_id, col, id)
);

create index if not exists tbd_records_user_seq on tbd_records (user_id, seq);

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
    where c->>'col' in ('categories', 'blocks', 'goals', 'tasks', 'weeks')
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

-- Uso desde tu API (el usuario sale del token de sesión, nunca del cuerpo de la petición):
--   select tbd_push($1::uuid, $2::jsonb);   -- POST /changes  → responde 204
--   select tbd_pull($1::uuid, $2::bigint);  -- GET  /changes  → responde el JSON tal cual
--
-- Si usas Supabase, agrega además seguridad por fila para que cada uno vea solo lo suyo:
--   alter table tbd_records enable row level security;
--   create policy "solo lo propio" on tbd_records
--     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Las funciones corren con los permisos de quien las llama, así que con esta política activa
-- nadie puede leer ni escribir datos de otro usuario aunque mande otro p_user.
