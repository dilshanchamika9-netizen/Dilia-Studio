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
    h = re.sub(r'<link rel="stylesheet" href="[^"]*work\.css">\s*<link rel="stylesheet" href="[^"]*viewer\.css">', f'<link rel="stylesheet" href="{up}assets/blog.css">', h)
    h = h.replace('<body class="work"', '<body class="blog"')
    t = tail.replace('../assets/', up + 'assets/').replace('<script src="' + up + 'assets/viewer.js"></script>', '').replace('<script src="../assets/viewer.js"></script>', '')
    # these pages need no tool scripts: keep search palette, menu and common only
    for s in ('pdf-lib.min.js', 'pdf.min.js', 'Sortable.min.js', 'kit.js'):
        t = re.sub(r'<script src="[^"]*' + re.escape(s) + r'"></script>\n?', '', t)
    return h, t

def retitle(h, title, desc):
    h = re.sub(r'<title>.*?</title>', f'<title>{EA(title)} | Dilia Studio blog</title>', h)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{EA(desc)}">', h)
    return h

by = {p['slug']: p for p in POSTS}
def card(p): return f'<a class="bcard" href="{"../" if False else ""}{p["slug"]}/"><b>{E(p["title"])}</b><span>{E(p["desc"])}</span></a>'

# ---- index ----
h, t = shell(2 - 1)
h = retitle(h, 'Dilia Studio blog: PDF how-to guides', 'Short, honest guides for working with PDFs: merge, compress, edit, sign, split, protect and more. Private and free.')
h = h.replace('<title>PDF', '<title>PDF')
idx = f'''<main class="ws-page bpage"><div class="wrap bwrap">
<p class="crumb"><a href="../tools.html">Tools</a><span>/</span>Blog</p>
<h1>PDF how-to guides</h1>
<p class="lead">Short, honest guides for everyday PDF jobs. Each one tells you what the tool does and what it cannot do.</p>
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
