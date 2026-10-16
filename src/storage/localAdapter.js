// Guardado en este dispositivo (localStorage). Siempre está activo, con o sin base de datos:
// es la copia que permite usar la app sin conexión.
import { safeStorage, uid } from "../core/utils.js";
import { KEYS, LEGACY } from "./keys.js";
import { migrateLegacy, ensureCategories } from "./migrations.js";

const SCHEMA = 4; // 4: con colección de categorías

export function createLocalAdapter(storage = safeStorage()){
  return {
    storage,
    deviceId(){
      let id = storage.get(KEYS.device) || storage.get(LEGACY.device);
      if (!id) id = "dev-" + uid();
      storage.set(KEYS.device, id);
      return id;
    },
    /** Registros guardados, o null si este navegador no tiene nada. */
    load(){
      const snap = storage.get(KEYS.data);
      if (snap?.schema === SCHEMA) return snap.records;
      if (snap?.schema === 3) return ensureCategories(snap.records);
      return migrateLegacy(storage);
    },
    save(records){ return storage.set(KEYS.data, {schema:SCHEMA, savedAt:Date.now(), records}); }
  };
}
