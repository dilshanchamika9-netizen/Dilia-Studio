// Builds assets/chess-puzzles.js: positions where the side to move has exactly one first move that forces mate in two.
// Found by playing random games and testing every position with a full search of our own rules code. Run: node dev/make-chess-puzzles.js [count]
const C = require('../assets/chess-core.js'), fs = require('fs');
let seed = +process.argv[3] || 20261124; const OUT = process.argv[4]; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const hasMate1 = p => { for (const m of p.legal()) { p.make(m); const mate = p.status() === 'checkmate'; p.unmake(); if (mate) return true; } return false; };
function mate2(p) { // returns list of first moves that force mate in 2 (opponent always has a reply, we always mate next)
  const out = [];
  for (const m of p.legal()) {
    p.make(m); const rep = p.legal(); let ok = rep.length > 0 && p.status() !== 'stalemate';
    if (ok) for (const r of rep) { p.make(r); const h = hasMate1(p); p.unmake(); if (!h) { ok = false; break; } }
    p.unmake(); if (ok) out.push({ m, replies: rep.length });
  }
  return out;
}
const want = +process.argv[2] || 420, found = [], seen = new Set(); let games = 0;
const pieces = f => (f.split(' ')[0].match(/[a-zA-Z]/g) || []).length;
while (found.length < want && games < 40000) {
  games++; const p = new C.Pos(); let ply = 0; const lim = 20 + Math.floor(rnd() * 70);
  while (ply < lim) {
    const l = p.legal(); if (!l.length || p.status() !== 'ongoing') break;
    // light bias: prefer captures and checks a bit, so positions are less empty-board random
    let m = l[Math.floor(rnd() * l.length)]; if (rnd() < 0.35) { const caps = l.filter(x => p.b[(x >> 8) & 255]); if (caps.length) m = caps[Math.floor(rnd() * caps.length)]; }
    p.make(m); ply++;
    if (ply < 14 || ply % 2 === 0 && rnd() < 0.5) continue;
    if (p.inCheck() || p.status() !== 'ongoing') continue;
    const fen = p.fen(); if (pieces(fen) < 9 || seen.has(fen)) continue; seen.add(fen);
    if (hasMate1(p)) continue;
    const r = mate2(p); if (r.length === 1 && r[0].replies >= 2) { found.push([fen, p.uci(r[0].m)]); if (found.length % 50 === 0) console.log(found.length, 'games', games); break; }
  }
}
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(found)); console.log('part', found.length); process.exit(0); }
// order: fixed shuffle so the daily puzzle does not follow generation order
for (let i = found.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [found[i], found[j]] = [found[j], found[i]]; }
fs.writeFileSync(__dirname + '/../assets/chess-puzzles.js', '/* Mate-in-two puzzles, each with exactly one first move that forces mate. Made by dev/make-chess-puzzles.js. [fen, first move]. */\nwindow.DiliaChessPuzzles = ' + JSON.stringify(found) + ';\n');
console.log('wrote', found.length, 'puzzles from', games, 'games');
