/* Images to PDF: one image per page, reorder, rotate, choose page size and margin. */
{
const { $, kb, plural, esc, toast, save, cleanName } = Kit;
const items = [];            // {id,name,size,file,url,w,h,type,rot}
let seq = 0, busy = false, lastUrl = null;
const ws = $('#ws'), grid = $('#grid'), pick = $('#pick'), go = $('#go'), note = $('#note'), prog = $('#prog');
const OKTYPE = /^image\/(jpeg|png|webp|gif|bmp|avif)$/i, OKEXT = /\.(jpe?g|png|webp|gif|bmp|avif)$/i;
const typeOf = f => OKTYPE.test(f.type) ? f.type.toLowerCase() : (/\.jpe?g$/i.test(f.name) ? 'image/jpeg' : /\.png$/i.test(f.name) ? 'image/png' : f.type || 'image/x-unknown');

const ROT_L = '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ROT_R = '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const BIN = '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------- adding ---------- */
async function add(list) {
  const all = [...list];
  const heic = all.filter(f => /heic|heif/i.test(f.type) || /\.hei[cf]$/i.test(f.name));
  if (heic.length) toast(`${plural(heic.length, 'HEIC photo')} skipped. Browsers cannot read HEIC. On iPhone use Settings, Camera, Formats, Most Compatible, or export as JPG.`, true);
  const imgs = all.filter(f => !heic.includes(f) && (OKTYPE.test(f.type) || OKEXT.test(f.name)));
  const other = all.length - heic.length - imgs.length;
  if (other) toast(`${plural(other, 'file')} skipped: only JPG, PNG, WebP, GIF, BMP and AVIF images work here.`, true);
  ws.classList.add('working');
  for (const f of imgs) {
    try {
      const bmp = await createImageBitmap(f);
      const it = { id: 'i' + (++seq), name: f.name, size: f.size, file: f, url: URL.createObjectURL(f), w: bmp.width, h: bmp.height, type: typeOf(f), rot: 0 };
      bmp.close && bmp.close();
      items.push(it);
    } catch (e) { toast(`${f.name} could not be read. It may be damaged.`, true); }
  }
  ws.classList.remove('working');
  if (imgs.length) clearDone();
  render();
}

/* ---------- drawing ---------- */
function render() {
  ws.dataset.state = items.length ? 'full' : 'empty';
  grid.innerHTML = items.map((it, n) => `<article class="card page" data-id="${it.id}" aria-label="Image ${n + 1}">
    <div class="pv ok"><img src="${it.url}" alt="" style="--r:${it.rot}deg"></div>
    <div class="pmeta"><i></i><span>${n + 1}</span><em title="${esc(it.name)}">${esc(it.name)}</em></div>
    <div class="tools-row">
      <button type="button" data-rot="-90" aria-label="Rotate left">${ROT_L}</button>
      <button type="button" data-rot="90" aria-label="Rotate right">${ROT_R}</button>
      <button type="button" data-rm="1" aria-label="Remove image">${BIN}</button>
    </div></article>`).join('');
  grid.querySelectorAll('.page').forEach(c => c.style.setProperty('--c', '#e5007d'));
  summary();
}
let nameTouched = false;
$('#outName').addEventListener('input', () => { nameTouched = true; });
function summary() {
  if (!nameTouched && items.length) $('#outName').value = items[0].name.replace(/\.[^.]+$/, '');
  $('#s1').textContent = items.length;
  $('#s2').textContent = items.length;
  $('#s3').textContent = kb(items.reduce((a, i) => a + i.size, 0));
  go.disabled = busy || !items.length;
  note.textContent = items.length ? `${plural(items.length, 'image')} become ${plural(items.length, 'page')}, in the order shown.` : 'Add at least one image to start.';
  $('#orient').disabled = $('input[name=ps]:checked').value === 'fit';
}

Sortable.create(grid, {
  animation: 200, easing: 'cubic-bezier(.2,.8,.2,1)', ghostClass: 'sort-ghost', chosenClass: 'chosen', dragClass: 'dragging',
  filter: 'button', preventOnFilter: false, delay: 120, delayOnTouchOnly: true,
  onEnd() {
    const order = [...grid.children].map(e => e.dataset.id);
    items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    clearDone(); render();
  }
});
grid.addEventListener('click', e => {
  const card = e.target.closest('.page'); if (!card) return;
  const it = items.find(x => x.id === card.dataset.id), r = e.target.closest('[data-rot]');
  if (r) { it.rot = (it.rot + +r.dataset.rot + 360) % 360; card.querySelector('img').style.setProperty('--r', it.rot + 'deg'); clearDone(); }
  else if (e.target.closest('[data-rm]')) { URL.revokeObjectURL(it.url); items.splice(items.indexOf(it), 1); clearDone(); render(); }
});
if ($('#look')) $('#look').addEventListener('change', clearDone);
document.querySelectorAll('input[name=ps]').forEach(r => r.addEventListener('change', summary));
$('#sortAz').addEventListener('click', () => {
  items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  clearDone(); render();
});

/* ---------- building ---------- */
function exifOrientation(u8) {
  try {
    if (u8[0] !== 0xFF || u8[1] !== 0xD8) return 1;
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let p = 2;
    while (p + 4 < u8.length && u8[p] === 0xFF) {
      const m = u8[p + 1], len = dv.getUint16(p + 2);
      if (m === 0xE1 && dv.getUint32(p + 4) === 0x45786966) {
        const t = p + 10, le = dv.getUint16(t) === 0x4949;
        const ifd = t + dv.getUint32(t + 4, le), n = dv.getUint16(ifd, le);
        for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (dv.getUint16(e, le) === 0x0112) return dv.getUint16(e + 8, le); }
        return 1;
      }
      if (m === 0xDA) break;
      p += 2 + len;
    }
  } catch (e) { /* ignore */ }
  return 1;
}
const look = () => { const e = $('#look'); return e ? e.value : 'none'; };
function scanLook(c, mode) {                            // grayscale, stretch levels, optional hard contrast
  const ctx = c.getContext('2d'), d = ctx.getImageData(0, 0, c.width, c.height), px = d.data, n = c.width * c.height, hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) { const g = (px[i * 4] * 299 + px[i * 4 + 1] * 587 + px[i * 4 + 2] * 114) / 1000 | 0; px[i * 4] = g; hist[g]++; }
  let acc = 0, lo = 0, hi = 255; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * .01) { lo = v; break; } }
  acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * .01) { hi = v; break; } }
  if (hi - lo < 30) { lo = 0; hi = 255; }
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) { let x = Math.min(1, Math.max(0, (v - lo) / (hi - lo))); if (mode === 'bw') { x = Math.min(1, Math.max(0, (x - .25) / .5)); x = x * x * (3 - 2 * x); } else x = x * x * (3 - 2 * x) * .35 + x * .65; lut[v] = Math.round(x * 255); }
  for (let i = 0; i < n; i++) { const g = lut[px[i * 4]]; px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = g; px[i * 4 + 3] = 255; }
  ctx.putImageData(d, 0, 0);
}
async function prepare(it) {
  const u8 = new Uint8Array(await it.file.arrayBuffer()), lk = look();
  const jpeg = it.type === 'image/jpeg', png = it.type === 'image/png';
  if (lk === 'none' && !it.rot && ((jpeg && exifOrientation(u8) === 1) || png)) return { bytes: u8, kind: jpeg ? 'jpg' : 'png', w: it.w, h: it.h };
  // anything else is redrawn on a canvas: other formats, turned images, photos stored sideways
  const bmp = await createImageBitmap(it.file);      // browsers apply the photo's own orientation here
  const sw = bmp.width, sh = bmp.height, turned = it.rot === 90 || it.rot === 270;
  let w = turned ? sh : sw, h = turned ? sw : sh, k = Math.min(1, Math.sqrt(100e6 / (w * h)), lk === 'none' ? 1 : 3000 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const ctx = c.getContext('2d'), asPng = lk === 'none' && (png || (it.type !== 'image/jpeg' && it.type !== 'image/bmp'));
  if (!asPng) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.translate(c.width / 2, c.height / 2); ctx.rotate(it.rot * Math.PI / 180); ctx.scale(k, k);
  ctx.drawImage(bmp, -sw / 2, -sh / 2); bmp.close && bmp.close();
  if (lk !== 'none') { ctx.setTransform(1, 0, 0, 1, 0, 0); scanLook(c, lk); }
  const blob = await new Promise(r => c.toBlob(r, asPng ? 'image/png' : 'image/jpeg', .92));
  const out = { bytes: new Uint8Array(await blob.arrayBuffer()), kind: asPng ? 'png' : 'jpg', w: c.width, h: c.height };
  c.width = c.height = 0; return out;
}
const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
async function build() {
  const ps = $('input[name=ps]:checked').value, orient = $('#orient').value, m = +$('#margin').value;
  const out = await PDFLib.PDFDocument.create();
  for (let n = 0; n < items.length; n++) {
    const it = items[n], p = await prepare(it);
    const image = p.kind === 'jpg' ? await out.embedJpg(p.bytes) : await out.embedPng(p.bytes);
    let pw, ph, dw, dh;
    if (ps === 'fit') {
      let s = 0.75, big = Math.max(p.w, p.h) * s; if (big > 1000) s *= 1000 / big;
      dw = p.w * s; dh = p.h * s; pw = dw + 2 * m; ph = dh + 2 * m;
    } else {
      let [a, b] = SIZES[ps];
      const land = orient === 'auto' ? p.w > p.h : orient === 'landscape';
      pw = land ? b : a; ph = land ? a : b;
      const s = Math.min((pw - 2 * m) / p.w, (ph - 2 * m) / p.h); dw = p.w * s; dh = p.h * s;
    }
    const page = out.addPage([pw, ph]);
    page.drawImage(image, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
    prog.style.width = Math.round(6 + 86 * (n + 1) / items.length) + '%';
    await new Promise(r => setTimeout(r, 0));
  }
  out.setProducer('Dilia Studio'); out.setCreator('Dilia Studio');
  return new Blob([await out.save()], { type: 'application/pdf' });
}
go.addEventListener('click', async () => {
  if (busy || !items.length) return;
  busy = true; go.disabled = true; ws.classList.add('working'); prog.style.width = '4%';
  try {
    const blob = await build();
    prog.style.width = '100%';
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(blob);
    const name = cleanName($('#outName').value, 'Dilia-images', 'pdf');
    save(lastUrl, name);
    $('#doneName').textContent = name;
    $('#doneInfo').textContent = `${plural(items.length, 'page')}, ${kb(blob.size)}`;
    $('#again').href = lastUrl; $('#again').download = name;
    $('#done').hidden = false;
  } catch (e) {
    toast('The PDF did not finish: ' + (e.message || 'unknown error') + '.', true);
  }
  busy = false; ws.classList.remove('working');
  setTimeout(() => { prog.style.width = '0'; }, 600);
  summary();
});
function clearDone() { $('#done').hidden = true; }
$('#reset').addEventListener('click', () => {
  items.forEach(i => URL.revokeObjectURL(i.url)); items.length = 0; seq = 0;
  nameTouched = false; $('#outName').value = ''; clearDone(); render(); scrollTo({ top: 0, behavior: 'smooth' });
});
pick.addEventListener('change', () => { add(pick.files); pick.value = ''; });
if ($('#cam')) $('#cam').addEventListener('change', e => { add(e.target.files); e.target.value = ''; });
Kit.dropAnywhere(add);
render();
window.__dilia = { items };
}
