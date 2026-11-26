import { describe, it, expect } from "vitest";
import {
  bmr, dayTargets, buildPlan, scaleMenu, mealTimes, equivalents, equivalentGrams,
  nextMeal, weeklySummary, advice, avg7, weightPoints, qtyText, roundQty
} from "../src/domain/nutrition.js";
import { DEFAULT_SETTINGS } from "../src/data/nutrition.js";
import { makeApp } from "./helpers.js";

// Perfil de ejemplo (genérico, no es de nadie).
const PROFILE = {w:80, h:180, a:30, sex:"h", act:1.55};
const settings = patch => ({...DEFAULT_SETTINGS, profile:PROFILE, ...patch});
const sum = (plan, k) => Math.round(plan.planned[k]);
const b = (s, e, cat, title) => ({s, e, cat, title});

describe("nutrición: objetivos", () => {
  it("calcula el metabolismo basal con Mifflin-St Jeor", () => {
    expect(bmr({w:80, h:180, a:30, sex:"h"})).toBe(1780);
    expect(bmr({w:60, h:165, a:30, sex:"m"})).toBe(1320.25);
  });
  it("sin perfil completo no hay objetivos", () => {
    expect(dayTargets({profile:null, strategy:"recomp", type:"gym"})).toBeNull();
    expect(dayTargets({profile:{w:80}, strategy:"recomp", type:"gym"})).toBeNull();
  });
  it("la proteína sale de g/kg y los carbohidratos completan las calorías", () => {
    const t = dayTargets({profile:PROFILE, weight:80, strategy:"recomp", type:"gym"});
    expect(t.p).toBe(176);                       // 2,2 g/kg
    expect(t.f).toBe(72);                        // 0,9 g/kg
    expect(Math.abs(t.p*4 + t.c*4 + t.f*9 - t.k)).toBeLessThan(6);
    const rest = dayTargets({profile:PROFILE, weight:80, strategy:"recomp", type:"rest"});
    const match = dayTargets({profile:PROFILE, weight:80, strategy:"recomp", type:"match"});
    expect(rest.k).toBeLessThan(t.k); expect(match.c).toBeGreaterThan(t.c);
  });
  it("volumen come más que recomposición y definición menos, con más proteína", () => {
    const k = st => dayTargets({profile:PROFILE, weight:80, strategy:st, type:"gym"});
    expect(k("volumen").k).toBeGreaterThan(k("recomp").k);
    expect(k("definicion").k).toBeLessThan(k("recomp").k);
    expect(k("definicion").p).toBeGreaterThan(k("recomp").p);
  });
  it("el ajuste fino suma o resta calorías en los carbohidratos", () => {
    const a = dayTargets({profile:PROFILE, weight:80, strategy:"recomp", type:"gym"});
    const b2 = dayTargets({profile:PROFILE, weight:80, strategy:"recomp", type:"gym", adjust:-150});
    expect(a.k - b2.k).toBe(150); expect(a.p).toBe(b2.p); expect(a.c - b2.c).toBeGreaterThan(30);
  });
});

describe("nutrición: menús", () => {
  it("los menús escalados quedan cerca de los objetivos para perfiles distintos", () => {
    for (const profile of [PROFILE, {w:58, h:162, a:27, sex:"m", act:1.375}, {w:105, h:192, a:40, sex:"h", act:1.725}])
      for (const strategy of ["recomp", "volumen", "definicion"])
        for (const t of ["gym", "rest", "match"]) {
          const p = buildPlan({iso:"2026-11-26", day:{t}, settings:settings({profile, strategy})});
          expect(Math.abs(sum(p, "k") - p.target.k) / p.target.k).toBeLessThan(0.08);
          expect(Math.abs(sum(p, "p") - p.target.p) / p.target.p).toBeLessThan(0.08);
        }
  });
  it("sin objetivos muestra el menú de base", () => {
    expect(scaleMenu("rest", null)[0].items[0]).toMatchObject({f:"huevo", g:150});
  });
  it("redondea a porciones reales", () => {
    expect(roundQty("huevo", 130)).toBe(150);
    expect(roundQty("arroz", 132)).toBe(130);
    expect(roundQty("aceite", 7.4)).toBe(7);
    expect(qtyText("huevo", 150)).toBe("3 huevos (150 g)");
    expect(qtyText("yogur", 175)).toBe("1 pote");
    expect(qtyText("leche", 300)).toBe("300 ml");
  });
  it("alterna el menú A y B entre los días de entrenamiento", () => {
    const blocks = [b("18:00", "19:30", "ejercicio", "Gimnasio")];
    const mon = buildPlan({iso:"2026-11-23", settings:settings({gymCat:"ejercicio"}), blocks, gymDays:[0, 3]});
    const thu = buildPlan({iso:"2026-11-26", settings:settings({gymCat:"ejercicio"}), blocks, gymDays:[0, 3]});
    expect(mon.type).toBe("gym"); expect([mon.key, thu.key]).toEqual(["gymA", "gymB"]);
    expect(buildPlan({iso:"2026-11-26", settings:settings({variant:"A"}), blocks, gymDays:[0, 3]}).key).toBe("gymA");
  });
  it("un cambio de alimento mantiene la misma cantidad del macro clave", () => {
    const g = equivalentGrams("pollo", 200, "merluza");
    expect(Math.abs(g * 17.1 / 100 - 45)).toBeLessThan(1.5);
    expect(equivalents("avena", 80).map(e => e.f)).not.toContain("miel");
    expect(equivalents("avena", 80)[0].same).toBe(true);
    const p = buildPlan({iso:"2026-11-26", day:{t:"rest", sw:{"almuerzo_atun":"pollo"}}, settings:settings()});
    const it = p.meals.find(m => m.r === "almuerzo").items.find(i => i.base === "atun");
    expect(it.f).toBe("pollo"); expect(it.from.f).toBe("atun");
  });
  it("suma lo comido con las comidas marcadas y lo de fuera del plan", () => {
    const p = buildPlan({iso:"2026-11-26", day:{t:"rest", done:{desayuno:true}, ex:[{n:"Alfajor", k:250, p:4}]}, settings:settings()});
    const des = p.meals.find(m => m.r === "desayuno");
    expect(Math.round(p.eaten.k)).toBe(Math.round(des.tot.k + 250));
    expect(nextMeal(p, 600, true).r).toBe("almuerzo");
  });
});

describe("nutrición: horarios", () => {
  const day = [b("08:30", "09:00", "rutina", "Mañana"), b("12:00", "13:00", "rutina", "Almuerzo"), b("17:00", "18:30", "ejercicio", "Gimnasio"),
    b("19:00", "20:00", "estudio", "Clase"), b("23:30", "24:30", "rutina", "Cierre")];
  it("ubica las comidas alrededor del entrenamiento y de los bloques del día", () => {
    const T = mealTimes({blocks:day, gymCat:"ejercicio", type:"gym", weekday:1});
    expect(T.desayuno).toBe(525);   // 08:45
    expect(T.almuerzo).toBe(720);   // 12:00
    expect(T.pre).toBe(945);        // 15:45, 75 min antes
    expect(T.post).toBe(1215);      // después de la clase corta: 20:15
    expect(T.noche).toBe(1410);     // 23:30
  });
  it("el día de partido se organiza desde la hora del partido y respeta las horas propias", () => {
    const T = mealTimes({blocks:day, type:"match", matchTime:"16:00", weekday:5, overrides:{"5_match_prePartido":"14:30"}});
    expect(T.almPartido).toBe(720); expect(T.prePartido).toBe(870); expect(T.postPartido).toBe(1140);
  });
});

describe("nutrición: progreso y ajustes", () => {
  const days = (weights, start = "2026-10-05") => weights.map((w, i) => {
    const d = new Date(2026, 9, 5 + i, 12); return {date:`2026-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, w};
  });
  const planOf = () => ({meals:[], eaten:{k:0, p:0}, target:{p:0}});
  it("promedia 7 días con al menos 3 pesajes", () => {
    const pts = weightPoints(days([80, 81, 82]));
    expect(avg7(pts, "2026-10-07")).toBe(81);
    expect(avg7(pts, "2026-10-06")).toBeNull();
  });
  it("pide datos hasta tener 2 semanas con pesajes", () => {
    expect(advice({strategy:"recomp", weekly:weeklySummary(days([80, 80, 80]), [], planOf), plannedAvg:2800}).tone).toBe("info");
  });
  it("en volumen, si sube rápido indica bajar 150 kcal", () => {
    const w = Array.from({length:21}, (_, i) => 80 + i * 0.12);
    const a = advice({strategy:"volumen", weekly:weeklySummary(days(w), [], planOf), plannedAvg:3000});
    expect(a.delta).toBe(-150);
    expect(a.maint).toBeLessThan(3000);
  });
  it("en recomposición, peso estable y cintura que baja es seguir igual", () => {
    const w = Array.from({length:35}, () => 80);
    const weeks = [{week:"2026-S41", waist:88}, {week:"2026-S45", waist:86.5}];
    const a = advice({strategy:"recomp", weekly:weeklySummary(days(w), weeks, planOf), plannedAvg:2800});
    expect(a.tone).toBe("good"); expect(a.maint).toBe(2800);
  });
});

describe("nutrición: datos", () => {
  it("guarda ajustes, días y semanas en la colección nutrition", () => {
    const {store, sel, act} = makeApp();
    expect(sel.nutrition().profile).toBeNull();
    act.updateNutrition({profile:PROFILE, strategy:"volumen"});
    act.updateNutritionDay("2026-11-26", d => { d.done = {desayuno:true}; d.w = 80.4; });
    act.updateNutritionWeek("2026-S48", w => { w.waist = 86; });
    expect(sel.nutrition()).toMatchObject({strategy:"volumen", profile:PROFILE});
    expect(sel.nutritionDay("2026-11-26")).toMatchObject({date:"2026-11-26", w:80.4, done:{desayuno:true}});
    expect(sel.nutritionDays()).toHaveLength(1);
    expect(sel.nutritionWeeks()[0]).toMatchObject({week:"2026-S48", waist:86});
    expect(store.snapshot().nutrition).toHaveLength(3);
  });
});
