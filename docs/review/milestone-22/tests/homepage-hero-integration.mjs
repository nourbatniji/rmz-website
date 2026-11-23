import puppeteer from 'puppeteer-core';
// usage: node homepage-hero-integration.mjs — focused checks of the Three Worlds hero on the ACTUAL homepage (production preview, port 3111).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const URL = 'http://localhost:3111/';
const fr = (p) => p.screenshot({ type: 'jpeg', quality: 10 }).catch(() => {});
const geo = (p) => p.evaluate(() => { const act = document.querySelector('.hw-phrase[data-state=active]'); const R = (el) => { const r = document.createRange(); r.selectNodeContents(el); const x = r.getBoundingClientRect(); return [x.left, x.top, x.width, x.height].map((v) => Math.round(v * 10) / 10); }; const it = act.querySelector('.hw-line.t-italic > span'), ld = act.querySelector('.hw-line.t-display > span'); const root = document.querySelector('.hw-root');
  return { open: root.dataset.open, it: R(it), ld: R(ld), desc: R(document.querySelector('.hw-root p.hw-rise')), txt: [...act.querySelectorAll('.hw-line > span:not(.hw-ghost)')].map((x) => x.textContent.trim()).join(' '), c: document.body.innerText.match(/0\d \/ 03/)?.[0], ph: [...document.querySelectorAll('.hw-phrase')].map((x) => x.dataset.state).join(), y: scrollY, press: [...document.querySelectorAll('[aria-label="Banners"] button')].map((x) => x.getAttribute('aria-pressed')).join(), paused: /Resume automatic/.test([...document.querySelectorAll('button')].map((x) => x.ariaLabel).join()) }; });
const same = (x, y) => x.every((v, i) => Math.abs(v - y[i]) <= 0.6);
const logPhases = (p) => p.evaluateOnNewDocument(() => { window.__ph = []; new MutationObserver((l) => l.forEach((x) => x.target.classList?.contains('hw-root') && window.__ph.push([Math.round(performance.now()), x.target.dataset.open]))).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-open'] }); });
const w0 = await b.newPage(); await w0.goto(URL, { waitUntil: 'networkidle0' }); await w0.close(); // warm the HTTP cache
let N, base;
{ // fresh entry
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await logPhases(p); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  const t0 = Date.now(); while (Date.now() - t0 < 3600) { await fr(p); await sleep(30); }
  const PH = await p.evaluate(() => window.__ph); const seq = PH.map((x) => x[1]).join('>'); const pr = PH.find((x) => x[1] === 'running'), pd = PH.find((x) => x[1] === 'done');
  ok('fresh entry: opening plays (… armed → running → done) in ≈2.85 s', /armed>running>done$/.test(seq) && pd[0] - pr[0] >= 2650 && pd[0] - pr[0] <= 3250, seq + ' ' + (pd && pr ? pd[0] - pr[0] : ''));
  N = await geo(p);
  const ui = await p.evaluate(() => ({ preview: !!document.querySelector('[data-hw-preview]'), replay: /Replay|preview only/i.test(document.body.innerText), hdr: getComputedStyle(document.querySelector('header')).visibility }));
  ok('no preview UI on the homepage (no Replay, no stage controls); header visible', !ui.preview && !ui.replay && ui.hdr === 'visible', JSON.stringify(ui));
  ok('hero copy from the content source: banner 1 phrase, tagline, CTA', /A DIFFERENT perspective\./.test(N.txt) && await p.evaluate(() => { const a = document.querySelector('.hw-root a.hw-link'); return a.textContent.includes('Explore our work') && a.getAttribute('href') === '#work' && /Strategy, identity, campaigns/.test(document.querySelector('.hw-root p.hw-rise').textContent); }), JSON.stringify(N.txt));
  const key = await p.evaluate(() => [Object.keys(sessionStorage).join(',')]);
  ok('production session key used (not the lab key)', key[0] === 'rmz-home-hero-opening-v1', key[0]);
  await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(1500); await fr(p); base = await geo(p);
  ok('repeat entry in the same tab skips the opening', base.open === 'done');
  ok('final composition after the opening == the normal hero (word, lead, description within 0.6 px)', same(N.it, base.it) && same(N.ld, base.ld) && same(N.desc, base.desc), JSON.stringify([N.it, base.it]));
  // pause / auto-change
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Pause automatic/.test(x.ariaLabel || '')).click()); const c0 = (await geo(p)).c; await sleep(7000); await fr(p);
  const c1 = await geo(p); ok('pause stops auto-change (still 01 / 03 after 7 s)', c0 === '01 / 03' && c1.c === '01 / 03' && c1.paused, JSON.stringify([c0, c1.c, c1.paused]));
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Resume automatic/.test(x.ariaLabel || '')).click()); const t1 = Date.now(); let ch = null; while (Date.now() - t1 < 9000) { await fr(p); if ((await geo(p)).c === '02 / 03') { ch = Date.now() - t1; break; } await sleep(60); }
  ok('resume → automatic change to banner 2 after ≈5 s', ch !== null && ch > 3500 && ch < 8200, `${ch}`);
  // three banners and phrases by selector
  const names = ['identity', 'campaign', 'digital'], want = [/A DIFFERENT perspective\./, /IMPOSSIBLE to ignore\./, /BEYOND THE expected\./]; const res = [];
  for (let i = 0; i < 3; i++) { await p.evaluate((n) => [...document.querySelectorAll('[aria-label="Banners"] button')].find((x) => x.textContent.trim().toLowerCase() === n).click(), names[i]); await sleep(2500); await fr(p); const g = await geo(p); res.push(want[i].test(g.txt) && g.c === `0${i + 1} / 03` && g.press.split(',')[i] === 'true'); }
  ok('all three banners: selector → phrase, counter and pressed state', res.every(Boolean), res.join());
  // scroll frames
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Pause automatic/.test(x.ariaLabel || ''))?.click());
  await p.evaluate(() => [...document.querySelectorAll('[aria-label="Banners"] button')][0].click()); await sleep(2500);
  const hash = () => p.evaluate(() => { const cs = [...document.querySelectorAll('.hw-root button.cursor-pointer canvas')]; let h = 0; for (const c of cs.slice(0, 90)) { if (!c.width) continue; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4999) h = (h * 31 + d[i]) | 0; } return h; });
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await fr(p); await sleep(500); const h0 = await hash();
  await p.evaluate(() => scrollTo({ top: 330, behavior: 'instant' })); await fr(p); await sleep(600); await fr(p); const h1 = await hash();
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await fr(p); await sleep(600); await fr(p); const h2 = await hash();
  ok('scroll drives the image frames (forward changes the picture, reverse restores it exactly)', h0 !== h1 && h0 === h2, JSON.stringify([h0, h1, h2]));
  // following section + header links
  const nav = await p.evaluate(() => { const hero = document.querySelector('main#top > section'); const next = hero.nextElementSibling; return { heroBottom: Math.round(hero.getBoundingClientRect().bottom + scrollY), nextTop: Math.round(next.getBoundingClientRect().top + scrollY), nextId: next.id, links: [...document.querySelectorAll('header nav a')].map((a) => a.getAttribute('href')) }; });
  ok('the next section follows the hero directly (corridor #work); header links keep their section anchors', nav.heroBottom === 900 && nav.nextTop === 900 && nav.nextId === 'work' && nav.links.join() === '#work,#services,#minds,#contact', JSON.stringify(nav));
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await fr(p);
  await p.evaluate(() => [...document.querySelectorAll('header nav a')].find((a) => a.getAttribute('href') === '#services').click()); for (let i = 0; i < 12; i++) { await fr(p); await sleep(120); }
  const sv = await p.evaluate(() => { const s = document.getElementById('services'); return { y: scrollY, top: Math.round(s.getBoundingClientRect().top) }; });
  ok('header "Capabilities" still scrolls to #services', sv.y > 900 && Math.abs(sv.top) < 160, JSON.stringify(sv));
  await p.close();
}
{ // interruption
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(URL, { waitUntil: 'domcontentloaded' }); await p.mouse.move(700, 500);
  let s; for (let i = 0; i < 120; i++) { await fr(p); s = await geo(p); if (s.open === 'running') break; await sleep(15); }
  await sleep(500); await p.mouse.wheel({ deltaY: 40 }); await p.evaluate(() => scrollBy(0, 40)); await fr(p); await sleep(150); await fr(p); const a = await geo(p);
  ok('scroll mid-opening finishes it at once and keeps the scroll position; final layout == normal', a.open === 'done' && a.y >= 40 && Math.abs(a.it[1] + a.y - base.it[1]) < 1, JSON.stringify([a.open, a.y, a.it[1] + a.y, base.it[1]]));
  await p.close();
  const q = await b.newPage(); await q.setViewport({ width: 1440, height: 900 }); await q.goto(URL, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 120; i++) { await fr(q); s = await geo(q); if (s.open === 'running') break; await sleep(15); }
  await sleep(400); await q.evaluate(() => [...document.querySelectorAll('[aria-label="Banners"] button')].find((x) => /campaign/i.test(x.textContent)).click()); await sleep(2600); await fr(q); const c = await geo(q);
  ok('banner selected mid-opening is honoured (campaign phrase, 02 / 03, opening finished)', /IMPOSSIBLE/.test(c.txt) && c.c === '02 / 03' && c.open === 'done', JSON.stringify([c.txt, c.c, c.open])); await q.close();
}
{ // skips, fallbacks, layout
  const a = await b.newPage(); await a.setViewport({ width: 1440, height: 900 }); await a.goto(URL + '#services', { waitUntil: 'domcontentloaded' }); await sleep(1200); await fr(a); const ag = await geo(a);
  ok('anchor entry (#services): opening skipped', ag.open === 'done'); await a.close();
  const r = await b.newPage(); await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await r.setViewport({ width: 1440, height: 900 }); await r.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(800); await fr(r); const rg = await geo(r);
  ok('reduced motion: normal hero at once, paused auto-change', rg.open === 'done' && rg.paused && same(rg.it, base.it)); await r.close();
  const n = await b.newPage(); await n.setJavaScriptEnabled(false); await n.setViewport({ width: 1440, height: 900 }); await n.goto(URL, { waitUntil: 'load' });
  const nj = await n.evaluate(() => { const it = document.querySelector('.hw-phrase[data-state=active] .hw-line.t-italic'); return { vis: getComputedStyle(it).visibility, poster: getComputedStyle(document.querySelector('[data-hw-poster]')).opacity, img: getComputedStyle(document.querySelector('.hw-image')).opacity, ty: new DOMMatrix(getComputedStyle(it.firstElementChild).transform).m42, desc: getComputedStyle(document.querySelector('.hw-root p.hw-rise')).opacity }; });
  ok('no JavaScript: static hero visible (word, poster, copy)', nj.vis === 'visible' && nj.poster === '1' && nj.img === '1' && nj.ty === 0 && nj.desc === '1', JSON.stringify(nj)); await n.close();
  const g = await b.newPage(); await g.setViewport({ width: 1440, height: 900 }); await g.goto(URL + '?ghost=1', { waitUntil: 'networkidle0' }); await sleep(800);
  const gi = await g.evaluate(() => document.querySelector('.hw-root').style.getPropertyValue('--gimg') + '|' + !!document.querySelector('[data-hw-preview]')); ok('?ghost and preview overrides do nothing on the homepage', /frame-01/.test(gi) && gi.endsWith('false') || gi === '|false' || !/banner-2/.test(gi) && gi.endsWith('false'), gi); await g.close();
  const m = await b.newPage(); await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await m.goto(URL, { waitUntil: 'domcontentloaded' }); const t0 = Date.now(); while (Date.now() - t0 < 3600) { await fr(m); await sleep(40); }
  const mg = await m.evaluate(() => { const h1 = document.querySelector('h1').getBoundingClientRect(); const act = document.querySelector('.hw-phrase[data-state=active]'); const R = Math.max(...[...act.querySelectorAll('.hw-line > span:not(.hw-ghost)')].map((x) => { const r = document.createRange(); r.selectNodeContents(x); return r.getBoundingClientRect().right; })); const ctl = document.querySelector('[aria-label="Banners"]').getBoundingClientRect(); const hero = document.querySelector('main#top > section'); return { open: document.querySelector('.hw-root').dataset.open, R: Math.round(R), sw: document.documentElement.scrollWidth, h1b: Math.round(h1.bottom), ct: Math.round(ctl.top), heroB: Math.round(hero.getBoundingClientRect().bottom), next: hero.nextElementSibling.id, links: document.querySelectorAll('header nav a').length }; });
  ok('mobile 390×844: opening completes; headline inside the viewport and clear of the controls; no horizontal scroll; next section follows', mg.open === 'done' && mg.R <= 374 && mg.sw <= 390 && mg.h1b < mg.ct && mg.heroB === 844 && mg.next === 'work', JSON.stringify(mg)); await m.close();
  const l = await b.newPage(); await l.setViewport({ width: 1440, height: 900 }); await l.goto(URL + 'lab/hero-three-worlds', { waitUntil: 'networkidle0' }); await sleep(800);
  ok('the lab route still has its review controls (same component, preview on)', await l.evaluate(() => !!document.querySelector('[data-hw-preview]') && /Replay/.test(document.body.innerText))); await l.close();
}
await b.close(); console.log(`${pass}/${pass + fail} passed`);
