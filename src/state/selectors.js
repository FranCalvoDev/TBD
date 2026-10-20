// Lecturas derivadas del store. Se recalculan solo cuando cambia store.version.
import { toMin, currentWeekKey } from "../core/time.js";
import { computePlanned } from "../domain/schedule.js";

const EMPTY_WEEK = Object.freeze({done:{}, off:{}, goals:{}});
const byStart = (a, b) => toMin(a.s) - toMin(b.s);

export function createSelectors(store){
  let seen = -1, cache = null;
  const memo = () => {
    if (seen !== store.version) {
      seen = store.version;
      const byDay = [[], [], [], [], [], [], []];
      store.list("blocks").forEach(x => byDay[x.day]?.push(x));
      byDay.forEach(d => d.sort(byStart));
      cache = {
        byDay,
        planned: computePlanned(byDay.flat()),
        categories: store.list("categories").sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        goals: store.list("goals").sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        tasks: store.list("tasks"),
        notes: store.list("notes"),
        routines: store.list("routines").sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name))),
        workouts: store.list("workouts"),
        weeks: store.list("weeks").sort((a, b) => a.id < b.id ? -1 : 1)
      };
    }
    return cache;
  };

  const sel = {
    curKey: () => currentWeekKey(),
    categories: () => memo().categories,
    category: id => store.get("categories", id),
    firstCategory: () => memo().categories[0]?.id || "",
    blocksOf: day => memo().byDay[day] || [],
    block: id => store.get("blocks", id),
    planned: () => memo().planned,
    goals: () => memo().goals,
    tasks: () => memo().tasks,
    task: id => store.get("tasks", id),
    notes: () => memo().notes,
    note: id => store.get("notes", id),
    routines: () => memo().routines,
    routine: id => store.get("routines", id),
    /** La rutina en uso: la marcada como activa o, si no, la primera. */
    activeRoutine: () => memo().routines.find(r => r.active) || memo().routines[0] || null,
    workouts: () => memo().workouts,
    workout: id => store.get("workouts", id),
    weeks: () => memo().weeks,
    week: key => store.get("weeks", key) || EMPTY_WEEK,
    curWeek: () => sel.week(sel.curKey()),
    hasWeek: key => !!store.get("weeks", key),
    tasksAt: (week, day, includeDone = false) =>
      memo().tasks.filter(t => t.slot && t.slot.week === week && t.slot.day === day && (includeDone || !t.done))
  };
  return sel;
}
