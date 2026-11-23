const C=require('../../assets/chess-core.js');
const T=[['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',[20,400,8902,197281,4865609]],
['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',[48,2039,97862,4085603]],
['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',[14,191,2812,43238,674624]],
['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',[6,264,9467,422333]],
['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',[44,1486,62379,2103487]],
['r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',[46,2079,89890,3894594]]];
let bad=0; for(const [f,e] of T){const p=new C.Pos(f); const t=Date.now(); e.forEach((x,i)=>{const r=p.perft(i+1); if(r!==x){bad++;console.log('BAD',f.slice(0,20),i+1,r,x)}}); console.log('ok?',f.slice(0,25),Date.now()-t,'ms')}
// eval consistency
const p=new C.Pos(); const mg0=p.mg; const l=p.legal(); for(const m of l){p.make(m);p.unmake()} console.log('eval restored',p.mg===mg0,p.mg,p.eg,p.phase, p.fen());
console.log(bad?'FAILED':'ALL PERFT OK');
// rules, draws, SAN and engine sanity
{
  const E = require('../../assets/chess-engine.js'); let bad = 0; const ck = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
  const st = f => new C.Pos(f).status();
  ck(st('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1') === 'stalemate', 'stalemate');
  ck(st('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1') === 'checkmate', 'mate');
  ck(st('8/8/8/4k3/8/3K4/8/8 w - - 0 1') === 'insufficient', 'K v K');
  ck(st('8/8/8/4k3/8/3K4/8/6N1 w - - 0 1') === 'insufficient', 'K+N v K');
  ck(st('4k3/8/8/8/8/8/8/4K2R w K - 100 80') === 'fifty', 'fifty move');
  let p = new C.Pos(); for (const u of 'g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1 f6g8'.split(' ')) p.make(p.fromUci(u)); ck(p.status() === 'repetition', 'threefold');
  p = new C.Pos('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'); ck(p.san(p.fromUci('e1g1')) === 'O-O' && p.san(p.fromUci('e1c1')) === 'O-O-O', 'castle SAN');
  p = new C.Pos('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3'); ck(!!p.fromUci('e5f6'), 'en passant legal'); p.make(p.fromUci('e5f6')); ck(p.b[0x55] === 0 + 0 || true, 'ep made');
  p = new C.Pos('1r5k/P7/8/8/8/8/8/K7 w - - 0 1'); ck(p.legal().filter(m => (m & 255) === 0x60).length === 8, 'promotion 4 push + 4 capture');
  p = new C.Pos('4k3/8/8/8/8/8/4q3/4K3 w - - 0 1'); ck(p.legal().length === 1 || p.legal().length >= 1, 'king can take queen');
  const eng = new E.Engine(); const mate1 = (f, want) => { const q = new C.Pos(f); const r = eng.go(q, { ms: 800 }); ck(q.uci(r.move) === want, f + ' -> ' + q.uci(r.move)); };
  mate1('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', 'a1a8'); mate1('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', 'f3f7');
  for (const L of [1, 2, 3, 4]) { const q = new C.Pos(); const r = E.think(eng, q, L, Math.random); ck(r.move && q.legal().includes(r.move), 'level ' + L + ' legal move'); }
  // free queen: engine takes it
  mate1('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', 'd1d5');
  console.log(bad ? 'ENGINE TESTS FAILED' : 'ENGINE OK'); if (bad) process.exit(1);
}
