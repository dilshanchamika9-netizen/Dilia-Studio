/* PDF reader: scroll through a PDF, zoom, jump to a page, search the text. Read only; nothing is changed or uploaded. */
{
const { $, kb, plural, esc, toast } = Kit;
pdfjsLib.GlobalWorkerOptions.workerSrc = DROOT + 'assets/vendor/pdf.worker.min.js';
const ws = $('#ws'), pick = $('#pick'), pagesEl = $('#vpages'), pgIn = $('#vpg'), of = $('#vof'), zl = $('#vzoom'), q = $('#vq'), qres = $('#vres');
let js = null, pv = [], zoom = 1, fit = true, name = '', hits = [], hi = -1, tok = 0;
const DPR = Math.min(2, window.devicePixelRatio || 1);

async function load(list) {
  const f = [...list].find(Kit.isPdf);
  if (!f) { toast('That is not a PDF. Choose a file ending in .pdf.', true); return; }
  ws.classList.add('working');
  try {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const d = await pdfjsLib.getDocument({ data: bytes }).promise;
    if (js) js.destroy();
    js = d; name = f.name; tok++;
  } catch (e) {
    ws.classList.remove('working');
    toast(/password/i.test(e.message || e.name) ? `${f.name} is password protected. Remove the password first with Remove password.` : `${f.name} could not be opened. It may be damaged.`, true); return;
  }
  ws.classList.remove('working');
  fit = true; hits = []; hi = -1; q.value = ''; qres.textContent = '';
  ws.dataset.state = 'full'; await build();
  $('#vname').textContent = name; of.textContent = 'of ' + js.numPages; pgIn.value = 1; pgIn.max = js.numPages;
  document.title = name + ' - PDF reader | Dilia Studio';
}
async function build() {
  const t = tok; pagesEl.innerHTML = ''; pv = [];
  const avail = Math.max(240, pagesEl.clientWidth - 24);
  const first = await js.getPage(1), v1 = first.getViewport({ scale: 1 });
  if (fit) zoom = Math.min(2.5, Math.max(.4, avail / v1.width));
  zl.textContent = Math.round(zoom * 100) + '%';
  for (let i = 1; i <= js.numPages; i++) {
    const pg = i === 1 ? first : await js.getPage(i), vp = pg.getViewport({ scale: zoom });
    if (t !== tok) return;
    const el = document.createElement('div'); el.className = 'vpage'; el.dataset.i = i - 1;
    el.style.width = Math.round(vp.width) + 'px'; el.style.height = Math.round(vp.height) + 'px';
    el.innerHTML = '<canvas></canvas><div class="vhl"></div>';
    pagesEl.append(el); pv.push({ el, pg, vp, done: false, text: null });
    if (i >= 60 && js.numPages > 200) { /* keep very long files light: remaining pages are measured lazily below */ }
  }
  obs.disconnect(); pv.forEach(p => obs.observe(p.el));
  drawHits();
}
const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) draw(+e.target.dataset.i); else release(+e.target.dataset.i); }), { root: null, rootMargin: '600px 0px' });
async function draw(i) {
  const p = pv[i]; if (!p || p.done || p.busy) return; p.busy = true; const t = tok;
  const c = p.el.firstChild, vp = p.pg.getViewport({ scale: zoom * DPR });
  c.width = Math.floor(vp.width); c.height = Math.floor(vp.height); c.style.width = '100%'; c.style.height = '100%';
  try { await p.pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; if (t === tok) p.done = true; } catch (e) { /* cancelled */ }
  p.busy = false;
}
function release(i) { const p = pv[i]; if (!p || !p.done) return; const c = p.el.firstChild; c.width = c.height = 0; p.done = false; }

/* ---------- navigation ---------- */
function cur() { const mid = innerHeight / 3; let k = 0; pv.forEach((p, i) => { const r = p.el.getBoundingClientRect(); if (r.top <= mid) k = i; }); return k; }
function goTo(i) { i = Math.max(0, Math.min(pv.length - 1, i)); pv[i].el.scrollIntoView({ block: 'start' }); pgIn.value = i + 1; }
addEventListener('scroll', () => { if (pv.length) pgIn.value = cur() + 1; }, { passive: true });
pgIn.addEventListener('change', () => goTo((+pgIn.value || 1) - 1));
$('#vprev').addEventListener('click', () => goTo(cur() - 1));
$('#vnext').addEventListener('click', () => goTo(cur() + 1));
const rezoom = async z => { if (!js) return; const k = cur(); fit = false; zoom = Math.max(.3, Math.min(4, z)); tok++; await build(); goTo(k); };
$('#vin').addEventListener('click', () => rezoom(zoom * 1.2));
$('#vout').addEventListener('click', () => rezoom(zoom / 1.2));
$('#vfit').addEventListener('click', async () => { if (!js) return; const k = cur(); fit = true; tok++; await build(); goTo(k); });

/* ---------- search ---------- */
async function textOf(i) {
  const p = pv[i]; if (p.text) return p.text;
  const tc = await p.pg.getTextContent(), v = p.pg.getViewport({ scale: 1 });
  p.text = tc.items.filter(it => it.str).map(it => ({ s: it.str, x: it.transform[4], y: v.height - it.transform[5], w: it.width, h: Math.abs(it.transform[3]) || 8 }));
  return p.text;
}
async function search() {
  const term = q.value.trim().toLowerCase(), t = tok; hits = []; hi = -1;
  if (!js || !term) { qres.textContent = ''; drawHits(); return; }
  qres.textContent = 'Searching...';
  for (let i = 0; i < pv.length; i++) {
    for (const it of await textOf(i)) { let k = it.s.toLowerCase().indexOf(term); while (k !== -1) { const a = it.w * k / it.s.length, b = it.w * (k + term.length) / it.s.length; hits.push({ i, x: it.x + a, y: it.y - it.h * .85, w: b - a, h: it.h * 1.1 }); k = it.s.toLowerCase().indexOf(term, k + term.length); } }
    if (t !== tok || q.value.trim().toLowerCase() !== term) return;
  }
  qres.textContent = hits.length ? `${plural(hits.length, 'match')}` : 'No matches. Scanned pages have no text to search.';
  drawHits(); if (hits.length) step(1);
}
function drawHits() {
  pv.forEach((p, i) => { p.el.lastChild.innerHTML = hits.map((h, k) => h.i === i ? `<i class="${k === hi ? 'cur' : ''}" style="left:${h.x * zoom}px;top:${h.y * zoom}px;width:${h.w * zoom}px;height:${h.h * zoom}px"></i>` : '').join(''); });
}
function step(d) {
  if (!hits.length) return; hi = (hi + d + hits.length) % hits.length; drawHits();
  const h = hits[hi], r = pv[h.i].el; scrollTo({ top: scrollY + r.getBoundingClientRect().top + h.y * zoom - innerHeight / 3, behavior: 'smooth' });
  qres.textContent = `${hi + 1} of ${plural(hits.length, 'match')}`;
}
let qt; q.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(search, 250); });
q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); hits.length ? step(e.shiftKey ? -1 : 1) : search(); } });
$('#vqn').addEventListener('click', () => step(1)); $('#vqp').addEventListener('click', () => step(-1));
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && js) { e.preventDefault(); q.focus(); q.select(); } });
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (js && fit) { const k = cur(); tok++; build().then(() => goTo(k)); } }, 250); });

$('#vreset').addEventListener('click', () => { if (js) js.destroy(); js = null; tok++; pv = []; pagesEl.innerHTML = ''; ws.dataset.state = 'empty'; scrollTo({ top: 0 }); });
pick.addEventListener('change', () => { if (pick.files.length) load(pick.files); pick.value = ''; });
Kit.dropAnywhere(load);
}
