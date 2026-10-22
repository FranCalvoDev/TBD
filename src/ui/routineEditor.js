// Crear y editar rutinas: nombre, tarea asociada (opcional) y filas de la tabla.
import { $ } from "./dom.js";
import { esc } from "../core/utils.js";
import { fmt } from "../core/time.js";
import { DAYS } from "../data/categories.js";

const MAX_ROWS = 60;

export function createRoutineEditor(ctx){
  const dlg = $("routineDlg"), rows = $("rRows"), {sel, act} = ctx;
  let editId = null;

  const rowHtml = (r = {}) => `<div class="rrow">
    <input data-f="name" maxlength="80" placeholder="Paso o ejercicio" aria-label="Paso o ejercicio" value="${esc(r.name)}">
    <input data-f="detail" maxlength="200" placeholder="Detalle" aria-label="Detalle" value="${esc(r.detail)}">
    <input data-f="amount" maxlength="40" placeholder="Ej. 3×12 o 10 min" aria-label="Tiempo o series" value="${esc(r.amount)}">
    <button type="button" class="rrow-del" data-del aria-label="Quitar fila">×</button></div>`;

  function taskOptions(selected){
    const pending = sel.tasks().filter(t => !t.done || t.id === selected);
    const known = pending.some(t => t.id === selected);
    return `<option value="">Sin tarea</option>` +
      (selected && !known ? `<option value="${esc(selected)}" selected>(tarea eliminada)</option>` : "") +
      pending.map(t => `<option value="${esc(t.id)}"${t.id === selected ? " selected" : ""}>${esc(t.title)}</option>`).join("");
  }

  function blockOptions(selected){
    const known = [0,1,2,3,4,5,6].some(d => sel.blocksOf(d).some(x => x.id === selected));
    return `<option value="">Sin bloque</option>` +
      (selected && !known ? `<option value="${esc(selected)}" selected>(bloque eliminado)</option>` : "") +
      DAYS.map((name, d) => {
        const bs = sel.blocksOf(d); if (!bs.length) return "";
        return `<optgroup label="${name}">${bs.map(x => `<option value="${esc(x.id)}"${x.id === selected ? " selected" : ""}>${fmt(x.s)} · ${esc(x.title)}</option>`).join("")}</optgroup>`;
      }).join("");
  }

  function open(id){
    editId = id || null;
    const r = id ? sel.routine(id) : {title:"", taskId:"", blockId:"", rows:[{}, {}, {}]};
    if (!r) return;
    $("rdTitle").textContent = id ? "Editar rutina" : "Nueva rutina";
    $("rTitle").value = r.title;
    $("rTask").innerHTML = taskOptions(r.taskId || "");
    $("rBlock").innerHTML = blockOptions(r.blockId || "");
    rows.innerHTML = (Array.isArray(r.rows) && r.rows.length ? r.rows : [{}]).map(rowHtml).join("");
    $("rErr").textContent = "";
    $("rDel").style.visibility = id ? "visible" : "hidden";
    dlg.showModal();
    $("rTitle").focus();
  }

  $("rAddRow").addEventListener("click", () => {
    if (rows.children.length >= MAX_ROWS) { $("rErr").textContent = `Máximo ${MAX_ROWS} filas.`; return; }
    rows.insertAdjacentHTML("beforeend", rowHtml());
    rows.lastElementChild.querySelector("input").focus();
  });
  rows.addEventListener("click", e => {
    const del = e.target.closest("[data-del]"); if (!del) return;
    del.closest(".rrow").remove();
    if (!rows.children.length) rows.insertAdjacentHTML("beforeend", rowHtml());
  });

  $("rSave").addEventListener("click", () => {
    const title = $("rTitle").value.trim();
    if (!title) { $("rErr").textContent = "Ponle un nombre a la rutina."; return; }
    const data = [...rows.children].map(row => Object.fromEntries(
      [...row.querySelectorAll("input")].map(i => [i.dataset.f, i.value.trim()])
    )).filter(r => r.name || r.detail || r.amount);
    act.saveRoutine({title, taskId:$("rTask").value, blockId:$("rBlock").value, rows:data}, editId);
    dlg.close();
  });
  $("rCancel").addEventListener("click", () => dlg.close());
  $("rDel").addEventListener("click", async () => {
    const r = sel.routine(editId); if (!r) return;
    dlg.close();
    if (await ctx.confirm("Eliminar rutina", `¿Eliminar “${r.title}”?`, "Eliminar")) act.deleteRoutine(r.id);
  });

  return {open};
}
