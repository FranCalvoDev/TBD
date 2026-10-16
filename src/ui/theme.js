// Tema claro/oscuro. El claro es el predeterminado; la elección se guarda en cada dispositivo (no se sincroniza).
import { safeStorage } from "../core/utils.js";
import { KEYS, LEGACY } from "../storage/keys.js";
import { $ } from "./dom.js";

// Color de la barra del navegador en el celular, igual al fondo de cada tema.
const BAR = {light:"#F5F5F7", dark:"#000000"};

export function initTheme(storage = safeStorage()){
  const root = document.documentElement, meta = document.querySelector('meta[name="theme-color"]');
  const apply = t => {
    root.setAttribute("data-theme", t);
    meta?.setAttribute("content", BAR[t]);
    $("themeBtn").textContent = t === "dark" ? "Tema claro" : "Tema oscuro";
  };
  apply((storage.get(KEYS.theme) ?? storage.get(LEGACY.theme)) === "dark" ? "dark" : "light");
  $("themeBtn").addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(next); storage.set(KEYS.theme, next);
  });
}
