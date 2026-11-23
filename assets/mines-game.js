// Minesweeper. <body data-mode="free">: levels, custom size, "no guessing" boards, first square always safe.
// <body data-mode="daily">: one 16 × 16 board a day, same for everyone, opened at the same square, solvable by logic.
{
  const G = DiliaPlayGen, P = DiliaPlay, $ = id => document.getElementById(id);
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  const DAILY = document.body.dataset.mode === 'daily', KEY = P.today();
  const board = $('mines'), msg = $('msg');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 2600); };
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const LV = { beginner: [9, 9, 10], intermediate: [16, 16, 40], expert: [30, 16, 99] };
  const NAME = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert', custom: 'Custom' };

  let w, h, n, A, mine = null, cnt, open, flag, lost, won, opened, level, cells = [], cur = -1, flagMode = false, clock, tries = 1, start = -1, boom = -1;

  function setup(W, H, M) {
    w = W; h = H; n = M; A = G.around(w, h); mine = null; cnt = null; lost = won = false; opened = 0; boom = -1;
    open = new Uint8Array(w * h); flag = new Uint8Array(w * h);
    board.textContent = ''; board.style.setProperty('--w', w); board.className = 'mines' + (w > 20 ? ' big' : '');
    cells = [];
    for (let i = 0; i < w * h; i++) { const c = document.createElement('div'); c.className = 'mq'; c.dataset.i = i; board.append(c); cells.push(c); }
    if (clock) clock.stop(); clock = P.timer(t => set('mtime', P.fmt(t)), 0);
    $('done').classList.remove('on'); cur = -1; draw();
  }
  function counts() { cnt = new Int8Array(w * h); for (let i = 0; i < w * h; i++) { let k = 0; for (const j of A[i]) if (mine[j]) k++; cnt[i] = mine[i] ? -1 : k; } }
  function place(first) { // free play: build the board around the first square
    const nog = $('noguess') ? $('noguess').getAttribute('aria-pressed') === 'true' : true;
    const a = new Uint32Array(1); crypto.getRandomValues(a);
    const B = G.makeMines('minefree:' + a[0], w, h, n, first, nog, nog ? 3000 : 1) || G.makeMines('minefree:' + a[0], w, h, n, first, false, 1);
    mine = Uint8Array.from(B.mine); counts();
  }

  function reveal(i) {
    const st = [i];
    while (st.length) {
      const k = st.pop(); if (open[k] || flag[k]) continue;
      open[k] = 1; opened++;
      if (mine[k]) { boom = k; return lose(); }
      if (cnt[k] === 0) for (const j of A[k]) if (!open[j] && !flag[j]) st.push(j);
    }
  }
  function act(i, asFlag) {
    if (lost || won || i < 0) return;
    if (asFlag) { if (open[i]) return chord(i); flag[i] ^= 1; draw(); keep(); return; }
    if (flag[i]) return;
    if (!mine) { place(i); clock.start(); }
    if (!clock.live) clock.start();
    if (open[i]) return chord(i);
    reveal(i); after();
  }
  function chord(i) { // tap an open number whose flags are all placed: open the rest around it
    if (!open[i] || cnt[i] <= 0) return;
    let f = 0; for (const j of A[i]) if (flag[j]) f++;
    if (f !== cnt[i]) { say(cnt[i] + ' mines touch this square. Flag ' + (cnt[i] - f > 0 ? cnt[i] - f + ' more' : 'fewer') + ' first.'); return; }
    for (const j of A[i]) if (!open[j] && !flag[j]) { reveal(j); if (lost) return; }
    after();
  }
  function after() { if (lost) return; if (opened === w * h - n) win(); else { draw(); keep(); } }

  function draw() {
    let f = 0;
    for (let i = 0; i < w * h; i++) {
      const c = cells[i], o = open[i];
      let cls = 'mq';
      if (o) cls += mine[i] ? ' o boom' : ' o n' + cnt[i];
      else if (flag[i]) cls += (lost && mine && !mine[i]) ? ' f wrong' : ' f';
      else if ((lost || won) && mine && mine[i]) cls += won ? ' f' : ' m';
      if (i === cur) cls += ' cur';
      if (c.className !== cls) c.className = cls;
      const t = o && cnt[i] > 0 ? String(cnt[i]) : '';
      if (c.textContent !== t) c.textContent = t;
      if (flag[i]) f++;
    }
    set('mleft', n - f);
    $('flagmode').setAttribute('aria-pressed', flagMode ? 'true' : 'false');
  }
  function lose() {
    lost = true; clock.stop(); draw();
    if (DAILY) { say('Boom. Same board again: try ' + (tries + 1) + '.', 3500); setTimeout(retry, 1400); }
    else { $('share').hidden = $('saveimg').hidden = true; $('done').classList.add('on'); set('deyebrow', 'Boom'); set('dtime', P.fmt(clock.get())); set('dline', 'You opened a mine. ' + (level !== 'custom' ? 'Best ' + NAME[level].toLowerCase() + ' time: ' + (best() != null ? P.fmt(best()) : '–') + '.' : '')); }
    keep();
  }
  function win() {
    won = true; const t = Math.round(clock.stop()); draw();
    let r = { t, tries };
    if (DAILY) r = P.record('mines', KEY, r);
    else if (level !== 'custom') { const b = rd('dilia-mines-best', {}); if (b[level] == null || t < b[level]) { b[level] = t; wr('dilia-mines-best', b); } }
    P.burst(board.parentNode); showWin(r, true); keep();
  }
  function showWin(r, fresh) {
    $('share').hidden = $('saveimg').hidden = false; $('done').classList.add('on'); set('deyebrow', 'Cleared'); set('dtime', P.fmt(r.t));
    const s = P.streak();
    set('dline', DAILY ? (fresh ? 'Board cleared! ' : 'You cleared today\'s board. ') + (r.tries > 1 ? r.tries + ' tries. ' : 'First try. ') + 'Streak: ' + s + (s === 1 ? ' day.' : ' days.')
      : 'Board cleared! ' + (level !== 'custom' ? 'Best ' + NAME[level].toLowerCase() + ' time: ' + P.fmt(best()) + '.' : ''));
    stats(); P.prepare(shareData());
  }
  const best = () => { const v = rd('dilia-mines-best', {})[level]; return v == null ? null : v; };
  const shareData = () => {
    if (DAILY) { const r = P.result('mines', KEY), s = P.streak(), no = G.dayNo(KEY); return { title: 'Daily minesweeper #' + no, line: '💣 ' + P.fmt(r.t) + (r.tries > 1 ? ' · ' + r.tries + ' tries' : ' · first try') + ' · 🔥 ' + s, big: P.fmt(r.t), lines: ['16 × 16 · 40 mines · ' + (r.tries > 1 ? r.tries + ' tries' : 'first try'), 'Streak: ' + s + (s === 1 ? ' day' : ' days')], date: P.niceDate(KEY), file: 'dilia-daily-minesweeper-' + no }; }
    return { title: 'Minesweeper · ' + NAME[level], line: '💣 ' + P.fmt(Math.round(clock.get())) + ' · ' + w + '×' + h + ' · ' + n + ' mines', big: P.fmt(Math.round(clock.get())), lines: [NAME[level] + ' · ' + w + ' × ' + h + ' · ' + n + ' mines'], date: P.niceDate(KEY), file: 'dilia-minesweeper-' + level };
  };
  function stats() {
    if (DAILY) { set('streak', P.streak()); const st = P.stats('mines'); set('sbest', st.best ? P.fmt(st.best) : '–'); return; }
    set('sbest', best() != null ? P.fmt(best()) : '–'); set('sbestl', NAME[level]);
  }

  // daily: progress is saved; a mine resets the same board
  function keep() { if (DAILY && mine && !P.result('mines', KEY)) P.save('mines', KEY, { open: Array.from(open), flag: Array.from(flag), tries, t: clock.get(), lost }); }
  function retry() { tries++; dailyBoard(); clock = P.timer(x => set('mtime', P.fmt(x)), 0); set('mtries', tries); draw(); keep(); }
  function dailyBoard() {
    const B = G.makeDailyMines(KEY); setup(16, 16, 40); mine = Uint8Array.from(B.mine); counts(); start = B.start;
    reveal(start); cells[start].classList.add('st'); draw();
  }

  // ---- input ----
  const cellOf = e => { const c = e.target.closest('.mq'); return c ? +c.dataset.i : -1; };
  let press = 0, pressAt = -1, longDone = false, px = 0, py = 0;
  board.addEventListener('contextmenu', e => { e.preventDefault(); });
  board.addEventListener('pointerdown', e => {
    const i = cellOf(e); if (i < 0) return; cur = -1;
    if (e.button === 2) { act(i, true); return; }
    if (e.button !== 0) return;
    pressAt = i; longDone = false; px = e.clientX; py = e.clientY; clearTimeout(press);
    if (e.pointerType !== 'mouse') press = setTimeout(() => { longDone = true; act(i, !flagMode); if (navigator.vibrate) navigator.vibrate(18); }, 420);
  });
  board.addEventListener('pointermove', e => { if (pressAt >= 0 && Math.hypot(e.clientX - px, e.clientY - py) > 12) { clearTimeout(press); pressAt = -1; } });
  board.addEventListener('pointerup', e => {
    clearTimeout(press); const i = cellOf(e);
    if (e.button !== 0 || pressAt < 0 || i !== pressAt || longDone) { pressAt = -1; return; }
    pressAt = -1; act(i, flagMode);
  });
  board.addEventListener('pointercancel', () => { clearTimeout(press); pressAt = -1; });
  board.addEventListener('keydown', e => {
    const mv = { ArrowUp: -w, ArrowDown: w, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (mv) { e.preventDefault(); if (cur < 0) cur = 0; else { const x = cur % w; if ((mv === -1 && x) || (mv === 1 && x < w - 1) || (mv === -w && cur >= w) || (mv === w && cur < w * (h - 1))) cur += mv; } draw(); return; }
    if (cur < 0) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(cur, flagMode); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); act(cur, true); }
  });
  $('flagmode').addEventListener('click', () => { flagMode = !flagMode; say(flagMode ? 'Flag mode: a tap places a flag.' : 'Open mode: a tap opens a square.'); draw(); });
  $('share').addEventListener('click', () => P.share(shareData(), say));
  $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  addEventListener('pagehide', keep);

  if (DAILY) {
    set('mno', '#' + G.dayNo(KEY)); set('mdate', P.niceDate(KEY));
    const r = P.result('mines', KEY), st = P.load('mines', KEY);
    dailyBoard(); stats();
    if (r) { for (let i = 0; i < 256; i++) if (!mine[i]) open[i] = 1; opened = 216; won = true; tries = r.tries; draw(); set('mtime', P.fmt(r.t)); showWin(r, false); }
    else if (st && Array.isArray(st.open) && st.open.length === 256 && !st.lost) {
      st.open.forEach((v, i) => { if (v && !mine[i] && !open[i]) { open[i] = 1; opened++; } });
      st.flag.forEach((v, i) => { if (v && !open[i]) flag[i] = 1; });
      tries = st.tries | 0 || 1; clock = P.timer(x => set('mtime', P.fmt(x)), st.t || 0); set('mtime', P.fmt(st.t || 0));
      draw(); if (opened === 216) win(); else { clock.start(); say('Welcome back. Your board is where you left it.'); }
    } else if (st && st.lost) { tries = (st.tries | 0) + 1; }
    set('mtries', tries);
  } else {
    const narrow = () => matchMedia('(max-width:700px)').matches;
    const go = lv => {
      level = lv; wr('dilia-mines-level', lv);
      document.querySelectorAll('.mlevel button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lv === lv ? 'true' : 'false'));
      $('custom').hidden = lv !== 'custom';
      let [W, H, M] = lv === 'custom' ? custom() : LV[lv];
      if (lv === 'expert' && narrow()) [W, H] = [H, W]; // tall board on phones
      setup(W, H, M); set('msize', W + ' × ' + H + ' · ' + M + ' mines'); stats();
    };
    const custom = () => {
      const c = rd('dilia-mines-custom', [20, 12, 40]);
      const W = Math.max(5, Math.min(30, +$('cw').value || c[0])), H = Math.max(5, Math.min(30, +$('ch').value || c[1]));
      const M = Math.max(1, Math.min(Math.floor(W * H * 0.3), +$('cm').value || c[2]));
      $('cw').value = W; $('ch').value = H; $('cm').value = M; wr('dilia-mines-custom', [W, H, M]); return [W, H, M];
    };
    const c0 = rd('dilia-mines-custom', [20, 12, 40]); $('cw').value = c0[0]; $('ch').value = c0[1]; $('cm').value = c0[2];
    document.querySelectorAll('.mlevel button').forEach(b => b.addEventListener('click', () => go(b.dataset.lv)));
    $('capply').addEventListener('click', () => go('custom'));
    $('newgame').addEventListener('click', () => go(level));
    $('dagain').addEventListener('click', () => go(level));
    $('noguess').addEventListener('click', e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on ? 'true' : 'false'); wr('dilia-mines-noguess', on); go(level); say(on ? 'No guessing: every board can be solved by logic.' : 'Classic boards: sometimes you must guess.'); });
    $('noguess').setAttribute('aria-pressed', rd('dilia-mines-noguess', true) ? 'true' : 'false');
    go(LV[rd('dilia-mines-level', '')] || rd('dilia-mines-level', '') === 'custom' ? rd('dilia-mines-level', 'beginner') : 'beginner');
  }
  window.DiliaMines = { state: () => ({ w, h, n, start, mine: mine ? Array.from(mine) : null, open: Array.from(open), flag: Array.from(flag), lost, won, tries, level }), act };
}
