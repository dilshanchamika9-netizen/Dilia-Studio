// News hub: fills the two lists from data/news.json (made by dev/news-fetch.py on GitHub Actions). Text only, no HTML from the data is ever inserted.
(() => {
  const $ = id => document.getElementById(id);
  const ago = (ms, now) => { const m = Math.max(0, Math.round((now - ms) / 60000)); if (m < 60) return (m || 1) + ' min ago'; const h = Math.round(m / 60); if (h < 48) return h + ' h ago'; return Math.round(h / 24) + ' days ago'; };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const link = (href, txt, cls) => { const a = el('a', cls, txt); if (/^https?:\/\//.test(href)) { a.href = href; a.rel = 'noopener noreferrer nofollow'; a.target = '_blank'; } return a; };
  const FD = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  function show(d) {
    const now = Date.now(), up = Date.parse(d.updated);
    $('nstamp').textContent = isNaN(up) ? 'The first headlines will appear after the next update.' : 'Updated ' + ago(up, now) + '. The list refreshes every few hours.';
    const hn = $('nhn'); hn.textContent = '';
    (Array.isArray(d.hn) ? d.hn : []).slice(0, 40).forEach(x => {
      const li = el('li'); li.append(link(x.url, String(x.title), 'nt')); const m = el('div', 'nm');
      m.append(el('span', '', String(x.domain)), el('span', '', x.score + ' points'), el('span', '', ago((+x.time || 0) * 1000, now)));
      m.append(link('https://news.ycombinator.com/item?id=' + encodeURIComponent(String(x.id)), x.comments + ' comments')); li.append(m); hn.append(li);
    });
    if (!hn.children.length) hn.append(el('li', 'nnote', 'No headlines right now. Please check back soon.'));
    const sec = $('nsec'); sec.textContent = '';
    (Array.isArray(d.sec) ? d.sec : []).slice(0, 30).forEach(x => {
      const li = el('li'); const t = el('div', 'nt'); t.append(el('span', 'nco', String(x.company)), document.createTextNode(' · ' + x.kind + (x.about && x.about.length ? ' about ' + x.about.join(', ') : ''))); li.append(t);
      const m = el('div', 'nm'); const dd = new Date(x.date + 'T00:00:00Z'); m.append(el('span', '', isNaN(dd) ? '' : FD.format(dd)), el('span', '', 'Form ' + x.form), link(x.url, 'Read the filing at the SEC')); li.append(m); sec.append(li);
    });
    if (!sec.children.length) sec.append(el('li', 'nnote', 'No recent filings to show yet.'));
  }
  fetch('../data/news.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw 0; return r.json(); }).then(show).catch(() => { $('nstamp').textContent = 'The latest headlines could not be loaded. Please try again later.'; $('nhn').textContent = ''; $('nsec').textContent = ''; });
})();
