// Holiday planner page ("future" look): countdown hero, time river, boarding-pass breaks, glowing year calendar.
{
  const H = DiliaHolPlan, $ = id => document.getElementById(id), SRC = new URL('../assets/holidays/', document.baseURI);
  const WK = { SA: [5, 6], KW: [5, 6], BH: [5, 6], QA: [5, 6], OM: [5, 6], EG: [5, 6], JO: [5, 6], IQ: [5, 6], IL: [5, 6], DZ: [5, 6], BD: [5, 6], YE: [5, 6], LY: [5, 6], SY: [5, 6], SD: [5, 6], MV: [5, 6], BN: [5, 0], IR: [5], AF: [4, 5] };
  const wkOf = c => (WK[c] || [6, 0]).slice();
  const DN = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
  const cname = c => { try { return (DN && DN.of(c)) || c; } catch (e) { return c; } };
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FD = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }), FS = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const now0 = new Date(), thisYear = now0.getFullYear();
  let cfg = { c: 'AE', y: Math.min(2035, Math.max(2024, thisYear + (now0.getMonth() >= 10 ? 1 : 0))), l: 10, w: [6, 0], s: 2, h: '' };
  let cache = {}, idx = null, Y = null, YH = null, wins = [], free = [], seq = 0, cdT = 0, PX = 7;
  const day = i => FD.format(new Date(Date.UTC(cfg.y, 0, 1 + i))), sday = i => FS.format(new Date(Date.UTC(cfg.y, 0, 1 + i)));
  const todayIdx = () => { const n = new Date(); if (n.getFullYear() !== cfg.y) return -1; return Math.round((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(cfg.y, 0, 1)) / 864e5); };
  const getC = async cc => { if (!cache[cc]) { const r = await fetch(new URL(cc + '.json', SRC)); if (!r.ok) throw new Error('Holiday data could not be loaded.'); cache[cc] = await r.json(); } return cache[cc]; };
  const kind = (i, lv) => (lv.has(i) ? 'l' : Y.off[i] === 2 ? 'h' : Y.off[i] === 1 ? 'w' : '');
  const holsIn = (a, b) => { const n = []; for (let i = a; i <= b; i++) if (Y.off[i] === 2 && !n.includes(Y.names[i])) n.push(Y.names[i] + (Y.est[i] ? ' (may shift)' : '')); return n; };
  const homeIn = (a, b) => { const n = []; if (YH) for (let i = a; i <= b; i++) if (YH.off[i] === 2 && !n.includes(YH.names[i])) n.push(YH.names[i]); return n; };

  async function compute() {
    const my = ++seq, c = cfg.c, h = cfg.h, y = cfg.y;
    const data = await getC(c), hd = h ? await getC(h) : null;
    if (my !== seq) return;   // a newer change arrived while loading
    Y = H.buildYear(y, cfg.w, data[y] || []); YH = hd ? H.buildYear(y, [], hd[y] || []) : null;
    const miss = []; if (!data[y]) miss.push(cname(c)); if (hd && !hd[y]) miss.push(cname(h));
    const span = cc => { const ks = Object.keys(cache[cc]).map(Number); return Math.min(...ks) + ' to ' + Math.max(...ks); };
    $('hpwarn').hidden = !miss.length; $('hpwarn').textContent = miss.length ? 'No public holiday data for ' + miss.join(' and ') + ' in ' + y + ' (available: ' + [c, h].filter(x => x && !cache[x][y]).map(x => cname(x) + ' ' + span(x)).join(', ') + '). Only weekends are shown for it.' : '';
    wins = cfg.l > 0 ? H.plan(Y.off, cfg.l, [0, 2, 1.5, 1.15][cfg.s]) : [];
    free = H.freeBreaks(Y.off, 3).filter(f => !wins.some(w => f.a >= w.a && f.b <= w.b));
    render();
  }
  function detail(i) {
    const lv = new Set(wins.flatMap(w => w.leave)), k = kind(i, lv), w = wins.find(q => i >= q.a && i <= q.b) || free.find(q => i >= q.a && i <= q.b);
    let t = `<h3>${day(i)}</h3>`;
    if (k === 'h') t += `<span class="lpill" style="background:#ff2d95">Public holiday</span>${esc(Y.names[i])}${Y.est[i] ? ' <small>(moon date, may shift)</small>' : ''}`;
    else if (k === 'l') t += '<span class="lpill" style="background:#2fe08a;color:#03140b">Take leave</span>';
    else if (k === 'w') t += '<span class="lpill" style="background:var(--lw)">Weekend</span>';
    else t += '<span class="lpill" style="background:#ffffff22">Work day</span>';
    if (YH && YH.off[i] === 2) t += `<span class="lpill" style="background:#ffc93c;color:#1a1200">Home: ${esc(YH.names[i])}</span>`;
    if (w) t += `<p>Part of a <b>${w.len}-day break</b>, ${day(w.a)} to ${day(w.b)}${w.cost ? `, for ${w.cost} leave ${w.cost === 1 ? 'day' : 'days'}` : ', with no leave'}.</p>`;
    return t;
  }
  function showDet(i) { $('hpdet').innerHTML = detail(i); }
  function hero() {
    clearInterval(cdT);
    const lv = new Set(wins.flatMap(w => w.leave)), t = todayIdx();
    let from = cfg.y > thisYear ? 0 : cfg.y < thisYear ? Y.n : t + 1;
    let nx = -1; for (let i = Math.max(0, from); i < Y.n; i++) if (Y.off[i] === 2 || lv.has(i)) { nx = i; break; }
    if (nx < 0) { $('hxk').textContent = cfg.y < thisYear ? cfg.y + ' IN REVIEW' : 'NEXT DAY OFF'; $('hxn').textContent = cfg.y < thisYear ? 'This year is over' : 'No more holidays or planned leave this year'; $('hxd').textContent = ''; $('hxcd').innerHTML = ''; return; }
    const w = wins.find(q => nx >= q.a && nx <= q.b) || free.find(q => nx >= q.a && nx <= q.b);
    $('hxk').textContent = 'NEXT DAY OFF';
    $('hxn').textContent = Y.off[nx] === 2 ? Y.names[nx] : 'Your break starts';
    $('hxd').textContent = day(nx) + ' ' + cfg.y + (w ? ' · ' + w.len + '-day break' : '') + (Y.est[nx] ? ' · moon date, may shift' : '');
    // count to local midnight of the first day of the break (or of the day itself)
    const start = w ? w.a : nx, target = new Date(cfg.y, 0, 1 + start).getTime();
    const tick = () => { const s = Math.max(0, (target - Date.now()) / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = Math.floor(s % 60);
      $('hxcd').innerHTML = [[d, d === 1 ? 'day' : 'days'], [h, 'hours'], [m, 'min'], [sec, 'sec']].map(([v, l]) => `<div><b>${String(v).padStart(2, '0')}</b><small>${l}</small></div>`).join(''); };
    tick(); cdT = setInterval(tick, 1000);
  }
  function river() {
    const lv = new Set(wins.flatMap(w => w.leave)), y = cfg.y, ms = []; let s0 = 0;
    for (let m = 0; m < 12; m++) { ms.push(s0); s0 += H.dim(y, m); }
    const col = { l: '#2fe08a', h: '#ff2d95', w: 'var(--lw)', '': 'var(--lk)' }, ht = { l: 80, h: 92, w: 34, '': 14 };
    let h = '';
    ms.forEach((s, m) => { h += `<div class="ms" style="left:${20 + s * PX}px"></div><div class="ml" style="left:${24 + s * PX}px">${MON[m]}</div>`; });
    for (let i = 0; i < Y.n; i++) { const k = kind(i, lv); h += `<div class="bar" style="left:${20 + i * PX}px;height:${ht[k]}px;background:${col[k]}${k === 'h' || k === 'l' ? ';box-shadow:0 0 9px ' + col[k] : ''}"></div>`; if (YH && YH.off[i] === 2) h += `<div class="bar" style="left:${20 + i * PX}px;bottom:${38 + ht[k] + 4}px;height:6px;background:#ffc93c"></div>`; }
    wins.forEach((w, k) => { const mid = 20 + ((w.a + w.b) / 2) * PX; h += `<div class="beam" style="left:${mid}px;height:112px"></div><button type="button" class="cap" data-a="${w.a}" style="left:${20 + w.a * PX}px;width:${Math.max(92, w.len * PX)}px;animation-delay:${k * 0.35}s">${w.len} days · ${w.cost} leave</button>`; });
    free.forEach(f => { h += `<button type="button" class="cap f" data-a="${f.a}" style="left:${20 + f.a * PX}px;width:${Math.max(64, f.len * PX)}px">${f.len} days free</button>`; });
    const t = todayIdx(); if (t >= 0) h += `<div class="now" style="left:${20 + t * PX}px"></div>`;
    const rv = $('hprv'); rv.style.width = (Y.n * PX + 60) + 'px'; rv.innerHTML = h;
    const focus = t >= 0 ? t : wins.length ? wins[0].a : 0;
    requestAnimationFrame(() => { $('hpriver').scrollLeft = Math.max(0, 20 + focus * PX - 60); });
  }
  function tickets() {
    $('hpplan').innerHTML = wins.length ? wins.map((w, k) => {
      const hs = holsIn(w.a, w.b), hm = homeIn(w.a, w.b);
      return `<button type="button" class="ltk" data-a="${w.a}" style="font:inherit;color:inherit;text-align:left;cursor:pointer;padding:0"><div class="l"><div class="no">BREAK ${String(k + 1).padStart(2, '0')}</div><div class="rt"><span>${sday(w.a)}</span><i></i><span>${sday(w.b)}</span></div>`
        + `<div class="m"><em>Take leave:</em> ${w.leave.map(sday).join(', ')}${hs.length ? `<br><s>Holidays:</s> ${esc(hs.join(', '))}` : ''}${hm.length ? `<br><u>Home:</u> ${esc(hm.join(', '))}` : ''}</div></div>`
        + `<div class="r"><div><b>${w.len}</b><small>DAYS OFF<br>${w.cost} leave</small></div></div></button>`;
    }).join('') : '<p class="lnote">Move the leave slider above 0 to print your boarding passes.</p>';
    const bb = cfg.l > 0 ? H.bestBreaks(Y.off, cfg.l, 4, 8) : [];
    $('hpbest').innerHTML = bb.length ? bb.map(w => `<button type="button" data-a="${w.a}">${sday(w.a)} → ${sday(w.b)} · <b>${w.len} days</b> for ${w.cost} leave · ${(w.len / w.cost).toFixed(1)}×</button>`).join('') : '<p class="lnote">Nothing to rank yet.</p>';
  }
  function calendar() {
    const lv = new Set(wins.flatMap(w => w.leave)), br = new Set(), t = todayIdx(), y = cfg.y; wins.forEach(w => { for (let i = w.a; i <= w.b; i++) br.add(i); });
    let h = '', i0 = 0;
    for (let m = 0; m < 12; m++) {
      const n = H.dim(y, m), first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; let c = '<em>M</em><em>T</em><em>W</em><em>T</em><em>F</em><em>S</em><em>S</em>' + '<span style="visibility:hidden"></span>'.repeat(first);
      for (let d = 0; d < n; d++) { const i = i0 + d, k = kind(i, lv), cl = [k, br.has(i) ? 'b' : '', YH && YH.off[i] === 2 ? 'o' : '', i === t ? 't' : ''].filter(Boolean).join(' '); c += `<span data-i="${i}"${cl ? ` class="${cl}"` : ''}>${d + 1}</span>`; }
      h += `<div class="lmo"><h4>${MON[m]}</h4><div class="lmg">${c}</div></div>`; i0 += n;
    }
    $('hpcal').innerHTML = h;
  }
  function render() {
    const st = H.stats(Y.off, wins), hol = Y.off.filter(x => x === 2).length;
    $('hpsum').innerHTML = `<div><small>DAYS OFF</small><b>${st.total}</b></div><div><small>LEAVE USED</small><b class="g">${st.leave}</b></div><div><small>LONGEST BREAK</small><b class="c">${st.longest}</b></div><div><small>HOLIDAYS</small><b class="h">${hol}</b></div>`;
    $('hptitle').textContent = cname(cfg.c) + ' · ' + cfg.y;
    hero(); river(); tickets(); calendar();
    document.querySelectorAll('[data-wd]').forEach(b => b.setAttribute('aria-pressed', cfg.w.includes(+b.dataset.wd) ? 'true' : 'false'));
    document.querySelectorAll('[data-hs]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.hs === cfg.s ? 'true' : 'false'));
    $('hpc').value = cfg.c; $('hpy').value = cfg.y; $('hph').value = cfg.h; $('hpl').value = cfg.l; $('hplv').textContent = cfg.l;
    $('hpics').disabled = !wins.length; $('hpnote').hidden = !Y.est.some(Boolean);
    $('hpdet').innerHTML = '<p>Tap a capsule above, a ticket or a day below.</p>';
  }
  const hash = () => '#c=' + cfg.c + '&y=' + cfg.y + '&l=' + cfg.l + '&w=' + cfg.w.join('.') + '&s=' + cfg.s + (cfg.h ? '&h=' + cfg.h : '');
  function readHash() {
    const q = new URLSearchParams(location.hash.slice(1)); if (!q.has('c')) return false;
    const c = q.get('c'); if (idx.countries.includes(c)) { cfg.c = c; cfg.w = wkOf(c); }
    const y = +q.get('y'); if (y >= 2024 && y <= 2035) cfg.y = y;
    const l = +q.get('l'); if (q.has('l') && l >= 0 && l <= 40) cfg.l = Math.round(l);
    if (q.has('w')) cfg.w = [...new Set((q.get('w') || '').split('.').filter(x => x !== '').map(Number).filter(x => x >= 0 && x <= 6))];
    const s = +q.get('s'); if (s >= 1 && s <= 3) cfg.s = s;
    const h = q.get('h'); cfg.h = h && idx.countries.includes(h) ? h : '';
    return true;
  }
  async function change(p) { Object.assign(cfg, p); try { await compute(); } catch (e) { $('hxn').textContent = e.message; } history.replaceState(null, '', hash()); }
  function fill(sel, none) { sel.innerHTML = (none ? '<option value="">None</option>' : '') + idx.countries.map(c => [c, cname(c)]).sort((a, b) => a[1].localeCompare(b[1])).map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join(''); }
  async function init() {
    try { const r = await fetch(new URL('index.json', SRC)); if (!r.ok) throw new Error(); idx = await r.json(); } catch (e) { $('hxn').textContent = 'Holiday data could not be loaded.'; return; }
    fill($('hpc'), false); fill($('hph'), true);
    $('hpy').innerHTML = Array.from({ length: idx.years[1] - idx.years[0] + 1 }, (_, k) => `<option value="${idx.years[0] + k}">${idx.years[0] + k}</option>`).join('');
    if (!readHash()) { try { const rg = (new Intl.DateTimeFormat().resolvedOptions().locale.split('-')[1] || '').toUpperCase(); if (idx.countries.includes(rg)) { cfg.c = rg; cfg.w = wkOf(rg); } } catch (e) {} }
    await change({});
  }
  $('hpc').addEventListener('change', e => change({ c: e.target.value, w: wkOf(e.target.value) }));
  $('hpy').addEventListener('change', e => change({ y: +e.target.value }));
  $('hph').addEventListener('change', e => change({ h: e.target.value }));
  let lt = 0; $('hpl').addEventListener('input', e => { const v = +e.target.value; $('hplv').textContent = v; clearTimeout(lt); lt = setTimeout(() => change({ l: v }), 120); });
  document.querySelectorAll('[data-wd]').forEach(b => b.addEventListener('click', () => { const d = +b.dataset.wd; change({ w: cfg.w.includes(d) ? cfg.w.filter(x => x !== d) : cfg.w.concat(d) }); }));
  document.querySelectorAll('[data-wp]').forEach(b => b.addEventListener('click', () => change({ w: b.dataset.wp.split('.').map(Number) })));
  document.querySelectorAll('[data-hs]').forEach(b => b.addEventListener('click', () => change({ s: +b.dataset.hs })));
  const pick = e => { const t = e.target.closest('[data-a],[data-i]'); if (!t) return; const i = +(t.dataset.a ?? t.dataset.i); document.querySelectorAll('.cap.sel').forEach(x => x.classList.remove('sel')); if (t.classList.contains('cap')) t.classList.add('sel'); showDet(i); if (!t.classList.contains('cap')) $('hpdet').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  ['hprv', 'hpplan', 'hpbest', 'hpcal'].forEach(id => $(id).addEventListener('click', pick));
  $('hpics').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([H.ics(cfg.y, wins, 'Break')], { type: 'text/calendar' })); a.download = 'dilia-breaks-' + cfg.c + '-' + cfg.y + '.ics'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
  $('hpprint').addEventListener('click', () => window.print());
  $('hpcopy').addEventListener('click', async () => { const u = location.href.split('#')[0] + hash(); try { await navigator.clipboard.writeText(u); $('hpcopymsg').textContent = 'Link copied.'; } catch (e) { $('hpcopymsg').textContent = u; } });
  window.addEventListener('hashchange', () => { if (idx && readHash()) change({}); });
  init();
  window.DiliaHolPlanUI = { state: () => ({ cfg: JSON.parse(JSON.stringify(cfg)), wins, free, n: Y && Y.n }), set: change };
}
