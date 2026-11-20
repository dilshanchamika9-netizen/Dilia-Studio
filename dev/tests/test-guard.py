import asyncio, time
from playwright.async_api import async_playwright
U='http://localhost:8766/'; fails=[]; errs=[]
def ck(n,c,e=''):
    print(('PASS ' if c else 'FAIL ')+n+(' '+str(e) if e else ''));  c or fails.append(n)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=await b.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto(U+'compress-pdf/'); await pg.wait_for_timeout(800)
    ck('guard loaded', await pg.evaluate("!!window.DiliaGuard && PDFLib.PDFDocument.__guarded===true"))
    ck('main thread has no qpdf', await pg.evaluate("typeof Module==='undefined'"))
    async def run(js): return await pg.evaluate(js)
    load = lambda path: f"""(async()=>{{const b=new Uint8Array(await (await fetch('{path}')).arrayBuffer()); const t=performance.now();
       try{{const d=await PDFLib.PDFDocument.load(b,{{updateMetadata:false}}); return ['ok',d.getPageCount(),performance.now()-t]}}catch(e){{return ['err',e.message,performance.now()-t]}}}})()"""
    import shutil; shutil.copy('/tmp/t2/ten.pdf','/home/claude/dilia-studio/_g_ten.pdf'); shutil.copy('/tmp/w/locked.pdf','/home/claude/dilia-studio/_g_locked.pdf'); shutil.copy('/tmp/g/loop.pdf','/home/claude/dilia-studio/_g_loop.pdf')
    r=await run(load('/_g_ten.pdf')); ck('normal file loads (10 pages)', r[0]=='ok' and r[1]==10, r)
    r=await run(load('/_g_locked.pdf')); ck('locked file: same "encrypted" message', r[0]=='err' and 'encrypt' in r[1].lower(), r)
    r=await run(load('/_g_loop.pdf')); ck('looping page tree refused in worker, page alive', r[0]=='err', r)
    ck('page responsive after hostile file', await run("1+1")==2)
    # timeout path: force a 1 ms limit
    await run("DiliaGuard.maxMs=1")
    r=await run(load('/_g_ten.pdf')); ck('time limit stops the job with the slow message', r[0]=='err' and 'too long' in r[1], r)
    await run("DiliaGuard.maxMs=0")
    r=await run(load('/_g_ten.pdf')); ck('after a stop, a fresh worker reads normally', r[0]=='ok' and r[1]==10, r)
    # qpdf in worker
    r=await run("""(async()=>{const b=new Uint8Array(await (await fetch('/_g_ten.pdf')).arrayBuffer()); const r=await DiliaGuard.qpdf(['/in.pdf','--encrypt','x1234567','x1234567','256','--','/out.pdf'],b); return [r.code, r.out&&r.out.length, b.length]})()""")
    ck('qpdf runs in worker, caller bytes intact', r[0]==0 and r[1]>1000 and r[2]>1000, r)
    await run("DiliaGuard.maxMs=1")
    r=await run("""(async()=>{const b=new Uint8Array(await (await fetch('/_g_ten.pdf')).arrayBuffer()); try{await DiliaGuard.qpdf(['--linearize','/in.pdf','/out.pdf'],b); return 'no'}catch(e){return e.message}})()""")
    ck('qpdf time limit stops the job', 'too long' in r, r)
    await run("DiliaGuard.maxMs=0")
    # same file object twice: checked once
    r=await run("""(async()=>{const b=new Uint8Array(await (await fetch('/_g_ten.pdf')).arrayBuffer()); await PDFLib.PDFDocument.load(b); const t=performance.now(); await PDFLib.PDFDocument.load(b); return performance.now()-t})()""")
    ck('same bytes are not re-checked', r<400, round(r))
    ck('no CSP or console errors', not [e for e in errs if 'Failed to load resource' not in e], errs[:4])
    await b.close()
  import os
  for f in ('ten','locked','loop'): os.remove(f'/home/claude/dilia-studio/_g_{f}.pdf')
  print('FAILS', fails)
asyncio.run(main())
