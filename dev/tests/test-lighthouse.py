"""Lighthouse gate (DR-02 §11.1, §16): every key template must score SEO 100 and accessibility >= 95 (mobile, Lighthouse defaults).
Performance, LCP, CLS and script size are measured and written to the report, not yet enforced: the budgets in §16 become
blocking when the new design system lands (Phase 3+). The local test server sends files uncompressed, so real numbers on the
live site are better. Lighthouse is NOT shipped with the site: the gate installs it (npm, pinned) into AXE_DIR.
Run: AXE_DIR=/tmp/qa python3 dev/tests/test-lighthouse.py   (needs dev/tests/serve.py running)"""
import json, os, pathlib, subprocess, sys, tempfile
sys.path.insert(0, str(pathlib.Path(__file__).parent)); from templates import TEMPLATES
LH = pathlib.Path(os.environ.get('AXE_DIR', '/tmp/qa')) / 'node_modules/.bin/lighthouse'
env = dict(os.environ, CHROME_PATH='/usr/bin/google-chrome')
fails, rows = [], []
for path in TEMPLATES:
    if 'no-such-page' in path: continue          # the 404 page is noindex with status 404 on purpose
    out = pathlib.Path(tempfile.mkstemp(suffix='.json')[1])
    r = subprocess.run([str(LH), 'http://127.0.0.1:8766/' + path, '--only-categories=seo,accessibility,performance,best-practices', '--output=json',
                        f'--output-path={out}', '--quiet', '--chrome-flags=--headless=new --no-sandbox'], env=env, capture_output=True, text=True, timeout=180)
    try: d = json.loads(out.read_text())
    except Exception: fails.append(f'/{path}: Lighthouse did not run ({r.stderr.strip()[-200:]})'); continue
    c = {k: round((v['score'] or 0) * 100) for k, v in d['categories'].items()}; a = d['audits']
    lcp, cls = a['largest-contentful-paint'].get('numericValue', 0) / 1000, a['cumulative-layout-shift'].get('numericValue', 0)
    rows.append(f"/{path:40} SEO {c['seo']:3}  A11y {c['accessibility']:3}  BP {c['best-practices']:3}  Perf {c['performance']:3}  LCP {lcp:4.1f}s  CLS {cls:.3f}")
    if c['seo'] < 100: fails.append(f"/{path}: SEO {c['seo']} " + ', '.join(x['id'] for x in d['categories']['seo']['auditRefs'] if x['weight'] and (a[x['id']]['score'] or 0) < 1))
    if c['accessibility'] < 95: fails.append(f"/{path}: accessibility {c['accessibility']} " + ', '.join(x['id'] for x in d['categories']['accessibility']['auditRefs'] if x['weight'] and a[x['id']]['score'] is not None and a[x['id']]['score'] < 1))
    out.unlink()
print('\n'.join(rows))
print(len(rows), 'templates,', len(fails), 'failed')
for f in fails: print('  FAIL', f)
sys.exit(1 if fails else 0)
