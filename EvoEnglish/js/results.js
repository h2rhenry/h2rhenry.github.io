import * as store from './storage.js';

/** Ghi kết quả một bài làm vào lịch sử, bài gần đây và bài đang học. */
export function recordQuizResult({ kind, id, title, right, total, pct, href, self = false }) {
  const at = Date.now();
  store.update('quizHistory', (q) => { q.entries.unshift({ kind, id, title, right, total, pct, at, ...(self ? { self: true } : {}) }); q.entries = q.entries.slice(0, 200); });
  store.update('progress', (p) => {
    p.recent.unshift({ title, score: pct, at });
    p.recent = p.recent.slice(0, 20);
    if (href) p.lastLesson = { title, href };
  });
}
