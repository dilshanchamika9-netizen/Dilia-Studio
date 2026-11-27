"""Whole-site static audit: broken internal links and files, missing anchors, duplicate ids, page basics (title, description,
language, viewport, CSP meta), unsafe new-tab links, plain http links, images without alt text. Exit 1 on any problem.
Run from anywhere: python3 dev/audit.py"""
import pathlib, re, sys, html, urllib.parse
ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {'dev', 'desktop', 'node_modules', '.git', '.github'}
pages = [f for f in sorted(ROOT.rglob('*.html')) if f.relative_to(ROOT).parts[0] not in SKIP and 'vendor' not in f.parts]
probs = []; ids_cache = {}
def ids(f):
    if f not in ids_cache: ids_cache[f] = re.findall(r'\bid="([^"]+)"', f.read_text(errors='replace'))
    return ids_cache[f]
for f in pages:
    rel = f.relative_to(ROOT).as_posix(); s = f.read_text(errors='replace')
    full = '<html' in s[:400].lower(); stub = 'http-equiv="refresh"' in s
    if full:
        if stub:
            if 'http-equiv="Content-Security-Policy"' not in s: probs.append(f'{rel}: no CSP meta')
        elif not re.search(r'<title>[^<]{3,}</title>', s): probs.append(f'{rel}: no title')
        if not stub and '<meta name="description" content="' not in s and 'noindex' not in s: probs.append(f'{rel}: no meta description')
        if not stub and not re.search(r'<html lang="[a-z]', s): probs.append(f'{rel}: no lang on <html>')
        if not stub and 'name="viewport"' not in s: probs.append(f'{rel}: no viewport')
        if not stub and 'http-equiv="Content-Security-Policy"' not in s: probs.append(f'{rel}: no CSP meta (GitHub Pages ignores _headers)')
    d = [x for x in ids(f)]; dup = {x for x in d if d.count(x) > 1}
    if dup: probs.append(f'{rel}: duplicate ids {sorted(dup)[:5]}')
    for m in re.finditer(r'<a\b[^>]*>', s):
        t = m.group(0)
        if 'target="_blank"' in t and 'noopener' not in t: probs.append(f'{rel}: new-tab link without noopener {t[:80]}')
        if re.search(r'href="http://', t): probs.append(f'{rel}: plain http link {t[:80]}')
    for m in re.finditer(r'<img\b[^>]*>', s):
        if 'alt=' not in m.group(0): probs.append(f'{rel}: image without alt {m.group(0)[:60]}')
    for m in re.finditer(r'\b(?:href|src)="([^"]*)"', s):
        u = html.unescape(m.group(1))
        if not u or u.startswith(('http:', 'https:', 'mailto:', 'tel:', 'data:', 'blob:', 'javascript:', '//', '{', '$')): 
            if u.startswith('javascript:'): probs.append(f'{rel}: javascript: link')
            continue
        path, _, frag = u.partition('#'); path = path.split('?')[0]
        if path.startswith('/Dilia-Studio/'): path = str(ROOT) + '/' + path[len('/Dilia-Studio/'):]   # 404.html links absolutely (site path on GitHub Pages)
        tgt = f if not path else (f.parent / urllib.parse.unquote(path)).resolve()
        if path and (tgt.is_dir() or path.endswith('/')): tgt = tgt / 'index.html'
        if not tgt.exists(): probs.append(f'{rel}: broken link {u}'); continue
        if frag and tgt.suffix == '.html' and frag not in ids(tgt) and f'data-sec="{frag}"' not in tgt.read_text(errors='replace') and not re.search(rf'name="{re.escape(frag)}"', tgt.read_text(errors='replace')):
            probs.append(f'{rel}: missing anchor #{frag} in {tgt.relative_to(ROOT).as_posix()}')
for w in ROOT.glob('*.whl'): probs.append(f'{w.name}: stray Python package file published with the site')
for p in probs: print(p)
print(f'audit: {len(pages)} pages, {len(probs)} problems'); sys.exit(1 if probs else 0)
