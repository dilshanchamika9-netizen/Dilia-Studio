"""Gives every page the same main menu (Tools, Life, Play, Pulse) and the same Dilia footer links. Idempotent: run after any page generator."""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
NAV = re.compile(r'<nav class="links" aria-label="Main">.*?</nav>', re.S)
SKIP = {'dev', 'node_modules', '.git', 'desktop'}

def nav(p, area=''):
    cur = lambda a: ' aria-current="page"' if a == area else ''
    return ('<nav class="links" aria-label="Main">\n'
      '      <button type="button" class="mbtn" data-menu aria-expanded="false" aria-controls="mega"' + (' data-current' if area == 'tools' else '') + '><i class="adot t"></i>Tools' + CHEV + '</button>\n'
      f'      <a class="opt area-l" href="{p}life/"{cur("life")}><i class="adot l"></i>Life</a>\n'
      f'      <a class="opt area-p" href="{p}play/"{cur("play")}><i class="adot p"></i>Play</a>\n'
      f'      <a class="opt area-r" href="{p}news/"{cur("pulse")}><i class="adot r"></i>Pulse</a>\n'
      '    </nav>')

def area_of(t):
    m = re.search(r'<span class="wm"><span class="w">Dilia</span> ?<span class="l">([^<]*)</span>', t)
    line = m.group(1) if m else ''
    return {'Life': 'life', 'Play': 'play', 'Pulse': 'pulse', 'Guides': ''}.get(line, 'tools' if line else '')

# One footer on every page (concept C). Only links to pages that exist.
FCOLS = [('PDF', [('Merge PDF', 'merge-pdf/'), ('Compress PDF', 'compress-pdf/'), ('Split PDF', 'split-pdf/'), ('Sign PDF', 'sign-pdf/'), ('PDF to JPG', 'pdf-to-jpg/'), ('All PDF tools', 'pdf/')]),
         ('Image', [('Compress image', 'compress-image/'), ('Resize image', 'resize-image/'), ('HEIC to JPG', 'heic-to-jpg/'), ('Crop image', 'crop-image/'), ('All image tools', 'image/')]),
         ('Life', [('Public holidays', 'public-holidays/'), ('World clock', 'world-clock/'), ('Holiday planner', 'holiday-planner/'), ('Trip planner', 'trip-planner/'), ('All of Life', 'life/')]),
         ('Play', [('Daily path', 'daily-path/'), ('Daily sudoku', 'daily-sudoku/'), ('Solitaire', 'solitaire/'), ('Chess', 'chess/'), ('All games', 'play/')]),
         ('Dilia', [('All tools', 'tools.html'), ('Pulse', 'news/'), ('Guides', 'blog/'), ('Privacy', 'privacy/')])]
FOOT = re.compile(r'<footer class="(?:foot|sfoot)">.*?</footer>', re.S)
def footer(p):
    cols = ''.join(f'<div><h2>{h}</h2><ul>' + ''.join(f'<li><a href="{p}{u}">{n}</a></li>' for n, u in l) + '</ul></div>' for h, l in FCOLS)
    return (f'<footer class="sfoot"><div class="wrap"><div class="cols"><div><a class="brand" href="{p or "./"}"><svg><use href="#mark"/></svg><span class="wm"><span class="w">Dilia</span></span></a>'
            f'<p>Everyday tools that work on your device. Free, no sign-up.</p></div>{cols}</div>'
            '<div class="bot"><span>&copy; <span data-year></span> Dilia</span><span>Nothing you add leaves your device.</span></div></div></footer>')

# GitHub Pages ignores _headers, so the same Content-Security-Policy goes into every page as a meta tag.
# frame-ancestors only works as a real header (browsers ignore it in a meta tag), so it is left out here.
_CSP = next(l.split(': ', 1)[1] for l in (ROOT / '_headers').read_text().splitlines() if l.strip().startswith('Content-Security-Policy:'))
CSP = '; '.join(d.strip() for d in _CSP.split(';') if d.strip() and not d.strip().startswith('frame-ancestors'))
META = f'<meta http-equiv="Content-Security-Policy" content="{CSP}">\n<meta name="referrer" content="no-referrer">'
OLD_META = re.compile(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">\n<meta name="referrer" content="no-referrer">')

def csp_all():
    n = 0
    for f in sorted(ROOT.rglob('*.html')):
        rel = f.relative_to(ROOT)
        if rel.parts[0] in SKIP or 'vendor' in rel.parts: continue
        s = f.read_text()
        if '<head>' not in s and '<head ' not in s: continue
        t = OLD_META.sub(META, s, count=1) if OLD_META.search(s) else re.sub(r'(<meta charset="utf-8">)', lambda m: m.group(1) + '\n' + META, s, count=1)
        if t != s: f.write_text(t); n += 1
    return n

# Accessible names must contain the visible text (WCAG 2.5.3, axe label-content-name-mismatch): the brand link and the header
# search button take their name from what they show; the shortcut keys are hidden from screen readers and named once.
BRAND_LABEL = re.compile(r'(<a class="brand"[^>]*?) aria-label="Dilia[^"]*"')
SBTN = re.compile(r'<button type="button" class="sbtn" data-palette aria-label="[^"]*">')
def a11y_names(t):
    t = BRAND_LABEL.sub(r'\1', t)
    t = t.replace('<span class="w">Dilia</span><span class="l">', '<span class="w">Dilia</span> <span class="l">')
    t = SBTN.sub('<button type="button" class="sbtn" data-palette aria-keyshortcuts="Control+K">', t)
    t = t.replace('<span class="k" data-mod>Ctrl</span><span class="k">K</span>', '<span class="k" data-mod aria-hidden="true">Ctrl</span><span class="k" aria-hidden="true">K</span>')
    return t

def run():
    n = 0
    for f in sorted(ROOT.rglob('*.html')):
        rel = f.relative_to(ROOT)
        if rel.parts[0] in SKIP: continue
        s = f.read_text()
        if '<nav class="links" aria-label="Main">' not in s: continue
        p = '../' * (len(rel.parts) - 1)
        t = NAV.sub(lambda m: nav(p, area_of(s)), s, count=1)
        if not rel.parts[0] == 'news':                        # Pulse keeps its own masthead footer
            t = FOOT.sub(lambda m: footer(p), t, count=1) if FOOT.search(t) else (re.sub(r'(</main>)(?![\s\S]*</main>)', lambda m: m.group(1) + '\n' + footer(p), t, count=1))
        t = t.replace(f'<li><a href="{p}blog/">Read</a></li>', f'<li><a href="{p}news/">Pulse</a></li><li><a href="{p}blog/">Guides</a></li>')   # footer: Read was renamed Pulse (owner, 25 Nov 2026)
        t = t.replace(f'<li><a href="{p}news/">Read</a></li>', f'<li><a href="{p}news/">Pulse</a></li>')
        t = a11y_names(t)
        if 'assets/dark.css' not in t:
            t = re.sub(r'(<link rel="stylesheet" href="[^"]*assets/[a-z\-]+\.css">)(?![\s\S]*<link rel="stylesheet")', lambda m: m.group(1) + f'\n<link rel="stylesheet" href="{p}assets/dark.css">', t, count=1)
        if 'assets/theme.js' not in t:
            t = t.replace('</head>', f'<script src="{p}assets/theme.js"></script>\n</head>', 1)
        if t != s: f.write_text(t); n += 1
    n += csp_all()
    import importlib.util as _u                      # SEO base layer last, so it sees the final page (DR-02 §11.1)
    _s = _u.spec_from_file_location('seopass', str(ROOT / 'dev' / 'seopass.py')); _m = _u.module_from_spec(_s); _s.loader.exec_module(_m)
    return n + _m.run()

if __name__ == '__main__': print('menu updated on', run(), 'pages')
