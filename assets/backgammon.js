/* Dilia backgammon engine. Points are indexes 0..23. Player 0 (white) moves from high to low and bears off past index 0,
   home = 0..5, enters from the bar on 24-die. Player 1 moves low to high, home = 18..23, enters on die-1.
   p[i] > 0 = player 0 checkers, p[i] < 0 = player 1 checkers. Moves are {f, t, d, h}: from (24 = bar), to (-1 = off), die, hit. */
(function (root) {
  const NEW = () => { const p = new Array(24).fill(0); p[23] = 2; p[12] = 5; p[7] = 3; p[5] = 5; p[0] = -2; p[11] = -5; p[16] = -3; p[18] = -5; return { p, bar: [0, 0], off: [0, 0], turn: 0, dice: [], n: 0 }; };
  const copy = s => ({ p: s.p.slice(), bar: s.bar.slice(), off: s.off.slice(), turn: s.turn, dice: s.dice.slice(), n: s.n });
  const own = (s, i, pl) => (pl === 0 ? (s.p[i] > 0 ? s.p[i] : 0) : (s.p[i] < 0 ? -s.p[i] : 0));
  function allHome(s, pl) { if (s.bar[pl]) return false; for (let i = 0; i < 24; i++) if (own(s, i, pl) && (pl === 0 ? i > 5 : i < 18)) return false; return true; }
  function steps(s, pl, d) {
    const out = [], opp = 1 - pl;
    if (s.bar[pl]) { const t = pl === 0 ? 24 - d : d - 1; const o = own(s, t, opp); if (o < 2) out.push({ f: 24, t, d, h: o === 1 }); return out; }
    const home = allHome(s, pl);
    for (let i = 0; i < 24; i++) {
      if (!own(s, i, pl)) continue;
      const t = pl === 0 ? i - d : i + d;
      if (t >= 0 && t <= 23) { const o = own(s, t, opp); if (o < 2) out.push({ f: i, t, d, h: o === 1 }); }
      else if (home) {
        const exact = pl === 0 ? i === d - 1 : i === 24 - d;
        let ok = exact;
        if (!ok) { ok = true; for (let j = 0; j < 24 && ok; j++) if (own(s, j, pl) && (pl === 0 ? j > i : j < i)) ok = false; }
        if (ok) out.push({ f: i, t: -1, d, h: false });
      }
    }
    return out;
  }
  function apply(s, m, pl) {
    const n = copy(s), sg = pl === 0 ? 1 : -1;
    if (m.f === 24) n.bar[pl]--; else n.p[m.f] -= sg;
    if (m.t === -1) n.off[pl]++; else { if (m.h) { n.p[m.t] = 0; n.bar[1 - pl]++; } n.p[m.t] += sg; }
    const k = n.dice.indexOf(m.d); if (k >= 0) n.dice.splice(k, 1);
    return n;
  }
  const key = s => s.p.join(',') + '|' + s.bar + '|' + s.off;
  // every maximal play for the dice left in s.dice; each {moves, pos}. Applies the must-use-both and larger-die rules.
  function plays(s, pl) {
    const dice = s.dice; if (!dice.length) return [];
    const orders = dice.length === 4 || dice[0] === dice[1] ? [dice] : [dice, [dice[1], dice[0]]];
    const res = new Map(); let best = 0;
    const go = (st, rest, moves) => {
      let any = false;
      if (rest.length) for (const m of steps(st, pl, rest[0])) { any = true; go(apply(st, m, pl), rest.slice(1), moves.concat(m)); }
      if (!any) { if (moves.length >= best) { if (moves.length > best) { best = moves.length; res.clear(); } const k = key(st); if (!res.has(k)) res.set(k, { moves, pos: st }); } }
    };
    for (const o of orders) { const st = copy(s); st.dice = o.slice(); go(st, o, []); }
    if (best === 0) return [];
    let out = [...res.values()].filter(r => r.moves.length === best);
    if (best === 1 && dice.length === 2 && dice[0] !== dice[1]) { const hi = Math.max(dice[0], dice[1]); const big = out.filter(r => r.moves[0].d === hi); if (big.length) out = big; }
    return out;
  }
  // single steps the player may click now: first moves of the maximal plays
  function firstSteps(s, pl) { const seen = new Set(), out = []; for (const r of plays(s, pl)) { const m = r.moves[0]; const k = m.f + ':' + m.t + ':' + m.d; if (!seen.has(k)) { seen.add(k); out.push(m); } } return out; }
  const pips = (s, pl) => { let t = s.bar[pl] * 25; for (let i = 0; i < 24; i++) { const c = own(s, i, pl); if (c) t += c * (pl === 0 ? i + 1 : 24 - i); } return t; };
  function contact(s) { let mx0 = s.bar[0] ? 24 : -1, mn1 = s.bar[1] ? -1 : 99; for (let i = 0; i < 24; i++) { if (s.p[i] > 0) mx0 = Math.max(mx0, i); if (s.p[i] < 0 && mn1 === 99) mn1 = i; } return mx0 > mn1; }
  const SHOT = [0, .31, .31, .31, .31, .31, .31];
  function side(s, pl, con) {
    const opp = 1 - pl; let v = -pips(s, pl) + s.off[pl] * 1.5;
    if (!con) return v;
    v -= s.bar[pl] * 9;
    const homeLo = pl === 0 ? 0 : 18; let run = 0, bestRun = 0;
    for (let i = 0; i < 24; i++) {
      const c = own(s, i, pl);
      if (c >= 2) { const inHome = i >= homeLo && i < homeLo + 6, prog = pl === 0 ? 24 - i : i; v += (inHome ? 4 : 2) + (prog > 12 ? 1 : 0); run++; bestRun = Math.max(bestRun, run); }
      else run = 0;
      if (c === 1) {
        // shooters: opposing checkers that can reach this point with one die
        let dists = 0; if (s.bar[opp]) { const e = opp === 0 ? 24 : -1; const dd = Math.abs(e - i); if (dd >= 1 && dd <= 6) dists++; }
        for (let j = 0; j < 24; j++) { if (!own(s, j, opp)) continue; const dd = opp === 0 ? j - i : i - j; if (dd >= 1 && dd <= 6) dists++; }
        const loss = pl === 0 ? 24 - i : i + 1; v -= Math.min(0.85, 0.12 + dists * 0.26) * (loss + 6);
      }
    }
    if (bestRun >= 3) v += bestRun * 2;
    return v;
  }
  const evalFor = (s, pl) => { const con = contact(s); return side(s, pl, con) - side(s, 1 - pl, con); };
  const ROLLS = []; for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) ROLLS.push({ d: a === b ? [a, a, a, a] : [b, a], w: a === b ? 1 : 2 });
  function rollDice(rnd) { const a = 1 + Math.floor(rnd() * 6), b = 1 + Math.floor(rnd() * 6); return a === b ? [a, a, a, a] : [Math.max(a, b), Math.min(a, b)]; }
  const LEVELS = { 1: { random: 1 }, 2: { noise: 5 }, 3: {}, 4: { ply2: 1, top: 9 } };
  function choose(s, level, rnd) {
    const pl = s.turn, L = LEVELS[level] || LEVELS[3], ps = plays(s, pl);
    if (!ps.length) return null;
    if (L.random) return ps[Math.floor(rnd() * ps.length)];
    let sc = ps.map(r => ({ r, v: evalFor(r.pos, pl) + (L.noise ? (rnd() - 0.5) * 2 * L.noise : 0) }));
    sc.sort((a, b) => b.v - a.v);
    if (L.ply2) {
      const top = sc.slice(0, L.top);
      for (const c of top) {
        if (c.r.pos.off[pl] === 15) { c.v = 1e6; continue; }
        let tot = 0, wt = 0;
        for (const R of ROLLS) { const t = copy(c.r.pos); t.turn = 1 - pl; t.dice = R.d.slice(); const rp = plays(t, 1 - pl); let b = -1e9; if (!rp.length) b = evalFor(t, 1 - pl); else for (const q of rp) { const e = q.pos.off[1 - pl] === 15 ? 1e5 : evalFor(q.pos, 1 - pl); if (e > b) b = e; } tot += R.w * -b; wt += R.w; }
        c.v = tot / wt;
      }
      top.sort((a, b) => b.v - a.v); return top[0].r;
    }
    return sc[0].r;
  }
  // result of a finished game: 1 single, 2 gammon, 3 backgammon (loser has borne off nothing; backgammon = also on bar or in winner's home)
  function winKind(s, w) {
    const l = 1 - w; if (s.off[l] > 0) return 1;
    if (s.bar[l]) return 3;
    for (let i = 0; i < 24; i++) if (own(s, i, l) && (w === 0 ? i <= 5 : i >= 18)) return 3;
    return 2;
  }
  root.DiliaBG = { NEW, copy, steps, apply, plays, firstSteps, pips, evalFor, choose, rollDice, winKind, own, allHome, LEVELS };
})(typeof window !== 'undefined' ? window : globalThis);
