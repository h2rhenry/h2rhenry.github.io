import { svgEl, weekdayLabel } from './utils.js';

/** Biểu đồ cột thời gian học (phút). days: [{key, seconds}] */
export function barChart(days) {
  const n = days.length;
  const W = 320, H = 150, base = 118;
  const slot = (W - 8) / n;
  const bw = Math.max(4, slot * 0.68);
  const max = Math.max(...days.map((d) => d.seconds), 60);
  const total = Math.round(days.reduce((s, d) => s + d.seconds, 0) / 60);
  const label = n <= 7
    ? 'Thời gian học: ' + days.map((d) => `${weekdayLabel(d.key)} ${Math.round(d.seconds / 60)} phút`).join(', ')
    : `Thời gian học ${n} ngày gần nhất, tổng ${total} phút`;
  const svg = svgEl('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label });
  days.forEach((d, i) => {
    const x = 4 + i * slot + (slot - bw) / 2;
    const bh = d.seconds > 0 ? Math.max(4, (d.seconds / max) * 88) : 3;
    svg.append(svgEl('rect', { class: d.seconds > 0 ? 'bar' : 'bar-zero', x, y: base - bh, width: bw, height: bh, rx: Math.min(5, bw / 3) }));
    if (n <= 7 && d.seconds > 0) svg.append(svgEl('text', { class: 'val', x: x + bw / 2, y: base - bh - 6, 'text-anchor': 'middle' }, String(Math.max(1, Math.round(d.seconds / 60)))));
    const showLabel = n <= 7 || i % 5 === 0 || i === n - 1;
    if (showLabel) svg.append(svgEl('text', { x: x + bw / 2, y: 138, 'text-anchor': 'middle' }, n <= 7 ? weekdayLabel(d.key) : String(Number(d.key.slice(8)))));
  });
  return svg;
}
