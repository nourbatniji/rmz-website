import puppeteer from 'puppeteer-core';
// usage: node record-collab.mjs <outdir> — one real-time capture per direction (headless Chrome): A: two swaps; B: the entrance and rest + a hover tip; C: hover exchange + keyboard focus.
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const w0 = await b.newPage(); await w0.goto('http://localhost:3111/lab/collaborations', { waitUntil: 'networkidle0' }); await w0.close();
const go = async (v, vp, fn, name, scroll = true) => {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto(`http://localhost:3111/lab/collaborations?v=${v}`, { waitUntil: 'networkidle0' }); await sleep(500);
  if (scroll) await p.evaluate(() => document.getElementById('collab-proto').scrollIntoView({ behavior: 'instant' }));
  const rec = await p.screencast({ path: `${out}/${name}.mp4`, fps: 24 }); await sleep(300); await fn(p); await rec.stop(); await p.close();
};
await go('A', { width: 1440, height: 760 }, async () => { await sleep(11500); }, 'collab-A-switchboard');
await go('B', { width: 1440, height: 520 }, async (p) => { await sleep(500); await p.evaluate(() => document.getElementById('collab-proto').scrollIntoView({ behavior: 'instant' })); await sleep(3000); await p.evaluate(() => document.querySelectorAll('.cb-tw-pos')[5].scrollIntoView({ block: 'center', behavior: 'instant' })); await p.hover('.cb-tw-pos:nth-child(6)'); await sleep(1200); await p.mouse.move(4, 4); await sleep(700); }, 'collab-B-turning-wall', false);
await go('C', { width: 1440, height: 760 }, async (p) => { await p.hover('.cb-ex-li:nth-child(3) .cb-ex-cell'); await sleep(1400); await p.hover('.cb-ex-li:nth-child(6) .cb-ex-cell'); await sleep(1400); await p.mouse.move(4, 4); await sleep(900); await p.keyboard.press('Tab'); await sleep(1200); }, 'collab-C-typographic-exchange');
await b.close();
