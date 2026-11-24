// Speed reading: words appear one at a time at the speed you choose. Read the text, then answer three questions. Your own text works too (no questions).
{
  const M = Mini, $ = M.$, T = DiliaTexts, disp = $('srw'), wpmB = document.querySelectorAll('[data-wpm]');
  let wpm = 300, txt = T[0], words = [], i = 0, timer = 0, state = 'idle', t0 = 0, own = false, ans = [], dur = 0;
  const panel = M.panel('speed', 'Speed reading', () => reset());
  const sel = $('srtext'); sel.innerHTML = T.map((t, k) => `<option value="${k}">${t.title}</option>`).join('') + '<option value="own">Your own text…</option>';
  const orp = w => { const n = w.length, k = n <= 1 ? 0 : n <= 5 ? 1 : n <= 9 ? 2 : 3; return `<span>${w.slice(0, k)}</span><b>${w[k] || ''}</b><span>${w.slice(k + 1)}</span>`; };
  function reset() { clearTimeout(timer); state = 'idle'; i = 0; ans = []; panel.hide(); $('srq').hidden = true; $('srq').innerHTML = ''; $('srstart').hidden = false; $('srstart').textContent = 'Start'; $('srown').hidden = !own; disp.innerHTML = '<span class="srh">Press Start</span>'; $('srprog').style.width = '0%'; $('srwpm').textContent = wpm; $('srwords').textContent = '–'; best(); M.say(''); }
  function best() { const v = M.getBest('speed', 'w' + wpm); $('sbestw').textContent = v == null ? '–' : v + '/3'; }
  function load() { own = sel.value === 'own'; if (!own) txt = T[+sel.value]; reset(); }
  function parse() { const raw = own ? $('srown').value : txt.text; words = raw.trim().split(/\s+/).filter(Boolean); $('srwords').textContent = words.length; }
  function delay(w) { let d = 60000 / wpm; if (/[.!?]$/.test(w)) d *= 2; else if (/[,;:]$/.test(w)) d *= 1.5; if (w.length > 9) d *= 1.25; return d; }
  function tick() { if (state !== 'run') return; if (i >= words.length) return finish(); const w = words[i++]; disp.innerHTML = orp(w); $('srprog').style.width = Math.round(i / words.length * 100) + '%'; timer = setTimeout(tick, delay(w)); }
  function start() { if (state === 'run') { state = 'pause'; clearTimeout(timer); $('srstart').textContent = 'Resume'; return; } if (state === 'idle') { parse(); if (words.length < 5) { M.say('Add at least a few words of text first.', 2500); return; } i = 0; t0 = Date.now(); } state = 'run'; $('srstart').textContent = 'Pause'; M.say(''); tick(); }
  function finish() { clearTimeout(timer); state = 'done'; dur = (Date.now() - t0) / 1000; $('srstart').hidden = true; disp.innerHTML = '<span class="srh">Done</span>'; if (own) return result(null); askQuestions(); }
  function askQuestions() { const q = txt.q; $('srq').hidden = false; $('srq').innerHTML = '<h3>Three questions</h3>' + q.map((x, k) => `<fieldset><legend>${x.q}</legend>${x.o.map((o, j) => `<label><input type="radio" name="q${k}" value="${j}"> ${o}</label>`).join('')}</fieldset>`).join('') + '<button type="button" class="pbtn go" id="srsub">Check answers</button>'; $('srsub').addEventListener('click', submit); }
  function submit() { const q = txt.q; const a = q.map((x, k) => { const r = document.querySelector(`input[name=q${k}]:checked`); return r ? +r.value : -1; }); if (a.includes(-1)) { M.say('Answer all three questions.', 2000); return; } result(a.filter((v, k) => v === q[k].a).length); }
  function result(score) {
    const label = score == null ? 'Your own text' : score + '/3 right'; if (score != null) M.best('speed', 'w' + wpm, score, true); best();
    panel.show('Finished', wpm + ' wpm', score == null ? 'You read ' + words.length + ' words at ' + wpm + ' words per minute.' : 'You read ' + words.length + ' words at ' + wpm + ' wpm and got ' + label + '.', { title: 'Speed reading', line: wpm + ' wpm' + (score == null ? '' : ', ' + label), big: wpm + ' wpm', lines: [score == null ? words.length + ' words' : label] });
    $('srq').hidden = true;
  }
  wpmB.forEach(b => b.addEventListener('click', () => { wpm = +b.dataset.wpm; wpmB.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); if (state === 'idle') $('srwpm').textContent = wpm; else { state = 'idle'; reset(); } }));
  sel.addEventListener('change', load); $('srstart').addEventListener('click', start); $('newgame').addEventListener('click', load);
  disp.parentElement.addEventListener('click', e => { if (e.target.id !== 'srstart' && state === 'run') start(); });
  load();
  window.DiliaSpeed = { state: () => ({ state, wpm, i, n: words.length, own, q: txt.q }), start, skip: () => { i = words.length; if (state === 'idle') { parse(); t0 = Date.now() - 1000; i = words.length; state = 'run'; } finish(); }, answer: (k, j) => { document.querySelector(`input[name=q${k}][value="${j}"]`).checked = true; }, submit };
}
