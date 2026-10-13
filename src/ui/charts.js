// Gráfico de barras en SVG, sin librerías.
import { esc } from "../core/utils.js";

export function barChart({labels, series, max, suffix = "", height = 190}){
  const n = labels.length, gs = series.length;
  const groupW = Math.max(46, gs*22 + 18), padL = 8, padB = 26, padT = 20;
  const W = Math.max(320, padL*2 + n*groupW), H = height;
  const top = Math.max(max || 0, 1, ...series.flatMap(s => s.values));
  const bw = Math.min(28, (groupW - 16) / gs);
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(s => s.name).join(", "))}">`;
  out += `<line x1="${padL}" x2="${W-padL}" y1="${H-padB}" y2="${H-padB}" style="stroke:var(--line)"/>`;
  labels.forEach((lab, i) => {
    const gx = padL + i*groupW + (groupW - bw*gs)/2;
    series.forEach((s, k) => {
      const v = s.values[i] || 0, h = (H-padB-padT) * v / top;
      const x = gx + k*bw, y = H-padB-h;
      out += `<rect x="${x+1}" y="${y}" width="${bw-2}" height="${Math.max(h, v ? 2 : 0)}" rx="4" style="fill:${s.color}"><title>${esc(s.name)}: ${v}${suffix}</title></rect>`;
      out += `<text class="val" x="${x+bw/2}" y="${y-5}" text-anchor="middle">${Math.round(v)}${suffix}</text>`;
    });
    out += `<text x="${padL + i*groupW + groupW/2}" y="${H-8}" text-anchor="middle">${esc(lab)}</text>`;
  });
  return out + `</svg>`;
}

export const legendMini = series => series.length > 1
  ? `<div class="legend-mini">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div>` : "";
