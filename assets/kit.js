/* Shared helpers for the tool pages (everything except Merge, which keeps its own copy). */
window.Kit = (() => {
  const $ = s => document.querySelector(s);
  const kb = b => b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const COLORS = ['#e5007d', '#009fe3', '#f0a800', '#7a5cff', '#ff5a36', '#00a88f', '#0b1220'];

  function toast(msg, bad) {
    const t = document.createElement('div');
    t.className = 'toast' + (bad ? ' bad' : '');
    t.textContent = msg;
    $('#toasts').append(t);
    setTimeout(() => t.classList.add('out'), bad ? 6500 : 3500);
    setTimeout(() => t.remove(), bad ? 7000 : 4000);
  }

  /* ---- Dilia PDF app bridge. A tool page opened inside the app (same-origin iframe, ?app=1) gets its file from the app
     and hands PDF results back instead of downloading them. Messages are accepted only from the parent on this origin. ---- */
  const APP = window.parent !== window && new URLSearchParams(location.search).get('app') === '1';
  if (APP) {
    document.documentElement.classList.add('inapp');
    addEventListener('message', e => {
      if (e.origin !== location.origin || e.source !== window.parent || !e.data || e.data.type !== 'dilia-file') return;
      const pick = document.getElementById('pick'); if (!pick || !(e.data.bytes instanceof ArrayBuffer)) return;
      const f = new File([e.data.bytes], String(e.data.name || 'document.pdf'), { type: 'application/pdf', lastModified: e.data.mod || Date.now() });
      const dt = new DataTransfer(); dt.items.add(f); pick.files = dt.files; pick.dispatchEvent(new Event('change', { bubbles: true }));
      const say = { replace: 'Apply to document', 'new': 'Open as new document' }[e.data.act];   // the result goes back to the app, not to Downloads
      const lab = document.querySelector('#go .go-l') || document.getElementById('go');
      if (say && lab) { const fix = () => { if (/download/i.test(lab.textContent)) lab.textContent = say; }; fix(); new MutationObserver(fix).observe(lab, { childList: true, characterData: true, subtree: true }); }
    });
    addEventListener('load', () => window.parent.postMessage({ type: 'dilia-ready' }, location.origin));
  }
  function download(url, name) {
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
  }
  function save(url, name) {
    if (APP && /\.pdf$/i.test(name)) {
      fetch(url).then(r => r.arrayBuffer()).then(b => window.parent.postMessage({ type: 'dilia-result', name, bytes: b }, location.origin, [b])).catch(() => download(url, name));
      return;
    }
    download(url, name);
  }
  const cleanName = (v, fallback, ext) =>
    ((v || '').trim().replace(new RegExp('\\.' + ext + '$', 'i'), '').replace(/[\\/:*?"<>|]+/g, '-') || fallback) + '.' + ext;

  /* ---- page ranges: "1-3, 7, 10-" ---- */
  function parseRanges(str, max) {
    const out = [];
    const tokens = str.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    if (!tokens.length) return { entries: [] };
    for (const t of tokens) {
      let m = /^(\d+)$/.exec(t), a, b;
      if (m) { a = b = +m[1]; }
      else if ((m = /^(\d+)\s*[-–]\s*(\d*)$/.exec(t))) { a = +m[1]; b = m[2] === '' ? max : +m[2]; }
      else return { err: `"${t}" is not a page or range. Use numbers like 1-3, 7, 10-.` };
      if (a < 1 || a > max) return { err: `Page ${a} does not exist. This PDF has ${plural(max, 'page')}.` };
      if (b > max) return { err: `Page ${b} does not exist. This PDF has ${plural(max, 'page')}.` };
      if (b < a) return { err: `Range ${a}-${b} runs backwards. Put the smaller number first.` };
      out.push([a, b]);
    }
    return { entries: out };
  }
  function compress(idxs) {            // [0,1,2,6] -> "1-3, 7"
    const s = [...idxs].sort((a, b) => a - b), parts = [];
    for (let i = 0; i < s.length;) {
      let j = i; while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
      parts.push(j > i ? `${s[i] + 1}-${s[j] + 1}` : `${s[i] + 1}`); i = j + 1;
    }
    return parts.join(', ');
  }

  /* ---- ZIP (stored, no compression; PDFs and images are already compressed) ---- */
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = crcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {                // [{name, data:Uint8Array}] -> Blob
    const enc = new TextEncoder(), d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const parts = [], central = []; let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, name, f.data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(ch.buffer, name);
      offset += 30 + name.length + size;
    }
    const csize = central.reduce((a, b) => a + (b.byteLength ?? b.length), 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
  }

  /* ---- drop files anywhere on the page ---- */
  function dropAnywhere(cb) {
    let depth = 0;
    const has = e => [...(e.dataTransfer?.types || [])].includes('Files');
    addEventListener('dragenter', e => { if (!has(e)) return; e.preventDefault(); depth++; document.body.classList.add('dropping'); });
    addEventListener('dragover', e => { if (has(e)) e.preventDefault(); });
    addEventListener('dragleave', e => { if (!has(e)) return; depth = Math.max(0, depth - 1); if (!depth) document.body.classList.remove('dropping'); });
    addEventListener('drop', e => {
      if (!has(e)) return; e.preventDefault(); depth = 0; document.body.classList.remove('dropping');
      const dt = e.dataTransfer, ents = [...(dt.items || [])].map(i => (i.kind === 'file' && i.webkitGetAsEntry) ? i.webkitGetAsEntry() : null);
      if (!ents.some(x => x && x.isDirectory)) { cb(dt.files); return; }
      const out = [];                                    // folders: walk them and pass every file inside
      const walk = async en => {
        if (en.isFile) { out.push(await new Promise(r => en.file(r, () => r(null)))); return; }
        const rd = en.createReader(); let batch;
        do { batch = await new Promise(r => rd.readEntries(r, () => r([]))); for (const c of batch) await walk(c); } while (batch.length);
      };
      Promise.all(ents.filter(Boolean).map(walk)).then(() => cb(out.filter(Boolean)));
    });
  }

  /* ---- lazy PDF page thumbnails ---- */
  async function renderThumb(js, idx) {
    const page = await js.getPage(idx + 1);
    const v1 = page.getViewport({ scale: 1 });
    const scale = Math.min(2.4, (220 * Math.min(2, devicePixelRatio || 1)) / v1.width);
    const vp = page.getViewport({ scale });
    const c = document.createElement('canvas');
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return new Promise(r => c.toBlob(r, 'image/jpeg', .82));
  }
  function thumbs(render) {            // render(idx) -> Promise<Blob>
    const map = new Map(), queue = []; let busy = false, gen = 0;
    async function pump() {
      if (busy) return; busy = true;
      while (queue.length) {
        const { k, idx, g } = queue.shift();
        if (g !== gen || map.has(k)) continue;
        try {
          const blob = await render(idx);
          if (g !== gen) continue;
          const url = URL.createObjectURL(blob); map.set(k, url);
          document.querySelectorAll(`img[data-k="${k}"]`).forEach(i => { i.src = url; i.closest('.pv').classList.add('ok'); });
        } catch (e) { /* leave placeholder */ }
      }
      busy = false;
    }
    const seen = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const k = e.target.querySelector('img').dataset.k;
      if (!map.has(k) && !queue.some(q => q.k === k)) { queue.push({ k, idx: +k, g: gen }); pump(); }
      seen.unobserve(e.target);
    }), { rootMargin: '300px' });
    return {
      img(idx, rot) {
        const url = map.get(String(idx));
        return `<div class="pv${url ? ' ok' : ''}"><img data-k="${idx}" alt="" ${url ? `src="${url}"` : ''} style="--r:${rot || 0}deg"></div>`;
      },
      watch(root) { root.querySelectorAll('img[data-k]:not([src])').forEach(i => seen.observe(i.parentElement)); },
      clear() { gen++; queue.length = 0; map.forEach(u => URL.revokeObjectURL(u)); map.clear(); }
    };
  }

  /* ---- read a PDF file into {bytes, lib, js, count} or a message ---- */
  async function openPdf(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let lib;
    try { lib = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false }); }
    catch (e) {
      return { err: /encrypt/i.test(e.message) ? `${file.name} is password protected. Remove the password first, then add it again.` : `${file.name} could not be read. It may be damaged.` };
    }
    let js = null;
    try { js = await pdfjsLib.getDocument({ isEvalSupported: false, data: bytes.slice() }).promise; } catch (e) { /* previews unavailable */ }
    return { name: file.name, size: file.size, bytes, lib, js, count: lib.getPageCount() };
  }
  const isPdf = f => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);

  return { APP, $, kb, plural, esc, COLORS, toast, save, cleanName, parseRanges, compress, zip, dropAnywhere, renderThumb, thumbs, openPdf, isPdf };
})();
