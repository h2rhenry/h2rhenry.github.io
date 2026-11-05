/*
 * Bộ quiz dùng chung (từ vựng, ngữ pháp, luyện thi).
 * Câu hỏi: { id, kind:'mc'|'text', question, prompt, sub?, options?, answer, accepts?, explanation?, audio? }
 */
import { h } from './utils.js';
import { icon } from './icons.js';
import { speak, speechSupported } from './speech.js';

export const norm = (s) => String(s).toLowerCase().normalize('NFC').replace(/[’‘]/g, "'").replace(/[.,!?;:"“”]/g, '').replace(/\s+/g, ' ').trim();

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function isCorrect(q, given) {
  const g = norm(given);
  return [q.answer, ...(q.accepts || [])].some((a) => norm(a) === g);
}

export function runQuiz(root, opts) {
  const { title, questions, onAnswer, onFinish, actions = [] } = opts;
  let i = 0;
  const results = [];

  function audioBtn(q) {
    if (!q.audio || !speechSupported()) return null;
    return h('button', { class: 'btn', type: 'button', onclick: () => speak(q.audio) }, 'Nghe phát âm');
  }

  function showQuestion() {
    const q = questions[i];
    let answered = false;
    const feedback = h('div', { class: 'feedback', role: 'status', hidden: true });
    const inputZone = h('div', {});

    const finishAnswer = (given, correct) => {
      if (answered) return;
      answered = true;
      results.push({ q, given, correct });
      try { if (onAnswer) onAnswer(q, correct, given); } catch (e) { console.error(e); }
      const last = i === questions.length - 1;
      const next = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { i += 1; i < questions.length ? showQuestion() : finish(); } }, last ? 'Xem kết quả' : 'Câu tiếp theo');
      feedback.className = 'feedback ' + (correct ? 'ok' : 'bad');
      feedback.replaceChildren(
        h('p', { class: 'feedback-title' }, icon(correct ? 'check' : 'close'), correct ? 'Chính xác!' : 'Chưa đúng.'),
        correct ? null : h('p', {}, 'Đáp án đúng: ', h('b', {}, q.answer)),
        q.explanation ? h('p', { class: 'muted' }, q.explanation) : null,
        next);
      feedback.hidden = false;
      next.focus();
    };

    if (q.kind === 'mc') {
      const buttons = q.options.map((opt) => h('button', { class: 'option', type: 'button', onclick: () => {
        if (answered) return;
        buttons.forEach((b) => { b.disabled = true; });
        const ok = opt === q.answer;
        btnFor(opt).classList.add(ok ? 'is-correct' : 'is-wrong');
        btnFor(opt).prepend(ok ? '✓ ' : '✗ ');
        if (!ok) { const c = btnFor(q.answer); c.classList.add('is-correct'); c.prepend('✓ '); }
        finishAnswer(opt, ok);
      } }, opt));
      const btnFor = (opt) => buttons[q.options.indexOf(opt)];
      inputZone.append(h('div', { class: 'options', role: 'group', 'aria-label': 'Các đáp án' }, buttons));
    } else {
      const id = `ans-${i}`;
      const input = h('input', { id, class: 'answer-input', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-describedby': `${id}-err` });
      const err = h('p', { id: `${id}-err`, class: 'muted', role: 'alert' });
      const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Kiểm tra');
      inputZone.append(h('form', { onsubmit: (e) => {
        e.preventDefault();
        if (answered) return;
        if (!input.value.trim()) { err.textContent = 'Hãy nhập câu trả lời trước khi kiểm tra.'; return; }
        const ok = isCorrect(q, input.value);
        input.readOnly = true; submit.disabled = true;
        input.classList.add(ok ? 'is-correct' : 'is-wrong');
        finishAnswer(input.value.trim(), ok);
      } }, h('label', { for: id, class: 'muted' }, 'Câu trả lời của bạn'), h('div', { class: 'answer-row' }, input, submit), err));
      setTimeout(() => input.focus(), 0);
    }

    root.replaceChildren(
      h('div', { class: 'quiz-head' }, h('span', { class: 'muted' }, `${title} · Câu ${i + 1}/${questions.length}`),
        h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Tiến độ', 'aria-valuemin': '0', 'aria-valuemax': String(questions.length), 'aria-valuenow': String(i) }, h('span', { style: `width:${(i / questions.length) * 100}%` }))),
      h('div', { class: 'card stack' },
        h('p', { class: 'muted', style: 'margin:0' }, q.question),
        h('h2', { class: 'quiz-prompt', tabindex: '-1' }, q.prompt),
        q.sub ? h('p', { class: 'muted', style: 'margin:0' }, q.sub) : null,
        audioBtn(q), inputZone, feedback));
  }

  function finish() {
    const right = results.filter((r) => r.correct).length;
    const pct = Math.round((right / results.length) * 100);
    try { if (onFinish) onFinish({ results, right, total: results.length, pct }); } catch (e) { console.error(e); }
    const wrong = results.filter((r) => !r.correct);
    const extra = opts.summaryExtra ? opts.summaryExtra({ results, right, total: results.length, pct }) : null;
    root.replaceChildren(h('div', { class: 'card stack' },
      h('h2', { tabindex: '-1', id: 'quiz-result' }, `Hoàn thành: ${right}/${results.length} câu đúng (${pct}%)`),
      h('p', { class: 'muted' }, pct >= 80 ? 'Rất tốt. Lịch ôn đã được cập nhật theo kết quả của bạn.' : 'Những câu sai sẽ được đưa vào lịch ôn sớm hơn.'),
      extra,
      wrong.length ? h('div', {}, h('h3', {}, 'Cần xem lại'), h('ul', { class: 'plain-list' }, wrong.map((r) => h('li', {}, h('b', {}, r.q.answer), ' — ', r.q.prompt)))) : h('p', {}, 'Bạn trả lời đúng tất cả.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => runQuiz(root, { ...opts, questions: shuffle(questions) }) }, 'Làm lại bài này'),
        actions.map((a) => h('button', { class: 'btn', type: 'button', onclick: a.onclick }, a.label)))));
    root.querySelector('#quiz-result')?.focus();
  }

  showQuestion();
}
