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

SIM = """(key, dirs) => { const R0 = G.rng('merge:' + key); let c = 0; const R = () => { c++; return R0(); }; R.int = k => Math.floor(R() * k);
  let g = new Array(16).fill(null), id = 1, score = 0, moves = 0;
  for (let k = 0; k < 2; k++) { const s = G.mergeSpawn(g, R); g[s.at] = { id: id++, v: s.v }; }
  for (const d of dirs) { const r = G.mergeMove(g, 4, d); if (!r.moved) continue; r.grid.forEach(t => { if (t && t.id === null) t.id = id++; }); g = r.grid; score += r.gain; moves++; const s = G.mergeSpawn(g, R); if (s) g[s.at] = { id: id++, v: s.v }; }
  return { cells: g.map(t => (t ? t.v : 0)), score, moves, draws: c }; }"""

async def merge_tests(br, w):
    errs = []; ctx, pg = await page(br, w, datetime.datetime.fromisoformat('2026-11-23T09:00:00'), errs)
    K = {0: 'ArrowUp', 1: 'ArrowRight', 2: 'ArrowDown', 3: 'ArrowLeft'}
    async def press(d): await pg.keyboard.press(K[d]); await pg.wait_for_timeout(150)
    st = lambda: pg.evaluate('DiliaMerge.state()')
    # ---- daily: the same game as the Node rules, also across a reload ----
    await pg.goto(B + 'daily-merge/'); await pg.wait_for_timeout(300)
    dirs = [3, 2, 1, 2, 3, 2, 0, 3, 2, 1, 2, 2, 3, 1, 2, 3, 0, 2, 3, 2]
    for d in dirs[:10]: await press(d)
    await pg.reload(); await pg.wait_for_timeout(300)
    for d in dirs[10:]: await press(d)
    S = await st(); want = node(f'({SIM})("2026-11-23", {json.dumps(dirs)})')
    ok(S['cells'] == want['cells'] and S['score'] == want['score'] and S['draws'] == want['draws'], f'[{w}] daily merge differs from Node rules: {S} vs {want}')
    ok(await pg.is_disabled('#undo'), f'[{w}] daily allows undo')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on merge')
    # play to the end (rotate through moves until none is left)
    over = await pg.evaluate("""async () => { for (let i = 0; i < 3000; i++) { const s = DiliaMerge.state(); if (s.over) return true; DiliaMerge.move([3, 2, 1, 2, 0][i % 5]); await new Promise(r => setTimeout(r, 125)); } return false; }""")
    ok(over and await pg.is_visible('#done'), f'[{w}] daily merge did not end')
    S = await st(); rec = await pg.evaluate("JSON.parse(localStorage.getItem('dilia-play-v1')).days['2026-11-23'].merge")
    ok(rec and rec['s'] == S['score'] and rec['m'] == max(S['cells']), f'[{w}] daily merge result {rec} vs {S["score"]}')
    await pg.reload(); await pg.wait_for_timeout(300)
    S2 = await st(); ok(await pg.is_visible('#done') and S2['cells'] == S['cells'], f'[{w}] finished daily not shown after reload')
    await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(200)
    ok((await st())['cells'] == S['cells'], f'[{w}] finished daily still moves')
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(300)
    ok(f"✓ {S['score']} points" in await pg.inner_text('#s-merge'), f'[{w}] hub merge status {await pg.inner_text("#s-merge")!r}')
    # ---- free play: undo, sizes, resume, swipe, game over ----
    await pg.goto(B + 'merge/'); await pg.wait_for_timeout(300)
    s0 = await st(); ok(s0['n'] == 4 and sum(1 for v in s0['cells'] if v) == 2, f'[{w}] free start {s0}')
    for d in (3, 2, 1, 2): await press(d)
    s1 = await st(); await press(3); await press(2); await press(1)
    for _ in range((await st())['moves'] - s1['moves']): await pg.click('#undo'); await pg.wait_for_timeout(100)
    s2 = await st(); ok(s2['cells'] == s1['cells'] and s2['score'] == s1['score'], f'[{w}] undo: {s2} vs {s1}')
    await pg.click('.msize button[data-n="5"]'); await pg.wait_for_timeout(200)
    s5 = await st(); ok(s5['n'] == 5 and len(s5['cells']) == 25 and await pg.locator('#mcells i').count() == 25, f'[{w}] 5x5 switch')
    await pg.click('.msize button[data-n="4"]'); await pg.wait_for_timeout(200)
    ok((await st())['cells'] == s2['cells'], f'[{w}] 4x4 game not kept when switching sizes')
    await pg.reload(); await pg.wait_for_timeout(300)
    ok((await st())['cells'] == s2['cells'], f'[{w}] free game not kept after reload')
    # swipe left with the pointer
    box = await pg.locator('#mboard').bounding_box(); before = (await st())['moves']
    for d in ((-1, 0), (0, 1), (1, 0), (0, 1)):
        cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
        await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx + d[0] * 90, cy + d[1] * 90, steps=4); await pg.mouse.up(); await pg.wait_for_timeout(160)
    ok((await st())['moves'] > before, f'[{w}] swipe did not move')
    # stuck board -> one key -> game over; play again starts fresh
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(200)  # set it from another page: leaving the game page saves the live game
    await pg.evaluate("localStorage.setItem('dilia-merge-size', '4'); localStorage.setItem('dilia-merge-free-4', JSON.stringify({n:4,cells:[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2],score:500,draws:10,seed:'mergefree:1',over:false,won:false,moves:9,t:5}))")
    await pg.goto(B + 'merge/'); await pg.wait_for_timeout(300); await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(200)
    ok(await pg.is_visible('#done') and await pg.inner_text('#dtime') == '500', f'[{w}] stuck board not game over')
    await pg.click('#dagain'); await pg.wait_for_timeout(200)
    s3 = await st(); ok(not s3['over'] and s3['score'] == 0 and not await pg.is_visible('#done'), f'[{w}] play again')
    ok(int(await pg.inner_text('#mbest')) >= 500, f'[{w}] best score not kept')
    await ctx.close(); ok(not errs, f'[{w}] merge errors {errs[:3]}')

async def mines_tests(br, w):
    errs = []; ctx, pg = await page(br, w, datetime.datetime.fromisoformat('2026-11-23T09:00:00'), errs)
    st = lambda: pg.evaluate('DiliaMines.state()')
    cell = lambda i: pg.locator('#mines .mq').nth(i)
    # ---- daily: same board as Node, opened at the same square; a mine restarts the same board ----
    await pg.goto(B + 'daily-minesweeper/'); await pg.wait_for_timeout(300)
    S = await st(); ref = node('G.makeDailyMines("2026-11-23")')
    ok(S['mine'] == ref['mine'] and S['start'] == ref['start'] and S['w'] == 16 and S['n'] == 40, f'[{w}] daily mines differ from Node')
    ok(S['open'][ref['start']] == 1 and sum(S['open']) > 1, f'[{w}] daily start not opened')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on daily mines')
    m0 = S['mine'].index(1); await cell(m0).click(); await pg.wait_for_timeout(1700)
    S2 = await st(); ok(S2['tries'] == 2 and not S2['lost'] and S2['open'] == S['open'], f'[{w}] mine did not restart same board: tries {S2["tries"]}')
    ok(await pg.inner_text('#mtries') == '2', f'[{w}] tries shown')
    # flag a mine with the right button, open a few safe squares by clicking, then reload and resume
    await cell(m0).click(button='right'); safe = [i for i in range(256) if not S['mine'][i] and not S['open'][i]]
    for i in safe[:3]: await cell(i).click()
    await pg.wait_for_timeout(200); before = await st(); await pg.reload(); await pg.wait_for_timeout(300); after = await st()
    ok(after['open'] == before['open'] and after['flag'] == before['flag'] and after['tries'] == 2, f'[{w}] daily mines not resumed')
    await pg.evaluate("(() => { const s = DiliaMines.state(); s.mine.forEach((m, i) => { if (!m && !s.open[i]) DiliaMines.act(i, false); }); })()"); await pg.wait_for_timeout(300)
    ok(await pg.is_visible('#done') and (await st())['won'], f'[{w}] daily mines not won')
    rec = await pg.evaluate("JSON.parse(localStorage.getItem('dilia-play-v1')).days['2026-11-23'].mines")
    ok(rec and rec['tries'] == 2, f'[{w}] daily mines result {rec}')
    await pg.reload(); await pg.wait_for_timeout(300); ok(await pg.is_visible('#done') and 'Cleared' in await pg.text_content('#deyebrow'), f'[{w}] cleared daily not shown after reload')
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(300)
    ok('Cleared in' in await pg.inner_text('#s-mines'), f'[{w}] hub mines {await pg.inner_text("#s-mines")!r}')
    # ---- free play ----
    await pg.goto(B + 'minesweeper/'); await pg.wait_for_timeout(300)
    S = await st(); ok(S['w'] == 9 and S['h'] == 9 and S['mine'] is None, f'[{w}] free start {S["w"]}x{S["h"]}')
    for k in range(6):  # first tap is always safe and, with No guessing on, the board solves by logic
        await pg.click('#newgame'); await pg.wait_for_timeout(50); first = (k * 13 + 7) % 81
        await cell(first).click(); S = await st()
        ok(not S['lost'] and S['mine'][first] == 0, f'[{w}] first tap hit a mine')
        ok(await pg.evaluate(f"DiliaPlayGen.mineSolve(9, 9, DiliaMines.state().mine, {first})"), f'[{w}] no-guess board needs a guess')
    # keyboard: arrows + F flags, Enter opens
    await pg.click('#newgame'); await pg.focus('#mines'); await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100)
    S = await st(); ok(S['open'][0] == 1 or sum(S['open']) > 0, f'[{w}] keyboard open')
    closed = next(i for i in range(81) if not S['open'][i])
    await pg.evaluate(f"DiliaMines.act({closed}, true)"); ok((await st())['flag'][closed] == 1, f'[{w}] flag')
    # long-press on touch flags; flag mode makes a tap flag
    S = await st(); closed2 = next(i for i in range(81) if not S['open'][i] and i != closed)
    await pg.evaluate(f"""(() => {{ const c = document.querySelectorAll('#mines .mq')[{closed2}], r = c.getBoundingClientRect(), o = {{ pointerType: 'touch', button: 0, bubbles: true, clientX: r.x + 5, clientY: r.y + 5 }}; c.dispatchEvent(new PointerEvent('pointerdown', o)); setTimeout(() => c.dispatchEvent(new PointerEvent('pointerup', o)), 600); }})()""")
    await pg.wait_for_timeout(800); ok((await st())['flag'][closed2] == 1, f'[{w}] long-press did not flag')
    await pg.click('#flagmode'); S = await st(); closed3 = next(i for i in range(81) if not S['open'][i] and not S['flag'][i])
    await cell(closed3).click(); ok((await st())['flag'][closed3] == 1, f'[{w}] flag mode tap did not flag'); await pg.click('#flagmode')
    # chord: flag every mine around an open number, then tap the number
    S = await st(); A = node('G.around(9, 9)')
    num = next((i for i in range(81) if S['open'][i] and any(not S['open'][j] and not S['mine'][j] for j in A[i]) and any(S['mine'][j] for j in A[i])), None)
    if num is not None:
        for j in A[num]:
            if S['mine'][j] and not S['flag'][j]: await pg.evaluate(f"DiliaMines.act({j}, true)")
            if not S['mine'][j] and S['flag'][j]: await pg.evaluate(f"DiliaMines.act({j}, true)")
        await cell(num).click(); S2 = await st()
        ok(all(S2['open'][j] for j in A[num] if not S2['mine'][j]), f'[{w}] chord did not open neighbours')
    # lose: share hidden; win: best time saved
    S = await st(); mi = next(i for i in range(81) if S['mine'][i] and not S['flag'][i]); await cell(mi).click(); await pg.wait_for_timeout(150)
    ok(await pg.is_visible('#done') and await pg.text_content('#deyebrow') == 'Boom' and await pg.is_hidden('#share'), f'[{w}] lose panel')
    ok(await pg.locator('#mines .mq.boom').count() == 1 and await pg.locator('#mines .mq.m').count() >= 1, f'[{w}] mines not shown after loss')
    await pg.click('#dagain'); await cell(40).click()
    await pg.evaluate("(() => { const s = DiliaMines.state(); s.mine.forEach((m, i) => { if (!m && !s.open[i]) DiliaMines.act(i, false); }); })()"); await pg.wait_for_timeout(300)
    ok(await pg.is_visible('#done') and await pg.text_content('#deyebrow') == 'Cleared' and await pg.inner_text('#sbest') != '–', f'[{w}] free win / best time')
    # expert: wide on desktop, tall on phones; custom size
    await pg.click('.mlevel button[data-lv="expert"]'); S = await st()
    ok((S['w'], S['h']) == ((16, 30) if w < 700 else (30, 16)) and S['n'] == 99, f'[{w}] expert shape {S["w"]}x{S["h"]}')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on expert')
    await pg.click('.mlevel button[data-lv="custom"]'); await pg.fill('#cw', '10'); await pg.fill('#ch', '8'); await pg.fill('#cm', '12'); await pg.click('#capply')
    S = await st(); ok((S['w'], S['h'], S['n']) == (10, 8, 12) and await pg.locator('#mines .mq').count() == 80, f'[{w}] custom board')
    await pg.fill('#cm', '999'); await pg.click('#capply'); ok((await st())['n'] == 24, f'[{w}] custom mines not capped at 30%')
    await ctx.close(); ok(not errs, f'[{w}] mines errors {errs[:3]}')

async def sol_tests(br, w):
    errs = []; ctx, pg = await page(br, w, datetime.datetime.fromisoformat('2026-11-23T09:00:00'), errs)
    st = lambda: pg.evaluate('DiliaSol.state()')
    card = lambda c: pg.locator(f'#sol .kc[data-c="{c}"]')
    # ---- daily: same deal as Node; tap, drag, undo, resume; the solver's own moves win it ----
    await pg.goto(B + 'daily-solitaire/'); await pg.wait_for_timeout(400)
    deal = await pg.evaluate('DiliaSolDeal'); ref = node('G.klDaily("2026-11-23")')
    ok(deal['tab'] == ref['tab'] and deal['stock'] == ref['stock'], f'[{w}] daily deal differs from Node')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on solitaire')
    S0 = await st(); await pg.click('.ks.stock', force=True); await pg.wait_for_timeout(250); S1 = await st()
    ok(len(S1['S']['waste']) == 1 and S1['moves'] == 1, f'[{w}] tap deck did not draw')
    await pg.click('#undo'); await pg.wait_for_timeout(200); ok((await st())['S'] == S0['S'], f'[{w}] undo after draw')
    # tap a tableau card that has a legal move -> it moves
    tapped = await pg.evaluate("""() => { const G = DiliaPlayGen, s = DiliaSol.state().S; for (let f = 0; f < 7; f++) { const p = s.tab[f], i = p.findIndex(q => q.up); if (i === p.length - 1 && G.klLegal(s, { t: 'tf', from: f })) continue; for (let t = 0; t < 7; t++) if (t !== f && G.klLegal(s, { t: 'tt', from: f, i, to: t })) return { c: p[i].c, f, t }; } return null; }""")
    if tapped:
        await card(tapped['c']).click(); await pg.wait_for_timeout(250); s = (await st())['S']
        ok(any(q['c'] == tapped['c'] for q in s['tab'][tapped['t']]), f'[{w}] tap did not move card {tapped}')
        await pg.click('#undo'); await pg.wait_for_timeout(250)
        # drag the same card onto its target column
        a = await card(tapped['c']).bounding_box(); tgt = (await st())['S']['tab'][tapped['t']][-1]['c']; b = await card(tgt).bounding_box()
        await pg.mouse.move(a['x'] + a['width'] / 2, a['y'] + 8); await pg.mouse.down()
        await pg.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] * 0.6, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(300)
        s = (await st())['S']; ok(any(q['c'] == tapped['c'] for q in s['tab'][tapped['t']]), f'[{w}] drag did not move card')
        await pg.click('#undo'); await pg.wait_for_timeout(250)
    # an illegal drop puts the card back
    S2 = await st(); top0 = S2['S']['tab'][0][-1]['c']; a = await card(top0).bounding_box()
    await pg.mouse.move(a['x'] + a['width'] / 2, a['y'] + 8); await pg.mouse.down(); await pg.mouse.move(a['x'] + a['width'] * 4.5, a['y'] + 60, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(300)
    S3 = await st(); ok(S3['S'] == S2['S'] or S3['moves'] == S2['moves'] + 1, f'[{w}] illegal drop changed the game')
    # play the solver's moves (turned into real moves) halfway, reload, then finish
    real = await pg.evaluate("() => { const G = DiliaPlayGen, d = DiliaSolDeal; const s = G.klSolve(d, 6000); return G.klReplay(d, s.moves).real; }")
    await pg.evaluate("() => { while (DiliaSol.state().moves) { const u = document.getElementById('undo'); if (u.disabled) break; u.click(); } }")
    S0b = await st(); ok(S0b['S'] == S0['S'], f'[{w}] could not return to start')
    half = len(real) // 2
    await pg.evaluate(f"(ms) => {{ for (const m of ms) DiliaSol.move(m); }}", real[:half]); await pg.wait_for_timeout(200)
    mid = await st(); await pg.reload(); await pg.wait_for_timeout(400)
    ok((await st())['S'] == mid['S'] and (await st())['moves'] == mid['moves'], f'[{w}] daily solitaire not resumed')
    await pg.evaluate(f"(ms) => {{ for (const m of ms) if (!DiliaSol.state().done) DiliaSol.move(m); }}", real[half:]); await pg.wait_for_timeout(1500)
    ok(await pg.is_visible('#done') and (await st())['done'], f'[{w}] solver line did not win the daily deal')
    rec = await pg.evaluate("JSON.parse(localStorage.getItem('dilia-play-v1')).days['2026-11-23'].solitaire")
    ok(rec and rec['mv'] >= 52, f'[{w}] daily solitaire result {rec}')
    await pg.reload(); await pg.wait_for_timeout(400); ok(await pg.is_visible('#done'), f'[{w}] won daily not shown after reload')
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(300); ok('Won in' in await pg.inner_text('#s-sol'), f'[{w}] hub solitaire status')
    # ---- free: draw 3, winnable switch, finish button ----
    await pg.goto(B + 'solitaire/'); await pg.wait_for_timeout(400)
    await pg.click('.sdraw button[data-d="3"]'); await pg.wait_for_timeout(300)
    ok(await pg.is_disabled('#winnable') and (await st())['S']['draw'] == 3, f'[{w}] draw 3 setting')
    await pg.click('.ks.stock', force=True); await pg.wait_for_timeout(250); ok(len((await st())['S']['waste']) == 3, f'[{w}] draw 3 did not turn 3 cards')
    await pg.click('.sdraw button[data-d="1"]'); await pg.wait_for_timeout(300)
    ok(not await pg.is_disabled('#winnable') and (await st())['S']['draw'] == 1, f'[{w}] draw 1 setting')
    ok(await pg.evaluate("(() => { const G = DiliaPlayGen, s = DiliaSol.state().S; return G.klSolve({ tab: s.tab, fnd: s.fnd, stock: s.stock, waste: s.waste }, 60000).won; })()"), f'[{w}] winnable free deal could not be won')
    # fixed position: K♠ | Q♥ | J♠ -> a tap puts Q♥ on K♠, a drag puts J♠ on Q♥, an illegal drag snaps back
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(200)
    await pg.evaluate("""() => { const tab = [[{ c: 12, up: true }], [{ c: 24, up: true }], [{ c: 10, up: true }], [], [], [], []], used = new Set([12, 24, 10]);
      localStorage.setItem('dilia-sol-free', JSON.stringify({ S: { tab, fnd: [0, 0, 0, 0], stock: [...Array(52).keys()].filter(c => !used.has(c)), waste: [], draw: 1 }, moves: 0, t: 0 })); }""")
    await pg.goto(B + 'solitaire/'); await pg.wait_for_timeout(400)
    await card(24).click(); await pg.wait_for_timeout(300)
    ok([q['c'] for q in (await st())['S']['tab'][0]] == [12, 24], f'[{w}] tap did not put Q♥ on K♠')
    a = await card(10).bounding_box(); b = await card(24).bounding_box()
    await pg.mouse.move(a['x'] + a['width'] / 2, a['y'] + 8); await pg.mouse.down(); await pg.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] * 0.6, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(300)
    ok([q['c'] for q in (await st())['S']['tab'][0]] == [12, 24, 10], f'[{w}] drag did not put J♠ on Q♥')
    a = await card(10).bounding_box(); before = await st()
    await pg.mouse.move(a['x'] + a['width'] / 2, a['y'] + 8); await pg.mouse.down(); await pg.mouse.move(a['x'] + a['width'] * 5, a['y'] + 20, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(300)
    ok((await st())['S']['tab'][0] == before['S']['tab'][0] and (await st())['S']['tab'][5] == [], f'[{w}] illegal drag changed the game')
    await pg.click('#undo'); await pg.wait_for_timeout(150); await pg.click('#undo'); await pg.wait_for_timeout(150)
    ok([q['c'] for q in (await st())['S']['tab'][0]] == [12] and (await st())['moves'] == 0, f'[{w}] undo of tap and drag')
    # nearly won position: every card face up -> Finish sends them home
    await pg.goto(B + 'play/'); await pg.wait_for_timeout(200)
    await pg.evaluate("""() => { const tab = [[], [], [], [], [], [], []]; for (let s = 0; s < 4; s++) for (let r = 13; r >= 10; r--) tab[s].push({ c: s * 13 + r - 1, up: true });
      localStorage.setItem('dilia-sol-free', JSON.stringify({ S: { tab, fnd: [9, 9, 9, 9], stock: [], waste: [], draw: 1 }, moves: 80, t: 100 })); }""")
    await pg.goto(B + 'solitaire/'); await pg.wait_for_timeout(400)
    ok(await pg.is_visible('#finish'), f'[{w}] Finish button not shown')
    await pg.click('#finish'); await pg.wait_for_timeout(1800)
    ok((await st())['done'] and await pg.is_visible('#done') and await pg.inner_text('#sbest') != '–', f'[{w}] finish did not win')
    await ctx.close(); ok(not errs, f'[{w}] solitaire errors {errs[:3]}')

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
        await sol_tests(br, 1280); await sol_tests(br, 390)
        await mines_tests(br, 1280); await mines_tests(br, 390)
        await merge_tests(br, 1280); await merge_tests(br, 390)
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
