// Shared bits for the one-button games: canvas, loop with fixed steps, tap/click/Space input, result panel.
window.OneBtn = (slug, title, id, W, H, hooks) => {
  const M = Mini, $ = M.$, cv = $(id), ctx = cv.getContext('2d'); cv.width = W; cv.height = H;
  const dark = () => document.documentElement.dataset.theme === 'dark';
  let raf = 0, last = 0, acc = 0, G = null, over = false;
  const panel = M.panel(slug, title, () => start());
  function start() { cancelAnimationFrame(raf); over = false; panel.hide(); G = hooks.init(); hooks.hud(G); hooks.draw(ctx, G, dark()); G.run = false; M.say('Tap, click or press Space to start.', 4000); }
  function tick(t) { if (!G.run) return; if (!last) last = t; acc += Math.min(0.1, (t - last) / 1000); last = t; while (acc >= 1 / 60 && !over) { acc -= 1 / 60; hooks.step(G); } hooks.hud(G); hooks.draw(ctx, G, dark()); if (!over) raf = requestAnimationFrame(tick); }
  function press() { if (over) return; if (!G.run) { G.run = true; last = 0; acc = 0; M.say(''); hooks.press(G, true); raf = requestAnimationFrame(tick); return; } hooks.press(G, false); }
  function end(head, big, line, score) {
    if (over) return; over = true; G.run = false; cancelAnimationFrame(raf); hooks.draw(ctx, G, dark());
    const r = M.best(slug, 'score', score, true);
    panel.show(head, big, line + (r.isNew ? ' New best.' : ' Best: ' + r.best + '.'), { title, line: head + ' ' + big, big, lines: [line] });
  }
  cv.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
  document.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); press(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.run) { G.run = false; cancelAnimationFrame(raf); M.say('Paused. Tap to continue.', 0); } });
  $('newgame').addEventListener('click', start);
  start();
  return { press, end, start, get G() { return G; }, get over() { return over; }, step: n => { if (!G.run) { G.run = true; hooks.press(G, true); } for (let i = 0; i < n && !over; i++) hooks.step(G); hooks.hud(G); hooks.draw(ctx, G, dark()); } };
};
