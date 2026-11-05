import assert from 'node:assert/strict'; import fs from 'node:fs';
const mem=new Map(); let fail=false;
globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>{ if(fail){const e=new Error('q');e.name='QuotaExceededError';throw e;} mem.set(k,String(v)); },removeItem:k=>mem.delete(k)};
const store=await import('../js/storage.js'); store.init(); const errs=[]; store.onError(e=>errs.push(e.code));
const W=await import('../js/writing.js'); const clean=await import('../js/cleanup.js');
// 1. Tạo, sửa, xóa bản nháp
const id=W.newId(); assert.ok(W.upsertDraft({id,taskId:'a0-intro',title:'Giới thiệu',text:'Hello.',seconds:5,rating:{},checks:[],status:'draft'}));
assert.equal(W.getDrafts().length,1); assert.ok(mem.get('evoenglish.writingDrafts').includes('Hello.'));
W.upsertDraft({id,text:'Hello. I am Mai.',seconds:30}); assert.equal(W.getDrafts().length,1,'sửa không tạo thêm'); assert.equal(W.getDrafts()[0].text,'Hello. I am Mai.'); assert.equal(W.getDrafts()[0].title,'Giới thiệu','giữ trường cũ');
const id2=W.newId(); W.upsertDraft({id:id2,taskId:'free',title:'Tự do',text:'x',status:'draft'}); assert.equal(W.getDrafts().length,2); assert.equal(W.getDrafts()[0].id,id2,'bài mới lên đầu');
W.deleteDraft(id); assert.deepEqual(W.getDrafts().map(d=>d.id),[id2]);
// 2. Giới hạn số bản nháp: không ghi thêm, không mất bài cũ
for(let i=0;i<W.MAX_DRAFTS-1;i++) W.upsertDraft({id:'x'+i,text:'t'}); assert.equal(W.getDrafts().length,W.MAX_DRAFTS);
assert.equal(W.upsertDraft({id:'extra',text:'no'}),false); assert.equal(W.getDrafts().length,W.MAX_DRAFTS); assert.ok(!W.getDrafts().some(d=>d.id==='extra'));
assert.ok(W.upsertDraft({id:'x0',text:'edited'}),'vẫn sửa được bài có sẵn'); 
// 3. Ổ lưu đầy: báo lỗi nhưng không crash, dữ liệu trong phiên vẫn còn
fail=true; const ok=W.upsertDraft({id:'x1',text:'while full'}); fail=false; assert.ok(errs.includes('quota')); assert.equal(W.getDrafts().find(d=>d.id==='x1').text,'while full');
// 4. Điểm tự đánh giá chỉ có khi chấm đủ 4 tiêu chí
assert.equal(W.rubricTotal({}),null); assert.equal(W.rubricTotal({content:3,grammar:3,vocab:3}),null); assert.equal(W.rubricTotal({content:3,grammar:2,vocab:4,coherence:1}),10); assert.equal(W.rubricTotal({content:5,grammar:2,vocab:4,coherence:1}),null,'giá trị ngoài khoảng bị từ chối');
// 5. Sao lưu/nhập giữ bản nháp; reset nhóm dọn sạch
const bk=store.exportAll(); assert.equal(store.validateBackup(bk).ok,true); assert.equal(store.validateBackup({...bk,data:{writingDrafts:{drafts:{}}}}).ok,false);
store.resetGroup('writingDrafts'); assert.equal(W.getDrafts().length,0); assert.equal(store.importAll(bk).ok,true); assert.ok(W.getDrafts().length>0);
// 6. Mặc định cài đặt: chưa đồng ý dùng nhận diện giọng nói
assert.equal(store.get('settings').speechConsent,false);
// 7. cleanup chạy theo thứ tự ngược và chỉ một lần
const order=[]; clean.onLeave(()=>order.push('a')); clean.onLeave(()=>{order.push('b'); throw new Error('lỗi không được làm hỏng các bước sau');}); clean.onLeave(()=>order.push('c'));
const origErr=console.error; console.error=()=>{}; clean.runLeave(); console.error=origErr; assert.deepEqual(order,['c','b','a']); clean.runLeave(); assert.equal(order.length,3);
console.log('GIAI ĐOẠN 3B (lưu trữ): PASS');
