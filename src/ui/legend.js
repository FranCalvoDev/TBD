// Filtro por categoría: resalta una o varias áreas en la grilla. «Editar categorías» abre el editor.
import { catVar } from "../state/categories.js";
import { esc } from "../core/utils.js";
import { $, hit } from "./dom.js";

export function createLegend(ctx){
  const el = $("legend"), {view, sel} = ctx;
  const refresh = () => ctx.invalidate(["legend", "week", "mobile"]);
  el.addEventListener("click", e => {
    if (hit(e, "data-edit-cats")) return ctx.open.categories();
    const b = hit(e, "data-cat"); if (!b) return;
    const k = b.dataset.cat, visible = sel.categories().filter(c => !view.hidden.has(c.id)).length;
    if (view.hidden.has(k)) view.hidden.delete(k);
    else if (visible > 1) view.hidden.add(k);
    refresh();
  });
  $("showAll").addEventListener("click", () => { view.hidden.clear(); refresh(); });

  return function render(){
    const mins = sel.planned().catMin;
    el.innerHTML = sel.categories().map(c => {
      const h = (mins[c.id] || 0) / 60;
      return `<button type="button" class="chip" data-cat="${esc(c.id)}" style="--cat:${catVar(c.id)}" aria-pressed="${!view.hidden.has(c.id)}"><i></i>${esc(c.name)} <small>${Number.isInteger(h) ? h : h.toFixed(1)} h</small></button>`;
    }).join("") + `<button type="button" class="chip edit" data-edit-cats>${sel.categories().length ? "Editar categorías" : "+ Crear categorías"}</button>`;
  };
}
