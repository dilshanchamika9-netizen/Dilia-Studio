# Reader app fixes for the owner's issues APP-01..08 (Dilia PDF 1.0.3): smooth zoom, print dialog with preview and safe edges,
# copy, highlight / underline / strike-through with undo, no-text pages offering OCR, Edit button.
# Needs the test server (dev/tests/serve.py) on :8766.
import asyncio, os, sys, tempfile, re
from playwright.async_api import async_playwright
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter, landscape
B = 'http://localhost:8766/pdf-reader/'
D = tempfile.mkdtemp(); EDGE = os.path.join(D, 'edge.pdf')
fails, errs = [], []
def ck(name, cond, info=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else f'  [{info}]'))
    if not cond: fails.append(name)

def fixture():
    c = canvas.Canvas(EDGE, pagesize=landscape(letter))             # like OMEF-0340_PL: landscape Letter, TOTAL row at the very bottom
    c.setFont('Helvetica', 12)
    for k in range(12): c.drawString(40, 560 - k * 40, f'Item {k + 1} copper cable 2.5 mm quantity {k * 10 + 5}')
    c.setFont('Helvetica-Bold', 12); c.drawString(40, 4, 'TOTAL 9,876.50')
    c.setFillColorRGB(1, 0, 0); c.rect(0, 0, 792, 2, stroke=0, fill=1)   # red line along the bottom edge (like OMEF-0340_CI)
    c.showPage()
    c.setPageSize(A4); c.setFont('Helvetica', 14)
    for k in range(20): c.drawString(72, 780 - k * 30, f'Second page line {k} with words to select and copy')
    c.showPage()
    c.setPageSize(A4); c.setFillColorRGB(.2, .2, .2)                # a "scanned" page: shapes only, no text layer
    for k in range(10): c.rect(72, 760 - k * 40, 300 + (k % 3) * 60, 14, stroke=0, fill=1)
    c.showPage()
    c.setPageSize(A4); c.setFont('Helvetica', 14); c.drawString(72, 760, 'Fourth page'); c.showPage()
    c.save()

async def until(pg, js, timeout=15000):
    # wait_for_function evaluates strings inside the page, which the page's CSP blocks; poll through evaluate instead
    t = 0
    while t < timeout:
        try:
            if await pg.evaluate(js): return True
        except Exception: pass
        await pg.wait_for_timeout(100); t += 100
    raise TimeoutError('timed out: ' + js[:80])

async def main():
    fixture()
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await br.new_context(viewport={'width': 1400, 'height': 900}, accept_downloads=True)
        await ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin='http://localhost:8766')
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
        await pg.goto(B); await pg.wait_for_timeout(600)
        await pg.evaluate("(() => { window.print = () => { window.__printed = (window.__printed||0)+1; window.__sheets = document.querySelectorAll('#rprint img').length; window.__pageRule = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch (e) { return []; } }).filter(t => /^@page/.test(t) && /size/.test(t)).pop() || ''; dispatchEvent(new Event('afterprint')); }; })()")
        await pg.set_input_files('#rpick', EDGE); await until(pg, 'window.__reader && __reader.tabs.length === 1 && document.querySelector(".rp[data-n=\\"1\\"] canvas")')
        await pg.wait_for_timeout(800)

        # APP-08 Edit button
        ck('APP-08 Edit button visible on the top bar', await pg.is_visible('#rEdit') and 'Edit' in await pg.inner_text('#rEdit'))
        bar = await pg.evaluate("(() => { const b = document.querySelector('#rEdit').getBoundingClientRect(), t = document.querySelector('.rbar').getBoundingClientRect(); return b.top >= t.top && b.bottom <= t.bottom; })()")
        ck('APP-08 Edit button sits in the toolbar', bar)

        # APP-01 smooth zoom
        await pg.evaluate("__reader.T.zoom = 1; document.querySelector('#rZoom').value='1'; document.querySelector('#rZoom').dispatchEvent(new Event('change'))"); await pg.wait_for_timeout(400)
        s0 = await pg.evaluate('__reader.T.scale')
        box = await pg.locator('.rp[data-n="1"]').bounding_box()
        await pg.mouse.move(box['x'] + 200, box['y'] + 150)
        for _ in range(5):
            await pg.keyboard.down('Control'); await pg.mouse.wheel(0, -4); await pg.keyboard.up('Control'); await pg.wait_for_timeout(20)
        await pg.wait_for_timeout(300)
        s1 = await pg.evaluate('__reader.T.scale')
        r = s1 / s0
        ck('APP-01 five small pinch events zoom gently (1-8%, was 5 full steps = +75%)', 1.01 < r < 1.08, r)
        await pg.keyboard.down('Control'); await pg.mouse.wheel(0, -100); await pg.keyboard.up('Control'); await pg.wait_for_timeout(300)
        r2 = await pg.evaluate('__reader.T.scale') / s1
        ck('APP-01 one mouse-wheel notch zooms about 20%', 1.12 < r2 < 1.3, r2)
        box2 = await pg.locator('.rp[data-n="1"]').bounding_box()
        fx0 = (200) / box['width']; fx1 = (box['x'] + 200 - box2['x']) / box2['width']
        ck('APP-01 point under the pointer stays put while zooming', abs(fx0 - fx1) < .02, (fx0, fx1))
        await pg.wait_for_timeout(400)
        ck('APP-01 pages re-render sharp after zooming', await pg.evaluate("(() => { const p = __reader.T.pages[0]; return p.state === 2 && Math.abs(p.rs - __reader.T.scale) < 1e-6; })()"))
        await pg.select_option('#rZoom', 'width'); await pg.wait_for_timeout(500)

        # APP-02/03/04 print dialog
        await pg.click('#rPrint'); await pg.wait_for_selector('#rdlg[open] .rpgrid'); await until(pg, 'window.__readerPrint && window.__readerPrint.sheets')
        rp = await pg.evaluate('window.__readerPrint')
        ck('APP-04 print dialog with live preview opens', rp['sheets'] == 4 and await pg.evaluate("document.querySelector('.rpbox canvas').width") > 100, rp)
        txt = await pg.inner_text('#rdlg')
        for want in ['Pages to print', 'Current view', 'Odd pages only', 'Reverse pages', 'Fit', 'Actual size', 'Shrink oversized pages', 'Custom scale', 'Poster', 'Multiple', 'Booklet', 'Auto portrait/landscape', 'Paper size', 'Document and markups', 'Form fields only', 'Summarise comments', 'greyscale', 'Save ink/toner', 'High quality', 'Scale:']:
            ck(f'APP-04 dialog has "{want}"', want in txt)
        SAFE = 6.35 * 72 / 25.4
        await pg.select_option('#rdlg select[name=paper]', 'a4'); await pg.wait_for_timeout(500)
        rp = await pg.evaluate('window.__readerPrint')
        ck('APP-04 Auto: the one landscape page is turned to fit portrait A4 (3 of 4 pages are portrait)', rp['H'] > rp['W'] and rp['items'][0][0]['r90'] and not rp['items'][1][0]['r90'], rp['items'][:2])
        await pg.check('#rdlg input[name=pages][value=cur]'); await pg.wait_for_timeout(600)
        rp = await pg.evaluate('window.__readerPrint'); it = rp['items'][0][0]
        ck('APP-02 Fit: a landscape page alone prints on landscape A4', rp['W'] > rp['H'] and not it['r90'], rp)
        ck('APP-02/03 Fit keeps the whole page 6 mm inside every sheet edge', it['x'] >= SAFE - .01 and it['y'] >= SAFE - .01 and it['x'] + it['w'] <= rp['W'] - SAFE + .01 and it['y'] + it['h'] <= rp['H'] - SAFE + .01, it)
        # pixels: the red bottom line and the TOTAL row are drawn inside the sheet, clear of the 6 mm edge
        red = await pg.evaluate("""(() => { const c = document.querySelector('.rpbox canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let y0 = 1e9, y1 = -1, x0 = 1e9, x1 = -1;
            for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) { const k = (y * c.width + i) * 4; if (d[k] > 200 && d[k] - d[k+1] > 50 && Math.abs(d[k+1] - d[k+2]) < 30) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, i); x1 = Math.max(x1, i); } }
            return [x0, x1, y0, y1, c.width, c.height]; })()""")
        sk = red[4] / rp['W']
        ck('APP-03 red bottom-edge line is printed, clear of the 6 mm edge', red[3] > 0 and red[3] <= red[5] - SAFE * sk + 1 and red[0] >= SAFE * sk - 2 and red[1] <= red[4] - SAFE * sk + 2, (red, SAFE * sk))
        total = await pg.evaluate("""(() => { const c = document.querySelector('.rpbox canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let y1 = -1;
            for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width * .3; i++) { const k = (y * c.width + i) * 4; if (d[k] < 90 && d[k+1] < 90 && d[k+2] < 90) y1 = Math.max(y1, y); } return y1; })()""")
        ck('APP-02 TOTAL row (dark text at the bottom) is printed above the safe edge', 0 < total <= red[5] - SAFE * sk + 1 and total > red[5] * .85, (total, red[5]))
        await pg.check('#rdlg input[name=pages][value=all]')
        await pg.check('#rdlg input[name=size][value=actual]'); await pg.wait_for_timeout(500)
        rp = await pg.evaluate('window.__readerPrint')
        ck('APP-04 Actual size prints at 100%', abs(rp['ks'][0] - 1) < 1e-6, rp['ks'])
        await pg.check('#rdlg input[name=size][value=custom]'); await pg.fill('#rdlg input[name=scale]', '50'); await pg.wait_for_timeout(500)
        ck('APP-04 Custom scale 50%', abs((await pg.evaluate('window.__readerPrint'))['ks'][0] - .5) < 1e-6)
        await pg.check('#rdlg input[name=size][value=fit]')
        await pg.click('#rdlg .rpseg span:has-text("Multiple")'); await pg.select_option('#rdlg select[name=nup]', '4'); await pg.wait_for_timeout(500)
        ck('APP-04 Multiple: 4 pages on 1 sheet', (await pg.evaluate('window.__readerPrint'))['sheets'] == 1)
        await pg.click('#rdlg .rpseg span:has-text("Booklet")'); await pg.wait_for_timeout(500)
        rp = await pg.evaluate('window.__readerPrint')
        ck('APP-04 Booklet: 4 pages = 1 folded sheet, 2 sides', rp['sheets'] == 2 and [i['page'] for i in rp['items'][0]] == [4, 1] and [i['page'] for i in rp['items'][1]] == [2, 3], rp['items'])
        await pg.click('#rdlg .rpseg span:has-text("Poster")'); await pg.fill('#rdlg input[name=tile]', '200'); await pg.check('#rdlg input[name=pages][value=cur]'); await pg.wait_for_timeout(600)
        rp = await pg.evaluate('window.__readerPrint')
        ck('APP-04 Poster at 200% tiles one page over several sheets', rp['sheets'] >= 4, rp['sheets'])
        await pg.click('#rdlg .rpseg span:has-text("Size")')
        await pg.check('#rdlg input[name=pages][value=some]'); await pg.fill('#rdlg input[name=range]', '9'); await pg.wait_for_timeout(400)
        ck('APP-04 bad page range blocks Print with a message', await pg.is_disabled('#rdlg button[value=ok]') and 'Type pages' in await pg.inner_text('#rdlg'))
        await pg.fill('#rdlg input[name=range]', '1-4'); await pg.select_option('#rdlg select[name=subset]', 'even'); await pg.check('#rdlg input[name=reverse]'); await pg.wait_for_timeout(500)
        rp = await pg.evaluate('window.__readerPrint')
        ck('APP-04 even pages, reversed', [s[0]['page'] for s in rp['items']] == [4, 2], rp['items'])
        await pg.click('#rdlg button[value=ok]'); await pg.wait_for_timeout(2500)
        ck('APP-04 Print sends one image per sheet to the printer', await pg.evaluate('[window.__printed, window.__sheets]') == [1, 2], await pg.evaluate('[window.__printed, window.__sheets]'))
        rule = await pg.evaluate('window.__pageRule')
        ck('APP-04 paper size is set for the printer (A4 landscape)', '297' in rule and '210' in rule, rule)
        ck('print leaves no images behind', await pg.evaluate("document.querySelectorAll('#rprint img').length") == 0)
        # real print output: Chromium's PDF printer must make exactly one A4 page per sheet
        await pg.click('#rPrint'); await pg.wait_for_selector('#rdlg[open] .rpgrid')
        await pg.check('#rdlg input[name=pages][value=all]'); await pg.select_option('#rdlg select[name=subset]', 'all'); await pg.uncheck('#rdlg input[name=reverse]'); await pg.wait_for_timeout(500)
        await pg.evaluate("window.print = () => { window.__printed = (window.__printed||0)+1; window.__held = true; }; const ae = window.addEventListener; window.addEventListener = function (t, f, o) { if (t === 'afterprint') { window.__ap = f; return; } return ae.call(this, t, f, o); }")
        await pg.click('#rdlg button[value=ok]'); await until(pg, 'window.__held', 30000)
        await pg.emulate_media(media='print'); pdf = await pg.pdf(prefer_css_page_size=True); await pg.emulate_media(media='screen')
        await pg.evaluate("window.__ap && window.__ap()")
        n = len(re.findall(rb'/Type\s*/Page[^s]', pdf)); boxes = re.findall(rb'/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)', pdf)
        ck('APP-04 printed output: 4 pages, no blank extra page', n == 4, n)
        ck('APP-04 printed output is A4 portrait (Auto, most pages portrait)', boxes and all(abs(float(w) - 595.28) < 3 and abs(float(h) - 841.89) < 3 for w, h in boxes), boxes[:2])

        # APP-06 copy (Ctrl+C and right-click > Copy)
        await pg.evaluate('__reader.goTo(2)'); await until(pg, "document.querySelectorAll('.rp[data-n=\"2\"] .textLayer span').length > 3"); await pg.wait_for_timeout(300)
        await pg.evaluate("""(() => { const sp = [...document.querySelectorAll('.rp[data-n="2"] .textLayer span')].find(s => s.textContent.includes('line 3 ')); const r = document.createRange(); r.selectNodeContents(sp); getSelection().removeAllRanges(); getSelection().addRange(r); })()""")
        await pg.evaluate("navigator.clipboard.writeText('x')"); await pg.locator('#rview').focus()
        await pg.evaluate("document.querySelector('#rview').dispatchEvent(new MouseEvent('mouseup', {bubbles: true, button: 0}))"); await pg.wait_for_timeout(100)
        ck('APP-07 selection bar appears (Copy, Highlight, Underline, Strike)', await pg.is_visible('.rqbar') and 'Highlight' in await pg.inner_text('.rqbar'))
        await pg.keyboard.press('Control+c'); await pg.wait_for_timeout(300)
        clip = await pg.evaluate('navigator.clipboard.readText()')
        ck('APP-06 Ctrl+C copies the selected text', 'Second page line 3 with words' in clip, clip)
        await pg.evaluate("navigator.clipboard.writeText('x')")
        sp = await pg.locator('.rp[data-n="2"] .textLayer span', has_text='line 3 ').first.bounding_box()
        await pg.mouse.click(sp['x'] + 10, sp['y'] + 5, button='right'); await pg.wait_for_selector('.rcmenu')
        mt = await pg.inner_text('.rcmenu')
        ck('APP-06 right-click menu has Copy, Underline, Strike through', all(w in mt for w in ['Copy', 'Underline', 'Strike through']), mt)
        await pg.click('.rcmenu .rcmi:has-text("Copy")'); await pg.wait_for_timeout(300)
        ck('APP-06 right-click > Copy copies', 'Second page line 3' in await pg.evaluate('navigator.clipboard.readText()'))

        # APP-07 highlight, underline, strike-through, undo
        ANN = "(async () => { const d = __reader.T.doc, out = []; for (let i = 1; i <= d.numPages; i++) for (const a of await (await d.getPage(i)).getAnnotations()) out.push(a.subtype + (a.quadPoints ? ':q' : '') + (a.hasAppearance ? ':ap' : '')); return out; })()"
        n_before = len([a for a in await pg.evaluate(ANN) if a.startswith('Highlight')])
        await pg.evaluate("""(() => { const sp = [...document.querySelectorAll('.rp[data-n="2"] .textLayer span')].find(s => s.textContent.includes('line 3 ')); const r = document.createRange(); r.selectNodeContents(sp); getSelection().removeAllRanges(); getSelection().addRange(r); })()""")
        await pg.mouse.click(sp['x'] + 10, sp['y'] + 5, button='right'); await pg.wait_for_selector('.rcmenu')
        await pg.click('.rcmenu .rswb[data-c=yellow]')
        await until(pg, "__reader.T.dirty && __reader.T.undo && __reader.T.undo.length === 1", 20000)
        await pg.wait_for_timeout(500); info = await pg.evaluate(ANN)
        ck('APP-07 highlight saved into the PDF as a Highlight annotation with an appearance', [a for a in info if a.startswith('Highlight')] == ['Highlight:q:ap'] and n_before == 0, info)
        ck('APP-07 tab marked unsaved (Ctrl+S writes it)', await pg.evaluate('__reader.T.dirty') is True)
        await pg.wait_for_timeout(800)
        ann = await pg.evaluate("__reader.T.doc.getPage(2).then(p => p.getAnnotations()).then(a => a.filter(x => x.subtype === 'Highlight').map(x => [x.quadPoints ? x.quadPoints.length : 0, x.rect.map(Math.round)]))")
        line3_y = 780 - 3 * 30
        ck('APP-07 highlight covers the selected line', len(ann) == 1 and ann[0][1][1] <= line3_y + 2 and ann[0][1][3] >= line3_y + 8, (ann, line3_y))
        yel = await pg.evaluate("""(() => { const p = __reader.T.pages[1]; const c = p.el.querySelector('canvas'); const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 230 && d[i+1] > 200 && d[i+2] < 120) n++; return n; })()""")
        ck('APP-07 highlight shows on the page (yellow pixels)', yel > 50, yel)
        for kind, sub in (('Underline', 'Underline'), ('Strike', 'StrikeOut')):
            await pg.evaluate("""(() => { const sp = [...document.querySelectorAll('.rp[data-n="2"] .textLayer span')].find(s => s.textContent.includes('line 5 ')); const r = document.createRange(); r.selectNodeContents(sp); getSelection().removeAllRanges(); getSelection().addRange(r); document.querySelector('#rview').dispatchEvent(new MouseEvent('mouseup', {bubbles: true, button: 0})); })()""")
            await pg.wait_for_timeout(150); u = await pg.evaluate('__reader.T.undo.length')
            await pg.click(f'.rqbar .rqb:has-text("{kind}")'); await until(pg, f'__reader.T.undo && __reader.T.undo.length === {u + 1}', 20000)
            await pg.wait_for_timeout(400); has = f'{sub}:q:ap' in await pg.evaluate(ANN)
            ck(f'APP-07 {kind.lower()} saved as {sub}', has)
        await pg.wait_for_timeout(400); await pg.locator('#rview').focus(); await pg.keyboard.press('Control+z')
        await until(pg, '__reader.T.undo.length === 2', 20000)
        await pg.wait_for_timeout(400); left = await pg.evaluate(ANN)
        ck('APP-07 Ctrl+Z removes the last mark', not any(a.startswith('StrikeOut') for a in left) and any(a.startswith('Underline') for a in left), left)

        # APP-05 page without text: notice with Recognise text
        await pg.evaluate('__reader.goTo(3)'); await pg.wait_for_timeout(700)
        b3 = await pg.locator('.rp[data-n="3"]').bounding_box()
        await pg.mouse.click(b3['x'] + 150, b3['y'] + 100); await pg.wait_for_timeout(500)
        ck('APP-05 page with no text explains why and offers Recognise text', await pg.is_visible('.rnotext') and 'Recognise text' in await pg.inner_text('.rnotext'))
        await pg.mouse.click(b3['x'] + 150, b3['y'] + 300, button='right'); await pg.wait_for_selector('.rcmenu')
        ck('APP-05 right-click on that page offers OCR', 'Recognise text (OCR)' in await pg.inner_text('.rcmenu'))
        await pg.keyboard.press('Escape')
        await pg.click('.rnotext button:has-text("Recognise text")'); await pg.wait_for_timeout(1500)
        ck('APP-05 Recognise text opens the OCR tool on this document', any('ocr-pdf' in f.url for f in pg.frames))
        await pg.click('#rToolBack'); await pg.wait_for_timeout(300)
        await pg.click('#rEdit'); await pg.wait_for_timeout(1500)
        ck('APP-08 Edit opens the edit tool', any('edit-pdf' in f.url for f in pg.frames))
        await pg.click('#rToolBack')
        real = [e for e in errs if 'example.com' not in e]
        ck('no page errors or CSP errors', not real, real[:5])
        await br.close()
    print('FAILS', fails); sys.exit(1 if fails else 0)

asyncio.run(main())
