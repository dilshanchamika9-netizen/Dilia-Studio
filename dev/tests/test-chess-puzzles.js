// Every shipped puzzle: no mate in one, exactly one first move forces mate in two, and it is the stored one.
global.window = global; const C = require('../../assets/chess-core.js'); require('../../assets/chess-puzzles.js'); const D = global.DiliaChessPuzzles;
let bad = 0; const t = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const mates = p => { for (const m of p.legal()) { p.make(m); const x = p.status() === 'checkmate'; p.unmake(); if (x) return true; } return false; };
t(D.length >= 300, 'at least 300 puzzles, got ' + D.length); t(new Set(D.map(d => d[0])).size === D.length, 'positions unique');
for (const [fen, u] of D) {
  const p = new C.Pos(fen); if (mates(p)) { t(false, 'mate in one: ' + fen); continue; }
  const good = []; for (const m of p.legal()) { p.make(m); let ok = p.legal().length > 0 && p.status() !== 'stalemate' && p.status() !== 'checkmate'; if (ok) for (const r of p.legal()) { p.make(r); const h = mates(p); p.unmake(); if (!h) { ok = false; break; } } p.unmake(); if (ok) good.push(p.uci(m)); }
  t(good.length === 1 && good[0] === u, 'unique key move ' + fen + ' ' + good + ' vs ' + u);
}
console.log(bad ? 'FAILS ' + bad : 'CHESS PUZZLES OK', D.length); process.exit(bad ? 1 : 0);
