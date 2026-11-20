// Second-source check. Compares our generated holiday dates (python "holidays", MIT) with the npm "date-holidays" package.
// date-holidays data is CC BY-SA, so it is used here to compare only and is never shipped in the site.
// Run: (cd /tmp/dh && npm i date-holidays) && NODE_PATH=/tmp/dh/node_modules node dev/holiday-crosscheck.mjs
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire(process.env.NODE_PATH + '/x.js'); const Holidays = require('date-holidays');
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../assets/holidays');
const COUNTRIES = (process.env.CC || 'AE,SA,QA,KW,OM,BH,LK,IN,PK,BD,GB,US,CA,AU,DE,FR,SG,MY,EG,JO').split(',');
let worst = 0;
for (const cc of COUNTRIES) {
  const ours = JSON.parse(fs.readFileSync(path.join(dir, cc + '.json'), 'utf8')), hd = new Holidays(cc);
  let same = 0, onlyOurs = [], onlyTheirs = [];
  for (const y of [2025, 2026, 2027]) {
    if (!ours[y]) continue;
    const a = new Set(ours[y].map(r => y + '-' + r[0]));
    const b = new Set(hd.getHolidays(y).filter(h => h.type === 'public').map(h => h.date.slice(0, 10)));
    for (const d of a) b.has(d) ? same++ : onlyOurs.push(d);
    for (const d of b) a.has(d) || onlyTheirs.push(d);
  }
  const tot = same + onlyOurs.length + onlyTheirs.length, pct = tot ? Math.round(same / tot * 100) : 100; worst = Math.max(worst, 100 - pct);
  console.log(cc.padEnd(3), pct + '% same', '| only ours:', onlyOurs.slice(0, 6).join(' ') || '-', '| only theirs:', onlyTheirs.slice(0, 6).join(' ') || '-');
}
console.log('worst country disagreement:', worst + '%');
