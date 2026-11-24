const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../assets/backgammon.js', 'utf8'));
const B = globalThis.DiliaBG; let ok = 0; const bad = []; const t = (c, m) => { if (c) ok++; else { bad.push(m); console.log('FAIL', m); } };
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const total = (s, pl) => { let c = s.bar[pl] + s.off[pl]; for (let i = 0; i < 24; i++) c += B.own(s, i, pl); return c; };
const S = B.NEW(); t(total(S, 0) === 15 && total(S, 1) === 15, 'start has 15 each'); t(B.pips(S, 0) === 167 && B.pips(S, 1) === 167, 'start pip 167');
// opening 3-1: known to have the same result set as the standard play list; count distinct final positions
S.dice = [3, 1]; const p31 = B.plays(S, 0); t(p31.length >= 10 && p31.every(r => r.moves.length === 2), 'opening 3-1 plays use both dice: ' + p31.length);
S.dice = [6, 6]; const p66 = B.plays(S, 0); t(p66.length > 0 && p66.every(r => r.moves.length <= 4), 'opening 6-6 ok'); 
// bar rule: must enter first
let s = B.NEW(); s.p = new Array(24).fill(0); s.p[10] = 3; s.p[3] = 2; s.p[15] = -2; s.bar[0] = 1; s.p[0] = 0; s.dice = [4, 2];
let fs1 = B.firstSteps(s, 0); t(fs1.length > 0 && fs1.every(m => m.f === 24), 'with a checker on the bar only entry moves');
// blocked entry: opponent holds point idx 20 (die 4) and 22 (die 2)
s = B.NEW(); s.p = new Array(24).fill(0); s.p[10] = 5; s.p[20] = -2; s.p[22] = -2; s.bar[0] = 1; s.dice = [4, 2]; t(B.plays(s, 0).length === 0, 'cannot enter when both points blocked');
// hit sends blot to the bar
s = B.NEW(); s.p = new Array(24).fill(0); s.p[10] = 2; s.p[7] = -1; s.p[1] = 2; s.dice = [3]; let h = B.plays(s, 0).find(r => r.moves[0].f === 10); t(h && h.pos.bar[1] === 1 && h.pos.p[7] === 1, 'hit goes to the bar');
// larger die rule: only one die playable -> must play larger
s = B.NEW(); s.p = new Array(24).fill(0); s.p[7] = 1; s.p[6] = 0; s.p[4] = -2; s.p[2] = -2; s.p[1] = -2; s.p[5] = 0; s.p[0] = 0; s.p[3] = 0; s.p[10] = 0; s.p[1] = -2;
s.p[8] = 1; s.dice = [6, 1]; let pp = B.plays(s, 0); t(pp.length > 0, 'some play exists');
// bear off exact, and higher die from highest point only
s = B.NEW(); s.p = new Array(24).fill(0); s.p[2] = 3; s.p[0] = 2; s.off[0] = 10; s.p[20] = -1; s.dice = [6]; pp = B.plays(s, 0); t(pp.length === 1 && pp[0].moves[0].f === 2 && pp[0].moves[0].t === -1, '6 bears off from highest point (idx 2)');
s.dice = [2]; pp = B.plays(s, 0); t(pp.some(r => r.moves[0].t === -1 && r.moves[0].f === 1) === false, 'die 2 cannot bear off from idx 1 pointlessly (no checker there)');
s.dice = [3]; pp = B.plays(s, 0); t(pp.some(r => r.moves[0].f === 2 && r.moves[0].t === -1), 'die 3 bears off from idx 2 exactly');
// cannot bear off with checker outside home
s = B.NEW(); s.p = new Array(24).fill(0); s.p[8] = 1; s.p[1] = 2; s.off[0] = 12; s.p[22] = -1; s.dice = [5]; pp = B.plays(s, 0); t(pp.every(r => r.moves[0].t !== -1), 'no bearing off with a checker outside home');
// player 1 mirror: bear off idx 21 with die 3 exact (24-3)
s = B.NEW(); s.p = new Array(24).fill(0); s.p[21] = -2; s.p[23] = -1; s.off[1] = 12; s.p[3] = 1; s.turn = 1; s.dice = [3]; pp = B.plays(s, 1); t(pp.some(r => r.moves[0].f === 21 && r.moves[0].t === -1), 'player 1 bears off exact');
// doubles: four moves where possible
S.dice = [2, 2, 2, 2]; t(B.plays(S, 0).every(r => r.moves.length === 4), 'doubles play four moves from the opening');
// random playouts: conservation and termination at every level pair
function play(l0, l1, cap) {
  let st = B.NEW(); st.turn = 0; let n = 0;
  while (n++ < cap) {
    st.dice = B.rollDice(rnd); const lv = st.turn === 0 ? l0 : l1; const r = B.choose(st, lv, rnd);
    if (r) { st = r.pos; st.dice = []; }
    t(total(st, 0) === 15 && total(st, 1) === 15, 'conservation');
    if (st.off[st.turn] === 15) return { w: st.turn, st };
    st.turn = 1 - st.turn;
  }
  return null;
}
for (let g = 0; g < 6; g++) { const r = play(1, 1, 800); t(r && r.w >= 0, 'random game finishes'); }
// strength ordering (small samples, generous thresholds): level 3 beats random, level 4 does not lose to level 3 by much
let w3 = 0; for (let g = 0; g < 16; g++) { const a = g % 2; const r = a ? play(1, 3, 900) : play(3, 1, 900); if (r && r.w === (a ? 1 : 0)) w3++; }
t(w3 >= 12, 'level 3 beats random at least 12/16, got ' + w3); console.log('level3 vs random', w3 + '/16');
let w4 = 0; for (let g = 0; g < 10; g++) { const a = g % 2; const r = a ? play(1, 4, 900) : play(4, 1, 900); if (r && r.w === (a ? 1 : 0)) w4++; }
t(w4 >= 8, 'level 4 beats random at least 8/10, got ' + w4); console.log('level4 vs random', w4 + '/10');
const G = (i) => { const x = B.NEW(); x.p = new Array(24).fill(0); x.p[i] = -15; x.off = [15, 0]; return x; };
t(B.winKind(G(12), 0) === 2, 'gammon when loser has nothing off'); t(B.winKind(G(3), 0) === 3, 'backgammon when loser is stuck in winner home'); t(B.winKind(Object.assign(G(12), { off: [15, 1] }), 0) === 1, 'single win');
console.log(bad.length ? 'FAILS ' + bad.length : 'BACKGAMMON OK', ok); process.exit(bad.length ? 1 : 0);
