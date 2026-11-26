/* Dilia PDF print dialog (owner issues APP-02, APP-03, APP-04): Acrobat-style settings with a live preview.
   Every sheet is drawn here at the paper size and printed edge to edge, so the preview is exactly what prints.
   "Fit" keeps a clear 6.35 mm (1/4 inch) border on every side, outside the unprintable edge of almost all printers, so a
   TOTAL row or footer line at the very edge of a page is never cut (APP-02, APP-03). Files never leave the device.
   Also loads pdf-lib + guard on demand for the reader (window.DiliaLoadPdfLib), used by form-only printing and reader-mark.js. */
(() => {
const ROOT = document.currentScript.src.replace(/assets\/reader-print\.js.*$/, '');
window.DiliaLoadPdfLib = (() => {
  let ready = null;
  const add = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('could not load ' + src)); document.head.append(s); });
  return () => ready || (ready = (window.PDFLib ? Promise.resolve() : add(ROOT + 'assets/vendor/pdf-lib.min.js'))
    .then(() => (window.DiliaGuard ? null : add(ROOT + 'assets/guard.js'))).then(() => window.PDFLib).catch(e => { ready = null; throw e; }));
})();

const MM = 72 / 25.4, SAFE = 6.35 * MM, GUT = 3 * MM, CAP = 24e6;
const PAPERS = [['a4', 'A4', 210, 297], ['letter', 'Letter', 215.9, 279.4], ['legal', 'Legal', 215.9, 355.6], ['a3', 'A3', 297, 420], ['a5', 'A5', 148, 210], ['tabloid', 'Tabloid', 279.4, 431.8], ['pdf', 'Same as the PDF page', 0, 0]];
const DEF = { printer: '', copies: 1, collate: true, grey: false, toner: false, pages: 'all', range: '', subset: 'all', reverse: false, mode: 'size', size: 'fit', scale: 100,
  tile: 100, overlap: 0, labels: true, cuts: true, nup: '2', cols: 2, rows: 2, order: 'h', border: false, bsub: 'both', bfrom: 1, bto: 0, bind: 'left',
  orient: 'auto', paper: '', annots: 'all', summary: false, duplex: false, flip: 'long', hq: false };
const KEEP = ['printer', 'collate', 'grey', 'toner', 'mode', 'size', 'scale', 'tile', 'overlap', 'labels', 'cuts', 'nup', 'cols', 'rows', 'order', 'border', 'bind', 'orient', 'paper', 'annots', 'duplex', 'flip', 'hq'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(+v) ? +v : a));
const mm = v => (v / MM).toFixed(1).replace(/\.0$/, '');
function prefs() {
  let o = {}; try { o = JSON.parse(localStorage.getItem('dilia-print') || '{}'); } catch (e) { o = {}; }
  const S = Object.assign({}, DEF); KEEP.forEach(k => { if (o && k in o && typeof o[k] === typeof DEF[k]) S[k] = o[k]; });
  if (!PAPERS.some(p => p[0] === S.paper)) S.paper = /^(en-(US|CA|PH)|es-(MX|US))/.test(navigator.language || '') ? 'letter' : 'a4';
  return S;
}
function keepPrefs(S) { const o = {}; KEEP.forEach(k => { o[k] = S[k]; }); try { localStorage.setItem('dilia-print', JSON.stringify(o)); } catch (e) { /* storage blocked */ } }
function parseRange(s, n) {
  const out = [];
  for (const part of String(s).split(',')) {
    const m = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part); if (!m) return null;
    let a = +m[1], b = m[2] ? +m[2] : a; if (a > b) [a, b] = [b, a]; if (a < 1 || b > n) return null;
    for (let i = a; i <= b; i++) out.push(i);
  }
  return out.length ? out : null;
}

/* ---------- which pages, as sources: { i, rot, ox, oy, w, h } in PDF points (ox/oy: part of the page, for Current view) ---------- */
function pick(t, S) {
  let list;
  if (S.pages === 'all') list = [...Array(t.n).keys()];
  else if (S.pages === 'cur' || S.pages === 'view') list = [t.cur - 1];
  else { const r = parseRange(S.range, t.n); if (!r) return null; list = r.map(n => n - 1); }
  if (S.pages === 'all' || S.pages === 'some') {
    if (S.subset === 'odd') list = list.filter(i => i % 2 === 0); else if (S.subset === 'even') list = list.filter(i => i % 2 === 1);
    if (S.reverse) list.reverse();
  }
  return list;
}
async function sources(A, t, list, S) {
  const out = [];
  for (const i of list) {
    const pg = await A.ensure(t, t.pages[i]), rot = (pg.rotate || 0) % 360, v = pg.getViewport({ scale: 1, rotation: rot });
    out.push({ i, rot, ox: 0, oy: 0, w: v.width, h: v.height });
  }
  if (S.pages === 'view' && out.length) {                 // the part of the current page that is on screen, as it is shown
    const p = t.pages[t.cur - 1], rot = A.rotOf(t, p), v = p.page.getViewport({ scale: 1, rotation: rot });
    const r = p.el.getBoundingClientRect(), vr = A.view.getBoundingClientRect(), k = r.width / v.width;
    const x0 = Math.max(r.left, vr.left), x1 = Math.min(r.right, vr.right), y0 = Math.max(r.top, vr.top), y1 = Math.min(r.bottom, vr.bottom);
    if (x1 - x0 > 4 && y1 - y0 > 4) out[0] = { i: p.i, rot, ox: (x0 - r.left) / k, oy: (y0 - r.top) / k, w: (x1 - x0) / k, h: (y1 - y0) / k };
  }
  return out;
}

/* ---------- layout: sheets of { items: [{ s, x, y, w, h, r90, border }], lines: [[x1,y1,x2,y2]], texts: [{ x, y, size, str, b }] } ---------- */
function paperOf(S, srcs) {
  if (S.paper === 'pdf') { const s = srcs[0] || { w: 595.28, h: 841.89 }; return [Math.min(s.w, s.h), Math.max(s.w, s.h)]; }
  const p = PAPERS.find(x => x[0] === S.paper) || PAPERS[0]; return [p[2] * MM, p[3] * MM];
}
const turn = ([a, b], land) => land ? [Math.max(a, b), Math.min(a, b)] : [Math.min(a, b), Math.max(a, b)];
function laySize(S, srcs, paper) {
  const land = S.orient === 'landscape' || (S.orient === 'auto' && srcs.filter(s => s.w > s.h + 1).length > srcs.length / 2);
  const [W, H] = turn(paper, land), sheets = [], ks = [];
  for (const s of srcs) {
    const r90 = S.orient === 'auto' && Math.abs(s.w - s.h) > 1 && (s.w > s.h) !== (W > H);
    const sw = r90 ? s.h : s.w, sh = r90 ? s.w : s.h, fit = Math.min((W - 2 * SAFE) / sw, (H - 2 * SAFE) / sh);
    const k = S.size === 'fit' ? fit : S.size === 'actual' ? 1 : S.size === 'shrink' ? Math.min(1, fit) : clamp(S.scale, 1, 1000) / 100;
    ks.push(k); sheets.push({ items: [{ s, x: (W - sw * k) / 2, y: (H - sh * k) / 2, w: sw * k, h: sh * k, r90 }] });
  }
  return { W, H, sheets, ks };
}
function layMulti(S, srcs, paper) {
  const custom = S.nup === 'c', n = custom ? clamp(S.cols, 1, 8) * clamp(S.rows, 1, 8) : +S.nup, ref = srcs[0];
  let best = null;
  for (const land of S.orient === 'auto' ? [false, true] : [S.orient === 'landscape']) {
    const [W, H] = turn(paper, land);
    const grids = custom ? [[clamp(S.cols, 1, 8), clamp(S.rows, 1, 8)]] : [...Array(n).keys()].map(c => c + 1).filter(c => n % c === 0).map(c => [c, n / c]);
    for (const [c, r] of grids) {
      const cw = (W - 2 * SAFE - (c - 1) * GUT) / c, ch = (H - 2 * SAFE - (r - 1) * GUT) / r;
      const k = Math.max(Math.min(cw / ref.w, ch / ref.h), S.orient === 'auto' ? Math.min(cw / ref.h, ch / ref.w) : 0);
      if (!best || k > best.k + 1e-6) best = { W, H, c, r, cw, ch, k };
    }
  }
  const { W, H, c, r, cw, ch } = best, sheets = [], ks = [];
  for (let a = 0; a < srcs.length; a += n) {
    const items = [];
    srcs.slice(a, a + n).forEach((s, j) => {
      let col, row;
      if (S.order === 'v' || S.order === 'vr') { col = Math.floor(j / r); row = j % r; if (S.order === 'vr') col = c - 1 - col; }
      else { row = Math.floor(j / c); col = j % c; if (S.order === 'hr') col = c - 1 - col; }
      const k1 = Math.min(cw / s.w, ch / s.h), k2 = Math.min(cw / s.h, ch / s.w), r90 = S.orient === 'auto' && k2 > k1 * 1.05, k = r90 ? k2 : k1;
      const w = (r90 ? s.h : s.w) * k, h = (r90 ? s.w : s.h) * k; ks.push(k);
      items.push({ s, x: SAFE + col * (cw + GUT) + (cw - w) / 2, y: SAFE + row * (ch + GUT) + (ch - h) / 2, w, h, r90, border: S.border });
    });
    sheets.push({ items });
  }
  return { W, H, sheets, ks };
}
function layPoster(S, srcs, paper, name) {
  const k = clamp(S.tile, 10, 1000) / 100, O = clamp(S.overlap, 0, 50) * MM;
  const count = ([W, H]) => srcs.reduce((n, s) => { const aw = W - 2 * SAFE, ah = H - 2 * SAFE, sw = s.w * k, sh = s.h * k;
    return n + (sw <= aw ? 1 : Math.ceil((sw - O) / Math.max(10, aw - O))) * (sh <= ah ? 1 : Math.ceil((sh - O) / Math.max(10, ah - O))); }, 0);
  const cand = S.orient === 'auto' ? [turn(paper, false), turn(paper, true)] : [turn(paper, S.orient === 'landscape')];
  const [W, H] = cand.reduce((a, b) => count(b) < count(a) ? b : a), aw = W - 2 * SAFE, ah = H - 2 * SAFE, sheets = [];
  for (const s of srcs) {
    const sw = s.w * k, sh = s.h * k, nx = sw <= aw ? 1 : Math.ceil((sw - O) / Math.max(10, aw - O)), ny = sh <= ah ? 1 : Math.ceil((sh - O) / Math.max(10, ah - O));
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const rx = ix * (aw - O), ry = iy * (ah - O), rw = Math.min(nx === 1 ? sw : aw, sw - rx), rh = Math.min(ny === 1 ? sh : ah, sh - ry);
      const x = nx === 1 ? (W - rw) / 2 : SAFE, y = ny === 1 ? (H - rh) / 2 : SAFE;
      const sub = { i: s.i, rot: s.rot, ox: s.ox + rx / k, oy: s.oy + ry / k, w: rw / k, h: rh / k };
      const sh2 = { items: [{ s: sub, x, y, w: rw, h: rh, r90: false }], lines: [], texts: [] };
      if (nx * ny > 1 && S.cuts) { const m = 4 * MM; for (const [cx, cy, dx, dy] of [[x, y, -1, -1], [x + rw, y, 1, -1], [x, y + rh, -1, 1], [x + rw, y + rh, 1, 1]]) sh2.lines.push([cx + dx, cy, cx + dx * m, cy], [cx, cy + dy, cx, cy + dy * m]); }
      if (nx * ny > 1 && S.labels) sh2.texts.push({ x: SAFE, y: SAFE - 3, size: 7, str: `${name} - page ${s.i + 1} - row ${iy + 1}, column ${ix + 1} of ${ny} x ${nx}` });
      sheets.push(sh2);
    }
  }
  return { W, H, sheets, ks: [k] };
}
function layBooklet(S, srcs, paper) {
  const [W, H] = turn(paper, true), N = Math.max(4, Math.ceil(srcs.length / 4) * 4), L = srcs.concat(Array(N - srcs.length).fill(null)), nS = N / 4;
  const from = clamp(S.bfrom, 1, nS), to = S.bto ? clamp(S.bto, from, nS) : nS, half = W / 2, sheets = [], ks = [];
  const place = (s, left) => {
    if (!s) return null;
    const k = Math.min((half - SAFE - GUT / 2) / s.w, (H - 2 * SAFE) / s.h), w = s.w * k, h = s.h * k; ks.push(k);
    return { s, x: left ? half - GUT / 2 - w : half + GUT / 2, y: (H - h) / 2, w, h, r90: false };
  };
  for (let q = from - 1; q < to; q++) {
    let fl = L[N - 1 - 2 * q], fr = L[2 * q], bl = L[2 * q + 1], br = L[N - 2 - 2 * q];
    if (S.bind === 'right') { [fl, fr] = [fr, fl]; [bl, br] = [br, bl]; }
    if (S.bsub !== 'back') sheets.push({ items: [place(fl, true), place(fr, false)].filter(Boolean) });
    if (S.bsub !== 'front') sheets.push({ items: [place(bl, true), place(br, false)].filter(Boolean) });
  }
  return { W, H, sheets, ks, nS };
}

/* ---------- comment summary: extra sheets listing the comments on the printed pages ---------- */
const NOTE = { Text: 'Note', FreeText: 'Text box', Highlight: 'Highlight', Underline: 'Underline', StrikeOut: 'Strike-through', Squiggly: 'Squiggly underline',
  Square: 'Box', Circle: 'Circle', Line: 'Line', Polygon: 'Polygon', PolyLine: 'Lines', Ink: 'Drawing', Stamp: 'Stamp', Caret: 'Insert', FileAttachment: 'Attached file', Sound: 'Sound', Redact: 'Redaction' };
async function summary(A, t, list, W, H) {
  const rows = [];
  for (const i of [...list].sort((a, b) => a - b)) {
    let an = []; try { an = await (await A.ensure(t, t.pages[i])).getAnnotations({ intent: 'display' }); } catch (e) { an = []; }
    for (const a of an) {
      if (['Link', 'Widget', 'Popup'].includes(a.subtype)) continue;
      rows.push({ page: i + 1, kind: NOTE[a.subtype] || a.subtype || 'Comment', who: (a.titleObj && a.titleObj.str) || '', text: (a.contentsObj && a.contentsObj.str) || '' });
    }
  }
  const m = document.createElement('canvas').getContext('2d'), width = W - 2 * SAFE - 12, sheets = [];
  const wrap = (str, size) => { m.font = size + 'px Arial, sans-serif'; const out = []; for (const para of String(str).split(/\r?\n/)) { let line = ''; for (const w of para.split(/\s+/)) { const nx = line ? line + ' ' + w : w; if (m.measureText(nx).width > width && line) { out.push(line); line = w; } else line = nx; } out.push(line); } return out; };
  let sh = null, y = 0;
  const add = (str, size, b, gap) => { for (const ln of wrap(str, size)) { if (!sh || y + size > H - SAFE - 6) { sh = { items: [], texts: [], lines: [] }; sheets.push(sh); y = SAFE + 16; } sh.texts.push({ x: SAFE + 6, y, size, b, str: ln }); y += size * 1.35; } y += gap || 0; };
  add('Summary of comments: ' + t.name, 14, true, 6);
  if (!rows.length) add('There are no comments on the printed pages.', 10, false);
  let last = 0;
  for (const r of rows) {
    if (r.page !== last) { add('Page ' + r.page, 11, true, 2); last = r.page; }
    add(r.kind + (r.who ? ' by ' + r.who : ''), 9.5, true);
    if (r.text) add(r.text, 9.5, false);
    y += 4;
  }
  return sheets;
}

/* ---------- drawing a sheet onto a canvas (preview and print use the same code) ---------- */
async function drawSheet(job, sheet, cv, dpi, stale) {
  const k = dpi / 72; cv.width = Math.max(1, Math.round(job.W * k)); cv.height = Math.max(1, Math.round(job.H * k));
  const x = cv.getContext('2d', { alpha: false }); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
  for (const it of sheet.items || []) {
    const s = it.s, pg = await job.page(s.i);
    let sc = ((it.r90 ? it.h : it.w) / s.w) * k; const px = s.w * sc * s.h * sc; if (px > CAP) sc *= Math.sqrt(CAP / px);
    const vp = pg.getViewport({ scale: sc, rotation: s.rot, offsetX: -s.ox * sc, offsetY: -s.oy * sc });
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(s.w * sc)); c.height = Math.max(1, Math.ceil(s.h * sc));
    const cx = c.getContext('2d', { alpha: false }); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: cx, viewport: vp, annotationMode: job.annotMode, optionalContentConfigPromise: job.oc ? Promise.resolve(job.oc) : null }).promise;
    if (stale && stale()) { c.width = c.height = 0; return false; }
    x.save();
    if (it.r90) { x.translate((it.x + it.w) * k, it.y * k); x.rotate(Math.PI / 2); x.drawImage(c, 0, 0, it.h * k, it.w * k); }
    else x.drawImage(c, it.x * k, it.y * k, it.w * k, it.h * k);
    x.restore(); c.width = c.height = 0;
    if (it.border) { x.strokeStyle = '#000'; x.lineWidth = Math.max(1, .6 * k); x.strokeRect(it.x * k, it.y * k, it.w * k, it.h * k); }
  }
  if (sheet.lines && sheet.lines.length) { x.strokeStyle = '#000'; x.lineWidth = Math.max(1, .5 * k); x.beginPath(); for (const [a, b, c2, d] of sheet.lines) { x.moveTo(a * k, b * k); x.lineTo(c2 * k, d * k); } x.stroke(); }
  for (const tx of sheet.texts || []) { x.fillStyle = '#111'; x.font = (tx.b ? '700 ' : '400 ') + tx.size * k + 'px Arial, sans-serif'; x.fillText(tx.str, tx.x * k, tx.y * k); }
  if (job.grey || job.toner) {
    const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height; tmp.getContext('2d').drawImage(cv, 0, 0);
    x.filter = [job.grey ? 'grayscale(1)' : '', job.toner ? 'contrast(.7) brightness(1.25)' : ''].join(' ').trim(); x.drawImage(tmp, 0, 0); x.filter = 'none'; tmp.width = tmp.height = 0;
  }
  return true;
}

/* ---------- pages without comments for "Form fields only": a copy with every annotation except form fields removed ---------- */
async function formsDoc(t) {
  const L = await window.DiliaLoadPdfLib(), d = await L.PDFDocument.load(new Uint8Array(await t.file.arrayBuffer()), { updateMetadata: false });
  for (const pg of d.getPages()) {
    const arr = pg.node.Annots(); if (!arr) continue;
    for (let i = arr.size() - 1; i >= 0; i--) { let a = null; try { a = arr.lookup(i, L.PDFDict); } catch (e) { a = null; } const st = a && a.get(L.PDFName.of('Subtype')); if (!st || st.toString() !== '/Widget') arr.remove(i); }
  }
  return pdfjsLib.getDocument({ isEvalSupported: false, data: await d.save() }).promise;
}

/* ---------- the dialog ---------- */
let busy = false;
async function open(A) {
  const t = A.T; if (!t || busy) return;
  if (t.perms === undefined) { try { t.perms = await t.doc.getPermissions(); } catch (e) { t.perms = null; } }
  const PF = pdfjsLib.PermissionFlag || {};
  if (PF.PRINT && !A.can(t, PF.PRINT)) { A.toast('The maker of this PDF does not allow printing.', true); return; }
  const lowOnly = PF.PRINT_HIGH_QUALITY && !A.can(t, PF.PRINT_HIGH_QUALITY);
  const S = prefs(), el = A.el, DESK = A.DESK && typeof A.DESK.print === 'function' ? A.DESK : null;
  if (lowOnly) S.hq = false;
  let printers = [];
  if (DESK) { try { printers = await DESK.printers(); } catch (e) { printers = []; } if (!printers.some(p => p.name === S.printer)) S.printer = (printers.find(p => p.def) || printers[0] || { name: '' }).name; }

  const ui = {}, on = [];
  const row = (...n) => { const d = el('div', 'rprow'); d.append(...n); return d; };
  const lab = (txt, ctl) => { const l = el('label', 'rplab'); l.append(el('span', '', txt), ctl); return l; };
  const sel = (key, opts, aria) => { const s = el('select'); s.name = key; s.setAttribute('aria-label', aria); opts.forEach(([v, txt]) => { const o = el('option', '', txt); o.value = v; s.append(o); }); s.value = String(S[key]); s.addEventListener('change', () => { S[key] = s.value; changed(); }); ui[key] = s; return s; };
  const chk = (key, txt) => { const l = el('label', 'rchk'), i = el('input'); i.type = 'checkbox'; i.name = key; i.checked = !!S[key]; i.addEventListener('change', () => { S[key] = i.checked; changed(); }); l.append(i, ' ' + txt); ui[key] = i; return l; };
  const num = (key, a, b, aria, step) => { const i = el('input'); i.type = 'number'; i.name = key; i.min = a; i.max = b; i.step = step || 1; i.value = S[key]; i.setAttribute('aria-label', aria); i.addEventListener('input', () => { if (i.value !== '' && Number.isFinite(+i.value)) { S[key] = clamp(+i.value, a, b); changed(); } }); i.addEventListener('blur', () => { i.value = S[key]; }); ui[key] = i; return i; };
  const rad = (key, opts, cls) => { const d = el('div', cls || 'rprad'); opts.forEach(([v, txt]) => { const l = el('label', 'rchk'), i = el('input'); i.type = 'radio'; i.name = key; i.value = v; i.checked = String(S[key]) === v; i.addEventListener('change', () => { if (i.checked) { S[key] = v; changed(); } }); const sp = el('span', '', txt); l.append(i, ' ', sp); d.append(l); }); ui[key] = d; return d; };
  const fs = (legend, ...n) => { const f = el('fieldset', 'rfs'); f.append(el('legend', '', legend), ...n); return f; };

  const left = el('div', 'rpset');
  if (DESK) {
    const ps = printers.length ? sel('printer', printers.map(p => [p.name, p.label + (p.def ? ' (default)' : '')]), 'Printer') : el('span', 'rpnote', 'No printer found. Use the Windows print window below.');
    left.append(fs('Printer', ps, row(lab('Copies', num('copies', 1, 99, 'Copies')), chk('collate', 'Collate'))));
  } else left.append(el('p', 'rpnote', 'Your browser asks for the printer, copies and two-sided printing in the next window.'));
  left.append(row(chk('grey', 'Print in greyscale (black and white)'), chk('toner', 'Save ink/toner')));
  const range = el('input'); range.type = 'text'; range.className = 'rrange'; range.name = 'range'; range.placeholder = 'e.g. 1, 6-18, 33'; range.setAttribute('aria-label', 'Pages to print'); range.value = S.range;
  range.addEventListener('focus', () => { const r = ui.pages.querySelector('input[value=some]'); if (!r.checked) { r.checked = true; S.pages = 'some'; changed(); } });
  range.addEventListener('input', () => { S.range = range.value; changed(); });
  const err = el('p', 'rperr'); err.hidden = true; err.setAttribute('role', 'alert');
  left.append(fs('Pages to print', rad('pages', [['all', `All (${t.n} pages)`], ['cur', `Current page (${t.cur})`], ['view', 'Current view (what is on screen)'], ['some', 'Pages:']]), range, err,
    row(lab('More options', sel('subset', [['all', 'All pages in range'], ['odd', 'Odd pages only'], ['even', 'Even pages only']], 'Odd or even pages')), chk('reverse', 'Reverse pages'))));
  const pSize = el('div', 'rpsub'), pPoster = el('div', 'rpsub'), pMulti = el('div', 'rpsub'), pBook = el('div', 'rpsub');
  pSize.append(rad('size', [['fit', 'Fit'], ['actual', 'Actual size'], ['shrink', 'Shrink oversized pages'], ['custom', 'Custom scale:']]), row(num('scale', 1, 1000, 'Custom scale in percent'), el('span', '', '%')));
  pPoster.append(row(lab('Tile scale', num('tile', 10, 1000, 'Tile scale in percent')), el('span', '', '%'), lab('Overlap', num('overlap', 0, 50, 'Overlap in millimetres', .5)), el('span', '', 'mm')), row(chk('labels', 'Labels'), chk('cuts', 'Cut marks')));
  const cr = row(lab('Columns', num('cols', 1, 8, 'Columns')), lab('Rows', num('rows', 1, 8, 'Rows')));
  pMulti.append(row(lab('Pages per sheet', sel('nup', [['2', '2'], ['4', '4'], ['6', '6'], ['9', '9'], ['16', '16'], ['c', 'Custom']], 'Pages per sheet')),
    lab('Page order', sel('order', [['h', 'Horizontal'], ['hr', 'Horizontal reversed'], ['v', 'Vertical'], ['vr', 'Vertical reversed']], 'Page order'))), cr, chk('border', 'Print page border'));
  pBook.append(row(lab('Booklet subset', sel('bsub', [['both', 'Both sides'], ['front', 'Front side only'], ['back', 'Back side only']], 'Booklet subset')),
    lab('Binding', sel('bind', [['left', 'Left'], ['right', 'Right']], 'Binding'))), row(lab('Sheets from', num('bfrom', 1, 9999, 'First sheet')), lab('to', num('bto', 0, 9999, 'Last sheet (0 = last)'))), el('p', 'rpnote', 'Fold the printed stack in the middle. Both sides need two-sided printing, flipped on the short edge.'));
  left.append(fs('Page sizing and handling', rad('mode', [['size', 'Size'], ['poster', 'Poster'], ['multiple', 'Multiple'], ['booklet', 'Booklet']], 'rpseg'), pSize, pPoster, pMulti, pBook));
  left.append(fs('Orientation', rad('orient', [['auto', 'Auto portrait/landscape'], ['portrait', 'Portrait'], ['landscape', 'Landscape']])));
  left.append(fs('Paper', row(lab('Paper size', sel('paper', PAPERS.map(p => [p[0], p[1] + (p[2] ? ` (${p[2]} x ${p[3]} mm)` : '')]), 'Paper size')))));
  left.append(fs('Comments and forms', sel('annots', [['all', 'Document and markups'], ['doc', 'Document'], ['forms', 'Form fields only']], 'Comments and forms'), chk('summary', 'Summarise comments (adds pages at the end)')));
  if (DESK) left.append(fs('Two-sided', chk('duplex', 'Print on both sides of paper'), rad('flip', [['long', 'Flip on long edge'], ['short', 'Flip on short edge']])));
  const hq = chk('hq', 'High quality (300 dpi, slower)'); if (lowOnly) { ui.hq.disabled = true; hq.title = 'The maker of this PDF allows low-quality printing only.'; }
  left.append(hq);

  const box = el('div', 'rpbox'), pv = el('canvas'); pv.setAttribute('aria-label', 'Print preview'); pv.setAttribute('role', 'img'); box.append(pv);
  const prev = el('button', 'btn ghost sm', '‹'), next = el('button', 'btn ghost sm', '›'), at = el('span', 'rpat');
  prev.type = next.type = 'button'; prev.setAttribute('aria-label', 'Previous sheet'); next.setAttribute('aria-label', 'Next sheet');
  const info = el('p', 'rpinfo'); info.setAttribute('aria-live', 'polite');
  const legend = el('p', 'rpinfo', 'Dashed line: 6 mm safe edge. Fit keeps everything inside it so nothing is cut.');
  const right = el('div', 'rppv'); right.append(box, row(prev, at, next), info, legend);
  const grid = el('div', 'rpgrid'); grid.append(left, right);
  ui.form = grid;

  let job = null, sheetAt = 0, gen = 0, timer = 0, fdoc = null, fdocFail = false;
  const closeF = () => { if (fdoc) { fdoc.destroy(); fdoc = null; } };
  async function build() {
    const list = pick(t, S);
    if (!list || !list.length) return { error: S.pages === 'some' ? `Type pages between 1 and ${t.n}, like 1, 6-18, 33.` : 'No pages to print.' };
    const srcs = await sources(A, t, list, S); if (!srcs.length) return { error: 'No pages to print.' };
    const paper = paperOf(S, srcs);
    const L = S.mode === 'multiple' ? layMulti(S, srcs, paper) : S.mode === 'poster' ? layPoster(S, srcs, paper, t.name.replace(/\.pdf$/i, '')) : S.mode === 'booklet' ? layBooklet(S, srcs, paper) : laySize(S, srcs, paper);
    if (S.summary) L.sheets.push(...await summary(A, t, list, L.W, L.H));
    let doc = t.doc, mode = (pdfjsLib.AnnotationMode || {}).ENABLE;
    if (S.annots === 'doc') mode = (pdfjsLib.AnnotationMode || {}).DISABLE;
    else if (S.annots === 'forms' && !fdocFail) { try { fdoc = fdoc || await formsDoc(t); doc = fdoc; } catch (e) { fdocFail = true; A.toast('Form fields only is not available for this PDF (it may be protected). Printing the document and markups.', true); } }
    return Object.assign(L, { srcs, doc, annotMode: mode, oc: doc === t.doc ? t.oc : null, grey: S.grey, toner: S.toner,
      page: i => doc === t.doc ? A.ensure(t, t.pages[i]) : doc.getPage(i + 1) });
  }
  async function preview() {
    const my = ++gen;
    let j; try { j = await build(); } catch (e) { j = { error: 'The preview could not be made: ' + (e && e.message || e) }; }
    if (my !== gen) return;
    job = j.error ? null : j; err.hidden = !j.error; err.textContent = j.error || '';
    range.setAttribute('aria-invalid', j.error && S.pages === 'some' ? 'true' : 'false');
    const okB = A.dlg.querySelector('button[value=ok]'), sysB = A.dlg.querySelector('button[value=sys]');
    if (okB) okB.disabled = !job; if (sysB) sysB.disabled = !job;
    if (!job) { pv.width = pv.height = 0; info.textContent = ''; at.textContent = ''; return; }
    sheetAt = Math.min(sheetAt, job.sheets.length - 1);
    const n = job.sheets.length, s0 = job.srcs[0], sc = job.ks.length ? Math.round(Math.min(...job.ks) * 100) + (Math.max(...job.ks) - Math.min(...job.ks) > .005 ? '-' + Math.round(Math.max(...job.ks) * 100) : '') + '%' : '';
    at.textContent = `Sheet ${sheetAt + 1} of ${n}`; prev.disabled = sheetAt <= 0; next.disabled = sheetAt >= n - 1;
    info.textContent = `Document: ${mm(s0.w)} x ${mm(s0.h)} mm · Paper: ${mm(job.W)} x ${mm(job.H)} mm · Scale: ${sc}` + (DESK && S.copies > 1 ? ` · ${S.copies} copies` : '') + (S.mode === 'booklet' ? ` · ${job.nS} folded sheet${job.nS > 1 ? 's' : ''}` : '');
    const bw = box.clientWidth - 16 || 420, bh = box.clientHeight - 16 || 480, d = Math.min(window.devicePixelRatio || 1, 2);
    const dpi = Math.min(bw / (job.W / 72), bh / (job.H / 72)) * d;
    const c = document.createElement('canvas');
    let ok = false; try { ok = await drawSheet(job, job.sheets[sheetAt], c, dpi, () => my !== gen); } catch (e) { ok = false; }
    if (!ok || my !== gen) { c.width = 0; return; }
    const k = dpi / 72, x = c.getContext('2d'); x.setLineDash([4 * d, 3 * d]); x.strokeStyle = '#e5007d99'; x.lineWidth = d; x.strokeRect(SAFE * k, SAFE * k, (job.W - 2 * SAFE) * k, (job.H - 2 * SAFE) * k);
    pv.width = c.width; pv.height = c.height; pv.getContext('2d').drawImage(c, 0, 0); c.width = 0;
    pv.style.width = pv.width / d + 'px'; pv.style.height = pv.height / d + 'px';
    window.__readerPrint = { sheets: n, W: job.W, H: job.H, ks: job.ks.slice(), items: job.sheets.map(s => (s.items || []).map(i => ({ page: i.s.i + 1, x: i.x, y: i.y, w: i.w, h: i.h, r90: !!i.r90 }))), at: sheetAt, error: '' };
  }
  function changed() {
    ui.scale.disabled = S.size !== 'custom';
    pSize.hidden = S.mode !== 'size'; pPoster.hidden = S.mode !== 'poster'; pMulti.hidden = S.mode !== 'multiple'; pBook.hidden = S.mode !== 'booklet'; cr.hidden = S.nup !== 'c';
    if (ui.flip) ui.flip.querySelectorAll('input').forEach(i => { i.disabled = !S.duplex; });
    clearTimeout(timer); timer = setTimeout(preview, 120);
    window.__readerPrint = { pending: true };
  }
  prev.addEventListener('click', () => { if (sheetAt > 0) { sheetAt--; preview(); } });
  next.addEventListener('click', () => { if (job && sheetAt < job.sheets.length - 1) { sheetAt++; preview(); } });
  grid.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); });

  const buttons = [{ label: 'Cancel', value: 'no' }];
  if (DESK) buttons.push({ label: 'Windows print window…', value: 'sys' });
  buttons.push({ label: 'Print', value: 'ok', primary: true });
  A.dlg.classList.add('rpd');
  const asked = A.ask('Print', [grid], buttons);
  const sysB = A.dlg.querySelector('button[value=sys]'); if (sysB) sysB.title = 'Printer properties, paper tray and other driver settings';
  changed();
  const r = await asked;
  A.dlg.classList.remove('rpd'); gen++; clearTimeout(timer);
  if (r !== 'ok' && r !== 'sys') { closeF(); return; }
  keepPrefs(S);
  if (!job) { try { job = await build(); } catch (e) { job = null; } if (!job || job.error) { closeF(); A.toast('Nothing to print with these settings.', true); return; } }
  busy = true;
  try { await run(A, t, S, job, r === 'sys', DESK); } finally { busy = false; closeF(); }
}

/* ---------- printing ---------- */
const blobUrl = cv => new Promise((ok, no) => cv.toBlob(b => b ? ok(URL.createObjectURL(b)) : no(new Error('blob')), 'image/png'));
async function run(A, t, S, job, sys, DESK) {
  const out = document.getElementById('rprint'); out.textContent = ''; const urls = [], dpi = S.hq ? 300 : 150, n = job.sheets.length;
  const clean = () => { out.textContent = ''; urls.forEach(u => URL.revokeObjectURL(u)); };
  try {
    for (let k = 0; k < n; k++) {
      if (k % 5 === 0) A.toast(`Preparing sheet ${k + 1} of ${n}...`);
      const c = document.createElement('canvas'); await drawSheet(job, job.sheets[k], c, dpi); urls.push(await blobUrl(c)); c.width = c.height = 0;
      const img = document.createElement('img'); img.alt = ''; img.src = urls[k];
      img.style.width = 'auto'; img.style.height = (job.H / MM - .4).toFixed(2) + 'mm'; img.style.maxWidth = (job.W / MM).toFixed(2) + 'mm';
      if (k === n - 1) img.style.breakAfter = 'auto';
      await img.decode().catch(() => {}); out.append(img);
    }
  } catch (e) { clean(); A.toast('Printing could not be prepared. Try fewer pages or turn off High quality.', true); return; }
  const ss = [...document.styleSheets].find(s => /reader\.css/.test(s.href || '')); let ri = -1;
  try { if (ss) ri = ss.insertRule(`@page{size:${(job.W / MM).toFixed(2)}mm ${(job.H / MM).toFixed(2)}mm;margin:0}`, ss.cssRules.length); } catch (e) { ri = -1; }
  document.body.classList.add('rprinting');
  const done = () => { document.body.classList.remove('rprinting'); clean(); if (ri >= 0) { try { ss.deleteRule(ri); } catch (e) { /* already gone */ } ri = -1; } removeEventListener('afterprint', done); };
  if (DESK) {
    const mic = v => Math.round(v / MM * 1000), dup = S.mode === 'booklet' && S.bsub === 'both' ? 'shortEdge' : S.duplex ? (S.flip === 'short' ? 'shortEdge' : 'longEdge') : 'simplex';
    let res; try { res = await DESK.print({ printer: S.printer, system: !!sys, copies: S.copies, collate: S.collate, color: !S.grey, duplex: dup, landscape: job.W > job.H, w: mic(Math.min(job.W, job.H)), h: mic(Math.max(job.W, job.H)) }); }
    catch (e) { res = { ok: false, why: String(e && e.message || e) }; }
    done();
    if (res && res.ok) A.toast(`Sent ${n} sheet${n > 1 ? 's' : ''} to the printer.`); else if (res && res.why && !/cancel/i.test(res.why)) A.toast('Printing did not work: ' + res.why, true);
    return;
  }
  addEventListener('afterprint', done); window.print();
  setTimeout(() => { if (document.body.classList.contains('rprinting') && !matchMedia('print').matches) done(); }, 60000);
}

window.DiliaPrint = { open, _test: { parseRange, laySize, layMulti, layPoster, layBooklet, SAFE, MM } };
})();
