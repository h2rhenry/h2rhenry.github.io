import assert from 'node:assert/strict';
import fs from 'node:fs';
const mem = new Map();
globalThis.localStorage = { getItem:k=>mem.has(k)?mem.get(k):null, setItem:(k,v)=>mem.set(k,String(v)), removeItem:k=>mem.delete(k) };
globalThis.fetch = async (url) => { const p='./'+url; if(!fs.existsSync(p)) return {ok:false,status:404}; return {ok:true,json:async()=>JSON.parse(fs.readFileSync(p,'utf8'))}; };
const store=await import('../js/storage.js'); store.init();
const state=await import('../js/state.js');
const gr=await import('../js/grammar.js');
const cu=await import('../js/curriculum.js');
const rv=await import('../js/review.js');
const lp=await import('../js/learning-path.js');
const st=await import('../js/statistics.js');
const quiz=await import('../js/quiz.js');
const cur=await cu.loadCurriculum();
assert.ok(cur.vocab&&cur.grammar&&cur.path.levels.length===7);

// 1. Mọi câu ngữ pháp: đáp án đúng được chấp nhận, đáp án lạ bị từ chối
let n=0;
for(const l of cur.grammar.lessons) for(const ex of l.exercises){ n++;
  const q=gr.buildGrammarQuestion(l,ex);
  if(q.kind==='mc'){ assert.ok(q.options.includes(q.answer)); assert.equal(q.options.length,ex.options.length); }
  assert.ok(quiz.isCorrect(q,q.answer),l.id+ex.id);
  for(const a of ex.accepts||[]) assert.ok(quiz.isCorrect(q,a),a);
  assert.ok(!quiz.isCorrect(q,'zzz'));
}
assert.equal(n,91);
// dấu nháy cong được chấp nhận
const dq=gr.buildGrammarQuestion(cur.grammar.lessons.find(l=>l.id==='present-simple'),cur.grammar.lessons.find(l=>l.id==='present-simple').exercises[4]);
assert.ok(quiz.isCorrect(dq,'don’t like'));
// 2. Mọi mục lộ trình trỏ tới dữ liệu có thật
for(const lv of cur.path.levels) for(const it of lv.lessons){
  if(it.type==='vocab') assert.ok(cur.vocab.words.some(w=>w.topic===it.ref),it.ref);
  else if(it.type==='grammar') assert.ok(cur.grammar.lessons.some(l=>l.id===it.ref),it.ref);
  else if(it.type==='reading') assert.ok(JSON.parse(fs.readFileSync('./data/reading.json','utf8')).passages.some(p=>p.id===it.ref),it.ref);
  else assert.ok(JSON.parse(fs.readFileSync('./data/listening.json','utf8')).lessons.some(p=>p.id===it.ref),it.ref);
}
// 3. Hoàn thành lộ trình bắt đầu từ 0 và tính từ dữ liệu thật
let pc=cu.pathCompletion(cur); assert.ok(pc.total>0); assert.equal(pc.done,0);
const total0=pc.total;
// 4. Ghi kết quả bài ngữ pháp
const tobe=cur.grammar.lessons.find(l=>l.id==='to-be');
gr.recordGrammarResult(tobe,{right:4,total:7,pct:57});
assert.equal(store.get('progress').lessons['grammar:to-be'].status,'in-progress','dưới 70% chưa hoàn thành');
assert.ok(store.get('review').weakGrammar['to-be']);
gr.recordGrammarResult(tobe,{right:7,total:7,pct:100});
assert.equal(store.get('progress').lessons['grammar:to-be'].status,'completed');
assert.equal(store.get('progress').lessons['grammar:to-be'].best,100);
assert.equal(store.get('review').weakGrammar['to-be'],undefined,'điểm cao thì hết yếu');
assert.equal(store.get('quizHistory').entries.length,2);
pc=cu.pathCompletion(cur); assert.equal(pc.done,1); assert.equal(pc.total,total0);
// 5. Câu sai ghi/xóa đúng
const q1=gr.buildGrammarQuestion(tobe,tobe.exercises[0]);
gr.recordGrammarAnswer(q1,false); gr.recordGrammarAnswer(q1,false);
assert.equal(store.get('review').wrongQuestions[q1.id].count,2);
let info=rv.collectReview(cur.vocab,cur.grammar); assert.equal(info.wrong.length,1);
const sess=rv.buildReviewSession(info,cur.vocab); assert.equal(sess.length,1); assert.equal(sess[0].src,'grammar');
gr.recordGrammarAnswer(q1,true); assert.equal(rv.collectReview(cur.vocab,cur.grammar).wrong.length,0);
// 6. Review gồm từ đến hạn + từ sai
const now=Date.now();
store.update('vocabulary',v=>{ v.words.cat={repetitions:0,nextReviewAt:now-1,lastReviewedAt:now-2,correctCount:0,wrongCount:1,intervalDays:0}; });
info=rv.collectReview(cur.vocab,cur.grammar,now); assert.equal(info.dueWords.length,1);
assert.equal(state.computeStats(now).dueCount,1,'Dashboard và Review Center cùng một con số');
const s2=rv.buildReviewSession(info,cur.vocab); assert.ok(s2.some(q=>q.src==='vocab'&&q.wordId==='cat'));
// mục không còn trong dữ liệu thì không bị đếm
store.update('review',r=>{ r.wrongQuestions['v:ghost']={kind:'vocab',id:'ghost',count:1,at:1}; r.wrongQuestions['g:nope:q1']={kind:'grammar',lesson:'nope',qid:'q1',count:1,at:1}; });
assert.equal(rv.collectReview(cur.vocab,cur.grammar,now).wrong.length,0);
// 7. Bài kiểm tra cuối chương
const a0=cur.path.levels[0]; const test=lp.buildLevelTest(a0,cur);
assert.ok(test.length>=8&&test.length<=12); assert.ok(test.every(q=>q.src==='grammar'||q.src==='vocab'));
assert.ok(test.every(q=>q.kind==='text'||q.options.includes(q.answer)));
const a2=cur.path.levels[2]; assert.ok(lp.buildLevelTest(a2,cur).every(q=>q.src==='grammar'));
assert.equal(lp.buildLevelTest(cur.path.levels[3],cur).length,0,'cấp độ chờ bổ sung không có bài kiểm tra');
// 8. Hoàn thành cấp độ cần cả bài học lẫn bài kiểm tra
store.update('progress',p=>{ for(const it of a0.lessons.filter(x=>x.type!=='vocab')) p.lessons[it.type+':'+it.ref]={status:'completed',best:90}; });
store.update('vocabulary',v=>{ for(const w of cur.vocab.words) if(['greetings','family','colors'].includes(w.topic)) v.words[w.id]={...v.words[w.id],correctCount:1,lastReviewedAt:now}; });
let sum=cu.levelSummary(a0,cur); assert.equal(sum.complete,false); assert.equal(sum.done,sum.total-1);
store.update('progress',p=>{ p.lessons['test:A0']={status:'completed',best:80}; });
sum=cu.levelSummary(a0,cur); assert.equal(sum.complete,true);
// 9. Thống kê
assert.equal(st.averageScore([]),null); assert.equal(st.averageScore([{pct:50},{pct:100}]),75);
const stats=state.computeStats(now);
const goals=st.goalList({stats,entries:store.get('quizHistory').entries,lessonsDone:1,dailyGoalMin:15,days:{}});
assert.equal(goals.find(g=>g[0].startsWith('Hoàn thành 1 bài ngữ pháp'))[1],true);
assert.equal(goals.find(g=>g[0].startsWith('Học 10 từ'))[1],stats.wordsLearned>=10);
assert.equal(goals.find(g=>g[0].startsWith('Chuỗi học 7'))[1],false);
// 10. Export/import vẫn hợp lệ với dữ liệu mới
const bk=store.exportAll(); assert.equal(store.validateBackup(bk).ok,true); assert.equal(store.importAll(bk).ok,true);
console.log('GIAI ĐOẠN 2B: PASS ('+n+' câu ngữ pháp kiểm tra)');
