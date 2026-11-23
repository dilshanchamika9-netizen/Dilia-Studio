// Tool library: all lines on tools.html, or one line on /pdf/, /image/, /qr/ (body[data-line]).
{
  inkFlow(document.getElementById('ink'), { start: 19 });
  const lib = document.getElementById('lib'), q = document.getElementById('q');
  const only = document.body.dataset.line || '';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const byId = {}; DILIA_TOOLS.forEach(([g, l]) => l.forEach(t => { byId[t.id] = t; }));
  const tile = t => `<a class="tile ready" href="${diliaUrl(t)}" data-s="${esc((t.name + ' ' + t.desc + ' ' + (t.gname || '') + ' ' + (t.gdesc || '')).toLowerCase())}"><span class="ic">${diliaIcon(t.icon)}</span><b>${esc(t.gname || t.name)}</b><span>${esc(t.gdesc || t.desc)}</span></a>`;
  // "I want to..." goals: each chip opens the tool that does it. Only on the main library page.
  if (!only) {
    const GOALS = [
      ['Documents', 'pdf', [['merge PDFs', 'merge'], ['split a PDF', 'split'], ['make a PDF smaller', 'compress'], ['sign a document', 'sign'], ['edit text in a PDF', 'edit'], ['fill in a form', 'forms'], ['lock a PDF with a password', 'protect'], ['remove a PDF password', 'unlock'], ['turn photos into a PDF', 'img2pdf'], ['turn a PDF into Excel', 'table'], ['read text in a scan', 'ocr'], ['hide private details', 'redact'], ['delete pages from a PDF', 'delete'], ['rotate a PDF', 'rotate'], ['add a watermark to a PDF', 'watermark'], ['add page numbers', 'number'], ['compare two PDFs', 'compare'], ['turn a PDF into pictures', 'pdf2img']]],
      ['Photos', 'image', [['make a photo smaller', 'pxcompress'], ['resize a photo', 'pxresize'], ['open an iPhone photo', 'pxheic'], ['change a picture format', 'pxconvert'], ['crop a picture', 'pxcrop'], ['blur part of a photo', 'pxblur'], ['add a watermark to a photo', 'pxwm']]],
      ['QR codes', 'qr', [['make a QR code', 'qrmain'], ['share my Wi-Fi', 'qrwifi'], ['share my contact', 'qrvcard'], ['read a QR code', 'qrread']]],
      ['Text', 'text', [['count words', 'txcount'], ['change capital letters', 'txcase'], ['remove duplicate lines', 'txdedupe'], ['compare two texts', 'txdiff']]],
      ['Numbers and dates', 'calc', [['work out VAT', 'cvat'], ['work out a percentage', 'cpct'], ['convert units', 'unit'], ['check a loan', 'cloan'], ['count days between dates', 'dd'], ['count working days', 'dwork'], ['find public holidays', 'dhol'], ['change time zone', 'dtz'], ['calculate UAE gratuity', 'dgrat']]]
    ];
    const gl = document.getElementById('goals');
    if (gl) gl.innerHTML = '<h2 id="gh"><span>I want to</span><i aria-hidden="true">…</i></h2>' + GOALS.map(([name, line, items]) =>
      `<div class="grow" data-line="${line}"><b>${esc(name)}</b><div>${items.filter(([, id]) => byId[id]).map(([txt, id]) => `<a href="${diliaUrl(byId[id])}" data-s="${esc(txt + ' ' + byId[id].name)}">${esc(txt)}</a>`).join('')}</div></div>`).join('') +
      '<p class="gmore">Not here? Search above, or browse every tool below.</p>';
  }
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
    const v = q.value.trim().toLowerCase(); let any = 0; const gl2 = document.getElementById('goals'); if (gl2) gl2.hidden = !!v;
    lib.querySelectorAll('.grp').forEach(g => {
      let n = 0;
      g.querySelectorAll('[data-s]').forEach(t => { const on = !v || t.dataset.s.includes(v); t.hidden = !on; n += on; });
      g.hidden = !n; any += n;
    });
    lib.querySelectorAll('.line').forEach(l => { l.hidden = !!v && !l.querySelector('.grp:not([hidden])'); });
    document.getElementById('none').style.display = any || !v ? 'none' : 'block';
  });
}
