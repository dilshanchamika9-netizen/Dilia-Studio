// Dilia home: search (rotating task hints), Today on Dilia, journeys as constellations, world cards,
// light/dark switch, and "drop a file to see what fits". Everything is worked out on this device. Text via textContent only.
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
  const tries = $('tries');
  [['compress PDF', 'compress-pdf/', '#e5007d'], ['time in London', 'time-zone-converter/', '#009fe3'], ['sudoku', 'daily-sudoku/', '#7a5cff'], ['sign a PDF guide', 'blog/sign-pdf-without-printing/', '#f0a800']]
    .forEach(([n, h, c]) => { const a = link(h, '', n), i = el('i'); i.style.background = c; a.prepend(i); tries.append(a); });

  // The hint in the box cycles through real tasks every 3 s and stops for good once the box is used (D2, DR-02 §5.1).
  const HINTS = ['merge PDF', 'compress a photo to 100 KB', 'public holidays 2027', 'sign a PDF', 'QR code for Wi-Fi', 'word counter', 'daily sudoku'];
  if (!reduce) {
    let hi = 0; const q = $('q');
    const tick = setInterval(() => { hi = (hi + 1) % HINTS.length; q.placeholder = 'Try \u201c' + HINTS[hi] + '\u201d'; }, 3000);
    const stop = () => { clearInterval(tick); q.placeholder = 'Search tools, planners and games'; };
    q.addEventListener('focus', stop, { once: true });
  }

  /* ---------- counts ---------- */
  document.body.dataset.tools = ready.length;
  $('w-tk').textContent = plus(ready.length) + ' tasks';
  $('w-pk').textContent = games.length + ' games';
  $('w-rk').textContent = 'News and ' + GUIDES.length + ' guides';
  const n = g => ready.filter(t => t.group === g).length;
  const nPdf = ready.length - n('Image') - n('QR') - n('Text') - n('Calc');
  [['PDF', nPdf], ['Image', n('Image')], ['Text', n('Text')], ['QR codes', n('QR')], ['Calculators', n('Calc')]].forEach(([k, v]) => { if (v) $('door-tools').append(el('li', '', k + ' · ' + v)); });

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

  const W = { tools: { c: '#e5007d' }, life: { c: '#009fe3' }, play: { c: '#7a5cff' }, read: { c: '#f0a800' } };

  /* ---------- journeys ---------- */
  const CW = { T: ['tools', 'Tools'], L: ['life', 'Life'], P: ['play', 'Play'], R: ['read', 'Guides'] };
  const J = [
    { id: 'cv', n: 'Send your CV', sub: 'Make it, sign it, send it', st: [['T', 'Edit your CV PDF', 'edit-pdf/', 10, 62], ['T', 'Sign the cover letter', 'sign-pdf/', 28, 30], ['T', 'Join CV and letter', 'merge-pdf/', 48, 60], ['T', 'Shrink for email', 'compress-pdf/', 68, 28], ['L', 'Count days to deadline', 'date-difference-calculator/', 88, 56]] },
    { id: 'trip', n: 'Trip abroad', sub: 'Plan, sort the papers, go', st: [['L', 'Holidays where you go', 'public-holidays/', 10, 36], ['L', 'Time zone for calls', 'time-zone-converter/', 28, 66], ['T', 'Scan passport to PDF', 'scan-to-pdf/', 48, 30], ['T', 'Photo to a size limit', 'compress-image-to-size/', 68, 62], ['P', 'Puzzles for the flight', 'play/', 88, 32]] },
    { id: 'inv', n: 'Small business invoice', sub: 'Price it, send it, get paid', st: [['T', 'Add VAT to the price', 'vat-calculator/', 10, 50], ['T', 'Receipts to one PDF', 'jpg-to-pdf/', 28, 24], ['T', 'Payment QR code', 'qr-code-generator/', 48, 60], ['T', 'Sign the invoice', 'sign-pdf/', 68, 28], ['R', 'Lock it with a password', 'blog/protect-pdf-with-password/', 88, 58]] },
    { id: 'break', n: 'Coffee break', sub: 'Ten minutes, three games', st: [['P', 'Reaction warm-up', 'reaction-time/', 14, 56], ['P', "Today's path", 'daily-path/', 38, 28], ['P', 'Daily sudoku', 'daily-sudoku/', 62, 62], ['R', 'One quick guide', 'blog/', 86, 32]] }
  ];
  const JKEY = 'dilia-journeys-v1';
  let ji = Math.min(J.length - 1, Math.max(0, store.get('dilia-journey-tab', 0) | 0));
  const tabs = $('jtabs');
  J.forEach((j, i) => { const b = el('button', '', j.n); b.type = 'button'; b.setAttribute('role', 'tab'); b.addEventListener('click', () => { ji = i; store.set('dilia-journey-tab', i); drawJ(); }); tabs.append(b); });
  const SVG = 'http://www.w3.org/2000/svg', lines = $('jlines');
  const dust = []; for (let i = 0; i < 40; i++) { const c = document.createElementNS(SVG, 'circle'); c.setAttribute('class', 'dust'); const r1 = ((i * 2654435761) >>> 0) / 4294967296, r2 = ((i * 2246822519 + 3266489917) >>> 0) / 4294967296; c.setAttribute('cx', Math.round(r1 * 1000)); c.setAttribute('cy', Math.round(r2 * 480)); c.setAttribute('r', 1 + (i % 3) * 0.6); c.style.animationDelay = (i % 7) * 0.5 + 's'; dust.push(c); }
  function drawJ() {
    const j = J[ji], done = new Set(store.get(JKEY, {})[j.id] || []);
    [...tabs.children].forEach((b, i) => b.setAttribute('aria-selected', i === ji ? 'true' : 'false'));
    $('jname').textContent = j.n; $('jsub').textContent = j.sub;
    const cnt = j.st.filter((s, i) => done.has(i)).length, nextI = j.st.findIndex((s, i) => !done.has(i));
    $('jbar').style.width = Math.round(cnt / j.st.length * 100) + '%';
    $('jdone').textContent = cnt === 0 ? 'Tap step 1 to start' : cnt === j.st.length ? 'Constellation complete ✦' : cnt + ' of ' + j.st.length + ' steps done';
    $('jreset').hidden = cnt === 0;
    lines.replaceChildren(...dust);
    j.st.slice(1).forEach((b, i) => {
      const a = j.st[i], lit = done.has(i) && done.has(i + 1), l = document.createElementNS(SVG, 'line');
      l.setAttribute('x1', a[3] * 10); l.setAttribute('y1', a[4] * 4.8); l.setAttribute('x2', b[3] * 10); l.setAttribute('y2', b[4] * 4.8);
      if (lit) { l.setAttribute('stroke', W[CW[b[0]][0]].c); l.setAttribute('stroke-width', 3); l.setAttribute('stroke-opacity', .9); } else l.setAttribute('class', 'todo');
      lines.append(l);
    });
    const ol = $('jstars'); ol.replaceChildren();
    j.st.forEach(([w, n, href, x, y], i) => {
      const li = el('li', 'jstar w-' + CW[w][0] + (done.has(i) ? ' done' : '') + (i === nextI ? ' next' : ''));
      li.style.setProperty('--x', x + '%'); li.style.setProperty('--y', y + '%');
      const a = link(href, '', '');
      const lab = el('span', 'lab'); lab.append(el('small', '', 'Step ' + (i + 1) + ' · ' + CW[w][1]), el('b', '', n));
      a.append(el('span', 'dot', done.has(i) ? '✓' : String(i + 1)), lab);
      a.addEventListener('click', () => { const all = store.get(JKEY, {}); all[j.id] = [...new Set([...(all[j.id] || []), i])]; store.set(JKEY, all); });
      li.append(a); ol.append(li);
    });
  }
  $('jreset').addEventListener('click', () => { const all = store.get(JKEY, {}); delete all[J[ji].id]; store.set(JKEY, all); drawJ(); });
  drawJ();
  addEventListener('pageshow', e => { if (e.persisted) drawJ(); });

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
