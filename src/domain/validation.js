import { START, END, toMin, minToStr, fmt } from "../core/time.js";

/** "HH:MM" del formulario a minutos dentro del día de la app (00:15 → 24:15). */
const inRange = v => { if (!v) return null; let m = toMin(v); if (m < START) m += 1440; return m; };

/**
 * Valida un bloque del editor. Devuelve {error} o {value} listo para guardar.
 * `dayBlocks` son los bloques de ese día; `editId` el bloque que se está editando.
 */
export function validateBlock(form, dayBlocks, editId){
  const title = form.title.trim();
  const s = inRange(form.s), e = inRange(form.e);
  if (!title) return {error:"Escribe un título para el bloque."};
  if (s === null || e === null) return {error:"Completa la hora de inicio y de fin."};
  if (s < START || s >= END) return {error:"El bloque tiene que empezar entre las 08:30 y las 00:30."};
  if (e > END) return {error:"El bloque tiene que terminar a las 00:30 como máximo."};
  if (e <= s) return {error:"La hora de fin tiene que ser posterior a la de inicio."};
  const clash = dayBlocks.find(v => v.id !== editId && toMin(v.s) < e && s < toMin(v.e));
  if (clash) return {error:`Se superpone con “${clash.title}” (${fmt(clash.s)} a ${fmt(clash.e)}). Ajusta los horarios.`};
  return {value:{day:form.day, cat:form.cat, title, s:minToStr(s), e:minToStr(e), p:form.p.trim(),
    l:form.l.split("\n").map(t => t.trim()).filter(Boolean)}};
}
