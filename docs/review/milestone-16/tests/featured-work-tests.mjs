import puppeteer from 'puppeteer-core';
// usage: node fw-tests.mjs [url] — FeaturedWorkFocus (canvas "HOME - ABOUT SECTION"): scroll-linked flip, pinned stage, faces, a11y, fallbacks
const URL = process.argv[2] || 'http://localhost:3111/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const LAST = 11;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
async function open(vp, o = {}) {
  const p = await b.newPage(); await p.setViewport(vp); if (o.rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); if (o.nojs) await p.setJavaScriptEnabled(false);
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
  await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(1100); return p;
}
const geo = (p) => p.evaluate(() => { const t = document.querySelector('.fw-track'), st = document.querySelector('.fw-stage'); const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')); return { top: t.getBoundingClientRect().top + scrollY, h: t.offsetHeight, stageH: st.offsetHeight, hh }; });
const atS = async (p, s, wait = 600) => { const g = await geo(p); await p.evaluate((y) => scrollTo(0, y), g.top - g.hh + (s * (g.h - g.stageH)) / LAST); await sleep(wait); return g; };
const barPct = (p) => p.evaluate(() => parseFloat(document.querySelector('.fw-bar i').style.width));
const sRendered = async (p) => (await barPct(p)) / 100 * LAST;
const turnAngle = (p, i = 0) => p.evaluate((i) => { const m = new DOMMatrix(getComputedStyle(document.querySelectorAll('.fw-turn')[i]).transform); return Math.atan2(-m.m13, m.m11) * 180 / Math.PI; }, i);
const vis = (p, i = 0) => p.evaluate((i) => { const c = document.querySelectorAll('[data-fw-card]')[i]; return { f: getComputedStyle(c.querySelector('.fw-front')).visibility, b: getComputedStyle(c.querySelector('.fw-back')).visibility, card: getComputedStyle(c).visibility }; }, i);
const px = async (p, x, y) => { const b64 = await p.screenshot({ encoding: 'base64' }); return p.evaluate(async (b64, x, y) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const k = im.width / innerWidth; const d = g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; return [d[0], d[1], d[2]]; }, b64, x, y); };
const cardRect = (p, i = 0) => p.evaluate((i) => { const r = document.querySelectorAll('[data-fw-card]')[i].getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; }, i);

// ═══════════════ DESKTOP 1440×900 ═══════════════
{
  const p = await open({ width: 1440, height: 900 });
  const g = await geo(p); const step = (g.h - g.stageH) / LAST;
  ok(`layout reserved up front: track ${g.h}px = stage ${g.stageH}px + 11 steps × ${step.toFixed(0)}px (max(360px, 50svh))`, Math.abs(step - 450) < 1 && g.stageH === 900 - g.hh);
  // layout stable: document height + section top never change while scrolling through
  const dh = []; for (const s of [0, 3, 6, 11]) { await atS(p, s, 250); dh.push(await p.evaluate(() => [document.documentElement.scrollHeight, Math.round(document.querySelector('#selected').getBoundingClientRect().height)])); }
  ok('no layout jumps: document and section heights are identical at every position', dh.every((d) => d[0] === dh[0][0] && d[1] === dh[0][1]), JSON.stringify(dh[0]));
  // header clearance + pinning
  const pins = []; for (const s of [0.5, 2, 5, 8.5, 10.5]) { await atS(p, s, 250); pins.push(await p.evaluate(() => { const st = document.querySelector('.fw-stage').getBoundingClientRect(); const lab = document.querySelector('.fw-label').getBoundingClientRect(); const wall = [...document.querySelectorAll('[data-fw-card]')].map((c) => c.getBoundingClientRect().top).filter((t) => t > 0); return { stageTop: Math.round(st.top), label: Math.round(lab.top), cards: Math.round(Math.min(...wall)) }; })); }
  ok('pinned stage sits directly below the fixed header (top = 92px) for the whole range, and nothing in it is covered by the header', pins.every((q) => q.stageTop === 92 && q.label >= 92 && q.cards >= 92), JSON.stringify(pins[0]));
  await atS(p, 0, 300); const before = await p.evaluate(() => Math.round(document.querySelector('.fw-stage').getBoundingClientRect().top)); await p.evaluate(() => scrollTo(0, document.querySelector('.fw-track').getBoundingClientRect().top + scrollY - 400)); await sleep(300);
  const pre = await p.evaluate(() => ({ top: Math.round(document.querySelector('.fw-stage').getBoundingClientRect().top), bar: document.querySelector('.fw-bar i').style.width }));
  ok('entry: before the pin the stage scrolls in naturally showing step 0 (front of card 1), then pins at the header', pre.top > 92 && parseFloat(pre.bar) === 0 && before === 92, JSON.stringify(pre));
  // flip angle follows scroll (forward) at 0..1
  const fwd = []; for (const s of [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1]) { await atS(p, s, 650); fwd.push({ s, a: Math.abs(await turnAngle(p)), r: await sRendered(p) }); }
  ok('forward: the centred card turns front → back, angle = 180° × ease(progress) at each scroll position (0, 0.2, 0.35, 0.5, 0.65, 0.8, 1)', fwd.every((q) => Math.abs(q.a - ease(q.s) * 180) < 2.5), fwd.map((q) => `${q.s}:${q.a.toFixed(0)}°`).join(' '));
  ok('…and the angle only ever increases on the way forward', fwd.every((q, i) => i === 0 || q.a >= fwd[i - 1].a - 0.5));
  const bwd = []; for (const s of [1, 0.8, 0.65, 0.5, 0.35, 0.2, 0]) { await atS(p, s, 650); bwd.push({ s, a: Math.abs(await turnAngle(p)) }); }
  ok('reverse: scrolling back retraces the same angles exactly (same position → same angle) and returns to 0°', bwd.every((q) => Math.abs(q.a - ease(q.s) * 180) < 2.5) && bwd[bwd.length - 1].a < 0.5, bwd.map((q) => `${q.s}:${q.a.toFixed(0)}°`).join(' '));
  // faces: exactly one face visible; no bleed-through; not mirrored
  const faces = []; for (const s of [0, 0.15, 0.4, 0.49, 0.51, 0.6, 0.85, 1]) { await atS(p, s, 650); faces.push({ s, ...(await vis(p)) }); }
  ok('backface handling: exactly one face of the centred card is visible at every angle (front below 90°, back at/above 90°) — no both-visible frame, no abrupt content swap other than at the 90° edge-on instant', faces.every((f) => (f.s < 0.5 ? f.f === 'visible' && f.b === 'hidden' : f.s > 0.5 ? f.f === 'hidden' && f.b === 'visible' : true)), faces.map((f) => `${f.s}:${f.f[0]}${f.b[0]}`).join(' '));
  await atS(p, 0.12, 700); let r = await cardRect(p); let c1 = await px(p, r.l + r.w / 2, r.t + r.h * 0.4);
  ok('no bleed-through on the front (just after the start): the image area still shows the orange project fill, not cream/back content', c1[0] > 180 && c1[1] < 150 && c1[2] < 100, JSON.stringify(c1));
  await atS(p, 0.88, 700); r = await cardRect(p); let c2 = await px(p, r.l + r.w * 0.5, r.t + r.h * 0.55);
  ok('no bleed-through on the back (just before the end): the card is cream with no orange image behind it', c2[0] > 200 && c2[1] > 190 && c2[2] > 150, JSON.stringify(c2));
  await atS(p, 1, 800); r = await cardRect(p);
  const ink = async (x0, x1, y0, y1) => { const b64 = await p.screenshot({ encoding: 'base64' }); return p.evaluate(async (b64, a) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const k = im.width / innerWidth; let n = 0; for (let x = a[0]; x < a[1]; x += 2) for (let y = a[2]; y < a[3]; y += 2) { const d = g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; if (d[0] + d[1] + d[2] < 120) n++; } return n; }, b64, [x0, x1, y0, y1]); };
  const nameY0 = r.t + r.h * 0.1, nameY1 = r.t + r.h * 0.26; const inkL = await ink(r.l + 4, r.l + r.w / 2, nameY0, nameY1), inkR = await ink(r.l + r.w / 2, r.l + r.w - 4, nameY0, nameY1);
  ok('text is not mirrored: the back face\'s heading "ARID" is set from the LEFT edge (ink in the left half, almost none in the right)', inkL > 150 && inkR < inkL * 0.15, `left ${inkL} right ${inkR}`);
  const prop = await p.evaluate(() => { const c = document.querySelectorAll('[data-fw-card]')[0].getBoundingClientRect(); const bx = document.querySelector('.fw-box'); const m = new DOMMatrix(getComputedStyle(bx).transform); const inner = document.querySelectorAll('.fw-inner')[0]; const im = new DOMMatrix(getComputedStyle(inner).transform); return { ratio: c.width / c.height, sx: m.a, sy: m.d, k: im.a, innerW: inner.getBoundingClientRect().width, cardW: c.width, ih: parseFloat(getComputedStyle(document.querySelectorAll('.fw-img')[0]).height) }; });
  ok('proportions preserved: the artboard scales uniformly (x = y), the centred card keeps its 430 : 516 shape, back content is only scaled by the card-width ratio (never stretched)', Math.abs(prop.sx - prop.sy) < 1e-6 && Math.abs(prop.ratio - 430 / 516) < 0.01 && Math.abs(prop.k - 1) < 0.001, JSON.stringify({ sx: prop.sx.toFixed(3), ratio: prop.ratio.toFixed(3), k: prop.k }));
  // hold, settle, smoothing
  await atS(p, 2.4, 300); await sleep(500); const h1 = await barPct(p); const a1 = await turnAngle(p, 1); await sleep(1500); const h2 = await barPct(p); const a2 = await turnAngle(p, 1);
  ok('stopping midway holds the corresponding state (no drift over 1.5 s)', h1 === h2 && Math.abs(a1 - a2) < 1e-6, `${h1}% → ${h2}%`);
  const g2 = await geo(p); const want = (2.4 / LAST) * 100; ok('…and the settled state matches the scroll position precisely', Math.abs(h2 - want) < 0.05, `${h2} vs ${want.toFixed(3)}`);
  // frame-by-frame smoothing
  await atS(p, 3, 800);
  await p.evaluate(() => { window.__fr = []; window.__on = true; const l = (t) => { if (!window.__on) return; window.__fr.push({ t, w: parseFloat(document.querySelector('.fw-bar i').style.width) }); requestAnimationFrame(l); }; requestAnimationFrame(l); });
  const t0 = await p.evaluate(() => performance.now()); await p.evaluate((y) => scrollTo(0, scrollY + y), 0.3 * ((g2.h - g2.stageH) / LAST)); await sleep(800); const fr = (await p.evaluate(() => window.__fr)).filter((f) => f.t >= t0);
  const tg = fr[fr.length - 1].w; const st = fr[0].w; const t90 = fr.find((f) => Math.abs(f.w - tg) <= 0.1 * Math.abs(tg - st)); const done = fr.find((f) => Math.abs(f.w - tg) < 0.01);
  ok(`smoothing: a 0.3-step scroll eases in (90 % in ${(t90.t - t0).toFixed(0)} ms, exact by ${(done.t - t0).toFixed(0)} ms), monotonic, no overshoot`, t90.t - t0 <= 260 && done.t - t0 <= 520 && fr.every((f, i) => i === 0 || f.w >= fr[i - 1].w - 1e-6) && fr.every((f) => f.w <= tg + 0.01));
  await p.evaluate(() => { window.__on = false; });
  // fast jumps
  await atS(p, 0, 400); const gj = await geo(p); await p.evaluate((y) => scrollTo(0, y), gj.top - gj.hh + 9 * ((gj.h - gj.stageH) / LAST)); await sleep(120); let rj = await sRendered(p);
  ok('fast jump forward (0 → step 9): shown at once, no trailing', Math.abs(rj - 9) < 0.02, `rendered ${rj.toFixed(3)}`);
  await p.evaluate((y) => scrollTo(0, y), gj.top - gj.hh); await sleep(120); rj = await sRendered(p); ok('fast jump back to the start: first card front, exact', rj < 0.02 && Math.abs(await turnAngle(p)) < 0.5, `rendered ${rj.toFixed(3)}`);
  // the whole sequence: each project front/back in order
  const seq = []; for (let k = 0; k <= LAST; k++) { await atS(p, k, 700); seq.push(await p.evaluate(() => { const t = document.querySelector('.fw-readout').textContent; return t.slice(0, 40); })); }
  ok('the full sequence 01 → 12 shows each project\'s front then back in order, ending on Bloom\'s description', seq[0].includes('01 · ARID') && seq[1].includes('Back') || seq[1].toLowerCase().includes('back') ? seq.every((t, k) => t.toLowerCase().includes(['arid', 'arid', 'drift', 'drift', 'tidepool', 'tidepool', 'rouge', 'rouge', 'blush', 'blush', 'bloom', 'bloom'][k])) : false, seq.join(' | ').slice(0, 200));
  // anti-capture
  const cap = await p.evaluate(() => { const st = document.querySelector('.fw-stage'); const w = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true }); const wd = st.dispatchEvent(w); const t = new TouchEvent('touchmove', { cancelable: true, bubbles: true, touches: [] }); const td = st.dispatchEvent(t); return { wheelPrevented: !wd, touchPrevented: !td, overflow: getComputedStyle(document.documentElement).overflow + '/' + getComputedStyle(document.body).overflow }; });
  ok('no wheel capture, no touch capture, no scroll locking (events are not cancelled; html/body overflow untouched)', !cap.wheelPrevented && !cap.touchPrevented && !/hidden/.test(cap.overflow), JSON.stringify(cap));
  await atS(p, 4, 300); const y0 = await p.evaluate(() => scrollY); await p.keyboard.press('PageDown'); await sleep(600); const y1 = await p.evaluate(() => scrollY); ok('native keyboard scrolling works through the section (PageDown moves the page)', y1 > y0 + 200, `${y0} → ${y1}`);
  // controls
  await atS(p, 0, 400); await p.click('.fw-pfb:nth-of-type(2)'); await sleep(1500); const afterNext = await sRendered(p);
  ok('Next scrolls the page one step (to the back of card 1) — it only scrolls, scroll alone does everything', Math.abs(afterNext - 1) < 0.03, `step ${afterNext.toFixed(2)}`);
  await p.click('.fw-pfb:nth-of-type(1)'); await sleep(1500); const afterPrev = await sRendered(p); ok('Previous scrolls back one step', afterPrev < 0.03, afterPrev.toFixed(2));
  await p.click('.fw-pfr:nth-child(1) >> xpath/..').catch(() => {}); const rows = await p.$$('.fw-pfr'); await rows[3].click(); await sleep(2200); const afterRow = await sRendered(p);
  ok('project list: choosing 04 Rouge scrolls to the front of card 4 (step 6)', Math.abs(afterRow - 6) < 0.05 && (await p.evaluate(() => document.querySelector('.fw-pfr.on span:nth-child(2)').textContent)) === 'Rouge', `step ${afterRow.toFixed(2)}`);
  // accessibility
  const a11y = await p.evaluate(() => { const sr = [...document.querySelectorAll('.fw-flip ol.sr-only > li')].map((li) => li.textContent); const hidFocus = [...document.querySelectorAll('#selected [aria-hidden="true"]')].filter((e) => e.matches('button,a,input,[tabindex]') || e.querySelector('button,a,input,[tabindex]')).length; const sec = document.querySelector('#selected'); const h = document.getElementById(sec.getAttribute('aria-labelledby')); return { n: sr.length, both: sr.every((t, i) => /Placeholder for/.test(t) && (i < 3 ? /Image: /.test(t) : /Project image pending/.test(t))), hidFocus, heading: h && h.textContent, live: !!document.querySelector('.fw-flip [aria-live="polite"]'), labelled: sec.tagName }; });
  ok('screen readers: a complete list of all 6 projects (category, image note, description) is available; the 3D wall is aria-hidden with nothing focusable inside; labelled section heading', a11y.n === 6 && a11y.both && a11y.hidFocus === 0 && a11y.heading === 'Selected work' && a11y.live, JSON.stringify(a11y));
  await atS(p, 5, 300); await sleep(1000); const live = await p.evaluate(() => document.querySelector('.fw-flip [aria-live]').textContent); ok('live region announces the settled position (not every frame)', /Project 03, Tidepool, description \(step 6 of 12\)/.test(live), live);
  await p.focus('.fw-pfb:nth-of-type(2)'); const foc = await p.evaluate(() => ({ vis: document.activeElement.matches(':focus-visible'), inStage: !!document.activeElement.closest('.fw-stage'), top: Math.round(document.activeElement.getBoundingClientRect().top) }));
  ok('keyboard focus lands on real controls that stay on screen below the header', foc.inStage && foc.top > 92, JSON.stringify(foc));
  ok('no page errors / no hydration warnings (desktop)', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ═══════════════ other desktop viewports: header clearance + resize ═══════════════
for (const [w, h] of [[1280, 720], [1920, 1080]]) {
  const p = await open({ width: w, height: h }); const out = [];
  for (const s of [0.3, 1, 5.5, 10.7]) { await atS(p, s, 500); out.push(await p.evaluate(() => { const st = document.querySelector('.fw-stage').getBoundingClientRect(); const b = document.querySelector('.fw-box').getBoundingClientRect(); return { top: Math.round(st.top), boxTop: Math.round(b.top), boxBottom: Math.round(b.bottom), stageBottom: Math.round(st.bottom), hh: 92, fits: b.left >= -0.5 && b.right <= innerWidth + 0.5 && b.top >= st.top - 0.5 && b.bottom <= st.bottom + 0.5 }; })); }
  ok(`${w}×${h}: the scaled artboard fits inside the stage, clear of the header (stage top 92px), at every sampled step`, out.every((q) => q.top === 92 && q.fits), JSON.stringify(out[0]));
  await p.close();
}
{
  const p = await open({ width: 1440, height: 900 }); await atS(p, 3, 500);
  await p.setViewport({ width: 1100, height: 700 }); await sleep(900); const a = await p.evaluate(() => ({ s: parseFloat(document.querySelector('.fw-bar i').style.width), ready: document.querySelector('#selected').dataset.ready, ow: document.documentElement.scrollWidth <= innerWidth, scale: new DOMMatrix(getComputedStyle(document.querySelector('.fw-box')).transform).a }));
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); await sleep(1100); const m = await p.evaluate(() => ({ ready: document.querySelector('#selected').dataset.ready, mobile: getComputedStyle(document.querySelector('.fw-wall')).width, ow: document.documentElement.scrollWidth <= innerWidth, list: getComputedStyle(document.querySelector('.fw-list')).display }));
  await p.setViewport({ width: 1440, height: 900 }); await sleep(900); const d = await p.evaluate(() => ({ wall: getComputedStyle(document.querySelector('.fw-wall')).width, ow: document.documentElement.scrollWidth <= innerWidth }));
  ok('resizing 1440 → 1100 → 390 → 1440 keeps the section working: the artboard re-fits (scale ' + a.scale.toFixed(2) + ' at 1100), switches to the single-card layout (320px wall) and back (1440px wall), without horizontal overflow or errors', a.ready === '1' && a.ow && m.mobile === '320px' && m.list === 'none' && m.ow && d.wall === '1440px' && d.ow && p.errs.length === 0, JSON.stringify({ a, m, d }));
  await p.close();
}

// ═══════════════ MOBILE 390×844 ═══════════════
{
  const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const g = await geo(p); ok(`mobile: stage ${g.stageH}px below the ${g.hh}px header; track reserves ${((g.h - g.stageH) / 11).toFixed(0)}px per step`, g.hh === 84 && g.stageH === 844 - 84);
  const q = []; for (const s of [0, 0.5, 1, 1.5, 2, 3]) { await atS(p, s, 700); q.push({ s, ang: Math.abs(await turnAngle(p, 0)), v0: await vis(p, 0), v1: await vis(p, 1), x0: await p.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelectorAll('[data-fw-card]')[0]).transform).m41), x1: await p.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelectorAll('[data-fw-card]')[1]).transform).m41), w: await p.evaluate(() => document.querySelectorAll('[data-fw-card]')[0].offsetWidth) }); }
  ok('mobile card (approved MOBILE · 03): it flips toward the back as you scroll (0 → 180°), then slides left while the next card slides in', q[0].ang < 1 && Math.abs(q[1].ang - 90) < 3 && Math.abs(q[2].ang - 180) < 1 && q[2].v0.b === 'visible' && q[2].v0.f === 'hidden', q.map((x) => `${x.s}:${x.ang.toFixed(0)}°`).join(' '));
  ok('…the slide is scroll-linked (s = 1.5 → card 1 sits 55 % left; s = 2 → it has slid out (−110 %) and card 2 is centred at its front)', Math.abs(q[3].x0 / q[3].w * 100 + 55) < 2 && Math.abs(q[4].x0 / q[4].w * 100 + 110) < 2 && q[4].v1.f === 'visible' && Math.abs(q[4].x1) < 1, `x(1.5)=${(q[3].x0 / q[3].w * 100).toFixed(1)}%`);
  const meta = await p.evaluate(() => ({ list: getComputedStyle(document.querySelector('.fw-list')).display, ctl: document.querySelector('.fw-ctl').getBoundingClientRect().bottom, vh: innerHeight, wall: document.querySelector('.fw-wall').getBoundingClientRect().width }));
  ok('mobile: card stays 320 × 439 proportions, controls (Previous / Next / Open case) sit inside the viewport; the project list is not shown (adaptation pending approval)', Math.abs(meta.wall - 320) < 1 && meta.ctl < meta.vh && meta.list === 'none', JSON.stringify(meta));
  await atS(p, 0, 400); await p.tap('.fw-pfb:nth-of-type(2)'); await sleep(1700); const nx = await p.evaluate(() => document.querySelector('.fw-readout').textContent); ok('mobile Next goes to the NEXT PROJECT\'s front (as in the approved mobile board)', /Project 02 .* Front/i.test(nx), nx);
  ok('no horizontal overflow, no page errors (mobile)', (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) && p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ═══════════════ reduced motion / JS off ═══════════════
{
  const r = await open({ width: 1440, height: 900 }, { rm: true });
  const st = await r.evaluate(() => ({ flip: getComputedStyle(document.querySelector('.fw-flip')).display, stat: getComputedStyle(document.querySelector('.fw-static')).display, items: document.querySelectorAll('.fw-st-item').length, ready: document.querySelector('#selected').dataset.ready || null, h: Math.round(document.querySelector('#selected').getBoundingClientRect().height), text: document.querySelector('.fw-static').innerText.includes('Placeholder for Arid') && document.querySelector('.fw-static').innerText.includes('Placeholder for Bloom'), inFlow: getComputedStyle(document.querySelector('.fw-static')).position }));
  ok('reduced motion: no pinned stage and no flipping — a readable static list of all 6 projects (image + category + description), nothing is run', st.flip === 'none' && st.stat === 'block' && st.items === 6 && st.ready === null && st.text, JSON.stringify(st));
  const ov = await r.evaluate(() => document.documentElement.scrollWidth <= innerWidth); ok('…without horizontal overflow, and no errors', ov && r.errs.length === 0, r.errs.join('|')); await r.close();
  const j = await open({ width: 1440, height: 900 }, { nojs: true });
  const sj = await j.evaluate(() => ({ flip: getComputedStyle(document.querySelector('.fw-flip')).display, stat: getComputedStyle(document.querySelector('.fw-static')).display, items: document.querySelectorAll('.fw-st-item').length }));
  ok('JavaScript off: the same readable static list is shown (the pinned stage is hidden)', sj.flip === 'none' && sj.stat === 'block' && sj.items === 6, JSON.stringify(sj)); await j.close();
  const mm = await open({ width: 390, height: 844, isMobile: true, hasTouch: true }, { rm: true }); const sm = await mm.evaluate(() => ({ stat: getComputedStyle(document.querySelector('.fw-static')).display, ow: document.documentElement.scrollWidth <= innerWidth }));
  ok('reduced motion on mobile: static list, no overflow', sm.stat === 'block' && sm.ow); await mm.close();
}

// ═══════════════ layout shift on load ═══════════════
{
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) window.__cls += e.value; } }).observe({ type: 'layout-shift', buffered: true }); });
  await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(800); const g = await geo(p); await p.evaluate((y) => scrollTo(0, y), g.top - 300); await sleep(1500); const cls = await p.evaluate(() => window.__cls);
  ok('no layout shift from this section while loading and scrolling into it (CLS ≈ 0)', cls < 0.01, `CLS ${cls.toFixed(4)}`); await p.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
