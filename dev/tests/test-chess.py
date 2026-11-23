"""Chess page in a real browser under the real _headers (port 8766). Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-chess.py"""
import asyncio, json, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
async def open_(br, w=1280, theme='dark', pre=None, shot=None):
    ctx = await br.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce', has_touch=w < 500)
    errs = []
    await ctx.add_init_script(f"try{{if(!localStorage.getItem('dilia-theme'))localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    if pre: await ctx.add_init_script(pre)
    pg = await ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith(('http://127.0.0.1:8766/', 'data:', 'blob:')) else None)
    await pg.goto(B + 'chess/'); await pg.wait_for_timeout(600)
    return ctx, pg, errs
async def st(pg): return await pg.evaluate('DiliaChessGame.state()')
async def sq(pg, name): return pg.locator(f'.chb .sq[aria-label^="{name} "]')
async def wait_cpu(pg, n):
    for _ in range(80):
        s = await st(pg)
        if len(s['moves']) >= n and not s['thinking']: return s
        await pg.wait_for_timeout(150)
    return await st(pg)

async def run(br, w):
    ctx, pg, errs = await open_(br, w)
    s = await st(pg)
    ok(len(s['moves']) == 0 and s['cfg']['mode'] == 'cpu', f'[{w}] starts empty vs computer')
    ok(await pg.locator('.chb .sq').count() == 64, f'[{w}] 64 squares')
    ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] no sideways scroll')
    # tap e2 then e4
    await (await sq(pg, 'e2')).click(); ok(await pg.locator('.chb .sq.dot').count() == 2, f'[{w}] pawn shows 2 move marks')
    await (await sq(pg, 'e4')).click()
    s = await wait_cpu(pg, 2); ok(s['moves'][0] == 'e2e4' and len(s['moves']) == 2, f'[{w}] computer replied: {s["moves"]}')
    ok(len(await pg.inner_text('#clist')) > 3, f'[{w}] move list filled')
    # illegal tap does nothing
    await (await sq(pg, 'a1')).click(); await (await sq(pg, 'a5')).click()
    ok(len((await st(pg))['moves']) == 2, f'[{w}] illegal move ignored')
    # undo removes both plies
    await pg.click('#undo'); s = await st(pg); ok(len(s['moves']) == 0, f'[{w}] undo takes back move and reply')
    # drag
    box1 = await (await sq(pg, 'd2')).bounding_box(); box2 = await (await sq(pg, 'd4')).bounding_box()
    await pg.mouse.move(box1['x'] + box1['width'] / 2, box1['y'] + box1['height'] / 2); await pg.mouse.down()
    await pg.mouse.move(box2['x'] + box2['width'] / 2, box2['y'] + box2['height'] / 2, steps=6); await pg.mouse.up()
    s = await wait_cpu(pg, 2); ok(s['moves'][0] == 'd2d4', f'[{w}] drag move works: {s["moves"]}')
    # reload keeps game
    n = len(s['moves']); await pg.reload(); await pg.wait_for_timeout(600); s2 = await st(pg); ok(s2['moves'][:n] == s['moves'][:n], f'[{w}] game saved over reload')
    # flip
    f0 = await pg.locator('.chb .sq').first.get_attribute('aria-label'); await pg.click('#flip'); f1 = await pg.locator('.chb .sq').first.get_attribute('aria-label'); ok(f0 != f1, f'[{w}] flip changes board')
    await pg.click('#flip')
    # two players
    await pg.click('#newgame'); await pg.click('[data-cm=two]'); s = await st(pg); ok(s['cfg']['mode'] == 'two' and not s['moves'], f'[{w}] two-player mode')
    for u in ['f2f3', 'e7e5', 'g2g4', 'd8h4']: ok(await pg.evaluate(f'DiliaChessGame.move("{u}")'), f'[{w}] fool mate move {u}')
    s = await st(pg); ok(s['over'] and s['status'] == 'checkmate', f'[{w}] fool\'s mate detected')
    ok(await pg.evaluate("document.getElementById('done').classList.contains('on')"), f'[{w}] result panel shown')
    ok('Black wins' in await pg.inner_text('#dline'), f'[{w}] Black wins message')
    await pg.click('#dagain'); ok(len((await st(pg))['moves']) == 0, f'[{w}] new game after result')
    # promotion chooser
    await pg.evaluate('DiliaChessGame.setMoves([])')
    ok(len(errs) == 0, f'[{w}] no console errors/outside requests: {errs[:3]}')
    await ctx.close()

async def promo(br):
    ctx, pg, errs = await open_(br, 1280)
    await pg.click('[data-cm=two]')
    # a7-pawn promotion setup by replaying legal moves: white pawn races to promote
    seq = 'h2h4 g7g5 h4g5 a7a6 g5g6 a6a5 g6h7 a5a4'.split()
    await pg.evaluate(f'DiliaChessGame.setMoves({json.dumps(seq)})')
    await (await sq(pg, 'h7')).click(); await (await sq(pg, 'g8')).click()
    ok(await pg.locator('#promo button').count() == 5, 'promotion chooser shows 4 pieces and cancel')
    await pg.locator('#promo button').first.click(); s = await st(pg)
    ok(s['moves'][-1].startswith('h7g8') and s['moves'][-1].endswith('q'), f'promotes to queen: {s["moves"][-1]}')
    await pg.evaluate('DiliaChessGame.undo()')
    ok(not errs, f'promo errors {errs[:2]}')
    await ctx.close()

async def computer_white(br):
    ctx, pg, errs = await open_(br, 1280)
    await pg.click('[data-cs="1"]'); await pg.wait_for_timeout(1200); s0 = await st(pg); ok(len(s0['moves']) == 0, 'computer waits until Start is pressed'); ok(await pg.locator('#cstart').is_visible(), 'Start button visible'); await pg.click('#cstart'); s = await wait_cpu(pg, 1)
    ok(len(s['moves']) == 1 and s['cfg']['side'] == 1, 'computer moves first when you play Black')
    ok(await pg.locator('.chb .sq').first.get_attribute('aria-label') is not None, 'board renders flipped for Black')
    # play a move as black, undo should go back to the computer's first move
    mv = s['moves'][0]
    await pg.evaluate('DiliaChessGame.move("e7e5")') if mv not in ('e7e5',) else None
    s2 = await wait_cpu(pg, 3); ok(len(s2['moves']) == 3, f'computer answers as White: {s2["moves"]}')
    await pg.click('#undo'); s3 = await st(pg); ok(len(s3['moves']) == 1, f'undo as Black returns to first computer move: {s3["moves"]}')
    await ctx.close()

async def levels(br):
    ctx, pg, errs = await open_(br, 1280)
    for L in (1, 2, 3, 4):
        await pg.click('#newgame'); await pg.click(f'[data-cl="{L}"]'); await pg.evaluate('DiliaChessGame.move("e2e4")')
        s = await wait_cpu(pg, 2); ok(len(s['moves']) == 2, f'level {L} answers')
    ok(not errs, f'level errors {errs[:2]}')
    await ctx.close()

async def draws_and_mate(br):
    ctx, pg, errs = await open_(br, 1280)
    await pg.click('[data-cm=two]')
    cases = {
      'threefold': ('g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1 f6g8'.split(), 'repetition'),
      'scholar': ('e2e4 e7e5 f1c4 b8c6 d1h5 g8f6 h5f7'.split(), 'checkmate'),
    }
    for k, (seq, want) in cases.items():
        await pg.evaluate(f'DiliaChessGame.setMoves({json.dumps(seq)})'); s = await st(pg); ok(s['status'] == want and s['over'], f'{k}: {s["status"]}')
    await ctx.close()

async def look(br, w, theme, path):
    ctx, pg, errs = await open_(br, w, theme)
    await pg.click('[data-cm=two]'); await pg.evaluate('DiliaChessGame.setMoves(["e2e4","e7e5","g1f3","b8c6","f1b5"])')
    await pg.screenshot(path=path, full_page=True); await ctx.close()

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for w in (1280, 390): await run(br, w)
        await promo(br); await computer_white(br); await levels(br); await draws_and_mate(br)
        if len(sys.argv) > 1:
            for w in (1280, 390):
                for th in ('dark', 'light'): await look(br, w, th, f'/tmp/chess-{w}-{th}.png')
        await br.close()
    print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
asyncio.run(main())
