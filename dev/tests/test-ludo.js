// Ludo rules and computer players.
const L = require('../../assets/ludo.js'); let bad = 0; const ck = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const die = () => 1 + Math.floor(rnd() * 6);
// basics
{ let s = L.create([0, 2]); ck(L.setRoll(s, 3).moves.length === 0 && L.setRoll(s, 3).s.turn === 1, 'no move without a six, turn passes');
  let r = L.setRoll(s, 6); ck(r.moves.length === 4, 'a six lets any base token out'); let m = L.move(r.s, 0); ck(m.s.tok[0][0] === 0 && m.s.turn === 0 && m.s.dice === 0, 'six: token out, same player rolls again');
  // three sixes lose the turn
  let t = L.create([0, 1]); t.sixes = 2; const q = L.setRoll(t, 6); ck(q.lost && q.s.turn === 1, 'third six loses the turn');
  // exact finish
  let f = L.create([0, 1]); f.tok[0] = [54, -1, -1, -1]; let a = L.setRoll(f, 3); ck(a.moves.length === 0, 'cannot overshoot home'); a = L.setRoll(f, 2); ck(a.moves.length === 1 && L.move(a.s, 0).finished, 'exact roll reaches home');
  // capture on an unmarked square; no capture on a safe square
  let c = L.create([0, 2]); c.tok[0] = [3, -1, -1, -1]; c.tok[1] = [-1 + 0, -1, -1, -1]; c.tok[1][0] = 22; // seat 2 start 26: abs = 48; seat0 rel 3 -> abs 3, so make capture: seat0 token to abs 48
  c.tok[0][0] = 44; c.tok[1][0] = 22; let r2 = L.setRoll(c, 4); let m2 = L.move(r2.s, 0); ck(m2.captured.length === 1 && m2.s.tok[1][0] === -1, 'capture sends enemy to base');
  let d = L.create([0, 2]); d.tok[0][0] = 5; d.tok[1][0] = -1; d.tok[1][1] = 30; // seat2 rel30 -> abs 56%52=4 ; seat0 rel 3 +... place on safe abs 8: seat0 rel 8
  d.tok[0][0] = 4; d.tok[1][1] = 34; /* abs (26+34)%52=8 safe */ let r3 = L.setRoll(d, 4); let m3 = L.move(r3.s, 0); ck(m3.captured.length === 0 && m3.s.tok[1][1] === 34, 'safe square: no capture'); }
// full games: every game ends, tokens stay in range, level order
function game(levels, seats) {
  let s = L.create(seats); for (let i = 0; i < 6000 && s.winner < 0; i++) {
    const r = L.setRoll(s, die()); s = r.s; if (!r.moves.length) continue;
    const idx = L.pick(s, r.moves, levels[s.turn], rnd); ck(r.moves.includes(idx), 'pick is legal'); s = L.move(s, idx).s;
    for (const t of s.tok) for (const x of t) if (x < -1 || x > 56) { ck(false, 'token out of range ' + x); return -2; }
  }
  return s.winner;
}
for (const n of [2, 3, 4]) { const seats = [[0, 2], [0, 1, 2], [0, 1, 2, 3]][n - 2]; let ended = 0; for (let g = 0; g < 300; g++) if (game(seats.map(() => 1 + g % 4), seats) >= 0) ended++; ck(ended === 300, n + ' players: all games end ' + ended); }
const rate = (lv, n, G) => { const seats = [[0, 2], [0, 1, 2], [0, 1, 2, 3]][n - 2]; let w = 0; for (let g = 0; g < G; g++) { const me = g % n, levels = seats.map((_, i) => (i === me ? lv : 1)); if (game(levels, seats) === me) w++; } return w / G; };
const base = 1 / 4, e4 = rate(4, 4, 800), e2 = rate(2, 4, 800), r1 = rate(1, 4, 800);
console.log('win rate in 4 players vs three random: random', r1.toFixed(2), 'casual', e2.toFixed(2), 'expert', e4.toFixed(2));
ck(e2 > base + 0.08, 'Casual clearly beats random players'); ck(e4 > e2 - 0.02, 'Expert is not worse than Casual'); ck(e4 > 0.4, 'Expert wins over 40% against three random players');
console.log(bad ? 'LUDO TESTS FAILED' : 'LUDO OK'); process.exit(bad ? 1 : 0);
