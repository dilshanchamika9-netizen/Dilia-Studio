/* Dilia QR: generator (many types, design, logo, bulk) and reader. All in this tab; nothing is uploaded. */
{
const { $, kb, plural, esc, toast, save, cleanName } = Kit;
const MODE = document.body.dataset.mode || 'make', PRESET = document.body.dataset.qr || 'url';
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const loadJs = f => new Promise((ok, no) => { const s = document.createElement('script'); s.src = DROOT + 'assets/vendor/qr/' + f; s.onload = ok; s.onerror = no; document.head.append(s); });
const libs = {}; const lib = f => libs[f] || (libs[f] = loadJs(f).catch(e => { delete libs[f]; throw e; }));

/* ---------- content types ---------- */
const F = (id, label, o = {}) => ({ id, label, ...o });
const enc = encodeURIComponent;
const esc4 = s => String(s).replace(/([\\;,:"])/g, '\\$1');                       // Wi-Fi escaping
const escV = s => String(s).replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n'); // vCard / iCal escaping
const dt = v => v ? v.replace(/[-:]/g, '').replace('T', 'T') + (v.length === 16 ? '00' : '') : '';
const TYPES = {
  url: { label: 'Website link', fields: [F('u', 'Link', { ph: 'https://example.com', type: 'url' })], build: v => { const u = v.u.trim(); return !u ? '' : /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u; } },
  text: { label: 'Text', fields: [F('t', 'Text', { area: 1, ph: 'Any text' })], build: v => v.t },
  email: { label: 'Email', fields: [F('to', 'Email address', { ph: 'name@example.com', type: 'email' }), F('sub', 'Subject'), F('body', 'Message', { area: 1 })], build: v => !v.to.trim() ? '' : 'mailto:' + v.to.trim() + ((v.sub || v.body) ? '?' + [v.sub && 'subject=' + enc(v.sub), v.body && 'body=' + enc(v.body)].filter(Boolean).join('&') : '') },
  phone: { label: 'Phone number', fields: [F('p', 'Phone number', { ph: '+971 50 123 4567', type: 'tel' })], build: v => v.p.trim() ? 'tel:' + v.p.replace(/[^\d+]/g, '') : '' },
  sms: { label: 'SMS', fields: [F('p', 'Phone number', { ph: '+971 50 123 4567', type: 'tel' }), F('m', 'Message', { area: 1 })], build: v => v.p.trim() ? 'SMSTO:' + v.p.replace(/[^\d+]/g, '') + ':' + v.m : '' },
  wifi: { label: 'Wi-Fi', fields: [F('s', 'Network name (SSID)'), F('pw', 'Password', { type: 'text' }), F('sec', 'Security', { sel: [['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP'], ['nopass', 'No password']] }), F('h', 'Hidden network', { chk: 1 })], build: v => !v.s.trim() ? '' : `WIFI:T:${v.sec};S:${esc4(v.s)};${v.sec === 'nopass' ? '' : 'P:' + esc4(v.pw) + ';'}${v.h === 'on' ? 'H:true;' : ''};` },
  vcard: { label: 'Contact card', fields: [F('fn', 'First name'), F('ln', 'Last name'), F('org', 'Company'), F('ti', 'Job title'), F('tel', 'Phone', { type: 'tel' }), F('em', 'Email', { type: 'email' }), F('web', 'Website'), F('adr', 'Address'), F('note', 'Note')], build: v => (!v.fn.trim() && !v.ln.trim() && !v.org.trim()) ? '' : ['BEGIN:VCARD', 'VERSION:3.0', `N:${escV(v.ln)};${escV(v.fn)};;;`, `FN:${escV((v.fn + ' ' + v.ln).trim() || v.org)}`, v.org && 'ORG:' + escV(v.org), v.ti && 'TITLE:' + escV(v.ti), v.tel && 'TEL:' + v.tel.trim(), v.em && 'EMAIL:' + v.em.trim(), v.web && 'URL:' + v.web.trim(), v.adr && 'ADR:;;' + escV(v.adr) + ';;;;', v.note && 'NOTE:' + escV(v.note), 'END:VCARD'].filter(Boolean).join('\n') },
  geo: { label: 'Map location', fields: [F('la', 'Latitude', { ph: '25.2048', type: 'number', step: 'any' }), F('lo', 'Longitude', { ph: '55.2708', type: 'number', step: 'any' })], build: v => { const a = parseFloat(v.la), b = parseFloat(v.lo); return isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? `geo:${a},${b}` : ''; } },
  event: { label: 'Calendar event', fields: [F('ti', 'Title'), F('st', 'Starts', { type: 'datetime-local' }), F('en', 'Ends', { type: 'datetime-local' }), F('loc', 'Place'), F('d', 'Details', { area: 1 })], build: v => (!v.ti.trim() || !v.st) ? '' : ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'SUMMARY:' + escV(v.ti), 'DTSTART:' + dt(v.st), 'DTEND:' + dt(v.en || v.st), v.loc && 'LOCATION:' + escV(v.loc), v.d && 'DESCRIPTION:' + escV(v.d), 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\n') },
  whatsapp: { label: 'WhatsApp message', fields: [F('p', 'Phone number with country code', { ph: '+971 50 123 4567', type: 'tel' }), F('m', 'First message', { area: 1 })], build: v => { const n = v.p.replace(/\D/g, ''); return n ? 'https://wa.me/' + n + (v.m ? '?text=' + enc(v.m) : '') : ''; } },
  bitcoin: { label: 'Bitcoin', fields: [F('a', 'Bitcoin address'), F('am', 'Amount in BTC (optional)', { type: 'number', step: 'any' }), F('l', 'Label (optional)')], build: v => v.a.trim() ? 'bitcoin:' + v.a.trim() + ((v.am || v.l) ? '?' + [v.am && 'amount=' + v.am, v.l && 'label=' + enc(v.l)].filter(Boolean).join('&') : '') : '' },
  instagram: { label: 'Instagram profile', fields: [F('u', 'Username', { ph: 'yourname' })], build: v => v.u.trim() ? 'https://www.instagram.com/' + enc(v.u.trim().replace(/^@/, '')) + '/' : '' },
  tiktok: { label: 'TikTok profile', fields: [F('u', 'Username', { ph: 'yourname' })], build: v => v.u.trim() ? 'https://www.tiktok.com/@' + enc(v.u.trim().replace(/^@/, '')) : '' },
  youtube: { label: 'YouTube link', fields: [F('u', 'Video or channel link', { ph: 'https://youtube.com/...', type: 'url' })], build: v => { const u = v.u.trim(); return !u ? '' : /^https?:/i.test(u) ? u : 'https://' + u; } },
  review: { label: 'Google review link', fields: [F('id', 'Google Place ID', { ph: 'ChIJ...' })], build: v => v.id.trim() ? 'https://search.google.com/local/writereview?placeid=' + enc(v.id.trim()) : '' },
  appstore: { label: 'App store link', fields: [F('u', 'App Store or Google Play link', { ph: 'https://apps.apple.com/...', type: 'url' })], build: v => { const u = v.u.trim(); return !u ? '' : /^https?:/i.test(u) ? u : 'https://' + u; } }
};
let curType = TYPES[PRESET] ? PRESET : 'url';
const vals = () => { const o = {}; document.querySelectorAll('#qfields [data-f]').forEach(e => { o[e.dataset.f] = e.type === 'checkbox' ? (e.checked ? 'on' : '') : e.value; }); return o; };
function drawFields() {
  const box = $('#qfields'); if (!box) return; box.textContent = '';
  const keep = {};
  TYPES[curType].fields.forEach(f => {
    const w = el('div', 'qf' + (f.chk ? ' c' : '')); const id = 'qf-' + f.id, lab = el('label', f.chk ? 'check' : 'lbl'); lab.htmlFor = id;
    let inp;
    if (f.sel) { inp = el('select', 'dd'); f.sel.forEach(([v, l]) => { const o = el('option', '', l); o.value = v; inp.append(o); }); }
    else if (f.area) { inp = el('textarea'); inp.rows = 3; }
    else { inp = el('input'); inp.type = f.chk ? 'checkbox' : (f.type || 'text'); if (f.step) inp.step = f.step; }
    inp.id = id; inp.dataset.f = f.id; if (f.ph) inp.placeholder = f.ph; inp.autocomplete = 'off'; inp.spellcheck = false;
    if (f.chk) { lab.append(inp, el('span', '', f.label)); w.append(lab); } else { lab.textContent = f.label; w.append(lab, inp); }
    inp.addEventListener('input', schedule); box.append(w);
  });
}

/* ---------- drawing the code ---------- */
const opt = (id, d) => { const e = $('#' + id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : d; };
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
let logoData = null;                                    // data URL of the chosen logo
const X = n => Math.round(n * 1000) / 1000;
function buildSvg(payload, o = {}) {
  const ecc = opt('qEcc', 'auto'), hasLogo = !!logoData, lvl = hasLogo ? 'H' : ecc === 'auto' ? 'M' : ecc;
  const q = QRGEN(0, lvl); q.addData(payload, 'Byte'); q.make();
  const n = q.getModuleCount(), m = Math.max(0, Math.min(10, +opt('qMargin', 4))), size = n + 2 * m;
  const c1 = opt('qC1', '#000000'), c2 = opt('qGrad', false) ? opt('qC2', '#e5007d') : c1, bg = opt('qBg', '#ffffff'), eyeC = opt('qEyeSame', true) ? null : opt('qEye', '#000000'), transp = opt('qTransp', false);
  const dotS = opt('qDot', 'square'), eyeS = opt('qEyeShape', 'square'), frame = opt('qFrame', 'none'), ftxt = (opt('qFtext', 'SCAN ME') || '').slice(0, 24);
  const gdir = opt('qGdir', 'diag'), x2 = gdir === 'h' || gdir === 'diag' ? 1 : 0, y2 = gdir === 'v' || gdir === 'diag' ? 1 : 0;
  const lg = hasLogo ? Math.min(.3, Math.max(.08, +opt('qLogoSize', 20) / 100)) : 0, lgm = lg * n, lx = (n - lgm) / 2;
  const inEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const inLogo = (r, c) => lg && c >= lx - 1 && c < lx + lgm + 1 && r >= lx - 1 && r < lx + lgm + 1;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!q.isDark(r, c) || inEye(r, c) || inLogo(r, c)) continue;
    const x = c + m, y = r + m;
    if (dotS === 'dot') { d += `M${X(x + .5)} ${X(y + .5 - .46)}a.46 .46 0 1 0 .001 0z`; }
    else if (dotS === 'round') { const k = .2; d += `M${X(x + k)} ${y}h${X(1 - 2 * k)}a${k} ${k} 0 0 1 ${k} ${k}v${X(1 - 2 * k)}a${k} ${k} 0 0 1 -${k} ${k}h-${X(1 - 2 * k)}a${k} ${k} 0 0 1 -${k} -${k}v-${X(1 - 2 * k)}a${k} ${k} 0 0 1 ${k} -${k}z`; }
    else d += `M${x} ${y}h1.02v1.02h-1.02z`;
  }
  const rr = (x, y, w, h, k) => k ? `M${X(x + k)} ${y}h${X(w - 2 * k)}a${k} ${k} 0 0 1 ${k} ${k}v${X(h - 2 * k)}a${k} ${k} 0 0 1 -${k} ${k}h-${X(w - 2 * k)}a${k} ${k} 0 0 1 -${k} -${k}v-${X(h - 2 * k)}a${k} ${k} 0 0 1 ${k} -${k}z` : `M${x} ${y}h${w}v${h}h-${w}z`;
  const eyes = [[m, m], [m + n - 7, m], [m, m + n - 7]].map(([x, y]) => {
    const k1 = eyeS === 'round' ? 1.6 : eyeS === 'circle' ? 2.3 : 0, k2 = eyeS === 'round' ? .8 : eyeS === 'circle' ? 1.3 : 0, k3 = eyeS === 'circle' ? 1.5 : eyeS === 'round' ? .6 : 0;
    return `<path fill-rule="evenodd" d="${rr(x, y, 7, 7, k1)}${rr(x + 1, y + 1, 5, 5, k2)}"/><path d="${rr(x + 2, y + 2, 3, 3, k3)}"/>`;
  }).join('');
  const fh = frame === 'label' ? Math.max(3.5, size * .13) : 0, fp = frame === 'none' ? 0 : Math.max(1, size * .025);
  const W = size + 2 * fp, H = size + 2 * fp + fh;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${X(W)} ${X(H)}" shape-rendering="${dotS === 'square' ? 'crispEdges' : 'geometricPrecision'}">`;
  s += `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${x2 * X(W)}" y2="${y2 * X(W)}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`;
  if (!transp) s += `<rect width="${X(W)}" height="${X(H)}" fill="${bg}"/>`;
  if (frame !== 'none') {
    s += `<rect x="${X(fp / 2)}" y="${X(fp / 2)}" width="${X(W - fp)}" height="${X(H - fp)}" rx="${X(fp)}" fill="none" stroke="${c1}" stroke-width="${X(fp)}"/>`;
    if (fh) s += `<path d="M${X(fp / 2)} ${X(H - fh - fp / 2)}H${X(W - fp / 2)}V${X(H - fp - fp * .2)}a${X(fp)} ${X(fp)} 0 0 1 -${X(fp)} ${X(fp)}H${X(fp * 1.5)}a${X(fp)} ${X(fp)} 0 0 1 -${X(fp)} -${X(fp)}z" fill="${c1}"/><text x="${X(W / 2)}" y="${X(H - fh / 2 - fp / 2 + fh * .18)}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${X(fh * .5)}" fill="${ratio(c1, '#ffffff') >= 3 ? '#ffffff' : '#000000'}">${esc(ftxt)}</text>`;
  }
  s += `<g transform="translate(${X(fp)} ${X(fp)})">`;
  s += `<path fill="url(#g)" d="${d}"/><g fill="${eyeC || 'url(#g)'}">${eyes}</g>`;
  if (hasLogo) { const lw = lgm, px = m + lx, pad = .6; s += `<rect x="${X(px - pad)}" y="${X(px - pad)}" width="${X(lw + 2 * pad)}" height="${X(lw + 2 * pad)}" rx="1" fill="${transp ? '#ffffff' : bg}"/><image href="${logoData}" x="${X(px)}" y="${X(px)}" width="${X(lw)}" height="${X(lw)}" preserveAspectRatio="xMidYMid meet"/>`; }
  s += '</g></svg>';
  return { svg: s, w: W, h: H, n, lvl, warn: warnings(c1, c2, bg, eyeC, transp, lg, n) };
}
function warnings(c1, c2, bg, eyeC, transp, lg, n) {
  const w = [], b = transp ? '#ffffff' : bg;
  for (const c of [c1, c2, eyeC].filter(Boolean)) { if (lum(c) > lum(b)) { w.push('Light code on a dark background. Many scanner apps cannot read inverted codes.'); break; } }
  if (Math.min(ratio(c1, b), ratio(c2, b), eyeC ? ratio(eyeC, b) : 21) < 3) w.push('Low contrast between the code and its background. It may not scan.');
  if (lg > .25) w.push('The logo is large. Keep it under 25% so the code stays readable.');
  if (n > 77) w.push('This code is very dense. Shorten the content so it scans easily when printed small.');
  return w;
}

/* ---------- raster and files ---------- */
function toImg(url) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('draw')); i.src = url; }); }
async function raster(res, px, type) {
  const u = URL.createObjectURL(new Blob([res.svg], { type: 'image/svg+xml' }));
  try {
    const img = await toImg(u), c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * res.h / res.w); const g = c.getContext('2d');
    if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, type, .95));
  } finally { URL.revokeObjectURL(u); }
}
async function pdfOf(res) {
  const png = await raster(res, 2400, 'image/png'), doc = await PDFLib.PDFDocument.create(), im = await doc.embedPng(new Uint8Array(await png.arrayBuffer()));
  const pw = 226.8, ph = pw * res.h / res.w, pg = doc.addPage([pw + 56.7, ph + 56.7]);   // 8 cm code on 10 cm page
  pg.drawImage(im, { x: 28.35, y: 28.35, width: pw, height: ph }); doc.setProducer('Dilia QR'); doc.setCreator('Dilia QR');
  return new Blob([await doc.save()], { type: 'application/pdf' });
}
const baseName = () => cleanName(($('#outName') && $('#outName').value) || '', 'qr-code', '').replace(/\.$/, '');
let cur = null, lastUrl = null, timer = 0, testTimer = 0, seqT = 0;
function schedule() { clearTimeout(timer); timer = setTimeout(refresh, 120); }
async function refresh() {
  if (MODE !== 'make') return;
  const prev = $('#qprev'), warn = $('#qwarn'), stat = $('#qstat'); warn.textContent = '';
  let payload = ''; try { payload = TYPES[curType].build(vals()); } catch (e) { payload = ''; }
  if (!payload) { cur = null; prev.innerHTML = '<p class="qempty">Fill in the details to see your code.</p>'; setBtns(false); stat.textContent = ''; return; }
  try { await lib('qrgen.bundle.js'); cur = buildSvg(payload); }
  catch (e) { cur = null; prev.innerHTML = '<p class="qempty">Too much content for a QR code. Shorten it or lower the error correction.</p>'; setBtns(false); stat.textContent = ''; return; }
  cur.payload = payload; if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = URL.createObjectURL(new Blob([cur.svg], { type: 'image/svg+xml' }));
  prev.textContent = ''; const im = new Image(); im.alt = 'Your QR code'; im.src = lastUrl; prev.append(im); setBtns(true);
  cur.warn.forEach(t => warn.append(el('p', 'qw', t)));
  stat.textContent = 'Checking that it scans...'; clearTimeout(testTimer); const my = ++seqT;
  testTimer = setTimeout(async () => {
    try {
      await lib('qrread.bundle.js'); const blob = await raster(cur, 480, 'image/png'), bmp = await createImageBitmap(blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0);
      const r = JSQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height); if (my !== seqT) return;
      stat.className = 'qstat ' + (r && r.data === cur.payload ? 'ok' : 'bad'); stat.textContent = r && r.data === cur.payload ? 'Test scan passed: this code reads correctly.' : 'Test scan failed. Change colours, shrink the logo or shorten the content.';
    } catch (e) { if (my === seqT) { stat.className = 'qstat'; stat.textContent = ''; } }
  }, 500);
}
function setBtns(on) { document.querySelectorAll('[data-dl]').forEach(b => b.disabled = !on); }
async function download(kind) {
  if (!cur) return; const base = baseName();
  try {
    let blob, name;
    if (kind === 'svg') { blob = new Blob([cur.svg], { type: 'image/svg+xml' }); name = base + '.svg'; }
    else if (kind === 'pdf') { blob = await pdfOf(cur); name = base + '.pdf'; }
    else { const px = Math.max(128, Math.min(4000, +opt('qSize', 1024))); blob = await raster(cur, px, kind === 'jpg' ? 'image/jpeg' : 'image/png'); name = base + '.' + kind; }
    const u = URL.createObjectURL(blob); save(u, name); setTimeout(() => URL.revokeObjectURL(u), 4000);
  } catch (e) { toast('The download did not finish. Try a smaller size.', true); }
}

/* ---------- bulk ---------- */
async function bulk() {
  const lines = $('#bList').value.split(/\r?\n/).map(s => s.trim()).filter(Boolean), named = opt('bNamed', false), fmt = opt('bFmt', 'png'), px = Math.max(128, Math.min(4000, +opt('qSize', 1024)));
  if (!lines.length) return toast('Add at least one line first.', true);
  if (lines.length > 2000) return toast('That is a lot. Please do 2000 lines or fewer at a time.', true);
  await lib('qrgen.bundle.js'); const files = [], used = new Set(); let bad = 0; const go = $('#bGo'); go.disabled = true; const prog = $('#bProg');
  for (let i = 0; i < lines.length; i++) {
    let name, val = lines[i];
    if (named) { const k = val.indexOf(','); if (k > 0) { name = val.slice(0, k).trim(); val = val.slice(k + 1).trim(); } }
    const payload = TYPES[curType].build(Object.fromEntries(TYPES[curType].fields.map((f, j) => [f.id, j === 0 ? val : ''])));
    if (!payload) { bad++; continue; }
    try {
      const res = buildSvg(payload); let nm = (name || 'qr-' + String(i + 1).padStart(3, '0')).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 80) || 'qr-' + (i + 1), k = 1, base = nm; while (used.has(nm.toLowerCase())) nm = base + ' (' + (++k) + ')'; used.add(nm.toLowerCase());
      const blob = fmt === 'svg' ? new Blob([res.svg]) : await raster(res, px, 'image/png');
      files.push({ name: nm + '.' + fmt, data: new Uint8Array(await blob.arrayBuffer()) });
    } catch (e) { bad++; }
    prog.style.width = Math.round(100 * (i + 1) / lines.length) + '%'; if (i % 5 === 4) await new Promise(r => setTimeout(r, 0));
  }
  go.disabled = false; setTimeout(() => { prog.style.width = '0'; }, 600);
  if (!files.length) return toast('None of the lines could be turned into a code.', true);
  const z = Kit.zip(files), u = URL.createObjectURL(z); save(u, cleanName($('#outName').value, 'qr-codes', 'zip')); setTimeout(() => URL.revokeObjectURL(u), 4000);
  toast(`${plural(files.length, 'code')} saved in one ZIP.${bad ? ` ${bad} line${bad > 1 ? 's' : ''} skipped.` : ''}`);
}

/* ---------- reader ---------- */
let stream = null, raf = 0;
function showResult(text) {
  const box = $('#rOut'); box.textContent = ''; box.hidden = false;
  box.append(el('b', '', 'Found:'), el('pre', 'rtxt', text));
  const row = el('div', 'rrow'); const cp = el('button', 'btn ghost sm', 'Copy text'); cp.type = 'button'; cp.onclick = () => navigator.clipboard.writeText(text).then(() => toast('Copied.'), () => toast('Copy was blocked by the browser.', true)); row.append(cp);
  if (/^https?:\/\/\S+$/i.test(text)) { const a = el('a', 'btn ghost sm', 'Open link'); a.href = text; a.target = '_blank'; a.rel = 'noopener noreferrer'; row.append(a); box.append(row); box.append(el('p', 'tip', 'Check the address before you open it. Only open links you trust.')); } else box.append(row);
}
async function decodeBitmap(bmp) {
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, c.width, c.height);
  if ('BarcodeDetector' in window) { try { const r = await new BarcodeDetector({ formats: ['qr_code'] }).detect(c); if (r.length) return r[0].rawValue; } catch (e) { /* use the library */ } }
  await lib('qrread.bundle.js'); const d = g.getImageData(0, 0, c.width, c.height), r = JSQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' }); return r ? r.data : '';
}
async function readFile(f) {
  stopCam(); const out = $('#rOut'); out.hidden = true; const pv = $('#rPrev'); pv.textContent = '';
  try { const bmp = await createImageBitmap(f); const im = new Image(); im.src = URL.createObjectURL(f); im.alt = 'Your picture'; pv.append(im); const t = await decodeBitmap(bmp); bmp.close && bmp.close(); if (t) showResult(t); else { out.hidden = false; out.textContent = 'No QR code found in this picture. Try a sharper, closer photo.'; } }
  catch (e) { toast(f.name + ' could not be read as a picture.', true); }
}
function stopCam() { cancelAnimationFrame(raf); if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } const v = $('#rVid'); if (v) { v.srcObject = null; v.hidden = true; } const b = $('#rCam'); if (b) b.textContent = 'Use camera'; }
async function startCam() {
  const v = $('#rVid'), b = $('#rCam'); if (stream) return stopCam();
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch (e) { return toast('The camera is not available. Allow it in the browser, or upload a picture instead.', true); }
  v.srcObject = stream; v.hidden = false; await v.play(); b.textContent = 'Stop camera'; $('#rOut').hidden = true; await lib('qrread.bundle.js').catch(() => {});
  const c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
  const tick = async () => {
    if (!stream) return; if (v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; g.drawImage(v, 0, 0); let t = ''; try { const d = g.getImageData(0, 0, c.width, c.height), r = window.JSQR && JSQR(d.data, d.width, d.height); t = r ? r.data : ''; } catch (e) { /* skip frame */ } if (t) { stopCam(); showResult(t); return; } }
    raf = requestAnimationFrame(tick);
  }; tick();
}

/* ---------- wiring ---------- */
if (MODE === 'make') {
  const sel = $('#qType'); if (sel) { sel.value = curType; sel.addEventListener('input', () => { curType = sel.value; drawFields(); schedule(); }); }
  drawFields();
  document.querySelectorAll('.qcard details input,.qcard details select').forEach(e => e.addEventListener('input', () => {
    if (e.type === 'range') { const o = $('#' + e.id + 'o'); if (o) o.textContent = e.value; }
    if (e.id === 'qGrad') $('#qC2w').hidden = !e.checked; if (e.id === 'qEyeSame') $('#qEyew').hidden = e.checked; if (e.id === 'qFrame') $('#qFtw').hidden = e.value !== 'label'; schedule();
  }));
  const lf = $('#qLogo'); lf && lf.addEventListener('change', () => {
    const f = lf.files[0]; if (!f) { logoData = null; schedule(); return; }
    if (!/^image\/(png|jpeg|webp|svg\+xml|gif)$/.test(f.type)) { toast('Use a PNG, JPG, WebP or SVG logo.', true); lf.value = ''; return; }
    if (f.size > 4e6) { toast('That logo is over 4 MB. Use a smaller file.', true); lf.value = ''; return; }
    const r = new FileReader(); r.onload = () => { logoData = r.result; $('#qLogow').hidden = false; schedule(); }; r.readAsDataURL(f);
  });
  $('#qLogoClear') && $('#qLogoClear').addEventListener('click', () => { logoData = null; lf.value = ''; $('#qLogow').hidden = true; schedule(); });
  document.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => download(b.dataset.dl)));
  setBtns(false); refresh();
} else if (MODE === 'bulk') {
  const sel = $('#qType'); if (sel) { sel.value = curType; sel.addEventListener('input', () => { curType = sel.value; }); }
  $('#bGo').addEventListener('click', bulk);
  $('#bCsv').addEventListener('change', async e => { const f = e.target.files[0]; if (f) { if (f.size > 5e6) toast('That file is over 5 MB.', true); else $('#bList').value = await f.text(); } e.target.value = ''; });
} else if (MODE === 'read') {
  const pick = $('#pick'); pick.addEventListener('change', () => { if (pick.files[0]) readFile(pick.files[0]); pick.value = ''; });
  $('#rCam').addEventListener('click', startCam);
  addEventListener('paste', e => { const f = e.clipboardData && e.clipboardData.files[0]; if (f) { e.preventDefault(); readFile(f); } });
  Kit.dropAnywhere(fs => { if (fs[0]) readFile(fs[0]); });
  addEventListener('pagehide', stopCam);
}
}
