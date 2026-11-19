import puppeteer from 'puppeteer-core';
const EXPECT = ['Branding', 'Creative Strategy', 'Content Production', 'Social Media', 'Design', 'Paid Media', 'Web Experiences'];
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile 390', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto('http://localhost:3113/', { waitUntil: 'networkidle0' });
  const r = await p.evaluate(() => ({ titles: [...document.querySelectorAll('.fin-title')].map((e) => e.textContent), nums: [...document.querySelectorAll('.fin-kicker')].map((e) => e.textContent.slice(0, 2)), text: document.body.innerText, open: document.querySelectorAll('.fin-open').length }));
  ok(`${name}: fin titles = approved taxonomy, exact order`, JSON.stringify(r.titles) === JSON.stringify(EXPECT), r.titles.join(' | '));
  ok(`${name}: numbered 01–07`, r.nums.join() === '01,02,03,04,05,06,07', r.nums.join());
  ok(`${name}: no "Packaging" anywhere`, !/packaging/i.test(r.text));
  ok(`${name}: exactly one fin open`, r.open === 1);
  await p.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
