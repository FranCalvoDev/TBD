// Categorías y días: la base de colores y nombres de toda la app.
export const CATS = {
  trabajo:{name:"Búsqueda laboral"}, proyectos:{name:"Proyectos"}, estudio:{name:"Facultad y cursos"},
  gym:{name:"Gimnasio"}, contenido:{name:"Contenido"}, social:{name:"Social"},
  personal:{name:"Personal"}, rutina:{name:"Rutina y comidas"}
};
export const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
export const SHORT = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
export const CAT_IDS = Object.keys(CATS);
export const catVar = c => `var(--c-${CATS[c] ? c : "rutina"})`;
export const catName = c => CATS[c]?.name || "";
