"""Holiday planner page in a real browser under the real _headers (port 8766)."""
import asyncio, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
async def setl(pg, v):
    await pg.evaluate(f"(()=>{{const e=document.getElementById('hpl');e.value={v};e.dispatchEvent(new Event('input',{{bubbles:true}}))}})()"); await pg.wait_for_timeout(500)
async def run(br, w, theme):
    ctx = await br.new_context(viewport={'width': w, 'height': 1000}, reduced_motion='reduce', accept_downloads=True, locale='en-AE'); errs = []
    await ctx.add_init_script(f"try{{if(!localStorage.getItem('dilia-theme'))localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith((B, 'data:', 'blob:')) else None)
    await pg.goto(B + 'holiday-planner/#c=AE&y=2027&l=10&w=6.0&s=2'); await pg.wait_for_selector('#hpsum b'); await pg.wait_for_timeout(300)
    ok(await pg.locator('#hpcal .lmo').count() == 12 and await pg.locator('#hpcal span[data-i]').count() == 365, f'[{w}] 12 months and 365 days drawn')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] no sideways scroll')
    s = await pg.evaluate('DiliaHolPlanUI.state()'); ok(s['cfg']['c'] == 'AE' and s['cfg']['y'] == 2027 and len(s['wins']) >= 1, f'[{w}] hash restores choices and plans')
    ok(sum(x['cost'] for x in s['wins']) <= 10, f'[{w}] leave within budget')
    ok(await pg.locator('#hpcal span.h').count() >= 5, f'[{w}] holidays marked')
    ok(await pg.locator('#hpcal span.l').count() == sum(x['cost'] for x in s['wins']), f'[{w}] leave days marked match the plan')
    ok(await pg.locator('#hpplan .ltk').count() == len(s['wins']), f'[{w}] plan list matches')
    await pg.select_option('#hpc', 'SA'); await pg.wait_for_timeout(500); s = await pg.evaluate('DiliaHolPlanUI.state()'); ok(sorted(s['cfg']['w']) == [5, 6], f'[{w}] Saudi Arabia defaults to Friday and Saturday')
    ok(await pg.locator('[data-wd="5"][aria-pressed="true"]').count() == 1, f'[{w}] weekend chips follow')
    ok('c=SA' in await pg.evaluate('location.hash'), f'[{w}] address updates for sharing')
    await setl(pg, 0); ok(await pg.locator('#hpplan .ltk').count() == 0 and await pg.is_disabled('#hpics'), f'[{w}] zero leave: no plan, calendar button off')
    await setl(pg, 12); await pg.select_option('#hph', 'IN'); await pg.wait_for_timeout(600); ok(await pg.locator('#hpcal span.o').count() >= 3, f'[{w}] home holidays shown')
    async with pg.expect_download() as d: await pg.click('#hpics')
    dl = await d.value; txt = open(await dl.path()).read(); ok(txt.startswith('BEGIN:VCALENDAR') and 'DTSTART;VALUE=DATE:2027' in txt, f'[{w}] calendar file content')
    await pg.click('[data-hs="1"]'); await pg.wait_for_timeout(300); s1 = await pg.evaluate('DiliaHolPlanUI.state()'); await pg.click('[data-hs="3"]'); await pg.wait_for_timeout(300); s3 = await pg.evaluate('DiliaHolPlanUI.state()')
    ok(max(x['len'] for x in s1['wins']) >= max(x['len'] for x in s3['wins']), f'[{w}] "one long break" is at least as long as "many short"')
    await pg.goto(B + 'holiday-planner/#c=AE&y=2024&l=5&w=6.0&s=2'); await pg.wait_for_timeout(600); await pg.reload(); await pg.wait_for_selector('#hpsum b'); s = await pg.evaluate('DiliaHolPlanUI.state()'); ok(s['cfg']['y'] == 2024 and s['n'] == 366, f'[{w}] leap year 2024 has 366 days after reload')
    await pg.goto(B + 'holiday-planner/#c=AE&y=2027&l=10&w=6.0&s=2'); await pg.wait_for_selector('#hpsum b'); await pg.wait_for_timeout(300)
    ok(await pg.locator('#hprv .cap:not(.f)').count() == len((await pg.evaluate('DiliaHolPlanUI.state()'))['wins']), f'[{w}] one river capsule per break')
    ok(len(await pg.inner_text('#hxcd')) > 0 and 'Loading' not in await pg.inner_text('#hxn'), f'[{w}] countdown hero filled')
    await pg.locator('#hprv .cap').first.click(); ok('break' in (await pg.inner_text('#hpdet')).lower(), f'[{w}] tapping a capsule shows the break')
    await pg.locator('#hpcal span.h').first.click(); ok('Public holiday' in await pg.inner_text('#hpdet'), f'[{w}] tapping a holiday shows it')
    await pg.locator('#hpplan .ltk').first.click(); ok('break' in (await pg.inner_text('#hpdet')).lower(), f'[{w}] tapping a ticket shows the break')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] no sideways scroll (final)')
    await pg.goto(B + 'holiday-planner/#c=LK&y=2030&l=5&w=6.0&s=2'); await pg.wait_for_timeout(700); ok(not await pg.is_hidden('#hpwarn') and 'Sri Lanka' in await pg.inner_text('#hpwarn'), f'[{w}] missing-year warning shown')
    await pg.goto(B + 'holiday-planner/#c=LK&y=2026&l=5&w=6.0&s=2'); await pg.wait_for_timeout(700); ok(await pg.is_hidden('#hpwarn'), f'[{w}] no warning when data exists')
    ok(not errs, f'[{w}] errors {errs[:3]}'); 
    if len(sys.argv) > 1: await pg.screenshot(path=f'/tmp/hp-{w}.png', full_page=False)
    await ctx.close()
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        await run(br, 1280, 'dark'); await run(br, 390, 'light'); await br.close()
    print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
asyncio.run(main())
