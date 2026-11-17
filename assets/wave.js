/* Ink flow: process inks (magenta, cyan, yellow) drifting like ink in water.
   Rendered at low resolution and scaled smoothly by the browser, so it stays light on phones. */
window.inkFlow = function (canvas, opts) {
  opts = opts || {};
  const ctx = canvas.getContext('2d');
  const W = opts.w || 112, H = opts.h || 64;
  canvas.width = W; canvas.height = H;
  const img = ctx.createImageData(W, H), d = img.data;
  const inks = opts.inks || [
    [229, 0, 125],   // magenta
    [0, 159, 227],   // cyan
    [255, 214, 0],   // yellow
    [255, 92, 60],   // magenta + yellow
    [120, 90, 255],  // magenta + cyan
    [255, 255, 255]  // paper
  ];
  const f = inks.map((_, i) => ({
    a: 1.6 + ((i * 7) % 5) * .55, b: 1.1 + ((i * 3) % 4) * .6,
    s: .09 + i * .021, p: i * 1.9, q: i * 2.7
  }));
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = opts.start || 8, run = true, last = 0, raf = 0;

  function frame(now) {
    raf = 0;
    if (now - last < 33 && !calm) { raf = requestAnimationFrame(frame); return; }
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now; t += dt;
    let o = 0;
    for (let y = 0; y < H; y++) {
      const v = y / H;
      for (let x = 0; x < W; x++) {
        const u = x / W;
        let r = 0, g = 0, b = 0, sum = 0;
        for (let i = 0; i < inks.length; i++) {
          const k = f[i];
          const n = Math.sin(u * k.a * 3.1 + t * k.s * 6 + k.p + Math.sin(v * 2.3 + t * .17 + k.q))
                  + Math.sin(v * k.b * 3.3 - t * k.s * 5 + k.q + Math.cos(u * 2.1 - t * .13));
          const w = Math.exp(n * 1.9);
          r += inks[i][0] * w; g += inks[i][1] * w; b += inks[i][2] * w; sum += w;
        }
        d[o++] = r / sum; d[o++] = g / sum; d[o++] = b / sum; d[o++] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (run && !calm) raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(es => {
    run = es[0].isIntersecting;
    if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  });
  io.observe(canvas);
  raf = requestAnimationFrame(frame);
};
