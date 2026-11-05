/* Đọc văn bản bằng giọng tổng hợp của trình duyệt (không tương đương người bản ngữ). */
export const speechSupported = () =>
  typeof globalThis.speechSynthesis !== 'undefined' && typeof globalThis.SpeechSynthesisUtterance !== 'undefined';

export function speak(text, lang = 'en-US', rate = 0.9) {
  if (!speechSupported()) return false;
  try {
    globalThis.speechSynthesis.cancel();
    const u = new globalThis.SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate;
    globalThis.speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

/** Đọc một đoạn và chờ đọc xong. Trả về false nếu không đọc được hoặc bị dừng. */
export function speakAsync(text, { lang = 'en-US', rate = 0.9, pitch = 1 } = {}) {
  return new Promise((resolve) => {
    if (!speechSupported()) return resolve(false);
    try {
      const u = new globalThis.SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = rate; u.pitch = pitch;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      globalThis.speechSynthesis.speak(u);
    } catch { resolve(false); }
  });
}
export const stopSpeech = () => { try { globalThis.speechSynthesis?.cancel(); } catch { /* bỏ qua */ } };
