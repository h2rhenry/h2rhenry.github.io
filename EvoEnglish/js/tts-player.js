/* Trình phát bài nghe: tệp audio nếu có, nếu không thì giọng tổng hợp của trình duyệt. */
import { h } from './utils.js';
import { speechSupported, speakAsync, stopSpeech } from './speech.js';

export function buildPlayer({ lines, audio = null, heading = 'Nghe', goal = '', extraNote = '', idPrefix = 'pl' }) {
  let token = 0;
  const nowPlaying = h('p', { class: 'muted', role: 'status' });
  const rate = h('select', { id: idPrefix + '-rate', class: 'select' }, [['0.7', 'Chậm'], ['0.9', 'Vừa'], ['1.1', 'Nhanh']].map(([v, t]) => h('option', { value: v }, t)));
  rate.value = '0.9';
  const speakers = [...new Set(lines.map((x) => x.who))];
  const play = async (from, to) => {
    stopSpeech();
    const mine = ++token;
    for (let i = from; i <= to; i++) {
      if (mine !== token) return;
      nowPlaying.textContent = `Đang phát câu ${i + 1}/${lines.length}`;
      const ok = await speakAsync(lines[i].text, { rate: Number(rate.value), pitch: speakers.indexOf(lines[i].who) % 2 ? 1.25 : 0.95 });
      if (!ok && mine === token) { nowPlaying.textContent = 'Không phát được giọng đọc. Hãy bật transcript để đọc.'; return; }
    }
    if (mine === token) nowPlaying.textContent = 'Đã phát xong.';
  };
  const stop = () => { token += 1; stopSpeech(); nowPlaying.textContent = 'Đã dừng.'; };
  const supported = speechSupported();
  const node = h('section', { class: 'card stack', 'aria-labelledby': idPrefix + '-h' },
    h('h2', { id: idPrefix + '-h' }, heading),
    goal ? h('p', { class: 'muted' }, goal) : null,
    extraNote ? h('p', { class: 'muted' }, extraNote) : null,
    audio ? h('audio', { controls: true, src: audio }) : null,
    !audio && !supported ? h('p', { class: 'notice', role: 'alert' }, 'Trình duyệt này không có giọng đọc và bài này chưa có tệp audio, nên chưa nghe được. Bạn có thể bật transcript để luyện đọc hiểu.') : null,
    !audio && supported ? [
      h('p', { class: 'notice' }, 'Đây là giọng tổng hợp của trình duyệt, không tương đương bài nghe tự nhiên của người bản ngữ. Tốc độ và giọng có thể khác nhau tùy thiết bị.'),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => play(0, lines.length - 1) }, 'Nghe toàn bộ'), h('button', { class: 'btn', type: 'button', onclick: stop }, 'Dừng')),
      h('div', {}, h('label', { for: idPrefix + '-rate', class: 'muted' }, 'Tốc độ'), h('div', {}, rate)),
      h('div', {}, h('span', { class: 'muted' }, 'Nghe lại từng câu'), h('div', { class: 'btn-row' }, lines.map((_, i) => h('button', { class: 'btn', type: 'button', 'aria-label': `Nghe câu ${i + 1}`, onclick: () => play(i, i) }, String(i + 1))))),
      nowPlaying] : null);
  return { node, stop };
}
