// Indicador de guardado/sincronización de la barra superior.
import { $ } from "./dom.js";

const STATES = {
  local:   ["",       "Guardado en este dispositivo"],
  syncing: ["saving", "Sincronizando"],
  synced:  ["cloud",  "Sincronizado"],
  offline: ["error",  "Sin conexión. Se sincroniza al volver."],
  // Lo normal fuera de casa (servidor en la red local): los cambios se guardan y se suben al volver.
  error:   ["error",  "Sin conexión con tu servidor. Se sincroniza al volver."]
};

export function showSyncStatus(status){
  const [cls, text] = STATES[status] || STATES.local;
  const el = $("sync");
  el.className = "sync " + cls;
  el.textContent = text;
}
