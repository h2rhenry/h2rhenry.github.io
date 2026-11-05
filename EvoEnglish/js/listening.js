import * as store from './storage.js';
import * as state from './state.js';
import { h, hashParams, formatDate } from './utils.js';
import { loadData } from './data.js';
import { mountQuestionSet } from './exercise-set.js';
import { buildPlayer } from './tts-player.js';
import { recordQuizResult } from './results.js';

const PASS = 70;
const STATE = (p) => (!p ? 'Chưa nghe' : p.status === 'completed' ? `Hoàn thành · cao nhất ${Math.round(p.best)}%` : 'Đang làm dở');

export async function render(root) {
  const data = await loadData('listening');
  if (!data) { root.append(h('div', { class: 'card', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Không tải được bài nghe'), h('p', { class: 'muted' }, 'Hãy kiểm tra kết nối rồi tải lại trang.'))); return; }
  const lesson = data.lessons.find((x) => x.id === hashParams().get('lesson'));
  lesson ? lessonView(root, lesson) : listView(root, data);
}

function listView(root, data) {
  const lessons = store.get('progress').lessons;
  root.append(h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Luyện nghe'), h('p', {}, 'Nghe trước, trả lời câu hỏi, rồi mới xem transcript. Giọng đọc là giọng tổng hợp của trình duyệt.')),
    ...[...new Set(data.lessons.map((l) => l.level))].map((lv) => h('section', { class: 'card stack', 'aria-labelledby': 'ls-' + lv },
      h('h2', { id: 'ls-' + lv }, `Cấp độ ${lv}`),
      h('ul', { class: 'plain-list' }, data.lessons.filter((l) => l.level === lv).map((l) => h('li', { class: 'word-row' },
        h('div', { class: 'word-main' }, h('a', { href: `#/listening?lesson=${l.id}` }, h('b', {}, l.title)), h('div', { class: 'muted' }, l.goal)),
        h('div', { class: 'word-side' }, h('span', { class: 'badge' }, STATE(lessons['listening:' + l.id])))))))));
}

function lessonView(root, l) {
  const key = 'listening:' + l.id;
  const saved = store.get('progress').lessons[key] || {};
  const href = `#/listening?lesson=${l.id}`;
  state.startSession(key);
  const persist = (patch) => store.update('progress', (pr) => {
    const cur = pr.lessons[key] || { status: 'in-progress', best: 0, attempts: 0 };
    pr.lessons[key] = { ...cur, ...patch, at: Date.now() };
    pr.lastLesson = { title: `Nghe · ${l.title}`, href };
  });

  /* ----- Trình phát ----- */
  const { node: player } = buildPlayer({ lines: l.lines, audio: l.audio, goal: l.goal, idPrefix: 'pl' });

  /* ----- Transcript ----- */
  const tBody = h('div', { class: 'stack', id: 'transcript', hidden: true },
    h('ul', { class: 'plain-list' }, l.lines.map((x) => h('li', {}, h('div', {}, l.lines.some((y) => y.who !== x.who) ? h('b', {}, x.who + ': ') : null, x.text), h('div', { class: 'muted' }, x.vi)))),
    h('h3', {}, 'Từ vựng và cụm từ'), h('ul', { class: 'bullets' }, l.glossary.map((g) => h('li', {}, h('b', {}, g.w), ' — ', g.vi))));
  const tBtn = h('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'transcript', onclick: () => {
    const open = tBody.hidden; tBody.hidden = !open; tBtn.setAttribute('aria-expanded', String(open)); tBtn.textContent = open ? 'Ẩn transcript và bản dịch' : 'Hiện transcript và bản dịch';
  } }, 'Hiện transcript và bản dịch');

  const qBox = h('div', { class: 'stack' });
  mountQuestionSet(qBox, {
    questions: l.questions, draft: saved.draft || {},
    onDraft: (draft) => persist({ draft }),
    onRetry: () => persist({ draft: {} }),
    onSubmit: (res) => {
      store.update('progress', (pr) => {
        const prev = pr.lessons[key] || { attempts: 0, best: 0 };
        pr.lessons[key] = { ...prev, status: res.pct >= PASS || prev.status === 'completed' ? 'completed' : 'in-progress', best: Math.max(prev.best || 0, res.pct), attempts: (prev.attempts || 0) + 1, draft: {}, at: Date.now() };
      });
      store.update('review', (r) => res.results.forEach(({ q, correct }) => {
        const k = `l:${l.id}:${q.id}`;
        if (correct) delete r.wrongQuestions[k];
        else { const e = r.wrongQuestions[k] || { kind: 'listening', lesson: l.id, qid: q.id, count: 0 }; e.count += 1; e.at = Date.now(); r.wrongQuestions[k] = e; }
      }));
      state.recordActivity({ items: res.total });
      recordQuizResult({ kind: 'listening', id: l.id, title: `Nghe · ${l.title}`, right: res.right, total: res.total, pct: res.pct, href });
      state.notify();
    },
  });

  root.append(
    h('p', {}, h('a', { href: '#/listening' }, '← Danh sách bài nghe')),
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, l.title), h('p', {}, h('span', { class: 'badge' }, 'Cấp độ ' + l.level), ' ', h('span', { class: 'muted' }, STATE(saved.status ? saved : null) + (saved.at ? ` · ${formatDate(saved.at)}` : '')))),
    player,
    h('section', { class: 'card stack', 'aria-labelledby': 'tr-h' }, h('h2', { id: 'tr-h' }, 'Transcript'), h('p', { class: 'muted' }, 'Nên trả lời câu hỏi trước, rồi mới mở transcript để kiểm tra.'), h('div', {}, tBtn), tBody),
    h('section', { class: 'card stack', 'aria-labelledby': 'lq-h' }, h('h2', { id: 'lq-h' }, `Câu hỏi (${l.questions.length})`), qBox));
}
