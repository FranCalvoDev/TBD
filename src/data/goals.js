// Metas semanales por defecto.
const GOALS = [
  {id:"postu",label:"Postulaciones adaptadas",cat:"trabajo",target:15},
  {id:"msgs",label:"Mensajes de contacto",cat:"trabajo",target:5},
  {id:"gym",label:"Días de gimnasio",cat:"gym",target:4},
  {id:"li",label:"Publicaciones en LinkedIn",cat:"contenido",target:2},
  {id:"main",label:"Pieza principal de contenido",cat:"contenido",target:1},
  {id:"shorts",label:"Cortos publicados",cat:"contenido",target:3}
];

/** Metas iniciales; `order` mantiene el orden en pantalla y en la base de datos. */
export const defaultGoals = () => GOALS.map((g,i) => ({...g, order:i}));
