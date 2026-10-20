// Copias de seguridad: un archivo JSON con todos los datos y preferencias de este dispositivo.
// El archivo queda donde la persona lo guarde; la app no lo sube a ningún lado.
import { COLLECTIONS } from "../state/store.js";

export const BACKUP_KIND = "tbd-backup";
/** Paquete: registros para sumar (una rutina, notas…) sin reemplazar lo que ya hay. */
export const PACKAGE_KIND = "tbd-paquete";
const VERSION = 1;

/** Arma la copia con los registros vivos (sin lápidas) y las preferencias. */
export function buildBackup(store, prefs = {}, now = new Date()){
  const snap = store.snapshot();
  const records = Object.fromEntries(COLLECTIONS.map(c => [c, snap[c].filter(r => !r.deleted)]));
  return {app:"TBD", kind:BACKUP_KIND, version:VERSION, exportedAt:now.toISOString(), prefs, records};
}

export const backupFileName = (now = new Date()) =>
  `tbd-copia-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}.json`;

/** Lee y valida un archivo de copia. Lanza un Error con un mensaje para mostrar si no sirve. */
export function parseBackup(text){
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("El archivo no es una copia de TBD (no es JSON válido)."); }
  if (![BACKUP_KIND, PACKAGE_KIND].includes(data?.kind) || typeof data.records !== "object") throw new Error("El archivo no es una copia de TBD.");
  if (data.version > VERSION) throw new Error("La copia es de una versión más nueva de la app. Actualiza la app e intenta de nuevo.");
  const records = {};
  for (const col of COLLECTIONS) {
    const list = data.records[col] ?? [];
    if (!Array.isArray(list) || list.some(r => !r || typeof r.id !== "string")) throw new Error("La copia está dañada.");
    records[col] = list;
  }
  return {kind:data.kind, title:data.title || "", records, prefs:data.prefs || {}, exportedAt:data.exportedAt};
}

export const countRecords = records => ({
  blocks: records.blocks.length, tasks: records.tasks.length, goals: records.goals.length, categories: records.categories.length,
  notes: records.notes.length, routines: records.routines.length, workouts: records.workouts.length
});

/** Suma los registros de un paquete (los que tienen el mismo id se actualizan). No borra nada. */
export function applyPackage(store, records){
  const ops = [];
  for (const col of COLLECTIONS) records[col].forEach(({updatedAt, deviceId, deleted, ...rec}) => ops.push({col, rec}));
  return store.commit(ops);
}

/**
 * Restaura una copia: los datos de este dispositivo pasan a ser exactamente los de la copia.
 * Se escriben como cambios nuevos, así que si hay sincronización también reemplazan lo de la nube.
 */
export function restoreBackup(store, records){
  const ops = [];
  for (const col of COLLECTIONS) {
    const keep = new Set(records[col].map(r => r.id));
    store.list(col).filter(r => !keep.has(r.id)).forEach(r => ops.push({col, id:r.id, remove:true}));
    records[col].forEach(({updatedAt, deviceId, deleted, ...rec}) => ops.push({col, rec}));
  }
  return store.commit(ops);
}
