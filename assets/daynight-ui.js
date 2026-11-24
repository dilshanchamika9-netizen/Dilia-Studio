// Live day/night world map. The shading comes from the sun's position (sunmath.js); cities are the landmarks (citygeo.js).
{
  const S = SunMath, G = DiliaCityGeo, C = DiliaCities, CM = CalcMath, K = LifeKit, $ = id => document.getElementById(id), esc = K.esc, pad = n => String(n).padStart(2, '0');
  const cv = $('dncv'), ctx = cv.getContext('2d'), off = document.createElement('canvas'); off.width = 360; off.height = 180; const octx = off.getContext('2d');
  let shift = 0, sel = 'Dubai', W = 0, H = 0, timer = 0; const cities = C.filter(c => G[c[0]]);
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const now = () => Date.now() + shift * 60000;
  const fmtTime = (ms, z) => new Intl.DateTimeFormat('en-GB', { timeZone: z, hour: '2-digit', minute: '2-digit', hour12: false }).format(ms);
  const fmtDay = (ms, z) => new Intl.DateTimeFormat('en-GB', { timeZone: z, weekday: 'short', day: 'numeric', month: 'short' }).format(ms);
  const X = lon => (lon + 180) / 360 * W, Y = lat => (90 - lat) / 180 * H;
  function shade(ms) {
    const p = S.pos(ms), im = octx.createImageData(360, 180), d = im.data;
    for (let y = 0; y < 180; y++) { const lat = 89.5 - y; for (let x = 0; x < 360; x++) {
      const a = S.altP(p, lat, x - 179.5), i = (y * 360 + x) * 4; let al = a >= 0 ? 0 : a > -18 ? Math.min(0.78, -a / 18 * 0.55 + (a > -6 ? -a / 6 * 0.18 : 0.18)) : 0.78;
      d[i] = 4; d[i + 1] = 6; d[i + 2] = 28; d[i + 3] = Math.round(al * 255); } }
    octx.putImageData(im, 0, 0); return p;
  }
  function draw() {
    const ms = now(), p = shade(ms), dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth; if (!w) return;
    if (w !== W) { W = w; H = Math.round(w / 2); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px'; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16396b'); g.addColorStop(.5, '#1d5b8f'); g.addColorStop(1, '#16396b'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1; ctx.beginPath(); for (let lo = -150; lo <= 150; lo += 30) { ctx.moveTo(X(lo), 0); ctx.lineTo(X(lo), H); } for (let la = -60; la <= 60; la += 30) { ctx.moveTo(0, Y(la)); ctx.lineTo(W, Y(la)); } ctx.stroke();
    ctx.strokeStyle = '#ffffff44'; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, 0, 0, W, H);
    // sun
    const sx = X(p.lon), sy = Y(p.dec), rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 34); rg.addColorStop(0, '#fff6b0'); rg.addColorStop(.25, '#ffd84acc'); rg.addColorStop(1, '#ffd84a00'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 6.3); ctx.fill();
    // cities
    let day = 0; cities.forEach(c => { const [la, lo] = G[c[0]], a = S.altP(p, la, lo), up = a > 0; if (up) day++; const x = X(lo), y = Y(la), s = c[0] === sel;
      ctx.fillStyle = up ? '#ffd84a' : '#7fb2ff'; ctx.shadowColor = up ? '#ffd84a' : '#5c8cff'; ctx.shadowBlur = s ? 18 : 8; ctx.beginPath(); ctx.arc(x, y, s ? 5.5 : 3, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
      if (s) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.3); ctx.stroke(); ctx.font = '700 13px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = x > W - 90 ? 'right' : 'left'; ctx.fillText(c[0], x + (x > W - 90 ? -14 : 14), y - 8); } });
    $('dnsun').textContent = Math.abs(p.dec).toFixed(1) + '°' + (p.dec >= 0 ? 'N' : 'S') + ' ' + Math.abs(p.lon).toFixed(1) + '°' + (p.lon >= 0 ? 'E' : 'W');
    $('dnday').textContent = day + ' of ' + cities.length; $('dnutc').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(ms) + ' UTC';
    $('dnshift').textContent = shift === 0 ? 'Live' : (shift > 0 ? '+' : '−') + Math.floor(Math.abs(shift) / 60) + 'h ' + pad(Math.abs(shift) % 60) + 'm from now';
    detail(ms, p);
  }
  function detail(ms, p) {
    const c = cities.find(x => x[0] === sel); if (!c) return; const [la, lo] = G[c[0]], z = c[1], a = S.altP(p, la, lo), lp = CM.parts(z, ms), start = ms - ((lp.h * 60 + lp.mi) * 60 + lp.s) * 1000, ev = S.events(start, 24 * 3600e3, la, lo);
    const phase = a > 0 ? 'Daytime' : a > -6 ? 'Civil twilight' : a > -12 ? 'Nautical twilight' : a > -18 ? 'Astronomical twilight' : 'Night';
    let len = ''; if (ev.rise != null && ev.set != null) { const m = Math.round(Math.abs(ev.set - ev.rise) / 60000); len = Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm'; } else len = a > 0 ? 'Sun does not set today' : 'Sun does not rise today';
    $('dndet').innerHTML = `<div class="lstats"><div><b>${esc(c[0])}</b><small>${esc(K.cname(c[2]))}</small></div><div><b>${fmtTime(ms, z)}</b><small>${fmtDay(ms, z)} local</small></div><div><b>${phase}</b><small>sun ${a.toFixed(1)}° ${a >= 0 ? 'above' : 'below'} horizon</small></div><div><b>${ev.rise != null ? fmtTime(ev.rise, z) : '–'} / ${ev.set != null ? fmtTime(ev.set, z) : '–'}</b><small>sunrise / sunset · ${len}</small></div></div>`;
  }
  function pick(e) { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 22 * 22; cities.forEach(c => { const [la, lo] = G[c[0]], d = (X(lo) - x) ** 2 + (Y(la) - y) ** 2; if (d < bd) { bd = d; best = c[0]; } }); if (best) { sel = best; $('dnsel').value = best; draw(); } }
  $('dnsel').innerHTML = cities.map(c => `<option>${esc(c[0])}</option>`).join(''); $('dnsel').value = sel;
  $('dnsel').addEventListener('change', e => { sel = e.target.value; draw(); });
  $('dnrange').addEventListener('input', e => { shift = +e.target.value; draw(); });
  $('dnnow').addEventListener('click', () => { shift = 0; $('dnrange').value = 0; draw(); });
  cv.addEventListener('click', pick); cv.addEventListener('keydown', e => { const i = cities.findIndex(c => c[0] === sel); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); sel = cities[(i + (e.key === 'ArrowRight' ? 1 : cities.length - 1)) % cities.length][0]; $('dnsel').value = sel; draw(); } });
  addEventListener('resize', () => { W = 0; draw(); }); new MutationObserver(() => draw()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  draw(); timer = setInterval(() => { if (shift === 0) draw(); }, 30000);
  window.DiliaDayNight = { state: () => ({ sel, shift, W, H }), setShift: m => { shift = m; $('dnrange').value = m; draw(); }, select: n => { sel = n; $('dnsel').value = n; draw(); }, at: ms => { shift = Math.round((ms - Date.now()) / 60000); draw(); }, cities: () => cities.length };
}
