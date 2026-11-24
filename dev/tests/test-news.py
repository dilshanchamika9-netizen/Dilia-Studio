"""News hub page with fake data/news.json (port 8766). No outside requests are allowed."""
import asyncio, sys, json, time
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
NOW = int(time.time())
DATA = {'updated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(NOW - 7200)), 'notes': [],
  'hn': [{'id': 100 + i, 'title': f'Story {i} <img src=x onerror=alert(1)>' if i == 0 else f'Story {i}', 'url': f'https://site{i}.example.org/p', 'domain': f'site{i}.example.org', 'score': 100 + i, 'comments': i, 'time': NOW - 600 * (i + 1)} for i in range(40)],
  'sec': [{'company': 'Nvidia', 'form': '10-Q', 'kind': 'Quarterly report', 'date': '2026-11-20', 'about': [], 'url': 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000001/nvda.htm'},
          {'company': 'Apple', 'form': '8-K', 'kind': 'Current report', 'date': '2026-11-19', 'about': ['financial results', 'director or executive change'], 'url': 'https://www.sec.gov/Archives/edgar/data/320193/000032019326000003/a.htm'},
          {'company': 'Evil', 'form': '8-K', 'kind': 'Current report', 'date': '2026-11-18', 'about': [], 'url': 'javascript:alert(1)'}]}
async def serve(pg, body, status=200):
    await pg.route('**/data/news.json', lambda r: r.fulfill(status=status, content_type='application/json', body=body))
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx, pg, errs = await mk(br); await serve(pg, json.dumps(DATA)); await pg.goto(B + 'news/'); await pg.wait_for_selector('#nhn li a')
        ok(await pg.locator('#nhn > li').count() == 40, '40 headlines'); ok('Updated 2 h ago' in await pg.inner_text('#nstamp'), 'stamp: ' + await pg.inner_text('#nstamp'))
        t0 = await pg.inner_text('#nhn li:first-child a.nt'); ok(t0.startswith('Story 0 <img'), 'title kept as plain text'); ok(await pg.locator('#nhn img').count() == 0, 'no injected elements')
        a = pg.locator('#nhn li:first-child a.nt'); ok(await a.get_attribute('href') == 'https://site0.example.org/p' and await a.get_attribute('target') == '_blank' and 'noopener' in await a.get_attribute('rel') and 'nofollow' in await a.get_attribute('rel'), 'headline link opens safely in new tab')
        ok('news.ycombinator.com/item?id=100' in await pg.locator('#nhn li:first-child .nm a').get_attribute('href'), 'discussion link'); m = await pg.inner_text('#nhn li:first-child .nm'); ok('site0.example.org' in m and '100 points' in m and '10 min ago' in m, 'meta line: ' + m)
        ok(await pg.locator('#nsec > li').count() == 3, '3 filings'); s0 = await pg.inner_text('#nsec li:first-child'); ok('Nvidia' in s0 and 'Quarterly report' in s0 and '20 Nov 2026' in s0 and 'Form 10-Q' in s0, 'filing row: ' + s0.replace('\n', ' | '))
        ok('financial results, director or executive change' in await pg.inner_text('#nsec li:nth-child(2)'), 'about words')
        ok(await pg.locator('#nsec li:nth-child(3) a[href]').count() == 0, 'javascript: link is not made clickable'); ok((await pg.get_attribute('#nsec li:first-child a', 'href')).startswith('https://www.sec.gov/'), 'filing link to sec.gov')
        ok('Our stories' in await pg.inner_text('main') and 'coming here' in await pg.inner_text('main'), 'stories placeholder'); ok(await pg.locator('a[href="../blog/"]').count() >= 1, 'link to guides kept')
        ok(await pg.locator('nav.links a.opt:has-text("Read")').get_attribute('href') == '../news/', 'menu Read points to news'); ok(not errs, f'errors {errs[:3]}'); await ctx.close()
        # empty first-run data
        ctx, pg, errs = await mk(br); await serve(pg, json.dumps({'updated': '', 'hn': [], 'sec': [], 'notes': []})); await pg.goto(B + 'news/'); await pg.wait_for_timeout(500)
        ok('first headlines will appear' in await pg.inner_text('#nstamp') and 'No headlines' in await pg.inner_text('#nhn') and 'No recent filings' in await pg.inner_text('#nsec'), 'empty data message'); ok(not errs, f'empty errors {errs[:3]}'); await ctx.close()
        # failure / garbage
        for body, st in [('nope', 200), ('{}', 404), ('{"hn":"x","sec":5}', 200)]:
            ctx, pg, errs = await mk(br); await serve(pg, body, st); await pg.goto(B + 'news/'); await pg.wait_for_timeout(500)
            t = await pg.inner_text('#nstamp'); ok(t != 'Loading the latest headlines…', f'handles bad data {body[:12]} {st}: {t}'); ok(not any('Uncaught' in e or 'TypeError' in e for e in errs), f'no script errors {body[:12]} {errs[:2]}'); await ctx.close()
        for th in ('dark', 'light'):
            ctx, pg, errs = await mk(br, 390, th); await serve(pg, json.dumps(DATA)); await pg.goto(B + 'news/'); await pg.wait_for_selector('#nhn li a')
            ok(await pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'[{th} 390] no sideways scroll'); ok(not errs, f'[{th}] errors {errs[:2]}'); await pg.screenshot(path=f'/tmp/news-{th}.png', full_page=False); await ctx.close()
        await br.close()
asyncio.run(main()); print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
