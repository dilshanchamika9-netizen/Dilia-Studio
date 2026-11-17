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
