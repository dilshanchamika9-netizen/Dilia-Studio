"""Dilia Pulse (news) front page and story pages (port 8766). No outside requests are allowed."""
import asyncio, sys, re, pathlib, html
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]; B = 'http://127.0.0.1:8766/'
ns = {}; exec((ROOT / 'dev' / 'news-posts.py').read_text(), ns); POSTS = ns['POSTS']; N = len(POSTS)
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
async def mk(br, w=1366, theme='light'):
    ctx = await br.new_context(viewport={'width': w, 'height': 900})
    await ctx.add_init_script(f"try{{localStorage.setItem('dilia-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith((B, 'data:', 'blob:')) else None)
    pg.on('request', lambda r: errs.append('OLD DATA ' + r.url) if 'news.json' in r.url else None)
    return ctx, pg, errs
async def main():
    # source checks: generated HTML never carries raw story text that could become markup
    for p in POSTS:
        h = (ROOT / 'news' / p['slug'] / 'index.html').read_text()
        ok(html.escape(p['title'], quote=False) in h, f'{p["slug"]}: title escaped in page')
        ok(len(re.findall(r'<script\b(?! type="application/ld\+json")', h)) == len(re.findall(r'<script src="[^"]+"( defer)?></script>', h)), f'{p["slug"]}: only external scripts')
        ok(all(u.startswith('https://') for _, u in p['sources']) and len(p['sources']) >= 1, f'{p["slug"]}: https sources')
    async with async_playwright() as pw:
        br = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx, pg, errs = await mk(br); await pg.goto(B + 'news/'); await pg.wait_for_timeout(300)
        ok(await pg.locator('.phero .pcd').count() == 4, 'hero: lead + 3 side stories')
        tops = await pg.locator('.phero .pcd').evaluate_all('a => a.map(x => x.dataset.sec)'); ok(len(set(tops)) == min(4, len({p['topic'] for p in POSTS})), f'hero sections differ {tops}')
        ok(await pg.locator('#pgrid .pcd').count() == N, f'grid has all {N} stories'); ok(await pg.locator('#pgrid .pcd:visible').count() == N - 4, 'top stories not repeated in Latest')
        ok(await pg.locator('.pnm').count() == 4, 'four numbers'); ok(await pg.locator('.pbrief li').count() == 6, 'briefing list')
        ok(await pg.locator('.pmove a[aria-hidden=true]').count() == await pg.locator('.pmove a:not([aria-hidden])').count(), 'ticker copy hidden from screen readers')
        await pg.click('.ptab[data-sec=ai]'); await pg.wait_for_timeout(200)
        n_ai = sum(p['topic'] == 'AI' for p in POSTS)
        ok(await pg.locator('#pgrid .pcd:visible').count() == n_ai and await pg.locator('.phero').is_hidden(), f'AI tab shows {n_ai} AI stories and hides top band')
        ok((await pg.inner_text('#pgh')).upper() == 'AI' and pg.url.endswith('#ai') and await pg.get_attribute('.ptab[data-sec=ai]', 'aria-pressed') == 'true', 'AI tab state + address')
        await pg.click('.ptab[data-sec=all]'); await pg.wait_for_timeout(200); ok(await pg.locator('.phero').is_visible() and await pg.locator('#pgrid .pcd:visible').count() == N - 4, 'back to top stories')
        ok(await pg.locator('nav.links a.opt:has-text("Pulse")').get_attribute('href') == '../news/', 'menu Pulse points to news'); ok(not errs, f'errors {errs[:3]}'); await ctx.close()
        ctx, pg, errs = await mk(br); await pg.goto(B + 'news/#policy'); await pg.wait_for_timeout(300)
        ok(await pg.locator('#pgrid .pcd:visible').count() == sum(p['topic'] == 'Policy' for p in POSTS), 'opens on #policy'); await ctx.close()
        ctx, pg, errs = await mk(br); await pg.goto(B + 'news/#nonsense<b>'); await pg.wait_for_timeout(300)
        ok(await pg.locator('.phero').is_visible() and (await pg.inner_text('#pgh')).lower() == 'latest', 'unknown hash falls back to top stories'); ok(not errs, f'hash errors {errs[:2]}'); await ctx.close()
        # story page
        p = POSTS[1]; ctx, pg, errs = await mk(br); await pg.goto(B + f'news/{p["slug"]}/'); await pg.wait_for_timeout(300)
        ok(await pg.inner_text('h1') == p['title'], 'story title'); ok(await pg.locator('.pfacts li').count() == len(p['facts']), 'key facts')
        ok(await pg.locator('.psrcs a').count() == len(p['sources']), 'sources listed'); a = pg.locator('.psrcs a').first
        ok(await a.get_attribute('target') == '_blank' and 'noopener' in await a.get_attribute('rel'), 'source links open safely')
        ok('not investment advice' in await pg.inner_text('.pdisc'), 'disclosure'); ok(await pg.locator('.pmore .pcd').count() == 3, 'more stories')
        ok(await pg.locator('.pfig svg[role=img][aria-label]').count() == 1, 'graphic has a text label')
        ok(await pg.get_attribute('.ptab.on', 'href') == '../#' + p['topic'].lower(), 'section tab on story page')
        await pg.click('.pcrumb a:has-text("Pulse")'); await pg.wait_for_timeout(200); ok(pg.url.endswith('/news/'), 'crumb back to front page'); ok(not errs, f'story errors {errs[:3]}'); await ctx.close()
        an = next(q for q in POSTS if q.get('note')); ctx, pg, errs = await mk(br); await pg.goto(B + f'news/{an["slug"]}/'); ok(await pg.locator('.pnt').count() == 1, 'extra note shown'); await ctx.close()
        for th in ('dark', 'light'):
            for url in ('news/', f'news/{POSTS[0]["slug"]}/'):
                ctx, pg, errs = await mk(br, 390, th); await pg.goto(B + url); await pg.wait_for_timeout(300)
                ok(await pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'[{th} 390 {url}] no sideways scroll'); ok(not errs, f'[{th}] errors {errs[:2]}')
                if th == 'dark':
                    ok(await pg.evaluate("[getComputedStyle(document.querySelector('.ptab[aria-pressed=true], .ptab.on')).backgroundColor, getComputedStyle(document.querySelector('.ptab[aria-pressed=true], .ptab.on')).color]") == ['rgb(255, 255, 255)', 'rgb(11, 18, 32)'], f'[dark {url}] active tab readable')
                    ok(await pg.evaluate("getComputedStyle(document.querySelector('.ptitle, h1')).color") != 'rgb(11, 18, 32)', f'[dark {url}] text is light')
                await ctx.close()
        await br.close()
asyncio.run(main()); print('FAILS', fails, 'ok', n_ok); sys.exit(1 if fails else 0)
