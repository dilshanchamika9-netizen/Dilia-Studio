"""Life pages in the future look, in a real browser under the real _headers (port 8766)."""
import asyncio, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
async def ctx_page(br, w, theme):
    ctx = await br.new_context(viewport={'width': w, 'height': 1000}, reduced_motion='reduce', accept_downloads=True, locale='en-AE'); errs = []
    await ctx.add_init_script(f"try{{if(!localStorage.getItem('dilia-theme'))localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith((B, 'data:', 'blob:')) else None)
    return ctx, pg, errs
async def holidays(br, w, theme):
    ctx, pg, errs = await ctx_page(br, w, theme); t = f'hol {w}'
    await pg.goto(B + 'public-holidays/#c=AE&y=2027'); await pg.wait_for_selector('#phsum b'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{t}] no sideways scroll')
    s = await pg.evaluate('DiliaHolidays.state()'); ok(s['cfg']['c'] == 'AE' and len(s['groups']) >= 6, f'[{t}] UAE 2027 grouped holidays {len(s["groups"])}')
    txt = await pg.inner_text('#phlist'); ok('National Day' in txt and 'Eid al-Fitr' in txt, f'[{t}] cards list holidays')
    ok(await pg.locator('#phlist .phc').count() == len(s['groups']), f'[{t}] one card per holiday group')
    ok('may shift' in txt.lower(), f'[{t}] moon dates flagged')
    ok(await pg.locator('#phnote a[href="https://github.com/vacanza/holidays"]').count() == 1, f'[{t}] credit link')
    ok(len(await pg.inner_text('#phcd')) > 0 and 'Loading' not in await pg.inner_text('#phn'), f'[{t}] countdown hero filled')
    await pg.locator('#phlist .phc').first.click(); ok(len(await pg.inner_text('#phdet')) > 20, f'[{t}] tapping a card shows detail')
    await pg.locator('#phrv .cap').first.click(); ok('2027' in await pg.inner_text('#phdet'), f'[{t}] tapping a capsule shows detail')
    async with pg.expect_download() as d: await pg.click('#phcsv')
    dl = await d.value; ok(dl.suggested_filename == 'Dilia-holidays-AE-2027.csv', f'[{t}] csv name'); c = open(await dl.path()).read(); ok(c.startswith('Date,Holiday,Status') and '2027-12-02' in c and 'expected' in c, f'[{t}] csv content')
    async with pg.expect_download() as d: await pg.click('#phics')
    c = open(await (await d.value).path()).read(); ok(c.count('BEGIN:VEVENT') == sum(1 for l in open(await (await d.value).path()) if False) or c.count('BEGIN:VEVENT') >= 10, f'[{t}] ics events')
    ok('holiday-planner/#c=AE&y=2027' in await pg.get_attribute('#phplan', 'href'), f'[{t}] planner link carries country and year')
    await pg.select_option('#phx', 'IN'); await pg.wait_for_timeout(500); ok(await pg.locator('#phlist .bo').count() >= 1, f'[{t}] compare marks shared holidays')
    await pg.select_option('#phc', 'US'); await pg.wait_for_timeout(500); ok('Thanksgiving' in await pg.inner_text('#phlist'), f'[{t}] US has Thanksgiving'); ok('c=US' in await pg.evaluate('location.hash'), f'[{t}] hash follows')
    await pg.goto(B + 'public-holidays/#c=LK&y=2035'); await pg.wait_for_timeout(700); ok(not await pg.is_hidden('#phwarn') and 'Sri Lanka' in await pg.inner_text('#phwarn'), f'[{t}] Sri Lanka 2035 warns about missing data')
    await pg.goto(B + 'public-holidays/#c=AE&y=2024'); await pg.wait_for_timeout(700); ok('IN REVIEW' in await pg.inner_text('#phk'), f'[{t}] past year shows review')
    ok(await pg.locator('#phlist .phc.past').count() == await pg.locator('#phlist .phc').count(), f'[{t}] all past cards dimmed')
    if len(sys.argv) > 1: await pg.goto(B + 'public-holidays/#c=AE&y=2026'); await pg.wait_for_timeout(700); await pg.screenshot(path=f'/tmp/ph-{w}.png', full_page=True)
    ok(not errs, f'[{t}] errors {errs[:3]}'); await ctx.close()
async def hub(br, w, theme):
    ctx, pg, errs = await ctx_page(br, w, theme); t = f'hub {w}'
    await pg.goto(B + 'life/'); await pg.wait_for_timeout(900)
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{t}] no sideways scroll')
    a = await pg.inner_text('#lhtime'); await pg.wait_for_timeout(1100); ok(a != await pg.inner_text('#lhtime') and ':' in a, f'[{t}] clock ticks')
    ok('Week' in await pg.inner_text('#lhmeta') and '%' in await pg.inner_text('#lhpct'), f'[{t}] year progress')
    ok(await pg.evaluate("document.getElementById('lhc').value") == 'AE', f'[{t}] country from locale (en-AE)')
    ok('Loading' not in await pg.inner_text('#lhhn') and len(await pg.inner_text('#lhcd')) > 0, f'[{t}] next holiday countdown')
    await pg.select_option('#lhc', 'US'); await pg.wait_for_timeout(500); ok('c=US' in await pg.get_attribute('#lhall', 'href'), f'[{t}] country change updates link')
    await pg.reload(); await pg.wait_for_timeout(800); ok(await pg.evaluate("document.getElementById('lhc').value") == 'US', f'[{t}] country remembered')
    hs = await pg.eval_on_selector_all('.lhportals a', 'a => a.map(x => x.getAttribute("href"))'); ok(len(hs) == 9, f'[{t}] 9 tool portals')
    for h in hs: r = await pg.request.get(B + 'life/' + h); ok(r.status == 200, f'[{t}] portal {h} -> {r.status}')
    ok(await pg.locator('.lroad li').count() == 8, f'[{t}] roadmap')
    if len(sys.argv) > 1: await pg.screenshot(path=f'/tmp/lh-{w}.png', full_page=True)
    ok(not errs, f'[{t}] errors {errs[:3]}'); await ctx.close()
CASES = [holidays, hub]
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for fn in CASES: await fn(br, 1280, 'dark'); await fn(br, 390, 'light')
        await br.close()
    print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
asyncio.run(main())
