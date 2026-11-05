import * as store from './storage.js';
import * as state from './state.js';
import { h, hashParams } from './utils.js';
import { loadData } from './data.js';
import { mountQuestionSet } from './exercise-set.js';
import { buildPlayer } from './tts-player.js';
import { countdown, historyList, recordPractice } from './exam-ui.js';
import { speechSupported, speakAsync, stopSpeech } from './speech.js';
import { scene } from './toeic-scenes.js';

const LETTERS = 'ABCD';
const letter = (opt, j) => `(${LETTERS[j]}) ${opt}`;

/* Phát lần lượt nhiều đoạn bằng giọng tổng hợp; gọi lại sẽ dừng lượt cũ. */
let seq = 0;
async function playSeq(texts, rate = 0.9) {
  stopSpeech();
  const mine = ++seq;
  for (const t of texts) {
    if (mine !== seq) return;
    if (!(await speakAsync(t, { rate }))) return;
  }
}
const noVoiceNote = () => h('p', { class: 'notice', role: 'alert' }, 'Trình duyệt này không có giọng đọc, nên nội dung nghe được hiển thị dạng chữ để bạn luyện đọc thay thế.');

function photoNode(it) {
  const box = h('div', { class: 'stack' }, h('div', { class: 'scene-wrap' }, scene(it.scene, it.alt)));
  if (speechSupported()) {
    box.append(h('div', { class: 'btn-row' },
      LETTERS.split('').map((L, k) => h('button', { class: 'btn', type: 'button', onclick: () => playSeq([`${L}.`, it.statements[k]]) }, `Nghe (${L})`)),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => playSeq(it.statements.flatMap((s, k) => [`${LETTERS[k]}.`, s])) }, 'Nghe cả bốn')),
      h('p', { class: 'muted' }, 'Giọng đọc tổng hợp của trình duyệt, không tương đương người bản ngữ. Nội dung các câu sẽ hiện sau khi bạn nộp bài.'));
  } else {
    box.append(noVoiceNote(), h('ul', { class: 'plain-list' }, it.statements.map((s, k) => h('li', {}, `(${LETTERS[k]}) ${s}`))));
  }
  return box;
}

function qaNode(it) {
  if (!speechSupported()) return h('div', { class: 'stack' }, noVoiceNote(), h('p', {}, h('b', {}, it.question)), h('ul', { class: 'plain-list' }, it.responses.map((r, k) => h('li', {}, `(${LETTERS[k]}) ${r}`))));
  return h('div', { class: 'stack' },
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => playSeq([it.question, ...it.responses.flatMap((r, k) => [`${LETTERS[k]}.`, r])]) }, 'Nghe câu hỏi và các đáp án'),
      h('button', { class: 'btn', type: 'button', onclick: () => playSeq([it.question]) }, 'Chỉ nghe câu hỏi')),
    h('p', { class: 'muted' }, 'Nội dung sẽ hiện sau khi bạn nộp bài.'));
}

function groupAudio(part, g, heading) {
  const idp = `${part.id}-${g.id}`;
  const { node } = buildPlayer({ lines: g.lines.map((x) => ({ who: x.who, text: x.text })), heading, idPrefix: idp });
  const supported = speechSupported();
  const tBody = h('div', { class: 'stack', id: idp + '-tr', hidden: supported }, h('ul', { class: 'plain-list' }, g.lines.map((x) => h('li', {}, g.lines.length > 1 ? h('b', {}, x.who + ': ') : null, x.text))));
  const tBtn = h('button', { class: 'btn', type: 'button', 'aria-expanded': String(!supported), 'aria-controls': idp + '-tr', onclick: () => {
    const open = tBody.hidden; tBody.hidden = !open; tBtn.setAttribute('aria-expanded', String(open)); tBtn.textContent = open ? 'Ẩn transcript' : 'Hiện transcript';
  } }, supported ? 'Hiện transcript' : 'Ẩn transcript');
  return h('div', { class: 'stack' }, node, h('div', {}, tBtn), tBody);
}

const textCard = (id, heading, paragraphs) => h('section', { class: 'card stack', 'aria-labelledby': id }, h('h3', { id }, heading), ...paragraphs.map((t) => h('p', { class: 'passage-p' }, t)));

/** Dựng danh sách câu hỏi phẳng cho một Part (có nội dung đi kèm: tranh, âm thanh, đoạn văn). */
export function buildPartQuestions(part) {
  const qs = [];
  if (part.id === 'part1') {
    part.items.forEach((it, i) => qs.push({ id: `p1-${i + 1}`, kind: 'mc', q: `Photograph ${i + 1}`, options: ['A', 'B', 'C', 'D'], answer: it.answer, label: (o) => `(${o})`, extra: () => photoNode(it),
      why: `${it.why} Các câu đã nghe: ${it.statements.map((s, k) => `(${LETTERS[k]}) ${s}`).join(' ')}` }));
  } else if (part.id === 'part2') {
    part.items.forEach((it, i) => qs.push({ id: `p2-${i + 1}`, kind: 'mc', q: `Question ${i + 1}`, options: ['A', 'B', 'C'], answer: it.answer, label: (o) => `(${o})`, extra: () => qaNode(it),
      why: `${it.why} Transcript: "${it.question}" ${it.responses.map((r, k) => `(${LETTERS[k]}) ${r}`).join(' ')}` }));
  } else if (part.groups) {
    part.groups.forEach((g, gi) => g.questions.forEach((q, k) => {
      const base = { id: `${part.id}-${g.id}-${k + 1}`, kind: 'mc', q: q.q, options: q.options, answer: q.answer, why: q.why, label: letter };
      if (k === 0) {
        if (part.id === 'part3' || part.id === 'part4') base.before = () => groupAudio(part, g, part.id === 'part3' ? `Hội thoại ${gi + 1}` : `Bài nói ${gi + 1}`);
        else if (part.id === 'part6') base.before = () => textCard(`${part.id}-${g.id}-h`, `Văn bản ${gi + 1}: ${g.title}`, g.text);
        else base.before = () => h('div', { class: 'stack' }, ...g.passages.map((p, pi) => textCard(`${part.id}-${g.id}-${pi}`, `${g.title}${g.passages.length > 1 ? ' · ' + p.label : ''}`, p.text)));
      }
      qs.push(base);
    }));
  } else {
    part.items.forEach((it, i) => qs.push({ id: `${part.id}-${i + 1}`, kind: 'mc', q: it.q, options: it.options, answer: it.answer, why: it.why, label: letter }));
  }
  return qs;
}

export async function render(root) {
  const data = await loadData('toeic');
  if (!data) { root.append(h('div', { class: 'card', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Không tải được dữ liệu TOEIC'), h('p', { class: 'muted' }, 'Hãy kiểm tra kết nối rồi tải lại trang. Tiến độ của bạn không bị ảnh hưởng.'))); return; }
  const part = data.parts.find((p) => p.id === hashParams().get('part'));
  part ? partView(root, part) : home(root, data);
}

function home(root, data) {
  const lessons = store.get('progress').lessons;
  const count = (p) => buildPartQuestions(p).length;
  const row = (p) => {
    const prog = lessons['toeic:' + p.id];
    return h('li', { class: 'word-row' },
      h('div', { class: 'word-main' }, h('a', { href: `#/toeic?part=${p.id}` }, h('b', {}, p.title)), h('div', { class: 'muted' }, `${count(p)} câu${p.minutes ? ` · gợi ý ${p.minutes} phút` : ''}`)),
      h('div', { class: 'word-side' }, prog && prog.attempts ? h('span', { class: 'badge' }, `Đã luyện ${prog.attempts} lần · cao nhất ${Math.round(prog.best)}%`) : null));
  };
  const card = (id, title, skill) => h('section', { class: 'card stack', 'aria-labelledby': id }, h('h2', { id }, title), h('ul', { class: 'plain-list' }, data.parts.filter((p) => p.skill === skill).map(row)));
  root.append(
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'TOEIC Preparation'), h('p', {}, 'Luyện TOEIC Listening & Reading theo từng Part. Mỗi Part có hướng dẫn, câu hỏi, đáp án, lời giải và lịch sử điểm.')),
    h('p', { class: 'notice' }, data.disclaimer),
    h('div', { class: 'exam-grid' },
      card('tl-h', 'Listening (Part 1–4)', 'listening'),
      card('tr-h', 'Reading (Part 5–7)', 'reading')),
    h('section', { class: 'card stack', 'aria-labelledby': 'tf-h' }, h('h2', { id: 'tf-h' }, 'TOEIC Speaking & Writing'), h('div', { class: 'empty' }, h('strong', {}, 'Đang chờ bổ sung'), data.future)),
    h('section', { class: 'card stack', 'aria-labelledby': 'th-h' }, h('h2', { id: 'th-h' }, 'Lịch sử điểm số'), historyList('toeic')));
}

function partView(root, part) {
  const key = 'toeic:' + part.id;
  const href = `#/toeic?part=${part.id}`;
  const title = `TOEIC ${part.title}`;
  state.startSession(key);
  const saved = store.get('progress').lessons[key] || {};
  const persist = (patch) => store.update('progress', (p) => {
    const cur = p.lessons[key] || { attempts: 0, best: 0, status: 'in-progress' };
    p.lessons[key] = { ...cur, ...patch, at: Date.now() };
    p.lastLesson = { title, href };
  });
  const questions = buildPartQuestions(part);
  const box = h('div', { class: 'stack' });
  const history = h('div', {});
  const paintHistory = () => history.replaceChildren(historyList('toeic', 10, part.id));
  mountQuestionSet(box, {
    questions, draft: saved.draft || {}, idPrefix: 'te',
    onDraft: (draft) => persist({ draft }), onRetry: () => persist({ draft: {} }),
    onSubmit: (res) => { recordPractice({ kind: 'toeic', id: part.id, title, right: res.right, total: res.total, pct: res.pct, href }); paintHistory(); },
  });
  const timer = part.minutes ? countdown(part.minutes * 60, { label: `Thời gian gợi ý (${part.minutes} phút)` }) : null;
  paintHistory();
  root.append(...[
    h('p', {}, h('a', { href: '#/toeic' }, '← TOEIC Preparation')),
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, part.title), h('p', {}, h('span', { class: 'badge' }, part.skill === 'listening' ? 'Listening' : 'Reading'))),
    h('section', { class: 'card stack', 'aria-labelledby': 'ti-h' }, h('h2', { id: 'ti-h' }, 'Hướng dẫn'), h('p', {}, part.instructions),
      timer ? [timer.node, h('p', { class: 'muted' }, 'Thời gian chỉ là gợi ý để luyện tốc độ, không phải quy định của kỳ thi. Hết giờ bài không tự nộp.')] : h('p', { class: 'muted' }, 'Phần Listening không giới hạn số lần nghe khi luyện tập (khác bài thi thật).')),
    h('section', { class: 'card stack', 'aria-labelledby': 'tq-h' }, h('h2', { id: 'tq-h' }, `Câu hỏi (${questions.length})`), box,
      h('p', { class: 'notice' }, 'Kết quả chỉ là số câu đúng trong bài luyện tập, không phải điểm TOEIC chính thức.')),
    h('section', { class: 'card stack', 'aria-labelledby': 'tp-h' }, h('h2', { id: 'tp-h' }, 'Lịch sử điểm của phần này'), history),
  ].flat().filter(Boolean));
}
