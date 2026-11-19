import puppeteer from 'puppeteer-core';
const OUT = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [name, vp, A, REV] of [['desktop-1440x900', { width: 1440, height: 900 }, 1600, 450], ['desktop-short-1440x700', { width: 1440, height: 700 }, 1600, 450], ['mobile-390x844', { width: 390, height: 844, isMobile: true, hasTouch: true }, 2500, 400]]) {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(900);
  const g = await p.evaluate(() => ({ top: document.querySelector('[data-track]').getBoundingClientRect().top + scrollY, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }));
  const base = g.top - g.hh, HOLD = 450;
  for (const [tag, off] of [['1-corridor-start', 0], ['2-approach-mid', A * 0.5], ['3-approach-late', A * 0.85], ['4-video-final-size-text-hidden', A], ['5-reveal-in-progress', A + REV * 0.3], ['6-arrival-complete', A + REV + HOLD * 0.5], ['7-release-into-statement', A + REV + HOLD + 520]]) {
    await p.evaluate((y) => scrollTo(0, y), base + off); await sleep(2000); await p.screenshot({ path: `${OUT}/${name}-${tag}.png` });
  }
  await p.close();
}
await b.close();
