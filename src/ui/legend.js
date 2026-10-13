// Filtro por categoría: resalta una o varias áreas en la grilla.
import { CATS, CAT_IDS, catVar } from "../data/categories.js";
import { $, hit } from "./dom.js";

export function createLegend(ctx){
  const el = $("legend"), {view} = ctx;
  const refresh = () => ctx.invalidate(["legend", "week", "mobile"]);
  el.addEventListener("click", e => {
    const b = hit(e, "data-cat"); if (!b) return;
    const k = b.dataset.cat;
    view.active.has(k) && view.active.size > 1 ? view.active.delete(k) : view.active.add(k);
    refresh();
  });
  $("showAll").addEventListener("click", () => { view.active = new Set(CAT_IDS); refresh(); });

  return function render(){
    const mins = ctx.sel.planned().catMin;
    el.innerHTML = Object.entries(CATS).map(([k, v]) => {
      const h = (mins[k] || 0) / 60;
      return `<button type="button" class="chip" data-cat="${k}" style="--cat:${catVar(k)}" aria-pressed="${view.active.has(k)}"><i></i>${v.name} <small>${Number.isInteger(h) ? h : h.toFixed(1)} h</small></button>`;
    }).join("");
  };
}
