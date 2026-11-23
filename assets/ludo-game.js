// Ludo page: board drawing, dice, turns and the computer players. Rules are in ludo.js (tested in Node).
{
  const L = DiliaLudo, P = DiliaPlay, $ = id => document.getElementById(id), board = $('ldb'), SAVE = 'dilia-ludo-save', REC = 'dilia-ludo-rec', msgEl = $('msg');
  const NAMES = ['Red', 'Green', 'Yellow', 'Blue'], LNAME = { 1: 'Beginner', 2: 'Casual', 3: 'Club', 4: 'Expert' };
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const say = (t, ms) => { msgEl.textContent = t; clearTimeout(say.t); if (t && ms !== 0) say.t = setTimeout(() => { if (msgEl.textContent === t) msgEl.textContent = ''; }, ms || 2600); };
  const rnd6 = () => { const a = new Uint32Array(1); let x; do { crypto.getRandomValues(a); x = a[0]; } while (x >= 4294967292); return 1 + (x % 6); };
  const SEATS = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
  const cfg = Object.assign({ players: 4, mode: 'cpu', level: 3 }, rd(SAVE, {}).cfg || {});
  // track squares (row, col), clockwise, seat 0 starts at index 0
  const TR = []; const add = (r, c) => TR.push([r, c]);
  for (let c = 1; c <= 5; c++) add(6, c); for (let r = 5; r >= 0; r--) add(r, 6); add(0, 7); for (let r = 0; r <= 5; r++) add(r, 8);
  for (let c = 9; c <= 14; c++) add(6, c); add(7, 14); for (let c = 14; c >= 9; c--) add(8, c); for (let r = 9; r <= 14; r++) add(r, 8);
  add(14, 7); for (let r = 14; r >= 9; r--) add(r, 6); for (let c = 5; c >= 0; c--) add(8, c); add(7, 0); add(6, 0);
  const HC = [[1, 2, 3, 4, 5].map(c => [7, c]), [1, 2, 3, 4, 5].map(r => [r, 7]), [13, 12, 11, 10, 9].map(c => [7, c]), [13, 12, 11, 10, 9].map(r => [r, 7])];
  const BASE = [[[1, 1], [1, 4], [4, 1], [4, 4]], [[1, 10], [1, 13], [4, 10], [4, 13]], [[10, 10], [10, 13], [13, 10], [13, 13]], [[10, 1], [10, 4], [13, 1], [13, 4]]];
  const CEN = [[7, 6.25], [6.25, 7], [7, 7.75], [7.75, 7]];
  let gid = 0, G = L.create(SEATS[cfg.players]), pend = [], busy = false, timer = 0, over = false, resultLine = '';
  const seatOf = p => G.seats[p], isCpu = p => cfg.mode === 'cpu' && p !== 0;
  // draw the static board
  const px = v => (v * 100 / 15) + '%';
  function cellDiv(r, c, cls) { const d = document.createElement('div'); d.className = 'lc ' + cls; d.style.left = px(c); d.style.top = px(r); board.append(d); return d; }
  for (let s = 0; s < 4; s++) { const [r0, c0] = [[0, 0], [0, 9], [9, 9], [9, 0]][s]; const d = cellDiv(r0, c0, 'lbase s' + s); d.style.width = px(6); d.style.height = px(6); BASE[s].forEach(([r, c]) => { const k = cellDiv(r, c, 'lslot s' + s); k.style.width = px(1); k.style.height = px(1); }); }
  TR.forEach(([r, c], i) => { const d = cellDiv(r, c, 'ltr' + (L.SAFE.has(i) ? ' safe' : '') + (L.START.includes(i) ? ' st s' + L.START.indexOf(i) : '')); if (L.SAFE.has(i) && !L.START.includes(i)) d.textContent = '★'; });
  HC.forEach((a, s) => a.forEach(([r, c]) => cellDiv(r, c, 'ltr hc s' + s)));
  const ctr = cellDiv(6, 6, 'lctr'); ctr.style.width = px(3); ctr.style.height = px(3);
  const toks = []; // toks[p][i]
  function build() { toks.forEach(a => a.forEach(b => b.remove())); toks.length = 0; G.seats.forEach((s, p) => { toks.push([0, 1, 2, 3].map(i => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ltok s' + s; b.dataset.p = p; b.dataset.i = i; b.addEventListener('click', () => tapTok(p, i)); board.append(b); return b; })); }); }
  function pos(p, i) { const rel = G.tok[p][i], s = seatOf(p); if (rel === -1) return BASE[s][i]; if (rel <= 50) return TR[L.abs(s, rel)]; if (rel < 56) return HC[s][rel - 51]; return CEN[s].map((v, k) => v - 0.5 + (i % 2 ? 0.2 : -0.2) * (k ? 1 : 0) + (i > 1 ? 0.2 : -0.2) * (k ? 0 : 1)); }
  function render() {
    const stack = {}; G.seats.forEach((s, p) => [0, 1, 2, 3].forEach(i => { const [r, c] = pos(p, i), rel = G.tok[p][i], k = rel === -1 || rel === 56 ? '' : r + ',' + c; const n = k ? (stack[k] = (stack[k] || 0) + 1) - 1 : 0; const b = toks[p][i]; const off = n * 0.16; b.style.left = px(c + 0.1 + off); b.style.top = px(r + 0.1 - off); b.style.zIndex = 5 + n; b.classList.toggle('can', pend.includes(i) && G.turn === p && !busy && !over); b.setAttribute('aria-label', NAMES[s] + ' token ' + (i + 1) + (rel === -1 ? ' in base' : rel === 56 ? ' home' : '')); }));
    const p = G.turn, s = seatOf(p), human = !isCpu(p);
    $('ldie').textContent = G.dice || '·'; $('ldie').className = 'ldie s' + s;
    $('lturn').textContent = over ? 'Game over' : NAMES[s] + (isCpu(p) ? ' (computer)' : '') + (G.dice ? ' rolled ' + G.dice : ' to roll');
    $('lroll').disabled = over || busy || !human || G.dice > 0; $('lroll').textContent = 'Roll the dice';
    document.querySelectorAll('[data-lp]').forEach(x => x.setAttribute('aria-pressed', String(cfg.players === +x.dataset.lp)));
    document.querySelectorAll('[data-lm]').forEach(x => x.setAttribute('aria-pressed', String(cfg.mode === x.dataset.lm)));
    document.querySelectorAll('[data-ll]').forEach(x => x.setAttribute('aria-pressed', String(cfg.level === +x.dataset.ll)));
    $('llevels').hidden = cfg.mode !== 'cpu';
    $('lhome').innerHTML = G.seats.map((s2, q) => '<span class="lh s' + s2 + '"><b>' + NAMES[s2] + '</b> ' + G.tok[q].filter(x => x === 56).length + '/4</span>').join('');
    const r = rd(REC, {})[cfg.level] || [0, 0]; $('crec').textContent = r[0] + ' won · ' + r[1] + ' lost'; $('clvname').textContent = LNAME[cfg.level];
  }
  const save = () => wr(SAVE, { cfg, state: G });
  function loop() {
    clearTimeout(timer); if (over) return; const p = G.turn;
    if (G.dice === 0) { pend = []; render(); if (isCpu(p)) timer = setTimeout(() => roll(), 650); return; }
    pend = L.legal(G, G.dice); render();
    if (isCpu(p)) timer = setTimeout(() => doMove(L.pick(G, pend, cfg.level, Math.random)), 650);
    else if (pend.length === 1) { say('Only one move: playing it.', 900); timer = setTimeout(() => doMove(pend[0]), 600); }
    else say('Tap one of the glowing tokens.', 2000);
  }
  function roll(v) {
    if (over || busy || G.dice) return; v = v || rnd6(); const p = G.turn, s = seatOf(p), r = L.setRoll(G, v); busy = true; $('ldie').textContent = v; $('ldie').className = 'ldie s' + s + ' pop';
    say(NAMES[s] + ' rolled ' + v + (r.lost ? '. Third six in a row: the turn is lost.' : r.moves.length ? '.' : '. No move.'), 1800);
    setTimeout(() => { busy = false; G = r.s; save(); loop(); }, r.moves.length ? 350 : 1000);
  }
  function doMove(i) {
    if (over || busy || !G.dice || !pend.includes(i)) return; const p = G.turn, s = seatOf(p), r = L.move(G, i); G = r.s; pend = [];
    if (r.captured.length) say(NAMES[s] + ' sent ' + r.captured.map(([q]) => NAMES[seatOf(q)]).join(' and ') + ' back to base.', 2200); else if (r.finished) say(NAMES[s] + ' has a token home.', 1800); else if (r.entered) say(NAMES[s] + ' brings a token out.', 1500);
    save(); if (G.winner >= 0) { over = true; render(); finish(); return; } render(); busy = true; setTimeout(() => { busy = false; loop(); }, 380);
  }
  function tapTok(p, i) { if (over || busy || p !== G.turn || isCpu(p) || !G.dice) return; if (pend.includes(i)) doMove(i); }
  function finish() {
    const w = G.winner, s = seatOf(w), cpu = cfg.mode === 'cpu', head = NAMES[s] + ' wins'; let line = NAMES[s] + ' got all four tokens home.';
    if (cpu) { const rec = rd(REC, {}), t = rec[cfg.level] || [0, 0], key = G.n + ':' + G.winner + ':' + cfg.level; if (rec._done !== key) { t[w === 0 ? 0 : 1]++; rec[cfg.level] = t; rec._done = key; wr(REC, rec); } if (w === 0) line = 'You won against the ' + LNAME[cfg.level] + ' computers.'; else line += ' The ' + LNAME[cfg.level] + ' level wins this one.'; }
    gid = Date.now(); resultLine = head + ' · ' + line; $('deyebrow').textContent = head; $('dtime').textContent = G.n + ' rolls'; $('dline').textContent = line; $('done').classList.add('on'); P.prepare(shareData()); say(head + '. ' + line, 0);
  }
  const shareData = () => ({ title: 'Ludo · ' + cfg.players + ' players', line: '🎲 ' + resultLine, big: String(G.n), lines: [resultLine, cfg.mode === 'cpu' ? 'vs computer, ' + LNAME[cfg.level] : 'All human players'], file: 'dilia-ludo-' + gid });
  function fresh() { clearTimeout(timer); G = L.create(SEATS[cfg.players]); pend = []; busy = false; over = false; $('done').classList.remove('on'); say(''); build(); save(); render(); loop(); }
  $('lroll').addEventListener('click', () => roll()); $('ldie').addEventListener('click', () => { if (!$('lroll').disabled) roll(); });
  $('newgame').addEventListener('click', fresh); $('dagain').addEventListener('click', fresh);
  $('share').addEventListener('click', () => P.share(shareData(), say)); $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  const started = () => G.n > 0 && !over;
  document.querySelectorAll('[data-lp]').forEach(x => x.addEventListener('click', () => { if (cfg.players === +x.dataset.lp) return; if (started()) { say('Press New game first to change players.'); return; } cfg.players = +x.dataset.lp; fresh(); }));
  document.querySelectorAll('[data-lm]').forEach(x => x.addEventListener('click', () => { if (cfg.mode === x.dataset.lm) return; if (started()) { say('Press New game first to change mode.'); return; } cfg.mode = x.dataset.lm; fresh(); }));
  document.querySelectorAll('[data-ll]').forEach(x => x.addEventListener('click', () => { cfg.level = +x.dataset.ll; save(); render(); }));
  document.addEventListener('keydown', e => { if (e.key === ' ' && !$('lroll').disabled && document.activeElement === document.body) { e.preventDefault(); roll(); } });
  const sv = rd(SAVE, {}).state;
  if (sv && Array.isArray(sv.tok) && sv.seats && sv.seats.join() === SEATS[cfg.players].join() && sv.tok.length === sv.seats.length && sv.tok.every(a => a.length === 4 && a.every(x => Number.isInteger(x) && x >= -1 && x <= 56))) { G = sv; over = G.winner >= 0; build(); render(); if (over) finish(); else loop(); } else fresh();
  window.DiliaLudoGame = { state: () => ({ s: G, over, busy, pend: pend.slice(), cfg: Object.assign({}, cfg) }), roll: v => roll(v), move: i => doMove(i), set: o => { Object.assign(cfg, o); fresh(); }, setState: s => { G = s; over = G.winner >= 0; pend = []; busy = false; build(); render(); loop(); } };
}
