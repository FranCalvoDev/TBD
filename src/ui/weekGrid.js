// Grilla semanal (pantallas anchas). La línea de «ahora» se mueve sin redibujar la grilla.
import { DAYS, catVar } from "../data/categories.js";
import { START, END, toMin, minToStr, fmt, span, nowInfo } from "../core/time.js";
import { esc } from "../core/utils.js";
import { $, hit } from "./dom.js";

const pos = (s, len) => `top:calc(${toMin(s) - START} * var(--ppm) + 1px);height:calc(${len} * var(--ppm) - 2px)`;

export function createWeekGrid(ctx){
  const el = $("week"), {sel, view} = ctx;
  let todayCol = null, nowline = null;

  el.addEventListener("click", e => {
    const b = hit(e, "data-block"); if (b) return ctx.open.block(b.dataset.block);
    const t = hit(e, "data-task"); if (t) ctx.open.goToTask(t.dataset.task);
  });

  function render(){
    const {day} = nowInfo(), key = sel.curKey(), w = sel.curWeek(), done = w.done || {}, off = w.off || {};
    const dim = cat => view.active.has(cat) ? "" : " dim";
    let html = "<div></div>";
    DAYS.forEach((name, i) => {
      const bl = sel.blocksOf(i).filter(x => !off[x.id]), total = bl.length, dn = bl.filter(x => done[x.id]).length;
      html += `<div class="dh${i === day ? " today" : ""}"><div class="n">${name}${i === day ? " (hoy)" : ""}</div><div class="p">${dn} de ${total} hechos</div><div class="pb"><span style="width:${total ? dn/total*100 : 0}%"></span></div></div>`;
    });
    html += `<div class="axis">`;
    for (let m = 540; m <= 1440; m += 60) html += `<span style="top:calc(${m - START} * var(--ppm))">${minToStr(m % 1440)}</span>`;
    html += `</div>`;
    DAYS.forEach((name, i) => {
      html += `<div class="col${i === day ? " today" : ""}">`;
      sel.blocksOf(i).forEach(x => {
        const len = span(x), isOff = off[x.id];
        html += `<button type="button" data-block="${esc(x.id)}" class="blk${len < 50 ? " short" : ""}${dim(x.cat)}${done[x.id] ? " done" : ""}${isOff ? " off" : ""}" style="--cat:${catVar(x.cat)};${pos(x.s, len)}" aria-label="${esc(`${name}, ${x.title}, de ${fmt(x.s)} a ${fmt(x.e)}`)}"><span class="t">${esc(x.title)}</span><span class="h">${isOff ? "Horario libre" : fmt(x.s)+" a "+fmt(x.e)}</span></button>`;
      });
      sel.tasksAt(key, i, true).forEach(t => {
        const len = span(t.slot);
        html += `<button type="button" data-task="${esc(t.id)}" class="blk task${len < 50 ? " short" : ""}${dim(t.cat)}${t.done ? " done" : ""}" style="--cat:${catVar(t.cat)};${pos(t.slot.s, len)}" aria-label="${esc(`Tarea: ${t.title}, de ${fmt(t.slot.s)} a ${fmt(t.slot.e)}`)}"><span class="t">${esc(t.title)}</span><span class="h">Tarea, ${fmt(t.slot.s)} a ${fmt(t.slot.e)}</span></button>`;
      });
      html += `</div>`;
    });
    el.innerHTML = html;
    todayCol = el.querySelector(".col.today");
    nowline = null;
    updateNow();
  }

  function updateNow(){
    if (!todayCol) return;
    const {min} = nowInfo();
    if (!nowline) { nowline = document.createElement("div"); nowline.className = "nowline"; todayCol.appendChild(nowline); }
    nowline.hidden = min < START || min > END;
    nowline.style.top = `calc(${min - START} * var(--ppm))`;
  }

  return {render, updateNow};
}
