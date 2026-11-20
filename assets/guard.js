/* Dilia guard (page side). Load right after pdf-lib.min.js.
   - Every PDFLib.PDFDocument.load() first reads the file in a background worker with a time limit. A file that hangs
     or crashes the reader is stopped there and refused, so the page and the Dilia PDF app stay responsive.
   - qpdf (password, unlock, repair, fast web view) runs only in a worker, never on the page.
   Files never leave the device: the worker is a local script from this site. */
(() => {
  const ROOT = document.currentScript.src.replace(/assets\/guard\.js.*$/, '');
  const MB = 1048576;
  const SLOW = 'This file took too long to read, so Dilia stopped it to keep your browser responsive. It may be damaged or built to freeze apps.';
  const CRASH = 'This file could not be read. It may be damaged.';
  let seq = 0, shared = null;

  function spawn() {
    const w = new Worker(ROOT + 'assets/guard-worker.js'), jobs = new Map();
    const fail = msg => { jobs.forEach(j => { clearTimeout(j.t); j.no(new Error(msg)); }); jobs.clear(); w.terminate(); if (shared === h) shared = null; };
    w.onmessage = e => { const j = jobs.get(e.data.id); if (!j) return; jobs.delete(e.data.id); clearTimeout(j.t); e.data.ok ? j.ok(e.data) : j.no(new Error(e.data.msg)); };
    w.onerror = e => { e.preventDefault(); fail(CRASH); };
    const h = {
      run(msg, ms, transfer) {
        return new Promise((ok, no) => {
          const id = ++seq;
          jobs.set(id, { ok, no, t: setTimeout(() => fail(SLOW), ms) });
          w.postMessage(Object.assign({ id }, msg), transfer || []);
        });
      },
      end() { w.terminate(); }
    };
    return h;
  }
  const size = b => (b && (b.byteLength || b.length)) || 0;
  const limit = (b, base, perMB, cap) => +window.DiliaGuard.maxMs > 0 ? +window.DiliaGuard.maxMs : Math.min(cap, base + Math.ceil(size(b) / MB) * perMB);   // maxMs: test hook only

  /* read check: the same parse the page is about to do, but in the worker */
  function check(bytes, opts) {
    if (typeof Worker === 'undefined') return Promise.resolve(null);
    const o = {};
    if (opts) for (const k of ['ignoreEncryption', 'throwOnInvalidObject', 'updateMetadata', 'capNumbers']) if (k in opts) o[k] = opts[k];
    shared = shared || spawn();
    return shared.run({ op: 'load', bytes, opts: o }, limit(bytes, 20000, 500, 120000));
  }

  /* qpdf in its own worker, ended after every job so its memory is freed */
  async function qpdf(args, input) {
    const w = spawn(), copy = input.slice();             // the caller keeps its bytes; the copy is moved to the worker
    try { return await w.run({ op: 'qpdf', args, bytes: copy }, limit(input, 60000, 2000, 600000), [copy.buffer]); }
    finally { w.end(); }
  }

  const P = window.PDFLib && window.PDFLib.PDFDocument;
  if (P && !P.__guarded) {
    const orig = P.load.bind(P), passed = new WeakSet();
    P.load = async function (pdf, opts) {
      const key = pdf && typeof pdf === 'object' ? pdf : null;
      if (!(key && passed.has(key))) { await check(pdf, opts); if (key) passed.add(key); }
      return orig(pdf, opts);
    };
    P.__guarded = true;
  }
  window.DiliaGuard = { check, qpdf, maxMs: 0 };
})();
