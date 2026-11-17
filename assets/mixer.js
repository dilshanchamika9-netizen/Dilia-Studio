/* Two tools that combine several PDFs: Alternate and mix pages (data-tool=mix), Insert or replace pages (data-tool=insert). */
{
const { $, kb, plural, esc, toast, save, cleanName, parseRanges, compress } = Kit;
const MODE = document.body.dataset.tool, INSERT = MODE === 'insert';
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
    if (INSERT && files.length >= 2) { toast('This tool takes two PDFs: the main file and the file the pages come from.', true); break; }
    const r = await Kit.openPdf(f);
    if (r.err) { toast(r.err, true); continue; }
    r.id = 'f' + (++seq); files.push(r);
    r.url = null; thumb(r);
  }
  ws.classList.remove('working');
  if (pdfs.length) clearDone();
  render();
}
async function thumb(f) {
  if (!f.js) return;
  try { f.url = URL.createObjectURL(await Kit.renderThumb(f.js, 0)); const c = grid.querySelector(`[data-id="${f.id}"] img`); if (c) { c.src = f.url; c.parentElement.classList.add('ok'); } } catch (e) { /* no preview */ }
}
const roleOf = n => !INSERT ? '' : n === 0 ? 'Main PDF' : 'Pages come from';
function render() {
  ws.dataset.state = files.length ? 'full' : 'empty';
  grid.innerHTML = files.map((f, n) => `<article class="card page" data-id="${f.id}" aria-label="${esc(f.name)}">
    <div class="pv${f.url ? ' ok' : ''}"><img alt="" ${f.url ? `src="${f.url}"` : ''}></div>
    <div class="pmeta"><i></i><span>${n + 1}</span><em title="${esc(f.name)}">${INSERT ? roleOf(n) + ': ' : ''}${esc(f.name)} (${plural(f.count, 'page')})</em></div>
    <div class="tools-row"><button type="button" data-rm="1" aria-label="Remove ${esc(f.name)}">${BIN}</button></div></article>`).join('');
  grid.querySelectorAll('.page').forEach(c => c.style.setProperty('--c', '#e5007d'));
  summary();
}
function plan() {                                       // -> {err}|{hint}|{list:[{f,i}] , info}
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
let nameTouched = false;
$('#outName').addEventListener('input', () => { nameTouched = true; });
function summary() {
  const p = files.length ? plan() : { hint: INSERT ? 'Add the main PDF first.' : 'Add at least two PDFs to mix.' };
  showErr(p.err || '');
  if (!nameTouched && files.length) $('#outName').value = files[0].name.replace(/\.pdf$/i, '');
  $('#s1').textContent = files.length; $('#s2').textContent = p.list ? p.list.length : 0; $('#s3').textContent = kb(files.reduce((a, f) => a + f.size, 0));
  go.disabled = busy || !p.list;
  note.textContent = p.err ? 'Fix the highlighted setting to continue.' : p.hint ? p.hint : INSERT ? `The new PDF has ${p.info}.` : `Pages are taken in turn: ${p.info}.`;
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
    const out = await PDFLib.PDFDocument.create(), cache = new Map();
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
