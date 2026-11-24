// Trip builder: trips kept in this browser. Day-by-day stops with time, place, notes and booking refs. Calendar file, print, backup file.
{
  const K = LifeKit, CM = CalcMath, C = DiliaCities, $ = id => document.getElementById(id), esc = K.esc, KEY = 'dilia-trips';
  const KINDS = { flight: ['Flight', '#29c6ff'], stay: ['Stay', '#7a5cff'], food: ['Food', '#ff9f1c'], sight: ['Sight', '#ff2d95'], move: ['Transport', '#2fe08a'], other: ['Other', '#dfe6ff'] };
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let trips = [], cur = 0, stop = () => {}, edit = null;
  const load = () => { try { const t = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(t)) trips = t.filter(x => x && x.start && x.end && Array.isArray(x.items)); } catch (e) {} };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(trips)); $('trsaved').textContent = 'Saved in this browser.'; } catch (e) { $('trsaved').textContent = 'Could not save in this browser (private mode or storage full). Download a backup.'; } };
  const today = () => { const n = new Date(); return CM.iso({ y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }); };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const nice = iso => { const d = CM.ymd(iso); return WD[CM.weekday(d)] + ' ' + d.d + ' ' + MON[d.m - 1]; };
  const daysOf = t => { const a = CM.ymd(t.start), b = CM.ymd(t.end), out = []; if (!a || !b || CM.cmp(a, b) > 0) return out; for (let n = CM.num_(a); n <= CM.num_(b) && out.length < 120; n++) out.push(CM.iso(CM.fromNum(n))); return out; };
  function newTrip() { const s = CM.addDate(CM.ymd(today()), 0, 0, 30).date, e = CM.addDate(s, 0, 0, 4).date; trips.push({ id: uid(), name: 'My trip', from: 'Dubai', to: 'Colombo', start: CM.iso(s), end: CM.iso(e), items: [] }); cur = trips.length - 1; save(); render(); }
  function render() {
    stop();
    $('trsel').innerHTML = trips.map((t, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${esc(t.name)} · ${esc(t.start)}</option>`).join('');
    const t = trips[cur]; $('trbody').hidden = !t; $('trempty').hidden = !!t; if (!t) return;
    $('trname').value = t.name; $('trfrom').value = t.from || ''; $('trto').value = t.to || ''; $('trstart').value = t.start; $('trend').value = t.end;
    const days = daysOf(t), n = days.length;
    $('trpass').innerHTML = `<div class="l"><div class="no">${esc(t.name.toUpperCase())}</div><div class="rt"><span>${esc(t.from || 'Home')}</span><i></i><span>${esc(t.to || 'Away')}</span></div><div class="m">${n ? esc(nice(t.start)) + ' → ' + esc(nice(t.end)) : 'Check the dates'} · ${t.items.length} ${t.items.length === 1 ? 'stop' : 'stops'}</div><div class="lcd" id="trcd"></div></div><div class="r"><div><b>${n}</b><small>${n === 1 ? 'DAY' : 'DAYS'}</small></div></div>`;
    const s = CM.ymd(t.start), td = today();
    if (s && t.start > td) stop = K.countdown($('trcd'), s.y, s.m - 1, s.d); else $('trcd').innerHTML = t.start <= td && t.end >= td ? '<div><b>Now</b><small>on the trip</small></div>' : '';
    const dest = C.find(c => c[0] === t.to);
    $('trdest').textContent = dest ? (() => { const p = CM.parts(dest[1], Date.now()); return 'Time in ' + dest[0] + ' now: ' + String(p.h).padStart(2, '0') + ':' + String(p.mi).padStart(2, '0'); })() : '';
    // days
    $('trdays').innerHTML = days.map((d, k) => { const its = t.items.filter(x => x.date === d).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
      return `<section class="trday"><header><span class="dn">DAY ${k + 1}</span><b>${esc(nice(d))}</b><button type="button" class="tradd" data-add="${d}">+ Add a stop</button></header>${its.length ? `<ol class="trline">${its.map(x => { const kd = KINDS[x.kind] || KINDS.other; return `<li style="--c:${kd[1]}"><span class="tt">${esc(x.time || '—')}</span><div class="tc"><span class="kd">${kd[0]}</span><b>${esc(x.title)}</b>${x.place ? `<span class="pl">${esc(x.place)}</span>` : ''}${x.note ? `<span class="nt">${esc(x.note)}</span>` : ''}${x.ref ? `<span class="rf">Ref: ${esc(x.ref)}</span>` : ''}</div><div class="ta"><button type="button" data-ed="${x.id}" aria-label="Edit">Edit</button><button type="button" data-del="${x.id}" aria-label="Delete">×</button></div></li>`; }).join('')}</ol>` : '<p class="lnote">Nothing planned yet.</p>'}</section>`; }).join('') || '<p class="lcbad">The end date is before the start date.</p>';
    const out = t.items.filter(x => !days.includes(x.date)); $('trout').hidden = !out.length; $('trout').textContent = out.length ? out.length + ' stop(s) fall outside the trip dates and are hidden. Widen the dates to see them.' : '';
  }
  function openForm(date, it) {
    edit = it ? it.id : null; const f = $('trform'); f.hidden = false; $('trfday').innerHTML = daysOf(trips[cur]).map(d => `<option value="${d}"${d === (it ? it.date : date) ? ' selected' : ''}>${esc(nice(d))}</option>`).join('');
    $('trftime').value = it ? it.time : ''; $('trftitle').value = it ? it.title : ''; $('trfplace').value = it ? it.place : ''; $('trfnote').value = it ? it.note : ''; $('trfref').value = it ? it.ref : '';
    $('trfkind').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === (it ? it.kind : 'sight') ? 'true' : 'false'));
    $('trfhead').textContent = it ? 'Edit stop' : 'Add a stop'; f.scrollIntoView({ block: 'center', behavior: 'smooth' }); $('trftitle').focus({ preventScroll: true });
  }
  function submit(e) {
    e.preventDefault(); const title = $('trftitle').value.trim(); if (!title) { $('trftitle').focus(); return; }
    const kind = ($('trfkind').querySelector('[aria-pressed=true]') || {}).dataset?.k || 'other';
    const it = { id: edit || uid(), date: $('trfday').value, time: $('trftime').value, title: title.slice(0, 120), place: $('trfplace').value.trim().slice(0, 160), note: $('trfnote').value.trim().slice(0, 600), ref: $('trfref').value.trim().slice(0, 80), kind };
    const t = trips[cur], i = t.items.findIndex(x => x.id === it.id); if (i >= 0) t.items[i] = it; else t.items.push(it);
    $('trform').hidden = true; edit = null; save(); render();
  }
  function ics(t) {
    const esc2 = s => String(s).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n'), L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dilia//Trip planner//EN', 'CALSCALE:GREGORIAN'];
    const nx = iso => CM.iso(CM.addDate(CM.ymd(iso), 0, 0, 1).date).replace(/-/g, '');
    L.push('BEGIN:VEVENT', 'UID:dilia-trip-' + t.id + '@dilia', 'DTSTAMP:20260101T000000Z', 'DTSTART;VALUE=DATE:' + t.start.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + nx(t.end), 'SUMMARY:' + esc2(t.name + ': ' + (t.from || '') + ' to ' + (t.to || '')), 'TRANSP:TRANSPARENT', 'END:VEVENT');
    t.items.forEach(x => { const d = x.date.replace(/-/g, ''); L.push('BEGIN:VEVENT', 'UID:dilia-stop-' + x.id + '@dilia', 'DTSTAMP:20260101T000000Z'); if (x.time) { const [h, m] = x.time.split(':'); L.push('DTSTART:' + d + 'T' + h + m + '00', 'DURATION:PT1H'); } else L.push('DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + nx(x.date)); L.push('SUMMARY:' + esc2(x.title)); if (x.place) L.push('LOCATION:' + esc2(x.place)); const desc = [x.note, x.ref && 'Ref: ' + x.ref].filter(Boolean).join('\n'); if (desc) L.push('DESCRIPTION:' + esc2(desc)); L.push('END:VEVENT'); });
    L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n';
  }
  // events
  $('trnew').addEventListener('click', newTrip); $('trstart0').addEventListener('click', newTrip);
  $('trsel').addEventListener('change', e => { cur = +e.target.value; render(); });
  $('trdelete').addEventListener('click', () => { if (!trips[cur]) return; const b = $('trdelete'); if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; setTimeout(() => { b.dataset.sure = ''; b.textContent = 'Delete trip'; }, 3000); return; } trips.splice(cur, 1); cur = Math.max(0, cur - 1); b.dataset.sure = ''; b.textContent = 'Delete trip'; save(); render(); });
  $('trcopy').addEventListener('click', () => { const t = trips[cur]; if (!t) return; const c = JSON.parse(JSON.stringify(t)); c.id = uid(); c.name = t.name + ' (copy)'; c.items.forEach(x => { x.id = uid(); }); trips.push(c); cur = trips.length - 1; save(); render(); });
  [['trname', 'name'], ['trfrom', 'from'], ['trto', 'to'], ['trstart', 'start'], ['trend', 'end']].forEach(([id, k]) => $(id).addEventListener('change', e => { const t = trips[cur]; if (!t) return; const v = e.target.value.trim(); if ((k === 'start' || k === 'end') && !CM.ymd(v)) return; t[k] = v.slice(0, 80) || (k === 'name' ? 'My trip' : ''); if (k === 'start' && t.end < t.start) t.end = t.start; save(); render(); }));
  $('trdays').addEventListener('click', e => { const a = e.target.closest('[data-add]'), ed = e.target.closest('[data-ed]'), del = e.target.closest('[data-del]'), t = trips[cur];
    if (a) openForm(a.dataset.add); else if (ed) openForm(null, t.items.find(x => x.id === ed.dataset.ed)); else if (del) { t.items = t.items.filter(x => x.id !== del.dataset.del); save(); render(); } });
  $('trfkind').addEventListener('click', e => { const b = e.target.closest('button'); if (b) $('trfkind').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); });
  $('trform').addEventListener('submit', submit); $('trfcancel').addEventListener('click', () => { $('trform').hidden = true; edit = null; });
  $('trics').addEventListener('click', () => { const t = trips[cur]; if (t) K.download('Dilia-trip-' + t.name.replace(/[^\w-]+/g, '-') + '.ics', ics(t), 'text/calendar'); });
  $('trprint').addEventListener('click', () => window.print());
  $('trbackup').addEventListener('click', () => K.download('Dilia-trips-backup.json', JSON.stringify({ app: 'dilia-trips', v: 1, trips }, null, 1), 'application/json'));
  $('trimport').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { if (f.size > 2e6) throw new Error(); const o = JSON.parse(await f.text()); const list = (o && o.app === 'dilia-trips' && Array.isArray(o.trips)) ? o.trips : null; if (!list) throw new Error(); const ok = list.filter(x => x && typeof x.name === 'string' && CM.ymd(x.start) && CM.ymd(x.end) && Array.isArray(x.items)).map(x => ({ id: uid(), name: String(x.name).slice(0, 80), from: String(x.from || '').slice(0, 80), to: String(x.to || '').slice(0, 80), start: x.start, end: x.end, items: x.items.filter(i => i && typeof i.title === 'string' && CM.ymd(i.date)).map(i => ({ id: uid(), date: i.date, time: /^\d\d:\d\d$/.test(i.time || '') ? i.time : '', title: String(i.title).slice(0, 120), place: String(i.place || '').slice(0, 160), note: String(i.note || '').slice(0, 600), ref: String(i.ref || '').slice(0, 80), kind: KINDS[i.kind] ? i.kind : 'other' })) })); trips = trips.concat(ok); cur = trips.length - 1; save(); render(); $('trsaved').textContent = ok.length + ' trip(s) added from the backup.'; } catch (x) { $('trsaved').textContent = 'That file is not a Dilia trips backup.'; } });
  $('trtocity').innerHTML = C.map(c => `<option value="${esc(c[0])}"></option>`).join('');
  load(); render();
  window.DiliaTrip = { trips: () => JSON.parse(JSON.stringify(trips)), ics: () => trips[cur] ? ics(trips[cur]) : '' };
}
