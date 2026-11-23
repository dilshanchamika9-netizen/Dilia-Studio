/* Dilia Play board games: checkers (American rules, 8x8) and reversi (Othello rules). Pure rules and a small alpha-beta computer opponent.
   State objects are never changed in place. side 0 moves first. Used by the pages (board-game.js) and by the Node tests. */
(function (root) {
  'use strict';
  const INF = 1e9;
  // ---------- checkers ----------
  // squares 0..63 = row*8+col, dark squares are (row+col) odd. Side 0 starts at the bottom (rows 5-7) and moves up. Pieces: 1 man0, 2 king0, 3 man1, 4 king1.
  const sideOf = p => (p - 1) >> 1, isKing = p => p === 2 || p === 4;
  const CK = {
    name: 'checkers',
    start() { const b = new Array(64).fill(0); for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) & 1) { if (r < 3) b[r * 8 + c] = 3; else if (r > 4) b[r * 8 + c] = 1; } return { b, side: 0, quiet: 0, n: 0 }; },
    moves(s) {
      const jumps = [], steps = [], b = s.b;
      for (let i = 0; i < 64; i++) {
        const p = b[i]; if (!p || sideOf(p) !== s.side) continue; const king = isKing(p);
        const dirs = king ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : s.side === 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
        const dfs = (pos, path, caps, board) => {
          let any = false;
          for (const [dr, dc] of (king ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : dirs)) {
            const r = (pos >> 3) + dr, c = (pos & 7) + dc, r2 = r + dr, c2 = c + dc; if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) continue;
            const m = r * 8 + c, t = r2 * 8 + c2, q = board[m]; if (!q || sideOf(q) === s.side || caps.includes(m) || (board[t] && t !== i)) continue;
            any = true; const np = path.concat(t), nc = caps.concat(m), crown = !king && (s.side === 0 ? r2 === 0 : r2 === 7);
            if (crown) jumps.push({ path: np, caps: nc }); else { const before = jumps.length; dfs(t, np, nc, board); if (jumps.length === before) jumps.push({ path: np, caps: nc }); }
          }
          return any;
        };
        dfs(i, [i], [], b);
        for (const [dr, dc] of dirs) { const r = (i >> 3) + dr, c = (i & 7) + dc; if (r < 0 || r > 7 || c < 0 || c > 7) continue; if (!b[r * 8 + c]) steps.push({ path: [i, r * 8 + c], caps: [] }); }
      }
      return jumps.length ? jumps : steps;
    },
    apply(s, m) {
      const b = s.b.slice(), from = m.path[0], to = m.path[m.path.length - 1]; let p = b[from]; b[from] = 0; for (const x of m.caps) b[x] = 0;
      const crowned = !isKing(p) && (s.side === 0 ? to >> 3 === 0 : to >> 3 === 7); if (crowned) p = s.side === 0 ? 2 : 4; b[to] = p;
      return { b, side: s.side ^ 1, quiet: (m.caps.length || (!isKing(s.b[from]))) ? 0 : s.quiet + 1, n: s.n + 1 };
    },
    result(s) { if (s.quiet >= 80) return -1; return this.moves(s).length ? null : s.side ^ 1; },   // winner side, -1 draw, null = going on
    eval(s) {
      let v = 0; for (let i = 0; i < 64; i++) { const p = s.b[i]; if (!p) continue; const sd = sideOf(p), r = i >> 3, c = i & 7; let x;
        if (isKing(p)) x = 165 + (c > 1 && c < 6 && r > 1 && r < 6 ? 6 : 0); else { const adv = sd === 0 ? 7 - r : r; x = 100 + adv * 4 + ((sd === 0 ? r === 7 : r === 0) ? 8 : 0) + (c === 0 || c === 7 ? -2 : 0); }
        v += sd === s.side ? x : -x; }
      return v;
    },
    cells(s) { return s.b.map(p => (p ? { side: sideOf(p), king: isKing(p) } : null)); },
    playable: i => ((i >> 3) + (i & 7)) & 1
  };
  // ---------- reversi ----------
  // cells hold 0 empty, 1 side 0 (black), 2 side 1 (white). Black moves first.
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const W = [100, -25, 10, 5, -25, -45, 1, 1, 10, 1, 3, 2, 5, 1, 2, 1];   // one corner quadrant, mirrored
  const WTAB = []; for (let i = 0; i < 64; i++) { const r = i >> 3, c = i & 7; WTAB.push(W[(r > 3 ? 7 - r : r) * 4 + (c > 3 ? 7 - c : c)]); }
  function flips(b, i, me) {
    const out = [], r0 = i >> 3, c0 = i & 7, opp = 3 - me;
    for (const [dr, dc] of DIRS) { let r = r0 + dr, c = c0 + dc; const line = []; while (r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === opp) { line.push(r * 8 + c); r += dr; c += dc; } if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === me) out.push(...line); }
    return out;
  }
  const RV = {
    name: 'reversi',
    start() { const b = new Array(64).fill(0); b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2; return { b, side: 0, n: 0, passes: 0 }; },
    moves(s) { const me = s.side + 1, out = []; for (let i = 0; i < 64; i++) if (!s.b[i]) { const f = flips(s.b, i, me); if (f.length) out.push({ at: i, flips: f }); } return out; },
    apply(s, m) {
      if (m.pass) return { b: s.b, side: s.side ^ 1, n: s.n, passes: s.passes + 1 };
      const b = s.b.slice(); b[m.at] = s.side + 1; for (const x of m.flips) b[x] = s.side + 1; return { b, side: s.side ^ 1, n: s.n + 1, passes: 0 };
    },
    // a side with no move passes if the other side can move
    legal(s) { const mv = this.moves(s); if (mv.length) return mv; const o = this.moves({ b: s.b, side: s.side ^ 1 }); return o.length ? [{ pass: true }] : []; },
    count(s) { let a = 0, c = 0; for (const v of s.b) { if (v === 1) a++; else if (v === 2) c++; } return [a, c]; },
    result(s) { if (this.legal(s).length) return null; const [a, c] = this.count(s); return a > c ? 0 : c > a ? 1 : -1; },
    eval(s) {
      const me = s.side + 1, opp = 3 - me; let v = 0, mine = 0, theirs = 0, empt = 0;
      for (let i = 0; i < 64; i++) { const x = s.b[i]; if (x === me) { v += WTAB[i]; mine++; } else if (x === opp) { v -= WTAB[i]; theirs++; } else empt++; }
      const mm = this.moves(s).length, om = this.moves({ b: s.b, side: s.side ^ 1 }).length;
      v += (mm - om) * 6; if (empt < 14) v += (mine - theirs) * (14 - empt) * 1.5; return v;
    },
    cells(s) { return s.b.map(p => (p ? { side: p - 1 } : null)); }
  };
  // ---------- search ----------
  function search(G, s, depth, o) {
    o = o || {}; const cap = o.nodes || 200000, rnd = o.rnd || Math.random; let nodes = 0, stop = false;
    const lg = x => (G.legal ? G.legal(x) : G.moves(x));
    const rec = (st, d, a, b, ply) => {
      if (++nodes > cap) { stop = true; return 0; }
      const mv = lg(st);
      if (!mv.length) { const r = G.result(st); return r === -1 || r === null ? 0 : (r === st.side ? 100000 - ply : -100000 + ply); }
      if (G.name === 'checkers' && st.quiet >= 80) return 0;
      if (d <= 0) return G.eval(st);
      let best = -INF;
      if (G.name === 'checkers') mv.sort((x, y) => y.caps.length - x.caps.length);
      for (const m of mv) { const v = -rec(G.apply(st, m), d - 1, -b, -a, ply + 1); if (stop) return 0; if (v > best) { best = v; if (v > a) { a = v; if (a >= b) break; } } }
      return best;
    };
    const root = lg(s); if (!root.length) return null; if (root.length === 1) return root[0];
    let chosen = root[0];
    const noise = o.noise || 0;
    for (let d = 1; d <= depth; d++) {
      let bm = null, bv = -INF; const scored = [];
      for (const m of root) { const v = -rec(G.apply(s, m), d - 1, -INF, INF, 1); if (stop) break; scored.push([m, v]); const nv = v + (noise ? (rnd() - 0.5) * 2 * noise : 0); if (nv > bv) { bv = nv; bm = m; } }
      if (stop) break; chosen = bm;
    }
    return chosen;
  }
  const LEVELS = {
    checkers: { 1: { depth: 1, noise: 90, nodes: 5000 }, 2: { depth: 3, noise: 25, nodes: 30000 }, 3: { depth: 7, noise: 0, nodes: 150000 }, 4: { depth: 14, noise: 0, nodes: 600000 } },
    reversi: { 1: { depth: 1, noise: 40, nodes: 5000 }, 2: { depth: 2, noise: 12, nodes: 30000 }, 3: { depth: 4, noise: 0, nodes: 40000 }, 4: { depth: 8, noise: 0, nodes: 150000 } }
  };
  function think(G, s, level, rnd) { const L = LEVELS[G.name][level] || LEVELS[G.name][3]; return search(G, s, L.depth, { nodes: L.nodes, noise: L.noise, rnd }); }
  const API = { CK, RV, search, think, LEVELS, flips };
  root.DiliaBoard = API; if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
