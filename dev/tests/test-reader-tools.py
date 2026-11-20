import asyncio, io
from playwright.async_api import async_playwright
from pypdf import PdfReader
B = 'http://localhost:8766/pdf-reader/'
fails, errs, csp = [], [], []
def ck(n, c, i=''):
    print(('PASS ' if c else 'FAIL ') + n + ('' if c else f'  [{i}]'))
    if not c: fails.append(n)
async def tab_bytes(pg):
    b = await pg.evaluate("__reader.T.file.arrayBuffer().then(b=>Array.from(new Uint8Array(b)))"); return bytes(b)
async def frame(pg):
    for _ in range(40):
        for f in reversed(pg.frames):
            if '?app=1' in f.url and not f.is_detached(): 
                try:
                    if await f.evaluate("document.readyState") == 'complete': return f
                except Exception: pass
        await pg.wait_for_timeout(150)
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await br.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
        pg = await ctx.new_page()
        pg.on('console', lambda m: (csp.append(m.text) if ('Content Security' in m.text or 'Refused' in m.text) else None, errs.append(m.text) if m.type == 'error' and 'qpdf' not in m.text else None))
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
        await pg.goto(B); await pg.wait_for_timeout(500)
        await pg.set_input_files('#rpick', '/tmp/t2/doc.pdf'); await pg.wait_for_timeout(1500)
        n0 = len(PdfReader('/tmp/t2/doc.pdf').pages)
        # tools panel
        await pg.click('#rTools'); await pg.wait_for_timeout(300)
        nt = await pg.locator('.rtbtn').count(); ck('tools panel lists tools', nt >= 35, nt)
        ids = await pg.evaluate("[...document.querySelectorAll('.rtbtn')].map(b=>b.dataset.tool)")
        # every tool receives the file
        bad = []
        for tid in ids:
            await pg.evaluate(f"__reader.openTool('{tid}')")
            f = await frame(pg)
            ok = False
            for _ in range(30):
                await pg.wait_for_timeout(200)
                try:
                    st = await f.evaluate("(()=>{const w=document.querySelector('#ws'); const g=document.querySelector('#grid'); return [w&&w.dataset.state, g?g.children.length:-1, document.documentElement.classList.contains('inapp'), getComputedStyle(document.querySelector('.nav')).display]})()")
                except Exception as e: st = ['err', str(e)[:60]]; continue
                if st[0] not in (None, 'empty', 'err') or st[1] > 0: ok = st[2] and st[3] == 'none'; break
            if not ok: bad.append((tid, st))
        ck('every tool gets the file, site header hidden', not bad, bad)
        await pg.click('#rToolBack'); await pg.wait_for_timeout(300)
        ck('back to document', await pg.is_hidden('.rtool') and await pg.is_visible('#rview'))
        # 1) Add text -> replaces tab, dirty
        await pg.evaluate("__reader.openTool('add')"); f = await frame(pg); await f.wait_for_selector('.epage'); await pg.wait_for_timeout(1500)
        bb = await f.locator('.epage').nth(0).bounding_box()
        await pg.mouse.click(bb['x'] + bb['width'] * .2, bb['y'] + bb['height'] * .4); await pg.keyboard.type('Hello from the app'); await pg.keyboard.press('Escape')
        await f.click('#go'); await pg.wait_for_timeout(2500)
        ck('result returns to the app', await pg.is_hidden('.rtool'))
        ck('same tab replaced', await pg.locator('.rtab').count() == 1)
        ck('tab marked unsaved', (await pg.inner_text('.rtab[aria-selected=true] .rtn')).startswith('• '))
        b = await tab_bytes(pg); txt = ''.join(pg_.extract_text() for pg_ in PdfReader(io.BytesIO(b)).pages)
        ck('edit is in the document', 'Hello from the app' in txt)
        ck('text shown in viewer', await pg.evaluate("[...document.querySelectorAll('.textLayer span')].some(s=>s.textContent.includes('Hello from the app'))"))
        # 2) Save over the original via a fake file handle
        await pg.evaluate("""(()=>{ window.__written=null; __reader.T.handle={ name:'doc.pdf', queryPermission: async()=> 'granted', createWritable: async()=>({ write: async b=>{ window.__written=b.size||b.byteLength; }, close: async()=>{} }) }; })()""")
        await pg.keyboard.press('Control+s'); await pg.wait_for_timeout(800)
        ck('Ctrl+S writes over the original', await pg.evaluate('window.__written') == len(b), await pg.evaluate('window.__written'))
        ck('saved: no dot', not (await pg.inner_text('.rtab[aria-selected=true] .rtn')).startswith('• '))
        # 3) Extract pages -> new tab
        await pg.evaluate("__reader.openTool('extract')"); f = await frame(pg); await pg.wait_for_timeout(2500)
        tiles = f.locator('#grid .tile, #grid > *'); await tiles.nth(0).click(); await tiles.nth(1).click(); await pg.wait_for_timeout(300)
        await f.click('#go'); await pg.wait_for_timeout(3000)
        ck('extract opens a new tab', await pg.locator('.rtab').count() == 2, await pg.locator('.rtab').count())
        ck('new tab has 2 pages', (await pg.inner_text('#rPgs')) == 'of 2', await pg.inner_text('#rPgs'))
        # 4) close unsaved: cancel keeps, don't save closes
        await pg.click('.rtab[aria-selected=true] .rtx'); await pg.wait_for_timeout(300)
        ck('unsaved prompt', 'not saved' in await pg.inner_text('#rdlg'))
        await pg.click('#rdlg button[value=no]'); await pg.wait_for_timeout(300); ck('cancel keeps tab', await pg.locator('.rtab').count() == 2)
        await pg.click('.rtab[aria-selected=true] .rtx'); await pg.click('#rdlg button[value=drop]'); await pg.wait_for_timeout(500)
        ck("don't save closes", await pg.locator('.rtab').count() == 1)
        # 5) Compress -> replaces, page count same
        await pg.set_input_files('#rpick', '/tmp/t2/doc.pdf'); await pg.wait_for_timeout(1500)
        await pg.evaluate("__reader.openTool('compress')"); f = await frame(pg); await f.wait_for_selector('#go:not([disabled])', timeout=15000)
        await f.click('#go')
        for _ in range(30):
            await pg.wait_for_timeout(500)
            if await pg.is_hidden('.rtool'): break
        ck('compress returns', await pg.is_hidden('.rtool') and (await pg.inner_text('#rPgs')) == f'of {n0}', await pg.inner_text('#rPgs'))
        # 6) Split -> download inside tool, no new tab
        await pg.evaluate("__reader.openTool('split')"); f = await frame(pg); await pg.wait_for_timeout(2500)
        async with pg.expect_download(timeout=15000) as d:
            await f.click('#go')
        dd = await d.value; ck('split downloads (not a document)', dd.suggested_filename.endswith('.zip') and await pg.locator('.rtab').count() == 2, dd.suggested_filename)
        await pg.click('#rToolBack')
        # 7) forged message ignored
        await pg.evaluate("(()=>{ const b=new ArrayBuffer(8); window.postMessage({type:'dilia-result',name:'x.pdf',bytes:b}, location.origin); })()"); await pg.wait_for_timeout(500)
        ck('forged message ignored', await pg.locator('.rtab').count() == 2)
        # 8) dirty tab -> reload warns
        ck('beforeunload armed when unsaved', await pg.evaluate("__reader.T.dirty") == True)
        await br.close()
    ck('no CSP violations', not csp, csp[:3]); ck('no JS errors', not errs, errs[:6])
    print('FAILED', fails)
asyncio.run(main())
