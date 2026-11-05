/* Chạy lần lượt mọi bài kiểm thử trong thư mục tests/. Cần Node.js 18 trở lên: npm test */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const files = readdirSync(here).filter((f) => /^\d+-.*\.mjs$/.test(f)).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [join(here, f)], { cwd: root, encoding: 'utf8' });
  const out = (r.stdout || '').trim().split('\n').filter(Boolean).pop() || '';
  if (r.status === 0) console.log(`PASS  ${f}  ${out}`);
  else { failed += 1; console.log(`FAIL  ${f}\n${(r.stderr || r.stdout).split('\n').slice(0, 12).join('\n')}`); }
}
console.log(failed ? `\n${failed}/${files.length} tệp kiểm thử thất bại` : `\nTất cả ${files.length} tệp kiểm thử đều đạt`);
process.exit(failed ? 1 : 0);
