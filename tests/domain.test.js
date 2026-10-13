import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setNow } from "../src/core/clock.js";
import { freeGaps } from "../src/domain/schedule.js";
import { suggestSlots, slotPassed, dueStatus } from "../src/domain/tasks.js";
import { validateBlock } from "../src/domain/validation.js";
import { computeStats } from "../src/domain/stats.js";
import { makeApp } from "./helpers.js";

// Martes 13/10/2026 a las 10:15, durante el curso de la UTN.
beforeEach(() => setNow(new Date(2026, 9, 13, 10, 15)));
afterEach(() => setNow(null));

describe("huecos y sugerencias", () => {
  it("encuentra los huecos libres del martes", () => {
    const {sel} = makeApp();
    expect(freeGaps(sel, sel.curKey(), 1, 615)).toEqual([[960, 1020], [1110, 1140], [1200, 1230], [1320, 1410]]);
  });
  it("un bloque hecho libera su horario", () => {
    const {sel, act} = makeApp();
    act.toggleDone("d1b4"); // Edición de contenido, 14:00 a 16:00
    expect(freeGaps(sel, sel.curKey(), 1, 615)[0]).toEqual([840, 1020]);
  });
  it("sugiere huecos y lugares dentro de bloques de la misma categoría", () => {
    const {sel, act} = makeApp();
    const id = act.saveTask({title:"Mandar CV", est:30, cat:"trabajo", due:""});
    const sug = suggestSlots(sel, sel.task(id));
    expect(sug[0]).toMatchObject({rel:"Hoy", s:960, e:990, kind:"hueco libre"});
    expect(sug.some(s => s.kind.includes("Mensajes de contacto"))).toBe(true);
  });
  it("respeta la fecha límite", () => {
    const {sel, act} = makeApp();
    const id = act.saveTask({title:"Larga", est:240, cat:"personal", due:"2026-10-13"});
    expect(suggestSlots(sel, sel.task(id)).filter(s => s.kind === "hueco libre")).toHaveLength(0);
  });
  it("sabe si un horario agendado ya pasó y cuándo vence una tarea", () => {
    expect(slotPassed({week:"2026-S42", day:0, s:"10:00", e:"11:00"})).toBe(true);
    expect(slotPassed({week:"2026-S42", day:1, s:"16:00", e:"16:30"})).toBe(false);
    expect(dueStatus("2026-10-14")).toEqual({text:"Vence mañana", warn:true});
    expect(dueStatus("2026-10-20")).toEqual({text:"Vence el 20/10", warn:false});
  });
});

describe("validación de bloques", () => {
  const {sel} = makeApp();
  const form = over => ({title:"Leer", day:1, cat:"personal", s:"16:00", e:"17:00", p:"", l:"a\n\n b ", ...over});
  it("acepta un bloque válido y limpia los tips", () => {
    expect(validateBlock(form(), sel.blocksOf(1)).value).toMatchObject({s:"16:00", e:"17:00", l:["a", "b"]});
  });
  it("rechaza superposiciones y horarios fuera del día", () => {
    expect(validateBlock(form({s:"15:30"}), sel.blocksOf(1)).error).toContain("Edición de contenido");
    expect(validateBlock(form({s:"07:00", e:"08:00"}), sel.blocksOf(1)).error).toContain("08:30");
    expect(validateBlock(form({title:" "}), sel.blocksOf(1)).error).toContain("título");
  });
  it("admite bloques que terminan después de medianoche", () => {
    expect(validateBlock(form({day:5, s:"23:00", e:"00:30"}), []).value).toMatchObject({s:"23:00", e:"24:30"});
  });
});

describe("acciones y estadísticas", () => {
  it("marcar un bloque crea la semana con lo planificado", () => {
    const {sel, act} = makeApp();
    act.toggleDone("d1b1");
    const w = sel.curWeek();
    expect(w.id).toBe("2026-S42");
    expect(w.done.d1b1).toMatchObject({cat:"estudio", min:180});
    expect(w.planned.count).toBe(49);
    const st = computeStats(sel);
    expect(st.kpis[0].v).toBe("2%");
  });
  it("dar de baja y marcar como hecho se excluyen", () => {
    const {sel, act} = makeApp();
    act.toggleOff("d1b1"); act.toggleDone("d1b1");
    expect(sel.curWeek().off.d1b1).toBeUndefined();
    expect(sel.curWeek().done.d1b1).toBeDefined();
  });
  it("restaurar la rutina borra los bloques nuevos y repone los originales", () => {
    const {sel, act} = makeApp();
    act.deleteBlock("d0b0");
    const id = act.saveBlock({day:5, cat:"personal", title:"Extra", s:"15:00", e:"16:00", p:"", l:[]});
    act.restoreBlocks();
    expect(sel.block(id)).toBeUndefined();
    expect(sel.block("d0b0")).toBeDefined();
    expect(sel.planned().count).toBe(49);
  });
  it("cambiar la duración de una tarea agendada ajusta su fin", () => {
    const {sel, act} = makeApp();
    const id = act.saveTask({title:"x", est:30, cat:"personal", due:""});
    act.scheduleTask(id, {week:"2026-S42", day:1, s:"16:00", e:"16:30"});
    act.saveTask({title:"x", est:60, cat:"personal", due:""}, id);
    expect(sel.task(id).slot.e).toBe("17:00");
  });
});
