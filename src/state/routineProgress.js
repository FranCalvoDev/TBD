// Ejercicios tachados de cada rutina durante el día. Solo en este dispositivo: al día siguiente arranca de cero.
import { safeStorage } from "../core/utils.js";
import { KEYS } from "../storage/keys.js";

const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

export function createRoutineProgress(storage = safeStorage(), today = localDate){
  const load = () => {
    const v = storage.get(KEYS.routineDone);
    return v && v.date === today() && v.done && typeof v.done === "object" ? v : {date:today(), done:{}};
  };
  const save = v => storage.set(KEYS.routineDone, v);

  return {
    /** Índices de filas hechas hoy en la rutina. */
    done(routineId){ return new Set(load().done[routineId] || []); },
    toggle(routineId, index){
      const v = load(), set = new Set(v.done[routineId] || []);
      set.has(index) ? set.delete(index) : set.add(index);
      v.done[routineId] = [...set].sort((a, b) => a - b);
      save(v);
      return set.has(index);
    },
    reset(routineId){ const v = load(); delete v.done[routineId]; save(v); }
  };
}
