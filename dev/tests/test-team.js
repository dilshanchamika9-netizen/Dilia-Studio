// Team leave planner engine tests (Node)
const T = require('../../assets/teamleave.js'); let ok = 0, bad = 0;
const t = (c, m) => { if (c) ok++; else { bad++; console.log('FAIL', m); } };
const W = [6, 0], H = [['01-01', 'New Year', 0], ['12-25', 'Xmas', 0]];
// 2026: 1 Jan is Thursday. Mon 5 Jan - Fri 9 Jan work week.
let r = T.analyse({ year: 2026, weekend: W, hols: H, minStaff: 2, people: [{ name: 'A', leave: [['2026-01-05', '2026-01-09']] }, { name: 'B', leave: [['2026-01-07', '2026-01-08']] }, { name: 'C', leave: [] }] });
t(r.per[0].workDays === 5 && r.per[0].calDays === 5, 'A 5 work days');
t(r.per[1].workDays === 2, 'B 2 work days');
t(r.cnt[4] === 1 && r.cnt[6] === 2, 'counts on Mon and Wed (day idx 4 and 6)');
t(r.shortDays === 2 && r.conflicts.length === 1, 'shortage Wed+Thu only: ' + r.shortDays + ' ' + r.conflicts.length);
t(r.conflicts[0].a === '2026-01-07' && r.conflicts[0].b === '2026-01-08' && r.conflicts[0].minIn === 1, 'conflict range and minimum in');
t(r.conflicts[0].names.join() === 'A,B', 'conflict names');
// weekend and holiday leave is free
r = T.analyse({ year: 2026, weekend: W, hols: H, minStaff: 1, people: [{ name: 'A', leave: [['2026-01-01', '2026-01-04']] }] });
t(r.per[0].workDays === 1 && r.per[0].calDays === 4, 'Thu 1 Jan is a holiday, Fri 2 Jan counts, weekend free: ' + r.per[0].workDays);
t(r.shortDays === 1 && r.conflicts.length === 1, 'single person off on Friday leaves 0 of min 1');
// overlap and touching ranges merge, no double count
r = T.analyse({ year: 2026, weekend: W, hols: [], minStaff: 0, people: [{ name: 'A', leave: [['2026-03-02', '2026-03-04'], ['2026-03-04', '2026-03-06'], ['2026-03-09', '2026-03-09']] }] });
t(r.per[0].ranges.length === 1 && r.per[0].ranges[0][1] === '2026-03-09' || r.per[0].ranges.length === 2, 'ranges merged');
t(r.per[0].workDays === 6, 'Mon2-Fri6 + Mon9 = 6 work days: ' + r.per[0].workDays);
t(r.shortDays === 0, 'minStaff 0 never short');
// bad ranges reported, not counted
r = T.analyse({ year: 2026, weekend: W, hols: [], minStaff: 1, people: [{ name: 'A', leave: [['2026-02-30', '2026-03-01'], ['2026-04-10', '2026-04-01'], ['x', 'y'], ['2026-04-06', '2026-04-06']] }] });
t(r.per[0].bad.length === 3 && r.per[0].workDays === 1, 'bad ranges ignored: ' + r.per[0].bad.length);
// clipping across years
r = T.analyse({ year: 2026, weekend: W, hols: [], minStaff: 0, people: [{ name: 'A', leave: [['2025-12-29', '2026-01-02']] }] });
t(r.per[0].workDays === 2 && r.per[0].calDays === 2, 'only the 2026 part counts (Thu 1, Fri 2 Jan): ' + r.per[0].workDays);
// Friday-Saturday weekend country
r = T.analyse({ year: 2026, weekend: [5, 6], hols: [], minStaff: 0, people: [{ name: 'A', leave: [['2026-01-04', '2026-01-08']] }] });
t(r.per[0].workDays === 5, 'Sun-Thu are work days with Fri/Sat weekend: ' + r.per[0].workDays);
// weekend run does not split a shortage run
r = T.analyse({ year: 2026, weekend: W, hols: [], minStaff: 1, people: [{ name: 'A', leave: [['2026-01-08', '2026-01-13']] }] });
t(r.conflicts.length === 1 && r.conflicts[0].a === '2026-01-08' && r.conflicts[0].b === '2026-01-13' && r.conflicts[0].days === 4, 'Thu-Fri + Mon-Tue is one run of 4: ' + JSON.stringify(r.conflicts));
// minStaff capped to team size, empty team safe
r = T.analyse({ year: 2026, weekend: W, hols: [], minStaff: 9, people: [] }); t(r.shortDays === 0 && r.per.length === 0, 'empty team');
r = T.analyse({ year: 2024, weekend: W, hols: [], minStaff: 1, people: [{ name: 'A', leave: [['2024-02-29', '2024-02-29']] }] }); t(r.Y.n === 366 && r.per[0].workDays === 1, 'leap day');
// CSV: quoting
r = T.analyse({ year: 2026, weekend: W, hols: [], minStaff: 0, people: [{ name: 'Smith, "J"', leave: [['2026-05-04', '2026-05-05']] }, { name: 'None', leave: [] }] });
const c = T.csv(r, 2026).split('\r\n'); t(c[1] === '"Smith, ""J""","2026-05-04","2026-05-05","2","2"' && c[2] === '"None","","","0","0"', 'csv quoting: ' + c[1]);
console.log(bad ? 'FAILED ' + bad : 'team engine ok ' + ok); process.exit(bad ? 1 : 0);
