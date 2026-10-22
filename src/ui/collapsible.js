// Secciones plegables: tocar el título oculta o muestra el contenido. El estado se recuerda en el dispositivo.
import { safeStorage } from "../core/utils.js";
import { KEYS } from "../storage/keys.js";

const SKIP = new Set(["datos"]); // «Tus datos» ya tiene su propio interruptor

export function initCollapsible(storage = safeStorage()){
  let folded = new Set(Array.isArray(storage.get(KEYS.folded)) ? storage.get(KEYS.folded) : []);
  const save = () => storage.set(KEYS.folded, [...folded]);

  function set(section, fold){
    section.classList.toggle("folded", fold);
    section.querySelector(".sec-toggle").setAttribute("aria-expanded", String(!fold));
    section.querySelector(":scope > .sec-body").hidden = fold;
    fold ? folded.add(section.id) : folded.delete(section.id);
  }

  document.querySelectorAll(".wrap > section[id]").forEach(section => {
    if (SKIP.has(section.id)) return;
    const head = section.querySelector(":scope > h2, :scope > .goals-head");
    const title = head?.matches("h2") ? head : head?.querySelector("h2");
    if (!head || !title) return;

    const body = document.createElement("div");
    body.className = "sec-body"; body.id = `${section.id}-body`;
    while (head.nextSibling) body.append(head.nextSibling);
    head.after(body);

    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "sec-toggle";
    btn.setAttribute("aria-controls", body.id);
    btn.append(...title.childNodes, Object.assign(document.createElement("i"), {className:"chev"}));
    title.append(btn);
    btn.addEventListener("click", () => { set(section, !section.classList.contains("folded")); save(); });
    set(section, folded.has(section.id));
  });
}

/** Despliega la sección que contiene `el` (si estaba plegada) para poder mostrarlo. */
export function reveal(el){
  const section = el?.closest("section.folded");
  if (!section) return;
  section.classList.remove("folded");
  section.querySelector(".sec-toggle").setAttribute("aria-expanded", "true");
  section.querySelector(":scope > .sec-body").hidden = false;
}
