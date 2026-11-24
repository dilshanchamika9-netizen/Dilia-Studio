// Daily chess puzzle: find the one move that forces checkmate on your next move. Rules come from chess-core.js.
{
  const M = Mini, $ = M.$, C = DiliaChess, P = DiliaPlay, G = DiliaPlayGen, DATA = DiliaChessPuzzles, board = $('cpb');
  const GL = { 1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' }, idx = (r, f) => r * 16 + f;
  const key = P.today(), no = G.dayNo(key);
  const sqEls = []; for (let i = 0; i < 64; i++) { const e = document.createElement('div'); e.className = 'sq'; e.append(document.createElement('span')); board.append(e); sqEls.push(e); }
  let busy = false, pos, sol, flip = false, sel = null, tries = 0, phase = 'first', over = false, mode = 'daily', pi = 0, hinted = false, st = M.rd('dilia-cpuz-stats', { solved: 0, streak: 0, best: 0, last: '' });
  const panel = M.panel('cpuz', 'Daily chess puzzle', () => start('practice'));
  const viewSq = i => { let r = 7 - (i >> 3), f = i & 7; if (flip) { r = 7 - r; f = 7 - f; } return idx(r, f); };
  const mates = p => { for (const m of p.legal()) { p.make(m); const x = p.status() === 'checkmate'; p.unmake(); if (x) return true; } return false; };
  // true when move m (made on p) leaves a position where every reply allows mate in one
  function forcesMate(p, m) { p.make(m); let ok = p.status() !== 'checkmate' && p.status() !== 'stalemate' && p.legal().length > 0; if (ok) for (const r of p.legal()) { p.make(r); const h = mates(p); p.unmake(); if (!h) { ok = false; break; } } p.unmake(); return ok; }
  function start(m) {
    mode = m; over = false; sel = null; tries = 0; phase = 'first'; hinted = false; panel.hide();
    pi = m === 'daily' ? (no - 1) % DATA.length : Math.floor(M.rnd() * DATA.length); const [fen, u] = DATA[pi];
    pos = new C.Pos(fen); sol = u; flip = pos.side === 1;
    $('cpt').textContent = m === 'daily' ? 'Daily chess puzzle #' + no : 'Practice puzzle'; $('cpwho').textContent = (pos.side === 0 ? 'White' : 'Black') + ' to move: mate in two'; render();
    M.say(m === 'daily' ? 'Find the move that forces checkmate next move.' : 'Practice puzzle. It does not count for your streak.', 3500);
  }
  function render() {
    const dests = {}; if (sel !== null && !over) for (const m of pos.legal()) if (C.mFrom(m) === sel) dests[C.mTo(m)] = 1;
    for (let i = 0; i < 64; i++) { const s = viewSq(i), e = sqEls[i], p = pos.b[s], sp = e.firstChild, light = ((s >> 4) + (s & 7)) % 2 === 1;
      e.className = 'sq ' + (light ? 'lt' : 'dk') + (s === sel ? ' sel' : '') + (dests[s] ? (p ? ' cap' : ' dot') : '') + (hinted && phase === 'first' && s === C.nameSq(sol.slice(0, 2)) ? ' sel' : '');
      sp.textContent = p ? GL[p & 7] + '︎' : ''; sp.className = p ? ((p & 8) ? 'pb' : 'pw') : ''; e.dataset.s = s; e.setAttribute('aria-label', C.sqName(s) + (p ? ' ' + ((p & 8) ? 'black' : 'white') + ' piece' : ' empty')); }
    $('cptry').textContent = tries;
  }
  // slide the moved piece from its old square to the new one so every move is seen
  function glide(m) {
    const f = C.mFrom(m), t = C.mTo(m); let a = -1, b = -1; for (let i = 0; i < 64; i++) { const s = viewSq(i); if (s === f) a = i; if (s === t) b = i; }
    if (a < 0 || b < 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sp = sqEls[b].firstChild, A = sqEls[a].getBoundingClientRect(), B = sqEls[b].getBoundingClientRect();
    sp.style.transition = 'none'; sp.style.transform = 'translate(' + (A.left - B.left) + 'px,' + (A.top - B.top) + 'px)'; sp.style.zIndex = 5; sp.getBoundingClientRect();
    sp.style.transition = 'transform .28s ease'; sp.style.transform = 'translate(0,0)'; setTimeout(() => { sp.style.transition = ''; sp.style.transform = ''; sp.style.zIndex = ''; }, 320);
  }
  function tap(s) {
    if (over || busy || phase === 'reply') return; const p = pos.b[s];
    if (sel !== null) { const ms = pos.legal().filter(m => C.mFrom(m) === sel && C.mTo(m) === s); if (ms.length) { const q = ms.find(m => C.mPromo && C.mPromo(m) === 5) || ms[0]; return play(q); } }
    sel = p && ((p & 8) ? 1 : 0) === pos.side ? s : null; render();
  }
  // a wrong move is shown on the board (red square, small shake), then the board goes back
  function showWrong(m, msg) {
    const t = C.mTo(m); pos.make(m); render(); pos.unmake(); glide(m); board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
    for (let i = 0; i < 64; i++) if (viewSq(i) === t) sqEls[i].classList.add('bad');
    busy = true; M.say(msg, 2600);
    setTimeout(() => { busy = false; render(); }, 950);
  }
  function play(m) {
    sel = null;
    if (phase === 'first') {
      if (forcesMate(pos, m)) { pos.make(m); phase = 'reply'; render(); glide(m); M.say('Right idea. Now the opponent replies…', 1500); setTimeout(() => { const r = pos.legal(), rm = r[Math.floor(M.rnd() * r.length)]; pos.make(rm); phase = 'mate'; render(); glide(rm); M.say('Deliver checkmate.', 0); }, 800); }
      else { tries++; $('cptry').textContent = tries; showWrong(m, 'That does not force mate. Try another move.'); }
    } else {
      pos.make(m); if (pos.status() === 'checkmate') { over = true; render(); glide(m); return void setTimeout(solved, 650); }
      pos.unmake(); tries++; $('cptry').textContent = tries; showWrong(m, 'Not mate. Look for the checkmate.');
    }
  }
  function solved() {
    over = true; const clean = tries === 0 && !hinted;
    if (mode === 'daily' && st.last !== key) { const y = P.addDays(key, -1); st.streak = st.last === y ? st.streak + 1 : 1; st.best = Math.max(st.best, st.streak); st.solved++; st.last = key; M.wr('dilia-cpuz-stats', st); }
    $('cpstreak').textContent = st.streak;
    panel.show('Checkmate', tries === 0 ? 'First try' : (tries + 1) + ' tries', mode === 'daily' ? 'Puzzle #' + no + ' solved' + (hinted ? ' with a hint' : '') + '. Streak: ' + st.streak + '.' : 'Practice puzzle solved.', { title: 'Daily chess puzzle #' + no, line: 'Solved chess puzzle #' + no + (clean ? ' on the first try' : ' in ' + (tries + 1) + ' tries'), big: tries === 0 ? 'First try' : (tries + 1) + ' tries', lines: ['Mate in two'] });
    $('dagain').textContent = 'Another puzzle';
  }
  board.addEventListener('click', e => { const q = e.target.closest('.sq'); if (q) tap(+q.dataset.s); });
  $('cphint').addEventListener('click', () => { hinted = true; render(); M.say('The glowing piece makes the key move.', 2500); });
  $('cpshow').addEventListener('click', () => { if (over || phase !== 'first') return; const m = pos.fromUci(sol); sel = null; tries++; pos.make(m); phase = 'reply'; render(); M.say('Solution shown: ' + sol + '. Press New puzzle to try another.', 6000); });
  $('newgame').textContent = 'New puzzle'; $('newgame').addEventListener('click', () => start('practice'));
  $('cpstreak').textContent = st.streak; start('daily');
  window.DiliaChessPuzzle = { state: () => ({ fen: pos.fen(), sol, phase, over, tries, no, side: pos.side, n: DATA.length }), tap, start, solveFirst: () => { play(pos.fromUci(sol)); }, forcesMate: u => forcesMate(pos, pos.fromUci(u)), mateUci: () => { for (const m of pos.legal()) { pos.make(m); const x = pos.status() === 'checkmate'; pos.unmake(); if (x) return pos.uci(m); } return ''; }, wrongUci: () => { for (const m of pos.legal()) if (!forcesMate(pos, m)) return pos.uci(m); return ''; }, tapUci: u => { tap(C.nameSq(u.slice(0, 2))); tap(C.nameSq(u.slice(2, 4))); } };
}
