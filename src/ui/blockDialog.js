// Detalle de un bloque: tips, marcar como hecho, dar de baja y usar el horario liberado.
import { DAYS } from "../data/categories.js";
import { catVar, catName } from "../state/categories.js";
import { toMin, minToStr, fmt, durTxt, span } from "../core/time.js";
import { esc } from "../core/utils.js";
import { freeWindow, isFreed } from "../domain/schedule.js";
import { $, hit } from "./dom.js";

export function createBlockDialog(ctx){
  const dlg = $("dlg"), body = $("dBody"), {sel, act} = ctx;
  let curId = null;

  function freedHtml(x, off){
    const key = sel.curKey(), [s, e] = freeWindow(sel, key, x), libre = e - s;
    const head = `<p class="freed"><b>${off ? "Bloque dado de baja esta semana." : "Bloque hecho."}</b> Este horario quedó libre${libre > 0 ? `: ${minToStr(s % 1440)} a ${fmt(x.e)} (${durTxt(libre)})` : ""}.</p>`;
    if (libre <= 0) return head + `<p>Ya tienes tareas ocupando todo este horario.</p>`;
    const fit = sel.tasks().filter(t => !t.done && t.est <= libre &&
      !(t.slot && t.slot.week === key && t.slot.day === x.day && toMin(t.slot.s) >= s && toMin(t.slot.e) <= e));
    if (!fit.length) return head + `<p>No tienes tareas pendientes que entren aquí. Créalas en la sección Tareas y vuelve a este bloque.</p>`;
    return head + `<p>Poner una tarea en este horario:</p><div class="tsugg">${fit.slice(0, 6).map(t =>
      `<button type="button" class="sugg" data-fill="${esc(t.id)}"><b>${esc(t.title)}</b> <span>(${durTxt(t.est)}, desde las ${minToStr(s % 1440)})</span></button>`).join("")}</div>`;
  }

  function render(){
    if (!dlg.open || !curId) return;
    const x = sel.block(curId);
    if (!x) { dlg.close(); return; }
    const w = sel.curWeek(), off = !!w.off?.[x.id], tips = (x.l || []).filter(Boolean);
    dlg.style.setProperty("--cat", catVar(x.cat));
    $("dCat").textContent = catName(x.cat);
    $("dTitle").textContent = x.title;
    $("dTime").textContent = `${DAYS[x.day]}, de ${fmt(x.s)} a ${fmt(x.e)} (${durTxt(span(x))})`;
    body.innerHTML = (off ? "" : (x.p ? `<p>${esc(x.p)}</p>` : "")) +
      (!off && tips.length ? `<ul>${tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : "") +
      (!off && !x.p && !tips.length ? `<p>Este bloque todavía no tiene tips. Toca Editar para agregarlos.</p>` : "") +
      (isFreed(sel, sel.curKey(), x) ? freedHtml(x, off) : "");
    $("dSkip").textContent = off ? "Reactivar este bloque" : "Dar de baja esta semana";
    $("dDone").textContent = w.done?.[x.id] ? "Desmarcar" : "Marcar como hecho";
  }

  function open(id){
    curId = id;
    if (!dlg.open) dlg.showModal();
    render();
  }

  body.addEventListener("click", e => {
    const b = hit(e, "data-fill"); if (!b) return;
    const id = b.dataset.fill;
    act.fillFreed(id, curId); dlg.close();
    ctx.afterRender(() => ctx.open.goToTask(id));
  });
  $("dDone").addEventListener("click", () => act.toggleDone(curId));
  $("dSkip").addEventListener("click", () => act.toggleOff(curId));
  $("dClose").addEventListener("click", () => dlg.close());
  $("dEdit").addEventListener("click", () => { dlg.close(); ctx.open.editor(curId); });
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

  return {open, render};
}
