/*
 * Ôn tập ngắt quãng đơn giản, dựa trên SM-2.
 * quality: 0-2 = quên (ôn lại sau 10 phút), 3 = khó nhớ, 4 = đúng, 5 = nhớ rõ.
 */
import * as store from './storage.js';

export const MASTERED_DAYS = 21;
const DAY = 86400000;
const RETRY_MS = 10 * 60 * 1000;

export const newRecord = () => ({
  repetitions: 0, intervalDays: 0, easeFactor: 2.5,
  nextReviewAt: null, lastReviewedAt: null, correctCount: 0, wrongCount: 0,
});

export function schedule(prev, quality, now = Date.now()) {
  const r = { ...newRecord(), ...(prev || {}) };
  r.lastReviewedAt = now;
  if (quality < 3) {
    r.repetitions = 0;
    r.intervalDays = 0;
    r.wrongCount += 1;
    r.easeFactor = Math.max(1.3, r.easeFactor - 0.2);
    r.nextReviewAt = now + RETRY_MS;
    return r;
  }
  r.correctCount += 1;
  r.repetitions += 1;
  if (r.repetitions === 1) r.intervalDays = 1;
  else if (r.repetitions === 2) r.intervalDays = 3;
  else r.intervalDays = Math.max(r.intervalDays + 1, Math.round(r.intervalDays * r.easeFactor));
  r.easeFactor = Math.max(1.3, r.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  r.nextReviewAt = now + r.intervalDays * DAY;
  return r;
}

export function wordStatus(rec) {
  if (!rec || !rec.lastReviewedAt) return 'new';
  return (rec.intervalDays || 0) >= MASTERED_DAYS ? 'mastered' : 'learning';
}

export const isDue = (rec, now = Date.now()) => !!rec && typeof rec.nextReviewAt === 'number' && rec.nextReviewAt <= now;

export function reviewWord(id, quality) {
  store.update('vocabulary', (v) => { v.words[id] = schedule(v.words[id], quality); });
}
