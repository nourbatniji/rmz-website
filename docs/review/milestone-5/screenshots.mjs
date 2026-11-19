import puppeteer from 'puppeteer-core';
const OUT = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
for (const [name, vp, m] of [['desktop-1440x900', { width: 1440, height: 900 }, false], ['desktop-short-1440x700', { width: 1440, height: 700 }, false], ['mobile-390', { width: 390, height: 844, isMobile: true, hasTouch: true }, true]]) {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(800);
  const g = await p.evaluate((m) => { const t = document.querySelector(m ? '[data-m-track]' : '[data-d-track]').getBoundingClientRect(); return { top: t.top + scrollY, h: t.height, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }; }, m);
  const R = m ? 2500 : 1600;
  for (const [tag, y] of [['1-approach', g.top - g.hh - 250], ['2-start', g.top - g.hh], ['3-midway', g.top - g.hh + R * 0.5], ['4-final', g.top - g.hh + R], ['5-exit', g.top + g.h - vp.height + 260]]) {
    await p.evaluate((y) => scrollTo(0, y), y); await sleep(1700); await p.screenshot({ path: `${OUT}/${name}-${tag}.png` });
  }
  await p.close();
}
await b.close();
