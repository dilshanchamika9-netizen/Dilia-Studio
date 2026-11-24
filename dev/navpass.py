"""Gives every page the same main menu (Tools, Life, Play, Pulse) and the same Dilia footer links. Idempotent: run after any page generator."""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
NAV = re.compile(r'<nav class="links" aria-label="Main">.*?</nav>', re.S)
SKIP = {'dev', 'node_modules', '.git', 'desktop'}

def nav(p):
    return ('<nav class="links" aria-label="Main">\n'
      '      <button type="button" class="mbtn" data-menu aria-expanded="false" aria-controls="mega"><i class="adot t"></i>Tools' + CHEV + '</button>\n'
      f'      <a class="opt" href="{p}life/"><i class="adot l"></i>Life</a>\n'
      f'      <a class="opt" href="{p}play/"><i class="adot p"></i>Play</a>\n'
      f'      <a class="opt" href="{p}news/"><i class="adot r"></i>Pulse</a>\n'
      '    </nav>')

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

def run():
    n = 0
    for f in sorted(ROOT.rglob('*.html')):
        rel = f.relative_to(ROOT)
        if rel.parts[0] in SKIP: continue
        s = f.read_text()
        if '<nav class="links" aria-label="Main">' not in s: continue
        p = '../' * (len(rel.parts) - 1)
        t = NAV.sub(lambda m: nav(p), s, count=1)
        t = t.replace(f'<li><a href="{p}blog/">Read</a></li>', f'<li><a href="{p}news/">Pulse</a></li><li><a href="{p}blog/">Guides</a></li>')   # footer: Read was renamed Pulse (owner, 25 Nov 2026)
        t = t.replace(f'<li><a href="{p}news/">Read</a></li>', f'<li><a href="{p}news/">Pulse</a></li>')
        if 'assets/dark.css' not in t:
            t = re.sub(r'(<link rel="stylesheet" href="[^"]*assets/[a-z\-]+\.css">)(?![\s\S]*<link rel="stylesheet")', lambda m: m.group(1) + f'\n<link rel="stylesheet" href="{p}assets/dark.css">', t, count=1)
        if 'assets/theme.js' not in t:
            t = t.replace('</head>', f'<script src="{p}assets/theme.js"></script>\n</head>', 1)
        if t != s: f.write_text(t); n += 1
    return n + csp_all()

if __name__ == '__main__': print('menu updated on', run(), 'pages')
