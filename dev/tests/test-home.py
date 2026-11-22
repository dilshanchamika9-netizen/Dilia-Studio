"""Home page (design system v1) and the Life / Play area hubs, under the real _headers (port 8766).
Checks: no script/CSP errors, no outside requests, no sideways scroll at 1440/820/390, today strip correct,
tool of the day and every link on these pages resolve, Tools door counts match the tool list, search and file drop still work.
Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-home.py"""
import asyncio, datetime, sys, urllib.request
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails, n = [], 0
def ok(cond, msg):
    global n; n += 1
    if not cond: fails.append(msg)
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for path in ('', 'life/', 'play/'):
            for w in (1440, 820, 390):
                pg = await br.new_page(viewport={'width': w, 'height': 900}); msgs = []
                pg.on('console', lambda m: msgs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
                pg.on('pageerror', lambda e: msgs.append(str(e)))
                pg.on('request', lambda r: msgs.append('OUTSIDE ' + r.url) if not r.url.startswith((B, 'data:', 'blob:', 'about:')) else None)
                r = await pg.goto(B + path, wait_until='load'); await pg.wait_for_timeout(500)
                ok(r.status == 200, f'{path or "/"} status {r.status}')
                ok(not msgs, f'{path or "/"} @{w}: {msgs[:2]}')
                sw = await pg.evaluate('document.documentElement.scrollWidth')
                ok(sw <= w, f'{path or "/"} @{w}: sideways scroll {sw}px')
                # tap targets in the doors / cards are visible and not clipped
                ok(await pg.evaluate("[...document.querySelectorAll('h1')].every(h=>h.getBoundingClientRect().right<=innerWidth+1)"), f'{path or "/"} @{w}: heading clipped')
                if w == 1440:
                    hrefs = await pg.evaluate("[...document.querySelectorAll('main a[href], footer a[href], header a[href]')].map(a=>a.href)")
                    for h in sorted(set(hrefs)):
                        if not h.startswith(B) or '#' in h: continue
                        try: code = urllib.request.urlopen(h).status
                        except Exception as e: code = str(e)
                        ok(code == 200, f'{path or "/"}: link {h} -> {code}')
                if path == '' and w == 1440:
                    now = datetime.date.today()
                    ok(now.strftime('%A') in await pg.inner_text('#t-date'), 'today strip: weekday wrong')
                    doy = now.timetuple().tm_yday
                    ok(f'Day {doy}' in await pg.inner_text('#t-sub'), 'today strip: day of year wrong')
                    cnt = int(await pg.inner_text('#count'))
                    ready = await pg.evaluate("DiliaSearch.all().filter(t=>t.ready).length")
                    ok(cnt == ready and cnt > 100, f'tool count {cnt} vs {ready}')
                    items = await pg.evaluate("[...document.querySelectorAll('#door-tools li')].map(l=>+l.textContent.split('· ')[1])")
                    ok(len(items) == 5 and sum(items) == ready, f'Tools door counts {items} sum != {ready}')
                    tl = await pg.get_attribute('#t-tool', 'href')
                    ok(tl and tl.endswith('/') and (await pg.inner_text('#t-tn')).strip(), 'tool of the day missing')
                    await pg.fill('#q', 'merge'); await pg.wait_for_timeout(200)
                    ok('Merge' in await pg.inner_text('#plist'), 'search: "merge" not found')
                    # drop a PDF on the page: the tool chooser opens with PDF tools
                    await pg.evaluate("""()=>{const dt=new DataTransfer();dt.items.add(new File(['%PDF-1.4'],'a.pdf',{type:'application/pdf'}));
                      for(const t of ['dragenter','drop'])window.dispatchEvent(new DragEvent(t,{dataTransfer:dt,bubbles:true,cancelable:true}));}""")
                    await pg.wait_for_timeout(200)
                    ok(not await pg.get_attribute('#fit', 'hidden') is not None and 'Compress' in await pg.inner_text('#fit-g'), 'file drop: chooser did not open')
                await pg.close()
        await br.close()
    print(n, 'checks,', len(fails), 'failed')
    for f in fails: print('  FAIL', f)
    sys.exit(1 if fails else 0)
asyncio.run(main())
