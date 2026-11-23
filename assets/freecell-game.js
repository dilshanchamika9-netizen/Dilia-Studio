// FreeCell: 8 columns, 4 free cells, 4 home piles. Classic deal numbers, every deal can be won. Drag, or tap a card to move it.
{
  const C = DiliaCards, K = DiliaCardKit, $ = id => document.getElementById(id);
  const board = $('fc'), suit = C.suit, rank = C.rank;
  const els = K.cards(board), slots = {};
  for (let i = 0; i < 4; i++) slots['f' + i] = K.slot(board, 'f' + i, 'cell');
  for (let s = 0; s < 4; s++) slots['h' + s] = K.slot(board, 'h' + s, 'fnd', ['♠', '♥', '♦', '♣'][s]);
  for (let i = 0; i < 8; i++) slots['c' + i] = K.slot(board, 'c' + i, 'tab');
  let geo = {}, drag = null;

  const g = K.game({
    id: 'freecell', name: 'FreeCell', board,
    deal() { return C.fcDeal(C.fcNumber(K.rand() / 4294967296)); },
    copy: C.fcCopy, won: C.fcWon,
    lines: S => ['Deal #' + S.no],
    valid: st => {
      const S = st.S; if (!S || !Array.isArray(S.col) || S.col.length !== 8 || !Array.isArray(S.cell) || S.cell.length !== 4 || !Array.isArray(S.fnd) || S.fnd.length !== 4) return false;
      const all = []; for (const p of S.col) { if (!Array.isArray(p)) return false; all.push(...p); }
      all.push(...S.cell.filter(c => c >= 0));
      for (let s = 0; s < 4; s++) { if (!Number.isInteger(S.fnd[s]) || S.fnd[s] < 0 || S.fnd[s] > 13) return false; for (let r = 1; r <= S.fnd[s]; r++) all.push(s * 13 + r - 1); }
      return all.length === 52 && all.every(c => Number.isInteger(c) && c >= 0 && c < 52) && new Set(all).size === 52;
    },
    render
  });
  function measure() {
    const W = board.clientWidth, gap = Math.max(3, Math.min(12, W * 0.016)), cw = (W - gap * 7) / 8, ch = cw * 1.4;
    geo = { W, gap, cw, ch, x: i => i * (cw + gap), tabY: ch + gap * 2.4 };
    board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--ch', ch + 'px');
  }
  function render(S) {
    measure(); const { cw, ch, x, tabY } = geo;
    for (let i = 0; i < 4; i++) K.place(slots['f' + i], x(i), 0, 0);
    for (let s = 0; s < 4; s++) K.place(slots['h' + s], x(4 + s), 0, 0);
    S.cell.forEach((c, i) => { if (c >= 0) { const e = els[c]; e.classList.remove('back'); e.classList.add('top'); K.place(e, x(i), 0, 100 + i); } });
    for (let s = 0; s < 4; s++) for (let r = 1; r <= S.fnd[s]; r++) { const e = els[s * 13 + r - 1]; e.classList.remove('back'); e.classList.toggle('top', r === S.fnd[s]); K.place(e, x(4 + s), 0, 200 + r); }
    const room = Math.max(ch * 3, innerHeight - board.getBoundingClientRect().top - tabY - 40);
    let maxY = tabY + ch;
    S.col.forEach((p, t) => {
      K.place(slots['c' + t], x(t), tabY, 0);
      let dy = ch * 0.27; const need = Math.max(0, p.length - 1) * dy;
      if (need > room - ch) dy = Math.max(ch * 0.14, (room - ch) / Math.max(1, p.length - 1));
      p.forEach((c, i) => { const e = els[c]; e.classList.remove('back'); e.classList.toggle('top', i === p.length - 1); K.place(e, x(t), tabY + i * dy, 300 + t * 30 + i); });
      maxY = Math.max(maxY, tabY + Math.max(0, p.length - 1) * dy + ch);
    });
    board.style.height = Math.ceil(maxY + 4) + 'px';
    const h = C.fcHomeRun(S); $('finish').hidden = g.done || g.locked || !h.won || !h.moves.length;
    $('fcno').textContent = '#' + S.no;
  }
  // where is card c? { a:'c', i, k } column i, index k | { a:'f', i } | null (home piles are not movable)
  function where(c) {
    const S = g.S;
    for (let i = 0; i < 8; i++) { const k = S.col[i].indexOf(c); if (k >= 0) return { a: 'c', i, k, n: S.col[i].length - k }; }
    const f = S.cell.indexOf(c); if (f >= 0) return { a: 'f', i: f, n: 1 };
    return null;
  }
  function tryMove(w, b, j) { const m = { a: w.a, i: w.i, n: w.n, b, j: j || 0 }; if (!C.fcLegal(g.S, m)) return false; g.commit(C.fcApply(g.S, m)); return true; }
  function autoMove(c) {
    const S = g.S, w = where(c); if (!w) return;
    if (w.a === 'c' && !C.fcRun(S.col[w.i], w.n)) { g.say('Only a run in order can move together.'); K.shake(els[c]); return; }
    if (w.n === 1 && tryMove(w, 'h')) return;
    for (let j = 0; j < 8; j++) if (S.col[j].length && j !== w.i && tryMove(w, 'c', j)) return;
    if (w.n === 1 && w.a === 'c') { const f = S.cell.indexOf(-1); if (f >= 0 && tryMove(w, 'f', f)) return; }
    for (let j = 0; j < 8; j++) if (!S.col[j].length && !(w.a === 'c' && w.n === S.col[w.i].length) && tryMove(w, 'c', j)) return;
    if (w.n > 1) g.say('Not enough free cells or empty columns to move ' + w.n + ' cards.');
    K.shake(els[c]);
  }
  board.addEventListener('pointerdown', e => {
    if (g.done || g.locked || e.button > 0) return;
    const ce = e.target.closest('.kc'); if (!ce) return;
    const c = +ce.dataset.c, w = where(c); if (!w) return;
    const S = g.S, run = w.a === 'c' ? S.col[w.i].slice(w.k) : [c];
    drag = { c, w, run, x0: e.clientX, y0: e.clientY, on: false, base: run.map(k => K.pos(els[k])) };
    board.setPointerCapture(e.pointerId);
  });
  board.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.on) { if (Math.hypot(dx, dy) < 7) return; if (drag.w.a === 'c' && !C.fcRun(g.S.col[drag.w.i], drag.w.n)) return; drag.on = true; }
    drag.run.forEach((k, j) => { const e2 = els[k]; e2.classList.add('drag'); e2.style.transform = 'translate(' + (drag.base[j][0] + dx) + 'px,' + (drag.base[j][1] + dy) + 'px)'; e2.style.zIndex = 900 + j; });
  });
  board.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null;
    d.run.forEach(k => els[k].classList.remove('drag'));
    if (!d.on) { autoMove(d.c); return; }
    const r = board.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, top = py < geo.tabY - geo.gap * 0.5;
    const cx = top ? px : d.base[0][0] + (e.clientX - d.x0) + geo.cw / 2, col = Math.max(0, Math.min(7, Math.floor(cx / (geo.cw + geo.gap))));
    let ok = false;
    if (top) ok = d.w.n === 1 && (col < 4 ? tryMove(d.w, 'f', col) : tryMove(d.w, 'h'));
    else if (!(d.w.a === 'c' && d.w.i === col)) ok = tryMove(d.w, 'c', col);
    if (!ok) { if (!top && d.w.n > 1 && !(d.w.a === 'c' && d.w.i === col)) g.say('Not enough free cells or empty columns to move ' + d.w.n + ' cards.'); g.paint(); }
  });
  board.addEventListener('pointercancel', () => { if (drag) { drag.run.forEach(k => els[k].classList.remove('drag')); drag = null; g.paint(); } });
  $('finish').addEventListener('click', () => {
    if (g.done || g.locked) return; const h = C.fcHomeRun(g.S); let s = g.S, i = 0; g.lock(true);
    const id = setInterval(() => { if (i >= h.moves.length) { clearInterval(id); g.lock(false); return; } s = C.fcApply(s, h.moves[i++]); g.step(s); }, 60);
  });
  g.begin();
  window.DiliaFreeCell = { state: g.state, move: m => { if (!C.fcLegal(g.S, m)) return false; g.commit(C.fcApply(g.S, m)); return true; }, autoMove, set: S => { g.start(S); } };
}
