// Cálculo de las estadísticas. Devuelve datos; la UI decide cómo dibujarlos.
import { CATS } from "../data/categories.js";
import { nowInfo, weekKey } from "../core/time.js";
import { offCount, offOnDay } from "./schedule.js";

export const weekPct = w => {
  const tot = (w.planned?.count || 0) - offCount(w);
  return tot > 0 ? Math.round(Object.keys(w.done || {}).length / tot * 100) : 0;
};

export function computeStats(sel, info = nowInfo()){
  const key = weekKey(info.d);
  const list = sel.weeks();
  const doneTasks = sel.tasks().filter(t => t.done);
  const hasData = doneTasks.length > 0 || list.some(w => Object.keys(w.done || {}).length || Object.values(w.goals || {}).some(v => v > 0));
  if (!hasData) return {hasData:false};

  const goalTotal = id => list.reduce((a, w) => a + (w.goals?.[id] || 0), 0);
  const cw = sel.curWeek();
  const goals = sel.goals();
  const kpis = [
    {v:weekPct(cw)+"%", l:"Cumplimiento esta semana", cat:"proyectos"},
    {v:list.reduce((a, w) => a + Object.keys(w.done || {}).length, 0), l:"Bloques completados en total", cat:"trabajo"},
    {v:doneTasks.length, taskMin:doneTasks.reduce((a, t) => a + t.est, 0), l:"Tareas completadas", cat:"contenido"},
    ...goals.slice(0, 4).map(g => ({v:goalTotal(g.id), l:g.label+" en total", cat:g.cat})),
    {v:list.length, l:list.length === 1 ? "Semana registrada" : "Semanas registradas", cat:"personal"}
  ];

  const last = list.slice(-8);
  const labels = last.map(w => w.id === key ? "Esta" : (w.label || w.id.split("-")[1]));

  const doneMin = {};
  Object.values(cw.done || {}).forEach(d => doneMin[d.cat] = (doneMin[d.cat] || 0) + d.min);
  const planned = {...(cw.planned?.catMin || sel.planned().catMin)};
  Object.values(cw.off || {}).forEach(o => planned[o.cat] = Math.max(0, (planned[o.cat] || 0) - o.min));
  const hours = Object.keys(CATS).filter(k => planned[k] || doneMin[k]).map(k => ({cat:k, done:doneMin[k] || 0, planned:planned[k] || 0}));

  const dayPct = [0,1,2,3,4,5,6].map(d => {
    const vals = list.filter(w => w.planned?.byDay?.[d] - offOnDay(w, d) > 0 && !(w.id === key && d > info.day))
      .map(w => Object.values(w.done || {}).filter(x => x.day === d).length / (w.planned.byDay[d] - offOnDay(w, d)) * 100);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  });

  return {
    hasData:true, kpis, labels, hours, dayPct,
    weekly: last.map(weekPct),
    goalSeries: goals.slice(0, 3).map(g => ({goal:g, values:last.map(w => w.goals?.[g.id] || 0)})),
    tasksPerWeek: last.map(w => doneTasks.filter(t => t.doneWeek === w.id).length)
  };
}
