/* Dilia team leave planner engine. Pure functions, no DOM.
   analyse(): for one year, count who is on leave each work day, find days when fewer than minStaff people are in, and the leave days each person uses.
   Leave on a weekend or public holiday is not a leave day and never causes a shortage. */
(function (root) {
  if (!root.DiliaHolPlan && typeof require !== 'undefined') require('./holidayplan.js');
  const HP = root.DiliaHolPlan;
  const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dayNo = s => { const m = ISO.exec(s || ''); if (!m) return NaN; const t = Date.UTC(+m[1], +m[2] - 1, +m[3]); const d = new Date(t); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? t / 864e5 : NaN; };
  const iso = n => { const d = new Date(n * 864e5); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); };
  // merge overlapping or touching ranges (day numbers), drop bad ones
  function norm(ranges) {
    const ok = [], bad = [];
    for (const r of ranges || []) { const a = dayNo(r[0]), b = dayNo(r[1]); if (isNaN(a) || isNaN(b) || b < a) bad.push(r); else ok.push([a, b]); }
    ok.sort((x, y) => x[0] - y[0]); const out = [];
    for (const r of ok) { const l = out[out.length - 1]; if (l && r[0] <= l[1] + 1) l[1] = Math.max(l[1], r[1]); else out.push([r[0], r[1]]); }
    return { ranges: out, bad };
  }
  function analyse(o) {
    const y = o.year, Y = HP.buildYear(y, o.weekend || [6, 0], o.hols || []), n = Y.n, y0 = Date.UTC(y, 0, 1) / 864e5, people = o.people || [], P = people.length;
    const minStaff = Math.max(0, Math.min(P, o.minStaff | 0)), cnt = new Array(n).fill(0), who = Array.from({ length: n }, () => []);
    const per = people.map((p, k) => {
      const nr = norm(p.leave); let work = 0, cal = 0;
      for (const [a, b] of nr.ranges) for (let d = Math.max(a, y0); d <= Math.min(b, y0 + n - 1); d++) { const i = d - y0; cal++; if (Y.off[i] === 0) { work++; cnt[i]++; who[i].push(k); } }
      return { name: p.name, ranges: nr.ranges.map(r => [iso(r[0]), iso(r[1])]), bad: nr.bad, workDays: work, calDays: cal };
    });
    const short = new Array(n).fill(false);
    if (P > 0 && minStaff > 0) for (let i = 0; i < n; i++) if (Y.off[i] === 0 && P - cnt[i] < minStaff) short[i] = true;
    // shortage runs (consecutive work days, weekends and holidays inside a run do not break it)
    const conflicts = []; let s = -1, last = -1;
    const close = () => { if (s < 0) return; let min = P, names = new Set(); for (let i = s; i <= last; i++) if (short[i]) { min = Math.min(min, P - cnt[i]); who[i].forEach(k => names.add(k)); } conflicts.push({ a: iso(y0 + s), b: iso(y0 + last), days: short.slice(s, last + 1).filter(Boolean).length, minIn: min, names: [...names].sort((a, b) => a - b).map(k => people[k].name) }); s = -1; };
    for (let i = 0; i < n; i++) { if (short[i]) { if (s < 0) s = i; last = i; } else if (s >= 0 && Y.off[i] === 0) close(); }
    close();
    return { Y, cnt, who, short, per, conflicts, minStaff, P, shortDays: short.filter(Boolean).length };
  }
  function csv(res, y) {
    const q = t => '"' + String(t).replace(/"/g, '""') + '"', rows = [['Person', 'From', 'To', 'Leave days (work days)', 'Calendar days']];
    res.per.forEach(p => { if (!p.ranges.length) rows.push([p.name, '', '', 0, 0]); p.ranges.forEach(r => { const a = dayNo(r[0]), b = dayNo(r[1]), y0 = Date.UTC(y, 0, 1) / 864e5; let w = 0, c = 0; for (let d = Math.max(a, y0); d <= Math.min(b, y0 + res.Y.n - 1); d++) { c++; if (res.Y.off[d - y0] === 0) w++; } rows.push([p.name, r[0], r[1], w, c]); }); });
    return rows.map(r => r.map(q).join(',')).join('\r\n') + '\r\n';
  }
  root.DiliaTeam = { analyse, csv, norm, dayNo, iso };
  if (typeof module !== 'undefined') module.exports = root.DiliaTeam;
})(typeof window !== 'undefined' ? window : globalThis);
