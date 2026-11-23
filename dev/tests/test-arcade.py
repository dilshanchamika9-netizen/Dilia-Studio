"""Arcade and skill games in a real browser under the real _headers (port 8766): snake, reaction time, typing test.
Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-arcade.py"""
import asyncio, json, pathlib, subprocess, sys, datetime
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]; B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
def node(expr):
    js = f"const G=require({json.dumps(str(ROOT / 'assets/playgen.js'))});console.log(JSON.stringify({expr}))"
    return json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)

async def page(br, w, clock=False):
    ctx = await br.new_context(viewport={'width': w, 'height': 1000}, has_touch=w < 500)
    pg = await ctx.new_page(); errs = []
    if clock: await pg.clock.install(time=datetime.datetime.fromisoformat('2026-11-23T10:00:00'))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith(('http://127.0.0.1:8766/', 'data:', 'blob:')) else None)
    return ctx, pg, errs

SHARE = "window.__shared = ''; navigator.share = async d => { window.__shared = d.text; }; navigator.canShare = undefined;"

# ---------------------------------------------------------------- snake
async def snake_tests(br, w):
    ctx, pg, errs = await page(br, w)
    st = lambda: pg.evaluate('DiliaSnake.state()')
    await pg.goto(B + 'snake/'); await pg.wait_for_timeout(300)
    s = await st(); ok(len(s['body']) == 3 and s['run'] == 'idle' and s['mode'] == 'classic', f'[{w}] snake start {s}')
    ok(await pg.is_visible('#snkov') and 'start' in (await pg.inner_text('#snkov')).lower(), f'[{w}] start hint missing')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on snake')
    box = await pg.locator('#snkbox').bounding_box(); ok(abs(box['width'] - box['height']) < 2 and box['width'] > 250, f'[{w}] board not square {box}')
    cw = await pg.evaluate('document.getElementById("snk").width'); ok(cw >= box['width'] - 2, f'[{w}] canvas not sharp: {cw} vs {box["width"]}')
    # a turn back on itself is ignored; the game starts on the first key
    await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(500)
    s = await st(); ok(s['run'] == 'run' and s['dir'] == 1 and not s['dead'], f'[{w}] reverse at start should be ignored: {s}')
    # eating: put the apple straight ahead
    head = s['body'][0]; await pg.evaluate(f'DiliaSnake.food({head + 1})'); await pg.wait_for_timeout(1)
    for _ in range(40):
        s = await st()
        if s['score'] == 1: break
        await pg.wait_for_timeout(40)
    ok(s['score'] == 1 and len(s['body']) == 4, f'[{w}] apple not eaten: {s}')
    ok(await pg.inner_text('#kscore') == '1' and await pg.inner_text('#klen') == '4', f'[{w}] meters not updated')
    # pause with Space, hidden-tab style blur pause, resume with a key
    await pg.keyboard.press('Space'); await pg.wait_for_timeout(100); s = await st(); ok(s['run'] == 'pause', f'[{w}] Space should pause: {s["run"]}')
    h1 = (await st())['body'][0]; await pg.wait_for_timeout(500); ok((await st())['body'][0] == h1, f'[{w}] moved while paused')
    await pg.keyboard.press('Space'); await pg.wait_for_timeout(100); ok((await st())['run'] == 'run', f'[{w}] Space should resume')
    await pg.evaluate('window.dispatchEvent(new Event("blur"))'); ok((await st())['run'] == 'pause', f'[{w}] blur should pause')
    await pg.keyboard.press('ArrowUp'); await pg.wait_for_timeout(100); ok((await st())['run'] == 'run', f'[{w}] a turn key should resume')
    # phone controls: swipe on the board, then the buttons
    box = await pg.locator('#snkbox').bounding_box(); cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx + 60, cy, steps=4); await pg.mouse.up(); await pg.wait_for_timeout(200)
    ok((await st())['dir'] == 1 or (await st())['dead'], f'[{w}] swipe right ignored: {await st()}')
    if w < 700:
        ok(await pg.is_visible('.dpad'), f'[{w}] buttons should show on a phone')
        await pg.click('.dpad .d'); await pg.wait_for_timeout(250); s = await st(); ok(s['dir'] == 2 or s['dead'], f'[{w}] down button: {s}')
    else: ok(not await pg.is_visible('.dpad'), f'[{w}] buttons should hide on a mouse device')
    # classic: the wall ends the game; best is saved; share text
    for _ in range(80):
        s = await st()
        if s['dead']: break
        await pg.wait_for_timeout(100)
    ok(s['dead'] and s['run'] == 'over', f'[{w}] classic did not end at a wall/own body: {s}')
    ok(await pg.is_visible('#done') and (await pg.inner_text('#dtime')) == str(s['score']), f'[{w}] game over panel')
    best = await pg.evaluate("JSON.parse(localStorage.getItem('dilia-snake-best')||'{}').classic")
    ok(best == s['score'] and best >= 1, f'[{w}] best not saved: {best} vs {s["score"]}')
    await pg.evaluate(SHARE); await pg.wait_for_timeout(300); await pg.click('#share'); await pg.wait_for_timeout(300)
    ok('Snake' in await pg.evaluate('window.__shared') and f'{s["score"]} points' in await pg.evaluate('window.__shared'), f'[{w}] share text {await pg.evaluate("window.__shared")!r}')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100); s = await st(); ok(s['run'] == 'idle' and len(s['body']) == 3 and s['score'] == 0, f'[{w}] Esc after game over should start a new game: {s}')
    # modern: edges wrap, no wall death, a star after the 5th apple (rules are in the Node tests); mode is remembered
    await pg.click('.mlevel button[data-m=modern]'); await pg.wait_for_timeout(100)
    ok((await st())['mode'] == 'modern', f'[{w}] modern not selected'); ok('wrap' in (await pg.inner_text('#kmodeline')).lower(), f'[{w}] modern line')
    await pg.keyboard.press('ArrowUp'); await pg.wait_for_timeout(60)
    await pg.evaluate('DiliaSnake.food(0)')
    ys = set()
    for _ in range(26):
        ys.add((await st())['body'][0] // 20); await pg.wait_for_timeout(125)
    s = await st(); ok(not s['dead'] and len(ys) >= 15, f'[{w}] modern should wrap the top edge: alive={not s["dead"]} rows={len(ys)}')
    await pg.reload(); await pg.wait_for_timeout(300); ok((await st())['mode'] == 'modern', f'[{w}] mode not remembered')
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(300)
    ok(f'Best {best}' in await pg.inner_text('#s-snake'), f'[{w}] hub snake chip {await pg.inner_text("#s-snake")!r}')
    ok(not errs, f'[{w}] snake errors: {errs}')
    await ctx.close()

# ---------------------------------------------------------------- reaction time
async def reaction_tests(br, w):
    ctx, pg, errs = await page(br, w, clock=True)
    st = lambda: pg.evaluate('DiliaReaction.state()')
    await pg.goto(B + 'reaction-time/'); await pg.wait_for_timeout(300)
    await pg.clock.pause_at(datetime.datetime.fromisoformat('2026-11-23T11:00:00'))   # time moves only when the test says so
    ok((await st())['st'] == 'idle' and await pg.inner_text('#rxbig') == 'Tap to start', f'[{w}] reaction start')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on reaction')
    await pg.click('#rxpad'); ok((await st())['st'] == 'wait', f'[{w}] should be waiting'); ok('Wait' in await pg.inner_text('#rxbig'), f'[{w}] wait text')
    await pg.click('#rxpad'); s = await st(); ok(s['st'] == 'early' and not s['round'], f'[{w}] tap too soon should not count: {s}')
    ok(await pg.evaluate("(JSON.parse(localStorage.getItem('dilia-reaction-v1')||'{}').a||[]).length") == 0, f'[{w}] early tap was stored')
    gaps = [250, 190, 310, 230, 270]; got = []
    for k, gap in enumerate(gaps):
        await pg.click('#rxpad'); ok((await st())['st'] == 'wait', f'[{w}] try {k + 1} not waiting')
        await pg.clock.run_for(1400); ok((await st())['st'] == 'wait', f'[{w}] green came before 1.5 s')
        waited = 1400
        while (await st())['st'] == 'wait' and waited < 5200: await pg.clock.run_for(16); waited += 16
        ok((await st())['st'] == 'go' and await pg.inner_text('#rxbig') == 'TAP!' and 1500 <= waited <= 4600, f'[{w}] green did not come in 1.5 to 4.5 s (waited {waited})')
        await pg.clock.run_for(gap); await pg.click('#rxpad')
        a = await pg.evaluate("JSON.parse(localStorage.getItem('dilia-reaction-v1')).a"); got.append(a[-1])
        ok(gap - 20 <= a[-1] <= gap + 20, f'[{w}] time {a[-1]} ms for a {gap} ms wait')
    ok(len(got) == 5 and await pg.is_visible('#done'), f'[{w}] round should be done')
    avg = round(sum(got) / 5); ok(await pg.inner_text('#dtime') == f'{avg} ms', f'[{w}] average {await pg.inner_text("#dtime")!r} vs {avg}')
    ok(await pg.inner_text('#rxbest') == f'{min(got)} ms' and await pg.inner_text('#rxcount') == '5', f'[{w}] stats {await pg.inner_text("#rxbest")}')
    ok(await pg.locator('#rxchart rect').count() == 5 and await pg.locator('#rxchart rect.bb').count() == 1, f'[{w}] chart bars')
    await pg.evaluate(SHARE); await pg.wait_for_timeout(300); await pg.click('#share'); await pg.wait_for_timeout(300)
    ok(f'{avg} ms' in await pg.evaluate('window.__shared'), f'[{w}] share text')
    await pg.focus('#rxpad'); await pg.keyboard.press('Space'); ok((await st())['st'] == 'wait' and not await pg.is_visible('#done'), f'[{w}] Space should start the next round')
    await pg.keyboard.press('Space'); ok((await st())['st'] == 'early', f'[{w}] Space too soon')
    await pg.reload(); await pg.wait_for_timeout(300)
    ok(await pg.inner_text('#rxcount') == '5' and await pg.locator('#rxchart rect').count() == 5, f'[{w}] history lost after reload')
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(300); ok(f'Fastest {min(got)} ms' in await pg.inner_text('#s-rx'), f'[{w}] hub chip {await pg.inner_text("#s-rx")!r}')
    await pg.goto(B + 'reaction-time/'); await pg.wait_for_timeout(300)
    await pg.click('#rxclear'); ok(await pg.inner_text('#rxcount') == '5', f'[{w}] clear should ask first')
    await pg.click('#rxclear'); ok(await pg.inner_text('#rxcount') == '0' and await pg.locator('#rxchart rect').count() == 0, f'[{w}] clear history')
    ok(not errs, f'[{w}] reaction errors: {errs}')
    await ctx.close()

# ---------------------------------------------------------------- typing test
async def typing_tests(br, w):
    ctx, pg, errs = await page(br, w, clock=True)
    st = lambda: pg.evaluate('DiliaTyping.state()')
    await pg.goto(B + 'typing-test/'); await pg.wait_for_timeout(300)
    s = await st(); ok(s['lang'] == 'en' and s['dur'] == 30 and not s['run'], f'[{w}] typing start {s}')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on typing')
    ok(await pg.locator('.tw').count() == 160, f'[{w}] 30 s should have 160 words, got {await pg.locator(".tw").count()}')
    await pg.click('#tybox'); await pg.keyboard.type(' '); s = await st(); ok(not s['run'] and await pg.input_value('#tin') == '', f'[{w}] a leading space should be ignored')
    words = (await st())['words']
    # type 3 right words, 1 wrong word, then 2 half-typed letters of the next
    await pg.keyboard.type(words[0] + ' ' + words[1] + ' ' + words[2] + ' '); await pg.keyboard.type('qqqq '); await pg.keyboard.type(words[4][:2])
    s = await st(); ok(s['run'] and s['i'] == 4 and s['typed'] == [words[0], words[1], words[2], 'qqqq'], f'[{w}] typed words {s["typed"]}')
    cls = await pg.evaluate("[...document.querySelectorAll('.tw')].slice(0,6).map(e => e.className.replace('tw','').trim())")
    ok(cls[:4] == ['good', 'good', 'good', 'wrong'] and cls[4] == 'cur', f'[{w}] word classes {cls}')
    ok(await pg.locator('.tw.cur i.ok').count() == 2, f'[{w}] current word letters not marked')
    await pg.keyboard.type('zz'); ok(await pg.locator('.tw.cur i.bad, .tw.cur i.x').count() >= 1, f'[{w}] wrong/extra letter not marked')
    await pg.keyboard.press('Backspace'); await pg.keyboard.press('Backspace')
    await pg.clock.run_for(5000); ok(await pg.inner_text('#ttime') in ('25', '26'), f'[{w}] countdown {await pg.inner_text("#ttime")}')
    await pg.clock.run_for(26000); ok(await pg.is_visible('#done') and (await st())['over'], f'[{w}] test should end at 30 s')
    s = await st(); want = node(f'G.typingScore({json.dumps(words)}, {json.dumps(s["typed"] + [words[4][:2]])}, 30, true)')
    ok(await pg.inner_text('#dtime') == f'{round(want["wpm"])} WPM', f'[{w}] WPM {await pg.inner_text("#dtime")!r} vs {want["wpm"]}')
    line = await pg.inner_text('#dline'); ok(f'Accuracy {round(want["acc"] * 10) / 10:g}%' in line and f'{want["words"]} words right' in line, f'[{w}] result line {line!r} vs {want}')
    ok(await pg.input_value('#tin') == '', f'[{w}] input should be cleared after the test')
    await pg.keyboard.type('abc'); ok(await pg.input_value('#tin') == '' or (await st())['over'], f'[{w}] typing after the end')
    await pg.evaluate(SHARE); await pg.wait_for_timeout(300); await pg.click('#share'); await pg.wait_for_timeout(300)
    ok('WPM' in await pg.evaluate('window.__shared') and 'English' in await pg.evaluate('window.__shared'), f'[{w}] share text {await pg.evaluate("window.__shared")!r}')
    rec = await pg.evaluate("JSON.parse(localStorage.getItem('dilia-typing-v1'))")
    ok(rec['best']['en-30']['wpm'] == round(want['wpm']) and len(rec['hist']) == 1, f'[{w}] saved result {rec}')
    ok(round(want['wpm']) > 0 and await pg.inner_text('#tbest') == f'{round(want["wpm"])} WPM' and await pg.locator('#thist li').count() == 1, f'[{w}] best / recent list')
    # restart, Esc, time options
    await pg.click('#dagain'); s = await st(); ok(not s['over'] and not s['run'] and s['i'] == 0 and not await pg.is_visible('#done'), f'[{w}] try again')
    await pg.click('.msize button[data-d="15"]'); ok(await pg.locator('.tw').count() == 90 and await pg.inner_text('#ttime') == '15', f'[{w}] 15 s setup')
    await pg.click('#tybox'); await pg.keyboard.type('xx'); ok((await st())['run'], f'[{w}] timer should start at the first key')
    await pg.keyboard.press('Escape'); s = await st(); ok(not s['run'] and s['i'] == 0 and await pg.input_value('#tin') == '', f'[{w}] Esc should start again')
    # finishing early by running out of time with nothing typed right gives 0 and 100% accuracy rules
    await pg.keyboard.type('##'); await pg.clock.run_for(16000); ok(await pg.is_visible('#done') and await pg.inner_text('#dtime') == '0 WPM', f'[{w}] 15 s finish: {await pg.inner_text("#dtime")!r}')
    # leaving the page stops a running test
    await pg.click('#dagain'); await pg.click('#tybox'); await pg.keyboard.type('x')
    await pg.evaluate("Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
    ok(not (await st())['run'] and 'left the page' in await pg.inner_text('#msg'), f'[{w}] leaving should stop the test')
    await pg.evaluate("Object.defineProperty(document, 'hidden', {value: false, configurable: true})")
    # other languages: each shows words from its own list, the right direction, and right words count
    L = {'es': 'más', 'pt': 'não', 'ar': 'في', 'hi': 'में'}
    lists = json.loads(subprocess.run(['node', '-e', f"console.log(JSON.stringify(require({json.dumps(str(ROOT / 'assets/typing-words.js'))})))"], capture_output=True, text=True, check=True).stdout)
    for lg in ['es', 'pt', 'ar', 'hi']:
        await pg.click(f'.tlang button[data-l={lg}]'); s = await st(); ok(s['lang'] == lg, f'[{w}] {lg} not selected')
        ok(all(x in lists[lg] for x in s['words']), f'[{w}] {lg} words not from the list')
        ok(await pg.evaluate('document.getElementById("tywords").dir') == ('rtl' if lg == 'ar' else 'ltr') and await pg.evaluate('document.getElementById("tin").lang') == lg, f'[{w}] {lg} direction/lang')
        await pg.click('#tybox'); first, second = s['words'][0], s['words'][1]
        await pg.keyboard.type(first + ' '); await pg.keyboard.type(second + 'x ')
        s = await st(); ok(s['typed'] == [first, second + 'x'], f'[{w}] {lg} typed {s["typed"]} vs {[first, second + "x"]}')
        cls = await pg.evaluate("[...document.querySelectorAll('.tw')].slice(0,2).map(e => e.className.replace('tw','').trim())")
        ok(cls == ['good', 'wrong'], f'[{w}] {lg} classes {cls}')
        await pg.keyboard.press('Escape')
    # a finished Arabic test is scored on whole words and saved under its own key
    await pg.click('.tlang button[data-l=ar]'); await pg.click('.msize button[data-d="15"]'); s = await st(); ws = s['words']
    await pg.click('#tybox'); await pg.keyboard.type(' '.join(ws[:5]) + ' '); await pg.clock.run_for(16000)
    want = node(f'G.typingScore({json.dumps(ws[:90])}, {json.dumps(ws[:5])}, 15, false)')
    ok(await pg.inner_text('#dtime') == f'{round(want["wpm"])} WPM' and await pg.evaluate("!!JSON.parse(localStorage.getItem('dilia-typing-v1')).best['ar-15']"), f'[{w}] arabic result {await pg.inner_text("#dtime")!r} vs {want["wpm"]}')
    await pg.reload(); await pg.wait_for_timeout(300); s = await st(); ok(s['lang'] == 'ar' and s['dur'] == 15, f'[{w}] language/time not remembered: {s["lang"]} {s["dur"]}')
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(300); ok('WPM' in await pg.inner_text('#s-typing'), f'[{w}] hub typing chip {await pg.inner_text("#s-typing")!r}')
    ok(not errs, f'[{w}] typing errors: {errs}')
    await ctx.close()

async def hub_tests(br, w):
    ctx, pg, errs = await page(br, w)
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(300)
    for href in ('snake/', 'typing-test/', 'reaction-time/'): ok(await pg.locator(f'.dailies a[href="../{href}"]').count() == 1, f'[{w}] hub card {href}')
    soon = await pg.inner_text('#h-soon + .pgrid') if await pg.locator('#h-soon + .pgrid').count() else ''
    ok('Snake' not in soon and 'Typing test' not in soon and 'Reaction' not in soon, f'[{w}] built games still listed as coming: {soon!r}')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on hub')
    ok(not errs, f'[{w}] hub errors: {errs}'); await ctx.close()

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for w in (1280, 390):
            await snake_tests(br, w); await reaction_tests(br, w); await typing_tests(br, w); await hub_tests(br, w)
        await br.close()
    print(n_ok + len(fails), 'checks,', len(fails), 'failed')
    sys.exit(1 if fails else 0)
asyncio.run(main())
