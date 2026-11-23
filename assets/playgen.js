/* Dilia Play: daily puzzle generators. Pure integer maths, seeded from the date only, so every browser in the
   world builds the same board for the same day. No network, no Math.random. Also loaded by dev/tests in Node. */
(function (root) {
  'use strict';
  // ---- seeded random (mulberry32 over an FNV-1a hash of a text key) ----
  function hash(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function rng(key) {
    let a = hash(String(key));
    const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    next.int = n => Math.floor(next() * n);
    next.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = next.int(i + 1); const x = arr[i]; arr[i] = arr[j]; arr[j] = x; } return arr; };
    return next;
  }

  // ---- calendar: the local date decides the day; the number counts from launch day ----
  const LAUNCH = Date.UTC(2026, 10, 23);
  const pad = n => (n < 10 ? '0' : '') + n;
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayNo(key) { const [y, m, d] = key.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - LAUNCH) / 864e5) + 1; }
  function weekday(key) { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }

  // =====================================================================================
  // DAILY PATH: draw one line through every square, passing the numbers in order 1, 2, 3...
  // =====================================================================================
  // size by weekday: Mon-Tue 5, Wed-Fri 6, Sat-Sun 7 (Sun = 0)
  const PATH_SIZE = [7, 5, 5, 6, 6, 6, 7];

  function nbrs(n) {
    const out = [];
    for (let i = 0; i < n * n; i++) {
      const r = (i / n) | 0, c = i % n, a = [];
      if (r > 0) a.push(i - n); if (c < n - 1) a.push(i + 1); if (r < n - 1) a.push(i + n); if (c > 0) a.push(i - 1);
      out.push(a);
    }
    return out;
  }

  // Random Hamiltonian path: start from a snake and apply many "backbite" moves (each keeps it a valid path).
  function randomPath(n, R) {
    const N = n * n, nb = nbrs(n);
    let p = [];
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) p.push(r * n + (r % 2 ? n - 1 - k : k));
    const pos = new Int32Array(N);
    const index = () => { for (let i = 0; i < N; i++) pos[p[i]] = i; };
    index();
    const steps = N * N * 4;
    for (let s = 0; s < steps; s++) {
      if (R() < 0.5) { p.reverse(); index(); }
      const end = p[0], opts = nb[end].filter(v => pos[v] >= 2);
      if (!opts.length) continue;
      const i = pos[opts[R.int(opts.length)]];
      const head = p.slice(0, i).reverse();
      for (let k = 0; k < i; k++) { p[k] = head[k]; pos[head[k]] = k; }
    }
    return p;
  }

  // Count solutions (stop at 2). clue: Int32Array cell -> number (0 = none). Returns {count, alt, out}
  function solvePath(n, clue, K, budget) {
    const N = n * n, nb = nbrs(n), used = new Uint8Array(N), path = [];
    let count = 0, nodes = 0, out = false; const sols = [];
    let start = -1; for (let i = 0; i < N; i++) if (clue[i] === 1) start = i;
    const end = (() => { for (let i = 0; i < N; i++) if (clue[i] === K) return i; return -1; })();
    const seen = new Int32Array(N); let stamp = 0; const stack = new Int32Array(N);
    function ok(head, left) {
      // every free cell (not the end) needs two ways in/out; the end needs one; free cells must stay connected
      let first = -1;
      for (let i = 0; i < N; i++) {
        if (used[i]) continue;
        if (first < 0) first = i;
        let d = 0; const a = nb[i];
        for (let k = 0; k < a.length; k++) if (!used[a[k]] || a[k] === head) d++;
        if (d < (i === end ? 1 : 2)) return false;
      }
      if (first < 0) return true;
      stamp++; let sp = 0, got = 0; stack[sp++] = first; seen[first] = stamp;
      while (sp) { const x = stack[--sp]; got++; const a = nb[x]; for (let k = 0; k < a.length; k++) { const y = a[k]; if (!used[y] && seen[y] !== stamp) { seen[y] = stamp; stack[sp++] = y; } } }
      return got === left;
    }
    function go(cell, want, left) {
      if (count >= 2 || out) return;
      if (++nodes > budget) { out = true; return; }
      if (left === 0) { if (cell === end) { count++; sols.push(path.slice()); } return; }
      if (cell === end) return;
      const a = nb[cell];
      for (let k = 0; k < a.length; k++) {
        const y = a[k];
        if (used[y]) continue;
        const c = clue[y];
        if (c && c !== want) continue;
        used[y] = 1; path.push(y);
        if (ok(y, left - 1)) go(y, c ? want + 1 : want, left - 1);
        path.pop(); used[y] = 0;
        if (count >= 2 || out) return;
      }
    }
    used[start] = 1; path.push(start);
    go(start, 2, N - 1);
    return { count, sols, out, nodes };
  }

  function makePath(key) { const B = pathBoard('path:' + key, PATH_SIZE[weekday(key)]); B.no = dayNo(key); return B; }
  // endless levels: size grows with the level; seed is the level number, so level 12 is the same for everyone
  const levelSize = L => (L <= 10 ? 5 : L <= 30 ? 6 : L <= 60 ? 7 : 8);
  function makeLevel(L) { const B = pathBoard('pathlevel:' + L, levelSize(L)); B.no = L; return B; }
  function pathBoard(seed, n) { for (let t = 0; t < 8; t++) { const B = tryBoard(t ? seed + '#' + t : seed, n); if (B) return B; } throw new Error('no board for ' + seed); }
  function tryBoard(seed, n) {
    const N = n * n, R = rng(seed);
    const p = randomPath(n, R);
    // clue positions along the path: always the start and the end, plus a few spread out
    const idx = new Set([0, N - 1]);
    const want = n < 8 ? n : 14; // 8×8 starts with more numbers so the one-answer check stays fast on phones
    while (idx.size < want) idx.add(1 + R.int(N - 2));
    const build = () => {
      const s = [...idx].sort((a, b) => a - b), clue = new Int32Array(N);
      s.forEach((k, j) => { clue[p[k]] = j + 1; });
      return { clue, K: s.length, s };
    };
    for (let round = 0; round < 40; round++) {
      const b = build();
      const res = solvePath(n, b.clue, b.K, 400000);
      if (!res.out && res.count === 1) return { n, path: p, clues: Array.from(b.clue), last: b.K };
      const alt = res.sols.find(x => x.some((c, i) => c !== p[i]));
      let fixed = false;
      if (alt) {
        // add the first new clue (along our path) that the other answer breaks
        const at = new Int32Array(N); alt.forEach((c, i) => { at[c] = i; });
        for (let k = 1; k < N - 1 && !fixed; k++) {
          if (idx.has(k)) continue;
          const s = [...idx, k].sort((x, y) => x - y), j = s.indexOf(k);
          if (!(at[p[s[j - 1]]] < at[p[k]] && at[p[k]] < at[p[s[j + 1]]])) { idx.add(k); fixed = true; }
        }
      }
      if (!fixed) {
        // search too big: split the longest stretch without a number
        const s = b.s; let best = 0, at = 1;
        for (let j = 1; j < s.length; j++) if (s[j] - s[j - 1] > best) { best = s[j] - s[j - 1]; at = (s[j] + s[j - 1]) >> 1; }
        idx.add(at);
      }
    }
    return null; // could not prove one answer: the caller tries the next seed
  }

  // rules check used by the page: does this drawn line solve the board?
  function checkPath(n, clues, last, line) {
    const N = n * n; if (line.length !== N) return false;
    const seen = new Set(); let want = 1;
    for (let i = 0; i < N; i++) {
      const c = line[i];
      if (c < 0 || c >= N || seen.has(c)) return false; seen.add(c);
      if (i) { const a = line[i - 1], ra = (a / n) | 0, rc = (c / n) | 0; if (Math.abs(ra - rc) + Math.abs((a % n) - (c % n)) !== 1) return false; }
      if (clues[c]) { if (clues[c] !== want) return false; want++; }
    }
    return want === last + 1 && clues[line[N - 1]] === last;
  }

  // =====================================================================================
  // DAILY SUDOKU: three levels, one unique answer each
  // =====================================================================================
  const UNIT = (() => { // peers of each cell
    const peers = [];
    for (let i = 0; i < 81; i++) {
      const r = (i / 9) | 0, c = i % 9, br = r - r % 3, bc = c - c % 3, s = new Set();
      for (let k = 0; k < 9; k++) { s.add(r * 9 + k); s.add(k * 9 + c); s.add((br + ((k / 3) | 0)) * 9 + bc + k % 3); }
      s.delete(i); peers.push([...s]);
    }
    return peers;
  })();
  const BITS = new Uint8Array(512); for (let m = 0; m < 512; m++) { let c = 0, x = m; while (x) { c += x & 1; x >>= 1; } BITS[m] = c; }

  // count solutions up to `limit`; fills `out` with the first one found when given
  function solveSudoku(g, limit, R, out) {
    const a = Array.from(g); let count = 0;
    function cand(i) { let m = 511; const p = UNIT[i]; for (let k = 0; k < 20; k++) { const v = a[p[k]]; if (v) m &= ~(1 << (v - 1)); } return m; }
    function go() {
      let bi = -1, bm = 0, bc = 10;
      for (let i = 0; i < 81; i++) if (!a[i]) { const m = cand(i), c = BITS[m]; if (c < bc) { bc = c; bi = i; bm = m; if (c <= 1) break; } }
      if (bi < 0) { count++; if (out && count === 1) for (let i = 0; i < 81; i++) out[i] = a[i]; return; }
      if (!bc) return;
      const ds = []; for (let d = 1; d <= 9; d++) if (bm & (1 << (d - 1))) ds.push(d);
      if (R) R.shuffle(ds);
      for (const d of ds) { a[bi] = d; go(); a[bi] = 0; if (count >= limit) return; }
    }
    go();
    return count;
  }

  const LEVELS = { easy: 40, medium: 32, hard: 0 }; // clues to keep; 0 = remove every clue that keeps one answer
  function makeSudoku(key, level) {
    // hard: try a few seeds in a fixed order until the board is clearly harder than medium (28 clues or fewer)
    let best = null;
    for (let t = 0; t < 12; t++) {
      const S = buildSudoku('sudoku:' + level + ':' + key + (t ? ':' + t : ''), level);
      if (!best || S.clues < best.clues) best = S;
      if (level !== 'hard' || S.clues <= 28) break;
    }
    best.no = dayNo(key);
    return best;
  }
  function buildSudoku(seed, level) {
    const R = rng(seed), sol = new Array(81).fill(0);
    solveSudoku(new Array(81).fill(0), 1, R, sol);
    const g = sol.slice(), target = LEVELS[level];
    const order = R.shuffle(Array.from({ length: 41 }, (_, i) => i)); // symmetric pairs (i, 80 - i)
    let clues = 81;
    for (const i of order) {
      if (target && clues <= target) break;
      const j = 80 - i, vi = g[i], vj = g[j];
      g[i] = 0; g[j] = 0;
      if (solveSudoku(g, 2) !== 1) { g[i] = vi; g[j] = vj; } else clues -= i === j ? 1 : 2;
    }
    return { grid: g, solution: sol, clues, level };
  }

  // =====================================================================================
  // MERGE: slide tiles; two equal tiles that meet join into one (each tile joins once per move)
  // =====================================================================================
  // grid: array of n*n cells, each null or { id, v }. dir: 0 up, 1 right, 2 down, 3 left.
  // Returns the new grid (joined tiles have id null, for the page to number), points gained,
  // whether anything moved, where each old tile went, and which squares got a joined tile.
  function mergeLines(n, dir) {
    const L = [];
    for (let a = 0; a < n; a++) {
      const l = [];
      for (let b = 0; b < n; b++) l.push(dir === 3 ? a * n + b : dir === 1 ? a * n + (n - 1 - b) : dir === 0 ? b * n + a : (n - 1 - b) * n + a);
      L.push(l);
    }
    return L;
  }
  function mergeMove(grid, n, dir) {
    const out = new Array(n * n).fill(null), moves = [], joined = []; let gain = 0, moved = false;
    for (const l of mergeLines(n, dir)) {
      let k = 0, last = null; // last: the tile just placed in this line that may still join
      for (const i of l) {
        const t = grid[i]; if (!t) continue;
        if (last && last.v === t.v && !last.j) {
          const to = last.at; out[to] = { id: null, v: t.v * 2 }; gain += t.v * 2;
          moves.push({ id: t.id, to }); joined.push({ to, v: t.v * 2, ids: [last.id, t.id] });
          last = { at: to, v: t.v * 2, j: true, id: null }; moved = true;
        } else {
          const to = l[k++]; out[to] = t; moves.push({ id: t.id, to }); if (to !== i) moved = true;
          last = { at: to, v: t.v, j: false, id: t.id };
        }
      }
    }
    return { grid: out, gain, moved, moves, joined };
  }
  function mergeCanMove(grid, n) {
    for (let i = 0; i < n * n; i++) {
      if (!grid[i]) return true;
      const v = grid[i].v;
      if (i % n < n - 1 && grid[i + 1] && grid[i + 1].v === v) return true;
      if (i + n < n * n && grid[i + n] && grid[i + n].v === v) return true;
    }
    return false;
  }
  // new tile: a free square picked by the random stream, 2 nine times in ten, else 4
  function mergeSpawn(grid, R) {
    const free = []; for (let i = 0; i < grid.length; i++) if (!grid[i]) free.push(i);
    if (!free.length) return null;
    const at = free[R.int(free.length)], v = R() < 0.9 ? 2 : 4;
    return { at, v };
  }

  // =====================================================================================
  // MINESWEEPER: boards where the first square opens an area; "no guessing" boards can be solved by logic alone
  // =====================================================================================
  function around(w, h) {
    const A = [];
    for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0, a = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) a.push(Y * w + X); } A.push(a); }
    return A;
  }
  function counts(w, h, mine, A) { const c = new Int8Array(w * h); for (let i = 0; i < w * h; i++) { let k = 0; for (const j of A[i]) if (mine[j]) k++; c[i] = mine[i] ? -1 : k; } return c; }
  // logic solver: opens squares that must be safe, marks squares that must be mines. true if it clears the board.
  function mineSolve(w, h, mine, start, A) {
    A = A || around(w, h); const N = w * h, c = counts(w, h, mine, A);
    const open = new Uint8Array(N), flag = new Uint8Array(N); let left = 0; for (let i = 0; i < N; i++) if (!mine[i]) left++;
    const stack = [];
    const reveal = i => { if (open[i] || flag[i]) return; if (mine[i]) throw new Error('solver opened a mine'); open[i] = 1; left--; if (c[i] === 0) for (const j of A[i]) if (!open[j]) stack.push(j); };
    const flood = i => { stack.push(i); while (stack.length) reveal(stack.pop()); };
    const mark = j => { if (!mine[j]) throw new Error('solver marked a safe square'); flag[j] = 1; };
    flood(start);
    let changed = true;
    while (changed && left > 0) {
      changed = false;
      const cons = []; // constraints: unknown squares around an open number, and how many of them are mines
      for (let i = 0; i < N; i++) {
        if (!open[i] || c[i] <= 0) continue;
        const u = []; let f = 0; for (const j of A[i]) { if (flag[j]) f++; else if (!open[j]) u.push(j); }
        if (!u.length) continue;
        const m = c[i] - f;
        if (m === 0) { u.forEach(flood); changed = true; }
        else if (m === u.length) { u.forEach(j => { mark(j); }); changed = true; }
        else cons.push({ u, m, set: new Set(u) });
      }
      if (changed) continue;
      // subset rule: if A's squares are all inside B, the rest of B holds B.m - A.m mines
      for (let x = 0; x < cons.length && !changed; x++) for (let y = 0; y < cons.length && !changed; y++) {
        if (x === y) continue; const P = cons[x], Q = cons[y];
        if (P.u.length >= Q.u.length || !P.u.every(j => Q.set.has(j))) continue;
        const rest = Q.u.filter(j => !P.set.has(j)), m = Q.m - P.m;
        if (m === 0) { rest.forEach(flood); changed = true; } else if (m === rest.length) { rest.forEach(j => { mark(j); }); changed = true; }
      }
      if (changed) continue;
      // overlap rule: A has more mines than fit outside B, so some must be in the shared part
      for (let x = 0; x < cons.length && !changed; x++) for (let y = 0; y < cons.length && !changed; y++) {
        if (x === y) continue; const P = cons[x], Q = cons[y];
        const both = P.u.filter(j => Q.set.has(j)); if (!both.length) continue;
        const pOnly = P.u.length - both.length, qOnly = Q.u.filter(j => !P.set.has(j));
        if (P.m - pOnly === Q.m && qOnly.length) { // shared part holds all of Q's mines -> Q's other squares are safe; P's other squares are mines
          qOnly.forEach(flood); P.u.filter(j => !Q.set.has(j)).forEach(j => { mark(j); }); changed = true;
        }
      }
    }
    return left === 0;
  }
  // mines placed by the random stream, keeping the start square and its neighbours free
  function mineLayout(w, h, n, start, R, A) {
    const N = w * h, keep = new Set([start, ...A[start]]), mine = new Uint8Array(N), spots = [];
    for (let i = 0; i < N; i++) if (!keep.has(i)) spots.push(i);
    R.shuffle(spots); for (let k = 0; k < n; k++) mine[spots[k]] = 1;
    return mine;
  }
  function makeMines(seed, w, h, n, start, noGuess, tries) {
    const A = around(w, h); let t = 0;
    for (; t < (tries || 2000); t++) {
      const R = rng(seed + (t ? '#' + t : '')), mine = mineLayout(w, h, n, start, R, A);
      if (!noGuess || mineSolve(w, h, mine, start, A)) return { w, h, n, start, mine: Array.from(mine), tries: t + 1 };
    }
    return null;
  }
  // daily board: 16 × 16 with 40 mines, starting from a fixed square, solvable without guessing
  function makeDailyMines(key) {
    const R = rng('minestart:' + key), w = 16, h = 16;
    const start = (3 + R.int(10)) * w + 3 + R.int(10);
    const B = makeMines('mines:' + key, w, h, 40, start, true, 5000);
    B.no = dayNo(key); return B;
  }

  const API = { around, mineSolve, makeMines, makeDailyMines, mergeMove, mergeCanMove, mergeSpawn, hash, rng, dayKey, dayNo, weekday, makePath, makeLevel, levelSize, checkPath, solvePath, makeSudoku, solveSudoku, LEVELS };
  root.DiliaPlayGen = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
