"""Trip booklet, packing list, document wallet (port 8766)."""
import asyncio, sys, json
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
TRIP = [{'id': 't1', 'name': 'Colombo <b>trip', 'from': 'Dubai', 'to': 'Colombo', 'start': '2026-12-20', 'end': '2026-12-23', 'items': [
    {'id': 'a', 'date': '2026-12-21', 'time': '09:30', 'title': 'Hotel check-in', 'place': 'Galle Road', 'note': 'Ask for a late checkout', 'ref': 'ABC123', 'kind': 'stay'},
    {'id': 'b', 'date': '2026-12-20', 'time': '06:10', 'title': 'Flight <i>UL</i>', 'place': 'DXB', 'note': '', 'ref': 'PNR9', 'kind': 'flight'},
    {'id': 'c', 'date': '2026-12-22', 'time': '', 'title': 'Beach day', 'place': '', 'note': '', 'ref': '', 'kind': 'sight'}]}]
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        # ---------- packing
        ctx, pg, errs = await mk(br); await pg.goto(B + 'packing-list/'); await pg.wait_for_timeout(400)
        ok(await pg.is_visible('#pkfirst') and not await pg.is_visible('#pkwork'), 'empty state')
        await pg.click('#pkfirst'); ok(await pg.is_visible('#pkwork'), 'list created')
        await pg.fill('#pkdays', '0'); await pg.click('#pkgen'); ok('between 1 and 60' in await txt(pg, '#pkmsg'), 'bad days rejected')
        await pg.fill('#pkdays', '4'); await pg.check('[data-ty=beach]'); await pg.click('#pkgen'); await pg.wait_for_timeout(200)
        ok(await pg.locator('.pkcat').count() >= 5 and 'Swimwear' in await txt(pg, '#pkview') and '4 × tops' in await txt(pg, '#pkview'), 'suggested items added')
        n1 = await pg.locator('.pkcat li').count(); await pg.click('#pkgen'); ok(await pg.locator('.pkcat li').count() == n1 and 'Nothing new' in await txt(pg, '#pkmsg'), 'no duplicates on second add')
        await pg.fill('#pkitem', 'Camera <b>'); await pg.select_option('#pkcat', 'Electronics'); await pg.click('#pkadd'); ok('Camera <b>' in await txt(pg, '#pkview') and await pg.locator('#pkview b').count() == 0, 'own item as plain text')
        await pg.locator('.pkcat input[type=checkbox]').first.check(); ok('1 of' in await txt(pg, '#pkprog'), 'progress counts: ' + await txt(pg, '#pkprog'))
        await pg.reload(); await pg.wait_for_timeout(400); ok('1 of' in await txt(pg, '#pkprog') and 'Camera' in await txt(pg, '#pkview'), 'saved across reload')
        await pg.click('#pkreset'); ok('0 of' in await txt(pg, '#pkprog'), 'untick all')
        await pg.locator('.pkcat [data-del]').first.click(); ok(await pg.locator('.pkcat li').count() == n1, 'item removed (one less than n1+1)')
        await pg.click('#pknew'); ok(await pg.locator('#pklist option').count() == 2 and await pg.locator('.pkcat').count() == 0, 'second list is empty'); await pg.fill('#pkname', 'Weekend'); ok('Weekend' in await pg.inner_text('#pklist'), 'rename shows in select')
        await pg.click('#pkdel'); ok(await pg.locator('#pklist option').count() == 2, 'delete needs second click'); await pg.click('#pkdel'); ok(await pg.locator('#pklist option').count() == 1, 'list deleted')
        await pg.evaluate("localStorage.setItem('dilia-packing-v1', JSON.stringify({lists:[{id:1,name:5,items:[]},{id:2,name:'ok',items:[null,{t:'x',c:'bad'}]}]}))"); await pg.reload(); await pg.wait_for_timeout(400); ok('x' in await txt(pg, '#pkview') and 'Extras' in await txt(pg, '#pkview'), 'corrupt storage tolerated')
        ok(not errs, f'packing errors {errs[:3]}'); await ctx.close()
        # ---------- documents
        ctx, pg, errs = await mk(br); await pg.goto(B + 'document-expiry/'); await pg.wait_for_timeout(400)
        async def add(o, d, k='Passport'):
            await pg.select_option('#dckind', k); await pg.fill('#dcowner', o); await pg.fill('#dcexp', d); await pg.click('#dcadd'); await pg.wait_for_timeout(150)
        await pg.click('#dcadd'); ok('owner name' in await txt(pg, '#dcmsg'), 'owner required'); await pg.fill('#dcowner', 'Ann'); await pg.click('#dcadd'); ok('expiry' in await txt(pg, '#dcmsg'), 'date required')
        import datetime as dt; t = dt.date.today(); f = lambda n: (t + dt.timedelta(days=n)).isoformat()
        await add('Ann', f(-3)); await add('Bo <i>', f(20), 'National ID'); await add('Cy', f(60), 'Visa or permit'); await add('Di', f(150)); await add('Ed', f(900), 'Driving licence')
        labs = await pg.evaluate("[...document.querySelectorAll('.dcb')].map(x=>x.textContent)"); ok(labs == ['Expired', 'Within 30 days', 'Within 90 days', 'Within 6 months', 'OK'], f'levels sorted {labs}')
        ok('3 documents need attention' in await txt(pg, '#dcsum'), 'attention count: ' + await txt(pg, '#dcsum')); ok('Bo <i>' in await txt(pg, '#dclist') and await pg.locator('#dclist i').count() == 0, 'owner as plain text')
        ok('3 days ago' in await txt(pg, '.dce'), 'expired wording')
        await pg.fill('#dcend', f(100)); await pg.fill('#dcmo', '0'); await pg.wait_for_timeout(200); chk = await pg.evaluate("[...document.querySelectorAll('#dccheck li')].map(x=>x.style.borderColor)")
        ok(len(chk) == 5 and chk[0] != chk[4] , 'check list shows fail and pass'); ok('too early' in await txt(pg, '#dccheck') and 'long enough' in await txt(pg, '#dccheck'), 'check wording')
        await pg.fill('#dcmo', '12'); await pg.wait_for_timeout(200); ok((await txt(pg, '#dccheck')).count('too early') == 4, 'with 12 months only the 900-day licence passes: ' + str((await txt(pg, '#dccheck')).count('too early')))
        async with pg.expect_download() as d: await pg.click('#dcics')
        body = open(await (await d.value).path()).read(); ok(body.count('BEGIN:VEVENT') == 5 and 'Renew National ID (Bo <i>)' in body and body.startswith('BEGIN:VCALENDAR'), 'ics has 5 reminders')
        await pg.reload(); await pg.wait_for_timeout(300); ok(await pg.locator('.dcc').count() == 5, 'saved across reload'); await pg.locator('.dcc [data-del]').first.click(); ok(await pg.locator('.dcc').count() == 4, 'removed')
        await pg.evaluate("localStorage.setItem('dilia-docs-v1','{\"docs\":[{\"owner\":1},null,{\"id\":1,\"owner\":\"Z\",\"exp\":\"2026-02-30\"}]}')"); await pg.reload(); await pg.wait_for_timeout(300); ok(await pg.locator('.dcc').count() == 0, 'corrupt storage tolerated')
        ok(not errs, f'docs errors {errs[:3]}'); await ctx.close()
        # ---------- booklet
        ctx, pg, errs = await mk(br); await pg.goto(B + 'trip-booklet/'); await pg.wait_for_timeout(300)
        ok(await pg.is_visible('#bkempty') and not await pg.is_visible('#bkctl'), 'empty state without trips')
        await pg.evaluate("localStorage.setItem('dilia-trips', %s)" % json.dumps(json.dumps(TRIP))); await pg.evaluate("localStorage.setItem('dilia-packing-v1', JSON.stringify({lists:[{id:'l1',name:'Beach',items:[{id:'i1',t:'Swimwear',c:'Clothes'}]}]}))"); await pg.reload(); await pg.wait_for_timeout(400)
        ok(await pg.is_visible('#bkctl'), 'trip found'); o = await txt(pg, '#bkout')
        ok('Colombo <b>trip' in o and await pg.locator('#bkout b').count() > 0, 'title text-safe'); ok(await pg.locator('#bkout .bkcover h2 b').count() == 0 and await pg.locator('#bkout li b i').count() == 0, 'no injected tags')
        ok(await pg.locator('.bkd').count() == 4, '4 days'); order = await pg.evaluate("[...document.querySelectorAll('.bkd li b')].map(x=>x.textContent)"); ok(order == ['Flight <i>UL</i>', 'Hotel check-in', 'Beach day'], f'sorted by date {order}')
        ok('PNR9' in o and 'ABC123' in o and await pg.locator('#bkout table tbody tr').count() == 2, 'bookings table has 2 refs'); ok('Sunday 20 December 2026' in o, 'weekday and date correct')
        await pg.fill('#bkcon', 'Hotel: +94 11 000 0000'); ok('Hotel: +94' in await txt(pg, '#bkout'), 'contacts printed'); await pg.select_option('#bkpk', 'l1'); ok('Swimwear' in await txt(pg, '#bkout'), 'packing list included')
        await pg.uncheck('#bkcov'); ok(await pg.locator('.bkcover').count() == 0, 'cover off'); await pg.uncheck('#bknotes'); ok(await pg.locator('.bklines').count() == 0, 'notes off'); await pg.select_option('#bksz', 'letter'); ok('letter' in await pg.get_attribute('#bkout', 'class'), 'letter class')
        await pg.reload(); await pg.wait_for_timeout(300); ok(await pg.locator('.bkcover').count() == 0 and 'Hotel: +94' in await txt(pg, '#bkout'), 'settings kept')
        await pg.evaluate("localStorage.setItem('dilia-trips','[{\"name\":1},null,{\"id\":\"z\",\"name\":\"Bad\",\"start\":\"2026-02-30\",\"end\":\"2026-03-01\",\"items\":[]}]')"); await pg.reload(); await pg.wait_for_timeout(300); ok(await pg.is_visible('#bkempty'), 'corrupt trips tolerated')
        ok(not errs, f'booklet errors {errs[:3]}'); await ctx.close()
        for u in ('packing-list', 'document-expiry', 'trip-booklet'):
            for th in ('dark', 'light'):
                ctx, pg, errs = await mk(br, 390, th); await pg.goto(B + u + '/'); await pg.wait_for_timeout(400)
                ok(await pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'[{u} {th} 390] no sideways scroll'); ok(not errs, f'[{u} {th}] errors {errs[:2]}'); await ctx.close()
        await br.close()
asyncio.run(main()); print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
