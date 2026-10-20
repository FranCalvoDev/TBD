import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setNow } from "../src/core/clock.js";
import { nowInfo } from "../src/core/time.js";
import { pickReminder, sortNotes } from "../src/domain/notes.js";
import { programWeek, programStartFor, sessionWeek, todaysDay, planFor, lastEntry, formatEntry, registry, workoutsOf } from "../src/domain/training.js";
import { richText, preview } from "../src/ui/richText.js";
import { makeApp } from "./helpers.js";

// Martes 13/10/2026 a las 10:15.
beforeEach(() => setNow(new Date(2026, 9, 13, 10, 15)));
afterEach(() => setNow(null));

const ex = (id, name, metric = "carga", track = true) => ({id, block:"A", name, sets:"4 x 4-6", rir:"2", rest:"2:30", metric, track});
const routine = () => ({
  id:"r1", name:"Fase 3", checkLabel:"Semáforo",
  days:[{id:"d1", name:"Día 1 · Pierna A", exercises:[ex("fs", "Front squat"), ex("nor", "Nordic", "texto"), ex("calf", "Gemelo", "carga", false)]},
        {id:"d2", name:"Día 2 · Superior A", exercises:[ex("bp", "Bench press")]}],
  schedules:[{id:"sab", name:"Partido sábado", plan:[{day:"d1"}, {day:"d2"}, {text:"Descanso"}, {}, {}, {text:"Partido"}, {}]},
             {id:"dom", name:"Partido domingo", plan:[{day:"d2"}, {day:"d1"}, {}, {}, {}, {}, {text:"Partido"}]}],
  schedule:"sab",
  program:{start:"2026-10-05", weeks:[{label:"15", goal:"Reentrada"}, {label:"16", goal:"Sumar reps"}, {label:"17", goal:"Subir carga"}]}
});

describe("notas como recordatorio", () => {
  const notes = [
    {id:"a", title:"Gym 1", cat:"ejercicio", createdAt:"2026-10-01"}, {id:"b", title:"Gym 2", cat:"ejercicio", createdAt:"2026-10-02"},
    {id:"c", title:"Fijada", cat:"", pinned:true, createdAt:"2026-09-01"}, {id:"d", title:"Suelta", cat:"trabajo"}
  ];
  it("primero una nota de la categoría del bloque en curso, si no una fijada", () => {
    expect(pickReminder(notes, "ejercicio")).toMatchObject({reason:"block"});
    expect(["a", "b"]).toContain(pickReminder(notes, "ejercicio").note.id);
    expect(pickReminder(notes, "estudio")).toMatchObject({reason:"pinned", note:{id:"c"}});
    expect(pickReminder(notes.filter(n => !n.pinned), null)).toBeNull();
  });
  it("la elegida es la misma todo el día y cambia otro día", () => {
    const hoy = pickReminder(notes, "ejercicio").note.id;
    setNow(new Date(2026, 9, 13, 20, 0)); expect(pickReminder(notes, "ejercicio").note.id).toBe(hoy);
    const otros = [14, 15, 16, 17].map(d => { setNow(new Date(2026, 9, d, 12)); return pickReminder(notes, "ejercicio").note.id; });
    expect(new Set([hoy, ...otros]).size).toBe(2);
  });
  it("las fijadas van primero", () => expect(sortNotes(notes)[0].id).toBe("c"));
  it("formato simple: listas, negrita y escape de HTML", () => {
    expect(richText("Hola **mundo**\n\n- uno\n- <b>dos</b>")).toBe("<p>Hola <b>mundo</b></p><ul><li>uno</li><li>&lt;b&gt;dos&lt;/b&gt;</li></ul>");
    expect(preview("- uno\n- dos", 20)).toBe("uno dos");
  });
});

describe("entrenamiento", () => {
  it("calcula la semana del programa y deja elegirla", () => {
    const r = routine();
    expect(programWeek(r)).toMatchObject({index:1, week:{label:"16"}});
    r.program.start = programStartFor(2); expect(programWeek(r).week.label).toBe("17");
    r.program.start = "2026-09-01"; expect(programWeek(r)).toMatchObject({after:true});
    r.program.start = "2026-11-02"; expect(programWeek(r)).toMatchObject({before:true});
    expect(sessionWeek(routine())).toBe("16");
    expect(sessionWeek({...routine(), program:null})).toBe("2026-S42");
  });
  it("sabe qué día de la rutina toca según el plan elegido", () => {
    const r = routine();
    expect(todaysDay(r).id).toBe("d2");                          // martes, partido el sábado
    expect(todaysDay({...r, schedule:"dom"}).id).toBe("d1");      // martes, partido el domingo
    expect(planFor(r, 2)).toEqual({text:"Descanso"});
    expect(todaysDay(r, nowInfo(new Date(2026, 9, 14, 12)))).toBeNull(); // miércoles: descanso
  });
  it("guarda sesiones, recuerda la última marca y arma el registro de cargas", () => {
    const {sel, act} = makeApp();
    const r = routine(); act.saveRoutine(r, null); // id nuevo; usamos el guardado
    const rid = sel.routines()[0].id, saved = {...r, id:rid};
    act.saveWorkout({routineId:rid, dayId:"d1", date:"2026-10-06", week:"15", entries:{fs:{kg:"60", reps:"6"}, nor:{value:"2x3 parcial"}}, check:"Verde"});
    act.saveWorkout({routineId:rid, dayId:"d1", date:"2026-10-12", week:"16", entries:{fs:{kg:"62.5", reps:"5"}, calf:{kg:"40", reps:"12"}}, check:"Amarillo"});
    const ws = workoutsOf(sel.workouts(), rid);
    expect(ws.map(w => w.week)).toEqual(["16", "15"]);
    expect(formatEntry(lastEntry(ws, "fs").entry)).toBe("62.5×5");
    expect(formatEntry(lastEntry(ws, "fs", "2026-10-12").entry)).toBe("60×6");   // la anterior a esa fecha
    expect(formatEntry(lastEntry(ws, "nor").entry, "texto")).toBe("2x3 parcial");
    const reg = registry(saved, sel.workouts());
    expect(reg.columns).toEqual(["15", "16", "17"]);
    expect(reg.rows.map(r => r.exercise.name)).toEqual(["Front squat", "Nordic", "Bench press"]); // Gemelo no se sigue
    expect(reg.rows[0].cells).toEqual(["60×6", "62.5×5", ""]);
    expect(reg.check).toEqual(["V", "A", ""]);
  });
  it("formatea cada tipo de registro", () => {
    expect(formatEntry({kg:"80", reps:"5"})).toBe("80×5");
    expect(formatEntry({reps:"8"}, "reps")).toBe("8 reps");
    expect(formatEntry({value:"3.1"}, "tiempo")).toBe("3.1 s");
    expect(formatEntry({value:"45"}, "distancia")).toBe("45 cm");
    expect(formatEntry(null)).toBe("");
  });
  it("activar una rutina desmarca las demás y borrarla borra sus sesiones", () => {
    const {sel, act} = makeApp();
    const a = act.saveRoutine({name:"A", days:[]}), b = act.saveRoutine({name:"B", days:[]});
    act.activateRoutine(b); expect(sel.activeRoutine().id).toBe(b);
    act.activateRoutine(a); expect(sel.activeRoutine().id).toBe(a); expect(sel.routine(b).active).toBe(false);
    act.saveWorkout({routineId:a, dayId:"x", date:"2026-10-13", week:"1", entries:{}});
    act.deleteRoutine(a);
    expect(sel.routine(a)).toBeUndefined(); expect(sel.workouts()).toHaveLength(0);
  });
});
