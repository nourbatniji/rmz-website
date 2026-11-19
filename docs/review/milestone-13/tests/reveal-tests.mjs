import puppeteer from 'puppeteer-core';
// usage: node reveal-tests.mjs [url]   — Minds desktop scroll-linked downward reveal
const URL = process.argv[2] || 'http://localhost:3111/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
async function open(vp, rm) { const p = await b.newPage(); await p.setViewport(vp); if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(900); return p; }
const D = { width: 1440, height: 900 };
// put the list's top edge `lt` px below the viewport top (instantly)
const at = async (p, lt, wait = 160) => { await p.evaluate((lt) => { const l = document.querySelector('.minds-list').getBoundingClientRect(); scrollTo(0, scrollY + l.top - lt); }, lt); await sleep(wait); };
const rp = (p) => p.evaluate(() => +document.querySelector('.minds-list').style.getPropertyValue('--rp'));
// how many px of each column are painted below the list top (scans real pixels: non-dark = revealed), capped by the viewport
const heights = async (p) => { const b64 = await p.screenshot({ encoding: 'base64' }); return p.evaluate(async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); const k = im.width / innerWidth; const l = document.querySelector('.minds-list').getBoundingClientRect(); const cols = [...document.querySelectorAll('.minds-list > li')].map((e) => { const r = e.getBoundingClientRect(); return e.classList.contains('mind-open') ? r.left + 6 : r.left + r.width / 2; }); const y0 = Math.max(96, Math.round(l.top + 2)); const out = []; for (const x of cols) { let h = 0; for (let y = y0; y < innerHeight; y++) { const d = g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; if (d[0] + d[1] + d[2] < 120) break; h++; } out.push(h + Math.round(y0 - l.top)); } return out; }, b64); };
const slots = (p) => p.evaluate(() => [...document.querySelectorAll('.minds-list > li')].map((e) => +e.style.getPropertyValue('--o')));
const px = async (p, pts) => { const b64 = await p.screenshot({ encoding: 'base64' }); return p.evaluate(async (b64, pts) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const k = im.width / innerWidth; return pts.map(([x, y]) => [...g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data].slice(0, 3)); }, b64, pts); };
const DARK = [15, 15, 14], RED = [213, 37, 24]; const near = (c, t, tol = 8) => c.every((v, i) => Math.abs(v - t[i]) <= tol);
const sameish = (a, c, tol) => a.length === c.length && a.every((v, i) => Math.abs(v - c[i]) <= tol);

// ───────── desktop 1440×900 ─────────
{
  const p = await open(D);
  ok('scroll-linked reveal is active on desktop (data-reveal="on"); no timed entrance attribute on Minds', await p.evaluate(() => document.querySelector('#minds').dataset.reveal === 'on' && !document.querySelector('#minds').dataset.entrance));
  const sl = await slots(p); ok(`each column has one slot of a shuffled permutation of 0–7 (${sl.join('')})`, new Set(sl).size === 8 && sl.every((v) => v >= 0 && v <= 7));
  const sec0 = await p.evaluate(() => ({ h: document.querySelector('#minds').getBoundingClientRect().height, lh: document.querySelector('.minds-list').getBoundingClientRect().height, sh: document.documentElement.scrollHeight }));
  // 1. start state: short portions attached to the junction, the rest dark
  await at(p, 700); const h0 = await heights(p); const r0 = await rp(p);
  const colX = await p.evaluate(() => [...document.querySelectorAll('.minds-list > li')].map((e) => { const r = e.getBoundingClientRect(); return e.classList.contains('mind-open') ? r.left + 6 : r.left + r.width / 2; }));
  const lt0 = await p.evaluate(() => document.querySelector('.minds-list').getBoundingClientRect().top); const below = await px(p, colX.map((x) => [x, lt0 + 120])); const spaceAbove = await px(p, colX.map((x) => [x, lt0 - 40]));
  ok(`start: rp = ${r0}; only short stubs (${Math.min(...h0)}–${Math.max(...h0)} px ≈ 8 % of 760) hang from the junction on all eight columns`, r0 === 0 && h0.every((h) => h >= 52 && h <= 70), h0.join());
  ok('the unrevealed area is the dark page background (not a red band); the 80 px breathing space above the columns stays red', below.every((c) => near(c, DARK)) && spaceAbove.every((c) => near(c, RED)), JSON.stringify([below[0], spaceAbove[0]]));
  // 2. forward scan through the whole range, then back along the same path
  const POS = []; for (let lt = 620; lt >= 110; lt -= 30) POS.push(lt);
  const fwd = []; for (const lt of POS) { await at(p, lt, 120); fwd.push({ lt, h: await heights(p), rp: await rp(p) }); }
  const bwd = []; for (const lt of [...POS].reverse()) { await at(p, lt, 120); bwd.push({ lt, h: await heights(p), rp: await rp(p) }); }
  bwd.reverse();
  ok('growth is downward and monotonic: each column only ever gets longer as you scroll down', fwd.every((s, i) => i === 0 || s.h.every((v, k) => v >= fwd[i - 1].h[k] - 2)), fwd.map((s) => Math.round(s.rp * 100)).join(','));
  ok('scrolling back retracts them along the SAME path (every sampled position matches the forward pass within 3 px; --rp identical)', fwd.every((s, i) => sameish(s.h, bwd[i].h, 3) && Math.abs(s.rp - bwd[i].rp) < 0.002), fwd.map((s, i) => Math.max(...s.h.map((v, k) => Math.abs(v - bwd[i].h[k])))).join(','));
  const lo = fwd.find((s) => s.rp > 0), hi = fwd.find((s) => s.rp >= 0.999); const range = lo && hi ? (fwd.indexOf(hi) - fwd.indexOf(lo) + 1) * 30 : 0;
  const rpNow = fwd.map((s) => s.rp); const firstGrow = fwd.findIndex((s) => s.rp > 0); const full = fwd.findIndex((s) => s.rp >= 0.999);
  ok(`bounded reveal range ≈ 450 px of scrolling (growth begins at list-top ${fwd[firstGrow - 1] ? fwd[firstGrow - 1].lt : '?'}, completes by ${fwd[full] ? fwd[full].lt : '?'}; measured ≈ ${range} px)`, firstGrow > 0 && full > firstGrow && range >= 400 && range <= 520, rpNow.join(','));
  // 3. irregular, shuffled growth
  const mid = fwd.find((s) => Math.abs(s.rp - 0.45) < 0.1); const spread = Math.max(...mid.h) - Math.min(...mid.h);
  const bySlot = [...mid.h.keys()].sort((a, c) => sl[a] - sl[c]).map((k) => mid.h[k]);
  ok(`irregular growth: columns are at different lengths mid-way (spread ${spread} px) and ordered by their shuffled slot (earlier slot = longer), not left → right`, spread >= 100 && bySlot.every((v, i) => i === 0 || v <= bySlot[i - 1] + 4) && (sl.join() === '0,1,2,3,4,5,6,7' || !mid.h.every((v, i) => i === 0 || v <= mid.h[i - 1] + 4)), `h ${mid.h.join(',')} slots ${sl.join(',')}`);
  ok('the shuffled order is stable during reverse scrolling (slots unchanged throughout)', (await slots(p)).join() === sl.join());
  // 4. completes at full height with the existing layout
  await at(p, 100, 200); const hf = await heights(p); const full760 = await p.evaluate(() => [...document.querySelectorAll('.mind')].map((e) => getComputedStyle(e).clipPath));
  ok('all eight columns finish at their full existing height (760 px) — clip fully open at the end of the range', hf.every((h) => h >= 755) && full760.every((c) => /inset\(0px 0px 0(%|px)( 0px)?\)/.test(c)), hf.join() + ' ' + full760[0]);
  // 5. stopping halfway holds the exact partial state
  await at(p, 380, 200); const hA = await heights(p); await sleep(1500); const hB = await heights(p); ok('stopping mid-way holds the exact partial state (no drift over 1.5 s)', sameish(hA, hB, 1), hA.join() + ' / ' + hB.join());
  // 6. fast scrolling / jumps are position-based
  await at(p, 700, 60); const j1 = await heights(p); await at(p, 100, 60); const j2 = await heights(p); await at(p, 700, 60); const j3 = await heights(p);
  ok('fast scroll (instant jumps): the state always matches the position — stubs → complete → stubs, with no catch-up animation', j1.every((h) => h <= 70) && j2.every((h) => h >= 755) && sameish(j1, j3, 2), `${j1[0]} → ${j2[0]} → ${j3[0]}`);
  await at(p, -300, 60); const past = await p.evaluate(() => ({ rp: +document.querySelector('.minds-list').style.getPropertyValue('--rp'), clip: [...document.querySelectorAll('.mind')].map((e) => getComputedStyle(e).clipPath) })); ok('scrolled past the section: fully complete (rp = 1)', past.rp === 1 && past.clip.every((c) => /inset\(0px 0px 0(%|px)( 0px)?\)/.test(c)));
  // 7. nothing but clipping: no transform / translate / opacity / animations, top edge fixed, layout reserved
  const props = []; for (const lt of [700, 520, 400, 280, 160]) { await at(p, lt, 100); props.push(await p.evaluate(() => { const l = document.querySelector('.minds-list').getBoundingClientRect(); const m = [...document.querySelectorAll('.mind')]; return { op: m.every((e) => getComputedStyle(e).opacity === '1'), tr: m.every((e) => getComputedStyle(e).translate === 'none' && getComputedStyle(e).transform === 'none' && getComputedStyle(e).scale === 'none'), tops: m.every((e) => Math.abs(e.getBoundingClientRect().top - l.top) < 0.5 && Math.abs(e.getBoundingClientRect().height - 760) < 0.5), anim: document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#minds')).length, sec: document.querySelector('#minds').getBoundingClientRect().height, lh: l.height, sh: document.documentElement.scrollHeight, clipTop: m.every((e) => /^inset\(0px /.test(getComputedStyle(e).clipPath)) }; })); }
  ok('no upward translation, scaling, opacity fade or timed animation at any position — only the bottom clip changes (top inset stays 0)', props.every((x) => x.op && x.tr && x.anim === 0 && x.clipTop), JSON.stringify(props[0]));
  ok('top edges stay anchored at the junction and every column keeps its full 760 px layout height; the section/list/document heights never change (no layout shift)', props.every((x) => x.tops && x.sec === sec0.h && x.lh === sec0.lh && x.sh === sec0.sh), JSON.stringify([sec0, props[2].sec, props[2].sh]));
  // 8. interaction does not conflict with the reveal
  await at(p, 380, 200); const hb = await heights(p); const cx = await p.evaluate(() => { const r = document.querySelectorAll('#minds .mind')[6].getBoundingClientRect(); return [r.left + r.width / 2, document.querySelector('.minds-list').getBoundingClientRect().top + 40]; }); await p.mouse.click(cx[0], cx[1]); await sleep(1100);
  const st = await p.evaluate(() => ({ open: [...document.querySelectorAll('.mind')].map((e) => e.classList.contains('mind-open')), exp: [...document.querySelectorAll('.mind-cover')].map((e) => e.getAttribute('aria-expanded')) })); const ha = await heights(p);
  ok('clicking a column mid-reveal opens it normally (one open column) and does not disturb the reveal state', st.open[6] && st.open.filter(Boolean).length === 1 && st.exp[6] === 'true', JSON.stringify(st.open));
  ok('…the other columns keep their partial length while the layout expands (no jump), and scrolling on continues the reveal', sameish(hb.filter((_, i) => i !== 2 && i !== 6), ha.filter((_, i) => i !== 2 && i !== 6), 4), hb.join() + ' / ' + ha.join());
  await at(p, 100, 200); const hAfter = await heights(p); ok('after expanding a column, the reveal still completes (all full height)', hAfter.every((h) => h >= 755), hAfter.join());
  // 9. keyboard focus
  await at(p, 640, 200); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await sleep(100); const before = await heights(p); await p.evaluate(() => document.querySelectorAll('#minds .mind-cover')[4].focus({ preventScroll: true })); await sleep(150); const afterF = await heights(p);
  ok('keyboard focus into a partly revealed column reveals that column fully (it extends to the viewport bottom); the others stay as they were', afterF[4] > before[4] + 100 && sameish(before.filter((_, i) => i !== 4), afterF.filter((_, i) => i !== 4), 2), before.join() + ' / ' + afterF.join());
  // 10. native scrolling: wheel works, nothing captured
  const dp = await p.evaluate(() => { const ev = new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }); document.querySelector('#minds').dispatchEvent(ev); return ev.defaultPrevented; });
  await at(p, 500, 100); await p.mouse.move(700, 450); const y0 = await p.evaluate(() => scrollY); await p.mouse.wheel({ deltaY: 120 }); await sleep(400); const y1 = await p.evaluate(() => scrollY); const r1 = await rp(p);
  ok('native scrolling only: no wheel handler, a real wheel scrolls and advances the reveal (no lock, no click-to-continue)', dp === false && y1 > y0 + 80 && r1 > 0, `${y0}→${y1}, rp ${r1}`);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────── other viewports: the front stays on screen while it grows ─────────
for (const [w, h] of [[1280, 720], [1920, 1080]]) {
  const p = await open({ width: w, height: h });
  const D2 = Math.min(500, Math.max(380, Math.round(h * 0.5))); const L0 = h + D2 - 760 - 20;
  await at(p, L0 + 40); const a = await rp(p); await at(p, L0 - D2 - 10); const z = await rp(p);
  ok(`${w}×${h}: window recalculated (range ${D2} px): rp = 0 just before growth starts and 1 once it has finished`, a === 0 && z === 1, `${a} / ${z}`);
  const vis = []; for (const f of [0.25, 0.5, 0.75]) { await at(p, Math.round(L0 - D2 * f), 150); const hs = await heights(p); const lt = await p.evaluate(() => document.querySelector('.minds-list').getBoundingClientRect().top); const med = [...hs].sort((x, y) => x - y)[3]; vis.push({ median: med, room: h - lt, frontInView: med < h - lt - 4 }); }
  ok(`${w}×${h}: the growing fronts are on screen during the reveal (the median column is still growing inside the viewport at 25 / 50 / 75 %), so the effect is visible before the section is passed`, vis.every((v) => v.frontInView), JSON.stringify(vis));
  const fin = await (async () => { await at(p, L0 - D2, 200); return heights(p); })(); ok(`${w}×${h}: completes at full height`, fin.every((x) => x >= Math.min(755, h - (L0 - D2) - 4)), fin.join());
  await p.close();
}

// ───────── reduced motion, JS off, mobile: complete layout immediately ─────────
{
  const r = await open(D, true); await at(r, 700); const hr = await heights(r);
  ok('reduced motion: no scroll reveal — complete columns immediately (no data-reveal, no clip)', await r.evaluate(() => !document.querySelector('#minds').dataset.reveal && [...document.querySelectorAll('.mind')].every((e) => getComputedStyle(e).clipPath === 'none')) && hr.every((h) => h >= 190), hr.join()); await r.close();
  const j = await b.newPage(); await j.setViewport(D); await j.setJavaScriptEnabled(false); await j.goto(URL, { waitUntil: 'networkidle0' }); await at(j, 700, 200); const hj = await heights(j);
  ok('JavaScript off: complete columns immediately (server markup, nothing clipped)', await j.evaluate(() => !document.querySelector('#minds').dataset.reveal && [...document.querySelectorAll('.mind')].every((e) => getComputedStyle(e).clipPath === 'none')) && hj.every((h) => h >= 190), hj.join()); await j.close();
  const m = await open({ width: 390, height: 844, isMobile: true, hasTouch: true });
  ok('mobile accordion: not clipped, no scroll reveal (its own entrance is unchanged)', await m.evaluate(() => !document.querySelector('#minds').dataset.reveal && [...document.querySelectorAll('.mind')].every((e) => getComputedStyle(e).clipPath === 'none') && document.querySelector('#minds').dataset.entrance === 'pre'));
  ok('no horizontal overflow on mobile', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await m.close();
  // resizing across the breakpoint switches modes cleanly
  const q = await open(D); await q.setViewport({ width: 900, height: 800 }); await sleep(500); const mobileOff = await q.evaluate(() => !document.querySelector('#minds').dataset.reveal && [...document.querySelectorAll('.mind')].every((e) => getComputedStyle(e).clipPath === 'none'));
  await q.setViewport(D); await sleep(500); const back = await q.evaluate(() => document.querySelector('#minds').dataset.reveal === 'on');
  ok('resizing below 1024 px drops the reveal (complete accordion); back to desktop restores it', mobileOff && back); await q.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
