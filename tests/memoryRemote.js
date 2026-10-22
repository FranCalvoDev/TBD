// Servidor en memoria para los tests de sincronización.
import { isNewer } from "../src/state/store.js";

export function createMemoryRemote(){
  const rows = new Map(); // "col:id" -> {col, rec, seq}
  let seq = 0;
  return {
    rows,
    async pull(cursor){
      const since = cursor ?? 0;
      const changes = [...rows.values()].filter(r => r.seq > since).sort((a, b) => a.seq - b.seq).map(({col, rec}) => ({col, rec}));
      return {changes, cursor:seq};
    },
    async push(changes){
      for (const {col, rec} of changes) {
        const k = col + ":" + rec.id, cur = rows.get(k);
        if (!cur || isNewer(rec, cur.rec)) rows.set(k, {col, rec, seq:++seq});
      }
    }
  };
}
