import { h } from './utils.js';

let seq = 0;
let current = null;
export const currentRoute = () => current;

/** Hiển thị route theo location.hash. focus=false khi chỉ vẽ lại do dữ liệu đổi. */
export async function show({ routes, outlet, onRoute, onBefore, focus = true }) {
  if (focus && onBefore) onBefore();
  const id = location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
  const route = routes.find((r) => r.id === id) || routes[0];
  current = route;
  const token = ++seq;
  const box = h('div', { class: 'view' });
  try {
    await route.render(box, route);
  } catch (e) {
    console.error(e);
    box.replaceChildren(h('div', { class: 'card', role: 'alert' },
      h('h1', { tabindex: '-1' }, 'Không tải được trang này'),
      h('p', { class: 'muted' }, 'Có lỗi khi hiển thị nội dung. Dữ liệu học của bạn không bị ảnh hưởng.'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => show({ routes, outlet, onRoute, onBefore }) }, 'Thử lại')));
  }
  if (token !== seq) return;
  outlet.replaceChildren(box);
  if (onRoute) onRoute(route, focus);
  if (focus) (outlet.querySelector('h1') || outlet).focus({ preventScroll: true });
}

export function start(opts) {
  addEventListener('hashchange', () => show(opts));
  return show(opts);
}
