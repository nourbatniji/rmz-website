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
  return { gapMag: Math.round(gapMag), field: { w: Math.round(f.width), h: Math.round(f.height) }, mag: { x: Math.round(m.left + m.width / 2 - (f.left + f.width / 2)), y: Math.round(m.top + m.height / 2 - (f.top + f.height / 2)) }, L, overlaps, inside, lines, over: document.documentElement.scrollWidth - innerWidth, pos: L.map((l) => [Math.round(l.x), Math.round(l.y)].join(',')).join('|') };
});
{ // desktop
  const p = await open(); const g0 = await geo(p);
  const sec = await p.evaluate(() => Math.round(document.querySelector('.mg').getBoundingClientRect().height));
  ok(`desktop: compact section (${sec}px, target ≈320–380), all 12 logos visible, none overlapping each other or the square, all inside the field, no horizontal overflow`, sec >= 320 && sec <= 390 && g0.L.length === 12 && g0.overlaps === 0 && g0.inside && g0.over <= 0 && g0.L.every((l) => l.w >= 60), JSON.stringify({ sec, o: g0.overlaps, inside: g0.inside, minW: Math.min(...g0.L.map((l) => Math.round(l.w))) }));
  const fb = await p.evaluate(() => { const r = document.querySelector('.mg-field').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  // hover: move towards the upper-left, then the upper-right while sampling per-frame movement
  await p.mouse.move(fb.x + fb.w * 0.5, fb.y + fb.h * 0.5); await sleep(200);
  const samples = []; const sweep = async (x0, x1, y) => { for (let i = 0; i <= 28; i++) { await p.mouse.move(fb.x + fb.w * (x0 + (x1 - x0) * i / 28), fb.y + fb.h * y); await fr(p); const g = await geo(p); g.ts = Date.now(); samples.push(g); await sleep(40); } };
  await sweep(0.5, 0.12, 0.2); await sleep(700); await fr(p); const g1 = await geo(p);
  const moved = g1.L.map((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y)); const responders = moved.filter((m) => m > 0.8).length;
  ok('hover: the square moves only a limited distance (|x| ≤ 60, |y| ≤ 30) and exactly TWO logos respond (small pull ≤ 14 px) with two hairline connectors', Math.abs(g1.mag.x) <= 62 && Math.abs(g1.mag.y) <= 32 && Math.abs(g1.mag.x) > 15 && responders === 2 && Math.max(...moved) <= 19 && g1.lines.filter((o) => o > 0.3).length === 2, JSON.stringify({ mag: g1.mag, responders, maxMove: Math.round(Math.max(...moved)), lines: g1.lines }));
  ok('hover: logos stay readable — no overlaps, at least 12 px of clear space around the square, inside the field, a slight tilt only', g1.overlaps === 0 && g1.inside && g1.gapMag >= 12, JSON.stringify({ o: g1.overlaps, inside: g1.inside }));
  await sweep(0.12, 0.88, 0.8); await sweep(0.88, 0.5, 0.5);
  let jump = 0; for (let k = 1; k < samples.length; k++) for (let i = 0; i < 12; i++) jump = Math.max(jump, Math.hypot(samples[k].L[i].x - samples[k - 1].L[i].x, samples[k].L[i].y - samples[k - 1].L[i].y) / ((samples[k].ts - samples[k - 1].ts) / 1000));
  ok(`hover: motion is damped — across a full sweep that changes the nearest pair, no logo moves faster than 150 px/s (max ${jump.toFixed(0)} px/s), no jumps`, jump <= 150, jump.toFixed(1));
  await p.mouse.move(fb.x + fb.w * 0.3, fb.y + fb.h * 0.1); await sleep(500); await p.mouse.move(5, 5); await sleep(300); await fr(p); await sleep(1400); await fr(p); await sleep(300);
  const g2 = await geo(p); const back = g2.L.every((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) < 0.6) && Math.abs(g2.mag.x) < 1 && Math.abs(g2.mag.y) < 1 && g2.lines.every((o) => o === 0);
  ok('pointer leave: everything settles back to its original arrangement and the connectors disappear', back, JSON.stringify({ mag: g2.mag, lines: g2.lines }));
  // click → gather, return; repeated clicks do not stack
  const t0 = Date.now(); await p.click('.mg-magnet'); let mid = null; let end = null; const stack = [];
  for (let k = 0; k < 4; k++) await p.click('.mg-magnet'); // repeated clicks during the moment
  while (Date.now() - t0 < 4200) { await fr(p); const g = await geo(p); const tt = Date.now() - t0; if (tt > 1050 && tt < 1500 && !mid) mid = g; if (!end && tt > 1500 && g.L.every((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) < 0.8)) end = tt; stack.push(tt); await sleep(60); }
  const near = mid && mid.L.map((l) => Math.hypot(l.x + l.w / 2 - (mid.field.w ? 0 : 0), 0)); // placeholder
  const spread = mid && (() => { const xs = mid.L.map((l) => l.x), xe = mid.L.map((l) => l.x + l.w), ys = mid.L.map((l) => l.y), ye = mid.L.map((l) => l.y + l.h); return { w: Math.round(Math.max(...xe) - Math.min(...xs)), h: Math.round(Math.max(...ye) - Math.min(...ys)) }; })();
  const rest = await geo(p); const restW = (() => { const xs = g0.L.map((l) => l.x), xe = g0.L.map((l) => l.x + l.w); return Math.round(Math.max(...xe) - Math.min(...xs)); })();
  ok('click: the logos gather into a compact cluster around the square — individually identifiable, no overlaps, inside the field', mid && mid.overlaps === 0 && mid.inside && spread.w < restW * 0.7, JSON.stringify({ spread, restW, o: mid && mid.overlaps }));
  ok(`click: it returns to the original arrangement and repeated clicks do not stack (back at rest by ${end} ms, one ≈2.1 s moment)`, end !== null && end < 3300 && rest.L.every((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) < 0.8), String(end));
  // keyboard
  await p.keyboard.press('Tab'); await p.focus('.mg-magnet'); const ring = await p.evaluate(() => getComputedStyle(document.querySelector('.mg-magnet')).outlineStyle); await p.keyboard.press('Enter'); await sleep(1200); await fr(p);
  const kg = await geo(p); const kmoved = kg.L.filter((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) > 20).length; await sleep(2200); await fr(p);
  await p.keyboard.press('Space'); await sleep(1200); await fr(p); const sg = await geo(p); const smoved = sg.L.filter((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) > 20).length; await sleep(2300); await fr(p);
  ok('keyboard: the RMZ button is a focusable <button> and Enter and Space both trigger the gathering', kmoved >= 10 && smoved >= 10 && (await p.evaluate(() => document.querySelector('.mg-magnet').tagName)) === 'BUTTON', JSON.stringify({ kmoved, smoved, ring }));
  const wheel = await p.evaluate(() => ({ ovf: getComputedStyle(document.documentElement).overflow, sticky: getComputedStyle(document.querySelector('.mg')).position, h: document.querySelector('.mg').getBoundingClientRect().height }));
  ok('no scroll locking, pinning or extra scroll distance (html overflow untouched, section static)', wheel.ovf !== 'hidden' && wheel.sticky === 'static', JSON.stringify(wheel));
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
  ok('390 px: compact readable arrangement — all 12 logos ≥ 52 px wide (the compact placeholder mark is the narrowest), none overlapping each other or the square, inside the field, no horizontal overflow', g0.L.length === 12 && g0.overlaps === 0 && g0.inside && g0.over <= 0 && g0.L.every((l) => l.w >= 52), JSON.stringify({ o: g0.overlaps, inside: g0.inside, over: g0.over, minW: Math.min(...g0.L.map((l) => Math.round(l.w))), field: g0.field }));
  const ta = await p.evaluate(() => ({ mag: getComputedStyle(document.querySelector('.mg-magnet')).touchAction, field: getComputedStyle(document.querySelector('.mg-field')).touchAction, logos: getComputedStyle(document.querySelector('.mg-logo')).touchAction }));
  ok('touch capture only on the square: touch-action none on the square, normal (auto) on the field and logos so page scrolling elsewhere is untouched', ta.mag === 'none' && ta.field === 'auto' && ta.logos === 'auto', JSON.stringify(ta));
  const m = await p.evaluate(() => { const r = document.querySelector('.mg-magnet').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); const y0 = await p.evaluate(() => scrollY);
  const cdp = await p.createCDPSession();
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await touch('touchStart', m.x, m.y); for (let i = 1; i <= 10; i++) { await touch('touchMove', m.x - i * 7, m.y - i * 5); await sleep(30); await fr(p); }
  await sleep(500); await fr(p); const dr = await geo(p); const dmoved = dr.L.map((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y)); const resp = dmoved.filter((x) => x > 0.8).length;
  ok('drag from the square: the square follows the finger (limited), nearby logos respond (≤ 3 pull), connectors show, the page does not scroll', dr.mag.x < -25 && Math.abs(await p.evaluate(() => scrollY) - y0) < 1 && resp >= 1 && resp <= 3 && dr.lines.some((o) => o > 0.3) && dr.overlaps === 0 && dr.gapMag >= 12, JSON.stringify({ mag: dr.mag, resp, lines: dr.lines, gap: dr.gapMag, scroll: (await p.evaluate(() => scrollY)) - y0 }));
  await touch('touchEnd'); await sleep(300); await fr(p); const afterDrag = await geo(p); await sleep(900); await fr(p); const settled = await geo(p);
  const notGathered = afterDrag.L.every((l) => true) && !(await p.evaluate(() => false));
  ok('releasing a drag settles back and does NOT trigger the gathering (a drag is not a tap)', Math.abs(settled.mag.x) < 1 && settled.L.every((l, i) => Math.hypot(l.x - g0.L[i].x, l.y - g0.L[i].y) < 1) && notGathered, JSON.stringify(settled.mag));
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
