// Daily path: draw one line from 1 through every square, passing the numbers in order. Same board worldwide.
{
  const G = DiliaPlayGen, P = DiliaPlay, $ = id => document.getElementById(id);
  const KEY = P.today(), GAME = 'path';
  const B = G.makePath(KEY), n = B.n, N = n * n;
  const board = $('board'), msg = $('msg');
  const say = t => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, 2600); };

  $('pno').textContent = '#' + B.no; $('psize').textContent = n + ' × ' + n;
  $('pdate').textContent = P.niceDate(KEY);
  board.style.gridTemplateColumns = 'repeat(' + n + ',1fr)';

  const cells = [];
  for (let i = 0; i < N; i++) {
    const c = document.createElement('div'); c.className = 'pcell'; c.dataset.i = i;
    if (B.clues[i]) { const b = document.createElement('b'); b.textContent = B.clues[i]; c.append(b); c.setAttribute('aria-label', 'number ' + B.clues[i]); }
    board.append(c); cells.push(c);
  }
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'line'); svg.setAttribute('viewBox', '0 0 ' + n + ' ' + n); svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = '<defs><linearGradient id="pg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + n + '" y2="' + n + '"><stop offset="0" stop-color="#e5007d"/><stop offset=".55" stop-color="#a08bff"/><stop offset="1" stop-color="#3fc3ff"/></linearGradient></defs>';
  const pl = document.createElementNS(NS, 'polyline');
  pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', 'url(#pg)'); pl.setAttribute('stroke-width', '0.36'); pl.setAttribute('stroke-linecap', 'round'); pl.setAttribute('stroke-linejoin', 'round');
  pl.setAttribute('vector-effect', 'none'); svg.append(pl); board.append(svg);

  const adj = (a, b) => Math.abs(((a / n) | 0) - ((b / n) | 0)) + Math.abs((a % n) - (b % n)) === 1;
  let line = [], done = false;
  const saved = P.result(GAME, KEY), state = P.load(GAME, KEY);
  const clock = P.timer(t => { $('ptime').textContent = P.fmt(t); }, state ? state.t : 0);
  if (state && Array.isArray(state.line) && valid(state.line)) line = state.line;

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
    $('pfill').textContent = line.length + ' / ' + N;
    $('undo').disabled = $('reset').disabled = !line.length || done;
    if (!done && line.length) P.save(GAME, KEY, { line, t: clock.get() });
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

  let drag = false;
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

  function check() {
    if (done || line.length !== N) return;
    if (!G.checkPath(n, B.clues, B.last, line)) return;
    done = true; const t = clock.stop();
    const r = P.record(GAME, KEY, { t: Math.round(t) });
    board.classList.add('win'); P.burst(board.parentNode); finish(r, true);
  }
  function finish(r, fresh) {
    draw();
    $('done').classList.add('on');
    $('dtime').textContent = P.fmt(r.t);
    const s = P.streak(); $('dline').textContent = (fresh ? 'Solved! ' : 'You solved today\'s path. ') + 'Streak: ' + s + (s === 1 ? ' day' : ' days') + '. A new board comes at midnight.';
    $('streak').textContent = s; stats();
    P.prepare(shareData());
  }
  const shareData = () => { const r = P.result(GAME, KEY), s = P.streak(); return { title: 'Daily path #' + B.no, line: '✅ ' + P.fmt(r.t) + ' · ' + n + '×' + n + ' · 🔥 ' + s, big: P.fmt(r.t), lines: [n + ' × ' + n + ' board · solved', 'Streak: ' + s + (s === 1 ? ' day' : ' days')], date: P.niceDate(KEY), file: 'dilia-daily-path-' + B.no }; };
  $('share').addEventListener('click', () => P.share(shareData(), say));
  $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  function stats() { const st = P.stats(GAME); $('streak').textContent = P.streak(); $('sbest').textContent = st.best ? P.fmt(st.best) : '–'; $('ssolved').textContent = st.solved; }

  stats();
  if (saved) {               // already solved today: show the finished board
    line = B.path.slice(); done = true; $('ptime').textContent = P.fmt(saved.t); finish(saved, false);
  } else {
    draw(); $('ptime').textContent = P.fmt(clock.get());
    if (line.length) { clock.start(); say('Welcome back. Your line is where you left it.'); }
  }
  window.DiliaPathBoard = B; // used by the page test
}
