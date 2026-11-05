/* Tranh minh họa cho TOEIC Part 1, do EvoEnglish tự vẽ bằng SVG (không dùng ảnh có bản quyền). */
import { svgEl } from './utils.js';

const SKIN = '#f1c9a5'; const SKIN2 = '#c68e63';
const r = (x, y, w, h, fill, extra = {}) => svgEl('rect', { x, y, width: w, height: h, fill, ...extra });
const c = (cx, cy, rad, fill, extra = {}) => svgEl('circle', { cx, cy, r: rad, fill, ...extra });
const l = (x1, y1, x2, y2, stroke, w = 4) => svgEl('line', { x1, y1, x2, y2, stroke, 'stroke-width': w, 'stroke-linecap': 'round' });
const poly = (points, fill, extra = {}) => svgEl('polygon', { points, fill, ...extra });
const path = (d, fill, extra = {}) => svgEl('path', { d, fill, ...extra });
const wrap = (alt, ...kids) => svgEl('svg', { class: 'scene', viewBox: '0 0 320 200', role: 'img', 'aria-label': alt }, ...kids);

const SCENES = {
  laptop: (alt) => wrap(alt,
    r(0, 0, 320, 200, '#e8f0f7'), r(0, 165, 320, 35, '#cdd8e3'),
    r(78, 92, 6, 45, '#6b7a8c'), r(78, 132, 48, 7, '#6b7a8c'), r(86, 139, 5, 28, '#6b7a8c'), r(116, 139, 5, 28, '#6b7a8c'),
    r(96, 124, 34, 10, '#394a60', { rx: 4 }), r(122, 128, 9, 36, '#394a60'), r(120, 162, 16, 5, '#222'),
    r(82, 58, 11, 50, '#3b2a20', { rx: 5 }), /* tóc dài buông sau lưng */
    r(90, 80, 16, 48, '#2f6fb0', { rx: 6 }), c(98, 66, 13, SKIN), path('M85 64a13 13 0 0 1 26-2l-26 6z', '#3b2a20'),
    l(100, 88, 148, 114, '#2f6fb0', 7), c(150, 115, 4.5, SKIN),
    r(128, 120, 176, 8, '#a8763f'), r(138, 128, 6, 38, '#8a5f31'), r(290, 128, 6, 38, '#8a5f31'),
    r(150, 114, 62, 6, '#4b5563', { rx: 2 }), poly('204,114 212,114 224,72 216,72', '#4b5563'), poly('206,112 211,112 220,76 215,76', '#9ec5ee'),
    r(246, 106, 13, 14, '#ffffff', { stroke: '#8a94a0' }), path('M259 109h4a4 4 0 0 1 0 8h-4', 'none', { stroke: '#8a94a0', 'stroke-width': 2 }),
    r(274, 104, 16, 16, '#c4693d'), svgEl('ellipse', { cx: 282, cy: 96, rx: 6, ry: 11, fill: '#3f9b57' }), svgEl('ellipse', { cx: 276, cy: 99, rx: 4, ry: 8, fill: '#58b36d' })),
  handshake: (alt) => wrap(alt,
    r(0, 0, 320, 200, '#eef2f6'), r(0, 172, 320, 28, '#d3dbe4'), r(28, 24, 72, 62, '#cfe6f7', { stroke: '#9fb4c8', 'stroke-width': 3 }), l(64, 24, 64, 86, '#9fb4c8', 2),
    r(94, 146, 15, 28, '#33475b'), r(111, 146, 15, 28, '#33475b'), r(90, 78, 40, 70, '#2f6fb0', { rx: 8 }), c(110, 62, 13, SKIN), path('M97 60a13 13 0 0 1 26 0l-26 3z', '#3b2a20'),
    r(194, 146, 15, 28, '#33475b'), r(211, 146, 15, 28, '#33475b'), r(190, 78, 40, 70, '#7a4d9e', { rx: 8 }), c(210, 62, 13, SKIN2), path('M197 58a13 13 0 0 1 26 0l-26 5z', '#1e1a1a'),
    l(128, 94, 158, 114, '#2f6fb0', 9), l(192, 94, 162, 114, '#7a4d9e', 9), c(160, 114, 7, SKIN)),
  bicycle: (alt) => wrap(alt,
    r(0, 0, 320, 200, '#dff0fb'), r(0, 150, 320, 50, '#9aa5b1'), l(0, 175, 320, 175, '#e9edf1', 3),
    r(36, 96, 8, 56, '#7a5230'), c(40, 84, 28, '#3f9b57'), r(276, 100, 8, 52, '#7a5230'), c(280, 88, 26, '#58b36d'),
    c(115, 140, 24, 'none', { stroke: '#222', 'stroke-width': 4 }), c(215, 140, 24, 'none', { stroke: '#222', 'stroke-width': 4 }),
    l(115, 140, 155, 108, '#c0392b', 4), l(155, 108, 205, 108, '#c0392b', 4), l(205, 108, 215, 140, '#c0392b', 4), l(155, 108, 170, 140, '#c0392b', 4), l(170, 140, 115, 140, '#c0392b', 4), l(205, 108, 200, 96, '#444', 4), l(196, 96, 210, 96, '#444', 4),
    c(170, 140, 5, '#444'), l(150, 100, 160, 100, '#222', 5),
    c(165, 58, 12, SKIN), path('M153 56a12 12 0 0 1 24-3l-24 8z', '#3b2a20'),
    l(160, 72, 154, 100, '#2f6fb0', 14), l(160, 78, 202, 98, '#2f6fb0', 7), l(155, 102, 176, 124, '#394a60', 8), l(176, 124, 168, 146, '#394a60', 8)),
  busstop: (alt) => wrap(alt,
    r(0, 0, 320, 200, '#e6eef5'), r(0, 160, 320, 40, '#8f99a5'), l(0, 182, 320, 182, '#e9edf1', 3), r(0, 150, 320, 10, '#c9d1d9'),
    r(70, 56, 180, 8, '#4b5563'), r(76, 64, 5, 90, '#6b7280'), r(239, 64, 5, 90, '#6b7280'), r(81, 64, 158, 40, '#d6e8f5', { opacity: 0.6 }),
    r(268, 40, 4, 112, '#6b7280'), r(254, 26, 32, 40, '#1d6fb8', { rx: 4 }),
    svgEl('text', { x: 270, y: 51, 'text-anchor': 'middle', fill: '#fff', 'font-size': 13, 'font-weight': 700, 'font-family': 'sans-serif' }, 'BUS'),
    ...[[120, '#c0392b', '#33475b'], [160, '#2f9e6f', '#4a4a4a'], [200, '#e0a526', '#33475b']].flatMap(([x, shirt, pants]) => [
      c(x, 96, 10, x === 160 ? SKIN2 : SKIN), r(x - 11, 108, 22, 38, shirt, { rx: 5 }), r(x - 9, 146, 8, 14, pants), r(x + 1, 146, 8, 14, pants)])),
};

export function scene(name, alt) { return SCENES[name](alt); }
export const SCENE_NAMES = Object.keys(SCENES);
