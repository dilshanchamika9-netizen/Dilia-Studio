#!/usr/bin/env python3
"""Builds data/news.json for the Read area from two free public sources:
  1. Hacker News official API (tech headlines): https://github.com/HackerNews/API
  2. SEC EDGAR submissions API (business filings of a fixed list of large companies): https://www.sec.gov/edgar/searchedgar/accessing-edgar-data.htm
Only headlines, facts and links are kept (no article text). Standard library only. Runs on GitHub Actions; the SEC part needs the
declared contact in env SEC_UA (SEC fair-access rule). If a source fails, the old data for it is kept and the run still succeeds."""
import json, os, re, sys, time, urllib.request, urllib.error, datetime as dt, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'data' / 'news.json'
HN = 'https://hacker-news.firebaseio.com/v0/'
HN_COUNT = 40
# (name shown, CIK, words that must appear in the company name SEC returns: a wrong number is dropped, never shown)
COMPANIES = [('Apple', 320193, 'apple'), ('Microsoft', 789019, 'microsoft'), ('Alphabet (Google)', 1652044, 'alphabet'), ('Amazon', 1018724, 'amazon'),
             ('Nvidia', 1045810, 'nvidia'), ('Meta', 1326801, 'meta'), ('Tesla', 1318605, 'tesla'), ('Netflix', 1065280, 'netflix'),
             ('Oracle', 1341439, 'oracle'), ('Intel', 50863, 'intel'), ('AMD', 2488, 'advanced micro'), ('Salesforce', 1108524, 'salesforce'),
             ('Adobe', 796343, 'adobe'), ('JPMorgan Chase', 19617, 'jpmorgan'), ('Walmart', 104169, 'walmart')]
FORMS = {'8-K': 'Current report', '10-Q': 'Quarterly report', '10-K': 'Annual report'}
ITEMS = {'1.01': 'material agreement', '1.05': 'cybersecurity incident', '2.01': 'completed acquisition or sale', '2.02': 'financial results',
         '2.03': 'new debt', '3.02': 'share sale', '5.02': 'director or executive change', '5.07': 'shareholder vote', '7.01': 'public disclosure', '8.01': 'other event'}
MAX_AGE_DAYS = 45
SEC_PER_COMPANY = 2

def clean(t, n=200):
    t = re.sub(r'[\x00-\x1f\x7f<>]', ' ', str(t or '')); return re.sub(r'\s+', ' ', t).strip()[:n]

def http_json(url, ua, tries=3):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': ua, 'Accept-Encoding': 'identity'})
            with urllib.request.urlopen(req, timeout=20) as r:
                if r.status != 200: raise urllib.error.HTTPError(url, r.status, 'status', r.headers, None)
                return json.loads(r.read(2_000_000).decode('utf-8'))
        except Exception as e:
            if k == tries - 1: raise
            time.sleep(2 * (k + 1))

def hn_items(get, now):
    ids = get(HN + 'topstories.json'); out = []
    if not isinstance(ids, list): raise ValueError('topstories is not a list')
    for i in ids[:HN_COUNT + 20]:
        if len(out) >= HN_COUNT: break
        if not isinstance(i, int): continue
        it = get(HN + f'item/{i}.json')
        if not isinstance(it, dict) or it.get('type') != 'story' or it.get('dead') or it.get('deleted'): continue
        url = clean(it.get('url'), 500); title = clean(it.get('title'))
        if not title or not re.match(r'^https?://[^\s/]+', url): continue
        dom = re.sub(r'^www\.', '', re.match(r'^https?://([^/:?#]+)', url).group(1).lower())
        out.append({'id': i, 'title': title, 'url': url, 'domain': clean(dom, 80), 'score': int(it.get('score') or 0), 'comments': int(it.get('descendants') or 0), 'time': int(it.get('time') or now)})
    if len(out) < 10: raise ValueError(f'only {len(out)} usable HN stories')
    return out

def sec_items(get, today):
    out = []; cutoff = today - dt.timedelta(days=MAX_AGE_DAYS); notes = []
    for name, cik, must in COMPANIES:
        try: d = get(f'https://data.sec.gov/submissions/CIK{cik:010d}.json')
        except Exception as e: notes.append(f'{name}: {type(e).__name__}'); continue
        if not isinstance(d, dict) or must not in str(d.get('name', '')).lower(): notes.append(f'{name}: name mismatch'); continue
        r = (d.get('filings') or {}).get('recent') or {}; n = 0
        for form, date, acc, doc, items in zip(r.get('form', []), r.get('filingDate', []), r.get('accessionNumber', []), r.get('primaryDocument', []), r.get('items', []) + [''] * 1000):
            if form not in FORMS or n >= SEC_PER_COMPANY: continue
            try: day = dt.date.fromisoformat(date)
            except Exception: continue
            if day < cutoff or day > today + dt.timedelta(days=1) or not re.fullmatch(r'\d{10}-\d{2}-\d{6}', str(acc)) or not re.fullmatch(r'[\w.\-]+', str(doc)): continue
            what = [ITEMS[c] for c in str(items).split(',') if c.strip() in ITEMS][:3]
            out.append({'company': name, 'form': form, 'kind': FORMS[form], 'date': date, 'about': what, 'url': f'https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace("-", "")}/{doc}'}); n += 1
        time.sleep(0.2)   # well under the SEC limit of 10 requests a second
    out.sort(key=lambda x: (x['date'], x['company']), reverse=True)
    return out, notes

def build(get_hn, get_sec, old, now=None, sec_ok=True, use_hn=True):
    now = now or int(time.time()); res = {'updated': dt.datetime.fromtimestamp(now, dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'hn': old.get('hn', []) if use_hn else [], 'sec': old.get('sec', []), 'notes': []}
    if use_hn:
        try: res['hn'] = hn_items(get_hn, now)
        except Exception as e: res['notes'].append('hn kept old: ' + clean(e, 100))
    if sec_ok:
        try:
            s, notes = sec_items(get_sec, dt.datetime.fromtimestamp(now, dt.timezone.utc).date()); res['notes'] += notes
            if len(s) >= 3: res['sec'] = s
            else: res['notes'].append('sec kept old: too few results')
        except Exception as e: res['notes'].append('sec kept old: ' + clean(e, 100))
    else: res['notes'].append('sec skipped: no contact set')
    return res

def valid(o):
    """Safety check on the file before it is committed."""
    if not isinstance(o, dict) or not re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ', str(o.get('updated'))): return False
    for k in ('hn', 'sec'):
        if not isinstance(o.get(k), list) or len(o[k]) > 100: return False
        for x in o[k]:
            if not isinstance(x, dict) or not re.match(r'^https?://', str(x.get('url', ''))) or any(c in json.dumps(x) for c in ('<script', '<img', 'javascript:')): return False
    return True

def main():
    old = {}
    try: old = json.loads(OUT.read_text())
    except Exception: pass
    sec_ua = os.environ.get('SEC_UA', '').strip()
    res = build(lambda u: http_json(u, 'Dilia news reader (https://dilshanchamika9-netizen.github.io/Dilia-Studio/)'), lambda u: http_json(u, sec_ua), old, sec_ok=bool(sec_ua), use_hn=False)  # owner decision 25 Nov 2026: no Hacker News; the file is now a fact queue for writing own stories
    if not valid(res): print('refusing to write: failed the safety check'); return 1
    OUT.parent.mkdir(exist_ok=True); OUT.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    print('hn', len(res['hn']), 'sec', len(res['sec']), 'notes', res['notes']); return 0

if __name__ == '__main__': sys.exit(main())
