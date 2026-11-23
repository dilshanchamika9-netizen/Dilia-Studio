/* Dilia Play: rules and solvers for FreeCell, Pyramid and TriPeaks. Pure integer maths, no Math.random.
   Card c = 0..51, suit = c / 13 | 0 (0 spades, 1 hearts, 2 diamonds, 3 clubs), rank = c % 13 + 1 (1 = Ace, 13 = King).
   Also loaded by dev/tests in Node. */
(function (root) {
  'use strict';
  const rng = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./playgen.js').rng : root.DiliaPlayGen.rng;
  const suit = c => (c / 13) | 0, rank = c => (c % 13) + 1, red = c => suit(c) === 1 || suit(c) === 2;
  const deck = () => Array.from({ length: 52 }, (_, i) => i);

  // =====================================================================================
  // FREECELL. Deals use the classic numbering (1 to 32000). Every one of them can be won except number 11982,
  // which is never dealt here.
  // state: { col: 8 piles (bottom first, last = top), cell: 4 slots (-1 = empty), fnd: [4 ints], no: deal number }
  // move: { a:'c'|'f', i, n, b:'c'|'f'|'h', j }  a = from column / cell, i = its number, n = how many cards,
  //       b = to column / cell / home, j = its number
  // =====================================================================================
  const FC_BAD = 11982;
  function fcDeal(no) {
    let seed = no >>> 0; const w = deck(), col = [[], [], [], [], [], [], [], []]; let left = 52;
    for (let i = 0; i < 52; i++) {
      seed = (Math.imul(seed, 214013) + 2531011) >>> 0;
      const j = ((seed >>> 16) & 0x7fff) % left, x = w[j]; w[j] = w[--left];
      col[i % 8].push([3, 2, 1, 0][x & 3] * 13 + (x >> 2));   // x & 3: clubs, diamonds, hearts, spades
    }
    return { col, cell: [-1, -1, -1, -1], fnd: [0, 0, 0, 0], no };
  }
  const fcNumber = r => { let n = 1 + Math.floor(r * 32000); if (n === FC_BAD) n++; return n; };
  const fcCopy = s => ({ col: s.col.map(p => p.slice()), cell: s.cell.slice(), fnd: s.fnd.slice(), no: s.no });
  const fcWon = s => s.fnd.every(r => r === 13);
  const fcFits = (c, d) => red(c) !== red(d) && rank(d) === rank(c) + 1;   // card c can sit on card d
  const fcRun = (p, n) => { for (let k = p.length - n + 1; k < p.length; k++) if (!fcFits(p[k], p[k - 1])) return false; return true; };
  // most cards that can move together: (free cells + 1) x 2^(empty columns), not counting an empty destination
  function fcMax(s, toEmpty) { const f = s.cell.filter(c => c < 0).length; let e = s.col.filter(p => !p.length).length; if (toEmpty) e--; return (f + 1) * Math.pow(2, Math.max(0, e)); }
  function fcLegal(s, m) {
    let run;
    if (m.a === 'c') { const p = s.col[m.i]; if (!p || m.n < 1 || m.n > p.length || !fcRun(p, m.n)) return false; run = p.slice(p.length - m.n); }
    else if (m.a === 'f') { if (m.n !== 1 || s.cell[m.i] == null || s.cell[m.i] < 0) return false; run = [s.cell[m.i]]; }
    else return false;
    if (m.b === 'c') {
      const d = s.col[m.j]; if (!d || (m.a === 'c' && m.i === m.j)) return false;
      if (m.n > fcMax(s, !d.length)) return false;
      return d.length ? fcFits(run[0], d[d.length - 1]) : true;
    }
    if (m.b === 'f') return m.n === 1 && s.cell[m.j] === -1 && !(m.a === 'f' && m.i === m.j);
    if (m.b === 'h') return m.n === 1 && s.fnd[suit(run[0])] === rank(run[0]) - 1;
    return false;
  }
  function fcApply(s0, m) {
    const s = fcCopy(s0); let run;
    if (m.a === 'c') run = s.col[m.i].splice(s.col[m.i].length - m.n); else { run = [s.cell[m.i]]; s.cell[m.i] = -1; }
    if (m.b === 'c') s.col[m.j].push(...run); else if (m.b === 'f') s.cell[m.j] = run[0]; else s.fnd[suit(run[0])]++;
    return s;
  }
  // send every card that can go home straight home. Returns the moves; they win the game when the state is won afterwards.
  function fcHomeRun(s0) {
    let s = fcCopy(s0); const out = [];
    for (let again = true; again;) {
      again = false;
      for (let i = 0; i < 8 && !again; i++) { const p = s.col[i]; if (p.length && s.fnd[suit(p[p.length - 1])] === rank(p[p.length - 1]) - 1) { const m = { a: 'c', i, n: 1, b: 'h', j: 0 }; s = fcApply(s, m); out.push(m); again = true; } }
      for (let i = 0; i < 4 && !again; i++) { const c = s.cell[i]; if (c >= 0 && s.fnd[suit(c)] === rank(c) - 1) { const m = { a: 'f', i, n: 1, b: 'h', j: 0 }; s = fcApply(s, m); out.push(m); again = true; } }
    }
    return { moves: out, s, won: fcWon(s) };
  }
  // Best-first solver (single-card moves). Used by the tests to check deals; the page does not need it.
  function fcSolve(s0, budget) {
    budget = budget || 60000;
    const home = s => s.fnd[0] + s.fnd[1] + s.fnd[2] + s.fnd[3];
    const key = s => s.col.map(p => p.join('.')).sort().join('|') + '/' + s.cell.filter(c => c >= 0).sort((a, b) => a - b).join('.') + '/' + s.fnd.join('.');
    const heur = s => {
      let h = 3 * (52 - home(s)) + 1.5 * s.cell.filter(c => c >= 0).length;
      for (const p of s.col) for (let i = 0; i < p.length; i++) { if (i && !fcFits(p[i], p[i - 1])) h += 1; for (let j = i + 1; j < p.length; j++) if (rank(p[j]) > rank(p[i])) { h += 0.5; break; } }
      return h;
    };
    const heap = []; let uid = 0;
    const push = n => { heap.push(n); let i = heap.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (heap[q].f <= heap[i].f) break; [heap[q], heap[i]] = [heap[i], heap[q]]; i = q; } };
    const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { let a = 2 * i + 1, b = a + 1, m = i; if (a < heap.length && heap[a].f < heap[m].f) m = a; if (b < heap.length && heap[b].f < heap[m].f) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
    push({ s: s0, f: heur(s0), g: 0, pr: null, mv: null, u: uid++ });
    const seen = new Set([key(s0)]); let nodes = 0;
    while (heap.length) {
      const n = pop(); const s = n.s;
      if (fcWon(s)) { const out = []; for (let x = n; x && x.mv; x = x.pr) out.push(x.mv); return { won: true, nodes, moves: out.reverse() }; }
      if (++nodes > budget) return { won: false, nodes, cut: true };
      const cand = [];
      const srcs = [];
      for (let i = 0; i < 8; i++) if (s.col[i].length) srcs.push({ a: 'c', i });
      for (let i = 0; i < 4; i++) if (s.cell[i] >= 0) srcs.push({ a: 'f', i });
      for (const sr of srcs) {
        const p = sr.a === 'c' ? s.col[sr.i] : null, c = sr.a === 'c' ? p[p.length - 1] : s.cell[sr.i];
        cand.push({ a: sr.a, i: sr.i, n: 1, b: 'h', j: 0 });
        let triedEmpty = false;
        for (let j = 0; j < 8; j++) {
          if (sr.a === 'c' && sr.i === j) continue;
          const d = s.col[j];
          if (!d.length) { if (triedEmpty || (p && p.length === 1)) continue; triedEmpty = true; }
          cand.push({ a: sr.a, i: sr.i, n: 1, b: 'c', j });
        }
        if (sr.a === 'c') { const fi = s.cell.indexOf(-1); if (fi >= 0) cand.push({ a: 'c', i: sr.i, n: 1, b: 'f', j: fi }); }
      }
      for (const m of cand) {
        if (!fcLegal(s, m)) continue;
        const t = fcApply(s, m), k = key(t); if (seen.has(k)) continue; seen.add(k);
        push({ s: t, f: heur(t) + 0.3 * (n.g + 1), g: n.g + 1, pr: n, mv: m, u: uid++ });
      }
    }
    return { won: false, nodes };
  }

  // =====================================================================================
  // PYRAMID. 28 cards in a pyramid (row r has r + 1 cards, index = r (r + 1) / 2 + k), 24 in the stock.
  // Take away two free cards that add up to 13 (Ace = 1, Jack = 11, Queen = 12), or one free King.
  // The stock turns one card at a time onto the waste, with as many passes as you like.
  // state: { pyr: 28 cards (-1 = gone), stock: [...] (last = top), waste: [...] (last = top) }
  // move: { t:'draw' } or { t:'rem', a, b }  a, b = pyramid index 0..27, 28 = the waste card, b = -1 for a King alone
  // =====================================================================================
  const PY_KIDS = [];
  for (let r = 0, i = 0; r < 7; r++) for (let k = 0; k <= r; k++, i++) PY_KIDS.push(r < 6 ? [(r + 1) * (r + 2) / 2 + k, (r + 1) * (r + 2) / 2 + k + 1] : []);
  const PY_WASTE = 28;
  function pyDeal(seed) { const d = rng(seed).shuffle(deck()); return { pyr: d.slice(0, 28), stock: d.slice(28).reverse(), waste: [] }; }
  const pyCopy = s => ({ pyr: s.pyr.slice(), stock: s.stock.slice(), waste: s.waste.slice() });
  const pyWon = s => s.pyr.every(c => c < 0);
  const pyFree = (s, i) => s.pyr[i] >= 0 && PY_KIDS[i].every(k => s.pyr[k] < 0);
  const pyCard = (s, i) => (i === PY_WASTE ? (s.waste.length ? s.waste[s.waste.length - 1] : -1) : (i >= 0 && i < 28 && pyFree(s, i) ? s.pyr[i] : -1));
  function pyLegal(s, m) {
    if (m.t === 'draw') return s.stock.length > 0 || s.waste.length > 0;
    if (m.t !== 'rem') return false;
    const x = pyCard(s, m.a); if (x < 0) return false;
    if (m.b === -1) return rank(x) === 13;
    if (m.a === m.b) return false;
    const y = pyCard(s, m.b); return y >= 0 && rank(x) + rank(y) === 13;
  }
  function pyApply(s0, m) {
    const s = pyCopy(s0);
    if (m.t === 'draw') { if (s.stock.length) s.waste.push(s.stock.pop()); else { s.stock = s.waste.reverse(); s.waste = []; } return s; }
    for (const i of [m.a, m.b]) if (i === PY_WASTE) s.waste.pop(); else if (i >= 0) s.pyr[i] = -1;
    return s;
  }
  // Solver. With unlimited passes every stock card can be brought to the waste, so the stock and the waste form one open pool.
  function pySolve(s0, budget) {
    budget = budget || 150000;
    const pool = [...s0.stock, ...s0.waste];
    let mask = 0; for (let i = 0; i < 28; i++) if (s0.pyr[i] >= 0) mask += Math.pow(2, i);
    const bit = i => Math.pow(2, i), has = (m, i) => Math.floor(m / bit(i)) % 2 === 1;
    const freeIn = (m, i) => has(m, i) && PY_KIDS[i].every(k => !has(m, k));
    const dead = new Set(); let nodes = 0;
    const cardAt = s0.pyr;
    function dfs(m, p, path) {
      if (m === 0) return true;
      const key = m * 16777216 + p; if (dead.has(key)) return false;
      if (++nodes > budget) return false;
      const fr = []; for (let i = 0; i < 28; i++) if (freeIn(m, i)) fr.push(i);
      // kings first
      for (const i of fr) if (rank(cardAt[i]) === 13) { path.push({ a: i, b: -1, c: -1 }); if (dfs(m - bit(i), p, path)) return true; path.pop(); }
      for (let q = 0; q < pool.length; q++) if (p & (1 << q) && rank(pool[q]) === 13) { path.push({ a: PY_WASTE, b: -1, c: pool[q] }); if (dfs(m, p & ~(1 << q), path)) return true; path.pop(); }
      for (let x = 0; x < fr.length; x++) for (let y = x + 1; y < fr.length; y++) {
        if (rank(cardAt[fr[x]]) + rank(cardAt[fr[y]]) !== 13) continue;
        path.push({ a: fr[x], b: fr[y], c: -1 }); if (dfs(m - bit(fr[x]) - bit(fr[y]), p, path)) return true; path.pop();
      }
      for (const i of fr) for (let q = 0; q < pool.length; q++) {
        if (!(p & (1 << q)) || rank(cardAt[i]) + rank(pool[q]) !== 13) continue;
        path.push({ a: i, b: PY_WASTE, c: pool[q] }); if (dfs(m - bit(i), p & ~(1 << q), path)) return true; path.pop();
      }
      dead.add(key); return false;
    }
    const path = [], full = pool.length >= 31 ? 0 : (1 << pool.length) - 1;
    const won = dfs(mask, full, path);
    return { won, nodes, moves: won ? path : null };
  }
  // turn the solver's path into real moves (draw until the pool card is on top of the waste)
  function pyReplay(s0, path) {
    let s = pyCopy(s0); const real = [];
    const doit = m => { if (!pyLegal(s, m)) throw new Error('illegal ' + JSON.stringify(m)); s = pyApply(s, m); real.push(m); };
    for (const st of path) {
      if (st.c >= 0) { let g = 0; while (s.waste[s.waste.length - 1] !== st.c) { if (++g > 60) throw new Error('card not in stock'); doit({ t: 'draw' }); } }
      doit({ t: 'rem', a: st.a, b: st.b });
    }
    return { won: pyWon(s), real, s };
  }
  function pyWinnable(seed, budget, tries) {
    for (let t = 0; t < (tries || 40); t++) { const d = pyDeal(seed + (t ? '#' + t : '')); if (pySolve(d, budget).won) { d.tries = t + 1; return d; } }
    return null;
  }

  // =====================================================================================
  // TRIPEAKS. 28 cards in three peaks, one card on the waste, 23 in the stock (no second pass).
  // Play a free card one rank above or below the waste card (King and Ace count as neighbours). Clear all 28 cards.
  // state: { pk: 28 cards (-1 = gone), stock: [...] (last = top), waste: [...] }
  // move: { t:'draw' } or { t:'play', i }
  // =====================================================================================
  const TP_ROWS = [[1.5, 4.5, 7.5], [1, 2, 4, 5, 7, 8], [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]];
  const TP_X = [], TP_ROW = [];
  TP_ROWS.forEach((xs, r) => xs.forEach(x => { TP_X.push(x); TP_ROW.push(r); }));
  const TP_COVER = TP_X.map((x, i) => { const out = []; if (TP_ROW[i] < 3) for (let j = 0; j < 28; j++) if (TP_ROW[j] === TP_ROW[i] + 1 && Math.abs(TP_X[j] - x) === 0.5) out.push(j); return out; });
  function tpDeal(seed) { const d = rng(seed).shuffle(deck()), rest = d.slice(28); return { pk: d.slice(0, 28), stock: rest.slice(1).reverse(), waste: [rest[0]] }; }
  const tpCopy = s => ({ pk: s.pk.slice(), stock: s.stock.slice(), waste: s.waste.slice() });
  const tpWon = s => s.pk.every(c => c < 0);
  const tpFree = (s, i) => s.pk[i] >= 0 && TP_COVER[i].every(k => s.pk[k] < 0);
  const tpNear = (c, d) => { const x = Math.abs(rank(c) - rank(d)); return x === 1 || x === 12; };
  function tpLegal(s, m) {
    if (m.t === 'draw') return s.stock.length > 0;
    if (m.t === 'play') return m.i >= 0 && m.i < 28 && tpFree(s, m.i) && s.waste.length > 0 && tpNear(s.pk[m.i], s.waste[s.waste.length - 1]);
    return false;
  }
  function tpApply(s0, m) { const s = tpCopy(s0); if (m.t === 'draw') s.waste.push(s.stock.pop()); else { s.waste.push(s.pk[m.i]); s.pk[m.i] = -1; } return s; }
  const tpStuck = s => !tpWon(s) && !s.stock.length && !s.pk.some((c, i) => tpLegal(s, { t: 'play', i }));
  function tpSolve(s0, budget) {
    budget = budget || 200000;
    const seq = s0.stock.slice().reverse(); let mask = 0; for (let i = 0; i < 28; i++) if (s0.pk[i] >= 0) mask += Math.pow(2, i);
    const bit = i => Math.pow(2, i), has = (m, i) => Math.floor(m / bit(i)) % 2 === 1;
    const free = (m, i) => has(m, i) && TP_COVER[i].every(k => !has(m, k));
    const dead = new Set(); let nodes = 0;
    function dfs(m, p, top, path) {
      if (m === 0) return true;
      const key = (m * 32 + p) * 64 + top; if (dead.has(key)) return false;
      if (++nodes > budget) return false;
      for (let i = 27; i >= 0; i--) if (free(m, i) && tpNear(s0.pk[i], top)) { path.push({ t: 'play', i }); if (dfs(m - bit(i), p, s0.pk[i], path)) return true; path.pop(); }
      if (p < seq.length) { path.push({ t: 'draw' }); if (dfs(m, p + 1, seq[p], path)) return true; path.pop(); }
      dead.add(key); return false;
    }
    const path = [], won = dfs(mask, 0, s0.waste[s0.waste.length - 1], path);
    return { won, nodes, moves: won ? path : null };
  }
  function tpReplay(s0, path) {
    let s = tpCopy(s0); const real = [];
    for (const m of path) { if (!tpLegal(s, m)) throw new Error('illegal ' + JSON.stringify(m)); s = tpApply(s, m); real.push(m); }
    return { won: tpWon(s), real, s };
  }
  function tpWinnable(seed, budget, tries) {
    for (let t = 0; t < (tries || 80); t++) { const d = tpDeal(seed + (t ? '#' + t : '')); if (tpSolve(d, budget).won) { d.tries = t + 1; return d; } }
    return null;
  }


  // =====================================================================================
  // SPIDER. Two packs (104 cards), 10 columns, 1, 2 or 4 suits. Card c = 0..103: rank = c % 13 + 1, pack group g = c / 13 | 0.
  // Build down in rank on any card; only a run of one suit moves together. A full King-to-Ace run of one suit leaves the table.
  // state: { tab: 10 piles of { c, up }, stock: [50 cards, last = next], home: [completed runs, 13 cards each], suits }
  // move: { t:'mv', from, i, to } (move the cards from index i of column from onto column to) or { t:'deal' }
  // =====================================================================================
  const spSuit = (S, c) => { const g = (c / 13) | 0; return S.suits === 1 ? 0 : g % S.suits; };
  const spRank = c => (c % 13) + 1;
  function spDeal(seed, suits) {
    const d = rng(seed).shuffle(Array.from({ length: 104 }, (_, i) => i)), tab = []; let k = 0;
    for (let col = 0; col < 10; col++) { const n = col < 4 ? 6 : 5, p = []; for (let r = 0; r < n; r++) p.push({ c: d[k++], up: r === n - 1 }); tab.push(p); }
    return { tab, stock: d.slice(k), home: [], suits };
  }
  const spCopy = s => ({ tab: s.tab.map(p => p.map(x => ({ c: x.c, up: x.up }))), stock: s.stock.slice(), home: s.home.map(h => h.slice()), suits: s.suits });
  const spWon = s => s.home.length === 8;
  const spRunOk = (s, p, i) => { if (i < 0 || i >= p.length || !p[i].up) return false; for (let k = i + 1; k < p.length; k++) if (!p[k].up || spSuit(s, p[k].c) !== spSuit(s, p[k - 1].c) || spRank(p[k].c) !== spRank(p[k - 1].c) - 1) return false; return true; };
  function spLegal(s, m) {
    if (m.t === 'deal') return s.stock.length >= 10 && s.tab.every(p => p.length > 0);
    if (m.t !== 'mv' || m.from === m.to) return false;
    const p = s.tab[m.from], d = s.tab[m.to]; if (!p || !d || !spRunOk(s, p, m.i)) return false;
    return !d.length || (d[d.length - 1].up && spRank(d[d.length - 1].c) === spRank(p[m.i].c) + 1);
  }
  function spClear(s, col) {
    const p = s.tab[col]; if (p.length < 13) return false;
    const n = p.length, su = spSuit(s, p[n - 1].c);
    for (let k = 0; k < 13; k++) { const x = p[n - 1 - k]; if (!x.up || spRank(x.c) !== k + 1 || spSuit(s, x.c) !== su) return false; }
    s.home.push(p.splice(n - 13).map(x => x.c)); if (p.length) p[p.length - 1].up = true; return true;
  }
  function spApply(s0, m) {
    const s = spCopy(s0);
    if (m.t === 'deal') { for (let col = 0; col < 10; col++) s.tab[col].push({ c: s.stock.pop(), up: true }); for (let col = 0; col < 10; col++) spClear(s, col); return s; }
    const run = s.tab[m.from].splice(m.i); s.tab[m.to].push(...run);
    const f = s.tab[m.from]; if (f.length) f[f.length - 1].up = true;
    spClear(s, m.to); return s;
  }
  // every legal card move (one per source card, to each target)
  function spMoves(s) {
    const out = [];
    for (let f = 0; f < 10; f++) { const p = s.tab[f]; for (let i = 0; i < p.length; i++) if (spRunOk(s, p, i)) for (let t = 0; t < 10; t++) { const m = { t: 'mv', from: f, i, to: t }; if (spLegal(s, m)) out.push(m); } }
    return out;
  }

  // =====================================================================================
  // MAHJONG SOLITAIRE ("turtle" layout, 144 tiles). Take away two free tiles with the same face. A tile is free when nothing lies
  // on top of it and its left side or its right side is open. Deals are built backwards, so every deal can be cleared.
  // Positions are in half-tile units: a tile covers x..x+2 and y..y+2. state: { face: 144 faces (-1 = gone) }
  // Faces 0-8 dots, 9-17 bamboo, 18-26 characters, 27-30 winds, 31-33 dragons, 34 flowers, 35 seasons (4 of each face).
  // move: { a, b } two tile numbers
  // =====================================================================================
  const MJ = [];
  const mjRow = (z, y, x0, x1) => { for (let x = x0; x <= x1; x += 2) MJ.push({ x, y, z }); };
  mjRow(0, 0, 2, 24); mjRow(0, 2, 6, 20); mjRow(0, 4, 4, 22); mjRow(0, 6, 2, 24); MJ.push({ x: 0, y: 7, z: 0 }, { x: 26, y: 7, z: 0 }, { x: 28, y: 7, z: 0 });
  mjRow(0, 8, 2, 24); mjRow(0, 10, 4, 22); mjRow(0, 12, 6, 20); mjRow(0, 14, 2, 24);
  for (let y = 2; y <= 12; y += 2) mjRow(1, y, 8, 18);
  for (let y = 4; y <= 10; y += 2) mjRow(2, y, 10, 16);
  mjRow(3, 6, 12, 14); mjRow(3, 8, 12, 14); MJ.push({ x: 13, y: 7, z: 4 });
  const MJ_BLOCK = MJ.map((a, i) => MJ.map((b, j) => ({ b, j })).filter(o => o.b.z > a.z && Math.abs(o.b.x - a.x) < 2 && Math.abs(o.b.y - a.y) < 2).map(o => o.j));
  const MJ_LEFT = MJ.map((a, i) => MJ.map((b, j) => ({ b, j })).filter(o => o.b.z === a.z && o.b.x === a.x - 2 && Math.abs(o.b.y - a.y) < 2).map(o => o.j));
  const MJ_RIGHT = MJ.map((a, i) => MJ.map((b, j) => ({ b, j })).filter(o => o.b.z === a.z && o.b.x === a.x + 2 && Math.abs(o.b.y - a.y) < 2).map(o => o.j));
  const mjCopy = s => ({ face: s.face.slice() });
  const mjWon = s => s.face.every(f => f < 0);
  const mjFree = (s, i) => s.face[i] >= 0 && MJ_BLOCK[i].every(j => s.face[j] < 0) && (MJ_LEFT[i].every(j => s.face[j] < 0) || MJ_RIGHT[i].every(j => s.face[j] < 0));
  const mjLegal = (s, m) => m.a !== m.b && m.a >= 0 && m.b >= 0 && m.a < 144 && m.b < 144 && s.face[m.a] >= 0 && s.face[m.a] === s.face[m.b] && mjFree(s, m.a) && mjFree(s, m.b);
  function mjApply(s0, m) { const s = mjCopy(s0); s.face[m.a] = -1; s.face[m.b] = -1; return s; }
  function mjMoves(s) {
    const fr = []; for (let i = 0; i < 144; i++) if (mjFree(s, i)) fr.push(i);
    const out = []; for (let x = 0; x < fr.length; x++) for (let y = x + 1; y < fr.length; y++) if (s.face[fr[x]] === s.face[fr[y]]) out.push({ a: fr[x], b: fr[y] });
    return out;
  }
  // put the given pairs of faces on the given positions so that the whole set can be cleared: take two free tiles, give them a pair, repeat
  function mjFill(positions, pairs, R) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const face = Array(144).fill(-1), left = new Set(positions), queue = R.shuffle(pairs.slice()); let okay = true;
      const free = i => MJ_BLOCK[i].every(j => !left.has(j)) && (MJ_LEFT[i].every(j => !left.has(j)) || MJ_RIGHT[i].every(j => !left.has(j)));
      while (left.size) {
        const fr = []; for (const i of left) if (free(i)) fr.push(i);
        if (fr.length < 2) { okay = false; break; }
        const a = fr.splice(R.int(fr.length), 1)[0], b = fr[R.int(fr.length)], pr = queue.pop();
        face[a] = pr; face[b] = pr; left.delete(a); left.delete(b);
      }
      if (okay) return { face };
    }
    return null;
  }
  function mjDeal(seed) {
    const R = rng(seed), pairs = []; for (let f = 0; f < 36; f++) pairs.push(f, f);
    return mjFill(Array.from({ length: 144 }, (_, i) => i), pairs, R);
  }
  // mix the tiles that are left (when no pair is open): same tiles, new places, still clearable
  function mjShuffle(s, seed) {
    const R = rng(seed), pos = [], count = {}; s.face.forEach((f, i) => { if (f >= 0) { pos.push(i); count[f] = (count[f] || 0) + 1; } });
    const pairs = []; for (const f in count) for (let k = 0; k < count[f] / 2; k++) pairs.push(+f);
    return mjFill(pos, pairs, R) || mjCopy(s);
  }

  const API = { suit, rank, red, FC_BAD, fcDeal, fcNumber, fcCopy, fcWon, fcFits, fcRun, fcMax, fcLegal, fcApply, fcHomeRun, fcSolve,
    PY_KIDS, PY_WASTE, pyDeal, pyCopy, pyWon, pyFree, pyCard, pyLegal, pyApply, pySolve, pyReplay, pyWinnable,
    TP_X, TP_ROW, TP_COVER, spSuit, spRank, spDeal, spCopy, spWon, spRunOk, spLegal, spApply, spMoves, MJ, mjCopy, mjWon, mjFree, mjLegal, mjApply, mjMoves, mjDeal, mjShuffle, tpDeal, tpCopy, tpWon, tpFree, tpNear, tpLegal, tpApply, tpStuck, tpSolve, tpReplay, tpWinnable };
  root.DiliaCards = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
