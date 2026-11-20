/* Dilia Calc: the maths, kept apart from the page so it can be tested on its own. No network, no storage. */
(function (root) {
  'use strict';
  const MAXN = 1e15;
  function parse(s) {                                   // "1,250.50" -> 1250.5; anything else -> NaN
    if (typeof s === 'number') return isFinite(s) ? s : NaN;
    const t = String(s == null ? '' : s).trim().replace(/[,\s ']/g, '');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
    const n = parseFloat(t); return isFinite(n) && Math.abs(n) <= MAXN ? n : NaN;
  }
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  function percent(kind, a, b) {
    switch (kind) {
      case 'of': return { value: a / 100 * b };                                 // a% of b
      case 'is': if (b === 0) return { error: 'The second number cannot be 0.' }; return { value: a / b * 100 };   // a is what % of b
      case 'chg': if (a === 0) return { error: 'The starting number cannot be 0.' }; return { value: (b - a) / Math.abs(a) * 100 };  // from a to b
      case 'up': return { value: b * (1 + a / 100) };                           // increase b by a%
      case 'down': return { value: b * (1 - a / 100) };
    }
    return { error: 'Unknown calculation.' };
  }
  function vat(mode, amount, rate) {
    if (rate < 0) return { error: 'The rate cannot be negative.' };
    const k = 1 + rate / 100;
    if (mode === 'add') { const net = amount, gross = amount * k; return { net, vat: gross - net, gross }; }
    const gross = amount, net = amount / k; return { net, vat: gross - net, gross };
  }
  /* Loan: equal monthly payments. Rounded to cents like a bank statement; the last payment clears what is left. */
  function loan(principal, annualPct, months) {
    if (!(principal > 0)) return { error: 'Enter a loan amount above 0.' };
    if (!(months >= 1) || months > 1200 || months !== Math.floor(months)) return { error: 'The term must be a whole number of months, from 1 to 1200.' };
    if (annualPct < 0 || annualPct > 1000) return { error: 'The interest rate must be between 0% and 1000%.' };
    const i = annualPct / 1200;
    const raw = i === 0 ? principal / months : principal * i / (1 - Math.pow(1 + i, -months));
    const pay = r2(raw);
    const rows = []; let bal = principal, totInt = 0, totPaid = 0;
    for (let m = 1; m <= months; m++) {
      const interest = r2(bal * i);
      let payment = m === months ? r2(bal + interest) : pay;
      let principalPart = r2(payment - interest);
      if (principalPart > bal) { principalPart = bal; payment = r2(principalPart + interest); }
      bal = r2(bal - principalPart);
      totInt += interest; totPaid += payment;
      rows.push({ m, payment, principal: principalPart, interest, balance: bal });
    }
    return { payment: pay, totalPaid: r2(totPaid), totalInterest: r2(totInt), rows };
  }
  /* Compound interest. Interest is added each month at the rate that matches the chosen compounding, deposits go in at month end. */
  function compound(start, annualPct, years, perYear, monthly) {
    if (start < 0 || monthly < 0) return { error: 'Amounts cannot be negative.' };
    if (!(years > 0) || years > 100) return { error: 'Years must be above 0 and at most 100.' };
    if (annualPct < 0 || annualPct > 1000) return { error: 'The interest rate must be between 0% and 1000%.' };
    if (start === 0 && monthly === 0) return { error: 'Enter a starting amount or a monthly deposit.' };
    const months = Math.round(years * 12);
    const i = Math.pow(1 + annualPct / 100 / perYear, perYear / 12) - 1;
    let bal = start, dep = start; const rows = [];
    for (let m = 1; m <= months; m++) {
      bal = bal * (1 + i) + monthly; dep += monthly;
      if (m % 12 === 0 || m === months) rows.push({ year: m / 12, deposits: dep, interest: bal - dep, balance: bal });
    }
    return { balance: bal, deposits: dep, interest: bal - dep, rows };
  }

  /* Units. Every factor is the exact legal/SI definition (NIST SP 811, ISO 80000, IEC 80000-13) expressed in the base unit. */
  const UNITS = {
    length: { name: 'Length', base: 'metre', u: [['mm', 'Millimetre', 0.001], ['cm', 'Centimetre', 0.01], ['m', 'Metre', 1], ['km', 'Kilometre', 1000], ['in', 'Inch', 0.0254], ['ft', 'Foot', 0.3048], ['yd', 'Yard', 0.9144], ['mi', 'Mile', 1609.344], ['nmi', 'Nautical mile', 1852]] },
    weight: { name: 'Weight and mass', base: 'kilogram', u: [['mg', 'Milligram', 1e-6], ['g', 'Gram', 0.001], ['kg', 'Kilogram', 1], ['t', 'Tonne (metric)', 1000], ['oz', 'Ounce', 0.028349523125], ['lb', 'Pound', 0.45359237], ['st', 'Stone', 6.35029318], ['ust', 'US ton (short)', 907.18474], ['ukt', 'UK ton (long)', 1016.0469088]] },
    area: { name: 'Area', base: 'square metre', u: [['mm2', 'Square millimetre', 1e-6], ['cm2', 'Square centimetre', 1e-4], ['m2', 'Square metre', 1], ['ha', 'Hectare', 10000], ['km2', 'Square kilometre', 1e6], ['in2', 'Square inch', 0.00064516], ['ft2', 'Square foot', 0.09290304], ['yd2', 'Square yard', 0.83612736], ['ac', 'Acre', 4046.8564224], ['mi2', 'Square mile', 2589988.110336]] },
    volume: { name: 'Volume', base: 'litre', u: [['ml', 'Millilitre', 0.001], ['l', 'Litre', 1], ['m3', 'Cubic metre', 1000], ['tsp', 'Teaspoon (US)', 0.00492892159375], ['tbsp', 'Tablespoon (US)', 0.01478676478125], ['floz', 'Fluid ounce (US)', 0.0295735295625], ['cup', 'Cup (US)', 0.2365882365], ['pt', 'Pint (US)', 0.473176473], ['qt', 'Quart (US)', 0.946352946], ['gal', 'Gallon (US)', 3.785411784], ['ipt', 'Pint (UK)', 0.56826125], ['igal', 'Gallon (UK)', 4.54609], ['in3', 'Cubic inch', 0.016387064], ['ft3', 'Cubic foot', 28.316846592]] },
    speed: { name: 'Speed', base: 'metre per second', u: [['ms', 'Metre per second', 1], ['kmh', 'Kilometre per hour', 1 / 3.6], ['mph', 'Mile per hour', 0.44704], ['kn', 'Knot', 1852 / 3600], ['fts', 'Foot per second', 0.3048]] },
    time: { name: 'Time', base: 'second', u: [['ms', 'Millisecond', 0.001], ['s', 'Second', 1], ['min', 'Minute', 60], ['h', 'Hour', 3600], ['d', 'Day', 86400], ['wk', 'Week', 604800], ['mo', 'Month (average, 30.4375 days)', 2629800], ['yr', 'Year (365.25 days)', 31557600]] },
    data: { name: 'Data storage', base: 'byte', u: [['bit', 'Bit', 0.125], ['B', 'Byte', 1], ['KB', 'Kilobyte (1000 bytes)', 1e3], ['MB', 'Megabyte', 1e6], ['GB', 'Gigabyte', 1e9], ['TB', 'Terabyte', 1e12], ['PB', 'Petabyte', 1e15], ['KiB', 'Kibibyte (1024 bytes)', 1024], ['MiB', 'Mebibyte', 1048576], ['GiB', 'Gibibyte', 1073741824], ['TiB', 'Tebibyte', 1099511627776]] },
    energy: { name: 'Energy', base: 'joule', u: [['J', 'Joule', 1], ['kJ', 'Kilojoule', 1000], ['cal', 'Calorie (thermochemical)', 4.184], ['kcal', 'Kilocalorie (food Calorie)', 4184], ['Wh', 'Watt-hour', 3600], ['kWh', 'Kilowatt-hour', 3.6e6], ['btu', 'BTU (IT)', 1055.05585262], ['ftlb', 'Foot-pound force', 1.3558179483314004]] },
    pressure: { name: 'Pressure', base: 'pascal', u: [['Pa', 'Pascal', 1], ['kPa', 'Kilopascal', 1000], ['bar', 'Bar', 1e5], ['atm', 'Atmosphere (standard)', 101325], ['psi', 'Pound per square inch', 6894.757293168], ['mmHg', 'Millimetre of mercury', 133.322387415], ['inHg', 'Inch of mercury', 3386.389]] },
    temperature: { name: 'Temperature', base: 'kelvin', special: true, u: [['C', 'Celsius'], ['F', 'Fahrenheit'], ['K', 'Kelvin']] }
  };
  function convert(cat, from, to, v) {
    const c = UNITS[cat]; if (!c) return { error: 'Unknown category.' };
    if (c.special) {
      const toK = { C: x => x + 273.15, F: x => (x - 32) * 5 / 9 + 273.15, K: x => x }[from], fromK = { C: k => k - 273.15, F: k => (k - 273.15) * 9 / 5 + 32, K: k => k }[to];
      if (!toK || !fromK) return { error: 'Unknown unit.' };
      const k = toK(v); if (k < 0 && Math.abs(k) > 1e-9) return { error: 'That is below absolute zero.' };
      return { value: fromK(Math.max(k, 0)) };
    }
    const a = c.u.find(x => x[0] === from), b = c.u.find(x => x[0] === to);
    if (!a || !b) return { error: 'Unknown unit.' };
    return { value: v * a[2] / b[2] };
  }

  /* ---------- dates (calendar arithmetic on plain year-month-day, no time zones, no daylight saving) ---------- */
  const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = (y, m) => m === 2 && isLeap(y) ? 29 : DIM[m - 1];
  const num_ = d => Date.UTC(d.y, d.m - 1, d.d) / 864e5;          // day number; valid for years 1000-9999
  const fromNum = n => { const t = new Date(n * 864e5); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
  function ymd(str) {                                             // "2026-11-21" -> {y,m,d} or null
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || '').trim()); if (!m) return null;
    const d = { y: +m[1], m: +m[2], d: +m[3] };
    return d.y >= 1000 && d.m >= 1 && d.m <= 12 && d.d >= 1 && d.d <= dim(d.y, d.m) ? d : null;
  }
  const iso = d => String(d.y).padStart(4, '0') + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0');
  const cmp = (a, b) => num_(a) - num_(b);
  const weekday = d => new Date(num_(d) * 864e5).getUTCDay();      // 0 = Sunday
  function addMonths(d, n) {                                       // Jan 31 + 1 month = Feb 28/29 (clamped)
    const t = d.y * 12 + (d.m - 1) + n, y = Math.floor(t / 12), m = t - y * 12 + 1;
    if (y < 1000 || y > 9999) return null;
    return { y, m, d: Math.min(d.d, dim(y, m)) };
  }
  function addDate(d, years, months, days) {
    const a = addMonths(d, years * 12 + months); if (!a) return { error: 'That date is out of range (years 1000 to 9999).' };
    const r = fromNum(num_(a) + days); return r.y < 1000 || r.y > 9999 ? { error: 'That date is out of range (years 1000 to 9999).' } : { date: r };
  }
  function diffYMD(a, b) {                                         // a <= b
    let months = (b.y - a.y) * 12 + (b.m - a.m);
    if (cmp(addMonths(a, months), b) > 0) months--;
    const mid = addMonths(a, months), days = num_(b) - num_(mid);
    return { years: Math.floor(months / 12), months: months % 12, days, totalDays: num_(b) - num_(a) };
  }
  function ageOn(dob, asOf) {
    if (cmp(dob, asOf) > 0) return { error: 'The birth date is after the date you chose.' };
    const r = diffYMD(dob, asOf);
    let next = { y: asOf.y, m: dob.m, d: Math.min(dob.d, dim(asOf.y, dob.m)) };
    if (cmp(next, asOf) < 0) next = { y: asOf.y + 1, m: dob.m, d: Math.min(dob.d, dim(asOf.y + 1, dob.m)) };
    r.nextBirthday = next; r.daysToBirthday = num_(next) - num_(asOf); r.weekdayBorn = weekday(dob); return r;
  }
  const dayOfYear = d => num_(d) - num_({ y: d.y, m: 1, d: 1 }) + 1;
  function isoWeek(d) {                                            // ISO 8601 week number and week-year
    const wd = (weekday(d) + 6) % 7, thu = fromNum(num_(d) - wd + 3), y = thu.y;
    return { week: Math.floor((num_(thu) - num_({ y, m: 1, d: 1 })) / 7) + 1, year: y };
  }
  /* Count days between two dates (both included) that are not weekend days and not in the holiday set. */
  function workdays(a, b, weekend, holidays) {
    if (cmp(a, b) > 0) return { error: 'The first date is after the second.' };
    const n0 = num_(a), n1 = num_(b); if (n1 - n0 > 36600) return { error: 'Pick dates less than 100 years apart.' };
    let work = 0, wk = 0, hol = 0;
    for (let n = n0; n <= n1; n++) {
      const d = fromNum(n), w = new Date(n * 864e5).getUTCDay();
      if (weekend.has(w)) { wk++; continue; }
      if (holidays && holidays.has(iso(d))) { hol++; continue; }
      work++;
    }
    return { workdays: work, weekendDays: wk, holidayDays: hol, totalDays: n1 - n0 + 1 };
  }
  /* UAE end-of-service gratuity, private sector, foreign full-time worker (Federal Decree-Law 33 of 2021, Art. 51; MOHRE).
     21 days of basic wage per year for the first 5 years, 30 days for each year after; part years pro rata; 1 year minimum;
     unpaid absence not counted; total capped at 2 years' basic wage. Wage per day = monthly basic / 30. */
  function gratuity(basic, start, end, unpaidDays) {
    if (!(basic > 0)) return { error: 'Enter the monthly basic salary.' };
    if (cmp(start, end) > 0) return { error: 'The last day is before the first day.' };
    if (!(unpaidDays >= 0) || unpaidDays !== Math.floor(unpaidDays)) return { error: 'Unpaid leave must be a whole number of days, 0 or more.' };
    const total = num_(end) - num_(start) + 1, service = total - unpaidDays;
    if (service < 0) return { error: 'Unpaid leave is longer than the whole service.' };
    const years = service / 365, d = diffYMD(start, fromNum(num_(end) + 1));   // both the first and the last day count
    if (service < 365) return { eligible: false, serviceDays: service, years, totalDays: total, ymd: d };
    const first = Math.min(years, 5), rest = Math.max(years - 5, 0), days = 21 * first + 30 * rest, daily = basic / 30;
    const raw = daily * days, cap = basic * 24, capped = raw > cap;
    return { eligible: true, serviceDays: service, totalDays: total, years, ymd: d, gratuityDays: days, dailyWage: daily, amount: r2(Math.min(raw, cap)), uncapped: r2(raw), capped, cap };
  }
  /* ---------- time zones (browser Intl and the IANA tz database built into it) ---------- */
  const dtfs = {};
  function parts(zone, ms) {
    const f = dtfs[zone] || (dtfs[zone] = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }));
    const o = {}; f.formatToParts(new Date(ms)).forEach(p => { if (p.type !== 'literal') o[p.type] = +p.value; });
    return { y: o.year, m: o.month, d: o.day, h: o.hour % 24, mi: o.minute, s: o.second };
  }
  const offsetMin = (zone, ms) => { const p = parts(zone, ms); return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / 60000); };
  /* wall clock time in a zone -> UTC milliseconds. Returns {ms, ambiguous} or {error} when the time does not exist (clocks jump forward). */
  function wallToUtc(zone, y, m, d, h, mi) {
    const guess = Date.UTC(y, m - 1, d, h, mi), cands = new Set();
    for (const off of [offsetMin(zone, guess - 864e5), offsetMin(zone, guess + 864e5), offsetMin(zone, guess)]) {
      const ms = guess - off * 60000, p = parts(zone, ms);
      if (p.y === y && p.m === m && p.d === d && p.h === h && p.mi === mi) cands.add(ms);
    }
    if (!cands.size) return { error: 'That time does not exist in this zone on that date, because the clocks move forward.' };
    const all = [...cands].sort((a, b) => a - b); return { ms: all[0], ambiguous: all.length > 1 };
  }
  const api = { ymd, iso, cmp, weekday, addMonths, addDate, diffYMD, ageOn, dayOfYear, isoWeek, workdays, gratuity, dim, isLeap, num_, fromNum, parts, offsetMin, wallToUtc, parse, percent, vat, loan, compound, r2, UNITS, convert };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CalcMath = api;
})(typeof window !== 'undefined' ? window : globalThis);
