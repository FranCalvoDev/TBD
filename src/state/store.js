// Almacén en memoria, organizado como una base de datos: colecciones de registros con id.
//
// Cada registro lleva `updatedAt` (ms) y `deviceId`. Borrar deja una lápida
// ({id, deleted:true}) para que el borrado también viaje entre dispositivos.
// Si dos dispositivos editan el mismo registro, gana la versión más nueva
// (last-write-wins, con deviceId como desempate).

export const COLLECTIONS = ["blocks", "goals", "tasks", "weeks"];

/** ¿`a` le gana a `b`? */
export const isNewer = (a, b) => !b || a.updatedAt > b.updatedAt ||
  (a.updatedAt === b.updatedAt && String(a.deviceId ?? "") > String(b.deviceId ?? ""));

/** Convierte {blocks:[...], goals:[...]} en una lista de cambios [{col, rec}]. */
export const toChanges = records => COLLECTIONS.flatMap(col => (records?.[col] || []).map(rec => ({col, rec})));

export function createStore({deviceId}){
  const data = Object.fromEntries(COLLECTIONS.map(c => [c, new Map()]));
  const listeners = new Set();
  let version = 0, last = 0;

  // Marca de tiempo siempre creciente, aunque el reloj del dispositivo vaya atrasado.
  const stamp = prev => (last = Math.max(Date.now(), last + 1, (prev?.updatedAt || 0) + 1));

  function emit(changes, origin){
    if (!changes.length) return;
    version++;
    const cols = new Set(changes.map(c => c.col));
    listeners.forEach(fn => fn({changes, cols, origin}));
  }
  function write(col, rec){
    const next = {...rec, updatedAt:stamp(data[col].get(rec.id)), deviceId};
    if (!next.deleted) delete next.deleted;
    data[col].set(next.id, next);
    return {col, rec:next};
  }

  const store = {
    deviceId,
    get version(){ return version; },
    get(col, id){ const r = data[col].get(id); return r && !r.deleted ? r : undefined; },
    list(col){ const out = []; for (const r of data[col].values()) if (!r.deleted) out.push(r); return out; },

    /** Cambios locales en lote: [{col, rec}] para guardar o [{col, id, remove:true}] para borrar. */
    commit(ops){
      const changes = [];
      for (const op of ops) {
        if (!op.remove) changes.push(write(op.col, op.rec));
        else if (store.get(op.col, op.id)) changes.push(write(op.col, {id:op.id, deleted:true}));
      }
      emit(changes, "local");
      return changes;
    },
    put: (col, rec) => store.commit([{col, rec}]),
    remove: (col, id) => store.commit([{col, id, remove:true}]),

    /** Aplica registros que vienen de afuera (disco, otra pestaña, servidor) sin reescribir sus marcas. */
    merge(changes, origin = "remote"){
      const applied = [];
      for (const {col, rec} of changes) {
        if (!data[col] || !rec?.id) continue;
        if (isNewer(rec, data[col].get(rec.id))) { data[col].set(rec.id, rec); applied.push({col, rec}); }
      }
      emit(applied, origin);
      return applied;
    },

    /** Todos los registros, lápidas incluidas. */
    snapshot(){ return Object.fromEntries(COLLECTIONS.map(c => [c, [...data[c].values()]])); },
    subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
  };
  return store;
}
