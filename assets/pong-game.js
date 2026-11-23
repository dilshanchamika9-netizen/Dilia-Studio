// Pong against the computer: first to 7. Drag, move the mouse, or use W/S or the arrow keys.
{
  const M = Mini, $ = M.$, cv = $('pgc'), ctx = cv.getContext('2d'), W = 600, H = 400, WIN = 7, LV = { 1: ['Easy', 190, 70], 2: ['Medium', 285, 38], 3: ['Hard', 400, 14] };
  cv.width = W; cv.height = H;
  let level = +(M.rd('dilia-pong-cfg', {}).level) || 2, S, raf = 0, last = 0, keys = { u: 0, d: 0 }, over = false, mouseY = null;
  const panel = M.panel('pong', 'Pong', () => newGame());
  function newGame() { S = { me: 0, cpu: 0, py: H / 2, cy: H / 2, ball: null, run: false, paused: false, dir: 1, aiErr: 0, hits: 0 }; over = false; serve(1); panel.hide(); draw(); hud(); M.say('Tap or press Space to serve.', 3500); }
  function serve(dir) { S.run = false; S.dir = dir; S.hits = 0; S.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 }; }
  function launch() { if (over || S.run) return; if (S.paused) { S.paused = false; S.run = true; last = 0; raf = requestAnimationFrame(tick); M.say(''); return; } const a = (M.rnd() - 0.5) * 0.8; S.ball.vx = Math.cos(a) * 300 * S.dir; S.ball.vy = Math.sin(a) * 300; S.run = true; last = 0; M.say(''); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  function hud() { $('pme').textContent = S.me; $('pcpu').textContent = S.cpu; document.querySelectorAll('[data-pl]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.pl === level))); }
  const PH = 70, PX = 24;
  function step(dt) {
    const b = S.ball; // my paddle
    if (mouseY !== null) S.py = mouseY; S.py += (keys.d - keys.u) * 380 * dt; S.py = Math.max(PH / 2, Math.min(H - PH / 2, S.py));
    if (!S.run) return;
    const [, sp, err] = LV[level]; if (b.vx > 0 || Math.abs(b.x - W / 2) < 80) { const target = b.vx > 0 ? b.y + S.aiErr : H / 2; const d = target - S.cy, m = sp * dt; S.cy += Math.abs(d) < m ? d : Math.sign(d) * m; } S.cy = Math.max(PH / 2, Math.min(H - PH / 2, S.cy));
    b.x += b.vx * dt; b.y += b.vy * dt; if (b.y < 6) { b.y = 6; b.vy = Math.abs(b.vy); } if (b.y > H - 6) { b.y = H - 6; b.vy = -Math.abs(b.vy); }
    const hit = (px, py, dir) => { const t = (b.y - py) / (PH / 2), a = t * 0.95, sp2 = Math.min(720, Math.hypot(b.vx, b.vy) * 1.05 + 6); b.vx = Math.cos(a) * sp2 * dir; b.vy = Math.sin(a) * sp2; S.hits++; if (dir < 0) S.aiErr = (M.rnd() - 0.5) * 2 * err * 2; };
    if (b.vx < 0 && b.x <= PX + 10 && b.x >= PX - 4 && Math.abs(b.y - S.py) <= PH / 2 + 6) { b.x = PX + 10; hit(PX, S.py, 1); }
    if (b.vx > 0 && b.x >= W - PX - 10 && b.x <= W - PX + 4 && Math.abs(b.y - S.cy) <= PH / 2 + 6) { b.x = W - PX - 10; hit(W - PX, S.cy, -1); if (S.aiErr === undefined) S.aiErr = 0; S.aiErr = (M.rnd() - 0.5) * 2 * err; }
    if (b.x < -10) point('cpu'); else if (b.x > W + 10) point('me');
  }
  function point(who) { S[who]++; hud(); if (S.me >= WIN || S.cpu >= WIN) { end(); return; } serve(who === 'me' ? -1 : 1); M.say((who === 'me' ? 'You score. ' : 'Computer scores. ') + 'Tap to serve.', 2500); }
  function end() {
    over = true; S.run = false; cancelAnimationFrame(raf); draw(); const won = S.me > S.cpu, key = 'wins' + level, rec = M.rd('dilia-pong-rec', {}), t = rec[level] || [0, 0]; t[won ? 0 : 1]++; rec[level] = t; M.wr('dilia-pong-rec', rec);
    const head = won ? 'You win' : 'Computer wins', line = S.me + ' to ' + S.cpu + ' on ' + LV[level][0] + '. Record on this level: ' + t[0] + ' won, ' + t[1] + ' lost.';
    panel.show(head, S.me + ' – ' + S.cpu, line, { title: 'Pong · ' + LV[level][0], line: '🏓 ' + head + ' ' + S.me + ' to ' + S.cpu, big: S.me + '-' + S.cpu, lines: [head, LV[level][0] + ' level'] });
  }
  function tick(t) { if (!S.run || over) return; if (last) { let dt = Math.min(0.05, (t - last) / 1000); while (dt > 0) { const d = Math.min(dt, 1 / 120); step(d); dt -= d; if (!S.run || over) break; } } last = t; draw(); raf = requestAnimationFrame(tick); }
  function draw() {
    const dark = document.documentElement.dataset.theme === 'dark', fg = dark ? '#e9ecf8' : '#1b2238'; ctx.fillStyle = dark ? '#0d1424' : '#eef0f8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = fg; ctx.globalAlpha = 0.25; for (let y = 8; y < H; y += 24) ctx.fillRect(W / 2 - 2, y, 4, 12); ctx.globalAlpha = 1;
    ctx.fillStyle = '#e5007d'; ctx.beginPath(); ctx.roundRect(PX - 6, S.py - PH / 2, 10, PH, 4); ctx.fill(); ctx.fillStyle = '#009fe3'; ctx.beginPath(); ctx.roundRect(W - PX - 4, S.cy - PH / 2, 10, PH, 4); ctx.fill();
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(S.ball.x, S.ball.y, 7, 0, 7); ctx.fill();
  }
  const toY = e => { const r = cv.getBoundingClientRect(); return (e.clientY - r.top) / r.height * H; };
  cv.addEventListener('pointermove', e => { if (!over) { mouseY = toY(e); if (!S.run) { S.py = Math.max(PH / 2, Math.min(H - PH / 2, mouseY)); draw(); } } });
  cv.addEventListener('pointerdown', e => { mouseY = toY(e); launch(); });
  document.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'w') { keys.u = 1; mouseY = null; e.preventDefault(); } else if (e.key === 'ArrowDown' || e.key === 's') { keys.d = 1; mouseY = null; e.preventDefault(); } else if (e.key === ' ') { e.preventDefault(); launch(); } });
  document.addEventListener('keyup', e => { if (e.key === 'ArrowUp' || e.key === 'w') keys.u = 0; if (e.key === 'ArrowDown' || e.key === 's') keys.d = 0; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.run) { S.run = false; S.paused = true; M.say('Paused. Tap to continue.', 0); } });
  document.querySelectorAll('[data-pl]').forEach(b => b.addEventListener('click', () => { level = +b.dataset.pl; M.wr('dilia-pong-cfg', { level }); cancelAnimationFrame(raf); newGame(); }));
  $('newgame').addEventListener('click', () => { cancelAnimationFrame(raf); newGame(); });
  newGame();
  window.DiliaPong = { state: () => ({ me: S.me, cpu: S.cpu, run: S.run, over, level }), launch, score: (a, b) => { S.me = a; S.cpu = b; hud(); }, point, step: n => { for (let i = 0; i < n; i++) step(1 / 60); draw(); } };
}
