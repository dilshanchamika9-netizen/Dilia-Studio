"""Ludo page in a real browser under the real _headers (port 8766)."""
import asyncio, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
async def st(pg): return await pg.evaluate('DiliaLudoGame.state()')
async def run(br, w, theme='dark', shot=None):
    ctx = await br.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce', has_touch=w < 500); errs = []
    await ctx.add_init_script(f"try{{if(!localStorage.getItem('dilia-theme'))localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith(('http://127.0.0.1:8766/', 'data:', 'blob:')) else None)
    await pg.goto(B + 'ludo/'); await pg.wait_for_timeout(600)
    s = await st(pg); ok(len(s['s']['tok']) == 4 and s['s']['n'] == 0, f'[{w}] starts with 4 players')
    ok(await pg.locator('.ltok').count() == 16, f'[{w}] 16 tokens drawn'); ok(await pg.locator('.ltr').count() == 52 + 20, f'[{w}] track and lanes drawn')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] no sideways scroll')
    # human rolls a 3: no six, nothing moves, turn passes to the computer, which plays on its own
    await pg.evaluate('DiliaLudoGame.roll(3)'); await pg.wait_for_timeout(1500); s = await st(pg); ok(s['s']['turn'] != 0 or s['s']['n'] > 1, f'[{w}] turn passed after no-move roll')
    # wait until it is the human's turn again
    for _ in range(80):
        s = await st(pg)
        if s['s']['turn'] == 0 and s['s']['dice'] == 0 and not s['busy']: break
        await pg.wait_for_timeout(250)
    ok(s['s']['turn'] == 0, f'[{w}] computers finish their turns and it is your turn')
    await pg.evaluate('DiliaLudoGame.roll(6)'); await pg.wait_for_timeout(700); s = await st(pg)
    ok(len(s['pend']) == 4 and await pg.locator('.ltok.can').count() == 4, f'[{w}] six: 4 glowing tokens')
    await pg.locator('.ltok.can').first.click(); await pg.wait_for_timeout(700); s = await st(pg)
    ok(s['s']['tok'][0].count(0) == 1 and s['s']['turn'] == 0, f'[{w}] token out and extra roll')
    # all-human mode, full game through the hook
    await pg.click('#newgame'); await pg.click('[data-lm=all]'); await pg.click('[data-lp="2"]'); s = await st(pg); ok(s['cfg']['mode'] == 'all' and len(s['s']['tok']) == 2, f'[{w}] 2 humans')
    await pg.evaluate("DiliaLudoGame.setState({seats:[0,2],tok:[[56,56,56,54],[10,-1,-1,-1]],turn:0,dice:0,sixes:0,winner:-1,n:40})")
    await pg.evaluate('DiliaLudoGame.roll(3)'); await pg.wait_for_timeout(1400); s = await st(pg); ok(s['s']['turn'] == 1 and not s['over'], f'[{w}] overshoot is not a move (turn passes)')
    await pg.evaluate("DiliaLudoGame.setState({seats:[0,2],tok:[[56,56,56,54],[10,-1,-1,-1]],turn:0,dice:0,sixes:0,winner:-1,n:40})")
    await pg.evaluate('DiliaLudoGame.roll(2)'); await pg.wait_for_timeout(1500)
    s = await st(pg); ok(s['over'], f'[{w}] a full game reaches a winner')
    ok(await pg.evaluate("document.getElementById('done').classList.contains('on')"), f'[{w}] result panel shown')
    if shot: 
        await pg.click('#dagain'); await pg.click('[data-lm=cpu]'); await pg.click('[data-lp="4"]'); await pg.evaluate('DiliaLudoGame.roll(6)'); await pg.wait_for_timeout(900); await pg.screenshot(path=shot)
    ok(not errs, f'[{w}] errors {errs[:3]}'); await ctx.close()
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        await run(br, 1280, 'dark', '/tmp/ludo-1280.png' if len(sys.argv) > 1 else None); await run(br, 390, 'light', '/tmp/ludo-390.png' if len(sys.argv) > 1 else None)
        await br.close()
    print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
asyncio.run(main())
