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
    pg, e, r = go('date-difference-calculator'); setv(pg, 'd1', '2000-01-01'); setv(pg, 'd2', '2026-11-21'); t = out(pg)
    ok('9,821' in t and '26 years, 10 months, 20 days' in t, 'datediff: ' + t[:160]); setv(pg, 'd1', '2026-11-21'); setv(pg, 'd2', '2026-11-20'); ok('swapped' in out(pg) and '1 day' in out(pg), 'datediff swap')
    setv(pg, 'd1', ''); ok('Pick a valid date' in out(pg), 'datediff empty'); ok(not e and not r, 'dd console %s %s' % (e, r)); pg.close()
    pg, e, r = go('add-days-to-date'); setv(pg, 'd1', '2026-11-21'); setv(pg, 'nd', '100'); ok('Monday 1 March 2027' in out(pg), 'add 100: ' + out(pg)[:90])
    setv(pg, 'op', '-'); ok('Thursday 13 August 2026' in out(pg), 'sub 100: ' + out(pg)[:90]); setv(pg, 'nd', '1.5'); ok('whole numbers' in out(pg), 'add frac')
    setv(pg, 'd1', '2026-01-31'); setv(pg, 'op', '+'); setv(pg, 'nd', '0'); setv(pg, 'nm', '1'); ok('28 February 2026' in out(pg), 'add month clamp: ' + out(pg)[:80]); ok(not e and not r, 'add console %s %s' % (e, r)); pg.close()
    pg, e, r = go('age-calculator'); setv(pg, 'd1', '1990-05-15'); setv(pg, 'd2', '2026-11-21'); t = out(pg); ok('36 years, 6 months, 6 days' in t and '175 days' in t and 'Tuesday' in t, 'age: ' + t[:200])
    setv(pg, 'd1', '2030-01-01'); ok('after the date' in out(pg), 'age future'); ok(not e and not r, 'age console'); pg.close()
    pg, e, r = go('day-of-the-week-calculator'); setv(pg, 'd1', '2026-11-21'); t = out(pg); ok('Saturday' in t and 'Day 325 of 365' in t and 'Week 47' in t, 'weekday: ' + t[:120]); ok(not e and not r, 'wk console'); pg.close()
    pg, e, r = go('working-days-calculator'); setv(pg, 'd1', '2026-11-16'); setv(pg, 'd2', '2026-11-22'); setv(pg, 'cc', ''); t = out(pg); ok(t.startswith('5\nWorking days') and '2\nWeekend days' in t, 'work 5: ' + t[:100])
    setv(pg, 'wend', '56'); ok(out(pg).startswith('5\nWorking days'), 'work fri/sat')
    setv(pg, 'wend', '06'); setv(pg, 'd1', '2026-12-01'); setv(pg, 'd2', '2026-12-04'); setv(pg, 'cc', 'AE'); pg.wait_for_function("document.querySelector('#cOut').innerText.includes('Holidays skipped')"); t = out(pg)
    ok(t.startswith('2\nWorking days') and 'National Day' in t and 'holidays library' in t, 'work AE holidays: ' + t[:200])
    setv(pg, 'd2', '2040-01-01'); pg.wait_for_function("document.querySelector('#cOut').innerText.includes('does not cover')"); ok(True, 'work out of range'); ok(not e and not r, 'work console %s %s' % (e, r)); pg.close()
    pg, e, r = go('time-zone-converter'); setv(pg, 'when', '2026-11-21T12:00'); setv(pg, 'z0', 'Asia/Dubai'); setv(pg, 'z1', 'Asia/Colombo'); setv(pg, 'z2', 'Europe/London'); setv(pg, 'z3', 'America/New_York'); t = out(pg)
    ok('13:30' in t and '08:00' in t and '03:00' in t and 'UTC+5:30' in t and 'UTC-5' in t and 'Meeting planner' in t, 'tz: ' + t[:300]); ok(pg.locator('#cOut tbody tr').count() >= 24, 'tz planner rows')
    setv(pg, 'z0', 'America/New_York'); setv(pg, 'when', '2026-03-08T02:30'); ok('does not exist' in out(pg), 'tz nonexistent'); setv(pg, 'when', '2026-11-01T01:30'); ok('happens twice' in out(pg), 'tz ambiguous')
    ok(not e and not r, 'tz console/network %s %s' % (e, r)); pg.close()
    pg, e, r = go('uae-gratuity-calculator'); setv(pg, 'basic', '10000'); setv(pg, 'd1', '2019-01-01'); setv(pg, 'd2', '2025-12-31'); setv(pg, 'unp', '0'); t = out(pg).replace('\xa0', ' '); ok('AED 55,054.79' in t and '7 years' in t, 'grat: ' + t[:200])
    setv(pg, 'd2', '2019-12-30'); ok('Not yet' in out(pg), 'grat <1y'); setv(pg, 'd1', '1985-01-01'); setv(pg, 'd2', '2025-12-31'); t = out(pg).replace('\xa0', ' '); ok('Capped' in t and 'AED 240,000.00' in t, 'grat cap: ' + t[:200])
    setv(pg, 'basic', '-5'); ok('basic salary' in out(pg).lower() or 'Enter' in out(pg), 'grat neg'); ok(not e and not r, 'grat console %s %s' % (e, r)); pg.close()
    # hub + tools list
    pg = br.new_page(); pg.goto(B + '/calc/'); pg.wait_for_selector('#lib .tile, #lib a')
    h = pg.inner_text('#lib'); ok('Loan calculator' in h and 'VAT calculator' in h and 'Percentage calculator' in h and 'Compound' in h and 'Time zone converter' in h and 'Public holidays' in h and 'UAE gratuity' in h, 'calc hub lists tools')
    pg.goto(B + '/tools.html'); pg.wait_for_selector('#lib a'); h = pg.inner_text('#lib'); ok('Loan calculator' in h, 'tools.html lists calc'); ok('Coming soon' not in pg.inner_text('#more-lines') or 'Calc' not in pg.inner_text('#more-lines'), 'calc no longer soon')
    # mobile layout: no sideways scroll
    pg = br.new_page(viewport={'width': 360, 'height': 780}); pg.goto(B + '/loan-calculator/'); pg.wait_for_selector('#cOut table')
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'loan page no horizontal overflow at 360px')
    br.close()
print(n, 'checks,', len(fails), 'failed'); sys.exit(1 if fails else 0)
