// Country card: live local time, time difference, currency, calling code, weekend, official languages and the next public holiday.
{
  const K = LifeKit, CM = CalcMath, H = DiliaHolPlan, C = DiliaCities, $ = id => document.getElementById(id), esc = K.esc;
  const WDN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], pad = n => String(n).padStart(2, '0');
  const LN = Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'language' }) : null, CN = Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'currency' }) : null;
  const flag = cc => /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0))) : '';
  let D = null, idx = null, cc = 'LK', home = '', stop = () => {}, tick = 0;
  let myZone = 'Asia/Dubai'; try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (z && z !== 'UTC') myZone = z; } catch (e) {}
  const zoneOf = c => { const m = C.find(x => x[2] === c); return m ? m[1] : ''; };
  const sym = cur => { try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(1).find(p => p.type === 'currency').value; } catch (e) { return cur; } };
  const wkTxt = w => !w || !w.length ? '—' : w.length === 1 ? WDN[w[0]] + ' only' : w.map(d => WDN[d]).join(' and ');
  function field(k, v, sub, cls) { return `<div class="ccf${cls ? ' ' + cls : ''}"><small>${k}</small><b>${v}</b>${sub ? `<span>${sub}</span>` : ''}</div>`; }
  async function render() {
    stop(); clearInterval(tick);
    const r = D.countries[cc] || {}, h = home ? D.countries[home] || {} : null, z = zoneOf(cc);
    $('ccflag').textContent = flag(cc); $('ccname').textContent = K.cname(cc);
    const clock = () => { if (!z) { $('cctime').textContent = '—'; $('ccdiff').textContent = 'Local time: pick a country with a city in our list'; return; } const now = Date.now(), p = CM.parts(z, now), d = CM.offsetMin(z, now) - CM.offsetMin(myZone, now); $('cctime').textContent = pad(p.h) + ':' + pad(p.mi) + ':' + pad(p.s); $('ccdiff').textContent = WDN[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()] + ' ' + p.d + ' ' + MON[p.m - 1] + ' · ' + (d === 0 ? 'same time as you' : (d > 0 ? '+' : '−') + Math.floor(Math.abs(d) / 60) + 'h' + (Math.abs(d) % 60 ? ' ' + Math.abs(d) % 60 + 'm' : '') + (d > 0 ? ' ahead of you' : ' behind you')) + ' · ' + z.replace(/_/g, ' '); };
    clock(); tick = setInterval(clock, 1000);
    const cur = r.cur || [];
    let f = '';
    f += field('CURRENCY', cur.length ? cur.map(c => esc(sym(c) !== c ? sym(c) + ' ' + c : c)).join(' · ') : 'Not shown', cur.length ? esc(cur.map(c => (CN && CN.of(c)) || c).join(', ')) : 'The sources disagree (recent change). Check before you travel.', 'c');
    f += field('CALLING CODE', r.tel ? '+' + esc(r.tel) : '—', r.tel ? 'Dial +' + esc(r.tel) + ' before the number from abroad' : '', 'g');
    f += field('WEEKEND', esc(wkTxt(r.wk)), 'Usual weekend days', '');
    f += field('LANGUAGES', r.lang ? esc(r.lang.map(l => (LN && LN.of(l.replace('_', '-'))) || l).join(', ')) : '—', 'Official or main', '');
    $('ccfields').innerHTML = f;
    // compare with home
    if (h && home !== cc) {
      const zh = zoneOf(home), now = Date.now(), dd = z && zh ? (CM.offsetMin(z, now) - CM.offsetMin(zh, now)) / 60 : null;
      const row = (k, a, b, same) => `<tr${same ? ' class="same"' : ''}><th>${k}</th><td>${a}</td><td>${b}</td></tr>`;
      $('cccmp').innerHTML = `<table class="cct"><thead><tr><th></th><th>${flag(home)} ${esc(K.cname(home))}</th><th>${flag(cc)} ${esc(K.cname(cc))}</th></tr></thead><tbody>${row('Time', zh ? esc(zh.split('/').pop().replace(/_/g, ' ')) : '—', dd == null ? '—' : dd === 0 ? 'Same time' : (dd > 0 ? '+' : '−') + Math.abs(dd) + 'h', dd === 0)}${row('Currency', esc((h.cur || ['—']).join(', ')), esc((r.cur || ['—']).join(', ')), (h.cur || [])[0] === (r.cur || [])[0])}${row('Calling code', h.tel ? '+' + esc(h.tel) : '—', r.tel ? '+' + esc(r.tel) : '—')}${row('Weekend', esc(wkTxt(h.wk)), esc(wkTxt(r.wk)), String(h.wk) === String(r.wk))}</tbody></table>${String(h.wk) !== String(r.wk) ? '<p class="lnote">Different weekends: some of your work days are days off there, and the other way round.</p>' : ''}`;
    } else $('cccmp').innerHTML = '<p class="lnote">Pick your home country above to compare.</p>';
    // next holiday
    try {
      const data = await K.country(cc), n = new Date(), y = n.getFullYear(), t = Math.round((Date.UTC(y, n.getMonth(), n.getDate()) - Date.UTC(y, 0, 1)) / 864e5); let found = null;
      for (const yy of [y, y + 1]) { if (found || !data[yy]) continue; const Y = H.buildYear(yy, r.wk || [6, 0], data[yy]); for (let i = yy === y ? t : 0; i < Y.n; i++) if (Y.off[i] === 2) { found = { yy, i, Y }; break; } }
      const cnt = data[y] ? data[y].length : 0;
      if (found) { const d = new Date(Date.UTC(found.yy, 0, 1 + found.i)); $('cchn').textContent = found.Y.names[found.i]; $('cchd').textContent = WDN[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + found.yy + (found.Y.est[found.i] ? ' · moon date, may shift' : '') + ' · ' + cnt + ' public holiday days in ' + y; stop = K.countdown($('cchcd'), found.yy, d.getUTCMonth(), d.getUTCDate()); }
      else { $('cchn').textContent = 'No upcoming holiday in the data'; $('cchd').textContent = ''; $('cchcd').innerHTML = ''; }
      $('cclinks').innerHTML = `<a class="lbtn" href="../public-holidays/#c=${cc}&y=${y}">All holidays in ${esc(K.cname(cc))}</a><a class="lbtn" href="../holiday-planner/#c=${cc}&y=${y}&l=10&w=${(r.wk || [6, 0]).join('.')}&s=2${home ? '&h=' + home : ''}">Plan leave there</a>${z ? `<a class="lbtn" href="../world-clock/#c=${encodeURIComponent(C.find(x => x[2] === cc)[0])}">World clock</a>` : ''}`;
    } catch (e) { $('cchn').textContent = e.message; }
    $('ccc').value = cc; $('cch').value = home; history.replaceState(null, '', '#c=' + cc + (home ? '&h=' + home : ''));
  }
  async function init() {
    try { [D, idx] = await Promise.all([fetch(new URL('../assets/countrydata.json', document.baseURI)).then(r => { if (!r.ok) throw new Error('Country data could not be loaded.'); return r.json(); }), K.index()]); } catch (e) { $('ccname').textContent = e.message; return; }
    const list = Object.keys(D.countries).filter(c => K.cname(c) !== c); K.fillCountries($('ccc'), list, false); K.fillCountries($('cch'), list, true);
    const q = new URLSearchParams(location.hash.slice(1)); if (D.countries[q.get('c')]) cc = q.get('c'); if (D.countries[q.get('h')]) home = q.get('h');
    if (!q.get('h')) { try { home = localStorage.getItem('dilia-home-country') || ''; } catch (e) {} if (!D.countries[home]) home = K.guess(list, ''); }
    $('ccsrc').textContent = 'Data: ' + D.sources.cldr + ' (currency, weekend, languages), ' + D.sources.phone + ' (calling codes), each cross-checked with a second open dataset; built ' + D.built + '. Holidays: Vacanza holidays library.';
    render();
  }
  $('ccc').addEventListener('change', e => { cc = e.target.value; render(); });
  $('cch').addEventListener('change', e => { home = e.target.value; try { localStorage.setItem('dilia-home-country', home); } catch (x) {} render(); });
  init();
  window.DiliaCountry = { state: () => ({ cc, home, rec: D && D.countries[cc] }) };
}
