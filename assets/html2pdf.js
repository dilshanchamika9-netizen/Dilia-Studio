/* HTML to PDF (low fidelity): reads the text and structure of a saved web page and sets it as a clean text PDF.
   Pictures, colours, fonts and page styling are not reproduced. The page is parsed as data, so its scripts never run. */
{
const { $, kb, plural, toast, save, cleanName } = Kit;
const ws = $('#ws'), pick = $('#pick'), go = $('#go'), note = $('#note'), prog = $('#prog'), outName = $('#outName');
let doc = null, busy = false, lastUrl = null;
const tick = () => new Promise(r => setTimeout(r, 0));
const isHtml = f => /\.(html?|xhtml)$/i.test(f.name) || /html/i.test(f.type);

async function load(list) {
  const f = [...list].find(isHtml);
  if (!f) { toast('That is not an HTML file. Choose a file ending in .html or .htm.', true); return; }
  if (f.size > 20 * 1048576) { toast('That file is over 20 MB. It is too large for this tool.', true); return; }
  const html = await f.text();
  const dom = new DOMParser().parseFromString(html, 'text/html');
  doc = { name: f.name, size: f.size, html, title: (dom.title || '').trim(), imgs: dom.querySelectorAll('img, svg, canvas, video').length };
  outName.value = f.name.replace(/\.[^.]+$/, '');
  clearDone(); render();
}
function render() {
  ws.dataset.state = doc ? 'full' : 'empty';
  if (doc) {
    $('#fname').textContent = '';
    $('#fn2').textContent = doc.name;
    $('#fmeta').textContent = kb(doc.size);
    $('#fstate').textContent = doc.imgs ? `${plural(doc.imgs, 'picture')} will be left out. Only the text and structure are kept.` : 'Only the text and structure are kept.';
    $('#fthumb').innerHTML = '<span>HTML</span>';
    $('#s1').textContent = kb(doc.size); $('#s2').textContent = $('#pgSize').value; $('#s3').textContent = '-';
  } else { $('#s1').textContent = 0; $('#s2').textContent = '-'; $('#s3').textContent = 0; }
  go.disabled = busy || !doc;
  note.textContent = doc ? 'Low fidelity: text, headings, lists and tables only. Check the result.' : 'Add an HTML file to start.';
}

/* ---------- reading the page ---------- */
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'SVG', 'IFRAME', 'CANVAS', 'VIDEO', 'AUDIO', 'OBJECT', 'EMBED', 'IMG', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'NAV']);
const BLOCK = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'ASIDE', 'FORM', 'FIELDSET', 'ADDRESS', 'FIGURE', 'FIGCAPTION', 'DL', 'DT', 'DD', 'CENTER']);
function collect(root) {
  const blocks = []; let cur = null;
  const open = (b) => { cur = { runs: [], size: 11, indent: 0, before: 0, after: 4, ...b }; blocks.push(cur); return cur; };
  const addText = (t, st) => { if (!cur) open({}); if (cur.pre) { cur.runs.push({ t, ...st }); return; } t = t.replace(/\s+/g, ' '); if (!t) return; cur.runs.push({ t, ...st }); };
  const walk = (n, st, ind) => {
    if (n.nodeType === 3) { addText(n.nodeValue, st); return; }
    if (n.nodeType !== 1 || SKIP.has(n.tagName) || n.hidden || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(n.getAttribute('style') || '')) return;
    const tg = n.tagName;
    if (/^H[1-6]$/.test(tg)) { open({ size: [24, 20, 17, 15, 13, 12][+tg[1] - 1], before: 8, after: 6, indent: ind }); for (const c of n.childNodes) walk(c, { ...st, b: true }, ind); cur = null; return; }
    if (tg === 'PRE') { open({ pre: true, size: 9, indent: ind, after: 8 }); for (const c of n.childNodes) walk(c, { ...st, m: true }, ind); cur = null; return; }
    if (tg === 'HR') { open({ rule: true, after: 6 }); cur = null; return; }
    if (tg === 'BR') { if (cur) cur.runs.push({ t: '\n', ...st }); return; }
    if (tg === 'UL' || tg === 'OL') { let k = 0; cur = null; for (const c of n.children) if (c.tagName === 'LI') { k++; open({ indent: ind + 18, bullet: tg === 'OL' ? k + '.' : '•', after: 2 }); for (const cc of c.childNodes) walk(cc, st, ind + 18); cur = null; } cur = null; return; }
    if (tg === 'TABLE') { cur = null; for (const tr of n.querySelectorAll('tr')) { const cells = [...tr.children].filter(c => /^T[DH]$/.test(c.tagName)).map(c => ({ t: c.textContent.replace(/\s+/g, ' ').trim(), b: c.tagName === 'TH' || tr.parentNode.tagName === 'THEAD' })); if (cells.length) blocks.push({ row: cells, size: 10, indent: ind, after: 2 }); } cur = null; return; }
    if (tg === 'BLOCKQUOTE') { cur = null; for (const c of n.childNodes) walk(c, st, ind + 20); cur = null; return; }
    const ns = { ...st }; if (tg === 'B' || tg === 'STRONG') ns.b = true; if (tg === 'I' || tg === 'EM' || tg === 'CITE') ns.i = true; if (tg === 'CODE' || tg === 'KBD' || tg === 'SAMP') ns.m = true;
    const blk = BLOCK.has(tg);
    if (blk) { cur = null; }
    for (const c of n.childNodes) walk(c, ns, ind);
    if (blk) { if (cur) cur.after = Math.max(cur.after, tg === 'P' ? 8 : 4); cur = null; }
  };
  walk(root, {}, 0);
  return blocks.filter(b => b.rule || b.row || b.runs.some(r => r.t.trim()));
}

/* ---------- laying it out ---------- */
async function build() {
  const dom = new DOMParser().parseFromString(doc.html, 'text/html');
  const blocks = collect(dom.body || dom.documentElement);
  const [PW, PH] = { a4: [595.28, 841.89], letter: [612, 792] }[$('#pgSize').value], M = 54;
  const out = await PDFLib.PDFDocument.create();
  const F = { r: await out.embedFont(PDFLib.StandardFonts.Helvetica), b: await out.embedFont(PDFLib.StandardFonts.HelveticaBold), i: await out.embedFont(PDFLib.StandardFonts.HelveticaOblique), bi: await out.embedFont(PDFLib.StandardFonts.HelveticaBoldOblique), m: await out.embedFont(PDFLib.StandardFonts.Courier) };
  let lost = 0;
  const clean = (f, t) => { let r = ''; for (const ch of t) { try { f.encodeText(ch); r += ch; } catch (e) { if (/\s/.test(ch)) r += ' '; else { r += '?'; lost++; } } } return r; };
  const fnt = (st, bold) => st.m ? F.m : (st.b || bold) && st.i ? F.bi : st.b || bold ? F.b : st.i ? F.i : F.r;
  let page = out.addPage([PW, PH]), y = PH - M, pages = 1;
  const need = h => { if (y - h < M) { page = out.addPage([PW, PH]); pages++; y = PH - M; } };
  const wrapRuns = (runs, size, width, bold, pre) => {           // -> lines of [{t,f}]
    const lines = [[]]; let x = 0;
    const push = (t, f) => { const w = f.widthOfTextAtSize(t, size); const L = lines[lines.length - 1]; if (L.length && L[L.length - 1].f === f) L[L.length - 1].t += t; else L.push({ t, f }); x += w; };
    for (const r of runs) {
      const f = fnt(r, bold);
      if (r.t === '\n') { lines.push([]); x = 0; continue; }
      const parts = pre ? r.t.split(/(\n)/) : r.t.split(/(\s+)/);
      for (const raw of parts) {
        if (raw === '') continue;
        if (raw === '\n') { lines.push([]); x = 0; continue; }
        const t = clean(f, pre ? raw.replace(/\t/g, '    ') : raw);
        const w = f.widthOfTextAtSize(t, size);
        if (/^\s+$/.test(t)) { if (x > 0) push(' ', f); continue; }
        if (x + w > width && x > 0) { const L = lines[lines.length - 1]; if (L.length) L[L.length - 1].t = L[L.length - 1].t.replace(/\s+$/, ''); lines.push([]); x = 0; }
        if (w > width) { let chunk = ''; for (const ch of t) { if (f.widthOfTextAtSize(chunk + ch, size) > width && chunk) { push(chunk, f); lines.push([]); x = 0; chunk = ''; } chunk += ch; } if (chunk) push(chunk, f); }
        else push(t, f);
      }
    }
    return lines.filter((l, k) => l.length || (pre && k < lines.length - 1));
  };
  for (let k = 0; k < blocks.length; k++) {
    const b = blocks[k];
    if (b.rule) { need(14); page.drawLine({ start: { x: M, y: y - 4 }, end: { x: PW - M, y: y - 4 }, thickness: .7, color: PDFLib.rgb(.6, .6, .6) }); y -= 14; continue; }
    if (b.row) {
      const n = b.row.length, cw = (PW - 2 * M - b.indent) / n, cols = b.row.map(c => wrapRuns([{ t: c.t, b: c.b }], b.size, cw - 6, false, false));
      const rows = Math.max(1, ...cols.map(c => c.length)), lh = b.size * 1.25;
      need(rows * lh + b.after);
      cols.forEach((lines, ci) => lines.forEach((L, li) => { let x = M + b.indent + ci * cw; for (const s of L) { page.drawText(s.t, { x, y: y - b.size - li * lh, size: b.size, font: s.f }); x += s.f.widthOfTextAtSize(s.t, b.size); } }));
      y -= rows * lh + b.after; continue;
    }
    const lh = b.size * 1.28, width = PW - 2 * M - b.indent, lines = wrapRuns(b.runs, b.size, width, b.size > 12 && !b.pre, b.pre);
    if (!lines.length) continue;
    y -= (k ? b.before : 0);
    lines.forEach((L, li) => {
      need(lh);
      if (li === 0 && b.bullet) page.drawText(clean(F.r, b.bullet), { x: M + b.indent - 14, y: y - b.size, size: b.size, font: F.r });
      let x = M + b.indent; for (const s of L) { page.drawText(s.t, { x, y: y - b.size, size: b.size, font: s.f }); x += s.f.widthOfTextAtSize(s.t, b.size); }
      y -= lh;
    });
    y -= b.after;
    prog.style.width = Math.round(8 + 84 * (k + 1) / blocks.length) + '%'; if (k % 40 === 0) await tick();
  }
  if (doc.title) out.setTitle(clean(F.r, doc.title));
  out.setProducer('Dilia');
  return { bytes: await out.save(), pages, lost };
}

/* ---------- save ---------- */
function clearDone() { $('#done').hidden = true; prog.style.width = '0%'; }
async function run() {
  if (!doc || busy) return;
  busy = true; go.disabled = true; clearDone(); prog.style.width = '6%'; note.textContent = 'Working...';
  try {
    await tick();
    const r = await build();
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    const blob = new Blob([r.bytes], { type: 'application/pdf' });
    const name = cleanName(outName.value, 'Dilia-html', 'pdf');
    prog.style.width = '100%';
    lastUrl = URL.createObjectURL(blob); save(lastUrl, name);
    $('#doneName').textContent = name;
    $('#doneInfo').textContent = `${plural(r.pages, 'page')}, ${kb(blob.size)}${r.lost ? `. ${plural(r.lost, 'character')} could not be shown and became ?` : ''}`;
    $('#done').hidden = false; note.textContent = 'Saved. Pictures and page styling are not included.';
  } catch (e) { toast('Could not convert this file: ' + (e.message || e), true); }
  busy = false; render();
}
go.addEventListener('click', run);
pick.addEventListener('change', () => { if (pick.files.length) load(pick.files); pick.value = ''; });
$('#again').addEventListener('click', e => { e.preventDefault(); if (lastUrl) { const a = document.createElement('a'); a.href = lastUrl; a.download = $('#doneName').textContent; a.click(); } });
$('#reset').addEventListener('click', () => { doc = null; clearDone(); render(); });
document.querySelectorAll('.optbar input, .optbar select').forEach(e => e.addEventListener('change', () => { clearDone(); render(); }));
Kit.dropAnywhere(load);
render();
}
