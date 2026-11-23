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

  // =====================================================================================
  // SOLITAIRE (Klondike): card c = 0..51, suit = c / 13 | 0 (0 spades, 1 hearts, 2 diamonds, 3 clubs), rank = c % 13 + 1
  // =====================================================================================
  const suit = c => (c / 13) | 0, rank = c => (c % 13) + 1, red = c => suit(c) === 1 || suit(c) === 2;
  function klDeal(seed, draw) {
    const R = rng(seed), deck = R.shuffle(Array.from({ length: 52 }, (_, i) => i)), tab = [];
    let k = 0;
    for (let col = 0; col < 7; col++) { const pile = []; for (let r = 0; r <= col; r++) pile.push({ c: deck[k++], up: r === col }); tab.push(pile); }
    return { tab, fnd: [0, 0, 0, 0], stock: deck.slice(k).reverse(), waste: [], draw: draw || 1 };
  }
  const klCopy = s => ({ tab: s.tab.map(p => p.map(x => ({ c: x.c, up: x.up }))), fnd: s.fnd.slice(), stock: s.stock.slice(), waste: s.waste.slice(), draw: s.draw });
  const fits = (c, pile) => (pile.length ? (() => { const t = pile[pile.length - 1]; return t.up && red(t.c) !== red(c) && rank(t.c) === rank(c) + 1; })() : rank(c) === 13);
  const toF = (s, c) => s.fnd[suit(c)] === rank(c) - 1;
  // is a move allowed? m: {t:'draw'} {t:'wf'} {t:'wt',to} {t:'tf',from} {t:'tt',from,i,to} {t:'ft',s,to}
  function klLegal(s, m) {
    const w = s.waste[s.waste.length - 1];
    switch (m.t) {
      case 'draw': return s.stock.length > 0 || s.waste.length > 0;
      case 'wf': return w != null && toF(s, w);
      case 'wt': return w != null && fits(w, s.tab[m.to]);
      case 'tf': { const p = s.tab[m.from], t = p[p.length - 1]; return !!t && t.up && toF(s, t.c); }
      case 'tt': { const p = s.tab[m.from], x = p[m.i]; if (!x || !x.up || m.from === m.to) return false;
        for (let k = m.i + 1; k < p.length; k++) { const a = p[k - 1].c, b = p[k].c; if (red(a) === red(b) || rank(a) !== rank(b) + 1) return false; }
        return fits(x.c, s.tab[m.to]); }
      case 'ft': { const r = s.fnd[m.s]; return r > 0 && fits(m.s * 13 + r - 1, s.tab[m.to]); }
    }
    return false;
  }
  // apply a legal move; returns the new state and whether a hidden card was turned over
  function klApply(s0, m) {
    const s = klCopy(s0); let flip = -1;
    const turn = col => { const p = s.tab[col], t = p[p.length - 1]; if (t && !t.up) { t.up = true; flip = col; } };
    if (m.t === 'draw') {
      if (s.stock.length) { for (let k = 0; k < s.draw && s.stock.length; k++) s.waste.push(s.stock.pop()); }
      else { s.stock = s.waste.reverse(); s.waste = []; }
    } else if (m.t === 'wf') { const c = s.waste.pop(); s.fnd[suit(c)]++; }
    else if (m.t === 'wt') { s.tab[m.to].push({ c: s.waste.pop(), up: true }); }
    else if (m.t === 'tf') { const c = s.tab[m.from].pop().c; s.fnd[suit(c)]++; turn(m.from); }
    else if (m.t === 'tt') { const run = s.tab[m.from].splice(m.i); s.tab[m.to].push(...run); turn(m.from); }
    else if (m.t === 'ft') { const c = m.s * 13 + s.fnd[m.s] - 1; s.fnd[m.s]--; s.tab[m.to].push({ c, up: true }); }
    return { s, flip };
  }
  const klWon = s => s.fnd.every(r => r === 13);
  // a card can go home without hurting play when both cards of the other colour one rank lower are already home
  const safeHome = (s, c) => rank(c) <= 2 || (red(c) ? Math.min(s.fnd[0], s.fnd[3]) : Math.min(s.fnd[1], s.fnd[2])) >= rank(c) - 1;

  // Solver for draw-1 deals. With unlimited passes through the stock, every stock card can be reached,
  // so the stock is treated as an open pool. Piles: [hiddenCount, ...faceUpCards].
  function klSolve(d, budget) {
    budget = budget || 60000;
    const start = { tab: d.tab.map(p => { const up = p.filter(x => x.up).map(x => x.c); return [p.length - up.length, ...up]; }), fnd: d.fnd.slice(), pool: [...d.stock, ...d.waste].sort((a, b) => a - b) };
    const seen = new Set(); let nodes = 0;
    const key = st => st.tab.map(p => p.join('.')).sort().join('|') + '/' + st.fnd.join(',') + '/' + st.pool.join('.');
    const cp = (st, pr, mv) => ({ tab: st.tab.map(p => p.slice()), fnd: st.fnd.slice(), pool: st.pool.slice(), pr: pr || null, mv: mv || null });
    const path = st => { const out = []; for (let x = st; x && x.mv; x = x.pr) out.push(x.mv); return out.reverse(); };
    const top = p => (p.length > 1 ? p[p.length - 1] : -1);
    const fitsP = (c, p) => (p.length > 1 ? red(p[p.length - 1]) !== red(c) && rank(p[p.length - 1]) === rank(c) + 1 : p[0] === 0 && rank(c) === 13);
    const stack = [start];
    // hidden cards: we know them from the deal (the solver may look: it only decides whether a deal is winnable)
    const hidden = d.tab.map(p => p.filter(x => !x.up).map(x => x.c));
    const turn = (st, f) => { const p = st.tab[f]; if (p.length === 1 && p[0] > 0) { const h = hidden[f][p[0] - 1]; p[0]--; p.push(h); } };
    while (stack.length) {
      let st = stack.pop();
      for (let again = true; again;) { // play safe cards home
        again = false;
        for (let f = 0; f < 7 && !again; f++) { const c = top(st.tab[f]); if (c >= 0 && st.fnd[suit(c)] === rank(c) - 1 && safeHome(st, c)) { st = cp(st, st, { t: 'tf', from: f }); st.tab[f].pop(); st.fnd[suit(c)]++; turn(st, f); again = true; } }
        for (let k = 0; k < st.pool.length && !again; k++) { const c = st.pool[k]; if (st.fnd[suit(c)] === rank(c) - 1 && safeHome(st, c)) { st = cp(st, st, { t: 'pf', c }); st.pool.splice(k, 1); st.fnd[suit(c)]++; again = true; } }
      }
      if (st.fnd.every(r => r === 13)) return { won: true, nodes, moves: path(st) };
      const k = key(st); if (seen.has(k)) continue; seen.add(k);
      if (++nodes > budget) return { won: false, nodes, cut: true };
      const next = [];
      for (let f = 0; f < 7; f++) { const c = top(st.tab[f]); if (c >= 0 && st.fnd[suit(c)] === rank(c) - 1) { const n = cp(st, st, { t: 'tf', from: f }); n.tab[f].pop(); n.fnd[suit(c)]++; turn(n, f); next.push(n); } }
      for (let f = 0; f < 7; f++) {
        const p = st.tab[f]; if (p.length < 2) continue;
        for (let i = 1; i < p.length; i++) for (let t = 0; t < 7; t++) {
          if (t === f || !fitsP(p[i], st.tab[t])) continue;
          const whole = i === 1, uncovers = whole && p[0] > 0, empties = whole && p[0] === 0;
          if (empties && st.tab[t].length === 1) continue;           // king from empty column to empty column
          if (whole && !uncovers && !empties) continue;
          if (!whole) { const u = p[i - 1]; if (st.fnd[suit(u)] !== rank(u) - 1) continue; } // split only to send a card home
          const n = cp(st, st, { t: 'tt', from: f, i: p[0] + i - 1, to: t }); n.tab[t].push(...n.tab[f].splice(i)); turn(n, f); next.push(n);
        }
      }
      for (let j = 0; j < st.pool.length; j++) {
        const c = st.pool[j];
        if (st.fnd[suit(c)] === rank(c) - 1) { const n = cp(st, st, { t: 'pf', c }); n.pool.splice(j, 1); n.fnd[suit(c)]++; next.push(n); }
        for (let t = 0; t < 7; t++) if (fitsP(c, st.tab[t])) { const n = cp(st, st, { t: 'pt', c, to: t }); n.pool.splice(j, 1); n.tab[t].push(c); next.push(n); if (st.tab[t].length === 1) break; }
      }
      for (let j = next.length - 1; j >= 0; j--) stack.push(next[j]);
    }
    return { won: false, nodes };
  }
  // deals that can be won: try seeds in a fixed order until the solver wins one
  // turn the solver's moves into real moves on the real deal (draw until a stock card is on top of the waste)
  function klReplay(d, moves) {
    let s = klCopy(d); const real = [];
    const doit = m => { if (!klLegal(s, m)) throw new Error('illegal ' + JSON.stringify(m)); s = klApply(s, m).s; real.push(m); };
    for (const m of moves) {
      if (m.t === 'pf' || m.t === 'pt') {
        let g = 0; while (s.waste[s.waste.length - 1] !== m.c) { if (++g > 110) throw new Error('card not in stock'); doit({ t: 'draw' }); }
        doit(m.t === 'pf' ? { t: 'wf' } : { t: 'wt', to: m.to });
      } else doit(m);
    }
    return { won: klWon(s), real };
  }
  function klWinnable(seed, budget) {
    for (let t = 0; t < 60; t++) { const d = klDeal(seed + (t ? '#' + t : ''), 1); if (klSolve(d, budget).won) { d.tries = t + 1; return d; } }
    return null;
  }
  const klDaily = key => { const d = klWinnable('solitaire:' + key, 6000); d.no = dayNo(key); return d; };


  // ---- Snake: pure rules (the page does drawing and timing). Directions: 0 up, 1 right, 2 down, 3 left ----
  const SN = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function snakeFree(s) { const occ = new Set(s.body); if (s.food >= 0) occ.add(s.food); if (s.bonus) occ.add(s.bonus.at); const f = []; for (let i = 0; i < s.n * s.n; i++) if (!occ.has(i)) f.push(i); return f; }
  function snakeNew(n, rnd) {
    const m = n >> 1, h = m * n + m, s = { n, body: [h, h - 1, h - 2], dir: 1, food: -1, bonus: null, score: 0, eaten: 0, dead: false, won: false };
    const f = snakeFree(s); s.food = f[rnd(f.length)]; return s;
  }
  // one move. dir: wanted direction (a turn back on itself is ignored). wrap: edges join up. bonusOn: gold star every 5th apple.
  function snakeStep(s, dir, wrap, bonusOn, rnd) {
    const out = { ate: false, bonus: false, dead: false };
    if (s.dead || s.won) return out;
    if (dir != null && dir !== (s.dir + 2) % 4) s.dir = dir;
    const n = s.n, h = s.body[0]; let x = h % n + SN[s.dir][0], y = ((h / n) | 0) + SN[s.dir][1];
    if (x < 0 || y < 0 || x >= n || y >= n) { if (!wrap) { s.dead = out.dead = true; return out; } x = (x + n) % n; y = (y + n) % n; }
    const to = y * n + x, ate = to === s.food, star = !!s.bonus && to === s.bonus.at, grow = ate || star, at = s.body.indexOf(to);
    if (at >= 0 && !(at === s.body.length - 1 && !grow)) { s.dead = out.dead = true; return out; }
    s.body.unshift(to); if (!grow) s.body.pop();
    if (s.bonus) { if (star) s.bonus = null; else if (--s.bonus.left <= 0) s.bonus = null; }
    if (ate) { s.score++; s.eaten++; out.ate = true; }
    if (star) { s.score += 5; out.bonus = true; }
    if (ate || star) {
      let f = snakeFree(s); if (ate && !f.length && s.bonus) { s.bonus = null; f = snakeFree(s); }
      if (ate) { if (!f.length) { s.food = -1; s.won = true; return out; } s.food = f[rnd(f.length)]; }
      if (ate && bonusOn && s.eaten % 5 === 0) { const g = snakeFree(s); if (g.length) s.bonus = { at: g[rnd(g.length)], left: 40 }; }
    }
    return out;
  }
  // typing score. target: words that were shown; typed: what the person typed for each word (the last one may be unfinished).
  // wpm counts only words typed exactly right (+1 for the space after each); raw counts every typed character. 5 characters = 1 word.
  function typingScore(target, typed, seconds, partial) {
    let good = 0, bad = 0, rightChars = 0, all = 0, right = 0;
    typed.forEach((t, i) => {
      const a = Array.from(String(t).normalize('NFC')), w = Array.from(String(target[i]).normalize('NFC')), last = partial && i === typed.length - 1;
      let hit = 0; a.forEach((c, j) => { if (c === w[j]) hit++; });
      good += hit; bad += a.length - hit + (last ? 0 : Math.max(0, w.length - a.length));
      all += a.length + (last ? 0 : 1);
      const exact = a.length === w.length && hit === w.length;
      if (exact && !last) { right++; rightChars += w.length + 1; } else if (last && hit === a.length) rightChars += a.length;
    });
    const min = Math.max(seconds, 1) / 60;
    return { wpm: rightChars / 5 / min, raw: all / 5 / min, acc: good + bad ? good / (good + bad) * 100 : 100, good, bad, words: right };
  }

  const API = { snakeNew, snakeStep, snakeFree, typingScore, klDeal, klLegal, klApply, klWon, klSolve, klReplay, klWinnable, klDaily, klCopy, around, mineSolve, makeMines, makeDailyMines, mergeMove, mergeCanMove, mergeSpawn, hash, rng, dayKey, dayNo, weekday, makePath, makeLevel, levelSize, checkPath, solvePath, makeSudoku, solveSudoku, LEVELS };
  root.DiliaPlayGen = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
