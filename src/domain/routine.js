// Lectura de las filas de una rutina para mostrarlas ordenadas: letra del ejercicio,
// etiquetas (intensidad, descanso, tempo), aclaraciones y superseries. Sin DOM.

const TAG = /^((?:[A-Z]\d?)|(?:Abs(?: \d)?))\s*·\s*(.+)$/;
const INTENSITY = /^(RIR\b|Última\b|Control\b|Velocidad\b)/i;
const REST = /^\d+(?::\d\d)?(?:\s*-\s*\d+(?::\d\d)?)?\s*(?:s|min)?$/i;
const TEMPO = /^(tempo|bajada|pausa)\b/i;
const EMPTY_AMOUNT = new Set(["", "—", "-", "–"]);

/** "4 x 4-6" → "4 × 4-6". */
export const prettyAmount = a => String(a ?? "").trim().replace(/(\d)\s*[xX]\s*(?=\d)/g, "$1 × ");

/** Separa "bajada 3 s. Con banda…" en la etiqueta y lo que sigue. */
function splitSentence(part){
  const i = part.search(/\.\s+[A-ZÁÉÍÓÚÑ¿]|\s→\s/);
  if (i < 0) return [part, ""];
  return [part.slice(0, i).trim(), part.slice(i).replace(/^\.\s*|^\s*→\s*/, "").trim()];
}

function chipFor(text){
  if (INTENSITY.test(text)) return {kind:"int", text};
  if (REST.test(text)) return {kind:"rest", text};
  if (TEMPO.test(text)) return {kind:"tempo", text};
  return null;
}

/** Detalle → {chips, notes}. Lo que no se reconoce queda como texto. */
export function parseDetail(detail){
  const chips = [], notes = [];
  for (const raw of String(detail ?? "").split(" · ").map(s => s.trim()).filter(Boolean)) {
    const [head, tail] = splitSentence(raw);
    const chip = chipFor(head);
    if (chip) { chips.push(chip); if (tail) notes.push(tail); }
    else notes.push(raw);
  }
  return {chips, notes:notes.map(n => prettyAmount(n.charAt(0).toUpperCase() + n.slice(1)))};
}

/**
 * Una fila de la rutina lista para dibujar.
 * kind: "exercise" (tiene series), "steps" (lista de pasos, como un calentamiento) o "note" (aclaración).
 */
export function parseRow(row){
  const name = String(row?.name ?? "").trim(), detail = String(row?.detail ?? "").trim();
  const amount = EMPTY_AMOUNT.has(String(row?.amount ?? "").trim()) ? "" : prettyAmount(row.amount);
  const m = name.match(TAG);
  const tag = m ? m[1] : "", title = m ? m[2] : name;
  const steps = detail.split(/\s\+\s/).map(s => prettyAmount(s)).filter(Boolean);
  if (!tag && steps.length >= 3) return {kind:"steps", tag, title, amount, steps, chips:[], notes:[], check:true};
  const {chips, notes} = parseDetail(detail);
  const kind = tag || amount ? "exercise" : "note";
  // Se tacha lo que se hace: ejercicios con letra, con series («3 × 12») o con un tiempo («10 min»), no un rango de descanso.
  const check = !!tag || /\d\s*×/.test(amount) || /^~?\d+(?:[.,]\d+)?\s*(?:min|s|seg)$/.test(amount);
  return {kind, tag, title, amount, chips, notes, steps:[], check};
}

/**
 * Filas de una rutina con su grupo de superserie: C1 y C2 (misma letra con número) van juntas.
 * group: "" | "start" | "mid" | "end".
 */
export function parseRoutine(rows){
  const parsed = (Array.isArray(rows) ? rows : []).map(parseRow);
  const letter = p => /^[A-Z]\d$/.test(p.tag) ? p.tag[0] : "";
  parsed.forEach((p, i) => {
    const l = letter(p);
    const prev = l && letter(parsed[i - 1] || {}) === l, next = l && letter(parsed[i + 1] || {}) === l;
    p.group = prev && next ? "mid" : prev ? "end" : next ? "start" : "";
  });
  return parsed;
}
