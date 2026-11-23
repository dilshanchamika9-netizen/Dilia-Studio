// Daily puzzle generators, 400 days from launch: every board has exactly one answer, is the same on every run,
// and builds fast. Run: node dev/tests/test-playgen.js
const G = require('../../assets/playgen.js');
const d0 = Date.UTC(2026, 10, 23), DAYS = 400; const bad = []; let slow = 0;
const valid = s => { for (let i = 0; i < 9; i++) { const r = new Set(), c = new Set(), b = new Set(); for (let k = 0; k < 9; k++) { r.add(s[i*9+k]); c.add(s[k*9+i]); b.add(s[(3*((i/3)|0)+((k/3)|0))*9 + 3*(i%3) + k%3]); } if (r.size < 9 || c.size < 9 || b.size < 9 || r.has(0)) return false; } return true; };
for (let i = 0; i < DAYS; i++) {
  const key = new Date(d0 + i * 864e5).toISOString().slice(0, 10);
  let t = Date.now(); const P = G.makePath(key); slow = Math.max(slow, Date.now() - t);
  if (P.no !== i + 1) bad.push(key + ' day number ' + P.no);
  if (P.n !== [7, 5, 5, 6, 6, 6, 7][G.weekday(key)]) bad.push(key + ' size');
  const r = G.solvePath(P.n, Int32Array.from(P.clues), P.last, 5e7);
  if (r.out || r.count !== 1) bad.push(key + ' path answers: ' + r.count + (r.out ? ' (search cut)' : ''));
  if (!G.checkPath(P.n, P.clues, P.last, P.path)) bad.push(key + ' path fails its own rules');
  const bent = P.path.slice(); bent.reverse(); if (G.checkPath(P.n, P.clues, P.last, bent)) bad.push(key + ' reversed path accepted');
  if (JSON.stringify(G.makePath(key)) !== JSON.stringify(P)) bad.push(key + ' path not repeatable');
  for (const lv of ['easy', 'medium', 'hard']) {
    t = Date.now(); const S = G.makeSudoku(key, lv); slow = Math.max(slow, Date.now() - t);
    if (!valid(S.solution)) bad.push(key + lv + ' solution invalid');
    if (G.solveSudoku(S.grid, 2) !== 1) bad.push(key + lv + ' not one answer');
    if (S.grid.some((v, j) => v && v !== S.solution[j])) bad.push(key + lv + ' clue differs from answer');
    if (lv === 'hard' && S.clues > 28) bad.push(key + ' hard has ' + S.clues + ' clues');
    if (JSON.stringify(G.makeSudoku(key, lv)) !== JSON.stringify(S)) bad.push(key + lv + ' not repeatable');
  }
}
// endless path levels 1-100 (sizes 5×5 to 8×8)
for (let L = 1; L <= 100; L++) {
  const t = Date.now(), P = G.makeLevel(L); slow = Math.max(slow, Date.now() - t);
  if (P.n !== G.levelSize(L)) bad.push('level ' + L + ' size');
  const r = G.solvePath(P.n, Int32Array.from(P.clues), P.last, 2e8);
  if (r.out || r.count !== 1) bad.push('level ' + L + ' answers: ' + r.count + (r.out ? ' (search cut)' : ''));
  if (!G.checkPath(P.n, P.clues, P.last, P.path)) bad.push('level ' + L + ' fails its own rules');
}
// minesweeper: daily boards (400 days) and free no-guess boards open safely and solve by logic alone
for (let i = 0; i < DAYS; i++) {
  const key = new Date(d0 + i * 864e5).toISOString().slice(0, 10), t = Date.now(), M = G.makeDailyMines(key); slow = Math.max(slow, Date.now() - t);
  if (!M || M.mine.filter(Boolean).length !== 40 || M.mine[M.start]) bad.push(key + ' daily mines layout');
  else if (!G.mineSolve(16, 16, M.mine, M.start)) bad.push(key + ' daily mines need a guess');
  if (M && JSON.stringify(G.makeDailyMines(key)) !== JSON.stringify(M)) bad.push(key + ' daily mines not repeatable');
}
for (const [w, h, n] of [[9, 9, 10], [16, 16, 40], [30, 16, 99], [16, 30, 99]]) for (let k = 0; k < 20; k++) {
  const st = (k * 37) % (w * h), t = Date.now(), M = G.makeMines('t' + k, w, h, n, st, true, 3000); slow = Math.max(slow, Date.now() - t);
  if (!M || !G.mineSolve(w, h, M.mine, st) || M.mine.filter(Boolean).length !== n || M.mine[st]) bad.push('free ' + w + 'x' + h + ' #' + k);
}
// solitaire: 120 daily deals are winnable, and the solver's own line wins with the real rules
for (let i = 0; i < 120; i++) {
  const key = new Date(d0 + i * 864e5).toISOString().slice(0, 10), t = Date.now(), D = G.klDaily(key); slow = Math.max(slow, Date.now() - t);
  if (!D) { bad.push(key + ' no winnable deal'); continue; }
  const r = G.klSolve(D, 6000); if (!r.won) { bad.push(key + ' daily deal not solved again'); continue; }
  try { if (!G.klReplay(D, r.moves).won) bad.push(key + ' solver line does not win'); } catch (e) { bad.push(key + ' ' + e.message); }
  if (JSON.stringify(G.klDaily(key)) !== JSON.stringify(D)) bad.push(key + ' daily deal not repeatable');
}
if (slow > 1500) bad.push('slowest board took ' + slow + ' ms');
console.log(DAYS + ' days, 100 levels, mines and 120 solitaire deals checked, slowest board ' + slow + ' ms, ' + bad.length + ' problems'); bad.slice(0, 10).forEach(b => console.log('  ' + b));
process.exit(bad.length ? 1 : 0);
