# EvoEnglish

Website học tiếng Anh **tĩnh**: HTML + CSS + JavaScript thuần, không backend, không tài khoản, không API key. Tiến độ và cài đặt được lưu ngay trên trình duyệt của bạn bằng `localStorage`. Chạy được trên GitHub Pages, kể cả khi nằm trong thư mục con như `/EvoEnglish/`, và dùng được ngoại tuyến sau lần tải đầu tiên.

## Tính năng

| Khu vực | Nội dung |
|---|---|
| Tổng quan | Số liệu thật từ dữ liệu đã lưu: chuỗi ngày, từ đến hạn ôn, thời gian học, nhiệm vụ hôm nay, biểu đồ 7 ngày, nút tiếp tục bài gần nhất |
| Lộ trình học | A0 đến C2 theo khung CEFR tham khảo. A0–A2 có bài học và bài kiểm tra cuối chương; B1–C2 ghi rõ "đang chờ bổ sung" |
| Từ vựng | 1.469 từ A0–C1 (113 từ nền tảng và 1.356 từ IELTS/TOEIC theo 10 chủ đề), 7 chế độ học, ôn tập ngắt quãng (SM-2 đơn giản), thêm từ từ bài đọc |
| Ngữ pháp | 13 bài (A0–A2): giải thích tiếng Việt, công thức, ví dụ, lỗi thường gặp, 91 câu bài tập |
| Nghe / Đọc | 5 bài nghe, 6 bài đọc, có transcript, từ vựng, đánh dấu từ chưa biết, lưu nháp để làm tiếp |
| Viết | 7 đề + viết tự do, lưu nháp, đếm từ, bộ đếm giờ, bài mẫu, checklist, tự đánh giá, gợi ý kiểm tra theo quy tắc (không phải AI) |
| Nói | 12 câu mẫu + 6 chủ đề, nghe mẫu, nhận diện giọng nói (nếu trình duyệt hỗ trợ), ghi âm tự nghe lại, tự đánh giá |
| IELTS | Academic và General Training tách riêng: Listening, Reading, Writing Task 1 và 2, Speaking Part 1–3 |
| TOEIC | Listening & Reading Part 1–7 (50 câu), tranh Part 1 tự vẽ bằng SVG |
| Ôn tập, Thống kê | Từ đến hạn, câu sai, ngữ pháp yếu, yêu thích; biểu đồ 7/30 ngày, tiến độ theo kỹ năng, mục tiêu |
| Cài đặt | Sáng/Tối, cỡ chữ, hiệu ứng, mục tiêu mỗi ngày, sao lưu, nhập (thay thế hoặc hợp nhất), xóa dữ liệu có xác nhận |

Kiểm tra đầu vào (20 câu) có tại `#/placement`, truy cập từ Tổng quan hoặc Lộ trình học.

## Giao diện (v1.1.0)

Giao diện được tối ưu theo skill UI/UX Pro Max. Hệ thiết kế đầy đủ nằm ở `design-system/evoenglish/MASTER.md`.

- **Phong cách:** Soft-Clay học tập, bo góc 12–18px, đổ bóng đôi, nút bấm có độ nảy nhưng không làm xô lệch bố cục.
- **Màu:** indigo `#4F46E5` làm màu chính, xanh lá `#16A34A` cho tiến độ. Bản tối được chọn riêng, không suy ra từ bản sáng. Chữ thường đạt tối thiểu 4.5:1, viền ô nhập và ô chọn đạt tối thiểu 3:1 ở cả hai chế độ.
- **Phông chữ:** dùng phông hệ thống (ưu tiên `ui-rounded`) vì CSP chỉ cho nguồn cùng gốc và ứng dụng chạy ngoại tuyến. Không nạp Google Fonts.
- **Token:** màu, khoảng cách (nhịp 4/8), bo góc và thời gian chuyển động đều là biến CSS trong `css/main.css`.
- **Truy cập:** vùng chạm tối thiểu 44px, vòng focus 3px, tôn trọng `prefers-reduced-motion`, hỗ trợ `forced-colors`, không dùng emoji làm biểu tượng.
- **Thay đổi mã:** thêm 5 biểu tượng SVG trong `js/icons.js` và biểu tượng cho thẻ số liệu ở Tổng quan (`js/dashboard.js`). Phần còn lại là CSS.

## Chạy thử trên máy

Dự án dùng ES modules nên **phải phục vụ qua HTTP**, không mở `index.html` bằng `file://`:

```
python3 -m http.server 8000
```

Mở http://localhost:8000

## Đưa lên GitHub Pages (miễn phí)

1. Tạo repository tên `EvoEnglish` trên GitHub.
2. Tải toàn bộ mã nguồn lên sao cho `index.html` nằm **ngay ở gốc** repository (không nằm trong thư mục con). Nhớ tải cả tệp ẩn `.nojekyll`. Cách chắc chắn nhất là dùng git:
   ```
   git init && git add -A && git commit -m "EvoEnglish"
   git branch -M main
   git remote add origin https://github.com/<tên-của-bạn>/EvoEnglish.git
   git push -u origin main
   ```
3. Vào **Settings → Pages**.
4. Ở mục **Build and deployment**, chọn **Deploy from a branch**, branch `main`, thư mục `/ (root)`, rồi Save.
5. Chờ vài phút để GitHub Pages xuất bản.
6. Mở địa chỉ GitHub cung cấp, thường là `https://<tên-của-bạn>.github.io/EvoEnglish/`.
7. **Cập nhật website:** sửa tệp, commit và push. Trước khi phát hành bản mới, hãy đổi phiên bản ở **hai nơi**: `js/version.js` và `VERSION` trong `sw.js` (hai giá trị phải khớp, `npm test` sẽ kiểm tra). Nếu thêm tệp mới vào `css/`, `js/` hoặc `data/`, hãy thêm nó vào danh sách `PRECACHE` trong `sw.js`. Sau khi cập nhật, người dùng có thể cần tải lại trang hai lần để nhận bản mới (do chế độ ngoại tuyến luôn trả bản đã lưu trước).
8. **Sao lưu tiến độ trước khi đổi trình duyệt hoặc thiết bị:** vào **Cài đặt → Sao lưu và khôi phục → Tải bản sao lưu**, rồi nhập tệp đó ở trình duyệt mới.

Không cần mua domain hay hosting. **Không đưa mật khẩu, token GitHub, khóa riêng hay thông tin đăng nhập vào repository.** Repository công khai nghĩa là ai cũng xem và tải được mã nguồn; website tĩnh không có cơ chế giữ bí mật, nhưng EvoEnglish cũng không cần bí mật nào để hoạt động.

## Dữ liệu và quyền riêng tư

- Tiến độ, bản nháp và cài đặt chỉ nằm trên trình duyệt này. Không gửi lên máy chủ, không analytics, không theo dõi ẩn.
- `localStorage` **không tự đồng bộ** giữa điện thoại và máy tính. Dữ liệu mất nếu bạn xóa dữ liệu trình duyệt, đổi trình duyệt hoặc dùng chế độ riêng tư. Hãy sao lưu định kỳ.
- Nếu trình duyệt từ chối lưu hoặc bộ nhớ đầy, ứng dụng vẫn chạy (lưu tạm trong phiên) và hiện thông báo.
- Dữ liệu hỏng được giữ lại một bản sao để cứu hộ rồi thay bằng mặc định. Bạn có thể xóa các bản sao này trong Cài đặt.
- **Luyện nói:** nhận diện giọng nói là chức năng của trình duyệt. Tùy trình duyệt (ví dụ Chrome), âm thanh có thể được gửi đến dịch vụ của nhà phát triển trình duyệt. Vì vậy chức năng chỉ bật sau khi bạn đồng ý, và có thể thu hồi trong Cài đặt. Bản ghi âm tự nghe lại chỉ nằm tạm trong trang, không lưu và không tải lên.
- Chính sách bảo mật nội dung (CSP) trong `index.html` chỉ cho chạy script cùng nguồn và không gọi dịch vụ ngoài.

## Ngoại tuyến

Sau lần tải đầu tiên qua HTTPS (hoặc localhost), service worker (`sw.js`) lưu các tệp của ứng dụng để dùng khi mất mạng. Chức năng cần dịch vụ ngoài (nhận diện giọng nói của một số trình duyệt) vẫn cần mạng. Chế độ này không chạy với `file://`.

## Cấu trúc dự án

```
index.html        khung trang, CSP, script đặt giao diện sớm
sw.js             service worker (ngoại tuyến)
css/              main (màu, cỡ chữ), layout, components
js/               app, router, storage, state, và mỗi khu vực một tệp
data/             vocabulary, grammar, reading, listening, writing, speaking,
                  placement, path, ielts, toeic (JSON, tự soạn)
tests/            bộ kiểm thử Node (npm test)
assets/           audio/ images/ icons/ (hiện để trống)
```

## Thêm nội dung

- **Từ vựng:** thêm mục vào `data/vocabulary.json`. Ví dụ phải chứa đúng từ cần học (dùng cho chế độ điền chỗ trống) và nghĩa tiếng Việt không trùng với từ khác.
- **Bài nghe có audio thật:** đặt tệp (bạn có quyền sử dụng) vào `assets/audio/`, rồi trong `data/listening.json` đổi `"audio": null` thành đường dẫn tương đối, ví dụ `"audio": "assets/audio/a0-meeting.mp3"`.
- **Lộ trình:** `data/path.json` liệt kê bài học theo cấp độ; mỗi mục trỏ tới từ vựng, ngữ pháp, bài đọc hoặc bài nghe có thật.
- Sau khi sửa dữ liệu, chạy `npm test` để kiểm tra cấu trúc (đáp án nằm trong lựa chọn, đường dẫn lộ trình hợp lệ...).

## Kiểm thử

```
npm test        # cần Node.js 18 trở lên, không cần cài thêm gói nào
```

Bộ test kiểm tra: lớp lưu trữ (dữ liệu hỏng, ổ đầy, xuất/nhập/hợp nhất, giới hạn), thuật toán ôn tập, chấm điểm, tính nhất quán của toàn bộ nội dung, công cụ kiểm tra văn bản và so sánh giọng nói, và các điều kiện triển khai (danh sách tệp ngoại tuyến, hash CSP, đường dẫn tương đối).

Ngoài ra, trong quá trình phát triển, ứng dụng đã được chạy thử trên Chromium thật (không nằm trong `npm test`): mọi trang, các luồng làm bài, sao lưu/nhập/xóa dữ liệu, dữ liệu hỏng, ổ lưu đầy, triển khai trong thư mục con, ngoại tuyến thật (tắt hẳn máy chủ), rà soát truy cập tự động (nhãn, tiêu đề, độ tương phản sáng/tối, vùng chạm, focus bàn phím).

**Chưa được kiểm tra, bạn nên tự thử:** điện thoại và trình duyệt thật của bạn (mới thử bằng cửa sổ giả lập 360–420 px), micro thật với nhận diện giọng nói, giọng đọc trên thiết bị của bạn, và trình đọc màn hình (mới kiểm tra tên, nhãn và cấu trúc bằng công cụ tự động).

## Giới hạn đã biết

- Lượng nội dung còn nhỏ ở các phần khác: 13 bài ngữ pháp, 6 bài đọc, 5 bài nghe, và 1–2 bộ đề cho mỗi phần IELTS/TOEIC. Đủ để dùng thử và minh họa cấu trúc, chưa đủ để học hết các cấp độ. B1 đến C2 chưa có bài học.
- Toàn bộ nội dung do EvoEnglish tự soạn và chưa được giáo viên bên ngoài kiểm duyệt. Hãy đọc lại trước khi dùng cho người học thật.
- Chưa có tệp audio. Bài nghe dùng giọng tổng hợp của trình duyệt, không tương đương người bản ngữ.
- Gợi ý kiểm tra bài viết dựa trên quy tắc đơn giản, có thể bỏ sót lỗi hoặc báo nhầm. Không có AI chấm bài, không có AI luyện hội thoại.
- Câu sai trong IELTS và TOEIC chưa được đưa vào Trung tâm ôn tập (chỉ có lịch sử điểm).
- TOEIC Speaking & Writing chưa có nội dung.

## Tuyên bố

- Điểm trong ứng dụng chỉ là kết quả luyện tập tham khảo. Ứng dụng không cấp chứng nhận trình độ CEFR, IELTS hay TOEIC.
- EvoEnglish là sản phẩm độc lập, không liên kết với, không được bảo trợ hay chứng nhận bởi tổ chức thi IELTS hay ETS. TOEIC là thương hiệu của ETS. Đề luyện là đề tự soạn, không phải đề thi thật.
- Giấy phép: MIT (xem `LICENSE`). Bạn có thể đổi giấy phép cho phù hợp với dự án của mình.

## Từ vựng IELTS/TOEIC (v1.2.0)

Danh sách 1.412 từ gốc chỉ có từ tiếng Anh. Nghĩa tiếng Việt, phiên âm, từ loại, cấp độ và câu ví dụ do Claude soạn, nên cần người có chuyên môn rà soát trước khi dùng làm giáo trình. 55 từ trùng với bộ cũ được giữ nguyên bản cũ. Cụm "artificial intelligence" được gộp thành một mục. Bổ sung các loại từ `prep`, `conj`, `pron`, `det` trong `js/vocabulary.js`.
