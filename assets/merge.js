{
const $ = s => document.querySelector(s);

const COLORS = ['#e5007d', '#009fe3', '#f0a800', '#7a5cff', '#ff5a36', '#00a88f', '#0b1220'];
const files = [];            // {id,name,size,bytes,lib,js,count,color}
let pages = [];              // {key,fid,idx,rot}
let view = 'files', seq = 0, busy = false, lastUrl = null;

const ws = $('#ws'), grid = $('#grid'), pick = $('#pick'), go = $('#go'), note = $('#note');
const thumbs = new Map();    // "fid:idx" -> objectURL

const kb = b => b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fileOf = id => files.find(f => f.id === id);

function toast(msg, bad) {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), bad ? 6500 : 3500);
  setTimeout(() => t.remove(), bad ? 7000 : 4000);
}

/* ---------- adding files ---------- */
async function add(list) {
  const pdfs = [...list].filter(f => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
  const skipped = list.length - pdfs.length;
  if (skipped) toast(`${plural(skipped, 'file')} skipped: only PDF files can be merged.`, true);
  for (const f of pdfs) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    let lib;
    try {
      lib = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
    } catch (e) {
      toast(/encrypt/i.test(e.message) ? `${f.name} is password protected. Remove the password first, then add it again.` : `${f.name} could not be read. It may be damaged.`, true);
      continue;
    }
    let js = null;
    try { js = await pdfjsLib.getDocument({ isEvalSupported: false, data: bytes.slice() }).promise; } catch (e) { /* previews unavailable, merge still works */ }
    const id = 'f' + (++seq), count = lib.getPageCount();
    files.push({ id, name: f.name, size: f.size, bytes, lib, js, count, color: COLORS[(seq - 1) % COLORS.length] });
    for (let i = 0; i < count; i++) pages.push({ key: id + ':' + i, fid: id, idx: i, rot: 0 });
  }
  if (pdfs.length) clearDone();
  render();
}

/* ---------- thumbnails (rendered lazily, one at a time) ---------- */
const queue = []; let rendering = false;
function want(fid, idx) {
  const k = fid + ':' + idx;
  if (thumbs.has(k) || queue.some(q => q.k === k)) return;
  queue.push({ k, fid, idx }); pump();
}
async function pump() {
  if (rendering) return; rendering = true;
  while (queue.length) {
    const { k, fid, idx } = queue.shift();
    const f = fileOf(fid);
    if (!f || !f.js || thumbs.has(k)) continue;
    try {
      const page = await f.js.getPage(idx + 1);
      const v1 = page.getViewport({ scale: 1 });
      const scale = Math.min(2.4, (220 * Math.min(2, devicePixelRatio || 1)) / v1.width);
      const vp = page.getViewport({ scale });
      const c = document.createElement('canvas');
      c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .82));
      const url = URL.createObjectURL(blob);
      thumbs.set(k, url);
      document.querySelectorAll(`img[data-k="${k}"]`).forEach(img => { img.src = url; img.closest('.pv').classList.add('ok'); });
    } catch (e) { /* leave placeholder */ }
  }
  rendering = false;
}
const seen = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const [fid, idx] = e.target.querySelector('img').dataset.k.split(':');
  want(fid, +idx); seen.unobserve(e.target);
}), { rootMargin: '300px' });

function img(fid, idx, rot) {
  const k = fid + ':' + idx, url = thumbs.get(k);
  return `<div class="pv${url ? ' ok' : ''}"><img data-k="${k}" alt="" ${url ? `src="${url}"` : ''} style="--r:${rot || 0}deg"></div>`;
}

/* ---------- drawing the board ---------- */
function render() {
  ws.dataset.state = files.length ? 'full' : 'empty';
  ws.dataset.view = view;
  document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === view));
  $('#tip').textContent = view === 'files' ? 'Drag files to set the order. Pages follow their file.' : 'Drag pages to reorder. Rotate or remove single pages.';
  $('#sortAz').hidden = view !== 'files';

  if (view === 'files') {
    grid.innerHTML = files.map((f, n) => {
      const left = pages.filter(p => p.fid === f.id), first = left[0];
      return `<article class="card file" data-id="${f.id}" style="--c:${f.color}">
        <div class="stack${left.length > 1 ? ' many' : ''}">${first ? img(f.id, first.idx, first.rot) : '<div class="pv empty"><span>All pages removed</span></div>'}</div>
        <div class="meta"><b title="${esc(f.name)}">${esc(f.name)}</b><span>${plural(left.length, 'page')}${left.length !== f.count ? ' of ' + f.count : ''}, ${kb(f.size)}</span></div>
        <span class="num">${n + 1}</span>
        <button class="x" type="button" data-del="${f.id}" aria-label="Remove ${esc(f.name)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      </article>`;
    }).join('');
  } else {
    grid.innerHTML = pages.map((p, i) => {
      const f = fileOf(p.fid);
      return `<article class="card page" data-key="${p.key}" style="--c:${f.color}">
        ${img(p.fid, p.idx, p.rot)}
        <div class="pmeta"><i></i><span>${i + 1}</span><em title="${esc(f.name)}">${esc(f.name)}, p. ${p.idx + 1}</em></div>
        <div class="tools-row">
          <button type="button" data-rot="-90" aria-label="Rotate left"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button type="button" data-rot="90" aria-label="Rotate right"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button type="button" data-rm="1" aria-label="Remove page"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
      </article>`;
    }).join('');
  }
  grid.querySelectorAll('img[data-k]:not([src])').forEach(i => seen.observe(i.parentElement));
  summary();
}

let nameTouched = false;
$('#outName').addEventListener('input', () => { nameTouched = true; });
function summary() {
  if (!nameTouched && files.length) $('#outName').value = files[0].name.replace(/\.pdf$/i, '');
  const live = files.filter(f => pages.some(p => p.fid === f.id));
  $('#sFiles').textContent = live.length;
  $('#sPages').textContent = pages.length;
  $('#sSize').textContent = kb(live.reduce((a, f) => a + f.size, 0));
  go.disabled = busy || !pages.length;
  note.textContent = !files.length ? 'Add at least one PDF to start.'
    : !pages.length ? 'Every page has been removed. Add files or start over.'
    : live.length < 2 ? 'One file so far. Add more, or download it with your page changes.'
    : `${plural(pages.length, 'page')} from ${plural(live.length, 'file')}, in the order shown.`;
}

/* ---------- reordering ---------- */
Sortable.create(grid, {
  animation: 200, easing: 'cubic-bezier(.2,.8,.2,1)', ghostClass: 'sort-ghost', chosenClass: 'chosen', dragClass: 'dragging',
  filter: 'button', preventOnFilter: false, delay: 120, delayOnTouchOnly: true,
  onEnd() {
    if (view === 'files') {
      const order = [...grid.children].map(e => e.dataset.id);
      files.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      regroup();
    } else {
      const order = [...grid.children].map(e => e.dataset.key);
      pages.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    }
    clearDone(); render();
  }
});
function regroup() {
  const rank = Object.fromEntries(files.map((f, i) => [f.id, i]));
  pages = pages.map((p, i) => [p, i]).sort((a, b) => rank[a[0].fid] - rank[b[0].fid] || a[1] - b[1]).map(x => x[0]);
}

grid.addEventListener('click', e => {
  const del = e.target.closest('[data-del]'), rot = e.target.closest('[data-rot]'), rm = e.target.closest('[data-rm]');
  if (del) {
    const id = del.dataset.del, f = fileOf(id);
    files.splice(files.indexOf(f), 1);
    pages = pages.filter(p => p.fid !== id);
    for (const [k, u] of thumbs) if (k.startsWith(id + ':')) { URL.revokeObjectURL(u); thumbs.delete(k); }
    if (f.js) f.js.destroy();
  } else if (rot || rm) {
    const key = e.target.closest('.page').dataset.key, p = pages.find(x => x.key === key);
    if (rot) {
      p.rot = (p.rot + +rot.dataset.rot + 360) % 360;
      e.target.closest('.page').querySelector('img').style.setProperty('--r', p.rot + 'deg');
      clearDone(); return;
    }
    pages.splice(pages.indexOf(p), 1);
  } else return;
  clearDone(); render();
});

document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => { view = b.dataset.view; render(); }));
$('#sortAz').addEventListener('click', () => {
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  regroup(); clearDone(); render();
});

/* ---------- merging ---------- */
const prog = $('#prog');
function cleanName() {
  const v = $('#outName').value.trim().replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '-');
  return (v || 'Dilia-merged') + '.pdf';
}
go.addEventListener('click', async () => {
  if (busy || !pages.length) return;
  busy = true; go.disabled = true; ws.classList.add('working'); prog.style.width = '4%';
  try {
    const out = await PDFLib.PDFDocument.create();
    let i = 0;
    while (i < pages.length) {
      const fid = pages[i].fid; let j = i;
      while (j < pages.length && pages[j].fid === fid) j++;
      const run = pages.slice(i, j), src = fileOf(fid).lib;
      const copied = await out.copyPages(src, run.map(p => p.idx));
      copied.forEach((pg, n) => {
        if (run[n].rot) pg.setRotation(PDFLib.degrees((pg.getRotation().angle + run[n].rot) % 360));
        out.addPage(pg);
      });
      i = j;
      prog.style.width = Math.round(8 + 80 * i / pages.length) + '%';
      await new Promise(r => setTimeout(r, 0));
    }
    out.setProducer('Dilia'); out.setCreator('Dilia');
    const bytes = await out.save();
    prog.style.width = '100%';
    const blob = new Blob([bytes], { type: 'application/pdf' });
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(blob);
    const name = cleanName();
    save(lastUrl, name);
    $('#doneName').textContent = name;
    $('#doneInfo').textContent = `${plural(pages.length, 'page')}, ${kb(blob.size)}`;
    $('#again').href = lastUrl; $('#again').download = name;
    $('#done').hidden = false;
  } catch (e) {
    toast('The merge did not finish: ' + (e.message || 'unknown error') + '.', true);
  }
  busy = false; ws.classList.remove('working');
  setTimeout(() => { prog.style.width = '0'; }, 600);
  summary();
});
function save(url, name) { if (window.Kit) return Kit.save(url, name); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); }
function clearDone() { $('#done').hidden = true; }
$('#reset').addEventListener('click', () => {
  files.forEach(f => f.js && f.js.destroy());
  files.length = 0; pages = []; seq = 0;
  thumbs.forEach(u => URL.revokeObjectURL(u)); thumbs.clear();
  nameTouched = false; $('#outName').value = ''; clearDone(); view = 'files'; render();
  scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---------- picking and dropping ---------- */
pick.addEventListener('change', () => { add(pick.files); pick.value = ''; });
let depth = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); depth++; document.body.classList.add('dropping'); });
addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
addEventListener('dragleave', e => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) document.body.classList.remove('dropping'); });
addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); depth = 0; document.body.classList.remove('dropping'); add(e.dataTransfer.files); });

render();
window.__dilia = { files, get pages() { return pages; } };
}
