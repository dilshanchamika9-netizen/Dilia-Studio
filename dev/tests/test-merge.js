// Merge rules: slide, join once per move, points, "can move", and the daily tile stream is repeatable.
const G = require('../../assets/playgen.js'); const bad = [];
const mk = (vals) => vals.map((v, i) => (v ? { id: i + 1, v } : null));
const vals = g => g.map(t => (t ? t.v : 0));
function row(input, dir, want, gain, moved) {
  const n = 4, g = new Array(16).fill(null);
  input.forEach((v, k) => { if (v) g[dir === 3 || dir === 1 ? k : k * 4] = { id: k + 1, v }; });
  const r = G.mergeMove(g, n, dir), got = [0, 1, 2, 3].map(k => vals(r.grid)[dir === 3 || dir === 1 ? k : k * 4]);
  if (JSON.stringify(got) !== JSON.stringify(want) || r.gain !== gain || r.moved !== moved) bad.push(`${input} dir${dir}: got ${got} +${r.gain} moved=${r.moved}, want ${want} +${gain} moved=${moved}`);
}
row([2, 2, 2, 2], 3, [4, 4, 0, 0], 8, true);
row([2, 2, 4, 0], 3, [4, 4, 0, 0], 4, true);       // the new 4 does not join the old 4 in the same move
row([4, 0, 4, 4], 3, [8, 4, 0, 0], 8, true);
row([2, 4, 2, 4], 3, [2, 4, 2, 4], 0, false);
row([0, 0, 0, 2], 3, [2, 0, 0, 0], 0, true);
row([2, 2, 2, 0], 1, [0, 0, 2, 4], 4, true);       // moving right joins the two on the right first
row([8, 8, 16, 16], 3, [16, 32, 0, 0], 48, true);
row([2, 0, 0, 2], 0, [4, 0, 0, 0], 4, true);       // up (column)
row([2, 2, 0, 0], 2, [0, 0, 0, 4], 4, true);       // down (column)
row([1024, 1024, 0, 0], 3, [2048, 0, 0, 0], 2048, true);
// joined tiles are reported with both old ids
{ const r = G.mergeMove(mk([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 4, 3); if (r.joined.length !== 1 || r.joined[0].to !== 0 || r.joined[0].ids.join() !== '1,2') bad.push('joined report ' + JSON.stringify(r.joined)); }
// can move
if (G.mergeCanMove(mk([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]), 4)) bad.push('full board with no pairs said it can move');
if (!G.mergeCanMove(mk([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 4]), 4)) bad.push('pair at the end not found');
if (!G.mergeCanMove(mk([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 4, 4, 4, 2, 2, 8].map((v, i) => (i === 5 ? 0 : v))), 4)) bad.push('empty square not found');
// daily stream: same moves give the same game; a game always ends
function play(key, moves) {
  const R = G.rng('merge:' + key); let g = new Array(16).fill(null), id = 1, score = 0;
  for (let k = 0; k < 2; k++) { const s = G.mergeSpawn(g, R); g[s.at] = { id: id++, v: s.v }; }
  for (let m = 0; m < moves; m++) {
    const dir = [3, 2, 1, 2][m % 4], r = G.mergeMove(g, 4, dir === 1 && m % 7 ? 3 : dir);
    if (!r.moved) { if (!G.mergeCanMove(g, 4)) break; continue; }
    r.grid.forEach(t => { if (t && t.id === null) t.id = id++; }); g = r.grid; score += r.gain;
    const s = G.mergeSpawn(g, R); g[s.at] = { id: id++, v: s.v };
  }
  return JSON.stringify(vals(g)) + score;
}
for (const key of ['2026-11-23', '2026-11-24', '2027-02-28']) if (play(key, 300) !== play(key, 300)) bad.push('daily stream not repeatable ' + key);
if (play('2026-11-23', 300) === play('2026-11-24', 300)) bad.push('two days gave the same game');
console.log('merge rules: ' + bad.length + ' problems'); bad.forEach(b => console.log('  ' + b)); process.exit(bad.length ? 1 : 0);
