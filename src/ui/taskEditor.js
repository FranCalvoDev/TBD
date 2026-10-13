// Crear y editar tareas únicas.
import { CATS, catVar } from "../data/categories.js";
import { durTxt } from "../core/time.js";
import { $ } from "./dom.js";

const ESTIMATES = [15, 30, 45, 60, 90, 120, 180, 240];

export function createTaskEditor(ctx){
  const dlg = $("taskDlg"), {sel, act, view} = ctx, est = $("tEst");
  let editId = null;
  $("tCat").innerHTML = Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");
  est.innerHTML = ESTIMATES.map(m => `<option value="${m}">${durTxt(m)}</option>`).join("");

  function open(id){
    editId = id || null;
    const t = id ? sel.task(id) : {title:"", est:30, cat:"personal", due:""};
    if (!t) return;
    $("tdTitle").textContent = id ? "Editar tarea" : "Nueva tarea";
    $("tTitle").value = t.title;
    if (![...est.options].some(o => Number(o.value) === t.est)) est.insertAdjacentHTML("beforeend", `<option value="${t.est}">${durTxt(t.est)}</option>`);
    est.value = t.est;
    $("tCat").value = t.cat;
    $("tDue").value = t.due || "";
    $("tErr").textContent = "";
    $("tDel").style.visibility = id ? "visible" : "hidden";
    dlg.style.setProperty("--cat", catVar(t.cat));
    dlg.showModal();
    $("tTitle").focus();
  }

  $("tCat").addEventListener("change", e => dlg.style.setProperty("--cat", catVar(e.target.value)));
  $("tSave").addEventListener("click", () => {
    const title = $("tTitle").value.trim();
    if (!title) { $("tErr").textContent = "Escribe qué tienes que hacer."; return; }
    const id = act.saveTask({title, est:Number(est.value), cat:$("tCat").value, due:$("tDue").value || ""}, editId);
    if (!editId && id) view.openSugg.add(id); // tarea nueva: mostrar enseguida dónde entra
    dlg.close();
  });
  $("tCancel").addEventListener("click", () => dlg.close());
  $("tDel").addEventListener("click", async () => {
    const t = sel.task(editId); if (!t) return;
    dlg.close();
    if (await ctx.confirm("Eliminar tarea", `¿Eliminar “${t.title}”? Si ya la habías completado, deja de contar en tus estadísticas.`, "Eliminar")) act.deleteTask(t.id);
  });

  return {open, isOpen: () => dlg.open};
}
