/* Dilia Play puzzles: nonogram, sliding puzzle, word search and memory deck. Pure functions, tested in Node. */
(function (root) {
  'use strict';
  const R = f => f || Math.random;
  // ---------- nonogram ----------
  function clue(line) { const out = []; let n = 0; for (const v of line) { if (v) n++; else if (n) { out.push(n); n = 0; } } if (n) out.push(n); return out.length ? out : [0]; }
  // all cells of one line that are certain given the clue and what is already known (0 unknown, 1 filled, 2 empty); returns null if contradictory
  function solveLine(cl, known) {
    const n = known.length, c = cl[0] === 0 ? [] : cl, memo = new Map(); const fillAll = new Array(n).fill(1), emptyAll = new Array(n).fill(1);
    let count = 0; const canFill = new Array(n).fill(false), canEmpty = new Array(n).fill(false);
    const place = (bi, pos, cur) => {
      if (bi === c.length) { for (let i = pos; i < n; i++) if (known[i] === 1) return; for (let i = pos; i < n; i++) cur[i] = 0; count++; for (let i = 0; i < n; i++) (cur[i] ? canFill : canEmpty)[i] = true; return; }
      const need = c.slice(bi).reduce((a, b) => a + b, 0) + (c.length - bi - 1);
      for (let s = pos; s + need <= n; s++) {
        let ok = true; for (let i = pos; i < s; i++) if (known[i] === 1) { ok = false; break; } if (!ok) break;
        for (let i = s; i < s + c[bi]; i++) if (known[i] === 2) { ok = false; break; } if (!ok) continue;
        if (bi < c.length - 1 && known[s + c[bi]] === 1) continue;
        const nx = cur.slice(); for (let i = pos; i < s; i++) nx[i] = 0; for (let i = s; i < s + c[bi]; i++) nx[i] = 1; if (bi < c.length - 1) nx[s + c[bi]] = 0;
        place(bi + 1, s + c[bi] + (bi < c.length - 1 ? 1 : 0), nx);
      }
    };
    place(0, 0, new Array(n).fill(0)); if (!count) return null;
    return known.map((k, i) => (k ? k : canFill[i] && !canEmpty[i] ? 1 : canEmpty[i] && !canFill[i] ? 2 : 0));
  }
  function nonoSolve(rows, cols) {
    const h = rows.length, w = cols.length, g = Array.from({ length: h }, () => new Array(w).fill(0)); let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < h; r++) { const s = solveLine(rows[r], g[r]); if (!s) return null; for (let c = 0; c < w; c++) if (s[c] !== g[r][c]) { g[r][c] = s[c]; changed = true; } }
      for (let c = 0; c < w; c++) { const col = g.map(r => r[c]), s = solveLine(cols[c], col); if (!s) return null; for (let r = 0; r < h; r++) if (s[r] !== g[r][c]) { g[r][c] = s[r]; changed = true; } }
    }
    return g;
  }
  // a random picture whose clues can be solved by line logic alone (so it has one answer and needs no guessing)
  function nonoNew(n, rnd, density) {
    rnd = R(rnd); density = density || 0.58;
    for (let tries = 0; tries < 400; tries++) {
      const pic = Array.from({ length: n }, () => Array.from({ length: n }, () => (rnd() < density ? 1 : 0)));
      const rows = pic.map(clue), cols = Array.from({ length: n }, (_, c) => clue(pic.map(r => r[c])));
      if (rows.some(r => r[0] === 0) || cols.some(c => c[0] === 0)) continue;
      const s = nonoSolve(rows, cols); if (s && s.every(r => r.every(v => v))) return { n, pic, rows, cols };
    }
    return null;
  }
  const nonoWon = (p, marks) => { for (let r = 0; r < p.n; r++) { if (clue(marks[r].map(v => v === 1 ? 1 : 0)).join() !== p.rows[r].join()) return false; } for (let c = 0; c < p.n; c++) if (clue(marks.map(r => r[c] === 1 ? 1 : 0)).join() !== p.cols[c].join()) return false; return true; };
  // ---------- sliding puzzle ----------
  const slideSolved = t => t.every((v, i) => v === (i === t.length - 1 ? 0 : i + 1));
  function slideNew(n, rnd) {
    rnd = R(rnd); const t = Array.from({ length: n * n }, (_, i) => (i === n * n - 1 ? 0 : i + 1)); let b = n * n - 1, prev = -1;
    for (let k = 0; k < 120 * n * n; k++) { const r = b / n | 0, c = b % n, opts = []; if (r > 0) opts.push(b - n); if (r < n - 1) opts.push(b + n); if (c > 0) opts.push(b - 1); if (c < n - 1) opts.push(b + 1); const o = opts.filter(x => x !== prev), pick = o[Math.floor(rnd() * o.length)]; t[b] = t[pick]; t[pick] = 0; prev = b; b = pick; }
    if (slideSolved(t)) return slideNew(n, rnd); return t;
  }
  // tap tile i: tiles between it and the blank (same row or column) slide one step; returns the new array and how many tiles moved (0 = not allowed)
  function slideMove(t, i, n) {
    const b = t.indexOf(0), r = i / n | 0, c = i % n, br = b / n | 0, bc = b % n; if (i === b || (r !== br && c !== bc)) return { t, moved: 0 };
    const out = t.slice(); let moved = 0;
    if (r === br) { const d = bc > c ? 1 : -1; for (let x = bc; x !== c; x -= d) { out[br * n + x] = out[br * n + x - d]; moved++; } }
    else { const d = br > r ? 1 : -1; for (let y = br; y !== r; y -= d) { out[y * n + c] = out[(y - d) * n + c]; moved++; } }
    out[i] = 0; return { t: out, moved };
  }
  // ---------- word search ----------
  const THEMES = {
    Animals: ['TIGER', 'ZEBRA', 'HORSE', 'EAGLE', 'SHARK', 'WHALE', 'PANDA', 'KOALA', 'OTTER', 'CAMEL', 'LEMUR', 'RABBIT', 'FALCON', 'DOLPHIN'],
    Food: ['PIZZA', 'BREAD', 'APPLE', 'MANGO', 'PASTA', 'SALAD', 'HONEY', 'LEMON', 'OLIVE', 'CHEESE', 'NOODLE', 'BANANA', 'COOKIE', 'CARROT'],
    Countries: ['INDIA', 'CHINA', 'SPAIN', 'ITALY', 'EGYPT', 'KENYA', 'JAPAN', 'BRAZIL', 'FRANCE', 'GREECE', 'NORWAY', 'TURKEY', 'MEXICO', 'CANADA'],
    Space: ['MOON', 'MARS', 'STAR', 'COMET', 'EARTH', 'VENUS', 'ORBIT', 'SOLAR', 'GALAXY', 'ROCKET', 'PLANET', 'SATURN', 'ECLIPSE', 'COSMOS'],
    Sports: ['TENNIS', 'RUGBY', 'GOLF', 'CRICKET', 'HOCKEY', 'BOXING', 'SOCCER', 'ROWING', 'SKIING', 'KARATE', 'ARCHERY', 'DIVING', 'CYCLING', 'SQUASH'],
    Nature: ['RIVER', 'OCEAN', 'FOREST', 'DESERT', 'MEADOW', 'CANYON', 'GLACIER', 'ISLAND', 'VALLEY', 'JUNGLE', 'LAGOON', 'VOLCANO', 'BEACH', 'CLOUD']
  };
  const DIRS8 = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
  function wsNew(theme, n, count, hard, rnd) {
    rnd = R(rnd); const dirs = hard ? DIRS8 : DIRS8.slice(0, 3);
    for (let attempt = 0; attempt < 60; attempt++) {
      const pool = THEMES[theme].filter(w => w.length <= n).slice().sort(() => rnd() - 0.5).slice(0, count), g = Array.from({ length: n }, () => new Array(n).fill('')), placed = []; let fail = false;
      for (const w of pool.slice().sort((a, b) => b.length - a.length)) {
        let ok = false;
        for (let t = 0; t < 200 && !ok; t++) {
          const [dr, dc] = dirs[Math.floor(rnd() * dirs.length)], r = Math.floor(rnd() * n), c = Math.floor(rnd() * n), er = r + dr * (w.length - 1), ec = c + dc * (w.length - 1);
          if (er < 0 || er >= n || ec < 0 || ec >= n) continue; let fits = true; for (let k = 0; k < w.length; k++) { const x = g[r + dr * k][c + dc * k]; if (x && x !== w[k]) { fits = false; break; } } if (!fits) continue;
          for (let k = 0; k < w.length; k++) g[r + dr * k][c + dc * k] = w[k]; placed.push({ w, r, c, dr, dc }); ok = true;
        }
        if (!ok) { fail = true; break; }
      }
      if (fail) continue;
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!g[r][c]) g[r][c] = A[Math.floor(rnd() * 26)];
      return { n, grid: g, words: placed.map(p => p.w).sort(), placed };
    }
    return null;
  }
  // the word covered by a straight selection from (r1,c1) to (r2,c2) in either direction, or null
  function wsRead(grid, r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1), len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) + 1; if ((r1 !== r2 && c1 !== c2 && Math.abs(r2 - r1) !== Math.abs(c2 - c1))) return null;
    let s = ''; for (let k = 0; k < len; k++) s += grid[r1 + dr * k][c1 + dc * k]; return s;
  }
  // ---------- memory ----------
  function memDeck(pairs, rnd) { rnd = R(rnd); const d = []; for (let i = 0; i < pairs; i++) d.push(i, i); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
  const API = { clue, solveLine, nonoSolve, nonoNew, nonoWon, slideNew, slideMove, slideSolved, THEMES, wsNew, wsRead, memDeck };
  root.DiliaPuzzles = API; if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
