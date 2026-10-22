import { describe, it, expect } from "vitest";
import { buildBackup, parseBackup, restoreBackup } from "../src/storage/backup.js";
import { makeApp } from "./helpers.js";

const rows = [{name:"Sentadillas", detail:"Espalda recta", amount:"3×12"}];

describe("rutinas", () => {
  it("se guardan con o sin tarea y se buscan por tarea", () => {
    const {sel, act} = makeApp();
    const t = act.saveTask({title:"Piernas", est:60, cat:"ejercicio", due:""});
    const a = act.saveRoutine({title:"Piernas", taskId:t, rows});
    const b = act.saveRoutine({title:"Suelta", taskId:"", rows:[]});
    expect(sel.routines().map(r => r.id)).toEqual([a, b]);
    expect(sel.routinesOfTask(t).map(r => r.id)).toEqual([a]);
    act.saveRoutine({title:"Piernas B"}, a);
    expect(sel.routine(a)).toMatchObject({title:"Piernas B", taskId:t, rows});
    act.deleteRoutine(a);
    expect(sel.routine(a)).toBeUndefined();
  });

  it("viajan en las copias de seguridad y las copias viejas siguen sirviendo", () => {
    const origen = makeApp("dev-a");
    origen.act.saveRoutine({title:"Rutina", taskId:"", rows});
    const texto = buildBackup(origen.store);
    const destino = makeApp("dev-b", "empty");
    restoreBackup(destino.store, parseBackup(JSON.stringify(texto)).records);
    expect(destino.sel.routines()).toHaveLength(1);

    delete texto.records.routines;
    expect(parseBackup(JSON.stringify(texto)).records.routines).toEqual([]);
  });
});

import { parseRow, parseRoutine, prettyAmount } from "../src/domain/routine.js";
import { createRoutineProgress } from "../src/state/routineProgress.js";
import { memoryStorage } from "./helpers.js";

describe("lectura de filas de rutina", () => {
  it("separa letra, etiquetas y aclaraciones", () => {
    const p = parseRow({name:"A · Front squat", detail:"RIR 2-3 · 2:30-3:00 · tempo 2-1-X. Si la técnica se degrada, termina la serie", amount:"4 x 4-6"});
    expect(p).toMatchObject({kind:"exercise", tag:"A", title:"Front squat", amount:"4 × 4-6", check:true});
    expect(p.chips).toEqual([{kind:"int", text:"RIR 2-3"}, {kind:"rest", text:"2:30-3:00"}, {kind:"tempo", text:"tempo 2-1-X"}]);
    expect(p.notes).toEqual(["Si la técnica se degrada, termina la serie"]);
  });

  it("reconoce pasos, aclaraciones y filas sin formato", () => {
    expect(parseRow({name:"Calentamiento", detail:"5 min bici + movilidad + skipping", amount:"~15 min"})).toMatchObject({kind:"steps", steps:["5 min bici", "movilidad", "skipping"], check:true});
    expect(parseRow({name:"Regla", detail:"Nunca pierna pesada antes de jugar", amount:"—"})).toMatchObject({kind:"note", amount:"", check:false});
    expect(parseRow({name:"Sentadillas", detail:"Espalda recta", amount:"3×12"})).toMatchObject({kind:"exercise", tag:"", notes:["Espalda recta"], check:true});
    expect(parseRow({name:"Peso", detail:"Promedio semanal", amount:"Semanal"}).check).toBe(false);
    expect(parseRow({name:"Aislamiento", detail:"Última serie 0-1", amount:"60-90 s"}).check).toBe(false);
    expect(parseRow({name:"Plancha", detail:"Espalda recta", amount:"1 min"}).check).toBe(true);
    expect(prettyAmount("2 x 30-45 s / 2 x 10")).toBe("2 × 30-45 s / 2 × 10");
  });

  it("agrupa las superseries por letra", () => {
    const g = parseRoutine(["B · x", "C1 · x", "C2 · x", "D1 · x", "D2 · x", "D3 · x", "E · x"].map(name => ({name, amount:"3x8"}))).map(p => p.group);
    expect(g).toEqual(["", "start", "end", "start", "mid", "end", ""]);
  });

  it("el progreso del día se guarda y se reinicia al cambiar de día", () => {
    let day = "2026-10-22";
    const storage = memoryStorage(), pr = createRoutineProgress(storage, () => day);
    pr.toggle("r1", 2); pr.toggle("r1", 0); pr.toggle("r2", 1);
    expect([...pr.done("r1")]).toEqual([0, 2]);
    pr.toggle("r1", 2); pr.reset("r2");
    expect([...pr.done("r1")]).toEqual([0]);
    expect(pr.done("r2").size).toBe(0);
    day = "2026-10-23";
    expect(pr.done("r1").size).toBe(0);
  });
});
