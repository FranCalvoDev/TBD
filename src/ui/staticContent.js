// Secciones fijas: plan del primer mes y tips. Se dibujan una sola vez.
import { MONTH, TIPS } from "../data/content.js";
import { catVar } from "../data/categories.js";
import { $ } from "./dom.js";

export function renderStaticContent(){
  $("month").innerHTML = MONTH.map((w, i) => `
    <div class="wk"><div class="wn">${i+1}</div><h3>${w.t}</h3>
    <p><b>Pieza principal:</b> ${w.main}</p><p><b>Corto:</b> ${w.sh}</p></div>`).join("");
  $("tips").innerHTML = TIPS.map(t => `
    <details style="--cat:${catVar(t.cat)}"><summary>${t.title}</summary><div class="tip-body">${t.html}</div></details>`).join("");
}
