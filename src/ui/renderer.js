// Agrupa los redibujados en un solo cuadro de animación y redibuja solo
// las secciones que dependen de las colecciones que cambiaron.
const DEPS = {
  hero:        ["blocks", "tasks", "weeks"],
  legend:      ["blocks"],
  week:        ["blocks", "tasks", "weeks"],
  mobile:      ["blocks", "tasks", "weeks"],
  blockDialog: ["blocks", "tasks", "weeks"],
  tasks:       ["blocks", "tasks", "weeks"],
  goals:       ["goals", "weeks"],
  stats:       ["blocks", "goals", "tasks", "weeks"]
};

export function createRenderer(sections){
  const dirty = new Set(), after = [];
  let frame = 0;
  function flush(){
    frame = 0;
    const names = [...dirty]; dirty.clear();
    names.forEach(n => sections[n]?.());
    after.splice(0).forEach(fn => fn());
  }
  const request = () => { if (!frame) frame = requestAnimationFrame(flush); };
  return {
    invalidate(names){ names.forEach(n => dirty.add(n)); request(); },
    onStoreChange(cols){ Object.keys(DEPS).forEach(n => { if (DEPS[n].some(c => cols.has(c))) dirty.add(n); }); request(); },
    all(){ Object.keys(sections).forEach(n => dirty.add(n)); request(); },
    /** Ejecuta `fn` después del próximo redibujado (p. ej. para hacer scroll a algo nuevo). */
    afterRender(fn){ after.push(fn); request(); }
  };
}
