// Scoreboard: teams or players, tap to add points, standings. Saved in this browser only.
{
  const $ = id => document.getElementById(id), KEY = 'dilia-score-v1', MAXP = 12, MAXS = 999999, MAXLEN = 24;
  const msg = $('msg');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 3000); };
  const clamp = v => Math.max(-MAXS, Math.min(MAXS, v));
  const rd = () => {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!o || !Array.isArray(o.p)) return null;
      const p = o.p.filter(x => x && typeof x.n === 'string' && Number.isInteger(x.s)).slice(0, MAXP).map(x => ({ n: Array.from(x.n).slice(0, MAXLEN).join(''), s: clamp(x.s) }));
      return p.length ? { p, step: [1, 2, 5, 10].includes(o.step) ? o.step : 1, sort: !!o.sort } : null;
    } catch (e) { return null; }
  };
  const fresh = () => ({ p: [{ n: 'Team 1', s: 0 }, { n: 'Team 2', s: 0 }], step: 1, sort: false });
  let m = rd() || fresh(), armed = 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} };
  function render() {
    const box = $('slist'); box.textContent = ''; const top = Math.max(...m.p.map(x => x.s));
    const order = m.p.map((x, i) => i); if (m.sort) order.sort((a, b) => m.p[b].s - m.p[a].s || a - b);
    order.forEach(i => {
      const x = m.p[i], row = document.createElement('div'); row.className = 'pt-srow' + (top > 0 && x.s === top ? ' lead' : '');
      const nm = document.createElement('input'); nm.className = 'pt-in nm'; nm.value = x.n; nm.maxLength = MAXLEN; nm.setAttribute('aria-label', 'Name of team ' + (i + 1));
      nm.addEventListener('input', () => { x.n = nm.value; save(); });
      const mi = document.createElement('button'); mi.type = 'button'; mi.className = 'pbtn'; mi.textContent = '−'; mi.setAttribute('aria-label', 'Take ' + m.step + ' from ' + (x.n || 'team ' + (i + 1)));
      const sc = document.createElement('b'); sc.className = 'sc'; sc.textContent = x.s; sc.setAttribute('aria-live', 'polite');
      const pl = document.createElement('button'); pl.type = 'button'; pl.className = 'pbtn go'; pl.textContent = '+'; pl.setAttribute('aria-label', 'Add ' + m.step + ' to ' + (x.n || 'team ' + (i + 1)));
      const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'pbtn'; rm.textContent = '×'; rm.setAttribute('aria-label', 'Remove ' + (x.n || 'team ' + (i + 1)));
      mi.addEventListener('click', () => { x.s = clamp(x.s - m.step); save(); render(); });
      pl.addEventListener('click', () => { x.s = clamp(x.s + m.step); save(); render(); });
      rm.addEventListener('click', () => { if (m.p.length <= 1) { say('Keep at least one team.'); return; } m.p.splice(i, 1); save(); render(); });
      row.append(nm, mi, sc, pl, rm); box.append(row);
    });
    document.querySelectorAll('[data-st]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.st) === m.step)));
    $('ssort').setAttribute('aria-pressed', String(m.sort)); $('sadd').disabled = m.p.length >= MAXP;
  }
  document.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => { m.step = Number(b.dataset.st); save(); render(); }));
  $('ssort').addEventListener('click', () => { m.sort = !m.sort; save(); render(); });
  $('sadd').addEventListener('click', () => { if (m.p.length >= MAXP) { say('Up to ' + MAXP + ' teams.'); return; } m.p.push({ n: 'Team ' + (m.p.length + 1), s: 0 }); save(); render(); });
  $('sreset').addEventListener('click', () => {
    if (!armed) { $('sreset').textContent = 'Press again to set all to 0'; armed = setTimeout(() => { armed = 0; $('sreset').textContent = 'Reset scores'; }, 4000); return; }
    clearTimeout(armed); armed = 0; $('sreset').textContent = 'Reset scores'; m.p.forEach(x => { x.s = 0; }); save(); render(); say('Scores reset.');
  });
  $('scopy').addEventListener('click', () => {
    const t = m.p.slice().sort((a, b) => b.s - a.s).map((x, i) => (i + 1) + '. ' + (x.n || 'Team') + ': ' + x.s).join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => say('Standings copied.'), () => say('Could not copy.', 4000));
  });
  render();
  window.DiliaScore = { state: () => JSON.parse(JSON.stringify(m)) };
}
