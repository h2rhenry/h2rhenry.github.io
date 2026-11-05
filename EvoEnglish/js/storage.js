/*
 * Lớp lưu trữ EvoEnglish.
 * - Mỗi nhóm dữ liệu là một khóa: evoenglish.<nhóm>; khóa evoenglish.meta giữ phiên bản schema.
 * - Không bao giờ ghi đè dữ liệu có sẵn bằng mặc định khi khởi động.
 * - Dữ liệu hỏng được sao lưu sang evoenglish.corrupt.<nhóm> trước khi bị thay thế.
 * - Nếu localStorage không dùng được, ứng dụng vẫn chạy bằng bộ nhớ tạm của phiên.
 */
const NS = 'evoenglish.';
export const SCHEMA_VERSION = 1;
export const GROUPS = ['settings', 'progress', 'vocabulary', 'review', 'quizHistory', 'writingDrafts', 'activity'];

const makeDefaults = (group) => ({
  settings: { theme: 'system', fontSize: 'md', animations: true, autoPronounce: false, dailyGoalMinutes: 15, sidebarCollapsed: false, speechConsent: false },
  progress: { level: null, lessons: {}, recent: [], lastLesson: null },
  vocabulary: { words: {}, custom: {} },
  review: { wrongQuestions: {}, favorites: {}, weakGrammar: {} },
  quizHistory: { entries: [] },
  writingDrafts: { drafts: [] },
  activity: { days: {}, sessions: 0 },
}[group]);

/* MIGRATIONS[n] nâng dữ liệu từ schema n lên n+1. Hiện chưa cần bước nào. */
const MIGRATIONS = {};

const cache = new Map();
const memory = new Map();
const handlers = new Set();
let ls = null;

export const onError = (fn) => { handlers.add(fn); };
const fail = (code, detail) => handlers.forEach((fn) => { try { fn({ code, detail }); } catch { /* bỏ qua */ } });
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const isPersistent = () => ls !== null;

function rawGet(key) {
  if (ls) {
    try { return ls.getItem(NS + key); } catch (e) { fail('read', e); }
  }
  return memory.has(key) ? memory.get(key) : null;
}

function rawSet(key, text) {
  memory.set(key, text);
  if (!ls) return false;
  try { ls.setItem(NS + key, text); return true; } catch (e) {
    fail(e && e.name === 'QuotaExceededError' ? 'quota' : 'write', e);
    return false;
  }
}

function read(group) {
  if (cache.has(group)) return cache.get(group);
  let value = makeDefaults(group);
  const raw = rawGet(group);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      if (!isObj(parsed)) throw new Error('Dữ liệu không phải đối tượng');
      value = { ...value, ...parsed };
    } catch (e) {
      rawSet('corrupt.' + group, raw); // giữ bản gốc để có thể cứu dữ liệu
      fail('corrupt', group);
    }
  }
  cache.set(group, value);
  return value;
}

function write(group, value) {
  cache.set(group, value);
  return rawSet(group, JSON.stringify(value));
}

export const get = (group) => structuredClone(read(group));

/** Cập nhật an toàn: sửa bản sao, chỉ ghi khi hàm không ném lỗi. */
export function update(group, fn) {
  const draft = structuredClone(read(group));
  try {
    const result = fn(draft);
    const next = result === undefined ? draft : result;
    if (!isObj(next)) throw new Error('Kết quả cập nhật không hợp lệ');
    write(group, next);
    return true;
  } catch (e) {
    fail('update', e);
    return false;
  }
}

export function init() {
  try {
    const probe = NS + '__probe';
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    ls = globalThis.localStorage;
  } catch (e) {
    ls = null;
    fail('unavailable', e);
  }
  let meta = null;
  try { meta = JSON.parse(rawGet('meta')); } catch { meta = null; }
  if (!isObj(meta) || !Number.isInteger(meta.schemaVersion)) {
    rawSet('meta', JSON.stringify({ schemaVersion: SCHEMA_VERSION, createdAt: Date.now() }));
    return;
  }
  if (meta.schemaVersion > SCHEMA_VERSION) { fail('newer-schema', meta.schemaVersion); return; }
  let v = meta.schemaVersion;
  while (v < SCHEMA_VERSION) {
    if (MIGRATIONS[v]) MIGRATIONS[v](get, (g, val) => write(g, val));
    v += 1;
  }
  if (meta.schemaVersion !== SCHEMA_VERSION) rawSet('meta', JSON.stringify({ ...meta, schemaVersion: SCHEMA_VERSION }));
}

export function resetGroup(group) { write(group, makeDefaults(group)); }
export function resetAll() { GROUPS.forEach(resetGroup); }

export function exportAll() {
  const data = {};
  GROUPS.forEach((g) => { data[g] = get(g); });
  return { app: 'EvoEnglish', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data };
}

export const LIMITS = { words: 5000, custom: 2000, lessons: 3000, days: 20000, wrong: 5000, drafts: 200, entries: 1000, text: 20000 };

const SHAPES = {
  settings: (d) => ['light', 'dark', 'system'].includes(d.theme ?? 'system') && typeof (d.dailyGoalMinutes ?? 15) === 'number',
  progress: (d) => isObj(d.lessons ?? {}) && Array.isArray(d.recent ?? []),
  vocabulary: (d) => isObj(d.words ?? {}) && isObj(d.custom ?? {}),
  review: (d) => isObj(d.wrongQuestions ?? {}) && isObj(d.favorites ?? {}) && isObj(d.weakGrammar ?? {}),
  quizHistory: (d) => Array.isArray(d.entries ?? []),
  writingDrafts: (d) => Array.isArray(d.drafts ?? []),
  activity: (d) => isObj(d.days ?? {}),
};

/** Kiểm tra bản sao lưu mà không ghi gì. Trả về { ok, error, summary }. */
export function validateBackup(obj) {
  if (!isObj(obj) || obj.app !== 'EvoEnglish') return { ok: false, error: 'Đây không phải tệp sao lưu của EvoEnglish.' };
  if (!Number.isInteger(obj.schemaVersion) || obj.schemaVersion < 1 || obj.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: 'Phiên bản dữ liệu của tệp không được hỗ trợ.' };
  }
  if (!isObj(obj.data)) return { ok: false, error: 'Tệp thiếu phần dữ liệu.' };
  for (const [g, d] of Object.entries(obj.data)) {
    if (!GROUPS.includes(g)) return { ok: false, error: `Nhóm dữ liệu lạ: ${g}` };
    if (!isObj(d) || !SHAPES[g](d)) return { ok: false, error: `Dữ liệu nhóm "${g}" sai cấu trúc.` };
  }
  const d = obj.data;
  const big = (o, n) => o && Object.keys(o).length > n;
  if (big(d.vocabulary?.words, LIMITS.words) || big(d.vocabulary?.custom, LIMITS.custom) || big(d.progress?.lessons, LIMITS.lessons) || big(d.activity?.days, LIMITS.days)
    || big(d.review?.wrongQuestions, LIMITS.wrong) || (d.quizHistory?.entries || []).length > LIMITS.entries || (d.writingDrafts?.drafts || []).length > LIMITS.drafts) {
    return { ok: false, error: 'Tệp sao lưu có quá nhiều dữ liệu so với giới hạn hợp lý.' };
  }
  if ((d.writingDrafts?.drafts || []).some((x) => !isObj(x) || typeof x.id !== 'string' || String(x.text || '').length > LIMITS.text) || (d.quizHistory?.entries || []).some((x) => !isObj(x))) {
    return { ok: false, error: 'Có bản nháp hoặc kết quả sai cấu trúc hoặc quá dài.' };
  }
  return { ok: true, summary: {
    exportedAt: obj.exportedAt || null,
    words: Object.keys(d.vocabulary?.words || {}).length,
    activeDays: Object.keys(d.activity?.days || {}).length,
    drafts: (d.writingDrafts?.drafts || []).length,
  } };
}

/** Nhập bản sao lưu (thay thế các nhóm có trong tệp). Hoàn tác nếu ghi thất bại. */
export function importAll(obj) {
  const check = validateBackup(obj);
  if (!check.ok) return check;
  const snapshot = GROUPS.map((g) => [g, structuredClone(read(g))]);
  const rollback = () => snapshot.forEach(([g, v]) => write(g, v));
  try {
    for (const [g, d] of Object.entries(obj.data)) {
      if (!write(g, { ...makeDefaults(g), ...structuredClone(d) })) throw new Error('Không ghi được dữ liệu');
    }
  } catch (e) {
    rollback();
    return { ok: false, error: 'Nhập thất bại, dữ liệu cũ được giữ nguyên.' };
  }
  return check;
}

/* ---------- Hợp nhất bản sao lưu với dữ liệu hiện tại ---------- */
const ts = (o, k) => (o && typeof o[k] === 'number' ? o[k] : 0);
const pickNewer = (a, b, k) => (ts(b, k) > ts(a, k) ? b : a);
function unionBy(cur, inc, key) {
  const out = { ...inc };
  for (const [id, v] of Object.entries(cur)) out[id] = id in inc ? pickNewer(v, inc[id], key) : v;
  return out;
}

/** Hợp nhất một nhóm: giữ bản mới hơn khi trùng, không làm mất dữ liệu của bên nào. */
export function mergeGroup(group, cur, inc) {
  switch (group) {
    case 'progress': {
      const seen = new Set();
      const recent = [...(cur.recent || []), ...(inc.recent || [])].filter((r) => { const k = `${r.title}|${r.at}`; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => ts(b, 'at') - ts(a, 'at')).slice(0, 20);
      return { ...inc, ...cur, level: cur.level ?? inc.level ?? null, lessons: unionBy(cur.lessons || {}, inc.lessons || {}, 'at'), recent,
        lastLesson: cur.lastLesson ?? inc.lastLesson ?? null, ...((cur.placement || inc.placement) ? { placement: pickNewer(cur.placement, inc.placement, 'at') || cur.placement || inc.placement } : {}) };
    }
    case 'vocabulary': {
      const words = { ...(inc.words || {}) };
      for (const [id, v] of Object.entries(cur.words || {})) {
        const o = words[id];
        words[id] = !o ? v : ts(v, 'lastReviewedAt') !== ts(o, 'lastReviewedAt') ? pickNewer(v, o, 'lastReviewedAt') : ((v.correctCount || 0) + (v.wrongCount || 0) >= (o.correctCount || 0) + (o.wrongCount || 0) ? v : o);
      }
      return { ...inc, ...cur, words, custom: { ...(inc.custom || {}), ...(cur.custom || {}) } };
    }
    case 'review':
      return { ...inc, ...cur, wrongQuestions: unionBy(cur.wrongQuestions || {}, inc.wrongQuestions || {}, 'at'), favorites: { ...(inc.favorites || {}), ...(cur.favorites || {}) }, weakGrammar: unionBy(cur.weakGrammar || {}, inc.weakGrammar || {}, 'at') };
    case 'quizHistory': {
      const seen = new Set();
      const entries = [...(cur.entries || []), ...(inc.entries || [])].filter((e) => { const k = `${e.id}|${e.at}`; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => ts(b, 'at') - ts(a, 'at')).slice(0, 200);
      return { ...cur, entries };
    }
    case 'writingDrafts': {
      const byId = {};
      for (const d of [...(inc.drafts || []), ...(cur.drafts || [])]) byId[d.id] = byId[d.id] ? pickNewer(byId[d.id], d, 'updatedAt') : d;
      return { ...cur, drafts: Object.values(byId).sort((a, b) => ts(b, 'updatedAt') - ts(a, 'updatedAt')).slice(0, 100) };
    }
    case 'activity': {
      const days = { ...(inc.days || {}) };
      for (const [k, v] of Object.entries(cur.days || {})) {
        const o = days[k] || {};
        days[k] = { seconds: Math.max(v.seconds || 0, o.seconds || 0), items: Math.max(v.items || 0, o.items || 0), sessions: Math.max(v.sessions || 0, o.sessions || 0) };
      }
      return { ...cur, days, sessions: Object.values(days).reduce((n, d) => n + (d.sessions || 0), 0) };
    }
    default: return cur; /* settings: luôn giữ cài đặt hiện tại */
  }
}

/** Nhập theo kiểu hợp nhất. Hoàn tác nếu ghi thất bại. */
export function mergeAll(obj) {
  const check = validateBackup(obj);
  if (!check.ok) return check;
  const snapshot = GROUPS.map((g) => [g, structuredClone(read(g))]);
  try {
    for (const [g, d] of Object.entries(obj.data)) {
      if (g === 'settings') continue;
      if (!write(g, mergeGroup(g, structuredClone(read(g)), { ...makeDefaults(g), ...structuredClone(d) }))) throw new Error('Không ghi được dữ liệu');
    }
  } catch (e) {
    snapshot.forEach(([g, v]) => write(g, v));
    return { ok: false, error: 'Hợp nhất thất bại, dữ liệu cũ được giữ nguyên.' };
  }
  return check;
}

/* ---------- Bản sao dữ liệu hỏng & dung lượng ---------- */
function allKeys() {
  const keys = new Set([...memory.keys()].map((k) => NS + k));
  if (ls) { try { for (let i = 0; i < ls.length; i++) keys.add(ls.key(i)); } catch { /* bỏ qua */ } }
  return [...keys].filter((k) => k && k.startsWith(NS));
}
export const listCorrupt = () => allKeys().filter((k) => k.startsWith(NS + 'corrupt.')).map((k) => k.slice(NS.length));
export function clearCorrupt() {
  for (const k of listCorrupt()) { memory.delete(k); if (ls) { try { ls.removeItem(NS + k); } catch { /* bỏ qua */ } } }
}
export function usageBytes() {
  return allKeys().reduce((n, full) => {
    const k = full.slice(NS.length);
    const v = memory.has(k) ? memory.get(k) : (ls ? (() => { try { return ls.getItem(full); } catch { return ''; } })() : '');
    return n + (full.length + (v ? v.length : 0)) * 2;
  }, 0);
}
export const LEARNING_GROUPS = GROUPS.filter((g) => g !== 'settings');
