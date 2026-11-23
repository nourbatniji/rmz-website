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
  const pr = PH.find((x) => x[1] === 'running'), pd = PH.find((x) => x[1] === 'done'); ok('opening ≈2.65 s from start to handoff', pd[0] - pr[0] >= 2450 && pd[0] - pr[0] <= 3050, `${pd[0] - pr[0]} ms`);
  const s0 = start[0]; ok('start pose: word ≈85 % of the usable width, whole word inside the viewport, centred', s0 && (s0[2] - s0[0]) / (s0[4] - 128) > 0.8 && (s0[2] - s0[0]) / (s0[4] - 128) < 0.9 && s0[0] >= 0 && s0[2] <= s0[4] && s0[1] >= 0 && s0[3] <= s0[5] && Math.abs((s0[0] + s0[2]) / 2 - s0[4] / 2) < 6 && Math.abs((s0[1] + s0[3]) / 2 - s0[5] / 2) < 6, JSON.stringify(s0));
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
{ // review stages 01–06 (preview-only controls seek the REAL animations/transition) + the prism reveal: upside-down start, real rotation, upright end
  const w0 = await b.newPage(); await w0.goto(URL, { waitUntil: 'networkidle0' }); await w0.close();
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(3400);
  const click = (n) => p.evaluate((n) => [...document.querySelectorAll('[data-hw-preview] button[title]')][n - 1].click(), n);
  const st = () => p.evaluate(() => { const r = document.querySelector('.hw-root'); const img = document.querySelector('.hw-image'); const g = document.querySelector('.hw-phrase[data-state=active] .hw-ghost'); const it = document.querySelector('.hw-phrase[data-state=active] .hw-line.t-italic'); const m = new DOMMatrix(getComputedStyle(it).transform);
    const ribs = [...document.querySelectorAll('button.cursor-pointer > div > div')]; const ang = (el) => { const q = new DOMMatrix(getComputedStyle(el).transform); return Math.round(Math.atan2(q.m13, q.m11) * 180 / Math.PI); };
    return { open: r.dataset.open, io: +getComputedStyle(img).opacity, mask: getComputedStyle(img).maskImage, gm: +getComputedStyle(g).getPropertyValue('--hw-gm'), go: +getComputedStyle(g).opacity, gd: getComputedStyle(g).display, s: Math.round(m.a * 100) / 100, rise: +getComputedStyle(document.querySelector('.hw-root p.hw-rise')).opacity, lead: new DOMMatrix(getComputedStyle(document.querySelector('.hw-phrase[data-state=active] .hw-line.t-display > span')).transform).m42, a0: Math.abs(ang(ribs[0])), aN: Math.abs(ang(ribs.at(-1))) }; });
  const stage = async (n) => { await click(n); for (let i = 0; i < 6; i++) { await fr(p); await sleep(80); } return st(); };
  const s1 = await stage(1), s2 = await stage(2), s3 = await stage(3), s4 = await stage(4), s5 = await stage(5);
  ok('01 WORD: picture not shown outside the letters, image-through-type minimal, word at start pose, copy hidden', s1.open === 'running' && s1.io === 0 && s1.gm < 0.05 && s1.go === 1 && s1.s > 1.5 && s1.rise === 0 && s1.lead > 10 && s1.a0 === 120 && s1.aN === 120, JSON.stringify(s1));
  ok('02 IMAGE: more photograph inside the strokes (gm>0.9), same size/position, world still not shown, prism still at its upside-down start', s2.io === 0 && s2.gm > 0.9 && s2.s === s1.s && s2.a0 === 120, JSON.stringify(s2));
  ok('03 WORLD: the REAL prism is turning (stagger: left ribs well ahead of right ribs), no mask anywhere, word still large & centred', s3.io === 1 && s3.mask === 'none' && s3.a0 < 60 && s3.aN > s3.a0 + 40 && s3.s === s1.s && s3.go === 0, JSON.stringify(s3));
  ok('04 TRAVEL: prism still resolving on the right (the word travels over its final portion), word mid-way between start and final size', s4.a0 === 0 && s4.aN > 20 && s4.aN < s3.aN && s4.s > 1.05 && s4.s < s1.s - 0.2, JSON.stringify(s4));
  ok('05 HEADLINE: prism essentially upright (last ribs within 12°), word in place, "A DIFFERENT" mid-rise, copy not yet', s5.a0 === 0 && s5.aN <= 12 && s5.s === 1 && s5.lead > 2 && s5.lead < 90 && s5.rise === 0, JSON.stringify(s5));
  await click(6); for (let i = 0; i < 6; i++) { await fr(p); await sleep(80); } const s6 = await st();
  ok('06 LIVE = the finished normal hero (done, ribs 0°, word in place, copy visible, no ghost)', s6.open === 'done' && s6.a0 === 0 && s6.aN === 0 && s6.rise === 1 && s6.lead === 0 && s6.s === 1 && s6.gd === 'none', JSON.stringify(s6));
  // upside-down check: at 700 ms the right-hand ribs are still at the start pose. Their picture must be the first banner rotated 180° (not mirrored, not upright).
  await click(1); for (let i = 0; i < 6; i++) { await fr(p); await sleep(80); }
  await p.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = a.effect?.target?.classList?.contains('hw-image') ? 900 : 880; })); await fr(p); await sleep(150); await p.screenshot({ path: '/private/tmp/hw-ud.png' });
  const { execFileSync } = await import('node:child_process');
  const r = execFileSync('python3', ['-c', `
from PIL import Image
S=Image.open('/private/tmp/hw-ud.png').convert('RGB'); W,H=S.size
P=Image.open('/Users/mac/rmz-webf/rmz-website/public/media/hero/identity/frame-01.webp').convert('RGB')
k=max(W/P.width,H/P.height); dw,dh=round(P.width*k),round(P.height*k); P=P.resize((dw,dh)); L=(dw-W)//2; T=(dh-H)//2; P=P.crop((L,T,L+W,T+H))
vars={'upright':P,'rot180':P.rotate(180),'mirrorX':P.transpose(Image.FLIP_LEFT_RIGHT),'flipY':P.transpose(Image.FLIP_TOP_BOTTOM)}
box=(1180,130,1420,330)  # right-hand ribs (still un-turned), clear of the word and the header
sc=S.crop(box); out={}
for n,v in vars.items():
    c=v.crop(box); out[n]=sum(abs(a-b) for x,y in zip(sc.getdata(),c.getdata()) for a,b in zip(x,y))/(240*200*3)
print(' '.join(f'{n}={d:.1f}' for n,d in out.items()))`]).toString().trim();
  const d = Object.fromEntries(r.split(' ').map((x) => x.split('=')));
  ok('right-hand faces show the first banner rotated 180° (closest to rot180, not upright / mirrored / flipped)', +d.rot180 < 30 && +d.rot180 < +d.upright - 10 && +d.rot180 < +d.mirrorX - 10 && +d.rot180 < +d.flipY - 10, r);
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
