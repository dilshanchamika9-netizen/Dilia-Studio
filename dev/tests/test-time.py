"""Life time pages: countdown timer, stopwatch (fake clock), day/night map, calendars (port 8766)."""
import asyncio, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
T0 = 1_800_000_000   # seconds: Playwright Python's clock takes seconds
async def mk(br, w=1000, theme='dark'):
    ctx = await br.new_context(viewport={'width': w, 'height': 900})
    await ctx.add_init_script(f"try{{if(!localStorage.getItem('dilia-theme'))localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith((B, 'data:', 'blob:')) else None)
    return ctx, pg, errs
async def txt(pg, sel): return (await pg.inner_text(sel)).strip()
async def timer(br):
    ctx, pg, errs = await mk(br); await pg.clock.install(time=T0); await pg.goto(B + 'countdown-timer/'); await pg.wait_for_timeout(300)
    await pg.click('[data-min="1"]'); ok(await pg.locator('.tmc').count() == 1, 'preset adds a timer')
    ok(await txt(pg, '.tmt') == '1:00', 'new timer shows 1:00'); await pg.click('.tmc [data-a=go]'); await pg.clock.run_for(30_000)
    v = await txt(pg, '.tmt'); ok(v in ('0:29', '0:30', '0:31'), f'after 30 s about 0:30, got {v}')
    await pg.click('.tmc [data-a=go]'); v = await txt(pg, '.tmt'); await pg.clock.run_for(20_000); ok(await txt(pg, '.tmt') == v, 'paused timer does not move')
    ok(await txt(pg, '.tmc [data-a=go]') == 'Resume', 'pause button says Resume')
    await pg.click('.tmc [data-a=go]'); await pg.clock.run_for(28_000); ok(await txt(pg, '.tmt') in ('0:01', '0:02', '0:03'), f'29 s later about 0:01, got {await txt(pg, ".tmt")}')
    await pg.clock.run_for(4_000); ok('done' in await pg.get_attribute('.tmc', 'class'), 'timer finishes'); ok(await pg.evaluate('DiliaTimer.ring()') >= 1, 'alarm rings'); ok(await pg.locator('#tmstop').is_visible(), 'stop-alarm button shown')
    await pg.click('#tmstop'); ok(await pg.evaluate('DiliaTimer.ring()') == 0 and not await pg.locator('#tmstop').is_visible(), 'alarm stops')
    # custom time + name, and bad input
    await pg.fill('#tmh', '1'); await pg.fill('#tmm', '2'); await pg.fill('#tms', '3'); await pg.fill('#tmname', 'Tea <b>'); await pg.click('#tmadd')
    ok(await pg.locator('.tmc').count() == 2 and '1:02:03' in await pg.inner_text('.tmc:nth-child(2) .tmt'), 'custom 1:02:03 timer'); ok('Tea <b>' in await pg.inner_text('.tmc:nth-child(2) .tml') and await pg.locator('.tml b').count() == 0, 'name is shown as text, not as markup')
    await pg.fill('#tmh', '0'); await pg.fill('#tmm', '0'); await pg.fill('#tms', '0'); await pg.click('#tmadd'); ok(await pg.locator('.tmc').count() == 2 and 'from 1 second' in await pg.inner_text('#tmmsg'), 'zero time refused with a message')
    # persistence: start the 2nd timer, reload 60 s later in the same browser storage
    await pg.click('.tmc:nth-child(2) [data-a=go]'); st = await ctx.storage_state(); await ctx.close()
    ctx2 = await br.new_context(storage_state=st, viewport={'width': 1000, 'height': 900}); p2 = await ctx2.new_page(); await p2.clock.install(time=T0 + 60 + 30 + 20 + 29 + 2 + 60)
    await p2.goto(B + 'countdown-timer/'); await p2.wait_for_timeout(300)
    ok(await p2.locator('.tmc').count() == 2, 'timers survive a reload')
    t = await txt(p2, '.tmc:nth-child(2) .tmt'); ok(t.startswith('1:01:') or t.startswith('1:00:'), f'running timer kept counting while the page was closed: {t}')
    await p2.click('#tmclear'); ok(await p2.locator('.tmc').count() == 0, 'remove all'); await ctx2.close()
    ok(not errs, f'timer errors {errs[:3]}')
async def stopwatch(br):
    ctx, pg, errs = await mk(br); await pg.clock.install(time=T0); await pg.goto(B + 'stopwatch/'); await pg.wait_for_timeout(300)
    ok(await txt(pg, '#swtime') == '00:00.00', 'starts at zero'); ok(await pg.locator('#swlap').is_disabled(), 'lap disabled before start')
    await pg.click('#swgo'); await pg.clock.run_for(1234); v = await txt(pg, '#swtime'); ms = int(v[3:5]) * 1000 + int(v[6:8]) * 10; ok(1150 <= ms <= 1700 and v.startswith('00:01'), f'about 1.2 s shows, got {v}')
    await pg.click('#swlap'); await pg.clock.run_for(2000); await pg.click('#swlap'); await pg.clock.run_for(500); await pg.click('#swlap')
    rows = await pg.locator('#swlaps tbody tr').count(); ok(rows == 3, f'three laps, got {rows}')
    st = await pg.evaluate('DiliaStopwatch.state()'); d = [st['laps'][0], st['laps'][1] - st['laps'][0], st['laps'][2] - st['laps'][1]]
    ok(abs(d[0] - 1234) < 400 and abs(d[1] - 2000) < 400 and abs(d[2] - 500) < 400, f'lap times {d}')
    ok(await pg.locator('#swlaps tr.fast').count() == 1 and await pg.locator('#swlaps tr.slow').count() == 1, 'fastest and slowest marked')
    await pg.click('#swgo'); a = await txt(pg, '#swtime'); await pg.clock.run_for(5000); ok(await txt(pg, '#swtime') == a, 'stopped watch does not move')
    await pg.click('#swgo'); await pg.clock.run_for(1000); ok(await txt(pg, '#swtime') != a, 'resume continues')
    await pg.click('#swgo'); await pg.click('#swreset'); ok(await txt(pg, '#swtime') == '00:00.00' and await pg.locator('#swlaps tbody tr').count() == 0, 'reset clears time and laps')
    await pg.click('#swgo'); await pg.clock.run_for(3000); await pg.keyboard.press('l'); ok(await pg.locator('#swlaps tbody tr').count() == 1, 'L key records a lap'); await pg.keyboard.press('Space'); ok(await pg.evaluate('DiliaStopwatch.state().run') is False, 'Space stops it')
    ok(not errs, f'stopwatch errors {errs[:3]}'); await ctx.close()

async def daynight(br):
    ctx, pg, errs = await mk(br); await pg.goto(B + 'day-night-map/'); await pg.wait_for_timeout(400)
    r = await pg.evaluate("""() => { const S = SunMath, G = DiliaCityGeo, C = DiliaCities, out = {bad: [], n: 0};
      C.forEach(c => { const g = G[c[0]]; if (!g) return; out.n++; const lo = g[1], la = g[0];
        const offs = [Date.UTC(2026,0,15,12), Date.UTC(2026,6,15,12)].map(t => CalcMath.offsetMin(c[1], t) / 60);
        const ideal = lo / 15, dmin = Math.min(...offs.map(o => Math.abs(o - ideal)));
        if (dmin > 3.2 || Math.abs(la) > 90 || Math.abs(lo) > 180) out.bad.push([c[0], ideal.toFixed(1), offs]); });
      const sol = S.pos(Date.UTC(2026,5,21,12)), dsol = S.pos(Date.UTC(2026,11,21,12)), eq = S.pos(Date.UTC(2026,2,20,15));
      out.jun = sol.dec; out.dec = dsol.dec; out.eq = eq.dec; return out; }""")
    ok(r['n'] >= 75, f'cities with coordinates {r["n"]}'); ok(not r['bad'], f'longitude vs zone offset mismatch {r["bad"][:5]}')
    ok(abs(r['jun'] - 23.44) < 0.1 and abs(r['dec'] + 23.44) < 0.1 and abs(r['eq']) < 0.5, f'declination {r["jun"]:.2f} {r["dec"]:.2f} {r["eq"]:.2f}')
    ok(await pg.evaluate("document.getElementById('dncv').width") > 100, 'canvas drawn')
    a = await txt(pg, '#dnsun'); await pg.fill('#dnrange', '360'); await pg.dispatch_event('#dnrange', 'input')
    ok(await txt(pg, '#dnsun') != a and '6h' in await txt(pg, '#dnshift'), 'time shift moves the sun')
    await pg.click('#dnnow'); ok(await txt(pg, '#dnshift') == 'Live', 'back to now')
    await pg.select_option('#dnsel', 'London'); ok('London' in await txt(pg, '#dndet'), 'city detail shows')
    await pg.evaluate("DiliaDayNight.at(Date.UTC(2026,5,21,12))"); await pg.select_option('#dnsel', 'Reykjavik') if await pg.locator('#dnsel option[value=Reykjavik]').count() else None
    d = await txt(pg, '#dndet'); ok('sunrise' in d or 'Sun' in d, 'polar/high-latitude detail ok')
    # london noon at equinox: ~12h day
    await pg.evaluate("DiliaDayNight.at(Date.UTC(2026,2,20,12))"); await pg.select_option('#dnsel', 'London'); ok('12h' in await txt(pg, '#dndet'), 'London equinox day about 12h: ' + (await txt(pg, '#dndet')).replace('\n', ' '))
    await pg.click('#dncv', position={'x': 5, 'y': 5}); ok(True, 'click on empty map is harmless')
    ok(not errs, f'daynight errors {errs[:3]}'); await ctx.close()
    ctx, pg, errs = await mk(br, 390, 'light'); await pg.goto(B + 'day-night-map/'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'day/night no sideways scroll at 390 px'); ok(not errs, f'daynight mobile errors {errs[:3]}'); await ctx.close()
async def todaycal(br):
    ctx, pg, errs = await mk(br); await pg.goto(B + 'todays-date-calendars/'); await pg.wait_for_timeout(300)
    async def cal(d):
        await pg.fill('#tcdate', d); await pg.dispatch_event('#tcdate', 'input')
        return await pg.evaluate("Object.fromEntries([...document.querySelectorAll('.tcc')].map(c=>[c.dataset.cal,c.querySelector('.tb').textContent]))")
    ok(len(await cal('2024-04-10')) == 13, '13 calendars shown')
    c = await cal('2024-04-10'); ok(c['islamic-umalqura'].startswith('1 Shawwal 1445'), 'Eid al-Fitr 2024 = 1 Shawwal 1445: ' + c['islamic-umalqura']); ok(c['julian'] == '28 March 2024', 'Julian 2024-04-10 is 28 March')
    c = await cal('2024-10-03'); ok(c['hebrew'].startswith('1 Tishri 5785'), 'Rosh Hashanah 2024: ' + c['hebrew'])
    c = await cal('2024-03-20'); ok(c['persian'].startswith('1 Farvardin 1403'), 'Nowruz 2024: ' + c['persian'])
    c = await cal('2024-02-10'); ok(c['chinese'].startswith('1 · First Month'), 'Chinese New Year 2024: ' + c['chinese'])
    c = await cal('2000-01-01'); ok(c['julian'] == '19 December 1999', 'Julian 2000-01-01'); ok('2451545' in await txt(pg, '#tcinfo'), 'JDN of J2000 = 2451545'); ok('1999-W52-6' in await txt(pg, '#tcinfo'), 'ISO week of 2000-01-01')
    ok('Saturday' in await txt(pg, '#tcwd'), 'weekday shown')
    await pg.click('#tcnext'); ok(await pg.input_value('#tcdate') == '2000-01-02', 'next day'); await pg.click('#tcprev'); await pg.click('#tcprev'); ok(await pg.input_value('#tcdate') == '1999-12-31', 'previous day crosses year')
    await pg.click('#tctoday'); ok(len(await pg.query_selector_all('.tcc')) == 13, 'today works')
    await pg.fill('#tcdate', ''); await pg.dispatch_event('#tcdate', 'input'); ok(True, 'empty date does not crash')
    ok(not errs, f'calendar errors {errs[:3]}'); await ctx.close()
    ctx, pg, errs = await mk(br, 390, 'light'); await pg.goto(B + 'todays-date-calendars/'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'calendars no sideways scroll at 390 px'); ok(not errs, f'calendar mobile errors {errs[:3]}'); await ctx.close()
MORE = [daynight, todaycal]
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for fn in [timer, stopwatch] + [f for f in globals().get('MORE', [])]: await fn(br)
        await br.close()
if __name__ == '__main__':
    asyncio.run(main()); print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
