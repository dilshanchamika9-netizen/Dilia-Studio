// Party tools: random picks must be fair and well-formed.
const R = require('../../assets/party-rng.js'); let f = 0;
const ok = (c, m) => { if (!c) { f++; console.log('FAIL', m); } };
// chi-square fairness: 100,000 draws over k buckets; critical values at p=0.001 (df=k-1)
const crit = { 2: 10.83, 6: 20.52, 7: 22.46, 20: 43.82, 100: 148.23 };
for (const k of [2, 6, 7, 20, 100]) {
  const c = new Array(k).fill(0), N = 100000; for (let i = 0; i < N; i++) c[R.int(k)]++;
  const e = N / k, x = c.reduce((s, v) => s + (v - e) ** 2 / e, 0);
  ok(x < crit[k], `int(${k}) chi-square ${x.toFixed(1)} >= ${crit[k]}`);
}
// a large modulus where plain "% n" would be visibly biased (n close to 2^32 * 2/3): low half must be near 50%
{ const n = 2863311531; let low = 0, N = 60000; for (let i = 0; i < N; i++) if (R.int(n) < n / 2) low++; ok(Math.abs(low / N - .5) < .01, 'big n split ' + low / N); }
// range and edge values
for (let i = 0; i < 2000; i++) { const v = R.between(-5, 5); ok(v >= -5 && v <= 5 && Number.isInteger(v), 'between range ' + v); }
ok(R.int(1) === 0, 'int(1)'); ok(R.between(7, 7) === 7, 'between single');
for (const bad of [0, -1, 1.5, NaN, 4294967297]) { let t = false; try { R.int(bad); } catch (e) { t = true; } ok(t, 'int rejects ' + bad); }
// shuffle keeps the same items, does not change the input, and every position gets every item (4 items, 24000 shuffles)
{ const src = [1, 2, 3, 4], cnt = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (let i = 0; i < 24000; i++) { const s = R.shuffle(src); ok(s.slice().sort().join() === '1,2,3,4', 'shuffle items'); s.forEach((v, p) => cnt[p][v - 1]++); }
  ok(src.join() === '1,2,3,4', 'shuffle mutated input');
  cnt.forEach((row, p) => row.forEach((v, j) => ok(Math.abs(v - 6000) < 350, `position ${p} item ${j + 1} count ${v}`)));
}
// sample: unique, right size, clamps
{ const s = R.sample([1, 2, 3, 4, 5], 3); ok(s.length === 3 && new Set(s).size === 3, 'sample unique'); ok(R.sample([1, 2], 9).length === 2, 'sample clamp'); ok(R.sample([1, 2], -1).length === 0, 'sample negative'); }
// teams: everyone placed once, sizes differ by at most 1, never more teams than people
for (let n = 1; n <= 30; n++) for (let t = 1; t <= 12; t++) {
  const L = Array.from({ length: n }, (_, i) => i), r = R.teams(L, t), sizes = r.map(x => x.length);
  ok(r.flat().sort((a, b) => a - b).join() === L.join(), `teams ${n}/${t} members`);
  ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `teams ${n}/${t} sizes ${sizes}`);
  ok(r.length === Math.min(t, n), `teams ${n}/${t} count ${r.length}`);
}
console.log(f ? f + ' FAILED' : 'party rng: all checks ok'); process.exit(f ? 1 : 0);
