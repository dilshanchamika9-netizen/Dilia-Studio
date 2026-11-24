// Today's date in many calendars. Names come from the browser's own calendar tables (Intl); the Julian calendar and day numbers are worked out here.
window.DiliaTodayCal = (() => {
  const $ = id => document.getElementById(id), pad = (n, w = 2) => String(n).padStart(w, '0');
  const jdn = (y, m, d) => { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; };
  const julian = j => { const c = j + 32082, d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153); return { d: e - Math.floor((153 * m + 2) / 5) + 1, m: m + 3 - 12 * Math.floor(m / 10), y: d - 4800 + Math.floor(m / 10) }; };
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const isoWeek = (y, m, d) => { const t = new Date(Date.UTC(y, m - 1, d)), n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y0 = Date.UTC(t.getUTCFullYear(), 0, 1); return { y: t.getUTCFullYear(), w: Math.ceil(((t - y0) / 864e5 + 1) / 7), wd: n }; };
  const CAL = [
    ['gregory', 'Gregorian', 'The calendar used for civil life almost everywhere.', '#29c6ff'],
    ['islamic-umalqura', 'Islamic (Umm al-Qura)', 'Saudi Arabia\'s official calendar. The real month starts when the moon is sighted, so a country can differ by a day.', '#2fe08a'],
    ['islamic-civil', 'Islamic (tabular)', 'A fixed arithmetic version of the Hijri calendar, with no moon sighting. It can differ from Umm al-Qura by a day.', '#2fe08a'],
    ['hebrew', 'Hebrew', 'Jewish calendar. Each day begins at sunset the evening before.', '#ffd84a'],
    ['persian', 'Persian (Solar Hijri)', 'Official in Iran and Afghanistan. The year starts at Nowruz in March.', '#ff9f1c'],
    ['chinese', 'Chinese lunisolar', 'Months follow the moon. The year gets a name from the 60-year cycle.', '#ff2d95'],
    ['indian', 'Indian national (Saka)', 'India\'s official civil calendar next to the Gregorian one.', '#a08bff'],
    ['buddhist', 'Buddhist era', 'Used in Thailand: the Gregorian year plus 543.', '#ffd84a'],
    ['japanese', 'Japanese (era years)', 'Years count from the start of each emperor\'s era.', '#ff5c7a'],
    ['roc', 'Minguo (Taiwan)', 'Years count from 1912, the founding of the Republic of China.', '#29c6ff'],
    ['coptic', 'Coptic', 'Used by the Coptic Orthodox Church in Egypt.', '#2fe08a'],
    ['ethiopic', 'Ethiopian', 'Official in Ethiopia. It has 13 months and runs about seven to eight years behind the Gregorian year.', '#ff9f1c'],
    ['julian', 'Julian', 'The calendar before 1582. Some Orthodox churches still use it for feast days. Worked out here, not by the browser.', '#a08bff']
  ];
  function fmt(cal, y, m, d) {
    const dt = new Date(Date.UTC(y, m - 1, d, 12)); if (y < 100) dt.setUTCFullYear(y);
    if (cal === 'julian') { const j = julian(jdn(y, m, d)); return { big: j.d + ' ' + MON[j.m - 1] + ' ' + j.y, parts: j }; }
    const f = new Intl.DateTimeFormat('en-u-ca-' + cal + '-nu-latn', { calendar: cal, timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', era: 'short' }), P = {};
    f.formatToParts(dt).forEach(p => { P[p.type] = p.value; });
    if (cal === 'chinese') return { big: P.day + ' · ' + P.month, sub: 'Year ' + P.yearName + ' (' + P.relatedYear + ')', parts: P };
    if (cal === 'japanese') return { big: P.day + ' ' + P.month, sub: P.era + ' ' + P.year, parts: P };
    return { big: P.day + ' ' + P.month + ' ' + P.year + ' ' + (P.era || ''), parts: P };
  }
  function weekday(y, m, d) { return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long' }).format(new Date(Date.UTC(y, m - 1, d, 12))); }
  function info(y, m, d) {
    const j = jdn(y, m, d), doy = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1, iw = isoWeek(y, m, d), unix = Math.round(Date.UTC(y, m - 1, d) / 864e5);
    return [['Julian Day Number', String(j), 'Days counted from 4713 BC, used by astronomers (at noon)'], ['Day of the year', String(doy), 'Counting 1 January as day 1'], ['ISO week', iw.y + '-W' + pad(iw.w) + '-' + iw.wd, 'Week 1 holds the first Thursday'], ['Days since 1 Jan 1970', String(unix), 'The Unix day count']];
  }
  function render(y, m, d) {
    $('tcwd').textContent = weekday(y, m, d) + ', ' + d + ' ' + MON[m - 1] + ' ' + y;
    const grid = $('tcgrid'); grid.textContent = '';
    CAL.forEach(([id, name, note, col]) => {
      let r; try { r = fmt(id, y, m, d); } catch (e) { return; }
      const c = document.createElement('div'); c.className = 'tcc'; c.dataset.cal = id; c.style.setProperty('--a', col);
      const n = document.createElement('div'); n.className = 'tn'; n.textContent = name; const b = document.createElement('div'); b.className = 'tb'; b.textContent = r.big.trim();
      c.append(n, b); if (r.sub) { const s = document.createElement('div'); s.className = 'ts'; s.textContent = r.sub; c.append(s); }
      const t = document.createElement('div'); t.className = 'tt'; t.textContent = note; c.append(t); grid.append(c);
    });
    const inf = $('tcinfo'); inf.textContent = ''; info(y, m, d).forEach(([k, v, n]) => { const e = document.createElement('div'); const b = document.createElement('b'); b.textContent = v; const s = document.createElement('small'); s.textContent = k + ' · ' + n; e.append(b, s); inf.append(e); });
  }
  function cur() { const v = $('tcdate').value; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null; return v.split('-').map(Number); }
  function go(delta) { const c = cur(); if (!c) return; const t = new Date(Date.UTC(c[0], c[1] - 1, c[2] + delta, 12)); $('tcdate').value = t.getUTCFullYear().toString().padStart(4, '0') + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); change(); }
  function change() { const c = cur(); if (c) render(c[0], c[1], c[2]); }
  function init() {
    const n = new Date(); $('tcdate').value = n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate());
    $('tcdate').addEventListener('input', change); $('tcprev').addEventListener('click', () => go(-1)); $('tcnext').addEventListener('click', () => go(1)); $('tctoday').addEventListener('click', () => { const t = new Date(); $('tcdate').value = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); change(); });
    change();
  }
  if (typeof document !== 'undefined' && $('tcdate')) init();
  return { jdn, julian, fmt, isoWeek };
})();
if (typeof module !== 'undefined') module.exports = window.DiliaTodayCal;
