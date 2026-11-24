"""Win celebration: fires on real wins, stays quiet on losses and on a panel restored at page load (port 8766)."""
import asyncio, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
WIN = [('Checkmate', 'White wins.'), ('Checkmate', 'You beat the Casual level.'), ('Solved', 'You found it in 3 guesses.'), ('Cleared', ''), ('Won', ''), ('You win', 'Record 3 won.'),
       ('All pairs found', ''), ('All words found', ''), ('Board full · score', ''), ('Pink wins', 'Pink wins by a gammon.'), ('Dark wins', 'Dark wins.'), ('Red wins', 'You won against the Casual computers.')]
LOSS = [('Computer wins', 'Computer wins by a single game.'), ('Checkmate', 'Black wins. The Casual level wins this one.'), ('Game over', ''), ('Game over · score', ''), ('Boom', 'You opened a mine.'),
        ('Not this time', 'The word was CRANE.'), ('Time is up', ''), ('Crashed', ''), ('Tower fell', ''), ('Draw', 'Neither side wins.'), ("Time's up", ''), ('Finished', ''), ('Red wins', 'Red wins. The Casual level wins this one.')]
async def run():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await br.new_context(viewport={'width': 1000, 'height': 800}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
        await pg.goto(B + 'nonogram/'); await pg.wait_for_timeout(500)
        ok(await pg.evaluate('typeof Celebrate') == 'object', 'celebrate.js loaded on a game page')
        # a panel that opens with no touch at all (restored on load) is quiet
        await pg.evaluate("(()=>{const d=document.getElementById('done');d.classList.add('on')})()"); await pg.wait_for_timeout(200)
        ok(await pg.evaluate('window.__celebrations||0') == 0, 'no celebration for a panel restored without interaction')
        await pg.evaluate("document.getElementById('done').classList.remove('on')"); await pg.keyboard.press('Shift')
        async def panel(eb, ln):
            await pg.evaluate("window.__celebrations=0;document.getElementById('done').classList.remove('on')"); await pg.wait_for_timeout(30)
            await pg.evaluate("([a,b])=>{const d=document.getElementById('done');let e=d.querySelector('.eyeb');if(e)e.textContent=a;let l=document.getElementById('dline');if(l)l.textContent=b;d.classList.add('on')}", [eb, ln])
            await pg.wait_for_timeout(60); return await pg.evaluate('window.__celebrations||0')
        for a, b in WIN: ok(await panel(a, b) == 1, f'celebrates: {a} / {b}')
        for a, b in LOSS: ok(await panel(a, b) == 0, f'quiet: {a} / {b}')
        await pg.evaluate("window.__celebrations=0;document.getElementById('done').classList.remove('on')")
        await pg.evaluate("Celebrate.fire('Congratulations!','Solved')"); await pg.wait_for_timeout(1200)
        ok(await pg.locator('canvas.cel-cv').count() == 1 and await pg.locator('.cel-banner .cel-h').inner_text() == 'Congratulations!', 'fireworks canvas and banner are on screen')
        ok(await pg.evaluate("document.querySelector('canvas.cel-cv').style.pointerEvents||getComputedStyle(document.querySelector('canvas.cel-cv')).pointerEvents") == 'none', 'fireworks never block taps')
        shot = await pg.screenshot(path='/tmp/cel-mid.png')
        await pg.wait_for_timeout(9500); ok(await pg.locator('canvas.cel-cv').count() == 0 and await pg.locator('.cel-banner').count() == 0, 'fireworks clean themselves up')
        # real wins in real games
        for slug, js, label in [('nonogram', 'DiliaNonogram.solve()', 'nonogram'), ('crossword', 'DiliaCrossGame.solve()', 'crossword')]:
            await pg.goto(B + slug + '/'); await pg.wait_for_timeout(500); await pg.keyboard.press('Shift'); await pg.evaluate(js); await pg.wait_for_timeout(500)
            ok(await pg.evaluate('window.__celebrations||0') == 1, f'real win celebrates: {label}')
        await pg.goto(B + 'sliding-puzzle/'); await pg.wait_for_timeout(500); await pg.keyboard.press('Shift')
        ok(await pg.evaluate('typeof Celebrate') == 'object', 'celebrate on sliding puzzle page')
        ok(not errs, f'errors {errs[:3]}'); await br.close()
asyncio.run(run()); print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
