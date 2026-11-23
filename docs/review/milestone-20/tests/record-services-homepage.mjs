import puppeteer from 'puppeteer-core';
// usage: node record-services-homepage.mjs <outdir> — the real homepage: enter Services from the preceding section, step through two services, direct-select, reverse, leave into Minds. Real wheel input.
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(900); await p.mouse.move(720, 560);
const wheel = async (total, per = 30, gap = 22) => { for (let d = 0; d < Math.abs(total); d += per) { await p.mouse.wheel({ deltaY: Math.sign(total) * per }); await sleep(gap); } };
const g = await p.evaluate(() => { const t = document.querySelector('#services .orb-track'), s = document.querySelector('#services .orb-stage'); return { top: t.getBoundingClientRect().top + scrollY, extra: t.offsetHeight - s.offsetHeight, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }; });
const Q = 0.6 + 6 * (0.36 * 2 + 0.62 + 0.6); const px = g.extra / Q;
await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g.top - g.hh - 900); await sleep(700);
const rec = await p.screencast({ path: `${out}/services-homepage-entry-interaction-exit.mp4`, fps: 20 }); await sleep(600);
await wheel(900 + 40, 40, 24); await sleep(1400); // enter from the preceding section: the scene seats under the header
await wheel(px * 0.6, 30, 24); await sleep(700); // hold on service 1
await wheel(px * (0.36 + 0.62 + 0.36), 30, 24); await sleep(900); // service 2
await wheel(px * 0.6, 30, 24); await sleep(900);
await wheel(-px * 1.4, 30, 24); await sleep(900); // reverse
const labs = await p.$$('#services button[data-orb-label]'); await labs[5].click(); await sleep(3300); // direct selection
await wheel(px * 6.2, 90, 20); await sleep(1500); // run on to the end and out
await wheel(900, 60, 24); await sleep(1500); // leave: Minds follows
await rec.stop(); await b.close();
