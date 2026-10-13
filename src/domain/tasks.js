// Tareas únicas: en qué hueco de la semana entran y cómo se describen.
import { DAYS } from "../data/categories.js";
import { DAY_MS, toMin, fmt, isoLocal, weekKey, nextWeekKey, mondayDate, nowInfo } from "../core/time.js";
import { freeGaps, isFreed } from "./schedule.js";

/** Los días desde hoy hasta el domingo de la semana que viene. */
export function planDays(info = nowInfo()){
  const {day, min} = info, mon = mondayDate(info), key = weekKey(info.d), nk = nextWeekKey(info), out = [];
  for (let w = 0; w < 2; w++) for (let d = 0; d < 7; d++) {
    const off = w*7 + d - day; if (off < 0) continue;
    out.push({week: w ? nk : key, day:d, from: off === 0 ? min : 0, date: isoLocal(new Date(mon.getTime() + (w*7+d)*DAY_MS)),
      rel: off === 0 ? "Hoy" : off === 1 ? "Mañana" : DAYS[d] + (w ? " de la semana que viene" : "")});
  }
  return out;
}

/** Hasta 3 huecos libres y hasta 2 lugares dentro de bloques de la misma categoría. */
export function suggestSlots(sel, t, info = nowInfo()){
  const plan = planDays(info).filter(p => !t.due || p.date <= t.due);
  const free = [], inBlock = [];
  for (const p of plan) {
    if (free.length >= 3) break;
    for (const [a, b] of freeGaps(sel, p.week, p.day, p.from, t.id)) {
      const s = Math.ceil(a/5)*5;
      if (b - s >= t.est) {
        const rel = sel.blocksOf(p.day).find(x => isFreed(sel, p.week, x) && toMin(x.s) <= s && toMin(x.e) > s);
        free.push({...p, s, e:s+t.est, kind: rel ? `horario liberado de “${rel.title}”` : "hueco libre"});
        break;
      }
    }
  }
  if (t.cat !== "rutina") for (const p of plan) {
    if (inBlock.length >= 2) break;
    for (const x of sel.blocksOf(p.day)) {
      if (x.cat !== t.cat || isFreed(sel, p.week, x)) continue;
      let start = Math.max(toMin(x.s), Math.ceil(p.from/5)*5);
      sel.tasksAt(p.week, p.day).filter(o => o.id !== t.id).sort((a, b) => toMin(a.slot.s) - toMin(b.slot.s)).forEach(o => {
        if (toMin(o.slot.s) < start + t.est && toMin(o.slot.e) > start) start = toMin(o.slot.e);
      });
      if (toMin(x.e) - start >= t.est) { inBlock.push({...p, s:start, e:start+t.est, kind:`dentro de tu bloque “${x.title}”`}); break; }
    }
  }
  return [...free, ...inBlock];
}

export function slotLabel(slot, info = nowInfo()){
  const p = planDays(info).find(p => p.week === slot.week && p.day === slot.day);
  return p ? `${p.rel} de ${fmt(slot.s)} a ${fmt(slot.e)}` : `${DAYS[slot.day]} de ${fmt(slot.s)} a ${fmt(slot.e)}`;
}

export function slotPassed(slot, info = nowInfo()){
  const key = weekKey(info.d);
  if (slot.week < key) return true;
  if (slot.week > key) return false;
  return slot.day < info.day || (slot.day === info.day && toMin(slot.e) <= info.min);
}

/** Texto del vencimiento, o null si la tarea no tiene fecha límite. */
export function dueStatus(due, info = nowInfo()){
  if (!due) return null;
  const diff = Math.round((new Date(due+"T12:00") - new Date(isoLocal(info.d)+"T12:00")) / DAY_MS);
  const [, m, d] = due.split("-");
  const text = diff < 0 ? "Vencida" : diff === 0 ? "Vence hoy" : diff === 1 ? "Vence mañana" : `Vence el ${Number(d)}/${Number(m)}`;
  return {text, warn: diff <= 1};
}

/** Pendientes: primero las agendadas a futuro (por horario), después por vencimiento. */
export function sortPending(tasks, info = nowInfo()){
  const order = t => {
    const upcoming = t.slot && !slotPassed(t.slot, info);
    return [upcoming ? 0 : 1, upcoming ? t.slot.week + t.slot.day + t.slot.s : (t.due || "9999"), t.createdAt || ""].join("|");
  };
  return tasks.filter(t => !t.done).map(t => [order(t), t]).sort((a, b) => a[0] < b[0] ? -1 : 1).map(x => x[1]);
}

/** Minutos libres que quedan desde ahora hasta el domingo. */
export function freeMinutesLeft(sel, info = nowInfo()){
  const key = weekKey(info.d); let total = 0;
  for (let d = info.day; d < 7; d++) freeGaps(sel, key, d, d === info.day ? info.min : 0).forEach(([a, b]) => total += b - a);
  return total;
}
