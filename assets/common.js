{
  const nav = document.querySelector('.nav');
  if (nav) {
    const set = () => nav.classList.toggle('solid', scrollY > 8 || nav.dataset.solid === '1');
    set(); addEventListener('scroll', set, { passive: true });
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.rise').forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('pre'); io.observe(el); } });
  }
  document.querySelectorAll('[data-year]').forEach(e => e.textContent = new Date().getFullYear());
}

// File hand-off between pages. The hub stores a dropped file in this browser's own IndexedDB; the tool page
// takes it out once, within two minutes, and gives it to the normal file picker. Nothing leaves the device.
window.DiliaHandoff = (() => {
  const open = () => new Promise((res, rej) => { const r = indexedDB.open('dilia-handoff', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('f', mode), s = t.objectStore('f'); const q = fn(s); t.oncomplete = () => { db.close(); res(q && q.result); }; t.onerror = () => { db.close(); rej(t.error); }; }); };
  return {
    put: files => tx('readwrite', s => { s.clear(); s.put({ at: Date.now(), files: [...files] }, 'job'); }),
    take: async () => { let job; try { job = await tx('readonly', s => s.get('job')); await tx('readwrite', s => s.clear()); } catch (e) { return null; } return job && Date.now() - job.at < 120000 ? job.files : null; }
  };
})();
document.querySelectorAll('[data-mod]').forEach(e => { e.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'; });
addEventListener('DOMContentLoaded', async () => {
  const pick = document.getElementById('pick');
  if (!pick || !window.indexedDB) return;
  const files = await DiliaHandoff.take();
  if (!files || !files.length) return;
  try { const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); pick.files = dt.files; pick.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { /* the person can add the file by hand */ }
});
