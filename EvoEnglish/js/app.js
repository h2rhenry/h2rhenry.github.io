import * as store from './storage.js';
import * as state from './state.js';
import { start, show, currentRoute } from './router.js';
import { ROUTES } from './routes.js';
import { render as renderDashboard } from './dashboard.js';
import { render as renderVocabulary } from './vocabulary.js';
import { render as renderGrammar } from './grammar.js';
import { render as renderPath } from './learning-path.js';
import { render as renderReview } from './review.js';
import { render as renderStatistics } from './statistics.js';
import { render as renderReading } from './reading.js';
import { render as renderListening } from './listening.js';
import { render as renderPlacement } from './placement.js';
import { render as renderWriting } from './writing.js';
import { render as renderSpeaking } from './speaking.js';
import { render as renderIelts } from './exam-ielts.js';
import { render as renderToeic } from './exam-toeic.js';
import { render as renderSettings } from './settings.js';
import { runLeave } from './cleanup.js';
import { stopSpeech } from './speech.js';
import { h, $ } from './utils.js';
import { icon } from './icons.js';

store.init();
state.applySettings();

ROUTES.forEach((r) => { r.render = { dashboard: renderDashboard, vocabulary: renderVocabulary, grammar: renderGrammar, 'learning-path': renderPath, review: renderReview, statistics: renderStatistics, reading: renderReading, listening: renderListening, placement: renderPlacement, writing: renderWriting, speaking: renderSpeaking, ielts: renderIelts, toeic: renderToeic, settings: renderSettings }[r.id]; });

const appEl = $('#app');
const nav = $('#nav');
const bottomNav = $('#bottomNav');
const menuBtn = $('#menuBtn');
const collapseBtn = $('#collapseBtn');
const themeBtn = $('#themeBtn');
const scrim = $('#scrim');
const sidebar = $('#sidebar');

ROUTES.filter((r) => !r.hidden).forEach((r) => nav.append(h('a', { href: `#/${r.id}`, 'data-id': r.id, title: r.label, 'aria-label': r.label }, icon(r.icon), h('span', { class: 'label' }, r.label))));
ROUTES.filter((r) => r.mobile).forEach((r) => bottomNav.append(h('a', { href: `#/${r.id}`, 'data-id': r.id }, icon(r.icon), h('span', {}, r.short || r.label))));
const moreBtn = h('button', { type: 'button', 'aria-label': 'Mở menu đầy đủ', onclick: () => setDrawer(true) }, icon('more'), h('span', {}, 'Thêm'));
bottomNav.append(moreBtn);
menuBtn.append(icon('menu'));
collapseBtn.append(icon('chevron'));

function setDrawer(open) {
  appEl.classList.toggle('drawer-open', open);
  scrim.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  if (open) nav.querySelector('a')?.focus(); else if (document.activeElement && sidebar.contains(document.activeElement)) menuBtn.focus();
}
menuBtn.addEventListener('click', () => setDrawer(!appEl.classList.contains('drawer-open')));
scrim.addEventListener('click', () => setDrawer(false));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

function applyCollapsed() {
  const c = !!state.getSettings().sidebarCollapsed;
  appEl.classList.toggle('collapsed', c);
  collapseBtn.setAttribute('aria-label', c ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên');
  collapseBtn.setAttribute('aria-pressed', String(c));
}
collapseBtn.addEventListener('click', () => state.setSetting('sidebarCollapsed', !state.getSettings().sidebarCollapsed));

function syncThemeBtn() {
  const dark = state.resolvedTheme() === 'dark';
  themeBtn.replaceChildren(icon(dark ? 'sun' : 'moon'));
  themeBtn.setAttribute('aria-label', dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
}
themeBtn.addEventListener('click', () => state.setSetting('theme', state.resolvedTheme() === 'dark' ? 'light' : 'dark'));
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { state.applySettings(); syncThemeBtn(); });

function toast(message) {
  const el = h('div', { class: 'toast' }, message);
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 7000);
}
const ERROR_TEXT = {
  unavailable: 'Trình duyệt không cho lưu dữ liệu (có thể đang ở chế độ riêng tư). Tiến độ sẽ mất khi đóng tab.',
  quota: 'Bộ nhớ trình duyệt đã đầy nên không lưu được. Hãy sao lưu và xóa bớt dữ liệu.',
  write: 'Không lưu được dữ liệu vào trình duyệt.',
  corrupt: 'Một phần dữ liệu bị hỏng nên đã được đặt lại; bản gốc được giữ lại để cứu hộ.',
  'newer-schema': 'Dữ liệu được tạo bởi phiên bản mới hơn của EvoEnglish. Hãy cập nhật trang.',
};
store.onError(({ code }) => { if (ERROR_TEXT[code]) toast(ERROR_TEXT[code]); });

function onRoute(route, focus) {
  nav.querySelectorAll('a').forEach((a) => (a.dataset.id === route.id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  bottomNav.querySelectorAll('a').forEach((a) => (a.dataset.id === route.id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $('#topTitle').textContent = route.label;
  document.title = `${route.label} · EvoEnglish`;
  if (focus) { setDrawer(false); scrollTo(0, 0); }
}

const opts = { routes: ROUTES, outlet: $('#view'), onRoute, onBefore: () => { runLeave(); stopSpeech(); state.endSession(); } };
/* Bấm lại đúng mục đang mở (ví dụ đang làm bài) thì hash không đổi, nên tự vẽ lại trang. */
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('.nav a, .bottom-nav a');
  if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); state.endSession(); show(opts); }
});
state.subscribe(() => { applyCollapsed(); syncThemeBtn(); if (currentRoute()?.live) show({ ...opts, focus: false }); });
applyCollapsed();
syncThemeBtn();
start(opts);

/* Lỗi bất ngờ không được làm sập trang: báo ngắn gọn, dữ liệu học vẫn nguyên. */
let lastErrorToast = 0;
const unexpected = (e) => {
  console.error(e);
  if (Date.now() - lastErrorToast > 10000) { lastErrorToast = Date.now(); toast('Có lỗi không mong muốn. Dữ liệu học của bạn không bị ảnh hưởng. Hãy thử tải lại trang.'); }
};
addEventListener('error', (e) => unexpected(e.error || e.message));
addEventListener('unhandledrejection', (e) => unexpected(e.reason));

/* Chế độ ngoại tuyến (cần HTTPS hoặc localhost; không chạy với file://). */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Không bật được chế độ ngoại tuyến', e)); });
}
