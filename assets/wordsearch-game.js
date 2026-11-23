// Word search: find the hidden words. Drag across the letters in a straight line.
{
  const M = Mini, Z = DiliaPuzzles, $ = M.$, grid = $('wsg'), list = $('wsl');
  const cfg = Object.assign({ n: 10, hard: false, theme: 'Animals' }, M.rd('dilia-wordsearch-cfg', {}));
  let w, found = {}, t0 = 0, tim = 0, won = false, drag = null, cells = [];
  const panel = M.panel('wordsearch', 'Word search', () => fresh());
  const themes = Object.keys(Z.THEMES);
  $('wtheme').innerHTML = themes.map(t => '<button type="button" data-wt="' + t + '" aria-pressed="false">' + t + '</button>').join('');
  function build() {
    grid.innerHTML = ''; cells = []; grid.style.setProperty('--n', w.n);
    for (let r = 0; r < w.n; r++) for (let c = 0; c < w.n; c++) { const d = document.createElement('div'); d.className = 'wsc'; d.textContent = w.grid[r][c]; d.dataset.r = r; d.dataset.c = c; grid.append(d); cells.push(d); }
    list.innerHTML = w.words.map(x => '<li data-w="' + x + '">' + x + '</li>').join('');
  }
  function paintSel(r1, c1, r2, c2, cls) { cells.forEach(d => d.classList.remove('sel')); if (r2 == null) return; const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1), len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) + 1; for (let k = 0; k < len; k++) cells[(r1 + dr * k) * w.n + c1 + dc * k].classList.add(cls || 'sel'); }
  function snap(r1, c1, r, c) { // snap the pointer cell to the nearest straight line from the start
    const dr = r - r1, dc = c - c1, a = Math.abs(dr), b = Math.abs(dc); if (!a && !b) return [r1, c1];
    if (a > b * 2) return [r, c1]; if (b > a * 2) return [r1, c]; const m = Math.max(a, b); return [r1 + Math.sign(dr) * m, c1 + Math.sign(dc) * m];
  }
  function clamp(r1, c1, r2, c2) { const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1); let len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)); while (len > 0 && (r1 + dr * len < 0 || r1 + dr * len >= w.n || c1 + dc * len < 0 || c1 + dc * len >= w.n)) len--; return [r1 + dr * len, c1 + dc * len]; }
  const at = e => { const el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest && el.closest('.wsc'); return c && grid.contains(c) ? [+c.dataset.r, +c.dataset.c] : null; };
  grid.addEventListener('pointerdown', e => { if (won) return; const p = at(e); if (!p) return; e.preventDefault(); if (!t0) { t0 = performance.now(); tim = setInterval(() => { $('wtime').textContent = M.fmt((performance.now() - t0) / 1000); }, 500); } drag = { r1: p[0], c1: p[1], r2: p[0], c2: p[1] }; paintSel(p[0], p[1], p[0], p[1]); });
  grid.addEventListener('pointermove', e => { if (!drag) return; const p = at(e); if (!p) return; let [r2, c2] = snap(drag.r1, drag.c1, p[0], p[1]); [r2, c2] = clamp(drag.r1, drag.c1, r2, c2); drag.r2 = r2; drag.c2 = c2; paintSel(drag.r1, drag.c1, r2, c2); });
  window.addEventListener('pointerup', () => { if (!drag) return; const d = drag; drag = null; cells.forEach(x => x.classList.remove('sel')); try1(d.r1, d.c1, d.r2, d.c2); });
  function try1(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return; const s = Z.wsRead(w.grid, r1, c1, r2, c2); if (!s) return; const rev = s.split('').reverse().join(), hit = w.words.find(x => !found[x] && (x === s || x === rev));
    if (!hit) { M.say('Not one of the words.', 1200); return; } found[hit] = 1; paintSel(r1, c1, r2, c2, 'fd'); cells.forEach(d => { if (d.classList.contains('fd')) d.classList.add('found'); d.classList.remove('fd'); });
    list.querySelector('[data-w="' + hit + '"]').classList.add('got'); $('wleft').textContent = w.words.length - Object.keys(found).length; if (Object.keys(found).length === w.words.length) win();
  }
  function win() {
    won = true; clearInterval(tim); const s = (performance.now() - t0) / 1000, key = cfg.n + (cfg.hard ? 'h' : 'e'), r = M.best('wordsearch', key, Math.round(s), false);
    panel.show('All words found', M.fmt(s), (r.isNew ? 'New best time. ' : 'Best time: ' + M.fmt(r.best) + '. ') + cfg.theme + ', ' + cfg.n + '×' + cfg.n + (cfg.hard ? ', all directions.' : '.'), { title: 'Word search · ' + cfg.theme, line: '🔎 found all ' + w.words.length + ' words in ' + M.fmt(s), big: M.fmt(s), lines: [cfg.theme + ' ' + cfg.n + '×' + cfg.n, cfg.hard ? 'All directions' : 'Right and down'] });
  }
  function ui() {
    document.querySelectorAll('[data-wt]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wt === cfg.theme))); document.querySelectorAll('[data-wn]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.wn === cfg.n))); document.querySelectorAll('[data-wh]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.wh === '1') === cfg.hard)));
    const k = cfg.n + (cfg.hard ? 'h' : 'e'); $('wbest').textContent = M.getBest('wordsearch', k) ? M.fmt(M.getBest('wordsearch', k)) : '–';
  }
  function fresh() { clearInterval(tim); won = false; found = {}; t0 = 0; w = Z.wsNew(cfg.theme, cfg.n, cfg.n === 10 ? 8 : 10, cfg.hard, M.rnd); build(); panel.hide(); $('wtime').textContent = '0:00'; $('wleft').textContent = w.words.length; ui(); M.wr('dilia-wordsearch-cfg', cfg); M.say('Drag across the letters of a word in the list.', 3500); }
  document.querySelectorAll('[data-wt]').forEach(b => b.addEventListener('click', () => { cfg.theme = b.dataset.wt; fresh(); }));
  document.querySelectorAll('[data-wn]').forEach(b => b.addEventListener('click', () => { cfg.n = +b.dataset.wn; fresh(); }));
  document.querySelectorAll('[data-wh]').forEach(b => b.addEventListener('click', () => { cfg.hard = b.dataset.wh === '1'; fresh(); }));
  $('newgame').addEventListener('click', fresh);
  fresh();
  window.DiliaWordSearch = { state: () => ({ w, found: Object.keys(found), won }), find: x => { const p = w.placed.find(q => q.w === x); try1(p.r, p.c, p.r + p.dr * (x.length - 1), p.c + p.dc * (x.length - 1)); }, cellRect: (r, c) => cells[r * w.n + c].getBoundingClientRect().toJSON() };
}
