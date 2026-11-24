// Hop: tap to flap, glide through the gaps. One point for every gap.
{
  const M = Mini, W = 360, H = 560, PW = 56, GAP = 150, BX = 100, BR = 13;
  const T = OneBtn('hop', 'Hop', 'hpc', W, H, {
    init: () => ({ run: false, y: H / 2, vy: 0, pipes: [], t: 0, score: 0, R: DiliaPlayGen.rng('hop' + Date.now() + Math.random()) }),
    hud: g => { M.$('hscore').textContent = g.score; M.$('hbest').textContent = M.getBest('hop', 'score') || '–'; },
    step: g => {
      g.vy = Math.min(9, g.vy + 0.36); g.y += g.vy; g.t++;
      if (g.t % 95 === 1) g.pipes.push({ x: W + 10, gy: 110 + g.R() * (H - 260), done: false });
      g.pipes.forEach(p => { p.x -= 2.6; if (!p.done && p.x + PW < BX - BR) { p.done = true; g.score++; } }); g.pipes = g.pipes.filter(p => p.x > -PW - 10);
      let hit = g.y - BR < 0 || g.y + BR > H - 16;
      for (const p of g.pipes) if (BX + BR > p.x && BX - BR < p.x + PW && (g.y - BR < p.gy || g.y + BR > p.gy + GAP)) hit = true;
      if (hit) T.end('Crashed', g.score + (g.score === 1 ? ' gap' : ' gaps'), 'You flew through ' + g.score + (g.score === 1 ? ' gap.' : ' gaps.'), g.score);
    },
    press: g => { g.vy = -6.4; },
    draw: (c, g, dark) => {
      c.fillStyle = dark ? '#0d1424' : '#eef0fa'; c.fillRect(0, 0, W, H); c.fillStyle = dark ? '#2c3352' : '#b9bfd8'; c.fillRect(0, H - 16, W, 16);
      c.fillStyle = '#2fa84f'; g.pipes.forEach(p => { c.fillRect(p.x, 0, PW, p.gy); c.fillRect(p.x, p.gy + GAP, PW, H - 16 - p.gy - GAP); });
      c.fillStyle = '#e5007d'; c.beginPath(); c.arc(BX, g.y, BR, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(BX + 5, g.y - 4, 3, 0, 7); c.fill();
    }
  });
  window.DiliaHop = { state: () => ({ score: T.G.score, over: T.over, y: T.G.y, pipes: T.G.pipes.length }), tap: T.press, step: T.step, passPipe: () => { const g = T.G; g.pipes.push({ x: BX - BR - PW - 1, gy: g.y - 75, done: false }); }, floor: () => { T.G.y = H; } };
}
