// Store screenshots of the REAL packaged app on Windows: launches the built exe, loads sample PDFs, and captures the screen
// area of the app window (title bar included) with PowerShell. Usage: node test/store-shots.js <exe> <outDir>
const { _electron } = require('playwright-core'); const path = require('path'); const fs = require('fs'); const { spawnSync } = require('child_process');
const exe = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]), appDir = process.argv[4] ? path.resolve(process.argv[4]) : null, S = path.join(__dirname, 'store-shots'); fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const grab = (b, file) => {
  const ps = `Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap ${b.width},${b.height}; $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen(${b.x},${b.y},0,0,$bmp.Size); $bmp.Save('${file}', [System.Drawing.Imaging.ImageFormat]::Png)`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }); if (r.status) console.log('grab failed', r.stderr);
};
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: appDir ? [appDir] : [], timeout: 90000 });
  const scr = await app.evaluate(({ screen }) => screen.getPrimaryDisplay().bounds); console.log('screen', JSON.stringify(scr));
  const W = Math.min(1920, scr.width), H = Math.min(1080, scr.height - 40);
  await app.evaluate(({ BrowserWindow }, [W, H]) => { const w = BrowserWindow.getAllWindows()[0]; w.unmaximize(); w.setBounds({ x: 0, y: 0, width: W, height: H }); w.focus(); }, [W, H]);
  const win = await app.firstWindow(); await sleep(2500);
  const go = async (p, files, wait = 3500) => { await win.evaluate(u => { location.href = u; }, 'dilia://app/' + p + '/'); await win.waitForLoadState('load').catch(() => {}); await sleep(1500);
    if (files) { const i = await win.$('input[type=file]'); if (i) await i.setInputFiles(files.map(f => path.join(S, f))); await sleep(wait); } };
  const shot = async name => { await sleep(500); const b = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds()); grab(b, path.join(out, name + '.png')); console.log(name, JSON.stringify(b)); };
  const R = 'Annual Report 2026.pdf', I = 'Invoice 2026-0418.pdf', B = 'Summer Brochure.pdf';
  await go('pdf-reader', [R]); await shot('1-read');
  await go('edit-pdf', [R]); await shot('2-edit');
  await go('merge-pdf', [R, I, B]); await shot('3-merge');
  await go('reorder-pdf-pages', [R]); await shot('4-reorder');
  await go('pdf-to-jpg', [B]); await shot('5-images');
  await go('watermark-pdf', [I]); await shot('6-watermark');
  await app.close();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
