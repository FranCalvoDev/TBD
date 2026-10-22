// Lista de rutinas: cada una es una lista de pasos o ejercicios ligada (o no) a una tarea o a un bloque.
// Durante la sesión se tachan los ejercicios hechos; al día siguiente vuelven a empezar.
import { esc } from "../core/utils.js";
import { fmt } from "../core/time.js";
import { SHORT } from "../data/categories.js";
import { parseRoutine } from "../domain/routine.js";
import { createRoutineProgress } from "../state/routineProgress.js";
import { $, hit } from "./dom.js";
import { reveal } from "./collapsible.js";

const CHIP_LABEL = {int:"Intensidad", rest:"Descanso", tempo:"Tempo"};

export function createRoutines(ctx){
  const list = $("routineList"), {sel, view} = ctx, progress = createRoutineProgress();

  const chips = p => p.chips.length
    ? `<div class="rx-chips">${p.chips.map(c => `<span class="rx-chip ${c.kind}" title="${CHIP_LABEL[c.kind]}">${esc(c.text)}</span>`).join("")}</div>` : "";
  const notes = p => p.notes.map(n => `<p class="rx-note">${esc(n)}</p>`).join("");

  function item(p, i, done){
    if (p.kind === "note") return `<li class="rx rx-tip rx-plain"><div class="rx-main"><div class="rx-name">${esc(p.title)}</div>${chips(p)}${notes(p)}</div></li>`;
    const isDone = p.check && done.has(i);
    const mark = p.check
      ? `<button type="button" class="rx-mark" data-row="${i}" aria-pressed="${isDone}" aria-label="${isDone ? "Desmarcar" : "Marcar hecho"}: ${esc(p.title)}">${isDone ? "✓" : esc(p.tag || "")}</button>`
      : p.tag ? `<span class="rx-mark static">${esc(p.tag)}</span>` : "";
    const body = p.kind === "steps"
      ? `<ol class="rx-steps">${p.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`
      : chips(p) + notes(p);
    const cls = ["rx", p.group && "ss ss-" + p.group, isDone && "done", p.kind === "steps" && "rx-warm", !mark && "rx-plain"].filter(Boolean).join(" ");
    return `<li class="${cls}">${mark}<div class="rx-main">${p.group === "start" ? `<span class="rx-ss">Superserie</span>` : ""}
      <div class="rx-head"><span class="rx-name">${esc(p.title)}</span>${p.amount ? `<span class="rx-amt">${esc(p.amount)}</span>` : ""}</div>${body}</div></li>`;
  }

  function linkChips(r){
    const task = r.taskId ? sel.task(r.taskId) : null, block = r.blockId ? sel.block(r.blockId) : null;
    const out = [];
    if (block) out.push(`<span class="tchip sched">${esc(SHORT[block.day])} ${esc(fmt(block.s))}</span>`);
    if (task) out.push(`<span class="tchip sched">Tarea: ${esc(task.title)}</span>`);
    return out.join("");
  }

  function card(r){
    const parsed = parseRoutine(r.rows), done = progress.done(r.id);
    const total = parsed.filter(p => p.check).length, hechos = parsed.filter((p, i) => p.check && done.has(i)).length;
    const count = total
      ? `<span class="rt-count${hechos === total ? " full" : ""}">${hechos ? `${hechos}/${total} hechos` : `${total} ${total === 1 ? "ejercicio" : "ejercicios"}`}</span>`
      : `<span class="rt-count">${parsed.length} ${parsed.length === 1 ? "fila" : "filas"}</span>`;
    const bar = hechos ? `<div class="rt-bar" aria-hidden="true"><span style="width:${hechos / total * 100}%"></span></div>` : "";
    const content = parsed.length ? `<ol class="rx-list">${parsed.map((p, i) => item(p, i, done)).join("")}</ol>` : `<p class="rt-empty">Esta rutina todavía no tiene filas.</p>`;
    return `<details class="routine" id="routine-${esc(r.id)}" data-routine-id="${esc(r.id)}"${view.openRoutines.has(r.id) ? " open" : ""}>
      <summary><span class="rt-title">${esc(r.title)}</span>${linkChips(r)}${count}${bar}</summary>
      <div class="rt-body">${content}<div class="rt-act">${hechos ? `<button type="button" class="link-btn" data-reset>Reiniciar</button>` : ""}<button type="button" class="link-btn" data-edit>Editar</button></div></div></details>`;
  }

  function render(){
    const rs = sel.routines().map(r => ({...r, rows:Array.isArray(r.rows) ? r.rows : []}));
    list.innerHTML = rs.length ? rs.map(card).join("")
      : `<div class="empty">Crea una rutina con “Nueva rutina”: una lista con los pasos, ejercicios o puntos a seguir. Puedes ligarla a una tarea o a un bloque.</div>`;
  }

  list.addEventListener("click", e => {
    const id = e.target.closest("[data-routine-id]")?.dataset.routineId; if (!id) return;
    const mark = e.target.closest(".rx-mark[data-row]");
    if (mark) { progress.toggle(id, Number(mark.dataset.row)); render(); return; }
    if (hit(e, "data-reset")) { progress.reset(id); render(); return; }
    if (hit(e, "data-edit")) ctx.open.routineEditor(id);
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
