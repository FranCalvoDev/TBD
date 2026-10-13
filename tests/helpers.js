import { createStore, toChanges } from "../src/state/store.js";
import { createSelectors } from "../src/state/selectors.js";
import { createActions } from "../src/state/actions.js";
import { seedChanges } from "../src/state/seed.js";
import { safeStorage } from "../src/core/utils.js";

/** Imitación de localStorage para Node. */
export function memoryStorage(){
  const m = new Map();
  return safeStorage({getItem:k => m.has(k) ? m.get(k) : null, setItem:(k, v) => m.set(k, String(v)), removeItem:k => m.delete(k)});
}

/** App sin interfaz: store con la semana tipo, selectores y acciones. */
export function makeApp(deviceId = "dev-a", records = null){
  const store = createStore({deviceId});
  store.merge(records ? toChanges(records) : seedChanges(), "load");
  const sel = createSelectors(store);
  return {store, sel, act:createActions(store, sel)};
}
