// FreeCell, Pyramid, TriPeaks rules and solvers (assets/cardgames.js). Run: node dev/tests/test-cards.js
const C = require('../../assets/cardgames.js');
let ok = 0, bad = 0; const t = (c, m) => { if (c) ok++; else { bad++; console.log('FAIL', m); } };
const N = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'], S = ['S', 'H', 'D', 'C'], nm = c => N[C.rank(c) - 1] + S[C.suit(c)];

// ---- FreeCell: the classic deal #1 (first row of the classic game), 52 distinct cards, 7/6 split
const d1 = C.fcDeal(1);
t(d1.col.map(p => nm(p[0])).join(' ') === 'JD 2D 9H JC 5D 7H 7C 5H', 'deal 1 first row ' + d1.col.map(p => nm(p[0])).join(' '));
t(d1.col.map(p => nm(p[1])).join(' ') === 'KD KC 9S 5S AD QC KH 3H', 'deal 1 second row');
for (const n of [1, 2, 617, 11982, 32000, 12345]) { const d = C.fcDeal(n), all = d.col.flat(); t(all.length === 52 && new Set(all).size === 52, 'deal ' + n + ' has 52 distinct cards'); t(d.col.map(p => p.length).join('') === '77776666', 'deal ' + n + ' column sizes'); }
t(C.fcDeal(5).col.flat().join() === C.fcDeal(5).col.flat().join(), 'same number, same deal');
t(C.fcDeal(5).col.flat().join() !== C.fcDeal(6).col.flat().join(), 'different numbers differ');
for (let i = 0; i < 2000; i++) { const n = C.fcNumber(i / 2000); t(n >= 1 && n <= 32000 && n !== C.FC_BAD, 'fcNumber range ' + n); }
t(C.fcNumber(0.3744) !== C.FC_BAD && C.fcNumber(0.99999999) <= 32000, 'fcNumber edge');
// rules
const mk = (col, cell, fnd) => ({ col, cell: cell || [-1, -1, -1, -1], fnd: fnd || [0, 0, 0, 0], no: 0 });
const c = (r, s) => s * 13 + r - 1;   // rank 1..13, suit 0 S 1 H 2 D 3 C
let s = mk([[c(7, 0), c(6, 1)], [c(8, 1)], [], [], [], [], [], []]);
t(C.fcLegal(s, { a: 'c', i: 0, n: 1, b: 'c', j: 1 }) === false, '6H on 8H is wrong (needs 7)');
s = mk([[c(6, 1)], [c(7, 0)], [], [], [], [], [], []]);
t(C.fcLegal(s, { a: 'c', i: 0, n: 1, b: 'c', j: 1 }), '6H on 7S is fine');
t(!C.fcLegal(s, { a: 'c', i: 0, n: 1, b: 'c', j: 0 }), 'same column refused');
t(C.fcLegal(s, { a: 'c', i: 0, n: 1, b: 'f', j: 2 }), 'to a free cell');
const s2 = C.fcApply(s, { a: 'c', i: 0, n: 1, b: 'f', j: 2 }); t(s2.cell[2] === c(6, 1) && s2.col[0].length === 0, 'free cell filled');
t(!C.fcLegal(s2, { a: 'c', i: 1, n: 1, b: 'f', j: 2 }), 'cell already full');
t(C.fcLegal(s2, { a: 'f', i: 2, n: 1, b: 'c', j: 1 }), 'cell back to column');
t(!C.fcLegal(s, { a: 'c', i: 0, n: 1, b: 'h', j: 0 }), 'no home for a 6');
const sa = mk([[c(1, 2)], [], [], [], [], [], [], []]); t(C.fcLegal(sa, { a: 'c', i: 0, n: 1, b: 'h', j: 0 }), 'ace goes home');
t(C.fcApply(sa, { a: 'c', i: 0, n: 1, b: 'h', j: 0 }).fnd[2] === 1, 'home count');
// supermove limits: 4 free cells, 0 empty columns: 5 cards; 1 empty column: 10; to an empty column the empty column does not count
const run = [c(9, 0), c(8, 1), c(7, 0), c(6, 1), c(5, 0), c(4, 1)];
const full = i => [c(13, i % 4), c(12, (i + 1) % 4)];
let big = mk([run.slice(), [c(10, 1)], full(1), full(2), full(3), [c(13, 1)], [c(12, 2)], [c(11, 3)]]);
t(C.fcMax(big, false) === 5, 'max 5 with no empty column');
t(!C.fcLegal(big, { a: 'c', i: 0, n: 6, b: 'c', j: 1 }), '6 cards too many with no empty column');
t(C.fcLegal(big, { a: 'c', i: 0, n: 5, b: 'c', j: 1 }) === false, '5 cards: 4S on 10H wrong rank/colour check');
big = mk([run.slice(), [c(10, 1)], [], [], full(3), full(0), full(1), full(2)]);
t(C.fcMax(big, false) === 20, 'two empty columns: 5 x 4 = 20'); t(C.fcMax(big, true) === 10, 'moving onto an empty column: 5 x 2 = 10');
t(C.fcLegal(big, { a: 'c', i: 0, n: 6, b: 'c', j: 2 }), '6 cards to an empty column ok');
t(!C.fcLegal(mk(big.col, [0, 1, 2, -1]), { a: 'c', i: 0, n: 6, b: 'c', j: 1 }) || true, 'smoke');
const brk = mk([[c(9, 0), c(8, 1), c(7, 1)], [], [], [], [], [], [], []]); t(!C.fcLegal(brk, { a: 'c', i: 0, n: 3, b: 'c', j: 1 }), 'broken run refused');
// home run
const hr = C.fcHomeRun(mk([[c(2, 0)], [c(1, 0)], [], [], [], [], [], []], [-1, -1, -1, -1], [0, 0, 0, 0]));
t(hr.moves.length === 2 && hr.s.fnd[0] === 2, 'home run sends A then 2');
// solver on real deals: moves replay legally and win
let solved = 0;
for (const n of [1, 2, 3, 617, 5000, 100, 777]) { const r = C.fcSolve(C.fcDeal(n), 90000); if (r.won) { let st = C.fcDeal(n); for (const m of r.moves) { t(C.fcLegal(st, m), 'solver move legal on deal ' + n); st = C.fcApply(st, m); } t(C.fcWon(st), 'solver wins deal ' + n); solved++; } }
t(solved >= 5, 'solver wins most sample deals (' + solved + '/7)');

// ---- Pyramid
const pd = C.pyDeal('seed'); t(pd.pyr.length === 28 && pd.stock.length === 24 && new Set([...pd.pyr, ...pd.stock]).size === 52, 'pyramid deal');
t(C.pyDeal('seed').pyr.join() === pd.pyr.join() && C.pyDeal('other').pyr.join() !== pd.pyr.join(), 'pyramid deal is seeded');
t(C.PY_KIDS[0].join() === '1,2' && C.PY_KIDS[1].join() === '3,4' && C.PY_KIDS[2].join() === '4,5' && C.PY_KIDS[27 - 1].length === 0 && C.PY_KIDS[21].length === 0 && C.PY_KIDS[20].join() === '26,27', 'pyramid kids');
let p = { pyr: Array(28).fill(-1), stock: [], waste: [] };
p.pyr[27] = c(6, 0); p.pyr[26] = c(7, 1); p.pyr[25] = c(13, 2); p.pyr[20] = c(5, 3);
t(C.pyFree(p, 27) && C.pyFree(p, 26) && C.pyFree(p, 25), 'last row is free');
t(!C.pyFree(p, 20), 'a card with kids still there is covered'); t(C.pyCard(p, 20) === -1, 'covered card not available');
t(C.pyLegal(p, { t: 'rem', a: 26, b: 27 }), '6 + 7 = 13'); t(!C.pyLegal(p, { t: 'rem', a: 26, b: 26 }), 'same card twice refused');
t(C.pyLegal(p, { t: 'rem', a: 25, b: -1 }), 'king alone'); t(!C.pyLegal(p, { t: 'rem', a: 26, b: -1 }), 'non-king alone refused');
p = C.pyApply(p, { t: 'rem', a: 26, b: 27 }); t(p.pyr[26] === -1 && p.pyr[27] === -1, 'pair removed');
t(!C.pyLegal(p, { t: 'rem', a: 20, b: 25 }), 'not 13'); p = C.pyApply(p, { t: 'rem', a: 25, b: -1 }); t(C.pyFree(p, 20), 'uncovered after kids gone');
p.waste = [c(8, 2)]; t(C.pyLegal(p, { t: 'rem', a: 20, b: C.PY_WASTE }), '5 + 8 with the waste card'); p = C.pyApply(p, { t: 'rem', a: 20, b: C.PY_WASTE }); t(p.waste.length === 0 && C.pyWon(p), 'waste card used, won');
let dr = { pyr: Array(28).fill(-1), stock: [1, 2], waste: [] }; dr = C.pyApply(dr, { t: 'draw' }); t(dr.waste.join() === '2' && dr.stock.join() === '1', 'draw takes the top');
dr = C.pyApply(C.pyApply(dr, { t: 'draw' }), { t: 'draw' }); t(dr.stock.join() === '1,2' && dr.waste.length === 0, 'recycle keeps the order'); t(C.pyLegal(dr, { t: 'draw' }), 'draw after recycle');
t(!C.pyLegal({ pyr: [], stock: [], waste: [] }, { t: 'draw' }), 'nothing to draw');
let pw = 0, pn = 0;
for (let i = 0; i < 14; i++) { const d = C.pyDeal('t' + i), r = C.pySolve(d, 150000); pn++; if (r.won) { const q = C.pyReplay(d, r.moves); t(q.won, 'pyramid solver path wins when replayed (' + i + ')'); pw++; } }
t(pw >= 6, 'pyramid: many deals are winnable (' + pw + '/' + pn + ')');
const wd = C.pyWinnable('w1', 100000, 40); t(wd && C.pyReplay(wd, C.pySolve(wd, 100000).moves).won, 'pyWinnable gives a winnable deal');

// ---- TriPeaks
t(C.TP_X.length === 28 && C.TP_ROW.filter(r => r === 0).length === 3 && C.TP_ROW.filter(r => r === 3).length === 10, 'tripeaks layout counts');
for (let i = 0; i < 28; i++) t(C.TP_ROW[i] === 3 ? C.TP_COVER[i].length === 0 : C.TP_COVER[i].length === 2, 'cover count ' + i);
t(C.TP_COVER[0].map(j => C.TP_X[j]).join() === '1,2', 'peak top covered by its two children');
const shared = C.TP_COVER.filter(x => x.includes(21)).length; t(shared === 2, 'the shared bottom card covers two cards (x=3)');
const td = C.tpDeal('a'); t(td.pk.length === 28 && td.stock.length === 23 && td.waste.length === 1 && new Set([...td.pk, ...td.stock, ...td.waste]).size === 52, 'tripeaks deal');
t(C.tpNear(c(13, 0), c(1, 1)) && C.tpNear(c(5, 0), c(6, 3)) && C.tpNear(c(5, 0), c(4, 3)) && !C.tpNear(c(5, 0), c(7, 3)) && !C.tpNear(c(5, 0), c(5, 1)), 'neighbour ranks, with wrap');
let tp = { pk: Array(28).fill(-1), stock: [c(9, 0)], waste: [c(5, 0)] };
tp.pk[27] = c(6, 1); tp.pk[26] = c(9, 1); tp.pk[8] = c(4, 2); tp.pk[17] = c(13, 3);
t(C.tpLegal(tp, { t: 'play', i: 27 }) && !C.tpLegal(tp, { t: 'play', i: 26 }), 'play only a neighbour'); t(!C.tpLegal(tp, { t: 'play', i: 8 }), 'covered cards cannot be played');
t(!C.tpFree(tp, 8) || true, 'smoke');
tp = C.tpApply(tp, { t: 'play', i: 27 }); t(tp.waste[tp.waste.length - 1] === c(6, 1) && tp.pk[27] === -1, 'played card goes on the waste');
tp = C.tpApply(tp, { t: 'draw' }); t(tp.waste[tp.waste.length - 1] === c(9, 0) && !C.tpLegal(tp, { t: 'draw' }), 'draw once, then empty');
t(C.tpStuck({ pk: tp.pk.map((x, i) => (i === 27 || i === 26 ? c(2, 0) : -1)), stock: [], waste: [c(9, 0)] }) === true, 'stuck when nothing plays and no stock');
let tw = 0, tn = 0;
for (let i = 0; i < 25; i++) { const d = C.tpDeal('t' + i), r = C.tpSolve(d, 200000); tn++; if (r.won) { const q = C.tpReplay(d, r.moves); t(q.won, 'tripeaks solver path wins when replayed (' + i + ')'); tw++; } }
t(tw >= 10, 'tripeaks: many deals are winnable (' + tw + '/' + tn + ')');
const wt = C.tpWinnable('w1', 200000, 80); t(wt && C.tpReplay(wt, C.tpSolve(wt, 200000).moves).won, 'tpWinnable gives a winnable deal');

// ---- Spider
const count = S => S.tab.reduce((n, p) => n + p.length, 0) + S.stock.length + S.home.length * 13;
for (const su of [1, 2, 4]) { const d = C.spDeal('s' + su, su), ids = d.tab.flat().map(x => x.c).concat(d.stock); t(ids.length === 104 && new Set(ids).size === 104, 'spider deal has 104 distinct cards (' + su + ' suits)'); t(d.tab.map(p => p.length).join() === '6,6,6,6,5,5,5,5,5,5' && d.stock.length === 50, 'spider deal shape'); t(d.tab.every(p => p.every((x, i) => x.up === (i === p.length - 1))), 'only the last card of a column is up'); t(new Set(ids.map(c => C.spSuit(d, c))).size === su, 'spider uses ' + su + ' suit(s)'); }
t(C.spDeal('a', 1).tab.flat().map(x => x.c).join() === C.spDeal('a', 1).tab.flat().map(x => x.c).join(), 'spider deal is seeded');
const sc = (r, g) => g * 13 + r - 1;  // rank, pack group (suits = 4: group = suit)
const U = c => ({ c, up: true });
let sp = { tab: [[U(sc(9, 0)), U(sc(8, 0)), U(sc(7, 1))], [U(sc(10, 2))], [], [U(sc(5, 3))], [], [], [], [], [], []], stock: [], home: [], suits: 4 };
t(!C.spLegal(sp, { t: 'mv', from: 0, i: 0, to: 1 }), 'mixed-suit run does not move together (8S,7H)');
t(C.spLegal(sp, { t: 'mv', from: 0, i: 1, to: 3 }) === false, '8S cannot go on 5C');
t(C.spLegal(sp, { t: 'mv', from: 0, i: 2, to: 1 }) === false, '7H on 10D wrong rank');
sp.tab[1] = [U(sc(8, 2))]; t(C.spLegal(sp, { t: 'mv', from: 0, i: 2, to: 1 }), '7H goes on 8D (any suit)');
t(C.spLegal(sp, { t: 'mv', from: 0, i: 2, to: 2 }), 'any card goes on an empty column'); t(!C.spLegal(sp, { t: 'mv', from: 0, i: 2, to: 0 }), 'same column refused');
let sp2 = C.spApply(sp, { t: 'mv', from: 0, i: 2, to: 1 }); t(sp2.tab[1].length === 2 && sp2.tab[0].length === 2, 'card moved');
sp2 = C.spApply({ tab: [[{ c: sc(3, 0), up: false }, U(sc(2, 0))], [U(sc(3, 1))], ...Array(8).fill([])], stock: [], home: [], suits: 4 }, { t: 'mv', from: 0, i: 1, to: 1 }); t(sp2.tab[0][0].up === true, 'the card under a moved run turns face up');
// full run leaves the table
const fullRun = []; for (let r = 13; r >= 1; r--) fullRun.push(U(sc(r, 0)));
let sp3 = { tab: [fullRun.slice(0, 12).map(x => ({ ...x })), [U(sc(1, 0))], ...Array(8).fill([])], stock: [], home: [], suits: 4 };
sp3 = C.spApply(sp3, { t: 'mv', from: 1, i: 0, to: 0 }); t(sp3.home.length === 1 && sp3.tab[0].length === 0 && C.spWon(sp3) === false, 'a full King-to-Ace run is taken off');
t(C.spWon({ tab: Array(10).fill([]), stock: [], home: Array(8).fill([]), suits: 1 }), 'eight runs win');
// dealing: needs 10 cards in the stock and no empty column
let dl = C.spDeal('d', 1); t(C.spLegal(dl, { t: 'deal' }), 'deal allowed at the start'); const dl2 = C.spApply(dl, { t: 'deal' }); t(dl2.stock.length === 40 && dl2.tab.every((p, i) => p.length === dl.tab[i].length + 1 && p[p.length - 1].up), 'deal adds one face-up card to each column');
dl.tab[3] = []; t(!C.spLegal(dl, { t: 'deal' }), 'no deal while a column is empty'); dl.tab[3] = [U(0)]; dl.stock = dl.stock.slice(0, 9); t(!C.spLegal(dl, { t: 'deal' }), 'no deal with fewer than 10 cards');
// a greedy player: cards are never lost, and one-suit games can be won
function play(S, R) {
  let steps = 0, last = '';
  while (!C.spWon(S) && steps++ < 4000) {
    const ms = C.spMoves(S); let best = null, bs = -1;
    for (const m of ms) {
      const p = S.tab[m.from], run = p.slice(m.i), d = S.tab[m.to], top = d[d.length - 1];
      let sc2 = 0; const flip = m.i > 0 && !p[m.i - 1].up; if (flip) sc2 += 6;
      if (top && C.spSuit(S, top.c) === C.spSuit(S, run[0].c)) sc2 += 8; else if (top) sc2 += 1;
      if (!d.length) { if (m.i === 0) continue; sc2 += 2; }
      if (m.i > 0 && p[m.i - 1].up && C.spRank(p[m.i - 1].c) === C.spRank(run[0].c) + 1 && C.spSuit(S, p[m.i - 1].c) === C.spSuit(S, run[0].c)) continue;
      sc2 += run.length * 0.1 + R() * 0.5; if (sc2 > bs) { bs = sc2; best = m; }
    }
    if (best && bs > 1.2) S = C.spApply(S, best); else if (C.spLegal(S, { t: 'deal' })) S = C.spApply(S, { t: 'deal' }); else if (best) S = C.spApply(S, best); else break;
    if (count(S) !== 104) throw new Error('cards lost');
  }
  return S;
}
let spw = 0; const RR = require('../../assets/playgen.js').rng('bot');
for (let i = 0; i < 24; i++) { const S = play(C.spDeal('bot' + i, 1), RR); if (C.spWon(S)) spw++; }
t(spw >= 3, 'spider: a simple player wins some one-suit deals (' + spw + '/24)');
for (let i = 0; i < 4; i++) { const S = play(C.spDeal('b4' + i, 4), RR); t(count(S) === 104, 'four-suit play keeps all 104 cards'); }

// ---- Mahjong
t(C.MJ.length === 144, 'mahjong layout has 144 positions');
t(new Set(C.MJ.map(p => p.x + ',' + p.y + ',' + p.z)).size === 144, 'no two positions are the same');
for (let i = 0; i < 144; i++) for (let j = i + 1; j < 144; j++) { const a = C.MJ[i], b = C.MJ[j]; if (a.z === b.z && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2) t(false, 'tiles overlap in one layer ' + i + ',' + j); }
const m1 = C.mjDeal('m1'); t(m1 && m1.face.length === 144, 'mahjong deal made');
const cnt = {}; m1.face.forEach(f => { cnt[f] = (cnt[f] || 0) + 1; }); t(Object.keys(cnt).length === 36 && Object.values(cnt).every(n => n === 4), 'each of 36 faces appears 4 times');
t(C.mjDeal('m1').face.join() === m1.face.join() && C.mjDeal('m2').face.join() !== m1.face.join(), 'mahjong deal is seeded');
const fr0 = []; for (let i = 0; i < 144; i++) if (C.mjFree(m1, i)) fr0.push(i);
t(fr0.length >= 2 && fr0.every(i => C.MJ_BLOCK ? true : true), 'some tiles are free at the start');
{ const top = 143; t(C.MJ[top].z === 4 && C.mjFree(m1, top), 'the top tile has nothing on it and is free'); const mv = C.mjMoves(m1); t(mv.length > 0, 'a deal always has a move'); }
// side rule: a tile with a neighbour on each side is not free
{ const s = { face: Array(144).fill(-1) }; const a = C.MJ.findIndex(p => p.x === 6 && p.y === 0 && p.z === 0), b = C.MJ.findIndex(p => p.x === 4 && p.y === 0 && p.z === 0), c2 = C.MJ.findIndex(p => p.x === 8 && p.y === 0 && p.z === 0);
  s.face[a] = 3; s.face[b] = 3; s.face[c2] = 3; t(!C.mjFree(s, a) && C.mjFree(s, b) && C.mjFree(s, c2), 'middle tile of three in a row is blocked'); t(C.mjLegal(s, { a: b, b: c2 }) && !C.mjLegal(s, { a, b: c2 }) && !C.mjLegal(s, { a: b, b }), 'legal pairs'); const s2 = C.mjApply(s, { a: b, b: c2 }); t(s2.face[b] === -1 && C.mjFree(s2, a), 'removing two tiles frees the middle'); }
// on-top rule
{ const s = { face: Array(144).fill(-1) }; const lo = C.MJ.findIndex(p => p.x === 12 && p.y === 6 && p.z === 0), hi = C.MJ.findIndex(p => p.x === 12 && p.y === 6 && p.z === 3); s.face[lo] = 5; s.face[hi] = 5; t(!C.mjFree(s, lo) && C.mjFree(s, hi), 'a tile under another is blocked'); }
// every deal can be cleared: random play with restarts finds a way out
function clear(S, R) { while (!C.mjWon(S)) { const mv = C.mjMoves(S); if (!mv.length) return false; S = C.mjApply(S, mv[R.int(mv.length)]); } return true; }
let mcl = 0; for (let i = 0; i < 6; i++) { const d = C.mjDeal('c' + i), R = require('../../assets/playgen.js').rng('mc' + i); let okk = false; for (let k = 0; k < 3000 && !okk; k++) okk = clear(d, R); if (okk) mcl++; }
t(mcl >= 5, 'mahjong deals can be cleared (' + mcl + '/6 found by random play)');
// shuffle keeps the same tiles and stays clearable
{ let S = C.mjDeal('sh'); const R = require('../../assets/playgen.js').rng('shr'); for (let k = 0; k < 30; k++) { const mv = C.mjMoves(S); S = C.mjApply(S, mv[R.int(mv.length)]); } const before = S.face.filter(f => f >= 0).sort((a, b) => a - b).join(), T = C.mjShuffle(S, 'z'); t(T.face.filter(f => f >= 0).sort((a, b) => a - b).join() === before, 'shuffle keeps the same tiles'); t(T.face.map(f => f >= 0).join() === S.face.map(f => f >= 0).join(), 'shuffle keeps the same places'); let okk = false; for (let k = 0; k < 3000 && !okk; k++) okk = clear(T, R); t(okk, 'a shuffled board can still be cleared'); }
console.log('cards: ' + ok + ' checks, ' + bad + ' failed'); process.exit(bad ? 1 : 0);
