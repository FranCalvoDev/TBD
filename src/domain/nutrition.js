// Reglas de nutrición, sin DOM: objetivos desde el perfil, menús escalados, horarios de comidas,
// equivalencias y ajustes según la tendencia del peso. Todo se prueba con tests.
import { FOODS, GROUPS, ROLES, MENUS, STRATEGIES, DAY_TYPES, DAY_KCAL } from "../data/nutrition.js";
import { toMin, minToStr, DAY_MS, isoLocal, weekKey } from "../core/time.js";

export const zero = () => ({k:0, p:0, c:0, f:0});
export const add = (a, b) => ({k:a.k+b.k, p:a.p+b.p, c:a.c+b.c, f:a.f+b.f});
export const mac = (f, g) => { const F = FOODS[f], r = g / 100; return {k:F.k*r, p:F.p*r, c:F.c*r, f:F.f*r}; };
export const nf = (v, d = 0) => Number(v || 0).toLocaleString("es-AR", {minimumFractionDigits:d, maximumFractionDigits:d});

/* ---------- fechas ---------- */
export const isoDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); };
export const shiftIso = (iso, n) => isoLocal(new Date(isoDate(iso).getTime() + n * DAY_MS));
/** 0 = lunes. */
export const weekdayOf = iso => (isoDate(iso).getDay() + 6) % 7;
export const weekOfIso = iso => weekKey(isoDate(iso));
export const clockText = m => minToStr(((Math.round(m) % 1440) + 1440) % 1440);

/* ---------- cantidades ---------- */
/** Redondea a algo que se pueda servir: unidades enteras o medias, 5 g, o 1 g en cantidades chicas. */
export function roundQty(f, g){
  const F = FOODS[f];
  if (F.u) {
    const step = ["huevo", "clara", "galleta"].includes(f) ? F.u[0] : F.u[0] / 2;
    return Math.max(step, Math.round(g / step) * step);
  }
  if (F.ml && g >= 100) return Math.round(g / 25) * 25;
  return g < 30 ? Math.max(1, Math.round(g)) : Math.round(g / 5) * 5;
}
export function qtyText(f, g){
  const F = FOODS[f];
  if (F.u) {
    const n = g / F.u[0], r = Math.round(n * 2) / 2;
    if (r > 0 && Math.abs(n - r) < 0.06) {
      const t = `${nf(r, r % 1 ? 1 : 0)} ${r <= 1 ? F.u[1] : F.u[2]}`;
      return F.u[0] >= 30 && f !== "yogur" && f !== "whey" ? `${t} (${nf(g)} g)` : t;
    }
  }
  return `${nf(g)} ${F.ml ? "ml" : "g"}`;
}
/** Aclaración del peso: en crudo, en seco y cuánto rinde cocido. */
export function qtyNote(f, g){
  const F = FOODS[f], s = [];
  if (F.st) s.push(F.st === "seco" ? "peso en seco" : F.st === "escurrido" ? "escurrido" : "peso en crudo");
  if (F.cook) s.push(`≈ ${nf(Math.round(g * F.cook / 10) * 10)} g cocido`);
  return s.join(" · ");
}

/* ---------- objetivos ---------- */
/** Metabolismo basal (Mifflin-St Jeor). sex: "h" hombre, "m" mujer. */
export const bmr = ({w, h, a, sex}) => 10*w + 6.25*h - 5*a + (sex === "m" ? -161 : 5);
export const maintenance = (profile, weight = profile.w) => bmr({...profile, w:weight}) * (profile.act || 1.55);
export const profileComplete = p => !!p && p.w > 0 && p.h > 0 && p.a > 0 && (p.sex === "h" || p.sex === "m") && p.act > 0;

/** Objetivos del día: calorías, proteína, carbohidratos y grasas (g). null si falta el perfil. */
export function dayTargets({profile, weight, strategy, type, adjust = 0}){
  if (!profileComplete(profile)) return null;
  const S = STRATEGIES[strategy] || STRATEGIES.recomp, w = weight || profile.w;
  const k = Math.round((maintenance(profile, w) * S.kcal * DAY_KCAL[type] + adjust) / 10) * 10;
  const p = Math.round(S.p * w), f = Math.round(S.f[type] * w);
  return {k, p, f, c:Math.max(0, Math.round((k - p*4 - f*9) / 4))};
}

/** Resuelve un sistema 3×3 (Cramer). Devuelve null si no tiene solución estable. */
function solve3(A, b){
  const det = m => m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const D = det(A); if (!Number.isFinite(D) || Math.abs(D) < 1e-6) return null;
  return [0, 1, 2].map(j => det(A.map((row, i) => row.map((v, k) => k === j ? b[i] : v))) / D);
}

/**
 * Menú escalado a los objetivos: proteínas, carbohidratos y grasas se multiplican por separado
 * (verduras, lácteos líquidos y condimentos quedan igual) y se redondean a porciones reales.
 */
export function scaleMenu(key, target){
  const meals = MENUS[key].meals.map(m => ({r:m.r, tip:m.tip || "", items:m.items.map(([f, g, x]) => ({f, g, x:x || "", base:f}))}));
  if (!target) return meals;
  // Lácteos líquidos, condimentos y verduras acompañan el tamaño general del menú; agua y bebida quedan igual.
  const baseK = meals.reduce((a, m) => a + m.items.reduce((s, it) => s + mac(it.f, it.g).k, 0), 0);
  const r0 = Math.min(1.3, Math.max(0.5, target.k / baseK));
  meals.forEach(m => m.items.forEach(it => { if ((FOODS[it.f].g === "otro" && FOODS[it.f].k > 30) || FOODS[it.f].g === "veg") it.g = roundQty(it.f, it.g * r0); }));
  const grp = {prot:zero(), carb:zero(), fat:zero()}; let fixed = zero();
  meals.forEach(m => m.items.forEach(it => {
    const g = FOODS[it.f].g, v = mac(it.f, it.g);
    if (grp[g]) grp[g] = add(grp[g], v); else fixed = add(fixed, v);
  }));
  const order = ["prot", "carb", "fat"], keys = ["p", "c", "f"];
  let s = solve3(keys.map(k => order.map(o => grp[o][k])), keys.map(k => target[k] - fixed[k]));
  if (!s || s.some(v => !Number.isFinite(v) || v <= 0)) {
    const r = (target.k - fixed.k) / order.reduce((a, o) => a + grp[o].k, 0); s = [r, r, r];
  }
  const factor = Object.fromEntries(order.map((o, i) => [o, Math.min(3, Math.max(0.2, s[i]))]));
  meals.forEach(m => m.items.forEach(it => { const g = FOODS[it.f].g; if (factor[g]) it.g = roundQty(it.f, it.g * factor[g]); }));
  return meals;
}

/* ---------- equivalencias ---------- */
/** Gramos de `to` que aportan lo mismo del macro clave que `g` gramos de `from`. */
export function equivalentGrams(from, g, to){
  const G = GROUPS[FOODS[from].g]; if (!G || FOODS[to].g !== FOODS[from].g || !FOODS[to][G.key]) return null;
  return roundQty(to, FOODS[from][G.key] * g / FOODS[to][G.key]);
}
/** Reemplazos del mismo grupo: primero los parecidos (mismo subgrupo), los dulces solo por otros dulces. */
export function equivalents(f, g){
  const F = FOODS[f]; if (!GROUPS[F.g]) return [];
  return Object.keys(FOODS)
    .filter(id => id !== f && FOODS[id].g === F.g && FOODS[id][GROUPS[F.g].key] > 0 && (FOODS[id].sg !== "dulce" || F.sg === "dulce"))
    .map(id => { const g2 = equivalentGrams(f, g, id); return {f:id, g:g2, m:mac(id, g2), same:FOODS[id].sg === F.sg}; })
    .sort((a, b) => (b.same - a.same) || (a.m.k - b.m.k));
}

/* ---------- horarios ---------- */
const MEAL_WORDS = /almuerzo|merienda|cena|comida|desayuno|cierre|descanso|libre|social|salida|amigos|mañana|rutina/i;
/** Bloques de ejercicio: los de la categoría elegida o los que se llaman como un entrenamiento. */
export const isWorkout = (x, gymCat) => (!!gymCat && x.cat === gymCat) || /gimnasio|gym|entren/i.test(x.title || "");

/**
 * Hora (en minutos) de cada comida según los bloques de ese día: desayuno al empezar, almuerzo en el
 * bloque de almuerzo, pre y post alrededor del entrenamiento, y antes de dormir en el cierre del día.
 */
export function mealTimes({blocks, gymCat, type, matchTime = "17:00", overrides = {}, weekday}){
  const T = {}, bl = blocks || [];
  const wake = bl.length ? toMin(bl[0].s) : 510;
  const alm = bl.find(x => /almuerzo/i.test(x.title || "")), almT = alm ? toMin(alm.s) : 780;
  const end = bl.find(x => /cierre|dormir/i.test(x.title || "")), sleepT = end ? toMin(end.s) : 1410;
  const busy = t => bl.find(x => !isWorkout(x, gymCat) && !MEAL_WORDS.test(x.title || "") && toMin(x.s) <= t && toMin(x.e) > t);
  const avoid = t => { const x = busy(t); if (!x) return t; return toMin(x.e) + 15 <= sleepT - 60 ? toMin(x.e) + 15 : toMin(x.s) - 30; };
  T.desayuno = wake + 15; T.noche = sleepT;
  if (type === "match") {
    const M = toMin(matchTime || "17:00");
    Object.assign(T, {almPartido:Math.max(T.desayuno + 180, M - 240), prePartido:M - 75, durante:M, postPartido:M + 180, noche:Math.max(sleepT, M + 300)});
  } else {
    Object.assign(T, {almuerzo:almT, merienda:avoid(1050), cena:avoid(1260)});
    const g = bl.find(x => isWorkout(x, gymCat));
    if (g) {
      const gs = toMin(g.s), ge = toMin(g.e);
      T.pre = Math.min(gs - 30, Math.max(gs - 75, almT + 90));
      T.mpre = Math.min(gs - 45, Math.max(gs - 105, almT + 120));
      // Si justo después hay algo corto (una clase de 1 h), se come al terminar; si es largo, antes.
      const nx = bl.find(x => !isWorkout(x, gymCat) && !MEAL_WORDS.test(x.title || "") && toMin(x.s) >= ge && toMin(x.s) <= ge + 90);
      T.post = nx && toMin(nx.e) - toMin(nx.s) <= 90 ? toMin(nx.e) + 15 : ge + 20;
    } else { T.pre = T.mpre = 1020; T.post = 1260; }
  }
  Object.keys(T).forEach(r => { const o = overrides[timeKey(weekday, type, r)]; if (o) T[r] = toMin(o); });
  return T;
}
export const timeKey = (weekday, type, r) => `${weekday}_${type}_${r}`;

/* ---------- plan del día ---------- */
/**
 * @param {object} o
 * @param {string} o.iso fecha
 * @param {object} o.day registro del día (o {})
 * @param {object} o.settings ajustes de nutrición
 * @param {Array} o.blocks bloques de ese día de la semana
 * @param {number[]} o.gymDays días de la semana con entrenamiento (para alternar menús)
 * @param {number} [o.weight] peso actual (promedio de la balanza); si no, el del perfil
 */
export function buildPlan({iso, day = {}, settings, blocks = [], gymDays = [], weight}){
  const wd = weekdayOf(iso);
  const auto = blocks.some(x => isWorkout(x, settings.gymCat)) ? "gym" : "rest";
  const type = DAY_TYPES[day.t] ? day.t : auto;
  let variant = day.v === "A" || day.v === "B" ? day.v : settings.variant === "A" || settings.variant === "B" ? settings.variant : null;
  if (!variant) { const i = gymDays.indexOf(wd); variant = (i >= 0 ? i : isoDate(iso).getDate()) % 2 ? "B" : "A"; }
  const key = type === "gym" ? (variant === "B" ? "gymB" : "gymA") : type;
  const w = weight || settings.profile?.w;
  const target = dayTargets({profile:settings.profile, weight:w, strategy:settings.strategy, type, adjust:settings.adjust || 0});
  const meals = scaleMenu(key, target);
  const sw = day.sw || {};
  meals.forEach(m => m.items.forEach(it => {
    const to = sw[m.r + "_" + it.base];
    const g2 = to && FOODS[to] ? equivalentGrams(it.f, it.g, to) : null;
    if (g2) { it.from = {f:it.f, g:it.g}; it.f = to; it.g = g2; it.x = ""; }
  }));
  const times = mealTimes({blocks, gymCat:settings.gymCat, type, matchTime:day.mt || settings.matchTime, overrides:settings.times || {}, weekday:wd});
  meals.forEach(m => {
    Object.assign(m, ROLES[m.r]);
    m.t = times[m.r] ?? 720;
    m.custom = !!(settings.times || {})[timeKey(wd, type, m.r)];
    m.items.forEach(it => { it.m = mac(it.f, it.g); });
    m.tot = m.items.reduce((a, it) => add(a, it.m), zero());
    m.done = !!day.done?.[m.r];
  });
  meals.sort((a, b) => a.t - b.t);
  const extras = Array.isArray(day.ex) ? day.ex : [];
  const exTot = extras.reduce((a, e) => add(a, {k:+e.k || 0, p:+e.p || 0, c:+e.c || 0, f:+e.f || 0}), zero());
  return {iso, type, auto, key, variant, label:MENUS[key].label, meals, extras, target,
    planned:meals.reduce((a, m) => add(a, m.tot), zero()),
    eaten:meals.filter(m => m.done).reduce((a, m) => add(a, m.tot), exTot)};
}
/** La comida que toca: la primera pendiente que no pasó hace más de 1 h (o la última pendiente). */
export function nextMeal(plan, nowMin, isToday){
  const pend = plan.meals.filter(m => !m.done);
  if (!pend.length) return null;
  if (!isToday) return pend[0];
  return pend.find(m => m.t + 60 >= nowMin) || pend[pend.length - 1];
}
export const proteinOk = plan => !!plan.target && plan.eaten.p >= plan.target.p - 10;

/* ---------- peso, cintura y ajustes ---------- */
/** days: [{date, w}] → puntos ordenados por fecha. */
export const weightPoints = days => days.filter(d => +d.w > 0).map(d => ({iso:d.date, w:+d.w})).sort((a, b) => a.iso < b.iso ? -1 : 1);
/** Promedio de los últimos 7 días hasta `iso` (con al menos 3 pesajes). */
export function avg7(pts, iso){
  const t = isoDate(iso).getTime();
  const win = pts.filter(p => { const x = isoDate(p.iso).getTime(); return x <= t && x > t - 7 * DAY_MS; });
  return win.length >= 3 ? win.reduce((a, p) => a + p.w, 0) / win.length : null;
}
export const weekIndex = k => { const [y, w] = k.split("-S").map(Number); return y * 53 + w; };

/**
 * Promedios por semana. days: registros de día ({date, w, ...}); weeks: registros de semana ({week, waist, ph}).
 * planOf(date) devuelve el plan del día para medir comidas cumplidas y proteína.
 */
export function weeklySummary(days, weeks, planOf){
  const by = new Map();
  const get = k => by.get(k) || by.set(k, {week:k, ws:[], logged:0, meals:0, done:0, prot:0, intake:[]}).get(k);
  days.forEach(d => {
    const s = get(weekOfIso(d.date));
    if (+d.w > 0) s.ws.push(+d.w);
    const p = planOf(d.date), dn = p.meals.filter(m => m.done).length;
    if (dn || (d.ex && d.ex.length)) {
      s.logged++; s.meals += p.meals.length; s.done += dn;
      if (proteinOk(p)) s.prot++;
      if (dn >= p.meals.length - 1) s.intake.push(p.eaten.k);
    }
  });
  weeks.forEach(w => { const s = get(w.week); s.waist = +w.waist || null; s.photos = !!w.ph; });
  return [...by.values()].map(s => ({...s, n:s.ws.length, avg:s.ws.length ? s.ws.reduce((a, b) => a + b, 0) / s.ws.length : null,
    adherence:s.meals ? s.done / s.meals : null})).sort((a, b) => a.week < b.week ? -1 : 1);
}

/**
 * Qué ajustar según la estrategia y la tendencia (Helms 2014 y 2023, Iraki 2019).
 * plannedAvg: calorías promedio del plan, para estimar el mantenimiento si no hay registros completos.
 * Devuelve {tone:"good"|"warn"|"info", title, text, delta (kcal a sumar o restar), maint?}.
 */
export function advice({strategy, weekly, plannedAvg}){
  const wa = weekly.filter(w => w.n >= 3);
  if (wa.length < 2) return {tone:"info", title:"Todavía faltan datos", delta:0,
    text:`Necesitas 2 semanas con al menos 3 pesajes cada una (tienes ${wa.length}). Pésate cada mañana en ayunas.`};
  const last = wa[wa.length - 1], ref = wa.length >= 3 ? wa[wa.length - 3] : wa[wa.length - 2];
  const rate = (last.avg - ref.avg) / Math.max(1, weekIndex(last.week) - weekIndex(ref.week)), pct = rate / last.avg * 100;
  const waists = weekly.filter(w => w.waist), wLast = waists[waists.length - 1];
  const wOld = wLast ? waists.filter(w => weekIndex(wLast.week) - weekIndex(w.week) >= 4).pop() : null;
  const waistDelta = wLast && wOld ? wLast.waist - wOld.waist : null;
  const r = `${rate >= 0 ? "+" : "−"}${nf(Math.abs(rate), 2)} kg por semana (${pct >= 0 ? "+" : "−"}${nf(Math.abs(pct), 2)} %)`;
  let out;
  if (strategy === "volumen") {
    const gained = wLast?.avg && wOld?.avg ? wLast.avg - wOld.avg : null;
    if (pct > 0.45) out = {tone:"warn", title:"Subes más rápido de lo que conviene", text:`Vas a ${r}. Por encima de 0,45 % por semana se suma sobre todo grasa. Baja 150 kcal.`, delta:-150};
    else if (pct < 0.12) out = {tone:"warn", title:"Casi no estás subiendo", text:`Vas a ${r}. Para un volumen limpio apunta a 0,25-0,35 % por semana. Suma 150 kcal.`, delta:150};
    else if (waistDelta !== null && gained > 0 && waistDelta / gained > 1) out = {tone:"warn", title:"La cintura crece más que el peso", text:`La cintura subió ${nf(waistDelta, 1)} cm en ese período. Baja 150 kcal o haz una definición corta de 4 a 6 semanas.`, delta:-150};
    else out = {tone:"good", title:"Vas bien, sigue igual", text:`Vas a ${r}, dentro del rango.`, delta:0};
  } else if (strategy === "definicion") {
    if (pct < -1) out = {tone:"warn", title:"Bajas demasiado rápido", text:`Vas a ${r}. Más del 1 % por semana arriesga músculo. Suma 150 kcal.`, delta:150};
    else if (pct > -0.4) out = {tone:"warn", title:"Bajas muy lento", text:`Vas a ${r}. Apunta a −0,5 a −1 % por semana: baja 150 kcal o suma 2.000 pasos por día.`, delta:-150};
    else out = {tone:"good", title:"Vas bien, sigue igual", text:`Vas a ${r}, dentro del rango.`, delta:0};
  } else {
    if (pct < -0.35) out = {tone:"warn", title:"Estás bajando de peso", text:`Vas a ${r}. En recomposición el peso tiene que quedar estable; si baja rápido se pierde fuerza. Suma 150 kcal.`, delta:150};
    else if (pct > 0.3) out = {tone:"warn", title:"Estás subiendo de peso", text:`Vas a ${r}. En recomposición el peso debería quedar estable. Baja 150 kcal.`, delta:-150};
    else if (waistDelta !== null && waistDelta >= 0) out = {tone:"warn", title:"La cintura no baja", text:`Pasaron más de 4 semanas y la cintura no bajó. Baja 150 kcal.`, delta:-150};
    else out = {tone:"good", title:"Vas bien, sigue igual", text:`Peso estable: ${r}${waistDelta !== null ? ` y la cintura bajó ${nf(-waistDelta, 1)} cm` : ""}. Fíjate que tus cargas sigan subiendo.`, delta:0};
  }
  // Mantenimiento real: lo que comiste menos el cambio de peso (≈ 7.700 kcal por kg).
  const logged = wa.slice(-2).flatMap(w => w.intake || []);
  const intake = logged.length >= 5 ? logged.reduce((a, b) => a + b, 0) / logged.length : plannedAvg;
  if (intake) out.maint = Math.round((intake - rate * 7700 / 7) / 50) * 50;
  out.fromLogs = logged.length >= 5; out.rate = rate;
  return out;
}
