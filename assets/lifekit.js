// Shared bits for Life pages: country names, holiday data loading, weekend defaults, countdown boxes, escaping.
window.LifeKit = (() => {
  const SRC = new URL('../assets/holidays/', document.baseURI), cache = {};
  let idx = null;
  const WK = { SA: [5, 6], KW: [5, 6], BH: [5, 6], QA: [5, 6], OM: [5, 6], EG: [5, 6], JO: [5, 6], IQ: [5, 6], IL: [5, 6], DZ: [5, 6], BD: [5, 6], YE: [5, 6], LY: [5, 6], SY: [5, 6], SD: [5, 6], MV: [5, 6], BN: [5, 0], IR: [5], AF: [4, 5] };
  const wkOf = c => (WK[c] || [6, 0]).slice();
  const DN = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
  const cname = c => { try { return (DN && DN.of(c)) || c; } catch (e) { return c; } };
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function index() { if (!idx) { const r = await fetch(new URL('index.json', SRC)); if (!r.ok) throw new Error('Holiday data could not be loaded.'); idx = await r.json(); } return idx; }
  async function country(cc) { if (!cache[cc]) { const r = await fetch(new URL(cc + '.json', SRC)); if (!r.ok) throw new Error('Holiday data could not be loaded.'); cache[cc] = await r.json(); } return cache[cc]; }
  function guess(list, def) { try { const rg = (new Intl.DateTimeFormat().resolvedOptions().locale.split('-')[1] || '').toUpperCase(); if (list.includes(rg)) return rg; } catch (e) {} return def; }
  function fillCountries(sel, list, none) { sel.innerHTML = (none ? '<option value="">None</option>' : '') + list.map(c => [c, cname(c)]).sort((a, b) => a[1].localeCompare(b[1])).map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join(''); }
  function cdBoxes(s) { s = Math.max(0, s); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60); return [[d, d === 1 ? 'day' : 'days'], [h, 'hours'], [m, 'min'], [x, 'sec']].map(([v, l]) => `<div><b>${String(v).padStart(2, '0')}</b><small>${l}</small></div>`).join(''); }
  // live countdown into el until local midnight starting the given date; returns a stop function
  function countdown(el, y, m, d) { const target = new Date(y, m, d).getTime(); const tick = () => { el.innerHTML = cdBoxes((target - Date.now()) / 1000); }; tick(); const t = setInterval(tick, 1000); return () => clearInterval(t); }
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  return { SRC, WK, wkOf, cname, esc, index, country, guess, fillCountries, cdBoxes, countdown, download };
})();
