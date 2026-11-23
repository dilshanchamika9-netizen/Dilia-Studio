// Reaction time: wait for green, then tap as fast as you can. 5 tries per round. Times stay in this browser (last 200 tries).
// Times include your screen and device delay, so compare only on the same device. A fun test, not a medical one.
{
  const P = DiliaPlay, $ = id => document.getElementById(id);
  const KEY = 'dilia-reaction-v1', pad = $('rxpad'), msg = $('msg');
  const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && Array.isArray(o.a) ? o : { a: [] }; } catch (e) { return { a: [] }; } };
  const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 3000); };
  const set = (id, t) => { $(id).textContent = t; };
  const rnd = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; };
  const ROUND = 5;
  let st = 'idle', round = [], t0 = 0, wait = 0, raf = 0, lastRound = null;

  function screen(s, big, sub) { st = s; pad.dataset.s = s; set('rxbig', big); set('rxsub', sub || ''); pad.setAttribute('aria-label', big + '. ' + (sub || '')); }
  function dots() {
    const box = $('rxdots'); box.textContent = '';
    for (let i = 0; i < ROUND; i++) { const d = document.createElement('span'); d.className = i < round.length ? 'on' : ''; d.textContent = round[i] != null ? round[i] + ' ms' : (i + 1); box.append(d); }
    set('rxtry', Math.min(round.length + 1, ROUND) + '/' + ROUND);
  }
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;

  function ready() { screen('idle', round.length ? 'Tap to go on' : 'Tap to start', round.length ? 'Try ' + (round.length + 1) + ' of ' + ROUND : '5 tries. Wait for green, then tap.'); dots(); }
  function arm() {
    $('done').classList.remove('on');
    screen('wait', 'Wait for green…', 'Do not tap yet'); t0 = 0;
    wait = setTimeout(() => {
      pad.dataset.s = 'go'; st = 'go'; set('rxbig', 'TAP!'); set('rxsub', '');
      raf = requestAnimationFrame(() => { t0 = performance.now(); });   // timing starts when the green has been drawn
    }, 1500 + Math.floor(rnd() * 3000));
  }
  function hit() {
    if (!t0) return;   // the green has not been drawn yet
    const ms = Math.max(1, Math.round(performance.now() - t0)); cancelAnimationFrame(raf);
    round.push(ms); const o = rd(); o.a.push(ms); if (o.a.length > 200) o.a = o.a.slice(-200); wr(o);
    set('rxlast', ms + ' ms');
    stats(); chart(); dots();
    if (round.length >= ROUND) { finish(); return; }
    screen('result', ms + ' ms', 'Tap to go on · try ' + (round.length + 1) + ' of ' + ROUND);
  }
  function early() { clearTimeout(wait); screen('early', 'Too soon!', 'Wait for green. Tap to try again.'); }
  function finish() {
    const a = avg(round), b = Math.min(...round); lastRound = { avg: a, best: b };
    screen('result', a + ' ms', 'Average of ' + ROUND + '. Tap for another round.');
    $('done').classList.add('on'); set('dtime', a + ' ms'); set('dline', 'Fastest try ' + b + ' ms · ' + label(a));
    round = []; P.prepare(shareData());
  }
  const label = a => a < 200 ? 'very quick' : a < 250 ? 'quick' : a < 300 ? 'about average' : a < 400 ? 'a little slow' : 'take your time';
  const shareData = () => ({ title: 'Reaction time', line: '⚡ ' + lastRound.avg + ' ms average of ' + ROUND + ' · best ' + lastRound.best + ' ms', big: lastRound.avg + ' ms', lines: ['Average of ' + ROUND + ' tries', 'Fastest ' + lastRound.best + ' ms'], date: P.niceDate(P.today()), file: 'dilia-reaction-' + lastRound.avg, foot: 'Fun test, not medical. No sign-up, no ads.' });

  function press() {
    if (st === 'idle' || st === 'result' || st === 'early') { if (st === 'result' && !round.length) $('done').classList.remove('on'); arm(); }
    else if (st === 'wait') early();
    else if (st === 'go') hit();
  }

  // ---- history ----
  function stats() {
    const a = rd().a; set('rxbest', a.length ? Math.min(...a) + ' ms' : '–'); set('rxavg', a.length ? avg(a) + ' ms' : '–'); set('rxcount', a.length);
    set('rxlast', a.length ? a[a.length - 1] + ' ms' : '–');
  }
  function chart() {
    const svg = $('rxchart'), a = rd().a.slice(-30), NS = 'http://www.w3.org/2000/svg'; svg.textContent = '';
    if (!a.length) { set('rxnote', 'Your last tries will show here.'); return; }
    set('rxnote', 'Last ' + a.length + ' tries. Lower is faster.');
    const W = 300, H = 110, top = Math.max(500, ...a), bw = W / 30;
    a.forEach((v, i) => { const h = Math.max(3, v / top * (H - 8)), r = document.createElementNS(NS, 'rect'); r.setAttribute('x', i * bw + 1); r.setAttribute('width', bw - 2); r.setAttribute('y', H - h); r.setAttribute('height', h); r.setAttribute('rx', 2); r.setAttribute('class', v === Math.min(...a) ? 'bb' : ''); svg.append(r); });
    const t = document.createElementNS(NS, 'title'); t.textContent = 'Reaction times in milliseconds: ' + a.join(', '); svg.prepend(t);
  }

  // ---- input: pointer down (no click delay) and keys ----
  pad.addEventListener('pointerdown', e => { e.preventDefault(); pad.focus(); press(); });
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t.closest && t.closest('header, [role=dialog]')))) return;
    if (t && t.tagName === 'BUTTON') return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && st === 'wait') { clearTimeout(wait); round = round.slice(); ready(); say('Paused: you left the page.'); } });
  $('share').addEventListener('click', () => P.share(shareData(), say));
  $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  $('rxclear').addEventListener('click', () => { if (!rxclear.ask) { rxclear.ask = 1; say('Tap Clear history again to delete all times.'); setTimeout(() => { rxclear.ask = 0; }, 4000); return; } rxclear.ask = 0; wr({ a: [] }); round = []; stats(); chart(); ready(); $('done').classList.remove('on'); say('History cleared.'); });
  const rxclear = $('rxclear');
  ready(); stats(); chart();
  window.DiliaReaction = { state: () => ({ st, round: round.slice() }) };
}
