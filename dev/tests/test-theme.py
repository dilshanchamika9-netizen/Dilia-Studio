"""Light/dark switch on every page family: light by default, toggle works and is remembered, no sideways scroll at 390, no console errors.
Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-theme.py"""
import asyncio
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
PAGES = ['', 'tools.html', 'life/', 'play/', 'blog/', 'edit-pdf/', 'pdf-reader/', 'calc/', 'snake/', 'wheel-spinner/', 'dice-roller/', 'bingo-card-generator/', 'quiz-maker/', 'chess/', 'checkers/', 'reversi/', 'connect-four/', 'ludo/', 'brick-breaker/', 'pong/', 'aim-trainer/', 'nonogram/', 'sliding-puzzle/', 'word-search/', 'memory-game/', 'stack/', 'dash/', 'hop/', 'backgammon/', 'daily-word/', 'crossword/', 'speed-reading/', 'daily-chess-puzzle/', 'holiday-planner/', 'public-holidays/', 'time-zone-converter/', 'uae-gratuity-calculator/', 'working-days-calculator/', 'freecell/', 'pyramid/', 'tripeaks/', 'spider/', 'mahjong/', 'daily-sudoku/', 'typing-test/', 'solitaire/', 'compress-image/', 'age-calculator/']
fails, n = [], 0
def ok(c, m):
    global n; n += 1
    if not c: fails.append(m)
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for path in PAGES:
            ctx = await br.new_context(viewport={'width': 390, 'height': 800}); pg = await ctx.new_page(); msgs = []
            pg.on('console', lambda m: msgs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
            pg.on('pageerror', lambda e: msgs.append(str(e)))
            r = await pg.goto(B + path, wait_until='load'); await pg.wait_for_timeout(400)
            if r.status != 200: ok(False, f'{path} status {r.status}'); await ctx.close(); continue
            th = lambda: pg.evaluate("document.documentElement.dataset.theme || 'light'")
            ok(await th() == 'light', f'{path}: not light by default')
            ok(await pg.locator('.themebtn, #theme').count() == 1, f'{path}: no toggle')
            if await pg.locator('.themebtn, #theme').count() == 1:
                await pg.evaluate("document.querySelector('.themebtn, #theme').click()"); await pg.wait_for_timeout(200)
                ok(await th() == 'dark', f'{path}: toggle did not go dark')
                await pg.reload(); await pg.wait_for_timeout(400)
                ok(await th() == 'dark', f'{path}: dark not remembered')
                ok(await pg.evaluate('document.documentElement.scrollWidth') <= 390, f'{path}: sideways scroll in dark')
                await pg.evaluate("document.querySelector('.themebtn, #theme').click()"); await pg.wait_for_timeout(200)
                ok(await th() == 'light', f'{path}: toggle did not return to light')
            ok(not msgs, f'{path}: {msgs[:2]}')
            await ctx.close()
        pg = await (await br.new_context()).new_page(); await pg.goto(B + 'tools.html'); await pg.wait_for_timeout(400)
        hs = await pg.eval_on_selector_all('#goals .grow a', 'a => a.map(x => x.href)')
        ok(len(hs) >= 30, f'goals: only {len(hs)} chips')
        for h in hs:
            r = await pg.request.get(h); ok(r.status == 200, f'goal link {h} -> {r.status}')
        await pg.fill('#q', 'merge'); ok(await pg.is_hidden('#goals'), 'goals stay visible while searching')
        await br.close()
    print(f'{n} checks,', 'FAIL' if fails else 'ok')
    for f in fails: print(' -', f)
    raise SystemExit(1 if fails else 0)
asyncio.run(main())
