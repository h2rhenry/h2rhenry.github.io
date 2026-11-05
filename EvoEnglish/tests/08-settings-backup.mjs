import assert from 'node:assert/strict';
const mem = new Map(); let failWrites = false;
globalThis.localStorage = {
  get length() { return mem.size; }, key: (i) => [...mem.keys()][i] ?? null,
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { if (failWrites) { const e = new Error('q'); e.name = 'QuotaExceededError'; throw e; } mem.set(k, String(v)); },
  removeItem: (k) => mem.delete(k),
};
const store = await import('../js/storage.js'); store.init();
const errors = []; store.onError((e) => errors.push(e.code));
const settings = await import('../js/settings.js'); const state = await import('../js/state.js');

// 1. mergeGroup: giữ bản mới hơn, không mất dữ liệu của bên nào
let m = store.mergeGroup('activity', { days: { a: { seconds: 100, items: 2, sessions: 1 } }, sessions: 1 }, { days: { a: { seconds: 300, items: 1, sessions: 2 }, b: { seconds: 60, items: 5, sessions: 1 } }, sessions: 3 });
assert.deepEqual(m.days.a, { seconds: 300, items: 2, sessions: 2 }); assert.equal(m.days.b.items, 5); assert.equal(m.sessions, 3, 'tổng phiên tính lại từ các ngày');
m = store.mergeGroup('vocabulary', { words: { x: { lastReviewedAt: 100, correctCount: 1 } }, custom: { u: { id: 'u' } } }, { words: { x: { lastReviewedAt: 200, correctCount: 5 }, y: { lastReviewedAt: 1 } }, custom: { v: { id: 'v' } } });
assert.equal(m.words.x.lastReviewedAt, 200, 'từ ôn gần hơn thắng'); assert.ok(m.words.y); assert.ok(m.custom.u && m.custom.v);
m = store.mergeGroup('progress', { level: 'A1', lessons: { g: { status: 'completed', at: 5, best: 90 } }, recent: [{ title: 't', at: 5 }], lastLesson: { title: 'now' } }, { level: 'A0', lessons: { g: { status: 'in-progress', at: 9, best: 40 }, h: { at: 1 } }, recent: [{ title: 't', at: 5 }, { title: 'old', at: 1 }], lastLesson: { title: 'old' }, placement: { at: 3, suggested: 'A1' } });
assert.equal(m.level, 'A1', 'giữ cấp độ hiện tại'); assert.equal(m.lessons.g.at, 9); assert.ok(m.lessons.h); assert.equal(m.recent.length, 2, 'bỏ trùng'); assert.equal(m.lastLesson.title, 'now'); assert.equal(m.placement.suggested, 'A1');
m = store.mergeGroup('writingDrafts', { drafts: [{ id: 'd1', text: 'new', updatedAt: 9 }, { id: 'd2', text: 'only cur', updatedAt: 2 }] }, { drafts: [{ id: 'd1', text: 'old', updatedAt: 5 }, { id: 'd3', text: 'only inc', updatedAt: 3 }] });
assert.deepEqual(m.drafts.map((d) => d.id), ['d1', 'd3', 'd2']); assert.equal(m.drafts[0].text, 'new');
m = store.mergeGroup('quizHistory', { entries: [{ id: 'a', at: 5, pct: 1 }] }, { entries: [{ id: 'a', at: 5, pct: 1 }, { id: 'b', at: 9, pct: 2 }] }); assert.equal(m.entries.length, 2); assert.equal(m.entries[0].id, 'b');
m = store.mergeGroup('review', { wrongQuestions: { q: { at: 9, count: 3 } }, favorites: { a: true }, weakGrammar: {} }, { wrongQuestions: { q: { at: 2, count: 1 }, r: { at: 1 } }, favorites: { b: true }, weakGrammar: { g: { at: 1, pct: 50 } } });
assert.equal(m.wrongQuestions.q.count, 3); assert.ok(m.wrongQuestions.r && m.favorites.a && m.favorites.b && m.weakGrammar.g);
assert.deepEqual(store.mergeGroup('settings', { theme: 'dark' }, { theme: 'light' }), { theme: 'dark' }, 'cài đặt hiện tại luôn được giữ');

// 2. mergeAll / importAll trên kho thật; hoàn tác khi ghi thất bại
state.setSetting('theme', 'dark'); state.recordActivity({ items: 3, seconds: 100 });
store.update('vocabulary', (v) => { v.words.cat = { lastReviewedAt: 10, correctCount: 1 }; });
const backup = { app: 'EvoEnglish', schemaVersion: 1, exportedAt: new Date().toISOString(), data: { settings: { theme: 'light' }, vocabulary: { words: { dog: { lastReviewedAt: 5, correctCount: 2 } }, custom: {} }, writingDrafts: { drafts: [{ id: 'z', text: 'hi', updatedAt: 1 }] } } };
assert.equal(store.mergeAll(backup).ok, true);
assert.ok(store.get('vocabulary').words.cat && store.get('vocabulary').words.dog, 'hợp nhất giữ cả hai'); assert.equal(store.get('settings').theme, 'dark', 'hợp nhất không đổi cài đặt'); assert.equal(store.get('writingDrafts').drafts.length, 1);
failWrites = true; const before = JSON.stringify(store.get('vocabulary')); const r = store.mergeAll({ ...backup, data: { vocabulary: { words: { zzz: { lastReviewedAt: 99 } }, custom: {} } } });
failWrites = false; assert.equal(r.ok, false); assert.equal(JSON.stringify(store.get('vocabulary')), before, 'ghi lỗi: dữ liệu cũ nguyên vẹn'); assert.ok(errors.includes('quota'));
assert.equal(store.importAll(backup).ok, true); assert.equal(store.get('settings').theme, 'light', 'thay thế ghi đè cả cài đặt'); assert.ok(!store.get('vocabulary').words.cat, 'thay thế bỏ dữ liệu cũ của nhóm');

// 3. Giới hạn nhập và kiểm tra cấu trúc
const withWords = (n) => ({ ...backup, data: { vocabulary: { words: Object.fromEntries(Array.from({ length: n }, (_, i) => ['w' + i, {}])), custom: {} } } });
assert.equal(store.validateBackup(withWords(store.LIMITS.words)).ok, true); assert.equal(store.validateBackup(withWords(store.LIMITS.words + 1)).ok, false);
assert.equal(store.validateBackup({ ...backup, data: { writingDrafts: { drafts: [{ id: 'x', text: 'a'.repeat(store.LIMITS.text + 1) }] } } }).ok, false);
assert.equal(store.validateBackup({ ...backup, data: { writingDrafts: { drafts: [{ text: 'no id' }] } } }).ok, false);
assert.equal(store.validateBackup({ ...backup, data: { quizHistory: { entries: ['bad'] } } }).ok, false);
assert.equal(store.validateBackup({ ...backup, data: { evil: {} } }).ok, false); assert.equal(store.validateBackup(null).ok, false); assert.equal(store.validateBackup([]).ok, false);
assert.equal(store.validateBackup({ ...backup, schemaVersion: 2 }).ok, false); assert.equal(store.validateBackup({ ...backup, app: 'Other' }).ok, false);
// tệp có mã độc dạng chuỗi chỉ là dữ liệu, không bao giờ được chạy
const evil = JSON.parse('{"app":"EvoEnglish","schemaVersion":1,"data":{"writingDrafts":{"drafts":[{"id":"e","text":"<img src=x onerror=alert(1)>"}]}}}'); assert.equal(store.validateBackup(evil).ok, true);

// 4. Xuất: chỉ gồm các nhóm dữ liệu, không có khóa nội bộ
const out = store.exportAll(); assert.ok(Object.keys(out.data).every((k) => store.GROUPS.includes(k))); assert.ok(!JSON.stringify(out).includes('corrupt')); assert.equal(store.validateBackup(out).ok, true);

// 5. Dữ liệu hỏng: giữ bản sao, liệt kê, xóa được
mem.set('evoenglish.progress', '{hỏng'); const fresh = await import('../js/storage.js?corrupt'); fresh.init(); assert.equal(fresh.get('progress').level, null, 'dữ liệu hỏng được thay bằng mặc định, không crash');
assert.deepEqual(fresh.listCorrupt(), ['corrupt.progress']); assert.ok(fresh.usageBytes() > 0); fresh.clearCorrupt(); assert.deepEqual(fresh.listCorrupt(), []); assert.equal(mem.has('evoenglish.corrupt.progress'), false);

// 6. Mô tả dữ liệu cho hộp thoại xóa khớp dữ liệu thật
store.resetAll(); store.update('vocabulary', (v) => { v.words.a = {}; v.words.b = {}; });
const d = settings.describeData(); assert.deepEqual(d.map((x) => x.group), store.LEARNING_GROUPS); assert.ok(d.find((x) => x.group === 'vocabulary').detail.startsWith('2 từ'));
assert.ok(!store.LEARNING_GROUPS.includes('settings')); store.resetGroup('vocabulary'); assert.equal(Object.keys(store.get('vocabulary').words).length, 0);
console.log('GIAI ĐOẠN 5 (dữ liệu, sao lưu, cài đặt): PASS');
