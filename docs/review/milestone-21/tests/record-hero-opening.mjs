import puppeteer from 'puppeteer-core';
// usage: node record-hero-opening.mjs <outdir> — first entry: opening → text reveal → (auto countdown) normal banner transition. Real-time, unscrubbed.
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
await p.goto('about:blank');
const rec = await p.screencast({ path: `${out}/hero-opening.mp4`, fps: 30 });
await p.goto('http://localhost:3111/lab/hero-three-worlds', { waitUntil: 'domcontentloaded' });
await sleep(1800); await p.mouse.move(700, 500); for (let i = 0; i < 8; i++) { await p.mouse.wheel({ deltaY: 25 }); await sleep(60); } await sleep(700); // first scroll continues from the held frame
for (let i = 0; i < 8; i++) { await p.mouse.wheel({ deltaY: -25 }); await sleep(60); } await sleep(900);
await sleep(5200); await sleep(2800); // countdown (5 s after the opening) → the normal prism transition
await rec.stop(); await b.close();
