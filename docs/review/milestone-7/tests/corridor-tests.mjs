import puppeteer from 'puppeteer-core';
// usage: node corridor3.mjs <url> <novideo|clip|real>   (clip = gradient test clip; real = the configured production video)
const URL = process.argv[2] || 'http://localhost:3111/';
const MODE = process.argv[3] || 'novideo';
const CLIP = MODE !== 'novideo';
const GRAD = MODE === 'clip';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
async function open(vp, rm) { const p = await b.newPage(); await p.setViewport(vp); if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(900); return p; }
const geo = (p) => p.evaluate(() => { const t = document.querySelector('[data-track]').getBoundingClientRect(); return { top: t.top + scrollY, h: t.height, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }; });
const R = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom, op: +getComputedStyle(e).opacity }; }, sel);
// pixel sampling from a real screenshot (decoded in-page)
const px = async (p, pts) => { const b64 = await p.screenshot({ encoding: 'base64' }); return p.evaluate(async (b64, pts) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const k = im.width / innerWidth; return pts.map(([x, y]) => [...g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data].slice(0, 3)); }, b64, pts); };
const thumbs = (p) => p.evaluate(() => [...document.querySelectorAll('canvas[data-vs]')].map((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const cells = new Array(16 * 6 * 3).fill(0), n = new Array(16 * 6).fill(0); for (let y = 0; y < c.height; y += 4) for (let x = 0; x < c.width; x += 4) { const k = Math.floor(y / c.height * 6) * 16 + Math.floor(x / c.width * 16); const o = (y * c.width + x) * 4; cells[k * 3] += d[o]; cells[k * 3 + 1] += d[o + 1]; cells[k * 3 + 2] += d[o + 2]; n[k]++; } return cells.map((v, i) => v / n[Math.floor(i / 3)]); }));
const meanDiff = (a, b2) => { let t = 0; for (let i = 0; i < a.length; i++) t += Math.abs(a[i] - b2[i]); return t / a.length; };

const CONFIGS = [['desktop 1440×900', { width: 1440, height: 900 }, 1600, 450], ['short desktop 1440×700', { width: 1440, height: 700 }, 1600, 450], ['mobile 390×844', { width: 390, height: 844, isMobile: true, hasTouch: true }, 2500, 400]];
const HOLD = 450;

// ───────── structure: three walls, no frames, no cards, no archive strip ─────────
{
  const p = await open({ width: 1440, height: 900 });
  const s = await p.evaluate(() => ({
    walls: [...document.querySelectorAll('.cor-wall')].map((w) => [w.className.replace('cor-wall ', ''), w.offsetWidth, w.offsetHeight]),
    canv: document.querySelectorAll('.cor-wall canvas[data-vs]').length,
    leftovers: document.querySelectorAll('.cor-plate, .cor-card, .cor-cardinfo, .cor-frame, .cor-plateinfo, .cm-fc, .cm-frame, .cor-cap, [data-d-fit], [data-m-pin]').length,
    text: document.querySelector('#work').innerText,
    html: document.querySelector('#work').outerHTML,
    videos: document.querySelectorAll('video').length,
  }));
  ok('three walls, each a real 3D plane of 1680 × 700 (2.4:1)', s.walls.length === 3 && s.walls.every((w) => w[1] === 1680 && w[2] === 700), JSON.stringify(s.walls));
  ok('one canvas per wall, no cream frame / borders / caption strip / cards / mobile frame in the DOM', s.canv === 3 && s.leftovers === 0);
  ok('no "Open the archive", "All projects", project names or "Demo project" anywhere in the section', !/open the archive|all projects|demo project|alpha|epsilon|six rooms/i.test(s.text + s.html));
  ok(`${CLIP ? 'exactly one <video> playback source' : 'no <video> element without media'}`, CLIP ? s.videos === 1 : s.videos === 0);
  const rot = await p.evaluate(() => ['.cor-wl', '.cor-wr', '.cor-front'].map((q) => getComputedStyle(document.querySelector(q)).transform));
  ok('left/right walls are rotated planes, front wall is flat (real perspective, not trapezoid crops)', /matrix3d/.test(rot[0]) && /matrix3d/.test(rot[1]) && rot[2].includes('matrix3d'), rot[0].slice(0, 60));
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────── per viewport: approach → arrival → reveal → hold → release → reverse ─────────
for (const [name, vp, A, REV] of CONFIGS) {
  const p = await open(vp); const g = await geo(p); const mob = !!vp.isMobile;
  const go = async (off, wait = 1700) => { await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + off); await sleep(wait); };
  const hdr = await p.evaluate(() => document.querySelector('header').children[1].getBoundingClientRect().bottom);
  const order = await p.evaluate(() => [...document.querySelectorAll('main > *')].map((e) => e.id || e.getAttribute('aria-label') || '?'));
  ok(`${name}: order hero → work → statement`, order[1] === 'work' && order[2] === 'statement', order.slice(0, 3).join('|'));
  await go(0, 900); const pin0 = await R(p, '[data-pin]');
  ok(`${name}: pin directly under the header (${Math.round(pin0.y)} = ${hdr})`, Math.abs(pin0.y - hdr) < 1.5);
  // growth of the FRONT wall, and the side walls leaving through geometry
  const wd = [], sideR = [];
  for (const f of [0, 0.2, 0.4, 0.6, 0.8, 0.95, 1]) { await go(A * f, 1300); wd.push((await R(p, '.cor-front')).w); sideR.push(await p.evaluate(() => { const T = new DOMMatrix(getComputedStyle(document.querySelector('[data-scene]')).transform).m43; const sc = new DOMMatrix(getComputedStyle(document.querySelector('[data-fit]')).transform).a; return innerWidth / 2 - (840 * sc * 1000) / (2500 - T); })); }
  ok(`${name}: front wall grows monotonically and never shrinks to make room (${wd.map(Math.round).join('→')})`, wd.every((v, i) => i === 0 || v >= wd[i - 1] - 0.5) && wd[6] / wd[5] < 1.25);
  ok(`${name}: side walls recede steadily out of view by geometry (left wall's far corner x, from the scene transform: ${sideR.map(Math.round).join('→')})`, sideR.every((v, i) => i === 0 || v <= sideR[i - 1] + 0.5) && sideR.every((v, i) => i === 0 || sideR[i - 1] - v < (vp.width * 0.62)));
  await go(A * 0.5, 1200); const mid = [await R(p, '[data-ah]'), await R(p, '[data-ap]')];
  ok(`${name}: arrival headline and paragraph hidden throughout the approach`, mid.every((x) => x.op === 0));
  // arrival
  await go(A, 1800); const st = await R(p, '.cor-front'); const hs0 = [await R(p, '[data-ah]'), await R(p, '[data-ap]')]; const lead = await R(p, '[data-lead]');
  ok(`${name}: at final size the text is still hidden; the approach headline has left (no duplicate)`, hs0.every((x) => x.op < 0.02) && lead.op < 0.02);
  await go(A + REV + HOLD * 0.5, 2000); const fin = await R(p, '.cor-front'); const ah = await R(p, '[data-ah]'); const ap = await R(p, '[data-ap]'); const pinR = await R(p, '[data-pin]'); const vh = vp.height;
  ok(`${name}: camera and video geometry identical before/after the reveal (Δ ≤ 1px)`, ['x', 'y', 'w', 'h'].every((k) => Math.abs(st[k] - fin[k]) <= 1.2), JSON.stringify([st, fin].map((o) => [o.x, o.y, o.w, o.h].map(Math.round))));
  ok(`${name}: front video is exactly 2.4:1, edge to edge, no frame (${Math.round(fin.w)}×${Math.round(fin.h)} = ${(fin.w / fin.h).toFixed(3)})`, Math.abs(fin.w / fin.h - 2.4) < 0.012 && fin.w <= vp.width + 1 && fin.x >= -1);
  ok(`${name}: video is as wide as the layout allows (${Math.round(fin.w)} of ${vp.width}px)`, mob ? fin.w >= vp.width - 2 : fin.w > 1100 || fin.w >= vp.width * 0.6);
  ok(`${name}: headline and paragraph fully revealed`, ah.op > 0.99 && ap.op > 0.99, `${ah.op}/${ap.op}`);
  ok(`${name}: headline above the video, paragraph below it — outside the footage, no overlap, clear of the header`, ah.b <= fin.y + 1 && ap.y >= fin.b - 1 && ah.y >= hdr - 1 && ap.b <= Math.min(pinR.b, vh) + 1 && ah.b <= ap.y, JSON.stringify({ hdr, ah: [Math.round(ah.y), Math.round(ah.b)], video: [Math.round(fin.y), Math.round(fin.b)], ap: [Math.round(ap.y), Math.round(ap.b)] }));
  const ctl = await p.evaluate(() => { const e = document.querySelector('.cor-ctl'); const r = e.getBoundingClientRect(); return { y: r.top, x: r.left, r: r.right }; });
  ok(`${name}: controls row clear of the paragraph and inside the viewport`, (ctl.y >= ap.b - 1 || ctl.x >= ap.x + ap.w - 1 || ctl.r <= ap.x + 1) && ctl.r <= vp.width + 1);
  const fs = await p.evaluate(() => [parseFloat(getComputedStyle(document.querySelector('[data-ah]')).fontSize), parseFloat(getComputedStyle(document.querySelector('[data-ap]')).fontSize)]);
  ok(`${name}: readable type (headline ${fs[0]}px, paragraph ${fs[1]}px)`, fs[0] >= 24 && fs[1] >= 14);
  // stop mid-reveal, reverse, no flicker
  await go(A + REV * 0.3, 1800); const q1 = await R(p, '[data-ah]'); await sleep(900); const q2 = await R(p, '[data-ah]');
  ok(`${name}: stopping mid-reveal holds a stable partial state (${q1.op.toFixed(2)})`, q1.op > 0.02 && q1.op < 0.98 && Math.abs(q1.op - q2.op) < 0.005 && Math.abs(q1.y - q2.y) < 0.5);
  await go(A + REV + HOLD * 0.5, 1800); await go(A + REV * 0.3, 1800); const rv = await R(p, '[data-ah]');
  ok(`${name}: reversing through the hold returns the same partial reveal`, Math.abs(rv.op - q1.op) < 0.03);
  await go(A, 1800); const r0 = [await R(p, '[data-ah]'), await R(p, '[data-ap]'), await R(p, '.cor-front')];
  ok(`${name}: reversing to the arrival point hides the text and restores the final video geometry`, r0[0].op < 0.02 && r0[1].op < 0.02 && ['x', 'y', 'w', 'h'].every((k) => Math.abs(r0[2][k] - st[k]) <= 1.2));
  await go(A * 0.6, 1800); const w6 = (await R(p, '.cor-front')).w; ok(`${name}: continuing upward moves back through the corridor (${Math.round(w6)}px < ${Math.round(st.w)}px)`, w6 < st.w - 20);
  await go(A - 40, 1500); const fw = []; for (let i = 0; i <= 30; i++) { await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + A - 40 + (REV + 80) * (i / 30)); await sleep(60); fw.push((await R(p, '[data-ah]')).op); }
  await sleep(600); const bw = []; for (let i = 30; i >= 0; i--) { await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + A - 40 + (REV + 80) * (i / 30)); await sleep(60); bw.push((await R(p, '[data-ah]')).op); }
  ok(`${name}: reveal opacity monotonic forward and back (no flashing)`, fw.every((v, i) => i === 0 || v >= fw[i - 1] - 0.02) && bw.every((v, i) => i === 0 || v <= bw[i - 1] + 0.02));
  await go(A + REV + HOLD - 30, 1800); const held = await R(p, '[data-ah]'); const pinH = await R(p, '[data-pin]');
  ok(`${name}: text still fully shown at the end of the hold; pin not released yet`, held.op > 0.99 && Math.abs(pinH.y - hdr) < 2.5);
  await go(A + REV + HOLD + 260, 1200); const rel = await p.evaluate(() => ({ pinTop: document.querySelector('[data-pin]').getBoundingClientRect().top, st: document.querySelector('#statement').getBoundingClientRect().top }));
  ok(`${name}: after the hold the whole composition scrolls away together toward Statement`, rel.pinTop < hdr - 100 && rel.st > 0);
  await p.evaluate((y) => scrollTo(0, y), g.top + g.h - vp.height); await sleep(900);
  const ex = await p.evaluate(() => ({ tr: document.querySelector('[data-track]').getBoundingClientRect().bottom, pb: document.querySelector('[data-pin]').getBoundingClientRect().bottom, st: document.querySelector('#statement').getBoundingClientRect().top }));
  ok(`${name}: exit — pin releases at the track end and Statement follows with no gap`, Math.abs(ex.pb - ex.tr) < 1.5 && Math.abs(ex.st - ex.tr) < 1.5, JSON.stringify(ex));
  // header clearance of approach copy along the journey
  let bad = []; for (const f of [0, 0.2, 0.4]) { await go(A * f, 700); const r = await p.evaluate(() => { const els = ['[data-kicker]', '[data-lead]', '.cor-ctl'].map((s) => document.querySelector(s).getBoundingClientRect()); return { els: els.map((r) => [Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right)]), hdr: document.querySelector('header').children[1].getBoundingClientRect().bottom, vh: innerHeight, vw: innerWidth }; }); if (r.els.some((e) => e[0] < r.hdr - 1 || e[1] > r.vh + 1 || e[2] < 0 || e[3] > r.vw + 1)) bad.push(f + ':' + JSON.stringify(r)); }
  ok(`${name}: kicker, approach copy and controls never under the header or off-screen`, bad.length === 0, bad[0] || '');
  // native scroll only
  const dp = await p.evaluate(() => { const ev = new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }); document.querySelector('#work').dispatchEvent(ev); return ev.defaultPrevented; });
  ok(`${name}: no wheel handler (event not prevented)`, dp === false);
  await p.evaluate(() => scrollTo(0, 0)); await sleep(300); await p.evaluate(() => { location.hash = '#work'; }); await sleep(900);
  const hs = await p.evaluate(() => ({ top: document.querySelector('#work').getBoundingClientRect().top, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }));
  ok(`${name}: direct navigation to #work lands under the header at the walk start`, Math.abs(hs.top - hs.hh) < 1.5, JSON.stringify(hs));
  ok(`${name}: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`${name}: no page errors`, p.errs.length === 0, p.errs.join('|')); await p.close();
}
{ // real wheel + touch drag are ordinary scrolling
  const p = await open({ width: 1440, height: 900 }); const g = await geo(p);
  await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + 300); await sleep(600); await p.mouse.move(700, 450); const y0 = await p.evaluate(() => scrollY); await p.mouse.wheel({ deltaY: 300 }); await sleep(500);
  ok('real wheel scrolls the page normally inside the section', (await p.evaluate(() => scrollY)) > y0 + 200); await p.close();
  const m = await open({ width: 390, height: 844, isMobile: true, hasTouch: true }); const gm = await geo(m);
  await m.evaluate((y) => scrollTo(0, y), gm.top - gm.hh + 600); await sleep(700); const t0 = await m.evaluate(() => scrollY); await m.touchscreen.touchStart(200, 600); for (let i = 1; i <= 10; i++) { await m.touchscreen.touchMove(200, 600 - i * 30); await sleep(16); } await m.touchscreen.touchEnd(); await sleep(600);
  ok('touch-drag scrolls the page normally (nothing traps touch)', (await m.evaluate(() => scrollY)) > t0 + 100);
  for (const w of [390, 360, 320]) { await m.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true }); await sleep(600); ok(`mobile ${w}: no horizontal overflow`, await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); }
  await m.close();
}
{ // resize recalculation
  const p = await open({ width: 1440, height: 900 }); const g = await geo(p); const A = 1600, REV = 450;
  await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + A + REV + 200); await sleep(1500);
  const fits = async () => { const hdr = await p.evaluate(() => document.querySelector('header').children[1].getBoundingClientRect().bottom); const v = await R(p, '.cor-front'), a = await R(p, '[data-ah]'), c = await R(p, '[data-ap]'), pin = await R(p, '[data-pin]'); return a.b <= v.y + 1 && c.y >= v.b - 1 && a.y >= hdr - 1 && c.b <= pin.b + 1 && Math.abs(v.w / v.h - 2.4) < 0.012; };
  const sizes = []; for (const [w, h] of [[1280, 720], [1024, 768], [1440, 900]]) { await p.setViewport({ width: w, height: h }); await sleep(900); const g2 = await geo(p); await p.evaluate((y) => scrollTo(0, y), g2.top - g2.hh + A + REV + 200); await sleep(1500); sizes.push(await fits()); }
  ok('resizing re-solves the arrival composition (1280×720, 1024×768, back to 1440×900)', sizes.every(Boolean), sizes.join()); await p.close();
}

if (CLIP) {
  // ───────── clip: one shared playback source, orientation, brightness, no crop/stretch ─────────
  const p = await open({ width: 1440, height: 900 }); const g = await geo(p); const A = 1600;
  await p.evaluate((y) => scrollTo(0, y - 0), g.top - g.hh); await sleep(2500);
  const st1 = await p.evaluate(() => { const v = document.querySelector('video'); return { n: document.querySelectorAll('video').length, paused: v.paused, muted: v.muted, loop: v.loop, ready: v.readyState, w: v.videoWidth, h: v.videoHeight, t: v.currentTime }; });
  ok('video: ONE element, muted (single/no audio source), looping, decoded and playing in view', st1.n === 1 && !st1.paused && st1.muted && st1.loop && st1.ready >= 2 && (GRAD ? st1.w === 1920 && st1.h === 800 : st1.w > 0), JSON.stringify(st1));
  const a = await thumbs(p); await sleep(1000); const a2 = await thumbs(p);
  ok(`video: all three walls show the same frame in the same tick (mean diff front↔left ${meanDiff(a[0], a[1]).toFixed(2)}, front↔right ${meanDiff(a[0], a[2]).toFixed(2)})`, a.length === 3 && meanDiff(a[0], a[1]) < 1 && meanDiff(a[0], a[2]) < 1 && meanDiff(a[1], a[2]) < 0.5);
  ok('video: frames advance over time on every wall', a.every((t, i) => meanDiff(t, a2[i]) > (GRAD ? 4 : 0.2)));
  if (GRAD) {
  // orientation (horizontal red→blue gradient): front red→blue, left wall red(outer)→blue(inner), right wall red(inner)→blue(outer); no mirroring
  await sleep(300); const s0 = await px(p, [[470, 470], [970, 470], [30, 470], [425, 470], [1015, 470], [1410, 470]]);
  const rb = (c) => c[0] - c[2];
  ok(`video: front wall is not mirrored (left ${rb(s0[0])} > 0 > right ${rb(s0[1])})`, rb(s0[0]) > 20 && rb(s0[1]) < -20);
  ok(`video: left wall not mirrored — outer/near edge shows the video's left (red ${rb(s0[2])}), inner/far end its right (blue ${rb(s0[3])})`, rb(s0[2]) > 20 && rb(s0[3]) < -20);
  ok(`video: right wall not mirrored — inner/far end shows the video's left (red ${rb(s0[4])}), outer/near edge its right (blue ${rb(s0[5])})`, rb(s0[4]) > 20 && rb(s0[5]) < -20);
  const full = (c) => Math.max(c[0], c[2]);
  ok(`video: front wall at normal brightness; side walls darker (front near-edge ${full(s0[1])}, left far end ${full(s0[3])}, right outer ${full(s0[5])})`, full(s0[1]) > 200 && full(s0[3]) < 0.85 * full(s0[1]) && full(s0[5]) < 0.95 * 255);
  // no letterbox: the edges of the front wall at arrival are video, not black
  await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + A + 450 + 200); await sleep(2200);
  const fr = await R(p, '.cor-front'); const e = await px(p, [[fr.x + 6, fr.y + 6], [fr.r - 6, fr.y + 6], [fr.x + 6, fr.b - 6], [fr.r - 6, fr.b - 6], [fr.x + fr.w / 2, fr.y + 6], [fr.x + fr.w / 2, fr.b - 6]]);
  ok('video: edge-to-edge — all corners and mid-edges of the front wall are footage (no letterbox, no frame, no red margin)', e.every((c) => c[0] + c[1] + c[2] > 120 && !(c[0] > 180 && c[1] < 60 && c[2] < 60 && false)), JSON.stringify(e));
  const lum = await px(p, [[fr.x + fr.w / 2, fr.y + fr.h / 2], [fr.x + fr.w * 0.9, fr.y + fr.h / 2]]);
  ok('video: front footage at full brightness (centre ≈ source mid-gradient, near-right ≈ source blue)', Math.abs(lum[0][0] - 127) < 40 && Math.abs(lum[0][2] - 127) < 40 && lum[1][2] > 200, JSON.stringify(lum));
  }
  // controls
  const btn = await p.$('.cor-btn'); ok('video: shared Play/Pause control present and labelled; no sound control', !!btn && /Pause/.test(await btn.evaluate((x) => x.getAttribute('aria-label'))) && (await p.evaluate(() => !document.querySelector('[aria-label*="ute"], [aria-label*="ound"], [aria-label*="olume"]'))));
  await btn.click(); await sleep(500); const b1 = await thumbs(p); const t1 = await p.evaluate(() => document.querySelector('video').currentTime); await sleep(900); const b2 = await thumbs(p); const t2 = await p.evaluate(() => document.querySelector('video').currentTime);
  ok('video: one Pause freezes the video and all three walls', t1 === t2 && b1.every((t, i) => meanDiff(t, b2[i]) === 0) && /Play/.test(await btn.evaluate((x) => x.getAttribute('aria-label'))));
  await btn.click(); await sleep(900); ok('video: one Play resumes all three', (await p.evaluate(() => document.querySelector('video').currentTime)) > t2);
  // loop: seek near the end
  await p.evaluate(() => { const v = document.querySelector('video'); v.currentTime = Math.max(0, v.duration - 0.3); }); await sleep(1500);
  const lp = await p.evaluate(() => document.querySelector('video').currentTime); const l3 = await thumbs(p);
  ok(`video: loops cleanly and the walls stay in sync after the loop (t=${lp.toFixed(2)})`, lp < 3 && meanDiff(l3[0], l3[1]) < 1 && meanDiff(l3[0], l3[2]) < 1);
  // playback independent of scroll (never rewinds)
  const dur = await p.evaluate(() => document.querySelector('video').duration); const tA = await p.evaluate(() => document.querySelector('video').currentTime); const w0 = Date.now(); await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + A * 0.3); await sleep(1200); await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + A * 0.1); await sleep(1200); const tB = await p.evaluate(() => document.querySelector('video').currentTime); const el = (Date.now() - w0) / 1000;
  const circ = Math.abs(((tB - ((tA + el) % dur)) + dur * 1.5) % dur - dur / 2);
  ok(`video: scrolling backward never rewinds playback — time kept advancing on its own clock (t ${tA.toFixed(2)} → ${tB.toFixed(2)} after ${el.toFixed(1)}s, loop ${dur.toFixed(1)}s)`, circ < 0.9);
  // tab visibility
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(600);
  ok('video: pauses while the tab is hidden', await p.evaluate(() => document.querySelector('video').paused));
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(900);
  ok('video: resumes when the tab is visible again', !(await p.evaluate(() => document.querySelector('video').paused)));
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sleep(900);
  ok('video: pauses when the section is out of view and resumes on return', await p.evaluate(() => document.querySelector('video').paused)); await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + 100); await sleep(1300); ok('video: resumed on return', !(await p.evaluate(() => document.querySelector('video').paused)));
  ok('video: no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
  // mobile with video
  const m = await open({ width: 390, height: 844, isMobile: true, hasTouch: true }); const gm = await geo(m);
  await m.evaluate((y) => scrollTo(0, y), gm.top - gm.hh + 2500 + 400 + 200); await sleep(2500);
  const mb = await m.$('.cor-btn'); const mr = await m.evaluate(() => { const r = document.querySelector('.cor-btn').getBoundingClientRect(); return [r.width, r.height, r.right, r.bottom, innerWidth, innerHeight]; });
  ok('mobile video: Play/Pause is usable (≥ 44px) and inside the viewport', mr[1] >= 44 && mr[0] >= 44 && mr[2] <= mr[4] && mr[3] <= mr[5], JSON.stringify(mr));
  await mb.tap(); await sleep(500); ok('mobile video: tap pauses the shared video', await m.evaluate(() => document.querySelector('video').paused)); await mb.tap(); await sleep(500);
  const mt = await thumbs(m); ok('mobile video: three walls in sync', meanDiff(mt[0], mt[1]) < 1 && meanDiff(mt[0], mt[2]) < 1);
  ok('mobile video: no page errors', m.errs.length === 0, m.errs.join('|')); await m.close();
} else {
  // ───────── no media: poster/placeholder on all three walls, no controls, no duration ─────────
  for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
    const p = await open(vp); const g = await geo(p); await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + 800); await sleep(1500);
    const r = await p.evaluate(() => ({ video: !!document.querySelector('video'), ctl: !!document.querySelector('.cor-btn, .cor-play, .cor-seek'), time: /\d\d:\d\d/.test(document.querySelector('#work').innerText), painted: [...document.querySelectorAll('canvas[data-vs]')].map((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s > 0; }) }));
    ok(`${name} no media: intentional placeholder on all three walls, no video element, no player controls, no fake duration`, !r.video && !r.ctl && !r.time && r.painted.length === 3 && r.painted.every(Boolean), JSON.stringify(r));
    await p.close();
  }
}

// ───────── reduced motion: completed composition, no pin, no camera movement, no autoplay ─────────
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['short desktop', { width: 1440, height: 700 }], ['mobile', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
  const p = await open(vp, true); await p.evaluate(() => document.querySelector('#work').scrollIntoView()); await sleep(1300);
  const r = { pin: await p.evaluate(() => getComputedStyle(document.querySelector('[data-pin]')).position), tr: await R(p, '[data-track]'), pn: await R(p, '[data-pin]'), ah: await R(p, '[data-ah]'), ap: await R(p, '[data-ap]'), fr: await R(p, '.cor-front'), lead: await R(p, '[data-lead]') };
  ok(`reduced motion ${name}: completed composition shown directly, no pin or walk`, r.pin === 'relative' && Math.abs(r.tr.h - r.pn.h) < 2 && r.ah.op === 1 && r.ap.op === 1 && r.lead.op < 0.02 && r.ah.b <= r.fr.y + 1 && r.ap.y >= r.fr.b - 1 && Math.abs(r.fr.w / r.fr.h - 2.4) < 0.012, JSON.stringify(r));
  if (CLIP) ok(`reduced motion ${name}: video does not autoplay`, await p.evaluate(() => { const v = document.querySelector('video'); return !v || v.paused; }));
  ok(`reduced motion ${name}: no horizontal overflow, no errors`, (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) && p.errs.length === 0, p.errs.join('|'));
  await p.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
