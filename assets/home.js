// Dilia home: search, today strip, area doors, popular tools, and "drop a file to see what fits".
{
  const T = DiliaSearch.all(), byId = Object.fromEntries(T.map(t => [t.id, t]));
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const ready = T.filter(t => t.ready && t.group !== 'Play'); // tools only; games are counted in Play
  document.getElementById('count').textContent = ready.length;
  inkFlow(document.getElementById('ink'));
  DiliaSearch.mount(document.getElementById('q'), document.getElementById('plist'), 4);

  const QUICK = ['merge', 'pxcompress', 'qrmain', 'dhol', 'dtz', 'txcount'];
  const quick = document.getElementById('quick');
  QUICK.forEach(id => { const a = el('a', '', byId[id].name); a.href = diliaUrl(byId[id]); quick.append(a); });

  const pg = document.getElementById('pgrid');
  ['merge', 'compress', 'pxcompress', 'pxresize', 'qrmain', 'dhol', 'dtz', 'txcount'].forEach(id => {
    const t = byId[id], a = el('a', 'pcard'); a.href = diliaUrl(t);
    const i = el('span', 'pi'); i.innerHTML = diliaIcon(t.icon);
    a.append(i, el('b', '', t.name), el('span', 'd', t.desc)); pg.append(a);
  });

  // Tools door: live lines with real counts.
  const n = g => ready.filter(t => t.group === g).length;
  const nPdf = ready.length - n('Image') - n('QR') - n('Text') - n('Calc');
  const dt = document.getElementById('door-tools');
  [['PDF', nPdf], ['Image', n('Image')], ['Text', n('Text')], ['QR codes', n('QR')], ['Calculators', n('Calc')]].forEach(([k, v]) => { if (v) dt.append(el('li', '', k + ' · ' + v)); });

  // Today strip: worked out on this device from the clock. No network.
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const doy = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - start) / 864e5) + 1;
  document.getElementById('t-date').textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const bits = ['Day ' + doy];
  try { const f = new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }); if (f.resolvedOptions().calendar === 'islamic-umalqura') bits.push(f.format(now)); } catch (e) {}
  const P = 29.530588853, age = (((now - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % P + P) % P;
  bits.push('moon ' + Math.round((1 - Math.cos(2 * Math.PI * age / P)) / 2 * 100) + '% lit');
  document.getElementById('t-sub').textContent = bits.join(' · ');

  // Tool of the day: one live tool, changes at local midnight, same order for everyone.
  const key = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const pool = ready.slice().sort((a, b) => a.id < b.id ? -1 : 1);
  const tod = pool[(key * 2654435761 >>> 0) % pool.length];
  // Daily puzzle: today's path number and size, worked out from the date
  if (window.DiliaPlayGen) {
    const G = DiliaPlayGen, k = G.dayKey(now), sz = [7, 5, 5, 6, 6, 6, 7][G.weekday(k)];
    document.getElementById('t-pz').textContent = 'Daily path #' + G.dayNo(k);
    document.getElementById('t-pzd').textContent = sz + ' × ' + sz + ' today · same board for everyone';
  }
  const tl = document.getElementById('t-tool'); tl.href = diliaUrl(tod);
  document.getElementById('t-tn').textContent = tod.name; document.getElementById('t-td').textContent = tod.desc;

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
