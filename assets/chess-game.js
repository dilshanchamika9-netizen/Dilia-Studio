// Chess page: board, input, saved game and the computer opponent (engine runs in chess-worker.js). Rules live in chess-core.js.
{
  const C = DiliaChess, P = DiliaPlay, $ = id => document.getElementById(id);
  const board = $('chb'), msgEl = $('msg'), SAVE = 'dilia-chess-save', REC = 'dilia-chess-rec';
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const say = (t, ms) => { msgEl.textContent = t; clearTimeout(say.t); if (t && ms !== 0) say.t = setTimeout(() => { msgEl.textContent = ''; }, ms || 3000); };
  const GL = { 1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' };   // text-style glyphs, drawn filled; colour set in CSS
  const LNAME = { 1: 'Beginner', 2: 'Casual', 3: 'Club', 4: 'Expert' };
  const PNAME = { 1: 'pawn', 2: 'knight', 3: 'bishop', 4: 'rook', 5: 'queen', 6: 'king' };
  const cfg = Object.assign({ mode: 'cpu', level: 2, side: 0, flip: false }, rd(SAVE, {}).cfg || {});
  let gid = 0, started = false, pos, moves = [], sans = [], startFen = C.START, status = 'ongoing', sel = -1, legal = [], last = null, token = 0, thinking = false, worker = null, pend = 0, drag = null, over = false, resultLine = '';
  const sqEls = [];
  for (let i = 0; i < 64; i++) { const e = document.createElement('div'); e.className = 'sq'; const s = document.createElement('span'); e.append(s); board.append(e); sqEls.push(e); }
  const idx = (r, f) => r * 16 + f;
  const viewSq = i => { let r = 7 - (i >> 3), f = i & 7; if (cfg.flip) { r = 7 - r; f = 7 - f; } return idx(r, f); };   // grid index -> board square
  const humanTurn = () => cfg.mode === 'two' || pos.side === cfg.side;

  function load() {
    pos = new C.Pos(startFen); moves = []; sans = [];
  }
  function replay(list) {
    load(); for (const u of list) { const m = pos.fromUci(u); if (!m) break; sans.push(pos.san(m)); pos.make(m); moves.push(u); }
    const m = moves.length ? moves[moves.length - 1] : null; last = m ? [C.nameSq(m.slice(0, 2)), C.nameSq(m.slice(2, 4))] : null;
    status = pos.status(); sel = -1; legal = [];
  }
  function save() { wr(SAVE, { cfg, moves }); }

  function render() {
    const chk = pos.inCheck() ? pos.ksq[pos.side] : -1, dests = {}; for (const m of legal) dests[(m >> 8) & 255] = 1;
    for (let i = 0; i < 64; i++) {
      const s = viewSq(i), e = sqEls[i], p = pos.b[s], sp = e.firstChild; const light = ((s >> 4) + (s & 7)) % 2 === 1;
      e.className = 'sq ' + (light ? 'lt' : 'dk') + (s === sel ? ' sel' : '') + (last && (s === last[0] || s === last[1]) ? ' last' : '') + (s === chk ? ' chk' : '') + (dests[s] ? (p ? ' cap' : ' dot') : '');
      sp.textContent = p ? GL[p & 7] + '︎' : ''; sp.className = p ? ((p & 8) ? 'pb' : 'pw') : '';
      e.dataset.s = s; e.setAttribute('aria-label', C.sqName(s) + (p ? ' ' + ((p & 8) ? 'black ' : 'white ') + PNAME[p & 7] : ' empty'));
      const f = i & 7, r = i >> 3; e.dataset.f = r === 7 ? C.sqName(s)[0] : ''; e.dataset.r = f === 0 ? C.sqName(s)[1] : '';
    }
    const n = moves.length; $('cmoves').textContent = Math.ceil(n / 2);
    let h = ''; for (let i = 0; i < sans.length; i += 2) h += '<li><span class="mn">' + (i / 2 + 1) + '.</span> <b>' + sans[i] + '</b> <b>' + (sans[i + 1] || '') + '</b></li>';
    const ml = $('clist'); ml.innerHTML = h; ml.scrollTop = ml.scrollHeight;
    const idle = !started && !moves.length && cfg.mode === 'cpu' && !over; $('cstart').hidden = !idle;
    $('cturn').textContent = idle ? (cfg.side ? 'You play Black. Press Start game and the computer plays first.' : 'You play White. Make your first move, or press Start game.') : over ? 'Game over' : thinking ? 'Computer is thinking…' : (pos.side ? 'Black' : 'White') + ' to move' + (pos.inCheck() ? ' · check' : '');
    $('undo').disabled = !n; $('cside').hidden = cfg.mode !== 'cpu';
    document.querySelectorAll('[data-cm]').forEach(b => b.setAttribute('aria-pressed', String(cfg.mode === b.dataset.cm)));
    document.querySelectorAll('[data-cl]').forEach(b => b.setAttribute('aria-pressed', String(cfg.level === +b.dataset.cl)));
    document.querySelectorAll('[data-cs]').forEach(b => b.setAttribute('aria-pressed', String(cfg.side === +b.dataset.cs)));
    $('clevels').hidden = cfg.mode !== 'cpu';
    const rec = rd(REC, {}), r = rec[cfg.level] || [0, 0, 0]; $('crec').textContent = r[0] + ' won · ' + r[1] + ' drawn · ' + r[2] + ' lost'; $('clvname').textContent = LNAME[cfg.level];
  }

  function startWorker() {
    if (worker || worker === false) return;
    try { worker = new Worker('../assets/chess-worker.js'); worker.onmessage = e => got(e.data); worker.onerror = () => { worker = false; if (thinking) fallback(); }; } catch (e) { worker = false; }
  }
  let fb = null;
  function fallback() {
    const run = () => { if (!fb) fb = new C.Engine(); const p = new C.Pos(startFen); for (const u of moves) p.make(p.fromUci(u)); const r = C.think(fb, p, cfg.level, Math.random); got({ move: r.move ? p.uci(r.move) : '', tk: pend }); };
    setTimeout(() => (typeof C.Engine === 'function' ? run() : need()), 30);
  }
  function need() { const s = document.createElement('script'); s.src = '../assets/chess-engine.js'; s.onload = () => fallback(); document.head.append(s); }
  function think() {
    if (!started || over || cfg.mode !== 'cpu' || pos.side === cfg.side) return;
    thinking = true; const tk = ++token; pend = tk; render(); startWorker();
    const t0 = Date.now(), job = { fen: startFen, moves, level: cfg.level, tk };
    if (worker) { worker.postMessage(job); worker._tk = tk; worker._t0 = t0; } else fallback();
    think.t0 = t0;
  }
  function got(d) {
    if (!thinking || d.tk !== undefined && d.tk !== token) return;
    const wait = Math.max(0, 380 - (Date.now() - think.t0)); thinking = false;
    setTimeout(() => { if (over) return; if (d.tk !== undefined && d.tk !== token) return; if (!d.move) { check(); return; } play(d.move, true); }, wait);
  }

  function play(u, byCpu) {
    const m = pos.fromUci(u); if (!m) return false;
    sans.push(pos.san(m)); pos.make(m); moves.push(u); last = [C.nameSq(u.slice(0, 2)), C.nameSq(u.slice(2, 4))]; sel = -1; legal = []; started = true;
    save(); check(); return true;
  }
  function check() {
    status = pos.status(); over = status !== 'ongoing';
    if (over) finish(); else { say(''); render(); think(); }
    if (over) render();
  }
  function finish() {
    clearTimeout(finish.t); thinking = false; token++;
    const whiteMoved = pos.side === 1, cpu = cfg.mode === 'cpu'; let head, line, res;   // pos.side is the side to move; mate means the other side won
    if (status === 'checkmate') { const winner = whiteMoved ? 'White' : 'Black'; head = 'Checkmate'; line = winner + ' wins.'; res = cpu ? ((whiteMoved ? 0 : 1) === cfg.side ? 0 : 2) : 3; }
    else { head = 'Draw'; res = cpu ? 1 : 3; line = { stalemate: 'Stalemate: no legal move and no check.', fifty: 'Fifty moves without a capture or pawn move.', repetition: 'The same position came up three times.', insufficient: 'Neither side has enough pieces to mate.' }[status] || 'Drawn game.'; }
    if (cpu) { const rec = rd(REC, {}), r = rec[cfg.level] || [0, 0, 0]; if (!(rec._done === moves.join(',') + cfg.level)) { r[res]++; rec[cfg.level] = r; rec._done = moves.join(',') + cfg.level; wr(REC, rec); } if (res === 0) line = 'You beat the ' + LNAME[cfg.level] + ' level.'; else if (res === 2) line = line + ' The ' + LNAME[cfg.level] + ' level wins this one.'; }
    gid = Date.now(); resultLine = head + ' · ' + line; $('deyebrow').textContent = head; $('dtime').textContent = moves.length ? Math.ceil(moves.length / 2) + ' moves' : ''; $('dline').textContent = line; $('done').classList.add('on');
    P.prepare(shareData()); say(head + '. ' + line, 0);
  }
  const shareData = () => ({ title: 'Chess · ' + (cfg.mode === 'cpu' ? LNAME[cfg.level] : 'Two players'), line: '♞ ' + resultLine + ' (' + Math.ceil(moves.length / 2) + ' moves)', big: String(Math.ceil(moves.length / 2)), lines: [resultLine, cfg.mode === 'cpu' ? 'vs computer, ' + LNAME[cfg.level] : 'Two players'], file: 'dilia-chess-' + gid });

  // input
  function select(s) {
    sel = s; legal = pos.legal().filter(m => (m & 255) === s); render();
  }
  function tryMove(from, to) {
    const cand = pos.legal().filter(m => (m & 255) === from && ((m >> 8) & 255) === to); if (!cand.length) return false;
    if (cand.length > 1 && cand[0] >> 16 & 15) { askPromo(cand, from, to); return true; }
    return play(pos.uci(cand[0]), false);
  }
  function askPromo(cand, from, to) {
    const box = $('promo'); box.hidden = false; box.innerHTML = '';
    for (const p of [5, 4, 3, 2]) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pbtn'; b.setAttribute('aria-label', 'Promote to ' + PNAME[p]); b.innerHTML = '<span class="' + (pos.side ? 'pb' : 'pw') + '">' + GL[p] + '︎</span>'; b.onclick = () => { box.hidden = true; const m = cand.find(x => ((x >> 16) & 15) === p); play(pos.uci(m), false); }; box.append(b); }
    const x = document.createElement('button'); x.type = 'button'; x.className = 'pbtn'; x.textContent = 'Cancel'; x.onclick = () => { box.hidden = true; sel = -1; legal = []; render(); }; box.append(x);
  }
  function tapSq(s) {
    if (over || thinking || !humanTurn()) return; $('promo').hidden = true;
    if (sel >= 0 && s !== sel) { if (legal.some(m => ((m >> 8) & 255) === s)) { tryMove(sel, s); return; } }
    const p = pos.b[s]; if (p && !!(p & 8) === !!pos.side && s !== sel) select(s); else { sel = -1; legal = []; render(); }
  }
  board.addEventListener('pointerdown', e => {
    const el = e.target.closest('.sq'); if (!el || over || thinking || !humanTurn()) return; const s = +el.dataset.s, p = pos.b[s];
    if (p && !!(p & 8) === !!pos.side) { drag = { s, x: e.clientX, y: e.clientY, ghost: null, moved: false, id: e.pointerId }; }
  });
  window.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return; drag.moved = true; if (sel !== drag.s) select(drag.s);
    if (!drag.ghost) { const g = document.createElement('div'); g.className = 'cghost ' + (pos.b[drag.s] & 8 ? 'pb' : 'pw'); g.textContent = GL[pos.b[drag.s] & 7] + '︎'; g.style.fontSize = board.clientWidth / 8 * 0.8 + 'px'; document.body.append(g); drag.ghost = g; sqEls.forEach(q => { if (+q.dataset.s === drag.s) q.firstChild.style.opacity = '0.25'; }); }
    drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; e.preventDefault();
  }, { passive: false });
  const endDrag = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return; const d = drag; drag = null;
    sqEls.forEach(q => { q.firstChild.style.opacity = ''; }); if (d.ghost) d.ghost.remove();
    if (!d.moved) { return; }
    const el = document.elementFromPoint(e.clientX, e.clientY), t = el && el.closest && el.closest('.sq'); if (!t || !board.contains(t)) { return; }
    const to = +t.dataset.s; if (to !== d.s && legal.some(m => ((m >> 8) & 255) === to)) tryMove(d.s, to); else if (to !== d.s) { sel = -1; legal = []; render(); }
  };
  window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', () => endDrag(null) || (drag = null));
  board.addEventListener('click', e => {
    if (e._d) return; const el = e.target.closest('.sq'); if (!el) return; if (drag && drag.moved) return; tapSq(+el.dataset.s);
  });
  // a drag that ended on another square also fires click on the target square in some browsers: swallow it
  window.addEventListener('pointerup', e => { if (drag && drag.moved) { const sw = ev => { ev.stopPropagation(); ev.preventDefault(); }; window.addEventListener('click', sw, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', sw, true), 50); } }, true);

  function fresh(keepCfg) {
    token++; thinking = false; over = false; started = false; startFen = C.START; load(); last = null; sel = -1; legal = []; status = 'ongoing'; $('done').classList.remove('on'); $('promo').hidden = true; say('');
    if (cfg.mode === 'cpu' && cfg.side === 1) cfg.flip = true; else if (cfg.mode === 'cpu') cfg.flip = false;
    if (worker) worker.postMessage({ type: 'new' });
    save(); render(); think();
  }
  function undo() {
    if (!moves.length) return; token++; thinking = false; $('promo').hidden = true;
    let n = 1; if (cfg.mode === 'cpu') n = pos.side === cfg.side ? 2 : 1;
    let list = moves.slice(0, Math.max(0, moves.length - n)); over = false; replay(list); $('done').classList.remove('on'); say(''); save(); render(); think();
  }
  $('cstart').addEventListener('click', () => { started = true; render(); think(); });
  $('undo').addEventListener('click', undo);
  $('flip').addEventListener('click', () => { cfg.flip = !cfg.flip; save(); render(); });
  $('newgame').addEventListener('click', () => fresh());
  $('dagain').addEventListener('click', () => fresh());
  $('share').addEventListener('click', () => P.share(shareData(), say)); $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  const setting = (key, val) => { cfg[key] = val; if (key === 'level') { save(); render(); return; } if (moves.length && !over) { save(); render(); say('This applies from the next new game.'); return; } fresh(); };
  document.querySelectorAll('[data-cm]').forEach(b => b.addEventListener('click', () => { if (cfg.mode === b.dataset.cm) return; if (moves.length && !over) { say('Press New game first to switch mode.'); return; } cfg.mode = b.dataset.cm; fresh(); }));
  document.querySelectorAll('[data-cl]').forEach(b => b.addEventListener('click', () => setting('level', +b.dataset.cl)));
  document.querySelectorAll('[data-cs]').forEach(b => b.addEventListener('click', () => { if (cfg.side === +b.dataset.cs) return; if (moves.length && !over) { say('Press New game first to change sides.'); return; } cfg.side = +b.dataset.cs; fresh(); }));
  document.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey) return; if (e.key === 'u' || e.key === 'U') undo(); else if (e.key === 'f' || e.key === 'F') $('flip').click(); });

  const sv = rd(SAVE, {});
  if (Array.isArray(sv.moves) && sv.moves.length) { started = true; replay(sv.moves); if (moves.length !== sv.moves.length) { load(); moves = []; sans = []; last = null; } over = pos.status() !== 'ongoing'; status = pos.status(); render(); if (over) finish(); else think(); }
  else fresh();
  window.DiliaChessGame = { state: () => ({ fen: pos.fen(), moves: moves.slice(), sans: sans.slice(), over, status, thinking, cfg: Object.assign({}, cfg) }), move: u => { if (over || thinking) return false; return play(u, false); }, tap: tapSq, set: o => { Object.assign(cfg, o); fresh(); }, undo, start: () => { started = true; render(); think(); }, setMoves: list => { started = true; replay(list); over = pos.status() !== 'ongoing'; render(); if (over) finish(); else think(); } };
}
