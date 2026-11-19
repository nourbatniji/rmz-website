import puppeteer from 'puppeteer-core';
// Desktop recording of the Minds scroll-linked reveal: slow scroll down → stop halfway → reverse (retract) → forward again → fast jump → click a column.
const out = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(900);
const listTop = () => p.evaluate(() => document.querySelector('.minds-list').getBoundingClientRect().top);
// scroll so the list top sits `lt` px below the viewport top, in smooth steps
const to = async (lt, ms) => { const from = await listTop(); const n = Math.max(1, Math.round(ms / 40)); for (let i = 1; i <= n; i++) { const target = from + (lt - from) * (i / n); const cur = await listTop(); await p.evaluate((d) => scrollBy(0, d), cur - target); await sleep(40); } };
await p.evaluate(() => { const l = document.querySelector('.minds-list').getBoundingClientRect(); scrollTo(0, scrollY + l.top - 1000); }); await sleep(600);
const rec = await p.screencast({ path: out, fps: 12 });
await sleep(600);
await to(700, 1200); await sleep(900);      // the boundary arrives: only short stubs hang from the red junction
await to(560, 2400); await sleep(500);      // growth begins, slowly
await to(380, 3000); await sleep(1800);     // stop halfway: the exact partial state holds
await to(560, 2600); await sleep(600);      // reverse: they retract along the same path
await to(700, 1800); await sleep(700);
await to(300, 3600); await sleep(500);      // forward again
await to(100, 3000); await sleep(1500);     // complete
await to(700, 900); await sleep(500);       // fast jump back: stubs
await to(100, 900); await sleep(900);       // fast forward: complete
const cx = await p.evaluate(() => { const r = document.querySelectorAll('#minds .mind')[5].getBoundingClientRect(); return [r.left + r.width / 2, document.querySelector('.minds-list').getBoundingClientRect().top + 60]; });
await p.mouse.click(cx[0], cx[1]); await sleep(1600);   // column interaction on the completed layout
await rec.stop(); await b.close();
