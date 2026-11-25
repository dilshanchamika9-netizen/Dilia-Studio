// Dilia PDF desktop bridge. Runs isolated from the page (contextIsolation + sandbox). The page gets a small, fixed set of
// functions; it never sees file paths and can only write to files the user opened or chose in a Windows dialog.
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const buf = b => (b instanceof ArrayBuffer ? b : ArrayBuffer.isView(b) ? b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) : null);

contextBridge.exposeInMainWorld('diliaDesktop', {
  onOpen(cb) {                       // files opened from File Explorer, the Open dialog or the recent list
    if (typeof cb !== 'function') return;
    ipcRenderer.on('dilia-open', (_e, f) => cb({ id: String(f.id), name: String(f.name), mod: +f.mod || Date.now(), bytes: buf(f.bytes) }));
    ipcRenderer.send('dilia-ready');
  },
  open: () => ipcRenderer.invoke('dilia-open-dialog'),
  write: (id, bytes) => ipcRenderer.invoke('dilia-write', String(id), buf(bytes)),
  saveAs: (name, bytes) => ipcRenderer.invoke('dilia-save-as', String(name || 'document.pdf'), buf(bytes)),
  reopen: id => ipcRenderer.invoke('dilia-reopen', String(id)),
  forget: id => ipcRenderer.invoke('dilia-forget', id == null ? null : String(id)),
  printers: () => ipcRenderer.invoke('dilia-printers'),          // names of installed printers, for the print dialog
  print: o => ipcRenderer.invoke('dilia-print', o && typeof o === 'object' ? { printer: String(o.printer || ''), system: !!o.system, copies: +o.copies || 1, collate: o.collate !== false,
    color: o.color !== false, duplex: String(o.duplex || 'simplex'), landscape: !!o.landscape, w: +o.w || 0, h: +o.h || 0 } : null),   // prints this window's print view
  dropped(file) {                    // a file dragged in from File Explorer: register its real path so Ctrl+S can save over it
    let p = '';
    try { p = webUtils.getPathForFile(file); } catch (e) { p = ''; }
    return p ? ipcRenderer.invoke('dilia-dropped', p) : Promise.resolve(null);
  }
});
