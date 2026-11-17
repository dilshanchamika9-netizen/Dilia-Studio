/* Dilia Studio editor: edit text, add text / images / shapes / drawing, sign, highlight, notes, fill forms.
   Positions are stored in "view points": the page as it is shown (rotation applied), 1 unit = 1 PDF point, origin top-left. */
{
const { $, kb, plural, esc, toast, save, cleanName } = Kit;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js';

const START = document.body.dataset.tool;              // edit | add | forms | sign | annotate
const ws = $('#ws'), pick = $('#pick'), go = $('#go'), note = $('#note'), prog = $('#prog'), outName = $('#outName');
const pagesEl = $('#pages'), propsEl = $('#props'), board = $('#board');

let doc = null;            // {name,size,bytes,lib,js,count}
let pv = [];               // per page: {vp (pdf.js viewport scale 1), w, h, rot, el, layer, canvas, done, text}
let objs = [];             // {id,p,type,x,y,w,h,...}
let fields = [];           // form widgets from pdf.js
let formVals = {};         // name -> value (only changed fields)
const imgs = new Map();    // imgId -> {url, bytes, kind, w, h}
let tool = 'select', sel = null, editing = null, S = 1, zoom = 1, seq = 0, busy = false, lastUrl = null, dirty = false;
let hist = [], fut = [];

/* ---------- fonts (metrics come from pdf-lib so the saved file matches the screen) ---------- */
const FAM = {
  helv:  { css: 'Helvetica, Arial, "Liberation Sans", sans-serif', base: .93, std: ['Helvetica', 'HelveticaBold'] },
  times: { css: '"Times New Roman", Times, "Liberation Serif", serif', base: .92, std: ['TimesRoman', 'TimesRomanBold'] },
  cour:  { css: '"Courier New", Courier, "Liberation Mono", monospace', base: .86, std: ['Courier', 'CourierBold'] }
};
const metric = {};
PDFLib.PDFDocument.create().then(async d => {
  for (const f in FAM) for (const k of FAM[f].std) metric[k] = await d.embedFont(PDFLib.StandardFonts[k]);
  layoutAll();
});
const fontKey = o => FAM[o.fam].std[o.bold ? 1 : 0];
const LH = 1.2;
function textBox(o) {                  // width/height of a text object in points
  const f = metric[fontKey(o)], lines = o.text.split('\n');
  let w = 0;
  for (const l of lines) { try { w = Math.max(w, f ? f.widthOfTextAtSize(l, o.size) : l.length * o.size * .55); } catch (e) { w = Math.max(w, l.length * o.size * .6); } }
  return { w: Math.max(w, o.size * .6), h: lines.length * o.size * LH };
}
function badChars(o) {
  const f = metric[fontKey(o)]; if (!f) return '';
  const bad = new Set();
  for (const ch of o.text.replace(/\n/g, '')) { try { f.encodeText(ch); } catch (e) { bad.add(ch); } }
  return [...bad].join(' ');
}

/* ---------- history ---------- */
const snap = () => JSON.stringify({ objs, formVals });
function commit() { hist.push(snap()); if (hist.length > 80) hist.shift(); fut = []; dirty = true; clearDone(); }
function restore(s) { const d = JSON.parse(s); objs = d.objs; formVals = d.formVals; sel = null; editing = null; drawObjs(); drawFields(); props(); summary(); }
function undo() { if (!hist.length) return; fut.push(snap()); restore(hist.pop()); }
function redo() { if (!fut.length) return; hist.push(snap()); restore(fut.pop()); }

/* ---------- loading ---------- */
async function load(list) {
  const pdfs = [...list].filter(Kit.isPdf);
  if (!pdfs.length) { toast('That is not a PDF. Choose a file ending in .pdf.', true); return; }
  if (dirty && doc && !confirm('Open a different PDF? Changes you have not downloaded will be lost.')) return;
  ws.classList.add('working');
  const r = await Kit.openPdf(pdfs[0]);
  if (r.err) { ws.classList.remove('working'); toast(r.err, true); return; }
  if (!r.js) { ws.classList.remove('working'); toast(`${r.name} could not be shown. It may be damaged.`, true); return; }
  if (doc && doc.js) doc.js.destroy();
  doc = r; objs = []; formVals = {}; fields = []; hist = []; fut = []; sel = null; editing = null; dirty = false;
  imgs.forEach(i => URL.revokeObjectURL(i.url)); imgs.clear();
  pv = [];
  for (let i = 0; i < doc.count; i++) {
    const page = await doc.js.getPage(i + 1), vp = page.getViewport({ scale: 1 });
    pv.push({ page, vp, w: vp.width, h: vp.height, rot: vp.rotation, done: 0, text: null });
    try {
      for (const a of await page.getAnnotations()) {
        if (a.subtype !== 'Widget' || !a.fieldName || a.readOnly || a.hidden || a.pushButton) continue;
        if (!['Tx', 'Btn', 'Ch'].includes(a.fieldType)) continue;
        const [x1, y1, x2, y2] = vp.convertToViewportRectangle(a.rect);
        fields.push({ p: i, a, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
      }
    } catch (e) { /* no form data */ }
  }
  ws.classList.remove('working');
  outName.value = doc.name.replace(/\.pdf$/i, '');
  clearDone(); build();
  setTool(START === 'redact' ? 'redact' : START === 'edit' ? 'edit' : START === 'sign' ? 'select' : START === 'annotate' ? 'highlight' : START === 'add' ? 'text' : 'select');
  if (START === 'forms') toast(fields.length ? `${plural(fields.length, 'field')} found. Click a field to fill it in.` : 'This PDF has no fillable fields. Use Text to type anywhere on the page.', !fields.length);
  if (START === 'sign') openSign();
}

/* ---------- page frames ---------- */
function fitScale() {
  const avail = Math.max(240, pagesEl.clientWidth - 8), maxW = Math.max(...pv.map(p => p.w));
  return Math.min(1.6, avail / maxW);
}
function build() {
  ws.dataset.state = doc ? 'full' : 'empty';
  pagesEl.innerHTML = '';
  if (!doc) { props(); summary(); return; }
  pv.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'epage'; el.dataset.p = i;
    el.innerHTML = `<canvas></canvas><div class="layer" data-p="${i}"></div><span class="pnum">${i + 1} / ${pv.length}</span>`;
    pagesEl.append(el);
    p.el = el; p.canvas = el.querySelector('canvas'); p.layer = el.querySelector('.layer'); p.done = 0;
    seen.observe(el);
  });
  layoutAll(); summary();
}
function layoutAll() {
  if (!doc || !pv.length || !pv[0].el) return;
  S = fitScale() * zoom;
  $('#zv').textContent = Math.round(zoom * 100) + '%';
  pv.forEach(p => { p.el.style.width = p.w * S + 'px'; p.el.style.height = p.h * S + 'px'; if (p.vis) paintPage(p); });
  drawObjs(); drawFields(); drawTextHits();
}
const seen = new IntersectionObserver(es => es.forEach(e => {
  const p = pv[+e.target.dataset.p]; if (!p) return;
  p.vis = e.isIntersecting;
  if (p.vis) { paintPage(p); if (tool === 'edit') loadText(p); }
}), { rootMargin: '600px 0px' });
async function paintPage(p) {
  const want = S * Math.min(2, devicePixelRatio || 1);
  if (p.done === want || p.busy) return;
  p.busy = true;
  try {
    const vp = p.page.getViewport({ scale: want }), c = document.createElement('canvas');
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    await p.page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    p.canvas.width = c.width; p.canvas.height = c.height; p.canvas.getContext('2d').drawImage(c, 0, 0);
    p.done = want;
  } catch (e) { /* keep blank */ }
  p.busy = false;
  if (p.done !== S * Math.min(2, devicePixelRatio || 1)) paintPage(p);
}

/* ---------- objects on screen ---------- */
const STYLE_SHAPE = { highlight: 'hl', whiteout: 'wo', box: 'bx', redact: 'rd' };
function objHTML(o) {
  const st = `left:${o.x * S}px;top:${o.y * S}px;width:${o.w * S}px;height:${o.h * S}px`;
  const sel_ = o.id === sel ? ' sel' : '', handle = o.id === sel && o.type !== 'text' && o.type !== 'note' ? '<i class="rh" data-h="1"></i>' : '';
  if (o.type === 'text') {
    const bad = badChars(o);
    return `<div class="obj otext${sel_}${bad ? ' bad' : ''}" data-id="${o.id}" style="${st};font:${o.bold ? 700 : 400} ${o.size * S}px/${LH} ${FAM[o.fam].css};color:${o.color}"><div class="tx" spellcheck="false">${esc(o.text)}</div></div>`;
  }
  if (o.type === 'image' || o.type === 'sign') return `<div class="obj oimg${sel_}" data-id="${o.id}" style="${st}"><img src="${imgs.get(o.img).url}" alt="" draggable="false">${handle}</div>`;
  if (o.type === 'draw') {
    const d = o.pts.map((q, k) => (k ? 'L' : 'M') + ((q[0] - o.x) * S).toFixed(1) + ' ' + ((q[1] - o.y) * S).toFixed(1)).join('');
    return `<div class="obj odraw${sel_}" data-id="${o.id}" style="${st}"><svg width="${o.w * S}" height="${o.h * S}" style="overflow:visible"><path d="${d}" fill="none" stroke="${o.color}" stroke-width="${o.lw * S}" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
  }
  if (o.type === 'note') return `<div class="obj onote${sel_}" data-id="${o.id}" style="left:${o.x * S}px;top:${o.y * S}px" title="${esc(o.text)}"><svg viewBox="0 0 24 24"><path d="M4 4h16v12H9l-5 4z" fill="#ffc400" stroke="#0b1220" stroke-width="1.5" stroke-linejoin="round"/></svg></div>`;
  const c = o.type === 'box' ? `border:${Math.max(1, o.lw * S)}px solid ${o.color}` : o.type === 'highlight' ? `background:${o.color}` : o.type === 'redact' ? 'background:#000' : '';
  return `<div class="obj oshape ${STYLE_SHAPE[o.type]}${sel_}" data-id="${o.id}" style="${st};${c}">${handle}</div>`;
}
function drawObjs() {
  if (!doc) return;
  pv.forEach((p, i) => {
    p.layer.querySelectorAll('.obj').forEach(e => e.remove());
    p.layer.insertAdjacentHTML('beforeend', objs.filter(o => o.p === i).map(objHTML).join(''));
  });
  if (editing) startEdit(editing, true);
}
function redrawOne(o) {
  const el = pv[o.p].layer.querySelector(`.obj[data-id="${o.id}"]`);
  if (!el) return drawObjs();
  el.outerHTML = objHTML(o);
}
const objOf = id => objs.find(o => o.id === id);

/* ---------- form fields on screen ---------- */
function fieldVal(f) {
  const n = f.a.fieldName;
  if (n in formVals) return formVals[n];
  if (f.a.checkBox) return !!f.a.fieldValue && f.a.fieldValue !== 'Off' && (!f.a.exportValue || f.a.fieldValue === f.a.exportValue);
  if (f.a.radioButton) return f.a.fieldValue;
  if (f.a.fieldType === 'Ch') return Array.isArray(f.a.fieldValue) ? f.a.fieldValue[0] || '' : f.a.fieldValue || '';
  return f.a.fieldValue || '';
}
function drawFields() {
  if (!doc) return;
  pv.forEach(p => p.layer.querySelectorAll('.fld').forEach(e => e.remove()));
  fields.forEach((f, k) => {
    const a = f.a, st = `left:${f.x * S}px;top:${f.y * S}px;width:${f.w * S}px;height:${f.h * S}px;font-size:${Math.max(8, Math.min(f.h * S * .62, 16 * S))}px`;
    const v = fieldVal(f); let h;
    if (a.checkBox) h = `<input class="fld" type="checkbox" data-k="${k}" style="${st}"${v ? ' checked' : ''} aria-label="${esc(a.alternativeText || a.fieldName)}">`;
    else if (a.radioButton) h = `<input class="fld" type="radio" name="r_${esc(a.fieldName)}" data-k="${k}" style="${st}"${v === a.buttonValue ? ' checked' : ''} aria-label="${esc(a.alternativeText || a.fieldName)}">`;
    else if (a.fieldType === 'Ch') h = `<select class="fld" data-k="${k}" style="${st}" aria-label="${esc(a.alternativeText || a.fieldName)}"><option value=""></option>${(a.options || []).map(o => `<option value="${esc(o.exportValue)}"${o.exportValue === v || o.displayValue === v ? ' selected' : ''}>${esc(o.displayValue)}</option>`).join('')}</select>`;
    else if (a.multiLine) h = `<textarea class="fld" data-k="${k}" style="${st}" aria-label="${esc(a.alternativeText || a.fieldName)}"${a.maxLen ? ` maxlength="${a.maxLen}"` : ''}>${esc(v)}</textarea>`;
    else h = `<input class="fld" type="text" data-k="${k}" style="${st}" value="${esc(v)}" aria-label="${esc(a.alternativeText || a.fieldName)}"${a.maxLen ? ` maxlength="${a.maxLen}"` : ''}>`;
    pv[f.p].layer.insertAdjacentHTML('afterbegin', h);
  });
}
pagesEl.addEventListener('focusin', e => { if (e.target.classList.contains('fld') && !e.target._c) { e.target._c = 1; commit(); } });
pagesEl.addEventListener('focusout', e => { if (e.target.classList.contains('fld')) e.target._c = 0; });
pagesEl.addEventListener('input', e => {
  const t = e.target; if (!t.classList.contains('fld')) return;
  const f = fields[+t.dataset.k], a = f.a;
  if (a.checkBox) formVals[a.fieldName] = t.checked;
  else if (a.radioButton) formVals[a.fieldName] = a.buttonValue;
  else formVals[a.fieldName] = t.value;
  dirty = true; clearDone(); summary();
});
pagesEl.addEventListener('change', e => { if (e.target.classList.contains('fld')) e.target.dispatchEvent(new Event('input', { bubbles: true })); });

/* ---------- existing text, for Edit text ---------- */
async function loadText(p) {
  if (p.text) return;
  p.text = [];
  try {
    const tc = await p.page.getTextContent();
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const t = pdfjsLib.Util.transform(p.vp.transform, it.transform);
      if (Math.abs(t[1]) > .01 || Math.abs(t[2]) > .01 || t[0] <= 0) continue;            // only straight, upright text
      const fh = Math.hypot(t[2], t[3]) || Math.abs(t[3]);
      const style = tc.styles[it.fontName] || {};
      let bold = false;
      try { const fo = p.page.commonObjs.has(it.fontName) && p.page.commonObjs.get(it.fontName); bold = !!fo && /bold|black|heavy|semibold/i.test(fo.name || ''); } catch (e) { /* unknown */ }
      p.text.push({ str: it.str, x: t[4], base: t[5], w: it.width * p.vp.scale, size: fh,
        fam: /mono/i.test(style.fontFamily) ? 'cour' : /serif/i.test(style.fontFamily) && !/sans/i.test(style.fontFamily) ? 'times' : 'helv', bold });
    }
  } catch (e) { /* no text */ }
  drawTextHits();
}
function drawTextHits() {
  pv.forEach((p, i) => {
    if (!p.layer) return;
    p.layer.querySelectorAll('.thit').forEach(e => e.remove());
    if (tool !== 'edit' || !p.text) return;
    p.layer.insertAdjacentHTML('afterbegin', p.text.map((t, k) => t.used ? '' :
      `<div class="thit" data-t="${k}" style="left:${t.x * S}px;top:${(t.base - t.size * .9) * S}px;width:${t.w * S}px;height:${t.size * 1.15 * S}px" title="Click to edit"></div>`).join(''));
  });
}
function editExisting(p, k) {
  const t = pv[p].text[k]; if (!t || t.used) return;
  commit();
  t.used = true;
  const pad = t.size * .08;
  objs.push({ id: 'o' + (++seq), p, type: 'whiteout', x: t.x - pad, y: t.base - t.size * .92, w: t.w + pad * 2, h: t.size * 1.2, color: '#ffffff' });
  const o = { id: 'o' + (++seq), p, type: 'text', text: t.str, size: Math.round(t.size * 10) / 10, fam: t.fam, bold: t.bold, color: '#000000', x: t.x, y: t.base - t.size * FAM[t.fam].base };
  Object.assign(o, textBox(o)); objs.push(o);
  sel = o.id; drawObjs(); drawTextHits(); startEdit(o.id); props(); summary();
}

/* ---------- tools ---------- */
const STAY = ['highlight', 'box', 'whiteout', 'draw', 'edit'];
function setTool(t) {
  if (t === 'image') { $('#imgPick').click(); return; }
  if (t === 'sign') { openSign(); return; }
  tool = t;
  document.querySelectorAll('.etool[data-t]').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === t));
  ws.dataset.tool = t;
  if (t === 'edit') pv.forEach(p => { if (p.vis) loadText(p); });
  drawTextHits();
  if (!sel) props();
}
const TIPS = {
    select: 'Click something to select it. Drag to move. Double-click text to change it.',
    edit: 'Click any line of text in the PDF to change it.', text: 'Click on the page where the text should go.',
    highlight: 'Drag across what you want to highlight.', box: 'Drag to draw a box.', whiteout: 'Drag over anything you want to cover with white.',
    draw: 'Draw with your mouse, pen or finger.', note: 'Click where the note should go.',
    redact: 'Drag over what must disappear for good. Or search for a word above to mark every match.'
};
document.querySelectorAll('.etool[data-t]').forEach(b => b.addEventListener('click', () => { endEdit(); setTool(b.dataset.t); }));

function pagePoint(e, layer) { const r = layer.getBoundingClientRect(); return [(e.clientX - r.left) / S, (e.clientY - r.top) / S]; }
let drag = null;
const DEF = { highlight: { color: '#ffe500', w: 140, h: 16 }, box: { color: '#e5007d', w: 140, h: 80, lw: 2 }, whiteout: { color: '#ffffff', w: 140, h: 24 }, redact: { color: '#000000', w: 140, h: 20 } };

pagesEl.addEventListener('pointerdown', e => {
  if (!doc || e.button > 0) return;
  const layer = e.target.closest('.layer'); if (!layer) return;
  const p = +layer.dataset.p, [x, y] = pagePoint(e, layer);
  if (e.target.classList.contains('fld')) return;
  const hit = e.target.closest('.thit');
  if (hit && tool === 'edit') { e.preventDefault(); editExisting(p, +hit.dataset.t); setTool('select'); return; }
  const oel = e.target.closest('.obj');
  if (oel && (tool === 'select' || tool === 'edit' || tool === 'text')) {
    const o = objOf(oel.dataset.id);
    if (editing === o.id) return;                                      // typing inside text
    endEdit();
    const wasSel = sel === o.id;
    if (!wasSel) { sel = o.id; drawObjs(); props(); }
    drag = { kind: e.target.dataset.h ? 'resize' : 'move', wasSel, o, x0: x, y0: y, ox: o.x, oy: o.y, ow: o.w, oh: o.h, moved: false, layer };
    layer.setPointerCapture(e.pointerId);
    e.preventDefault(); return;
  }
  endEdit();
  if (tool === 'select' || tool === 'edit') { if (sel) { sel = null; drawObjs(); props(); } return; }
  e.preventDefault();
  if (tool === 'text') {
    commit();
    const o = { id: 'o' + (++seq), p, type: 'text', text: '', size: 14, fam: 'helv', bold: false, color: '#0b1220', x, y: y - 14 * .6 };
    Object.assign(o, textBox(o)); objs.push(o); sel = o.id; drawObjs(); startEdit(o.id); setTool('select'); props(); summary(); return;
  }
  if (tool === 'note') {
    commit();
    const o = { id: 'o' + (++seq), p, type: 'note', text: '', x: x - 10, y: y - 10, w: 20, h: 20 };
    objs.push(o); sel = o.id; drawObjs(); setTool('select'); props(); summary();
    setTimeout(() => $('#pNote') && $('#pNote').focus(), 30); return;
  }
  commit();
  if (tool === 'draw') {
    const o = { id: 'o' + (++seq), p, type: 'draw', pts: [[x, y]], color: lastDraw.color, lw: lastDraw.lw, x, y, w: 0, h: 0 };
    objs.push(o); drag = { kind: 'draw', o, layer }; layer.setPointerCapture(e.pointerId); drawObjs(); return;
  }
  const d = DEF[tool], o = { id: 'o' + (++seq), p, type: tool, x, y, w: 0, h: 0, color: tool === 'box' ? lastBox : d.color, lw: d.lw || 0 };
  objs.push(o); drag = { kind: 'rect', o, x0: x, y0: y, layer }; layer.setPointerCapture(e.pointerId); drawObjs();
});
pagesEl.addEventListener('pointermove', e => {
  if (!drag) return;
  const [x, y] = pagePoint(e, drag.layer), o = drag.o, P = pv[o.p];
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  if (drag.kind === 'move') {
    if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) * S < 3) return;
    if (!drag.moved) { commit(); drag.moved = true; }
    const dx = x - drag.x0, dy = y - drag.y0;
    if (o.type === 'draw') { const nx = cl(drag.ox + dx, -o.w / 2, P.w - o.w / 2), ny = cl(drag.oy + dy, -o.h / 2, P.h - o.h / 2); o.pts = o.pts.map(q => [q[0] + nx - o.x, q[1] + ny - o.y]); o.x = nx; o.y = ny; }
    else { o.x = cl(drag.ox + dx, -o.w / 2, P.w - o.w / 2); o.y = cl(drag.oy + dy, -o.h / 2, P.h - o.h / 2); }
    const el = P.layer.querySelector(`.obj[data-id="${o.id}"]`); if (el) { el.style.left = o.x * S + 'px'; el.style.top = o.y * S + 'px'; }
  } else if (drag.kind === 'resize') {
    if (!drag.moved) { commit(); drag.moved = true; }
    let w = Math.max(8, drag.ow + x - drag.x0), h = Math.max(6, drag.oh + y - drag.y0);
    if (o.type === 'image' || o.type === 'sign') h = w * drag.oh / drag.ow;
    if (o.type === 'draw') { const k = w / drag.ow; o.pts = o.pts.map(q => [o.x + (q[0] - o.x) * k / (o.w / drag.ow), o.y + (q[1] - o.y) * k / (o.w / drag.ow)]); h = drag.oh * k; }
    o.w = w; o.h = h; redrawOne(o);
  } else if (drag.kind === 'rect') {
    o.x = Math.min(x, drag.x0); o.y = Math.min(y, drag.y0); o.w = Math.abs(x - drag.x0); o.h = Math.abs(y - drag.y0); redrawOne(o);
  } else if (drag.kind === 'draw') {
    const last = o.pts[o.pts.length - 1];
    if (Math.hypot(x - last[0], y - last[1]) * S < 1.5) return;
    o.pts.push([x, y]);
    const xs = o.pts.map(q => q[0]), ys = o.pts.map(q => q[1]);
    o.x = Math.min(...xs); o.y = Math.min(...ys); o.w = Math.max(...xs) - o.x; o.h = Math.max(...ys) - o.y; redrawOne(o);
  }
});
function endDrag() {
  if (!drag) return;
  const o = drag.o;
  if (drag.kind === 'rect' && o.w * S < 6 && o.h * S < 6) { const d = DEF[o.type]; o.w = d.w; o.h = d.h; o.y -= d.h / 2; }
  if (drag.kind === 'draw' && o.pts.length < 2) { o.pts.push([o.pts[0][0] + .5, o.pts[0][1] + .5]); o.w = o.h = .5; }
  if (drag.kind === 'rect' || drag.kind === 'draw') { sel = o.id; }
  if (drag.kind === 'move' && !drag.moved && o.type === 'text' && drag.wasSel) startEdit(o.id);
  drag = null; drawObjs(); props(); summary();
}
pagesEl.addEventListener('pointerup', endDrag);
pagesEl.addEventListener('pointercancel', endDrag);
pagesEl.addEventListener('dblclick', e => { const el = e.target.closest('.obj.otext'); if (el) startEdit(el.dataset.id); });

/* ---------- typing text ---------- */
function startEdit(id, again) {
  const o = objOf(id); if (!o || o.type !== 'text') return;
  const el = pv[o.p].layer.querySelector(`.obj[data-id="${id}"] .tx`); if (!el) return;
  if (!again) commit();
  editing = id; el.contentEditable = 'plaintext-only';
  if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
  el.closest('.obj').classList.add('editing');
  el.focus();
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function endEdit() {
  if (!editing) return;
  const o = objOf(editing); editing = null;
  if (o && !o.text.trim()) { objs = objs.filter(x => x !== o); if (sel === o.id) sel = null; }
  drawObjs(); props(); summary();
}
pagesEl.addEventListener('input', e => {
  const tx = e.target.closest('.tx'); if (!tx) return;
  const o = objOf(tx.closest('.obj').dataset.id);
  o.text = tx.innerText.replace(/\r/g, '').replace(/\n$/, '');
  Object.assign(o, textBox(o));
  const el = tx.closest('.obj'); el.style.width = o.w * S + 'px'; el.style.height = o.h * S + 'px';
  el.classList.toggle('bad', !!badChars(o)); props(true); summary();
});
pagesEl.addEventListener('keydown', e => { if (e.target.closest('.tx') && e.key === 'Escape') { e.preventDefault(); endEdit(); } });

/* ---------- keyboard ---------- */
addEventListener('keydown', e => {
  if (!doc) return;
  const typing = e.target.closest && (e.target.closest('.tx') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName));
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
  if (typing || !sel) return;
  const o = objOf(sel); if (!o) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); }
  const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (mv) { e.preventDefault(); commit(); const k = e.shiftKey ? 10 : 1; o.x += mv[0] * k; o.y += mv[1] * k; if (o.pts) o.pts = o.pts.map(q => [q[0] + mv[0] * k, q[1] + mv[1] * k]); redrawOne(o); }
  if (e.key === 'Escape') { sel = null; drawObjs(); props(); }
});
function remove() { const o = objOf(sel); if (!o) return; commit(); objs = objs.filter(x => x !== o); sel = null; drawObjs(); props(); summary(); }
function duplicate() {
  const o = objOf(sel); if (!o) return; commit();
  const c = JSON.parse(JSON.stringify(o)); c.id = 'o' + (++seq); c.x += 12; c.y += 12; if (c.pts) c.pts = c.pts.map(q => [q[0] + 12, q[1] + 12]);
  objs.push(c); sel = c.id; drawObjs(); props(); summary();
}

/* ---------- properties of the selected item ---------- */
const COLS = ['#0b1220', '#e5007d', '#009fe3', '#00a88f', '#ff5a36', '#7a5cff'];
const HCOLS = ['#ffe500', '#8ef0a8', '#7fd6ff', '#ffb3d9'];
let lastBox = '#e5007d', lastDraw = { color: '#0b1220', lw: 2 };
function sw(list, cur) { return `<span class="pc">${list.map(c => `<button type="button" class="pcol${c.toLowerCase() === (cur || '').toLowerCase() ? ' on' : ''}" data-col="${c}" style="--k:${c}" aria-label="Colour ${c}"></button>`).join('')}<input type="color" data-col="custom" value="${cur && cur.length === 7 ? cur : '#000000'}" aria-label="Other colour"></span>`; }
function props(soft) {
  const o = sel && objOf(sel);
  propsEl.classList.toggle('on', !!o);
  if (!o) { propsEl.innerHTML = `<span class="ptip">${esc(TIPS[tool] || '')}</span>`; return; }
  if (soft && o.type === 'text') { const b = badChars(o); const w = $('#pWarn'); if (w) { w.hidden = !b; w.textContent = b ? `Not supported: ${b}` : ''; } return; }
  const label = { text: 'Text', image: 'Image', sign: 'Signature', highlight: 'Highlight', box: 'Box', whiteout: 'White-out', redact: 'Redaction', draw: 'Drawing', note: 'Note' }[o.type];
  let h = `<b class="pt">${label}</b>`;
  if (o.type === 'text') {
    const b = badChars(o);
    h += `<select class="dd sm" id="pFam" aria-label="Font"><option value="helv"${o.fam === 'helv' ? ' selected' : ''}>Sans</option><option value="times"${o.fam === 'times' ? ' selected' : ''}>Serif</option><option value="cour"${o.fam === 'cour' ? ' selected' : ''}>Mono</option></select>
      <span class="name sz"><input id="pSize" type="number" min="4" max="200" step="1" value="${Math.round(o.size)}" aria-label="Size"><em>pt</em></span>
      <button type="button" class="pbtn${o.bold ? ' on' : ''}" id="pBold" aria-pressed="${o.bold}"><b>B</b></button>${sw(COLS, o.color)}
      <span class="pwarn" id="pWarn"${b ? '' : ' hidden'}>${b ? 'Not supported: ' + esc(b) : ''}</span>`;
  } else if (o.type === 'highlight') h += sw(HCOLS, o.color);
  else if (o.type === 'box') h += sw(COLS, o.color) + `<select class="dd sm" id="pLw" aria-label="Line"><option value="1"${o.lw == 1 ? ' selected' : ''}>Thin</option><option value="2"${o.lw == 2 ? ' selected' : ''}>Medium</option><option value="4"${o.lw == 4 ? ' selected' : ''}>Thick</option></select>`;
  else if (o.type === 'draw') h += sw(COLS, o.color) + `<select class="dd sm" id="pLw" aria-label="Line"><option value="1"${o.lw == 1 ? ' selected' : ''}>Thin</option><option value="2"${o.lw == 2 ? ' selected' : ''}>Medium</option><option value="4"${o.lw == 4 ? ' selected' : ''}>Thick</option></select>`;
  else if (o.type === 'note') h += `<span class="name grow"><input id="pNote" type="text" maxlength="500" placeholder="Type your note" value="${esc(o.text)}"></span>`;
  h += `<span class="pgap"></span>${o.type !== 'note' ? '<button type="button" class="pbtn" id="pDup">Duplicate</button>' : ''}<button type="button" class="pbtn del" id="pDel">Delete</button>`;
  propsEl.innerHTML = h;
}
propsEl.addEventListener('click', e => {
  const o = objOf(sel); if (!o) return;
  const c = e.target.closest('.pcol');
  if (c) { commit(); o.color = c.dataset.col; if (o.type === 'box') lastBox = o.color; if (o.type === 'draw') lastDraw.color = o.color; redrawOne(o); props(); }
  if (e.target.closest('#pBold')) { commit(); o.bold = !o.bold; Object.assign(o, textBox(o)); redrawOne(o); props(); summary(); }
  if (e.target.closest('#pDel')) remove();
  if (e.target.closest('#pDup')) duplicate();
});
propsEl.addEventListener('change', e => {
  const o = objOf(sel); if (!o) return;
  const t = e.target;
  if (t.type === 'color') { commit(); o.color = t.value; redrawOne(o); props(); return; }
  if (t.id === 'pFam') { commit(); o.fam = t.value; Object.assign(o, textBox(o)); }
  if (t.id === 'pSize') { const v = Math.max(4, Math.min(200, +t.value || o.size)); commit(); o.size = v; Object.assign(o, textBox(o)); }
  if (t.id === 'pLw') { commit(); o.lw = +t.value; if (o.type === 'draw') lastDraw.lw = o.lw; }
  redrawOne(o); props(); summary();
});
propsEl.addEventListener('input', e => {
  const o = objOf(sel); if (!o || e.target.id !== 'pNote') return;
  if (!e.target._c) { commit(); e.target._c = 1; }
  o.text = e.target.value; summary();
});

/* ---------- images ---------- */
function curPage() {
  const mid = innerHeight / 2; let best = 0, bd = 1e9;
  pv.forEach((p, i) => { const r = p.el.getBoundingClientRect(), d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid)); if (d < bd) { bd = d; best = i; } });
  return best;
}
async function toImg(blobOrFile, keepAlpha) {
  const bmp = await createImageBitmap(blobOrFile);
  const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  const x = c.getContext('2d'); if (!keepAlpha) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
  x.drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
  const blob = await new Promise(r => c.toBlob(r, keepAlpha ? 'image/png' : 'image/jpeg', .92));
  const id = 'i' + (++seq), w = c.width, h = c.height; c.width = c.height = 0;
  imgs.set(id, { url: URL.createObjectURL(blob), bytes: new Uint8Array(await blob.arrayBuffer()), kind: keepAlpha ? 'png' : 'jpg', w, h });
  return id;
}
function place(type, id, width) {
  const p = curPage(), P = pv[p], im = imgs.get(id);
  const w = Math.min(width, P.w * .8), h = w * im.h / im.w;
  const r = P.el.getBoundingClientRect(), cy = Math.max(h / 2 + 10, Math.min(P.h - h / 2 - 10, (innerHeight / 2 - r.top) / S));
  commit();
  const o = { id: 'o' + (++seq), p, type, img: id, x: (P.w - w) / 2, y: cy - h / 2, w, h };
  objs.push(o); sel = o.id; setTool('select'); drawObjs(); props(); summary();
}
$('#imgPick').addEventListener('change', async () => {
  const f = $('#imgPick').files[0]; $('#imgPick').value = '';
  if (!f || !doc) return;
  if (!/^image\//.test(f.type) || /hei[cf]/i.test(f.type)) { toast('Choose a JPG, PNG, WebP or GIF image.', true); return; }
  try { const id = await toImg(f, /png|webp|gif|avif/i.test(f.type)); const im = imgs.get(id); place('image', id, Math.min(im.w * .75, 260)); }
  catch (e) { toast(`${f.name} could not be read.`, true); }
});

/* ---------- signature ---------- */
const dlg = $('#signDlg'), pad = $('#signPad'), padX = pad.getContext('2d');
let sigMode = 'draw', sigInk = '#0b1220', sigLast = null, sigUp = null, padDirty = false;
function openSign() {
  if (!doc) return;
  if (sigLast) { $('#sigReuse').hidden = false; $('#sigPrev').src = imgs.get(sigLast).url; } else $('#sigReuse').hidden = true;
  dlg.showModal(); sigTab(sigMode); clearPad();
}
function sigTab(m) {
  sigMode = m;
  dlg.querySelectorAll('[data-sm]').forEach(b => b.setAttribute('aria-selected', b.dataset.sm === m));
  dlg.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== m);
  if (m === 'type') setTimeout(() => $('#sigName').focus(), 20);
  if (m === 'draw') sizePad();
  sigOk();
}
function sizePad() { const r = pad.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (!r.width) return; pad.width = r.width * d; pad.height = r.height * d; padX.setTransform(d, 0, 0, d, 0, 0); clearPad(); }
function clearPad() { padX.clearRect(0, 0, pad.width, pad.height); padDirty = false; sigOk(); }
function sigOk() { $('#sigAdd').disabled = sigMode === 'draw' ? !padDirty : sigMode === 'type' ? !$('#sigName').value.trim() : !sigUp; }
dlg.querySelectorAll('[data-sm]').forEach(b => b.addEventListener('click', () => sigTab(b.dataset.sm)));
dlg.querySelectorAll('[data-ink]').forEach(b => b.addEventListener('click', () => { sigInk = b.dataset.ink; dlg.querySelectorAll('[data-ink]').forEach(x => x.classList.toggle('on', x === b)); $('#sigName').style.color = sigInk; }));
let pen = null;
pad.addEventListener('pointerdown', e => { pad.setPointerCapture(e.pointerId); const r = pad.getBoundingClientRect(); pen = [e.clientX - r.left, e.clientY - r.top]; padX.fillStyle = sigInk; padX.beginPath(); padX.arc(pen[0], pen[1], 1.3, 0, 7); padX.fill(); padDirty = true; sigOk(); });
pad.addEventListener('pointermove', e => {
  if (!pen) return; const r = pad.getBoundingClientRect(), q = [e.clientX - r.left, e.clientY - r.top];
  padX.strokeStyle = sigInk; padX.lineWidth = 2.6; padX.lineCap = 'round'; padX.lineJoin = 'round';
  padX.beginPath(); padX.moveTo(pen[0], pen[1]); padX.lineTo(q[0], q[1]); padX.stroke(); pen = q;
});
pad.addEventListener('pointerup', () => { pen = null; });
$('#sigClear').addEventListener('click', clearPad);
$('#sigName').addEventListener('input', sigOk);
$('#sigFile').addEventListener('change', () => { sigUp = $('#sigFile').files[0] || null; $('#sigFileName').textContent = sigUp ? sigUp.name : 'No image chosen'; sigOk(); });
$('#sigCancel').addEventListener('click', () => dlg.close());
$('#sigUseLast').addEventListener('click', () => { dlg.close(); place('sign', sigLast, 180); });
function trimmed(c) {                          // crop transparent edges
  const x = c.getContext('2d'), { width: w, height: h } = c, d = x.getImageData(0, 0, w, h).data;
  let t = h, l = w, b = 0, r = 0;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) if (d[(y * w + i) * 4 + 3] > 8) { if (y < t) t = y; if (y > b) b = y; if (i < l) l = i; if (i > r) r = i; }
  if (b < t) return null;
  const o = document.createElement('canvas'), m = 4; o.width = r - l + 1 + m * 2; o.height = b - t + 1 + m * 2;
  o.getContext('2d').drawImage(c, l, t, r - l + 1, b - t + 1, m, m, r - l + 1, b - t + 1); return o;
}
$('#sigAdd').addEventListener('click', async () => {
  let c;
  if (sigMode === 'draw') c = trimmed(pad);
  else if (sigMode === 'type') {
    await document.fonts.load('600 80px "Dancing Script"');
    const t = $('#sigName').value.trim(), cv = document.createElement('canvas'), x = cv.getContext('2d');
    x.font = '600 96px "Dancing Script", cursive'; cv.width = Math.ceil(x.measureText(t).width) + 40; cv.height = 150;
    x.font = '600 96px "Dancing Script", cursive'; x.fillStyle = sigInk; x.textBaseline = 'middle'; x.fillText(t, 20, 78);
    c = trimmed(cv);
  } else {
    try { const id = await toImg(sigUp, true); sigLast = id; dlg.close(); place('sign', id, 180); } catch (e) { toast('That image could not be read.', true); }
    return;
  }
  if (!c) return;
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const id = 'i' + (++seq);
  imgs.set(id, { url: URL.createObjectURL(blob), bytes: new Uint8Array(await blob.arrayBuffer()), kind: 'png', w: c.width, h: c.height });
  sigLast = id; dlg.close(); place('sign', id, 180);
});

/* ---------- find text and mark it for redaction ---------- */
const rq = $('#rq');
if (rq) {
  const cx = document.createElement('canvas').getContext('2d');
  const run_ = async () => {
    const q = rq.value.trim(), out = $('#rres'); if (!doc || !q) { out.textContent = doc ? 'Type a word, number or phrase first.' : ''; return; }
    out.textContent = 'Searching...';
    const found = []; let anyText = false;
    for (let i = 0; i < pv.length; i++) {
      pv[i].text = null; await loadText(pv[i]);
      for (const t of pv[i].text || []) {
        anyText = true;
        const hay = t.str.toLowerCase(), nd = q.toLowerCase(); let k = hay.indexOf(nd);
        while (k !== -1) {
          cx.font = `${t.size}px ${FAM[t.fam].css}`;
          const all = cx.measureText(t.str).width || 1, a = cx.measureText(t.str.slice(0, k)).width, b = cx.measureText(t.str.slice(0, k + nd.length)).width;
          const pad = t.size * .14;
          let x0 = t.x + t.w * a / all - pad, x1 = t.x + t.w * b / all + pad;
          if (k === 0) x0 = Math.min(x0, t.x - pad * .5); if (k + nd.length >= t.str.length) x1 = Math.max(x1, t.x + t.w + pad * .5);
          found.push({ p: i, x: x0, y: t.base - t.size * .95, w: x1 - x0, h: t.size * 1.25 });
          k = hay.indexOf(nd, k + nd.length);
        }
      }
    }
    if (!found.length) { out.textContent = anyText ? 'No matches. The word may be split across lines, or in a scanned image: draw boxes by hand.' : 'This PDF has no text to search. It looks like a scan: draw boxes by hand.'; return; }
    commit();
    for (const f of found) objs.push({ id: 'o' + (++seq), type: 'redact', ...f });
    drawObjs(); summary();
    out.textContent = `Marked ${plural(found.length, 'match')} on ${plural(new Set(found.map(f => f.p + 1)).size, 'page')}. Check each black box.`;
  };
  $('#rgo').addEventListener('click', run_);
  rq.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run_(); } });
}

/* ---------- toolbar extras ---------- */
$('#undo').addEventListener('click', undo);
$('#redo').addEventListener('click', redo);
$('#zin').addEventListener('click', () => { zoom = Math.min(3, +(zoom + .25).toFixed(2)); layoutAll(); });
$('#zout').addEventListener('click', () => { zoom = Math.max(.5, +(zoom - .25).toFixed(2)); layoutAll(); });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layoutAll, 150); });

/* ---------- summary ---------- */
function summary() {
  const n = objs.length, fc = Object.keys(formVals).length, bad = objs.some(o => o.type === 'text' && badChars(o));
  $('#s1').textContent = doc ? doc.count : 0;
  $('#s2').textContent = n;
  $('#s3').textContent = fc;
  $('#undo').disabled = !hist.length; $('#redo').disabled = !fut.length;
  go.disabled = busy || !doc || (!n && !fc) || bad;
  note.textContent = !doc ? 'Add a PDF to start.' : bad ? 'Some text uses letters these fonts cannot save. Change or remove the marked text.'
    : objs.some(o => o.type === 'redact') ? `${plural(objs.filter(o => o.type === 'redact').length, 'redaction')} on ${plural(new Set(objs.filter(o => o.type === 'redact').map(o => o.p)).size, 'page')}. Those pages are saved as pictures, so the hidden content cannot be recovered. Check every black box first.`
    : !n && !fc ? 'Make a change, then download.' : `${plural(n, 'change')}${fc ? ` and ${plural(fc, 'filled field')}` : ''} will be saved into the PDF.`;
}

/* ---------- saving ---------- */
const rgb = h => PDFLib.rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
/* Redaction: pages with redactions are drawn to a picture with the black boxes burned in, and the saved file is rebuilt
   from scratch so the original page content (and its text) is not carried over. */
async function burn(bytes, reds) {
  const js2 = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
  const src = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false }), fin = await PDFLib.PDFDocument.create();
  const hit = new Set(reds.map(o => o.p));
  try {
    for (let i = 0; i < pv.length; i++) {
      if (!hit.has(i)) { const [cp] = await fin.copyPages(src, [i]); fin.addPage(cp); continue; }
      const page = await js2.getPage(i + 1), v1 = page.getViewport({ scale: 1 });
      const sc = Math.min(200 / 72, Math.sqrt(36e6 / (v1.width * v1.height))), vp = page.getViewport({ scale: sc });
      const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: x, viewport: vp }).promise;
      x.fillStyle = '#000';
      for (const o of reds) if (o.p === i) x.fillRect(Math.floor(o.x * sc), Math.floor(o.y * sc), Math.ceil(o.w * sc) + 1, Math.ceil(o.h * sc) + 1);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); c.width = c.height = 0;
      const img = await fin.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      fin.addPage([v1.width, v1.height]).drawImage(img, { x: 0, y: 0, width: v1.width, height: v1.height });
    }
  } finally { js2.destroy(); }
  fin.setProducer('Dilia Studio');
  return await fin.save();
}
async function build_() {
  const out = await PDFLib.PDFDocument.load(doc.bytes, { updateMetadata: false });
  const fonts = {}, font = async k => fonts[k] || (fonts[k] = await out.embedFont(PDFLib.StandardFonts[k]));
  const embedded = {}, embed = async id => { if (!embedded[id]) { const im = imgs.get(id); embedded[id] = im.kind === 'png' ? await out.embedPng(im.bytes) : await out.embedJpg(im.bytes); } return embedded[id]; };
  // form fields
  const names = Object.keys(formVals), problems = [];
  if (names.length) {
    const form = out.getForm();
    for (const nm of names) {
      try {
        const f = form.getField(nm), v = formVals[nm];
        if (f instanceof PDFLib.PDFTextField) f.setText(v || undefined);
        else if (f instanceof PDFLib.PDFCheckBox) v ? f.check() : f.uncheck();
        else if (f instanceof PDFLib.PDFRadioGroup) { const opts = f.getOptions(); f.select(opts.includes(v) ? v : opts.find(o => o.toLowerCase() === String(v).toLowerCase()) || v); }
        else if (f instanceof PDFLib.PDFDropdown || f instanceof PDFLib.PDFOptionList) { if (v) { const opts = f.getOptions(); const fl = fields.find(x => x.a.fieldName === nm); const disp = fl && (fl.a.options || []).find(o => o.exportValue === v); f.select(opts.includes(v) ? v : disp && opts.includes(disp.displayValue) ? disp.displayValue : v); } else f.clear(); }
      } catch (e) { problems.push(nm); }
    }
  }
  const pages = out.getPages();
  for (let i = 0; i < pv.length; i++) {
    const list = objs.filter(o => o.p === i); if (!list.length) continue;
    const pg = pages[i], vp = pv[i].vp, rot = PDFLib.degrees(pv[i].rot), U = (x, y) => vp.convertToPdfPoint(x, y);
    for (const o of list) {
      if (o.type === 'redact') continue;
      if (o.type === 'text') {
        const f = await font(fontKey(o)), c = rgb(o.color);
        o.text.split('\n').forEach((line, k) => {
          if (!line) return;
          const [x, y] = U(o.x, o.y + o.size * FAM[o.fam].base + k * o.size * LH);
          pg.drawText(line, { x, y, size: o.size, font: f, color: c, rotate: rot });
        });
      } else if (o.type === 'image' || o.type === 'sign') {
        const [x, y] = U(o.x, o.y + o.h);
        pg.drawImage(await embed(o.img), { x, y, width: o.w, height: o.h, rotate: rot });
      } else if (o.type === 'draw') {
        const [x, y] = U(0, 0);
        const d = o.pts.map((q, k) => (k ? 'L' : 'M') + q[0].toFixed(2) + ' ' + q[1].toFixed(2)).join(' ');
        pg.drawSvgPath(d, { x, y, rotate: rot, borderColor: rgb(o.color), borderWidth: o.lw, borderLineCap: PDFLib.LineCapStyle.Round });
      } else if (o.type === 'note') {
        if (!o.text.trim()) continue;
        const pts = [U(o.x, o.y), U(o.x + 20, o.y + 20)], xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const a = out.context.obj({ Type: 'Annot', Subtype: 'Text', Rect: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], Contents: PDFLib.PDFHexString.fromText(o.text), Name: 'Comment', C: [1, .77, 0], F: 4, Open: false });
        pg.node.addAnnot(out.context.register(a));
      } else {
        const [x, y] = U(o.x, o.y + o.h), opt = { x, y, width: o.w, height: o.h, rotate: rot };
        if (o.type === 'whiteout') pg.drawRectangle({ ...opt, color: rgb('#ffffff') });
        else if (o.type === 'highlight') pg.drawRectangle({ ...opt, color: rgb(o.color), opacity: .45, blendMode: PDFLib.BlendMode.Multiply });
        else pg.drawRectangle({ ...opt, borderColor: rgb(o.color), borderWidth: o.lw });
      }
    }
  }
  out.setProducer('Dilia Studio');
  let bytes = await out.save();
  const reds = objs.filter(o => o.type === 'redact');
  if (reds.length) bytes = await burn(bytes, reds);
  return { bytes, problems };
}
go.addEventListener('click', async () => {
  if (busy || go.disabled) return;
  endEdit();
  busy = true; go.disabled = true; ws.classList.add('working'); prog.style.width = '10%';
  try {
    await new Promise(r => setTimeout(r, 0));
    const r = await build_();
    prog.style.width = '100%';
    const blob = new Blob([r.bytes], { type: 'application/pdf' }), name = cleanName(outName.value, 'Dilia-edited', 'pdf');
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(blob); save(lastUrl, name);
    $('#doneName').textContent = name; $('#doneInfo').textContent = `${plural(doc.count, 'page')}, ${kb(blob.size)}`;
    $('#again').href = lastUrl; $('#again').download = name; $('#done').hidden = false; dirty = false;
    if (r.problems.length) toast(`${plural(r.problems.length, 'form field')} could not be filled: ${r.problems.slice(0, 3).join(', ')}.`, true);
  } catch (e) { toast('The PDF could not be saved: ' + (e.message || 'unknown error') + '.', true); }
  busy = false; ws.classList.remove('working'); setTimeout(() => { prog.style.width = '0'; }, 600); summary();
});
function clearDone() { $('#done').hidden = true; }
$('#reset').addEventListener('click', () => {
  if (doc && doc.js) doc.js.destroy();
  doc = null; objs = []; pv = []; fields = []; formVals = {}; hist = []; fut = []; sel = null; editing = null; dirty = false;
  clearDone(); build(); scrollTo({ top: 0, behavior: 'smooth' });
});
addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

pick.addEventListener('change', () => { if (pick.files.length) load(pick.files); pick.value = ''; });
Kit.dropAnywhere(fl => { const f = [...fl]; if (doc && f.length && /^image\//.test(f[0].type)) { $('#imgPick').files = fl; $('#imgPick').dispatchEvent(new Event('change')); } else load(fl); });
build(); setTool('select');
window.__dilia = { get objs() { return objs; }, get pv() { return pv; }, get fields() { return fields; }, get formVals() { return formVals; }, get S() { return S; } };
}
