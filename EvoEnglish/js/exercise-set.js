/* Bộ câu hỏi hiển thị cùng lúc (Đọc, Nghe, IELTS, TOEIC). Hỗ trợ trắc nghiệm, True/False/Not Given và điền từ; lưu nháp để làm tiếp. */
import { h } from './utils.js';
import { icon } from './icons.js';
import { isCorrect } from './quiz.js';

const blank = (v) => v === undefined || v === null || String(v).trim() === '';

export function gradeSet(questions, answers) {
  const results = questions.map((q) => {
    const given = blank(answers[q.id]) ? null : answers[q.id];
    const correct = given !== null && (q.kind === 'text' ? isCorrect(q, given) : given === q.answer);
    return { q, given, correct };
  });
  const right = results.filter((r) => r.correct).length;
  return { results, right, total: results.length, pct: Math.round((right / results.length) * 100) };
}

export function mountQuestionSet(box, { questions, draft = {}, onDraft, onSubmit, onRetry, idPrefix = 'qs' }) {
  let answers = { ...draft };
  let result = null;
  const msg = h('p', { class: 'muted', role: 'alert' });

  function field(q, i, r, done) {
    const legend = h('legend', {}, `${i + 1}. ${q.q}`);
    const extra = q.extra ? q.extra() : null; /* tranh, âm thanh... đi kèm câu hỏi */
    let body;
    if (q.kind === 'text') {
      const id = `${idPrefix}-${q.id}`;
      const input = h('input', { id, class: 'answer-input' + (done ? (r.correct ? ' is-correct' : ' is-wrong') : ''), type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-label': `Câu ${i + 1}`, readonly: done, value: answers[q.id] || '',
        oninput: (e) => { answers[q.id] = e.target.value; msg.textContent = ''; if (onDraft) onDraft({ ...answers }); } });
      body = [input];
    } else {
      body = q.options.map((opt, j) => {
        const id = `${idPrefix}-${q.id}-${j}`;
        const chosen = answers[q.id] === opt;
        const input = h('input', { type: 'radio', name: `${idPrefix}-${q.id}`, id, value: opt, disabled: done, checked: chosen, onchange: () => { answers[q.id] = opt; msg.textContent = ''; if (onDraft) onDraft({ ...answers }); } });
        const cls = 'qopt' + (done && opt === q.answer ? ' is-correct' : '') + (done && chosen && opt !== q.answer ? ' is-wrong' : '');
        return h('label', { class: cls, for: id }, input, ' ', (done && opt === q.answer ? '✓ ' : done && chosen ? '✗ ' : '') + (q.label ? q.label(opt, j) : opt));
      });
    }
    const alt = q.kind === 'text' && q.accepts?.length ? ` (chấp nhận cả: ${q.accepts.join(', ')})` : '';
    return h('fieldset', { class: 'qset' }, legend, extra, ...body,
      r ? h('div', { class: 'feedback ' + (r.correct ? 'ok' : 'bad') },
        h('p', { class: 'feedback-title' }, icon(r.correct ? 'check' : 'close'), r.correct ? 'Đúng' : (r.given ? 'Sai' : 'Chưa trả lời')),
        r.correct ? null : h('p', {}, 'Đáp án đúng: ', h('b', {}, q.answer), alt),
        h('p', { class: 'muted' }, q.why)) : null);
  }

  function paint() {
    const done = !!result;
    const summary = done ? h('div', { class: 'card stack', tabindex: '-1', id: `${idPrefix}-result` },
      h('h3', {}, `Kết quả: ${result.right}/${result.total} câu đúng (${result.pct}%)`),
      h('p', { class: 'muted' }, 'Đây là kết quả luyện tập tham khảo. Hãy đọc lời giải bên dưới rồi làm lại nếu cần.'),
      h('div', {}, h('button', { class: 'btn', type: 'button', onclick: () => { answers = {}; result = null; if (onRetry) onRetry(); paint(); } }, 'Làm lại'))) : null;
    const fields = questions.flatMap((q, i) => [q.before ? q.before() : null, field(q, i, result?.results.find((x) => x.q.id === q.id), done)]).filter(Boolean); /* before: đoạn nghe/đọc dùng chung cho nhóm câu hỏi */
    const submit = done ? null : h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
      const left = questions.filter((q) => blank(answers[q.id])).length;
      if (left) { msg.textContent = `Còn ${left} câu chưa trả lời.`; return; }
      result = gradeSet(questions, answers);
      if (onSubmit) onSubmit(result);
      paint();
      box.querySelector(`#${idPrefix}-result`)?.focus();
    } }, 'Nộp bài và xem đáp án');
    box.replaceChildren(...[summary, ...fields, submit, msg].filter(Boolean));
  }
  paint();
}
