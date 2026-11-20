// Copies the static site into desktop/site so the app runs fully offline from its own files.
// Skips repo-only folders and docs. Run from desktop/: node copy-site.js
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '..'), DST = path.join(__dirname, 'site');
const SKIP = new Set(['.git', '.github', '.well-known', 'desktop', 'dev', 'blog', 'node_modules', '_headers', 'HANDOVER.md', 'README.md', 'SECURITY.md', '.nojekyll', 'CNAME', 'robots.txt', 'sitemap.xml']);
fs.rmSync(DST, { recursive: true, force: true });
let n = 0;
(function walk(rel) {
  for (const e of fs.readdirSync(path.join(SRC, rel), { withFileTypes: true })) {
    if (!rel && SKIP.has(e.name)) continue;
    if (e.name.startsWith('_g_')) continue;
    const r = path.join(rel, e.name);
    if (e.isDirectory()) { fs.mkdirSync(path.join(DST, r), { recursive: true }); walk(r); }
    else if (e.isFile()) { fs.copyFileSync(path.join(SRC, r), path.join(DST, r)); n++; }
  }
})('');
// security headers: the same policy the website uses (_headers, block "/*"), minus HSTS (not HTTP)
const H = {};
for (const l of fs.readFileSync(path.join(SRC, '_headers'), 'utf8').split('\n')) {
  const m = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(l);
  if (m && m[1] !== 'Strict-Transport-Security') H[m[1]] = m[2].trim();
}
fs.writeFileSync(path.join(DST, 'headers.json'), JSON.stringify(H, null, 1));
console.log('site copied:', n, 'files');
