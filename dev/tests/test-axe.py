"""Accessibility gate (DR-02 §15): axe-core on every key template at 1440 and 390, light and dark. Zero serious or critical issues.
axe-core is NOT shipped with the site: the gate installs it (npm, pinned) into AXE_DIR. Run:
  AXE_DIR=/tmp/qa python3 dev/tests/test-axe.py   (needs dev/tests/serve.py running)"""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent)); from templates import TEMPLATES
B = 'http://127.0.0.1:8766/'
AXE = (pathlib.Path(os.environ.get('AXE_DIR', '/tmp/qa')) / 'node_modules/axe-core/axe.min.js').read_text()
async def main():
    fails, n = [], 0
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for theme in ('light', 'dark'):
            for w in (1440, 390):
                ctx = await br.new_context(viewport={'width': w, 'height': 900}, timezone_id='Asia/Dubai', reduced_motion='reduce')
                if theme == 'dark': await ctx.add_init_script("try{localStorage.setItem('dilia-theme','dark')}catch(e){}")
                pg = await ctx.new_page()
                for path in TEMPLATES:
                    await pg.goto(B + path, wait_until='load'); await pg.wait_for_timeout(500)
                    await pg.evaluate(AXE)   # evaluate() is not subject to the page's CSP
                    res = await pg.evaluate("""async () => { const r = await axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } });
                        return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0,3).map(x => x.target.join(' ')) })); }""")
                    n += 1
                    for v in res: fails.append(f'/{path} {w}px {theme}: {v["impact"]} {v["id"]} x{v["n"]} e.g. {v["t"]}')
                await ctx.close()
        await br.close()
    print(n, 'page checks,', len(fails), 'serious/critical issues')
    for f in fails: print('  FAIL', f)
    sys.exit(1 if fails else 0)
asyncio.run(main())
