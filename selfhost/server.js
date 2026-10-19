// Servidor de sincronización de TBD · MiSemana.
// Implementa el contrato de docs/BASE_DE_DATOS.md:
//   GET  /changes?since=<cursor>  → {"changes": [...], "cursor": n}
//   POST /changes  {"changes": [...]} → 204
//   GET  /me      → {"name": "..."}   (para probar la conexión desde la app)
//   GET  /health  → {"ok": true}      (sin clave, para monitoreo)
// Cada petición lleva «Authorization: Bearer <clave de acceso>»; las claves se crean con manage.js.
import http from "node:http";
import { pool, migrate, hashToken } from "./db.js";

const PORT = Number(process.env.PORT) || 8787;
const MAX_BODY = 5 * 1024 * 1024; // 5 MB por lote

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};
const send = (res, status, body) => {
  res.writeHead(status, {...CORS, ...(body === undefined ? {} : {"Content-Type":"application/json"})});
  res.end(body === undefined ? undefined : JSON.stringify(body));
};

// Clave → usuario, con un caché corto para no consultar la base en cada petición.
const cache = new Map();
async function authenticate(req){
  const token = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;
  const hash = hashToken(token), hit = cache.get(hash);
  if (hit && hit.until > Date.now()) return hit.user;
  const {rows} = await pool.query("select id, name from tbd_users where token_hash = $1 and not revoked", [hash]);
  const user = rows[0] || null;
  cache.set(hash, {user, until:Date.now() + 30000});
  return user;
}

async function readBody(req){
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > MAX_BODY) throw Object.assign(new Error("too large"), {status:413}); chunks.push(c); }
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (req.method === "OPTIONS") return send(res, 204);
    if (path === "/health") return send(res, 200, {ok:true});

    const user = await authenticate(req);
    if (!user) return send(res, 401, {error:"Clave de acceso inválida"});

    if (path === "/me" && req.method === "GET") return send(res, 200, {name:user.name});

    if (path === "/changes" && req.method === "GET") {
      const since = url.searchParams.get("since");
      if (since !== null && !/^\d+$/.test(since)) return send(res, 400, {error:"Cursor inválido"});
      const {rows} = await pool.query("select tbd_pull($1::uuid, $2::bigint) as r", [user.id, since]);
      return send(res, 200, rows[0].r);
    }
    if (path === "/changes" && req.method === "POST") {
      let body;
      try { body = JSON.parse(await readBody(req)); } catch (e) { return send(res, e.status || 400, {error:e.status ? "Lote demasiado grande" : "JSON inválido"}); }
      await pool.query("select tbd_push($1::uuid, $2::jsonb)", [user.id, JSON.stringify(body)]);
      return send(res, 204);
    }
    send(res, 404, {error:"No encontrado"});
  } catch (e) {
    console.error(e);
    send(res, 500, {error:"Error del servidor"});
  }
});

await migrate();
server.listen(PORT, () => console.log(`TBD · servidor de sincronización escuchando en el puerto ${PORT}`));
const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on("SIGTERM", stop); process.on("SIGINT", stop);
