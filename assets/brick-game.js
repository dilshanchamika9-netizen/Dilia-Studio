// Brick breaker: steer the paddle, keep the ball alive, clear the bricks. Three lives, faster every level.
{
  const M = Mini, $ = M.$, cv = $('bbc'), ctx = cv.getContext('2d'), W = 480, H = 640, COLS = 8, BW = (W - 40) / COLS;
  cv.width = W; cv.height = H;
  const COLORS = ['#e5484d', '#f08a24', '#f2c200', '#2fa84f', '#2b6fe0', '#7a5cff'];
  let S, raf = 0, last = 0, keys = { l: 0, r: 0 }, over = false;
  const panel = M.panel('brick', 'Brick breaker', () => newGame());
  const bestNow = () => M.getBest('brick', 'score') || 0;
  function bricks(level) { const rows = Math.min(6 + (level > 3 ? 1 : 0), 7), out = []; for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) out.push({ x: 20 + c * BW, y: 60 + r * 24, w: BW - 3, h: 20, hp: level > 2 && r < 2 ? 2 : 1, col: COLORS[r % 6], alive: true }); return out; }
  function newGame() { S = { score: 0, lives: 3, level: 1, pad: { x: W / 2, w: 84, y: H - 36, h: 12 }, ball: null, bricks: bricks(1), run: false, speed: 330 }; over = false; serve(); panel.hide(); hud(); draw(); M.say('Tap or press Space to launch. Move the mouse, drag, or use the arrow keys.', 4000); }
  function serve() { S.run = false; S.paused = false; S.ball = { x: S.pad.x, y: S.pad.y - 9, vx: 0, vy: 0, r: 7 }; }
  function launch() { if (over || S.run) return; if (S.paused) { S.paused = false; S.run = true; M.say(''); last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); return; } const a = (-Math.PI / 2) + (M.rnd() - 0.5) * 0.7; S.ball.vx = Math.cos(a) * S.speed; S.ball.vy = Math.sin(a) * S.speed; S.run = true; M.say(''); last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  function hud() { $('bscore').textContent = S.score; $('blives').textContent = S.lives; $('blevel').textContent = S.level; $('bbest').textContent = Math.max(bestNow(), S.score); }
  function step(dt) {
    const b = S.ball, p = S.pad; p.x = Math.max(p.w / 2, Math.min(W - p.w / 2, p.x + (keys.r - keys.l) * 420 * dt));
    if (!S.run) { b.x = p.x; return; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); } if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
    if (b.vy > 0 && b.y + b.r >= p.y && b.y + b.r <= p.y + p.h + 10 && b.x >= p.x - p.w / 2 - b.r && b.x <= p.x + p.w / 2 + b.r) {
      const t = (b.x - p.x) / (p.w / 2), a = -Math.PI / 2 + t * 1.05, sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.y = p.y - b.r;
    }
    for (const k of S.bricks) {
      if (!k.alive) continue; const cx = Math.max(k.x, Math.min(b.x, k.x + k.w)), cy = Math.max(k.y, Math.min(b.y, k.y + k.h)), dx = b.x - cx, dy = b.y - cy;
      if (dx * dx + dy * dy <= b.r * b.r) {
        if (Math.abs(dx) > Math.abs(dy)) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx); else b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
        k.hp--; if (k.hp <= 0) { k.alive = false; S.score += 10 * S.level; } else S.score += 2; hud(); break;
      }
    }
    if (!S.bricks.some(k => k.alive)) { S.level++; S.speed = Math.min(620, S.speed + 28); S.bricks = bricks(S.level); serve(); hud(); M.say('Level ' + S.level + '. Tap to launch.', 3000); return; }
    if (b.y > H + 20) { S.lives--; hud(); if (S.lives <= 0) { end(); return; } serve(); M.say('Ball lost. Tap to launch.', 2500); }
  }
  function end() {
    over = true; S.run = false; cancelAnimationFrame(raf); draw(); const r = M.best('brick', 'score', S.score, true);
    panel.show('Game over', S.score, r.isNew ? 'New best score. Reached level ' + S.level + '.' : 'Best: ' + r.best + '. Reached level ' + S.level + '.', { title: 'Brick breaker', line: '🧱 ' + S.score + ' points · level ' + S.level, big: String(S.score), lines: ['Level ' + S.level, 'Best ' + r.best] }); hud();
  }
  function tick(t) { if (!S.run || over) return; if (last) { let dt = Math.min(0.05, (t - last) / 1000); while (dt > 0) { const d = Math.min(dt, 1 / 120); step(d); dt -= d; if (!S.run || over) break; } } last = t; draw(); raf = requestAnimationFrame(tick); }
  function draw() {
    const dark = document.documentElement.dataset.theme === 'dark'; ctx.fillStyle = dark ? '#0d1424' : '#eef0f8'; ctx.fillRect(0, 0, W, H);
    for (const k of S.bricks) if (k.alive) { ctx.fillStyle = k.col; ctx.globalAlpha = k.hp > 1 ? 1 : 0.88; ctx.beginPath(); ctx.roundRect(k.x, k.y, k.w, k.h, 4); ctx.fill(); if (k.hp > 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } ctx.globalAlpha = 1; }
    const p = S.pad; ctx.fillStyle = dark ? '#e9ecf8' : '#1b2238'; ctx.beginPath(); ctx.roundRect(p.x - p.w / 2, p.y, p.w, p.h, 6); ctx.fill();
    const b = S.ball; ctx.fillStyle = '#e5007d'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
  }
  function toX(e) { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; }
  cv.addEventListener('pointermove', e => { if (over) return; S.pad.x = Math.max(S.pad.w / 2, Math.min(W - S.pad.w / 2, toX(e))); if (!S.run) { S.ball.x = S.pad.x; draw(); } });
  cv.addEventListener('pointerdown', e => { S.pad.x = Math.max(S.pad.w / 2, Math.min(W - S.pad.w / 2, toX(e))); launch(); });
  document.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'a') { keys.l = 1; e.preventDefault(); } else if (e.key === 'ArrowRight' || e.key === 'd') { keys.r = 1; e.preventDefault(); } else if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); launch(); } else if ((e.key === 'p' || e.key === 'P') && S.run) { S.run = false; S.paused = true; M.say('Paused. Tap to continue.', 0); } });
  document.addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key === 'a') keys.l = 0; if (e.key === 'ArrowRight' || e.key === 'd') keys.r = 0; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.run) { S.run = false; S.paused = true; M.say('Paused. Tap to continue.', 0); } });
  $('newgame').addEventListener('click', () => { cancelAnimationFrame(raf); newGame(); });
  newGame();
  window.DiliaBrick = { state: () => ({ score: S.score, lives: S.lives, level: S.level, run: S.run, over, alive: S.bricks.filter(k => k.alive).length, ball: Object.assign({}, S.ball) }), launch, clearAll: () => { S.bricks.forEach(k => { k.alive = false; }); }, loseBall: () => { S.ball.y = H + 50; }, step: n => { for (let i = 0; i < n; i++) step(1 / 60); draw(); } };
}
