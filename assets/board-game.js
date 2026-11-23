// Checkers and reversi page: one script for both. Rules and computer opponent live in boardgames.js (tested in Node).
{
  const B = DiliaBoard, P = DiliaPlay, $ = id => document.getElementById(id), board = $('bgb'), kind = board.dataset.game, G = kind === 'reversi' ? B.RV : B.CK;
  const SAVE = 'dilia-' + kind + '-save', REC = 'dilia-' + kind + '-rec', msgEl = $('msg');
  const NAMES = kind === 'reversi' ? ['Black', 'White'] : ['Light', 'Dark'], LNAME = { 1: 'Beginner', 2: 'Casual', 3: 'Club', 4: 'Expert' }, TITLE = kind === 'reversi' ? 'Reversi' : 'Checkers';
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const say = (t, ms) => { msgEl.textContent = t; clearTimeout(say.t); if (t && ms !== 0) say.t = setTimeout(() => { msgEl.textContent = ''; }, ms || 3000); };
  const cfg = Object.assign({ mode: 'cpu', level: 2, side: 0, flip: false }, rd(SAVE, {}).cfg || {});
  let S = [G.start()], H = [], started = false, sel = -1, token = 0, thinking = false, over = false, worker = null, resultLine = '', last = [];
  const cur = () => S[S.length - 1], legal = s => (G.legal ? G.legal(s) : G.moves(s));
  const cells = []; for (let i = 0; i < 64; i++) { const e = document.createElement('div'); e.className = 'bgc'; board.append(e); cells.push(e); }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const save = () => wr(SAVE, { cfg, hist: H });

  function render() {
    const s = cur(), cl = G.cells(s), mv = over ? [] : legal(s), humanTurn = !over && !thinking && (cfg.mode === 'two' || s.side === cfg.side) && (started || cfg.mode === 'two' || cfg.side === 0 || H.length);
    const dest = new Set(), pick = new Set();
    if (humanTurn) {
      if (kind === 'reversi') mv.forEach(m => { if (!m.pass) dest.add(m.at); });
      else { mv.forEach(m => pick.add(m.path[0])); if (sel >= 0) mv.filter(m => m.path[0] === sel).forEach(m => dest.add(m.path[m.path.length - 1])); }
    }
    let a = 0, b = 0;
    for (let i = 0; i < 64; i++) {
      const q = cfg.flip ? 63 - i : i, e = cells[i], c = cl[q]; if (c) { if (c.side === 0) a++; else b++; }
      const dark = kind === 'reversi' ? true : G.playable(q), light = !dark;
      e.className = 'bgc ' + (kind === 'reversi' ? 'rv' : light ? 'lt' : 'dk') + (q === sel ? ' sel' : '') + (last.includes(q) ? ' last' : '') + (dest.has(q) ? ' dot' : '') + (pick.has(q) && q !== sel ? ' pick' : '');
      e.dataset.q = q; e.innerHTML = c ? '<span class="pc s' + c.side + (c.king ? ' k' : '') + '"></span>' : '';
      e.setAttribute('aria-label', 'square ' + (String.fromCharCode(97 + (q & 7))) + (8 - (q >> 3)) + (c ? ', ' + NAMES[c.side] + (c.king ? ' king' : '') : ''));
    }
    $('ca').textContent = a; $('cb').textContent = b;
    const idle = !started && !H.length && cfg.mode === 'cpu' && !over; $('cstart').hidden = !idle || cfg.side === 0 && false;
    $('cturn').textContent = idle ? (cfg.side ? 'You play ' + NAMES[1] + '. Press Start game and the computer plays first.' : 'You play ' + NAMES[0] + ' and move first.') : over ? 'Game over' : thinking ? 'Computer is thinking…' : NAMES[s.side] + ' to move';
    $('cstart').hidden = !(!started && !H.length && cfg.mode === 'cpu' && !over && cfg.side === 1);
    $('undo').disabled = !H.length; $('cside').hidden = cfg.mode !== 'cpu'; $('clevels').hidden = cfg.mode !== 'cpu';
    document.querySelectorAll('[data-cm]').forEach(x => x.setAttribute('aria-pressed', String(cfg.mode === x.dataset.cm)));
    document.querySelectorAll('[data-cl]').forEach(x => x.setAttribute('aria-pressed', String(cfg.level === +x.dataset.cl)));
    document.querySelectorAll('[data-cs]').forEach(x => x.setAttribute('aria-pressed', String(cfg.side === +x.dataset.cs)));
    const r = rd(REC, {})[cfg.level] || [0, 0, 0]; $('crec').textContent = r[0] + ' won · ' + r[1] + ' drawn · ' + r[2] + ' lost'; $('clvname').textContent = LNAME[cfg.level];
  }
  function push(m) {
    const s = cur(), n = G.apply(s, m); S.push(n); H.push(m); started = true; sel = -1;
    last = kind === 'reversi' ? (m.pass ? [] : [m.at]) : [m.path[0], m.path[m.path.length - 1]]; save();
  }
  function after() {
    // automatic pass in reversi
    for (let k = 0; k < 2; k++) { const s = cur(), mv = legal(s); if (mv.length === 1 && mv[0].pass) { say(NAMES[s.side] + ' has no move and passes.', 2500); push(mv[0]); } }
    const r = G.result(cur()); over = r !== null; if (over) finish(r); else { render(); think(); }
    if (over) render();
  }
  function finish(r) {
    thinking = false; token++; const cpu = cfg.mode === 'cpu'; let head, line, res;
    if (r === -1) { head = 'Draw'; line = 'Neither side wins.'; res = cpu ? 1 : 3; } else { head = NAMES[r] + ' wins'; line = kind === 'reversi' ? NAMES[r] + ' has more discs (' + G.count(cur()).join(' to ') + ').' : NAMES[r] + (cur().side === r ? ' wins.' : ' wins: the other side cannot move.'); res = cpu ? (r === cfg.side ? 0 : 2) : 3; }
    if (cpu) { const rec = rd(REC, {}), t = rec[cfg.level] || [0, 0, 0], key = JSON.stringify(H).length + ':' + H.length + ':' + cfg.level; if (rec._done !== key) { t[res]++; rec[cfg.level] = t; rec._done = key; wr(REC, rec); } if (res === 0) line = 'You beat the ' + LNAME[cfg.level] + ' level.'; else if (res === 2) line += ' The ' + LNAME[cfg.level] + ' level wins this one.'; }
    resultLine = head + ' · ' + line; $('deyebrow').textContent = head; $('dtime').textContent = Math.ceil(H.length / 2) + ' moves'; $('dline').textContent = line; $('done').classList.add('on'); P.prepare(shareData()); say(head + '. ' + line, 0);
  }
  const shareData = () => ({ title: TITLE + ' · ' + (cfg.mode === 'cpu' ? LNAME[cfg.level] : 'Two players'), line: (kind === 'reversi' ? '⚫ ' : '⛀ ') + resultLine, big: String(Math.ceil(H.length / 2)), lines: [resultLine, cfg.mode === 'cpu' ? 'vs computer, ' + LNAME[cfg.level] : 'Two players'], file: 'dilia-' + kind });

  function startWorker() { if (worker !== null) return; try { worker = new Worker('../assets/board-worker.js'); worker.onmessage = e => got(e.data); worker.onerror = () => { worker = false; if (thinking) fb(); }; } catch (e) { worker = false; } }
  function fb() { setTimeout(() => got({ move: B.think(G, cur(), cfg.level, Math.random), tk: token }), 30); }
  let t0 = 0;
  function think() {
    const s = cur(); if (!started || over || cfg.mode !== 'cpu' || s.side === cfg.side) return;
    thinking = true; const tk = ++token; t0 = Date.now(); render(); startWorker();
    if (worker) worker.postMessage({ game: kind, state: s, level: cfg.level, tk }); else fb();
  }
  function got(d) {
    if (!thinking || d.tk !== token) return; const wait = Math.max(0, 450 - (Date.now() - t0)), tk = token;
    setTimeout(() => { if (tk !== token || over) return; thinking = false; if (!d.move) { after(); return; } push(d.move); after(); }, wait);
  }
  function tap(q) {
    const s = cur(); if (over || thinking || (cfg.mode === 'cpu' && s.side !== cfg.side)) return; if (cfg.mode === 'cpu' && !started && cfg.side === 1) { say('Press Start game first.'); return; }
    const mv = legal(s);
    if (kind === 'reversi') { const m = mv.find(x => x.at === q); if (m) { push(m); after(); } else say('That square is not a legal move.', 1500); return; }
    const mine = mv.filter(m => m.path[0] === q);
    if (sel >= 0 && sel !== q) { const m = mv.find(x => x.path[0] === sel && x.path[x.path.length - 1] === q); if (m) { push(m); after(); return; } }
    if (mine.length) { sel = q; render(); } else { sel = -1; render(); if (mv.some(m => m.caps.length)) say('You must take a piece when you can.', 2200); }
  }
  board.addEventListener('click', e => { const el = e.target.closest('.bgc'); if (el) tap(+el.dataset.q); });
  function fresh() { token++; thinking = false; over = false; started = false; S = [G.start()]; H = []; sel = -1; last = []; $('done').classList.remove('on'); say(''); if (cfg.mode === 'cpu') cfg.flip = cfg.side === 1; save(); render(); think(); }
  function undo() {
    if (!H.length) return; token++; thinking = false; over = false; $('done').classList.remove('on');
    S.pop(); H.pop(); if (cfg.mode === 'cpu') { while (H.length && cur().side !== cfg.side) { S.pop(); H.pop(); } if (cur().side !== cfg.side) { /* start position, computer first */ } }
    sel = -1; last = []; const m = H[H.length - 1]; if (m) last = kind === 'reversi' ? (m.pass ? [] : [m.at]) : [m.path[0], m.path[m.path.length - 1]]; say(''); save(); render(); think();
  }
  $('cstart').addEventListener('click', () => { started = true; render(); think(); });
  $('undo').addEventListener('click', undo); $('flip').addEventListener('click', () => { cfg.flip = !cfg.flip; save(); render(); });
  $('newgame').addEventListener('click', fresh); $('dagain').addEventListener('click', fresh);
  $('share').addEventListener('click', () => P.share(shareData(), say)); $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  document.querySelectorAll('[data-cm]').forEach(x => x.addEventListener('click', () => { if (cfg.mode === x.dataset.cm) return; if (H.length && !over) { say('Press New game first to switch mode.'); return; } cfg.mode = x.dataset.cm; fresh(); }));
  document.querySelectorAll('[data-cl]').forEach(x => x.addEventListener('click', () => { cfg.level = +x.dataset.cl; save(); render(); }));
  document.querySelectorAll('[data-cs]').forEach(x => x.addEventListener('click', () => { if (cfg.side === +x.dataset.cs) return; if (H.length && !over) { say('Press New game first to change sides.'); return; } cfg.side = +x.dataset.cs; fresh(); }));
  document.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey) return; if (e.key === 'u' || e.key === 'U') undo(); else if (e.key === 'f' || e.key === 'F') $('flip').click(); });
  function restore() {
    const h = rd(SAVE, {}).hist; if (!Array.isArray(h) || !h.length) return false;
    let s = G.start(); const st = [s], hh = [];
    for (const m of h) { if (!legal(s).some(x => same(x, m))) return false; s = G.apply(s, m); st.push(s); hh.push(m); }
    S = st; H = hh; started = true; const m = H[H.length - 1]; last = kind === 'reversi' ? (m.pass ? [] : [m.at]) : [m.path[0], m.path[m.path.length - 1]]; return true;
  }
  if (restore()) { over = G.result(cur()) !== null; render(); if (over) finish(G.result(cur())); else think(); } else fresh();
  window['DiliaBoardGame'] = { state: () => ({ s: cur(), hist: H.slice(), over, thinking, started, cfg: Object.assign({}, cfg) }), tap, undo, start: () => { started = true; render(); think(); }, set: o => { Object.assign(cfg, o); fresh(); }, legal: () => legal(cur()), play: m => { push(m); after(); } };
}
