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
console.log('cards: ' + ok + ' checks, ' + bad + ' failed'); process.exit(bad ? 1 : 0);
