import os, pathlib, tempfile
FIX = str(pathlib.Path(__file__).resolve().parent / 'fixtures'); ROOT = str(pathlib.Path(__file__).resolve().parents[2]); OUT = tempfile.mkdtemp()
import asyncio
from playwright.async_api import async_playwright
fails=[]; errs=[]
def ck(n,c,e=''):
    print(('PASS ' if c else 'FAIL ')+n+(' '+str(e) if e else '')); c or fails.append(n)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':1300,'height':800}); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto('http://localhost:8765/pdf-reader/')
    await pg.set_input_files('#rpick',FIX+'/ann.pdf'); await pg.wait_for_function("window.__reader&&__reader.tabs.length>0"); await pg.wait_for_timeout(800)
    ck('Comments tab exists', bool(await pg.query_selector('.rsn[data-p=comments]')))
    await pg.click('.rsn[data-p=comments]'); await pg.wait_for_selector('.rcm',timeout=10000)
    items=await pg.evaluate("[...document.querySelectorAll('.rcmb')].map(b=>b.innerText.replace(/\\n+/g,' | '))")
    print(items)
    ck('4 marks listed (popups excluded)', len(items)==4, len(items))
    ck('note shows page, type, author, date, text', any('Page 1' in i and 'Note' in i and 'Alex Ex' in i and '2026-11-20' in i and 'Check the total here' in i for i in items))
    ck('highlight without text says No text', any('Highlight' in i and 'No text' in i for i in items))
    ck('text box on page 4', any('Page 4' in i and 'Text box' in i for i in items))
    ck('hostile text shown as text, not run', await pg.evaluate("!document.querySelector('.rcm script')") and any('<script>' in i for i in items))
    ck('summary line', 'with text' in await pg.inner_text('.rtip'))
    await pg.click('.rcmb:has-text("Final page note")'); await pg.wait_for_timeout(700)
    ck('click jumps to page 6', await pg.evaluate("__reader.T.cur")==6, await pg.evaluate("__reader.T.cur"))
    await pg.set_input_files('#rpick',FIX+'/ten.pdf'); await pg.wait_for_function("__reader.tabs.length==2"); await pg.wait_for_selector('.rnone',timeout=10000)
    await pg.wait_for_function("[...document.querySelectorAll('.rnone')].some(e => !/Reading/.test(e.textContent))", timeout=10000); nn = await pg.eval_on_selector_all('.rnone', 'es => es.map(e => e.textContent)'); ck('PDF without marks says so', any('no comments' in x.lower() for x in nn), nn)
    await pg.screenshot(path=OUT+'/cm.png')
    ck('no console errors', not errs, errs[:3])
    await b.close()
  print('FAILS', fails); import sys; sys.exit(1 if fails or errs else 0)
asyncio.run(main())
