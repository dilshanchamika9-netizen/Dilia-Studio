// Win celebration for every Dilia Play game: fireworks, confetti and a "Congratulations" banner.
// It watches the result panel (#done). When the panel opens with a win, it fires once. It runs on the device, no network.
window.Celebrate = (() => {
  const WIN = /\b(solved|cleared|checkmate|you win|you won|you beat|won|wins|all pairs|all words|board full|congrat\w*|victory|completed?)\b/i;
  const LOSS = /computer wins|level wins this one|\bboom\b|game over|time'?s up|time is up|not this time|\bdraw\b|stalemate|crashed|tower fell|\blost\b|\bfailed\b/i;
  const COLORS = ['#ff3fa4', '#a08bff', '#3fc3ff', '#ffd84a', '#5ce6a0', '#ffffff', '#ff8a3d'];
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = null;

  // Decide from the panel text. A game can force the answer with data-win="1" or "0" on #done.
  function isWin(done) {
    if (!done) return false;
    const f = done.dataset && done.dataset.win; if (f === '1') return true; if (f === '0') return false;
    const eb = done.querySelector('.eyeb'), ln = done.querySelector('#dline');
    const s = ((eb ? eb.textContent : '') + ' ' + (ln ? ln.textContent : '')).trim();
    return WIN.test(s) && !LOSS.test(s);
  }

  function banner(text, sub) {
    const b = document.createElement('div'); b.className = 'cel-banner'; b.setAttribute('role', 'status');
    const h = document.createElement('div'); h.className = 'cel-h'; h.textContent = text || 'Congratulations!';
    b.append(h); if (sub) { const p = document.createElement('div'); p.className = 'cel-s'; p.textContent = sub; b.append(p); }
    document.body.append(b); return b;
  }

  function fire(text, sub) {
    if (running) running.stop(); window.__celebrations = (window.__celebrations || 0) + 1;
    const b = banner(text, sub);
    if (reduce()) { const t = setTimeout(() => b.remove(), 3500); running = { stop() { clearTimeout(t); b.remove(); running = null; } }; return running; }
    const cv = document.createElement('canvas'); cv.className = 'cel-cv'; cv.setAttribute('aria-hidden', 'true');
    const dpr = Math.min(2, devicePixelRatio || 1); let W = 0, H = 0;
    const size = () => { W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; };
    size(); document.body.append(cv); const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const rockets = [], sparks = [], conf = []; let t0 = performance.now(), last = t0, launched = 0, raf = 0, done = false;
    const R = (a, b) => a + Math.random() * (b - a), pick = () => COLORS[(Math.random() * COLORS.length) | 0];
    const LAUNCH = [0, 150, 450, 750, 1000, 1300, 1600, 1900, 2200, 2500, 2800];
    function rocket() { rockets.push({ x: R(W * .15, W * .85), y: H + 10, vx: R(-30, 30), vy: -R(H * 1.0, H * 1.25), ty: R(H * .15, H * .5), c: pick() }); }
    function burst(x, y, c) {
      const n = 110 + ((Math.random() * 60) | 0), ring = Math.random() < .35, c2 = pick();
      for (let i = 0; i < n; i++) { const a = ring ? i / n * Math.PI * 2 : R(0, Math.PI * 2), v = ring ? 300 : R(80, 380); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, d: R(1.1, 2), c: Math.random() < .3 ? c2 : c, s: R(2.2, 4.6) }); }
    }
    function confetti() { for (let i = 0; i < 90; i++) conf.push({ x: R(0, W), y: R(-H * .4, -10), vx: R(-40, 40), vy: R(120, 260), r: R(0, 6.28), vr: R(-8, 8), w: R(6, 11), h: R(4, 7), c: pick() }); }
    function frame(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now; const el = now - t0;
      while (launched < LAUNCH.length && el >= LAUNCH[launched]) { rocket(); if (launched === 4) confetti(); launched++; }
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.x += r.vx * dt; r.y += r.vy * dt; r.vy += 260 * dt;
        ctx.fillStyle = r.c; ctx.beginPath(); ctx.arc(r.x, r.y, 2.4, 0, 6.3); ctx.fill();
        if (r.y <= r.ty || r.vy >= -40) { burst(r.x, r.y, r.c); rockets.splice(i, 1); } }
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.vx *= .985; s.vy = s.vy * .985 + 150 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt / s.d;
        if (s.life <= 0) { sparks.splice(i, 1); continue; } ctx.globalAlpha = Math.max(0, s.life); ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, s.s * (.5 + s.life * .5), 0, 6.3); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
      for (let i = conf.length - 1; i >= 0; i--) { const p = conf[i]; p.x += (p.vx + Math.sin(el / 300 + p.r) * 30) * dt; p.y += p.vy * dt; p.r += p.vr * dt; if (p.y > H + 20) { conf.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = .9; ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
      ctx.globalAlpha = 1;
      if (launched >= LAUNCH.length && !rockets.length && !sparks.length && !conf.length) return stop();
      if (el > 9000) return stop();
      raf = requestAnimationFrame(frame);
    }
    function stop() { if (done) return; done = true; cancelAnimationFrame(raf); removeEventListener('resize', size); cv.remove(); b.classList.add('out'); setTimeout(() => b.remove(), 500); running = null; }
    addEventListener('resize', size); raf = requestAnimationFrame(frame); setTimeout(() => b.classList.add('out'), 3600);
    running = { stop, canvas: cv }; return running;
  }

  function watch() {
    const done = document.getElementById('done'); if (!done) return;
    let was = done.classList.contains('on'), touched = false;   // a panel restored on page load (already solved today) is not a new win
    ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, () => { touched = true; }, { capture: true, passive: true }));
    new MutationObserver(() => {
      const on = done.classList.contains('on');
      if (on && !was && touched && isWin(done)) { const eb = done.querySelector('.eyeb'); fire('Congratulations!', eb ? eb.textContent : ''); }
      was = on;
    }).observe(done, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  return { fire, isWin };
})();
