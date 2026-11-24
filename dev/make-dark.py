"""Builds assets/dark.css from the site's light style files. Run by make-pages.py. Idempotent.
Light styles are never edited: for every rule that uses a light surface, a grey line or dark text, a dark twin is written
under  :root[data-theme=dark]  . Paper-like things (page previews, QR code card) stay white (KEEP list)."""
import re, pathlib, colorsys
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ['site', 'palette', 'work', 'text', 'calc', 'qr', 'blog', 'news', 'library', 'editor', 'reader', 'area', 'home']
KEEP = re.compile(r'(dz-page|\.pv\b|\.thumb|\.pgw|\.sheet|\.qrbox|\.qr-out|\.qrcard|\.paper|\.pagebox|\.pdfpage|\.pageimg|\.pgcanvas|\.dline|\.sig)')
SURF, MIST, BG = '#131b30', '#0b1120', '#060914'

def parse(h):
    h = h.lstrip('#')
    if len(h) in (3, 4): h = ''.join(c * 2 for c in h)
    r, g, b = int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255
    a = h[6:8] if len(h) == 8 else ''
    return r, g, b, a
def lum(r, g, b): return 0.2126 * r + 0.7152 * g + 0.0722 * b
def hexs(r, g, b): return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))

def bg_color(m):
    c = m.group(0); r, g, b, a = parse(c); L = lum(r, g, b); h, l, s = colorsys.rgb_to_hls(r, g, b)
    if L < 0.8: return c
    if s > 0.35 and a == '': return tint(r, g, b)               # light tint of a colour -> dark tint of the same colour
    if a:                                                      # translucent white glass -> translucent dark surface
        return SURF + a
    return SURF if L > 0.985 else MIST

def tint(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    rr, gg, bb = colorsys.hls_to_rgb(h, 0.5, 1)
    return hexs(rr, gg, bb) + '26'

def text_color(m):
    c = m.group(0); r, g, b, a = parse(c); L = lum(r, g, b); h, l, s = colorsys.rgb_to_hls(r, g, b)
    if a or L > 0.5: return c
    if L < 0.14 and not (s > .6 and h < .1 or s > .6 and h > .9): return 'var(--ink)'   # ink navy / near black
    if s < 0.3:
        return 'var(--ink)' if L < 0.14 else 'var(--text)' if L < 0.3 else 'var(--muted)'
    if L < 0.3:
        rr, gg, bb = colorsys.hls_to_rgb(h, 0.7, min(1, s + .1)); return hexs(rr, gg, bb)
    return c

def edge_color(m):
    c = m.group(0); r, g, b, a = parse(c); L = lum(r, g, b); h, l, s = colorsys.rgb_to_hls(r, g, b)
    if s > 0.35 and L < 0.85: return c
    if a and L < 0.2: return '#ffffff' + a                     # ink at low opacity -> white at the same opacity
    if not a and 0.8 < L < 0.97 and s < 0.2: return '#ffffff1f'   # light grey line
    return c

HEX = re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b')
def shadow(v):
    def one(layer):
        ring = re.match(r'\s*(inset\s+)?0\s+0\s+0\s+[\d.]+px', layer)
        f = edge_color if ring else (lambda m: '#000000' + (parse(m.group(0))[3] or 'cc') if parse(m.group(0))[3] and lum(*parse(m.group(0))[:3]) < .2 else m.group(0))
        return HEX.sub(f, layer)
    return ','.join(one(l) for l in re.split(r',(?![^()]*\))', v))

def twin(prop, val):
    p = prop.strip().lower(); v = val.strip(); imp = ' !important' if v.endswith('!important') else ''
    v = v.replace('!important', '').strip()
    if p in ('background', 'background-color'):
        n = HEX.sub(bg_color, v)
    elif p == 'color':
        n = HEX.sub(text_color, v)
    elif p == 'box-shadow':
        n = shadow(v)
    elif p.startswith('border') or p == 'outline' or p.startswith('outline'):
        n = HEX.sub(edge_color, v)
    else:
        return None
    return f'{p}:{n}{imp}' if n != v else None

def blocks(css):
    """yield (media_or_None, selector, body) for the style rules in css"""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    i, n, out = 0, len(css), []
    def rules(text, media):
        j = 0
        while j < len(text):
            k = text.find('{', j)
            if k < 0: break
            sel = text[j:k].strip(); depth, e = 1, k + 1
            while e < len(text) and depth:
                depth += (text[e] == '{') - (text[e] == '}'); e += 1
            body = text[k + 1:e - 1]
            if sel.startswith('@media'): rules(body, sel)
            elif sel.startswith('@'): pass
            else: out.append((media, sel, body))
            j = e
    rules(css, None)
    return out

def build():
    res = {}
    for name in SRC:
        for media, sel, body in blocks((ROOT / 'assets' / f'{name}.css').read_text()):
            if sel.startswith(':root') or sel in ('html', 'body') and False: continue
            if KEEP.search(sel): continue
            decls = []
            for d in re.split(r';(?![^()]*\))', body):
                if ':' not in d: continue
                pr, va = d.split(':', 1); t = twin(pr, va)
                if t: decls.append(t)
            if not decls: continue
            sels = ','.join(':root[data-theme=dark] ' + s.strip() for s in sel.split(',') if s.strip())
            res.setdefault(media, []).append(f'{sels}{{{";".join(decls)}}}')
    return res


# ---------------- Play: light skin (Play is built dark in play.css; this makes it follow the theme) ----------------
PL_BG = {'#111a2c': '#ffffff', '#18233a': '#eef0ff', '#2a2350': '#e2dcff', '#3a1430': '#ffd9ea', '#2a3150': '#cdd5f0', '#3a4466': '#e1e6f7', '#1a2038': '#eef0f8',
         '#2c3352': '#e3e6f2', '#3b3f6e': '#cfd3f5', '#0b1220': '#ffffff', '#070c16': '#eef0f8'}
PL_TXT = {'#cdd3e1': '#3a4252', '#8e97ad': '#6b7280', '#c4b5ff': '#5a3ee0', '#b9a8ff': '#5a3ee0', '#a08bff': '#5a3ee0', '#ffe46b': '#946500', '#6ee7b7': '#047857',
          '#ff5fa2': '#c2006a', '#ff6b9d': '#c2006a', '#34d399': '#047857', '#ffd400': '#946500', '#3fc3ff': '#0079b0', '#ffb020': '#946500', '#2dd4bf': '#0f766e', '#dfe4f2': '#0b1220', '#eef0fa': '#0b1220'}
def _a(h): return h[7:9] if len(h) == 9 else ''
def _scaled(a, k=.55): return '%02x' % max(1, round(int(a, 16) * k)) if a else ''
def pl_bg(m):
    c = m.group(0).lower()
    if c in PL_BG: return PL_BG[c]
    if re.fullmatch(r'#f{6}[0-9a-f]{2}', c): return '#0b1220' + _scaled(_a(c))
    return c
def pl_txt(m):
    c = m.group(0).lower()
    if c in PL_TXT: return PL_TXT[c]
    if re.fullmatch(r'#f{6}([0-9a-f]{2})?', c) or c == '#fff': return 'var(--ink)'
    return c
def pl_edge(m):
    c = m.group(0).lower()
    if re.fullmatch(r'#f{6}[0-9a-f]{2}', c): return '#0b1220' + _scaled(_a(c), .6)
    return c

def light_twin(prop, val, rule_has_white_bg):
    p = prop.strip().lower(); v = val.strip()
    if p in ('background', 'background-color'):
        if v in ('#fff', '#ffffff'): n = '#0b1220'
        else: n = HEX.sub(pl_bg, v)
    elif p == 'color':
        n = '#ffffff' if (rule_has_white_bg and v.lower() == '#0b1220') else HEX.sub(pl_txt, v)
    elif p.startswith('border') or p.startswith('outline'):
        n = HEX.sub(pl_edge, v)
    elif p in ('fill', 'stroke'):
        n = HEX.sub(pl_txt, v)
    else:
        return None
    return f'{p}:{n}' if n != v else None

def build_play_light():
    out = []
    for media, sel, body in blocks((ROOT / 'assets' / 'play.css').read_text()):
        if sel.startswith('.stage{'): continue
        d_list = [d.split(':', 1) for d in re.split(r';(?![^()]*\))', body) if ':' in d]
        white_bg = any(k.strip().lower() in ('background', 'background-color') and v.strip() in ('#fff', '#ffffff') for k, v in d_list)
        decls = [t for t in (light_twin(k, v, white_bg) for k, v in d_list) if t]
        if not decls: continue
        sels = ','.join(':root:not([data-theme=dark]) ' + s.strip() for s in sel.split(',') if s.strip())
        out.append((media, f'{sels}{{{";".join(decls)}}}'))
    return out

PLAY_LIGHT_HEAD = """/* GENERATED by dev/make-dark.py from play.css + the hand-written block below. Play follows the theme: light (default) uses the brand colours on a bright stage. */
:root:not([data-theme=dark]) .stage{--pt:#3a4252;--pmut:#6b7280;--pl:#0b12201f;--pc1:#ffffffcc;color-scheme:light;color:var(--pt);
  background:radial-gradient(900px 520px at 12% -8%,#7a5cff2e,transparent 62%),radial-gradient(800px 520px at 100% 0,#e5007d22,transparent 62%),radial-gradient(700px 480px at 50% 110%,#009fe326,transparent 60%),#f5f6fb;background-repeat:no-repeat;background-color:#f5f6fb}
:root:not([data-theme=dark]) .stage .nav.solid{background:#ffffffe6;box-shadow:0 1px 0 #0b12201a}
:root:not([data-theme=dark]) .stage .wm .w,:root:not([data-theme=dark]) .stage .links a,:root:not([data-theme=dark]) .stage .mbtn{color:var(--ink)}
:root:not([data-theme=dark]) .stage .grad{background:linear-gradient(90deg,#e5007d,#7a5cff 55%,#009fe3);-webkit-background-clip:text;background-clip:text;color:transparent}
:root:not([data-theme=dark]) .stage .gcard,:root:not([data-theme=dark]) .stage .daily,:root:not([data-theme=dark]) .meter div{background:var(--pc1);box-shadow:0 20px 50px -30px #281e7855}
:root:not([data-theme=dark]) .stage .daily.soon{background:transparent;box-shadow:none}
:root:not([data-theme=dark]) .stage .pbtn{background:#0b12200f;color:var(--ink)}
:root:not([data-theme=dark]) .stage .pbtn:hover{background:#0b122019}
:root:not([data-theme=dark]) .stage .pbtn.go,:root:not([data-theme=dark]) .stage .pbtn[aria-pressed=true]{color:#fff}
:root:not([data-theme=dark]) .stage .pbtn.go{background:linear-gradient(135deg,#e5007d,#7a5cff)}
:root:not([data-theme=dark]) .stage .pbtn[aria-pressed=true]{background:#7a5cff}
:root:not([data-theme=dark]) .stage .foot{background:#eef0f8;border-color:#0b12201a}
:root:not([data-theme=dark]) .stage .foot h4,:root:not([data-theme=dark]) .stage .foot li a:hover{color:var(--ink)}
:root:not([data-theme=dark]) .board,:root:not([data-theme=dark]) .mboard,:root:not([data-theme=dark]) .mines{background:#ffffffd9;box-shadow:0 40px 90px -40px #7a5cff77}
:root:not([data-theme=dark]) .board .pcell{background:#7a5cff12}
:root:not([data-theme=dark]) .board .pcell b{background:#0b1220;color:#fff}
:root:not([data-theme=dark]) .board .pcell.v b{background:#ffd400;color:#0b1220}
:root:not([data-theme=dark]) #mcells i{background:#7a5cff14}
:root:not([data-theme=dark]) .sgrid9{background:#0b122033;border-color:#0b122055}
:root:not([data-theme=dark]) .sgrid9 .pcell{color:#5a3ee0}
:root:not([data-theme=dark]) .sgrid9 .pcell.g{color:#0b1220}
:root:not([data-theme=dark]) .sgrid9 .pcell.sel{background:#7a5cff;color:#fff}
:root:not([data-theme=dark]) .sgrid9 .pcell.c3{border-right-color:#0b122055}
:root:not([data-theme=dark]) .sgrid9 .pcell.r3{border-bottom-color:#0b122055}
:root:not([data-theme=dark]) .mq{background:linear-gradient(160deg,#dfe4f6,#c9d1ee);box-shadow:inset 0 1px 0 #ffffffcc}
:root:not([data-theme=dark]) .mq.o{background:#fff}
:root:not([data-theme=dark]) .mq.n7{color:#0b1220}
:root:not([data-theme=dark]) .mq.f::after{background:#0b1220}
:root:not([data-theme=dark]) .mq.m::before,:root:not([data-theme=dark]) .mq.boom::before{background:radial-gradient(circle at 35% 35%,#6b7280,#0b1220 70%)}
:root:not([data-theme=dark]) .mq.boom{background:#e5007d}
:root:not([data-theme=dark]) .ks{border-color:#0b122033;color:#0b12202e}
:root:not([data-theme=dark]) .ks.stock{border-color:#0b12201f}
:root:not([data-theme=dark]) .ks.stock.empty{color:#5a3ee0}
:root:not([data-theme=dark]) .ks.stock.none{color:#0b122022}
:root:not([data-theme=dark]) .rxpad[data-s=idle]{background:linear-gradient(135deg,#7a5cff,#5a3ee0)}
:root:not([data-theme=dark]) .tin{background:#fff;color:var(--ink);border-color:#0b122033}
:root:not([data-theme=dark]) .tywords{color:#6b7280}
:root:not([data-theme=dark]) .tw.cur{background:#7a5cff22;color:var(--ink)}
:root:not([data-theme=dark]) .tw i.ok{color:var(--ink)}
:root:not([data-theme=dark]) .snkbox{box-shadow:0 40px 90px -40px #7a5cff77}
:root:not([data-theme=dark]) .daily b,:root:not([data-theme=dark]) .big,:root:not([data-theme=dark]) .meter b,:root:not([data-theme=dark]) .done .t{color:var(--ink)}
"""
def play_light_file():
    head, body = PLAY_LIGHT_HEAD.split('\n', 1)
    rules = build_play_light()
    parts = [head] + [r for m, r in rules if m is None]
    for media in sorted({m for m, r in rules if m}):
        parts.append(media + '{' + ''.join(r for m, r in rules if m == media) + '}')
    parts.append(body.rstrip('\n'))
    new = '\n'.join(parts) + '\n'
    p = ROOT / 'assets' / 'play-light.css'
    if not p.exists() or p.read_text() != new: p.write_text(new)
    return len(new)

HEAD = """/* GENERATED by dev/make-dark.py from the other style files. Do not edit by hand. Light is the default; dark applies when <html data-theme="dark">. */
:root{--surface:#fff}
:root[data-theme=dark]{color-scheme:dark;--bg:#060914;--mist:#0b1120;--surface:#131b30;--ink:#f4f6fb;--text:#cdd3e1;--muted:#9aa3b8;--line:#ffffff1f;--line2:#ffffff2e;--magenta-deep:#ff5fb0;--shadow:0 1px 2px #0006,0 8px 24px -6px #0008,0 30px 60px -20px #000a}
:root[data-theme=dark] body{background:var(--bg);color:var(--text)}
.themebtn{flex:none;width:44px;height:44px;display:grid;place-items:center;border-radius:999px;border:1px solid var(--line2);background:var(--surface);color:var(--ink);cursor:pointer;padding:0}
.themebtn svg{width:20px;height:20px}
.themebtn .moon,:root[data-theme=dark] .themebtn .sun{display:none}
:root[data-theme=dark] .themebtn .moon{display:block}
.themebtn:hover{border-color:var(--magenta)}
.themebtn:focus-visible{outline:2px solid var(--magenta);outline-offset:2px}
.nav .themebtn{margin-left:8px}
"""

def main():
    res = build(); out = [HEAD]
    out += res.pop(None, [])
    for media, rules in res.items(): out.append(media + '{' + ''.join(rules) + '}')
    p = ROOT / 'assets' / 'dark.css'; new = '\n'.join(out) + '\n'
    if not p.exists() or p.read_text() != new: p.write_text(new)
    return len(new) + play_light_file()

if __name__ == '__main__': print('dark.css', main(), 'bytes')
