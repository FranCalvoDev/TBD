// Reglas de la semana: horas planificadas, bloques liberados y huecos libres.
import { START, END, toMin, span } from "../core/time.js";

export function computePlanned(blocks){
  const p = {count:0, byDay:[0,0,0,0,0,0,0], catMin:{}};
  blocks.forEach(x => { p.count++; p.byDay[x.day]++; p.catMin[x.cat] = (p.catMin[x.cat] || 0) + span(x); });
  return p;
}

/** Registro que se guarda al marcar un bloque como hecho o darlo de baja. */
export const doneEntry = (x, at) => ({cat:x.cat, min:span(x), day:x.day, title:x.title, at});

export const offCount = w => Object.keys(w.off || {}).length;
export const offOnDay = (w, d) => Object.values(w.off || {}).filter(o => o.day === d).length;

/** Un bloque hecho o dado de baja libera su horario para otra tarea. */
export const isFreed = (sel, week, block) => { const w = sel.week(week); return !!(w.done?.[block.id] || w.off?.[block.id]); };

/** Parte del horario de un bloque que no ocupan tareas ya agendadas al principio. */
export function freeWindow(sel, week, block){
  let start = toMin(block.s);
  sel.tasksAt(week, block.day)
    .filter(t => toMin(t.slot.s) < toMin(block.e) && toMin(t.slot.e) > toMin(block.s))
    .sort((a, b) => toMin(a.slot.s) - toMin(b.slot.s))
    .forEach(t => { if (toMin(t.slot.s) <= start) start = Math.max(start, toMin(t.slot.e)); });
  return [start, toMin(block.e)];
}

/** Intervalos [inicio, fin] sin bloques activos ni tareas, desde `fromMin` hasta las 00:30. */
export function freeGaps(sel, week, day, fromMin, ignoreId){
  const busy = [
    ...sel.blocksOf(day).filter(x => !isFreed(sel, week, x)).map(x => [toMin(x.s), toMin(x.e)]),
    ...sel.tasksAt(week, day).filter(t => t.id !== ignoreId).map(t => [toMin(t.slot.s), toMin(t.slot.e)])
  ].sort((a, b) => a[0] - b[0]);
  const gaps = []; let cur = Math.max(START, fromMin);
  busy.forEach(([s, e]) => { if (s > cur) gaps.push([cur, s]); cur = Math.max(cur, e); });
  if (END > cur) gaps.push([cur, END]);
  return gaps;
}
