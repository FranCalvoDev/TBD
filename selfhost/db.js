// Conexión a PostgreSQL y aplicación del esquema (sql/schema.sql) al arrancar.
import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";

export const pool = new pg.Pool({connectionString:process.env.DATABASE_URL});

// En Docker el esquema se copia junto al servidor; en desarrollo se lee de ../sql.
const SCHEMA_PATHS = [new URL("./schema.sql", import.meta.url), new URL("../sql/schema.sql", import.meta.url)];

export const hashToken = token => crypto.createHash("sha256").update(token).digest("hex");

/** Aplica el esquema; reintenta mientras la base de datos termina de arrancar. */
export async function migrate({attempts = 30, log = console.log} = {}){
  const path = SCHEMA_PATHS.find(p => fs.existsSync(p));
  if (!path) throw new Error("No se encontró schema.sql");
  const sql = fs.readFileSync(path, "utf8");
  for (let i = 1; ; i++) {
    try { await pool.query(sql); return; }
    catch (e) {
      if (i >= attempts) throw e;
      log(`Esperando a la base de datos (${i}/${attempts}): ${e.code || e.message}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
