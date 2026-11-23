// Secret Santa draw on one device. Names are saved in this browser; the draw itself is kept in memory only and is gone when you leave.
{
  const R = PartyRng, $ = id => document.getElementById(id), KEY = 'dilia-santa-v1', MAXN = 50, MAXLEN = 30;
  const msg = $('msg');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 4000); };
  const rd = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const lines = t => String(t).split(/\r?\n/).map(s => Array.from(s.trim().replace(/\s+/g, ' ')).slice(0, MAXLEN).join('')).filter(Boolean);
  let giver = [], gift = [], pos = 0;

  function draw() {
    const names = lines($('sn').value);
    if (names.length < 3) { say('Add at least 3 names.'); return; }
    if (names.length > MAXN) { say('Up to ' + MAXN + ' names.'); return; }
    const low = names.map(x => x.toLowerCase());
    if (new Set(low).size !== low.length) { say('Two names are the same. Add a last initial to tell them apart.', 5000); return; }
    const ban = new Set(), bad = [];
    for (const l of String($('sx').value).split(/\r?\n/).map(x => x.trim()).filter(Boolean).slice(0, 200)) {
      const parts = l.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (parts.length !== 2 || !low.includes(parts[0]) || !low.includes(parts[1]) || parts[0] === parts[1]) { bad.push(l); continue; }
      ban.add(parts[0] + '|' + parts[1]); ban.add(parts[1] + '|' + parts[0]);
    }
    if (bad.length) { say('Cannot read this "do not pair" line: ' + bad[0] + '. Use two names from the list, like: Ana, Ben', 6000); return; }
    let found = null;
    for (let k = 0; k < 5000 && !found; k++) {
      const p = R.shuffle(names);
      if (p.every((g, i) => g !== names[i] && !ban.has(low[i] + '|' + g.toLowerCase()))) found = p;
    }
    if (!found) { say('No draw is possible with these rules. Remove a "do not pair" line and try again.', 6000); return; }
    giver = names; gift = found; pos = 0; wr({ names: $('sn').value.slice(0, 3000), ex: $('sx').value.slice(0, 1500) });
    $('ssetup').hidden = true; $('sflow').hidden = false; $('sfull').hidden = true; step(false);
  }
  function step(shown) {
    const box = $('sstage'); box.textContent = '';
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    if (pos >= giver.length) {
      box.append(el('p', 'eyeb', 'All done'), el('div', 't', 'Everyone has their person'), el('p', null, 'Close this page when you are finished. The draw is not saved anywhere.'));
      $('sfullbtn').hidden = false; $('snext').hidden = true; return;
    }
    $('sfullbtn').hidden = true; $('snext').hidden = false;
    if (!shown) {
      box.append(el('p', 'eyeb', 'Person ' + (pos + 1) + ' of ' + giver.length), el('div', 't', giver[pos]), el('p', null, 'Pass the device to ' + giver[pos] + '. Nobody else should look.'));
      $('snext').textContent = 'I am ' + giver[pos]; $('snext').dataset.a = 'show';
    } else {
      box.append(el('p', 'eyeb', giver[pos] + ', you give a gift to'), el('div', 't', gift[pos]), el('p', null, 'Remember it, then hide the screen.'));
      $('snext').textContent = 'Hide and pass on'; $('snext').dataset.a = 'hide';
    }
  }
  $('go').addEventListener('click', draw);
  $('snext').addEventListener('click', () => { if ($('snext').dataset.a === 'show') step(true); else { pos++; step(false); } });
  $('sfullbtn').addEventListener('click', () => {
    const ul = $('sfulllist'); ul.textContent = ''; giver.forEach((g, i) => { const li = document.createElement('li'); li.textContent = g + ' → ' + gift[i]; ul.append(li); }); $('sfull').hidden = false;
  });
  $('sagain').addEventListener('click', () => { giver = []; gift = []; pos = 0; $('sflow').hidden = true; $('ssetup').hidden = false; $('sstage').textContent = ''; $('sfull').hidden = true; });
  $('sfullcopy').addEventListener('click', () => {
    const t = giver.map((g, i) => g + ' → ' + gift[i]).join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => say('Copied.'), () => say('Could not copy.'));
  });
  const o = rd(); $('sn').value = typeof o.names === 'string' ? o.names : ''; $('sx').value = typeof o.ex === 'string' ? o.ex : '';
  window.DiliaSanta = { state: () => ({ giver: giver.slice(), gift: gift.slice(), pos }), draw };
}
