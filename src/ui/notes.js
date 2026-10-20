// Sección Notas: tarjetas con tips y recordatorios, y su editor.
import { catVar, catName } from "../state/categories.js";
import { esc } from "../core/utils.js";
import { sortNotes } from "../domain/notes.js";
import { richText } from "./richText.js";
import { $, hit } from "./dom.js";

export function createNotes(ctx){
  const list = $("notesList"), dlg = $("noteDlg"), {sel, act} = ctx;
  let editId = null;

  function categorySelect(selected){
    const cats = sel.categories();
    return `<option value=""${selected ? "" : " selected"}>Sin categoría</option>` +
      cats.map(c => `<option value="${esc(c.id)}"${c.id === selected ? " selected" : ""}>${esc(c.name)}</option>`).join("") +
      (selected && !cats.some(c => c.id === selected) ? `<option value="${esc(selected)}" selected>Categoría borrada</option>` : "");
  }

  function open(id){
    editId = id || null;
    const n = id ? sel.note(id) : {title:"", text:"", cat:"", pinned:false};
    if (!n) return;
    $("nHead").textContent = id ? "Editar nota" : "Nueva nota";
    $("nTitle").value = n.title || "";
    $("nText").value = n.text || "";
    $("nCat").innerHTML = categorySelect(n.cat || "");
    $("nPin").checked = !!n.pinned;
    $("nErr").textContent = "";
    $("nDel").style.visibility = id ? "visible" : "hidden";
    dlg.style.setProperty("--cat", n.cat ? catVar(n.cat) : "var(--accent)");
    dlg.showModal();
    $("nTitle").focus();
  }

  $("nCat").addEventListener("change", e => dlg.style.setProperty("--cat", e.target.value ? catVar(e.target.value) : "var(--accent)"));
  $("nSave").addEventListener("click", () => {
    const title = $("nTitle").value.trim(), text = $("nText").value.trim();
    if (!title && !text) { $("nErr").textContent = "Escribe un título o un texto."; return; }
    act.saveNote({title, text, cat:$("nCat").value, pinned:$("nPin").checked}, editId);
    dlg.close();
  });
  $("nCancel").addEventListener("click", () => dlg.close());
  $("nDel").addEventListener("click", async () => {
    const n = sel.note(editId); if (!n) return;
    dlg.close();
    if (await ctx.confirm("Eliminar nota", `¿Eliminar «${n.title || "esta nota"}»?`, "Eliminar")) act.deleteNote(n.id);
  });
  $("addNote").addEventListener("click", () => open(null));

  list.addEventListener("click", e => {
    const card = e.target.closest("[data-note]"); if (!card) return;
    if (hit(e, "data-pin")) return act.togglePin(card.dataset.note);
    if (hit(e, "data-edit")) return open(card.dataset.note);
    if (hit(e, "data-more")) card.classList.toggle("open");
  });

  function render(){
    const notes = sortNotes(sel.notes());
    if (!notes.length) {
      list.innerHTML = `<div class="empty">Guarda tips, ideas o cosas que no quieras olvidar. Si les pones una categoría, aparecen solas cuando estás en un bloque de esa categoría.</div>`;
      return;
    }
    list.innerHTML = notes.map(n => {
      const long = (n.text || "").length > 220 || (n.text || "").split("\n").length > 5;
      return `<article class="note${n.pinned ? " pinned" : ""}" id="note-${esc(n.id)}" data-note="${esc(n.id)}" style="--cat:${n.cat ? catVar(n.cat) : "var(--line-strong)"}">
        <div class="note-top">
          <span class="note-cat">${n.cat ? esc(catName(n.cat)) : "Sin categoría"}</span>
          <button type="button" class="pin" data-pin aria-pressed="${!!n.pinned}" aria-label="${n.pinned ? "Desfijar" : "Fijar"} ${esc(n.title || "nota")}">${n.pinned ? "Fijada" : "Fijar"}</button>
        </div>
        ${n.title ? `<h3>${esc(n.title)}</h3>` : ""}
        <div class="note-body${long ? " clamp" : ""}">${richText(n.text)}</div>
        <div class="note-actions">${long ? `<button type="button" class="link-btn" data-more>Ver más</button>` : ""}<button type="button" class="link-btn" data-edit>Editar</button></div>
      </article>`;
    }).join("");
  }

  /** Lleva a una nota y la resalta. */
  function goTo(id){
    const el = document.getElementById("note-" + id); if (!el) return;
    el.classList.add("open");
    el.scrollIntoView({behavior:"smooth", block:"center"});
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  return {render, open, goTo};
}
