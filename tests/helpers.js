import { createStore, toChanges } from "../src/state/store.js";
import { createSelectors } from "../src/state/selectors.js";
import { createActions } from "../src/state/actions.js";
import { seedChanges } from "../src/state/seed.js";
import { setCategories } from "../src/state/categories.js";
import { fixtureRecords } from "./fixtures.js";
import { safeStorage } from "../src/core/utils.js";

/** Imitación de localStorage para Node. */
export function memoryStorage(){
  const m = new Map();
  return safeStorage({getItem:k => m.has(k) ? m.get(k) : null, setItem:(k, v) => m.set(k, String(v)), removeItem:k => m.delete(k)});
}

/**
 * App sin interfaz: store, selectores y acciones.
 * Por defecto con la semana de ejemplo; con records = "empty" arranca como una instalación nueva.
 */
export function makeApp(deviceId = "dev-a", records = fixtureRecords()){
  const store = createStore({deviceId});
  store.merge(records === "empty" ? seedChanges() : toChanges(records), "load");
  const sel = createSelectors(store);
  setCategories(sel.categories());
  return {store, sel, act:createActions(store, sel)};
}
