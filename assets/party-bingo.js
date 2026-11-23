// Bingo: printable cards (classic 75-ball or your own words) and a number caller. Nothing leaves this device.
{
  const R = PartyRng, $ = id => document.getElementById(id), root = $('party'), mode = root.dataset.pm;
  const msg = $('msg');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 3500); };
  const LET = 'BINGO', letter = n => LET[Math.floor((n - 1) / 15)];
  let api = {};

  if (mode === 'cards') {
    const KEY = 'dilia-bingo-cards-v1', MAXLEN = 25, MAXW = 150;
    const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
    const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
    let cards = [], kind = 'classic', title = 'BINGO';
    const words = () => { const seen = new Set(), out = []; for (const raw of $('bwords').value.split(/\r?\n/)) { const s = Array.from(raw.trim().replace(/\s+/g, ' ')).slice(0, MAXLEN).join(''); if (s && !seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); out.push(s); } } return out.slice(0, MAXW); };
    const setKind = k => { kind = k; $('bwordsbox').hidden = k !== 'words'; $('btitlebox').hidden = k !== 'words'; };
    function classic() {
      const cols = [0, 1, 2, 3, 4].map(c => R.sample(Array.from({ length: 15 }, (_, i) => c * 15 + 1 + i), 5));
      const g = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) g.push(r === 2 && c === 2 ? 'FREE' : String(cols[c][r])); return g;
    }
    function custom(list) { const pick = R.sample(list, 24), g = []; for (let i = 0; i < 25; i++) g.push(i === 12 ? 'FREE' : pick[i < 12 ? i : i - 1]); return g; }
    function make() {
      const n = Math.max(1, Math.min(30, Math.floor(Number($('bn').value)) || 1));
      let list = null;
      if (kind === 'words') { list = words(); if (list.length < 24) { say('Add at least 24 different words. You have ' + list.length + '.', 5000); return; } }
      title = Array.from($('btitle').value.trim() || 'BINGO').slice(0, 20).join('');
      cards = Array.from({ length: n }, () => kind === 'words' ? custom(list) : classic());
      const box = $('bcards'); box.textContent = '';
      cards.forEach((g, i) => {
        const d = document.createElement('div'); d.className = 'pt-bcard'; const h = document.createElement('div'); h.className = 'bh';
        if (kind === 'words') { const s = document.createElement('span'); s.className = 'bt'; s.textContent = title; h.append(s); } else for (const l of LET) { const s = document.createElement('span'); s.textContent = l; h.append(s); }
        const grid = document.createElement('div'); grid.className = 'bg';
        g.forEach(t => { const c = document.createElement('div'); c.textContent = t; if (t === 'FREE') c.className = 'free'; grid.append(c); });
        const f = document.createElement('small'); f.textContent = 'Card ' + (i + 1) + ' of ' + n; d.append(h, grid, f); box.append(d);
      });
      $('bactions').hidden = false; say(n + (n === 1 ? ' card' : ' cards') + ' ready.');
      const o = rd(); o.kind = kind; o.title = title; o.words = $('bwords').value.slice(0, 6000); wr(o);
    }
    document.querySelectorAll('input[name=bkind]').forEach(r => r.addEventListener('change', () => { if (r.checked) setKind(r.value); }));
    $('go').addEventListener('click', make);
    $('bprint').addEventListener('click', () => { if (!cards.length) { say('Make cards first.'); return; } window.print(); });
    const o = rd(); if (typeof o.words === 'string') $('bwords').value = o.words; if (typeof o.title === 'string') $('btitle').value = o.title;
    if (o.kind === 'words') { document.querySelector('input[name=bkind][value=words]').checked = true; setKind('words'); } else setKind('classic');
    api = { state: () => ({ kind, cards: cards.map(c => c.slice()) }), make };
  }

  if (mode === 'caller') {
    const KEY = 'dilia-bingo-v1';
    const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && Array.isArray(o.called) ? o.called.filter(n => Number.isInteger(n) && n >= 1 && n <= 75).filter((n, i, a) => a.indexOf(n) === i) : []; } catch (e) { return []; } };
    const wr = c => { try { localStorage.setItem(KEY, JSON.stringify({ called: c })); } catch (e) {} };
    let called = rd(), armed = 0;
    const board = $('cboard');
    for (let r = 0; r < 5; r++) for (let c = 1; c <= 15; c++) { const n = r * 15 + c, d = document.createElement('div'); d.id = 'cn' + n; d.textContent = n; d.dataset.l = LET[r]; board.append(d); }
    function paint() {
      for (let n = 1; n <= 75; n++) { const d = $('cn' + n), on = called.includes(n); d.classList.toggle('on', on); d.setAttribute('aria-label', letter(n) + ' ' + n + (on ? ', called' : '')); }
      const last = called[called.length - 1];
      $('clast').textContent = last ? letter(last) + ' ' + last : '–';
      $('cprev').textContent = called.length > 1 ? 'Before: ' + called.slice(-6, -1).reverse().map(n => letter(n) + n).join(', ') : '';
      $('ccount').textContent = called.length + ' of 75 called';
    }
    function call(forced) {
      const left = []; for (let n = 1; n <= 75; n++) if (!called.includes(n)) left.push(n);
      if (!left.length) { say('All 75 numbers have been called.', 5000); return; }
      const n = Number.isInteger(forced) && left.includes(forced) ? forced : left[R.int(left.length)];
      called.push(n); wr(called); paint(); say(letter(n) + ' ' + n, 2500);
    }
    $('go').addEventListener('click', () => call());
    $('cundo').addEventListener('click', () => { if (!called.length) { say('Nothing to undo.'); return; } called.pop(); wr(called); paint(); });
    $('creset').addEventListener('click', () => {
      if (!armed) { $('creset').textContent = 'Press again to start over'; armed = setTimeout(() => { armed = 0; $('creset').textContent = 'New game'; }, 4000); return; }
      clearTimeout(armed); armed = 0; $('creset').textContent = 'New game'; called = []; wr(called); paint(); say('New game.');
    });
    addEventListener('keydown', e => {
      if (e.key !== ' ' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName) || (t.closest && t.closest('header, [role=dialog]')))) return;
      e.preventDefault(); call();
    });
    paint();
    api = { state: () => ({ called: called.slice(), last: called[called.length - 1] || 0 }), call };
  }
  window.DiliaBingo = api;
}
