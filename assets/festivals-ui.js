// Festival calendar: next-festival countdown, festivals on a year river, cards with countdowns, filter by tradition, calendar file.
{
  const K = LifeKit, F = DiliaFest, $ = id => document.getElementById(id), esc = K.esc;
  const COL = { Islamic: '#2fe08a', Hindu: '#ff9f1c', Christian: '#29c6ff', Chinese: '#ff3b3b', Buddhist: '#ffc93c', Jewish: '#7a8cff', Thai: '#ff7ac2', Global: '#e5e9ff' };
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now0 = new Date(), thisYear = now0.getFullYear();
  let y = Math.min(2035, Math.max(2024, thisYear)), on = new Set(F.TRADS), loaded = {}, list = [], stop = () => {}, PX = 7;
  try { const s = JSON.parse(localStorage.getItem('dilia-fest-on') || 'null'); if (Array.isArray(s) && s.length) on = new Set(s.filter(x => F.TRADS.includes(x))); } catch (e) {}
  const dOf = iso => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8)));
  const idxOf = iso => Math.round((dOf(iso) - Date.UTC(y, 0, 1)) / 864e5);
  const todayIso = () => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); };
  const daysTo = iso => Math.round((dOf(iso) - dOf(todayIso())) / 864e5);
  async function compute() {
    for (const cc of F.NEED) if (!loaded[cc]) loaded[cc] = await K.country(cc);
    list = F.forYear(y, loaded).filter(f => on.has(f.trad)); render();
  }
  function render() {
    stop();
    const t = todayIso(), nx = list.find(f => f.date >= t) || null;
    if (nx) { const d = dOf(nx.date), n = daysTo(nx.date); $('fsk').textContent = 'NEXT FESTIVAL'; $('fsn').textContent = nx.name; $('fsd').textContent = WD[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()].charAt(0) + MON[d.getUTCMonth()].slice(1).toLowerCase() + ' ' + d.getUTCFullYear() + ' · ' + nx.trad + (nx.est ? ' · expected, depends on the moon' : ''); if (n === 0) $('fscd').innerHTML = '<div><b>Today</b><small>celebrate</small></div>'; else stop = K.countdown($('fscd'), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
    else { $('fsk').textContent = y + ' IN REVIEW'; $('fsn').textContent = y < thisYear ? 'This year is over' : 'No more festivals this year'; $('fsd').textContent = list.length + ' festivals shown'; $('fscd').innerHTML = ''; }
    // river
    const n = ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365; let r = '', s0 = 0; const dim = [31, n === 366 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let m = 0; m < 12; m++) { r += `<div class="ms" style="left:${20 + s0 * PX}px"></div><div class="ml" style="left:${24 + s0 * PX}px">${MON[m]}</div>`; s0 += dim[m]; }
    for (let i = 0; i < n; i++) r += `<div class="bar" style="left:${20 + i * PX}px;height:14px;background:var(--lk)"></div>`;
    list.forEach((f, k) => { const i = idxOf(f.date), c = COL[f.trad]; r += `<div class="bar" style="left:${20 + i * PX}px;height:92px;background:${c};box-shadow:0 0 10px ${c}"></div><button type="button" class="cap fcap" data-k="${k}" style="left:${20 + i * PX - 40}px;bottom:${108 + (k % 3) * 40}px;--c:${c}">${esc(f.name.length > 18 ? f.name.slice(0, 17) + '…' : f.name)}</button>`; });
    const ti = y === thisYear ? idxOf(t) : -1; if (ti >= 0) r += `<div class="now" style="left:${20 + ti * PX}px"></div>`;
    const rv = $('fsrv'); rv.style.width = (n * PX + 100) + 'px'; rv.style.height = '250px'; rv.innerHTML = r;
    requestAnimationFrame(() => { $('fsriver').scrollLeft = Math.max(0, 20 + (ti >= 0 ? ti : nx ? idxOf(nx.date) : 0) * PX - 80); });
    // cards
    const order = list.map((f, k) => k).sort((a, b) => (daysTo(list[a].date) < 0) - (daysTo(list[b].date) < 0) || a - b);
    $('fslist').innerHTML = list.length ? order.map(k => { const f = list[k]; const d = dOf(f.date), dt = daysTo(f.date), past = dt < 0, c = COL[f.trad];
      return `<button type="button" class="phc fc${past ? ' past' : ''}" data-k="${k}" style="--c:${c}"><span class="pht"><b>${d.getUTCDate()}</b><small>${MON[d.getUTCMonth()]}</small></span><span class="phi"><b>${esc(f.name)}</b><span>${WD[d.getUTCDay()]} ${d.getUTCFullYear()}</span><span class="phb"><i class="tr">${f.trad}</i>${past ? '<i>Passed</i>' : dt === 0 ? '<i class="s">Today</i>' : `<i class="s">In ${dt} ${dt === 1 ? 'day' : 'days'}</i>`}${f.est ? '<i class="mn">Expected, moon sighting</i>' : ''}</span></span></button>`; }).join('') : '<p class="lnote">Pick at least one tradition above.</p>';
    $('fsy').value = y; $('fsics').disabled = !list.length;
    document.querySelectorAll('[data-tr]').forEach(b => b.setAttribute('aria-pressed', on.has(b.dataset.tr) ? 'true' : 'false'));
    $('fsdet').innerHTML = '<p>Tap a festival to see the details.</p>';
  }
  function detail(k) {
    const f = list[k]; if (!f) return; const d = dOf(f.date), dt = daysTo(f.date);
    $('fsdet').innerHTML = `<h3>${esc(f.name)}</h3><p>${WD[d.getUTCDay()]}, ${d.getUTCDate()} ${MON[d.getUTCMonth()].charAt(0) + MON[d.getUTCMonth()].slice(1).toLowerCase()} ${d.getUTCFullYear()} · ${f.trad}. ${dt > 0 ? 'In ' + dt + (dt === 1 ? ' day.' : ' days.') : dt === 0 ? 'Today.' : Math.abs(dt) + ' days ago.'}</p>${f.est ? '<p>This date follows the moon. It is calculated from the Umm al-Qura calendar; the official day is announced after moon sighting and can differ by a day or two by country.</p>' : ''}${f.id === 'ramadan' ? '<p>Ramadan starts in the evening before this date, at sunset.</p>' : ''}${['passover', 'rosh', 'kippur', 'hanukkah'].includes(f.id) ? '<p>Jewish festivals begin at sunset on the evening before this date.</p>' : ''}`;
  }
  function ics() { const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dilia//Festival calendar//EN', 'CALSCALE:GREGORIAN']; list.forEach((f, k) => { const a = f.date.replace(/-/g, ''), e = new Date(dOf(f.date).getTime() + 864e5).toISOString().slice(0, 10).replace(/-/g, ''); L.push('BEGIN:VEVENT', 'UID:dilia-fest-' + f.id + '-' + f.date + '@dilia', 'DTSTAMP:' + y + '0101T000000Z', 'DTSTART;VALUE=DATE:' + a, 'DTEND;VALUE=DATE:' + e, 'SUMMARY:' + f.name.replace(/[,;\\]/g, m => '\\' + m) + (f.est ? ' (expected)' : ''), 'TRANSP:TRANSPARENT', 'END:VEVENT'); }); L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n'; }
  const save = () => { try { localStorage.setItem('dilia-fest-on', JSON.stringify([...on])); } catch (e) {} };
  $('fstr').innerHTML = F.TRADS.map(tr => `<button type="button" data-tr="${tr}" aria-pressed="true" style="--c:${COL[tr]}"><i></i>${tr}</button>`).join('') + '<button type="button" class="p" data-all="1">All</button>';
  $('fstr').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.all) on = new Set(F.TRADS); else { const tr = b.dataset.tr; if (on.has(tr)) on.delete(tr); else on.add(tr); } save(); compute(); });
  $('fsy').innerHTML = Array.from({ length: 12 }, (_, k) => `<option value="${2024 + k}">${2024 + k}</option>`).join('');
  $('fsy').addEventListener('change', e => { y = +e.target.value; compute(); });
  ['fsrv', 'fslist'].forEach(id => $(id).addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; detail(+b.dataset.k); if (id === 'fslist') $('fsdet').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }));
  $('fsics').addEventListener('click', () => K.download('Dilia-festivals-' + y + '.ics', ics(), 'text/calendar'));
  compute().catch(e => { $('fsn').textContent = e.message; });
  window.DiliaFestUI = { state: () => ({ y, on: [...on], list }), ics };
}
