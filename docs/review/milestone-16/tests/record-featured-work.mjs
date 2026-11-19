import puppeteer from 'puppeteer-core';
// usage: node fwrec.mjs <outdir> — FeaturedWorkFocus screenshots (front, midpoint, back) + forward/reverse scroll recordings, desktop and mobile
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
for (const [name, vp] of [['desktop-1440x900', { width: 1440, height: 900 }], ['mobile-390x844', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(1200);
  const g = await p.evaluate(() => { const t = document.querySelector('.fw-track'); const st = document.querySelector('.fw-stage'); return { top: t.getBoundingClientRect().top + scrollY, h: t.offsetHeight, sh: st.offsetHeight, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }; });
  const px = (g.h - g.sh) / 11; const y = (s) => g.top - g.hh + s * px;
  for (const [tag, s] of [['1-front', 0], ['2-midpoint', 0.45], ['3-back', 1], ['4-next-front-sliding', 1.6]]) { await p.evaluate((v) => scrollTo(0, v), y(s)); await sleep(900); await p.screenshot({ path: `${out}/fw-${name}-${tag}.png` }); }
  const go = async (to, ms) => { const from = await p.evaluate(() => scrollY); const n = Math.max(1, Math.round(ms / 33)); for (let i = 1; i <= n; i++) { await p.evaluate((v) => scrollTo(0, v), from + (to - from) * (i / n)); await sleep(33); } };
  await p.evaluate((v) => scrollTo(0, v), y(-0.8)); await sleep(700);
  const rec = await p.screencast({ path: `${out}/fw-${name}.mp4`, fps: 15 });
  await sleep(600); await go(y(0), 1200); await sleep(500);
  await go(y(2.5), 6000); await sleep(1200);        // forward: card 1 turns, wall moves on, card 2 turns …
  await go(y(1.2), 3000); await sleep(1000);        // reverse a little, hold
  await go(y(6), 6000); await sleep(800);
  await go(y(11), 5000); await sleep(1000);         // to the end
  await go(y(5), 6000); await sleep(800);           // reverse
  await go(y(0), 6000); await sleep(800);           // all the way back to the front of card 1
  await rec.stop(); await p.close();
}
await b.close();
