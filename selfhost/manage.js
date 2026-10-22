// Administración de personas y claves de acceso del servidor.
//   node manage.js add <nombre>      crea una persona y muestra su clave (una sola vez)
//   node manage.js list              lista las personas
//   node manage.js new-key <nombre>  genera una clave nueva (la anterior deja de funcionar)
//   node manage.js revoke <nombre>   bloquea el acceso (sus datos quedan guardados)
//   node manage.js delete <nombre>   borra la persona y todos sus datos
import crypto from "node:crypto";
import {
  closeDatabase, connectDatabase, createUser, deleteUser,
  hashToken, listUsers, revokeUser, updateUserToken
} from "./db.js";

const newToken = () => "tbd_" + crypto.randomBytes(24).toString("base64url");
const [cmd, ...rest] = process.argv.slice(2);
const name = rest.join(" ").trim();
const showKey = (who, token) => console.log(`\nClave de acceso de ${who}:\n\n  ${token}\n\nCópiala ahora: no se puede volver a ver. En la app: Tus datos → Sincronizar con tu servidor.\n`);

async function main() {
  await connectDatabase();
  try {
    if (["add", "new-key", "revoke", "delete"].includes(cmd) && !name) {
      console.error(`Falta el nombre. Ejemplo: node manage.js ${cmd} Ana`);
      process.exitCode = 1;
      return;
    }

    if (cmd === "add") {
      const token = newToken();
      if (!await createUser(name, hashToken(token))) {
        console.error(`Ya existe «${name}». Para darle una clave nueva: node manage.js new-key ${name}`);
        process.exitCode = 1;
      } else showKey(name, token);
    } else if (cmd === "new-key") {
      const token = newToken();
      if (!await updateUserToken(name, hashToken(token))) {
        console.error(`No existe «${name}».`);
        process.exitCode = 1;
      } else showKey(name, token);
    } else if (cmd === "revoke") {
      console.log(await revokeUser(name)
        ? `«${name}» ya no puede sincronizar. Sus datos siguen guardados.`
        : `No existe «${name}».`);
    } else if (cmd === "delete") {
      console.log(await deleteUser(name)
        ? `«${name}» y todos sus datos fueron borrados del servidor.`
        : `No existe «${name}».`);
    } else if (cmd === "list") {
      const users = await listUsers();
      if (!users.length) console.log("Todavía no hay personas. Crea una con: node manage.js add <nombre>");
      users.forEach(user => console.log(`${user.name.padEnd(20)} ${user.revoked ? "bloqueada" : "activa   "}  ${user.records} registros  desde ${user.createdAt.toISOString().slice(0,10)}`));
    } else {
      console.log("Comandos: add <nombre> | list | new-key <nombre> | revoke <nombre> | delete <nombre>");
      process.exitCode = cmd ? 1 : 0;
    }
  } finally {
    await closeDatabase();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
