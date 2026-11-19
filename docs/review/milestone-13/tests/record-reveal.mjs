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
await to(760, 1800); await sleep(1500);      // the boundary is in view, below the trigger: nothing visible at all
await to(700, 1200); await sleep(500);       // the trigger (section top at 80 % of the usable viewport) — still hidden
await to(560, 2600); await sleep(800);       // growth begins from the junction
await to(400, 2600); await sleep(1800);      // partial: the cream card is clipped at its own column's edge; hold
const cx = await p.evaluate(() => { const l = document.querySelector('.minds-list').getBoundingClientRect(); const cols = [...document.querySelectorAll('.minds-list > li')]; const i = cols.findIndex((c) => !c.classList.contains('mind-open') && c.getBoundingClientRect().left > 700); const r = cols[i].getBoundingClientRect(); return [r.left + r.width / 2, l.top + 40]; });
await p.mouse.click(cx[0], cx[1]); await sleep(2000);   // mid-reveal column switch: the new card keeps its mask
await to(250, 2600); await sleep(800);
await to(40, 2600); await sleep(1800);       // complete
await to(250, 2400); await sleep(500);       // reverse
await to(560, 2600); await sleep(500);
await to(760, 2400); await sleep(1800);      // fully hidden again
await rec.stop(); await b.close();
