// Dilia wrapper around pdf.js (Apache-2.0). Exposes window.pdfjsLib for classic scripts and forces safe options on every load.
import * as P from '../package/legacy/build/pdf.min.mjs';
const root = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '');
P.GlobalWorkerOptions.workerSrc = root + 'pdf.worker.min.mjs';
const load = P.getDocument;
const lib = Object.assign({}, P, {
  getDocument(src) {
    const task = load(Object.assign({ cMapUrl: root + 'cmaps/', cMapPacked: true, standardFontDataUrl: root + 'standard_fonts/', wasmUrl: root + 'wasm/', iccUrl: root + 'iccs/' },
      src, { enableScripting: false, isEvalSupported: false }));
    // pdf.js 5+ dropped doc.destroy(); engines call it, so route it to the loading task.
    const p = task.promise.then(doc => { if (typeof doc.destroy !== 'function') doc.destroy = () => task.destroy(); return doc; });
    Object.defineProperty(task, 'promise', { value: p });
    return task;
  }
});
Object.defineProperty(lib, 'GlobalWorkerOptions', { value: { get workerSrc() { return P.GlobalWorkerOptions.workerSrc; }, set workerSrc(v) { /* fixed by the wrapper */ } } });
window.pdfjsLib = lib;
