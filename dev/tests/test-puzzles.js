// Puzzle rules: nonogram (solvable by line logic), sliding, word search, memory.
const Z = require('../../assets/puzzles.js'); let bad = 0; const ck = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
ck(Z.clue([1, 1, 0, 1, 1, 1, 0]).join() === '2,3', 'clue'); ck(Z.clue([0, 0]).join() === '0', 'empty clue');
for (const n of [5, 8, 10, 12]) for (let k = 0; k < 15; k++) {
  const p = Z.nonoNew(n, Math.random); ck(!!p, 'nonogram ' + n + ' generated'); if (!p) continue;
  const s = Z.nonoSolve(p.rows, p.cols); ck(s && s.every((r, i) => r.every((v, j) => v === (p.pic[i][j] ? 1 : 2))), 'line logic gives exactly the picture ' + n);
  const marks = p.pic.map(r => r.map(v => (v ? 1 : 0))); ck(Z.nonoWon(p, marks), 'picture satisfies its own clues'); marks[0][0] = marks[0][0] === 1 ? 0 : 1; ck(!Z.nonoWon(p, marks), 'one wrong cell is not a win');
}
// sliding
for (const n of [3, 4, 5]) for (let k = 0; k < 40; k++) { const t = Z.slideNew(n, Math.random); ck(!Z.slideSolved(t) && t.slice().sort((a, b) => a - b).join() === Array.from({ length: n * n }, (_, i) => i).join(), 'slide deal ' + n); }
{ let t = [1, 2, 3, 4, 5, 6, 7, 0, 8]; let r = Z.slideMove(t, 8, 3); ck(r.moved === 1 && Z.slideSolved(r.t), 'slide one tile to win'); r = Z.slideMove(t, 0, 3); ck(r.moved === 0, 'not in line = no move');
  t = [1, 2, 3, 4, 5, 6, 0, 7, 8]; r = Z.slideMove(t, 8, 3); ck(r.moved === 2 && r.t.join() === '1,2,3,4,5,6,7,8,0', 'row slide moves two tiles');
  t = [0, 2, 3, 4, 5, 6, 1, 7, 8]; r = Z.slideMove(t, 6, 3); ck(r.moved === 2 && r.t[0] === 4 && r.t[3] === 1 && r.t[6] === 0, 'column slide moves two tiles'); }
// word search
for (const th of Object.keys(Z.THEMES)) for (const hard of [false, true]) for (const n of [10, 12]) { const w = Z.wsNew(th, n, 8, hard, Math.random); ck(!!w && w.words.length === 8, 'word search ' + th);
  if (w) for (const p of w.placed) { const r2 = p.r + p.dr * (p.w.length - 1), c2 = p.c + p.dc * (p.w.length - 1); ck(Z.wsRead(w.grid, p.r, p.c, r2, c2) === p.w, 'placed word reads back ' + p.w); if (!hard) ck(p.dr >= 0 && p.dc >= 0, 'easy words go right/down'); } }
{ const g = [['A', 'B'], ['C', 'D']]; ck(Z.wsRead(g, 0, 0, 1, 1) === 'AD' && Z.wsRead(g, 1, 1, 0, 0) === 'DA' && Z.wsRead(g, 0, 0, 0, 1) === 'AB', 'wsRead lines'); ck(Z.wsRead([['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']], 0, 0, 1, 2) === null, 'wsRead rejects bent selection'); }
// memory
for (const p of [6, 8, 12]) { const d = Z.memDeck(p, Math.random), cnt = {}; d.forEach(x => cnt[x] = (cnt[x] || 0) + 1); ck(d.length === 2 * p && Object.values(cnt).every(v => v === 2) && Object.keys(cnt).length === p, 'memory deck ' + p); }
console.log(bad ? 'PUZZLE TESTS FAILED' : 'PUZZLES OK'); process.exit(bad ? 1 : 0);
