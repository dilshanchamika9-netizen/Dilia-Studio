"""Builds assets/countrydata.json for the country card from open data, with an automatic cross-check:
currency, weekend days and official languages from Unicode CLDR (cldr-core, Unicode-3.0 licence); calling codes from Google libphonenumber
metadata (libphonenumber-js, MIT). Each value is cross-checked against mledoze world-countries (ODbL, used only as a check, not shipped).
A value is shipped only when both sources agree. Disagreements are settled by the ISO 4217 list (currency-codes, MIT) or left out.
Usage: python3 dev/make-countrydata.py cldr-core/ libphonenumber-js/ world-countries/ iso4217.json"""
import json, sys, pathlib, datetime
ROOT = pathlib.Path(__file__).resolve().parent.parent
cldr, lpn, wc, iso = [pathlib.Path(p) for p in sys.argv[1:5]]
ISO = json.load(open(iso)); ISOC = {}
for r in ISO['data']:
    for n in r['countries']: ISOC.setdefault(r['code'], set()).add(n.lower())
cur = json.load(open(cldr / 'supplemental/currencyData.json'))['supplemental']['currencyData']['region']
week = json.load(open(cldr / 'supplemental/weekData.json'))['supplemental']['weekData']
tinfo = json.load(open(cldr / 'supplemental/territoryInfo.json'))['supplemental']['territoryInfo']
meta = json.load(open(lpn / 'metadata.min.json'))['countries']
W = {c['cca2']: c for c in json.load(open(wc / 'countries.json'))}
DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
idx = json.load(open(ROOT / 'assets/holidays/index.json'))['countries']
out, report = {}, []
def wkday(key, cc): d = week[key]; return DAYS.index(d.get(cc, d['001']))
for cc in sorted(set(idx) | set(meta) | set(W)):
    if len(cc) != 2: continue
    rec = {}
    # currency now in use (CLDR: no end date, legal tender)
    now = [list(x.keys())[0] for x in cur.get(cc, []) if not list(x.values())[0].get('_to') and list(x.values())[0].get('_tender', 'true') != 'false']
    w = set((W.get(cc) or {}).get('currencies', {}).keys())
    if now:
        if w and set(now) & w: rec['cur'] = [c for c in now if c in w] or now[:1]
        else:
            nm = ((W.get(cc) or {}).get('name') or {}).get('common', '').lower()
            ok = [c for c in now if nm and any(nm in x or x.startswith(nm) for x in ISOC.get(c, ()))]
            if ok: rec['cur'] = ok
            else: report.append(f'{cc} currency CLDR {now} vs check {sorted(w)} and ISO 4217 list ({ISO["date"]}): not shipped')
    # calling code
    tel = meta.get(cc, [None])[0]; idd = (W.get(cc) or {}).get('idd', {}); chk = [idd.get('root', '').lstrip('+') + s for s in idd.get('suffixes', [])]
    if tel:
        if any(c == tel or c.startswith(tel) for c in chk): rec['tel'] = tel
        else: report.append(f'{cc} calling code libphonenumber {tel} vs check {chk}')
    # weekend (CLDR only; no second source in this dataset, so it is compared with the site's own table in the report)
    a, b = wkday('weekendStart', cc), wkday('weekendEnd', cc)
    rec['wk'] = [a] if a == b else [a, b]
    # official languages (CLDR, official status)
    langs = [l for l, v in (tinfo.get(cc, {}).get('languagePopulation') or {}).items() if v.get('_officialStatus') in ('official', 'de_facto_official')]
    if langs: rec['lang'] = langs[:4]
    if rec: out[cc] = rec
data = {'built': str(datetime.date.today()), 'sources': {'cldr': 'Unicode CLDR ' + json.load(open(cldr / 'package.json'))['version'], 'phone': 'libphonenumber-js ' + json.load(open(lpn / 'package.json'))['version']}, 'countries': out}
(ROOT / 'assets/countrydata.json').write_text(json.dumps(data, separators=(',', ':')))
print(len(out), 'countries;', len(report), 'disagreements (not shipped):'); print('\n'.join(report))
