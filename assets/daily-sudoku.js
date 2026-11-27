// Daily sudoku: three boards a day (easy, medium, hard), the same for everyone, each with one answer.
{
  const G = DiliaPlayGen, P = DiliaPlay, $ = id => document.getElementById(id);
  const KEY = P.today(), LV = ['easy', 'medium', 'hard'], NAME = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const grid = $('sgrid'), pad = $('pad'), msg = $('msg');
  const say = t => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, 2600); };
  const peers = i => { const r = (i / 9) | 0, c = i % 9, br = r - r % 3, bc = c - c % 3, o = []; for (let k = 0; k < 81; k++) { const kr = (k / 9) | 0, kc = k % 9; if (k !== i && (kr === r || kc === c || (kr - kr % 3 === br && kc - kc % 3 === bc))) o.push(k); } return o; };
  const PEERS = Array.from({ length: 81 }, (_, i) => peers(i));

  $('sdate').textContent = P.niceDate(KEY);
  const cells = [];
  for (let i = 0; i < 81; i++) {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'pcell'; c.dataset.i = i; c.tabIndex = -1;
    if (i % 9 === 2 || i % 9 === 5) c.classList.add('c3');
    if (((i / 9) | 0) === 2 || ((i / 9) | 0) === 5) c.classList.add('r3');
    grid.append(c); cells.push(c);
  }
  const padBtns = [];
  for (let d = 1; d <= 9; d++) { const b = document.createElement('button'); b.type = 'button'; b.dataset.d = d; const s = document.createElement('span'); s.textContent = d; const sm = document.createElement('small'); b.append(s, sm); pad.append(b); padBtns.push(b); }

  let lv, B, val, notes, hist, sel, noteMode = false, showBad = false, hints = 0, done = false, clock = null, touched = false;
  const levelBtns = [...document.querySelectorAll('.levels button')];

  function open(level) {
    if (clock && !done) { clock.stop(); keep(); }
    lv = level; B = G.makeSudoku(KEY, lv); hist = []; sel = -1; done = false;
    $('sno').textContent = '#' + B.no + ' · ' + NAME[lv];
    levelBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.lv === lv ? 'true' : 'false'));
    const st = P.load('sudoku-' + lv, KEY), r = P.result('sudoku-' + lv, KEY);
    val = B.grid.slice(); notes = new Array(81).fill(0); hints = 0; touched = !!st;
    if (st && Array.isArray(st.val) && st.val.length === 81) { st.val.forEach((v, i) => { if (!B.grid[i] && v >= 0 && v <= 9) val[i] = v | 0; }); if (Array.isArray(st.notes)) notes = st.notes.map(x => x & 511); hints = st.hints | 0; }
    clock = P.timer(t => { $('stime').textContent = P.fmt(t); }, st ? st.t : 0);
    $('done').classList.remove('on'); grid.classList.remove('win');
    if (r) { val = B.solution.slice(); done = true; $('stime').textContent = P.fmt(r.t); finish(r, false); }
    else { $('stime').textContent = P.fmt(clock.get()); if (st) { clock.start(); say('Welcome back. Your board is where you left it.'); } }
    try { history.replaceState(null, '', '#' + lv); } catch (e) {}
    draw();
  }
  function keep() { if (!done && B && touched) P.save('sudoku-' + lv, KEY, { val, notes, hints, t: clock.get() }); }

  function draw() {
    const sv = sel >= 0 ? val[sel] : 0, sr = (sel / 9) | 0, sc = sel % 9;
    const count = new Array(10).fill(0); val.forEach(v => count[v]++);
    for (let i = 0; i < 81; i++) {
      const c = cells[i], v = val[i], r = (i / 9) | 0, k = i % 9;
      c.textContent = '';
      if (v) c.textContent = v;
      else if (notes[i]) { const w = document.createElement('span'); w.className = 'notes'; for (let d = 1; d <= 9; d++) { const s = document.createElement('span'); if (notes[i] & (1 << (d - 1))) s.textContent = d; w.append(s); } c.append(w); }
      c.classList.toggle('g', !!B.grid[i]);
      c.classList.toggle('sel', i === sel);
      c.classList.toggle('hl', sel >= 0 && i !== sel && (r === sr || k === sc || (r - r % 3 === sr - sr % 3 && k - k % 3 === sc - sc % 3)));
      c.classList.toggle('same', !!sv && v === sv && i !== sel);
      c.classList.toggle('bad', !!v && !B.grid[i] && (showBad ? v !== B.solution[i] : PEERS[i].some(p => val[p] === v)));
      c.setAttribute('aria-label', 'row ' + (r + 1) + ' column ' + (k + 1) + (v ? ', ' + v : ', empty'));
    }
    padBtns.forEach((b, j) => { const left = 9 - count[j + 1]; b.lastChild.textContent = left > 0 ? left : ''; b.disabled = done || left <= 0 && !noteMode; });
    pad.classList.toggle('notes-on', noteMode);
    $('notes').setAttribute('aria-pressed', noteMode ? 'true' : 'false');
    $('check').setAttribute('aria-pressed', showBad ? 'true' : 'false');
    ['undo', 'erase', 'hint', 'notes'].forEach(id => { $(id).disabled = done; });
    $('sleft').textContent = val.filter(v => !v).length;
    levelBtns.forEach(b => { const ok = !!P.result('sudoku-' + b.dataset.lv, KEY); let i = b.querySelector('i'); if (ok && !i) { i = document.createElement('i'); i.setAttribute('role', 'img'); i.setAttribute('aria-label', 'solved'); b.append(i); } });
    keep();
  }

  function put(d) {
    if (done) return;
    if (sel < 0) { say('Pick a square first.'); return; }
    if (B.grid[sel]) { say('That number is part of the puzzle.'); return; }
    if (!clock.live) clock.start();
    touched = true;
    hist.push([sel, val[sel], notes[sel], PEERS[sel].map(p => notes[p])]);
    if (hist.length > 400) hist.shift();
    if (noteMode && d) { if (val[sel]) val[sel] = 0; notes[sel] ^= 1 << (d - 1); }
    else {
      val[sel] = val[sel] === d ? 0 : d; notes[sel] = 0;
      if (val[sel]) PEERS[sel].forEach(p => { notes[p] &= ~(1 << (d - 1)); });
    }
    draw(); check();
  }
  function undo() {
    if (done) return; const h = hist.pop(); if (!h) { say('Nothing to undo.'); return; }
    const [i, v, nt, pn] = h; val[i] = v; notes[i] = nt; PEERS[i].forEach((p, k) => { notes[p] = pn[k]; }); sel = i; draw();
  }
  function hint() {
    if (done) return;
    let i = sel >= 0 && !B.grid[sel] && val[sel] !== B.solution[sel] ? sel : -1;
    if (i < 0) { // the empty square with the fewest options
      let best = 10; for (let k = 0; k < 81; k++) if (val[k] !== B.solution[k]) { const used = new Set(PEERS[k].map(p => val[p])); const c = 9 - [...used].filter(Boolean).length; if (c < best) { best = c; i = k; } }
    }
    if (i < 0) return;
    if (!clock.live) clock.start();
    touched = true; sel = i; hints++; const nm = noteMode; noteMode = false; hist.push([i, val[i], notes[i], PEERS[i].map(p => notes[p])]);
    val[i] = B.solution[i]; notes[i] = 0; PEERS[i].forEach(p => { notes[p] &= ~(1 << (B.solution[i] - 1)); }); noteMode = nm;
    say('Hint: ' + B.solution[i] + ' goes here.'); draw(); check();
  }
  function check() {
    if (done || val.some((v, i) => v !== B.solution[i])) return;
    done = true; const t = clock.stop();
    const r = P.record('sudoku-' + lv, KEY, { t: Math.round(t), h: hints });
    grid.classList.add('win'); P.burst(grid.parentNode); sel = -1; finish(r, true);
  }
  function finish(r, fresh) {
    $('done').classList.add('on'); $('dtime').textContent = P.fmt(r.t);
    const s = P.streak(), nextLv = LV.find(l => !P.result('sudoku-' + l, KEY));
    $('dline').textContent = (fresh ? 'Solved! ' : 'You solved today\'s ' + NAME[lv].toLowerCase() + ' board. ') + (r.h ? r.h + (r.h === 1 ? ' hint' : ' hints') + ' used. ' : '') + 'Streak: ' + s + (s === 1 ? ' day.' : ' days.');
    const nx = $('dnext'); nx.hidden = !nextLv; if (nextLv) { nx.textContent = 'Play ' + NAME[nextLv].toLowerCase(); nx.dataset.lv = nextLv; }
    stats(); draw();
    P.prepare(shareData());
  }
  function stats() {
    $('streak').textContent = P.streak();
    LV.forEach(l => { const st = P.stats('sudoku-' + l); $('b-' + l).textContent = st.best ? P.fmt(st.best) : '–'; });
  }
  const shareData = () => { const r = P.result('sudoku-' + lv, KEY), s = P.streak(); return { title: 'Daily sudoku #' + B.no + ' · ' + NAME[lv], line: '✅ ' + P.fmt(r.t) + (r.h ? ' · 💡' + r.h : '') + ' · 🔥 ' + s, big: P.fmt(r.t), lines: [NAME[lv] + ' board · ' + (r.h ? r.h + (r.h === 1 ? ' hint' : ' hints') : 'no hints'), 'Streak: ' + s + (s === 1 ? ' day' : ' days')], date: P.niceDate(KEY), file: 'dilia-daily-sudoku-' + B.no + '-' + lv }; };

  grid.addEventListener('click', e => { const c = e.target.closest('.pcell'); if (!c || done) return; sel = +c.dataset.i; draw(); grid.focus({ preventScroll: true }); });
  pad.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) put(+b.dataset.d); });
  grid.addEventListener('keydown', e => {
    if (done) return;
    const mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (mv) { e.preventDefault(); if (sel < 0) sel = 0; else { const r = (sel / 9) | 0, c = sel % 9; if ((mv === -1 && c) || (mv === 1 && c < 8) || (mv === -9 && r) || (mv === 9 && r < 8)) sel += mv; } draw(); return; }
    if (/^[1-9]$/.test(e.key)) { e.preventDefault(); put(+e.key); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); erase(); return; }
    if (e.key === 'n' || e.key === 'N') { noteMode = !noteMode; draw(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
  });
  $('undo').addEventListener('click', undo);
  function erase() {
    if (done || sel < 0 || B.grid[sel] || (!val[sel] && !notes[sel])) return;
    touched = true; hist.push([sel, val[sel], notes[sel], PEERS[sel].map(p => notes[p])]); val[sel] = 0; notes[sel] = 0; draw();
  }
  $('erase').addEventListener('click', erase);
  $('notes').addEventListener('click', () => { noteMode = !noteMode; draw(); });
  $('check').addEventListener('click', () => { showBad = !showBad; say(showBad ? 'Wrong numbers are shown in pink.' : 'Only clashes are shown.'); draw(); });
  $('hint').addEventListener('click', hint);
  levelBtns.forEach(b => b.addEventListener('click', () => open(b.dataset.lv)));
  $('dnext').addEventListener('click', e => open(e.target.dataset.lv));
  $('share').addEventListener('click', () => P.share(shareData(), say));
  $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  addEventListener('pagehide', keep);

  stats();
  const h = location.hash.slice(1);
  open(LV.includes(h) ? h : (LV.find(l => !P.result('sudoku-' + l, KEY)) || 'easy'));
  window.DiliaSudokuBoard = () => B; // used by the page test
}
