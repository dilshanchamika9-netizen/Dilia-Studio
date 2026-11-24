/* Dilia festival dates. Moon calendars use the browser's built-in Islamic (Umm al-Qura) and Hebrew calendars, so the Islamic
   dates are expectations (moon sighting decides). Diwali, Holi, Vesak, Songkran and the Chinese festivals come from the national holiday data (India, Singapore, Thailand, China). */
(function (root) {
  const pad = n => (n < 10 ? '0' : '') + n, iso = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);
  const days = y => { const out = [], n = ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365; for (let i = 0; i < n; i++) out.push(new Date(Date.UTC(y, 0, 1 + i))); return out; };
  const fmts = {};
  function cal(c, d) { const f = fmts[c] || (fmts[c] = new Intl.DateTimeFormat('en-u-ca-' + c, { timeZone: 'UTC', year: 'numeric', month: c === 'hebrew' ? 'long' : 'numeric', day: 'numeric' })); const o = {}; f.formatToParts(d).forEach(p => { o[p.type] = p.value; }); return o; }
  const isoOf = d => d.toISOString().slice(0, 10);
  function findAll(y, c, test) { const out = []; for (const d of days(y)) { let p; try { p = cal(c, d); } catch (e) { return out; } if (test(p)) out.push(isoOf(d)); } return out; }
  function easter(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return iso(y, mo, da); }
  function orthodoxEaster(y) { const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7, mo = Math.floor((d + e + 114) / 31), da = ((d + e + 114) % 31) + 1; const t = new Date(Date.UTC(y, mo - 1, da + 13)); return isoOf(t); }
  const nthWeekday = (y, m, wd, n) => { const f = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), d = 1 + ((wd - f + 7) % 7) + (n - 1) * 7; return iso(y, m, d); };
  const LIST = [
    // id, name, tradition, how
    ['ramadan', 'Ramadan begins', 'Islamic', y => findAll(y, 'islamic-umalqura', p => p.month === '9' && p.day === '1'), 1],
    ['fitr', 'Eid al-Fitr', 'Islamic', y => findAll(y, 'islamic-umalqura', p => p.month === '10' && p.day === '1'), 1],
    ['adha', 'Eid al-Adha', 'Islamic', y => findAll(y, 'islamic-umalqura', p => p.month === '12' && p.day === '10'), 1],
    ['hijri', 'Islamic New Year', 'Islamic', y => findAll(y, 'islamic-umalqura', p => p.month === '1' && p.day === '1'), 1],
    ['mawlid', "Prophet's Birthday", 'Islamic', y => findAll(y, 'islamic-umalqura', p => p.month === '3' && p.day === '12'), 1],
    ['diwali', 'Diwali', 'Hindu', (y, D) => D('IN', y, n => /^Diwali/.test(n)), 0],
    ['holi', 'Holi', 'Hindu', (y, D) => D('IN', y, n => /^Holi/.test(n)), 0],
    ['cny', 'Chinese New Year', 'Chinese', (y, D) => D('CN', y, n => /^Chinese New Year \(Spring Festival\)$/.test(n)), 0],
    ['dragon', 'Dragon Boat Festival', 'Chinese', (y, D) => D('CN', y, n => /^Dragon Boat Festival$/.test(n)), 0],
    ['midautumn', 'Mid-Autumn Festival', 'Chinese', (y, D) => D('CN', y, n => /(^|; )Mid-Autumn Festival(;|$)/.test(n)), 0],
    ['vesak', 'Vesak', 'Buddhist', (y, D) => D('SG', y, n => /Vesak/.test(n)), 0],
    ['songkran', 'Songkran', 'Thai', (y, D) => D('TH', y, n => /Songkran/.test(n)).slice(0, 1), 0],
    ['easter', 'Easter Sunday', 'Christian', y => [easter(y)], 0],
    ['oeaster', 'Orthodox Easter', 'Christian', y => [orthodoxEaster(y)], 0],
    ['christmas', 'Christmas', 'Christian', y => [iso(y, 12, 25)], 0],
    ['passover', 'Passover begins', 'Jewish', y => findAll(y, 'hebrew', p => /^Nisan$/.test(p.month) && p.day === '15'), 0],
    ['rosh', 'Rosh Hashanah', 'Jewish', y => findAll(y, 'hebrew', p => /^Tishri$/.test(p.month) && p.day === '1'), 0],
    ['kippur', 'Yom Kippur', 'Jewish', y => findAll(y, 'hebrew', p => /^Tishri$/.test(p.month) && p.day === '10'), 0],
    ['hanukkah', 'Hanukkah begins', 'Jewish', y => findAll(y, 'hebrew', p => /^Kislev$/.test(p.month) && p.day === '25'), 0],
    ['newyear', "New Year's Day", 'Global', y => [iso(y, 1, 1)], 0],
    ['thanks', 'Thanksgiving (US)', 'Global', y => [nthWeekday(y, 11, 4, 4)], 0],
    ['nye', "New Year's Eve", 'Global', y => [iso(y, 12, 31)], 0]
  ];
  // data(cc, y, test) must return matching ISO dates from the holiday data; it is given already-loaded country data
  function forYear(y, loaded) {
    const D = (cc, yy, test) => { const d = loaded[cc]; if (!d || !d[yy]) return []; return d[yy].filter(r => test(r[1])).map(r => yy + '-' + r[0]).slice(0, 1); };
    const out = [];
    for (const [id, name, trad, how, est] of LIST) for (const d of how(y, D)) out.push({ id, name, trad, date: d, est: !!est });
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  root.DiliaFest = { LIST, forYear, easter, orthodoxEaster, TRADS: ['Islamic', 'Hindu', 'Christian', 'Chinese', 'Buddhist', 'Jewish', 'Thai', 'Global'], NEED: ['IN', 'SG', 'TH', 'CN'] };
})(typeof window !== 'undefined' ? window : globalThis);
