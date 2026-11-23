// Wheel spinner: type entries, spin, get one fair winner. Entries and recent results stay in this browser.
// The winner is chosen first with a fair random pick, then the wheel is turned so it stops on that entry.
{
  const R = PartyRng, $ = id => document.getElementById(id);
  const KEY = 'dilia-wheel-v1', MAXN = 50, MAXLEN = 40, TAU = Math.PI * 2;
  const COLS = ['#e5007d', '#7a5cff', '#0780b8', '#0f8a4f', '#c2410c', '#6d28d9', '#be123c', '#0e7490'];
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const msg = $('msg'), cv = $('wcv'), ta = $('wents');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 3500); };
  let list = [], rot = 0, spinning = false, winner = -1, raf = 0, recent = [];

  function parse(text) {
    const out = []; let cut = false, over = false;
    for (const raw of String(text).split(/\r?\n/)) {
      const s = raw.trim().replace(/\s+/g, ' '); if (!s) continue;
      if (out.length >= MAXN) { over = true; continue; }
      const ch = Array.from(s); if (ch.length > MAXLEN) { cut = true; out.push(ch.slice(0, MAXLEN).join('')); } else out.push(s);
    }
    return { list: out, cut, over };
  }
  const mod = x => ((x % TAU) + TAU) % TAU;
  const sectorAt = r => { const n = list.length; return Math.min(n - 1, Math.floor(mod(-Math.PI / 2 - r) / (TAU / n))); };
  const colour = (i, n) => { let k = i % COLS.length; if (i === n - 1 && n > 1 && k === 0) k = 3; return COLS[k]; };

  function draw() {
    const g = cv.getContext('2d'), W = cv.width, c = W / 2, r = c - 14, n = list.length;
    g.clearRect(0, 0, W, W);
    const F = s => '700 ' + s + 'px Archivo, system-ui, sans-serif';
    if (n < 2) {
      g.beginPath(); g.arc(c, c, r, 0, TAU); g.fillStyle = '#3a4466'; g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = F(34); g.fillText('Add 2 or more entries', c, c + 12); return;
    }
    const a = TAU / n, fs = Math.max(12, Math.min(34, Math.floor(r * 0.7 * a * 0.5))), maxW = r - 92;
    g.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      g.beginPath(); g.moveTo(c, c); g.arc(c, c, r, rot + i * a, rot + (i + 1) * a); g.closePath();
      g.fillStyle = colour(i, n); g.fill(); g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke();
      g.save(); g.translate(c, c); g.rotate(rot + (i + 0.5) * a); g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = F(fs);
      let t = list[i]; if (g.measureText(t).width > maxW) { const ch = Array.from(t); while (ch.length > 1 && g.measureText(ch.join('') + '…').width > maxW) ch.pop(); t = ch.join('') + '…'; }
      g.fillText(t, r - 22, 0); g.restore();
    }
    g.beginPath(); g.arc(c, c, 30, 0, TAU); g.fillStyle = '#0b1220'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke();
  }
  function sync(persist) {
    $('wcount').textContent = list.length + (list.length === 1 ? ' entry' : ' entries');
    cv.setAttribute('aria-label', list.length < 2 ? 'Wheel. Add 2 or more entries.' : 'Wheel with ' + list.length + ' entries: ' + list.join(', '));
    $('spin').setAttribute('aria-disabled', list.length < 2 ? 'true' : 'false');
    if (persist) { const o = rd(); o.text = list.join('\n'); wr(o); }
    draw();
  }
  function renderRecent() {
    const ul = $('wrecent'); ul.textContent = '';
    recent.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.append(li); });
    $('wrecentbox').hidden = !recent.length;
  }
  function finish() {
    spinning = false; $('spin').disabled = false; $('wshuffle').disabled = false;
    winner = sectorAt(rot); const name = list[winner];
    $('dtime').textContent = name; $('dline').textContent = 'Entry ' + (winner + 1) + ' of ' + list.length;
    $('done').classList.add('on'); say('The wheel says: ' + name, 6000);
    recent.unshift(name); recent = recent.slice(0, 8); const o = rd(); o.recent = recent; wr(o); renderRecent();
    if ($('wrm').checked) setTimeout(removeWinner, reduce() ? 0 : 1400);
  }
  function removeWinner() {
    if (spinning || winner < 0 || winner >= list.length) return;
    list.splice(winner, 1); ta.value = list.join('\n'); winner = -1; rot = 0; $('done').classList.remove('on'); sync(true);
  }
  function spin(forced) {
    if (spinning) return;
    const n = list.length; if (n < 2) { say('Add at least 2 entries first.'); return; }
    const w = Number.isInteger(forced) && forced >= 0 && forced < n ? forced : R.int(n), a = TAU / n;
    const jit = (R.int(801) / 800 - 0.5) * 0.7 * a;                  // where inside the winning slice it stops
    const target = mod(-Math.PI / 2 - ((w + 0.5) * a + jit));
    const total = rot + mod(target - mod(rot)) + TAU * (5 + R.int(3));
    $('done').classList.remove('on'); spinning = true; $('spin').disabled = true; $('wshuffle').disabled = true;
    if (reduce()) { rot = mod(total); draw(); finish(); return; }
    const t0 = performance.now(), dur = 4200, from = rot;
    cancelAnimationFrame(raf);
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 4);
      rot = from + (total - from) * e; draw();
      if (t < 1) raf = requestAnimationFrame(step); else { rot = mod(total); draw(); finish(); }
    })(t0);
  }

  ta.addEventListener('input', () => {
    if (spinning) return;
    const p = parse(ta.value); list = p.list; winner = -1; $('done').classList.remove('on');
    say(p.over ? 'Only the first ' + MAXN + ' entries are used.' : p.cut ? 'Entries longer than ' + MAXLEN + ' characters are shortened.' : '');
    sync(true);
  });
  $('spin').addEventListener('click', () => spin());
  $('wshuffle').addEventListener('click', () => { if (spinning || list.length < 2) return; list = R.shuffle(list); ta.value = list.join('\n'); $('done').classList.remove('on'); sync(true); });
  $('wremove').addEventListener('click', removeWinner);
  $('wclear').addEventListener('click', () => { recent = []; const o = rd(); o.recent = []; wr(o); renderRecent(); });
  $('wlink').addEventListener('click', () => {
    const url = location.origin + location.pathname + '#w=' + encodeURIComponent(list.join('\n'));
    if (url.length > 1900) { say('This list is too long for a link. Shorten it or send the entries as text.', 5000); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => say('Link copied. Anyone who opens it gets this wheel.'), () => say('Could not copy. Copy the address bar after the page reloads.', 5000));
    try { history.replaceState(null, '', '#w=' + encodeURIComponent(list.join('\n'))); } catch (e) {}
  });
  addEventListener('keydown', e => {
    if (e.key !== ' ' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName) || (t.closest && t.closest('header, [role=dialog]')))) return;
    e.preventDefault(); spin();
  });

  // start: link first, then what this browser saved, then an example
  let text = '';
  if (location.hash.startsWith('#w=')) { try { text = decodeURIComponent(location.hash.slice(3)); } catch (e) { text = ''; } }
  const o = rd(); recent = Array.isArray(o.recent) ? o.recent.filter(x => typeof x === 'string').slice(0, 8) : [];
  if (!text) text = typeof o.text === 'string' ? o.text : '';
  if (!parse(text).list.length) text = 'Pizza\nBurgers\nSushi\nTacos\nPasta\nSalad';
  ta.value = parse(text).list.join('\n'); list = parse(text).list; sync(false); renderRecent();
  window.DiliaWheel = { state: () => ({ entries: list.slice(), spinning, winner, rot, recent: recent.slice() }), spin };
}
