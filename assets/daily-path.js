// Path puzzle engine: draw one line from 1 through every square, passing the numbers in order.
// <body data-mode="daily">: today's board (same worldwide). <body data-mode="levels">: endless levels, 5×5 up to 8×8.
{
  const G = DiliaPlayGen, P = DiliaPlay, $ = id => document.getElementById(id);
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  const LEVELS = document.body.dataset.mode === 'levels';
  const KEY = P.today(), board = $('board'), msg = $('msg');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 2600); };
  const NS = 'http://www.w3.org/2000/svg';

  let B, n, N, cells, pl, line, done, clock, warned, L, game, drag = false;
  const adj = (a, b) => Math.abs(((a / n) | 0) - ((b / n) | 0)) + Math.abs((a % n) - (b % n)) === 1;
  const saveKey = () => (LEVELS ? 'pathlv' + L : 'path');

  function open(level) {
    if (clock && clock.live) clock.stop();
    if (LEVELS) { L = level; B = G.makeLevel(L); game = 'pathlv'; } else { B = G.makePath(KEY); game = 'path'; }
    n = B.n; N = n * n; line = []; done = false; warned = 0;
    board.textContent = ''; board.classList.remove('win'); $('done').classList.remove('on');
    board.style.gridTemplateColumns = 'repeat(' + n + ',1fr)';
    board.classList.toggle('n8', n >= 8);
    cells = [];
    for (let i = 0; i < N; i++) {
      const c = document.createElement('div'); c.className = 'pcell'; c.dataset.i = i;
      if (B.clues[i]) { const b = document.createElement('b'); b.textContent = B.clues[i]; c.append(b); c.setAttribute('aria-label', 'number ' + B.clues[i]); }
      board.append(c); cells.push(c);
    }
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'line'); svg.setAttribute('viewBox', '0 0 ' + n + ' ' + n); svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = '<defs><linearGradient id="pg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + n + '" y2="' + n + '"><stop offset="0" stop-color="#e5007d"/><stop offset=".55" stop-color="#a08bff"/><stop offset="1" stop-color="#3fc3ff"/></linearGradient></defs>';
    pl = document.createElementNS(NS, 'polyline');
    pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', 'url(#pg)'); pl.setAttribute('stroke-width', '0.36'); pl.setAttribute('stroke-linecap', 'round'); pl.setAttribute('stroke-linejoin', 'round');
    svg.append(pl); board.append(svg);

    set('psize', n + ' × ' + n);
    if (LEVELS) {
      set('pno', 'Level ' + L); set('pdate', 'Solved ' + P.levelsDone('path') + ' levels');
      $('lprev').disabled = L <= 1; $('lnext').disabled = L >= P.levelTop('path');
      try { history.replaceState(null, '', '#' + L); } catch (e) {}
    } else { set('pno', '#' + B.no); set('pdate', P.niceDate(KEY)); }

    const solved = LEVELS ? P.levelResult('path', L) : P.result('path', KEY), state = P.load(saveKey(), KEY);
    clock = P.timer(t => { set('ptime', P.fmt(t)); }, state ? state.t : 0);
    stats();
    if (solved) { line = B.path.slice(); done = true; set('ptime', P.fmt(solved.t)); finish(solved, false); return; }
    if (state && Array.isArray(state.line) && valid(state.line)) line = state.line;
    draw(); set('ptime', P.fmt(clock.get()));
    if (line.length) { clock.start(); say('Welcome back. Your line is where you left it.'); }
  }

  function valid(l) { // a saved line must still follow the rules
    const seen = new Set(); let want = 1;
    for (let k = 0; k < l.length; k++) {
      const c = l[k]; if (!(c >= 0 && c < N) || seen.has(c)) return false; seen.add(c);
      if (k && !adj(l[k - 1], c)) return false;
      if (B.clues[c]) { if (B.clues[c] !== want) return false; want++; }
      if (k === 0 && B.clues[c] !== 1) return false;
    }
    return true;
  }
  const nextWant = () => { let w = 1; line.forEach(c => { if (B.clues[c]) w = B.clues[c] + 1; }); return w; };

  function draw() {
    const inL = new Set(line);
    cells.forEach((c, i) => { c.classList.toggle('v', inL.has(i)); c.classList.toggle('h', i === line[line.length - 1]); });
    pl.setAttribute('points', line.map(i => ((i % n) + .5) + ',' + (((i / n) | 0) + .5)).join(' '));
    set('pfill', line.length + ' / ' + N);
    $('undo').disabled = $('reset').disabled = !line.length || done;
    if (!done && line.length) P.save(saveKey(), KEY, { line, t: clock.get() });
  }

  // try to move the end of the line onto cell c (one step). Returns true if the line changed.
  function step(c) {
    if (done || c < 0 || c >= N) return false;
    if (!line.length) { if (B.clues[c] === 1) { line.push(c); clock.start(); return true; } say('Start on 1.'); return false; }
    const end = line[line.length - 1];
    if (line.length > 1 && c === line[line.length - 2]) { line.pop(); return true; }
    if (!adj(end, c) || line.includes(c)) return false;
    if (B.clues[end] === B.last) { say(B.last + ' is the end. Cover every square before you reach it.'); return false; }
    const w = nextWant();
    if (B.clues[c] && B.clues[c] !== w) { say('Go to ' + w + ' first.'); return false; }
    line.push(c);
    return true;
  }
  // walk towards a far cell in a straight line (fast drags can skip squares)
  function toward(c) {
    if (!line.length) return step(c);
    let moved = false, guard = 0;
    while (guard++ < N) {
      const end = line[line.length - 1]; if (end === c) break;
      if (line.length > 1 && line[line.length - 2] === c) { line.pop(); moved = true; break; }
      const er = (end / n) | 0, ec = end % n, cr = (c / n) | 0, cc = c % n;
      let nx;
      if (er === cr) nx = end + (cc > ec ? 1 : -1); else if (ec === cc) nx = end + (cr > er ? n : -n); else break;
      if (!step(nx)) break; moved = true;
    }
    return moved;
  }
  function cellAt(x, y) {
    const r = board.getBoundingClientRect(), pad = parseFloat(getComputedStyle(board).paddingLeft) || 0;
    const w = (r.width - pad * 2) / n, col = Math.floor((x - r.left - pad) / w), row = Math.floor((y - r.top - pad) / w);
    return col < 0 || row < 0 || col >= n || row >= n ? -1 : row * n + col;
  }

  board.addEventListener('pointerdown', e => {
    if (done) return;
    const c = cellAt(e.clientX, e.clientY); if (c < 0) return;
    const at = line.indexOf(c);
    if (at >= 0) line.length = at + 1;                 // grab the line at any square
    else if (!line.length && B.clues[c] !== 1) { say('Start on 1.'); return; }
    else if (line.length && !adj(line[line.length - 1], c)) { toward(c); draw(); }
    else step(c);
    if (line.length === 1 && !clock.live) clock.start();
    drag = true; board.setPointerCapture(e.pointerId); draw(); check();
  });
  board.addEventListener('pointermove', e => { if (!drag) return; const c = cellAt(e.clientX, e.clientY); if (c >= 0 && toward(c)) { draw(); check(); } });
  const up = () => { drag = false; };
  board.addEventListener('pointerup', up); board.addEventListener('pointercancel', up);

  board.addEventListener('keydown', e => {
    const d = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (d) {
      e.preventDefault();
      if (!line.length) { step(B.clues.indexOf(1)); draw(); return; }
      const end = line[line.length - 1];
      if ((d === 1 && end % n === n - 1) || (d === -1 && end % n === 0)) return;
      if (step(end + d)) { draw(); check(); }
    } else if (e.key === 'Backspace') { e.preventDefault(); undo(); }
  });
  function undo() { if (done || !line.length) return; line.pop(); draw(); }
  $('undo').addEventListener('click', undo);
  $('reset').addEventListener('click', () => { if (done) return; line = []; draw(); say('Cleared. Start again from 1.'); });

  // reached the last number too early: say how many squares are empty and flash them
  function early() {
    const end = line[line.length - 1];
    if (!(B.clues[end] === B.last && line.length < N)) { warned = 0; return; }
    if (warned === line.length) return; warned = line.length;
    const left = N - line.length, inL = new Set(line);
    say(left + (left === 1 ? ' square is' : ' squares are') + ' still empty. Go back and cover ' + (left === 1 ? 'it' : 'them') + ' before ' + B.last + '.', 5000);
    cells.forEach((c, i) => { if (!inL.has(i)) { c.classList.remove('miss'); void c.offsetWidth; c.classList.add('miss'); } });
  }
  function check() {
    early();
    if (done || line.length !== N) return;
    if (!G.checkPath(n, B.clues, B.last, line)) return;
    done = true; const t = Math.round(clock.stop());
    const r = LEVELS ? P.levelRecord('path', L, t) : P.record('path', KEY, { t });
    board.classList.add('win'); P.burst(board.parentNode); finish(r, true);
  }
  function finish(r, fresh) {
    draw();
    $('done').classList.add('on');
    set('dtime', P.fmt(r.t));
    if (LEVELS) {
      set('dline', (fresh ? 'Level ' + L + ' solved! ' : 'You solved level ' + L + '. ') + 'Next: level ' + (L + 1) + ', ' + G.levelSize(L + 1) + ' × ' + G.levelSize(L + 1) + '.');
      $('lnext').disabled = false; set('pdate', 'Solved ' + P.levelsDone('path') + ' levels');
    } else {
      const s = P.streak(); set('dline', (fresh ? 'Solved! ' : 'You solved today\'s path. ') + 'Streak: ' + s + (s === 1 ? ' day' : ' days') + '. A new board comes at midnight.');
    }
    stats(); P.prepare(shareData());
  }
  const shareData = () => {
    if (LEVELS) { const r = P.levelResult('path', L); return { title: 'Path puzzle · level ' + L, line: '✅ ' + P.fmt(r.t) + ' · ' + n + '×' + n, big: P.fmt(r.t), lines: ['Level ' + L + ' · ' + n + ' × ' + n + ' board', 'Solved ' + P.levelsDone('path') + ' levels'], date: P.niceDate(KEY), file: 'dilia-path-level-' + L }; }
    const r = P.result('path', KEY), s = P.streak();
    return { title: 'Daily path #' + B.no, line: '✅ ' + P.fmt(r.t) + ' · ' + n + '×' + n + ' · 🔥 ' + s, big: P.fmt(r.t), lines: [n + ' × ' + n + ' board · solved', 'Streak: ' + s + (s === 1 ? ' day' : ' days')], date: P.niceDate(KEY), file: 'dilia-daily-path-' + B.no };
  };
  $('share').addEventListener('click', () => P.share(shareData(), say));
  $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  function stats() {
    if (LEVELS) { set('streak', P.levelsDone('path')); const b = P.levelBest('path', n); set('sbest', b ? P.fmt(b) : '–'); set('sbestn', n + ' × ' + n); return; }
    const st = P.stats('path'); set('streak', P.streak()); set('sbest', st.best ? P.fmt(st.best) : '–'); set('ssolved', st.solved);
  }

  if (LEVELS) {
    const go = l => { open(Math.max(1, Math.min(l, P.levelTop('path')))); board.focus({ preventScroll: true }); };
    $('lprev').addEventListener('click', () => go(L - 1));
    $('lnext').addEventListener('click', () => go(L + 1));
    $('dnext').addEventListener('click', () => go(L + 1));
    const h = parseInt(location.hash.slice(1), 10);
    open(h >= 1 && h <= P.levelTop('path') ? h : P.levelTop('path'));
  } else open();
  window.DiliaPathBoard = () => B; // used by the page test
}
