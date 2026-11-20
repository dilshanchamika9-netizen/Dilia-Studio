/* Dilia Calc page. Everything is worked out in this tab. Nothing is sent or stored.
   Results are put on the page with textContent only, never innerHTML. */
{
const { $, toast, save } = Kit; const CM = window.CalcMath;
const MODE = document.body.dataset.calc || 'pct';
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const ctl = {};
const CURR = [['', 'No currency'], ['AED', 'AED'], ['USD', 'USD'], ['EUR', 'EUR'], ['GBP', 'GBP'], ['LKR', 'LKR'], ['INR', 'INR'], ['SAR', 'SAR'], ['PKR', 'PKR']];
function field(parent, id, label, node, wide) { const w = el('div', 'tf' + (wide ? ' wide' : '')); const l = el('label', 'lbl', label); l.htmlFor = id; node.id = id; ctl[id] = node; w.append(l, node); parent.append(w); return node; }
function num(parent, id, label, val, ph) { const i = el('input'); i.type = 'text'; i.inputMode = 'decimal'; i.value = val; i.placeholder = ph || ''; i.autocomplete = 'off'; i.spellcheck = false; i.addEventListener('input', run); return field(parent, id, label, i); }
function select(parent, id, label, opts, val) { const s = el('select', 'dd'); opts.forEach(([v, t]) => { const o = el('option', '', t); o.value = v; s.append(o); }); s.value = val; s.addEventListener('change', run); return field(parent, id, label, s); }
const val = id => ctl[id].value;
const get = (id, name) => { const n = CM.parse(val(id)); if (isNaN(n)) throw new Error('Enter a number for "' + name + '".'); return n; };

function fmt(n, cur) {
  const o = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  if (cur) { try { return new Intl.NumberFormat(undefined, { ...o, style: 'currency', currency: cur, currencyDisplay: 'code' }).format(n); } catch (e) { /* fall through */ } }
  return new Intl.NumberFormat(undefined, o).format(n);
}
const plain = n => new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(n);
const OUT = $('#cOut'), FORM = $('#cIn');
function stats(rows, cls) { const g = el('div', 'tstats' + (cls ? ' ' + cls : '')); rows.forEach(([v, l]) => { const d = el('div', 'tst'); d.append(el('b', '', v), el('span', '', l)); g.append(d); }); return g; }
function fail(msg) { OUT.replaceChildren(el('p', 'tnote bad', msg)); }
function table(head, rows) {
  const w = el('div', 'ctable'); const t = el('table'); const th = el('thead'), tr = el('tr'); head.forEach(h => tr.append(el('th', '', h))); th.append(tr); t.append(th);
  const tb = el('tbody'); rows.forEach(r => { const x = el('tr'); r.forEach((c, i) => x.append(el(i ? 'td' : 'th', '', c))); if (r.length) tb.append(x); }); t.append(tb); w.append(t); return w;
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
  labels();
}
function labels() {
  if (MODE !== 'pct') return;
  const t = { of: ['Percent (X)', 'Number (Y)'], is: ['Number (X)', 'Total (Y)'], chg: ['From (X)', 'To (Y)'], up: ['Percent to add (X)', 'Number (Y)'], down: ['Percent to take off (X)', 'Number (Y)'] }[val('kind')];
  ctl.a.previousSibling.textContent = t[0]; ctl.b.previousSibling.textContent = t[1];
}

function run() {
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
    } else if (MODE === 'comp') {
      const cur = val('cur'), s = get('start', 'Starting amount'), m = get('monthly', 'Added every month'), rt = get('rate', 'Interest rate'), y = get('years', 'Years');
      const r = CM.compound(s, rt, y, parseInt(val('freq'), 10), m); if (r.error) return fail(r.error);
      const head = ['Year', 'Total put in', 'Interest earned', 'Balance'], rows = r.rows.map(x => [plain(x.year), fmt(x.deposits, cur), fmt(x.interest, cur), fmt(x.balance, cur)]);
      const raw = r.rows.map(x => [x.year, x.deposits.toFixed(2), x.interest.toFixed(2), x.balance.toFixed(2)]);
      OUT.replaceChildren(stats([[fmt(r.balance, cur), 'Final balance'], [fmt(r.deposits, cur), 'Total put in'], [fmt(r.interest, cur), 'Interest earned']]),
        csvBtn(head, raw, 'Dilia-compound-interest.csv'), table(head, rows));
    }
  } catch (e) { fail(e.message); }
}
build(); run();
}
