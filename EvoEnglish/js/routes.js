/* phase: giai đoạn sẽ hoàn thiện khu vực này. mobile: hiện trên thanh điều hướng dưới. */
export const ROUTES = [
  { id: 'dashboard', label: 'Tổng quan', icon: 'dashboard', mobile: true, live: true, phase: 1, desc: 'Số liệu học tập thật, nhiệm vụ hôm nay và bài học gần nhất.' },
  { id: 'learning-path', label: 'Lộ trình học', short: 'Lộ trình', icon: 'path', mobile: true, phase: 2, desc: 'Lộ trình A0 đến C2 với mục tiêu, bài học và tiến độ.' },
  { id: 'vocabulary', label: 'Từ vựng', icon: 'vocabulary', mobile: true, phase: 2, live: false, desc: 'Flashcard, trắc nghiệm, chính tả và ôn tập ngắt quãng.' },
  { id: 'grammar', label: 'Ngữ pháp', icon: 'grammar', phase: 2, desc: 'Bài giảng tiếng Việt kèm ví dụ, lỗi thường gặp và bài tập.' },
  { id: 'listening', label: 'Luyện nghe', icon: 'listening', phase: 3, desc: 'Bài nghe có transcript và câu hỏi.' },
  { id: 'reading', label: 'Luyện đọc', icon: 'reading', phase: 3, desc: 'Bài đọc theo cấp độ, đánh dấu từ chưa biết.' },
  { id: 'writing', label: 'Luyện viết', icon: 'writing', phase: 3, desc: 'Viết, lưu bản nháp và tự đánh giá bằng checklist.' },
  { id: 'speaking', label: 'Luyện nói', icon: 'speaking', phase: 3, desc: 'Nghe câu mẫu và nhận diện giọng nói nếu trình duyệt hỗ trợ.' },
  { id: 'ielts', label: 'Luyện IELTS', icon: 'ielts', phase: 4, desc: 'Bài luyện mẫu cho Academic và General Training.' },
  { id: 'toeic', label: 'Luyện TOEIC', icon: 'toeic', phase: 4, desc: 'Bài luyện mẫu cho Listening & Reading, Part 1 đến 7.' },
  { id: 'review', label: 'Ôn tập', icon: 'review', mobile: true, phase: 2, desc: 'Từ đến hạn, câu sai và chủ đề ngữ pháp yếu.' },
  { id: 'statistics', label: 'Thống kê', icon: 'stats', phase: 2, desc: 'Thời gian học, chuỗi ngày và biểu đồ 7 / 30 ngày.' },
  { id: 'placement', label: 'Kiểm tra đầu vào', icon: 'path', hidden: true, phase: 3, desc: 'Bài kiểm tra đầu vào tham khảo.' },
  { id: 'settings', label: 'Cài đặt', icon: 'settings', phase: 5, desc: 'Giao diện, mục tiêu hằng ngày, sao lưu và xóa dữ liệu.' },
];
