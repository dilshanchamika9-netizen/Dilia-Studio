// Dilia Pulse front page: section tabs filter the story grid (Top stories shows everything). The section can come from the address, e.g. news/#ai.
(() => {
  const tabs = [...document.querySelectorAll('.psec .ptab[data-sec]')]; if (!tabs.length) return;
  const grid = document.getElementById('pgrid'), head = document.getElementById('pgh'), empty = document.getElementById('pempty');
  const hide = [...document.querySelectorAll('.phero')];
  const ok = new Set(tabs.map(t => t.dataset.sec));
  const show = (sec, push) => {
    if (!ok.has(sec)) sec = 'all';
    tabs.forEach(t => t.setAttribute('aria-pressed', t.dataset.sec === sec ? 'true' : 'false'));
    let n = 0;
    grid.querySelectorAll('.pcd').forEach(c => { const on = sec === 'all' ? !c.classList.contains('ptop') : c.dataset.sec === sec; c.hidden = !on; if (on) n++; });
    hide.forEach(h => { h.hidden = sec !== 'all'; });
    head.textContent = sec === 'all' ? 'Latest' : tabs.find(t => t.dataset.sec === sec).textContent;
    empty.hidden = n > 0;
    if (push) { try { history.replaceState(null, '', sec === 'all' ? location.pathname : '#' + sec); } catch (e) { /* file:// or blocked */ } }
  };
  tabs.forEach(t => t.addEventListener('click', () => { show(t.dataset.sec, true); if (t.dataset.sec !== 'all') head.scrollIntoView({ block: 'start', behavior: 'smooth' }); }));
  const fromHash = () => show(decodeURIComponent(location.hash.slice(1)).toLowerCase(), false);
  addEventListener('hashchange', fromHash); fromHash();
})();
