"""Every page under the real _headers (port 8766): fails on any Content-Security-Policy violation, script error,
console error, or request to anything other than this site (the 'nothing leaves your device' promise).
Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-sweep.py"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]; B = 'http://127.0.0.1:8766/'
SKIP = {'blog', 'assets', 'dev', 'desktop', 'node_modules'}
pages = [''] + sorted({p.parent.relative_to(ROOT).as_posix() + '/' for p in ROOT.glob('*/index.html') if p.parent.name not in SKIP})
pages += sorted(p.relative_to(ROOT).as_posix() for p in ROOT.glob('blog/**/index.html'))
pages += sorted(p.relative_to(ROOT).as_posix() for p in ROOT.glob('news/*/index.html'))
pages = [p.replace('index.html', '') for p in pages]
async def main():
    bad = {}
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await br.new_context(); sem = asyncio.Semaphore(6)
        async def one(s):
            async with sem:
                pg = await ctx.new_page(); msgs = []
                pg.on('console', lambda m: msgs.append('console: ' + m.text) if m.type == 'error' or 'Content Security' in m.text or 'Refused' in m.text else None)
                pg.on('pageerror', lambda e: msgs.append('script error: ' + str(e)))
                pg.on('request', lambda r: msgs.append('OUTSIDE REQUEST: ' + r.url) if not r.url.startswith(('http://127.0.0.1:8766/', 'data:', 'blob:', 'about:')) else None)
                try:
                    r = await pg.goto(B + s, wait_until='load', timeout=30000)
                    if not r or r.status != 200: msgs.append('status %s' % (r and r.status))
                    await pg.wait_for_timeout(600)
                except Exception as e: msgs.append('load failed: ' + str(e)[:120])
                if msgs: bad[s or '/'] = msgs[:3]
                await pg.close()
        await asyncio.gather(*(one(s) for s in pages))
        await br.close()
    print(len(pages), 'pages checked,', len(bad), 'with problems')
    for k, v in sorted(bad.items()): print(' ', k, v)
    sys.exit(1 if bad else 0)
asyncio.run(main())
