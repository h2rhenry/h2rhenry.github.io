/* EvoEnglish service worker: cho phép dùng ngoại tuyến sau lần tải đầu tiên.
 * Chiến lược: trả về bản đã lưu ngay, đồng thời cập nhật nền (stale-while-revalidate).
 * Khi phát hành bản mới, đổi VERSION bên dưới để xóa bộ nhớ cũ.
 * Chỉ xử lý tệp cùng nguồn; không gọi dịch vụ bên ngoài. */
const VERSION = 'evoenglish-1.2.0';
const PRECACHE = ["./", "index.html", "css/components.css", "css/layout.css", "css/main.css", "js/app.js", "js/charts.js", "js/cleanup.js", "js/curriculum.js", "js/dashboard.js", "js/data.js", "js/exam-ielts.js", "js/exam-toeic.js", "js/exam-ui.js", "js/exercise-set.js", "js/grammar.js", "js/icons.js", "js/learning-path.js", "js/listening.js", "js/placement.js", "js/quiz.js", "js/reading.js", "js/recorder.js", "js/results.js", "js/review.js", "js/router.js", "js/routes.js", "js/settings.js", "js/spaced-repetition.js", "js/speaking.js", "js/speech.js", "js/state.js", "js/statistics.js", "js/storage.js", "js/text-tools.js", "js/toeic-scenes.js", "js/tts-player.js", "js/utils.js", "js/version.js", "js/vocabulary.js", "js/writing.js", "data/grammar.json", "data/ielts.json", "data/listening.json", "data/path.json", "data/placement.json", "data/reading.json", "data/speaking.json", "data/toeic.json", "data/vocabulary.json", "data/writing.json"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('evoenglish-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    const refresh = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { event.waitUntil(refresh); return hit; }
    return (await refresh) || new Response('Bạn đang ngoại tuyến và tệp này chưa được lưu.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
