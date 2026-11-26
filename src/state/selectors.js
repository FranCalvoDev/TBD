// Lecturas derivadas del store. Se recalculan solo cuando cambia store.version.
import { toMin, currentWeekKey } from "../core/time.js";
import { computePlanned } from "../domain/schedule.js";
import { DEFAULT_SETTINGS } from "../data/nutrition.js";

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
        routines: store.list("routines").sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        weeks: store.list("weeks").sort((a, b) => a.id < b.id ? -1 : 1),
        nutritionDays: store.list("nutrition").filter(r => r.date).sort((a, b) => a.date < b.date ? -1 : 1),
        nutritionWeeks: store.list("nutrition").filter(r => r.week).sort((a, b) => a.week < b.week ? -1 : 1)
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
    routines: () => memo().routines,
    routine: id => store.get("routines", id),
    routinesOfTask: taskId => memo().routines.filter(r => r.taskId === taskId),
    routinesOfBlock: blockId => memo().routines.filter(r => r.blockId === blockId),
    weeks: () => memo().weeks,
    week: key => store.get("weeks", key) || EMPTY_WEEK,
    curWeek: () => sel.week(sel.curKey()),
    hasWeek: key => !!store.get("weeks", key),
    // Nutrición: un registro de ajustes ("settings"), uno por día ("d2026-11-26") y uno por semana ("w2026-S48").
    nutrition: () => ({...DEFAULT_SETTINGS, ...store.get("nutrition", "settings")}),
    nutritionDay: iso => store.get("nutrition", "d" + iso),
    nutritionDays: () => memo().nutritionDays,
    nutritionWeek: key => store.get("nutrition", "w" + key),
    nutritionWeeks: () => memo().nutritionWeeks,
    tasksAt: (week, day, includeDone = false) =>
      memo().tasks.filter(t => t.slot && t.slot.week === week && t.slot.day === day && (includeDone || !t.done))
  };
  return sel;
}
