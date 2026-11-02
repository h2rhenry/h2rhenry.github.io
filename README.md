# h2rhenry | Personal Profile

Trang hồ sơ cá nhân của **Hoàng Hải (h2rhenry)**, nhà phát triển trong cộng đồng Minecraft server. Trang giới thiệu kỹ năng, kinh nghiệm làm việc, các dự án Skript và hiển thị trạng thái hoạt động trực tiếp trên Discord.

Trang là web tĩnh, viết bằng HTML, CSS và JavaScript thuần, không cần bước build.

## Tính năng

- **Hai ngôn ngữ (Việt / Anh):** chuyển bằng một nút, lựa chọn được lưu lại cho lần sau. Lần đầu truy cập, trang dùng dịch vụ ipwho.is để chọn ngôn ngữ mặc định.
- **Trạng thái Discord trực tiếp:** hiển thị trạng thái online, trò chơi đang chơi và bài hát đang nghe trên Spotify (kèm thanh tiến độ), lấy qua API Lanyard.
- **Trình phát nhạc:** phát nhạc có sẵn trong thư mục `assets/music`, có tua, chỉnh âm lượng và ảnh bìa.
- **Bộ đếm lượt truy cập**, có dự phòng lưu cục bộ khi dịch vụ đếm không phản hồi.
- **Nền sáng / tối:** nút chuyển ở thanh điều hướng, mặc định theo cài đặt thiết bị và được lưu lại (`js/theme.js`).
- **Hiệu ứng động:** chữ gõ luân phiên chức danh (sửa trong `data-roles` ở `index.html`), nội dung hiện dần khi cuộn, thanh kỹ năng chạy, thẻ nâng nhẹ khi di chuột. Tất cả tắt khi thiết bị bật giảm chuyển động (`js/animations.js`).
- **PWA:** có `manifest.json` và service worker (`sw.js`), có thể cài lên màn hình chính và dùng lại bộ nhớ đệm.
- **Trang ẩn "Study Corner":** các trang học tập, mở bằng tổ hợp **Ctrl + Alt + Shift** trên máy tính, hoặc chạm nút chấm ẩn ở cuối trang trên điện thoại.
- **Máy tính Casio fx-580VN X:** lớp phủ mô phỏng máy tính, bật bằng **Ctrl + Alt + C** trong các trang Study Corner.
- **Truy cập tốt hơn:** liên kết bỏ qua tới nội dung chính, viền focus cho bàn phím, nhãn cho trình đọc màn hình, vùng chạm đủ lớn và tôn trọng chế độ giảm chuyển động.

## Các mục trên trang

| Mục | Nội dung |
| --- | --- |
| Giới thiệu & Kỹ năng | Giới thiệu bản thân và các thanh kỹ năng (Skript, tối ưu server, Java, cấu hình AntiCheat, Front-end) |
| Kinh nghiệm làm việc | CoreLinks Studio, TbmVN Minecraft Server, SwordLand |
| Dự án nổi bật | Better World Regen Script, Chat Manager Script |
| Sở thích & Cảm hứng | Minecraft, game FPS, học thuật |
| Projects & Resources (`projects/`) | Toàn bộ dự án, kèm các file tải về trong `projects/resource/` |

## Cấu trúc thư mục

```
.
├── index.html              Trang chủ
├── manifest.json           Cấu hình PWA
├── sw.js                   Service worker
├── css/style.css           Toàn bộ giao diện và biến màu
├── js/
│   ├── main.js             Logic chính (ngôn ngữ, Discord, nhạc, menu, trang ẩn)
│   └── casio-fx580vnx.js   Máy tính Casio mô phỏng
├── projects/
│   ├── index.html          Trang dự án
│   └── resource/           Các file .zip của dự án
├── study-corner/           Các trang học tập ẩn
└── assets/                 Nhạc, ảnh bìa, icon
```

## Chạy thử trên máy

Service worker và một số API cần chạy qua máy chủ HTTP, không mở trực tiếp bằng `file://`. Trong thư mục dự án, chạy một trong hai lệnh:

```bash
python3 -m http.server 8000
# hoặc
npx serve .
```

Sau đó mở `http://localhost:8000`.

## Tùy chỉnh nhanh

- **Màu sắc:** sửa các biến ở đầu `css/style.css` (`--bg-main`, `--bg-card`, `--accent-cyan`, `--text-main`...).
- **Tài khoản Discord:** đổi `DISCORD_USER_ID` trong `js/main.js`. Tài khoản cần tham gia máy chủ Discord của Lanyard để nhận được trạng thái.
- **Thêm trang ẩn:** thêm một object vào mảng `HIDDEN_PAGES` trong `js/main.js`.
- **Thêm bài hát:** bỏ file `.mp3` vào `assets/music/` và ảnh bìa vào `assets/music/covers/`, rồi khai báo trong phần trình phát nhạc của `js/main.js`.
- **Cập nhật cho người đã truy cập:** tăng `CACHE_VERSION` trong `sw.js` và số `?v=` của file CSS/JS trong các trang HTML.

## Công nghệ

HTML5, CSS3, JavaScript thuần, Font Awesome 6, Google Fonts (Chakra Petch, Exo 2), Lanyard API, service worker.

## Liên hệ

- GitHub: [github.com/h2rhenry](https://github.com/h2rhenry)
- Facebook: [facebook.com/h2r.henry](https://www.facebook.com/h2r.henry/)
- Discord: [discord.gg/6araPUDjE2](https://discord.gg/6araPUDjE2)
