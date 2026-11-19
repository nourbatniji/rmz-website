import puppeteer from 'puppeteer-core';
// usage: node b1rec.mjs <outdir>  — Banner 1 (25 frames): screenshots + scroll recordings, desktop and mobile
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
for (const [name, vp] of [['desktop-1440x900', { width: 1440, height: 900 }], ['mobile-390x844', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(1500);
  await p.click('button[aria-label$="automatic banner changes"]');
  const go = async (y, ms) => { const from = await p.evaluate(() => scrollY); const n = Math.max(1, Math.round(ms / 33)); for (let i = 1; i <= n; i++) { await p.evaluate((v) => scrollTo(0, v), from + (y - from) * (i / n)); await sleep(33); } };
  await p.evaluate(() => scrollTo(0, 0)); await sleep(500); await p.screenshot({ path: `${out}/banner1-${name}-frame-01.png` });
  const mob = name.startsWith('mobile'); await go(mob ? 360 : 720, 600); await sleep(500); await p.screenshot({ path: `${out}/banner1-${name}-${mob ? 'mid-scroll' : 'frame-25'}.png` }); await go(0, 600); await sleep(300);
  const rec = await p.screencast({ path: `${out}/banner1-${name}.mp4`, fps: 15 });
  await sleep(700); await go(360, 3000); await sleep(1500);   // slow scroll, pause mid-way
  await go(720, 2400); await sleep(700);                       // last frame
  await go(300, 2400); await sleep(1200);                      // reverse, pause
  await go(0, 1800); await sleep(500);                         // back to frame 01
  await go(vp.height + 60, 1500); await sleep(700);            // on to the next section
  await go(0, 1500); await sleep(500);
  await rec.stop(); await p.close();
}
await b.close();
