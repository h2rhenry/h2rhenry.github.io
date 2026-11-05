/* Công cụ phân tích văn bản tiếng Anh theo quy tắc đơn giản. Không phải AI: có thể bỏ sót hoặc báo nhầm. */
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export const countWords = (t) => (t.match(WORD) || []).length;
/* Dấu chấm trong chữ viết tắt (e.g., i.e., Mr., Dr., etc.) không kết thúc câu. */
const ABBR = /\b(?:e\.g|i\.e|etc|Mr|Mrs|Ms|Dr|vs)\./gi;
export const splitSentences = (t) => (t.replace(ABBR, (m) => m.replace(/\./g, '\u2024')).match(/(?:[^.!?]|[.!?](?![\s"')”’]|$))+[.!?]*/g) || []).map((x) => x.trim().replace(/\u2024/g, '.')).filter(Boolean);

const U_SOUND = /^(uni|use|usu|uti|eu|one|once|ubiq|u-)/i;
const SILENT_H = /^(hour|honest|honor|honour|heir)/i;
const IRREG = 'went|saw|ate|took|made|came|bought|got|had|was|were|did';

const RULES = [
  { id: 'lower-i', re: /\bi\b(?!\.)/g, msg: 'Đại từ "I" luôn viết hoa.' },
  { id: 'i-be', re: /\b(?:I|i)\s+(?:is|are)\b/g, msg: 'Với "I" dùng "am": I am …' },
  { id: 'he-be', re: /\b(?:he|she|it)\s+(?:are|am)\b/gi, msg: 'Với he/she/it dùng "is".' },
  { id: 'they-be', re: /\b(?:you|we|they)\s+(?:is|am)\b/gi, msg: 'Với you/we/they dùng "are".' },
  { id: 'he-dont', re: /\b(?:he|she|it)\s+don['’]t\b/gi, msg: 'Với he/she/it dùng "doesn\'t".' },
  { id: 'i-doesnt', re: /\b(?:I|you|we|they)\s+doesn['’]t\b/gi, msg: 'Với I/you/we/they dùng "don\'t".' },
  { id: 'years-old', re: /\b(?:I|he|she|we|they|you)\s+(?:have|has)\s+\w+\s+years?\s+old\b/gi, msg: 'Nói tuổi dùng "to be": I am … years old.' },
  { id: 'irregular-after-aux', re: new RegExp(`\\b(?:did|didn['’]t|will|won['’]t|can|can['’]t|could|should|must|to)\\s+(?:not\\s+)?(?:${IRREG})\\b`, 'gi'), msg: 'Sau did/will/can/to… thường dùng động từ nguyên mẫu, không dùng dạng quá khứ.' },
  { id: 'more-er', re: /\b(?:more|most)\s+(?:bigger|biggest|taller|tallest|smaller|smallest|faster|fastest|better|best|worse|worst|cheaper|cheapest|older|oldest|younger|youngest|happier|happiest|easier|easiest|larger|largest)\b/gi, msg: 'Không dùng more/most cùng với dạng -er/-est.' },
  { id: 'plural-wrong', re: /\b(?:informations|advices|homeworks|furnitures|knowledges|childs)\b/gi, msg: 'Danh từ này không đếm được hoặc có dạng số nhiều bất quy tắc.' },
  { id: 'am-agree', re: /\b(?:am|is|are)\s+agree\b/gi, msg: '"agree" là động từ, không dùng với to be: I agree.' },
  { id: 'space-before', re: /[^\S\n][,.!?;:]/g, msg: 'Không để khoảng trắng trước dấu câu.' },
  { id: 'space-after', re: /[a-z]{2,}(?:[,;:](?=[A-Za-z])|[.!?](?=[A-Z]))/g, msg: 'Thiếu khoảng trắng sau dấu câu.' },
  { id: 'double-space', re: /[^\S\n]{2,}/g, msg: 'Có khoảng trắng thừa.' },
];

function context(text, index, len) {
  return text.slice(Math.max(0, index - 12), Math.min(text.length, index + len + 12)).replace(/\s+/g, ' ').trim();
}

export function analyzeText(text) {
  const issues = [];
  const add = (id, msg, snippet) => issues.push({ id, msg, snippet });

  for (const r of RULES) for (const m of text.matchAll(r.re)) add(r.id, r.msg, context(text, m.index, m[0].length));

  for (const m of text.matchAll(/\b(a|an)\s+([A-Za-z][\w-]*)/gi)) {
    const art = m[1].toLowerCase(); const next = m[2];
    /* "A" viết hoa giữa câu là nhãn (Country A, Plan A), không phải mạo từ */
    if (m[1] === 'A' && !/(^|[.!?]["')”’]?\s+|\n\s*)$/.test(text.slice(0, m.index))) continue;
    if (next === next.toUpperCase() && next.length > 1) continue; /* từ viết tắt: an MBA */
    const vowel = /^[aeiou]/i.test(next);
    const wrong = art === 'a' ? vowel && !U_SOUND.test(next) : !vowel && !SILENT_H.test(next) && !/^x/i.test(next);
    if (wrong) add('a-an', `Kiểm tra a/an trước "${next}": chọn theo âm đọc, không theo chữ cái.`, context(text, m.index, m[0].length));
  }

  for (const m of text.matchAll(/\b([A-Za-z]+)\s+\1\b/gi)) {
    if (['had', 'that'].includes(m[1].toLowerCase())) continue; /* "had had", "that that" có thể đúng */
    add('repeated', `Từ "${m[1]}" bị lặp liên tiếp.`, context(text, m.index, m[0].length));
  }

  const sents = splitSentences(text);
  sents.forEach((s) => { if (/^[a-z]/.test(s)) add('sentence-start', 'Câu bắt đầu bằng chữ thường.', s.slice(0, 30)); });
  const trimmed = text.trim();
  const lines = trimmed.split(/\n+/);
  const signature = lines.length > 1 && countWords(lines[lines.length - 1]) <= 4 && /,$/.test(lines[lines.length - 2].trim()); /* "Yours faithfully,\nLinh Tran" */
  if (trimmed && !signature && !/[.!?]["')”’]?$/.test(trimmed)) add('end-punct', 'Bài viết chưa kết thúc bằng dấu câu (. ! ?).', trimmed.slice(-25));

  return { words: countWords(text), sentences: sents.length, issues };
}

/** So sánh văn bản nhận diện được với câu mẫu (LCS theo từ). Chỉ so văn bản, không đo phát âm. */
const normTok = (s) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']+/g, '');
export function compareSpeech(target, heard) {
  const display = target.split(/\s+/).filter(Boolean);
  const t = display.map(normTok);
  const hw = heard.split(/\s+/).map(normTok).filter(Boolean);
  const dp = Array.from({ length: t.length + 1 }, () => new Array(hw.length + 1).fill(0));
  for (let i = 1; i <= t.length; i++) for (let j = 1; j <= hw.length; j++) dp[i][j] = t[i - 1] && t[i - 1] === hw[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const ok = new Set();
  let i = t.length, j = hw.length;
  while (i > 0 && j > 0) {
    if (t[i - 1] && t[i - 1] === hw[j - 1]) { ok.add(i - 1); i--; j--; } else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
  }
  const valid = t.filter(Boolean).length;
  return { pct: valid ? Math.round((ok.size / valid) * 100) : 0, marks: display.map((w, k) => ({ w, ok: ok.has(k) })), heardWords: hw.length };
}
