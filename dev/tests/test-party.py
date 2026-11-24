"""Party tools in a real browser under the real _headers (port 8766): wheel spinner, random name picker, team maker, dice roller, coin flip, random number generator.
Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-party.py"""
import asyncio, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
COPY = "Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__copied=t}},configurable:true});"

async def page(br, w, reduce=True):
    ctx = await br.new_context(viewport={'width': w, 'height': 1000}, has_touch=w < 500, reduced_motion='reduce' if reduce else 'no-preference')
    pg = await ctx.new_page(); errs = []
    await pg.add_init_script(COPY)
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith(('http://127.0.0.1:8766/', 'data:', 'blob:')) else None)
    return ctx, pg, errs
async def noscroll(pg, w, name): ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on {name}')
async def fill(pg, sel, text): await pg.fill(sel, text); await pg.dispatch_event(sel, 'input')

async def wheel(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'wheel-spinner/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaWheel.state()')
    s = await st(); ok(len(s['entries']) == 6 and not s['spinning'], f'[{w}] wheel start {s}'); await noscroll(pg, w, 'wheel')
    ok(await pg.evaluate("(()=>{const c=document.getElementById('wcv'),d=c.getContext('2d').getImageData(320,120,1,1).data;return d[3]>0})()"), f'[{w}] wheel canvas is blank')
    ok('6 entries' in await pg.inner_text('#wcount'), f'[{w}] count label')
    for i in range(6):                                   # a forced spin must stop on exactly that entry, every time
        await pg.evaluate(f'DiliaWheel.spin({i})'); s = await st()
        ok(s['winner'] == i and await pg.inner_text('#dtime') == s['entries'][i], f'[{w}] forced spin {i} -> {s["winner"]} {await pg.inner_text("#dtime")!r}')
    await pg.evaluate('DiliaWheel.spin()'); ok((await st())['winner'] in range(6), f'[{w}] random spin winner')
    await fill(pg, '#wents', 'A\nB\n\n  C  \nB'); s = await st(); ok(s['entries'] == ['A', 'B', 'C', 'B'], f'[{w}] parse {s["entries"]}')
    await fill(pg, '#wents', '\n'.join(f'e{i}' for i in range(60))); s = await st(); ok(len(s['entries']) == 50 and 'first 50' in await pg.inner_text('#msg'), f'[{w}] 50 cap {len(s["entries"])}')
    await fill(pg, '#wents', 'x' * 100 + '\ny'); s = await st(); ok(len(s['entries'][0]) == 40, f'[{w}] long entry cut {len(s["entries"][0])}')
    await fill(pg, '#wents', 'only one'); await pg.click('#spin', force=True); ok('at least 2' in await pg.inner_text('#msg') and not (await st())['spinning'], f'[{w}] one entry must not spin')
    await fill(pg, '#wents', '<img src=x onerror=alert(1)>\nb'); await pg.evaluate('DiliaWheel.spin(0)')
    ok(await pg.locator('#dtime img').count() == 0 and '<img' in await pg.inner_text('#dtime'), f'[{w}] entry rendered as markup')
    await fill(pg, '#wents', 'Red\nGreen\nBlue'); await pg.check('#wrm'); await pg.evaluate('DiliaWheel.spin(1)'); await pg.wait_for_timeout(300)
    s = await st(); ok(s['entries'] == ['Red', 'Blue'] and 'Green' in s['recent'], f'[{w}] remove winner {s}')
    await pg.uncheck('#wrm'); await pg.evaluate('DiliaWheel.spin(0)'); await pg.click('#wremove'); ok((await st())['entries'] == ['Blue'], f'[{w}] remove button')
    await fill(pg, '#wents', 'a\nb\nc\nd'); await pg.click('#wlink'); await pg.wait_for_timeout(100)
    cp = await pg.evaluate('window.__copied'); ok(cp and cp.endswith('#w=a%0Ab%0Ac%0Ad'), f'[{w}] share link {cp!r}')
    await pg.goto(B + 'wheel-spinner/#w=P%0AQ%0AR'); await pg.reload(); await pg.wait_for_timeout(300); ok((await st())['entries'] == ['P', 'Q', 'R'], f'[{w}] link did not load {(await st())["entries"]}')
    await pg.goto(B + 'wheel-spinner/'); await pg.wait_for_timeout(300); ok((await st())['entries'] == ['a', 'b', 'c', 'd'], f'[{w}] entries not remembered {(await st())["entries"]}')
    await fill(pg, '#wents', 'x\ny'); await pg.click('#wshuffle'); ok(sorted((await st())['entries']) == ['x', 'y'], f'[{w}] shuffle')
    ok(not errs, f'[{w}] wheel errors: {errs}'); await ctx.close()

async def wheel_motion(br, w):
    ctx, pg, errs = await page(br, w, reduce=False); await pg.goto(B + 'wheel-spinner/'); await pg.wait_for_timeout(300)
    await pg.evaluate('DiliaWheel.spin(3)'); s = await pg.evaluate('DiliaWheel.state()'); ok(s['spinning'], f'[{w}] animated spin did not start')
    ok(await pg.locator('#spin').is_disabled(), f'[{w}] spin button not disabled while spinning')
    await pg.wait_for_timeout(5000); s = await pg.evaluate('DiliaWheel.state()')
    ok(not s['spinning'] and s['winner'] == 3 and await pg.inner_text('#dtime') == s['entries'][3], f'[{w}] animated spin stopped on {s["winner"]}, wanted 3')
    ok(not errs, f'[{w}] wheel motion errors: {errs}'); await ctx.close()

async def picker(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'random-name-picker/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaPicker.state()')
    s = await st(); ok(len(s['names']) == 8, f'[{w}] picker default names'); await noscroll(pg, w, 'picker')
    await pg.click('#go'); s = await st(); ok(len(s['result']) == 1 and s['result'][0] in s['names'], f'[{w}] single pick {s["result"]}')
    await pg.fill('#pnum', '3'); await pg.click('#go'); s = await st(); ok(len(s['result']) == 3 and len(set(s['result'])) == 3, f'[{w}] three picks {s["result"]}')
    await pg.fill('#pnum', '1'); await pg.check('#pnorep'); seen = []
    for i in range(8): await pg.click('#go'); seen.append((await st())['result'][0])
    ok(sorted(seen) == sorted((await st())['names']), f'[{w}] no-repeat drew {seen}')
    await pg.click('#go'); ok('Everyone has been picked' in await pg.inner_text('#msg'), f'[{w}] exhausted message')
    await pg.click('#preset'); await pg.click('#go'); ok(len((await st())['result']) == 1, f'[{w}] start over')
    await pg.fill('#pnum', '50'); await pg.click('#preset'); await pg.click('#go'); ok(len((await st())['result']) == 8, f'[{w}] ask for more than exist -> {len((await st())["result"])}')
    await pg.click('#copy'); await pg.wait_for_timeout(100); ok(len((await pg.evaluate('window.__copied')).split('\n')) == 8, f'[{w}] copy')
    await fill(pg, '#pnames', ''); await pg.click('#go'); ok('Add at least one' in await pg.inner_text('#msg'), f'[{w}] empty list')
    ok(not errs, f'[{w}] picker errors: {errs}'); await ctx.close()

async def teams(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'team-maker/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaPicker.state()')
    await noscroll(pg, w, 'teams'); await pg.fill('#tnum', '3'); await pg.click('#go'); s = await st()
    sizes = sorted(len(t) for t in s['result']); ok(sizes == [2, 3, 3] and sorted(sum(s['result'], [])) == sorted(s['names']), f'[{w}] 8 into 3 teams {sizes}')
    ok(await pg.locator('.pt-team').count() == 3 and await pg.locator('.pt-team li').count() == 8, f'[{w}] team cards')
    await pg.check('input[value=size]'); ok('People in each team' in await pg.inner_text('#tlabel'), f'[{w}] label'); await pg.fill('#tnum', '3'); await pg.click('#go'); s = await st(); ok(len(s['result']) == 3, f'[{w}] team size 3 of 8 -> {len(s["result"])} teams')
    await pg.fill('#tnum', '8'); await pg.click('#go'); ok('only one team' in await pg.inner_text('#msg'), f'[{w}] size 8 of 8 is one team')
    await pg.check('input[value=teams]'); await pg.fill('#tnum', '20'); await pg.click('#go'); s = await st(); ok(len(s['result']) == 8 and 'Only 8 people' in await pg.inner_text('#msg'), f'[{w}] more teams than people')
    await pg.fill('#tnum', ''); await pg.click('#go'); ok('whole number' in await pg.inner_text('#msg'), f'[{w}] empty number')
    await pg.fill('#tnum', '2'); await pg.click('#go'); await pg.click('#copy'); await pg.wait_for_timeout(100); cp = await pg.evaluate('window.__copied'); ok(cp.startswith('Team 1: ') and 'Team 2: ' in cp, f'[{w}] copy {cp!r}')
    await fill(pg, '#pnames', 'Solo'); await pg.click('#go'); ok('at least 2' in await pg.inner_text('#msg'), f'[{w}] one name')
    await pg.goto(B + 'random-name-picker/'); await pg.wait_for_timeout(200); ok((await st())['names'] == ['Solo'], f'[{w}] list not shared with picker')
    ok(not errs, f'[{w}] team errors: {errs}'); await ctx.close()

async def dice(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'dice-roller/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaParty.state()')
    await noscroll(pg, w, 'dice'); ok(await pg.locator('.die .cube').count() == 1 and await pg.locator('.die .face').count() == 6, f'[{w}] cube')
    await pg.fill('#dn', '2'); await pg.evaluate('DiliaParty.roll([3,5])'); s = await st()
    ok(s['vals'] == [3, 5] and await pg.inner_text('#dtotal') == '8' and '3 + 5 = 8' in await pg.inner_text('#dline'), f'[{w}] two dice {s} {await pg.inner_text("#dtotal")}')
    tf = await pg.evaluate("[...document.querySelectorAll('.die .cube')].map(c=>c.style.transform)"); ok(len(tf) == 2 and all('rotateX' in t for t in tf), f'[{w}] cube transforms {tf}')
    await pg.fill('#dn', '1'); await pg.click('button[data-s="20"]'); ok(await pg.input_value('#dsides') == '20' and await pg.get_attribute('button[data-s="20"]', 'aria-pressed') == 'true', f'[{w}] d20 chip')
    await pg.evaluate('DiliaParty.roll([17])'); ok(await pg.locator('.die .flat').inner_text() == '17' and await pg.inner_text('#dtotal') == '17', f'[{w}] d20 shows 17')
    await pg.fill('#dsides', '1'); await pg.evaluate('DiliaParty.roll()'); s = await st(); ok(s['sides'] == 2 and s['vals'][0] in (1, 2), f'[{w}] sides below 2 -> {s["sides"]}')
    await pg.fill('#dsides', '5000'); await pg.fill('#dn', '99'); await pg.evaluate('DiliaParty.roll()'); s = await st(); ok(s['sides'] == 1000 and s['count'] == 10, f'[{w}] clamps {s["sides"]} {s["count"]}')
    await pg.fill('#dsides', ''); await pg.evaluate('DiliaParty.roll()'); ok((await st())['sides'] == 6, f'[{w}] empty sides -> {(await st())["sides"]}')
    await pg.click('#dcopy'); await pg.wait_for_timeout(100); ok('total' in await pg.evaluate('window.__copied'), f'[{w}] copy')
    ok(not errs, f'[{w}] dice errors: {errs}'); await ctx.close()

async def coin(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'coin-flip/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaParty.state()')
    await noscroll(pg, w, 'coin'); await pg.evaluate('DiliaParty.flip(0)'); await pg.evaluate('DiliaParty.flip(1)'); await pg.evaluate('DiliaParty.flip(1)')
    s = await st(); ok(s['heads'] == 1 and s['tails'] == 2 and s['last'] == 1, f'[{w}] tally {s}'); ok(await pg.inner_text('#dtotal') == 'Tails', f'[{w}] result word')
    await pg.reload(); await pg.wait_for_timeout(300); ok((await st())['heads'] == 1 and (await st())['tails'] == 2, f'[{w}] tally not remembered')
    await pg.click('#cclear'); ok((await st())['heads'] == 0 and await pg.inner_text('#chead') == '0', f'[{w}] clear')
    n = 0
    for i in range(400): await pg.evaluate('DiliaParty.flip()')
    s = await st(); ok(s['heads'] + s['tails'] == 400 and 150 < s['heads'] < 250, f'[{w}] 400 random flips heads={s["heads"]}')
    ok(not errs, f'[{w}] coin errors: {errs}'); await ctx.close()

async def number(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'random-number-generator/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaParty.state()')
    await noscroll(pg, w, 'number'); await pg.click('#go'); o = (await st())['out']; ok(len(o) == 1 and 1 <= o[0] <= 100, f'[{w}] default {o}')
    await pg.fill('#nmin', '10'); await pg.fill('#nmax', '1'); await pg.click('#go'); ok('must not be above' in await pg.inner_text('#msg'), f'[{w}] min above max')
    await pg.fill('#nmin', '1.5'); await pg.fill('#nmax', '9'); await pg.click('#go'); ok('whole numbers' in await pg.inner_text('#msg'), f'[{w}] decimals')
    await pg.fill('#nmin', ''); await pg.click('#go'); ok('whole numbers' in await pg.inner_text('#msg'), f'[{w}] empty')
    await pg.fill('#nmin', '1'); await pg.fill('#nmax', '5'); await pg.fill('#ncount', '6'); await pg.check('#nnorep'); await pg.click('#go'); ok('only 5 different' in await pg.inner_text('#msg'), f'[{w}] too many without repeats')
    await pg.fill('#ncount', '5'); await pg.click('#go'); ok(sorted((await st())['out']) == [1, 2, 3, 4, 5], f'[{w}] permutation {(await st())["out"]}')
    await pg.fill('#nmin', '-3'); await pg.fill('#nmax', '3'); await pg.fill('#ncount', '100'); await pg.uncheck('#nnorep'); await pg.click('#go'); o = (await st())['out']; ok(len(o) == 100 and all(-3 <= x <= 3 for x in o), f'[{w}] negatives')
    await pg.fill('#nmin', '1'); await pg.fill('#nmax', '1000000000'); await pg.fill('#ncount', '50'); await pg.check('#nnorep'); await pg.click('#go'); o = (await st())['out']; ok(len(o) == 50 and len(set(o)) == 50, f'[{w}] big range no repeat')
    await pg.fill('#nmax', '2000000000'); await pg.click('#go'); ok('between -1,000,000,000' in await pg.inner_text('#msg'), f'[{w}] too big')
    await pg.fill('#nmin', '7'); await pg.fill('#nmax', '7'); await pg.fill('#ncount', '1'); await pg.uncheck('#nnorep'); await pg.click('#go'); ok((await st())['out'] == [7], f'[{w}] single value')
    await pg.click('#ncopy'); await pg.wait_for_timeout(100); ok(await pg.evaluate('window.__copied') == '7', f'[{w}] copy')
    ok(not errs, f'[{w}] number errors: {errs}'); await ctx.close()

async def hub(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'play/'); await pg.wait_for_timeout(300)
    for h in ('wheel-spinner/', 'team-maker/', 'dice-roller/'): ok(await pg.locator(f'.dailies a[href="../{h}"]').count() == 1, f'[{w}] hub card {h}')
    soon = await pg.inner_text('#h-soon + .pgrid') if await pg.locator('#h-soon + .pgrid').count() else ''; ok('Wheel spinner' not in soon and 'Dice' not in soon and 'team maker' not in soon.lower(), f'[{w}] built tools still listed as coming: {soon!r}')
    await noscroll(pg, w, 'hub'); ok(not errs, f'[{w}] hub errors: {errs}')
    await pg.keyboard.press('Control+K'); await pg.wait_for_timeout(300); await pg.keyboard.type('wheel'); await pg.wait_for_timeout(300)
    ok('Wheel spinner' in ' '.join(await pg.locator('.pr').all_inner_texts()), f'[{w}] search palette finds wheel'); await ctx.close()

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for w in (1280, 390):
            for f in (wheel, picker, teams, dice, coin, number, hub): await f(br, w)
        await wheel_motion(br, 1280)
        await br.close()
    print(n_ok + len(fails), 'checks,', len(fails), 'failed'); sys.exit(1 if fails else 0)
asyncio.run(main())
