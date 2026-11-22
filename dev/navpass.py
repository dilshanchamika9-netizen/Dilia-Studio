"""Gives every page the same main menu (Tools, Life, Play, Read). Idempotent: run after any page generator."""
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
      f'      <a class="opt" href="{p}blog/"><i class="adot r"></i>Read</a>\n'
      '    </nav>')

def run():
    n = 0
    for f in sorted(ROOT.rglob('*.html')):
        rel = f.relative_to(ROOT)
        if rel.parts[0] in SKIP: continue
        s = f.read_text()
        if '<nav class="links" aria-label="Main">' not in s: continue
        p = '../' * (len(rel.parts) - 1)
        t = NAV.sub(lambda m: nav(p), s, count=1)
        if t != s: f.write_text(t); n += 1
    return n

if __name__ == '__main__': print('menu updated on', run(), 'pages')
