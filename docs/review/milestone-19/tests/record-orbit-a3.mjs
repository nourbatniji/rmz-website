import puppeteer from 'puppeteer-core';
// usage: node record-orbit-a3.mjs <outdir> — variant A: title rises, grows and turns bold, holds, returns to the ring; then reverse. Real wheel input.
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto('http://localhost:3111/lab/orbital-services?v=A', { waitUntil: 'networkidle0' }); await sleep(800); await p.mouse.move(720, 560);
const wheel = async (total, per = 20, gap = 26) => { for (let d = 0; d < Math.abs(total); d += per) { await p.mouse.wheel({ deltaY: Math.sign(total) * per }); await sleep(gap); } };
const g = await p.evaluate(() => { const t = document.querySelector('.orb-track'), s = document.querySelector('.orb-stage'); return { top: t.getBoundingClientRect().top + scrollY, extra: t.offsetHeight - s.offsetHeight }; });
const px = g.extra / 10.8; // px per timeline unit
await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g.top - 92 + px * 0.2); await sleep(600);
const rec = await p.screencast({ path: `${out}/orbit-A-title-rise-bold-return.mp4`, fps: 20 }); await sleep(900);
await wheel(px * 0.5); await sleep(1100); // end of hold 1 → return begins
await wheel(px * 0.3); await sleep(500); // return: the bold title shrinks back onto the ring
await wheel(px * 0.5); await sleep(700); // orbit travel
await wheel(px * 0.3); await sleep(700); // rise: title lifts, straightens, grows, turns bold
await wheel(px * 0.6); await sleep(1300); // hold on service 2
await wheel(-px * 0.6); await sleep(500); await wheel(-px * 0.3); await sleep(500); // reverse: rise retraced
await wheel(-px * 0.5); await sleep(700); await wheel(-px * 0.3); await sleep(1400); // …back to service 1 lifted
await rec.stop(); await b.close();
