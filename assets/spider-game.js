// Spider solitaire: build down in rank, move runs of one suit, take off full King-to-Ace runs. 1, 2 or 4 suits.
{
  const C = DiliaCards, K = DiliaCardKit, $ = id => document.getElementById(id);
  const SUITS = [1, 2, 4].includes(+K.rd('dilia-spider-suits', 1)) ? +K.rd('dilia-spider-suits', 1) : 1;
  const board = $('spd'), suitOf = c => (SUITS === 1 ? 0 : (((c / 13) | 0) % SUITS)), rank = C.spRank;
  const els = K.cards(board, 104, suitOf), slots = {};
  slots.stock = K.slot(board, 'stock', 'stock', '↻');
  for (let i = 0; i < 8; i++) slots['h' + i] = K.slot(board, 'h' + i, 'fnd', '');
  for (let i = 0; i < 10; i++) slots['t' + i] = K.slot(board, 't' + i, 'tab');
  let geo = {}, drag = null;
  const g = K.game({
    id: 'spider' + SUITS, name: 'Spider · ' + SUITS + (SUITS === 1 ? ' suit' : ' suits'), board,
    deal() { return C.spDeal('spd:' + K.rand(), SUITS); },
    copy: C.spCopy, won: C.spWon,
    lines: S => [SUITS + (SUITS === 1 ? ' suit' : ' suits') + ' · 8 runs taken off'],
    valid: st => {
      const S = st.S; if (!S || S.suits !== SUITS || !Array.isArray(S.tab) || S.tab.length !== 10 || !Array.isArray(S.stock) || !Array.isArray(S.home)) return false;
      const all = []; for (const p of S.tab) { if (!Array.isArray(p)) return false; for (const x of p) { if (!x || typeof x.up !== 'boolean') return false; all.push(x.c); } }
      all.push(...S.stock); for (const h of S.home) { if (!Array.isArray(h)) return false; all.push(...h); }
      return all.length === 104 && all.every(c => Number.isInteger(c) && c >= 0 && c < 104) && new Set(all).size === 104;
    },
    render
  });
  function measure() {
    const W = board.clientWidth, gap = Math.max(2, Math.min(10, W * 0.012)), cw = (W - gap * 9) / 10, ch = cw * 1.4;
    geo = { W, gap, cw, ch, x: i => i * (cw + gap), tabY: ch + gap * 2.2 };
    board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--ch', ch + 'px');
  }
  function render(S) {
    measure(); const { ch, x, tabY } = geo;
    K.place(slots.stock, x(0), 0, 0); slots.stock.classList.toggle('none', S.stock.length < 10);
    for (let i = 0; i < 8; i++) K.place(slots['h' + i], x(2 + i), 0, 0);
    S.stock.forEach((c, i) => { const e = els[c]; e.classList.add('back'); e.classList.remove('top'); K.place(e, x(0) - Math.min(i / 10, 4) * 0.5, -Math.min(i / 10, 4) * 0.5, 10 + i); });
    S.home.forEach((h, k) => h.forEach((c, i) => { const e = els[c]; e.classList.remove('back'); e.classList.toggle('top', i === 12); K.place(e, x(2 + k), 0, 200 + i); }));
    const room = Math.max(ch * 3, innerHeight - board.getBoundingClientRect().top - tabY - 40); let maxY = tabY + ch;
    S.tab.forEach((p, t) => {
      K.place(slots['t' + t], x(t), tabY, 0);
      const down = p.filter(q => !q.up).length, up = p.length - down;
      let dy = ch * 0.1, uy = ch * 0.27; const need = down * dy + Math.max(0, up - 1) * uy;
      if (need > room - ch) uy = Math.max(ch * 0.13, (room - ch - down * dy) / Math.max(1, up - 1));
      let y = tabY;
      p.forEach((q, i) => { const e = els[q.c]; e.classList.toggle('back', !q.up); e.classList.toggle('top', i === p.length - 1); K.place(e, x(t), y, 300 + t * 40 + i); y += q.up ? uy : dy; });
      maxY = Math.max(maxY, y - (p.length ? (p[p.length - 1].up ? uy : dy) : 0) + ch);
    });
    board.style.height = Math.ceil(maxY + 4) + 'px';
    $('spdone').textContent = S.home.length; $('spleft').textContent = Math.floor(S.stock.length / 10);
  }
  function where(c) { const S = g.S; for (let i = 0; i < 10; i++) { const k = S.tab[i].findIndex(q => q.c === c); if (k >= 0) return S.tab[i][k].up ? { col: i, i: k } : null; } return null; }
  function mv(w, to) { const m = { t: 'mv', from: w.col, i: w.i, to }; if (!C.spLegal(g.S, m)) return false; g.commit(C.spApply(g.S, m)); return true; }
  function dealRow() {
    const S = g.S; if (S.stock.length < 10) return;
    if (S.tab.some(p => !p.length)) { g.say('Fill every empty column before dealing.'); return; }
    g.commit(C.spApply(S, { t: 'deal' }));
  }
  function autoMove(c) {
    const S = g.S, w = where(c); if (!w) { K.shake(els[c]); return; }
    if (!C.spRunOk(S, S.tab[w.col], w.i)) { g.say('Only a run of one suit moves together.'); K.shake(els[c]); return; }
    const run0 = S.tab[w.col][w.i]; let best = -1, bs = -1;
    for (let t = 0; t < 10; t++) {
      if (t === w.col || !C.spLegal(S, { t: 'mv', from: w.col, i: w.i, to: t })) continue;
      const d = S.tab[t]; if (!d.length) { if (w.i === 0) continue; if (bs < 0) { best = t; bs = 0; } continue; }
      const sc = (suitOf(d[d.length - 1].c) === suitOf(run0.c) ? 10 : 5) + d.length * 0.01;
      if (sc > bs) { bs = sc; best = t; }
    }
    if (best >= 0) mv(w, best); else K.shake(els[c]);
  }
  board.addEventListener('pointerdown', e => {
    if (g.done || g.locked || e.button > 0) return;
    const sl = e.target.closest('.ks.stock'), ce = e.target.closest('.kc');
    if (sl || (ce && g.S.stock.includes(+ce.dataset.c))) { dealRow(); return; }
    if (!ce) return; const c = +ce.dataset.c, w = where(c); if (!w) return;
    const run = g.S.tab[w.col].slice(w.i).map(q => q.c);
    drag = { c, w, run, x0: e.clientX, y0: e.clientY, on: false, base: run.map(k => K.pos(els[k])) };
    board.setPointerCapture(e.pointerId);
  });
  board.addEventListener('pointermove', e => {
    if (!drag) return; const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.on) { if (Math.hypot(dx, dy) < 7) return; if (!C.spRunOk(g.S, g.S.tab[drag.w.col], drag.w.i)) return; drag.on = true; }
    drag.run.forEach((k, j) => { const e2 = els[k]; e2.classList.add('drag'); e2.style.transform = 'translate(' + (drag.base[j][0] + dx) + 'px,' + (drag.base[j][1] + dy) + 'px)'; e2.style.zIndex = 900 + j; });
  });
  board.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null; d.run.forEach(k => els[k].classList.remove('drag'));
    if (!d.on) { autoMove(d.c); return; }
    const cx = d.base[0][0] + (e.clientX - d.x0) + geo.cw / 2, col = Math.max(0, Math.min(9, Math.floor(cx / (geo.cw + geo.gap))));
    if (col === d.w.col || !mv(d.w, col)) g.paint();
  });
  board.addEventListener('pointercancel', () => { if (drag) { drag.run.forEach(k => els[k].classList.remove('drag')); drag = null; g.paint(); } });
  addEventListener('keydown', e => { const t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t.closest && t.closest('header, [role=dialog]')))) return; if (!e.ctrlKey && !e.metaKey && (e.key === 'd' || e.key === 'D') && !g.done && !g.locked) { e.preventDefault(); dealRow(); } });
  const btns = document.querySelectorAll('.sdraw button');
  btns.forEach(b => { b.setAttribute('aria-pressed', +b.dataset.d === SUITS ? 'true' : 'false'); b.addEventListener('click', () => { if (+b.dataset.d === SUITS) return; K.wr('dilia-spider-suits', +b.dataset.d); location.reload(); }); });
  g.begin();
  window.DiliaSpider = { state: g.state, suits: SUITS, move: m => { if (!C.spLegal(g.S, m)) return false; g.commit(C.spApply(g.S, m)); return true; }, deal: dealRow, set: S => { g.start(S); } };
}
