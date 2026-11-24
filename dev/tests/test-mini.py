"""Step 7 arcade and puzzle pages in a real browser under the real _headers (port 8766)."""
import asyncio, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
async def mega(pg, t):
    await pg.click('[data-menu]'); await pg.wait_for_timeout(800)
    r = await pg.evaluate("(()=>{const c=document.querySelector('#mega .mcard'),b=c.querySelector('.mtx b').getBoundingClientRect(),r=c.getBoundingClientRect();return b.width>0&&b.top>=r.top&&b.bottom<=r.bottom&&b.left>=r.left&&b.right<=r.right})()")
    ok(r, f'[{t}] Tools menu card text sits inside its card')
async def done(pg): return await pg.evaluate("document.getElementById('done').classList.contains('on')")
async def ev(pg, js): return await pg.evaluate(js)
async def page(br, w, slug, theme, fn, shot=None):
    ctx = await br.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce', has_touch=w < 500); errs = []
    await ctx.add_init_script(f"try{{if(!localStorage.getItem('dilia-theme'))localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith((B, 'data:', 'blob:')) else None)
    await pg.goto(B + slug + '/'); await pg.wait_for_timeout(500)
    ok(await ev(pg, 'document.documentElement.scrollWidth') <= w, f'[{slug} {w}] no sideways scroll')
    try: await fn(pg, f'{slug} {w}')
    except Exception as e: ok(False, f'[{slug} {w}] exception {e}')
    if shot: await pg.screenshot(path=shot)
    ok(not errs, f'[{slug} {w}] errors {errs[:3]}'); await ctx.close()
async def brick(pg, t):
    s = await ev(pg, 'DiliaBrick.state()'); ok(s['alive'] > 20 and s['lives'] == 3, f'[{t}] bricks and 3 lives')
    await ev(pg, 'DiliaBrick.launch()'); await ev(pg, 'DiliaBrick.step(30)'); s = await ev(pg, 'DiliaBrick.state()'); ok(s['run'], f'[{t}] ball running')
    await ev(pg, 'DiliaBrick.clearAll()'); await ev(pg, 'DiliaBrick.step(5)'); s = await ev(pg, 'DiliaBrick.state()'); ok(s['level'] == 2, f'[{t}] level 2 after clearing')
    for _ in range(3): await ev(pg, 'DiliaBrick.launch()'); await ev(pg, 'DiliaBrick.loseBall()'); await ev(pg, 'DiliaBrick.step(3)')
    s = await ev(pg, 'DiliaBrick.state()'); ok(s['over'] and await done(pg), f'[{t}] game over panel')
async def pong(pg, t):
    await pg.click('[data-pl="3"]'); await ev(pg, 'DiliaPong.launch()'); await ev(pg, 'DiliaPong.step(20)')
    await ev(pg, 'DiliaPong.score(6,2)'); await ev(pg, 'DiliaPong.point("me")'); await pg.wait_for_timeout(300)
    s = await ev(pg, 'DiliaPong.state()'); ok(s['me'] == 7 and s['over'] and await done(pg), f'[{t}] 7 points ends match: {s}')
async def aim(pg, t):
    await pg.click('#astart'); await pg.wait_for_timeout(200)
    for _ in range(5): await ev(pg, 'DiliaAim.hit()'); await pg.wait_for_timeout(50)
    s = await ev(pg, 'DiliaAim.state()'); ok(s['hits'] == 5 and s['running'], f'[{t}] 5 hits {s}')
    await ev(pg, 'DiliaAim.end()'); await pg.wait_for_timeout(200); ok(await done(pg), f'[{t}] result panel')
async def nono(pg, t):
    await pg.click('[data-ns="5"]'); await pg.wait_for_timeout(200)
    ok(await pg.locator('#nng .nn-c').count() >= 25 or await pg.locator('#nng [data-r]').count() >= 25, f'[{t}] grid drawn')
    await ev(pg, 'DiliaNonogram.solve()'); await pg.wait_for_timeout(300); s = await ev(pg, 'DiliaNonogram.state()'); ok(s['won'] and await done(pg), f'[{t}] solved shows panel')
async def slide(pg, t):
    await pg.click('[data-sn="3"]'); await ev(pg, 'DiliaSlide.set([1,2,3,4,5,6,7,0,8])'); await pg.wait_for_timeout(100)
    s = await ev(pg, 'DiliaSlide.state()'); ok(not s['won'], f'[{t}] near solved is not won')
    await ev(pg, 'DiliaSlide.tap(8)'); await pg.wait_for_timeout(300); s = await ev(pg, 'DiliaSlide.state()'); ok(s['won'] and s['moves'] == 1 and await done(pg), f'[{t}] one move solves {s}')
async def words(pg, t):
    s = await ev(pg, 'DiliaWordSearch.state()'); ws = [p['w'] for p in s['w']['placed']]; ok(len(ws) >= 6, f'[{t}] words placed')
    for x in ws: await ev(pg, f'DiliaWordSearch.find({x!r})'.replace("'", '"'))
    await pg.wait_for_timeout(300); s = await ev(pg, 'DiliaWordSearch.state()'); ok(s['won'] and await done(pg), f'[{t}] all found shows panel')
async def memory(pg, t):
    s = await ev(pg, 'DiliaMemory.state()'); d = s['deck']; ok(len(d) == 16, f'[{t}] 16 cards on medium')
    first = {}
    for i, v in enumerate(d):
        if v in first: a, b = first[v], i
        else: first[v] = i; continue
        await ev(pg, f'DiliaMemory.flip({a})'); await ev(pg, f'DiliaMemory.flip({b})'); await pg.wait_for_timeout(120)
    await pg.wait_for_timeout(500); s = await ev(pg, 'DiliaMemory.state()'); ok(s['won'] and s['moves'] == 8 and await done(pg), f'[{t}] perfect game {s["moves"]} moves')
CASES = [('pong', mega), ('merge', mega), ('brick-breaker', brick), ('pong', pong), ('aim-trainer', aim), ('nonogram', nono), ('sliding-puzzle', slide), ('word-search', words), ('memory-game', memory)]
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for slug, fn in CASES:
            await page(br, 1280, slug, 'dark', fn, f'/tmp/{slug}-1280.png' if len(sys.argv) > 1 else None)
            await page(br, 390, slug, 'light', fn, f'/tmp/{slug}-390.png' if len(sys.argv) > 1 else None)
        await br.close()
    print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
asyncio.run(main())
