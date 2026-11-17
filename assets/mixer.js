/* Two tools that combine several PDFs: Alternate and mix pages (data-tool=mix), Insert or replace pages (data-tool=insert). */
{
const { $, kb, plural, esc, toast, save, cleanName, parseRanges, compress } = Kit;
const MODE = document.body.dataset.tool, INSERT = MODE === 'insert', OVER = MODE === 'overlay', CMP = MODE === 'compare', REN = MODE === 'rename', BATCH = MODE === 'batch', PAIR = INSERT || OVER || CMP;
const { zip } = Kit;
const files = [];            // {id,name,size,bytes,lib,js,count,url}
let seq = 0, busy = false, lastUrl = null;
const ws = $('#ws'), grid = $('#grid'), pick = $('#pick'), go = $('#go'), note = $('#note'), prog = $('#prog'), errBox = $('#err');
const BIN = '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const val = id => { const e = $('#' + id); return e ? e.value : ''; };
const tick = () => new Promise(r => setTimeout(r, 0));
const showErr = m => { errBox.textContent = m; errBox.hidden = !m; };

async function add(list) {
  const all = [...list], pdfs = all.filter(Kit.isPdf);
  if (all.length - pdfs.length) toast(`${plural(all.length - pdfs.length, 'file')} skipped: only PDF files work here.`, true);
  ws.classList.add('working');
  for (const f of pdfs) {
    if (PAIR && files.length >= 2) { toast('This tool takes two PDFs.', true); break; }
    const r = await Kit.openPdf(f);
    if (r.err) { toast(r.err, true); continue; }
    r.id = 'f' + (++seq); files.push(r);
    r.url = null; thumb(r);
  }
  ws.classList.remove('working');
  if (pdfs.length) clearDone();
  render(); refreshNames();
}
async function thumb(f) {
  if (!f.js) return;
  try { f.url = URL.createObjectURL(await Kit.renderThumb(f.js, 0)); const c = grid.querySelector(`[data-id="${f.id}"] img`); if (c) { c.src = f.url; c.parentElement.classList.add('ok'); } } catch (e) { /* no preview */ }
}
const roleOf = n => INSERT ? (n === 0 ? 'Main PDF' : 'Pages come from') : OVER ? (n === 0 ? 'Main PDF' : 'Letterhead') : CMP ? (n === 0 ? 'Original' : 'Changed') : '';
const newNames = new Map();                              // rename: file id -> proposed name
function render() {
  ws.dataset.state = files.length ? 'full' : 'empty';
  grid.innerHTML = files.map((f, n) => `<article class="card page" data-id="${f.id}" aria-label="${esc(f.name)}">
    <div class="pv${f.url ? ' ok' : ''}"><img alt="" ${f.url ? `src="${f.url}"` : ''}></div>
    <div class="pmeta"><i></i><span>${n + 1}</span><em title="${esc(f.name)}">${roleOf(n) ? roleOf(n) + ': ' : ''}${esc(f.name)} (${plural(f.count, 'page')})${REN && newNames.get(f.id) ? ' → ' + esc(newNames.get(f.id)) : ''}</em></div>
    <div class="tools-row"><button type="button" data-rm="1" aria-label="Remove ${esc(f.name)}">${BIN}</button></div></article>`).join('');
  grid.querySelectorAll('.page').forEach(c => c.style.setProperty('--c', '#e5007d'));
  summary();
}
function plan() {                                       // -> {err}|{hint}|{list:[{f,i}] , info}
  if (REN) {
    if (!files.length) return { hint: 'Add the PDFs you want to rename.' };
    const r = renCheck(); if (r.err) return { err: r.err };
    return { list: files.map(f => ({ f, i: 0 })), info: plural(files.length, 'file') + ' renamed' };
  }
  if (BATCH) {
    if (!files.length) return { hint: 'Add the PDFs to process.' };
    const r = batchCheck(); if (r.err) return { err: r.err }; if (r.hint) return { hint: r.hint };
    return { list: files.map(f => ({ f, i: 0 })), info: plural(files.length, 'file') + ' processed' };
  }
  if (CMP) return files.length < 2 ? { hint: 'Add the original PDF first, then the changed PDF.' } : { list: [{ f: files[0], i: 0 }], info: 'Comparison report' };
  if (OVER) {
    if (files.length < 2) return { hint: 'Add the main PDF first, then the letterhead PDF.' };
    return { list: files[0].lib.getPages().map((_, i) => ({ f: files[0], i })), info: plural(files[0].count, 'page') + ' with the letterhead' };
  }
  if (!INSERT) {
    if (files.length < 2) return { hint: 'Add at least two PDFs to mix.' };
    const n = Math.floor(+val('mN'));
    if (!(n >= 1 && n <= 50)) return { err: 'Pages taken at a time must be between 1 and 50.' };
    const rev = $('#mRev').checked, seqs = files.map((f, k) => Array.from({ length: f.count }, (_, i) => rev && k > 0 ? f.count - 1 - i : i));
    const out = [], pos = seqs.map(() => 0);
    while (pos.some((p, k) => p < seqs[k].length)) for (let k = 0; k < files.length; k++) for (let q = 0; q < n && pos[k] < seqs[k].length; q++) out.push({ f: files[k], i: seqs[k][pos[k]++] });
    return { list: out, info: `${plural(out.length, 'page')} from ${plural(files.length, 'file')}` };
  }
  if (files.length < 2) return { hint: 'Add the main PDF first, then the PDF the pages come from.' };
  const [A, B] = files, act = document.querySelector('input[name=ia]:checked').value;
  const sr = parseRanges(val('iSrc'), B.count); if (sr.err) return { err: 'Pages from the second file: ' + sr.err };
  const src = sr.entries.length ? sr.entries.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, k) => a - 1 + k)) : Array.from({ length: B.count }, (_, k) => k);
  const base = Array.from({ length: A.count }, (_, k) => k);
  let out;
  if (act === 'insert') {
    const at = Math.floor(+val('iAt'));
    if (!(at >= 0 && at <= A.count)) return { err: `Insert after page must be between 0 and ${A.count} (0 puts them at the start).` };
    out = [...base.slice(0, at).map(i => ({ f: A, i })), ...src.map(i => ({ f: B, i })), ...base.slice(at).map(i => ({ f: A, i }))];
  } else {
    const rr = parseRanges(val('iRep'), A.count); if (rr.err) return { err: 'Pages to replace: ' + rr.err };
    if (!rr.entries.length) return { hint: 'Type the pages of the main PDF to replace, for example 3-5.' };
    const gone = new Set(rr.entries.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, k) => a - 1 + k)));
    const first = Math.min(...gone); out = [];
    base.forEach(i => { if (i === first) src.forEach(j => out.push({ f: B, i: j })); if (!gone.has(i)) out.push({ f: A, i }); });
  }
  if (!out.length) return { err: 'That would leave an empty PDF.' };
  return { list: out, info: `${plural(out.length, 'page')}` };
}

/* ---------- compare two PDFs ---------- */
async function pageWords(f, pn) {
  try { const tc = await (await f.js.getPage(pn)).getTextContent(); return tc.items.flatMap(i => i.str.split(/\s+/)).filter(Boolean); } catch (e) { return []; }
}
function wordDiff(a, b) {                               // -> {add:[], del:[]} (LCS); big pages compare as sets
  if (a.length * b.length > 4e6) { const sa = new Set(a), sb = new Set(b); return { add: b.filter(w => !sa.has(w)), del: a.filter(w => !sb.has(w)) }; }
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const add = [], del = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) del.push(a[i++]); else add.push(b[j++]); }
  while (i < n) del.push(a[i++]); while (j < m) add.push(b[j++]);
  return { add, del };
}
async function grayPage(f, pn, W, H, scale) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  if (pn <= f.count) { const page = await f.js.getPage(pn), vp = page.getViewport({ scale }); await page.render({ canvasContext: ctx, viewport: vp }).promise; }
  return ctx.getImageData(0, 0, W, H).data;
}
const latin = t => t.replace(/[^ -~ -ÿ]/g, '?');
async function buildCompare() {
  const [A, B] = files, L = PDFLib, N = Math.max(A.count, B.count), out = await L.PDFDocument.create(), font = await out.embedFont(L.StandardFonts.Helvetica), bold = await out.embedFont(L.StandardFonts.HelveticaBold);
  if (!A.js || !B.js) throw new Error('the preview engine could not open these files');
  const rows = [], imgs = [];
  for (let k = 1; k <= N; k++) {
    const [wa, wb] = [k <= A.count ? await pageWords(A, k) : [], k <= B.count ? await pageWords(B, k) : []], df = wordDiff(wa, wb);
    const pa = k <= A.count ? (await A.js.getPage(k)).getViewport({ scale: 1 }) : null, pb = k <= B.count ? (await B.js.getPage(k)).getViewport({ scale: 1 }) : null;
    const w = Math.max(pa ? pa.width : 0, pb ? pb.width : 0), h = Math.max(pa ? pa.height : 0, pb ? pb.height : 0), sc = Math.min(1.5, 1400 / Math.max(w, h)), W = Math.ceil(w * sc), H = Math.ceil(h * sc);
    const ga = await grayPage(A, k, W, H, sc), gb = await grayPage(B, k, W, H, sc), c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), od = ctx.createImageData(W, H), o = od.data; let diff = 0, ink = 0;
    for (let i = 0; i < W * H; i++) {
      const x = i * 4, a = ga[x] * .3 + ga[x + 1] * .59 + ga[x + 2] * .11, b = gb[x] * .3 + gb[x + 1] * .59 + gb[x + 2] * .11, da = a < 150, db = b < 150;
      if (da || db) ink++;
      if (da && db) { o[x] = o[x + 1] = o[x + 2] = 170; } else if (da) { o[x] = 220; o[x + 1] = 30; o[x + 2] = 50; diff++; } else if (db) { o[x] = 0; o[x + 1] = 150; o[x + 2] = 80; diff++; } else { o[x] = o[x + 1] = o[x + 2] = 255; }
      o[x + 3] = 255;
    }
    ctx.putImageData(od, 0, 0); const blob = await new Promise(r => c.toBlob(r, 'image/png')); c.width = c.height = 0;
    rows.push({ k, add: df.add, del: df.del, pct: ink ? diff / ink * 100 : 0, missing: k > A.count ? 'only in changed file' : k > B.count ? 'only in original' : '' });
    imgs.push({ blob, w: w || 595, h: h || 842 });
    prog.style.width = Math.round(8 + 84 * k / N) + '%'; await tick();
  }
  const changed = rows.filter(r => r.add.length || r.del.length || r.pct > 0.5 || r.missing);
  // summary pages
  let pg = out.addPage([595.28, 841.89]), y = 800;
  const line = (t, f = font, size = 10, col = L.rgb(.04, .07, .13)) => { if (y < 50) { pg = out.addPage([595.28, 841.89]); y = 800; } pg.drawText(latin(t), { x: 48, y, size, font: f, color: col }); y -= size + 6; };
  line('PDF comparison', bold, 20); y -= 4; line('Original: ' + A.name + ' (' + plural(A.count, 'page') + ')'); line('Changed:  ' + B.name + ' (' + plural(B.count, 'page') + ')'); y -= 6;
  line(changed.length ? `${changed.length} of ${plural(N, 'page')} differ.` : 'No differences found in text or layout.', bold, 12); y -= 4;
  line('Red = only in the original. Green = only in the changed file. Grey = the same. Pages follow this summary.', font, 9, L.rgb(.4, .42, .46)); y -= 8;
  for (const r of changed) {
    line(`Page ${r.k}${r.missing ? ' (' + r.missing + ')' : ''}: ${plural(r.del.length, 'word')} removed, ${r.add.length} added, ${r.pct.toFixed(1)}% of marks differ`, bold, 10);
    if (r.del.length) line('  Removed: ' + r.del.slice(0, 14).join(' ') + (r.del.length > 14 ? ' ...' : ''), font, 9, L.rgb(.7, .1, .2));
    if (r.add.length) line('  Added: ' + r.add.slice(0, 14).join(' ') + (r.add.length > 14 ? ' ...' : ''), font, 9, L.rgb(0, .5, .3));
    y -= 2;
  }
  for (const im of imgs) { const img = await out.embedPng(new Uint8Array(await im.blob.arrayBuffer())), p2 = out.addPage([im.w, im.h]); p2.drawImage(img, { x: 0, y: 0, width: im.w, height: im.h }); }
  out.setProducer('Dilia Studio');
  const blob = new Blob([await out.save()], { type: 'application/pdf' });
  return { blob, name: cleanName($('#outName').value, 'Dilia-compared', 'pdf'), info: `${changed.length} of ${plural(N, 'page')} differ` };
}

/* ---------- rename by text ---------- */
const lineCache = new Map();                            // "fid:page" -> [lines]
async function linesOf(f, pn) {
  const k = f.id + ':' + pn; if (lineCache.has(k)) return lineCache.get(k);
  let lines = [];
  try {
    const tc = await (await f.js.getPage(pn)).getTextContent(), rows = [];
    for (const it of tc.items) { if (!it.str.trim()) continue; const y = it.transform[5], r = rows.find(q => Math.abs(q.y - y) < 3); if (r) r.t.push([it.transform[4], it.str]); else rows.push({ y, t: [[it.transform[4], it.str]] }); }
    rows.sort((a, b) => b.y - a.y); lines = rows.map(r => r.t.sort((a, b) => a[0] - b[0]).map(x => x[1]).join(' ').replace(/\s+/g, ' ').trim());
  } catch (e) { /* no text */ }
  lineCache.set(k, lines); return lines;
}
function renCheck() {
  const m = val('rSrc'), pn = Math.floor(+val('rPage'));
  if (!(pn >= 1)) return { err: 'Page number must be 1 or more.' };
  if (m === 'label' && !val('rLabel').trim()) return { err: 'Type the label that comes before the text, for example Invoice No.' };
  if (m === 'regex') { if (!val('rLabel').trim()) return { err: 'Type a pattern, for example INV-\\d+' }; try { new RegExp(val('rLabel')); } catch (e) { return { err: 'That pattern is not valid.' }; } }
  return { ok: 1 };
}
async function proposeName(f) {
  const m = val('rSrc'), pn = Math.min(Math.max(1, Math.floor(+val('rPage')) || 1), f.count), lines = f.js ? await linesOf(f, pn) : [];
  let t = '';
  if (m === 'first') t = lines[0] || '';
  else if (m === 'label') { const lab = val('rLabel').trim().toLowerCase(); for (const ln of lines) { const at = ln.toLowerCase().indexOf(lab); if (at >= 0) { t = ln.slice(at + lab.length).replace(/^[\s:#.\-]+/, '').trim(); break; } } }
  else { const re = new RegExp(val('rLabel')); for (const ln of lines) { const mm = ln.match(re); if (mm) { t = mm[1] || mm[0]; break; } } }
  t = t.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  return t;
}
let renTok = 0;
async function refreshNames() {
  if (!REN) return; const tok = ++renTok; newNames.clear();
  if (renCheck().err) { render(); return; }
  for (const f of files) { const t = await proposeName(f); if (tok !== renTok) return; if (t) newNames.set(f.id, t + ($('#rKeep').checked ? ' - ' + f.name.replace(/\.pdf$/i, '') : '') + '.pdf'); }
  render();
}
async function buildRename() {
  await refreshNames(); const used = new Set(), out = []; let hit = 0;
  for (const f of files) {
    let nm = newNames.get(f.id); if (nm) hit++; else nm = f.name;
    let base = nm.replace(/\.pdf$/i, ''), q = base, n = 1; while (used.has(q.toLowerCase())) q = `${base} (${++n})`; used.add(q.toLowerCase());
    out.push({ name: q + '.pdf', data: f.bytes });
  }
  if (!hit) throw new Error('no text matched, so no file was renamed. Check the page number and the label. Scanned pages have no text: run OCR first');
  return { blob: zip(out), name: cleanName($('#outName').value, 'Dilia-renamed', 'zip'), info: `${hit} of ${plural(files.length, 'file')} renamed${hit < files.length ? ', the rest keep their name' : ''}` };
}

/* ---------- batch ---------- */
const BOPS = ['bNoannot', 'bFlatten', 'bRotate', 'bWatermark', 'bNumber', 'bBates', 'bMeta'];
const bops = () => BOPS.filter(i => $('#' + i).checked);
function batchCheck() {
  const ops = bops(); if (!ops.length) return { hint: 'Tick at least one action.' };
  if (ops.includes('bBates')) { const d = Math.floor(+val('bDig')); if (!(d >= 1 && d <= 12)) return { err: 'Digits must be between 1 and 12.' }; }
  if (ops.includes('bWatermark') && !val('bText').trim()) return { err: 'Type the watermark text.' };
  const t = (ops.includes('bBates') ? val('bPre') + val('bSuf') : '') + (ops.includes('bWatermark') ? val('bText') : ''); if (/[^ -~ -ÿ]/.test(t)) return { err: 'Only English letters, numbers and common symbols work here for now.' };
  return { ok: 1 };
}
function toUserB(b, vx, vy) { return b.r === 0 ? [b.x0 + vx, b.y0 + vy] : b.r === 90 ? [b.x0 + b.W - vy, b.y0 + vx] : b.r === 180 ? [b.x0 + b.W - vx, b.y0 + b.H - vy] : [b.x0 + vy, b.y0 + b.H - vx]; }
async function buildBatch() {
  const L = PDFLib, ops = bops(), out = [], N = L.PDFName.of; let counter = Math.floor(+val('bStart')) || 0, bad = [];
  for (let k = 0; k < files.length; k++) {
    const f = files[k]; prog.style.width = Math.round(8 + 84 * k / files.length) + '%'; await tick();
    try {
      const d = await L.PDFDocument.load(f.bytes, { updateMetadata: false });
      if (ops.includes('bNoannot')) { for (const pg of d.getPages()) { const arr = pg.node.lookupMaybe(N('Annots'), L.PDFArray); if (!arr) continue; const keep = []; for (let i = 0; i < arr.size(); i++) { const a = arr.lookupMaybe(i, L.PDFDict), st = a && a.lookup(N('Subtype')), t = st && st.toString(); if (t === '/Link' || t === '/Widget') keep.push(arr.get(i)); } if (keep.length) pg.node.set(N('Annots'), d.context.obj(keep)); else pg.node.delete(N('Annots')); } }
      if (ops.includes('bFlatten')) { const fm = d.getForm(); if (fm.getFields().length) fm.flatten(); }
      if (ops.includes('bRotate')) { const a = +val('bAng'); d.getPages().forEach(p => p.setRotation(L.degrees((((p.getRotation().angle + a) % 360) + 360) % 360))); }
      if (ops.some(o => ['bWatermark', 'bNumber', 'bBates'].includes(o))) {
        const font = await d.embedFont(L.StandardFonts.Helvetica), pgs = d.getPages(), start = counter;
        pgs.forEach((pg, i) => {
          const c = pg.getCropBox(), r = ((pg.getRotation().angle % 360) + 360) % 360, b = { x0: c.x, y0: c.y, W: c.width, H: c.height, r }, vw = r % 180 ? c.height : c.width, vh = r % 180 ? c.width : c.height;
          if (ops.includes('bWatermark')) {
            const t = val('bText').trim(), size = Math.max(10, Math.min(vw, vh) / (Math.max(1, t.length) * .62)), tw = font.widthOfTextAtSize(t, size), ang = 45 * Math.PI / 180;
            const [ux, uy] = toUserB(b, vw / 2 - Math.cos(ang) * tw / 2 + Math.sin(ang) * size * .35, vh / 2 - Math.sin(ang) * tw / 2 - Math.cos(ang) * size * .35);
            pg.drawText(t, { x: ux, y: uy, size, font, color: L.rgb(.54, .56, .6), opacity: .3, rotate: L.degrees(45 + r) });
          }
          const stamp = (t, right) => { const tw = font.widthOfTextAtSize(t, 10), [ux, uy] = toUserB(b, right ? vw - 28 - tw : (vw - tw) / 2, 28); pg.drawText(t, { x: ux, y: uy, size: 10, font, color: L.rgb(.04, .07, .13), rotate: L.degrees(r) }); };
          if (ops.includes('bNumber')) stamp(`Page ${i + 1} of ${pgs.length}`, false);
          if (ops.includes('bBates')) stamp(val('bPre') + String(start + i).padStart(Math.floor(+val('bDig')), '0') + val('bSuf'), true);
        });
        if (ops.includes('bBates')) counter += pgs.length;
      }
      if (ops.includes('bMeta')) { const info = d.getInfoDict(); info.keys().forEach(x => info.delete(x)); d.catalog.delete(N('Metadata')); }
      else d.setProducer('Dilia Studio');
      out.push({ name: f.name, data: await d.save() });
    } catch (e) { bad.push(f.name); }
  }
  if (!out.length) throw new Error('none of the files could be processed');
  if (bad.length) toast(`${plural(bad.length, 'file')} could not be processed and ${bad.length === 1 ? 'was' : 'were'} left out: ${bad.slice(0, 3).join(', ')}.`, true);
  if (out.length === 1) return { blob: new Blob([out[0].data], { type: 'application/pdf' }), name: out[0].name, info: '1 file processed' };
  return { blob: zip(out), name: cleanName($('#outName').value, 'Dilia-batch', 'zip'), info: plural(out.length, 'file') + ' processed' };
}
const WF_IDS = [...BOPS, 'bAng', 'bPre', 'bSuf', 'bStart', 'bDig', 'bText'];
function syncBatchUi() { if (!BATCH) return; document.querySelectorAll('[data-op]').forEach(e => { e.hidden = !$('#' + e.dataset.op).checked; }); }
if (REN) { document.querySelectorAll('.optbar input, .optbar select').forEach(e => { e.addEventListener('input', refreshNames); e.addEventListener('change', refreshNames); }); }
if (BATCH) {
  BOPS.forEach(i => $('#' + i).addEventListener('change', syncBatchUi)); syncBatchUi();
  $('#wfSave').addEventListener('click', () => { const o = {}; WF_IDS.forEach(i => { const e = $('#' + i); o[i] = e.type === 'checkbox' ? e.checked : e.value; }); const u = URL.createObjectURL(new Blob([JSON.stringify({ dilia: 'workflow', v: 1, settings: o }, null, 2)], { type: 'application/json' })); save(u, 'dilia-workflow.json'); setTimeout(() => URL.revokeObjectURL(u), 4000); });
  $('#wfLoad').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (j.dilia !== 'workflow' || !j.settings) throw 0; WF_IDS.forEach(i => { const el = $('#' + i); if (!el || !(i in j.settings)) return; if (el.type === 'checkbox') el.checked = !!j.settings[i]; else el.value = String(j.settings[i]); }); syncBatchUi(); clearDone(); summary(); toast('Settings loaded.'); }
    catch (err) { toast('That file is not a saved Dilia workflow.', true); }
  });
}

let nameTouched = false;
$('#outName').addEventListener('input', () => { nameTouched = true; });
function summary() {
  const p = files.length ? plan() : { hint: PAIR ? 'Add the main PDF first.' : (REN || BATCH) ? 'Add PDF files to start.' : 'Add at least two PDFs to mix.' };
  showErr(p.err || '');
  if (!nameTouched && files.length && !REN && !BATCH) $('#outName').value = files[0].name.replace(/\.pdf$/i, '') + (CMP ? '-compared' : '');
  $('#s1').textContent = files.length; $('#s2').textContent = p.list ? p.list.length : 0; $('#s3').textContent = kb(files.reduce((a, f) => a + f.size, 0));
  go.disabled = busy || !p.list;
  note.textContent = p.err ? 'Fix the highlighted setting to continue.' : p.hint ? p.hint : CMP ? 'A PDF report lists changed words and marks every difference on the pages.' : (REN || BATCH || OVER) ? `${p.info}. Saved in one ZIP.`.replace(OVER ? /Saved in one ZIP\./ : /^$/, '') : INSERT ? `The new PDF has ${p.info}.` : `Pages are taken in turn: ${p.info}.`;
}
document.querySelectorAll('.optbar input, .optbar select').forEach(e => { e.addEventListener('input', () => { clearDone(); summary(); }); e.addEventListener('change', () => { clearDone(); summary(); }); });
Sortable.create(grid, {
  animation: 200, easing: 'cubic-bezier(.2,.8,.2,1)', ghostClass: 'sort-ghost', chosenClass: 'chosen', dragClass: 'dragging',
  filter: 'button', preventOnFilter: false, delay: 120, delayOnTouchOnly: true,
  onEnd() { const order = [...grid.children].map(e => e.dataset.id); files.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)); clearDone(); render(); }
});
grid.addEventListener('click', e => {
  if (!e.target.closest('[data-rm]')) return;
  const f = files.find(x => x.id === e.target.closest('.page').dataset.id);
  if (f.url) URL.revokeObjectURL(f.url); if (f.js) f.js.destroy(); files.splice(files.indexOf(f), 1); clearDone(); render();
});
if ($('#sortAz')) $('#sortAz').addEventListener('click', () => { files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); clearDone(); render(); });
if ($('#swap')) $('#swap').addEventListener('click', () => { files.reverse(); clearDone(); render(); });

go.addEventListener('click', async () => {
  if (busy || go.disabled) return;
  const p = plan(); if (!p.list) return;
  busy = true; go.disabled = true; ws.classList.add('working'); prog.style.width = '6%';
  try {
    await tick();
    if (REN || BATCH || CMP) {
      const r = CMP ? await buildCompare() : REN ? await buildRename() : await buildBatch();
      prog.style.width = '100%'; if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = URL.createObjectURL(r.blob); save(lastUrl, r.name);
      $('#doneName').textContent = r.name; $('#doneInfo').textContent = `${r.info}, ${kb(r.blob.size)}`; $('#again').href = lastUrl; $('#again').download = r.name; $('#done').hidden = false;
      busy = false; ws.classList.remove('working'); setTimeout(() => { prog.style.width = '0'; }, 600); summary(); return;
    }
    const out = await PDFLib.PDFDocument.create(), cache = new Map();
    if (OVER) {
      const [A, B] = files, L = PDFLib, over = val('oPos') === 'over', each = val('oPages') === 'each';
      const ac = await out.copyPages(A.lib, A.lib.getPages().map((_, i) => i)), bc = await out.copyPages(B.lib, B.lib.getPages().map((_, i) => i));
      const box = pg => { const c = pg.getCropBox(), rot = ((pg.getRotation().angle % 360) + 360) % 360; return { c, rot, vw: rot % 180 ? c.height : c.width, vh: rot % 180 ? c.width : c.height }; };
      const eb = await out.embedPages(bc, B.lib.getPages().map(p => { const c = p.getCropBox(); return { left: c.x, bottom: c.y, right: c.x + c.width, top: c.y + c.height }; }));
      const ea = await out.embedPages(ac, A.lib.getPages().map(p => { const c = p.getCropBox(); return { left: c.x, bottom: c.y, right: c.x + c.width, top: c.y + c.height }; }));
      const at = (pg, e, v, W, H) => { const sc = Math.min(W / v.vw, H / v.vh), x = (W - v.vw * sc) / 2, y = (H - v.vh * sc) / 2, w = v.c.width * sc, h = v.c.height * sc;
        const o = v.rot === 0 ? { x, y, r: 0 } : v.rot === 90 ? { x, y: y + w, r: -90 } : v.rot === 180 ? { x: x + w, y: y + h, r: 180 } : { x: x + h, y, r: 90 };
        pg.drawPage(e, { x: o.x, y: o.y, rotate: L.degrees(o.r), xScale: sc, yScale: sc }); };
      A.lib.getPages().forEach((ap, i) => {
        const va = box(ap), j = each ? Math.min(i, B.count - 1) : 0, vb = box(B.lib.getPage(j)), pg = out.addPage([va.vw, va.vh]);
        if (over) { at(pg, ea[i], va, va.vw, va.vh); at(pg, eb[j], vb, va.vw, va.vh); } else { at(pg, eb[j], vb, va.vw, va.vh); at(pg, ea[i], va, va.vw, va.vh); }
      });
      out.setProducer('Dilia Studio'); out.setCreator('Dilia Studio');
      const blob = new Blob([await out.save()], { type: 'application/pdf' }), name = cleanName($('#outName').value, 'Dilia-letterhead', 'pdf');
      prog.style.width = '100%'; if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = URL.createObjectURL(blob); save(lastUrl, name);
      $('#doneName').textContent = name; $('#doneInfo').textContent = `${p.info}, ${kb(blob.size)}`; $('#again').href = lastUrl; $('#again').download = name; $('#done').hidden = false;
      busy = false; ws.classList.remove('working'); setTimeout(() => { prog.style.width = '0'; }, 600); summary(); return;
    }
    const fresh = new Map();                                 // one copy call per file keeps shared fonts and images single
    for (const f of files) { const idx = [...new Set(p.list.filter(x => x.f === f).map(x => x.i))]; const cp = idx.length ? await out.copyPages(f.lib, idx) : []; fresh.set(f, new Map(idx.map((i, q) => [i, cp[q]]))); }
    for (let k = 0; k < p.list.length; k++) {
      const { f, i } = p.list[k], m = fresh.get(f);
      let pg = m.get(i); if (pg) m.delete(i); else [pg] = await out.copyPages(f.lib, [i]);   // a page used twice gets a second copy
      out.addPage(pg);
      if (k % 20 === 19) { prog.style.width = Math.round(8 + 84 * (k + 1) / p.list.length) + '%'; await tick(); }
    }
    out.setProducer('Dilia Studio'); out.setCreator('Dilia Studio');
    const blob = new Blob([await out.save()], { type: 'application/pdf' }), name = cleanName($('#outName').value, INSERT ? 'Dilia-inserted' : 'Dilia-mixed', 'pdf');
    prog.style.width = '100%';
    if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = URL.createObjectURL(blob); save(lastUrl, name);
    $('#doneName').textContent = name; $('#doneInfo').textContent = `${p.info}, ${kb(blob.size)}`;
    $('#again').href = lastUrl; $('#again').download = name; $('#done').hidden = false;
  } catch (e) { toast('This did not finish: ' + (e.message || 'unknown error') + '.', true); }
  busy = false; ws.classList.remove('working'); setTimeout(() => { prog.style.width = '0'; }, 600); summary();
});
function clearDone() { $('#done').hidden = true; }
$('#reset').addEventListener('click', () => { files.forEach(f => { if (f.url) URL.revokeObjectURL(f.url); if (f.js) f.js.destroy(); }); files.length = 0; clearDone(); render(); scrollTo({ top: 0, behavior: 'smooth' }); });
pick.addEventListener('change', () => { if (pick.files.length) add(pick.files); pick.value = ''; });
Kit.dropAnywhere(add);
render();
window.__dilia = { files, plan };
}
