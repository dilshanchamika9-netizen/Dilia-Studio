const { PDFDocument, PDFName, PDFString, PDFNumber, PDFArray } = require('pdf-lib'); const fs = require('fs');
(async () => {
  const d = await PDFDocument.create(); for (let i = 0; i < 6; i++) d.addPage([612, 792]);
  const add = (pg, dict) => { const ref = d.context.register(d.context.obj(dict)); const pgn = d.getPage(pg); const a = pgn.node.Annots() || d.context.obj([]); a.push(ref); pgn.node.set(PDFName.of('Annots'), a); };
  const R = (x1, y1, x2, y2) => [x1, y1, x2, y2];
  add(0, { Type: 'Annot', Subtype: 'Text', Rect: R(50, 700, 70, 720), Contents: PDFString.of('Check the total here'), T: PDFString.of('Dilshan'), M: PDFString.of('D:20261120101500Z'), F: 4 });
  add(0, { Type: 'Annot', Subtype: 'Highlight', Rect: R(100, 600, 300, 620), QuadPoints: [100, 620, 300, 620, 100, 600, 300, 600], C: [1, 1, 0], F: 4 });
  add(3, { Type: 'Annot', Subtype: 'FreeText', Rect: R(100, 400, 400, 450), Contents: PDFString.of('<script>alert(1)</script> Signed copy needed'), DA: PDFString.of('/Helv 12 Tf 0 g'), F: 4 });
  add(5, { Type: 'Annot', Subtype: 'Text', Rect: R(50, 100, 70, 120), Contents: PDFString.of('Final page note'), F: 4 });
  fs.writeFileSync('/tmp/d/ann.pdf', await d.save());
})();
