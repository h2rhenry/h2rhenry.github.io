/* Hàng đợi dọn dẹp khi rời trang (lưu bản nháp, dừng micro, hủy bộ đếm giờ...). */
const fns = [];
export const onLeave = (fn) => { fns.push(fn); };
export function runLeave() {
  while (fns.length) { try { fns.pop()(); } catch (e) { console.error(e); } }
}
