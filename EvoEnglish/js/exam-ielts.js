import * as store from './storage.js';
import * as state from './state.js';
import { h, hashParams } from './utils.js';
import { loadData } from './data.js';
import { mountQuestionSet } from './exercise-set.js';
import { buildPlayer } from './tts-player.js';
import { mountEditor, rubricTotal, getDrafts } from './writing.js';
import { countdown, rubricUI, historyList, recordPractice } from './exam-ui.js';
import { createRecorder } from './recorder.js';
import { speak, speechSupported } from './speech.js';

const TRACKS = { academic: 'Academic', general: 'General Training' };
const SPEAK_CRIT = [
  ['fluency', 'Fluency and Coherence', 'Bạn có nói liền mạch, ít ngập ngừng và các ý có nối với nhau không?'],
  ['lexical', 'Lexical Resource', 'Từ vựng có đủ, chính xác và tự nhiên không?'],
  ['grammar', 'Grammatical Range and Accuracy', 'Có dùng nhiều cấu trúc câu và ít lỗi không?'],
  ['pron', 'Pronunciation', 'Lời nói có dễ hiểu, đúng trọng âm và ngữ điệu không?'],
];
const getTrack = () => (store.get('progress').ielts?.track === 'general' ? 'general' : 'academic');
const setTrack = (t) => store.update('progress', (p) => { p.ielts = { ...(p.ielts || {}), track: t }; });
const link = (section, id) => `#/ielts?section=${section}&set=${id}`;

/** Ghi kết quả luyện tập. self=true: điểm do người học tự chấm, không tính vào điểm trung bình. */
export function recordExam(args) { recordPractice({ kind: 'ielts', ...args }); }

export async function render(root) {
  const data = await loadData('ielts');
  if (!data) { root.append(h('div', { class: 'card', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Không tải được dữ liệu IELTS'), h('p', { class: 'muted' }, 'Hãy kiểm tra kết nối rồi tải lại trang. Tiến độ của bạn không bị ảnh hưởng.'))); return; }
  const q = hashParams();
  if (q.get('draft')) return draftView(root, data, q.get('draft'));
  const id = q.get('set');
  const find = {
    listening: () => data.listening.find((x) => x.id === id),
    reading: () => [...data.reading.academic, ...data.reading.general].find((x) => x.id === id),
    writing: () => [...data.writing.task1, ...data.writing.task2].find((x) => x.id === id),
    speaking: () => [...data.speaking.part1, ...data.speaking.part2, ...data.speaking.part3].find((x) => x.id === id),
  }[q.get('section')];
  const item = find && find();
  if (!item) return home(root, data);
  return { listening: listeningView, reading: readingView, writing: writingView, speaking: speakingView }[q.get('section')](root, item, data);
}

function home(root, data) {
  const t = getTrack();
  const lessons = store.get('progress').lessons;
  const badge = (id) => { const p = lessons['ielts:' + id]; return p && p.attempts ? h('span', { class: 'badge' }, `Đã luyện ${p.attempts} lần · cao nhất ${Math.round(p.best)}%`) : null; };
  const row = (title, sub, href, id) => h('li', { class: 'word-row' }, h('div', { class: 'word-main' }, h('a', { href }, h('b', {}, title)), sub ? h('div', { class: 'muted' }, sub) : null), h('div', { class: 'word-side' }, badge(id)));
  const card = (hid, title, items) => h('section', { class: 'card stack', 'aria-labelledby': hid }, h('h2', { id: hid }, title), h('ul', { class: 'plain-list' }, items));
  const trackBtn = (k) => h('button', { class: 'btn', type: 'button', 'aria-pressed': String(t === k), onclick: () => { setTrack(k); root.replaceChildren(); home(root, data); } }, TRACKS[k]);

  root.append(
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'IELTS Preparation'), h('p', {}, 'Khu luyện thi riêng, tách biệt với lộ trình học thông thường. Bài luyện có đáp án và lời giải; Writing và Speaking do bạn tự đánh giá theo tiêu chí.')),
    h('p', { class: 'notice' }, data.disclaimer),
    h('section', { class: 'card stack', 'aria-labelledby': 'tk-h' },
      h('h2', { id: 'tk-h' }, 'Chọn loại bài thi'),
      h('div', { class: 'btn-row', role: 'group', 'aria-label': 'Loại bài thi' }, trackBtn('academic'), trackBtn('general')),
      h('p', { class: 'muted' }, t === 'academic'
        ? 'Academic: Reading dùng văn bản học thuật; Writing Task 1 mô tả số liệu (bảng, biểu đồ).'
        : 'General Training: Reading dùng văn bản đời sống (thông báo, quảng cáo); Writing Task 1 là viết thư.'),
      h('p', { class: 'muted' }, 'Listening, Writing Task 2 và Speaking giống nhau ở hai loại.')),
    h('div', { class: 'exam-grid' },
      card('ls-h', 'Listening', data.listening.map((x) => row(x.title, x.section, link('listening', x.id), x.id))),
      card('rd-h', `Reading (${TRACKS[t]})`, data.reading[t].map((x) => row(x.title, `${x.questions.length} câu · gợi ý ${x.minutes} phút`, link('reading', x.id), x.id))),
      card('w1-h', `Writing Task 1 (${TRACKS[t]})`, data.writing.task1.filter((x) => x.track === t).map((x) => row(x.title, `Tối thiểu ${x.minWords} từ · gợi ý ${x.minutes} phút`, link('writing', x.id), x.id))),
      card('w2-h', 'Writing Task 2', data.writing.task2.map((x) => row(x.title, `Tối thiểu ${x.minWords} từ · gợi ý ${x.minutes} phút`, link('writing', x.id), x.id))),
      card('s1-h', 'Speaking Part 1', data.speaking.part1.map((x) => row(x.title, `${x.questions.length} câu hỏi`, link('speaking', x.id), x.id))),
      card('s2-h', 'Speaking Part 2', data.speaking.part2.map((x) => row(x.title, 'Thẻ gợi ý, 1 phút chuẩn bị, 2 phút nói', link('speaking', x.id), x.id))),
      card('s3-h', 'Speaking Part 3', data.speaking.part3.map((x) => row(x.title, `${x.questions.length} câu hỏi thảo luận`, link('speaking', x.id), x.id)))),
    h('section', { class: 'card stack', 'aria-labelledby': 'hs-h' }, h('h2', { id: 'hs-h' }, 'Lịch sử luyện tập'), historyList('ielts')));
}

const backLink = () => h('p', {}, h('a', { href: '#/ielts' }, '← IELTS Preparation'));

/* Hộp câu hỏi chấm điểm, có lưu nháp để làm tiếp. */
function scoredBox(set, title, href) {
  const key = 'ielts:' + set.id;
  const saved = store.get('progress').lessons[key] || {};
  const persist = (patch) => store.update('progress', (p) => {
    const cur = p.lessons[key] || { attempts: 0, best: 0, status: 'in-progress' };
    p.lessons[key] = { ...cur, ...patch, at: Date.now() };
    p.lastLesson = { title, href };
  });
  const box = h('div', { class: 'stack' });
  mountQuestionSet(box, {
    questions: set.questions, draft: saved.draft || {}, idPrefix: 'ie',
    onDraft: (draft) => persist({ draft }), onRetry: () => persist({ draft: {} }),
    onSubmit: (res) => recordExam({ id: set.id, title, right: res.right, total: res.total, pct: res.pct, href }),
  });
  return box;
}

function listeningView(root, set) {
  state.startSession('ielts:' + set.id);
  const title = `IELTS Listening · ${set.title}`;
  const { node: player } = buildPlayer({ lines: set.lines, goal: set.section, extraNote: 'Trong bài thi thật bạn thường chỉ nghe một lần. Ở đây bạn có thể nghe lại để luyện tập.', idPrefix: 'il' });
  const tBody = h('div', { class: 'stack', id: 'il-transcript', hidden: true }, h('ul', { class: 'plain-list' }, set.lines.map((x) => h('li', {}, h('b', {}, x.who + ': '), x.text))));
  const tBtn = h('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'il-transcript', onclick: () => {
    const open = tBody.hidden; tBody.hidden = !open; tBtn.setAttribute('aria-expanded', String(open)); tBtn.textContent = open ? 'Ẩn transcript' : 'Hiện transcript';
  } }, 'Hiện transcript');
  root.append(backLink(),
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Listening · ' + set.title), h('p', {}, h('span', { class: 'badge' }, set.section))),
    player,
    h('section', { class: 'card stack', 'aria-labelledby': 'it-h' }, h('h2', { id: 'it-h' }, 'Transcript'), h('p', { class: 'muted' }, 'Nên làm bài trước, rồi mới mở transcript để đối chiếu.'), h('div', {}, tBtn), tBody),
    h('section', { class: 'card stack', 'aria-labelledby': 'iq-h' }, h('h2', { id: 'iq-h' }, `Câu hỏi (${set.questions.length})`), h('p', { class: 'muted' }, set.instructions), scoredBox(set, title, link('listening', set.id))));
}

function readingView(root, set) {
  state.startSession('ielts:' + set.id);
  const isGT = set.id.startsWith('gt');
  const title = `IELTS Reading (${isGT ? TRACKS.general : TRACKS.academic}) · ${set.title}`;
  const timer = countdown(set.minutes * 60, { label: `Thời gian gợi ý (${set.minutes} phút)` });
  root.append(backLink(),
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Reading · ' + set.title), h('p', {}, h('span', { class: 'badge' }, isGT ? TRACKS.general : TRACKS.academic))),
    h('section', { class: 'card stack', 'aria-labelledby': 'rp-h' }, h('h2', { id: 'rp-h' }, 'Đồng hồ'), timer.node, h('p', { class: 'muted' }, 'Đồng hồ chỉ để tham khảo: hết giờ bài không tự nộp. Bài đọc do EvoEnglish tự soạn, thông tin trong bài chỉ phục vụ luyện tập.')),
    h('section', { class: 'card stack', 'aria-labelledby': 'rt-h' }, h('h2', { id: 'rt-h' }, 'Bài đọc'),
      ...set.paragraphs.map((p, i) => h('p', { class: 'passage-p' }, isGT && i === 0 ? h('b', {}, p) : p))),
    h('section', { class: 'card stack', 'aria-labelledby': 'rq-h' }, h('h2', { id: 'rq-h' }, `Câu hỏi (${set.questions.length})`), h('p', { class: 'muted' }, set.instructions), scoredBox(set, title, link('reading', set.id))));
}

function tableNode(t) {
  return h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' },
    h('caption', { class: 'muted' }, 'Số liệu giả định do EvoEnglish soạn'),
    h('thead', {}, h('tr', {}, t.head.map((c) => h('th', { scope: 'col' }, c)))),
    h('tbody', {}, t.rows.map((r) => h('tr', {}, r.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, c) : h('td', {}, c))))))));
}

function writingView(root, t, data, existing = null) {
  const isTask2 = t.track === 'both';
  const label = isTask2 ? 'Writing Task 2' : `Writing Task 1 (${TRACKS[t.track]})`;
  const task = { id: 'ielts:' + t.id, level: 'IELTS', title: 'IELTS · ' + t.title, prompt: t.prompt, minWords: t.minWords, maxWords: 0, structure: t.structure, phrases: t.phrases, checklist: t.checklist, sample: t.sample, sampleNotes: t.notes };
  mountEditor(root, {
    task, existing, commonChecklist: [], backHref: '#/ielts', backLabel: '← IELTS Preparation', draftHref: (id) => `#/ielts?draft=${id}`,
    limitSeconds: t.minutes * 60, rubric: t.criteria, badge: isTask2 ? 'Task 2 · Academic và General Training' : `Task 1 · ${TRACKS[t.track]}`,
    extraTop: t.table ? h('section', { class: 'card stack', 'aria-labelledby': 'tb-h' }, h('h2', { id: 'tb-h' }, 'Số liệu'), tableNode(t.table)) : null,
    onComplete: ({ draft }) => {
      const total = rubricTotal(draft.rating, t.criteria);
      if (total !== null) recordExam({ id: t.id, title: `IELTS ${label} · ${t.title} (tự chấm)`, right: total, total: 16, pct: Math.round((total / 16) * 100), self: true, items: 0, href: `#/ielts?draft=${draft.id}` });
    },
  });
}

function draftView(root, data, id) {
  const d = getDrafts().find((x) => x.id === id);
  const tid = d && String(d.taskId).replace(/^ielts:/, '');
  const t = [...data.writing.task1, ...data.writing.task2].find((x) => x.id === tid);
  if (!d || !t) { home(root, data); return; }
  writingView(root, t, data, d);
}

function speakingView(root, item) {
  const part = Number(item.id[1]);
  const key = 'ielts:' + item.id;
  state.startSession(key);
  const msg = h('p', { class: 'muted', role: 'status' });
  const recorder = createRecorder({ onMessage: (t) => { msg.textContent = t; } });
  const rubric = rubricUI(SPEAK_CRIT, 'sp');
  const ask = (q, i) => h('li', {}, q, ' ', speechSupported() ? h('button', { class: 'btn', type: 'button', 'aria-label': `Nghe câu hỏi ${i + 1}`, onclick: () => speak(q) }, 'Nghe') : null);

  let body;
  if (part === 2) {
    const talk = countdown(120, { label: 'Nói (2 phút)' });
    const prep = countdown(60, { label: 'Chuẩn bị (1 phút)', onEnd: () => { talk.start(); msg.textContent = 'Hết thời gian chuẩn bị. Hãy bắt đầu nói.'; } });
    const sample = h('div', { class: 'stack', id: 'sp-sample', hidden: true }, h('h3', {}, 'Gợi ý triển khai'), h('ul', { class: 'bullets' }, item.ideas.map((x) => h('li', {}, x))), h('h3', {}, 'Bài nói mẫu'), h('p', { class: 'sample-text' }, item.sample), h('p', { class: 'notice' }, 'Bài mẫu chỉ để tham khảo cách triển khai. Hãy nói bằng lời của bạn.'));
    const sBtn = h('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'sp-sample', onclick: () => { const open = sample.hidden; sample.hidden = !open; sBtn.setAttribute('aria-expanded', String(open)); sBtn.textContent = open ? 'Ẩn gợi ý và bài mẫu' : 'Xem gợi ý và bài mẫu'; } }, 'Xem gợi ý và bài mẫu');
    body = [h('section', { class: 'card stack', 'aria-labelledby': 'cc-h' }, h('h2', { id: 'cc-h' }, 'Thẻ gợi ý'),
      h('div', { class: 'cue-card' }, h('p', {}, h('b', {}, item.cue)), h('p', {}, 'You should say:'), h('ul', { class: 'bullets' }, item.bullets.map((b) => h('li', {}, b)))),
      prep.node, talk.node,
      h('div', {}, h('label', { for: 'sp-notes', class: 'muted' }, 'Ghi chú chuẩn bị (không được lưu)'), h('textarea', { id: 'sp-notes', class: 'answer-input', rows: '4', lang: 'en' })),
      h('div', {}, sBtn), sample)];
  } else {
    const timer = countdown(part === 1 ? 30 : 45, { label: 'Thời gian trả lời gợi ý cho mỗi câu' });
    body = [h('section', { class: 'card stack', 'aria-labelledby': 'qs-h' }, h('h2', { id: 'qs-h' }, 'Câu hỏi'),
      h('p', { class: 'muted' }, part === 1 ? 'Trả lời ngắn gọn, tự nhiên, khoảng 2–3 câu mỗi câu hỏi.' : 'Trả lời đầy đủ hơn, nêu ý kiến và giải thích lý do.'),
      h('ol', { class: 'plain-list' }, item.questions.map(ask)), timer.node)];
  }

  root.append(backLink(),
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, `Speaking Part ${part} · ${item.title}`), h('p', {}, h('span', { class: 'badge' }, `Part ${part}`))),
    ...body,
    h('section', { class: 'card stack', 'aria-labelledby': 'ir-h' }, h('h2', { id: 'ir-h' }, 'Ghi âm để tự nghe lại'), recorder.node, msg),
    h('section', { class: 'card stack', 'aria-labelledby': 'ia-h' }, h('h2', { id: 'ia-h' }, 'Tự đánh giá'), h('p', { class: 'notice' }, 'EvoEnglish không có AI chấm Speaking và không chấm điểm phát âm. Hãy nghe lại bản ghi âm rồi tự chấm theo từng tiêu chí.'), rubric.node,
      h('div', {}, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
        const total = rubric.sum();
        if (total === null) { msg.textContent = 'Hãy chấm đủ 4 tiêu chí trước khi lưu.'; return; }
        recordExam({ id: item.id, title: `IELTS Speaking Part ${part} · ${item.title} (tự chấm)`, right: total, total: 16, pct: Math.round((total / 16) * 100), self: true, items: 1, href: link('speaking', item.id) });
        msg.textContent = 'Đã lưu lần luyện tập này vào lịch sử.';
      } }, 'Lưu lần luyện tập'))));
}
