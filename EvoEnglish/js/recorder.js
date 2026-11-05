/* Ghi âm để tự nghe lại. Bản ghi chỉ nằm tạm trong trang, không lưu và không tải lên. */
import { h } from './utils.js';
import { onLeave } from './cleanup.js';

export function createRecorder({ onMessage = () => {} } = {}) {
  let mr = null; let stream = null; let url = null;
  const player = h('audio', { controls: true, hidden: true });
  const btn = h('button', { class: 'btn', type: 'button', onclick: async () => {
    if (mr && mr.state === 'recording') { mr.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) { onMessage('Trình duyệt này không hỗ trợ ghi âm.'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop()); stream = null;
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType }));
        player.src = url; player.hidden = false; btn.textContent = 'Ghi âm lại';
        onMessage('Hãy nghe lại giọng của bạn rồi tự đánh giá.');
      };
      mr.start(); btn.textContent = 'Dừng ghi âm'; onMessage('Đang ghi âm…');
    } catch { onMessage('Trình duyệt chưa cho phép dùng micro. Hãy cấp quyền micro cho trang này rồi thử lại.'); }
  } }, 'Ghi âm để tự nghe lại');
  const cleanup = () => {
    try { if (mr && mr.state !== 'inactive') mr.stop(); } catch { /* bỏ qua */ }
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (url) URL.revokeObjectURL(url);
  };
  onLeave(cleanup);
  const node = h('div', { class: 'stack' }, h('div', {}, btn), player, h('p', { class: 'muted' }, 'Bản ghi âm chỉ nằm tạm trong trang này để bạn nghe lại. Nó không được lưu hay tải lên và sẽ mất khi bạn rời trang.'));
  return { node, cleanup };
}
