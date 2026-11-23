// Typing test: 15, 30 or 60 seconds, five languages. The timer starts at your first key.
// Score rules live in DiliaPlayGen.typingScore (tested in Node). Results stay in this browser.
{
  const G = DiliaPlayGen, P = DiliaPlay, W = DiliaWords, $ = id => document.getElementById(id);
  const KEY = 'dilia-typing-v1', PREF = 'dilia-typing-pref', box = $('tybox'), wordsEl = $('tywords'), inp = $('tin'), msg = $('msg');
  const rd = (k, d) => { try { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o && typeof o === 'object' ? o : d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 3000); };
  const set = (id, t) => { $(id).textContent = t; };
  const rnd = k => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % k; };
  const NAMES = { en: 'English', ar: 'Arabic', es: 'Spanish', hi: 'Hindi', pt: 'Portuguese' };
  const SHAPED = { ar: 1, hi: 1 };   // joined scripts: mark whole words, not single letters, so the letters keep their shapes

  const pref = rd(PREF, {});
  let lang = NAMES[pref.l] ? pref.l : 'en', dur = [15, 30, 60].includes(pref.d) ? pref.d : 30;
  let target = [], els = [], typed = [], i = 0, t0 = 0, run = false, over = false, tick = 0, last = null;

  function build() {
    clearInterval(tick); run = false; over = false; typed = []; i = 0; t0 = 0; last = null;
    const list = W[lang], n = dur === 15 ? 90 : dur === 30 ? 160 : 300; target = []; let prev = -1;
    for (let k = 0; k < n; k++) { let r = rnd(list.length); if (r === prev) r = (r + 1) % list.length; prev = r; target.push(list[r]); }
    const rtl = lang === 'ar';
    wordsEl.textContent = ''; wordsEl.dir = rtl ? 'rtl' : 'ltr'; wordsEl.lang = lang; wordsEl.scrollTop = 0; wordsEl.className = 'tywords' + (SHAPED[lang] ? ' shaped' : '');
    inp.dir = rtl ? 'rtl' : 'ltr'; inp.lang = lang; inp.value = ''; inp.maxLength = 40;
    els = target.map((w, k) => { const e = document.createElement('span'); e.className = 'tw'; paint(e, w, '', k === 0 ? 'cur' : ''); wordsEl.append(e); wordsEl.append(document.createTextNode(' ')); return e; });
    $('done').classList.remove('on');
    set('ttime', dur); set('twpm', 0);
    document.querySelectorAll('.tlang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.l === lang ? 'true' : 'false'));
    document.querySelectorAll('.msize button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.d === dur ? 'true' : 'false'));
    set('thint', 'Click the box and start typing. The timer starts at your first key.' + (lang === 'ar' || lang === 'hi' ? ' You need a ' + NAMES[lang] + ' keyboard.' : ''));
    bests();
  }
  // one word: letters coloured as typed (Latin scripts) or the whole word marked (Arabic, Hindi)
  function paint(e, w, t, cls, final) {
    e.className = 'tw' + (cls ? ' ' + cls : '');
    if (SHAPED[lang]) { e.textContent = w; if (cls === 'cur' && t && !w.normalize('NFC').startsWith(t.normalize('NFC'))) e.classList.add('bad'); return; }
    e.textContent = '';
    const a = Array.from(w), b = Array.from(t);
    a.forEach((c, j) => { const s = document.createElement('i'); s.textContent = c; if (j < b.length) s.className = b[j] === c ? 'ok' : 'bad'; else if (final) s.className = 'miss'; e.append(s); });
    b.slice(a.length).forEach(c => { const s = document.createElement('i'); s.textContent = c; s.className = 'x'; e.append(s); });
  }
  function scrollTo() {
    const cur = els[i]; if (!cur) return; const lh = cur.offsetHeight || 30, d = cur.getBoundingClientRect().top - wordsEl.getBoundingClientRect().top;
    if (d > lh * 1.4) wordsEl.scrollTop += d - lh * 0.2;
  }

  function onInput() {
    if (over) { inp.value = ''; return; }
    let v = inp.value;
    if (!run && v.trim()) { run = true; t0 = performance.now(); tick = setInterval(clock, 100); }
    const sp = v.search(/\s/);
    if (sp === 0) { inp.value = v.replace(/^\s+/, ''); return; }       // leading spaces are ignored
    if (sp > 0) {                                                       // space: the word is done
      const w = v.slice(0, sp).normalize('NFC'); typed.push(w);
      const exact = w === target[i].normalize('NFC');
      paint(els[i], target[i], w, exact ? 'good' : 'wrong', true); i++; inp.value = v.slice(sp).replace(/^\s+/, '');
      if (els[i]) paint(els[i], target[i], inp.value, 'cur');
      scrollTo(); if (i >= target.length) { finish(); return; } v = inp.value;
    }
    paint(els[i], target[i], v.normalize('NFC'), 'cur');
  }
  function state() {
    const part = inp.value.replace(/\s+/g, '').normalize('NFC'), t = part ? typed.concat([part]) : typed.slice();
    return { t, partial: !!part };
  }
  function clock() {
    const el = (performance.now() - t0) / 1000;
    set('ttime', Math.max(0, Math.ceil(dur - el)));
    if (el >= 3) { const s = state(), r = G.typingScore(target, s.t, el, s.partial); set('twpm', Math.round(r.wpm)); }
    if (el >= dur) finish();
  }
  function finish() {
    if (over) return; over = true; clearInterval(tick);
    const el = Math.min(dur, (performance.now() - t0) / 1000), s = state(), r = G.typingScore(target, s.t, i >= target.length ? Math.max(el, 1) : dur, s.partial);
    inp.value = ''; inp.blur(); set('ttime', 0); set('twpm', Math.round(r.wpm));
    const o = rd(KEY, { best: {}, hist: [] }), k = lang + '-' + dur; o.best = o.best || {}; o.hist = Array.isArray(o.hist) ? o.hist : [];
    const w = Math.round(r.wpm), acc = Math.round(r.acc * 10) / 10, nb = !o.best[k] || w > o.best[k].wpm;
    if (nb && w > 0) o.best[k] = { wpm: w, acc };
    o.hist.push({ l: lang, d: dur, wpm: w, acc }); o.hist = o.hist.slice(-10); wr(KEY, o);
    last = { wpm: w, acc, raw: Math.round(r.raw), words: r.words, nb: nb && w > 0 };
    $('done').classList.add('on'); set('dtime', w + ' WPM');
    set('dline', 'Accuracy ' + acc + '% · raw ' + last.raw + ' · ' + r.words + ' words right · ' + NAMES[lang] + ' · ' + dur + ' s' + (last.nb ? ' · new best!' : ''));
    if (last.nb) P.burst($('tybox').parentNode);
    bests(); P.prepare(shareData());
  }
  const shareData = () => ({ title: 'Typing test · ' + NAMES[lang] + ' · ' + dur + ' s', line: '⌨️ ' + last.wpm + ' WPM · ' + last.acc + '% accuracy', big: last.wpm + ' WPM', lines: ['Accuracy ' + last.acc + '%', NAMES[lang] + ', ' + dur + ' seconds', last.words + ' words right'], date: P.niceDate(P.today()), file: 'dilia-typing-' + lang + dur + '-' + last.wpm, foot: 'How fast are you? No sign-up, no ads.' });

  function bests() {
    const o = rd(KEY, { best: {}, hist: [] }), b = (o.best || {})[lang + '-' + dur];
    set('tbest', b ? b.wpm + ' WPM' : '–'); set('tbest2', b ? 'Accuracy ' + b.acc + '% · ' + NAMES[lang] + ', ' + dur + ' s' : 'Your best for ' + NAMES[lang] + ', ' + dur + ' s will show here.');
    const ul = $('thist'); ul.textContent = '';
    (Array.isArray(o.hist) ? o.hist : []).slice().reverse().forEach(h => { const li = document.createElement('li'); li.textContent = h.wpm + ' WPM · ' + h.acc + '% · ' + (NAMES[h.l] || h.l) + ' ' + h.d + ' s'; ul.append(li); });
    if (!ul.children.length) { const li = document.createElement('li'); li.textContent = 'No tests yet.'; ul.append(li); }
  }

  inp.addEventListener('input', onInput);
  box.addEventListener('mousedown', e => { if (e.target !== inp) { e.preventDefault(); inp.focus(); } });
  box.addEventListener('click', () => inp.focus());
  inp.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); build(); inp.focus(); } });
  $('restart').addEventListener('click', () => { build(); inp.focus(); });
  $('dagain').addEventListener('click', () => { build(); inp.focus(); });
  $('share').addEventListener('click', () => P.share(shareData(), say));
  $('saveimg').addEventListener('click', () => P.saveImage(shareData()));
  document.querySelectorAll('.tlang button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.l; wr(PREF, { l: lang, d: dur }); build(); }));
  document.querySelectorAll('.msize button').forEach(b => b.addEventListener('click', () => { dur = +b.dataset.d; wr(PREF, { l: lang, d: dur }); build(); }));
  document.addEventListener('visibilitychange', () => { if (document.hidden && run && !over) { build(); say('Test stopped because you left the page.'); } });
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.activeElement !== inp) { build(); } });
  build();
  if (matchMedia('(pointer:fine)').matches) inp.focus();
  window.DiliaTyping = { state: () => ({ lang, dur, i, typed: typed.slice(), over, run, words: target.slice(0, 40), last }) };
}
