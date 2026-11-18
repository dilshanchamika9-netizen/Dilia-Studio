// Mega-menu: product lines on the left, the chosen line's tools (in groups) on the right. Built from DILIA_LINES; text via textContent.
(() => {
  const btn = document.querySelector('[data-menu]'), head = document.querySelector('header.nav');
  if (!btn || !head || !window.DILIA_LINES) return;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const byId = {}; DILIA_TOOLS.forEach(([g, l]) => l.forEach(t => { byId[t.id] = t; }));
  const panel = el('div', 'mega'); panel.id = 'mega'; panel.hidden = true; panel.setAttribute('aria-label', 'All tools');
  const inner = el('div', 'mega-in'), rail = el('div', 'mrail'), body = el('div', 'mbody');
  inner.append(rail, body); panel.append(inner); head.append(panel);

  const here = (location.pathname.match(/\/([^/]+)\/?(?:index\.html)?$/) || [])[1] || '';
  const slugLine = {}; DILIA_LINES.forEach(L => (L.cats || []).forEach(c => c.slice(1).forEach(ids => ids.forEach(id => { if (byId[id]) slugLine[byId[id].slug] = L.id; }))));
  let cur = slugLine[here] || (DILIA_LINES.find(L => L.href && L.href.replace('/', '') === here) || {}).id || 'studio';
  const btns = {};

  function show(id) {
    cur = id; const L = DILIA_LINES.find(x => x.id === id);
    Object.entries(btns).forEach(([k, b]) => b.setAttribute('aria-pressed', k === id ? 'true' : 'false'));
    body.textContent = '';
    const top = el('div', 'mtop'), tt = el('div'); tt.append(el('h3', '', L.title), el('p', '', L.blurb)); top.append(tt);
    if (L.soon) top.append(el('span', 'mbadge', 'Coming soon'));
    else { const a = el('a', 'mopen', 'Open ' + L.title + ' →'); a.href = DROOT + L.href; top.append(a); }
    body.append(top);
    if (L.soon) {
      if (L.soonItems) { const w = el('div', 'msoonlist'); L.soonItems.forEach(n => w.append(el('span', '', n))); body.append(w); }
      return;
    }
    const grid = el('div', 'mcats');
    L.cats.forEach(([name, ids]) => {
      const c = el('div', 'mcat'); c.append(el('h4', '', name));
      ids.forEach(i => { const t = byId[i]; if (!t) return; const a = el('a', '', t.name); a.href = diliaUrl(t); c.append(a); });
      grid.append(c);
    });
    body.append(grid);
    if (L.soonItems) { const w = el('div', 'msoonlist'); w.append(el('b', '', 'Coming soon')); L.soonItems.forEach(n => w.append(el('span', '', n))); body.append(w); }
  }
  DILIA_LINES.forEach(L => {
    const b = el('button', 'mline'); b.type = 'button';
    const n = el('span', 'mn'); n.append(el('b', '', 'Dilia ' + L.name), el('small', '', L.kind)); b.append(n);
    if (L.soon) b.append(el('em', '', 'Soon'));
    b.addEventListener('click', () => show(L.id));
    b.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) show(L.id); });
    btns[L.id] = b; rail.append(b);
  });
  const all = el('a', 'mall', 'See all tools →'); all.href = DROOT + 'tools.html'; rail.append(all);

  const set = on => { panel.hidden = !on; btn.setAttribute('aria-expanded', on ? 'true' : 'false'); head.classList.toggle('menu-open', on); if (on) show(cur); };
  btn.addEventListener('click', () => set(panel.hidden));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); } });
  document.addEventListener('click', e => { if (!panel.hidden && !e.target.closest('.mega') && !e.target.closest('[data-menu]')) set(false); });
  addEventListener('hashchange', () => set(false));
})();
