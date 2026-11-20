"""Builds assets/holidays/<CC>.json from the MIT-licensed python `holidays` package (Vacanza). Run: pip install holidays; python3 dev/make-holidays.py
National (country-wide) public holidays only, English names where the library has them. Estimated moon-based dates are flagged."""
import json, pathlib, re, datetime, sys
import holidays
from importlib.metadata import version
OUT = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'holidays'
Y0, Y1 = 2024, 2035
OUT.mkdir(exist_ok=True)
for f in OUT.glob('*.json'): f.unlink()
EST = re.compile(r'\s*\((estimated|تقديري|අනුමානිත)\)\s*$', re.I)
codes = sorted(c for c in holidays.list_supported_countries().keys() if len(c) == 2 and c.isalpha() and c.isupper())
index = {}
for cc in codes:
    try:
        cls = holidays.country_holidays
        langs = holidays.country_holidays(cc).supported_languages
        lang = 'en_US' if 'en_US' in langs else None
        data = {}
        for y in range(Y0, Y1 + 1):
            h = holidays.country_holidays(cc, years=y, language=lang) if lang else holidays.country_holidays(cc, years=y)
            rows = []
            for d, name in sorted(h.items()):
                if d.year != y: continue
                est = 1 if EST.search(name) else 0
                rows.append([d.strftime('%m-%d'), EST.sub('', name).strip(), est])
            data[str(y)] = rows
    except Exception as e:
        print('skip', cc, e, file=sys.stderr); continue
    if not any(data.values()): continue
    ys = [y for y, v in data.items() if v]; lo, hi = min(ys), max(ys)          # years outside the library's own data come back empty: treat them as "no data", not "no holidays"
    data = {y: v for y, v in data.items() if lo <= y <= hi}
    (OUT / (cc + '.json')).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    index[cc] = sum(len(v) for v in data.values())
meta = {'library': 'holidays', 'version': version('holidays'), 'licence': 'MIT', 'years': [Y0, Y1], 'generated': datetime.date.today().isoformat(), 'countries': sorted(index)}
(OUT / 'index.json').write_text(json.dumps(meta, separators=(',', ':')))
(OUT / 'LICENSE-holidays.txt').write_text('Holiday dates in this folder were generated with the open-source "holidays" package (https://github.com/vacanza/holidays), version %s.\n\n' % meta['version'] + (list((pathlib.Path(holidays.__file__).parent.parent / ('holidays-%s.dist-info' % meta['version']) / 'licenses').glob('LICENSE*')) or [pathlib.Path('/dev/null')])[0].read_text() )
print(len(index), 'countries,', sum(index.values()), 'holidays, version', meta['version'])
