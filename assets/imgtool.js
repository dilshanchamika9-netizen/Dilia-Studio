/* Dilia Image engine: compress, resize, crop, rotate, convert, watermark, meme, blur, GIF maker, metadata.
   One file, one mode per page (body data-tool). Everything runs in this tab; nothing is uploaded. */
{
const { $, kb, plural, esc, toast, save, cleanName } = Kit;
const TOOL = document.body.dataset.tool, PRESET = document.body.dataset.out || '';
const items = [];            // {id,name,size,file,url,w,h,kind,rel,regions,res}
let seq = 0, busy = false, lastUrl = null;
const ws = $('#ws'), grid = $('#grid'), pick = $('#pick'), go = $('#go'), note = $('#note'), prog = $('#prog');
const val = (id, d) => { const e = $('#' + id); if (e) return e.type === 'checkbox' ? e.checked : e.value; const r = document.querySelector(`input[name=${id}]:checked`); return r ? r.value : d; };
const num = (id, d) => { const v = parseFloat(val(id, d)); return isFinite(v) ? v : d; };
const MP_MAX = 100e6;
const sleep = () => new Promise(r => setTimeout(r, 0));
const baseOf = n => n.replace(/\.[^.]+$/, '');
const extOf = n => (n.match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();

/* ---------- lazy libraries ---------- */
const libs = {};
const loadJs = f => libs[f] || (libs[f] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = DROOT + 'assets/vendor/img/' + f; s.onload = ok; s.onerror = () => { delete libs[f]; no(new Error('Could not load ' + f)); }; document.head.append(s); }));
const loadTiffLibs = async () => { if (!window.UTIF) { for (const f of ['pako_inflate.min.js', 'UTIF.js']) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = DROOT + 'assets/vendor/' + f; s.onload = ok; s.onerror = no; document.head.append(s); }); } };
const jsq = {};
async function jsqInit(which) {                       // wasm codecs are fetched only when needed
  await loadJs('jsquash.bundle.js');
  if (!jsq[which]) jsq[which] = (async () => {
    const r = await fetch(DROOT + 'assets/vendor/img/' + which + '_enc.wasm'); const m = await WebAssembly.compile(await r.arrayBuffer());
    await (which === 'avif' ? JSQ.avifInit(m) : JSQ.webpInit(m));
  })().catch(e => { delete jsq[which]; throw e; });
  return jsq[which];
}

/* ---------- file kinds ---------- */
const KIND = f => {
  const t = (f.type || '').toLowerCase(), e = extOf(f.name);
  if (/^image\/jpe?g$/.test(t) || /^jpe?g$/.test(e) || e === 'jfif') return 'jpg';
  if (t === 'image/png' || e === 'png') return 'png';
  if (t === 'image/webp' || e === 'webp') return 'webp';
  if (t === 'image/gif' || e === 'gif') return 'gif';
  if (t === 'image/bmp' || e === 'bmp') return 'bmp';
  if (t === 'image/avif' || e === 'avif') return 'avif';
  if (t === 'image/svg+xml' || e === 'svg') return 'svg';
  if (/tiff/.test(t) || /^tiff?$/.test(e)) return 'tiff';
  if (/hei[cf]/.test(t) || /^hei[cf]$/.test(e)) return 'heic';
  if (e === 'ico' || t === 'image/x-icon' || t === 'image/vnd.microsoft.icon') return 'ico';
  return '';
};
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff', ico: 'image/x-icon', svg: 'image/svg+xml' };
const SAME = { jpg: 'jpg', png: 'png', webp: 'webp', gif: 'png', bmp: 'png', avif: 'jpg', svg: 'png', tiff: 'png', heic: 'jpg', ico: 'png' };

/* ---------- reading ---------- */
async function tiffToPngs(f) {
  await loadTiffLibs();
  const buf = await f.arrayBuffer(), ifds = UTIF.decode(buf), out = [];
  for (let k = 0; k < ifds.length; k++) {
    UTIF.decodeImage(buf, ifds[k]); const w = ifds[k].width, h = ifds[k].height; if (!w || !h) continue;
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(ifds[k])), w, h), 0, 0);
    const b = await new Promise(r => c.toBlob(r, 'image/png')); c.width = c.height = 0;
    out.push(new File([b], ifds.length > 1 ? baseOf(f.name) + ` (page ${k + 1}).png` : baseOf(f.name) + '.png', { type: 'image/png' }));
  }
  if (!out.length) throw new Error('empty');
  return out;
}
async function heicToJpg(f) {
  await loadJs('heic2any.min.js');
  let r = await heic2any({ blob: f, toType: 'image/jpeg', quality: .92 }); if (Array.isArray(r)) r = r[0];
  return new File([r], baseOf(f.name) + '.jpg', { type: 'image/jpeg' });
}
function exifOf(u8) {                                  // small reader: orientation, camera, date, GPS
  const out = {};
  try {
    if (u8[0] !== 0xFF || u8[1] !== 0xD8) return out;
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let p = 2;
    while (p + 4 < u8.length && u8[p] === 0xFF) {
      const m = u8[p + 1], len = dv.getUint16(p + 2);
      if (m === 0xE1 && dv.getUint32(p + 4) === 0x45786966) {
        const t = p + 10, le = dv.getUint16(t) === 0x4949, U16 = o => dv.getUint16(o, le), U32 = o => dv.getUint32(o, le);
        const str = (e) => { const n = U32(e + 4), o = n > 4 ? t + U32(e + 8) : e + 8; let s = ''; for (let i = 0; i < n - 1 && i < 64; i++) s += String.fromCharCode(u8[o + i]); return s.trim(); };
        const rat = o => U32(o) / (U32(o + 4) || 1);
        const walk = (ifd, gps) => {
          const n = U16(ifd);
          for (let i = 0; i < n; i++) {
            const e = ifd + 2 + i * 12, tag = U16(e);
            if (!gps) {
              if (tag === 0x0112) out.orient = U16(e + 8);
              else if (tag === 0x010F) out.make = str(e);
              else if (tag === 0x0110) out.model = str(e);
              else if (tag === 0x0132 || tag === 0x9003) out.date = out.date || str(e);
              else if (tag === 0x8825) out.gpsAt = t + U32(e + 8);
              else if (tag === 0x8769) out.exifAt = t + U32(e + 8);
            } else if (tag === 2 || tag === 4) { const o = t + U32(e + 8); out[tag === 2 ? 'lat' : 'lon'] = rat(o) + rat(o + 8) / 60 + rat(o + 16) / 3600; }
            else if (tag === 1) out.latRef = String.fromCharCode(u8[e + 8]); else if (tag === 3) out.lonRef = String.fromCharCode(u8[e + 8]);
          }
        };
        walk(t + U32(t + 4), false);
        if (out.exifAt) walk(out.exifAt, false);
        if (out.gpsAt) { walk(out.gpsAt, true); if (out.latRef === 'S') out.lat = -out.lat; if (out.lonRef === 'W') out.lon = -out.lon; }
        return out;
      }
      if (m === 0xDA) break; p += 2 + len;
    }
  } catch (e) { /* unreadable EXIF: show nothing */ }
  return out;
}
async function svgSize(f) {
  const t = await f.text(), m = t.match(/viewBox\s*=\s*["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/), w = t.match(/\swidth\s*=\s*["']([\d.]+)/), h = t.match(/\sheight\s*=\s*["']([\d.]+)/);
  return { w: Math.round(+(w ? w[1] : m ? m[1] : 512)) || 512, h: Math.round(+(h ? h[1] : m ? m[2] : 512)) || 512 };
}
const imgEl = url => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('bad image')); i.src = url; });
async function readSource(it, wantW) {                 // -> drawable + size, first frame for animations
  if (it.kind === 'svg') {
    const s = await svgSize(it.file), k = wantW ? wantW / s.w : 1, w = Math.max(1, Math.round(s.w * k)), h = Math.max(1, Math.round(s.h * k));
    const img = await imgEl(it.url); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); return { src: c, w, h, temp: c };
  }
  const bmp = await createImageBitmap(it.file); return { src: bmp, w: bmp.width, h: bmp.height, temp: bmp };
}
const freeSrc = s => { if (s.temp) { if (s.temp.close) s.temp.close(); else s.temp.width = s.temp.height = 0; } };

async function add(list0) {
  const list = [...list0]; if (!list.length) return;
  ws.classList.add('working'); let bad = 0; const skipped = [];
  for (let f of list) {
    try {
      let kind = KIND(f);
      if (!kind) { skipped.push(f.name); continue; }
      if (TOOL === 'gif' && kind === 'gif' && list.length === 1 && false) { /* single gif stays a gif */ }
      if (kind === 'tiff') { for (const g of await tiffToPngs(f)) await push(g, 'png'); continue; }
      if (kind === 'heic') { if (!f.size) throw 0; f = await heicToJpg(f); kind = 'jpg'; }
      await push(f, kind);
    } catch (e) { bad++; toast(`${f.name} could not be read. It may be damaged or an unsupported type.`, true); }
  }
  if (skipped.length) toast(`${plural(skipped.length, 'file')} skipped: not an image type this tool reads.`, true);
  ws.classList.remove('working'); clearDone(); render();
}
async function push(f, kind) {
  if (!f.size) throw new Error('empty');
  let w, h;
  if (kind === 'svg') ({ w, h } = await svgSize(f));
  else if (kind === 'ico') { const u = URL.createObjectURL(f); try { const i = await imgEl(u); w = i.naturalWidth; h = i.naturalHeight; } finally { URL.revokeObjectURL(u); } }
  else { const b = await createImageBitmap(f); w = b.width; h = b.height; b.close && b.close(); }
  if (w * h > MP_MAX * 1.5) throw new Error('too big');
  const it = { id: 'i' + (++seq), name: f.name, size: f.size, file: f, url: URL.createObjectURL(f), w, h, kind, rel: null, regions: [], res: null };
  if (TOOL === 'meta' && kind === 'jpg') it.exif = exifOf(new Uint8Array(await f.slice(0, 131072).arrayBuffer()));
  items.push(it);
}

/* ---------- encoders ---------- */
const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
const imgData = c => c.getContext('2d').getImageData(0, 0, c.width, c.height);
function flatten(c, color = '#fff') { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0); return o; }
const hasAlpha = c => { const d = imgData(c).data; for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return true; return false; };
const u32 = (n) => [n & 255, n >> 8 & 255, n >> 16 & 255, n >>> 24];
const pngCnum = q => q >= 95 ? 0 : q >= 80 ? 256 : q >= 60 ? 128 : q >= 40 ? 64 : 32;
async function encPng(c, q) {
  await loadJs('upng.bundle.js'); const d = imgData(c);
  return new Blob([UPNG.encode([d.data.buffer], c.width, c.height, pngCnum(q))], { type: 'image/png' });
}
async function encWebp(c, q) {
  const b = await toBlob(c, 'image/webp', q / 100); if (b && b.type === 'image/webp') return b;
  await jsqInit('webp'); return new Blob([await JSQ.webpEncode(imgData(c), { quality: q })], { type: 'image/webp' });
}
async function encAvif(c, q) { await jsqInit('avif'); return new Blob([await JSQ.avifEncode(imgData(c), { quality: q, speed: 8 })], { type: 'image/avif' }); }
function encBmp(c) {
  const w = c.width, h = c.height, d = imgData(c.getContext ? flatten(c) : c).data, row = (w * 3 + 3) & ~3, size = 54 + row * h, b = new Uint8Array(size);
  b.set([66, 77, ...u32(size), 0, 0, 0, 0, ...u32(54), ...u32(40), ...u32(w), ...u32(h), 1, 0, 24, 0, 0, 0, 0, 0, ...u32(row * h), 0x13, 0x0B, 0, 0, 0x13, 0x0B, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  for (let y = 0; y < h; y++) { let o = 54 + (h - 1 - y) * row; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; b[o++] = d[i + 2]; b[o++] = d[i + 1]; b[o++] = d[i]; } }
  return new Blob([b], { type: 'image/bmp' });
}
async function encTiff(c) { await loadTiffLibs(); return new Blob([UTIF.encodeImage(imgData(c).data, c.width, c.height)], { type: 'image/tiff' }); }
async function encGif(c) {
  await loadJs('giflib.bundle.js'); const f = flatten(c), d = imgData(f).data, pal = GIFLIB.quantize(d, 256), idx = GIFLIB.applyPalette(d, pal), g = GIFLIB.GIFEncoder();
  g.writeFrame(idx, c.width, c.height, { palette: pal }); g.finish(); return new Blob([g.bytes()], { type: 'image/gif' });
}
async function encIco(c) {                             // PNG-embedded icon with several sizes
  const sizes = [16, 32, 48, 64, 128, 256].filter(s => s <= Math.max(c.width, c.height) || s === 16), pngs = [];
  for (const s of sizes) { const o = document.createElement('canvas'); o.width = o.height = s; const x = o.getContext('2d'), k = Math.min(s / c.width, s / c.height); x.imageSmoothingQuality = 'high'; x.drawImage(c, (s - c.width * k) / 2, (s - c.height * k) / 2, c.width * k, c.height * k); pngs.push(new Uint8Array(await (await toBlob(o, 'image/png')).arrayBuffer())); o.width = o.height = 0; }
  const head = new Uint8Array(6 + 16 * sizes.length); head.set([0, 0, 1, 0, sizes.length, 0]); let off = head.length;
  sizes.forEach((s, i) => { head.set([s === 256 ? 0 : s, s === 256 ? 0 : s, 0, 0, 1, 0, 32, 0, ...u32(pngs[i].length), ...u32(off)], 6 + i * 16); off += pngs[i].length; });
  return new Blob([head, ...pngs], { type: 'image/x-icon' });
}
async function encode(c, fmt, q) {
  if (fmt === 'jpg') return toBlob(flatten(c), 'image/jpeg', q / 100);
  if (fmt === 'png') return encPng(c, q);
  if (fmt === 'webp') return encWebp(c, q);
  if (fmt === 'avif') return encAvif(c, q);
  if (fmt === 'bmp') return encBmp(c);
  if (fmt === 'tiff') return encTiff(c);
  if (fmt === 'gif') return encGif(c);
  if (fmt === 'ico') return encIco(c);
  throw new Error('format');
}
const LOSSY = { jpg: 1, webp: 1, avif: 1 };
async function toTarget(c, fmt, q, maxBytes) {        // lower quality, then size, until it fits
  let best = await encode(c, fmt, q), cur = c, scaled = 0;
  for (let round = 0; round < 8 && best.size > maxBytes; round++) {
    let lo = 5, hi = q, got = null;
    if (fmt === 'png') { for (const cq of [79, 59, 39, 10]) { if (cq >= q) continue; const b = await encode(cur, fmt, cq); got = b; if (b.size <= maxBytes) break; } }
    else { for (let i = 0; i < 6; i++) { const mid = Math.round((lo + hi) / 2), b = await encode(cur, fmt, mid); if (b.size <= maxBytes) { got = b; lo = mid + 1; } else hi = mid - 1; if (lo > hi) break; } if (!got) got = await encode(cur, fmt, 5); }
    if (got && got.size < best.size) best = got;
    if (best.size <= maxBytes) break;
    const n = document.createElement('canvas'); n.width = Math.max(1, Math.round(cur.width * .85)); n.height = Math.max(1, Math.round(cur.height * .85)); const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, n.width, n.height);
    if (scaled++) { cur.width = cur.height = 0; } cur = n; q = Math.min(q, 70);
    await sleep();
  }
  if (cur !== c) { best.__w = cur.width; best.__h = cur.height; cur.width = cur.height = 0; }
  return best;
}

/* ---------- JPEG / PNG metadata, lossless strip ---------- */
function stripJpeg(u8) {
  if (u8[0] !== 0xFF || u8[1] !== 0xD8) return null;
  const parts = [u8.subarray(0, 2)]; let p = 2;
  while (p + 4 <= u8.length && u8[p] === 0xFF) {
    const m = u8[p + 1]; if (m === 0xDA) break;
    const len = (u8[p + 2] << 8) | u8[p + 3], seg = u8.subarray(p, p + 2 + len);
    const drop = m === 0xE1 || m === 0xED || m === 0xFE || (m >= 0xE2 && m <= 0xEF) || m === 0xE0 && false;
    if (!drop) parts.push(seg); p += 2 + len;
  }
  parts.push(u8.subarray(p)); return new Blob(parts, { type: 'image/jpeg' });
}
function stripPng(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), parts = [u8.subarray(0, 8)]; let p = 8;
  while (p + 12 <= u8.length) {
    const len = dv.getUint32(p), type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]), end = p + 12 + len;
    if (!/^(tEXt|iTXt|zTXt|eXIf|tIME)$/.test(type)) parts.push(u8.subarray(p, end)); p = end;
  }
  return new Blob(parts, { type: 'image/png' });
}

/* ---------- processing ---------- */
const outFmt = it => {
  const o = PRESET || val('outFmt', 'same');
  return o === 'same' || o === 'auto' || o === 'svgopt' || o === 'gifopt' ? SAME[it.kind] : o;
};
const quality = () => Math.min(100, Math.max(5, num('q', 75)));
function applyCrop(c, it) {
  const asp = val('cAspect', 'free'); let r = it.rel;
  if (!r) { if (asp === 'free' || asp === 'circle' && false) return c; r = centered(c.width, c.height, asp); }
  const x = Math.round(r.x * c.width), y = Math.round(r.y * c.height), w = Math.max(1, Math.round(r.w * c.width)), h = Math.max(1, Math.round(r.h * c.height));
  const o = document.createElement('canvas'); o.width = w; o.height = h; const g = o.getContext('2d'); g.drawImage(c, x, y, w, h, 0, 0, w, h);
  if (asp === 'circle') { g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 7); g.fill(); }
  return o;
}
function centered(W, H, asp) {
  let ar = asp === 'free' ? W / H : asp === 'circle' ? 1 : asp.split(':').reduce((a, b) => a / b);
  let w = W, h = W / ar; if (h > H) { h = H; w = H * ar; }
  return { x: (W - w) / 2 / W, y: (H - h) / 2 / H, w: w / W, h: h / H };
}
function turn(c, deg, fh, fv) {
  const t = deg % 180 !== 0, o = document.createElement('canvas'); o.width = t ? c.height : c.width; o.height = t ? c.width : c.height;
  const g = o.getContext('2d'); g.translate(o.width / 2, o.height / 2); g.rotate(deg * Math.PI / 180); g.scale(fh ? -1 : 1, fv ? -1 : 1); g.drawImage(c, -c.width / 2, -c.height / 2); return o;
}
function sized(c, w, h) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); if (w === c.width && h === c.height) return c;
  const k = Math.min(1, Math.sqrt(MP_MAX / (w * h))); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
  let cur = c;                                           // halve step by step for clean downscaling
  while (cur.width / 2 > w && cur.height / 2 > h) { const n = document.createElement('canvas'); n.width = Math.ceil(cur.width / 2); n.height = Math.ceil(cur.height / 2); const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, n.width, n.height); if (cur !== c) cur.width = cur.height = 0; cur = n; }
  const o = document.createElement('canvas'); o.width = w; o.height = h; const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, w, h); if (cur !== c) cur.width = cur.height = 0; return o;
}
function resizeBox(it, W, H) {
  const mode = val('rzMode', 'px'), keep = val('rzKeep', true);
  if (mode === 'pct') { const p = num('rzPct', 50) / 100; return [W * p, H * p]; }
  let w = num('rzW', 0), h = num('rzH', 0);
  if (!w && !h) return [W, H];
  if (keep) { if (w && h) { const k = Math.min(w / W, h / H); return [W * k, H * k]; } if (w) return [w, H * w / W]; return [W * h / H, h]; }
  return [w || W, h || H];
}
async function wmImage() {
  const f = $('#wmImg') && $('#wmImg').files[0]; if (!f) return null;
  return createImageBitmap(f);
}
function watermark(c, logo) {
  const txt = val('wmText', ''), pos = val('wmPos', 'br'), op = num('wmOp', 40) / 100, sz = num('wmSize', 20) / 100, ang = num('wmAng', 0), tile = val('wmTile', false), col = val('wmColor', '#ffffff');
  if (!txt && !logo) return c;
  const g = c.getContext('2d'), m = Math.max(8, Math.round(Math.min(c.width, c.height) * .03));
  g.save(); g.globalAlpha = op;
  let w, h, draw;
  if (logo) { w = Math.max(8, c.width * sz); h = w * logo.height / logo.width; draw = () => g.drawImage(logo, -w / 2, -h / 2, w, h); }
  else {
    const fs = Math.max(10, c.height * sz * .4); g.font = `700 ${fs}px Archivo, Arial, sans-serif`; w = g.measureText(txt).width; h = fs;
    draw = () => { g.font = `700 ${fs}px Archivo, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = Math.max(1, fs / 14); g.strokeStyle = 'rgba(0,0,0,.45)'; g.fillStyle = col; g.strokeText(txt, 0, 0); g.fillText(txt, 0, 0); };
  }
  const at = (x, y) => { g.save(); g.translate(x, y); g.rotate(ang * Math.PI / 180); draw(); g.restore(); };
  if (tile) { const gx = w * 1.8, gy = h * 3.2; for (let y = gy / 2, r = 0; y < c.height + gy; y += gy, r++) for (let x = (r % 2 ? gx / 2 : 0); x < c.width + gx; x += gx) at(x, y); }
  else { const px = pos[1] === 'l' ? m + w / 2 : pos[1] === 'r' ? c.width - m - w / 2 : c.width / 2, py = pos[0] === 't' ? m + h / 2 : pos[0] === 'b' ? c.height - m - h / 2 : c.height / 2; at(px, py); }
  g.restore(); return c;
}
function blurRegions(c, regs) {
  const g = c.getContext('2d'), mode = val('bMode', 'blur');
  for (const r of regs) {
    const x = Math.max(0, Math.round(r.x * c.width)), y = Math.max(0, Math.round(r.y * c.height)), w = Math.min(c.width - x, Math.round(r.w * c.width)), h = Math.min(c.height - y, Math.round(r.h * c.height));
    if (w < 1 || h < 1) continue;
    if (r.m === 'black' || mode === 'black') { g.fillStyle = '#000'; g.fillRect(x, y, w, h); continue; }
    const cell = Math.max(4, Math.round(Math.max(w, h) / 12)), t = document.createElement('canvas'); t.width = Math.max(1, Math.ceil(w / cell)); t.height = Math.max(1, Math.ceil(h / cell));
    const tg = t.getContext('2d'); tg.drawImage(c, x, y, w, h, 0, 0, t.width, t.height);
    if (r.m === 'pixel' || mode === 'pixel') { g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, t.width, t.height, x, y, w, h); g.imageSmoothingEnabled = true; }
    else { const s = document.createElement('canvas'); s.width = w; s.height = h; const sg = s.getContext('2d'); sg.filter = `blur(${Math.max(4, Math.round(Math.max(w, h) / 14))}px)`; sg.drawImage(c, x, y, w, h, 0, 0, w, h); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(s, x, y); g.restore(); s.width = s.height = 0; }
    t.width = t.height = 0;
  }
}
function memeText(c) {
  const top = val('mTop', '').toUpperCase(), bot = val('mBot', '').toUpperCase(), col = val('mColor', '#ffffff'), g = c.getContext('2d'), fs0 = Math.round(c.width * num('mSize', 9) / 100);
  g.textAlign = 'center'; g.lineJoin = 'round'; g.fillStyle = col; g.strokeStyle = '#000';
  const lines = (t, fs) => { g.font = `900 ${fs}px Impact, 'Archivo Black', Archivo, Arial, sans-serif`; const words = t.split(/\s+/), out = []; let cur = ''; for (const w of words) { const n = cur ? cur + ' ' + w : w; if (g.measureText(n).width > c.width * .94 && cur) { out.push(cur); cur = w; } else cur = n; } if (cur) out.push(cur); return out; };
  const put = (t, fromTop) => {
    if (!t) return; let fs = fs0, L = lines(t, fs);
    while (L.length * fs * 1.1 > c.height * .35 && fs > 12) { fs = Math.round(fs * .9); L = lines(t, fs); }
    g.font = `900 ${fs}px Impact, 'Archivo Black', Archivo, Arial, sans-serif`; g.lineWidth = Math.max(2, fs / 7); g.textBaseline = 'top';
    L.forEach((ln, i) => { const y = fromTop ? fs * .25 + i * fs * 1.1 : c.height - fs * .25 - (L.length - i) * fs * 1.1; g.strokeText(ln, c.width / 2, y); g.fillText(ln, c.width / 2, y); });
  };
  put(top, true); put(bot, false);
}

async function gifFrames(it) {                         // animated GIF -> canvases + delays
  await loadJs('giflib.bundle.js');
  const gif = GIFLIB.parseGIF(await it.file.arrayBuffer()), fr = GIFLIB.decompressFrames(gif, true);
  return { w: gif.lsd.width, h: gif.lsd.height, fr };
}
async function compressGif(it, onP) {
  const { w, h, fr } = await gifFrames(it), q = quality(), maxC = q >= 85 ? 256 : q >= 60 ? 128 : q >= 35 ? 64 : 32;
  const sc = num('cScale', 100) / 100, W = Math.max(1, Math.round(w * sc)), H = Math.max(1, Math.round(h * sc));
  const full = document.createElement('canvas'); full.width = w; full.height = h; const fg = full.getContext('2d');
  const out = document.createElement('canvas'); out.width = W; out.height = H; const og = out.getContext('2d');
  const g = GIFLIB.GIFEncoder(); let prev = null;
  for (let i = 0; i < fr.length; i++) {
    const f = fr[i], p = f.dims;
    if (prev && prev.disposal === 2) fg.clearRect(prev.x, prev.y, prev.w, prev.h);
    if (prev && prev.disposal === 3 && prev.snap) fg.putImageData(prev.snap, 0, 0);
    const snap = f.disposalType === 3 ? fg.getImageData(0, 0, w, h) : null;
    const patch = new ImageData(new Uint8ClampedArray(f.patch), p.width, p.height), t = document.createElement('canvas'); t.width = p.width; t.height = p.height; t.getContext('2d').putImageData(patch, 0, 0); fg.drawImage(t, p.left, p.top); t.width = t.height = 0;
    og.clearRect(0, 0, W, H); og.imageSmoothingQuality = 'high'; og.drawImage(full, 0, 0, W, H);
    const d = og.getImageData(0, 0, W, H).data, pal = GIFLIB.quantize(d, maxC, { format: 'rgba4444', oneBitAlpha: true }), idx = GIFLIB.applyPalette(d, pal, 'rgba4444');
    const ti = pal.findIndex(c => c.length > 3 && c[3] === 0);
    g.writeFrame(idx, W, H, { palette: pal, delay: f.delay || 100, transparent: ti >= 0, transparentIndex: ti >= 0 ? ti : 0, repeat: i === 0 ? 0 : undefined, dispose: 2 });
    prev = { disposal: f.disposalType, x: p.left, y: p.top, w: p.width, h: p.height, snap };
    if (i % 4 === 3) { onP && onP(i / fr.length); await sleep(); }
  }
  g.finish(); full.width = full.height = out.width = out.height = 0;
  return { blob: new Blob([g.bytes()], { type: 'image/gif' }), w: W, h: H, frames: fr.length };
}
async function optimiseSvg(it) {
  await loadJs('svgo.bundle.js'); const txt = await it.file.text();
  const r = SVGO.optimize(txt, { multipass: true, js2svg: { pretty: false } });
  return { blob: new Blob([r.data], { type: 'image/svg+xml' }), w: it.w, h: it.h };
}

async function processOne(it, onP) {
  const fmt = outFmt(it), res = { name: it.name, w: it.w, h: it.h };
  // lossless fast paths
  if (TOOL === 'meta') {
    const u8 = new Uint8Array(await it.file.arrayBuffer());
    if (it.kind === 'jpg') {
      const ex = exifOf(u8);
      if (!ex.orient || ex.orient === 1) { const b = stripJpeg(u8); if (b) return { ...res, blob: b, ext: 'jpg' }; }
      const s = await readSource(it), c = document.createElement('canvas'); c.width = s.w; c.height = s.h; c.getContext('2d').drawImage(s.src, 0, 0); freeSrc(s);
      const b = await toBlob(c, 'image/jpeg', .95); c.width = c.height = 0; return { ...res, blob: b, ext: 'jpg', note: 'turned upright' };
    }
    if (it.kind === 'png') return { ...res, blob: stripPng(u8), ext: 'png' };
    if (it.kind === 'webp' || it.kind === 'gif' || it.kind === 'avif' || it.kind === 'bmp') { const s = await readSource(it), c = document.createElement('canvas'); c.width = s.w; c.height = s.h; c.getContext('2d').drawImage(s.src, 0, 0); freeSrc(s); const b = await encode(c, SAME[it.kind] === 'png' && it.kind === 'webp' ? 'webp' : SAME[it.kind], 92); c.width = c.height = 0; return { ...res, blob: b, ext: it.kind === 'webp' ? 'webp' : SAME[it.kind] }; }
    throw new Error('This type carries no editable metadata.');
  }
  const raw = PRESET || val('outFmt', 'same'), keepType = raw === 'same' || raw === 'svgopt' || raw === 'gifopt';
  if (TOOL === 'compress' && keepType && (it.kind === 'svg' || it.kind === 'gif')) {
    const r = it.kind === 'svg' ? await optimiseSvg(it) : await compressGif(it, onP); r.ext = it.kind;
    if (r.blob.size >= it.size) { r.blob = it.file; r.kept = true; } return r;
  }
  if (TOOL === 'gif') throw new Error('x');

  const s = await readSource(it, TOOL === 'resize' ? 0 : (it.kind === 'svg' ? Math.min(4096, Math.max(it.w, 1024)) : 0));
  if (s.w * s.h > MP_MAX) { freeSrc(s); throw new Error('This image is over 100 megapixels. Resize it with a smaller scale first.'); }
  let c = document.createElement('canvas'); c.width = s.w; c.height = s.h; c.getContext('2d').drawImage(s.src, 0, 0); freeSrc(s);
  const step = n => { if (n !== c) { c.width = c.height = 0; c = n; } };
  if (TOOL === 'blur' && it.regions.length) blurRegions(c, it.regions);
  if (TOOL === 'crop') step(applyCrop(c, it));
  if (TOOL === 'rotate') { const d = num('rotDeg', 90), fh = val('rotFh', false), fv = val('rotFv', false); step(turn(c, ((d % 360) + 360) % 360, fh, fv)); }
  if (TOOL === 'resize' || TOOL === 'compress') {
    let w = c.width, h = c.height;
    if (TOOL === 'resize') [w, h] = resizeBox(it, w, h); else { const sc = num('cScale', 100) / 100; w *= sc; h *= sc; }
    if (TOOL === 'resize' && val('rzNoUp', true) && (w > c.width || h > c.height)) { w = c.width; h = c.height; }
    step(sized(c, w, h));
  }
  if (TOOL === 'watermark') { const logo = val('wmKind', 'text') === 'image' ? await wmImage() : null; watermark(c, logo); logo && logo.close && logo.close(); }
  if (TOOL === 'meme') memeText(c);
  let fmt2 = fmt;
  if (PRESET === 'auto' || (!PRESET && TOOL === 'compress' && val('outFmt', 'same') === 'auto')) {
    const cands = ['jpg', 'webp'].concat(hasAlpha(c) ? ['png'] : []), q = quality(); let best = null;
    for (const f of cands) { const b = await encode(c, f, q); if (!best || b.size < best.b.size) best = { f, b }; }
    fmt2 = best.f; res.blob = best.b;
  } else {
    const q = quality(), tgt = TOOL === 'compress' ? num('tgt', 0) * 1024 : 0;
    if (tgt > 0 && fmt !== 'bmp' && fmt !== 'tiff' && fmt !== 'ico') { res.blob = await toTarget(c, fmt, q, tgt); if (res.blob.__w) { res.w = res.blob.__w; res.h = res.blob.__h; } }
    else res.blob = await encode(c, fmt, q);
  }
  if (!res.blob.__w) { res.w = c.width; res.h = c.height; }
  c.width = c.height = 0;
  // compressing must never make a file bigger: keep the original when that happens
  if (TOOL === 'compress' && res.blob.size >= it.size && fmt2 === SAME[it.kind] && it.kind === fmt2 && num('cScale', 100) === 100 && !num('tgt', 0)) { res.blob = it.file; res.kept = true; res.w = it.w; res.h = it.h; }
  res.ext = fmt2; return res;
}
const EXTFIX = { jpg: 'jpg', jpeg: 'jpg' };
function outName(it, r, used) {
  const keepExt = extOf(it.name), same = (r.ext === 'jpg' && /^jpe?g$/.test(keepExt)) || keepExt === r.ext;
  let n = same || r.kept ? it.name : baseOf(it.name) + '.' + r.ext, k = 1;
  const want = n; while (used.has(n.toLowerCase())) { n = baseOf(want) + ' (' + (++k) + ')' + (/\.[^.]+$/.test(want) ? want.match(/\.[^.]+$/)[0] : ''); }
  used.add(n.toLowerCase()); return n;
}

/* ---------- drawing ---------- */
const BIN = '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const EDIT = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CMP = '<svg viewBox="0 0 24 24"><path d="M12 3v18M4 6h5v12H4zM15 6h5v12h-5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const metaLine = it => {
  const e = it.exif; if (!e) return '';
  const bits = [[e.make, e.model].filter(Boolean).join(' '), e.date, e.lat != null && e.lon != null ? `GPS ${e.lat.toFixed(4)}, ${e.lon.toFixed(4)}` : ''].filter(Boolean);
  return bits.length ? bits.join(' · ') : 'No camera details found';
};
function render() {
  ws.dataset.state = items.length ? 'full' : 'empty'; memeSoon();
  grid.innerHTML = items.map((it, n) => `<article class="card page pix" data-id="${it.id}" aria-label="Image ${n + 1}">
    <div class="pv ok"><img src="${it.url}" alt="" loading="lazy">${it.res && it.res.error ? '' : ''}</div>
    <div class="pmeta"><i></i><span>${n + 1}</span><em title="${esc(it.name)}">${esc(it.name)}</em></div>
    <p class="pstat" data-st>${statText(it)}</p>
    ${TOOL === 'meta' ? `<p class="pstat exif">${esc(metaLine(it))}</p>` : ''}
    <div class="tools-row">
      ${(TOOL === 'crop' || TOOL === 'blur') ? `<button type="button" data-ed="1" aria-label="${TOOL === 'crop' ? 'Set crop area' : 'Mark areas'}">${EDIT}</button>` : ''}
      ${it.res && it.res.blob && it.res.blob !== it.file && it.kind !== 'svg' && it.res.ext !== 'gif' ? `<button type="button" data-cmp="1" aria-label="Compare before and after">${CMP}</button>` : ''}
      <button type="button" data-rm="1" aria-label="Remove image">${BIN}</button>
    </div></article>`).join('');
  summary();
}
function statText(it) {
  const r = it.res, base = `${it.w} × ${it.h} · ${kb(it.size)}`;
  if (!r) return (TOOL === 'crop' && it.rel ? 'Crop area set · ' : '') + (TOOL === 'blur' && it.regions.length ? `${plural(it.regions.length, 'area')} marked · ` : '') + base;
  if (r.error) return `<b class="bad">${esc(r.error)}</b>`;
  const out = r.blob.size, pc = Math.round((1 - out / it.size) * 100);
  return `${it.w} × ${it.h} → ${r.w} × ${r.h}<br>${kb(it.size)} → ${kb(out)}${TOOL === 'compress' ? (r.kept ? ' · already small, kept as is' : pc > 0 ? ` · saved ${pc}%` : ' · larger') : ''}`;
}
let nameTouched = false;
$('#outName').addEventListener('input', () => { nameTouched = true; });
function summary() {
  const total = items.reduce((a, i) => a + i.size, 0), done = items.filter(i => i.res && i.res.blob);
  $('#s1').textContent = items.length; $('#s3').textContent = kb(total);
  $('#s2').textContent = TOOL === 'compress' && done.length ? `-${Math.max(0, Math.round((1 - done.reduce((a, i) => a + i.res.blob.size, 0) / done.reduce((a, i) => a + i.size, 0)) * 100))}%` : items.length > 1 ? 'ZIP' : (items.length ? 'Image' : '0');
  const multi = items.length > 1 && TOOL !== 'gif' && TOOL !== 'meme';
  if (!nameTouched && items.length) $('#outName').value = multi ? 'Dilia-images' : baseOf(items[0].name);
  const ext = $('#ext'); if (ext) ext.textContent = multi ? '.zip' : (TOOL === 'gif' ? '.gif' : '');
  const lab = document.querySelector('label.field[for=outName]'); if (lab && lab.firstChild) lab.firstChild.textContent = multi ? 'ZIP name' : (TOOL === 'gif' ? 'File name' : 'File name (kept from your image)');
  $('#outName').disabled = !multi && TOOL !== 'gif';
  go.disabled = busy || !items.length || (TOOL === 'gif' && items.length < 2);
  note.textContent = !items.length ? 'Add at least one image to start.' : TOOL === 'gif' && items.length < 2 ? 'Add at least two images for the frames.' : multi ? `${plural(items.length, 'image')}. They download together as one ZIP, original names kept.` : 'Your file keeps its original name.';
}

Sortable.create(grid, {
  animation: 200, easing: 'cubic-bezier(.2,.8,.2,1)', ghostClass: 'sort-ghost', chosenClass: 'chosen', dragClass: 'dragging', filter: 'button', preventOnFilter: false, delay: 120, delayOnTouchOnly: true,
  onEnd() { const order = [...grid.children].map(e => e.dataset.id); items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)); clearDone(); render(); }
});
grid.addEventListener('click', e => {
  const card = e.target.closest('.page'); if (!card) return; const it = items.find(x => x.id === card.dataset.id);
  if (e.target.closest('[data-rm]')) { URL.revokeObjectURL(it.url); items.splice(items.indexOf(it), 1); clearDone(); render(); }
  else if (e.target.closest('[data-ed]')) openEditor(it);
  else if (e.target.closest('[data-cmp]')) openCompare(it);
});
$('#sortAz') && $('#sortAz').addEventListener('click', () => { items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })); clearDone(); render(); });
document.querySelectorAll('.optbar input,.optbar select').forEach(e => e.addEventListener('input', () => { if (e.id !== 'wmImg' || true) { clearResults(); } }));
// Live preview for the meme tool: small canvas that redraws as the text, size or colour changes.
var memeBox = null, memeTimer = 0, memeId = '';
async function memePreview() {
  if (TOOL !== 'meme') return;
  const bar = document.querySelector('.optbar'); if (!bar) return;
  if (!items.length) { if (memeBox) memeBox.hidden = true; return; }
  if (!memeBox) { memeBox = document.createElement('div'); memeBox.className = 'memeprev'; memeBox.innerHTML = '<canvas aria-label="Meme preview"></canvas><p>Live preview</p>'; bar.after(memeBox); }
  memeBox.hidden = false;
  const it = items[0], cv = memeBox.querySelector('canvas');
  let img = memePreview.img; if (memeId !== it.id || !img) { try { const s = await readSource(it, 0), k = Math.min(1, 720 / Math.max(s.w, s.h)); const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(s.w * k)); t.height = Math.max(1, Math.round(s.h * k)); t.getContext('2d').drawImage(s.src, 0, 0, t.width, t.height); freeSrc(s); img = memePreview.img = t; memeId = it.id; } catch (e) { memeBox.hidden = true; return; } }
  cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0); memeText(cv);
}
function memeSoon() { clearTimeout(memeTimer); memeTimer = setTimeout(memePreview, 60); }
document.querySelectorAll('.optbar input,.optbar select').forEach(e => e.addEventListener('input', memeSoon));


/* ---------- modal: crop box, blur areas, compare ---------- */
function modal(title, body, onOk) {
  const m = document.createElement('div'); m.className = 'pxmodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', title);
  m.innerHTML = `<div class="pxbox"><div class="pxhead"><b>${esc(title)}</b><button type="button" class="btn ghost sm" data-x>${onOk ? 'Cancel' : 'Close'}</button>${onOk ? '<button type="button" class="btn sm" data-ok>Done</button>' : ''}</div><div class="pxbody"></div></div>`;
  m.querySelector('.pxbody').append(body); document.body.append(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', key); }; const key = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) close(); if (e.target.closest('[data-ok]')) { onOk(); close(); } });
  return close;
}
async function openEditor(it) {
  const s = await readSource(it, 0).catch(() => null); if (!s) return toast('This image could not be opened.', true);
  const wrap = document.createElement('div'); wrap.className = 'pxed';
  const stage = document.createElement('div'); stage.className = 'pxstage'; const cv = document.createElement('canvas'); stage.append(cv); wrap.append(stage);
  const k = Math.min(1, 900 / s.w, 560 / s.h); cv.width = Math.round(s.w * k); cv.height = Math.round(s.h * k); cv.getContext('2d').drawImage(s.src, 0, 0, cv.width, cv.height); freeSrc(s);
  const ov = document.createElement('canvas'); ov.width = cv.width; ov.height = cv.height; stage.append(ov); const og = ov.getContext('2d');
  const asp = val('cAspect', 'free'), arNum = asp === 'free' ? 0 : asp === 'circle' ? 1 : asp.split(':').reduce((a, b) => a / b);
  let box = TOOL === 'crop' ? (it.rel ? { ...it.rel } : centered(it.w, it.h, asp === 'free' ? '1:1' : asp)) : null; if (TOOL === 'crop' && !it.rel && asp === 'free') box = { x: .1, y: .1, w: .8, h: .8 };
  const regs = TOOL === 'blur' ? it.regions.map(r => ({ ...r })) : []; let drag = null, cur = null;
  const hint = document.createElement('p'); hint.className = 'tip'; hint.textContent = TOOL === 'crop' ? 'Drag the box to move it. Drag a corner to resize it.' : 'Drag on the picture to mark an area. Click a marked area to remove it.'; wrap.append(hint);
  if (TOOL === 'crop') { const f = document.createElement('div'); f.className = 'pxnums'; f.innerHTML = ['x', 'y', 'w', 'h'].map(n => `<label>${n.toUpperCase()}<input type="number" min="0" data-n="${n}"></label>`).join('') + '<span>pixels</span>'; wrap.append(f); f.addEventListener('input', e => { const n = e.target.dataset.n; if (!n) return; const v = Math.max(0, +e.target.value || 0); const sc = n === 'x' || n === 'w' ? it.w : it.h; box[n] = Math.min(1, v / sc); box.w = Math.min(box.w, 1 - box.x); box.h = Math.min(box.h, 1 - box.y); if (arNum && (n === 'w')) box.h = box.w * it.w / it.h / arNum; draw(); }); }
  const nums = () => { if (TOOL !== 'crop') return; wrap.querySelectorAll('[data-n]').forEach(i => { const n = i.dataset.n, sc = n === 'x' || n === 'w' ? it.w : it.h; if (document.activeElement !== i) i.value = Math.round(box[n] * sc); }); };
  function draw() {
    og.clearRect(0, 0, ov.width, ov.height);
    if (TOOL === 'crop') {
      const x = box.x * ov.width, y = box.y * ov.height, w = box.w * ov.width, h = box.h * ov.height;
      og.fillStyle = 'rgba(11,18,32,.55)'; og.fillRect(0, 0, ov.width, ov.height); og.save(); og.globalCompositeOperation = 'destination-out'; og.beginPath(); if (asp === 'circle') og.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); else og.rect(x, y, w, h); og.fill(); og.restore();
      og.strokeStyle = '#fff'; og.lineWidth = 2; og.strokeRect(x, y, w, h); og.fillStyle = '#e5007d'; for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) og.fillRect(cx - 7, cy - 7, 14, 14); nums();
    } else for (const r of regs.concat(cur ? [cur] : [])) { og.fillStyle = 'rgba(229,0,125,.28)'; og.strokeStyle = '#e5007d'; og.lineWidth = 2; og.fillRect(r.x * ov.width, r.y * ov.height, r.w * ov.width, r.h * ov.height); og.strokeRect(r.x * ov.width, r.y * ov.height, r.w * ov.width, r.h * ov.height); }
  }
  const pt = e => { const b = ov.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)) }; };
  ov.style.touchAction = 'none';
  ov.addEventListener('pointerdown', e => {
    ov.setPointerCapture(e.pointerId); const p = pt(e);
    if (TOOL === 'crop') {
      const near = (a, b) => Math.abs(a - b) < 16 / ov.getBoundingClientRect().width;
      const cx = [['l', box.x], ['r', box.x + box.w]], cy = [['t', box.y], ['b', box.y + box.h]];
      let hx = cx.find(c => near(p.x, c[1])), hy = cy.find(c => near(p.y, c[1]));
      if (hx && hy) drag = { t: 'size', hx: hx[0], hy: hy[0] }; else if (p.x > box.x && p.x < box.x + box.w && p.y > box.y && p.y < box.y + box.h) drag = { t: 'move', dx: p.x - box.x, dy: p.y - box.y }; else drag = null;
    } else {
      const hit = regs.findIndex(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
      if (hit >= 0) { regs.splice(hit, 1); drag = null; draw(); } else { drag = { t: 'new', x: p.x, y: p.y }; cur = { x: p.x, y: p.y, w: 0, h: 0, m: val('bMode', 'blur') }; }
    }
  });
  ov.addEventListener('pointermove', e => {
    if (!drag) return; const p = pt(e);
    if (drag.t === 'move') { box.x = Math.min(1 - box.w, Math.max(0, p.x - drag.dx)); box.y = Math.min(1 - box.h, Math.max(0, p.y - drag.dy)); }
    else if (drag.t === 'size') {
      let x0 = box.x, x1 = box.x + box.w, y0 = box.y, y1 = box.y + box.h; if (drag.hx === 'l') x0 = Math.min(p.x, x1 - .02); else x1 = Math.max(p.x, x0 + .02); if (drag.hy === 't') y0 = Math.min(p.y, y1 - .02); else y1 = Math.max(p.y, y0 + .02);
      if (arNum) { const w = (x1 - x0) * it.w; let h = w / arNum / it.h; if (drag.hy === 't') y0 = y1 - h; else y1 = y0 + h; if (y0 < 0 || y1 > 1) return; }
      box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    } else if (drag.t === 'new') { cur.x = Math.min(drag.x, p.x); cur.y = Math.min(drag.y, p.y); cur.w = Math.abs(p.x - drag.x); cur.h = Math.abs(p.y - drag.y); }
    draw();
  });
  ov.addEventListener('pointerup', () => { if (drag && drag.t === 'new' && cur && cur.w > .005 && cur.h > .005) regs.push(cur); cur = null; drag = null; draw(); });
  draw();
  modal(TOOL === 'crop' ? 'Set the crop area' : 'Mark areas to hide', wrap, () => { if (TOOL === 'crop') it.rel = { ...box }; else it.regions = regs; clearResults(); render(); });
}
async function openCompare(it) {
  const wrap = document.createElement('div'); wrap.className = 'pxcmp'; const ru = URL.createObjectURL(it.res.blob);
  wrap.innerHTML = `<div class="cmpbox"><img class="a" src="${it.url}" alt="Before"><div class="clip"><img class="b" src="${ru}" alt="After"></div><i class="hdl"></i><span class="tg l">Before ${kb(it.size)}</span><span class="tg r">After ${kb(it.res.blob.size)}</span></div><input type="range" min="0" max="100" value="50" aria-label="Slide to compare">`;
  const clip = wrap.querySelector('.clip'), hdl = wrap.querySelector('.hdl'), r = wrap.querySelector('input'); const set = () => { clip.style.clipPath = `inset(0 0 0 ${r.value}%)`; hdl.style.left = r.value + '%'; }; r.addEventListener('input', set); set();
  const cl = modal('Before and after', wrap, null); new MutationObserver((_, o) => { if (!document.body.contains(wrap)) { URL.revokeObjectURL(ru); o.disconnect(); } }).observe(document.body, { childList: true });
}

/* ---------- running ---------- */
function clearResults() { items.forEach(i => { i.res = null; }); clearDone(); if (items.length) render(); }
async function runAll() {
  const used = new Set(), outs = [];
  for (let n = 0; n < items.length; n++) {
    const it = items[n]; prog.style.width = Math.round(6 + 88 * n / items.length) + '%';
    try { it.res = await processOne(it, p => { prog.style.width = Math.round(6 + 88 * (n + p) / items.length) + '%'; }); it.res.name = outName(it, it.res, used); outs.push(it); }
    catch (e) { it.res = { error: e && e.message && e.message.length < 120 ? e.message : 'Could not process this image.', blob: null }; }
    await sleep();
  }
  return outs;
}
async function makeGif() {
  await loadJs('giflib.bundle.js');
  const dl = Math.max(20, num('gDelay', 500)), W0 = Math.max(16, Math.round(num('gW', 480))), g = GIFLIB.GIFEncoder(); let H = 0;
  for (let n = 0; n < items.length; n++) {
    const it = items[n], s = await readSource(it), W = W0; if (!H) H = Math.max(1, Math.round(W * s.h / s.w));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); const k = Math.min(W / s.w, H / s.h); x.imageSmoothingQuality = 'high'; x.drawImage(s.src, (W - s.w * k) / 2, (H - s.h * k) / 2, s.w * k, s.h * k); freeSrc(s);
    const d = x.getImageData(0, 0, W, H).data, pal = GIFLIB.quantize(d, 256), idx = GIFLIB.applyPalette(d, pal);
    g.writeFrame(idx, W, H, { palette: pal, delay: dl, repeat: val('gLoop', true) ? 0 : -1 }); c.width = c.height = 0;
    prog.style.width = Math.round(6 + 88 * (n + 1) / items.length) + '%'; await sleep();
  }
  g.finish(); return { blob: new Blob([g.bytes()], { type: 'image/gif' }), w: W0, h: H };
}
go.addEventListener('click', async () => {
  if (busy || !items.length) return;
  busy = true; go.disabled = true; ws.classList.add('working'); prog.style.width = '4%';
  try {
    if (TOOL === 'gif') {
      const r = await makeGif(), name = cleanName($('#outName').value, 'Dilia-animation', 'gif');
      finish([{ name, blob: r.blob }], name, `${plural(items.length, 'frame')}, ${r.w} × ${r.h}, ${kb(r.blob.size)}`);
    } else {
      const ok = await runAll(); render(); const failed = items.length - ok.length;
      if (!ok.length) { toast('None of the images could be processed.', true); }
      else {
        let name, blob;
        if (ok.length === 1) { name = ok[0].res.name; blob = ok[0].res.blob; }
        else {
          const files = []; for (const it of ok) files.push({ name: it.res.name, data: new Uint8Array(await it.res.blob.arrayBuffer()) });
          blob = Kit.zip(files); name = cleanName($('#outName').value, 'Dilia-images', 'zip');
        }
        finish([{ name, blob }], name, `${plural(ok.length, 'image')}, ${kb(blob.size)}${failed ? `, ${failed} failed` : ''}`);
      }
    }
  } catch (e) { toast('It did not finish: ' + (e.message && e.message.length < 140 ? e.message : 'unknown error') + '.', true); }
  busy = false; ws.classList.remove('working'); setTimeout(() => { prog.style.width = '0'; }, 600); summary();
});
function finish(files, name, info) {
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(files[0].blob); prog.style.width = '100%';
  save(lastUrl, name); $('#doneName').textContent = name; $('#doneInfo').textContent = info; $('#again').href = lastUrl; $('#again').download = name; $('#done').hidden = false;
}
function clearDone() { const d = $('#done'); if (d) d.hidden = true; }
$('#reset').addEventListener('click', () => { items.forEach(i => URL.revokeObjectURL(i.url)); items.length = 0; seq = 0; nameTouched = false; $('#outName').value = ''; clearDone(); render(); scrollTo({ top: 0, behavior: 'smooth' }); });
pick.addEventListener('change', () => { add(pick.files); pick.value = ''; });
addEventListener('paste', e => { const fs = [...(e.clipboardData ? e.clipboardData.files : [])]; if (fs.length) { e.preventDefault(); add(fs.map((f, i) => f.name && f.name !== 'image.png' ? f : new File([f], `Pasted image ${Date.now() % 100000}-${i + 1}.${(f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`, { type: f.type }))); } });
Kit.dropAnywhere(add);

/* unit helpers for the options: keep ratio when typing a size */
if (TOOL === 'resize') {
  const sync = () => { const m = val('rzMode', 'px'); document.querySelectorAll('[data-op=px]').forEach(e => e.hidden = m !== 'px'); document.querySelectorAll('[data-op=pct]').forEach(e => e.hidden = m !== 'pct'); };
  $('#rzMode').addEventListener('input', sync); sync();
  $('#rzPreset') && $('#rzPreset').addEventListener('input', e => { const v = e.target.value; if (!v) return; const [w, h] = v.split('x'); $('#rzMode').value = 'px'; $('#rzW').value = w; $('#rzH').value = h; $('#rzKeep').checked = true; sync(); clearResults(); });
}
if (TOOL === 'watermark') { const sync = () => { const k = val('wmKind', 'text'); document.querySelectorAll('[data-op=text]').forEach(e => e.hidden = k !== 'text'); document.querySelectorAll('[data-op=image]').forEach(e => e.hidden = k !== 'image'); }; document.querySelectorAll('input[name=wmKind]').forEach(r => r.addEventListener('input', sync)); sync(); }
document.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => { const o = $('#' + r.id + 'o'); if (o) o.textContent = r.value; }));
render();
window.__dilia = { items, add };
}
