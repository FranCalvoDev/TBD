// Arranque de los datos: carga lo guardado en el dispositivo, mantiene la copia local
// al día y, si hay una base de datos configurada, sincroniza con ella.
import { debounce } from "../core/utils.js";
import { createStore, toChanges } from "../state/store.js";
import { seedChanges } from "../state/seed.js";
import { createLocalAdapter } from "./localAdapter.js";
import { createSyncEngine } from "./syncEngine.js";
import { createHttpRemote } from "./remote.js";
import { KEYS } from "./keys.js";

/**
 * @param {object} [opts]
 * @param {import("./remote.js").Remote} [opts.remote] backend ya creado (tiene prioridad sobre syncUrl)
 * @param {string} [opts.syncUrl] URL de la API HTTP (por defecto VITE_SYNC_URL)
 * @param {(status:string)=>void} [opts.onStatus]
 */
export function initData({remote, syncUrl = import.meta.env?.VITE_SYNC_URL, onStatus = () => {}} = {}){
  const local = createLocalAdapter();
  const store = createStore({deviceId:local.deviceId()});

  const saved = local.load();
  store.merge(saved ? toChanges(saved) : seedChanges(), "load");
  if (!saved) local.save(store.snapshot());

  // Copia local: se escribe agrupando cambios y siempre antes de cerrar la página.
  const persist = debounce(() => local.save(store.snapshot()), 250);
  store.subscribe(e => { if (e.origin !== "load") persist(); });
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => persist.flush());
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") persist.flush(); });
    // Otra pestaña guardó: traer sus cambios.
    window.addEventListener("storage", e => {
      if (e.key !== KEYS.data || !e.newValue) return;
      try { store.merge(toChanges(JSON.parse(e.newValue).records), "tab"); } catch {}
    });
  }

  const backend = remote || (syncUrl ? createHttpRemote({baseUrl:syncUrl}) : null);
  let sync = null;
  if (backend) {
    sync = createSyncEngine({store, remote:backend, storage:local.storage, onStatus});
    sync.start();
  } else onStatus("local");

  return {store, sync};
}
