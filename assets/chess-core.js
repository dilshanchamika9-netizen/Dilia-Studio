/* Dilia Play chess: rules, move generation and board state. Plain 0x88 board, integer moves. No outside code.
   Loaded by the page, by the engine worker (importScripts) and by dev/tests in Node. */
(function (root) {
  'use strict';
  // pieces: 1 pawn, 2 knight, 3 bishop, 4 rook, 5 queen, 6 king; add 8 for black. Squares: rank * 16 + file (a1 = 0, h1 = 7, a8 = 112).
  const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  const F_CAP = 1, F_EP = 2, F_CAS = 4, F_DP = 8;
  const mk = (from, to, promo, flag) => from | (to << 8) | ((promo || 0) << 16) | ((flag || 0) << 20);
  const mFrom = m => m & 255, mTo = m => (m >> 8) & 255, mPromo = m => (m >> 16) & 15, mFlag = m => (m >> 20) & 15;
  const KN = [-33, -31, -18, -14, 14, 18, 31, 33], KG = [-17, -16, -15, -1, 1, 15, 16, 17], BD = [-17, -15, 15, 17], RD = [-16, -1, 1, 16];
  const CRM = new Int8Array(128).fill(15); CRM[0] = 13; CRM[7] = 14; CRM[4] = 12; CRM[112] = 7; CRM[119] = 11; CRM[116] = 3;
  const FILES = 'abcdefgh', LET = ' PNBRQK';
  const sqName = s => FILES[s & 7] + ((s >> 4) + 1);
  const nameSq = t => (t.charCodeAt(0) - 97) + (t.charCodeAt(1) - 49) * 16;

  // ---- hashing: two 32-bit halves from a fixed seed ----
  let seed = 0x9e3779b9;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
  const ZP = [], ZPH = []; for (let i = 0; i < 16; i++) { ZP.push(new Int32Array(128)); ZPH.push(new Int32Array(128)); for (let s = 0; s < 128; s++) { ZP[i][s] = rnd(); ZPH[i][s] = rnd(); } }
  const ZC = new Int32Array(16), ZCH = new Int32Array(16), ZE = new Int32Array(128), ZEH = new Int32Array(128); for (let i = 0; i < 16; i++) { ZC[i] = rnd(); ZCH[i] = rnd(); } for (let i = 0; i < 128; i++) { ZE[i] = rnd(); ZEH[i] = rnd(); }
  const ZS = rnd(), ZSH = rnd();

  // ---- evaluation tables (tapered: middle game and end game), kept up to date by make / unmake ----
  const VMG = [0, 82, 337, 365, 477, 1025, 0], VEG = [0, 94, 281, 297, 512, 936, 0], PH = [0, 0, 1, 1, 2, 4, 0];
  const PMG = [], PEG = [];   // [piece 1..14][square]
  (function () {
    const cd = (f, r) => Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5)), md = (f, r) => Math.abs(f - 3.5) + Math.abs(r - 3.5);
    for (let p = 0; p < 16; p++) { PMG.push(new Int16Array(128)); PEG.push(new Int16Array(128)); }
    for (let pt = 1; pt <= 6; pt++) for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue; const f = s & 7, r = s >> 4; let mg = 0, eg = 0;
      const c = 3.5 - cd(f, r), m = 7 - md(f, r);   // c: 0 at the edge .. 3 in the middle
      if (pt === 1) { if (r === 0 || r === 7) { mg = 0; eg = 0; } else { mg = (r - 1) * 3 + (f >= 2 && f <= 5 ? (f === 3 || f === 4 ? 14 : 6) : 0) * (r <= 4 ? 1 : 0.4) + (r === 1 && (f === 3 || f === 4) ? -18 : 0) + (r === 1 && (f === 0 || f === 7) ? 0 : 0); eg = Math.round((r - 1) * (r - 1) * 2.1) + (f === 0 || f === 7 ? -6 : 0); } }
      if (pt === 2) { mg = Math.round(c * 15 - 30 + (r >= 2 && r <= 5 ? 6 : 0)); eg = Math.round(c * 11 - 22); if (r === 0) mg -= 8; }
      if (pt === 3) { mg = Math.round(c * 7 - 12 + (r === 0 ? -6 : 0)); eg = Math.round(c * 6 - 8); }
      if (pt === 4) { mg = Math.round(c * 2 - 3 + (r === 6 ? 14 : 0) + (r === 0 && (f === 3 || f === 4 || f === 2) ? 6 : 0)); eg = Math.round((r === 6 ? 10 : 0) + c); }
      if (pt === 5) { mg = Math.round(c * 4 - 8 + (r === 0 ? -2 : 0)); eg = Math.round(c * 8 - 10); }
      if (pt === 6) { mg = Math.round(-r * 14 + (f <= 2 || f >= 6 ? 10 : -14) + (r === 0 && (f === 1 || f === 6) ? 12 : 0)); eg = Math.round(c * 16 - 20 + r * 2); }
      PMG[pt][s] = mg; PEG[pt][s] = eg;
      // black: mirror the rank
      const sb = (7 - r) * 16 + f; PMG[pt + 8][sb] = mg; PEG[pt + 8][sb] = eg;
    }
  })();

  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  class Pos {
    constructor(fen) {
      this.b = new Int8Array(128); this.side = 0; this.castle = 0; this.ep = -1; this.half = 0; this.full = 1; this.ksq = [4, 116];
      this.hLo = 0; this.hHi = 0; this.mg = 0; this.eg = 0; this.phase = 0; this.n = 0;
      this.stM = new Int32Array(1024); this.stC = new Int8Array(1024); this.stCr = new Int8Array(1024); this.stEp = new Int16Array(1024); this.stH = new Int16Array(1024); this.stLo = new Int32Array(1024); this.stHi = new Int32Array(1024);
      this.cnt = new Int8Array(16); this.fen_(fen || START);
    }
    fen_(fen) {
      const t = fen.trim().split(/\s+/); this.b.fill(0); this.cnt.fill(0); this.mg = 0; this.eg = 0; this.phase = 0; this.n = 0;
      let r = 7, f = 0; for (const ch of t[0]) { if (ch === '/') { r--; f = 0; } else if (ch >= '1' && ch <= '8') f += +ch; else { const col = ch === ch.toUpperCase() ? 0 : 8, pt = LET.indexOf(ch.toUpperCase()); if (pt < 1 || r < 0 || f > 7) throw new Error('bad fen'); this.put(r * 16 + f, pt | col); f++; } }
      this.side = t[1] === 'b' ? 1 : 0; this.castle = 0; for (const ch of (t[2] || '-')) this.castle |= ch === 'K' ? 1 : ch === 'Q' ? 2 : ch === 'k' ? 4 : ch === 'q' ? 8 : 0;
      this.ep = t[3] && t[3] !== '-' ? nameSq(t[3]) : -1; this.half = +(t[4] || 0); this.full = +(t[5] || 1);
      this.ksq = [-1, -1]; for (let s = 0; s < 128; s++) if (!(s & 0x88)) { if (this.b[s] === K) this.ksq[0] = s; if (this.b[s] === (K | 8)) this.ksq[1] = s; }
      if (this.ksq[0] < 0 || this.ksq[1] < 0) throw new Error('bad fen');
      this.rehash();
    }
    put(s, p) { this.b[s] = p; this.cnt[p]++; const t = p & 7; if (p & 8) { this.mg -= VMG[t] + PMG[p][s]; this.eg -= VEG[t] + PEG[p][s]; } else { this.mg += VMG[t] + PMG[p][s]; this.eg += VEG[t] + PEG[p][s]; } this.phase += PH[t]; }
    rehash() { let lo = 0, hi = 0; for (let s = 0; s < 128; s++) if (!(s & 0x88) && this.b[s]) { lo ^= ZP[this.b[s]][s]; hi ^= ZPH[this.b[s]][s]; } if (this.side) { lo ^= ZS; hi ^= ZSH; } lo ^= ZC[this.castle]; hi ^= ZCH[this.castle]; if (this.ep >= 0) { lo ^= ZE[this.ep]; hi ^= ZEH[this.ep]; } this.hLo = lo; this.hHi = hi; }
    fen() {
      let o = ''; for (let r = 7; r >= 0; r--) { let e = 0; for (let f = 0; f < 8; f++) { const p = this.b[r * 16 + f]; if (!p) e++; else { if (e) { o += e; e = 0; } const ch = LET[p & 7]; o += p & 8 ? ch.toLowerCase() : ch; } } if (e) o += e; if (r) o += '/'; }
      return o + ' ' + (this.side ? 'b' : 'w') + ' ' + ((this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '') || '-') + ' ' + (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.half + ' ' + this.full;
    }
    // is square s attacked by colour c (0 white, 1 black)?
    attacked(s, c) {
      const b = this.b, o = c << 3;
      const pd = c ? 15 : -17;   // a pawn of colour c attacks s from s - 16 (white) or s + 16 (black)
      let q = s + (c ? 15 : -17); if (!(q & 0x88) && b[q] === (P | o)) return true; q = s + (c ? 17 : -15); if (!(q & 0x88) && b[q] === (P | o)) return true;
      for (let i = 0; i < 8; i++) { q = s + KN[i]; if (!(q & 0x88) && b[q] === (N | o)) return true; q = s + KG[i]; if (!(q & 0x88) && b[q] === (K | o)) return true; }
      for (let i = 0; i < 4; i++) {
        let d = BD[i]; q = s + d; while (!(q & 0x88)) { const p = b[q]; if (p) { if (p === (B | o) || p === (Q | o)) return true; break; } q += d; }
        d = RD[i]; q = s + d; while (!(q & 0x88)) { const p = b[q]; if (p) { if (p === (R | o) || p === (Q | o)) return true; break; } q += d; }
      }
      return false;
    }
    inCheck() { return this.attacked(this.ksq[this.side], this.side ^ 1); }
    // pseudo-legal moves into list (Int32Array); returns count. capsOnly: captures and promotions only.
    gen(list, capsOnly) {
      const b = this.b, side = this.side, me = side << 3, them = me ^ 8; let n = 0;
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = b[s]; if (!p || (p & 8) !== me) continue; const t = p & 7;
        if (t === P) {
          const dir = side ? -16 : 16, r = s >> 4, last = side ? 1 : 6, start = side ? 6 : 1; let to = s + dir;
          if (!b[to]) {
            if (r === last) { list[n++] = mk(s, to, Q); if (!capsOnly) { list[n++] = mk(s, to, N); list[n++] = mk(s, to, R); list[n++] = mk(s, to, B); } }
            else if (!capsOnly) { list[n++] = mk(s, to); if (r === start && !b[to + dir]) list[n++] = mk(s, to + dir, 0, F_DP); }
          }
          for (let k = -1; k <= 1; k += 2) {
            to = s + dir + k; if (to & 0x88) continue; const c = b[to];
            if (c && (c & 8) === them) { if (r === last) { list[n++] = mk(s, to, Q, F_CAP); list[n++] = mk(s, to, N, F_CAP); list[n++] = mk(s, to, R, F_CAP); list[n++] = mk(s, to, B, F_CAP); } else list[n++] = mk(s, to, 0, F_CAP); }
            else if (to === this.ep) list[n++] = mk(s, to, 0, F_EP | F_CAP);
          }
        } else if (t === N || t === K) {
          const D = t === N ? KN : KG;
          for (let i = 0; i < 8; i++) { const to = s + D[i]; if (to & 0x88) continue; const c = b[to]; if (!c) { if (!capsOnly) list[n++] = mk(s, to); } else if ((c & 8) === them) list[n++] = mk(s, to, 0, F_CAP); }
          if (t === K && !capsOnly) {
            if (side === 0 && s === 4) {
              if ((this.castle & 1) && !b[5] && !b[6] && b[7] === R && !this.attacked(4, 1) && !this.attacked(5, 1) && !this.attacked(6, 1)) list[n++] = mk(4, 6, 0, F_CAS);
              if ((this.castle & 2) && !b[3] && !b[2] && !b[1] && b[0] === R && !this.attacked(4, 1) && !this.attacked(3, 1) && !this.attacked(2, 1)) list[n++] = mk(4, 2, 0, F_CAS);
            } else if (side === 1 && s === 116) {
              if ((this.castle & 4) && !b[117] && !b[118] && b[119] === (R | 8) && !this.attacked(116, 0) && !this.attacked(117, 0) && !this.attacked(118, 0)) list[n++] = mk(116, 118, 0, F_CAS);
              if ((this.castle & 8) && !b[115] && !b[114] && !b[113] && b[112] === (R | 8) && !this.attacked(116, 0) && !this.attacked(115, 0) && !this.attacked(114, 0)) list[n++] = mk(116, 114, 0, F_CAS);
            }
          }
        } else {
          for (let i = 0; i < 4; i++) {
            if (t !== R) { const d = BD[i]; let to = s + d; while (!(to & 0x88)) { const c = b[to]; if (!c) { if (!capsOnly) list[n++] = mk(s, to); } else { if ((c & 8) === them) list[n++] = mk(s, to, 0, F_CAP); break; } to += d; } }
            if (t !== B) { const d = RD[i]; let to = s + d; while (!(to & 0x88)) { const c = b[to]; if (!c) { if (!capsOnly) list[n++] = mk(s, to); } else { if ((c & 8) === them) list[n++] = mk(s, to, 0, F_CAP); break; } to += d; } }
          }
        }
      }
      return n;
    }
    // play a pseudo-legal move; returns false (and leaves the board as it was) if it leaves the own king in check
    make(m) {
      const b = this.b, f = m & 255, t = (m >> 8) & 255, pr = (m >> 16) & 15, fl = (m >> 20) & 15, p = b[f], side = this.side, me = side << 3;
      const i = this.n++; this.stM[i] = m; this.stC[i] = 0; this.stCr[i] = this.castle; this.stEp[i] = this.ep; this.stH[i] = this.half; this.stLo[i] = this.hLo; this.stHi[i] = this.hHi;
      let lo = this.hLo, hi = this.hHi, cap = b[t], capSq = t;
      lo ^= ZS; hi ^= ZSH; lo ^= ZC[this.castle]; hi ^= ZCH[this.castle]; if (this.ep >= 0) { lo ^= ZE[this.ep]; hi ^= ZEH[this.ep]; }
      if (fl & F_EP) { capSq = t + (side ? 16 : -16); cap = b[capSq]; }
      this.stC[i] = cap;
      if (cap) { lo ^= ZP[cap][capSq]; hi ^= ZPH[cap][capSq]; b[capSq] = 0; this.cnt[cap]--; const ct = cap & 7; if (side) { this.mg -= VMG[ct] + PMG[cap][capSq]; this.eg -= VEG[ct] + PEG[cap][capSq]; } else { this.mg += VMG[ct] + PMG[cap][capSq]; this.eg += VEG[ct] + PEG[cap][capSq]; } this.phase -= PH[ct]; }
      lo ^= ZP[p][f]; hi ^= ZPH[p][f]; b[f] = 0;
      let np = p; if (pr) np = pr | me;
      b[t] = np; lo ^= ZP[np][t]; hi ^= ZPH[np][t];
      // eval: take out the old piece, add the new one
      const pt = p & 7, nt = np & 7, sg = side ? -1 : 1;
      this.mg += sg * (VMG[nt] + PMG[np][t] - VMG[pt] - PMG[p][f]); this.eg += sg * (VEG[nt] + PEG[np][t] - VEG[pt] - PEG[p][f]);
      if (pr) { this.cnt[p]--; this.cnt[np]++; this.phase += PH[nt] - PH[pt]; }
      if (pt === K) this.ksq[side] = t;
      if (fl & F_CAS) { const rf = t > f ? f + 3 : f - 4, rt = t > f ? f + 1 : f - 1, rk = b[rf]; b[rf] = 0; b[rt] = rk; lo ^= ZP[rk][rf] ^ ZP[rk][rt]; hi ^= ZPH[rk][rf] ^ ZPH[rk][rt]; this.mg += sg * (PMG[rk][rt] - PMG[rk][rf]); this.eg += sg * (PEG[rk][rt] - PEG[rk][rf]); }
      this.castle &= CRM[f] & CRM[t]; lo ^= ZC[this.castle]; hi ^= ZCH[this.castle];
      this.ep = (fl & F_DP) ? (f + t) >> 1 : -1; if (this.ep >= 0) { lo ^= ZE[this.ep]; hi ^= ZEH[this.ep]; }
      this.half = (pt === P || cap) ? 0 : this.half + 1; if (side) this.full++;
      this.side ^= 1; this.hLo = lo; this.hHi = hi;
      if (this.attacked(this.ksq[side], side ^ 1)) { this.unmake(); return false; }
      return true;
    }
    unmake() {
      const i = --this.n, m = this.stM[i], b = this.b, f = m & 255, t = (m >> 8) & 255, pr = (m >> 16) & 15, fl = (m >> 20) & 15, cap = this.stC[i];
      this.side ^= 1; const side = this.side, sg = side ? -1 : 1; if (side) this.full--;
      const np = b[t], p = pr ? (P | (side << 3)) : np, pt = p & 7, nt = np & 7;
      this.mg -= sg * (VMG[nt] + PMG[np][t] - VMG[pt] - PMG[p][f]); this.eg -= sg * (VEG[nt] + PEG[np][t] - VEG[pt] - PEG[p][f]);
      if (pr) { this.cnt[np]--; this.cnt[p]++; this.phase -= PH[nt] - PH[pt]; }
      b[f] = p; b[t] = 0;
      if (cap) { const capSq = (fl & F_EP) ? t + (side ? 16 : -16) : t; b[capSq] = cap; this.cnt[cap]++; const ct = cap & 7; if (side) { this.mg += VMG[ct] + PMG[cap][capSq]; this.eg += VEG[ct] + PEG[cap][capSq]; } else { this.mg -= VMG[ct] + PMG[cap][capSq]; this.eg -= VEG[ct] + PEG[cap][capSq]; } this.phase += PH[ct]; }
      if (pt === K) this.ksq[side] = f;
      if (fl & F_CAS) { const rf = t > f ? f + 3 : f - 4, rt = t > f ? f + 1 : f - 1, rk = b[rt]; b[rt] = 0; b[rf] = rk; this.mg -= sg * (PMG[rk][rt] - PMG[rk][rf]); this.eg -= sg * (PEG[rk][rt] - PEG[rk][rf]); }
      this.castle = this.stCr[i]; this.ep = this.stEp[i]; this.half = this.stH[i]; this.hLo = this.stLo[i]; this.hHi = this.stHi[i];
    }
    makeNull() { const i = this.n++; this.stM[i] = 0; this.stC[i] = 0; this.stCr[i] = this.castle; this.stEp[i] = this.ep; this.stH[i] = this.half; this.stLo[i] = this.hLo; this.stHi[i] = this.hHi; this.hLo ^= ZS; this.hHi ^= ZSH; if (this.ep >= 0) { this.hLo ^= ZE[this.ep]; this.hHi ^= ZEH[this.ep]; } this.ep = -1; this.side ^= 1; this.half++; }
    unmakeNull() { const i = --this.n; this.side ^= 1; this.ep = this.stEp[i]; this.half = this.stH[i]; this.hLo = this.stLo[i]; this.hHi = this.stHi[i]; }
    legal() { const l = new Int32Array(256), n = this.gen(l, false), out = []; for (let i = 0; i < n; i++) if (this.make(l[i])) { this.unmake(); out.push(l[i]); } return out; }
    // repetitions of the current position among earlier positions (same side to move), only back to the last irreversible move
    reps() { let c = 0; for (let i = this.n - 2, k = 2; k <= this.half && i >= 0; i -= 2, k += 2) if (this.stLo[i] === this.hLo && this.stHi[i] === this.hHi) c++; return c; }
    insufficient() {
      const c = this.cnt; if (c[P] || c[P | 8] || c[R] || c[R | 8] || c[Q] || c[Q | 8]) return false;
      const minors = c[N] + c[N | 8] + c[B] + c[B | 8]; if (minors <= 1) return true;
      if (c[N] + c[N | 8] === 0) { let col = -1; for (let s = 0; s < 128; s++) { if (s & 0x88) continue; const p = this.b[s] & 7; if (p === B) { const sc = ((s >> 4) + (s & 7)) & 1; if (col < 0) col = sc; else if (col !== sc) return false; } } return true; }
      return false;
    }
    // 'ongoing', 'checkmate', 'stalemate', 'fifty', 'repetition', 'insufficient'
    status() {
      const mv = this.legal();
      if (!mv.length) return this.inCheck() ? 'checkmate' : 'stalemate';
      if (this.insufficient()) return 'insufficient'; if (this.half >= 100) return 'fifty'; if (this.reps() >= 2) return 'repetition';
      return 'ongoing';
    }
    uci(m) { return sqName(m & 255) + sqName((m >> 8) & 255) + (((m >> 16) & 15) ? LET[(m >> 16) & 15].toLowerCase() : ''); }
    fromUci(t) { const f = nameSq(t.slice(0, 2)), to = nameSq(t.slice(2, 4)), pr = t[4] ? LET.indexOf(t[4].toUpperCase()) : 0; return this.legal().find(m => (m & 255) === f && ((m >> 8) & 255) === to && ((m >> 16) & 15) === pr) || 0; }
    // standard algebraic notation of a legal move (call before playing it)
    san(m) {
      const f = m & 255, t = (m >> 8) & 255, pr = (m >> 16) & 15, fl = (m >> 20) & 15, p = this.b[f] & 7; let o;
      if (fl & F_CAS) o = t > f ? 'O-O' : 'O-O-O';
      else {
        o = p === P ? ((fl & F_CAP) ? FILES[f & 7] : '') : LET[p];
        if (p !== P) { const others = this.legal().filter(x => x !== m && (x >> 8 & 255) === t && (this.b[x & 255] & 7) === p); if (others.length) { const sf = others.some(x => (x & 7) === (f & 7)), sr = others.some(x => (x >> 4 & 7) === (f >> 4)); o += !sf ? FILES[f & 7] : !sr ? (f >> 4) + 1 : FILES[f & 7] + ((f >> 4) + 1); } }
        if (fl & F_CAP) o += 'x'; o += sqName(t); if (pr) o += '=' + LET[pr];
      }
      this.make(m); const chk = this.inCheck(), has = this.legal().length > 0; this.unmake();
      return o + (chk ? (has ? '+' : '#') : '');
    }
    perft(d) { if (d === 0) return 1; const l = new Int32Array(256), n = this.gen(l, false); let c = 0; for (let i = 0; i < n; i++) if (this.make(l[i])) { c += d === 1 ? 1 : this.perft(d - 1); this.unmake(); } return c; }
  }
  const API = { Pos, START, P, N, B, R, Q, K, F_CAP, F_EP, F_CAS, F_DP, mk, mFrom, mTo, mPromo, mFlag, sqName, nameSq, VMG, VEG, PH, PMG, PEG, ZP, ZPH };
  root.DiliaChess = Object.assign(root.DiliaChess || {}, API);
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
