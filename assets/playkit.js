/* Dilia Play kit: results, streaks, saved games, timer and the share card. Everything stays in this browser
   (localStorage). Text goes in with textContent only. */
window.DiliaPlay = (() => {
  const G = window.DiliaPlayGen;
  const KEY = 'dilia-play-v1';
  const read = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const write = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const today = () => G.dayKey(new Date());
  const fmt = s => { s = Math.max(0, Math.round(s)); const h = (s / 3600) | 0, m = ((s % 3600) / 60) | 0, x = s % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x; };
  const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return G.dayKey(new Date(y, m - 1, d + n)); };

  // ---- results ----
  function result(game, key) { const o = read(); return ((o.days || {})[key || today()] || {})[game] || null; }
  function record(game, key, r) {
    const o = read(); o.days = o.days || {}; const d = o.days[key] = o.days[key] || {};
    if (!d[game]) d[game] = r;  // the first finish of the day counts
    o.best = o.best || {}; if (!o.best[game] || r.t < o.best[game]) o.best[game] = r.t;
    write(o); clearSave(game, key);
    return d[game];
  }
  function solvedOn(key) { const d = (read().days || {})[key]; return !!d && Object.keys(d).length > 0; }
  function streak() {
    let k = today(); if (!solvedOn(k)) k = addDays(k, -1);
    let n = 0; while (solvedOn(k)) { n++; k = addDays(k, -1); }
    return n;
  }
  function bestStreak() {
    const days = Object.keys(read().days || {}).filter(solvedOn).sort(); let best = 0, run = 0, prev = '';
    for (const k of days) { run = prev && addDays(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; }
    return best;
  }
  function stats(game) {
    const o = read(), days = o.days || {}; let n = 0;
    for (const k in days) if (days[k][game]) n++;
    return { solved: n, best: (o.best || {})[game] || 0 };
  }
  function week() { const out = []; for (let i = 6; i >= 0; i--) { const k = addDays(today(), -i); out.push({ key: k, done: solvedOn(k) }); } return out; }

  // ---- endless levels: best time per level; the next level opens when the one before is solved ----
  const lv = (o, game) => ((o.lv = o.lv || {})[game] = o.lv[game] || {});
  function levelResult(game, L) { const t = lv(read(), game)[L]; return t != null ? { t } : null; }
  function levelRecord(game, L, t) { const o = read(), g = lv(o, game); if (g[L] == null || t < g[L]) g[L] = t; write(o); clearSave(game + L, today()); return { t: g[L] }; }
  function levelsDone(game) { return Object.keys(lv(read(), game)).length; }
  function levelTop(game) { const k = Object.keys(lv(read(), game)).map(Number); return (k.length ? Math.max(...k) : 0) + 1; }
  function levelBest(game, n) { const g = lv(read(), game); let b = 0; for (const k in g) if (G.levelSize(+k) === n && (!b || g[k] < b)) b = g[k]; return b; }

  // ---- saved game in progress (one per game per day; older days are dropped) ----
  const SK = (game, key) => 'dilia-play-save:' + game + ':' + key;
  function load(game, key) { try { return JSON.parse(localStorage.getItem(SK(game, key)) || 'null'); } catch (e) { return null; } }
  function save(game, key, state) { try { localStorage.setItem(SK(game, key), JSON.stringify(state)); } catch (e) {} }
  function clearSave(game, key) { try { localStorage.removeItem(SK(game, key)); } catch (e) {} }
  function tidy() {
    try { const t = today(); for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith('dilia-play-save:') && !k.endsWith(':' + t)) localStorage.removeItem(k); } } catch (e) {}
  }
  tidy();

  // ---- timer: runs only while the page is visible ----
  function timer(onTick, start) {
    let base = start || 0, since = 0, on = false, id = 0;
    const now = () => base + (on && since ? (performance.now() - since) / 1000 : 0);
    const tick = () => onTick(now());
    const run = () => { if (on || document.hidden) return; on = true; since = performance.now(); id = setInterval(tick, 250); tick(); };
    const pause = () => { if (!on) return; base = now(); on = false; since = 0; clearInterval(id); tick(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else if (api.live) run(); });
    const api = { live: false, start() { api.live = true; run(); }, stop() { api.live = false; pause(); return base; }, get: now };
    return api;
  }

  // ---- share card ----
  function shareText(title, line) { return title + '\n' + line + '\n' + location.origin + location.pathname; }
  function card(o) {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const g = c.getContext('2d');
    const bg = g.createRadialGradient(240, 0, 40, 240, 0, 900); bg.addColorStop(0, '#3b2a8a'); bg.addColorStop(1, '#0b1220');
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, 1080, 1080); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1080);
    const gr = g.createLinearGradient(80, 0, 1000, 0); gr.addColorStop(0, '#e5007d'); gr.addColorStop(.55, '#7a5cff'); gr.addColorStop(1, '#009fe3');
    const F = (w, s) => w + ' ' + s + 'px Archivo, system-ui, sans-serif';
    g.fillStyle = '#fff'; g.font = F(800, 46); g.fillText('Dilia Play', 80, 120);
    g.fillStyle = '#8e97ad'; g.font = F(600, 34); g.fillText(o.date, 80, 172);
    g.fillStyle = '#fff'; g.font = F(800, 76); g.fillText(o.title, 80, 330);
    g.fillStyle = gr; g.font = F(850, 210); g.fillText(o.big, 74, 560);
    g.fillStyle = '#cdd3e1'; g.font = F(600, 42); o.lines.forEach((l, i) => g.fillText(l, 80, 660 + i * 62));
    g.fillStyle = gr; g.fillRect(80, 900, 920, 6);
    g.fillStyle = '#8e97ad'; g.font = F(600, 32); g.fillText(o.foot || 'Same puzzle for everyone today. No sign-up, no ads.', 80, 970);
    return new Promise(res => c.toBlob(res, 'image/png'));
  }
  // the image is made right after a win, so a tap on Share can open the share sheet at once (Safari needs that)
  const ready = {};
  function prepare(o) { if (!ready[o.file]) { ready[o.file] = { blob: null }; card(o).then(b => { ready[o.file].blob = b; }); } }
  function share(o, note) {
    const text = shareText(o.title, o.line), r = ready[o.file], blob = r && r.blob;
    const fail = e => { if (e && e.name === 'AbortError') return; copy(); };
    const copy = () => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => note('Result copied. Paste it anywhere.'), () => note('Could not copy. Use "Save image".'));
    try {
      if (blob) { const file = new File([blob], o.file + '.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], text }).catch(fail); }
      if (navigator.share) return navigator.share({ text }).catch(fail);
    } catch (e) { /* fall back to copy */ }
    return copy();
  }
  async function saveImage(o) {
    const blob = await card(o), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = o.file + '.png';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---- small win burst (skipped when the person prefers less motion) ----
  function burst(host) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas'), r = host.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    c.className = 'burst'; c.width = r.width * dpr; c.height = r.height * dpr; host.append(c);
    const g = c.getContext('2d'), cols = ['#e5007d', '#7a5cff', '#009fe3', '#ffd400', '#10b981'], P = [];
    for (let i = 0; i < 90; i++) { const a = Math.PI * 2 * i / 90; P.push({ x: r.width / 2, y: r.height / 2, vx: Math.cos(a) * (2 + (i * 7 % 5)), vy: Math.sin(a) * (2 + (i * 3 % 6)) - 2, c: cols[i % 5] }); }
    let f = 0; (function step() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
      P.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.12; g.fillStyle = p.c; g.globalAlpha = Math.max(0, 1 - f / 70); g.fillRect(p.x, p.y, 6, 6); });
      if (++f < 72) requestAnimationFrame(step); else c.remove();
    })();
  }

  const niceDate = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
  return { today, fmt, addDays, result, record, levelResult, levelRecord, levelsDone, levelTop, levelBest, streak, bestStreak, stats, week, load, save, clearSave, timer, prepare, share, saveImage, burst, niceDate };
})();
