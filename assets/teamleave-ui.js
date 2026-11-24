// Team leave planner page. Saves in this browser only (dilia-team-v1).
{
  const K = LifeKit, T = DiliaTeam, $ = id => document.getElementById(id), esc = K.esc, KEY = 'dilia-team-v1';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const FS = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fd = s => FS.format(new Date(T.dayNo(s) * 864e5));
  const thisYear = new Date().getFullYear();
  let S = { c: 'AE', y: thisYear, min: 1, people: [], next: 1 }, data = null, idx = null, seq = 0, res = null;
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && Array.isArray(v.people)) { S = Object.assign(S, v); S.people = S.people.filter(p => p && typeof p.name === 'string').slice(0, 60).map(p => ({ id: +p.id || 0, name: p.name.slice(0, 40), leave: (Array.isArray(p.leave) ? p.leave : []).filter(r => Array.isArray(r) && r.length === 2).slice(0, 200).map(r => [String(r[0]), String(r[1])]) })); S.people.forEach((p, i) => { if (!p.id) p.id = i + 1; }); S.next = Math.max(S.next | 0, ...S.people.map(p => p.id + 1), 1); } } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { msg('Could not save in this browser (storage is blocked).'); } };
  const msg = t => { $('tlmsg').textContent = t || ''; };
  function setCountry(c, y) { return K.country(c).then(d => d[y] || []); }
  async function recompute() {
    const my = ++seq; let hols = [];
    try { hols = await setCountry(S.c, S.y); } catch (e) { msg('Holiday data could not be loaded. Showing weekends only.'); }
    if (my !== seq) return;
    res = T.analyse({ year: S.y, weekend: K.wkOf(S.c), hols, minStaff: S.min, people: S.people.map(p => ({ name: p.name || 'Unnamed', leave: p.leave })) });
    paint();
  }
  function paintPeople() {
    const box = $('tlpeople'), open = document.activeElement && document.activeElement.closest && document.activeElement.closest('.tlp') ? document.activeElement.closest('.tlp').dataset.id : null;
    box.innerHTML = S.people.length ? '' : '<p class="lnote">No one added yet. Add the first person above.</p>';
    S.people.forEach((p, k) => {
      const pr = res && res.per[k], d = document.createElement('div'); d.className = 'lglass tlp'; d.dataset.id = p.id;
      const rows = (pr ? pr.ranges : []).map(r => `<li><span>${esc(fd(r[0]))}${r[0] === r[1] ? '' : ' → ' + esc(fd(r[1]))}</span><button type="button" class="tlx" data-a="rr" data-f="${esc(r[0])}" data-t="${esc(r[1])}" aria-label="Remove leave ${esc(r[0])} to ${esc(r[1])}">×</button></li>`).join('');
      d.innerHTML = `<div class="tlh"><input class="tln" type="text" maxlength="40" value="${esc(p.name)}" aria-label="Name"><b class="tld">${pr ? pr.workDays : 0}<small> leave days</small></b><button type="button" class="tlx" data-a="rp" aria-label="Remove ${esc(p.name)}">Remove</button></div><ul class="tlr">${rows}</ul>` +
        (pr && pr.bad.length ? '<p class="tlbad">Some saved dates are not valid and are ignored.</p>' : '') +
        `<div class="tlad"><label class="f">From<input type="date" class="tlf" min="${S.y - 1}-01-01" max="${S.y + 1}-12-31"></label><label class="f">To<input type="date" class="tlt" min="${S.y - 1}-01-01" max="${S.y + 1}-12-31"></label><button type="button" data-a="ar">Add leave</button></div>`;
      box.append(d);
    });
    if (open) { const e = box.querySelector(`.tlp[data-id="${open}"] .tlf`); if (e) e.focus({ preventScroll: true }); }
  }
  function paintGrid() {
    const g = $('tlgrid'); g.textContent = ''; if (!res) return; const Y = res.Y; let i = 0;
    for (let m = 0; m < 12; m++) {
      const row = document.createElement('div'); row.className = 'tlrow'; const lab = document.createElement('span'); lab.className = 'tlm'; lab.textContent = MON[m]; row.append(lab);
      const dim = new Date(Date.UTC(S.y, m + 1, 0)).getUTCDate();
      for (let d = 1; d <= dim; d++, i++) {
        const c = document.createElement('i'), off = Y.off[i], names = res.who[i].map(k => res.per[k].name);
        c.className = off === 2 ? 'h' : off === 1 ? 'w' : res.short[i] ? 's' : 'n' + Math.min(4, res.cnt[i]);
        c.title = FS.format(new Date(Date.UTC(S.y, 0, 1 + i))) + (off === 2 ? ' · ' + Y.names[i] : off === 1 ? ' · weekend' : names.length ? ' · off: ' + names.join(', ') : ' · everyone in'); row.append(c);
      }
      g.append(row);
    }
    g.setAttribute('aria-label', 'Year grid for ' + S.y + '. ' + res.shortDays + ' work days below the minimum team size.');
  }
  function paint() {
    paintPeople(); paintGrid(); const P = res.P;
    $('tlmin').max = Math.max(1, P);
    $('tlsum').innerHTML = P ? `<div><b>${P}</b><small>${P === 1 ? 'person' : 'people'}</small></div><div><b>${res.per.reduce((a, p) => a + p.workDays, 0)}</b><small>leave days in ${S.y}</small></div><div><b class="${res.shortDays ? 'bad' : 'good'}">${res.shortDays}</b><small>work days below ${res.minStaff} in</small></div>` : '';
    const c = $('tlconf');
    if (!P) c.innerHTML = '<p class="lnote">Add people and their leave to see shortages.</p>';
    else if (!res.minStaff) c.innerHTML = '<p class="lnote">Set the minimum number of people who must be in to get shortage warnings.</p>';
    else if (!res.conflicts.length) c.innerHTML = `<p class="tlok">No shortages. At least ${res.minStaff} ${res.minStaff === 1 ? 'person is' : 'people are'} in on every work day.</p>`;
    else c.innerHTML = '<ul class="tlcl">' + res.conflicts.map(x => `<li><b>${esc(fd(x.a))}${x.a === x.b ? '' : ' → ' + esc(fd(x.b))}</b><span>${x.days} work ${x.days === 1 ? 'day' : 'days'} with only ${x.minIn} in (needs ${res.minStaff}). Off: ${esc(x.names.join(', '))}</span></li>`).join('') + '</ul>';
    ['tlcsv', 'tlprint', 'tlclear'].forEach(id => { $(id).disabled = !P; });
  }
  function addPerson() { const n = $('tlpn').value.trim().slice(0, 40); if (!n) { msg('Type a name first.'); $('tlpn').focus(); return; } if (S.people.length >= 60) { msg('Up to 60 people.'); return; } S.people.push({ id: S.next++, name: n, leave: [] }); $('tlpn').value = ''; msg(''); save(); recompute(); $('tlpn').focus(); }
  $('tladd').addEventListener('click', addPerson); $('tlpn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addPerson(); } });
  $('tlpeople').addEventListener('click', e => {
    const b = e.target.closest('button[data-a]'); if (!b) return; const card = b.closest('.tlp'), p = S.people.find(x => x.id === +card.dataset.id); if (!p) return;
    if (b.dataset.a === 'rp') { S.people = S.people.filter(x => x !== p); }
    else if (b.dataset.a === 'rr') { const f = b.dataset.f, t = b.dataset.t, a = T.dayNo(f), z = T.dayNo(t); const out = []; p.leave.forEach(r => { const ra = T.dayNo(r[0]), rb = T.dayNo(r[1]); if (isNaN(ra) || isNaN(rb) || rb < ra) return; if (rb < a || ra > z) { out.push(r); return; } if (ra < a) out.push([r[0], T.iso(a - 1)]); if (rb > z) out.push([T.iso(z + 1), r[1]]); }); p.leave = out; }
    else if (b.dataset.a === 'ar') {
      const f = card.querySelector('.tlf').value, t = card.querySelector('.tlt').value || f;
      if (!f) { msg('Choose the first day of leave.'); return; } if (T.dayNo(t) < T.dayNo(f)) { msg('The last day is before the first day.'); return; }
      if (p.leave.length >= 200) { msg('Too many leave periods for one person.'); return; } p.leave.push([f, t]); msg('');
    }
    save(); recompute();
  });
  $('tlpeople').addEventListener('change', e => { if (e.target.classList.contains('tln')) { const p = S.people.find(x => x.id === +e.target.closest('.tlp').dataset.id); if (p) { p.name = e.target.value.trim().slice(0, 40) || p.name; save(); recompute(); } } });
  $('tlc').addEventListener('change', e => { S.c = e.target.value; save(); recompute(); });
  $('tly').addEventListener('change', e => { S.y = +e.target.value; save(); recompute(); });
  $('tlmin').addEventListener('input', e => { S.min = Math.max(0, Math.min(60, Math.floor(+e.target.value) || 0)); save(); recompute(); });
  $('tlcsv').addEventListener('click', () => { K.download('team-leave-' + S.y + '.csv', T.csv(res, S.y), 'text/csv'); msg('CSV downloaded.'); });
  $('tlprint').addEventListener('click', () => window.print());
  let armed = 0; $('tlclear').addEventListener('click', e => { if (!armed) { armed = setTimeout(() => { armed = 0; e.target.textContent = 'Clear everything'; }, 4000); e.target.textContent = 'Click again to clear'; return; } clearTimeout(armed); armed = 0; e.target.textContent = 'Clear everything'; S.people = []; save(); msg('Cleared.'); recompute(); });
  K.index().then(ix => {
    idx = ix; K.fillCountries($('tlc'), ix.countries); if (!ix.countries.includes(S.c)) S.c = K.guess(ix.countries, 'AE'); $('tlc').value = S.c;
    const ys = []; for (let y = ix.years[0]; y <= ix.years[1]; y++) ys.push(y); if (!ys.includes(S.y)) S.y = Math.min(ix.years[1], Math.max(ix.years[0], S.y));
    $('tly').innerHTML = ys.map(y => `<option>${y}</option>`).join(''); $('tly').value = S.y; $('tlmin').value = S.min; recompute();
  }).catch(() => msg('Holiday data could not be loaded.'));
}
