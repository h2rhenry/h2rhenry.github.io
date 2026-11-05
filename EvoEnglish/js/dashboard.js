import * as store from './storage.js';
import * as state from './state.js';
import { h, svgEl, formatDuration, formatNumber, weekdayLabel } from './utils.js';
import { icon } from './icons.js';
import { barChart } from './charts.js';
import { loadCurriculum, pathCompletion } from './curriculum.js';

function greeting() {
  const hour = new Date().getHours();
  return hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

function stat(label, value, sub, ico) {
  return h('div', { class: 'stat' },
    h('div', { class: 'stat-top' }, ico ? h('span', { class: 'stat-ico', 'aria-hidden': 'true' }, icon(ico)) : null, h('div', { class: 'stat-label' }, label)),
    h('div', { class: 'stat-value' }, value), sub ? h('div', { class: 'stat-sub' }, sub) : null);
}

function task({ title, detail, done, href, progress }) {
  const row = h('li', { class: 'task' + (done ? ' done' : '') },
    h('span', { class: 'task-mark', 'aria-hidden': 'true' }, done ? icon('check') : null),
    h('div', { style: 'flex:1;min-width:0' },
      h('div', { class: 'task-title' }, href && !done ? h('a', { href }, title) : title, done ? h('span', { class: 'sr-only' }, ' (đã xong)') : null),
      detail ? h('div', { class: 'muted' }, detail) : null,
      typeof progress === 'number' ? h('div', { class: 'progress', role: 'presentation' }, h('span', { style: `width:${Math.round(progress * 100)}%` })) : null));
  return row;
}

export async function render(root) {
  const cur = await loadCurriculum();
  const path = cur.path;
  const stats = state.computeStats();
  const progress = store.get('progress');
  const settings = state.getSettings();
  const week = state.lastDays(7);
  const levelInfo = path.levels.find((l) => l.id === progress.level);
  const isNew = !progress.level && stats.activeDays === 0;

  const { total: totalLessons, done: doneLessons } = pathCompletion(cur);

  const setLevel = (id) => { store.update('progress', (p) => { p.level = id; }); state.notify(); };

  /* Đầu trang */
  const hero = h('section', { class: 'card hero', 'aria-labelledby': 'dash-title' },
    h('div', {},
      h('h1', { id: 'dash-title', tabindex: '-1' }, isNew ? 'Chào mừng đến với EvoEnglish' : `${greeting()}!`),
      h('p', {}, isNew ? 'Chọn điểm xuất phát để bắt đầu. Tiến độ được lưu ngay trên trình duyệt này.'
        : progress.lastLesson ? `Bài gần nhất: ${progress.lastLesson.title}` : 'Hôm nay bạn muốn học gì?')),
    !isNew && progress.lastLesson?.href
      ? h('a', { class: 'btn', href: progress.lastLesson.href }, 'Tiếp tục bài gần nhất')
      : !isNew ? h('a', { class: 'btn', href: '#/learning-path' }, 'Xem lộ trình') : null);

  const sections = [hero];

  if (isNew) {
    sections.push(h('section', { class: 'card', 'aria-labelledby': 'pick-level' },
      h('h2', { id: 'pick-level' }, 'Bạn đang ở trình độ nào?'),
      h('p', { class: 'muted' }, 'Chọn tạm một mức, bạn có thể đổi sau. Hoặc làm bài kiểm tra đầu vào 20 câu; kết quả chỉ mang tính tham khảo, không thay thế bài thi chuẩn hóa.'),
      h('p', {}, h('a', { href: '#/placement' }, 'Làm bài kiểm tra đầu vào')),
      h('div', { class: 'level-grid' }, path.levels.map((l) =>
        h('button', { class: 'level-btn', type: 'button', onclick: () => setLevel(l.id) }, h('b', {}, `${l.id} · ${l.name}`), h('small', {}, l.goal))))));
  }

  /* Thẻ số liệu: tất cả tính từ localStorage */
  sections.push(h('section', { 'aria-label': 'Số liệu học tập' }, h('div', { class: 'grid-stats' },
    stat('Cấp độ hiện tại', levelInfo ? levelInfo.id : 'Chưa chọn', levelInfo?.name, 'layers'),
    stat('Ngày đã học', formatNumber(stats.activeDays), null, 'calendar'),
    stat('Chuỗi ngày', `${formatNumber(stats.streak)} ngày`, `Dài nhất: ${formatNumber(stats.longest)} ngày`, 'flame'),
    stat('Từ đã học', formatNumber(stats.wordsLearned), null, 'vocabulary'),
    stat('Từ đến hạn ôn', formatNumber(stats.dueCount), null, 'review'),
    stat('Hoàn thành lộ trình', totalLessons ? `${Math.round((doneLessons / totalLessons) * 100)}%` : '—', totalLessons ? `${doneLessons}/${totalLessons} bài` : 'Chưa có bài học nào', 'target'),
    stat('Thời gian học', formatDuration(stats.totalSeconds), `${formatNumber(stats.sessions)} phiên`, 'clock'))));

  /* Nhiệm vụ hôm nay */
  const goalMin = settings.dailyGoalMinutes || 15;
  const todayMin = stats.today.seconds / 60;
  const tasks = [
    task({ title: `Học ${goalMin} phút`, detail: `Hôm nay: ${formatDuration(stats.today.seconds)}`, done: todayMin >= goalMin, progress: Math.min(1, todayMin / goalMin) }),
    stats.dueCount > 0
      ? task({ title: `Ôn ${stats.dueCount} từ đến hạn`, href: '#/review', done: false })
      : task({ title: stats.wordsLearned > 0 ? 'Không có từ nào đến hạn ôn' : 'Chưa có từ để ôn', detail: stats.wordsLearned > 0 ? null : 'Học vài từ mới trước, lịch ôn sẽ tự xuất hiện.', done: stats.wordsLearned > 0 }),
    task({ title: 'Hoàn thành ít nhất một hoạt động học', done: stats.today.items > 0 }),
  ];
  const nextStep = stats.dueCount > 0 ? { text: `Ôn ${stats.dueCount} từ đến hạn trước khi học thêm.`, href: '#/review', cta: 'Đi tới ôn tập' }
    : progress.lastLesson?.href ? { text: `Tiếp tục: ${progress.lastLesson.title}`, href: progress.lastLesson.href, cta: 'Học tiếp' }
    : { text: levelInfo ? `Bắt đầu lộ trình ${levelInfo.id} · ${levelInfo.name}.` : 'Chọn trình độ để nhận gợi ý bài học.', href: '#/learning-path', cta: 'Mở lộ trình' };

  sections.push(h('div', { class: 'two-col' },
    h('section', { class: 'card', 'aria-labelledby': 'tasks-h' }, h('h2', { id: 'tasks-h' }, 'Nhiệm vụ hôm nay'), h('ul', { class: 'task-list' }, tasks)),
    h('section', { class: 'card', 'aria-labelledby': 'chart-h' }, h('h2', { id: 'chart-h' }, 'Hoạt động 7 ngày (phút)'),
      week.some((d) => d.seconds > 0) ? barChart(week)
        : h('div', { class: 'empty' }, h('strong', {}, 'Chưa có hoạt động nào'), 'Biểu đồ sẽ hiện khi bạn hoàn thành phiên học đầu tiên.'))));

  /* Gợi ý & bài gần đây */
  sections.push(h('div', { class: 'two-col' },
    h('section', { class: 'card', 'aria-labelledby': 'next-h' }, h('h2', { id: 'next-h' }, 'Gợi ý tiếp theo'), h('p', {}, nextStep.text), h('a', { class: 'btn btn-primary', href: nextStep.href }, nextStep.cta)),
    h('section', { class: 'card', 'aria-labelledby': 'recent-h' }, h('h2', { id: 'recent-h' }, 'Bài học gần đây'),
      progress.recent.length
        ? h('ul', { class: 'plain-list recent' }, progress.recent.slice(0, 5).map((r) =>
            h('li', {}, h('span', {}, r.title), h('span', { class: 'muted' }, typeof r.score === 'number' ? `${Math.round(r.score)}%` : (r.level || '')))))
        : h('div', { class: 'empty' }, h('strong', {}, 'Chưa có bài học nào'), 'Các bài bạn học sẽ xuất hiện ở đây.'))));

  root.append(...sections.map((s) => (s.tagName === 'DIV' ? s : s)));
  root.classList.add('stack');
}
