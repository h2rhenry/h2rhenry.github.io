import * as store from './storage.js';
import * as state from './state.js';
import { h, hashParams, formatDate } from './utils.js';
import { loadData } from './data.js';
import { mountQuestionSet } from './exercise-set.js';
import { addCustomWord } from './vocabulary.js';
import { recordQuizResult } from './results.js';

const PASS = 70;
const STATE = (p) => (!p ? 'Chưa đọc' : p.status === 'completed' ? `Hoàn thành · cao nhất ${Math.round(p.best)}%` : 'Đang làm dở');

export const sentenceOf = (passage, word) => {
  const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  const sentences = passage.paragraphs.join(' ').match(/[^.!?]+[.!?]*/g) || [];
  return (sentences.find((s) => re.test(s)) || '').trim();
};

export async function render(root) {
  const data = await loadData('reading');
  if (!data) { root.append(h('div', { class: 'card', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Không tải được bài đọc'), h('p', { class: 'muted' }, 'Hãy kiểm tra kết nối rồi tải lại trang.'))); return; }
  const passage = data.passages.find((x) => x.id === hashParams().get('passage'));
  passage ? passageView(root, passage) : listView(root, data);
}

function listView(root, data) {
  const lessons = store.get('progress').lessons;
  root.append(h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Luyện đọc'), h('p', {}, 'Bài đọc theo cấp độ, có từ vựng quan trọng, câu hỏi chi tiết, tìm thông tin và suy luận. Chạm vào từ chưa biết để đánh dấu.')),
    ...[...new Set(data.passages.map((p) => p.level))].map((lv) => h('section', { class: 'card stack', 'aria-labelledby': 'rd-' + lv },
      h('h2', { id: 'rd-' + lv }, `Cấp độ ${lv}`),
      h('ul', { class: 'plain-list' }, data.passages.filter((p) => p.level === lv).map((p) => h('li', { class: 'word-row' },
        h('div', { class: 'word-main' }, h('a', { href: `#/reading?passage=${p.id}` }, h('b', {}, p.title)), h('div', { class: 'muted' }, `${p.questions.length} câu hỏi`)),
        h('div', { class: 'word-side' }, h('span', { class: 'badge' }, STATE(lessons['reading:' + p.id])))))))));
}

function passageView(root, p) {
  const key = 'reading:' + p.id;
  const saved = store.get('progress').lessons[key] || {};
  let unknown = [...(saved.unknown || [])];
  const href = `#/reading?passage=${p.id}`;
  state.startSession(key);

  const persist = (patch) => store.update('progress', (pr) => {
    const cur = pr.lessons[key] || { status: 'in-progress', best: 0, attempts: 0 };
    pr.lessons[key] = { ...cur, ...patch, at: Date.now() };
    pr.lastLesson = { title: `Đọc · ${p.title}`, href };
  });
  const customIds = () => store.get('vocabulary').custom || {};
  const info = (w) => p.vocab.find((v) => v.w.toLowerCase() === w.toLowerCase());

  const unknownBox = h('div', { class: 'stack' });
  const vocabBox = h('ul', { class: 'plain-list' });
  const status = h('p', { class: 'muted', role: 'status' });

  function paintTokens() {
    root.querySelectorAll('.tok').forEach((el) => el.classList.toggle('marked', unknown.includes(el.dataset.w)));
  }
  function toggle(word) {
    const w = word.toLowerCase();
    unknown = unknown.includes(w) ? unknown.filter((x) => x !== w) : [...unknown, w];
    persist({ unknown });
    paintTokens(); paintUnknown();
  }
  function addToReview(word, vi, pos) {
    const w = word.toLowerCase();
    if (!vi.trim()) { status.textContent = `Hãy nhập nghĩa tiếng Việt của "${w}" (tra từ điển) trước khi thêm.`; return false; }
    addCustomWord({ w, vi: vi.trim(), pos, ex: sentenceOf(p, w), exVi: '', src: key });
    unknown = unknown.filter((x) => x !== w);
    persist({ unknown });
    status.textContent = `Đã thêm "${w}" vào danh sách ôn tập. Từ này sẽ đến hạn ôn ngay.`;
    state.notify(); paintTokens(); paintUnknown(); paintVocab();
    return true;
  }
  function paintUnknown() {
    const input = h('input', { id: 'add-unknown', class: 'answer-input', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
    unknownBox.replaceChildren(
      h('div', {}, h('label', { for: 'add-unknown', class: 'muted' }, 'Thêm từ chưa biết bằng bàn phím'), h('div', { class: 'answer-row' }, input,
        h('button', { class: 'btn', type: 'button', onclick: () => { const w = input.value.trim().toLowerCase(); if (/^[a-z'’-]+( [a-z'’-]+)*$/.test(w) && !unknown.includes(w)) { unknown.push(w); persist({ unknown }); paintTokens(); paintUnknown(); } else status.textContent = 'Hãy nhập một từ hoặc cụm từ tiếng Anh hợp lệ.'; } }, 'Thêm'))),
      unknown.length ? h('ul', { class: 'plain-list' }, unknown.map((w) => {
        const meaning = h('input', { class: 'answer-input', type: 'text', 'aria-label': `Nghĩa tiếng Việt của ${w}`, placeholder: 'Nghĩa tiếng Việt', value: info(w)?.vi || '' });
        return h('li', { class: 'word-row' }, h('div', { class: 'word-main' }, h('b', {}, w), meaning),
          h('div', { class: 'word-side' }, h('button', { class: 'btn', type: 'button', onclick: () => addToReview(w, meaning.value, info(w)?.pos) }, 'Thêm vào ôn tập'), h('button', { class: 'btn', type: 'button', onclick: () => toggle(w) }, 'Bỏ đánh dấu')));
      })) : h('div', { class: 'empty' }, 'Chưa đánh dấu từ nào. Chạm vào một từ trong bài để đánh dấu.'));
  }
  function paintVocab() {
    vocabBox.replaceChildren(...p.vocab.map((v) => {
      const added = !!customIds()['u-' + v.w.toLowerCase().replace(/\s+/g, '-')];
      return h('li', { class: 'word-row' }, h('div', { class: 'word-main' }, h('b', {}, v.w), ' ', h('span', { class: 'muted' }, `(${v.pos})`), h('div', {}, v.vi)),
        h('div', { class: 'word-side' }, added ? h('span', { class: 'badge' }, 'Đã thêm vào ôn tập') : h('button', { class: 'btn', type: 'button', onclick: () => addToReview(v.w, v.vi, v.pos) }, 'Thêm vào ôn tập')));
    }));
  }

  const body = p.paragraphs.map((para) => h('p', { class: 'passage-p' }, ...para.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/).map((tok, i) => (i % 2
    ? h('span', { class: 'tok', 'data-w': tok.toLowerCase(), onclick: () => toggle(tok) }, tok) : tok))));

  const qBox = h('div', { class: 'stack' });
  mountQuestionSet(qBox, {
    questions: p.questions, draft: saved.draft || {},
    onDraft: (draft) => persist({ draft }),
    onRetry: () => persist({ draft: {} }),
    onSubmit: (res) => {
      store.update('progress', (pr) => {
        const prev = pr.lessons[key] || { attempts: 0, best: 0 };
        pr.lessons[key] = { ...prev, status: res.pct >= PASS || prev.status === 'completed' ? 'completed' : 'in-progress', best: Math.max(prev.best || 0, res.pct), attempts: (prev.attempts || 0) + 1, draft: {}, at: Date.now() };
      });
      store.update('review', (r) => res.results.forEach(({ q, correct }) => {
        const k = `r:${p.id}:${q.id}`;
        if (correct) delete r.wrongQuestions[k];
        else { const e = r.wrongQuestions[k] || { kind: 'reading', lesson: p.id, qid: q.id, count: 0 }; e.count += 1; e.at = Date.now(); r.wrongQuestions[k] = e; }
      }));
      state.recordActivity({ items: res.total });
      recordQuizResult({ kind: 'reading', id: p.id, title: `Đọc · ${p.title}`, right: res.right, total: res.total, pct: res.pct, href });
      state.notify();
    },
  });

  root.append(
    h('p', {}, h('a', { href: '#/reading' }, '← Danh sách bài đọc')),
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, p.title), h('p', {}, h('span', { class: 'badge' }, 'Cấp độ ' + p.level), ' ', h('span', { class: 'muted' }, STATE(saved.status ? saved : null) + (saved.at ? ` · ${formatDate(saved.at)}` : '')))),
    h('section', { class: 'card stack', 'aria-labelledby': 'rp-h' }, h('h2', { id: 'rp-h' }, 'Bài đọc'), h('p', { class: 'muted' }, 'Chạm vào từ bạn chưa biết để đánh dấu (gạch chân).'), ...body),
    h('section', { class: 'card stack', 'aria-labelledby': 'rv-h' }, h('h2', { id: 'rv-h' }, 'Từ vựng quan trọng'), vocabBox),
    h('section', { class: 'card stack', 'aria-labelledby': 'ru-h' }, h('h2', { id: 'ru-h' }, 'Từ tôi chưa biết'), unknownBox, status),
    h('section', { class: 'card stack', 'aria-labelledby': 'rq-h' }, h('h2', { id: 'rq-h' }, `Câu hỏi (${p.questions.length})`), qBox));
  paintTokens(); paintUnknown(); paintVocab();
}
