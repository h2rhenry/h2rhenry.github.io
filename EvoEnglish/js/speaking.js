import * as store from './storage.js';
import * as state from './state.js';
import { h, hashParams, formatDate } from './utils.js';
import { loadData } from './data.js';
import { speak, speechSupported } from './speech.js';
import { compareSpeech } from './text-tools.js';
import { onLeave } from './cleanup.js';
import { createRecorder } from './recorder.js';

const getSR = () => globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;
const ERRORS = {
  'not-allowed': 'Trình duyệt chưa cho phép dùng micro. Hãy cấp quyền micro cho trang này rồi thử lại.',
  'service-not-allowed': 'Trình duyệt không cho phép dịch vụ nhận diện giọng nói trên trang này.',
  'no-speech': 'Không nghe thấy giọng nói. Hãy nói gần micro hơn rồi thử lại.',
  'audio-capture': 'Không tìm thấy micro.',
  network: 'Nhận diện giọng nói cần kết nối mạng trên trình duyệt này.',
  'language-not-supported': 'Trình duyệt không hỗ trợ nhận diện tiếng Anh.',
};
const RATE = ['1 · Cần cải thiện', '2 · Tạm được', '3 · Tốt', '4 · Rất tốt'];
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export async function render(root) {
  const data = await loadData('speaking');
  if (!data) { root.append(h('div', { class: 'card', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Không tải được dữ liệu luyện nói'), h('p', { class: 'muted' }, 'Hãy kiểm tra kết nối rồi tải lại trang.'))); return; }
  const item = [...data.sentences, ...data.topics].find((x) => x.id === hashParams().get('item'));
  item ? practice(root, item) : listView(root, data);
}

function listView(root, data) {
  const lessons = store.get('progress').lessons;
  const row = (x, label, sub) => h('li', { class: 'word-row' },
    h('div', { class: 'word-main' }, h('a', { href: `#/speaking?item=${x.id}` }, h('b', {}, label)), sub ? h('div', { class: 'muted' }, sub) : null),
    h('div', { class: 'word-side' }, h('span', { class: 'badge' }, x.level), lessons['speaking:' + x.id] ? h('span', { class: 'badge' }, `Đã luyện ${lessons['speaking:' + x.id].attempts} lần`) : null));
  root.append(
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Luyện nói'), h('p', {}, 'Nghe câu mẫu, tự nói, rồi tự đánh giá. EvoEnglish không chấm điểm phát âm và không có hội thoại AI.')),
    h('p', { class: 'notice' }, 'Nhận diện giọng nói do trình duyệt của bạn thực hiện. Tùy trình duyệt (ví dụ Chrome), âm thanh có thể được gửi đến dịch vụ của nhà phát triển trình duyệt. EvoEnglish không nhận hay lưu âm thanh của bạn.'),
    h('section', { class: 'card stack', 'aria-labelledby': 'sp-s' }, h('h2', { id: 'sp-s' }, 'Luyện câu mẫu'), h('ul', { class: 'plain-list' }, data.sentences.map((x) => row(x, x.text, x.vi)))),
    h('section', { class: 'card stack', 'aria-labelledby': 'sp-t' }, h('h2', { id: 'sp-t' }, 'Nói theo chủ đề'), h('ul', { class: 'plain-list' }, data.topics.map((x) => row(x, x.title, `${x.vi} · ${x.seconds} giây`)))));
}

function practice(root, item) {
  const isTopic = item.kind === 'topic';
  const key = 'speaking:' + item.id;
  const saved = store.get('progress').lessons[key];
  state.startSession(key);

  let rec = null, listening = false, heard = '';
  let tId = null, remain = isTopic ? item.seconds : 0;
  const cleanup = () => {
    try { rec && rec.abort(); } catch { /* bỏ qua */ }
    clearInterval(tId);
  };
  onLeave(cleanup);

  const msg = h('p', { class: 'muted', role: 'status' });
  const heardBox = h('div', { class: 'stack', 'aria-live': 'polite' });
  const cmpBox = h('div', { class: 'stack', 'aria-live': 'polite' });
  const recBtnBox = h('div', { class: 'stack' });

  /* ----- Nghe mẫu ----- */
  const listen = !speechSupported()
    ? h('p', { class: 'notice', role: 'alert' }, 'Trình duyệt này không có giọng đọc nên không phát được câu mẫu. Hãy tự đọc to câu hiển thị.')
    : h('div', { class: 'btn-row' }, isTopic ? null : [h('button', { class: 'btn btn-primary', type: 'button', onclick: () => speak(item.text) }, 'Nghe câu mẫu'), h('button', { class: 'btn', type: 'button', onclick: () => speak(item.text, 'en-US', 0.6) }, 'Nghe chậm')]);

  /* ----- Đếm giờ cho chủ đề ----- */
  const clock = h('span', { class: 'timer' }, fmt(remain));
  const clockBtn = h('button', { class: 'btn', type: 'button', onclick: () => {
    if (tId) { clearInterval(tId); tId = null; clockBtn.textContent = 'Tiếp tục đếm giờ'; return; }
    if (remain <= 0) remain = item.seconds;
    clockBtn.textContent = 'Tạm dừng';
    tId = setInterval(() => { remain -= 1; clock.textContent = fmt(Math.max(0, remain)); if (remain <= 0) { clearInterval(tId); tId = null; clockBtn.textContent = 'Đếm lại'; msg.textContent = 'Hết giờ. Hãy tự đánh giá phần nói của bạn.'; } }, 1000);
  } }, 'Bắt đầu đếm giờ');

  /* ----- Nhận diện giọng nói ----- */
  const SR = getSR();
  function paintRec() {
    if (!SR) { recBtnBox.replaceChildren(h('p', { class: 'notice', role: 'alert' }, 'Trình duyệt này không hỗ trợ nhận diện giọng nói (Chrome và Edge thường hỗ trợ). Bạn vẫn có thể ghi âm để tự nghe lại và tự đánh giá.')); return; }
    if (!state.getSettings().speechConsent) {
      recBtnBox.replaceChildren(h('div', { class: 'notice' },
        h('p', {}, h('b', {}, 'Trước khi dùng nhận diện giọng nói')),
        h('p', {}, 'Trình duyệt sẽ xin quyền dùng micro. Tùy trình duyệt (ví dụ Chrome), âm thanh có thể được gửi đến dịch vụ nhận diện của nhà phát triển trình duyệt. EvoEnglish không nhận, không lưu và không gửi âm thanh của bạn đi đâu cả.'),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { state.setSetting('speechConsent', true); paintRec(); } }, 'Tôi hiểu và đồng ý')));
      return;
    }
    recBtnBox.replaceChildren(h('div', { class: 'btn-row' },
      h('button', { class: 'btn btn-primary', type: 'button', onclick: startRec }, listening ? 'Đang nghe…' : 'Bắt đầu nói'),
      h('button', { class: 'btn', type: 'button', onclick: () => { try { rec && rec.stop(); } catch { /* bỏ qua */ } } }, 'Dừng'),
      h('button', { class: 'btn', type: 'button', onclick: () => { state.setSetting('speechConsent', false); paintRec(); } }, 'Thu hồi đồng ý')));
  }
  function startRec() {
    if (listening) return;
    heard = ''; heardBox.replaceChildren(); cmpBox.replaceChildren(); msg.textContent = '';
    try {
      rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = isTopic; rec.maxAlternatives = 1;
      rec.onresult = (e) => { heard = [...e.results].map((r) => r[0].transcript).join(' ').trim(); heardBox.replaceChildren(h('p', {}, h('b', {}, 'Máy nghe được: '), heard || '…')); };
      rec.onerror = (e) => { if (e.error !== 'aborted') msg.textContent = ERRORS[e.error] || `Nhận diện giọng nói gặp lỗi (${e.error}).`; };
      rec.onend = () => { listening = false; paintRec(); if (heard && !isTopic) showCompare(); else if (!heard && !msg.textContent) msg.textContent = 'Chưa nhận diện được nội dung nào.'; };
      rec.start(); listening = true; paintRec(); msg.textContent = 'Hãy nói bây giờ…';
    } catch (e) { listening = false; msg.textContent = 'Không bật được nhận diện giọng nói trên trình duyệt này.'; }
  }
  let lastMatch = null;
  function showCompare() {
    const c = compareSpeech(item.text, heard); lastMatch = c.pct;
    cmpBox.replaceChildren(
      h('p', {}, h('b', {}, `Mức khớp văn bản: ${c.pct}%`), ' ', h('span', { class: 'muted' }, '(so sánh chữ máy nghe được với câu mẫu, không đo độ chuẩn phát âm)')),
      h('p', { class: 'cmp' }, c.marks.map((m) => h('span', { class: 'cmp-w ' + (m.ok ? 'ok' : 'miss') }, (m.ok ? '✓ ' : '✗ ') + m.w, ' '))),
      h('p', { class: 'muted' }, 'Từ có dấu ✗ là từ máy không nhận ra. Có thể do bạn nói chưa rõ, hoặc do máy nhận diện sai, nên hãy nghe lại và tự đánh giá.'));
  }

  /* ----- Ghi âm để tự nghe lại (chỉ lưu tạm trong trang) ----- */
  const recorder = createRecorder({ onMessage: (t) => { msg.textContent = t; } });

  /* ----- Tự đánh giá & lưu ----- */
  const rating = {};
  const group = (k, name) => h('fieldset', { class: 'qset' }, h('legend', {}, name), RATE.map((l, i) => h('label', { class: 'qopt', for: `sp-${k}-${i}` }, h('input', { type: 'radio', name: 'sp-' + k, id: `sp-${k}-${i}`, onchange: () => { rating[k] = i + 1; } }), ' ', l)));
  const history = h('div', { class: 'stack' });
  const paintHistory = () => {
    const log = store.get('progress').lessons[key]?.log || [];
    history.replaceChildren(log.length ? h('ul', { class: 'plain-list' }, log.map((l) => h('li', {}, `${formatDate(l.at)}: phát âm ${l.pron}/4, trôi chảy ${l.flu}/4${typeof l.match === 'number' ? `, khớp văn bản ${l.match}%` : ''}`))) : h('p', { class: 'muted' }, 'Chưa có lần luyện nào được lưu.'));
  };
  const saveBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
    if (!rating.pron || !rating.flu) { msg.textContent = 'Hãy chấm cả phát âm và độ trôi chảy trước khi lưu.'; return; }
    store.update('progress', (p) => {
      const prev = p.lessons[key] || { attempts: 0, log: [] };
      const log = [{ at: Date.now(), pron: rating.pron, flu: rating.flu, ...(lastMatch !== null ? { match: lastMatch } : {}) }, ...(prev.log || [])].slice(0, 5);
      p.lessons[key] = { status: 'completed', attempts: (prev.attempts || 0) + 1, bestMatch: Math.max(prev.bestMatch || 0, lastMatch || 0), log, at: Date.now() };
      p.lastLesson = { title: 'Nói · ' + (item.text || item.title), href: `#/speaking?item=${item.id}` };
    });
    state.recordActivity({ items: 1 });
    state.notify();
    msg.textContent = 'Đã lưu lần luyện tập này.'; paintHistory();
  } }, 'Lưu lần luyện tập');

  root.append(...[
    h('p', {}, h('a', { href: '#/speaking' }, '← Danh sách luyện nói')),
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, isTopic ? item.title : item.text), h('p', {}, h('span', { class: 'badge' }, 'Cấp độ ' + item.level), ' ', h('span', { class: 'muted' }, item.vi))),
    h('section', { class: 'card stack', 'aria-labelledby': 'sm-h' }, h('h2', { id: 'sm-h' }, isTopic ? 'Chủ đề' : 'Câu mẫu'),
      isTopic ? [h('p', {}, 'Hãy trả lời các câu hỏi gợi ý:'), h('ul', { class: 'bullets' }, item.questions.map((q) => h('li', {}, q))), h('p', { class: 'muted' }, 'Mẫu câu hữu ích:'), h('ul', { class: 'bullets' }, item.phrases.map((q) => h('li', {}, h('code', {}, q)))), h('div', { class: 'btn-row' }, clock, clockBtn)] : [h('p', { class: 'muted' }, 'Mẹo: ' + item.tip)],
      listen),
    h('section', { class: 'card stack', 'aria-labelledby': 'ln-h' }, h('h2', { id: 'ln-h' }, 'Luyện nói'),
      recBtnBox, heardBox, cmpBox,
      recorder.node, msg),
    h('section', { class: 'card stack', 'aria-labelledby': 'tc-h' }, h('h2', { id: 'tc-h' }, 'Tự đánh giá'), group('pron', 'Phát âm (so với câu mẫu bạn đã nghe)'), group('flu', 'Độ trôi chảy (nói liền mạch, ít ngập ngừng)'), saveBtn, h('h3', {}, 'Các lần luyện gần đây'), history),
  ].filter(Boolean));
  paintRec(); paintHistory();
}
