// Barra flotante de accesos directos: queda fija bajo la barra superior.
import { $ } from "./dom.js";

export function initQuickNav(){
  const nav = $("quicknav"), top = document.querySelector(".top");
  const root = document.documentElement;
  const measure = () => root.style.setProperty("--top-h", `${top.offsetHeight}px`);
  measure();
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(measure).observe(top);
  else addEventListener("resize", measure);

  nav.addEventListener("click", e => {
    const a = e.target.closest("a[href^='#']"); if (!a) return;
    const target = document.getElementById(a.getAttribute("href").slice(1)); if (!target) return;
    e.preventDefault();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({behavior:reduce ? "auto" : "smooth", block:"start"});
  });
}
