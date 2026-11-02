(function () {
  var D = document, R = D.documentElement;
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function typedRoles() {
    var w = D.querySelector('.role-typing'); if (!w) return;
    var el = w.querySelector('.typed'), roles = (w.dataset.roles || '').split('|').filter(Boolean);
    if (!el || !roles.length) return;
    el.textContent = roles[0];
    if (rm) return;
    var r = 0, n = roles[0].length, del = true;
    (function tick() {
      var t = roles[r], d = 90;
      if (del) { n--; d = 45; if (n <= 0) { del = false; r = (r + 1) % roles.length; t = roles[r]; } }
      else { n++; if (n >= t.length) { n = t.length; del = true; d = 2200; } }
      el.textContent = roles[r].slice(0, Math.max(n, 0));
      setTimeout(tick, d);
    })();
    setTimeout(function () {}, 0);
  }

  function reveal() {
    if (rm || !('IntersectionObserver' in window)) return;
    R.classList.add('js-anim');
    var els = D.querySelectorAll('section, .project-card, .hobby-box, .timeline-item, .skill-box');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) {
      var i = Array.prototype.indexOf.call(e.parentNode.children, e);
      e.classList.add('reveal');
      e.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
      io.observe(e);
    });
  }

  function init() { typedRoles(); reveal(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
