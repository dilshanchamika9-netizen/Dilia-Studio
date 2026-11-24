#!/usr/bin/env python3
"""Dilia security gate (static checks). Run from repo root: python3 dev/security-check.py
Fails (exit 1) on: inline <script>, inline event handlers, eval/new Function/document.write,
remote script/style/fetch URLs, vendor files that differ from dev/vendor-hashes.json,
vendor libraries without a licence file, pdf-lib pages without the worker guard, qpdf on the main thread. Use --update to rewrite the vendor hash list."""
import re, sys, json, glob, hashlib, os
bad = []
def sha(p): return hashlib.sha256(open(p,'rb').read()).hexdigest()
vend = sorted(p for p in glob.glob('assets/vendor/**/*', recursive=True) if os.path.isfile(p))
cur = {p: sha(p) for p in vend}
if '--update' in sys.argv:
    json.dump(cur, open('dev/vendor-hashes.json','w'), indent=1, sort_keys=True); print('hashes written', len(cur)); sys.exit()
pin = json.load(open('dev/vendor-hashes.json'))
for p in sorted(set(cur)|set(pin)):
    if cur.get(p) != pin.get(p): bad.append(f'vendor file changed/added/removed without approval: {p}')
ALL_HTML = sorted(p for p in glob.glob('**/*.html', recursive=True) if p.split('/')[0] not in ('dev', 'desktop', 'node_modules') and '/vendor/' not in p)   # every published page, any depth
for p in ALL_HTML:
    s = open(p, encoding='utf8').read()
    if 'http-equiv="Content-Security-Policy"' not in s: bad.append(f'{p}: no CSP meta tag (GitHub Pages ignores _headers)')
    for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S):
        if 'application/ld+json' not in m.group(0)[:80]: bad.append(f'{p}: inline script')
    if re.search(r'<style[\s>]', s): bad.append(f'{p}: inline <style> block (CSP style-src self)')
    if re.search(r'\son[a-z]+\s*=\s*["\']', s): bad.append(f'{p}: inline event handler')
    for m in re.finditer(r'<(?:script|link|img|iframe)[^>]+(?:src|href)=["\'](https?:)?//', s):
        if 'rel="canonical"' not in m.group(0) and 'rel="alternate"' not in m.group(0): bad.append(f'{p}: external resource {m.group(0)[:70]}')
for p in glob.glob('assets/*.js'):
    s = open(p, encoding='utf8').read()
    for pat in (r'\beval\s*\(', r'new\s+Function\s*\(', r'document\.write\s*\(', r'\bfetch\s*\(\s*[\'"`]https?:', r'XMLHttpRequest', r'sendBeacon', r'WebSocket\s*\(', r'importScripts\s*\(\s*[\'"]https?:'):
        if re.search(pat, s): bad.append(f'{p}: forbidden pattern {pat}')
# CVE-2024-4367: every pdf.js getDocument call must disable eval-based font rendering
for p in glob.glob('assets/*.js'):
    for m in re.finditer(r'getDocument\(\{[^}]*\}', open(p, encoding='utf8').read()):
        if 'isEvalSupported: false' not in m.group(0): bad.append(f'{p}: pdf.js getDocument without isEvalSupported: false')
# Untrusted PDFs are read in a worker with a time limit first (assets/guard.js); qpdf never runs on the page itself
for p in ALL_HTML:
    s = open(p, encoding='utf8').read()
    i = s.find('vendor/pdf-lib.min.js"></script>')
    if i >= 0 and 'assets/guard.js"></script>' not in s[i:i + 120]: bad.append(f'{p}: pdf-lib loaded without assets/guard.js right after it')
    if 'vendor/qpdf.js' in s: bad.append(f'{p}: qpdf loaded on the main thread (use DiliaGuard.qpdf)')
for p in glob.glob('assets/*.js'):
    if p != 'assets/guard-worker.js' and re.search(r'\bModule\s*\(\s*\{', open(p, encoding='utf8').read()): bad.append(f'{p}: qpdf Module() on the main thread (use DiliaGuard.qpdf)')
lic = {'pdf-lib':'pdf-lib','pdfjs':'pdf.','sortable':'Sortable','qpdf':'qpdf','utif':'UTIF','pako':'pako','upng':'UPNG','svgo':'svgo','gifenc':'gifenc','gifuct':'gifuct','heic2any':'heic2any','jsquash':'jsquash','qrcode-generator':'qrcode-generator','jsqr':'jsqr'}
for k in lic:
    if not glob.glob(f'assets/vendor/{k}-LICENSE.txt'): bad.append(f'missing licence file: {k}')
print('\n'.join(bad) or 'security-check: OK', f'({len(cur)} vendor files pinned)')
sys.exit(1 if bad else 0)
