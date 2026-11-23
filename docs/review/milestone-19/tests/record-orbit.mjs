import puppeteer from 'puppeteer-core';
// usage: node record-orbit.mjs <outdir> — recordings (scripted, real wheel / pointer input): A scroll-linked, B interactive, mobile
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const U = (v) => `http://localhost:3111/lab/orbital-services?v=${v}`;
async function wheelBy(p, total, per = 60, gap = 28) { for (let d = 0; d < Math.abs(total); d += per) { await p.mouse.wheel({ deltaY: Math.sign(total) * per }); await sleep(gap); } }
{ // A
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(U('A'), { waitUntil: 'networkidle0' }); await sleep(800); await p.mouse.move(720, 500);
  const rec = await p.screencast({ path: `${out}/orbit-A-scroll-linked.mp4`, fps: 20 }); await sleep(600);
  const g = await p.evaluate(() => { const t = document.querySelector('.orb-track'), s = document.querySelector('.orb-stage'); return { top: t.getBoundingClientRect().top + scrollY, extra: t.offsetHeight - s.offsetHeight }; });
  await wheelBy(p, g.top - 92 - 120, 60, 30); await sleep(900); // approach from above: the page just scrolls
  await wheelBy(p, 140, 20, 40); await sleep(700); // reaches the aligned position
  for (let i = 0; i < 6; i++) { await wheelBy(p, g.extra / 6, 40, 26); await sleep(1100); } // service 1 to 7, one step at a time
  await sleep(700); await wheelBy(p, -g.extra * 0.9, 80, 24); await sleep(1100); // reverse (retrace)
  const labs = await p.$$('button[data-orb-label]'); await labs[4].click(); await sleep(2300); // direct selection: the scene scrolls to service 5
  await labs[1].click(); await sleep(2300);
  await p.click('.orb-skip'); await sleep(2200); // leave: skip services
  await rec.stop(); await p.close(); }
{ // B
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(U('B'), { waitUntil: 'networkidle0' }); await sleep(800);
  await p.evaluate(() => { const e = document.querySelector('#services-orbit'); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 92, behavior: 'instant' }); }); await sleep(600);
  const rec = await p.screencast({ path: `${out}/orbit-B-interactive.mp4`, fps: 20 }); await sleep(500);
  const labs = await p.$$('button[data-orb-label]'); await labs[3].click(); await sleep(1500); await labs[5].click(); await sleep(1500); await labs[0].click(); await sleep(1500);
  await p.click('button[aria-label="Previous service"]'); await sleep(1300); // 1 to 7 wraps the short way
  await p.click('button[aria-label="Next service"]'); await sleep(1300);
  const L = await p.evaluate(() => { const q = document.querySelector('[data-orb-lens]').getBoundingClientRect(); return { cx: q.left + q.width / 2, cy: q.top + q.height / 2, r: q.width / 2 + 40 }; });
  await p.mouse.move(L.cx, L.cy - L.r); await p.mouse.down(); for (let a = 0; a <= 130; a += 3) { const t = (a * Math.PI) / 180; await p.mouse.move(L.cx + L.r * Math.sin(t), L.cy - L.r * Math.cos(t)); await sleep(16); } await p.mouse.up(); await sleep(1600);
  await p.mouse.move(300, 450); await p.mouse.wheel({ deltaY: 500 }); await sleep(1200); // vertical scrolling still works
  await rec.stop(); await p.close(); }
{ // mobile
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await p.goto(U('B'), { waitUntil: 'networkidle0' }); await sleep(800);
  await p.evaluate(() => { const e = document.querySelector('#services-orbit'); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 84, behavior: 'instant' }); }); await sleep(600);
  const rec = await p.screencast({ path: `${out}/orbit-mobile.mp4`, fps: 20 }); await sleep(600);
  for (let i = 0; i < 3; i++) { await p.click('button[aria-label="Next service"]'); await sleep(1200); }
  const c = await p.evaluate(() => { const q = document.querySelector('.orb-mstage').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + 60 }; });
  for (let k = 0; k < 2; k++) { await p.mouse.move(c.x + 90, c.y); await p.mouse.down(); for (let i = 0; i < 10; i++) { await p.mouse.move(c.x + 90 - i * 20, c.y); await sleep(16); } await p.mouse.up(); await sleep(1300); }
  await p.evaluate(() => scrollBy({ top: 500, behavior: 'smooth' })); await sleep(1200);
  await rec.stop(); await p.close(); }
await b.close();
