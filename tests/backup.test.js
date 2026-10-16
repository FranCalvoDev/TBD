import { describe, it, expect } from "vitest";
import { buildBackup, parseBackup, restoreBackup, backupFileName, countRecords } from "../src/storage/backup.js";
import { makeApp } from "./helpers.js";

describe("copias de seguridad", () => {
  it("exporta los datos vivos y las preferencias, sin lápidas", () => {
    const {store, act} = makeApp();
    const id = act.saveTask({title:"Llamar", est:15, cat:"personal", due:""});
    act.deleteTask(id);
    act.bumpGoal("gym", 2);
    const b = buildBackup(store, {theme:"dark"}, new Date(2026, 9, 16));
    expect(b).toMatchObject({app:"TBD", kind:"tbd-backup", version:1, prefs:{theme:"dark"}});
    expect(b.records.tasks).toHaveLength(0);
    expect(b.records.blocks).toHaveLength(14);
    expect(b.records.weeks[0].goals.gym).toBe(2);
    expect(backupFileName(new Date(2026, 9, 6))).toBe("tbd-copia-2026-10-06.json");
  });

  it("importar en una instalación nueva deja exactamente los datos de la copia", () => {
    const origen = makeApp("dev-a");
    origen.act.updateCategory("rutina", {name:"Hábitos"});
    const texto = JSON.stringify(buildBackup(origen.store, {theme:"light"}));
    const destino = makeApp("dev-b", "empty");
    destino.act.saveTask({title:"Algo local", est:15, cat:"personal", due:""});
    const {records, prefs} = parseBackup(texto);
    expect(countRecords(records)).toEqual({blocks:14, tasks:0, goals:1, categories:8});
    restoreBackup(destino.store, records);
    expect(destino.sel.tasks()).toHaveLength(0);                      // lo local que no estaba en la copia se borra
    expect(destino.sel.category("rutina").name).toBe("Hábitos");
    expect([0,1,2,3,4,5,6].flatMap(d => destino.sel.blocksOf(d))).toHaveLength(14);
    expect(destino.store.get("blocks", "d1b1").deviceId).toBe("dev-b"); // se reescriben como cambios nuevos (para sincronizar)
    expect(prefs.theme).toBe("light");
  });

  it("rechaza archivos que no son copias de TBD", () => {
    expect(() => parseBackup("hola")).toThrow("no es JSON");
    expect(() => parseBackup(JSON.stringify({kind:"otra-cosa"}))).toThrow("no es una copia de TBD");
    expect(() => parseBackup(JSON.stringify({kind:"tbd-backup", version:99, records:{}}))).toThrow("versión más nueva");
    expect(() => parseBackup(JSON.stringify({kind:"tbd-backup", version:1, records:{blocks:[{sin:"id"}]}}))).toThrow("dañada");
  });
});
