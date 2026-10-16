export const $ = id => document.getElementById(id);
export const setText = (id, t) => { $(id).textContent = t; };
/** Primer elemento con el atributo `attr` desde el target del evento hacia arriba. */
export const hit = (e, attr) => e.target.closest(`[${attr}]`);

/** <option> de las categorías actuales; si la elegida ya no existe se muestra como «Sin categoría». */
export function categoryOptions(sel, selected){
  const cats = sel.categories(), known = cats.some(c => c.id === selected);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  return (known || !cats.length ? "" : `<option value="${esc(selected || "")}" selected>Sin categoría</option>`) +
    (cats.length ? "" : `<option value="" selected>Sin categoría</option>`) +
    cats.map(c => `<option value="${esc(c.id)}"${c.id === selected ? " selected" : ""}>${esc(c.name)}</option>`).join("");
}
