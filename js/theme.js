(function () {
  var K = 'theme', R = document.documentElement;
  function valid(v) { return v === 'light' || v === 'dark'; }
  function read() { try { var v = localStorage.getItem(K); return valid(v) ? v : null; } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(K, v); } catch (e) {} }

  // First visit: dark. Later visits: the last mode the visitor chose.
  R.dataset.theme = read() || 'dark';

  function sync() {
    var b = document.getElementById('theme-toggle'), m = document.querySelector('meta[name=theme-color]');
    var dark = R.dataset.theme === 'dark';
    if (b) {
      var i = b.querySelector('i');
      if (i) i.className = 'fas ' + (dark ? 'fa-sun' : 'fa-moon');
      b.setAttribute('aria-label', dark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối');
    }
    if (m) m.content = dark ? '#110720' : '#f5f0ff';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('theme-toggle');
    if (b) b.addEventListener('click', function () {
      R.classList.add('theme-anim');
      setTimeout(function () { R.classList.remove('theme-anim'); }, 350);
      R.dataset.theme = R.dataset.theme === 'dark' ? 'light' : 'dark';
      save(R.dataset.theme);
      sync();
    });
    sync();
  });

  // Keep every open tab / page in step with the latest choice.
  window.addEventListener('storage', function (e) {
    if (e.key === K && valid(e.newValue)) { R.dataset.theme = e.newValue; sync(); }
  });
})();
