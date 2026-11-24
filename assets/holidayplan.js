/* Dilia holiday planner engine. Pure functions over a year as an array of days: off[i] = 0 work day, 1 weekend, 2 public holiday.
   plan(off, L, p) picks which work days to take as leave, to make the best breaks; bestBreaks lists single breaks by days off per leave day. */
(function (root) {
  const pad = n => (n < 10 ? '0' : '') + n;
  const leap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = (y, m) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
  const iso = (y, i) => { const d = new Date(Date.UTC(y, 0, 1 + i)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  // weekend: array of weekday numbers (0 Sunday .. 6 Saturday). hols: [[mm-dd, name, est], ...]
  function buildYear(y, weekend, hols) {
    const n = leap(y) ? 366 : 365, off = new Array(n).fill(0), names = new Array(n).fill(''), est = new Array(n).fill(0), wd = [];
    for (let i = 0; i < n; i++) { const d = new Date(Date.UTC(y, 0, 1 + i)); wd[i] = d.getUTCDay(); if (weekend.includes(wd[i])) off[i] = 1; }
    for (const h of hols || []) { const [m, d] = h[0].split('-').map(Number); const i = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5); if (i < 0 || i >= n) continue; names[i] = names[i] ? names[i] + ' / ' + h[1] : h[1]; if (h[2]) est[i] = 1; off[i] = 2; }
    return { y, n, off, names, est, wd };
  }
  const runsOf = (off, a, b) => { const r = []; let s = -1; for (let i = a; i <= b + 1; i++) { const f = i <= b && off[i] !== 0; if (f && s < 0) s = i; if (!f && s >= 0) { r.push(i - s); s = -1; } } return r; };
  const cand = (off, L) => { // all windows [a,b] that start after a work day (or the year start), end before a work day (or year end), costing 1..L leave days
    const n = off.length, out = [], pre = [0]; for (let i = 0; i < n; i++) pre.push(pre[i] + (off[i] === 0 ? 1 : 0));
    for (let a = 0; a < n; a++) { if (a > 0 && off[a - 1] !== 0) continue; for (let b = a; b < n; b++) { const c = pre[b + 1] - pre[a]; if (c > L) break; if (c < 1) continue; if (b < n - 1 && off[b + 1] !== 0) continue; out.push({ a, b, c, len: b - a + 1 }); } }
    return out;
  }
  function plan(off, L, p) {
    const n = off.length, v = x => Math.pow(x, p || 1.5), W = cand(off, L), by = Array.from({ length: n }, () => []);
    for (const w of W) { w.g = v(w.len) - runsOf(off, w.a, w.b).reduce((s, r) => s + v(r), 0); if (w.g > 1e-9) by[w.a].push(w); }
    const f = Array.from({ length: n + 3 }, () => new Float64Array(L + 1)), ch = Array.from({ length: n + 3 }, () => new Array(L + 1).fill(null));
    for (let i = n - 1; i >= 0; i--) for (let l = 0; l <= L; l++) {
      let best = f[i + 1][l], pick = null;
      for (const w of by[i]) if (w.c <= l) { const val = w.g + f[Math.min(n + 2, w.b + 2)][l - w.c]; if (val > best + 1e-9) { best = val; pick = w; } }
      f[i][l] = best; ch[i][l] = pick;
    }
    const wins = []; let i = 0, l = L;
    while (i < n) { const w = ch[i][l]; if (w) { wins.push(w); l -= w.c; i = w.b + 2; } else i++; }
    return wins.map(w => { const leave = []; for (let k = w.a; k <= w.b; k++) if (off[k] === 0) leave.push(k); return { a: w.a, b: w.b, len: w.len, cost: w.c, leave }; });
  }
  function bestBreaks(off, L, minLen, count) {
    const W = cand(off, L).filter(w => w.len >= (minLen || 4)).sort((x, y) => y.len / y.c - x.len / x.c || y.len - x.len || x.c - y.c), out = [], used = new Array(off.length + 2).fill(false);
    for (const w of W) { let clash = false; for (let k = w.a - 1; k <= w.b + 1; k++) if (used[k + 1]) { clash = true; break; } if (clash) continue; for (let k = w.a; k <= w.b; k++) used[k + 1] = true; const leave = []; for (let k = w.a; k <= w.b; k++) if (off[k] === 0) leave.push(k); out.push({ a: w.a, b: w.b, len: w.len, cost: w.c, leave }); if (out.length >= (count || 8)) break; }
    return out;
  }
  // free breaks: runs of 3 or more days off in a row that need no leave and contain at least one public holiday
  function freeBreaks(off, minLen) { const out = []; let s = -1; for (let i = 0; i <= off.length; i++) { const f = i < off.length && off[i] !== 0; if (f && s < 0) s = i; if (!f && s >= 0) { let h = false; for (let k = s; k < i; k++) if (off[k] === 2) h = true; if (i - s >= (minLen || 3) && h) out.push({ a: s, b: i - 1, len: i - s }); s = -1; } } return out; }
  function stats(off, wins) { let base = 0; off.forEach(x => { if (x) base++; }); const leave = wins.reduce((s, w) => s + w.cost, 0); let longest = 0; const all = off.slice(); wins.forEach(w => w.leave.forEach(k => { all[k] = 3; })); for (const r of runsOf(all, 0, all.length - 1)) longest = Math.max(longest, r); return { base, leave, total: base + leave, longest }; }
  // calendar file with one all-day event per break (end date is exclusive in iCalendar)
  function ics(y, wins, title) {
    const f = i => iso(y, i).replace(/-/g, ''), nx = i => iso(y, i + 1).replace(/-/g, ''); const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dilia//Holiday planner//EN', 'CALSCALE:GREGORIAN'];
    wins.forEach((w, k) => { L.push('BEGIN:VEVENT', 'UID:dilia-break-' + y + '-' + k + '@dilia', 'DTSTAMP:' + f(0) + 'T000000Z', 'DTSTART;VALUE=DATE:' + f(w.a), 'DTEND;VALUE=DATE:' + nx(w.b), 'SUMMARY:' + (title || 'Break') + ': ' + w.len + ' days off' + (w.cost ? ' (' + w.cost + ' leave)' : ''), w.cost ? 'DESCRIPTION:Take leave on ' + w.leave.map(i => iso(y, i)).join(', ') : 'DESCRIPTION:No leave needed', 'TRANSP:TRANSPARENT', 'END:VEVENT'); });
    L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n';
  }
  root.DiliaHolPlan = { buildYear, plan, bestBreaks, freeBreaks, stats, ics, iso, leap, dim, runsOf };
})(typeof window !== 'undefined' ? window : globalThis);
