/* Dilia Play chess engine: iterative deepening alpha-beta (principal variation search) with a transposition table, null-move pruning,
   late-move reductions, futility pruning, quiescence search, killer and history move ordering, and a tapered evaluation.
   Written for Dilia; no outside engine code. Runs in a worker (chess-worker.js) and in Node for the tests. */
(function (root) {
  'use strict';
  const C = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./chess-core.js') : root.DiliaChess;
  const { P, N, B, R, Q, K, F_CAP, F_EP, mFrom, mTo, mPromo, mFlag } = C;
  const MATE = 30000, INF = 32000, MAXPLY = 96;
  const TTBITS = 20, TTN = 1 << TTBITS;
  const LMR = new Int8Array(64 * 64); for (let d = 1; d < 64; d++) for (let i = 1; i < 64; i++) LMR[d * 64 + i] = Math.max(0, Math.floor(0.55 + Math.log(d) * Math.log(i) / 2.1));
  const PV = [0, 100, 320, 330, 500, 900, 20000];   // values for move ordering only

  class Engine {
    constructor() {
      this.tLo = new Int32Array(TTN); this.tHi = new Int32Array(TTN); this.tMv = new Int32Array(TTN); this.tSc = new Int16Array(TTN); this.tDp = new Int8Array(TTN); this.tFl = new Int8Array(TTN);
      this.moves = []; this.scores = []; for (let i = 0; i < MAXPLY + 4; i++) { this.moves.push(new Int32Array(256)); this.scores.push(new Int32Array(256)); }
      this.killers = new Int32Array((MAXPLY + 4) * 2); this.hist = new Int32Array(2 * 128 * 128); this.pvLen = new Int32Array(MAXPLY + 4); this.pvTab = new Int32Array((MAXPLY + 4) * (MAXPLY + 4));
      this.nodes = 0; this.stop = false; this.deadline = 0; this.sel = 0;
    }
    clear() { this.tLo.fill(0); this.tHi.fill(0); this.tMv.fill(0); this.tDp.fill(-1); this.hist.fill(0); this.killers.fill(0); }
    evaluate(pos) {
      const ph = pos.phase > 24 ? 24 : pos.phase, c = pos.cnt;
      let mg = pos.mg, eg = pos.eg;
      if (c[B] >= 2) { mg += 28; eg += 44; } if (c[B | 8] >= 2) { mg -= 28; eg -= 44; }
      const e = this.extras(pos); mg += e[0]; eg += e[1];
      const sc = ((mg * ph + eg * (24 - ph)) / 24) | 0;
      return (pos.side ? -sc : sc) + 8;
    }
    // pawn structure, rooks on open files, king shelter, mobility of the pieces (from white's point of view): [middle game, end game]
    extras(pos) {
      const b = pos.b; let mg = 0, eg = 0;
      const wp = this.wp || (this.wp = new Int8Array(8)), bp = this.bp || (this.bp = new Int8Array(8)); // pawns per file; and most advanced rank per colour
      const wlo = this.wlo || (this.wlo = new Int8Array(8)), bhi = this.bhi || (this.bhi = new Int8Array(8));
      wp.fill(0); bp.fill(0); wlo.fill(9); bhi.fill(-1);
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const p = b[r * 16 + f]; if (p === P) { wp[f]++; if (r < wlo[f]) wlo[f] = r; } else if (p === (P | 8)) { bp[f]++; if (r > bhi[f]) bhi[f] = r; } }
      for (let f = 0; f < 8; f++) {
        if (wp[f] > 1) { mg -= 10 * (wp[f] - 1); eg -= 18 * (wp[f] - 1); } if (bp[f] > 1) { mg += 10 * (bp[f] - 1); eg += 18 * (bp[f] - 1); }
        const wl = f > 0 ? wp[f - 1] : 0, wr = f < 7 ? wp[f + 1] : 0, bl = f > 0 ? bp[f - 1] : 0, br = f < 7 ? bp[f + 1] : 0;
        if (wp[f] && !wl && !wr) { mg -= 12; eg -= 16; } if (bp[f] && !bl && !br) { mg += 12; eg += 16; }
        if (wp[f]) { // passed? no black pawn ahead on this or adjacent files
          let pass = true; for (let ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1) && pass; ff++) if (bp[ff] && bhi[ff] > wlo[f]) pass = false;
          if (pass) { const r = wlo[f]; const bon = [0, 5, 10, 22, 40, 70, 110][r - 1 < 0 ? 0 : r - 1] || 0; mg += bon / 2; eg += bon + 8; }
        }
        if (bp[f]) { let pass = true; for (let ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1) && pass; ff++) if (wp[ff] && wlo[ff] < bhi[f]) pass = false; if (pass) { const r = 7 - bhi[f]; const bon = [0, 5, 10, 22, 40, 70, 110][r - 1 < 0 ? 0 : r - 1] || 0; mg -= bon / 2; eg -= bon + 8; } }
      }
      // pieces: rook files, mobility
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const s = r * 16 + f, p = b[s]; if (!p) continue; const t = p & 7, black = p & 8;
        if (t === R) { const own = black ? bp[f] : wp[f], opp = black ? wp[f] : bp[f]; let v = 0; if (!own) v = opp ? 10 : 20; if (black) { mg -= v; eg -= v / 2; } else { mg += v; eg += v / 2; } }
        if (t === N || t === B || t === R || t === Q) {
          let m = 0;
          if (t === N) { for (let i = 0; i < 8; i++) { const q = s + [-33, -31, -18, -14, 14, 18, 31, 33][i]; if (!(q & 0x88) && (!b[q] || (b[q] & 8) !== black)) m++; } }
          else { const dirs = t === B ? [-17, -15, 15, 17] : t === R ? [-16, -1, 1, 16] : [-17, -15, 15, 17, -16, -1, 1, 16]; for (const d of dirs) { let q = s + d; while (!(q & 0x88)) { if (!b[q]) m++; else { if ((b[q] & 8) !== black) m++; break; } q += d; } } }
          const w = t === N ? 4 : t === B ? 3 : t === R ? 2 : 1, base = t === N ? 4 : t === B ? 6 : t === R ? 6 : 12; const v = (m - base) * w;
          if (black) { mg -= v; eg -= v; } else { mg += v; eg += v; }
        }
      }
      // king shelter (middle game): pawns in front of a king on the back two ranks
      for (let c = 0; c < 2; c++) {
        const ks = pos.ksq[c], kf = ks & 7, kr = ks >> 4; if (c ? kr < 6 : kr > 1) continue;
        let v = 0; for (let f = Math.max(0, kf - 1); f <= Math.min(7, kf + 1); f++) { const dir = c ? -1 : 1; let found = 0; for (let k = 1; k <= 2; k++) { const rr = kr + dir * k; if (rr < 0 || rr > 7) break; if (b[rr * 16 + f] === (P | (c << 3))) { found = k; break; } } v += found === 1 ? 12 : found === 2 ? 6 : -10; }
        if (c) mg -= v; else mg += v;
      }
      return [mg, eg];
    }
    probe(pos, ply, depth, alpha, beta, out) {
      const i = pos.hLo & (TTN - 1); if (this.tLo[i] !== pos.hLo || this.tHi[i] !== pos.hHi || this.tDp[i] < 0) return false;
      out.mv = this.tMv[i]; out.dp = this.tDp[i]; let sc = this.tSc[i]; if (sc > MATE - 200) sc -= ply; else if (sc < -MATE + 200) sc += ply; out.sc = sc; out.fl = this.tFl[i]; return true;
    }
    store(pos, ply, depth, sc, fl, mv) {
      const i = pos.hLo & (TTN - 1); if (this.tLo[i] === pos.hLo && this.tHi[i] === pos.hHi && this.tDp[i] > depth + 2 && fl !== 0 && !(mv)) return;
      if (sc > MATE - 200) sc += ply; else if (sc < -MATE + 200) sc -= ply;
      this.tLo[i] = pos.hLo; this.tHi[i] = pos.hHi; this.tSc[i] = sc; this.tDp[i] = depth; this.tFl[i] = fl; if (mv || this.tLo[i] !== pos.hLo) this.tMv[i] = mv; else if (!mv && this.tMv[i] === 0) this.tMv[i] = 0;
    }
    orderScores(pos, list, n, ply, ttMove, sc) {
      const b = pos.b, side = pos.side, k0 = this.killers[ply * 2], k1 = this.killers[ply * 2 + 1];
      for (let i = 0; i < n; i++) {
        const m = list[i]; let s;
        if (m === ttMove) s = 2000000;
        else {
          const f = m & 255, t = (m >> 8) & 255, fl = (m >> 20) & 15, pr = (m >> 16) & 15;
          if (fl & F_CAP) { const vic = (fl & F_EP) ? 1 : b[t] & 7, att = b[f] & 7; s = 1000000 + PV[vic] * 10 - PV[att] / 100 + (pr ? PV[pr] : 0); if (PV[vic] < PV[att] && pos.attacked(t, side ^ 1)) s -= 900000; }
          else if (pr) s = 900000 + PV[pr];
          else if (m === k0) s = 800000; else if (m === k1) s = 790000;
          else s = this.hist[(side * 128 + f) * 128 + t];
        }
        sc[i] = s;
      }
    }
    pick(list, sc, n, i) { let bi = i, bs = sc[i]; for (let j = i + 1; j < n; j++) if (sc[j] > bs) { bs = sc[j]; bi = j; } if (bi !== i) { const m = list[i]; list[i] = list[bi]; list[bi] = m; const s = sc[i]; sc[i] = sc[bi]; sc[bi] = s; } return list[i]; }
    timeUp() { if ((this.nodes & 2047) === 0 && Date.now() >= this.deadline) this.stop = true; return this.stop; }

    qsearch(pos, alpha, beta, ply, qd) {
      this.nodes++; if (this.timeUp()) return 0;
      if (ply >= MAXPLY) return this.evaluate(pos);
      const inChk = pos.inCheck(); let best = -INF;
      if (!inChk) { best = this.evaluate(pos); if (best >= beta) return best; if (best > alpha) alpha = best; }
      const list = this.moves[ply], sc = this.scores[ply], n = pos.gen(list, !inChk);
      this.orderScores(pos, list, n, ply, 0, sc); let any = false;
      for (let i = 0; i < n; i++) {
        const m = this.pick(list, sc, n, i), fl = (m >> 20) & 15, pr = (m >> 16) & 15;
        if (!inChk) { if (qd > 6 && !(fl & F_CAP)) continue; if (!pr && (fl & F_CAP)) { const vic = (fl & F_EP) ? 1 : pos.b[(m >> 8) & 255] & 7; if (best + PV[vic] + 200 < alpha) continue; if (sc[i] < 500000 && qd > 0) continue; } }
        if (!pos.make(m)) continue; any = true;
        const s = -this.qsearch(pos, -beta, -alpha, ply + 1, qd + 1); pos.unmake(); if (this.stop) return 0;
        if (s > best) { best = s; if (s > alpha) { alpha = s; if (s >= beta) return s; } }
      }
      if (inChk && !any) return -MATE + ply;
      return best;
    }
    search(pos, depth, alpha, beta, ply, allowNull) {
      const pv = beta - alpha > 1; this.pvLen[ply] = ply;
      this.nodes++; if (this.timeUp()) return 0;
      if (ply > 0) { if (pos.half >= 100 || pos.reps() >= 1 || pos.insufficient()) return 0; if (ply >= MAXPLY) return this.evaluate(pos); }
      const inChk = pos.inCheck(); if (inChk) depth++;
      if (depth <= 0) return this.qsearch(pos, alpha, beta, ply, 0);
      // transposition table
      const tt = this.tte || (this.tte = {}); let ttMove = 0;
      if (this.probe(pos, ply, depth, alpha, beta, tt)) {
        ttMove = tt.mv;
        if (!pv && tt.dp >= depth && ply > 0) { if (tt.fl === 1) return tt.sc; if (tt.fl === 2 && tt.sc >= beta) return tt.sc; if (tt.fl === 3 && tt.sc <= alpha) return tt.sc; }
      }
      const ev = inChk ? -INF : this.evaluate(pos);
      if (!pv && !inChk) {
        if (depth <= 6 && ev - 95 * depth >= beta && Math.abs(beta) < MATE - 200) return ev;                       // reverse futility
        if (allowNull && depth >= 3 && ev >= beta && (pos.side ? pos.cnt[N | 8] + pos.cnt[B | 8] + pos.cnt[R | 8] + pos.cnt[Q | 8] : pos.cnt[N] + pos.cnt[B] + pos.cnt[R] + pos.cnt[Q]) > 0) {
          const r = 3 + ((depth / 4) | 0) + Math.min(2, ((ev - beta) / 220) | 0);
          pos.makeNull(); const s = -this.search(pos, depth - 1 - r, -beta, -beta + 1, ply + 1, false); pos.unmakeNull(); if (this.stop) return 0;
          if (s >= beta) return s >= MATE - 200 ? beta : s;
        }
      }
      if (depth >= 5 && !ttMove && pv) { this.search(pos, depth - 2, alpha, beta, ply, false); if (this.stop) return 0; if (this.probe(pos, ply, depth, alpha, beta, tt)) ttMove = tt.mv; }
      const list = this.moves[ply], sc = this.scores[ply], n = pos.gen(list, false);
      this.orderScores(pos, list, n, ply, ttMove, sc);
      let best = -INF, bestMove = 0, moveCount = 0, flag = 3; const alpha0 = alpha;
      for (let i = 0; i < n; i++) {
        const m = this.pick(list, sc, n, i), fl = (m >> 20) & 15, pr = (m >> 16) & 15, quiet = !(fl & F_CAP) && !pr;
        const f = m & 255, t = (m >> 8) & 255;
        if (!pos.make(m)) continue; moveCount++;
        const chk = pos.inCheck();
        // pruning of quiet moves late in the list at low depth
        if (!pv && !inChk && !chk && quiet && best > -MATE + 200) {
          if (depth <= 3 && moveCount > 4 + depth * depth) { pos.unmake(); continue; }
          if (depth <= 4 && ev + 90 + 80 * depth <= alpha && moveCount > 1) { pos.unmake(); continue; }
        }
        let s;
        if (moveCount === 1) s = -this.search(pos, depth - 1, -beta, -alpha, ply + 1, true);
        else {
          let red = 0;
          if (depth >= 3 && moveCount > 3 && quiet && !inChk && !chk) { red = LMR[Math.min(63, depth) * 64 + Math.min(63, moveCount)]; if (pv) red--; if (m === this.killers[ply * 2]) red--; red = Math.max(0, Math.min(red, depth - 2)); }
          s = -this.search(pos, depth - 1 - red, -alpha - 1, -alpha, ply + 1, true);
          if (s > alpha && red) s = -this.search(pos, depth - 1, -alpha - 1, -alpha, ply + 1, true);
          if (s > alpha && s < beta) s = -this.search(pos, depth - 1, -beta, -alpha, ply + 1, true);
        }
        pos.unmake(); if (this.stop) return 0;
        if (s > best) {
          best = s; bestMove = m;
          if (s > alpha) {
            alpha = s; flag = 1;
            const base = ply * (MAXPLY + 4); this.pvTab[base + ply] = m; const cl = this.pvLen[ply + 1]; for (let k = ply + 1; k < cl; k++) this.pvTab[base + k] = this.pvTab[(ply + 1) * (MAXPLY + 4) + k]; this.pvLen[ply] = Math.max(cl, ply + 1);
            if (s >= beta) {
              flag = 2;
              if (quiet) { if (this.killers[ply * 2] !== m) { this.killers[ply * 2 + 1] = this.killers[ply * 2]; this.killers[ply * 2] = m; } const h = (pos.side * 128 + f) * 128 + t, bonus = depth * depth; this.hist[h] = Math.min(this.hist[h] + bonus, 500000); }
              break;
            }
          }
        }
        if (quiet && s <= alpha0 && moveCount > 1) { const h = (pos.side * 128 + f) * 128 + t; this.hist[h] = Math.max(0, this.hist[h] - depth); }
      }
      if (!moveCount) return inChk ? -MATE + ply : 0;
      this.store(pos, ply, depth, best, flag, flag === 3 ? ttMove : bestMove);
      return best;
    }
    // opts: { ms, depth, noise (centipawns of random error, 0 = none), onInfo }
    go(pos, opts) {
      opts = opts || {}; const maxD = Math.min(opts.depth || 64, MAXPLY - 4), t0 = Date.now(); this.deadline = t0 + (opts.ms || 1000); this.stop = false; this.nodes = 0; this.killers.fill(0);
      for (let i = 0; i < this.hist.length; i++) this.hist[i] >>= 1;
      const root = pos.legal(); if (!root.length) return { move: 0, score: 0, depth: 0, nodes: 0 };
      if (root.length === 1 && !opts.noise) return { move: root[0], score: 0, depth: 0, nodes: 0, only: true };
      let best = root[0], bestScore = 0, done = 0, prev = 0;
      for (let d = 1; d <= maxD; d++) {
        let alpha = -INF, beta = INF, delta = 30;
        if (d >= 5) { alpha = Math.max(-INF, prev - delta); beta = Math.min(INF, prev + delta); }
        let s;
        for (;;) {
          s = this.search(pos, d, alpha, beta, 0, false); if (this.stop) break;
          if (s <= alpha && alpha > -INF) { alpha = Math.max(-INF, alpha - delta * 2); delta *= 2; this.reorderRoot(); }
          else if (s >= beta && beta < INF) { beta = Math.min(INF, beta + delta * 2); delta *= 2; const m0 = this.pvTab[0]; if (m0) { best = m0; bestScore = s; } }
          else break;
        }
        if (this.stop) break;
        const m = this.pvTab[0]; if (m) { best = m; bestScore = s; } prev = s; done = d;
        if (opts.onInfo) opts.onInfo({ depth: d, score: s, nodes: this.nodes, ms: Date.now() - t0, move: best });
        if (Math.abs(s) > MATE - 100 && d >= 6) break;
        if (Date.now() - t0 > (opts.ms || 1000) * 0.55 && !opts.depth) break;
      }
      return { move: best, score: bestScore, depth: done, nodes: this.nodes };
    }
    reorderRoot() {}
    // weaker play: score every root move with a short search, then pick with a random error of up to `noise` centipawns
    goWeak(pos, opts, rnd) {
      const root = pos.legal(); if (!root.length) return { move: 0, score: 0, depth: 0, nodes: 0 };
      const d = Math.max(1, opts.depth || 2); this.stop = false; this.nodes = 0; this.deadline = Date.now() + (opts.ms || 1500); const out = [];
      for (const m of root) { pos.make(m); let s = -this.search(pos, d - 1, -INF, INF, 1, true); pos.unmake(); if (this.stop) { s = 0; } out.push([m, s]); }
      out.sort((a, b) => b[1] - a[1]);
      const top = out[0][1]; let pickM = out[0][0], bs = -Infinity;
      for (const [m, s] of out) { const v = s - (top - s > opts.noise * 3 ? 1e6 : 0) + (rnd() - 0.5) * 2 * opts.noise + (rnd() < 0.5 ? 0 : 0); if (v > bs) { bs = v; pickM = m; } }
      return { move: pickM, score: top, depth: d, nodes: this.nodes };
    }
  }
  // levels: 1 Beginner, 2 Casual, 3 Club, 4 Expert (strongest)
  const LEVELS = { 1: { weak: 1, noise: 160, ms: 300 }, 2: { weak: 2, noise: 60, ms: 600 }, 3: { ms: 400, depth: 7 }, 4: { ms: 2000 } };
  function think(eng, pos, level, rnd) {
    const L = LEVELS[level] || LEVELS[3];
    if (L.weak) return eng.goWeak(pos, { depth: L.weak, noise: L.noise, ms: L.ms }, rnd || Math.random);
    return eng.go(pos, { ms: L.ms, depth: L.depth });
  }
  const API = { Engine, MATE, LEVELS, think };
  root.DiliaChess = Object.assign(root.DiliaChess || {}, API);
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));
