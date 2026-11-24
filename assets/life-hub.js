// Life hub: live clock, year progress, next public holiday countdown for your country.
{
  const K = LifeKit, H = DiliaHolPlan, $ = id => document.getElementById(id);
  const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let stop = () => {}, cc = 'AE';
  const isoWeek = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); };
  function clock() {
    const d = new Date(), y = d.getFullYear(), n = H.leap(y) ? 366 : 365, doy = Math.round((Date.UTC(y, d.getMonth(), d.getDate()) - Date.UTC(y, 0, 1)) / 864e5) + 1;
    const secs = (d - new Date(y, 0, 1)) / 1000, pct = secs / (n * 86400) * 100;
    $('lhtime').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    $('lhdate').textContent = WD[d.getDay()] + ', ' + d.getDate() + ' ' + MONL[d.getMonth()] + ' ' + y;
    $('lhmeta').textContent = 'Week ' + isoWeek(d) + ' · day ' + doy + ' of ' + n + ' · ' + (n - doy) + ' days left';
    $('lhbar').style.width = pct.toFixed(3) + '%'; $('lhpct').textContent = pct.toFixed(4) + '% of ' + y + ' gone';
  }
  async function next() {
    stop(); const d = new Date(), y = d.getFullYear(), t = Math.round((Date.UTC(y, d.getMonth(), d.getDate()) - Date.UTC(y, 0, 1)) / 864e5);
    try {
      const data = await K.country(cc); let found = null, yy = y, Y = null;
      for (; yy <= Math.min(y + 1, 2035) && !found; yy++) { if (!data[yy]) continue; Y = H.buildYear(yy, K.wkOf(cc), data[yy]); for (let i = yy === y ? t : 0; i < Y.n; i++) if (Y.off[i] === 2) { found = { y: yy, i, Y }; break; } }
      if (!found) { $('lhhn').textContent = 'No upcoming holiday in the data'; $('lhhd').textContent = ''; $('lhcd').innerHTML = ''; return; }
      const dd = new Date(Date.UTC(found.y, 0, 1 + found.i)), m = dd.getUTCMonth(), day = dd.getUTCDate();
      const lw = H.freeBreaks(found.Y.off, 3).find(f => found.i >= f.a && found.i <= f.b);
      $('lhhn').textContent = found.Y.names[found.i];
      $('lhhd').textContent = WD[dd.getUTCDay()] + ', ' + day + ' ' + MONL[m] + ' ' + found.y + (lw ? ' · ' + lw.len + '-day long weekend' : '') + (found.Y.est[found.i] ? ' · moon date, may shift' : '');
      if (found.y === y && found.i === t) { $('lhcd').innerHTML = '<div><b>Today</b><small>enjoy</small></div>'; } else stop = K.countdown($('lhcd'), found.y, m, day);
      $('lhall').href = '../public-holidays/#c=' + cc + '&y=' + found.y;
    } catch (e) { $('lhhn').textContent = e.message; }
  }
  async function init() {
    clock(); setInterval(clock, 1000);
    try { const idx = await K.index(); K.fillCountries($('lhc'), idx.countries, false); let saved = ''; try { saved = localStorage.getItem('dilia-life-country') || ''; } catch (e) {} cc = idx.countries.includes(saved) ? saved : K.guess(idx.countries, 'AE'); $('lhc').value = cc; } catch (e) { $('lhhn').textContent = e.message; return; }
    next();
  }
  $('lhc').addEventListener('change', e => { cc = e.target.value; try { localStorage.setItem('dilia-life-country', cc); } catch (x) {} next(); });
  init();
}
