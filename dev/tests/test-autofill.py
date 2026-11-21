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
    ctx=await b.new_context(viewport={'width':1300,'height':900}); pg=await ctx.new_page()
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto('http://localhost:8765/fill-pdf-form/'); 
    ck('My details button present on the fill-form page', bool(await pg.query_selector('#myBtn')))
    await pg.set_input_files('#pick',FIX+'/form.pdf'); await pg.wait_for_selector('.fld',timeout=15000); await pg.wait_for_timeout(800)
    ck('14 fields found', await pg.evaluate("__dilia.fields.length")==14, await pg.evaluate("__dilia.fields.length"))
    await pg.click('#myBtn'); await pg.wait_for_selector('#myDlg[open]')
    vals={'first':'Alex','last':'Example','email':'d@example.com','phone':'+971 50 000 0000','company':'Acme LLC','address':'Office 1, Main Street','city':'Dubai','state':'Dubai','zip':'00000','country':'United Arab Emirates'}
    for k,v in vals.items(): await pg.fill(f'[data-my={k}]',v)
    await pg.click('#myFill'); await pg.wait_for_timeout(500)
    g=lambda n: pg.evaluate("n=>{const i=[...document.querySelectorAll('.fld')].find(x=>x.getAttribute('aria-label')===n);return i&&i.value}",n)
    ck('first name filled', await g('First_Name')=='Alex', await g('First_Name'))
    ck('last name filled', await g('Last_Name')=='Example')
    ck('email filled', await g('Email_Address')=='d@example.com')
    ck('phone filled', await g('Mobile_Phone')=='+971 50 000 0000')
    ck('existing value NOT overwritten', await g('Company')=='Existing Co', await g('Company'))
    ck('street address filled', await g('Street_Address')=='Office 1, Main Street')
    ck('city, postcode, country filled', await g('City')=='Dubai' and await g('Postcode')=='00000' and await g('Country')=='United Arab Emirates')
    ck('full name filled from first+last', await g('Full_Name')=='Alex Example', await g('Full_Name'))
    ck('bank account name NOT filled', await g('Bank_Account_Name')=='', await g('Bank_Account_Name'))
    ck("father's name NOT filled", await g('Fathers_Name')=='')
    ck('comments NOT filled', await g('Comments')=='')
    ck('multiline address field filled', await pg.evaluate("[...document.querySelectorAll('textarea.fld')].map(t=>t.value)")==['Office 1, Main Street'])
    ck('formVals recorded (will be saved into PDF)', await pg.evaluate("Object.keys(__dilia.formVals).length")==10, await pg.evaluate("Object.keys(__dilia.formVals)"))
    ck('stored on this device only (localStorage)', 'Alex' in (await pg.evaluate("localStorage.getItem('dilia-details')") or ''))
    # undo reverts all fills in one step
    await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(300)
    ck('undo removes the autofill in one step', await pg.evaluate("Object.keys(__dilia.formVals).length")==0)
    # reload: remembered
    await pg.reload(); await pg.set_input_files('#pick',FIX+'/form.pdf'); await pg.wait_for_selector('.fld',timeout=15000)
    await pg.click('#myBtn'); ck('remembered after reload', await pg.input_value('[data-my=first]')=='Alex')
    await pg.click('#myForget'); ck('forget empties the form', await pg.input_value('[data-my=first]')=='')
    ck('forget removes the stored copy', await pg.evaluate("localStorage.getItem('dilia-details')")==None)
    await pg.click('#myCancel')
    # not remembered when box unticked
    await pg.click('#myBtn'); await pg.fill('[data-my=first]','Temp'); await pg.uncheck('#myKeep'); await pg.click('#myFill'); await pg.wait_for_timeout(300)
    ck('unticked: nothing stored', await pg.evaluate("localStorage.getItem('dilia-details')")==None)
    # fields no longer needed: save a filled PDF and read values back
    await pg.click('#myBtn'); await pg.fill('[data-my=first]','Alex'); await pg.fill('[data-my=last]','Example'); await pg.fill('[data-my=email]','d@example.com'); await pg.screenshot(path=OUT+'/my.png'); await pg.click('#myFill'); await pg.wait_for_timeout(400)
    async with pg.expect_download() as dl: await pg.click('#go')
    d=await dl.value; await d.save_as(OUT+'/filled.pdf')
    from pypdf import PdfReader
    fv={k:v.get('/V') for k,v in (PdfReader(OUT+'/filled.pdf').get_fields() or {}).items()}
    ck('saved PDF contains the filled values (earlier typed Temp kept, not overwritten)', fv.get('First_Name')=='Temp' and fv.get('Last_Name')=='Example' and fv.get('Email_Address')=='d@example.com' and fv.get('Bank_Account_Name') in (None,''), {k:fv[k] for k in list(fv)[:4]})
    # other editor pages have no My details
    pg2=await ctx.new_page(); await pg2.goto('http://localhost:8765/edit-pdf/'); ck('no button on other editors', not await pg2.query_selector('#myBtn'))
    ck('no console errors', not errs, errs[:3])
    await b.close()
  print('FAILS', fails); import sys; sys.exit(1 if fails or errs else 0)
asyncio.run(main())
