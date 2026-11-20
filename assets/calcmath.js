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
  const api = { parse, percent, vat, loan, compound, r2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CalcMath = api;
})(typeof window !== 'undefined' ? window : globalThis);
