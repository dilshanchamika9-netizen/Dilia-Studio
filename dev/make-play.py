"""Builds the Play area: /play/ (hub), /daily-path/, /daily-sudoku/. Shell (sprite, header, footer) comes from /life/index.html.
Run from make-pages.py (before the menu pass) or alone: python3 dev/make-play.py"""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / 'life' / 'index.html').read_text()
SPRITE = re.search(r'<svg class="sprite".*?</svg>\n', src, re.S).group(0)
HEADER_LIFE = re.search(r'<header class="nav">.*?</header>\n', src, re.S).group(0)
HEADER = re.search(r'<header class="nav">.*?</header>\n', src, re.S).group(0).replace('<span class="l">Life</span>', '<span class="l">Play</span>').replace('aria-label="Dilia home"', 'aria-label="Dilia Play home"', 1)

def shell(title, desc, body, scripts, robots='', mode=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
{robots}<meta name="theme-color" content="#0b1220">
<link rel="icon" href="../assets/mark.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/site.css">
<link rel="stylesheet" href="../assets/palette.css">
<link rel="stylesheet" href="../assets/play.css">
<link rel="stylesheet" href="../assets/play-light.css">
</head>
<body class="stage {'area-life' if mode == 'life' else 'area-play'}"{(' data-mode="' + mode + '"') if mode else ''}>
{SPRITE}
{HEADER_LIFE if mode == 'life' else HEADER}
<main>
{body}
</main>

<footer class="foot">
  <div class="wrap">
    <div>
      <a class="brand" href="../" aria-label="Dilia home"><svg><use href="#mark"/></svg><span class="wm"><span class="w">Dilia</span></span></a>
      <p>Free tools and games that run on your own device. No sign-up, no ads.</p>
    </div>
    <div><h4>Play</h4><ul><li><a href="../daily-path/">Daily path</a></li><li><a href="../daily-sudoku/">Daily sudoku</a></li><li><a href="../path-puzzle/">Path puzzle levels</a></li><li><a href="../play/">All games</a></li></ul></div>
    <div><h4>Dilia</h4><ul><li><a href="../tools.html">Tools</a></li><li><a href="../life/">Life</a></li><li><a href="../play/">Play</a></li><li><a href="../news/">Pulse</a></li><li><a href="../blog/">Guides</a></li></ul></div>
    <div class="legal"><span>&copy; <span data-year></span> Dilia</span><span>Scores and streaks stay in this browser.</span></div>
  </div>
</footer>

<script src="../assets/tools.js"></script>
<script src="../assets/palette.js"></script>
<script src="../assets/menu.js"></script>
<script src="../assets/common.js"></script>
{'<script src="../assets/celebrate.js"></script>' if 'id="done"' in body else ''}
{scripts}
</body>
</html>
'''

# small pictures on the daily cards (decoration only)
ART_PATH = '''<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="ap" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e5007d"/><stop offset=".55" stop-color="#a08bff"/><stop offset="1" stop-color="#3fc3ff"/></linearGradient></defs><g fill="#ffffff10">''' + ''.join(f'<rect x="{18 + c * 30}" y="{18 + r * 30}" width="26" height="26" rx="7"/>' for r in range(4) for c in range(4)) + '''</g><polyline points="31,31 61,31 61,61 31,61 31,121 61,121 61,91 91,91 91,121 121,121 121,61 91,61 91,31 121,31" fill="none" stroke="url(#ap)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="31" cy="31" r="11" fill="#fff"/><circle cx="121" cy="31" r="11" fill="#fff"/></svg>'''
ART_SUD = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="18" y="18" width="114" height="114" rx="14" fill="#ffffff10" stroke="#ffffff30"/><path d="M56 18v114M94 18v114M18 56h114M18 94h114" stroke="#ffffff30" stroke-width="2"/><g font-family="Archivo,sans-serif" font-weight="800" font-size="24" fill="#fff" text-anchor="middle"><text x="37" y="46">5</text><text x="113" y="46" fill="#c4b5ff">3</text><text x="75" y="84">9</text><text x="37" y="122" fill="#c4b5ff">7</text><text x="113" y="122">1</text></g></svg>'
ART_MERGE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850" text-anchor="middle"><rect x="18" y="18" width="52" height="52" rx="12" fill="#e5007d"/><text x="44" y="53" font-size="24" fill="#fff">8</text><rect x="80" y="18" width="52" height="52" rx="12" fill="#7a5cff"/><text x="106" y="53" font-size="22" fill="#fff">64</text><rect x="18" y="80" width="52" height="52" rx="12" fill="#2c3352"/><text x="44" y="115" font-size="24" fill="#dfe4f2">2</text><rect x="80" y="80" width="52" height="52" rx="12" fill="#ffd400"/><text x="106" y="113" font-size="17" fill="#0b1220">2048</text></g></svg>'

ART_MINES = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850" font-size="26" text-anchor="middle">' + ''.join(f'<rect x="{18 + c * 39}" y="{18 + r * 39}" width="35" height="35" rx="8" fill="{"#111a2c" if (r, c) in ((0, 0), (0, 1), (1, 0), (1, 1), (2, 0)) else "#3a4466"}"/>' for r in range(3) for c in range(3)) + '<text x="74" y="46" fill="#3fc3ff">1</text><text x="74" y="85" fill="#34d399">2</text><text x="35" y="124" fill="#3fc3ff">1</text><circle cx="113" cy="113" r="9" fill="#0b1220" stroke="#ff2d8f" stroke-width="2"/></g></svg>'

ART_SOL = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850"><rect x="26" y="30" width="62" height="86" rx="9" fill="#fbfbff" transform="rotate(-10 57 73)"/><text x="34" y="58" font-size="20" fill="#0b1220" transform="rotate(-10 57 73)">K♠</text><rect x="62" y="26" width="62" height="86" rx="9" fill="#fbfbff" transform="rotate(9 93 69)"/><text x="70" y="54" font-size="20" fill="#e5007d" transform="rotate(9 93 69)">A♥</text></g></svg>'

ART_SNAKE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="as" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5cff"/><stop offset="1" stop-color="#3fc3ff"/></linearGradient></defs><g fill="#ffffff10">' + ''.join(f'<rect x="{18 + c * 30}" y="{18 + r * 30}" width="26" height="26" rx="7"/>' for r in range(4) for c in range(4)) + '</g><polyline points="31,121 31,91 61,91 61,61 91,61 91,31" fill="none" stroke="url(#as)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><circle cx="121" cy="31" r="12" fill="#ff2d8f"/><circle cx="98" cy="28" r="3" fill="#fff"/></svg>'
ART_TYPE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g fill="#ffffff14" stroke="#ffffff30">' + ''.join(f'<rect x="{14 + c * 31}" y="{32 + r * 34}" width="27" height="28" rx="7"/>' for r in range(3) for c in range(4)) + '</g><rect x="14" y="108" width="120" height="26" rx="8" fill="#ffffff14" stroke="#ffffff30"/><rect x="45" y="32" width="27" height="28" rx="7" fill="#7a5cff"/><rect x="76" y="66" width="27" height="28" rx="7" fill="#e5007d"/></svg>'
ART_RX = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="54" fill="#0f8a4f"/><circle cx="75" cy="75" r="54" fill="none" stroke="#ffffff40" stroke-width="3"/><path d="M82 30 52 82h20l-6 38 32-54H78z" fill="#fff"/></svg>'

ART_PYR = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g fill="#fbfbff">' + ''.join(f'<rect x="{75 - (r + 1) * 11 + k * 22}" y="{22 + r * 26}" width="20" height="26" rx="4"/>' for r in range(4) for k in range(r + 1)) + '</g><g font-family="Archivo,sans-serif" font-weight="850" font-size="12" text-anchor="middle" fill="#0b1220"><text x="75" y="40">13</text></g></svg>'
ART_PEAKS = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g fill="#fbfbff">' + ''.join(f'<rect x="{x}" y="{y}" width="18" height="24" rx="4"/>' for x, y in [(30,28),(75,28),(120,28),(21,48),(39,48),(66,48),(84,48),(111,48),(129,48),(12,68),(30,68),(48,68),(57,68),(75,68),(93,68),(102,68),(120,68),(138,68)] if x < 132) + '</g><rect x="40" y="108" width="30" height="30" rx="5" fill="#ffffff44"/><rect x="80" y="108" width="30" height="30" rx="5" fill="#fbfbff"/></svg>'
ART_SPIDER = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850"><rect x="24" y="26" width="46" height="64" rx="7" fill="#fbfbff"/><text x="30" y="46" font-size="15" fill="#0b1220">K♠</text><rect x="52" y="44" width="46" height="64" rx="7" fill="#fbfbff"/><text x="58" y="64" font-size="15" fill="#0b1220">Q♠</text><rect x="80" y="62" width="46" height="64" rx="7" fill="#fbfbff"/><text x="86" y="82" font-size="15" fill="#e5007d">J♥</text></g></svg>'
ART_CHESS = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g><rect x="20" y="20" width="110" height="110" rx="10" fill="#a97b52"/><g fill="#ead9b8"><rect x="20" y="20" width="27.5" height="27.5"/><rect x="75" y="20" width="27.5" height="27.5"/><rect x="47.5" y="47.5" width="27.5" height="27.5"/><rect x="102.5" y="47.5" width="27.5" height="27.5"/><rect x="20" y="75" width="27.5" height="27.5"/><rect x="75" y="75" width="27.5" height="27.5"/><rect x="47.5" y="102.5" width="27.5" height="27.5"/><rect x="102.5" y="102.5" width="27.5" height="27.5"/></g><text x="75" y="104" font-size="78" text-anchor="middle" fill="#232323" font-family="Segoe UI Symbol,Noto Sans Symbols 2,DejaVu Sans,serif">&#9822;&#xFE0E;</text></g></svg>'
ART_CHECKERS = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="10" fill="#8a5a3b"/><g fill="#ead9b8"><rect x="20" y="20" width="27.5" height="27.5"/><rect x="75" y="20" width="27.5" height="27.5"/><rect x="47.5" y="47.5" width="27.5" height="27.5"/><rect x="102.5" y="47.5" width="27.5" height="27.5"/><rect x="20" y="75" width="27.5" height="27.5"/><rect x="75" y="75" width="27.5" height="27.5"/><rect x="47.5" y="102.5" width="27.5" height="27.5"/><rect x="102.5" y="102.5" width="27.5" height="27.5"/></g><circle cx="61" cy="61" r="11" fill="#f4f1e6" stroke="#c9c2ac" stroke-width="3"/><circle cx="89" cy="89" r="11" fill="#222" stroke="#000" stroke-width="3"/></svg>'
ART_REVERSI = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="10" fill="#2f8f5b"/><circle cx="62" cy="62" r="17" fill="#f4f4f4"/><circle cx="88" cy="62" r="17" fill="#111"/><circle cx="62" cy="88" r="17" fill="#111"/><circle cx="88" cy="88" r="17" fill="#f4f4f4"/></svg>'
ART_C4 = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="18" y="26" width="114" height="98" rx="12" fill="#1d4ed8"/><g><circle cx="46" cy="54" r="12" fill="#0b1f66"/><circle cx="75" cy="54" r="12" fill="#0b1f66"/><circle cx="104" cy="54" r="12" fill="#0b1f66"/><circle cx="46" cy="84" r="12" fill="#d4202a"/><circle cx="75" cy="84" r="12" fill="#f2c200"/><circle cx="104" cy="84" r="12" fill="#0b1f66"/><circle cx="46" cy="112" r="0"/><circle cx="75" cy="112" r="0"/></g></svg>'
ART_LUDO = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="10" fill="#f6f3ea"/><rect x="20" y="20" width="44" height="44" rx="8" fill="#e5484d"/><rect x="86" y="20" width="44" height="44" rx="8" fill="#2fa84f"/><rect x="86" y="86" width="44" height="44" rx="8" fill="#f2c200"/><rect x="20" y="86" width="44" height="44" rx="8" fill="#2b6fe0"/><circle cx="42" cy="42" r="9" fill="#fff"/><circle cx="108" cy="108" r="9" fill="#fff"/><rect x="62" y="62" width="26" height="26" rx="5" fill="#fff" stroke="#111" stroke-width="3"/><circle cx="75" cy="75" r="3" fill="#111"/></svg>'
ART_BRICK = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#1b2238"/><g fill="#e5484d"><rect x="30" y="34" width="26" height="12" rx="3"/><rect x="60" y="34" width="26" height="12" rx="3"/><rect x="90" y="34" width="26" height="12" rx="3"/></g><g fill="#f2c200"><rect x="30" y="50" width="26" height="12" rx="3"/><rect x="60" y="50" width="26" height="12" rx="3"/><rect x="90" y="50" width="26" height="12" rx="3"/></g><circle cx="86" cy="96" r="7" fill="#fff"/><rect x="56" y="114" width="40" height="8" rx="4" fill="#fff"/></svg>'
ART_PONG = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#1b2238"/><g fill="#fff"><rect x="32" y="52" width="8" height="38" rx="4"/><rect x="110" y="62" width="8" height="38" rx="4"/><circle cx="76" cy="76" r="7"/></g><g fill="#fff" opacity=".4"><rect x="73" y="28" width="4" height="10"/><rect x="73" y="48" width="4" height="10"/><rect x="73" y="92" width="4" height="10"/><rect x="73" y="112" width="4" height="10"/></g></svg>'
ART_AIM = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#1b2238"/><circle cx="75" cy="75" r="42" fill="#e5007d"/><circle cx="75" cy="75" r="30" fill="#fff"/><circle cx="75" cy="75" r="18" fill="#e5007d"/><circle cx="75" cy="75" r="6" fill="#fff"/></svg>'
ART_NONO = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#7a5cff"/><g fill="#fff"><rect x="34" y="34" width="82" height="82" rx="6"/></g><g fill="#1b2238"><rect x="40" y="40" width="22" height="22"/><rect x="84" y="40" width="22" height="22"/><rect x="62" y="62" width="22" height="22"/><rect x="40" y="84" width="22" height="22"/><rect x="84" y="84" width="22" height="22"/></g></svg>'
ART_SLIDE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#e5007d"/><g fill="#fff"><rect x="32" y="32" width="38" height="38" rx="7"/><rect x="80" y="32" width="38" height="38" rx="7"/><rect x="32" y="80" width="38" height="38" rx="7"/></g><g fill="#1b2238" font-family="Archivo,sans-serif" font-weight="800" font-size="24" text-anchor="middle"><text x="51" y="59">1</text><text x="99" y="59">2</text><text x="51" y="107">3</text></g></svg>'
ART_WS = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#009fe3"/><g fill="#fff" font-family="Archivo,sans-serif" font-weight="800" font-size="22" text-anchor="middle"><text x="42" y="56">C</text><text x="75" y="56">A</text><text x="108" y="56">T</text><text x="42" y="90">D</text><text x="75" y="90">O</text><text x="108" y="90">G</text><text x="42" y="122">B</text><text x="75" y="122">E</text><text x="108" y="122">E</text></g><rect x="30" y="34" width="92" height="28" rx="14" fill="none" stroke="#f2c200" stroke-width="4"/></svg>'
ART_MEM = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#2fa84f"/><g><rect x="30" y="34" width="38" height="38" rx="8" fill="#fff"/><rect x="82" y="34" width="38" height="38" rx="8" fill="#7a5cff"/><rect x="30" y="80" width="38" height="38" rx="8" fill="#7a5cff"/><rect x="82" y="80" width="38" height="38" rx="8" fill="#fff"/><text x="49" y="62" font-size="26" text-anchor="middle">&#9733;</text><text x="101" y="108" font-size="26" text-anchor="middle">&#9733;</text></g></svg>'
ART_STACK = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#1b2238"/><rect x="40" y="104" width="70" height="14" fill="#e5007d"/><rect x="46" y="88" width="58" height="14" fill="#7a5cff"/><rect x="52" y="72" width="46" height="14" fill="#009fe3"/><rect x="30" y="56" width="46" height="14" fill="#f2c200"/></svg>'
ART_DASH = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#1b2238"/><rect x="28" y="104" width="94" height="4" fill="#fff" opacity=".5"/><rect x="40" y="82" width="22" height="22" rx="5" fill="#e5007d"/><rect x="92" y="86" width="14" height="18" fill="#fff"/></svg>'
ART_HOP = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#1b2238"/><rect x="94" y="20" width="24" height="42" fill="#2fa84f"/><rect x="94" y="92" width="24" height="38" fill="#2fa84f"/><circle cx="56" cy="78" r="12" fill="#e5007d"/><circle cx="60" cy="74" r="3" fill="#fff"/></svg>'
ART_BG = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#1b2238"/><g fill="#e5007d"><polygon points="30,30 46,30 38,70"/><polygon points="62,30 78,30 70,70"/><polygon points="94,30 110,30 102,70"/></g><g fill="#7a5cff"><polygon points="46,120 62,120 54,80"/><polygon points="78,120 94,120 86,80"/><polygon points="110,120 126,120 118,80"/></g><circle cx="38" cy="38" r="7" fill="#fefefd"/><circle cx="118" cy="112" r="7" fill="#009fe3"/></svg>'
ART_WORD = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#1b2238"/><g font-family="Archivo,sans-serif" font-weight="800" font-size="20" text-anchor="middle" fill="#fefefd"><rect x="30" y="52" width="16" height="16" rx="3" fill="#2fa84f"/><rect x="50" y="52" width="16" height="16" rx="3" fill="#c9a400"/><rect x="70" y="52" width="16" height="16" rx="3" fill="#4a557c"/><rect x="90" y="52" width="16" height="16" rx="3" fill="#2fa84f"/><rect x="110" y="52" width="16" height="16" rx="3" fill="#4a557c"/><rect x="30" y="76" width="16" height="16" rx="3" fill="#2fa84f"/><rect x="50" y="76" width="16" height="16" rx="3" fill="#2fa84f"/><rect x="70" y="76" width="16" height="16" rx="3" fill="#2fa84f"/><rect x="90" y="76" width="16" height="16" rx="3" fill="#2fa84f"/><rect x="110" y="76" width="16" height="16" rx="3" fill="#2fa84f"/></g></svg>'
ART_CROSS = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#7a5cff"/><g fill="#fefefd"><rect x="30" y="40" width="90" height="18" rx="2"/><rect x="48" y="40" width="18" height="70" rx="2"/><rect x="84" y="58" width="18" height="52" rx="2"/><rect x="48" y="92" width="72" height="18" rx="2"/></g><g fill="#1b2238" font-family="Archivo,sans-serif" font-weight="800" font-size="12" text-anchor="middle"><text x="57" y="53">C</text><text x="75" y="53">R</text><text x="93" y="53">O</text></g></svg>'
ART_SPEED = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#1b2238"/><text x="75" y="84" font-family="Archivo,sans-serif" font-weight="800" font-size="26" text-anchor="middle" fill="#fefefd">re<tspan fill="#e5007d">a</tspan>d</text><rect x="36" y="100" width="78" height="6" rx="3" fill="#fefefd" opacity=".3"/><rect x="36" y="100" width="46" height="6" rx="3" fill="#e5007d"/></svg>'
ART_CPUZ = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="20" y="20" width="110" height="110" rx="12" fill="#1b2238"/><g fill="#ead9b8"><rect x="30" y="30" width="22" height="22"/><rect x="74" y="30" width="22" height="22"/><rect x="52" y="52" width="22" height="22"/><rect x="96" y="52" width="22" height="22"/><rect x="30" y="74" width="22" height="22"/><rect x="74" y="74" width="22" height="22"/></g><g fill="#a97b52"><rect x="52" y="30" width="22" height="22"/><rect x="96" y="30" width="22" height="22"/><rect x="30" y="52" width="22" height="22"/><rect x="74" y="52" width="22" height="22"/><rect x="52" y="74" width="22" height="22"/><rect x="96" y="74" width="22" height="22"/></g><text x="75" y="118" font-size="30" text-anchor="middle" fill="#e5007d">&#9812;</text></svg>'
ART_MJ = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850" text-anchor="middle"><rect x="22" y="36" width="52" height="68" rx="9" fill="#d9dcf0"/><rect x="26" y="30" width="52" height="68" rx="9" fill="#fbfbff"/><text x="52" y="72" font-size="30" fill="#1d4ed8">5</text><text x="52" y="90" font-size="14" fill="#1d4ed8">●</text><rect x="72" y="46" width="52" height="68" rx="9" fill="#d9dcf0"/><rect x="76" y="40" width="52" height="68" rx="9" fill="#fbfbff"/><text x="102" y="86" font-size="34" fill="#e5007d">◆</text></g></svg>'
# ---------------- hub ----------------
ART_WHEEL = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g transform="translate(75 80)">' + ''.join(f'<path d="M0 0L{54*__import__("math").cos(i*1.0472):.1f} {54*__import__("math").sin(i*1.0472):.1f}A54 54 0 0 1 {54*__import__("math").cos((i+1)*1.0472):.1f} {54*__import__("math").sin((i+1)*1.0472):.1f}Z" fill="{c}"/>' for i, c in enumerate(['#e5007d', '#7a5cff', '#0780b8', '#0f8a4f', '#c2410c', '#6d28d9'])) + '<circle r="9" fill="#0b1220" stroke="#fff" stroke-width="3"/></g><path d="M66 12h18l-9 20z" fill="#ffd400"/></svg>'
ART_TEAMS = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g fill="#fff"><circle cx="45" cy="52" r="14"/><circle cx="105" cy="52" r="14" fill="#c4b5ff"/><circle cx="75" cy="92" r="14" fill="#3fc3ff"/></g><g fill="#ffffff55"><path d="M22 112a23 23 0 0 1 46 0z"/><path d="M82 112a23 23 0 0 1 46 0z"/></g></svg>'
ART_DICE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="30" y="30" width="90" height="90" rx="18" fill="#fbfbff"/><g fill="#0b1220"><circle cx="58" cy="58" r="8"/><circle cx="92" cy="58" r="8"/><circle cx="58" cy="92" r="8"/><circle cx="92" cy="92" r="8"/></g><circle cx="75" cy="75" r="8" fill="#e5007d"/></svg>'

ART_BINGO = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="22" y="22" width="106" height="106" rx="14" fill="#fbfbff"/><g font-family="Archivo,sans-serif" font-weight="850" font-size="15" text-anchor="middle" fill="#0b1220"><text x="40" y="52">B</text><text x="63" y="52">I</text><text x="86" y="52">N</text><text x="109" y="52" fill="#e5007d">G</text><text x="40" y="82">7</text><text x="63" y="82">22</text><text x="86" y="82" fill="#7a5cff">★</text><text x="109" y="82">51</text><text x="40" y="112">14</text><text x="63" y="112">38</text><text x="86" y="112">60</text><text x="109" y="112">71</text></g></svg>'
ART_QUIZ = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="22" y="22" width="106" height="40" rx="12" fill="#ffffff22"/><rect x="22" y="72" width="50" height="26" rx="10" fill="#0f8a4f"/><rect x="78" y="72" width="50" height="26" rx="10" fill="#ffffff22"/><rect x="22" y="104" width="50" height="26" rx="10" fill="#ffffff22"/><rect x="78" y="104" width="50" height="26" rx="10" fill="#ffffff22"/><text x="75" y="50" font-family="Archivo,sans-serif" font-weight="850" font-size="26" text-anchor="middle" fill="#fff">?</text></svg>'
ART_SCORE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850" text-anchor="middle"><rect x="20" y="26" width="110" height="46" rx="12" fill="#ffffff22"/><rect x="20" y="82" width="110" height="46" rx="12" fill="#ffd40033" stroke="#ffd400" stroke-width="2"/><text x="105" y="58" font-size="26" fill="#fff">12</text><text x="105" y="114" font-size="26" fill="#ffd400">18</text></g></svg>'
ART_SANTA = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="28" y="62" width="94" height="66" rx="10" fill="#e5007d"/><rect x="68" y="62" width="14" height="66" fill="#ffd400"/><rect x="22" y="46" width="106" height="24" rx="8" fill="#7a5cff"/><rect x="68" y="46" width="14" height="24" fill="#ffd400"/><path d="M75 46c-14-22-34-14-26-4 5 6 26 4 26 4zM75 46c14-22 34-14 26-4-5 6-26 4-26 4z" fill="none" stroke="#ffd400" stroke-width="5" stroke-linejoin="round"/></svg>'
HUB = f'''<section class="phero"><div class="wrap">
  <p class="crumbp"><a href="../">Dilia</a> › <b>Play</b></p>
  <p class="eyeb" id="hno">Today's dailies</p>
  <h1>Come back every day,<br><span class="grad">play in one tap.</span></h1>
  <p class="lead">New puzzles every day at your midnight, the same for everyone in the world. No ads, no sign-up, no downloads. Your scores stay on this device.</p>
</div></section>

<section class="wrap psec" aria-labelledby="h-today">
  <h2 id="h-today">Today</h2>
  <div class="dailies">
    <a class="daily" href="../daily-path/" id="c-path">{ART_PATH}<span class="no" id="n-path">Daily path</span><b>Daily path</b><p>Draw one line through every square. Pass the numbers in order.</p><span class="st" id="s-path"></span></a>
    <a class="daily" href="../daily-sudoku/" id="c-sudoku">{ART_SUD}<span class="no" id="n-sudoku">Daily sudoku</span><b>Daily sudoku</b><p>Three boards a day: easy, medium and hard.</p><span class="st" id="s-sudoku"></span></a>
    <a class="daily" href="../daily-merge/" id="c-merge">{ART_MERGE}<span class="no" id="n-merge">Daily merge</span><b>Daily merge</b><p>Slide and join tiles. Same new tiles for everyone today.</p><span class="st" id="s-merge"></span></a>
    <a class="daily" href="../daily-minesweeper/" id="c-mines">{ART_MINES}<span class="no" id="n-mines">Daily minesweeper</span><b>Daily minesweeper</b><p>One 16 × 16 board, solvable by logic, the same for everyone.</p><span class="st" id="s-mines"></span></a>
    <a class="daily" href="../daily-solitaire/" id="c-sol">{ART_SOL}<span class="no" id="n-sol">Daily solitaire</span><b>Daily solitaire</b><p>One winnable Klondike deal, the same for everyone.</p><span class="st" id="s-sol"></span></a>
  </div>
  <div class="pstrip">
    <div class="gcard"><p class="eyeb">Streak</p><span class="big" id="hstreak">0</span><span class="small" id="hstreak2">Solve any daily to start a streak.</span></div>
    <div class="gcard"><p class="eyeb">This week</p><div class="wkrow" id="hweek"></div></div>
    <div class="gcard"><p class="eyeb">Your bests</p><span class="small" id="hbest">Solve a daily to see your best times.</span></div>
  </div>
</section>

<section class="wrap psec" aria-labelledby="h-any">
  <h2 id="h-any">Play any time</h2>
  <div class="dailies">
    <a class="daily" href="../path-puzzle/" id="c-levels">{ART_PATH.replace('id="ap"', 'id="ap2"').replace('url(#ap)', 'url(#ap2)')}<span class="no" id="n-levels">Levels</span><b>Path puzzle</b><p>Endless levels, from 5 × 5 up to 8 × 8. Your next level is saved.</p><span class="st" id="s-levels"></span></a>
    <a class="daily" href="../merge/">{ART_MERGE}<span class="no">Free play</span><b>Merge</b><p>Reach 2048 on a 4 × 4, 5 × 5 or 6 × 6 board. Undo any time.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../minesweeper/">{ART_MINES}<span class="no">Free play</span><b>Minesweeper</b><p>Beginner to expert, custom sizes and a no-guessing mode.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../solitaire/">{ART_SOL}<span class="no">Free play</span><b>Solitaire</b><p>Klondike, draw 1 or 3, winnable deals and unlimited undo.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../freecell/">{ART_SOL}<span class="no">Free play</span><b>FreeCell</b><p>Classic deal numbers, every deal winnable. Drag or tap, undo any time.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../pyramid/">{ART_PYR}<span class="no">Free play</span><b>Pyramid</b><p>Take away pairs that add up to 13. Winnable deals.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../tripeaks/">{ART_PEAKS}<span class="no">Free play</span><b>TriPeaks</b><p>Clear three peaks, one rank up or down. Winnable deals.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../spider/">{ART_SPIDER}<span class="no">Free play</span><b>Spider</b><p>1, 2 or 4 suits. Build down, take off full runs.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../mahjong/">{ART_MJ}<span class="no">Free play</span><b>Mahjong</b><p>Classic turtle layout. Match free tiles. Every deal clearable.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../chess/">{ART_CHESS}<span class="no">Board</span><b>Chess</b><p>Full rules. Play the computer at four levels, or two players on one device.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../checkers/">{ART_CHECKERS}<span class="no">Board</span><b>Checkers</b><p>American rules. Computer at four levels, or two players.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../reversi/">{ART_REVERSI}<span class="no">Board</span><b>Reversi</b><p>Flip your opponent's discs. Computer at four levels, or two players.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../connect-four/">{ART_C4}<span class="no">Board</span><b>Connect Four</b><p>Drop discs, get four in a row. Computer at four levels, or two players.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../ludo/">{ART_LUDO}<span class="no">Board</span><b>Ludo</b><p>2 to 4 players. Computers at four levels, or friends on one device.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../brick-breaker/">{ART_BRICK}<span class="no">Arcade</span><b>Brick breaker</b><p>Steer the paddle, break every brick.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../pong/">{ART_PONG}<span class="no">Arcade</span><b>Pong</b><p>First to 7 against the computer.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../aim-trainer/">{ART_AIM}<span class="no">Skill</span><b>Aim trainer</b><p>30 seconds. Hits, accuracy and speed.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../nonogram/">{ART_NONO}<span class="no">Puzzle</span><b>Nonogram</b><p>Logic picture puzzles. No guessing needed.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../sliding-puzzle/">{ART_SLIDE}<span class="no">Puzzle</span><b>Sliding puzzle</b><p>3×3, 4×4 or 5×5. Fewest moves.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../word-search/">{ART_WS}<span class="no">Puzzle</span><b>Word search</b><p>Six themes, easy or hard.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../memory-game/">{ART_MEM}<span class="no">Brain</span><b>Memory</b><p>Match the pairs in few moves.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../stack/">{ART_STACK}<span class="no">One button</span><b>Stack</b><p>Tap to drop blocks. Build the tallest tower.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../dash/">{ART_DASH}<span class="no">One button</span><b>Dash</b><p>Tap to jump. Run as far as you can.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../hop/">{ART_HOP}<span class="no">One button</span><b>Hop</b><p>Tap to flap through the gaps.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../backgammon/">{ART_BG}<span class="no">Board</span><b>Backgammon</b><p>Against the computer at four levels, or two players.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../daily-word/">{ART_WORD}<span class="no">Daily</span><b>Daily word</b><p>Guess the five-letter word in six tries. New word every day.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../crossword/">{ART_CROSS}<span class="no">Puzzle</span><b>Crossword</b><p>Our own clues, three sizes, a new grid each time.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../speed-reading/">{ART_SPEED}<span class="no">Brain</span><b>Speed reading</b><p>Words flash one at a time. Then three questions.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../daily-chess-puzzle/">{ART_CPUZ}<span class="no">Daily</span><b>Daily chess puzzle</b><p>Mate in two. A new puzzle every day.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../snake/">{ART_SNAKE}<span class="no">Arcade</span><b>Snake</b><p>Classic with deadly walls, or modern with wrap-around edges and bonus stars.</p><span class="st"><span class="chip" id="s-snake">Play</span></span></a>
    <a class="daily" href="../typing-test/">{ART_TYPE}<span class="no">Skill</span><b>Typing test</b><p>15, 30 or 60 seconds in English, Arabic, Spanish, Hindi or Portuguese.</p><span class="st"><span class="chip" id="s-typing">Play</span></span></a>
    <a class="daily" href="../reaction-time/">{ART_RX}<span class="no">Skill</span><b>Reaction time</b><p>Wait for green, then tap. Your speed in milliseconds.</p><span class="st"><span class="chip" id="s-rx">Play</span></span></a>
    <a class="daily" href="../wheel-spinner/">{ART_WHEEL}<span class="no">Party</span><b>Wheel spinner</b><p>Type the options, spin, get one fair winner. Share the wheel by link.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../team-maker/">{ART_TEAMS}<span class="no">Party</span><b>Team maker</b><p>Split a list of names into fair random teams. Or pick a name at random.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../dice-roller/">{ART_DICE}<span class="no">Party</span><b>Dice, coin, number</b><p>Roll dice with any sides, flip a coin, draw random numbers.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../bingo-card-generator/">{ART_BINGO}<span class="no">Party</span><b>Bingo</b><p>Print bingo cards, classic or with your own words, and call the numbers.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../quiz-maker/">{ART_QUIZ}<span class="no">Party</span><b>Quiz maker</b><p>Write a multiple-choice quiz and play it on one screen. Save it as a file.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../score-keeper/">{ART_SCORE}<span class="no">Party</span><b>Scoreboard</b><p>Keep score for up to 12 teams. Tap to add points.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../secret-santa-generator/">{ART_SANTA}<span class="no">Party</span><b>Secret Santa</b><p>Draw names on one device. Everyone sees only their own person.</p><span class="st"><span class="chip">Play</span></span></a>
  </div>
</section>'''

# ---------------- daily path ----------------
STATS_PATH = '''<div class="gcard"><p class="eyeb">Today</p><span class="big" id="pno">#1</span><span class="small" id="pdate"></span></div>
    <div class="gcard"><p class="eyeb">Streak</p><span class="big"><span id="streak">0</span></span><span class="small">Best time <b id="sbest">–</b> · solved <b id="ssolved">0</b></span></div>'''
PATH = f'''<div class="wrap">
<div class="gwrap">
  <div class="gside">
    {STATS_PATH}
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Daily path</b></p>
    <div class="ghead"><div><h1>Daily path</h1><p class="sub"><span id="psize"></span> · same board for everyone today</p></div>
      <div class="meter"><div><small>TIME</small><b id="ptime">0:00</b></div><div><small>FILLED</small><b id="pfill">0</b></div></div></div>
    <div class="gbox"><div class="board" id="board" tabindex="0" role="application" aria-label="Path board. Start on 1, then use the arrow keys or drag."></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button><button type="button" class="pbtn" id="reset">Clear</button></div>
    <div class="done" id="done"><p class="eyeb">Solved</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><a class="pbtn" href="../path-puzzle/">More paths</a><a class="pbtn" href="../daily-sudoku/">Daily sudoku</a></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small"><li>Start on 1. Drag through the squares, or use the arrow keys.</li><li>Go through every square once.</li><li>Pass the numbers in order and finish on the last one.</li><li>Drag back, or press Undo, to fix a step.</li></ul></div>
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../path-puzzle/">Path puzzle levels</a> · <a href="../daily-sudoku/">Daily sudoku</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About the daily path</h2>
  <p>A new board arrives every day at midnight where you are. Everyone in the world gets the same board on the same date, so you can compare times with friends. Boards grow through the week: 5 × 5 on Monday and Tuesday, 6 × 6 midweek and 7 × 7 at the weekend.</p>
  <p>Every board has exactly one answer. Your line, time and streak are kept in this browser only. Nothing is sent anywhere.</p>
</section>
</div>'''

# ---------------- daily sudoku ----------------
SUD = '''<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Today</p><span class="big" id="sno">#1</span><span class="small" id="sdate"></span></div>
    <div class="gcard"><p class="eyeb">Streak</p><span class="big" id="streak">0</span><span class="small">Best: easy <b id="b-easy">–</b> · medium <b id="b-medium">–</b> · hard <b id="b-hard">–</b></span></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Daily sudoku</b></p>
    <div class="ghead"><div><h1>Daily sudoku</h1><p class="sub">Three boards today, the same for everyone</p></div>
      <div class="meter"><div><small>TIME</small><b id="stime">0:00</b></div><div><small>LEFT</small><b id="sleft">0</b></div></div></div>
    <div class="levels" role="group" aria-label="Level"><button type="button" data-lv="easy" aria-pressed="true">Easy</button><button type="button" data-lv="medium" aria-pressed="false">Medium</button><button type="button" data-lv="hard" aria-pressed="false">Hard</button></div>
    <div class="gbox"><div class="sgrid9" id="sgrid" tabindex="0" role="grid" aria-label="Sudoku board. Pick a square, then type a number."></div></div>
    <div class="pad" id="pad" aria-label="Numbers"></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button><button type="button" class="pbtn" id="erase">Erase</button><button type="button" class="pbtn" id="notes" aria-pressed="false">Notes</button><button type="button" class="pbtn" id="hint">Hint</button><button type="button" class="pbtn" id="check" aria-pressed="false">Show mistakes</button></div>
    <div class="done" id="done"><p class="eyeb">Solved</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dnext" hidden>Next level</button><a class="pbtn" href="../daily-path/">Daily path</a></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small"><li>Fill every row, column and 3 × 3 box with 1 to 9.</li><li>Pick a square, then tap a number or type it.</li><li>Notes: small pencil marks. Press N to switch.</li><li>Numbers that clash turn pink.</li></ul></div>
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../daily-path/">Daily path</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About the daily sudoku</h2>
  <p>Three new boards arrive every day at midnight where you are: easy, medium and hard. Everyone gets the same boards on the same date, and each board has exactly one answer.</p>
  <p>Hints fill one square and are shown in your result. Your board, time and streak are kept in this browser only. Nothing is sent anywhere.</p>
</section>
</div>'''

LEVELS = PATH.replace('<p class="eyeb">Today</p><span class="big" id="pno">#1</span><span class="small" id="pdate"></span>',
  '<p class="eyeb">Level</p><span class="big" id="pno">Level 1</span><span class="small" id="pdate"></span><div class="levnav"><button type="button" class="pbtn" id="lprev">Previous</button><button type="button" class="pbtn" id="lnext">Next</button></div>')
LEVELS = LEVELS.replace('<p class="eyeb">Streak</p><span class="big"><span id="streak">0</span></span><span class="small">Best time <b id="sbest">–</b> · solved <b id="ssolved">0</b></span>',
  '<p class="eyeb">Levels solved</p><span class="big" id="streak">0</span><span class="small">Best on <span id="sbestn"></span>: <b id="sbest">–</b></span>')
LEVELS = LEVELS.replace('<b>Daily path</b></p>', '<b>Path puzzle</b></p>').replace('<h1>Daily path</h1><p class="sub"><span id="psize"></span> · same board for everyone today</p>', '<h1>Path puzzle</h1><p class="sub"><span id="psize"></span> · endless levels</p>')
LEVELS = LEVELS.replace('<a class="pbtn" href="../path-puzzle/">More paths</a><a class="pbtn" href="../daily-sudoku/">Daily sudoku</a>', '<button type="button" class="pbtn" id="dnext">Next level</button>')
LEVELS = LEVELS.replace('<span class="small"><a href="../path-puzzle/">Path puzzle levels</a> · ', '<span class="small"><a href="../daily-path/">Daily path</a> · ')
LEVELS = LEVELS.replace(LEVELS[LEVELS.index('<section class="gtext">'):LEVELS.index('</section>') + 10], """<section class="gtext">
  <h2>About the path puzzle</h2>
  <p>Draw one line through every square and pass the numbers in order. Levels 1 to 10 are 5 × 5, then 6 × 6 up to level 30, 7 × 7 up to level 60, and 8 × 8 after that. Every level has exactly one answer, and each level is the same for everyone.</p>
  <p>Your solved levels and best times stay in this browser. Nothing is sent anywhere.</p>
</section>""")
assert LEVELS.count('id="dnext"') == 1 and 'id="lprev"' in LEVELS

GAME_JS = '<script src="../assets/playgen.js"></script>\n<script src="../assets/playkit.js"></script>\n'
PAGES = {
    'play': ('Play: daily puzzles and games | Dilia', 'Free daily puzzles, the same for everyone: daily path and daily sudoku. No ads, no sign-up. Scores stay on your device.', HUB, GAME_JS + '<script src="../assets/playhub.js"></script>'),
    'daily-path': ('Daily Path Puzzle - Free, New Every Day | Dilia Play', 'Draw one line through every square and pass the numbers in order. A new puzzle every day, the same for everyone. Free, no ads, no sign-up.', PATH, GAME_JS + '<script src="../assets/daily-path.js"></script>'),
    'path-puzzle': ('Path Puzzle - Endless Levels, Free | Dilia Play', 'Draw one line through every square and pass the numbers in order. Endless levels from 5x5 to 8x8. Free, no ads, no sign-up.', LEVELS, GAME_JS + '<script src="../assets/daily-path.js"></script>', 'levels'),
    'daily-sudoku': ('Daily Sudoku - Easy, Medium and Hard, Free | Dilia Play', 'Three new sudoku boards every day: easy, medium and hard. Notes, hints and mistake check. Free, no ads, no sign-up.', SUD, GAME_JS + '<script src="../assets/daily-sudoku.js"></script>'),
}

# ---------------- merge (free play + daily) ----------------
def merge_body(daily):
    side1 = '<div class="gcard"><p class="eyeb">Today</p><span class="big" id="mno">#1</span><span class="small" id="mdate"></span></div>' if daily else ''
    sizes = '' if daily else '<div class="msize" role="group" aria-label="Board size"><button type="button" data-n="4" aria-pressed="true">4 × 4</button><button type="button" data-n="5" aria-pressed="false">5 × 5</button><button type="button" data-n="6" aria-pressed="false">6 × 6</button></div>'
    best = '<div class="gcard"><p class="eyeb">' + ('Best daily score' if daily else 'Best score on this size') + '</p><span class="big" id="mbest">–</span></div>'
    title = 'Daily merge' if daily else 'Merge'
    sub = 'Same tiles for everyone today · one game a day' if daily else 'Slide and join tiles. Reach 2048, then go higher.'
    btns = ('<a class="pbtn" href="../merge/">Free play</a>' if daily else '<button type="button" class="pbtn" id="newgame">New game</button>')
    dbtn = ('<a class="pbtn" href="../merge/">Free play</a><a class="pbtn" href="../daily-path/">Daily path</a>' if daily else '<button type="button" class="pbtn" id="dagain">Play again</button><a class="pbtn" href="../daily-merge/">Daily merge</a>')
    howto = ('<li>Swipe, or use the arrow keys (or W A S D).</li><li>Two equal tiles that touch join into one: 2 + 2 = 4.</li><li>A new tile appears after every move.</li><li>Reach 2048. The game ends when no move is left.</li>'
             + ('<li>Everyone gets the same new tiles in the same order today. No undo, one game a day.</li>' if daily else '<li>Undo takes back a move.</li>'))
    about = ('<p>One new game every day at midnight where you are. Everyone gets the same new tiles in the same order, so the best players really are the best. Your score is final when no move is left.</p>' if daily else
             '<p>Slide the tiles in four directions. Equal tiles join and add up, and the aim is to reach the 2048 tile. Choose a 4 × 4, 5 × 5 or 6 × 6 board; bigger boards give more room and longer games.</p>')
    return f"""<div class="wrap">
<div class="gwrap">
  <div class="gside">
    {side1}
    {best}
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div>
      <div class="meter"><div id="mscorebox"><small>SCORE</small><b id="mscore">0</b></div><div><small>MOVES</small><b id="mmoves">0</b></div></div></div>
    {sizes}
    <div class="gbox" id="mbox"><div class="mboard" id="mboard" tabindex="0" role="application" aria-label="Board"><div id="mcells"></div><div id="mtiles"></div></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button>{btns}</div>
    <div class="done" id="done"><p class="eyeb">Game over · score</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button>{dbtn}</div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small">{howto}</ul></div>
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../{'merge' if daily else 'daily-merge'}/">{'Merge free play' if daily else 'Daily merge'}</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About {title.lower()}</h2>
  {about}
  <p>Your game and best score stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""
PAGES['merge'] = ('Merge - Free Number Tile Puzzle, Reach 2048 | Dilia Play', 'Slide and join number tiles to reach 2048 and beyond. 4x4, 5x5 and 6x6 boards, undo. Free, no ads, no sign-up.', merge_body(False), GAME_JS + '<script src="../assets/merge-game.js"></script>', 'free')
PAGES['daily-merge'] = ('Daily Merge - Same Tiles for Everyone | Dilia Play', 'One number-merge game a day with the same tiles for everyone. Reach 2048 and compare scores. Free, no ads, no sign-up.', merge_body(True), GAME_JS + '<script src="../assets/merge-game.js"></script>', 'daily')

# ---------------- minesweeper (free + daily) ----------------
def mines_body(daily):
    title = 'Daily minesweeper' if daily else 'Minesweeper'
    sub = '16 × 16 · 40 mines · same board for everyone today' if daily else '<span id="msize"></span>'
    tools = ('' if daily else '<div class="mtools"><div class="mlevel" role="group" aria-label="Level"><button type="button" data-lv="beginner" aria-pressed="true">Beginner</button><button type="button" data-lv="intermediate" aria-pressed="false">Intermediate</button><button type="button" data-lv="expert" aria-pressed="false">Expert</button><button type="button" data-lv="custom" aria-pressed="false">Custom</button></div><button type="button" class="pbtn" id="noguess" aria-pressed="true">No guessing</button></div>'
             '<div class="mcustom" id="custom" hidden><label>WIDTH<input id="cw" type="number" min="5" max="30" inputmode="numeric"></label><label>HEIGHT<input id="ch" type="number" min="5" max="30" inputmode="numeric"></label><label>MINES<input id="cm" type="number" min="1" max="270" inputmode="numeric"></label><button type="button" class="pbtn" id="capply">Start</button></div>')
    meter = '<div><small>MINES</small><b id="mleft">0</b></div><div><small>TIME</small><b id="mtime">0:00</b></div>' + ('<div><small>TRY</small><b id="mtries">1</b></div>' if daily else '')
    btns = '<button type="button" class="pbtn" id="flagmode" aria-pressed="false">Flag mode</button>' + ('' if daily else '<button type="button" class="pbtn" id="newgame">New game</button>')
    dbtn = ('<a class="pbtn" href="../minesweeper/">Free play</a><a class="pbtn" href="../play/">All of Play</a>' if daily else '<button type="button" class="pbtn" id="dagain">Play again</button><a class="pbtn" href="../daily-minesweeper/">Daily board</a>')
    side1 = ('<div class="gcard"><p class="eyeb">Today</p><span class="big" id="mno">#1</span><span class="small" id="mdate"></span></div><div class="gcard"><p class="eyeb">Streak</p><span class="big" id="streak">0</span><span class="small">Best daily time <b id="sbest">–</b></span></div>'
             if daily else '<div class="gcard"><p class="eyeb">Best time</p><span class="big" id="sbest">–</span><span class="small" id="sbestl"></span></div>')
    howto = ('<li>Tap a square to open it. A number says how many mines touch it.</li><li>Long-press, right-click or use Flag mode to mark a mine.</li><li>Tap a number when all its mines are flagged to open the rest around it.</li><li>Keyboard: arrows, Enter to open, F to flag.</li>'
             + ('<li>The board opens at the same square for everyone. If you hit a mine, the same board starts again and your tries are counted.</li>' if daily else '<li>Your first tap is always safe. With No guessing on, every board can be solved by logic alone.</li>'))
    about = ('<p>One new board every day at midnight where you are: 16 × 16 with 40 mines, the same for everyone, opened at the same square. Every daily board can be solved by logic, with no guessing.</p>' if daily else
             '<p>Classic minesweeper with three levels (9 × 9, 16 × 16 and 30 × 16) and your own custom size. On a phone the expert board turns tall so the squares stay big enough to tap. No guessing mode makes boards that can always be solved by logic.</p>')
    return f"""<div class="wrap">
<div class="gwrap one">
  <div class="gside">
    {side1}
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small">{howto}</ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div><div class="meter">{meter}</div></div>
    {tools}
    <div class="gbox"><div class="mwrap"><div class="mines" id="mines" tabindex="0" role="application" aria-label="Minefield. Arrow keys move, Enter opens, F flags."></div></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns">{btns}</div>
    <div class="done" id="done"><p class="eyeb" id="deyebrow">Cleared</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button>{dbtn}</div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../{'minesweeper' if daily else 'daily-minesweeper'}/">{'Minesweeper free play' if daily else 'Daily minesweeper'}</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About {title.lower()}</h2>
  {about}
  <p>Your board and times stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""
PAGES['minesweeper'] = ('Minesweeper - Free, No Guessing Mode | Dilia Play', 'Classic minesweeper: beginner, intermediate, expert and custom boards. No guessing mode, flags by long-press. Free, no ads, no sign-up.', mines_body(False), GAME_JS + '<script src="../assets/mines-game.js"></script>', 'free')
PAGES['daily-minesweeper'] = ('Daily Minesweeper - Same Board for Everyone | Dilia Play', 'One minesweeper board a day, the same for everyone and solvable by logic. Race the clock and share your time. Free, no ads, no sign-up.', mines_body(True), GAME_JS + '<script src="../assets/mines-game.js"></script>', 'daily')

# ---------------- solitaire (free + daily) ----------------
def sol_body(daily):
    title = 'Daily solitaire' if daily else 'Solitaire'
    sub = 'Klondike, draw 1 · a winnable deal, the same for everyone today' if daily else 'Klondike · drag, or tap a card to move it'
    tools = '' if daily else '<div class="mtools"><div class="sdraw" role="group" aria-label="Draw"><button type="button" data-d="1" aria-pressed="true">Draw 1</button><button type="button" data-d="3" aria-pressed="false">Draw 3</button></div><button type="button" class="pbtn" id="winnable" aria-pressed="true">Winnable deals</button></div>'
    btns = '<button type="button" class="pbtn" id="undo">Undo</button><button type="button" class="pbtn go" id="finish" hidden>Finish</button>' + ('' if daily else '<button type="button" class="pbtn" id="newgame">New deal</button>')
    dbtn = ('<a class="pbtn" href="../solitaire/">Free play</a><a class="pbtn" href="../play/">All of Play</a>' if daily else '<button type="button" class="pbtn" id="dagain">New deal</button><a class="pbtn" href="../daily-solitaire/">Daily deal</a>')
    side1 = ('<div class="gcard"><p class="eyeb">Today</p><span class="big" id="sno">#1</span><span class="small" id="sdate"></span></div><div class="gcard"><p class="eyeb">Streak</p><span class="big" id="streak">0</span><span class="small">Best daily time <b id="sbest">–</b></span></div>'
             if daily else '<div class="gcard"><p class="eyeb">Best time · draw <span id="sdraw">1</span></p><span class="big" id="sbest">–</span><span class="small">Games won: <b id="swins">0</b></span></div>')
    howto = ('<li>Build four home piles from Ace to King, one per suit.</li><li>In the columns, put a card on one rank higher of the other colour. Only a King goes on an empty column.</li><li>Tap the deck to turn cards. Tap a card to send it to the best place, or drag it.</li><li>Keys: D turns a card, U or Ctrl+Z undoes.</li>'
             + ('<li>Today\'s deal is the same for everyone and can be won.</li>' if daily else '<li>Winnable deals (draw 1): every deal can be won.</li>'))
    about = ('<p>One new Klondike deal every day at midnight where you are, the same for everyone. Every daily deal has been checked by a solver and can be won. Draw one card at a time, with as many passes through the deck as you like.</p>' if daily else
             '<p>Classic Klondike solitaire with draw 1 or draw 3 and unlimited passes through the deck. With Winnable deals on, every draw-1 deal has been checked by a solver before you see it. Undo as much as you like; when all cards are face up, Finish sends them home.</p>')
    return f"""<div class="wrap">
<div class="gwrap one">
  <div class="gside">
    {side1}
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small">{howto}</ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div><div class="meter"><div><small>TIME</small><b id="stime">0:00</b></div><div><small>MOVES</small><b id="smoves">0</b></div></div></div>
    {tools}
    <div class="gbox"><div class="ksol" id="sol" role="application" aria-label="Solitaire table"></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns">{btns}</div>
    <div class="done" id="done"><p class="eyeb">Won</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button>{dbtn}</div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../{'solitaire' if daily else 'daily-solitaire'}/">{'Solitaire free play' if daily else 'Daily solitaire'}</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About {title.lower()}</h2>
  {about}
  <p>Your game and times stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""
PAGES['solitaire'] = ('Solitaire - Free Klondike, Winnable Deals | Dilia Play', 'Free Klondike solitaire: draw 1 or draw 3, winnable deals, unlimited undo, tap or drag. No ads, no sign-up.', sol_body(False), GAME_JS + '<script src="../assets/solitaire-game.js"></script>', 'free')
PAGES['daily-solitaire'] = ('Daily Solitaire - Same Winnable Deal for Everyone | Dilia Play', 'One Klondike solitaire deal a day, the same for everyone and checked to be winnable. Free, no ads, no sign-up.', sol_body(True), GAME_JS + '<script src="../assets/solitaire-game.js"></script>', 'daily')
# ---------------- card games: FreeCell, Pyramid, TriPeaks (free play) ----------------
CARD_LINKS = [('solitaire', 'Solitaire'), ('freecell', 'FreeCell'), ('pyramid', 'Pyramid'), ('tripeaks', 'TriPeaks'), ('spider', 'Spider'), ('mahjong', 'Mahjong'), ('daily-solitaire', 'Daily solitaire')]
def card_body(slug, title, sub, boardid, howto, about, extra_side='', winnable=True, finish=False, tools_html='', extra_btns=''):
    more = ' · '.join(f'<a href="../{a}/">{b}</a>' for a, b in CARD_LINKS if a != slug)
    tools = '<div class="mtools"><button type="button" class="pbtn" id="winnable" aria-pressed="true">Winnable deals</button></div>' if winnable else tools_html
    fin = '<button type="button" class="pbtn go" id="finish" hidden>Finish</button>' if finish else ''
    how = ''.join(f'<li>{h}</li>' for h in howto)
    return f"""<div class="wrap">
<div class="gwrap one">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Best time</p><span class="big" id="sbest">–</span><span class="small">Games won: <b id="swins">0</b></span></div>
    {extra_side}
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small">{how}</ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div><div class="meter"><div><small>TIME</small><b id="stime">0:00</b></div><div><small>MOVES</small><b id="smoves">0</b></div></div></div>
    {tools}
    <div class="gbox"><div class="ksol" id="{boardid}" role="application" aria-label="{title} table"></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button>{extra_btns}{fin}<button type="button" class="pbtn" id="newgame">New deal</button></div>
    <div class="done" id="done"><p class="eyeb">Cleared</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">New deal</button><a class="pbtn" href="../play/">All of Play</a></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More card games</p><span class="small">{more} · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About {title}</h2>
  {about}
  <p>Your game and times stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""
CARD_JS = GAME_JS + '<script src="../assets/cardgames.js"></script><script src="../assets/cardkit.js"></script>'
PAGES['freecell'] = ('FreeCell - Free Online, Every Deal Winnable | Dilia Play', 'Free FreeCell with the classic deal numbers. Every deal can be won. Drag or tap, supermoves, undo and a Finish button. No ads, no sign-up.',
    card_body('freecell', 'FreeCell', 'Eight columns, four free cells · drag, or tap a card to move it', 'fc',
      ['Move all cards home, Ace to King, one pile per suit.', 'In the columns, put a card on one rank higher of the other colour.', 'Four free cells hold one card each. Tap a card to send it to the best place.', 'Move several cards at once when you have free cells or empty columns. Keys: U or Ctrl+Z undoes.'],
      '<p>FreeCell uses the classic deal numbers 1 to 32000. Every one of them can be won, and the single deal that cannot (number 11982) is never dealt. The deal number is shown so you can compare with friends. You can move a run of cards together as long as you have enough free cells and empty columns; undo is unlimited, and Finish sends the cards home when the game is won.</p>',
      extra_side='<div class="gcard"><p class="eyeb">Deal</p><span class="big" id="fcno">#1</span></div>', winnable=False, finish=True), CARD_JS + '<script src="../assets/freecell-game.js"></script>', 'free')
PAGES['pyramid'] = ('Pyramid Solitaire - Free, Winnable Deals | Dilia Play', 'Free Pyramid solitaire: remove pairs that add up to 13. Winnable deals, unlimited passes through the deck and undo. No ads, no sign-up.',
    card_body('pyramid', 'Pyramid', 'Take away pairs that add up to 13 · tap two cards', 'pyr',
      ['Tap two free cards that add up to 13 to take them away. A free King goes on its own.', 'Ace is 1, Jack 11, Queen 12, King 13.', 'A card is free when no card lies on top of it. Use the card on the waste pile as a partner too.', 'Tap the deck for the next card, as many times round as you like. Clear all 28 pyramid cards to win.'],
      '<p>Clear the pyramid by pairing free cards that add up to 13, or by removing Kings alone. The deck turns one card at a time and you can go through it as many times as you like. With Winnable deals on, every deal has been checked by a solver before you see it. Undo as much as you like.</p>'), CARD_JS + '<script src="../assets/pyramid-game.js"></script>', 'free')
PAGES['tripeaks'] = ('TriPeaks Solitaire - Free, Winnable Deals | Dilia Play', 'Free TriPeaks solitaire: clear three peaks by playing cards one rank higher or lower. Winnable deals and undo. No ads, no sign-up.',
    card_body('tripeaks', 'TriPeaks', 'Clear three peaks · tap a card one rank above or below', 'tpk',
      ['Tap a face-up card that is one rank higher or lower than the open card.', 'King and Ace count as neighbours.', 'Tap the deck when you are stuck. There is no second pass.', 'Clear all 28 cards in the peaks to win. Keys: D draws, U undoes.'],
      '<p>Clear all 28 cards from the three peaks. Play any uncovered card that is one rank above or below the open card; Aces and Kings wrap around. When there is no play, draw from the deck. The deck is used once. With Winnable deals on, every deal has been checked by a solver, so a clever route always exists.</p>',
      extra_side='<div class="gcard"><p class="eyeb">Left</p><span class="small">Peak cards: <b id="tpleft">28</b> · Deck: <b id="tpstock">23</b></span></div>'), CARD_JS + '<script src="../assets/tripeaks-game.js"></script>', 'free')
PAGES['spider'] = ('Spider Solitaire - 1, 2 or 4 Suits, Free | Dilia Play', 'Free Spider solitaire with 1, 2 or 4 suits. Drag or tap, deal rows, unlimited undo. No ads, no sign-up.',
    card_body('spider', 'Spider', 'Two packs, ten columns · drag, or tap a card to move it', 'spd',
      ['Build each column down in rank, King to Ace, on any suit.', 'Only a run of one suit moves together.', 'A full King-to-Ace run of one suit leaves the table. Take off all 8 to win.', 'Tap the deck to deal one card on each column (no empty columns allowed). Keys: D deals, U undoes.'],
      '<p>Spider uses two packs of cards. Choose 1 suit for a relaxed game, 2 suits for a fair challenge, or 4 suits for the full test. Deals are random, and with 4 suits many of them cannot be won, so use undo freely. One-suit deals are almost always winnable.</p>',
      extra_side='<div class="gcard"><p class="eyeb">Progress</p><span class="small">Runs taken off: <b id="spdone">0</b> of 8 · Deals left: <b id="spleft">5</b></span></div>', winnable=False,
      tools_html='<div class="mtools"><div class="sdraw" role="group" aria-label="Suits"><button type="button" data-d="1" aria-pressed="true">1 suit</button><button type="button" data-d="2" aria-pressed="false">2 suits</button><button type="button" data-d="4" aria-pressed="false">4 suits</button></div></div>'), CARD_JS + '<script src="../assets/spider-game.js"></script>', 'free')
PAGES['mahjong'] = ('Mahjong Solitaire - Free Online, Every Deal Clearable | Dilia Play', 'Free mahjong solitaire with the classic turtle layout. Every deal can be cleared. Hints, shuffle and undo. No ads, no sign-up.',
    card_body('mahjong', 'Mahjong', 'Turtle layout · tap two free tiles that match', 'mjb',
      ['Tap two free tiles with the same face to take them away.', 'A tile is free when nothing lies on it and its left or right side is open.', 'Any flower matches any flower, and any season matches any season.', 'Stuck? Shuffle mixes the tiles that are left. Hint shows an open pair.'],
      '<p>Clear all 144 tiles of the classic turtle layout. Every deal is built backwards from an empty board, so a way to clear it always exists. Tiles are shown with numbers and symbols: ● dots, ▮ bamboo, ❖ characters, E S W N winds, ◆ ◇ dragons, ✿ flowers and ❄ seasons. The tiles are small on a phone held upright; a tablet, a computer or a phone turned sideways is more comfortable.</p>',
      extra_side='<div class="gcard"><p class="eyeb">Left</p><span class="small">Tiles: <b id="mjleft">144</b></span></div>', winnable=False,
      extra_btns='<button type="button" class="pbtn" id="hint">Hint</button><button type="button" class="pbtn go" id="shuffle" hidden>Shuffle</button>'), CARD_JS + '<script src="../assets/mahjong-game.js"></script>', 'free')
# ---------------- arcade and skill: snake, reaction time, typing test (free play; best scores stay in the browser) ----------------

def snake_body():
    return """<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Best score</p><span class="big" id="kbest">0</span><span class="small" id="kmodeline"></span></div>
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small"><li>Arrow keys or W A S D to steer. On a phone: swipe, or use the buttons.</li><li>Eat the pink apples to grow. Don't touch your own tail.</li><li>Classic: the walls are deadly. Modern: the edges wrap round, and a gold star (+5) shows up after every 5th apple.</li><li>Space or P pauses.</li></ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Snake</b></p>
    <div class="ghead"><div><h1>Snake</h1><p class="sub">Classic and modern modes</p></div>
      <div class="meter"><div><small>SCORE</small><b id="kscore">0</b></div><div><small>LENGTH</small><b id="klen">3</b></div></div></div>
    <div class="mtools"><div class="mlevel" role="group" aria-label="Mode"><button type="button" data-m="classic" aria-pressed="true">Classic</button><button type="button" data-m="modern" aria-pressed="false">Modern</button></div></div>
    <div class="snkbox" id="snkbox"><canvas id="snk" role="img" aria-label="Snake board. Use the arrow keys or swipe to steer."></canvas><div class="snkov" id="snkov"></div></div>
    <div class="dpad" aria-label="Steer"><button type="button" class="u" data-d="0" aria-label="Up">▲</button><button type="button" class="l" data-d="3" aria-label="Left">◀</button><button type="button" class="d" data-d="2" aria-label="Down">▼</button><button type="button" class="r" data-d="1" aria-label="Right">▶</button></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="pause" disabled>Pause</button><button type="button" class="pbtn" id="newgame">New game</button></div>
    <div class="done" id="done"><p class="eyeb" id="deyebrow">Game over · score</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">Play again</button></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../typing-test/">Typing test</a> · <a href="../reaction-time/">Reaction time</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About snake</h2>
  <p>Steer the snake to the apples. Each apple makes it longer and the game a little faster. In Classic mode the walls end the game; in Modern mode the edges wrap round, so you can leave one side and come back on the other, and a gold star worth 5 points appears after every fifth apple for a few seconds.</p>
  <p>Fill the whole board and you win. Your best score for each mode stays in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""

def reaction_body():
    return """<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Fastest ever</p><span class="big" id="rxbest">–</span><span class="small">Average <b id="rxavg">–</b> · <b id="rxcount">0</b> tries</span></div>
    <div class="gcard"><p class="eyeb">How it works</p><ul class="small"><li>Tap the box to start. It turns red: wait.</li><li>When it turns green, tap as fast as you can.</li><li>Tap too soon and the try does not count.</li><li>Space or Enter works too. 5 tries make a round.</li></ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Reaction time</b></p>
    <div class="ghead"><div><h1>Reaction time</h1><p class="sub">How fast can you tap? In milliseconds.</p></div>
      <div class="meter"><div><small>TRY</small><b id="rxtry">1/5</b></div><div><small>LAST</small><b id="rxlast">–</b></div></div></div>
    <div class="rxpad" id="rxpad" role="button" tabindex="0" data-s="idle"><b id="rxbig">Tap to start</b><span id="rxsub"></span></div>
    <div class="rxdots" id="rxdots" aria-hidden="true"></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="done" id="done"><p class="eyeb">Round done · average</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button></div></div>
    <div class="gcard" style="margin-top:16px"><p class="eyeb">History</p><svg class="rxchart" id="rxchart" viewBox="0 0 300 110" preserveAspectRatio="none" role="img" aria-label="Your last reaction times"></svg><span class="small" id="rxnote"></span></div>
    <div class="gbtns"><button type="button" class="pbtn" id="rxclear">Clear history</button></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../typing-test/">Typing test</a> · <a href="../snake/">Snake</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About the reaction time test</h2>
  <p>Wait for the box to turn green, then tap. The time counts from the moment the green is drawn to your tap. It includes the delay of your screen, device and browser, so use it to compare yourself on the same device, not against other people's numbers on other devices.</p>
  <p>Typical results are in the range of 200 to 300 milliseconds. This is a fun test, not a medical one. Your times stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""

def typing_body():
    return """<div class="wrap">
<div class="gwrap one">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Best for this setting</p><span class="big" id="tbest">–</span><span class="small" id="tbest2"></span></div>
    <div class="gcard"><p class="eyeb">How it works</p><ul class="small"><li>Click the box and type the words. Press the space bar after each word.</li><li>The timer starts at your first key. Esc starts again.</li><li>Speed counts only words typed exactly right (5 letters = 1 word). Accuracy counts every letter.</li><li>Arabic and Hindi need that language on your keyboard.</li></ul></div>
    <div class="gcard"><p class="eyeb">Recent tests</p><ul class="thist" id="thist"></ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Typing test</b></p>
    <div class="ghead"><div><h1>Typing test</h1><p class="sub">Speed and accuracy · 15, 30 or 60 seconds</p></div>
      <div class="meter"><div><small>TIME</small><b id="ttime">30</b></div><div><small>WPM</small><b id="twpm">0</b></div></div></div>
    <div class="mtools"><div class="mlevel tlang" role="group" aria-label="Language"><button type="button" data-l="en" aria-pressed="true">English</button><button type="button" data-l="ar" aria-pressed="false" lang="ar">العربية</button><button type="button" data-l="es" aria-pressed="false" lang="es">Español</button><button type="button" data-l="hi" aria-pressed="false" lang="hi">हिन्दी</button><button type="button" data-l="pt" aria-pressed="false" lang="pt">Português</button></div>
      <div class="msize" role="group" aria-label="Time" style="margin:0"><button type="button" data-d="15" aria-pressed="false">15 s</button><button type="button" data-d="30" aria-pressed="true">30 s</button><button type="button" data-d="60" aria-pressed="false">60 s</button></div></div>
    <div class="gbox"><div class="tybox" id="tybox"><div class="tywords" id="tywords" aria-label="Words to type"></div>
      <input class="tin" id="tin" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Type the words here"></div></div>
    <p class="msg" id="thint" style="color:var(--pmut)"></p><p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="restart">Start again</button></div>
    <div class="done" id="done"><p class="eyeb">Time's up</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">Try again</button></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../reaction-time/">Reaction time</a> · <a href="../snake/">Snake</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About the typing test</h2>
  <p>Choose English, Arabic, Spanish, Hindi or Portuguese, and 15, 30 or 60 seconds. The words are common everyday words, picked at random each time. Your speed is shown in words per minute (WPM), where five letters count as one word, and only words typed exactly right count. Accuracy is the share of letters you typed correctly.</p>
  <p>Your best scores and last ten tests stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""

def chess_body():
    return """<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Your record</p><span class="big" id="clvname">Casual</span><span class="small" id="crec">0 won · 0 drawn · 0 lost</span></div>
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small"><li>Choose Play White or Play Black, then press Start game (as White you can also just move).</li><li>Tap a piece, then a green mark. Or drag it.</li><li>All rules are in: castling, en passant, promotion, check, stalemate and draws.</li><li>Undo takes back your last move (and the reply). Keys: U undo, F flip board.</li><li>Your game is saved in this browser.</li></ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Chess</b></p>
    <div class="ghead"><div><h1>Chess</h1><p class="sub">Play the computer or a friend on one device</p></div><div class="meter"><div><small>MOVE</small><b id="cmoves">0</b></div></div></div>
    <div class="cchips"><div class="mlevel" role="group" aria-label="Mode"><button type="button" data-cm="cpu" aria-pressed="true">Vs computer</button><button type="button" data-cm="two" aria-pressed="false">Two players</button></div>
      <div class="mlevel" id="clevels" role="group" aria-label="Level"><button type="button" data-cl="1" aria-pressed="false">Beginner</button><button type="button" data-cl="2" aria-pressed="true">Casual</button><button type="button" data-cl="3" aria-pressed="false">Club</button><button type="button" data-cl="4" aria-pressed="false">Expert</button></div>
      <div class="mlevel" id="cside" role="group" aria-label="Your colour"><button type="button" data-cs="0" aria-pressed="true">Play White</button><button type="button" data-cs="1" aria-pressed="false">Play Black</button></div></div>
    <div class="chbox"><div class="chb" id="chb" role="application" aria-label="Chess board"></div><div class="cpromo" id="promo" hidden></div></div>
    <p class="cturn" id="cturn" aria-live="polite">White to move</p>
    <div class="gbtns"><button type="button" class="pbtn go" id="cstart" hidden>Start game</button></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button><button type="button" class="pbtn" id="flip">Flip board</button><button type="button" class="pbtn" id="newgame">New game</button></div>
    <div class="done" id="done"><p class="eyeb" id="deyebrow">Game over</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">New game</button><a class="pbtn" href="../play/">All of Play</a></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">Moves</p><ol class="clist" id="clist" style="list-style:none"></ol></div>
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../solitaire/">Solitaire</a> · <a href="../mahjong/">Mahjong</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About Chess</h2>
  <p>Play the full game of chess against a computer opponent at four levels, or pass the device between two players. The computer is an engine written for Dilia that runs inside your browser, so nothing is sent anywhere. Beginner and Casual make human-like mistakes. Club plays solid, tactical chess. Expert searches deeper and uses the full thinking time, and on a slow phone it will play weaker than on a computer.</p>
  <p>Draws are applied automatically: stalemate, threefold repetition, the fifty-move rule and positions where neither side can mate. Undo is unlimited. Your game stays in this browser.</p>
</section>
</div>"""
PAGES['chess'] = ('Chess - Play the Computer or a Friend, Free | Dilia Play', 'Free chess with full rules. Play the computer at four levels, or two players on one device. Undo, flip board, saved game. No ads, no sign-up.', chess_body(), GAME_JS + '<script src="../assets/chess-core.js"></script><script src="../assets/chess-game.js"></script>', 'free')
def board_body(slug, title, sub, names, howto, about, more):
    how = ''.join(f'<li>{h}</li>' for h in howto)
    return f"""<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Your record</p><span class="big" id="clvname">Casual</span><span class="small" id="crec">0 won · 0 drawn · 0 lost</span></div>
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small">{how}</ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div><div class="meter"><div><small>{names[0].upper()}</small><b id="ca">0</b></div><div><small>{names[1].upper()}</small><b id="cb">0</b></div></div></div>
    <div class="cchips"><div class="mlevel" role="group" aria-label="Mode"><button type="button" data-cm="cpu" aria-pressed="true">Vs computer</button><button type="button" data-cm="two" aria-pressed="false">Two players</button></div>
      <div class="mlevel" id="clevels" role="group" aria-label="Level"><button type="button" data-cl="1" aria-pressed="false">Beginner</button><button type="button" data-cl="2" aria-pressed="true">Casual</button><button type="button" data-cl="3" aria-pressed="false">Club</button><button type="button" data-cl="4" aria-pressed="false">Expert</button></div>
      <div class="mlevel" id="cside" role="group" aria-label="Your colour"><button type="button" data-cs="0" aria-pressed="true">Play {names[0]} (first)</button><button type="button" data-cs="1" aria-pressed="false">Play {names[1]}</button></div></div>
    <div class="chbox"><div class="bgb" id="bgb" data-game="{slug}" role="application" aria-label="{title} board"></div></div>
    <p class="cturn" id="cturn" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn go" id="cstart" hidden>Start game</button></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button><button type="button" class="pbtn" id="flip">Flip board</button><button type="button" class="pbtn" id="newgame">New game</button></div>
    <div class="done" id="done"><p class="eyeb" id="deyebrow">Game over</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">New game</button><a class="pbtn" href="../play/">All of Play</a></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small">{more} · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About {title}</h2>
  {about}
  <p>The computer runs inside your browser, so nothing is sent anywhere. Undo is unlimited, and your game stays in this browser.</p>
</section>
</div>"""
BOARD_JS = GAME_JS + '<script src="../assets/boardgames.js"></script><script src="../assets/board-game.js"></script>'
PAGES['checkers'] = ('Checkers - Play the Computer or a Friend, Free | Dilia Play', 'Free checkers (draughts) with American rules. Play the computer at four levels, or two players on one device. Undo, saved game. No ads, no sign-up.',
    board_body('checkers', 'Checkers', 'American rules · play the computer or a friend', ['Light', 'Dark'],
      ['Tap a piece, then a marked square. Pieces move one step diagonally forward.', 'You must jump an enemy piece when you can, and keep jumping if more jumps follow.', 'Reach the far row to become a king, which moves and jumps both ways.', 'Win by taking all enemy pieces or leaving them with no move. Keys: U undo, F flip.'],
      '<p>This is American checkers (English draughts) on an 8 by 8 board: men move one step forward, kings move one step in any direction, and capturing is compulsory. A man that reaches the last row is crowned and its turn ends. Forty moves each without a capture or a man moving is a draw.</p><p>Beginner and Casual make mistakes. Club thinks several jumps ahead. Expert searches deepest and is hard to beat.</p>',
      '<a href="../chess/">Chess</a> · <a href="../reversi/">Reversi</a>'), BOARD_JS, 'free')
PAGES['reversi'] = ('Reversi (Othello) - Play the Computer or a Friend, Free | Dilia Play', 'Free reversi, also known as Othello. Play the computer at four levels, or two players on one device. Undo, saved game. No ads, no sign-up.',
    board_body('reversi', 'Reversi', 'Also called Othello · flip your opponent\'s discs', ['Black', 'White'],
      ['Tap a marked square to place a disc. It must trap a line of enemy discs between your new disc and one of yours.', 'Trapped discs flip to your colour.', 'If you have no legal move you pass. The game ends when neither side can move.', 'Most discs wins. Corners cannot be flipped. Keys: U undo, F flip.'],
      '<p>Reversi is played on an 8 by 8 board with discs that are black on one side and white on the other. Black moves first. Every move must flip at least one enemy disc; if you cannot, you pass. When neither player can move, the side with more discs wins.</p><p>Corners are strong because they can never be flipped. Beginner and Casual play loosely, Club plans around corners and mobility, and Expert searches deepest.</p>',
      '<a href="../chess/">Chess</a> · <a href="../checkers/">Checkers</a>'), BOARD_JS, 'free')
PAGES['connect-four'] = ('Connect Four - Play the Computer or a Friend, Free | Dilia Play', 'Free Connect Four. Play the computer at four levels, or two players on one device. Undo, saved game. No ads, no sign-up.',
    board_body('connect4', 'Connect Four', 'Drop discs, get four in a row', ['Red', 'Yellow'],
      ['Tap a column to drop your disc. It falls to the lowest free spot.', 'Get four in a row: across, down or diagonally.', 'Block your opponent as well as building your own line.', 'If the board fills up with no four in a row, it is a draw. Keys: U undo.'],
      '<p>Two players take turns dropping discs into a seven-column, six-row grid. The first to line up four discs in a row, in any direction, wins. Red moves first.</p><p>Beginner overlooks threats. Casual sees short tactics. Club and Expert search many moves ahead and are very hard to beat as the second player, because Connect Four is a theoretical win for whoever moves first.</p>',
      '<a href="../chess/">Chess</a> · <a href="../checkers/">Checkers</a> · <a href="../reversi/">Reversi</a>'), BOARD_JS, 'free')
def ludo_body():
    return """<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Your record</p><span class="big" id="clvname">Club</span><span class="small" id="crec">0 won · 0 lost</span></div>
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small"><li>Roll the dice. A 6 brings a token out of the base and gives you another roll.</li><li>Move a token the number shown. Tap one of the glowing tokens.</li><li>Land on an enemy token to send it back to base. Star squares and start squares are safe.</li><li>Walk all the way round, then into your coloured lane. You need the exact number to get home. First to bring all 4 tokens home wins.</li></ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Ludo</b></p>
    <div class="ghead"><div><h1>Ludo</h1><p class="sub">2 to 4 players · computer or friends on one device</p></div></div>
    <div class="cchips"><div class="mlevel" role="group" aria-label="Players"><button type="button" data-lp="2" aria-pressed="false">2 players</button><button type="button" data-lp="3" aria-pressed="false">3 players</button><button type="button" data-lp="4" aria-pressed="true">4 players</button></div>
      <div class="mlevel" role="group" aria-label="Mode"><button type="button" data-lm="cpu" aria-pressed="true">Me vs computers</button><button type="button" data-lm="all" aria-pressed="false">All human</button></div>
      <div class="mlevel" id="llevels" role="group" aria-label="Computer level"><button type="button" data-ll="1" aria-pressed="false">Beginner</button><button type="button" data-ll="2" aria-pressed="false">Casual</button><button type="button" data-ll="3" aria-pressed="true">Club</button><button type="button" data-ll="4" aria-pressed="false">Expert</button></div></div>
    <div class="chbox"><div class="ldb" id="ldb" role="application" aria-label="Ludo board"></div></div>
    <div class="lctl"><button type="button" class="ldie" id="ldie" aria-label="Dice">·</button><button type="button" class="pbtn go" id="lroll">Roll the dice</button></div>
    <p class="cturn" id="lturn" aria-live="polite"></p>
    <div class="lhome" id="lhome"></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="newgame">New game</button></div>
    <div class="done" id="done"><p class="eyeb" id="deyebrow">Game over</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">New game</button><a class="pbtn" href="../play/">All of Play</a></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../chess/">Chess</a> · <a href="../connect-four/">Connect Four</a> · <a href="../reversi/">Reversi</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About Ludo</h2>
  <p>Ludo is a race game for two to four players. Each player has four tokens that start in the base. A 6 brings a token onto the track and gives another roll; three 6s in a row lose the turn. Tokens travel once around the board and then up their own coloured lane. A token needs the exact number to reach home.</p>
  <p>Play against computers at four levels, or pass the device between friends. The dice use your browser's secure random generator, and nothing is sent anywhere. Your game stays in this browser.</p>
</section>
</div>"""
PAGES['ludo'] = ('Ludo - Free Online, 2 to 4 Players | Dilia Play', 'Free Ludo for 2 to 4 players. Play computers at four levels, or friends on one device. Fair dice, saved game. No ads, no sign-up.', ludo_body(), GAME_JS + '<script src="../assets/ludo.js"></script><script src="../assets/ludo-game.js"></script>', 'free')
def mini_body(slug, title, sub, meters, best, howto, about, tools, stage, btns='', more=''):
    how = ''.join(f'<li>{h}</li>' for h in howto)
    ms = ''.join(f'<div><small>{lab}</small><b id="{i}">{v}</b></div>' for i, lab, v in meters)
    bl = f'<div class="gcard"><p class="eyeb">{best[1]}</p><span class="big" id="{best[0]}">–</span></div>'
    return f"""<div class="wrap">
<div class="gwrap">
  <div class="gside">
    {bl}
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small">{how}</ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div><div class="meter">{ms}</div></div>
    <div class="cchips">{tools}</div>
    {stage}
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns">{btns}<button type="button" class="pbtn" id="newgame">New game</button></div>
    <div class="done" id="done"><p class="eyeb" id="deyebrow">Done</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">Play again</button><a class="pbtn" href="../play/">All of Play</a></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small">{more or '<a href="../chess/">Chess</a> · <a href="../snake/">Snake</a> · <a href="../daily-sudoku/">Daily sudoku</a>'} · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About {title}</h2>
  {about}
  <p>Your scores stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""
def grp(label, attr, items, on=None):
    return f'<div class="mlevel" role="group" aria-label="{label}">' + ''.join(f'<button type="button" data-{attr}="{k}" aria-pressed="{"true" if k == on else "false"}">{t}</button>' for k, t in items) + '</div>'
MJS = GAME_JS + '<script src="../assets/mini.js"></script>'
PAGES['brick-breaker'] = ('Brick Breaker - Free Online Breakout Game | Dilia Play', 'Free brick breaker. Steer the paddle, break every brick, survive three lives. Mouse, touch or keys. No ads, no sign-up.',
    mini_body('brick', 'Brick breaker', 'Break every brick, keep the ball alive', [('bscore', 'SCORE', 0), ('blives', 'LIVES', 3), ('blevel', 'LEVEL', 1)], ('bbest', 'Best score'),
      ['Move the mouse, drag on a phone, or use the arrow keys to steer the paddle.', 'Tap or press Space to launch the ball.', 'Hit the ball with the edge of the paddle to change its angle.', 'Clear all bricks to reach the next level. It gets faster. Lose the ball three times and the game ends.'],
      '<p>A classic breakout game. The ball speeds up with each level and from level 3 some bricks need two hits. The best score is kept in this browser.</p>', '', '<canvas class="mcv" id="bbc" role="img" aria-label="Brick breaker playfield"></canvas>'), MJS + '<script src="../assets/brick-game.js"></script>', 'free')
PAGES['pong'] = ('Pong - Play the Computer Free Online | Dilia Play', 'Free Pong against the computer at three levels. First to 7 wins. Mouse, touch or keys. No ads, no sign-up.',
    mini_body('pong', 'Pong', 'First to 7 points wins', [('pme', 'YOU', 0), ('pcpu', 'COMPUTER', 0)], ('pbest', 'Your record'),
      ['Move the mouse, drag, or use W and S (or the arrow keys) to move your paddle.', 'Tap or press Space to serve.', 'Hit the ball with the paddle edge to send it at a sharper angle. It speeds up every hit.', 'First to 7 wins. Pick Easy, Medium or Hard.'],
      '<p>The original two-paddle game. Easy gives you time to react, Hard moves fast and rarely misses until the ball gets quick.</p>', grp('Level', 'pl', [(1, 'Easy'), (2, 'Medium'), (3, 'Hard')], 2), '<canvas class="mcv wide" id="pgc" role="img" aria-label="Pong court"></canvas>'), MJS + '<script src="../assets/pong-game.js"></script>', 'free')
PAGES['aim-trainer'] = ('Aim Trainer - Test Your Click Speed and Accuracy | Dilia Play', 'Free aim trainer. Hit as many targets as you can in 30 seconds and see your accuracy and speed. No ads, no sign-up.',
    mini_body('aim', 'Aim trainer', 'Hit as many targets as you can in 30 seconds', [('ahits', 'HITS', 0), ('atime', 'TIME', 30)], ('abest', 'Best hits'),
      ['Press Start.', 'Tap or click each target as soon as it appears. Only one shows at a time.', 'Targets shrink as you hit them. Missing a target counts against your accuracy.', 'After 30 seconds you see hits, accuracy and average time per target.'],
      '<p>Aim trainers measure how fast and precisely you can point. Your result is hits in 30 seconds, plus accuracy and average reaction time per target. Targets shrink a little with every hit.</p>', '', '<div class="aimst" id="aim"><button type="button" class="pbtn go astart" id="astart">Start</button></div>'), MJS + '<script src="../assets/aim-game.js"></script>', 'free')
PAGES['nonogram'] = ('Nonogram (Picross) - Free Logic Puzzles | Dilia Play', 'Free nonogram puzzles in four sizes. Every puzzle can be solved by logic alone, no guessing. No ads, no sign-up.',
    mini_body('nonogram', 'Nonogram', 'Fill the squares that the numbers describe', [('ntime', 'TIME', '0:00'), ('nfilled', 'FILLED', '0')], ('nbest', 'Best time (this size)'),
      ['The numbers beside a row or column tell the lengths of the runs of filled squares, in order.', 'Tap or drag to fill squares. Switch to the X tool to mark squares you know are empty (key: X).', 'A clue fades when its line matches.', 'Every puzzle can be solved with logic alone.'],
      '<p>Nonograms, also called Picross, hide a small picture. Each clue number is a run of filled squares in that row or column, with at least one gap between runs. Every puzzle here is generated and checked so a solver using only line logic can finish it, so you never need to guess.</p>',
      grp('Size', 'ns', [(5, '5×5'), (8, '8×8'), (10, '10×10'), (12, '12×12')], 8) + grp('Tool', 'nm', [(1, 'Fill'), (2, 'X mark')], 1), '<div class="nng" id="nng"></div>', '<button type="button" class="pbtn" id="nclear">Clear</button>'), MJS + '<script src="../assets/puzzles.js"></script><script src="../assets/nonogram-game.js"></script>', 'free')
PAGES['sliding-puzzle'] = ('Sliding Puzzle - 8, 15 and 24 Puzzle, Free | Dilia Play', 'Free sliding tile puzzle in 3x3, 4x4 and 5x5. Count your moves and beat your best. No ads, no sign-up.',
    mini_body('slide', 'Sliding puzzle', 'Put the tiles in order', [('stime', 'TIME', '0:00'), ('smoves', 'MOVES', 0)], ('sbest', 'Fewest moves (this size)'),
      ['Tap a tile in the same row or column as the blank to slide it. Tiles in between move too.', 'Put the numbers in order from 1, with the blank last.', 'Keys: arrow keys slide tiles into the blank.', 'Every shuffle is solvable.'],
      '<p>The classic 15 puzzle, also in 3×3 (the 8 puzzle) and 5×5. Boards are shuffled by making real moves from the solved position, so they can always be solved. Your fewest moves per size are kept in this browser.</p>', grp('Size', 'sn', [(3, '3×3'), (4, '4×4'), (5, '5×5')], 4), '<div class="slb" id="slb"></div>'), MJS + '<script src="../assets/puzzles.js"></script><script src="../assets/slide-game.js"></script>', 'free')
PAGES['word-search'] = ('Word Search - Free Printable-Free Online Puzzles | Dilia Play', 'Free word search puzzles with six themes. Drag across letters to find the words. No ads, no sign-up.',
    mini_body('wordsearch', 'Word search', 'Find the hidden words', [('wtime', 'TIME', '0:00'), ('wleft', 'LEFT', 0)], ('wbest', 'Best time'),
      ['Drag across letters in a straight line to select a word from the list.', 'Words go across and down. Hard mode also uses diagonals and backwards words.', 'Found words turn green and are crossed off.', 'Pick a theme and a grid size.'],
      '<p>Pick a theme, drag across the letters, and find every word in the list. Easy puzzles hide words left to right, top to bottom and diagonally down; Hard puzzles use all eight directions, including backwards.</p>',
      '<div class="mlevel" id="wtheme" role="group" aria-label="Theme"></div>' + grp('Size', 'wn', [(10, '10×10'), (12, '12×12')], 10) + grp('Directions', 'wh', [(0, 'Easy'), (1, 'Hard')], 0), '<div class="wsg" id="wsg"></div><ul class="wsl" id="wsl"></ul>'), MJS + '<script src="../assets/puzzles.js"></script><script src="../assets/wordsearch-game.js"></script>', 'free')
PAGES['memory-game'] = ('Memory Game - Match the Pairs, Free Online | Dilia Play', 'Free memory card game with three sizes. Flip cards and match pairs in as few moves as you can. No ads, no sign-up.',
    mini_body('memory', 'Memory', 'Find all the matching pairs', [('mtime', 'TIME', '0:00'), ('mmoves', 'MOVES', 0)], ('mbest', 'Fewest moves (this level)'),
      ['Tap a card to flip it, then a second card.', 'If they match, they stay face up. If not, they flip back.', 'Remember where each picture is and clear the board in as few moves as you can.', 'Easy has 6 pairs, Medium 8, Hard 12.'],
      '<p>A card-matching game that exercises short-term memory. A move is one pair of flipped cards. Your fewest moves per level are kept in this browser.</p>', grp('Level', 'ml', [(1, 'Easy'), (2, 'Medium'), (3, 'Hard')], 2), '<div class="mmb" id="mmb"></div>'), MJS + '<script src="../assets/puzzles.js"></script><script src="../assets/memory-game.js"></script>', 'free')
OBJS = MJS + '<script src="../assets/onebtn.js"></script>'
PAGES['stack'] = ('Stack - One-Tap Tower Game, Free Online | Dilia Play', 'Free one-button stacking game. Tap to drop the block, build the tallest tower. No ads, no sign-up.',
    mini_body('stack', 'Stack', 'Tap to drop the block. Build the tallest tower.', [('sscore', 'BLOCKS', 0)], ('sbest', 'Best tower'),
      ['Tap, click or press Space to drop the sliding block.', 'Only the part that lands on the tower stays. The tower gets narrower when you miss.', 'Land a block exactly in line to keep its full width.', 'Miss completely and the tower falls.'],
      '<p>One button, one skill: timing. The block speeds up as the tower grows. Your best tower stays in this browser.</p>', '', '<canvas class="mcv" id="skc" role="img" aria-label="Stack game"></canvas>'), OBJS + '<script src="../assets/stack-game.js"></script>', 'free')
PAGES['dash'] = ('Dash - One-Tap Runner Game, Free Online | Dilia Play', 'Free one-button runner. Tap to jump the blocks and run as far as you can. No ads, no sign-up.',
    mini_body('dash', 'Dash', 'Tap to jump. Run as far as you can.', [('dscore', 'METRES', 0)], ('dbest', 'Best run'),
      ['Tap, click or press Space to jump.', 'Jump over every block. The ground speeds up the longer you run.', 'You cannot jump twice in the air.', 'Hit a block and the run ends.'],
      '<p>A simple endless runner with one control. Your longest run stays in this browser.</p>', '', '<canvas class="mcv wide" id="dsc" role="img" aria-label="Dash game"></canvas>'), OBJS + '<script src="../assets/dash-game.js"></script>', 'free')
PAGES['hop'] = ('Hop - One-Tap Flying Game, Free Online | Dilia Play', 'Free one-button flying game. Tap to flap and glide through the gaps. No ads, no sign-up.',
    mini_body('hop', 'Hop', 'Tap to flap. Fly through the gaps.', [('hscore', 'GAPS', 0)], ('hbest', 'Best score'),
      ['Tap, click or press Space to flap.', 'Gravity pulls you down all the time. Time your taps.', 'Fly through the gap in each green wall for one point.', 'Touch a wall, the ceiling or the ground and it is over.'],
      '<p>A one-button flying game with a fixed, fair gap size. Your best score stays in this browser.</p>', '', '<canvas class="mcv" id="hpc" role="img" aria-label="Hop game"></canvas>'), OBJS + '<script src="../assets/hop-game.js"></script>', 'free')
BGJS = MJS + '<script src="../assets/backgammon.js"></script><script src="../assets/bg-game.js"></script>'
PAGES['backgammon'] = ('Backgammon - Play the Computer or a Friend, Free | Dilia Play', 'Free backgammon against the computer at four levels, or two players on one screen. Full rules, no ads, no sign-up.',
    mini_body('bg', 'Backgammon', 'Race your checkers home and bear them off first', [('bgoff', 'YOU OFF', 0), ('bgoff2', 'THEM OFF', 0)], ('bgrec', 'Won – lost (this level)'),
      ['Press Roll dice. Tap one of your checkers, then tap where it goes.', 'You are pink and move from the top right, round the board, to the bottom right.', 'Hit a lone blue checker to send it to the bar. A checker on the bar must come in first.', 'When all 15 of your checkers are in your home board (bottom right), bear them off. First to bear off all 15 wins.'],
      '<p>Standard backgammon without the doubling cube. Gammons and backgammons are named but score the same as a single win. The computer uses the same dice rules as you. Two-player mode shares one screen.</p>',
      grp('Opponent', 'gm', [('cpu', 'Computer'), ('two', 'Two players')], 'cpu') + '<span id="bglv">' + grp('Level', 'gl', [(1, 'Beginner'), (2, 'Casual'), (3, 'Strong'), (4, 'Expert')], 3) + '</span>',
      '<div class="bgs" id="bgs"></div><div class="bgbar2"><div class="bgdice" id="bgdice" aria-live="polite"></div><button type="button" class="pbtn go" id="bgroll">Roll dice</button></div>'), BGJS, 'free')
PAGES['daily-word'] = ('Daily Word Puzzle - Guess the Five-Letter Word | Dilia Play', 'A new five-letter word every day, the same for everyone. Six guesses, green and yellow clues. Free, no ads, no sign-up.',
    mini_body('word', 'Daily word', 'Guess the five-letter word in six tries', [('wtry', 'GUESS', '1/6')], ('wstreak', 'Current streak'),
      ['Type a five-letter word and press Enter.', 'Green: right letter, right place. Yellow: the letter is in the word, but elsewhere. Grey: not in the word.', 'You have six guesses. A new word arrives every day, the same for everyone.', 'After you finish, practice with as many extra words as you like.'],
      '<p>The daily word comes from our own list of common everyday words, so every answer is a word you know. The word changes at midnight on your device. Your streak is kept in this browser. Any five letters are accepted as a guess, so there is no dictionary rejecting you.</p>', '',
      '<h2 class="vh" id="wtitle">Daily word</h2><div class="wgrid" id="wgrid" role="img" aria-label="Guess grid"></div><div class="wkb" id="wkb"></div>'), MJS + '<script src="../assets/dailyword.js"></script><script src="../assets/word-game.js"></script>', 'free')
PAGES['crossword'] = ('Crossword - Free Online Crossword Puzzles | Dilia Play', 'Free crossword puzzles with our own clues in three sizes. Type letters, check your answers. No ads, no sign-up.',
    mini_body('cross', 'Crossword', 'Fill the grid from the clues', [('cwtime', 'TIME', '0:00'), ('cwfill', 'FILLED', '0')], ('cwbest', 'Best time (this size)'),
      ['Tap a square and type. Tap it again to switch between across and down.', 'Tap a clue to jump to its word.', 'Check marks wrong letters in red. Reveal word fills in the selected word.', 'Pick 6, 9 or 12 words.'],
      '<p>A new puzzle every time, built from our own clue list. Every clue is a short, everyday definition. Best times are kept in this browser.</p>', grp('Size', 'cs', [(6, 'Small'), (9, 'Medium'), (12, 'Large')], 9),
      '<div class="cwgrid" id="cwg"></div><input id="cwin" class="cwin" autocomplete="off" autocapitalize="off" aria-label="Type a letter" inputmode="text"><div class="cwcols"><div><h3>Across</h3><ul id="cwa"></ul></div><div><h3>Down</h3><ul id="cwd"></ul></div></div>', '<button type="button" class="pbtn" id="cwcheck">Check</button><button type="button" class="pbtn" id="cwreveal">Reveal word</button>'), MJS + '<script src="../assets/crossword.js"></script><script src="../assets/crossword-game.js"></script>', 'free')
PAGES['speed-reading'] = ('Speed Reading Trainer - Read Faster, Free | Dilia Play', 'Free speed reading trainer. Words flash one at a time at 200 to 800 words per minute, then three questions check you understood. No ads, no sign-up.',
    mini_body('speed', 'Speed reading', 'Read faster, and check you still understood', [('srwpm', 'WPM', 300), ('srwords', 'WORDS', '–')], ('sbestw', 'Best score at this speed'),
      ['Pick a speed and a text, then press Start.', 'Keep your eyes on the highlighted letter. Words appear one at a time. Tap the words to pause.', 'Answer three questions to see if you understood what you read.', 'You can paste your own text instead. No questions are asked for your own text.'],
      '<p>This is rapid serial visual presentation: one word at a time in the same spot, so your eyes do not have to move. Reading speed with good understanding for most adults is around 200 to 300 words per minute. Very high speeds mostly lose detail, so always check your understanding. Texts are original and written for this page.</p>',
      grp('Speed', 'wpm', [(200, '200'), (300, '300'), (400, '400'), (500, '500'), (700, '700')], 300) + '<label class="srsel">Text <select id="srtext" aria-label="Text"></select></label>',
      '<div class="srbox"><div class="srw" id="srw" aria-live="off"></div><div class="srbar"><i id="srprog"></i></div><textarea id="srown" class="srown" hidden placeholder="Paste or type your text here" rows="5" aria-label="Your own text"></textarea></div><div class="srq" id="srq" hidden></div>', '<button type="button" class="pbtn go" id="srstart">Start</button>'), MJS + '<script src="../assets/speedread-texts.js"></script><script src="../assets/speedread-game.js"></script>', 'free')
PAGES['daily-chess-puzzle'] = ('Daily Chess Puzzle - Mate in Two | Dilia Play', 'A new mate-in-two chess puzzle every day, the same for everyone. Find the one move that forces checkmate. Free, no ads, no sign-up.',
    mini_body('cpuz', 'Daily chess puzzle', 'Find the move that forces checkmate in two', [('cptry', 'WRONG TRIES', 0)], ('cpstreak', 'Current streak'),
      ['Tap a piece, then tap where it goes.', 'Find your move that forces checkmate on the next move, whatever the opponent replies.', 'The opponent then replies, and you play checkmate.', 'Use Hint to see which piece makes the key move. A new puzzle arrives every day.'],
      '<p>Every puzzle is a mate in two with exactly one winning first move, found and checked by computer search with the same rules code as our chess game. Positions come from random games, so they can look unusual. Your streak is kept in this browser.</p>', '',
      '<h2 class="vh" id="cpt">Daily chess puzzle</h2><div class="chbox"><div class="chb" id="cpb" role="application" aria-label="Chess puzzle board"></div></div><p class="cturn" id="cpwho" aria-live="polite"></p>', '<button type="button" class="pbtn" id="cphint">Hint</button><button type="button" class="pbtn" id="cpshow">Show solution</button>'), MJS + '<script src="../assets/chess-core.js"></script><script src="../assets/chess-puzzles.js"></script><script src="../assets/cpuzzle-game.js"></script>', 'free')
def wdb(d, t): return f'<button type="button" data-wd="{d}" aria-pressed="false">{t}</button>'
HOLPLAN = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Holiday planner</b></p>
<h1>Holiday planner</h1><p class="lsub">Turn your leave days into the longest breaks of the year.</p>
<div class="lglass lxctl">
  <div class="lrow"><label class="f">Country<select id="hpc"></select></label><label class="f">Year<select id="hpy"></select></label><label class="f">Home country (optional)<select id="hph"></select></label></div>
  <div><label class="f" for="hpl">Leave days you can take</label><div class="lslide"><input type="range" id="hpl" min="0" max="40" value="10" aria-label="Leave days"><b id="hplv">10</b></div></div>
  <div class="lseg" role="group" aria-label="Weekend days"><span class="t">Weekend</span>""" + ''.join(wdb(d, t) for d, t in [(1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri'),(6,'Sat'),(0,'Sun')]) + """<button type="button" class="p" data-wp="6.0">Sat + Sun</button><button type="button" class="p" data-wp="5.6">Fri + Sat</button><button type="button" class="p" data-wp="5">Fri only</button></div>
  <div class="lseg" role="group" aria-label="Plan style"><span class="t">Plan style</span><button type="button" data-hs="1" aria-pressed="false">One long break</button><button type="button" data-hs="2" aria-pressed="true">A few breaks</button><button type="button" data-hs="3" aria-pressed="false">Many short breaks</button></div>
</div>
<p class="lglass ldet" id="hpwarn" role="status" hidden style="border-color:#ffc93c;color:#ffe7a6"></p>
<div class="lhero" aria-live="polite"><div class="k" id="hxk">NEXT DAY OFF</div><div class="n" id="hxn">Loading holidays…</div><div class="d" id="hxd"></div><div class="lcd" id="hxcd"></div><div class="lstats" id="hpsum"></div></div>
<h2 id="hptitle">Your year</h2><p class="lnote">Swipe sideways through the year. Tap a capsule to see the dates.</p>
<div class="lkey"><span><i style="background:#ff2d95"></i>Public holiday</span><span><i style="background:#2fe08a"></i>Take leave</span><span><i style="background:#2b3560"></i>Weekend</span><span><i style="background:linear-gradient(90deg,#2fe08a,#29c6ff)"></i>Your break</span><span><i style="background:#ff7ac2"></i>Long weekend, no leave</span><span><i style="background:#ffc93c"></i>Home holiday</span></div>
<div class="lriver" id="hpriver" tabindex="0" aria-label="Year timeline"><div class="lrv" id="hprv"></div></div>
<div class="lglass ldet" id="hpdet"><p>Tap a capsule above, a ticket or a day below.</p></div>
<h2>Your boarding passes</h2><p class="lnote">The best plan for your leave days. Each ticket is one break.</p>
<div class="ltix" id="hpplan"></div>
<h2>Best value breaks</h2><p class="lnote">Single breaks ranked by days off for each leave day.</p>
<div class="lbest" id="hpbest"></div>
<h2>The whole year</h2>
<div class="lholo"><div class="lhg" id="hpcal"></div></div>
<p class="lnote" id="hpnote" hidden>Days marked "may shift" follow the moon (such as Eid) and are confirmed late. Check the official announcement.</p>
<div class="lact"><button type="button" class="go" id="hpics">Add to calendar (.ics)</button><button type="button" id="hpprint">Print the year</button><button type="button" id="hpcopy">Copy share link</button><span id="hpcopymsg" role="status"></span></div>
</div></section>
<div class="wrap"><section class="gtext">
  <h2>How the planner works</h2>
  <p>It finds the work days to take as leave so that, together with weekends and public holidays, they make the longest breaks. "One long break" puts your leave into the biggest single trip; "many short breaks" spreads it into long weekends. Pick your own weekend days: many countries in the Gulf use Friday and Saturday, and some use only Friday.</p>
  <p>Holidays are national only, 2024 to 2035, from the open-source Vacanza holidays library (MIT licence). Regional, school and private-sector holidays can differ. A holiday that falls on a weekend is not moved here; some countries give a day off instead. Weekend defaults by country are a starting point.</p>
  <p>Nothing you type leaves this device. The share link keeps your choices after the # sign, which is never sent to a server.</p>
</section></div>"""
PHOL = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Public holidays</b></p>
<h1>Public holidays</h1><p class="lsub">Every country, 2024 to 2035. See what is next, spot the long weekends, compare two countries.</p>
<div class="lglass lxctl"><div class="lrow"><label class="f">Country<select id="phc"></select></label><label class="f">Year<select id="phy"></select></label><label class="f">Compare with (optional)<select id="phx"></select></label></div></div>
<p class="lglass ldet" id="phwarn" role="status" hidden style="border-color:#ffc93c;color:#ffe7a6"></p>
<div class="lhero" aria-live="polite"><div class="k" id="phk">NEXT PUBLIC HOLIDAY</div><div class="n" id="phn">Loading holidays…</div><div class="d" id="phd"></div><div class="lcd" id="phcd"></div><div class="lstats" id="phsum"></div></div>
<h2 id="phtitle">The year</h2><p class="lnote">Swipe sideways. Pink capsules are holidays, light pink ones are long weekends that need no leave.</p>
<div class="lkey"><span><i style="background:#ff2d95"></i>Public holiday</span><span><i style="background:#2b3560"></i>Weekend</span><span><i style="background:#ff7ac2"></i>Long weekend</span><span><i style="background:#ffc93c"></i>Holiday in the compared country</span></div>
<div class="lriver" id="phriver" tabindex="0" aria-label="Year timeline"><div class="lrv" id="phrv"></div></div>
<div class="lglass ldet" id="phdet"><p>Tap a holiday to see the details.</p></div>
<div id="phlist"></div>
<div class="lact"><a class="lbtn" id="phplan" href="../holiday-planner/">Plan your leave around these →</a><button type="button" class="go" id="phics">Add to calendar (.ics)</button><button type="button" id="phcsv">Download CSV</button><button type="button" id="phcopy">Copy share link</button><span id="phcopymsg" role="status"></span></div>
<p class="lnote" id="phnote" style="margin-top:16px"></p>
</div></section>
<div class="wrap"><section class="gtext">
  <h2>About these holidays</h2>
  <p>These are national (country-wide) public holidays from the open-source Vacanza holidays library. Regional, state, school and private-sector holidays can differ, and governments sometimes add or move a day at short notice.</p>
  <p>Holidays that follow the moon, such as Eid, are marked "may shift": the official date is announced close to the day. Long weekends count a holiday joined to the weekend into three or more days off in a row, using that country's usual weekend days.</p>
  <p>Nothing you choose leaves this device. Downloads are made in your browser.</p>
</section></div>"""
LIFEHUB = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx lhub"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <b>Life</b></p>
<h1>Your days, your year,<br>your plans.</h1><p class="lsub">Holidays, time and dates for every country. Everything runs on your device.</p>
<div class="lhgrid">
  <div class="lglass lhclock"><div class="k">RIGHT NOW</div><div class="tm" id="lhtime">--:--:--</div><div class="dt" id="lhdate"></div><div class="lnote" id="lhmeta"></div><div class="yb"><i id="lhbar"></i></div><div class="lnote" id="lhpct"></div></div>
  <div class="lhero lhnext"><div class="k">NEXT PUBLIC HOLIDAY IN <select id="lhc" aria-label="Country"></select></div><div class="n" id="lhhn">Loading…</div><div class="d" id="lhhd"></div><div class="lcd" id="lhcd"></div><a class="lbtn" id="lhall" href="../public-holidays/">See every holiday →</a></div>
</div>
<h2>Open a tool</h2>
<div class="lhportals">""" + '<a class="lhp wide" href="../holiday-planner/" style="--a:#29c6ff"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v13H4zM4 10h16M9 3v4M15 3v4M8 14h3v3H8z"/></svg></span><b>Holiday planner</b><span>Turn leave days into the longest breaks</span><i>Open →</i></a><a class="lhp wide" href="../public-holidays/" style="--a:#ff2d95"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg></span><b>Public holidays</b><span>Every country, next-holiday countdown</span><i>Open →</i></a><a class="lhp" href="../world-clock/" style="--a:#ffd84a"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg></span><b>World clock</b><span>Live time in your cities</span><i>Open →</i></a><a class="lhp" href="../countdown-timer/" style="--a:#ff9f1c"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2M9 2h6M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/></svg></span><b>Countdown timer</b><span>Several timers, keeps running</span><i>Open →</i></a><a class="lhp" href="../stopwatch/" style="--a:#2fe08a"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5l3 2M10 2h4M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/></svg></span><b>Stopwatch</b><span>Laps, fastest and slowest</span><i>Open →</i></a><a class="lhp" href="../day-night-map/" style="--a:#a08bff"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18V3zM12 3a9 9 0 0 1 0 18"/></svg></span><b>Day and night map</b><span>Where the sun is right now</span><i>Open →</i></a><a class="lhp" href="../todays-date-calendars/" style="--a:#ff2d95"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v13H4zM4 10h16M8 3v4M16 3v4M8 14h3"/></svg></span><b>Today in 12 calendars</b><span>Hijri, Hebrew, Chinese and more</span><i>Open →</i></a><a class="lhp" href="../team-leave-planner/" style="--a:#29c6ff"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M17 10a2.5 2.5 0 1 0 0-5M18 14c2 .4 3 2 3 4"/></svg></span><b>Team leave planner</b><span>Who is off, and when too few are in</span><i>Open →</i></a><a class="lhp" href="../printable-year-planner/" style="--a:#ff9f1c"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/></svg></span><b>Printable year planner</b><span>Wall calendar with holidays</span><i>Open →</i></a><a class="lhp" href="../trip-booklet/" style="--a:#7a5cff"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6"/></svg></span><b>Trip booklet</b><span>Printable itinerary and bookings</span><i>Open →</i></a><a class="lhp" href="../packing-list/" style="--a:#2fe08a"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 7h14v13H5zM9 12l2 2 4-4"/></svg></span><b>Packing list</b><span>Tick off what you pack</span><i>Open →</i></a><a class="lhp" href="../document-expiry/" style="--a:#ff5c7a"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4"/></svg></span><b>Document wallet</b><span>Passport and ID expiry alerts</span><i>Open →</i></a><a class="lhp" href="../meeting-planner/" style="--a:#2fe08a"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v13H4zM4 10h16M8 14h2M12 14h2M16 14h0"/></svg></span><b>Meeting planner</b><span>Hours that suit every city</span><i>Open →</i></a><a class="lhp" href="../festival-calendar/" style="--a:#ff9f1c"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2 5 5 .5-4 3.5 1.2 5L12 14.5 7.8 17l1.2-5-4-3.5 5-.5z"/></svg></span><b>Festival calendar</b><span>Eid, Diwali, Easter and more, with countdowns</span><i>Open →</i></a><a class="lhp" href="../trip-planner/" style="--a:#ff2d95"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12l7-2 4-7 2 1-2 7 6 2v2l-6-1-3 6h-2l1-6-6 1z"/></svg></span><b>Trip planner</b><span>Every day of your trip, saved on your device</span><i>Open →</i></a><a class="lhp" href="../flight-time/" style="--a:#29c6ff"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2M3 20l4-4"/></svg></span><b>Flight time and jet lag</b><span>Local arrival, layover, jet-lag plan</span><i>Open →</i></a><a class="lhp" href="../country-card/" style="--a:#7a5cff"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h11l3 3v15H5zM9 9h6M9 13h6M9 17h3"/></svg></span><b>Country card</b><span>Time, currency, calling code, weekend</span><i>Open →</i></a><a class="lhp" href="../time-zone-converter/" style="--a:#7a5cff"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2"/></svg></span><b>Time zone converter</b><span>Any city, any time</span><i>Open →</i></a><a class="lhp" href="../working-days-calculator/" style="--a:#2fe08a"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4zM9 7V5h6v2M4 12h16"/></svg></span><b>Working days</b><span>Business days between two dates</span><i>Open →</i></a><a class="lhp" href="../date-difference-calculator/" style="--a:#ffc93c"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M5 12l4-4M5 12l4 4M19 12l-4-4M19 12l-4 4"/></svg></span><b>Date difference</b><span>Days, weeks and months between dates</span><i>Open →</i></a><a class="lhp" href="../age-calculator/" style="--a:#ff7ac2"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M7 9h10v10H7zM7 13h10"/></svg></span><b>Age calculator</b><span>Exact age in years, months, days</span><i>Open →</i></a><a class="lhp" href="../add-days-to-date/" style="--a:#29c6ff"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v13H4zM12 10v6M9 13h6"/></svg></span><b>Add days to a date</b><span>Deadlines and due dates</span><i>Open →</i></a><a class="lhp" href="../day-of-the-week-calculator/" style="--a:#9fdcff"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v13H4zM8 11h2M12 11h2M16 11h0M8 15h2"/></svg></span><b>Day of the week</b><span>Which day any date falls on</span><i>Open →</i></a><a class="lhp" href="../uae-gratuity-calculator/" style="--a:#2fe08a"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg></span><b>UAE gratuity</b><span>End-of-service pay, with the law article</span><i>Open →</i></a>' + """</div>
<h2>Being built</h2><p class="lnote">Each part goes live as soon as it is tested.</p>
<ol class="lroad">""" + '<li><b>Trip planner</b><span>Emergency numbers and plugs on the country card · Where can I go?</span></li><li><b>Money for trips</b><span>Trip budget · Multi-currency wallet · Group expense split</span></li><li><b>Memories & maps</b><span>Scratch world map · Photo trip map · 3D flight globe</span></li><li><b>Life goals</b><span>Life in weeks · Goal planner · Habit tracker</span></li><li><b>Life events</b><span>Wedding planner · Moving abroad · Birthdays and anniversaries</span></li>' + """</ol>
</div></section>"""
PAGES['life'] = ('Life: holidays, time and trips | Dilia', 'Holiday planner, public holidays for 249 countries with a live countdown, time zones, date and work-day calculators. Trip planner and life goals coming. Free, no sign-up.', LIFEHUB, '<script src="../assets/holidayplan.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/life-hub.js"></script>', 'life')
def lc_body(mode, slug, title, sub, ctl, about):
    return f"""<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="{mode}"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>{title}</b></p>
<h1>{title}</h1><p class="lsub">{sub}</p>
<div class="lcgrid"><div class="lglass lxctl">{ctl}</div><div class="lhero lcres" id="lcres" aria-live="polite"><div class="n">Working…</div></div></div>
<div class="lglass lcviz" id="lcviz"></div>
<div class="lact"><a class="lbtn" href="../life/">← All Life tools</a><a class="lbtn" href="../holiday-planner/">Holiday planner</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2>{about}<p>Everything is worked out in your browser. Nothing you type is sent anywhere.</p></section></div>"""
def lf(i, label, t='date', extra=''): return f'<label class="f">{label}<input id="{i}" type="{t}"{extra}></label>'
LCJS = '<script src="../assets/calcmath.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/lifecalc.js"></script>'
DT = ' min="1000-01-01" max="9999-12-31"'
LCP = [
 ('dd','date-difference-calculator','Date difference','Years, months, weeks and days between two dates.','<div class="lrow">'+lf('d1','From',extra=DT)+lf('d2','To',extra=DT)+'</div>','<p>The result counts the days after the first date up to and including the second, so 1 January to 2 January is one day. If the first date is later, the dates are swapped. Months are counted on the calendar, so 31 January to 28 February is 28 days.</p>','Date Difference Calculator - Days Between Two Dates | Dilia Life','Free date difference calculator: years, months, weeks and days between two dates, on a glowing timeline. Private, in your browser.'),
 ('dadd','add-days-to-date','Add days to a date','Add or take away days, weeks, months and years.','<div class="lrow">'+lf('d1','Start date',extra=DT)+'</div><div class="lseg" role="group" aria-label="Add or subtract"><span class="t">I want to</span><button type="button" data-op="+" aria-pressed="true">Add</button><button type="button" data-op="-" aria-pressed="false">Subtract</button><span id="lcop" data-v="+" hidden></span></div><div class="lrow">'+lf('ny','Years','text',' inputmode="numeric" value="0"')+lf('nm','Months','text',' inputmode="numeric" value="0"')+lf('nw','Weeks','text',' inputmode="numeric" value="0"')+lf('nd','Days','text',' inputmode="numeric" value="30"')+'</div>','<p>Months and years are added first, then weeks and days. When the day does not exist in the new month, the last day of that month is used: 31 January plus one month is 28 February (29 in a leap year).</p>','Add Days to a Date - Date Calculator | Dilia Life','Free date calculator: add or subtract days, weeks, months and years from any date. Private, in your browser.'),
 ('dage','age-calculator','Age calculator','Exact age, your life in weeks, and a countdown to your next birthday.','<div class="lrow">'+lf('d1','Date of birth',extra=DT)+lf('d2','Age on',extra=DT)+'</div>','<p>Age is counted in full years, then full months, then days. Someone born on 29 February is counted as having a birthday on 28 February in years that are not leap years. The life-in-weeks grid shows 90 years of 52 weeks; each tenth year is marked in pink.</p>','Age Calculator - Exact Age, Life in Weeks | Dilia Life','Free age calculator: exact age in years, months and days, weeks lived, life-in-weeks grid and next-birthday countdown. Private, in your browser.'),
 ('dwk','day-of-the-week-calculator','Day of the week','Which weekday any date falls on, with the week number.','<div class="lrow">'+lf('d1','Date',extra=DT)+'</div>','<p>Week numbers follow ISO 8601: weeks start on Monday and week 1 is the week with the year\'s first Thursday, so the first days of January can belong to the last week of the year before.</p>','Day of the Week Calculator - Any Date, Week Number | Dilia Life','Free day of the week calculator with day of the year, ISO week number and a glowing month view. Private, in your browser.'),
 ('dwork','working-days-calculator','Working days','Count working days between two dates, with your weekend and public holidays.','<div class="lrow">'+lf('d1','From (counted)',extra=DT)+lf('d2','To (counted)',extra=DT)+'</div><div class="lseg" role="group" aria-label="Weekend days"><span class="t">Weekend</span>'+''.join(f'<button type="button" data-wd="{d}" aria-pressed="false">{t}</button>' for d,t in [(1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri'),(6,'Sat'),(0,'Sun')])+'<button type="button" class="p" data-wp="6.0">Sat + Sun</button><button type="button" class="p" data-wp="5.6">Fri + Sat</button><button type="button" class="p" data-wp="5">Fri only</button><button type="button" class="p" data-wp="">No weekend</button></div><div class="lrow"><label class="f">Skip public holidays of<select id="lccc"><option value="">No holidays</option></select></label></div>','<p>Both dates are counted. Weekend days are never counted, and public holidays that fall on a working day are skipped when you pick a country. Holidays are national only, from the open-source Vacanza holidays library (MIT licence), 2024 to 2035.</p>','Working Days Calculator - Business Days Between Dates | Dilia Life','Free working days calculator: your own weekend days, public holidays for 249 countries, month calendars. Private, in your browser.'),
 ('dtz','time-zone-converter','Time zone converter','Convert a time between cities and find the best hours to meet.','<div class="lrow">'+lf('lcwhen','Date and time','datetime-local')+'</div><div id="lczones" class="lxzones"></div><div class="lbtnrow"><button type="button" id="lcadd">+ Add a city</button><button type="button" id="lcnow">Now</button></div>','<p>Times use the time zone rules built into your browser, including daylight saving. When clocks move forward, some times do not exist; when they move back, a time can happen twice. Both cases are shown. Work hours are taken as 09:00 to 18:00 local time.</p>','Time Zone Converter and Meeting Planner | Dilia Life','Free time zone converter: compare up to 8 cities, drag through the day on day/night strips and find the best meeting hours. Daylight saving included. Private.'),
 ('grat','uae-gratuity-calculator','UAE gratuity','End-of-service gratuity for the UAE private sector.','<div class="lrow">'+lf('basic','Last monthly basic salary','text',' inputmode="decimal" value="10000"')+'<label class="f">Currency<select id="cur"><option value="AED" selected>AED</option><option value="">No currency</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="LKR">LKR</option><option value="INR">INR</option><option value="PKR">PKR</option></select></label></div><div class="lrow">'+lf('d1','First day of work',extra=DT)+lf('d2','Last day of work',extra=DT)+lf('unp','Unpaid leave days','text',' inputmode="numeric" value="0"')+'</div>','<p>For full-time, non-UAE national staff of mainland private companies, under Federal Decree-Law 33 of 2021 (Article 51): 21 days of basic pay for each of the first five years, 30 days for each year after, part years in proportion, at least one year of service, and a total of no more than two years of basic pay. Basic salary only, no allowances. Daily wage is the monthly basic divided by 30. UAE nationals follow the pension system, and free zones such as DIFC and ADGM have their own rules. This is an estimate, not legal advice.</p>','UAE Gratuity Calculator - End of Service (2021 Law) | Dilia Life','Free UAE end-of-service gratuity calculator under Federal Decree-Law 33 of 2021: 21 and 30 day rule, 2-year cap, visual breakdown. Private, in your browser.'),
]
for mode, slug, title, sub, ctl, about, tt, dd in LCP:
    PAGES[slug] = (tt, dd, lc_body(mode, slug, title, sub, ctl, about), LCJS, 'life')
CLOCKJS = '<script src="../assets/calcmath.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/cities.js"></script><script src="../assets/clock-ui.js"></script>'
WCLOCK = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="clock"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>World clock</b></p>
<h1>World clock</h1><p class="lsub">Live time in your cities, with day and night, weekends and public holidays.</p>
<div class="lhero"><div class="k">YOUR TIME</div><div class="wcbig" id="wctime">--:--:--</div><div class="d" id="wcdate"></div></div>
<div class="lglass lxctl" style="margin-top:16px"><div class="cpick"><select id="cadd" aria-label="Add a city"></select><a class="lbtn" id="wcmeet" href="../meeting-planner/" style="display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:999px;border:1px solid #29c6ff66;background:#29c6ff1a;color:#bfefff;font-weight:700;text-decoration:none">Plan a meeting with these cities →</a></div></div>
<div class="wcgrid" id="wccards"></div>
<p class="lnote" style="margin-top:14px">The sun moves round each card through the day. Weekends follow each country's usual weekend; holidays are national public holidays.</p>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>Times come from the time zone rules built into your browser, including daylight saving. Your list of cities is kept in this browser and in the page address, so you can bookmark or share it. Work hours are taken as 09:00 to 18:00.</p></section></div>"""
MEET = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="meet"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Meeting planner</b></p>
<h1>Meeting planner</h1><p class="lsub">Find the hours when everyone is at work, skipping each country's weekend and public holidays.</p>
<div class="lglass lxctl"><div class="cpick" id="cchips"></div><div class="cpick"><select id="cadd" aria-label="Add a city"></select></div>
  <div class="lrow"><label class="f">Start date<input id="mpd" type="date" min="2024-01-01" max="2035-12-31"></label><label class="f">Days<select id="mpn"><option value="5">5</option><option value="7" selected>7</option><option value="14">14</option></select></label><label class="f">Work day starts<select id="mph0"></select></label><label class="f">Work day ends<select id="mph1"></select></label></div></div>
<div class="lhero"><div class="k">HOURS IN THE FIRST CITY'S TIME</div><div class="lstats" id="mpsum"></div></div>
<h2>Every hour, every day</h2><p class="lnote">Green: everyone is free. Blue: some are free, brighter means more. Tap an hour to see each city.</p>
<div class="lglass lcviz mpwrap"><div class="mpgrid" id="mpgrid"></div></div>
<div class="lglass ldet" id="mpdet"><p>Tap an hour to see each city.</p></div>
<h2>Best hours</h2><ol class="mpbest" id="mpbest"></ol>
<div class="lact"><button type="button" class="go" id="mpcopy">Copy best hours</button><span id="mpcopymsg" role="status"></span><a class="lbtn" href="../world-clock/">World clock</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>Each hour is checked for every city: it must fall inside the work hours you set, not on that country's weekend, and not on a national public holiday there (data from the open-source Vacanza holidays library, 2024 to 2035). Hours are shown in the first city's local time; daylight saving is included.</p></section></div>"""
FEST = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Festival calendar</b></p>
<h1>Festival calendar</h1><p class="lsub">Ramadan, Eid, Diwali, Chinese New Year, Easter, Christmas, Vesak, Hanukkah and more, with countdowns.</p>
<div class="lglass lxctl"><div class="lrow"><label class="f">Year<select id="fsy"></select></label></div><div class="lseg ftr" id="fstr" role="group" aria-label="Traditions"></div></div>
<div class="lhero" aria-live="polite"><div class="k" id="fsk">NEXT FESTIVAL</div><div class="n" id="fsn">Loading…</div><div class="d" id="fsd"></div><div class="lcd" id="fscd"></div></div>
<h2>The year</h2><p class="lnote">Swipe sideways. Each colour is a tradition.</p>
<div class="lriver" id="fsriver" tabindex="0" aria-label="Year timeline"><div class="lrv" id="fsrv"></div></div>
<div class="lglass ldet" id="fsdet"><p>Tap a festival to see the details.</p></div>
<h2>All festivals</h2><div class="phgrid" id="fslist"></div>
<div class="lact"><button type="button" class="go" id="fsics">Add to calendar (.ics)</button><a class="lbtn" href="../public-holidays/">Public holidays by country</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How the dates are found</h2><p>Islamic dates (Ramadan, Eid al-Fitr, Eid al-Adha, Islamic New Year, the Prophet's Birthday) are calculated from the Umm al-Qura calendar built into your browser. The real date depends on moon sighting and can differ by a day or two between countries, so they are marked "expected". Jewish festivals come from the Hebrew calendar and begin at sunset the evening before. Easter is calculated with the standard church formula. Diwali, Holi, Vesak, Songkran and the Chinese festivals come from the national holiday data of India, Singapore, Thailand and China (Vacanza holidays library, MIT licence).</p></section></div>"""
TIMERJS = '<script src="../assets/timer-ui.js"></script>'
TIMER = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="timer"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Countdown timer</b></p>
<h1>Countdown timer</h1><p class="lsub">Run several timers at once. They keep counting if you close the tab or reload.</p>
<div class="lglass lxctl"><div class="lseg" role="group" aria-label="Presets"><button type="button" data-min="1">1 min</button><button type="button" data-min="5">5 min</button><button type="button" data-min="10">10 min</button><button type="button" data-min="15">15 min</button><button type="button" data-min="25" data-label="Focus 25">Focus 25</button><button type="button" data-min="5" data-label="Break 5">Break 5</button><button type="button" data-min="45">45 min</button><button type="button" data-min="60">1 hour</button></div>
<div class="lrow"><label class="f">Hours<input id="tmh" type="number" min="0" max="99" value="0" inputmode="numeric"></label><label class="f">Minutes<input id="tmm" type="number" min="0" max="59" value="10" inputmode="numeric"></label><label class="f">Seconds<input id="tms" type="number" min="0" max="59" value="0" inputmode="numeric"></label><label class="f">Name (optional)<input id="tmname" type="text" maxlength="40" placeholder="Tea, laundry, meeting"></label></div>
<div class="lact" style="margin:0"><button type="button" class="go" id="tmadd">Add timer</button><span id="tmmsg" role="status"></span></div></div>
<div class="lact"><button type="button" class="go" id="tmstop" hidden>Stop the alarm</button></div>
<div class="tmgrid" id="tmlist" aria-live="polite"></div>
<div class="lact"><button type="button" id="tmclear">Remove all timers</button><a class="lbtn" href="../stopwatch/">Stopwatch</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>Each timer stores the moment it will end, so it stays correct when the tab sleeps, the phone locks or the page reloads. When a timer ends you hear a short alarm (made in your browser, no sound file) and the phone vibrates if it can. Browsers only play sound after you have tapped something on the page, so start the timer yourself rather than relying on an old tab. The soonest timer also shows in the tab title.</p><p>Your timers are kept in this browser only. Nothing is sent anywhere.</p></section></div>"""
STOPW = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="stopwatch"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Stopwatch</b></p>
<h1>Stopwatch</h1><p class="lsub">Start, stop and record laps. It keeps running if you reload the page.</p>
<div class="lhero"><div class="k">ELAPSED</div><div class="wcbig" id="swtime" role="timer">00:00.00</div>
<div class="lact"><button type="button" class="go" id="swgo">Start</button><button type="button" id="swlap" disabled>Lap</button><button type="button" id="swreset" disabled>Reset</button></div></div>
<h2>Laps</h2><div class="lglass lcviz swlaps" id="swlaps"></div>
<div class="lact"><button type="button" id="swcopy" disabled>Copy laps</button><button type="button" id="swcsv" disabled>Download CSV</button><span id="swmsg" role="status"></span><a class="lbtn" href="../countdown-timer/">Countdown timer</a></div>
<p class="lnote">Keyboard: Space starts or stops, L records a lap.</p>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>The stopwatch stores the time it started and adds up each run, so the reading stays right when the tab sleeps or reloads. The fastest lap is marked green and the slowest red. Laps stay in this browser only.</p></section></div>"""
PAGES['countdown-timer'] = ('Countdown Timer - Several Timers, Keeps Running | Dilia Life', 'Free online countdown timer: run several timers at once with alarm and presets like Focus 25. Keeps counting when the tab sleeps or reloads. Private, no sign-up.', TIMER, TIMERJS, 'life')
PAGES['stopwatch'] = ('Online Stopwatch with Laps - Keeps Running on Reload | Dilia Life', 'Free online stopwatch with lap times, fastest and slowest lap, copy and CSV download. Keeps running if you reload. Private, no sign-up.', STOPW, TIMERJS, 'life')

DNJS = '<script src="../assets/calcmath.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/cities.js"></script><script src="../assets/citygeo.js"></script><script src="../assets/sunmath.js"></script><script src="../assets/daynight-ui.js"></script>'
DAYNIGHT = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="daynight"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Day and night map</b></p>
<h1>Day and night map</h1><p class="lsub">See where on Earth it is day, twilight or night right now. Slide the time to look ahead or back.</p>
<div class="lglass dnwrap"><canvas id="dncv" tabindex="0" role="img" aria-label="World map with the night side shaded. Click a city dot, or use the arrow keys to change city."></canvas></div>
<div class="lglass lxctl"><div class="lrow"><label class="f">City<select id="dnsel"></select></label><label class="f dnrw">Time shift: <span id="dnshift">Live</span><input id="dnrange" type="range" min="-720" max="720" step="15" value="0"></label></div>
<div class="lact" style="margin:0"><button type="button" id="dnnow">Back to now</button></div></div>
<div class="lstats dnst"><div><b id="dnutc">--</b><small>UTC time shown</small></div><div><b id="dnsun">--</b><small>Sun is straight overhead here</small></div><div><b id="dnday">--</b><small>cities in daylight</small></div></div>
<div id="dndet" class="lglass lcviz" aria-live="polite"></div>
<div class="lact"><a class="lbtn" href="../world-clock/">World clock</a><a class="lbtn" href="../life/">← All Life tools</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>The shading is worked out from the sun's position for the chosen moment. Where the sun is above the horizon it is day. Between the horizon and 18 degrees below it the sky is in twilight, and beyond that it is full night. Yellow dots are cities in daylight, blue dots are cities after dark.</p><p>Sunrise and sunset use the standard rule that counts the sun as risen when its top edge shows. Times are good to within a few minutes. Near the poles the sun may stay up or down all day, and the page says so. Everything is calculated in your browser.</p></section></div>"""
TCJS = '<script src="../assets/todaycal-ui.js"></script>'
TODAYCAL = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="todaycal"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Today in 12 calendars</b></p>
<h1>Today in 12+ calendars</h1><p class="lsub" id="tcwd" aria-live="polite">&nbsp;</p>
<div class="lglass lxctl"><div class="lrow"><label class="f">Date<input id="tcdate" type="date" min="1000-01-01" max="2999-12-31"></label></div>
<div class="lact" style="margin:0"><button type="button" id="tcprev">← Previous day</button><button type="button" class="go" id="tctoday">Today</button><button type="button" id="tcnext">Next day →</button></div></div>
<div class="tcgrid" id="tcgrid"></div>
<h2>Day numbers</h2><div class="lstats tcinfo" id="tcinfo"></div>
<div class="lact"><a class="lbtn" href="../festival-calendar/">Festival calendar</a><a class="lbtn" href="../life/">← All Life tools</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>Month and year names come from the calendar tables built into your browser, so they match what the browser knows for each calendar. The Julian date, day numbers and ISO week are worked out on this page.</p><p>Islamic and Chinese months depend on the moon. Umm al-Qura and the tabular calendar can differ by a day, and a country that sights the moon may differ too. Treat the Hijri date as a guide for planning and check with a local authority for religious observance. The Hebrew day starts at sunset the evening before.</p></section></div>"""
PAGES['day-night-map'] = ('Day and Night Map - Live World Sunrise Sunset | Dilia Life', 'Live world map of day and night with twilight shading. Slide the time to see where the sun is up, plus sunrise and sunset for 80 cities. Free, no sign-up.', DAYNIGHT, DNJS, 'life')
PAGES['todays-date-calendars'] = ('Today in Islamic, Hebrew, Chinese, Persian and 9 More Calendars | Dilia Life', 'See any date in 13 calendars: Hijri, Hebrew, Persian, Chinese, Indian, Buddhist, Japanese, Julian and more, with Julian Day Number and ISO week. Free, private.', TODAYCAL, TCJS, 'life')

TLJS = '<script src="../assets/calcmath.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/holidayplan.js"></script><script src="../assets/teamleave.js"></script><script src="../assets/teamleave-ui.js"></script>'
TEAMLEAVE = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="team"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Team leave planner</b></p>
<h1>Team leave planner</h1><p class="lsub">Add your team and their leave. See at a glance when too few people are in.</p>
<div class="lglass lxctl"><div class="lrow"><label class="f">Country (weekend and public holidays)<select id="tlc"></select></label><label class="f">Year<select id="tly"></select></label><label class="f">Minimum people who must be in<input id="tlmin" type="number" min="0" max="60" value="1" inputmode="numeric"></label></div>
<div class="lrow"><label class="f">Add a person<input id="tlpn" type="text" maxlength="40" placeholder="Name"></label><div class="lact" style="margin:0;align-self:end"><button type="button" class="go" id="tladd">Add person</button><span id="tlmsg" role="status"></span></div></div></div>
<div class="lstats" id="tlsum"></div>
<h2>Shortages</h2><div class="lglass lcviz" id="tlconf" aria-live="polite"></div>
<h2>Year at a glance</h2><div class="lglass lcviz"><div class="tlgrid" id="tlgrid" role="img" aria-label="Year grid"></div>
<div class="tlkey"><span><i class="n0"></i>everyone in</span><span><i class="n1"></i>1 off</span><span><i class="n2"></i>2 off</span><span><i class="n4"></i>4+ off</span><span><i class="s"></i>too few in</span><span><i class="w"></i>weekend</span><span><i class="h"></i>public holiday</span></div></div>
<h2>People and leave</h2><div class="tlpeople" id="tlpeople"></div>
<div class="lact"><button type="button" id="tlcsv" disabled>Download CSV</button><button type="button" id="tlprint" disabled>Print</button><button type="button" id="tlclear" disabled>Clear everything</button><a class="lbtn" href="../holiday-planner/">Holiday planner</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>Leave counts only on working days. A weekend or public holiday inside a leave period costs no leave day and never causes a shortage. Weekends and holidays follow the country you pick and apply to the whole team. Days that follow the moon, such as Eid, can shift by a day, so check the official announcement.</p><p>A shortage is a work day when fewer people are in than your minimum. Everything is saved in this browser only. Nothing is sent anywhere, so use Download CSV to keep a copy or share it.</p></section></div>"""
PAGES['team-leave-planner'] = ('Team Leave Planner - See Who Is Off and When | Dilia Life', 'Free team leave planner: add people and leave dates, see who is off each day, get warnings when too few people are in. Public holidays for 249 countries. Private, no sign-up.', TEAMLEAVE, TLJS, 'life')

YPJS = '<script src="../assets/calcmath.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/holidayplan.js"></script><script src="../assets/yearplanner-ui.js"></script>'
YEARPLAN = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="yearplan"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Printable year planner</b></p>
<h1>Printable year planner</h1><p class="lsub">A one-page wall calendar with your country's public holidays and your own dates. Print it or save it as a PDF.</p>
<div class="lglass lxctl"><div class="lrow"><label class="f">Country<select id="ypc"></select></label><label class="f">Year<select id="ypy"></select></label><label class="f">Week starts on<select id="ypws"><option value="1">Monday</option><option value="0">Sunday</option><option value="6">Saturday</option></select></label></div>
<div class="lrow"><label class="f">Paper<select id="ypsz"><option value="a4">A4</option><option value="letter">US Letter</option></select></label><label class="f">Layout<select id="ypor"><option value="land">Landscape</option><option value="port">Portrait</option></select></label><label class="f">Title (optional)<input id="ypt" type="text" maxlength="60" placeholder="Our 2026"></label><label class="f ck"><input id="ypwn" type="checkbox"> Show week numbers</label></div>
<div class="lrow"><label class="f">Add your own date<input id="ypd" type="date"></label><label class="f">Label<input id="ypl" type="text" maxlength="40" placeholder="Birthday, trip, exam"></label><div class="lact" style="margin:0;align-self:end"><button type="button" id="ypadd">Add date</button></div></div>
<ul class="ypmk" id="ypmarks"></ul><div class="lact" style="margin:0"><button type="button" class="go" id="ypprint">Print or save as PDF</button><span id="ypmsg" role="status"></span></div></div>
<div class="yp land a4" id="ypout" aria-live="polite"></div>
<div class="lact"><a class="lbtn" href="../holiday-planner/">Holiday planner</a><a class="lbtn" href="../team-leave-planner/">Team leave planner</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>Pick a country and year and the planner shades weekends and public holidays. Add your own dates and they are marked in the calendar and listed below it. In the print window choose "Save as PDF" as the printer to get a file, and keep margins on Default or None. Days that follow the moon, such as Eid, are starred because the date can shift by a day.</p><p>Your settings and dates are saved in this browser only. Nothing is sent anywhere.</p></section></div>"""
PAGES['printable-year-planner'] = ('Printable Year Planner - Free Calendar With Public Holidays | Dilia Life', 'Free printable year planner for any year: weekends, public holidays for 249 countries and your own dates on one page. A4 or Letter, landscape or portrait. Private, no sign-up.', YEARPLAN, YPJS, 'life')

BKJS = '<script src="../assets/calcmath.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/booklet-ui.js"></script>'
BOOKLET = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="booklet"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Trip booklet</b></p>
<h1>Trip booklet</h1><p class="lsub">Turn a trip from your Trip planner into a printable file for the journey. Print it or save it as a PDF.</p>
<p class="lglass ldet" id="bkempty" hidden>No trips found in this browser yet. Build one in the <a href="../trip-planner/">Trip planner</a>, then come back here. Trips are saved per browser, so open this page on the same device.</p>
<div class="lglass lxctl" id="bkctl"><div class="lrow"><label class="f">Trip<select id="bkt"></select></label><label class="f">Paper<select id="bksz"><option value="a4">A4</option><option value="letter">US Letter</option></select></label><label class="f">Packing list (optional)<select id="bkpk"></select></label></div>
<div class="lrow"><label class="f ck"><input id="bkcov" type="checkbox"> Cover page</label><label class="f ck"><input id="bkbook" type="checkbox"> Bookings table</label><label class="f ck"><input id="bknotes" type="checkbox"> Notes page</label></div>
<label class="f">Contacts and important numbers (optional, printed in the booklet)<textarea id="bkcon" rows="4" maxlength="2000" placeholder="Hotel front desk, embassy, insurance claim line, a friend at home"></textarea></label>
<div class="lact" style="margin:0"><button type="button" class="go" id="bkprint">Print or save as PDF</button><span id="bkmsg" role="status"></span></div></div>
<div class="bk a4" id="bkout" aria-live="polite"></div>
<div class="lact"><a class="lbtn" href="../trip-planner/">Trip planner</a><a class="lbtn" href="../packing-list/">Packing list</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>The booklet is built from the trips saved in this browser by the Trip planner, so nothing is uploaded. It lists every day with times, places, notes and booking references, then a table of all references. Contacts you type here are saved in this browser only. Print it and keep a paper copy in case your phone fails.</p></section></div>"""
PAGES['trip-booklet'] = ('Trip Booklet - Printable Travel Itinerary PDF | Dilia Life', 'Turn your trip plan into a printable booklet: cover, day-by-day itinerary, booking references, contacts and packing list. A4 or Letter. Private, no sign-up.', BOOKLET, BKJS, 'life')

PKJS = '<script src="../assets/lifekit.js"></script><script src="../assets/packkit.js"></script><script src="../assets/packing-ui.js"></script>'
PACKING = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="packing"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Packing list</b></p>
<h1>Packing list</h1><p class="lsub">Build a list for your trip, tick items off and print it. It also includes a before-you-leave checklist.</p>
<div class="lglass ldet" id="pkempty"><p>You have no packing lists yet.</p><div class="lact" style="margin:0"><button type="button" class="go" id="pkfirst">Create my first list</button></div></div>
<div id="pkwork" hidden>
<div class="lglass lxctl"><div class="lrow"><label class="f">List<select id="pklist"></select></label><label class="f">Name<input id="pkname" type="text" maxlength="50"></label></div>
<div class="lact" style="margin:0"><button type="button" id="pknew">New list</button><button type="button" id="pkdel">Delete list</button></div></div>
<div class="lglass lxctl"><div class="lrow"><label class="f">Trip length (days)<input id="pkdays" type="number" min="1" max="60" value="5" inputmode="numeric"></label></div><div class="lchips" id="pktypes" role="group" aria-label="Trip type"></div>
<div class="lact" style="margin:0"><button type="button" class="go" id="pkgen">Add suggested items</button></div></div>
<div class="lglass lxctl"><div class="lrow"><label class="f">Add your own item<input id="pkitem" type="text" maxlength="80" placeholder="Camera, gift for host"></label><label class="f">Group<select id="pkcat"></select></label><div class="lact" style="margin:0;align-self:end"><button type="button" id="pkadd">Add</button></div></div></div>
<div class="pkp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Packing progress"><i id="pkbar"></i></div><p class="lnote" id="pkprog" aria-live="polite"></p>
<div class="pkview" id="pkview"></div>
<div class="lact"><button type="button" id="pkreset" disabled>Untick all</button><button type="button" id="pkcopy" disabled>Copy as text</button><button type="button" id="pkprint" disabled>Print</button><span id="pkmsg" role="status"></span><a class="lbtn" href="../trip-booklet/">Trip booklet</a><a class="lbtn" href="../document-expiry/">Document wallet</a></div></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>Pick the trip length and type and the page adds a sensible starting list. The clothes counts assume you can wash once a week, so they stop growing after about a week. Add or remove anything. Lists are saved in this browser only, and the Trip booklet can print one. Check the rules of your airline and destination for what you can carry.</p></section></div>"""
PAGES['packing-list'] = ('Packing List Generator - Free, Printable Checklist | Dilia Life', 'Free packing list generator for any trip: beach, city, business, cold weather, hiking, kids, flying. Tick items off, add your own, print it. Saved only in your browser.', PACKING, PKJS, 'life')
DCJS = '<script src="../assets/lifekit.js"></script><script src="../assets/packkit.js"></script><script src="../assets/docs-ui.js"></script>'
DOCS = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx" data-lc="docs"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Document expiry wallet</b></p>
<h1>Document expiry wallet</h1><p class="lsub">Keep track of when passports, IDs, visas and insurance run out, before it ruins a trip.</p>
<p class="lglass ldet" style="border-color:#ffc93c;color:#ffe7a6">Enter only a type, an owner name and the expiry date. Do not type passport or ID numbers. Everything stays in this browser.</p>
<div class="lglass lxctl"><div class="lrow"><label class="f">Document<select id="dckind"></select></label><label class="f">Owner<input id="dcowner" type="text" maxlength="40" placeholder="Name"></label><label class="f">Expiry date<input id="dcexp" type="date"></label><label class="f">Note (optional)<input id="dcnote" type="text" maxlength="60" placeholder="Renewal takes 4 weeks"></label></div>
<div class="lact" style="margin:0"><button type="button" class="go" id="dcadd">Add document</button><span id="dcmsg" role="status"></span></div></div>
<p class="lnote" id="dcsum" aria-live="polite"></p><div class="dclist" id="dclist"></div>
<h2>Check against a trip</h2><div class="lglass lxctl"><div class="lrow"><label class="f">Last day of trip<input id="dcend" type="date"></label><label class="f">Extra months it must still be valid (0 to 12)<input id="dcmo" type="number" min="0" max="12" value="6" inputmode="numeric"></label></div></div><div class="lglass lcviz" id="dccheck" aria-live="polite"></div>
<div class="lact"><button type="button" id="dcics" disabled>Download renewal reminders (.ics)</button><a class="lbtn" href="../packing-list/">Packing list</a><a class="lbtn" href="../trip-planner/">Trip planner</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>Documents are sorted by how soon they expire. The check compares each expiry with the end of your trip plus the extra months you enter. Many countries require a passport to stay valid for a set time after arrival or departure, often three or six months, but the rule differs by country and nationality. Always confirm with the official government or embassy source of your destination.</p><p>The reminder file adds one all-day event 90 days before each expiry, so you can import it into any calendar app.</p></section></div>"""
PAGES['document-expiry'] = ('Document Expiry Wallet - Passport and ID Reminders | Dilia Life', 'Track when your passport, ID, visa and insurance expire, check them against your trip dates and get renewal reminders. Private: saved only in your browser, no numbers needed.', DOCS, DCJS, 'life')
PAGES['world-clock'] = ('World Clock - Live Time in Your Cities | Dilia Life', 'Free world clock: live time in your cities with day and night, time difference, weekends and public holidays. Private, no sign-up.', WCLOCK, CLOCKJS, 'life')
PAGES['meeting-planner'] = ('Meeting Planner Across Time Zones - Skips Weekends and Holidays | Dilia Life', 'Free meeting planner: find hours when everyone is at work across cities, skipping each country\'s weekend and public holidays. Private.', MEET, CLOCKJS, 'life')
PAGES['festival-calendar'] = ('Festival Calendar 2024 to 2035 - Ramadan, Eid, Diwali, Easter Countdown | Dilia Life', 'Free festival calendar with countdowns: Ramadan, Eid, Diwali, Holi, Chinese New Year, Easter, Christmas, Vesak, Hanukkah and more. Calendar file, private.', FEST, '<script src="../assets/lifekit.js"></script><script src="../assets/festivals.js"></script><script src="../assets/festivals-ui.js"></script>', 'life')
TRIP = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Trip planner</b></p>
<h1>Trip planner</h1><p class="lsub">Plan every day of a trip: flights, stays, food and sights. Saved in this browser, nothing uploaded.</p>
<div class="lglass lxctl"><div class="trbar"><select id="trsel" aria-label="Your trips"></select><button type="button" class="tbtn go" id="trnew">+ New trip</button><button type="button" class="tbtn" id="trcopy">Duplicate</button><button type="button" class="tbtn" id="trdelete">Delete trip</button></div><p class="lnote" id="trsaved" role="status" style="margin:0"></p></div>
<div id="trempty" class="lhero" hidden><div class="k">NO TRIPS YET</div><div class="n">Where to next?</div><div class="d">Make your first trip. Everything stays on this device.</div><div class="lact" style="position:relative;z-index:1;margin-top:14px"><button type="button" class="go" id="trstart0">Start a trip</button></div></div>
<div id="trbody" hidden>
<div class="lglass lxctl" style="margin-top:14px"><div class="lrow"><label class="f">Trip name<input id="trname" type="text" maxlength="80"></label><label class="f">From<input id="trfrom" type="text" maxlength="80" list="trtocity"></label><label class="f">To<input id="trto" type="text" maxlength="80" list="trtocity"></label></div><div class="lrow"><label class="f">First day<input id="trstart" type="date" min="2000-01-01" max="2099-12-31"></label><label class="f">Last day<input id="trend" type="date" min="2000-01-01" max="2099-12-31"></label></div><datalist id="trtocity"></datalist><p class="lnote" id="trdest" style="margin:0"></p></div>
<div class="ltk trpass" id="trpass"></div>
<p class="lcbad" id="trout" hidden></p>
<div id="trdays"></div>
<form class="lglass trform lxctl" id="trform" hidden><h3 id="trfhead" style="margin:0">Add a stop</h3>
  <div class="lseg" id="trfkind" role="group" aria-label="Kind"><span class="t">Kind</span>""" + '<button type="button" data-k="flight" aria-pressed="false">Flight</button><button type="button" data-k="stay" aria-pressed="false">Stay</button><button type="button" data-k="food" aria-pressed="false">Food</button><button type="button" data-k="sight" aria-pressed="false">Sight</button><button type="button" data-k="move" aria-pressed="false">Transport</button><button type="button" data-k="other" aria-pressed="false">Other</button>' + """</div>
  <div class="lrow"><label class="f">Day<select id="trfday"></select></label><label class="f">Time (optional)<input id="trftime" type="time"></label></div>
  <label class="f">What<input id="trftitle" type="text" maxlength="120" placeholder="Flight EK 650, Hotel check-in, Galle Fort…" required></label>
  <div class="lrow"><label class="f">Where (optional)<input id="trfplace" type="text" maxlength="160"></label><label class="f">Booking ref (optional)<input id="trfref" type="text" maxlength="80"></label></div>
  <label class="f">Notes (optional)<textarea id="trfnote" maxlength="600"></textarea></label>
  <div class="lact" style="margin-top:0"><button type="submit" class="go">Save stop</button><button type="button" id="trfcancel">Cancel</button></div></form>
<div class="lact" id="tract"><button type="button" class="go" id="trics">Add to calendar (.ics)</button><button type="button" id="trprint">Print the trip</button><button type="button" id="trbackup">Download backup</button><label class="tbtn trimp">Restore backup<input type="file" id="trimport" accept=".json,application/json"></label><a class="lbtn" href="../flight-time/">Flight time and jet lag</a></div>
</div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>Your trips are kept only in this browser. Clearing the browser's site data deletes them, so download a backup before a big trip; the backup file can be restored on any device. The calendar file uses the times as you typed them (local time at the place), so check times in your calendar app if your phone is set to a different time zone.</p><p>Nothing is uploaded and there is no account. Booking references stay on your device.</p></section></div>"""
FLIGHT = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Flight time and jet lag</b></p>
<h1>Flight time and jet lag</h1><p class="lsub">When you land in local time, how the clocks move, your layover, and a simple jet-lag plan.</p>
<div class="lcgrid" data-fl><div class="lglass lxctl">
  <div class="lrow"><label class="f">Flying from<select id="flfrom"></select></label><label class="f">To<select id="flto"></select></label></div>
  <div class="lbtnrow"><button type="button" id="flswap">⇄ Swap</button></div>
  <label class="f">Departure (local time)<input id="flwhen" type="datetime-local"></label>
  <div class="lrow"><label class="f">Flight hours<input id="flh" type="text" inputmode="numeric" value="7"></label><label class="f">Minutes<input id="flm" type="text" inputmode="numeric" value="40"></label></div>
  <label class="lchk"><input type="checkbox" id="fllay"> With a connection</label>
  <div id="fllegs" hidden class="lxctl" style="padding:0"><div class="lrow"><label class="f">Change planes in<select id="flhub"></select></label><label class="f">Next flight leaves (local)<input id="flnext" type="time" value="21:30"></label></div><div class="lrow"><label class="f">Second flight hours<input id="flh2" type="text" inputmode="numeric" value="6"></label><label class="f">Minutes<input id="flm2" type="text" inputmode="numeric" value="0"></label></div></div>
</div><div class="lhero lcres" id="lcres" aria-live="polite"><div class="n">Working…</div></div></div>
<div class="lglass lcviz" id="lcviz"></div>
<div class="lglass ldet" id="fljet" style="margin-top:16px"></div>
<div class="lact"><a class="lbtn" href="../trip-planner/">Trip planner</a><a class="lbtn" href="../world-clock/">World clock</a></div>
</div></section>
<div class="wrap"><section class="gtext"><h2>How it works</h2><p>Type the departure time shown on your ticket (local time where you leave) and the flight length. Arrival is worked out with the time zone rules built into your browser, including daylight saving on both ends. The connection time is the local time at the airport where you change planes; if it is earlier than your landing, the next day is used.</p><p>The jet-lag tips are general guidance used by travel-health services, not medical advice.</p></section></div>"""
PAGES['trip-planner'] = ('Trip Planner - Day-by-Day Itinerary, Private | Dilia Life', 'Free trip planner: plan each day with flights, stays, food and sights, booking refs, countdown, calendar file and print. Saved in your browser, no account.', TRIP, '<script src="../assets/calcmath.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/cities.js"></script><script src="../assets/trip-ui.js"></script>', 'life')
PAGES['flight-time'] = ('Flight Arrival Time and Jet Lag Planner | Dilia Life', 'Free flight time calculator: local arrival time, date change, layover length and a simple jet-lag plan. Daylight saving included. Private.', FLIGHT, '<script src="../assets/calcmath.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/cities.js"></script><script src="../assets/flight-ui.js"></script>', 'life')
CCARD = """<link rel="stylesheet" href="../assets/lifefx.css"><link rel="stylesheet" href="../assets/lifefx-light.css">
<section class="lx"><div class="wrap">
<p class="crumbp"><a href="../">Dilia</a> › <a href="../life/">Life</a> › <b>Country card</b></p>
<h1>Country card</h1><p class="lsub">Time, currency, calling code, weekend, languages and the next holiday for any country, side by side with home.</p>
<div class="lglass lxctl"><div class="lrow"><label class="f">Country<select id="ccc"></select></label><label class="f">Your home country<select id="cch"></select></label></div></div>
<div class="lhero"><div class="cchero"><div class="ccflag" id="ccflag" aria-hidden="true"></div><div><div class="k">LOCAL TIME IN</div><div class="n" id="ccname">Loading…</div><div class="cctime" id="cctime"></div><div class="d" id="ccdiff"></div></div></div></div>
<div class="ccfields" id="ccfields"></div>
<h2>Next public holiday there</h2>
<div class="lhero"><div class="n" id="cchn"></div><div class="d" id="cchd"></div><div class="lcd" id="cchcd"></div></div>
<h2>Home and there</h2><div class="lglass lcviz" id="cccmp" style="overflow-x:auto"></div>
<div class="lact" id="cclinks"></div>
<p class="lnote" id="ccsrc" style="margin-top:16px"></p>
</div></section>
<div class="wrap"><section class="gtext"><h2>About this card</h2><p>Each fact is shown only when two open sources agree. When a country has just changed something (Bulgaria moved to the euro in 2026, for example), the sources can disagree for a while, and the card says so instead of guessing.</p><p>Emergency numbers, plug types and voltage are not shown yet: they are being checked against official sources first. Tipping customs are not shown because there is no reliable source.</p></section></div>"""
PAGES['country-card'] = ('Country Card - Time, Currency, Calling Code, Weekend | Dilia Life', 'Free country card: local time, time difference, currency, calling code, weekend days, languages and the next public holiday, compared with your home country.', CCARD, '<script src="../assets/calcmath.js"></script><script src="../assets/holidayplan.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/cities.js"></script><script src="../assets/countrycard-ui.js"></script>', 'life')
PAGES['public-holidays'] = ('Public Holidays 2024 to 2035 by Country - Next Holiday Countdown | Dilia Life', 'Public holidays for every country, 2024 to 2035: next-holiday countdown, long weekends, compare two countries, calendar file and CSV. Free and private.', PHOL, '<script src="../assets/holidayplan.js"></script><script src="../assets/lifekit.js"></script><script src="../assets/holidays-ui.js"></script>', 'life')
PAGES['holiday-planner'] = ('Holiday Planner - Make the Most of Your Leave Days | Dilia Life', 'Free holiday planner: pick your country, year and leave days and get the best breaks, long weekends, a countdown, a year calendar and a calendar file. No sign-up.', HOLPLAN, '<script src="../assets/holidayplan.js"></script><script src="../assets/holidayplan-ui.js"></script>', 'life')
PAGES['snake'] = ('Snake - Free Classic and Modern Snake Game | Dilia Play', 'Play Snake free: classic mode with deadly walls, or modern mode with wrap-around edges and bonus stars. Keyboard or swipe. No ads, no sign-up.', snake_body(), GAME_JS + '<script src="../assets/snake-game.js"></script>', 'free')
PAGES['reaction-time'] = ('Reaction Time Test - How Fast Are You? Free | Dilia Play', 'Test your reaction time in milliseconds: wait for green, then tap. Five tries per round and a history chart. Free, no ads, no sign-up.', reaction_body(), GAME_JS + '<script src="../assets/reaction-game.js"></script>', 'free')
PAGES['typing-test'] = ('Typing Test - Speed and Accuracy in 5 Languages, Free | Dilia Play', 'Free typing test with 15, 30 and 60 second rounds in English, Arabic, Spanish, Hindi and Portuguese. Shows WPM and accuracy. No ads, no sign-up.', typing_body(), GAME_JS + '<script src="../assets/typing-words.js"></script><script src="../assets/typing-game.js"></script>', 'free')

# ---------------- party and decide: wheel, picker, team maker, dice, coin, random number (free play, nothing saved but your own lists) ----------------
PARTY_LINKS = [('wheel-spinner', 'Wheel spinner'), ('random-name-picker', 'Random name picker'), ('team-maker', 'Team maker'), ('dice-roller', 'Dice roller'), ('coin-flip', 'Coin flip'), ('random-number-generator', 'Random number'), ('bingo-card-generator', 'Bingo cards'), ('bingo-caller', 'Bingo caller'), ('quiz-maker', 'Quiz maker'), ('score-keeper', 'Scoreboard'), ('secret-santa-generator', 'Secret Santa')]
def party_body(slug, title, sub, how, tool, about):
    more = ' · '.join(f'<a href="../{s}/">{n}</a>' for s, n in PARTY_LINKS if s != slug)
    lis = ''.join(f'<li>{x}</li>' for x in how)
    return f"""<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">How it works</p><ul class="small">{lis}</ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div></div>
    {tool}
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More party tools</p><span class="small">{more} · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About the {title.lower()}</h2>
  {about}
</section>
</div>"""

TOOL_WHEEL = """<div id="party" data-pm="wheel">
    <div class="gbox"><div class="pt-wheelwrap"><canvas id="wcv" width="640" height="640" role="img" aria-label="Wheel"></canvas><span class="pt-ptr" aria-hidden="true"></span></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn go" id="spin">Spin</button><button type="button" class="pbtn" id="wshuffle">Shuffle order</button><button type="button" class="pbtn" id="wlink">Copy link to this wheel</button></div>
    <div class="done pt-res" id="done"><p class="eyeb">The wheel says</p><div class="t" id="dtime"></div><p id="dline"></p><div class="gbtns"><button type="button" class="pbtn" id="wremove">Remove from wheel</button></div></div>
    <label class="pt-lbl" for="wents">Entries, one per line <span id="wcount"></span></label>
    <textarea class="pt-ta" id="wents" rows="6" maxlength="4000" spellcheck="false"></textarea>
    <label class="pt-chk"><input type="checkbox" id="wrm"> Remove the winner after each spin</label>
    <div class="gcard" id="wrecentbox" style="margin-top:16px" hidden><p class="eyeb">Recent results</p><ul class="pt-hist" id="wrecent"></ul><div class="gbtns"><button type="button" class="pbtn" id="wclear">Clear recent</button></div></div>
  </div>"""
TOOL_PICK = """<div id="party" data-pm="pick">
    <div class="done pt-res" id="done"><p class="eyeb" id="rtitle"></p><div id="rlist" class="pt-reslist" aria-live="polite"></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="pt-row"><label for="pnum">How many to pick<input class="pt-in" id="pnum" type="number" min="1" max="50" value="1" inputmode="numeric"></label></div>
    <label class="pt-chk"><input type="checkbox" id="pnorep"> Do not pick the same name twice <span id="pleft" class="small"></span></label>
    <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="go">Pick</button><button type="button" class="pbtn" id="copy">Copy result</button><button type="button" class="pbtn" id="preset">Start over</button><button type="button" class="pbtn" id="pshuffle">Shuffle list</button></div>
    <label class="pt-lbl" for="pnames">Names, one per line <span id="pcount"></span></label>
    <textarea class="pt-ta" id="pnames" rows="8" maxlength="8000" spellcheck="false"></textarea>
  </div>"""
TOOL_TEAMS = """<div id="party" data-pm="teams">
    <div class="pt-row"><div role="group" aria-label="How to split" class="mlevel"><label class="pbtn" style="min-height:36px"><input type="radio" name="tmode" value="teams" checked> Teams</label><label class="pbtn" style="min-height:36px"><input type="radio" name="tmode" value="size"> Team size</label></div>
      <label for="tnum"><span id="tlabel">How many teams</span><input class="pt-in" id="tnum" type="number" min="1" max="100" value="2" inputmode="numeric"></label></div>
    <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="go">Make teams</button><button type="button" class="pbtn" id="copy">Copy teams</button><button type="button" class="pbtn" id="pshuffle">Shuffle list</button></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="done pt-res" id="done"><p class="eyeb">Your teams</p><div class="pt-teams" id="tteams"></div></div>
    <label class="pt-lbl" for="pnames">Names, one per line <span id="pcount"></span></label>
    <textarea class="pt-ta" id="pnames" rows="8" maxlength="8000" spellcheck="false"></textarea>
  </div>"""
SIDES = ''.join(f'<button type="button" class="pbtn" data-s="{n}" aria-pressed="{"true" if n == 6 else "false"}">d{n}</button>' for n in (4, 6, 8, 10, 12, 20, 100))
TOOL_DICE = f"""<div id="party" data-pm="dice">
    <div class="dicebox" id="dicebox" role="img" aria-label="Your dice"></div>
    <div class="done pt-res" id="done"><p class="eyeb">Total</p><div class="t" id="dtotal"></div><p id="dline"></p></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="pt-row"><label for="dn">Dice<input class="pt-in" id="dn" type="number" min="1" max="10" value="1" inputmode="numeric"></label><label for="dsides">Sides<input class="pt-in" id="dsides" type="number" min="2" max="1000" value="6" inputmode="numeric"></label></div>
    <div class="pt-sides" role="group" aria-label="Common dice">{SIDES}</div>
    <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="roll">Roll</button><button type="button" class="pbtn" id="dcopy">Copy result</button></div>
    <div class="gcard" id="dhistbox" style="margin-top:16px" hidden><p class="eyeb">Last rolls</p><ul class="pt-hist" id="dhist"></ul></div>
  </div>"""
TOOL_COIN = """<div id="party" data-pm="coin">
    <div class="coinbox"><div class="coin" id="coin" role="img" aria-label="Coin"><div class="ch">HEADS</div><div class="ct">TAILS</div></div></div>
    <div class="done pt-res" id="done"><p class="eyeb">It landed on</p><div class="t" id="dtotal"></div><p id="dline"></p></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn go" id="flip">Flip the coin</button><button type="button" class="pbtn" id="cclear">Clear tally</button></div>
    <div class="gcard" style="margin-top:16px"><p class="eyeb">Tally</p><span class="small">Heads <b id="chead">0</b> · Tails <b id="ctail">0</b> · <span id="cpct"></span></span><p class="small" id="chist" style="margin:8px 0 0"></p></div>
  </div>"""
TOOL_NUM = """<div id="party" data-pm="number">
    <div class="done pt-res" id="done"><p class="eyeb">Your numbers</p><div id="nlist" aria-live="polite"></div><p id="dline"></p></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="pt-row"><label for="nmin">Lowest<input class="pt-in" id="nmin" type="number" value="1" inputmode="numeric"></label><label for="nmax">Highest<input class="pt-in" id="nmax" type="number" value="100" inputmode="numeric"></label><label for="ncount">How many<input class="pt-in" id="ncount" type="number" min="1" max="100" value="1" inputmode="numeric"></label></div>
    <label class="pt-chk"><input type="checkbox" id="nnorep"> No number twice</label>
    <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="go">Generate</button><button type="button" class="pbtn" id="ncopy">Copy numbers</button></div>
  </div>"""
PJS = '<script src="../assets/party-rng.js"></script>\n'
PAGES['wheel-spinner'] = ('Wheel Spinner - Free Random Wheel, Share by Link | Dilia Play', 'Type your options, spin the wheel and get one fair winner. Share the wheel by link. Free, no ads, no sign-up, nothing leaves your device.',
    party_body('wheel-spinner', 'Wheel spinner', 'Type the options, spin, get one winner.', ['Type one option per line (up to 50).', 'Press Spin or the space bar.', 'Tick "Remove the winner" to run elimination rounds.', '"Copy link" shares the exact wheel.'], TOOL_WHEEL,
    '<p>The winner is chosen first by a fair random pick, and then the wheel is turned so it stops on that entry. Every entry has exactly the same chance, whatever the size of its slice looks like.</p><p>Your entries and recent results stay in this browser. The share link holds the entries inside the address itself, so nothing is stored on a server.</p>'), PJS + '<script src="../assets/party-wheel.js"></script>', 'free')
PAGES['random-name-picker'] = ('Random Name Picker - Pick a Winner Fairly, Free | Dilia Play', 'Paste a list of names and pick one or several at random. Optional no-repeat mode for draws and raffles. Free, no ads, no sign-up.',
    party_body('random-name-picker', 'Random name picker', 'Paste names, pick one or more at random.', ['Type one name per line (up to 200).', 'Choose how many to pick.', 'Tick "do not pick the same name twice" for a draw with no repeats.', 'Press Start over to put everyone back.'], TOOL_PICK,
    '<p>Each pick uses the secure random source of your browser, so every name has the same chance. Names are picked without repeating inside one draw. With "do not pick the same name twice" ticked, names already picked stay out until you press Start over.</p><p>Your list stays in this browser and is shared with the team maker. Nothing is sent anywhere.</p>'), PJS + '<script src="../assets/party-pick.js"></script>', 'free')
PAGES['team-maker'] = ('Team Maker - Random Team Generator, Fair Teams | Dilia Play', 'Paste names and split them into fair random teams, by number of teams or people per team. Copy the result. Free, no ads, no sign-up.',
    party_body('team-maker', 'Team maker', 'Split a list of names into fair random teams.', ['Type one name per line (up to 200).', 'Choose the number of teams, or the people in each team.', 'Press Make teams again for a new split.', 'Team sizes never differ by more than one.'], TOOL_TEAMS,
    '<p>Names are shuffled with a fair random method and then dealt out one by one, so team sizes never differ by more than one person. Choose either how many teams you want or how many people each team should have.</p><p>Your list stays in this browser and is shared with the random name picker. Nothing is sent anywhere.</p>'), PJS + '<script src="../assets/party-pick.js"></script>', 'free')
PAGES['dice-roller'] = ('Dice Roller - Roll d6, d20 and Any Dice Online, Free | Dilia Play', 'Roll 1 to 10 dice with 2 to 1000 sides: d4, d6, d8, d10, d12, d20, d100. Fair random results and a total. Free, no ads, no sign-up.',
    party_body('dice-roller', 'Dice roller', 'Roll up to 10 dice with any number of sides.', ['Choose how many dice and how many sides.', 'Press Roll. The total is added up for you.', 'The six-sided die turns in 3D; other dice show the number.', 'The last 10 rolls are listed below.'], TOOL_DICE,
    '<p>Every roll is a fair random pick between 1 and the number of sides, so each face has the same chance. Use d6 for board games, d20 for role-playing games, or any number from 2 to 1000 sides.</p><p>Nothing is sent anywhere. Rolls are not saved when you leave the page.</p>'), PJS + '<script src="../assets/party-dice.js"></script>', 'free')
PAGES['coin-flip'] = ('Coin Flip - Heads or Tails, Fair and Free | Dilia Play', 'Flip a coin online: heads or tails with a fair random result and a running tally. Free, no ads, no sign-up.',
    party_body('coin-flip', 'Coin flip', 'Heads or tails, decided fairly.', ['Press Flip the coin.', 'The tally of heads and tails stays in this browser.', 'Clear tally starts the count again.'], TOOL_COIN,
    '<p>Each flip is a fair random choice between heads and tails, so a long run of the same side can happen and does not change the next flip. The tally is kept in this browser only.</p>'), PJS + '<script src="../assets/party-dice.js"></script>', 'free')
PAGES['random-number-generator'] = ('Random Number Generator - Any Range, No Repeats | Dilia Play', 'Generate random whole numbers between any two values, one or many, with an option for no repeats. Free, no ads, no sign-up.',
    party_body('random-number-generator', 'Random number generator', 'Whole numbers between any two values.', ['Set the lowest and highest number.', 'Choose how many numbers you want (up to 100).', 'Tick "No number twice" for a draw without repeats.', 'Copy the numbers with one tap.'], TOOL_NUM,
    '<p>Each number is a fair random pick, so every whole number from the lowest to the highest value has the same chance. Use it for raffles, games and picking sample numbers. Values can be from -1,000,000,000 to 1,000,000,000.</p><p>Nothing is sent anywhere.</p>'), PJS + '<script src="../assets/party-dice.js"></script>', 'free')

TOOL_BCARDS = """<div id="party" data-pm="cards">
    <div class="pt-noprint">
      <div class="pt-row"><div role="group" aria-label="Kind of card" class="mlevel"><label class="pbtn" style="min-height:36px"><input type="radio" name="bkind" value="classic" checked> Classic 1 to 75</label><label class="pbtn" style="min-height:36px"><input type="radio" name="bkind" value="words"> My own words</label></div>
        <label for="bn">How many cards<input class="pt-in" id="bn" type="number" min="1" max="30" value="4" inputmode="numeric"></label></div>
      <div id="btitlebox" hidden><label class="pt-lbl" for="btitle">Title on the cards</label><input class="pt-in" id="btitle" type="text" maxlength="20" value="BINGO" style="width:100%"></div>
      <div id="bwordsbox" hidden><label class="pt-lbl" for="bwords">Words or phrases, one per line (at least 24)</label><textarea class="pt-ta" id="bwords" rows="8" maxlength="6000" spellcheck="false"></textarea></div>
      <p class="msg" id="msg" role="status" aria-live="polite"></p>
      <div class="gbtns" style="margin-top:12px"><button type="button" class="pbtn go" id="go">Make cards</button></div>
      <div id="bactions" hidden><div class="gbtns"><button type="button" class="pbtn" id="bprint">Print the cards</button></div></div>
    </div>
    <div class="pt-bcards" id="bcards"></div>
  </div>"""
TOOL_CALLER = """<div id="party" data-pm="caller">
    <div class="done pt-res on"><p class="eyeb">Last number called</p><div class="pt-big" id="clast" aria-live="polite">–</div><p id="cprev"></p><p class="small" id="ccount"></p></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn go" id="go">Call next number</button><button type="button" class="pbtn" id="cundo">Undo last</button><button type="button" class="pbtn" id="creset">New game</button></div>
    <div class="pt-cboard" id="cboard" role="group" aria-label="Numbers 1 to 75"></div>
  </div>"""
TOOL_SCORE = """<div id="party" data-pm="score">
    <div class="pt-sides" role="group" aria-label="Points per tap"><button type="button" class="pbtn" data-st="1" aria-pressed="true">1 point</button><button type="button" class="pbtn" data-st="2" aria-pressed="false">2</button><button type="button" class="pbtn" data-st="5" aria-pressed="false">5</button><button type="button" class="pbtn" data-st="10" aria-pressed="false">10</button></div>
    <div id="slist" style="margin-top:14px"></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="sadd">Add a team</button><button type="button" class="pbtn" id="ssort" aria-pressed="false">Rank by score</button><button type="button" class="pbtn" id="scopy">Copy standings</button><button type="button" class="pbtn" id="sreset">Reset scores</button></div>
  </div>"""
TOOL_QUIZ = """<div id="party" data-pm="quiz">
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div id="qedit">
      <label class="pt-lbl" for="qtitle">Quiz title <span id="qcount"></span></label><input class="pt-in" id="qtitle" type="text" maxlength="60" style="width:100%" placeholder="My quiz">
      <div id="qlist" style="margin-top:14px"></div>
      <div class="gbtns"><button type="button" class="pbtn" id="qadd">Add a question</button></div>
      <label class="pt-chk"><input type="checkbox" id="qshuf"> Ask the questions in random order</label>
      <label class="pt-chk"><input type="checkbox" id="qshufa"> Shuffle the answers</label>
      <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="qstart">Play the quiz</button><button type="button" class="pbtn" id="qsave">Save as a file</button><label class="pbtn pt-file">Load a quiz file<input type="file" id="qfile" accept=".json,application/json"></label><button type="button" class="pbtn" id="qnew">New quiz</button></div>
    </div>
    <div id="qplay" hidden>
      <p class="eyeb" id="qprog"></p>
      <div id="qstage"></div>
      <div class="gbtns"><button type="button" class="pbtn" id="qshow">Show answer</button><button type="button" class="pbtn go" id="qnext">Next question</button><button type="button" class="pbtn" id="qback">Back to editing</button></div>
      <div id="qfinal" hidden><div class="done pt-res on"><p class="eyeb">Your score</p><div class="t" id="qscore"></div><p id="qline"></p><div class="gbtns"><button type="button" class="pbtn go" id="qagain">Play again</button><button type="button" class="pbtn" id="qedit2">Edit the quiz</button></div></div></div>
    </div>
  </div>"""
TOOL_SANTA = """<div id="party" data-pm="santa">
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div id="ssetup">
      <label class="pt-lbl" for="sn">Names, one per line (3 to 50)</label><textarea class="pt-ta" id="sn" rows="7" maxlength="3000" spellcheck="false" placeholder="Amira&#10;Ben&#10;Chen&#10;Diego"></textarea>
      <label class="pt-lbl" for="sx">Do not pair (optional), one pair per line, like: Amira, Ben</label><textarea class="pt-ta" id="sx" rows="3" maxlength="1500" spellcheck="false" style="min-height:70px"></textarea>
      <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="go">Make the draw</button></div>
    </div>
    <div id="sflow" hidden>
      <div class="done pt-res on"><div id="sstage"></div></div>
      <div class="gbtns"><button type="button" class="pbtn go" id="snext">I am …</button><button type="button" class="pbtn" id="sfullbtn" hidden>Show full list (spoils the surprise)</button><button type="button" class="pbtn" id="sagain">Start over</button></div>
      <div id="sfull" hidden class="gcard" style="margin-top:16px"><p class="eyeb">Full list, for the organiser</p><ul class="pt-hist" id="sfulllist"></ul><div class="gbtns"><button type="button" class="pbtn" id="sfullcopy">Copy list</button></div></div>
    </div>
  </div>"""
PJ2 = lambda f: PJS + f'<script src="../assets/{f}.js"></script>'
PAGES['bingo-card-generator'] = ('Bingo Card Generator - Printable Bingo Cards, Free | Dilia Play', 'Make printable bingo cards: classic 1 to 75 or your own words. Up to 30 different cards at once. Free, no ads, no sign-up.',
    party_body('bingo-card-generator', 'Bingo card generator', 'Printable cards, classic or with your own words.', ['Choose classic 1 to 75 or your own words (at least 24).', 'Choose how many cards (up to 30). Every card is different.', 'Press Make cards, then Print the cards.', 'Use the Bingo caller to call the numbers.'], TOOL_BCARDS,
    '<p>Classic cards follow the 75-ball rules: column B holds numbers 1 to 15, I 16 to 30, N 31 to 45, G 46 to 60 and O 61 to 75, with a free space in the middle. With your own words, each card takes 24 of your words in a random order.</p><p>Cards are made on your device and printed from your browser. Nothing is sent anywhere.</p>'), PJ2('party-bingo'), 'free')
PAGES['bingo-caller'] = ('Bingo Caller - Call Bingo Numbers 1 to 75, Free | Dilia Play', 'Call bingo numbers 1 to 75 without repeats, with a board of called numbers and undo. Free, no ads, no sign-up.',
    party_body('bingo-caller', 'Bingo caller', 'Call the numbers, never the same one twice.', ['Press Call next number or the space bar.', 'The board shows every number called so far.', 'Undo last takes back a number.', 'New game clears the board (press twice).'], TOOL_CALLER,
    '<p>Each number from 1 to 75 is called at most once, picked fairly from the numbers left. The letter shows which column it belongs to. The game is saved in this browser, so a page reload does not lose it.</p><p>Make matching cards with the bingo card generator.</p>'), PJ2('party-bingo'), 'free')
PAGES['score-keeper'] = ('Scoreboard - Free Online Score Keeper for Teams | Dilia Play', 'Keep score for up to 12 teams or players. Tap to add or remove points, rank by score and copy the standings. Free, no ads, no sign-up.',
    party_body('score-keeper', 'Scoreboard', 'Keep score for teams or players.', ['Type a name for each team (up to 12).', 'Pick 1, 2, 5 or 10 points, then tap + or −.', 'Rank by score puts the leader on top.', 'Scores are saved in this browser.'], TOOL_SCORE,
    '<p>Use the scoreboard for game nights, quizzes, sports days and classrooms. The team in the lead is outlined in gold. Scores and names stay in this browser, so you can close the page and come back.</p>'), PJ2('party-score').replace(PJS, ''), 'free')
PAGES['quiz-maker'] = ('Quiz Maker - Make and Play a Multiple-Choice Quiz, Free | Dilia Play', 'Write multiple-choice questions, play them on one screen with a score, and save the quiz as a file to share. Free, no ads, no sign-up.',
    party_body('quiz-maker', 'Quiz maker', 'Write a quiz, play it on one screen.', ['Write questions with up to 4 answers and mark the right one.', 'Press Play the quiz. Tap an answer, or use Show answer as host.', 'Save the quiz as a file and load it later or on another device.', 'Your quiz is kept in this browser while you edit.'], TOOL_QUIZ,
    '<p>Each question has up to four answers and one right answer. In play mode, tapping an answer shows the right one at once and counts a point if you were right. As a host, press Show answer to reveal it without scoring.</p><p>Save as a file gives you a small file you can send to someone. Loading a file only accepts the quiz format and is checked before it is used. Nothing is sent anywhere.</p>'), PJ2('party-quiz'), 'free')
PAGES['secret-santa-generator'] = ('Secret Santa Generator - Draw Names on One Device, Free | Dilia Play', 'Draw Secret Santa names on one device: pass it around, everyone sees only their own person. Optional do-not-pair rules. Free, no ads, no sign-up.',
    party_body('secret-santa-generator', 'Secret Santa generator', 'Draw names on one device, nobody sees the others.', ['Type the names (3 to 50). Optionally add pairs who must not draw each other.', 'Press Make the draw.', 'Pass the device: each person taps their name, sees their person, then hides it.', 'The draw is never saved. Leaving the page clears it.'], TOOL_SANTA,
    '<p>Nobody draws themselves, and pairs you list under "do not pair" never draw each other. The draw is made fairly among all valid arrangements. Only the names you typed are saved in this browser; the result of the draw lives in memory until you leave the page.</p><p>The organiser can open the full list at the end, which spoils the surprise for the organiser.</p>'), PJ2('party-santa'), 'free')
for slug, (t, d, body, js, *mode) in PAGES.items():
    dd = ROOT / slug; dd.mkdir(exist_ok=True)
    (dd / 'index.html').write_text(shell(t, d, body, js, mode=(mode[0] if mode else 'daily' if slug == 'daily-path' else '')))
    print('wrote', slug + '/')
