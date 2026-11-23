// Snake: eat apples, grow, don't hit yourself. Classic = walls are deadly. Modern = edges wrap round and a gold star shows up after every 5th apple.
// Rules live in DiliaPlayGen.snakeStep (tested in Node); this file does timing, input and drawing. Best scores stay in this browser.
{
  const G = DiliaPlayGen, P = DiliaPlay, $ = id => document.getElementById(id);
  const N = 20, cv = $('snk'), ctx = cv.getContext('2d'), ov = $('snkov'), msg = $('msg');
  const BEST = 'dilia-snake-best', MODE = 'dilia-snake-mode';
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const rnd = k => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % k; };
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 2600); };
  const set = (id, t) => { $(id).textContent = t; };

  let mode = rd(MODE, 'classic') === 'modern' ? 'modern' : 'classic', s, state = 'idle', queue = [], timer = 0, flash = 0, newBest = false;
  const wrap = () => mode === 'modern';
  const speed = () => Math.max(wrap() ? 60 : 85, (wrap() ? 120 : 150) - s.eaten * 3);
  const best = () => rd(BEST, {})[mode] || 0;

  function newGame() {
    clearTimeout(timer); s = G.snakeNew(N, rnd); state = 'idle'; queue = []; newBest = false;
    $('done').classList.remove('on'); setOv('Press an arrow key, WASD or swipe to start'); meters(); draw();
    document.querySelectorAll('.mlevel button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === mode ? 'true' : 'false'));
    set('kbest', best()); set('kmodeline', mode === 'classic' ? 'Classic: walls are deadly.' : 'Modern: edges wrap round. Gold stars give 5 points.');
    $('pause').disabled = true; $('pause').textContent = 'Pause';
  }
  function setOv(t) { ov.textContent = t; ov.hidden = !t; }
  function meters() { set('kscore', s.score); set('klen', s.body.length); }

  function loop() { if (state !== 'run') return; tick(); if (state === 'run') timer = setTimeout(loop, speed()); }
  function tick() {
    const d = queue.length ? queue.shift() : null, o = G.snakeStep(s, d, wrap(), wrap(), rnd);
    if (o.ate || o.bonus) flash = 4;
    meters(); draw(); if (s.dead || s.won) end();
  }
  function start() { if (state !== 'idle' && state !== 'pause') return; state = 'run'; setOv(''); $('pause').disabled = false; $('pause').textContent = 'Pause'; clearTimeout(timer); timer = setTimeout(loop, speed()); }
  function pause() { if (state !== 'run') return; state = 'pause'; clearTimeout(timer); setOv('Paused. Press a key or tap to go on.'); $('pause').textContent = 'Resume'; }
  function turn(d) {
    if (state === 'over') return;
    const last = queue.length ? queue[queue.length - 1] : s.dir;
    if (d !== last && d !== (last + 2) % 4 && queue.length < 3) queue.push(d);
    if (state === 'idle' || state === 'pause') start();
  }
  function end() {
    state = 'over'; clearTimeout(timer); $('pause').disabled = true;
    const b = rd(BEST, {}); if (s.score > (b[mode] || 0)) { b[mode] = s.score; wr(BEST, b); newBest = s.score > 0; }
    set('kbest', best()); draw();
    setOv(s.won ? 'You filled the whole board!' : 'Game over');
    $('done').classList.add('on'); set('dtime', s.score); set('deyebrow', s.won ? 'Board full · score' : 'Game over · score');
    set('dline', (mode === 'classic' ? 'Classic' : 'Modern') + ' · length ' + s.body.length + (newBest ? ' · new best!' : ' · best ' + best()));
    if (newBest) P.burst($('snkbox'));
    P.prepare(shareData());
  }
  const shareData = () => ({ title: 'Snake · ' + (mode === 'classic' ? 'Classic' : 'Modern'), line: '🐍 ' + s.score + ' points · length ' + s.body.length, big: String(s.score), lines: ['Length ' + s.body.length, mode === 'classic' ? 'Classic mode' : 'Modern mode'], date: P.niceDate(P.today()), file: 'dilia-snake-' + mode + '-' + s.score + '-' + s.body.length, foot: 'Can you beat it? No sign-up, no ads.' });

  // ---- drawing ----
  function size() { const w = cv.clientWidth, d = Math.min(2, devicePixelRatio || 1); if (w && cv.width !== Math.round(w * d)) { cv.width = cv.height = Math.round(w * d); } }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); }
  function draw() {
    size(); const W = cv.width, c = W / N; if (!W) return;
    ctx.clearRect(0, 0, W, W); ctx.fillStyle = '#0d1426'; ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = '#ffffff08'; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if ((i + j) % 2) ctx.fillRect(i * c, j * c, c, c);
    // walls: solid pink line for Classic, faint dashes for Modern
    ctx.lineWidth = Math.max(2, c * .14); ctx.strokeStyle = wrap() ? '#ffffff26' : '#e5007d'; ctx.setLineDash(wrap() ? [c * .4, c * .3] : []); ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, W - ctx.lineWidth); ctx.setLineDash([]);
    const at = i => [(i % N) * c, Math.floor(i / N) * c];
    if (s.food >= 0) { const [x, y] = at(s.food); ctx.fillStyle = '#ff2d8f'; ctx.beginPath(); ctx.arc(x + c / 2, y + c / 2, c * .36, 0, 7); ctx.fill(); ctx.fillStyle = '#34d399'; ctx.fillRect(x + c * .48, y + c * .1, c * .08, c * .18); }
    if (s.bonus) { const [x, y] = at(s.bonus.at), t = s.bonus.left; if (t > 10 || t % 2) { ctx.fillStyle = '#ffd400'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = (k % 2 ? .2 : .46) * c; ctx.lineTo(x + c / 2 + Math.cos(a) * r, y + c / 2 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); } }
    const L = s.body.length;
    for (let k = L - 1; k >= 0; k--) {
      const [x, y] = at(s.body[k]), f = 1 - k / Math.max(L, 8) * .55, p = c * .06;
      ctx.fillStyle = s.dead && k === 0 ? '#ff2d8f' : 'rgb(' + Math.round(122 + (229 - 122) * (1 - f) * 1.2) + ',' + Math.round(92 * f + 20) + ',' + Math.round(255 * f) + ')';
      rr(x + p, y + p, c - 2 * p, c - 2 * p, c * .3);
    }
    { const h = s.body[0], [x, y] = at(h), d = SN_D[s.dir], ex = d[1] ? [-.2, .2] : [0, 0], ey = d[0] ? [-.2, .2] : [0, 0]; ctx.fillStyle = '#fff'; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(x + c * (.5 + d[0] * .15 + ex[k]), y + c * (.5 + d[1] * .15 + ey[k]), c * .1, 0, 7); ctx.fill(); } }
    if (flash > 0) { flash--; ctx.fillStyle = '#ffffff10'; ctx.fillRect(0, 0, W, W); }
  }
  const SN_D = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  // ---- input ----
  const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t.closest && t.closest('header, [role=dialog]')))) return;
    if (e.key in KEYS) { e.preventDefault(); turn(KEYS[e.key]); }
    else if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (e.key === ' ' && t && t.tagName === 'BUTTON') return;       // a focused button keeps its own Space
      e.preventDefault(); if (state === 'run') pause(); else if (state === 'over') newGame(); else start();
    }
  });
  const box = $('snkbox'); let sx = 0, sy = 0, down = false, moved = false;
  box.addEventListener('pointerdown', e => { down = true; moved = false; sx = e.clientX; sy = e.clientY; try { box.setPointerCapture(e.pointerId); } catch (x) {} });
  box.addEventListener('pointermove', e => {
    if (!down) return; const dx = e.clientX - sx, dy = e.clientY - sy, ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 22) return;
    moved = true; sx = e.clientX; sy = e.clientY; turn(ax > ay ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
  });
  box.addEventListener('pointerup', () => { if (down && !moved) { if (state === 'idle' || state === 'pause') start(); else if (state === 'over') newGame(); } down = false; });
  box.addEventListener('pointercancel', () => { down = false; });
  document.querySelectorAll('.dpad button').forEach(b => b.addEventListener('click', () => turn(+b.dataset.d)));
  $('pause').addEventListener('click', () => { if (state === 'run') pause(); else start(); });
  $('newgame').addEventListener('click', newGame); $('dagain').addEventListener('click', newGame);
  $('share').addEventListener('click', () => P.share(shareData(), say));
  $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  document.querySelectorAll('.mlevel button').forEach(b => b.addEventListener('click', () => { if (b.dataset.m === mode) return; mode = b.dataset.m; wr(MODE, mode); newGame(); }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('resize', () => { if (s) draw(); });
  addEventListener('blur', pause);

  newGame();
  window.DiliaSnake = { state: () => ({ body: s.body.slice(), dir: s.dir, food: s.food, bonus: s.bonus, score: s.score, dead: s.dead, won: s.won, run: state, mode }), food: i => { s.food = i; draw(); }, speed };
}
