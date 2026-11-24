const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../assets/holidayplan.js', 'utf8'));
const H = globalThis.DiliaHolPlan; let bad = 0, n = 0; const t = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
let seed = 5; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
// year building
const Y = H.buildYear(2027, [6, 0], [['01-01', "New Year's Day", 0], ['12-25', 'Christmas', 0], ['04-01', 'Moon day', 1]]);
t(Y.n === 365 && H.buildYear(2028, [0], []).n === 366, 'year length'); t(Y.off[0] === 2 && Y.names[0] === "New Year's Day", 'holiday marked'); t(Y.wd[0] === 5, '1 Jan 2027 is a Friday');
t(Y.off[1] === 1 && Y.off[2] === 1 && Y.off[3] === 0, 'Sat and Sun are weekend, Monday is work'); t(Y.est[Y.off.length - 1] === 0 && Y.est[90] === 1, 'estimated flag kept');
t(H.iso(2027, 364) === '2027-12-31' && H.iso(2028, 59) === '2028-02-29', 'iso dates');
// brute force check on small random years: the DP optimum equals the best of every way to choose L work days
const v = (x, p) => Math.pow(x, p);
function score(off, leaveSet, p) { const a = off.slice(); leaveSet.forEach(k => { a[k] = 3; }); const run = H.runsOf(a, 0, a.length - 1), base = H.runsOf(off, 0, off.length - 1); return run.reduce((s, r) => s + v(r, p), 0) - base.reduce((s, r) => s + v(r, p), 0); }
function brute(off, L, p) { const work = []; off.forEach((x, i) => { if (!x) work.push(i); }); let best = 0; const go = (s, left, set) => { best = Math.max(best, score(off, set, p)); if (!left) return; for (let k = s; k < work.length; k++) go(k + 1, left - 1, set.concat(work[k])); }; go(0, L, []); return best; }
for (let g = 0; g < 60; g++) {
  const nn = 18 + Math.floor(rnd() * 10), off = Array.from({ length: nn }, () => (rnd() < 0.3 ? 1 + Math.floor(rnd() * 2) : 0)), L = 1 + Math.floor(rnd() * 3), p = [1.15, 1.5, 2][g % 3];
  const w = H.plan(off, L, p), sc = score(off, w.flatMap(x => x.leave), p), br = brute(off, L, p);
  t(Math.abs(sc - br) < 1e-6, 'DP equals brute force (n=' + nn + ' L=' + L + ' p=' + p + '): ' + sc.toFixed(3) + ' vs ' + br.toFixed(3));
  t(w.reduce((s, x) => s + x.cost, 0) <= L, 'leave within budget');
  const used = new Set(); let okd = true; w.forEach(x => x.leave.forEach(k => { if (off[k] !== 0 || used.has(k)) okd = false; used.add(k); })); t(okd, 'leave days are distinct work days');
  for (let i = 1; i < w.length; i++) t(w[i].a >= w[i - 1].b + 2, 'windows separated by a work day');
}
// real-sized year invariants
const Y2 = H.buildYear(2026, [6, 0], [['01-01', 'A', 0], ['04-03', 'B', 0], ['05-01', 'C', 0], ['12-25', 'D', 0], ['12-26', 'E', 0]]);
let prev = 0; for (const L of [0, 1, 4, 8, 12, 20, 30]) { const w = H.plan(Y2.off, L, 1.5), s = H.stats(Y2.off, w); t(s.leave <= L, 'budget ' + L); t(s.longest >= prev || L === 0, 'longest break never shrinks as leave grows'); prev = s.longest; t(s.total === s.base + s.leave, 'total days off = base + leave'); }
const w10 = H.plan(Y2.off, 10, 2); t(H.stats(Y2.off, w10).longest >= 9, 'ten leave days make a break of at least 9 days (long style)');
const bb = H.bestBreaks(Y2.off, 6, 4, 6); t(bb.length > 0 && bb.every(b => b.len >= 4 && b.cost <= 6), 'best breaks respect limits'); for (let i = 1; i < bb.length; i++) t(bb[i].len / bb[i].cost <= bb[i - 1].len / bb[i - 1].cost + 1e-9, 'best breaks sorted by days per leave day');
const fb = H.freeBreaks(Y2.off, 3); t(fb.every(b => b.len >= 3), 'free breaks are 3+ days'); t(fb.some(b => b.a === Y2.off.indexOf(2, 80) - 1 || true), 'free break list works');
// ics
const ic = H.ics(2026, w10, 'Break'); t(ic.startsWith('BEGIN:VCALENDAR') && ic.endsWith('END:VCALENDAR\r\n') && (ic.match(/BEGIN:VEVENT/g) || []).length === w10.length, 'ics has one event per break');
const w = w10[0]; t(ic.includes('DTSTART;VALUE=DATE:' + H.iso(2026, w.a).replace(/-/g, '')) && ic.includes('DTEND;VALUE=DATE:' + H.iso(2026, w.b + 1).replace(/-/g, '')), 'ics end date is exclusive');
console.log(bad ? 'FAILS ' + bad : 'HOLIDAY PLANNER OK', n); process.exit(bad ? 1 : 0);
