// Administración de personas y claves de acceso del servidor.
//   node manage.js add <nombre>      crea una persona y muestra su clave (una sola vez)
//   node manage.js list              lista las personas
//   node manage.js new-key <nombre>  genera una clave nueva (la anterior deja de funcionar)
//   node manage.js revoke <nombre>   bloquea el acceso (sus datos quedan guardados)
//   node manage.js delete <nombre>   borra la persona y todos sus datos
// Con Docker:  docker compose exec servidor node manage.js add Ana
import crypto from "node:crypto";
import { pool, migrate, hashToken } from "./db.js";

const newToken = () => "tbd_" + crypto.randomBytes(24).toString("base64url");
const [cmd, ...rest] = process.argv.slice(2);
const name = rest.join(" ").trim();
const need = () => { if (!name) { console.error("Falta el nombre. Ejemplo: node manage.js " + cmd + " Ana"); process.exit(1); } };
const showKey = (who, token) => console.log(`\nClave de acceso de ${who}:\n\n  ${token}\n\nCópiala ahora: no se puede volver a ver. En la app: Tus datos → Sincronizar con tu servidor.\n`);

await migrate({log:() => {}});
try {
  if (cmd === "add") {
    need();
    const token = newToken();
    const {rowCount} = await pool.query("insert into tbd_users (name, token_hash) values ($1, $2) on conflict (name) do nothing", [name, hashToken(token)]);
    if (!rowCount) { console.error(`Ya existe «${name}». Para darle una clave nueva: node manage.js new-key ${name}`); process.exitCode = 1; }
    else showKey(name, token);
  } else if (cmd === "new-key") {
    need();
    const token = newToken();
    const {rowCount} = await pool.query("update tbd_users set token_hash = $2, revoked = false where name = $1", [name, hashToken(token)]);
    if (!rowCount) { console.error(`No existe «${name}».`); process.exitCode = 1; } else showKey(name, token);
  } else if (cmd === "revoke") {
    need();
    const {rowCount} = await pool.query("update tbd_users set revoked = true where name = $1", [name]);
    console.log(rowCount ? `«${name}» ya no puede sincronizar. Sus datos siguen guardados.` : `No existe «${name}».`);
  } else if (cmd === "delete") {
    need();
    const {rows} = await pool.query("select id from tbd_users where name = $1", [name]);
    if (!rows[0]) console.log(`No existe «${name}».`);
    else {
      await pool.query("delete from tbd_records where user_id = $1", [rows[0].id]);
      await pool.query("delete from tbd_users where id = $1", [rows[0].id]);
      console.log(`«${name}» y todos sus datos fueron borrados del servidor.`);
    }
  } else if (cmd === "list") {
    const {rows} = await pool.query(`select u.name, u.revoked, u.created_at, count(r.id)::int as registros
      from tbd_users u left join tbd_records r on r.user_id = u.id and not r.deleted group by u.id order by u.name`);
    if (!rows.length) console.log("Todavía no hay personas. Crea una con: node manage.js add <nombre>");
    rows.forEach(r => console.log(`${r.name.padEnd(20)} ${r.revoked ? "bloqueada" : "activa   "}  ${r.registros} registros  desde ${r.created_at.toISOString().slice(0,10)}`));
  } else {
    console.log("Comandos: add <nombre> | list | new-key <nombre> | revoke <nombre> | delete <nombre>");
    process.exitCode = cmd ? 1 : 0;
  }
} finally { await pool.end(); }
