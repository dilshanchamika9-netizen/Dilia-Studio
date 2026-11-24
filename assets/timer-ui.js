// Countdown timers (data-lc="timer") and stopwatch (data-lc="stopwatch"). Times are kept as clock timestamps,
// so a timer keeps counting when the tab sleeps or the page is reloaded. Nothing leaves the device.
{
  const $ = id => document.getElementById(id), MODE = document.querySelector('[data-lc]').dataset.lc, pad = (n, w = 2) => String(n).padStart(w, '0');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const hms = ms => { const t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + pad(m) : m) + ':' + pad(s); };
  // short beeps from the Web Audio API (no sound files). The context is made on the first tap, as browsers require.
  let ac = null; const audio = () => { try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) {} return ac; };
  function beeps(n) { const c = audio(); if (!c) return; for (let i = 0; i < n; i++) { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.42; o.type = 'sine'; o.frequency.value = i % 2 ? 880 : 1175; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.36); } }

  if (MODE === 'timer') {
    const KEY = 'dilia-timers'; let list = rd(KEY, []); if (!Array.isArray(list)) list = [];
    let alarm = 0, alarmTimer = 0; const baseTitle = document.title;
    const save = () => wr(KEY, list);
    const left = t => t.state === 'run' ? t.end - Date.now() : t.state === 'pause' ? t.left : t.state === 'done' ? 0 : t.total;
    function add(totalMs, label) { totalMs = Math.round(totalMs); if (!(totalMs >= 1000) || totalMs > 99 * 3600e3) return false; list.push({ id: Date.now() + '' + Math.floor(Math.random() * 1000), label: (label || '').slice(0, 40), total: totalMs, state: 'idle', end: 0, left: totalMs }); save(); build(); return true; }
    const find = id => list.find(t => t.id === id);
    function start(t) { audio(); if (t.state === 'done' || t.state === 'idle') t.left = t.total; t.end = Date.now() + t.left; t.state = 'run'; save(); }
    function stopAlarm() { alarm = 0; clearInterval(alarmTimer); $('tmstop').hidden = true; list.forEach(t => { if (t.state === 'done') t.state = 'idle'; }); save(); build(); }
    function ring(t) { alarm++; $('tmstop').hidden = false; beeps(6); try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) {} clearInterval(alarmTimer); alarmTimer = setInterval(() => { beeps(6); }, 4000); setTimeout(() => { if (alarm) stopAlarm(); }, 30000); }
    function build() {
      $('tmlist').innerHTML = list.length ? list.map(t => `<div class="tmc" data-id="${t.id}"><svg class="tmr" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fg" pathLength="100"/></svg><div class="tmb"><b class="tml">${esc(t.label || hms(t.total))}</b><span class="tmt">--:--</span><span class="tms"></span></div><div class="tmx"><button type="button" data-a="go" class="go">Start</button><button type="button" data-a="reset">Reset</button><button type="button" data-a="del" aria-label="Delete timer">×</button></div></div>`).join('') : '<p class="lnote">No timers yet. Pick a preset or set your own above.</p>';
      paint();
    }
    function paint() {
      const now = Date.now(); let soon = null;
      list.forEach(t => {
        if (t.state === 'run' && t.end <= now) { t.state = 'done'; t.left = 0; save(); ring(t); }
        const el = $('tmlist').querySelector(`[data-id="${t.id}"]`); if (!el) return; const l = left(t);
        el.className = 'tmc ' + t.state; el.querySelector('.tmt').textContent = t.state === 'done' ? '0:00' : hms(l);
        el.querySelector('.fg').style.strokeDashoffset = String(100 - (t.state === 'done' ? 100 : (1 - l / t.total) * 100));
        el.querySelector('.tms').textContent = t.state === 'run' ? 'Ends ' + new Date(t.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : t.state === 'done' ? 'Time is up' : t.state === 'pause' ? 'Paused' : 'Ready';
        const go = el.querySelector('[data-a=go]'); go.textContent = t.state === 'run' ? 'Pause' : t.state === 'pause' ? 'Resume' : t.state === 'done' ? 'Restart' : 'Start';
        if (t.state === 'run' && (!soon || t.end < soon.end)) soon = t;
      });
      document.title = soon ? hms(soon.end - now) + ' · ' + baseTitle : baseTitle;
    }
    $('tmlist').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const el = b.closest('.tmc'), t = find(el.dataset.id); if (!t) return; const a = b.dataset.a;
      if (a === 'go') { if (t.state === 'run') { t.left = Math.max(0, t.end - Date.now()); t.state = 'pause'; save(); } else { if (t.state === 'done') stopAlarm(); start(t); } paint(); }
      else if (a === 'reset') { t.state = 'idle'; t.left = t.total; save(); paint(); }
      else if (a === 'del') { list = list.filter(x => x !== t); save(); build(); }
    });
    document.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', () => { add(+b.dataset.min * 60e3, b.dataset.label || ''); }));
    $('tmadd').addEventListener('click', () => { const h = +$('tmh').value || 0, m = +$('tmm').value || 0, s = +$('tms').value || 0; if (!add(((h * 60 + m) * 60 + s) * 1000, $('tmname').value.trim())) { $('tmmsg').textContent = 'Enter a time from 1 second to 99 hours.'; } else { $('tmmsg').textContent = ''; $('tmname').value = ''; } });
    $('tmstop').addEventListener('click', stopAlarm);
    $('tmclear').addEventListener('click', () => { list = []; save(); build(); });
    build(); setInterval(paint, 250); addEventListener('storage', e => { if (e.key === KEY) { list = rd(KEY, []); build(); } });
    window.DiliaTimer = { add, list: () => list, paint, ring: () => alarm };
  }

  if (MODE === 'stopwatch') {
    const KEY = 'dilia-stopwatch'; let S = rd(KEY, null); if (!S || typeof S !== 'object') S = { run: false, at: 0, acc: 0, laps: [] };
    const save = () => wr(KEY, S), now = () => S.run ? S.acc + (Date.now() - S.at) : S.acc;
    const fmt = ms => { ms = Math.max(0, Math.floor(ms)); const h = Math.floor(ms / 3600e3), m = Math.floor(ms % 3600e3 / 60e3), s = Math.floor(ms % 60e3 / 1000), c = Math.floor(ms % 1000 / 10); return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s) + '.' + pad(c); };
    function toggle() { if (S.run) { S.acc += Date.now() - S.at; S.run = false; } else { S.at = Date.now(); S.run = true; } save(); paint(); }
    function lap() { if (!S.run && !S.acc) return; const t = now(); S.laps.push(t); save(); laps(); }
    function reset() { S = { run: false, at: 0, acc: 0, laps: [] }; save(); paint(); laps(); }
    function laps() {
      const L = S.laps, d = L.map((t, i) => t - (i ? L[i - 1] : 0)); const lo = d.length > 1 ? Math.min(...d) : -1, hi = d.length > 1 ? Math.max(...d) : -1;
      $('swlaps').innerHTML = L.length ? '<table><thead><tr><th>Lap</th><th>Lap time</th><th>Total</th></tr></thead><tbody>' + L.map((t, i) => { const k = L.length - 1 - i; return `<tr class="${d[k] === lo ? 'fast' : d[k] === hi ? 'slow' : ''}"><td>${k + 1}</td><td>${fmt(d[k])}</td><td>${fmt(L[k])}</td></tr>`; }).join('') + '</tbody></table>' : '<p class="lnote">Press Lap while the watch runs to record split times.</p>';
      $('swcopy').disabled = $('swcsv').disabled = !L.length;
    }
    function paint() { $('swtime').textContent = fmt(now()); $('swgo').textContent = S.run ? 'Stop' : S.acc ? 'Resume' : 'Start'; $('swgo').classList.toggle('stop', S.run); $('swlap').disabled = !S.run && !S.acc; $('swreset').disabled = S.run || (!S.acc && !S.laps.length); document.title = S.run ? fmt(now()) + ' · Stopwatch' : 'Stopwatch'; }
    const text = () => S.laps.map((t, i) => 'Lap ' + (i + 1) + '\t' + fmt(t - (i ? S.laps[i - 1] : 0)) + '\t' + fmt(t)).join('\n');
    $('swgo').addEventListener('click', toggle); $('swlap').addEventListener('click', lap); $('swreset').addEventListener('click', reset);
    $('swcopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(text()); $('swmsg').textContent = 'Laps copied.'; } catch (e) { $('swmsg').textContent = 'Could not copy. Select the table instead.'; } });
    $('swcsv').addEventListener('click', () => { const csv = 'Lap,Lap time,Total\n' + S.laps.map((t, i) => (i + 1) + ',' + fmt(t - (i ? S.laps[i - 1] : 0)) + ',' + fmt(t)).join('\n'), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'stopwatch-laps.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
    addEventListener('keydown', e => { const t = document.activeElement.tagName; if (/^(INPUT|SELECT|TEXTAREA)$/.test(t) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.code === 'Space') { if (t === 'BUTTON') return; e.preventDefault(); toggle(); } else if (e.key === 'l' || e.key === 'L') lap(); });
    laps(); paint(); setInterval(paint, 37);
    window.DiliaStopwatch = { state: () => S, fmt, toggle, lap, reset };
  }
}
