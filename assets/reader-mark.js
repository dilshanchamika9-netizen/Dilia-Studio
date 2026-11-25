/* Dilia PDF: working with selected text (owner issues APP-05, APP-06, APP-07).
   - Copy: Ctrl+C, right-click > Copy, or the Copy button that appears next to a selection. Clean text (no odd spaces).
   - Highlight, underline and strike-through the selection. Saved into the PDF as standard markup annotations with their own
     appearance, so Acrobat, Edge, Chrome and phones show them. Ctrl+Z undoes. Nothing is written to the file until Ctrl+S.
   - Pages with no text layer (scans, text drawn as shapes) say so and offer Recognise text (OCR).
   Nothing leaves the device. Selected text is only ever set as plain text. */
window.DiliaMark = (() => {
let A = null, menu = null, bar = null, note = null, busy = false;
const COL = { highlight: [1, .89, .2], underline: [.1, .6, .25], strike: [.85, .1, .1] };
const HCOL = [['Yellow', [1, .89, .2]], ['Green', [.55, .9, .45]], ['Blue', [.55, .8, 1]], ['Pink', [1, .62, .82]]];
const SUB = { highlight: 'Highlight', underline: 'Underline', strike: 'StrikeOut' };
const NAME = { highlight: 'Highlight', underline: 'Underline', strike: 'Strike-through' };

function selRange() {
  const s = getSelection(); if (!s || !s.rangeCount || s.isCollapsed) return null;
  const r = s.getRangeAt(0), c = r.commonAncestorContainer, e = c.nodeType === 1 ? c : c.parentElement;
  if (!e || !A.view.contains(e)) return null;
  if (!(e.closest('.textLayer') || e.querySelector('.textLayer') || e.closest('.rp'))) return null;
  return String(s).trim() ? r : null;
}
const clean = s => String(s).replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
async function copy(str) {
  str = clean(str); if (!str) return false;
  try { await navigator.clipboard.writeText(str); return true; } catch (e) { /* fall back below */ }
  const s = getSelection(), keep = s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
  const ta = document.createElement('textarea'); ta.value = str; ta.setAttribute('readonly', ''); ta.className = 'vh'; document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove(); if (keep) { s.removeAllRanges(); s.addRange(keep); }
  return ok;
}
async function copySel() {
  const r = selRange(); if (!r) return false;
  const ok = await copy(getSelection().toString()); A.toast(ok ? 'Copied.' : 'Copy was blocked. Try again.', !ok); return ok;
}

/* ---------- selection -> quads in PDF space, one group per page ---------- */
function quads(t, range) {
  const root = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), per = new Map(); let n, text = '';
  while ((n = w.nextNode())) {
    if (!range.intersectsNode(n) || !n.parentElement || !n.parentElement.closest('.textLayer')) continue;
    const s = n === range.startContainer ? range.startOffset : 0, e = n === range.endContainer ? range.endOffset : n.length;
    if (e <= s || !n.data.slice(s, e).trim()) continue;
    const p = A.pageOf(n.parentElement); if (!p || !p.page) continue;
    const r = document.createRange(); r.setStart(n, s); r.setEnd(n, e); text += n.data.slice(s, e) + ' ';
    for (const b of r.getClientRects()) if (b.width > .5 && b.height > .5) { if (!per.has(p)) per.set(p, []); per.get(p).push({ l: b.left, t: b.top, r: b.right, b: b.bottom }); }
  }
  const out = new Map();
  for (const [p, rs] of per) {
    rs.sort((a, b) => (a.t + a.b) / 2 - (b.t + b.b) / 2 || a.l - b.l);
    const lines = [];
    for (const q of rs) {                                  // join pieces of the same line into one box
      const h = q.b - q.t, L = lines[lines.length - 1];
      if (L && Math.min(L.b, q.b) - Math.max(L.t, q.t) > .5 * Math.min(h, L.b - L.t) && q.l - L.r < 1.2 * h && q.r - L.l > -h) { L.l = Math.min(L.l, q.l); L.r = Math.max(L.r, q.r); L.t = Math.min(L.t, q.t); L.b = Math.max(L.b, q.b); }
      else lines.push(Object.assign({}, q));
    }
    const r0 = p.el.getBoundingClientRect(), v1 = p.page.getViewport({ scale: 1, rotation: A.rotOf(t, p) }), vp = p.page.getViewport({ scale: r0.width / v1.width, rotation: A.rotOf(t, p) });
    const pt = (x, y) => vp.convertToPdfPoint(x - r0.left, y - r0.top).map(v => Math.round(v * 100) / 100);
    out.set(p.i, lines.map(L => [...pt(L.l, L.t), ...pt(L.r, L.t), ...pt(L.l, L.b), ...pt(L.r, L.b)]));   // TL, TR, BL, BR (the order Acrobat writes)
  }
  return { per: out, text: text.trim() };
}

/* ---------- write the annotations with pdf-lib ---------- */
const f2 = v => (Math.round(v * 100) / 100).toString();
function appearance(kind, qs, color) {
  const [r, g, b] = color.map(f2); let c = '';
  if (kind === 'highlight') { c = `/GS0 gs ${r} ${g} ${b} rg\n`; for (const q of qs) c += `${f2(q[0])} ${f2(q[1])} m ${f2(q[2])} ${f2(q[3])} l ${f2(q[6])} ${f2(q[7])} l ${f2(q[4])} ${f2(q[5])} l h f\n`; return c; }
  const at = kind === 'underline' ? .1 : .48;
  for (const q of qs) {
    const hx = q[0] - q[4], hy = q[1] - q[5], h = Math.hypot(hx, hy), lw = Math.max(.6, h * .07);
    c += `${r} ${g} ${b} RG ${f2(lw)} w ${f2(q[4] + hx * at)} ${f2(q[5] + hy * at)} m ${f2(q[6] + hx * at)} ${f2(q[7] + hy * at)} l S\n`;
  }
  return c;
}
function addAnnot(L, d, pageIndex, kind, color, qs, text) {
  const ctx = d.context, page = d.getPage(pageIndex), xs = qs.flatMap(q => [q[0], q[2], q[4], q[6]]), ys = qs.flatMap(q => [q[1], q[3], q[5], q[7]]);
  const rect = [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1].map(v => Math.round(v * 100) / 100);
  const res = kind === 'highlight' ? { ExtGState: { GS0: { Type: 'ExtGState', BM: 'Multiply', ca: 1, CA: 1 } } } : {};
  const ap = ctx.register(ctx.stream(appearance(kind, qs, color), { Type: 'XObject', Subtype: 'Form', BBox: rect, Resources: res }));
  const a = ctx.obj({ Type: 'Annot', Subtype: SUB[kind], Rect: rect, QuadPoints: qs.flat(), C: color, F: 4, CA: 1, AP: { N: ap }, P: page.ref,
    NM: L.PDFString.of('dilia-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)), M: L.PDFString.fromDate(new Date()), T: L.PDFHexString.fromText('Dilia PDF') });
  if (text) a.set(L.PDFName.of('Contents'), L.PDFHexString.fromText(text.slice(0, 2000)));
  page.node.addAnnot(ctx.register(a));
}
async function markSel(kind, color) {
  const t = A.T, r = selRange(); if (!t || busy) return;
  if (!r) { A.toast('Select some text first.'); return; }
  const { per, text } = quads(t, r); if (!per.size) { A.toast('Select some text first.'); return; }
  busy = true; hideBar(); hideMenu();
  try {
    let L; try { L = await window.DiliaLoadPdfLib(); } catch (e) { A.toast('The highlight tool could not be loaded.', true); return; }
    let d;
    try { d = await L.PDFDocument.load(new Uint8Array(await t.file.arrayBuffer()), { updateMetadata: false }); }
    catch (e) { A.toast(/encrypt/i.test(String(e && e.message)) ? 'This PDF is protected. Remove the protection first (Edit > Unlock), then mark the text.' : 'This PDF could not be changed. It may be damaged.', true); return; }
    for (const [i, qs] of per) addAnnot(L, d, i, kind, color || COL[kind], qs, kind === 'highlight' ? '' : '');
    const bytes = await d.save();
    const top = A.view.scrollTop, left = A.view.scrollLeft, undo = (t.undo || []).concat([{ file: t.file, dirty: t.dirty, what: NAME[kind] }]).slice(-20);
    getSelection().removeAllRanges();
    const nt = await A.openOne(new File([bytes], t.name, { type: 'application/pdf', lastModified: Date.now() }), t.handle, { replace: t, dirty: true });
    if (nt) { nt.undo = undo; A.view.scrollTop = top; A.view.scrollLeft = left; A.toast(NAME[kind] + ' added. Ctrl+Z undoes it, Ctrl+S saves it to your file.'); }
  } finally { busy = false; }
}
async function undo() {
  const t = A.T; if (!t || busy || !t.undo || !t.undo.length) return false;
  busy = true;
  try {
    const st = t.undo.slice(), last = st.pop(), top = A.view.scrollTop, left = A.view.scrollLeft;
    const nt = await A.openOne(last.file, t.handle, { replace: t, dirty: last.dirty });
    if (nt) { nt.undo = st; A.view.scrollTop = top; A.view.scrollLeft = left; A.toast(last.what + ' removed.'); }
  } finally { busy = false; }
  return true;
}

/* ---------- pages without text (APP-05) ---------- */
async function hasText(t, p) {
  t.textOk = t.textOk || {};
  if (!(p.i in t.textOk)) { try { const tc = await A.textOf(t, p.i); t.textOk[p.i] = tc.items.some(x => x.str && x.str.trim()); } catch (e) { t.textOk[p.i] = true; } }
  return t.textOk[p.i];
}
function showNote(t, p) {
  hideNote(); t.noted = t.noted || {}; if (t.noted[p.i]) return; t.noted[p.i] = 1;
  note = A.el('div', 'rnotext'); note.setAttribute('role', 'status');
  const go = A.el('button', 'btn go sm', 'Recognise text'), x = A.el('button', 'btn ghost sm', 'Close'); go.type = x.type = 'button';
  go.addEventListener('click', () => { hideNote(); A.openTool('ocr'); }); x.addEventListener('click', hideNote);
  note.append(A.el('span', '', `Page ${p.i + 1} is a picture of text, so its words can't be selected or copied. Recognise text (OCR) makes them selectable and searchable.`), go, x);
  A.app.append(note);
}
function hideNote() { if (note) { note.remove(); note = null; } }

/* ---------- right-click menu and the small bar next to a selection ---------- */
function hideMenu() { if (menu) { menu.remove(); menu = null; } }
function hideBar() { if (bar) { bar.remove(); bar = null; } }
function place(box, x, y) {
  A.app.append(box); const w = box.offsetWidth, h = box.offsetHeight;
  box.style.left = Math.max(6, Math.min(x, innerWidth - w - 6)) + 'px'; box.style.top = Math.max(6, Math.min(y, innerHeight - h - 6)) + 'px';
}
function item(label, key, fn, dis) {
  const b = A.el('button', 'rcmi'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.append(A.el('span', '', label)); if (key) b.append(A.el('kbd', '', key));
  b.disabled = !!dis; b.addEventListener('click', () => { hideMenu(); fn(); }); return b;
}
function swatches(cls) {
  const d = A.el('div', cls || 'rcsw'); d.setAttribute('role', 'group'); d.setAttribute('aria-label', 'Highlight colour');
  HCOL.forEach(([n, c]) => { const b = A.el('button', 'rswb'); b.type = 'button'; b.title = 'Highlight ' + n.toLowerCase(); b.setAttribute('aria-label', b.title); b.dataset.c = n.toLowerCase(); b.addEventListener('click', () => { hideMenu(); markSel('highlight', c); }); d.append(b); });
  return d;
}
async function openMenu(e) {
  const t = A.T; if (!t) return;
  const p = A.pageOf(e.target), r = selRange();
  e.preventDefault(); hideMenu(); hideBar();
  menu = A.el('div', 'rcmenu'); menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Page menu');
  if (r) {
    const str = clean(getSelection().toString());
    menu.append(item('Copy', 'Ctrl+C', copySel), A.el('div', 'rcmh', 'Highlight'), swatches(), item('Underline', '', () => markSel('underline')), item('Strike through', '', () => markSel('strike')),
      item(`Search for "${str.length > 24 ? str.slice(0, 24) + '…' : str}"`, '', () => A.find(str.slice(0, 200))));
  } else {
    const txt = p ? await hasText(t, p) : true;
    if (p && !txt) menu.append(A.el('div', 'rcmh', 'This page has no selectable text'), item('Recognise text (OCR)', '', () => A.openTool('ocr')));
    else menu.append(item('Copy', 'Ctrl+C', copySel, true), item('Select all text on this page', '', () => selectPage(p), !p));
  }
  if (t.undo && t.undo.length) menu.append(item('Undo ' + t.undo[t.undo.length - 1].what.toLowerCase(), 'Ctrl+Z', undo));
  menu.append(A.el('hr'), item('Edit text and images', '', () => A.openTool('edit')), item('Print…', 'Ctrl+P', () => A.print()));
  place(menu, e.clientX, e.clientY);
  const first = menu.querySelector('button:not([disabled])'); if (first) first.focus();
}
function selectPage(p) { if (!p) return; const s = getSelection(), r = document.createRange(); r.selectNodeContents(p.tl); s.removeAllRanges(); s.addRange(r); showBar(); }
function showBar() {
  hideBar(); const r = selRange(); if (!r || busy) return;
  const rs = r.getClientRects(), b = rs.length ? rs[rs.length - 1] : r.getBoundingClientRect(); if (!b || (!b.width && !b.height)) return;
  bar = A.el('div', 'rqbar'); bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Selected text');
  const mk = (label, fn, cls) => { const x = A.el('button', 'rqb' + (cls ? ' ' + cls : ''), label); x.type = 'button'; x.addEventListener('mousedown', ev => ev.preventDefault()); x.addEventListener('click', fn); return x; };
  bar.append(mk('Copy', () => { copySel(); hideBar(); }), mk('Highlight', () => markSel('highlight'), 'hl'), mk('Underline', () => markSel('underline'), 'ul'), mk('Strike', () => markSel('strike'), 'st'));
  const vr = A.view.getBoundingClientRect();
  place(bar, Math.min(b.right, vr.right - 10) - 150, Math.min(b.bottom + 8, vr.bottom - 44));
}

function init(api) {
  A = api;
  document.addEventListener('copy', e => { const r = selRange(); if (!r || !e.clipboardData) return; e.preventDefault(); e.clipboardData.setData('text/plain', clean(getSelection().toString())); });
  addEventListener('keydown', e => {
    const c = e.ctrlKey || e.metaKey, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || A.dlg.open;
    if (e.key === 'Escape' && (menu || bar)) { hideMenu(); hideBar(); return; }
    if (typing || !c || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'c' && !e.shiftKey && selRange()) { e.preventDefault(); e.stopImmediatePropagation(); copySel(); }
    else if (k === 'z' && !e.shiftKey && A.T && A.T.undo && A.T.undo.length) { e.preventDefault(); e.stopImmediatePropagation(); undo(); }
  }, true);
  A.view.addEventListener('contextmenu', e => { if (A.view.classList.contains('measuring')) return; openMenu(e); });
  A.view.addEventListener('mouseup', e => { if (e.button === 0) setTimeout(() => { if (selRange()) showBar(); }, 0); });
  A.view.addEventListener('mousedown', async e => {
    if (e.button !== 0 || A.view.classList.contains('measuring')) return;
    if (bar && !bar.contains(e.target)) hideBar();
    const t = A.T, p = A.pageOf(e.target); if (!t || !p) return;
    if (!(await hasText(t, p))) showNote(t, p);
  });
  A.view.addEventListener('scroll', () => { hideMenu(); hideBar(); }, { passive: true });
  document.addEventListener('mousedown', e => { if (menu && !menu.contains(e.target)) hideMenu(); });
  document.addEventListener('selectionchange', () => { if (bar && !selRange()) hideBar(); });
  addEventListener('blur', hideMenu); addEventListener('resize', () => { hideMenu(); hideBar(); });
}
return { init, _test: { quads: r => quads(A.T, r), appearance, clean } };
})();
