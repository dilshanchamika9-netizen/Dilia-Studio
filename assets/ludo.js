/* Dilia Play Ludo: rules and computer opponents (pure, tested in Node). 2 to 4 players, 4 tokens each, one winner.
   A token's position is -1 in the base, 0..50 on the shared 52-square track counted from its own start square, 51..55 in its home column, 56 = home.
   Seats 0..3 start on track squares 0, 13, 26, 39 (clockwise). A six brings a token out and gives another roll; three sixes in a row lose the turn.
   Landing on a lone enemy token on an unmarked track square sends it back to base. Start squares and the star squares 8 steps after them are safe. */
(function (root) {
  'use strict';
  const START = [0, 13, 26, 39], SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]), HOME = 56;
  const abs = (seat, rel) => (START[seat] + rel) % 52;
  function create(seats) { return { seats: seats.slice(), tok: seats.map(() => [-1, -1, -1, -1]), turn: 0, dice: 0, sixes: 0, winner: -1, n: 0 }; }
  const copy = s => ({ seats: s.seats, tok: s.tok.map(a => a.slice()), turn: s.turn, dice: s.dice, sixes: s.sixes, winner: s.winner, n: s.n });
  function legal(s, v) {
    const out = [], t = s.tok[s.turn];
    for (let i = 0; i < 4; i++) { const p = t[i]; if (p === HOME) continue; if (p === -1) { if (v === 6) out.push(i); } else if (p + v <= HOME) out.push(i); }
    return out;
  }
  const nextTurn = s => { s.turn = (s.turn + 1) % s.seats.length; s.dice = 0; s.sixes = 0; };
  // a roll of v: returns the new state and the movable tokens (empty list = nothing to move, and the turn has already passed)
  function setRoll(s0, v) {
    const s = copy(s0); s.n++; const sixes = v === 6 ? s.sixes + 1 : 0;
    if (sixes >= 3) { nextTurn(s); return { s, moves: [], lost: true }; }
    s.dice = v; s.sixes = sixes; const mv = legal(s, v);
    if (!mv.length) { nextTurn(s); return { s, moves: [] }; }
    return { s, moves: mv };
  }
  // move token i by the pending dice value; returns the new state and what happened
  function move(s0, i) {
    const s = copy(s0), p = s.turn, v = s.dice, was = s.tok[p][i], to = was === -1 ? 0 : was + v; let captured = [];
    s.tok[p][i] = to;
    if (to <= 50) { const a = abs(s.seats[p], to); if (!SAFE.has(a)) for (let q = 0; q < s.seats.length; q++) if (q !== p) for (let j = 0; j < 4; j++) { const r = s.tok[q][j]; if (r >= 0 && r <= 50 && abs(s.seats[q], r) === a) { s.tok[q][j] = -1; captured.push([q, j]); } } }
    const fin = to === HOME, won = s.tok[p].every(x => x === HOME); if (won) s.winner = p;
    if (!won) { if (v === 6) s.dice = 0; else nextTurn(s); } else s.dice = 0;
    return { s, captured, finished: fin, entered: was === -1, from: was, to };
  }
  // danger: chance (out of 6 rolls) that some enemy token can land on this token next turn, ignoring enemies leaving base
  function danger(s, p, rel) {
    if (rel < 0 || rel > 50) return 0; const a = abs(s.seats[p], rel); if (SAFE.has(a)) return 0; let hit = 0;
    for (let v = 1; v <= 6; v++) { let ok = false; for (let q = 0; q < s.seats.length && !ok; q++) if (q !== p) for (let j = 0; j < 4; j++) { const r = s.tok[q][j]; if (r >= 0 && r + v <= 50 && abs(s.seats[q], r + v) === a) { ok = true; break; } } if (ok) hit++; }
    return hit / 6;
  }
  const progress = (s, p) => s.tok[p].reduce((x, r) => x + (r < 0 ? 0 : r + 1), 0);
  function pick(s, moves, level, rnd) {
    if (moves.length === 1) return moves[0]; rnd = rnd || Math.random;
    if (level <= 1) return moves[Math.floor(rnd() * moves.length)];
    const p = s.turn, v = s.dice; let best = moves[0], bs = -1e9;
    for (const i of moves) {
      const r = move(s, i), was = s.tok[p][i], n = r.s; let sc = 0;
      sc += r.captured.length * 70 + (r.captured.length ? r.captured.reduce((x, [q, j]) => x + s.tok[q][j], 0) : 0);
      if (r.finished) sc += 60; if (r.entered) sc += 45; if (r.to > 50 && was <= 50) sc += 25;
      sc += v * 1.5 + r.to * 0.2;
      if (level >= 3) { sc += (danger(s, p, was) - (r.to <= 50 ? danger(n, p, r.to) : 0)) * (was + 8) * 0.9; if (r.to <= 50 && SAFE.has(abs(s.seats[p], r.to))) sc += 12; if (was >= 0 && was <= 50 && SAFE.has(abs(s.seats[p], was))) sc -= 8; }
      if (level >= 4) { let risk = 0; for (let j = 0; j < 4; j++) { const x = n.tok[p][j]; if (x >= 0 && x <= 50) risk += danger(n, p, x) * (x + 6); } sc -= risk * 0.8; let ahead = 0; for (let q = 0; q < n.seats.length; q++) if (q !== p) ahead = Math.max(ahead, progress(n, q)); sc -= ahead * 0.02; }
      sc += (level >= 3 ? 0 : (rnd() - 0.5) * 30);
      if (sc > bs) { bs = sc; best = i; }
    }
    return best;
  }
  const API = { create, copy, legal, setRoll, move, pick, abs, danger, progress, SAFE, START, HOME };
  root.DiliaLudo = API; if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
