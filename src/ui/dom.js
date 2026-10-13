export const $ = id => document.getElementById(id);
export const setText = (id, t) => { $(id).textContent = t; };
/** Primer elemento con el atributo `attr` desde el target del evento hacia arriba. */
export const hit = (e, attr) => e.target.closest(`[${attr}]`);
