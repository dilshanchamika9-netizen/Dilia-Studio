// Dilia home (concept C "Editorial"): search with rotating task hints, toolkit counts, most used tools, Today on Dilia,
// holiday country picker, and "drop a file to see what fits". Everything is worked out on this device. Text via textContent only.
{
  const T = DiliaSearch.all(), byId = Object.fromEntries(T.map(t => [t.id, t]));
  const $ = id => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const link = (href, cls, txt) => { const a = el('a', cls, txt); a.href = href; return a; };
  const ready = T.filter(t => t.ready && t.group !== 'Play');           // tools only
  const games = T.filter(t => t.ready && t.group === 'Play');
  const GUIDES = [["merge-pdf-files", "How to Merge PDF Files Into One"], ["compress-pdf-for-email", "How to Compress a PDF for Email"], ["edit-pdf-text-free", "How to Edit Text in a PDF for Free"], ["sign-pdf-without-printing", "How to Sign a PDF Without Printing It"], ["split-pdf-into-pages", "How to Split a PDF Into Separate Pages or Files"], ["protect-pdf-with-password", "How to Protect a PDF With a Password"], ["unlock-pdf-you-know-the-password", "How to Remove a Password From a PDF You Own"], ["jpg-to-pdf", "How to Convert JPG and PNG Photos to a PDF"], ["extract-tables-from-pdf-to-excel", "How to Get Tables Out of a PDF and Into Excel"], ["safe-online-pdf-tools", "Are Online PDF Tools Safe? What Happens to Your File"], ["rotate-pdf-pages", "How to Rotate PDF Pages and Save Them That Way"], ["delete-pages-from-pdf", "How to Delete Pages From a PDF"], ["fill-pdf-form-online", "How to Fill In a PDF Form Online"], ["make-scanned-pdf-searchable", "How to Make a Scanned PDF Searchable (OCR)"], ["add-watermark-to-pdf", "How to Add a Watermark to a PDF"], ["redact-pdf-properly", "How to Redact a PDF So the Hidden Text Really Is Gone"], ["compress-image-without-losing-quality", "How to Compress an Image Without Losing Quality"], ["resize-image-for-instagram-and-web", "How to Resize an Image for Instagram, YouTube and the Web"], ["crop-image-to-a-shape-or-ratio", "How to Crop an Image to a Ratio or Circle"], ["rotate-or-flip-an-image", "How to Rotate or Flip an Image"], ["convert-image-to-png-jpg-webp", "How to Convert an Image to PNG, JPG, WebP, AVIF and More"], ["heic-to-jpg-free", "How to Open iPhone HEIC Photos as JPG"], ["add-watermark-to-photos", "How to Add a Watermark to Photos"], ["make-a-meme-online", "How to Make a Meme From Your Own Picture"], ["blur-faces-and-text-in-an-image", "How to Blur Faces, Plates and Text in a Picture"], ["make-animated-gif-from-pictures", "How to Make an Animated GIF From Pictures"], ["remove-metadata-from-photos", "How to Remove Location and Camera Data From Photos"], ["create-a-qr-code-free", "How to Create a QR Code"], ["wifi-qr-code-for-guests", "How to Make a Wi-Fi QR Code So Guests Can Join Instantly"], ["contact-card-qr-code-vcard", "How to Make a Contact Card QR Code for Your Business Card"], ["make-many-qr-codes-at-once", "How to Make Many QR Codes at Once"], ["read-a-qr-code-from-an-image", "How to Read a QR Code From an Image or With Your Camera"], ["count-words-and-characters-online", "How to Count Words and Characters in Any Text"], ["change-text-case-online", "How to Change Text to Uppercase, Lowercase or Title Case"], ["clean-up-messy-text", "How to Remove Extra Spaces, Line Breaks and Odd Characters"], ["sort-and-dedupe-a-list-online", "How to Sort a List and Remove Duplicate Lines"], ["find-and-replace-in-text-online", "How to Find and Replace Words in a Text"], ["compare-two-texts-online", "How to Compare Two Texts and See What Changed"], ["generate-lorem-ipsum", "How to Generate Lorem Ipsum Placeholder Text"], ["extract-emails-and-links-from-text", "How to Extract Emails, Links and Numbers from a Text"]];
  const plus = n => Math.floor(n / 10) * 10 + '+';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } } };

  /* ---------- search ---------- */
  DiliaSearch.mount($('q'), $('plist'), 4);
  // The hint in the box cycles through real tasks every 3 s and stops for good once the box is used (D2, DR-02 §5.1).
  const HINTS = ['merge PDF', 'compress a photo to 100 KB', 'public holidays 2027', 'sign a PDF', 'QR code for Wi-Fi', 'word counter', 'daily sudoku'];
  if (!reduce) {
    let hi = 0; const q = $('q');
    const tick = setInterval(() => { hi = (hi + 1) % HINTS.length; q.placeholder = 'Try \u201c' + HINTS[hi] + '\u201d'; }, 3000);
    const stop = () => { clearInterval(tick); q.placeholder = 'Search tools, planners and games'; };
    q.addEventListener('focus', stop, { once: true });
  }

  /* ---------- toolkit counts and most used ---------- */
  document.body.dataset.tools = ready.length;
  const n = g => ready.filter(t => t.group === g).length;
  const nPdf = ready.length - n('Image') - n('QR') - n('Text') - n('Calc');
  document.querySelectorAll('[data-count]').forEach(e => { const v = e.dataset.count === 'pdf' ? nPdf : n(e.dataset.count); e.textContent = v + ' tools'; });
  $('n-all').textContent = plus(ready.length);
  [['merge', 'Merge PDF'], ['compress', 'Compress PDF'], ['pdf2img', 'PDF to JPG'], ['img2pdf', 'JPG to PDF'], ['pxcompress', 'Compress image'], ['pxresize', 'Resize image'], ['sign', 'Sign PDF'], ['qrmain', 'QR code generator']]
    .filter(([id]) => byId[id] && byId[id].ready).forEach(([id, label]) => {
      const t = byId[id], a = link(diliaUrl(t), '', ''); a.innerHTML = diliaIcon(t.icon, 'ico'); a.append(label); $('mu').append(a);
    });

  /* ---------- Today on Dilia ---------- */
  const now = new Date();
  const loc = navigator.language || 'en';
  const bits = [now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })];
  // A second calendar only when the visitor's locale defaults to one (e.g. ar-SA = Hijri, fa = Persian, th = Buddhist).
  try { const cal = new Intl.DateTimeFormat(loc).resolvedOptions().calendar; if (cal && cal !== 'gregory' && cal !== 'iso8601') bits.push(new Intl.DateTimeFormat('en-GB-u-ca-' + cal, { day: 'numeric', month: 'long', year: 'numeric' }).format(now)); } catch (e) { /* only Gregorian */ }
  $('t-date').textContent = bits.join(' · ');
  const key = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const pickDay = (list, salt) => list[((key + salt) * 2654435761 >>> 0) % list.length];
  // Tools: one live tool a day, same for everyone.
  const tod = pickDay(ready.slice().sort((a, b) => (a.id < b.id ? -1 : 1)), 0);
  $('t-tool').href = diliaUrl(tod); $('t-tn').textContent = tod.name; $('t-td').textContent = tod.desc;
  // Play: today's path number and size.
  if (window.DiliaPlayGen) {
    const G = DiliaPlayGen, k = G.dayKey(now), sz = [7, 5, 5, 6, 6, 6, 7][G.weekday(k)];
    $('t-pz').textContent = 'Daily path #' + G.dayNo(k);
    $('t-pzd').textContent = sz + ' × ' + sz + ' today · same board for everyone';
  }
  // Read: one guide a day.
  const gd = pickDay(GUIDES, 7); $('t-read').href = 'blog/' + gd[0] + '/'; $('t-rt').textContent = gd[1];
  // Life: next public holiday where this device is. Country from the time zone, then the browser language.
  const TZC = { 'Asia/Dubai': 'AE', 'Asia/Muscat': 'OM', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH', 'Asia/Kuwait': 'KW', 'Asia/Colombo': 'LK', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Kathmandu': 'NP', 'Asia/Manila': 'PH', 'Asia/Jakarta': 'ID', 'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Bangkok': 'TH', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Cairo': 'EG', 'Africa/Cairo': 'EG', 'Asia/Amman': 'JO', 'Asia/Beirut': 'LB', 'Asia/Baghdad': 'IQ', 'Asia/Tehran': 'IR', 'Europe/Istanbul': 'TR', 'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Lisbon': 'PT', 'Europe/Moscow': 'RU', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE', 'Africa/Johannesburg': 'ZA', 'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Pacific/Auckland': 'NZ' };
  const CCKEY = 'dilia-life-country';   // same choice as the Life hub (plain string)
  const ccGet = () => { try { return localStorage.getItem(CCKEY) || ''; } catch (e) { return ''; } };
  const ccSet = v => { try { localStorage.setItem(CCKEY, v); } catch (e) { /* private mode */ } };
  const guessCC = () => {
    let cc = ''; try { cc = TZC[Intl.DateTimeFormat().resolvedOptions().timeZone] || ''; } catch (e) { /* ignore */ }
    if (!cc) cc = (navigator.languages || [navigator.language]).map(l => (l.split('-')[1] || '').toUpperCase()).find(x => /^[A-Z]{2}$/.test(x)) || '';
    return cc;
  };
  const regionName = cc => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc); } catch (e) { return cc; } };
  async function showHoliday(cc) {
    $('t-lt').textContent = 'Public holidays'; $('t-sub').textContent = 'Find the next day off in 249 countries'; $('t-life').href = 'public-holidays/';
    if (!cc) return;
    try {
      const res = await fetch('assets/holidays/' + cc + '.json'); if (!res.ok) return;
      const data = await res.json(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let next = null;
      for (const y of [now.getFullYear(), now.getFullYear() + 1]) for (const [md, name] of (data[y] || [])) {
        const [m, d] = md.split('-').map(Number), dt = new Date(y, m - 1, d);
        if (dt >= today && (!next || dt < next.dt)) next = { dt, name };
      }
      if (!next || $('t-cc').value !== cc) return;
      const days = Math.round((next.dt - today) / 864e5);
      $('t-lt').textContent = next.name + (days === 0 ? ' is today' : days === 1 ? ' is tomorrow' : ' in ' + days + ' days');
      $('t-sub').textContent = next.dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + regionName(cc);
    } catch (e) { /* leave the general card */ }
  }
  (async () => {
    const sel = $('t-cc');
    let codes = []; try { const r = await fetch('assets/holidays/index.json'); if (r.ok) codes = (await r.json()).countries || []; } catch (e) { /* list stays empty */ }
    codes.map(c => [c, regionName(c)]).sort((a, b) => a[1].localeCompare(b[1])).forEach(([c, n]) => { const o = el('option', '', n); o.value = c; sel.append(o); });
    let cc = ccGet() || guessCC(); if (!codes.includes(cc)) cc = '';
    sel.value = cc; showHoliday(cc);
    sel.addEventListener('change', () => { ccSet(sel.value); showHoliday(sel.value); });
  })();

  /* ---------- drop a file anywhere: show the tools that fit, then open one with the file ready ---------- */
  const veil = $('veil'), fit = $('fit');
  const PDF_TOOLS = ['compress', 'merge', 'split', 'edit', 'sign', 'protect', 'unlock', 'ocr', 'pdf2img', 'redact', 'watermark', 'number', 'rotate', 'reorder', 'delete', 'extract', 'crop', 'forms', 'flatten', 'repair'];
  const IMG_TOOLS = ['img2pdf', 'scan'];
  const kind = f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf' ? 'pdf' : /\.(jpe?g|png|webp|gif|bmp|avif|tiff?)$/i.test(f.name) || /^image\//.test(f.type) ? 'img' : '';
  const size = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  let depth = 0;
  const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; veil.classList.add('on'); } });
  addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
  addEventListener('dragleave', e => { if (hasFiles(e) && --depth <= 0) { depth = 0; veil.classList.remove('on'); } });
  addEventListener('drop', e => {
    if (!hasFiles(e)) return; e.preventDefault(); depth = 0; veil.classList.remove('on');
    const files = [...e.dataTransfer.files]; if (files.length) showFit(files);
  });
  function showFit(files) {
    const k = kind(files[0]), same = files.filter(f => kind(f) === k);
    const g = $('fit-g'); g.textContent = '';
    $('fit-k').textContent = same.length > 1 ? same.length + ' files' : (k ? (k === 'pdf' ? 'PDF' : 'Picture') : 'File');
    $('fit-t').textContent = same.length > 1 ? same.map(f => f.name).slice(0, 2).join(', ') + (same.length > 2 ? ' and ' + (same.length - 2) + ' more' : '') : files[0].name;
    if (!k) {
      $('fit-s').textContent = 'Dilia cannot open that kind of file yet. Today it works with PDFs and pictures (JPG, PNG, TIFF and more).';
    } else {
      $('fit-s').textContent = (same.length > 1 ? same.length + ' files, ' : size(same[0].size) + ', ') + 'read in this tab only. Pick what to do. Your file is passed to the next page on this device and is never uploaded.';
      (k === 'pdf' ? PDF_TOOLS : IMG_TOOLS).map(id => byId[id]).filter(t => t && t.ready && (same.length === 1 || /^(merge|img2pdf|scan|mix)$/.test(t.id))).forEach(t => {
        const b = el('button'); b.type = 'button'; b.append(el('b', '', t.name), el('small', '', t.desc));
        b.addEventListener('click', async () => { b.disabled = true; try { await DiliaHandoff.put(same); } catch (err) { /* private mode: tool opens empty */ } location.href = diliaUrl(t); });
        g.append(b);
      });
    }
    fit.hidden = false; $('fit-x').focus();
  }
  $('fit-x').addEventListener('click', () => { fit.hidden = true; });
  fit.addEventListener('mousedown', e => { if (e.target === fit) fit.hidden = true; });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !fit.hidden) fit.hidden = true; });
}
