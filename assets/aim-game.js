// Aim trainer: hit as many targets as you can in 30 seconds. Targets shrink as you go.
{
  const M = Mini, $ = M.$, stage = $('aim'), LEN = 30;
  let tgt = null, hits = 0, miss = 0, times = [], t0 = 0, left = LEN, tim = 0, running = false, shown = 0, size = 64;
  const panel = M.panel('aim', 'Aim trainer', () => reset());
  function hud() { $('ahits').textContent = hits; $('atime').textContent = Math.ceil(left); $('abest').textContent = M.getBest('aim', 'hits') || 0; }
  function reset() { clearInterval(tim); running = false; hits = miss = 0; times = []; left = LEN; size = 64; if (tgt) { tgt.remove(); tgt = null; } stage.classList.remove('on'); $('astart').hidden = false; panel.hide(); hud(); M.say('Press Start, then hit each target as fast as you can.', 4000); }
  function begin() { reset(); running = true; $('astart').hidden = true; M.say(''); spawn(); const end = performance.now() + LEN * 1000; tim = setInterval(() => { left = Math.max(0, (end - performance.now()) / 1000); hud(); if (left <= 0) finish(); }, 100); }
  function spawn() {
    if (tgt) tgt.remove(); const r = stage.getBoundingClientRect(), s = Math.max(30, size * Math.min(1, r.width / 520)); tgt = document.createElement('button'); tgt.type = 'button'; tgt.className = 'atg'; tgt.setAttribute('aria-label', 'Target');
    tgt.style.width = tgt.style.height = s + 'px'; tgt.style.left = (M.rnd() * (r.width - s)) + 'px'; tgt.style.top = (M.rnd() * (r.height - s)) + 'px'; stage.append(tgt); t0 = performance.now();
    tgt.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (!running) return; hits++; times.push(performance.now() - t0); size = Math.max(34, size - 1.2); hud(); spawn(); });
  }
  stage.addEventListener('pointerdown', e => { if (running && e.target === stage) { miss++; stage.classList.add('miss'); setTimeout(() => stage.classList.remove('miss'), 120); } });
  function finish() {
    clearInterval(tim); running = false; if (tgt) { tgt.remove(); tgt = null; } $('astart').hidden = false; const acc = hits + miss ? Math.round(hits / (hits + miss) * 100) : 0, avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0, r = M.best('aim', 'hits', hits, true);
    panel.show('Time is up', hits + ' hits', 'Accuracy ' + acc + '%, average ' + avg + ' ms per target.' + (r.isNew ? ' New best.' : ' Best: ' + r.best + '.'), { title: 'Aim trainer', line: '🎯 ' + hits + ' hits · ' + acc + '% accuracy · ' + avg + ' ms', big: String(hits), lines: [acc + '% accuracy', avg + ' ms average'] }); hud();
  }
  $('astart').addEventListener('click', begin); $('newgame').addEventListener('click', reset);
  reset();
  window.DiliaAim = { state: () => ({ hits, miss, running, left }), start: begin, hit: () => { if (tgt) tgt.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }, end: finish };
}
