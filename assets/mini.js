// Small helpers shared by the arcade and puzzle pages.
window.Mini = (() => {
  const P = DiliaPlay, $ = id => document.getElementById(id);
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const rnd = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; };
  const fmt = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function say(t, ms) { const m = $('msg'); m.textContent = t; clearTimeout(say.t); if (t && ms !== 0) say.t = setTimeout(() => { if (m.textContent === t) m.textContent = ''; }, ms || 2600); }
  // best values per key, e.g. best('slide4', 31, false) keeps the lowest. returns {best, isNew}
  function best(slug, key, val, higher) { const o = rd('dilia-' + slug + '-best', {}), old = o[key]; const isNew = old == null || (higher ? val > old : val < old); if (isNew) { o[key] = val; wr('dilia-' + slug + '-best', o); } return { best: isNew ? val : old, isNew }; }
  const getBest = (slug, key) => rd('dilia-' + slug + '-best', {})[key];
  // result panel and share buttons. data: {title, line, big, lines}. returns show(head, bigText, line)
  function panel(slug, title, again) {
    let data = null, id = 0;
    const share = () => Object.assign({ title, file: 'dilia-' + slug + '-' + id }, data);
    $('share').addEventListener('click', () => P.share(share(), say)); $('saveimg').addEventListener('click', () => P.saveImage(share()));
    $('dagain').addEventListener('click', () => { $('done').classList.remove('on'); again(); });
    return { show(head, big, line, d) { data = d; id = Date.now(); $('deyebrow').textContent = head; $('dtime').textContent = big; $('dline').textContent = line; $('done').classList.add('on'); P.prepare(share()); }, hide() { $('done').classList.remove('on'); } };
  }
  return { $, rd, wr, rnd, fmt, say, best, getBest, panel, P };
})();
