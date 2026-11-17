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
  flip:    { suffix: '', fallback: 'Dilia-flipped', l2: 'Flipped', l3: 'Size in', verb: 'Flip and download' },
  nup:     { suffix: '', fallback: 'Dilia-n-up', l2: 'Sheets out', l3: 'Size in', verb: 'Make sheets and download' },
  meta:    { suffix: '', fallback: 'Dilia-properties', l2: 'Fields set', l3: 'Size in', verb: 'Save properties and download' },
  flatten: { suffix: '', fallback: 'Dilia-flattened', l2: 'Flattened', l3: 'Size in', verb: 'Flatten and download' },
  extractimg: { suffix: '', fallback: 'Dilia-embedded-images', l2: 'Pages', l3: 'Size in', verb: 'Extract images' },
  bookmarks: { suffix: '', fallback: 'Dilia-bookmarked', l2: 'Bookmarks', l3: 'Size in', verb: 'Add bookmarks and download' },
  resize:  { suffix: '', fallback: 'Dilia-resized', l2: 'Pages out', l3: 'Size in', verb: 'Resize and download' },
  noannot: { suffix: '', fallback: 'Dilia-clean', l2: 'Pages', l3: 'Size in', verb: 'Remove and download' },
  booklet: { suffix: '', fallback: 'Dilia-booklet', l2: 'Sheet sides', l3: 'Size in', verb: 'Make booklet and download' },
  poster:  { suffix: '', fallback: 'Dilia-poster', l2: 'Sheets out', l3: 'Size in', verb: 'Make poster and download' },
  cleaner: { suffix: '', fallback: 'Dilia-cleaned', l2: 'Items removed', l3: 'Size in', verb: 'Clean and download' },
  grayscale: { suffix: '', fallback: 'Dilia-grayscale', l2: 'Pages', l3: 'Size in', verb: 'Make grayscale and download' },
  deskew:  { suffix: '', fallback: 'Dilia-straight', l2: 'Pages', l3: 'Size in', verb: 'Straighten and download' },
  crop:    { suffix: '', fallback: 'Dilia-cropped', l2: 'Cropped', l3: 'Size in', verb: 'Crop and download' },
  text:    { suffix: '', fallback: 'Dilia-text', l2: 'Selected', l3: 'Pages out', verb: 'Save as text' },
  pdf2img: { suffix: '',    fallback: 'Dilia-images',    l2: 'Selected',  l3: 'Images out', verb: 'Save as images' }
}[MODE];
const TOGGLE = ['delete', 'extract', 'pdf2img', 'text'].includes(MODE);
const SELECT = MODE === 'extract' || MODE === 'pdf2img' || MODE === 'text';
const DEFAULT_ALL = MODE === 'pdf2img' || MODE === 'text';
const OVERLAY = ['watermark', 'number', 'bates', 'headfoot', 'crop'].includes(MODE);
const WHOLE = ['flip', 'nup', 'meta', 'flatten', 'extractimg', 'bookmarks', 'resize', 'noannot', 'booklet', 'poster', 'cleaner', 'grayscale', 'deskew'].includes(MODE);
const NUMBERED = MODE === 'number' || MODE === 'bates';
const fmt = () => document.querySelector('input[name=fmt]:checked').value;

const ws = $('#ws'), grid = $('#grid'), pick = $('#pick'), go = $('#go'), note = $('#note'), prog = $('#prog');
const rng = $('#rng'), errBox = $('#err'), outName = $('#outName'), ext = $('#ext');
let doc = null, pages = [], busy = false, lastUrl = null, parts = [], partNames = [], cpTok = 0, pageTextCache = [];
const T = Kit.thumbs(idx => Kit.renderThumb(doc.js, idx));
const base = () => doc ? doc.name.replace(/\.pdf$/i, '') : '';
const smode = () => { const r = document.querySelector('input[name=sm]:checked'); return r ? r.value : ''; };
const fx = t => t === 'tiff' ? 'tif' : t;
const outExt = () => MODE === 'extractimg' ? 'zip' : MODE === 'text' ? 'txt' : MODE === 'pdf2img' ? (pages.filter(p => p.flag).length === 1 ? fx(fmt()) : 'zip') : MODE === 'split' && (smode() === 'size' || (smode() !== 'half' && parts.length !== 1)) ? 'zip' : 'pdf';

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
  if (MODE === 'meta') metaFill();
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
    } else if (WHOLE) {
      const v = wholeCheck(); $('#s2').textContent = v.s2 ?? pages.length; $('#s3').textContent = size;
      showErr(v.err || ''); ok = !v.err && v.ok; msg = v.err ? 'Fix the highlighted setting to continue.' : v.msg;
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
document.querySelectorAll('.optbar input, .optbar select, .optbar textarea').forEach(e => {
  if (!OVERLAY && !WHOLE) return;
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
function tiffBlob(c, dpi) {                             // plain uncompressed RGB TIFF, opens in every image program
  const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data, n = w * h * 3, ifdAt = 8 + n + (n & 1);
  const buf = new ArrayBuffer(ifdAt + 2 + 12 * 12 + 4 + 6 + 16), dv = new DataView(buf), u8 = new Uint8Array(buf);
  dv.setUint16(0, 0x4949, true); dv.setUint16(2, 42, true); dv.setUint32(4, ifdAt, true);
  for (let i = 0, o = 8; i < w * h; i++, o += 3) { u8[o] = src[i * 4]; u8[o + 1] = src[i * 4 + 1]; u8[o + 2] = src[i * 4 + 2]; }
  const extra = ifdAt + 2 + 12 * 12 + 4, ent = [[256, 4, w], [257, 4, h], [258, 3, 3, extra], [259, 3, 1], [262, 3, 2], [273, 4, 8], [277, 3, 3], [278, 4, h], [279, 4, n], [282, 5, 1, extra + 6], [283, 5, 1, extra + 14], [296, 3, 2]];
  let p = ifdAt; dv.setUint16(p, ent.length, true); p += 2;
  for (const e of ent) { dv.setUint16(p, e[0], true); dv.setUint16(p + 2, e[1], true); dv.setUint32(p + 4, e[1] === 3 && e.length === 3 ? 1 : e[1] === 5 ? 1 : (e[0] === 258 ? 3 : 1), true);
    if (e[0] === 258) dv.setUint32(p + 8, e[3], true); else if (e[1] === 5) dv.setUint32(p + 8, e[3], true); else if (e[1] === 3) dv.setUint16(p + 8, e[2], true); else dv.setUint32(p + 8, e[2], true); p += 12; }
  dv.setUint32(p, 0, true);
  [8, 8, 8].forEach((v, i) => dv.setUint16(extra + i * 2, v, true));
  dv.setUint32(extra + 6, dpi, true); dv.setUint32(extra + 10, 1, true); dv.setUint32(extra + 14, dpi, true); dv.setUint32(extra + 18, 1, true);
  return new Blob([buf], { type: 'image/tiff' });
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
    const blob = type === 'tiff' ? tiffBlob(c, Math.round(c.width / v1.width * 72)) : await new Promise(r => c.toBlob(r, type === 'png' ? 'image/png' : 'image/jpeg', .92));
    c.width = c.height = 0;
    if (!blob) throw new Error('page ' + (sel[k] + 1) + ' is too large to turn into an image');
    files.push({ name: `${base()}-page-${String(sel[k] + 1).padStart(pad, '0')}.${fx(type)}`, data: new Uint8Array(await blob.arrayBuffer()) });
    prog.style.width = Math.round(8 + 84 * (k + 1) / sel.length) + '%'; await tick();
  }
  if (files.length === 1) return { blob: new Blob([files[0].data], { type: type === 'png' ? 'image/png' : type === 'tiff' ? 'image/tiff' : 'image/jpeg' }), name: cleanName(outName.value, CFG.fallback, fx(type)), info: '1 image' };
  return { blob: zip(files), name: cleanName(outName.value, CFG.fallback, 'zip'), info: `${plural(files.length, 'image')} in one ZIP` };
}
async function build() {
  if (OVERLAY) return stamp();
  if (WHOLE) return whole();
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


/* ---------- whole-file tools: flip, n-up, properties, flatten, extract images, bookmarks ---------- */
const radio = n => { const r = document.querySelector(`input[name=${n}]:checked`); return r ? r.value : ''; };
const SHEETS = { a4: [595.28, 841.89], letter: [612, 792], a3: [841.89, 1190.55] };
const GRID = { 2: [2, 1], 4: [2, 2], 6: [3, 2], 8: [4, 2], 9: [3, 3], 16: [4, 4] };
function parseBm(txt) {                                 // "Title | page", leading dashes = deeper level
  const out = [], lines = txt.split(/\r?\n/);
  for (let k = 0; k < lines.length; k++) {
    if (!lines[k].trim()) continue;
    const m = lines[k].match(/^(\s*-*)\s*(.*?)\s*\|\s*(\d+)\s*$/);
    if (!m || !m[2]) return { err: `Line ${k + 1} needs the form  Title | page  (for example  Chapter 1 | 3).` };
    const pg = +m[3], lv = m[1].replace(/\s/g, '').length;
    if (pg < 1 || pg > doc.count) return { err: `Line ${k + 1}: page ${pg} does not exist. This PDF has ${doc.count} pages.` };
    if (lv > (out.length ? out[out.length - 1].lv + 1 : 0)) return { err: `Line ${k + 1}: a sub-bookmark must come right after its parent (one dash deeper at most).` };
    out.push({ title: m[2], page: pg - 1, lv });
  }
  return { items: out };
}
function wholeCheck() {
  if (MODE === 'flip') return { ok: true, msg: 'Every page you choose is mirrored. Links and notes on flipped pages are not kept.' };
  if (MODE === 'nup') {
    const n = +val('uN'), sheets = Math.ceil(pages.length / n);
    return { ok: true, s2: sheets, msg: `${plural(pages.length, 'page')} become ${plural(sheets, 'sheet')}.` };
  }
  if (MODE === 'resize') return { ok: true, msg: `Every page is scaled to fit ${val('rSize').toUpperCase()} and centred. Proportions are kept.` };
  if (MODE === 'cleaner') { const n = ['cJs', 'cAtt', 'cMeta', 'cThumb', 'cMarks'].filter(i => $('#' + i).checked).length; return n ? { ok: true, s2: n, msg: 'Pages and visible content stay the same.' } : { ok: false, s2: 0, msg: 'Tick at least one thing to remove.' }; }
  if (MODE === 'grayscale') return { ok: true, msg: 'Every page becomes a grey picture. Text can no longer be selected: run OCR afterwards if you need it.' };
  if (MODE === 'deskew') return { ok: true, msg: 'Pages that lean more than a fraction of a degree are straightened. Straight pages are copied unchanged.' };
  if (MODE === 'noannot') return { ok: true, msg: 'Comments, highlights, stamps and drawn notes are deleted. Page text stays.' };
  if (MODE === 'booklet') { const n = Math.ceil(pages.length / 4) * 4; return { ok: true, s2: n / 2, msg: `${plural(n / 2, 'sheet side')} to print double-sided, folded in half.${n > pages.length ? ` ${n - pages.length} blank page${n - pages.length > 1 ? 's are' : ' is'} added at the end.` : ''}` }; }
  if (MODE === 'poster') {
    const c = Math.floor(num('pC')), r = Math.floor(num('pR')), o = num('pOv');
    if (!(c >= 1 && c <= 8 && r >= 1 && r <= 8)) return { err: 'Columns and rows must be between 1 and 8.' };
    if (!(o >= 0 && o <= 40)) return { err: 'Overlap must be between 0 and 40 mm.' };
    return { ok: true, s2: c * r * pages.length, msg: `Each page is enlarged across ${c} x ${r} sheets (${plural(c * r * pages.length, 'sheet')} in all). Overlap lets you glue the sheets together.` };
  }
  if (MODE === 'meta') return { ok: true, s2: ['mT', 'mA', 'mS', 'mK', 'mC', 'mP'].filter(i => val(i).trim()).length, msg: $('#mClear').checked ? 'All properties will be removed.' : 'The properties above are saved into the file. Nothing else changes.' };
  if (MODE === 'flatten') return { ok: true, msg: radio('fl') === 'all' ? 'Every page becomes a picture, so nothing can be edited or selected.' : 'Form fields become fixed text. Page text and links stay.' };
  if (MODE === 'extractimg') {
    const mn = num('eMin');
    if (!(mn >= 0 && mn <= 5000)) return { err: 'Smallest size must be between 0 and 5000 pixels.' };
    return { ok: true, msg: 'Pictures stored inside the PDF are saved in one ZIP. Pages drawn as vector art have none.' };
  }
  if (MODE === 'bookmarks') {
    const r = parseBm(val('bmText'));
    if (r.err) return { err: r.err };
    if (!r.items.length) return { ok: false, s2: 0, msg: 'Type one bookmark per line, or use the buttons above.' };
    return { ok: true, s2: r.items.length, msg: `${plural(r.items.length, 'bookmark')} replace any bookmarks already in the file.` };
  }
  return { ok: true, msg: '' };
}
function metaFill() {
  const l = doc.lib;
  $('#mT').value = l.getTitle() || ''; $('#mA').value = l.getAuthor() || ''; $('#mS').value = l.getSubject() || '';
  $('#mK').value = l.getKeywords() || ''; $('#mC').value = l.getCreator() || ''; $('#mP').value = l.getProducer() || '';
  $('#mClear').checked = false;
}
async function whole() {
  const fin = async (out, info) => { if (!out.getProducer || MODE !== 'meta') out.setProducer('Dilia Studio'); return { blob: new Blob([await out.save()], { type: 'application/pdf' }), name: cleanName(outName.value, CFG.fallback, 'pdf'), info }; };
  const L = PDFLib;
  if (MODE === 'flip') {
    const d = radio('fd'), which = val('fPages'), out = await L.PDFDocument.create(), src = doc.lib.getPages();
    const copied = await out.copyPages(doc.lib, src.map((_, i) => i));
    const hit = i => which === 'all' || (which === 'odd' ? i % 2 === 0 : i % 2 === 1);
    const todo = src.map((_, i) => i).filter(hit);
    const boxes = todo.map(i => { const c = src[i].getCropBox(); return { left: c.x, bottom: c.y, right: c.x + c.width, top: c.y + c.height }; });
    const emb = await out.embedPages(todo.map(i => copied[i]), boxes);
    for (let i = 0; i < src.length; i++) {
      if (!hit(i)) { out.addPage(copied[i]); continue; }
      const c = src[i].getCropBox(), rot = ((src[i].getRotation().angle % 360) + 360) % 360, e = emb[todo.indexOf(i)];
      const pg = out.addPage([c.width, c.height]); if (rot) pg.setRotation(L.degrees(rot));
      let fx = d === 'h' || d === 'both', fy = d === 'v' || d === 'both';
      if (rot % 180) [fx, fy] = [fy, fx];
      pg.drawPage(e, { x: fx ? c.width : 0, y: fy ? c.height : 0, xScale: fx ? -1 : 1, yScale: fy ? -1 : 1 });
      prog.style.width = Math.round(8 + 84 * (i + 1) / src.length) + '%'; if (i % 10 === 9) await tick();
    }
    return fin(out, plural(src.length, 'page'));
  }
  if (MODE === 'nup') {
    const N = +val('uN'), [a, b] = GRID[N], src = doc.lib.getPages(), out = await L.PDFDocument.create();
    const copied = await out.copyPages(doc.lib, src.map((_, i) => i));
    const boxes = src.map(p => { const c = p.getCropBox(); return { left: c.x, bottom: c.y, right: c.x + c.width, top: c.y + c.height }; });
    const emb = await out.embedPages(copied, boxes);
    const first = src[0], fr = ((first.getRotation().angle % 360) + 360) % 360, fc = first.getCropBox();
    const firstLand = (fr % 180 ? fc.height > fc.width : fc.width > fc.height);
    let ori = val('uOri'); if (ori === 'auto') ori = a > b && !firstLand ? 'landscape' : a > b ? 'portrait' : 'portrait';
    const cols = ori === 'landscape' ? a : b, rows = ori === 'landscape' ? b : a;
    let [SW, SH] = SHEETS[val('uSize')]; if (ori === 'landscape' && SW < SH || ori === 'portrait' && SW > SH) [SW, SH] = [SH, SW];
    const m = num('uMar') || 0, g = num('uGap') || 0, border = $('#uBorder').checked, down = val('uOrder') === 'down';
    const cw = (SW - 2 * m - (cols - 1) * g) / cols, ch = (SH - 2 * m - (rows - 1) * g) / rows, per = cols * rows;
    let sheet = null;
    for (let k = 0; k < src.length; k++) {
      if (k % per === 0) sheet = out.addPage([SW, SH]);
      const q = k % per, col = down ? Math.floor(q / rows) : q % cols, row = down ? q % rows : Math.floor(q / cols);
      const c = src[k].getCropBox(), rot = ((src[k].getRotation().angle % 360) + 360) % 360, sw = rot % 180 ? c.height : c.width, sh = rot % 180 ? c.width : c.height;
      const sc = Math.min(cw / sw, ch / sh), vw = sw * sc, vh = sh * sc;
      const ox = m + col * (cw + g) + (cw - vw) / 2, oy = SH - m - (row + 1) * ch - row * g + (ch - vh) / 2;
      const w = c.width * sc, h = c.height * sc;
      const o = rot === 0 ? { x: ox, y: oy, rotate: L.degrees(0) } : rot === 90 ? { x: ox, y: oy + w, rotate: L.degrees(-90) }
        : rot === 180 ? { x: ox + w, y: oy + h, rotate: L.degrees(180) } : { x: ox + h, y: oy, rotate: L.degrees(90) };
      sheet.drawPage(emb[k], { ...o, xScale: sc, yScale: sc });
      if (border) sheet.drawRectangle({ x: ox, y: oy, width: vw, height: vh, borderColor: L.rgb(.55, .58, .62), borderWidth: .6 });
      if (k % 10 === 9) { prog.style.width = Math.round(8 + 84 * (k + 1) / src.length) + '%'; await tick(); }
    }
    return fin(out, plural(out.getPageCount(), 'sheet'));
  }
  if (MODE === 'meta') {
    const out = await L.PDFDocument.load(doc.bytes, { updateMetadata: false }), info = out.getInfoDict(), N = L.PDFName.of;
    out.catalog.delete(N('Metadata'));
    if ($('#mClear').checked) { info.keys().forEach(k => info.delete(k)); }
    else {
      const set = (k, v, fn) => v.trim() ? fn(v.trim()) : info.delete(N(k));
      set('Title', val('mT'), v => out.setTitle(v)); set('Author', val('mA'), v => out.setAuthor(v)); set('Subject', val('mS'), v => out.setSubject(v));
      set('Keywords', val('mK'), v => out.setKeywords([v])); set('Creator', val('mC'), v => out.setCreator(v)); set('Producer', val('mP'), v => out.setProducer(v));
      out.setModificationDate(new Date());
    }
    return fin(out, $('#mClear').checked ? 'Properties removed' : 'Properties saved');
  }
  if (MODE === 'flatten') {
    if (radio('fl') === 'forms') {
      const out = await L.PDFDocument.load(doc.bytes, { updateMetadata: false }), form = out.getForm(), n = form.getFields().length;
      if (!n) throw new Error('this PDF has no form fields. Choose "Everything" to flatten notes and marks too');
      form.flatten();
      return fin(out, plural(n, 'field') + ' flattened');
    }
    if (!doc.js) throw new Error('the preview engine could not open this file');
    const dpi = +val('flDpi'), out = await L.PDFDocument.create();
    for (let i = 0; i < doc.count; i++) {
      const page = await doc.js.getPage(i + 1), v1 = page.getViewport({ scale: 1 });
      const scale = Math.min(dpi / 72, 9000 / Math.max(v1.width, v1.height), Math.sqrt(80e6 / (v1.width * v1.height))), vp = page.getViewport({ scale });
      const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp, annotationMode: pdfjsLib.AnnotationMode ? pdfjsLib.AnnotationMode.ENABLE_STORAGE : 1 }).promise;
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); c.width = c.height = 0;
      const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer())), pg = out.addPage([v1.width, v1.height]);
      pg.drawImage(img, { x: 0, y: 0, width: v1.width, height: v1.height });
      prog.style.width = Math.round(8 + 84 * (i + 1) / doc.count) + '%'; await tick();
    }
    return fin(out, plural(doc.count, 'page') + ' flattened to pictures');
  }
  if (MODE === 'extractimg') return exImgs();
  if (['resize', 'booklet', 'poster'].includes(MODE)) return layout(fin);
  if (MODE === 'grayscale' || MODE === 'deskew') return rasterTools(fin);
  if (MODE === 'cleaner') {
    const out = await L.PDFDocument.load(doc.bytes, { updateMetadata: false }), N = L.PDFName.of, cat = out.catalog; let n = 0;
    const del = (d, k) => { if (d && d.has(N(k))) { d.delete(N(k)); n++; } };
    const names = () => cat.lookupMaybe(N('Names'), L.PDFDict);
    if ($('#cJs').checked) { del(names(), 'JavaScript'); del(cat, 'OpenAction'); del(cat, 'AA'); }
    if ($('#cAtt').checked) { del(names(), 'EmbeddedFiles'); del(cat, 'AF'); }
    if ($('#cMeta').checked) { const info = out.getInfoDict(); const ks = info.keys(); ks.forEach(k => info.delete(k)); n += ks.length; del(cat, 'Metadata'); del(cat, 'PieceInfo'); }
    if ($('#cMarks').checked) { del(cat, 'Outlines'); }
    for (const pg of out.getPages()) {
      if ($('#cJs').checked) del(pg.node, 'AA');
      if ($('#cThumb').checked) del(pg.node, 'Thumb');
      const arr = pg.node.lookupMaybe(N('Annots'), L.PDFArray); if (!arr) continue; const keep = []; let chg = false;
      for (let i = 0; i < arr.size(); i++) {
        const a = arr.lookupMaybe(i, L.PDFDict); if (!a) { keep.push(arr.get(i)); continue; }
        const st = a.lookup(N('Subtype')), t = st && st.toString();
        if ($('#cAtt').checked && t === '/FileAttachment') { n++; chg = true; continue; }
        if ($('#cJs').checked) { const act = a.lookupMaybe(N('A'), L.PDFDict), s = act && act.lookup(N('S')); if (s && s.toString() === '/JavaScript') { a.delete(N('A')); n++; } if (a.has(N('AA'))) { a.delete(N('AA')); n++; } }
        keep.push(arr.get(i));
      }
      if (chg) pg.node.set(N('Annots'), out.context.obj(keep));
    }
    if (!n) throw new Error('nothing of the chosen kinds was found in this PDF');
    return fin(out, plural(n, 'item') + ' removed');
  }
  if (MODE === 'noannot') {
    const out = await L.PDFDocument.load(doc.bytes, { updateMetadata: false }), N = L.PDFName.of, keepL = $('#nLinks').checked, keepF = $('#nForms').checked;
    let gone = 0;
    for (const pg of out.getPages()) {
      const arr = pg.node.lookupMaybe(N('Annots'), L.PDFArray); if (!arr) continue;
      const keep = [];
      for (let i = 0; i < arr.size(); i++) {
        const a = arr.lookupMaybe(i, L.PDFDict), st = a && a.lookup(N('Subtype')), t = st && st.toString();
        if ((t === '/Link' && keepL) || (t === '/Widget' && keepF)) keep.push(arr.get(i)); else gone++;
      }
      if (keep.length) pg.node.set(N('Annots'), out.context.obj(keep)); else pg.node.delete(N('Annots'));
    }
    if (!keepF) out.catalog.delete(N('AcroForm'));
    if (!gone) throw new Error('this PDF has no notes or marks to remove with these settings');
    return fin(out, plural(gone, 'item') + ' removed');
  }
  if (MODE === 'bookmarks') {
    const items = parseBm(val('bmText')).items, out = await L.PDFDocument.load(doc.bytes, { updateMetadata: false }), ctx = out.context, N = L.PDFName.of;
    const tree = []; const stack = [];
    items.forEach(it => { const node = { ...it, kids: [] }; if (it.lv === 0) tree.push(node); else stack[it.lv - 1].kids.push(node); stack[it.lv] = node; stack.length = it.lv + 1; });
    const total = ns => ns.reduce((t, n) => t + 1 + total(n.kids), 0);
    const build = (nodes, parent) => {
      const refs = nodes.map(() => ctx.nextRef());
      nodes.forEach((n, k) => {
        const d = ctx.obj({ Title: L.PDFHexString.fromText(n.title), Parent: parent, Dest: [out.getPage(n.page).ref, N('Fit')] });
        if (k > 0) d.set(N('Prev'), refs[k - 1]); if (k < nodes.length - 1) d.set(N('Next'), refs[k + 1]);
        if (n.kids.length) { const r = build(n.kids, refs[k]); d.set(N('First'), r[0]); d.set(N('Last'), r[r.length - 1]); d.set(N('Count'), ctx.obj(total(n.kids))); }
        ctx.assign(refs[k], d);
      });
      return refs;
    };
    const root = ctx.nextRef(), top = build(tree, root);
    ctx.assign(root, ctx.obj({ Type: 'Outlines', First: top[0], Last: top[top.length - 1], Count: total(tree) }));
    out.catalog.set(N('Outlines'), root); out.catalog.set(N('PageMode'), N('UseOutlines'));
    return fin(out, plural(items.length, 'bookmark'));
  }
}
const PAPER = { a4: [595.28, 841.89], a5: [419.53, 595.28], a3: [841.89, 1190.55], letter: [612, 792], legal: [612, 1008] };
function drawAt(pg, e, c, rot, x, y, sc) {             // x,y = bottom-left of the visual box
  const w = c.width * sc, h = c.height * sc, d = PDFLib.degrees;
  const o = rot === 0 ? { x, y, r: 0 } : rot === 90 ? { x, y: y + w, r: -90 } : rot === 180 ? { x: x + w, y: y + h, r: 180 } : { x: x + h, y, r: 90 };
  pg.drawPage(e, { x: o.x, y: o.y, rotate: d(o.r), xScale: sc, yScale: sc });
}
async function layout(fin) {
  const L = PDFLib, src = doc.lib.getPages(), out = await L.PDFDocument.create();
  const copied = await out.copyPages(doc.lib, src.map((_, i) => i));
  const emb = await out.embedPages(copied, src.map(p => { const c = p.getCropBox(); return { left: c.x, bottom: c.y, right: c.x + c.width, top: c.y + c.height }; }));
  const inf = src.map(p => { const c = p.getCropBox(), rot = ((p.getRotation().angle % 360) + 360) % 360; return { c, rot, vw: rot % 180 ? c.height : c.width, vh: rot % 180 ? c.width : c.height }; });
  const tickMaybe = async k => { if (k % 8 === 7) { prog.style.width = Math.round(8 + 84 * (k + 1) / src.length) + '%'; await tick(); } };
  if (MODE === 'resize') {
    const [pw, ph] = PAPER[val('rSize')];
    for (let k = 0; k < src.length; k++) {
      const v = inf[k], land = v.vw > v.vh, W = land ? ph : pw, H = land ? pw : ph, sc = Math.min(W / v.vw, H / v.vh);
      const pg = out.addPage([W, H]); drawAt(pg, emb[k], v.c, v.rot, (W - v.vw * sc) / 2, (H - v.vh * sc) / 2, sc); await tickMaybe(k);
    }
    return fin(out, plural(src.length, 'page'));
  }
  if (MODE === 'booklet') {
    const n = Math.ceil(src.length / 4) * 4; let [SW, SH] = PAPER[val('bSize')]; if (SW < SH) [SW, SH] = [SH, SW];
    const rtl = val('bDir') === 'rtl', cw = SW / 2, m = 14, seq = [];
    for (let k = 0; k < n / 4; k++) { seq.push([n - 1 - 2 * k, 2 * k], [2 * k + 1, n - 2 - 2 * k]); }
    seq.forEach(([a, b]) => {
      const pg = out.addPage([SW, SH]); [rtl ? b : a, rtl ? a : b].forEach((i, side) => {
        if (i >= src.length) return; const v = inf[i], sc = Math.min((cw - 2 * m) / v.vw, (SH - 2 * m) / v.vh);
        drawAt(pg, emb[i], v.c, v.rot, side * cw + (cw - v.vw * sc) / 2, (SH - v.vh * sc) / 2, sc);
      });
    });
    return fin(out, plural(seq.length, 'sheet side'));
  }
  const cols = Math.floor(num('pC')), rows = Math.floor(num('pR')), ov = num('pOv') * 72 / 25.4, [pw, ph] = PAPER[val('pSize')]; let n = 0;
  for (let k = 0; k < src.length; k++) {
    const v = inf[k], land = v.vw > v.vh, SW = land ? ph : pw, SH = land ? pw : ph, GW = cols * SW - (cols - 1) * ov, GH = rows * SH - (rows - 1) * ov;
    const sc = Math.min(GW / v.vw, GH / v.vh), gx = (GW - v.vw * sc) / 2, gt = (GH - v.vh * sc) / 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const pg = out.addPage([SW, SH]), left = c * (SW - ov), top = r * (SH - ov);
      drawAt(pg, emb[k], v.c, v.rot, gx - left, SH - (gt + v.vh * sc - top), sc); n++;
      pg.drawRectangle({ x: 0, y: 0, width: SW, height: SH, borderColor: L.rgb(.8, .8, .8), borderWidth: .4 });
    }
    await tickMaybe(k);
  }
  return fin(out, plural(n, 'sheet'));
}
async function renderGray(page, dpi, gray) {
  const v1 = page.getViewport({ scale: 1 }), scale = Math.min(dpi / 72, 9000 / Math.max(v1.width, v1.height), Math.sqrt(60e6 / (v1.width * v1.height))), vp = page.getViewport({ scale });
  const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp, annotationMode: pdfjsLib.AnnotationMode ? pdfjsLib.AnnotationMode.ENABLE_STORAGE : 1 }).promise;
  if (gray) { const d = ctx.getImageData(0, 0, c.width, c.height), p = d.data; for (let i = 0; i < p.length; i += 4) p[i] = p[i + 1] = p[i + 2] = (p[i] * 299 + p[i + 1] * 587 + p[i + 2] * 114) / 1000; ctx.putImageData(d, 0, 0); }
  return { c, ctx, v1 };
}
function skewAngle(c) {                                 // degrees to rotate the page by (counter-clockwise positive); 0 if unclear
  const W = 500, k = Math.min(1, W / c.width), sw = Math.max(1, Math.round(c.width * k)), sh = Math.max(1, Math.round(c.height * k));
  const t = document.createElement('canvas'); t.width = sw; t.height = sh; const tx = t.getContext('2d', { willReadFrequently: true }); tx.fillStyle = '#fff'; tx.fillRect(0, 0, sw, sh); tx.drawImage(c, 0, 0, sw, sh);
  const px = tx.getImageData(0, 0, sw, sh).data, g = new Uint8Array(sw * sh), hist = new Uint32Array(256);
  for (let i = 0; i < sw * sh; i++) { g[i] = px[i * 4]; hist[g[i]]++; }
  let lo = 0, hi = 255, acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > sw * sh * .005) { lo = v; break; } } acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > sw * sh * .3) { hi = v; break; } }
  const thr = lo + (hi - lo) * .5, xs = [], ys = [];
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (g[y * sw + x] < thr) { xs.push(x); ys.push(y); }
  if (xs.length < 200 || xs.length > sw * sh * .5) return 0;
  const bins = new Float64Array(sw + sh + 4), score = a => { const r = a * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r); bins.fill(0); const off = sw + 2; for (let i = 0; i < xs.length; i++) bins[Math.round(ys[i] * cs + xs[i] * sn) + off | 0]++; let s = 0; for (let i = 0; i < bins.length; i++) s += bins[i] * bins[i]; return s; };
  let best = 0, bs = -1; for (let a = -10; a <= 10; a += .5) { const s = score(a); if (s > bs) { bs = s; best = a; } }
  const b0 = best; for (let a = b0 - .5; a <= b0 + .5; a += .05) { const s = score(a); if (s > bs) { bs = s; best = a; } }
  const s0 = score(0); if (bs < s0 * 1.03) return 0;      // no clear text lines
  return best;
}
async function rasterTools(fin) {
  const L = PDFLib; if (!doc.js) throw new Error('the preview engine could not open this file');
  const out = await L.PDFDocument.create(), dpi = +val('rDpi') || 150; let fixed = 0; const src = doc.lib.getPages();
  for (let i = 0; i < doc.count; i++) {
    const page = await doc.js.getPage(i + 1);
    if (MODE === 'deskew') {
      const probe = await renderGray(page, 72, true), a = skewAngle(probe.c); probe.c.width = probe.c.height = 0;
      if (Math.abs(a) < .15) { const [cp] = await out.copyPages(doc.lib, [i]); out.addPage(cp); prog.style.width = Math.round(8 + 84 * (i + 1) / doc.count) + '%'; await tick(); continue; }
      const r = await renderGray(page, dpi, false), o = document.createElement('canvas'); o.width = r.c.width; o.height = r.c.height;
      const ox = o.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, o.width, o.height); ox.translate(o.width / 2, o.height / 2); ox.rotate(a * Math.PI / 180); ox.drawImage(r.c, -r.c.width / 2, -r.c.height / 2);
      const blob = await new Promise(rs => o.toBlob(rs, 'image/jpeg', .9)); r.c.width = r.c.height = o.width = o.height = 0;
      const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer())), pg = out.addPage([r.v1.width, r.v1.height]); pg.drawImage(img, { x: 0, y: 0, width: r.v1.width, height: r.v1.height }); fixed++;
    } else {
      const r = await renderGray(page, dpi, true), blob = await new Promise(rs => r.c.toBlob(rs, 'image/jpeg', .85)); r.c.width = r.c.height = 0;
      const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer())), pg = out.addPage([r.v1.width, r.v1.height]); pg.drawImage(img, { x: 0, y: 0, width: r.v1.width, height: r.v1.height });
    }
    prog.style.width = Math.round(8 + 84 * (i + 1) / doc.count) + '%'; await tick();
  }
  if (MODE === 'deskew' && !fixed) throw new Error('no page needed straightening, or the lines of text were not clear enough to measure');
  return fin(out, MODE === 'deskew' ? `${plural(fixed, 'page')} straightened` : plural(doc.count, 'page') + ' in grey');
}
async function exImgs() {
  const L = PDFLib, N = L.PDFName.of, mn = num('eMin') || 0, files = [], pad = 3;
  let skipped = 0, tiny = 0;
  const nm = o => o && o.toString();
  const filt = d => { const f = d.lookup(N('Filter')); if (!f) return []; return f instanceof L.PDFArray ? f.asArray().map(x => nm(d.context.lookup(x))) : [nm(f)]; };
  const comps = d => {                                  // -> {n, pal}
    let cs = d.lookup(N('ColorSpace'));
    if (cs instanceof L.PDFName) return cs.toString() === '/DeviceRGB' ? { n: 3 } : cs.toString() === '/DeviceGray' ? { n: 1 } : null;
    if (cs instanceof L.PDFArray) {
      const a = cs.asArray(), t = nm(d.context.lookup(a[0]));
      if (t === '/ICCBased') { const s = d.context.lookup(a[1]); const n = s.dict.lookup(N('N')).asNumber(); return n === 3 || n === 1 ? { n } : null; }
      if (t === '/CalRGB') return { n: 3 }; if (t === '/CalGray') return { n: 1 };
      if (t === '/Indexed') {
        const base = d.context.lookup(a[1]), bn = base instanceof L.PDFName ? (base.toString() === '/DeviceRGB' ? 3 : base.toString() === '/DeviceGray' ? 1 : 0) : 0;
        let lk = d.context.lookup(a[3]), bytes = lk instanceof L.PDFRawStream ? L.decodePDFRawStream(lk).decode() : lk && lk.asBytes ? lk.asBytes() : null;
        return bn && bytes ? { n: 1, pal: bytes, bn } : null;
      }
    }
    return null;
  };
  const pixels = (st) => {                              // -> {w,h,rgba} | null
    const d = st.dict, w = d.lookup(N('Width')).asNumber(), h = d.lookup(N('Height')).asNumber(), bpc = d.lookup(N('BitsPerComponent'));
    if (!bpc || bpc.asNumber() !== 8) return null;
    const fl = filt(d); if (fl.some(f => f !== '/FlateDecode')) return null;
    const cs = comps(d); if (!cs) return null;
    const raw = fl.length ? L.decodePDFRawStream(st).decode() : st.contents, px = new Uint8ClampedArray(w * h * 4);
    if (raw.length < w * h * cs.n) return null;
    for (let i = 0, q = 0; i < w * h; i++, q += 4) {
      if (cs.pal) { const bn = cs.bn, k = raw[i] * bn; if (bn === 3) { px[q] = cs.pal[k]; px[q + 1] = cs.pal[k + 1]; px[q + 2] = cs.pal[k + 2]; } else px[q] = px[q + 1] = px[q + 2] = cs.pal[k]; }
      else if (cs.n === 3) { px[q] = raw[i * 3]; px[q + 1] = raw[i * 3 + 1]; px[q + 2] = raw[i * 3 + 2]; } else px[q] = px[q + 1] = px[q + 2] = raw[i];
      px[q + 3] = 255;
    }
    const sm = d.lookup(N('SMask'));
    if (sm instanceof L.PDFRawStream) {
      const sd = sm.dict;
      if (sd.lookup(N('Width')).asNumber() === w && sd.lookup(N('Height')).asNumber() === h && sd.lookup(N('BitsPerComponent')).asNumber() === 8 && filt(sd).every(f => f === '/FlateDecode')) {
        const a = filt(sd).length ? L.decodePDFRawStream(sm).decode() : sm.contents;
        if (a.length >= w * h) for (let i = 0; i < w * h; i++) px[i * 4 + 3] = a[i];
      }
    }
    return { w, h, px };
  };
  let n = 0; const all = [...doc.lib.context.enumerateIndirectObjects()];
  for (let k = 0; k < all.length; k++) {
    const o = all[k][1];
    if (!(o instanceof L.PDFRawStream)) continue;
    const d = o.dict; if (nm(d.lookup(N('Subtype'))) !== '/Image') continue;
    const im = d.lookup(N('ImageMask')); if (im && im.toString() === 'true') { skipped++; continue; }
    const w = d.lookup(N('Width')).asNumber(), h = d.lookup(N('Height')).asNumber();
    if (Math.min(w, h) < mn) { tiny++; continue; }
    const fl = filt(d);
    let data = null, ext = '';
    if (fl.length === 1 && fl[0] === '/DCTDecode') { data = o.contents; ext = 'jpg'; }
    else {
      const r = pixels(o); if (!r) { skipped++; continue; }
      const c = document.createElement('canvas'); c.width = r.w; c.height = r.h; c.getContext('2d').putImageData(new ImageData(r.px, r.w, r.h), 0, 0);
      const b = await new Promise(rs => c.toBlob(rs, 'image/png')); c.width = c.height = 0;
      if (!b) { skipped++; continue; } data = new Uint8Array(await b.arrayBuffer()); ext = 'png';
    }
    n++; files.push({ name: `${base()}-image-${String(n).padStart(pad, '0')}.${ext}`, data });
    if (k % 20 === 0) { prog.style.width = Math.round(8 + 84 * k / all.length) + '%'; await tick(); }
  }
  if (!files.length) throw new Error(tiny || skipped ? `no usable images. ${tiny ? tiny + ' too small, ' : ''}${skipped ? skipped + ' in formats this tool cannot read yet (scans often use these)' : ''}` : 'this PDF has no embedded pictures');
  return { blob: zip(files), name: cleanName(outName.value, CFG.fallback, 'zip'), info: `${plural(files.length, 'image')}${skipped ? `, ${skipped} not readable` : ''}${tiny ? `, ${tiny} too small` : ''}` };
}
async function bmAuto() {
  ws.classList.add('working'); const lines = [];
  for (let i = 0; i < doc.count; i++) {
    const tc = await (await doc.js.getPage(i + 1)).getTextContent(); let y = null, t = '';
    for (const it of tc.items) { if (!it.str.trim() && !t) continue; const yy = it.transform[5]; if (y !== null && Math.abs(yy - y) > 3 && t) break; y = yy; t += it.str; }
    t = t.replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Page ' + (i + 1);
    lines.push(`${t} | ${i + 1}`);
  }
  ws.classList.remove('working'); $('#bmText').value = lines.join('\n'); clearDone(); paint();
}
async function bmCurrent() {
  const out = await doc.js.getOutline(), lines = [];
  const walk = async (items, lv) => { for (const it of items) {
    try { let d = it.dest; if (typeof d === 'string') d = await doc.js.getDestination(d);
      const idx = d ? (typeof d[0] === 'object' && d[0] !== null ? await doc.js.getPageIndex(d[0]) : d[0]) : -1;
      if (Number.isInteger(idx) && idx >= 0 && idx < doc.count) lines.push(`${'-'.repeat(lv)}${it.title.replace(/\|/g, '/')} | ${idx + 1}`); else continue;
    } catch (e) { continue; }
    if (it.items && it.items.length) await walk(it.items, lv + 1);
  } };
  if (out) await walk(out, 0);
  if (!lines.length) { toast('This PDF has no bookmarks yet.'); return; }
  $('#bmText').value = lines.join('\n'); clearDone(); paint();
}
if ($('#bmAuto')) { $('#bmAuto').addEventListener('click', bmAuto); $('#bmCur').addEventListener('click', bmCurrent); }

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
