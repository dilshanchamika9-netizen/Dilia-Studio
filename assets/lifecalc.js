// Life calculators in the "future" look. Maths comes from calcmath.js (CalcMath), unchanged and tested; this file draws inputs, results and pictures.
{
  const CM = CalcMath, K = LifeKit, $ = id => document.getElementById(id), esc = K.esc, ROOT = document.querySelector('[data-lc]'), MODE = ROOT.dataset.lc;
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON3 = MONTHS.map(m => m.slice(0, 3).toUpperCase());
  const longDate = d => DAYS[CM.weekday(d)] + ' ' + d.d + ' ' + MONTHS[d.m - 1] + ' ' + d.y;
  const plain = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(n);
  const pl = (n, w) => plain(n) + ' ' + w + (n === 1 ? '' : 's');
  const ymdText = r => [r.years && pl(r.years, 'year'), r.months && pl(r.months, 'month'), (r.days || (!r.years && !r.months)) && pl(r.days, 'day')].filter(Boolean).join(', ');
  const today = () => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; };
  const v = id => ($(id) ? $(id).value : '');
  const getDate = (id, name) => { const d = CM.ymd(v(id)); if (!d) throw new Error('Pick a valid date for "' + name + '".'); return d; };
  const intIn = (id, name) => { const s = v(id).trim(); if (s === '') return 0; const n = Number(s); if (!Number.isInteger(n) || n < 0 || n > 100000) throw new Error('Use whole numbers from 0 to 100000.'); return n; };
  const RES = $('lcres'), VIZ = $('lcviz');
  function result(k, n, d, stats, note) {
    RES.innerHTML = `<div class="k">${esc(k)}</div><div class="n">${esc(n)}</div>${d ? `<div class="d">${esc(d)}</div>` : ''}${stats && stats.length ? `<div class="lstats">${stats.map(([l, x, c]) => `<div><small>${esc(l)}</small><b class="${c || ''}${String(x).length > 11 ? ' sm' : ''}">${esc(x)}</b></div>`).join('')}</div>` : ''}${note ? `<p class="lcnote">${note}</p>` : ''}`;
  }
  function fail(msg) { RES.innerHTML = `<div class="k">CHECK YOUR INPUT</div><p class="lcbad">${esc(msg)}</p>`; VIZ.innerHTML = ''; }
  // month grid used by several pictures: cls(dObj) -> class string
  function monthGrid(y, m, cls, title) {
    const first = (CM.weekday({ y, m, d: 1 }) + 6) % 7, n = CM.dim(y, m); let c = '<em>M</em><em>T</em><em>W</em><em>T</em><em>F</em><em>S</em><em>S</em>' + '<span style="visibility:hidden"></span>'.repeat(first);
    for (let d = 1; d <= n; d++) { const k = cls({ y, m, d }); c += `<span${k ? ` class="${k}"` : ''}>${d}</span>`; }
    return `<div class="lmo"><h4>${title || MON3[m - 1] + ' ' + y}</h4><div class="lmg">${c}</div></div>`;
  }
  const same = (a, b) => a && b && a.y === b.y && a.m === b.m && a.d === b.d;
  const fmtMoney = (n, cur) => { const o = { minimumFractionDigits: 2, maximumFractionDigits: 2 }; if (cur) { try { return new Intl.NumberFormat('en-US', { ...o, style: 'currency', currency: cur, currencyDisplay: 'code' }).format(n).replace(/ /g, ' '); } catch (e) {} } return new Intl.NumberFormat('en-US', o).format(n); };
  const R = {};

  // ---------- date difference: glowing timeline between the two dates ----------
  R.dd = () => {
    let a = getDate('d1', 'From'), b = getDate('d2', 'To'), sw = false; if (CM.cmp(a, b) > 0) { [a, b] = [b, a]; sw = true; }
    const r = CM.diffYMD(a, b), w = r.totalDays ? CM.workdays(CM.addDate(a, 0, 0, 1).date, b, new Set([0, 6]), null) : { workdays: 0 };
    result('BETWEEN THE TWO DATES', ymdText(r), longDate(a) + ' → ' + longDate(b), [['DAYS IN TOTAL', plain(r.totalDays), 'c'], ['WEEKS AND DAYS', Math.floor(r.totalDays / 7) + 'w ' + (r.totalDays % 7) + 'd'], ['MON–FRI DAYS', plain(w.workdays || 0), 'g'], ['HOURS', plain(r.totalDays * 24)]], (sw ? 'The dates were swapped so the earlier one comes first. ' : '') + 'The start day is not counted, the end day is.');
    const n0 = CM.num_(a), n1 = CM.num_(b), span = Math.max(1, n1 - n0), t = CM.num_(today()), ticks = [];
    const yrs = b.y - a.y;
    if (yrs >= 2) { const step = yrs > 40 ? 10 : yrs > 12 ? 5 : 1; for (let y = Math.ceil((a.y + 1) / step) * step; y <= b.y; y += step) ticks.push([CM.num_({ y, m: 1, d: 1 }), String(y)]); }
    else { for (let k = 1; k < 40; k++) { const d = CM.addMonths({ y: a.y, m: a.m, d: 1 }, k); if (!d || CM.num_(d) >= n1) break; ticks.push([CM.num_(d), MON3[d.m - 1]]); } }
    const pos = n => ((n - n0) / span * 100).toFixed(3) + '%';
    VIZ.innerHTML = `<div class="ltl"><div class="ltrack"><i class="lfill"></i>${ticks.map(([n, l], k) => `<span class="ltick${ticks.length > 7 && k % 2 ? ' q' : ''}" style="left:${pos(n)}"><em>${l}</em></span>`).join('')}${t > n0 && t < n1 ? `<span class="lnow" style="left:${pos(t)}"><em>Today</em></span>` : ''}<b class="lend s" style="left:0"></b><b class="lend e" style="left:100%"></b></div>
      <div class="ltlab"><div><small>FROM</small>${esc(longDate(a))}</div><div class="r"><small>TO</small>${esc(longDate(b))}</div></div></div>`;
  };
  // ---------- add days: jump arc from start to result ----------
  R.dadd = () => {
    const s = getDate('d1', 'Start date'), sign = $('lcop').dataset.v === '-' ? -1 : 1, ny = intIn('ny'), nm = intIn('nm'), nw = intIn('nw'), nd = intIn('nd');
    const r = CM.addDate(s, sign * ny, sign * nm, sign * (nw * 7 + nd)); if (r.error) return fail(r.error);
    const e = r.date, diff = CM.num_(e) - CM.num_(s), parts = [ny && pl(ny, 'year'), nm && pl(nm, 'month'), nw && pl(nw, 'week'), nd && pl(nd, 'day')].filter(Boolean).join(', ') || '0 days';
    result(sign > 0 ? 'DATE AFTER ADDING' : 'DATE AFTER SUBTRACTING', longDate(e), (sign > 0 ? '+ ' : '− ') + parts + ' from ' + longDate(s), [['DAYS APART', plain(Math.abs(diff)), 'c'], ['WEEK', 'Week ' + CM.isoWeek(e).week], ['DAY OF YEAR', plain(CM.dayOfYear(e))]], 'Months are added first, then weeks and days. Adding a month to 31 January gives the last day of February.');
    const L = sign > 0 ? s : e, Rr = sign > 0 ? e : s;
    VIZ.innerHTML = `<div class="ljump"><svg viewBox="0 0 600 170" aria-hidden="true"><defs><linearGradient id="lja" x1="0" x2="1"><stop offset="0" stop-color="#2fe08a"/><stop offset="1" stop-color="#29c6ff"/></linearGradient></defs><path d="M70 140 C 200 -10, 400 -10, 530 140" fill="none" stroke="url(#lja)" stroke-width="4" stroke-dasharray="10 8"><animate attributeName="stroke-dashoffset" from="${sign > 0 ? 36 : -36}" to="0" dur="1s" repeatCount="indefinite"/></path><circle cx="70" cy="140" r="12" fill="#2fe08a"/><circle cx="530" cy="140" r="12" fill="#29c6ff"/><text x="300" y="48" text-anchor="middle" style="fill:var(--lt)" font-size="22" font-weight="800">${sign > 0 ? '+' : '−'}${plain(Math.abs(diff))} days</text></svg>
      <div class="ltlab"><div><small>${sign > 0 ? 'START' : 'RESULT'}</small>${esc(longDate(L))}</div><div class="r"><small>${sign > 0 ? 'RESULT' : 'START'}</small>${esc(longDate(Rr))}</div></div></div><div class="lcal2">${monthGrid(s.y, s.m, d => same(d, s) ? 'l' : '', 'START · ' + MON3[s.m - 1] + ' ' + s.y)}${monthGrid(e.y, e.m, d => same(d, e) ? 'h' : '', 'RESULT · ' + MON3[e.m - 1] + ' ' + e.y)}</div>`;
  };
  // ---------- age: life in weeks + birthday countdown ----------
  let stopAge = () => {};
  R.dage = () => {
    stopAge(); stopAge = () => {};
    const dob = getDate('d1', 'Date of birth'), on = getDate('d2', 'Age on'), a = CM.ageOn(dob, on); if (a.error) return fail(a.error);
    const weeks = Math.floor(a.totalDays / 7), nb = a.nextBirthday, turning = nb.y - dob.y;
    result('AGE', ymdText(a), 'Born on a ' + DAYS[a.weekdayBorn] + ', ' + dob.d + ' ' + MONTHS[dob.m - 1] + ' ' + dob.y, [['DAYS OLD', plain(a.totalDays), 'c'], ['WEEKS OLD', plain(weeks)], ['NEXT BIRTHDAY', a.daysToBirthday === 0 ? 'Today' : pl(a.daysToBirthday, 'day'), 'h'], ['TURNING', String(a.daysToBirthday === 0 ? a.years : turning), 'g']], 'Next birthday: ' + esc(longDate(nb)) + '. Someone born on 29 February is counted as having their birthday on 28 February in other years.');
    const Y = 90, cols = 52, cell = 9, gap = 2, W = cols * (cell + gap), H = Y * (cell + gap);
    VIZ.innerHTML = `<div class="lweeks"><div class="lwhead"><b>Your life in weeks</b><span>Each square is one week, each row one year, up to 90. Lit squares are the ${plain(weeks)} weeks behind you.</span></div><canvas id="lwc" width="${W}" height="${H}" role="img" aria-label="${plain(weeks)} of ${Y * 52} weeks lived"></canvas><div class="lcd" id="lagecd"></div></div>`;
    const c = $('lwc').getContext('2d'), cs = getComputedStyle(ROOT), EMPTY = cs.getPropertyValue('--lcell').trim() || '#ffffff14', NOWC = cs.getPropertyValue('--lt').trim() || '#fff';
    for (let r = 0; r < Y; r++) for (let k = 0; k < cols; k++) { const i = r * cols + k; c.fillStyle = i < weeks ? (r % 10 === 9 ? '#ff2d95' : '#29c6ff') : i === weeks ? NOWC : EMPTY; c.fillRect(k * (cell + gap), r * (cell + gap), cell, cell); }
    if (same(on, today()) && a.daysToBirthday > 0) stopAge = K.countdown($('lagecd'), nb.y, nb.m - 1, nb.d); else $('lagecd').innerHTML = '';
  };
  // ---------- day of the week: glowing month + year ring ----------
  R.dwk = () => {
    const d = getDate('d1', 'Date'), w = CM.isoWeek(d), yd = CM.dayOfYear(d), yl = CM.isLeap(d.y) ? 366 : 365;
    result(longDate(d).toUpperCase(), DAYS[CM.weekday(d)], 'Day ' + yd + ' of ' + yl + ' · Week ' + w.week + (w.year !== d.y ? ' of ' + w.year : ''), [['DAY OF YEAR', 'Day ' + yd + ' of ' + yl, 'c'], ['DAYS LEFT', plain(yl - yd)], ['ISO WEEK', 'Week ' + w.week + (w.year !== d.y ? ' (' + w.year + ')' : ''), 'g'], ['LEAP YEAR', CM.isLeap(d.y) ? 'Yes' : 'No']], MONTHS[d.m - 1] + ' ' + d.y + ' has ' + CM.dim(d.y, d.m) + ' days.');
    const pct = yd / yl, R0 = 70, C = 2 * Math.PI * R0;
    VIZ.innerHTML = `<div class="ldow"><div class="lring"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="${R0}" fill="none" style="stroke:var(--lcell)" stroke-width="14"/><circle cx="90" cy="90" r="${R0}" fill="none" stroke="url(#lrg)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 90 90)"/><defs><linearGradient id="lrg"><stop offset="0" stop-color="#2fe08a"/><stop offset="1" stop-color="#29c6ff"/></linearGradient></defs><text x="90" y="88" text-anchor="middle" style="fill:var(--lt)" font-size="30" font-weight="800">${Math.round(pct * 100)}%</text><text x="90" y="110" text-anchor="middle" style="fill:var(--lm)" font-size="12">of ${d.y} done</text></svg></div>
      <div class="lbig">${monthGrid(d.y, d.m, x => same(x, d) ? 'h' : CM.weekday(x) === CM.weekday(d) ? 'b' : '', MONTHS[d.m - 1].toUpperCase() + ' ' + d.y)}<p class="lnote">Every ${DAYS[CM.weekday(d)]} of the month is outlined.</p></div></div>`;
  };
  // ---------- working days: month calendars with counted days lit ----------
  let wTok = 0;
  R.dwork = async () => {
    const my = ++wTok; let a = getDate('d1', 'From'), b = getDate('d2', 'To'); if (CM.cmp(a, b) > 0) [a, b] = [b, a];
    const wk = new Set(curWeekend), cc = v('lccc'); let hs = null, list = [];
    if (cc) {
      hs = new Set(); const data = await K.country(cc); if (my !== wTok) return;
      for (let y = a.y; y <= b.y; y++) { if (!data[y]) return fail('The holiday list for ' + K.cname(cc) + ' does not cover ' + y + '. Choose "No holidays" or change the dates.'); data[y].forEach(([md, name]) => { const iso = y + '-' + md; list.push([iso, name]); }); }
      list = list.filter(([d]) => d >= CM.iso(a) && d <= CM.iso(b) && !wk.has(CM.weekday(CM.ymd(d)))); list.forEach(([d]) => hs.add(d));
    }
    const r = CM.workdays(a, b, wk, hs); if (r.error) return fail(r.error);
    const uniq = []; list.forEach(([d, n]) => { if (!uniq.some(u => u[0] === d)) uniq.push([d, n]); });
    result('WORKING DAYS', plain(r.workdays), longDate(a) + ' → ' + longDate(b) + ' (both counted)', [['WORKING DAYS', plain(r.workdays), 'g'], ['WEEKEND DAYS', plain(r.weekendDays)], ['HOLIDAYS SKIPPED', plain(r.holidayDays), 'h'], ['DAYS IN TOTAL', plain(r.totalDays), 'c']],
      uniq.length ? 'Holidays skipped: ' + uniq.map(([d, n]) => esc(n) + ' (' + esc(longDate(CM.ymd(d))) + ')').join(', ') + '. Data: Vacanza holidays library (MIT).' : (cc ? 'No public holidays fall on working days in this range.' : 'No public holidays skipped. Pick a country to skip them.'));
    const months = (b.y - a.y) * 12 + (b.m - a.m) + 1;
    if (months > 24) { VIZ.innerHTML = `<p class="lnote">The calendar picture shows up to 24 months. This range covers ${months} months.</p>`; return; }
    let h = '', y = a.y, m = a.m; const ai = CM.iso(a), bi = CM.iso(b);
    for (let k = 0; k < months; k++) { h += monthGrid(y, m, d => { const i = CM.iso(d); if (i < ai || i > bi) return ''; if (wk.has(CM.weekday(d))) return 'w'; if (hs && hs.has(i)) return 'h'; return 'l'; }); if (++m > 12) { m = 1; y++; } }
    VIZ.innerHTML = `<div class="lkey"><span><i style="background:#2fe08a"></i>Working day</span><span><i style="background:var(--lw)"></i>Weekend</span><span><i style="background:#ff2d95"></i>Public holiday</span></div><div class="lhg flat">${h}</div>`;
  };
  // ---------- time zones: day/night strips with a draggable time line ----------
  let tzZones = [];
  R.dtz = () => {
    const w = v('lcwhen'), m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(w); if (!m || +m[1] < 1000) return fail('Pick a date and time.');
    const src = tzZones[0], r = CM.wallToUtc(src, +m[1], +m[2], +m[3], +m[4], +m[5]); if (r.error) return fail(r.error);
    const off = (z, ms) => { const o = CM.offsetMin(z, ms), s = o < 0 ? '-' : '+', a = Math.abs(o); return 'UTC' + s + Math.floor(a / 60) + (a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''); };
    const pad = n => String(n).padStart(2, '0'), nm = z => z.split('/').pop().replace(/_/g, ' ');
    const cards = tzZones.map((z, i) => { const p = CM.parts(z, r.ms), day = { y: p.y, m: p.m, d: p.d }; const night = p.h < 6 || p.h >= 21; return `<div class="ltz${i ? '' : ' src'}${night ? ' night' : ''}"><small>${esc(nm(z))}${i ? '' : ' · your time'}</small><b>${pad(p.h)}:${pad(p.mi)}</b><span>${esc(DAYS[CM.weekday(day)].slice(0, 3) + ' ' + p.d + ' ' + MONTHS[p.m - 1].slice(0, 3))}</span><em>${off(z, r.ms)}</em></div>`; }).join('');
    RES.innerHTML = `<div class="k">${esc(longDate({ y: +m[1], m: +m[2], d: +m[3] }).toUpperCase())} · ${m[4]}:${m[5]} IN ${esc(nm(src).toUpperCase())}</div><div class="ltzs">${cards}</div>${r.ambiguous ? '<p class="lcnote">This time happens twice in ' + esc(nm(src)) + ' on that day, because the clocks go back. The first one is shown.</p>' : ''}<p class="lcnote">Uses the time zone rules built into your browser, including daylight saving.</p>`;
    // 24-hour strips aligned to the source day
    const base = CM.wallToUtc(src, +m[1], +m[2], +m[3], 0, 0), b0 = base.error ? r.ms - (+m[4] * 60 + +m[5]) * 60000 : base.ms, good = [];
    let rows = '';
    tzZones.forEach(z => { let cells = ''; for (let h = 0; h < 24; h++) { const p = CM.parts(z, b0 + h * 3600000), cl = p.h >= 9 && p.h < 18 ? 'wk' : p.h >= 7 && p.h < 22 ? 'dy' : 'nt'; cells += `<span class="${cl}">${p.h}</span>`; } rows += `<div class="lstrip"><b>${esc(nm(z))}</b><div>${cells}</div></div>`; });
    for (let h = 0; h < 24; h++) if (tzZones.every(z => { const p = CM.parts(z, b0 + h * 3600000); return p.h >= 9 && p.h < 18; })) good.push(h);
    const sel = (+m[4] * 60 + +m[5]) / 1440 * 100;
    VIZ.innerHTML = `<div class="lkey"><span><i style="background:#2fe08a"></i>Work hours 9–18</span><span><i style="background:#29c6ff66"></i>Awake</span><span><i style="background:var(--lk)"></i>Night</span></div><div class="lstrips" id="lstrips"><div class="lsel" id="lsel" style="--p:${(sel / 100).toFixed(4)}"></div>${rows}</div>
      <p class="lcnote">${good.length ? 'Best meeting hours (everyone at work), in ' + esc(nm(src)) + ' time: ' + good.map(h => pad(h) + ':00').join(', ') + '.' : 'No hour is inside work hours (9–18) for everyone on this day.'} Drag along the strips or tap an hour to change the time.</p>`;
    const strips = $('lstrips'), setFrom = e => { const rc = strips.getBoundingClientRect(), lab = strips.querySelector('.lstrip b').getBoundingClientRect().width, x = Math.max(0, Math.min(1, (e.clientX - rc.left - lab) / (rc.width - lab))), mins = Math.min(1425, Math.round(x * 1440 / 15) * 15); $('lcwhen').value = m[1] + '-' + m[2] + '-' + m[3] + 'T' + pad(Math.floor(mins / 60)) + ':' + pad(mins % 60); run(); };
    let drag = false; strips.addEventListener('pointerdown', e => { drag = true; strips.setPointerCapture(e.pointerId); setFrom(e); }); strips.addEventListener('pointermove', e => { if (drag) setFrom(e); }); strips.addEventListener('pointerup', () => { drag = false; });
  };
  // ---------- UAE gratuity: 21-day and 30-day years + cap meter ----------
  R.grat = () => {
    const basic = Number(String(v('basic')).replace(/,/g, '')), cur = v('cur'), s = getDate('d1', 'First day'), e = getDate('d2', 'Last day'), un = Number(v('unp') || 0);
    const r = CM.gratuity(basic, s, e, un); if (r.error) return fail(r.error);
    if (!r.eligible) { result('ESTIMATED GRATUITY', 'Not yet', 'Gratuity starts after one full year of service (365 days, not counting unpaid leave).', [['COUNTED SERVICE', pl(r.serviceDays, 'day'), 'c'], ['DAYS TO GO', pl(365 - r.serviceDays, 'day'), 'h']]); VIZ.innerHTML = `<div class="lgbar"><i style="width:${(r.serviceDays / 365 * 100).toFixed(2)}%;background:linear-gradient(90deg,#2fe08a,#29c6ff)"></i></div><p class="lnote">${(r.serviceDays / 365 * 100).toFixed(1)}% of the way to the first year.</p>`; return; }
    result('ESTIMATED GRATUITY', fmtMoney(r.amount, cur), 'For ' + ymdText(r.ymd) + ' of service', [['SERVICE', ymdText(r.ymd), 'c'], ['DAYS OF BASIC PAY', plain(CM.r2(r.gratuityDays)), 'g'], ['DAILY WAGE', fmtMoney(r.dailyWage, cur)], ['CAP (2 YEARS PAY)', fmtMoney(r.cap, cur), 'h']],
      r.capped ? 'Capped: the law limits gratuity to 2 years of basic pay (' + fmtMoney(r.cap, cur) + '). Without the cap it would be ' + fmtMoney(r.uncapped, cur) + '.' : 'Daily wage = basic salary / 30. First 5 years at 21 days a year, later years at 30 days a year, part years in proportion.');
    const y1 = Math.min(r.years, 5), y2 = Math.max(r.years - 5, 0), a1 = r.dailyWage * 21 * y1, a2 = r.dailyWage * 30 * y2, tot = Math.max(a1 + a2, 1), capPct = Math.min(100, r.uncapped / r.cap * 100);
    VIZ.innerHTML = `<div class="lgr"><div class="lgrh"><b>How it adds up</b></div>
      <div class="lgbar two"><i style="width:${(a1 / tot * 100).toFixed(2)}%" class="a"><span>${y1.toFixed(2)} yrs × 21 days</span></i><i style="width:${(a2 / tot * 100).toFixed(2)}%" class="b"><span>${y2 > 0 ? y2.toFixed(2) + ' yrs × 30 days' : ''}</span></i></div>
      <div class="lgleg"><span><i style="background:#29c6ff"></i>First 5 years: ${esc(fmtMoney(a1, cur))}</span><span><i style="background:#2fe08a"></i>After 5 years: ${esc(fmtMoney(a2, cur))}</span></div>
      <div class="lgrh"><b>Distance to the legal cap</b><span>${capPct.toFixed(1)}% of 2 years' basic pay${r.capped ? ' (cap reached)' : ''}</span></div><div class="lgbar"><i style="width:${capPct.toFixed(2)}%;background:linear-gradient(90deg,#29c6ff,#ff2d95)"></i></div></div>`;
  };

  // ---------- inputs ----------
  let curWeekend = [6, 0];
  function run() { try { const p = R[MODE](); if (p && p.catch) p.catch(e => fail(e.message)); } catch (e) { fail(e.message); } }
  ROOT.querySelectorAll('input,select').forEach(i => { i.addEventListener('input', run); i.addEventListener('change', run); });
  const t = today(), set = (id, d) => { if ($(id)) $(id).value = CM.iso(d); };
  if (MODE === 'dd') { set('d1', { y: t.y, m: 1, d: 1 }); set('d2', t); }
  if (MODE === 'dadd') { set('d1', t); document.querySelectorAll('[data-op]').forEach(b => b.addEventListener('click', () => { $('lcop').dataset.v = b.dataset.op; document.querySelectorAll('[data-op]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); run(); })); }
  if (MODE === 'dage') { set('d1', { y: 1990, m: 1, d: 1 }); set('d2', t); }
  if (MODE === 'dwk') set('d1', t);
  if (MODE === 'dwork') {
    set('d1', t); set('d2', CM.addDate(t, 0, 0, 30).date);
    const paint = () => document.querySelectorAll('[data-wd]').forEach(b => b.setAttribute('aria-pressed', curWeekend.includes(+b.dataset.wd) ? 'true' : 'false'));
    document.querySelectorAll('[data-wd]').forEach(b => b.addEventListener('click', () => { const d = +b.dataset.wd; curWeekend = curWeekend.includes(d) ? curWeekend.filter(x => x !== d) : curWeekend.concat(d); paint(); run(); }));
    document.querySelectorAll('[data-wp]').forEach(b => b.addEventListener('click', () => { curWeekend = b.dataset.wp === '' ? [] : b.dataset.wp.split('.').map(Number); paint(); run(); })); paint();
    K.index().then(ix => { K.fillCountries($('lccc'), ix.countries, true); $('lccc').options[0].textContent = 'No holidays'; run(); }).catch(() => {});
  }
  if (MODE === 'grat') { set('d1', { y: t.y - 5, m: 1, d: 1 }); set('d2', t); }
  if (MODE === 'dtz') {
    let home = 'Asia/Dubai'; try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (z && z !== 'UTC') home = z; } catch (e) {}
    let all = []; try { all = Intl.supportedValuesOf('timeZone'); } catch (e) {} if (!all.length) all = ['Asia/Dubai', 'Asia/Colombo', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney'];
    const opts = z => all.map(x => `<option value="${x}"${x === z ? ' selected' : ''}>${x.replace(/_/g, ' ')}</option>`).join('');
    tzZones = [home, ...['Asia/Dubai', 'Asia/Colombo', 'Europe/London', 'America/New_York'].filter(x => x !== home).slice(0, 3)];
    const paint = () => { $('lczones').innerHTML = tzZones.map((z, i) => `<div class="lzrow"><label class="f">${i ? 'City ' + i : 'Your time zone'}<select data-zi="${i}">${opts(z)}</select></label>${i ? `<button type="button" class="lzx" data-rm="${i}" aria-label="Remove">×</button>` : ''}</div>`).join(''); $('lcadd').disabled = tzZones.length >= 8; };
    $('lczones').addEventListener('change', e => { const s = e.target.closest('[data-zi]'); if (s) { tzZones[+s.dataset.zi] = s.value; run(); } });
    $('lczones').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { tzZones.splice(+b.dataset.rm, 1); paint(); run(); } });
    $('lcadd').addEventListener('click', () => { tzZones.push('Asia/Tokyo'); paint(); run(); });
    const p = CM.parts(home, Date.now()); $('lcwhen').value = CM.iso({ y: p.y, m: p.m, d: p.d }) + 'T' + String(p.h).padStart(2, '0') + ':' + String(Math.floor(p.mi / 15) * 15).padStart(2, '0');
    $('lcnow').addEventListener('click', () => { const q = CM.parts(tzZones[0], Date.now()); $('lcwhen').value = CM.iso({ y: q.y, m: q.m, d: q.d }) + 'T' + String(q.h).padStart(2, '0') + ':' + String(q.mi).padStart(2, '0'); run(); });
    paint();
    window.DiliaTZ = { set: z => { tzZones = z.slice(); paint(); run(); } };
  }
  new MutationObserver(() => { if (MODE === 'dage') run(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  run();
  window.DiliaLifeCalc = { run, mode: MODE, setWeekend: w => { curWeekend = w; run(); } };
}
