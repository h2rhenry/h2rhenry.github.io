import * as store from './storage.js';
import * as state from './state.js';
import { h, hashParams, formatNumber } from './utils.js';
import { icon } from './icons.js';
import { loadData } from './data.js';
import { runQuiz, shuffle } from './quiz.js';
import { recordQuizResult } from './results.js';

export const PASS_PCT = 70;

export function buildGrammarQuestion(lesson, ex) {
  const base = { id: `g:${lesson.id}:${ex.id}`, src: 'grammar', lessonId: lesson.id, exId: ex.id, explanation: ex.why };
  if (ex.type === 'mc') return { ...base, kind: 'mc', question: 'Chọn đáp án đúng', prompt: ex.q, options: shuffle(ex.options), answer: ex.answer };
  if (ex.type === 'fill') return { ...base, kind: 'text', question: 'Điền từ hoặc cụm từ còn thiếu', prompt: ex.q, answer: ex.answer, accepts: ex.accepts };
  return { ...base, kind: 'text', question: 'Câu này có lỗi. Hãy viết lại cả câu cho đúng', prompt: ex.q, answer: ex.answer, accepts: ex.accepts };
}

export function findQuestion(data, lessonId, exId) {
  const lesson = data.lessons.find((l) => l.id === lessonId);
  const ex = lesson?.exercises.find((e) => e.id === exId);
  return lesson && ex ? buildGrammarQuestion(lesson, ex) : null;
}

export function recordGrammarAnswer(q, ok) {
  store.update('review', (r) => {
    const key = q.id;
    if (ok) delete r.wrongQuestions[key];
    else { const e = r.wrongQuestions[key] || { kind: 'grammar', lesson: q.lessonId, qid: q.exId, count: 0 }; e.count += 1; e.at = Date.now(); r.wrongQuestions[key] = e; }
  });
  state.recordActivity({ items: 1 });
}

export function recordGrammarResult(lesson, { right, total, pct }) {
  store.update('progress', (p) => {
    const key = 'grammar:' + lesson.id;
    const prev = p.lessons[key] || { attempts: 0, best: 0 };
    p.lessons[key] = { status: pct >= PASS_PCT || prev.status === 'completed' ? 'completed' : 'in-progress', best: Math.max(prev.best || 0, pct), attempts: (prev.attempts || 0) + 1, at: Date.now() };
  });
  store.update('review', (r) => { if (pct >= 80) delete r.weakGrammar[lesson.id]; else r.weakGrammar[lesson.id] = { pct, at: Date.now() }; });
  recordQuizResult({ kind: 'grammar', id: lesson.id, title: `Ngữ pháp · ${lesson.title}`, right, total, pct, href: `#/grammar?lesson=${lesson.id}` });
  state.endSession();
  state.notify();
}

export async function render(root) {
  const data = await loadData('grammar');
  if (!data) {
    root.append(h('div', { class: 'card', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Không tải được dữ liệu ngữ pháp'), h('p', { class: 'muted' }, 'Hãy kiểm tra kết nối rồi tải lại trang. Tiến độ của bạn không bị ảnh hưởng.')));
    return;
  }
  const lesson = data.lessons.find((l) => l.id === hashParams().get('lesson'));
  lesson ? lessonView(root, data, lesson) : listView(root, data);
}

function statusText(p) {
  if (!p) return 'Chưa làm bài tập';
  return `${p.status === 'completed' ? 'Hoàn thành' : 'Chưa đạt ' + PASS_PCT + '%'} · cao nhất ${Math.round(p.best)}%`;
}

function listView(root, data) {
  const lessons = store.get('progress').lessons;
  const done = data.lessons.filter((l) => lessons['grammar:' + l.id]?.status === 'completed').length;
  const levels = [...new Set(data.lessons.map((l) => l.level))];
  root.append(
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Ngữ pháp'), h('p', {}, `${done}/${data.lessons.length} bài hoàn thành (đạt từ ${PASS_PCT}% bài tập). Giải thích bằng tiếng Việt, kèm công thức, ví dụ và lỗi thường gặp.`)),
    ...levels.map((lv) => h('section', { class: 'card stack', 'aria-labelledby': 'g-' + lv },
      h('h2', { id: 'g-' + lv }, `Cấp độ ${lv}`),
      h('ul', { class: 'plain-list' }, data.lessons.filter((l) => l.level === lv).map((l) =>
        h('li', { class: 'word-row' },
          h('div', { class: 'word-main' }, h('a', { href: `#/grammar?lesson=${l.id}` }, h('b', {}, l.title)), h('div', { class: 'muted' }, l.summary)),
          h('div', { class: 'word-side' }, h('span', { class: 'badge' }, statusText(lessons['grammar:' + l.id])))))))));
}

function lessonView(root, data, lesson) {
  const favs = store.get('review').favorites;
  const favKey = 'g:' + lesson.id;
  const fav = h('button', { class: 'icon-btn sm' + (favs[favKey] ? ' on' : ''), type: 'button', 'aria-pressed': String(!!favs[favKey]), 'aria-label': 'Đánh dấu yêu thích bài này', onclick: () => {
    const on = fav.getAttribute('aria-pressed') !== 'true';
    store.update('review', (r) => { if (on) r.favorites[favKey] = true; else delete r.favorites[favKey]; });
    fav.setAttribute('aria-pressed', String(on)); fav.classList.toggle('on', on);
  } }, icon('star'));

  const list = (items) => h('ul', { class: 'bullets' }, items.map((t) => h('li', {}, t)));
  const progress = store.get('progress').lessons['grammar:' + lesson.id];

  function startPractice() {
    const questions = shuffle(lesson.exercises).map((ex) => buildGrammarQuestion(lesson, ex));
    state.startSession('grammar:' + lesson.id);
    store.update('progress', (p) => { const k = 'grammar:' + lesson.id; if (!p.lessons[k]) p.lessons[k] = { status: 'in-progress', best: 0, attempts: 0, at: Date.now() }; });
    const stage = h('div', {});
    root.replaceChildren(h('div', { class: 'page-head' }, h('h1', { class: 'sr-only', tabindex: '-1' }, `Bài tập: ${lesson.title}`), h('button', { class: 'btn', type: 'button', onclick: () => { state.endSession(); root.replaceChildren(); lessonView(root, data, lesson); } }, '← Quay lại bài học')), stage);
    runQuiz(stage, {
      title: lesson.title, questions,
      onAnswer: (q, ok) => recordGrammarAnswer(q, ok),
      onFinish: (res) => recordGrammarResult(lesson, res),
      actions: [{ label: 'Xem lại bài học', onclick: () => { root.replaceChildren(); lessonView(root, data, lesson); } }, { label: 'Danh sách ngữ pháp', onclick: () => { location.hash = '#/grammar'; } }],
    });
  }

  root.append(
    h('p', {}, h('a', { href: '#/grammar' }, '← Danh sách ngữ pháp')),
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, lesson.title), h('p', {}, lesson.summary), h('p', { style: 'margin-top:8px' }, h('span', { class: 'badge' }, 'Cấp độ ' + lesson.level), ' ', h('span', { class: 'muted' }, statusText(progress)), ' ', fav)),
    h('section', { class: 'card stack', 'aria-labelledby': 'f-h' }, h('h2', { id: 'f-h' }, 'Công thức'), h('ul', { class: 'bullets formula' }, lesson.formula.map((f) => h('li', {}, h('code', {}, f))))),
    h('section', { class: 'card stack', 'aria-labelledby': 'u-h' }, h('h2', { id: 'u-h' }, 'Cách dùng'), list(lesson.usage)),
    h('section', { class: 'card stack', 'aria-labelledby': 'e-h' }, h('h2', { id: 'e-h' }, 'Ví dụ'), h('ul', { class: 'plain-list' }, lesson.examples.map((e) => h('li', {}, h('div', {}, h('b', {}, e.en)), h('div', { class: 'muted' }, e.vi))))),
    h('section', { class: 'card stack', 'aria-labelledby': 'm-h' }, h('h2', { id: 'm-h' }, 'Lỗi thường gặp'), h('ul', { class: 'plain-list' }, lesson.mistakes.map((m) =>
      h('li', {}, h('div', {}, h('span', { class: 'tag-bad' }, 'Sai:'), ' ', m.wrong), h('div', {}, h('span', { class: 'tag-ok' }, 'Đúng:'), ' ', h('b', {}, m.right)), h('div', { class: 'muted' }, m.note))))),
    h('section', { class: 'card stack', 'aria-labelledby': 'p-h' }, h('h2', { id: 'p-h' }, `Bài tập (${formatNumber(lesson.exercises.length)} câu)`),
      h('p', { class: 'muted' }, `Gồm trắc nghiệm, điền từ và sửa lỗi sai. Mỗi câu có đáp án và lời giải ngay sau khi trả lời. Đạt từ ${PASS_PCT}% để hoàn thành bài.`),
      h('div', {}, h('button', { class: 'btn btn-primary', type: 'button', onclick: startPractice }, progress ? 'Làm lại bài tập' : 'Bắt đầu làm bài tập'))));
}
