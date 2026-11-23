"""Play area: plays each daily to the end in a real browser under the real _headers (port 8766).
Checks: same board as the Node generator, rules (start on 1, numbers in order), drag and keyboard, undo, resume after reload,
win, result saved, streak, hub status, sudoku levels/notes/hints/mistakes, other dates (clock moved), phone width, no errors.
Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-play.py"""
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

async def page(br, w, when, errs):
    ctx = await br.new_context(viewport={'width': w, 'height': 1000}, has_touch=w < 500)
    pg = await ctx.new_page()
    await pg.clock.install(time=when)
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith(('http://127.0.0.1:8766/', 'data:', 'blob:')) else None)
    return ctx, pg

async def centre(pg, i, n):
    box = await pg.locator('#board .pcell').nth(i).bounding_box()
    return box['x'] + box['width'] / 2, box['y'] + box['height'] / 2

async def path_tests(br, w, when, key):
    errs = []; ctx, pg = await page(br, w, when, errs)
    await pg.goto(B + 'daily-path/'); await pg.wait_for_timeout(300)
    Bd = await pg.evaluate('DiliaPathBoard()'); n = Bd['n']; N = n * n
    ok(Bd == node(f'G.makePath({json.dumps(key)})'), f'[{w}] browser board differs from Node board for {key}')
    ok(n == [7, 5, 5, 6, 6, 6, 7][(datetime.date.fromisoformat(key).isoweekday()) % 7], f'[{w}] wrong size {n} for {key}')
    ok(await pg.locator('#board .pcell').count() == N, f'[{w}] cell count')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on path page')
    clues = Bd['clues']; path = Bd['path']
    # rule: must start on 1
    not1 = next(i for i in range(N) if clues[i] != 1)
    x, y = await centre(pg, not1, n); await pg.mouse.click(x, y)
    ok('Start on 1' in await pg.inner_text('#msg'), f'[{w}] no "Start on 1" message')
    ok(await pg.inner_text('#pfill') == '0 / ' + str(N), f'[{w}] line started off 1')
    # keyboard: first arrow starts on 1, then follow the answer for 4 steps, undo one
    await pg.focus('#board'); await pg.keyboard.press('ArrowRight')
    def key_for(a, b): return {1: 'ArrowRight', -1: 'ArrowLeft', n: 'ArrowDown', -n: 'ArrowUp'}[b - a]
    for k in range(4): await pg.keyboard.press(key_for(path[k], path[k + 1]))
    ok(await pg.inner_text('#pfill') == f'5 / {N}', f'[{w}] keyboard steps: {await pg.inner_text("#pfill")}')
    await pg.keyboard.press('Backspace')
    ok(await pg.inner_text('#pfill') == f'4 / {N}', f'[{w}] backspace undo')
    # rule: a number out of order is refused (find a clue > next wanted that is next to the end, if any)
    # resume: reload keeps the line
    await pg.wait_for_timeout(1100)
    await pg.reload(); await pg.wait_for_timeout(300)
    ok(await pg.inner_text('#pfill') == f'4 / {N}', f'[{w}] line not restored after reload')
    ok('Welcome back' in await pg.inner_text('#msg'), f'[{w}] no welcome back')
    # clear, then drag the whole answer
    await pg.click('#reset')
    ok(await pg.inner_text('#pfill') == f'0 / {N}', f'[{w}] clear')
    x, y = await centre(pg, path[0], n); await pg.mouse.move(x, y); await pg.mouse.down()
    for k in range(1, N):
        x, y = await centre(pg, path[k], n); await pg.mouse.move(x, y, steps=2)
        if k == N // 2:  # drag back one square and forward again (undo by dragging)
            x2, y2 = await centre(pg, path[k - 1], n); await pg.mouse.move(x2, y2, steps=2); await pg.mouse.move(x, y, steps=2)
    await pg.mouse.up(); await pg.wait_for_timeout(400)
    ok(await pg.is_visible('#done'), f'[{w}] win panel not shown after full path ({await pg.inner_text("#pfill")})')
    rec = await pg.evaluate(f"JSON.parse(localStorage.getItem('dilia-play-v1')).days[{json.dumps(key)}].path")
    ok(rec and isinstance(rec.get('t'), int), f'[{w}] result not saved: {rec}')
    ok(await pg.inner_text('#streak') == '1', f'[{w}] streak not 1')
    ok(await pg.evaluate(f"localStorage.getItem('dilia-play-save:path:{key}')") is None, f'[{w}] in-progress save not cleared')
    # after the win: reload shows solved board, input ignored
    await pg.reload(); await pg.wait_for_timeout(300)
    ok(await pg.is_visible('#done') and await pg.inner_text('#pfill') == f'{N} / {N}', f'[{w}] solved state not shown after reload')
    # share falls back to copying text when the browser cannot share files
    # (capture the copied text on the page: the system clipboard is shared between test runs)
    await pg.evaluate("navigator.share = undefined; navigator.canShare = undefined; window.__clip = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__clip = t; return Promise.resolve(); } }, configurable: true })")
    await pg.click('#share')
    try: await pg.wait_for_function('window.__clip', timeout=8000)
    except Exception: pass
    clip = await pg.evaluate('window.__clip')
    ok('copied' in await pg.inner_text('#msg'), f'[{w}] no "copied" message')
    ok(f'Daily path #{Bd["no"]}' in clip and 'daily-path/' in clip, f'[{w}] share text wrong: {clip!r}')
    async with pg.expect_download() as dl: await pg.click('#saveimg')
    d = await dl.value; ok(d.suggested_filename == f'dilia-daily-path-{Bd["no"]}.png', f'[{w}] image name {d.suggested_filename}')
    # hub shows the result and the streak; home shows today's number
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(300)
    ok('Solved in' in await pg.inner_text('#s-path'), f'[{w}] hub path status: {await pg.inner_text("#s-path")}')
    ok((await pg.inner_text('#hstreak')).startswith('1 day'), f'[{w}] hub streak')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on hub')
    await pg.goto(B); await pg.wait_for_timeout(300)
    ok(await pg.inner_text('#t-pz') == f'Daily path #{Bd["no"]}', f'[{w}] home strip: {await pg.inner_text("#t-pz")}')
    await ctx.close()
    ok(not errs, f'[{w}] path errors: {errs[:3]}')

async def order_rule(br, when, key):
    """Entering a number before its turn is refused (mouse click next to the line end)."""
    errs = []; ctx, pg = await page(br, 1280, when, errs)
    await pg.goto(B + 'daily-path/'); await pg.wait_for_timeout(300)
    Bd = await pg.evaluate('DiliaPathBoard()'); n = Bd['n']; clues = Bd['clues']
    one = clues.index(1)
    adj = [one + d for d in (1, -1, n, -n) if 0 <= one + d < n * n and not (d == 1 and one % n == n - 1) and not (d == -1 and one % n == 0)]
    bad = [c for c in adj if clues[c] and clues[c] != 2]
    x, y = await centre(pg, one, n); await pg.mouse.click(x, y)
    if bad:
        x, y = await centre(pg, bad[0], n); await pg.mouse.click(x, y)
        ok('first' in await pg.inner_text('#msg') and await pg.inner_text('#pfill') == f'1 / {n*n}', 'out-of-order number accepted')
    else:
        ok(True, '')
    await ctx.close(); ok(not errs, f'order errors {errs[:3]}')

async def early_end(br):
    """Owner's case, 23 Nov 2026: the line reaches 7 with 4 squares empty. The page must say so and flash them."""
    errs = []; ctx, pg = await page(br, 390, datetime.datetime.fromisoformat('2026-11-23T06:43:00'), errs)
    await pg.goto(B + 'daily-path/'); await pg.wait_for_timeout(300)
    Bd = await pg.evaluate('DiliaPathBoard()'); n = Bd['n']
    line = [0, 1, 2, 3, 4, 9, 14, 19, 18, 13, 12, 17, 22, 21, 20, 15, 16, 11, 6, 7, 8]
    ok(n == 5 and Bd['clues'][8] == Bd['last'] == 7, 'owner board changed (expected 7 at row 2 col 4)')
    await pg.focus('#board'); await pg.keyboard.press('ArrowRight')
    for a, c in zip(line, line[1:]):
        await pg.keyboard.press({1: 'ArrowRight', -1: 'ArrowLeft', n: 'ArrowDown', -n: 'ArrowUp'}[c - a])
    ok(await pg.inner_text('#pfill') == '21 / 25', f'early line length {await pg.inner_text("#pfill")}')
    ok('4 squares are still empty' in await pg.inner_text('#msg'), f'no early-end message: {await pg.inner_text("#msg")!r}')
    ok(await pg.locator('#board .pcell.miss').count() == 4, 'empty squares not flashed')
    ok(not await pg.is_visible('#done'), 'early line counted as solved')
    await ctx.close(); ok(not errs, f'early errors {errs[:3]}')

async def solve_keys(pg, Bd):
    n = Bd['n']; path = Bd['path']
    await pg.focus('#board'); await pg.keyboard.press('ArrowRight')
    for a, c in zip(path, path[1:]):
        await pg.keyboard.press({1: 'ArrowRight', -1: 'ArrowLeft', n: 'ArrowDown', -n: 'ArrowUp'}[c - a])

async def levels_tests(br, w):
    """Endless path: level 1 first, next level opens only after a win, progress kept, 8×8 from level 61."""
    errs = []; ctx, pg = await page(br, w, datetime.datetime.fromisoformat('2026-11-23T08:00:00'), errs)
    await pg.goto(B + 'path-puzzle/'); await pg.wait_for_timeout(300)
    ok(await pg.inner_text('#pno') == 'Level 1' and await pg.is_disabled('#lnext') and await pg.is_disabled('#lprev'), f'[{w}] levels start: {await pg.inner_text("#pno")}')
    L1 = await pg.evaluate('DiliaPathBoard()'); ok(L1 == node('(b => (b.no = b.no, b))(G.makeLevel(1))'), f'[{w}] level 1 board differs from Node')
    await solve_keys(pg, L1); await pg.wait_for_timeout(300)
    ok(await pg.is_visible('#done') and 'Level 1 solved' in await pg.inner_text('#dline'), f'[{w}] level 1 win: {await pg.inner_text("#dline")}')
    ok(await pg.inner_text('#streak') == '1', f'[{w}] levels solved count')
    await pg.click('#dnext'); await pg.wait_for_timeout(200)
    ok(await pg.inner_text('#pno') == 'Level 2' and not await pg.is_visible('#done') and not await pg.is_disabled('#lprev'), f'[{w}] next level')
    ok(await pg.evaluate("JSON.parse(localStorage.getItem('dilia-play-v1')).days") is None, f'[{w}] level win counted as a daily')
    await pg.goto(B + 'path-puzzle/#40'); await pg.wait_for_timeout(300)
    ok(await pg.inner_text('#pno') == 'Level 2', f'[{w}] locked level opened: {await pg.inner_text("#pno")}')
    await pg.click('#lprev'); await pg.wait_for_timeout(200)
    ok(await pg.inner_text('#pno') == 'Level 1' and await pg.is_visible('#done'), f'[{w}] solved level 1 not shown as solved')
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(300)
    ok('Continue: level 2' in await pg.inner_text('#s-levels'), f'[{w}] hub levels: {await pg.inner_text("#s-levels")}')
    # jump to level 61 (8×8) by marking 1-60 solved
    await pg.evaluate("(() => { const o = JSON.parse(localStorage.getItem('dilia-play-v1')); for (let i = 1; i <= 60; i++) o.lv.path[i] = 100 + i; localStorage.setItem('dilia-play-v1', JSON.stringify(o)); })()")
    t0 = await pg.evaluate('performance.now()')
    await pg.goto(B + 'path-puzzle/'); await pg.wait_for_timeout(300)
    B8 = await pg.evaluate('DiliaPathBoard()')
    ok(await pg.inner_text('#pno') == 'Level 61' and B8['n'] == 8 and await pg.locator('#board .pcell').count() == 64, f'[{w}] level 61 not 8x8')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on 8x8')
    await solve_keys(pg, B8); await pg.wait_for_timeout(300)
    ok(await pg.is_visible('#done'), f'[{w}] 8x8 win')
    await ctx.close(); ok(not errs, f'[{w}] levels errors {errs[:3]}')

async def sudoku_tests(br, w, when, key):
    errs = []; ctx, pg = await page(br, w, when, errs)
    await pg.goto(B + 'daily-sudoku/'); await pg.wait_for_timeout(300)
    S = await pg.evaluate('DiliaSudokuBoard()')
    ref = node(f'G.makeSudoku({json.dumps(key)}, "easy")')
    ok(S['grid'] == ref['grid'] and S['solution'] == ref['solution'], f'[{w}] sudoku board differs from Node')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on sudoku')
    empty = [i for i in range(81) if not S['grid'][i]]
    ok(await pg.inner_text('#sleft') == str(len(empty)), f'[{w}] left count')
    cells = pg.locator('#sgrid .pcell')
    # given squares cannot change
    giv = next(i for i in range(81) if S['grid'][i])
    await cells.nth(giv).click(); await pg.keyboard.press('5' if S['grid'][giv] != 5 else '6')
    ok(await cells.nth(giv).inner_text() == str(S['grid'][giv]), f'[{w}] given square changed')
    # clash shows pink; mistakes mode shows a wrong (non-clashing) number too
    e0 = empty[0]; await cells.nth(e0).click()
    r = e0 // 9; clash = next(S['grid'][r * 9 + k] for k in range(9) if S['grid'][r * 9 + k])
    await pg.keyboard.press(str(clash))
    ok('bad' in (await cells.nth(e0).get_attribute('class')), f'[{w}] clash not marked')
    await pg.click('#undo'); ok(await cells.nth(e0).inner_text() == '', f'[{w}] undo')
    # notes mode
    await cells.nth(e0).click(); await pg.click('#notes'); await pg.click('#pad button[data-d="3"]'); await pg.click('#pad button[data-d="5"]')
    ok((await cells.nth(e0).inner_text()).split() == ['3', '5'], f'[{w}] notes: {await cells.nth(e0).inner_text()!r}')
    await pg.click('#notes')
    # erase clears notes
    await pg.click('#erase'); ok(await cells.nth(e0).inner_text() == '', f'[{w}] erase notes')
    # hint fills the selected square with the answer
    await cells.nth(e0).click(); await pg.click('#hint')
    ok(await cells.nth(e0).inner_text() == str(S['solution'][e0]), f'[{w}] hint')
    # fill all but the last via keyboard, reload, resume
    await pg.focus('#sgrid')
    for i in empty[1:-1]:
        await cells.nth(i).click(); await pg.keyboard.press(str(S['solution'][i]))
    await pg.wait_for_timeout(300); await pg.reload(); await pg.wait_for_timeout(300)
    ok(await pg.inner_text('#sleft') == '1', f'[{w}] sudoku not resumed: left {await pg.inner_text("#sleft")}')
    last = empty[-1]; await cells.nth(last).click(); await pg.keyboard.press(str(S['solution'][last])); await pg.wait_for_timeout(300)
    ok(await pg.is_visible('#done'), f'[{w}] sudoku win panel missing')
    ok('1 hint' in await pg.inner_text('#dline'), f'[{w}] hint not counted: {await pg.inner_text("#dline")}')
    ok(await pg.is_visible('#dnext') and await pg.inner_text('#dnext') == 'Play medium', f'[{w}] next level button')
    rec = await pg.evaluate(f"JSON.parse(localStorage.getItem('dilia-play-v1')).days[{json.dumps(key)}]['sudoku-easy']")
    ok(rec and rec.get('h') == 1, f'[{w}] sudoku result {rec}')
    await pg.click('#dnext'); await pg.wait_for_timeout(200)
    ok(await pg.get_attribute('.levels button[data-lv="medium"]', 'aria-pressed') == 'true' and not await pg.is_visible('#done'), f'[{w}] medium not opened')
    M = await pg.evaluate('DiliaSudokuBoard()'); ok(M['grid'] == node(f'G.makeSudoku({json.dumps(key)}, "medium")')['grid'], f'[{w}] medium board differs')
    ok(await pg.locator('.levels button[data-lv="easy"] i').count() == 1, f'[{w}] easy solved mark')
    # mistakes mode
    m0 = next(i for i in range(81) if not M['grid'][i])
    peers = set(); r0, c0 = divmod(m0, 9)
    for k in range(81):
        r, c = divmod(k, 9)
        if r == r0 or c == c0 or (r // 3 == r0 // 3 and c // 3 == c0 // 3): peers.add(M['grid'][k])
    wrong = next((d for d in range(1, 10) if d != M['solution'][m0] and d not in peers), None)
    if wrong:
        await cells.nth(m0).click(); await pg.keyboard.press(str(wrong))
        ok('bad' not in (await cells.nth(m0).get_attribute('class')), f'[{w}] non-clash marked before mistakes mode')
        await pg.click('#check'); ok('bad' in (await cells.nth(m0).get_attribute('class')), f'[{w}] mistakes mode did not mark wrong number')
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(300)
    t = await pg.inner_text('#s-sudoku'); ok('✓ Easy' in t and (('Medium: continue' in t) if wrong else ('Medium' in t)), f'[{w}] hub sudoku status {t!r}')
    await ctx.close()
    ok(not errs, f'[{w}] sudoku errors: {errs[:3]}')

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for w, when in ((1280, '2026-11-23T10:00:00'), (390, '2026-11-28T23:30:00'), (820, '2026-12-02T00:05:00')):
            key = when[:10]
            await path_tests(br, w, datetime.datetime.fromisoformat(when), key)
            await sudoku_tests(br, w, datetime.datetime.fromisoformat(when), key)
        for when in ('2026-11-23T09:00:00', '2026-11-24T09:00:00', '2026-11-26T09:00:00', '2026-11-29T09:00:00'):
            await order_rule(br, datetime.datetime.fromisoformat(when), when[:10])
        await early_end(br)
        await levels_tests(br, 1280); await levels_tests(br, 390)
        # the day number follows the local date (#1 on launch day, #6 on Saturday 28 Nov)
        errs = []; ctx, pg = await page(br, 1280, datetime.datetime.fromisoformat('2026-11-28T12:00:00'), errs)
        await pg.goto(B + 'play/'); await pg.wait_for_timeout(300)
        ok('#6' in await pg.inner_text('#hno') and '7 × 7' in await pg.inner_text('#n-path'), f'day number/size: {await pg.inner_text("#hno")} {await pg.inner_text("#n-path")}')
        await ctx.close()
        await br.close()
    print(n_ok + len(fails), 'checks,', len(fails), 'failed')
    sys.exit(1 if fails else 0)
asyncio.run(main())
