// Mahjong solitaire (turtle layout): take away pairs of free tiles with the same face. Every deal can be cleared.
{
  const C = DiliaCards, K = DiliaCardKit, $ = id => document.getElementById(id), MJ = C.MJ;
  const board = $('mjb'), msgEl = $('msg');
  const NAME = f => (f < 9 ? 'Dots ' + (f + 1) : f < 18 ? 'Bamboo ' + (f - 8) : f < 27 ? 'Characters ' + (f - 17) : f < 31 ? ['East', 'South', 'West', 'North'][f - 27] + ' wind' : f < 34 ? ['Red', 'Green', 'White'][f - 31] + ' dragon' : f === 34 ? 'Flower' : 'Season');
  const FACE = f => (f < 9 ? [String(f + 1), '●', 'd'] : f < 18 ? [String(f - 8), '▮', 'b'] : f < 27 ? [String(f - 17), '❖', 'c'] : f < 31 ? [['E', 'S', 'W', 'N'][f - 27], '', 'w'] : f < 34 ? [f === 33 ? '◇' : '◆', '', 'r' + (f - 31)] : f === 34 ? ['✿', '', 'fl'] : ['❄', '', 'se']);
  const els = MJ.map(() => { const e = document.createElement('div'); e.className = 'mj'; e.append(document.createElement('b'), document.createElement('i')); board.append(e); return e; });
  let geo = {}, sel = null, hintT = 0;
  const g = K.game({
    id: 'mahjong', name: 'Mahjong', board,
    deal() { return C.mjDeal('mj:' + K.rand()); },
    copy: C.mjCopy, won: C.mjWon, lines: () => ['72 pairs taken off'],
    valid: st => { const S = st.S; if (!S || !Array.isArray(S.face) || S.face.length !== 144) return false; const n = {}; for (const f of S.face) { if (!Number.isInteger(f) || f < -1 || f > 35) return false; if (f >= 0) n[f] = (n[f] || 0) + 1; } return Object.values(n).every(v => v <= 4 && v % 2 === 0); },
    after: stuck, undone: () => { sel = null; stuck(g.S); },
    render
  });
  function stuck(S) {
    const left = S.face.filter(f => f >= 0).length, none = left > 0 && !C.mjMoves(S).length;
    $('shuffle').hidden = !none; if (none) g.say('No more pairs. Shuffle the tiles, or undo.', 0);
  }
  function measure() {
    const W = board.clientWidth, tw = (W - 6) / 15.35, th = tw * 1.3;
    geo = { W, tw, th, ux: tw / 2, uy: th * 0.485, sh: tw * 0.075 };
    board.style.setProperty('--tw', tw + 'px'); board.style.setProperty('--th', th + 'px'); board.style.setProperty('--ch', '0px');
  }
  function render(S) {
    measure(); const { tw, th, ux, uy, sh } = geo; let left = 0;
    MJ.forEach((p, i) => {
      const e = els[i], f = S.face[i]; e.hidden = f < 0; if (f < 0) { e.classList.remove('sel', 'hint'); return; } left++;
      const [big, small, cls] = FACE(f); e.className = 'mj ' + cls; e.firstChild.textContent = big; e.lastChild.textContent = small; e.setAttribute('aria-label', NAME(f));
      const free = C.mjFree(S, i); e.classList.toggle('lock', !free); e.classList.toggle('sel', sel === i);
      e.style.transform = 'translate(' + (p.x * ux + 3 - p.z * sh) + 'px,' + (p.y * uy + 3 - p.z * sh) + 'px)'; e.style.zIndex = p.z * 1000 + p.y * 10 + (p.x >> 1);
    });
    board.style.height = Math.ceil(16 * uy + th * 0.1 + 12) + 'px'; $('mjleft').textContent = left;
  }
  function take(m) { sel = null; clearTimeout(hintT); if (C.mjLegal(g.S, m)) { g.commit(C.mjApply(g.S, m)); return true; } return false; }
  function tap(i) {
    const S = g.S; if (S.face[i] < 0) return;
    if (!C.mjFree(S, i)) { K.shake(els[i]); g.say('That tile is blocked.', 1400); return; }
    if (sel === null) { sel = i; g.paint(); return; }
    if (sel === i) { sel = null; g.paint(); return; }
    if (S.face[sel] === S.face[i]) { take({ a: sel, b: i }); return; }
    sel = i; g.say('Those tiles do not match.', 1400); g.paint();
  }
  board.addEventListener('click', e => { if (g.done || g.locked) return; const t = e.target.closest('.mj'); if (t) tap(els.indexOf(t)); });
  $('hint').addEventListener('click', () => {
    if (g.done || g.locked) return; const mv = C.mjMoves(g.S); if (!mv.length) { g.say('No pairs open. Shuffle, or undo.', 2000); return; }
    els.forEach(e => e.classList.remove('hint')); const m = mv[0]; els[m.a].classList.add('hint'); els[m.b].classList.add('hint');
    clearTimeout(hintT); hintT = setTimeout(() => els.forEach(e => e.classList.remove('hint')), 2200);
  });
  $('shuffle').addEventListener('click', () => { if (g.done || g.locked) return; sel = null; g.commit(C.mjShuffle(g.S, 'sh:' + K.rand())); });
  $('newgame').addEventListener('click', () => { sel = null; }); $('dagain').addEventListener('click', () => { sel = null; });
  g.begin();
  window.DiliaMahjong = { state: g.state, move: m => take(m), tap, set: S => { sel = null; g.start(S); }, sel: () => sel, shuffle: () => { sel = null; g.commit(C.mjShuffle(g.S, 'sh:' + K.rand())); } };
}
