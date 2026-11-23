import puppeteer from 'puppeteer-core';
// usage: node record-orbit-a6.mjs <outdir> — slower, smoother variant A: forward through two transitions, then reverse. Real wheel input (100 px notches).
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto('http://localhost:3111/lab/orbital-services?v=A', { waitUntil: 'networkidle0' }); await sleep(800); await p.mouse.move(720, 560);
const wheel = async (total, per = 25, gap = 24) => { for (let d = 0; d < Math.abs(total); d += per) { await p.mouse.wheel({ deltaY: Math.sign(total) * per }); await sleep(gap); } };
const Q = 0.6 + 6 * (0.36 * 2 + 0.62 + 0.6);
const g = await p.evaluate(() => { const t = document.querySelector('.orb-track'), s = document.querySelector('.orb-stage'); return { top: t.getBoundingClientRect().top + scrollY, extra: t.offsetHeight - s.offsetHeight }; });
const px = g.extra / Q;
await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g.top - 92 + px * 0.25); await sleep(600);
const rec = await p.screencast({ path: `${out}/orbit-A-slower-smoother.mp4`, fps: 20 }); await sleep(800);
await wheel(px * (0.35 + 0.36)); await sleep(500); // end of hold 1, label returns to the ring
await wheel(px * 0.62); await sleep(500); // orbit travel
await wheel(px * 0.36); await sleep(900); // title rises, straightens, grows, bold
await wheel(px * 0.6); await sleep(1100); // hold on service 2
await wheel(px * (0.36 + 0.62 + 0.36)); await sleep(900); // service 3
await wheel(px * 0.6); await sleep(1000);
await wheel(-px * 1.8); await sleep(900); // reverse: service 3 returns, orbit turns back
await wheel(-px * 1.4); await sleep(1500); // back to service 2 / 1
await rec.stop(); await b.close();
