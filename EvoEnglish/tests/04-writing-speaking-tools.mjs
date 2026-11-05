import assert from 'node:assert/strict'; import fs from 'node:fs';
const T=await import('../js/text-tools.js');
const ids=(t)=>T.analyzeText(t).issues.map(i=>i.id);
const W=JSON.parse(fs.readFileSync('./data/writing.json','utf8'));
// 1. Bài mẫu: đủ số từ và KHÔNG bị báo lỗi nào (kiểm tra báo nhầm)
for(const t of W.tasks.filter(x=>x.sample)){ const r=T.analyzeText(t.sample);
  assert.ok(r.words>=t.minWords&&r.words<=t.maxWords,`${t.id}: ${r.words} từ ngoài khoảng ${t.minWords}-${t.maxWords}`);
  assert.deepEqual(r.issues,[],`${t.id} bị báo nhầm: ${JSON.stringify(r.issues)}`); assert.ok(t.sampleNotes.length&&t.checklist.length&&t.structure.length&&t.phrases.length); }
// 2. Mỗi quy tắc bắt đúng lỗi
const bad={ 'lower-i':'Today i am happy.','i-be':'I is happy.','he-be':'She are my friend.','they-be':'They is here.','he-dont':'He don\'t like tea.','i-doesnt':'We doesn\'t know.','years-old':'I have ten years old.','irregular-after-aux':'She did not went home.','more-er':'He is more taller than me.','plural-wrong':'She gave me many informations.','am-agree':'I am agree with you.','space-before':'Hello , my friend.','space-after':'Hello,world is nice.','double-space':'I  like tea.','a-an':'I eat a apple.','repeated':'I like the the book.','sentence-start':'I like tea. she likes milk.','end-punct':'I like tea' };
for(const [id,t] of Object.entries(bad)) assert.ok(ids(t).includes(id),`${id} không bắt được: "${t}" → ${ids(t)}`);
assert.ok(ids('Thank you for your help\nand see you').includes('end-punct')); assert.ok(ids("i'm tired.").includes('lower-i'));
assert.ok(ids('This is an book.').includes('a-an')); assert.ok(ids('A apple is red.').includes('a-an'),'A đầu câu vẫn được kiểm tra'); assert.ok(ids('Look. An dog runs.').includes('a-an'));
// 3. Không báo nhầm trường hợp hợp lệ
const good=['Thank you.\n\nYours faithfully,\nLinh Tran','Country A and Country B grew, while Plan A also helped.','Vitamin A and zinc are useful.','I have had enough.','He said that that is fine.','She is a university student.','He is an honest man and waits an hour.','I want an MBA and a one-day trip.','I like fruit, e.g. apples and oranges.','Visit www.example.com now.','The price is 3,000 dong.','I am 12 years old.','He doesn\'t like tea.','I don\'t know.','I went home. She will go too.','I am a user of an X-ray machine.','Did she go home?','We will see.'];
for(const g of good) assert.deepEqual(ids(g),[],`báo nhầm: "${g}" → ${ids(g)}`);
// 4. Đếm từ
assert.equal(T.countWords("I don't like forty-five o'clock."),5); assert.equal(T.countWords(''),0); assert.equal(T.countWords('  Hello,   world!  '),2);
assert.equal(T.splitSentences('Hi. How are you? Fine!').length,3);
// 5. compareSpeech
let c=T.compareSpeech('Nice to meet you.','nice to meet you'); assert.equal(c.pct,100); assert.ok(c.marks.every(m=>m.ok));
c=T.compareSpeech('Nice to meet you.','nice to see you'); assert.equal(c.pct,75); assert.deepEqual(c.marks.map(m=>m.ok),[true,true,false,true]);
c=T.compareSpeech("I get up at six o'clock.","i get up at six oclock"); assert.equal(c.pct,83);
assert.equal(T.compareSpeech('Hello there','').pct,0); assert.equal(T.compareSpeech('Hello there','xyz').pct,0);
c=T.compareSpeech('Where is the bus station?','where is bus the station'); assert.ok(c.pct>=60&&c.pct<100);
// 6. Dữ liệu Nói
const S=JSON.parse(fs.readFileSync('./data/speaking.json','utf8'));
assert.ok(S.sentences.length>=12&&S.topics.length>=6); for(const s of S.sentences) assert.ok(s.text&&s.vi&&s.tip); for(const t of S.topics) assert.ok(t.questions.length&&t.phrases.length&&t.seconds>0);
console.log('GIAI ĐOẠN 3B (công cụ): PASS');
