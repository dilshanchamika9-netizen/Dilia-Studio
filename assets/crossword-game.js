// Crossword: our own clues. Tap a square, type letters; tap the same square again to switch between across and down.
{
  const M = Mini, $ = M.$, X = DiliaCross, host = $('cwg'), inp = $('cwin');
  let size = 9, p, ent, sel = null, dir = 'across', t0 = 0, tm = 0, won = false, checked = false;
  const panel = M.panel('cross', 'Crossword', () => newGame());
  const secs = () => (t0 ? (Date.now() - t0) / 1000 : 0);
  function newGame() { clearInterval(tm); p = X.cwNew(size, M.rnd); ent = p.grid.map(r => r.map(() => '')); won = false; checked = false; t0 = 0; sel = null; dir = 'across'; panel.hide(); const f = p.words[0]; sel = [f.r, f.col]; dir = f.dir; draw(); M.say('Tap a square and type. Tap it again to switch direction.', 4000); }
  const wordsAt = (r, c) => p.words.filter(w => (w.dir === 'across' ? w.r === r && c >= w.col && c < w.col + w.w.length : w.col === c && r >= w.r && r < w.r + w.w.length));
  const curWord = () => { const ws = wordsAt(sel[0], sel[1]); return ws.find(w => w.dir === dir) || ws[0]; };
  function draw() {
    const nums = {}; p.words.forEach(w => { nums[w.r + ',' + w.col] = w.n; });
    const cw = sel ? curWord() : null, inW = (r, c) => cw && (cw.dir === 'across' ? cw.r === r && c >= cw.col && c < cw.col + cw.w.length : cw.col === c && r >= cw.r && r < cw.r + cw.w.length);
    let h = `<div class="cwb" style="--cols:${p.w}">`;
    for (let r = 0; r < p.h; r++) for (let c = 0; c < p.w; c++) {
      if (!p.grid[r][c]) { h += '<i class="cwx"></i>'; continue; }
      const bad = checked && ent[r][c] && ent[r][c] !== p.grid[r][c];
      h += `<button type="button" class="cwc${sel && sel[0] === r && sel[1] === c ? ' sel' : inW(r, c) ? ' in' : ''}${bad ? ' bad' : ''}" data-r="${r}" data-c="${c}" aria-label="Row ${r + 1} column ${c + 1}">${nums[r + ',' + c] ? '<small>' + nums[r + ',' + c] + '</small>' : ''}${ent[r][c].toUpperCase()}</button>`;
    }
    host.innerHTML = h + '</div>';
    const list = d => p.words.filter(w => w.dir === d).map(w => `<li><button type="button" class="cwcl${cw === w ? ' on' : ''}" data-n="${w.n}" data-d="${d}"><b>${w.n}</b> ${w.c} <span>(${w.w.length})</span></button></li>`).join('');
    $('cwa').innerHTML = list('across'); $('cwd').innerHTML = list('down');
    const filled = ent.flat().filter(Boolean).length, total = p.grid.flat().filter(Boolean).length; $('cwfill').textContent = filled + '/' + total;
    $('cwtime').textContent = M.fmt(secs());
  }
  function check() {
    if (won) return; if (ent.every((row, r) => row.every((v, c) => v === p.grid[r][c]))) { won = true; clearInterval(tm); const s = secs(), r = M.best('cross', 's' + size, Math.round(s), false); panel.show('Solved', M.fmt(s), 'All ' + p.words.length + ' words found. ' + (r.isNew ? 'New best for this size.' : 'Best for this size: ' + M.fmt(r.best) + '.'), { title: 'Crossword', line: 'Crossword solved in ' + M.fmt(s), big: M.fmt(s), lines: [p.words.length + ' words'] }); $('cwbest').textContent = M.fmt(r.best); }
  }
  function put(ch) {
    if (won || !sel) return; if (!t0) { t0 = Date.now(); tm = setInterval(() => { $('cwtime').textContent = M.fmt(secs()); }, 1000); }
    ent[sel[0]][sel[1]] = ch; checked = false; step(1); draw(); check();
  }
  function step(k) { const w = curWord(); if (!w) return; const i = (dir === 'across' ? sel[1] - w.col : sel[0] - w.r) + k; if (i < 0 || i >= w.w.length) return; sel = dir === 'across' ? [w.r, w.col + i] : [w.r + i, w.col]; }
  function pick(r, c) { if (!p.grid[r][c]) return; if (sel && sel[0] === r && sel[1] === c) { const ws = wordsAt(r, c); if (ws.length > 1) dir = dir === 'across' ? 'down' : 'across'; } else { sel = [r, c]; const ws = wordsAt(r, c); if (!ws.some(w => w.dir === dir)) dir = ws[0].dir; } draw(); inp.focus({ preventScroll: true }); }
  host.addEventListener('click', e => { const b = e.target.closest('.cwc'); if (b) pick(+b.dataset.r, +b.dataset.c); });
  [$('cwa'), $('cwd')].forEach(l => l.addEventListener('click', e => { const b = e.target.closest('.cwcl'); if (!b) return; const w = p.words.find(x => x.n === +b.dataset.n && x.dir === b.dataset.d); dir = w.dir; sel = [w.r, w.col]; draw(); inp.focus({ preventScroll: true }); }));
  inp.addEventListener('input', () => { const v = inp.value.toLowerCase().replace(/[^a-z]/g, ''); inp.value = ''; if (v) put(v[v.length - 1]); });
  document.addEventListener('keydown', e => { if (!sel || won || e.ctrlKey || e.metaKey || e.altKey) return; const k = e.key;
    if (k === 'Backspace') { e.preventDefault(); if (ent[sel[0]][sel[1]]) ent[sel[0]][sel[1]] = ''; else step(-1); draw(); }
    else if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); const dr = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0, dc = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0; let r = sel[0] + dr, c = sel[1] + dc; while (r >= 0 && c >= 0 && r < p.h && c < p.w && !p.grid[r][c]) { r += dr; c += dc; } if (r >= 0 && c >= 0 && r < p.h && c < p.w) { sel = [r, c]; dir = dr ? 'down' : 'across'; if (!wordsAt(r, c).some(w => w.dir === dir)) dir = wordsAt(r, c)[0].dir; draw(); } }
    else if (k.length === 1 && /[a-z]/i.test(k) && document.activeElement !== inp) { e.preventDefault(); put(k.toLowerCase()); } });
  $('cwcheck').addEventListener('click', () => { checked = true; draw(); const bad = ent.some((row, r) => row.some((v, c) => v && v !== p.grid[r][c])); M.say(bad ? 'Red squares are wrong.' : 'Everything you typed so far is right.', 2500); });
  $('cwreveal').addEventListener('click', () => { if (won || !sel) return; const w = curWord(); for (let i = 0; i < w.w.length; i++) { const r = w.dir === 'across' ? w.r : w.r + i, c = w.dir === 'across' ? w.col + i : w.col; ent[r][c] = w.w[i]; } if (!t0) { t0 = Date.now(); tm = setInterval(() => { $('cwtime').textContent = M.fmt(secs()); }, 1000); } draw(); check(); });
  document.querySelectorAll('[data-cs]').forEach(b => b.addEventListener('click', () => { size = +b.dataset.cs; document.querySelectorAll('[data-cs]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); newGame(); $('cwbest').textContent = M.getBest('cross', 's' + size) ? M.fmt(M.getBest('cross', 's' + size)) : '–'; }));
  $('newgame').addEventListener('click', newGame);
  newGame(); $('cwbest').textContent = M.getBest('cross', 's' + size) ? M.fmt(M.getBest('cross', 's' + size)) : '–';
  window.DiliaCrossGame = { state: () => ({ p, ent: ent.map(r => r.slice()), won, size, sel, dir }), solve: () => { ent = p.grid.map(r => r.slice()); draw(); check(); }, fill: (r, c, ch) => { ent[r][c] = ch; draw(); }, pick };
}
