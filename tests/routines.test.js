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
