// Backgammon page: rules and computer come from backgammon.js. Tap a checker, tap where it goes. Dice are rolled by the roll button or Space.
{
  const M = Mini, $ = M.$, B = DiliaBG, NS = 'http://www.w3.org/2000/svg';
  const host = $('bgs'), dice = $('bgdice'), rollBtn = $('bgroll');
  const cfg = { mode: 'cpu', level: 3 };
  let S, sel = null, phase = 'roll', busy = false, timers = [], rec = M.rd('dilia-bg-rec', {});
  const panel = M.panel('bg', 'Backgammon', () => newGame());
  const CW = 48, BAR = 24, X0 = 20, TOP = 20, BOT = 460, TH = 190, R = 20;
  const colX = c => X0 + c * CW + (c >= 6 ? BAR : 0);
  const posOf = i => (i >= 12 ? { top: true, c: i - 12 } : { top: false, c: 11 - i });
  const later = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); };
  const human = () => cfg.mode === 'two' || S.turn === 0;
  function newGame() { timers.forEach(clearTimeout); timers = []; S = B.NEW(); S.turn = 0; sel = null; busy = false; phase = 'roll'; panel.hide(); render(); M.say(cfg.mode === 'cpu' ? 'You are pink. Roll the dice to start.' : 'Pink starts. Roll the dice.', 4000); }
  function legalNow() { return phase === 'move' && human() ? B.firstSteps(S, S.turn) : []; }
  function render() {
    const steps = legalNow(), srcs = new Set(steps.map(m => m.f)), dests = new Set(steps.filter(m => sel !== null && m.f === sel).map(m => m.t));
    let h = '<rect x="6" y="6" width="708" height="468" rx="14" class="bgbd"/>';
    for (let i = 0; i < 24; i++) {
      const { top, c } = posOf(i), x = colX(c), y0 = top ? TOP : BOT, y1 = top ? TOP + TH : BOT - TH, odd = (top ? c : c + 1) % 2;
      h += `<polygon class="bgpt ${odd ? 'a' : 'b'}${dests.has(i) ? ' dest' : ''}" points="${x + 2},${y0} ${x + CW - 2},${y0} ${x + CW / 2},${y1}"/>`;
      h += `<rect data-i="${i}" class="bghit" x="${x}" y="${top ? TOP : BOT - TH - 30}" width="${CW}" height="${TH + 30}"/>`;
      const n = Math.abs(S.p[i]), pl = S.p[i] > 0 ? 0 : 1;
      for (let k = 0; k < Math.min(n, 5); k++) { const cy = top ? TOP + R + 2 + k * 2 * R : BOT - R - 2 - k * 2 * R; h += `<circle data-i="${i}" class="bgck p${pl}${sel === i && k === Math.min(n, 5) - 1 ? ' sel' : ''}${srcs.has(i) && pl === S.turn ? ' can' : ''}" cx="${x + CW / 2}" cy="${cy}" r="${R - 1}"/>`; }
      if (n > 5) { const cy = top ? TOP + R + 2 + 4 * 2 * R : BOT - R - 2 - 4 * 2 * R; h += `<text x="${x + CW / 2}" y="${cy + 5}" class="bgnum" text-anchor="middle">${n}</text>`; }
      if (dests.has(i)) h += `<circle class="bgdot" cx="${x + CW / 2}" cy="${top ? TOP + TH - 26 : BOT - TH + 26}" r="9"/>`;
      h += `<text x="${x + CW / 2}" y="${top ? 12 : 474}" class="bgidx" text-anchor="middle">${top ? i + 1 : i + 1}</text>`;
    }
    const bx = X0 + 6 * CW;
    h += `<rect class="bgbar" x="${bx}" y="${TOP}" width="${BAR}" height="${BOT - TOP}"/>`;
    for (let pl = 0; pl < 2; pl++) for (let k = 0; k < S.bar[pl]; k++) { const cy = pl === 0 ? 300 + k * 38 : 180 - k * 38; h += `<circle data-i="24" data-pl="${pl}" class="bgck p${pl}${sel === 24 && pl === S.turn ? ' sel' : ''}${srcs.has(24) && pl === S.turn ? ' can' : ''}" cx="${bx + BAR / 2}" cy="${cy}" r="11"/>`; }
    const ox = X0 + 12 * CW + BAR + 10;
    h += `<rect class="bgtray${dests.has(-1) ? ' dest' : ''}" data-i="off" x="${ox}" y="${TOP}" width="70" height="${BOT - TOP}" rx="8"/>`;
    for (let pl = 0; pl < 2; pl++) for (let k = 0; k < S.off[pl]; k++) { const y = pl === 0 ? BOT - 8 - k * 9 : TOP + 8 + k * 9; h += `<rect class="bgoff p${pl}" x="${ox + 8}" y="${y - 7}" width="54" height="7" rx="2"/>`; }
    host.innerHTML = `<svg viewBox="0 0 720 480" role="img" aria-label="Backgammon board">${h}</svg>`;
    $('bgoff').textContent = S.off[0]; $('bgoff2').textContent = S.off[1];
    const ds = S.dice.length ? S.dice : []; dice.innerHTML = ds.map(d => `<span class="bgd">${d}</span>`).join('') || '<span class="bgd none">–</span>';
    rollBtn.disabled = !(phase === 'roll' && human() && !busy); rollBtn.textContent = 'Roll dice';
    const r = rec['l' + cfg.level] || [0, 0]; $('bgrec').textContent = cfg.mode === 'cpu' ? r[0] + ' – ' + r[1] : '–';
  }
  function roll(d) {
    if (phase !== 'roll' || busy) return; S.dice = d || B.rollDice(M.rnd); phase = 'move'; sel = null; render(); afterChange(true);
  }
  function afterChange(fresh) {
    const pl = S.turn;
    if (S.off[pl] === 15) return finish(pl);
    const steps = B.firstSteps(S, pl);
    if (!S.dice.length || !steps.length) {
      if (!steps.length && S.dice.length && fresh) { M.say((cfg.mode === 'cpu' && pl === 1 ? 'Computer has' : 'No legal move for ' + (pl === 0 ? 'pink' : 'blue') + '. ') + (cfg.mode === 'cpu' && pl === 1 ? ' no legal move.' : 'Passing.'), 1600); busy = true; later(() => { busy = false; endTurn(); }, 1300); return; }
      return endTurn();
    }
    if (!human()) { busy = true; later(cpuPlay, 650); }
    else if (steps.length === 1 && false) { /* kept manual on purpose */ }
  }
  function endTurn() { S.dice = []; S.turn = 1 - S.turn; sel = null; phase = 'roll'; S.n++; render(); if (!human()) { busy = true; later(() => { busy = false; roll(); }, 700); } else M.say(cfg.mode === 'two' ? (S.turn === 0 ? 'Pink: roll the dice.' : 'Blue: roll the dice.') : 'Your turn. Roll the dice.', 2500); }
  function cpuPlay() {
    busy = true; const r = B.choose(Object.assign(B.copy(S), { turn: 1 }), cfg.level, Math.random);
    if (!r) { busy = false; endTurn(); return; }
    let i = 0; const stepOnce = () => { if (i >= r.moves.length) { busy = false; if (S.off[1] === 15) return finish(1); return endTurn(); } S = B.apply(S, r.moves[i], 1); i++; render(); later(stepOnce, 480); };
    stepOnce();
  }
  function tryMove(m) { S = B.apply(S, m, S.turn); sel = null; render(); afterChange(false); }
  function tap(i) {
    if (!human() || phase !== 'move' || busy) return; const pl = S.turn, steps = B.firstSteps(S, pl);
    const to = i === 'off' ? -1 : i;
    if (sel !== null) {
      const ms = steps.filter(m => m.f === sel && m.t === to).sort((a, b) => a.d - b.d);
      if (ms.length) return tryMove(ms[0]);
    }
    if (to !== -1) {
      if (steps.some(m => m.f === to)) { sel = sel === to ? null : to; render(); return; }
      const ms = steps.filter(m => m.t === to).sort((a, b) => a.d - b.d); const fr = new Set(ms.map(m => m.f));
      if (fr.size === 1) return tryMove(ms[0]);
    } else { const ms = steps.filter(m => m.t === -1).sort((a, b) => a.d - b.d); if (new Set(ms.map(m => m.f)).size === 1) return tryMove(ms[0]); }
    sel = null; render();
  }
  function finish(w) {
    phase = 'over'; busy = false; render(); const k = B.winKind(S, w), kind = ['', 'a single game', 'a gammon', 'a backgammon'][k];
    const you = cfg.mode === 'cpu' ? (w === 0) : null, name = cfg.mode === 'cpu' ? (w === 0 ? 'You win' : 'Computer wins') : (w === 0 ? 'Pink wins' : 'Blue wins');
    if (cfg.mode === 'cpu') { const key = 'l' + cfg.level, r = rec[key] || [0, 0]; r[w === 0 ? 0 : 1]++; rec[key] = r; M.wr('dilia-bg-rec', rec); render(); }
    const lv = ['', 'Beginner', 'Casual', 'Strong', 'Expert'][cfg.level];
    panel.show(name, kind.replace('a ', ''), name + ' by ' + kind + (cfg.mode === 'cpu' ? ' at ' + lv + ' level.' : '.'), { title: 'Backgammon', line: name + ' (' + kind + ')', big: kind.replace('a ', ''), lines: [cfg.mode === 'cpu' ? lv + ' level' : 'Two players'] });
  }
  host.addEventListener('click', e => { const t = e.target.closest('[data-i]'); if (!t) return; const v = t.getAttribute('data-i'); tap(v === 'off' ? 'off' : +v); });
  rollBtn.addEventListener('click', () => roll());
  document.addEventListener('keydown', e => { if (e.key === ' ' && phase === 'roll' && human() && !busy && document.activeElement === document.body) { e.preventDefault(); roll(); } });
  document.querySelectorAll('[data-gl]').forEach(b => b.addEventListener('click', () => { cfg.level = +b.dataset.gl; document.querySelectorAll('[data-gl]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); newGame(); }));
  document.querySelectorAll('[data-gm]').forEach(b => b.addEventListener('click', () => { cfg.mode = b.dataset.gm; document.querySelectorAll('[data-gm]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); $('bglv').hidden = cfg.mode === 'two'; newGame(); }));
  $('newgame').addEventListener('click', newGame);
  newGame();
  window.DiliaBGGame = { state: () => ({ s: JSON.parse(JSON.stringify(S)), phase, busy, sel, cfg: Object.assign({}, cfg), legal: B.firstSteps(S, S.turn).map(m => [m.f, m.t, m.d]) }), roll, tap, set: s => { S = Object.assign(B.NEW(), s); sel = null; busy = false; phase = s.phase || 'roll'; render(); }, cell: i => host.querySelector('[data-i="' + i + '"]').getBoundingClientRect().toJSON() };
}
