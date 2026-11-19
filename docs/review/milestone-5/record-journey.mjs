import puppeteer from 'puppeteer-core';
const [url, out, mode] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
const m = mode === 'm'; const p = await b.newPage();
await p.setViewport(m ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
await p.goto(url, { waitUntil: 'networkidle0' }); await sleep(600);
const g = await p.evaluate((m) => { const t = document.querySelector(m ? '[data-m-track]' : '[data-d-track]').getBoundingClientRect(); return { top: t.top + scrollY, h: t.height, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }; }, m);
const rec = await p.screencast({ path: out, fps: 12 });
const smooth = async (to, ms) => { const from = await p.evaluate(() => scrollY); const n = Math.round(ms / 40); for (let i = 1; i <= n; i++) { await p.evaluate((y) => scrollTo(0, y), from + (to - from) * (i / n)); await sleep(40); } };
const R = m ? 2500 : 1600;
await sleep(700);
await smooth(g.top - g.hh - 300, 1800); await sleep(500);          // approach from the hero
await smooth(g.top - g.hh + R * 0.5, 4500); await sleep(700);      // walk forward
await smooth(g.top - g.hh + R, 3500); await sleep(2200);            // final state
await smooth(g.top + g.h - (m ? 844 : 900) + 300, 2200); await sleep(1200); // exit into Statement
await smooth(g.top - g.hh + R, 2200); await sleep(600);           // reverse: back into the final state
await smooth(g.top - g.hh + R * 0.4, 4500); await sleep(600);      // walk backward
await smooth(g.top - g.hh - 300, 3500); await sleep(1200);         // back out to the hero
await rec.stop(); await b.close();
