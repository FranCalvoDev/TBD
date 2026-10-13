// Tiempo en minutos desde la medianoche. El día va de 08:30 (510) a 00:30 del día siguiente (1470).
import { now } from "./clock.js";

export const START = 510, END = 1470, DAY_MS = 86400000;

export const toMin = t => { const [h,m] = t.split(":").map(Number); return h*60+m; };
export const minToStr = m => String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
export const fmt = t => { let m = toMin(t); if (m >= 1440) m -= 1440; return minToStr(m); };
export const durTxt = mins => { const h = Math.floor(mins/60), m = mins%60; return (h?h+" h":"")+(h&&m?" ":"")+(m?m+" min":"") || "0 min"; };
export const span = x => toMin(x.e) - toMin(x.s);
export const isoLocal = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");

/** Semana ISO, p. ej. "2026-S42". Ordena bien como texto. */
export function weekKey(d){
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate()+4-day);
  const y = new Date(Date.UTC(t.getUTCFullYear(),0,1));
  return t.getUTCFullYear()+"-S"+String(Math.ceil(((t-y)/DAY_MS+1)/7)).padStart(2,"0");
}

/** Día (0 = lunes) y minuto actuales. Antes de las 00:30 todavía cuenta como el día anterior. */
export function nowInfo(d = now()){
  let day = (d.getDay()+6)%7, min = d.getHours()*60+d.getMinutes(), ref = d;
  if (min < 30) { min += 1440; day = (day+6)%7; ref = new Date(d.getTime()-DAY_MS); }
  return {d:ref, day, min};
}
export function mondayDate(info = nowInfo()){
  const m = new Date(info.d.getTime() - info.day*DAY_MS); m.setHours(12,0,0,0); return m;
}
export const currentWeekKey = (info = nowInfo()) => weekKey(info.d);
export const nextWeekKey = (info = nowInfo()) => weekKey(new Date(mondayDate(info).getTime() + 7*DAY_MS));
export const mondayLabel = (info = nowInfo()) => { const m = mondayDate(info); return m.getDate()+"/"+(m.getMonth()+1); };
