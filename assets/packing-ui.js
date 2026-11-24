// Packing list page. Lists are saved in this browser (dilia-packing-v1); the Trip booklet can print one.
{
  const K = LifeKit, P = DiliaPack, $ = id => document.getElementById(id), esc = K.esc, KEY = 'dilia-packing-v1';
  let S = { lists: [], cur: '', next: 1 };
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && Array.isArray(v.lists)) { S.lists = v.lists.filter(l => l && typeof l.name === 'string' && Array.isArray(l.items)).slice(0, 30).map(l => ({ id: String(l.id), name: l.name.slice(0, 50), items: l.items.filter(i => i && typeof i.t === 'string').slice(0, 400).map(i => ({ id: String(i.id), t: i.t.slice(0, 80), c: P.CATS.includes(i.c) ? i.c : 'Extras', done: !!i.done })) })); S.cur = String(v.cur || ''); S.next = Math.max(+v.next || 1, ...S.lists.map(l => +l.id + 1 || 1), 1); } } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); $('pkmsg').textContent = ''; } catch (e) { $('pkmsg').textContent = 'Could not save in this browser (storage is blocked).'; } };
  const cur = () => S.lists.find(l => l.id === S.cur);
  const iid = () => 'i' + (S.next++);
  function paint() {
    const l = cur(); $('pklist').innerHTML = S.lists.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join(''); if (l) $('pklist').value = l.id;
    $('pkwork').hidden = !l; $('pkempty').hidden = !!l; if (!l) return;
    if (document.activeElement !== $('pkname')) $('pkname').value = l.name;
    const v = $('pkview'); v.textContent = ''; let done = 0;
    P.CATS.forEach(c => {
      const its = l.items.filter(i => i.c === c); if (!its.length) return; const s = document.createElement('section'); s.className = 'lglass pkcat'; s.innerHTML = `<h3>${esc(c)} <small>${its.filter(i => i.done).length}/${its.length}</small></h3><ul>${its.map(i => `<li class="${i.done ? 'dn' : ''}"><label><input type="checkbox" data-id="${esc(i.id)}" ${i.done ? 'checked' : ''}><span>${esc(i.t)}</span></label><button type="button" class="tlx" data-del="${esc(i.id)}" aria-label="Remove ${esc(i.t)}">×</button></li>`).join('')}</ul>`; v.append(s);
    });
    done = l.items.filter(i => i.done).length; const n = l.items.length, pc = n ? Math.round(done / n * 100) : 0;
    $('pkprog').textContent = n ? `${done} of ${n} packed (${pc}%)` : 'This list is empty. Add suggested items or type your own.'; $('pkbar').style.width = pc + '%'; $('pkbar').parentNode.setAttribute('aria-valuenow', pc);
    ['pkreset', 'pkcopy', 'pkprint'].forEach(id => { $(id).disabled = !n; });
  }
  function newList(name, items) { const l = { id: 'l' + (S.next++), name: name.slice(0, 50), items: items || [] }; S.lists.push(l); S.cur = l.id; save(); paint(); return l; }
  $('pknew').addEventListener('click', () => newList('My packing list ' + (S.lists.length + 1)));
  $('pkfirst').addEventListener('click', () => { newList('My packing list 1'); });
  $('pklist').addEventListener('change', e => { S.cur = e.target.value; save(); paint(); });
  $('pkname').addEventListener('input', e => { const l = cur(); if (l) { l.name = e.target.value.slice(0, 50) || 'Untitled'; save(); $('pklist').querySelector(`option[value="${l.id}"]`).textContent = l.name; } });
  let armed = 0; $('pkdel').addEventListener('click', e => { if (!cur()) return; if (!armed) { armed = setTimeout(() => { armed = 0; e.target.textContent = 'Delete list'; }, 4000); e.target.textContent = 'Click again to delete'; return; } clearTimeout(armed); armed = 0; e.target.textContent = 'Delete list'; S.lists = S.lists.filter(x => x !== cur()); S.cur = S.lists.length ? S.lists[0].id : ''; save(); paint(); });
  $('pkgen').addEventListener('click', () => {
    const l = cur(); if (!l) return; const days = Math.floor(+$('pkdays').value); if (!(days >= 1 && days <= 60)) { $('pkmsg').textContent = 'Days must be between 1 and 60.'; return; }
    const types = [...document.querySelectorAll('[data-ty]:checked')].map(x => x.dataset.ty), have = new Set(l.items.map(i => i.c + '|' + i.t.toLowerCase())); let added = 0;
    P.build({ days, types }).forEach(x => { if (l.items.length < 400 && !have.has(x.c + '|' + x.t.toLowerCase())) { l.items.push({ id: iid(), t: x.t, c: x.c, done: false }); added++; } });
    save(); paint(); $('pkmsg').textContent = added ? `Added ${added} items.` : 'Nothing new to add. Your list already has these.';
  });
  const addItem = () => { const l = cur(), t = $('pkitem').value.trim().slice(0, 80); if (!l) return; if (!t) { $('pkmsg').textContent = 'Type an item first.'; return; } if (l.items.length >= 400) { $('pkmsg').textContent = 'Up to 400 items per list.'; return; } l.items.push({ id: iid(), t, c: $('pkcat').value, done: false }); $('pkitem').value = ''; save(); paint(); $('pkitem').focus(); };
  $('pkadd').addEventListener('click', addItem); $('pkitem').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } });
  $('pkview').addEventListener('change', e => { const l = cur(), i = l && l.items.find(x => x.id === e.target.dataset.id); if (i) { i.done = e.target.checked; save(); paint(); } });
  $('pkview').addEventListener('click', e => { const b = e.target.closest('[data-del]'), l = cur(); if (!b || !l) return; l.items = l.items.filter(x => x.id !== b.dataset.del); save(); paint(); });
  $('pkreset').addEventListener('click', () => { const l = cur(); if (l) { l.items.forEach(i => { i.done = false; }); save(); paint(); } });
  $('pkcopy').addEventListener('click', async () => { const l = cur(); if (!l) return; const t = l.name + '\n' + P.CATS.map(c => { const a = l.items.filter(i => i.c === c); return a.length ? '\n' + c + '\n' + a.map(i => (i.done ? '[x] ' : '[ ] ') + i.t).join('\n') : ''; }).join(''); try { await navigator.clipboard.writeText(t); $('pkmsg').textContent = 'Copied.'; } catch (e) { $('pkmsg').textContent = 'Copy is blocked here. Use Print instead.'; } });
  $('pkprint').addEventListener('click', () => window.print());
  $('pkcat').innerHTML = P.CATS.map(c => `<option>${esc(c)}</option>`).join(''); $('pkcat').value = 'Extras';
  $('pktypes').innerHTML = Object.entries(P.TYPES).map(([k, n]) => `<label class="lchip"><input type="checkbox" data-ty="${k}"> ${esc(n)}</label>`).join('');
  if (!cur()) S.cur = S.lists.length ? S.lists[0].id : ''; paint();
}
