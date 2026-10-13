// Datos iniciales de un dispositivo sin nada guardado. Tienen updatedAt 1, así que
// cualquier dato real (de este u otro dispositivo) les gana al sincronizar.
import { defaultBlocks } from "../data/defaultWeek.js";
import { defaultGoals } from "../data/goals.js";

const SEED = {updatedAt:1, deviceId:"semilla"};
export const seedChanges = () => [
  ...defaultBlocks().map(rec => ({col:"blocks", rec:{...rec, ...SEED}})),
  ...defaultGoals().map(rec => ({col:"goals", rec:{...rec, ...SEED}}))
];
