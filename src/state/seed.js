// Datos iniciales de un dispositivo sin nada guardado: solo las categorías genéricas.
// Sin bloques, metas ni tareas: cada persona arma su semana.
// Tienen updatedAt 1, así que cualquier dato real (de este u otro dispositivo) les gana al sincronizar.
import { STARTER_CATEGORIES } from "../data/categories.js";

const SEED = {updatedAt:1, deviceId:"semilla"};
export const seedChanges = () => STARTER_CATEGORIES.map((c, order) => ({col:"categories", rec:{...c, order, ...SEED}}));
