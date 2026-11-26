// Nutrición: acceso directo bajo «Ahora» y la sección completa (plan del día, hábitos, progreso,
// estrategia, equivalencias). Dibuja desde el estado y escribe solo a través de acciones.
import { FOODS, GROUPS, DAY_TYPES, STRATEGIES, ACTIVITY, DAY_KCAL } from "../data/nutrition.js";
import {
  buildPlan, nextMeal, proteinOk, qtyText, qtyNote, mac, nf, clockText, shiftIso, weekdayOf, weekOfIso, isoDate,
  bmr, maintenance, dayTargets, profileComplete, equivalents, weightPoints, avg7, weeklySummary, advice, timeKey, isWorkout
} from "../domain/nutrition.js";
import { DAYS } from "../data/categories.js";
import { isoLocal, nowInfo, DAY_MS } from "../core/time.js";
import { esc } from "../core/utils.js";
import { $ } from "./dom.js";

const WORKOUT_NAME = /gim|gym|ejerc|entren|deport|fuerza/i;

export function createNutrition(ctx){
  const {sel, act} = ctx;
  const card = $("nutriCard"), section = $("nutricion");
  let viewIso = null, pending = false, swapCtx = null, timeCtx = null;

  /* ---------- lecturas ---------- */
  const today = () => isoLocal(nowInfo().d);
  const isoView = () => viewIso || today();
  const settings = () => {
    const s = sel.nutrition();
    const gymCat = s.gymCat || sel.categories().find(c => WORKOUT_NAME.test(c.name))?.id || "";
    return {...s, gymCat};
  };
  const points = () => weightPoints(sel.nutritionDays());
  const currentWeight = () => { const p = points(); if (!p.length) return null; return avg7(p, p[p.length - 1].iso) || p[p.length - 1].w; };
  const gymDays = s => [0,1,2,3,4,5,6].filter(d => sel.blocksOf(d).some(x => isWorkout(x, s.gymCat)));
  function planFor(iso){
    const s = settings();
    return buildPlan({iso, day:sel.nutritionDay(iso) || {}, settings:s, blocks:sel.blocksOf(weekdayOf(iso)), gymDays:gymDays(s), weight:currentWeight()});
  }
  const dateText = iso => { const d = isoDate(iso); return `${DAYS[weekdayOf(iso)]} ${d.getDate()}/${d.getMonth()+1}`; };
  const itemName = it => it.x || FOODS[it.f].n;
  const itemsLine = m => m.items.map(it => `${itemName(it)} ${qtyText(it.f, it.g)}`).join(" · ");
  const focusInside = () => { const a = document.activeElement; return !!(a && section.contains(a) && a.matches("input,select,textarea")); };
  const dialogOpen = () => ["nSwap","nTime","nExtra"].some(id => $(id).open);

  /* ---------- piezas comunes ---------- */
  function meter(label, eaten, target, unit, color){
    const pct = target > 0 ? Math.min(eaten / target, 1) * 100 : 0, diff = Math.round(target - eaten);
    const sub = diff > 0 ? `Faltan ${nf(diff)} ${unit}` : diff < 0 ? `${nf(-diff)} ${unit} sobre el objetivo` : "Objetivo cumplido";
    return `<div class="meter" style="--mc:${color}"><div class="mt"><b>${label}</b><span class="mv"><strong>${nf(eaten)}</strong> / ${nf(target)} ${unit}</span></div>
      <div class="mtrack" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${Math.round(target)}" aria-valuenow="${Math.round(eaten)}"><span style="width:${pct}%"></span></div><div class="ms">${sub}</div></div>`;
  }
  const macros = m => `<span class="mchip" style="--mc:var(--m-p)"><i></i>P ${nf(m.p)} g</span><span class="mchip" style="--mc:var(--m-c)"><i></i>C ${nf(m.c)} g</span><span class="mchip" style="--mc:var(--m-f)"><i></i>G ${nf(m.f)} g</span>`;

  /* ---------- acceso directo bajo «Ahora» ---------- */
  function renderCard(){
    const s = settings();
    if (!profileComplete(s.profile)) {
      card.innerHTML = `<div class="nc-main"><div class="eyebrow">Nutrición</div><h3>Arma tu plan de comidas</h3>
        <p class="nc-items">Carga tu peso, altura, edad y actividad: la app calcula tus calorías, tus macros y qué comer en cada comida del día.</p>
        <div class="nc-acts"><button class="btn primary" type="button" data-n="open">Completar mi perfil</button></div></div>`;
      return;
    }
    const plan = planFor(today()), nx = nextMeal(plan, nowInfo().min, true), done = plan.meals.filter(m => m.done).length;
    const late = nx && nx.t + 60 < nowInfo().min;
    card.innerHTML = `<div class="nc-main">
        <div class="eyebrow">Nutrición de hoy · ${DAY_TYPES[plan.type]}${plan.type === "gym" ? " · " + plan.label : ""}</div>
        ${nx ? `<h3>${esc(nx.name)} <span class="nc-time">${late ? "pendiente desde las " : "a las "}${clockText(nx.t)}</span></h3>
          <p class="nc-items">${esc(itemsLine(nx))}</p>
          <div class="nc-acts"><button class="btn primary" type="button" data-n="mealdone" data-r="${nx.r}" data-iso="${plan.iso}">Marcar como hecha</button>
          <button class="btn" type="button" data-n="open">Ver plan del día</button></div>`
        : `<h3>Comidas del día completas</h3><p class="nc-items">Hiciste las ${plan.meals.length} comidas del plan. Revisa los hábitos del día.</p>
          <div class="nc-acts"><button class="btn" type="button" data-n="open">Ver nutrición</button></div>`}
      </div>
      <div class="nc-side">${meter("Proteína", plan.eaten.p, plan.target.p, "g", "var(--m-p)")}${meter("Calorías", plan.eaten.k, plan.target.k, "kcal", "var(--ink)")}
        <p class="nc-count">${done} de ${plan.meals.length} comidas hechas</p></div>`;
  }

  /* ---------- perfil ---------- */
  function profileFields(prefix){
    const s = settings(), p = s.profile || {};
    const cats = sel.categories();
    return `<div class="pfields">
      <label>Peso<span class="hin"><input data-pf="w" id="${prefix}W" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="${p.w || ""}" placeholder="kg"><span>kg</span></span></label>
      <label>Altura<span class="hin"><input data-pf="h" id="${prefix}H" type="number" inputmode="numeric" step="1" min="120" max="230" value="${p.h || ""}" placeholder="cm"><span>cm</span></span></label>
      <label>Edad<span class="hin"><input data-pf="a" id="${prefix}A" type="number" inputmode="numeric" step="1" min="14" max="100" value="${p.a || ""}" placeholder="años"><span>años</span></span></label>
      <label>Sexo<select data-pf="sex" id="${prefix}S"><option value=""${p.sex ? "" : " selected"}>Elegir</option><option value="h"${p.sex === "h" ? " selected" : ""}>Hombre</option><option value="m"${p.sex === "m" ? " selected" : ""}>Mujer</option></select></label>
      <label class="wide">Actividad<select data-pf="act" id="${prefix}Act">${p.act ? "" : `<option value="" selected>Elegir</option>`}${ACTIVITY.map(a => `<option value="${a.f}"${+p.act === a.f ? " selected" : ""}>${a.name}: ${a.desc}</option>`).join("")}</select></label>
      <label class="wide">Categoría de tus entrenamientos<select data-pf="gymCat" id="${prefix}Gym"><option value="">Ninguna (detectar por el nombre del bloque)</option>${cats.map(c => `<option value="${esc(c.id)}"${c.id === s.gymCat ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
    </div>`;
  }
  function renderSetup(){
    $("nSetup").innerHTML = `<div class="ncard setup"><div><div class="eyebrow">Paso 1</div><h3>Tu perfil</h3>
      <p class="hs">Con estos datos se calculan tus calorías y tus macros. Quedan guardados en tus datos, no en la app.</p></div>${profileFields("su")}</div>`;
  }

  /* ---------- plan del día ---------- */
  function renderHero(plan){
    const iso = plan.iso, t = today(), nx = nextMeal(plan, nowInfo().min, iso === t), day = sel.nutritionDay(iso) || {};
    const rel = iso === t ? "Hoy" : iso === shiftIso(t, -1) ? "Ayer" : iso === shiftIso(t, 1) ? "Mañana" : "";
    const late = nx && iso === t && nx.t + 60 < nowInfo().min, s = settings();
    $("nHero").innerHTML = `<div class="nh-left">
        <div class="ndate"><button class="iconbtn" type="button" data-n="day" data-d="-1" aria-label="Día anterior">‹</button><b>${rel ? rel + ", " : ""}${dateText(iso)}</b>
          <button class="iconbtn" type="button" data-n="day" data-d="1" aria-label="Día siguiente">›</button>${iso !== t ? `<button class="link-btn" type="button" data-n="day" data-d="0">Volver a hoy</button>` : ""}</div>
        <div class="seg" role="group" aria-label="Tipo de día">${Object.entries(DAY_TYPES).map(([k, v]) => `<button type="button" data-n="type" data-t="${k}" aria-pressed="${plan.type === k}">${v}</button>`).join("")}</div>
        ${plan.type === "match" ? `<label class="inl">Hora del partido <input id="nMatch" type="time" step="300" value="${esc(day.mt || s.matchTime || "17:00")}"></label>` : ""}
        <p class="nh-sub">${STRATEGIES[s.strategy].name}${plan.type === "gym" ? ` · ${plan.label}` : ""} · objetivo ${nf(plan.target.k)} kcal y ${nf(plan.target.p)} g de proteína${s.adjust ? ` (ajuste ${s.adjust > 0 ? "+" : "−"}${Math.abs(s.adjust)} kcal)` : ""}</p>
        <div class="nnext">${nx ? `<div class="eyebrow">${late ? "Pendiente" : iso === t ? "Próxima comida" : "Primera comida pendiente"}</div>
            <h3>${esc(nx.name)} · ${clockText(nx.t)}</h3><p>${esc(itemsLine(nx))}</p>
            <div class="nc-acts"><button class="btn primary" type="button" data-n="mealdone" data-r="${nx.r}" data-iso="${iso}">Marcar como hecha</button><span class="hs">${nf(nx.tot.k)} kcal · ${nf(nx.tot.p)} g de proteína</span></div>`
          : `<div class="eyebrow">Comidas</div><h3>Plan del día completo</h3><p>Registraste las ${plan.meals.length} comidas. Revisa los hábitos de abajo.</p>`}</div>
      </div>
      <div class="meters">${meter("Calorías", plan.eaten.k, plan.target.k, "kcal", "var(--ink)")}${meter("Proteína", plan.eaten.p, plan.target.p, "g", "var(--m-p)")}${meter("Carbohidratos", plan.eaten.c, plan.target.c, "g", "var(--m-c)")}${meter("Grasas", plan.eaten.f, plan.target.f, "g", "var(--m-f)")}</div>`;
  }

  function renderMeals(plan){
    const iso = plan.iso, nx = nextMeal(plan, nowInfo().min, iso === today()), s = settings();
    $("nMenuSwitch").innerHTML = plan.type === "gym" ? `<div class="seg small" role="group" aria-label="Menú del día">
      <button type="button" data-n="variant" data-v="A" aria-pressed="${plan.key === "gymA"}">Menú A</button><button type="button" data-n="variant" data-v="B" aria-pressed="${plan.key === "gymB"}">Menú B</button></div>` : "";
    $("nMealsSub").textContent = `Plan de ${STRATEGIES[s.strategy].name.toLowerCase()}: ${nf(plan.planned.k)} kcal, ${nf(plan.planned.p)} g de proteína, ${nf(plan.planned.c)} g de carbohidratos y ${nf(plan.planned.f)} g de grasa. Toca un alimento para cambiarlo por uno equivalente.`;
    $("nMeals").innerHTML = plan.meals.map(m => `<article class="meal${m.done ? " done" : ""}${nx && nx.r === m.r && iso === today() ? " next" : ""}">
      <div class="mtime"><b>${clockText(m.t)}</b><button class="link-btn" type="button" data-n="time" data-r="${m.r}">${m.custom ? "Hora propia" : "Cambiar hora"}</button></div>
      <div class="mbody"><div class="mhead"><h4>${esc(m.name)}</h4><span class="mk">${nf(m.tot.k)} kcal</span></div><p class="mwhy">${esc(m.why)}</p>
        <ul class="mitems">${m.items.map(it => { const note = qtyNote(it.f, it.g); return `<li><button class="mit" type="button" data-n="item" data-r="${m.r}" data-b="${it.base}">
          <span class="in">${esc(itemName(it))}${it.from ? `<em class="chg">cambiado</em>` : ""}${note ? `<span class="isub">${note}</span>` : ""}</span><span class="iq">${qtyText(it.f, it.g)}</span></button></li>`; }).join("")}</ul>
        <div class="mmac">${macros(m.tot)}</div>${m.tip ? `<p class="mtip">${esc(m.tip)}</p>` : ""}</div>
      <button class="mchk" type="button" data-n="meal" data-r="${m.r}" aria-pressed="${m.done}" aria-label="${m.done ? "Desmarcar" : "Marcar como hecha"}: ${esc(m.name)}">✓</button>
    </article>`).join("");
    const ex = plan.extras;
    $("nExtras").innerHTML = `<div class="ex-head"><div><b>Fuera del plan</b><span class="hs"> Lo que comas además del plan, para que el total sea real.</span></div>
      <button class="add-btn" type="button" data-n="extra">+ Agregar</button></div>
      ${ex.length ? `<ul class="exlist">${ex.map((e, i) => `<li><span>${esc(e.n)}</span><span class="hs">${nf(e.k)} kcal · P ${nf(e.p)} g</span><button class="link-btn" type="button" data-n="exdel" data-i="${i}">Quitar</button></li>`).join("")}</ul>` : ""}`;
  }

  function renderHabits(plan){
    const iso = plan.iso, d = sel.nutritionDay(iso) || {}, w = sel.nutritionWeek(weekOfIso(iso)) || {}, s = settings();
    const water = +d.wa || 0, goal = (+s.water || 3) + (plan.type === "match" ? 1 : 0), done = plan.meals.filter(m => m.done).length;
    const pts = points(), a7 = pts.length ? avg7(pts, iso) : null;
    const cardH = (ok, title, body, sub = "") => `<div class="habit${ok ? " ok" : ""}"><div class="hl">${title}${ok ? `<span class="hstate">Cumplido</span>` : ""}</div>${body}${sub ? `<div class="hs">${sub}</div>` : ""}</div>`;
    const tog = (k, on, txt) => `<button class="htog" type="button" data-n="tog" data-k="${k}" aria-pressed="${on}">${on ? "✓ " : ""}${txt}</button>`;
    $("nHabits").innerHTML = [
      cardH(proteinOk(plan), "Proteína", `<div class="hv">${nf(plan.eaten.p)} <small>/ ${nf(plan.target.p)} g</small></div>`, "Se suma sola con las comidas que marcas."),
      cardH(done === plan.meals.length, "Comidas del plan", `<div class="hv">${done} <small>de ${plan.meals.length}</small></div>`, "Con el 80-90 % de las comidas cumplidas alcanza."),
      cardH(!!d.cr, "Creatina", tog("cr", !!d.cr, d.cr ? "Tomada" : "Marcar como tomada"), "3-5 g todos los días, a cualquier hora."),
      cardH(water >= goal, "Agua", `<div class="hstep"><button type="button" data-n="water" data-d="-0.5" aria-label="Restar medio litro">−</button><span class="hv">${nf(water, 1)} <small>/ ${nf(goal, 1)} L</small></span><button type="button" data-n="water" data-d="0.5" aria-label="Sumar medio litro">+</button></div>`, plan.type === "match" ? "Día de partido: 1 L más." : "Cada toque suma medio litro."),
      cardH(!!d.sl, "Sueño", tog("sl", !!d.sl, "Dormí 7 h o más"), "Dormir poco en déficit hace perder músculo en vez de grasa."),
      cardH(+d.w > 0, "Peso en ayunas", `<label class="hin"><input id="nWeight" type="number" inputmode="decimal" step="0.1" min="30" max="250" placeholder="kg" value="${+d.w > 0 ? d.w : ""}" aria-label="Peso en ayunas"><span>kg</span></label>`, a7 ? `Promedio de 7 días: ${nf(a7, 1)} kg` : "Al levantarte, después del baño y antes de comer."),
      cardH(!!w.waist, "Cintura de la semana", `<label class="hin"><input id="nWaist" type="number" inputmode="decimal" step="0.5" min="40" max="180" placeholder="cm" value="${w.waist || ""}" aria-label="Cintura"><span>cm</span></label>`, "A la altura del ombligo, relajado, al final de una exhalación."),
      cardH(!!w.ph, "Fotos de progreso", tog("ph", !!w.ph, w.ph ? "Sacadas esta semana" : "Marcar fotos sacadas"), "Cada 2 a 4 semanas, misma luz, hora y pose.")
    ].join("");
    const streak = test => { let n = 0; for (let i = 0; i < 366; i++) { const x = shiftIso(today(), -i); if (test(x)) n++; else if (i) break; } return n; };
    const ps = streak(x => sel.nutritionDay(x) && proteinOk(planFor(x))), cs = streak(x => !!sel.nutritionDay(x)?.cr);
    $("nStreaks").innerHTML = `<span><b>${ps}</b> ${ps === 1 ? "día seguido" : "días seguidos"} cumpliendo la proteína</span><span><b>${cs}</b> ${cs === 1 ? "día seguido" : "días seguidos"} con creatina</span><span class="hs">Si fallas un día, que no sean dos seguidos.</span>`;
  }

  /* ---------- progreso ---------- */
  const W = 600, L = 44, R = 64, T = 16, B = 30, SPAN = 55;
  function chart(){
    const pts = points(), end = today(), start = shiftIso(end, -SPAN), win = pts.filter(p => p.iso >= start && p.iso <= end);
    if (win.length < 2) return `<div class="empty">El gráfico aparece con tu segundo pesaje. Pésate cada mañana en ayunas y cárgalo en Hábitos de hoy.</div>`;
    const H = 230, t0 = isoDate(start).getTime(), X = iso => L + (isoDate(iso).getTime() - t0) / (SPAN * DAY_MS) * (W - L - R);
    const avgs = win.map(p => ({iso:p.iso, a:avg7(pts, p.iso)})).filter(p => p.a), vals = [...win.map(p => p.w), ...avgs.map(p => p.a)];
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const step = hi - lo > 6 ? 2 : hi - lo > 2.5 ? 1 : 0.5;
    lo = Math.floor((lo - 0.2) / step) * step; hi = Math.ceil((hi + 0.2) / step) * step; if (hi === lo) hi = lo + step;
    const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Peso diario y promedio de 7 días, últimas 8 semanas">`;
    for (let v = lo; v <= hi + 1e-9; v += step) s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${nf(v, step < 1 ? 1 : 0)}</text>`;
    for (let i = SPAN; i >= 0; i -= 14) { const iso = shiftIso(start, i), d = isoDate(iso); s += `<text x="${X(iso)}" y="${H - 8}" text-anchor="middle">${d.getDate()}/${d.getMonth() + 1}</text>`; }
    s += win.map(p => `<circle cx="${X(p.iso)}" cy="${Y(p.w)}" r="4" class="wd"/>`).join("");
    if (avgs.length >= 2) s += `<path d="${avgs.map((p, i) => `${i ? "L" : "M"}${X(p.iso).toFixed(1)} ${Y(p.a).toFixed(1)}`).join(" ")}" class="wl"/>`;
    if (avgs.length) { const e = avgs[avgs.length - 1]; s += `<circle cx="${X(e.iso)}" cy="${Y(e.a)}" r="5.5" class="we"/><text x="${X(e.iso) + 10}" y="${Y(e.a) + 4}" class="val">${nf(e.a, 1)} kg</text>`; }
    s += `<line id="wGuide" x1="0" x2="0" y1="${T}" y2="${H - B}" class="wg" visibility="hidden"/><rect id="wHit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/></svg>`;
    return `<p class="wread" id="wRead" aria-live="polite">Pasa el dedo o el mouse por el gráfico para ver cada día.</p><div class="sv">${s}</div>
      <div class="legend-mini"><span><i style="background:var(--ink-2)"></i>Pesaje diario</span><span><i style="background:var(--accent)"></i>Promedio de 7 días</span></div>`;
  }
  function wireChart(){
    const hit = $("wHit"); if (!hit) return;
    const svg = hit.ownerSVGElement, guide = $("wGuide"), read = $("wRead"), pts = points(), end = today(), start = shiftIso(end, -SPAN);
    const win = pts.filter(p => p.iso >= start && p.iso <= end), t0 = isoDate(start).getTime();
    const X = iso => L + (isoDate(iso).getTime() - t0) / (SPAN * DAY_MS) * (W - L - R);
    const move = ev => {
      const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W;
      let best = win[0]; win.forEach(p => { if (Math.abs(X(p.iso) - x) < Math.abs(X(best.iso) - x)) best = p; });
      const a = avg7(pts, best.iso);
      guide.setAttribute("x1", X(best.iso)); guide.setAttribute("x2", X(best.iso)); guide.setAttribute("visibility", "visible");
      read.innerHTML = `<b>${dateText(best.iso)}</b>: ${nf(best.w, 1)} kg${a ? ` · promedio de 7 días ${nf(a, 1)} kg` : ""}`;
    };
    hit.addEventListener("pointermove", move); hit.addEventListener("pointerdown", move);
    hit.addEventListener("pointerleave", () => guide.setAttribute("visibility", "hidden"));
  }
  function plannedAvg(){
    const s = settings(), w = currentWeight() || s.profile?.w, gd = gymDays(s).length, rest = Math.max(0, 6 - gd);
    const t = type => dayTargets({profile:s.profile, weight:w, strategy:s.strategy, type, adjust:s.adjust || 0})?.k || 0;
    return (gd * t("gym") + t("match") + rest * t("rest")) / (gd + 1 + rest);
  }
  function renderProgress(){
    const s = settings(), weekly = weeklySummary(sel.nutritionDays(), sel.nutritionWeeks(), planFor);
    const adv = advice({strategy:s.strategy, weekly, plannedAvg:plannedAvg()});
    const rows = weekly.filter(w => w.n || w.waist || w.logged).slice(-8).reverse().map((w, i, arr) => {
      const prev = arr[i + 1], ch = prev?.avg && w.avg ? w.avg - prev.avg : null, cur = w.week === weekOfIso(today());
      return `<tr><td>${cur ? "Esta semana" : "Semana " + w.week.split("-S")[1] + " de " + w.week.split("-")[0]}</td>
        <td class="n">${w.avg ? nf(w.avg, 1) + " kg" : "—"} <span class="hs">(${w.n})</span></td>
        <td class="n">${ch === null ? "—" : (ch > 0 ? "+" : ch < 0 ? "−" : "") + nf(Math.abs(ch), 2)}</td>
        <td class="n">${w.waist ? nf(w.waist, 1) + " cm" : "—"}</td>
        <td class="n">${w.adherence === null ? "—" : nf(w.adherence * 100) + " %"}</td>
        <td class="n">${w.logged ? `${w.prot} de ${w.logged}` : "—"}</td></tr>`;
    }).join("");
    const tone = adv.tone === "good" ? "var(--accent)" : adv.tone === "warn" ? "var(--warn)" : "var(--ink-2)";
    $("nProgress").innerHTML = `<div class="pgrid">
        <div class="chart"><h3>Peso en ayunas</h3><p class="cs">Mira la línea del promedio, no el número de cada día: el peso diario sube y baja por agua y sal.</p>${chart()}</div>
        <div class="advice" style="--tone:${tone}"><div class="eyebrow">Qué ajustar · ${STRATEGIES[s.strategy].name}</div><h3>${esc(adv.title)}</h3><p>${esc(adv.text)}</p>
          ${adv.delta ? `<button class="btn primary" type="button" data-n="adj" data-d="${adv.delta}">Aplicar ${adv.delta > 0 ? "+" : "−"}${Math.abs(adv.delta)} kcal</button>` : ""}
          ${adv.maint ? `<div class="maint"><span class="hs">Tu mantenimiento según tus datos</span><b>≈ ${nf(adv.maint)} kcal por día</b><span class="hs">${adv.fromLogs ? "Calculado con lo que registraste y la tendencia del peso." : "Calculado con las calorías del plan y la tendencia del peso. Si marcas todas tus comidas, se calcula con lo que comiste."}</span></div>` : ""}
          <p class="hs">Ajusta como mucho cada 2 semanas. La primera semana no cuenta: la creatina y los cambios de carbohidratos mueven agua.</p></div>
      </div>
      ${rows ? `<div class="tw"><table class="ntable"><thead><tr><th>Semana</th><th class="n">Peso promedio (pesajes)</th><th class="n">Cambio</th><th class="n">Cintura</th><th class="n">Comidas cumplidas</th><th class="n">Días con proteína</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}`;
    wireChart();
  }

  /* ---------- estrategia ---------- */
  function renderStrategy(){
    const s = settings(), p = s.profile, w = currentWeight() || p.w, adj = +s.adjust || 0;
    const base = bmr({...p, w}), est = Math.round(maintenance(p, w) / 50) * 50;
    const pts = sel.nutritionWeeks().filter(x => x.waist), waist = pts.length ? +pts[pts.length - 1].waist : null, ratio = waist ? waist / p.h : null;
    const sugg = ratio === null ? null : ratio < 0.46 ? "volumen" : ratio < 0.5 ? "recomp" : "definicion";
    const t = type => dayTargets({profile:p, weight:w, strategy:s.strategy, type, adjust:adj});
    const row = (lbl, x) => `<tr><td>${lbl}</td><td class="n">${nf(x.k)}</td><td class="n">${nf(x.p)} g <span class="hs">${nf(x.p / w, 1)} g/kg</span></td><td class="n">${nf(x.c)} g <span class="hs">${nf(x.c / w, 1)} g/kg</span></td><td class="n">${nf(x.f)} g <span class="hs">${nf(x.f / w, 1)} g/kg</span></td></tr>`;
    $("nStrategy").innerHTML = `<div class="sgrid">
        <div class="calc"><h3>Tu perfil y tu gasto</h3>${profileFields("st")}
          ${currentWeight() ? `<p class="hs">Para los cálculos se usa tu promedio de 7 días: ${nf(w, 1)} kg.</p>` : ""}
          <table class="ntable slim"><tbody>
            <tr><td>Metabolismo basal (Mifflin-St Jeor)</td><td class="n">${nf(base)} kcal</td></tr>
            <tr><td>× actividad (${nf(p.act, 3).replace(/0+$/, "")})</td><td class="n">≈ ${nf(est)} kcal</td></tr>
            <tr class="tot"><td>Promedio con ${STRATEGIES[s.strategy].name.toLowerCase()}</td><td class="n">${nf(plannedAvg())} kcal</td></tr>
          </tbody></table>
          <p class="hs">El cálculo tiene un error típico de ± 10 %. El dato real sale de tu balanza en 2 o 3 semanas (lo ves en Progreso).</p></div>
        <div class="branches">${Object.entries(STRATEGIES).map(([k, x]) => `<div class="branch${s.strategy === k ? " on" : ""}">
          <div class="eyebrow">Rama ${x.branch}${sugg === k ? " · sugerida por tu cintura" : ""}</div><h3>${x.name}</h3><p class="bwho">${x.who}</p><p>${x.look}</p>
          <ul><li>${x.waist}</li><li>${x.pace}</li></ul><p class="hs">${x.why}</p>
          ${s.strategy === k ? `<span class="hstate on">Tu estrategia actual</span>` : `<button class="btn" type="button" data-n="strategy" data-s="${k}">Usar esta estrategia</button>`}</div>`).join("")}</div>
      </div>
      <p class="hs">${ratio ? `Tu cintura de ${nf(waist, 1)} cm da una relación cintura/altura de ${nf(ratio, 3)}. Los cortes son orientativos: súmale cómo te ves con buena luz.` : "Carga tu cintura en Hábitos de hoy y acá aparece qué rama te corresponde según tu medida."}</p>
      <h3 class="h3s">Tus objetivos diarios</h3>
      <div class="tw"><table class="ntable"><thead><tr><th>Tipo de día</th><th class="n">Calorías</th><th class="n">Proteína</th><th class="n">Carbohidratos</th><th class="n">Grasas</th></tr></thead>
        <tbody>${row("Entrenamiento", t("gym"))}${row("Descanso", t("rest"))}${row("Partido", t("match"))}</tbody></table></div>
      <div class="fine"><div><h3>Ajuste fino</h3><p class="hs">Se suma o se resta en los carbohidratos. 150 kcal son unos 38 g de carbohidratos: 45 g de arroz crudo o 55 g de pan.</p></div>
        <div class="fine-ctl"><button class="btn" type="button" data-n="adj" data-d="-150">−150</button><b>${adj > 0 ? "+" : adj < 0 ? "−" : ""}${nf(Math.abs(adj))} kcal</b><button class="btn" type="button" data-n="adj" data-d="150">+150</button>${adj ? `<button class="link-btn" type="button" data-n="adj0">Quitar ajuste</button>` : ""}</div></div>
      <div class="fine"><div><h3>Preferencias</h3><p class="hs">Menús de los días de entrenamiento, hora habitual del partido y agua por día.</p></div>
        <div class="pin"><div class="seg small" role="group" aria-label="Menú de los días de entrenamiento">
          ${[["alt", "Alternar A y B"], ["A", "Siempre A"], ["B", "Siempre B"]].map(([v, l]) => `<button type="button" data-n="vpref" data-v="${v}" aria-pressed="${s.variant === v}">${l}</button>`).join("")}</div>
          <label>Partido<span class="hin"><input id="nPrefMatch" type="time" step="300" value="${esc(s.matchTime || "17:00")}"></span></label>
          <label>Agua<span class="hin"><input id="nPrefWater" type="number" step="0.5" min="1" max="8" value="${s.water || 3}"><span>L</span></span></label></div></div>`;
  }

  /* ---------- equivalencias ---------- */
  function equivList(f, g, withUse){
    const F = FOODS[f], G = GROUPS[F.g];
    if (!G || !(g > 0)) return `<p class="hs">Este alimento no está en la tabla de equivalencias (leche, condimentos, bebidas y verduras libres).</p>`;
    const base = mac(f, g);
    return `<p class="hs">${qtyText(f, g)} de ${F.n.toLowerCase()} aportan ${nf(base[G.key])} g de ${G.key === "p" ? "proteína" : G.key === "c" ? "carbohidratos" : "grasa"} y ${nf(base.k)} kcal. Lo mismo que:</p>
      <ul class="eqlist">${equivalents(f, g).map(e => { const dk = e.m.k - base.k; return `<li><span class="in">${FOODS[e.f].n}${FOODS[e.f].alt ? ` <span class="hs">${FOODS[e.f].alt}</span>` : ""}<span class="isub">${nf(e.m.k)} kcal (${dk >= 0 ? "+" : "−"}${nf(Math.abs(dk))}) · P ${nf(e.m.p)} · C ${nf(e.m.c)} · G ${nf(e.m.f)}</span></span>
        <span class="iq">${qtyText(e.f, e.g)}</span>${withUse ? `<button class="btn" type="button" data-swap="${e.f}">Usar</button>` : ""}</li>`; }).join("")}</ul>`;
  }
  function renderEquivCalc(){
    const el = $("nEquivCalc");
    if (!el.querySelector("#eqFood")) {
      const opts = Object.entries(GROUPS).map(([gk, G]) => `<optgroup label="${G.name}">${Object.entries(FOODS).filter(([, F]) => F.g === gk).map(([id, F]) => `<option value="${id}"${id === "pollo" ? " selected" : ""}>${F.n}</option>`).join("")}</optgroup>`).join("");
      el.innerHTML = `<div class="eqform"><label>Tengo<select id="eqFood">${opts}</select></label><label>Cantidad<span class="hin"><input id="eqG" type="number" min="1" step="5" value="200"><span>g</span></span></label></div><div id="eqOut"></div>`;
    }
    $("eqOut").innerHTML = equivList($("eqFood").value, +$("eqG").value || 0, false);
  }
  function renderEquivTables(){
    const el = $("nEquivTables"); if (el.dataset.done) return; el.dataset.done = "1";
    el.innerHTML = Object.entries(GROUPS).map(([gk, G]) => {
      const rows = Object.entries(FOODS).filter(([, F]) => F.g === gk && F[G.key] > 0).map(([id, F]) => {
        const g = Math.round(G.portion / F[G.key] * 100 / (F.u ? 1 : 5)) * (F.u ? 1 : 5), m = mac(id, g); return {id, F, g, m};
      }).sort((a, b) => a.m.k - b.m.k);
      return `<div class="eqt"><h3>${G.name} <span class="hs">porción de ${G.label}</span></h3><div class="tw"><table class="ntable"><thead><tr><th>Alimento</th><th class="n">Porción</th><th class="n">kcal</th><th class="n">P</th><th class="n">C</th><th class="n">G</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${r.F.n}${r.F.alt ? ` <span class="hs">${r.F.alt}</span>` : ""}${r.F.st ? ` <span class="hs">(${r.F.st === "seco" ? "en seco" : r.F.st === "escurrido" ? "escurrido" : "crudo"})</span>` : ""}</td><td class="n">${nf(r.g)} ${r.F.ml ? "ml" : "g"}</td><td class="n">${nf(r.m.k)}</td><td class="n">${nf(r.m.p)}</td><td class="n">${nf(r.m.c)}</td><td class="n">${nf(r.m.f)}</td></tr>`).join("")}
      </tbody></table></div></div>`;
    }).join("");
  }
  /** Cantidades del día de partido y de la cafeína según el peso de la persona. */
  function renderGuideNumbers(){
    const p = settings().profile, w = currentWeight() || p?.w;
    section.querySelectorAll("[data-gk]").forEach(el => {
      const [lo, hi] = el.dataset.gk.split("-").map(Number);
      el.textContent = w ? ` (${nf(lo * w)}${hi ? `-${nf(hi * w)}` : ""} ${el.dataset.unit || "g"} para ti)` : "";
    });
  }

  /* ---------- dibujo ---------- */
  function render(){
    renderCard();
    if (focusInside() || dialogOpen()) { pending = true; return; }
    pending = false;
    const complete = profileComplete(settings().profile);
    $("nSetup").hidden = complete; $("nMain").hidden = !complete;
    if (!complete) { renderSetup(); return; }
    const plan = planFor(isoView());
    renderHero(plan); renderMeals(plan); renderHabits(plan); renderProgress(); renderStrategy(); renderEquivCalc(); renderEquivTables(); renderGuideNumbers();
  }

  /* ---------- acciones ---------- */
  const day = (iso, fn) => act.updateNutritionDay(iso, fn);
  function onAction(b){
    const ds = b.dataset, iso = ds.iso || isoView(), s = settings();
    switch (ds.n) {
      case "open": section.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"}); break;
      case "jump": $(ds.to)?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"}); break;
      case "day": viewIso = +ds.d === 0 ? null : shiftIso(isoView(), +ds.d); if (viewIso === today()) viewIso = null; render(); break;
      case "type": day(iso, d => { const plan = planFor(iso); if (ds.t === plan.auto) delete d.t; else d.t = ds.t; }); break;
      case "variant": day(iso, d => { d.v = ds.v; }); break;
      case "meal": day(iso, d => { d.done = d.done || {}; if (d.done[ds.r]) delete d.done[ds.r]; else d.done[ds.r] = true; }); break;
      case "mealdone": day(iso, d => { d.done = {...(d.done || {}), [ds.r]:true}; }); break;
      case "time": openTime(ds.r); break;
      case "item": openSwap(ds.r, ds.b); break;
      case "extra": openExtra(); break;
      case "exdel": day(iso, d => { d.ex = (d.ex || []).filter((_, i) => i !== +ds.i); }); break;
      case "tog":
        if (ds.k === "ph") act.updateNutritionWeek(weekOfIso(iso), w => { w.ph = !w.ph; });
        else day(iso, d => { d[ds.k] = !d[ds.k]; });
        break;
      case "water": day(iso, d => { d.wa = Math.max(0, Math.min(10, (+d.wa || 0) + +ds.d)); }); break;
      case "strategy": act.updateNutrition({strategy:ds.s, adjust:0}); break;
      case "adj": act.updateNutrition({adjust:Math.max(-600, Math.min(600, (+s.adjust || 0) + +ds.d))}); break;
      case "adj0": act.updateNutrition({adjust:0}); break;
      case "vpref": act.updateNutrition({variant:ds.v}); break;
    }
  }
  function onChange(t){
    const iso = isoView(), num = v => parseFloat(String(v).replace(",", "."));
    if (t.dataset.pf) {
      const k = t.dataset.pf, s = sel.nutrition();
      if (k === "gymCat") return act.updateNutrition({gymCat:t.value});
      const v = k === "sex" ? t.value : num(t.value);
      if (k !== "sex" && !(v > 0)) return;
      act.updateNutrition({profile:{...(s.profile || {}), [k]:k === "sex" ? v : v}});
      return;
    }
    if (t.id === "nWeight") { const n = num(t.value); day(iso, d => { if (n >= 30 && n <= 250) d.w = Math.round(n * 10) / 10; else delete d.w; }); }
    else if (t.id === "nWaist") { const n = num(t.value); act.updateNutritionWeek(weekOfIso(iso), w => { if (n >= 40 && n <= 180) w.waist = Math.round(n * 2) / 2; else delete w.waist; }); }
    else if (t.id === "nMatch" && t.value) day(iso, d => { d.mt = t.value; });
    else if (t.id === "nPrefMatch" && t.value) act.updateNutrition({matchTime:t.value});
    else if (t.id === "nPrefWater") { const n = num(t.value); if (n >= 1 && n <= 8) act.updateNutrition({water:n}); }
    else if (t.id === "eqFood" || t.id === "eqG") renderEquivCalc();
  }

  /* ---------- diálogos ---------- */
  function openSwap(r, base){
    const plan = planFor(isoView()), m = plan.meals.find(x => x.r === r), it = m?.items.find(i => i.base === base); if (!it) return;
    swapCtx = {iso:plan.iso, r, base, f:it.from?.f || it.f, g:it.from?.g || it.g};
    $("swTitle").textContent = itemName(it);
    $("swSub").textContent = `${m.name} · ${qtyText(it.f, it.g)} · ${nf(it.m.k)} kcal, P ${nf(it.m.p)} g, C ${nf(it.m.c)} g, G ${nf(it.m.f)} g`;
    $("swBody").innerHTML = equivList(swapCtx.f, swapCtx.g, true);
    $("swUndo").hidden = !it.from;
    $("nSwap").showModal();
  }
  function openTime(r){
    const plan = planFor(isoView()), m = plan.meals.find(x => x.r === r); if (!m) return;
    timeCtx = {key:timeKey(weekdayOf(plan.iso), plan.type, r)};
    $("tmTitle").textContent = m.name;
    $("tmSub").textContent = `Se guarda para los ${DAYS[weekdayOf(plan.iso)].toLowerCase()} de ${DAY_TYPES[plan.type].toLowerCase()}.`;
    $("tmIn").value = clockText(m.t); $("tmReset").hidden = !m.custom;
    $("nTime").showModal();
  }
  function openExtra(){
    const sel2 = $("exFood");
    if (!sel2.options.length) sel2.innerHTML = `<option value="">Otra cosa (escribo los valores)</option>` +
      Object.entries(GROUPS).map(([gk, G]) => `<optgroup label="${G.name}">${Object.entries(FOODS).filter(([, F]) => F.g === gk).map(([id, F]) => `<option value="${id}">${F.n}</option>`).join("")}</optgroup>`).join("") +
      `<optgroup label="Otros">${Object.entries(FOODS).filter(([, F]) => F.g === "otro" && F.k > 0).map(([id, F]) => `<option value="${id}">${F.n}</option>`).join("")}</optgroup>`;
    ["exName", "exK", "exP", "exG"].forEach(id => { $(id).value = ""; });
    sel2.value = ""; extraForm(); $("exErr").textContent = "";
    $("nExtra").showModal();
  }
  function extraForm(){
    const f = $("exFood").value, g = +$("exG").value || 0;
    $("exFree").hidden = !!f; $("exGrams").hidden = !f;
    $("exPrev").textContent = f && g > 0 ? (m => `${nf(m.k)} kcal · P ${nf(m.p)} g · C ${nf(m.c)} g · G ${nf(m.f)} g`)(mac(f, g)) : "";
  }

  /* ---------- eventos ---------- */
  const click = e => { const b = e.target.closest("[data-n]"); if (b) onAction(b); };
  card.addEventListener("click", click);
  section.addEventListener("click", click);
  section.addEventListener("change", e => { if (e.target.matches("input,select")) onChange(e.target); });
  section.addEventListener("input", e => { if (e.target.id === "eqG") renderEquivCalc(); });
  section.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("input")) e.target.blur(); });
  section.addEventListener("focusout", () => setTimeout(() => { if (pending && !focusInside()) render(); }, 0));

  const sw = $("nSwap");
  sw.addEventListener("click", e => {
    const b = e.target.closest("[data-swap]"); if (!b || !swapCtx) return;
    const {iso, r, base} = swapCtx; sw.close();
    day(iso, d => { d.sw = {...(d.sw || {}), [r + "_" + base]:b.dataset.swap}; });
  });
  $("swUndo").addEventListener("click", () => { if (!swapCtx) return; const {iso, r, base} = swapCtx; sw.close(); day(iso, d => { if (d.sw) delete d.sw[r + "_" + base]; }); });
  $("swClose").addEventListener("click", () => sw.close());

  const tm = $("nTime");
  $("tmSave").addEventListener("click", () => { const v = $("tmIn").value; tm.close(); if (timeCtx && v) act.updateNutrition({times:{...sel.nutrition().times, [timeCtx.key]:v}}); });
  $("tmReset").addEventListener("click", () => { tm.close(); if (timeCtx) { const t = {...sel.nutrition().times}; delete t[timeCtx.key]; act.updateNutrition({times:t}); } });
  $("tmCancel").addEventListener("click", () => tm.close());

  const ex = $("nExtra");
  $("exFood").addEventListener("change", extraForm);
  $("exG").addEventListener("input", extraForm);
  $("exCancel").addEventListener("click", () => ex.close());
  $("exSave").addEventListener("click", () => {
    const f = $("exFood").value, err = $("exErr"); let e;
    if (f) {
      const g = +$("exG").value || 0; if (!(g > 0)) { err.textContent = "Escribe cuántos gramos comiste."; return; }
      const m = mac(f, g); e = {n:`${FOODS[f].n} ${qtyText(f, g)}`, k:Math.round(m.k), p:Math.round(m.p), c:Math.round(m.c), f:Math.round(m.f)};
    } else {
      const n = $("exName").value.trim(), k = +$("exK").value, p = +$("exP").value || 0;
      if (!n) { err.textContent = "Escribe qué comiste."; return; }
      if (!(k > 0)) { err.textContent = "Escribe las calorías aproximadas (mira la etiqueta)."; return; }
      e = {n:n.slice(0, 60), k:Math.round(k), p:Math.round(p), c:0, f:0};
    }
    ex.close(); day(isoView(), d => { d.ex = [...(d.ex || []), e]; });
  });
  // Al cerrar un diálogo, dibujar lo que haya quedado pendiente.
  [sw, tm, ex].forEach(d => d.addEventListener("close", () => { if (pending) setTimeout(render, 0); }));

  return {render, renderCard, isBusy:() => focusInside() || dialogOpen()};
}
