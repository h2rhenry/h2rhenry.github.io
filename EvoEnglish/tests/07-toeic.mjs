import assert from 'node:assert/strict'; import fs from 'node:fs';
const mem=new Map(); globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
const store=await import('../js/storage.js'); store.init();
const state=await import('../js/state.js'); const ex=await import('../js/exercise-set.js'); const ui=await import('../js/exam-ui.js'); const toeic=await import('../js/exam-toeic.js'); const ielts=await import('../js/exam-ielts.js'); const sc=await import('../js/toeic-scenes.js'); const st=await import('../js/statistics.js');
const D=JSON.parse(fs.readFileSync('./data/toeic.json','utf8'));
// 1. Cấu trúc: đủ 7 Part theo đúng thứ tự, skill đúng
assert.deepEqual(D.parts.map(p=>p.id),['part1','part2','part3','part4','part5','part6','part7']);
assert.deepEqual(D.parts.map(p=>p.skill),['listening','listening','listening','listening','reading','reading','reading']);
assert.ok(D.disclaimer.includes('ETS')&&D.disclaimer.includes('không phải điểm TOEIC chính thức')); assert.ok(D.future.includes('chờ bổ sung'));
// 2. Câu hỏi dựng từ dữ liệu
let total=0; const ids=new Set();
for(const p of D.parts){ const qs=toeic.buildPartQuestions(p); assert.ok(qs.length>=4,p.id); total+=qs.length;
  for(const q of qs){ assert.ok(!ids.has(q.id),'trùng id '+q.id); ids.add(q.id); assert.equal(q.kind,'mc'); assert.ok(q.options.includes(q.answer),p.id+q.id); assert.equal(new Set(q.options).size,q.options.length); assert.ok(q.why&&q.why.length>10);
    assert.equal(q.options.length,p.id==='part2'?3:4,p.id+' số đáp án');
    if(p.id==='part1'){ assert.ok(typeof q.extra==='function'); assert.deepEqual(q.options,['A','B','C','D']); assert.ok(q.why.includes('(A)')&&q.why.includes('(D)'),'lời giải phải hé lộ transcript'); }
    if(p.id==='part2'){ assert.ok(typeof q.extra==='function'); assert.ok(q.why.includes('Transcript')); } } }
assert.equal(total,50);
// 3. Nội dung đi kèm: mỗi nhóm đúng một lần
for(const id of ['part3','part4','part6','part7']){ const p=D.parts.find(x=>x.id===id); const qs=toeic.buildPartQuestions(p); assert.equal(qs.filter(q=>q.before).length,p.groups.length,id); assert.ok(qs[0].before); assert.ok(!qs[1].before); }
assert.equal(toeic.buildPartQuestions(D.parts[4]).filter(q=>q.before||q.extra).length,0);
// 3b. Dòng nghe: phải là {who, text} dạng chuỗi (đây là lỗi từng xảy ra: dữ liệu dạng mảng khiến transcript trống)
for(const id of ['part3','part4']) for(const g of D.parts.find(x=>x.id===id).groups){ assert.ok(g.lines.length>=1); for(const l of g.lines){ assert.equal(typeof l.who,'string'); assert.equal(typeof l.text,'string'); assert.ok(l.text.length>10,'dòng nghe quá ngắn hoặc rỗng'); } }
// 4. Đáp án phân bố không dồn một vị trí
const pos=(arr)=>new Set(arr); const p5=D.parts[4].items; assert.ok(pos(p5.map(i=>i.options.indexOf(i.answer))).size>=3,'Part 5 đáp án dồn một vị trí');
assert.ok(pos(D.parts[0].items.map(i=>i.answer)).size>=3); assert.equal(pos(D.parts[1].items.map(i=>i.answer)).size,3);
// 5. Part 5: mỗi câu có đúng một chỗ trống; Part 6: số ô trống khớp số câu
for(const i of p5) assert.equal((i.q.match(/____/g)||[]).length,1,i.q);
for(const g of D.parts[5].groups){ const t=g.text.join(' '); for(let n=1;n<=g.questions.length;n++) assert.ok(t.includes(`(${n}) ____`),'thiếu ô trống '+n); assert.equal((t.match(/____/g)||[]).length,g.questions.length); }
// 6. Chấm điểm từng Part
for(const p of D.parts){ const qs=toeic.buildPartQuestions(p); let g=ex.gradeSet(qs,Object.fromEntries(qs.map(q=>[q.id,q.answer]))); assert.equal(g.pct,100,p.id);
  g=ex.gradeSet(qs,Object.fromEntries(qs.map(q=>[q.id,q.options.find(o=>o!==q.answer)]))); assert.equal(g.right,0,p.id+' đáp án sai không được tính đúng');
  g=ex.gradeSet(qs,{}); assert.equal(g.right,0); }
// 7. Tranh minh họa tồn tại cho mọi Photograph
for(const it of D.parts[0].items){ assert.ok(sc.SCENE_NAMES.includes(it.scene),it.scene); assert.ok(it.alt.length>20,'cần mô tả cho trình đọc màn hình'); }
assert.equal(new Set(D.parts[0].items.map(i=>i.scene)).size,4);
// 8. Ghi điểm: kind toeic, tính hoạt động, không lẫn IELTS
ielts.recordExam({id:'ac-r1',title:'IELTS X',right:4,total:8,pct:50,href:'#/ielts'});
ui.recordPractice({kind:'toeic',id:'part5',title:'TOEIC Part 5',right:7,total:10,pct:70,href:'#/toeic?part=part5'});
ui.recordPractice({kind:'toeic',id:'part5',title:'TOEIC Part 5',right:9,total:10,pct:90,href:'#/toeic?part=part5'});
const pr=store.get('progress').lessons['toeic:part5']; assert.equal(pr.attempts,2); assert.equal(pr.best,90);
const hist=store.get('quizHistory').entries; assert.equal(hist.filter(e=>e.kind==='toeic'&&e.id==='part5').length,2); assert.equal(hist.filter(e=>e.kind==='ielts').length,1);
assert.equal(state.computeStats().today.items,8+10+10); assert.equal(st.averageScore(hist),Math.round((50+70+90)/3));
ui.recordPractice({kind:'toeic',id:'part1',title:'x',right:5,total:8,pct:62.5,self:true,items:0,href:'#'}); assert.equal(st.averageScore(store.get('quizHistory').entries),70,'tự chấm không vào trung bình');
// 9. Sao lưu hợp lệ
assert.equal(store.validateBackup(store.exportAll()).ok,true);
console.log('GIAI ĐOẠN 4B: PASS ('+total+' câu TOEIC)');
