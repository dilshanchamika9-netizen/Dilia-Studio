const { PDFDocument } = require('pdf-lib'); const fs = require('fs');
(async () => {
  const d = await PDFDocument.create(), p = d.addPage([400, 700]), f = d.getForm();
  const names = ['First Name', 'Last Name', 'Email Address', 'Mobile Phone', 'Company', 'Street Address', 'City', 'Postcode', 'Country', 'Bank Account Name', "Father's Name", 'Comments', 'Full Name'];
  names.forEach((n, i) => { const t = f.createTextField(n.replace(/ /g, '_').replace("'", '')); t.setText(n === 'Company' ? 'Existing Co' : ''); t.addToPage(p, { x: 20, y: 650 - i * 40, width: 250, height: 24 }); });
  const m = f.createTextField('Mailing_Address_Lines'); m.enableMultiline(); m.addToPage(p, { x: 20, y: 100, width: 250, height: 60 });
  fs.writeFileSync('/tmp/d/form.pdf', await d.save());
})();
