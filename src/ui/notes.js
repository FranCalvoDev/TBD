// Notas y sugerencias personales. Se guardan solo en este dispositivo (no se sincronizan).
import { esc, safeStorage, uid } from "../core/utils.js";
import { KEYS } from "../storage/keys.js";
import { $ } from "./dom.js";

const KINDS = {tip:"Tip", sugerencia:"Sugerencia", nota:"Nota"};

export function initNotes(storage = safeStorage()){
  const form = $("noteForm"), text = $("noteText"), kind = $("noteKind"), list = $("noteList");
  const saved = storage.get(KEYS.notes);
  let notes = Array.isArray(saved) ? saved.filter(n => n && typeof n.text === "string") : [];
  const save = () => storage.set(KEYS.notes, notes);
  let selected = "nota";
  const pick = k => {
    selected = k;
    kind.querySelectorAll("[data-kind]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.kind === k)));
  };
  kind.addEventListener("click", e => { const b = e.target.closest("[data-kind]"); if (b) pick(b.dataset.kind); });

  function render(){
    list.innerHTML = notes.length
      ? notes.map(n => `<article class="note" data-id="${esc(n.id)}">
          <div class="note-head"><span class="tchip">${esc(KINDS[n.kind] || KINDS.nota)}</span>
          <time>${esc(new Date(n.at).toLocaleDateString("es"))}</time>
          <button type="button" class="link-btn" data-del aria-label="Eliminar nota">Eliminar</button></div>
          <p>${esc(n.text)}</p></article>`).join("")
      : `<div class="empty">Todavía no tienes notas.</div>`;
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    const value = text.value.trim();
    if (!value) return text.focus();
    notes = [{id:uid(),     kind:selected, text:value, at:Date.now()}, ...notes];
        save(); text.value = ""; pick("nota"); render();
  });
  list.addEventListener("click", e => {
    const btn = e.target.closest("[data-del]"); if (!btn) return;
    const id = btn.closest("[data-id]").dataset.id;
    notes = notes.filter(n => n.id !== id);
    save(); render();
  });
  render();
}
