// Trip booklet: turns a trip saved in the Trip planner into a printable file (cover, days, bookings, contacts, packing list, notes). Reads this browser's saved trips only.
{
  const K = LifeKit, CM = CalcMath, $ = id => document.getElementById(id), esc = K.esc, KEY = 'dilia-trips', BK = 'dilia-booklet-v1', PK = 'dilia-packing-v1';
  const KINDS = { flight: 'Flight', stay: 'Stay', food: 'Food', sight: 'Sight', move: 'Transport', other: 'Other' };
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  let trips = [], lists = [], S = { sz: 'a4', cov: true, book: true, con: {}, pack: '', notes: true, last: '' };
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  trips = (Array.isArray(rd(KEY, [])) ? rd(KEY, []) : []).filter(x => x && typeof x.name === 'string' && iso.test(x.start) && iso.test(x.end) && Array.isArray(x.items) && CM.ymd(x.start) && CM.ymd(x.end));
  const pk = rd(PK, {}); lists = (Array.isArray(pk.lists) ? pk.lists : []).filter(l => l && typeof l.name === 'string' && Array.isArray(l.items));
  const sv = rd(BK, {}); if (sv && typeof sv === 'object') { S.sz = sv.sz === 'letter' ? 'letter' : 'a4'; S.cov = sv.cov !== false; S.book = sv.book !== false; S.notes = sv.notes !== false; S.pack = String(sv.pack || ''); S.last = String(sv.last || ''); S.con = sv.con && typeof sv.con === 'object' ? sv.con : {}; }
  const save = () => { try { localStorage.setItem(BK, JSON.stringify(S)); } catch (e) { $('bkmsg').textContent = 'Could not save settings (storage is blocked).'; } };
  const nice = s => { const d = CM.ymd(s); return WD[CM.weekday(d)] + ' ' + d.d + ' ' + MON[d.m - 1] + ' ' + d.y; };
  const short = s => { const d = CM.ymd(s); return d.d + ' ' + MON[d.m - 1].slice(0, 3); };
  const days = t => { const a = CM.ymd(t.start), b = CM.ymd(t.end), o = []; if (!a || !b || CM.cmp(a, b) > 0) return o; for (let n = CM.num_(a); n <= CM.num_(b) && o.length < 120; n++) o.push(CM.iso(CM.fromNum(n))); return o; };
  const sortIt = (a, b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99'));
  function render() {
    const t = trips.find(x => x.id === $('bkt').value), out = $('bkout'); out.className = 'bk ' + S.sz;
    $('bkprint').disabled = !t; if (!t) { out.innerHTML = ''; return; }
    const ds = days(t), items = t.items.filter(x => x && iso.test(x.date)).slice().sort(sortIt), L = lists.find(l => String(l.id) === S.pack);
    let h = '';
    if (S.cov) h += `<section class="bkp bkcover"><div class="bkk">TRIP BOOKLET</div><h2>${esc(t.name)}</h2><p class="bkr">${esc(t.from || '')}${t.from && t.to ? ' → ' : ''}${esc(t.to || '')}</p><p>${esc(nice(t.start))}<br>to ${esc(nice(t.end))}</p><p class="bkn">${ds.length} ${ds.length === 1 ? 'day' : 'days'} · ${items.length} ${items.length === 1 ? 'stop' : 'stops'}</p></section>`;
    h += '<section class="bkp"><h3>Day by day</h3>' + ds.map((d, k) => { const its = items.filter(x => x.date === d); return `<div class="bkd"><div class="bkh"><b>Day ${k + 1}</b> ${esc(nice(d))}</div>${its.length ? '<ul>' + its.map(x => `<li><span class="bkt">${esc(x.time || '')}</span><span><b>${esc(x.title)}</b> <i>${esc(KINDS[x.kind] || '')}</i>${x.place ? '<br>' + esc(x.place) : ''}${x.ref ? '<br>Ref: <u>' + esc(x.ref) + '</u>' : ''}${x.note ? '<br><em>' + esc(x.note) + '</em>' : ''}</span></li>`).join('') + '</ul>' : '<p class="bkn">Nothing planned.</p>'}</div>`; }).join('') + '</section>';
    const refs = items.filter(x => x.ref);
    if (S.book) h += `<section class="bkp"><h3>Bookings and references</h3>${refs.length ? '<table><thead><tr><th>Date</th><th>What</th><th>Where</th><th>Reference</th></tr></thead><tbody>' + refs.map(x => `<tr><td>${esc(short(x.date))}${x.time ? ' ' + esc(x.time) : ''}</td><td>${esc(x.title)}</td><td>${esc(x.place || '')}</td><td><b>${esc(x.ref)}</b></td></tr>`).join('') + '</tbody></table>' : '<p class="bkn">No booking references in this trip. Add them to the stops in the Trip planner.</p>'}</section>`;
    const con = (S.con[t.id] || '').trim(); if (con) h += `<section class="bkp"><h3>Contacts and important numbers</h3><p class="bkpre">${esc(con)}</p></section>`;
    if (L) h += `<section class="bkp"><h3>Packing list · ${esc(L.name)}</h3><ul class="bkpk">${L.items.map(i => `<li><i class="bkbox"></i>${esc(i.t || '')}</li>`).join('')}</ul></section>`;
    if (S.notes) h += '<section class="bkp bknotes"><h3>Notes</h3><div class="bklines"></div></section>';
    out.innerHTML = h;
  }
  const sel = $('bkt');
  sel.innerHTML = trips.map(t => `<option value="${esc(t.id)}">${esc(t.name)} · ${esc(short(t.start))}</option>`).join('');
  $('bkempty').hidden = trips.length > 0; $('bkctl').hidden = !trips.length;
  if (trips.some(t => t.id === S.last)) sel.value = S.last;
  $('bkpk').innerHTML = '<option value="">None</option>' + lists.map(l => `<option value="${esc(String(l.id))}">${esc(l.name)}</option>`).join(''); if (lists.some(l => String(l.id) === S.pack)) $('bkpk').value = S.pack; else S.pack = '';
  const cur = () => trips.find(x => x.id === sel.value);
  const fill = () => { const t = cur(); $('bkcon').value = t ? S.con[t.id] || '' : ''; };
  sel.addEventListener('change', () => { S.last = sel.value; save(); fill(); render(); });
  $('bksz').value = S.sz; $('bkcov').checked = S.cov; $('bkbook').checked = S.book; $('bknotes').checked = S.notes;
  $('bksz').addEventListener('change', e => { S.sz = e.target.value; save(); render(); });
  [['bkcov', 'cov'], ['bkbook', 'book'], ['bknotes', 'notes']].forEach(([id, k]) => $(id).addEventListener('change', e => { S[k] = e.target.checked; save(); render(); }));
  $('bkpk').addEventListener('change', e => { S.pack = e.target.value; save(); render(); });
  $('bkcon').addEventListener('input', e => { const t = cur(); if (!t) return; S.con[t.id] = e.target.value.slice(0, 2000); save(); render(); });
  $('bkprint').addEventListener('click', () => window.print());
  fill(); render();
}
