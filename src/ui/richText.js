// Texto simple con formato mínimo: líneas que empiezan con «- » son listas, **así** es negrita
// y una línea vacía separa párrafos. Todo se escapa antes, así que no admite HTML.
import { esc } from "../core/utils.js";

const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

export function richText(text){
  const out = []; let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<ul>${list.map(li => `<li>${inline(li)}</li>`).join("")}</ul>`); list = null; } };
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trimEnd();
    const m = line.match(/^\s*[-•]\s+(.*)$/);
    if (m) { flushPara(); (list ||= []).push(m[1]); }
    else if (!line.trim()) { flushPara(); flushList(); }
    else { flushList(); para.push(line.trim()); }
  }
  flushPara(); flushList();
  return out.join("");
}

/** Primeras palabras de un texto, sin formato, para vistas cortas. */
export const preview = (text, max = 140) => {
  const s = String(text || "").replace(/^\s*[-•]\s+/gm, "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
};
