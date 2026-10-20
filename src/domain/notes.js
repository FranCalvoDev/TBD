// Notas: cuál mostrar como recordatorio en cada momento.
import { isoLocal, nowInfo } from "../core/time.js";

/** Número estable por día: la nota elegida cambia de un día a otro, no en cada redibujado. */
const daySeed = info => { const s = isoLocal(info.d); let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

export const sortNotes = notes => [...notes].sort((a, b) =>
  (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

/**
 * Nota para recordar ahora: primero una de la categoría del bloque en curso;
 * si no hay, una fijada (rota cada día). Devuelve {note, reason} o null.
 */
export function pickReminder(notes, currentCat, info = nowInfo()){
  const seed = daySeed(info);
  const pick = list => list.length ? list[seed % list.length] : null;
  const byCat = currentCat ? notes.filter(n => n.cat === currentCat) : [];
  if (byCat.length) return {note:pick(sortNotes(byCat)), reason:"block"};
  const pinned = notes.filter(n => n.pinned);
  if (pinned.length) return {note:pick(sortNotes(pinned)), reason:"pinned"};
  return null;
}
