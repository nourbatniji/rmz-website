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
  const pr = PH.find((x) => x[1] === 'running'), pd = PH.find((x) => x[1] === 'done'); ok('opening ≈2.85 s from start to handoff', pd[0] - pr[0] >= 2650 && pd[0] - pr[0] <= 3250, `${pd[0] - pr[0]} ms`);
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
{ // review stages 01–06 (preview-only controls seek the REAL animations/transition) + one continuous photo through the whole word + the prism is the reveal
  const w0 = await b.newPage(); await w0.goto(URL, { waitUntil: 'networkidle0' }); await w0.close();
  const { execFileSync } = await import('node:child_process');
  const mk = async (url) => { const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(url, { waitUntil: 'networkidle0' }); await sleep(3600); return p; };
  const clickOn = (p, n) => p.evaluate((n) => [...document.querySelectorAll('[data-hw-preview] button[title]')][n - 1].click(), n);
  const stOn = (p) => p.evaluate(() => { const r = document.querySelector('.hw-root'); const g = document.querySelector('.hw-phrase[data-state=active] .hw-ghost'); const it = document.querySelector('.hw-phrase[data-state=active] .hw-line.t-italic'); const m = new DOMMatrix(getComputedStyle(it).transform);
    const ribs = [...document.querySelectorAll('button.cursor-pointer > div > div')]; const ang = (el) => { const q = new DOMMatrix(getComputedStyle(el).transform); return Math.round(Math.atan2(q.m13, q.m11) * 180 / Math.PI); }; const img = document.querySelector('.hw-image');
    return { open: r.dataset.open, p: +getComputedStyle(g).getPropertyValue('--hw-p'), q: +getComputedStyle(g).getPropertyValue('--hw-q'), d: +getComputedStyle(g).getPropertyValue('--hw-d'), gd: getComputedStyle(g).display, mask: getComputedStyle(img).maskImage, imgAnims: img.getAnimations().length, s: Math.round(m.a * 100) / 100, rise: +getComputedStyle(document.querySelector('.hw-root p.hw-rise')).opacity, lead: new DOMMatrix(getComputedStyle(document.querySelector('.hw-phrase[data-state=active] .hw-line.t-display > span')).transform).m42, a0: Math.abs(ang(ribs[0])), aN: Math.abs(ang(ribs.at(-1))) }; });
  const stageOn = async (p, n, file) => { await clickOn(p, n); for (let i = 0; i < 6; i++) { await fr(p); await sleep(80); } if (file) await p.screenshot({ path: file }); return stOn(p); };
  const bandLum = (f) => +execFileSync('python3', ['-c', `
from PIL import Image
im=Image.open('${f}').convert('L')
def m(b): c=im.crop(b); d=list(c.getdata()); return sum(d)/len(d)
print(round(max(m((60,150,1380,330)), m((60,660,1380,860))),1))`]).toString().trim();
  // fraction of the word's (red) letter pixels that show the photograph instead of red, in 5 horizontal segments: a continuous fill has all segments high; patches/scatter would not
  const segs = (red, photo) => execFileSync('python3', ['-c', `
from PIL import Image
a=Image.open('${red}').convert('RGB'); b=Image.open('${photo}').convert('RGB'); W,H=a.size; pa=a.load(); pb=b.load()
isred=lambda c: c[0]>170 and c[1]<70 and c[2]<60
xs=[x for x in range(0,W,2) for y in range(330,640,3) if isred(pa[x,y])]
x0,x1=min(xs),max(xs); n=[0]*5; t=[0]*5
for x in range(x0,x1,2):
  k=min(4,int((x-x0)/(x1-x0)*5))
  for y in range(330,640,3):
    if isred(pa[x,y]): t[k]+=1; n[k]+= (not isred(pb[x,y]))
print(' '.join(f'{n[i]/max(t[i],1):.2f}' for i in range(5)), x1-x0)`]).toString().trim().split(' ').map(Number);
  const p = await mk(URL);
  const s1 = await stageOn(p, 1, '/private/tmp/hw-s1.png'); const s2 = await stageOn(p, 2, '/private/tmp/hw-s2.png');
  const s3 = await stageOn(p, 3, '/private/tmp/hw-s3.png'); const s4 = await stageOn(p, 4); const s5 = await stageOn(p, 5, '/private/tmp/hw-s5.png');
  const l1 = bandLum('/private/tmp/hw-s1.png'), l2 = bandLum('/private/tmp/hw-s2.png');
  ok('01 WORD: solid red word, large & centred, nothing outside the letters (near-black), no photograph yet (sweep not started), prism turned away', s1.open === 'running' && l1 < 22 && s1.p < 0.05 && s1.s > 1.5 && s1.rise === 0 && s1.a0 === 120 && s1.aN === 120, JSON.stringify([l1, s1]));
  ok('02 PHOTO: the sweep has finished (p=1), red not yet returning (q=0), subtle drift in progress, same word size/position, still nothing outside the letters, prism still turned away', s2.p > 0.99 && s2.q === 0 && s2.d > 0.4 && s2.d < 0.7 && s2.s === s1.s && l2 < 22 && s2.a0 === 120 && s2.mask === 'none' && s2.imgAnims === 0, JSON.stringify([l2, s2]));
  const sg = segs('/private/tmp/hw-s1.png', '/private/tmp/hw-s2.png');
  ok('the photograph fills the WHOLE word as one continuous image (≥ 70 % of the letter pixels show it in every fifth of the word, left → right; no scattered patches)', sg.slice(0, 5).every((v) => v >= 0.7), sg.join(' '));
  ok('03 RETURN: red sweeping back (0<q<1) while the prism has begun to turn, ribs leaving the start pose', s3.q > 0.05 && s3.q < 0.95 && s3.p > 0.99 && s3.a0 < 120, JSON.stringify(s3));
  ok('04 WORLD: red fully restored (q=1), the REAL prism turning (left ribs ahead of right), word still large & centred', s4.q > 0.99 && s4.a0 < 70 && s4.aN > s4.a0 + 30 && s4.s === s1.s, JSON.stringify(s4));
  ok('05 TRAVEL: left ribs resolved, word mid-way between start and final size', s5.a0 === 0 && s5.s > 1.05 && s5.s < s1.s - 0.2, JSON.stringify(s5));
  await clickOn(p, 6); for (let i = 0; i < 6; i++) { await fr(p); await sleep(80); } const s6 = await stOn(p);
  ok('06 LIVE = the finished normal hero (done, ribs 0°, word in place, copy visible, ghost gone)', s6.open === 'done' && s6.a0 === 0 && s6.aN === 0 && s6.rise === 1 && s6.lead === 0 && s6.s === 1 && s6.gd === 'none', JSON.stringify(s6));
  const r = execFileSync('python3', ['-c', `
from PIL import Image
S=Image.open('/private/tmp/hw-s5.png').convert('RGB'); W,H=S.size
P=Image.open('/Users/mac/rmz-webf/rmz-website/public/media/hero/identity/frame-01.webp').convert('RGB')
k=max(W/P.width,H/P.height); dw,dh=round(P.width*k),round(P.height*k); P=P.resize((dw,dh)); L=(dw-W)//2; T=(dh-H)//2; P=P.crop((L,T,L+W,T+H))
vars={'upright':P,'rot180':P.rotate(180),'mirrorX':P.transpose(Image.FLIP_LEFT_RIGHT),'flipY':P.transpose(Image.FLIP_TOP_BOTTOM)}
box=(40,130,360,330); sc=S.crop(box); out={}
for n,v in vars.items():
    c=v.crop(box); out[n]=sum(abs(a-b) for x,y in zip(sc.getdata(),c.getdata()) for a,b in zip(x,y))/(320*200*3)
print(' '.join(f'{n}={d:.1f}' for n,d in out.items()))`]).toString().trim();
  const d = Object.fromEntries(r.split(' ').map((x) => x.split('=')));
  ok('the faces that have turned into view show the first banner UPRIGHT (the prism reveal is unchanged)', +d.upright < 30 && +d.upright < +d.rot180 - 10 && +d.upright < +d.mirrorX - 10 && +d.upright < +d.flipY - 10, r);
  await p.close();
  // content independence: the same treatment with two other existing banner images (preview-only ?ghost=1|2; no content or assets changed)
  for (const g of [1, 2]) {
    const q = await mk(URL + '?ghost=' + g); await stageOn(q, 1, `/private/tmp/hw-g${g}-1.png`); await stageOn(q, 2, `/private/tmp/hw-g${g}-2.png`); await q.screenshot({ path: `/private/tmp/hw-g${g}-2.png` });
    const sgx = segs(`/private/tmp/hw-g${g}-1.png`, `/private/tmp/hw-g${g}-2.png`);
    ok(`banner ${g + 1}'s image through the same word: one continuous fill in every fifth (the movement works across images)`, sgx.slice(0, 5).every((v) => v >= 0.6), sgx.join(' '));
    await q.close();
  }
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
