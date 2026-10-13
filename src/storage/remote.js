// Contrato con la base de datos remota. Cualquier backend que lo cumpla sirve
// (API propia sobre Postgres, Supabase, Firebase, etc.). Ver docs/BASE_DE_DATOS.md.
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
