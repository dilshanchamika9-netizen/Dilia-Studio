// Dash: tap to jump the blocks. The longer you run, the faster it goes.
{
  const M = Mini, W = 640, H = 260, GY = 210, PX = 70, PS = 30;
  const T = OneBtn('dash', 'Dash', 'dsc', W, H, {
    init: () => ({ run: false, y: GY - PS, vy: 0, obs: [], sp: 5, dist: 0, gap: 60, score: 0, R: DiliaPlayGen.rng('dash' + Date.now() + Math.random()) }),
    hud: g => { M.$('dscore').textContent = g.score; M.$('dbest').textContent = M.getBest('dash', 'score') || '–'; },
    step: g => {
      g.vy += 0.62; g.y += g.vy; if (g.y >= GY - PS) { g.y = GY - PS; g.vy = 0; }
      g.sp = 5 + Math.min(5, g.dist / 2500); g.dist += g.sp; g.score = Math.floor(g.dist / 10);
      g.obs.forEach(o => { o.x -= g.sp; }); g.obs = g.obs.filter(o => o.x + o.w > -10);
      g.gap -= g.sp; if (g.gap <= 0) { const h = 24 + g.R.int(3) * 12, w = 22 + g.R.int(2) * 12; g.obs.push({ x: W + 10, w, h }); g.gap = 210 + g.R() * 190 + g.sp * 14; }
      for (const o of g.obs) if (PX + PS - 4 > o.x && PX + 4 < o.x + o.w && g.y + PS > GY - o.h + 3) { T.end('Crashed', g.score + ' m', 'You ran ' + g.score + ' metres.', g.score); return; }
    },
    press: (g, first) => { if (g.y >= GY - PS - 0.5) g.vy = -11.2; },
    draw: (c, g, dark) => {
      c.fillStyle = dark ? '#0d1424' : '#eef0fa'; c.fillRect(0, 0, W, H); c.fillStyle = dark ? '#2c3352' : '#b9bfd8'; c.fillRect(0, GY, W, 4);
      c.fillStyle = '#e5007d'; c.beginPath(); c.roundRect(PX, g.y, PS, PS, 6); c.fill();
      c.fillStyle = dark ? '#e9ecf8' : '#1b2238'; g.obs.forEach(o => { c.fillRect(o.x, GY - o.h, o.w, o.h); });
    }
  });
  window.DiliaDash = { state: () => ({ score: T.G.score, over: T.over, y: T.G.y, obs: T.G.obs.length, sp: T.G.sp }), tap: T.press, step: T.step, spawn: () => { T.G.obs.push({ x: PX + 8, w: 30, h: 40 }); } };
}
