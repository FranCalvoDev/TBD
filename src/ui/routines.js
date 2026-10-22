// Lista de rutinas: cada una es una tabla de pasos ligada (o no) a una tarea.
import { esc } from "../core/utils.js";
import { $, hit } from "./dom.js";
import { reveal } from "./collapsible.js";

export function createRoutines(ctx){
  const list = $("routineList"), {sel, view} = ctx;

  function table(rows){
    if (!rows.length) return `<p class="rt-empty">Esta rutina todavía no tiene filas.</p>`;
    const body = rows.map((r, i) => `<tr><td class="rt-n">${i + 1}</td><th scope="row">${esc(r.name)}</th><td data-label="Detalle">${esc(r.detail)}</td><td class="rt-amt" data-label="Tiempo / series">${esc(r.amount)}</td></tr>`).join("");
    return `<div class="rt-wrap"><table class="rt"><thead><tr><th class="rt-n" scope="col">#</th><th scope="col">Paso o ejercicio</th><th scope="col">Detalle</th><th scope="col">Tiempo / series</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function card(r){
    const task = r.taskId ? sel.task(r.taskId) : null;
    const chip = task ? `<span class="tchip sched">Tarea: ${esc(task.title)}</span>` : `<span class="tchip">Sin tarea</span>`;
    return `<details class="routine" id="routine-${esc(r.id)}" data-routine-id="${esc(r.id)}"${view.openRoutines.has(r.id) ? " open" : ""}>
      <summary><span class="rt-title">${esc(r.title)}</span>${chip}<span class="rt-count">${r.rows.length} ${r.rows.length === 1 ? "fila" : "filas"}</span></summary>
      <div class="rt-body">${table(r.rows)}<div class="rt-act"><button type="button" class="link-btn" data-edit>Editar</button></div></div></details>`;
  }

  function render(){
    const rs = sel.routines().map(r => ({...r, rows:Array.isArray(r.rows) ? r.rows : []}));
    list.innerHTML = rs.length ? rs.map(card).join("")
      : `<div class="empty">Crea una rutina con “Nueva rutina”: una tabla con los pasos, ejercicios o puntos a seguir. Puedes ligarla a una tarea.</div>`;
  }

  list.addEventListener("click", e => {
    const el = hit(e, "data-edit"); if (!el) return;
    ctx.open.routineEditor(el.closest("[data-routine-id]").dataset.routineId);
  });
  list.addEventListener("toggle", e => {
    const id = e.target.dataset?.routineId; if (!id) return;
    e.target.open ? view.openRoutines.add(id) : view.openRoutines.delete(id);
  }, true);
  $("addRoutine").addEventListener("click", () => ctx.open.routineEditor(null));

  /** Muestra una rutina abierta y centrada en pantalla. */
  function goTo(id){
    view.openRoutines.add(id);
    reveal(list);
    render();
    const el = document.getElementById("routine-" + id); if (!el) return;
    el.scrollIntoView({behavior:"smooth", block:"start"});
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  return {render, goTo};
}
