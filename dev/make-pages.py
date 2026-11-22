#!/usr/bin/env python3
"""Regenerates the tool pages (split, delete, extract, rotate, reorder, pdf2img, img2pdf) from one template.
Edit the TOOLS table below, run `python3 dev/make-pages.py` from the repo root, commit the html files.
merge.html is hand-written and not touched."""
import pathlib
import re, json
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

OPT_WM = ('<div class="optfield"><span class="lbl">Watermark type</span><div class="chips"><label class="chip"><input type="radio" name="wk" value="text" checked><span>Text</span></label><label class="chip"><input type="radio" name="wk" value="image"><span>Image</span></label></div></div>'
  + '<div class="optfield"><span class="lbl">Image (PNG or JPG)</span><label class="btn ghost sm" for="wmImgFile">Choose image</label><input id="wmImgFile" type="file" accept="image/png,image/jpeg" hidden><em id="wmImgName" class="hintline"></em></div>'
  + numf('wmIW', 'Image width', 40, 5, 100, 1, '%')
  + '<div class="optfield grow"><label class="lbl" for="wmText">Watermark text</label><span class="name"><input id="wmText" type="text" value="CONFIDENTIAL" maxlength="60" spellcheck="false" autocomplete="off"></span></div>'
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
OPT_BATES = ('<div class="optfield"><label class="lbl" for="nPos">Position</label><select class="dd" id="nPos"><option value="bottom-right">Bottom right</option><option value="bottom-center">Bottom centre</option><option value="bottom-left">Bottom left</option><option value="top-right">Top right</option><option value="top-center">Top centre</option><option value="top-left">Top left</option></select></div>'
  + '<div class="optfield"><label class="lbl" for="bPre">Prefix</label><span class="name"><input id="bPre" type="text" value="ABC-" maxlength="20" spellcheck="false" autocomplete="off"></span></div>'
  + '<div class="optfield"><label class="lbl" for="bSuf">Suffix</label><span class="name"><input id="bSuf" type="text" value="" maxlength="20" spellcheck="false" autocomplete="off"></span></div>'
  + numf('nStart', 'Start at', 1, 0, 99999999) + numf('bDig', 'Digits', 6, 1, 12) + numf('nSize', 'Size', 10, 6, 48, 1, 'pt')
  + '<p class="err" id="err" hidden></p>')
def hz(i, l, d=''): return f'<div class="optfield grow"><label class="lbl" for="{i}">{l}</label><span class="name"><input id="{i}" type="text" value="{d}" maxlength="80" spellcheck="false" autocomplete="off"></span></div>'
OPT_HF = (hz('hL','Header left') + hz('hC','Header centre') + hz('hR','Header right') + hz('fL','Footer left') + hz('fC','Footer centre', 'Page {page} of {pages}') + hz('fR','Footer right')
  + numf('hSize', 'Size', 10, 6, 48, 1, 'pt')
  + '<p class="tip wide">Use {page}, {pages}, {date} and {file} to insert values.</p><p class="err" id="err" hidden></p>')
def rad(name, items): return '<div class="chips">' + ''.join(f'<label class="chip"><input type="radio" name="{name}" value="{v}"{" checked" if i == 0 else ""}><span>{l}</span></label>' for i, (v, l) in enumerate(items)) + '</div>'
def dd(i, label, opts, sel=None): return f'<div class="optfield"><label class="lbl" for="{i}">{label}</label><select class="dd" id="{i}">' + ''.join(f'<option value="{v}"{" selected" if v == sel else ""}>{l}</option>' for v, l in opts) + '</select></div>'
OPT_FLIP = ('<div class="optfield"><span class="lbl">Mirror</span>' + rad('fd', [('h', 'Left to right'), ('v', 'Top to bottom'), ('both', 'Both ways')]) + '</div>'
  + dd('fPages', 'Pages', [('all', 'All pages'), ('odd', 'Odd pages only'), ('even', 'Even pages only')]) + '<p class="err" id="err" hidden></p>')
OPT_NUP = (dd('uN', 'Pages per sheet', [(2, '2'), (4, '4'), (6, '6'), (8, '8'), (9, '9'), (16, '16')], 4)
  + dd('uSize', 'Sheet size', [('a4', 'A4'), ('letter', 'US Letter'), ('a3', 'A3')])
  + dd('uOri', 'Sheet direction', [('auto', 'Automatic'), ('portrait', 'Upright'), ('landscape', 'Sideways')])
  + dd('uOrder', 'Order', [('across', 'Across, then down'), ('down', 'Down, then across')])
  + numf('uMar', 'Margin', 18, 0, 100, 1, 'pt') + numf('uGap', 'Gap', 8, 0, 100, 1, 'pt')
  + '<div class="optfield">' + chk('uBorder', 'Thin line around each page', True) + '</div><p class="err" id="err" hidden></p>')
OPT_META = (hz('mT', 'Title') + hz('mA', 'Author') + hz('mS', 'Subject') + hz('mK', 'Keywords') + hz('mC', 'Created with') + hz('mP', 'PDF producer')
  + '<div class="optfield wide">' + chk('mClear', 'Remove all properties instead') + '</div><p class="tip wide">Hidden XMP data is removed so the properties you set are the only ones shown.</p><p class="err" id="err" hidden></p>')
OPT_FLAT = ('<div class="optfield"><span class="lbl">Flatten</span>' + rad('fl', [('forms', 'Form fields only'), ('all', 'Everything')]) + '</div>'
  + dd('flDpi', 'Quality for Everything', [(150, 'Standard (150 dpi)'), (200, 'High (200 dpi)'), (300, 'Print (300 dpi)')], 200)
  + '<p class="tip wide">Form fields only keeps text and links. Everything turns each page into a picture, which also fixes notes, stamps and highlights.</p><p class="err" id="err" hidden></p>')
OPT_EXIMG = (numf('eMin', 'Skip pictures smaller than', 50, 0, 5000, 1, 'px') + '<p class="err" id="err" hidden></p>')
OPT_BM = ('<div class="optfield wide"><label class="lbl" for="bmText">One bookmark per line: Title | page. Start a line with a dash for a sub-bookmark.</label>'
  '<textarea id="bmText" rows="7" spellcheck="false" placeholder="Introduction | 1&#10;Chapter 1 | 3&#10;-Background | 4&#10;Chapter 2 | 9"></textarea></div>'
  '<div class="optfield wide"><button class="btn ghost sm" type="button" id="bmAuto">Use the first line of every page</button> <button class="btn ghost sm" type="button" id="bmCur">Load existing bookmarks</button></div>'
  '<p class="err" id="err" hidden></p>')
OPT_MIX = (numf('mN', 'Pages taken at a time', 1, 1, 50) + '<div class="optfield">' + chk('mRev', 'Reverse every file after the first') + '</div>'
  + '<p class="tip wide">Page 1 of each file in turn, then page 2, and so on. Reverse is for double-sided scans: scan the fronts, then the backs, and the pages interleave in the right order.</p><p class="err" id="err" hidden></p>')
OPT_INS = ('<div class="optfield wide"><span class="lbl">What to do</span><div class="chips"><label class="chip"><input type="radio" name="ia" value="insert" checked><span>Insert pages</span></label><label class="chip"><input type="radio" name="ia" value="replace"><span>Replace pages</span></label></div></div>'
  + numf('iAt', 'Insert after page', 1, 0, 9999) + '<div class="optfield grow"><label class="lbl" for="iRep">Pages of the main PDF to replace</label><span class="name"><input id="iRep" type="text" placeholder="3-5" spellcheck="false" autocomplete="off"></span></div>'
  + '<div class="optfield grow"><label class="lbl" for="iSrc">Pages to take from the second file (empty for all)</label><span class="name"><input id="iSrc" type="text" placeholder="all pages" spellcheck="false" autocomplete="off"></span></div>'
  + '<p class="err" id="err" hidden></p>')
PAPERS = [('a4', 'A4'), ('letter', 'US Letter'), ('a3', 'A3'), ('a5', 'A5'), ('legal', 'US Legal')]
OPT_RESIZE = (dd('rSize', 'New page size', PAPERS) + '<p class="tip wide">Each page is scaled to fit and centred. Landscape pages stay landscape.</p><p class="err" id="err" hidden></p>')
OPT_NOANN = ('<div class="optfield wide"><span class="lbl">Keep</span><div class="checks">' + chk('nLinks', 'Clickable links', True) + chk('nForms', 'Form fields', True) + '</div></div><p class="err" id="err" hidden></p>')
OPT_BOOK = (dd('bSize', 'Paper', PAPERS[:3]) + dd('bDir', 'Reading direction', [('ltr', 'Left to right'), ('rtl', 'Right to left')])
  + '<p class="tip wide">Print double-sided (flip on the short edge), fold the stack in half and staple the fold.</p><p class="err" id="err" hidden></p>')
OPT_POSTER = (numf('pC', 'Sheets across', 2, 1, 8) + numf('pR', 'Sheets down', 2, 1, 8) + dd('pSize', 'Sheet size', PAPERS[:3]) + numf('pOv', 'Overlap', 10, 0, 40, 1, 'mm')
  + '<p class="err" id="err" hidden></p>')
OPT_OVER = (dd('oPos', 'Letterhead goes', [('under', 'Behind the text'), ('over', 'On top')]) + dd('oPages', 'Letterhead pages', [('first', 'Page 1 of the letterhead on every page'), ('each', 'Page by page (last one repeats)')])
  + '<p class="tip wide">The first file is your document, the second is the letterhead or stamp. Links on the document are not kept.</p><p class="err" id="err" hidden></p>')
OPT_REN = (dd('rSrc', 'Take the name from', [('first', 'First line of the page'), ('label', 'Text after a label'), ('regex', 'A pattern (advanced)')]) + numf('rPage', 'Page', 1, 1, 999)
  + '<div class="optfield grow"><label class="lbl" for="rLabel">Label or pattern</label><span class="name"><input id="rLabel" type="text" placeholder="Invoice No" spellcheck="false" autocomplete="off"></span></div>'
  + '<div class="optfield">' + chk('rKeep', 'Add the old name after it') + '</div><input type="hidden" id="rKeepV" value="0">'
  + '<p class="tip wide">Files whose page has no matching text keep their name. Scanned pages have no text: run OCR first.</p><p class="err" id="err" hidden></p>')
OPT_BATCH = ('<div class="optfield wide"><span class="lbl">Do these to every file, in this order</span><div class="checks">' + chk('bNoannot', 'Remove annotations') + chk('bFlatten', 'Flatten forms') + chk('bRotate', 'Rotate all pages') + chk('bWatermark', 'Text watermark')
  + chk('bNumber', 'Page numbers') + chk('bBates', 'Bates numbers across all files') + chk('bMeta', 'Remove properties') + '</div></div>'
  + '<span data-op="bRotate">' + dd('bAng', 'Turn by', [(90, '90 degrees right'), (180, '180 degrees'), (270, '90 degrees left')]) + '</span>'
  + '<span data-op="bBates"><div class="optfield"><label class="lbl" for="bPre">Prefix</label><span class="name"><input id="bPre" type="text" value="ABC-" maxlength="20" spellcheck="false" autocomplete="off"></span></div>'
  + '<div class="optfield"><label class="lbl" for="bSuf">Suffix</label><span class="name"><input id="bSuf" type="text" value="" maxlength="20" spellcheck="false" autocomplete="off"></span></div>' + numf('bStart', 'Start at', 1, 0, 99999999) + numf('bDig', 'Digits', 6, 1, 12) + '</span>'
  + '<span data-op="bWatermark"><div class="optfield grow"><label class="lbl" for="bText">Watermark text</label><span class="name"><input id="bText" type="text" value="CONFIDENTIAL" maxlength="40" spellcheck="false" autocomplete="off"></span></div></span>'
  + '<div class="optfield wide"><button class="btn ghost sm" type="button" id="wfSave">Save these settings</button> <label class="btn ghost sm" for="wfLoad">Load saved settings</label><input id="wfLoad" class="vh" type="file" accept=".json,application/json"></div>'
  + '<p class="tip wide">Files keep their original names. Several actions run one after the other on each file. Bates numbers keep counting from one file to the next.</p><p class="err" id="err" hidden></p>')
OPT_CLEAN = ('<div class="optfield wide"><span class="lbl">Remove</span><div class="checks">' + chk('cJs', 'JavaScript and auto-run actions', True) + chk('cAtt', 'Attached files', True) + chk('cMeta', 'Properties and hidden data', True) + chk('cThumb', 'Page thumbnails', True) + chk('cMarks', 'Bookmarks') + '</div></div><p class="err" id="err" hidden></p>')
OPT_GRAY = (dd('rDpi', 'Quality', [(150, 'Standard (150 dpi)'), (200, 'High (200 dpi)'), (300, 'Print (300 dpi)')], 150) + '<p class="err" id="err" hidden></p>')
OPT_DESKEW = (dd('rDpi', 'Quality of straightened pages', [(150, 'Standard (150 dpi)'), (200, 'High (200 dpi)'), (300, 'Print (300 dpi)')], 200) + '<p class="err" id="err" hidden></p>')
OPT_CMP = '<p class="tip wide">The report lists changed words page by page and marks every difference on a copy of each page. Pages are matched by number. Scans have no text, so only the marks are compared.</p><p class="err" id="err" hidden></p>'
OPT_FORM = ('<div class="optfield wide"><span class="lbl">Field to add when you click a page</span>' + rad('ft', [('text', 'Text'), ('multi', 'Notes box'), ('check', 'Tick box'), ('drop', 'Choice list'), ('radio', 'Radio button')]) + '</div>'
  + '<div class="optfield wide"><div id="ffList" class="ffl"></div><button class="btn ghost sm" type="button" id="ffClear">Remove all fields</button></div>'
  + '<p class="tip wide">Radio buttons with the same name form one group, so give each group one name. Names must not repeat for other field types.</p><p class="err" id="err" hidden></p>')
OPT_CROP = ('<div class="optfield wide"><span class="lbl">Cut from each side, as a percent of the page</span><div class="four">'
  + numf('cT','Top',0,0,45,1,'%') + numf('cR','Right',0,0,45,1,'%') + numf('cB','Bottom',0,0,45,1,'%') + numf('cL','Left',0,0,45,1,'%') + '</div></div><p class="err" id="err" hidden></p>')
OPT_TEXT = chk('tSep', 'Mark where each page starts') + rng('Pages', '1-3, 7, 10-')

OPT_TABLE = ('<div class="optfield"><span class="lbl">Save as</span><div class="chips"><label class="chip"><input type="radio" name="tf" id="tfXlsx" value="xlsx" checked><span>Excel (.xlsx)</span></label><label class="chip"><input type="radio" name="tf" id="tfCsv" value="csv"><span>CSV</span></label></div></div>') + rng('Pages', '1-3, 7, 10-')

OPT_HTML = dd('pgSize', 'Page size', [('a4', 'A4'), ('letter', 'US Letter')])

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
  <label class="radio"><input type="radio" name="sm" value="oddeven"><b>Odd and even pages</b><small>Two files: pages 1, 3, 5... and 2, 4, 6...</small></label>
  <label class="radio" data-for="size"><input type="radio" name="sm" value="size"><b>By file size</b><small>Each file stays under this size.</small><span class="name"><input id="szIn" type="number" min="0.1" step="0.1" value="5" aria-label="Maximum size in MB"></span></label>
  <label class="radio" data-for="bookmarks"><input type="radio" name="sm" value="bookmarks"><b>By bookmarks</b><small>A new file at each top-level bookmark.</small></label>
  <label class="radio" data-for="text"><input type="radio" name="sm" value="text"><b>By text</b><small>A new file at every page that contains this text.</small><span class="name"><input id="tIn" type="text" placeholder="e.g. Invoice No." spellcheck="false" autocomplete="off" aria-label="Text that starts a new file"></span></label>
  <label class="radio" data-for="half"><input type="radio" name="sm" value="half"><b>Cut each page in half</b><small>For two-page scans. One PDF with twice the pages.</small><span class="name"><select id="hdir" aria-label="Direction"><option value="auto">Automatic</option><option value="lr">Left and right</option><option value="tb">Top and bottom</option></select></span></label>
</div><p class="err" id="err" hidden></p>'''

OPT_IMG = '''<div class="optfield"><span class="lbl">Page size</span>
  <div class="chips" role="radiogroup" aria-label="Page size">
  <label class="chip"><input type="radio" name="ps" value="fit" checked><span>Same as image</span></label>
  <label class="chip"><input type="radio" name="ps" value="a4"><span>A4</span></label>
  <label class="chip"><input type="radio" name="ps" value="letter"><span>US Letter</span></label></div></div>
<div class="optfield"><label class="lbl" for="orient">Orientation</label><select class="dd" id="orient"><option value="auto">Match each image</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div>
<div class="optfield"><label class="lbl" for="margin">Margin</label><select class="dd" id="margin"><option value="0">None</option><option value="18">Small</option><option value="36">Large</option></select></div>'''

OPT_SCAN = OPT_IMG + '<div class="optfield"><label class="lbl" for="look">Scan look</label><select class="dd" id="look"><option value="doc">Clean document (grey, evened out)</option><option value="bw">Black and white text</option><option value="none">Keep the photo as is</option></select></div>'
OPT_IMGOUT = '''<div class="optfield"><span class="lbl">Format</span>
  <div class="chips" role="radiogroup" aria-label="Image format">
  <label class="chip"><input type="radio" name="fmt" value="png" checked><span>PNG</span></label>
  <label class="chip"><input type="radio" name="fmt" value="jpg"><span>JPG</span></label>
  <label class="chip"><input type="radio" name="fmt" value="tiff"><span>TIFF</span></label></div></div>
<div class="optfield"><label class="lbl" for="dpi">Quality</label><select class="dd" id="dpi"><option value="100">Light, 100 DPI</option><option value="150" selected>Standard, 150 DPI</option><option value="200">High, 200 DPI</option><option value="300">Print, 300 DPI</option></select></div>
''' + rng('Pages', '1-3, 7, 10-')

DUMMY = dict(id='html2pdf', name='x', crumb='x', kind='file', engine='viewer', lead='', drop='', acts=[], opt='', ext='pdf', defname='', field='', go='')
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
 dict(id='bates', name='Bates numbering', crumb='Bates numbering', kind='pdf', engine='ptool',
      lead='Stamp a running reference number such as ABC-000001 on every page, for legal and records work.',
      drop='Drop a PDF here', acts=[], opt=OPT_BATES, ext='pdf', defname='Dilia-bates', field='File name', go='Add Bates numbers and download'),
 dict(id='headfoot', name='Header and footer', crumb='Header and footer', kind='pdf', engine='ptool',
      lead='Add text to the top and bottom of every page. Page number, page count, date and file name can be inserted.',
      drop='Drop a PDF here', acts=[], opt=OPT_HF, ext='pdf', defname='Dilia-header-footer', field='File name', go='Add header and footer and download'),
 dict(id='flip', name='Flip pages', crumb='Flip pages', kind='pdf', engine='ptool',
      lead='Mirror pages left to right or top to bottom. Useful for scans that came in backwards.',
      drop='Drop a PDF here', acts=[], opt=OPT_FLIP, ext='pdf', defname='Dilia-flipped', field='File name', go='Flip and download'),
 dict(id='nup', name='Several pages per sheet', crumb='N-up', kind='pdf', engine='ptool',
      lead='Print 2, 4, 6, 8, 9 or 16 pages on each sheet to save paper.',
      drop='Drop a PDF here', acts=[], opt=OPT_NUP, ext='pdf', defname='Dilia-n-up', field='File name', go='Make sheets and download'),
 dict(id='meta', name='Edit PDF properties', crumb='Properties', kind='pdf', engine='ptool',
      lead='Change the title, author, subject and keywords stored inside a PDF, or remove them.',
      drop='Drop a PDF here', acts=[], opt=OPT_META, ext='pdf', defname='Dilia-properties', field='File name', go='Save properties and download'),
 dict(id='flatten', name='Flatten PDF', crumb='Flatten', kind='pdf', engine='ptool',
      lead='Make filled-in forms and added marks permanent so nobody can change them.',
      drop='Drop a PDF here', acts=[], opt=OPT_FLAT, ext='pdf', defname='Dilia-flattened', field='File name', go='Flatten and download'),
 dict(id='extractimg', name='Extract images from PDF', crumb='Extract images', kind='pdf', engine='ptool',
      lead='Save the pictures stored inside a PDF at their original quality.',
      drop='Drop a PDF here', acts=[], opt=OPT_EXIMG, ext='zip', defname='Dilia-embedded-images', field='File name', go='Extract images'),
 dict(id='bookmarks', name='Add bookmarks to PDF', crumb='Bookmarks', kind='pdf', engine='ptool',
      lead='Add a clickable outline to a PDF so readers can jump to chapters.',
      drop='Drop a PDF here', acts=[], opt=OPT_BM, ext='pdf', defname='Dilia-bookmarked', field='File name', go='Add bookmarks and download'),
 dict(id='mix', name='Alternate and mix PDFs', crumb='Alternate and mix', kind='multi', engine='mixer', tip='Add two or more PDFs. Drag to set the order.', sort='sortAz', sortl='Sort A to Z',
      lead='Interleave pages from two or more PDFs: page 1 of each file, then page 2 of each. Also joins front and back scans of a double-sided document.',
      drop='Drop PDF files here', acts=[], opt=OPT_MIX, ext='pdf', defname='Dilia-mixed', field='File name', s1='Files', l2='Pages out', l3='Size in', go='Mix and download'),
 dict(id='insert', name='Insert or replace pages', crumb='Insert or replace', kind='multi', engine='mixer', tip='The first file is the main PDF. The second gives the pages.', sort='swap', sortl='Swap order',
      lead='Put pages from one PDF into another at the spot you choose, or swap some pages of a PDF for pages from a second file.',
      drop='Drop two PDF files here', acts=[], opt=OPT_INS, ext='pdf', defname='Dilia-inserted', field='File name', s1='Files', l2='Pages out', l3='Size in', go='Save new PDF'),
 dict(id='resize', name='Resize PDF pages', crumb='Resize pages', kind='pdf', engine='ptool',
      lead='Change every page to A4, Letter, A3, A5 or Legal. Content is scaled to fit.',
      drop='Drop a PDF here', acts=[], opt=OPT_RESIZE, ext='pdf', defname='Dilia-resized', field='File name', go='Resize and download'),
 dict(id='noannot', name='Remove annotations', crumb='Remove annotations', kind='pdf', engine='ptool',
      lead='Delete comments, highlights, stamps and drawn notes from a PDF.',
      drop='Drop a PDF here', acts=[], opt=OPT_NOANN, ext='pdf', defname='Dilia-clean', field='File name', go='Remove and download'),
 dict(id='booklet', name='Make a booklet', crumb='Booklet', kind='pdf', engine='ptool',
      lead='Reorder pages so that, printed double-sided and folded, they read as a booklet.',
      drop='Drop a PDF here', acts=[], opt=OPT_BOOK, ext='pdf', defname='Dilia-booklet', field='File name', go='Make booklet and download'),
 dict(id='poster', name='Print a poster', crumb='Poster', kind='pdf', engine='ptool',
      lead='Enlarge a page across several sheets of paper. Print them and glue the sheets together.',
      drop='Drop a PDF here', acts=[], opt=OPT_POSTER, ext='pdf', defname='Dilia-poster', field='File name', go='Make poster and download'),
 dict(id='overlay', name='Add a letterhead or overlay', crumb='Letterhead', kind='multi', engine='mixer', tip='First file: your document. Second file: the letterhead.', sort='swap', sortl='Swap order',
      lead='Put a letterhead, stamp or background PDF behind or on top of every page of a document.',
      drop='Drop two PDF files here', acts=[], opt=OPT_OVER, ext='pdf', defname='Dilia-letterhead', field='File name', s1='Files', l2='Pages out', l3='Size in', go='Apply and download'),
 dict(id='rename', name='Rename PDFs by their text', crumb='Rename by text', kind='multi', engine='mixer', tip='Add many PDFs. New names appear on each card.', sort='sortAz', sortl='Sort A to Z',
      lead='Name each PDF after text found on its pages, such as an invoice number. All files come back in one ZIP.',
      drop='Drop PDF files here', acts=[], opt=OPT_REN, ext='zip', defname='Dilia-renamed', field='ZIP name', s1='Files', l2='Files out', l3='Size in', go='Rename and download ZIP'),
 dict(id='batch', name='Batch and workflows', crumb='Batch', kind='multi', engine='mixer', tip='Add many PDFs. One action is applied to all of them.', sort='sortAz', sortl='Sort A to Z',
      lead='Chain several actions and run them on many PDFs at once: remove marks, flatten, rotate, watermark, number and more. Save your recipe to reuse it.',
      drop='Drop PDF files here', acts=[], opt=OPT_BATCH, ext='zip', defname='Dilia-batch', field='ZIP name', s1='Files', l2='Files out', l3='Size in', go='Process and download'),
 dict(id='scan', name='Scan documents to PDF', crumb='Scan to PDF', kind='img', engine='img2pdf', camera=1,
      lead='Photograph pages with your phone camera, or pick photos, and turn them into one clean PDF.',
      drop='Drop photos of your pages here', acts=[], opt=OPT_SCAN, ext='pdf', defname='Dilia-scan', field='File name',
      s1='Pages', l2='Pages', l3='Size in', go='Create PDF', extra=['assets/vendor/pako_inflate.min.js', 'assets/vendor/UTIF.js']),
 dict(id='cleaner', name='PDF cleaner', crumb='Cleaner', kind='pdf', engine='ptool',
      lead='Strip scripts, attachments, hidden data and thumbnails from a PDF before you share it.',
      drop='Drop a PDF here', acts=[], opt=OPT_CLEAN, ext='pdf', defname='Dilia-cleaned', field='File name', go='Clean and download'),
 dict(id='grayscale', name='PDF to grayscale', crumb='Grayscale', kind='pdf', engine='ptool',
      lead='Turn a colour PDF into black, white and grey to save ink.',
      drop='Drop a PDF here', acts=[], opt=OPT_GRAY, ext='pdf', defname='Dilia-grayscale', field='File name', go='Make grayscale and download'),
 dict(id='deskew', name='Straighten scanned pages', crumb='Straighten', kind='pdf', engine='ptool',
      lead='Fix scans that were fed in crooked. Each page is measured and turned the right way up.',
      drop='Drop a scanned PDF here', acts=[], opt=OPT_DESKEW, ext='pdf', defname='Dilia-straight', field='File name', go='Straighten and download'),
 dict(id='repair', name='Repair PDF', crumb='Repair', kind='file', engine='filetool', qpdf=1,
      lead='Try to rebuild a PDF that will not open or shows errors. Best effort: badly damaged files may lose pages.',
      drop='Drop a damaged PDF here', acts=[], opt='', ext='pdf', defname='Dilia-repaired', field='File name',
      s1='Size in', l2='Status', l3='Size out', go='Repair and download'),
 dict(id='linearize', name='Optimise PDF for the web', crumb='Fast web view', kind='file', engine='filetool', qpdf=1,
      lead='Rewrite a PDF so the first page appears quickly when it is opened from a website.',
      drop='Drop a PDF here', acts=[], opt='', ext='pdf', defname='Dilia-web', field='File name',
      s1='Size in', l2='Mode', l3='Size out', go='Optimise and download'),
 dict(id='compare', name='Compare two PDFs', crumb='Compare', kind='multi', engine='mixer', tip='First file: original. Second file: changed version.', sort='swap', sortl='Swap order',
      lead='See what changed between two versions of a PDF: changed words and a marked-up copy of every page.',
      drop='Drop two PDF files here', acts=[], opt=OPT_CMP, ext='pdf', defname='Dilia-compared', field='File name', s1='Files', l2='Pages out', l3='Size in', go='Compare and download'),
 dict(id='makeform', name='Create a fillable form', crumb='Create form', kind='pdf', engine='ptool',
      lead='Turn a PDF into a form people can fill in: click where each field should go.',
      drop='Drop a PDF here', acts=[], opt=OPT_FORM, ext='pdf', defname='Dilia-form', field='File name', go='Create form and download'),
 dict(id='crop', name='Crop PDF', crumb='Crop', kind='pdf', engine='ptool',
      lead='Trim the edges of every page. The area you keep is shown on each page. Cut-off content is hidden, not erased.',
      drop='Drop a PDF here', acts=[], opt=OPT_CROP, ext='pdf', defname='Dilia-cropped', field='File name', go='Crop and download'),
 dict(id='text', name='PDF to text', crumb='PDF to text', kind='pdf', engine='ptool',
      lead='Copy out all the text as a plain .txt file. Scanned pages have no text to copy until OCR arrives.',
      drop='Drop a PDF here', acts=[btn('all', 'All'), btn('odd', 'Odd'), btn('even', 'Even'), btn('none', 'None')],
      opt=OPT_TEXT, ext='txt', defname='Dilia-text', field='File name', s1='Pages in', l2='Selected', l3='Pages out', go='Save as text'),

 dict(id='table', name='PDF to Excel', crumb='PDF to Excel', kind='pdf', engine='ptool',
      lead='Pull tables out of a PDF into an Excel or CSV file. This is best effort: it rebuilds columns from where the text sits, so check the result.',
      drop='Drop a PDF here', acts=[btn('all', 'All'), btn('odd', 'Odd'), btn('even', 'Even'), btn('none', 'None')],
      opt=OPT_TABLE, ext='xlsx', defname='Dilia-tables', field='File name', s1='Pages in', l2='Selected', l3='Format', go='Save tables'),

 dict(id='html2pdf', name='HTML to PDF', crumb='HTML to PDF', kind='file', engine='html2pdf', accept='text/html,.html,.htm,.xhtml',
      lead='Turn a saved web page into a PDF. Low fidelity: you get the text, headings, lists and tables, but not the pictures, colours or page design.',
      drop='Drop an HTML file here', acts=[], opt=OPT_HTML, ext='pdf', defname='Dilia-html', field='File name', s1='File size', l2='Page size', l3='-', go='Create PDF'),

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
      s1='Images', l2='Pages', l3='Size in', go='Create PDF', extra=['assets/vendor/pako_inflate.min.js', 'assets/vendor/UTIF.js']),
]


# ---------------- Dilia Image (image tools) ----------------
def qsl(i='q', label='Quality', v=75, mn=5):
    return f'<div class="optfield"><label class="lbl" for="{i}">{label}</label><span class="name qs"><input id="{i}" type="range" min="{mn}" max="100" value="{v}" aria-label="{label}"><output for="{i}" id="{i}o">{v}</output></span></div>'
def hid(i, v): return f'<input id="{i}" type="hidden" value="{v}">'
FMT_ALL = [('same', 'Same as the original'), ('jpg', 'JPG'), ('png', 'PNG'), ('webp', 'WebP'), ('avif', 'AVIF (smallest, slower)')]
FMT_CONV = [('jpg', 'JPG'), ('png', 'PNG'), ('webp', 'WebP'), ('avif', 'AVIF'), ('gif', 'GIF'), ('bmp', 'BMP'), ('tiff', 'TIFF'), ('ico', 'ICO (icon)')]
OUTF = dd('outFmt', 'Save as', FMT_ALL)
PX_COMPRESS = dd('outFmt', 'Save as', [('same', 'Same as the original'), ('auto', 'Smallest of JPG, WebP, PNG')] + FMT_ALL[1:]) + qsl() + numf('tgt', 'Or aim under', 0, 0, 100000, 10, 'KB') + dd('cScale', 'Size', [(100, 'Keep pixels'), (75, '75%'), (50, '50%'), (25, '25%')]) + '<p class="tip wide">Set "aim under" to 0 to use the quality slider. Photos stay sharp at 70 to 80. PNG and GIF use fewer colours when quality is lowered.</p>'
PX_RESIZE = (dd('rzMode', 'Resize by', [('px', 'Pixels'), ('pct', 'Percent')]) + '<span data-op="px">' + numf('rzW', 'Width', '', 1, 30000, 1, 'px') + numf('rzH', 'Height', '', 1, 30000, 1, 'px') + '</span><span data-op="pct" hidden>' + numf('rzPct', 'Scale', 50, 1, 500, 1, '%') + '</span>'
  + '<div class="optfield">' + chk('rzKeep', 'Keep proportions', True) + chk('rzNoUp', 'Never enlarge', True) + '</div>'
  + dd('rzPreset', 'Preset', [('', 'Pick a size'), ('1080x1080', 'Instagram post 1080 × 1080'), ('1080x1920', 'Story or Reel 1080 × 1920'), ('1200x630', 'Facebook or link preview 1200 × 630'), ('1280x720', 'YouTube thumbnail 1280 × 720'), ('1500x500', 'X header 1500 × 500'), ('1920x1080', 'Full HD 1920 × 1080'), ('512x512', 'App icon 512 × 512'), ('800x600', 'Web 800 × 600')]) + OUTF + hid('q', 90))
PX_CROP = (dd('cAspect', 'Shape', [('free', 'Free'), ('1:1', 'Square 1:1'), ('4:3', '4:3'), ('3:2', '3:2'), ('16:9', '16:9'), ('9:16', '9:16'), ('4:5', '4:5'), ('circle', 'Circle (PNG)')])
  + OUTF + hid('q', 92) + '<p class="tip wide">Press the pencil on an image to set its crop box. Images you leave alone are cropped from the centre to the chosen shape. "Free" without a box keeps the full image.</p>')
PX_ROTATE = (dd('rotDeg', 'Turn', [(90, 'Right 90°'), (270, 'Left 90°'), (180, 'Upside down 180°'), (0, 'Do not turn')]) + '<div class="optfield"><span class="lbl">Mirror</span>' + chk('rotFh', 'Left to right') + chk('rotFv', 'Top to bottom') + '</div>' + OUTF + hid('q', 92))
PX_CONVERT = qsl('q', 'Quality', 90) + '<p class="tip wide">Transparent areas turn white when saving as JPG. Quality applies to JPG, WebP and AVIF.</p>'
PX_WM = ('<div class="optfield"><span class="lbl">Watermark</span>' + rad('wmKind', [('text', 'Text'), ('image', 'Logo image')]) + '</div>'
  + '<span data-op="text">' + hz('wmText', 'Text', '© Your name') + '<div class="optfield"><label class="lbl" for="wmColor">Colour</label><span class="name"><input id="wmColor" type="color" value="#ffffff"></span></div></span>'
  + '<span data-op="image" hidden><div class="optfield"><label class="lbl" for="wmImg">Logo file</label><span class="name"><input id="wmImg" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></span></div></span>'
  + dd('wmPos', 'Position', [('br', 'Bottom right'), ('bl', 'Bottom left'), ('bc', 'Bottom centre'), ('tr', 'Top right'), ('tl', 'Top left'), ('tc', 'Top centre'), ('cc', 'Centre')])
  + numf('wmSize', 'Size', 20, 3, 100, 1, '%') + numf('wmOp', 'Opacity', 40, 5, 100, 1, '%') + numf('wmAng', 'Angle', 0, -90, 90, 1, '°')
  + '<div class="optfield">' + chk('wmTile', 'Repeat across the image') + '</div>' + OUTF + hid('q', 92))
PX_MEME = (hz('mTop', 'Top text', '') + hz('mBot', 'Bottom text', '') + numf('mSize', 'Text size', 9, 3, 25, 1, '%')
  + '<div class="optfield"><label class="lbl" for="mColor">Colour</label><span class="name"><input id="mColor" type="color" value="#ffffff"></span></div>' + dd('outFmt', 'Save as', [('jpg', 'JPG'), ('png', 'PNG'), ('webp', 'WebP')]) + hid('q', 92))
PX_BLUR = dd('bMode', 'Cover with', [('blur', 'Blur'), ('pixel', 'Pixels'), ('black', 'Black box')]) + OUTF + hid('q', 92) + '<p class="tip wide">Press the pencil on an image, drag over faces, plates or text to hide them. Hidden pixels are replaced in the saved file.</p>'
PX_GIF = numf('gDelay', 'Time per frame', 500, 20, 10000, 10, 'ms') + numf('gW', 'Width', 480, 16, 2000, 1, 'px') + '<div class="optfield">' + chk('gLoop', 'Repeat forever', True) + '</div>'
PX_META = '<p class="tip wide">Removes camera details, date and GPS location from JPG and PNG without re-compressing the picture. Cards show what is inside each photo first.</p>'
PX_ACCEPT = 'image/*,.jpg,.jpeg,.jfif,.png,.webp,.gif,.bmp,.avif,.svg,.tif,.tiff,.heic,.heif,.ico'
def pxdict(id, name, crumb, tool, opt, lead, ext='', defname='Dilia-images', go='Save images', out='', accept=None, drop='Drop images here', **kw):
    d = dict(id=id, name=name, crumb=crumb, kind='pix', engine='imgtool', tool=tool, out=out, lead=lead, drop=drop, acts=[], opt=opt, ext=ext, defname=defname, field='File name',
             s1='Images', l2='Result', l3='Size in', go=go, extra=['assets/vendor/Sortable.min.js'] if False else [])
    if accept: d['accept'] = accept
    d.update(kw); return d
PIX = [
 pxdict('pxcompress', 'Compress image', 'Compress image', 'compress', PX_COMPRESS, 'Make JPG, PNG, WebP, GIF and SVG files smaller. Check the result with the before and after slider.', go='Compress and download'),
 pxdict('pxjpg', 'Compress JPG', 'Compress JPG', 'compress', PX_COMPRESS, 'Shrink JPG photos for email, forms and websites.', go='Compress and download', accept='image/jpeg,.jpg,.jpeg,.jfif', drop='Drop JPG photos here'),
 pxdict('pxpng', 'Compress PNG', 'Compress PNG', 'compress', PX_COMPRESS, 'Shrink PNG files by using fewer colours. Transparency stays.', go='Compress and download', accept='image/png,.png', drop='Drop PNG files here'),
 pxdict('pxwebp', 'Compress WebP', 'Compress WebP', 'compress', PX_COMPRESS, 'Shrink WebP images for faster pages.', go='Compress and download', accept='image/webp,.webp', drop='Drop WebP files here'),
 pxdict('pxgif', 'Compress GIF', 'Compress GIF', 'compress', qsl('q', 'Quality', 70) + dd('cScale', 'Size', [(100, 'Keep pixels'), (75, '75%'), (50, '50%')]), 'Shrink animated GIFs. Frames and timing are kept.', go='Compress and download', accept='image/gif,.gif', drop='Drop GIF files here', out='gifopt'),
 pxdict('pxsvg', 'Optimise SVG', 'Optimise SVG', 'compress', '<p class="tip wide">Removes editor data, comments and wasted code. The picture does not change.</p>' + hid('q', 75), 'Clean and shrink SVG files.', go='Optimise and download', accept='image/svg+xml,.svg', drop='Drop SVG files here', out='svgopt'),
 pxdict('pxsmall', 'Smallest image format', 'Smallest format', 'compress', qsl() + dd('cScale', 'Size', [(100, 'Keep pixels'), (75, '75%'), (50, '50%')]) + '<p class="tip wide">Tries JPG, WebP and PNG for each image and keeps the smallest.</p>', 'Let the tool pick the format that makes each image smallest.', go='Find smallest and download', out='auto'),
 pxdict('pxtarget', 'Compress image to a size', 'Compress to size', 'compress', dd('outFmt', 'Save as', [('same', 'Same as the original'), ('jpg', 'JPG'), ('webp', 'WebP')]) + qsl() + numf('tgt', 'Keep each under', 200, 5, 100000, 10, 'KB') + dd('cScale', 'Size', [(100, 'Keep pixels'), (50, '50%')]), 'Get each image under a size you set, such as 200 KB for a form.', go='Compress and download'),
 pxdict('pxresize', 'Resize image', 'Resize image', 'resize', PX_RESIZE, 'Change the size in pixels or percent. Social media presets included.', go='Resize and download'),
 pxdict('pxcrop', 'Crop image', 'Crop image', 'crop', PX_CROP, 'Cut a picture to a box or shape. Set pixels by hand or drag.', go='Crop and download'),
 pxdict('pxrotate', 'Rotate and flip image', 'Rotate and flip', 'rotate', PX_ROTATE, 'Turn photos upright or mirror them.', go='Save and download'),
 pxdict('pxconvert', 'Convert image', 'Convert image', 'convert', dd('outFmt', 'Convert to', FMT_CONV) + PX_CONVERT, 'Change JPG, PNG, WebP, GIF, BMP, TIFF, AVIF, SVG or HEIC into another type.', go='Convert and download'),
 pxdict('pxheic', 'HEIC to JPG', 'HEIC to JPG', 'convert', hid('outFmt', 'jpg') + PX_CONVERT, 'Turn iPhone HEIC photos into JPG that opens everywhere.', go='Convert and download', accept='.heic,.heif,image/heic,image/heif', drop='Drop HEIC photos here', out='jpg'),
 pxdict('pxheicpng', 'HEIC to PNG', 'HEIC to PNG', 'convert', hid('q', 90), 'Turn iPhone HEIC photos into PNG.', go='Convert and download', accept='.heic,.heif,image/heic,image/heif', drop='Drop HEIC photos here', out='png'),
 pxdict('pxpng2jpg', 'PNG to JPG', 'PNG to JPG', 'convert', PX_CONVERT, 'Turn PNG files into smaller JPG photos.', go='Convert and download', accept='image/png,.png', drop='Drop PNG files here', out='jpg'),
 pxdict('pxjpg2png', 'JPG to PNG', 'JPG to PNG', 'convert', hid('q', 90), 'Turn JPG photos into PNG files.', go='Convert and download', accept='image/jpeg,.jpg,.jpeg', drop='Drop JPG photos here', out='png'),
 pxdict('pxwebp2jpg', 'WebP to JPG', 'WebP to JPG', 'convert', PX_CONVERT, 'Turn WebP images into JPG.', go='Convert and download', accept='image/webp,.webp', drop='Drop WebP files here', out='jpg'),
 pxdict('pxwebp2png', 'WebP to PNG', 'WebP to PNG', 'convert', hid('q', 90), 'Turn WebP images into PNG.', go='Convert and download', accept='image/webp,.webp', drop='Drop WebP files here', out='png'),
 pxdict('pxjpg2webp', 'JPG to WebP', 'JPG to WebP', 'convert', PX_CONVERT, 'Turn JPG photos into smaller WebP files.', go='Convert and download', accept='image/jpeg,.jpg,.jpeg', drop='Drop JPG photos here', out='webp'),
 pxdict('pxavif', 'Convert to AVIF', 'Convert to AVIF', 'convert', PX_CONVERT, 'Make AVIF files, usually the smallest. First use loads a codec of 3.5 MB.', go='Convert and download', out='avif'),
 pxdict('pxico', 'Image to ICO', 'Image to ICO', 'convert', hid('q', 90) + '<p class="tip wide">Makes an icon file with 16 to 256 px sizes inside.</p>', 'Turn a picture into a favicon or app icon.', go='Make icon', out='ico'),
 pxdict('pxbmp', 'Image to BMP', 'Image to BMP', 'convert', hid('q', 90), 'Save pictures as BMP.', go='Convert and download', out='bmp'),
 pxdict('pxtiff', 'Image to TIFF', 'Image to TIFF', 'convert', hid('q', 90), 'Save pictures as TIFF.', go='Convert and download', out='tiff'),
 pxdict('pxgifpng', 'GIF to PNG', 'GIF to PNG', 'convert', hid('q', 90), 'Save the first frame of a GIF as PNG.', go='Convert and download', accept='image/gif,.gif', drop='Drop GIF files here', out='png'),
 pxdict('pxwm', 'Watermark image', 'Watermark image', 'watermark', PX_WM, 'Stamp text or your logo on one photo or a whole batch.', go='Add watermark and download'),
 pxdict('pxmeme', 'Meme generator', 'Meme generator', 'meme', PX_MEME, 'Put top and bottom text on any picture.', go='Make meme and download'),
 pxdict('pxblur', 'Blur or pixelate part of an image', 'Blur image areas', 'blur', PX_BLUR, 'Hide faces, plates and private text in a picture.', go='Hide areas and download'),
 pxdict('pxgifmake', 'Make animated GIF', 'Make animated GIF', 'gif', PX_GIF, 'Turn several pictures into one animated GIF. Drag to set the order.', ext='gif', defname='Dilia-animation', go='Make GIF', s1='Frames', l2='Result', l3='Size in'),
 pxdict('pxmeta', 'Remove image metadata', 'Image metadata', 'meta', PX_META, 'See and remove camera model, date and GPS from photos.', go='Remove metadata and download'),
]
TOOLS += PIX

def page(t):
    pix = t['kind'] == 'pix'
    img = t['kind'] in ('img', 'pix')
    isfile = t['kind'] == 'file'
    accept = t.get('accept') or (PX_ACCEPT if pix else None) or 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/tiff,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.tif,.tiff' if img else 'application/pdf,.pdf'
    multi = ' multiple' if img or t['kind'] == 'multi' else ''
    small = ('JPG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF and HEIC. Folders and paste work too. Nothing is uploaded.' if pix else 'JPG, PNG, WebP, GIF, BMP, TIFF and AVIF. Nothing is uploaded.') if img else 'The file is read by your browser and never uploaded.'
    choose = 'choose images' if img else 'choose a file'
    if isfile:
        bar_left = '<b class="fn" id="fname"></b>'
        bar_acts = f'<label class="btn ghost sm" for="pick">Change {"file" if t.get("accept") else "PDF"}</label>'
    elif t['kind'] == 'multi':
        bar_left = f'<p class="tip">{t["tip"]}</p>'
        bar_acts = (f'<button class="btn ghost sm" type="button" id="{t["sort"]}">{t["sortl"]}</button>') + f'<label class="btn ghost sm" for="pick">{PLUS}Add PDF</label>'
    elif img:
        bar_left = '<p class="tip">Drag images to change the order.</p>' if not pix else '<p class="tip">' + {'gif': 'Drag images to set the frame order.', 'crop': 'Press the pencil to set a crop box.', 'blur': 'Press the pencil to mark areas.', 'compress': 'Press the split icon after saving to compare.'}.get(t['tool'], 'Settings are above. Results show on each image.') + '</p>'
        cam = f'<label class="btn ghost sm" for="cam">Take photo</label><input id="cam" class="vh" type="file" accept="image/*" capture="environment">' if t.get('camera') else ''
        bar_acts = cam + f'<button class="btn ghost sm" type="button" id="sortAz">Sort A to Z</button><label class="btn ghost sm" for="pick">{PLUS}Add images</label>'
    else:
        tips = {'split': 'Pages are coloured by the file they go into.', 'delete': 'Click a page to mark it for deletion.', 'extract': 'Click a page to keep it.',
                'rotate': 'Use the arrows on a page to turn it.', 'reorder': 'Drag pages to a new position.', 'pdf2img': 'Click a page to include or skip it.', 'watermark': 'Preview shows the watermark on each page.', 'number': 'Preview shows where numbers go.', 'bates': 'Preview shows where numbers go.', 'flip': 'Pages are mirrored when you save.', 'nup': 'Pages are arranged when you save.', 'meta': 'Current properties are filled in for you.', 'flatten': 'Fields and marks become permanent.', 'extractimg': 'Pictures are found when you save.', 'bookmarks': 'Bookmarks are added when you save.', 'resize': 'Pages are resized when you save.', 'noannot': 'Notes are removed when you save.', 'booklet': 'Pages are reordered when you save.', 'poster': 'Pages are enlarged when you save.', 'cleaner': 'Chosen items are removed when you save.', 'makeform': 'Pick a field type, then click a page.', 'grayscale': 'Pages are converted when you save.', 'deskew': 'Pages are measured when you save.', 'headfoot': 'Preview shows the text on each page.', 'crop': 'Light areas will be cut off.', 'text': 'Click a page to include or skip it.', 'table': 'Click a page to include or skip it.'}[t['id']]
        bar_left = f'<b class="fn" id="fname"></b><p class="tip">{tips}</p>'
        bar_acts = ''.join(t['acts']) + f'<label class="btn ghost sm" for="pick">Change PDF</label>'
    filebox = '<div class="filebox" id="fbox"><div class="fthumb" id="fthumb"><span>PDF</span></div><div class="finfo"><b id="fn2"></b><span id="fmeta"></span><p id="fstate"></p></div></div>' if isfile else ''
    gridhtml = '' if isfile else '<div class="grid" id="grid"></div>'
    opt = f'<div class="optbar">{t["opt"]}</div>' if t['opt'] else ''
    go_label = t.get('go', {'delete': 'Delete pages and download', 'extract': 'Extract and download', 'rotate': 'Save rotated PDF', 'reorder': 'Save new order'}.get(t['id'], 'Download'))
    body_attr = (f' data-tool="{t["tool"]}" data-out="{t["out"]}"' if pix else f' data-tool="{t["id"]}"') if (pix or not img) else ''
    qp = ''.join(f'<script src="{u}"></script>' for u in t.get('extra', []))
    title = f'{t["name"]} - Free Online | Dilia {"Image" if pix else "PDF"}'
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{t['name']} in your browser with Dilia. Nothing is uploaded.">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="assets/mark.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/palette.css">
<link rel="stylesheet" href="assets/work.css">
</head>
<body class="work"{body_attr}>
{SPRITE}

<header class="nav solid" data-solid="1">
  <div class="wrap">
    <a class="brand" href="./" aria-label="Dilia PDF home"><svg><use href="#mark"/></svg><span class="wm"><span class="w">Dilia</span><span class="l">PDF</span></span></a>
    <nav class="links" aria-label="Main">
      <button type="button" class="mbtn" data-menu aria-expanded="false" aria-controls="mega">Tools<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      <a class="opt" href="./#privacy">Privacy</a>
      <a class="opt" href="blog/">Blog</a>
    </nav>
    <button type="button" class="sbtn" data-palette aria-label="Search tools"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span class="sl">Search tools</span><span class="k" data-mod>Ctrl</span><span class="k">K</span></button>
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
        <h2>{'Your text file' if t['id']=='text' else 'Your spreadsheet' if t['id']=='table' else 'Your new PDF' if t['id'] not in ('split','pdf2img') else 'Your new files'}</h2>
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
<script src="assets/vendor/pdfjs/pdf.js"></script>
<script src="assets/vendor/Sortable.min.js"></script>
{qp}
<script src="assets/tools.js"></script>
<script src="assets/palette.js"></script>
<script src="assets/menu.js"></script>
<script src="assets/common.js"></script>
<script src="assets/kit.js"></script>
<script src="assets/{t['engine']}.js"></script>
</body>
</html>
'''


# ---------------- Dilia QR ----------------
QTYPES = [('url', 'Website link'), ('text', 'Text'), ('email', 'Email'), ('phone', 'Phone number'), ('sms', 'SMS'), ('wifi', 'Wi-Fi'), ('vcard', 'Contact card'), ('geo', 'Map location'), ('event', 'Calendar event'), ('whatsapp', 'WhatsApp message'), ('bitcoin', 'Bitcoin'), ('instagram', 'Instagram profile'), ('tiktok', 'TikTok profile'), ('youtube', 'YouTube link'), ('review', 'Google review link'), ('appstore', 'App store link')]
QBULK = ['url', 'text', 'phone', 'whatsapp', 'instagram', 'tiktok', 'youtube', 'appstore', 'review']
def qsel(types=None, sel='url'):
    return '<div class="qf"><label class="lbl" for="qType">What should the code do?</label><select class="dd" id="qType">' + ''.join(f'<option value="{v}"{" selected" if v == sel else ""}>{l}</option>' for v, l in QTYPES if not types or v in types) + '</select></div>'
def col(i, label, v): return f'<div class="qc"><label class="lbl" for="{i}">{label}</label><input id="{i}" type="color" value="{v}"></div>'
QDESIGN = ('<details class="qd" id="qdesign" open><summary>Colours and shape</summary><div class="qgrid">'
  + col('qC1', 'Code colour', '#000000') + '<div class="qc" id="qC2w" hidden><label class="lbl" for="qC2">Second colour</label><input id="qC2" type="color" value="#e5007d"></div>' + col('qBg', 'Background', '#ffffff')
  + '<div class="qc wide"><label class="check"><input type="checkbox" id="qGrad"><span>Gradient</span></label> <label class="check"><input type="checkbox" id="qTransp"><span>Transparent background (PNG, SVG)</span></label></div>'
  + dd('qGdir', 'Gradient direction', [('diag', 'Diagonal'), ('h', 'Left to right'), ('v', 'Top to bottom')])
  + dd('qDot', 'Dot shape', [('square', 'Square'), ('round', 'Rounded'), ('dot', 'Dots')]) + dd('qEyeShape', 'Corner shape', [('square', 'Square'), ('round', 'Rounded')])
  + '<div class="qc wide"><label class="check"><input type="checkbox" id="qEyeSame" checked><span>Corners use the code colour</span></label></div><div class="qc" id="qEyew" hidden><label class="lbl" for="qEye">Corner colour</label><input id="qEye" type="color" value="#000000"></div>'
  + '</div></details>'
  + '<details class="qd"><summary>Logo and frame</summary><div class="qgrid">'
  + '<div class="qc wide"><label class="lbl" for="qLogo">Logo in the middle (PNG, JPG, WebP or SVG)</label><input id="qLogo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>'
  + '<div class="qc" id="qLogow" hidden><label class="lbl" for="qLogoSize">Logo size <output id="qLogoSizeo">20</output>%</label><input id="qLogoSize" type="range" min="8" max="30" value="20"><button type="button" class="btn ghost sm" id="qLogoClear">Remove logo</button></div>'
  + dd('qFrame', 'Frame', [('none', 'No frame'), ('box', 'Box'), ('label', 'Box with text')]) + '<div class="qf" id="qFtw" hidden><label class="lbl" for="qFtext">Frame text</label><input id="qFtext" type="text" value="SCAN ME" maxlength="24"></div>'
  + '</div></details>'
  + '<details class="qd"><summary>Size and accuracy</summary><div class="qgrid">'
  + dd('qEcc', 'Error correction', [('auto', 'Automatic'), ('L', 'Low (7%)'), ('M', 'Medium (15%)'), ('Q', 'Quarter (25%)'), ('H', 'High (30%)')]) + numf('qMargin', 'Quiet border', 4, 0, 10, 1, 'modules')
  + dd('qSize', 'Download size', [(512, '512 px'), (1024, '1024 px'), (2048, '2048 px'), (4000, '4000 px')], 1024)
  + '</div></details>')
def qr_main(t):
    mode = t['mode']; name = t['name']
    head = '<div class="ws-head wrap"><div><p class="crumb"><a href="tools.html">Tools</a><span>/</span>' + t['crumb'] + '</p><h1>' + name + '</h1><p class="lead">' + t['lead'] + '</p></div></div>'
    name_field = '<label class="field" for="outName">File name<span class="name"><input id="outName" type="text" value="' + t['defname'] + '" spellcheck="false" autocomplete="off"></span></label>'
    safe = '<p class="safe">' + SHIELD + 'Made in this tab. Nothing is uploaded or stored.</p>'
    if mode == 'make':
        body = ('<div class="qr wrap"><section class="qcard" aria-label="Content">' + (qsel(sel=t['qr']) if not t.get('lock') else '') + '<div id="qfields"></div>' + QDESIGN + '</section>'
          '<aside class="qside"><div class="qbox"><div class="qprev" id="qprev" aria-live="polite"></div><p class="qstat" id="qstat" aria-live="polite"></p><div id="qwarn"></div>' + name_field +
          '<div class="qdl"><button class="btn go" type="button" data-dl="png" disabled>Download PNG</button><button class="btn ghost" type="button" data-dl="svg" disabled>SVG</button><button class="btn ghost" type="button" data-dl="pdf" disabled>PDF</button><button class="btn ghost" type="button" data-dl="jpg" disabled>JPG</button></div>'
          '<p class="note">Static code: it works forever and never expires. SVG and PDF are print ready.</p>' + safe + '</div></aside></div>')
    elif mode == 'bulk':
        body = ('<div class="qr wrap one"><section class="qcard" aria-label="Bulk codes">' + qsel(QBULK, t['qr']) +
          '<div class="qf"><label class="lbl" for="bList">One entry per line</label><textarea id="bList" rows="10" placeholder="https://example.com/one&#10;https://example.com/two"></textarea></div>'
          '<div class="qgrid"><div class="qc wide"><label class="check"><input type="checkbox" id="bNamed"><span>Lines look like: file name, value</span></label></div>' +
          dd('bFmt', 'File type', [('png', 'PNG'), ('svg', 'SVG')]) + dd('qSize', 'PNG size', [(512, '512 px'), (1024, '1024 px'), (2048, '2048 px')], 1024) +
          '<div class="qc"><label class="lbl" for="bCsv">Or load a CSV or text file</label><input id="bCsv" type="file" accept=".csv,.txt,text/csv,text/plain"></div></div>' + name_field +
          '<button class="btn go" type="button" id="bGo"><span class="go-l">Make codes and download ZIP</span><span class="go-p" aria-hidden="true"><i id="bProg"></i></span></button>'
          '<p class="note">Up to 2000 lines. Codes use the default black on white design. Each line becomes one file.</p>' + safe + '</section></div>')
    else:
        body = ('<div class="qr wrap one"><section class="qcard" aria-label="Reader"><label class="dropzone" for="pick" id="dropzone"><span class="dz-art" aria-hidden="true"><span class="dz-page p1"></span><span class="dz-page p2"></span><span class="dz-page p3">' + UP + '</span></span><b>Drop a picture with a QR code</b><span>or <u>choose a picture</u>, or paste one</span><small>Read in your browser. Nothing is uploaded.</small></label>'
          '<input id="pick" class="vh" type="file" accept="image/*"><div class="qdl"><button class="btn ghost" type="button" id="rCam">Use camera</button></div><video id="rVid" class="rvid" playsinline muted hidden></video><div id="rPrev" class="rprev"></div><div id="rOut" class="rout" hidden></div>' + safe + '</section></div>')
    return '<main class="ws-page" data-qr-page>\n  ' + head + '\n  ' + body + '\n</main>'
def qr_page(t):
    base = _page(dict(DUMMY, name=t['name'], crumb=t['crumb'], engine='qrtool'))
    head, rest = base.split('<main', 1); tail = rest.split('</main>', 1)[1]
    head = head.replace('assets/work.css">', 'assets/work.css">\n<link rel="stylesheet" href="assets/qr.css">')
    head = re.sub(r'<title>.*?</title>', '<title>' + t['name'] + ' - Free Online | Dilia QR</title>', head)
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + t['desc'] + '">', head)
    head = head.replace('aria-label="Dilia PDF home"', 'aria-label="Dilia QR home"').replace('<span class="l">PDF</span>', '<span class="l">QR</span>')
    tail = tail.replace('<script src="assets/vendor/pdfjs/pdf.js"></script>\n', '').replace('<script src="assets/vendor/Sortable.min.js"></script>\n', '')
    if t['mode'] != 'make': tail = tail.replace('<script src="assets/vendor/pdf-lib.min.js"></script>\n', '')
    tail = tail.replace('<script src="assets/qrtool.js"></script>', '<script src="assets/qrtool.js"></script>')
    head = head.replace('<body class="work"', '<body class="work" data-mode="' + t['mode'] + '" data-qr="' + t['qr'] + '"')
    return head + qr_main(t) + tail
def qd(id, name, crumb, qr, lead, desc, mode='make', defname='Dilia-qr-code', lock=0):
    return dict(id=id, name=name, crumb=crumb, kind='qr', qr=qr, mode=mode, lead=lead, desc=desc, defname=defname, lock=lock)
QRS = [
 qd('qrmain', 'QR code generator', 'QR code generator', 'url', 'Make a QR code for a link, text, Wi-Fi, contact, email and more. Free, no sign-up, no limit.', 'Free QR code generator for links, Wi-Fi, contacts, email, SMS and more. Colours, logo, SVG and PDF. Made in your browser.'),
 qd('qrurl', 'URL to QR code', 'URL to QR code', 'url', 'Turn any web link into a QR code you can print or share.', 'Turn a web link into a QR code. Free, static, never expires.', lock=1),
 qd('qrtext', 'Text to QR code', 'Text to QR code', 'text', 'Turn any text into a QR code.', 'Turn text into a QR code. Free and private.', lock=1),
 qd('qrwifi', 'Wi-Fi QR code generator', 'Wi-Fi QR code', 'wifi', 'Guests scan the code and join your Wi-Fi. The password stays in your browser.', 'Make a Wi-Fi QR code. Your password never leaves your device.', lock=1, defname='Dilia-wifi-qr'),
 qd('qrvcard', 'vCard QR code generator', 'Contact card QR', 'vcard', 'Share your contact details. One scan saves them to the phone.', 'Make a contact card (vCard) QR code for business cards.', lock=1, defname='Dilia-contact-qr'),
 qd('qremail', 'Email QR code generator', 'Email QR code', 'email', 'A scan opens a new email with address, subject and message filled in.', 'Make an email QR code with subject and message.', lock=1),
 qd('qrsms', 'SMS QR code generator', 'SMS QR code', 'sms', 'A scan opens a text message with the number and message ready.', 'Make an SMS QR code.', lock=1),
 qd('qrphone', 'Phone number QR code', 'Phone QR code', 'phone', 'A scan starts a call to your number.', 'Make a phone number QR code.', lock=1),
 qd('qrwhatsapp', 'WhatsApp QR code generator', 'WhatsApp QR code', 'whatsapp', 'A scan opens a WhatsApp chat with you, with a first message if you like.', 'Make a WhatsApp chat QR code.', lock=1),
 qd('qrgeo', 'Location QR code generator', 'Location QR code', 'geo', 'A scan opens a map at your latitude and longitude.', 'Make a map location QR code.', lock=1),
 qd('qrevent', 'Calendar event QR code', 'Event QR code', 'event', 'A scan adds your event to the phone calendar.', 'Make a calendar event QR code.', lock=1),
 qd('qrbtc', 'Bitcoin QR code generator', 'Bitcoin QR code', 'bitcoin', 'Share a Bitcoin address, with an amount if you want. Check the address before you print it.', 'Make a Bitcoin address QR code.', lock=1),
 qd('qrinsta', 'Instagram QR code generator', 'Instagram QR code', 'instagram', 'A scan opens your Instagram profile.', 'Make an Instagram profile QR code.', lock=1),
 qd('qryoutube', 'YouTube QR code generator', 'YouTube QR code', 'youtube', 'A scan opens your video or channel.', 'Make a YouTube QR code.', lock=1),
 qd('qrreview', 'Google review QR code', 'Google review QR', 'review', 'Customers scan and land on your Google review box. Needs your Place ID.', 'Make a Google review QR code from a Place ID.', lock=1),
 qd('qrapp', 'App store QR code', 'App store QR code', 'appstore', 'A scan opens your app page. Paste the App Store or Google Play link.', 'Make an App Store or Google Play QR code.', lock=1),
 qd('qrbulk', 'Bulk QR code generator', 'Bulk QR codes', 'url', 'Paste a list or load a CSV. Get one ZIP with a code for every line. Free.', 'Make many QR codes at once from a list. Free, one ZIP.', mode='bulk', defname='Dilia-qr-codes'),
 qd('qrread', 'QR code reader', 'QR code reader', 'url', 'Read a QR code from a picture or with your camera. Nothing is uploaded.', 'Read a QR code from an image or your camera, in your browser.', mode='read'),
]


# ---------------- Dilia Text ----------------
import importlib.util as _iu
_sp = _iu.spec_from_file_location('txdata', str(ROOT / 'dev' / 'txdata.py')); _m = _iu.module_from_spec(_sp); _sp.loader.exec_module(_m)
TXTS = [dict(id=i, name=n, crumb=n, kind='txt', mode=mode, preset=pre, lead=lead, desc=seo, defname='Dilia-text') for i, s, n, d, main, mode, pre, lead, seo in _m.TX]
def txt_main(t):
    mode = t['mode']
    head = '<div class="ws-head wrap"><div><p class="crumb"><a href="tools.html">Tools</a><span>/</span>' + t['crumb'] + '</p><h1>' + t['name'] + '</h1><p class="lead">' + t['lead'] + '</p></div></div>'
    safe = '<p class="safe">' + SHIELD + 'Your text stays in this tab. Nothing is uploaded or stored.</p>'
    name_field = '<label class="field" for="outName">File name<span class="name"><input id="outName" type="text" value="' + t['defname'] + '" spellcheck="false" autocomplete="off"></span></label>'
    def ta(i, label, rows=12, ph=''):
        return '<label class="lbl" for="' + i + '">' + label + '</label><textarea id="' + i + '" rows="' + str(rows) + '" spellcheck="false" placeholder="' + ph + '"></textarea>'
    tools = ('<div class="tact"><button class="btn ghost sm" type="button" id="tPaste">Paste</button><button class="btn ghost sm" type="button" id="tSample">Try an example</button>'
             '<label class="btn ghost sm" for="tFile">Open TXT, DOCX or PDF</label><input class="vh" id="tFile" type="file" accept=".txt,.md,.csv,.docx,.pdf,text/plain,application/pdf"><button class="btn ghost sm" type="button" id="tClear">Clear</button></div>')
    if mode == 'diff':
        left = ('<section class="tcard" aria-label="Texts"><div class="tpair"><div>' + ta('tIn', 'Original', 12, 'Paste the original here') + '</div><div>' + ta('tIn2', 'Changed', 12, 'Paste the changed text here') + '</div></div>'
                '<div id="tOpts"></div><div class="tact"><button class="btn ghost sm" type="button" id="tClear">Clear both</button><button class="btn ghost sm" type="button" id="tSample">Try an example</button></div>' + safe + '</section>')
        body = '<div class="tx wrap one">' + left + '<section class="tcard" aria-label="Differences" id="tOut" aria-live="polite"></section></div>'
    elif mode == 'lorem':
        body = '<div class="tx wrap"><section class="tcard" aria-label="Options"><div id="tOpts"></div>' + safe + '</section><section class="tcard" aria-label="Result" id="tOut" aria-live="polite"></section></div>'
    else:
        dl = '' if mode == 'count' else name_field
        ph = {'find': 'Paste the text to change', 'list': 'One item per line'}.get(mode, 'Type or paste your text here')
        body = ('<div class="tx wrap"><section class="tcard" aria-label="Your text">' + ta('tIn', 'Your text', 14, ph) + tools + '<div id="tOpts"></div>' + safe + '</section>'
                '<section class="tcard" aria-label="Result"><div id="tOut" aria-live="polite"></div>' + dl + '</section></div>')
    return '<main class="ws-page" data-txt-page>\n  ' + head + '\n  ' + body + '\n</main>'
def txt_page(t):
    base = _page(dict(DUMMY, name=t['name'], crumb=t['crumb'], engine='texttool'))
    head, rest = base.split('<main', 1); tail = rest.split('</main>', 1)[1]
    head = head.replace('assets/work.css">', 'assets/work.css">\n<link rel="stylesheet" href="assets/text.css">')
    head = re.sub(r'<title>.*?</title>', '<title>' + t['name'] + ' - Free Online | Dilia Text</title>', head)
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + t['desc'] + '">', head)
    head = head.replace('aria-label="Dilia PDF home"', 'aria-label="Dilia Text home"').replace('<span class="l">PDF</span>', '<span class="l">Text</span>')
    for v in ('pdfjs/pdf.js', 'Sortable.min.js', 'pdf-lib.min.js'): tail = tail.replace('<script src="assets/vendor/' + v + '"></script>\n', '')
    head = head.replace('<body class="work"', '<body class="work" data-txt="' + t['mode'] + '" data-preset="' + t['preset'] + '"')
    return head + txt_main(t) + tail

_page = page
def page(t):
    if t['kind'] == 'qr': return qr_page(t)
    if t['kind'] == 'txt': return txt_page(t)
    html = _page(t)
    if t['kind'] == 'pix':
        for a, b in (('aria-label="Dilia PDF home"', 'aria-label="Dilia Image home"'), ('<span class="l">PDF</span>', '<span class="l">Image</span>'),
                     ('<script src="assets/vendor/pdf-lib.min.js"></script>\n', ''), ('<script src="assets/vendor/pdfjs/pdf.js"></script>\n', ''), ('Your new PDF', 'Your new images')):
            html = html.replace(a, b)
    return html


# ---------------- Dilia Calc ----------------
_sp2 = _iu.spec_from_file_location('cdata', str(ROOT / 'dev' / 'cdata.py')); _c = _iu.module_from_spec(_sp2); _sp2.loader.exec_module(_c)
CALCS = [dict(id=i, name=n, crumb=n, kind='calc', mode=mode, lead=lead, desc=seo, preset=(pre[0] if pre else '')) for i, s, n, d, main, mode, lead, seo, *pre in _c.CALC]
def calc_main(t):
    head = '<div class="ws-head wrap"><div><p class="crumb"><a href="tools.html">Tools</a><span>/</span>' + t['crumb'] + '</p><h1>' + t['name'] + '</h1><p class="lead">' + t['lead'] + '</p></div></div>'
    safe = '<p class="safe">' + SHIELD + 'Worked out in this tab. Nothing is uploaded or stored.</p>'
    body = ('<div class="tx calc wrap"><section class="tcard" aria-label="Your numbers"><div id="cIn"></div>' + safe + '</section>'
            '<section class="tcard" aria-label="Result"><div id="cOut" aria-live="polite"></div></section></div>')
    return '<main class="ws-page" data-calc-page>\n  ' + head + '\n  ' + body + '\n</main>'
def calc_page(t):
    base = _page(dict(DUMMY, name=t['name'], crumb=t['crumb'], engine='calctool'))
    head, rest = base.split('<main', 1); tail = rest.split('</main>', 1)[1]
    head = head.replace('assets/work.css">', 'assets/work.css">\n<link rel="stylesheet" href="assets/text.css">\n<link rel="stylesheet" href="assets/calc.css">')
    head = re.sub(r'<title>.*?</title>', '<title>' + t['name'] + ' - Free Online | Dilia Calc</title>', head)
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + t['desc'] + '">', head)
    head = head.replace('aria-label="Dilia PDF home"', 'aria-label="Dilia Calc home"').replace('<span class="l">PDF</span>', '<span class="l">Calc</span>')
    for v in ('pdfjs/pdf.js', 'Sortable.min.js', 'pdf-lib.min.js'): tail = tail.replace('<script src="assets/vendor/' + v + '"></script>\n', '')
    tail = tail.replace('<script src="assets/calctool.js"></script>', '<script src="assets/calcmath.js"></script>\n<script src="assets/calctool.js"></script>')
    head = head.replace('<body class="work"', '<body class="work" data-calc="' + t['mode'] + '" data-preset="' + t['preset'] + '"')
    return head + calc_main(t) + tail

_page2 = page
def page(t):
    if t['kind'] == 'calc': return calc_page(t)
    return _page2(t)

SLUGS = dict(re.findall(r"id: '([^']+)', slug: '([^']+)'", (ROOT / 'assets' / 'tools.js').read_text()))

def up(html):
    """Tool pages live in /<keyword>/index.html, one folder below the site root."""
    for a, b in (('href="assets/', 'href="../assets/'), ('src="assets/', 'src="../assets/'), ('href="./"', 'href="../"'), ('href="./#', 'href="../#'), ('href="tools.html"', 'href="../tools.html"'), ('href="blog/"', 'href="../blog/"'), ('href="pdf/"', 'href="../pdf/"'), ('href="image/"', 'href="../image/"'), ('href="qr/"', 'href="../qr/"'), ('href="text/"', 'href="../text/"'), ('href="compress-image/"', 'href="../compress-image/"'), ('href="qr-code-generator/"', 'href="../qr-code-generator/"'), ('href="compress-pdf/"', 'href="../compress-pdf/"'), ('href="merge-pdf/"', 'href="../merge-pdf/"')):
        html = html.replace(a, b)
    # every page that loads pdf-lib also loads the guard, which reads files in a worker with a time limit first
    return html.replace('src="../assets/vendor/pdf-lib.min.js"></script>', 'src="../assets/vendor/pdf-lib.min.js"></script>\n<script src="../assets/guard.js"></script>')

def write_tool(t, html):
    d = ROOT / SLUGS[t['id']]; d.mkdir(exist_ok=True)
    (d / 'index.html').write_text(up(html))

for t in TOOLS + QRS + TXTS + CALCS:
    write_tool(t, page(t))
    print('wrote', SLUGS[t['id']] + '/')

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
MYFIELDS = [('first', 'First name', 'given-name'), ('last', 'Last name', 'family-name'), ('email', 'Email', 'email'), ('phone', 'Phone', 'tel'), ('company', 'Company', 'organization'),
            ('address', 'Address', 'street-address'), ('city', 'City', 'address-level2'), ('state', 'State or region', 'address-level1'), ('zip', 'Postcode', 'postal-code'), ('country', 'Country', 'country-name')]
MYDLG = ('<dialog class="sdlg" id="myDlg" aria-label="My details"><div class="sdlg-in"><h2>My details</h2>'
         '<p class="hint">Dilia fills only empty text fields whose label clearly matches (name, email, phone, address). Check every field before you save. Details are kept on this device only and never uploaded.</p>'
         '<div class="mygrid">' + ''.join(f'<label class="field">{lab}<input type="text" class="myin" data-my="{k}" autocomplete="{ac}" spellcheck="false" maxlength="120"></label>' for k, lab, ac in MYFIELDS) + '</div>'
         '<label class="rchk"><input type="checkbox" id="myKeep" checked> Remember these on this device</label>'
         '<div class="sact"><button type="button" class="linkbtn" id="myForget">Forget my details</button><button type="button" class="btn ghost" id="myCancel">Cancel</button><button type="button" class="btn" id="myFill">Fill the form</button></div>'
         '</div></dialog>')

def editor_page(t):
    if t.get('only'): tools = ''.join(tb(k, {'select': 'Select', 'redact': 'Redact'}[k]) for k in t['only'])
    else: tools = ''.join([tb('select','Select'), tb('edit','Edit text'), tb('text','Text'), tb('image','Image'), tb('sign','Sign'),
                     '<i class="esep"></i>', tb('highlight','Highlight'), tb('note','Note'), tb('draw','Draw'), tb('box','Box'), tb('whiteout','White-out')])
    find = ('<div class="rfind"><span class="name"><input id="rq" type="text" placeholder="Find a word or number to black out" spellcheck="false" autocomplete="off" aria-label="Find text"></span><button type="button" class="btn ghost sm" id="rgo">Mark all matches</button><span id="rres"></span></div><p class="rwarn">Pages you redact are saved as pictures and lose their text. Check every black box before downloading. A redaction cannot be undone once the file is saved.</p>') if t.get('find') else ''
    my_btn = '<button type="button" class="btn ghost sm" id="myBtn">My details</button>' if t['id'] == 'forms' else ''
    my_dlg = MYDLG if t['id'] == 'forms' else ''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{t['name']} - Free Online | Dilia PDF</title>
<meta name="description" content="{t['name']} in your browser with Dilia. Nothing is uploaded.">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="assets/mark.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/palette.css">
<link rel="stylesheet" href="assets/work.css">
<link rel="stylesheet" href="assets/editor.css">
</head>
<body class="work ed" data-tool="{t['id']}">
{SPRITE}

<header class="nav solid" data-solid="1">
  <div class="wrap">
    <a class="brand" href="./" aria-label="Dilia PDF home"><svg><use href="#mark"/></svg><span class="wm"><span class="w">Dilia</span><span class="l">PDF</span></span></a>
    <nav class="links" aria-label="Main">
      <button type="button" class="mbtn" data-menu aria-expanded="false" aria-controls="mega">Tools<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      <a class="opt" href="./#privacy">Privacy</a>
      <a class="opt" href="blog/">Blog</a>
    </nav>
    <button type="button" class="sbtn" data-palette aria-label="Search tools"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span class="sl">Search tools</span><span class="k" data-mod>Ctrl</span><span class="k">K</span></button>
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
          {my_btn}<label class="btn ghost sm" for="pick">Change PDF</label>
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

{my_dlg}
<div class="toasts" id="toasts" aria-live="polite"></div>
<div class="dropveil" id="veil" aria-hidden="true"><div><svg><use href="#mark"/></svg><p>Drop to add</p></div></div>

<script src="assets/vendor/pdf-lib.min.js"></script>
<script src="assets/vendor/pdfjs/pdf.js"></script>
<script src="assets/tools.js"></script>
<script src="assets/palette.js"></script>
<script src="assets/menu.js"></script>
<script src="assets/common.js"></script>
<script src="assets/kit.js"></script>
<script src="assets/editor.js"></script>
</body>
</html>
'''
for t in EDITORS:
    write_tool(t, editor_page(t))
    print('wrote', SLUGS[t['id']] + '/ (editor)')

# Old flat addresses (/edit.html) forward to the keyword address, so saved links and bookmarks keep working.
OLD = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Moved</title>
<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=%s/">
<link rel="canonical" href="%s/"></head>
<body><p>This page has moved: <a href="%s/">continue</a>.</p></body></html>
'''
CALC_IDS = {c['id'] for c in CALCS}
for tid, slug in SLUGS.items():
    if tid in ('merge',) or tid.startswith('px') or tid.startswith('qr') or tid.startswith('tx') or tid in CALC_IDS or not (ROOT / slug).is_dir(): continue
    (ROOT / (tid + '.html')).write_text(OLD % (slug, slug, slug))
(ROOT / 'merge.html').write_text(OLD % ('merge-pdf', 'merge-pdf', 'merge-pdf'))


# ---------------- PDF reader app (Task W): full-height app, installable, offline ----------------
RI = {  # toolbar icons (24px, stroke)
 'open': 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'side': 'M3 4h18v16H3zM9 4v16',
 'prev': 'm15 18-6-6 6-6', 'next': 'm9 18 6-6-6-6', 'zout': 'M5 12h14', 'zin': 'M12 5v14M5 12h14',
 'rotl': 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5', 'rotr': 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
 'find': 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4', 'measure': 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
 'speak': 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12', 'night': 'M20 15A8 8 0 1 1 9 4a6 6 0 0 0 11 11z',
 'print': 'M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z', 'info': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
 'full': 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', 'read': 'M3 5h7a3 3 0 0 1 2 1 3 3 0 0 1 2-1h7v14h-7a2 2 0 0 0-2 1 2 2 0 0 0-2-1H3z',
 'save': 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14', 'install': 'M12 3v12m0 0-4-4m4 4 4-4M4 21h16', 'close': 'M6 6l12 12M18 6 6 18',
 'tools': 'M14 7l3-3 3 3-3 3M4 20l9-9M15 13l5 5-2 2-5-5',
}
def rb(id_, label, ico, key='', extra=''):
    tip = label + (f' ({key})' if key else '')
    return f'<button type="button" class="rbtn" id="{id_}" aria-label="{label}" title="{tip}"{extra}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="{RI[ico]}"/></svg></button>'
def reader_page():
    base = page(dict(DUMMY, name='PDF reader', crumb='PDF reader'))
    head, rest = base.split('<main', 1)
    tail = rest.split('</main>', 1)[1]
    head = head.replace('assets/work.css">', 'assets/work.css">\n<link rel="stylesheet" href="assets/reader.css">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="assets/app/icon-192.png">')
    head = head.replace('<title>PDF reader - Free Online | Dilia PDF</title>', '<title>PDF Reader - Free Online | Dilia PDF</title>')
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Free PDF reader in your browser, installable as a Windows app. Tabs, bookmarks, search, layers, attachments, print, measure and read aloud. Nothing is uploaded.">', head)
    head = head.replace('<body class="work"', '<body class="work rapp"')
    tail = tail.replace('<script src="assets/viewer.js"></script>', '<script src="assets/reader.js"></script>')
    assert 'assets/reader.js' in tail
    for v in ('pdf-lib.min.js', 'Sortable.min.js'): tail = tail.replace('<script src="assets/vendor/' + v + '"></script>\n', '')
    zoom = ''.join(f'<option value="{v}">{t}</option>' for v, t in (('width', 'Fit width'), ('page', 'Fit page'), ('1', 'Actual size'), ('0.5', '50%'), ('0.75', '75%'), ('1.25', '125%'), ('1.5', '150%'), ('2', '200%'), ('3', '300%'), ('4', '400%')))
    lay = ''.join(f'<option value="{v}">{t}</option>' for v, t in (('cont', 'Scrolling'), ('single', 'One page'), ('two', 'Two pages'), ('cover', 'Two pages, cover')))
    sp = '<span class="rsep" aria-hidden="true"></span>'
    bar = (rb('rOpen', 'Open PDF', 'open', 'Ctrl+O') + rb('rSide', 'Show or hide panels', 'side', 'F4', ' aria-pressed="true"') + sp
        + rb('rPrev', 'Previous page', 'prev') + '<span class="rpg"><input id="rPg" type="text" inputmode="numeric" value="" aria-label="Page number" autocomplete="off"><span id="rPgs">of 0</span></span>' + rb('rNext', 'Next page', 'next') + sp
        + rb('rZout', 'Zoom out', 'zout', 'Ctrl+-') + f'<select id="rZoom" class="rsel" aria-label="Zoom"><option value="custom" hidden>100%</option>{zoom}</select>' + rb('rZin', 'Zoom in', 'zin', 'Ctrl++') + sp
        + f'<select id="rLayout" class="rsel" aria-label="Page layout">{lay}</select>' + rb('rRotL', 'Rotate view left', 'rotl', 'Ctrl+Shift+-') + rb('rRotR', 'Rotate view right', 'rotr', 'Ctrl+Shift++')
        + '<span class="rgrow"></span>'
        + rb('rFind', 'Search the text', 'find', 'Ctrl+F') + rb('rMeasure', 'Measure', 'measure', '', ' aria-pressed="false"') + rb('rSpeak', 'Read aloud', 'speak', 'Ctrl+Shift+Y', ' aria-pressed="false"')
        + rb('rNight', 'Night reading', 'night', '', ' aria-pressed="false"') + rb('rPrint', 'Print', 'print', 'Ctrl+P') + rb("rSave", "Save (Shift for Save as)", "save", "Ctrl+S")
        + rb('rInfo', 'Document properties', 'info', 'Ctrl+D') + rb('rReadMode', 'Read mode', 'read', 'Ctrl+H') + rb('rFull', 'Full screen', 'full', 'Ctrl+L')
        + rb('rTools', 'Edit, sign or change this PDF', 'tools') + rb('rInstall', 'Install Dilia PDF as an app', 'install', '', ' hidden'))
    find = ('<div class="rfind" id="rfind" hidden role="search"><input id="rq" type="search" placeholder="Find in document" aria-label="Find in document" autocomplete="off" spellcheck="false">'
            '<label class="rchk"><input type="checkbox" id="rqCase"> Match case</label><label class="rchk"><input type="checkbox" id="rqWord"> Whole words</label>'
            + rb('rqPrev', 'Previous match', 'prev', 'Shift+Enter') + rb('rqNext', 'Next match', 'next', 'Enter') + '<span class="rqn" id="rqn" aria-live="polite"></span>' + rb('rqClose', 'Close search', 'close', 'Esc') + '</div>')
    navs = ''.join(f'<button type="button" role="tab" class="rsn" data-p="{k}" aria-selected="false">{t}</button>' for k, t in (('pages', 'Pages'), ('outline', 'Bookmarks'), ('files', 'Attachments'), ('comments', 'Comments'), ('layers', 'Layers'), ('results', 'Results')))
    main = f'''<main class="rpage">
  <h1 class="vh">Dilia PDF reader</h1>
  <div class="rd" id="rd" data-state="start">
    <div class="rtabs" id="rtabs" role="tablist" aria-label="Open documents"><button type="button" class="rnew" id="rNewTab" aria-label="Open another PDF" title="Open another PDF">+</button></div>
    <div class="rbar" role="toolbar" aria-label="Reader tools">{bar}</div>
    {find}
    <div class="rbody">
      <aside class="rside" id="rside" aria-label="Panels"><div class="rsnav" role="tablist" aria-label="Panels">{navs}</div><div class="rspanel" id="rspanel" role="tabpanel"></div></aside>
      <div class="rview" id="rview" tabindex="0" aria-label="Document pages"></div>
    </div>
    <section class="rstart" id="rstart" aria-label="Start">
      <div class="rhero">
        <svg class="rmark" aria-hidden="true"><use href="#mark"/></svg>
        <h2>Dilia PDF</h2>
        <p>Open and read PDFs with tabs, bookmarks, search, layers, attachments, print, measure and read aloud. Your files stay on this device.</p>
        <div class="racts"><button type="button" class="btn go" id="rStartOpen">Open PDF</button><span>or drop PDFs anywhere</span></div>
      </div>
      <div class="rrecent" id="rrecent"></div>
      <div class="rhow" id="rhow">
        <h3>Use it as your Windows PDF app</h3>
        <ol><li>In Chrome or Edge, press <b>Install</b> (the download icon in the toolbar or the address bar).</li>
        <li>Open Windows <b>Settings &gt; Apps &gt; Default apps</b>, type <b>.pdf</b>, and choose <b>Dilia PDF</b>.</li>
        <li>Double-click any PDF in File Explorer. It opens here, also with no internet.</li></ol>
      </div>
    </section>
  </div>
  <input id="rpick" class="vh" type="file" accept="application/pdf,.pdf" multiple>
  <div id="rprint" aria-hidden="true"></div>
  <dialog class="rdlg" id="rdlg"></dialog>
</main>
<section class="rabout wrap" aria-label="About the reader">
  <h2>A free PDF reader that keeps your files private</h2>
  <p>Dilia PDF reads files in your browser. Nothing is uploaded, and scripts inside PDFs never run. Web links in a PDF ask before they open. Files attached inside a PDF are never opened by Dilia.</p>
  <ul><li>Tabs for several PDFs, recent files and favourites</li><li>Page thumbnails, bookmarks, layers and attachments</li><li>Search with match case and whole words</li><li>Fit width, fit page, two-page view, rotate, night reading, read mode and full screen</li><li>Select and copy text, print page ranges, measure distances and areas</li><li>Read aloud with the voices on your device</li></ul>
</section>'''
    return head + main + tail

def reader_files(html):
    """Offline list for the service worker: every same-site file the reader page loads, plus the pdf.js data folders."""
    refs = re.findall(r'(?:href|src)="(\.\./assets/[^"#?]+)"', html)
    extra = ['../assets/vendor/pdfjs/pdf.worker.min.mjs', '../assets/app/icon-192.png', '../assets/app/icon-512.png']
    for sub in ('wasm', 'cmaps', 'standard_fonts', 'iccs'):
        for f in sorted((ROOT / 'assets/vendor/pdfjs' / sub).iterdir()):
            if f.is_file() and not f.name.startswith('LICENSE'): extra.append(f'../assets/vendor/pdfjs/{sub}/{f.name}')
    for f in ('fonts/archivo.woff2',):
        if (ROOT / 'assets' / f).exists(): extra.append('../assets/' + f)
    files = ['./', 'manifest.webmanifest'] + sorted(set(refs + extra))
    import hashlib
    h = hashlib.sha256(html.encode())
    for f in files[2:]: h.update((ROOT / 'assets' / f[len('../assets/'):]).read_bytes())
    return files, h.hexdigest()[:12]

d = ROOT / SLUGS['viewer']; d.mkdir(exist_ok=True)
_rhtml = up(reader_page())
(d / 'index.html').write_text(_rhtml)
_files, _ver = reader_files(_rhtml)
(d / 'manifest.webmanifest').write_text(json.dumps({
    'name': 'Dilia PDF', 'short_name': 'Dilia PDF', 'description': 'Read PDFs privately: tabs, bookmarks, search, print, measure and read aloud. Files stay on your device.',
    'id': './', 'start_url': './', 'scope': './', 'display': 'standalone', 'background_color': '#ffffff', 'theme_color': '#ffffff',
    'icons': [{'src': '../assets/app/icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': '../assets/app/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
              {'src': '../assets/app/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}],
    'file_handlers': [{'action': './', 'accept': {'application/pdf': ['.pdf']}, 'icons': [{'src': '../assets/app/icon-192.png', 'sizes': '192x192', 'type': 'image/png'}]}],
    'launch_handler': {'client_mode': ['focus-existing', 'auto']},
    'categories': ['productivity', 'utilities']}, indent=1) + '\n')
(d / 'sw.js').write_text((ROOT / 'dev' / 'reader-sw.js').read_text().replace('__VERSION__', _ver).replace('__FILES__', json.dumps(_files)))
print('wrote', SLUGS['viewer'] + '/ (app, ' + str(len(_files)) + ' offline files, version ' + _ver + ')')

# ---------------- line pages: /pdf/, /image/, /qr/ (own brand in the header) ----------------
LINES = {
    'pdf': dict(name='PDF', title='PDF Tools - Free Online | Dilia PDF', h1='Dilia PDF', kick='PDF tools', sub='Organise, edit, sign, convert and protect PDFs. Everything runs in your browser.', cta=('Merge PDFs', 'merge-pdf/')),
    'image': dict(name='Image', title='Image Tools - Free Online | Dilia Image', h1='Dilia Image', kick='Image tools', sub='Make images smaller, resize and crop them, change formats, add watermarks. Everything runs in your browser.', cta=('Compress image', 'compress-image/')),
    'qr': dict(name='QR', title='QR Code Tools - Free Online | Dilia QR', h1='Dilia QR', kick='QR codes', sub='Make QR codes for links, Wi-Fi, contacts and more, or read one. Everything runs in your browser.', cta=('Make a QR code', 'qr-code-generator/')),
    'calc': dict(name='Calc', title='Calculators - Free Online | Dilia Calc', h1='Dilia Calc', kick='Calculators', sub='Percentages, VAT, loans and savings. Everything is worked out in your browser.', cta=('Loan calculator', 'loan-calculator/')),
    'text': dict(name='Text', title='Text Tools - Free Online | Dilia Text', h1='Dilia Text', kick='Text tools', sub='Count words, change case, clean up, sort and compare text. Everything runs in your browser.', cta=('Count words', 'word-counter/')),
}
base = (ROOT / 'tools.html').read_text()
for lid, c in LINES.items():
    h = base
    h = h.replace('<title>All Tools - Free Online | Dilia</title>', '<title>' + c['title'] + '</title>')
    h = h.replace('aria-label="Dilia home"', 'aria-label="Dilia ' + c['name'] + ' home"').replace('<span class="w">Dilia</span></span>', '<span class="w">Dilia</span><span class="l">' + c['name'] + '</span></span>')
    h = h.replace('<p>PDF tools that run on your own device. Your files are never uploaded.</p>', '<p>' + c['kick'] + ' that run on your own device. Your files are never uploaded.</p>')
    h = h.replace('<p class="kicker">All Dilia tools</p>', '<p class="kicker">' + c['kick'] + '</p>').replace('<h1>Pick a tool.</h1>', '<h1>' + c['h1'] + '</h1>')
    h = h.replace('<p class="sub">Every tool runs in your browser. Pick a line, then a tool.</p>', '<p class="sub">' + c['sub'] + '</p>')
    h = h.replace('<a class="btn sm" href="merge-pdf/">Merge PDFs</a>', '<a class="btn sm" href="' + c['cta'][1] + '">' + c['cta'][0] + '</a>')
    h = h.replace('<body>', '<body data-line="' + lid + '">', 1)
    h = up(h)
    d = ROOT / lid; d.mkdir(exist_ok=True); (d / 'index.html').write_text(h)
    print('wrote line page', lid + '/')

# ---------------- old line addresses: /studio/ -> /pdf/, /pixel/ -> /image/ (old links keep working) ----------------
for old, new, label in (('studio', 'pdf', 'Dilia PDF'), ('pixel', 'image', 'Dilia Image')):
    d = ROOT / old; d.mkdir(exist_ok=True)
    (d / 'index.html').write_text(f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{label} - moved</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="../{new}/">
<meta http-equiv="refresh" content="0; url=../{new}/">
</head>
<body><p>This page moved to <a href="../{new}/">{label}</a>.</p></body>
</html>
''')
    print('wrote redirect', old + '/')

import importlib.util as _nu
_s = _nu.spec_from_file_location('navpass', str(ROOT / 'dev' / 'navpass.py')); _n = _nu.module_from_spec(_s); _s.loader.exec_module(_n)
print('menu updated on', _n.run(), 'pages')
