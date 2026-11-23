"""Checkers and reversi pages in a real browser under the real _headers (port 8766). Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-boards.py"""
import asyncio, json, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
async def open_(br, slug, w=1280, theme='dark'):
    ctx = await br.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce', has_touch=w < 500)
    errs = []
    await ctx.add_init_script(f"try{{if(!localStorage.getItem('dilia-theme'))localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith(('http://127.0.0.1:8766/', 'data:', 'blob:')) else None)
    await pg.goto(B + slug + '/'); await pg.wait_for_timeout(600)
    return ctx, pg, errs
async def st(pg): return await pg.evaluate('DiliaBoardGame.state()')
async def wait_h(pg, n):
    for _ in range(80):
        s = await st(pg)
        if len(s['hist']) >= n and not s['thinking']: return s
        await pg.wait_for_timeout(150)
    return await st(pg)
def cell(pg, q): return pg.locator(f'.bgb .bgc[data-q="{q}"]')

async def reversi(br, w):
    ctx, pg, errs = await open_(br, 'reversi', w)
    s = await st(pg); ok(len(s['hist']) == 0 and await pg.locator('.bgc').count() == 64, f'[{w}] reversi starts')
    ok(await pg.inner_text('#ca') == '2' and await pg.inner_text('#cb') == '2', f'[{w}] 2 discs each')
    ok(await pg.locator('.bgc.dot').count() == 4, f'[{w}] 4 legal squares shown')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] no sideways scroll')
    await cell(pg, 19).click(); s = await wait_h(pg, 2)
    ok(len(s['hist']) >= 2 and s['hist'][0]['at'] == 19, f'[{w}] move and computer reply: {len(s["hist"])}')
    await cell(pg, 0).click(); ok(len((await st(pg))['hist']) == len(s['hist']), f'[{w}] illegal square ignored')
    await pg.click('#undo'); s = await st(pg); ok(len(s['hist']) == 0, f'[{w}] undo back to start')
    await pg.click('[data-cs="1"]'); await pg.wait_for_timeout(1000); ok(len((await st(pg))['hist']) == 0 and await pg.locator('#cstart').is_visible(), f'[{w}] waits for Start when you play second')
    await pg.click('#cstart'); s = await wait_h(pg, 1); ok(len(s['hist']) == 1, f'[{w}] computer opens after Start')
    await pg.click('[data-cm=two]') if False else None
    await pg.click('#newgame'); await pg.click('[data-cs="0"]'); await pg.click('[data-cm=two]'); s = await st(pg); ok(s['cfg']['mode'] == 'two', f'[{w}] two players')
    # play a full random game between two humans via the hook
    for i in range(70):
        s = await st(pg)
        if s['over']: break
        await pg.evaluate('(()=>{const m=DiliaBoardGame.legal();DiliaBoardGame.play(m[0]);})()')
    s = await st(pg); ok(s['over'], f'[{w}] reversi game reaches an end'); ok(await pg.evaluate("document.getElementById('done').classList.contains('on')"), f'[{w}] result panel')
    ok(not errs, f'[{w}] reversi errors {errs[:3]}'); await ctx.close()

async def checkers(br, w):
    ctx, pg, errs = await open_(br, 'checkers', w)
    s = await st(pg); ok(len(s['hist']) == 0, f'[{w}] checkers starts'); ok(await pg.inner_text('#ca') == '12' and await pg.inner_text('#cb') == '12', f'[{w}] 12 pieces each')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] no sideways scroll')
    await cell(pg, 42).click(); ok(await pg.locator('.bgc.dot').count() == 2, f'[{w}] piece shows 2 destinations')
    await cell(pg, 33).click(); s = await wait_h(pg, 2); ok(len(s['hist']) >= 2, f'[{w}] move and reply')
    await pg.click('#undo'); ok(len((await st(pg))['hist']) == 0, f'[{w}] undo both plies')
    await pg.reload(); await pg.wait_for_timeout(500)
    await pg.click('[data-cm=two]'); s = await st(pg); ok(s['cfg']['mode'] == 'two', f'[{w}] two players')
    for i in range(300):
        s = await st(pg)
        if s['over']: break
        await pg.evaluate('(()=>{const m=DiliaBoardGame.legal();DiliaBoardGame.play(m[m.length-1]);})()')
    s = await st(pg); ok(s['over'], f'[{w}] checkers game ends (win or draw rule)')
    await pg.reload(); await pg.wait_for_timeout(500); s2 = await st(pg); ok(len(s2['hist']) == len(s['hist']), f'[{w}] saved game restored')
    ok(not errs, f'[{w}] checkers errors {errs[:3]}'); await ctx.close()

async def connect4(br, w):
    ctx, pg, errs = await open_(br, 'connect-four', w)
    s = await st(pg); ok(len(s['hist']) == 0 and await pg.locator('.bgc').count() == 42, f'[{w}] connect four starts')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] no sideways scroll')
    await cell(pg, 38).click(); s = await wait_h(pg, 2); ok(len(s['hist']) == 2 and s['hist'][0]['at'] == 38, f'[{w}] disc drops to bottom and computer replies: {s["hist"]}')
    await cell(pg, 3).click(); s2 = await wait_h(pg, 4); ok(s2['hist'][2]['col'] == 3 and s2['hist'][2]['at'] % 7 == 3, f'[{w}] second disc stacks in same column: {s2["hist"][2]}')
    await pg.click('#undo'); ok(len((await st(pg))['hist']) == 2, f'[{w}] undo takes back disc and reply')
    await pg.click('#newgame'); await pg.click('[data-cm=two]')
    for c in (0, 1, 0, 1, 0, 1, 0): await pg.evaluate(f'(()=>{{const m=DiliaBoardGame.legal().find(x=>x.col=={c});DiliaBoardGame.play(m);}})()')
    s = await st(pg); ok(s['over'], f'[{w}] four in a column wins'); ok('red wins' in (await pg.inner_text('#deyebrow')).lower(), f'[{w}] Red wins shown')
    ok(not errs, f'[{w}] connect four errors {errs[:3]}'); await ctx.close()

async def shots(br):
    for slug in ('checkers', 'reversi', 'connect-four'):
        for w, th in ((1280, 'dark'), (390, 'light')):
            ctx, pg, errs = await open_(br, slug, w, th); await pg.click('[data-cm=two]')
            for i in range(6): await pg.evaluate('(()=>{const m=DiliaBoardGame.legal();DiliaBoardGame.play(m[Math.min(1,m.length-1)]);})()')
            await pg.screenshot(path=f'/tmp/{slug}-{w}-{th}.png', full_page=False); await ctx.close()
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for w in (1280, 390): await reversi(br, w); await checkers(br, w); await connect4(br, w)
        if len(sys.argv) > 1: await shots(br)
        await br.close()
    print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
asyncio.run(main())
