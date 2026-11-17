#!/usr/bin/env python3
"""Regenerates the tool pages (split, delete, extract, rotate, reorder, pdf2img, img2pdf) from one template.
Edit the TOOLS table below, run `python3 dev/make-pages.py` from the repo root, commit the html files.
merge.html is hand-written and not touched."""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

SPRITE = '<svg class="sprite" aria-hidden="true"><defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e5007d"/><stop offset=".55" stop-color="#7a5cff"/><stop offset="1" stop-color="#009fe3"/></linearGradient><symbol id="mark" viewBox="0 0 48 48"><path fill-rule="evenodd" d="M8 6h19l13 13v5A18 18 0 0 1 22 42H8zM16 14v20h6a10 10 0 0 0 10-10v-3l-7-7z" fill="url(#dg)"/><path d="M27 6v13h13z" fill="var(--fold,#0b1220)"/></symbol></defs></svg>'
PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
UP = '<svg viewBox="0 0 24 24"><path d="M12 16V5m0 0-4.5 4.5M12 5l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
SHIELD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v6c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#e5007d"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

def btn(act, label): return f'<button class="btn ghost sm" type="button" data-act="{act}">{label}</button>'
def rng(label, ph, hint=''):
    return f'<div class="optfield"><label class="lbl" for="rng">{label}</label><span class="name"><input id="rng" type="text" inputmode="text" placeholder="{ph}" spellcheck="false" autocomplete="off"></span><p class="err" id="err" hidden></p></div>'


def chk(i, label, checked=False): return f'<label class="check"><input type="checkbox" id="{i}"{" checked" if checked else ""}><span>{label}</span></label>'
def numf(i, label, val, mn, mx, step=1, unit=''):
    return f'<div class="optfield sm"><label class="lbl" for="{i}">{label}</label><span class="name"><input id="{i}" type="number" min="{mn}" max="{mx}" step="{step}" value="{val}">{f"<em>{unit}</em>" if unit else ""}</span></div>'
def sw(v, label, checked=False): return f'<label class="chip sw"><input type="radio" name="wc" value="{v}"{" checked" if checked else ""}><span><i style="background:{v}"></i>{label}</span></label>'

OPT_WM = ('<div class="optfield grow"><label class="lbl" for="wmText">Watermark text</label><span class="name"><input id="wmText" type="text" value="CONFIDENTIAL" maxlength="60" spellcheck="false" autocomplete="off"></span></div>'
  + numf('wmSize', 'Size', 64, 8, 240, 1, 'pt')
  + '<div class="optfield"><label class="lbl" for="wmOp">Strength</label><input class="range" id="wmOp" type="range" min="5" max="100" value="30"></div>'
  + '<div class="optfield"><span class="lbl">Colour</span><div class="chips">' + sw('#8a8f98','Grey',True) + sw('#e5007d','Magenta') + sw('#009fe3','Cyan') + sw('#0b1220','Black') + '</div></div>'
  + '<div class="optfield"><label class="lbl" for="wmAng">Angle</label><select class="dd" id="wmAng"><option value="45">Diagonal</option><option value="0">Straight</option><option value="90">Upright</option></select></div>'
  + '<div class="optfield"><span class="lbl">Layout</span><div class="chips"><label class="chip"><input type="radio" name="wl" value="center" checked><span>One, centred</span></label><label class="chip"><input type="radio" name="wl" value="tiled"><span>Repeated</span></label></div></div>'
  + '<p class="err" id="err" hidden></p>')
OPT_NUM = ('<div class="optfield"><label class="lbl" for="nPos">Position</label><select class="dd" id="nPos"><option value="bottom-center">Bottom centre</option><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top-center">Top centre</option><option value="top-right">Top right</option><option value="top-left">Top left</option></select></div>'
  + '<div class="optfield"><label class="lbl" for="nFmt">Format</label><select class="dd" id="nFmt"><option value="n">1</option><option value="page">Page 1</option><option value="of">1 / 10</option><option value="pageof">Page 1 of 10</option></select></div>'
  + numf('nStart', 'Start at', 1, 0, 99999) + numf('nSize', 'Size', 12, 6, 48, 1, 'pt')
  + '<div class="optfield">' + chk('nSkip', 'Leave the first page unnumbered') + '</div><p class="err" id="err" hidden></p>')
OPT_CROP = ('<div class="optfield wide"><span class="lbl">Cut from each side, as a percent of the page</span><div class="four">'
  + numf('cT','Top',0,0,45,1,'%') + numf('cR','Right',0,0,45,1,'%') + numf('cB','Bottom',0,0,45,1,'%') + numf('cL','Left',0,0,45,1,'%') + '</div></div><p class="err" id="err" hidden></p>')
OPT_TEXT = chk('tSep', 'Mark where each page starts') + rng('Pages', '1-3, 7, 10-')

OPT_PROTECT = ('<div class="optfield grow"><label class="lbl" for="pw1">Password to open the file</label><span class="name"><input id="pw1" type="password" autocomplete="new-password" spellcheck="false"></span></div>'
  '<div class="optfield grow"><label class="lbl" for="pw2">Type it again</label><span class="name"><input id="pw2" type="password" autocomplete="new-password" spellcheck="false"></span></div>'
  '<div class="optfield wide"><span class="lbl">Allow people who open it to</span><div class="checks">' + chk('aPrint','Print',True) + chk('aCopy','Copy text',True) + chk('aEdit','Change the file',True) + '</div>'
  '<p class="hint">Uses AES-256 encryption. Print, copy and change limits are respected by most PDF apps but are not a lock. Only the password to open is a real lock. If it is forgotten, nobody can open the file.</p></div>'
  '<p class="err" id="err" hidden></p>')
OPT_UNLOCK = ('<div class="optfield grow"><label class="lbl" for="pw1">Password</label><span class="name"><input id="pw1" type="password" autocomplete="off" spellcheck="false" placeholder="Leave empty if the file only has limits"></span></div>'
  '<div class="optfield wide"><p class="hint">You need to know the password. This tool removes it so the file opens without one. It cannot guess or break passwords.</p></div><p class="err" id="err" hidden></p>')
OPT_COMPRESS = ('<div class="optfield wide"><span class="lbl">How much to shrink</span><div class="radios" role="radiogroup" aria-label="Level">'
  '<label class="radio"><input type="radio" name="lv" value="light" checked><b>Light</b><small>Photos stay sharp. Smallest saving.</small></label>'
  '<label class="radio"><input type="radio" name="lv" value="medium"><b>Medium</b><small>Good for email. Photos slightly softer.</small></label>'
  '<label class="radio"><input type="radio" name="lv" value="strong"><b>Strong</b><small>Smallest file. Photos clearly softer.</small></label></div>'
  '<p class="hint">Shrinks the photos inside the PDF. Text and drawings are left untouched, so a PDF that is mostly text will not get much smaller.</p></div>')

OPT_OCR = (chk('skipText', 'Skip pages that already have text', True)
  + '<div class="optfield wide"><p class="hint">Reads the words on scanned pages and hides them behind the picture, so the PDF becomes searchable and you can copy text. The pages look exactly the same. English only for now. The first run loads about 6 MB, then it is remembered.</p></div>')
OPT_SPLIT = '''<div class="radios" role="radiogroup" aria-label="How to split">
  <label class="radio"><input type="radio" name="sm" value="every" checked><b>Every page</b><small>One PDF per page.</small></label>
  <label class="radio" data-for="n"><input type="radio" name="sm" value="n"><b>Every N pages</b><small>Equal chunks. The last one may be shorter.</small><span class="name"><input id="nIn" type="number" min="1" step="1" value="2" aria-label="Pages per file"></span></label>
  <label class="radio" data-for="ranges"><input type="radio" name="sm" value="ranges"><b>Custom ranges</b><small>Each range becomes its own file, e.g. 1-3, 4-6, 7.</small><span class="name"><input id="rng" type="text" placeholder="1-3, 4-6, 7-" spellcheck="false" autocomplete="off" aria-label="Page ranges"></span></label>
</div><p class="err" id="err" hidden></p>'''

OPT_IMG = '''<div class="optfield"><span class="lbl">Page size</span>
  <div class="chips" role="radiogroup" aria-label="Page size">
  <label class="chip"><input type="radio" name="ps" value="fit" checked><span>Same as image</span></label>
  <label class="chip"><input type="radio" name="ps" value="a4"><span>A4</span></label>
  <label class="chip"><input type="radio" name="ps" value="letter"><span>US Letter</span></label></div></div>
<div class="optfield"><label class="lbl" for="orient">Orientation</label><select class="dd" id="orient"><option value="auto">Match each image</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div>
<div class="optfield"><label class="lbl" for="margin">Margin</label><select class="dd" id="margin"><option value="0">None</option><option value="18">Small</option><option value="36">Large</option></select></div>'''

OPT_IMGOUT = '''<div class="optfield"><span class="lbl">Format</span>
  <div class="chips" role="radiogroup" aria-label="Image format">
  <label class="chip"><input type="radio" name="fmt" value="png" checked><span>PNG</span></label>
  <label class="chip"><input type="radio" name="fmt" value="jpg"><span>JPG</span></label></div></div>
<div class="optfield"><label class="lbl" for="dpi">Quality</label><select class="dd" id="dpi"><option value="100">Light, 100 DPI</option><option value="150" selected>Standard, 150 DPI</option><option value="200">High, 200 DPI</option><option value="300">Print, 300 DPI</option></select></div>
''' + rng('Pages', '1-3, 7, 10-')

TOOLS = [
 dict(id='split', name='Split PDF', crumb='Split', kind='pdf', engine='ptool',
      lead='Cut one PDF into several. Split every page, every few pages, or by ranges you type. Colours show which file each page lands in.',
      drop='Drop a PDF here', acts=[], opt=OPT_SPLIT, ext='zip', defname='Dilia-split',
      s1='Pages in', l2='Files out', l3='Size in', go='Split and download', field='File name'),
 dict(id='delete', name='Delete pages', crumb='Delete pages', kind='pdf', engine='ptool',
      lead='Click the pages you do not need, or type their numbers. The new PDF contains only what is left, and deleted content is not kept inside the file.',
      drop='Drop a PDF here', acts=[btn('odd', 'Odd pages'), btn('even', 'Even pages'), btn('none', 'Clear')],
      opt=rng('Pages to delete', '1-3, 7, 10-'), ext='pdf', defname='Dilia-edited', field='File name'),
 dict(id='extract', name='Extract pages', crumb='Extract pages', kind='pdf', engine='ptool',
      lead='Choose the pages to keep and save them as a new PDF. Click pages or type numbers like 2-5, 9.',
      drop='Drop a PDF here', acts=[btn('all', 'All'), btn('odd', 'Odd'), btn('even', 'Even'), btn('none', 'None')],
      opt=rng('Pages to extract', '2-5, 9'), ext='pdf', defname='Dilia-extract', field='File name'),
 dict(id='rotate', name='Rotate PDF pages', crumb='Rotate', kind='pdf', engine='ptool',
      lead='Turn single pages, or the whole file, left or right. Hover a page for its arrows.',
      drop='Drop a PDF here', acts=[btn('left', 'All left'), btn('right', 'All right'), btn('reset', 'Reset')],
      opt='', ext='pdf', defname='Dilia-rotated', field='File name'),
 dict(id='reorder', name='Reorder pages', crumb='Reorder pages', kind='pdf', engine='ptool',
      lead='Drag pages into the order you want, then save. Pages that moved are marked.',
      drop='Drop a PDF here', acts=[btn('reverse', 'Reverse order'), btn('reset', 'Reset')],
      opt='', ext='pdf', defname='Dilia-reordered', field='File name'),
 dict(id='pdf2img', name='PDF to images', crumb='PDF to images', kind='pdf', engine='ptool',
      lead='Save pages as PNG or JPG pictures. One page gives one image, several pages come in one ZIP.',
      drop='Drop a PDF here', acts=[btn('all', 'All'), btn('odd', 'Odd'), btn('even', 'Even'), btn('none', 'None')],
      opt=OPT_IMGOUT, ext='zip', defname='Dilia-images', field='File name', s1='Pages in', l2='Selected', l3='Images out', go='Save as images'),

 dict(id='watermark', name='Watermark', crumb='Watermark', kind='pdf', engine='ptool',
      lead='Stamp text across every page. The preview on each page shows the result before you save.',
      drop='Drop a PDF here', acts=[], opt=OPT_WM, ext='pdf', defname='Dilia-watermark', field='File name', go='Add watermark and download'),
 dict(id='number', name='Page numbers', crumb='Page numbers', kind='pdf', engine='ptool',
      lead='Add page numbers in the position and format you choose.',
      drop='Drop a PDF here', acts=[], opt=OPT_NUM, ext='pdf', defname='Dilia-numbered', field='File name', go='Add numbers and download'),
 dict(id='crop', name='Crop PDF', crumb='Crop', kind='pdf', engine='ptool',
      lead='Trim the edges of every page. The area you keep is shown on each page. Cut-off content is hidden, not erased.',
      drop='Drop a PDF here', acts=[], opt=OPT_CROP, ext='pdf', defname='Dilia-cropped', field='File name', go='Crop and download'),
 dict(id='text', name='PDF to text', crumb='PDF to text', kind='pdf', engine='ptool',
      lead='Copy out all the text as a plain .txt file. Scanned pages have no text to copy until OCR arrives.',
      drop='Drop a PDF here', acts=[btn('all', 'All'), btn('odd', 'Odd'), btn('even', 'Even'), btn('none', 'None')],
      opt=OPT_TEXT, ext='txt', defname='Dilia-text', field='File name', s1='Pages in', l2='Selected', l3='Pages out', go='Save as text'),

 dict(id='protect', name='Password protect', crumb='Password protect', kind='file', engine='filetool', qpdf=1,
      lead='Lock a PDF with a password. It is encrypted on this device with AES-256.',
      drop='Drop a PDF here', acts=[], opt=OPT_PROTECT, ext='pdf', defname='Dilia-protected', field='File name',
      s1='Pages', l2='Encryption', l3='Size in', go='Protect and download'),
 dict(id='unlock', name='Remove password', crumb='Remove password', kind='file', engine='filetool', qpdf=1,
      lead='Open a PDF you know the password for and save a copy that needs none.',
      drop='Drop a locked PDF here', acts=[], opt=OPT_UNLOCK, ext='pdf', defname='Dilia-unlocked', field='File name',
      s1='Size in', l2='Status', l3='Pages', go='Remove password and download'),
 dict(id='compress', name='Compress PDF', crumb='Compress', kind='file', engine='filetool',
      lead='Make a PDF smaller for email by shrinking the photos inside it.',
      drop='Drop a PDF here', acts=[], opt=OPT_COMPRESS, ext='pdf', defname='Dilia-compressed', field='File name',
      s1='Size in', l2='Size out', l3='Saved', go='Compress and download'),
 dict(id='ocr', name='Recognise text (OCR)', crumb='Recognise text', kind='file', engine='filetool', extra=['assets/vendor/ocr/tesseract.min.js'],
      lead='Make a scanned PDF searchable. Your pages stay exactly as they are, with the text added invisibly.',
      drop='Drop a scanned PDF here', acts=[], opt=OPT_OCR, ext='pdf', defname='Dilia-searchable', field='File name',
      s1='Pages', l2='Language', l3='Size in', go='Recognise text and download'),
 dict(id='img2pdf', name='Images to PDF', crumb='Images to PDF', kind='img', engine='img2pdf',
      lead='Turn photos and scans into one PDF. Drag to order, turn any image, pick a page size.',
      drop='Drop images here', acts=[], opt=OPT_IMG, ext='pdf', defname='Dilia-images', field='File name',
      s1='Images', l2='Pages', l3='Size in', go='Create PDF'),
]

def page(t):
    img = t['kind'] == 'img'
    isfile = t['kind'] == 'file'
    accept = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif' if img else 'application/pdf,.pdf'
    multi = ' multiple' if img else ''
    small = 'JPG, PNG, WebP, GIF, BMP and AVIF. Nothing is uploaded.' if img else 'The file is read by your browser and never uploaded.'
    choose = 'choose images' if img else 'choose a file'
    if isfile:
        bar_left = '<b class="fn" id="fname"></b>'
        bar_acts = '<label class="btn ghost sm" for="pick">Change PDF</label>'
    elif img:
        bar_left = '<p class="tip">Drag images to set the page order.</p>'
        bar_acts = f'<button class="btn ghost sm" type="button" id="sortAz">Sort A to Z</button><label class="btn ghost sm" for="pick">{PLUS}Add images</label>'
    else:
        tips = {'split': 'Pages are coloured by the file they go into.', 'delete': 'Click a page to mark it for deletion.', 'extract': 'Click a page to keep it.',
                'rotate': 'Use the arrows on a page to turn it.', 'reorder': 'Drag pages to a new position.', 'pdf2img': 'Click a page to include or skip it.', 'watermark': 'Preview shows the watermark on each page.', 'number': 'Preview shows where numbers go.', 'crop': 'Light areas will be cut off.', 'text': 'Click a page to include or skip it.'}[t['id']]
        bar_left = f'<b class="fn" id="fname"></b><p class="tip">{tips}</p>'
        bar_acts = ''.join(t['acts']) + f'<label class="btn ghost sm" for="pick">Change PDF</label>'
    filebox = '<div class="filebox" id="fbox"><div class="fthumb" id="fthumb"><span>PDF</span></div><div class="finfo"><b id="fn2"></b><span id="fmeta"></span><p id="fstate"></p></div></div>' if isfile else ''
    gridhtml = '' if isfile else '<div class="grid" id="grid"></div>'
    opt = f'<div class="optbar">{t["opt"]}</div>' if t['opt'] else ''
    go_label = t.get('go', {'delete': 'Delete pages and download', 'extract': 'Extract and download', 'rotate': 'Save rotated PDF', 'reorder': 'Save new order'}.get(t['id'], 'Download'))
    body_attr = f' data-tool="{t["id"]}"' if not img else ''
    qp = ('<script src="assets/vendor/qpdf.js"></script>' if t.get('qpdf') else '') + ''.join(f'<script src="{u}"></script>' for u in t.get('extra', []))
    title = f'{t["name"]} - Free Online | Dilia Studio'
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{t['name']} in your browser with Dilia Studio. Nothing is uploaded.">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="assets/mark.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/work.css">
</head>
<body class="work"{body_attr}>
{SPRITE}

<header class="nav solid" data-solid="1">
  <div class="wrap">
    <a class="brand" href="./" aria-label="Dilia Studio home"><svg><use href="#mark"/></svg><span class="wm"><span class="w">Dilia</span><span class="l">Studio</span></span></a>
    <nav class="links" aria-label="Main">
      <a href="tools.html">Tools</a>
      <a class="opt" href="./#privacy">Privacy</a>
    </nav>
  </div>
</header>

<main class="ws-page">
  <div class="ws-head wrap">
    <div>
      <p class="crumb"><a href="tools.html">Tools</a><span>/</span>{t['crumb']}</p>
      <h1>{t['name']}</h1>
      <p class="lead">{t['lead']}</p>
    </div>
  </div>

  <div class="ws wrap" id="ws" data-state="empty">
    <section class="board" aria-label="{t['name']}">
      <label class="dropzone" for="pick" id="dropzone">
        <span class="dz-art" aria-hidden="true">
          <span class="dz-page p1"></span><span class="dz-page p2"></span><span class="dz-page p3">{UP}</span>
        </span>
        <b>{t['drop']}</b>
        <span>or <u>{choose}</u> from your device</span>
        <small>{small}</small>
      </label>
      <input id="pick" class="vh" type="file" accept="{accept}"{multi}>

      <div class="bar-tools" id="toolbar">
        {bar_left}
        <div class="acts">{bar_acts}</div>
      </div>
      {filebox}{opt}
      {gridhtml}
    </section>

    <aside class="side" aria-label="Settings">
      <div class="side-in">
        <h2>{'Your text file' if t['id']=='text' else 'Your new PDF' if t['id'] not in ('split','pdf2img') else 'Your new files'}</h2>
        <dl class="sum">
          <div><dt id="l1">{t.get('s1','Pages in')}</dt><dd id="s1">0</dd></div>
          <div><dt id="l2">{t.get('l2','Pages')}</dt><dd id="s2">0</dd></div>
          <div><dt id="l3">{t.get('l3','Size in')}</dt><dd id="s3">0</dd></div>
        </dl>
        <label class="field" for="outName">{t['field']}
          <span class="name"><input id="outName" type="text" value="{t['defname']}" spellcheck="false" autocomplete="off"><em id="ext">.{t['ext']}</em></span>
        </label>
        <button class="btn go" type="button" id="go" disabled>
          <span class="go-l">{go_label}</span>
          <span class="go-p" aria-hidden="true"><i id="prog"></i></span>
        </button>
        <p class="note" id="note">Add a file to start.</p>
        <div class="done" id="done" hidden>
          {CHECK}
          <div><b id="doneName"></b><span id="doneInfo"></span>
            <p><a href="#" id="again">Download again</a><button type="button" id="reset">Start over</button></p></div>
        </div>
        <p class="safe">{SHIELD}Processed in this tab. Nothing is uploaded.</p>
      </div>
    </aside>
  </div>
</main>

<div class="toasts" id="toasts" aria-live="polite"></div>
<div class="dropveil" id="veil" aria-hidden="true"><div><svg><use href="#mark"/></svg><p>Drop to add</p></div></div>

<script src="assets/vendor/pdf-lib.min.js"></script>
<script src="assets/vendor/pdf.min.js"></script>
<script src="assets/vendor/Sortable.min.js"></script>
{qp}
<script src="assets/common.js"></script>
<script src="assets/kit.js"></script>
<script src="assets/{t['engine']}.js"></script>
</body>
</html>
'''

for t in TOOLS:
    (ROOT / f"{t['id']}.html").write_text(page(t))
    print('wrote', t['id'] + '.html')

# ---------------- editor pages (one editor, five entry points) ----------------
ICO = {
 'select': 'M6 3l12 7-5.5 1.6L10 17z', 'edit': 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', 'text': 'M5 7V5h14v2M12 5v14M9 19h6',
 'image': 'M3 5h18v14H3zM3 16l5-5 5 5 3-3 5 5M15.5 9.5h.01', 'sign': 'M3 16c3-1 4-9 6-9s-1 9 1 9 3-4 4-4 1 3 3 3 2-1 4-2M3 21h18',
 'redact': 'M5 4h14v16H5zM5 10h14v4H5z', 'highlight': 'M4 21h16M6 17l9-9 3 3-9 9H6z', 'note': 'M4 4h16v12H9l-5 4z', 'draw': 'M3 17c3-6 6 2 9-4s5-6 9-3',
 'box': 'M4 5h16v14H4z', 'whiteout': 'M3 6h18v12H3zM8 12h8', 'undo': 'M9 14 4 9l5-5M4 9h10a5 5 0 0 1 0 10h-3', 'redo': 'M15 14l5-5-5-5M20 9H10a5 5 0 0 0 0 10h3'
}
def ic(k): return f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="{ICO[k]}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
def tb(k, label): return f'<button type="button" class="etool" data-t="{k}" aria-pressed="false" title="{label}">{ic(k)}<span>{label}</span></button>'

EDITORS = [
 dict(id='edit', name='Edit text', lead='Click any line of text in your PDF and change it. You can also add text, images, shapes and your signature.'),
 dict(id='add', name='Add text and images', lead='Type anywhere on the page, place photos and logos, draw boxes and lines.'),
 dict(id='forms', name='Fill forms', lead='Type into fields, tick boxes and pick options, then save the filled PDF.'),
 dict(id='sign', name='Sign', lead='Draw, type or upload your signature and place it on any page.'),
 dict(id='redact', name='Redact', lead='Black out names, numbers and areas for good. Redacted pages are turned into pictures, so the hidden content cannot be copied or recovered.', only=['select', 'redact'], find=1, go='Redact and download'),
 dict(id='annotate', name='Highlight and notes', lead='Highlight lines, draw, box things in and leave notes that show in any PDF reader.'),
]
def editor_page(t):
    if t.get('only'): tools = ''.join(tb(k, {'select': 'Select', 'redact': 'Redact'}[k]) for k in t['only'])
    else: tools = ''.join([tb('select','Select'), tb('edit','Edit text'), tb('text','Text'), tb('image','Image'), tb('sign','Sign'),
                     '<i class="esep"></i>', tb('highlight','Highlight'), tb('note','Note'), tb('draw','Draw'), tb('box','Box'), tb('whiteout','White-out')])
    find = ('<div class="rfind"><span class="name"><input id="rq" type="text" placeholder="Find a word or number to black out" spellcheck="false" autocomplete="off" aria-label="Find text"></span><button type="button" class="btn ghost sm" id="rgo">Mark all matches</button><span id="rres"></span></div><p class="rwarn">Pages you redact are saved as pictures and lose their text. Check every black box before downloading. A redaction cannot be undone once the file is saved.</p>') if t.get('find') else ''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{t['name']} - Free Online | Dilia Studio</title>
<meta name="description" content="{t['name']} in your browser with Dilia Studio. Nothing is uploaded.">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="assets/mark.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/work.css">
<link rel="stylesheet" href="assets/editor.css">
</head>
<body class="work ed" data-tool="{t['id']}">
{SPRITE}

<header class="nav solid" data-solid="1">
  <div class="wrap">
    <a class="brand" href="./" aria-label="Dilia Studio home"><svg><use href="#mark"/></svg><span class="wm"><span class="w">Dilia</span><span class="l">Studio</span></span></a>
    <nav class="links" aria-label="Main">
      <a href="tools.html">Tools</a>
      <a class="opt" href="./#privacy">Privacy</a>
    </nav>
  </div>
</header>

<main class="ws-page">
  <div class="ws-head wrap">
    <div>
      <p class="crumb"><a href="tools.html">Tools</a><span>/</span>{t['name']}</p>
      <h1>{t['name']}</h1>
      <p class="lead">{t['lead']}</p>
    </div>
  </div>

  <div class="ws wrap" id="ws" data-state="empty">
    <section class="board" id="board" aria-label="{t['name']}">
      <label class="dropzone" for="pick" id="dropzone">
        <span class="dz-art" aria-hidden="true">
          <span class="dz-page p1"></span><span class="dz-page p2"></span><span class="dz-page p3">{UP}</span>
        </span>
        <b>Drop a PDF here</b>
        <span>or <u>choose a file</u> from your device</span>
        <small>The file is read by your browser and never uploaded.</small>
      </label>
      <input id="pick" class="vh" type="file" accept="application/pdf,.pdf">
      <input id="imgPick" class="vh" type="file" accept="image/*">

      <div class="ebar" id="ebar">
        <div class="etools" role="toolbar" aria-label="Tools">{tools}</div>
        <div class="eside">
          <button type="button" class="ebtn" id="undo" title="Undo (Ctrl+Z)" aria-label="Undo">{ic('undo')}</button>
          <button type="button" class="ebtn" id="redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">{ic('redo')}</button>
          <span class="zoom"><button type="button" class="ebtn" id="zout" aria-label="Zoom out">&minus;</button><b id="zv">100%</b><button type="button" class="ebtn" id="zin" aria-label="Zoom in">+</button></span>
          <label class="btn ghost sm" for="pick">Change PDF</label>
        </div>
      </div>
      {find}
      <div class="props" id="props"></div>
      <div class="pages" id="pages"></div>
    </section>

    <aside class="side" aria-label="Save">
      <div class="side-in">
        <h2>Your new PDF</h2>
        <dl class="sum">
          <div><dt>Pages</dt><dd id="s1">0</dd></div>
          <div><dt>Changes</dt><dd id="s2">0</dd></div>
          <div><dt>Fields</dt><dd id="s3">0</dd></div>
        </dl>
        <label class="field" for="outName">File name
          <span class="name"><input id="outName" type="text" value="" spellcheck="false" autocomplete="off"><em>.pdf</em></span>
        </label>
        <button class="btn go" type="button" id="go" disabled>
          <span class="go-l">{t.get('go','Save and download')}</span>
          <span class="go-p" aria-hidden="true"><i id="prog"></i></span>
        </button>
        <p class="note" id="note">Add a PDF to start.</p>
        <div class="done" id="done" hidden>
          {CHECK}
          <div><b id="doneName"></b><span id="doneInfo"></span>
            <p><a href="#" id="again">Download again</a><button type="button" id="reset">Start over</button></p></div>
        </div>
        <p class="keys">Delete removes the selected item. Arrow keys nudge it. Ctrl+Z undoes.</p>
        <p class="safe">{SHIELD}Processed in this tab. Nothing is uploaded.</p>
      </div>
    </aside>
  </div>
</main>

<dialog class="sdlg" id="signDlg" aria-label="Add signature">
  <div class="sdlg-in">
    <h2>Your signature</h2>
    <div class="seg" role="tablist"><button type="button" role="tab" data-sm="draw">Draw</button><button type="button" role="tab" data-sm="type">Type</button><button type="button" role="tab" data-sm="upload">Upload</button></div>
    <div data-pane="draw"><canvas id="signPad" class="spad"></canvas><div class="srow"><span>Sign with your mouse, pen or finger.</span><button type="button" class="linkbtn" id="sigClear">Clear</button></div></div>
    <div data-pane="type" hidden><input id="sigName" class="sname" type="text" maxlength="40" placeholder="Type your name" autocomplete="name" spellcheck="false"></div>
    <div data-pane="upload" hidden><label class="sup"><input id="sigFile" type="file" accept="image/png,image/jpeg,image/webp" class="vh"><span class="btn ghost sm">Choose image</span><em id="sigFileName">No image chosen</em></label><p class="hint">A PNG with a transparent background looks best.</p></div>
    <div class="srow inks"><span>Ink</span><button type="button" class="ink on" data-ink="#0b1220" style="--k:#0b1220" aria-label="Black"></button><button type="button" class="ink" data-ink="#1f3fbf" style="--k:#1f3fbf" aria-label="Blue"></button></div>
    <div class="sreuse" id="sigReuse" hidden><img id="sigPrev" alt=""><button type="button" class="linkbtn" id="sigUseLast">Use this signature again</button></div>
    <div class="sact"><button type="button" class="btn ghost" id="sigCancel">Cancel</button><button type="button" class="btn" id="sigAdd" disabled>Place signature</button></div>
  </div>
</dialog>

<div class="toasts" id="toasts" aria-live="polite"></div>
<div class="dropveil" id="veil" aria-hidden="true"><div><svg><use href="#mark"/></svg><p>Drop to add</p></div></div>

<script src="assets/vendor/pdf-lib.min.js"></script>
<script src="assets/vendor/pdf.min.js"></script>
<script src="assets/common.js"></script>
<script src="assets/kit.js"></script>
<script src="assets/editor.js"></script>
</body>
</html>
'''
for t in EDITORS:
    (ROOT / f"{t['id']}.html").write_text(editor_page(t))
    print('wrote', t['id'] + '.html (editor)')
