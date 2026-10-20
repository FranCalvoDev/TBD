// Editor de rutinas: datos generales, días con ejercicios, plan semanal, semanas del programa y guía.
// Trabaja sobre un borrador; nada se guarda hasta tocar «Guardar».
import { SHORT } from "../data/categories.js";
import { esc, uid, clone } from "../core/utils.js";
import { METRICS } from "../domain/training.js";
import { $, hit } from "./dom.js";

const newExercise = () => ({id:"e" + uid(), block:"", name:"", sets:"", rir:"", rest:"", metric:"carga", track:true});
const newDay = n => ({id:"d" + uid(), name:`Día ${n}`, short:"", info:"", warmup:"", keys:"", exercises:[newExercise()]});

/** Lee y escribe propiedades del borrador con rutas como «days.0.exercises.2.name». */
const getAt = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
function setAt(obj, path, value){
  const keys = path.split("."), last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= /^\d+$/.test(k) ? [] : {}), obj);
  target[last] = value;
}

export function createRoutineEditor(ctx){
  const dlg = $("routineDlg"), body = $("rBody"), {sel, act} = ctx;
  let draft = null, editId = null, openDay = 0;

  const field = (label, path, {area = false, rows = 3, placeholder = "", cls = ""} = {}) => {
    const v = esc(getAt(draft, path) ?? "");
    return `<label class="${cls}">${label}${area
      ? `<textarea data-path="${path}" rows="${rows}" placeholder="${esc(placeholder)}">${v}</textarea>`
      : `<input data-path="${path}" value="${v}" placeholder="${esc(placeholder)}" autocomplete="off">`}</label>`;
  };

  function planOptions(item){
    const cur = item?.day ? "day:" + item.day : item?.text ? "text:" + item.text : "";
    const opts = [["", "—"], ["text:Descanso", "Descanso"], ...draft.days.map(d => ["day:" + d.id, d.name || "Día sin nombre"])];
    if (item?.text && item.text !== "Descanso") opts.push(["text:" + item.text, item.text]);
    return opts.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("");
  }

  function render(){
    const days = draft.days.map((d, i) => `<details class="ed-day" data-day-i="${i}"${i === openDay ? " open" : ""}>
      <summary>${esc(d.name || "Día sin nombre")} <small>${d.exercises.length} ejercicios</small></summary>
      <div class="two">${field("Nombre", `days.${i}.name`, {placeholder:"Día 1 · Pierna A"})}${field("Nombre corto (opcional, para pestañas)", `days.${i}.short`, {placeholder:"Pierna A"})}</div>
      ${field("Descripción", `days.${i}.info`, {placeholder:"La sesión más pesada. 70-80 min."})}
      ${field("Calentamiento", `days.${i}.warmup`, {area:true, rows:2})}
      <div class="ed-ex-head"><span>Bloque</span><span>Ejercicio</span><span>Series × reps</span><span>RIR</span><span>Descanso</span><span>Registro</span><span></span></div>
      ${d.exercises.map((ex, j) => `<div class="ed-ex">
        <input data-path="days.${i}.exercises.${j}.block" value="${esc(ex.block)}" placeholder="A" aria-label="Bloque">
        <input data-path="days.${i}.exercises.${j}.name" value="${esc(ex.name)}" placeholder="Ejercicio" aria-label="Ejercicio">
        <input data-path="days.${i}.exercises.${j}.sets" value="${esc(ex.sets)}" placeholder="4 x 6-8" aria-label="Series por repeticiones">
        <input data-path="days.${i}.exercises.${j}.rir" value="${esc(ex.rir)}" placeholder="2" aria-label="RIR">
        <input data-path="days.${i}.exercises.${j}.rest" value="${esc(ex.rest)}" placeholder="90 s" aria-label="Descanso">
        <select data-path="days.${i}.exercises.${j}.metric" aria-label="Qué se registra">${Object.entries(METRICS).map(([k, m]) => `<option value="${k}"${k === (ex.metric || "carga") ? " selected" : ""}>${m.name}</option>`).join("")}</select>
        <button type="button" class="ed-x" data-act="del-ex" data-i="${i}" data-j="${j}" aria-label="Quitar ${esc(ex.name || "ejercicio")}">×</button>
        <label class="check ed-track"><input type="checkbox" data-path="days.${i}.exercises.${j}.track"${ex.track !== false ? " checked" : ""}> Mostrar en el registro de cargas</label>
      </div>`).join("")}
      <button type="button" class="link-btn" data-act="add-ex" data-i="${i}">+ Ejercicio</button>
      ${field("Claves (una por línea, empieza con «- »)", `days.${i}.keys`, {area:true, rows:3})}
      <button type="button" class="btn danger ed-del-day" data-act="del-day" data-i="${i}">Quitar este día</button>
    </details>`).join("");

    const schedules = draft.schedules.map((s, i) => `<div class="ed-sched">
      <div class="ed-sched-top">${field("Nombre", `schedules.${i}.name`, {placeholder:"Semana normal"})}
        <button type="button" class="ed-x" data-act="del-sched" data-i="${i}" aria-label="Quitar ${esc(s.name || "plan")}">×</button></div>
      <div class="ed-plan">${SHORT.map((d, k) => `<label>${d}<select data-plan="${i}.${k}">${planOptions(s.plan[k])}</select></label>`).join("")}</div>
    </div>`).join("");

    const weeks = (draft.program.weeks || []).map((w, i) => `<div class="ed-week">
      <input data-path="program.weeks.${i}.label" value="${esc(w.label)}" placeholder="15" aria-label="Número de semana">
      <input data-path="program.weeks.${i}.goal" value="${esc(w.goal)}" placeholder="Objetivo" aria-label="Objetivo de la semana">
      <textarea data-path="program.weeks.${i}.detail" rows="2" placeholder="Qué cambia esta semana" aria-label="Detalle de la semana">${esc(w.detail || "")}</textarea>
      <button type="button" class="ed-x" data-act="del-week" data-i="${i}" aria-label="Quitar semana ${esc(w.label)}">×</button></div>`).join("");

    const guide = draft.guide.map((g, i) => `<div class="ed-guide">
      <div class="ed-sched-top">${field("Título", `guide.${i}.title`)}<button type="button" class="ed-x" data-act="del-guide" data-i="${i}" aria-label="Quitar ${esc(g.title || "sección")}">×</button></div>
      ${field("Texto", `guide.${i}.text`, {area:true, rows:4})}</div>`).join("");

    body.innerHTML = `
      ${field("Nombre de la rutina", "name", {placeholder:"Fase 1 · Fuerza"})}
      ${field("Descripción", "description", {placeholder:"4 sesiones por semana…"})}
      ${field("Qué evalúas al final de cada sesión", "checkLabel", {placeholder:"Sensación"})}
      <h4 class="ed-h">Días</h4>${days}<button type="button" class="link-btn" data-act="add-day">+ Día</button>
      <h4 class="ed-h">Plan semanal</h4><p class="ed-help">Qué día de la rutina toca cada día de la semana. Puedes tener varias variantes (por ejemplo, con y sin partido) y elegir una cada semana.</p>
      ${schedules}<button type="button" class="link-btn" data-act="add-sched">+ Variante del plan</button>
      <h4 class="ed-h">Semanas del programa (opcional)</h4><p class="ed-help">Si tu rutina avanza por semanas, anota qué cambia en cada una. La app muestra la semana en curso.</p>
      ${weeks}<button type="button" class="link-btn" data-act="add-week">+ Semana</button>
      <h4 class="ed-h">Guía (opcional)</h4><p class="ed-help">Tablas de referencia, progresiones o consejos. Usa «- » para listas.</p>
      ${guide}<button type="button" class="link-btn" data-act="add-guide">+ Sección</button>
      <p class="err" id="rErr" role="alert"></p>`;
  }

  function open(id){
    editId = id || null;
    const r = id ? sel.routine(id) : null;
    draft = r ? clone(r) : {name:"", description:"", checkLabel:"Sensación", days:[newDay(1)], schedules:[], program:{weeks:[]}, guide:[]};
    draft.days ||= []; draft.schedules ||= []; draft.guide ||= []; draft.program ||= {weeks:[]}; draft.program.weeks ||= [];
    draft.schedules.forEach(s => { s.plan ||= []; });
    openDay = 0;
    $("rHead").textContent = id ? "Editar rutina" : "Nueva rutina";
    $("rDel").style.visibility = id ? "visible" : "hidden";
    render();
    dlg.showModal();
  }

  body.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.path) setAt(draft, t.dataset.path, t.type === "checkbox" ? t.checked : t.value);
  });
  body.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.path && t.type === "checkbox") setAt(draft, t.dataset.path, t.checked);
    if (t.dataset.plan) {
      const [i, k] = t.dataset.plan.split(".").map(Number), v = t.value;
      draft.schedules[i].plan[k] = v.startsWith("day:") ? {day:v.slice(4)} : v.startsWith("text:") ? {text:v.slice(5)} : {};
    }
  });
  body.addEventListener("toggle", e => { if (e.target.matches?.(".ed-day") && e.target.open) openDay = Number(e.target.dataset.dayI); }, true);
  body.addEventListener("click", e => {
    const b = hit(e, "data-act"); if (!b) return;
    const i = Number(b.dataset.i), j = Number(b.dataset.j), scroll = body.scrollTop;
    switch (b.dataset.act) {
      case "add-day": draft.days.push(newDay(draft.days.length + 1)); openDay = draft.days.length - 1; break;
      case "del-day": {
        const id = draft.days[i].id; draft.days.splice(i, 1); openDay = Math.max(0, i - 1);
        draft.schedules.forEach(s => s.plan = s.plan.map(p => p?.day === id ? {} : p));
        break;
      }
      case "add-ex": draft.days[i].exercises.push(newExercise()); openDay = i; break;
      case "del-ex": draft.days[i].exercises.splice(j, 1); openDay = i; break;
      case "add-sched": draft.schedules.push({id:"s" + uid(), name:draft.schedules.length ? "Otra semana" : "Semana normal", plan:[]}); break;
      case "del-sched": draft.schedules.splice(i, 1); break;
      case "add-week": draft.program.weeks.push({label:String((Number(draft.program.weeks.at(-1)?.label) || 0) + 1), goal:"", detail:""}); break;
      case "del-week": draft.program.weeks.splice(i, 1); break;
      case "add-guide": draft.guide.push({title:"", text:""}); break;
      case "del-guide": draft.guide.splice(i, 1); break;
    }
    render(); body.scrollTop = scroll;
  });

  $("rSave").addEventListener("click", () => {
    if (!draft.name.trim()) { $("rErr").textContent = "Ponle un nombre a la rutina."; body.scrollTop = 0; return; }
    const out = clone(draft);
    out.name = out.name.trim();
    out.days.forEach(d => { d.exercises = d.exercises.filter(ex => ex.name.trim()); });
    out.guide = out.guide.filter(g => g.title.trim() || g.text.trim());
    if (!out.program.weeks.length) out.program = null;
    if (out.schedules.length && !out.schedules.some(s => s.id === out.schedule)) out.schedule = out.schedules[0].id;
    const first = !sel.routines().length;
    const id = act.saveRoutine(out, editId);
    if (!editId || first) act.activateRoutine(id);
    dlg.close();
  });
  $("rCancel").addEventListener("click", () => dlg.close());
  $("rDel").addEventListener("click", async () => {
    const r = sel.routine(editId); if (!r) return;
    dlg.close();
    if (await ctx.confirm("Eliminar rutina", `¿Eliminar «${r.name}» y todas sus sesiones registradas?`, "Eliminar")) act.deleteRoutine(r.id);
  });

  return {open};
}
