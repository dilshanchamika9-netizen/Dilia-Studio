// Dilia PDF for Windows (Electron main process).
// Security (threat model 06-desktop-app): sandboxed renderer with context isolation and no Node; the app serves only its own
// bundled files over dilia://app with the website's strict CSP; every network request is blocked; navigation and pop-ups
// are locked to the app (https links open in the default browser); no permissions except the camera for Scan to PDF.
// File access: the page never gets paths. It can write only to files the user opened (Explorer, Open dialog, drag and drop)
// or chose in Save As, and only PDF content.
'use strict';
const { app, BrowserWindow, protocol, dialog, ipcMain, shell, session, Menu } = require('electron');
const path = require('path'), fsp = require('fs/promises'), fs = require('fs'), crypto = require('crypto');

const SCHEME = 'dilia', HOST = 'app', ORIGIN = `${SCHEME}://${HOST}`;
const START = ORIGIN + '/pdf-reader/';
const SITE = path.join(__dirname, 'site');
const MAXF = 500 * 1048576;
const HEADERS = JSON.parse(fs.readFileSync(path.join(SITE, 'headers.json'), 'utf8'));
if (!/default-src 'none'/.test(HEADERS['Content-Security-Policy'] || '')) throw new Error('Dilia PDF: security policy missing, refusing to start');   // fail closed
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.bcmap': 'application/octet-stream', '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf', '.icc': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8', '.traineddata': 'application/octet-stream', '.gz': 'application/octet-stream' };

protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } }]);
app.enableSandbox();
if (!app.requestSingleInstanceLock()) { app.quit(); }

/* ---------- known files: id -> path. The page only ever sees ids. ---------- */
const STORE = () => path.join(app.getPath('userData'), 'recent-files.json');
let known = new Map();                                       // id -> { path, when }
const idOf = p => crypto.createHash('sha256').update(path.resolve(p).toLowerCase()).digest('hex').slice(0, 24);
function loadKnown() { try { known = new Map(Object.entries(JSON.parse(fs.readFileSync(STORE(), 'utf8')))); } catch (e) { known = new Map(); } }
function saveKnown() {
  const list = [...known.entries()].sort((a, b) => b[1].when - a[1].when).slice(0, 200);
  known = new Map(list);
  try { fs.writeFileSync(STORE(), JSON.stringify(Object.fromEntries(list))); } catch (e) { /* not critical */ }
}
function remember(p) { const id = idOf(p); known.set(id, { path: path.resolve(p), when: Date.now() }); saveKnown(); return id; }
const isPdfPath = p => typeof p === 'string' && /\.pdf$/i.test(p) && path.isAbsolute(p);
const isPdfBytes = b => b && b.byteLength > 5 && Buffer.from(b, 0, Math.min(1024, b.byteLength)).includes('%PDF-');

/* ---------- window ---------- */
let win = null, ready = false;
const pending = [];
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 640, minHeight: 480, show: false, backgroundColor: '#ffffff', title: 'Dilia PDF',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, nodeIntegrationInSubFrames: false,
      nodeIntegrationInWorker: false, webSecurity: true, allowRunningInsecureContent: false, spellcheck: false, devTools: !app.isPackaged, webviewTag: false, safeDialogs: true }
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; ready = false; });
  const wc = win.webContents;
  wc.setWindowOpenHandler(({ url }) => { openOutside(url); return { action: 'deny' }; });
  wc.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN + '/')) { e.preventDefault(); openOutside(url); } });
  wc.on('will-frame-navigate', e => { if (!(e.url.startsWith(ORIGIN + '/') || e.url === 'about:blank')) e.preventDefault(); });
  wc.on('will-attach-webview', e => e.preventDefault());
  wc.on('will-prevent-unload', e => {                       // the page says there are unsaved changes
    const r = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Close without saving', 'Cancel'], defaultId: 1, cancelId: 1, noLink: true,
      title: 'Dilia PDF', message: 'You have unsaved changes.', detail: 'Close Dilia PDF and lose the changes? To keep them, choose Cancel and press Ctrl+S.' });
    if (r === 0) e.preventDefault();                         // preventDefault here = ignore the page's objection and close
  });
  wc.session.on('will-download', (_e, item) => {              // images, zip and text results from the tools: ask where to save
    item.setSaveDialogOptions({ title: 'Save', defaultPath: path.join(app.getPath('downloads'), item.getFilename()) });
  });
  let asking = false;                                        // the window crashed or froze: say so and offer a reload, instead of leaving a blank window
  wc.on('render-process-gone', async (_e, d) => {
    if (!win || asking || d.reason === 'clean-exit') return; asking = true;
    const r = await dialog.showMessageBox(win, { type: 'error', buttons: ['Reload', 'Close'], defaultId: 0, cancelId: 1, noLink: true, title: 'Dilia PDF',
      message: 'The window stopped working.', detail: 'Changes you had not saved are lost. Files you saved are not affected. (' + d.reason + ')' });
    asking = false; if (!win) return;
    if (r.response === 0) { ready = false; wc.reload(); } else win.destroy();
  });
  wc.on('unresponsive', async () => {
    if (!win || asking) return; asking = true;
    const r = await dialog.showMessageBox(win, { type: 'warning', buttons: ['Wait', 'Reload'], defaultId: 0, cancelId: 0, noLink: true, title: 'Dilia PDF',
      message: 'Dilia PDF is not responding.', detail: 'Wait if a big file is still loading. Reload loses changes you had not saved.' });
    asking = false; if (win && r.response === 1) { ready = false; wc.reload(); }
  });
  win.loadURL(START);
}
function openOutside(url) {
  try { const u = new URL(url); if (u.protocol === 'https:') shell.openExternal(u.href); } catch (e) { /* ignore anything else */ }
}

/* ---------- open files ---------- */
async function send(p) {
  if (!isPdfPath(p)) return false;
  let st; try { st = await fsp.stat(p); } catch (e) { return false; }
  if (!st.isFile()) return false;
  if (st.size > MAXF) { if (win) dialog.showMessageBox(win, { type: 'info', message: path.basename(p) + ' is over 500 MB, which is too big to open.' }); return true; }
  const data = await fsp.readFile(p), id = remember(p);
  const msg = { id, name: path.basename(p), mod: st.mtimeMs, bytes: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) };
  if (win && ready) win.webContents.send('dilia-open', msg); else pending.push(msg);
  return true;
}
const argPdfs = argv => argv.slice(1).filter(a => !a.startsWith('-') && isPdfPath(path.resolve(a))).map(a => path.resolve(a));
function focus() { if (!win) return; if (win.isMinimized()) win.restore(); win.focus(); }

app.on('second-instance', (_e, argv) => { focus(); argPdfs(argv).forEach(send); });

ipcMain.on('dilia-ready', e => {
  if (!win || e.sender !== win.webContents) return;
  ready = true; pending.splice(0).forEach(m => win.webContents.send('dilia-open', m));
});
const fromApp = e => win && e.sender === win.webContents && e.senderFrame === win.webContents.mainFrame && e.senderFrame.url.startsWith(ORIGIN + '/');
ipcMain.handle('dilia-open-dialog', async e => {
  if (!fromApp(e)) return false;
  const r = await dialog.showOpenDialog(win, { title: 'Open PDF', properties: ['openFile', 'multiSelections'], filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled) return false;
  for (const p of r.filePaths) await send(p);
  return true;
});
async function writeSafe(p, bytes) {                         // write next to the file, then swap, so a failed save never damages it
  const tmp = p + '.dilia-' + crypto.randomBytes(4).toString('hex') + '.tmp';
  await fsp.writeFile(tmp, Buffer.from(bytes));
  try { await fsp.rename(tmp, p); } catch (e) { await fsp.rm(tmp, { force: true }); throw e; }
}
ipcMain.handle('dilia-write', async (e, id, bytes) => {
  if (!fromApp(e) || !(bytes instanceof ArrayBuffer) || !isPdfBytes(bytes)) throw new Error('refused');
  const k = known.get(id); if (!k) throw new Error('unknown file');
  await writeSafe(k.path, bytes); k.when = Date.now(); saveKnown();
  return true;
});
ipcMain.handle('dilia-save-as', async (e, name, bytes) => {
  if (!fromApp(e) || !(bytes instanceof ArrayBuffer) || !isPdfBytes(bytes)) throw new Error('refused');
  const clean = (String(name).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\.pdf$/i, '') || 'document') + '.pdf';
  const r = await dialog.showSaveDialog(win, { title: 'Save as', defaultPath: clean, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled || !r.filePath) return null;
  const p = /\.pdf$/i.test(r.filePath) ? r.filePath : r.filePath + '.pdf';
  await writeSafe(p, bytes);
  return { id: remember(p), name: path.basename(p) };
});
ipcMain.handle('dilia-reopen', async (e, id) => {
  if (!fromApp(e)) return false;
  const k = known.get(id); if (!k) return false;
  return send(k.path);
});
ipcMain.handle('dilia-forget', (e, id) => {
  if (!fromApp(e)) return false;
  if (id == null) known.clear(); else known.delete(id);
  saveKnown(); return true;
});
/* ---------- printing (owner issues APP-02..04): the page draws every sheet itself; Windows only gets the finished sheets ---------- */
ipcMain.handle('dilia-printers', async e => {
  if (!fromApp(e)) return [];
  try { return (await e.sender.getPrintersAsync()).map(p => ({ name: String(p.name), label: String(p.displayName || p.name), def: !!p.isDefault })); } catch (err) { return []; }
});
ipcMain.handle('dilia-print', (e, o) => new Promise(res => {
  if (!fromApp(e) || !o || typeof o !== 'object') return res({ ok: false, why: 'refused' });
  const int = (v, lo, hi, d) => { v = Math.round(+v); return Number.isFinite(v) && v >= lo && v <= hi ? v : d; };
  const opt = { silent: !o.system, printBackground: true, copies: Math.min(99, int(o.copies, 1, 100000, 1)), collate: o.collate !== false, color: o.color !== false,
    landscape: !!o.landscape, margins: { marginType: 'none' }, pageSize: { width: int(o.w, 50000, 1300000, 210000), height: int(o.h, 50000, 1300000, 297000) },
    duplexMode: ['simplex', 'longEdge', 'shortEdge'].includes(o.duplex) ? o.duplex : 'simplex' };
  if (!o.system && typeof o.printer === 'string' && o.printer) opt.deviceName = o.printer.slice(0, 300);
  try { e.sender.print(opt, (ok, why) => res({ ok: !!ok, why: ok ? '' : String(why || 'failed') })); } catch (err) { res({ ok: false, why: String(err && err.message || err) }); }
}));
ipcMain.handle('dilia-dropped', async (e, p) => {
  if (!fromApp(e) || !isPdfPath(p)) return null;
  try { if (!(await fsp.stat(p)).isFile()) return null; } catch (x) { return null; }
  return { id: remember(p), name: path.basename(p) };
});

/* ---------- serve the bundled site ---------- */
async function serve(req) {
  let u; try { u = new URL(req.url); } catch (e) { return new Response('Bad request', { status: 400 }); }
  if (u.host !== HOST) return new Response('Not found', { status: 404 });
  let rel = decodeURIComponent(u.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const full = path.normalize(path.join(SITE, rel));
  if (!full.startsWith(SITE + path.sep)) return new Response('Forbidden', { status: 403 });
  try {
    const data = await fsp.readFile(full);
    return new Response(data, { status: 200, headers: Object.assign({ 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' }, HEADERS) });
  } catch (e) { return new Response('Not found', { status: 404, headers: HEADERS }); }
}

app.whenReady().then(() => {
  loadKnown();
  Menu.setApplicationMenu(null);
  protocol.handle(SCHEME, serve);
  const ses = session.defaultSession;
  ses.setSpellCheckerEnabled(false);                         // otherwise Chromium downloads spelling dictionaries from Google
  try { ses.setSpellCheckerLanguages([]); } catch (e) { /* not on macOS */ }
  ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] }, (_d, cb) => cb({ cancel: true }));   // no network at all
  const allowed = (perm, details) => perm === 'clipboard-sanitized-write' ||
    (perm === 'media' && details && Array.isArray(details.mediaTypes) && details.mediaTypes.length > 0 && details.mediaTypes.every(t => t === 'video'));
  ses.setPermissionRequestHandler((wc, perm, cb, details) => cb(!!win && wc === win.webContents && allowed(perm, details)));
  ses.setPermissionCheckHandler((_wc, perm, origin) => origin === ORIGIN && (perm === 'clipboard-sanitized-write' || perm === 'media'));
  app.on('web-contents-created', (_e, wc) => {
    wc.on('will-attach-webview', ev => ev.preventDefault());
    wc.setWindowOpenHandler(({ url }) => { openOutside(url); return { action: 'deny' }; });
  });
  createWindow();
  argPdfs(process.argv).forEach(send);
});
app.on('window-all-closed', () => app.quit());
