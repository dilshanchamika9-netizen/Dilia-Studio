// Nonogram: fill squares so each row and column matches its clue numbers. Every puzzle can be solved by logic alone, no guessing.
{
  const M = Mini, Z = DiliaPuzzles, $ = M.$, grid = $('nng'), SIZES = { 5: 'Small 5×5', 8: 'Medium 8×8', 10: 'Large 10×10', 12: 'Huge 12×12' };
  let size = +(M.rd('dilia-nonogram-cfg', {}).size) || 8, p, marks, mode = 1, paint = null, t0 = 0, tim = 0, won = false, mistakes = 0;
  const panel = M.panel('nonogram', 'Nonogram', () => fresh());
  const cells = [];
  function build() {
    grid.innerHTML = ''; cells.length = 0; const n = p.n; grid.style.setProperty('--n', n); grid.style.setProperty('--cw', Math.max(...p.cols.map(c => c.length)));
    const corner = document.createElement('div'); corner.className = 'nn-corner'; grid.append(corner);
    p.cols.forEach((c, i) => { const d = document.createElement('div'); d.className = 'nn-cc'; d.dataset.c = i; d.innerHTML = c.map(x => '<i>' + x + '</i>').join(''); grid.append(d); });
    for (let r = 0; r < n; r++) {
      const rc = document.createElement('div'); rc.className = 'nn-rc'; rc.dataset.r = r; rc.innerHTML = p.rows[r].map(x => '<i>' + x + '</i>').join(''); grid.append(rc);
      for (let c = 0; c < n; c++) { const d = document.createElement('div'); d.className = 'nn-c' + ((c + 1) % 5 === 0 && c < n - 1 ? ' vr' : '') + ((r + 1) % 5 === 0 && r < n - 1 ? ' hr' : ''); d.dataset.r = r; d.dataset.c = c; d.setAttribute('aria-label', 'row ' + (r + 1) + ' column ' + (c + 1)); grid.append(d); cells.push(d); }
    }
  }
  function render() {
    cells.forEach((d, i) => { const v = marks[i / p.n | 0][i % p.n]; d.className = d.className.replace(/ (on|x)\b/g, '') + (v === 1 ? ' on' : v === 2 ? ' x' : ''); });
    // dim clues of lines that already match
    for (let r = 0; r < p.n; r++) grid.querySelector('.nn-rc[data-r="' + r + '"]').classList.toggle('ok', Z.clue(marks[r].map(v => (v === 1 ? 1 : 0))).join() === p.rows[r].join());
    for (let c = 0; c < p.n; c++) grid.querySelector('.nn-cc[data-c="' + c + '"]').classList.toggle('ok', Z.clue(marks.map(r => (r[c] === 1 ? 1 : 0))).join() === p.cols[c].join());
    $('nfilled').textContent = marks.flat().filter(v => v === 1).length + ' / ' + p.pic.flat().filter(v => v).length;
    $('nbest').textContent = M.getBest('nonogram', 'size' + size) ? M.fmt(M.getBest('nonogram', 'size' + size)) : '–';
    document.querySelectorAll('[data-ns]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.ns === size)));
    document.querySelectorAll('[data-nm]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.nm === mode)));
  }
  function fresh() { clearInterval(tim); won = false; p = Z.nonoNew(size, M.rnd, size <= 5 ? 0.6 : size <= 8 ? 0.58 : 0.55); marks = Array.from({ length: p.n }, () => new Array(p.n).fill(0)); build(); panel.hide(); t0 = 0; $('ntime').textContent = '0:00'; render(); M.say('Tap squares to fill them. Use the X button to mark squares you know are empty.', 4000); }
  function startTimer() { if (t0) return; t0 = performance.now(); tim = setInterval(() => { $('ntime').textContent = M.fmt((performance.now() - t0) / 1000); }, 500); }
  function set(i, v) { const r = i / p.n | 0, c = i % p.n; if (marks[r][c] === v) return false; marks[r][c] = v; return true; }
  function cellAt(e) { const el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest && el.closest('.nn-c'); return c && grid.contains(c) ? +c.dataset.r * p.n + +c.dataset.c : -1; }
  grid.addEventListener('pointerdown', e => { if (won) return; const i = cellAt(e); if (i < 0) return; e.preventDefault(); startTimer(); const cur = marks[i / p.n | 0][i % p.n]; paint = cur === mode ? 0 : mode; if (set(i, paint)) { render(); check(); } });
  grid.addEventListener('pointermove', e => { if (paint === null || won) return; const i = cellAt(e); if (i >= 0 && marks[i / p.n | 0][i % p.n] !== paint && !(paint === 0 && false)) { if (paint !== 0 && marks[i / p.n | 0][i % p.n] !== 0) return; if (set(i, paint)) { render(); check(); } } });
  window.addEventListener('pointerup', () => { paint = null; }); window.addEventListener('pointercancel', () => { paint = null; });
  function check() {
    if (!Z.nonoWon(p, marks)) return; won = true; clearInterval(tim); const s = (performance.now() - t0) / 1000, r = M.best('nonogram', 'size' + size, Math.round(s), false);
    for (let i = 0; i < p.n * p.n; i++) if (marks[i / p.n | 0][i % p.n] === 0) marks[i / p.n | 0][i % p.n] = 2; render();
    panel.show('Solved', M.fmt(s), (r.isNew ? 'New best time for ' : 'Best time for ') + SIZES[size] + ': ' + M.fmt(r.best) + '.', { title: 'Nonogram · ' + SIZES[size], line: '🧩 solved in ' + M.fmt(s), big: M.fmt(s), lines: [SIZES[size], 'Best ' + M.fmt(r.best)] }); render();
  }
  document.querySelectorAll('[data-ns]').forEach(b => b.addEventListener('click', () => { size = +b.dataset.ns; M.wr('dilia-nonogram-cfg', { size }); fresh(); }));
  document.querySelectorAll('[data-nm]').forEach(b => b.addEventListener('click', () => { mode = +b.dataset.nm; render(); }));
  $('newgame').addEventListener('click', fresh); $('nclear').addEventListener('click', () => { if (won) return; marks = marks.map(r => r.map(() => 0)); render(); });
  document.addEventListener('keydown', e => { if (e.key === 'x' || e.key === 'X') { mode = mode === 1 ? 2 : 1; render(); } });
  fresh();
  window.DiliaNonogram = { state: () => ({ n: p.n, won, marks: marks.map(r => r.slice()), pic: p.pic, rows: p.rows, cols: p.cols }), cell: (r, c, v) => { startTimer(); set(r * p.n + c, v); render(); check(); }, solve: () => { for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) { startTimer(); set(r * p.n + c, p.pic[r][c] ? 1 : 0); } render(); check(); } };
}
