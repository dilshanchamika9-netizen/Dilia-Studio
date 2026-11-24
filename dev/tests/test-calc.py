# Dilia Calc pages: values, errors, CSV, hub, no console errors, no network requests. Run: python3 dev/tests/test-calc.py [base]
import sys, re
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765'
fails = []; n = 0
def ok(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    def page(slug):
        pg = br.new_page(); errs = []; reqs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('request', lambda r: reqs.append(r.url) if not r.url.startswith(B) and not r.url.startswith('data:') and not r.url.startswith('blob:') else None)
        pg.goto(B + '/' + slug + '/'); pg.wait_for_selector('#cIn input:not([type=hidden]), #cIn select'); return pg, errs, reqs
    def setv(pg, i, v): pg.fill('#' + i, v) if pg.evaluate("document.getElementById('%s').tagName" % i) == 'INPUT' else pg.select_option('#' + i, v)
    def out(pg): return pg.inner_text('#cOut')
    # percentage
    pg, e, r = page('percentage-calculator')
    ok('30' in out(pg) and '15% of 200' in out(pg), 'pct default: ' + out(pg))
    setv(pg, 'kind', 'chg'); setv(pg, 'a', '80'); setv(pg, 'b', '100'); ok('25%' in out(pg) and 'increase' in out(pg), 'pct change')
    ok(pg.inner_text('label[for=a]') == 'From (X)', 'pct label updates')
    setv(pg, 'b', '60'); ok('-25%' in out(pg) and 'decrease' in out(pg), 'pct neg')
    setv(pg, 'kind', 'is'); setv(pg, 'b', '0'); ok('cannot be 0' in out(pg), 'pct div0')
    setv(pg, 'b', 'abc'); ok('Enter a number' in out(pg), 'pct nan')
    setv(pg, 'kind', 'up'); setv(pg, 'a', '10'); setv(pg, 'b', '1,200.50'); ok('1,320.55' in out(pg), 'pct up with comma: ' + out(pg))
    ok(not e and not r, 'pct console/network %s %s' % (e, r)); pg.close()
    # vat
    pg, e, r = page('vat-calculator')
    t = out(pg); ok('1,050.00' in t and '50.00' in t and '1,000.00' in t, 'vat add: ' + t)
    setv(pg, 'vmode', 'remove'); setv(pg, 'amt', '105'); setv(pg, 'cur', ''); t = out(pg); ok('100.00' in t and '5.00' in t, 'vat remove: ' + t)
    setv(pg, 'rate', '-1'); ok('negative' in out(pg), 'vat neg')
    setv(pg, 'rate', '5'); setv(pg, 'amt', '<img src=x onerror=alert(1)>'); ok('Enter a number' in out(pg) and pg.locator('#cOut img').count() == 0, 'vat xss')
    ok(not e and not r, 'vat console/network %s %s' % (e, r)); pg.close()
    # loan
    pg, e, r = page('loan-calculator')
    t = out(pg); ok('599.55' in t and '115,838.45' in t, 'loan default: ' + t[:200])
    ok(pg.locator('#cOut tbody tr').count() == 360, 'loan 360 rows')
    with pg.expect_download() as d: pg.click('text=Download CSV')
    dl = d.value; ok(dl.suggested_filename == 'Dilia-loan-schedule.csv', 'csv name ' + dl.suggested_filename)
    txt = open(dl.path(), encoding='utf-8-sig').read().splitlines(); ok(len(txt) == 361 and txt[0].startswith('"Month"') and txt[-1].endswith('"0.00"'), 'csv content ' + txt[-1])
    setv(pg, 'unit', 'm'); setv(pg, 'term', '12'); setv(pg, 'rate', '0'); setv(pg, 'amt', '1200'); ok('100.00' in out(pg) and pg.locator('#cOut tbody tr').count() == 12, 'loan 0%')
    setv(pg, 'term', '0'); ok('whole number of months' in out(pg), 'loan term 0')
    setv(pg, 'cur', 'AED'); setv(pg, 'term', '12'); ok('AED' in out(pg), 'loan currency')
    ok(not e and not r, 'loan console/network %s %s' % (e, r)); pg.close()
    # compound
    pg, e, r = page('compound-interest-calculator')
    t = out(pg); ok('Final balance' in t and pg.locator('#cOut tbody tr').count() == 10, 'comp default: ' + t[:200])
    setv(pg, 'start', '1000'); setv(pg, 'monthly', '0'); setv(pg, 'rate', '5'); setv(pg, 'years', '10'); setv(pg, 'freq', '1'); ok('1,628.89' in out(pg), 'comp annual: ' + out(pg)[:120])
    setv(pg, 'start', '0'); ok('starting amount or a monthly' in out(pg), 'comp empty')
    setv(pg, 'start', '1000'); setv(pg, 'years', '101'); ok('at most 100' in out(pg), 'comp years cap')
    ok(not e and not r, 'comp console/network %s %s' % (e, r)); pg.close()
    # unit converters
    pg, e, r = page('unit-converter')
    t = out(pg); ok('All length units' in t and '1 millimetre' in t, 'unit default: ' + t[:120])
    setv(pg, 'ufrom', 'mi'); setv(pg, 'uto', 'km'); ok('1.609344' in out(pg), 'mi->km: ' + out(pg)[:80])
    pg.click('text=Swap units'); ok(pg.input_value('#ufrom') == 'km' and '0.6213711922' in out(pg), 'swap: ' + out(pg)[:80])
    setv(pg, 'cat', 'temperature'); setv(pg, 'ufrom', 'C'); setv(pg, 'uto', 'F'); setv(pg, 'uv', '100'); ok('212' in out(pg), 'temp C->F: ' + out(pg)[:80])
    setv(pg, 'uv', '-300'); ok('absolute zero' in out(pg), 'abs zero')
    setv(pg, 'cat', 'data'); setv(pg, 'ufrom', 'GiB'); setv(pg, 'uto', 'MiB'); setv(pg, 'uv', '1'); ok('1,024' in out(pg), 'GiB->MiB: ' + out(pg)[:80])
    setv(pg, 'uv', '1e500'); ok('Enter a number' in out(pg), 'unit huge')
    ok(not e and not r, 'unit console/network %s %s' % (e, r)); pg.close()
    for slug, fr, to, v, want in [('length-converter', 'ft', 'm', '10', '3.048'), ('weight-converter', 'lb', 'kg', '1', '0.45359237'), ('temperature-converter', 'F', 'C', '212', '100'), ('area-converter', 'ac', 'm2', '1', '4,046.856422'), ('volume-converter', 'gal', 'l', '1', '3.785411784'), ('speed-converter', 'mph', 'kmh', '60', '96.56064'), ('time-converter', 'd', 'h', '2', '48'), ('data-storage-converter', 'TB', 'GiB', '1', '931.3225746'), ('energy-converter', 'kWh', 'kJ', '1', '3,600'), ('pressure-converter', 'atm', 'psi', '1', '14.69594878')]:
        pg, e, r = page(slug); setv(pg, 'ufrom', fr); setv(pg, 'uto', to); setv(pg, 'uv', v)
        ok(want in out(pg) and pg.locator('#cIn select').count() == 2 and pg.locator('#cat').count() == 1, slug + ': ' + out(pg)[:70])
        ok(not e and not r, slug + ' console/network %s %s' % (e, r)); pg.close()
    # dates, time zones, holidays, gratuity
    def go(slug):
        return page(slug)
    # hub + tools list
    pg = br.new_page(); pg.goto(B + '/calc/'); pg.wait_for_selector('#lib .tile, #lib a')
    h = pg.inner_text('#lib'); ok('Loan calculator' in h and 'VAT calculator' in h and 'Percentage calculator' in h and 'Compound' in h and 'Time zone converter' in h and 'Public holidays' in h and 'UAE gratuity' in h, 'calc hub lists tools')
    pg.goto(B + '/tools.html'); pg.wait_for_selector('#lib a'); h = pg.inner_text('#lib'); ok('Loan calculator' in h, 'tools.html lists calc'); ok('Coming soon' not in pg.inner_text('#more-lines') or 'Calc' not in pg.inner_text('#more-lines'), 'calc no longer soon')
    # mobile layout: no sideways scroll
    pg = br.new_page(viewport={'width': 360, 'height': 780}); pg.goto(B + '/loan-calculator/'); pg.wait_for_selector('#cOut table')
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'loan page no horizontal overflow at 360px')
    br.close()
print(n, 'checks,', len(fails), 'failed'); sys.exit(1 if fails else 0)
