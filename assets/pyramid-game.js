// Pyramid: take away pairs of free cards that add up to 13, and any free King. The deck turns one card at a time, as many passes as you like.
{
  const C = DiliaCards, K = DiliaCardKit, $ = id => document.getElementById(id), rank = C.rank;
  const board = $('pyr'), els = K.cards(board), WASTE = C.PY_WASTE;
  const stockSlot = K.slot(board, 'stock', 'stock', '↻'), wasteSlot = K.slot(board, 'waste', 'waste');
  let geo = {}, sel = null;
  const rd = K.rd, wr = K.wr, WK = 'dilia-pyramid-winnable';

  const g = K.game({
    id: 'pyramid', name: 'Pyramid', board,
    deal() {
      const seed = 'pyr:' + K.rand(), win = rd(WK, true);
      return (win && C.pyWinnable(seed, 70000, 30)) || C.pyDeal(seed);
    },
    copy: C.pyCopy, won: C.pyWon,
    lines: () => ['Pairs that add up to 13'],
    valid: st => {
      const S = st.S; if (!S || !Array.isArray(S.pyr) || S.pyr.length !== 28 || !Array.isArray(S.stock) || !Array.isArray(S.waste)) return false;
      const all = [...S.pyr.filter(c => c >= 0), ...S.stock, ...S.waste];
      return all.every(c => Number.isInteger(c) && c >= 0 && c < 52) && new Set(all).size === all.length && all.length <= 52;
    },
    render, undone: () => { sel = null; }
  });
  function measure() {
    const W = board.clientWidth, cw = W / 7.5, ch = cw * 1.4, u = (W - cw) / 6, dy = ch * 0.46;
    geo = { W, cw, ch, u, dy, bottom: 6 * dy + ch + Math.max(8, cw * 0.2) };
    board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--ch', ch + 'px');
  }
  function render(S) {
    measure(); const { cw, ch, u, dy, bottom } = geo;
    K.place(stockSlot, 0, bottom, 0); K.place(wasteSlot, u, bottom, 0);
    stockSlot.classList.toggle('empty', !S.stock.length); stockSlot.classList.toggle('none', !S.stock.length && !S.waste.length);
    const live = new Set();
    S.stock.forEach((c, i) => { live.add(c); const e = els[c]; e.hidden = false; e.classList.add('back'); e.classList.remove('top', 'sel', 'lock'); K.place(e, 0 - Math.min(i, 5) * 0.4, bottom - Math.min(i, 5) * 0.4, 10 + i); });
    S.waste.forEach((c, i) => { live.add(c); const e = els[c]; e.hidden = false; e.classList.remove('back', 'lock'); e.classList.toggle('top', i === S.waste.length - 1); e.classList.toggle('sel', sel === WASTE && i === S.waste.length - 1); K.place(e, u, bottom, 100 + i); });
    S.pyr.forEach((c, i) => {
      if (c < 0) return; live.add(c); const e = els[c]; e.hidden = false; e.classList.remove('back');
      let r = 0; while ((r + 1) * (r + 2) / 2 <= i) r++;
      const k = i - r * (r + 1) / 2, free = C.pyFree(S, i);
      e.classList.toggle('lock', !free); e.classList.toggle('sel', sel === i); e.classList.toggle('top', free);
      K.place(e, (6 - r) / 2 * u + k * u, r * dy, 300 + r * 10 + k);
    });
    els.forEach((e, c) => { if (!live.has(c)) { e.hidden = true; e.classList.remove('sel'); } });
    board.style.height = Math.ceil(bottom + ch + 4) + 'px';
  }
  function cardIdx(c) { const S = g.S; const i = S.pyr.indexOf(c); if (i >= 0) return i; if (S.waste.length && S.waste[S.waste.length - 1] === c) return WASTE; return -1; }
  function take(m) { sel = null; if (C.pyLegal(g.S, m)) { g.commit(C.pyApply(g.S, m)); return true; } return false; }
  function tap(c) {
    const S = g.S;
    if (S.stock.includes(c)) { sel = null; take({ t: 'draw' }); return; }
    const a = cardIdx(c); if (a < 0 || C.pyCard(S, a) < 0) { K.shake(els[c]); g.say(S.pyr.includes(c) ? 'That card is covered.' : ''); return; }
    if (rank(c) === 13) { if (!take({ t: 'rem', a, b: -1 })) K.shake(els[c]); return; }
    if (sel === null) { sel = a; g.paint(); return; }
    if (sel === a) { sel = null; g.paint(); return; }
    const m = { t: 'rem', a: Math.min(sel, a), b: Math.max(sel, a) };
    if (C.pyLegal(S, m)) { take(m); return; }
    sel = a; g.say('Those two do not add up to 13.', 1600); g.paint();
  }
  board.addEventListener('click', e => {
    if (g.done || g.locked) return;
    if (e.target.closest('.ks.stock')) { sel = null; take({ t: 'draw' }); return; }
    const ce = e.target.closest('.kc'); if (ce) tap(+ce.dataset.c);
  });
  const wb = $('winnable'), sync = () => wb.setAttribute('aria-pressed', rd(WK, true) ? 'true' : 'false');
  wb.addEventListener('click', () => { wr(WK, !rd(WK, true)); sync(); g.fresh(); g.say(rd(WK, true) ? 'Winnable deals: every deal can be cleared.' : 'Random deals: some cannot be cleared.'); });
  $('newgame').addEventListener('click', () => { sel = null; }); $('dagain').addEventListener('click', () => { sel = null; });
  sync(); g.begin();
  window.DiliaPyramid = { state: g.state, move: m => { sel = null; return take(m); }, tap, set: S => { sel = null; g.start(S); }, sel: () => sel };
}
