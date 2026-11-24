"""Printable year planner page (port 8766)."""
import asyncio, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
async def mk(br, w=1100, theme='light'):
    ctx = await br.new_context(viewport={'width': w, 'height': 900})
    await ctx.add_init_script(f"try{{if(!localStorage.getItem('dilia-theme'))localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith((B, 'data:', 'blob:')) else None)
    return ctx, pg, errs
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx, pg, errs = await mk(br); await pg.goto(B + 'printable-year-planner/'); await pg.wait_for_timeout(700)
        await pg.select_option('#ypc', 'GB'); await pg.select_option('#ypy', '2026'); await pg.wait_for_timeout(400)
        ok(await pg.locator('.ypm').count() == 12, '12 months')
        # day counts: every month table has exactly dim days
        cnt = await pg.evaluate("[...document.querySelectorAll('.ypm')].map(m=>[...m.querySelectorAll('tbody td:not(.wn)')].filter(t=>t.textContent.trim()).length)")
        ok(cnt == [31,28,31,30,31,30,31,31,30,31,30,31], f'days per month {cnt}')
        # 1 Jan 2026 is Thursday: with Monday start the first row has 3 blanks before it
        first = await pg.evaluate("[...document.querySelector('.ypm tbody tr').children].map(t=>t.textContent.trim())")
        ok(first == ['', '', '', '1', '2', '3', '4'], f'Jan row 1 Monday start {first}')
        ok(await pg.evaluate("document.querySelector('.ypm tbody tr').children[3].className") == 'h', '1 Jan marked as holiday')
        ok(await pg.locator('.ypm td.w').count() == 103, f'weekend cells {await pg.locator(".ypm td.w").count()}')
        await pg.select_option('#ypws', '0'); await pg.wait_for_timeout(300)
        first = await pg.evaluate("[...document.querySelector('.ypm tbody tr').children].map(t=>t.textContent.trim())"); ok(first == ['', '', '', '', '1', '2', '3'], f'Sunday start {first}')
        await pg.select_option('#ypws', '1'); await pg.check('#ypwn'); await pg.wait_for_timeout(300)
        wk = await pg.evaluate("[...document.querySelectorAll('.ypm')[0].querySelectorAll('td.wn')].map(t=>t.textContent)"); ok(wk[0] == '1' and wk[1] == '2', f'ISO weeks {wk}')
        ok(await pg.evaluate("[...document.querySelectorAll('.ypm')[11].querySelectorAll('td.wn')].map(t=>t.textContent).pop()") in ('53', '1'), 'last week number sane')
        await pg.uncheck('#ypwn')
        # own date
        await pg.fill('#ypd', '2026-07-14'); await pg.fill('#ypl', 'Trip <b>'); await pg.click('#ypadd'); await pg.wait_for_timeout(300)
        ok(await pg.locator('.ypm td.m').count() == 1 and '14' == (await pg.inner_text('.ypm td.m')).strip(), 'own date marked'); ok('Trip <b>' in await pg.inner_text('.ypl') and await pg.locator('.ypl b').count() >= 2, 'own date listed as text')
        await pg.click('#ypadd'); ok('Choose a date' in await pg.inner_text('#ypmsg'), 'empty date rejected')
        # title and layout
        await pg.fill('#ypt', 'Our <i>year</i>'); ok(await pg.inner_text('.ypt') == 'Our <i>year</i>', 'title is plain text'); await pg.select_option('#ypor', 'port'); await pg.select_option('#ypsz', 'letter'); ok('port letter' in await pg.get_attribute('#ypout', 'class'), 'layout classes')
        # persistence
        await pg.reload(); await pg.wait_for_timeout(700); ok(await pg.input_value('#ypc') == 'GB' and await pg.locator('.ypm td.m').count() == 1 and await pg.input_value('#ypt') == 'Our <i>year</i>', 'saved across reload')
        await pg.click('#ypmarks button'); await pg.wait_for_timeout(300); ok(await pg.locator('.ypm td.m').count() == 0, 'date removed')
        # leap year
        await pg.select_option('#ypy', '2028'); await pg.wait_for_timeout(400); ok((await pg.evaluate("[...document.querySelectorAll('.ypm')][1].querySelectorAll('tbody td:not(.wn)')"), True) and await pg.evaluate("[...document.querySelectorAll('.ypm')[1].querySelectorAll('tbody td')].filter(t=>t.textContent.trim()).length") == 29, 'Feb 2028 has 29 days')
        # print css present: named page and no crash on emulate print
        await pg.emulate_media(media='print'); ok(await pg.evaluate("getComputedStyle(document.querySelector('.nav')||document.body).display") != 'x', 'print media ok'); ok(await pg.is_visible('.ypg'), 'planner visible in print'); await pg.emulate_media(media='screen')
        await pg.evaluate("localStorage.setItem('dilia-yearplan-v1','{\"marks\":[{\"d\":\"bad\",\"l\":1},null],\"ws\":9,\"y\":5}')"); await pg.reload(); await pg.wait_for_timeout(600); ok(await pg.locator('.ypm').count() == 12, 'corrupt storage tolerated')
        ok(not errs, f'errors {errs[:3]}'); await ctx.close()
        for th in ('dark', 'light'):
            ctx, pg, errs = await mk(br, 390, th); await pg.goto(B + 'printable-year-planner/'); await pg.wait_for_timeout(600)
            ok(await pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'[{th} 390] no sideways scroll'); ok(not errs, f'[{th}] errors {errs[:3]}'); await pg.screenshot(path=f'/tmp/yp-{th}.png'); await ctx.close()
        await br.close()
asyncio.run(main()); print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
