#!/usr/bin/env python3
"""Pulse number check (needs internet: run from GitHub Actions, not the sandbox).
For each story, fetch every cited source and check that each figure in the facts and body appears in at least
one source text. Prints figures not found and sources that could not be read.
SEC pages need a contact in the user agent: set env SEC_CONTACT. Without it SEC sources count as unreadable.
Usage: verify-numbers.py [slug ...] [--strict]   (--strict: exit 1 if any figure is unverified)"""
import importlib.util, os, re, sys, urllib.request, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIG = re.compile(r'(?<![\w.])\$?\d[\d,]*(?:\.\d+)?(?=\s*(?:%|per cent|billion|million|thousand|points?|bn|m\b)|\b)')


def load_posts():
    s = importlib.util.spec_from_file_location('np', os.path.join(ROOT, 'dev', 'news-posts.py'))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m.POSTS


def figures(p):
    """Figures worth checking: money, percentages, decimals, and numbers of 3+ digits. Years and tiny counts are skipped."""
    out = set()
    for t in list(p['facts']) + list(p['body']):
        for m in FIG.finditer(t):
            tok = m.group(0).lstrip('$').replace(',', '')
            if not tok:
                continue
            tail = t[m.end():m.end() + 12].lower()
            has_unit = bool(re.match(r'\s*(%|per cent|billion|million|points?|bn)', tail)) or m.group(0).startswith('$')
            if re.fullmatch(r'(19|20)\d\d', tok):
                continue
            if '.' in tok or has_unit or len(tok.replace('.', '')) >= 3:
                out.add(tok)
    return sorted(out)


def norm(text):
    text = html.unescape(re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', text, flags=re.S | re.I))
    text = re.sub(r'<[^>]+>', ' ', text)
    return re.sub(r'(?<=\d),(?=\d)', '', text)


def fetch(url):
    contact = os.environ.get('SEC_CONTACT', '')
    if 'sec.gov' in url and not contact:
        return None, 'SEC needs SEC_CONTACT'
    ua = f'DiliaPulseCheck/1.0 ({contact})' if contact else 'Mozilla/5.0 (compatible; DiliaPulseCheck/1.0)'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': ua})
        with urllib.request.urlopen(req, timeout=25) as r:
            return norm(r.read(3_000_000).decode('utf-8', 'replace')), ''
    except Exception as e:
        return None, str(e)[:80]


def verify(p, texts):
    """texts: list of source texts that were readable. Returns figures not found in any."""
    blob = ' '.join(texts)
    return [f for f in figures(p) if f not in blob]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    strict = '--strict' in sys.argv
    posts = [p for p in load_posts() if not args or p['slug'] in args]
    bad = 0
    for p in posts:
        texts, unread = [], []
        for label, url in p['sources']:
            t, err = fetch(url)
            (texts.append(t) if t is not None else unread.append((url, err)))
        missing = verify(p, texts) if texts else figures(p)
        print(f"\n{p['slug']}: {len(figures(p))} figures, {len(texts)}/{len(p['sources'])} sources readable")
        for u, e in unread:
            print('  unreadable:', u, '-', e)
        if missing:
            print('  NOT FOUND in readable sources (check by hand):', ', '.join(missing))
            bad += len(missing)
    print(f'\n{bad} figure(s) unverified')
    return 1 if (strict and bad) else 0


if __name__ == '__main__':
    sys.exit(main())
