import puppeteer from 'puppeteer-core';
// Desktop recording of the Minds scroll-linked reveal: hidden start → partial reveal (cream card clipped with its column) → mid-reveal column switch → completion → full reverse to hidden.
const out = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(900);
const rootTop = () => p.evaluate(() => document.querySelector('#minds').getBoundingClientRect().top);
// scroll so the Minds section top sits `y` px below the viewport top, in smooth steps
const to = async (y, ms) => { const from = await rootTop(); const n = Math.max(1, Math.round(ms / 40)); for (let i = 1; i <= n; i++) { const target = from + (y - from) * (i / n); const cur = await rootTop(); await p.evaluate((d) => scrollBy(0, d), cur - target); await sleep(40); } };
await p.evaluate(() => { const r = document.querySelector('#minds').getBoundingClientRect(); scrollTo(0, scrollY + r.top - 1000); }); await sleep(600);
const rec = await p.screencast({ path: out, fps: 12 });
await sleep(600);
await to(760, 1200); await sleep(700);      // hidden start
await to(600, 2200); await sleep(600);      // slow scroll: smooth growth
for (const y of [520, 560, 470, 540, 430, 500]) { await to(y, 380); }   // rapid direction changes
await sleep(900);                           // stop midway: a brief settle, then the exact position
const cx = await p.evaluate(() => { const l = document.querySelector('.minds-list').getBoundingClientRect(); const cols = [...document.querySelectorAll('.minds-list > li')]; const i = cols.findIndex((c) => !c.classList.contains('mind-open') && c.getBoundingClientRect().left > 700); const r = cols[i].getBoundingClientRect(); return [r.left + r.width / 2, l.top + 40]; });
await p.mouse.click(cx[0], cx[1]); await sleep(1400);   // column switch mid-reveal
await to(250, 2000); await sleep(500);
await to(40, 1800); await sleep(1200);      // complete
await p.evaluate(() => { const r = document.querySelector('#minds').getBoundingClientRect(); scrollBy(0, r.top - 760); }); await sleep(1200);   // fast jump back to hidden
await to(300, 500); await sleep(300);       // quick flick forward
await to(760, 2400); await sleep(1000);     // smooth full reverse to hidden
await rec.stop(); await b.close();
