const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../assets/festivals.js', 'utf8'));
const F = globalThis.DiliaFest; let bad = 0, n = 0; const t = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const load = cc => JSON.parse(fs.readFileSync(__dirname + '/../../assets/holidays/' + cc + '.json'));
const L = { IN: load('IN'), SG: load('SG'), TH: load('TH'), CN: load('CN') }, AE = load('AE'), US = load('US'), IL = load('IL');
// known dates
t(F.easter(2025) === '2025-04-20' && F.easter(2026) === '2026-04-05' && F.easter(2027) === '2027-03-28', 'western Easter');
t(F.orthodoxEaster(2025) === '2025-04-20' && F.orthodoxEaster(2026) === '2026-04-12' && F.orthodoxEaster(2027) === '2027-05-02', 'orthodox Easter');
for (let y = 2024; y <= 2035; y++) {
  const f = F.forYear(y, L), get = id => f.filter(x => x.id === id).map(x => x.date);
  for (const id of ['ramadan', 'fitr', 'adha', 'diwali', 'holi', 'cny', 'midautumn', 'vesak', 'songkran', 'easter', 'christmas', 'rosh', 'kippur', 'hanukkah', 'passover', 'thanks']) t(get(id).length >= 1, y + ' has ' + id);
  // cross-checks with the national holiday data
  const sgcny = (L.SG[y] || []).find(r => r[1] === 'Chinese New Year'); if (sgcny) t(get('cny').includes(y + '-' + sgcny[0]), y + ' CNY matches Singapore data ' + get('cny') + ' vs ' + sgcny[0]);
  const us = (US[y] || []).find(r => /Thanksgiving/.test(r[1])); if (us) t(get('thanks')[0] === y + '-' + us[0], y + ' Thanksgiving matches US data');
  const ilr = (IL[y] || []).find(r => r[1] === 'Rosh Hashanah'); if (ilr) t(get('rosh').includes(y + '-' + ilr[0]), y + ' Rosh Hashanah matches Israel data ' + get('rosh') + ' vs ' + ilr[0]);
  const ilk = (IL[y] || []).find(r => r[1] === 'Yom Kippur'); if (ilk) t(get('kippur').includes(y + '-' + ilk[0]), y + ' Yom Kippur matches Israel data');
  const ilp = (IL[y] || []).find(r => r[1] === 'Pesach'); if (ilp) t(get('passover').includes(y + '-' + ilp[0]), y + ' Passover matches Israel data ' + get('passover') + ' vs ' + ilp[0]);
  // Eid: Umm al-Qura estimate within 2 days of the UAE holiday data
  const near = (a, b) => Math.abs((Date.parse(a) - Date.parse(b)) / 864e5) <= 2;
  const ae = (AE[y] || []).filter(r => r[1] === 'Eid al-Fitr').map(r => y + '-' + r[0]); ae.forEach(d => t(get('fitr').some(x => near(x, d)), y + ' Eid al-Fitr near UAE data ' + get('fitr') + ' vs ' + d));
  const aa = (AE[y] || []).filter(r => r[1] === 'Eid al-Adha').map(r => y + '-' + r[0]); aa.forEach(d => t(get('adha').some(x => near(x, d)), y + ' Eid al-Adha near UAE data ' + get('adha') + ' vs ' + d));
  t(f.every((x, i) => !i || f[i - 1].date <= x.date), y + ' sorted');
}
console.log(bad ? 'FAILS ' + bad : 'FESTIVALS OK', n); process.exit(bad ? 1 : 0);
