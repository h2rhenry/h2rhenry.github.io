import * as store from './storage.js';
import * as state from './state.js';
import { h, dateKey, formatNumber, formatDate } from './utils.js';
import { APP_VERSION } from './version.js';

const MAX_FILE = 5 * 1024 * 1024;
const GROUP_INFO = {
  progress: ['Tiến độ bài học', (g) => `${Object.keys(g.lessons).length} bài đã bắt đầu hoặc hoàn thành, cấp độ hiện tại và kết quả kiểm tra đầu vào`],
  vocabulary: ['Từ vựng và lịch ôn', (g) => `${Object.keys(g.words).length} từ có lịch ôn tập, ${Object.keys(g.custom || {}).length} từ bạn tự thêm`],
  review: ['Ôn tập', (g) => `${Object.keys(g.wrongQuestions).length} câu trả lời sai, ${Object.keys(g.favorites).length} mục yêu thích, ${Object.keys(g.weakGrammar).length} chủ đề yếu`],
  quizHistory: ['Lịch sử bài làm', (g) => `${g.entries.length} kết quả bài làm (kể cả IELTS và TOEIC)`],
  writingDrafts: ['Bản nháp bài viết', (g) => `${g.drafts.length} bản nháp và bài viết đã lưu`],
  activity: ['Hoạt động và thống kê', (g) => `${Object.keys(g.days).length} ngày hoạt động, ${g.sessions} phiên học, thời gian học đã ghi nhận`],
};

export function describeData() {
  return store.LEARNING_GROUPS.map((g) => ({ group: g, title: GROUP_INFO[g][0], detail: GROUP_INFO[g][1](store.get(g)) }));
}

export function downloadBackup() {
  const backup = store.exportAll();
  const check = store.validateBackup(backup);
  if (!check.ok) return { ok: false, error: check.error };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `evoenglish-backup-${dateKey()}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { ok: true, name: a.getAttribute('download') };
}

export async function render(root) {
  const s = state.getSettings();
  const status = h('p', { class: 'muted', role: 'status' });
  const say = (t) => { status.textContent = t; };

  /* ----- thành phần nhỏ ----- */
  const radios = (name, legend, options, current, onPick, hint) => h('fieldset', { class: 'qset' }, h('legend', {}, legend), hint ? h('p', { class: 'muted', style: 'margin:0' }, hint) : null,
    options.map(([v, label]) => h('label', { class: 'qopt', for: `${name}-${v}` }, h('input', { type: 'radio', name, id: `${name}-${v}`, value: v, checked: current === v, onchange: () => onPick(v) }), ' ', label)));
  const check = (id, label, hint, checked, onPick) => h('div', { class: 'stack' }, h('label', { class: 'qopt', for: id }, h('input', { type: 'checkbox', id, checked, onchange: (e) => onPick(e.target.checked) }), ' ', label), hint ? h('p', { class: 'muted', style: 'margin:0' }, hint) : null);

  /* ----- Giao diện ----- */
  const appearance = h('section', { class: 'card stack', 'aria-labelledby': 'st-ap' }, h('h2', { id: 'st-ap' }, 'Giao diện'),
    radios('theme', 'Chế độ màu', [['system', 'Theo hệ thống'], ['light', 'Sáng'], ['dark', 'Tối']], s.theme, (v) => { state.setSetting('theme', v); say('Đã áp dụng chế độ màu.'); }),
    radios('fsize', 'Cỡ chữ', [['sm', 'Nhỏ'], ['md', 'Vừa'], ['lg', 'Lớn']], s.fontSize, (v) => { state.setSetting('fontSize', v); say('Đã áp dụng cỡ chữ.'); }),
    check('anim', 'Bật hiệu ứng chuyển động', 'Tắt để giảm chuyển động. Nếu hệ điều hành của bạn bật "giảm chuyển động" thì hiệu ứng luôn được tắt.', s.animations !== false, (v) => { state.setSetting('animations', v); say(v ? 'Đã bật hiệu ứng.' : 'Đã tắt hiệu ứng.'); }),
    h('p', { class: 'muted' }, 'Ngôn ngữ giao diện: tiếng Việt.'));

  /* ----- Học tập ----- */
  const goalErr = h('p', { class: 'muted', role: 'alert' });
  const goal = h('input', { id: 'goal', class: 'answer-input', type: 'number', min: '5', max: '240', step: '5', value: String(s.dailyGoalMinutes || 15), 'aria-describedby': 'goal-hint', onchange: (e) => {
    const n = Number(e.target.value);
    if (!Number.isInteger(n) || n < 5 || n > 240) { goalErr.textContent = 'Hãy nhập số nguyên từ 5 đến 240 phút.'; e.target.value = String(state.getSettings().dailyGoalMinutes || 15); return; }
    goalErr.textContent = ''; state.setSetting('dailyGoalMinutes', n); say(`Đã đặt mục tiêu ${n} phút mỗi ngày.`);
  } });
  const learning = h('section', { class: 'card stack', 'aria-labelledby': 'st-ln' }, h('h2', { id: 'st-ln' }, 'Học tập'),
    h('div', {}, h('label', { for: 'goal', class: 'muted' }, 'Mục tiêu học mỗi ngày (phút)'), h('div', {}, goal), h('p', { id: 'goal-hint', class: 'muted', style: 'margin:4px 0 0' }, 'Dùng cho nhiệm vụ trên trang Tổng quan.'), goalErr),
    check('apron', 'Tự động phát âm từ trong Flashcards', 'Cần trình duyệt có giọng đọc. Giọng đọc là giọng tổng hợp.', !!s.autoPronounce, (v) => { state.setSetting('autoPronounce', v); say(v ? 'Đã bật tự phát âm.' : 'Đã tắt tự phát âm.'); }),
    check('spcons', 'Cho phép dùng nhận diện giọng nói trong Luyện nói', 'Tùy trình duyệt (ví dụ Chrome), âm thanh có thể được gửi đến dịch vụ của nhà phát triển trình duyệt. EvoEnglish không nhận hay lưu âm thanh.', !!s.speechConsent, (v) => { state.setSetting('speechConsent', v); say(v ? 'Đã cho phép nhận diện giọng nói.' : 'Đã thu hồi quyền nhận diện giọng nói.'); }));

  /* ----- Dữ liệu trên thiết bị ----- */
  const usage = h('span', {});
  const paintUsage = () => { usage.textContent = `${(store.usageBytes() / 1024).toFixed(1)} KB`; };
  paintUsage();
  const storageSection = h('section', { class: 'card stack', 'aria-labelledby': 'st-da' }, h('h2', { id: 'st-da' }, 'Dữ liệu trên thiết bị này'),
    h('p', {}, 'Mọi tiến độ, bản nháp và cài đặt được lưu ngay trên trình duyệt này (localStorage). EvoEnglish không có máy chủ, không gửi dữ liệu học tập đi đâu và không dùng analytics của bên thứ ba.'),
    h('p', { class: 'notice' }, 'Dữ liệu không tự đồng bộ giữa điện thoại và máy tính. Dữ liệu có thể mất nếu bạn xóa dữ liệu trình duyệt, đổi trình duyệt hoặc dùng chế độ riêng tư. Hãy sao lưu định kỳ.'),
    store.isPersistent() ? h('p', {}, 'Trạng thái: đang lưu được vào trình duyệt.') : h('p', { class: 'notice', role: 'alert' }, 'Trạng thái: trình duyệt không cho lưu dữ liệu (có thể đang ở chế độ riêng tư). Tiến độ chỉ tồn tại trong phiên này.'),
    h('p', {}, 'Dung lượng đang dùng (ước tính): ', usage));

  /* ----- Sao lưu và nhập ----- */
  const importBox = h('div', { class: 'stack' });
  const fileInput = h('input', { id: 'imp-file', type: 'file', accept: '.json,application/json', onchange: async (e) => {
    const file = e.target.files[0];
    importBox.replaceChildren();
    if (!file) return;
    if (file.size > MAX_FILE) { say('Tệp quá lớn (tối đa 5 MB). Đây có thể không phải tệp sao lưu của EvoEnglish.'); e.target.value = ''; return; }
    let obj;
    try { obj = JSON.parse(await file.text()); } catch { say('Không đọc được tệp: nội dung không phải JSON hợp lệ.'); e.target.value = ''; return; }
    const v = store.validateBackup(obj);
    if (!v.ok) { say('Tệp bị từ chối: ' + v.error); e.target.value = ''; return; }
    showImportPreview(file, obj, v.summary);
  } });
  function showImportPreview(file, obj, sum) {
    let mode = 'merge';
    const title = h('h3', { tabindex: '-1' }, 'Xác nhận nhập dữ liệu');
    const apply = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
      const r = mode === 'merge' ? store.mergeAll(obj) : store.importAll(obj);
      if (!r.ok) { say(r.error); return; }
      state.applySettings(); state.notify(); importBox.replaceChildren(); fileInput.value = ''; paintUsage(); paintGroups();
      say(mode === 'merge' ? 'Đã hợp nhất bản sao lưu với dữ liệu hiện tại.' : 'Đã thay thế dữ liệu bằng bản sao lưu.');
    } }, 'Nhập dữ liệu');
    importBox.replaceChildren(h('div', { class: 'notice stack', role: 'group', 'aria-labelledby': 'imp-t' },
      h('div', { id: 'imp-t' }, title),
      h('p', {}, `Tệp: ${file.name}`),
      h('ul', { class: 'bullets' }, h('li', {}, `Tạo lúc: ${sum.exportedAt ? formatDate(Date.parse(sum.exportedAt)) : 'không rõ'}`), h('li', {}, `${formatNumber(sum.words)} từ có lịch ôn`), h('li', {}, `${formatNumber(sum.activeDays)} ngày hoạt động`), h('li', {}, `${formatNumber(sum.drafts)} bản nháp bài viết`)),
      radios('impmode', 'Cách nhập', [['merge', 'Hợp nhất với dữ liệu hiện tại (giữ bản mới hơn khi trùng)'], ['replace', 'Thay thế: ghi đè các nhóm dữ liệu có trong tệp, kể cả cài đặt']], 'merge', (v) => { mode = v; }),
      h('p', { class: 'muted' }, 'Nên tải bản sao lưu dữ liệu hiện tại trước khi nhập. Nếu nhập thất bại, dữ liệu hiện tại được giữ nguyên.'),
      h('div', { class: 'btn-row' }, apply, h('button', { class: 'btn', type: 'button', onclick: () => { importBox.replaceChildren(); fileInput.value = ''; say('Đã hủy nhập dữ liệu.'); } }, 'Hủy'))));
    title.focus();
  }
  const backup = h('section', { class: 'card stack', 'aria-labelledby': 'st-bk' }, h('h2', { id: 'st-bk' }, 'Sao lưu và khôi phục'),
    h('p', { class: 'muted' }, 'Tệp sao lưu là JSON, chứa tiến độ và cài đặt của bạn, không chứa mật khẩu hay thông tin đăng nhập. Hãy sao lưu trước khi đổi trình duyệt hoặc thiết bị.'),
    h('div', {}, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { const r = downloadBackup(); say(r.ok ? `Đã tạo tệp ${r.name}. Hãy lưu tệp ở nơi an toàn.` : 'Không tạo được bản sao lưu: ' + r.error); } }, 'Tải bản sao lưu (.json)')),
    h('div', {}, h('label', { for: 'imp-file', class: 'muted' }, 'Chọn tệp sao lưu để nhập'), h('div', {}, fileInput)), importBox);

  /* ----- Xóa dữ liệu ----- */
  const panel = h('div', { class: 'stack' });
  const groupList = h('ul', { class: 'plain-list' });
  function closePanel() { panel.replaceChildren(); }
  function askConfirm({ title, lines, confirmLabel, run }) {
    const head = h('h3', { id: 'cf-t', tabindex: '-1' }, title);
    const ok = h('input', { type: 'checkbox', id: 'cf-ok', onchange: (e) => { go.disabled = !e.target.checked; } });
    const go = h('button', { class: 'btn btn-danger', type: 'button', disabled: true, onclick: () => { run(); closePanel(); paintGroups(); paintUsage(); } }, confirmLabel);
    panel.replaceChildren(h('div', { class: 'notice stack', role: 'alertdialog', 'aria-labelledby': 'cf-t' }, head,
      h('p', {}, 'Dữ liệu sau sẽ bị xóa vĩnh viễn khỏi trình duyệt này:'), h('ul', { class: 'bullets' }, lines.map((l) => h('li', {}, l))),
      h('p', {}, h('b', {}, 'Nên sao lưu trước. '), 'Sau khi xóa không thể khôi phục nếu bạn chưa có tệp sao lưu.'),
      h('div', {}, h('button', { class: 'btn', type: 'button', onclick: () => { const r = downloadBackup(); say(r.ok ? `Đã tạo ${r.name}. Bạn có thể tiếp tục xóa.` : r.error); } }, 'Tải bản sao lưu trước')),
      h('label', { class: 'qopt', for: 'cf-ok' }, ok, ' Tôi hiểu dữ liệu sẽ bị xóa vĩnh viễn.'),
      h('div', { class: 'btn-row' }, go, h('button', { class: 'btn', type: 'button', onclick: () => { closePanel(); say('Đã hủy, không có dữ liệu nào bị xóa.'); } }, 'Hủy'))));
    head.focus();
  }
  function paintGroups() {
    const info = describeData();
    groupList.replaceChildren(...info.map((x) => h('li', { class: 'word-row' },
      h('div', { class: 'word-main' }, h('b', {}, x.title), h('div', { class: 'muted' }, x.detail)),
      h('div', { class: 'word-side' }, h('button', { class: 'btn', type: 'button', 'aria-label': `Xóa dữ liệu: ${x.title}`, onclick: () => askConfirm({
        title: `Xóa dữ liệu "${x.title}"?`, lines: [`${x.title}: ${x.detail}`], confirmLabel: 'Xóa nhóm dữ liệu này',
        run: () => { store.resetGroup(x.group); state.notify(); say(`Đã xóa dữ liệu "${x.title}".`); } }) }, 'Xóa')))));
    corrupt.replaceChildren(...(store.listCorrupt().length ? [h('p', {}, `Có ${store.listCorrupt().length} bản sao dữ liệu bị hỏng được giữ lại để cứu hộ.`), h('button', { class: 'btn', type: 'button', onclick: () => { store.clearCorrupt(); paintGroups(); paintUsage(); say('Đã xóa các bản sao dữ liệu hỏng.'); } }, 'Xóa các bản sao dữ liệu hỏng')] : []));
  }
  const corrupt = h('div', { class: 'stack' });
  const danger = h('section', { class: 'card stack', 'aria-labelledby': 'st-dl' }, h('h2', { id: 'st-dl' }, 'Xóa dữ liệu'),
    h('p', { class: 'muted' }, 'Mỗi thao tác xóa đều cần bạn xác nhận. Hãy sao lưu trước.'),
    groupList, panel, corrupt,
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn btn-danger', type: 'button', onclick: () => askConfirm({
        title: 'Xóa toàn bộ dữ liệu học tập?', lines: describeData().map((x) => `${x.title}: ${x.detail}`).concat(['Cài đặt giao diện được giữ nguyên.']), confirmLabel: 'Xóa toàn bộ dữ liệu học tập',
        run: () => { store.LEARNING_GROUPS.forEach((g) => store.resetGroup(g)); state.notify(); say('Đã xóa toàn bộ dữ liệu học tập.'); } }) }, 'Xóa toàn bộ dữ liệu học tập'),
      h('button', { class: 'btn', type: 'button', onclick: () => { store.resetGroup('settings'); state.applySettings(); state.notify(); root.replaceChildren(); render(root); } }, 'Đặt lại cài đặt về mặc định')));
  paintGroups();

  /* ----- Thông tin ----- */
  const sw = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
  const about = h('section', { class: 'card stack', 'aria-labelledby': 'st-ab' }, h('h2', { id: 'st-ab' }, 'Thông tin'),
    h('ul', { class: 'bullets' },
      h('li', {}, `Phiên bản ứng dụng: ${APP_VERSION}`), h('li', {}, `Phiên bản cấu trúc dữ liệu: ${store.SCHEMA_VERSION}`),
      h('li', {}, sw ? 'Chế độ ngoại tuyến: đã bật (các tệp đã tải được lưu trong trình duyệt).' : 'Chế độ ngoại tuyến: chưa bật. Sau lần tải đầu tiên qua HTTPS, trình duyệt sẽ lưu tệp để dùng khi mất mạng.')),
    h('p', { class: 'muted' }, 'EvoEnglish là website tĩnh, mã nguồn công khai trên GitHub. Website không chứa bí mật nào. Điểm trong ứng dụng chỉ là kết quả luyện tập tham khảo, không phải chứng nhận trình độ CEFR, IELTS hay TOEIC.'));

  root.append(h('div', { class: 'page-head' }, h('h1', { tabindex: '-1' }, 'Cài đặt'), h('p', {}, 'Các thay đổi được lưu và áp dụng ngay.')), appearance, learning, storageSection, backup, danger, about, h('div', { class: 'status-bar' }, status));
}
