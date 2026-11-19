import puppeteer from 'puppeteer-core';
const [url, out, mode] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const m = mode === 'm'; const p = await b.newPage();
await p.setViewport(m ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
await p.goto(url, { waitUntil: 'networkidle0' }); await sleep(600);
const g = await p.evaluate((m) => { const t = document.querySelector(m ? '[data-m-track]' : '[data-d-track]').getBoundingClientRect(); return { top: t.top + scrollY, h: t.height, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }; }, m);
const A = m ? 2500 : 1600, REV = m ? 400 : 450, HOLD = 450, base = g.top - g.hh;
const rec = await p.screencast({ path: out, fps: 12 });
const smooth = async (to, ms) => { const from = await p.evaluate(() => scrollY); const n = Math.round(ms / 40); for (let i = 1; i <= n; i++) { await p.evaluate((y) => scrollTo(0, y), from + (to - from) * (i / n)); await sleep(40); } };
await sleep(600);
await smooth(base - 200, 1500);                 // arrive from the hero
await smooth(base + A, 5500); await sleep(900); // approach → video at final size
await smooth(base + A + REV, 2600); await sleep(1500); // text reveal
await smooth(base + A + REV + HOLD, 1200); await sleep(1500); // hold
await smooth(base + A + REV + HOLD + 700, 1800); await sleep(800); // release → Statement
await smooth(base + A + REV + HOLD * 0.5, 1800); await sleep(500); // reverse: back into the hold
await smooth(base + A, 2600); await sleep(900); // reverse through the reveal (text hides)
await smooth(base + A * 0.5, 3000); await sleep(600); // back through the corridor
await smooth(base - 200, 2500); await sleep(800);
await rec.stop(); await b.close();
