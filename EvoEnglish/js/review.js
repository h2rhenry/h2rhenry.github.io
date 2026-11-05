import * as store from './storage.js';
import * as state from './state.js';
import { h, formatNumber } from './utils.js';
import { loadData } from './data.js';
import { runQuiz, shuffle } from './quiz.js';
import { isDue } from './spaced-repetition.js';
import { buildQuestion, recordAnswer, withCustom } from './vocabulary.js';
import { findQuestion, recordGrammarAnswer } from './grammar.js';
import { recordQuizResult } from './results.js';

const REVIEW_TYPES = ['en-vi', 'vi-en', 'context', 'fill'];
const SHOW = 15;

/** Gom dữ liệu ôn tập từ localStorage. Chỉ đếm những mục còn tồn tại trong dữ liệu bài học. */
export function collectReview(vocab, grammar, now = Date.now(), extra = {}) {
  const recs = store.get('vocabulary').words;
  const review = store.get('review');
  const progress = store.get('progress');
  const wordById = Object.fromEntries((vocab?.words || []).map((w) => [w.id, w]));
  const lessonById = Object.fromEntries((grammar?.lessons || []).map((l) => [l.id, l]));

  const dueWords = (vocab?.words || []).filter((w) => isDue(recs[w.id], now)).sort((a, b) => recs[a.id].nextReviewAt - recs[b.id].nextReviewAt);
  const wrong = Object.entries(review.wrongQuestions).map(([key, e]) => {
    if (e.kind === 'vocab' && wordById[e.id]) return { key, kind: 'vocab', word: wordById[e.id], count: e.count, at: e.at };
    if (e.kind === 'grammar') {
      const q = grammar ? findQuestion(grammar, e.lesson, e.qid) : null;
      if (q) return { key, kind: 'grammar', lesson: lessonById[e.lesson], q, count: e.count, at: e.at };
    }
    if (e.kind === 'reading' || e.kind === 'listening') {
      const src = e.kind === 'reading' ? extra.reading?.passages : extra.listening?.lessons;
      const item = src?.find((x) => x.id === e.lesson);
      const q = item?.questions.find((x) => x.id === e.qid);
      if (q) return { key, kind: e.kind, title: item.title, href: e.kind === 'reading' ? `#/reading?passage=${item.id}` : `#/listening?lesson=${item.id}`, q, count: e.count, at: e.at };
    }
    return null;
  }).filter(Boolean).sort((a, b) => (b.at || 0) - (a.at || 0));
  const weak = Object.entries(review.weakGrammar).filter(([id]) => lessonById[id]).map(([id, e]) => ({ lesson: lessonById[id], pct: e.pct })).sort((a, b) => a.pct - b.pct);
  const unfinished = Object.entries(progress.lessons).filter(([, p]) => p && p.status === 'in-progress').map(([key]) => {
    if (key.startsWith('grammar:') && lessonById[key.slice(8)]) return { title: lessonById[key.slice(8)].title, href: `#/grammar?lesson=${key.slice(8)}` };
    if (key.startsWith('reading:') && extra.reading?.passages.some((x) => x.id === key.slice(8))) return { title: 'Đọc · ' + extra.reading.passages.find((x) => x.id === key.slice(8)).title, href: `#/reading?passage=${key.slice(8)}` };
    if (key.startsWith('listening:') && extra.listening?.lessons.some((x) => x.id === key.slice(10))) return { title: 'Nghe · ' + extra.listening.lessons.find((x) => x.id === key.slice(10)).title, href: `#/listening?lesson=${key.slice(10)}` };
    if (key.startsWith('test:')) return { title: `Kiểm tra cuối chương ${key.slice(5)}`, href: '#/learning-path' };
    return null;
  }).filter(Boolean);
  const favWords = Object.keys(review.favorites).filter((k) => k.startsWith('w:') && wordById[k.slice(2)]).map((k) => wordById[k.slice(2)]);
  const favLessons = Object.keys(review.favorites).filter((k) => k.startsWith('g:') && lessonById[k.slice(2)]).map((k) => lessonById[k.slice(2)]);
  return { dueWords, wrong, weak, unfinished, favWords, favLessons };
}

export function buildReviewSession(info, vocab, max = 16) {
  const words = vocab?.words || [];
  const ids = new Set(info.dueWords.map((w) => w.id));
  info.wrong.filter((x) => x.kind === 'vocab').forEach((x) => ids.add(x.word.id));
  const qs = [];
  [...ids].slice(0, 10).forEach((id, i) => { const w = words.find((x) => x.id === id); const q = buildQuestion(REVIEW_TYPES[i % REVIEW_TYPES.length], w, words); q.src = 'vocab'; qs.push(q); });
  info.wrong.filter((x) => x.kind === 'grammar').slice(0, 8).forEach((x) => qs.push(x.q));
  return shuffle(qs).slice(0, max);
}

export async function render(root) {
  const [rawVocab, grammar, reading, listening] = await Promise.all([loadData('vocabulary'), loadData('grammar'), loadData('reading'), loadData('listening')]);
  if (!rawVocab || !grammar) {
    root.append(h('div', { class: 'card', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Không tải được dữ liệu ôn tập'), h('p', { class: 'muted' }, 'Hãy kiểm tra kết nối rồi tải lại trang. Tiến độ của bạn không bị ảnh hưởng.')));
    return;
  }

  const vocab = withCustom(rawVocab);
  const extra = { reading, listening };

  function runSession(info) {
    const questions = buildReviewSession(info, vocab);
    if (!questions.length) return;
    state.startSession('review');
    const stage = h('div', {});
    root.replaceChildren(h('div', { class: 'page-head' }, h('h1', { class: 'sr-only', tabindex: '-1' }, 'Ôn tập tổng hợp'), h('button', { class: 'btn', type: 'button', onclick: () => { state.endSession(); home(); } }, '← Trung tâm ôn tập')), stage);
    runQuiz(stage, {
      title: 'Ôn tập tổng hợp', questions,
      onAnswer: (q, ok) => (q.src === 'vocab' ? recordAnswer(q.wordId, ok ? 4 : 1) : recordGrammarAnswer(q, ok)),
      onFinish: ({ right, total, pct }) => { recordQuizResult({ kind: 'review', id: 'review', title: 'Ôn tập tổng hợp', right, total, pct, href: '#/review' }); state.endSession(); state.notify(); },
      actions: [{ label: 'Về Trung tâm ôn tập', onclick: home }],
    });
  }

  function section(id, title, items, empty, renderItem) {
    return h('section', { class: 'card stack', 'aria-labelledby': id },
      h('h2', { id }, `${title} (${formatNumber(items.length)})`),
      items.length ? h('ul', { class: 'plain-list' }, items.slice(0, SHOW).map(renderItem)) : h('div', { class: 'empty' }, empty),
      items.length > SHOW ? h('p', { class: 'muted' }, `và ${items.length - SHOW} mục khác`) : null);
  }

  function home() {
    const info = collectReview(vocab, grammar, Date.now(), extra);
    const sessionSize = buildReviewSession(info, vocab).length;
    const stat = (l, v) => h('div', { class: 'stat' }, h('div', { class: 'stat-label' }, l), h('div', { class: 'stat-value' }, formatNumber(v)));
    root.replaceChildren(
      h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Trung tâm ôn tập'), h('p', {}, 'Tổng hợp từ đến hạn, câu đã trả lời sai, chủ đề ngữ pháp yếu và nội dung bạn đã đánh dấu.')),
      h('section', { class: 'grid-stats', 'aria-label': 'Tổng quan ôn tập' },
        stat('Từ đến hạn', info.dueWords.length), stat('Câu trả lời sai', info.wrong.length), stat('Ngữ pháp yếu', info.weak.length), stat('Bài chưa xong', info.unfinished.length), stat('Yêu thích', info.favWords.length + info.favLessons.length)),
      h('section', { class: 'card stack', 'aria-labelledby': 'rs-h' },
        h('h2', { id: 'rs-h' }, 'Phiên ôn tập tổng hợp'),
        sessionSize
          ? [h('p', { class: 'muted' }, `Gồm ${sessionSize} câu từ các từ đến hạn, từ trả lời sai và câu ngữ pháp sai. Câu sai ở Đọc và Nghe cần làm lại trong bài gốc (có liên kết bên dưới). Mỗi câu trả lời cập nhật lịch ôn ngay.`), h('div', {}, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => runSession(info) }, 'Bắt đầu ôn tập'))]
          : h('div', { class: 'empty' }, h('strong', {}, 'Chưa có gì cần ôn'), 'Hãy học từ vựng hoặc làm bài tập ngữ pháp trước. Từ đến hạn và câu sai sẽ xuất hiện ở đây.')),
      section('rw-h', 'Từ vựng đến hạn', info.dueWords, 'Không có từ nào đến hạn.', (w) => h('li', {}, h('b', {}, w.w), ' — ', w.vi)),
      section('rq-h', 'Câu đã trả lời sai', info.wrong, 'Chưa có câu sai nào được ghi nhận.', (x) => (x.kind === 'vocab'
        ? h('li', {}, h('b', {}, x.word.w), ' — ', x.word.vi, h('span', { class: 'muted' }, ` · Từ vựng · sai ${x.count} lần`))
        : x.kind === 'reading' || x.kind === 'listening'
          ? h('li', {}, x.q.q, ' → ', h('b', {}, x.q.answer), h('span', { class: 'muted' }, ` · ${x.kind === 'reading' ? 'Đọc' : 'Nghe'}: `), h('a', { href: x.href }, x.title), h('span', { class: 'muted' }, ` · sai ${x.count} lần`))
          : h('li', {}, x.q.prompt, ' → ', h('b', {}, x.q.answer), h('span', { class: 'muted' }, ` · ${x.lesson.title} · sai ${x.count} lần`)))),
      section('rg-h', 'Chủ đề ngữ pháp cần ôn', info.weak, 'Chưa có chủ đề nào được đánh dấu yếu (điểm dưới 80%).', (x) => h('li', {}, h('a', { href: `#/grammar?lesson=${x.lesson.id}` }, x.lesson.title), h('span', { class: 'muted' }, ` · lần gần nhất ${Math.round(x.pct)}%`))),
      section('ru-h', 'Bài chưa hoàn thành', info.unfinished, 'Không có bài nào đang dở.', (x) => h('li', {}, h('a', { href: x.href }, x.title))),
      section('rf-h', 'Đã đánh dấu yêu thích', [...info.favLessons.map((l) => ({ lesson: l })), ...info.favWords.map((w) => ({ word: w }))], 'Bạn chưa đánh dấu mục nào. Nhấn biểu tượng ngôi sao ở danh sách từ hoặc trong bài ngữ pháp.', (x) => (x.lesson
        ? h('li', {}, h('a', { href: `#/grammar?lesson=${x.lesson.id}` }, x.lesson.title), h('span', { class: 'muted' }, ' · Ngữ pháp'))
        : h('li', {}, h('b', {}, x.word.w), ' — ', x.word.vi))));
    root.querySelector('h1')?.focus({ preventScroll: true });
  }
  home();
}
