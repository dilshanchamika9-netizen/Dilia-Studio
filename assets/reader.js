/* Dilia PDF reader app (Task W, pass 1). Everything runs in this tab; files are never uploaded.
   Security (threat model 05-pdf-app): PDF scripts never run (wrapper forces it), web links ask first, attachments are saved
   only after a warning and never opened, recent files keep names and file handles only (no contents).
   All text from a PDF reaches the page through textContent, value or the pdf.js text layer (which uses textContent). */
{
const { $, kb, plural, toast, save } = Kit;
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const icon = d => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS(s.namespaceURI, 'path'); p.setAttribute('d', d); s.append(p); return s; };
const PX = 96 / 72;                                  // 100% = actual printed size on a 96 dpi screen
const MAXF = 500 * 1048576, MAXPX = 16e6, KEEP = 14, GAP = 12;
const app = $('#rd'), view = $('#rview'), tabsEl = $('#rtabs'), panel = $('#rspanel'), dlg = $('#rdlg'), pick = $('#rpick');
const zoomSel = $('#rZoom'), laySel = $('#rLayout'), pgIn = $('#rPg'), pgsEl = $('#rPgs'), findBar = $('#rfind'), q = $('#rq');
const tabs = []; let T = null, uid = 0;
const prefs = (() => { try { return Object.assign({ layout: 'cont', zoom: 'width', side: innerWidth > 900, panel: 'pages', night: false }, JSON.parse(localStorage.getItem('dilia-reader') || '{}')); } catch (e) { return { layout: 'cont', zoom: 'width', side: true, panel: 'pages', night: false }; } })();
const keep = () => { try { localStorage.setItem('dilia-reader', JSON.stringify(prefs)); } catch (e) { /* storage blocked */ } };
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches;

/* ---------- dialogs (one reusable <dialog>, content built with textContent) ---------- */
function ask(title, nodes, buttons) {
  return new Promise(res => {
    dlg.textContent = '';
    const f = el('form', 'rdf'); f.method = 'dialog';
    f.append(el('h2', '', title), ...nodes);
    const bar = el('div', 'rdb');
    buttons.forEach(b => { const x = el('button', 'btn ' + (b.primary ? 'go' : 'ghost') + ' sm', b.label); x.value = b.value; if (b.primary) x.autofocus = true; bar.append(x); });
    f.append(bar); dlg.append(f);
    dlg.onclose = () => res(dlg.returnValue || null);
    dlg.returnValue = ''; dlg.showModal();
  });
}
const p_ = t => el('p', '', t);

/* ---------- open ---------- */
async function openFiles(list) { for (const it of list) await openOne(it.file, it.handle); }
async function openPicker() {
  if (window.showOpenFilePicker) {
    let hs; try { hs = await showOpenFilePicker({ multiple: true, types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }] }); } catch (e) { return; }
    for (const h of hs) { try { await openOne(await h.getFile(), h); } catch (e) { toast('That file could not be read.', true); } }
  } else pick.click();
}
pick.addEventListener('change', () => { const fs = [...pick.files]; pick.value = ''; openFiles(fs.map(file => ({ file }))); });
async function askPassword(name, wrong) {
  const inp = el('input'); inp.type = 'password'; inp.autocomplete = 'off'; inp.id = 'rpw'; inp.setAttribute('aria-label', 'Password');
  const r = await ask(wrong ? 'Wrong password' : 'This PDF has a password', [p_((wrong ? 'That password did not open ' : 'Type the password to open ') + name + '.'), inp], [{ label: 'Cancel', value: 'no' }, { label: 'Open', value: 'ok', primary: true }]);
  return r === 'ok' ? inp.value : null;
}
async function openOne(file, handle, opt = {}) {
  if (!file) return;
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { toast(`${file.name} is not a PDF.`, true); return; }
  if (file.size > MAXF) { toast(`${file.name} is over 500 MB, which is too big to open here.`, true); return; }
  const same = !opt.replace && tabs.find(t => t.name === file.name && t.size === file.size && t.mod === file.lastModified);
  if (same) { activate(same); return; }
  if (tabs.length >= 12) toast('Many documents are open. Close some if the app gets slow.');
  let cancelled = false, data;
  try { data = new Uint8Array(await file.arrayBuffer()); } catch (e) { toast(`${file.name} could not be read.`, true); return; }
  const task = pdfjsLib.getDocument({ isEvalSupported: false, fontExtraProperties: true, data });   // font names for Document properties
  task.onPassword = (update, reason) => askPassword(file.name, reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD).then(pw => { if (pw == null) { cancelled = true; task.destroy(); } else update(pw); });
  let doc;
  try { doc = await task.promise; } catch (e) { if (!cancelled) toast(`${file.name} could not be opened. It may be damaged or not a real PDF.`, true); return; }
  const t = { id: ++uid, name: file.name, size: file.size, mod: file.lastModified, file, handle, doc, n: doc.numPages, pages: [], zoom: prefs.zoom, scale: 1, rot: 0,
    layout: prefs.layout, cur: 1, text: [], tc: [], ann: [], hits: [], hi: -1, oc: null, meas: [], wrap: el('div', 'rdoc'), perms: undefined };
  t.pgs = el('div', 'rpgs'); t.wrap.append(t.pgs); t.wrap.hidden = true; view.append(t.wrap);
  const first = await doc.getPage(1);
  for (let i = 0; i < t.n; i++) t.pages.push(newPage(t, i, i === 0 ? first : null));
  if (opt.replace && tabs.includes(opt.replace)) {            // edited version takes the old tab's place
    const old = opt.replace; t.cur = Math.min(old.cur, t.n); t.layout = old.layout; t.zoom = old.zoom; t.rot = old.rot;
    tabs.splice(tabs.indexOf(old), 0, t); addTab(t); tabsEl.insertBefore(t.tabEl, old.tabEl);
    if (T === old) T = null; closeTab(old, true); t.top = null; activate(t);
  } else { tabs.push(t); addTab(t); activate(t); }
  t.dirty = !!opt.dirty; mark(t);
  loadRest(t);
  if (!opt.dirty) addRecent(file, handle);
  return t;
}
function newPage(t, i, pg) {
  const p = { i, page: pg, w0: 0, h0: 0, el: el('div', 'rp'), cv: null, state: 0, rs: 0, task: null, tl: el('div', 'textLayer'), lk: el('div', 'rlk'), hl: el('div', 'rhl'), ms: null };
  p.el.dataset.n = i + 1; p.el.setAttribute('role', 'img'); p.el.setAttribute('aria-label', `Page ${i + 1}`);
  p.el.append(p.tl, p.hl, p.lk);
  const ref = pg || t.pages[0].page; dims(t, p, ref);
  return p;
}
function dims(t, p, pg) { const v = pg.getViewport({ scale: 1, rotation: ((pg.rotate || 0) + t.rot) % 360 }); p.w0 = v.width; p.h0 = v.height; }
async function ensure(t, p) { if (!p.page) { p.page = await t.doc.getPage(p.i + 1); dims(t, p, p.page); } return p.page; }
async function loadRest(t) {           // real sizes for every page, in the background
  let changed = false;
  for (let i = 1; i < t.n; i++) {
    if (!tabs.includes(t)) return;
    const p = t.pages[i]; const w = p.w0, h = p.h0;
    try { await ensure(t, p); } catch (e) { continue; }
    if (Math.abs(p.w0 - w) > .5 || Math.abs(p.h0 - h) > .5) changed = true;
    if (changed && (i % 50 === 0 || i === t.n - 1)) { changed = false; if (t === T) relayout(t, true); }
  }
}

/* ---------- tabs ---------- */
function addTab(t) {
  const b = el('div', 'rtab'); b.setAttribute('role', 'tab'); b.tabIndex = 0; b.title = t.name; b.dataset.id = t.id;
  const nm = el('span', 'rtn', t.name.replace(/\.pdf$/i, ''));
  const x = el('button', 'rtx'); x.type = 'button'; x.setAttribute('aria-label', 'Close ' + t.name); x.append(icon('M6 6l12 12M18 6 6 18'));
  x.addEventListener('click', e => { e.stopPropagation(); closeTab(t); });
  b.addEventListener('click', () => activate(t));
  b.addEventListener('auxclick', e => { if (e.button === 1) closeTab(t); });
  b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(t); } if (e.key === 'Delete') closeTab(t); });
  b.append(nm, x); tabsEl.insertBefore(b, $('#rNewTab')); t.tabEl = b; t.dirty = false;
}
function activate(t) {
  if (T === t) return;
  if (T) { T.top = view.scrollTop; T.wrap.hidden = true; T.tabEl.setAttribute('aria-selected', 'false'); T.pages.forEach(release); stopSpeak(); }
  T = t; app.dataset.state = 'doc';
  t.wrap.hidden = false; t.tabEl.setAttribute('aria-selected', 'true'); t.tabEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  document.title = (t.dirty ? '• ' : '') + t.name + ' - Dilia PDF';
  laySel.value = t.layout; view.classList.toggle('measuring', !!measure.on);
  relayout(t, false); if (t.top != null) view.scrollTop = t.top; else goTo(t, t.cur);
  showPanel(prefs.panel); runFind(true); updPage();
}
async function closeTab(t, force) {
  if (!force && t.dirty) {
    activate(t);
    const r = await ask('Save changes?', [p_(t.name + ' has changes that are not saved.')], [{ label: 'Cancel', value: 'no' }, { label: "Don't save", value: 'drop' }, { label: 'Save', value: 'save', primary: true }]);
    if (r === 'save') { if (!(await saveDoc(t, false))) return; } else if (r !== 'drop') return;
  }
  const i = tabs.indexOf(t); if (i < 0) return;
  t.pages.forEach(release); t.doc.destroy(); t.wrap.remove(); t.tabEl.remove(); tabs.splice(i, 1);
  if (T === t) { T = null; if (tabs.length) activate(tabs[Math.min(i, tabs.length - 1)]); else { app.dataset.state = 'start'; document.title = 'PDF Reader - Free Online | Dilia Studio'; panel.textContent = ''; showRecent(); stopSpeak(); } }
}

/* ---------- layout and zoom ---------- */
function fit(t, mode) {
  const W = Math.max(200, view.clientWidth - 2 * GAP - 16), H = Math.max(200, view.clientHeight - 2 * GAP);
  const two = t.layout === 'two' || t.layout === 'cover';
  const ref = t.pages[t.cur - 1] || t.pages[0];
  const pw = two ? Math.max(...t.pages.slice(0, 3).map(p => p.w0)) * 2 + GAP : ref.w0;
  const sw = W / pw; if (mode === 'width') return sw;
  return Math.min(sw, H / ref.h0);
}
function scaleFor(t) { const z = t.zoom; const s = z === 'width' || z === 'page' ? fit(t, z) : (+z || 1) * PX; return Math.max(.1 * PX, Math.min(6 * PX, s)); }
function rows(t) {
  const out = [], ps = t.pages;
  if (t.layout === 'two') for (let i = 0; i < ps.length; i += 2) out.push(ps.slice(i, i + 2));
  else if (t.layout === 'cover') { out.push([ps[0]]); for (let i = 1; i < ps.length; i += 2) out.push(ps.slice(i, i + 2)); }
  else ps.forEach(p => out.push([p]));
  return out;
}
function relayout(t, keepPos) {
  const anchor = keepPos ? anchorOf(t) : null;
  t.scale = scaleFor(t);
  if (t.builtLayout !== t.layout) {                  // regroup pages into rows
    t.pgs.textContent = ''; t.rowOf = [];
    rows(t).forEach((r, k) => { const row = el('div', 'rrow'); r.forEach(p => { row.append(p.el); t.rowOf[p.i] = k; }); t.pgs.append(row); });
    t.builtLayout = t.layout;
  }
  t.pgs.className = 'rpgs l-' + t.layout;
  for (const p of t.pages) {
    p.el.style.width = Math.floor(p.w0 * t.scale) + 'px'; p.el.style.height = Math.floor(p.h0 * t.scale) + 'px';
    p.el.style.setProperty('--total-scale-factor', t.scale);
  }
  if (t.layout === 'single') showSingle(t);
  zoomSel.value = ['width', 'page'].includes(t.zoom) ? t.zoom : (zoomSel.querySelector(`option[value="${t.zoom}"]`) ? String(t.zoom) : 'custom');
  zoomSel.querySelector('option[value=custom]').textContent = Math.round(t.scale / PX * 100) + '%';
  if (anchor) restore(t, anchor);
  observe(t); refreshVisible(t);
}
function anchorOf(t) { const p = t.pages[t.cur - 1]; if (!p || t.layout === 'single') return { i: t.cur - 1, f: 0 }; const r = p.el.getBoundingClientRect(), v = view.getBoundingClientRect(); return { i: p.i, f: (v.top - r.top) / Math.max(1, r.height) }; }
function restore(t, a) { if (t.layout === 'single') return; const p = t.pages[a.i]; view.scrollTop = offsetTop(p.el) + a.f * p.el.offsetHeight; }
function offsetTop(e) { return e.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop; }
function setZoom(z) { if (!T) return; T.zoom = z; if (z === 'width' || z === 'page') { prefs.zoom = z; keep(); } relayout(T, true); }
function stepZoom(d) {
  if (!T) return; const cur = T.scale / PX; const L = [.1, .25, .33, .5, .67, .75, .9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6];
  const nx = d > 0 ? L.find(v => v > cur + .001) || 6 : [...L].reverse().find(v => v < cur - .001) || .1; setZoom(nx);
}
zoomSel.addEventListener('change', () => { if (zoomSel.value !== 'custom') setZoom(['width', 'page'].includes(zoomSel.value) ? zoomSel.value : +zoomSel.value); view.focus(); });
laySel.addEventListener('change', () => { if (!T) return; const k = T.cur; T.layout = prefs.layout = laySel.value; keep(); relayout(T, false); goTo(T, k); view.focus(); });
$('#rZin').addEventListener('click', () => stepZoom(1)); $('#rZout').addEventListener('click', () => stepZoom(-1));
function rotate(d) { if (!T) return; const k = T.cur; T.rot = (T.rot + d + 360) % 360; T.pages.forEach(p => { if (p.page) dims(T, p, p.page); else dims(T, p, T.pages[0].page); release(p); }); clearMeasDraw(T); relayout(T, false); goTo(T, k); }
$('#rRotL').addEventListener('click', () => rotate(-90)); $('#rRotR').addEventListener('click', () => rotate(90));
view.addEventListener('wheel', e => { if (!T || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); stepZoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (T && (T.zoom === 'width' || T.zoom === 'page')) relayout(T, true); }, 150); });

/* ---------- navigation ---------- */
function showSingle(t) { t.pgs.querySelectorAll('.rrow').forEach((r, k) => { r.hidden = k !== t.rowOf[t.cur - 1]; }); view.scrollTop = 0; }
function goTo(t, n, top) {
  n = Math.max(1, Math.min(t.n, n | 0)); t.cur = n; const p = t.pages[n - 1];
  if (t.layout === 'single') { showSingle(t); refreshVisible(t); }
  let y = 0;
  if (top != null && p.page) { const v = p.page.getViewport({ scale: t.scale, rotation: ((p.page.rotate || 0) + t.rot) % 360 }); y = Math.max(0, v.convertToViewportPoint(0, top)[1] - 8); }
  if (t.layout !== 'single') view.scrollTop = offsetTop(p.el) - GAP + y; else view.scrollTop = y;
  updPage();
}
function updPage() {
  if (!T) { pgIn.value = ''; pgsEl.textContent = 'of 0'; return; }
  pgIn.value = T.cur; pgsEl.textContent = 'of ' + T.n;
  $('#rPrev').disabled = T.cur <= 1; $('#rNext').disabled = T.cur >= T.n;
  const th = panel.querySelector('.rth[aria-current]'); if (th) th.removeAttribute('aria-current');
  const nt = panel.querySelector(`.rth[data-n="${T.cur}"]`); if (nt) { nt.setAttribute('aria-current', 'page'); if (!nt.matches(':hover')) nt.scrollIntoView({ block: 'nearest' }); }
}
function step(d) { if (!T) return; if (T.layout === 'two' || T.layout === 'cover') { const r = T.rowOf[T.cur - 1] + d, rowsEls = T.pgs.children; if (r < 0 || r >= rowsEls.length) return; goTo(T, +rowsEls[r].firstChild.dataset.n); } else goTo(T, T.cur + d); }
$('#rPrev').addEventListener('click', () => step(-1)); $('#rNext').addEventListener('click', () => step(1));
pgIn.addEventListener('change', () => { if (T) goTo(T, parseInt(pgIn.value, 10) || 1); view.focus(); });
pgIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pgIn.dispatchEvent(new Event('change')); } });
let sraf = 0;
view.addEventListener('scroll', () => { if (sraf) return; sraf = requestAnimationFrame(() => { sraf = 0; if (!T || T.layout === 'single') return; const mid = view.getBoundingClientRect().top + view.clientHeight * .3; let best = T.cur;
  for (const r of T.pgs.children) { const b = r.getBoundingClientRect(); if (b.bottom >= mid) { best = +r.firstChild.dataset.n; break; } }
  if (best !== T.cur) { T.cur = best; updPage(); } }); });
let wheelLock = 0;
view.addEventListener('wheel', e => { if (!T || T.layout !== 'single' || e.ctrlKey || Date.now() < wheelLock) return; const atEnd = view.scrollTop + view.clientHeight >= view.scrollHeight - 2, atTop = view.scrollTop <= 0;
  if (e.deltaY > 0 && atEnd && T.cur < T.n) { wheelLock = Date.now() + 350; goTo(T, T.cur + 1); } else if (e.deltaY < 0 && atTop && T.cur > 1) { wheelLock = Date.now() + 350; goTo(T, T.cur - 1); } }, { passive: true });

/* ---------- rendering ---------- */
let io = null; const queue = new Set(); let busy = 0;
function observe(t) {
  if (io) io.disconnect();
  io = new IntersectionObserver(es => { for (const e of es) { const p = t.pages[+e.target.dataset.n - 1]; p.vis = e.isIntersecting; if (p.vis) want(t, p); } pump(t); }, { root: view, rootMargin: '120% 0px' });
  t.pages.forEach(p => io.observe(p.el));
}
function refreshVisible(t) { t.pages.forEach(p => { if (p.vis && (p.state === 0 || p.rs !== t.scale)) want(t, p); }); pump(t); }
function want(t, p) { if (p.state === 2 && p.rs === t.scale) return; queue.add(p); }
function pump(t) {
  while (busy < 2 && queue.size) {
    const list = [...queue].filter(p => p.vis); queue.clear(); list.forEach(p => queue.add(p));
    if (!list.length) return;
    list.sort((a, b) => Math.abs(a.i - t.cur + 1) - Math.abs(b.i - t.cur + 1));
    const p = list[0]; queue.delete(p); busy++;
    render(t, p).finally(() => { busy--; pump(t); trim(t); });
  }
}
function trim(t) { const on = t.pages.filter(p => p.cv); if (on.length <= KEEP) return; on.sort((a, b) => Math.abs(b.i - t.cur + 1) - Math.abs(a.i - t.cur + 1)); on.slice(0, on.length - KEEP).forEach(p => { if (!p.vis) release(p); }); }
function release(p) { if (p.task) { p.task.cancel(); p.task = null; } if (p.cv) { p.cv.width = p.cv.height = 0; p.cv.remove(); p.cv = null; } p.tl.textContent = ''; p.lk.textContent = ''; p.state = 0; p.rs = 0; p.tls = 0; }
const rotOf = (t, p) => ((p.page.rotate || 0) + t.rot) % 360;
async function render(t, p) {
  if (T !== t || (p.state === 2 && p.rs === t.scale)) return;
  const s = t.scale;
  try { await ensure(t, p); } catch (e) { return; }
  let ps = s * dpr(); const v1 = p.page.getViewport({ scale: 1, rotation: rotOf(t, p) });
  if (v1.width * v1.height * ps * ps > MAXPX) ps = Math.sqrt(MAXPX / (v1.width * v1.height));
  const vp = p.page.getViewport({ scale: ps, rotation: rotOf(t, p) });
  const cv = el('canvas', 'rcv'); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
  p.state = 1;
  try {
    p.task = p.page.render({ canvasContext: cv.getContext('2d', { alpha: false }), viewport: vp, optionalContentConfigPromise: t.oc ? Promise.resolve(t.oc) : null });
    await p.task.promise;
  } catch (e) {
    p.task = null; cv.width = cv.height = 0;
    if (e && e.name === 'RenderingCancelledException') { if (p.state === 1) p.state = 0; return; }
    p.state = 2; p.rs = s; p.el.classList.add('rerr'); p.el.dataset.err = 'This page could not be shown.'; return;
  }
  p.task = null;
  if (T !== t || t.scale !== s) { cv.width = cv.height = 0; p.state = 0; if (T === t) want(t, p); return; }
  if (p.cv) { p.cv.width = p.cv.height = 0; p.cv.remove(); }
  p.el.prepend(cv); p.cv = cv; p.state = 2; p.rs = s; p.el.classList.remove('rerr');
  layers(t, p, s);
}
async function textOf(t, i) {
  if (!t.tc[i]) { const p = t.pages[i]; await ensure(t, p); t.tc[i] = await p.page.getTextContent(); }
  return t.tc[i];
}
async function layers(t, p, s) {
  const rot = rotOf(t, p), vp = p.page.getViewport({ scale: s, rotation: rot });
  if (p.tls !== s) {
    p.tls = s; p.tl.textContent = '';
    try { const tc = await textOf(t, p.i); if (p.rs !== s) return; await new pdfjsLib.TextLayer({ textContentSource: tc, container: p.tl, viewport: vp }).render(); } catch (e) { /* no text */ }
  }
  links(t, p, vp); drawHits(t, p); drawMeas(t, p);
}

/* ---------- links and file-attachment pins on the page ---------- */
const SAFE = /^(https?:|mailto:)/i;
async function links(t, p, vp) {
  if (!t.ann[p.i]) { try { t.ann[p.i] = await p.page.getAnnotations({ intent: 'display' }); } catch (e) { t.ann[p.i] = []; } }
  p.lk.textContent = '';
  for (const a of t.ann[p.i]) {
    if (a.subtype !== 'Link' && a.subtype !== 'FileAttachment') continue;
    const [x1, y1] = vp.convertToViewportPoint(a.rect[0], a.rect[1]), [x2, y2] = vp.convertToViewportPoint(a.rect[2], a.rect[3]);
    const b = el('a', a.subtype === 'Link' ? 'rlink' : 'rpin'); b.href = '#';
    Object.assign(b.style, { left: Math.min(x1, x2) + 'px', top: Math.min(y1, y2) + 'px', width: Math.abs(x2 - x1) + 'px', height: Math.abs(y2 - y1) + 'px' });
    if (a.subtype === 'FileAttachment') { if (!a.file || a.fileId == null) continue; b.setAttribute('aria-label', 'Attached file: ' + a.file.filename); b.title = a.file.filename; b.addEventListener('click', e => { e.preventDefault(); saveAttachment(t, a.fileId, a.file); }); }
    else if (a.url) { b.setAttribute('aria-label', 'Link: ' + a.url); b.title = a.url; b.addEventListener('click', e => { e.preventDefault(); openLink(a.url); }); }
    else if (a.dest) { b.setAttribute('aria-label', 'Go to a place in this document'); b.addEventListener('click', e => { e.preventDefault(); destTo(t, a.dest); }); }
    else if (a.action) { const m = { NextPage: () => step(1), PrevPage: () => step(-1), FirstPage: () => goTo(t, 1), LastPage: () => goTo(t, t.n) }[a.action]; if (!m) continue; b.setAttribute('aria-label', a.action); b.addEventListener('click', e => { e.preventDefault(); m(); }); }
    else continue;
    p.lk.append(b);
  }
}
async function openLink(url) {
  let u; try { u = new URL(url); } catch (e) { toast('This link is not valid.', true); return; }
  if (!SAFE.test(u.protocol)) { toast('Dilia does not open this kind of link.', true); return; }
  const host = u.hostname, odd = /^xn--|\.xn--/.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':');
  const code = el('code', 'rurl', u.href);
  const nodes = [p_(u.protocol === 'mailto:' ? 'This link opens your email app:' : 'This link opens a website outside Dilia:'), code];
  if (host) { const h = el('p', 'rhost'); h.append('Site: ', el('b', '', host)); nodes.push(h); }
  if (odd) nodes.push(el('p', 'rwarn', 'Careful: this address uses a form often used to imitate real sites. Open it only if you trust the sender.'));
  const r = await ask('Open this link?', nodes, [{ label: 'Copy link', value: 'copy' }, { label: 'Cancel', value: 'no' }, { label: 'Open link', value: 'go', primary: true }]);
  if (r === 'go') window.open(u.href, '_blank', 'noopener,noreferrer');
  if (r === 'copy') navigator.clipboard && navigator.clipboard.writeText(u.href).then(() => toast('Link copied.'), () => toast('Copy was blocked by the browser.', true));
}
async function destTo(t, dest) {
  try {
    if (typeof dest === 'string') dest = await t.doc.getDestination(dest);
    if (!Array.isArray(dest)) return;
    const ref = dest[0]; const idx = ref && typeof ref === 'object' ? await t.doc.getPageIndex(ref) : Number.isInteger(ref) ? ref : -1;
    if (idx < 0) return;
    const k = dest[1] && dest[1].name; const top = k === 'XYZ' ? dest[3] : (k === 'FitH' || k === 'FitBH') ? dest[2] : k === 'FitR' ? dest[5] : null;
    await ensure(t, t.pages[idx]); goTo(t, idx + 1, typeof top === 'number' ? top : null);
  } catch (e) { toast('That link points to a place that does not exist.', true); }
}

/* ---------- side panels ---------- */
const PANELS = ['pages', 'outline', 'files', 'layers', 'results'];
document.querySelectorAll('.rsn').forEach(b => b.addEventListener('click', () => showPanel(b.dataset.p)));
$('#rSide').addEventListener('click', () => toggleSide());
function toggleSide(on) { prefs.side = on == null ? !prefs.side : on; keep(); app.classList.toggle('noside', !prefs.side); $('#rSide').setAttribute('aria-pressed', prefs.side); if (T && (T.zoom === 'width' || T.zoom === 'page')) setTimeout(() => relayout(T, true), 0); }
let pio = null;
async function showPanel(k) {
  if (!PANELS.includes(k)) k = 'pages';
  prefs.panel = k; keep();
  document.querySelectorAll('.rsn').forEach(b => b.setAttribute('aria-selected', b.dataset.p === k));
  panel.textContent = ''; if (pio) { pio.disconnect(); pio = null; }
  if (!T) return; const t = T;
  if (k === 'pages') return thumbs(t);
  if (k === 'outline') return outline(t);
  if (k === 'files') return files(t);
  if (k === 'layers') return layersPanel(t);
  if (k === 'results') return results(t);
}
function thumbs(t) {
  const list = el('div', 'rths');
  const W = 120;
  for (const p of t.pages) {
    const b = el('button', 'rth'); b.type = 'button'; b.dataset.n = p.i + 1; b.setAttribute('aria-label', 'Page ' + (p.i + 1));
    const box = el('span', 'rthb'); box.style.aspectRatio = `${p.w0} / ${p.h0}`;
    b.append(box, el('span', 'rthn', String(p.i + 1))); b.addEventListener('click', () => goTo(t, p.i + 1)); list.append(b);
  }
  panel.append(list); updPage();
  let running = 0; const todo = new Set();
  const go = () => { while (running < 2 && todo.size) { const b = todo.values().next().value; todo.delete(b); running++; thumb(t, b, W).finally(() => { running--; go(); }); } };
  pio = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting && !e.target.dataset.done) todo.add(e.target); else todo.delete(e.target); }); go(); }, { root: panel, rootMargin: '200px 0px' });
  list.querySelectorAll('.rth').forEach(b => pio.observe(b));
}
async function thumb(t, b, W) {
  if (T !== t || b.dataset.done) return; b.dataset.done = 1;
  const p = t.pages[+b.dataset.n - 1]; try { await ensure(t, p); } catch (e) { return; }
  const v1 = p.page.getViewport({ scale: 1, rotation: rotOf(t, p) }), vp = p.page.getViewport({ scale: W * dpr() / v1.width, rotation: rotOf(t, p) });
  const cv = el('canvas'); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
  try { await p.page.render({ canvasContext: cv.getContext('2d', { alpha: false }), viewport: vp, optionalContentConfigPromise: t.oc ? Promise.resolve(t.oc) : null }).promise; b.firstChild.style.aspectRatio = `${v1.width} / ${v1.height}`; b.firstChild.append(cv); } catch (e) { /* skip */ }
}
async function outline(t) {
  let o; try { o = await t.doc.getOutline(); } catch (e) { o = null; }
  if (T !== t || prefs.panel !== 'outline') return;
  if (!o || !o.length) { panel.append(el('p', 'rnone', 'This PDF has no bookmarks.')); return; }
  const tree = (items, lvl) => {
    const ul = el('ul', 'rol'); ul.setAttribute('role', lvl ? 'group' : 'tree');
    for (const it of items) {
      const li = el('li'); li.setAttribute('role', 'treeitem');
      const row = el('div', 'rolr');
      const kids = it.items && it.items.length;
      if (kids) { const tg = el('button', 'roltg'); tg.type = 'button'; tg.setAttribute('aria-label', 'Show or hide sub-bookmarks'); tg.setAttribute('aria-expanded', 'false'); tg.append(icon('m9 6 6 6-6 6')); row.append(tg);
        tg.addEventListener('click', () => { const on = tg.getAttribute('aria-expanded') !== 'true'; tg.setAttribute('aria-expanded', on); sub.hidden = !on; }); }
      else row.append(el('span', 'roltg sp'));
      const a = el('button', 'rola', it.title || '(untitled)'); a.type = 'button';
      if (it.bold) a.style.fontWeight = '700'; if (it.italic) a.style.fontStyle = 'italic';
      a.addEventListener('click', () => { if (it.dest) destTo(t, it.dest); else if (it.url) openLink(it.url); });
      row.append(a); li.append(row);
      let sub = null; if (kids) { sub = tree(it.items, lvl + 1); sub.hidden = true; li.append(sub); }
      ul.append(li);
    }
    return ul;
  };
  panel.append(tree(o, 0));
}
async function files(t) {
  let at; try { at = await t.doc.getAttachments(); } catch (e) { at = null; }
  if (T !== t || prefs.panel !== 'files') return;
  const list = at instanceof Map ? [...at] : at ? Object.entries(at) : [];   // pdf.js 6: Map of id -> { filename, description }
  if (!list.length) { panel.append(el('p', 'rnone', 'This PDF has no attached files. Files pinned to a page show as a paperclip on that page.')); return; }
  panel.append(el('p', 'rtip', 'Files inside a PDF can be harmful. Dilia never opens them. Save one only if you trust the sender.'));
  const ul = el('ul', 'rfl');
  for (const [id, f] of list) {
    const li = el('li'); const nm = el('span', 'rfn', f.filename || 'unnamed');
    const b = el('button', 'btn ghost sm', 'Save'); b.type = 'button'; b.setAttribute('aria-label', 'Save ' + (f.filename || 'file')); b.addEventListener('click', () => saveAttachment(t, id, f));
    li.append(nm, b); if (f.description) li.append(el('span', 'rfd', f.description)); ul.append(li);
  }
  panel.append(ul);
}
async function saveAttachment(t, id, f) {
  const r = await ask('Save attached file?', [p_('This file came inside the PDF: ' + (f.filename || 'unnamed') + '.'), el('p', 'rwarn', 'Dilia will not open it. Files from unknown senders can harm your computer. Open it only if you trust the sender.')], [{ label: 'Cancel', value: 'no' }, { label: 'Save file', value: 'ok', primary: true }]);
  if (r !== 'ok') return;
  let content = null; try { content = await t.doc.getAttachmentContent(id); } catch (e) { content = null; }
  if (!content) { toast('That attached file is empty or damaged.', true); return; }
  f = Object.assign({}, f, { content });
  const name = String(f.filename || 'attachment').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '').slice(0, 150) || 'attachment';
  const u = URL.createObjectURL(new Blob([f.content], { type: 'application/octet-stream' })); save(u, name); setTimeout(() => URL.revokeObjectURL(u), 5000);
}
async function layersPanel(t) {
  if (t.oc === null) { try { t.oc = await t.doc.getOptionalContentConfig(); } catch (e) { t.oc = undefined; } }
  if (T !== t || prefs.panel !== 'layers') return;
  const oc = t.oc; const groups = oc ? [...oc] : [];
  if (!groups.length) { panel.append(el('p', 'rnone', 'This PDF has no layers.')); return; }
  const make = (order, ul) => {
    for (const item of order) {
      if (typeof item === 'string') { const g = oc.getGroup(item); if (!g) continue; const li = el('li'); const lab = el('label', 'rchk'); const c = el('input'); c.type = 'checkbox'; c.checked = g.visible;
        c.addEventListener('change', () => { oc.setVisibility(item, c.checked); redraw(t); }); lab.append(c, ' ', g.name || '(unnamed layer)'); li.append(lab); ul.append(li); }
      else if (item && Array.isArray(item.order)) { const li = el('li'); if (item.name) li.append(el('b', '', item.name)); const sub = el('ul'); make(item.order, sub); li.append(sub); ul.append(li); }
    }
  };
  const ul = el('ul', 'rlay'); make(oc.getOrder() || groups.map(g => g[0]), ul); panel.append(ul);
}
function redraw(t) { t.pages.forEach(p => { if (p.state === 2) { p.rs = -1; } }); panel.querySelectorAll('.rth').forEach(b => { delete b.dataset.done; b.firstChild.textContent = ''; }); refreshVisible(t); if (prefs.panel === 'pages') { const k = prefs.panel; showPanel(k); } }

/* ---------- find ---------- */
let findTok = 0;
function openFind() { if (!T) return; findBar.hidden = false; q.focus(); q.select(); }
function closeFind() { findBar.hidden = true; if (T) { T.hits = []; T.hi = -1; T.pages.forEach(p => drawHits(T, p)); } $('#rqn').textContent = ''; view.focus(); }
$('#rFind').addEventListener('click', () => findBar.hidden ? openFind() : closeFind());
$('#rqClose').addEventListener('click', closeFind);
let qt; q.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => runFind(), 250); });
['rqCase', 'rqWord'].forEach(id => $('#' + id).addEventListener('change', () => runFind()));
q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); hit(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') { e.preventDefault(); closeFind(); } });
$('#rqNext').addEventListener('click', () => hit(1)); $('#rqPrev').addEventListener('click', () => hit(-1));
async function pageStr(t, i) {
  if (t.text[i]) return t.text[i];
  const tc = await textOf(t, i); let s = ''; const map = [];
  for (const it of tc.items) { if (it.str == null) continue; map.push({ it, a: s.length }); s += it.str; if (it.hasEOL) s += '\n'; }
  return (t.text[i] = { s, map });
}
function pattern(term) {
  let src = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  if ($('#rqWord').checked) src = '(?<![\\p{L}\\p{N}_])' + src + '(?![\\p{L}\\p{N}_])';
  return new RegExp(src, 'gu' + ($('#rqCase').checked ? '' : 'i'));
}
async function runFind(silent) {
  const t = T, term = q.value; const tok = ++findTok;
  if (!t) return; t.hits = []; t.hi = -1; t.pages.forEach(p => drawHits(t, p));
  if (findBar.hidden || !term.trim()) { $('#rqn').textContent = ''; if (prefs.panel === 'results') showPanel('results'); return; }
  const re = pattern(term); $('#rqn').textContent = 'Searching...';
  for (let i = 0; i < t.n; i++) {
    let ps; try { ps = await pageStr(t, i); } catch (e) { continue; }
    if (tok !== findTok) return;
    for (const m of ps.s.matchAll(re)) { t.hits.push({ i, a: m.index, b: m.index + m[0].length, ctx: ps.s.slice(Math.max(0, m.index - 30), m.index + m[0].length + 40).replace(/\s+/g, ' ') }); if (t.hits.length >= 5000) break; }
    if (i % 20 === 19) { $('#rqn').textContent = `Searching page ${i + 1} of ${t.n}...`; t.pages.forEach(p => drawHits(t, p)); }
    if (t.hits.length >= 5000) break;
  }
  t.pages.forEach(p => drawHits(t, p));
  $('#rqn').textContent = t.hits.length ? plural(t.hits.length, 'match', 'matches').replace('matchs', 'matches') + (t.hits.length >= 5000 ? ' (first 5,000)' : '') : 'No matches. Scanned pages have no text to search.';
  if (prefs.panel === 'results' || t.hits.length) showPanel('results');
  if (t.hits.length && !silent) { const k = t.hits.findIndex(h => h.i >= t.cur - 1); t.hi = (k < 0 ? 0 : k) - 1; hit(1); }
}
function hit(d) {
  const t = T; if (!t || !t.hits.length) { if (t && q.value.trim()) runFind(); return; }
  t.hi = (t.hi + d + t.hits.length) % t.hits.length; const h = t.hits[t.hi];
  $('#rqn').textContent = `${t.hi + 1} of ${t.hits.length}`;
  t.pages.forEach(p => drawHits(t, p));
  const p = t.pages[h.i]; if (t.layout === 'single' || t.cur !== h.i + 1) goTo(t, h.i + 1);
  const r = boxes(t, p, h)[0]; if (r && t.layout !== 'single') { const y = offsetTop(p.el) + r.y - view.clientHeight / 3; if (Math.abs(y - view.scrollTop) > view.clientHeight / 3) view.scrollTop = y; }
  panel.querySelectorAll('.rres[aria-current]').forEach(x => x.removeAttribute('aria-current')); const rr = panel.querySelector(`.rres[data-k="${t.hi}"]`); if (rr) { rr.setAttribute('aria-current', 'true'); rr.scrollIntoView({ block: 'nearest' }); }
}
function boxes(t, p, h) {
  const ps = t.text[p.i]; if (!ps || !p.page) return [];
  const vp = p.page.getViewport({ scale: t.scale, rotation: rotOf(t, p) }), out = [];
  for (const { it, a } of ps.map) {
    const len = it.str.length, b = a + len; if (!len || b <= h.a || a >= h.b) continue;
    const s0 = Math.max(0, h.a - a) / len, s1 = Math.min(len, h.b - a) / len;
    const [m0, m1, m2, m3, e, f] = it.transform, ul = Math.hypot(m0, m1) || 1, vl = Math.hypot(m2, m3) || 1, ux = m0 / ul, uy = m1 / ul, vx = m2 / vl, vy = m3 / vl;
    const hgt = it.height || vl, w = it.width;
    const ox = e + ux * w * s0 - vx * hgt * .2, oy = f + uy * w * s0 - vy * hgt * .2, lw = w * (s1 - s0), lh = hgt * 1.2;
    const pts = [[ox, oy], [ox + ux * lw, oy + uy * lw], [ox + vx * lh, oy + vy * lh], [ox + ux * lw + vx * lh, oy + uy * lw + vy * lh]].map(([x, y]) => vp.convertToViewportPoint(x, y));
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    out.push({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
  }
  return out;
}
function drawHits(t, p) {
  p.hl.textContent = ''; if (!t.hits.length || !p.page) return;
  t.hits.forEach((h, k) => { if (h.i !== p.i) return; for (const r of boxes(t, p, h)) { const i = el('i', k === t.hi ? 'cur' : ''); Object.assign(i.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); p.hl.append(i); } });
}
function results(t) {
  if (!t.hits.length) { panel.append(el('p', 'rnone', q.value.trim() && !findBar.hidden ? 'No matches.' : 'Search results show here. Press Ctrl+F to search.')); return; }
  const ul = el('ul', 'rresl');
  t.hits.slice(0, 1000).forEach((h, k) => { const li = el('li'); const b = el('button', 'rres'); b.type = 'button'; b.dataset.k = k; b.append(el('b', '', 'Page ' + (h.i + 1)), el('span', '', h.ctx)); b.addEventListener('click', () => { t.hi = k - 1; hit(1); }); li.append(b); ul.append(li); });
  if (t.hits.length > 1000) panel.append(el('p', 'rtip', 'Showing the first 1,000 results.'));
  panel.append(ul);
}

/* ---------- night, full screen, read mode ---------- */
function night(on) { prefs.night = on == null ? !prefs.night : on; keep(); view.classList.toggle('night', prefs.night); $('#rNight').setAttribute('aria-pressed', prefs.night); }
$('#rNight').addEventListener('click', () => night());
function readMode(on) { const v = on == null ? !app.classList.contains('readmode') : on; app.classList.toggle('readmode', v); $('#rReadMode').setAttribute('aria-pressed', v); if (T && (T.zoom === 'width' || T.zoom === 'page')) setTimeout(() => relayout(T, true), 0); }
$('#rReadMode').addEventListener('click', () => readMode());
const exitRead = el('button', 'rexit', 'Exit read mode'); exitRead.type = 'button'; exitRead.addEventListener('click', () => readMode(false)); app.append(exitRead);
let pre = null;
async function full() {
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  if (!T || !app.requestFullscreen) return;
  pre = { layout: T.layout, zoom: T.zoom }; T.layout = 'single'; T.zoom = 'page';
  try { await app.requestFullscreen(); } catch (e) { T.layout = pre.layout; T.zoom = pre.zoom; pre = null; return; }
  app.classList.add('present'); relayout(T, false); goTo(T, T.cur);
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && pre && T) { app.classList.remove('present'); T.layout = pre.layout; T.zoom = pre.zoom; pre = null; laySel.value = T.layout; relayout(T, false); goTo(T, T.cur); } else if (document.fullscreenElement && T) setTimeout(() => relayout(T, false), 60); });
$('#rFull').addEventListener('click', full);
view.addEventListener('click', e => { if (app.classList.contains('present') && !e.target.closest('a')) step(e.clientX < innerWidth / 3 ? -1 : 1); });

/* ---------- properties ---------- */
const pdfDate = s => { const m = /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(s || ''); if (!m) return s || ''; const d = new Date(Date.UTC(+m[1], (+m[2] || 1) - 1, +m[3] || 1, +m[4] || 0, +m[5] || 0)); return isNaN(d) ? s : d.toLocaleString(); };
const can = (t, f) => !t.perms || f == null || (t.perms.has ? t.perms.has(f) : t.perms.includes(f));   // pdf.js 6 gives a Set, older versions an array
const SIZES = [['A3', 297, 420], ['A4', 210, 297], ['A5', 148, 210], ['Letter', 215.9, 279.4], ['Legal', 215.9, 355.6], ['Tabloid', 279.4, 431.8]];
async function properties() {
  const t = T; if (!t) return;
  let md = {}; try { md = await t.doc.getMetadata(); } catch (e) { /* none */ }
  const info = md.info || {}, p = t.pages[t.cur - 1]; await ensure(t, p);
  const v = p.page.getViewport({ scale: 1 }), wmm = v.width * 25.4 / 72, hmm = v.height * 25.4 / 72;
  const named = SIZES.find(([, a, b]) => (Math.abs(a - wmm) < 3 && Math.abs(b - hmm) < 3) || (Math.abs(b - wmm) < 3 && Math.abs(a - hmm) < 3));
  if (t.perms === undefined) { try { t.perms = await t.doc.getPermissions(); } catch (e) { t.perms = null; } }
  const F = pdfjsLib.PermissionFlag || {}, allow = f => can(t, f) ? 'Allowed' : 'Not allowed';
  const rows = [['File', t.name], ['File size', kb(t.size)], ['Title', info.Title], ['Author', info.Author], ['Subject', info.Subject], ['Keywords', info.Keywords],
    ['Created', pdfDate(info.CreationDate)], ['Changed', pdfDate(info.ModDate)], ['Made with', info.Creator], ['PDF producer', info.Producer], ['PDF version', info.PDFFormatVersion],
    ['Pages', String(t.n)], [`Page ${t.cur} size`, `${wmm.toFixed(0)} x ${hmm.toFixed(0)} mm (${(wmm / 25.4).toFixed(2)} x ${(hmm / 25.4).toFixed(2)} in)${named ? ', ' + named[0] : ''}`],
    ['Fast web view', info.IsLinearized ? 'Yes' : 'No'], ['Has a form', info.IsAcroFormPresent ? 'Yes' : 'No'], ['Password protected', info.EncryptFilterName ? 'Yes' : 'No'],
    ['Printing', allow(F.PRINT)], ['Copying text', allow(F.COPY)], ['Changing', allow(F.MODIFY_CONTENTS)]];
  const dl = el('dl', 'rprops'); rows.forEach(([k, val]) => { if (val == null || val === '') return; dl.append(el('dt', '', k), el('dd', '', String(val))); });
  const fontsOut = el('p', 'rtip'); const fb = el('button', 'btn ghost sm', 'List fonts'); fb.type = 'button';
  fb.addEventListener('click', async e => { e.preventDefault(); fb.disabled = true; fontsOut.textContent = 'Reading fonts...'; fontsOut.textContent = (await fontList(t)) || 'No fonts found (scanned pages use none).'; });
  const r = await ask('Document properties', [dl, fb, fontsOut], [{ label: 'Close', value: 'x', primary: true }]); return r;
}
async function fontList(t) {
  const names = new Set(), N = Math.min(t.n, 30);
  for (let i = 0; i < N; i++) {
    try { const p = t.pages[i]; await ensure(t, p); const ol = await p.page.getOperatorList();
      const ids = new Set(); ol.fnArray.forEach((fn, k) => { if (fn === pdfjsLib.OPS.setFont) ids.add(ol.argsArray[k][0]); });
      for (const id of ids) {                       // fonts arrive from the worker shortly after the operator list
        const f = await Promise.race([new Promise(r => { try { p.page.commonObjs.get(id, () => { try { r(p.page.commonObjs.get(id)); } catch (x) { r(null); } }); } catch (e) { r(null); } }), new Promise(r => setTimeout(() => r(null), 1500))]);
        const nm = f && (f.name || (f.loadedName && !/^g_/.test(f.loadedName) ? f.loadedName : '')); if (nm) names.add(nm.replace(/^[A-Z]{6}\+/, ''));
      }
    } catch (e) { /* skip page */ }
  }
  return names.size ? [...names].sort().join(', ') + (t.n > N ? ` (first ${N} pages)` : '') : '';
}
$('#rInfo').addEventListener('click', properties);

/* ---------- print ---------- */
function parseRange(s, n) { const out = []; for (const part of s.split(',')) { const m = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part); if (!m) return null; let a = +m[1], b = m[2] ? +m[2] : a; if (a > b) [a, b] = [b, a]; if (a < 1 || b > n) return null; for (let i = a; i <= b; i++) out.push(i); } return out.length ? out : null; }
async function printDoc() {
  const t = T; if (!t) return;
  if (t.perms === undefined) { try { t.perms = await t.doc.getPermissions(); } catch (e) { t.perms = null; } }
  if (pdfjsLib.PermissionFlag && !can(t, pdfjsLib.PermissionFlag.PRINT)) { toast('The maker of this PDF does not allow printing.', true); return; }
  const mk = (name, val, label, checked) => { const l = el('label', 'rchk'); const r = el('input'); r.type = 'radio'; r.name = name; r.value = val; r.checked = !!checked; l.append(r, ' ' + label); return l; };
  const range = el('input'); range.type = 'text'; range.placeholder = 'e.g. 1-3, 5'; range.setAttribute('aria-label', 'Pages to print'); range.className = 'rrange';
  const gray = el('label', 'rchk'); const g = el('input'); g.type = 'checkbox'; gray.append(g, ' Black and white');
  const hq = el('label', 'rchk'); const h = el('input'); h.type = 'checkbox'; hq.append(h, ' High quality (slower)');
  const fs = el('fieldset', 'rfs'); fs.append(el('legend', '', 'Pages'), mk('rpr', 'all', `All ${t.n} pages`, true), mk('rpr', 'cur', `This page (${t.cur})`), mk('rpr', 'some', 'Some pages:'), range);
  range.addEventListener('focus', () => { fs.querySelector('input[value=some]').checked = true; });
  const r = await ask('Print', [fs, gray, hq], [{ label: 'Cancel', value: 'no' }, { label: 'Print', value: 'ok', primary: true }]);
  if (r !== 'ok') return;
  const which = fs.querySelector('input[name=rpr]:checked').value;
  const list = which === 'all' ? Array.from({ length: t.n }, (_, i) => i + 1) : which === 'cur' ? [t.cur] : parseRange(range.value, t.n);
  if (!list) { toast(`Type pages between 1 and ${t.n}, like 1-3, 5.`, true); return; }
  const out = $('#rprint'); out.textContent = ''; const urls = []; const dpi = h.checked ? 300 : 150;
  try {
    for (let k = 0; k < list.length; k++) {
      if (k % 5 === 0) toast(`Preparing page ${k + 1} of ${list.length}...`);
      const p = t.pages[list[k] - 1]; await ensure(t, p);
      const vp = p.page.getViewport({ scale: dpi / 72, rotation: p.page.rotate || 0 });
      const cv = el('canvas'); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
      const x = cv.getContext('2d', { alpha: false }); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
      await p.page.render({ canvasContext: x, viewport: vp, optionalContentConfigPromise: t.oc ? Promise.resolve(t.oc) : null }).promise;   // screen intent: layers print as shown (pdf.js rejects a display layer config with the print intent)
      if (g.checked) { const c2 = el('canvas'); c2.width = cv.width; c2.height = cv.height; const y = c2.getContext('2d'); y.filter = 'grayscale(1)'; y.drawImage(cv, 0, 0); cv.width = 0; urls.push(await blobUrl(c2)); c2.width = 0; }
      else { urls.push(await blobUrl(cv)); cv.width = 0; }
      const img = el('img'); img.alt = ''; img.src = urls[urls.length - 1]; await img.decode().catch(() => {}); out.append(img);
    }
  } catch (e) { toast('Printing could not be prepared. Try fewer pages.', true); out.textContent = ''; urls.forEach(u => URL.revokeObjectURL(u)); return; }
  document.body.classList.add('rprinting');
  const done = () => { document.body.classList.remove('rprinting'); out.textContent = ''; urls.forEach(u => URL.revokeObjectURL(u)); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done); window.print(); setTimeout(() => { if (document.body.classList.contains('rprinting') && !matchMedia('print').matches) done(); }, 60000);
}
const blobUrl = cv => new Promise((ok, no) => cv.toBlob(b => b ? ok(URL.createObjectURL(b)) : no(new Error('blob')), 'image/png'));
$('#rPrint').addEventListener('click', printDoc);

/* ---------- read aloud (device voices only: network voices would send the text away) ---------- */
const speak = { on: false, i: 0, chunks: [], k: 0, bar: null };
function localVoices() { return window.speechSynthesis ? speechSynthesis.getVoices().filter(v => v.localService) : []; }
function stopSpeak() { if (window.speechSynthesis) speechSynthesis.cancel(); speak.on = false; $('#rSpeak').setAttribute('aria-pressed', 'false'); if (speak.bar) speak.bar.hidden = true; }
function speakBar() {
  if (speak.bar) return speak.bar;
  const b = el('div', 'rspeak'); b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Read aloud');
  const vs = el('select', 'rsel'); vs.id = 'rVoice'; vs.setAttribute('aria-label', 'Voice');
  const rate = el('select', 'rsel'); rate.id = 'rRate'; rate.setAttribute('aria-label', 'Speed'); [['0.8', 'Slow'], ['1', 'Normal'], ['1.25', 'Fast'], ['1.5', 'Faster']].forEach(([v, x]) => { const o = el('option', '', x); o.value = v; rate.append(o); }); rate.value = '1';
  const pause = el('button', 'btn ghost sm', 'Pause'); pause.type = 'button'; pause.id = 'rSpPause';
  const stop = el('button', 'btn ghost sm', 'Stop'); stop.type = 'button';
  pause.addEventListener('click', () => { if (speechSynthesis.paused) { speechSynthesis.resume(); pause.textContent = 'Pause'; } else { speechSynthesis.pause(); pause.textContent = 'Resume'; } });
  stop.addEventListener('click', stopSpeak);
  vs.addEventListener('change', () => { if (speak.on) { speechSynthesis.cancel(); setTimeout(say, 50); } });
  b.append(el('b', '', 'Read aloud'), vs, rate, pause, stop); app.append(b); speak.bar = b; return b;
}
function fillVoices() { const vs = $('#rVoice'); if (!vs) return; const cur = vs.value; vs.textContent = ''; localVoices().forEach(v => { const o = el('option', '', v.name + (v.lang ? ' (' + v.lang + ')' : '')); o.value = v.voiceURI; vs.append(o); }); if (cur) vs.value = cur; }
async function startSpeak() {
  if (!T) return;
  if (!window.speechSynthesis) { toast('This browser cannot read aloud.', true); return; }
  if (speak.on) { stopSpeak(); return; }
  speakBar(); fillVoices();
  if (!localVoices().length) { await new Promise(r => setTimeout(r, 400)); fillVoices(); }
  if (!localVoices().length) { toast('No voices are installed on this device. Add one in Windows Settings > Time and language > Speech.', true); return; }
  speak.bar.hidden = false; speak.on = true; speak.i = T.cur - 1; speak.t = T; $('#rSpeak').setAttribute('aria-pressed', 'true'); $('#rSpPause').textContent = 'Pause';
  await loadChunks(); say();
}
async function loadChunks() {
  const t = speak.t; let s = '';
  try { s = (await pageStr(t, speak.i)).s; } catch (e) { s = ''; }
  speak.chunks = (s.replace(/\s+/g, ' ').match(/[^.!?。]+[.!?。]*\s*/g) || []).reduce((a, c) => { if (a.length && (a[a.length - 1] + c).length < 220) a[a.length - 1] += c; else a.push(c); return a; }, []).filter(c => c.trim());
  speak.k = 0;
}
async function say() {
  if (!speak.on) return;
  while (speak.k >= speak.chunks.length) {
    speak.i++; if (speak.i >= speak.t.n) { stopSpeak(); toast('Finished reading.'); return; }
    await loadChunks(); if (T === speak.t) goTo(T, speak.i + 1);
  }
  const u = new SpeechSynthesisUtterance(speak.chunks[speak.k]);
  const v = localVoices().find(x => x.voiceURI === $('#rVoice').value) || localVoices()[0]; if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = +$('#rRate').value || 1;
  u.onend = () => { if (!speak.on) return; speak.k++; say(); };
  u.onerror = e => { if (e.error !== 'interrupted' && e.error !== 'canceled') { stopSpeak(); toast('Reading stopped: the voice failed.', true); } };
  speechSynthesis.speak(u);
}
if (window.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', fillVoices);
$('#rSpeak').addEventListener('click', startSpeak);

/* ---------- measure ---------- */
const measure = { on: false, type: 'dist', pts: [], page: -1, bar: null };
const UNIT = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8, pt: 25.4 / 72 };
function measBar() {
  if (measure.bar) return measure.bar;
  const b = el('div', 'rmeas'); b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Measure');
  const ty = el('select', 'rsel'); ty.setAttribute('aria-label', 'What to measure'); [['dist', 'Distance'], ['perim', 'Perimeter'], ['area', 'Area']].forEach(([v, x]) => { const o = el('option', '', x); o.value = v; ty.append(o); });
  ty.addEventListener('change', () => { measure.type = ty.value; measure.pts = []; T && drawMeas(T, T.pages[measure.page] || T.pages[0]); });
  const mkU = id => { const s = el('select', 'rsel'); s.id = id; Object.keys(UNIT).forEach(k => { const o = el('option', '', k); o.value = k; s.append(o); }); return s; };
  const a = el('input', 'rnum'); a.type = 'number'; a.value = '1'; a.min = '0'; a.id = 'rmA'; a.setAttribute('aria-label', 'Length on the page');
  const au = mkU('rmAu'); au.value = 'cm';
  const c = el('input', 'rnum'); c.type = 'number'; c.value = '1'; c.min = '0'; c.id = 'rmB'; c.setAttribute('aria-label', 'Real length');
  const cu = mkU('rmBu'); cu.value = 'cm';
  [a, au, c, cu].forEach(x => x.addEventListener('input', () => T && T.pages.forEach(p => drawMeas(T, p))));
  const clr = el('button', 'btn ghost sm', 'Clear'); clr.type = 'button'; clr.addEventListener('click', () => { if (!T) return; T.meas = []; measure.pts = []; T.pages.forEach(p => drawMeas(T, p)); });
  const done = el('button', 'btn ghost sm', 'Done'); done.type = 'button'; done.addEventListener('click', () => toggleMeasure(false));
  const sc = el('span', 'rmsc'); sc.append('Scale ', a, au, ' = ', c, cu);
  b.append(el('b', '', 'Measure'), ty, sc, el('span', 'rtip', 'Click points on the page. Double-click or Enter to finish an area.'), clr, done);
  app.append(b); measure.bar = b; return b;
}
function toggleMeasure(on) {
  measure.on = on == null ? !measure.on : on; measBar().hidden = !measure.on; view.classList.toggle('measuring', measure.on);
  $('#rMeasure').setAttribute('aria-pressed', measure.on); measure.pts = []; if (T) T.pages.forEach(p => drawMeas(T, p));
}
$('#rMeasure').addEventListener('click', () => toggleMeasure());
const realMM = () => { const a = +$('#rmA').value || 1, b = +$('#rmB').value || 1; return (b * UNIT[$('#rmBu').value]) / (a * UNIT[$('#rmAu').value]); };
function fmtLen(pt) { const u = $('#rmBu').value; return (pt * 25.4 / 72 * realMM() / UNIT[u]).toFixed(2) + ' ' + u; }
function fmtArea(pt2) { const u = $('#rmBu').value, f = 25.4 / 72 * realMM() / UNIT[u]; return (pt2 * f * f).toFixed(2) + ' ' + u + '²'; }
function measPoint(t, e) {
  const pe = e.target.closest('.rp'); if (!pe) return null; const p = t.pages[+pe.dataset.n - 1]; if (!p.page) return null;
  const r = pe.getBoundingClientRect(), vp = p.page.getViewport({ scale: t.scale, rotation: rotOf(t, p) });
  return { p, pt: vp.convertToPdfPoint(e.clientX - r.left, e.clientY - r.top) };
}
view.addEventListener('click', e => {
  if (!measure.on || !T) return; const m = measPoint(T, e); if (!m) return; e.preventDefault();
  if (measure.page !== m.p.i) { measure.pts = []; const old = T.pages[measure.page]; measure.page = m.p.i; if (old) drawMeas(T, old); }
  measure.pts.push(m.pt);
  if (measure.type === 'dist' && measure.pts.length === 2) finishMeas();
  drawMeas(T, m.p);
});
view.addEventListener('dblclick', e => { if (measure.on && measure.type !== 'dist') { e.preventDefault(); finishMeas(); } });
function finishMeas() {
  const pts = measure.pts; if (measure.type === 'dist' ? pts.length < 2 : pts.length < (measure.type === 'area' ? 3 : 2)) return;
  // a double-click adds the same point twice: drop exact repeats
  const clean = pts.filter((q, k) => !k || Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]) > .01);
  T.meas.push({ page: measure.page, type: measure.type, pts: clean }); measure.pts = []; drawMeas(T, T.pages[measure.page]);
}
const NS = 'http://www.w3.org/2000/svg';
function clearMeasDraw(t) { t.pages.forEach(p => { if (p.ms) { p.ms.remove(); p.ms = null; } }); }
function drawMeas(t, p) {
  if (!p) return; if (p.ms) { p.ms.remove(); p.ms = null; }
  const items = t.meas.filter(m => m.page === p.i).concat(measure.on && measure.page === p.i && measure.pts.length ? [{ type: measure.type, pts: measure.pts, live: 1 }] : []);
  if (!items.length || !p.page) return;
  const vp = p.page.getViewport({ scale: t.scale, rotation: rotOf(t, p) });
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'rms'); svg.setAttribute('width', p.el.offsetWidth); svg.setAttribute('height', p.el.offsetHeight);
  for (const m of items) {
    const v = m.pts.map(q => vp.convertToViewportPoint(q[0], q[1]));
    const closed = m.type === 'area' && !m.live;
    const line = document.createElementNS(NS, closed ? 'polygon' : 'polyline'); line.setAttribute('points', v.map(q => q.join(',')).join(' ')); line.setAttribute('class', closed ? 'ra' : 'rl'); svg.append(line);
    v.forEach(q => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', q[0]); c.setAttribute('cy', q[1]); c.setAttribute('r', 3.5); svg.append(c); });
    let len = 0; for (let k = 1; k < m.pts.length; k++) len += Math.hypot(m.pts[k][0] - m.pts[k - 1][0], m.pts[k][1] - m.pts[k - 1][1]);
    if (m.type === 'perim' && !m.live && m.pts.length > 2) len += Math.hypot(m.pts[0][0] - m.pts[m.pts.length - 1][0], m.pts[0][1] - m.pts[m.pts.length - 1][1]);
    let label = ''; if (m.type === 'area' && m.pts.length > 2) { let a = 0; m.pts.forEach((q, k) => { const r = m.pts[(k + 1) % m.pts.length]; a += q[0] * r[1] - r[0] * q[1]; }); label = fmtArea(Math.abs(a) / 2); } else if (m.pts.length > 1) label = fmtLen(len);
    if (label) { const last = v[v.length - 1], tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', last[0] + 6); tx.setAttribute('y', last[1] - 6); tx.textContent = label; svg.append(tx); }
  }
  p.el.append(svg); p.ms = svg;
}

/* ---------- edit / sign / change inside the app ----------
   Each tool is the normal Dilia tool page shown in a same-origin frame (?app=1). kit.js on that page takes the file from
   this window and sends PDF results back. Messages are accepted only from that frame on this origin. */
const APPTOOLS = [
  ['Edit and review', ['edit', 'annotate', 'forms', 'sign', 'add', 'redact', 'makeform']],
  ['Pages', ['reorder', 'delete', 'rotate', 'crop', 'insert', 'extract', 'split', 'resize', 'flip', 'nup']],
  ['Stamp and number', ['watermark', 'number', 'headfoot', 'bates', 'bookmarks', 'overlay']],
  ['Protect and optimise', ['compress', 'protect', 'unlock', 'flatten', 'cleaner', 'meta', 'ocr', 'linearize', 'grayscale', 'repair', 'noannot', 'deskew']],
  ['Combine and convert', ['merge', 'mix', 'pdf2img', 'text', 'table', 'extractimg', 'compare']]
];
const NEWDOC = new Set(['extract', 'merge', 'mix', 'nup', 'split', 'pdf2img', 'text', 'table', 'extractimg', 'compare']);   // results open as a new document
const TOOLDEF = {}; (window.DILIA_TOOLS || []).forEach(([, list]) => list.forEach(x => { TOOLDEF[x.id] = x; }));
const tool = { box: null, frame: null, t: null, id: null, sent: false };
function toolBox() {
  if (tool.box) return tool.box;
  const b = el('div', 'rtool'); b.hidden = true; b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', 'true'); b.setAttribute('aria-label', 'Tools');
  const head = el('div', 'rtoolh'); const back = el('button', 'btn ghost sm', 'Back to document'); back.type = 'button'; back.id = 'rToolBack'; back.addEventListener('click', closeTool);
  const ttl = el('b', 'rtoolt'); ttl.id = 'rToolTitle'; head.append(back, ttl);
  const body = el('div', 'rtoolb'); body.id = 'rToolBody';
  b.append(head, body); app.append(b); tool.box = b; return b;
}
function toolsMenu() {
  if (!T) return;
  const b = toolBox(); closeFrame(); $('#rToolTitle').textContent = 'Edit, sign or change ' + T.name;
  const body = $('#rToolBody'); body.textContent = '';
  const wrap = el('div', 'rtgrid');
  for (const [group, ids] of APPTOOLS) {
    const sec = el('section', 'rtg'); sec.append(el('h3', '', group)); const ul = el('ul');
    ids.forEach(id => { const d = TOOLDEF[id]; if (!d || !d.ready) return; const li = el('li'); const btn = el('button', 'rtbtn'); btn.type = 'button'; btn.dataset.tool = id;
      btn.append(el('b', '', d.name), el('span', '', d.desc || '')); btn.addEventListener('click', () => openTool(id)); li.append(btn); ul.append(li); });
    sec.append(ul); wrap.append(sec);
  }
  body.append(el('p', 'rtip', 'Changes come back to this tab. Nothing is saved to your file until you press Save (Ctrl+S).'), wrap);
  b.hidden = false; b.querySelector('.rtbtn').focus();
}
function openTool(id) {
  const d = TOOLDEF[id]; if (!d || !T) return;
  toolBox(); tool.t = T; tool.id = id; tool.sent = false;
  $('#rToolTitle').textContent = d.name + ': ' + T.name;
  const body = $('#rToolBody'); body.textContent = '';
  const f = el('iframe', 'rtoolf'); f.title = d.name; f.src = '../' + d.slug + '/?app=1'; tool.frame = f; body.append(f);
  toolBox().hidden = false;
}
function closeFrame() { if (tool.frame) { tool.frame.src = 'about:blank'; tool.frame.remove(); tool.frame = null; } }
function closeTool() { closeFrame(); if (tool.box) tool.box.hidden = true; tool.t = null; view.focus(); }
addEventListener('message', async e => {
  if (e.origin !== location.origin || !tool.frame || e.source !== tool.frame.contentWindow || !e.data) return;
  const t = tool.t; if (!t || !tabs.includes(t)) return;
  if (e.data.type === 'dilia-ready' && !tool.sent) {
    tool.sent = true; const bytes = await t.file.arrayBuffer();
    tool.frame.contentWindow.postMessage({ type: 'dilia-file', name: t.name, mod: t.mod, act: NEWDOC.has(tool.id) ? (['extract', 'merge', 'mix', 'nup'].includes(tool.id) ? 'new' : 'download') : 'replace', bytes }, location.origin, [bytes]);
  } else if (e.data.type === 'dilia-result' && e.data.bytes instanceof ArrayBuffer) {
    const id = tool.id, name = String(e.data.name || t.name).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
    const file = new File([e.data.bytes], NEWDOC.has(id) ? name : t.name, { type: 'application/pdf', lastModified: Date.now() });
    closeTool();
    if (NEWDOC.has(id)) await openOne(file, null, { dirty: true });
    else await openOne(file, t.handle, { replace: t, dirty: true });
    toast(NEWDOC.has(id) ? 'Opened as a new document. Press Ctrl+S to save it.' : 'Changes applied. Press Ctrl+S to save them to your file.');
  }
});
$('#rTools').addEventListener('click', toolsMenu);

/* ---------- save: over the original file when the browser allows it, otherwise a download ---------- */
function mark(t) { t.tabEl.firstChild.textContent = (t.dirty ? '• ' : '') + t.name.replace(/\.pdf$/i, ''); t.tabEl.title = t.name + (t.dirty ? ' (not saved)' : ''); if (t === T) document.title = (t.dirty ? '• ' : '') + t.name + ' - Dilia PDF'; }
function downloadCopy(t) { const u = URL.createObjectURL(t.file); save(u, t.name); setTimeout(() => URL.revokeObjectURL(u), 5000); }
async function writeTo(h, t) { const w = await h.createWritable(); await w.write(t.file); await w.close(); }
async function saveDoc(t, as) {
  if (!t) return false;
  if (!as && !t.dirty) { downloadCopy(t); return true; }                 // nothing changed: Save gives a copy
  if (!as && t.handle && t.handle.createWritable) {
    try {
      let perm = t.handle.queryPermission ? await t.handle.queryPermission({ mode: 'readwrite' }) : 'granted';
      if (perm !== 'granted' && t.handle.requestPermission) perm = await t.handle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') { await writeTo(t.handle, t); t.dirty = false; mark(t); toast('Saved ' + t.name + '.'); return true; }
    } catch (e) { toast('Could not save over the original file. Choose where to save it.', true); }
  }
  if (as && window.showSaveFilePicker) {
    try {
      const h = await showSaveFilePicker({ suggestedName: t.name, types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }] });
      await writeTo(h, t); t.handle = h; t.name = h.name || t.name; t.dirty = false; mark(t); addRecent(t.file, h); toast('Saved ' + t.name + '.'); return true;
    } catch (e) { if (e && e.name === 'AbortError') return false; }
  }
  downloadCopy(t); t.dirty = false; mark(t); return true;
}
$('#rSave').addEventListener('click', () => saveDoc(T, false));
addEventListener('beforeunload', e => { if (tabs.some(t => t.dirty)) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- recent files (names and file handles only, on this device) ---------- */
function idb() { return new Promise((ok, no) => { if (!window.indexedDB) return no(new Error('no idb')); const r = indexedDB.open('dilia-reader', 1); r.onupgradeneeded = () => r.result.createObjectStore('recent', { keyPath: 'key' }); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); }
async function store(mode, fn) { const d = await idb(); return new Promise((ok, no) => { const tx = d.transaction('recent', mode), st = tx.objectStore('recent'); const r = fn(st); tx.oncomplete = () => { d.close(); ok(r && r.result); }; tx.onerror = () => { d.close(); no(tx.error); }; }); }
async function recents() { try { return ((await store('readonly', s => s.getAll())) || []).sort((a, b) => (b.star - a.star) || (b.when - a.when)); } catch (e) { return []; } }
async function addRecent(file, handle) {
  const key = file.name + '|' + file.size;
  try {
    const old = (await recents()).find(r => r.key === key);
    const rec = { key, name: file.name, size: file.size, when: Date.now(), star: old ? old.star : 0, handle: handle || (old && old.handle) || null };
    try { await store('readwrite', s => s.put(rec)); } catch (e) { rec.handle = null; await store('readwrite', s => s.put(rec)); }
    const all = await recents(); const extra = all.filter(r => !r.star).slice(30); if (extra.length) await store('readwrite', s => { extra.forEach(r => s.delete(r.key)); });
  } catch (e) { /* storage blocked */ }
}
async function showRecent() {
  const box = $('#rrecent'); box.textContent = '';
  const all = await recents(); if (!all.length) return;
  const h = el('div', 'rrh'); h.append(el('h3', '', 'Recent files'));
  const clr = el('button', 'btn ghost sm', 'Forget all'); clr.type = 'button';
  clr.addEventListener('click', async () => { try { await store('readwrite', s => s.clear()); } catch (e) { /* ignore */ } showRecent(); });
  h.append(clr); box.append(h);
  const ul = el('ul', 'rrl');
  for (const r of all) {
    const li = el('li');
    const st = el('button', 'rstar' + (r.star ? ' on' : ''), r.star ? '★' : '☆'); st.type = 'button'; st.setAttribute('aria-label', r.star ? 'Remove from favourites' : 'Add to favourites'); st.setAttribute('aria-pressed', !!r.star);
    st.addEventListener('click', async () => { r.star = r.star ? 0 : 1; try { await store('readwrite', s => s.put(r)); } catch (e) { /* ignore */ } showRecent(); });
    const open = el('button', 'rro'); open.type = 'button'; open.append(el('b', '', r.name), el('span', '', kb(r.size) + ' · ' + new Date(r.when).toLocaleDateString()));
    open.addEventListener('click', () => reopen(r));
    const x = el('button', 'rrx'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + r.name + ' from the list'); x.append(icon('M6 6l12 12M18 6 6 18'));
    x.addEventListener('click', async () => { try { await store('readwrite', s => s.delete(r.key)); } catch (e) { /* ignore */ } showRecent(); });
    li.append(st, open, x); ul.append(li);
  }
  box.append(ul, el('p', 'rtip', 'Only file names are kept, on this device. The files themselves are never copied.'));
}
async function reopen(r) {
  if (r.handle && r.handle.getFile) {
    try {
      let perm = r.handle.queryPermission ? await r.handle.queryPermission({ mode: 'read' }) : 'granted';
      if (perm !== 'granted' && r.handle.requestPermission) perm = await r.handle.requestPermission({ mode: 'read' });
      if (perm === 'granted') { await openOne(await r.handle.getFile(), r.handle); return; }
    } catch (e) { toast(r.name + ' was moved or deleted. Choose it again.', true); }
  } else toast('Choose ' + r.name + ' again to open it.');
  openPicker();
}

/* ---------- start, drop, launch from File Explorer, install ---------- */
$('#rOpen').addEventListener('click', openPicker); $('#rStartOpen').addEventListener('click', openPicker); $('#rNewTab').addEventListener('click', openPicker);
addEventListener('dragover', e => { if ([...(e.dataTransfer && e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); app.classList.add('drop'); } });
addEventListener('dragleave', e => { if (!e.relatedTarget) app.classList.remove('drop'); });
addEventListener('drop', async e => {
  const items = [...(e.dataTransfer && e.dataTransfer.items || [])].filter(i => i.kind === 'file'); if (!items.length) return; e.preventDefault(); app.classList.remove('drop');
  const list = [];
  for (const it of items) { let h = null; try { if (it.getAsFileSystemHandle) { h = await it.getAsFileSystemHandle(); if (h && h.kind !== 'file') h = null; } } catch (x) { h = null; } const f = it.getAsFile(); if (f) list.push({ file: f, handle: h }); }
  openFiles(list);
});
if ('launchQueue' in window) launchQueue.setConsumer(async p => { for (const h of p.files || []) { try { await openOne(await h.getFile(), h); } catch (e) { toast('That file could not be opened.', true); } } });
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#rInstall').hidden = false; });
$('#rInstall').addEventListener('click', async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { /* ignore */ } installEvt = null; $('#rInstall').hidden = true; });
addEventListener('appinstalled', () => { $('#rInstall').hidden = true; toast('Dilia PDF is installed. Set it as your PDF app in Windows Settings > Apps > Default apps.'); });
if (isStandalone()) { document.body.classList.add('standalone'); $('#rhow').hidden = true; }
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => { /* offline mode unavailable */ });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) toast('Dilia PDF was updated. The new version is used next time you open it.'); });
}

/* ---------- keyboard (Acrobat-style) ---------- */
addEventListener('keydown', e => {
  const k = e.key, c = e.ctrlKey || e.metaKey, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || dlg.open;
  if (c && !e.shiftKey && k.toLowerCase() === 'o') { e.preventDefault(); openPicker(); return; }
  if (!T) return;
  if (c && !e.shiftKey && k.toLowerCase() === 'f') { e.preventDefault(); openFind(); return; }
  if (c && !e.shiftKey && k.toLowerCase() === 'p') { e.preventDefault(); printDoc(); return; }
  if (c && k.toLowerCase() === 's') { e.preventDefault(); saveDoc(T, e.shiftKey); return; }
  if (c && !e.shiftKey && k.toLowerCase() === 'd') { e.preventDefault(); properties(); return; }
  if (c && !e.shiftKey && k.toLowerCase() === 'l') { e.preventDefault(); full(); return; }
  if (c && !e.shiftKey && k.toLowerCase() === 'h') { e.preventDefault(); readMode(); return; }
  if (c && e.shiftKey && k.toLowerCase() === 'y') { e.preventDefault(); startSpeak(); return; }
  if (c && e.shiftKey && (k === '+' || k === '=')) { e.preventDefault(); rotate(90); return; }
  if (c && e.shiftKey && (k === '-' || k === '_')) { e.preventDefault(); rotate(-90); return; }
  if (c && (k === '+' || k === '=')) { e.preventDefault(); stepZoom(1); return; }
  if (c && k === '-') { e.preventDefault(); stepZoom(-1); return; }
  if (c && k === '0') { e.preventDefault(); setZoom('page'); return; }
  if (c && k === '1') { e.preventDefault(); setZoom(1); return; }
  if (c && k === '2') { e.preventDefault(); setZoom('width'); return; }
  if (k === 'F4') { e.preventDefault(); toggleSide(); return; }
  if (k === 'Escape') { if (measure.on) { if (measure.pts.length) { measure.pts = []; drawMeas(T, T.pages[measure.page]); } else toggleMeasure(false); return; } if (!findBar.hidden) { closeFind(); return; } if (app.classList.contains('readmode')) { readMode(false); return; } }
  if (k === 'Enter' && measure.on && !typing) { finishMeas(); return; }
  if (typing || c || e.altKey) return;
  const single = T.layout !== 'cont';
  if (k === 'Home') { e.preventDefault(); goTo(T, 1); } else if (k === 'End') { e.preventDefault(); goTo(T, T.n); }
  else if (k === 'ArrowRight' || (single && (k === 'PageDown' || k === 'ArrowDown') && T.layout === 'single' && view.scrollTop + view.clientHeight >= view.scrollHeight - 2)) { e.preventDefault(); step(1); }
  else if (k === 'ArrowLeft' || (single && (k === 'PageUp' || k === 'ArrowUp') && T.layout === 'single' && view.scrollTop <= 0)) { e.preventDefault(); step(-1); }
  else if (k === 'n' || k === 'N') step(1); else if (k === 'p' || k === 'P') step(-1);
});

/* ---------- start ---------- */
night(prefs.night); toggleSide(prefs.side); showRecent(); updPage();
window.__reader = { get tabs() { return tabs; }, get T() { return T; }, measure, goTo: n => T && goTo(T, n), saveDoc, openTool };
}
