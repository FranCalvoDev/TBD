// Metas de la semana: contadores y modo edición.
import { catVar, catName } from "../state/categories.js";
import { esc } from "../core/utils.js";
import { $, hit, categoryOptions } from "./dom.js";

export function createGoals(ctx){
  const el = $("goals"), btn = $("editGoals"), {sel, act, view} = ctx;

  btn.addEventListener("click", () => { view.editingGoals = !view.editingGoals; render(); });
  el.addEventListener("click", async e => {
    const bump = hit(e, "data-bump");
    if (bump) return act.bumpGoal(bump.closest("[data-goal]").dataset.goal, Number(bump.dataset.bump));
    if (hit(e, "data-add")) {
      // Meta nueva: modo edición con el nombre listo para escribir.
      const id = act.addGoal(); view.editingGoals = true;
      return ctx.afterRender(() => { const inp = el.querySelector(`[data-k="${CSS.escape(id + ":label")}"]`); inp?.focus(); inp?.select(); });
    }
    const del = hit(e, "data-del");
    if (del) {
      const g = sel.goals().find(x => x.id === del.closest("[data-goal]").dataset.goal); if (!g) return;
      if (await ctx.confirm("Eliminar meta", `¿Eliminar la meta “${g.label}”? Lo que ya sumaste queda guardado en semanas anteriores.`, "Eliminar")) act.deleteGoal(g.id);
    }
  });
  el.addEventListener("change", e => {
    const inp = e.target.closest("[data-f]"); if (!inp) return;
    const g = sel.goals().find(x => x.id === inp.closest("[data-goal]").dataset.goal); if (!g) return;
    const f = inp.dataset.f;
    if (f === "target") act.updateGoal(g.id, {target:Math.max(1, Math.min(999, parseInt(inp.value) || 1))});
    else if (f === "label") act.updateGoal(g.id, {label:inp.value.trim() || g.label});
    else act.updateGoal(g.id, {cat:inp.value});
  });

  function card(g, v){
    if (view.editingGoals) return `<div class="goal" data-goal="${esc(g.id)}" style="--cat:${catVar(g.cat)}">
      <input class="edit-in" data-f="label" data-k="${esc(g.id)}:label" value="${esc(g.label)}" maxlength="50" aria-label="Nombre de la meta">
      <div class="edit-row"><select class="edit-in" data-f="cat" data-k="${esc(g.id)}:cat" aria-label="Categoría">${categoryOptions(sel, g.cat)}</select>
      <input class="edit-in" data-f="target" data-k="${esc(g.id)}:target" type="number" min="1" max="999" value="${g.target}" aria-label="Objetivo semanal"></div>
      <div class="edit-row"><button type="button" class="btn danger" data-del data-k="${esc(g.id)}:del">Eliminar meta</button></div></div>`;
    return `<div class="goal" data-goal="${esc(g.id)}" style="--cat:${catVar(g.cat)}"><div class="gc">${catName(g.cat)}</div><p class="gl">${esc(g.label)}</p>
      <div class="row"><span class="num">${v}<small> / ${g.target}</small></span>
      <button type="button" data-bump="-1" data-k="${esc(g.id)}:-" aria-label="Restar uno a ${esc(g.label)}">−</button><button type="button" data-bump="1" data-k="${esc(g.id)}:+" aria-label="Sumar uno a ${esc(g.label)}">+</button></div>
      <div class="gb"><span style="width:${Math.min(v/g.target, 1)*100}%"></span></div></div>`;
  }

  function render(){
    // Al redibujar, mantener el foco donde estaba (p. ej. al tabular entre campos o sumar varias veces).
    const focusKey = el.contains(document.activeElement) ? document.activeElement.dataset.k : null;
    const goals = sel.goals(), w = sel.curWeek();
    if (!goals.length) view.editingGoals = false;
    btn.hidden = !goals.length;
    btn.textContent = view.editingGoals ? "Listo" : "Editar metas";
    el.innerHTML = goals.map(g => card(g, w.goals?.[g.id] || 0)).join("") +
      (view.editingGoals || !goals.length ? `<button type="button" class="goal new" data-add data-k="add">${goals.length ? "+ Agregar meta" : "+ Agregar tu primera meta"}</button>` : "");
    if (focusKey) el.querySelector(`[data-k="${CSS.escape(focusKey)}"]`)?.focus();
  }
  return render;
}
