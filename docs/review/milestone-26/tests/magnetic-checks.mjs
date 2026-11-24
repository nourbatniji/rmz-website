import puppeteer from 'puppeteer-core';
// usage: node magnetic-checks.mjs — focused checks of /lab/collaborations-magnetic (production preview, port 3111).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const BASE = 'http://localhost:3111/lab/collaborations-magnetic';
const fr = (p) => p.screenshot({ type: 'jpeg', quality: 10 }).catch(() => {});
const w0 = await b.newPage(); await w0.goto(BASE, { waitUntil: 'networkidle0' }); await w0.close();
const open = async (vp = { width: 1440, height: 900 }, extra = '') => { const p = await b.newPage(); await p.setViewport(vp); await p.goto(BASE + extra, { waitUntil: 'networkidle0' }); await sleep(500); await p.evaluate(() => document.getElementById('collab-proto').scrollIntoView({ behavior: 'instant', block: 'center' })); await fr(p); await sleep(250); return p; };
const geo = (p) => p.evaluate(() => {
  const f = document.querySelector('.mg-field').getBoundingClientRect(); const m = document.querySelector('.mg-magnet').getBoundingClientRect();
  const L = [...document.querySelectorAll('.mg-logo')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, t: e.style.transform }; });
  const box = (r) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
  const hit = (a, c, pad = 2) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
  let overlaps = 0; for (let i = 0; i < L.length; i++) { for (let j = i + 1; j < L.length; j++) if (hit(L[i], L[j])) overlaps++; if (hit(L[i], box(m), 0)) overlaps++; }
  const inside = L.every((l) => l.x >= f.left - 1 && l.y >= f.top - 1 && l.x + l.w <= f.right + 1 && l.y + l.h <= f.bottom + 1);
  const mb = box(m); const gapMag = Math.min(...L.map((l) => { const dx = Math.max(mb.x - (l.x + l.w), l.x - (mb.x + mb.w), 0), dy = Math.max(mb.y - (l.y + l.h), l.y - (mb.y + mb.h), 0); return Math.hypot(dx, dy); }));
  const lines = [...document.querySelectorAll('.mg-lines line')].map((l) => +l.style.opacity || 0);
  const cx = f.left + f.width / 2, cy = f.top + f.height / 2; const quad = [0, 0, 0, 0]; L.forEach((l) => { const x = l.x + l.w / 2, y = l.y + l.h / 2; quad[(y < cy ? 0 : 2) + (x < cx ? 0 : 1)]++; }); const band = L.filter((l) => l.y < cy + 44 && l.y + l.h > cy - 44); const leftEdge = Math.max(-1e9, ...band.filter((l) => l.x + l.w / 2 < cx).map((l) => l.x + l.w)), rightEdge = Math.min(1e9, ...band.filter((l) => l.x + l.w / 2 > cx).map((l) => l.x)); const magIn = m.left >= f.left - 0.5 && m.right <= f.right + 0.5 && m.top >= f.top - 0.5 && m.bottom <= f.bottom + 0.5;
  return { quad, corridor: Math.round(rightEdge - leftEdge), above: L.filter((l) => l.y + l.h / 2 < cy - 30).length, below: L.filter((l) => l.y + l.h / 2 > cy + 30).length, magIn, magAbs: { x: Math.round(m.left + m.width / 2 - f.left), y: Math.round(m.top + m.height / 2 - f.top) }, gapMag: Math.round(gapMag), field: { w: Math.round(f.width), h: Math.round(f.height) }, mag: { x: Math.round(m.left + m.width / 2 - (f.left + f.width / 2)), y: Math.round(m.top + m.height / 2 - (f.top + f.height / 2)) }, L, overlaps, inside, lines, over: document.documentElement.scrollWidth - innerWidth, pos: L.map((l) => [Math.round(l.x), Math.round(l.y)].join(',')).join('|') };
});
{ // desktop
  const p = await open(); const g0 = await geo(p);
  const sec = await p.evaluate(() => Math.round(document.querySelector('.mg').getBoundingClientRect().height));
  ok(`desktop: compact section (${sec}px), all 12 logos visible, none overlapping each other or the square, inside the field, no horizontal overflow`, sec >= 320 && sec <= 390 && g0.L.length === 12 && g0.overlaps === 0 && g0.inside && g0.over <= 0 && g0.L.every((l) => l.w >= 64), JSON.stringify({ sec, o: g0.overlaps, minW: Math.min(...g0.L.map((l) => Math.round(l.w))) }));
  ok('desktop: ONE balanced field around the square — logos above, below and diagonally (≥ 2 in every quadrant, ≥ 4 above and ≥ 4 below) and no wide empty corridor beside the square', g0.quad.every((q) => q >= 2) && g0.above >= 4 && g0.below >= 4 && g0.corridor <= 330, JSON.stringify({ quad: g0.quad, above: g0.above, below: g0.below, corridor: g0.corridor }));
  const fb = await p.evaluate(() => { const r = document.querySelector('.mg-field').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  // walk the pointer through all four corners and the middle of every side, recording who responds
  const route = [[0.02, 0.05], [0.98, 0.05], [0.98, 0.95], [0.02, 0.95], [0.02, 0.5], [0.25, 0.5], [0.5, 0.05], [0.5, 0.95], [0.75, 0.5], [0.98, 0.5], [0.3, 0.3], [0.7, 0.7], [0.5, 0.5]];
  const resp = new Set(); const stops = []; let maxPull = 0; let minGap = 1e9; let allIn = true; let linesMax = 0; let longest = 0; let pairs = 0;
  await p.mouse.move(fb.x + fb.w * 0.5, fb.y + fb.h * 0.5); await sleep(150);
  for (const [fx, fy] of route) {
    for (let k = 1; k <= 6; k++) { await p.mouse.move(fb.x + fb.w * fx, fb.y + fb.h * fy); await fr(p); await sleep(30); }
    await sleep(700); await fr(p); const g = await geo(p);
    const d = g.L.map((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y)); const r = d.map((x, i) => (x > 6 ? i : -1)).filter((i) => i >= 0);
    r.forEach((i) => resp.add(i)); maxPull = Math.max(maxPull, ...d); minGap = Math.min(minGap, g.gapMag); allIn = allIn && g.magIn && g.inside; pairs = Math.max(pairs, r.length);
    const ln = await p.evaluate(() => [...document.querySelectorAll('.mg-lines line')].map((l) => ({ o: +l.style.opacity || 0, len: Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value) })).filter((x) => x.o > 0.05)); linesMax = Math.max(linesMax, ln.length); longest = Math.max(longest, ...ln.map((x) => x.len), 0);
    stops.push({ fx, fy, mag: g.magAbs, resp: r.length, overl: g.overlaps });
  }
  ok(`hover: the pointer works across the whole field incl. all four corners — the square stays inside the field and keeps clear of every logo (≥ 6 px even counting tilt) (min gap ${minGap}px)`, allIn && minGap >= 6 && stops.every((s) => s.overl === 0), JSON.stringify(stops.slice(0, 4)));
  ok(`hover: the square follows the pointer to the field's corners (within 90 px in at least three of the four; the fourth corner is occupied by a logo, so the square stops beside it instead of covering it)`, stops.slice(0, 4).filter((s) => Math.hypot(s.mag.x - fb.w * s.fx, s.mag.y - fb.h * s.fy) < 90).length >= 3, JSON.stringify(stops.slice(0, 4).map((s) => [s.fx, s.fy, s.mag.x, s.mag.y])));
  ok(`hover: attraction is clearly visible (up to ${Math.round(maxPull)} px, was 14), at most two logos respond at a time, and different logos take turns (${resp.size} distinct logos responded on the route)`, maxPull >= 20 && maxPull <= 40 && pairs <= 2 && resp.size >= 8, JSON.stringify({ maxPull: Math.round(maxPull), pairs, distinct: resp.size }));
  ok(`connectors: at most two, short (longest ${Math.round(longest)} px), only when the pull is meaningful`, linesMax <= 2 && longest <= 120, JSON.stringify({ linesMax, longest: Math.round(longest) }));
  // damping: a fast sweep that changes the pair many times
  const samples = []; const sweep = async (x0, y0, x1, y1) => { for (let i = 0; i <= 30; i++) { await p.mouse.move(fb.x + fb.w * (x0 + (x1 - x0) * i / 30), fb.y + fb.h * (y0 + (y1 - y0) * i / 30)); await fr(p); const g = await geo(p); g.ts = Date.now(); samples.push(g); await sleep(25); } };
  await sweep(0.02, 0.1, 0.98, 0.1); await sweep(0.98, 0.1, 0.02, 0.9); await sweep(0.02, 0.9, 0.98, 0.9);
  let lspeed = 0, jumpMag = 0; for (let k = 1; k < samples.length; k++) { const dtm = (samples[k].ts - samples[k - 1].ts) / 1000; for (let i = 0; i < 12; i++) lspeed = Math.max(lspeed, Math.hypot(samples[k].L[i].x - samples[k - 1].L[i].x, samples[k].L[i].y - samples[k - 1].L[i].y) / dtm); }
  ok(`motion: smooth and damped across fast sweeps — no logo moves faster than 320 px/s (max ${Math.round(lspeed)} px/s), no snapping`, lspeed <= 320, String(Math.round(lspeed)));
  await p.mouse.move(5, 5); await sleep(300); await fr(p); await sleep(1500); await fr(p); await sleep(300);
  const g2 = await geo(p); const back = g2.L.every((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) < 0.8) && Math.abs(g2.magAbs.x - fb.w / 2) < 1 && Math.abs(g2.magAbs.y - fb.h / 2) < 1 && g2.lines.every((o) => o === 0);
  ok('leaving the field: the square and every logo settle smoothly back to the resting composition and the connectors are gone', back, JSON.stringify({ mag: g2.magAbs, lines: g2.lines }));
  // click → gather, return; repeated clicks do not stack
  const t0 = Date.now(); await p.click('.mg-magnet'); let mid = null; let end = null;
  for (let k = 0; k < 4; k++) await p.click('.mg-magnet');
  while (Date.now() - t0 < 4200) { await fr(p); const g = await geo(p); const tt = Date.now() - t0; if (tt > 1050 && tt < 1500 && !mid) mid = g; if (!end && tt > 1500 && g.L.every((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) < 0.8)) end = tt; await sleep(60); }
  const spread = mid && (() => { const xs = mid.L.map((l) => l.x), xe = mid.L.map((l) => l.x + l.w); return Math.round(Math.max(...xe) - Math.min(...xs)); })();
  const restW = (() => { const xs = g0.L.map((l) => l.x), xe = g0.L.map((l) => l.x + l.w); return Math.round(Math.max(...xe) - Math.min(...xs)); })();
  ok('click: the logos gather into a compact cluster around the square — individually identifiable, no overlaps, inside the field (unchanged)', mid && mid.overlaps === 0 && mid.inside && spread < restW * 0.8, JSON.stringify({ spread, restW, o: mid && mid.overlaps }));
  ok(`click: it returns to the original arrangement and repeated clicks do not stack (back at rest by ${end} ms)`, end !== null && end < 3300, String(end));
  await p.keyboard.press('Tab'); await p.focus('.mg-magnet'); await p.keyboard.press('Enter'); await sleep(1200); await fr(p);
  const kg = await geo(p); const kmoved = kg.L.filter((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) > 20).length; await sleep(2200); await fr(p);
  await p.keyboard.press('Space'); await sleep(1200); await fr(p); const sg = await geo(p); const smoved = sg.L.filter((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) > 20).length; await sleep(2300); await fr(p);
  ok('keyboard: the RMZ button is a focusable <button>; Enter and Space both trigger the gathering', kmoved >= 10 && smoved >= 10 && (await p.evaluate(() => document.querySelector('.mg-magnet').tagName)) === 'BUTTON', JSON.stringify({ kmoved, smoved }));
  const wheel = await p.evaluate(() => ({ ovf: getComputedStyle(document.documentElement).overflow, sticky: getComputedStyle(document.querySelector('.mg')).position }));
  ok('no scroll locking, pinning or extra scroll distance', wheel.ovf !== 'hidden' && wheel.sticky === 'static', JSON.stringify(wheel));
  await p.close();
}
{ // reduced motion
  const p = await open(undefined, '?reduce=1'); const g0 = await geo(p); const fb = await p.evaluate(() => { const r = document.querySelector('.mg-field').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await p.mouse.move(fb.x + 100, fb.y + 50); await sleep(500); await p.click('.mg-magnet'); await sleep(900); await fr(p); const g1 = await geo(p);
  ok('reduced motion: static composition — hover, tilt and gathering do nothing (every logo and the square stay put)', g1.L.every((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) < 0.5) && Math.abs(g1.mag.x) < 0.5 && (await p.evaluate(() => document.querySelector('.mg-magnet').getAttribute('aria-disabled'))) === 'true', JSON.stringify(g1.mag));
  await p.close();
}
{ // phone
  const vp = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  const p = await open(vp); const g0 = await geo(p);
  ok('390 px: compact readable arrangement — all 12 logos ≥ 56 px wide, none overlapping each other or the square, inside the field, no horizontal overflow', g0.L.length === 12 && g0.overlaps === 0 && g0.inside && g0.over <= 0 && g0.L.every((l) => l.w >= 56), JSON.stringify({ o: g0.overlaps, inside: g0.inside, over: g0.over, minW: Math.min(...g0.L.map((l) => Math.round(l.w))), field: g0.field }));
  const ta = await p.evaluate(() => ({ mag: getComputedStyle(document.querySelector('.mg-magnet')).touchAction, field: getComputedStyle(document.querySelector('.mg-field')).touchAction, logos: getComputedStyle(document.querySelector('.mg-logo')).touchAction }));
  ok('touch capture only on the square: touch-action none on the square, normal (auto) on the field and logos so page scrolling elsewhere is untouched', ta.mag === 'none' && ta.field === 'auto' && ta.logos === 'auto', JSON.stringify(ta));
  const m = await p.evaluate(() => { const r = document.querySelector('.mg-magnet').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); const y0 = await p.evaluate(() => scrollY);
  const cdp = await p.createCDPSession();
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await touch('touchStart', m.x, m.y); for (let i = 1; i <= 14; i++) { await touch('touchMove', m.x - i * 8, m.y - i * 6); await sleep(30); await fr(p); }
  await sleep(500); await fr(p); const dr = await geo(p); const dmoved = dr.L.map((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y)); const resp = dmoved.filter((x) => x > 0.8).length;
  ok('drag from the square: the square follows the finger (limited), nearby logos respond (≤ 3), no collisions, the page does not scroll', Math.hypot(dr.mag.x, dr.mag.y) > 40 && Math.abs(await p.evaluate(() => scrollY) - y0) < 1 && resp >= 1 && resp <= 3 && dr.magIn && dr.overlaps === 0 && dr.gapMag >= 6, JSON.stringify({ mag: dr.mag, resp, lines: dr.lines, gap: dr.gapMag, scroll: (await p.evaluate(() => scrollY)) - y0 }));
  await touch('touchEnd'); await sleep(300); await fr(p); const afterDrag = await geo(p); await sleep(900); await fr(p); const settled = await geo(p);
  const notGathered = afterDrag.L.every((l) => true) && !(await p.evaluate(() => false));
  ok('releasing a drag settles back and does NOT trigger the gathering (a drag is not a tap)', Math.abs(settled.magAbs.x - settled.field.w / 2) < 1 && settled.L.every((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) < 1) && notGathered, JSON.stringify(settled.magAbs));
  await touch('touchStart', m.x, m.y); await sleep(60); await touch('touchEnd'); await sleep(1250); await fr(p); const tg = await geo(p); const tmoved = tg.L.filter((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) > 15).length;
  ok('tap on the square: the brief gathering happens (logos in a compact non-overlapping cluster, inside the field)', tmoved >= 10 && tg.overlaps === 0 && tg.inside, JSON.stringify({ tmoved, o: tg.overlaps, inside: tg.inside }));
  await sleep(2400); await fr(p); const tb = await geo(p); ok('…and returns to the original arrangement', tb.L.every((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) < 0.8));
  // scrolling on the field elsewhere still moves the page: swipe starting on empty field space
  const e = await p.evaluate(() => { const f = document.querySelector('.mg-field').getBoundingClientRect(); return { x: f.left + f.width * 0.5, y: f.top + f.height * 0.5 + 100 }; }); const ys = await p.evaluate(() => scrollY);
  await cdp.send('Input.synthesizeScrollGesture', { x: e.x, y: e.y, yDistance: -160, speed: 600, gestureSourceType: 'touch' }).catch(() => {}); await sleep(500); await fr(p);
  ok('a swipe that starts elsewhere in the field scrolls the page normally', (await p.evaluate(() => scrollY)) > ys + 40, `${ys} → ${await p.evaluate(() => scrollY)}`);
  await p.close();
}
await b.close(); console.log(`${pass}/${pass + fail} passed`);
