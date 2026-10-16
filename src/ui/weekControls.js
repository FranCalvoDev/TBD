// Botones sobre la grilla: agregar bloque y reiniciar la semana.
import { $ } from "./dom.js";

export function bindWeekControls(ctx){
  $("addBlock").addEventListener("click", () => ctx.open.editor(null));
  $("resetWeek").addEventListener("click", async () => {
    if (await ctx.confirm("Reiniciar la semana", "Se borran los bloques hechos y las metas de esta semana. Las semanas anteriores no cambian.", "Reiniciar"))
      ctx.act.resetWeek();
  });
}
