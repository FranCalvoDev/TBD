// Lista de tareas únicas con sugerencias de horario.
import { catVar, catName } from "../data/categories.js";
import { minToStr, durTxt, nowInfo } from "../core/time.js";
import { esc } from "../core/utils.js";
import { suggestSlots, slotLabel, slotPassed, dueStatus, sortPending, freeMinutesLeft } from "../domain/tasks.js";
import { $, hit } from "./dom.js";

export function createTasks(ctx){
  const list = $("taskList"), doneBox = $("doneTasks"), doneList = $("doneList"), {sel, act, view} = ctx;
  let suggestions = new Map(); // taskId -> horarios sugeridos en el último dibujo

  function onClick(e){
    const card = e.target.closest("[data-task-id]"); if (!card) return;
    const id = card.dataset.taskId;
    if (hit(e, "data-check")) return act.toggleTask(id);
    if (hit(e, "data-edit")) return ctx.open.taskEditor(id);
    if (hit(e, "data-when")) { view.openSugg.has(id) ? view.openSugg.delete(id) : view.openSugg.add(id); return render(); }
    if (hit(e, "data-unslot")) return act.unscheduleTask(id);
    const pick = hit(e, "data-slot");
    if (pick) {
      const s = suggestions.get(id)?.[Number(pick.dataset.slot)]; if (!s) return;
      view.openSugg.delete(id);
      act.scheduleTask(id, {week:s.week, day:s.day, s:minToStr(s.s), e:minToStr(s.e)});
      ctx.afterRender(() => goTo(id));
    }
  }
  list.addEventListener("click", onClick);
  doneList.addEventListener("click", onClick);
  $("addTask").addEventListener("click", () => ctx.open.taskEditor(null));

  function card(t, info){
    const passed = t.slot && !t.done && slotPassed(t.slot, info);
    const due = t.done ? null : dueStatus(t.due, info);
    const sched = t.slot && !t.done ? (passed ? `<span class="tchip warn">No se hizo en el horario agendado</span>` : `<span class="tchip sched">Agendada: ${slotLabel(t.slot, info)}</span>`) : "";
    const open = view.openSugg.has(t.id) && !t.done;
    let sugg = "";
    if (open) {
      const sug = suggestSlots(sel, t, info);
      suggestions.set(t.id, sug);
      if (t.slot && !passed) sugg += `<button type="button" class="sugg" data-unslot>Quitar del calendario</button>`;
      if (!sug.length) sugg += `<p class="cs">No encontré un hueco de ${durTxt(t.est)}${t.due ? " antes del vencimiento" : " en las próximas dos semanas"}. Prueba dividir la tarea en partes más cortas o liberar un bloque.</p>`;
      sugg += sug.map((s, i) => `<button type="button" class="sugg" data-slot="${i}"><b>${s.rel}</b> de ${minToStr(s.s % 1440)} a ${minToStr(s.e % 1440)} <span>(${esc(s.kind)})</span></button>`).join("");
    }
    const when = t.done ? "" : `<button type="button" class="link-btn" data-when>${open ? "Ocultar horarios" : t.slot && !passed ? "Cambiar horario" : "¿Cuándo la hago?"}</button>`;
    return `<div class="task${t.done ? " done" : ""}" id="task-${esc(t.id)}" data-task-id="${esc(t.id)}" style="--cat:${catVar(t.cat)}">
      <button type="button" class="tcheck" data-check aria-label="${t.done ? "Marcar como pendiente" : "Completar"}: ${esc(t.title)}">${t.done ? "✓" : ""}</button>
      <div class="tmain"><div class="ttl">${esc(t.title)}</div>
        <div class="tchips"><span class="tchip">${durTxt(t.est)}</span><span class="tchip cat">${catName(t.cat)}</span>${due ? `<span class="tchip${due.warn ? " warn" : ""}">${due.text}</span>` : ""}${sched}</div>
        <div class="tsugg">${sugg}</div></div>
      <div class="tact">${when}<button type="button" class="link-btn" data-edit>Editar</button></div></div>`;
  }

  function render(){
    const info = nowInfo();
    suggestions = new Map();
    const pend = sortPending(sel.tasks(), info);
    const freeMin = freeMinutesLeft(sel, info);
    const estMin = pend.reduce((a, t) => a + t.est, 0);
    $("taskSum").textContent = pend.length
      ? `Tienes ${pend.length} ${pend.length === 1 ? "tarea pendiente" : "tareas pendientes"} (${durTxt(estMin)} estimadas) y te quedan ${durTxt(freeMin)} libres esta semana.`
      : `No tienes tareas pendientes. Te quedan ${durTxt(freeMin)} libres esta semana.`;
    list.innerHTML = pend.length ? pend.map(t => card(t, info)).join("")
      : `<div class="empty">Agrega tareas únicas con “Nueva tarea”: una entrega, un trámite, un mensaje pendiente. Te muestro en qué hueco de tu semana entran.</div>`;
    const done = sel.tasks().filter(t => t.done).sort((a, b) => (b.doneAt || "") < (a.doneAt || "") ? -1 : 1);
    doneBox.hidden = !done.length;
    doneBox.querySelector("summary").textContent = `Completadas (${done.length})`;
    doneList.innerHTML = done.slice(0, 15).map(t => card(t, info)).join("");
  }

  function goTo(id){
    const el = document.getElementById("task-" + id); if (!el) return;
    el.scrollIntoView({behavior:"smooth", block:"center"});
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  return {render, goTo};
}
