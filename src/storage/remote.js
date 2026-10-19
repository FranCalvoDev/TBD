// Contrato con la base de datos remota. Cualquier backend que lo cumpla sirve
// (el servidor de selfhost/ u otro propio). Ver docs/BASE_DE_DATOS.md.
//
// interface Remote {
//   pull(cursor: string|number|null): Promise<{changes: Change[], cursor: string|number}>
//     Devuelve los registros que cambiaron en el servidor después de `cursor`
//     (todos si es null) y el nuevo cursor.
//   push(changes: Change[]): Promise<void>
//     Envía registros. El servidor guarda cada uno solo si es más nuevo que el que tiene
//     (mismo criterio que isNewer en src/state/store.js).
//   subscribe?(onChange: () => void): () => void
//     Opcional: avisa en tiempo real que hay cambios para traer.
// }
// type Change = { col: "blocks"|"goals"|"tasks"|"weeks", rec: { id, updatedAt, deviceId, deleted?, ... } }

/**
 * Prueba la dirección y la clave contra GET /me. Devuelve {name} o lanza un Error con
 * un mensaje para mostrar.
 */
export async function checkServer({baseUrl, token, fetchImpl = (...a) => fetch(...a), timeoutMs = 10000}){
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(baseUrl.replace(/\/$/, "") + "/me", {headers:{Authorization:`Bearer ${token}`}, signal:ctrl?.signal});
  } catch {
    throw new Error("No se pudo conectar con el servidor. Revisa la dirección y que estés en la misma red (o conectado a la VPN).");
  } finally { clearTimeout(timer); }
  if (res.status === 401) throw new Error("La clave de acceso no es válida o fue bloqueada.");
  if (!res.ok) throw new Error(`El servidor respondió con un error (${res.status}). ¿Es un servidor TBD?`);
  try { const me = await res.json(); if (me?.name) return me; } catch {}
  throw new Error("La dirección responde, pero no parece un servidor TBD.");
}

/** Remoto HTTP genérico: GET /changes?since=<cursor> y POST /changes {changes}. */
export function createHttpRemote({baseUrl, getToken = async () => null, fetchImpl = (...a) => fetch(...a)}){
  const root = baseUrl.replace(/\/$/, "");
  async function request(path, init = {}){
    const token = await getToken();
    const res = await fetchImpl(root + path, {...init, headers:{"Content-Type":"application/json", ...(token ? {Authorization:`Bearer ${token}`} : {})}});
    if (!res.ok) { const err = new Error(`HTTP ${res.status}`); err.status = res.status; throw err; }
    return res.status === 204 ? null : res.json();
  }
  return {
    pull: cursor => request("/changes" + (cursor == null ? "" : "?since=" + encodeURIComponent(cursor))),
    push: changes => request("/changes", {method:"POST", body:JSON.stringify({changes})})
  };
}
