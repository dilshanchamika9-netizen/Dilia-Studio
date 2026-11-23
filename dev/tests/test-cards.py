"""Card games FreeCell, Pyramid, TriPeaks in a real browser under the real _headers (port 8766).
Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-cards.py"""
import asyncio, json
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
async def open_(br, slug, w=1280, theme='dark', pre=None, keep=None):
    ctx = keep or await br.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce', has_touch=w < 500)
    errs = []
    await ctx.add_init_script(f"try{{if(!localStorage.getItem('dilia-theme'))localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith(('http://127.0.0.1:8766/', 'data:', 'blob:')) else None)
    await pg.goto(B + slug + '/'); await pg.wait_for_timeout(700)
    return ctx, pg, errs
async def vis(pg): return await pg.evaluate("[...document.querySelectorAll('.kc')].filter(e=>!e.hidden).length")
async def text(pg, i): return (await pg.inner_text('#' + i)).strip()
async def sw(pg): return await pg.evaluate('document.documentElement.scrollWidth')
async def click_card(pg, c, force=False):
    await pg.locator(f'.kc[data-c="{c}"]').click(force=force)

async def freecell(br, w):
    ctx, pg, errs = await open_(br, 'freecell', w)
    S = (await pg.evaluate('DiliaFreeCell.state()'))['S']
    ok(len(S['col']) == 8 and sum(len(p) for p in S['col']) == 52 and len(set(sum(S['col'], []))) == 52, f'[{w}] fc deal has 52 cards')
    ok(await vis(pg) == 52, f'[{w}] fc shows 52 cards')
    ok(await text(pg, 'fcno') == '#' + str(S['no']), f'[{w}] fc deal number shown')
    ok(S['no'] != 11982 and 1 <= S['no'] <= 32000, f'[{w}] fc deal number in range')
    ok(await sw(pg) <= w, f'[{w}] fc sideways scroll')
    ok(await pg.locator('#winnable').count() == 0, f'[{w}] fc has no winnable toggle')
    # a known deal with an obvious move: 6H on 7S
    c = lambda r, s: s * 13 + r - 1
    st = {'col': [[c(7, 0)], [c(6, 1)], [c(13, 3)], [], [], [], [], []], 'cell': [-1, -1, -1, -1], 'fnd': [0, 0, 0, 0], 'no': 5}
    # (the rest of the pack is "home": 52 cards must exist, so build with fnd counts)
    st = {'col': [[c(7, 0), c(6, 1)], [c(13, 3), c(12, 1)], [c(5, 2)], [], [], [], [], []], 'cell': [-1, -1, -1, -1], 'fnd': [0, 0, 0, 0], 'no': 5}
    # fill remaining cards into the columns 3..7 in no order (play is not needed for this check)
    used = set(sum(st['col'], [])); rest = [x for x in range(52) if x not in used]
    for k, x in enumerate(rest): st['col'][3 + k % 5].append(x)
    await pg.evaluate(f'DiliaFreeCell.set({json.dumps(st)})'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate('DiliaFreeCell.move({a:"c",i:2,n:1,b:"f",j:1})') is True, f'[{w}] fc move to a cell via hook')
    s2 = (await pg.evaluate('DiliaFreeCell.state()'))['S']; ok(s2['cell'][1] == c(5, 2) and s2['col'][2] == [], f'[{w}] fc cell holds the card')
    ok(await text(pg, 'smoves') == '1', f'[{w}] fc move counter 1')
    await pg.click('#undo'); s3 = (await pg.evaluate('DiliaFreeCell.state()'))['S']
    ok(s3['cell'][1] == -1 and len(s3['col'][2]) == 1 and await text(pg, 'smoves') == '0', f'[{w}] fc undo')
    ok(await pg.evaluate('DiliaFreeCell.move({a:"c",i:0,n:1,b:"c",j:1})') is False, f'[{w}] fc illegal move refused (6H on QH)')
    # tap: 6H (top of col 0) goes on... nothing legal; the tap sends it to a free cell
    await click_card(pg, c(6, 1)); s4 = (await pg.evaluate('DiliaFreeCell.state()'))['S']
    ok(c(6, 1) in s4['cell'], f'[{w}] fc tap sends a stuck card to a free cell')
    # drag: 5D onto 6S?  5D (red) on 6C/6S; put 6S in col and drag
    # simple drag test on a crafted position
    st = {'col': [[c(7, 0), c(6, 1)], [c(8, 3)], [], [], [], [], [], []], 'cell': [-1, -1, -1, -1], 'fnd': [0, 0, 0, 0], 'no': 5}
    used = set(sum(st['col'], [])); rest = [x for x in range(52) if x not in used]
    for k, x in enumerate(rest): st['col'][2 + k % 6].append(x)
    st['col'][1] = [c(8, 3), c(7, 1)] + [x for x in st['col'][1] if x not in (c(8, 3), c(7, 1))]
    # make 7H on top of 8C by construction, 6S somewhere top: simply test a drag of 6H (col0 top) onto 7H? same colour; use hook-free check of a refused drop
    await pg.evaluate(f'DiliaFreeCell.set({json.dumps(st)})'); await pg.wait_for_timeout(200)
    tgt = await pg.locator('.ks[data-slot="f2"]').bounding_box(); src = await pg.locator(f'.kc[data-c="{c(6,1)}"]').bounding_box()
    await pg.mouse.move(src['x'] + src['width'] / 2, src['y'] + 10); await pg.mouse.down()
    await pg.mouse.move(tgt['x'] + tgt['width'] / 2, tgt['y'] + tgt['height'] / 2, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(250)
    s5 = (await pg.evaluate('DiliaFreeCell.state()'))['S']; ok(s5['cell'][2] == c(6, 1), f'[{w}] fc drag a card to a free cell')
    # drag onto the home area: a card that cannot go home returns
    src = await pg.locator(f'.kc[data-c="{c(7,0)}"]').bounding_box(); tgt = await pg.locator('.ks[data-slot="h0"]').bounding_box()
    await pg.mouse.move(src['x'] + src['width'] / 2, src['y'] + 10); await pg.mouse.down()
    await pg.mouse.move(tgt['x'] + tgt['width'] / 2, tgt['y'] + tgt['height'] / 2, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(250)
    s6 = (await pg.evaluate('DiliaFreeCell.state()'))['S']; ok(s6['fnd'] == [0, 0, 0, 0] and c(7, 0) in sum(s6['col'], []), f'[{w}] fc a 7 does not go home on an empty pile')
    # win: only the last King left, then Finish run
    st = {'col': [[c(13, 3)], [], [], [], [], [], [], []], 'cell': [-1, -1, -1, -1], 'fnd': [13, 13, 13, 12], 'no': 7}
    await pg.evaluate(f'DiliaFreeCell.set({json.dumps(st)})'); await pg.wait_for_timeout(200)
    ok(not await pg.locator('#finish').is_hidden(), f'[{w}] fc Finish shows when the rest can go home')
    await pg.click('#finish'); await pg.wait_for_timeout(600)
    ok(await pg.evaluate("document.getElementById('done').classList.contains('on')"), f'[{w}] fc win card shown')
    ok(await pg.evaluate("JSON.parse(localStorage.getItem('dilia-freecell-best')).w") == 1, f'[{w}] fc win counted')
    ok('Cleared' in await pg.inner_text('#dline'), f'[{w}] fc win line')
    # tap the last King home instead of Finish
    await pg.click('#newgame'); await pg.wait_for_timeout(200)
    ok(not await pg.evaluate("document.getElementById('done').classList.contains('on')"), f'[{w}] fc new deal hides win card')
    await pg.evaluate(f'DiliaFreeCell.set({json.dumps(st)})'); await pg.wait_for_timeout(200)
    await click_card(pg, c(13, 3)); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("document.getElementById('done').classList.contains('on')"), f'[{w}] fc tapping the last King wins')
    # reload keeps an unfinished game
    await pg.click('#newgame'); await pg.wait_for_timeout(200)
    await pg.evaluate('DiliaFreeCell.move({a:"c",i:7,n:1,b:"f",j:0})') if False else None
    s = (await pg.evaluate('DiliaFreeCell.state()'))['S']
    for i in range(8):
        if await pg.evaluate(f'DiliaFreeCell.move({{a:"c",i:{i},n:1,b:"f",j:0}})'): break
    before = (await pg.evaluate('DiliaFreeCell.state()'))['S']
    await pg.reload(); await pg.wait_for_timeout(600); after = (await pg.evaluate('DiliaFreeCell.state()'))['S']
    ok(before == after, f'[{w}] fc game restored after reload')
    ok(errs == [], f'[{w}] fc errors: {errs[:3]}'); await ctx.close()

def pyr_state(cards_by_idx, stock=(), waste=()):
    pyr = [-1] * 28
    for i, c in cards_by_idx.items(): pyr[i] = c
    return {'pyr': pyr, 'stock': list(stock), 'waste': list(waste)}

async def pyramid(br, w):
    c = lambda r, s: s * 13 + r - 1
    ctx, pg, errs = await open_(br, 'pyramid', w)
    S = (await pg.evaluate('DiliaPyramid.state()'))['S']
    ok(len(S['pyr']) == 28 and len(S['stock']) == 24 and S['waste'] == [], f'[{w}] pyr deal shape')
    ok(await vis(pg) == 52, f'[{w}] pyr shows 52 cards'); ok(await sw(pg) <= w, f'[{w}] pyr sideways scroll')
    ok(await pg.get_attribute('#winnable', 'aria-pressed') == 'true', f'[{w}] pyr winnable on by default')
    # covered card refuses
    top = S['pyr'][0]; await click_card(pg, top, force=True); await pg.wait_for_timeout(100)
    ok('covered' in (await text(pg, 'msg')).lower(), f'[{w}] pyr covered card message')
    # crafted position: bottom row 27: 6S, 26: 7H, 25: KD, row above 20: 5C (kids 26, 27), waste 8D
    st = pyr_state({27: c(6, 0), 26: c(7, 1), 25: c(13, 2), 20: c(5, 3)}, stock=[c(1, 0), c(2, 0)], waste=[c(8, 2)])
    await pg.evaluate(f'DiliaPyramid.set({json.dumps(st)})'); await pg.wait_for_timeout(200)
    ok(await vis(pg) == 4 + 2 + 1, f'[{w}] pyr only live cards are shown')
    await click_card(pg, c(6, 0)); ok(await pg.evaluate('DiliaPyramid.sel()') == 27, f'[{w}] pyr first tap selects')
    ok(await pg.evaluate(f"document.querySelector('.kc[data-c=\"{c(6,0)}\"]').classList.contains('sel')"), f'[{w}] pyr selected card is marked')
    await click_card(pg, c(6, 0)); ok(await pg.evaluate('DiliaPyramid.sel()') is None, f'[{w}] pyr tap again deselects')
    await click_card(pg, c(6, 0)); await click_card(pg, c(8, 2))
    ok('13' in await text(pg, 'msg'), f'[{w}] pyr wrong pair message')
    ok(await pg.evaluate('DiliaPyramid.sel()') is not None, f'[{w}] pyr a wrong pair keeps a selection')
    await click_card(pg, c(6, 0)); await click_card(pg, c(7, 1)); await pg.wait_for_timeout(150)
    await pg.wait_for_timeout(1)
    s = (await pg.evaluate('DiliaPyramid.state()'))['S']; ok(s['pyr'][27] == -1 and s['pyr'][26] == -1, f'[{w}] pyr 6 + 7 removed')
    ok(await text(pg, 'smoves') == '1', f'[{w}] pyr move counter')
    await click_card(pg, c(13, 2)); s = (await pg.evaluate('DiliaPyramid.state()'))['S']; ok(s['pyr'][25] == -1, f'[{w}] pyr king alone')
    await click_card(pg, c(5, 3)); await click_card(pg, c(8, 2)); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("document.getElementById('done').classList.contains('on')"), f'[{w}] pyr win with the waste card')
    ok(await pg.evaluate("JSON.parse(localStorage.getItem('dilia-pyramid-best')).w") == 1, f'[{w}] pyr win counted')
    # undo after a win is off; new deal
    await pg.click('#newgame'); await pg.wait_for_timeout(500)
    # draw, recycle, undo
    st = pyr_state({27: c(6, 0)}, stock=[c(1, 0), c(2, 0)], waste=[])
    await pg.evaluate(f'DiliaPyramid.set({json.dumps(st)})'); await pg.wait_for_timeout(200)
    await click_card(pg, c(2, 0)); s = (await pg.evaluate('DiliaPyramid.state()'))['S']; ok(s['waste'] == [c(2, 0)] and s['stock'] == [c(1, 0)], f'[{w}] pyr tapping the deck draws')
    await pg.locator(f'.kc[data-c="{c(1,0)}"]').click(force=True); await pg.locator('.ks.stock').click(force=True) if False else None
    s = (await pg.evaluate('DiliaPyramid.state()'))['S']; ok(s['waste'] == [c(2, 0), c(1, 0)] and s['stock'] == [], f'[{w}] pyr tapping a deck card draws')
    await pg.locator('.ks.stock').click(force=True); s = (await pg.evaluate('DiliaPyramid.state()'))['S']
    ok(s['stock'] == [c(1, 0), c(2, 0)] and s['waste'] == [], f'[{w}] pyr empty deck turns the waste over again')
    await pg.click('#undo'); s = (await pg.evaluate('DiliaPyramid.state()'))['S']; ok(s['waste'] == [c(2, 0), c(1, 0)], f'[{w}] pyr undo a recycle')
    # winnable toggle persists, and a fresh deal is quick
    await pg.click('#winnable'); ok(await pg.get_attribute('#winnable', 'aria-pressed') == 'false', f'[{w}] pyr toggle off')
    await pg.reload(); await pg.wait_for_timeout(500); ok(await pg.get_attribute('#winnable', 'aria-pressed') == 'false', f'[{w}] pyr toggle remembered')
    await pg.click('#winnable'); t = await pg.evaluate("(()=>{const a=performance.now();document.getElementById('newgame').click();return performance.now()-a})()")
    ok(t < 6000, f'[{w}] pyr winnable deal took {t:.0f} ms')
    # every dealt winnable deal is really winnable (solver in the page's own code)
    r = await pg.evaluate("(()=>{const S=DiliaPyramid.state().S;const r=DiliaCards.pySolve(S,200000);return r.won})()")
    ok(r is True, f'[{w}] pyr the dealt deal can be won')
    ok(errs == [], f'[{w}] pyr errors: {errs[:3]}'); await ctx.close()

async def tripeaks(br, w):
    c = lambda r, s: s * 13 + r - 1
    ctx, pg, errs = await open_(br, 'tripeaks', w)
    S = (await pg.evaluate('DiliaTriPeaks.state()'))['S']
    ok(len(S['pk']) == 28 and len(S['stock']) == 23 and len(S['waste']) == 1, f'[{w}] tp deal shape'); ok(await vis(pg) == 52, f'[{w}] tp shows 52 cards'); ok(await sw(pg) <= w, f'[{w}] tp sideways scroll')
    ok(await text(pg, 'tpleft') == '28' and await text(pg, 'tpstock') == '23', f'[{w}] tp counters')
    nfree = await pg.evaluate("[...document.querySelectorAll('.kc')].filter(e=>!e.hidden&&!e.classList.contains('back')).length")
    ok(nfree == 10 + 1, f'[{w}] tp face-up: 10 bottom cards + the open card (got {nfree})')
    r = await pg.evaluate("(()=>{const S=DiliaTriPeaks.state().S;return DiliaCards.tpSolve(S,250000).won})()"); ok(r is True, f'[{w}] tp dealt deal can be won')
    # crafted: waste 5S, bottom 27 = 6H, 26 = 9H (not near); row above 17 covered by 26,27? use index 17 = 4D (x=8.5 covered by 26 x=8 and 27 x=9)
    pk = [-1] * 28; pk[27] = c(6, 1); pk[26] = c(9, 1); pk[17] = c(4, 2)
    st = {'pk': pk, 'stock': [c(2, 0)], 'waste': [c(5, 0)]}
    await pg.evaluate(f'DiliaTriPeaks.set({json.dumps(st)})'); await pg.wait_for_timeout(200)
    await click_card(pg, c(9, 1)); ok('not next' in (await text(pg, 'msg')).lower(), f'[{w}] tp not next to the open card')
    await click_card(pg, c(4, 2), force=True); ok('covered' in (await text(pg, 'msg')).lower(), f'[{w}] tp covered message')
    await click_card(pg, c(6, 1)); s = (await pg.evaluate('DiliaTriPeaks.state()'))['S']; ok(s['pk'][27] == -1 and s['waste'][-1] == c(6, 1), f'[{w}] tp play 6 on 5')
    ok(await text(pg, 'tpleft') == '2', f'[{w}] tp counter after play')
    await pg.click('#undo'); s = (await pg.evaluate('DiliaTriPeaks.state()'))['S']; ok(s['pk'][27] == c(6, 1) and s['waste'] == [c(5, 0)], f'[{w}] tp undo')
    # stuck: 9H 4D left, stock empty after a draw, open card unrelated
    await pg.evaluate(f'DiliaTriPeaks.set({json.dumps(st)})'); await pg.wait_for_timeout(100)
    await pg.keyboard.press('d'); await pg.wait_for_timeout(100)
    s = (await pg.evaluate('DiliaTriPeaks.state()'))['S']; ok(s['waste'][-1] == c(2, 0) and s['stock'] == [], f'[{w}] tp D key draws')
    ok('no more moves' in (await text(pg, 'msg')).lower(), f'[{w}] tp stuck message')
    await pg.click('#undo'); ok(await text(pg, 'msg') == '', f'[{w}] tp stuck message goes after undo')
    # wrap: King on Ace, then win
    pk = [-1] * 28; pk[27] = c(13, 1); pk[26] = c(12, 3)
    st = {'pk': pk, 'stock': [], 'waste': [c(1, 0)]}
    await pg.evaluate(f'DiliaTriPeaks.set({json.dumps(st)})'); await pg.wait_for_timeout(100)
    await click_card(pg, c(13, 1)); await click_card(pg, c(12, 3)); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("document.getElementById('done').classList.contains('on')"), f'[{w}] tp King on Ace wraps, then win')
    ok(await pg.evaluate("JSON.parse(localStorage.getItem('dilia-tripeaks-best')).w") == 1, f'[{w}] tp win counted')
    await pg.click('#newgame'); await pg.wait_for_timeout(300)
    s = (await pg.evaluate('DiliaTriPeaks.state()'))['S']; await pg.reload(); await pg.wait_for_timeout(500)
    ok((await pg.evaluate('DiliaTriPeaks.state()'))['S'] == s, f'[{w}] tp game restored after reload')
    # a corrupt save is ignored
    await pg.evaluate("localStorage.setItem('dilia-tripeaks-free', JSON.stringify({S:{pk:[1],stock:[],waste:[]},moves:1,t:1}))"); await pg.reload(); await pg.wait_for_timeout(500)
    ok(len((await pg.evaluate('DiliaTriPeaks.state()'))['S']['pk']) == 28, f'[{w}] tp corrupt save ignored')
    ok(errs == [], f'[{w}] tp errors: {errs[:3]}'); await ctx.close()

async def hub(br):
    ctx, pg, errs = await open_(br, 'play')
    for s in ['freecell', 'pyramid', 'tripeaks']: ok(await pg.locator(f'a[href="../{s}/"]').count() >= 1, f'hub card for {s}')
    ok('mahjong' in (await pg.inner_text('body')).lower(), 'hub still lists mahjong as coming'); ok('FreeCell, mahjong' not in await pg.inner_text('body'), 'hub no longer lists FreeCell as soon')
    await pg.keyboard.press('Control+k'); await pg.keyboard.type('freecell'); await pg.wait_for_timeout(300)
    ok(await pg.locator('.pr').filter(has_text='FreeCell').count() >= 1, 'search finds FreeCell'); ok(errs == [], f'hub errors {errs[:3]}'); await ctx.close()

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for w in (1280, 390):
            await freecell(br, w); await pyramid(br, w); await tripeaks(br, w)
        await hub(br); await br.close()
    print(f'{n_ok + len(fails)} checks, {len(fails)} failed'); raise SystemExit(1 if fails else 0)
asyncio.run(main())
