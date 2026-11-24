// Document expiry wallet. Stores only a label, an owner and an expiry date in this browser (dilia-docs-v1). Never store document numbers.
{
  const K = LifeKit, P = DiliaPack, $ = id => document.getElementById(id), esc = K.esc, KEY = 'dilia-docs-v1';
  const KINDS = ['Passport', 'National ID', 'Visa or permit', 'Driving licence', 'Travel insurance', 'Vaccination certificate', 'Other'];
  const LV = { expired: ['Expired', '#ff3b5c'], urgent: ['Within 30 days', '#ff7a45'], soon: ['Within 90 days', '#ffb347'], watch: ['Within 6 months', '#f2d544'], ok: ['OK', '#2fe08a'] };
  let S = { docs: [], next: 1 };
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && Array.isArray(v.docs)) { S.docs = v.docs.filter(d => d && typeof d.owner === 'string' && P.num(d.exp) === P.num(d.exp)).slice(0, 100).map(d => ({ id: String(d.id), kind: KINDS.includes(d.kind) ? d.kind : 'Other', owner: d.owner.slice(0, 40), exp: d.exp, note: String(d.note || '').slice(0, 60) })); S.next = Math.max(+v.next || 1, S.docs.length + 1); } } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { $('dcmsg').textContent = 'Could not save in this browser (storage is blocked).'; } };
  const today = () => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); };
  const FD = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const nice = s => FD.format(new Date(P.num(s) * 864e5));
  const words = d => d < 0 ? Math.abs(d) + (Math.abs(d) === 1 ? ' day ago' : ' days ago') : d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days';
  function paint() {
    const t = today(), rows = S.docs.map(d => Object.assign({}, d, { e: P.expiry(d.exp, t) })).filter(d => d.e).sort((a, b) => a.e.days - b.e.days), v = $('dclist');
    v.innerHTML = rows.length ? '' : '<p class="lnote">No documents yet. Add the first one above.</p>';
    rows.forEach(d => { const [lab, col] = LV[d.e.level]; const c = document.createElement('div'); c.className = 'lglass dcc'; c.style.setProperty('--a', col); c.innerHTML = `<div><b>${esc(d.kind)}</b> · ${esc(d.owner)}${d.note ? ' <small>' + esc(d.note) + '</small>' : ''}</div><div class="dce">Expires ${esc(nice(d.exp))} <small>(${esc(words(d.e.days))})</small></div><div class="dcl"><span class="dcb">${esc(lab)}</span><button type="button" class="tlx" data-del="${esc(d.id)}" aria-label="Remove ${esc(d.kind)} of ${esc(d.owner)}">Remove</button></div>`; v.append(c); });
    const n = rows.filter(d => ['expired', 'urgent', 'soon'].includes(d.e.level)).length; $('dcsum').textContent = rows.length ? (n ? `${n} ${n === 1 ? 'document needs' : 'documents need'} attention (expired or ending within 90 days).` : 'Nothing expires in the next 90 days.') : '';
    $('dcics').disabled = !rows.length; paintCheck();
  }
  function paintCheck() {
    const end = $('dcend').value, mo = Math.max(0, Math.min(12, Math.floor(+$('dcmo').value) || 0)), box = $('dccheck');
    if (!end || isNaN(P.num(end))) { box.innerHTML = '<p class="lnote">Enter the last day of your trip to check every document against it.</p>'; return; }
    const rows = S.docs.map(d => ({ d, ok: P.validFor(d.exp, end, mo) })).filter(r => r.ok !== null);
    box.innerHTML = rows.length ? '<ul class="tlcl">' + rows.map(r => `<li style="border-color:${r.ok ? '#2fe08a' : '#ff3b5c'}"><b>${esc(r.d.kind)} · ${esc(r.d.owner)}</b><span>${r.ok ? 'Valid until ' + esc(nice(r.d.exp)) + ', long enough' : 'Expires ' + esc(nice(r.d.exp)) + ', too early for this trip' + (mo ? ' plus ' + mo + ' months' : '')}</span></li>`).join('') + '</ul>' : '<p class="lnote">Add documents to check them.</p>';
  }
  $('dcadd').addEventListener('click', () => {
    const o = $('dcowner').value.trim().slice(0, 40), e = $('dcexp').value; if (!o) { $('dcmsg').textContent = 'Type the owner name first.'; return; } if (isNaN(P.num(e))) { $('dcmsg').textContent = 'Choose the expiry date.'; return; } if (S.docs.length >= 100) { $('dcmsg').textContent = 'Up to 100 documents.'; return; }
    S.docs.push({ id: 'd' + (S.next++), kind: $('dckind').value, owner: o, exp: e, note: $('dcnote').value.trim().slice(0, 60) }); $('dcexp').value = ''; $('dcnote').value = ''; $('dcmsg').textContent = ''; save(); paint();
  });
  $('dclist').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b) return; S.docs = S.docs.filter(d => d.id !== b.dataset.del); save(); paint(); });
  $('dcend').addEventListener('input', paintCheck); $('dcmo').addEventListener('input', paintCheck);
  $('dcics').addEventListener('click', () => {
    const f = s => s.replace(/-/g, ''), esc2 = t => String(t).replace(/[\;,]/g, m => '\\' + m).replace(/\n/g, ' '), L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dilia//Documents//EN', 'CALSCALE:GREGORIAN'];
    S.docs.forEach(d => { if (isNaN(P.num(d.exp))) return; const rem = new Date((P.num(d.exp) - 90) * 864e5), r = rem.getUTCFullYear() + String(rem.getUTCMonth() + 1).padStart(2, '0') + String(rem.getUTCDate()).padStart(2, '0'), nx = new Date((P.num(d.exp) - 89) * 864e5), n = nx.getUTCFullYear() + String(nx.getUTCMonth() + 1).padStart(2, '0') + String(nx.getUTCDate()).padStart(2, '0'); L.push('BEGIN:VEVENT', 'UID:dilia-doc-' + d.id + '@dilia', 'DTSTAMP:20260101T000000Z', 'DTSTART;VALUE=DATE:' + r, 'DTEND;VALUE=DATE:' + n, 'SUMMARY:' + esc2('Renew ' + d.kind + ' (' + d.owner + '), expires ' + d.exp), 'DESCRIPTION:' + esc2('Expires on ' + d.exp + '. Reminder set 90 days before.'), 'END:VEVENT'); });
    L.push('END:VCALENDAR'); K.download('document-renewals.ics', L.join('\r\n') + '\r\n', 'text/calendar'); $('dcmsg').textContent = 'Calendar file downloaded: one reminder 90 days before each expiry.';
  });
  $('dckind').innerHTML = KINDS.map(k => `<option>${esc(k)}</option>`).join(''); paint();
}
