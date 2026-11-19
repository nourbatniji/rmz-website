import puppeteer from 'puppeteer-core';
// usage: node lens-tests.mjs [url]
const URL = process.argv[2] || 'http://localhost:3111/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const NAMES = ['Branding', 'Creative Strategy', 'Content Production', 'Social Media', 'Design', 'Paid Media', 'Web Experiences'];
const FOCAL = ['24mm', '35mm', '50mm', '85mm', '135mm', 'Macro', 'Tele'];
const REST = [0.94, 0.66, 0.84, 0.74, 0.96, 0.6, 0.8];
const IR = { Rp: 356, ap: 361, dl: 21.66 };
const thDeg = (o) => Math.acos(Math.max(-1, Math.min(1, (o * IR.ap - IR.dl) / IR.Rp))) * 180 / Math.PI;
async function open(vp, rm) { const p = await b.newPage(); await p.setViewport(vp); if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(900); return p; }
const toLens = async (p, off = 0) => { const t = await p.evaluate(() => document.querySelector('#services').getBoundingClientRect().top + scrollY); await p.evaluate((y) => scrollTo(0, y), t + off); await sleep(900); };
const state = (p) => p.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-row]')];
  const sc = [...document.querySelectorAll('[data-sc]')].map((e) => +getComputedStyle(e).opacity);
  const blade = document.querySelector('#services svg g[clip-path] g g');
  const m = new DOMMatrix(getComputedStyle(blade).transform);
  const deg = Math.atan2(m.b, m.a) * 180 / Math.PI;
  const txt = [...document.querySelectorAll('#services p.lens-nm')].map((e) => e.textContent).join(' | ');
  return { sel: rows.findIndex((r) => r.getAttribute('aria-pressed') === 'true'), pressed: rows.filter((r) => r.getAttribute('aria-pressed') === 'true').length, shown: sc.findIndex((o) => o > 0.5), visScenes: sc.filter((o) => o > 0.5).length, bladeDeg: deg, txt, live: document.querySelector('#services [aria-live]').textContent, ring: getComputedStyle(document.querySelector('#services [data-ring]')).transform };
});
const settle = (ms = 1500) => sleep(ms);

// ───────────────── desktop 1440×900 ─────────────────
{
  const p = await open({ width: 1440, height: 900 });
  const order = await p.evaluate(() => [...document.querySelectorAll('main > *')].map((e) => e.id || e.getAttribute('aria-label') || e.textContent.slice(0, 22)));
  ok('section order: … featured-work marker → SERVICES (lens) → capabilities (Minds) → …', order.indexOf('services') > order.indexOf('statement') && order[order.indexOf('services') + 1] === 'minds' && /Upcoming section · Fea/.test(order[order.indexOf('services') - 1]), order.join(' | '));
  await toLens(p);
  const info = await p.evaluate(() => ({ names: [...document.querySelectorAll('[data-row] .lens-snm')].map((e) => e.textContent), chips: [...document.querySelectorAll('[data-row] .lens-sch')].map((e) => e.textContent), h: document.querySelector('#services').getBoundingClientRect().height, bg: getComputedStyle(document.querySelector('#services')).backgroundColor, txt: document.querySelector('#services').innerText, marks: document.querySelectorAll('.lens-mk').length, scenes: document.querySelectorAll('[data-sc]').length, ph: document.querySelectorAll('[data-ph]').length, imgs: document.querySelectorAll('#services img').length, pos: getComputedStyle(document.querySelector('#services')).position }));
  ok('seven services in the approved taxonomy order, with focal chips', JSON.stringify(info.names) === JSON.stringify(NAMES) && JSON.stringify(info.chips.map((c) => c.toLowerCase())) === JSON.stringify(FOCAL.map((c) => c.toLowerCase())), info.names.join(','));
  ok('no old services, no "Packaging", no prototype controls or notes (Motion toggle, provisional-imagery note)', !/packaging|brand strategy|growth & marketing|motion: |provisional imagery|explore service/i.test(info.txt));
  ok('canvas geometry: 892 px tall at 1440 (stage 900 trimmed so the Minds columns sit closer), red #D52518 background, normal flow (not pinned)', Math.abs(info.h - 892) < 1 && info.bg === 'rgb(213, 37, 24)' && info.pos === 'relative', `${info.h} ${info.bg}`);
  ok('seven ring marks, seven studies; missing imagery = labelled placeholders (no broken <img>)', info.marks === 7 && info.scenes === 7 && info.ph > 10 && info.imgs === 0, `ph ${info.ph}`);
  let s = await state(p);
  ok('initial state: Content Production selected, one pressed row, matching study, resting aperture', s.sel === 2 && s.pressed === 1 && s.shown === 2 && s.visScenes === 1 && Math.abs(s.bladeDeg - thDeg(REST[2])) < 0.5, JSON.stringify({ sel: s.sel, shown: s.shown, deg: s.bladeDeg.toFixed(1), want: thDeg(REST[2]).toFixed(1) }));
  // every service: click → iris closes, swap, opens; exact final aperture and study
  let prevI = 2;
  for (const i of [0, 5, 3, 6, 1, 4, 2]) {
    await p.evaluate((i) => document.querySelectorAll('[data-row]')[i].click(), i);
    await sleep(260); const mid = await state(p);
    await sleep(2000); s = await state(p);
    ok(`select ${NAMES[i]}: iris starts closing (blade ${mid.bladeDeg.toFixed(0)}° vs previous rest), then settles at its aperture ${Math.round(REST[i] * 100)}%, study ${i + 1} only`, mid.sel === i && Math.abs(mid.bladeDeg - thDeg(REST[prevI])) > 5 && s.sel === i && s.shown === i && s.visScenes === 1 && Math.abs(s.bladeDeg - thDeg(REST[i])) < 0.5 && s.txt.includes(`${Math.round(REST[i] * 100)}%`) && s.txt.toLowerCase().includes(FOCAL[i].toLowerCase()), `mid ${mid.bladeDeg.toFixed(1)} final ${s.bladeDeg.toFixed(1)}`);
    prevI = i;
  }
  // the study swaps while the iris is (nearly) closed
  await p.evaluate(() => document.querySelectorAll('[data-row]')[6].click());
  const seq = []; for (let t = 0; t < 1300; t += 50) { const st = await state(p); seq.push([t, st.shown, +st.bladeDeg.toFixed(0)]); await sleep(50); }
  const swapAt = seq.find((q) => q[1] === 6); const closedDeg = thDeg(0.04);
  ok(`iris sequence: study swaps only after the iris has closed (swap at ≈${swapAt ? swapAt[0] : '?'} ms, blade ${swapAt ? swapAt[2] : '?'}° vs closed ${closedDeg.toFixed(0)}°)`, !!swapAt && swapAt[0] >= 300 && swapAt[0] <= 800 && Math.abs(swapAt[2] - closedDeg) < 12, JSON.stringify(seq.slice(0, 14)));
  await settle(1500);
  // rapid selection
  const order2 = [0, 3, 1, 6, 2, 5, 4, 0, 6, 2, 4, 1, 5, 3, 6, 0, 2, 5, 1, 4]; for (const i of order2) { await p.evaluate((i) => document.querySelectorAll('[data-row]')[i].click(), i); await sleep(40); }
  await settle(3500); s = await state(p); const last = order2[order2.length - 1];
  ok(`rapid clicks (20 × 40 ms) settle on the last choice (${NAMES[last]}) with one study, correct aperture, one pressed row`, s.sel === last && s.shown === last && s.visScenes === 1 && s.pressed === 1 && Math.abs(s.bladeDeg - thDeg(REST[last])) < 0.5, JSON.stringify({ sel: s.sel, shown: s.shown, deg: s.bladeDeg.toFixed(1) }));
  // connectors follow the selected row
  await p.evaluate(() => document.querySelectorAll('[data-row]')[4].click()); await settle(1800);
  const conn2 = await p.evaluate(() => { const r = document.querySelectorAll('[data-row]')[4].getBoundingClientRect(); const dot = [...document.querySelectorAll('#services .lens-stage > span')][0].getBoundingClientRect(); return Math.abs((r.top + r.height / 2) - (dot.top + dot.height / 2)); });
  ok('connector dot tracks the selected row', conn2 < 4, conn2.toFixed(1));
  // prev / next
  await p.evaluate(() => document.querySelectorAll('[data-row]')[2].click()); await settle(1700);
  await (await p.$('[aria-label="Next service"]')).click(); await settle(1700); s = await state(p);
  ok('Next → Social Media', s.sel === 3 && s.shown === 3);
  await (await p.$('[aria-label="Previous service"]')).click(); await (await p.$('[aria-label="Previous service"]')).click(); await settle(2200); s = await state(p);
  ok('Previous ×2 → Creative Strategy', s.sel === 1 && s.shown === 1);
  await p.evaluate(() => document.querySelectorAll('[data-row]')[0].click()); await settle(1500); const prevOp = await p.evaluate(() => +getComputedStyle(document.querySelector('[aria-label="Previous service"]')).opacity);
  ok('Previous dimmed at the first service', prevOp < 0.5);
  // ring mark click
  await p.evaluate(() => document.querySelectorAll('[data-row]')[2].click()); await settle(1700);
  const mk = await p.evaluate(() => { const m = [...document.querySelectorAll('.lens-mk')].map((e, i) => ({ i, o: +getComputedStyle(e).opacity, r: e.getBoundingClientRect() })).filter((x) => x.o === 1 && x.i === 3)[0]; return m ? { x: m.r.left + m.r.width / 2, y: m.r.top + m.r.height / 2 } : null; });
  if (mk) { await p.mouse.click(mk.x, mk.y); await settle(1800); s = await state(p); }
  ok('clicking a visible ring mark selects that service (85mm → Social Media)', !!mk && s.sel === 3 && s.shown === 3);
  // ring drag (angular), snaps
  await p.evaluate(() => document.querySelectorAll('[data-row]')[2].click()); await settle(1700);
  const cen = await p.evaluate(() => { const r = document.querySelector('[data-lens]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const pt = (deg) => ({ x: cen.x + 385 * Math.cos(deg * Math.PI / 180), y: cen.y + 385 * Math.sin(deg * Math.PI / 180) });
  const a0 = pt(180); await p.mouse.move(a0.x, a0.y); await p.mouse.down(); for (let d = 180; d >= 130; d -= 2) { const q = pt(d); await p.mouse.move(q.x, q.y); await sleep(12); }
  const during = await state(p); await p.mouse.up(); await settle(2600); s = await state(p);
  ok(`dragging the ring ≈ 50° moves two focal marks and snaps (Content Production → Design); the ring turned live while dragging`, s.sel === 4 && s.shown === 4 && during.ring !== 'none', JSON.stringify({ sel: s.sel, shown: s.shown }));
  const rdeg = await p.evaluate(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector('[data-ring]')).transform); return Math.atan2(m.b, m.a) * 180 / Math.PI; });
  ok(`ring rests exactly on the mark (${rdeg.toFixed(1)}° = −4 × 24°)`, Math.abs(rdeg + 96) < 0.6);
  // drag that ends where it started
  const b0 = pt(180); await p.mouse.move(b0.x, b0.y); await p.mouse.down(); const q1 = pt(176); await p.mouse.move(q1.x, q1.y); await p.mouse.up(); await settle(1200); s = await state(p);
  ok('a tiny wiggle (< 3°) is a click, not a drag — selection unchanged', s.sel === 4);
  // keyboard
  await p.evaluate(() => document.querySelectorAll('[data-row]')[2].click()); await settle(1700);
  await p.evaluate(() => document.querySelectorAll('[data-row]')[2].focus());
  await p.keyboard.press('ArrowDown'); await sleep(120); let focus = await p.evaluate(() => [...document.querySelectorAll('[data-row]')].indexOf(document.activeElement)); s = await state(p);
  ok('ArrowDown selects the next service and moves focus to its row', s.sel === 3 && focus === 3, `sel ${s.sel} focus ${focus}`);
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await sleep(120); focus = await p.evaluate(() => [...document.querySelectorAll('[data-row]')].indexOf(document.activeElement)); s = await state(p);
  ok('ArrowUp ×2 → Creative Strategy, focus follows', s.sel === 1 && focus === 1);
  await p.keyboard.press('End'); await sleep(100); s = await state(p); const e1 = s.sel; await p.keyboard.press('Home'); await sleep(100); s = await state(p);
  ok('End → last, Home → first', e1 === 6 && s.sel === 0);
  await settle(2200); s = await state(p); ok('keyboard changes complete the iris sequence', s.shown === 0 && s.visScenes === 1);
  ok('screen-reader live region announces the selection once', /^Selected: Branding, 24mm$/.test(s.live), s.live);
  // tab order + focus ring
  await p.evaluate(() => document.activeElement.blur()); await p.evaluate(() => document.querySelector('[data-row]').focus());
  const seq2 = []; for (let i = 0; i < 9; i++) { seq2.push(await p.evaluate(() => { const a = document.activeElement; return a.getAttribute('data-row') !== null ? 'row' : (a.getAttribute('aria-label') || a.tagName); })); await p.keyboard.press('Tab'); }
  ok('Tab order: 7 service rows → Previous → Next (ring marks are not tab stops)', seq2.slice(0, 7).every((x) => x === 'row') && seq2[7] === 'Previous service' && seq2[8] === 'Next service', seq2.join(','));
  await p.evaluate(() => document.querySelectorAll('[data-row]')[3].focus()); await p.keyboard.press('Tab'); await p.keyboard.down('Shift'); await p.keyboard.press('Tab'); await p.keyboard.up('Shift');
  const fr = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return [c.outlineStyle, c.outlineWidth, c.outlineColor]; }); ok('visible yellow focus ring', fr[0] === 'solid' && parseFloat(fr[1]) >= 2 && /255, 202, 38/.test(fr[2]), fr.join(' '));
  // scrolling: no capture
  const dp = await p.evaluate(() => { const ev = new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }); document.querySelector('[data-lens]').dispatchEvent(ev); return ev.defaultPrevented; });
  ok('no wheel handler anywhere in the section', dp === false);
  await toLens(p, 100); await p.mouse.move(1140, 400); const y0 = await p.evaluate(() => scrollY); await p.mouse.wheel({ deltaY: 300 }); await sleep(500); ok('real wheel over the lens scrolls the page', (await p.evaluate(() => scrollY)) > y0 + 200);
  // anchor + header clearance
  await p.evaluate(() => scrollTo(0, 0)); await sleep(300); await p.evaluate(() => { location.hash = '#services'; }); await sleep(900);
  const hc = await p.evaluate(() => ({ k: document.querySelector('#services .lens-nm').getBoundingClientRect().top, hdr: document.querySelector('header').children[1].getBoundingClientRect().bottom }));
  ok('direct navigation to #services keeps the kicker and heading clear of the header', hc.k >= hc.hdr - 1, JSON.stringify(hc));
  ok('desktop: no horizontal overflow, no page errors', (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) && p.errs.length === 0, p.errs.join('|'));
  // entry / exit
  const ee = []; for (const f of [-1.0, -0.5, 0, 0.5, 1.0]) { await p.evaluate((f) => scrollTo(0, document.querySelector('#services').getBoundingClientRect().top + scrollY + 900 * f), f); await sleep(250); ee.push(await p.evaluate(() => { const r = document.querySelector('#services').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; })); }
  const gap = await p.evaluate(() => { const a = document.querySelector('#services').getBoundingClientRect(); const n = document.querySelector('#minds').getBoundingClientRect(); const pr = document.querySelector('#services').previousElementSibling.getBoundingClientRect(); return [Math.abs(a.bottom - n.top), Math.abs(a.top - pr.bottom)]; });
  ok('entry and exit: section butts directly against its neighbours (no blank gaps)', gap[0] < 1.5 && gap[1] < 1.5, JSON.stringify(gap));
  await p.close();
}

// ───────────────── resizing ─────────────────
{
  const p = await open({ width: 1440, height: 900 }); await toLens(p);
  const rows = [];
  for (const [w, h] of [[1280, 720], [1100, 800], [1920, 1080], [1024, 768], [1440, 900]]) {
    await p.setViewport({ width: w, height: h }); await sleep(900); await toLens(p);
    rows.push(await p.evaluate(() => { const r = document.querySelector('#services'); const st = r.querySelector('.lens-stage'); const m = r.querySelector('.lens-m'); return { w: innerWidth, h: Math.round(r.getBoundingClientRect().height), stage: !!st, mobile: !!m, scale: st ? +new DOMMatrix(getComputedStyle(st).transform).a.toFixed(3) : null, ov: document.documentElement.scrollWidth > innerWidth, left: st ? Math.round(st.getBoundingClientRect().left) : null }; }));
  }
  ok(`resize: desktop stage scales below 1440 (1280 → ${rows[0].scale}, 1100 → ${rows[1].scale}) and the section height follows (${rows[0].h}, ${rows[1].h})`, Math.abs(rows[0].scale - 1280 / 1440) < 0.01 && Math.abs(rows[1].scale - 1100 / 1440) < 0.01 && Math.abs(rows[0].h - 892 * rows[0].scale) < 2);
  ok(`resize: wider than 1440 the 1440 stage is centred at full size (1920 → left ${rows[2].left}px)`, rows[2].scale === 1 && Math.abs(rows[2].left - 240) < 2);
  ok('resize: below 1100 px the mobile layout takes over; back to 1440 restores the desktop stage', rows[3].mobile && !rows[3].stage && rows[4].stage && !rows[4].mobile);
  ok('resize: no horizontal overflow at any width', rows.every((r) => !r.ov), JSON.stringify(rows.map((r) => r.ov)));
  const s1 = await state(p); ok('resize keeps the selected service', s1.sel === 2);
  await p.close();
}

// ───────────────── mobile 390×844 (touch) ─────────────────
{
  const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await toLens(p, 0);
  const info = await p.evaluate(() => ({ lens: document.querySelector('[data-lens]').getBoundingClientRect().width, stage: !!document.querySelector('.lens-stage'), rows: [...document.querySelectorAll('[data-row]')].map((r) => Math.round(r.getBoundingClientRect().height)), ov: document.documentElement.scrollWidth > innerWidth, head: document.querySelector('#services h2').getBoundingClientRect().right, ctl: [...document.querySelectorAll('.lens-ctl')].map((c) => Math.round(c.getBoundingClientRect().width)) }));
  ok('mobile: lens 330 px, no desktop stage, headline fits (stacked), no overflow', info.lens === 330 && !info.stage && !info.ov && info.head <= 390, JSON.stringify(info));
  ok('mobile: touch targets — rows ≥ 56 px, arrows 48 px', info.rows.every((h) => h >= 54) && info.ctl.every((w) => w >= 44), JSON.stringify([info.rows, info.ctl]));
  const openCount = () => p.evaluate(() => { const rs = [...document.querySelectorAll('#services .lens-m [class*="lens-row-open"]')]; return { n: rs.length, idx: rs.map((r) => [...r.parentElement.children].indexOf(r)), h: [...document.querySelectorAll('.lens-rb')].map((e) => Math.round(e.getBoundingClientRect().height)) }; });
  let oc = await openCount(); ok('mobile: exactly one accordion row open (Content Production)', oc.n === 1 && oc.idx[0] === 2 && oc.h.filter((h) => h > 0).length === 1);
  for (const i of [0, 6, 3]) { const row = (await p.$$('[data-row]'))[i]; await row.evaluate((e) => e.scrollIntoView({ block: 'center' })); await sleep(300); const bx = await row.boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); await sleep(1900); oc = await openCount(); s = await state(p); ok(`mobile: tap ${NAMES[i]} → one open row, study + aperture follow`, oc.n === 1 && oc.idx[0] === i && s.sel === i && s.shown === i && Math.abs(s.bladeDeg - thDeg(REST[i])) < 0.5); }
  var s; await toLens(p, 0);
  const ar = await p.$('[aria-label="Next service"]'); await ar.evaluate((e) => e.scrollIntoView({ block: 'center' })); await sleep(200); const ab = await ar.boundingBox(); await p.touchscreen.tap(ab.x + ab.width / 2, ab.y + ab.height / 2); await sleep(1900); s = await state(p);
  ok('mobile: Next arrow (tap) advances', s.sel === 4 && s.shown === 4);
  // swipe on the glass
  await toLens(p, 0); const lb = await (await p.$('[data-lens]')).boundingBox(); const cx = lb.x + lb.width / 2, cy = lb.y + lb.height / 2;
  await p.touchscreen.touchStart(cx + 40, cy); for (let i = 1; i <= 12; i++) { await p.touchscreen.touchMove(cx + 40 - i * 14, cy + 2); await sleep(14); } await p.touchscreen.touchEnd(); await sleep(2200); s = await state(p);
  ok(`mobile: swiping the glass left changes the service (Design → ${NAMES[s.sel]})`, s.sel !== 4 && s.shown === s.sel, `sel ${s.sel}`);
  // vertical drag over the glass scrolls the page (no trapping)
  await toLens(p, 0); const y0 = await p.evaluate(() => scrollY); const lb2 = await (await p.$('[data-lens]')).boundingBox(); await p.touchscreen.touchStart(lb2.x + lb2.width / 2, lb2.y + lb2.height / 2 + 60); for (let i = 1; i <= 12; i++) { await p.touchscreen.touchMove(lb2.x + lb2.width / 2 + 1, lb2.y + lb2.height / 2 + 60 - i * 18); await sleep(16); } await p.touchscreen.touchEnd(); await sleep(700);
  const y1 = await p.evaluate(() => scrollY);
  ok('mobile: vertical drag starting on the lens glass scrolls the page and does not change the service', y1 > y0 + 80, `scrollY ${y0}→${y1}`);
  // ring drag by touch
  await p.evaluate(() => document.querySelectorAll('[data-row]')[0].click()); await sleep(2200);
  await toLens(p, 0); const lb3 = await (await p.$('[data-lens]')).boundingBox(); const c3 = { x: lb3.x + lb3.width / 2, y: lb3.y + lb3.height / 2 }; const R3 = 158; const before = (await state(p)).sel;
  const P = (d) => ({ x: c3.x + R3 * Math.cos(d * Math.PI / 180), y: c3.y + R3 * Math.sin(d * Math.PI / 180) });
  const q0 = P(180); await p.touchscreen.touchStart(q0.x, q0.y); for (let d = 180; d >= 150; d -= 3) { const q = P(d); await p.touchscreen.touchMove(q.x, q.y); await sleep(14); } await p.touchscreen.touchEnd(); await sleep(2200); s = await state(p);
  ok('mobile: dragging the ring by touch moves the service forward', s.sel > before, `${before} → ${s.sel}`);
  // keyboard on the lens group
  await p.evaluate(() => document.querySelector('[data-lens]').focus()); await p.keyboard.press('Home'); await sleep(100); s = await state(p); ok('mobile: lens group is keyboard focusable (Arrow/Home/End)', s.sel === 0);
  await p.keyboard.press('ArrowRight'); await sleep(100); s = await state(p); ok('mobile: ArrowRight on the lens → next', s.sel === 1);
  for (const w of [390, 360, 320]) { await p.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true }); await sleep(700); ok(`mobile ${w}: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); }
  ok('mobile: no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────────────── reduced motion ─────────────────
{
  const p = await open({ width: 1440, height: 900 }, true); await toLens(p);
  const t = await p.evaluate(() => ({ row: getComputedStyle(document.querySelector('[data-row]').parentElement).transitionDuration, ring: getComputedStyle(document.querySelector('#services [data-ring]')).transitionDuration, blade: getComputedStyle(document.querySelector('#services svg g[clip-path] g g')).transitionDuration, sc: getComputedStyle(document.querySelector('[data-sc]')).transitionDuration }));
  ok('reduced motion: no transitions on rows, ring, iris or studies', Object.values(t).every((v) => /^0s(, 0s)*$/.test(v)), JSON.stringify(t));
  await p.evaluate(() => document.querySelectorAll('[data-row]')[5].click()); await sleep(120); const s = await state(p);
  ok('reduced motion: selecting swaps the study and aperture immediately, no iris animation', s.sel === 5 && s.shown === 5 && s.visScenes === 1 && Math.abs(s.bladeDeg - thDeg(REST[5])) < 0.5, JSON.stringify({ shown: s.shown, deg: s.bladeDeg.toFixed(1) }));
  await p.keyboard.press('Tab'); ok('reduced motion: no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
  const m = await open({ width: 390, height: 844, isMobile: true, hasTouch: true }, true); await toLens(m);
  await m.evaluate(() => document.querySelectorAll('[data-row]')[1].click()); await sleep(150); const sm = await state(m);
  ok('reduced motion (mobile): instant selection', sm.sel === 1 && sm.shown === 1); await m.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
