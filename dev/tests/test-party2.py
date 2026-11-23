"""Party tools, batch 2, in a real browser under the real _headers (port 8766): bingo cards and caller, scoreboard, quiz maker, Secret Santa.
Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-party2.py"""
import asyncio, json, pathlib, sys, tempfile
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8766/'
fails = []; n_ok = 0
def ok(c, m):
    global n_ok
    if c: n_ok += 1
    else: fails.append(m); print('FAIL', m)
COPY = "Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__copied=t}},configurable:true});"
TMP = pathlib.Path(tempfile.mkdtemp())

async def page(br, w):
    ctx = await br.new_context(viewport={'width': w, 'height': 1000}, has_touch=w < 500, reduced_motion='reduce', accept_downloads=True)
    pg = await ctx.new_page(); errs = []
    await pg.add_init_script(COPY)
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' or 'Content Security' in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: errs.append('OUTSIDE ' + r.url) if not r.url.startswith(('http://127.0.0.1:8766/', 'data:', 'blob:')) else None)
    return ctx, pg, errs
async def noscroll(pg, w, name): ok(await pg.evaluate('document.documentElement.scrollWidth') <= w, f'[{w}] sideways scroll on {name}')
async def fill(pg, sel, text): await pg.fill(sel, text); await pg.dispatch_event(sel, 'input')
txt = lambda pg, sel: pg.inner_text(sel)

async def bingo_cards(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'bingo-card-generator/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaBingo.state()'); await noscroll(pg, w, 'bingo cards')
    await pg.click('#go'); s = await st(); ok(len(s['cards']) == 4 and await pg.locator('.pt-bcard').count() == 4, f'[{w}] four cards')
    good = True
    for c in s['cards']:
        if len(c) != 25 or c[12] != 'FREE': good = False; continue
        for col in range(5):
            vals = [int(c[r * 5 + col]) for r in range(5) if not (r == 2 and col == 2)]
            if len(set(vals)) != len(vals) or not all(col * 15 + 1 <= v <= col * 15 + 15 for v in vals): good = False
    ok(good, f'[{w}] classic cards follow the B-I-N-G-O ranges'); ok(len({tuple(c) for c in s['cards']}) == 4, f'[{w}] cards are different')
    ok(await pg.locator('.pt-bcard .bh span').all_inner_texts() == list('BINGO') * 4, f'[{w}] BINGO header')
    await pg.fill('#bn', '99'); await pg.click('#go'); ok(len((await st())['cards']) == 30, f'[{w}] cards clamp to 30'); await noscroll(pg, w, 'bingo cards (30)')
    await pg.check('input[value=words]'); ok(await pg.is_visible('#bwords'), f'[{w}] words box shown')
    await fill(pg, '#bwords', '\n'.join(f'w{i}' for i in range(20))); await pg.click('#go'); ok('at least 24' in await txt(pg, '#msg') and 'You have 20' in await txt(pg, '#msg'), f'[{w}] too few words')
    words = [f'Word {i}' for i in range(30)] + ['word 1', '<b>x</b>']; await fill(pg, '#bwords', '\n'.join(words)); await pg.fill('#bn', '5'); await pg.fill('#btitle', 'My game'); await pg.click('#go'); s = await st()
    pool = {x.lower() for x in words}; good = all(len(c) == 25 and c[12] == 'FREE' and len({x.lower() for x in c if x != 'FREE'}) == 24 and all(x == 'FREE' or x.lower() in pool for x in c) for c in s['cards'])
    ok(s['kind'] == 'words' and len(s['cards']) == 5 and good, f'[{w}] word cards'); ok(await pg.locator('.pt-bcard .bt').first.inner_text() == 'My game', f'[{w}] title')
    await fill(pg, '#bwords', '\n'.join(['<img src=x onerror=1>'] + [f'q{i}' for i in range(30)])); await pg.fill('#bn', '30'); await pg.click('#go'); ok(await pg.locator('.pt-bcard img').count() == 0, f'[{w}] word rendered as markup')
    await pg.reload(); await pg.wait_for_timeout(300); ok(await pg.is_checked('input[value=words]') and '<img' in await pg.input_value('#bwords'), f'[{w}] words/kind not remembered')
    if w > 500:
        await pg.click('#go'); await pg.emulate_media(media='print'); ok(not await pg.locator('.nav').is_visible() and await pg.locator('.pt-bcard').first.is_visible() and not await pg.locator('.ghead').is_visible(), 'print view hides page chrome, keeps cards')
        pdf = await pg.pdf(); ok(pdf[:4] == b'%PDF' and len(pdf) > 3000, 'print to PDF works')
    ok(not errs, f'[{w}] bingo cards errors: {errs}'); await ctx.close()

async def bingo_caller(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'bingo-caller/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaBingo.state()'); await noscroll(pg, w, 'bingo caller')
    ok(await pg.locator('#cboard div').count() == 75 and (await st())['called'] == [], f'[{w}] board'); await pg.click('#go'); s = await st(); ok(len(s['called']) == 1 and await pg.locator('#cboard .on').count() == 1, f'[{w}] first call')
    lt = await txt(pg, '#clast'); n = s['last']; ok(lt == 'BINGO'[(n - 1) // 15] + ' ' + str(n), f'[{w}] letter {lt!r} for {n}')
    await pg.keyboard.press('Space'); ok(len((await st())['called']) == 2, f'[{w}] space calls')
    for i in range(73): await pg.evaluate('DiliaBingo.call()')
    s = await st(); ok(sorted(s['called']) == list(range(1, 76)), f'[{w}] all 75 called exactly once'); await pg.click('#go'); ok('All 75' in await txt(pg, '#msg') and len((await st())['called']) == 75, f'[{w}] 76th call')
    await pg.click('#cundo'); ok(len((await st())['called']) == 74 and await pg.locator('#cboard .on').count() == 74, f'[{w}] undo')
    await pg.reload(); await pg.wait_for_timeout(300); ok(len((await st())['called']) == 74, f'[{w}] game not remembered')
    await pg.click('#creset'); ok('Press again' in await txt(pg, '#creset') and len((await st())['called']) == 74, f'[{w}] reset needs a second press'); await pg.click('#creset'); ok((await st())['called'] == [], f'[{w}] new game')
    await pg.evaluate('DiliaBingo.call(42)'); ok((await st())['last'] == 42 and await txt(pg, '#clast') == 'N 42', f'[{w}] forced call')
    ok(not errs, f'[{w}] caller errors: {errs}'); await ctx.close()

async def score(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'score-keeper/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaScore.state()'); await noscroll(pg, w, 'scoreboard')
    s = await st(); ok(len(s['p']) == 2 and s['p'][0]['s'] == 0, f'[{w}] two teams')
    pl = lambda i: pg.locator('.pt-srow').nth(i).locator('button').nth(1); mi = lambda i: pg.locator('.pt-srow').nth(i).locator('button').nth(0)
    await pl(0).click(); await pl(0).click(); await pg.click('button[data-st="5"]'); await pl(1).click(); await mi(0).click(); s = await st()
    ok([x['s'] for x in s['p']] == [-3, 5] and s['step'] == 5, f'[{w}] scores {[x["s"] for x in s["p"]]}')
    ok('lead' in await pg.locator('.pt-srow').nth(1).get_attribute('class') and 'lead' not in await pg.locator('.pt-srow').nth(0).get_attribute('class'), f'[{w}] leader outlined')
    await pg.locator('.pt-srow .nm').nth(0).fill('Reds'); await pg.click('#ssort');
    names = await pg.eval_on_selector_all('.pt-srow .nm', 'e=>e.map(x=>x.value)'); ok(names == ['Team 2', 'Reds'], f'[{w}] ranked order {names}')
    await pg.click('#ssort')
    for i in range(12): await pg.click('#sadd', force=True)
    ok(len((await st())['p']) == 12 and await pg.locator('#sadd').is_disabled(), f'[{w}] capped at 12'); await noscroll(pg, w, 'scoreboard (12)')
    for i in range(10): await pg.locator('.pt-srow').last.locator('button').nth(2).click()
    ok(len((await st())['p']) == 2, f'[{w}] removed down to 2'); await pg.locator('.pt-srow').nth(1).locator('button').nth(2).click(); ok('at least one' in await txt(pg, '#msg') or len((await st())['p']) == 1, f'[{w}] remove')
    await pg.click('#sadd'); await pg.reload(); await pg.wait_for_timeout(300); s = await st(); ok(len(s['p']) == 2 and s['p'][0]['n'] == 'Reds' and s['p'][0]['s'] == -3, f'[{w}] not remembered {s}')
    await pg.click('#scopy'); await pg.wait_for_timeout(100); cp = await pg.evaluate('window.__copied'); ok(cp.startswith('1. ') and 'Reds: -3' in cp, f'[{w}] copy {cp!r}')
    await pg.click('#sreset'); ok('Press again' in await txt(pg, '#sreset') and (await st())['p'][0]['s'] == -3, f'[{w}] reset needs a second press'); await pg.click('#sreset'); ok(all(x['s'] == 0 for x in (await st())['p']), f'[{w}] reset')
    await pg.evaluate("localStorage.setItem('dilia-score-v1', JSON.stringify({p:[{n:'a',s:1.5},{n:5,s:1}],step:3}))"); await pg.reload(); await pg.wait_for_timeout(300); ok(len((await st())['p']) == 2 and (await st())['p'][0]['n'] == 'Team 1', f'[{w}] bad saved data is ignored {(await st())["p"]}')
    ok(not errs, f'[{w}] score errors: {errs}'); await ctx.close()

def qfile(name, obj, raw=None):
    p = TMP / name; p.write_text(raw if raw is not None else json.dumps(obj)); return str(p)
async def quiz(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'quiz-maker/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaQuiz.state()'); await noscroll(pg, w, 'quiz edit')
    s = await st(); ok(len(s['quiz']['qs']) == 2 and await pg.locator('.pt-q').count() == 2, f'[{w}] sample quiz')
    await pg.click('#qstart'); ok(not await pg.is_hidden('#qplay') and 'question 1 of 2' in (await txt(pg, '#qprog')).lower(), f'[{w}] play view'); await noscroll(pg, w, 'quiz play')
    await pg.locator('.qopt').nth(1).click(); ok(await pg.locator('.qopt.right').count() == 1 and (await st())['score'] == 1 and await pg.locator('.qopt:disabled').count() == 4, f'[{w}] right answer scores')
    await pg.click('#qnext'); await pg.locator('.qopt').nth(0).click(); s = await st(); ok(s['score'] == 1 and await pg.locator('.qopt.wrong').count() == 1 and await pg.locator('.qopt.right').count() == 1, f'[{w}] wrong answer shows the right one')
    await pg.click('#qnext'); ok(await txt(pg, '#qscore') == '1 / 2' and '50%' in await txt(pg, '#qline'), f'[{w}] final score {await txt(pg, "#qscore")}')
    await pg.click('#qagain'); await pg.click('#qshow'); ok(await pg.locator('.qopt.right').count() == 1 and (await st())['score'] == 0, f'[{w}] host Show answer does not score')
    await pg.click('#qnext'); await pg.click('#qshow'); await pg.click('#qnext'); ok(await txt(pg, '#qscore') == '0 / 2', f'[{w}] host mode score'); await pg.click('#qedit2')
    await pg.click('#qadd'); await pg.click('#qstart'); ok('Question 3 has no text' in await txt(pg, '#msg') and await pg.is_hidden('#qplay'), f'[{w}] blank question blocked: {await txt(pg, "#msg")!r}')
    await pg.locator('.qq').last.fill('Pick one'); await pg.locator('.pt-q').last.locator('input[type=text]').nth(0).fill('Only'); await pg.click('#qstart'); ok('at least 2 answers' in await txt(pg, '#msg'), f'[{w}] one answer blocked')
    await pg.locator('.pt-q').last.locator('input[type=text]').nth(1).fill('Two'); await pg.locator('.pt-q').last.locator('input[type=radio]').nth(2).check(); await pg.click('#qstart'); ok('right answer is empty' in await txt(pg, '#msg'), f'[{w}] empty right answer blocked')
    await pg.locator('.pt-q').last.locator('input[type=radio]').nth(0).check(); await pg.locator('.pt-q').last.locator('button').click(); ok(len((await st())['quiz']['qs']) == 2, f'[{w}] delete question')
    await pg.fill('#qtitle', 'Space & Time!'); await pg.check('#qshuf'); await pg.check('#qshufa'); await pg.click('#qstart'); ok('question 1 of 2' in (await txt(pg, '#qprog')).lower(), f'[{w}] shuffled play starts')
    for i in range(2): await pg.locator('.qopt').first.click(); await pg.click('#qnext')
    await pg.click('#qedit2'); await pg.uncheck('#qshuf'); await pg.uncheck('#qshufa')
    async with pg.expect_download() as d: await pg.click('#qsave')
    dl = await d.value; ok(dl.suggested_filename == 'space-time.json', f'[{w}] file name {dl.suggested_filename!r}'); saved = json.loads(pathlib.Path(await dl.path()).read_text()); ok(saved['title'] == 'Space & Time!' and len(saved['qs']) == 2, f'[{w}] saved content')
    good = {'title': 'Loaded', 'qs': [{'q': 'Q1 <img src=x onerror=1>', 'a': ['a', 'b', 'c', 'd'], 'c': 3}]}
    await pg.set_input_files('#qfile', qfile('good.json', good)); await pg.wait_for_timeout(300); s = await st(); ok(s['quiz']['title'] == 'Loaded' and len(s['quiz']['qs']) == 1 and s['quiz']['qs'][0]['c'] == 3, f'[{w}] load good file {s["quiz"]["title"]!r}')
    ok(await pg.locator('.pt-q img').count() == 0, f'[{w}] loaded text rendered as markup')
    bads = {'notjson.json': (None, 'not json {{'), 'wrong.json': ({'hello': 1}, None), 'noq.json': ({'title': 't', 'qs': []}, None), 'badc.json': ({'qs': [{'q': 'x', 'a': ['a', 'b', 'c', 'd'], 'c': 4}]}, None),
            'bada.json': ({'qs': [{'q': 'x', 'a': ['a', 'b', 'c'], 'c': 0}]}, None), 'badt.json': ({'qs': [{'q': 5, 'a': ['a', 'b', 'c', 'd'], 'c': 0}]}, None),
            'many.json': ({'qs': [{'q': 'x', 'a': ['a', 'b', 'c', 'd'], 'c': 0}] * 101}, None), 'big.json': (None, '{"qs":[],"pad":"' + 'x' * 250000 + '"}')}
    for name, (obj, raw) in bads.items():
        await pg.set_input_files('#qfile', qfile(name, obj, raw)); await pg.wait_for_timeout(250)
        s = await st(); ok(s['quiz']['title'] == 'Loaded' and len(s['quiz']['qs']) == 1 and await txt(pg, '#msg') != '', f'[{w}] bad file {name} was accepted or gave no message')
    await pg.reload(); await pg.wait_for_timeout(300); ok((await st())['quiz']['title'] == 'Loaded', f'[{w}] quiz not remembered')
    await pg.click('#qnew'); ok('Press again' in await txt(pg, '#qnew') and (await st())['quiz']['title'] == 'Loaded', f'[{w}] new quiz needs a second press'); await pg.click('#qnew'); ok((await st())['quiz']['title'] == '' and len((await st())['quiz']['qs']) == 1, f'[{w}] new quiz')
    ok(not errs, f'[{w}] quiz errors: {errs}'); await ctx.close()

async def santa(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'secret-santa-generator/'); await pg.wait_for_timeout(300)
    st = lambda: pg.evaluate('DiliaSanta.state()'); await noscroll(pg, w, 'santa')
    await fill(pg, '#sn', 'A\nB'); await pg.click('#go'); ok('at least 3' in await txt(pg, '#msg'), f'[{w}] two names')
    await fill(pg, '#sn', 'Ann\nBen\nann'); await pg.click('#go'); ok('same' in await txt(pg, '#msg'), f'[{w}] duplicate names')
    await fill(pg, '#sn', 'Ann\nBen\nCy\nDee\nEli'); await fill(pg, '#sx', 'Ann, Zed'); await pg.click('#go'); ok('Cannot read' in await txt(pg, '#msg') and await pg.is_hidden('#sflow'), f'[{w}] bad pair line: {await txt(pg, "#msg")!r}')
    await fill(pg, '#sx', 'Ann, Ben\nCy, Dee'); good = True
    for i in range(300):
        await pg.evaluate('DiliaSanta.draw()'); s = await st(); g, f = s['giver'], s['gift']
        if sorted(f) != sorted(g) or any(a == b for a, b in zip(g, f)) or any({a, b} in ({'Ann', 'Ben'}, {'Cy', 'Dee'}) for a, b in zip(g, f)): good = False; print('bad draw', g, f); break
    ok(good, f'[{w}] 300 draws: everyone gives once and gets once, nobody draws self or an excluded person')
    await pg.evaluate('DiliaSanta.draw()'); s = await st(); ok(await pg.is_hidden('#ssetup') and not await pg.is_hidden('#sflow') and s['pos'] == 0, f'[{w}] flow starts')
    seen_text = []
    for i, name in enumerate(s['giver']):
        ok(name in await txt(pg, '#sstage') and s['gift'][i] not in await pg.inner_text('#sflow'), f'[{w}] ready screen for {name} must not show the person')
        await pg.click('#snext'); t = (await txt(pg, '#sstage')).lower(); ok(s['gift'][i].lower() in t and name.lower() in t, f'[{w}] reveal for {name}'); await pg.click('#snext')
    ok('Everyone has their person' in await txt(pg, '#sstage') and await pg.is_hidden('#snext'), f'[{w}] finished'); ok(await pg.is_hidden('#sfull'), f'[{w}] full list hidden until asked')
    await pg.click('#sfullbtn'); ok(await pg.locator('#sfulllist li').count() == 5, f'[{w}] full list'); await pg.click('#sfullcopy'); await pg.wait_for_timeout(100); ok('→' in await pg.evaluate('window.__copied'), f'[{w}] copy')
    stored = await pg.evaluate("localStorage.getItem('dilia-santa-v1')"); ok('→' not in stored and set(json.loads(stored)) == {'names', 'ex'}, f'[{w}] the draw must not be saved: {stored!r}')
    await pg.reload(); await pg.wait_for_timeout(300); ok((await st())['gift'] == [] and await pg.input_value('#sn') == 'Ann\nBen\nCy\nDee\nEli', f'[{w}] after reload: no draw, names back')
    await fill(pg, '#sn', 'A\nB\nC'); await fill(pg, '#sx', 'A, B\nB, C\nA, C'); await pg.click('#go'); ok('No draw is possible' in await txt(pg, '#msg'), f'[{w}] impossible rules')
    await fill(pg, '#sx', ''); await pg.evaluate('DiliaSanta.draw()'); s = await st(); ok(len(s['giver']) == 3 and all(a != b for a, b in zip(s['giver'], s['gift'])), f'[{w}] three names work')
    await pg.click('#sagain'); ok(not await pg.is_hidden('#ssetup') and (await st())['gift'] == [], f'[{w}] start over')
    ok(not errs, f'[{w}] santa errors: {errs}'); await ctx.close()

async def hub(br, w):
    ctx, pg, errs = await page(br, w); await pg.goto(B + 'play/'); await pg.wait_for_timeout(300)
    for h in ('bingo-card-generator/', 'quiz-maker/', 'score-keeper/', 'secret-santa-generator/'): ok(await pg.locator(f'.dailies a[href="../{h}"]').count() == 1, f'[{w}] hub card {h}')
    ok('Party and decide' not in await pg.inner_text('#h-soon + .pgrid'), f'[{w}] party card still listed as coming'); await noscroll(pg, w, 'hub')
    await pg.keyboard.press('Control+K'); await pg.wait_for_timeout(300); await pg.keyboard.type('bingo'); await pg.wait_for_timeout(300); ok('Bingo cards' in ' '.join(await pg.locator('.pr').all_inner_texts()), f'[{w}] search finds bingo')
    ok(not errs, f'[{w}] hub errors: {errs}'); await ctx.close()

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for w in (1280, 390):
            for f in (bingo_cards, bingo_caller, score, quiz, santa, hub): await f(br, w)
        await br.close()
    print(n_ok + len(fails), 'checks,', len(fails), 'failed'); sys.exit(1 if fails else 0)
asyncio.run(main())
