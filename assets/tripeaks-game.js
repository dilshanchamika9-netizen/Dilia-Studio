// TriPeaks: clear three peaks. Play a free card one rank above or below the waste card (King and Ace count as neighbours).
{
  const C = DiliaCards, K = DiliaCardKit, $ = id => document.getElementById(id);
  const board = $('tpk'), els = K.cards(board);
  const stockSlot = K.slot(board, 'stock', 'stock', '↻'), wasteSlot = K.slot(board, 'waste', 'waste');
  let geo = {};
  const rd = K.rd, wr = K.wr, WK = 'dilia-tripeaks-winnable';

  const g = K.game({
    id: 'tripeaks', name: 'TriPeaks', board,
    deal() {
      const seed = 'tp:' + K.rand(), win = rd(WK, true);
      return (win && C.tpWinnable(seed, 200000, 80)) || C.tpDeal(seed);
    },
    copy: C.tpCopy, won: C.tpWon,
    lines: () => ['Three peaks cleared'],
    valid: st => {
      const S = st.S; if (!S || !Array.isArray(S.pk) || S.pk.length !== 28 || !Array.isArray(S.stock) || !Array.isArray(S.waste) || !S.waste.length) return false;
      const all = [...S.pk.filter(c => c >= 0), ...S.stock, ...S.waste];
      return all.every(c => Number.isInteger(c) && c >= 0 && c < 52) && new Set(all).size === all.length;
    },
    after: S => { if (C.tpStuck(S)) g.say('No more moves. Undo, or start a new deal.', 0); },
    render
  });
  function measure() {
    const W = board.clientWidth, cw = W / 10.6, ch = cw * 1.4, u = (W - cw) / 9, dy = ch * 0.5;
    geo = { W, cw, ch, u, dy, bottom: 3 * dy + ch + Math.max(10, cw * 0.3) };
    board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--ch', ch + 'px');
  }
  function render(S) {
    measure(); const { cw, ch, u, dy, bottom, W } = geo;
    const sx = W / 2 - cw - Math.max(6, cw * 0.15), wx = W / 2 + Math.max(6, cw * 0.15);
    K.place(stockSlot, sx, bottom, 0); K.place(wasteSlot, wx, bottom, 0);
    stockSlot.classList.toggle('none', !S.stock.length); stockSlot.classList.remove('empty');
    const live = new Set();
    S.stock.forEach((c, i) => { live.add(c); const e = els[c]; e.hidden = false; e.classList.add('back'); e.classList.remove('top', 'lock'); K.place(e, sx - Math.min(i, 5) * 0.4, bottom - Math.min(i, 5) * 0.4, 10 + i); });
    S.waste.forEach((c, i) => { live.add(c); const e = els[c]; e.hidden = false; e.classList.remove('back', 'lock'); e.classList.toggle('top', i === S.waste.length - 1); K.place(e, wx, bottom, 100 + i); });
    S.pk.forEach((c, i) => {
      if (c < 0) return; live.add(c); const e = els[c], free = C.tpFree(S, i); e.hidden = false;
      e.classList.toggle('back', !free); e.classList.toggle('top', free); e.classList.remove('lock');
      K.place(e, C.TP_X[i] * u, C.TP_ROW[i] * dy, 300 + C.TP_ROW[i] * 10 + i);
    });
    els.forEach((e, c) => { if (!live.has(c)) e.hidden = true; });
    board.style.height = Math.ceil(bottom + ch + 4) + 'px';
    $('tpleft').textContent = S.pk.filter(c => c >= 0).length; $('tpstock').textContent = S.stock.length;
  }
  function tap(c) {
    const S = g.S;
    if (S.stock.includes(c)) { if (C.tpLegal(S, { t: 'draw' })) g.commit(C.tpApply(S, { t: 'draw' })); return; }
    const i = S.pk.indexOf(c); if (i < 0) return;
    const m = { t: 'play', i };
    if (C.tpLegal(S, m)) g.commit(C.tpApply(S, m)); else { K.shake(els[c]); g.say(C.tpFree(S, i) ? 'That card is not next to the open card.' : 'That card is covered.', 1500); }
  }
  board.addEventListener('click', e => {
    if (g.done || g.locked) return;
    if (e.target.closest('.ks.stock')) { if (C.tpLegal(g.S, { t: 'draw' })) g.commit(C.tpApply(g.S, { t: 'draw' })); return; }
    const ce = e.target.closest('.kc'); if (ce) tap(+ce.dataset.c);
  });
  addEventListener('keydown', e => { const t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t.closest && t.closest('header, [role=dialog]')))) return; if (!e.ctrlKey && !e.metaKey && (e.key === 'd' || e.key === 'D') && !g.done && !g.locked && C.tpLegal(g.S, { t: 'draw' })) { e.preventDefault(); g.commit(C.tpApply(g.S, { t: 'draw' })); } });
  const wb = $('winnable'), sync = () => wb.setAttribute('aria-pressed', rd(WK, true) ? 'true' : 'false');
  wb.addEventListener('click', () => { wr(WK, !rd(WK, true)); sync(); g.fresh(); g.say(rd(WK, true) ? 'Winnable deals: every deal can be cleared.' : 'Random deals: some cannot be cleared.'); });
  sync(); g.begin();
  window.DiliaTriPeaks = { state: g.state, move: m => { if (!C.tpLegal(g.S, m)) return false; g.commit(C.tpApply(g.S, m)); return true; }, tap, set: S => { g.start(S); } };
}
