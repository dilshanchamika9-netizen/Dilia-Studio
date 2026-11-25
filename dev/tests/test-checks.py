#!/usr/bin/env python3
"""Tests for the Pulse rule checks: each rule must catch a deliberately bad story and pass a good one."""
import copy, importlib.util, os, sys
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def load(name, f):
    s = importlib.util.spec_from_file_location(name, os.path.join(R, 'dev', f)); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m
C = load('c', 'check-posts.py'); V = load('v', 'verify-numbers.py')
good = dict(slug='t', title='Acme reports sales of $5.0 billion', desc='Sales rose.', facts=['a', 'b', 'c'],
            body=['Acme said revenue was $5.0 billion, up 10 per cent.'],
            sources=[('r', 'https://investors.acme.com/q3'), ('n', 'https://news.example.com/a')])
fails = []
def expect(label, post, needle):
    errs = C.check(post)
    ok = (needle in ' '.join(errs)) if needle else (not errs)
    print('ok  ' if ok else 'FAIL', label, errs if not ok else '')
    if not ok: fails.append(label)
expect('good story passes', good, None)
p = copy.deepcopy(good); p['body'] = ['He said "' + ' '.join(['word'] * 16) + '" today.']; expect('long quote caught', p, 'quote of 16 words')
p = copy.deepcopy(good); p['body'] = ['"one two three four" and "five six seven eight" and "nine ten eleven twelve"']; expect('quote per source caught', p, 'one quote per source')
p = copy.deepcopy(good); p['body'] = ['He said "spicy mode" and "ok then".']; expect('short scare quotes allowed', p, None)
p = copy.deepcopy(good); p['sources'] = [('n', 'https://news.example.com/a')]; expect('single news source caught', p, 'needs 2+ sources')
p = copy.deepcopy(good); p['sources'] = [('s', 'https://www.sec.gov/Archives/x.htm')]; expect('single SEC source allowed', p, None)
p = copy.deepcopy(good); p['sources'] = [('a', 'https://news.example.com/a'), ('b', 'https://news.example.com/a')]; expect('duplicate source caught', p, 'duplicate')
p = copy.deepcopy(good); p['title'] = 'State sues Acme'; expect('lawsuit without allegation caught', p, 'alleg')
p = copy.deepcopy(good); p['title'] = 'State sues Acme'; p['body'].append('The state alleges harm.'); expect('lawsuit with allegation passes', p, None)
p = copy.deepcopy(good); p['body'] = ['Investors should buy now.']; expect('advice caught', p, 'investment-advice')
p = copy.deepcopy(good); p['body'] = ['Best Buy now expects growth.']; expect('Best Buy not flagged', p, None)
p = copy.deepcopy(good); p['title'] = 'Anthropic launches a tool'; expect('maker note required', p, 'Anthropic/Claude')
p = copy.deepcopy(good); p['title'] = 'Anthropic launches a tool'; p['note'] = 'Dilia writes with Claude, made by Anthropic.'; expect('maker note passes', p, None)
# number check
figs = V.figures(good); print('figures', figs)
assert '5.0' in figs and '10' in figs, figs
miss = V.verify(good, ['Revenue was 5.0 billion dollars, up 10 per cent.']); ok = miss == []; print('ok  ' if ok else 'FAIL', 'number found'); fails += [] if ok else ['num1']
miss = V.verify(good, ['Revenue was 4.9 billion dollars, up 10 per cent.']); ok = miss == ['5.0']; print('ok  ' if ok else 'FAIL', 'wrong number caught', miss); fails += [] if ok else ['num2']
ok = V.norm('<p>$54,900 million</p><script>9.9</script>') .count('9.9') == 0 and '54900' in V.norm('54,900'); print('ok  ' if ok else 'FAIL', 'normalise'); fails += [] if ok else ['norm']
print('FAILS', fails); sys.exit(1 if fails else 0)
