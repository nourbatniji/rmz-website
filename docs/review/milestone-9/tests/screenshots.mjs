import puppeteer from 'puppeteer-core';
const OUT = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
for (const [name, vp, mob] of [['desktop-1440x900', { width: 1440, height: 900 }, false], ['desktop-1920x1080', { width: 1920, height: 1080 }, false], ['mobile-390x844', { width: 390, height: 844, isMobile: true, hasTouch: true }, true]]) {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(900);
  const at = async (fn) => { await p.evaluate(fn); await sleep(800); };
  // junction with the lens + the top of the columns
  await at(() => { const r = document.querySelector('#minds').getBoundingClientRect(); scrollTo(0, scrollY + r.top - innerHeight * 0.45); });
  await p.screenshot({ path: `${OUT}/${name}-1-junction-lens-to-minds.png` });
  // the full columns, then the bottom edge with the next section starting immediately
  await at(() => { const r = document.querySelector('#minds').getBoundingClientRect(); scrollTo(0, scrollY + r.top - 92); });
  await p.screenshot({ path: `${OUT}/${name}-2-minds-columns.png` });
  await at(() => { const r = document.querySelector('#minds').getBoundingClientRect(); scrollTo(0, scrollY + r.bottom - innerHeight * 0.7); });
  await p.screenshot({ path: `${OUT}/${name}-3-bottom-edge-next-section.png` });
  if (!mob) { await p.evaluate(() => document.querySelectorAll('#minds .mind-cover')[6].click()); await sleep(1200); await at(() => { const r = document.querySelector('#minds').getBoundingClientRect(); scrollTo(0, scrollY + r.top - 92); }); await p.screenshot({ path: `${OUT}/${name}-4-last-column-open.png` }); }
  else { await p.evaluate(() => document.querySelectorAll('#minds .mind-cover')[7].click()); await sleep(1200); await at(() => { const r = document.querySelector('#minds').getBoundingClientRect(); scrollTo(0, scrollY + r.bottom - innerHeight * 0.8); }); await p.screenshot({ path: `${OUT}/${name}-4-last-open-bottom-edge.png` }); }
  await p.close();
}
await b.close();
