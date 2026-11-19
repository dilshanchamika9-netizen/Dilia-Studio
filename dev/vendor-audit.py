#!/usr/bin/env python3
"""Check vendored library versions (dev/vendor-versions.json) for known vulnerabilities.
Source 1: npm registry bulk advisory API. Source 2 (fallback): OSV.dev. Both free, no key.
Exit 0 clean, 1 vulnerable, 2 no source reachable (CI treats 2 as failure so nothing is silently skipped)."""
import json, sys, urllib.request
V = json.load(open('dev/vendor-versions.json'))['npm']
def post(url, body):
    r = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=30))
def npm():
    res = post('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {n: [v] for n, v in V.items()})
    # bulk returns advisories for any version of the package; keep those whose range covers our version
    out = {}
    for n, advs in res.items():
        for a in advs:
            if covers(a.get('vulnerable_versions', ''), V[n]): out.setdefault(n, []).append(a.get('url') or a.get('title'))
    return out
def osv():
    res = post('https://api.osv.dev/v1/querybatch', {'queries': [{'package': {'ecosystem': 'npm', 'name': n}, 'version': v} for n, v in V.items()]})['results']
    return {n: [x['id'] for x in r['vulns']] for n, r in zip(V, res) if r.get('vulns')}
def ver(s): return tuple(int(x) for x in (s.split('-')[0].split('.') + ['0', '0'])[:3])
def covers(rng, v):
    """Minimal semver range check for advisory ranges like '<1.2.3', '>=1.0.0 <1.4.2', '<=2.0.0 || >=3.0.0 <3.1.0'."""
    for alt in rng.split('||'):
        ok = True
        for part in alt.split():
            for op in ('>=', '<=', '>', '<', '='):
                if part.startswith(op):
                    a, b = ver(v), ver(part[len(op):])
                    ok &= {'>=': a >= b, '<=': a <= b, '>': a > b, '<': a < b, '=': a == b}[op]; break
        if ok and alt.strip(): return True
    return False
for name, fn in (('npm advisories', npm), ('OSV', osv)):
    try: bad = fn(); src = name; break
    except Exception as e: print(f'vendor-audit: {name} unreachable: {e}')
else: print('vendor-audit: no source reachable'); sys.exit(2)
for n, ids in bad.items(): print(f'VULNERABLE {n} {V[n]}: {", ".join(map(str, ids))}')
print(f'vendor-audit ({src}): {len(V)} libraries checked, {len(bad)} with known vulnerabilities')
sys.exit(1 if bad else 0)
