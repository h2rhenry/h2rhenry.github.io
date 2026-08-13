/**
 * Casio FX-580VNX Emulator Overlay
 * Hotkey: Ctrl + Alt + C  (only on paths containing "study-corner")
 * Neon theme synced with site CSS variables
 */
(function () {
  'use strict';

  // Only activate on study-corner pages
  if (!/study-corner/i.test(location.pathname)) return;

  const ACCENT = '#00d2ff';
  const ACCENT2 = '#9b5de5';
  const BG = '#0a0b10';
  const CARD = '#121420';

  // ---------- State ----------
  let visible = false;
  let expr = '';
  let result = '0';
  let mode = 'COMP'; // COMP | EQN | MATRIX | COMPLEX | DERIV
  let shift = false;
  let alpha = false;
  let angleMode = 'DEG'; // DEG | RAD
  let memory = 0;
  let history = [];
  let complexForm = true; // a+bi

  // EQN state
  let eqnDegree = 2;
  let eqnCoeffs = [0, 0, 0, 0, 0]; // a4..a0
  let sysSize = 2;
  let sysMatrix = [];
  let sysRhs = [];

  // MATRIX state
  let matA = [[0, 0], [0, 0]];
  let matB = [[0, 0], [0, 0]];
  let matSize = 2;
  let matFocus = 'A';

  // ---------- Helpers ----------
  function toRad(x) {
    return angleMode === 'DEG' ? (x * Math.PI) / 180 : x;
  }
  function fromRad(x) {
    return angleMode === 'DEG' ? (x * 180) / Math.PI : x;
  }
  function factorial(n) {
    n = Math.floor(Math.abs(n));
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a || 1;
  }
  function fmt(n) {
    if (typeof n === 'object' && n !== null && 're' in n) {
      if (Number.isNaN(n.re) || Number.isNaN(n.im)) return 'Math ERROR';
      const re = fmt(n.re);
      const im = fmt(Math.abs(n.im));
      if (Math.abs(n.im) < 1e-12) return re;
      if (Math.abs(n.re) < 1e-12) return (n.im < 0 ? '-' : '') + im + 'i';
      return re + (n.im < 0 ? ' - ' : ' + ') + im + 'i';
    }
    if (Number.isNaN(n)) return 'Math ERROR';
    if (!isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';
    if (Math.abs(n) < 1e-12) return '0';
    if (Math.abs(n) >= 1e10 || (Math.abs(n) < 1e-6 && n !== 0)) {
      return n.toExponential(8).replace(/e\+?/, '×10^');
    }
    let s = Number(n.toPrecision(12)).toString();
    if (s.includes('e')) s = n.toExponential(8).replace(/e\+?/, '×10^');
    return s;
  }

  function isReal(a) {
    return a && typeof a === 'object' && Math.abs(a.im || 0) < 1e-12;
  }

  /** Xóa thông minh: nếu cuối biểu thức là hàm (sin(, cos(, …) thì xóa cả cụm */
  function smartDelete(s) {
    if (!s) return '';
    // Danh sách token hàm (ưu tiên dài trước để khớp asin trước sin)
    const fnTokens = [
      'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
      'asin(', 'acos(', 'atan(', 'arcsin(', 'arccos(', 'arctan(',
      'sqrt(', 'exp(', 'log(', 'ln(', 'abs(', 'fact(',
      'sin(', 'cos(', 'tan(', '10^(',
      '×10^', 'Ans', 'pi', 'π'
    ];
    for (const tok of fnTokens) {
      if (s.endsWith(tok)) return s.slice(0, -tok.length);
    }
    // Xóa cả cụm số (vd: 3.14) nếu muốn — tạm thời chỉ 1 ký tự cho số/toán tử
    return s.slice(0, -1);
  }

  // ---------- Complex arithmetic ----------
  const C = {
    of(re, im = 0) {
      // Không dùng `|| 0` — NaN/Infinity sẽ bị biến thành 0
      const r = (re === undefined || re === null || re === '') ? 0 : +re;
      const i = (im === undefined || im === null || im === '') ? 0 : +im;
      return { re: r, im: i };
    },
    add(a, b) { return C.of(a.re + b.re, a.im + b.im); },
    sub(a, b) { return C.of(a.re - b.re, a.im - b.im); },
    mul(a, b) {
      return C.of(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
    },
    div(a, b) {
      const d = b.re * b.re + b.im * b.im;
      if (d === 0) return C.of(Infinity, Infinity);
      return C.of((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
    },
    abs(a) { return Math.hypot(a.re, a.im); },
    arg(a) { return Math.atan2(a.im, a.re); },
    conj(a) { return C.of(a.re, -a.im); },
    exp(a) {
      const e = Math.exp(a.re);
      return C.of(e * Math.cos(a.im), e * Math.sin(a.im));
    },
    log(a) {
      return C.of(Math.log(C.abs(a)), C.arg(a));
    },
    pow(a, b) {
      if (a.im === 0 && b.im === 0 && a.re >= 0) return C.of(Math.pow(a.re, b.re));
      return C.exp(C.mul(b, C.log(a)));
    },
    sqrt(a) {
      const r = C.abs(a);
      const t = C.arg(a) / 2;
      return C.of(Math.sqrt(r) * Math.cos(t), Math.sqrt(r) * Math.sin(t));
    },
    sin(a) {
      return C.of(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im));
    },
    cos(a) {
      return C.of(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im));
    },
    tan(a) { return C.div(C.sin(a), C.cos(a)); }
  };

  // ---------- Expression evaluator (supports complex) ----------
  function tokenize(s) {
    const tokens = [];
    let i = 0;
    s = s.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi').replace(/√/g, 'sqrt');
    while (i < s.length) {
      if (/[0-9.]/.test(s[i])) {
        let n = '';
        while (i < s.length && /[0-9.]/.test(s[i])) n += s[i++];
        tokens.push({ type: 'num', val: parseFloat(n) });
      } else if (/[a-zA-Z_]/.test(s[i])) {
        let id = '';
        while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) id += s[i++];
        tokens.push({ type: 'id', val: id.toLowerCase() });
      } else if ('+-*/^()!,'.includes(s[i])) {
        tokens.push({ type: 'op', val: s[i++] });
      } else if (s[i] === 'i' || s.slice(i, i + 1) === 'i') {
        tokens.push({ type: 'id', val: 'i' });
        i++;
      } else {
        i++; // skip unknown
      }
    }
    return tokens;
  }

  function parseExpr(tokens) {
    let pos = 0;
    function peek() { return tokens[pos]; }
    function consume() { return tokens[pos++]; }

    function parsePrimary() {
      const t = peek();
      if (!t) throw new Error('Unexpected end');
      if (t.type === 'num') {
        consume();
        // check for trailing i  e.g. 3i
        if (peek() && peek().type === 'id' && peek().val === 'i') {
          consume();
          return C.of(0, t.val);
        }
        return C.of(t.val);
      }
      if (t.type === 'id') {
        consume();
        if (t.val === 'pi') return C.of(Math.PI);
        if (t.val === 'e') return C.of(Math.E);
        if (t.val === 'i') return C.of(0, 1);
        // function call
        if (peek() && peek().val === '(') {
          consume();
          const args = [];
          if (peek() && peek().val !== ')') {
            args.push(parseAdd());
            while (peek() && peek().val === ',') {
              consume();
              args.push(parseAdd());
            }
          }
          if (!peek() || peek().val !== ')') throw new Error('Missing )');
          consume();
          return callFn(t.val, args);
        }
        throw new Error('Unknown id: ' + t.val);
      }
      if (t.val === '(') {
        consume();
        const v = parseAdd();
        if (!peek() || peek().val !== ')') throw new Error('Missing )');
        consume();
        return v;
      }
      if (t.val === '-') {
        consume();
        return C.mul(C.of(-1), parsePrimary());
      }
      if (t.val === '+') {
        consume();
        return parsePrimary();
      }
      throw new Error('Unexpected: ' + (t.val || t.type));
    }

    function callFn(name, args) {
      const a = args[0] || C.of(0);
      switch (name) {
        case 'sin': return isReal(a) && angleMode === 'DEG' ? C.of(Math.sin(toRad(a.re))) : C.sin(a);
        case 'cos': return isReal(a) && angleMode === 'DEG' ? C.of(Math.cos(toRad(a.re))) : C.cos(a);
        case 'tan': return isReal(a) && angleMode === 'DEG' ? C.of(Math.tan(toRad(a.re))) : C.tan(a);
        case 'asin': case 'arcsin': case 'sin⁻¹': case 'sin-1': {
          if (!isReal(a)) return C.of(NaN);
          if (a.re < -1 || a.re > 1) return C.of(NaN); // domain
          return C.of(fromRad(Math.asin(a.re)));
        }
        case 'acos': case 'arccos': case 'cos⁻¹': case 'cos-1': {
          if (!isReal(a)) return C.of(NaN);
          if (a.re < -1 || a.re > 1) return C.of(NaN);
          return C.of(fromRad(Math.acos(a.re)));
        }
        case 'atan': case 'arctan': case 'tan⁻¹': case 'tan-1': {
          if (!isReal(a)) return C.of(NaN);
          return C.of(fromRad(Math.atan(a.re)));
        }
        case 'log': case 'log10': return a.im === 0 ? C.of(Math.log10(a.re)) : C.div(C.log(a), C.of(Math.LN10));
        case 'ln': case 'log_e': return C.log(a);
        case 'sqrt': case '√': return C.sqrt(a);
        case 'abs': return C.of(C.abs(a));
        case 'exp': return C.exp(a);
        case 'fact': case 'factorial': return C.of(factorial(a.re));
        case 're': return C.of(a.re);
        case 'im': return C.of(a.im);
        case 'conj': return C.conj(a);
        case 'arg': return C.of(fromRad(C.arg(a)));
        default: throw new Error('Unknown fn: ' + name);
      }
    }

    function parsePower() {
      let left = parsePrimary();
      while (peek() && (peek().val === '^' || (peek().type === 'id' && peek().val === 'pow'))) {
        if (peek().val === '^') consume();
        else { consume(); /* pow */ }
        const right = parsePrimary();
        left = C.pow(left, right);
      }
      // postfix !
      while (peek() && peek().val === '!') {
        consume();
        left = C.of(factorial(left.re));
      }
      return left;
    }

    function parseMul() {
      let left = parsePower();
      while (peek() && (peek().val === '*' || peek().val === '/' ||
        (peek().type === 'num') || (peek().type === 'id') || peek().val === '(')) {
        // implicit multiply
        if (peek().val === '*' || peek().val === '/') {
          const op = consume().val;
          const right = parsePower();
          left = op === '*' ? C.mul(left, right) : C.div(left, right);
        } else {
          left = C.mul(left, parsePower());
        }
      }
      return left;
    }

    function parseAdd() {
      let left = parseMul();
      while (peek() && (peek().val === '+' || peek().val === '-')) {
        const op = consume().val;
        const right = parseMul();
        left = op === '+' ? C.add(left, right) : C.sub(left, right);
      }
      return left;
    }

    const val = parseAdd();
    if (pos < tokens.length) throw new Error('Extra tokens');
    return val;
  }

  function evaluate(str) {
    try {
      if (!str.trim()) return C.of(0);
      // Chuẩn hóa ký hiệu Casio / Unicode → tên hàm parser hiểu được
      str = str
        .replace(/Ans/gi, '(' + (history.length ? history[history.length - 1] : 0) + ')')
        .replace(/×10\^/g, '*10^')
        .replace(/(\d)π/g, '$1*pi')
        .replace(/π(\d)/g, 'pi*$1')
        // sin⁻¹ / cos⁻¹ / tan⁻¹ (và dạng sin-1)
        .replace(/sin\s*⁻\s*¹/gi, 'asin')
        .replace(/cos\s*⁻\s*¹/gi, 'acos')
        .replace(/tan\s*⁻\s*¹/gi, 'atan')
        .replace(/sin\s*-\s*1/gi, 'asin')
        .replace(/cos\s*-\s*1/gi, 'acos')
        .replace(/tan\s*-\s*1/gi, 'atan')
        .replace(/arcsin/gi, 'asin')
        .replace(/arccos/gi, 'acos')
        .replace(/arctan/gi, 'atan');

      // Tự đóng ngoặc còn thiếu (vd: asin(0.5  → asin(0.5))
      let open = 0;
      for (const ch of str) {
        if (ch === '(') open++;
        else if (ch === ')') open--;
      }
      if (open > 0) str += ')'.repeat(open);

      const tokens = tokenize(str);
      return parseExpr(tokens);
    } catch (e) {
      return { error: e.message || 'Syntax ERROR' };
    }
  }

  // ---------- Polynomial solver (degree 1-4) ----------
  function solvePoly(coeffs) {
    // coeffs: [a_n, ..., a_0] highest degree first
    const c = coeffs.map(Number).filter((_, i, arr) => {
      // trim leading zeros
      return true;
    });
    while (c.length > 1 && Math.abs(c[0]) < 1e-14) c.shift();
    const deg = c.length - 1;

    // Phương trình hằng số: 0 = 0 → vô số nghiệm; c = 0 (c≠0) → vô nghiệm
    if (deg < 1) {
      if (Math.abs(c[0] || 0) < 1e-14) return [{ type: 'infinite' }];
      return [{ type: 'none' }];
    }

    if (deg === 1) {
      // a x + b = 0
      const [a, b] = c;
      if (Math.abs(a) < 1e-14) {
        if (Math.abs(b) < 1e-14) return [{ type: 'infinite' }];
        return [{ type: 'none' }];
      }
      return [-b / a];
    }
    if (deg === 2) {
      const [a, b, cc] = c;
      const d = b * b - 4 * a * cc;
      if (d > 1e-14) {
        return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
      } else if (Math.abs(d) <= 1e-14) {
        return [-b / (2 * a)];
      } else {
        const re = -b / (2 * a);
        const im = Math.sqrt(-d) / (2 * a);
        return [C.of(re, im), C.of(re, -im)];
      }
    }
    if (deg === 3) {
      // Cardano / depressed cubic
      const [a, b, cc, d] = c.map(x => x / c[0]); // normalize a=1
      const p = cc - (b * b) / 3;
      const q = (2 * b * b * b - 9 * b * cc + 27 * d) / 27;
      const disc = (q * q) / 4 + (p * p * p) / 27;
      const roots = [];
      if (disc > 0) {
        const u = Math.cbrt(-q / 2 + Math.sqrt(disc));
        const v = Math.cbrt(-q / 2 - Math.sqrt(disc));
        roots.push(u + v - b / 3);
      } else if (Math.abs(disc) < 1e-14) {
        const u = Math.cbrt(-q / 2);
        roots.push(2 * u - b / 3, -u - b / 3);
      } else {
        const r = Math.sqrt(-p * p * p / 27);
        const phi = Math.acos(Math.min(1, Math.max(-1, -q / (2 * r))));
        const m = 2 * Math.sqrt(-p / 3);
        roots.push(m * Math.cos(phi / 3) - b / 3);
        roots.push(m * Math.cos((phi + 2 * Math.PI) / 3) - b / 3);
        roots.push(m * Math.cos((phi + 4 * Math.PI) / 3) - b / 3);
      }
      return roots;
    }
    if (deg === 4) {
      // Ferrari - numerical fallback with companion matrix eigenvalues approx via Newton on derivative factors
      // Use simple numerical method: find critical points + bisection-like
      return solvePolyNumeric(c);
    }
    return ['Degree too high'];
  }

  function solvePolyNumeric(coeffs) {
    // Companion matrix + simple power iteration is heavy; use derivative + Newton + sampling
    const roots = [];
    const n = coeffs.length - 1;
    const f = (x) => {
      let y = 0;
      for (let i = 0; i < coeffs.length; i++) y = y * x + coeffs[i];
      return y;
    };
    const df = (x) => {
      let y = 0;
      for (let i = 0; i < coeffs.length - 1; i++) y = y * x + (n - i) * coeffs[i];
      return y;
    };
    // sample many points
    const candidates = [];
    for (let x = -50; x <= 50; x += 0.5) {
      const y1 = f(x), y2 = f(x + 0.5);
      if (y1 * y2 <= 0 || Math.abs(y1) < 1e-6) candidates.push(x);
    }
    for (const start of candidates) {
      let x = start;
      for (let it = 0; it < 40; it++) {
        const dy = df(x);
        if (Math.abs(dy) < 1e-14) break;
        const nx = x - f(x) / dy;
        if (Math.abs(nx - x) < 1e-12) { x = nx; break; }
        x = nx;
      }
      if (Math.abs(f(x)) < 1e-6) {
        const exists = roots.some(r => Math.abs(r - x) < 1e-5);
        if (!exists) roots.push(x);
      }
    }
    // try complex via quadratic factors is too heavy; return real roots found
    if (roots.length === 0) return ['No real roots found (try COMPLEX mode)'];
    return roots.sort((a, b) => a - b);
  }

  // ---------- Linear system solver (Gaussian elimination) ----------
  function solveSystem(A, b) {
    const n = A.length;
    const M = A.map((row, i) => [...row.map(Number), Number(b[i])]);
    let rank = 0;

    for (let col = 0; col < n; col++) {
      // pivot: tìm hàng có |phần tử| lớn nhất từ rank trở xuống
      let maxRow = rank;
      for (let r = rank + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
      }
      if (Math.abs(M[maxRow][col]) < 1e-12) continue; // cột này không có pivot

      [M[rank], M[maxRow]] = [M[maxRow], M[rank]];
      const pivot = M[rank][col];
      for (let j = col; j <= n; j++) M[rank][j] /= pivot;
      for (let r = 0; r < n; r++) {
        if (r === rank) continue;
        const factor = M[r][col];
        for (let j = col; j <= n; j++) M[r][j] -= factor * M[rank][j];
      }
      rank++;
    }

    // Kiểm tra hàng toàn 0: 0 = b?
    for (let r = rank; r < n; r++) {
      if (Math.abs(M[r][n]) > 1e-10) {
        return { type: 'none' }; // 0 = số khác 0 → vô nghiệm
      }
    }
    if (rank < n) {
      return { type: 'infinite' }; // còn biến tự do → vô số nghiệm
    }
    return { type: 'unique', values: M.map(row => row[n]) };
  }

  // ---------- Matrix ops ----------
  function matDet(m) {
    const n = m.length;
    if (n === 1) return m[0][0];
    if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    if (n === 3) {
      return (
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
      );
    }
    // Laplace for larger (rare)
    let det = 0;
    for (let j = 0; j < n; j++) {
      const minor = m.slice(1).map(row => row.filter((_, k) => k !== j));
      det += (j % 2 === 0 ? 1 : -1) * m[0][j] * matDet(minor);
    }
    return det;
  }

  function matMul(a, b) {
    const r = a.length, c = b[0].length, k = b.length;
    const res = Array.from({ length: r }, () => Array(c).fill(0));
    for (let i = 0; i < r; i++)
      for (let j = 0; j < c; j++)
        for (let t = 0; t < k; t++) res[i][j] += a[i][t] * b[t][j];
    return res;
  }

  function matAdd(a, b) {
    return a.map((row, i) => row.map((v, j) => v + b[i][j]));
  }

  function matInv(m) {
    const n = m.length;
    const det = matDet(m);
    if (Math.abs(det) < 1e-12) return null;
    if (n === 2) {
      return [
        [m[1][1] / det, -m[0][1] / det],
        [-m[1][0] / det, m[0][0] / det]
      ];
    }
    // adjugate for 3x3
    if (n === 3) {
      const cof = (i, j) => {
        const minor = m.filter((_, r) => r !== i).map(row => row.filter((_, c) => c !== j));
        return ((i + j) % 2 === 0 ? 1 : -1) * matDet(minor);
      };
      const adj = Array.from({ length: 3 }, (_, i) =>
        Array.from({ length: 3 }, (_, j) => cof(j, i)) // transpose of cofactor
      );
      return adj.map(row => row.map(v => v / det));
    }
    return null;
  }

  // ---------- Numerical derivative ----------
  function numericalDeriv(fnStr, x0, order = 1) {
    const h = 1e-6;
    const f = (x) => {
      const r = evaluate(fnStr.replace(/x/gi, '(' + x + ')'));
      if (r.error) throw new Error(r.error);
      return r.re;
    };
    if (order === 1) return (f(x0 + h) - f(x0 - h)) / (2 * h);
    if (order === 2) return (f(x0 + h) - 2 * f(x0) + f(x0 - h)) / (h * h);
    return NaN;
  }

  // ---------- UI ----------
  function injectStyles() {
    if (document.getElementById('casio-fx-styles')) return;
    const css = `
#casio-overlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(5,6,12,0.78); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none; transition: opacity .28s ease;
  font-family: 'Poppins', system-ui, sans-serif;
}
#casio-overlay.open { opacity: 1; pointer-events: auto; }
#casio-body {
  width: min(380px, 96vw);
  background: linear-gradient(160deg, #0d0f18 0%, #121420 50%, #0a0b10 100%);
  border: 1px solid rgba(0,210,255,0.35);
  border-radius: 22px;
  box-shadow: 0 0 0 1px rgba(155,93,229,0.15), 0 0 40px rgba(0,210,255,0.18), 0 25px 50px rgba(0,0,0,0.55);
  padding: 14px 14px 18px;
  position: relative;
  user-select: none;
}
#casio-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; padding: 0 4px;
}
#casio-title {
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em;
  background: linear-gradient(135deg, #00d2ff, #9b5de5);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
#casio-close {
  background: transparent; border: 1px solid rgba(0,210,255,0.4);
  color: #00d2ff; width: 28px; height: 28px; border-radius: 8px;
  cursor: pointer; font-size: 1rem; line-height: 1;
  transition: all .2s;
}
#casio-close:hover { background: rgba(0,210,255,0.15); box-shadow: 0 0 12px rgba(0,210,255,0.3); }
#casio-screen {
  background: #0c1420;
  border: 2px solid rgba(0,210,255,0.45);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  min-height: 78px;
  box-shadow: inset 0 0 20px rgba(0,210,255,0.08), 0 0 15px rgba(0,210,255,0.12);
  position: relative;
}
#casio-mode-bar {
  display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;
  font-size: 0.62rem; color: #00d2ff; opacity: 0.85;
}
#casio-mode-bar span {
  padding: 1px 6px; border-radius: 4px;
  background: rgba(0,210,255,0.12); border: 1px solid rgba(0,210,255,0.25);
}
#casio-mode-bar span.active {
  background: rgba(0,210,255,0.28); border-color: #00d2ff; color: #fff;
  box-shadow: 0 0 8px rgba(0,210,255,0.35);
}
#casio-expr {
  font-size: 0.82rem; color: #7dd8f0; min-height: 1.2em;
  word-break: break-all; opacity: 0.9; text-align: right;
}
#casio-result {
  font-size: 1.35rem; font-weight: 600; color: #e8faff;
  text-align: right; margin-top: 4px; word-break: break-all;
  text-shadow: 0 0 12px rgba(0,210,255,0.35);
}
#casio-keys {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.casio-btn {
  appearance: none; border: none; border-radius: 10px;
  height: 40px; font-size: 0.78rem; font-weight: 600;
  cursor: pointer; transition: all .15s ease;
  background: #1a1e2e; color: #c8d4e0;
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 2px 0 #0a0c14, 0 3px 6px rgba(0,0,0,0.35);
  position: relative;
}
.casio-btn:hover {
  filter: brightness(1.15);
  border-color: rgba(0,210,255,0.35);
}
.casio-btn:active {
  transform: translateY(2px);
  box-shadow: 0 0 0 #0a0c14, 0 1px 3px rgba(0,0,0,0.4);
}
.casio-btn.fn { background: #151a28; color: #00d2ff; font-size: 0.68rem; }
.casio-btn.op { background: #1c1830; color: #c9a0ff; }
.casio-btn.eq {
  background: linear-gradient(135deg, #00b8e0, #7b4fc7);
  color: #fff; border: none;
  box-shadow: 0 2px 0 #005a70, 0 0 14px rgba(0,210,255,0.35);
}
.casio-btn.num { color: #eef6ff; font-size: 0.95rem; }
.casio-btn.shift-on { box-shadow: 0 0 0 2px #00d2ff, 0 0 12px rgba(0,210,255,0.4); }
.casio-btn .sub {
  position: absolute; top: 2px; right: 4px;
  font-size: 0.55rem; color: #9b5de5; font-weight: 500;
}
#casio-panel {
  display: none; margin-top: 10px;
  background: rgba(0,0,0,0.25); border-radius: 12px;
  padding: 12px; border: 1px solid rgba(0,210,255,0.2);
  max-height: 220px; overflow-y: auto;
}
#casio-panel.open { display: block; }
#casio-panel h4 {
  margin: 0 0 8px; font-size: 0.78rem; color: #00d2ff;
  font-weight: 600;
}
#casio-panel input, #casio-panel select {
  background: #0c1018; border: 1px solid rgba(0,210,255,0.3);
  color: #e0f0ff; border-radius: 6px; padding: 5px 8px;
  font-size: 0.78rem; width: 100%; margin-bottom: 6px;
}
#casio-panel .row { display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
#casio-panel .row input { flex: 1; min-width: 50px; }
#casio-panel button.panel-btn {
  background: linear-gradient(135deg, #00b8e0, #7b4fc7);
  border: none; color: #fff; border-radius: 8px;
  padding: 7px 12px; font-size: 0.75rem; font-weight: 600;
  cursor: pointer; margin-top: 4px;
}
#casio-panel .result-box {
  margin-top: 8px; padding: 8px; background: #0c1420;
  border-radius: 8px; color: #a8e6ff; font-size: 0.8rem;
  white-space: pre-wrap; word-break: break-all;
}
#casio-hint {
  text-align: center; font-size: 0.62rem; color: rgba(173,186,199,0.55);
  margin-top: 10px;
}
@media (max-width: 400px) {
  .casio-btn { height: 36px; font-size: 0.7rem; }
  #casio-result { font-size: 1.15rem; }
}
`;
    const style = document.createElement('style');
    style.id = 'casio-fx-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildUI() {
    if (document.getElementById('casio-overlay')) return;
    injectStyles();
    const ov = document.createElement('div');
    ov.id = 'casio-overlay';
    ov.innerHTML = `
      <div id="casio-body" role="dialog" aria-label="Casio FX-580VNX Emulator">
        <div id="casio-header">
          <div id="casio-title">CASIO FX-580VNX · NEON</div>
          <button id="casio-close" title="Đóng (Esc)">×</button>
        </div>
        <div id="casio-screen">
          <div id="casio-mode-bar">
            <span data-m="COMP" class="active">COMP</span>
            <span data-m="EQN">EQN</span>
            <span data-m="MATRIX">MATRIX</span>
            <span data-m="COMPLEX">CPLX</span>
            <span data-m="DERIV">d/dx</span>
            <span id="casio-ang">${angleMode}</span>
          </div>
          <div id="casio-expr"></div>
          <div id="casio-result">0</div>
        </div>
        <div id="casio-keys"></div>
        <div id="casio-panel"></div>
        <div id="casio-hint">Ctrl+Alt+C để mở/đóng · Esc để đóng</div>
      </div>
    `;
    document.body.appendChild(ov);

    // keys layout (Casio-ish 5 columns)
    const keys = [
      { l: 'SHIFT', c: 'fn', id: 'shift' },
      { l: 'ALPHA', c: 'fn', id: 'alpha' },
      { l: 'MODE', c: 'fn', id: 'mode' },
      { l: 'ON', c: 'fn', id: 'on' },
      { l: 'DEL', c: 'fn', id: 'del' },

      { l: 'x²', c: 'fn', k: '^2', s: 'x³' },
      { l: '√', c: 'fn', k: 'sqrt(', s: '∛' },
      { l: 'xʸ', c: 'fn', k: '^', s: 'ˣ√' },
      { l: 'log', c: 'fn', k: 'log(', s: '10ˣ' },
      { l: 'ln', c: 'fn', k: 'ln(', s: 'eˣ' },

      { l: 'sin', c: 'fn', k: 'sin(', s: 'sin⁻¹' },
      { l: 'cos', c: 'fn', k: 'cos(', s: 'cos⁻¹' },
      { l: 'tan', c: 'fn', k: 'tan(', s: 'tan⁻¹' },
      { l: '(', c: 'op', k: '(' },
      { l: ')', c: 'op', k: ')' },

      { l: '7', c: 'num', k: '7' },
      { l: '8', c: 'num', k: '8' },
      { l: '9', c: 'num', k: '9' },
      { l: 'DEL', c: 'fn', id: 'ac', l2: 'AC' },
      { l: '÷', c: 'op', k: '÷' },

      { l: '4', c: 'num', k: '4' },
      { l: '5', c: 'num', k: '5' },
      { l: '6', c: 'num', k: '6' },
      { l: '×', c: 'op', k: '×' },
      { l: '-', c: 'op', k: '-' },

      { l: '1', c: 'num', k: '1' },
      { l: '2', c: 'num', k: '2' },
      { l: '3', c: 'num', k: '3' },
      { l: '+', c: 'op', k: '+' },
      { l: 'Ans', c: 'fn', k: 'Ans' },

      { l: '0', c: 'num', k: '0' },
      { l: '.', c: 'num', k: '.' },
      { l: '×10ˣ', c: 'fn', k: '×10^' },
      { l: 'π', c: 'fn', k: 'π', s: 'i' },
      { l: '=', c: 'eq', id: 'eq' },
    ];

    // fix duplicate DEL -> make second one AC
    keys[18] = { l: 'AC', c: 'fn', id: 'ac' };

    const grid = ov.querySelector('#casio-keys');
    keys.forEach((kb) => {
      const b = document.createElement('button');
      b.className = 'casio-btn ' + (kb.c || '');
      b.textContent = kb.l;
      if (kb.s) {
        const sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = kb.s;
        b.appendChild(sub);
      }
      b.dataset.k = kb.k || '';
      b.dataset.id = kb.id || '';
      b.addEventListener('click', () => onKey(kb));
      grid.appendChild(b);
    });

    ov.querySelector('#casio-close').addEventListener('click', hide);
    ov.addEventListener('click', (e) => { if (e.target === ov) hide(); });

    // mode tabs
    ov.querySelectorAll('#casio-mode-bar span[data-m]').forEach(sp => {
      sp.addEventListener('click', () => setMode(sp.dataset.m));
    });
    // Click DEG/RAD badge to toggle
    const angBtn = ov.querySelector('#casio-ang');
    if (angBtn) {
      angBtn.style.cursor = 'pointer';
      angBtn.title = 'Bấm để đổi DEG ↔ RAD';
      angBtn.addEventListener('click', () => {
        angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
        updateScreen();
      });
    }
  }

  function updateScreen() {
    const elExpr = document.getElementById('casio-expr');
    const elRes = document.getElementById('casio-result');
    if (elExpr) elExpr.textContent = expr;
    if (elRes) elRes.textContent = result;
    document.querySelectorAll('#casio-mode-bar span[data-m]').forEach(sp => {
      sp.classList.toggle('active', sp.dataset.m === mode);
    });
    const ang = document.getElementById('casio-ang');
    if (ang) ang.textContent = angleMode;
    document.querySelectorAll('.casio-btn').forEach(b => {
      if (b.dataset.id === 'shift') b.classList.toggle('shift-on', shift);
    });
  }

  function setMode(m) {
    mode = m;
    shift = false;
    const panel = document.getElementById('casio-panel');
    if (!panel) return;
    if (m === 'COMP' || m === 'COMPLEX') {
      panel.classList.remove('open');
      panel.innerHTML = '';
    } else if (m === 'EQN') {
      openEqnPanel();
    } else if (m === 'MATRIX') {
      openMatrixPanel();
    } else if (m === 'DERIV') {
      openDerivPanel();
    }
    updateScreen();
  }

  function openEqnPanel() {
    const panel = document.getElementById('casio-panel');
    panel.classList.add('open');
    panel.innerHTML = `
      <h4>EQN · Phương trình / Hệ phương trình</h4>
      <div class="row">
        <select id="eqn-type">
          <option value="poly">Phương trình bậc 1–4</option>
          <option value="sys">Hệ phương trình tuyến tính</option>
        </select>
      </div>
      <div id="eqn-body"></div>
      <button class="panel-btn" id="eqn-solve">Giải (SOLVE)</button>
      <div class="result-box" id="eqn-out">Nhập hệ số rồi nhấn Giải</div>
    `;
    const typeSel = panel.querySelector('#eqn-type');
    const body = panel.querySelector('#eqn-body');
    function renderBody() {
      if (typeSel.value === 'poly') {
        body.innerHTML = `
          <div class="row">
            <label style="color:#9ab;font-size:0.72rem;width:100%">Bậc:
              <select id="poly-deg"><option>1</option><option selected>2</option><option>3</option><option>4</option></select>
            </label>
          </div>
          <div id="poly-coeffs" class="row"></div>
        `;
        const degSel = body.querySelector('#poly-deg');
        const coeffsDiv = body.querySelector('#poly-coeffs');
        function renderCoeffs() {
          const d = +degSel.value;
          coeffsDiv.innerHTML = '';
          for (let i = d; i >= 0; i--) {
            const inp = document.createElement('input');
            inp.type = 'number'; inp.step = 'any';
            inp.placeholder = 'a' + i;
            inp.dataset.pow = i;
            inp.value = i === d ? '1' : '0';
            coeffsDiv.appendChild(inp);
          }
        }
        degSel.onchange = renderCoeffs;
        renderCoeffs();
      } else {
        body.innerHTML = `
          <div class="row">
            <label style="color:#9ab;font-size:0.72rem">Số ẩn:
              <select id="sys-n"><option>2</option><option>3</option></select>
            </label>
          </div>
          <div id="sys-grid"></div>
        `;
        const nSel = body.querySelector('#sys-n');
        const grid = body.querySelector('#sys-grid');
        function renderSys() {
          const n = +nSel.value;
          grid.innerHTML = '';
          for (let i = 0; i < n; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            for (let j = 0; j < n; j++) {
              const inp = document.createElement('input');
              inp.type = 'number'; inp.step = 'any';
              inp.placeholder = 'a' + (i + 1) + (j + 1);
              inp.dataset.r = i; inp.dataset.c = j;
              inp.value = i === j ? '1' : '0';
              row.appendChild(inp);
            }
            const eq = document.createElement('span');
            eq.textContent = '='; eq.style.color = '#00d2ff'; eq.style.alignSelf = 'center';
            row.appendChild(eq);
            const rhs = document.createElement('input');
            rhs.type = 'number'; rhs.step = 'any';
            rhs.placeholder = 'b' + (i + 1);
            rhs.dataset.rhs = i; rhs.value = '0';
            row.appendChild(rhs);
            grid.appendChild(row);
          }
        }
        nSel.onchange = renderSys;
        renderSys();
      }
    }
    typeSel.onchange = renderBody;
    renderBody();

    panel.querySelector('#eqn-solve').onclick = () => {
      const out = panel.querySelector('#eqn-out');
      try {
        if (typeSel.value === 'poly') {
          const inputs = [...panel.querySelectorAll('#poly-coeffs input')];
          const coeffs = inputs.map(i => parseFloat(i.value) || 0);
          const roots = solvePoly(coeffs);
          if (roots[0] && roots[0].type === 'none') {
            out.textContent = 'Vô nghiệm';
          } else if (roots[0] && roots[0].type === 'infinite') {
            out.textContent = 'Vô số nghiệm';
          } else if (roots[0] && typeof roots[0] === 'string') {
            out.textContent = roots[0];
          } else {
            out.textContent = roots.map((r, i) => {
              if (typeof r === 'object' && r !== null && 're' in r) return `x${i + 1} = ${fmt(r)}`;
              return `x${i + 1} = ${fmt(r)}`;
            }).join('\n');
          }
        } else {
          const n = +panel.querySelector('#sys-n').value;
          const A = Array.from({ length: n }, () => Array(n).fill(0));
          const b = Array(n).fill(0);
          panel.querySelectorAll('#sys-grid input').forEach(inp => {
            if (inp.dataset.rhs !== undefined) b[+inp.dataset.rhs] = parseFloat(inp.value) || 0;
            else A[+inp.dataset.r][+inp.dataset.c] = parseFloat(inp.value) || 0;
          });
          const sol = solveSystem(A, b);
          if (sol.type === 'none') {
            out.textContent = 'Vô nghiệm';
          } else if (sol.type === 'infinite') {
            out.textContent = 'Vô số nghiệm';
          } else if (sol.type === 'unique') {
            out.textContent = sol.values.map((v, i) => `x${i + 1} = ${fmt(v)}`).join('\n');
          } else {
            out.textContent = 'Không xác định được nghiệm';
          }
        }
      } catch (e) {
        out.textContent = 'Error: ' + e.message;
      }
    };
  }

  function openMatrixPanel() {
    const panel = document.getElementById('casio-panel');
    panel.classList.add('open');
    panel.innerHTML = `
      <h4>MATRIX · Ma trận (2×2 / 3×3)</h4>
      <div class="row">
        <label style="color:#9ab;font-size:0.72rem">Kích thước:
          <select id="mat-n"><option>2</option><option>3</option></select>
        </label>
        <label style="color:#9ab;font-size:0.72rem">Phép toán:
          <select id="mat-op">
            <option value="detA">det(A)</option>
            <option value="detB">det(B)</option>
            <option value="invA">A⁻¹</option>
            <option value="invB">B⁻¹</option>
            <option value="A+B">A + B</option>
            <option value="A*B">A × B</option>
            <option value="B*A">B × A</option>
          </select>
        </label>
      </div>
      <div style="color:#9ab;font-size:0.72rem;margin:4px 0">Ma trận A</div>
      <div id="mat-A" class="row"></div>
      <div style="color:#9ab;font-size:0.72rem;margin:4px 0">Ma trận B</div>
      <div id="mat-B" class="row"></div>
      <button class="panel-btn" id="mat-calc">Tính</button>
      <div class="result-box" id="mat-out">—</div>
    `;
    const nSel = panel.querySelector('#mat-n');
    function renderMats() {
      const n = +nSel.value;
      ['A', 'B'].forEach(name => {
        const box = panel.querySelector('#mat-' + name);
        box.innerHTML = '';
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const inp = document.createElement('input');
            inp.type = 'number'; inp.step = 'any';
            inp.placeholder = name + (i + 1) + (j + 1);
            inp.dataset.r = i; inp.dataset.c = j;
            inp.value = i === j ? '1' : '0';
            box.appendChild(inp);
          }
          if (i < n - 1) box.appendChild(document.createElement('br'));
        }
      });
    }
    nSel.onchange = renderMats;
    renderMats();

    panel.querySelector('#mat-calc').onclick = () => {
      const n = +nSel.value;
      const read = (name) => {
        const m = Array.from({ length: n }, () => Array(n).fill(0));
        panel.querySelectorAll('#mat-' + name + ' input').forEach(inp => {
          m[+inp.dataset.r][+inp.dataset.c] = parseFloat(inp.value) || 0;
        });
        return m;
      };
      const A = read('A'), B = read('B');
      const op = panel.querySelector('#mat-op').value;
      const out = panel.querySelector('#mat-out');
      try {
        let res;
        if (op === 'detA') res = 'det(A) = ' + fmt(matDet(A));
        else if (op === 'detB') res = 'det(B) = ' + fmt(matDet(B));
        else if (op === 'invA') {
          const inv = matInv(A);
          res = inv ? 'A⁻¹ =\n' + inv.map(r => r.map(fmt).join('\t')).join('\n') : 'Không khả nghịch';
        } else if (op === 'invB') {
          const inv = matInv(B);
          res = inv ? 'B⁻¹ =\n' + inv.map(r => r.map(fmt).join('\t')).join('\n') : 'Không khả nghịch';
        } else if (op === 'A+B') {
          res = 'A+B =\n' + matAdd(A, B).map(r => r.map(fmt).join('\t')).join('\n');
        } else if (op === 'A*B') {
          res = 'A×B =\n' + matMul(A, B).map(r => r.map(fmt).join('\t')).join('\n');
        } else if (op === 'B*A') {
          res = 'B×A =\n' + matMul(B, A).map(r => r.map(fmt).join('\t')).join('\n');
        }
        out.textContent = res;
      } catch (e) {
        out.textContent = 'Error: ' + e.message;
      }
    };
  }

  function openDerivPanel() {
    const panel = document.getElementById('casio-panel');
    panel.classList.add('open');
    panel.innerHTML = `
      <h4>d/dx · Đạo hàm số</h4>
      <div class="row">
        <input id="deriv-fn" placeholder="f(x)  ví dụ: x^3+2x+1" style="flex:2">
      </div>
      <div class="row">
        <input id="deriv-x" type="number" step="any" placeholder="x0" value="1" style="flex:1">
        <select id="deriv-order" style="flex:1">
          <option value="1">f'(x)</option>
          <option value="2">f''(x)</option>
        </select>
      </div>
      <button class="panel-btn" id="deriv-go">Tính đạo hàm</button>
      <div class="result-box" id="deriv-out">—</div>
    `;
    panel.querySelector('#deriv-go').onclick = () => {
      const fn = panel.querySelector('#deriv-fn').value.trim();
      const x0 = parseFloat(panel.querySelector('#deriv-x').value) || 0;
      const order = +panel.querySelector('#deriv-order').value;
      const out = panel.querySelector('#deriv-out');
      try {
        if (!fn) { out.textContent = 'Nhập hàm f(x)'; return; }
        const val = numericalDeriv(fn, x0, order);
        out.textContent = (order === 1 ? "f'" : "f''") + `(${x0}) ≈ ${fmt(val)}`;
      } catch (e) {
        out.textContent = 'Error: ' + e.message;
      }
    };
  }

  function onKey(kb) {
    if (kb.id === 'shift') {
      shift = !shift;
      updateScreen();
      return;
    }
    if (kb.id === 'alpha') {
      alpha = !alpha;
      updateScreen();
      return;
    }
    if (kb.id === 'mode') {
      // SHIFT + MODE → đổi DEG/RAD; MODE thường → đổi chế độ tính
      if (shift) {
        shift = false;
        angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
        updateScreen();
        return;
      }
      const modes = ['COMP', 'EQN', 'MATRIX', 'COMPLEX', 'DERIV'];
      const idx = modes.indexOf(mode);
      setMode(modes[(idx + 1) % modes.length]);
      return;
    }
    if (kb.id === 'on' || kb.id === 'ac') {
      expr = '';
      result = '0';
      shift = false;
      updateScreen();
      return;
    }
    if (kb.id === 'del') {
      expr = smartDelete(expr);
      updateScreen();
      return;
    }
    if (kb.id === 'eq') {
      doCalc();
      return;
    }

    // SHIFT alternate functions
    if (shift) {
      shift = false;
      const map = {
        'sin(': 'sin⁻¹(',
        'cos(': 'cos⁻¹(',
        'tan(': 'tan⁻¹(',
        'log(': '10^(',
        'ln(': 'exp(',
        '^2': '^3',
        'sqrt(': '^(1/3)',
        'π': 'i',
      };
      const alt = map[kb.k];
      if (alt) {
        expr += alt;
        updateScreen();
        return;
      }
      if (kb.l === 'MODE' || kb.id === 'mode') {
        angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
        updateScreen();
        return;
      }
    }

    if (kb.k) {
      expr += kb.k;
      updateScreen();
    }
  }

  function doCalc() {
    if (!expr.trim()) return;
    // quick insert i in complex
    let e = expr;
    if (mode === 'COMPLEX' && /[0-9]i\b/.test(e) === false) {
      // allow trailing i
    }
    const val = evaluate(e);
    if (val.error) {
      result = 'Error: ' + val.error;
    } else {
      result = fmt(val);
      history.push(val.re !== undefined && val.im === 0 ? val.re : result);
      if (history.length > 20) history.shift();
      // store numeric Ans
      if (val.im === 0) {
        // keep as number string for Ans
      }
    }
    updateScreen();
  }

  // also allow keyboard input when overlay open
  function onDocKey(e) {
    if (!visible) {
      if (e.ctrlKey && e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
      return;
    }
    if (e.ctrlKey && e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      hide();
      return;
    }
    // simple keyboard mapping when focus not on panel inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    const map = {
      '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
      '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '.': '.', '+': '+', '-': '-', '*': '×', '/': '÷',
      '(': '(', ')': ')', '^': '^', 'Enter': '=', '=': '=',
      'Backspace': 'DEL', 'Delete': 'AC', 'p': 'π', 'i': 'i',
    };
    if (e.key in map) {
      e.preventDefault();
      if (map[e.key] === '=') doCalc();
      else if (map[e.key] === 'DEL') { expr = smartDelete(expr); updateScreen(); }
      else if (map[e.key] === 'AC') { expr = ''; result = '0'; updateScreen(); }
      else { expr += map[e.key]; updateScreen(); }
    }
  }

  function show() {
    buildUI();
    visible = true;
    document.getElementById('casio-overlay').classList.add('open');
    updateScreen();
  }
  function hide() {
    visible = false;
    const ov = document.getElementById('casio-overlay');
    if (ov) ov.classList.remove('open');
  }

  document.addEventListener('keydown', onDocKey);

  // expose for debug
  window.__casioFX = { show, hide, evaluate, solvePoly };
})();
