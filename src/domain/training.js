// Entrenamiento: semana del programa, sesión de hoy, últimas marcas y registro de cargas.
import { DAY_MS, isoLocal, mondayDate, nowInfo, weekKey } from "../core/time.js";

/** Tipos de registro de un ejercicio. */
export const METRICS = {
  carga:     {name:"Peso y repeticiones", fields:["kg", "reps"]},
  reps:      {name:"Repeticiones",        fields:["reps"]},
  tiempo:    {name:"Tiempo (s)",          fields:["value"]},
  distancia: {name:"Distancia (cm)",      fields:["value"]},
  texto:     {name:"Texto libre",         fields:["value"]}
};

export const routineDay = (routine, dayId) => routine?.days?.find(d => d.id === dayId) || null;
export const activeSchedule = routine => routine?.schedules?.find(s => s.id === routine.schedule) || routine?.schedules?.[0] || null;

/** Semana del programa en curso según la fecha de inicio, o null si no hay programa. */
export function programWeek(routine, info = nowInfo()){
  const p = routine?.program;
  if (!p?.weeks?.length || !p.start) return null;
  const start = new Date(p.start + "T12:00"), mon = mondayDate(info);
  const index = Math.floor(Math.round((mon - start) / DAY_MS) / 7);
  if (index < 0) return {index, week:null, before:true};
  if (index >= p.weeks.length) return {index, week:null, after:true};
  return {index, week:p.weeks[index]};
}

/** Fecha de inicio para que la semana actual sea la número `index` del programa. */
export const programStartFor = (index, info = nowInfo()) => isoLocal(new Date(mondayDate(info).getTime() - index * 7 * DAY_MS));

/** Etiqueta de semana para guardar una sesión: la del programa o la semana ISO. */
export function sessionWeek(routine, info = nowInfo()){
  const pw = programWeek(routine, info);
  return pw?.week ? pw.week.label : weekKey(info.d);
}

/** Plan del día de la semana `day` (0 = lunes): {day: dayId?, text?}. */
export const planFor = (routine, day) => activeSchedule(routine)?.plan?.[day] || null;

/** Sesión que toca hoy, o null si hoy es descanso o no hay plan. */
export function todaysDay(routine, info = nowInfo()){
  const plan = planFor(routine, info.day);
  return plan?.day ? routineDay(routine, plan.day) : null;
}

/** Sesiones de una rutina, de la más nueva a la más vieja. */
export const workoutsOf = (workouts, routineId) =>
  workouts.filter(w => w.routineId === routineId).sort((a, b) => (b.date + (b.createdAt || "")).localeCompare(a.date + (a.createdAt || "")));

/** Último registro de un ejercicio (antes de `beforeDate` si se indica). */
export function lastEntry(workouts, exerciseId, beforeDate){
  for (const w of workouts) {
    if (beforeDate && w.date >= beforeDate) continue;
    const e = w.entries?.[exerciseId];
    if (e && (e.kg || e.reps || e.value)) return {entry:e, workout:w};
  }
  return null;
}

/** Texto corto de un registro según su tipo. */
export function formatEntry(entry, metric = "carga"){
  if (!entry) return "";
  const {kg, reps, value} = entry;
  if (metric === "carga") return kg && reps ? `${kg}×${reps}` : kg ? `${kg} kg` : reps ? `${reps} reps` : "";
  if (metric === "reps") return reps ? `${reps} reps` : "";
  if (metric === "tiempo") return value ? `${value} s` : "";
  if (metric === "distancia") return value ? `${value} cm` : "";
  return value || "";
}

/**
 * Registro de cargas: filas = ejercicios marcados para seguir, columnas = semanas.
 * En cada celda, el mejor registro (o el último) de esa semana.
 */
export function registry(routine, workouts){
  const sessions = workoutsOf(workouts, routine.id);
  const columns = routine.program?.weeks?.length
    ? routine.program.weeks.map(w => w.label)
    : [...new Set(sessions.map(s => s.week))].sort().slice(-6);
  const rows = [];
  for (const day of routine.days || []) for (const ex of day.exercises || []) {
    if (ex.track === false) continue;
    const cells = columns.map(col => {
      const s = sessions.find(w => w.week === col && w.entries?.[ex.id] && formatEntry(w.entries[ex.id], ex.metric));
      return s ? formatEntry(s.entries[ex.id], ex.metric) : "";
    });
    rows.push({exercise:ex, day, cells});
  }
  const check = columns.map(col => sessions.filter(w => w.week === col && w.check).map(w => w.check[0]).join(" "));
  return {columns, rows, check};
}
