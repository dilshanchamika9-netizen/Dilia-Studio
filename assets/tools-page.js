// Tools library page: grouped tiles and search.
{
inkFlow(document.getElementById('ink'), { start: 19 });
  const lib = document.getElementById('lib'), q = document.getElementById('q');
  lib.innerHTML = DILIA_TOOLS.map(([g, list]) => `
    <section class="grp"><h2>${g}</h2>
      <div class="tiles">${list.map(t => {
        const tag = t.ready ? '' : 'Coming soon';
        const inner = `<span class="ic">${diliaIcon(t.icon)}</span><b>${t.name}</b><span>${t.desc}</span>${tag ? `<em>${tag}</em>` : ''}`;
        return t.ready
          ? `<a class="tile ready" id="${t.id}" href="${t.id}.html" data-s="${(t.name + ' ' + t.desc).toLowerCase()}">${inner}</a>`
          : `<div class="tile soon${t.server ? ' srv' : ''}" id="${t.id}" data-s="${(t.name + ' ' + t.desc).toLowerCase()}" aria-disabled="true">${inner}</div>`;
      }).join('')}</div>
    </section>`).join('') + '<p class="none" id="none">No tool matches that search.</p>';
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase(); let any = 0;
    lib.querySelectorAll('.grp').forEach(g => {
      let n = 0;
      g.querySelectorAll('.tile').forEach(t => { const on = !v || t.dataset.s.includes(v); t.hidden = !on; n += on; });
      g.hidden = !n; any += n;
    });
    document.getElementById('none').style.display = any ? 'none' : 'block';
  });
}
