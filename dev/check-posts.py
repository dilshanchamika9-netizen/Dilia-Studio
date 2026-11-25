#!/usr/bin/env python3
"""Pulse story rules, enforced by code (offline, runs in the release gate).
Mirrors dilia-hq/05-compliance/PULSE-CONTENT-RULES.md. Exit 1 on any breach.
Checks: quote length and count, source count and quality, allegation wording for legal stories,
conflict note for stories about Claude's maker, no investment-advice phrasing, disclosure on built pages."""
import importlib.util, os, re, sys
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUOTE = re.compile(r'[“"]([^“”"\n]{1,400})[”"]')
LEGAL = re.compile(r'\b(sues?|sued|lawsuits?|suits?|accus\w+|charged|indict\w+|investigat\w+|probe|fraud)\b', re.I)
ADVICE = re.compile(r'\b(you should (buy|sell)|(?<!Best )buy now|sell now|price target|guaranteed (return|profit)s?|can\'t lose)\b', re.I)
MAKER = re.compile(r'\b(anthropic|claude)\b', re.I)
OFFICIAL_HOST = re.compile(r'(^|\.)(sec\.gov|europa\.eu)$|\.gov$|\.gov\.[a-z]{2}$|^(investors?|ir|corporate|press|newsroom)\.')


def load_posts():
    s = importlib.util.spec_from_file_location('np', os.path.join(ROOT, 'dev', 'news-posts.py'))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m.POSTS


def texts(p):
    return [p['title'], p['desc'], p.get('note', '')] + list(p['facts']) + list(p['body'])


def check(p):
    errs = []
    slug = p['slug']
    srcs = p['sources']
    urls = [u for _, u in srcs]
    if len(set(urls)) != len(urls):
        errs.append('duplicate source URL')
    official = any(OFFICIAL_HOST.search(urlparse(u).hostname or '') for u in urls)
    if len(srcs) < 2 and not official:
        errs.append('needs 2+ sources, or one primary source (SEC filing, government or company release)')
    # quotes: under 15 words; one quote per source; very short scare quotes (3 words or fewer) are terms, not quotes
    n_quotes = 0
    for t in texts(p):
        for q in QUOTE.findall(t):
            w = len(q.split())
            if w >= 15:
                errs.append(f'quote of {w} words (limit: under 15): "{q[:40]}..."')
            elif w >= 4:
                n_quotes += 1
    if n_quotes > len(srcs):
        errs.append(f'{n_quotes} quotes but only {len(srcs)} sources (one quote per source)')
    # legal wording
    blob = ' '.join(texts(p))
    head = ' '.join([p['title'], p['desc']] + p['body'])
    if LEGAL.search(head) and not re.search(r'alleg', blob, re.I):
        errs.append('legal or accusation story without "alleges/allegation" wording')
    # advice
    if ADVICE.search(blob):
        errs.append('investment-advice phrasing')
    # conflict note for the maker of the writing tool
    if MAKER.search(' '.join([p['title'], p['desc']])) and not re.search(r'anthropic', p.get('note', ''), re.I):
        errs.append('story about Anthropic/Claude needs a note that Dilia writes with Claude (made by Anthropic)')
    return [f'{slug}: {e}' for e in errs]


def check_built(p):
    path = os.path.join(ROOT, 'news', p['slug'], 'index.html')
    if not os.path.exists(path):
        return [f"{p['slug']}: built page missing (run make-news.py)"]
    h = open(path, encoding='utf-8').read()
    errs = []
    if 'not investment advice' not in h.lower():
        errs.append('disclosure line missing on page')
    if 'AI' not in h:
        errs.append('AI disclosure missing')
    return [f"{p['slug']}: {e}" for e in errs]


def main():
    posts = load_posts()
    errs = []
    for p in posts:
        errs += check(p)
        errs += check_built(p)
    print(f'{len(posts)} stories checked')
    for e in errs:
        print('FAIL', e)
    print('PULSE RULES OK' if not errs else f'{len(errs)} problem(s)')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main())
