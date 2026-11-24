"""Builds Dilia Pulse, the news area at /news/: a front page and one page per story, from dev/news-posts.py.
Every story graphic is drawn here as an inline SVG from the story's own figures (no photos, no outside images).
Run after make-pages.py: python3 dev/make-news.py"""
import html, pathlib, re, datetime as dt, hashlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
ns = {}; exec((ROOT / 'dev' / 'news-posts.py').read_text(), ns)
TOPICS = ['AI', 'Tech', 'Business', 'Markets', 'Policy']
ACC = {'AI': ('#8b5cff', '#140a33'), 'Tech': ('#22d3ee', '#03222c'), 'Business': ('#ffb020', '#2b1b03'), 'Markets': ('#22e39b', '#032a1d'), 'Policy': ('#ff4d8d', '#2c0717')}
E = lambda t: html.escape(str(t), quote=False); EA = lambda t: html.escape(str(t), quote=True)
POSTS = ns['POSTS']
for p in POSTS:
    assert re.fullmatch(r'[a-z0-9-]+', p['slug']) and re.fullmatch(r'\d{4}-\d\d-\d\d', p['date']) and p['topic'] in TOPICS, p['slug']
    assert p['sources'] and all(u.startswith('https://') for _, u in p['sources']) and 3 <= len(p['facts']) <= 4 and p['art']['kind'] in ('stat', 'bars'), p['slug']
assert len({p['slug'] for p in POSTS}) == len(POSTS) and sum(1 for p in POSTS if p.get('lead')) <= 1
POSTS = sorted(POSTS, key=lambda p: (not p.get('lead'), p['date']), reverse=False)
POSTS = sorted(POSTS, key=lambda p: p['date'], reverse=True)          # newest first (stable: list order breaks ties)
LEAD = next((p for p in POSTS if p.get('lead')), POSTS[0] if POSTS else None)
FD = lambda s: dt.date.fromisoformat(s).strftime('%-d %b %Y')
FDL = lambda s: dt.date.fromisoformat(s).strftime('%A %-d %B %Y')
MINS = lambda p: max(1, -(-len(' '.join(p['body']).split()) // 200))
SEC = lambda p: p['topic'].lower()

# ---------- story graphics ----------
def num(v): return ('%.1f' % v).rstrip('0').rstrip('.') if isinstance(v, float) else str(v)
_N = [0]
def art(p, big=False):
    _N[0] += 1; a = p['art']; acc, deep = ACC[p['topic']]; h = int(hashlib.sha1(p['slug'].encode()).hexdigest()[:8], 16)
    i = 'g' + hashlib.sha1(p['slug'].encode()).hexdigest()[:6] + str(_N[0]); W, H = 1200, 675
    gx, gy = 700 + h % 400, 80 + (h >> 8) % 300
    pts, x, y = [], 0, 600
    for k in range(25):                                                     # pulse line, different for every story
        x = k * 50; y = 600 - ((h >> (k % 24)) & 7) * 6
        if k in (9 + h % 5, 16 + h % 4): pts += [f'{x},{y}', f'{x + 12},{470 + (h >> k) % 40}', f'{x + 24},{640}', f'{x + 36},{y}']
        else: pts.append(f'{x},{y}')
    s = [f'<svg class="pgfx" viewBox="0 0 {W} {H}" role="img" aria-label="{EA(a.get("label", ""))}" xmlns="http://www.w3.org/2000/svg">',
         f'<defs><linearGradient id="{i}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{deep}"/><stop offset="1" stop-color="#04060d"/></linearGradient>',
         f'<radialGradient id="{i}r"><stop offset="0" stop-color="{acc}" stop-opacity=".55"/><stop offset="1" stop-color="{acc}" stop-opacity="0"/></radialGradient>',
         f'<linearGradient id="{i}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="{acc}"/></linearGradient>',
         f'<pattern id="{i}p" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#ffffff" stroke-opacity=".06" stroke-width="1"/></pattern></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#{i}b)"/><rect width="{W}" height="{H}" fill="url(#{i}p)"/>',
         f'<circle cx="{gx}" cy="{gy}" r="420" fill="url(#{i}r)"/>',
         f'<circle cx="{gx}" cy="{gy}" r="{140 + h % 90}" fill="none" stroke="{acc}" stroke-opacity=".35" stroke-width="2"/>',
         f'<circle cx="{gx}" cy="{gy}" r="{230 + h % 70}" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="2" stroke-dasharray="4 14"/>',
         '' if a['kind'] == 'bars' else f'<polyline points="{" ".join(pts)}" fill="none" stroke="{acc}" stroke-opacity=".7" stroke-width="4" stroke-linejoin="round"/>',
         f'<text x="70" y="96" fill="{acc}" font-family="Archivo, system-ui, sans-serif" font-size="30" font-weight="800" letter-spacing="6">{E(p["topic"].upper())}</text>',
         f'<text x="1130" y="96" text-anchor="end" fill="#ffffff" fill-opacity=".55" font-family="Archivo, system-ui, sans-serif" font-size="24" font-weight="700" letter-spacing="5">DILIA PULSE</text>']
    F = 'font-family="Archivo, system-ui, sans-serif"'
    if a['kind'] == 'stat':
        v = a['value']; fs = 230 if len(v) <= 4 else 190 if len(v) <= 6 else 150
        s.append(f'<text x="66" y="400" fill="url(#{i}t)" {F} font-size="{fs}" font-weight="800" letter-spacing="-4">{E(v)}</text>')
        lab, lines, cur = a['label'].split(), [], ''
        for w in lab:
            if len(cur) + len(w) > 46: lines.append(cur); cur = w
            else: cur = (cur + ' ' + w).strip()
        lines.append(cur)
        for k, ln in enumerate(lines[:2]): s.append(f'<text x="72" y="{470 + k * 44}" fill="#dfe5f2" {F} font-size="36" font-weight="600">{E(ln)}</text>')
    else:
        items = a['items']; n = len(items); top = max(v for _, v in items); x0, x1, base, hmax = 80, 1120, 560, 300
        gap = 36; bw = (x1 - x0 - gap * (n - 1)) / n
        s.append(f'<text x="72" y="160" fill="#dfe5f2" {F} font-size="34" font-weight="600">{E(a["label"])}</text>')
        for k, (name, v) in enumerate(items):
            bh = max(6, hmax * v / top); x = x0 + k * (bw + gap); last = k == n - 1
            s.append(f'<rect x="{x:.0f}" y="{base - bh:.0f}" width="{bw:.0f}" height="{bh:.0f}" rx="10" fill="{acc}" fill-opacity="{1 if last else .38}"/>')
            u = a.get('unit', ''); lab = {'$B': f'${num(v)}B', '$': f'${num(v)}', '%': f'+{num(v)}%' if v > 0 else f'{num(v)}%'}.get(u, num(v) + u)
            s.append(f'<text x="{x + bw / 2:.0f}" y="{base - bh - 18:.0f}" text-anchor="middle" fill="#ffffff" {F} font-size="{40 if n <= 4 else 32}" font-weight="800">{E(lab)}</text>')
            s.append(f'<text x="{x + bw / 2:.0f}" y="{base + 46}" text-anchor="middle" fill="#cfd6e6" {F} font-size="28" font-weight="600">{E(name)}</text>')
    s.append('</svg>'); return ''.join(s)

# ---------- page parts ----------
MARK = '<svg class="pmark" viewBox="0 0 64 32" aria-hidden="true"><defs><linearGradient id="pmg" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#8b5cff"/><stop offset="1" stop-color="#ff4d8d"/></linearGradient></defs><polyline points="2,18 16,18 21,6 28,28 34,12 38,18 62,18" fill="none" stroke="url(#pmg)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
MARK2 = MARK.replace('<defs><linearGradient id="pmg" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#8b5cff"/><stop offset="1" stop-color="#ff4d8d"/></linearGradient></defs>', '')
def mast(up, here):
    tabs = [('all', 'Top stories')] + [(t.lower(), t) for t in TOPICS]
    if here == 'hub': nav = ''.join(f'<button type="button" class="ptab" data-sec="{k}" aria-pressed="{"true" if k == "all" else "false"}">{E(v)}</button>' for k, v in tabs)
    else: nav = ''.join(f'<a class="ptab{" on" if k == here else ""}" href="{up}{"" if k == "all" else "#" + k}">{E(v)}</a>' for k, v in tabs)
    upd = FDL(POSTS[0]['date']) if POSTS else ''
    return f'''<section class="pmast"><div class="pwrap">
<div class="pmrow"><a class="plogo" href="{up or './'}" aria-label="Dilia Pulse home">{MARK}<span class="pword">DILIA<b>PULSE</b></span></a>
<p class="ptag">Tech and business news, written from the source</p><p class="pupd"><i class="plight"></i>Updated {upd}</p></div>
<nav class="psec" aria-label="Sections">{nav}</nav></div></section>
<div class="ptick" aria-label="Latest headlines"><span class="plive">LATEST</span><div class="ptrack"><div class="pmove">{ticker(up)}{ticker(up, True)}</div></div></div>'''
def ticker(up, dup=False):
    hide = ' tabindex="-1" aria-hidden="true"' if dup else ''
    return ''.join(f'<a href="{up}{p["slug"]}/"{hide}><i class="pdot s-{SEC(p)}"></i>{E(p["title"])}</a>' for p in POSTS[:10])
def meta(p): return f'<span class="pmt"><time datetime="{p["date"]}">{FD(p["date"])}</time><span>{MINS(p)} min read</span></span>'
def kick(p): return f'<span class="pkick s-{SEC(p)}"><i class="pdot"></i>{E(p["topic"])}<span>{E(p["kicker"])}</span></span>'
def card(p, up='', cls='', extra=''):
    return (f'<a class="pcd s-{SEC(p)} {cls}"{extra} href="{up}{p["slug"]}/" data-sec="{SEC(p)}"><span class="pimg">{art(p)}</span>'
            f'<span class="pbody">{kick(p)}<b class="ptitle">{E(p["title"])}</b><span class="pdesc">{E(p["desc"])}</span>{meta(p)}</span></a>')

base = (ROOT / 'blog' / 'index.html').read_text(); head, rest = base.split('<main', 1); tail = rest.split('</main>', 1)[1]
def shell(depth, title, desc):
    h, t = head, tail
    if depth == 2: h = h.replace('href="../', 'href="../../').replace('src="../', 'src="../../'); t = t.replace('href="../', 'href="../../').replace('src="../', 'src="../../')
    up = '../' * depth
    h = h.replace('blog.css', 'news.css').replace('</head>', f'<script src="{up}assets/news-ui.js" defer></script>\n</head>', 1)
    h = re.sub(r'<body class="[^"]*"', '<body class="pulse-page"', h, count=1)
    t = re.sub(r'<div class="toasts".*?</div>\s*<div class="dropveil".*?</div></div>', '', t, flags=re.S)
    h = re.sub(r'<title>.*?</title>', f'<title>{EA(title)}</title>', h); h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{EA(desc)}">', h)
    return h, t
ABOUT = ('<div class="pabout"><h2>How Dilia Pulse works</h2><p>Every story is written from primary sources: company filings, official announcements and court or government documents, '
         'with independent reports where those are not available. Sources are listed at the end of each story. Stories are drafted with AI and checked by a person before they are published. '
         'Graphics are drawn from the figures in the story. Nothing here is investment advice.</p></div>')

# ---------- front page ----------
d = ROOT / 'news'; d.mkdir(exist_ok=True)
for old in d.iterdir():                                                    # remove pages of stories that no longer exist
    if old.is_dir() and old.name not in {p['slug'] for p in POSTS}: [f.unlink() for f in old.iterdir()]; old.rmdir()
h, t = shell(1, 'Dilia Pulse: tech and business news', 'Dilia Pulse: tech, AI, business and markets news written from company filings and official sources, with every source listed.')
side, seen = [], {LEAD['topic']} if LEAD else set()
for p in POSTS:                                                          # three more top stories, each from a different section
    if p is not LEAD and p['topic'] not in seen and len(side) < 3: side.append(p); seen.add(p['topic'])
for p in POSTS:
    if p is not LEAD and p not in side and len(side) < 3: side.append(p)
TOP = {id(LEAD)} | {id(p) for p in side}
stats = [p for p in POSTS if p['art']['kind'] == 'stat'][:4]
nums = ''.join(f'<a class="pnm s-{SEC(p)}" href="{p["slug"]}/"><b>{E(p["art"]["value"])}</b><span>{E(p["art"]["label"])}</span></a>' for p in stats)
brief = ''.join(f'<li><a href="{p["slug"]}/"><span class="pkick s-{SEC(p)}"><i class="pdot"></i>{E(p["topic"])}</span>{E(p["title"])}</a></li>' for p in POSTS[:6])
hub = f'''<main class="ws-page pulse">
{mast('', 'hub')}
<section class="phero"><div class="pwrap phgrid">
{card(LEAD, '', 'plead') if LEAD else ''}
<div class="pside">{''.join(card(p, '', 'prow') for p in side)}
<section class="pnms" aria-label="Numbers that matter"><h2 class="psh">Numbers that matter</h2><div class="pnrow">{nums}</div></section></div>
</div></section>
<section class="pwrap pmain"><div>
<h2 class="psh" id="pgh">Latest</h2>
<div class="pgrid" id="pgrid">{''.join(card(p, '', 'ptop' if id(p) in TOP else '', ' hidden' if id(p) in TOP else '') for p in POSTS)}</div>
<p class="pempty" id="pempty" hidden>No stories in this section yet.</p>
</div>
<aside class="prail"><h2 class="psh">Briefing</h2><ol class="pbrief">{brief}</ol>{ABOUT}
<p class="pguides">Looking for how-to guides? <a href="../blog/">Read the Dilia guides</a>.</p></aside>
</section>
</main>'''
(d / 'index.html').write_text(h + hub + t)

# ---------- story pages ----------
for p in POSTS:
    h, t = shell(2, f'{p["title"]} | Dilia Pulse', p['desc'])
    body = ''.join(f'<h2>{E(x[3:])}</h2>' if x.startswith('## ') else f'<p>{E(x)}</p>' for x in p['body'])
    src = ''.join(f'<li><a href="{EA(u)}" rel="noopener noreferrer" target="_blank">{E(l)}</a></li>' for l, u in p['sources'])
    facts = ''.join(f'<li>{E(f)}</li>' for f in p['facts'])
    more = [q for q in POSTS if q is not p and q['topic'] == p['topic']] + [q for q in POSTS if q is not p and q['topic'] != p['topic']]
    note = f'<p class="pnt">{E(p["note"])}</p>' if p.get('note') else ''
    page = f'''<main class="ws-page pulse pstory">
{mast('../', SEC(p))}
<article class="pwrap part s-{SEC(p)}">
<header class="phead"><p class="pcrumb"><a href="../../">Dilia</a><span>/</span><a href="../">Pulse</a><span>/</span>{E(p["topic"])}</p>
{kick(p)}<h1>{E(p["title"])}</h1><p class="pdeck">{E(p["desc"])}</p>
<p class="pby"><span class="pdesk">{MARK2}Dilia Pulse desk</span><time datetime="{p["date"]}">{FDL(p["date"])}</time><span>{MINS(p)} min read</span></p></header>
<figure class="pfig">{art(p, True)}<figcaption>{E(p["art"]["label"])}. Graphic by Dilia Pulse from the figures in the sources below.</figcaption></figure>
<div class="pcols"><div class="ptext">
{body}
{note}
<section class="psrcs"><h2>Sources</h2><ol>{src}</ol></section>
<p class="pdisc">Written with AI from the sources above and checked before publishing. Figures are as reported in those sources on the date shown. This is not investment advice.</p>
</div>
<aside class="pfacts"><h2>Key facts</h2><ul>{facts}</ul></aside></div>
</article>
<section class="pwrap pmore"><h2 class="psh">More from Dilia Pulse</h2><div class="pgrid">{''.join(card(q, '../') for q in more[:3])}</div></section>
</main>'''
    dd = d / p['slug']; dd.mkdir(parents=True, exist_ok=True); (dd / 'index.html').write_text(h + page + t)
import importlib.util as _nu
_s = _nu.spec_from_file_location('navpass', str(ROOT / 'dev' / 'navpass.py')); _n = _nu.module_from_spec(_s); _s.loader.exec_module(_n)
print('news pages:', len(POSTS) + 1, '| menu updated on', _n.run(), 'pages')
