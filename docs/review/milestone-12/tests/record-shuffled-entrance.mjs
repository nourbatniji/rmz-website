import puppeteer from 'puppeteer-core';
// Short desktop recording of the Minds entrance on two separate page loads (each load shuffles the reveal order once).
const out = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
const orders = [];
const reveal = async () => {
  await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(900);
  orders.push(await p.evaluate(() => [...document.querySelectorAll('#minds .mind')].map((li) => +li.style.getPropertyValue('--o')).join('')));
  const top = await p.evaluate(() => document.querySelector('#minds').getBoundingClientRect().top + scrollY);
  // stop a little above Minds so the whole row is in view; the entrance fires on the way in
  const smooth = async (to, ms) => { const from = await p.evaluate(() => scrollY); const n = Math.round(ms / 40); for (let i = 1; i <= n; i++) { await p.evaluate((y) => scrollTo(0, y), from + (to - from) * (i / n)); await sleep(40); } };
  await p.evaluate((y) => scrollTo(0, y), top - 900 - 300); await sleep(500);
  await smooth(top - 150, 1100); await sleep(2300);
};
const rec = await p.screencast({ path: out, fps: 12 });
await reveal(); await reveal();
await rec.stop(); console.log('orders (column index → reveal slot):', orders.join('  /  ')); await b.close();
