// «Recordatorio»: debajo del bloque «ahora», el entrenamiento de hoy y una nota para tener presente.
import { catVar } from "../state/categories.js";
import { esc } from "../core/utils.js";
import { toMin, nowInfo } from "../core/time.js";
import { pickReminder } from "../domain/notes.js";
import { todaysDay, programWeek } from "../domain/training.js";
import { preview } from "./richText.js";
import { $, hit } from "./dom.js";

export function createReminder(ctx){
  const el = $("reminder"), {sel} = ctx;

  el.addEventListener("click", e => {
    const t = hit(e, "data-train"); if (t) return ctx.open.trainingDay(t.dataset.train);
    const n = hit(e, "data-note"); if (n) ctx.open.goToNote(n.dataset.note);
  });

  return function render(){
    const info = nowInfo(), off = sel.curWeek().off || {};
    const cur = sel.blocksOf(info.day).find(x => !off[x.id] && info.min >= toMin(x.s) && info.min < toMin(x.e));
    const rows = [];

    const routine = sel.activeRoutine(), day = routine && todaysDay(routine, info);
    if (day) {
      const pw = programWeek(routine, info);
      rows.push(`<button type="button" class="rem-row" data-train="${esc(day.id)}" style="--cat:var(--accent)">
        <span class="rem-k">Hoy entrenás</span><span class="rem-t">${esc(day.name)}</span>
        ${pw?.week ? `<span class="rem-s">Semana ${esc(pw.week.label)}${pw.week.goal ? " · " + esc(pw.week.goal) : ""}</span>` : ""}</button>`);
    }
    const pick = pickReminder(sel.notes(), cur?.cat, info);
    if (pick) {
      const n = pick.note;
      rows.push(`<button type="button" class="rem-row" data-note="${esc(n.id)}" style="--cat:${n.cat ? catVar(n.cat) : "var(--ink-3)"}">
        <span class="rem-k">${pick.reason === "block" ? "Para este bloque" : "Recordatorio"}</span>
        <span class="rem-t">${esc(n.title || preview(n.text, 60))}</span>
        ${n.title && n.text ? `<span class="rem-s">${esc(preview(n.text))}</span>` : ""}</button>`);
    }
    el.hidden = !rows.length;
    el.innerHTML = rows.join("");
  };
}
