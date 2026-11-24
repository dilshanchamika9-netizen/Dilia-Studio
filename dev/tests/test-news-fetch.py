"""news-fetch.py with fake responses (no network)."""
import importlib.util, json, sys, datetime as dt, pathlib
spec = importlib.util.spec_from_file_location('nf', pathlib.Path(__file__).resolve().parent.parent / 'news-fetch.py'); nf = importlib.util.module_from_spec(spec); spec.loader.exec_module(nf)
fails = []; n = 0
def ok(c, m):
    global n
    if c: n += 1
    else: fails.append(m); print('FAIL', m)
NOW = int(dt.datetime(2026, 11, 24, 12, 0, tzinfo=dt.timezone.utc).timestamp())
def hn_get(url):
    if url.endswith('topstories.json'): return list(range(1, 80))
    i = int(url.split('/')[-1][:-5])
    if i % 10 == 0: return {'type': 'story', 'dead': True, 'title': 'dead', 'url': 'https://x.com/a'}      # dead
    if i % 10 == 1: return {'type': 'job', 'title': 'job', 'url': 'https://x.com/j'}                       # not a story
    if i % 10 == 2: return {'type': 'story', 'title': 'Ask HN: no link'}                                   # no url
    if i == 3: return {'type': 'story', 'title': 'Bad <script>alert(1)</script> title', 'url': 'https://www.Example.com/a?b=1', 'score': 5, 'descendants': 2, 'time': NOW - 100}
    if i == 4: return {'type': 'story', 'title': 'javascript link', 'url': 'javascript:alert(1)'}
    return {'type': 'story', 'title': f'Story {i}', 'url': f'https://site{i}.org/p', 'score': i, 'descendants': 1, 'time': NOW - i}
items = nf.hn_items(hn_get, NOW)
ok(len(items) == 40, f'40 HN stories {len(items)}'); ok(all(x['url'].startswith('http') for x in items), 'only http links'); ok(not any(x['id'] % 10 in (0, 1, 2) for x in items), 'dead/job/no-url dropped')
t3 = [x for x in items if x['id'] == 3][0]; ok('<' not in t3['title'] and '>' not in t3['title'], 'angle brackets stripped: ' + t3['title']); ok(t3['domain'] == 'example.com', 'domain lowercased without www: ' + t3['domain'])
ok(not any(x['id'] == 4 for x in items), 'javascript: url dropped')
try: nf.hn_items(lambda u: [1, 2] if u.endswith('topstories.json') else {'type': 'story', 'title': 't', 'url': 'https://a.b/c'}, NOW); ok(False, 'too few stories must raise')
except ValueError: ok(True, 'too few stories raises')
def sec_get(url):
    cik = int(url.split('CIK')[1][:10])
    if cik == 320193: return {'name': 'Apple Inc.', 'filings': {'recent': {'form': ['4', '10-Q', '8-K', '8-K', '8-K', '10-K'], 'filingDate': ['2026-11-20', '2026-11-01', '2026-10-30', '2026-10-20', '2026-10-10', '2026-09-30'],
        'accessionNumber': ['0000320193-26-000001', '0000320193-26-000002', '0000320193-26-000003', '0000320193-26-000004', '0000320193-26-000005', '0000320193-26-000006'], 'primaryDocument': ['a.xml', 'aapl-10q.htm', 'aapl-8k.htm', 'x.htm', 'y.htm', 'k.htm'], 'items': ['', '', '2.02,9.01', '5.02', '1.01', '']}}}
    if cik == 789019: return {'name': 'SOMETHING ELSE CORP', 'filings': {'recent': {}}}
    if cik == 1652044: raise OSError('boom')
    if cik == 1018724: return {'name': 'AMAZON COM INC', 'filings': {'recent': {'form': ['8-K', '8-K'], 'filingDate': ['2026-11-22', '2026-01-01'], 'accessionNumber': ['bad-accession', '0001018724-26-000009'], 'primaryDocument': ['a.htm', '../../etc'], 'items': ['2.02', '']}}}
    return {'name': 'x', 'filings': {}}
s, notes = nf.sec_items(sec_get, dt.date(2026, 11, 24))
ok([x['form'] for x in s if x['company'] == 'Apple'] == ['10-Q', '8-K'], 'Apple: 2 newest of 10-Q/8-K/10-K, Form 4 skipped: ' + str([(x['form'], x['date']) for x in s]))
ok(s[0]['date'] >= s[-1]['date'], 'sorted newest first'); a8 = [x for x in s if x['form'] == '8-K'][0]; ok(a8['about'] == ['financial results'], 'item 2.02 -> financial results (9.01 ignored): ' + str(a8['about']))
ok(a8['url'] == 'https://www.sec.gov/Archives/edgar/data/320193/000032019326000003/aapl-8k.htm', 'filing url built: ' + a8['url'])
ok(not any(x['company'] == 'Microsoft' for x in s) and any('Microsoft: name mismatch' in x for x in notes), 'wrong company name dropped and noted'); ok(any('Alphabet' in x and 'OSError' in x for x in notes), 'failed company noted, run continues')
ok(not any(x['company'] == 'Amazon' for x in s), 'bad accession and old filings dropped')
ok(all('../' not in x['url'] for x in s), 'no path tricks in urls')
old = {'hn': [{'id': 1, 'title': 'old', 'url': 'https://o.com', 'domain': 'o.com', 'score': 1, 'comments': 0, 'time': 1}], 'sec': [{'company': 'Old', 'url': 'https://sec.gov/x'}]}
def boom(u): raise OSError('down')
r = nf.build(boom, boom, old, NOW, True); ok(r['hn'] == old['hn'] and r['sec'] == old['sec'] and len(r['notes']) >= 2, 'both sources down: old data kept: ' + str(r['notes']))
r = nf.build(hn_get, boom, old, NOW, True); ok(len(r['hn']) == 40 and r['sec'] == old['sec'], 'sec down keeps old sec, hn refreshed')
r = nf.build(hn_get, sec_get, old, NOW, False); ok(r['sec'] == old['sec'] and 'sec skipped: no contact set' in r['notes'], 'no contact: sec skipped')
r = nf.build(hn_get, sec_get, old, NOW, True); ok(r['sec'] == old['sec'] and 'sec kept old: too few results' in r['notes'], 'too few sec results keeps old: ' + str(r['notes'][-1:]))
ok(r['updated'] == '2026-11-24T12:00:00Z', 'updated stamp')
ok(nf.valid(r) and not nf.valid({'updated': 'x', 'hn': [], 'sec': []}) and not nf.valid({'updated': '2026-11-24T12:00:00Z', 'hn': [{'url': 'https://a.b', 'title': '<script>x'}], 'sec': []}) and not nf.valid({'updated': '2026-11-24T12:00:00Z', 'hn': [{'url': 'javascript:1'}], 'sec': []}), 'safety check accepts good, rejects bad')
ok(nf.clean('a\x00b\n  c<d>') == 'a b c d', 'clean(): ' + repr(nf.clean('a\x00b\n  c<d>')))
print('FAILS', fails, 'ok', n); sys.exit(1 if fails else 0)
