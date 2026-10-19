// Sincronización con la base de datos remota.
//
// - Cada cambio local entra a una cola de salida (outbox) guardada en el dispositivo,
//   así nada se pierde si no hay conexión o se cierra la pestaña.
// - sync() trae lo nuevo del servidor (pull) y después sube la cola (push).
// - Los conflictos se resuelven por registro: gana el más nuevo (isNewer).
// - Si falla, reintenta con espera creciente (2 s, 4 s, ... hasta 60 s).
import { toChanges } from "../state/store.js";
import { KEYS } from "./keys.js";

const keyOf = c => c.col + ":" + c.rec.id;

export function createSyncEngine({store, remote, storage, onStatus: report = () => {}, pushDelayMs = 800, pullEveryMs = 30000}){
  let cursor = storage.get(KEYS.cursor), stopped = false;
  // Un motor detenido no avisa nada (una sincronización en curso puede terminar después de desconectar).
  const onStatus = (...a) => { if (!stopped) report(...a); };
  let running = null, again = false, retries = 0, timer = null, poll = null, unsubRemote = null;

  // La cola se lee y escribe siempre desde el almacenamiento: varias pestañas la comparten.
  const readOutbox = () => new Map((storage.get(KEYS.outbox) || []).map(c => [keyOf(c), c]));
  function enqueue(changes){
    const box = readOutbox();
    changes.forEach(c => box.set(keyOf(c), c));
    storage.set(KEYS.outbox, [...box.values()]);
  }
  function acknowledge(sent){
    const box = readOutbox();
    sent.forEach(c => { const cur = box.get(keyOf(c)); if (cur && cur.rec.updatedAt === c.rec.updatedAt) box.delete(keyOf(c)); });
    storage.set(KEYS.outbox, [...box.values()]);
  }
  const schedule = ms => { if (stopped) return; clearTimeout(timer); timer = setTimeout(() => { timer = null; sync(); }, ms); };

  const unsubStore = store.subscribe(e => {
    if (e.origin !== "local") return;
    enqueue(e.changes);
    schedule(pushDelayMs);
  });

  async function run(){
    onStatus("syncing");
    const firstTime = cursor == null;
    const res = await remote.pull(cursor);
    store.merge(res.changes || [], "remote");
    // Primera vez de este dispositivo: sube todo lo local. El servidor se queda con lo más nuevo.
    if (firstTime) enqueue(toChanges(store.snapshot()));
    cursor = res.cursor;
    storage.set(KEYS.cursor, cursor);
    const batch = [...readOutbox().values()];
    if (batch.length) { await remote.push(batch); acknowledge(batch); }
    retries = 0;
    onStatus("synced");
  }

  async function sync(){
    if (stopped) return;
    if (running) { again = true; return running; }
    running = run().catch(err => {
      retries++;
      onStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error", err);
      schedule(Math.min(60000, 2000 * 2 ** (retries - 1)));
    });
    try { await running; } finally {
      running = null;
      if (again) { again = false; schedule(0); }
    }
  }

  const onWake = () => { if (typeof document === "undefined" || document.visibilityState !== "hidden") sync(); };

  return {
    sync,
    pending: () => readOutbox().size,
    start(){
      sync();
      poll = setInterval(sync, pullEveryMs);
      if (typeof window !== "undefined") {
        window.addEventListener("online", onWake);
        window.addEventListener("focus", onWake);
        document.addEventListener("visibilitychange", onWake);
      }
      unsubRemote = remote.subscribe?.(() => schedule(0)) || null;
    },
    stop(){
      stopped = true;
      clearTimeout(timer); clearInterval(poll); unsubStore(); unsubRemote?.();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onWake);
        window.removeEventListener("focus", onWake);
        document.removeEventListener("visibilitychange", onWake);
      }
    }
  };
}
