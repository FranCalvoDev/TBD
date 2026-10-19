// Sección de estadísticas.
import { SHORT } from "../data/categories.js";
import { catVar, catName } from "../state/categories.js";
import { durTxt } from "../core/time.js";
import { esc } from "../core/utils.js";
import { computeStats } from "../domain/stats.js";
import { barChart, legendMini } from "./charts.js";
import { $ } from "./dom.js";

const chart = (title, sub, inner) => `<div class="chart"><h3>${title}</h3><p class="cs">${sub}</p>${inner}</div>`;
const hrs = m => (m/60).toFixed(1).replace(".0", "");

export function createStats(ctx){
  const el = $("stats");
  return function render(){
    $("statsSub").textContent = ctx.sync.enabled
      ? "Se calculan con todo lo que marcas y sumas, y se sincronizan con tu servidor."
      : "Se calculan con todo lo que marcas y sumas en este dispositivo.";
    const st = computeStats(ctx.sel);
    if (!st.hasData) { el.innerHTML = `<div class="empty">Tus estadísticas aparecen a medida que marcas bloques como hechos y sumas metas. Empieza por el bloque en el que estás ahora.</div>`; return; }

    let html = `<div class="kpis">${st.kpis.map(k => `<div class="kpi${k.cat ? "" : " plain"}"${k.cat ? ` style="--cat:${catVar(k.cat)}"` : ""}><div class="v">${k.v}</div><div class="l">${esc(k.taskMin != null ? `${k.l} (${durTxt(k.taskMin)})` : k.l)}</div></div>`).join("")}</div><div class="charts">`;
    html += chart("Cumplimiento por semana", "Porcentaje de bloques marcados como hechos en las últimas semanas.",
      `<div class="sv">${barChart({labels:st.labels, series:[{name:"Cumplimiento", values:st.weekly, color:"var(--accent)"}], max:100, suffix:"%"})}</div>`);
    html += chart("Horas cumplidas esta semana", "Lo que hiciste frente a lo planificado, por área.", st.hours.map(h =>
      `<div class="hbar" style="--cat:${catVar(h.cat)}"><span class="nm">${catName(h.cat)}</span><div class="tr"><span style="width:${h.planned ? Math.min(h.done/h.planned, 1)*100 : 100}%"></span></div><span class="nb">${hrs(h.done)} de ${hrs(h.planned)} h</span></div>`).join(""));
    html += chart("Qué días cumples más", "Promedio de cumplimiento por día de la semana. Los días que todavía no llegaron no cuentan.",
      `<div class="sv">${barChart({labels:SHORT, series:[{name:"Cumplimiento", values:st.dayPct, color:"var(--c1)"}], max:100, suffix:"%"})}</div>`);
    const palette = ["var(--c1)", "var(--c5)", "var(--c4)"];
    const s4 = st.goalSeries.map((g, i) => ({name:g.goal.label, values:g.values, color:palette[i]}));
    if (s4.length) html += chart("Metas por semana", "Tus primeras metas, semana a semana.", `<div class="sv">${barChart({labels:st.labels, series:s4})}</div>${legendMini(s4)}`);
    if (st.tasksPerWeek.some(Boolean)) html += chart("Tareas completadas por semana", "Cuántas tareas únicas cerraste cada semana.",
      `<div class="sv">${barChart({labels:st.labels, series:[{name:"Tareas", values:st.tasksPerWeek, color:"var(--c5)"}]})}</div>`);
    el.innerHTML = html + `</div>`;
  };
}
