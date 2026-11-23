import puppeteer from 'puppeteer-core';
// usage: node hero-opening-tests.mjs — ONE brief run for the typography-led opening (production preview, port 3111).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const URL = 'http://localhost:3111/lab/hero-three-worlds';
const fr = (p) => p.screenshot({ type: 'jpeg', quality: 10 }).catch(() => {});
const geo = (p) => p.evaluate(() => { const act = document.querySelector('.hw-phrase[data-state=active]'); const R = (el) => { const r = document.createRange(); r.selectNodeContents(el); const x = r.getBoundingClientRect(); return [x.left, x.top, x.width, x.height].map((v) => Math.round(v * 10) / 10); }; const it = act.querySelector('.hw-line.t-italic > span'), ld = act.querySelector('.hw-line.t-display > span'); const root = document.querySelector('.hw-root'); const img = document.querySelector('.hw-image');
  return { open: root.dataset.open, it: R(it), ld: R(ld), desc: R(document.querySelector('.hw-root p.hw-rise')), tf: getComputedStyle(it.parentElement).transform, mask: getComputedStyle(img).maskImage, c: document.body.innerText.match(/0\d \/ 03/)?.[0], ph: [...document.querySelectorAll('.hw-phrase')].map((x) => x.dataset.state).join(), y: scrollY }; });
const log = (p) => p.evaluateOnNewDocument(() => { window.__ph = []; new MutationObserver((l) => l.forEach((x) => x.target.classList?.contains('hw-root') && window.__ph.push([Math.round(performance.now()), x.target.dataset.open]))).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-open'] }); });
let A, B;
{ // first entry: phases, start pose inside the viewport, final alignment
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await log(p);
  const start = []; await p.exposeFunction('__start', (v) => start.push(v));
  await p.evaluateOnNewDocument(() => { new MutationObserver(() => { const r = document.querySelector('.hw-root'); if (r && r.dataset.open === 'armed' && !window.__s) { window.__s = 1; const it = r.querySelector('.hw-phrase[data-state=active] .hw-line.t-italic'); const rg = document.createRange(); rg.selectNodeContents(it.firstElementChild); const x = rg.getBoundingClientRect(); window.__start([x.left, x.top, x.right, x.bottom, innerWidth, innerHeight]); } }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-open'] }); });
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); const t0 = Date.now(); while (Date.now() - t0 < 3600) { await fr(p); await sleep(30); }
  const PH = await p.evaluate(() => window.__ph); const seq = PH.map((x) => x[1]).join('>');
  ok('phases … → armed (start pose, set before the first hydrated paint) → running → done', /armed>running>done$/.test(seq) && !/^done/.test(seq), seq);
  const pr = PH.find((x) => x[1] === 'running'), pd = PH.find((x) => x[1] === 'done'); ok('opening ≈1.4–1.9 s from start to handoff', pd[0] - pr[0] >= 1400 && pd[0] - pr[0] <= 1900, `${pd[0] - pr[0]} ms`);
  const s0 = start[0]; ok('start pose: whole word inside the viewport and centred', s0 && s0[0] >= 0 && s0[2] <= s0[4] && s0[1] >= 0 && s0[3] <= s0[5] && Math.abs((s0[0] + s0[2]) / 2 - s0[4] / 2) < 6 && Math.abs((s0[1] + s0[3]) / 2 - s0[5] / 2) < 6, JSON.stringify(s0));
  A = await geo(p); ok('finished: done, no transform on the word, picture unmasked', A.open === 'done' && A.tf === 'none' && A.mask === 'none', JSON.stringify(A));
  await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(1500); await fr(p); B = await geo(p); // second visit in the tab: skipped = the normal hero
  const same = (x, y) => x.every((v, i) => Math.abs(v - y[i]) <= 0.6);
  ok('final alignment: headline word, lead and description sit exactly where the normal hero puts them', same(A.it, B.it) && same(A.ld, B.ld) && same(A.desc, B.desc), JSON.stringify([A.it, B.it, A.ld, B.ld]));
  ok('second entry in the tab skips the opening', B.open === 'done');
  await p.close();
}
{ // interruption by scroll, and by banner selection
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(URL, { waitUntil: 'domcontentloaded' }); await p.mouse.move(700, 500);
  let s; for (let i = 0; i < 100; i++) { await fr(p); s = await geo(p); if (s.open === 'running') break; await sleep(15); }
  await sleep(350); await p.mouse.wheel({ deltaY: 40 }); await p.evaluate(() => scrollBy(0, 40)); await fr(p); await sleep(120); await fr(p); const a = await geo(p);
  ok('scroll mid-opening finishes it at once: done, word in place, picture unmasked, scroll position kept', a.open === 'done' && a.tf === 'none' && a.mask === 'none' && a.y >= 40 && Math.abs(a.it[1] + a.y - B.it[1]) < 1, JSON.stringify([a.open, a.tf, a.mask, a.y, a.it[1] + a.y, B.it[1]]));
  await p.close();
  const q = await b.newPage(); await q.setViewport({ width: 1440, height: 900 }); await q.goto(URL, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 100; i++) { await fr(q); s = await geo(q); if (s.open === 'running') break; await sleep(15); }
  await sleep(300); await q.evaluate(() => [...document.querySelectorAll('[aria-label="Banners"] button')].find((x) => /campaign/i.test(x.textContent)).click()); await sleep(2600); await fr(q); const c = await geo(q);
  ok('banner selected mid-opening is honoured (campaign phrase, 02 / 03)', c.ph === 'idle,active,idle' && c.c === '02 / 03' && c.open === 'done', JSON.stringify([c.ph, c.c, c.open]));
  const t0 = Date.now(); let got = null; while (Date.now() - t0 < 9000) { await fr(q); const x = await geo(q); if (x.c === '03 / 03') { got = Date.now() - t0; break; } await sleep(60); }
  ok('regular 5 s countdown → next regular transition (03 / 03, digital)', got !== null && got > 3000 && got < 8200, `${got}`); await q.close();
}
{ // first regular transition after an uninterrupted opening; replay
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await log(p); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  const t0 = Date.now(); let sw = null; while (Date.now() - t0 < 10500) { await fr(p); const x = await geo(p); if (x.c === '02 / 03') { sw = Date.now() - t0; break; } await sleep(50); }
  const PH = await p.evaluate(() => window.__ph); const dn = PH.find((x) => x[1] === 'done');
  ok('first automatic change ≈5 s after the opening finished', sw !== null && dn && (sw - (dn[0] - (PH[0][0] - 0))) > -1 && sw > 5200 && sw < 8800, `${sw} ms after load`);
  await sleep(2400); await fr(p); const g = await geo(p); ok('…normal transition: campaign phrase in, ribs normal, no opening residue', g.ph === 'idle,active,idle' && g.mask === 'none' && g.tf === 'none', JSON.stringify([g.ph, g.mask, g.tf]));
  await p.evaluate(() => scrollTo({ top: 200, behavior: 'instant' })); await fr(p); await sleep(150);
  const n0 = (await p.evaluate(() => window.__ph.length)); await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Replay/.test(x.textContent)).click()); const t1 = Date.now(); while (Date.now() - t1 < 3000) { await fr(p); await sleep(40); }
  const R = (await p.evaluate((n) => window.__ph.slice(n).map((x) => x[1]).join('>'), n0)); const f = await geo(p);
  ok('Replay: back to top + first banner, armed → running → done, final = normal hero', /armed>running>done$/.test(R) && f.y === 0 && f.c === '01 / 03' && same(f.it, B.it), `${R} ${JSON.stringify([f.y, f.c, f.it, B.it])}`);
  await p.close();
}
{ // reduced motion, no-JS fallback
  const r = await b.newPage(); await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await r.setViewport({ width: 1440, height: 900 }); await r.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(700); await fr(r); const x = await geo(r);
  ok('reduced motion: normal hero at once (done, unmasked, in place)', x.open === 'done' && x.mask === 'none' && same(x.it, B.it), JSON.stringify([x.open, x.mask])); await r.close();
  const n = await b.newPage(); await n.setJavaScriptEnabled(false); await n.setViewport({ width: 1440, height: 900 }); await n.goto(URL, { waitUntil: 'load' });
  const nj = await n.evaluate(() => { const it = document.querySelector('.hw-phrase[data-state=active] .hw-line.t-italic'); return { vis: getComputedStyle(it).visibility, mask: getComputedStyle(document.querySelector('.hw-image')).maskImage, poster: getComputedStyle(document.querySelector('[data-hw-poster]')).opacity, ty: new DOMMatrix(getComputedStyle(it.firstElementChild).transform).m42, desc: getComputedStyle(document.querySelector('.hw-root p.hw-rise')).opacity }; });
  ok('no JavaScript: normal hero (word visible & in place, picture + poster visible, copy visible)', nj.vis === 'visible' && nj.mask === 'none' && nj.poster === '1' && nj.ty === 0 && nj.desc === '1', JSON.stringify(nj)); await n.close();
}
function same(x, y) { return x.every((v, i) => Math.abs(v - y[i]) <= 0.6); }
await b.close(); console.log(`${pass}/${pass + fail} passed`);
