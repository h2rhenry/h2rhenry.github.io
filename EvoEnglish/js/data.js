/* Tải tệp JSON trong thư mục data/ (có cache). Trả về null nếu lỗi. */
const cache = new Map();
export async function loadData(name) {
  if (cache.has(name)) return cache.get(name);
  try {
    const res = await fetch(`data/${name}.json`);
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    cache.set(name, json);
    return json;
  } catch (e) {
    console.warn(`Không tải được data/${name}.json`, e);
    return null;
  }
}
