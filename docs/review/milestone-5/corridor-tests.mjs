import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://localhost:3113/';
const WITH_VIDEO = process.argv[3] !== 'novideo';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
async function open(vp, rm) { const p = await b.newPage(); await p.setViewport(vp); if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(900); return p; }
const geo = (p, mob) => p.evaluate((mob) => { const t = document.querySelector(mob ? '[data-m-track]' : '[data-d-track]').getBoundingClientRect(); const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')); return { top: t.top + scrollY, h: t.height, hh, range: mob ? 2500 : 1600 }; }, mob);
const prog = (p, mob) => p.evaluate((mob) => { if (mob) return document.querySelector('[data-m-pct]').textContent; const m = new DOMMatrix(getComputedStyle(document.querySelector('[data-d-scene]')).transform); return +(m.m43 / 1250).toFixed(3); }, mob);
const at = async (p, g, f, wait = 1300) => { await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + g.range * f); await sleep(wait); };
const thumb = (p) => p.evaluate(() => { const out = []; for (const c of document.querySelectorAll('[data-d-fit] canvas[data-vs]')) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const cells = new Array(16 * 9 * 3).fill(0), n = new Array(16 * 9).fill(0); for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) { const k = Math.floor(y / c.height * 9) * 16 + Math.floor(x / c.width * 16); const o = (y * c.width + x) * 4; cells[k * 3] += d[o]; cells[k * 3 + 1] += d[o + 1]; cells[k * 3 + 2] += d[o + 2]; n[k]++; } out.push(cells.map((v, i) => v / n[Math.floor(i / 3)])); } return out; });
const maxDiff = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };

for (const [name, vp] of [['desktop 1440×900', { width: 1440, height: 900 }], ['short desktop 1440×700', { width: 1440, height: 700 }]]) {
  const p = await open(vp); const g = await geo(p, false);
  const hh = g.hh;
  // order
  const order = await p.evaluate(() => [...document.querySelectorAll('main > *')].map((e) => e.id || e.getAttribute('aria-label') || e.textContent.slice(0, 20)));
  ok(`${name}: order hero → work (video) → statement`, order[0] === 'Introduction' && order[1] === 'work' && order[2] === 'statement', order.slice(0, 3).join(' | '));
  // entry / approach / final / exit
  await at(p, g, 0); const p0 = await prog(p, false);
  ok(`${name}: entry state = walk start`, p0 === 0, 'p=' + p0);
  const pr = await p.evaluate(() => { const r = document.querySelector('[data-d-pin]').getBoundingClientRect(); return [r.top, r.height]; });
  ok(`${name}: pin sits directly under the header (${Math.round(pr[0])} = ${hh})`, Math.abs(pr[0] - hh) < 1.5);
  const vals = [];
  for (const f of [0.1, 0.25, 0.5, 0.75, 1]) { await at(p, g, f); vals.push(await prog(p, false)); }
  ok(`${name}: approach is monotonic and reaches the final state`, vals.every((v, i) => i === 0 || v >= vals[i - 1]) && vals[4] >= 1, vals.join('→') + ' (camera end is solved per viewport, ≥ the old 1250 px)');
  // header clearance through the whole journey
  let bad = [];
  for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1]) { await at(p, g, f, 700); const r = await p.evaluate(() => { const els = ['.cor-kicker', '.cor-lead h2', '.cor-lead p', '.cor-ctl'].map((s) => document.querySelector('.cor-d ' + s)).map((e) => e.getBoundingClientRect()); const pin = document.querySelector('[data-d-pin]').getBoundingClientRect(); const hdr = document.querySelector('header').children[1].getBoundingClientRect().bottom; return { els: els.map((r) => [Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right)]), pinTop: pin.top, pinBottom: pin.bottom, hdr, vh: innerHeight }; }); if (r.els.some((e) => e[0] < r.hdr - 1 || e[1] > r.vh + 1 || e[2] < 0 || e[3] > 1441) || r.pinTop < r.hdr - 1.5) bad.push(f + ':' + JSON.stringify(r)); }
  ok(`${name}: kicker, headline, copy and controls never sit under the header or off-screen`, bad.length === 0, bad[0] || '');
  // reverse
  await at(p, g, 0.75, 1500); const fwd = await prog(p, false); await at(p, g, 0.25, 1500); await at(p, g, 0.75, 1500); const back = await prog(p, false);
  ok(`${name}: reverse scrolling retraces the same state`, Math.abs(fwd - back) < 0.002, `${fwd} vs ${back}`);
  await at(p, g, 0, 1800); ok(`${name}: back at the top returns to the start`, (await prog(p, false)) === 0);
  // exit: statement follows directly, no blank region
  await p.evaluate((y) => scrollTo(0, y), g.top + g.h - vp.height); await sleep(900);
  const ex = await p.evaluate(() => { const tr = document.querySelector('[data-d-track]').getBoundingClientRect(); const pin = document.querySelector('[data-d-pin]').getBoundingClientRect(); const st = document.querySelector('#statement').getBoundingClientRect(); return { trBottom: tr.bottom, pinBottom: pin.bottom, st: st.top, vh: innerHeight }; });
  ok(`${name}: exit — pin releases at the track end and Statement follows with no gap`, Math.abs(ex.pinBottom - ex.trBottom) < 1.5 && Math.abs(ex.st - ex.trBottom) < 1.5, JSON.stringify(ex));
  // no wheel trapping
  const dp = await p.evaluate(() => { const s = document.querySelector('#work'); const ev = new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }); s.dispatchEvent(ev); return ev.defaultPrevented; });
  ok(`${name}: no wheel handler (event not prevented)`, dp === false);
  await at(p, g, 0.3, 500); await p.mouse.move(700, 450); const y0 = await p.evaluate(() => scrollY); await p.mouse.wheel({ deltaY: 300 }); await sleep(500); const y1 = await p.evaluate(() => scrollY);
  ok(`${name}: real wheel scrolls the page normally`, y1 > y0 + 200, `${y0}→${y1}`);
  await p.evaluate(() => scrollTo(0, 0)); await sleep(300);
  await p.evaluate(() => { location.hash = '#work'; }); await sleep(900);
  const hs = await p.evaluate(() => ({ top: document.querySelector('#work').getBoundingClientRect().top, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }));
  ok(`${name}: direct navigation to #work lands under the header at the walk start`, Math.abs(hs.top - hs.hh) < 1.5, JSON.stringify(hs));
  ok(`${name}: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`${name}: no page errors`, p.errs.length === 0, p.errs.join('|'));
  await p.close();
}

if (WITH_VIDEO) {
  const p = await open({ width: 1440, height: 900 }); const g = await geo(p, false);
  await at(p, g, 0.5, 2500);
  const st1 = await p.evaluate(() => { const v = document.querySelector('video.cor-vid'); return { has: !!v, paused: v.paused, t: v.currentTime, ready: v.readyState, w: v.videoWidth }; });
  ok('video: element present, decoded and playing in view', st1.has && !st1.paused && st1.ready >= 2 && st1.w === 1280, JSON.stringify(st1));
  const a = await thumb(p); await sleep(1100); const a2 = await thumb(p);
  const meanDiff = (x, y) => { let t = 0; for (let i = 0; i < x.length; i++) t += Math.abs(x[i] - y[i]); return t / x.length; };
  const cardsSame = a.slice(2).every((t) => maxDiff(t, a[1]) === 0);
  const plateMean = Math.max(...a.map((t) => meanDiff(t, a[0])));
  ok(`video: all 7 surfaces show the same frame (6 cards identical; plate mean diff ${plateMean.toFixed(2)}/255 = resampling only)`, a.length === 7 && cardsSame && plateMean < 3);
  ok('video: frames advance over time on every surface', a.every((t, i) => maxDiff(t, a2[i]) > 25));
  const btn = await p.$('.cor-d .cor-btn'); ok('video: Pause button present and labelled', !!btn && /Pause/.test(await btn.evaluate((e) => e.getAttribute('aria-label'))));
  await btn.click(); await sleep(400); const b1 = await thumb(p); const t1 = await p.evaluate(() => document.querySelector('video.cor-vid').currentTime); await sleep(900); const b2 = await thumb(p); const t2 = await p.evaluate(() => document.querySelector('video.cor-vid').currentTime);
  ok('video: pause freezes the video and every surface', t1 === t2 && b1.every((t, i) => maxDiff(t, b2[i]) === 0) && /Play/.test(await btn.evaluate((e) => e.getAttribute('aria-label'))));
  await btn.click(); await sleep(900); ok('video: resume plays again', (await p.evaluate(() => document.querySelector('video.cor-vid').currentTime)) > t2);
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sleep(900);
  ok('video: pauses when the section is out of view', await p.evaluate(() => document.querySelector('video.cor-vid').paused));
  await at(p, g, 0.5, 1200); ok('video: resumes on return', !(await p.evaluate(() => document.querySelector('video.cor-vid').paused)));
  ok('video: no sound controls (muted, no mute button)', await p.evaluate(() => document.querySelector('video.cor-vid').muted && !document.querySelector('.cor-d [aria-label*="ute"], .cor-d [aria-label*="ound"]')));
  ok('video: no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();

  // mobile with video
  const m = await open({ width: 390, height: 844, isMobile: true, hasTouch: true }); const gm = await geo(m, true);
  await at(m, gm, 1, 2500);
  const pl = await m.evaluate(() => ({ tc: document.querySelector('[data-m-tc]').textContent, op: getComputedStyle(document.querySelector('[data-m-pl]')).opacity, paused: document.querySelector('video.cor-vid').paused, dur: document.querySelector('video.cor-vid').duration }));
  ok('mobile video: final state shows real timecode and duration (≈ 00:08) and plays', /^\d\d:\d\d \/ 00:08$/.test(pl.tc.trim()) && +pl.op === 1 && !pl.paused, JSON.stringify(pl));
  const seek = await m.$('[data-m-seek]'); const bx = await seek.boundingBox(); await m.touchscreen.tap(bx.x + bx.width * 0.5, bx.y + bx.height / 2); await sleep(500);
  const ct = await m.evaluate(() => document.querySelector('video.cor-vid').currentTime); ok('mobile video: tapping the scrubber seeks (≈ half)', ct > 3 && ct < 6.5, ct.toFixed(2));
  const pb = await m.$('.cor-play'); await pb.tap(); await sleep(500); ok('mobile video: play/pause button toggles', await m.evaluate(() => document.querySelector('video.cor-vid').paused)); await pb.tap(); await sleep(400);
  ok('mobile video: no page errors', m.errs.length === 0, m.errs.join('|')); await m.close();
}

// mobile journey (works with or without video)
{
  const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true }); const g = await geo(p, true);
  const order = await p.evaluate(() => [...document.querySelectorAll('main > *')].map((e) => e.id || e.getAttribute('aria-label') || '?'));
  ok('mobile 390: order hero → work → statement', order[1] === 'work' && order[2] === 'statement', order.slice(0, 3).join('|'));
  await at(p, g, 0, 800); ok('mobile 390: entry 00%', (await prog(p, true)) === '00%');
  const pr = await p.evaluate(() => document.querySelector('[data-m-pin]').getBoundingClientRect().top); ok(`mobile 390: pin directly under the header (${Math.round(pr)})`, Math.abs(pr - g.hh) < 1.5);
  const v = []; for (const f of [0.25, 0.5, 0.75, 1]) { await at(p, g, f, 1000); v.push(await prog(p, true)); }
  ok('mobile 390: approach reaches 100%', v[3] === '100%' && v.every((x, i) => i === 0 || parseInt(x) >= parseInt(v[i - 1])), v.join('→'));
  await at(p, g, 0, 800); const u0 = await p.evaluate(() => { const hdr = document.querySelector('header').children[1].getBoundingClientRect().bottom; const el = ['[data-m-kicker]', '[data-m-hl]', '[data-m-cue]'].map((s) => document.querySelector(s).getBoundingClientRect()); return { hdr, el: el.map((r) => [Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right)]) }; });
  ok('mobile 390: kicker, headline and cue clear of the header and inside the screen', u0.el.every((e) => e[0] >= u0.hdr - 1 && e[1] <= 845 && e[2] >= 0 && e[3] <= 391), JSON.stringify(u0));
  await at(p, g, 0.5, 800); await at(p, g, 0.2, 1200); await at(p, g, 0.5, 1200); ok('mobile 390: reverse scrolling retraces', (await prog(p, true)) === '50%', await prog(p, true));
  // touch drag through the walk
  await at(p, g, 0.3, 700); const y0 = await p.evaluate(() => scrollY); await p.touchscreen.touchStart(200, 600); for (let i = 1; i <= 10; i++) { await p.touchscreen.touchMove(200, 600 - i * 30); await sleep(16); } await p.touchscreen.touchEnd(); await sleep(600);
  ok('mobile 390: touch-drag scrolls the page (nothing traps touch)', (await p.evaluate(() => scrollY)) > y0 + 100);
  await p.evaluate((y) => scrollTo(0, y), g.top + g.h - 844); await sleep(900);
  const ex = await p.evaluate(() => ({ tr: document.querySelector('[data-m-track]').getBoundingClientRect().bottom, st: document.querySelector('#statement').getBoundingClientRect().top, pb: document.querySelector('[data-m-pin]').getBoundingClientRect().bottom }));
  ok('mobile 390: exit releases cleanly into Statement', Math.abs(ex.tr - ex.pb) < 1.5 && Math.abs(ex.st - ex.tr) < 1.5, JSON.stringify(ex));
  for (const w of [390, 360, 320]) { await p.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true }); await sleep(600); ok(`mobile ${w}: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); }
  ok('mobile 390: no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// no-media fallback
if (!WITH_VIDEO) {
  for (const [name, vp, mob] of [['desktop', { width: 1440, height: 900 }, false], ['mobile', { width: 390, height: 844, isMobile: true, hasTouch: true }, true]]) {
    const p = await open(vp); const g = await geo(p, mob); await at(p, g, 1, 1500);
    const r = await p.evaluate(() => ({ video: !!document.querySelector('video'), ctl: !!document.querySelector('.cor-btn, .cor-play, .cor-seek, [data-m-pl]'), time: /\d\d:\d\d/.test(document.querySelector('#work').innerText), canvases: [...document.querySelectorAll('canvas[data-vs]')].filter((c) => c.getClientRects().length).map((c) => { const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s > 0; }) }));
    ok(`${name} no media: placeholder painted, no video element, no player controls, no fake duration`, !r.video && !r.ctl && !r.time && r.canvases.length > 0 && r.canvases.every(Boolean), JSON.stringify(r));
    await p.close();
  }
}


// ── arrival composition: approach → stationary reveal → hold → release; reversible ──
for (const [name, vp, mob] of [['desktop 1440×900', { width: 1440, height: 900 }, false], ['short desktop 1440×700', { width: 1440, height: 700 }, false], ['mobile 390×844', { width: 390, height: 844, isMobile: true, hasTouch: true }, true]]) {
  const p = await open(vp); const g = await geo(p, mob);
  const A = mob ? 2500 : 1600, REV = mob ? 400 : 450, HOLD = 450;
  const S = mob ? { frame: '.cm-fc', video: '.cm-fc .cm-galvid canvas', ah: '[data-m-ah]', ap: '[data-m-ap]', lead: '[data-m-hl]', pin: '[data-m-pin]' } : { frame: '.cor-plate', video: '.cor-plate .cor-frame canvas', ah: '[data-d-ah]', ap: '[data-d-ap]', lead: '[data-d-lead]', pin: '[data-d-pin]' };
  const R = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom, op: +getComputedStyle(e).opacity }; }, sel);
  const go = async (off, wait = 1700) => { await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + off); await sleep(wait); };
  const hdr = await p.evaluate(() => document.querySelector('header').children[1].getBoundingClientRect().bottom);
  const widths = []; for (const f of [0.2, 0.4, 0.6, 0.8, 0.95, 1]) { await go(A * f, 1300); widths.push((await R(S.frame)).w); }
  ok(`arrival ${name}: video grows monotonically through the approach and never shrinks to make room (${widths.map(Math.round).join('→')})`, widths.every((v, i) => i === 0 || v >= widths[i - 1] - 0.5) && widths[5] / widths[4] < 1.2);
  await go(A * 0.5, 1300); const mid = [await R(S.ah), await R(S.ap)];
  ok(`arrival ${name}: arrival headline and paragraph hidden throughout the approach`, mid.every((x) => x.op === 0));
  await go(A, 1800); const st = await R(S.frame); const hs0 = [await R(S.ah), await R(S.ap)];
  ok(`arrival ${name}: at final size the text is still hidden (reveal has not started)`, hs0.every((x) => x.op < 0.02));
  const lead = await R(S.lead); ok(`arrival ${name}: corridor headline has left (no duplicate headline)`, lead.op < 0.02, 'op ' + lead.op);
  await go(A + REV + HOLD * 0.5, 2000); const fin = await R(S.frame); const vid = await R(S.video); const ah = await R(S.ah); const ap = await R(S.ap);
  ok(`arrival ${name}: camera and video geometry identical before/after the reveal (Δ ≤ 1px)`, ['x', 'y', 'w', 'h'].every((k) => Math.abs(st[k] - fin[k]) <= 1.2), JSON.stringify([st, fin].map((o) => [o.x, o.y, o.w, o.h].map(Math.round))));
  ok(`arrival ${name}: video is 16:9, uncropped (canvas ${Math.round(vid.w)}×${Math.round(vid.h)} = ${(vid.w / vid.h).toFixed(3)})`, Math.abs(vid.w / vid.h - 16 / 9) < 0.012);
  ok(`arrival ${name}: headline and paragraph fully revealed`, ah.op > 0.99 && ap.op > 0.99, `${ah.op}/${ap.op}`);
  const pinR = await R(S.pin); const vh = vp.height;
  ok(`arrival ${name}: headline above the frame, paragraph below it — outside the footage, no overlap`, ah.b <= fin.y + 1 && ap.y >= fin.b - 1 && ah.y >= hdr - 1 && ap.b <= Math.min(pinR.b, vh) + 1 && ah.b <= ap.y, JSON.stringify({ hdr, ah: [ah.y, ah.b], frame: [fin.y, fin.b], ap: [ap.y, ap.b], pinB: pinR.b }));
  ok(`arrival ${name}: composition fits below the header with room to spare`, fin.y >= hdr && fin.b <= Math.min(pinR.b, vh) && fin.x >= -1 && fin.r <= vp.width + 1);
  const ctl = await p.evaluate((mob) => { const e = document.querySelector(mob ? '[data-m-pl]' : '.cor-d .cor-btn'); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { y: r.top, b: r.bottom, x: r.left, r: r.right }; }, mob);
  if (ctl) ok(`arrival ${name}: player controls do not overlap the paragraph`, ctl.y >= ap.b - 1 || ctl.x >= ap.x + ap.w - 1 || ctl.r <= ap.x + 1);
  const fs = await p.evaluate((S) => [parseFloat(getComputedStyle(document.querySelector(S.ah)).fontSize), parseFloat(getComputedStyle(document.querySelector(S.ap)).fontSize)], S);
  ok(`arrival ${name}: readable type (headline ${fs[0]}px, paragraph ${fs[1]}px)`, fs[0] >= 24 && fs[1] >= 14);
  // stop during the reveal: stable, partial
  await go(A + REV * 0.3, 1800); const q1 = await R(S.ah); await sleep(900); const q2 = await R(S.ah);
  ok(`arrival ${name}: stopping mid-reveal holds a stable partial state (${q1.op.toFixed(2)})`, q1.op > 0.02 && q1.op < 0.98 && Math.abs(q1.op - q2.op) < 0.005 && Math.abs(q1.y - q2.y) < 0.5);
  // reverse: through the hold, the reveal, back into the corridor
  await go(A + REV + HOLD * 0.5, 1800); await go(A + REV * 0.3, 1800); const rv = await R(S.ah);
  ok(`arrival ${name}: reversing returns the same partial reveal`, Math.abs(rv.op - q1.op) < 0.03);
  await go(A, 1800); const r0 = [await R(S.ah), await R(S.ap), await R(S.frame)];
  ok(`arrival ${name}: reversing to the arrival point hides the text and keeps the final video geometry`, r0[0].op < 0.02 && r0[1].op < 0.02 && ['x', 'y', 'w', 'h'].every((k) => Math.abs(r0[2][k] - st[k]) <= 1.2));
  await go(A * 0.6, 1800); const w6 = (await R(S.frame)).w; ok(`arrival ${name}: continuing upward moves back through the corridor (video ${Math.round(w6)}px < ${Math.round(st.w)}px)`, w6 < st.w - 20);
  // no flicker / repeated triggers while scrolling forward and back through the reveal
  await go(A - 40, 1500); const fw = []; for (let i = 0; i <= 30; i++) { await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + A - 40 + (REV + 80) * (i / 30)); await sleep(60); fw.push((await R(S.ah)).op); }
  await sleep(600); const bw = []; for (let i = 30; i >= 0; i--) { await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + A - 40 + (REV + 80) * (i / 30)); await sleep(60); bw.push((await R(S.ah)).op); }
  ok(`arrival ${name}: reveal opacity is monotonic forward and back (no flashing)`, fw.every((v, i) => i === 0 || v >= fw[i - 1] - 0.02) && bw.every((v, i) => i === 0 || v <= bw[i - 1] + 0.02), `max ${Math.max(...fw).toFixed(2)}`);
  // hold then release
  await go(A + REV + HOLD - 30, 1800); const held = await R(S.ah); const pinH = await R(S.pin);
  ok(`arrival ${name}: text is still fully shown at the end of the hold; pin has not released yet`, held.op > 0.99 && Math.abs(pinH.y - hdr) < 2.5);
  await go(A + REV + HOLD + 260, 1200); const rel = await p.evaluate((S) => ({ pinTop: document.querySelector(S.pin).getBoundingClientRect().top, st: document.querySelector('#statement').getBoundingClientRect().top }), S);
  ok(`arrival ${name}: after the hold the whole composition scrolls away together toward Statement`, rel.pinTop < hdr - 100 && rel.st > 0);
  ok(`arrival ${name}: no page errors`, p.errs.length === 0, p.errs.join('|')); await p.close();
}

// reduced motion: completed arrival composition, no pin, no walk
for (const [name, vp, mob] of [['desktop', { width: 1440, height: 900 }, false], ['short desktop', { width: 1440, height: 700 }, false], ['mobile', { width: 390, height: 844, isMobile: true, hasTouch: true }, true]]) {
  const p = await open(vp, true); await p.evaluate(() => document.querySelector('#work').scrollIntoView()); await sleep(1200); const S = mob ? { frame: '.cm-fc', video: '.cm-fc .cm-galvid canvas', ah: '[data-m-ah]', ap: '[data-m-ap]', lead: '[data-m-hl]', pin: '[data-m-pin]', tr: '[data-m-track]' } : { frame: '.cor-plate', video: '.cor-plate .cor-frame canvas', ah: '[data-d-ah]', ap: '[data-d-ap]', lead: '[data-d-lead]', pin: '[data-d-pin]', tr: '[data-d-track]' };
  const r = await p.evaluate((S) => { const g = (s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { y: r.top, b: r.bottom, w: r.width, h: r.height, op: +getComputedStyle(e).opacity }; }; return { pos: getComputedStyle(document.querySelector(S.pin)).position, trH: g(S.tr).h, pinH: g(S.pin).h, ah: g(S.ah), ap: g(S.ap), fr: g(S.frame), vid: g(S.video), lead: g(S.lead), hdr: document.querySelector('header').children[1].getBoundingClientRect().bottom }; }, S);
  ok(`reduced motion ${name}: completed arrival composition shown directly, no pin or walk`, r.pos === 'relative' && Math.abs(r.trH - r.pinH) < 2 && r.ah.op === 1 && r.ap.op === 1 && r.lead.op < 0.02 && r.ah.b <= r.fr.y + 1 && r.ap.y >= r.fr.b - 1 && Math.abs(r.vid.w / r.vid.h - 16 / 9) < 0.012, JSON.stringify(r));
  if (WITH_VIDEO) ok(`reduced motion ${name}: video does not autoplay`, await p.evaluate(() => { const v = document.querySelector('video.cor-vid'); return !v || v.paused; }));
  ok(`reduced motion ${name}: no horizontal overflow, no errors`, (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) && p.errs.length === 0, p.errs.join('|'));
  await p.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
