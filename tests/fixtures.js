// Semana de ejemplo para los tests (datos genéricos, no son de nadie).
import { STARTER_CATEGORIES } from "../src/data/categories.js";

const b = (day, i, s, e, cat, title) => ({id:`d${day}b${i}`, day, s, e, cat, title, p:"", l:[]});
const META = {updatedAt:1, deviceId:"fixture"};

export const FIXTURE_BLOCKS = [
  b(0,0,"08:30","09:00","rutina","Mañana"), b(0,1,"09:00","10:00","trabajo","Correos"), b(0,2,"10:00","13:00","proyectos","Proyecto"), b(0,3,"13:00","14:00","rutina","Almuerzo"),
  b(1,0,"08:30","09:00","rutina","Mañana"), b(1,1,"09:00","12:00","estudio","Curso"), b(1,2,"12:00","13:00","rutina","Almuerzo"), b(1,3,"13:00","14:00","trabajo","Llamadas"),
  b(1,4,"14:00","16:00","creatividad","Edición"), b(1,5,"17:00","18:30","ejercicio","Gimnasio"), b(1,6,"19:00","20:00","estudio","Clase"), b(1,7,"20:30","22:00","social","Amigos"),
  b(1,8,"23:30","24:30","rutina","Cierre"),
  b(2,0,"09:00","10:00","trabajo","Correos")
];
export const FIXTURE_GOALS = [{id:"gym", label:"Días de gimnasio", cat:"ejercicio", target:4, order:0}];

export const fixtureRecords = () => ({
  categories: STARTER_CATEGORIES.map((c, order) => ({...c, order, ...META})),
  blocks: FIXTURE_BLOCKS.map(x => ({...x, ...META})),
  goals: FIXTURE_GOALS.map(x => ({...x, ...META})),
  tasks: [], weeks: []
});
