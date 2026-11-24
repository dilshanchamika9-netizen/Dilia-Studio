"""Builds /news/ (hub + one page per own story). Headlines on the hub are filled in the browser from data/news.json.
Run after make-pages.py: python3 dev/make-news.py"""
import html, pathlib, re, datetime as dt
ROOT = pathlib.Path(__file__).resolve().parent.parent
ns = {}; exec((ROOT / 'dev' / 'news-posts.py').read_text(), ns); POSTS = sorted(ns['POSTS'], key=lambda p: p['date'], reverse=True)
E = lambda t: html.escape(t, quote=False); EA = lambda t: html.escape(t, quote=True)
for p in POSTS:
    assert re.fullmatch(r'[a-z0-9-]+', p['slug']) and re.fullmatch(r'\d{4}-\d\d-\d\d', p['date']) and p['topic'] in ('Tech', 'Business') and p['sources'] and all(u.startswith('https://') for _, u in p['sources']), p['slug']
base = (ROOT / 'blog' / 'index.html').read_text(); head, rest = base.split('<main', 1); tail = rest.split('</main>', 1)[1]
def shell(depth):
    up = '../' * (depth - 1); h, t = head, tail
    if depth == 2: h = h.replace('href="../', 'href="../../').replace('src="../', 'src="../../'); t = t.replace('href="../', 'href="../../').replace('src="../', 'src="../../')
    h = h.replace('blog.css', 'news.css')
    h = re.sub(r'<body class="[^"]*"', '<body class="blog news"', h, count=1)
    return h, t
def retitle(h, title, desc):
    h = re.sub(r'<title>.*?</title>', f'<title>{EA(title)} | Dilia</title>', h); return re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{EA(desc)}">', h)
FD = lambda s: dt.date.fromisoformat(s).strftime('%-d %B %Y')
def card(p): return f'<a class="bcard" href="{p["slug"]}/"><span class="ntag {p["topic"].lower()}">{p["topic"]}</span><b>{E(p["title"])}</b><span>{E(p["desc"])}</span><small>{FD(p["date"])}</small></a>'
h, t = shell(1); h = retitle(h, 'Tech and Business News', 'Tech headlines and company filings, updated every few hours, plus short sourced stories. Headlines and links only. Free, private, no tracking.')
h = h.replace('</head>', '<script src="../assets/news-ui.js" defer></script>\n</head>', 1)
stories = (f'<h2>Our stories</h2><div class="bgrid">{"".join(card(p) for p in POSTS)}</div>' if POSTS else '<h2>Our stories</h2><p class="nnote">Short stories written from company filings and official sources, each with its sources listed, are coming here.</p>')
idx = f'''<main class="ws-page bpage news"><div class="wrap nwrap">
<p class="crumb"><a href="../">Dilia</a><span>/</span>News</p>
<h1>Tech and business news</h1>
<p class="lead">What is moving in tech and business, refreshed every few hours. We show headlines and links only. The articles belong to their publishers.</p>
<p class="nstamp" id="nstamp" aria-live="polite">Loading the latest headlines…</p>
{stories}
<h2>Tech headlines</h2><ol class="nlist" id="nhn"><li class="nnote">Loading…</li></ol>
<noscript><p class="nnote">Turn on JavaScript to see the live headlines.</p></noscript>
<h2>Company filings</h2><p class="nnote">Reports that large companies file with the US Securities and Exchange Commission (SEC): quarterly and annual reports and current reports. Open a filing to read the company's own words.</p><ul class="nlist" id="nsec"><li class="nnote">Loading…</li></ul>
<p class="nsrc">Tech headlines: Hacker News (Y Combinator). Filings: US SEC EDGAR. Headlines and links only, no article text is copied. Looking for how-tos? See the <a href="../blog/">guides</a>.</p>
</div></main>'''
d = ROOT / 'news'; d.mkdir(exist_ok=True); (d / 'index.html').write_text(h + idx + t)
for p in POSTS:
    h, t = shell(2); h = retitle(h, p['title'], p['desc'])
    body = ''.join(f'<h2>{E(x[3:])}</h2>' if x.startswith('## ') else f'<p>{E(x)}</p>' for x in p['body'])
    src = ''.join(f'<li><a href="{EA(u)}" rel="noopener noreferrer" target="_blank">{E(l)}</a></li>' for l, u in p['sources'])
    page = f'''<main class="ws-page bpage news"><article class="wrap nwrap">
<p class="crumb"><a href="../../">Dilia</a><span>/</span><a href="../">News</a></p>
<p class="ntagrow"><span class="ntag {p["topic"].lower()}">{p["topic"]}</span> <time datetime="{p["date"]}">{FD(p["date"])}</time></p>
<h1>{E(p['title'])}</h1><p class="lead">{E(p['desc'])}</p>
{body}
<h2>Sources</h2><ul class="nlist nsrcs">{src}</ul>
<p class="nsrc">Written with AI from the sources above and checked before publishing. Figures are as reported in those sources on the date shown. This is not investment advice.</p>
</article></main>'''
    dd = ROOT / 'news' / p['slug']; dd.mkdir(parents=True, exist_ok=True); (dd / 'index.html').write_text(h + page + t)
import importlib.util as _nu
_s = _nu.spec_from_file_location('navpass', str(ROOT / 'dev' / 'navpass.py')); _n = _nu.module_from_spec(_s); _s.loader.exec_module(_n)
print('news pages:', len(POSTS) + 1, '| menu updated on', _n.run(), 'pages')
