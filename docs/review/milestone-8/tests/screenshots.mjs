import puppeteer from 'puppeteer-core';
const OUT = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const toSection = async (p, offset) => { await p.evaluate((o) => { const r = document.querySelector('#services').getBoundingClientRect(); scrollTo(0, scrollY + r.top - o); }, offset); await sleep(700); };
for (const [name, vp, mob] of [['desktop-1440x900', { width: 1440, height: 900 }, false], ['desktop-1280x720', { width: 1280, height: 720 }, false], ['mobile-390x844', { width: 390, height: 844, isMobile: true, hasTouch: true }, true]]) {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(900);
  const pick = async (i) => { await p.evaluate((i) => document.querySelectorAll('[data-row]')[i].click(), i); };
  if (!mob) {
    await toSection(p, 92);
    await p.screenshot({ path: `${OUT}/${name}-1-default-content-production.png` });
    await pick(0); await sleep(1900); await p.screenshot({ path: `${OUT}/${name}-2-branding.png` });
    await pick(3); await sleep(220); await p.screenshot({ path: `${OUT}/${name}-3-iris-closing.png` }); await sleep(1800);
    await p.screenshot({ path: `${OUT}/${name}-4-social-media.png` });
    await pick(6); await sleep(2300); await p.screenshot({ path: `${OUT}/${name}-5-web-experiences.png` });
    await pick(5); await sleep(2300); await p.screenshot({ path: `${OUT}/${name}-6-paid-media.png` });
  } else {
    await toSection(p, 0); await p.screenshot({ path: `${OUT}/${name}-1-lens-default.png` });
    await p.evaluate(() => scrollBy(0, 560)); await sleep(500); await p.screenshot({ path: `${OUT}/${name}-2-accordion.png` });
    await pick(6); await sleep(2200); await toSection(p, 0); await p.screenshot({ path: `${OUT}/${name}-3-web-experiences.png` });
    await p.evaluate(() => scrollBy(0, 560)); await sleep(500); await p.screenshot({ path: `${OUT}/${name}-4-accordion-web.png` });
  }
  await p.close();
}
await b.close();
