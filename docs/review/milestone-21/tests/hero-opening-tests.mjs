import puppeteer from 'puppeteer-core';
// usage: node hero-opening-tests.mjs — focused checks of the opening animation (production preview, port 3111).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const URL = 'http://localhost:3111/lab/hero-three-worlds';
const frame = (p) => p.screenshot({ type: 'jpeg', quality: 10 }).catch(() => {});
const snap = (p) => p.evaluate(() => {
  const root = document.querySelector('.hw-root'); const wrap = document.querySelector('.hw-ribs'); const ribs = [...document.querySelectorAll('.hw-rib')];
  const ty = (el) => { const t = getComputedStyle(el).translate; return t === 'none' ? 0 : parseFloat(t.split(' ')[1] || '0'); };
  const dys = ribs.map(ty); const sc = getComputedStyle(wrap).scale; const wall = wrap.parentElement.getBoundingClientRect();
  const cv = ribs.map((r) => r.querySelector('canvas').getBoundingClientRect()); // the face-0 slice canvases
  const cover = cv.every((r) => r.top <= wall.top + 0.6 && r.bottom >= wall.bottom - 0.6); // no slice exposes the background top or bottom
  const act = document.querySelector('.hw-phrase[data-state=active]'); const lead = act?.querySelector('.hw-line.t-display > span'), it = act?.querySelector('.hw-line.t-italic'), its = it?.querySelector('span');
  const m = (el) => (el ? Math.round(new DOMMatrix(getComputedStyle(el).transform).m42) : null);
  const clip = it ? getComputedStyle(it).clipPath : null; const clipR = clip === null ? null : clip === 'none' ? 0 : parseFloat((clip.match(/inset\(\S+ ([\d.]+)%/) || [0, -1])[1]);
  const desc = document.querySelector('.hw-root p.hw-rise'); const hdr = document.querySelector('header');
  return { open: root?.dataset.open, dys, maxDy: Math.round(Math.max(...dys.map(Math.abs)) * 10) / 10, sc, cover, lead: m(lead), itTy: m(its), clipR: clipR === null ? null : +clipR, desc: desc ? +(+getComputedStyle(desc).opacity).toFixed(2) : null, hdr: hdr ? getComputedStyle(hdr).opacity + '/' + getComputedStyle(hdr).visibility : null, y: scrollY, ovf: getComputedStyle(document.documentElement).overflowY + '/' + getComputedStyle(document.body).overflowY, counter: document.body.innerText.match(/0\d \/ 03/)?.[0] };
});
const sample = async (p, ms, step = 60) => { const t0 = Date.now(), out = []; while (Date.now() - t0 < ms) { await frame(p); out.push({ t: Date.now() - t0, ...(await snap(p)) }); await sleep(step); } return out; };
{ // 1 — first entry
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  // records every data-open change in-page (frame-accurate), with the first rib's angle at that moment
  await p.evaluateOnNewDocument(() => { window.__ph = []; const rec = (el) => { const r = document.querySelector('.hw-root button.cursor-pointer > div > div'); const m = r ? new DOMMatrix(getComputedStyle(r).transform) : null; window.__ph.push({ v: el.dataset.open, t: Math.round(performance.now()), a: m ? Math.round(Math.atan2(m.m13, m.m11) * 180 / Math.PI) : null }); };
    new MutationObserver((l) => l.forEach((x) => x.target.dataset && x.target.classList.contains('hw-root') && rec(x.target))).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-open'] });
    new MutationObserver(() => { const e = document.querySelector('.hw-root'); if (e && !window.__seen) { window.__seen = 1; rec(e); } }).observe(document, { subtree: true, childList: true }); });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  const S = await sample(p, 3400, 40); const PH = await p.evaluate(() => window.__ph);
  const phases = PH.map((x) => x.v).join('>');
  ok('phase sequence pending → armed → running → done', phases === 'pending>armed>running>done', phases);
  const pa = PH.find((x) => x.v === 'armed'), pr = PH.find((x) => x.v === 'running'), pd = PH.find((x) => x.v === 'done');
  ok('armed → running within 2 frames of the first image paint (no waiting period)', pr.t - pa.t < 250, `${pr.t - pa.t} ms`);
  ok('opening + copy reveal + handoff takes 1.6–1.9 s', pd.t - pr.t >= 1600 && pd.t - pr.t <= 1900, `${pd.t - pr.t}`);
  const early = S.filter((x) => x.open === 'running' || x.open === 'armed')[0];
  ok('offsets are 12–30 px at 900 px tall, a wave (both directions), overscan > 1', early.maxDy >= 24 && early.maxDy <= 31 && early.dys.some((v) => v > 6) && early.dys.some((v) => v < -6) && parseFloat(early.sc) > 1.04, JSON.stringify({ m: early.maxDy, sc: early.sc }));
  const face = early.dys.slice(13, 17).map((v) => Math.abs(v)), outer = early.dys.slice(0, 6).concat(early.dys.slice(-6)).map((v) => Math.abs(v));
  ok('less displacement near the face than at the sides', Math.max(...face) < 0.5 * Math.max(...outer), JSON.stringify({ face: Math.max(...face), outer: Math.max(...outer) }));
  const run = S.filter((x) => x.open === 'running');
  ok('slices never expose the background (coverage at every sampled frame)', S.filter((x) => x.open !== 'pending').every((x) => x.cover), `${S.filter((x) => !x.cover).length} frames`);
  const mid = run.find((x) => x.maxDy > 3 && x.maxDy < early.maxDy - 3);
  const cOff = mid && Math.max(...mid.dys.slice(12, 18).map(Math.abs)), eOff = mid && Math.max(...mid.dys.slice(0, 4).concat(mid.dys.slice(-4)).map(Math.abs));
  ok('resolves from the centre outward (centre slices settle before the outer ones)', !!mid && cOff < eOff, JSON.stringify({ cOff, eOff }));
  ok('"perspective." is revealed by a horizontal mask only (lettering never moves vertically), lead rises', S.filter((x) => x.open !== 'pending' && x.open !== 'done').every((x) => x.itTy === 0) && run.some((x) => x.clipR > 5 && x.clipR < 95) && S.some((x) => x.lead > 5), JSON.stringify(run.map((x) => [x.clipR, x.lead]).slice(0, 12)));
  const fin = S.at(-1);
  ok('ends in the exact normal state: every offset 0, no overscan, headline & copy in place', fin.open === 'done' && fin.dys.every((v) => v === 0) && fin.sc === 'none' && fin.lead === 0 && fin.itTy === 0 && (fin.clipR === 0) && fin.desc === 1, JSON.stringify(fin));
  ok('header visible & opaque throughout', S.every((x) => x.hdr === '1/visible'), [...new Set(S.map((x) => x.hdr))].join());
  ok('scrolling is never locked and scroll position untouched', S.every((x) => !/hidden/.test(x.ovf)) && S.every((x) => x.y === 0), [...new Set(S.map((x) => x.ovf))].join());
  const t1 = Date.now(); const c0 = (await snap(p)).counter; await sleep(3000); const c1 = (await snap(p)).counter;
  ok('automatic countdown starts after the opening (still 01 / 03 3 s after done)', c0 === '01 / 03' && c1 === '01 / 03', `${c0} ${c1}`);
  await sleep(3200); ok('…then advances (≈5 s after done)', (await snap(p)).counter === '02 / 03');
  // replay
  await p.evaluate(() => scrollTo({ top: 250, behavior: 'instant' })); await frame(p); await sleep(200);
  const n0 = (await p.evaluate(() => window.__ph.length));
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Replay opening/.test(x.textContent)).click()); const R = await sample(p, 3600, 50); const rp = (await p.evaluate((n) => window.__ph.slice(n).map((x) => x.v).join('>'), n0));
  ok('replay control plays the opening again from the first banner (and scrolls to top)', rp === 'armed>running>done' && R.at(-1).y === 0 && R.at(-1).counter === '01 / 03', rp + JSON.stringify(R.at(-1)));
  // second visit in the same tab → skipped
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); const K = await sample(p, 500, 40);
  ok('second entry in the same tab session: skipped', K.every((x) => x.open !== 'armed' && x.open !== 'running'), [...new Set(K.map((x) => x.open))].join());
  await p.reload({ waitUntil: 'domcontentloaded' }); const K2 = await sample(p, 400, 40);
  ok('reload: skipped', K2.every((x) => x.open !== 'armed' && x.open !== 'running'));
  await p.close();
}
{ // 2 — interruptions
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  let s; for (let i = 0; i < 80; i++) { await frame(p); s = await snap(p); if (s.open === 'running') break; await sleep(30); }
  await sleep(250); await p.mouse.move(700, 500); await p.mouse.wheel({ deltaY: 120 }); await p.evaluate(() => scrollBy(0, 120)); await frame(p); await sleep(150); await frame(p); s = await snap(p);
  ok('scroll during the opening finishes it immediately (done, ribs 0°, text visible) and keeps the scroll position', s.open === 'done' && s.dys.every((v) => v === 0) && s.sc === 'none' && s.lead === 0 && s.desc === 1 && s.y >= 110, JSON.stringify(s));
  await p.close();
  const q = await b.newPage(); await q.setViewport({ width: 1440, height: 900 }); await q.goto(URL, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 80; i++) { await frame(q); s = await snap(q); if (s.open === 'running') break; await sleep(30); }
  await sleep(300); await q.evaluate(() => [...document.querySelectorAll('[aria-label="Banners"] button')].find((x) => /campaign/i.test(x.textContent)).click()); await sleep(2600); await frame(q);
  const f = await q.evaluate(() => ({ st: [...document.querySelectorAll('.hw-phrase')].map((x) => x.dataset.state).join(), c: document.body.innerText.match(/0\d \/ 03/)?.[0], t: document.querySelector('.hw-phrase[data-state=active]').textContent }));
  ok('banner selected during the opening: opening finished, selection honoured (campaign phrase, 02 / 03)', f.st === 'idle,active,idle' && f.c === '02 / 03' && /IMPOSSIBLE/.test(f.t), JSON.stringify(f));
  await q.close();
}
{ // 3 — skips and fallbacks
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(URL + '#work', { waitUntil: 'domcontentloaded' }); const A = await sample(p, 500, 40);
  ok('section-anchor entry (#work): skipped', A.every((x) => x.open !== 'armed' && x.open !== 'running'), [...new Set(A.map((x) => x.open))].join()); await p.close();
  const q = await b.newPage(); await q.setViewport({ width: 1440, height: 900 }); await q.evaluateOnNewDocument(() => { const mo = new MutationObserver(() => { if (document.getElementById('work')) { scrollTo(0, 300); mo.disconnect(); } }); mo.observe(document, { subtree: true, childList: true }); }); // emulates a restored scroll position before hydration await q.goto(URL, { waitUntil: 'domcontentloaded' }); const B = await sample(q, 500, 40);
  ok('restored scroll position: skipped, scroll position kept', B.every((x) => x.open !== 'armed' && x.open !== 'running') && B.at(-1).y >= 250, JSON.stringify(B.at(-1))); await q.close();
  const r = await b.newPage(); await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await r.setViewport({ width: 1440, height: 900 }); await r.goto(URL, { waitUntil: 'domcontentloaded' }); const C = await sample(r, 500, 40);
  ok('reduced motion: normal hero immediately (no armed/running, text visible, ribs 0°)', C.every((x) => x.open !== 'armed' && x.open !== 'running') && C.at(-1).dys.every((v) => v === 0) && C.at(-1).lead === 0 && C.at(-1).desc === 1, JSON.stringify(C.at(-1))); await r.close();
  const n = await b.newPage(); await n.setJavaScriptEnabled(false); await n.setViewport({ width: 1440, height: 900 }); await n.goto(URL, { waitUntil: 'load' });
  const nj = await n.evaluate(() => { const a = document.querySelector('.hw-phrase[data-state=active] .hw-line > span'); const it = document.querySelector('.hw-phrase[data-state=active] .hw-line.t-italic'); const d = document.querySelector('.hw-root p.hw-rise'); const po = document.querySelector('[data-hw-poster]'); return { ty: new DOMMatrix(getComputedStyle(a).transform).m42, clip: getComputedStyle(it).clipPath, desc: getComputedStyle(d).opacity, poster: getComputedStyle(po).opacity }; });
  ok('no JavaScript: static hero visible (poster, headline in place, copy visible)', nj.ty === 0 && nj.clip === 'none' && nj.desc === '1' && nj.poster === '1', JSON.stringify(nj)); await n.close();
  const m = await b.newPage(); await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await m.goto(URL, { waitUntil: 'domcontentloaded' }); const M = await sample(m, 3000, 50);
  const mp = [...new Set(M.map((x) => x.open))].join('>'); ok('mobile: opening plays and completes in the normal composition', /running>done$/.test(mp) && M.at(-1).dys.every((v) => v === 0) && M.at(-1).lead === 0 && M.at(-1).desc === 1 && M.filter((x) => x.open !== 'pending').every((x) => x.cover), mp + JSON.stringify(M.at(-1))); await m.close();
}
await b.close(); console.log(`${pass}/${pass + fail} passed`);
