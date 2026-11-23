// Random name picker and team maker: type names, pick winners or split into fair teams. Names stay in this browser.
{
  const R = PartyRng, $ = id => document.getElementById(id), root = $('party'), mode = root.dataset.pm;
  const KEY = 'dilia-names-v1', MAXN = 200, MAXLEN = 40;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const msg = $('msg'), ta = $('pnames');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 3500); };
  let names = [], used = new Set(), result = [], timer = 0;

  function parse(text) {
    const out = []; let cut = false, over = false;
    for (const raw of String(text).split(/\r?\n/)) {
      const s = raw.trim().replace(/\s+/g, ' '); if (!s) continue;
      if (out.length >= MAXN) { over = true; continue; }
      const ch = Array.from(s); if (ch.length > MAXLEN) { cut = true; out.push(ch.slice(0, MAXLEN).join('')); } else out.push(s);
    }
    return { list: out, cut, over };
  }
  const intIn = (el, lo, hi, def) => { const v = Number(el.value); return el.value.trim() !== '' && Number.isInteger(v) ? Math.max(lo, Math.min(hi, v)) : def; };
  function sync() {
    $('pcount').textContent = names.length + (names.length === 1 ? ' name' : ' names');
    if (mode === 'pick') $('pleft').textContent = $('pnorep').checked ? (names.length - used.size) + ' left to pick' : '';
  }
  function show(items, title) {
    const box = $('rlist'); box.textContent = '';
    $('rtitle').textContent = title;
    items.forEach((t, i) => { const d = document.createElement('div'); d.className = 'pt-chip' + (i === 0 && items.length === 1 ? ' big' : ''); d.textContent = t; box.append(d); });
    $('done').classList.add('on');
  }
  function pick() {
    if (names.length < 1) { say('Add at least one name first.'); return; }
    const norep = $('pnorep').checked, pool = [];
    names.forEach((_, i) => { if (!norep || !used.has(i)) pool.push(i); });
    if (!pool.length) { say('Everyone has been picked. Press "Start over".', 5000); return; }
    const want = intIn($('pnum'), 1, 50, 1), k = Math.min(want, pool.length);
    if (k < want) say('Only ' + k + ' left, so ' + k + ' picked.', 4000);
    const chosen = R.sample(pool, k); if (norep) chosen.forEach(i => used.add(i));
    result = chosen.map(i => names[i]); sync();
    const title = k === 1 ? 'The pick' : k + ' picked';
    clearTimeout(timer);
    if (reduce()) { show(result, title); return; }
    let n = 0; const tick = () => { if (n++ < 9) { show([names[R.int(names.length)]], 'Picking…'); timer = setTimeout(tick, 70); } else show(result, title); }; tick();
  }
  function make() {
    if (names.length < 2) { say('Add at least 2 names to make teams.'); return; }
    const byTeams = document.querySelector('input[name=tmode]:checked').value === 'teams';
    const num = intIn($('tnum'), 1, 100, 0); if (!num) { say('Enter a whole number.'); return; }
    let count = byTeams ? num : Math.ceil(names.length / num), note = '';
    if (count > names.length) { count = names.length; note = 'Only ' + names.length + ' people, so ' + count + ' teams.'; }
    if (count < 2) { say('That makes only one team. Use a smaller number.'); return; }
    result = R.teams(names, count); const box = $('tteams'); box.textContent = '';
    result.forEach((tm, i) => {
      const d = document.createElement('div'); d.className = 'pt-team'; const h = document.createElement('b'); h.textContent = 'Team ' + (i + 1);
      const s = document.createElement('span'); s.textContent = tm.length + (tm.length === 1 ? ' person' : ' people'); const ul = document.createElement('ul');
      tm.forEach(x => { const li = document.createElement('li'); li.textContent = x; ul.append(li); }); d.append(h, s, ul); box.append(d);
    });
    $('done').classList.add('on'); $('copy').disabled = false; say(note || count + ' teams made.', 4000);
  }
  const copyText = () => mode === 'teams' ? result.map((t, i) => 'Team ' + (i + 1) + ': ' + t.join(', ')).join('\n') : result.join('\n');
  $('copy').addEventListener('click', () => {
    if (!result.length) { say('Nothing to copy yet.'); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(copyText()) : Promise.reject()).then(() => say('Copied.'), () => say('Could not copy. Select the text and copy it.', 4000));
  });
  ta.addEventListener('input', () => {
    const p = parse(ta.value); names = p.list; used = new Set(); result = []; $('done').classList.remove('on');
    say(p.over ? 'Only the first ' + MAXN + ' names are used.' : p.cut ? 'Names longer than ' + MAXLEN + ' characters are shortened.' : '');
    const o = rd(); o.text = names.join('\n'); wr(o); sync();
  });
  $('pshuffle').addEventListener('click', () => { names = R.shuffle(names); ta.value = names.join('\n'); used = new Set(); const o = rd(); o.text = names.join('\n'); wr(o); sync(); });
  if (mode === 'pick') {
    $('go').addEventListener('click', pick);
    $('pnorep').addEventListener('change', sync);
    $('preset').addEventListener('click', () => { used = new Set(); result = []; $('done').classList.remove('on'); sync(); say('Started over.'); });
  } else {
    $('go').addEventListener('click', make); $('copy').disabled = true;
    document.querySelectorAll('input[name=tmode]').forEach(r => r.addEventListener('change', () => { $('tlabel').textContent = r.value === 'teams' && r.checked ? 'How many teams' : r.checked ? 'People in each team' : $('tlabel').textContent; }));
  }
  const o = rd(); let text = typeof o.text === 'string' ? o.text : '';
  if (!parse(text).list.length) text = 'Amira\nBen\nChen\nDiego\nElena\nFarid\nGita\nHassan';
  names = parse(text).list; ta.value = names.join('\n'); sync();
  window.DiliaPicker = { state: () => ({ mode, names: names.slice(), used: used.size, result: JSON.parse(JSON.stringify(result)) }), pick, make };
}
