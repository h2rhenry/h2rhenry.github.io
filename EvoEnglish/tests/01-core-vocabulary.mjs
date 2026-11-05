import assert from 'node:assert/strict';
const mem = new Map(); let failWrites = false;
globalThis.localStorage = { getItem:k=>mem.has(k)?mem.get(k):null, setItem:(k,v)=>{ if(failWrites){const e=new Error('q');e.name='QuotaExceededError';throw e;} mem.set(k,String(v)); }, removeItem:k=>mem.delete(k) };
const store = await import('../js/storage.js');
const state = await import('../js/state.js');
const errs=[]; store.onError(e=>errs.push(e.code));
store.init();
// 1 người dùng mới
let s = state.computeStats(); assert.equal(s.streak,0); assert.equal(s.activeDays,0); assert.equal(s.dueCount,0);
// 2 mở trang không tăng chuỗi
state.recordActivity({sessions:1}); assert.equal(state.computeStats().streak,0);
// 3 hoạt động hôm nay -> chuỗi 1, lưu vào localStorage
state.recordActivity({items:3,seconds:120}); s=state.computeStats(); assert.equal(s.streak,1); assert.ok(mem.get('evoenglish.activity').includes('"items":3'));
// 4 chuỗi liên tiếp + ngày bỏ lỡ
store.update('activity',a=>{ a.days['2020-03-15']={seconds:60,items:1,sessions:1}; a.days['2020-03-14']={seconds:60,items:1,sessions:1}; a.days['2020-03-10']={seconds:60,items:1,sessions:1}; });
s=state.computeStats(Date.now(),'2020-03-15'); assert.equal(s.streak,2); assert.equal(s.longest,2);
s=state.computeStats(Date.now(),'2020-03-16'); assert.equal(s.streak,2,'hôm qua còn hoạt động thì chuỗi chưa đứt');
s=state.computeStats(Date.now(),'2020-03-18'); assert.equal(s.streak,0,'bỏ 2 ngày thì chuỗi về 0');
// 5 từ đến hạn
const now=Date.now(); store.update('vocabulary',v=>{ v.words.a={repetitions:1,nextReviewAt:now-1,intervalDays:1}; v.words.b={repetitions:2,nextReviewAt:now+86400000,intervalDays:30}; v.words.c={repetitions:0,correctCount:0,nextReviewAt:now-1}; });
s=state.computeStats(now); assert.equal(s.wordsLearned,2); assert.equal(s.dueCount,2); assert.equal(s.wordsMastered,1);
// 6 tải lại (cache mới) vẫn còn dữ liệu
const again = await import('../js/storage.js?reload'); again.init(); assert.equal(Object.keys(again.get('vocabulary').words).length,3);
// 7 JSON hỏng không crash, có sao lưu
mem.set('evoenglish.progress','{hỏng'); const re = await import('../js/storage.js?corrupt'); re.init(); assert.equal(re.get('progress').level,null); assert.equal(mem.get('evoenglish.corrupt.progress'),'{hỏng');
// 8 export / import hợp lệ & không hợp lệ
const bk = store.exportAll(); assert.equal(store.validateBackup(bk).ok,true);
assert.equal(store.validateBackup({app:'x'}).ok,false);
assert.equal(store.validateBackup({app:'EvoEnglish',schemaVersion:1,data:{vocabulary:{words:[]}}}).ok,false);
assert.equal(store.validateBackup({app:'EvoEnglish',schemaVersion:99,data:{}}).ok,false);
assert.equal(store.importAll(bk).ok,true);
// 9 ghi thất bại: import hoàn tác, không crash
failWrites=true; const before=JSON.stringify(store.get('vocabulary')); const r=store.importAll(bk); assert.equal(r.ok,false); assert.equal(JSON.stringify(store.get('vocabulary')),before); assert.ok(errs.includes('quota'));
failWrites=false;
// 10 reset
store.resetGroup('vocabulary'); assert.equal(Object.keys(store.get('vocabulary').words).length,0);
console.log('TẤT CẢ TEST PASS');

// ===== Giai đoạn 2A =====
const sr = await import('../js/spaced-repetition.js');
const voc = await import('../js/vocabulary.js');
const quiz = await import('../js/quiz.js');
const DAY=86400000; const t0=1_700_000_000_000;
// SRS: đúng liên tiếp -> khoảng cách tăng; sai -> về 0, ôn lại sau 10 phút
let rec=sr.schedule(null,4,t0); assert.equal(rec.intervalDays,1); assert.equal(rec.nextReviewAt,t0+DAY);
rec=sr.schedule(rec,4,t0); assert.equal(rec.intervalDays,3);
rec=sr.schedule(rec,5,t0); assert.ok(rec.intervalDays>=7); const big=rec.intervalDays;
rec=sr.schedule(rec,4,t0); assert.ok(rec.intervalDays>big,'đúng nhiều lần thì giãn lịch');
assert.equal(rec.wrongCount,0); assert.equal(rec.correctCount,4);
const w1=sr.schedule(rec,1,t0); assert.equal(w1.repetitions,0); assert.equal(w1.intervalDays,0); assert.equal(w1.nextReviewAt,t0+600000); assert.equal(w1.wrongCount,1); assert.ok(w1.easeFactor<rec.easeFactor);
assert.ok(sr.schedule(null,1,t0).correctCount===0,'sai không bị tính là đúng');
let e=sr.newRecord(); for(let i=0;i<30;i++) e=sr.schedule(e,3,t0); assert.ok(e.easeFactor>=1.3);
assert.equal(sr.wordStatus(null),'new'); assert.equal(sr.wordStatus({lastReviewedAt:1,intervalDays:5}),'learning'); assert.equal(sr.wordStatus({lastReviewedAt:1,intervalDays:30}),'mastered');
// reviewWord ghi vào storage
store.resetGroup('vocabulary'); sr.reviewWord('cat',4); assert.equal(store.get('vocabulary').words.cat.correctCount,1);
// Câu hỏi: mọi từ × mọi chế độ
import fs from 'node:fs'; const data=JSON.parse(fs.readFileSync('./data/vocabulary.json','utf8')); const W=data.words;
assert.ok(W.length>=100);
for (const w of W) for (const type of ['en-vi','vi-en','context','fill','spelling']) {
  const q=voc.buildQuestion(type,w,W);
  if(q.kind==='mc'){ assert.equal(q.options.length,4,type+w.w); assert.equal(new Set(q.options.map(o=>o.toLowerCase())).size,4); assert.ok(q.options.includes(q.answer)); }
  else assert.ok(quiz.isCorrect(q,'  '+w.w.toUpperCase()+' '));
  if(type==='fill'||type==='context') assert.ok(q.prompt.includes('_____'),w.w);
  assert.ok(!quiz.isCorrect({answer:w.w},w.w+'x'));
}
// pickWords: từ đến hạn lên trước, chế độ ôn chỉ lấy từ đến hạn
const recs={ cat:{lastReviewedAt:t0,nextReviewAt:t0-5}, dog:{lastReviewedAt:t0,nextReviewAt:t0+DAY} };
let p=voc.pickWords(W,recs,{now:t0,limit:5}); assert.equal(p[0].id,'cat'); assert.equal(p.length,5);
p=voc.pickWords(W,recs,{now:t0,due:true}); assert.deepEqual(p.map(x=>x.id),['cat']);
assert.equal(voc.pickWords(W,{}, {due:true}).length,0);
p=voc.pickWords(W,{}, {topic:'animals'}); assert.ok(p.every(x=>x.topic==='animals'));
console.log('GIAI ĐOẠN 2A: PASS');
