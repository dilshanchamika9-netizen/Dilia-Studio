// Stack: tap to drop the sliding block. Only the part that lands on the tower stays; miss completely and it is over.
{
  const M = Mini, W = 360, H = 560, BH = 24, COL = i => 'hsl(' + ((i * 17 + 320) % 360) + ',72%,58%)';
  const T = OneBtn('stack', 'Stack', 'skc', W, H, {
    init: () => ({ run: false, tower: [{ x: 80, w: 200 }], mx: 0, mw: 200, dir: 1, sp: 2.6, score: 0, perfect: 0 }),
    hud: g => { M.$('sscore').textContent = g.score; M.$('sbest').textContent = M.getBest('stack', 'score') || '–'; },
    step: g => { g.mx += g.dir * g.sp; if (g.mx < 0) { g.mx = 0; g.dir = 1; } if (g.mx + g.mw > W) { g.mx = W - g.mw; g.dir = -1; } },
    press: (g, first) => {
      if (first) return; const top = g.tower[g.tower.length - 1], l = Math.max(top.x, g.mx), r = Math.min(top.x + top.w, g.mx + g.mw), ov = r - l;
      if (ov <= 0) { g.dead = true; T.end('Tower fell', g.score + (g.score === 1 ? ' block' : ' blocks'), 'You stacked ' + g.score + (g.score === 1 ? ' block.' : ' blocks.'), g.score); return; }
      if (Math.abs(g.mx - top.x) < 4) { g.tower.push({ x: top.x, w: top.w }); g.mx = top.x; g.perfect++; } else { g.tower.push({ x: l, w: ov }); g.perfect = 0; }
      g.mw = g.tower[g.tower.length - 1].w; g.score++; g.sp = Math.min(6.5, 2.6 + g.score * 0.07); g.mx = g.dir > 0 ? 0 : W - g.mw;
    },
    draw: (c, g, dark) => {
      c.fillStyle = dark ? '#0d1424' : '#eef0fa'; c.fillRect(0, 0, W, H);
      const base = Math.max(0, g.tower.length - 14) * BH;
      g.tower.forEach((b, i) => { c.fillStyle = COL(i); c.fillRect(b.x, H - 20 - (i + 1) * BH + base, b.w, BH - 2); });
      if (!g.dead) { c.fillStyle = COL(g.tower.length); c.fillRect(g.mx, H - 20 - (g.tower.length + 1) * BH + base, g.mw, BH - 2); }
    }
  });
  window.DiliaStack = { state: () => ({ score: T.G.score, over: T.over, mx: T.G.mx, topx: T.G.tower[T.G.tower.length - 1].x, w: T.G.mw, perfect: T.G.perfect }), tap: T.press, step: T.step, align: () => { const g = T.G; g.mx = g.tower[g.tower.length - 1].x; }, miss: () => { const g = T.G; const top = g.tower[g.tower.length - 1]; g.mx = top.x + top.w + 5 > W - g.mw ? 0 : top.x + top.w + 5; if (g.mx + g.mw > W) g.mx = 0; if (g.mx + g.mw > top.x && g.mx < top.x + top.w) { g.tower[g.tower.length - 1] = { x: 150, w: 10 }; g.mx = 0; g.mw = 40; } } };
}
