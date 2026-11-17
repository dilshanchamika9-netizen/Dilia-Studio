/* One engine for the single-PDF page tools: delete, extract, rotate, reorder, split.
   The page sets <body data-tool="..."> and supplies the controls; this file does the rest. */
{
const { $, kb, plural, esc, COLORS, toast, save, cleanName, parseRanges, compress, zip } = Kit;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js';

const MODE = document.body.dataset.tool;
const CFG = {
  delete:  { suffix: '',    fallback: 'Dilia-edited',    l2: 'Deleting',  l3: 'Pages out', verb: 'Delete pages and download' },
  extract: { suffix: '',   fallback: 'Dilia-extract',   l2: 'Selected',  l3: 'Pages out', verb: 'Extract and download' },
  rotate:  { suffix: '',   fallback: 'Dilia-rotated',   l2: 'Rotated',   l3: 'Size in',   verb: 'Save rotated PDF' },
  reorder: { suffix: '', fallback: 'Dilia-reordered', l2: 'Moved',     l3: 'Size in',   verb: 'Save new order' },
  split:   { suffix: '',     fallback: 'Dilia-split',     l2: 'Files out', l3: 'Size in',   verb: 'Split and download' },
  watermark: { suffix: '', fallback: 'Dilia-watermark', l2: 'Marked', l3: 'Size in', verb: 'Add watermark and download' },
  number:  { suffix: '', fallback: 'Dilia-numbered', l2: 'Numbered', l3: 'Size in', verb: 'Add numbers and download' },
  bates:   { suffix: '', fallback: 'Dilia-bates', l2: 'Stamped', l3: 'Size in', verb: 'Add Bates numbers and download' },
  headfoot: { suffix: '', fallback: 'Dilia-header-footer', l2: 'Changed', l3: 'Size in', verb: 'Add header and footer and download' },
  crop:    { suffix: '', fallback: 'Dilia-cropped', l2: 'Cropped', l3: 'Size in', verb: 'Crop and download' },
  text:    { suffix: '', fallback: 'Dilia-text', l2: 'Selected', l3: 'Pages out', verb: 'Save as text' },
  pdf2img: { suffix: '',    fallback: 'Dilia-images',    l2: 'Selected',  l3: 'Images out', verb: 'Save as images' }
}[MODE];
const TOGGLE = ['delete', 'extract', 'pdf2img', 'text'].includes(MODE);
const SELECT = MODE === 'extract' || MODE === 'pdf2img' || MODE === 'text';
const DEFAULT_ALL = MODE === 'pdf2img' || MODE === 'text';
const OVERLAY = ['watermark', 'number', 'bates', 'headfoot', 'crop'].includes(MODE);
const NUMBERED = MODE === 'number' || MODE === 'bates';
const fmt = () => document.querySelector('input[name=fmt]:checked').value;

const ws = $('#ws'), grid = $('#grid'), pick = $('#pick'), go = $('#go'), note = $('#note'), prog = $('#prog');
const rng = $('#rng'), errBox = $('#err'), outName = $('#outName'), ext = $('#ext');
let doc = null, pages = [], busy = false, lastUrl = null, parts = [], partNames = [], cpTok = 0, pageTextCache = [];
const T = Kit.thumbs(idx => Kit.renderThumb(doc.js, idx));
const base = () => doc ? doc.name.replace(/\.pdf$/i, '') : '';
const smode = () => { const r = document.querySelector('input[name=sm]:checked'); return r ? r.value : ''; };
const outExt = () => MODE === 'text' ? 'txt' : MODE === 'pdf2img' ? (pages.filter(p => p.flag).length === 1 ? fmt() : 'zip') : MODE === 'split' && (smode() === 'size' || (smode() !== 'half' && parts.length !== 1)) ? 'zip' : 'pdf';

/* ---------- loading ---------- */
async function load(list) {
  const all = [...list], pdfs = all.filter(Kit.isPdf);
  if (!pdfs.length) { toast('That is not a PDF. Choose a file ending in .pdf.', true); return; }
  if (all.length > 1) toast('Only one PDF at a time here. Using ' + pdfs[0].name + '.');
  ws.classList.add('working');
  const r = await Kit.openPdf(pdfs[0]);
  ws.classList.remove('working');
  if (r.err) { toast(r.err, true); return; }
  if (doc && doc.js) doc.js.destroy();
  T.clear(); doc = r; pageTextCache = [];
  pages = Array.from({ length: doc.count }, (_, i) => ({ i, rot: 0, flag: DEFAULT_ALL }));
  outName.value = base() + CFG.suffix;
  if (rng) rng.value = DEFAULT_ALL ? compress(pages.map(p => p.i)) : '';
  clearDone(); showErr('');
  if (MODE === 'split') computeParts();
  render();
}

/* ---------- drawing ---------- */
const CHK = '<svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ROT_L = '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ROT_R = '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function render() {
  ws.dataset.state = doc ? 'full' : 'empty';
  $('#fname').textContent = doc ? doc.name : '';
  if (!doc) { grid.innerHTML = ''; summary(); return; }
  grid.innerHTML = pages.map((p, n) => {
    const toggle = TOGGLE;
    return `<article class="card page" data-i="${p.i}" ${toggle ? 'tabindex="0" role="button" aria-pressed="false"' : ''} aria-label="Page ${p.i + 1}">
      ${T.img(p.i, p.rot)}
      ${MODE === 'delete' ? '<span class="flag">Delete</span>' : ''}
      ${SELECT ? `<span class="chk">${CHK}</span>` : ''}
      ${MODE === 'split' ? '<span class="part"></span>' : ''}
      <div class="pmeta"><i></i><span>${n + 1}</span><em>${MODE === 'reorder' && p.i !== n ? 'was page ' + (p.i + 1) : 'Page ' + (p.i + 1)}</em></div>
      ${MODE === 'rotate' ? `<div class="tools-row"><button type="button" data-rot="-90" aria-label="Rotate page ${p.i + 1} left">${ROT_L}</button><button type="button" data-rot="90" aria-label="Rotate page ${p.i + 1} right">${ROT_R}</button></div>` : ''}
    </article>`;
  }).join('');
  T.watch(grid);
  if (OVERLAY) grid.querySelectorAll('.pv').forEach(pv => pv.insertAdjacentHTML('beforeend', '<div class="ov"></div>'));
  paint();
}

function cardOf(i) { return grid.querySelector(`.page[data-i="${i}"]`); }

function paint() {
  if (!doc) return;
  if (OVERLAY) overlays();
  const flagged = pages.filter(p => p.flag), rotated = pages.filter(p => p.rot), moved = pages.filter((p, n) => p.i !== n);
  if (TOGGLE) {
    pages.forEach(p => {
      const c = cardOf(p.i); if (!c) return;
      c.classList.toggle(MODE === 'delete' ? 'mark' : 'sel', p.flag);
      c.setAttribute('aria-pressed', p.flag);
    });
  }
  if (MODE === 'split') {
    const owner = new Map();
    parts.forEach((list, k) => list.forEach(i => { if (!owner.has(i)) owner.set(i, k); }));
    pages.forEach(p => {
      const c = cardOf(p.i); if (!c) return;
      const k = owner.get(p.i);
      c.classList.toggle('skip', k === undefined);
      c.style.setProperty('--c', k === undefined ? '#9aa1ad' : COLORS[k % COLORS.length]);
      c.querySelector('.part').textContent = k === undefined ? 'Left out' : 'File ' + (k + 1);
    });
  }
  if (MODE === 'rotate') pages.forEach(p => { const c = cardOf(p.i); if (c) c.querySelector('img').style.setProperty('--r', p.rot + 'deg'); });
  if (MODE === 'reorder') pages.forEach((p, n) => { const c = cardOf(p.i); if (c) c.classList.toggle('moved', p.i !== n); });
  summary(flagged, rotated, moved);
}

function summary(flagged = [], rotated = [], moved = []) {
  $('#l2').textContent = CFG.l2; $('#l3').textContent = CFG.l3;
  $('#s1').textContent = doc ? pages.length : 0;
  let ok = false, msg = 'Add a PDF to start.';
  if (doc) {
    const size = kb(doc.size);
    if (MODE === 'delete') {
      $('#s2').textContent = flagged.length; $('#s3').textContent = pages.length - flagged.length;
      ok = flagged.length > 0 && flagged.length < pages.length;
      msg = flagged.length === pages.length ? 'That would delete every page. Keep at least one.' : !flagged.length ? 'Click the pages you want to delete.' : `${plural(flagged.length, 'page')} will be removed. ${plural(pages.length - flagged.length, 'page')} stay.`;
    } else if (MODE === 'extract') {
      $('#s2').textContent = flagged.length; $('#s3').textContent = flagged.length;
      ok = flagged.length > 0;
      msg = ok ? `${plural(flagged.length, 'page')} go into the new PDF, in their original order.` : 'Click the pages you want to keep.';
    } else if (OVERLAY) {
      $('#s2').textContent = pages.length; $('#s3').textContent = size;
      const v = overlayCheck(); showErr(v.err || ''); ok = !v.err && v.ok;
      msg = v.err ? 'Fix the highlighted setting to continue.' : !v.ok ? v.hint : `All ${plural(pages.length, 'page')} will be changed. The preview on each page shows the result.`;
    } else if (MODE === 'text') {
      $('#s2').textContent = flagged.length; $('#s3').textContent = flagged.length;
      ok = flagged.length > 0;
      msg = ok ? `Text from ${plural(flagged.length, 'page')} goes into one .txt file.` : 'Click the pages you want text from.';
    } else if (MODE === 'pdf2img') {
      $('#s2').textContent = flagged.length; $('#s3').textContent = flagged.length;
      ok = flagged.length > 0;
      msg = !ok ? 'Click the pages you want as images.' : flagged.length === 1 ? 'One page, saved as one image.' : `${plural(flagged.length, 'image')} will be saved together in one ZIP.`;
    } else if (MODE === 'rotate') {
      $('#s2').textContent = rotated.length; $('#s3').textContent = size;
      ok = rotated.length > 0;
      msg = ok ? `${plural(rotated.length, 'page')} will be turned.` : 'Hover a page and use the arrows to turn it.';
    } else if (MODE === 'reorder') {
      $('#s2').textContent = moved.length; $('#s3').textContent = size;
      ok = moved.length > 0;
      msg = ok ? 'Pages will be saved in the order shown.' : 'Drag pages to a new position.';
    } else {
      const sm = smode();
      $('#s2').textContent = sm === 'half' ? pages.length * 2 : sm === 'size' ? '?' : parts.length; $('#s3').textContent = size;
      ok = parts.length > 0;
      msg = !ok ? 'Choose how to split the PDF.'
        : sm === 'half' ? `Each page is cut in two: ${plural(pages.length * 2, 'page')} in one PDF.`
        : sm === 'size' ? 'The number of files is worked out when you save.'
        : parts.length === 1 ? 'One file will be saved as a PDF.' : `${plural(parts.length, 'file')} will be saved together in one ZIP.`;
    }
  } else { $('#s2').textContent = 0; $('#s3').textContent = 0; }
  if (ext) ext.textContent = '.' + outExt();
  go.disabled = busy || !ok;
  note.textContent = msg;
}

/* ---------- selecting pages by text and by click (delete, extract) ---------- */
function showErr(m) { if (errBox) { errBox.textContent = m; errBox.hidden = !m; } }
function flagsFromText() {
  if (!doc) return;
  const r = parseRanges(rng.value, doc.count);
  if (r.err) { showErr(r.err); return; }
  showErr('');
  const on = new Set(); r.entries.forEach(([a, b]) => { for (let k = a; k <= b; k++) on.add(k - 1); });
  pages.forEach(p => p.flag = on.has(p.i));
  clearDone(); paint();
}
function syncText() { if (rng) { rng.value = compress(pages.filter(p => p.flag).map(p => p.i)); showErr(''); } }

/* ---------- split rules ---------- */
const slug = t => (t || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60);
async function pageText(i) {
  if (pageTextCache[i] === undefined) {
    const pg = await doc.js.getPage(i + 1), tc = await pg.getTextContent();
    pageTextCache[i] = tc.items.map(t => t.str).join(' ').toLowerCase();
  }
  return pageTextCache[i];
}
async function bookmarkStarts() {
  const out = await doc.js.getOutline();
  if (!out || !out.length) return null;
  const starts = [];
  for (const it of out) {
    try {
      let d = it.dest; if (typeof d === 'string') d = await doc.js.getDestination(d);
      if (!d) continue;
      const idx = typeof d[0] === 'object' && d[0] !== null ? await doc.js.getPageIndex(d[0]) : d[0];
      if (Number.isInteger(idx) && idx >= 0 && idx < doc.count) starts.push({ i: idx, title: it.title });
    } catch (e) { /* bookmark points nowhere: skip it */ }
  }
  return starts.length ? starts : null;
}
function fromStarts(starts) {                           // [{i,title}] sorted by page -> parts
  const u = []; for (const s0 of starts) if (!u.length || u[u.length - 1].i !== s0.i) u.push(s0);
  if (u[0].i > 0) u.unshift({ i: 0, title: 'Start' });
  u.forEach((s0, k) => {
    const end = k + 1 < u.length ? u[k + 1].i : doc.count;
    parts.push(Array.from({ length: end - s0.i }, (_, q) => s0.i + q)); partNames.push(slug(s0.title));
  });
}
async function computeParts() {
  if (MODE !== 'split' || !doc) return;
  const tok = ++cpTok, mode = smode(), all = pages.map(p => p.i);
  showErr(''); parts = []; partNames = [];
  if (mode === 'every') parts = all.map(i => [i]);
  else if (mode === 'n') {
    const n = Math.floor(+$('#nIn').value);
    if (!(n >= 1)) showErr('Enter a number of pages, 1 or more.');
    else for (let i = 0; i < all.length; i += n) parts.push(all.slice(i, i + n));
  } else if (mode === 'oddeven') {
    parts = [all.filter(i => i % 2 === 0), all.filter(i => i % 2 === 1)].filter(l => l.length);
    partNames = parts.length === 2 ? ['odd pages', 'even pages'] : ['odd pages'];
  } else if (mode === 'half') parts = [all];
  else if (mode === 'size') { if (!(+$('#szIn').value > 0)) showErr('Enter a size in MB, more than 0.'); else parts = [all]; }
  else if (mode === 'bookmarks') {
    const st = await bookmarkStarts(); if (tok !== cpTok) return;
    if (!st) showErr('This PDF has no bookmarks to split by.'); else fromStarts(st.sort((x, y) => x.i - y.i));
  } else if (mode === 'text') {
    const q = $('#tIn').value.trim().toLowerCase();
    if (!q) showErr('Type the text that starts each new file.');
    else {
      ws.classList.add('working'); const hits = [];
      for (let i = 0; i < doc.count; i++) { if ((await pageText(i)).includes(q)) hits.push({ i, title: '' }); if (tok !== cpTok) { ws.classList.remove('working'); return; } }
      ws.classList.remove('working');
      if (!hits.length) showErr('No page contains that text. Scanned pages have no text to search: run OCR first.');
      else { fromStarts(hits); partNames = partNames.map(() => ''); }
    }
  } else {
    const r = parseRanges(rng.value, doc.count);
    if (r.err) showErr(r.err);
    else parts = r.entries.map(([a, b]) => Array.from({ length: b - a + 1 }, (_, k) => a - 1 + k));
  }
  if (tok !== cpTok) return;
  document.querySelectorAll('[data-for]').forEach(e => e.classList.toggle('dim', e.dataset.for !== mode));
  clearDone(); paint();
}

/* ---------- actions in the toolbar ---------- */
document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
  if (!doc) return;
  const a = b.dataset.act;
  if (a === 'odd' || a === 'even') pages.forEach(p => p.flag = (a === 'odd') === (p.i % 2 === 0));
  else if (a === 'all') pages.forEach(p => p.flag = true);
  else if (a === 'none') pages.forEach(p => p.flag = false);
  else if (a === 'left' || a === 'right') pages.forEach(p => p.rot = (p.rot + (a === 'left' ? -90 : 90) + 360) % 360);
  else if (a === 'reset') { pages.forEach(p => p.rot = 0); if (MODE === 'reorder') pages.sort((x, y) => x.i - y.i); }
  else if (a === 'reverse') pages.reverse();
  if (TOGGLE) syncText();
  clearDone();
  if (MODE === 'reorder') render(); else paint();
}));

grid.addEventListener('click', e => {
  const card = e.target.closest('.page'); if (!card) return;
  const p = pages.find(x => x.i === +card.dataset.i), r = e.target.closest('[data-rot]');
  if (MODE === 'rotate' && r) { p.rot = (p.rot + +r.dataset.rot + 360) % 360; clearDone(); paint(); }
  else if (TOGGLE) { p.flag = !p.flag; syncText(); clearDone(); paint(); }
});
grid.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && TOGGLE && e.target.classList.contains('page')) { e.preventDefault(); e.target.click(); }
});

if (MODE === 'reorder') Sortable.create(grid, {
  animation: 200, easing: 'cubic-bezier(.2,.8,.2,1)', ghostClass: 'sort-ghost', chosenClass: 'chosen', dragClass: 'dragging',
  delay: 120, delayOnTouchOnly: true,
  onEnd() {
    const order = [...grid.children].map(e => +e.dataset.i);
    pages.sort((a, b) => order.indexOf(a.i) - order.indexOf(b.i));
    clearDone(); render();
  }
});

document.querySelectorAll('input[name=fmt]').forEach(r => r.addEventListener('change', () => paint()));
if (rng) rng.addEventListener('input', () => MODE === 'split' ? (document.querySelector('input[value=ranges]').checked = true, computeParts()) : flagsFromText());
if (MODE === 'split') {
  document.querySelectorAll('input[name=sm]').forEach(r => r.addEventListener('change', computeParts));
  $('#nIn').addEventListener('input', () => { document.querySelector('input[value=n]').checked = true; computeParts(); });
  const wire = (id, val_) => $('#' + id).addEventListener(id === 'hdir' ? 'change' : 'input', () => { document.querySelector(`input[value=${val_}]`).checked = true; computeParts(); });
  wire('szIn', 'size'); wire('tIn', 'text'); wire('hdir', 'half');
}


/* ---------- watermark, page numbers, crop: shared layout for preview and output ---------- */
const val = id => { const e = $('#' + id); return e ? e.value : ''; };
const num = id => parseFloat(val(id));
let sfont = null;
PDFLib.PDFDocument.create().then(d => d.embedFont(PDFLib.StandardFonts.Helvetica)).then(f => { sfont = f; if (OVERLAY && doc) paint(); });
const textW = (t, size) => sfont ? sfont.widthOfTextAtSize(t, size) : t.length * size * 0.55;
const fontOK = t => { try { if (sfont) sfont.widthOfTextAtSize(t, 10); return true; } catch (e) { return false; } };
const hexRgb = h => PDFLib.rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const pageBox = i => { const pg = doc.lib.getPage(i), b = pg.getCropBox(), r = ((pg.getRotation().angle % 360) + 360) % 360; return { pg, x0: b.x, y0: b.y, W: b.width, H: b.height, r, vw: r % 180 ? b.height : b.width, vh: r % 180 ? b.width : b.height }; };
const toUser = (b, vx, vy) => b.r === 0 ? [b.x0 + vx, b.y0 + vy] : b.r === 90 ? [b.x0 + b.W - vy, b.y0 + vx] : b.r === 180 ? [b.x0 + b.W - vx, b.y0 + b.H - vy] : [b.x0 + vy, b.y0 + b.H - vx];
const NFMT = { n: (n, N) => `${n}`, page: (n, N) => `Page ${n}`, of: (n, N) => `${n} / ${N}`, pageof: (n, N) => `Page ${n} of ${N}` };

function wmSpec() {
  const text = val('wmText').trim(), size = num('wmSize'), op = num('wmOp') / 100;
  const colour = document.querySelector('input[name=wc]:checked').value, ang = +val('wmAng'), tiled = document.querySelector('input[name=wl]:checked').value === 'tiled';
  const kind = (document.querySelector('input[name=wk]:checked') || { value: 'text' }).value;
  return { kind, text, size, op, colour, ang, tiled, img: wmImg, iw: num('wmIW') };
}
let wmImg = null;                                       // { url, w, h, bytes, type } for an image watermark
function imgDims(sp, vw) { const w = sp.iw / 100 * vw; return { w, h: w * sp.img.h / sp.img.w }; }
async function pickWmImage(f) {
  if (!f) return;
  if (!/^image\/(png|jpeg)$/.test(f.type)) { toast('Use a PNG or JPG image for the watermark.', true); return; }
  const bytes = new Uint8Array(await f.arrayBuffer()), url = URL.createObjectURL(f);
  const im = new Image(); im.onload = () => { if (wmImg) URL.revokeObjectURL(wmImg.url); wmImg = { url, w: im.naturalWidth, h: im.naturalHeight, bytes, type: f.type, name: f.name }; $('#wmImgName').textContent = f.name; clearDone(); paint(); };
  im.onerror = () => toast('That image could not be read.', true); im.src = url;
}
function wmPlaces(sp, vw, vh) {                       // [{cx,cy}] in visual page points
  if (!sp.tiled) return [{ cx: vw / 2, cy: vh / 2 }];
  const im = sp.kind === 'image' && sp.img ? imgDims(sp, vw) : null;
  const tw = im ? im.w : textW(sp.text, sp.size), sx = tw * 1.5 + (im ? 0 : sp.size), sy = im ? im.h * 1.6 : sp.size * 3.2, out = [];
  let row = 0;
  for (let cy = sy / 2; cy < vh + sy; cy += sy, row++)
    for (let cx = (row % 2 ? sx / 2 : 0); cx < vw + sx; cx += sx) { out.push({ cx, cy }); if (out.length > 400) return out; }
  return out;
}
function numSpec() {
  if (MODE === 'bates') return { pos: val('nPos'), start: Math.floor(num('nStart')), size: num('nSize'), pre: val('bPre'), suf: val('bSuf'), dig: Math.floor(num('bDig')), skip: false };
  return { pos: val('nPos'), fmt: val('nFmt'), start: Math.floor(num('nStart')), size: num('nSize'), skip: $('#nSkip').checked };
}
function numText(sp, k) {
  if (MODE === 'bates') return sp.pre + String(sp.start + k).padStart(sp.dig, '0') + sp.suf;
  const n = sp.start + k - (sp.skip ? 1 : 0), N = sp.start + pages.length - (sp.skip ? 1 : 0) - 1; return NFMT[sp.fmt](n, N);
}
const HF_ZONES = ['hL', 'hC', 'hR', 'fL', 'fC', 'fR'];
function hfSpec() { const z = {}; HF_ZONES.forEach(k => z[k] = val(k)); return { z, size: num('hSize') }; }
function hfText(t, n) { return t.replace(/\{page\}/gi, n + 1).replace(/\{pages\}/gi, pages.length).replace(/\{file\}/gi, base()).replace(/\{date\}/gi, new Date().toISOString().slice(0, 10)); }
function hfPlace(k, text, size, vw, vh) {              // baseline-left point in visual page points
  const tw = textW(text, size), m = 28, c = k[1];
  return { x: c === 'L' ? m : c === 'R' ? vw - m - tw : (vw - tw) / 2, y: k[0] === 'f' ? m : vh - m - size * 0.72 };
}
function numPlace(sp, text, vw, vh) {                 // baseline-left point in visual page points
  const tw = textW(text, sp.size), m = 28, [v, h] = sp.pos.split('-');
  return { x: h === 'left' ? m : h === 'right' ? vw - m - tw : (vw - tw) / 2, y: v === 'bottom' ? m : vh - m - sp.size * 0.72 };
}
function cropSpec() { return { t: num('cT') || 0, r: num('cR') || 0, b: num('cB') || 0, l: num('cL') || 0 }; }

function overlayCheck() {
  if (MODE === 'watermark') {
    const sp = wmSpec();
    if (sp.kind === 'image') {
      if (!sp.img) return { hint: 'Choose a PNG or JPG image for the watermark.' };
      if (!(sp.iw >= 5 && sp.iw <= 100)) return { err: 'Image width must be between 5 and 100 percent of the page.' };
      return { ok: true };
    }
    if (!sp.text) return { hint: 'Type the watermark text.' };
    if (!fontOK(sp.text)) return { err: 'Only English letters, numbers and common symbols work in this text for now.' };
    if (!(sp.size >= 8 && sp.size <= 240)) return { err: 'Text size must be between 8 and 240.' };
    return { ok: true };
  }
  if (MODE === 'headfoot') {
    const sp = hfSpec(), all = HF_ZONES.map(k => hfText(sp.z[k], 0));
    if (!HF_ZONES.some(k => sp.z[k].trim())) return { hint: 'Type text in at least one of the six boxes.' };
    if (all.some(t => !fontOK(t))) return { err: 'Only English letters, numbers and common symbols work in these boxes for now.' };
    if (!(sp.size >= 6 && sp.size <= 48)) return { err: 'Text size must be between 6 and 48.' };
    return { ok: true };
  }
  if (NUMBERED) {
    const sp = numSpec();
    if (MODE === 'bates') {
      if (!(sp.dig >= 1 && sp.dig <= 12)) return { err: 'Digits must be between 1 and 12.' };
      if (!fontOK(sp.pre + sp.suf)) return { err: 'Only English letters, numbers and common symbols work in the prefix and suffix for now.' };
      if (String(sp.start + pages.length - 1).length > sp.dig) return { err: `The last number needs more than ${sp.dig} digits. Raise the digits.` };
    }
    if (!(sp.start >= 0 && sp.start <= 99999999)) return { err: 'Start number must be 0 or more.' };
    if (!(sp.size >= 6 && sp.size <= 48)) return { err: 'Text size must be between 6 and 48.' };
    return { ok: true };
  }
  const c = cropSpec();
  if ([c.t, c.r, c.b, c.l].some(v => !(v >= 0 && v <= 45))) return { err: 'Each margin must be between 0 and 45 percent.' };
  if (!(c.t + c.r + c.b + c.l > 0)) return { hint: 'Set how much to cut from at least one side.' };
  return { ok: true };
}

function overlays() {
  const chk = overlayCheck(), live = chk.ok;
  const sp = MODE === 'watermark' ? wmSpec() : MODE === 'headfoot' ? hfSpec() : NUMBERED ? numSpec() : cropSpec();
  pages.forEach((p, n) => {
    const card = cardOf(p.i); if (!card) return;
    const pv = card.querySelector('.pv'), ov = card.querySelector('.ov'); if (!pv || !ov) return;
    const b = pageBox(p.i), S = pv.clientWidth, sc = Math.min(.92 * S / b.vw, .92 * S / b.vh), dw = b.vw * sc, dh = b.vh * sc;
    Object.assign(ov.style, { left: (S - dw) / 2 + 'px', top: (pv.clientHeight - dh) / 2 + 'px', width: dw + 'px', height: dh + 'px' });
    if (!live) { ov.innerHTML = ''; return; }
    if (MODE === 'watermark' && sp.kind === 'image') {
      const d = imgDims(sp, b.vw);
      ov.innerHTML = wmPlaces(sp, b.vw, b.vh).map(q => `<img alt="" src="${sp.img.url}" style="position:absolute;left:${q.cx * sc}px;top:${(b.vh - q.cy) * sc}px;width:${d.w * sc}px;opacity:${sp.op};transform:translate(-50%,-50%) rotate(${-sp.ang}deg)">`).join('');
    } else if (MODE === 'watermark') {
      ov.innerHTML = wmPlaces(sp, b.vw, b.vh).map(q => `<span style="left:${q.cx * sc}px;top:${(b.vh - q.cy) * sc}px;font-size:${sp.size * sc}px;color:${sp.colour};opacity:${sp.op};transform:translate(-50%,-50%) rotate(${-sp.ang}deg)">${esc(sp.text)}</span>`).join('');
    } else if (MODE === 'headfoot') {
      ov.innerHTML = HF_ZONES.filter(k => sp.z[k].trim()).map(k => { const t = hfText(sp.z[k], n), q = hfPlace(k, t, sp.size, b.vw, b.vh); return `<span style="left:${q.x * sc}px;top:${(b.vh - q.y) * sc}px;font-size:${sp.size * sc}px;color:#0b1220;transform:translateY(-82%)">${esc(t)}</span>`; }).join('');
    } else if (NUMBERED) {
      if (sp.skip && n === 0) { ov.innerHTML = ''; return; }
      const t = numText(sp, n), q = numPlace(sp, t, b.vw, b.vh);
      ov.innerHTML = `<span style="left:${q.x * sc}px;top:${(b.vh - q.y) * sc}px;font-size:${sp.size * sc}px;color:#0b1220;transform:translateY(-82%)">${esc(t)}</span>`;
    } else {
      ov.innerHTML = `<i class="cb" style="left:${sp.l}%;right:${sp.r}%;top:${sp.t}%;bottom:${sp.b}%"></i>`;
    }
  });
}
if ($('#wmImgFile')) $('#wmImgFile').addEventListener('change', e => { pickWmImage(e.target.files[0]); e.target.value = ''; });
document.querySelectorAll('.optbar input, .optbar select').forEach(e => {
  if (!OVERLAY) return;
  e.addEventListener('input', () => { clearDone(); paint(); });
  e.addEventListener('change', () => { clearDone(); paint(); });
});
if (OVERLAY) addEventListener('resize', () => doc && overlays());

async function toText() {
  if (!doc.js) throw new Error('the preview engine could not open this file');
  const sel = pages.filter(p => p.flag).map(p => p.i), marks = $('#tSep') && $('#tSep').checked, chunks = [];
  for (let k = 0; k < sel.length; k++) {
    const tc = await (await doc.js.getPage(sel[k] + 1)).getTextContent();
    let out = '', lastY = null;
    for (const it of tc.items) {
      if (it.str === undefined) continue;
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > Math.max(2, (it.height || 8) * 0.5) && !out.endsWith('\n')) out += '\n';
      out += it.str; if (it.hasEOL) out += '\n'; lastY = y;
    }
    chunks.push((marks ? `--- Page ${sel[k] + 1} ---\n` : '') + out.trim());
    prog.style.width = Math.round(8 + 84 * (k + 1) / sel.length) + '%'; await tick();
  }
  const text = chunks.join('\n\n');
  if (!text.replace(/[\s\-Page\d]/g, '').length) throw new Error('no text found. This looks like a scanned PDF. Text recognition (OCR) is a later tool');
  const blob = new Blob([text + '\n'], { type: 'text/plain;charset=utf-8' });
  return { blob, name: cleanName(outName.value, CFG.fallback, 'txt'), info: `${plural(sel.length, 'page')}, ${text.length.toLocaleString('en-US')} characters` };
}
async function stamp() {
  const out = await PDFLib.PDFDocument.load(doc.bytes, { updateMetadata: false });
  const font = await out.embedFont(PDFLib.StandardFonts.Helvetica);
  const sp = MODE === 'watermark' ? wmSpec() : MODE === 'headfoot' ? hfSpec() : NUMBERED ? numSpec() : cropSpec();
  const crop = MODE === 'crop';
  const wimg = MODE === 'watermark' && sp.kind === 'image' ? await (sp.img.type === 'image/png' ? out.embedPng(sp.img.bytes) : out.embedJpg(sp.img.bytes)) : null;
  pages.forEach((p, n) => {
    const pg = out.getPage(p.i), cb = pg.getCropBox(), r = ((pg.getRotation().angle % 360) + 360) % 360;
    const b = { x0: cb.x, y0: cb.y, W: cb.width, H: cb.height, r, vw: r % 180 ? cb.height : cb.width, vh: r % 180 ? cb.width : cb.height };
    if (crop) {
      const vt = sp.t / 100 * b.vh, vr = sp.r / 100 * b.vw, vb = sp.b / 100 * b.vh, vl = sp.l / 100 * b.vw;
      const [uL, uT, uR, uB] = r === 0 ? [vl, vt, vr, vb] : r === 90 ? [vt, vr, vb, vl] : r === 180 ? [vr, vb, vl, vt] : [vb, vl, vt, vr];
      const box = [b.x0 + uL, b.y0 + uB, b.W - uL - uR, b.H - uT - uB];
      pg.setCropBox(...box); pg.setMediaBox(...box);
    } else if (wimg) {
      const ang = sp.ang + r, th = ang * Math.PI / 180, d = imgDims(sp, b.vw);
      for (const q of wmPlaces(sp, b.vw, b.vh)) {
        const [cx, cy] = toUser(b, q.cx, q.cy);
        pg.drawImage(wimg, { x: cx - d.w / 2 * Math.cos(th) + d.h / 2 * Math.sin(th), y: cy - d.w / 2 * Math.sin(th) - d.h / 2 * Math.cos(th), width: d.w, height: d.h, opacity: sp.op, rotate: PDFLib.degrees(ang) });
      }
    } else if (MODE === 'headfoot') {
      for (const k of HF_ZONES) {
        if (!sp.z[k].trim()) continue;
        const t = hfText(sp.z[k], n), q = hfPlace(k, t, sp.size, b.vw, b.vh), [ux, uy] = toUser(b, q.x, q.y);
        pg.drawText(t, { x: ux, y: uy, size: sp.size, font, color: PDFLib.rgb(.04, .07, .13), rotate: PDFLib.degrees(r) });
      }
    } else if (MODE === 'watermark') {
      const ang = sp.ang + r, th = ang * Math.PI / 180, lw = font.widthOfTextAtSize(sp.text, sp.size), lh = sp.size * 0.3;
      for (const q of wmPlaces(sp, b.vw, b.vh)) {
        const [cx, cy] = toUser(b, q.cx, q.cy);
        pg.drawText(sp.text, { x: cx - lw / 2 * Math.cos(th) + lh * Math.sin(th), y: cy - lw / 2 * Math.sin(th) - lh * Math.cos(th), size: sp.size, font, color: hexRgb(sp.colour), opacity: sp.op, rotate: PDFLib.degrees(ang) });
      }
    } else {
      if (sp.skip && n === 0) return;
      const t = numText(sp, n), q = numPlace(sp, t, b.vw, b.vh), [ux, uy] = toUser(b, q.x, q.y);
      pg.drawText(t, { x: ux, y: uy, size: sp.size, font, color: PDFLib.rgb(.04, .07, .13), rotate: PDFLib.degrees(r) });
    }
  });
  out.setProducer('Dilia Studio');
  return { blob: new Blob([await out.save()], { type: 'application/pdf' }), name: cleanName(outName.value, CFG.fallback, 'pdf'), info: plural(pages.length, 'page') };
}

/* ---------- building the result ---------- */
const tick = () => new Promise(r => setTimeout(r, 0));
async function halfSplit() {
  const out = await PDFLib.PDFDocument.create(), dir = $('#hdir').value;
  for (let n = 0; n < pages.length; n++) {
    const i = pages[n].i, b = pageBox(i), vertical = dir === 'lr' || (dir === 'auto' && b.vw >= b.vh);
    for (let k = 0; k < 2; k++) {
      const [pg] = await out.copyPages(doc.lib, [i]);
      const [vx0, vy0, vx1, vy1] = vertical ? [k * b.vw / 2, 0, (k + 1) * b.vw / 2, b.vh] : [0, (1 - k) * b.vh / 2, b.vw, (2 - k) * b.vh / 2];
      const p1 = toUser(b, vx0, vy0), p2 = toUser(b, vx1, vy1);
      const box = [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1]), Math.abs(p2[0] - p1[0]), Math.abs(p2[1] - p1[1])];
      pg.setCropBox(...box); pg.setMediaBox(...box); out.addPage(pg);
    }
    prog.style.width = Math.round(8 + 84 * (n + 1) / pages.length) + '%'; if (n % 4 === 3) await tick();
  }
  out.setProducer('Dilia Studio'); out.setCreator('Dilia Studio');
  return { blob: new Blob([await out.save()], { type: 'application/pdf' }), name: cleanName(outName.value, CFG.fallback, 'pdf'), info: plural(pages.length * 2, 'page') };
}
async function sizeSplit() {
  const limit = +$('#szIn').value * 1048576, N = pages.length, files = [], range = (a, b) => Array.from({ length: b - a + 1 }, (_, q) => pages[a + q].i);
  let s0 = 0, oversize = 0;
  const trial = async (a, b) => { const o = await subset(range(a, b)); return await o.save(); };
  while (s0 < N) {
    let best = await trial(s0, s0), e = s0;
    if (best.length > limit) oversize++;
    else {
      let step = 1, lo = s0, hiFail = N;                   // grow, then binary search the last page that still fits
      while (lo + step < N) { const t = await trial(s0, lo + step); if (t.length <= limit) { best = t; lo += step; step *= 2; } else { hiFail = lo + step; break; } }
      let l = lo, h = Math.min(hiFail, N);
      while (h - l > 1) { const m = (l + h) >> 1, t = await trial(s0, m); if (t.length <= limit) { best = t; l = m; } else h = m; }
      e = l;
    }
    files.push({ pages: e - s0 + 1, data: best }); s0 = e + 1;
    prog.style.width = Math.round(8 + 84 * s0 / N) + '%'; await tick();
  }
  const pad = String(files.length).length, named = files.map((f, k) => ({ name: `${base()}-part-${String(k + 1).padStart(pad, '0')}.pdf`, data: f.data }));
  const extra = oversize ? ` ${plural(oversize, 'page')} alone ${oversize === 1 ? 'is' : 'are'} bigger than the limit.` : '';
  if (named.length === 1) return { blob: new Blob([named[0].data], { type: 'application/pdf' }), name: cleanName(outName.value, CFG.fallback, 'pdf'), info: 'Already within the limit.' + extra };
  return { blob: zip(named), name: cleanName(outName.value, CFG.fallback, 'zip'), info: `${plural(named.length, 'PDF')} in one ZIP.` + extra };
}
async function subset(idxs) {
  const out = await PDFLib.PDFDocument.create();
  const copied = await out.copyPages(doc.lib, idxs);
  copied.forEach(pg => out.addPage(pg));
  out.setProducer('Dilia Studio'); out.setCreator('Dilia Studio');
  return out;
}
async function toImages() {
  if (!doc.js) throw new Error('the preview engine could not open this file');
  const sel = pages.filter(p => p.flag).map(p => p.i), type = fmt(), dpi = +$('#dpi').value;
  const pad = String(doc.count).length, files = [];
  for (let k = 0; k < sel.length; k++) {
    const page = await doc.js.getPage(sel[k] + 1), v1 = page.getViewport({ scale: 1 });
    let scale = dpi / 72;
    scale = Math.min(scale, 9000 / Math.max(v1.width, v1.height), Math.sqrt(80e6 / (v1.width * v1.height)));
    const vp = page.getViewport({ scale }), c = document.createElement('canvas');
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const blob = await new Promise(r => c.toBlob(r, type === 'png' ? 'image/png' : 'image/jpeg', .92));
    c.width = c.height = 0;
    if (!blob) throw new Error('page ' + (sel[k] + 1) + ' is too large to turn into an image');
    files.push({ name: `${base()}-page-${String(sel[k] + 1).padStart(pad, '0')}.${type}`, data: new Uint8Array(await blob.arrayBuffer()) });
    prog.style.width = Math.round(8 + 84 * (k + 1) / sel.length) + '%'; await tick();
  }
  if (files.length === 1) return { blob: new Blob([files[0].data], { type: type === 'png' ? 'image/png' : 'image/jpeg' }), name: cleanName(outName.value, CFG.fallback, type), info: '1 image' };
  return { blob: zip(files), name: cleanName(outName.value, CFG.fallback, 'zip'), info: `${plural(files.length, 'image')} in one ZIP` };
}
async function build() {
  if (OVERLAY) return stamp();
  if (MODE === 'text') return toText();
  if (MODE === 'rotate') {
    const out = await PDFLib.PDFDocument.load(doc.bytes, { updateMetadata: false });
    pages.forEach(p => {
      if (!p.rot) return;
      const pg = out.getPage(p.i), a = ((pg.getRotation().angle % 360) + 360) % 360;
      pg.setRotation(PDFLib.degrees((a + p.rot) % 360));
    });
    out.setProducer('Dilia Studio');
    return { blob: new Blob([await out.save()], { type: 'application/pdf' }), name: cleanName(outName.value, CFG.fallback, 'pdf'), info: `${plural(pages.length, 'page')}` };
  }
  if (MODE === 'split') {
    const sm = smode();
    if (sm === 'half') return halfSplit();
    if (sm === 'size') return sizeSplit();
    const files = [], pad = String(parts.length).length;
    for (let k = 0; k < parts.length; k++) {
      const out = await subset(parts[k]), nm = partNames[k], no = String(k + 1).padStart(pad, '0');
      files.push({ name: sm === 'oddeven' ? `${base()}-${nm.replace(' ', '-')}.pdf` : nm ? `${base()}-${no}-${nm}.pdf` : `${base()}-part-${no}.pdf`, data: await out.save() });
      prog.style.width = Math.round(8 + 84 * (k + 1) / parts.length) + '%'; await tick();
    }
    if (files.length === 1) return { blob: new Blob([files[0].data], { type: 'application/pdf' }), name: cleanName(outName.value, CFG.fallback, 'pdf'), info: plural(parts[0].length, 'page') };
    return { blob: zip(files), name: cleanName(outName.value, CFG.fallback, 'zip'), info: `${plural(files.length, 'PDF')} in one ZIP` };
  }
  if (MODE === 'pdf2img') return toImages();
  const idxs = MODE === 'delete' ? pages.filter(p => !p.flag).map(p => p.i)
    : MODE === 'extract' ? pages.filter(p => p.flag).map(p => p.i)
    : pages.map(p => p.i);
  const out = await subset(idxs);
  return { blob: new Blob([await out.save()], { type: 'application/pdf' }), name: cleanName(outName.value, CFG.fallback, 'pdf'), info: plural(idxs.length, 'page') };
}

go.addEventListener('click', async () => {
  if (busy || go.disabled) return;
  busy = true; go.disabled = true; ws.classList.add('working'); prog.style.width = '6%';
  try {
    await tick();
    const r = await build();
    prog.style.width = '100%';
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(r.blob);
    save(lastUrl, r.name);
    $('#doneName').textContent = r.name;
    $('#doneInfo').textContent = `${r.info}, ${kb(r.blob.size)}`;
    $('#again').href = lastUrl; $('#again').download = r.name;
    $('#done').hidden = false;
  } catch (e) {
    toast('This did not finish: ' + (e.message || 'unknown error') + '.', true);
  }
  busy = false; ws.classList.remove('working');
  setTimeout(() => { prog.style.width = '0'; }, 600);
  summary(pages.filter(p => p.flag), pages.filter(p => p.rot), pages.filter((p, n) => p.i !== n));
});

function clearDone() { $('#done').hidden = true; }
$('#reset').addEventListener('click', () => {
  if (doc && doc.js) doc.js.destroy();
  doc = null; pages = []; parts = []; T.clear(); clearDone(); showErr('');
  if (rng) rng.value = '';
  render(); scrollTo({ top: 0, behavior: 'smooth' });
});

pick.addEventListener('change', () => { if (pick.files.length) load(pick.files); pick.value = ''; });
Kit.dropAnywhere(load);

go.querySelector('.go-l').textContent = CFG.verb;
render();
window.__dilia = { get doc() { return doc; }, get pages() { return pages; }, get parts() { return parts; } };
}
