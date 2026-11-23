// Memory: flip two cards at a time and find all the matching pairs in as few moves as you can.
{
  const M = Mini, Z = DiliaPuzzles, $ = M.$, board = $('mmb'), FACES = ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐙', '🦋', '🌵', '🍄', '⭐', '🌙'];
  const LV = { 1: { name: 'Easy', pairs: 6, cols: 4 }, 2: { name: 'Medium', pairs: 8, cols: 4 }, 3: { name: 'Hard', pairs: 12, cols: 6 } };
  let lv = +(M.rd('dilia-memory-cfg', {}).lv) || 2, deck, open = [], done = [], moves = 0, t0 = 0, tim = 0, lock = false, won = false; const els = [];
  const panel = M.panel('memory', 'Memory', () => fresh());
  function build() { board.innerHTML = ''; els.length = 0; board.style.setProperty('--cols', LV[lv].cols); deck.forEach((v, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mmc'; b.innerHTML = '<span class="f">' + FACES[v] + '</span><span class="b"></span>'; b.setAttribute('aria-label', 'card ' + (i + 1)); b.addEventListener('click', () => flip(i)); board.append(b); els.push(b); }); }
  function render() { els.forEach((b, i) => { const up = open.includes(i) || done.includes(i); b.classList.toggle('up', up); b.classList.toggle('done', done.includes(i)); b.setAttribute('aria-pressed', String(up)); }); $('mmoves').textContent = moves; $('mbest').textContent = M.getBest('memory', 'lv' + lv) || '–'; document.querySelectorAll('[data-ml]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.ml === lv))); }
  function fresh() { clearInterval(tim); won = false; lock = false; open = []; done = []; moves = 0; t0 = 0; deck = Z.memDeck(LV[lv].pairs, M.rnd); build(); panel.hide(); $('mtime').textContent = '0:00'; render(); M.say('Tap a card to flip it.', 2500); }
  function flip(i) {
    if (lock || won || open.includes(i) || done.includes(i)) return; if (!t0) { t0 = performance.now(); tim = setInterval(() => { $('mtime').textContent = M.fmt((performance.now() - t0) / 1000); }, 500); }
    open.push(i); render(); if (open.length < 2) return; moves++; const [a, b] = open;
    if (deck[a] === deck[b]) { done.push(a, b); open = []; render(); if (done.length === deck.length) win(); } else { lock = true; setTimeout(() => { open = []; lock = false; render(); }, 800); }
    $('mmoves').textContent = moves;
  }
  function win() {
    won = true; clearInterval(tim); const s = (performance.now() - t0) / 1000, r = M.best('memory', 'lv' + lv, moves, false);
    panel.show('All pairs found', moves + (moves === 1 ? ' move' : ' moves'), 'Time ' + M.fmt(s) + '. ' + (r.isNew ? 'New best for ' : 'Best for ') + LV[lv].name + ': ' + r.best + (r.best === 1 ? ' move.' : ' moves.'), { title: 'Memory · ' + LV[lv].name, line: '🃏 ' + moves + ' moves · ' + M.fmt(s), big: String(moves), lines: [LV[lv].name + ' · ' + LV[lv].pairs + ' pairs', M.fmt(s)] }); render();
  }
  document.querySelectorAll('[data-ml]').forEach(b => b.addEventListener('click', () => { lv = +b.dataset.ml; M.wr('dilia-memory-cfg', { lv }); fresh(); }));
  $('newgame').addEventListener('click', fresh);
  fresh();
  window.DiliaMemory = { state: () => ({ deck: deck.slice(), open: open.slice(), done: done.slice(), moves, won, lock }), flip };
}
