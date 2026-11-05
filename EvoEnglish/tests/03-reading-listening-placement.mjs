import assert from 'node:assert/strict';
import fs from 'node:fs';
const mem=new Map();
globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
globalThis.fetch=async(url)=>{const p='./'+url;return fs.existsSync(p)?{ok:true,json:async()=>JSON.parse(fs.readFileSync(p,'utf8'))}:{ok:false,status:404}};
const store=await import('../js/storage.js'); store.init();
const state=await import('../js/state.js'); const voc=await import('../js/vocabulary.js');
const sr=await import('../js/spaced-repetition.js'); const rd=await import('../js/reading.js');
const pl=await import('../js/placement.js'); const es=await import('../js/exercise-set.js'); const rv=await import('../js/review.js');
const quiz=await import('../js/quiz.js');
const J=n=>JSON.parse(fs.readFileSync(`./data/${n}.json`,'utf8'));
const reading=J('reading'), listening=J('listening'), placement=J('placement'), vocab=J('vocabulary'), grammar=J('grammar');

// 1. Nội dung: số lượng và tính nhất quán
assert.ok(reading.passages.length>=5); assert.ok(listening.lessons.length>=4); assert.equal(placement.questions.length,20);
for(const p of reading.passages){ assert.ok(p.questions.some(q=>q.kind==='detail')&&p.questions.some(q=>q.kind==='find')); for(const q of p.questions) assert.ok(q.options.includes(q.answer)&&q.why); }
for(const l of listening.lessons){ assert.equal(l.audio,null,'không giả vờ có audio'); assert.ok(l.lines.length&&l.glossary.length&&l.questions.length>=3); for(const q of l.questions) assert.ok(q.options.includes(q.answer)); }
// 2. gradeSet: câu chưa trả lời không bị tính đúng
const qs=reading.passages[0].questions;
let g=es.gradeSet(qs,{}); assert.equal(g.right,0); assert.equal(g.pct,0);
const all=Object.fromEntries(qs.map(q=>[q.id,q.answer])); g=es.gradeSet(qs,all); assert.equal(g.pct,100);
const half={...all,[qs[0].id]:'zzz'}; assert.equal(es.gradeSet(qs,half).right,qs.length-1);
// 3. Câu tìm thông tin dùng đúng 3 lựa chọn
for(const p of reading.passages) for(const q of p.questions.filter(x=>x.kind==='find')) assert.deepEqual(q.options,['Đúng','Sai','Không có thông tin']);
// 4. sentenceOf lấy đúng câu chứa từ
const park=reading.passages.find(p=>p.id==='a1-park');
assert.ok(rd.sentenceOf(park,'sandwiches').includes('sandwiches')); assert.equal(rd.sentenceOf(park,'zebra'),'');
assert.ok(rd.sentenceOf(reading.passages.find(p=>p.id==='a2-hue'),'worth it').includes('worth it'));
// 5. Từ tự thêm: vào kho từ, đến hạn ngay, tạo được mọi dạng câu hỏi
const id=voc.addCustomWord({w:'Sandwiches',vi:'bánh sandwich',pos:'n',ex:rd.sentenceOf(park,'sandwiches'),exVi:'',src:'reading:a1-park'});
assert.equal(id,'u-sandwiches');
let pool=voc.withCustom(vocab); assert.equal(pool.words.length,vocab.words.length+1); assert.ok(pool.topics.some(t=>t.id==='custom'));
assert.equal(state.computeStats().dueCount,1);
const cw=pool.words.find(w=>w.id===id); assert.ok(voc.containsWord(cw));
for(const t of ['en-vi','vi-en','context','fill','spelling']){ const q=voc.buildQuestion(t,cw,pool.words); if(q.kind==='mc'){assert.ok(q.options.includes(q.answer));assert.equal(q.options.length,4);} assert.ok(!String(q.explanation).includes('undefined')); }
// từ không có câu ví dụ: fill/context tự chuyển sang Anh→Việt
const noEx={id:'u-x',w:'x-ray',vi:'tia X',pos:'',ipa:'',ex:'',exVi:'',topic:'custom'};
assert.equal(voc.buildQuestion('fill',noEx,[...pool.words,noEx]).kind,'mc');
// từ không có nghĩa thì không vào kho ôn
store.update('vocabulary',v=>{v.custom['u-novi']={id:'u-novi',w:'novi',vi:'',ex:'',topic:'custom'};}); assert.equal(voc.withCustom(vocab).words.length,vocab.words.length+1);
// 6. Review dùng được từ tự thêm và liệt kê câu sai Đọc/Nghe
store.update('review',r=>{ r.wrongQuestions['r:a1-park:q3']={kind:'reading',lesson:'a1-park',qid:'q3',count:2,at:5}; r.wrongQuestions['l:a1-cafe:q1']={kind:'listening',lesson:'a1-cafe',qid:'q1',count:1,at:4}; r.wrongQuestions['r:ghost:q1']={kind:'reading',lesson:'ghost',qid:'q1',count:1,at:3}; });
const info=rv.collectReview(pool,grammar,Date.now(),{reading,listening});
assert.equal(info.wrong.length,2,'mục không còn tồn tại không được đếm'); assert.equal(info.dueWords.length,1);
assert.ok(info.wrong.some(x=>x.kind==='reading'&&x.href.includes('a1-park')));
const sess=rv.buildReviewSession(info,pool); assert.ok(sess.every(q=>q.src==='vocab'||q.src==='grammar'),'phiên ôn chỉ gồm câu có thể làm lại độc lập');
// 7. Kiểm tra đầu vào
const mk=(fn)=>placement.questions.map(q=>({q,correct:fn(q)}));
let e=pl.estimateLevel(mk(()=>false)); assert.equal(e.suggested,'A0'); assert.equal(e.beyondContent,false);
e=pl.estimateLevel(mk(q=>q.level==='A0')); assert.equal(e.suggested,'A1');
e=pl.estimateLevel(mk(q=>['A0','A1'].includes(q.level))); assert.equal(e.suggested,'A2');
e=pl.estimateLevel(mk(q=>['A0','A1','A2'].includes(q.level))); assert.equal(e.suggested,'A2'); assert.equal(e.beyondContent,true,'B1 chưa có nội dung');
e=pl.estimateLevel(mk(()=>true)); assert.equal(e.suggested,'A2'); assert.equal(e.beyondContent,true);
// một câu sai ở A0 (3/4) vẫn qua ngưỡng
e=pl.estimateLevel(placement.questions.map((q,i)=>({q,correct:!(q.level==='A0'&&i===0)}))); assert.equal(e.byLevel.A0.right,3); assert.equal(e.suggested,'A2');
// 8. Sao lưu/nhập khẩu giữ từ tự thêm
const bk=store.exportAll(); assert.ok(bk.data.vocabulary.custom['u-sandwiches']); assert.equal(store.validateBackup(bk).ok,true);
assert.equal(store.validateBackup({...bk,data:{vocabulary:{words:{},custom:[]}}}).ok,false);
// 9. Xóa từ tự thêm dọn sạch lịch ôn
voc.removeCustomWord(id); assert.equal(store.get('vocabulary').custom['u-sandwiches'],undefined); assert.equal(store.get('vocabulary').words['u-sandwiches'],undefined);
// 10. Thời gian: không tính khi không thao tác (logic idle nằm trong state, kiểm tra không ném lỗi khi không có DOM)
state.startSession('t'); state.endSession(); assert.ok(state.computeStats().sessions>=1);
console.log('GIAI ĐOẠN 3A: PASS');
