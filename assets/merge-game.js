// Merge: slide the tiles, join equal ones, reach 2048 and beyond.
// <body data-mode="daily">: one 4×4 game a day, same tile stream for everyone, no undo.
// <body data-mode="free">: 4×4, 5×5 or 6×6, undo, new game any time.
{
  const G = DiliaPlayGen, P = DiliaPlay, $ = id => document.getElementById(id);
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  const DAILY = document.body.dataset.mode === 'daily', KEY = P.today();
  const box = $('mboard'), layer = $('mtiles'), msg = $('msg');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 2600); };
  const BEST = 'dilia-merge-best', FREE = n => 'dilia-merge-free-' + n;
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let seed = '', n = 4, grid, score, id, R, draws, over, won, hist, els = new Map(), busy = false, moves = 0, clock = null;

  // random stream that can be rebuilt after a reload: the daily one is seeded by the date and we count draws
  function stream(seed, skip) {
    const base = G.rng(seed); let c = 0;
    const f = () => { c++; return base(); }; f.int = k => Math.floor(f() * k); f.count = () => c;
    for (let i = 0; i < skip; i++) f();
    return f;
  }
  const freeSeed = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return 'mergefree:' + a[0]; };

  function newGame(size) {
    n = size || n; grid = new Array(n * n).fill(null); score = 0; id = 1; over = false; won = false; hist = []; moves = 0;
    seed = DAILY ? 'merge:' + KEY : freeSeed(); R = stream(seed, 0);
    spawn(); spawn(); layout(); render(true); keep();
    if (clock) clock.stop(); clock = P.timer(() => {}, 0);
  }
  function spawn() { const s = G.mergeSpawn(grid, R); if (s) { grid[s.at] = { id: id++, v: s.v, fresh: true }; } return s; }

  function keep() {
    const st = { n, cells: grid.map(t => (t ? t.v : 0)), score, draws: R.count(), seed, over, won, moves, t: clock ? clock.get() : 0 };
    if (DAILY) { if (!P.result('merge', KEY)) P.save('merge', KEY, st); }
    else wr(FREE(n), over ? null : st);
    if (!DAILY) { const b = rd(BEST, {}); if (score > (b[n] || 0)) { b[n] = score; wr(BEST, b); } }
    set('mbest', DAILY ? (P.stats('merge').best ? best() : '–') : (rd(BEST, {})[n] || 0));
  }
  const best = () => { let b = 0; try { const o = JSON.parse(localStorage.getItem('dilia-play-v1') || '{}').days || {}; for (const k in o) if (o[k].merge && o[k].merge.s > b) b = o[k].merge.s; } catch (e) {} return b || '–'; };
  function restore(st) {
    n = st.n; score = st.score | 0; over = !!st.over; won = !!st.won; moves = st.moves | 0; hist = []; id = 1;
    grid = st.cells.map(v => (v ? { id: id++, v } : null)); seed = st.seed; R = stream(seed, st.draws | 0);
    layout(); render(true);
    clock = P.timer(() => {}, st.t || 0);
  }

  // ---- drawing ----
  function layout() {
    box.style.setProperty('--n', n); box.className = 'mboard n' + n;
    const bg = $('mcells'); bg.textContent = '';
    for (let i = 0; i < n * n; i++) bg.append(document.createElement('i'));
    layer.textContent = ''; els = new Map();
    document.querySelectorAll('.msize button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.n === n ? 'true' : 'false'));
  }
  function place(el, at) { el.style.setProperty('--x', at % n); el.style.setProperty('--y', (at / n) | 0); }
  function tileEl(t, at, cls) {
    const e = document.createElement('div'); e.className = 'mt v' + Math.min(t.v, 8192) + ' d' + String(t.v).length + (cls ? ' ' + cls : '');
    e.textContent = t.v; place(e, at); layer.append(e); els.set(t.id, e); return e;
  }
  function render(all) {
    if (all) { layer.textContent = ''; els = new Map(); grid.forEach((t, i) => { if (t) tileEl(t, i, t.fresh ? 'new' : ''); }); grid.forEach(t => { if (t) delete t.fresh; }); }
    set('mscore', score); set('mmoves', moves);
    $('undo').disabled = DAILY || !hist.length || over;
    $('mboard').setAttribute('aria-label', 'Board, score ' + score + '. ' + grid.map(t => (t ? t.v : 'empty')).join(', '));
  }

  // ---- a move ----
  function move(dir) {
    if (over || busy) return;
    const r = G.mergeMove(grid, n, dir);
    if (!r.moved) { if (!G.mergeCanMove(grid, n)) end(); return; }
    if (!DAILY) { hist.push({ cells: grid.map(t => (t ? t.v : 0)), score, moves }); if (hist.length > 50) hist.shift(); }
    if (!clock.live) clock.start();
    busy = true; moves++;
    r.moves.forEach(m => { const e = els.get(m.id); if (e) place(e, m.to); });
    r.grid.forEach(t => { if (t && t.id === null) t.id = id++; });
    grid = r.grid; score += r.gain;
    setTimeout(() => {
      r.joined.forEach(j => { j.ids.forEach(x => { const e = els.get(x); if (e) e.remove(); els.delete(x); }); const t = grid[j.to]; tileEl(t, j.to, 'pop'); });
      const s = spawn(); if (s) tileEl(grid[s.at], s.at, 'new'), delete grid[s.at].fresh;
      busy = false;
      if (r.gain) { const g = document.createElement('span'); g.className = 'mgain'; g.textContent = '+' + r.gain; $('mscorebox').append(g); setTimeout(() => g.remove(), 700); }
      if (!won && grid.some(t => t && t.v >= 2048)) { won = true; say('You reached 2048! Keep going for a bigger tile.', 5000); P.burst($('mbox')); }
      if (!G.mergeCanMove(grid, n)) end(); else { render(false); keep(); }
    }, 110);
  }
  function undo() {
    if (DAILY || !hist.length || over || busy) return;
    const h = hist.pop();
    id = 1; grid = h.cells.map(v => (v ? { id: id++, v } : null)); score = h.score; moves = h.moves;
    render(true); keep();
  }
  function maxTile() { return grid.reduce((m, t) => Math.max(m, t ? t.v : 0), 0); }
  function end() {
    over = true; const t = Math.round(clock.stop()); render(false);
    let r = { t, s: score, m: maxTile(), cells: grid.map(x => (x ? x.v : 0)) };
    if (DAILY) { r = P.record('merge', KEY, r); }
    keep(); showDone(r, true);
  }
  function showDone(r, fresh) {
    $('done').classList.add('on'); set('dtime', r.s);
    const s = P.streak();
    set('dline', (fresh ? 'No moves left. ' : 'You played today\'s merge. ') + 'Biggest tile: ' + r.m + ' · time ' + P.fmt(r.t) + (DAILY ? ' · streak ' + s + (s === 1 ? ' day.' : ' days.') : '.'));
    P.prepare(shareData());
  }
  const shareData = () => {
    if (DAILY) { const r = P.result('merge', KEY), s = P.streak(), no = G.dayNo(KEY); return { title: 'Daily merge #' + no, line: '🏁 ' + r.s + ' points · top tile ' + r.m + ' · 🔥 ' + s, big: String(r.s), lines: ['Top tile ' + r.m + ' · ' + P.fmt(r.t), 'Streak: ' + s + (s === 1 ? ' day' : ' days')], date: P.niceDate(KEY), file: 'dilia-daily-merge-' + no }; }
    return { title: 'Merge ' + n + ' × ' + n, line: '🏁 ' + score + ' points · top tile ' + maxTile(), big: String(score), lines: ['Top tile ' + maxTile(), n + ' × ' + n + ' board'], date: P.niceDate(KEY), file: 'dilia-merge-' + score };
  };

  // ---- input: keys, swipe, buttons ----
  const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); } return; }
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t.closest && t.closest('header, [role=dialog]')))) return;
    if (e.key in KEYS) { e.preventDefault(); move(KEYS[e.key]); }
  });
  let sx = 0, sy = 0, on = false;
  box.addEventListener('pointerdown', e => { on = true; sx = e.clientX; sy = e.clientY; box.setPointerCapture(e.pointerId); });
  box.addEventListener('pointerup', e => {
    if (!on) return; on = false;
    const dx = e.clientX - sx, dy = e.clientY - sy, ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 24) return;
    move(ax > ay ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
  });
  box.addEventListener('pointercancel', () => { on = false; });
  $('undo').addEventListener('click', undo);
  $('share').addEventListener('click', () => P.share(shareData(), say));
  $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  if (!DAILY) {
    $('newgame').addEventListener('click', () => { if (!over && moves && !confirmNew()) return; $('done').classList.remove('on'); newGame(n); });
    document.querySelectorAll('.msize button').forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.n; if (k === n) return; $('done').classList.remove('on');
      const st = rd(FREE(k), null); if (st && st.n === k) restore(st); else newGame(k); keep();
    }));
    $('dagain').addEventListener('click', () => { $('done').classList.remove('on'); newGame(n); });
  }
  let asked = 0;
  function confirmNew() { if (Date.now() - asked < 4000) return true; asked = Date.now(); say('Tap New game again to start over.'); return false; }
  addEventListener('pagehide', () => { if (grid) keep(); });

  // ---- start ----
  if (DAILY) {
    set('mno', '#' + G.dayNo(KEY)); set('mdate', P.niceDate(KEY));
    const r = P.result('merge', KEY), st = P.load('merge', KEY);
    if (r) { newGame(4); if (Array.isArray(r.cells) && r.cells.length === 16) { id = 1; grid = r.cells.map(v => (v ? { id: id++, v } : null)); score = r.s; } over = true; render(true); showDone(r, false); }
    else if (st && st.seed === 'merge:' + KEY) { restore(st); if (moves) say('Welcome back. Your game is where you left it.'); }
    else newGame(4);
  } else {
    const last = +(rd('dilia-merge-size', 4)) || 4, st = rd(FREE(last), null);
    if (st && st.n === last) restore(st); else newGame(last);
    document.querySelectorAll('.msize button').forEach(b => b.addEventListener('click', () => wr('dilia-merge-size', +b.dataset.n)));
  }
  keep();
  window.DiliaMerge = { state: () => ({ n, cells: grid.map(t => (t ? t.v : 0)), score, over, won, moves, draws: R.count() }), move };
}
