// Arcade rules: snake (moves, walls, wrap, growth, bonus star, win), typing score, word lists.
const G = require('../../assets/playgen.js'), W = require('../../assets/typing-words.js'); const bad = [];
const rngI = seed => { const r = G.rng(seed); return k => Math.floor(r() * k); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(`${m}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };

// ---- snake basics ----
{
  const r = rngI('s1'), s = G.snakeNew(10, r);
  eq(s.body.length, 3, 'start length'); eq(s.dir, 1, 'start heads right'); if (s.body.includes(s.food)) bad.push('food on the snake at start');
  const h = s.body[0]; s.food = 0; G.snakeStep(s, null, false, false, r); eq(s.body[0], h + 1, 'moves right'); eq(s.body.length, 3, 'length kept');
  G.snakeStep(s, 3, false, false, r); eq(s.dir, 1, 'cannot turn back on itself'); eq(s.dead, false, 'turn back ignored, still alive');
  G.snakeStep(s, 0, false, false, r); eq(s.dir, 0, 'turn up'); G.snakeStep(s, 3, false, false, r); eq(s.dir, 3, 'turn left after up');
}
// walls kill, wrap joins
{
  const r = rngI('s2'); let s = G.snakeNew(6, r); s.food = 0;
  for (let i = 0; i < 2; i++) G.snakeStep(s, null, false, false, r);
  eq(s.dead, false, 'alive near wall'); const o = G.snakeStep(s, null, false, false, r); eq([s.dead, o.dead], [true, true], 'wall kills');
  s = G.snakeNew(6, r); s.food = 0; for (let i = 0; i < 3; i++) G.snakeStep(s, null, true, false, r);
  eq([s.dead, s.body[0] % 6], [false, 0], 'wrap goes round to the left edge'); eq(Math.floor(s.body[0] / 6), 3, 'wrap keeps the row');
  s = G.snakeNew(6, r); s.food = 0; G.snakeStep(s, 0, true, false, r); G.snakeStep(s, 0, true, false, r); G.snakeStep(s, 0, true, false, r); G.snakeStep(s, 0, true, false, r);
  eq([s.dead, Math.floor(s.body[0] / 6)], [false, 5], 'wrap top to bottom');
}
// eating grows by one, score +1, new food is free
{
  const r = rngI('s3'), s = G.snakeNew(8, r), h = s.body[0]; s.food = h + 1;
  const o = G.snakeStep(s, null, false, false, r); eq([o.ate, s.score, s.body.length], [true, 1, 4], 'eat grows'); if (s.body.includes(s.food)) bad.push('new food on snake');
}
// the tail cell is free to enter (tail moves away), but not when eating
{
  const r = rngI('s4'), s = { n: 4, body: [5, 9, 8, 4], dir: 0, food: 15, bonus: null, score: 0, eaten: 0, dead: false, won: false };  // head 5 going up... turn left into 4 (tail)
  G.snakeStep(s, 3, false, false, r); eq(s.dead, false, 'moving into the tail cell is allowed');
  const t = { n: 4, body: [5, 9, 8, 4], dir: 0, food: 4, bonus: null, score: 0, eaten: 0, dead: false, won: false };
  G.snakeStep(t, 3, false, false, r); eq(t.dead, true, 'eating the cell where the tail is = hit');
  const u = { n: 4, body: [5, 6, 10, 9, 8, 4, 0, 1], dir: 3, food: 15, bonus: null, score: 0, eaten: 0, dead: false, won: false };  // head 5 going left = tail-ish? hits body 4? no: moves to 4 which is body, not tail
  G.snakeStep(u, 3, false, false, r); eq(u.dead, true, 'hits own body');
}
// bonus star: appears after every 5th apple, worth 5, grows, vanishes after 40 steps
{
  const r = rngI('s5'), s = G.snakeNew(20, r); let bonusSeen = false;
  for (let k = 1; k <= 5; k++) { s.food = s.body[0] + 1; if (s.food % 20 === 0) { s.body = [2 * 20 + 4, 2 * 20 + 3, 2 * 20 + 2]; s.food = 2 * 20 + 5; } G.snakeStep(s, null, false, true, r); }
  eq(s.eaten, 5, 'five apples'); bonusSeen = !!s.bonus; eq(bonusSeen, true, 'star after 5th apple');
  const before = s.score, len = s.body.length, x = s.body[0]; s.bonus = { at: x + 1, left: 40 }; s.food = (x + 2 < 400 ? x + 2 : 0);
  const o = G.snakeStep(s, null, false, true, r); eq([o.bonus, s.score - before, s.body.length - len, s.bonus], [true, 5, 1, null], 'star worth 5 and grows');
  const t = G.snakeNew(20, r); t.bonus = { at: 0, left: 2 }; t.food = 399; G.snakeStep(t, null, true, true, r); eq(!!t.bonus, true, 'star still there'); G.snakeStep(t, null, true, true, r); eq(t.bonus, null, 'star vanishes');
  const u = G.snakeNew(20, r); u.food = u.body[0] + 1; for (let k = 0; k < 4; k++) { u.eaten = 4; G.snakeStep(u, null, true, false, r); }
  const w = G.snakeNew(20, r); w.food = w.body[0] + 1; w.eaten = 4; G.snakeStep(w, null, true, false, r); eq(w.bonus, null, 'no star when bonus mode is off');
}
// random play: invariants hold for thousands of steps in both modes
for (const wrap of [false, true]) for (let g = 0; g < 300; g++) {
  const r = rngI('sim' + wrap + g), s = G.snakeNew(12, r), pick = rngI('d' + g + wrap); let steps = 0;
  while (!s.dead && !s.won && steps++ < 3000) {
    const d = pick(5) === 0 ? pick(4) : null; G.snakeStep(s, d, wrap, wrap, r);
    if (s.dead) break;
    if (new Set(s.body).size !== s.body.length) { bad.push('body overlaps ' + g); break; }
    if (s.body.length !== 3 + s.eaten + (s.score - s.eaten) / 5) { bad.push('too short ' + g); break; }
    if (s.food >= 0 && s.body.includes(s.food)) { bad.push('food on body ' + g); break; }
    if (s.bonus && (s.body.includes(s.bonus.at) || s.bonus.at === s.food)) { bad.push('star overlaps ' + g); break; }
    if (s.body.some(c => c < 0 || c >= 144)) { bad.push('off board ' + g); break; }
  }
}
// a bot that follows a full loop wins the board: 4x4 (13 apples to fill 16 squares) and 6x6
for (const n of [4, 6]) {
  const r = rngI('win' + n), s = G.snakeNew(n, r), cyc = [];
  for (let x = 0; x < n; x++) cyc.push(x);                      // top row left to right
  for (let y = 1; y < n; y++) { if (y % 2) for (let x = n - 1; x >= 1; x--) cyc.push(y * n + x); else for (let x = 1; x < n; x++) cyc.push(y * n + x); }
  for (let y = n - 1; y >= 1; y--) cyc.push(y * n);              // up the left column
  const pos = new Map(cyc.map((c, i) => [c, i]));
  // start the snake on the loop heading along it
  const i0 = 10 % cyc.length; s.body = [cyc[i0], cyc[(i0 - 1 + cyc.length) % cyc.length], cyc[(i0 - 2 + cyc.length) % cyc.length]];
  const dirTo = (a, b) => { const dx = (b % n) - (a % n), dy = Math.floor(b / n) - Math.floor(a / n); return dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0; };
  s.dir = dirTo(s.body[1], s.body[0]); const f = G.snakeFree(s); s.food = f[r(f.length)];
  let steps = 0; while (!s.dead && !s.won && steps++ < 5000) G.snakeStep(s, dirTo(s.body[0], cyc[(pos.get(s.body[0]) + 1) % cyc.length]), false, false, r);
  eq([s.dead, s.won, s.body.length], [false, true, n * n], 'bot fills the ' + n + 'x' + n + ' board');
}

// ---- typing score ----
{
  const t = ['the', 'cat', 'sat', 'on'], near = (a, b, m) => { if (Math.abs(a - b) > 0.01) bad.push(`${m}: ${a} vs ${b}`); };
  let r = G.typingScore(t, ['the', 'cat', 'sat', 'on'], 60, false);
  near(r.wpm, (4 + 4 + 4 + 3) / 5, 'perfect wpm'); near(r.acc, 100, 'perfect accuracy'); eq(r.words, 4, 'perfect words'); near(r.raw, r.wpm, 'raw equals wpm when perfect');
  r = G.typingScore(t, ['the', 'cxt', 'sat'], 30, false);   // 3 words, one wrong
  near(r.wpm, (4 + 4) / 5 / 0.5, 'wrong word not counted'); eq(r.words, 2, 'two right'); near(r.acc, 8 / 9 * 100, 'accuracy 8 of 9');
  r = G.typingScore(t, ['the', 'ca'], 30, true);              // unfinished last word, correct so far
  near(r.wpm, (4 + 2) / 5 / 0.5, 'partial correct prefix counts'); near(r.acc, 100, 'partial accuracy');
  r = G.typingScore(t, ['th'], 30, false);                    // committed short word: the missing letter is a mistake
  eq([r.good, r.bad, r.words], [2, 1, 0], 'skipped letter counts as a mistake');
  r = G.typingScore(t, ['theee'], 30, false); eq([r.good, r.bad, r.words], [3, 2, 0], 'extra letters count as mistakes');
  r = G.typingScore(['नमस्ते'], ['नमस्ते'], 60, false); eq(r.words, 1, 'Hindi word with marks compares by code point');
  r = G.typingScore(['مرحبا'], ['مرحبا'], 60, false); eq(r.words, 1, 'Arabic word');
  r = G.typingScore(['é'], ['é'], 60, false); eq(r.words, 1, 'accent typed as two parts equals the composed letter');
  r = G.typingScore([], [], 0, false); eq([r.wpm, r.acc], [0, 100], 'nothing typed');
}
// ---- word lists ----
for (const k of ['en', 'es', 'pt', 'ar', 'hi']) {
  const a = W[k]; if (!a || a.length < 100) bad.push(k + ' list too short');
  if (new Set(a).size !== a.length) bad.push(k + ' has repeats');
  a.forEach(w => { if (!w || /\s/.test(w)) bad.push(k + ' bad word ' + JSON.stringify(w)); if (w !== w.normalize('NFC')) bad.push(k + ' not NFC ' + w); });
}
if (/[؀-ۿ]/.test(W.en.join('')) || /[ऀ-ॿ]/.test(W.es.join(''))) bad.push('wrong script in a list');
if (!W.ar.every(w => /^[؀-ۿ]+$/.test(w))) bad.push('Arabic list has non-Arabic letters: ' + W.ar.filter(w => !/^[؀-ۿ]+$/.test(w)));
if (!W.hi.every(w => /^[ऀ-ॿ]+$/.test(w))) bad.push('Hindi list has non-Devanagari letters: ' + W.hi.filter(w => !/^[ऀ-ॿ]+$/.test(w)));

if (bad.length) { console.log(bad.join('\n')); console.log('FAILED', bad.length); process.exit(1); }
console.log('arcade rules OK');
