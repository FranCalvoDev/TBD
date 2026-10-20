// Sección Entrenamiento: rutina por días, plan de la semana, registro de sesiones y progreso.
import { DAYS, SHORT } from "../data/categories.js";
import { esc } from "../core/utils.js";
import { isoLocal, nowInfo } from "../core/time.js";
import { METRICS, routineDay, activeSchedule, programWeek, programStartFor, sessionWeek, todaysDay, workoutsOf, lastEntry, formatEntry, registry } from "../domain/training.js";
import { richText } from "./richText.js";
import { $, hit } from "./dom.js";

const times = s => esc(String(s || "").replace(/\s*x\s*/i, " × "));
const shortDate = iso => { const [, m, d] = iso.split("-"); return `${Number(d)}/${Number(m)}`; };
const dayAt = iso => nowInfo(new Date(iso + "T12:00"));

export function createTraining(ctx){
  const root = $("training"), actions = $("trainActions"), dlg = $("sessDlg"), {sel, act, view} = ctx;
  let session = null; // sesión abierta en el diálogo: {routineId, dayId, id, check}

  /* ---------- sección ---------- */
  function currentDay(r){
    const ids = (r.days || []).map(d => d.id);
    if (view.trainDay && ids.includes(view.trainDay)) return routineDay(r, view.trainDay);
    return todaysDay(r) || r.days?.[0] || null;
  }

  actions.addEventListener("click", e => {
    const r = sel.activeRoutine();
    if (hit(e, "data-edit") && r) return ctx.open.routineEditor(r.id);
    if (hit(e, "data-new")) return ctx.open.routineEditor(null);
    if (hit(e, "data-import")) return ctx.open.importFile();
  });
  actions.addEventListener("change", e => { if (e.target.matches("[data-routine]")) { view.trainDay = null; act.activateRoutine(e.target.value); } });

  root.addEventListener("click", e => {
    const r = sel.activeRoutine();
    if (hit(e, "data-new")) return ctx.open.routineEditor(null);
    if (hit(e, "data-import")) return ctx.open.importFile();
    if (!r) return;
    const tab = hit(e, "data-day-tab") || hit(e, "data-plan-day");
    if (tab) { view.trainDay = tab.dataset.dayTab || tab.dataset.planDay; return render(); }
    const log = hit(e, "data-log"); if (log) return openSession({routine:r, dayId:log.dataset.log, workoutId:log.dataset.workout || null});
    const s = hit(e, "data-session"); if (s) { const w = sel.workout(s.dataset.session); if (w) openSession({routine:r, dayId:w.dayId, workoutId:w.id}); }
  });
  root.addEventListener("change", e => {
    const r = sel.activeRoutine(); if (!r) return;
    if (e.target.matches("[data-week]")) act.updateRoutine(r.id, {program:{...r.program, start:programStartFor(Number(e.target.value))}});
    if (e.target.matches("[data-schedule]")) act.updateRoutine(r.id, {schedule:e.target.value});
  });

  function weekStrip(r, info){
    const sch = activeSchedule(r); if (!sch) return "";
    const opts = r.schedules.length > 1
      ? `<label class="mini-select">Semana tipo <select data-schedule>${r.schedules.map(s => `<option value="${esc(s.id)}"${s.id === sch.id ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>` : "";
    const cells = DAYS.map((_, i) => {
      const p = sch.plan?.[i] || {}, d = p.day && routineDay(r, p.day);
      const label = d ? (d.short || d.name) : (p.text || "—");
      return `<${d ? `button type="button" data-plan-day="${esc(d.id)}"` : "div"} class="plan-cell${i === info.day ? " today" : ""}${d ? " train" : ""}">
        <span class="plan-d">${SHORT[i]}</span><span class="plan-l">${esc(label)}</span>${d && p.text ? `<span class="plan-n">${esc(p.text)}</span>` : ""}</${d ? "button" : "div"}>`;
    }).join("");
    return `<div class="train-card"><div class="train-row">${opts}</div><div class="plan">${cells}</div>${sch.notes ? `<div class="train-notes">${richText(sch.notes)}</div>` : ""}</div>`;
  }

  function programBox(r, info){
    const p = r.program; if (!p?.weeks?.length) return "";
    const pw = programWeek(r, info), idx = pw?.week ? pw.index : -1;
    const select = `<label class="mini-select">Estás en la <select data-week aria-label="Semana del programa">
      ${idx < 0 ? `<option value="" selected>elige tu semana</option>` : ""}${p.weeks.map((w, i) => `<option value="${i}"${i === idx ? " selected" : ""}>semana ${esc(w.label)}${w.goal ? " · " + esc(w.goal) : ""}</option>`).join("")}</select></label>`;
    const note = pw?.after ? `<p class="train-muted">El programa terminó. Elige otra semana o arma la próxima fase.</p>`
      : pw?.before ? `<p class="train-muted">El programa todavía no empezó.</p>` : "";
    return `<div class="train-card program">${select}${pw?.week?.detail ? `<div class="train-notes">${richText(pw.week.detail)}</div>` : ""}${note}</div>`;
  }

  function dayPanel(r, day, sessions, info){
    const today = isoLocal(info.d);
    const existing = sessions.find(w => w.dayId === day.id && w.date === today);
    const rows = (day.exercises || []).map(ex => {
      const last = lastEntry(sessions, ex.id);
      const detail = [ex.sets && times(ex.sets), ex.rir && `RIR ${esc(ex.rir)}`, ex.rest && esc(ex.rest)].filter(Boolean).join(" · ");
      return `<li class="ex${/^abs/i.test(ex.block || "") ? " abs" : ""}"><span class="ex-b">${esc(ex.block || "")}</span>
        <div class="ex-main"><div class="ex-n">${esc(ex.name)}</div>${detail ? `<div class="ex-d">${detail}</div>` : ""}${ex.note ? `<div class="ex-note">${esc(ex.note)}</div>` : ""}</div>
        ${last ? `<span class="ex-last" title="Último registro (${esc(last.workout.week)})">${esc(formatEntry(last.entry, ex.metric))}</span>` : ""}</li>`;
    }).join("");
    return `<div class="train-card day">
      <h3>${esc(day.name)}</h3>${day.info ? `<p class="train-muted">${esc(day.info)}</p>` : ""}
      ${day.warmup ? `<div class="warmup"><b>Calentamiento:</b> ${esc(day.warmup)}</div>` : ""}
      <ol class="ex-list">${rows || `<li class="train-muted">Este día todavía no tiene ejercicios.</li>`}</ol>
      ${day.keys ? `<div class="keys"><h4>Claves</h4>${richText(day.keys)}</div>` : ""}
      <button type="button" class="add-btn" data-log="${esc(day.id)}"${existing ? ` data-workout="${esc(existing.id)}"` : ""}>${existing ? "Editar la sesión de hoy" : "Registrar sesión"}</button>
    </div>`;
  }

  function historyBox(r, sessions){
    if (!sessions.length) return "";
    const list = sessions.slice(0, 6).map(w => {
      const d = routineDay(r, w.dayId), n = Object.values(w.entries || {}).filter(e => e.kg || e.reps || e.value).length;
      return `<button type="button" class="sess" data-session="${esc(w.id)}"><span class="sess-date">${shortDate(w.date)}</span>
        <span class="sess-day">${esc(d?.name || "Día borrado")}</span><span class="sess-n">${n} ${n === 1 ? "registro" : "registros"}${w.check ? ` · ${esc(w.check)}` : ""}</span></button>`;
    }).join("");
    const reg = registry(r, sessions);
    const table = reg.rows.length ? `<details class="train-details"><summary>Registro de cargas</summary><div class="reg-scroll"><table class="reg">
      <thead><tr><th>Ejercicio</th>${reg.columns.map(c => `<th>${/^\d+$/.test(c) ? "S" + esc(c) : esc(c.split("-")[1] || c)}</th>`).join("")}</tr></thead>
      <tbody>${reg.rows.map(row => `<tr><th>${esc(row.exercise.name)}</th>${row.cells.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}
      ${reg.check.some(Boolean) ? `<tr class="reg-check"><th>${esc(r.checkLabel || "Sensación")}</th>${reg.check.map(c => `<td>${esc(c)}</td>`).join("")}</tr>` : ""}</tbody>
    </table></div></details>` : "";
    return `<div class="train-card"><h3>Últimas sesiones</h3><div class="sess-list">${list}</div></div>${table}`;
  }

  function render(){
    const routines = sel.routines(), r = sel.activeRoutine(), info = nowInfo();
    actions.innerHTML = r ? `${routines.length > 1 ? `<select data-routine aria-label="Rutina en uso">${routines.map(x => `<option value="${esc(x.id)}"${x.id === r.id ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : ""}
      <button type="button" class="link-btn" data-edit>Editar rutina</button><button type="button" class="link-btn" data-new>+ Nueva</button><button type="button" class="link-btn" data-import>Importar</button>` : "";
    if (!r) {
      root.innerHTML = `<div class="empty train-empty"><p>Arma tu rutina: días, ejercicios, series, RIR y descansos. Después registras cada sesión y ves cómo progresas.</p>
        <div class="data-actions"><button type="button" class="add-btn" data-new>+ Crear rutina</button><button type="button" class="btn" data-import>Importar rutina</button></div></div>`;
      return;
    }
    const day = currentDay(r), sessions = workoutsOf(sel.workouts(), r.id);
    const tabs = (r.days || []).map(d => `<button type="button" role="tab" class="tab" data-day-tab="${esc(d.id)}" aria-selected="${d.id === day?.id}">${esc(d.short || d.name)}</button>`).join("");
    const guide = (r.guide || []).map(g => `<details class="train-details"><summary>${esc(g.title)}</summary><div class="guide-body">${richText(g.text)}</div></details>`).join("");
    root.innerHTML = `
      <div class="train-head"><h3>${esc(r.name)}</h3>${r.description ? `<p class="train-muted">${esc(r.description)}</p>` : ""}</div>
      ${programBox(r, info)}${weekStrip(r, info)}
      ${tabs ? `<div class="tabs train-tabs" role="tablist">${tabs}</div>` : ""}
      ${day ? dayPanel(r, day, sessions, info) : `<div class="empty">Esta rutina todavía no tiene días. Agrégalos con «Editar rutina».</div>`}
      ${historyBox(r, sessions)}${guide ? `<div class="guide">${guide}</div>` : ""}`;
  }

  /** Abre la rutina en un día (desde «Recordatorio»). */
  function showDay(dayId){
    view.trainDay = dayId; render();
    $("entrenamiento").scrollIntoView({behavior:"smooth", block:"start"});
  }

  /* ---------- registrar una sesión ---------- */
  function inputsFor(ex, entry){
    const f = METRICS[ex.metric] ? ex.metric : "carga", v = k => esc(entry?.[k] ?? "");
    if (f === "carga") return `<input data-f="kg" inputmode="decimal" placeholder="kg" value="${v("kg")}" aria-label="Peso en kg"><span>×</span><input data-f="reps" inputmode="numeric" placeholder="reps" value="${v("reps")}" aria-label="Repeticiones">`;
    if (f === "reps") return `<input data-f="reps" inputmode="numeric" placeholder="reps" value="${v("reps")}" aria-label="Repeticiones">`;
    if (f === "tiempo") return `<input data-f="value" inputmode="decimal" placeholder="seg" value="${v("value")}" aria-label="Tiempo en segundos">`;
    if (f === "distancia") return `<input data-f="value" inputmode="decimal" placeholder="cm" value="${v("value")}" aria-label="Distancia en cm">`;
    return `<input data-f="value" class="wide" placeholder="Anota" value="${v("value")}" aria-label="Registro">`;
  }

  function renderSession(){
    const r = sel.routine(session.routineId), day = routineDay(r, session.dayId); if (!r || !day) return;
    const w = session.id ? sel.workout(session.id) : null;
    const date = $("sDate")?.value || w?.date || isoLocal(nowInfo().d);
    const sessions = workoutsOf(sel.workouts(), r.id).filter(x => x.id !== session.id);
    $("sRoutine").textContent = r.name;
    $("sTitle").textContent = day.name;
    $("sWeek").textContent = /^\d+$/.test(sessionWeek(r, dayAt(date))) ? `Semana ${sessionWeek(r, dayAt(date))} del programa` : "";
    const rows = (day.exercises || []).map(ex => {
      const last = lastEntry(sessions, ex.id, date);
      return `<div class="log-row" data-ex="${esc(ex.id)}"><div class="log-name"><b>${esc(ex.block ? ex.block + " · " : "")}${esc(ex.name)}</b>
        <span>${times(ex.sets)}${ex.rir ? " · RIR " + esc(ex.rir) : ""}${last ? ` · última: ${esc(formatEntry(last.entry, ex.metric))}` : ""}</span></div>
        <div class="log-in">${inputsFor(ex, w?.entries?.[ex.id])}</div></div>`;
    }).join("");
    const check = ["Verde", "Amarillo", "Rojo"];
    $("sBody").innerHTML = `<label class="form-date">Fecha<input type="date" id="sDate" value="${esc(date)}"></label>
      <p class="log-help">Anota la serie principal de cada ejercicio. Lo que dejes vacío no se guarda.</p>
      <div class="log-list">${rows}</div>
      <div class="log-check"><span>${esc(r.checkLabel || "Sensación")}</span><div class="seg" role="radiogroup">${check.map(c =>
        `<button type="button" role="radio" class="seg-b ${c.toLowerCase()}" data-check="${c}" aria-checked="${session.check === c}">${c}</button>`).join("")}</div></div>
      <label class="form-note">Notas<textarea id="sNote" rows="2" placeholder="Cómo te sentiste, molestias, cambios…">${esc(w?.note || "")}</textarea></label>`;
    $("sDel").style.visibility = session.id ? "visible" : "hidden";
  }

  function openSession({routine, dayId, workoutId}){
    const w = workoutId ? sel.workout(workoutId) : null;
    session = {routineId:routine.id, dayId, id:w?.id || null, check:w?.check || null};
    $("sBody").innerHTML = "";
    if (!dlg.open) dlg.showModal();
    renderSession();
  }

  dlg.addEventListener("click", e => {
    const c = hit(e, "data-check"); if (!c) return;
    session.check = session.check === c.dataset.check ? null : c.dataset.check;
    dlg.querySelectorAll("[data-check]").forEach(b => b.setAttribute("aria-checked", b.dataset.check === session.check));
  });
  dlg.addEventListener("change", e => {
    if (e.target.id !== "sDate") return;
    const r = sel.routine(session.routineId), date = e.target.value;
    $("sWeek").textContent = r && date && /^\d+$/.test(sessionWeek(r, dayAt(date))) ? `Semana ${sessionWeek(r, dayAt(date))} del programa` : "";
  });
  $("sSave").addEventListener("click", () => {
    const r = sel.routine(session.routineId); if (!r) return dlg.close();
    const date = $("sDate").value || isoLocal(nowInfo().d), entries = {};
    dlg.querySelectorAll("[data-ex]").forEach(row => {
      const e = {};
      row.querySelectorAll("[data-f]").forEach(inp => { const v = inp.value.trim().replace(",", "."); if (v) e[inp.dataset.f] = v; });
      if (Object.keys(e).length) entries[row.dataset.ex] = e;
    });
    // Una sesión por día de rutina y fecha: si ya existe, se completa esa.
    const same = !session.id && sel.workouts().find(w => w.routineId === r.id && w.dayId === session.dayId && w.date === date);
    act.saveWorkout({routineId:r.id, dayId:session.dayId, date, week:sessionWeek(r, dayAt(date)), entries,
      check:session.check, note:$("sNote").value.trim()}, session.id || same?.id || null);
    dlg.close();
  });
  $("sCancel").addEventListener("click", () => dlg.close());
  $("sDel").addEventListener("click", async () => {
    const id = session.id; dlg.close();
    if (id && await ctx.confirm("Borrar sesión", "Se borra lo que anotaste en esta sesión.", "Borrar")) act.deleteWorkout(id);
  });

  return {render, showDay, refreshSession(){ if (dlg.open && session) renderSession(); }};
}
