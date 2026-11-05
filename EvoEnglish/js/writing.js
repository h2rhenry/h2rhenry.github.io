import * as store from './storage.js';
import * as state from './state.js';
import { h, hashParams, formatDate } from './utils.js';
import { loadData } from './data.js';
import { analyzeText, countWords } from './text-tools.js';
import { onLeave } from './cleanup.js';

export const MAX_DRAFTS = 100;
export const MAX_CHARS = 6000;
const RUBRIC = [
  ['content', 'Nội dung', 'Bài có đúng đề và đủ các ý trong checklist không?'],
  ['grammar', 'Ngữ pháp', 'Câu có đúng thì, đúng chủ ngữ – động từ, đúng mạo từ không?'],
  ['vocab', 'Từ vựng', 'Từ dùng có đúng nghĩa, đa dạng, không lặp quá nhiều không?'],
  ['coherence', 'Mạch lạc, chính tả, dấu câu', 'Các ý có nối với nhau, viết hoa và dấu câu có đúng không?'],
];
const LEVELS = ['1 · Cần cải thiện', '2 · Tạm được', '3 · Tốt', '4 · Rất tốt'];

/* ---------- Dữ liệu bản nháp ---------- */
export const newId = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const getDrafts = () => store.get('writingDrafts').drafts;
export function upsertDraft(d) {
  return store.update('writingDrafts', (w) => {
    const i = w.drafts.findIndex((x) => x.id === d.id);
    const now = Date.now();
    if (i >= 0) w.drafts[i] = { ...w.drafts[i], ...d, updatedAt: now };
    else {
      if (w.drafts.length >= MAX_DRAFTS) throw new Error('Đã đạt giới hạn bản nháp');
      w.drafts.unshift({ createdAt: now, ...d, updatedAt: now });
    }
  });
}
export const deleteDraft = (id) => store.update('writingDrafts', (w) => { w.drafts = w.drafts.filter((x) => x.id !== id); });
export const rubricTotal = (rating, criteria = RUBRIC) => (criteria.every(([k]) => rating[k] >= 1 && rating[k] <= 4) ? criteria.reduce((s, [k]) => s + rating[k], 0) : null);

let currentFlush = null;
if (typeof addEventListener === 'function') addEventListener('pagehide', () => currentFlush && currentFlush(true));

export async function render(root) {
  const data = await loadData('writing');
  if (!data) { root.append(h('div', { class: 'card', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Không tải được dữ liệu luyện viết'), h('p', { class: 'muted' }, 'Hãy kiểm tra kết nối rồi tải lại trang. Bản nháp của bạn không bị ảnh hưởng.'))); return; }
  const q = hashParams();
  const existing = q.get('draft') && getDrafts().find((d) => d.id === q.get('draft'));
  if (existing && String(existing.taskId).startsWith('ielts:')) { location.replace('#/ielts?draft=' + existing.id); return; }
  const task = existing ? data.tasks.find((t) => t.id === existing.taskId) : data.tasks.find((t) => t.id === q.get('task'));
  if (existing || task) editor(root, data, existing || null, task || data.tasks.find((t) => t.id === 'free'));
  else listView(root, data);
}

function listView(root, data) {
  const drafts = getDrafts();
  const done = store.get('progress').lessons;
  const levels = [...new Set(data.tasks.map((t) => t.level))];
  const draftList = h('ul', { class: 'plain-list' });
  const paintDrafts = () => {
    const ds = getDrafts();
    draftList.replaceChildren(...(ds.length ? ds.map((d) => h('li', { class: 'word-row' },
      h('div', { class: 'word-main' }, h('a', { href: `#/writing?draft=${d.id}` }, h('b', {}, d.title || 'Không có tiêu đề')), h('div', { class: 'muted' }, `${countWords(d.text || '')} từ · cập nhật ${formatDate(d.updatedAt)}`)),
      h('div', { class: 'word-side' }, h('span', { class: 'badge' }, d.status === 'done' ? 'Đã hoàn thành' : 'Bản nháp'),
        h('button', { class: 'btn', type: 'button', 'aria-label': `Xóa bản nháp: ${d.title}`, onclick: () => {
          if (confirm(`Xóa bản nháp "${d.title}"? Việc này không thể hoàn tác.`)) { deleteDraft(d.id); paintDrafts(); }
        } }, 'Xóa')))) : [h('li', { class: 'empty' }, h('strong', {}, 'Chưa có bài viết nào'), 'Chọn một đề bên trên để bắt đầu. Bản nháp được lưu tự động trên trình duyệt này.')]));
  };
  root.append(
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Luyện viết'), h('p', {}, 'Viết theo đề hoặc viết tự do. Không có AI chấm bài: bạn tự đánh giá bằng tiêu chí rõ ràng, đối chiếu bài mẫu và dùng gợi ý kiểm tra theo quy tắc đơn giản.')),
    ...levels.map((lv) => h('section', { class: 'card stack', 'aria-labelledby': 'wr-' + lv.replace(/\s/g, '') },
      h('h2', { id: 'wr-' + lv.replace(/\s/g, '') }, lv === 'Tự do' ? 'Viết tự do' : `Cấp độ ${lv}`),
      h('ul', { class: 'plain-list' }, data.tasks.filter((t) => t.level === lv).map((t) => h('li', { class: 'word-row' },
        h('div', { class: 'word-main' }, h('a', { href: `#/writing?task=${t.id}` }, h('b', {}, t.title)), h('div', { class: 'muted' }, t.maxWords ? `${t.kind} · ${t.minWords}–${t.maxWords} từ` : t.kind)),
        h('div', { class: 'word-side' }, done['writing:' + t.id]?.status === 'completed' ? h('span', { class: 'badge' }, 'Đã hoàn thành') : null)))))),
    h('section', { class: 'card stack', 'aria-labelledby': 'wd-h' }, h('h2', { id: 'wd-h' }, `Bài đã viết (${drafts.length}/${MAX_DRAFTS})`), draftList));
  paintDrafts();
}

function editor(root, data, existing, task) {
  mountEditor(root, { task, existing, commonChecklist: data.commonChecklist });
}

/** Trình soạn thảo bài viết, dùng cho Luyện viết và IELTS Writing. */
export function mountEditor(root, { task, existing = null, commonChecklist = [], backHref = '#/writing', backLabel = '← Danh sách đề viết', draftHref = (id) => `#/writing?draft=${id}`, limitSeconds = 0, rubric: criteria = RUBRIC, badge = null, extraTop = null, onComplete = null }) {
  let draft = existing ? { ...existing } : { id: newId(), taskId: task.id, title: task.title, text: '', seconds: 0, rating: {}, checks: [], status: 'draft' };
  let persisted = !!existing;
  let timerId = null; let saveTimer = null;
  const checklist = [...task.checklist, ...commonChecklist];
  const href = () => draftHref(draft.id);
  state.startSession('writing:' + task.id);

  const status = h('p', { class: 'muted', role: 'status' });
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  function saveNow(note, leaving = false) {
    if (!draft.text.trim() && !persisted) return true;
    if (!persisted && getDrafts().length >= MAX_DRAFTS) { status.textContent = `Đã đủ ${MAX_DRAFTS} bản nháp. Hãy xóa bớt bài cũ trong danh sách trước khi lưu bài mới.`; return false; }
    const ok = upsertDraft(draft);
    if (ok) {
      if (!persisted) { persisted = true; if (!leaving) history.replaceState(null, '', href()); } /* đang rời trang: không được ghi đè URL của trang mới */
      store.update('progress', (p) => { p.lastLesson = { title: `Viết · ${draft.title}`, href: href() }; });
      status.textContent = note || `Đã lưu lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`;
    } else status.textContent = 'Không lưu được bản nháp. Hãy sao chép nội dung ra nơi khác để tránh mất bài.';
    return ok;
  }
  const flush = (leaving = false) => { clearTimeout(saveTimer); saveTimer = null; saveNow(undefined, leaving); };
  const schedule = () => { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 700); };
  currentFlush = flush;
  onLeave(() => { clearInterval(timerId); flush(true); currentFlush = null; });

  /* ----- Ô viết, đếm từ, giờ ----- */
  const area = h('textarea', { id: 'wr-text', class: 'answer-input writing-area', rows: '10', maxlength: String(MAX_CHARS), lang: 'en', spellcheck: 'true', autocapitalize: 'sentences' });
  area.value = draft.text;
  const counter = h('p', { class: 'muted', role: 'status' });
  const showTime = () => (limitSeconds ? `${fmt(draft.seconds)} / ${fmt(limitSeconds)}${draft.seconds > limitSeconds ? ' (quá giờ)' : ''}` : fmt(draft.seconds));
  const timer = h('span', { class: 'timer', 'aria-live': 'off' }, showTime());
  const timerBtn = h('button', { class: 'btn', type: 'button', onclick: () => {
    if (timerId) { clearInterval(timerId); timerId = null; timerBtn.textContent = 'Tiếp tục tính giờ'; flush(); return; }
    timerBtn.textContent = 'Tạm dừng';
    timerId = setInterval(() => { if (!document.hidden) { draft.seconds += 1; timer.textContent = showTime(); } }, 1000);
  } }, draft.seconds ? 'Tiếp tục tính giờ' : 'Bắt đầu tính giờ');
  const resetBtn = h('button', { class: 'btn', type: 'button', onclick: () => { clearInterval(timerId); timerId = null; draft.seconds = 0; timer.textContent = showTime(); timerBtn.textContent = 'Bắt đầu tính giờ'; schedule(); } }, 'Đặt lại giờ');
  function paintCounter() {
    const w = countWords(draft.text);
    let hint = '';
    if (task.minWords) hint = w < task.minWords ? ` · cần thêm ít nhất ${task.minWords - w} từ` : (task.maxWords && w > task.maxWords) ? ` · vượt ${w - task.maxWords} từ so với gợi ý` : ' · đạt độ dài gợi ý';
    const range = task.maxWords ? ` (gợi ý ${task.minWords}–${task.maxWords} từ)` : task.minWords ? ` (tối thiểu ${task.minWords} từ)` : '';
    counter.textContent = `${w} từ${range}${hint} · ${draft.text.length}/${MAX_CHARS} ký tự`;
  }
  area.addEventListener('input', () => { draft.text = area.value; paintCounter(); schedule(); });
  paintCounter();

  /* ----- Gợi ý theo quy tắc ----- */
  const suggestBox = h('div', { class: 'stack', 'aria-live': 'polite' });
  const checkBtn = h('button', { class: 'btn', type: 'button', onclick: () => {
    if (!draft.text.trim()) { suggestBox.replaceChildren(h('p', { class: 'muted' }, 'Hãy viết một vài câu trước khi kiểm tra.')); return; }
    const r = analyzeText(draft.text);
    suggestBox.replaceChildren(
      h('p', {}, `${r.words} từ · ${r.sentences} câu`),
      r.issues.length ? h('ul', { class: 'plain-list' }, r.issues.slice(0, 15).map((i) => h('li', {}, i.msg, ' ', h('code', {}, i.snippet)))) : h('p', {}, 'Không phát hiện lỗi thuộc các quy tắc đơn giản này. Điều đó không có nghĩa bài viết hoàn toàn đúng.'),
      r.issues.length > 15 ? h('p', { class: 'muted' }, `và ${r.issues.length - 15} gợi ý khác`) : null,
      h('p', { class: 'notice' }, 'Đây là kiểm tra theo quy tắc đơn giản, không phải AI. Công cụ có thể bỏ sót lỗi hoặc báo nhầm, nên hãy tự đọc lại.'));
  } }, 'Kiểm tra gợi ý');

  /* ----- Bài mẫu ----- */
  const sampleBox = task.sample ? h('div', { class: 'stack', id: 'sample', hidden: true }, h('p', { class: 'sample-text' }, task.sample), h('ul', { class: 'bullets' }, task.sampleNotes.map((n) => h('li', {}, n))), h('p', { class: 'notice' }, 'Bài mẫu chỉ để tham khảo cách triển khai ý. Hãy viết bằng lời của bạn, đừng chép lại.')) : null;
  const sampleBtn = sampleBox ? h('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'sample', onclick: () => {
    const open = sampleBox.hidden; sampleBox.hidden = !open; sampleBtn.setAttribute('aria-expanded', String(open)); sampleBtn.textContent = open ? 'Ẩn bài mẫu' : 'Xem bài mẫu';
  } }, 'Xem bài mẫu') : null;

  /* ----- Tự đánh giá ----- */
  const total = h('p', { class: 'muted', role: 'status' });
  const paintTotal = () => { const t = rubricTotal(draft.rating, criteria); total.textContent = t === null ? 'Hãy chấm đủ 4 tiêu chí để xem tổng điểm tự đánh giá.' : `Tự đánh giá: ${t}/16 (${Math.round((t / 16) * 100)}%). Đây là điểm bạn tự chấm, không phải điểm do hệ thống chấm.`; };
  const rubricNodes = criteria.map(([key, name, hint]) => h('fieldset', { class: 'qset' }, h('legend', {}, name), h('p', { class: 'muted', style: 'margin:0' }, hint),
    LEVELS.map((label, i) => h('label', { class: 'qopt', for: `rb-${key}-${i}` }, h('input', { type: 'radio', name: 'rb-' + key, id: `rb-${key}-${i}`, checked: draft.rating[key] === i + 1, onchange: () => { draft.rating = { ...draft.rating, [key]: i + 1 }; paintTotal(); schedule(); } }), ' ', label))));
  const checks = checklist.map((text, i) => h('li', {}, h('label', { class: 'qopt', for: `ck-${i}` }, h('input', { type: 'checkbox', id: `ck-${i}`, checked: draft.checks.includes(i), onchange: (e) => { draft.checks = e.target.checked ? [...draft.checks, i] : draft.checks.filter((x) => x !== i); schedule(); } }), ' ', text)));
  paintTotal();

  const completeBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
    const w = countWords(draft.text);
    if (w < Math.max(1, task.minWords)) { status.textContent = `Bài còn ngắn: cần ít nhất ${Math.max(1, task.minWords)} từ để đánh dấu hoàn thành (hiện có ${w}).`; return; }
    draft.status = 'done';
    if (!saveNow('Đã đánh dấu hoàn thành và lưu bài viết.')) return;
    store.update('progress', (p) => { const prev = p.lessons['writing:' + task.id] || { attempts: 0 }; p.lessons['writing:' + task.id] = { status: 'completed', words: w, attempts: (prev.attempts || 0) + 1, at: Date.now() }; });
    state.recordActivity({ items: 1 });
    if (onComplete) onComplete({ draft, words: w });
    state.notify();
  } }, 'Đánh dấu hoàn thành');

  root.append(...[
    h('p', {}, h('a', { href: backHref }, backLabel)),
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, draft.title), h('p', {}, task.prompt), h('p', { style: 'margin-top:8px' }, h('span', { class: 'badge' }, badge || (task.level === 'Tự do' ? 'Tự do' : 'Cấp độ ' + task.level)))),
    extraTop,
    task.structure.length ? h('section', { class: 'card stack', 'aria-labelledby': 'st-h' }, h('h2', { id: 'st-h' }, 'Gợi ý cấu trúc'), h('ol', { class: 'bullets' }, task.structure.map((s) => h('li', {}, s))), h('p', { class: 'muted' }, 'Mẫu câu hữu ích:'), h('ul', { class: 'bullets' }, task.phrases.map((s) => h('li', {}, h('code', {}, s))))) : null,
    h('section', { class: 'card stack', 'aria-labelledby': 'wr-h' }, h('h2', { id: 'wr-h' }, 'Bài viết của bạn'),
      h('label', { for: 'wr-text', class: 'muted' }, 'Viết bằng tiếng Anh'), area, counter,
      h('div', { class: 'btn-row' }, timer, timerBtn, resetBtn),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', onclick: () => { clearTimeout(saveTimer); saveNow(); } }, 'Lưu bản nháp'), completeBtn, checkBtn, sampleBtn), status, suggestBox, sampleBox),
    h('section', { class: 'card stack', 'aria-labelledby': 'rb-h' }, h('h2', { id: 'rb-h' }, 'Tự đánh giá'), ...rubricNodes, total),
    h('section', { class: 'card stack', 'aria-labelledby': 'ck-h' }, h('h2', { id: 'ck-h' }, 'Checklist trước khi nộp'), h('ul', { class: 'plain-list' }, checks)),
  ].filter(Boolean));
}
