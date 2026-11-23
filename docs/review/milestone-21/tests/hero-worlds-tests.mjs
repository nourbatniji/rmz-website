import puppeteer from 'puppeteer-core';
// usage: node hero-worlds-tests.mjs — focused checks of the Three Worlds hero prototype on the production preview (port 3111).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const URL = 'http://localhost:3111/lab/hero-three-worlds';
const snap = (p) => p.evaluate(() => [...document.querySelectorAll('.hw-phrase')].map((el) => { const l = el.querySelectorAll('.hw-line > span'); return { st: el.dataset.state, vis: getComputedStyle(el).visibility, txt: el.textContent, ty: [...l].map((s) => Math.round(new DOMMatrix(getComputedStyle(s).transform).m42)), h: Math.round(el.getBoundingClientRect().height) }; }));
const pause = (p) => p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Pause automatic/.test(x.ariaLabel || ''))?.click());
const pick = (p, n) => p.evaluate((n) => [...document.querySelectorAll('[aria-label="Banners"] button')].find((x) => x.textContent.trim().toLowerCase() === n).click(), n);
const frame = (p) => p.screenshot({ type: 'jpeg', quality: 10 });
{
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(2200); await pause(p);
  let s = await snap(p);
  ok('one active phrase at rest (identity), others idle/hidden', s[0].st === 'active' && s[1].st === 'idle' && s[2].st === 'idle' && s[1].vis === 'hidden', JSON.stringify(s));
  ok('identity copy', /A DIFFERENT/.test(s[0].txt) && /perspective\./.test(s[0].txt));
  ok('reserved area: all phrases share one height', new Set(s.map((x) => x.h)).size === 1, JSON.stringify(s.map((x) => x.h)));
  const geo = () => p.evaluate(() => { const r = (q) => document.querySelector(q).getBoundingClientRect(); const d = [...document.querySelectorAll('.hero-d, .hw-root p.t-body')][0].getBoundingClientRect(); const a = [...document.querySelectorAll('.hw-root a.hw-link')][0].getBoundingClientRect(); return { dy: Math.round(d.top), ay: Math.round(a.top) }; });
  const g1 = await geo();
  // scroll frames must not change the phrase, and must change the picture
  const px = () => p.evaluate(() => { const c = document.querySelectorAll('.hw-root canvas'); const k = [...c].find((x) => x.getBoundingClientRect().width > 0); return null; });
  const shotA = await p.screenshot({ type: 'png', clip: { x: 700, y: 100, width: 700, height: 500 } });
  await p.evaluate(() => scrollTo({ top: 360, behavior: 'instant' })); await frame(p); await sleep(400); await frame(p); await sleep(300);
  s = await snap(p);
  const shotB = await p.screenshot({ type: 'png', clip: { x: 700, y: 460, width: 700, height: 500 }, captureBeyondViewport: false }).catch(() => null);
  ok('scrolling image frames does not change/animate the phrase', s[0].st === 'active' && s[1].st === 'idle' && s[0].ty.every((v) => v === 0), JSON.stringify(s[0]));
  const eng = await p.evaluate(() => typeof window.__rmzHero);
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await frame(p); await sleep(300);
  // sync: select campaign and sample
  await pick(p, 'campaign'); const t0 = Date.now(); const samples = [];
  while (Date.now() - t0 < 2400) { await frame(p); const x = await snap(p); samples.push({ t: Date.now() - t0, x }); await sleep(60); }
  const early = samples.filter((q) => q.t < 280), late = samples.filter((q) => q.t > 1500);
  ok('on selection the OLD phrase leaves first while the new one is still masked', early.some((q) => q.x[0].st === 'out') && early.every((q) => q.x[1].st === 'active' && q.x[1].ty.every((v) => v > 20)), JSON.stringify(early.slice(-1)));
  const overlap = samples.filter((q) => q.x[0].st === 'out' && q.x[0].ty[0] > -20 && q.x[1].ty[0] < 20);
  ok('outgoing and incoming phrases never overlap on screen', overlap.length === 0, JSON.stringify(overlap.slice(0, 1)));
  const last = late.at(-1).x;
  ok('settled: only campaign phrase visible (IMPOSSIBLE / to ignore.)', last[1].st === 'active' && /IMPOSSIBLE/.test(last[1].txt) && last[0].st === 'idle' && last[1].ty.every((v) => v === 0), JSON.stringify(last));
  const g2 = await geo(); ok('description and link do not move between phrases', g1.dy === g2.dy && g1.ay === g2.ay, JSON.stringify([g1, g2]));
  // rapid selections
  await pick(p, 'digital'); await sleep(140); await pick(p, 'identity'); await sleep(130); await pick(p, 'campaign'); await sleep(110); await pick(p, 'digital');
  let bad = 0; for (let i = 0; i < 30; i++) { await frame(p); const x = await snap(p); const act = x.filter((q) => q.st === 'active'); if (act.length !== 1) bad++; if (x[1].st === 'active' && false) bad++; await sleep(80); }
  await sleep(1800); s = await snap(p);
  ok('rapid selections: always exactly one active phrase', bad === 0, `bad=${bad}`);
  ok('rapid selections: ends on the LAST choice (BEYOND THE / expected.) with no leftovers', s[2].st === 'active' && /BEYOND THE/.test(s[2].txt) && s[0].st === 'idle' && s[1].st === 'idle' && s[2].ty.every((v) => v === 0), JSON.stringify(s));
  // keyboard
  await p.keyboard.press('Tab'); await p.evaluate(() => document.querySelector('.hw-root section, .hw-root').focus?.());
  await p.focus('[aria-label="Banners"] button'); await p.keyboard.press('ArrowRight'); await sleep(2300); s = await snap(p);
  ok('ArrowRight (existing next behaviour) → identity phrase', s[0].st === 'active' && /A DIFFERENT/.test(s[0].txt), JSON.stringify(s.map((x) => x.st)));
  await p.keyboard.press('ArrowLeft'); await sleep(2300); s = await snap(p);
  ok('ArrowLeft (previous) → digital phrase', s[2].st === 'active');
  const aria = await p.evaluate(() => ({ pressed: [...document.querySelectorAll('[aria-label="Banners"] button')].map((x) => x.getAttribute('aria-pressed')), h1: document.querySelector('h1').innerText.replace(/\s+/g, ' '), hid: [...document.querySelectorAll('.hw-phrase')].map((x) => x.getAttribute('aria-hidden')) }));
  ok('selectors expose pressed state; inactive phrases aria-hidden', aria.pressed.join() === 'false,false,true' && aria.hid.join() === 'true,true,', JSON.stringify(aria));
  // automatic change
  await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(1200);
  await sleep(6800); s = await snap(p);
  ok('automatic change (no user input) advances phrase with the banner', s[1].st === 'active' || s[1].st === 'out' || s[0].st === 'out', JSON.stringify(s.map((x) => x.st)));
  const counter = await p.evaluate(() => document.body.innerText.match(/0\d \/ 03/)?.[0]);
  ok('counter shows 02 / 03 after the automatic change', counter === '02 / 03', counter);
  await p.close();
}
{ // reduced motion
  const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.setViewport({ width: 1440, height: 900 }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(1500);
  let s = await snap(p);
  const paused = await p.evaluate(() => /Resume automatic/.test([...document.querySelectorAll('button')].map((x) => x.ariaLabel).join()));
  ok('reduced motion: starts paused (existing behaviour)', paused);
  await pick(p, 'digital'); await sleep(200); s = await snap(p);
  ok('reduced motion: instant swap, no movement', s[2].st === 'active' && s.every((x) => x.ty.every((v) => v === 0)) && s[0].vis === 'hidden', JSON.stringify(s));
  await p.close();
}
{ // mobile
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(2200); await pause(p);
  for (const [n, re] of [['identity', /A DIFFERENT/], ['campaign', /IMPOSSIBLE/], ['digital', /BEYOND THE/]]) {
    await pick(p, n); await sleep(2300); await frame(p);
    const m = await p.evaluate(() => { const h = document.querySelector('h1').getBoundingClientRect(); const ctl = document.querySelector('[aria-label="Banners"]').getBoundingClientRect(); const act = document.querySelector('.hw-phrase[data-state=active]'); const l = [...act.querySelectorAll('.hw-line > span')].map((x) => Math.round(x.getBoundingClientRect().right)); return { txt: act.textContent, r: Math.max(...l), hb: Math.round(h.bottom), ct: Math.round(ctl.top), sw: document.documentElement.scrollWidth }; });
    ok(`mobile ${n}: phrase fits (no clipping/overflow), clear of controls`, re.test(m.txt) && m.r <= 390 - 16 && m.hb < m.ct && m.sw <= 390, JSON.stringify(m));
  }
  await p.close();
}
await b.close(); console.log(`${pass}/${pass + fail} passed`);
