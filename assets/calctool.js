/* Dilia Calc page. Everything is worked out in this tab. Nothing is sent or stored.
   Results are put on the page with textContent only, never innerHTML. */
{
const SRC = document.currentScript && document.currentScript.src;
const { $, toast, save } = Kit; const CM = window.CalcMath;
const MODE = document.body.dataset.calc || 'pct', PRESET = document.body.dataset.preset || 'all';
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const ctl = {};
const CURR = [['', 'No currency'], ['AED', 'AED'], ['USD', 'USD'], ['EUR', 'EUR'], ['GBP', 'GBP'], ['LKR', 'LKR'], ['INR', 'INR'], ['SAR', 'SAR'], ['PKR', 'PKR']];
function field(parent, id, label, node, wide) { const w = el('div', 'tf' + (wide ? ' wide' : '')); const l = el('label', 'lbl', label); l.htmlFor = id; node.id = id; ctl[id] = node; w.append(l, node); parent.append(w); return node; }
function num(parent, id, label, val, ph) { const i = el('input'); i.type = 'text'; i.inputMode = 'decimal'; i.value = val; i.placeholder = ph || ''; i.autocomplete = 'off'; i.spellcheck = false; i.addEventListener('input', run); return field(parent, id, label, i); }
function select(parent, id, label, opts, val) { const s = el('select', 'dd'); opts.forEach(([v, t]) => { const o = el('option', '', t); o.value = v; s.append(o); }); s.value = val; s.addEventListener('change', run); return field(parent, id, label, s); }
const val = id => ctl[id].value;
const get = (id, name) => { const n = CM.parse(val(id)); if (isNaN(n)) throw new Error('Enter a number for "' + name + '".'); return n; };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const longDate = d => DAYS[CM.weekday(d)] + ' ' + d.d + ' ' + MONTHS[d.m - 1] + ' ' + d.y;
const todayYMD = () => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; };
function dateIn(parent, id, label, val) { const i = el('input'); i.type = 'date'; i.min = '1000-01-01'; i.max = '9999-12-31'; i.value = val ? CM.iso(val) : ''; i.addEventListener('input', run); return field(parent, id, label, i); }
const getDate = (id, name) => { const d = CM.ymd(val(id)); if (!d) throw new Error('Pick a valid date for "' + name + '".'); return d; };
const ymdText = r => [r.years && CM.plural0(r.years, 'year'), r.months && CM.plural0(r.months, 'month'), (r.days || (!r.years && !r.months)) && CM.plural0(r.days, 'day')].filter(Boolean).join(', ');
let HOL = null; const HC = {};
async function holIndex() { if (!HOL) { const r = await fetch(new URL('holidays/index.json', SRC)); if (!r.ok) throw new Error('Holiday data could not be loaded.'); HOL = await r.json(); } return HOL; }
async function holFor(cc, year) {
  const ix = await holIndex(); if (year < ix.years[0] || year > ix.years[1]) return null;
  if (!HC[cc]) { const r = await fetch(new URL('holidays/' + cc + '.json', SRC)); if (!r.ok) throw new Error('Holiday data could not be loaded.'); HC[cc] = await r.json(); }
  if (!(String(year) in HC[cc])) return null;
  return HC[cc][String(year)].map(([md, name, est]) => ({ date: year + '-' + md, name, est }));
}
const countryName = cc => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || cc; } catch (e) { return cc; } };
async function countrySelect(parent, id, label, withNone, dflt) {
  const ph = el('div'); parent.append(ph);                 // keeps the field in place while the list loads
  const ix = await holIndex(), list = ix.countries.map(c => [c, countryName(c)]).sort((a, b) => a[1].localeCompare(b[1]));
  const s = select(parent, id, label, (withNone ? [['', 'No holidays']] : []).concat(list), dflt); ph.replaceWith(s.parentNode); return s;
}
function credit() {
  const p = el('p', 'tip credit'); p.append('Holiday dates come from the open-source ');
  const a = el('a', '', 'holidays library'); a.href = 'https://github.com/vacanza/holidays'; a.target = '_blank'; a.rel = 'noopener noreferrer'; p.append(a, ' (MIT licence, Vacanza and contributors). Country-wide public holidays only; regional holidays can differ. Holidays tied to the moon (such as Eid) are estimates until the government announces them. Always check with your official source.');
  return p;
}

function fmt(n, cur) {
  const o = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  if (cur) { try { return new Intl.NumberFormat(undefined, { ...o, style: 'currency', currency: cur, currencyDisplay: 'code' }).format(n); } catch (e) { /* fall through */ } }
  return new Intl.NumberFormat(undefined, o).format(n);
}
CM.plural0 = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const plain = n => new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(n);
const OUT = $('#cOut'), FORM = $('#cIn');
function stats(rows, cls) { const g = el('div', 'tstats' + (cls ? ' ' + cls : '')); rows.forEach(([v, l]) => { const d = el('div', 'tst'); d.append(el('b', '', v), el('span', '', l)); g.append(d); }); return g; }
function fail(msg) { OUT.replaceChildren(el('p', 'tnote bad', msg)); }
function table(head, rows, left) {
  left = left || []; const w = el('div', 'ctable'); const t = el('table'); const th = el('thead'), tr = el('tr'); head.forEach((h, i) => tr.append(el('th', left.includes(i) ? 'l' : '', h))); th.append(tr); t.append(th);
  const tb = el('tbody'); rows.forEach(r => { const x = el('tr'); r.forEach((c, i) => x.append(el(i ? 'td' : 'th', left.includes(i) ? 'l' : '', c))); if (r.length) tb.append(x); }); t.append(tb); w.append(t); return w;
}
const csv = (head, rows) => '\ufeff' + [head, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
function csvBtn(head, rows, name) {
  const b = el('button', 'btn ghost sm', 'Download CSV'); b.type = 'button';
  b.addEventListener('click', () => { const u = URL.createObjectURL(new Blob([csv(head, rows)], { type: 'text/csv' })); save(u, name); setTimeout(() => URL.revokeObjectURL(u), 4000); });
  const d = el('div', 'tact'); d.append(b); return d;
}

function build() {
  const g = el('div', 'tgrid'); FORM.append(g);
  if (MODE === 'pct') {
    select(g, 'kind', 'What do you want to know?', [['of', 'What is X% of Y?'], ['is', 'X is what % of Y?'], ['chg', 'Percent change from X to Y'], ['up', 'Increase Y by X%'], ['down', 'Decrease Y by X%']], 'of');
    num(g, 'a', 'X', '15'); num(g, 'b', 'Y', '200');
    ctl.kind.addEventListener('change', labels);
  } else if (MODE === 'vat') {
    select(g, 'vmode', 'I want to', [['add', 'Add VAT to a price'], ['remove', 'Take VAT out of a price']], 'add');
    num(g, 'amt', 'Amount', '1000'); num(g, 'rate', 'VAT rate (%)', '5');
    select(g, 'cur', 'Currency label', CURR, 'AED');
    g.append(Object.assign(el('p', 'tip wide', 'Rates differ by country and change. Check the rate that applies to you. 5% is the UAE standard rate.')));
  } else if (MODE === 'loan') {
    num(g, 'amt', 'Loan amount', '100000'); num(g, 'rate', 'Interest rate per year (%)', '6');
    num(g, 'term', 'Term', '30'); select(g, 'unit', 'Term in', [['y', 'Years'], ['m', 'Months']], 'y');
    select(g, 'cur', 'Currency label', CURR, '');
    g.append(el('p', 'tip wide', 'Equal monthly payments, interest worked out each month on what is left. Fees, insurance and other charges are not included, so your bank may quote a different figure.'));
  } else if (MODE === 'comp') {
    num(g, 'start', 'Starting amount', '10000'); num(g, 'monthly', 'Added every month', '200');
    num(g, 'rate', 'Interest rate per year (%)', '5'); num(g, 'years', 'Years', '10');
    select(g, 'freq', 'Interest added', [['1', 'Once a year'], ['2', 'Twice a year'], ['4', 'Every quarter'], ['12', 'Every month'], ['365', 'Every day']], '12');
    select(g, 'cur', 'Currency label', CURR, '');
    g.append(el('p', 'tip wide', 'Monthly deposits go in at the end of each month. Interest rates are not guaranteed and tax is not included.'));
  }
  else if (MODE === 'unit') {
    const cats = Object.entries(CM.UNITS);
    if (PRESET === 'all') select(g, 'cat', 'What are you measuring?', cats.map(([k, v]) => [k, v.name]), 'length'); else { const h = el('input'); h.type = 'hidden'; h.id = 'cat'; h.value = PRESET; ctl.cat = h; g.append(h); }
    num(g, 'uv', 'Amount', '1');
    select(g, 'ufrom', 'From', [], ''); select(g, 'uto', 'To', [], '');
    const sw = el('button', 'btn ghost sm', 'Swap units'); sw.type = 'button'; sw.addEventListener('click', () => { const a = ctl.ufrom.value; ctl.ufrom.value = ctl.uto.value; ctl.uto.value = a; run(); });
    const d = el('div', 'tact wide'); d.append(sw); g.append(d);
    if (ctl.cat.tagName === 'SELECT') ctl.cat.addEventListener('change', () => { units(); run(); });
    units();
  }
  else if (MODE === 'dd') {
    const t = todayYMD(); dateIn(g, 'd1', 'From', { y: t.y, m: 1, d: 1 }); dateIn(g, 'd2', 'To', t);
    g.append(el('p', 'tip wide', 'The start day is not counted, the end day is. If the first date is later, the dates are swapped.'));
  } else if (MODE === 'dadd') {
    dateIn(g, 'd1', 'Start date', todayYMD()); select(g, 'op', 'Do you want to', [['+', 'Add'], ['-', 'Subtract']], '+');
    num(g, 'ny', 'Years', '0'); num(g, 'nm', 'Months', '0'); num(g, 'nw', 'Weeks', '0'); num(g, 'nd', 'Days', '30');
    g.append(el('p', 'tip wide', 'Months are added first, then weeks and days. Adding a month to 31 January gives the last day of February.'));
  } else if (MODE === 'dage') {
    dateIn(g, 'd1', 'Date of birth', { y: 1990, m: 1, d: 1 }); dateIn(g, 'd2', 'Age on', todayYMD());
  } else if (MODE === 'dwk') {
    dateIn(g, 'd1', 'Date', todayYMD());
  } else if (MODE === 'dwork') {
    const t = todayYMD(); dateIn(g, 'd1', 'From (counted)', t); dateIn(g, 'd2', 'To (counted)', CM.addDate(t, 0, 0, 30).date);
    select(g, 'wend', 'Weekend days', [['06', 'Saturday and Sunday'], ['56', 'Friday and Saturday'], ['5', 'Friday only'], ['0', 'Sunday only'], ['', 'No weekend']], '06');
    countrySelect(g, 'cc', 'Skip public holidays of', true, '').then(() => run()).catch(() => {});
    g.append(el('p', 'tip wide', 'Both dates are counted. Holiday data covers 2024 to 2035.'));
  } else if (MODE === 'dtz') {
    const zs = zoneList(), home = homeZone(), now = new Date(), wall = CM.parts(home, now.getTime());
    const o = { y: wall.y, m: wall.m, d: wall.d }; const dt = el('input'); dt.type = 'datetime-local'; dt.value = CM.iso(o) + 'T' + String(wall.h).padStart(2, '0') + ':' + String(Math.floor(wall.mi / 15) * 15 || 0).padStart(2, '0'); dt.addEventListener('input', run);
    field(g, 'when', 'Date and time', dt);
    zoneSelect(g, 'z0', 'In this time zone', zs, home);
    ['Asia/Dubai', 'Asia/Colombo', 'Europe/London', 'America/New_York'].filter(x => x !== home).slice(0, 3).forEach((x, i) => zoneSelect(g, 'z' + (i + 1), 'Show me ' + (i + 1), zs, x));
    g.append(el('p', 'tip wide', 'Uses the time zone rules built into your browser, including daylight saving. Rules can change, so check important meetings.'));
  } else if (MODE === 'hol') {
    const t = todayYMD(); countrySelect(g, 'cc', 'Country', false, 'AE').then(() => run()).catch(() => {});
    select(g, 'yr', 'Year', Array.from({ length: 12 }, (_, i) => [String(2024 + i), String(2024 + i)]), String(Math.min(Math.max(t.y, 2024), 2035)));
  } else if (MODE === 'grat') {
    const t = todayYMD(); num(g, 'basic', 'Last monthly basic salary', '10000'); select(g, 'cur', 'Currency label', CURR.slice(1), 'AED');
    dateIn(g, 'd1', 'First day of work', { y: t.y - 5, m: 1, d: 1 }); dateIn(g, 'd2', 'Last day of work', t); num(g, 'unp', 'Unpaid leave days (not counted)', '0');
    g.append(el('p', 'tip wide', 'For full-time, non-UAE national staff of mainland private companies, under Federal Decree-Law 33 of 2021 (Article 51). Basic salary only, no allowances. UAE nationals follow the pension system, and free zones such as DIFC and ADGM can have their own rules. This is an estimate, not legal advice. Your contract or the labour ministry has the final say.'));
  }
  labels();
}
function zoneList() { try { const l = Intl.supportedValuesOf('timeZone'); if (l.length) return l; } catch (e) { /* older browser */ } return ['Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'America/Chicago', 'America/Los_Angeles', 'America/New_York', 'America/Sao_Paulo', 'Asia/Colombo', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Riyadh', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/Berlin', 'Europe/London', 'Europe/Paris', 'Pacific/Auckland', 'UTC']; }
function homeZone() { try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (z && z !== 'UTC') return z; } catch (e) { /* ignore */ } return 'Asia/Dubai'; }
function zoneSelect(g, id, label, zs, v) { const list = zs.includes(v) ? zs : [v, ...zs]; return select(g, id, label, list.map(x => [x, x.replace(/_/g, ' ')]), v); }
function offLabel(zone, ms) { const m = CM.offsetMin(zone, ms), s = m < 0 ? '-' : '+', a = Math.abs(m); return 'UTC' + s + Math.floor(a / 60) + (a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''); }
const pad = n => String(n).padStart(2, '0');
function units() {
  const c = CM.UNITS[val('cat')], keep = [ctl.ufrom.value, ctl.uto.value];
  [ctl.ufrom, ctl.uto].forEach((s, n) => { s.replaceChildren(); c.u.forEach(([k, name]) => { const o = el('option', '', name + (c.special ? '' : ' (' + k + ')')); o.value = k; s.append(o); }); });
  const ks = c.u.map(x => x[0]); ctl.ufrom.value = ks.includes(keep[0]) ? keep[0] : ks[0]; ctl.uto.value = ks.includes(keep[1]) && keep[1] !== ctl.ufrom.value ? keep[1] : ks[Math.min(1, ks.length - 1)] !== ctl.ufrom.value ? ks[Math.min(1, ks.length - 1)] : ks[0];
}
const sig = n => { const a = Math.abs(n); if (a === 0) return '0'; if (a >= 1e-6 && a < 1e15) return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 10 }).format(n); return n.toExponential(6).replace(/\.?0+e/, 'e'); };
function labels() {
  if (MODE !== 'pct') return;
  const t = { of: ['Percent (X)', 'Number (Y)'], is: ['Number (X)', 'Total (Y)'], chg: ['From (X)', 'To (Y)'], up: ['Percent to add (X)', 'Number (Y)'], down: ['Percent to take off (X)', 'Number (Y)'] }[val('kind')];
  ctl.a.previousSibling.textContent = t[0]; ctl.b.previousSibling.textContent = t[1];
}

function run() {
  tok++;
  try {
    if (MODE === 'pct') {
      const k = val('kind'), a = get('a', 'X'), b = get('b', 'Y'), r = CM.percent(k, a, b); if (r.error) return fail(r.error);
      const isPct = k === 'is' || k === 'chg';
      const main = plain(CM.r2(r.value * 1e4) / 1e4) + (isPct ? '%' : '');
      const sent = { of: plain(a) + '% of ' + plain(b) + ' is ' + main, is: plain(a) + ' is ' + main + ' of ' + plain(b), chg: 'From ' + plain(a) + ' to ' + plain(b) + ' is a change of ' + main, up: plain(b) + ' increased by ' + plain(a) + '% is ' + main, down: plain(b) + ' decreased by ' + plain(a) + '% is ' + main }[k];
      OUT.replaceChildren(stats([[main, 'Answer']], 'two'), el('p', 'tnote', sent + '.'));
      if (k === 'chg') OUT.append(el('p', 'tip', r.value >= 0 ? 'That is an increase.' : 'That is a decrease.'));
    } else if (MODE === 'vat') {
      const a = get('amt', 'Amount'), rt = get('rate', 'VAT rate'), cur = val('cur');
      if (a < 0) return fail('The amount cannot be negative.'); const r = CM.vat(val('vmode'), a, rt); if (r.error) return fail(r.error);
      OUT.replaceChildren(stats([[fmt(r.net, cur), 'Price without VAT'], [fmt(r.vat, cur), 'VAT (' + plain(rt) + '%)'], [fmt(r.gross, cur), 'Price with VAT']]));
    } else if (MODE === 'loan') {
      const cur = val('cur'), p = get('amt', 'Loan amount'), rt = get('rate', 'Interest rate'), t = get('term', 'Term'), months = val('unit') === 'y' ? t * 12 : t;
      const r = CM.loan(p, rt, months); if (r.error) return fail(r.error);
      const head = ['Month', 'Payment', 'Principal', 'Interest', 'Balance'], rows = r.rows.map(x => [String(x.m), fmt(x.payment, cur), fmt(x.principal, cur), fmt(x.interest, cur), fmt(x.balance, cur)]);
      const raw = r.rows.map(x => [x.m, x.payment.toFixed(2), x.principal.toFixed(2), x.interest.toFixed(2), x.balance.toFixed(2)]);
      OUT.replaceChildren(stats([[fmt(r.payment, cur), 'Monthly payment'], [fmt(r.totalInterest, cur), 'Total interest'], [fmt(r.totalPaid, cur), 'Total paid']]),
        csvBtn(head, raw, 'Dilia-loan-schedule.csv'), table(head, rows));
    } else if (MODE === 'unit') {
      const cat = val('cat'), v = get('uv', 'Amount'), c = CM.UNITS[cat], fr = val('ufrom'), to = val('uto'), r = CM.convert(cat, fr, to, v); if (r.error) return fail(r.error);
      const nm = k => c.u.find(x => x[0] === k)[1].replace(/ \(.*\)$/, '');
      const rows = c.u.map(([k, name]) => [name, sig(CM.convert(cat, fr, k, v).value || 0)]);
      OUT.replaceChildren(stats([[sig(r.value), nm(to)]], 'two'), el('p', 'tnote', sig(v) + ' ' + nm(fr).toLowerCase() + (c.special ? '' : ' = ' + sig(r.value) + ' ' + nm(to).toLowerCase())), el('h3', 'tsub', 'All ' + c.name.toLowerCase() + ' units'), table(['Unit', 'Value'], rows));
    } else if (MODE === 'comp') {
      const cur = val('cur'), s = get('start', 'Starting amount'), m = get('monthly', 'Added every month'), rt = get('rate', 'Interest rate'), y = get('years', 'Years');
      const r = CM.compound(s, rt, y, parseInt(val('freq'), 10), m); if (r.error) return fail(r.error);
      const head = ['Year', 'Total put in', 'Interest earned', 'Balance'], rows = r.rows.map(x => [plain(x.year), fmt(x.deposits, cur), fmt(x.interest, cur), fmt(x.balance, cur)]);
      const raw = r.rows.map(x => [x.year, x.deposits.toFixed(2), x.interest.toFixed(2), x.balance.toFixed(2)]);
      OUT.replaceChildren(stats([[fmt(r.balance, cur), 'Final balance'], [fmt(r.deposits, cur), 'Total put in'], [fmt(r.interest, cur), 'Interest earned']]),
        csvBtn(head, raw, 'Dilia-compound-interest.csv'), table(head, rows));
    } else if (MODE === 'dd') {
      let a = getDate('d1', 'From'), b = getDate('d2', 'To'), swapped = false; if (CM.cmp(a, b) > 0) { [a, b] = [b, a]; swapped = true; }
      const r = CM.diffYMD(a, b), w = CM.workdays(CM.addDate(a, 0, 0, 1).date || a, b, new Set([0, 6]), null);
      OUT.replaceChildren(stats([[ymdText(r), 'Years, months and days'], [plain(r.totalDays), 'Days in total'], [Math.floor(r.totalDays / 7) + ' weeks ' + (r.totalDays % 7) + ' days', 'Weeks and days']]),
        el('p', 'tnote', 'From ' + longDate(a) + ' to ' + longDate(b) + '.'), el('p', 'tip', (w.error ? '' : 'Monday to Friday days in between: ' + plain(w.workdays) + '. ') + 'Hours: ' + plain(r.totalDays * 24) + '.' + (swapped ? ' The dates were swapped.' : '')));
    } else if (MODE === 'dadd') {
      const s = getDate('d1', 'Start date'), sign = val('op') === '-' ? -1 : 1, ny = get('ny', 'Years'), nm = get('nm', 'Months'), nw = get('nw', 'Weeks'), nd = get('nd', 'Days');
      if (![ny, nm, nw, nd].every(v => Number.isInteger(v) && v >= 0 && v <= 100000)) return fail('Use whole numbers from 0 to 100000.');
      const r = CM.addDate(s, sign * ny, sign * nm, sign * (nw * 7 + nd)); if (r.error) return fail(r.error);
      OUT.replaceChildren(stats([[longDate(r.date), (sign > 0 ? 'Date after adding' : 'Date after subtracting')]], 'two'), el('p', 'tnote', 'Start: ' + longDate(s) + '.'));
    } else if (MODE === 'dage') {
      const a = CM.ageOn(getDate('d1', 'Date of birth'), getDate('d2', 'Age on')); if (a.error) return fail(a.error);
      OUT.replaceChildren(stats([[ymdText(a), 'Age'], [plain(a.totalDays), 'Days old'], [a.daysToBirthday === 0 ? 'Today' : plain(a.daysToBirthday) + ' days', 'Next birthday']]),
        el('p', 'tnote', 'Born on a ' + DAYS[a.weekdayBorn] + '. Next birthday: ' + longDate(a.nextBirthday) + '.'), el('p', 'tip', 'Someone born on 29 February is counted as having their birthday on 28 February in other years.'));
    } else if (MODE === 'dwk') {
      const d = getDate('d1', 'Date'), w = CM.isoWeek(d), yd = CM.dayOfYear(d), yl = CM.isLeap(d.y) ? 366 : 365;
      OUT.replaceChildren(stats([[DAYS[CM.weekday(d)], longDate(d)], ['Day ' + yd + ' of ' + yl, (yl - yd) + ' days left in ' + d.y], ['Week ' + w.week + (w.year !== d.y ? ' of ' + w.year : ''), 'ISO week number']]),
        el('p', 'tip', d.y + (CM.isLeap(d.y) ? ' is a leap year.' : ' is not a leap year.') + ' ' + MONTHS[d.m - 1] + ' has ' + CM.dim(d.y, d.m) + ' days.'));
    } else if (MODE === 'dtz') { return tzRun(); }
    else if (MODE === 'hol') { return holRun(); }
    else if (MODE === 'dwork') { return workRun(); }
    else if (MODE === 'grat') {
      const basic = get('basic', 'Basic salary'), cur = val('cur'), s = getDate('d1', 'First day'), e = getDate('d2', 'Last day'), un = get('unp', 'Unpaid leave days');
      const r = CM.gratuity(basic, s, e, un); if (r.error) return fail(r.error);
      if (!r.eligible) return OUT.replaceChildren(stats([['Not yet', 'Gratuity'], [plain(r.serviceDays) + ' days', 'Counted service']], 'two'), el('p', 'tnote', 'Gratuity needs at least one year of continuous service (365 days, not counting unpaid leave).'));
      OUT.replaceChildren(stats([[fmt(r.amount, cur), 'Estimated gratuity'], [ymdText(r.ymd), 'Service'], [plain(CM.r2(r.gratuityDays)) + ' days', 'Days of basic pay']]),
        el('p', 'tnote', 'Daily wage = basic salary / 30 = ' + fmt(r.dailyWage, cur) + '. First 5 years at 21 days per year, later years at 30 days per year, part years counted in proportion.'),
        r.capped ? el('p', 'tnote bad', 'Capped: the law limits gratuity to 2 years of basic pay (' + fmt(r.cap, cur) + '). Without the cap it would be ' + fmt(r.uncapped, cur) + '.') : el('p', 'tip', 'The limit is 2 years of basic pay (' + fmt(r.cap, cur) + '); you are under it.'));
    }
  } catch (e) { fail(e.message); }
}
let tok = 0;
function tzRun() {
  const w = val('when'), m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(w); if (!m || +m[1] < 1000) return fail('Pick a date and time.');
  const zones = ['z0', 'z1', 'z2', 'z3'].filter(i => ctl[i]).map(i => val(i)), src = zones[0];
  const r = CM.wallToUtc(src, +m[1], +m[2], +m[3], +m[4], +m[5]); if (r.error) return fail(r.error);
  const rows = zones.map(z => { const p = CM.parts(z, r.ms), d = { y: p.y, m: p.m, d: p.d }; return [z.replace(/_/g, ' '), pad(p.h) + ':' + pad(p.mi), longDate(d), offLabel(z, r.ms)]; });
  const out = [stats(rows.slice(0, 1).map(x => [x[1], x[0] + ', ' + x[2]]), 'two'), table(['Time zone', 'Time', 'Date', 'Offset'], rows, [0, 2])];
  if (r.ambiguous) out.push(el('p', 'tnote bad', 'This clock time happens twice in ' + src.replace(/_/g, ' ') + ' (clocks go back). The first one is used.'));
  // meeting planner: every hour of the chosen day in the first zone
  const hrs = []; let any = false;
  for (let h = 0; h < 24; h++) {
    const t = CM.wallToUtc(src, +m[1], +m[2], +m[3], h, 0); if (t.error) continue;
    const cells = zones.map(z => { const p = CM.parts(z, t.ms); return { txt: pad(p.h) + ':' + pad(p.mi), h: p.h, day: p.d !== +m[3] || p.m !== +m[2] ? (CM.cmp({ y: p.y, m: p.m, d: p.d }, { y: +m[1], m: +m[2], d: +m[3] }) > 0 ? ' +1 day' : ' -1 day') : '' }; });
    const good = cells.every(c => c.h >= 9 && c.h < 18); any = any || good; hrs.push({ cells, good });
  }
  const plan = el('div', 'ctable plan'), tb = el('table'), th = el('thead'), htr = el('tr'); zones.forEach(z => htr.append(el('th', '', z.split('/').pop().replace(/_/g, ' ')))); th.append(htr); tb.append(th);
  const body = el('tbody'); hrs.forEach(({ cells, good }) => { const tr = el('tr', good ? 'goodrow' : ''); cells.forEach(c => { const cls = c.h >= 9 && c.h < 18 ? 'wk' : (c.h >= 22 || c.h < 7 ? 'ng' : 'ev'); tr.append(el('td', cls, c.txt + c.day + (good ? ' \u2713' : ''))); }); body.append(tr); }); tb.append(body); plan.append(tb);
  out.push(el('h3', 'tsub', 'Meeting planner for ' + longDate({ y: +m[1], m: +m[2], d: +m[3] })), el('p', 'tip', 'Green = 09:00 to 17:59, grey = night (22:00 to 06:59). A tick means every zone is in working hours.' + (any ? '' : ' No hour of this day suits every zone.')), plan);
  OUT.replaceChildren(...out);
}
async function holRun() {
  if (!ctl.cc || !ctl.yr) return; const my = ++tok, cc = val('cc'), yr = parseInt(val('yr'), 10); if (!cc) return;
  try {
    const rows = await holFor(cc, yr); if (my !== tok) return; if (!rows) return fail('The holiday list for ' + countryName(cc) + ' does not cover ' + yr + '. Try another year.');
    const ix = HOL, est = rows.some(r => r.est), trs = rows.map(r => { const d = CM.ymd(r.date); return [longDate(d), r.name + (r.est ? ' (expected)' : '')]; });
    const head = ['Date', 'Holiday'];
    if (!rows.length) return OUT.replaceChildren(el('p', 'tnote', 'No country-wide public holidays are listed for ' + countryName(cc) + ' in ' + yr + '.'), credit());
    const raw = rows.map(r => [r.date, r.name, r.est ? 'expected' : 'official']);
    OUT.replaceChildren(stats([[String(rows.length), 'Public holiday days in ' + yr + ', ' + countryName(cc)]], 'two'), est ? el('p', 'tnote', 'Dates marked "expected" depend on the moon or have not been announced yet. They can move by a day or more.') : el('p', 'tip', 'Check the official announcement before you plan around a date.'),
      csvBtn(['Date', 'Holiday', 'Status'], raw, 'Dilia-holidays-' + cc + '-' + yr + '.csv'), table(head, trs, [0, 1]), el('p', 'tip', 'Data version ' + ix.version + ', built ' + ix.generated + '.'), credit());
  } catch (e) { if (my === tok) fail(e.message); }
}
async function workRun() {
  const my = ++tok;
  try {
    let a = getDate('d1', 'From'), b = getDate('d2', 'To'); if (CM.cmp(a, b) > 0) [a, b] = [b, a];
    const wk = new Set((val('wend') || '').split('').map(Number)), cc = ctl.cc ? val('cc') : '';
    let hs = null, list = [];
    if (cc) {
      hs = new Set(); for (let y = a.y; y <= b.y; y++) { const rows = await holFor(cc, y); if (my !== tok) return; if (!rows) return fail('The holiday list for ' + countryName(cc) + ' does not cover ' + y + '. Choose "No holidays" or change the dates.'); rows.forEach(r => { hs.add(r.date); list.push(r); }); }
      list = list.filter(r => r.date >= CM.iso(a) && r.date <= CM.iso(b) && !wk.has(CM.weekday(CM.ymd(r.date))));
    }
    const r = CM.workdays(a, b, wk, hs); if (r.error) return fail(r.error);
    const out = [stats([[plain(r.workdays), 'Working days'], [plain(r.weekendDays), 'Weekend days'], [plain(r.holidayDays), 'Holidays on working days']]), el('p', 'tnote', longDate(a) + ' to ' + longDate(b) + ', ' + plain(r.totalDays) + ' days counted.')];
    if (list.length) { out.push(el('h3', 'tsub', 'Holidays skipped'), table(['Date', 'Holiday'], list.map(x => [longDate(CM.ymd(x.date)), x.name + (x.est ? ' (expected)' : '')]), [0, 1])); }
    if (cc) out.push(credit());
    OUT.replaceChildren(...out);
  } catch (e) { if (my === tok) fail(e.message); }
}
build(); run();
}
