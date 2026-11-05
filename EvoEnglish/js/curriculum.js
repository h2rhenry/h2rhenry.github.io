import * as store from './storage.js';
import { loadData } from './data.js';

export async function loadCurriculum() {
  const [path, vocab, grammar] = await Promise.all([loadData('path'), loadData('vocabulary'), loadData('grammar')]);
  return { path: path || { levels: [] }, vocab, grammar };
}

/** Trạng thái một mục lộ trình: { state: 'new'|'doing'|'done', note } */
export function itemStatus(item, cur, level) {
  const progress = store.get('progress');
  if (item.type === 'vocab') {
    const recs = store.get('vocabulary').words;
    const words = (cur.vocab?.words || []).filter((w) => w.topic === item.ref);
    if (!words.length) return { state: 'new', note: 'Chưa có dữ liệu' };
    const remembered = words.filter((w) => (recs[w.id]?.correctCount || 0) > 0).length;
    const touched = words.filter((w) => recs[w.id]?.lastReviewedAt).length;
    const note = `${remembered}/${words.length} từ đã nhớ`;
    if (remembered / words.length >= 0.8) return { state: 'done', note };
    return { state: touched > 0 ? 'doing' : 'new', note };
  }
  const key = item.type === 'test' ? item.id : `${item.type}:${item.ref}`;
  const p = progress.lessons[key];
  if (!p) return { state: 'new', note: '' };
  const note = typeof p.best === 'number' ? `Điểm cao nhất ${Math.round(p.best)}%` : '';
  return { state: p.status === 'completed' ? 'done' : 'doing', note };
}

export function levelSummary(level, cur) {
  const items = level.lessons.map((it) => ({ item: it, ...itemStatus(it, cur, level) }));
  const test = level.test ? { item: { ...level.test, type: 'test' }, ...itemStatus({ ...level.test, type: 'test' }, cur, level) } : null;
  const all = test ? [...items, test] : items;
  const done = all.filter((x) => x.state === 'done').length;
  return { items, test, total: all.length, done, complete: all.length > 0 && done === all.length };
}

export function pathCompletion(cur) {
  let total = 0, done = 0;
  for (const level of cur.path.levels) { const s = levelSummary(level, cur); total += s.total; done += s.done; }
  return { total, done };
}
