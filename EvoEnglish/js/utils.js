/* Tiện ích DOM và ngày giờ. Luôn dùng textContent/createTextNode, không dùng innerHTML. */
const SVG_NS = 'http://www.w3.org/2000/svg';

export const $ = (selector, root = document) => root.querySelector(selector);

function appendChildren(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

function applyAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  applyAttrs(el, attrs);
  appendChildren(el, children);
  return el;
}

export function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  applyAttrs(el, attrs);
  appendChildren(el, children);
  return el;
}

const pad = (n) => String(n).padStart(2, '0');

/** Khóa ngày theo múi giờ địa phương: YYYY-MM-DD */
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Cộng/trừ ngày theo lịch địa phương (an toàn khi đổi giờ mùa hè). */
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
}

export function weekdayLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(y, m - 1, d).getDay()];
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s === 0) return '0 phút';
  if (s < 60) return '< 1 phút';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

export const formatNumber = (n) => Number(n || 0).toLocaleString('vi-VN');

export const hashParams = () => new URLSearchParams(location.hash.split('?')[1] || '');
export const formatDate = (ms) => new Date(ms).toLocaleDateString('vi-VN');
