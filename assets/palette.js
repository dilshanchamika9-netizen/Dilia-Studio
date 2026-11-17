// Dilia search: one engine for the hero search bar and the Ctrl/Cmd+K palette on every page.
// Text from tool data is inserted with textContent only.
(() => {
  const KEYS = {
    merge: 'join combine together', split: 'cut separate divide', compress: 'smaller reduce shrink size email', delete: 'remove pages',
    extract: 'pull pages out', rotate: 'turn flip sideways', edit: 'change words text', add: 'insert place image', forms: 'fill form',
    sign: 'signature esign', pdf2img: 'jpg png picture image convert', img2pdf: 'photo jpg png picture scan convert', scan: 'camera phone document',
    ocr: 'searchable scanned text recognise', protect: 'password lock encrypt', unlock: 'remove password open', redact: 'black out hide secret',
    watermark: 'stamp draft confidential', number: 'page numbers', crop: 'trim margins', word: 'docx office convert', text: 'pdf to text txt'
  };
  const isDeep = location.pathname.split('/').filter(Boolean).length > 1;
  const all = () => (window.DILIA_TOOLS || []).flatMap(([g, list]) => list.map(t => ({ ...t, group: g, line: 'Dilia Studio', hay: (t.name + ' ' + t.desc + ' ' + g + ' ' + (KEYS[t.id] || '')).toLowerCase() })));
  const score = (t, q) => {
    const w = q.toLowerCase().split(/\s+/).filter(Boolean); if (!w.length) return 1;
    let s = 0; const n = t.name.toLowerCase();
    for (const x of w) { if (!t.hay.includes(x)) return 0; s += n.startsWith(x) ? 6 : n.includes(x) ? 4 : 1; }
    return s + (t.ready ? 0.5 : 0);
  };
  const POP = ['merge', 'compress', 'edit', 'sign', 'split', 'pdf2img', 'img2pdf', 'ocr'];
  const search = q => {
    const a = all();
    if (!q.trim()) return POP.map(id => a.find(t => t.id === id)).filter(Boolean);
    return a.map(t => [score(t, q), t]).filter(x => x[0] > 0).sort((x, y) => y[0] - x[0]).map(x => x[1]).slice(0, 8);
  };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  // Fills `list` with results for `q`; returns controller { move, open, count }.
  function mount(input, list, limit) {
    let items = [], sel = 0;
    const paint = () => {
      list.textContent = '';
      items.forEach((t, i) => {
        const a = el(t.ready ? 'a' : 'div', 'pr' + (i === sel ? ' on' : '') + (t.ready ? '' : ' soon'));
        if (t.ready) a.href = t.id + '.html';
        a.setAttribute('role', 'option'); a.id = 'pr-' + i; a.setAttribute('aria-selected', i === sel ? 'true' : 'false');
        const ic = el('span', 'pi'); ic.innerHTML = window.diliaIcon ? diliaIcon(t.icon) : '';
        const tx = el('span', 'pt'); tx.append(el('b', '', t.name), el('small', '', t.desc));
        a.append(ic, tx, el('span', 'pl', t.ready ? t.line : t.line + ' · Coming soon'));
        a.addEventListener('mousemove', () => { if (sel !== i) { sel = i; mark(); } });
        list.append(a);
      });
      if (!items.length) list.append(el('p', 'pnone', 'No tool matches that. Try a word like merge, compress or sign.'));
      input.setAttribute('aria-activedescendant', items.length ? 'pr-' + sel : '');
    };
    const mark = () => { list.querySelectorAll('.pr').forEach((a, i) => { a.classList.toggle('on', i === sel); a.setAttribute('aria-selected', i === sel ? 'true' : 'false'); }); input.setAttribute('aria-activedescendant', 'pr-' + sel); const o = list.querySelector('.pr.on'); if (o) o.scrollIntoView({ block: 'nearest' }); };
    const run = () => { items = search(input.value); if (limit && !input.value.trim()) items = items.slice(0, limit); sel = 0; paint(); };
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-controls', list.id); input.setAttribute('autocomplete', 'off'); list.setAttribute('role', 'listbox');
    input.addEventListener('input', run);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { sel = (sel + 1) % items.length; mark(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { sel = (sel - 1 + items.length) % items.length; mark(); } }
      else if (e.key === 'Enter') { const t = items[sel]; if (t && t.ready) location.href = t.id + '.html'; }
    });
    run();
    return { run };
  }

  // Overlay palette
  let box = null, prev = null;
  function build() {
    box = el('div', 'pal'); box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Search tools');
    const panel = el('div', 'pal-panel');
    const top = el('div', 'pal-top');
    const input = el('input'); input.type = 'text'; input.placeholder = 'Search tools'; input.setAttribute('aria-label', 'Search tools'); input.spellcheck = false;
    const esc = el('kbd', '', 'esc');
    top.append(input, esc);
    const list = el('div', 'pal-list'); list.id = 'pal-list';
    const foot = el('div', 'pal-foot'); foot.append(el('span', '', '↑↓ move'), el('span', '', '↵ open'), el('span', '', 'Your files never leave this device'));
    panel.append(top, list, foot); box.append(panel); document.body.append(box);
    box._c = mount(input, list); box._in = input;
    box.addEventListener('mousedown', e => { if (e.target === box) close(); });
    box.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === 'Tab') e.preventDefault(); });
  }
  function open() { if (!box) build(); prev = document.activeElement; box.hidden = false; document.documentElement.style.overflow = 'hidden'; box._in.value = ''; box._c.run(); box._in.focus(); }
  function close() { if (!box) return; box.hidden = true; document.documentElement.style.overflow = ''; if (prev && prev.focus) prev.focus(); }
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); box && !box.hidden ? close() : open(); }
    else if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable && !(box && !box.hidden)) { e.preventDefault(); open(); }
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-palette]')) { e.preventDefault(); open(); } });
  window.DiliaSearch = { mount, search, open, close, all };
})();
