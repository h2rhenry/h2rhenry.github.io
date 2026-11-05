import * as store from './storage.js';
import { dateKey, addDays } from './utils.js';

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const notify = () => listeners.forEach((fn) => fn());

/* ---------- Cài đặt & giao diện ---------- */
export const getSettings = () => store.get('settings');

export function resolvedTheme(s = getSettings()) {
  if (s.theme === 'dark' || s.theme === 'light') return s.theme;
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applySettings() {
  if (typeof document === 'undefined') return;
  const s = getSettings();
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme(s);
  root.dataset.fontSize = ['sm', 'md', 'lg'].includes(s.fontSize) ? s.fontSize : 'md';
  root.dataset.motion = s.animations === false ? 'off' : 'on';
}

export function setSetting(key, value) {
  store.update('settings', (s) => { s[key] = value; });
  applySettings();
  notify();
}

/* ---------- Hoạt động học & phiên học ---------- */
export function recordActivity({ seconds = 0, items = 0, sessions = 0 } = {}) {
  store.update('activity', (a) => {
    const k = dateKey();
    const d = a.days[k] || { seconds: 0, items: 0, sessions: 0 };
    d.seconds += seconds; d.items += items; d.sessions += sessions;
    a.days[k] = d;
    a.sessions += sessions;
  });
}

/* Chỉ tính thời gian khi có phiên học đang chạy và tab đang hiển thị. */
let session = null;
let timer = null;
const IDLE_MS = 3 * 60 * 1000;
let lastInput = Date.now();
if (typeof document !== 'undefined') {
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true, capture: true }));
}

function tick() {
  if (!session || session.paused) return;
  const now = Date.now();
  const delta = Math.min((now - session.last) / 1000, 60);
  session.last = now;
  if (now - lastInput > IDLE_MS) return; /* không thao tác quá lâu: không tính thời gian học */
  if (delta >= 1) recordActivity({ seconds: Math.round(delta) });
}

export function startSession(label = '') {
  if (session) endSession();
  lastInput = Date.now();
  session = { label, last: Date.now(), paused: typeof document !== 'undefined' && document.hidden };
  timer = setInterval(tick, 10000);
}

export function endSession() {
  if (!session) return;
  tick();
  recordActivity({ sessions: 1 });
  clearInterval(timer);
  session = null; timer = null;
  notify();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!session) return;
    if (document.hidden) { tick(); session.paused = true; } else { session.paused = false; session.last = Date.now(); }
  });
  addEventListener('pagehide', tick);
}

/* ---------- Thống kê tính từ dữ liệu thật ---------- */
const isActiveDay = (d) => !!d && (d.items > 0 || d.seconds >= 30);

export function computeStats(now = Date.now(), today = dateKey()) {
  const { days, sessions } = store.get('activity');
  const activeKeys = Object.keys(days).filter((k) => isActiveDay(days[k])).sort();

  let streak = 0;
  const yesterday = addDays(today, -1);
  let cursor = isActiveDay(days[today]) ? today : (isActiveDay(days[yesterday]) ? yesterday : null);
  while (cursor && isActiveDay(days[cursor])) { streak += 1; cursor = addDays(cursor, -1); }

  let longest = 0; let run = 0; let prev = null;
  for (const k of activeKeys) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    longest = Math.max(longest, run); prev = k;
  }

  const words = Object.values(store.get('vocabulary').words);
  const learned = words.filter((w) => (w.repetitions || 0) > 0 || (w.correctCount || 0) > 0);
  const totalSeconds = Object.values(days).reduce((sum, d) => sum + (d.seconds || 0), 0);

  return {
    activeDays: activeKeys.length, streak, longest, sessions, totalSeconds,
    wordsLearned: learned.length,
    wordsMastered: learned.filter((w) => (w.intervalDays || 0) >= 21).length,
    dueCount: words.filter((w) => typeof w.nextReviewAt === 'number' && w.nextReviewAt <= now).length,
    today: days[today] || { seconds: 0, items: 0, sessions: 0 },
  };
}

export function lastDays(n, today = dateKey()) {
  const { days } = store.get('activity');
  return Array.from({ length: n }, (_, i) => {
    const key = addDays(today, i - (n - 1));
    return { key, seconds: days[key]?.seconds || 0, items: days[key]?.items || 0 };
  });
}
