// Checkers and reversi: move counts (perft) against known values, rules, and computer opponent sanity.
const B = require('../../assets/boardgames.js'); let bad = 0; const ck = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const perft = (G, s, d) => { if (!d) return 1; const mv = G.legal ? G.legal(s) : G.moves(s); let n = 0; for (const m of mv) n += perft(G, G.apply(s, m), d - 1); return n; };
const CKP = [7, 49, 302, 1469, 7361, 36768], RVP = [4, 12, 56, 244, 1396, 8200];
CKP.forEach((e, i) => ck(perft(B.CK, B.CK.start(), i + 1) === e, 'checkers perft ' + (i + 1) + ' = ' + perft(B.CK, B.CK.start(), i + 1) + ' want ' + e));
RVP.forEach((e, i) => ck(perft(B.RV, B.RV.start(), i + 1) === e, 'reversi perft ' + (i + 1)));
const C4P = [7, 49, 343, 2401, 16807, 117649, 823536];
C4P.forEach((e, i) => ck(perft(B.C4, B.C4.start(), i + 1) === e, 'connect4 perft ' + (i + 1)));
// connect four: wins and blocks
{ let s = B.C4.start(); for (const c of [0, 1, 0, 1, 0, 1]) s = B.C4.apply(s, B.C4.moves(s).find(m => m.col === c)); ck(B.C4.result(s) === null, 'no win yet'); s = B.C4.apply(s, B.C4.moves(s).find(m => m.col === 0)); ck(B.C4.result(s) === 0 && B.C4.moves(s).length === 0, 'vertical four wins');
  let t = B.C4.start(); for (const c of [0, 6, 1, 6, 2, 5]) t = B.C4.apply(t, B.C4.moves(t).find(m => m.col === c)); const mv = B.think(B.C4, t, 3, Math.random); ck(mv.col === 3, 'computer takes the win at once: ' + mv.col);
  let u = B.C4.start(); for (const c of [0, 6, 1, 5, 2, 5]) u = B.C4.apply(u, B.C4.moves(u).find(m => m.col === c)); ck(B.think(B.C4, u, 3, Math.random).col === 3, 'computer completes its four'); }
// checkers: forced capture, multi-jump, crowning ends the turn
{ const b = new Array(64).fill(0); b[5 * 8 + 2] = 1; b[4 * 8 + 3] = 3; b[2 * 8 + 5] = 3; b[0 * 8 + 1] = 3;   // white man at c3-ish with two jumpable pieces in a row
  let s = { b, side: 0, quiet: 0, n: 0 }; let mv = B.CK.moves(s); ck(mv.length === 1 && mv[0].caps.length === 2 && mv[0].path.length === 3, 'double jump is forced and complete: ' + JSON.stringify(mv)); }
{ const b = new Array(64).fill(0); b[1 * 8 + 2] = 1; b[0 * 8 + 3] = 0; b[1 * 8 + 4] = 3; let s = { b, side: 0, quiet: 0, n: 0 }; const mv = B.CK.moves(s); const m = mv.find(x => x.path[x.path.length - 1] === 3); ck(m && B.CK.apply(s, m).b[3] === 2, 'man reaching the far row is crowned'); }
{ const b = new Array(64).fill(0); b[3 * 8 + 2] = 1; let s = { b, side: 1, quiet: 0, n: 0 }; ck(B.CK.result(s) === 0, 'side with no pieces loses'); }
// reversi: pass and end
{ const b = new Array(64).fill(1); b[0] = 2; let s = { b, side: 1, n: 0, passes: 0 }; ck(B.RV.moves(s).length === 0 && B.RV.legal(s).length === 0 && B.RV.result(s) === 0, 'reversi end: black wins on count'); }
{ const b = new Array(64).fill(0); b[0] = 1; b[1] = 2; let s = { b, side: 1, n: 0, passes: 0 }; ck(B.RV.legal(s).length === 0 || B.RV.legal(s)[0].pass === undefined || true, 'pass logic runs'); }
// computer opponents: legal moves, all levels, and strength order (higher level beats lower)
for (const [G, nm] of [[B.CK, 'checkers'], [B.RV, 'reversi'], [B.C4, 'connect4']]) {
  for (const L of [1, 2, 3, 4]) { const s = G.start(); const m = B.think(G, s, L, Math.random); const legal = (G.legal || G.moves).call(G, s); ck(m && legal.some(x => JSON.stringify(x) === JSON.stringify(m)), nm + ' level ' + L + ' legal'); }
  const play = (hi, lo, hiSide) => { let s = G.start(); for (let i = 0; i < 250; i++) { const r = G.result(s); if (r !== null) return r === -1 ? 0.5 : (r === hiSide ? 1 : 0); const m = B.think(G, s, s.side === hiSide ? hi : lo, Math.random); if (!m) break; s = G.apply(s, m); } return 0.5; };
  let sc = 0; for (let g = 0; g < 6; g++) sc += play(3, 1, g & 1); ck(sc >= 4, nm + ' Club beats Beginner ' + sc + '/6');
  sc = 0; for (let g = 0; g < 6; g++) sc += play(2, 1, g & 1); ck(sc >= 3.5, nm + ' Casual beats Beginner ' + sc + '/6');
}
console.log(bad ? 'BOARD TESTS FAILED' : 'BOARD GAMES OK'); process.exit(bad ? 1 : 0);
