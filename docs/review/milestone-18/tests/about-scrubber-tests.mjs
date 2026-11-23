import puppeteer from 'puppeteer-core';
// Scripted Chrome (software WebGL). About scrubber: scroll-linked stage, crossfade, jump list, no wheel capture, static fallbacks, liquid effect.
// Run against a build WITHOUT database content (DATABASE_URL unreachable) so the built-in About copy is used.
const URL = process.argv[2] || 'http://localhost:3111/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] });
async function open(vp, o = {}) {
  const p = await b.newPage(); await p.bringToFront(); await p.setViewport(vp); if (o.rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); if (o.nojs) await p.setJavaScriptEnabled(false);
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(1100); return p;
}
const geo = (p) => p.evaluate(() => { const t = document.querySelector('.ab-track'), s = document.querySelector('.ab-stage'); const cs = getComputedStyle(document.documentElement); return { top: t.getBoundingClientRect().top + scrollY, h: t.offsetHeight, sh: s.offsetHeight, hh: parseFloat(cs.getPropertyValue('--header-h')), n: document.querySelectorAll('[data-ab-img]').length, pos: getComputedStyle(s).position }; });
const at = async (p, g0, pp) => { const g = await geo(p); /* re-measured: content above can settle after load */ await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g.top - g.hh + pp * (g.h - g.sh)); await p.screenshot({ type: 'jpeg', quality: 10 }); /* forces a frame so the scroll event + rAF are delivered in headless */ await sleep(450); };
const state = (p) => p.evaluate(() => { const vh = innerHeight; const im = [...document.querySelectorAll('[data-ab-img]')].map((e) => +getComputedStyle(e).opacity); const tx = [...document.querySelectorAll('[data-ab-txt]')].map((e) => +getComputedStyle(e).opacity); const st = document.querySelector('.ab-stage').getBoundingClientRect(); const cur = tx.findIndex((o) => o > 0.9); const imgR = cur >= 0 ? document.querySelectorAll('[data-ab-img]')[cur].getBoundingClientRect() : null; const tR = cur >= 0 ? document.querySelectorAll('.ab-title')[cur].getBoundingClientRect() : null; return { im, tx, cnt: document.querySelector('[data-ab-count]').textContent.trim(), stTop: st.top, imgBottom: imgR && imgR.bottom, imgTop: imgR && imgR.top, titleRight: tR && tR.right, vh, vw: innerWidth }; });

for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 600 }, { width: 1920, height: 1080 }, { width: 1024, height: 768 }]) {
  console.log(`\n── ${vp.width}x${vp.height}`);
  const p = await open(vp); const g = await geo(p); const N = g.n;
  ok('3 About steps; stage is sticky under the header', N === 3 && g.pos === 'sticky', JSON.stringify({ N, pos: g.pos }));
  for (let i = 0; i < N; i++) {
    await at(p, g, (i + 0.5) / N); const s = await state(p);
    ok(`step ${i + 1}: its image + text fully shown, the others hidden, counter correct`, s.im[i] > 0.98 && s.tx[i] > 0.98 && s.im.every((o, j) => j === i || o < 0.02) && s.tx.every((o, j) => j === i || o < 0.02) && s.cnt === `0${i + 1} / 0${N}`, JSON.stringify(s));
    ok('  stage seated under the header; image inside the stage; title inside the width', Math.abs(s.stTop - g.hh) <= 1 && s.imgTop >= g.hh && s.imgBottom <= s.vh && s.titleRight <= s.vw, JSON.stringify({ stTop: s.stTop, imgTop: s.imgTop, imgBottom: s.imgBottom, titleRight: s.titleRight, vw: s.vw }));
  }
  await at(p, g, 0); let s = await state(p); ok('start of the track: step 1 fully shown (no blank wait)', s.im[0] > 0.98 && s.tx[0] > 0.98, JSON.stringify(s));
  await at(p, g, 1); s = await state(p); ok('end of the track: last step fully shown', s.im[N - 1] > 0.98 && s.tx[N - 1] > 0.98, JSON.stringify(s));
  // crossfade: at every sampled position images always sum to ≥ 0.9 and two titles are never both clearly visible
  let minSum = 9, maxBothText = 0;
  for (let k = 0; k <= 40; k++) { await at(p, g, k / 40); const q = await state(p); minSum = Math.min(minSum, q.im.reduce((a, c) => a + c, 0)); const t = [...q.tx].sort((a, c) => c - a); maxBothText = Math.max(maxBothText, t[1]); }
  ok('image crossfade never dips to empty (sum of opacities ≥ 0.9 everywhere)', minSum >= 0.9, `min ${minSum.toFixed(2)}`);
  ok('two titles never overlap visibly (second-strongest text opacity ≤ 0.5)', maxBothText <= 0.5, `max ${maxBothText.toFixed(2)}`);
  // wheel never captured
  await at(p, g, 0.2); await p.evaluate(() => { window.__dp = false; addEventListener('wheel', (e) => { if (e.defaultPrevented) window.__dp = true; }, { passive: true }); });
  const y0 = await p.evaluate(() => scrollY); await p.mouse.move(vp.width / 2, vp.height / 2); for (let i = 0; i < 4; i++) { await p.mouse.wheel({ deltaY: 80 }); await sleep(40); } await sleep(400);
  ok('wheel over the stage scrolls the page (never captured)', (await p.evaluate(() => scrollY)) > y0 + 200 && !(await p.evaluate(() => window.__dp)));
  // jump list
  await at(p, g, 0); await p.click('.ab-idx[data-ab-idx="2"]'); await sleep(1800); s = await state(p); ok('index click jumps to step 3', s.tx[2] > 0.98, JSON.stringify(s.tx));
  await p.click('.ab-idx[data-ab-idx="0"]'); await sleep(1800); s = await state(p); ok('…and back to step 1', s.tx[0] > 0.98, JSON.stringify(s.tx));
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

console.log('\n── liquid effect (1440x900)');
{ const p = await open({ width: 1440, height: 900 }); const g = await geo(p); await at(p, g, 0.5 / 3); await sleep(500);
  const r = await p.evaluate(() => { const e = document.querySelectorAll('[data-ab-img]')[0].getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width, h: e.height }; });
  await p.mouse.move(r.x + 30, r.y + r.h * 0.5); for (let i = 1; i <= 20; i++) { await p.mouse.move(r.x + 30 + (r.w - 60) * i / 20, r.y + r.h * (0.5 + 0.15 * Math.sin(i / 3))); await sleep(30); }
  const vis = await p.evaluate(() => { const c = document.querySelector('canvas.ab-liquid'); return c ? { v: getComputedStyle(c).visibility, inImg: c.parentElement.hasAttribute('data-liquid'), pe: getComputedStyle(c).pointerEvents } : null; });
  ok('pointer over the current image at rest: liquid canvas appears inside the image, pointer-events none', vis && vis.v === 'visible' && vis.inImg && vis.pe === 'none', JSON.stringify(vis));
  await sleep(1700); ok('…and goes away (sharp original) after settling', (await p.evaluate(() => getComputedStyle(document.querySelector('canvas.ab-liquid')).visibility)) === 'hidden');
  await p.mouse.move(100, 800); await p.evaluate(() => scrollBy(0, 300)); await sleep(100);
  ok('while scrolling the effect is disarmed', (await p.evaluate(() => getComputedStyle(document.querySelector('canvas.ab-liquid')).visibility)) === 'hidden');
  await p.close(); }

console.log('\n── fallbacks');
{ const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const m = await p.evaluate(() => ({ flip: getComputedStyle(document.querySelector('.ab-flip')).display, st: getComputedStyle(document.querySelector('.ab-static')).display, items: document.querySelectorAll('.ab-item').length, ow: document.documentElement.scrollWidth <= innerWidth, imgs: [...document.querySelectorAll('.ab-simg img')].every((i) => i.complete || true) }));
  ok('mobile: plain vertical list (3 items), no stage, no horizontal overflow', m.flip === 'none' && m.st === 'block' && m.items === 3 && m.ow, JSON.stringify(m)); await p.close(); }
{ const p = await open({ width: 1440, height: 900 }, { rm: true }); const m = await p.evaluate(() => ({ flip: getComputedStyle(document.querySelector('.ab-flip')).display, st: getComputedStyle(document.querySelector('.ab-static')).display, canvas: !!document.querySelector('canvas.ab-liquid') }));
  await p.mouse.move(700, 400); await p.mouse.move(900, 450);
  ok('reduced motion: static list, no stage, no canvas', m.flip === 'none' && m.st === 'block' && !m.canvas, JSON.stringify(m)); await p.close(); }
{ const p = await open({ width: 1440, height: 900 }, { nojs: true }); const m = await p.evaluate(() => ({ flip: getComputedStyle(document.querySelector('.ab-flip')).display, st: getComputedStyle(document.querySelector('.ab-static')).display, items: document.querySelectorAll('.ab-item').length }));
  ok('JavaScript off: the same static list', m.flip === 'none' && m.st === 'block' && m.items === 3, JSON.stringify(m)); await p.close(); }
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
