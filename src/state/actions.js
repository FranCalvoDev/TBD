// Todas las escrituras de la app pasan por acá. La UI nunca toca el store directamente.
import { END, toMin, minToStr, mondayLabel, nowInfo } from "../core/time.js";
import { clone, uid } from "../core/utils.js";
import { now } from "../core/clock.js";
import { doneEntry, freeWindow } from "../domain/schedule.js";

export function createActions(store, sel){
  const iso = () => now().toISOString();
  const newWeek = key => ({id:key, label:mondayLabel(nowInfo()), done:{}, off:{}, goals:{}});
  const weekRecord = (key = sel.curKey()) => sel.hasWeek(key) ? clone(sel.week(key)) : newWeek(key);
  const weekOp = w => ({col:"weeks", rec:{...w, planned:sel.planned()}});
  // Cuando cambian los bloques, la semana en curso guarda cuánto había planificado.
  const refreshPlanned = () => { const k = sel.curKey(); if (sel.hasWeek(k)) store.put("weeks", {...sel.week(k), planned:sel.planned()}); };

  return {
    toggleDone(blockId){
      const x = sel.block(blockId); if (!x) return;
      const w = weekRecord();
      if (w.done[blockId]) delete w.done[blockId];
      else { w.done[blockId] = doneEntry(x, iso()); delete w.off[blockId]; }
      store.commit([weekOp(w)]);
    },
    toggleOff(blockId){
      const x = sel.block(blockId); if (!x) return;
      const w = weekRecord();
      if (w.off[blockId]) delete w.off[blockId];
      else { w.off[blockId] = doneEntry(x, iso()); delete w.done[blockId]; }
      store.commit([weekOp(w)]);
    },
    resetWeek(){ store.commit([weekOp(newWeek(sel.curKey()))]); },

    saveBlock(data, id){
      const rec = id ? {...sel.block(id), ...data} : {id:"u"+uid(), ...data};
      store.put("blocks", rec); refreshPlanned();
      return rec.id;
    },
    deleteBlock(id){ store.remove("blocks", id); refreshPlanned(); },
    bumpGoal(goalId, delta){
      const w = weekRecord();
      w.goals[goalId] = Math.max(0, (w.goals[goalId] || 0) + delta);
      store.commit([weekOp(w)]);
    },
    updateGoal(id, patch){ const g = store.get("goals", id); if (g) store.put("goals", {...g, ...patch}); },
    addGoal(){
      const order = Math.max(-1, ...sel.goals().map(g => g.order ?? 0)) + 1;
      const id = "g"+uid();
      store.put("goals", {id, label:"Nueva meta", cat:sel.firstCategory(), target:3, order});
      return id;
    },
    deleteGoal(id){ store.remove("goals", id); },

    addCategory(){
      const cats = sel.categories(), used = new Set(cats.map(c => c.color));
      const color = ["c1","c2","c3","c4","c5","c6","c7","c8"].find(c => !used.has(c)) || "c8";
      const order = Math.max(-1, ...cats.map(c => c.order ?? 0)) + 1;
      const id = "cat"+uid();
      store.put("categories", {id, name:"Nueva categoría", color, order});
      return id;
    },
    updateCategory(id, patch){ const c = sel.category(id); if (c) store.put("categories", {...c, ...patch}); },
    /** Borra la categoría; lo que la usaba queda «Sin categoría» (se ve en gris). */
    deleteCategory(id){ store.remove("categories", id); },
    /** Cuántos bloques, tareas y metas usan una categoría. */
    categoryUsage(id){
      return [0,1,2,3,4,5,6].reduce((a, d) => a + sel.blocksOf(d).filter(x => x.cat === id).length, 0) +
        sel.tasks().filter(t => t.cat === id).length + sel.goals().filter(g => g.cat === id).length;
    },

    saveTask(data, id){
      if (id) {
        const t = clone(sel.task(id)); if (!t) return null;
        const estChanged = t.est !== data.est;
        Object.assign(t, data);
        if (estChanged && t.slot) t.slot.e = minToStr(Math.min(END, toMin(t.slot.s) + t.est));
        store.put("tasks", t);
        return id;
      }
      const t = {id:"t"+uid(), createdAt:iso(), done:false, ...data};
      store.put("tasks", t);
      return t.id;
    },
    deleteTask(id){ store.remove("tasks", id); },
    toggleTask(id){
      const t = clone(sel.task(id)); if (!t) return;
      const ops = [];
      if (t.done) { t.done = false; delete t.doneAt; delete t.doneWeek; }
      else {
        t.done = true; t.doneAt = iso(); t.doneWeek = sel.curKey();
        if (!sel.hasWeek(t.doneWeek)) ops.push(weekOp(newWeek(t.doneWeek)));
      }
      store.commit([{col:"tasks", rec:t}, ...ops]);
    },
    scheduleTask(id, slot){ const t = sel.task(id); if (t) store.put("tasks", {...t, slot}); },
    unscheduleTask(id){ const t = clone(sel.task(id)); if (t) { delete t.slot; store.put("tasks", t); } },
    /** Ubica una tarea en el horario que dejó libre un bloque hecho o dado de baja. */
    fillFreed(taskId, blockId){
      const t = sel.task(taskId), x = sel.block(blockId); if (!t || !x) return;
      const key = sel.curKey(), [s] = freeWindow(sel, key, x);
      store.put("tasks", {...t, slot:{week:key, day:x.day, s:minToStr(s), e:minToStr(s + t.est)}});
    }
  };
}
