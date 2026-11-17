// Mega-menu: every ready tool, grouped, plus the lines that are coming. Built from DILIA_TOOLS; text via textContent.
(() => {
  const btn = document.querySelector('[data-menu]'), head = document.querySelector('header.nav');
  if (!btn || !head || !window.DILIA_TOOLS) return;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const panel = el('div', 'mega'); panel.id = 'mega'; panel.hidden = true; panel.setAttribute('aria-label', 'All tools');
  const inner = el('div', 'mega-in');
  DILIA_TOOLS.forEach(([g, list]) => {
    const rd = list.filter(t => t.ready && !t.v), col = el('div', 'mcol' + (rd.length > 12 ? ' wide' : '')); col.append(el('h3', '', g));
    const ul = el('div', 'mlist'); col.append(ul);
    rd.forEach(t => { const a = el('a', '', t.name); a.href = diliaUrl(t); ul.append(a); });
    inner.append(col);
  });
  const more = el('div', 'mcol mmore'); more.append(el('h3', '', 'More lines'));
  ['Dilia Pixel', 'Dilia QR', 'Dilia Text'].forEach(n => { const s = el('span', 'msoon'); s.append(n + ' ', el('em', '', 'Coming soon')); more.append(s); });
  const all = el('a', 'mall', 'See all tools →'); all.href = DROOT + 'tools.html'; more.append(all);
  inner.append(more); panel.append(inner); head.append(panel);
  const set = on => { panel.hidden = !on; btn.setAttribute('aria-expanded', on ? 'true' : 'false'); head.classList.toggle('menu-open', on); };
  btn.addEventListener('click', () => set(panel.hidden));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); } });
  document.addEventListener('click', e => { if (!panel.hidden && !e.target.closest('.mega') && !e.target.closest('[data-menu]')) set(false); });
  addEventListener('hashchange', () => set(false));
})();
