"""Uptime and integrity check of the live site. Run by .github/workflows/uptime.yml every 30 minutes (on GitHub, not here).
Checks: key pages answer 200 with the right text; key files served are byte-identical to the repo (catches a stuck deploy,
a hijacked host or a defaced page); no page refers to scripts on other sites. Prints a report; exit 1 = problem."""
import hashlib, os, pathlib, re, subprocess, sys, time, urllib.request
ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = os.environ.get('DILIA_SITE', 'https://dilshanchamika9-netizen.github.io/Dilia-Studio/')
PAGES = {'': 'Dilia', 'tools.html': 'Dilia', 'pdf-reader/': 'Dilia PDF', 'merge-pdf/': 'Merge', 'loan-calculator/': 'Loan calculator',
         'public-holidays/': 'Public holidays', 'qr-code-generator/': 'QR', 'blog/': 'How-to guides'}
SAME = ['index.html', 'tools.html', 'assets/guard.js', 'assets/guard-worker.js', 'assets/reader.js', 'assets/calcmath.js',
        'assets/vendor/pdf-lib.min.js', 'assets/holidays/AE.json', 'pdf-reader/sw.js', '_headers']
def get(path, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(SITE + path + ('?nocache=%d' % time.time() if path.endswith(('.js', '.json', '.html', '/')) or path == '' else ''), headers={'User-Agent': 'Dilia-uptime-check', 'Cache-Control': 'no-cache'})
            with urllib.request.urlopen(req, timeout=15) as r: return r.status, r.read()
        except urllib.error.HTTPError as e: last = (e.code, b'')
        except Exception as e: last = (0, str(e).encode())
        time.sleep(5 * (i + 1)) if i < tries - 1 else None
    return last
problems, notes = [], []
for p, word in PAGES.items():
    st, body = get(p)
    if st != 200:
        problems.append('DOWN %s -> %s %s' % (p or '/', st, body[:80].decode('utf-8', 'replace') if st == 0 else ''))
        if p == '': break                                  # whole site down: no point checking the rest
        continue
    t = body.decode('utf-8', 'replace')
    if word not in t: problems.append('WRONG CONTENT %s (expected "%s")' % (p or '/', word))
    ext = [s for s in re.findall(r'<script[^>]+src="([^"]+)"', t) if s.startswith(('http:', 'https:', '//'))]
    if ext: problems.append('OUTSIDE SCRIPT on %s: %s' % (p or '/', ext[:3]))
age = time.time() - int(subprocess.run(['git', '-C', str(ROOT), 'log', '-1', '--format=%ct'], capture_output=True, text=True).stdout.strip() or 0)
if problems and problems[0].startswith('DOWN /'): notes.append('Home page down, other checks skipped.')
elif age < 20 * 60: notes.append('Last change is %d min old, deploy may still be running: file comparison skipped.' % (age // 60))
else:
    for f in SAME:
        if f == '_headers': continue                      # GitHub Pages does not serve _headers; compared after the Cloudflare move
        st, body = get(f)
        mine = (ROOT / f).read_bytes()
        if st != 200: problems.append('MISSING FILE %s -> %s' % (f, st))
        elif hashlib.sha256(body).digest() != hashlib.sha256(mine).digest(): problems.append('FILE DIFFERS FROM REPO %s (served %d bytes, repo %d)' % (f, len(body), len(mine)))
print('Site:', SITE); print('Checked %d pages and %d files.' % (len(PAGES), len(SAME) - 1))
for n in notes: print('NOTE', n)
for x in problems: print('PROBLEM', x)
print('RESULT', 'PROBLEM' if problems else 'OK')
sys.exit(1 if problems else 0)
