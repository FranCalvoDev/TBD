// Guardado en este dispositivo (localStorage). Siempre está activo, con o sin base de datos:
// es la copia que permite usar la app sin conexión.
import { safeStorage, uid } from "../core/utils.js";
import { KEYS } from "./keys.js";
import { migrateLegacy } from "./migrations.js";

export function createLocalAdapter(storage = safeStorage()){
  return {
    storage,
    deviceId(){
      let id = storage.get(KEYS.device);
      if (!id) { id = "dev-" + uid(); storage.set(KEYS.device, id); }
      return id;
    },
    /** Registros guardados, o null si este navegador no tiene nada. */
    load(){
      const snap = storage.get(KEYS.data);
      if (snap?.schema === 3) return snap.records;
      return migrateLegacy(storage);
    },
    save(records){ return storage.set(KEYS.data, {schema:3, savedAt:Date.now(), records}); }
  };
}
