/* Whole-file tools: password protect, remove password, compress. One PDF at a time. */
{
const { $, kb, plural, esc, toast, save, cleanName } = Kit;

const MODE = document.body.dataset.tool;
const CFG = {
  protect:  { fallback: 'Dilia-protected', verb: 'Protect and download' },
  unlock:   { fallback: 'Dilia-unlocked',  verb: 'Remove password and download' },
  compress: { fallback: 'Dilia-compressed', verb: 'Compress and download' },
  ocr:      { fallback: 'Dilia-searchable', verb: 'Recognise text and download' },
  repair:   { fallback: 'Dilia-repaired', verb: 'Repair and download' },
  linearize: { fallback: 'Dilia-web', verb: 'Optimise and download' }
}[MODE];
const ws = $('#ws'), pick = $('#pick'), go = $('#go'), note = $('#note'), prog = $('#prog'), outName = $('#outName'), errBox = $('#err');
let doc = null, busy = false, lastUrl = null, thumbUrl = null;     // doc: {name,size,bytes,lib?,js?,count?,status?}

const base = () => doc ? doc.name.replace(/\.pdf$/i, '') : '';
const showErr = m => { if (errBox) { errBox.textContent = m; errBox.hidden = !m; } };
const tick = () => new Promise(r => setTimeout(r, 0));
const lvl = () => document.querySelector('input[name=lv]:checked').value;

/* ---------- qpdf (WebAssembly, in a worker) ---------- */
const qpdf = (args, input) => DiliaGuard.qpdf(args, input);   // runs in a background worker with a time limit (guard.js)

/* ---------- loading ---------- */
async function load(list) {
  const all = [...list], pdfs = all.filter(Kit.isPdf);
  if (!pdfs.length) { toast('That is not a PDF. Choose a file ending in .pdf.', true); return; }
  if (all.length > 1) toast('Only one PDF at a time here. Using ' + pdfs[0].name + '.');
  const f = pdfs[0];
  ws.classList.add('working');
  let d;
  try {
    const bytes = new Uint8Array(await f.arrayBuffer());
    d = { name: f.name, size: f.size, bytes, status: '' };
    if (MODE === 'unlock') {
      const r = await qpdf(['--is-encrypted', '/in.pdf'], bytes);
      if (r.code === 0) { d.status = 'Limits only'; d.code = 3; }                 // encrypted, opens without a password
      else {
        try { await PDFLib.PDFDocument.load(bytes, { updateMetadata: false }); d.status = 'Not locked'; d.code = 2; }
        catch (e) {
          if (/encrypt/i.test(e.message)) { d.status = 'Needs a password'; d.code = 0; } else throw e;
        }
      }
    } else if (MODE === 'repair') {
      const o = await Kit.openPdf(f);
      d = o.err ? { name: f.name, size: f.size, bytes, status: /password/i.test(o.err) ? 'Password protected' : 'Cannot be opened', broken: true } : { ...o, bytes, status: 'Opens normally' };
      if (/password/i.test(o.err || '')) { toast(o.err, true); ws.classList.remove('working'); return; }
      if (d.broken) { try { d.js = await pdfjsLib.getDocument({ isEvalSupported: false, data: bytes.slice() }).promise; d.count = d.js.numPages; d.status = 'Partly readable'; } catch (e) { /* unreadable */ } }
    } else {
      const o = await Kit.openPdf(f);
      if (o.err) { toast(o.err, true); ws.classList.remove('working'); return; }
      d = { ...o, bytes, status: '' };
      if (MODE === 'compress') d.photos = countPhotos(o.lib);
      if (MODE === 'ocr') d.textPages = await countTextPages(o.js);
    }
  } catch (e) {
    toast(`${f.name} could not be read. It may be damaged.`, true); ws.classList.remove('working'); return;
  }
  ws.classList.remove('working');
  if (doc && doc.js) doc.js.destroy();
  doc = d;
  outName.value = base();
  if (thumbUrl) { URL.revokeObjectURL(thumbUrl); thumbUrl = null; }
  $('#fthumb').innerHTML = '<span>PDF</span>';
  if (doc.js) Kit.renderThumb(doc.js, 0).then(b => { if (doc !== d) return; thumbUrl = URL.createObjectURL(b); $('#fthumb').innerHTML = `<img src="${thumbUrl}" alt="">`; }).catch(() => {});
  ['pw1', 'pw2'].forEach(i => { if ($('#' + i)) $('#' + i).value = ''; });
  clearDone(); showErr(''); render();
}

/* ---------- drawing ---------- */
function render() {
  ws.dataset.state = doc ? 'full' : 'empty';
  if (doc) {
    $('#fname').textContent = '';
    $('#fn2').textContent = doc.name;
    $('#fmeta').textContent = `${kb(doc.size)}${doc.count ? ', ' + plural(doc.count, 'page') : ''}`;
    $('#fstate').textContent = MODE === 'ocr' ? (doc.textPages === doc.count ? 'Every page already has text.' : doc.textPages ? `${plural(doc.count - doc.textPages, 'page')} without text, ${plural(doc.textPages, 'page')} with text` : 'No text found. This looks like a scan.')
      : MODE === 'unlock' ? doc.status
      : MODE === 'repair' ? (doc.broken ? 'This file does not open normally. Repair will try to rebuild it.' : 'This file already opens. Repair rewrites it cleanly, which can fix hidden damage.')
      : MODE === 'linearize' ? 'Fast web view lets a browser show page 1 before the whole file arrives.'
      : MODE === 'compress' ? (doc.photos ? `${plural(doc.photos, 'photo')} can be shrunk` : 'No photos found. Compressing will not help much.') : '';
  }
  summary();
}
function summary() {
  const S = (i, v) => { $('#' + i).textContent = v; };
  let ok = !!doc, msg = 'Add a PDF to start.';
  if (!doc) { S('s1', 0); S('s2', '-'); S('s3', 0); }
  else if (MODE === 'protect') {
    S('s1', doc.count); S('s2', 'AES-256'); S('s3', kb(doc.size));
    const a = $('#pw1').value, b = $('#pw2').value;
    ok = a.length >= 4 && a === b;
    msg = a.length < 4 ? 'Choose a password of at least 4 characters.' : a !== b ? 'The two passwords do not match yet.' : 'Ready. The saved file needs this password to open.';
  } else if (MODE === 'unlock') {
    S('s1', kb(doc.size)); S('s2', doc.status); S('s3', doc.count || '?');
    ok = doc.code !== 2;
    msg = doc.code === 2 ? 'This PDF is not locked. There is nothing to remove.' : doc.code === 0 ? 'Type the password, then remove it.' : 'This file only has limits (such as no printing). They can be removed without a password.';
  } else if (MODE === 'repair' || MODE === 'linearize') {
    S('s1', kb(doc.size)); S('s2', MODE === 'repair' ? doc.status : 'Fast web view'); S('s3', doc.outSize ? kb(doc.outSize) : '-');
    msg = MODE === 'repair' ? 'Best effort: damage that destroyed content cannot be undone. Check the result.' : 'Rewrites the file so the first page loads first. The pages do not change.';
  } else if (MODE === 'ocr') {
    S('s1', doc.count); S('s2', 'English'); S('s3', kb(doc.size));
    ok = !$('#skipText').checked || doc.textPages < doc.count;
    msg = ok ? 'Recognition runs on this device. A page takes a few seconds.' : 'Every page already has text. Untick the box to read them again.';
  } else {
    S('s1', kb(doc.size)); S('s2', doc.outSize ? kb(doc.outSize) : '-'); S('s3', doc.outSize ? Math.max(0, Math.round((1 - doc.outSize / doc.size) * 100)) + '%' : '-');
    msg = 'Pick a level, then compress. If the result is not smaller, nothing is downloaded.';
  }
  go.disabled = busy || !ok;
  note.textContent = msg;
}
['pw1', 'pw2'].forEach(i => { const e = $('#' + i); if (e) e.addEventListener('input', () => { showErr(''); clearDone(); summary(); }); });

/* ---------- compress: re-encode the photos (JPEG) inside the file ---------- */
const N = n => PDFLib.PDFName.of(n);
function jpegInfo(obj) {
  if (!(obj instanceof PDFLib.PDFRawStream)) return null;
  const d = obj.dict;
  if (d.get(N('Subtype')) !== N('Image')) return null;
  const f = d.get(N('Filter'));
  const dct = f === N('DCTDecode') || (f instanceof PDFLib.PDFArray && f.size() === 1 && f.get(0) === N('DCTDecode'));
  if (!dct || d.has(N('Decode')) || d.get(N('ImageMask')) === PDFLib.PDFBool.True) return null;
  let cs = d.get(N('ColorSpace'));
  if (cs instanceof PDFLib.PDFArray) {                                   // ICCBased: only 1 or 3 components
    const prof = obj.dict.context.lookup(cs.get(1)), n = prof && prof.dict && prof.dict.get(N('N'));
    cs = cs.get(0) === N('ICCBased') && n && (n.asNumber() === 3 || n.asNumber() === 1) ? N('DeviceRGB') : null;
  }
  if (cs !== N('DeviceRGB') && cs !== N('DeviceGray')) return null;
  const w = d.get(N('Width')), h = d.get(N('Height'));
  if (!w || !h) return null;
  return { w: w.asNumber(), h: h.asNumber() };
}
function countPhotos(lib) { let n = 0; for (const [, o] of lib.context.enumerateIndirectObjects()) if (jpegInfo(o)) n++; return n; }

const LEVELS = { light: { q: .82, max: 1e9 }, medium: { q: .7, max: 1800 }, strong: { q: .55, max: 1200 } };
async function compressFile() {
  const L = LEVELS[lvl()], lib = await PDFLib.PDFDocument.load(doc.bytes, { updateMetadata: false });
  const found = [];
  for (const [ref, o] of lib.context.enumerateIndirectObjects()) { const i = jpegInfo(o); if (i) found.push({ ref, o, ...i }); }
  let changed = 0;
  for (let k = 0; k < found.length; k++) {
    const { ref, o, w, h } = found[k];
    try {
      const bmp = await createImageBitmap(new Blob([o.contents], { type: 'image/jpeg' }));
      const r = Math.min(1, L.max / Math.max(bmp.width, bmp.height)), cw = Math.max(1, Math.round(bmp.width * r)), ch = Math.max(1, Math.round(bmp.height * r));
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch); x.drawImage(bmp, 0, 0, cw, ch); bmp.close && bmp.close();
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', L.q)); c.width = c.height = 0;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.length < o.contents.length * 0.92) {
        const nd = lib.context.obj({ Type: 'XObject', Subtype: 'Image', Width: cw, Height: ch, ColorSpace: 'DeviceRGB', BitsPerComponent: 8, Filter: 'DCTDecode', Length: bytes.length });
        ['SMask', 'Mask'].forEach(key => { if (o.dict.has(N(key))) nd.set(N(key), o.dict.get(N(key))); });
        lib.context.assign(ref, PDFLib.PDFRawStream.of(nd, bytes)); changed++;
      }
    } catch (e) { /* leave this photo as it is */ }
    prog.style.width = Math.round(8 + 80 * (k + 1) / found.length) + '%'; await tick();
  }
  lib.setProducer('Dilia Studio');
  const out = await lib.save({ useObjectStreams: true });
  return { out, changed, total: found.length };
}

/* ---------- OCR: add an invisible text layer on top of the scanned pages ---------- */
async function pageHasText(js, i) {
  const tc = await (await js.getPage(i + 1)).getTextContent();
  let n = 0; for (const it of tc.items) n += (it.str || '').replace(/\s/g, '').length;
  return n >= 20;
}
async function countTextPages(js) { if (!js) return 0; let n = 0; for (let i = 0; i < js.numPages; i++) if (await pageHasText(js, i)) n++; return n; }
async function ocrFile() {
  if (!doc.js) throw new Error('the preview engine could not open this file');
  const skip = $('#skipText').checked, todo = [];
  for (let i = 0; i < doc.count; i++) if (!(skip && await pageHasText(doc.js, i))) todo.push(i);
  if (!todo.length) { const e = new Error('none'); e.small = 'Every page already has text.'; throw e; }
  const out = await PDFLib.PDFDocument.load(doc.bytes, { updateMetadata: false });
  const font = await out.embedFont(PDFLib.StandardFonts.Helvetica), pages = out.getPages();
  let cur = 0, done = 0, words = 0;
  note.textContent = 'Loading the text engine (first time only)...';
  const mk = Tesseract.createWorker('eng', 1, {
    workerPath: DROOT + 'assets/vendor/ocr/worker.min.js', corePath: DROOT + 'assets/vendor/ocr/tesseract-core-simd-lstm.wasm.js', langPath: DROOT + 'assets/vendor/ocr', gzip: true, workerBlobURL: false,
    logger: m => { if (m.status === 'recognizing text') prog.style.width = Math.round(10 + 82 * (done + m.progress) / todo.length) + '%'; }
  });
  mk.catch(() => {});
  const worker = await Promise.race([mk, new Promise((_, rej) => setTimeout(() => rej(new Error('the text engine did not start. Reload the page and try again')), 90000))]);
  try {
    for (const i of todo) {
      note.textContent = `Reading page ${i + 1} (${done + 1} of ${todo.length})...`;
      const page = await doc.js.getPage(i + 1), v1 = page.getViewport({ scale: 1 });
      // pass 1: high resolution for small print. pass 2: low resolution, because very large headings are dropped at high resolution
      const grab = async dpi => {
        const sc = Math.min(dpi / 72, 3400 / Math.max(v1.width, v1.height)), vp = page.getViewport({ scale: sc });
        const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: x, viewport: vp }).promise;
        const res = await worker.recognize(c, {}, { blocks: true }); c.width = c.height = 0;
        const out = [];
        for (const bl of res.data.blocks || []) for (const pa of bl.paragraphs || []) for (const l of pa.lines || []) for (const w of l.words || [])
          out.push({ text: w.text, confidence: w.confidence, x0: w.bbox.x0 / sc, y0: w.bbox.y0 / sc, x1: w.bbox.x1 / sc, y1: w.bbox.y1 / sc });
        return out;
      };
      const ws = await grab(300), extra = await grab(100);
      for (const w of extra) {
        const cx = (w.x0 + w.x1) / 2, cy = (w.y0 + w.y1) / 2;
        if (!ws.some(q => cx > q.x0 - 1 && cx < q.x1 + 1 && cy > q.y0 - 1 && cy < q.y1 + 1)) ws.push(w);
      }
      const pg = pages[i], vp1 = page.getViewport({ scale: 1 }), rot = PDFLib.degrees(vp1.rotation);
      pg.setFont(font);
      for (const w of ws) {
        let t = ''; for (const ch of w.text.trim()) { try { font.encodeText(ch); t += ch; } catch (e) { t += '?'; } }
        if (!t || w.confidence < 20) continue;
        const bw = w.x1 - w.x0, bh = w.y1 - w.y0;
        if (bw < 1 || bh < 1) continue;
        const nat = font.widthOfTextAtSize(t, 10), size = Math.max(2, Math.min(bh * 1.05, bw / nat * 10));
        const [ux, uy] = vp1.convertToPdfPoint(w.x0, w.y1 - bh * 0.2);
        const th = vp1.rotation * Math.PI / 180;
        pg.pushOperators(PDFLib.pushGraphicsState(), PDFLib.beginText(), PDFLib.setFontAndSize(pg.fontKey, size),
          PDFLib.setTextRenderingMode(PDFLib.TextRenderingMode.Invisible),
          PDFLib.setTextMatrix(Math.cos(th), Math.sin(th), -Math.sin(th), Math.cos(th), ux, uy),
          PDFLib.showText(font.encodeText(t)), PDFLib.endText(), PDFLib.popGraphicsState());
        words++;
      }
      done++;
      prog.style.width = Math.round(10 + 82 * done / todo.length) + '%'; await tick();
    }
  } finally { await worker.terminate(); }
  if (!words) { const e = new Error('none'); e.small = 'No text could be recognised. The scan may be too faint, or not in English.'; throw e; }
  out.setProducer('Dilia Studio');
  return { out: await out.save(), pages: todo.length, words };
}

/* ---------- actions ---------- */
function rnd(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(v => 'abcdefghijkmnpqrstuvwxyz23456789'[v % 32]).join(''); }
async function run() {
  if (MODE === 'protect') {
    const pw = $('#pw1').value, restrict = [];
    if (!$('#aPrint').checked) restrict.push('--print=none');
    if (!$('#aCopy').checked) restrict.push('--extract=n');
    if (!$('#aEdit').checked) restrict.push('--modify=none', '--annotate=n', '--assemble=n', '--form=n');
    const r = await qpdf(['/in.pdf', '--encrypt', pw, restrict.length ? rnd(24) : pw, '256', ...restrict, '--', '/out.pdf'], doc.bytes);
    if (!r.out || (r.code !== 0 && r.code !== 3)) throw new Error('the file could not be encrypted');
    return { bytes: r.out, name: cleanName(outName.value, CFG.fallback, 'pdf'), info: `${plural(doc.count, 'page')}, locked with AES-256` };
  }
  if (MODE === 'unlock') {
    const pw = $('#pw1').value;
    const r = await qpdf([...(pw ? ['--password=' + pw] : []), '--decrypt', '/in.pdf', '/out.pdf'], doc.bytes);
    if (!r.out || (r.code !== 0 && r.code !== 3)) {
      if (doc.code === 0) { const e = new Error('wrong'); e.wrong = true; throw e; }
      throw new Error('the password could not be removed');
    }
    let pages = '';
    try { pages = plural((await PDFLib.PDFDocument.load(r.out, { updateMetadata: false })).getPageCount(), 'page') + ', '; } catch (e) { /* ignore */ }
    return { bytes: r.out, name: cleanName(outName.value, CFG.fallback, 'pdf'), info: pages + 'no password needed' };
  }
  if (MODE === 'repair' || MODE === 'linearize') {
    const r = await qpdf(MODE === 'linearize' ? ['--linearize', '/in.pdf', '/out.pdf'] : ['/in.pdf', '/out.pdf'], doc.bytes);
    if (MODE === 'repair' && (!r.out || (r.code !== 0 && r.code !== 3) || !(await PDFLib.PDFDocument.load(r.out, { updateMetadata: false }).then(l => l.getPageCount() > 0, () => false)))) {
      if (!doc.js) throw new Error('the file is too damaged to rebuild');       // last resort: draw every page the viewer can still read
      const out = await PDFLib.PDFDocument.create(); let n = 0;
      for (let i = 0; i < doc.count; i++) {
        try {
          const page = await doc.js.getPage(i + 1), v1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: Math.min(2, 4000 / Math.max(v1.width, v1.height)) });
          const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
          const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); await page.render({ canvasContext: ctx, viewport: vp }).promise;
          const blob = await new Promise(rs => c.toBlob(rs, 'image/jpeg', .88)); c.width = c.height = 0;
          const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer())), pg = out.addPage([v1.width, v1.height]); pg.drawImage(img, { x: 0, y: 0, width: v1.width, height: v1.height }); n++;
        } catch (e) { /* page lost */ }
        prog.style.width = Math.round(8 + 84 * (i + 1) / doc.count) + '%'; await tick();
      }
      if (!n) throw new Error('no page could be read');
      out.setProducer('Dilia Studio'); const bytes = await out.save(); doc.outSize = bytes.length; summary();
      return { bytes, name: cleanName(outName.value, CFG.fallback, 'pdf'), info: `${plural(n, 'page')} recovered as pictures (text is not selectable)` };
    }
    if (!r.out || (r.code !== 0 && r.code !== 3)) throw new Error('the file could not be rewritten');
    let pages = 0, js = null;
    try { const l = await PDFLib.PDFDocument.load(r.out, { updateMetadata: false }); pages = l.getPageCount(); } catch (e) { if (MODE === 'repair') throw new Error('the rebuilt file still does not open. It is too damaged'); }
    if (MODE === 'repair' && !pages) throw new Error('no pages could be recovered');
    doc.outSize = r.out.length; summary();
    return { bytes: r.out, name: cleanName(outName.value, CFG.fallback, 'pdf'), info: MODE === 'repair' ? `${plural(pages, 'page')} recovered${r.code === 3 ? ', with repairs' : ''}` : `${plural(pages, 'page')}, fast web view on` };
  }
  if (MODE === 'ocr') {
    const r = await ocrFile();
    return { bytes: r.out, name: cleanName(outName.value, CFG.fallback, 'pdf'), info: `${plural(r.pages, 'page')} read, ${r.words.toLocaleString('en-US')} words found` };
  }
  const r = await compressFile();
  doc.outSize = r.out.length; summary();
  if (r.out.length >= doc.size * 0.98) {
    const e = new Error('small'); e.small = r.total ? 'This PDF could not be made noticeably smaller at this level. Try a stronger level.' : 'This PDF has no photos to shrink, so it cannot get much smaller.'; throw e;
  }
  return { bytes: r.out, name: cleanName(outName.value, CFG.fallback, 'pdf'), info: `${r.changed} of ${plural(r.total, 'photo')} shrunk, saved ${Math.round((1 - r.out.length / doc.size) * 100)}%` };
}
go.addEventListener('click', async () => {
  if (busy || go.disabled) return;
  busy = true; go.disabled = true; ws.classList.add('working'); prog.style.width = '6%'; showErr('');
  try {
    await tick();
    const r = await run();
    prog.style.width = '100%';
    const blob = new Blob([r.bytes], { type: 'application/pdf' });
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(blob);
    save(lastUrl, r.name);
    $('#doneName').textContent = r.name; $('#doneInfo').textContent = `${r.info}, ${kb(blob.size)}`;
    $('#again').href = lastUrl; $('#again').download = r.name; $('#done').hidden = false;
  } catch (e) {
    if (e.wrong) { showErr('That password is not correct. Check it and try again.'); toast('Wrong password.', true); }
    else if (typeof e.small === 'string') toast(e.small, true);
    else toast('This did not finish: ' + (e && e.message ? e.message : String(e)) + '.', true);
  }
  busy = false; ws.classList.remove('working');
  setTimeout(() => { prog.style.width = '0'; }, 600);
  summary();
});

function clearDone() { $('#done').hidden = true; }
$('#reset').addEventListener('click', () => {
  if (doc && doc.js) doc.js.destroy();
  doc = null; clearDone(); showErr('');
  ['pw1', 'pw2'].forEach(i => { if ($('#' + i)) $('#' + i).value = ''; });
  render(); scrollTo({ top: 0, behavior: 'smooth' });
});
if ($('#skipText')) $('#skipText').addEventListener('change', () => { clearDone(); summary(); });
document.querySelectorAll('input[name=lv]').forEach(r => r.addEventListener('change', () => { clearDone(); if (doc) { doc.outSize = 0; summary(); } }));
pick.addEventListener('change', () => { if (pick.files.length) load(pick.files); pick.value = ''; });
Kit.dropAnywhere(load);
go.querySelector('.go-l').textContent = CFG.verb;
render();
window.__dilia = { get doc() { return doc; } };
}
