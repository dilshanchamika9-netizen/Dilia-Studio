// Dilia hub: search, popular tools, lines, and "drop a file to see what fits".
{
  const T = DiliaSearch.all(), byId = Object.fromEntries(T.map(t => [t.id, t]));
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const ready = T.filter(t => t.ready);
  document.getElementById('count').textContent = ready.length;
  inkFlow(document.getElementById('ink'));
  DiliaSearch.mount(document.getElementById('q'), document.getElementById('plist'), 4);

  const QUICK = ['merge', 'compress', 'sign', 'edit', 'pdf2img', 'ocr'];
  const quick = document.getElementById('quick');
  QUICK.forEach(id => { const a = el('a', '', byId[id].name); a.href = diliaUrl(byId[id]); quick.append(a); });

  const pg = document.getElementById('pgrid');
  ['merge', 'compress', 'edit', 'sign', 'split', 'pdf2img', 'img2pdf', 'ocr'].forEach(id => {
    const t = byId[id], a = el('a', 'pcard'); a.href = diliaUrl(t);
    const i = el('span', 'pi'); i.innerHTML = diliaIcon(t.icon);
    a.append(i, el('b', '', t.name), el('span', 'd', t.desc)); pg.append(a);
  });

  const lg = document.getElementById('lgrid');
  const line = (name, text, soon, href, go) => {
    const c = el(soon ? 'div' : 'a', 'lcard' + (soon ? ' soon' : '')); if (href) c.href = href;
    const w = el('span', 'wm'); w.append(el('span', 'w', 'Dilia'), el('span', 'l', name));
    c.append(w, el('p', '', text), el('span', 'go', go)); lg.append(c);
  };
  const nPix = ready.filter(t => t.group === 'Pixel').length;
  line('Studio', 'PDF: organise, edit, sign, convert and secure.', false, 'tools.html', (ready.length - nPix) + ' tools →');
  line('Pixel', 'Compress, resize, crop and convert images. Watermark, blur, make GIFs.', false, 'tools.html#pixel-grp', nPix + ' tools →');
  line('QR', 'QR codes for links, Wi-Fi and contacts.', true, '', 'Coming soon');
  line('Text', 'Word count, case changes and clean-up.', true, '', 'Coming soon');

  // Drop a file anywhere: show the tools that fit, then open one with the file ready.
  const veil = document.getElementById('veil'), fit = document.getElementById('fit');
  const PDF_TOOLS = ['compress', 'merge', 'split', 'edit', 'sign', 'protect', 'unlock', 'ocr', 'pdf2img', 'redact', 'watermark', 'number', 'rotate', 'reorder', 'delete', 'extract', 'crop', 'forms', 'flatten', 'repair'];
  const IMG_TOOLS = ['img2pdf', 'scan'];
  const kind = f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf' ? 'pdf' : /\.(jpe?g|png|webp|gif|bmp|avif|tiff?)$/i.test(f.name) || /^image\//.test(f.type) ? 'img' : '';
  const size = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  let depth = 0;
  const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; veil.classList.add('on'); } });
  addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
  addEventListener('dragleave', e => { if (hasFiles(e) && --depth <= 0) { depth = 0; veil.classList.remove('on'); } });
  addEventListener('drop', e => {
    if (!hasFiles(e)) return; e.preventDefault(); depth = 0; veil.classList.remove('on');
    const files = [...e.dataTransfer.files]; if (files.length) showFit(files);
  });
  function showFit(files) {
    const k = kind(files[0]), same = files.filter(f => kind(f) === k);
    const g = document.getElementById('fit-g'); g.textContent = '';
    document.getElementById('fit-k').textContent = same.length > 1 ? same.length + ' files' : (k ? (k === 'pdf' ? 'PDF' : 'Picture') : 'File');
    document.getElementById('fit-t').textContent = same.length > 1 ? same.map(f => f.name).slice(0, 2).join(', ') + (same.length > 2 ? ' and ' + (same.length - 2) + ' more' : '') : files[0].name;
    if (!k) {
      document.getElementById('fit-s').textContent = 'Dilia cannot open that kind of file yet. Today it works with PDFs and pictures (JPG, PNG, TIFF and more).';
    } else {
      document.getElementById('fit-s').textContent = (same.length > 1 ? same.length + ' files, ' : size(same[0].size) + ', ') + 'read in this tab only. Pick what to do. Your file is passed to the next page on this device and is never uploaded.';
      (k === 'pdf' ? PDF_TOOLS : IMG_TOOLS).map(id => byId[id]).filter(t => t && t.ready && (same.length === 1 || /^(merge|img2pdf|scan|mix)$/.test(t.id))).forEach(t => {
        const b = el('button'); b.type = 'button'; b.append(el('b', '', t.name), el('small', '', t.desc));
        b.addEventListener('click', async () => { b.disabled = true; try { await DiliaHandoff.put(same); } catch (err) { /* private mode: tool opens empty */ } location.href = diliaUrl(t); });
        g.append(b);
      });
    }
    fit.hidden = false; document.getElementById('fit-x').focus();
  }
  document.getElementById('fit-x').addEventListener('click', () => { fit.hidden = true; });
  fit.addEventListener('mousedown', e => { if (e.target === fit) fit.hidden = true; });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !fit.hidden) fit.hidden = true; });
}
