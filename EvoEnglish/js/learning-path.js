import * as store from './storage.js';
import * as state from './state.js';
import { h } from './utils.js';
import { loadCurriculum, levelSummary } from './curriculum.js';
import { runQuiz, shuffle } from './quiz.js';
import { buildGrammarQuestion, recordGrammarAnswer } from './grammar.js';
import { buildQuestion, recordAnswer } from './vocabulary.js';
import { recordQuizResult } from './results.js';

const TYPE_LABEL = { vocab: 'Từ vựng', grammar: 'Ngữ pháp', reading: 'Đọc', listening: 'Nghe' };
const STATE_LABEL = { new: 'Chưa học', doing: 'Đang học', done: 'Hoàn thành' };
const STATUS_LABEL = { ready: 'Có nội dung', partial: 'Có một phần nội dung', pending: 'Đang chờ bổ sung' };

export function buildLevelTest(level, cur, max = 12) {
  const qs = [];
  for (const it of level.lessons.filter((x) => x.type === 'grammar')) {
    const lesson = cur.grammar?.lessons.find((l) => l.id === it.ref);
    if (lesson) shuffle(lesson.exercises).slice(0, 2).forEach((ex) => qs.push(buildGrammarQuestion(lesson, ex)));
  }
  const words = cur.vocab?.words || [];
  const topics = level.lessons.filter((x) => x.type === 'vocab').map((x) => x.ref);
  const pool = shuffle(words.filter((w) => topics.includes(w.topic))).slice(0, 5);
  pool.forEach((w, i) => { const q = buildQuestion(i % 2 ? 'context' : 'en-vi', w, words); q.src = 'vocab'; qs.push(q); });
  return shuffle(qs).slice(0, max);
}

export async function render(root) {
  const cur = await loadCurriculum();
  const progress = store.get('progress');

  function runTest(level) {
    const questions = buildLevelTest(level, cur);
    if (!questions.length) return;
    state.startSession('test:' + level.id);
    const stage = h('div', {});
    root.replaceChildren(h('div', { class: 'page-head' }, h('h1', { class: 'sr-only', tabindex: '-1' }, level.test.title), h('button', { class: 'btn', type: 'button', onclick: () => { state.endSession(); home(); } }, '← Lộ trình học')), stage);
    runQuiz(stage, {
      title: level.test.title, questions,
      onAnswer: (q, ok) => (q.src === 'vocab' ? recordAnswer(q.wordId, ok ? 4 : 1) : recordGrammarAnswer(q, ok)),
      onFinish: ({ right, total, pct }) => {
        store.update('progress', (p) => {
          const prev = p.lessons[level.test.id] || { attempts: 0, best: 0 };
          p.lessons[level.test.id] = { status: pct >= level.test.passPct || prev.status === 'completed' ? 'completed' : 'in-progress', best: Math.max(prev.best || 0, pct), attempts: prev.attempts + 1, at: Date.now() };
        });
        recordQuizResult({ kind: 'test', id: level.test.id, title: level.test.title, right, total, pct, href: '#/learning-path' });
        state.endSession(); state.notify();
      },
      actions: [{ label: 'Về lộ trình', onclick: home }],
    });
  }

  function levelCard(level) {
    const sum = levelSummary(level, cur);
    const isCurrent = store.get('progress').level === level.id;
    const href = (it) => ({ vocab: `#/vocabulary?topic=${it.ref}`, grammar: `#/grammar?lesson=${it.ref}`, reading: `#/reading?passage=${it.ref}`, listening: `#/listening?lesson=${it.ref}` }[it.type]);
    return h('section', { class: 'card stack', 'aria-labelledby': 'lv-' + level.id },
      h('div', { class: 'level-head' },
        h('h2', { id: 'lv-' + level.id }, `${level.id} · ${level.name}`),
        h('span', { class: 'badge' }, sum.complete ? 'Đã hoàn thành' : STATUS_LABEL[level.status]),
        isCurrent ? h('span', { class: 'badge' }, 'Cấp độ hiện tại') : null),
      h('p', {}, level.goal),
      level.note ? h('p', { class: 'muted' }, level.note) : null,
      sum.total ? h('div', {}, h('div', { class: 'muted' }, `Tiến độ: ${sum.done}/${sum.total} mục`), h('div', { class: 'progress', role: 'progressbar', 'aria-label': `Tiến độ ${level.id}`, 'aria-valuemin': '0', 'aria-valuemax': String(sum.total), 'aria-valuenow': String(sum.done) }, h('span', { style: `width:${(sum.done / sum.total) * 100}%` })))
        : h('div', { class: 'empty' }, h('strong', {}, 'Nội dung đang chờ bổ sung'), 'Cấp độ này đã có khung mục tiêu nhưng chưa có bài học.'),
      sum.total ? h('ul', { class: 'plain-list' }, sum.items.map((x) => h('li', { class: 'word-row' },
        h('div', { class: 'word-main' }, h('a', { href: href(x.item) }, h('b', {}, x.item.title)), h('div', { class: 'muted' }, [TYPE_LABEL[x.item.type], x.note].filter(Boolean).join(' · '))),
        h('div', { class: 'word-side' }, h('span', { class: 'badge' }, STATE_LABEL[x.state]))))) : null,
      sum.test ? h('div', { class: 'stack' },
        h('p', { class: 'muted' }, `Điều kiện hoàn thành: hoàn thành mọi bài học và đạt từ ${level.test.passPct}% bài kiểm tra cuối chương. ${sum.test.note ? sum.test.note + '. ' : ''}Kết quả chỉ để tham khảo, không phải chứng nhận CEFR.`),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => runTest(level) }, `${level.test.title} · ${STATE_LABEL[sum.test.state]}`),
          isCurrent ? null : h('button', { class: 'btn', type: 'button', onclick: () => { store.update('progress', (p) => { p.level = level.id; }); state.notify(); home(); } }, 'Đặt làm cấp độ hiện tại'))) : null);
  }

  function home() {
    root.replaceChildren(
      h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Lộ trình học'), h('p', {}, cur.path.note || 'Lộ trình tham khảo theo CEFR.'), h('p', { style: 'margin-top:8px' }, 'Chưa biết nên bắt đầu từ đâu? ', h('a', { href: '#/placement' }, 'Làm bài kiểm tra đầu vào'))),
      ...cur.path.levels.map(levelCard));
  }
  home();
}
