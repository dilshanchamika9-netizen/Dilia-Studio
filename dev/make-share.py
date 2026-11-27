"""Share images for Open Graph / Twitter (1200x630) and the logo used in JSON-LD. Run once after a brand change:
python3 dev/make-share.py   (needs Playwright + Chrome). Output: assets/share/*.png"""
import pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
import base64
FONT = 'data:font/woff2;base64,' + base64.b64encode((ROOT / 'assets/fonts/archivo.woff2').read_bytes()).decode()
MARK = '<svg viewBox="0 0 48 48" width="{s}" height="{s}"><defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e5007d"/><stop offset=".55" stop-color="#7a5cff"/><stop offset="1" stop-color="#009fe3"/></linearGradient></defs><path fill-rule="evenodd" d="M8 6h19l13 13v5A18 18 0 0 1 22 42H8zM16 14v20h6a10 10 0 0 0 10-10v-3l-7-7z" fill="url(#dg)"/><path d="M27 6v13h13z" fill="#0b1220"/></svg>'
AREAS = {
    'home': ('', 'Get it done. Your files stay with you.', 'PDF, image, text and QR tools, planners and daily puzzles. Free, in your browser.'),
    'tools': ('Tools', 'Free tools that never upload your files.', 'PDF, image, text, QR and calculators. Everything runs on your device.'),
    'life': ('Life', 'Time, holidays and trips.', 'Public holidays for 249 countries, time zones, planners and date calculators.'),
    'play': ('Play', 'New puzzles every day.', 'Daily path, sudoku, solitaire and 40+ games. No sign-up, no download.'),
    'pulse': ('Pulse', 'Tech and business news, from the source.', 'Every story written from filings and official releases, every source listed.'),
    'guides': ('Guides', 'Short, clear how-to guides.', 'Step-by-step help for PDF, image, QR and text tasks.'),
}
CSS = f'''@font-face{{font-family:A;src:url({FONT})}}*{{margin:0;box-sizing:border-box}}body{{width:1200px;height:630px;font-family:A,sans-serif;background:#f5f6fb;color:#0b1220;
position:relative;overflow:hidden}}.g{{position:absolute;inset:0;background:radial-gradient(520px 380px at 92% 10%,#7a5cff33,transparent 70%),radial-gradient(460px 340px at 4% 96%,#e5007d26,transparent 70%),radial-gradient(420px 300px at 70% 110%,#009fe326,transparent 70%)}}
.in{{position:absolute;left:80px;top:72px;right:80px}}.lk{{display:flex;align-items:center;gap:18px}}.w{{font-weight:800;font-size:58px;font-variation-settings:"wdth" 125;letter-spacing:-.025em}}
.l{{font-weight:650;font-size:28px;color:#4b5563;align-self:flex-end;margin-bottom:10px}}h1{{margin-top:92px;font-weight:900;font-size:72px;line-height:1.02;letter-spacing:-.045em;font-variation-settings:"wdth" 112;max-width:1000px}}
p{{margin-top:26px;font-size:30px;line-height:1.35;color:#4b5563;max-width:960px}}.bar{{position:absolute;left:0;right:0;bottom:0;height:12px;background:linear-gradient(90deg,#e5007d,#7a5cff,#009fe3)}}'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg = b.new_page(viewport={'width': 1200, 'height': 630})
    out = ROOT / 'assets/share'; out.mkdir(exist_ok=True)
    for k, (line, h, sub) in AREAS.items():
        pg.set_content(f'<style>{CSS}</style><div class="g"></div><div class="in"><div class="lk">{MARK.format(s=72)}<span class="w">Dilia</span>{f"<span class=l>{line}</span>" if line else ""}</div><h1>{h}</h1><p>{sub}</p></div><div class="bar"></div>')
        pg.wait_for_timeout(400); pg.evaluate('document.fonts.ready'); pg.screenshot(path=str(out / f'{k}.jpg'), type='jpeg', quality=88)
    pg.set_viewport_size({'width': 512, 'height': 512})
    pg.set_content(f'<style>body{{margin:0;width:512px;height:512px;display:grid;place-items:center;background:#fff}}</style>{MARK.format(s=400)}')
    pg.wait_for_timeout(200); pg.screenshot(path=str(out / 'logo.png'))
    b.close()
print('share images written')
