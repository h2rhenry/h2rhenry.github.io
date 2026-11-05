import * as store from './storage.js';
import * as state from './state.js';
import { h, formatNumber, hashParams } from './utils.js';
import { icon } from './icons.js';
import { reviewWord, wordStatus, isDue, newRecord } from './spaced-repetition.js';
import { runQuiz, shuffle } from './quiz.js';
import { speak, speechSupported } from './speech.js';
import { loadData } from './data.js';
import { recordQuizResult } from './results.js';

export const POS = { n: 'danh từ', v: 'động từ', adj: 'tính từ', adv: 'trạng từ', interj: 'thán từ', num: 'số từ', prep: 'giới từ', conj: 'liên từ', pron: 'đại từ', det: 'từ hạn định' };
export const MODES = [
  { id: 'flashcards', label: 'Flashcards', desc: 'Lật thẻ, rồi tự đánh giá mức nhớ.' },
  { id: 'en-vi', label: 'Anh → Việt', desc: 'Chọn nghĩa tiếng Việt đúng.' },
  { id: 'vi-en', label: 'Việt → Anh', desc: 'Chọn từ tiếng Anh đúng.' },
  { id: 'fill', label: 'Điền vào chỗ trống', desc: 'Gõ từ còn thiếu trong câu.' },
  { id: 'spelling', label: 'Chính tả', desc: 'Nghe và gõ lại từ.' },
  { id: 'context', label: 'Theo ngữ cảnh', desc: 'Chọn từ hợp với câu.' },
  { id: 'review', label: 'Ôn tập đến hạn', desc: 'Chỉ gồm các từ đã đến hạn ôn.' },
];
export const posLabel = (w) => POS[w.pos] || 'từ';
const meta = (w) => [w.ipa, posLabel(w)].filter(Boolean).join(' · ');

/** Gộp từ do người dùng tự thêm (từ bài đọc) vào danh sách từ. */
export function withCustom(data) {
  const custom = Object.values(store.get('vocabulary').custom || {}).filter((c) => c.vi);
  return { ...data, words: [...data.words, ...custom], topics: custom.length ? [...data.topics, { id: 'custom', name: 'Từ tôi đã thêm', level: '' }] : data.topics };
}
export function addCustomWord({ w, vi, pos, ex, exVi, src }) {
  const id = 'u-' + w.toLowerCase().trim().replace(/\s+/g, '-');
  store.update('vocabulary', (v) => {
    v.custom[id] = { id, w: w.toLowerCase().trim(), vi, pos: pos || '', ipa: '', ex: ex || '', exVi: exVi || '', topic: 'custom', level: '', src };
    if (!v.words[id]) v.words[id] = { ...newRecord(), nextReviewAt: Date.now() };
  });
  return id;
}
export function removeCustomWord(id) {
  store.update('vocabulary', (v) => { delete v.custom[id]; delete v.words[id]; });
  store.update('review', (r) => { delete r.favorites['w:' + id]; delete r.wrongQuestions['v:' + id]; });
}

const REVIEW_TYPES = ['en-vi', 'vi-en', 'context', 'fill'];
const ROUND = 10;

const load = () => loadData('vocabulary');

/* ---------- Logic thuần (có thể test) ---------- */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const blankSentence = (w) => w.ex.replace(new RegExp('\\b' + escapeRe(w.w) + '\\b', 'i'), '_____');

export function pickOthers(words, w, key, n = 3) {
  const seen = new Set([w[key].toLowerCase()]);
  const pool = [...shuffle(words.filter((x) => x.id !== w.id && x.pos === w.pos)), ...shuffle(words.filter((x) => x.id !== w.id && x.pos !== w.pos))];
  const out = [];
  for (const x of pool) {
    const k = x[key].toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k); out.push(x[key]);
    if (out.length === n) break;
  }
  return out;
}

export const containsWord = (w) => !!w.ex && new RegExp('\\b' + escapeRe(w.w) + '\\b', 'i').test(w.ex);

export function buildQuestion(type, w, words) {
  if ((type === 'fill' || type === 'context') && !containsWord(w)) type = 'en-vi';
  const explanation = `${w.w} ${w.ipa || ''} (${posLabel(w)}): ${w.vi}.`.replace(/ {2,}/g, ' ') + (w.ex ? ` Ví dụ: ${w.ex}${w.exVi ? ' — ' + w.exVi : ''}` : '');
  const base = { id: `${type}:${w.id}`, wordId: w.id, explanation };
  switch (type) {
    case 'en-vi': return { ...base, kind: 'mc', question: 'Chọn nghĩa tiếng Việt', prompt: w.w, sub: meta(w), audio: w.w, options: shuffle([w.vi, ...pickOthers(words, w, 'vi')]), answer: w.vi };
    case 'vi-en': return { ...base, kind: 'mc', question: 'Chọn từ tiếng Anh', prompt: w.vi, sub: posLabel(w), options: shuffle([w.w, ...pickOthers(words, w, 'w')]), answer: w.w };
    case 'context': return { ...base, kind: 'mc', question: 'Chọn từ phù hợp. Dựa vào nghĩa của câu bên dưới.', prompt: blankSentence(w), sub: w.exVi || undefined, options: shuffle([w.w, ...pickOthers(words, w, 'w')]), answer: w.w };
    case 'fill': return { ...base, kind: 'text', question: 'Điền từ còn thiếu', prompt: blankSentence(w), sub: w.exVi || undefined, answer: w.w };
    case 'spelling': return { ...base, kind: 'text', question: speechSupported() ? 'Nghe và gõ lại từ tiếng Anh' : 'Gõ từ tiếng Anh có nghĩa sau', prompt: speechSupported() ? 'Nhấn "Nghe phát âm"' : w.vi, sub: `Nghĩa: ${w.vi} · ${posLabel(w)}`, audio: w.w, answer: w.w };
    default: throw new Error('Chế độ không hợp lệ: ' + type);
  }
}

/** Chọn từ cho một lượt: ưu tiên từ đến hạn, rồi từ mới, rồi từ lâu chưa ôn. */
export function pickWords(words, records, { topic = 'all', due = false, limit = ROUND, now = Date.now() } = {}) {
  const pool = words.filter((w) => topic === 'all' || w.topic === topic);
  const dueList = pool.filter((w) => isDue(records[w.id], now)).sort((a, b) => records[a.id].nextReviewAt - records[b.id].nextReviewAt);
  if (due) return dueList.slice(0, limit);
  const fresh = pool.filter((w) => !records[w.id]?.lastReviewedAt);
  const rest = pool.filter((w) => records[w.id]?.lastReviewedAt && !dueList.includes(w)).sort((a, b) => records[a.id].lastReviewedAt - records[b.id].lastReviewedAt);
  return [...dueList, ...fresh, ...rest].slice(0, limit);
}

/* ---------- Ghi kết quả ---------- */
export function recordAnswer(wordId, quality) {
  reviewWord(wordId, quality);
  store.update('review', (r) => {
    const key = 'v:' + wordId;
    if (quality >= 3) delete r.wrongQuestions[key];
    else { const e = r.wrongQuestions[key] || { kind: 'vocab', id: wordId, count: 0 }; e.count += 1; e.at = Date.now(); r.wrongQuestions[key] = e; }
  });
  state.recordActivity({ items: 1 });
}

function recordRound(label, { right, total, pct }) {
  recordQuizResult({ kind: 'vocab', id: label, title: `Từ vựng · ${label}`, right, total, pct, href: '#/vocabulary' });
  state.endSession();
  state.notify();
}

/* ---------- Giao diện ---------- */
export async function render(root) {
  const raw = await load();
  if (!raw) {
    root.append(h('div', { class: 'card', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Không tải được dữ liệu từ vựng'), h('p', { class: 'muted' }, 'Hãy kiểm tra kết nối rồi tải lại trang. Tiến độ của bạn không bị ảnh hưởng.')));
    return;
  }
  const data = withCustom(raw);
  const { words, topics } = data;
  const byId = Object.fromEntries(words.map((w) => [w.id, w]));
  const filters = { topic: topics.some((t) => t.id === hashParams().get('topic')) ? hashParams().get('topic') : 'all', query: '' };

  const speakBtn = (text) => (speechSupported()
    ? h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': `Nghe phát âm: ${text}`, onclick: () => speak(text) }, icon('volume')) : null);

  function backBar(label) {
    return h('button', { class: 'btn', type: 'button', onclick: () => { state.endSession(); home(); } }, '← ' + label);
  }

  function runQuizMode(mode, picked) {
    const label = MODES.find((m) => m.id === mode).label;
    const questions = picked.map((w, i) => buildQuestion(mode === 'review' ? REVIEW_TYPES[i % REVIEW_TYPES.length] : mode, w, words));
    const stage = h('div', {});
    root.replaceChildren(h('div', { class: 'page-head' }, h('h1', { class: 'sr-only', tabindex: '-1' }, 'Luyện từ vựng'), backBar('Danh sách từ vựng')), stage);
    runQuiz(stage, {
      title: label, questions,
      onAnswer: (q, ok) => recordAnswer(q.wordId, ok ? 4 : 1),
      onFinish: (res) => recordRound(label, res),
      actions: [{ label: 'Về danh sách từ', onclick: home }],
    });
  }

  function runFlashcards(picked) {
    let i = 0; const tally = { 1: 0, 3: 0, 5: 0 };
    const stage = h('div', {});
    root.replaceChildren(h('div', { class: 'page-head' }, h('h1', { class: 'sr-only', tabindex: '-1' }, 'Luyện từ vựng'), backBar('Danh sách từ vựng')), stage);
    const settings = state.getSettings();

    function card() {
      const w = picked[i]; let flipped = false;
      const face = h('div', { class: 'flash-body' });
      const grades = h('div', { class: 'btn-row', hidden: true });
      const paint = () => {
        face.replaceChildren(...(flipped
          ? [h('p', { class: 'flash-word' }, w.vi), h('p', { class: 'muted' }, `${w.w} ${meta(w)}`), w.ex ? h('p', {}, w.ex) : null, w.exVi ? h('p', { class: 'muted' }, w.exVi) : null, w.col ? h('p', { class: 'muted' }, 'Cụm thường gặp: ' + w.col.join(', ')) : null].filter(Boolean)
          : [h('p', { class: 'flash-word' }, w.w), h('p', { class: 'muted' }, meta(w)), h('p', { class: 'muted' }, 'Hãy nhớ nghĩa, rồi lật thẻ.')]));
      };
      const flip = h('button', { class: 'btn btn-primary', type: 'button', 'aria-expanded': 'false', onclick: () => {
        flipped = true; paint(); flip.hidden = true; grades.hidden = false; grades.querySelector('button').focus();
      } }, 'Lật thẻ');
      const grade = (q, text) => h('button', { class: 'btn', type: 'button', onclick: () => {
        tally[q] += 1; recordAnswer(w.id, q); i += 1;
        i < picked.length ? card() : done();
      } }, text);
      grades.append(grade(1, 'Chưa nhớ'), grade(3, 'Khó nhớ'), grade(5, 'Nhớ rõ'));
      paint();
      stage.replaceChildren(
        h('div', { class: 'quiz-head' }, h('span', { class: 'muted' }, `Flashcards · Thẻ ${i + 1}/${picked.length}`), h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Tiến độ', 'aria-valuemin': '0', 'aria-valuemax': String(picked.length), 'aria-valuenow': String(i) }, h('span', { style: `width:${(i / picked.length) * 100}%` }))),
        h('div', { class: 'card stack flashcard', 'aria-live': 'polite' }, face, speakBtn(w.w), flip, grades));
      if (settings.autoPronounce) speak(w.w);
    }

    function done() {
      const pct = Math.round(((tally[3] + tally[5]) / picked.length) * 100);
      recordRound('Flashcards', { right: tally[3] + tally[5], total: picked.length, pct });
      stage.replaceChildren(h('div', { class: 'card stack' },
        h('h2', { tabindex: '-1', id: 'fc-done' }, `Hoàn thành ${picked.length} thẻ`),
        h('p', {}, `Nhớ rõ: ${tally[5]} · Khó nhớ: ${tally[3]} · Chưa nhớ: ${tally[1]}`),
        h('p', { class: 'muted' }, 'Từ "Chưa nhớ" sẽ quay lại sau khoảng 10 phút; từ nhớ rõ được giãn lịch ôn xa hơn.'),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: home }, 'Về danh sách từ')));
      stage.querySelector('#fc-done').focus();
    }
    card();
  }

  function start(mode, msg) {
    const records = store.get('vocabulary').words;
    const picked = pickWords(words, records, { topic: mode === 'review' ? 'all' : filters.topic, due: mode === 'review' });
    if (!picked.length) { msg.textContent = 'Hiện chưa có từ nào đến hạn ôn. Hãy học từ mới trước, lịch ôn sẽ tự xuất hiện.'; return; }
    msg.textContent = '';
    state.startSession('vocabulary:' + mode);
    mode === 'flashcards' ? runFlashcards(picked) : runQuizMode(mode, picked);
  }

  function home() {
    const records = store.get('vocabulary').words;
    const favs = store.get('review').favorites;
    const now = Date.now();
    const seen = words.filter((w) => records[w.id]?.lastReviewedAt);
    const mastered = seen.filter((w) => wordStatus(records[w.id]) === 'mastered').length;
    const dueCount = words.filter((w) => isDue(records[w.id], now)).length;
    const msg = h('p', { class: 'muted', role: 'status' });

    const topicSel = h('select', { id: 'topic-sel', class: 'select', onchange: (e) => { filters.topic = e.target.value; } },
      h('option', { value: 'all' }, 'Tất cả chủ đề'), topics.map((t) => h('option', { value: t.id }, t.level ? `${t.name} (${t.level})` : t.name)));
    topicSel.value = filters.topic;

    const list = h('ul', { class: 'plain-list word-list' });
    const paintList = () => {
      const q = filters.query.trim().toLowerCase();
      const shown = words.filter((w) => (filters.topic === 'all' || w.topic === filters.topic) && (!q || w.w.includes(q) || w.vi.toLowerCase().includes(q)));
      list.replaceChildren(...(shown.length ? shown.map((w) => {
        const st = wordStatus(records[w.id]);
        const due = isDue(records[w.id], now);
        const fav = h('button', { class: 'icon-btn sm', type: 'button', 'aria-pressed': String(!!favs['w:' + w.id]), 'aria-label': `Đánh dấu yêu thích: ${w.w}`, onclick: () => {
          const on = fav.getAttribute('aria-pressed') !== 'true';
          store.update('review', (r) => { if (on) r.favorites['w:' + w.id] = true; else delete r.favorites['w:' + w.id]; });
          fav.setAttribute('aria-pressed', String(on)); fav.classList.toggle('on', on);
        } }, icon('star'));
        if (favs['w:' + w.id]) fav.classList.add('on');
        return h('li', { class: 'word-row' },
          h('div', { class: 'word-main' }, h('b', {}, w.w), ' ', h('span', { class: 'muted' }, meta(w)), h('div', {}, w.vi), w.ex ? h('div', { class: 'muted' }, w.ex) : null),
          h('div', { class: 'word-side' }, h('span', { class: 'badge' }, due ? 'Đến hạn' : st === 'new' ? 'Mới' : st === 'mastered' ? 'Thành thạo' : 'Đang học'), speakBtn(w.w), fav,
            w.topic === 'custom' ? h('button', { class: 'btn', type: 'button', onclick: () => { if (confirm(`Xóa từ "${w.w}" khỏi danh sách ôn tập? Lịch ôn của từ này cũng bị xóa.`)) { removeCustomWord(w.id); root.replaceChildren(); render(root); } } }, 'Xóa') : null));
      }) : [h('li', { class: 'empty' }, h('strong', {}, 'Không tìm thấy từ nào'), 'Thử từ khóa khác hoặc chọn "Tất cả chủ đề".')]));
    };

    root.replaceChildren(
      h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Từ vựng'), h('p', {}, `${words.length.toLocaleString('vi-VN')} từ, cấp độ A0 đến C1, gồm 10 chủ đề IELTS/TOEIC. Nghĩa, phiên âm giọng Mỹ và câu ví dụ mang tính tham khảo.`)),
      h('section', { class: 'grid-stats', 'aria-label': 'Tiến độ từ vựng' },
        ...[['Tổng số từ', words.length], ['Đã học', seen.length], ['Thành thạo', mastered], ['Đến hạn ôn', dueCount]].map(([l, v]) => h('div', { class: 'stat' }, h('div', { class: 'stat-label' }, l), h('div', { class: 'stat-value' }, formatNumber(v))))),
      h('section', { class: 'card stack', 'aria-labelledby': 'modes-h' },
        h('h2', { id: 'modes-h' }, 'Chọn cách học'),
        h('div', {}, h('label', { for: 'topic-sel', class: 'muted' }, 'Chủ đề'), h('div', {}, topicSel)),
        h('div', { class: 'mode-grid' }, MODES.map((m) => h('button', { class: 'level-btn', type: 'button', onclick: () => start(m.id, msg) }, h('b', {}, m.id === 'review' ? `${m.label} (${dueCount})` : m.label), h('small', {}, m.desc)))),
        msg),
      h('section', { class: 'card stack', 'aria-labelledby': 'list-h' },
        h('h2', { id: 'list-h' }, 'Danh sách từ'),
        h('div', {}, h('label', { for: 'q', class: 'muted' }, 'Tìm theo từ tiếng Anh hoặc nghĩa'), h('div', {}, h('input', { id: 'q', class: 'answer-input', type: 'search', autocomplete: 'off', oninput: (e) => { filters.query = e.target.value; paintList(); } }))),
        list));
    topicSel.addEventListener('change', paintList);
    paintList();
    root.querySelector('h1')?.focus({ preventScroll: true });
  }

  home();
}
