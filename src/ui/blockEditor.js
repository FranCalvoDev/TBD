// Crear y editar bloques de la semana tipo.
import { CATS, DAYS, catVar } from "../data/categories.js";
import { fmt } from "../core/time.js";
import { validateBlock } from "../domain/validation.js";
import { $ } from "./dom.js";

export function createBlockEditor(ctx){
  const ed = $("edit"), {sel, act, view} = ctx;
  let editId = null;
  $("fDay").innerHTML = DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join("");
  $("fCat").innerHTML = Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");
  const syncColor = () => ed.style.setProperty("--cat", catVar($("fCat").value));

  function open(id){
    editId = id || null;
    const x = id ? sel.block(id) : {day:view.selDay, s:"10:00", e:"11:00", cat:"proyectos", title:"", p:"", l:[]};
    if (!x) return;
    $("eTitle").textContent = id ? "Editar bloque" : "Nuevo bloque";
    $("eCat").textContent = id ? DAYS[x.day] : "Agregar a tu semana";
    $("fTitle").value = x.title;
    $("fDay").value = x.day;
    $("fCat").value = x.cat;
    $("fS").value = fmt(x.s);
    $("fE").value = fmt(x.e);
    $("fP").value = x.p || "";
    $("fL").value = (x.l || []).join("\n");
    $("fErr").textContent = "";
    $("eDel").style.visibility = id ? "visible" : "hidden";
    syncColor();
    ed.showModal();
    $("fTitle").focus();
  }

  $("fCat").addEventListener("change", syncColor);
  $("eSave").addEventListener("click", () => {
    const day = Number($("fDay").value);
    const res = validateBlock({title:$("fTitle").value, day, cat:$("fCat").value, s:$("fS").value, e:$("fE").value, p:$("fP").value, l:$("fL").value},
      sel.blocksOf(day), editId);
    if (res.error) { $("fErr").textContent = res.error; return; }
    act.saveBlock(res.value, editId);
    view.selDay = day;
    ed.close();
    ctx.invalidate(["mobile"]);
  });
  $("eCancel").addEventListener("click", () => ed.close());
  $("eDel").addEventListener("click", async () => {
    const x = sel.block(editId); if (!x) return;
    ed.close();
    if (await ctx.confirm("Eliminar bloque", `¿Eliminar “${x.title}” del ${DAYS[x.day].toLowerCase()}? Lo que ya marcaste como hecho sigue contando en tus estadísticas.`, "Eliminar"))
      act.deleteBlock(x.id);
  });

  return {open};
}
