// Vista por día para pantallas angostas.
import { DAYS, SHORT } from "../data/categories.js";
import { catVar, catName } from "../state/categories.js";
import { toMin, fmt, nowInfo } from "../core/time.js";
import { esc } from "../core/utils.js";
import { $, hit } from "./dom.js";

export function createMobileDay(ctx){
  const tabs = $("tabs"), list = $("list"), {sel, view} = ctx;

  tabs.addEventListener("click", e => {
    const t = hit(e, "data-day"); if (!t) return;
    view.selDay = Number(t.dataset.day); render();
  });
  list.addEventListener("click", e => {
    const it = hit(e, "data-id"); if (!it) return;
    it.dataset.kind === "task" ? ctx.open.goToTask(it.dataset.id) : ctx.open.block(it.dataset.id);
  });

  function render(){
    const {day, min} = nowInfo(), w = sel.curWeek(), done = w.done || {}, off = w.off || {}, d = view.selDay;
    tabs.innerHTML = DAYS.map((_, i) => `<button type="button" role="tab" data-day="${i}" class="tab${i === day ? " today" : ""}" aria-selected="${i === d}">${SHORT[i]}${i === day ? " (hoy)" : ""}</button>`).join("");
    const items = [
      ...sel.blocksOf(d).map(x => ({kind:"block", id:x.id, s:x.s, e:x.e, cat:x.cat, title:x.title, done:!!done[x.id], off:!!off[x.id]})),
      ...sel.tasksAt(sel.curKey(), d, true).map(t => ({kind:"task", id:t.id, s:t.slot.s, e:t.slot.e, cat:t.cat, title:t.title, done:t.done, off:false}))
    ].sort((a, b) => toMin(a.s) - toMin(b.s));
    if (!items.length) { list.innerHTML = `<div class="empty">No hay bloques este día. Usa “Agregar bloque” para crear uno.</div>`; return; }
    list.innerHTML = items.map(x => {
      const isNow = d === day && min >= toMin(x.s) && min < toMin(x.e);
      const cls = "item" + (x.kind === "task" ? " task" : "") + (x.off ? " off" : "") + (view.hidden.has(x.cat) ? " dim" : "") + (x.done ? " done" : "") + (isNow ? " now" : "");
      return `<button type="button" class="${cls}" data-kind="${x.kind}" data-id="${esc(x.id)}" style="--cat:${catVar(x.cat)}"><div class="tm">${fmt(x.s)}<br>${fmt(x.e)}</div><div><div class="cn">${x.kind === "task" ? "Tarea" : esc(catName(x.cat))}${x.off ? ", horario libre" : ""}${isNow ? ", ahora" : ""}</div><div class="tt">${x.done ? "✓ " : ""}${esc(x.title)}</div></div></button>`;
    }).join("");
  }
  return render;
}
