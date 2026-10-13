// Bloque «ahora»: qué toca en este momento, cuánto falta y qué sigue.
import { catVar, catName, DAYS } from "../data/categories.js";
import { START, toMin, minToStr, fmt, durTxt, nowInfo } from "../core/time.js";
import { esc } from "../core/utils.js";
import { $, setText } from "./dom.js";

export function createHero({sel}){
  const hero = $("hero"), bar = hero.querySelector("#heroBar span"), next = $("heroNext");
  return function render(){
    const {day, min} = nowInfo(), off = sel.curWeek().off || {};
    const tItems = sel.tasksAt(sel.curKey(), day).map(t => ({title:"Tarea: "+t.title, s:t.slot.s, e:t.slot.e, cat:t.cat}));
    const items = [...sel.blocksOf(day).filter(x => !off[x.id]), ...tItems].sort((a, b) => toMin(a.s) - toMin(b.s));
    const inNow = x => min >= toMin(x.s) && min < toMin(x.e);
    const cur = tItems.find(inNow) || items.find(inNow);
    const nx = items.find(x => toMin(x.s) > min);
    setText("heroWhen", `${DAYS[day]}, ${minToStr(min % 1440)}`);
    if (min < START) {
      hero.style.setProperty("--hero-c", catVar("rutina"));
      setText("heroNow", "Hora de dormir"); setText("heroMeta", "Te levantas a las 8:30."); bar.style.width = "0";
    } else if (cur) {
      hero.style.setProperty("--hero-c", catVar(cur.cat));
      setText("heroNow", cur.title);
      setText("heroMeta", `${catName(cur.cat)}, hasta las ${fmt(cur.e)}. Quedan ${durTxt(toMin(cur.e) - min)}.`);
      bar.style.width = ((min - toMin(cur.s)) / (toMin(cur.e) - toMin(cur.s)) * 100) + "%";
    } else {
      hero.style.setProperty("--hero-c", "var(--ink)");
      setText("heroNow", "Tiempo libre"); setText("heroMeta", "Descansa o adelanta algo pendiente."); bar.style.width = "0";
    }
    if (nx) { hero.style.setProperty("--next-c", catVar(nx.cat)); next.innerHTML = `Después: <b>${esc(nx.title)}</b> a las ${fmt(nx.s)}`; }
    else next.textContent = "No hay más bloques hoy.";
  };
}
