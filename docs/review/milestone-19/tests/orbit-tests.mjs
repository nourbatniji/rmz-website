import puppeteer from 'puppeteer-core';
// Scripted Chrome checks for /lab/orbital-services (existing lens + orbit). Run against a build without database content so the built-in lens content is used.
const U = (v) => `http://localhost:3111/lab/orbital-services?v=${v}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] });
async function open(v, vp, o = {}) {
  const p = await b.newPage(); await p.bringToFront(); await p.setViewport(vp); if (o.rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); if (o.nojs) await p.setJavaScriptEnabled(false);
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(U(v), { waitUntil: 'networkidle0' }); await sleep(900); return p;
}
const frame = (p) => p.screenshot({ type: 'jpeg', quality: 10 }); // forces a frame in headless so scroll events / rAF are delivered
const selOf = (p) => p.evaluate(() => [...document.querySelectorAll('button[data-orb-label]')].findIndex((e) => e.getAttribute('aria-pressed') === 'true'));
const geo = (p) => p.evaluate(() => { const t = document.querySelector('.orb-track'), s = document.querySelector('.orb-stage'); const cs = getComputedStyle(document.documentElement); return t ? { top: t.getBoundingClientRect().top + scrollY, h: t.offsetHeight, sh: s.offsetHeight, hh: parseFloat(cs.getPropertyValue('--header-h')) } : null; });
const atP = async (p, pp) => { const g = await geo(p); await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g.top - g.hh + pp * (g.h - g.sh)); await frame(p); await sleep(500); await frame(p); await sleep(150); };
const rects = (p) => p.evaluate(() => { const r = (e) => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; }; return { labels: [...document.querySelectorAll('button[data-orb-label]')].map((e) => ({ ...r(e), text: e.textContent, tf: getComputedStyle(e).transform })), lens: r(document.querySelector('[data-orb-lens]')), stage: r(document.querySelector('.orb-stage')), desc: r(document.querySelector('.orb-desc')) }; });
const inter = (a, c) => a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;

for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 600 }]) {
  console.log(`\n── A scroll-linked ${vp.width}x${vp.height}`);
  const p = await open('A', vp); const g = await geo(p); const extra = g.h - g.sh;
  ok('bounded sticky scene: 1000–1400 px extra travel', extra >= 1000 && extra <= 1400, `${extra}px`);
  await atP(p, 0); ok('service 1 selected at the start', (await selOf(p)) === 0);
  const r0 = await rects(p); const lensCx = (r0.lens.l + r0.lens.r) / 2;
  const act = r0.labels[0]; ok('active label sits at 12 o\'clock above the lens (centred on it)', Math.abs((act.l + act.r) / 2 - lensCx) < 6 && act.b < r0.lens.t);
  const noOverlap = r0.labels.every((a, i) => !inter(a, r0.lens) && r0.labels.every((c, j) => i >= j || !inter(a, c)));
  ok('labels clear of the lens and each other', noOverlap);
  ok('labels inside the stage', r0.labels.every((a) => a.l >= r0.stage.l - 1 && a.r <= r0.stage.r + 1 && a.t >= r0.stage.t - 1 && a.b <= r0.stage.b + 1), JSON.stringify(r0.labels.filter((a) => a.l < r0.stage.l || a.r > r0.stage.r || a.b > r0.stage.b).map((a) => a.text)));
  ok('labels stay upright (no rotation in their transform)', r0.labels.every((a) => !/matrix\(.*,\s*-?[1-9][0-9.]*,\s*-?[0-9.]+,/.test(a.tf) || true) && r0.labels.every((a) => { const m = a.tf.match(/matrix\(([^)]+)\)/); if (!m) return true; const v = m[1].split(',').map(Number); return Math.abs(v[1]) < 1e-6 && Math.abs(v[2]) < 1e-6; }));
  ok('description clear of the orbit and inside the stage', r0.desc.t >= Math.max(...r0.labels.map((a) => a.b)) - 2 && r0.desc.b <= r0.stage.b + 1, JSON.stringify({ descT: r0.desc.t, labelsB: Math.max(...r0.labels.map((a) => a.b)), descB: r0.desc.b, stageB: r0.stage.b }));
  let last = -1, seq = [];
  for (let i = 0; i < 7; i++) { await atP(p, i / 6); const s = await selOf(p); seq.push(s); }
  ok('rotates through all seven services in order, one per 1/6 of the travel', seq.join() === '0,1,2,3,4,5,6', seq.join());
  await atP(p, 1); const rEnd = await rects(p); await atP(p, 0); const rS = await rects(p);
  ok('description block never moves between services (no layout shift)', Math.abs(rEnd.desc.t - rS.desc.t) < 1 && Math.abs(rEnd.desc.b - rS.desc.b) < 1);
  const back = []; for (let i = 6; i >= 0; i--) { await atP(p, i / 6); back.push(await selOf(p)); } ok('reverse scrolling retraces the same sequence', back.join() === '6,5,4,3,2,1,0', back.join());
  // direct selection: click label 5 → scroll + selection synchronised
  await atP(p, 0); const lab = await p.$$('button[data-orb-label]'); await lab[4].click(); await sleep(1800); await frame(p); await sleep(300);
  const y = await p.evaluate(() => scrollY); const g2 = await geo(p); const pp = (y - (g2.top - g2.hh)) / (g2.h - g2.sh);
  ok('clicking a service scrolls to its step and selects it (synchronised)', (await selOf(p)) === 4 && Math.abs(pp - 4 / 6) < 0.02, `sel ${await selOf(p)} p ${pp.toFixed(3)}`);
  // wheel never captured
  await atP(p, 0.1); const y0 = await p.evaluate(() => scrollY); await p.mouse.move(vp.width / 2, vp.height / 2); for (let i = 0; i < 4; i++) { await p.mouse.wheel({ deltaY: 100 }); await sleep(40); } await sleep(400); await frame(p);
  ok('wheel scrolls the page (no interception)', (await p.evaluate(() => scrollY)) > y0 + 200);
  // skip + release
  await atP(p, 0.2); await p.click('.orb-skip'); await sleep(1800); await frame(p); await sleep(200);
  const after = await p.evaluate(() => { const a = document.querySelector('.orb-after').getBoundingClientRect().top; return a; });
  ok('"Skip services" moves directly beyond the scene', after < vp.height * 0.4 && after > -200, `after-marker top ${Math.round(after)}`);
  await atP(p, 1); await p.evaluate(() => scrollBy(0, 400)); await sleep(300); await frame(p); const rel = await p.evaluate(() => document.querySelector('.orb-stage').getBoundingClientRect().top);
  ok('releases naturally into the following content (stage scrolls away after the last service)', rel < 92 - 100, `stage top ${Math.round(rel)}`);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

console.log('\n── B interactive 1440x900');
{ const p = await open('B', { width: 1440, height: 900 });
  ok('normal flow: no pinned scene, no extra scroll distance', (await geo(p)) === null && (await p.evaluate(() => getComputedStyle(document.querySelector('.orb-stage')).position)) === 'relative');
  await p.evaluate(() => { const e = document.querySelector('#services-orbit'); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 92, behavior: 'instant' }); }); await sleep(500);
  const lab = await p.$$('button[data-orb-label]');
  await lab[3].click(); await sleep(1300); ok('click selects a service', (await selOf(p)) === 3);
  // shortest circular path: from 6 to 0 takes one step forward (wrap), not six back
  await lab[6].click(); await sleep(1300); await p.click('button[aria-label="Next service"]'); await sleep(1300); ok('next wraps 7 → 1 on the circle', (await selOf(p)) === 0);
  await p.click('button[aria-label="Previous service"]'); await sleep(1300); ok('previous wraps 1 → 7', (await selOf(p)) === 6);
  // shortest path timing: 0 → 6 should be a 1-step move (≈ short), measure by sampling intermediate selections
  await lab[0].click(); await sleep(1300); const seen = new Set(); const pr = lab[6].click(); for (let i = 0; i < 12; i++) { seen.add(await selOf(p)); await sleep(60); } await pr; ok('shortest path: 1 → 7 does not pass through the other services', [...seen].every((s) => s === 0 || s === 6), [...seen].join());
  // drag around the lens
  const L = await p.evaluate(() => { const q = document.querySelector('[data-orb-lens]').getBoundingClientRect(); return { cx: q.left + q.width / 2, cy: q.top + q.height / 2, r: q.width / 2 + 40 }; });
  await lab[0].click(); await sleep(1300);
  await p.mouse.move(L.cx, L.cy - L.r); await p.mouse.down(); for (let a = 0; a <= 100; a += 5) { const t = (a * Math.PI) / 180; await p.mouse.move(L.cx + L.r * Math.sin(t), L.cy - L.r * Math.cos(t)); await sleep(16); } await p.mouse.up(); await sleep(1400);
  const rr = await rects(p); const act = rr.labels[await selOf(p)]; const lensCx = (rr.lens.l + rr.lens.r) / 2;
  ok('dragging around the lens changes the service and settles exactly on one (active label at 12 o\'clock)', (await selOf(p)) !== 0 && Math.abs((act.l + act.r) / 2 - lensCx) < 6, `sel ${await selOf(p)}`);
  const y0 = await p.evaluate(() => scrollY); await p.mouse.move(300, 450); await p.mouse.wheel({ deltaY: 300 }); await sleep(400); ok('vertical page scrolling still works', (await p.evaluate(() => scrollY)) > y0 + 100);
  ok('no autoplay: selection unchanged while idle', await (async () => { const s = await selOf(p); await sleep(2500); return (await selOf(p)) === s; })());
  // keyboard
  const s0 = await selOf(p); await lab[s0].focus(); await p.keyboard.press('ArrowRight'); await sleep(1300); const s1 = await selOf(p); const names = await p.evaluate(() => [...document.querySelectorAll('button[data-orb-label]')].map((e) => e.textContent));
  ok('keyboard: arrow moves the selection one step and focus follows the new label', s1 === (s0 + 1) % 7 && (await p.evaluate(() => document.activeElement?.textContent)) === names[s1], `${s0}→${s1}`);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close(); }

console.log('\n── mobile 390x844');
{ const p = await open('B', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.evaluate(() => { const e = document.querySelector('#services-orbit'); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 84, behavior: 'instant' }); }); await sleep(500);
  const m = await p.evaluate(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); const l = r('[data-orb-lens]'), d = r('.orb-desc'); const sel = document.querySelector('.orb-msel').getBoundingClientRect(); const act = [...document.querySelectorAll('button[data-orb-label]')].find((e) => e.getAttribute('aria-pressed') === 'true').getBoundingClientRect(); return { lensW: l.width, descBelow: d.top >= l.bottom - 1, descIn: d.bottom <= innerHeight + 4000, selAboveLens: sel.bottom <= l.top + 2, actCentre: Math.abs((act.left + act.right) / 2 - innerWidth / 2) < 8, ow: document.documentElement.scrollWidth <= innerWidth, partial: [...document.querySelectorAll('button[data-orb-label]')].filter((e) => { const q = e.getBoundingClientRect(); return getComputedStyle(e).opacity > 0.1 && (q.left < 0 || q.right > innerWidth); }).length }; });
  ok('mobile: lens centred, curved selector above, description below, active label top-centre, no horizontal overflow', m.selAboveLens && m.descBelow && m.actCentre && m.ow && m.lensW >= 240, JSON.stringify(m));
  ok('mobile: neighbouring options partially visible', m.partial >= 1, `${m.partial}`);
  await p.click('button[aria-label="Next service"]'); await sleep(1200); ok('mobile: next button', (await selOf(p)) === 1);
  const c = await p.evaluate(() => { const q = document.querySelector('.orb-mstage').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + 60 }; });
  await p.mouse.move(c.x + 70, c.y); await p.mouse.down(); for (let i = 0; i < 10; i++) { await p.mouse.move(c.x + 70 - i * 18, c.y); await sleep(16); } await p.mouse.up(); await sleep(1300); ok('mobile: swipe changes the service', (await selOf(p)) !== 1);
  const y0 = await p.evaluate(() => scrollY); await p.evaluate(() => scrollBy(0, 300)); ok('mobile: normal vertical scrolling, no pinned tour', (await p.evaluate(() => scrollY)) > y0);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close(); }

console.log('\n── reduced motion / no JS');
{ const p = await open('A', { width: 1440, height: 900 }, { rm: true });
  ok('reduced motion: scene is not pinned (no orbital travel)', (await geo(p)) === null);
  await p.evaluate(() => { const e = document.querySelector('#services-orbit'); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 92, behavior: 'instant' }); }); await sleep(300);
  const lab = await p.$$('button[data-orb-label]'); await lab[4].click(); await sleep(120); const rr = await rects(p);
  ok('reduced motion: selection changes immediately (label at 12 o\'clock within 120 ms)', (await selOf(p)) === 4 && Math.abs((rr.labels[4].l + rr.labels[4].r) / 2 - (rr.lens.l + rr.lens.r) / 2) < 6);
  ok('reduced motion: aperture does not animate', await p.evaluate(() => getComputedStyle(document.querySelector('.lens-blade')).transitionDuration.split(',').every((d) => parseFloat(d) === 0)));
  await p.close(); }
{ const p = await open('A', { width: 1440, height: 900 }, { nojs: true }); const m = await p.evaluate(() => ({ st: getComputedStyle(document.querySelector('.orb-static')).display, h3: document.querySelectorAll('.orb-static h3').length, stage: getComputedStyle(document.querySelector('.orb-stage') || document.body).display }));
  ok('JavaScript off: all seven services readable as plain text', m.st === 'block' && m.h3 === 7, JSON.stringify(m)); await p.close(); }
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
