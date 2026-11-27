"""SEO base layer (DR-02 §11.1, Phase 1). Runs at the end of every page generator (via navpass.run) and is idempotent.

Per indexable page: title <= 60 chars, description <= 155 chars, canonical, Open Graph + Twitter tags with the area share
image, JSON-LD (Organization + WebSite on Home; WebApplication on tools, planners and games; NewsArticle on Pulse stories;
Article on guides; FAQPage where the page has a <details> FAQ; BreadcrumbList everywhere).
Site files: robots.txt, sitemap.xml (index) + sitemap-<area>.xml, _redirects (301 plan for the old flat addresses; live once
the site moves to Cloudflare in Phase 2, GitHub Pages ignores it).

SITE_URL is the only line to change when the domain goes live (Phase 2)."""
import html, json, pathlib, re

SITE_URL = 'https://dilshanchamika9-netizen.github.io/Dilia-Studio/'
ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {'dev', 'desktop', 'node_modules', '.git', '.github'}
START, END = '<!-- seo -->', '<!-- /seo -->'
BLOCK = re.compile(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', re.S)

# lockup line name -> (area, area url, line hub name, line hub url, sitemap file, share image)
LINES = {
    'PDF': ('Tools', 'tools.html', 'PDF', 'pdf/', 'tools', 'tools'), 'Image': ('Tools', 'tools.html', 'Image', 'image/', 'tools', 'tools'),
    'Text': ('Tools', 'tools.html', 'Text', 'text/', 'tools', 'tools'), 'QR': ('Tools', 'tools.html', 'QR codes', 'qr/', 'tools', 'tools'),
    'Calc': ('Tools', 'tools.html', 'Calculators', 'calc/', 'tools', 'tools'),
    'Life': ('Life', 'life/', None, None, 'life', 'life'), 'Play': ('Play', 'play/', None, None, 'play', 'play'),
    'Pulse': ('Pulse', 'news/', None, None, 'pulse', 'pulse'), 'Guides': ('Guides', 'blog/', None, None, 'guides', 'guides'),
}
HUBS = {'tools.html', 'pdf/', 'image/', 'text/', 'qr/', 'calc/', 'life/', 'play/', 'news/', 'blog/'}
E = lambda s: html.escape(s, quote=True)
U = lambda s: html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def pages():
    for f in sorted(ROOT.rglob('*.html')):
        rel = f.relative_to(ROOT)
        if rel.parts[0] in SKIP or 'vendor' in rel.parts or rel.name == '404.html': continue
        yield f, rel


def url_of(rel):
    p = rel.as_posix()
    if p == 'index.html': return ''
    return p[:-len('index.html')] if p.endswith('/index.html') else p


def is_redirect(s): return 'http-equiv="refresh"' in s
def is_noindex(s): return re.search(r'<meta name="robots" content="[^"]*noindex', s) is not None


def short_title(t):
    """<= 60 chars without changing the meaning: drop the line from the brand suffix, then any (aside), then the brand."""
    if len(t) <= 60: return t
    t2 = re.sub(r' \| Dilia (blog|PDF|Play|Life|QR|Text|Image|Calc|Pulse|Guides)$', ' | Dilia', t)
    if len(t2) <= 60: return t2
    t3 = re.sub(r'\s*\([^)]*\)', '', t2)
    if len(t3) <= 60: return t3
    t4 = re.sub(r' \| Dilia$', '', t3)
    if len(t4) <= 60: return t4
    cut = t4[:58].rsplit(' ', 1)[0].rstrip(' ,:-–')
    return cut + '…'


def short_desc(d):
    """<= 155 chars: drop whole trailing sentences first; cut at a word only if one sentence is too long."""
    if len(d) <= 155: return d
    parts = re.split(r'(?<=[.!?])\s+', d)
    while len(parts) > 1 and len(' '.join(parts)) > 155: parts.pop()
    out = ' '.join(parts)
    if len(out) <= 155: return out
    return out[:152].rsplit(' ', 1)[0].rstrip(' ,;:') + '…'


def faq(s):
    main = s.split('<main', 1)[-1].split('</main>', 1)[0]
    qa = re.findall(r'<details[^>]*>\s*<summary>(.*?)</summary>\s*(.*?)</details>', main, re.S)
    qa = [(U(q), U(a)) for q, a in qa if U(q) and U(a)]
    if len(qa) < 2: return None
    return {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in qa]}


def crumbs(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': SITE_URL + u} for i, (n, u) in enumerate(items)]}


def h1_text(s):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    return re.sub(r'\s+', ' ', U(m.group(1))) if m else ''


def area_of(s, url):
    m = re.search(r'<span class="wm"><span class="w">Dilia</span><span class="l">([^<]*)</span>', s)
    line = m.group(1) if m else None
    if url.startswith('news/'): line = 'Pulse'
    if url.startswith('blog/'): line = 'Guides'
    return line


def build(s, url):
    title = short_title(U(re.search(r'<title>(.*?)</title>', s, re.S).group(1)))
    desc = short_desc(U(re.search(r'<meta name="description" content="([^"]*)"', s).group(1)))
    line = area_of(s, url)
    L = LINES.get(line)
    image = SITE_URL + 'assets/share/' + (L[5] if L else 'home') + '.jpg'
    name = h1_text(s) or title.split(' | ')[0].split(' - ')[0]
    graph = []
    if url == '':
        graph += [{'@type': 'Organization', '@id': SITE_URL + '#org', 'name': 'Dilia', 'url': SITE_URL, 'logo': SITE_URL + 'assets/share/logo.png'},
                  {'@type': 'WebSite', '@id': SITE_URL + '#site', 'name': 'Dilia', 'url': SITE_URL, 'publisher': {'@id': SITE_URL + '#org'},
                   'potentialAction': {'@type': 'SearchAction', 'target': {'@type': 'EntryPoint', 'urlTemplate': SITE_URL + 'tools.html?q={search_term_string}'}, 'query-input': 'required name=search_term_string'}}]
        trail = [('Home', '')]
    else:
        trail = [('Home', '')]
        if L:
            if url != L[1]: trail.append((L[0], L[1]))
            if L[2] and url not in (L[3], L[1]): trail.append((L[2], L[3]))
        if url == 'tools.html': here = 'All tools'
        elif url in HUBS and L: here = L[2] if url == L[3] else L[0]
        else: here = name
        trail.append((here, url))
        if url in HUBS:
            graph.append({'@type': 'CollectionPage', 'name': title, 'url': SITE_URL + url, 'description': desc, 'isPartOf': {'@id': SITE_URL + '#site'}})
        elif line == 'Pulse':
            d = re.search(r'<time datetime="(\d{4}-\d{2}-\d{2})"', s)
            art = {'@type': 'NewsArticle', 'headline': name[:110], 'description': desc, 'url': SITE_URL + url, 'image': [image],
                   'author': {'@type': 'Organization', 'name': 'Dilia Pulse desk', 'url': SITE_URL + 'news/'},
                   'publisher': {'@type': 'Organization', 'name': 'Dilia', 'logo': {'@type': 'ImageObject', 'url': SITE_URL + 'assets/share/logo.png'}}}
            if d: art['datePublished'] = art['dateModified'] = d.group(1)
            graph.append(art)
        elif line == 'Guides':
            graph.append({'@type': 'Article', 'headline': name[:110], 'description': desc, 'url': SITE_URL + url, 'image': [image],
                          'author': {'@type': 'Organization', 'name': 'Dilia'}, 'publisher': {'@type': 'Organization', 'name': 'Dilia'}})
        elif line in LINES:
            cat = {'Play': 'GameApplication', 'Life': 'LifestyleApplication', 'Calc': 'FinanceApplication'}.get(line, 'UtilitiesApplication')
            graph.append({'@type': 'WebApplication', 'name': name, 'url': SITE_URL + url, 'description': desc, 'applicationCategory': cat,
                          'operatingSystem': 'Any (runs in the web browser)', 'isAccessibleForFree': True,
                          'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}})
        else:
            graph.append({'@type': 'WebPage', 'name': title, 'url': SITE_URL + url, 'description': desc})
    graph.append(crumbs(trail))
    f = faq(s)
    if f: graph.append(f)
    ld = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    ogtype = 'article' if line in ('Pulse', 'Guides') and url not in HUBS else 'website'
    block = '\n'.join([START,
        f'<link rel="canonical" href="{E(SITE_URL + url)}">',
        f'<meta property="og:type" content="{ogtype}">', '<meta property="og:site_name" content="Dilia">',
        f'<meta property="og:title" content="{E(title)}">', f'<meta property="og:description" content="{E(desc)}">',
        f'<meta property="og:url" content="{E(SITE_URL + url)}">', f'<meta property="og:image" content="{E(image)}">',
        '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">', f'<meta name="twitter:title" content="{E(title)}">',
        f'<meta name="twitter:description" content="{E(desc)}">', f'<meta name="twitter:image" content="{E(image)}">',
        f'<script type="application/ld+json">{ld}</script>', END]) + '\n'
    return title, desc, block, (L[4] if L else 'main')


def not_found():
    """D18: custom 404 built from the privacy page shell. GitHub Pages serves it for any missing address at any depth, so every
    link and asset uses the site's absolute path."""
    from urllib.parse import urlparse
    base = urlparse(SITE_URL).path
    s = (ROOT / 'privacy' / 'index.html').read_text()
    s = BLOCK.sub('', s)
    s = s.replace('href="../', f'href="{base}').replace('src="../', f'src="{base}').replace('href="./"', f'href="{base}"')
    s = re.sub(r'<title>.*?</title>', '<title>Page not found | Dilia</title>', s, count=1, flags=re.S)
    s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="This page moved or never existed. Search Dilia or open a popular tool.">\n<meta name="robots" content="noindex">', s, count=1)
    pop = [('Merge PDF', 'merge-pdf/'), ('Compress PDF', 'compress-pdf/'), ('PDF to JPG', 'pdf-to-jpg/'), ('JPG to PDF', 'jpg-to-pdf/'), ('Compress image', 'compress-image/'), ('QR code generator', 'qr-code-generator/')]
    main = ('<main class="nf wrap" id="lib"><p class="kicker">Error 404</p><h1>This page moved or never existed.</h1>'
            '<p class="sub">Search for what you need, or open one of the most used tools.</p>'
            '<div class="nfs" role="search"><label for="q"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'
            '<input id="q" type="text" placeholder="Search tools, planners and games" spellcheck="false" autocomplete="off" autofocus aria-label="Search Dilia"></label><div class="plist" id="plist"></div></div>'
            '<h2>Most used tools</h2><ul class="nfpop">' + ''.join(f'<li><a href="{base}{u}">{n}</a></li>' for n, u in pop) + '</ul></main>')
    s = re.sub(r'<section class="lib-hero">.*?</section>\n*', '', s, count=1, flags=re.S)
    s = re.sub(r'<main class="lib wrap legal-doc" id="lib">.*?</main>', lambda m: main, s, count=1, flags=re.S)
    s = s.replace(f'<script src="{base}assets/common.js"></script>', f'<script src="{base}assets/common.js"></script>\n<script src="{base}assets/notfound.js"></script>', 1)
    assert 'notfound.js' in s and 'Error 404' in s
    return s


def run():
    changed, maps, redirects = 0, {}, []
    for f, rel in pages():
        s = f.read_text(); url = url_of(rel)
        if is_redirect(s):
            m = re.search(r'http-equiv="refresh" content="0;\s*url=([^"]+)"', s)
            if m:
                tgt = (rel.parent / m.group(1)).as_posix()
                tgt = re.sub(r'(^|/)\./', r'\1', tgt)
                while '/../' in '/' + tgt: tgt = re.sub(r'[^/]+/\.\./', '', tgt, count=1)
                redirects.append(('/' + url, '/' + tgt + ('/' if m.group(1).endswith('/') and not tgt.endswith('/') else '')))
            continue
        if is_noindex(s) or '<title>' not in s or 'name="description"' not in s: continue
        t = BLOCK.sub('', s)
        t = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', '', t, flags=re.S)   # older hand-written JSON-LD
        t = re.sub(r'<link rel="canonical"[^>]*>\n?', '', t)
        title, desc, block, smap = build(t, url)
        t = re.sub(r'<title>.*?</title>', lambda m: f'<title>{E(title)}</title>', t, count=1, flags=re.S)
        t = re.sub(r'<meta name="description" content="[^"]*">', lambda m: f'<meta name="description" content="{E(desc)}">', t, count=1)
        t = re.sub(r'(<meta name="description" content="[^"]*">\n?)', lambda m: m.group(1).rstrip('\n') + '\n' + block, t, count=1)
        if t != s: f.write_text(t); changed += 1
        maps.setdefault(smap, []).append(url)
    files = {}
    for name, urls in sorted(maps.items()):
        body = ''.join(f'<url><loc>{E(SITE_URL + u)}</loc></url>\n' for u in sorted(urls))
        files[f'sitemap-{name}.xml'] = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n'
    files['sitemap.xml'] = ('<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                            + ''.join(f'<sitemap><loc>{SITE_URL}sitemap-{n}.xml</loc></sitemap>\n' for n in sorted(maps)) + '</sitemapindex>\n')
    files['robots.txt'] = 'User-agent: *\nAllow: /\nDisallow: /dev/\n\nSitemap: ' + SITE_URL + 'sitemap.xml\n'
    files['_redirects'] = ('# 301 plan for the old flat addresses (DR-02 D15). Cloudflare Pages reads this file; GitHub Pages ignores it,\n'
                           '# so the meta-refresh stubs stay until the move in Phase 2, then they are deleted.\n'
                           + ''.join(f'{a} {b} 301\n' for a, b in sorted(redirects)))
    files['404.html'] = not_found()
    for n, body in files.items():
        p = ROOT / n
        if not p.exists() or p.read_text() != body: p.write_text(body); changed += 1
    return changed


if __name__ == '__main__': print('seo pass changed', run(), 'files')
