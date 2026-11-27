"""One check per defect in Director Review 02 §1 (D1-D18), so none of them comes back. D9 has its own test (test-filenames.py).
Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-defects.py"""
import json, pathlib, re, sys
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]; B = 'http://127.0.0.1:8766/'
fails, n = [], 0
def ok(c, m):
    global n; n += 1
    if not c: fails.append(m)
R = lambda p: (ROOT / p).read_text()

# ---------- static ----------
life = R('life/index.html')
ok('Being built' not in life and 'lroad' not in life, 'D14: Life hub shows a public roadmap')
ok(not re.search(r'<meta name="description" content="[^"]*(coming|soon)', life, re.I), 'D14: Life meta description promises future features')
stubs = [p.name for p in ROOT.glob('*.html') if 'http-equiv="refresh"' in p.read_text()]
red = R('_redirects')
ok(len(stubs) >= 50 and all(f'/{s} ' in red for s in stubs), f'D15: _redirects misses stubs {[s for s in stubs if f"/{s} " not in red][:5]}')
ok(all(re.search(r' /[a-z0-9-]+/ 301$', l) for l in red.splitlines() if l and not l.startswith('#')), 'D15: every 301 target is a folder address')
ok(re.search(r'<span class="l">Pulse</span>', R('news/index.html')) is not None, 'D6: Pulse lockup does not say Pulse')
ok(re.search(r'<span class="l">Guides</span>', R('blog/index.html')) is not None, 'D6: Guides lockup does not say Guides')
ok(re.search(r'<h1[ >]', R('news/index.html')) is not None, 'D7: Pulse hub has no h1')
# D13: every story has its own picture (scene drawings are not shared)
seen = {}
for f in sorted((ROOT / 'news').glob('*/index.html')):
    m = re.search(r'<svg class="pgfx".*?</svg>', f.read_text(), re.S)
    if not m: continue
    key = re.sub(r'\b(id|aria-label)="[^"]*"|url\(#[^)]*\)', '', m.group(0))
    ok(key not in seen, f'D13: {f.parent.name} reuses the picture of {seen.get(key)}'); seen.setdefault(key, f.parent.name)
# D16: SEO base layer on every indexable page; sitemaps list exactly those pages; robots.txt points to the index
idx = []
for f in sorted(ROOT.rglob('*.html')):
    rel = f.relative_to(ROOT)
    if rel.parts[0] in {'dev', 'desktop', 'node_modules', '.git'} or 'vendor' in rel.parts or rel.name == '404.html': continue
    s = f.read_text()
    if 'http-equiv="refresh"' in s or 'name="robots" content="noindex' in s: continue
    idx.append(rel)
    t = re.search(r'<title>(.*?)</title>', s, re.S).group(1); d = re.search(r'<meta name="description" content="([^"]*)"', s).group(1)
    import html as _h
    ok(len(_h.unescape(t)) <= 60 and len(_h.unescape(d)) <= 155, f'D16: {rel}: title {len(t)} / description {len(d)} too long')
    for tag in ('rel="canonical"', 'property="og:title"', 'property="og:image"', 'name="twitter:card"'): ok(tag in s, f'D16: {rel}: missing {tag}')
    ld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
    try: g = [x['@type'] for x in json.loads(ld[0])['@graph']] if len(ld) == 1 else []
    except Exception: g = []
    ok('BreadcrumbList' in g, f'D16: {rel}: JSON-LD missing or without BreadcrumbList')
titles = [re.search(r'<title>(.*?)</title>', (ROOT / r).read_text(), re.S).group(1) for r in idx]
ok(len(set(titles)) == len(titles), 'D16: duplicate page titles')
locs = set()
for sm in ROOT.glob('sitemap-*.xml'): locs |= set(re.findall(r'<loc>([^<]+)</loc>', sm.read_text()))
ok(len(locs) == len(idx), f'D16: sitemaps list {len(locs)} pages, site has {len(idx)} indexable pages')
ok('Sitemap: ' in R('robots.txt') and 'sitemap.xml' in R('robots.txt'), 'D16: robots.txt has no sitemap line')
ok(R('index.html').count('"@type":"WebSite"') == 1 and '"SearchAction"' in R('index.html'), 'D16: Home JSON-LD lacks WebSite + SearchAction')

# ---------- browser ----------
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = br.new_context(viewport={'width': 1440, 'height': 900}, locale='en-US', timezone_id='Europe/London', reduced_motion='reduce'); pg = ctx.new_page()
    pg.goto(B, wait_until='load'); pg.wait_for_timeout(600)
    vis = pg.evaluate("[...document.querySelectorAll('input[type=text],input[type=search]')].filter(i=>i.offsetParent).length")
    ok(vis == 1, f'D1: Home shows {vis} search boxes')
    ok(pg.evaluate("(()=>{const b=document.querySelector('header .sbtn');return b.classList.contains('only') && b.querySelector('.sl').offsetWidth===0})()"), 'D1: Home header search is not icon-only')
    ok(pg.inner_text('h1').startswith('Get it done.'), 'D2: Home headline is not the §5.1 one')
    ok(pg.locator('.planet').count() == 0 and 'Point at a planet' not in pg.content(), 'D3: planets still on Home')
    ok(pg.locator('.ob-demo').is_visible(), 'D2: live demo missing at 1440')
    dt = pg.inner_text('#t-date'); ok('AH' not in dt and 'Jumada' not in dt and 'Day ' not in dt, f'D5: date line for an en-US visitor: {dt}')
    pg.wait_for_function("document.getElementById('t-cc').options.length > 200", timeout=5000)
    ok(pg.input_value('#t-cc') == 'GB', f'D4: country from the visitor time zone should be GB, got {pg.input_value("#t-cc")}')
    ok('United Kingdom' in pg.inner_text('#t-sub'), f'D4: holiday card not for the visitor country: {pg.inner_text("#t-sub")}')
    pg.select_option('#t-cc', 'BR'); pg.wait_for_timeout(500)
    ok('Brazil' in pg.inner_text('#t-sub'), 'D4: changing the country does not change the card')
    pg.reload(); pg.wait_for_function("document.getElementById('t-cc').value === 'BR'", timeout=5000)
    ok('Brazil' in pg.inner_text('#t-sub'), 'D4: country choice not remembered')
    # D17 lockup: line name 45-50% of the wordmark, baseline-aligned (desktop), stacked under it below 600 px
    pg.goto(B + 'merge-pdf/', wait_until='load')
    r = pg.evaluate("(()=>{const w=document.querySelector('header .wm .w'),l=document.querySelector('header .wm .l');const fw=parseFloat(getComputedStyle(w).fontSize),fl=parseFloat(getComputedStyle(l).fontSize);return [fl/fw, getComputedStyle(l).fontWeight]})()")
    ok(0.44 <= r[0] <= 0.51 and int(r[1]) >= 600, f'D17: line name ratio {r[0]:.2f} weight {r[1]}')
    # D8 Merge empty state, D10 disabled button contrast and reason
    ok(pg.inner_text('#sSize').strip() == '—', f'D8: Merge empty size shows {pg.inner_text("#sSize")}')
    ok(pg.input_value('#outName') == '', 'D9: Merge name box has a default name before any file')
    c = pg.evaluate("""(()=>{const L=s=>{const m=s.match(/\\d+(\\.\\d+)?/g).map(Number).slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*m[0]+.7152*m[1]+.0722*m[2]};
        const b=document.getElementById('go'),cs=getComputedStyle(b),fg=L(cs.color),bg=L(cs.backgroundColor);return [b.disabled,(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),cs.opacity]})()""")
    ok(c[0] and c[1] >= 4.5 and c[2] == '1', f'D10: disabled button contrast {c[1]:.2f} opacity {c[2]}')
    ok(pg.locator('#hint, .hint, .side p').filter(has_text='to start').count() >= 1, 'D10: no reason next to the disabled button')
    # D11, D12 Play
    pg.goto(B + 'play/', wait_until='load'); pg.wait_for_timeout(400)
    tops = pg.evaluate("[...document.querySelectorAll('.dailies.rail > .daily')].map(e=>Math.round(e.getBoundingClientRect().top))")
    ok(len(tops) == 5 and len(set(tops)) == 1, f'D11: Today cards not in one row: {tops}')
    ok(pg.evaluate("[...document.querySelectorAll('#s-sudoku .chip')].map(e=>e.getBoundingClientRect().top).every((t,i,a)=>Math.abs(t-a[0])<2)"), 'D11: sudoku chips stacked')
    arts = pg.evaluate("[...document.querySelectorAll('.daily .art')].map(a=>{const s=getComputedStyle(a);return [a.getBoundingClientRect().width,s.backgroundColor]})")
    ok(len(arts) > 40 and len({a[0] for a in arts}) == 1 and all(a[1] not in ('rgba(0, 0, 0, 0)', 'transparent') for a in arts), 'D12: game pictures not in one frame system')
    # D18 404
    r = pg.goto(B + 'Dilia-Studio/this/does/not/exist/', wait_until='load'); pg.wait_for_timeout(300)
    ok(r.status == 404 and 'This page moved or never existed.' in pg.inner_text('h1'), 'D18: no custom 404 page')
    ok(pg.evaluate("document.activeElement.id") == 'q' and pg.locator('.nfpop a').count() == 6, 'D18: 404 search not focused or popular tools missing')
    pg.keyboard.type('compress'); pg.wait_for_timeout(300)
    ok('Compress' in pg.inner_text('#plist'), 'D18: 404 search does not find tools')
    # 390: D17 stacked lockup, D1 no clutter
    m = br.new_page(viewport={'width': 390, 'height': 844}); m.goto(B + 'merge-pdf/', wait_until='load')
    ok(m.evaluate("(()=>{const w=document.querySelector('header .wm .w').getBoundingClientRect(),l=document.querySelector('header .wm .l').getBoundingClientRect();return l.top>=w.bottom-2&&l.width>0})()"), 'D17: line name not stacked under the wordmark at 390 px')
    m.goto(B, wait_until='load')
    ok(m.evaluate("document.documentElement.scrollWidth") <= 390, 'Home 390: sideways scroll')
    br.close()
print(n, 'checks,', len(fails), 'failed')
for f in fails: print('  FAIL', f)
sys.exit(1 if fails else 0)
