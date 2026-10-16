// Días de la semana y paleta de colores para categorías.
export const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
export const SHORT = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

/** Los 8 colores de categoría (variables --c1 … --c8 en tokens.css), en el orden validado. */
export const PALETTE = [
  {id:"c1", name:"Azul acero"}, {id:"c2", name:"Verde"}, {id:"c3", name:"Violeta"}, {id:"c4", name:"Cobre"},
  {id:"c5", name:"Ciruela"}, {id:"c6", name:"Latón"}, {id:"c7", name:"Petróleo"}, {id:"c8", name:"Plata"}
];

/** Categorías iniciales genéricas. Cada persona las renombra, cambia de color o borra. */
export const STARTER_CATEGORIES = [
  {id:"trabajo", name:"Trabajo", color:"c1"}, {id:"proyectos", name:"Proyectos", color:"c2"},
  {id:"estudio", name:"Estudio", color:"c3"}, {id:"ejercicio", name:"Ejercicio", color:"c4"},
  {id:"creatividad", name:"Creatividad", color:"c5"}, {id:"social", name:"Social", color:"c6"},
  {id:"personal", name:"Personal", color:"c7"}, {id:"rutina", name:"Rutina", color:"c8"}
];
