/* One list of tools for the whole site. ready:1 marks tools that work today. */
window.DILIA_TOOLS = [
  ['Organise', [
    { id: 'merge', name: 'Merge', desc: 'Join several PDFs into one, in the order you set.', ready: 1, icon: 'M5 3h6v8H5zM13 3h6v8h-6zM8 11v2a4 4 0 0 0 4 4m4-6v2a4 4 0 0 1-4 4v4' },
    { id: 'split', name: 'Split', desc: 'Cut one PDF into separate files by page range.', ready: 1, icon: 'M6 3h12v7H6zM6 14h12v7H6z' },
    { id: 'reorder', name: 'Reorder pages', desc: 'Drag pages into a new order.', ready: 1, icon: 'M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3' },
    { id: 'delete', name: 'Delete pages', desc: 'Remove the pages you do not need.', ready: 1, icon: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13' },
    { id: 'extract', name: 'Extract pages', desc: 'Pull chosen pages out into a new PDF.', ready: 1, icon: 'M6 3h9l4 4v14H6zM10 13h8M15 10l3 3-3 3' },
    { id: 'rotate', name: 'Rotate', desc: 'Turn single pages or the whole file.', ready: 1, icon: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5' }
  ]],
  ['Edit and sign', [
    { id: 'edit', name: 'Edit text', desc: 'Change words already printed on the page.', ready: 1, icon: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4' },
    { id: 'add', name: 'Add text and images', desc: 'Place new text, photos and shapes.', ready: 1, icon: 'M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4M15 8.5h.01' },
    { id: 'forms', name: 'Fill forms', desc: 'Type into fields, tick boxes, pick options.', ready: 1, icon: 'M4 5h16v5H4zM4 14h16v5H4zM7 7.5h5M7 16.5h3' },
    { id: 'sign', name: 'Sign', desc: 'Draw, type or upload a signature and place it.', ready: 1, icon: 'M3 16c3-1 4-9 6-9s-1 9 1 9 3-4 4-4 1 3 3 3 2-1 4-2M3 21h18' },
    { id: 'annotate', name: 'Highlight and notes', desc: 'Mark up lines and leave comments.', ready: 1, icon: 'M4 21h16M6 17l9-9 3 3-9 9H6z' },
    { id: 'watermark', name: 'Watermark', desc: 'Stamp text or a logo across pages.', ready: 1, icon: 'M6 3h9l4 4v14H6zM9 16l7-7' },
    { id: 'number', name: 'Page numbers', desc: 'Number pages in your own format.', ready: 1, icon: 'M9 4 7 20M17 4l-2 16M4 9h16M3 15h16' },
    { id: 'bates', name: 'Bates numbering', desc: 'Stamp running reference numbers like ABC-000001.', ready: 1, icon: 'M5 6h14M5 12h14M5 18h9M17 16l2 2 3-4' },
    { id: 'headfoot', name: 'Header and footer', desc: 'Add text to the top and bottom of every page.', ready: 1, icon: 'M4 4h16v16H4zM4 8h16M4 16h16' },
    { id: 'flip', name: 'Flip pages', desc: 'Mirror pages left to right or top to bottom.', ready: 1, icon: 'M12 3v18M8 7 3 12l5 5zM16 7l5 5-5 5z' },
    { id: 'nup', name: 'Several pages per sheet', desc: 'Print 2 to 16 pages on one sheet.', ready: 1, icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
    { id: 'meta', name: 'Edit properties', desc: 'Change title, author and keywords.', ready: 1, icon: 'M4 6h16M4 12h10M4 18h13' },
    { id: 'flatten', name: 'Flatten', desc: 'Make form entries and marks permanent.', ready: 1, icon: 'M4 8l8-4 8 4-8 4zM4 13l8 4 8-4M4 17l8 4 8-4' },
    { id: 'extractimg', name: 'Extract images', desc: 'Save the pictures inside a PDF.', ready: 1, icon: 'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 8.5h.01' },
    { id: 'bookmarks', name: 'Add bookmarks', desc: 'Add a clickable outline.', ready: 1, icon: 'M6 3h12v18l-6-4-6 4z' },
    { id: 'resize', name: 'Resize pages', desc: 'Change pages to A4, Letter and more.', ready: 1, icon: 'M4 4h10v10H4zM14 14h6v6h-6zM14 10l6-6' },
    { id: 'noannot', name: 'Remove annotations', desc: 'Delete comments, highlights and stamps.', ready: 1, icon: 'M4 4h16v12H9l-5 4zM9 8l6 4M15 8l-6 4' },
    { id: 'booklet', name: 'Booklet', desc: 'Reorder pages to fold into a booklet.', ready: 1, icon: 'M3 5h8v14H3zM13 5h8v14h-8z' },
    { id: 'poster', name: 'Poster', desc: 'Enlarge a page across several sheets.', ready: 1, icon: 'M3 3h9v9H3zM12 3h9v9h-9zM3 12h9v9H3zM12 12h9v9h-9z' },
    { id: 'overlay', name: 'Letterhead', desc: 'Put a letterhead or stamp on every page.', ready: 1, icon: 'M4 4h16v16H4zM8 9h8M8 13h5' },
    { id: 'rename', name: 'Rename by text', desc: 'Name files after text on their pages.', ready: 1, icon: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4' },
    { id: 'batch', name: 'Batch', desc: 'Apply one action to many PDFs.', ready: 1, icon: 'M7 7h13v13H7zM4 4h13v2M4 4v13h2' },
    { id: 'scan', name: 'Scan to PDF', desc: 'Photograph pages and make a clean PDF.', ready: 1, icon: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10' },
    { id: 'cleaner', name: 'PDF cleaner', desc: 'Strip scripts, attachments and hidden data.', ready: 1, icon: 'M4 20h16M7 20l3-12 4 1-1 11M12 4l2 4' },
    { id: 'grayscale', name: 'Grayscale', desc: 'Make a PDF black, white and grey.', ready: 1, icon: 'M12 3a9 9 0 1 0 0 18zM12 3v18' },
    { id: 'deskew', name: 'Straighten scans', desc: 'Fix crooked scanned pages.', ready: 1, icon: 'M5 8l14-3M5 13l14-3M5 18l14-3' },
    { id: 'repair', name: 'Repair', desc: 'Rebuild a damaged PDF.', ready: 1, icon: 'M14 6l4 4-9 9H5v-4zM13 7l4 4' },
    { id: 'linearize', name: 'Fast web view', desc: 'Make the first page load first.', ready: 1, icon: 'M4 12h12M12 6l6 6-6 6' },
    { id: 'compare', name: 'Compare', desc: 'See what changed between two PDFs.', ready: 1, icon: 'M4 4h7v16H4zM13 4h7v16h-7zM7 9h1M16 9h1' },
    { id: 'makeform', name: 'Create form', desc: 'Add fillable fields to a PDF.', ready: 1, icon: 'M4 5h16v5H4zM4 14h16v5H4zM7 7.5h5M7 16.5h3' },
    { id: 'mix', name: 'Alternate and mix', desc: 'Interleave pages from two or more PDFs.', ready: 1, icon: 'M4 5h7v6H4zM13 13h7v6h-7zM13 5h7v6h-7zM4 13h7v6H4z' },
    { id: 'insert', name: 'Insert or replace pages', desc: 'Put pages from one PDF into another.', ready: 1, icon: 'M4 4h9v16H4zM16 8h4M18 6v4M16 15h4' }
  ]],
  ['Convert', [
    { id: 'img2pdf', name: 'Images to PDF', desc: 'Turn JPG and PNG photos into one PDF.', ready: 1, icon: 'M3 5h12v10H3zM3 12l4-3 4 3M14 13h4l3 3v5h-7z' },
    { id: 'pdf2img', name: 'PDF to images', desc: 'Save each page as a PNG or JPG.', ready: 1, icon: 'M6 3h9l4 4v14H6zM9 17l3-3 2 2 2-2 1 1' },
    { id: 'text', name: 'PDF to text', desc: 'Copy out all the text as a plain file.', ready: 1, icon: 'M6 3h9l4 4v14H6zM9 10h7M9 14h7M9 18h4' },
    { id: 'word', name: 'Word to PDF', desc: 'Convert DOCX files. Needs a converter server.', server: 1, icon: 'M6 3h9l4 4v14H6zM9 10l1.5 7L12 12l1.5 5L15 10' }
  ]],
  ['Optimise and secure', [
    { id: 'compress', name: 'Compress', desc: 'Make the file smaller for email.', ready: 1, icon: 'M12 3v6M9 6l3 3 3-3M12 21v-6M9 18l3-3 3 3M4 12h16' },
    { id: 'protect', name: 'Password protect', desc: 'Lock the file with a password.', ready: 1, icon: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3M12 15v2' },
    { id: 'unlock', name: 'Remove password', desc: 'Open a file you have the password for.', ready: 1, icon: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 7.5-2M12 15v2' },
    { id: 'ocr', name: 'Recognise text', desc: 'Make scanned pages searchable.', ready: 1, icon: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10' },
    { id: 'redact', name: 'Redact', desc: 'Remove sensitive text for good.', ready: 1, icon: 'M6 3h9l4 4v14H6zM8 9h8v3H8zM8 15h6v2H8z' },
    { id: 'crop', name: 'Crop', desc: 'Trim margins or cut a page to an area.', ready: 1, icon: 'M6 2v16h16M2 6h16v16' }
  ]]
];
window.diliaIcon = (d, cls) => `<svg class="${cls || 'ico'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
