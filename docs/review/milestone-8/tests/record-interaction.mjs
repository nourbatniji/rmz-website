import puppeteer from 'puppeteer-core';
const [out, mode] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const m = mode === 'm'; const p = await b.newPage();
await p.setViewport(m ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(700);
const smooth = async (to, ms) => { const from = await p.evaluate(() => scrollY); const n = Math.round(ms / 40); for (let i = 1; i <= n; i++) { await p.evaluate((y) => scrollTo(0, y), from + (to - from) * (i / n)); await sleep(40); } };
const top = await p.evaluate(() => document.querySelector('#services').getBoundingClientRect().top + scrollY);
const rec = await p.screencast({ path: out, fps: 12 });
await sleep(500);
await smooth(top - (m ? 0 : 92) - 400, 1800); await smooth(top - (m ? 0 : 92), 1600); await sleep(1200);
const pick = async (i) => { await p.evaluate((i) => document.querySelectorAll('[data-row]')[i].click(), i); };
if (!m) {
  for (const i of [0, 3, 6, 5, 1]) { await pick(i); await sleep(2300); }
  const cen = await p.evaluate(() => { const r = document.querySelector('[data-lens]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const pt = (d) => ({ x: cen.x + 385 * Math.cos((d * Math.PI) / 180), y: cen.y + 385 * Math.sin((d * Math.PI) / 180) });
  const a = pt(180); await p.mouse.move(a.x, a.y); await p.mouse.down();
  for (let d = 180; d >= 108; d -= 2) { const q = pt(d); await p.mouse.move(q.x, q.y); await sleep(22); }
  await p.mouse.up(); await sleep(2500);
  await p.evaluate(() => document.querySelectorAll('[data-row]')[1].focus());
  for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown']) { await p.keyboard.press(k); await sleep(1800); }
  await sleep(500); await smooth(top + 700, 1500);
} else {
  await smooth(top, 600);
  const nx = (await p.$$('.lens-ctl'))[1];
  for (let i = 0; i < 3; i++) { await nx.evaluate((e) => e.scrollIntoView({ block: 'center' })); await sleep(200); const bx = await nx.boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); await sleep(2000); }
  await smooth(top, 600);
  const lb = await (await p.$('[data-lens]')).boundingBox(); const cx = lb.x + lb.width / 2, cy = lb.y + lb.height / 2;
  await p.touchscreen.touchStart(cx + 50, cy); for (let i = 1; i <= 12; i++) { await p.touchscreen.touchMove(cx + 50 - i * 14, cy); await sleep(18); } await p.touchscreen.touchEnd(); await sleep(2200);
  const row = (await p.$$('[data-row]'))[6]; await row.evaluate((e) => e.scrollIntoView({ block: 'center' })); await sleep(250); const bx = await row.boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); await sleep(2200);
  await smooth(top + 500, 900); await sleep(800);
}
await rec.stop(); await b.close();
