import puppeteer from 'puppeteer-core';
// usage: node minds-tests.mjs [url]
const URL = process.argv[2] || 'http://localhost:3111/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
async function open(vp, rm) { const p = await b.newPage(); await p.setViewport(vp); if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(900); return p; }
const toMinds = async (p, off = 0) => { await p.evaluate((o) => { const r = document.querySelector('#minds').getBoundingClientRect(); scrollTo(0, scrollY + r.top - o); }, off); await sleep(700); };
const geom = (p) => p.evaluate(() => { const l = document.querySelector('.minds-list').getBoundingClientRect(); return { vw: innerWidth, list: [l.left, l.right, l.height], cols: [...document.querySelectorAll('.mind')].map((f) => { const r = f.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width, h: r.height, open: f.classList.contains('mind-open'), exp: f.querySelector('.mind-cover').getAttribute('aria-expanded') }; }) }; });
const px = async (p, pts) => { const b64 = await p.screenshot({ encoding: 'base64' }); return p.evaluate(async (b64, pts) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const k = im.width / innerWidth; return pts.map(([x, y]) => [...g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data].slice(0, 3)); }, b64, pts); };
const RED = [213, 37, 24]; const near = (c, t, tol = 8) => c.every((v, i) => Math.abs(v - t[i]) <= tol);

// ───────── structure ─────────
{
  const p = await open({ width: 1440, height: 900 }); await toMinds(p, 200);
  const s = await p.evaluate(() => ({
    id: !!document.querySelector('section#minds'), labelled: document.querySelector('section#minds').getAttribute('aria-labelledby'), head: document.querySelector('section#minds h2')?.textContent,
    n: document.querySelectorAll('#minds .mind').length, covers: document.querySelectorAll('#minds .mind-cover').length,
    names: [...document.querySelectorAll('#minds .mind-title')].map((e) => e.textContent), regions: [...document.querySelectorAll('#minds [role=region]')].map((e) => e.getAttribute('aria-label')),
    text: document.querySelector('#minds').innerText, old: document.querySelectorAll('#capabilities, .fins-root, .fin, .fin-cover, [class*="fin-"]').length,
    bg: getComputedStyle(document.querySelector('#minds')).backgroundColor, ph: document.querySelector('#minds .mind-open .mind-ph')?.textContent, kicker: document.querySelector('#minds .mind-open .mind-kicker')?.textContent,
  }));
  ok('section renamed: <section id="minds"> labelled by its "Minds" heading; no ServiceFins ids/classes remain', s.id && s.labelled && s.head === 'Minds' && s.old === 0, JSON.stringify([s.head, s.old]));
  ok('exactly EIGHT columns (one expanded among them)', s.n === 8 && s.covers === 8 && s.regions.length === 8);
  ok('entries are minds, not services: eight "Mind NN" placeholders, no service names or descriptions', JSON.stringify(s.names) === JSON.stringify(Array.from({ length: 8 }, (_, i) => `Mind 0${i + 1}`)) && !/branding|creative strategy|content production|social media|paid media|web experiences|design|campaign|strategy/i.test(s.text), s.names.join(','));
  ok('clearly marked temporary placeholders (role, portrait and biography)', /temporary placeholder/i.test(s.ph) && /role to be confirmed/i.test(s.kicker) && /placeholder/i.test(s.text));
  ok('section background is the same red as the lens (#D52518)', s.bg === 'rgb(213, 37, 24)', s.bg);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────── desktop geometry: flush edges, no overflow, every column open ─────────
for (const [w, h] of [[1440, 900], [1920, 1080], [2560, 1300], [1280, 720], [1100, 800], [1024, 768]]) {
  const p = await open({ width: w, height: h }); await toMinds(p, 200);
  const OPEN = Math.min(520, 0.42 * w); const bad = [];
  for (let i = 0; i < 8; i++) {
    await p.evaluate((i) => document.querySelectorAll('#minds .mind-cover')[i].click(), i); await sleep(950);
    const g = await geom(p); const c = g.cols; const shut = (w - 70 - OPEN) / 7; let x = 0; let good = c.length === 8 && g.list[1] - g.list[0] === w && g.list[2] === 760;
    c.forEach((f, k) => { const ww = k === i ? OPEN : shut; good = good && Math.abs(f.l - x) < 0.8 && Math.abs(f.w - ww) < 0.8 && f.open === (k === i) && (f.exp === 'true') === (k === i) && Math.abs(f.h - 760) < 1; x += ww + 10; });
    good = good && Math.abs(c[0].l) < 0.5 && Math.abs(c[7].r - w) < 0.8;
    if (!good) bad.push(i + ':' + JSON.stringify(c.map((f) => [Math.round(f.l), Math.round(f.w)])));
  }
  const ov = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok(`${w}px: all eight columns flush edge-to-edge (first at 0, last at ${w}), gaps 10px, open = ${Math.round(OPEN)}px, for every open column`, bad.length === 0, bad[0] || '');
  ok(`${w}px: no horizontal overflow, no page errors`, !ov && p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────── junction & spacing ─────────
{
  const p = await open({ width: 1440, height: 900 }); await toMinds(p, 400);
  const j = await p.evaluate(() => { const l = document.querySelector('#services').getBoundingClientRect(); const m = document.querySelector('#minds').getBoundingClientRect(); const caps = [...document.querySelectorAll('#services p.lens-nm')].map((e) => e.getBoundingClientRect().bottom); const ctl = [...document.querySelectorAll('#services .lens-ctl')].map((e) => e.getBoundingClientRect().bottom); const ring = document.querySelector('#services [data-ring]').previousElementSibling.getBoundingClientRect().bottom; return { lensB: l.bottom, mindsT: m.top, capB: Math.max(...caps), ctlB: Math.max(...ctl), ringB: ring, lensH: l.height, listT: document.querySelector('.minds-list').getBoundingClientRect().top }; });
  ok(`spacing: the Minds section starts right at the lens bottom, with a ${Math.round(j.listT - j.lensB)} px flat red space above the columns (80 px desktop)`, Math.abs(j.lensB - j.mindsT) < 0.5 && Math.abs(j.listT - j.lensB - 80) < 0.5 && j.lensH < 895, JSON.stringify(j));
  ok(`lens controls and captions stay clear of the columns (caption bottom ${Math.round(j.capB)} ≤ columns top ${Math.round(j.listT)}; ring ends ${Math.round(j.ringB)})`, j.capB <= j.listT - 4 && j.ctlB <= j.listT && j.ringB <= j.listT - 10);
  // pixel check: the strip just above and just below the junction is the same flat red (no shadow/gradient), sampled in the middle of each closed column
  await p.evaluate(() => document.querySelectorAll('#minds .mind-cover')[2].click()); await sleep(1100); await toMinds(p, 300);
  const jy = await p.evaluate(() => document.querySelector('#minds').getBoundingClientRect().top);
  const g = await geom(p); const xs = g.cols.filter((c) => !c.open).map((c) => c.l + c.w / 2);
  const above = await px(p, xs.map((x) => [x, jy - 4])); const above2 = await px(p, xs.map((x) => [x, jy - 7])); const below = await px(p, xs.map((x) => [x, jy + 3])); const mid = await px(p, xs.map((x) => [x, jy + 40])); const atList = await px(p, xs.map((x) => [x, jy + 78]));
  ok('flat junction and space: pixels above the seam, 3 / 40 / 78 px below it (down to just above the columns) are all the same red — no shadow, gradient or divider line', [...above, ...above2, ...below, ...mid, ...atList].every((c) => near(c, RED, 7)), JSON.stringify([above[0], below[0], mid[0], atList[0]]));
  // the lens's own shading is preserved: ring shadow/vignette present inside the lens
  const sh = await p.evaluate(() => getComputedStyle(document.querySelector('#services [data-ring]').previousElementSibling).boxShadow);
  ok('lens internal shading preserved (ring base inset + softened outer shadow still present)', /inset/.test(sh) && /rgba\(15, 15, 14/.test(sh), sh.slice(0, 80));
  const noShadow = await p.evaluate(() => [...document.querySelectorAll('#minds .mind')].every((e) => getComputedStyle(e).boxShadow === 'none'));
  ok('no drop shadows on the columns', noShadow);
  const band = await p.evaluate(() => { const m = document.querySelector('#minds'); const rootPadTop = getComputedStyle(m).paddingTop; const rootPadBottom = getComputedStyle(m).paddingBottom; const l = document.querySelector('.minds-list'); const nx = m.nextElementSibling; const h = m.querySelector('h2'); const hc = getComputedStyle(h); const cs = getComputedStyle(m.querySelector('.minds-stage')); return { rootPadTop, rootPadBottom, secH: m.getBoundingClientRect().height, listH: l.getBoundingClientRect().height, secB: m.getBoundingClientRect().bottom, listB: l.getBoundingClientRect().bottom, nextT: nx.getBoundingClientRect().top, hw: h.getBoundingClientRect().width, hClip: hc.clip, text: m.innerText, pad: [cs.paddingTop, cs.paddingBottom, cs.marginTop, cs.marginBottom], colH: [...m.querySelectorAll('.mind')].map((e) => e.getBoundingClientRect().height) }; });
  ok(`nothing under the columns: the section is the 80 px space + the columns (${Math.round(band.secH)} = 80 + ${Math.round(band.listH)}), ends exactly at their bottom edge, and the next section starts immediately`, Math.abs(band.secH - band.listH - 80) < 0.5 && Math.abs(band.secB - band.listB) < 0.5 && Math.abs(band.nextT - band.secB) < 0.5 && band.rootPadTop === '80px' && band.rootPadBottom === '0px' && band.pad.every((v) => v === '0px'), JSON.stringify(band));
  ok('columns keep their 760 px height (not stretched or shortened)', band.colH.every((h) => Math.abs(h - 760) < 1));
  ok('no visible "Minds" label or caption text; the heading is visually hidden (1 px, clipped) but present', band.hw <= 1.5 && !/people behind the work|select a column/i.test(band.text.replace(/Minds\s*/, '')) , `w ${band.hw}`);
  await p.close();
}

// ───────── interaction (desktop) ─────────
{
  const p = await open({ width: 1440, height: 900 }); await toMinds(p, 150);
  const exp = () => p.evaluate(() => { const c = [...document.querySelectorAll('#minds .mind-cover')]; return { open: c.map((x) => x.getAttribute('aria-expanded') === 'true'), vis: [...document.querySelectorAll('#minds .mind-plate')].map((e) => getComputedStyle(e).visibility === 'visible') }; });
  let s = await exp(); ok('initial: third column open, exactly one expanded', s.open.filter(Boolean).length === 1 && s.open[2] && s.vis[2] && s.vis.filter(Boolean).length === 1);
  for (const i of [0, 7, 4, 1]) { await (await p.$$('#minds .mind-cover'))[i].click(); await sleep(1000); s = await exp(); ok(`click column ${i + 1}: only it is open and its plate (name, role, biography) is readable`, s.open[i] && s.open.filter(Boolean).length === 1 && s.vis[i] && s.vis.filter(Boolean).length === 1); }
  const tr = await p.evaluate(() => { const m = document.querySelector('#minds .mind'); const c = getComputedStyle(m); return [c.transitionDuration, c.transitionProperty]; });
  ok('expansion animation preserved (left/width 0.7 s ease)', /0\.7s/.test(tr[0]) && /left/.test(tr[1]), tr.join(' '));
  // keyboard
  const btns = await p.$$('#minds .mind-cover'); await btns[5].focus(); await p.keyboard.press('Enter'); await sleep(1000); s = await exp(); ok('keyboard Enter opens the focused column', s.open[5]);
  await btns[2].focus(); await p.keyboard.press('Space'); await sleep(1000); s = await exp(); ok('keyboard Space opens the focused column', s.open[2]);
  await p.evaluate(() => document.activeElement.blur()); await btns[0].focus(); const seq = []; for (let i = 0; i < 9; i++) { seq.push(await p.evaluate(() => [...document.querySelectorAll('#minds .mind-cover')].indexOf(document.activeElement))); await p.keyboard.press('Tab'); }
  ok('Tab visits all eight columns in order', seq.slice(0, 8).join() === '0,1,2,3,4,5,6,7', seq.join());
  await btns[3].focus(); const fo = await p.evaluate(() => { const li = document.activeElement.closest('.mind'); const c = getComputedStyle(li); return c.outlineStyle + ' ' + c.outlineColor; }); ok('visible yellow keyboard focus ring', /solid/.test(fo) && /255, 202, 38/.test(fo), fo);
  // rapid
  const order = Array.from({ length: 40 }, () => Math.floor(Math.random() * 8)); for (const i of order) { await btns[i].click({ delay: 0 }); await sleep(25); } await sleep(1100); const last = order[39]; const g = await geom(p);
  ok(`40 rapid clicks settle on the last choice (#${last + 1}) with exact geometry and one open column`, g.cols[last].open && g.cols.filter((c) => c.open).length === 1 && Math.abs(g.cols[7].r - 1440) < 0.8 && Math.abs(g.cols[0].l) < 0.5);
  await btns[0].click(); await sleep(250); const mid = await geom(p); ok('mid-transition: columns never leave the viewport (no overflow while animating)', mid.cols.every((c) => c.l >= -1 && c.r <= 1441) && !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))); await sleep(900);
  // scrolling untouched
  const dp = await p.evaluate(() => { const ev = new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }); document.querySelector('#minds').dispatchEvent(ev); return ev.defaultPrevented; }); ok('no wheel handler', dp === false);
  await p.mouse.move(700, 450); const y0 = await p.evaluate(() => scrollY); await p.mouse.wheel({ deltaY: 300 }); await sleep(500); ok('real wheel over the columns scrolls the page', (await p.evaluate(() => scrollY)) > y0 + 200);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────── navigation ─────────
{
  const p = await open({ width: 1440, height: 900 });
  const hdr = await p.evaluate(() => document.querySelector('header').children[1].getBoundingClientRect().bottom);
  const hrefs = await p.evaluate(() => [...document.querySelectorAll('header nav a')].map((a) => a.getAttribute('href')));
  ok('nav: Capabilities → #services (lens), Studio → #minds', hrefs.join() === '#work,#services,#minds,#contact', hrefs.join());
  for (const [href, label] of [['#services', 'Capabilities'], ['#minds', 'Studio']]) { await p.evaluate(() => scrollTo(0, 0)); await sleep(300); await p.evaluate((h) => document.querySelector(`header nav a[href="${h}"]`).click(), href); await sleep(900); const t = await p.evaluate((h) => document.querySelector(h).getBoundingClientRect().top, href); ok(`nav ${label} lands the section below the header (top ${Math.round(t)} ≥ ${Math.round(hdr)})`, t >= hdr - 1); }
  await p.close();
}

// ───────── mobile 390 (touch) ─────────
{
  const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true }); await toMinds(p, 120);
  const heads = await p.evaluate(() => [...document.querySelectorAll('#minds .mind-cover')].map((e) => { const r = e.getBoundingClientRect(); const t = e.querySelector('.mind-title'); return { h: Math.round(r.height), w: Math.round(r.width), fs: parseFloat(getComputedStyle(t).fontSize), rot: getComputedStyle(t).transform }; }));
  ok('mobile: all eight reachable as full-width horizontal headers (≥ 44 px tall, title ≥ 18 px, not rotated) — no eight narrow columns', heads.length === 8 && heads.every((h) => h.h >= 44 && h.w >= 340 && h.fs >= 18 && h.rot === 'none'), JSON.stringify(heads[0]));
  const st = () => p.evaluate(() => [...document.querySelectorAll('#minds .mind')].map((f) => ({ open: f.classList.contains('mind-open'), ph: Math.round(f.querySelector('.mind-plate').getBoundingClientRect().height), exp: f.querySelector('.mind-cover').getAttribute('aria-expanded') })));
  let s = await st(); ok('mobile: initial #3 open, the others collapsed to 0 height', s[2].open && s[2].ph > 200 && s.filter((x, i) => i !== 2).every((x) => x.ph === 0));
  for (const i of [0, 7, 3]) { const hs = await p.$$('#minds .mind-cover'); await hs[i].evaluate((e) => e.scrollIntoView({ block: 'center' })); await sleep(350); const bx = await hs[i].boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); await sleep(1000); s = await st(); ok(`mobile: tap #${i + 1} → only it open`, s[i].open && s[i].ph > 200 && s.filter((x) => x.exp === 'true').length === 1 && s.filter((x, j) => j !== i).every((x) => x.ph === 0)); }
  for (const i of [1, 5, 2, 0, 4, 3, 7, 6]) { await p.evaluate((i) => document.querySelectorAll('#minds .mind-cover')[i].click(), i); await sleep(40); } await sleep(900); s = await st(); ok('mobile: rapid taps settle with exactly one open (#7)', s[6].open && s.filter((x) => x.exp === 'true').length === 1);
  await toMinds(p, 100); const y0 = await p.evaluate(() => scrollY); await p.touchscreen.touchStart(200, 600); for (let i = 1; i <= 10; i++) { await p.touchscreen.touchMove(200, 600 - i * 30); await sleep(16); } await p.touchscreen.touchEnd(); await sleep(500);
  ok('mobile: touch-dragging over the columns scrolls the page normally', (await p.evaluate(() => scrollY)) > y0 + 100);
  const mb = await p.evaluate(() => { const m = document.querySelector('#minds'); const l = document.querySelector('.minds-list'); return { secB: m.getBoundingClientRect().bottom, listB: l.getBoundingClientRect().bottom, nextT: m.nextElementSibling.getBoundingClientRect().top, secT: m.getBoundingClientRect().top, listT: l.getBoundingClientRect().top }; });
  ok('mobile: a 40 px flat red space above the list; nothing below it — the section ends at the list and the next section starts immediately', Math.abs(mb.secB - mb.listB) < 0.5 && Math.abs(mb.nextT - mb.secB) < 0.5 && Math.abs(mb.listT - mb.secT - 40) < 0.5, JSON.stringify(mb));
  const flat = await p.evaluate(() => ({ bg: getComputedStyle(document.querySelector('#minds')).backgroundColor, sh: [...document.querySelectorAll('#minds .mind-cover')].every((e) => getComputedStyle(e).boxShadow === 'none') })); ok('mobile: continuous red, no dark edge shadows on the headers', flat.bg === 'rgb(213, 37, 24)' && flat.sh);
  for (const w of [390, 360, 320]) { await p.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true }); await sleep(600); ok(`mobile ${w}px: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); }
  ok('mobile: no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────── reduced motion ─────────
{
  const p = await open({ width: 1440, height: 900 }, true); await toMinds(p, 150);
  const d = await p.evaluate(() => { const m = document.querySelector('#minds .mind'); const c = document.querySelector('#minds .mind-cover'); const pl = document.querySelector('#minds .mind-plate'); return { m: getComputedStyle(m).transitionDuration, c: getComputedStyle(c).transitionDuration, p: getComputedStyle(pl).transitionDuration }; });
  const btns = await p.$$('#minds .mind-cover'); await btns[0].click(); await sleep(80); const l = await p.evaluate(() => Math.round(document.querySelectorAll('#minds .mind')[1].getBoundingClientRect().left));
  ok('reduced motion: no transitions; the change is instant', Object.values(d).every((v) => /^0s|^1e-05s/.test(v)) && l > 520, JSON.stringify(d) + ' left ' + l); await p.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
