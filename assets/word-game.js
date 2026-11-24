// Daily word: guess the five-letter word in six tries. Green = right place, yellow = in the word elsewhere, grey = not in it.
{
  const M = Mini, $ = M.$, W = DiliaWord, P = DiliaPlay, G = DiliaPlayGen;
  const grid = $('wgrid'), kb = $('wkb'), ROWS = ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'];
  const key = P.today(), no = G.dayNo(key);
  let mode = 'daily', ans = '', guesses = [], cur = '', over = false, st = M.rd('dilia-word-stats', { played: 0, won: 0, streak: 0, best: 0, last: '' });
  const panel = M.panel('word', 'Daily word', () => practice());
  const saveKey = 'dilia-word-save';
  function load() { const s = M.rd(saveKey, null); return s && s.key === key ? s.g : []; }
  function save() { if (mode === 'daily') M.wr(saveKey, { key, g: guesses }); }
  function start(m) {
    mode = m; over = false; cur = ''; panel.hide();
    if (m === 'daily') { ans = W.answerFor(no); guesses = load(); } else { ans = W.LIST[Math.floor(M.rnd() * W.LIST.length)]; guesses = []; }
    $('wtitle').textContent = m === 'daily' ? 'Daily word #' + no : 'Practice word';
    render(); const done = guesses.length && (guesses[guesses.length - 1] === ans || guesses.length >= 6);
    if (done) { over = true; render(); finishShow(true); } else M.say(m === 'daily' ? 'Type a five-letter word and press Enter.' : 'Practice word. It does not count for your streak.', 3500);
  }
  function practice() { start('practice'); }
  function render() {
    let h = '';
    for (let r = 0; r < 6; r++) {
      const g = guesses[r], c = r === guesses.length && !over ? cur : '', sc = g ? W.score(g, ans) : null;
      for (let i = 0; i < 5; i++) h += `<div class="wc${sc ? ' s' + sc[i] : ''}${c[i] ? ' t' : ''}">${(g || c)[i] ? (g || c)[i].toUpperCase() : ''}</div>`;
    }
    grid.innerHTML = h;
    const best = {}; guesses.forEach(g => { const s = W.score(g, ans); for (let i = 0; i < 5; i++) best[g[i]] = Math.max(best[g[i]] || 0, s[i] + 1); });
    kb.innerHTML = ROWS.map(r => '<div class="wkr">' + [...r].map(k => k === '+' ? '<button type="button" class="wk wide" data-k="Enter">Enter</button>' : k === '-' ? '<button type="button" class="wk wide" data-k="Backspace" aria-label="Delete">⌫</button>' : `<button type="button" class="wk${best[k] ? ' s' + (best[k] - 1) : ''}" data-k="${k}">${k.toUpperCase()}</button>`).join('') + '</div>').join('');
    $('wtry').textContent = Math.min(guesses.length + (over ? 0 : 1), 6) + '/6'; $('wstreak').textContent = st.streak;
  }
  function finishShow(restored) {
    const won = guesses[guesses.length - 1] === ans, n = guesses.length;
    const rows = guesses.map(g => W.score(g, ans).map(v => ['⬜', '🟨', '🟩'][v]).join('')).join('\n');
    const head = won ? 'Solved' : 'Not this time', big = won ? n + '/6' : 'X/6';
    panel.show(head, big, won ? 'You found it in ' + n + (n === 1 ? ' guess.' : ' guesses.') : 'The word was ' + ans.toUpperCase() + '.', { title: 'Daily word #' + no, line: 'Dilia daily word #' + no + ' ' + big + '\n' + rows, big, lines: [mode === 'daily' ? 'Daily word #' + no : 'Practice'] });
    if (mode === 'daily') $('dagain').textContent = 'Practice with another word';
  }
  function type(ch) { if (over || cur.length >= 5 || !/^[a-z]$/.test(ch)) return; cur += ch; render(); }
  function back() { if (over) return; cur = cur.slice(0, -1); render(); }
  function enter() {
    if (over) return; if (cur.length < 5) { M.say('Not enough letters.', 1500); return; }
    guesses.push(cur); cur = ''; save();
    const won = guesses[guesses.length - 1] === ans;
    if (won || guesses.length >= 6) {
      over = true;
      if (mode === 'daily' && st.last !== key) { const y = P.addDays ? P.addDays(key, -1) : ''; st.streak = won ? (st.last === y ? st.streak + 1 : 1) : 0; st.played++; if (won) { st.won++; st.best = Math.max(st.best, st.streak); } st.last = key; M.wr('dilia-word-stats', st); }
      render(); finishShow(false);
    } else render();
  }
  grid.parentElement.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; if (k === 'Enter') enter(); else if (k === 'Backspace') back(); else type(k); });
  document.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey) return; if (e.key === 'Enter') { if (document.activeElement && document.activeElement.closest && document.activeElement.closest('button,a')) return; e.preventDefault(); enter(); } else if (e.key === 'Backspace') back(); else if (e.key.length === 1) type(e.key.toLowerCase()); });
  $('newgame').addEventListener('click', practice);
  start('daily');
  window.DiliaWordGame = { state: () => ({ mode, ans, guesses: guesses.slice(), cur, over, no, st }), type: s => { for (const c of s) type(c); }, enter, back, practice, daily: () => start('daily') };
}
