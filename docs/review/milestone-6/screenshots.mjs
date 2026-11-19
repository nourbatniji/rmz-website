import puppeteer from 'puppeteer-core';
const OUT = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
for (const [name, vp, m] of [['desktop-1440x900', { width: 1440, height: 900 }, false], ['desktop-short-1440x700', { width: 1440, height: 700 }, false], ['mobile-390x844', { width: 390, height: 844, isMobile: true, hasTouch: true }, true]]) {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(800);
  const g = await p.evaluate((m) => { const t = document.querySelector(m ? '[data-m-track]' : '[data-d-track]').getBoundingClientRect(); return { top: t.top + scrollY, h: t.height, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }; }, m);
  const A = m ? 2500 : 1600, REV = m ? 400 : 450, HOLD = 450, base = g.top - g.hh;
  for (const [tag, off] of [['1-corridor-approach', A * 0.55], ['2-video-final-size-text-hidden', A], ['3-reveal-in-progress', A + REV * 0.3], ['4-arrival-complete', A + REV + HOLD * 0.5], ['5-release-into-statement', A + REV + HOLD + 520]]) {
    await p.evaluate((y) => scrollTo(0, y), base + off); await sleep(1800); await p.screenshot({ path: `${OUT}/${name}-${tag}.png` });
  }
  await p.close();
}
await b.close();
