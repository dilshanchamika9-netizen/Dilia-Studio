"""Builds /blog/ (index + one page per post) from dev/blog-posts.py. Run after make-pages.py: python3 dev/make-blog.py"""
import html, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
ns = {}; exec((ROOT / 'dev' / 'blog-posts.py').read_text(), ns); POSTS = ns['POSTS']
E = lambda t: html.escape(t, quote=False)
EA = lambda t: html.escape(t, quote=True)

base = (ROOT / 'pdf-reader' / 'index.html').read_text()
head, rest = base.split('<main', 1); tail = rest.split('</main>', 1)[1]
def shell(depth):
    up = '../' * depth
    h = head.replace('../assets/', up + 'assets/').replace('href="../"', f'href="{up}"').replace('href="../#', f'href="{up}#').replace('href="../tools.html"', f'href="{up}tools.html"').replace('href="../blog/"', f'href="{up}blog/"')
    h = re.sub(r'<link rel="stylesheet" href="[^"]*(work|viewer|reader)\.css">\n?', '', h)          # template (reader) styles out
    h = re.sub(r'<link rel="(manifest|apple-touch-icon)"[^>]*>\n?', '', h)                          # the app manifest belongs to the reader only
    h = h.replace('</head>', f'<link rel="stylesheet" href="{up}assets/blog.css">\n</head>', 1)
    assert 'blog.css' in h and 'reader.css' not in h and 'rel="manifest"' not in h
    h = re.sub(r'<body class="[^"]*"', '<body class="blog"', h, count=1)
    t = tail.replace('../assets/', up + 'assets/').replace('<script src="' + up + 'assets/viewer.js"></script>', '').replace('<script src="../assets/viewer.js"></script>', '')
    # these pages need no tool scripts: keep search palette, menu and common only
    t = re.sub(r'<section class="rabout[^"]*".*?</section>\n?', '', t, flags=re.S)            # reader-only text
    keep = ('tools.js', 'palette.js', 'menu.js', 'common.js')      # allow-list: anything else from the template is dropped
    t = re.sub(r'<script src="[^"]*?([^/"]+)"></script>\n?', lambda m: m.group(0) if m.group(1) in keep else '', t)
    return h, t

def retitle(h, title, desc):
    h = re.sub(r'<title>.*?</title>', f'<title>{EA(title)} | Dilia blog</title>', h)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{EA(desc)}">', h)
    return h

by = {p['slug']: p for p in POSTS}
def card(p): return f'<a class="bcard" href="{"../" if False else ""}{p["slug"]}/"><b>{E(p["title"])}</b><span>{E(p["desc"])}</span></a>'

# ---- index ----
h, t = shell(2 - 1)
h = retitle(h, 'Dilia blog: how-to guides', 'Short, honest guides for PDFs, images and QR codes: merge, compress, resize, convert, make QR codes and more. Private and free.')
h = h.replace('<title>PDF', '<title>PDF')
idx = f'''<main class="ws-page bpage"><div class="wrap bwrap">
<p class="crumb"><a href="../tools.html">Tools</a><span>/</span>Blog</p>
<h1>How-to guides</h1>
<p class="lead">Short, honest guides for PDFs, images and QR codes. Each one tells you what the tool does and what it cannot do.</p>
<div class="bgrid">{''.join(card(p) for p in POSTS)}</div>
</div></main>'''
d = ROOT / 'blog'; d.mkdir(exist_ok=True); (d / 'index.html').write_text(h + idx + t)

# ---- posts ----
for p in POSTS:
    h, t = shell(2)
    h = retitle(h, p['title'], p['desc'])
    steps = ''.join(f'<li>{E(s)}</li>' for s in p['steps'])
    secs = ''.join(f'<h2>{E(k)}</h2>' + ''.join(f'<p>{E(x)}</p>' for x in v) for k, v in p['sections'])
    faq = ''.join(f'<h3>{E(q)}</h3><p>{E(a)}</p>' for q, a in p['faq'])
    cta = f'<a class="btn go bcta" href="../../{p["tool"]}/">Open {E(p["toolname"])}</a>' if p['tool'] else '<a class="btn go bcta" href="../../tools.html">See all tools</a>'
    rel = ''.join(f'<a class="bcard" href="../{r}/"><b>{E(by[r]["title"])}</b></a>' for r in p['related'])
    body = f'''<main class="ws-page bpage"><article class="wrap bwrap">
<p class="crumb"><a href="../../tools.html">Tools</a><span>/</span><a href="../">Blog</a></p>
<h1>{E(p['title'])}</h1>
<p class="lead">{E(p['intro'])}</p>
{cta}
{('<h2>Steps</h2><ol class="bsteps">' + steps + '</ol>') if steps else ''}
{secs}
<h2>Questions</h2>{faq}
{cta}
<h2>More guides</h2><div class="bgrid small">{rel}</div>
</article></main>'''
    d = ROOT / 'blog' / p['slug']; d.mkdir(parents=True, exist_ok=True); (d / 'index.html').write_text(h + body + t)
print('blog pages:', len(POSTS) + 1)

import importlib.util as _nu
_s = _nu.spec_from_file_location('navpass', str(ROOT / 'dev' / 'navpass.py')); _n = _nu.module_from_spec(_s); _s.loader.exec_module(_n)
print('menu updated on', _n.run(), 'pages')
