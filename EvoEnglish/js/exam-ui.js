/* Thành phần dùng chung cho khu luyện thi: bộ đếm giờ, bảng tự chấm, lịch sử. */
import * as store from './storage.js';
import { h, formatDate } from './utils.js';
import * as state from './state.js';
import { onLeave } from './cleanup.js';
import { recordQuizResult } from './results.js';

export const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Đồng hồ đếm ngược, chỉ mang tính gợi ý: hết giờ không tự nộp bài. */
export function countdown(seconds, { label = 'Thời gian gợi ý', onEnd = null } = {}) {
  let remain = seconds; let id = null;
  const clock = h('span', { class: 'timer' }, fmtTime(remain));
  const note = h('span', { class: 'muted', role: 'status' });
  const stop = () => { clearInterval(id); id = null; };
  const btn = h('button', { class: 'btn', type: 'button', onclick: () => toggle() }, 'Bắt đầu');
  function toggle() {
    if (id) { stop(); btn.textContent = 'Tiếp tục'; return; }
    if (remain <= 0) remain = seconds;
    btn.textContent = 'Tạm dừng'; note.textContent = '';
    id = setInterval(() => {
      remain -= 1; clock.textContent = fmtTime(Math.max(0, remain));
      if (remain <= 0) { stop(); btn.textContent = 'Đếm lại'; note.textContent = 'Hết giờ.'; if (onEnd) onEnd(); }
    }, 1000);
  }
  const reset = () => { stop(); remain = seconds; clock.textContent = fmtTime(remain); btn.textContent = 'Bắt đầu'; note.textContent = ''; };
  onLeave(stop);
  const node = h('div', { class: 'btn-row' }, h('span', { class: 'muted' }, label + ':'), clock, btn, h('button', { class: 'btn', type: 'button', onclick: reset }, 'Đặt lại'), note);
  return { node, start: () => { if (!id) toggle(); }, reset, stop };
}

const LEVELS = ['1 · Cần cải thiện', '2 · Tạm được', '3 · Tốt', '4 · Rất tốt'];
/** Bảng tự chấm theo tiêu chí, thang 1–4 (không phải thang band của kỳ thi). */
export function rubricUI(criteria, idPrefix = 'rb') {
  const rating = {};
  const total = h('p', { class: 'muted', role: 'status' }, 'Hãy chấm đủ các tiêu chí để xem tổng điểm tự đánh giá.');
  const sum = () => (criteria.every(([k]) => rating[k]) ? criteria.reduce((s, [k]) => s + rating[k], 0) : null);
  const paint = () => { const t = sum(); total.textContent = t === null ? 'Hãy chấm đủ các tiêu chí để xem tổng điểm tự đánh giá.' : `Tự đánh giá: ${t}/${criteria.length * 4} (${Math.round((t / (criteria.length * 4)) * 100)}%). Đây là điểm bạn tự chấm, không phải điểm do hệ thống chấm.`; };
  const groups = criteria.map(([key, name, hint]) => h('fieldset', { class: 'qset' }, h('legend', {}, name), h('p', { class: 'muted', style: 'margin:0' }, hint),
    LEVELS.map((l, i) => h('label', { class: 'qopt', for: `${idPrefix}-${key}-${i}` }, h('input', { type: 'radio', name: `${idPrefix}-${key}`, id: `${idPrefix}-${key}-${i}`, onchange: () => { rating[key] = i + 1; paint(); } }), ' ', l))));
  return { node: h('div', { class: 'stack' }, ...groups, total), rating, sum, max: criteria.length * 4 };
}

/** Lịch sử luyện tập theo loại (ielts / toeic). */
export function historyList(kind, limit = 10, id = null) {
  const entries = store.get('quizHistory').entries.filter((e) => e.kind === kind && (id === null || e.id === id)).slice(0, limit);
  return entries.length
    ? h('ul', { class: 'plain-list recent' }, entries.map((e) => h('li', {}, h('span', {}, e.title), h('span', { class: 'muted' }, `${e.right}/${e.total} (${Math.round(e.pct)}%)${e.self ? ' · tự chấm' : ''} · ${formatDate(e.at)}`))))
    : h('div', { class: 'empty' }, h('strong', {}, 'Chưa có lần luyện tập nào'), 'Kết quả các bài bạn làm sẽ hiện ở đây.');
}

/** Ghi kết quả một lần luyện tập. self=true: điểm do người học tự chấm, không tính vào điểm trung bình. */
export function recordPractice({ kind, id, title, right, total, pct, href, self = false, items = total }) {
  store.update('progress', (p) => {
    const k = `${kind}:${id}`;
    const prev = p.lessons[k] || { attempts: 0, best: 0 };
    p.lessons[k] = { ...prev, status: 'completed', best: Math.max(prev.best || 0, pct), attempts: (prev.attempts || 0) + 1, draft: {}, at: Date.now() };
  });
  recordQuizResult({ kind, id, title, right, total, pct, href, self });
  if (items) state.recordActivity({ items });
  state.notify();
}
