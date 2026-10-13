// Tema claro/oscuro. Es una preferencia de cada dispositivo, no se sincroniza.
import { safeStorage } from "../core/utils.js";
import { KEYS } from "../storage/keys.js";
import { $ } from "./dom.js";

export function initTheme(storage = safeStorage()){
  const root = document.documentElement;
  const saved = storage.get(KEYS.theme);
  if (saved) root.setAttribute("data-theme", saved);
  $("themeBtn").addEventListener("click", () => {
    const cur = root.getAttribute("data-theme");
    const dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next); storage.set(KEYS.theme, next);
  });
}
