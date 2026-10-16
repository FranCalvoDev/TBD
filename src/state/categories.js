// Registro de categorías para dibujar: color y nombre por id.
// main.js lo actualiza cada vez que cambian las categorías en el store.
let byId = new Map();

export const setCategories = list => { byId = new Map(list.map(c => [c.id, c])); };
/** Color CSS de una categoría; las borradas o vacías se ven en plata neutra. */
export const catVar = id => `var(--${byId.get(id)?.color || "c8"})`;
export const catName = id => byId.get(id)?.name || "Sin categoría";
