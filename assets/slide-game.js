// Sliding puzzle: put the tiles in order. Tap a tile in the blank's row or column to slide it (and the tiles in between).
{
  const M = Mini, Z = DiliaPuzzles, $ = M.$, board = $('slb');
  let n = +(M.rd('dilia-slide-cfg', {}).n) || 4, t, moves = 0, t0 = 0, tim = 0, won = false; const els = [];
  const panel = M.panel('slide', 'Sliding puzzle', () => fresh());
  function build() { board.innerHTML = ''; els.length = 0; board.style.setProperty('--n', n); for (let v = 1; v < n * n; v++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'slt'; b.textContent = v; b.dataset.v = v; b.setAttribute('aria-label', 'tile ' + v); b.addEventListener('click', () => tap(v)); board.append(b); els[v] = b; } }
  function render() {
    for (let i = 0; i < n * n; i++) { const v = t[i]; if (!v) continue; const e = els[v]; e.style.left = (i % n) * 100 / n + '%'; e.style.top = (i / n | 0) * 100 / n + '%'; e.classList.toggle('ok', v === i + 1); }
    $('smoves').textContent = moves; $('sbest').textContent = M.getBest('slide', 'n' + n) || '–';
    document.querySelectorAll('[data-sn]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.sn === n)));
  }
  function fresh() { clearInterval(tim); won = false; moves = 0; t0 = 0; t = Z.slideNew(n, M.rnd); build(); panel.hide(); $('stime').textContent = '0:00'; render(); M.say('Tap a tile next to the blank to slide it.', 3000); }
  function tap(v) {
    if (won) return; const i = t.indexOf(v), r = Z.slideMove(t, i, n); if (!r.moved) return; if (!t0) { t0 = performance.now(); tim = setInterval(() => { $('stime').textContent = M.fmt((performance.now() - t0) / 1000); }, 500); }
    t = r.t; moves++; render(); if (Z.slideSolved(t)) win();
  }
  function win() {
    won = true; clearInterval(tim); const s = (performance.now() - t0) / 1000, r = M.best('slide', 'n' + n, moves, false), lab = n + '×' + n;
    panel.show('Solved', moves + (moves === 1 ? ' move' : ' moves'), 'Time ' + M.fmt(s) + '. ' + (r.isNew ? 'New best for ' : 'Best for ') + lab + ': ' + r.best + (r.best === 1 ? ' move.' : ' moves.'), { title: 'Sliding puzzle · ' + lab, line: '🔢 solved in ' + moves + ' moves · ' + M.fmt(s), big: String(moves), lines: [lab + ' board', M.fmt(s)] }); render();
  }
  document.querySelectorAll('[data-sn]').forEach(b => b.addEventListener('click', () => { n = +b.dataset.sn; M.wr('dilia-slide-cfg', { n }); fresh(); }));
  $('newgame').addEventListener('click', fresh);
  document.addEventListener('keydown', e => { const k = { ArrowUp: n, ArrowDown: -n, ArrowLeft: 1, ArrowRight: -1 }[e.key]; if (!k || won) return; e.preventDefault(); const b = t.indexOf(0), i = b + k, ok = Math.abs(k) === 1 ? (i / n | 0) === (b / n | 0) && i >= 0 && i < n * n : i >= 0 && i < n * n; if (ok) tap(t[i]); });
  fresh();
  window.DiliaSlide = { state: () => ({ n, t: t.slice(), moves, won }), set: a => { t = a.slice(); won = false; moves = 0; render(); }, tap };
}
