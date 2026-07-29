// Đổi số này (v1 -> v2 -> v3...) mỗi khi bạn muốn CHẮC CHẮN buộc trình duyệt
// dọn sạch toàn bộ cache cũ. Bình thường không bắt buộc vì chiến lược bên
// dưới đã luôn ưu tiên lấy bản mới nhất từ mạng.
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'henry-portfolio-' + CACHE_VERSION;

// Cài đặt: kích hoạt bản Service Worker mới ngay lập tức, không chờ
// người dùng đóng hết các tab đang mở.
self.addEventListener('install', () => {
    self.skipWaiting();
});

// Kích hoạt: dọn sạch mọi cache thuộc phiên bản cũ, rồi giành quyền kiểm
// soát các tab đang mở ngay (không cần load lại trang mới áp dụng).
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Lấy dữ liệu: luôn thử tải bản mới nhất từ server trước (network-first).
// Chỉ dùng lại bản đã lưu trong cache khi không có mạng (offline).
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
