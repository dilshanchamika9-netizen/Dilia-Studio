/* Dilia Play card kit: the 52 card elements and the shell shared by FreeCell, Pyramid and TriPeaks
   (timer, moves, undo, best time, saved game, win card). The rules live in cardgames.js. Text goes in with textContent only. */
window.DiliaCardKit = (() => {
  const P = window.DiliaPlay, $ = id => document.getElementById(id);
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  const SU = ['♠', '♥', '♦', '♣'], RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SN = ['spades', 'hearts', 'diamonds', 'clubs'];
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const place = (e, x, y, z) => { e.style.transform = 'translate(' + x + 'px,' + y + 'px)'; e.style.zIndex = z; };

  function cards(board) {
    const els = [];
    for (let c = 0; c < 52; c++) {
      const s = (c / 13) | 0, r = (c % 13) + 1, e = document.createElement('div');
      e.className = 'kc' + (s === 1 || s === 2 ? ' red' : ''); e.dataset.c = c;
      const a = document.createElement('span'); a.className = 'kr'; a.textContent = RK[r] + SU[s];
      const b = document.createElement('span'); b.className = 'ku'; b.textContent = SU[s];
      e.append(a, b); e.setAttribute('aria-label', RK[r] + ' of ' + SN[s]);
      board.append(e); els.push(e);
    }
    return els;
  }
  function slot(board, id, cls, txt) { const e = document.createElement('div'); e.className = 'ks ' + cls; e.dataset.slot = id; if (txt) e.textContent = txt; board.prepend(e); return e; }
  function shake(e) { if (!e) return; e.classList.remove('no'); void e.offsetWidth; e.classList.add('no'); }
  // where the card's translate() is right now (used to start a drag)
  const pos = e => { const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px/.exec(e.style.transform); return m ? [+m[1], +m[2]] : [0, 0]; };

  // o: { id, name, board, deal(): new state, render(S), won(S), copy(S), valid(saved): bool, lines(S): [text] }
  function game(o) {
    const board = o.board, msg = $('msg'), KEEP = 'dilia-' + o.id + '-free', BEST = 'dilia-' + o.id + '-best';
    let S, hist = [], moves = 0, done = false, locked = false, clock;
    const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t && ms !== 0) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 2600); };
    function paint() { o.render(S); set('smoves', moves); $('undo').disabled = !hist.length || done || locked; }
    function keep() { if (!done) wr(KEEP, { S, moves, t: clock.get() }); }
    const api = {
      say, paint, keep, cards, slot, shake, place, pos, rd, wr,
      get S() { return S; }, get done() { return done; }, get locked() { return locked; }, get moves() { return moves; },
      lock(v) { locked = v; paint(); },
      commit(ns) {
        if (done || locked) return false;
        hist.push({ S: o.copy(S), moves }); if (hist.length > 500) hist.shift();
        S = ns; moves++; if (!clock.live) clock.start(); say(''); paint(); keep(); if (o.won(S)) win(); else if (o.after) o.after(S);
        return true;
      },
      // a move that is not one of the player's own (the Finish run): no undo step
      step(ns) { S = ns; moves++; paint(); if (o.won(S)) win(); },
      undo() { if (!hist.length || done || locked) return; const h = hist.pop(); S = h.S; moves = h.moves; say(''); paint(); keep(); if (o.undone) o.undone(); },
      start(deal, saved) {
        S = deal; hist = []; moves = 0; done = false; locked = false;
        if (clock) clock.stop(); clock = P.timer(t => set('stime', P.fmt(t)), saved ? saved.t : 0);
        if (saved) { S = saved.S; moves = saved.moves | 0; }
        $('done').classList.remove('on'); say(''); board.classList.add('nomove'); paint();
        requestAnimationFrame(() => requestAnimationFrame(() => board.classList.remove('nomove')));
        set('stime', P.fmt(clock.get())); stats(); if (o.after && !o.won(S)) o.after(S);
      },
      fresh() { const d = o.deal(); api.start(d); keep(); },
      state: () => ({ S: o.copy(S), moves, done })
    };
    function shareData() {
      const t = Math.round(clock.get());
      return { title: o.name, line: '🃏 ' + P.fmt(t) + ' · ' + moves + ' moves', big: P.fmt(t), lines: o.lines(S).concat([moves + ' moves']), date: P.niceDate(P.today()), file: 'dilia-' + o.id, foot: 'Free play. No sign-up, no ads.' };
    }
    function stats() { const b = rd(BEST, {}); set('sbest', b.t != null ? P.fmt(b.t) : '–'); set('swins', b.w || 0); }
    function win() {
      if (done) return; done = true; const t = Math.round(clock.stop());
      const b = rd(BEST, {}); if (b.t == null || t < b.t) b.t = t; b.w = (b.w || 0) + 1; wr(BEST, b); wr(KEEP, null);
      paint(); P.burst(board.parentNode);
      $('done').classList.add('on'); set('dtime', P.fmt(t)); set('dline', 'Cleared in ' + moves + ' moves.'); stats(); P.prepare(shareData());
    }
    $('undo').addEventListener('click', api.undo);
    $('newgame').addEventListener('click', api.fresh); $('dagain').addEventListener('click', api.fresh);
    $('share').addEventListener('click', () => P.share(shareData(), say));
    $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
    addEventListener('keydown', e => {
      const t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t.closest && t.closest('header, [role=dialog]')))) return;
      if (!e.altKey && ((e.ctrlKey || e.metaKey) && e.key === 'z' || (!e.ctrlKey && !e.metaKey && (e.key === 'u' || e.key === 'U')))) { e.preventDefault(); api.undo(); }
    });
    let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (S) paint(); }, 80); });
    addEventListener('pagehide', keep);
    api.begin = () => { const st = rd(KEEP, null); if (st && st.S && o.valid(st)) api.start(st.S, st); else api.fresh(); };
    return api;
  }
  const rand = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]; };
  return { cards, slot, shake, place, pos, game, rand, rd, wr };
})();
