// Agrupa los redibujados en un solo cuadro de animación y redibuja solo
// las secciones que dependen de las colecciones que cambiaron.
const DEPS = {
  hero:        ["categories", "blocks", "tasks", "weeks"],
  legend:      ["categories", "blocks"],
  week:        ["categories", "blocks", "tasks", "weeks"],
  mobile:      ["categories", "blocks", "tasks", "weeks"],
  blockDialog: ["categories", "blocks", "tasks", "weeks"],
  tasks:       ["categories", "blocks", "tasks", "weeks"],
  goals:       ["categories", "goals", "weeks"],
  stats:       ["categories", "blocks", "goals", "tasks", "weeks"],
  categories:  ["categories"]
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
