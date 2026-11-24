// Public holidays page (Life "future" look): next-holiday countdown, year river, holiday cards by month, compare a second country, CSV and calendar export.
{
  const K = LifeKit, H = DiliaHolPlan, $ = id => document.getElementById(id), esc = K.esc;
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now0 = new Date(), thisYear = now0.getFullYear();
  let cfg = { c: 'AE', y: Math.min(2035, Math.max(2024, thisYear)), x: '' }, idx, Y, X, groups = [], seq = 0, stop = () => {};
  const PX = 7;
  const dt = i => new Date(Date.UTC(cfg.y, 0, 1 + i)), md = i => { const d = dt(i); return { m: d.getUTCMonth(), d: d.getUTCDate(), w: d.getUTCDay() }; };
  const todayIdx = () => { const n = new Date(); if (n.getFullYear() !== cfg.y) return n.getFullYear() > cfg.y ? 999 : -1; return Math.round((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(cfg.y, 0, 1)) / 864e5); };
  const short = i => { const a = md(i); return a.d + ' ' + MONL[a.m].slice(0, 3); };

  async function compute() {
    const my = ++seq, c = cfg.c, x = cfg.x, y = cfg.y, data = await K.country(c), xd = x ? await K.country(x) : null;
    if (my !== seq) return;
    $('phwarn').hidden = !!data[y]; $('phwarn').textContent = data[y] ? '' : 'No public holiday data for ' + K.cname(c) + ' in ' + y + '. The data covers ' + Object.keys(data)[0] + ' to ' + Object.keys(data).slice(-1)[0] + ' for this country.';
    Y = H.buildYear(y, K.wkOf(c), data[y] || []); X = xd ? H.buildYear(y, K.wkOf(x), xd[y] || []) : null;
    // group runs of consecutive holiday days into one card
    groups = []; for (let i = 0; i < Y.n; i++) if (Y.off[i] === 2) { const g = groups[groups.length - 1]; if (g && g.b === i - 1) { g.b = i; g.names.push(Y.names[i]); g.est = g.est || Y.est[i]; } else groups.push({ a: i, b: i, names: [Y.names[i]], est: !!Y.est[i] }); }
    const free = H.freeBreaks(Y.off, 3); groups.forEach(g => { const f = free.find(q => g.a >= q.a && g.a <= q.b); g.long = f ? f.len : 0; let wk = 0; for (let i = g.a; i <= g.b; i++) if (K.wkOf(c).includes(md(i).w)) wk++; g.wk = wk; g.both = X ? [...Array(g.b - g.a + 1).keys()].some(k => X.off[g.a + k] === 2) : false; });
    render(free);
  }
  function render(free) {
    const t = todayIdx(), days = Y.off.filter(v => v === 2).length, onWk = groups.reduce((s, g) => s + g.wk, 0), moon = Y.est.filter(Boolean).length;
    $('phtitle').textContent = K.cname(cfg.c) + ' · ' + cfg.y;
    $('phsum').innerHTML = `<div><small>HOLIDAY DAYS</small><b class="h">${days}</b></div><div><small>ON WORK DAYS</small><b class="g">${days - onWk}</b></div><div><small>LONG WEEKENDS</small><b class="c">${free.length}</b></div><div><small>MOON DATES</small><b>${moon}</b></div>`;
    // hero
    stop(); const next = groups.find(g => g.a > t || (g.a <= t && g.b >= t && t >= 0));
    if (t === 999 || !groups.length) { $('phk').textContent = cfg.y + ' IN REVIEW'; $('phn').textContent = groups.length ? days + ' public holiday days' : 'No holidays listed'; $('phd').textContent = groups.length ? groups.length + ' holidays, ' + free.length + ' long weekends' : ''; $('phcd').innerHTML = ''; }
    else if (next && next.a <= t) { $('phk').textContent = 'TODAY'; $('phn').textContent = next.names[0]; $('phd').textContent = 'Enjoy the day off'; $('phcd').innerHTML = ''; }
    else if (next) { const a = md(next.a); $('phk').textContent = 'NEXT PUBLIC HOLIDAY'; $('phn').textContent = next.names[0]; $('phd').textContent = WD[a.w] + ', ' + a.d + ' ' + MONL[a.m] + ' ' + cfg.y + (next.b > next.a ? ' · ' + (next.b - next.a + 1) + ' days' : '') + (next.long ? ' · ' + next.long + '-day long weekend' : '') + (next.est ? ' · moon date, may shift' : ''); stop = K.countdown($('phcd'), cfg.y, a.m, a.d); }
    else { $('phk').textContent = 'NEXT PUBLIC HOLIDAY'; $('phn').textContent = 'No more holidays this year'; $('phd').textContent = cfg.y < 2035 ? 'Switch to ' + (cfg.y + 1) + ' to see what is next.' : ''; $('phcd').innerHTML = ''; }
    // river
    const col = { 2: '#ff2d95', 1: 'var(--lw)', 0: 'var(--lk)' }, ht = { 2: 92, 1: 34, 0: 14 }; let r = '', s0 = 0;
    for (let m = 0; m < 12; m++) { r += `<div class="ms" style="left:${20 + s0 * PX}px"></div><div class="ml" style="left:${24 + s0 * PX}px">${MON[m]}</div>`; s0 += H.dim(cfg.y, m); }
    for (let i = 0; i < Y.n; i++) { const k = Y.off[i]; r += `<div class="bar" style="left:${20 + i * PX}px;height:${ht[k]}px;background:${col[k]}${k === 2 ? ';box-shadow:0 0 9px #ff2d95' : ''}"></div>`; if (X && X.off[i] === 2) r += `<div class="bar" style="left:${20 + i * PX}px;bottom:${38 + ht[k] + 4}px;height:6px;background:#ffc93c"></div>`; }
    free.forEach(f => { r += `<button type="button" class="cap f lwk" data-a="${f.a}" style="left:${20 + f.a * PX}px;width:${Math.max(70, f.len * PX)}px">${f.len}-day weekend</button>`; });
    groups.forEach((g, k) => { r += `<button type="button" class="cap hc" data-a="${g.a}" style="left:${20 + g.a * PX - 40}px;width:${Math.max(86, (g.b - g.a + 1) * PX + 80)}px;bottom:${150 + (k % 2) * 0}px;animation-delay:${k * 0.25}s">${esc(g.names[0].length > 16 ? g.names[0].slice(0, 15) + '…' : g.names[0])}</button>`; });
    if (t >= 0 && t < 999) r += `<div class="now" style="left:${20 + t * PX}px"></div>`;
    const rv = $('phrv'); rv.style.width = (Y.n * PX + 80) + 'px'; rv.innerHTML = r;
    requestAnimationFrame(() => { $('phriver').scrollLeft = Math.max(0, 20 + (t >= 0 && t < 999 ? t : next ? next.a : 0) * PX - 80); });
    // cards by month
    let h = '';
    for (let m = 0; m < 12; m++) {
      const gs = groups.filter(g => md(g.a).m === m); if (!gs.length) continue;
      h += `<div class="phm"><h3>${MONL[m]}</h3><div class="phgrid">` + gs.map(g => {
        const a = md(g.a), past = t === 999 || g.b < t, n = g.b - g.a + 1, uniq = [...new Set(g.names)], left = g.a - t;
        const st = past ? 'Passed' : g.a <= t ? 'Today' : t < 0 ? '' : left === 1 ? 'Tomorrow' : 'In ' + left + ' days';
        return `<button type="button" class="phc${past ? ' past' : ''}" data-a="${g.a}"><span class="pht"><b>${a.d}</b><small>${MON[a.m]}</small></span><span class="phi"><b>${esc(uniq.join(' · '))}</b><span>${WD[a.w]}${n > 1 ? ' to ' + WD[md(g.b).w] + ' ' + short(g.b) + ' · ' + n + ' days' : ''}</span><span class="phb">${st ? `<i class="s">${st}</i>` : ''}${g.long ? `<i class="lw">${g.long}-day weekend</i>` : ''}${g.wk === n ? '<i class="wk">On a weekend</i>' : ''}${g.est ? '<i class="mn">Moon date, may shift</i>' : ''}${g.both ? `<i class="bo">Also in ${esc(K.cname(cfg.x))}</i>` : ''}</span></span></button>`;
      }).join('') + '</div></div>';
    }
    $('phlist').innerHTML = h || '<p class="lnote">No country-wide public holidays are listed for this year.</p>';
    $('phplan').href = '../holiday-planner/#c=' + cfg.c + '&y=' + cfg.y + '&l=10&w=' + K.wkOf(cfg.c).join('.') + '&s=2' + (cfg.x ? '&h=' + cfg.x : '');
    $('phc').value = cfg.c; $('phy').value = cfg.y; $('phx').value = cfg.x;
    $('phcsv').disabled = $('phics').disabled = !groups.length;
    $('phnote').innerHTML = idx ? 'Data: <a href="https://github.com/vacanza/holidays" rel="noopener">Vacanza holidays library</a> ' + esc(idx.version) + ' (MIT licence), built ' + esc(idx.generated) + '. National holidays only.' : '';
    $('phdet').innerHTML = '<p>Tap a holiday to see the details.</p>';
  }
  function detail(i) {
    const g = groups.find(q => i >= q.a && i <= q.b); if (!g) return;
    const a = md(g.a), n = g.b - g.a + 1;
    let s = `<h3>${esc([...new Set(g.names)].join(' · '))}</h3><p>${WD[a.w]}, ${a.d} ${MONL[a.m]} ${cfg.y}${n > 1 ? ' to ' + WD[md(g.b).w] + ', ' + short(g.b) + ' (' + n + ' days)' : ''}.</p>`;
    if (g.long) s += `<p>Together with the weekend this makes a <b>${g.long}-day</b> break with no leave.</p>`;
    if (g.wk === n) s += '<p>It falls on a weekend this year. Some countries give another day off instead; check your employer.</p>';
    if (g.est) s += '<p>This date follows the moon. The official date is announced close to the day and can move by one or two days.</p>';
    if (X) s += g.both ? `<p>${esc(K.cname(cfg.x))} also has a holiday on this date.</p>` : `<p>No holiday in ${esc(K.cname(cfg.x))} on this date.</p>`;
    $('phdet').innerHTML = s;
  }
  const rows = () => { const out = []; for (let i = 0; i < Y.n; i++) if (Y.off[i] === 2) out.push([H.iso(cfg.y, i), Y.names[i], Y.est[i] ? 'expected' : 'official']); return out; };
  const csvq = v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  function ics() { const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dilia//Public holidays//EN', 'CALSCALE:GREGORIAN']; rows().forEach(([d, n, s], k) => { const a = d.replace(/-/g, ''), e = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8) + 1)), b = e.toISOString().slice(0, 10).replace(/-/g, ''); L.push('BEGIN:VEVENT', 'UID:dilia-hol-' + cfg.c + '-' + d + '-' + k + '@dilia', 'DTSTAMP:' + cfg.y + '0101T000000Z', 'DTSTART;VALUE=DATE:' + a, 'DTEND;VALUE=DATE:' + b, 'SUMMARY:' + n.replace(/[,;\\]/g, m => '\\' + m) + (s === 'expected' ? ' (expected)' : ''), 'TRANSP:TRANSPARENT', 'END:VEVENT'); }); L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n'; }
  const hash = () => '#c=' + cfg.c + '&y=' + cfg.y + (cfg.x ? '&x=' + cfg.x : '');
  function readHash() { const q = new URLSearchParams(location.hash.slice(1)); if (!q.has('c')) return false; const c = q.get('c'); if (idx.countries.includes(c)) cfg.c = c; const y = +q.get('y'); if (y >= idx.years[0] && y <= idx.years[1]) cfg.y = y; const x = q.get('x'); cfg.x = x && idx.countries.includes(x) ? x : ''; return true; }
  async function change(p) { Object.assign(cfg, p); try { await compute(); } catch (e) { $('phn').textContent = e.message; } history.replaceState(null, '', hash()); }
  async function init() {
    try { idx = await K.index(); } catch (e) { $('phn').textContent = e.message; return; }
    K.fillCountries($('phc'), idx.countries, false); K.fillCountries($('phx'), idx.countries, true);
    $('phy').innerHTML = Array.from({ length: idx.years[1] - idx.years[0] + 1 }, (_, k) => `<option value="${idx.years[0] + k}">${idx.years[0] + k}</option>`).join('');
    if (!readHash()) cfg.c = K.guess(idx.countries, 'AE');
    await change({});
  }
  $('phc').addEventListener('change', e => change({ c: e.target.value })); $('phy').addEventListener('change', e => change({ y: +e.target.value })); $('phx').addEventListener('change', e => change({ x: e.target.value }));
  ['phrv', 'phlist'].forEach(id => $(id).addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; detail(+b.dataset.a); if (id === 'phlist') $('phdet').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }));
  $('phcsv').addEventListener('click', () => K.download('Dilia-holidays-' + cfg.c + '-' + cfg.y + '.csv', 'Date,Holiday,Status\n' + rows().map(r => r.map(csvq).join(',')).join('\n') + '\n', 'text/csv'));
  $('phics').addEventListener('click', () => K.download('Dilia-holidays-' + cfg.c + '-' + cfg.y + '.ics', ics(), 'text/calendar'));
  $('phcopy').addEventListener('click', async () => { const u = location.href.split('#')[0] + hash(); try { await navigator.clipboard.writeText(u); $('phcopymsg').textContent = 'Link copied.'; } catch (e) { $('phcopymsg').textContent = u; } });
  window.addEventListener('hashchange', () => { if (idx && readHash()) change({}); });
  init();
  window.DiliaHolidays = { state: () => ({ cfg: Object.assign({}, cfg), groups, n: Y && Y.n }), ics, rows: () => rows() };
}
