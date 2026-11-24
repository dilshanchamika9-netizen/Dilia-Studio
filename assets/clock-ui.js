// World clock and meeting planner (data-lc="clock" or "meet"). Times from the browser's time zone rules (CalcMath.parts).
{
  const CM = CalcMath, K = LifeKit, $ = id => document.getElementById(id), esc = K.esc, C = DiliaCities, MODE = document.querySelector('[data-lc]').dataset.lc;
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], pad = n => String(n).padStart(2, '0');
  const byName = n => C.find(c => c[0].toLowerCase() === String(n).toLowerCase());
  let myZone = 'Asia/Dubai'; try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (z && z !== 'UTC') myZone = z; } catch (e) {}
  const home = C.find(c => c[1] === myZone);
  let cities = ['Dubai', 'Colombo', 'London', 'New York', 'Tokyo'];
  try { const s = JSON.parse(localStorage.getItem('dilia-clock-cities') || 'null'); if (Array.isArray(s) && s.length) cities = s.filter(byName); } catch (e) {}
  const fromHash = new URLSearchParams(location.hash.slice(1)).get('c'); if (fromHash) { const l = fromHash.split('|').filter(byName); if (l.length) cities = l; }
  if (home && !cities.includes(home[0]) && !fromHash) cities.unshift(home[0]);
  const save = () => { try { localStorage.setItem('dilia-clock-cities', JSON.stringify(cities)); } catch (e) {} history.replaceState(null, '', '#c=' + cities.map(encodeURIComponent).join('|')); };
  const hol = {}; async function holOf(cc) { if (!(cc in hol)) { hol[cc] = null; try { hol[cc] = await K.country(cc); } catch (e) {} } return hol[cc]; }
  const holName = (cc, p) => { const d = hol[cc]; if (!d || !d[p.y]) return ''; const r = d[p.y].find(x => x[0] === pad(p.m) + '-' + pad(p.d)); return r ? r[1] : ''; };
  const offTxt = m => { if (!m) return 'Same time as you'; const s = m > 0 ? '+' : '−', a = Math.abs(m); return s + Math.floor(a / 60) + 'h' + (a % 60 ? ' ' + (a % 60) + 'm' : '') + (m > 0 ? ' ahead of you' : ' behind you'); };
  const sky = h => h < 5 || h >= 21 ? 'n' : h < 7 ? 'dw' : h < 17 ? 'd' : h < 19 ? 'ds' : 'e';
  // ---------- world clock ----------
  function clockRender() {
    const now = Date.now(), me = CM.parts(myZone, now), myOff = CM.offsetMin(myZone, now);
    $('wctime').textContent = pad(me.h) + ':' + pad(me.mi) + ':' + pad(me.s); $('wcdate').textContent = WD[new Date(Date.UTC(me.y, me.m - 1, me.d)).getUTCDay()] + ' ' + me.d + ' ' + MON[me.m - 1] + ' ' + me.y + ' · ' + myZone.replace(/_/g, ' ');
    const cards = $('wccards'); if (cards.children.length !== cities.length) build();
    cities.forEach((n, i) => { const c = byName(n), p = CM.parts(c[1], now), off = CM.offsetMin(c[1], now) - myOff, el = cards.children[i], wd = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(), wk = K.wkOf(c[2]).includes(wd), hn = holName(c[2], p), work = !wk && !hn && p.h >= 9 && p.h < 18;
      el.className = 'wcc ' + sky(p.h); el.querySelector('.t').textContent = pad(p.h) + ':' + pad(p.mi); el.querySelector('.s').textContent = pad(p.s);
      el.querySelector('.dd').textContent = WD[wd] + ' ' + p.d + ' ' + MON[p.m - 1] + ' · ' + offTxt(off);
      el.querySelector('.sun').style.setProperty('--a', ((p.h * 60 + p.mi) / 1440 * 360 - 90) + 'deg');
      el.querySelector('.bd').innerHTML = (hn ? `<i class="h">Holiday: ${esc(hn)}</i>` : '') + (wk ? '<i class="w">Weekend there</i>' : '') + (work ? '<i class="g">Work hours</i>' : !wk && !hn ? '<i>Outside work hours</i>' : ''); });
  }
  function build() {
    $('wccards').innerHTML = cities.map((n, i) => { const c = byName(n); return `<div class="wcc"><div class="sun"><i></i></div><div class="nm"><b>${esc(c[0])}</b><span>${esc(K.cname(c[2]))}</span></div><div class="tm"><span class="t">--:--</span><span class="s">--</span></div><div class="dd"></div><div class="bd"></div><button type="button" class="x" data-rm="${i}" aria-label="Remove ${esc(c[0])}">×</button></div>`; }).join('');
    cities.forEach(n => { const c = byName(n); if (!(c[2] in hol)) holOf(c[2]); });
    $('wcmeet').href = '../meeting-planner/#c=' + cities.map(encodeURIComponent).join('|');
  }
  // ---------- meeting planner ----------
  let sel = null;
  function meetRender() {
    const st = CM.ymd($('mpd').value) || (() => { const p = CM.parts(myZone, Date.now()); return { y: p.y, m: p.m, d: p.d }; })(), nd = +$('mpn').value, h0 = +$('mph0').value, h1 = +$('mph1').value, base = byName(cities[0]);
    if (h1 <= h0) { $('mpgrid').innerHTML = '<p class="lcbad">The work day must end after it starts.</p>'; return; }
    const cs = cities.map(byName), rows = [], best = [];
    for (let k = 0; k < nd; k++) {
      const d = CM.addDate(st, 0, 0, k).date, cells = [];
      for (let h = 0; h < 24; h++) {
        const r = CM.wallToUtc(base[1], d.y, d.m, d.d, h, 0); if (r.error) { cells.push(null); continue; }
        const info = cs.map(c => { const p = CM.parts(c[1], r.ms), wd = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(), wk = K.wkOf(c[2]).includes(wd), hn = holName(c[2], p), inH = p.h + p.mi / 60 >= h0 && p.h + p.mi / 60 + 1 <= h1; return { c, p, wk, hn, ok: inH && !wk && !hn, why: hn ? 'holiday: ' + hn : wk ? 'weekend' : !inH ? 'outside work hours' : 'free' }; });
        const n = info.filter(x => x.ok).length; cells.push({ h, ms: r.ms, n, info }); if (n === cs.length) best.push({ d, h, ms: r.ms });
      }
      rows.push({ d, cells });
    }
    $('mpgrid').innerHTML = `<div class="mph"><span></span>${Array.from({ length: 24 }, (_, h) => `<em>${h}</em>`).join('')}</div>` + rows.map((r, ri) => `<div class="mpr"><b>${WD[CM.weekday(r.d)]} ${r.d.d} ${MON[r.d.m - 1]}</b>${r.cells.map((c, h) => c ? `<button type="button" class="mpc${c.n === cs.length ? ' all' : ''}" data-r="${ri}" data-h="${h}" style="--f:${(c.n / cs.length).toFixed(2)}" aria-label="${pad(h)}:00, ${c.n} of ${cs.length} free"></button>` : '<span class="mpc no"></span>').join('')}</div>`).join('');
    $('mpbest').innerHTML = best.length ? best.slice(0, 12).map(b => `<li><b>${WD[CM.weekday(b.d)]} ${b.d.d} ${MON[b.d.m - 1]}, ${pad(b.h)}:00</b> ${esc(base[0])} · ${cs.slice(1).map(c => { const p = CM.parts(c[1], b.ms); return esc(c[0]) + ' ' + pad(p.h) + ':' + pad(p.mi); }).join(' · ')}</li>`).join('') + (best.length > 12 ? `<li class="lnote">and ${best.length - 12} more hours</li>` : '') : '<li>No hour fits everyone in these days. Widen the work hours or add more days.</li>';
    $('mpsum').innerHTML = `<div><small>HOURS THAT FIT ALL</small><b class="g">${best.length}</b></div><div><small>CITIES</small><b>${cs.length}</b></div><div><small>DAYS</small><b class="c">${nd}</b></div>`;
    meetRender.rows = rows; meetRender.best = best;
    requestAnimationFrame(() => { const w = $('mpgrid').parentElement, c = $('mpgrid').querySelector('.mph em:nth-of-type(' + Math.max(1, h0 - 1) + ')'); if (c && w.scrollWidth > w.clientWidth) w.scrollLeft = c.offsetLeft - 100; });
    $('mpdet').innerHTML = '<p>Tap an hour to see each city.</p>';
  }
  function meetDetail(ri, h) { const c = meetRender.rows[ri].cells[h]; if (!c) return; $('mpdet').innerHTML = `<h3>${pad(h)}:00 in ${esc(cities[0])}</h3><p>${c.n} of ${c.info.length} cities free.</p><ul class="mpl">${c.info.map(x => `<li class="${x.ok ? 'ok' : ''}"><b>${esc(x.c[0])}</b> ${WD[new Date(Date.UTC(x.p.y, x.p.m - 1, x.p.d)).getUTCDay()]} ${pad(x.p.h)}:${pad(x.p.mi)} · ${esc(x.why)}</li>`).join('')}</ul>`; }
  // ---------- shared city picker ----------
  function chips() { $('cchips').innerHTML = cities.map((n, i) => `<span class="cchip">${esc(n)}${i === 0 && MODE === 'meet' ? ' <small>base</small>' : ''}<button type="button" data-rm="${i}" aria-label="Remove ${esc(n)}">×</button></span>`).join(''); }
  $('cadd').innerHTML = '<option value="">Add a city…</option>' + C.map(c => `<option value="${esc(c[0])}">${esc(c[0])} · ${esc(K.cname(c[2]))}</option>`).join('');
  async function refresh() { save(); if (MODE === 'meet') { chips(); await Promise.all(cities.map(n => holOf(byName(n)[2]))); meetRender(); } else { build(); clockRender(); } }
  $('cadd').addEventListener('change', e => { const v = e.target.value; e.target.value = ''; if (v && !cities.includes(v) && cities.length < 12) { cities.push(v); refresh(); } });
  document.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b && cities.length > 1) { cities.splice(+b.dataset.rm, 1); refresh(); } });
  if (MODE === 'clock') { refresh(); setInterval(clockRender, 1000); }
  else {
    const p = CM.parts(myZone, Date.now()); $('mpd').value = CM.iso({ y: p.y, m: p.m, d: p.d });
    $('mph0').innerHTML = $('mph1').innerHTML = Array.from({ length: 25 }, (_, h) => `<option value="${h}">${pad(h)}:00</option>`).join(''); $('mph0').value = 9; $('mph1').value = 18;
    ['mpd', 'mpn', 'mph0', 'mph1'].forEach(id => $(id).addEventListener('change', meetRender)); $('mpd').addEventListener('input', meetRender);
    $('mpgrid').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) meetDetail(+b.dataset.r, +b.dataset.h); });
    $('mpcopy').addEventListener('click', async () => { const t = (meetRender.best || []).slice(0, 12).map(b => WD[CM.weekday(b.d)] + ' ' + b.d.d + ' ' + MON[b.d.m - 1] + ' ' + pad(b.h) + ':00 ' + cities[0] + ' | ' + cities.slice(1).map(n => { const c = byName(n), q = CM.parts(c[1], b.ms); return n + ' ' + pad(q.h) + ':' + pad(q.mi); }).join(' | ')).join('\n'); try { await navigator.clipboard.writeText(t || 'No common hours'); $('mpcopymsg').textContent = 'Copied.'; } catch (x) { $('mpcopymsg').textContent = 'Copy failed.'; } });
    refresh();
  }
  window.DiliaClock = { cities: () => cities.slice(), set: l => { cities = l.filter(byName); refresh(); }, best: () => (meetRender.best || []).map(b => [CM.iso(b.d), b.h]) };
}
