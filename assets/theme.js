// Light is the default. A saved choice ("dark") is applied before the page paints; the toggle is added to the header on every page.
(() => {
  const root = document.documentElement;
  try { if (localStorage.getItem('dilia-theme') === 'dark') root.dataset.theme = 'dark'; } catch (e) { /* storage blocked: stay light */ }
  const paint = b => { const d = root.dataset.theme === 'dark'; b.setAttribute('aria-pressed', d ? 'true' : 'false'); b.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); b.title = d ? 'Light mode' : 'Dark mode'; };
  const build = () => {
    const wrap = document.querySelector('header.nav .wrap'); if (!wrap || wrap.querySelector('.themebtn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'themebtn';
    b.innerHTML = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
    b.addEventListener('click', () => {
      const d = root.dataset.theme !== 'dark';
      if (d) root.dataset.theme = 'dark'; else delete root.dataset.theme;
      try { localStorage.setItem('dilia-theme', d ? 'dark' : 'light'); } catch (e) { /* private mode */ }
      document.querySelectorAll('.themebtn').forEach(paint);
      document.querySelector('meta[name=theme-color]') && document.querySelector('meta[name=theme-color]').setAttribute('content', d ? '#060914' : '#ffffff');
    });
    paint(b); wrap.append(b);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  addEventListener('storage', e => { if (e.key === 'dilia-theme') { if (e.newValue === 'dark') root.dataset.theme = 'dark'; else delete root.dataset.theme; document.querySelectorAll('.themebtn').forEach(paint); } });
})();
