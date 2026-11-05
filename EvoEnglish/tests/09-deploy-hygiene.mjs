/* Bảo vệ những thứ dễ hỏng khi chỉnh sửa: danh sách tệp ngoại tuyến, hash CSP, đường dẫn tương đối. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sw = readFileSync('sw.js', 'utf8');
const list = JSON.parse(sw.match(/const PRECACHE = (\[.*?\]);/s)[1]);
// 1. Mọi tệp trong css/js/data đều nằm trong danh sách tiền lưu, và mọi mục đều tồn tại
const actual = ['css', 'js', 'data'].flatMap((d) => readdirSync(d).filter((f) => /\.(css|js|json)$/.test(f)).map((f) => `${d}/${f}`));
for (const f of actual) assert.ok(list.includes(f), `sw.js thiếu ${f}: hãy thêm vào PRECACHE để chạy được ngoại tuyến`);
for (const f of list) assert.ok(f === './' || existsSync(f), `PRECACHE có tệp không tồn tại: ${f}`);
assert.ok(list.includes('index.html') && list.includes('./'));
assert.ok(!sw.includes('importScripts') && !/https?:\/\//.test(sw.replace(/\/\*[\s\S]*?\*\//g, '')), 'service worker không được gọi dịch vụ ngoài');
// 2. Hash CSP khớp script nội tuyến (sai hash thì trình duyệt chặn script chỉnh giao diện sáng/tối)
const html = readFileSync('index.html', 'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const hash = createHash('sha256').update(inline, 'utf8').digest('base64');
assert.ok(html.includes(`'sha256-${hash}'`), `Hash CSP không khớp. Hãy dùng: 'sha256-${hash}'`);
assert.equal((html.match(/<script(?![^>]*src)[^>]*>/g) || []).length, 1, 'chỉ cho phép một script nội tuyến');
assert.ok(/script-src 'self'/.test(html) && !/script-src[^;]*unsafe-inline/.test(html) && !/script-src[^;]*unsafe-eval/.test(html), 'CSP không được nới lỏng script-src');
// 3. Đường dẫn tài nguyên đều tương đối (chạy được trong thư mục con như /EvoEnglish/)
for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) assert.ok(!m[1].startsWith('/') && !/^https?:/.test(m[1]), `đường dẫn không tương đối: ${m[1]}`);
for (const f of readdirSync('js')) { const s = readFileSync(`js/${f}`, 'utf8'); assert.ok(!/fetch\(\s*['"`]\//.test(s), `${f} fetch đường dẫn gốc tuyệt đối`); }
assert.ok(existsSync('.nojekyll') && existsSync('LICENSE') && existsSync('README.md'));
// 4. Tệp nội tuyến nhỏ gọn, không có bí mật
const all = actual.map((f) => readFileSync(f, 'utf8')).join('\n');
assert.ok(!/api[_-]?key\s*[:=]|BEGIN (RSA|PRIVATE)|ghp_[A-Za-z0-9]{20,}/i.test(all), 'có dấu hiệu bí mật trong mã nguồn');
assert.ok(!/\beval\s*\(|new Function\s*\(|innerHTML\s*=|document\.write\s*\(/.test(all.replace(/\/\*[\s\S]*?\*\//g, '')), 'dùng API không an toàn');
// 5. Phiên bản nhất quán giữa ứng dụng, package.json và service worker
const ver = readFileSync('js/version.js', 'utf8').match(/'([\d.]+)'/)[1];
assert.equal(JSON.parse(readFileSync('package.json', 'utf8')).version, ver); assert.ok(sw.includes(`evoenglish-${ver}`), 'VERSION trong sw.js khác phiên bản ứng dụng');
console.log(`GIAI ĐOẠN 5 (triển khai): PASS (${actual.length} tệp tiền lưu, hash CSP khớp)`);
