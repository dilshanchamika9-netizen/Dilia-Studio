// Solitaire (Klondike). <body data-mode="free">: draw 1 or 3, winnable deals (draw 1), new deal any time.
// <body data-mode="daily">: one winnable draw-1 deal a day, the same for everyone.
{
  const G = DiliaPlayGen, P = DiliaPlay, $ = id => document.getElementById(id);
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  const DAILY = document.body.dataset.mode === 'daily', KEY = P.today();
  const board = $('sol'), msg = $('msg');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 2600); };
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const SU = ['♠', '♥', '♦', '♣'], RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const suit = c => (c / 13) | 0, rank = c => (c % 13) + 1, red = c => suit(c) === 1 || suit(c) === 2;

  let S, hist = [], moves = 0, done = false, clock, els = [], geo = {}, finishing = false;

  // ---- cards ----
  for (let c = 0; c < 52; c++) {
    const e = document.createElement('div'); e.className = 'kc' + (red(c) ? ' red' : ''); e.dataset.c = c;
    const a = document.createElement('span'); a.className = 'kr'; a.textContent = RK[rank(c)] + SU[suit(c)];
    const b = document.createElement('span'); b.className = 'ku'; b.textContent = SU[suit(c)];
    e.append(a, b); e.setAttribute('role', 'img'); e.setAttribute('aria-label', RK[rank(c)] + ' of ' + ['spades', 'hearts', 'diamonds', 'clubs'][suit(c)]);
    board.append(e); els.push(e);
  }
  const slots = {};
  const slot = (id, cls, txt) => { const e = document.createElement('div'); e.className = 'ks ' + cls; e.dataset.slot = id; if (txt) e.textContent = txt; board.prepend(e); slots[id] = e; return e; };
  slot('stock', 'stock', '↻'); slot('waste', 'waste');
  for (let s = 0; s < 4; s++) slot('f' + s, 'fnd', SU[s]);
  for (let t = 0; t < 7; t++) slot('t' + t, 'tab');

  // ---- layout ----
  function measure() {
    const W = board.clientWidth, gap = Math.max(4, Math.min(14, W * 0.018)), cw = (W - gap * 6) / 7, ch = cw * 1.4;
    geo = { W, gap, cw, ch, x: i => i * (cw + gap), top: 0, tabY: ch + gap * 2.2 };
    board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--ch', ch + 'px');
  }
  function place(e, x, y, z) { e.style.transform = 'translate(' + x + 'px,' + y + 'px)'; e.style.zIndex = z; }
  function render() {
    measure(); const { cw, ch, x, tabY } = geo;
    place(slots.stock, x(0), 0, 0); place(slots.waste, x(1), 0, 0);
    for (let s = 0; s < 4; s++) place(slots['f' + s], x(3 + s), 0, 0);
    slots.stock.classList.toggle('empty', !S.stock.length); slots.stock.classList.toggle('none', !S.stock.length && !S.waste.length);
    // stock
    S.stock.forEach((c, i) => { const e = els[c]; e.classList.add('back'); e.classList.remove('top'); place(e, x(0) - Math.min(i, 6) * 0.4, -Math.min(i, 6) * 0.4, 10 + i); });
    // waste: draw 3 fans the last three
    const fan = S.draw === 3 ? Math.min(3, S.waste.length) : 1;
    S.waste.forEach((c, i) => { const e = els[c], k = i - (S.waste.length - fan); e.classList.remove('back'); e.classList.toggle('top', i === S.waste.length - 1); place(e, x(1) + (k > 0 ? k * cw * 0.26 : 0), 0, 100 + i); });
    // foundations
    for (let s = 0; s < 4; s++) for (let r = 1; r <= S.fnd[s]; r++) { const e = els[s * 13 + r - 1]; e.classList.remove('back'); e.classList.toggle('top', r === S.fnd[s]); place(e, x(3 + s), 0, 200 + r); }
    // tableau, squeezed when a column gets tall
    const room = Math.max(ch * 3, innerHeight - board.getBoundingClientRect().top - tabY - 40);
    let maxY = tabY + ch;
    S.tab.forEach((p, t) => {
      place(slots['t' + t], x(t), tabY, 0);
      const down = p.filter(q => !q.up).length, up = p.length - down;
      let dy = ch * 0.12, uy = ch * 0.27;
      const need = down * dy + Math.max(0, up - 1) * uy;
      if (need > room - ch) uy = Math.max(ch * 0.15, (room - ch - down * dy) / Math.max(1, up - 1));
      let y = tabY;
      p.forEach((q, i) => { const e = els[q.c]; e.classList.toggle('back', !q.up); e.classList.toggle('top', i === p.length - 1); place(e, x(t), y, 300 + t * 20 + i); y += q.up ? uy : dy; });
      maxY = Math.max(maxY, y - (p.length ? (p[p.length - 1].up ? uy : dy) : 0) + ch);
    });
    board.style.height = Math.ceil(maxY + 4) + 'px';
    set('smoves', moves); $('undo').disabled = !hist.length || done || finishing;
    const canFinish = !done && !S.stock.length && !S.waste.length && S.tab.every(p => p.every(q => q.up));
    $('finish').hidden = !canFinish || finishing;
  }

  // ---- moves ----
  function doMove(m, quiet) {
    if (done || finishing || !G.klLegal(S, m)) { if (!quiet) shake(m); return false; }
    hist.push({ S: G.klCopy(S), moves }); if (hist.length > 500) hist.shift();
    S = G.klApply(S, m).s; moves++;
    if (!clock.live) clock.start();
    render(); keep(); check(); return true;
  }
  function shake(m) { const c = cardOf(m); if (c != null) { const e = els[c]; e.classList.remove('no'); void e.offsetWidth; e.classList.add('no'); } }
  function cardOf(m) { if (m.t === 'wf' || m.t === 'wt') return S.waste[S.waste.length - 1]; if (m.t === 'tf') { const p = S.tab[m.from]; return p.length ? p[p.length - 1].c : null; } if (m.t === 'tt') return S.tab[m.from][m.i] ? S.tab[m.from][m.i].c : null; return null; }
  function undo() { if (!hist.length || done || finishing) return; const h = hist.pop(); S = h.S; moves = h.moves; render(); keep(); }
  // where is card c? {at:'waste'|'fnd'|'tab', col, i}
  function where(c) {
    if (S.waste.length && S.waste[S.waste.length - 1] === c) return { at: 'waste' };
    if (S.fnd[suit(c)] === rank(c)) return { at: 'fnd', s: suit(c) };
    for (let t = 0; t < 7; t++) { const i = S.tab[t].findIndex(q => q.c === c); if (i >= 0) return S.tab[t][i].up ? { at: 'tab', col: t, i } : null; }
    return null;
  }
  // a tap sends the card to the best place: home if it can go, else another column
  function autoMove(c) {
    const w = where(c); if (!w) return;
    const tries = [];
    if (w.at === 'waste') { tries.push({ t: 'wf' }); for (let t = 0; t < 7; t++) if (S.tab[t].length) tries.push({ t: 'wt', to: t }); for (let t = 0; t < 7; t++) if (!S.tab[t].length) tries.push({ t: 'wt', to: t }); }
    else if (w.at === 'tab') {
      if (w.i === S.tab[w.col].length - 1) tries.push({ t: 'tf', from: w.col });
      const order = [...Array(7).keys()].sort((a, b) => (!S.tab[a].length) - (!S.tab[b].length));
      for (const t of order) if (t !== w.col && !(w.i === 0 && !S.tab[t].length)) tries.push({ t: 'tt', from: w.col, i: w.i, to: t });
    } else if (w.at === 'fnd') { for (let t = 0; t < 7; t++) tries.push({ t: 'ft', s: w.s, to: t }); }
    const m = tries.find(x => G.klLegal(S, x));
    if (m) doMove(m); else { els[c].classList.remove('no'); void els[c].offsetWidth; els[c].classList.add('no'); }
  }
  function check() {
    if (G.klWon(S)) win();
  }
  function finishAll() { // every card is face up: send them home one by one
    if (finishing) return; finishing = true; render();
    const id = setInterval(() => {
      let m = null;
      for (let t = 0; t < 7 && !m; t++) if (G.klLegal(S, { t: 'tf', from: t })) m = { t: 'tf', from: t };
      if (!m) { clearInterval(id); finishing = false; render(); check(); return; }
      S = G.klApply(S, m).s; moves++; render();
      if (G.klWon(S)) { clearInterval(id); finishing = false; check(); }
    }, 70);
  }
  function win() {
    if (done) return; done = true; const t = Math.round(clock.stop());
    let r = { t, mv: moves };
    if (DAILY) r = P.record('solitaire', KEY, r);
    else { const k = 'd' + S.draw, b = rd('dilia-sol-best', {}); if (b[k] == null || t < b[k]) b[k] = t; b['w' + S.draw] = (b['w' + S.draw] || 0) + 1; wr('dilia-sol-best', b); wr('dilia-sol-free', null); }
    render(); P.burst(board.parentNode); showWin(r, true);
  }
  function showWin(r, fresh) {
    $('done').classList.add('on'); set('dtime', P.fmt(r.t));
    const s = P.streak();
    set('dline', DAILY ? (fresh ? 'All cards home! ' : 'You won today\'s deal. ') + r.mv + ' moves. Streak: ' + s + (s === 1 ? ' day.' : ' days.') : 'All cards home in ' + r.mv + ' moves.');
    stats(); P.prepare(shareData());
  }
  const shareData = () => {
    if (DAILY) { const r = P.result('solitaire', KEY), s = P.streak(), no = G.dayNo(KEY); return { title: 'Daily solitaire #' + no, line: '🃏 ' + P.fmt(r.t) + ' · ' + r.mv + ' moves · 🔥 ' + s, big: P.fmt(r.t), lines: ['Klondike, draw 1 · ' + r.mv + ' moves', 'Streak: ' + s + (s === 1 ? ' day' : ' days')], date: P.niceDate(KEY), file: 'dilia-daily-solitaire-' + no }; }
    const t = Math.round(clock.get()); return { title: 'Solitaire · draw ' + S.draw, line: '🃏 ' + P.fmt(t) + ' · ' + moves + ' moves', big: P.fmt(t), lines: ['Klondike, draw ' + S.draw + ' · ' + moves + ' moves'], date: P.niceDate(KEY), file: 'dilia-solitaire' };
  };
  function stats() {
    if (DAILY) { set('streak', P.streak()); const st = P.stats('solitaire'); set('sbest', st.best ? P.fmt(st.best) : '–'); return; }
    const b = rd('dilia-sol-best', {}); set('sbest', b['d' + S.draw] != null ? P.fmt(b['d' + S.draw]) : '–'); set('swins', b['w' + S.draw] || 0); set('sdraw', S.draw);
  }
  function keep() {
    if (done) return;
    const st = { S, moves, t: clock.get() };
    if (DAILY) P.save('solitaire', KEY, st); else wr('dilia-sol-free', st);
  }
  function valid(st) { if (!st || !st.S || !Array.isArray(st.S.tab) || st.S.tab.length !== 7) return false; const all = [...st.S.stock, ...st.S.waste, ...st.S.tab.flat().map(q => q.c)]; let n = all.length; st.S.fnd.forEach(r => { n += r; }); return n === 52; }

  // ---- input: tap and drag ----
  let drag = null;
  board.addEventListener('pointerdown', e => {
    if (done || finishing || e.button > 0) return;
    const sl = e.target.closest('.ks.stock'), ce = e.target.closest('.kc');
    if (sl || (ce && S.stock.includes(+ce.dataset.c))) { doMove({ t: 'draw' }); return; }
    if (!ce) return;
    const c = +ce.dataset.c, w = where(c); if (!w) return;
    let run = [c];
    if (w.at === 'tab') run = S.tab[w.col].slice(w.i).map(q => q.c);
    if (w.at === 'waste' || w.at === 'fnd') run = [c];
    const r = board.getBoundingClientRect();
    drag = { c, w, run, x0: e.clientX, y0: e.clientY, on: false, base: run.map(k => { const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px/.exec(els[k].style.transform); return [+m[1], +m[2]]; }), r };
    board.setPointerCapture(e.pointerId);
  });
  board.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.on && Math.hypot(dx, dy) < 7) return;
    drag.on = true;
    drag.run.forEach((k, j) => { const e2 = els[k]; e2.classList.add('drag'); e2.style.transform = 'translate(' + (drag.base[j][0] + dx) + 'px,' + (drag.base[j][1] + dy) + 'px)'; e2.style.zIndex = 900 + j; });
  });
  const up = e => {
    if (!drag) return; const d = drag; drag = null;
    d.run.forEach(k => els[k].classList.remove('drag'));
    if (!d.on) { autoMove(d.c); return; }
    // drop: the column (or home pile) under the middle of the dragged card
    const r = board.getBoundingClientRect(), cx = d.base[0][0] + (e.clientX - d.x0) + geo.cw / 2, cy = d.base[0][1] + (e.clientY - d.y0) + geo.ch / 2;
    const col = Math.max(0, Math.min(6, Math.floor(cx / (geo.cw + geo.gap))));
    let m = null;
    if (cy < geo.tabY - geo.gap * 0.5 && col >= 3 && d.run.length === 1) m = d.w.at === 'waste' ? { t: 'wf' } : d.w.at === 'tab' ? { t: 'tf', from: d.w.col } : null;
    else if (cy >= geo.tabY - geo.ch * 0.4) m = d.w.at === 'waste' ? { t: 'wt', to: col } : d.w.at === 'tab' ? { t: 'tt', from: d.w.col, i: d.w.i, to: col } : d.w.at === 'fnd' ? { t: 'ft', s: d.w.s, to: col } : null;
    if (!m || (m.t === 'tt' && m.from === col) || !doMove(m, true)) render();
  };
  board.addEventListener('pointerup', up);
  board.addEventListener('pointercancel', () => { if (drag) { drag.run.forEach(k => els[k].classList.remove('drag')); drag = null; render(); } });
  addEventListener('keydown', e => {
    const t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t.closest && t.closest('header, [role=dialog]')))) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    else if (!e.ctrlKey && !e.metaKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); doMove({ t: 'draw' }); }
    else if (!e.ctrlKey && !e.metaKey && (e.key === 'u' || e.key === 'U')) { e.preventDefault(); undo(); }
  });
  $('undo').addEventListener('click', undo);
  $('finish').addEventListener('click', finishAll);
  $('share').addEventListener('click', () => P.share(shareData(), say));
  $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 80); });
  addEventListener('pagehide', keep);

  // ---- start ----
  function start(deal, saved) {
    S = deal; hist = []; moves = 0; done = false; finishing = false;
    if (clock) clock.stop(); clock = P.timer(t => set('stime', P.fmt(t)), saved ? saved.t : 0);
    if (saved) { S = saved.S; moves = saved.moves | 0; }
    $('done').classList.remove('on'); board.classList.add('nomove'); render(); requestAnimationFrame(() => requestAnimationFrame(() => board.classList.remove('nomove')));
    set('stime', P.fmt(clock.get())); stats();
  }
  function newFree() {
    const draw = +rd('dilia-sol-draw', 1), win = rd('dilia-sol-winnable', true);
    const a = new Uint32Array(1); crypto.getRandomValues(a);
    const d = (draw === 1 && win && G.klWinnable('solfree:' + a[0], 6000)) || G.klDeal('solfree:' + a[0], draw);
    d.draw = draw; start(d); keep();
  }
  if (DAILY) {
    set('sno', '#' + G.dayNo(KEY)); set('sdate', P.niceDate(KEY));
    const deal = G.klDaily(KEY), r = P.result('solitaire', KEY), st = P.load('solitaire', KEY);
    if (r) { const fin = G.klCopy(deal); fin.tab = fin.tab.map(() => []); fin.stock = []; fin.waste = []; fin.fnd = [13, 13, 13, 13]; start(fin); done = true; moves = r.mv; render(); set('stime', P.fmt(r.t)); showWin(r, false); }
    else if (valid(st)) { start(deal, st); if (st.moves) { clock.start(); say('Welcome back. Your game is where you left it.'); } }
    else start(deal);
    window.DiliaSolDeal = deal;
  } else {
    const draws = document.querySelectorAll('.sdraw button'), wb = $('winnable');
    const sync = () => { const d = +rd('dilia-sol-draw', 1); draws.forEach(b => b.setAttribute('aria-pressed', +b.dataset.d === d ? 'true' : 'false')); wb.setAttribute('aria-pressed', rd('dilia-sol-winnable', true) && d === 1 ? 'true' : 'false'); wb.disabled = d !== 1; };
    draws.forEach(b => b.addEventListener('click', () => { wr('dilia-sol-draw', +b.dataset.d); sync(); newFree(); }));
    wb.addEventListener('click', () => { wr('dilia-sol-winnable', wb.getAttribute('aria-pressed') !== 'true'); sync(); newFree(); say(rd('dilia-sol-winnable', true) ? 'Winnable deals: every deal can be won.' : 'Random deals: some cannot be won.'); });
    $('newgame').addEventListener('click', newFree); $('dagain').addEventListener('click', newFree);
    sync();
    const st = rd('dilia-sol-free', null);
    if (valid(st)) { start(st.S, st); } else newFree();
  }
  window.DiliaSol = { state: () => ({ S: G.klCopy(S), moves, done }), move: m => doMove(m, true), autoMove, finishAll };
}
