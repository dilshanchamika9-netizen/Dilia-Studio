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
async def stack(pg, t):
    await ev(pg, 'DiliaStack.tap()'); await ev(pg, 'DiliaStack.step(10)')
    for _ in range(3): await ev(pg, 'DiliaStack.align()'); await ev(pg, 'DiliaStack.tap()')
    s = await ev(pg, 'DiliaStack.state()'); ok(s['score'] == 3 and s['perfect'] == 3 and not s['over'], f'[{t}] three perfect drops {s}')
    await ev(pg, 'DiliaStack.miss()'); await ev(pg, 'DiliaStack.tap()'); await pg.wait_for_timeout(200)
    s = await ev(pg, 'DiliaStack.state()'); ok(s['over'] and await done(pg), f'[{t}] a miss ends it {s}')
async def dash(pg, t):
    await ev(pg, 'DiliaDash.tap()'); await ev(pg, 'DiliaDash.step(45)'); s = await ev(pg, 'DiliaDash.state()'); ok(s['score'] > 0 and not s['over'], f'[{t}] runs {s}')
    await ev(pg, 'DiliaDash.tap()'); await ev(pg, 'DiliaDash.step(8)'); s = await ev(pg, 'DiliaDash.state()'); ok(s['y'] < 180, f'[{t}] jump leaves the ground {s}')
    await ev(pg, 'DiliaDash.step(60)'); await ev(pg, 'DiliaDash.spawn()'); await ev(pg, 'DiliaDash.step(2)'); await pg.wait_for_timeout(200)
    s = await ev(pg, 'DiliaDash.state()'); ok(s['over'] and await done(pg), f'[{t}] a block ends the run {s}')
async def hop(pg, t):
    await ev(pg, 'DiliaHop.tap()'); await ev(pg, 'DiliaHop.step(3)'); s = await ev(pg, 'DiliaHop.state()'); ok(not s['over'], f'[{t}] flying')
    await ev(pg, 'DiliaHop.step(2)'); await ev(pg, 'DiliaHop.floor()'); await ev(pg, 'DiliaHop.step(1)'); await pg.wait_for_timeout(200)
    s = await ev(pg, 'DiliaHop.state()'); ok(s['over'] and await done(pg), f'[{t}] ground ends it {s}')
async def backgammon(pg, t):
    ok(await pg.locator('#bgs svg .bgck').count() == 30, f'[{t}] 30 checkers drawn')
    await ev(pg, 'DiliaBGGame.roll([3,1])'); s = await ev(pg, 'DiliaBGGame.state()'); ok(s['phase'] == 'move' and len(s['legal']) > 0, f'[{t}] roll gives legal moves')
    f, to, d = s['legal'][0]
    await pg.locator(f'#bgs svg .bgck[data-i="{f}"]').last.click(); s = await ev(pg, 'DiliaBGGame.state()'); ok(s['sel'] == f, f'[{t}] checker selected')
    await ev(pg, f'DiliaBGGame.tap({to})'); s = await ev(pg, 'DiliaBGGame.state()'); ok(len(s['s']['dice']) == 1, f'[{t}] one die used')
    l = s['legal'][0]; await ev(pg, f'DiliaBGGame.tap({l[0]})'); await ev(pg, f'DiliaBGGame.tap({l[1]})')
    for _ in range(60):
        s = await ev(pg, 'DiliaBGGame.state()')
        if s['s']['turn'] == 0 and s['phase'] == 'roll' and not s['busy']: break
        await pg.wait_for_timeout(250)
    ok(s['s']['turn'] == 0 and s['phase'] == 'roll', f'[{t}] computer plays and it is your turn again')
    await ev(pg, "DiliaBGGame.set({p:Array(24).fill(0).map((v,i)=>i==0?1:(i==20?-1:0)), bar:[0,0], off:[14,14], turn:0, dice:[], n:3, phase:'roll'})")
    await ev(pg, 'DiliaBGGame.roll([1])'); await ev(pg, 'DiliaBGGame.tap(0)'); await ev(pg, "DiliaBGGame.tap('off')"); await pg.wait_for_timeout(300)
    ok(await done(pg), f'[{t}] bearing off the last checker wins and shows panel')
async def dword(pg, t):
    s = await ev(pg, 'DiliaWordGame.state()'); ans = s['ans']; ok(len(ans) == 5 and s['mode'] == 'daily', f'[{t}] daily word loaded')
    await ev(pg, "DiliaWordGame.type('zzzzz')"); await ev(pg, 'DiliaWordGame.enter()'); s = await ev(pg, 'DiliaWordGame.state()'); ok(len(s['guesses']) == 1 and not s['over'], f'[{t}] a guess is accepted')
    await pg.keyboard.type(ans); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300); s = await ev(pg, 'DiliaWordGame.state()')
    ok(s['over'] and s['guesses'][-1] == ans and await done(pg), f'[{t}] typing the answer wins and shows the panel')
    ok(await pg.locator('.wc.s2').count() >= 5, f'[{t}] green squares shown')
    await pg.reload(); await pg.wait_for_timeout(400); s = await ev(pg, 'DiliaWordGame.state()'); ok(s['over'] and len(s['guesses']) == 2 and await done(pg), f'[{t}] finished game is restored on reload')
async def cross(pg, t):
    await pg.click('[data-cs="6"]'); await pg.wait_for_timeout(200); s = await ev(pg, 'DiliaCrossGame.state()'); ok(len(s['p']['words']) == 6, f'[{t}] six words')
    ok(await pg.locator('#cwg .cwc').count() == sum(1 for r in s['p']['grid'] for c in r if c), f'[{t}] squares drawn')
    r, c = s['p']['words'][0]['r'], s['p']['words'][0]['col']; await pg.locator(f'#cwg .cwc[data-r="{r}"][data-c="{c}"]').click(); await pg.keyboard.type(s['p']['words'][0]['w'][0])
    s = await ev(pg, 'DiliaCrossGame.state()'); ok(s['ent'][r][c] == s['p']['words'][0]['w'][0], f'[{t}] typing fills the square')
    await pg.click('#cwcheck'); await ev(pg, 'DiliaCrossGame.solve()'); await pg.wait_for_timeout(300); s = await ev(pg, 'DiliaCrossGame.state()'); ok(s['won'] and await done(pg), f'[{t}] solved shows panel')
async def speed(pg, t):
    await pg.click('[data-wpm="700"]'); await pg.click('#srstart'); await pg.wait_for_timeout(500); s = await ev(pg, 'DiliaSpeed.state()'); ok(s['state'] == 'run' and s['i'] > 0, f'[{t}] words flash {s}')
    ok(await pg.locator('#srw b').count() == 1, f'[{t}] focal letter shown')
    await ev(pg, 'DiliaSpeed.skip()'); await pg.wait_for_timeout(200); ok(await pg.locator('#srq input[type=radio]').count() == 12, f'[{t}] three questions with four options')
    for k, a in enumerate([1, 1, 2]):
        pass
    await ev(pg, 'DiliaSpeed.submit()'); await pg.wait_for_timeout(100); ok(not await done(pg), f'[{t}] must answer all questions')
    for k in range(3): await ev(pg, f'DiliaSpeed.answer({k}, 1)')
    await ev(pg, 'DiliaSpeed.submit()'); await pg.wait_for_timeout(200); ok(await done(pg), f'[{t}] result panel')
async def cpuz(pg, t):
    s = await ev(pg, 'DiliaChessPuzzle.state()'); ok(s['n'] >= 60 and s['phase'] == 'first', f'[{t}] puzzle loaded ({s["n"]} puzzles)')
    ok(await pg.locator('#cpb .sq').count() == 64 and await pg.locator('#cpb .sq span:not(:empty)').count() >= 9, f'[{t}] board drawn')
    w = await ev(pg, 'DiliaChessPuzzle.wrongUci()'); await ev(pg, f'DiliaChessPuzzle.tapUci("{w}")'); s = await ev(pg, 'DiliaChessPuzzle.state()'); ok(s['tries'] == 1 and s['phase'] == 'first', f'[{t}] a wrong move is refused')
    ok(await pg.locator('#cpb .sq.bad').count() == 1 and await ev(pg, "document.getElementById('cptry').textContent") == '1', f'[{t}] the wrong move is shown on the board in red')
    await ev(pg, 'DiliaChessPuzzle.tapUci("' + w + '")'); s2 = await ev(pg, 'DiliaChessPuzzle.state()'); ok(s2['tries'] == 1, f'[{t}] taps are ignored while the wrong move is shown')
    await pg.wait_for_timeout(1100); ok(await pg.locator('#cpb .sq.bad').count() == 0, f'[{t}] the board goes back after the wrong move')
    await pg.click('#cphint'); ok(await pg.locator('#cpb .sq.sel').count() == 1, f'[{t}] hint marks the key piece')
    await ev(pg, f'DiliaChessPuzzle.tapUci("{s["sol"]}")'); await pg.wait_for_timeout(1300); s = await ev(pg, 'DiliaChessPuzzle.state()'); ok(s['phase'] == 'mate', f'[{t}] key move accepted, opponent replied')
    m = await ev(pg, 'DiliaChessPuzzle.mateUci()'); ok(bool(m), f'[{t}] a mating move exists'); await ev(pg, f'DiliaChessPuzzle.tapUci("{m}")'); await pg.wait_for_timeout(1000)
    ok(await done(pg), f'[{t}] checkmate solves it and shows the panel')
CASES = [('daily-chess-puzzle', cpuz), ('daily-chess-puzzle', mega), ('daily-word', dword), ('crossword', cross), ('speed-reading', speed), ('backgammon', backgammon), ('backgammon', mega), ('stack', stack), ('dash', dash), ('hop', hop), ('stack', mega), ('pong', mega), ('merge', mega), ('brick-breaker', brick), ('pong', pong), ('aim-trainer', aim), ('nonogram', nono), ('sliding-puzzle', slide), ('word-search', words), ('memory-game', memory)]
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for slug, fn in CASES:
            await page(br, 1280, slug, 'dark', fn, f'/tmp/{slug}-1280.png' if len(sys.argv) > 1 else None)
            await page(br, 390, slug, 'light', fn, f'/tmp/{slug}-390.png' if len(sys.argv) > 1 else None)
        await br.close()
    print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
asyncio.run(main())
