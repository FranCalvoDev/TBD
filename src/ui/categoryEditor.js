// Editor de categorías: nombre, color (de la paleta validada) y borrar.
import { PALETTE } from "../data/categories.js";
import { esc } from "../core/utils.js";
import { $, hit } from "./dom.js";

export function createCategoryEditor(ctx){
  const dlg = $("catDlg"), list = $("catList"), {sel, act} = ctx;

  list.addEventListener("click", async e => {
    const row = e.target.closest("[data-cat-id]"); if (!row) return;
    const id = row.dataset.catId;
    const sw = hit(e, "data-color");
    if (sw) return act.updateCategory(id, {color:sw.dataset.color});
    if (hit(e, "data-del")) {
      const c = sel.category(id); if (!c) return;
      const n = act.categoryUsage(id);
      const msg = n ? `${n} ${n === 1 ? "elemento usa" : "elementos usan"} “${c.name}”. Quedarán como «Sin categoría» y en gris.` : `¿Eliminar “${c.name}”?`;
      dlg.close();
      if (await ctx.confirm("Eliminar categoría", msg, "Eliminar")) act.deleteCategory(id);
      dlg.showModal();
    }
  });
  list.addEventListener("change", e => {
    const inp = e.target.closest("[data-name]"); if (!inp) return;
    const c = sel.category(inp.closest("[data-cat-id]").dataset.catId); if (!c) return;
    act.updateCategory(c.id, {name:inp.value.trim() || c.name});
  });
  $("catAdd").addEventListener("click", () => {
    const id = act.addCategory();
    ctx.afterRender(() => { const inp = list.querySelector(`[data-k="${CSS.escape(id)}:name"]`); inp?.focus(); inp?.select(); });
  });
  $("catDone").addEventListener("click", () => dlg.close());

  function render(){
    if (!dlg.open) return;
    const focusKey = list.contains(document.activeElement) ? document.activeElement.dataset.k : null;
    const cats = sel.categories();
    list.innerHTML = cats.length ? cats.map(c => `<div class="cat-row" data-cat-id="${esc(c.id)}" style="--cat:var(--${c.color})">
        <input class="cat-name" data-name data-k="${esc(c.id)}:name" value="${esc(c.name)}" maxlength="30" aria-label="Nombre de la categoría">
        <div class="swatches" role="radiogroup" aria-label="Color de ${esc(c.name)}">${PALETTE.map(p =>
          `<button type="button" role="radio" class="sw" data-color="${p.id}" data-k="${esc(c.id)}:${p.id}" aria-checked="${p.id === c.color}" aria-label="${p.name}" style="--sw:var(--${p.id})"></button>`).join("")}</div>
        <button type="button" class="cat-del" data-del data-k="${esc(c.id)}:del" aria-label="Eliminar ${esc(c.name)}">Eliminar</button>
      </div>`).join("")
      : `<p class="cat-empty">Todavía no tienes categorías. Crea las áreas de tu vida que quieras organizar: trabajo, estudio, ejercicio…</p>`;
    if (focusKey) list.querySelector(`[data-k="${CSS.escape(focusKey)}"]`)?.focus();
  }

  return {open(){ if (!dlg.open) dlg.showModal(); render(); }, render};
}
