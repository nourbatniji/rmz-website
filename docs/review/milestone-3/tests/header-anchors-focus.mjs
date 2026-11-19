import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const lum = (c) => { const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
for (const [name, vp] of [['desktop 1440', { width: 1440, height: 900 }], ['tablet 768', { width: 768, height: 1024 }], ['mobile 390', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
  const p = await b.newPage(); await p.setViewport(vp);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:3113/', { waitUntil: 'networkidle0' }); await sleep(800);
  const H = await p.evaluate(() => document.querySelector('header').children[1].getBoundingClientRect().height);
  const cssH = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')));
  ok(`${name}: --header-h matches measured header (${H})`, Math.abs(H - cssH) <= 1, `css ${cssH}`);
  const top = (s) => p.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, s);
  // anchor jumps
  for (const id of ['#services', '#minds', '#work', '#contact', '#statement']) {
    await p.evaluate(() => scrollTo(0, 0)); await sleep(200);
    if (id === '#statement') await p.evaluate(() => { location.hash = '#statement'; }); else if (vp.isMobile) { await p.evaluate(() => [...document.querySelectorAll('header button')].find((x) => /Menu/.test(x.textContent)).click()); await sleep(150); await p.evaluate((id) => document.querySelector(`#mobile-nav a[href="${id}"]`).click(), id); } else await p.evaluate((id) => document.querySelector(`nav a[href="${id}"]`).click(), id);
    await sleep(700);
    const t = await top(id); const maxS = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY);
    ok(`${name}: anchor ${id} lands at/below the header (top ${Math.round(t)} ≥ ${H})`, t >= H - 1 || maxS < 2, `at page end: ${maxS < 2}`);
  }
  // keyboard focus: tab into each fin cover from the top and verify it is not hidden under the header
  await p.evaluate(() => scrollTo(0, 0)); await sleep(300);
  const n = await p.$$eval('.mind-cover', (e) => e.length); let bad = [];
  await p.evaluate(() => document.querySelector('.mind-cover').focus({ preventScroll: true }));
  for (let i = 0; i < n; i++) {
    await p.evaluate((i) => { document.querySelectorAll('.mind-cover')[i].focus(); }, i); await sleep(120);
    const r = await p.evaluate((i) => { const e = document.querySelectorAll('.mind-cover')[i].getBoundingClientRect(); return [e.top, e.bottom]; }, i);
    if (r[0] < H - 1 && r[1] > H) bad.push(i); // partially under header
  }
  ok(`${name}: keyboard-focused Minds columns never sit under the header`, bad.length === 0, bad.join(','));
  // focus last fin after scrolling past it, then shift-tab upward (focus scrolls up)
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await sleep(300);
  await p.evaluate(() => document.querySelectorAll('.mind-cover')[0].focus()); await sleep(300);
  const t0 = await p.evaluate(() => document.querySelectorAll('.mind-cover')[0].getBoundingClientRect().top);
  ok(`${name}: focusing the first Minds column from below scrolls it clear of the header (top ${Math.round(t0)})`, t0 >= H - 1);
  // header treatment: transparent over hero, solid below
  await p.evaluate(() => scrollTo(0, 0)); await sleep(300);
  const bg = () => p.evaluate(() => { const e = document.querySelector('header [aria-hidden]'); const s = getComputedStyle(e); return s.backgroundColor + '|' + s.backgroundImage.slice(0, 16); });
  const top0 = await bg();
  await p.evaluate(() => scrollTo(0, innerHeight * 1.3)); await sleep(500);
  const mid = await bg();
  ok(`${name}: header bar is the approved gradient over the hero, solid ink past it`, top0.includes('linear-gradient') && /rgb\(15, 15, 14\)\|none/.test(mid), `${top0} → ${mid}`);
  // no header overlap with statement text and fin titles at a rest position
  await p.evaluate(() => scrollTo(0, 0));
  // contrast of kicker
  await p.evaluate(() => scrollTo(0, document.querySelector('#minds').getBoundingClientRect().top + scrollY - 100)); await sleep(500);
  const col = await p.evaluate(() => { const k = document.querySelector('.mind-open .mind-kicker'); const c = getComputedStyle(k).color.match(/\d+/g).map(Number); const bgc = getComputedStyle(k.closest('.mind-plate')).backgroundColor.match(/\d+/g).map(Number); return [c, bgc]; });
  ok(`${name}: Minds kicker contrast ≥ 4.5 (${ratio(col[0], col[1]).toFixed(1)}:1)`, ratio(col[0], col[1]) >= 4.5);
  const vis = await p.evaluate(() => ({ stmLabel: !!document.querySelector('.stm-label'), txt: document.body.innerText.includes('Statement\n') || /^Statement$/m.test(document.querySelector('#statement')?.innerText || '') }));
  ok(`${name}: no visible "Statement" label`, !vis.stmLabel && !vis.txt);
  ok(`${name}: no design-note intro copy`, !(await p.evaluate(() => /hang from the top|architectural fins|fins of one wall/i.test(document.body.innerText))));
  ok(`${name}: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`${name}: no page errors`, errs.length === 0, errs.join('|'));
  await p.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
