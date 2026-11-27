"""File-name rule (owner, DR-02 D9): every download keeps the uploaded file's name. Never a brand default like "Dilia-merged".
1) Static: no tool engine or page template carries a "Dilia-..." default for an output made from an upload.
2) Browser: real downloads from 6 tool families keep the uploaded name, also after the visitor empties the name box.
Run: python3 dev/tests/serve.py &  then  python3 dev/tests/test-filenames.py"""
import pathlib, re, shutil, sys, tempfile
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]; B = 'http://127.0.0.1:8766/'
fails, n = [], 0
def ok(c, m):
    global n; n += 1
    if not c: fails.append(m)
# 1) static
ENGINES = ['ptool', 'filetool', 'merge', 'mixer', 'img2pdf', 'imgtool', 'editor', 'html2pdf', 'texttool', 'qrtool', 'kit']
for e in ENGINES:
    s = (ROOT / 'assets' / (e + '.js')).read_text()
    bad = re.findall(r"""(?:fallback:\s*|cleanName\([^;]*?,\s*(?:[A-Z]+ \? )?|\.value = (?:multi \? )?)['"]Dilia[-_ ][^'"]*['"]""", s)
    ok(not bad, f'assets/{e}.js brand default name: {bad[:3]}')
for f in ['dev/make-pages.py', 'merge-pdf/index.html']:
    bad = re.findall(r"""defname=['"]Dilia|value=["']Dilia-""", (ROOT / f).read_text())
    ok(not bad, f'{f}: brand default name {bad[:3]}')
gen = [p for p in ROOT.glob('*/index.html') if re.search(r'id="outName"[^>]*value="Dilia-', p.read_text())]
ok(not gen, f'pages with a Dilia-... name box: {[str(p.parent.name) for p in gen[:5]]}')
# 2) browser
tmp = pathlib.Path(tempfile.mkdtemp())
pdf = tmp / 'Quarterly Report 2026.pdf'; shutil.copy(ROOT / 'dev/tests/fixtures/ten.pdf', pdf)
pdf2 = tmp / 'Appendix.pdf'; shutil.copy(ROOT / 'dev/tests/fixtures/edge.pdf', pdf2)
png = tmp / 'Holiday Photo.png'
pass   # written below with the browser (a real PNG)
CASES = [('split-pdf/', [pdf], 'Quarterly Report 2026', None), ('merge-pdf/', [pdf, pdf2], 'Quarterly Report 2026', None),
         ('jpg-to-pdf/', [png], 'Holiday Photo', None), ('compress-image/', [png], 'Holiday Photo', None),
         ('pdf-to-text/', [pdf], 'Quarterly Report 2026', None), ('watermark-pdf/', [pdf], 'Quarterly Report 2026', 'empty')]
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    _pg = br.new_page(viewport={'width': 64, 'height': 48}); _pg.set_content('<body style="margin:0;background:#e5007d"></body>'); _pg.screenshot(path=str(png)); _pg.close()
    for path, files, want, mode in CASES:
        pg = br.new_page(accept_downloads=True); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(B + path, wait_until='load')
        try:
            pg.set_input_files('#pick', [str(f) for f in files]); pg.locator('#go:not([disabled])').wait_for(state='attached', timeout=20000)
            if mode == 'empty': pg.fill('#outName', '')
            with pg.expect_download(timeout=30000) as d: pg.click('#go')
            name = d.value.suggested_filename
        except Exception as e: name = 'NO DOWNLOAD ' + str(e)[:80]
        ok(name.startswith(want) and not name.lower().startswith('dilia'), f'/{path}{" (name box emptied)" if mode else ""}: downloaded "{name}", expected "{want}.*"')
        ok(not errs, f'/{path}: page errors {errs[:2]}')
        pg.close()
    br.close()
shutil.rmtree(tmp, ignore_errors=True)
print(n, 'checks,', len(fails), 'failed')
for f in fails: print('  FAIL', f)
sys.exit(1 if fails else 0)
