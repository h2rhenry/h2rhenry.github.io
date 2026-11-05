import assert from 'node:assert/strict'; import fs from 'node:fs';
const mem=new Map(); globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
const store=await import('../js/storage.js'); store.init();
const state=await import('../js/state.js'); const ex=await import('../js/exercise-set.js'); const T=await import('../js/text-tools.js');
const ielts=await import('../js/exam-ielts.js'); const st=await import('../js/statistics.js'); const ui=await import('../js/exam-ui.js'); const W=await import('../js/writing.js');
const D=JSON.parse(fs.readFileSync('./data/ielts.json','utf8'));
// 1. Cấu trúc dữ liệu
assert.ok(D.disclaimer.includes('không liên kết')&&D.disclaimer.includes('không phải điểm IELTS chính thức'));
assert.equal(D.reading.academic.length,1); assert.equal(D.reading.general.length,1); assert.notEqual(D.reading.academic[0].paragraphs.join(),D.reading.general[0].paragraphs.join());
assert.ok(D.writing.task1.some(t=>t.track==='academic'&&t.table)&&D.writing.task1.some(t=>t.track==='general'&&!t.table),'Task 1 Academic và General khác nhau');
assert.equal(D.speaking.part1.length>=1&&D.speaking.part2.length>=1&&D.speaking.part3.length>=1,true);
// 2. Câu hỏi: đáp án hợp lệ và thật sự có trong bài
const check=(set,text)=>{ for(const q of set.questions){ assert.ok(q.why,q.id);
  if(q.kind==='mc'||q.kind==='tfng'){ assert.ok(q.options.includes(q.answer),set.id+q.id); if(q.kind==='tfng') assert.deepEqual(q.options,['True','False','Not Given']); }
  else { const cand=[q.answer,...(q.accepts||[])].map(x=>x.toLowerCase()); assert.ok(cand.some(c=>text.includes(c)),`${set.id}.${q.id}: đáp án "${q.answer}" không có trong bài`); } } };
for(const l of D.listening) check(l,l.lines.map(x=>x.text).join(' ').toLowerCase());
for(const p of [...D.reading.academic,...D.reading.general]) check(p,p.paragraphs.join(' ').toLowerCase());
// mỗi bộ có đủ dạng câu hỏi như nhãn hướng dẫn
const ac=D.reading.academic[0]; assert.ok(ac.questions.some(q=>q.kind==='tfng')&&ac.questions.some(q=>q.kind==='text')&&ac.questions.some(q=>q.kind==='mc'));
// 3. Bài mẫu Writing: đủ từ, không bị báo lỗi nhầm, số liệu bảng khớp bài mẫu
for(const t of [...D.writing.task1,...D.writing.task2]){ const r=T.analyzeText(t.sample); assert.ok(r.words>=t.minWords,t.id+' '+r.words); assert.deepEqual(r.issues,[],t.id+' '+JSON.stringify(r.issues)); assert.equal(t.criteria.length,4); }
const tab=D.writing.task1.find(t=>t.table).table; const num=s=>Number(s.replace('%','')); const row=n=>tab.rows.find(r=>r[0]===n).slice(1).map(num);
assert.deepEqual(row('Country C'),[72,85,93]); const s=D.writing.task1.find(t=>t.table).sample;
for(const v of [72,45,30,85,62,48,70,81,93]) assert.ok(s.includes(String(v)),'bài mẫu thiếu số '+v);
assert.equal(row('Country C')[0]-row('Country B')[0],42); assert.equal(row('Country C')[2]-row('Country B')[2],23); assert.ok(row('Country B')[2]/row('Country B')[0]>2);
// 4. Chấm điểm điền từ: chấp nhận biến thể, không chấp nhận sai, câu trống không tính đúng
const L1=D.listening[0]; let g=ex.gradeSet(L1.questions,{q1:'  reeves ',q2:'Forty-two',q3:'maple',q4:'Standard',q5:'£15',q6:'thursday',q7:'At the front desk'}); assert.equal(g.right,7);
g=ex.gradeSet(L1.questions,{q1:'Reves',q2:'24',q3:'Oak',q4:'Premium',q5:'',q6:'',q7:'On the website'}); assert.equal(g.right,0,'sai/trống không được tính đúng');
const R1=ac; g=ex.gradeSet(R1.questions,Object.fromEntries(R1.questions.map(q=>[q.id,q.answer]))); assert.equal(g.pct,100);
assert.equal(ex.gradeSet(R1.questions,{q7:'soil'}).results.find(r=>r.q.id==='q7').correct,true);
// 5. recordExam: tự chấm không vào điểm trung bình, không cộng hoạt động gấp đôi
ielts.recordExam({id:'ac-r1',title:'IELTS Reading (Academic) · X',right:6,total:8,pct:75,href:'#/ielts'});
assert.equal(state.computeStats().today.items,8); assert.equal(store.get('progress').lessons['ielts:ac-r1'].best,75);
ielts.recordExam({id:'w2-1',title:'IELTS Writing Task 2 · X (tự chấm)',right:16,total:16,pct:100,self:true,items:0,href:'#/ielts'});
assert.equal(state.computeStats().today.items,8,'tự chấm items=0 không cộng thêm'); const hist=store.get('quizHistory').entries; assert.equal(hist.filter(e=>e.self).length,1);
assert.equal(st.averageScore(hist),75,'điểm tự chấm không vào trung bình');
ielts.recordExam({id:'p2-1',title:'IELTS Speaking Part 2 · X (tự chấm)',right:8,total:16,pct:50,self:true,items:1,href:'#/ielts'}); assert.equal(state.computeStats().today.items,9);
// lần làm lại: best giữ lần cao nhất, attempts tăng
ielts.recordExam({id:'ac-r1',title:'t',right:2,total:8,pct:25,href:'#/ielts'}); const p=store.get('progress').lessons['ielts:ac-r1']; assert.equal(p.best,75); assert.equal(p.attempts,2);
// 6. rubricTotal với tiêu chí IELTS tuỳ biến
const crit=D.writing.task2[0].criteria; assert.equal(W.rubricTotal({task:4,coherence:3,lexical:3,grammar:2},crit),12); assert.equal(W.rubricTotal({task:4,coherence:3},crit),null);
// 7. Lịch sử chỉ gồm IELTS; sao lưu hợp lệ
assert.ok(typeof ui.historyList==='function'); assert.equal(store.validateBackup(store.exportAll()).ok,true);
assert.equal(ui.fmtTime(125),'02:05'); assert.equal(ui.fmtTime(0),'00:00');
console.log('GIAI ĐOẠN 4A: PASS');
