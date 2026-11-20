/* Dilia guard worker. Untrusted PDFs are read here first, off the page's main thread, so a damaged or hostile file
   cannot freeze the page. The page side (guard.js) ends this worker if a job runs past its time limit. */
'use strict';
const BASE = self.location.href.replace(/assets\/guard-worker\.js.*$/, '');
let L = null, Q = null;
const lib = () => L || (importScripts(BASE + 'assets/vendor/pdf-lib.min.js'), L = self.PDFLib);
const qpdfModule = () => Q || (importScripts(BASE + 'assets/vendor/qpdf.js'), Q = self.Module);

self.onmessage = async e => {
  const { id, op, bytes, opts, args } = e.data || {};
  try {
    if (op === 'load') {
      const P = lib(), d = await P.PDFDocument.load(bytes, Object.assign({}, opts, { parseSpeed: P.ParseSpeeds.Fastest }));
      const pages = d.getPageCount();                       // walks the page tree: a looping tree is caught here
      try { d.getForm().getFields(); } catch (x) { /* a broken form is not a reason to refuse the file */ }
      self.postMessage({ id, ok: true, pages });
    } else if (op === 'qpdf') {
      const logs = [], m = await qpdfModule()({ locateFile: () => BASE + 'assets/vendor/qpdf.wasm', noInitialRun: true, print: t => logs.push(t), printErr: t => logs.push(t) });
      m.FS.writeFile('/in.pdf', bytes);
      let code;
      try { code = m.callMain(args); } catch (x) { code = typeof x === 'number' ? x : (x && typeof x.status === 'number' ? x.status : 2); }
      if (code === undefined) code = 0;
      let out = null;
      try { out = m.FS.readFile('/out.pdf'); } catch (x) { /* none written */ }
      self.postMessage({ id, ok: true, code, out, log: logs.join('\n') }, out ? [out.buffer] : []);
    } else throw new Error('unknown job');
  } catch (x) { self.postMessage({ id, ok: false, msg: String((x && x.message) || x) }); }
};
