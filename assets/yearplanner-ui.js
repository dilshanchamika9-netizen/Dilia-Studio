// Printable year planner: 12 months, weekends and public holidays of a country, your own marked dates. Settings in this browser only.
{
  const K = LifeKit, H = DiliaHolPlan, $ = id => document.getElementById(id), esc = K.esc, KEY = 'dilia-yearplan-v1';
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], DAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const FS = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  let S = { c: 'AE', y: new Date().getFullYear(), ws: 1, wn: false, sz: 'a4', or: 'land', t: '', marks: [] }, seq = 0;
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') { S = Object.assign(S, v); S.marks = (Array.isArray(v.marks) ? v.marks : []).filter(m => m && /^\d{4}-\d{2}-\d{2}$/.test(m.d) && typeof m.l === 'string').slice(0, 100).map(m => ({ d: m.d, l: m.l.slice(0, 40) })); S.ws = [0, 1, 6].includes(+S.ws) ? +S.ws : 1; S.sz = S.sz === 'letter' ? 'letter' : 'a4'; S.or = S.or === 'port' ? 'port' : 'land'; S.t = String(S.t || '').slice(0, 60); } } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { $('ypmsg').textContent = 'Could not save in this browser (storage is blocked).'; } };
  const isoWeek = (y, m, d) => { const t = new Date(Date.UTC(y, m, d)), n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y0 = Date.UTC(t.getUTCFullYear(), 0, 1); return Math.ceil(((t - y0) / 864e5 + 1) / 7); };
  const valid = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) return false; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]; };
  function month(Y, m, mk) {
    const first = new Date(Date.UTC(S.y, m, 1)).getUTCDay(), dim = H.dim(S.y, m), lead = (first - S.ws + 7) % 7, doy0 = Math.round((Date.UTC(S.y, m, 1) - Date.UTC(S.y, 0, 1)) / 864e5);
    let h = `<div class="ypm"><h3>${MON[m]}</h3><table><thead><tr>${S.wn ? '<th class="wn">Wk</th>' : ''}${[0, 1, 2, 3, 4, 5, 6].map(k => `<th>${DAY[(S.ws + k) % 7]}</th>`).join('')}</tr></thead><tbody>`;
    let d = 1 - lead;
    while (d <= dim) {
      h += '<tr>'; if (S.wn) h += `<td class="wn">${isoWeek(S.y, m, Math.max(1, Math.min(dim, d + 3)))}</td>`;
      for (let k = 0; k < 7; k++, d++) {
        if (d < 1 || d > dim) { h += '<td></td>'; continue; }
        const i = doy0 + d - 1, cl = [Y.off[i] === 2 ? 'h' : Y.off[i] === 1 ? 'w' : '', mk[i] ? 'm' : ''].filter(Boolean).join(' ');
        h += `<td class="${cl}">${d}</td>`;
      }
      h += '</tr>';
    }
    return h + '</tbody></table></div>';
  }
  async function render() {
    const my = ++seq; let hols = []; $('ypmsg').textContent = '';
    try { hols = (await K.country(S.c))[S.y] || []; } catch (e) { $('ypmsg').textContent = 'Holiday data could not be loaded. Showing weekends only.'; }
    if (my !== seq) return;
    const Y = H.buildYear(S.y, K.wkOf(S.c), hols), mk = {}; S.marks.forEach(m => { if (+m.d.slice(0, 4) === S.y) mk[Math.round((Date.UTC(S.y, +m.d.slice(5, 7) - 1, +m.d.slice(8)) - Date.UTC(S.y, 0, 1)) / 864e5)] = 1; });
    const out = $('ypout'); out.className = 'yp ' + S.or + ' ' + S.sz;
    let h = `<h2 class="ypt">${esc(S.t || S.y + ' planner')}</h2><div class="ypg">`; for (let m = 0; m < 12; m++) h += month(Y, m, mk); h += '</div>';
    const hl = []; for (let i = 0; i < Y.n; i++) if (Y.off[i] === 2) hl.push([i, Y.names[i] + (Y.est[i] ? ' *' : '')]);
    const ml = S.marks.filter(m => +m.d.slice(0, 4) === S.y).sort((a, b) => a.d.localeCompare(b.d));
    h += `<div class="ypl"><div><h3>Public holidays · ${esc(K.cname(S.c))}</h3><ul>${hl.map(([i, n]) => `<li><b>${FS.format(new Date(Date.UTC(S.y, 0, 1 + i)))}</b> ${esc(n)}</li>`).join('') || '<li>None listed</li>'}</ul>${hl.some(x => x[1].endsWith('*')) ? '<p class="lnote">* may shift by a day (follows the moon)</p>' : ''}</div>` +
      `<div><h3>My dates</h3><ul>${ml.map(m => `<li><b>${FS.format(new Date(T(m.d)))}</b> ${esc(m.l)}</li>`).join('') || '<li class="tn">Add dates above</li>'}</ul></div></div><p class="ypk"><i class="w"></i>weekend <i class="h"></i>public holiday <i class="m"></i>my date</p>`;
    out.innerHTML = h; paintMarks();
  }
  const T = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8));
  function paintMarks() {
    const ul = $('ypmarks'); ul.innerHTML = S.marks.length ? '' : '<li class="lnote">No dates added.</li>';
    S.marks.forEach((m, k) => { const li = document.createElement('li'); li.innerHTML = `<span>${esc(m.d)} · ${esc(m.l || 'Marked')}</span><button type="button" class="tlx" data-k="${k}" aria-label="Remove ${esc(m.d)}">×</button>`; ul.append(li); });
  }
  const ch = () => { save(); render(); };
  $('ypc').addEventListener('change', e => { S.c = e.target.value; ch(); }); $('ypy').addEventListener('change', e => { S.y = +e.target.value; ch(); });
  $('ypws').addEventListener('change', e => { S.ws = +e.target.value; ch(); }); $('ypwn').addEventListener('change', e => { S.wn = e.target.checked; ch(); });
  $('ypsz').addEventListener('change', e => { S.sz = e.target.value; ch(); }); $('ypor').addEventListener('change', e => { S.or = e.target.value; ch(); });
  $('ypt').addEventListener('input', e => { S.t = e.target.value.slice(0, 60); ch(); });
  $('ypadd').addEventListener('click', () => { const d = $('ypd').value, l = $('ypl').value.trim().slice(0, 40); if (!valid(d)) { $('ypmsg').textContent = 'Choose a date first.'; return; } if (S.marks.length >= 100) { $('ypmsg').textContent = 'Up to 100 dates.'; return; } S.marks.push({ d, l }); $('ypl').value = ''; $('ypd').value = ''; ch(); });
  $('ypmarks').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; S.marks.splice(+b.dataset.k, 1); ch(); });
  $('ypprint').addEventListener('click', () => window.print());
  K.index().then(ix => {
    K.fillCountries($('ypc'), ix.countries); if (!ix.countries.includes(S.c)) S.c = K.guess(ix.countries, 'AE'); $('ypc').value = S.c;
    const ys = []; for (let y = ix.years[0]; y <= ix.years[1]; y++) ys.push(y); S.y = Math.min(ix.years[1], Math.max(ix.years[0], S.y)); $('ypy').innerHTML = ys.map(y => `<option>${y}</option>`).join(''); $('ypy').value = S.y;
    $('ypws').value = S.ws; $('ypwn').checked = S.wn; $('ypsz').value = S.sz; $('ypor').value = S.or; $('ypt').value = S.t; render();
  }).catch(() => { $('ypmsg').textContent = 'Holiday data could not be loaded.'; });
}
