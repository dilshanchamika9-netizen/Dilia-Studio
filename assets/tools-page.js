// Tool library: all lines on tools.html, or one line on /pdf/, /image/, /qr/ (body[data-line]).
{
  inkFlow(document.getElementById('ink'), { start: 19 });
  const lib = document.getElementById('lib'), q = document.getElementById('q');
  const only = document.body.dataset.line || '';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const byId = {}; DILIA_TOOLS.forEach(([g, l]) => l.forEach(t => { byId[t.id] = t; }));
  const tile = t => `<a class="tile ready" href="${diliaUrl(t)}" data-s="${esc((t.name + ' ' + t.desc).toLowerCase())}"><span class="ic">${diliaIcon(t.icon)}</span><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></a>`;
  const lines = DILIA_LINES.filter(L => !only || L.id === only);
  { const qi = document.getElementById('q'), ex = { pdf: 'sign or compress', image: 'resize or HEIC', qr: 'Wi-Fi or contact', text: 'count or sort' }[only]; if (qi && ex) qi.placeholder = 'Search ' + lines[0].title + ', for example ' + ex; }
  const live = lines.filter(L => !L.soon), soon = lines.filter(L => L.soon);
  const sec = L => {
    const head = only ? '' : `<div class="lhead"><div><h2>${esc(L.title)}</h2><p>${esc(L.blurb)}</p></div><a class="lopen" href="${DROOT}${L.href}">Open ${esc(L.title)} →</a></div>`;
    const cats = L.cats.map(([name, ids, more]) => `
      <section class="grp"><h3>${esc(name)}</h3><div>
        <div class="tiles">${ids.map(i => byId[i]).filter(Boolean).map(tile).join('')}</div>
        ${more ? `<p class="chips"><span>Also:</span>${more.map(i => byId[i]).filter(Boolean).map(t => `<a href="${diliaUrl(t)}" data-s="${esc((t.name + ' ' + t.desc).toLowerCase())}">${esc(t.name)}</a>`).join('')}</p>` : ''}
      </div></section>`).join('');
    const sn = L.soonItems ? `<section class="grp"><h3>Coming soon</h3><div class="tiles">${L.soonItems.map(n => `<div class="tile soon" data-s="${esc(n.toLowerCase())}" aria-disabled="true"><span class="ic">${diliaIcon('M12 6v6l4 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}</span><b>${esc(n)}</b><span>On the way.</span><em>Coming soon</em></div>`).join('')}</div></section>` : '';
    return `<div class="line" id="${L.id}">${head}${cats}${sn}</div>`;
  };
  const soonBlock = !soon.length ? '' : `<div class="line" id="more-lines"><div class="lhead"><div><h2>More lines on the way</h2><p>Each one will be its own Dilia line, with its own page.</p></div></div>
    <div class="soongrid">${soon.map(L => `<div class="scard"><b>${esc(L.title)}</b><span>${esc(L.kind)}</span><p>${esc(L.blurb)}</p>${(L.soonItems || []).map(n => `<i>${esc(n)}</i>`).join('')}<em>Coming soon</em></div>`).join('')}</div></div>`;
  lib.innerHTML = live.map(sec).join('') + soonBlock + '<p class="none" id="none">No tool matches that search.</p>';
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase(); let any = 0;
    lib.querySelectorAll('.grp').forEach(g => {
      let n = 0;
      g.querySelectorAll('[data-s]').forEach(t => { const on = !v || t.dataset.s.includes(v); t.hidden = !on; n += on; });
      g.hidden = !n; any += n;
    });
    lib.querySelectorAll('.line').forEach(l => { l.hidden = !!v && !l.querySelector('.grp:not([hidden])'); });
    document.getElementById('none').style.display = any || !v ? 'none' : 'block';
  });
}
