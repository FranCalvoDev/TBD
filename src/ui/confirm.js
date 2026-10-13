import { $ } from "./dom.js";

/** Diálogo de confirmación. Resuelve true o false. */
export function askConfirm(title, msg, yesLabel){
  const d = $("conf"), yes = $("cYes"), no = $("cNo");
  $("cTitle").textContent = title;
  $("cMsg").textContent = msg;
  yes.textContent = yesLabel;
  d.showModal();
  return new Promise(resolve => {
    const finish = v => { cleanup(); if (d.open) d.close(); resolve(v); };
    const y = () => finish(true), n = () => finish(false), c = () => finish(false);
    const cleanup = () => { yes.removeEventListener("click", y); no.removeEventListener("click", n); d.removeEventListener("cancel", c); };
    yes.addEventListener("click", y);
    no.addEventListener("click", n);
    d.addEventListener("cancel", c);
  });
}
