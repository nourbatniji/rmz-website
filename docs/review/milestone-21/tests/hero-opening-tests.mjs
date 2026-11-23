import puppeteer from 'puppeteer-core';
// usage: node hero-opening-tests.mjs — focused checks of the opening animation (production preview, port 3111).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const URL = 'http://localhost:3111/lab/hero-three-worlds';
const frame = (p) => p.screenshot({ type: 'jpeg', quality: 10 }).catch(() => {});
const snap = (p) => p.evaluate(() => {
  const root = document.querySelector('.hw-root'); const ribs = [...document.querySelectorAll('.hw-root button.cursor-pointer > div > div')];
  const ang = (el) => { const m = new DOMMatrix(getComputedStyle(el).transform); return Math.round(Math.atan2(m.m13 !== undefined ? m.m13 : 0, m.m11) * 1800 / Math.PI) / 10; };
  const act = document.querySelector('.hw-phrase[data-state=active]'); const sp = act ? [...act.querySelectorAll('.hw-line > span')].map((s) => Math.round(new DOMMatrix(getComputedStyle(s).transform).m42)) : null;
  const desc = document.querySelector('.hw-root p.hw-rise'); const hdr = document.querySelector('header');
  return { open: root?.dataset.open, r0: ribs.length ? ang(ribs[0]) : null, rN: ribs.length ? ang(ribs.at(-1)) : null, ty: sp, desc: desc ? +(+getComputedStyle(desc).opacity).toFixed(2) : null, hdr: hdr ? getComputedStyle(hdr).opacity + '/' + getComputedStyle(hdr).visibility : null, y: scrollY, ovf: getComputedStyle(document.documentElement).overflowY + '/' + getComputedStyle(document.body).overflowY, counter: document.body.innerText.match(/0\d \/ 03/)?.[0] };
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
  const run = S.filter((x) => x.open === 'running'); const tRun = run[0]?.t ?? 0;
  const pa = PH.find((x) => x.v === 'armed'), pr = PH.find((x) => x.v === 'running'), pd = PH.find((x) => x.v === 'done');
  ok('start pose is narrow & partially turned (ribs ≈ 64°) when armed', pa && Math.abs(pa.a) >= 60, JSON.stringify(PH));
  ok('armed → running quickly (first image already painted; no waiting period)', pr.t - pa.t < 250, `${pr.t - pa.t} ms`);
  ok('stagger: left ribs lead the right ones while turning', run.some((x) => Math.abs(x.r0) < Math.abs(x.rN) - 8), JSON.stringify(run.slice(3, 4)));
  const settled = S.find((x) => x.open && Math.abs(x.r0) < 0.5 && Math.abs(x.rN) < 0.5 && x.t > tRun);
  ok('opening complete (all text/controls in, handed over) 1.9–2.3 s after it starts', pd.t - pr.t >= 1850 && pd.t - pr.t <= 2400, `${pd.t - pr.t}`);
  ok('ribs settle ≈1.2–1.6 s after start (±frame cadence)', settled && settled.t - tRun >= 1000 && settled.t - tRun <= 1900, `${settled && settled.t - tRun}`);
  const early = run.filter((x) => x.t - tRun < 500);
  ok('headline masked and copy hidden while the ribs are still turning', early.every((x) => x.ty && x.ty[0] > 10 && x.desc === 0), JSON.stringify(early.at(-1)));
  const fin = S.at(-1);
  ok('finishes in the exact normal composition (ribs 0°, headline in place, copy visible)', fin.open === 'done' && fin.r0 === 0 && fin.rN === 0 && fin.ty.every((v) => v === 0) && fin.desc === 1, JSON.stringify(fin));
  ok('header visible & opaque throughout', S.every((x) => x.hdr === '1/visible'), [...new Set(S.map((x) => x.hdr))].join());
  ok('scrolling is never locked (overflow normal) and scroll position untouched', S.every((x) => !/hidden/.test(x.ovf)) && S.every((x) => x.y === 0), [...new Set(S.map((x) => x.ovf))].join());
  const t1 = Date.now(); const c0 = (await snap(p)).counter; await sleep(3600); const c1 = (await snap(p)).counter;
  ok('automatic countdown starts after the opening (still 01 / 03 3.6 s after done)', c0 === '01 / 03' && c1 === '01 / 03', `${c0} ${c1}`);
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
  ok('scroll during the opening finishes it immediately (done, ribs 0°, text visible) and keeps the scroll position', s.open === 'done' && s.r0 === 0 && s.rN === 0 && s.ty.every((v) => v === 0) && s.desc === 1 && s.y >= 110, JSON.stringify(s));
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
  const q = await b.newPage(); await q.setViewport({ width: 1440, height: 900 }); await q.evaluateOnNewDocument(() => addEventListener('DOMContentLoaded', () => scrollTo(0, 300))); await q.goto(URL, { waitUntil: 'domcontentloaded' }); const B = await sample(q, 500, 40);
  ok('restored scroll position: skipped, scroll position kept', B.every((x) => x.open !== 'armed' && x.open !== 'running') && B.at(-1).y >= 250, JSON.stringify(B.at(-1))); await q.close();
  const r = await b.newPage(); await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await r.setViewport({ width: 1440, height: 900 }); await r.goto(URL, { waitUntil: 'domcontentloaded' }); const C = await sample(r, 500, 40);
  ok('reduced motion: normal hero immediately (no armed/running, text visible, ribs 0°)', C.every((x) => x.open !== 'armed' && x.open !== 'running') && C.at(-1).r0 === 0 && C.at(-1).ty.every((v) => v === 0) && C.at(-1).desc === 1, JSON.stringify(C.at(-1))); await r.close();
  const n = await b.newPage(); await n.setJavaScriptEnabled(false); await n.setViewport({ width: 1440, height: 900 }); await n.goto(URL, { waitUntil: 'load' });
  const nj = await n.evaluate(() => { const a = document.querySelector('.hw-phrase[data-state=active] .hw-line > span'); const d = document.querySelector('.hw-root p.hw-rise'); return { ty: new DOMMatrix(getComputedStyle(a).transform).m42, desc: getComputedStyle(d).opacity, txt: a.textContent }; });
  ok('no JavaScript: static hero visible (headline in place, copy visible)', nj.ty === 0 && nj.desc === '1', JSON.stringify(nj)); await n.close();
  const m = await b.newPage(); await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await m.goto(URL, { waitUntil: 'domcontentloaded' }); const M = await sample(m, 3000, 50);
  const mp = [...new Set(M.map((x) => x.open))].join('>'); ok('mobile: opening plays and completes in the normal composition', /running>done$/.test(mp) && M.at(-1).r0 === 0 && M.at(-1).ty.every((v) => v === 0) && M.at(-1).desc === 1, mp + JSON.stringify(M.at(-1))); await m.close();
}
await b.close(); console.log(`${pass}/${pass + fail} passed`);
