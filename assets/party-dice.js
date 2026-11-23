// Dice roller, coin flip and random number generator. One engine, three pages (data-pm = dice | coin | number).
// Every result comes from a fair random pick (PartyRng). Nothing is sent anywhere; the coin tally stays in this browser.
{
  const R = PartyRng, $ = id => document.getElementById(id), root = $('party'), mode = root.dataset.pm;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const msg = $('msg');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 3500); };
  const intIn = (el, lo, hi, def) => { const v = Number(el.value); return el.value.trim() !== '' && Number.isInteger(v) ? Math.max(lo, Math.min(hi, v)) : def; };
  const copy = text => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => say('Copied.'), () => say('Could not copy. Select the text and copy it.', 4000));
  let api = {};

  if (mode === 'dice') {
    const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    const TURN = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };   // cube turn that brings face v to the front
    const FACE = { 1: 'f1', 2: 'f2', 3: 'f3', 4: 'f4', 5: 'f5', 6: 'f6' };
    let sides = 6, vals = [], turns = 0, hist = [], busy = false, cycle = 0;
    const box = $('dicebox');
    function face(v, cls) { const f = document.createElement('div'); f.className = 'face ' + cls; PIPS[v].forEach(p => { const d = document.createElement('i'); d.style.gridArea = (Math.floor(p / 3) + 1) + ' / ' + (p % 3 + 1); f.append(d); }); return f; }
    function build(n) {
      box.textContent = ''; box.dataset.sides = sides;
      for (let i = 0; i < n; i++) {
        const w = document.createElement('div'); w.className = 'die';
        if (sides === 6) { const c = document.createElement('div'); c.className = 'cube'; for (let v = 1; v <= 6; v++) c.append(face(v, FACE[v])); w.append(c); }
        else { const f = document.createElement('div'); f.className = 'flat'; f.textContent = '?'; w.append(f); }
        box.append(w);
      }
    }
    function place(v, i) {
      const w = box.children[i]; if (!w) return;
      if (sides === 6) { const c = w.firstChild, t = TURN[v]; c.style.transform = 'rotateX(' + (t[0] + 360 * turns) + 'deg) rotateY(' + (t[1] + 360 * turns) + 'deg)'; c.setAttribute('aria-label', 'Die showing ' + v); }
      else w.firstChild.textContent = v;
    }
    function shown() {
      const total = vals.reduce((a, b) => a + b, 0); $('dtotal').textContent = total;
      $('dline').textContent = vals.length > 1 ? vals.join(' + ') + ' = ' + total : 'One d' + sides;
      $('done').classList.add('on');
    }
    function roll(forced) {
      if (busy) return; const n = intIn($('dn'), 1, 10, 1);
      sides = intIn($('dsides'), 2, 1000, 6); $('dsides').value = sides;
      if (box.children.length !== n || box.dataset.sides != sides) build(n);
      vals = Array.from({ length: n }, (_, i) => Array.isArray(forced) && Number.isInteger(forced[i]) && forced[i] >= 1 && forced[i] <= sides ? forced[i] : R.between(1, sides));
      turns += 2; $('done').classList.remove('on');
      hist.unshift(vals.reduce((a, b) => a + b, 0) + (n > 1 ? ' (' + vals.join(', ') + ')' : '')); hist = hist.slice(0, 10);
      const ul = $('dhist'); ul.textContent = ''; hist.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.append(li); }); $('dhistbox').hidden = false;
      if (reduce()) { vals.forEach(place); shown(); return; }
      busy = true; box.classList.add('rolling'); $('roll').disabled = true;
      if (sides !== 6) { cycle = setInterval(() => { for (const w of box.children) w.firstChild.textContent = R.between(1, sides); }, 70); }
      vals.forEach(place);
      setTimeout(() => { clearInterval(cycle); vals.forEach(place); box.classList.remove('rolling'); busy = false; $('roll').disabled = false; shown(); }, 950);
    }
    document.querySelectorAll('.pt-sides [data-s]').forEach(b => b.addEventListener('click', () => { $('dsides').value = b.dataset.s; chips(); }));
    const chips = () => { const v = Number($('dsides').value); document.querySelectorAll('.pt-sides [data-s]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.s) === v))); };
    $('dsides').addEventListener('input', chips);
    $('roll').addEventListener('click', () => roll());
    $('dcopy').addEventListener('click', () => { if (vals.length) copy(vals.length + 'd' + sides + ': ' + vals.join(', ') + ' (total ' + vals.reduce((a, b) => a + b, 0) + ')'); else say('Roll first.'); });
    build(1); box.firstChild.firstChild && (sides === 6 ? place(1, 0) : 0); chips();
    api = { state: () => ({ sides, vals: vals.slice(), count: box.children.length, history: hist.slice() }), roll };
  }

  if (mode === 'coin') {
    const KEY = 'dilia-coin-v1', coin = $('coin');
    const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && Number.isInteger(o.h) && Number.isInteger(o.t) ? o : { h: 0, t: 0 }; } catch (e) { return { h: 0, t: 0 }; } };
    let tally = rd(), spins = 0, last = -1, busy = false, hist = [];
    const draw = () => { $('chead').textContent = tally.h; $('ctail').textContent = tally.t; const n = tally.h + tally.t; $('cpct').textContent = n ? Math.round(tally.h / n * 100) + '% heads' : 'No flips yet'; };
    function flip(forced) {
      if (busy) return; const r = forced === 0 || forced === 1 ? forced : R.int(2);   // 0 heads, 1 tails
      last = r; spins += 5; $('done').classList.remove('on');
      if (r === 0) tally.h++; else tally.t++; try { localStorage.setItem(KEY, JSON.stringify(tally)); } catch (e) {}
      hist.unshift(r ? 'Tails' : 'Heads'); hist = hist.slice(0, 20);
      const done = () => { busy = false; $('flip').disabled = false; $('dtotal').textContent = r ? 'Tails' : 'Heads'; $('dline').textContent = 'Flip ' + (tally.h + tally.t) + ' in all'; $('done').classList.add('on'); $('chist').textContent = hist.join(' · '); draw(); };
      coin.style.transform = 'rotateY(' + (360 * spins + (r ? 180 : 0)) + 'deg)';
      if (reduce()) { coin.style.transition = 'none'; done(); setTimeout(() => { coin.style.transition = ''; }, 30); return; }
      busy = true; $('flip').disabled = true; setTimeout(done, 1250);
    }
    $('flip').addEventListener('click', () => flip());
    $('cclear').addEventListener('click', () => { tally = { h: 0, t: 0 }; try { localStorage.setItem(KEY, JSON.stringify(tally)); } catch (e) {} hist = []; $('chist').textContent = ''; draw(); say('Tally cleared.'); });
    draw();
    api = { state: () => ({ last, heads: tally.h, tails: tally.t, history: hist.slice() }), flip };
  }

  if (mode === 'number') {
    let out = [];
    function gen() {
      const lo = Number($('nmin').value), hi = Number($('nmax').value), cnt = intIn($('ncount'), 1, 100, 1), norep = $('nnorep').checked;
      if ($('nmin').value.trim() === '' || $('nmax').value.trim() === '' || !Number.isInteger(lo) || !Number.isInteger(hi)) { say('Use whole numbers for the lowest and highest.'); return; }
      if (Math.abs(lo) > 1e9 || Math.abs(hi) > 1e9) { say('Use numbers between -1,000,000,000 and 1,000,000,000.'); return; }
      if (lo > hi) { say('The lowest number must not be above the highest.'); return; }
      const range = hi - lo + 1;
      if (norep && cnt > range) { say('There are only ' + range + ' different numbers in that range.', 5000); return; }
      if (norep) {
        if (range <= 100000) out = R.sample(Array.from({ length: range }, (_, i) => lo + i), cnt);
        else { const s = new Set(); while (s.size < cnt) s.add(R.between(lo, hi)); out = R.shuffle(Array.from(s)); }
      } else out = Array.from({ length: cnt }, () => R.between(lo, hi));
      const box = $('nlist'); box.textContent = '';
      out.forEach(v => { const d = document.createElement('div'); d.className = 'pt-chip' + (out.length === 1 ? ' big' : ''); d.textContent = v.toLocaleString('en-US'); box.append(d); });
      $('dline').textContent = out.length === 1 ? 'Between ' + lo.toLocaleString('en-US') + ' and ' + hi.toLocaleString('en-US') : out.length + ' numbers, ' + lo.toLocaleString('en-US') + ' to ' + hi.toLocaleString('en-US');
      $('done').classList.add('on');
    }
    $('go').addEventListener('click', gen);
    $('ncopy').addEventListener('click', () => { if (out.length) copy(out.join(', ')); else say('Generate first.'); });
    api = { state: () => ({ out: out.slice() }), gen };
  }
  window.DiliaParty = api;
}
