import puppeteer from 'puppeteer-core';
// usage: node record-orbit-a2.mjs <outdir> — variant A refined: three services (two full transitions) with holds, then reverse. Real wheel input.
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto('http://localhost:3111/lab/orbital-services?v=A', { waitUntil: 'networkidle0' }); await sleep(800); await p.mouse.move(720, 520);
const wheel = async (total, per = 30, gap = 22) => { for (let d = 0; d < Math.abs(total); d += per) { await p.mouse.wheel({ deltaY: Math.sign(total) * per }); await sleep(gap); } };
const g = await p.evaluate(() => { const t = document.querySelector('.orb-track'), s = document.querySelector('.orb-stage'); return { top: t.getBoundingClientRect().top + scrollY, extra: t.offsetHeight - s.offsetHeight }; });
await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g.top - 92 - 260); await sleep(500);
const rec = await p.screencast({ path: `${out}/orbit-A-refined.mp4`, fps: 20 }); await sleep(500);
const px = g.extra / 10.8; // px per timeline unit
await wheel(260 + 20); await sleep(1500); // arrives, service 1 selected + lifted (hold)
await wheel(px * 0.25); await sleep(900); // still inside the hold
await wheel(px * (0.1 + 0.3 + 0.5 + 0.3), 24, 26); await sleep(1500); // return → travel → rise : service 2
await wheel(px * 0.5, 24, 26); await sleep(1200); // hold on service 2
await wheel(px * (0.1 + 0.3 + 0.5 + 0.3), 24, 26); await sleep(1500); // service 3
await wheel(px * 0.5, 24, 26); await sleep(1200);
await wheel(-px * 1.0, 24, 26); await sleep(1300); // reverse: service 3 returns, orbit turns back
await wheel(-px * 1.6, 24, 26); await sleep(1600); // back to service 2 / 1
await rec.stop(); await b.close();
