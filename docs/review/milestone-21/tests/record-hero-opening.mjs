import puppeteer from 'puppeteer-core';
// usage: node record-hero-opening.mjs <outdir> — first entry: opening → text reveal → (auto countdown) normal banner transition. Also writes mid-opening stills.
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
await p.goto('about:blank');
const rec = await p.screencast({ path: `${out}/hero-opening.mp4`, fps: 30 });
await p.goto('http://localhost:3111/lab/hero-three-worlds', { waitUntil: 'domcontentloaded' });
const t0 = Date.now(); const shots = [250, 500, 800, 1100, 1500, 2100]; let i = 0;
while (i < shots.length) { if (Date.now() - t0 >= shots[i]) { await p.screenshot({ path: `${out}/opening-still-${i + 1}.png` }); i++; } else await sleep(15); }
await sleep(7600); // the automatic countdown (5 s after the opening) turns the prism to the next banner: normal transition + new phrase
await sleep(2800);
await rec.stop(); await b.close();
