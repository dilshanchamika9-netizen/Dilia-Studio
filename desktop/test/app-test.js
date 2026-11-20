// Dilia PDF desktop app test: drives the real app (main process + page). Windows: node test/app-test.js
// Linux: run as a non-root user under xvfb-run. Dialogs are answered by the test; files go to a temp folder.
const { _electron } = require('playwright-core'); const fs = require('fs'), crypto = require('crypto'), { PDFDocument } = require('pdf-lib');
const path = require('path'), os = require('os');
const APP = path.resolve(__dirname, '..'), D = fs.mkdtempSync(path.join(os.tmpdir(), 'dilia-test-')), F = path.join(D, 'work.pdf'), NET = path.join(D, 'net.json'); const fails = [], errs = [];
fs.copyFileSync(path.join(__dirname, 'fixtures', 'ten.pdf'), path.join(D, 'ten.pdf')); fs.copyFileSync(path.join(__dirname, 'fixtures', 'ten.pdf'), path.join(D, 'drop.pdf'));
const LINUX = process.platform === 'linux';                       // Linux CI/workspace only: Chromium's sandbox needs a non-root user
const ck = (n, c, e) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (e !== undefined && !c ? ' ' + JSON.stringify(e) : '')); if (!c) fails.push(n); };
const h = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const pages = async p => (await PDFDocument.load(fs.readFileSync(p))).getPageCount();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.copyFileSync(D + '/ten.pdf', F); const before = h(F); 
  let ea = null;
  for (let i = 1; i <= 3 && !ea; i++) {                          // Windows build machines are sometimes slow to start Electron
    try { ea = await _electron.launch({ executablePath: require('electron'), args: [...(LINUX ? ['--no-sandbox'] : []), '--log-net-log=' + NET, APP, F], timeout: 90000 }); }
    catch (e) { console.log('launch attempt ' + i + ' failed: ' + e.message.split('\n')[0]); if (i === 3) throw e; }
  }
  const w = await ea.firstWindow(); w.on('pageerror', e => errs.push(String(e))); w.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await w.waitForFunction(() => window.__reader && __reader.tabs.length > 0, null, { timeout: 30000 });
  ck('opens at dilia://app/pdf-reader/', w.url() === 'dilia://app/pdf-reader/', w.url());
  ck('file from File Explorer opens as a tab', await w.evaluate(() => __reader.tabs[0].name) === 'work.pdf');
  ck('10 pages', await w.evaluate(() => __reader.tabs[0].n) === 10);
  await sleep(1500);
  ck('pages render (pdf.js worker on dilia://)', await w.evaluate(() => document.querySelectorAll('.rdoc canvas').length) > 0);
  ck('desktop look: website header hidden', await w.evaluate(() => getComputedStyle(document.querySelector('.nav')).display) === 'none');
  ck('no Node in page', await w.evaluate(() => typeof require === 'undefined' && typeof process === 'undefined'));
  ck('bridge has fixed functions only', await w.evaluate(() => Object.keys(diliaDesktop).sort().join()) === 'dropped,forget,onOpen,open,reopen,saveAs,write');
  ck('strict CSP header served', /default-src 'none'.*wasm-unsafe-eval/.test(await w.evaluate(() => fetch(location.href).then(r => r.headers.get('content-security-policy')))));
  ck('network blocked', await w.evaluate(() => fetch('https://example.com').then(() => false, () => true)));
  const st = await w.evaluate(() => fetch('/%2e%2e/%2e%2e/main.js').then(r => r.status, () => 0)); ck('path traversal refused', [0, 403, 404].includes(st), st);
  await w.evaluate(() => { location.href = 'https://example.com'; }); await sleep(800);
  ck('navigation to websites blocked', w.url().startsWith('dilia://app/'), w.url());
  ck('pop-ups blocked', await w.evaluate(() => window.open('https://example.com') === null));
  ck('write refused: unknown file', await w.evaluate(() => diliaDesktop.write('nope', new TextEncoder().encode('%PDF-1.4 x').buffer).then(() => false, () => true)));
  const tid = await w.evaluate(() => __reader.tabs[0].handle.desk);
  ck('write refused: not PDF content', await w.evaluate(id => diliaDesktop.write(id, new TextEncoder().encode('hello').buffer).then(() => false, () => true), tid));
  ck('original untouched so far', h(F) === before);
  // guard worker + qpdf worker run under dilia://
  await w.evaluate(() => __reader.openTool('protect')); await sleep(2500);
  let fr = w.frames().find(f => /protect/.test(f.url()));
  ck('tool page (protect) loads inside the app', !!fr, w.frames().map(f => f.url()));
  if (fr) {
    await fr.waitForFunction(() => document.querySelector('#fn2') && document.querySelector('#fn2').textContent.length > 0, null, { timeout: 20000 });
    ck('tool page received the open document', await fr.textContent('#fn2') === 'work.pdf', await fr.textContent('#fn2'));
    ck('guard active in tool page', await fr.evaluate(() => !!window.DiliaGuard && PDFLib.PDFDocument.__guarded === true));
    const lab = await fr.textContent('#go'); ck('button says Apply to document', /Apply to document/.test(lab), lab);
    await fr.evaluate(() => { for (const id of ['pw1', 'pw2']) { const i = document.getElementById(id); i.value = 'Desk-Test-123'; i.dispatchEvent(new Event('input', { bubbles: true })); } }); await fr.waitForFunction(() => !document.getElementById('go').disabled, null, { timeout: 60000 }); await fr.evaluate(() => document.getElementById('go').click());
    await w.waitForFunction(() => document.querySelector('#rpw'), null, { timeout: 60000 });
    ck('protected result asks for its password when reopened', true);
    await w.evaluate(() => { document.querySelector('#rpw').value = 'Desk-Test-123'; [...document.querySelectorAll('#rdlg button')].find(b => b.value === 'ok').click(); });
    await w.waitForFunction(() => __reader.T && __reader.T.dirty === true, null, { timeout: 30000 });
    ck('qpdf in worker applied protection, tab unsaved', true);
    const ok = await w.evaluate(() => __reader.saveDoc(__reader.T, false)); await sleep(800);
    ck('Ctrl+S saved over the original file', ok && h(F) !== before);
    const enc = fs.readFileSync(F).toString('latin1'); ck('saved file is the protected PDF', /\/Encrypt/.test(enc));
    ck('no temp file left behind', !fs.readdirSync(D).some(x => x.endsWith('.tmp')));
  }
  // Save As (native dialog answered by the test)
  await ea.evaluate(({ dialog }, p) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: p }); }, path.join(D, 'saved-as'));
  const r = await w.evaluate(() => __reader.saveDoc(__reader.T, true)); await sleep(600);
  ck('Save As writes a new PDF and adds .pdf', r && fs.existsSync(path.join(D, 'saved-as.pdf')) && /\/Encrypt/.test(fs.readFileSync(path.join(D, 'saved-as.pdf')).toString('latin1')));
  ck('tab now named after the new file', await w.evaluate(() => __reader.T.name) === 'saved-as.pdf');
  await ea.evaluate(({ app }, p) => app.emit('second-instance', {}, ['Dilia PDF.exe', p]), path.join(D, 'ten.pdf'));
  await w.waitForFunction(() => __reader.tabs.some(t => t.name === 'ten.pdf'), null, { timeout: 10000 }); ck('second double-click opens in the same window', true);
  ck('recent file reopens by id', await w.evaluate(id => diliaDesktop.reopen(id), tid) === true);
  ck('reopen refused for unknown id', await w.evaluate(() => diliaDesktop.reopen('zzzz')) === false);
  await ea.evaluate(({ dialog }, p) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] }); }, path.join(D, 'drop.pdf'));
  await w.evaluate(() => document.querySelector('#rOpen').click());
  await w.waitForFunction(() => __reader.tabs.some(t => t.name === 'drop.pdf'), null, { timeout: 10000 }); ck('Open button uses the Windows dialog', true);
  await sleep(1000); await w.screenshot({ path: process.env.DILIA_SHOT || path.join(D, 'desktop.png') });
  await w.evaluate(() => { __reader.T.dirty = true; });
  await ea.evaluate(({ dialog }) => { globalThis.__asked = 0; dialog.showMessageBoxSync = () => { globalThis.__asked++; return 1; }; });
  await ea.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close()); await sleep(1200);
  ck('unsaved changes: asks, Cancel keeps the window', await ea.evaluate(() => globalThis.__asked) >= 1 && await ea.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length) === 1);
  const real = errs.filter(e => !/example\.com|status of 404/.test(e)); ck('no console or CSP errors (except the deliberate blocked tests)', !real.length, real.slice(0, 5));
  await ea.evaluate(({ dialog }) => { dialog.showMessageBoxSync = () => 0; });
  await Promise.race([ea.close().catch(() => {}), sleep(5000)]);
  try { ea.process().kill('SIGKILL'); } catch (e) {}
  const net = (fs.readFileSync(NET, 'utf8').match(/https?:\/\/[^"\s]+/g) || []).filter(u => !/example\.com/.test(u));
  ck('no network requests from the app (net log)', !net.length, [...new Set(net)].slice(0, 5));
  console.log('FAILS', fails); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('CRASH', e.message); console.log('ERRS', JSON.stringify(errs.slice(0, 8))); console.log('FAILS', fails); process.exit(2); });
