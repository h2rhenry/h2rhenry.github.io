(function () {
  var K = 'theme', R = document.documentElement, s;
  try { s = localStorage.getItem(K); } catch (e) {}
  R.dataset.theme = s || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('theme-toggle'); if (!b) return;
    function sync() {
      var d = R.dataset.theme === 'dark', i = b.querySelector('i'), m = document.querySelector('meta[name=theme-color]');
      if (i) i.className = 'fas ' + (d ? 'fa-sun' : 'fa-moon');
      b.setAttribute('aria-label', d ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối');
      if (m) m.content = d ? '#110720' : '#f5f0ff';
    }
    b.addEventListener('click', function () {
      R.classList.add('theme-anim'); setTimeout(function () { R.classList.remove('theme-anim'); }, 350);
      R.dataset.theme = R.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(K, R.dataset.theme); } catch (e) {}
      sync();
    });
    sync();
  });
})();
