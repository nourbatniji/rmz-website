import puppeteer from 'puppeteer-core';
// usage: node record-work-activation.mjs <outdir> — scripted recording (real CDP wheel input): approach → aligned → card navigation → natural exit
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(1200);
const a0 = () => p.evaluate(() => { const t = document.querySelector('.wk-track').getBoundingClientRect().top + scrollY; return t - 92; });
const hit = () => p.evaluate(() => { const f = document.querySelector('.wk-bs[tabindex="0"]').getBoundingClientRect(); return { x: f.left + f.width / 2, y: f.top + f.height / 2 }; });
const cnt = () => p.evaluate(() => document.querySelector('.wk-ctl .wk-nm').textContent.trim());
async function wheel(x, y, d, n, k = 1, gap = 16) { await p.mouse.move(x, y); let v = d; for (let i = 0; i < n; i++) { await p.mouse.wheel({ deltaY: v }); v *= k; await sleep(gap); } }
await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), (await a0()) - 1500); await sleep(600);
const rec = await p.screencast({ path: `${out}/work-activation-1440x900.mp4`, fps: 20 });
await sleep(700);
// 1 approach from above: pointer parked mid-screen, ordinary wheel scrolling moves the page (Minds above, card cut off below) — nothing steps.
//   Positions are measured live (content above settles after load), never assumed.
const pinTop = () => p.evaluate(() => document.querySelector('.wk-pin').getBoundingClientRect().top);
while ((await pinTop()) > 92 + 330) await wheel(720, 520, 50, 1, 1, 30);
await sleep(700);
await p.screenshot({ path: `${out}/work-activation-1-approach-not-yet-active.png` });
await wheel(720, 520, 50, 8, 1, 30); await sleep(600);            // still approaching: stage is low, cards inert, page keeps moving
// 2 momentum into place: a decaying (trackpad-like) stream calibrated to come to rest ~25 px into the aligned zone
{ const D = (await pinTop()) - 92 + 25, N = 50, k = 0.95; await wheel(720, 520, (D * (1 - k)) / (1 - Math.pow(k, N)), N, k, 16); }
await sleep(1200);
await p.screenshot({ path: `${out}/work-activation-2-aligned.png` });
console.log('aligned after approach: pin top', await pinTop(), '| counter', await cnt());
// 3 card navigation: one project per gesture, page stays put
let h = await hit();
for (let i = 0; i < 3; i++) { await wheel(h.x, h.y, 60, 2); await sleep(1300); h = await hit(); }
await p.screenshot({ path: `${out}/work-activation-3-after-3-steps.png` });
for (let i = 0; i < 2; i++) { await wheel(h.x, h.y, -60, 2); await sleep(1300); h = await hit(); }
// 4 pointer outside the cards (heading band) → the page scrolls
await wheel(720, 130, 60, 3); await sleep(800); await wheel(720, 130, -60, 3); await sleep(800);
// 5 natural exit at the last card: go to the end, then keep scrolling down
await p.evaluate((y) => scrollTo({ top: y + 40, behavior: 'instant' }), await a0()); await sleep(500); h = await hit();
for (let i = 0; i < 12 && (await cnt()).split(' / ')[0] !== (await cnt()).split(' / ')[1]; i++) { await wheel(h.x, h.y, 60, 2); await sleep(1100); h = await hit(); }
await sleep(500);
const before = await p.evaluate(() => scrollY);
await wheel(h.x, h.y, 70, 50, 1, 25); await sleep(1500);
const after = await p.evaluate(() => scrollY);
console.log('last card reached:', await cnt(), '| page moved on exit:', before, '→', after);
await p.screenshot({ path: `${out}/work-activation-4-exited-down.png` });
// 6 entry from below, upward
await wheel(h.x, 520, -70, 90, 1, 25); await sleep(1500);
console.log('re-entered from below, counter:', await cnt());
await p.screenshot({ path: `${out}/work-activation-5-back-from-below.png` });
await rec.stop(); await b.close();
