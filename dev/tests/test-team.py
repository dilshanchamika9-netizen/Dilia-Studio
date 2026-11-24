"""Team leave planner page (port 8766)."""
import asyncio, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
async def mk(br, w=1100, theme='dark'):
    ctx = await br.new_context(viewport={'width': w, 'height': 900}, accept_downloads=True)
    await ctx.add_init_script(f"try{{if(!localStorage.getItem('dilia-theme'))localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith((B, 'data:', 'blob:')) else None)
    return ctx, pg, errs
async def txt(pg, s): return (await pg.inner_text(s)).strip()
async def addp(pg, n): await pg.fill('#tlpn', n); await pg.click('#tladd'); await pg.wait_for_timeout(250)
async def addl(pg, i, f, t):
    c = pg.locator('.tlp').nth(i); await c.locator('.tlf').fill(f); await c.locator('.tlt').fill(t); await c.locator('[data-a=ar]').click(); await pg.wait_for_timeout(250)
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx, pg, errs = await mk(br); await pg.goto(B + 'team-leave-planner/'); await pg.wait_for_timeout(600)
        await pg.select_option('#tlc', 'GB'); await pg.select_option('#tly', '2026'); await pg.fill('#tlmin', '2'); await pg.wait_for_timeout(300)
        ok(await pg.locator('#tlcsv').is_disabled(), 'CSV disabled with nobody')
        await addp(pg, 'Ann'); await addp(pg, 'Bo <i>'); await addp(pg, 'Cy')
        ok(await pg.locator('.tlp').count() == 3, 'three people'); ok(await pg.locator('.tlp i').count() == 0 and '<i>' in await pg.input_value('.tlp:nth-child(2) .tln'), 'name with markup is plain text')
        await addl(pg, 0, '2026-01-05', '2026-01-09'); await addl(pg, 1, '2026-01-07', '2026-01-08')
        ok('5' in await txt(pg, '.tlp:nth-child(1) .tld') and '2' in await txt(pg, '.tlp:nth-child(2) .tld'), 'leave days per person')
        ok('7 Jan' in await txt(pg, '#tlconf') and 'only 1 in' in await txt(pg, '#tlconf'), 'shortage shown: ' + await txt(pg, '#tlconf'))
        ok(await pg.locator('#tlgrid i.s').count() == 2, f'two red cells, got {await pg.locator("#tlgrid i.s").count()}')
        ok(await pg.locator('#tlgrid .tlrow').count() == 12, '12 month rows')
        ok(await pg.locator('#tlgrid i.h').count() >= 6, 'UK public holidays marked')
        # weekend leave costs nothing
        await addl(pg, 2, '2026-01-10', '2026-01-11'); ok((await txt(pg, '.tlp:nth-child(3) .tld')).startswith('0'), 'weekend-only leave = 0 days')
        # bad input
        await pg.locator('.tlp').nth(2).locator('.tlf').fill('2026-03-10'); await pg.locator('.tlp').nth(2).locator('.tlt').fill('2026-03-01'); await pg.locator('.tlp').nth(2).locator('[data-a=ar]').click()
        ok('before' in await txt(pg, '#tlmsg'), 'end before start rejected')
        await pg.locator('.tlp').nth(2).locator('[data-a=ar]').click(); ok('first day' in await txt(pg, '#tlmsg'), 'missing date message')
        # persistence
        await pg.reload(); await pg.wait_for_timeout(700)
        ok(await pg.locator('.tlp').count() == 3 and await pg.input_value('#tlc') == 'GB' and await pg.input_value('#tlmin') == '2', 'saved across reload')
        ok('7 Jan' in await txt(pg, '#tlconf'), 'shortage after reload')
        # raise minimum to 3 -> more shortages; to 0 -> none
        await pg.fill('#tlmin', '0'); await pg.wait_for_timeout(300); ok('minimum' in (await txt(pg, '#tlconf')).lower() and await pg.locator('#tlgrid i.s').count() == 0, 'min 0 = no warnings')
        await pg.fill('#tlmin', '1'); await pg.wait_for_timeout(300); ok('No shortages' in await txt(pg, '#tlconf'), 'min 1 with 3 people = fine')
        # remove one range inside: split
        await pg.locator('.tlp').nth(0).locator('.tlx[data-a=rr]').first.click(); await pg.wait_for_timeout(250); ok((await txt(pg, '.tlp:nth-child(1) .tld')).startswith('0'), 'range removed')
        # rename
        await pg.fill('.tlp:nth-child(1) .tln', 'Annie'); await pg.dispatch_event('.tlp:nth-child(1) .tln', 'change'); await pg.wait_for_timeout(250); ok(await pg.input_value('.tlp:nth-child(1) .tln') == 'Annie', 'rename')
        # CSV
        async with pg.expect_download() as d: await pg.click('#tlcsv')
        dl = await d.value; path = await dl.path(); body = open(path).read(); ok(dl.suggested_filename == 'team-leave-2026.csv' and body.startswith('"Person","From"') and '"Bo <i>","2026-01-07","2026-01-08","2","2"' in body, 'csv content: ' + body[:120])
        # year change loads other holidays
        await pg.select_option('#tly', '2027'); await pg.wait_for_timeout(500); ok(await pg.locator('#tlgrid i.h').count() >= 6, '2027 holidays')
        # remove person
        await pg.locator('.tlp').nth(2).locator('[data-a=rp]').click(); await pg.wait_for_timeout(250); ok(await pg.locator('.tlp').count() == 2, 'person removed')
        # clear needs two clicks
        await pg.click('#tlclear'); ok(await pg.locator('.tlp').count() == 2, 'first click only arms'); await pg.click('#tlclear'); await pg.wait_for_timeout(300); ok(await pg.locator('.tlp').count() == 0, 'second click clears')
        # corrupt storage must not break the page
        await pg.evaluate("localStorage.setItem('dilia-team-v1','{\"people\":[{\"name\":5},null,{\"name\":\"X\",\"leave\":\"bad\"}]}')"); await pg.reload(); await pg.wait_for_timeout(600); ok(await pg.locator('.tlp').count() == 1, 'corrupt storage tolerated')
        await pg.evaluate("localStorage.setItem('dilia-team-v1','not json')"); await pg.reload(); await pg.wait_for_timeout(500); ok(await pg.locator('#tlc option').count() > 100, 'bad json tolerated')
        ok(not errs, f'errors {errs[:3]}'); await ctx.close()
        for th in ('dark', 'light'):
            ctx, pg, errs = await mk(br, 390, th); await pg.goto(B + 'team-leave-planner/'); await pg.wait_for_timeout(500); await addp(pg, 'Mobile'); await addl(pg, 0, '2026-06-01', '2026-06-03')
            ok(await pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'[{th} 390] no sideways page scroll'); ok(not errs, f'[{th}] errors {errs[:3]}')
            await pg.screenshot(path=f'/tmp/team-{th}.png', full_page=True); await ctx.close()
        await br.close()
asyncio.run(main()); print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
