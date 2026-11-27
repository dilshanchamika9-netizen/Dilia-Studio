"""Dilia Pulse story pictures: one flat cartoon scene per story, drawn as SVG (1200 x 675), plus a number badge.
No real faces, no company logos. Loaded by make-news.py. Each scene uses the story section's colours."""
import html
E = lambda t: html.escape(str(t), quote=True)
INK, INK2, WHITE, GREY, GREY2 = '#1f2a44', '#3a4766', '#ffffff', '#d9dee9', '#eef1f7'
PAL = {  # accent, deep, light tint, sky top
    'AI': ('#7a5cff', '#4b2fd1', '#e4ddff', '#efeaff'), 'Tech': ('#0ea5d9', '#0573a0', '#cdeffb', '#e6f7fd'),
    'Business': ('#f5a000', '#b86e00', '#ffe7b3', '#fff4dc'), 'Markets': ('#10b981', '#047857', '#c9f3e3', '#e5faf1'),
    'Policy': ('#e5007d', '#a3005a', '#ffd3e8', '#ffeaf4')}

def shadow(cx, cy, rx, ry=None): return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry or rx * .16:.0f}" fill="{INK}" fill-opacity=".13"/>'
def box(x, y, w, h, c, r=10, extra=''): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}"{extra}/>'
def txt(x, y, t, size=28, c=INK, w=800, anchor='middle', extra=''): return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Archivo, system-ui, sans-serif" font-size="{size}" font-weight="{w}" fill="{c}"{extra}>{E(t)}</text>'
def chip(x, y, s, c, dc):
    """a microchip icon, top-left at x,y, size s"""
    o = [box(x, y, s, s, c, s * .14)]
    for k in range(4):
        p = x + s * (.2 + k * .2)
        o += [box(p - 3, y - s * .14, 6, s * .14, dc, 2), box(p - 3, y + s, 6, s * .14, dc, 2), box(x - s * .14, y + s * (.2 + k * .2) - 3, s * .14, 6, dc, 2), box(x + s, y + s * (.2 + k * .2) - 3, s * .14, 6, dc, 2)]
    o.append(box(x + s * .25, y + s * .25, s * .5, s * .5, WHITE, s * .08, ' fill-opacity=".85"'))
    return ''.join(o)
def robot(x, y, s, c, dc, mood='happy'):
    """small friendly robot standing with feet at (x, y), height about 2.2*s"""
    o = [shadow(x, y + 4, s * .9), box(x - s * .35, y - s * .5, s * .22, s * .5, dc, 6), box(x + s * .13, y - s * .5, s * .22, s * .5, dc, 6),
         box(x - s * .6, y - s * 1.35, s * 1.2, s * .9, c, s * .2), box(x - s * .45, y - s * 1.2, s * .9, s * .35, WHITE, s * .1, ' fill-opacity=".35"'),
         box(x - s * .55, y - s * 2.2, s * 1.1, s * .8, c, s * .25), f'<line x1="{x}" y1="{y - s * 2.2}" x2="{x}" y2="{y - s * 2.5}" stroke="{dc}" stroke-width="5"/>',
         f'<circle cx="{x}" cy="{y - s * 2.55}" r="{s * .1}" fill="{dc}"/>', box(x - s * .42, y - s * 2.05, s * .84, s * .5, INK, s * .15),
         f'<circle cx="{x - s * .2}" cy="{y - s * 1.8}" r="{s * .08}" fill="#7ff5ff"/><circle cx="{x + s * .2}" cy="{y - s * 1.8}" r="{s * .08}" fill="#7ff5ff"/>']
    if mood == 'happy': o.append(f'<path d="M{x - s * .12} {y - s * 1.67} q{s * .12} {s * .1} {s * .24} 0" fill="none" stroke="#7ff5ff" stroke-width="4" stroke-linecap="round"/>')
    else: o.append(f'<path d="M{x - s * .12} {y - s * 1.63} q{s * .12} {-s * .08} {s * .24} 0" fill="none" stroke="#7ff5ff" stroke-width="4" stroke-linecap="round"/>')
    o += [box(x - s * .85, y - s * 1.3, s * .25, s * .55, dc, 8), box(x + s * .6, y - s * 1.3, s * .25, s * .55, dc, 8)]
    return ''.join(o)
def coin_stack(x, y, n, c='#f5b400', dc='#c98a00'):
    o = [shadow(x + 50, y + 8, 64)]
    for k in range(n):
        yy = y - k * 16
        o += [f'<ellipse cx="{x + 50}" cy="{yy}" rx="50" ry="14" fill="{dc}"/>', box(x, yy - 14, 100, 14, dc, 0), f'<ellipse cx="{x + 50}" cy="{yy - 14}" rx="50" ry="14" fill="{c}"/>']
    o.append(txt(x + 50, y - n * 16 + 9 - 8, '$', 20, dc))
    return ''.join(o)
def arrow_up(x, y, w, h, c):
    return f'<path d="M{x} {y} l{w / 2} {-h * .35} l{w / 2} {h * .35} h{-w * .28} v{h * .65} h{-w * .44} v{-h * .65} z" fill="{c}"/>'
def bars(x, y, vals, c, w=34, gap=14, hmax=150):
    top = max(vals); o = []
    for k, v in enumerate(vals):
        h = hmax * v / top; o.append(box(x + k * (w + gap), y - h, w, h, c, 6, f' fill-opacity="{.45 + .55 * (k == len(vals) - 1)}"'))
    return ''.join(o)

# ---------------- scenes ----------------
def s_ceo_return(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0)]
    o += [box(380, 150, 440, 70, a, 35), txt(600, 198, 'WELCOME BACK', 38, WHITE)]               # banner
    o += [f'<path d="M380 185 l-40 -10 l20 25 l-20 25 l40 -10 z" fill="{d}"/><path d="M820 185 l40 -10 l-20 25 l20 25 l-40 -10 z" fill="{d}"/>']
    o += [box(530, 290, 140, 150, a, 30), box(548, 306, 104, 52, WHITE, 18, ' fill-opacity=".3"')]   # chair back, behind the desk
    o += [shadow(600, 595, 300), box(330, 420, 540, 40, INK2, 8), box(350, 460, 40, 120, INK2, 6), box(810, 460, 40, 120, INK2, 6)]   # desk
    o += [box(540, 395, 120, 30, d, 6), txt(600, 418, 'CEO', 22, WHITE)]                          # name plate
    o += [chip(170, 300, 70, a, d), chip(960, 260, 80, a, d), chip(980, 420, 50, l, a)]
    o += [arrow_up(200, 470, 90, 130, '#10b981')]
    for k, (cx, cy, c) in enumerate([(300, 130, a), (900, 110, '#e5007d'), (1040, 170, '#0ea5d9'), (220, 200, '#10b981'), (700, 110, '#7a5cff')]):
        o.append(f'<rect x="{cx}" y="{cy}" width="14" height="22" rx="3" fill="{c}" transform="rotate({k * 35} {cx} {cy})"/>')
    return ''.join(o)
def s_datacenter(a, d, l):
    o = [box(0, 520, 1200, 155, GREY2, 0)]
    for k in range(5):
        x = 140 + k * 150; o += [shadow(x + 55, 545, 70), box(x, 230, 110, 310, INK2, 10)]
        for r in range(7): o += [box(x + 12, 250 + r * 40, 86, 26, INK, 5), f'<circle cx="{x + 26}" cy="{263 + r * 40}" r="5" fill="{a if (r + k) % 3 else "#10b981"}"/>', box(x + 40, 259 + r * 40, 48, 8, l, 3, ' fill-opacity=".55"')]
    o += [f'<path d="M880 470 C 950 400, 990 300, 1060 180" fill="none" stroke="{a}" stroke-width="16" stroke-linecap="round"/>', f'<path d="M1030 170 l45 -10 l-5 46 z" fill="{a}"/>']
    o += [bars(880, 520, [57, 96, 116, 130], a, 40, 12, 130)]
    return ''.join(o)
def s_ipo_bell(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0), box(140, 120, 920, 120, INK, 18)]                    # ticker board
    o += [txt(300, 197, 'ANT', 58, '#7ff5ff'), txt(560, 197, '$83.00', 58, WHITE), f'<path d="M760 200 l30 -40 l30 40 z" fill="#10b981"/>', txt(940, 197, 'IPO', 46, a)]
    o += [shadow(600, 575, 170), box(520, 470, 160, 100, INK2, 10), box(590, 360, 20, 120, INK2, 4), box(470, 340, 260, 26, INK2, 8)]
    o += [f'<path d="M540 345 C 540 260, 660 260, 660 345 z" fill="#f5b400"/>', f'<path d="M530 350 h140 l-10 -18 h-120 z" fill="#c98a00"/>', f'<circle cx="600" cy="362" r="12" fill="#c98a00"/>']
    o += [f'<path d="M470 290 q-30 -20 -20 -50" fill="none" stroke="{a}" stroke-width="7" stroke-linecap="round"/><path d="M730 290 q30 -20 20 -50" fill="none" stroke="{a}" stroke-width="7" stroke-linecap="round"/>']
    for k, (cx, cy, c) in enumerate([(250, 330, '#e5007d'), (330, 420, '#0ea5d9'), (900, 330, '#10b981'), (980, 430, '#7a5cff'), (820, 280, '#f5a000'), (390, 290, '#f5a000'), (1050, 300, '#e5007d')]):
        o.append(f'<rect x="{cx}" y="{cy}" width="16" height="26" rx="4" fill="{c}" transform="rotate({k * 40} {cx} {cy})"/>')
    return ''.join(o)
def shield(x, y, s, c, dc):
    return (f'<path d="M{x} {y} l{s * .5} {-s * .18} l{s * .5} {s * .18} v{s * .45} c0 {s * .4} {-s * .3} {s * .62} {-s * .5} {s * .72} c{-s * .2} {-s * .1} {-s * .5} {-s * .32} {-s * .5} {-s * .72} z" fill="{c}"/>'
            f'<path d="M{x + s * .5} {y - s * .18} l{s * .5} {s * .18} v{s * .45} c0 {s * .4} {-s * .3} {s * .62} {-s * .5} {s * .72} z" fill="{dc}" fill-opacity=".35"/>')
def s_shields(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0), shadow(600, 585, 360)]
    o += [shield(220, 230, 300, '#e5007d', '#a3005a'), shield(680, 230, 300, '#0ea5d9', '#0573a0')]
    o += [f'<circle cx="600" cy="330" r="80" fill="{WHITE}"/><circle cx="600" cy="330" r="80" fill="none" stroke="{a}" stroke-width="10"/>', txt(600, 360, '+', 90, a)]
    o += [box(320, 300, 100, 80, WHITE, 12, ' fill-opacity=".9"'), f'<path d="M345 300 v-22 a25 25 0 0 1 50 0 v22" fill="none" stroke="{WHITE}" stroke-width="12"/>']
    o += [f'<path d="M780 340 l30 30 l60 -70" fill="none" stroke="{WHITE}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>']
    return ''.join(o)
def s_escape(a, d, l):
    o = [box(0, 540, 1200, 135, GREY2, 0)]
    o += [box(850, 150, 260, 30, GREY, 4), f'<path d="M840 150 l140 -60 l140 60 z" fill="{GREY}"/>']        # courthouse
    for k in range(4): o.append(box(870 + k * 62, 180, 30, 290, GREY, 4))
    o += [box(840, 465, 280, 30, GREY, 4)]
    o += [shadow(360, 548, 220), box(170, 330, 380, 210, '#c98a4a', 10), box(170, 330, 380, 40, '#a8713a', 6), txt(360, 470, 'TEST', 54, '#7a4d22'),
          f'<path d="M170 330 l-60 -110 l380 0 l60 110 z" fill="#d9a066" transform="rotate(-8 170 330)"/>']
    o += [robot(250, 330, 44, a, d), robot(400, 320, 40, a, d), robot(620, 540, 56, a, d, 'oops'), robot(760, 545, 40, a, d)]
    o += [f'<g transform="rotate(-30 960 560)"><rect x="900" y="535" width="150" height="56" rx="14" fill="#7a4d22"/><rect x="965" y="585" width="22" height="90" rx="8" fill="#a8713a"/></g>', box(930, 610, 160, 26, '#7a4d22', 8)]
    return ''.join(o)
def s_two_models(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0), shadow(600, 575, 360)]
    o += [box(300, 430, 280, 130, INK2, 10), box(620, 380, 280, 180, INK2, 10), txt(440, 510, 'SOL', 44, WHITE), txt(760, 480, 'ASTRA', 44, WHITE)]
    o += [robot(440, 430, 62, l, a), robot(760, 380, 82, a, d)]
    for x, y, t, c in [(150, 190, '$10', '#10b981'), (960, 150, '$40', '#e5007d')]:
        o += [f'<path d="M{x} {y} h120 l40 40 l-40 40 h-120 z" fill="{c}"/>', f'<circle cx="{x + 18}" cy="{y + 40}" r="9" fill="{WHITE}"/>', txt(x + 80, y + 52, t, 34, WHITE)]
    return ''.join(o)
def s_speed(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0), shadow(600, 585, 300)]
    cols = [l, '#b8a6ff', a, d]
    import math
    for k in range(4):
        a0, a1 = math.pi * (1 - k / 4) - .03, math.pi * (1 - (k + 1) / 4) + .03; R, r = 300, 200
        p = lambda ang, rad: (600 + rad * math.cos(ang), 540 - rad * math.sin(ang))
        x0, y0 = p(a0, R); x1, y1 = p(a1, R); x2, y2 = p(a1, r); x3, y3 = p(a0, r)
        o.append(f'<path d="M{x0:.0f} {y0:.0f} A{R} {R} 0 0 1 {x1:.0f} {y1:.0f} L{x2:.0f} {y2:.0f} A{r} {r} 0 0 0 {x3:.0f} {y3:.0f} z" fill="{cols[k]}"/>')
    for k, t in enumerate(['LOW', 'MED', 'HIGH', 'XHIGH']):
        ang = math.pi * (1 - (k + .5) / 4); o.append(txt(600 + 250 * math.cos(ang), 540 - 250 * math.sin(ang) + 9, t, 24, WHITE if k > 1 else INK))
    o += [f'<line x1="600" y1="540" x2="790" y2="400" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>', f'<circle cx="600" cy="540" r="30" fill="{INK}"/>']
    o += [f'<path d="M180 180 l60 0 l-30 70 l50 0 l-90 120 l25 -85 l-45 0 z" fill="#f5b400"/>', f'<path d="M980 150 l60 0 l-30 70 l50 0 l-90 120 l25 -85 l-45 0 z" fill="#f5b400"/>']
    return ''.join(o)
def s_laptop(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0), shadow(600, 585, 380)]
    o += [box(300, 140, 600, 380, INK2, 22), box(325, 165, 550, 330, '#e9eefb', 10), f'<path d="M220 520 h760 l-40 50 h-680 z" fill="{GREY}"/>', box(540, 520, 120, 14, INK2, 6)]
    o += [box(400, 210, 400, 240, WHITE, 16), box(400, 210, 400, 46, a, 16), box(400, 236, 400, 20, a, 0), txt(600, 244, 'ALLOW ACCESS?', 26, WHITE)]
    for k, (t, on) in enumerate([('Protection override', False), ('Accessibility', True)]):
        y = 300 + k * 70; o += [txt(430, y + 10, t, 24, INK, 700, 'start'), box(690, y - 16, 76, 38, '#10b981' if on else GREY, 19), f'<circle cx="{745 if on else 709}" cy="{y + 3}" r="15" fill="{WHITE}"/>']
    o += [box(560, 405, 200, 36, a, 18), txt(660, 430, 'Ask me first', 20, WHITE)]
    o += [robot(1040, 560, 52, l, a), f'<path d="M985 470 q-60 -30 -110 -40" fill="none" stroke="{a}" stroke-width="14" stroke-linecap="round"/>']
    o += [box(120, 330, 110, 90, '#f5b400', 14), f'<path d="M145 330 v-30 a30 30 0 0 1 60 0 v30" fill="none" stroke="#c98a00" stroke-width="14"/>', f'<circle cx="175" cy="370" r="12" fill="#c98a00"/>']
    return ''.join(o)
def s_todo(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0), shadow(420, 580, 220)]
    o += [box(270, 150, 300, 400, '#c98a4a', 18), box(290, 180, 260, 350, WHITE, 8), box(370, 130, 100, 50, INK2, 12)]
    for k in range(4):
        y = 230 + k * 70; o += [box(315, y - 22, 34, 34, l, 8), box(365, y - 12, 150 - k * 15, 14, GREY, 7)]
        if k < 3: o.append(f'<path d="M320 {y - 6} l10 12 l18 -22" fill="none" stroke="{a}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>')
    o += [shadow(830, 585, 130), box(710, 330, 240, 240, '#7a5cff', 24), box(790, 290, 80, 50, '#4b2fd1', 14), box(760, 330, 20, 240, WHITE, 0, ' fill-opacity=".18"'), box(880, 330, 20, 240, WHITE, 0, ' fill-opacity=".18"')]
    o += [box(860, 110, 230, 190, WHITE, 16), box(860, 110, 230, 60, '#e5007d', 16), box(860, 140, 230, 30, '#e5007d', 0), txt(975, 158, 'JUNE 2027', 30, WHITE), txt(975, 270, '30', 96, INK)]
    return ''.join(o)
def s_podium(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0), shadow(600, 585, 360)]
    for x, h, n, w in [(440, 240, '1', 320), (130, 160, '2', 300), (770, 110, '3', 300)]:
        o += [box(x, 560 - h, w, h, a if n == '1' else l, 10), txt(x + w / 2, 560 - h / 2 + 30, n, 90, WHITE if n == '1' else d)]
    for x, y, w, h in [(490, 140, 70, 170), (575, 160, 70, 150), (660, 140, 70, 170), (175, 250, 60, 140), (245, 270, 60, 120), (815, 310, 60, 130), (885, 320, 60, 120)]:
        o.append(box(x, y, w, h, INK2, 8))
        for r in range(int(h // 30)): o.append(box(x + 10, y + 12 + r * 30, w - 20, 12, a if r % 2 else '#7ff5ff', 4, ' fill-opacity=".8"'))
    o += [f'<path d="M560 80 h80 v30 a40 40 0 0 1 -80 0 z" fill="#f5b400"/>', box(590, 130, 20, 10, '#c98a00', 2)]
    return ''.join(o)
def s_servers_up(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0), shadow(560, 585, 400)]
    for k in range(5):
        x = 180 + k * 160; h = 90 + k * 70
        for r in range(int(h // 60)):
            y = 560 - (r + 1) * 60; o += [box(x, y + 4, 130, 54, INK2, 8), f'<circle cx="{x + 20}" cy="{y + 31}" r="6" fill="{a if (r + k) % 2 else "#10b981"}"/>', box(x + 40, y + 26, 75, 10, l, 4, ' fill-opacity=".6"')]
    o += [arrow_up(1000, 300, 140, 200, '#10b981')]
    o += [f'<path d="M245 300 C 400 180, 700 120, 1010 90" fill="none" stroke="{a}" stroke-width="8" stroke-dasharray="4 18" stroke-linecap="round"/>']
    return ''.join(o)
def s_oil(a, d, l):
    o = [box(0, 470, 1200, 205, '#7cc8ec', 0)]
    for k in range(6): o.append(f'<path d="M{k * 220} 500 q55 -18 110 0 t110 0" fill="none" stroke="{WHITE}" stroke-opacity=".6" stroke-width="6"/>')
    o += [f'<circle cx="1010" cy="140" r="70" fill="#ffd25a"/>']
    o += [box(420, 290, 360, 60, INK2, 8), box(450, 350, 26, 190, INK2, 4), box(724, 350, 26, 190, INK2, 4), box(587, 350, 26, 190, INK2, 4)]
    o += [f'<path d="M470 290 l50 -190 l50 190" fill="none" stroke="{INK2}" stroke-width="14"/><path d="M490 220 h60 M505 160 h30" stroke="{INK2}" stroke-width="10"/>']
    o += [box(640, 230, 120, 60, a, 8), box(660, 200, 60, 30, d, 6), box(780, 260, 120, 14, INK2, 4), f'<path d="M900 260 l20 -40" stroke="{INK2}" stroke-width="10"/>', f'<path d="M915 200 q12 -30 0 -50 q30 25 10 55 z" fill="#ff7a2f"/>']
    o += [coin_stack(140, 440, 7), coin_stack(260, 440, 4)]
    return ''.join(o)
def s_bull(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0)]
    for k, (o_, c_) in enumerate([(380, 420), (420, 360), (350, 300), (300, 220), (230, 150)]):
        x = 640 + k * 100; up = c_ < o_; o += [box(x + 18, min(o_, c_) - 30, 4, abs(o_ - c_) + 60, INK2, 2), box(x, min(o_, c_), 40, abs(o_ - c_), '#10b981' if up else '#e5007d', 6)]
    o += [shadow(330, 580, 230)]
    o += [f'<path d="M150 400 q0 -120 140 -130 h170 q90 0 100 80 l10 70 q-10 30 -40 20 l-20 -50 q-40 40 -110 30 l-20 160 h-40 l-10 -150 q-40 0 -70 -10 l-20 160 h-40 l-10 -150 z" fill="{INK2}"/>']
    o += [f'<path d="M540 290 q40 -60 90 -60 q-20 20 -40 70 z" fill="{INK2}"/>', f'<path d="M520 275 q-10 -60 30 -100 q0 40 -5 90 z" fill="#f5e6c8"/><path d="M590 285 q20 -60 70 -80 q-20 40 -40 90 z" fill="#f5e6c8"/>']
    o += [f'<circle cx="575" cy="330" r="9" fill="{WHITE}"/><circle cx="577" cy="332" r="4" fill="{INK}"/>', f'<path d="M150 330 q-40 -20 -50 30" fill="none" stroke="{INK2}" stroke-width="10" stroke-linecap="round"/>']
    o += [f'<path d="M90 520 q40 -30 80 0" fill="none" stroke="{GREY}" stroke-width="10" stroke-linecap="round"/><path d="M60 470 q30 -20 60 0" fill="none" stroke="{GREY}" stroke-width="8" stroke-linecap="round"/>']
    return ''.join(o)
def person(x, y, c, s=1):
    return (shadow(x, y + 4, 34 * s) + f'<rect x="{x - 26 * s}" y="{y - 110 * s}" width="{52 * s}" height="{110 * s}" rx="{24 * s}" fill="{c}"/>' +
            f'<circle cx="{x}" cy="{y - 138 * s}" r="{26 * s}" fill="#e6b98f"/>')
def s_store(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0), shadow(600, 575, 420)]
    o += [box(220, 200, 760, 360, WHITE, 10), box(200, 150, 800, 80, a, 14)]
    for k in range(8): o.append(f'<path d="M{200 + k * 100} 230 q50 50 100 0" fill="{d if k % 2 else a}"/>')
    o += [box(270, 300, 260, 200, '#cdeffb', 8), box(670, 300, 160, 260, INK2, 8), box(700, 330, 100, 130, '#cdeffb', 6)]
    for k, c in enumerate(['#e5007d', '#10b981', '#7a5cff']): o += [box(290 + k * 80, 420, 60, 80, c, 8), f'<path d="M{300 + k * 80} 420 q20 -30 40 0" fill="none" stroke="{c}" stroke-width="6"/>']
    o += [person(150, 560, '#7a5cff'), person(1060, 560, '#e5007d'), person(890, 560, '#0ea5d9', .9), box(1090, 470, 50, 60, '#10b981', 8), box(910, 480, 44, 54, '#f5a000', 8)]
    o += [f'<path d="M560 330 h80 l25 25 l-25 25 h-80 z" fill="#f5b400"/>', f'<circle cx="575" cy="355" r="7" fill="{WHITE}"/>', txt(615, 365, '$$', 26, INK)]
    return ''.join(o)
def s_gate(a, d, l):
    o = [box(0, 560, 1200, 115, GREY2, 0), box(0, 470, 1200, 40, INK2, 0)]
    for k in range(12): o.append(box(k * 110, 482, 60, 16, GREY, 6, ' fill-opacity=".5"'))
    o += [box(60, 230, 260, 240, GREY, 10), box(100, 170, 50, 70, GREY, 6), box(190, 190, 50, 50, GREY, 6), box(100, 300, 70, 70, '#cdeffb', 6), box(210, 300, 70, 70, '#cdeffb', 6)]
    o += [chip(390, 380, 80, a, d), chip(980, 380, 80, l, a)]
    o += [box(640, 300, 40, 180, INK2, 6), f'<g transform="rotate(-6 660 320)"><rect x="660" y="300" width="300" height="34" rx="10" fill="#e5007d"/>' + ''.join(box(690 + k * 70, 300, 34, 34, WHITE, 0) for k in range(4)) + '</g>']
    o += [f'<g transform="rotate(-12 840 200)"><rect x="740" y="150" width="220" height="90" rx="10" fill="none" stroke="#e5007d" stroke-width="8"/>' + txt(850, 210, 'LICENCE?', 38, '#e5007d') + '</g>']
    return ''.join(o)

SCENES = {'ceo-return': s_ceo_return, 'datacenter': s_datacenter, 'ipo-bell': s_ipo_bell, 'shields': s_shields, 'escape': s_escape, 'two-models': s_two_models,
          'speed': s_speed, 'laptop': s_laptop, 'todo': s_todo, 'podium': s_podium, 'servers-up': s_servers_up, 'oil': s_oil, 'bull': s_bull, 'store': s_store, 'gate': s_gate}

def picture(topic, scene, uid, badge=None, label=''):
    a, d, l, sky = PAL[topic]; W, H = 1200, 675
    o = [f'<svg class="pgfx" viewBox="0 0 {W} {H}" role="img" aria-label="{E(label)}" xmlns="http://www.w3.org/2000/svg">',
         f'<defs><linearGradient id="{uid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{sky}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#{uid}s)"/><circle cx="1000" cy="120" r="230" fill="{l}" fill-opacity=".55"/><circle cx="140" cy="560" r="180" fill="{l}" fill-opacity=".4"/>',
         SCENES[scene](a, d, l)]
    if badge:
        w = 70 + sum(16 if ch in ' .,:' else 33 for ch in badge)
        o += [f'<rect x="34" y="34" width="{w}" height="92" rx="22" fill="{INK}" fill-opacity=".14" transform="translate(4 6)"/>', box(34, 34, w, 92, WHITE, 22), box(34, 34, 12, 92, a, 6), txt(34 + 12 + (w - 12) / 2, 99, badge, 52, d)]
    o.append('</svg>'); return ''.join(o)

def typographic(topic, uid, badge=None, kicker='', label=''):
    """D13 (DR-02): neutral typographic card for a story whose scene is already used by a newer story. Same frame as picture()."""
    a, d, l, sky = PAL[topic]; W, H = 1200, 675
    big = badge or topic
    size = 210 if len(big) <= 6 else max(96, int(210 * 6 / len(big)))
    return ''.join([f'<svg class="pgfx" viewBox="0 0 {W} {H}" role="img" aria-label="{E(label)}" xmlns="http://www.w3.org/2000/svg">',
        f'<defs><linearGradient id="{uid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{sky}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>',
        f'<rect width="{W}" height="{H}" fill="url(#{uid}s)"/><circle cx="1000" cy="120" r="230" fill="{l}" fill-opacity=".55"/><circle cx="140" cy="560" r="180" fill="{l}" fill-opacity=".4"/>',
        box(80, 300, 1040, 6, a, 3),
        txt(600, 260, big, size, d, 900),
        txt(600, 400, (kicker or topic).upper(), 40, INK2, 800, extra=' letter-spacing="6"'),
        '</svg>'])
