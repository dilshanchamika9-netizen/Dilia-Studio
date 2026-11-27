// Store screenshots of the real app window on Windows: starts the app with a debug port, drives it, and captures the screen area of the
// window (title bar included) with PowerShell. Usage: node test/store-shots.js <electron.exe> <outDir> <appDir>
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs'); const { spawn, spawnSync } = require('child_process');
const exe = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]), appDir = path.resolve(process.argv[4]), S = path.join(__dirname, 'store-shots'); fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ps = c => spawnSync('powershell', ['-NoProfile', '-Command', c], { encoding: 'utf8' });
const grab = (b, file) => { const r = ps(`Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap ${b.width},${b.height}; $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen(${b.left},${b.top},0,0,$bmp.Size); $bmp.Save('${file}', [System.Drawing.Imaging.ImageFormat]::Png)`); if (r.status) console.log('grab failed', r.stderr); };
(async () => {
  const sc = ps('Add-Type -AssemblyName System.Windows.Forms; $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; "$($b.Width)x$($b.Height)"').stdout.trim(); console.log('screen', sc);
  const [SW, SH] = sc.split('x').map(Number);
  const child = spawn(exe, [appDir, '--remote-debugging-port=9333'], { stdio: 'ignore' });
  let br; for (let i = 0; i < 40 && !br; i++) { await sleep(1000); try { br = await chromium.connectOverCDP('http://127.0.0.1:9333'); } catch (e) {} }
  if (!br) throw new Error('could not connect');
  const page = br.contexts()[0].pages()[0]; const cdp = await br.contexts()[0].newCDPSession(page);
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  const W = Math.min(1920, SW), H = Math.min(1080, SH - 48);
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } }); await sleep(500);
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: W, height: H } }); await sleep(1500);
  await page.bringToFront();
  const go = async (p, files) => { await page.evaluate(u => { location.href = u; }, 'dilia://app/' + p + '/'); await page.waitForLoadState('load').catch(() => {}); await sleep(1500);
    const i = await page.$('input[type=file]'); if (i) await i.setInputFiles(files.map(f => path.join(S, f))); await sleep(3500); };
  const shot = async name => { await sleep(500); const { bounds } = await cdp.send('Browser.getWindowBounds', { windowId }); grab(bounds, path.join(out, name + '.png')); console.log(name, JSON.stringify(bounds)); };
  const R = 'Annual Report 2026.pdf', I = 'Invoice 2026-0418.pdf', B = 'Summer Brochure.pdf';
  await go('pdf-reader', [R]); await shot('1-read');
  await go('edit-pdf', [R]); await shot('2-edit');
  await go('merge-pdf', [R, I, B]); await shot('3-merge');
  await go('reorder-pdf-pages', [R]); await shot('4-reorder');
  await go('pdf-to-jpg', [B]); await shot('5-images');
  await go('watermark-pdf', [I]); await shot('6-watermark');
  child.kill(); process.exit(0);
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
