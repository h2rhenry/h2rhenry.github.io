import * as store from './storage.js';
import * as state from './state.js';
import { h, formatDuration, formatNumber, formatDate } from './utils.js';
import { barChart } from './charts.js';
import { loadCurriculum } from './curriculum.js';
import { loadData } from './data.js';

export function averageScore(all) {
  const entries = all.filter((e) => !e.self); /* bài tự chấm không tính vào điểm trung bình */
  return entries.length ? Math.round(entries.reduce((s, e) => s + e.pct, 0) / entries.length) : null;
}

export function goalList({ stats, entries, lessonsDone, dailyGoalMin, days }) {
  const goalDays = Object.values(days).filter((d) => d.seconds >= dailyGoalMin * 60).length;
  return [
    ['Học 10 từ đầu tiên', stats.wordsLearned >= 10],
    ['Thành thạo 10 từ', stats.wordsMastered >= 10],
    ['Hoàn thành 1 bài ngữ pháp', lessonsDone >= 1],
    [`Đạt mục tiêu ${dailyGoalMin} phút trong một ngày`, goalDays >= 1],
    ['Chuỗi học 3 ngày liên tiếp', stats.longest >= 3],
    ['Chuỗi học 7 ngày liên tiếp', stats.longest >= 7],
    ['Đạt từ 90% trong một bài', entries.some((e) => e.pct >= 90)],
  ];
}

export async function render(root) {
  const cur = await loadCurriculum();
  const [reading, listening, writing, speaking] = await Promise.all([loadData('reading'), loadData('listening'), loadData('writing'), loadData('speaking')]);
  const stats = state.computeStats();
  const entries = store.get('quizHistory').entries;
  const progress = store.get('progress');
  const settings = state.getSettings();
  const days = store.get('activity').days;
  const hasData = stats.activeDays > 0 || stats.sessions > 0 || entries.length > 0;

  const vocabTotal = cur.vocab?.words.length || 0;
  const grammarTotal = cur.grammar?.lessons.length || 0;
  const grammarDone = (cur.grammar?.lessons || []).filter((l) => progress.lessons['grammar:' + l.id]?.status === 'completed').length;
  const lessonsDone = Object.entries(progress.lessons).filter(([k, p]) => k.startsWith('grammar:') && p.status === 'completed').length;
  const avg = averageScore(entries);

  const stat = (l, v, sub) => h('div', { class: 'stat' }, h('div', { class: 'stat-label' }, l), h('div', { class: 'stat-value' }, v), sub ? h('div', { class: 'stat-sub' }, sub) : null);
  const skill = (name, done, total, unit) => h('li', {},
    h('div', { class: 'row-between' }, h('span', {}, name), h('span', { class: 'muted' }, total ? `${done}/${total} ${unit}` : 'Chưa có nội dung')),
    total ? h('div', { class: 'progress', role: 'progressbar', 'aria-label': name, 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done) }, h('span', { style: `width:${(done / total) * 100}%` })) : null);

  let range = 7;
  const chartBox = h('div', {});
  const buttons = [7, 30].map((n) => h('button', { class: 'btn', type: 'button', 'aria-pressed': String(n === range), onclick: () => { range = n; buttons.forEach((b, i) => b.setAttribute('aria-pressed', String([7, 30][i] === range))); paint(); } }, `${n} ngày`));
  const paint = () => {
    const d = state.lastDays(range);
    chartBox.replaceChildren(d.some((x) => x.seconds > 0) ? barChart(d) : h('div', { class: 'empty' }, h('strong', {}, 'Chưa có hoạt động trong khoảng này'), 'Hoàn thành một phiên học để thấy biểu đồ.'));
  };

  const goals = goalList({ stats, entries, lessonsDone, dailyGoalMin: settings.dailyGoalMinutes || 15, days });

  root.append(...[
    h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Thống kê'), h('p', {}, 'Tất cả số liệu được tính từ dữ liệu lưu trên trình duyệt này. Chỉ thời gian trong phiên học thực tế mới được ghi nhận.')),
    hasData ? null : h('div', { class: 'card empty' }, h('strong', {}, 'Chưa có dữ liệu học tập'), 'Hãy bắt đầu với ', h('a', { href: '#/vocabulary' }, 'từ vựng'), ' hoặc ', h('a', { href: '#/grammar' }, 'ngữ pháp'), ' để thống kê xuất hiện.'),
    h('section', { class: 'grid-stats', 'aria-label': 'Số liệu tổng quan' },
      stat('Thời gian học', formatDuration(stats.totalSeconds)), stat('Số phiên học', formatNumber(stats.sessions)), stat('Ngày hoạt động', formatNumber(stats.activeDays)),
      stat('Chuỗi hiện tại', `${formatNumber(stats.streak)} ngày`, `Dài nhất: ${formatNumber(stats.longest)} ngày`),
      stat('Từ đã học', formatNumber(stats.wordsLearned), `Thành thạo: ${formatNumber(stats.wordsMastered)}`),
      stat('Điểm trung bình', avg === null ? '—' : `${avg}%`, entries.some((e) => !e.self) ? `${entries.filter((e) => !e.self).length} bài đã làm` : 'Chưa có bài nào')),
    h('section', { class: 'card stack', 'aria-labelledby': 'ch-h' }, h('h2', { id: 'ch-h' }, 'Hoạt động (phút mỗi ngày)'), h('div', { class: 'btn-row', role: 'group', 'aria-label': 'Khoảng thời gian' }, buttons), chartBox),
    h('div', { class: 'two-col' },
      h('section', { class: 'card stack', 'aria-labelledby': 'sk-h' }, h('h2', { id: 'sk-h' }, 'Tiến độ theo kỹ năng'), h('ul', { class: 'plain-list' },
        skill('Từ vựng (đã nhớ)', (cur.vocab?.words || []).filter((w) => (store.get('vocabulary').words[w.id]?.correctCount || 0) > 0).length, vocabTotal, 'từ'),
        skill('Ngữ pháp', grammarDone, grammarTotal, 'bài'), skill('Nghe', (listening?.lessons || []).filter((l) => progress.lessons['listening:' + l.id]?.status === 'completed').length, listening?.lessons.length || 0, 'bài'), skill('Đọc', (reading?.passages || []).filter((x) => progress.lessons['reading:' + x.id]?.status === 'completed').length, reading?.passages.length || 0, 'bài'), skill('Viết', (writing?.tasks || []).filter((t) => t.id !== 'free' && progress.lessons['writing:' + t.id]?.status === 'completed').length, (writing?.tasks || []).filter((t) => t.id !== 'free').length, 'đề'), skill('Nói', [...(speaking?.sentences || []), ...(speaking?.topics || [])].filter((x) => progress.lessons['speaking:' + x.id]?.status === 'completed').length, (speaking?.sentences.length || 0) + (speaking?.topics.length || 0), 'mục'))),
      h('section', { class: 'card stack', 'aria-labelledby': 'go-h' }, h('h2', { id: 'go-h' }, 'Mục tiêu'), h('ul', { class: 'task-list' }, goals.map(([t, ok]) =>
        h('li', { class: 'task' + (ok ? ' done' : '') }, h('span', { class: 'task-mark', 'aria-hidden': 'true' }, ok ? '✓' : ''), h('div', { class: 'task-title' }, t, h('span', { class: 'sr-only' }, ok ? ' (đã đạt)' : ' (chưa đạt)'), ok ? null : h('span', { class: 'muted' }, ' · chưa đạt'))))))),
    h('section', { class: 'card stack', 'aria-labelledby': 'hi-h' }, h('h2', { id: 'hi-h' }, 'Lịch sử bài làm gần đây'),
      entries.length ? h('ul', { class: 'plain-list recent' }, entries.slice(0, 10).map((e) => h('li', {}, h('span', {}, e.title), h('span', { class: 'muted' }, `${Math.round(e.pct)}% (${e.right}/${e.total})${e.self ? ' · tự chấm' : ''} · ${formatDate(e.at)}`))))
        : h('div', { class: 'empty' }, h('strong', {}, 'Chưa có bài nào'), 'Kết quả các bài bạn làm sẽ hiện ở đây.'))].filter(Boolean));
  paint();
}
