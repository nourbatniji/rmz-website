import puppeteer from 'puppeteer-core';
// usage: node record-hero-worlds.mjs <outdir> — synchronized text/prism transitions + scroll-driven frames (real wheel input).
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto('http://localhost:3111/lab/hero-three-worlds', { waitUntil: 'networkidle0' }); await sleep(800); await p.mouse.move(900, 500);
const wheel = async (t, per = 20, gap = 22) => { for (let d = 0; d < Math.abs(t); d += per) { await p.mouse.wheel({ deltaY: Math.sign(t) * per }); await sleep(gap); } };
const pick = (n) => p.evaluate((n) => [...document.querySelectorAll('[aria-label="Banners"] button')].find((x) => x.textContent.trim().toLowerCase() === n).click(), n);
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Pause automatic/.test(x.ariaLabel || ''))?.click());
const rec = await p.screencast({ path: `${out}/hero-three-worlds-sync.mp4`, fps: 24 }); await sleep(900);
await wheel(300); await sleep(500); await wheel(-300); await sleep(500); // frames move; the phrase does not
await pick('campaign'); await sleep(2600);                                // identity → campaign (prism + text)
await wheel(260); await sleep(500); await wheel(-260); await sleep(400);
await pick('digital'); await sleep(2600);                                 // campaign → digital
await pick('identity'); await sleep(2600);                                // digital → identity (shortest way round)
await pick('campaign'); await sleep(250); await pick('digital'); await sleep(2800); // rapid selections
await rec.stop(); await b.close();
