// Launcher menu: search first, lines on the left, one category at a time on the right. Text via textContent only.
(() => {
  const btn = document.querySelector('[data-menu]'), head = document.querySelector('header.nav');
  if (!btn || !head || !window.DILIA_LINES) return;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const byId = {}; DILIA_TOOLS.forEach(([g, l]) => l.forEach(t => { byId[t.id] = t; }));
  const POP = { studio: ['merge', 'split', 'compress', 'edit', 'sign', 'pdf2img', 'img2pdf', 'ocr'], pixel: ['pxcompress', 'pxresize', 'pxconvert', 'pxheic', 'pxcrop', 'pxwm'], qr: ['qrmain', 'qrwifi', 'qrvcard', 'qrbulk', 'qrread'], text: ['txcount', 'txcase', 'txclean', 'txlist', 'txfind', 'txdiff'], calc: ['cloan', 'ccomp', 'cvat', 'cpct', 'unit'] };
  const lineOf = {}; DILIA_LINES.forEach(L => (L.cats || []).forEach(c => c.slice(1).forEach(ids => ids.forEach(id => { lineOf[id] = L.id; }))));
  const slugId = {}; Object.values(byId).forEach(t => { slugId[t.slug] = t.id; });
  const here = (location.pathname.match(/\/([^/]+)\/?(?:index\.html)?$/) || [])[1] || '';
  let recent = []; try { recent = JSON.parse(localStorage.getItem('dilia-recent') || '[]').filter(i => byId[i] && byId[i].ready); } catch (e) {}
  if (slugId[here]) { try { localStorage.setItem('dilia-recent', JSON.stringify([slugId[here]].concat(recent.filter(i => i !== slugId[here])).slice(0, 6))); } catch (e) {} }

  const panel = el('div', 'mega'); panel.id = 'mega'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'All tools');
  const glow = el('div', 'mglow'); glow.setAttribute('aria-hidden', 'true');
  const inner = el('div', 'mega-in');
  const find = el('label', 'mfind'); find.innerHTML = diliaIcon('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4');
  const q = el('input'); q.type = 'search'; q.placeholder = 'What do you want to do? Try compress, sign, QR, HEIC'; q.autocomplete = 'off'; q.setAttribute('aria-label', 'Search all tools'); find.append(q);
  const keys = el('kbd', '', 'Esc'); find.append(keys);
  const cols = el('div', 'mcols'), rail = el('div', 'mrail'), body = el('div', 'mbody'), results = el('div', 'mres'); results.hidden = true;
  cols.append(rail, body); inner.append(find, cols, results); panel.append(glow, inner); head.append(panel);

  let cur = lineOf[slugId[here]] || (DILIA_LINES.find(L => L.href && L.href.replace('/', '') === here) || {}).id || 'studio', tab = 'pop';
  const btns = {};
  const card = t => { const a = el('a', 'mcard'); a.href = diliaUrl(t); const i = el('span', 'mi'); i.innerHTML = diliaIcon(t.icon); const w = el('span', 'mt'); w.append(el('b', '', t.name), el('small', '', t.desc)); a.append(i, w); return a; };

  function show(id, keepTab) {
    cur = id; if (!keepTab) tab = 'pop'; const L = DILIA_LINES.find(x => x.id === id);
    Object.entries(btns).forEach(([k, b]) => b.setAttribute('aria-pressed', k === id ? 'true' : 'false'));
    body.textContent = '';
    const top = el('div', 'mtop'), tt = el('div'); tt.append(el('h3', '', L.title), el('p', '', L.blurb)); top.append(tt);
    if (L.soon) top.append(el('span', 'mbadge', 'Coming soon'));
    else { const a = el('a', 'mopen', 'Open ' + L.title + ' →'); a.href = DROOT + L.href; top.append(a); }
    body.append(top);
    if (L.soon) {
      const w = el('div', 'msoon'); w.append(el('p', '', 'This line is being built. It will have its own page and tools, free and private like the rest.'));
      if (L.soonItems) { const r = el('div', 'msoonlist'); L.soonItems.forEach(n => r.append(el('span', '', n))); w.append(r); }
      body.append(w); return;
    }
    const tabs = el('div', 'mtabs'); tabs.setAttribute('role', 'tablist');
    const defs = [['pop', 'Popular']]; if (recent.some(i => lineOf[i] === id)) defs.push(['rec', 'Recent']);
    L.cats.forEach(c => defs.push([c[0], c[0]]));
    if (!defs.some(d => d[0] === tab)) tab = 'pop';
    defs.forEach(([k, label]) => { const b = el('button', 'mtab', label); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', k === tab ? 'true' : 'false'); b.addEventListener('click', () => { tab = k; show(id, true); }); tabs.append(b); });
    body.append(tabs);
    let ids = [], vars = [];
    if (tab === 'pop') ids = POP[id] || [];
    else if (tab === 'rec') ids = recent.filter(i => lineOf[i] === id);
    else { const c = L.cats.find(c => c[0] === tab); ids = c[1]; vars = c[2] || []; }
    const grid = el('div', 'mgrid'); ids.forEach(i => { if (byId[i]) grid.append(card(byId[i])); }); body.append(grid);
    if (vars.length) { const v = el('div', 'mvars'); v.append(el('b', '', 'Also')); vars.forEach(i => { const t = byId[i]; if (!t) return; const a = el('a', '', t.name); a.href = diliaUrl(t); v.append(a); }); body.append(v); }
    if (tab === 'pop') { const m = el('a', 'mmore', 'Browse all ' + L.title + ' tools →'); m.href = DROOT + L.href; body.append(m); }
    if (L.soonItems) { const w = el('div', 'msoonlist'); w.append(el('b', '', 'Coming soon')); L.soonItems.forEach(n => w.append(el('span', '', n))); body.append(w); }
  }

  const all = Object.values(byId).filter(t => t.ready);
  function search() {
    const v = q.value.trim().toLowerCase(); cols.hidden = !!v; results.hidden = !v; results.textContent = '';
    if (!v) return;
    const words = v.split(/\s+/); const hit = all.filter(t => { const s = (t.name + ' ' + t.desc + ' ' + t.slug.replace(/-/g, ' ')).toLowerCase(); return words.every(w => s.includes(w)); })
      .sort((a, b) => (b.name.toLowerCase().startsWith(v) ? 1 : 0) - (a.name.toLowerCase().startsWith(v) ? 1 : 0)).slice(0, 18);
    if (!hit.length) { results.append(el('p', 'mnone', 'Nothing matches "' + q.value.trim() + '". Try a shorter word, like merge, resize or QR.')); return; }
    const g = el('div', 'mgrid'); hit.forEach(t => g.append(card(t))); results.append(g);
  }
  q.addEventListener('input', search);
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = results.querySelector('a'); if (a) location.href = a.href; } });

  DILIA_LINES.forEach(L => {
    const b = el('button', 'mline'); b.type = 'button';
    const n = el('span', 'mn'); n.append(el('b', '', 'Dilia ' + L.name), el('small', '', L.kind)); b.append(n);
    if (L.soon) b.append(el('em', '', 'Soon')); else { const c = (L.cats || []).reduce((s, c) => s + c.slice(1).reduce((n, a) => n + a.length, 0), 0); b.append(el('em', 'mc', String(c))); }
    b.addEventListener('click', () => show(L.id));
    b.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches && cur !== L.id) show(L.id); });
    btns[L.id] = b; rail.append(b);
  });
  const allA = el('a', 'mall', 'See every tool →'); allA.href = DROOT + 'tools.html'; rail.append(allA);

  const set = on => { panel.hidden = !on; btn.setAttribute('aria-expanded', on ? 'true' : 'false'); head.classList.toggle('menu-open', on); if (on) { q.value = ''; search(); show(cur); if (matchMedia('(hover:hover)').matches) q.focus(); } };
  btn.addEventListener('click', () => set(panel.hidden));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); } });
  document.addEventListener('click', e => { if (!panel.hidden && !e.composedPath().includes(panel) && !e.composedPath().includes(btn)) set(false); });
  addEventListener('hashchange', () => set(false));
})();
