import * as store from './storage.js';
import * as state from './state.js';
import { h, formatDate } from './utils.js';
import { loadData } from './data.js';
import { runQuiz, shuffle } from './quiz.js';
import { recordQuizResult } from './results.js';

const ORDER = ['A0', 'A1', 'A2', 'B1'];
const SKILL = { grammar: 'Ngữ pháp', vocab: 'Từ vựng', reading: 'Đọc hiểu' };

/** Ước lượng điểm bắt đầu: cấp đầu tiên có tỷ lệ đúng dưới ngưỡng. Chỉ mang tính tham khảo. */
export function estimateLevel(results, threshold = 0.65) {
  const byLevel = Object.fromEntries(ORDER.map((l) => [l, { right: 0, total: 0 }]));
  results.forEach((r) => { byLevel[r.q.level].total += 1; if (r.correct) byLevel[r.q.level].right += 1; });
  const failed = ORDER.find((l) => byLevel[l].total && byLevel[l].right / byLevel[l].total < threshold);
  const suggested = ['A0', 'A1', 'A2'].includes(failed) ? failed : 'A2';
  return { byLevel, suggested, beyondContent: !failed || failed === 'B1' };
}

export async function render(root) {
  const data = await loadData('placement');
  if (!data) { root.append(h('div', { class: 'card', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Không tải được bài kiểm tra'), h('p', { class: 'muted' }, 'Hãy kiểm tra kết nối rồi tải lại trang.'))); return; }

  function start() {
    const questions = data.questions.map((q) => ({
      id: 'pl:' + q.id, kind: 'mc', level: q.level, question: SKILL[q.skill], prompt: q.q, sub: q.passage, options: shuffle(q.options), answer: q.answer, explanation: q.why,
    }));
    state.startSession('placement');
    const stage = h('div', {});
    root.replaceChildren(h('div', { class: 'page-head' }, h('h1', { class: 'sr-only', tabindex: '-1' }, 'Kiểm tra đầu vào'), h('button', { class: 'btn', type: 'button', onclick: () => { state.endSession(); home(); } }, '← Kiểm tra đầu vào')), stage);
    runQuiz(stage, {
      title: 'Kiểm tra đầu vào', questions,
      onAnswer: () => state.recordActivity({ items: 1 }),
      onFinish: ({ results, right, total, pct }) => {
        const est = estimateLevel(results);
        store.update('progress', (p) => { p.placement = { at: Date.now(), suggested: est.suggested, byLevel: est.byLevel, right, total }; if (!p.level) p.level = est.suggested; });
        recordQuizResult({ kind: 'placement', id: 'placement', title: 'Kiểm tra đầu vào', right, total, pct, href: '#/learning-path' });
        state.endSession(); state.notify();
      },
      summaryExtra: () => resultNode(store.get('progress').placement),
      actions: [
        { label: 'Dùng làm cấp độ hiện tại', onclick: () => { store.update('progress', (p) => { p.level = p.placement.suggested; }); state.notify(); location.hash = '#/dashboard'; } },
        { label: 'Đến lộ trình học', onclick: () => { location.hash = '#/learning-path'; } },
      ],
    });
  }

  function resultNode(pl) {
    return h('div', { class: 'stack' },
      h('h3', {}, `Điểm bắt đầu đề xuất: ${pl.suggested}`),
      h('ul', { class: 'plain-list' }, ORDER.map((l) => h('li', {}, `${l}: ${pl.byLevel[l].right}/${pl.byLevel[l].total} câu đúng`))),
      h('p', { class: 'muted' }, 'Đây là đánh giá tham khảo từ 20 câu, không thay thế bài thi chuẩn hóa và không phải trình độ CEFR chính thức.'),
      pl.byLevel.B1.total && (pl.byLevel.B1.right / pl.byLevel.B1.total >= 0.65 || pl.suggested === 'A2') ? h('p', { class: 'muted' }, 'Nội dung từ B1 trở lên đang chờ bổ sung, nên EvoEnglish đề xuất bắt đầu từ A2.') : null);
  }

  function home() {
    const prev = store.get('progress').placement;
    root.replaceChildren(
      h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Kiểm tra đầu vào'), h('p', {}, '20 câu về ngữ pháp, từ vựng và đọc hiểu từ A0 đến B1. Mất khoảng 10 phút.')),
      h('section', { class: 'card stack' },
        h('p', {}, 'Dựa vào kết quả, EvoEnglish đề xuất một điểm bắt đầu trong lộ trình. Bạn vẫn có thể chọn cấp độ khác.'),
        h('p', { class: 'notice' }, 'Đây chỉ là đánh giá tham khảo, không thay thế bài thi chuẩn hóa và không cấp chứng nhận trình độ.'),
        prev ? h('div', {}, h('h2', {}, `Lần làm gần nhất (${formatDate(prev.at)})`), resultNode(prev)) : null,
        h('div', {}, h('button', { class: 'btn btn-primary', type: 'button', onclick: start }, prev ? 'Làm lại bài kiểm tra' : 'Bắt đầu kiểm tra'))));
    root.querySelector('h1')?.focus({ preventScroll: true });
  }
  home();
}
