// Copies the static site into desktop/site so the app runs fully offline from its own files.
// Skips repo-only folders and docs. Run from desktop/: node copy-site.js
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '..'), DST = path.join(__dirname, 'site');
const SKIP = new Set(['.git', '.github', '.well-known', 'desktop', 'dev', 'blog', 'node_modules', '_headers', 'HANDOVER.md', 'README.md', 'SECURITY.md', '.nojekyll', 'CNAME', 'robots.txt', 'sitemap.xml']);
fs.rmSync(DST, { recursive: true, force: true });
// PDF-only app: the PDF tools (every folder with "pdf" in its name), the privacy page, and only the shared files those pages use.
const LIVE = 'https://dilshanchamika9-netizen.github.io/Dilia-Studio';
const isPdf = n => /pdf/i.test(n) || n === 'privacy';
const TEXT = /\.(html|js|css|json|webmanifest|svg)$/i;
let n = 0;
function copyFile(r) { fs.mkdirSync(path.dirname(path.join(DST, r)), { recursive: true }); fs.copyFileSync(path.join(SRC, r), path.join(DST, r)); n++; }
function walk(rel, each) {
  for (const e of fs.readdirSync(path.join(SRC, rel), { withFileTypes: true })) {
    if (e.name.startsWith('_g_') || e.name.startsWith('.')) continue;   // no dotfiles
    const r = path.join(rel, e.name);
    if (e.isDirectory()) walk(r, each); else if (e.isFile()) each(r);
  }
}
for (const e of fs.readdirSync(SRC, { withFileTypes: true })) if (e.isDirectory() && !SKIP.has(e.name) && isPdf(e.name)) walk(e.name, copyFile);
// shared assets: keep a file only if some kept page/script/style mentions its file name (folders: "<folder>/" or "vendor/<folder>")
const assets = []; walk('assets', r => assets.push(r.split(path.sep).join('/')));
const keep = new Set(), queue = [];
const take = r => { if (!keep.has(r)) { keep.add(r); queue.push(r); } };
const bundledText = [];
(function seed(rel) { for (const e of fs.readdirSync(path.join(DST, rel), { withFileTypes: true })) { const r = path.join(rel, e.name); if (e.isDirectory()) seed(r); else if (TEXT.test(e.name)) bundledText.push(fs.readFileSync(path.join(DST, r), 'utf8')); } })('.');
const mentions = (txt, a) => txt.includes(path.posix.basename(a)) || (a.includes('/vendor/') && txt.includes(a.split('/vendor/')[1].split('/').slice(0, 1)[0] + '/')) ;
const scan = txt => { for (const a of assets) if (!keep.has(a) && (path.posix.basename(a).length > 3 && txt.includes(path.posix.basename(a)) || /^assets\/(fonts|app)\//.test(a) && txt.includes('assets/' + a.split('/')[1] + '/') || /^assets\/vendor\//.test(a) && txt.includes(a.split('/').slice(0, 3).join('/').replace('assets/', '')) )) take(a); };
bundledText.forEach(scan);
while (queue.length) { const a = queue.shift(); if (TEXT.test(a)) scan(fs.readFileSync(path.join(SRC, a), 'utf8')); }
for (const a of keep) copyFile(a);
// links to pages that are not in the app (home, Life, Play, News, blog...) open the live website in the browser
const missing = [];
(function fix(rel) {
  for (const e of fs.readdirSync(path.join(DST, rel), { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) { fix(r); continue; }
    if (!/\.html$/i.test(e.name)) continue;
    let html = fs.readFileSync(path.join(DST, r), 'utf8');
    html = html.replace(/(<a\b[^>]*?\shref=")([^"#]*)("[^>]*>)/gi, (m, a, h, b) => {
      if (!h || /^[a-z][a-z0-9+.-]*:/i.test(h) || h.startsWith('//')) return m;
      const q = h.split('?')[0]; let t = path.posix.normalize(path.posix.join(path.posix.dirname(r.split(path.sep).join('/')), q));
      const isDir = q.endsWith('/') || !path.posix.extname(t);
      const file = isDir ? path.posix.join(t, 'index.html') : t;
      if (fs.existsSync(path.join(DST, file))) return m;
      return a + LIVE + '/' + (t === '.' ? '' : t.replace(/^\.\//, '') + (isDir && !t.endsWith('/') ? '/' : '')) + b;
    });
    fs.writeFileSync(path.join(DST, r), html);
    for (const x of html.matchAll(/\s(?:src|href)="([^"#?]+)"/gi)) {
      const h = x[1]; if (/^[a-z][a-z0-9+.-]*:/i.test(h) || h.startsWith('//')) continue;
      const t = path.posix.normalize(path.posix.join(path.posix.dirname(r.split(path.sep).join('/')), h)); const f = h.endsWith('/') ? path.posix.join(t, 'index.html') : t;
      if (!fs.existsSync(path.join(DST, f))) missing.push(r + ' -> ' + h);
    }
  }
})('.');
if (missing.length) { console.error('MISSING FILES referenced by bundled pages:\n' + missing.slice(0, 30).join('\n')); process.exit(1); }
// security headers: the same policy the website uses (_headers, block "/*"), minus HSTS (not HTTP)
const H = {};
for (const l of fs.readFileSync(path.join(SRC, '_headers'), 'utf8').split(/\r?\n/)) {   // Windows checkouts use CRLF
  const m = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(l);
  if (m && m[1] !== 'Strict-Transport-Security') H[m[1]] = m[2].trim();
}
for (const k of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) if (!H[k] || /[\r\n]/.test(H[k])) throw new Error('security header missing or broken: ' + k);
fs.writeFileSync(path.join(DST, 'headers.json'), JSON.stringify(H, null, 1));
console.log('site copied:', n, 'files');
