// Arranque de los datos: carga lo guardado en el dispositivo, mantiene la copia local
// al día y, si este dispositivo está conectado a un servidor TBD, sincroniza con él.
import { debounce } from "../core/utils.js";
import { createStore, toChanges } from "../state/store.js";
import { seedChanges } from "../state/seed.js";
import { createLocalAdapter } from "./localAdapter.js";
import { createSyncEngine } from "./syncEngine.js";
import { createHttpRemote } from "./remote.js";
import { KEYS } from "./keys.js";
import { loadServerConfig, saveServerConfig, clearServerConfig } from "./serverConfig.js";

/**
 * @param {object} [opts]
 * @param {import("./remote.js").Remote} [opts.remote] backend fijo (tests); si no, se usa el servidor configurado
 * @param {(status:string)=>void} [opts.onStatus]
 */
export function initData({remote, onStatus = () => {}} = {}){
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

  // Sincronización con el servidor del grupo: se conecta y desconecta en caliente.
  let engine = null;
  const run = backend => {
    engine?.stop();
    engine = createSyncEngine({store, remote:backend, storage:local.storage, onStatus});
    engine.start();
  };
  const sync = {
    get enabled(){ return !!engine; },
    config: () => loadServerConfig(local.storage),
    /** Conecta con un servidor nuevo: empieza de cero para traer todo y subir lo de este dispositivo. */
    connect(config){
      local.storage.remove(KEYS.cursor); local.storage.remove(KEYS.outbox);
      saveServerConfig(local.storage, config);
      run(createHttpRemote({baseUrl:config.url, getToken:async () => config.token}));
    },
    /** Deja de sincronizar. Los datos quedan en el dispositivo (y en el servidor). */
    disconnect(){
      engine?.stop(); engine = null;
      clearServerConfig(local.storage);
      local.storage.remove(KEYS.cursor); local.storage.remove(KEYS.outbox);
      onStatus("local");
    },
    now: () => engine?.sync()
  };
  const server = remote ? null : loadServerConfig(local.storage);
  if (remote) run(remote);
  else if (server) run(createHttpRemote({baseUrl:server.url, getToken:async () => server.token}));
  else onStatus("local");

  return {store, sync};
}
