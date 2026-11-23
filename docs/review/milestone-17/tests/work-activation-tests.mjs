import puppeteer from 'puppeteer-core';
// usage: node work-activation-tests.mjs [url] — Selected Work ("Work · Spatial collection"): wheel navigation activates only once the stage is aligned below the header.
// SCRIPTED testing: Chrome (headless, real trusted wheel input via CDP Input.dispatchMouseEvent type=mouseWheel). Not a real trackpad / device.
const URL = process.argv[2] || 'http://localhost:3111/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
async function open(vp) {
  const p = await b.newPage(); await p.setViewport(vp); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(1200); return p;
}
const geo = (p) => p.evaluate(() => {
  const tr = document.querySelector('.wk-track'), pin = document.querySelector('.wk-pin');
  const hh = Math.max(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')), document.querySelector('header').getBoundingClientRect().bottom);
  const T = tr.getBoundingClientRect().top + scrollY;
  return { T, hh, trH: tr.offsetHeight, pinH: pin.offsetHeight, vh: innerHeight, sticky: getComputedStyle(pin).position === 'sticky' };
});
const counter = (p) => p.evaluate(() => document.querySelector('.wk-ctl .wk-nm')?.textContent.trim());
const st = (p) => p.evaluate(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); const pin = r('.wk-pin'), head = r('.wk-head'), ctl = r('.wk-ctl'); const f = document.querySelector('.wk-bs[tabindex="0"]'); const c = f?.getBoundingClientRect(); const cap = f?.querySelector('.bcap')?.getBoundingClientRect(); return { y: scrollY, pinTop: pin.top, pinBottom: pin.bottom, headTop: head.top, ctlBottom: ctl.bottom, cardTop: c?.top, capBottom: cap?.bottom, vh: innerHeight }; });
const goTo = async (p, y) => { await p.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await sleep(250); };
// a wheel burst: n events of delta d at 16 ms (momentum: decays by k each event)
async function burst(p, x, y, d, n, k = 1, gap = 16) { await p.mouse.move(x, y); let v = d; for (let i = 0; i < n; i++) { await p.mouse.wheel({ deltaY: v }); v *= k; await sleep(gap); } }
const hit = (p) => p.evaluate(() => { const f = document.querySelector('.wk-bs[tabindex="0"]').getBoundingClientRect(); return { x: f.left + f.width / 2, y: f.top + f.height / 2 }; });

const ONLY = process.argv[3];
for (const [name, vp] of [['1440x900', { width: 1440, height: 900 }], ['1280x600 short', { width: 1280, height: 600 }], ['1366x640 short', { width: 1366, height: 640 }], ['1024x768', { width: 1024, height: 768 }], ['1920x1080', { width: 1920, height: 1080 }]].filter(([n]) => !ONLY || n.startsWith(ONLY))) {
  console.log('\n── ' + name);
  const p = await open(vp); const g = await geo(p); const N = (await counter(p)).split(' / ')[1];
  ok('stage is sticky with a short dwell (not a long track)', g.sticky && g.trH - g.pinH > 100 && g.trH - g.pinH <= 0.3 * g.pinH + 5, `dwell=${g.trH - g.pinH}px of stage ${g.pinH}px`);
  const a0 = async () => { const q = await geo(p); return q.T - q.hh; }; // first scroll position where the stage is seated below the header (re-measured each time: content above can settle after load)
  // 1 aligned geometry
  await goTo(p, (await a0()) + 30); let s = await st(p);
  ok('aligned: stage top on the header edge, bottom on the viewport edge', Math.abs(s.pinTop - g.hh) <= 1 && s.pinBottom <= s.vh + 1, JSON.stringify({ pinTop: s.pinTop, hh: g.hh, pinBottom: s.pinBottom, vh: s.vh }));
  ok('aligned: heading, main card, caption and controls fully visible', s.headTop >= g.hh - 1 && s.capBottom <= s.vh && s.ctlBottom <= s.vh && s.cardTop >= g.hh, JSON.stringify(s));
  // 2 approach from above: stage 160px too low, pointer over the card → the page scrolls, no card steps
  await goTo(p, (await a0()) - 160); let h = await hit(p); const y0 = (await st(p)).y;
  await burst(p, h.x, Math.min(h.y, vp.height - 40), 60, 3); await sleep(900);
  let s2 = await st(p);
  ok('approach (stage 160px low): wheel over card moves the PAGE', s2.y > y0 + 100, `${y0} → ${s2.y}`);
  ok('approach: no card advanced', (await counter(p)) === `01 / ${N}`, await counter(p));
  // 3 Aligned: wheel over the card steps one project, page does not move
  await goTo(p, (await a0()) + 30); h = await hit(p); const y1 = (await st(p)).y;
  await burst(p, h.x, h.y, 60, 2); await sleep(1000);
  ok('aligned: wheel over card advances one project', (await counter(p)) === `02 / ${N}`, JSON.stringify({ c: await counter(p), s: await st(p), h, hh: g.hh }));
  ok('aligned: page did not move', Math.abs((await st(p)).y - y1) <= 1);
  // 4 pointer outside the cards (over the heading band) → page scrolls
  await sleep(700); const y2 = (await st(p)).y; await burst(p, vp.width / 2, g.hh + 30, 60, 3); await sleep(800);
  ok('aligned but pointer off the cards (heading band): page scrolls, card unchanged', (await st(p)).y > y2 + 60 && (await counter(p)) === `02 / ${N}`, `${y2} → ${(await st(p)).y}`);
  // 5 last card, wheel down releases to the page
  await goTo(p, (await a0()) + 30); h = await hit(p);
  for (let i = 0; i < +N - 1; i++) { await burst(p, h.x, h.y, 60, 2); await sleep(900); h = await hit(p); }
  ok('wheel steps through to the last project', (await counter(p)) === `${N} / ${N}`, await counter(p));
  const y3 = (await st(p)).y; await sleep(400); await burst(p, h.x, h.y, 60, 4); await sleep(900);
  ok('last card + wheel down: releases to the page (page moves, no trap)', (await st(p)).y > y3 + 60, `${y3} → ${(await st(p)).y}`);
  // 6 first card, wheel up releases
  await goTo(p, (await a0()) + 30); h = await hit(p);
  for (let i = 0; i < +N - 1; i++) { await burst(p, h.x, h.y, -60, 2); await sleep(900); h = await hit(p); }
  ok('wheel steps back to the first project', (await counter(p)) === `01 / ${N}`, await counter(p));
  const y4 = (await st(p)).y; await sleep(400); await burst(p, h.x, h.y, -60, 4); await sleep(900);
  ok('first card + wheel up: releases to the page', (await st(p)).y < y4 - 60, `${y4} → ${(await st(p)).y}`);
  // 7 trackpad momentum approach from above: a long decaying stream with the pointer parked over where the card will be; must not step cards
  await goTo(p, (await a0()) - 700); await sleep(300);
  const cx = vp.width / 2, cy = Math.round(g.hh + (vp.height - g.hh) * 0.55);
  await burst(p, cx, cy, 90, 140, 0.965, 16); await sleep(1200);
  let s3 = await st(p);
  ok('momentum approach from above: no card advanced by the approach scroll', (await counter(p)) === `01 / ${N}`, `counter=${await counter(p)} y=${s3.y} (aligned range ${await a0()}…${(await a0()) + g.trH - g.pinH})`);
  // 7b momentum that ENDS inside the aligned zone with the pointer parked over the cards: the tail must not step the cards
  await goTo(p, (await a0()) - 600); await sleep(300);
  await burst(p, cx, cy, 36.7, 70, 0.95, 16); await sleep(150);
  { const q = await st(p); const gg = await geo(p); ok('  (setup) approach momentum came to rest inside the aligned zone', Math.abs(q.pinTop - gg.hh) <= 1, JSON.stringify(q)); }
  ok('momentum that ends inside the aligned zone does not step the cards', (await counter(p)) === `01 / ${N}`, await counter(p));
  await sleep(900); h = await hit(p); await burst(p, h.x, h.y, 60, 2); await sleep(1000);
  ok('  …and a fresh gesture afterwards does', (await counter(p)) === `02 / ${N}`, await counter(p));
  await sleep(900); await burst(p, h.x, h.y, -60, 2); await sleep(1000); // back to project 01
  // 8 entry from below with upward momentum
  await goTo(p, (await a0()) + (g.trH - g.pinH) + 700); await sleep(300);
  await burst(p, cx, cy, -90, 140, 0.965, 16); await sleep(1200);
  ok('momentum entry from below: no card advanced by the approach scroll', (await counter(p)) === `01 / ${N}`, await counter(p));
  // 9 after momentum fully ended, a deliberate wheel over the aligned cards works again
  await goTo(p, (await a0()) + 30); await sleep(500); h = await hit(p); await burst(p, h.x, h.y, 60, 2); await sleep(1000);
  ok('after the approach has ended, a new wheel gesture steps the cards', (await counter(p)) === `02 / ${N}`, await counter(p));
  ok('no page errors', p.errs.length === 0, p.errs.join('|'));
  await p.close();
}

console.log('\n── resize while aligned (1440x900 → 1280x600 → 1440x900)');
{ const p = await open({ width: 1440, height: 900 }); let g = await geo(p); await goTo(p, g.T - g.hh + 30);
  for (const vp of [{ width: 1280, height: 600 }, { width: 1440, height: 900 }]) {
    await p.setViewport(vp); await sleep(700); g = await geo(p); await goTo(p, g.T - g.hh + 30); const s = await st(p); const h = await hit(p);
    ok(`after resize to ${vp.width}x${vp.height}: aligned & fully visible`, Math.abs(s.pinTop - g.hh) <= 1 && s.capBottom <= s.vh && s.ctlBottom <= s.vh && s.headTop >= g.hh - 1, JSON.stringify(s));
    const c0 = await counter(p); await burst(p, h.x, h.y, 60, 2); await sleep(1000); ok('  wheel works after resize', (await counter(p)) !== c0, `${c0} → ${await counter(p)}`);
    await burst(p, h.x, h.y, -60, 2); await sleep(1000);
  }
  await p.close(); }

console.log('\n── mobile 390x844 (unchanged)');
{ const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const g = await geo(p);
  ok('mobile: not sticky, no extra dwell (unchanged)', !g.sticky && g.trH === g.pinH, JSON.stringify(g)); await p.close(); }

console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
