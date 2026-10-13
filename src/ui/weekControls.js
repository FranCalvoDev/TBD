// Botones sobre la grilla: agregar bloque, reiniciar la semana y restaurar la rutina.
import { $ } from "./dom.js";

export function bindWeekControls(ctx){
  $("addBlock").addEventListener("click", () => ctx.open.editor(null));
  $("resetWeek").addEventListener("click", async () => {
    if (await ctx.confirm("Reiniciar la semana", "Se borran los bloques hechos y las metas de esta semana. Las semanas anteriores no cambian.", "Reiniciar"))
      ctx.act.resetWeek();
  });
  $("restore").addEventListener("click", async () => {
    if (await ctx.confirm("Restaurar rutina original", "Tus bloques vuelven a la semana tipo original y se pierden los cambios que hiciste en ellos. Tu progreso y tus metas no cambian.", "Restaurar"))
      ctx.act.restoreBlocks();
  });
}
