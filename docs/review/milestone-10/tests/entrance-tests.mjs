import puppeteer from 'puppeteer-core';
// usage: node entrance-tests.mjs [url]
const URL = process.argv[2] || 'http://localhost:3111/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const D = { width: 1440, height: 900 }; const M = { width: 390, height: 844, isMobile: true, hasTouch: true };
async function open(vp, { rm = false, hash = '', js = true } = {}) { const p = await b.newPage(); await p.setViewport(vp); if (!js) await p.setJavaScriptEnabled(false); if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); }); await p.goto(URL + hash, { waitUntil: 'networkidle0' }); await sleep(900); return p; }
const attr = (p) => p.evaluate(() => [document.querySelector('#services').dataset.entrance, document.querySelector('#minds').dataset.entrance]);
const reach = (p, sel, f) => p.evaluate(([sel, f]) => { const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')); const e = document.querySelector(sel); const r = e.getBoundingClientRect(); const desired = Math.max(hh + 1, innerHeight - f * r.height); scrollTo(0, scrollY + r.top - desired); }, [sel, f]);
const lensNow = (p) => p.evaluate(() => { const l = document.querySelector('#services'); const ring = l.querySelector('[data-ring]'); const e = l.querySelector('.lens-enter'); const m = new DOMMatrix(getComputedStyle(l.querySelector('.lens-blade')).transform); const rows = [...l.querySelectorAll('[data-row]')]; const rm = new DOMMatrix(getComputedStyle(ring).transform); return { a: l.dataset.entrance, rot: getComputedStyle(ring).rotate, op: +getComputedStyle(e).opacity, ty: getComputedStyle(e).translate, blade: Math.atan2(m.b, m.a) * 180 / Math.PI, sel: rows.findIndex((r) => r.getAttribute('aria-pressed') === 'true'), ringDeg: Math.atan2(rm.b, rm.a) * 180 / Math.PI, shown: [...l.querySelectorAll('[data-sc]')].findIndex((s) => +getComputedStyle(s).opacity > 0.5) }; });
const sampler = (p, sel, f, ms, kind) => p.evaluate(([sel, f, ms, kind]) => new Promise((res) => {
  const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')); const e0 = document.querySelector(sel); const r0 = e0.getBoundingClientRect(); const desired = Math.max(hh + 1, innerHeight - f * r0.height); scrollTo(0, scrollY + r0.top - desired);
  const ty = (s) => (s === 'none' ? 0 : parseFloat(s.split(' ')[1] || s));
  const t0 = performance.now(); const out = [];
  const read = () => { if (kind === 'lens') { const l = document.querySelector('#services'); const ring = l.querySelector('[data-ring]'); const e = l.querySelector('.lens-enter'); const m = new DOMMatrix(getComputedStyle(l.querySelector('.lens-blade')).transform); const rs = getComputedStyle(ring).rotate; return { a: l.dataset.entrance, rot: rs === 'none' ? 0 : parseFloat(rs), op: +getComputedStyle(e).opacity, ty: ty(getComputedStyle(e).translate), blade: Math.atan2(m.b, m.a) * 180 / Math.PI }; }
    const mm = document.querySelector('#minds'); const cols = [...mm.querySelectorAll('.mind')]; return { a: mm.dataset.entrance, op: cols.map((c) => +getComputedStyle(c).opacity), ty: cols.map((c) => ty(getComputedStyle(c).translate)), l: cols.map((c) => c.getBoundingClientRect().left), w: cols.map((c) => c.getBoundingClientRect().width), open: cols.map((c) => c.classList.contains('mind-open')), sh: cols.map((c) => getComputedStyle(c).boxShadow), h: cols.map((c) => c.getBoundingClientRect().height) }; };
  (function tick() { const t = performance.now() - t0; out.push({ t, ...read() }); if (t < ms) requestAnimationFrame(tick); else res(out); })();
}), [sel, f, ms, kind]);

// ───────── A. start state, thresholds, layout reserved ─────────
{
  const p = await open(D);
  const a0 = await attr(p); const pre = await p.evaluate(() => ({ lens: [...document.querySelectorAll('#services .lens-enter')].map((e) => +getComputedStyle(e).opacity), sh: document.documentElement.scrollHeight, lensH: document.querySelector('#services').getBoundingClientRect().height, mindsH: document.querySelector('#minds').getBoundingClientRect().height, list: [...document.querySelectorAll('#minds .mind')].map((e) => Math.round(e.getBoundingClientRect().left) + ':' + Math.round(e.getBoundingClientRect().width)).join(), reveal: document.querySelector('#minds').dataset.reveal }));
  ok('lens waits offscreen (start state after hydration); Minds uses the scroll-linked reveal on desktop (no timed entrance)', a0[0] === 'pre' && pre.lens.every((o) => o === 0) && a0[1] == null && pre.reveal === 'on', JSON.stringify([a0, pre.reveal]));
  await reach(p, '#services', 0.2); await sleep(500); const s20 = await lensNow(p);
  ok('lens does NOT start while only ~20 % is visible below the header', s20.a === 'pre' && s20.op === 0, s20.a);
  await reach(p, '#services', 0.45); await sleep(1500); const s45 = await lensNow(p);
  ok('lens starts once a meaningful portion (≥ 30 %) is visible, then completes', s45.a === 'done' && s45.op === 1, s45.a);
  await reach(p, '#minds', 0.45); await sleep(800);
  const post = await p.evaluate(() => ({ sh: document.documentElement.scrollHeight, lensH: document.querySelector('#services').getBoundingClientRect().height, mindsH: document.querySelector('#minds').getBoundingClientRect().height, list: [...document.querySelectorAll('#minds .mind')].map((e) => Math.round(e.getBoundingClientRect().left) + ':' + Math.round(e.getBoundingClientRect().width)).join() }));
  ok('the page never changes size: document height, section heights and column geometry identical before and after the lens entrance and the Minds reveal (no layout shift)', post.sh === pre.sh && post.lensH === pre.lensH && post.mindsH === pre.mindsH && post.list === pre.list, JSON.stringify([pre.sh, post.sh]));
  const pos = await p.evaluate(() => ['#services', '#minds'].map((s) => getComputedStyle(document.querySelector(s)).position));
  ok('native scrolling only: neither section is pinned/sticky', pos.every((v) => v === 'relative'), pos.join());
  const sl = await open(D); await reach(sl, '#services', 0.15); await sleep(2300); const slS = await lensNow(sl);
  ok('a section left only partly on screen (~15 %, under the threshold) is revealed after a moment — visible space is never left empty', slS.op === 1 && ['playing', 'done'].includes(slS.a), slS.a); await sl.close();
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────── B. lens entrance: timing, easing, settle ─────────
{
  const p = await open(D);
  const before = await lensNow(p);
  const out = await sampler(p, '#services', 0.5, 1400, 'lens');
  const play = out.find((s) => s.a === 'playing'); const t0 = play ? play.t : 0;
  const settle = out.find((s) => s.t > t0 && s.a !== 'pre' && Math.abs(s.rot) < 0.05 && s.op > 0.995 && s.ty < 0.05);
  const dur = settle ? settle.t - t0 : 9999;
  const first = out.find((s) => s.a === 'pre' || s.a === 'playing');
  const monoRot = out.every((s, i) => i === 0 || Math.abs(s.rot) <= Math.abs(out[i - 1].rot) + 0.05); const monoOp = out.every((s, i) => i === 0 || s.op >= out[i - 1].op - 0.005);
  const startBlade = Math.max(...out.map((s) => s.blade)); const endBlade = out[out.length - 1].blade; const minBlade = Math.min(...out.map((s) => s.blade));
  ok(`ring: starts ${Math.abs(first.rot).toFixed(0)}° off (10–15°), turns smoothly back, no overshoot`, Math.abs(first.rot) >= 10 && Math.abs(first.rot) <= 15 && monoRot && out.every((s) => s.rot <= 0.01), `start ${first.rot}`);
  ok(`supporting text: fades in and lifts ${first.ty}px (12–16px) → 0`, first.op === 0 && first.ty >= 12 && first.ty <= 16 && monoOp && out.every((s) => s.ty >= -0.01), `ty ${first.ty}`);
  ok(`iris: one subtle opening adjustment (${startBlade.toFixed(1)}° → ${endBlade.toFixed(1)}°) that settles at the selected service's aperture, no overshoot`, startBlade - endBlade > 4 && startBlade - endBlade < 25 && minBlade >= endBlade - 0.3 && Math.abs(endBlade - 37.7) < 0.5, `min ${minBlade.toFixed(1)}`);
  ok(`entrance completes in ${Math.round(dur)} ms (≈ 700–950 ms) with deceleration, then the attribute settles`, dur >= 550 && dur <= 1000 && out[out.length - 1].a === 'done', `${Math.round(dur)}ms`);
  const end = await lensNow(p);
  ok('selection untouched by the entrance: Content Production still selected and shown, ring at its mark (−48°), aperture 84 %', end.sel === 2 && end.shown === 2 && Math.abs(end.ringDeg + 48) < 0.6 && end.rot === 'none', JSON.stringify({ sel: end.sel, ring: end.ringDeg.toFixed(1) }));
  ok('lens start state differed from the end state (the entrance was real)', before.a === 'pre' && Math.abs(before.blade - endBlade) > 4);
  await p.close();
}

// ───────── C. interaction during the entrance wins ─────────
{
  const p = await open(D); await reach(p, '#services', 0.5); await sleep(160);
  await (await p.$$('[data-row]'))[0].click(); await sleep(90); const s = await lensNow(p);
  ok('click during the entrance: it finishes instantly (text visible, ring at rest)', s.op === 1 && s.rot === 'none' && ['instant', 'done'].includes(s.a), JSON.stringify([s.a, s.op, s.rot]));
  await sleep(2400); const s2 = await lensNow(p);
  ok('…and the click is honoured normally: Branding selected, study swapped, iris at 94 %', s2.sel === 0 && s2.shown === 0 && Math.abs(s2.blade - 26.8) < 0.6 && s2.a === 'done', JSON.stringify({ sel: s2.sel, shown: s2.shown, blade: s2.blade.toFixed(1) }));
  await p.close();
  const q = await open(D); await reach(q, '#services', 0.5); await sleep(150);
  await q.evaluate(() => document.querySelectorAll('[data-row]')[2].focus()); await q.keyboard.press('ArrowDown'); await sleep(80); const k1 = await lensNow(q); await sleep(2300); const k2 = await lensNow(q);
  ok('keyboard during the entrance: finishes instantly and ArrowDown selects Social Media', ['instant', 'done'].includes(k1.a) && k1.op === 1 && k2.sel === 3 && k2.shown === 3, JSON.stringify([k1.a, k2.sel]));
  await q.close();
  const r = await open(D); await reach(r, '#services', 0.88); await sleep(150);
  const cen = await r.evaluate(() => { const e = document.querySelector('[data-lens]').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; }); const pt = (d) => ({ x: cen.x + 385 * Math.cos(d * Math.PI / 180), y: cen.y + 385 * Math.sin(d * Math.PI / 180) });
  const a0 = pt(180); await r.mouse.move(a0.x, a0.y); await r.mouse.down(); for (let d = 180; d >= 130; d -= 2) { const q2 = pt(d); await r.mouse.move(q2.x, q2.y); await sleep(12); } const mid = await lensNow(r); await r.mouse.up(); await sleep(2600); const d2 = await lensNow(r);
  ok('dragging the ring during the entrance: the entrance yields immediately, the drag turns the ring, and releasing snaps to Design', ['instant', 'done'].includes(mid.a) && d2.sel === 4 && d2.shown === 4 && d2.rot === 'none' && Math.abs(d2.ringDeg + 96) < 0.7, JSON.stringify([mid.a, d2.sel, d2.ringDeg.toFixed(1)]));
  await r.close();
}

// ───────── D. once per load; fast scroll; anchors; focus ─────────
{
  const p = await open(D); await reach(p, '#services', 0.5); await sleep(1500); await reach(p, '#minds', 0.5); await sleep(1500);
  await p.evaluate(() => scrollTo(0, 0)); await sleep(500); const top = await attr(p);
  const rep = await sampler(p, '#services', 0.6, 700, 'lens');
  ok('lens plays once per page load: scrolling back up and down again does not replay or hide content', top[0] === 'done' && rep.every((s) => s.a === 'done' && s.op === 1 && s.rot === 0 && s.ty === 0), JSON.stringify(top));
  await p.setViewport({ width: 1100, height: 800 }); await sleep(700); await p.setViewport(D); await sleep(700); ok('resizing after the entrance does not replay it', (await attr(p))[0] === 'done'); await p.close();
  const f = await open(D); await f.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sleep(350); const fa = await attr(f);
  ok('fast scroll straight past the lens (to the bottom of the page): it completes instantly, with no animation continuing offscreen', ['instant', 'done'].includes(fa[0]), fa.join());
  await f.evaluate(() => scrollTo(0, 0)); await sleep(400);
  const lens2 = await sampler(f, '#services', 0.6, 400, 'lens');
  ok('scrolling back to the lens later shows its final content with no delayed animation', lens2.every((s) => s.a === 'done' && s.op === 1 && s.rot === 0 && s.ty === 0), lens2[0].a);
  await f.close();
  const g = await open(D); await reach(g, '#services', 0.5); await sleep(120); await g.evaluate(() => { const e = document.querySelector('#minds'); scrollTo(0, scrollY + e.getBoundingClientRect().bottom + 600); }); await sleep(120);
  ok('passing the lens quickly mid-entrance completes it immediately', ['instant', 'done'].includes((await attr(g))[0]) && (await lensNow(g)).op === 1); await g.close();
  const h = await open(D, { hash: '#services' }); const ha = await attr(h); const ho = await lensNow(h);
  ok('direct load on #services: no entrance, content visible at once', !['pre', 'playing'].includes(ha[0]) && ho.op === 1 && ho.rot === 'none', ha.join()); await h.close();
  const h2 = await open(D, { hash: '#minds' }); const hm = await h2.evaluate(() => [document.querySelector('#minds').dataset.entrance, +getComputedStyle(document.querySelector('#minds .mind')).opacity]);
  ok('direct load on #minds: columns visible at once', hm[0] !== 'pre' && hm[1] === 1, hm.join()); await h2.close();
  const n = await open(D); await n.evaluate(() => document.querySelector('header nav a[href="#minds"]').click()); await sleep(1000); const na = await n.evaluate(() => { const l = document.querySelector('.minds-list').getBoundingClientRect(); return [l.top, +document.querySelector('.minds-list').style.getPropertyValue('--rp')]; });
  ok('navigation (Studio → #minds) lands on a state-by-position: the reveal is already well advanced (no pending animation)', na[1] >= 0.8, na.join()); const nt = await n.evaluate(() => document.querySelector('#minds').getBoundingClientRect().top); ok('…and the anchor lands below the header', nt >= 90, String(nt)); await n.close();
  const n2 = await open(D); await n2.evaluate(() => document.querySelector('header nav a[href="#services"]').click()); await sleep(100); const nb = await lensNow(n2); ok('navigation (Capabilities → #services) lands on visible content', ['instant', 'done'].includes(nb.a) && nb.op === 1 && nb.rot === 'none', nb.a); await n2.close();
  const k = await open(D); await k.evaluate(() => { const l = document.querySelector('.minds-list').getBoundingClientRect(); scrollTo(0, scrollY + l.top - 700); }); await sleep(300); await k.evaluate(() => document.querySelectorAll('#minds .mind-cover')[4].focus({ preventScroll: true })); await sleep(100); const ka = await k.evaluate(() => [...document.querySelectorAll('#minds .mind')].map((m) => getComputedStyle(m).clipPath));
  ok('keyboard focus into a partly revealed column reveals it fully (clip removed); the others stay as they were', ka[4] === 'none' && ka.filter((c, i) => i !== 4).every((c) => c !== 'none'), ka.join(' | ')); await k.close();
  const k2 = await open(D); await k2.evaluate(() => document.querySelectorAll('#services [data-row]')[3].focus()); await sleep(60); const kb = await lensNow(k2); ok('keyboard focus into the lens never lands on hidden content', ['instant', 'done'].includes(kb.a) && kb.op === 1 && kb.rot === 'none'); await k2.close();
}

// ───────── E2. the shuffle: generated once per page load, different between loads ─────────
{
  const orders = [];
  for (let i = 0; i < 6; i++) { const p = await open(D); orders.push(await p.evaluate(() => [...document.querySelectorAll('#minds .mind')].map((li) => +li.style.getPropertyValue('--o')))); if (i === 0) { const before = orders[0].join(); await reach(p, '#minds', 0.5); await sleep(1600); await p.evaluate(() => scrollTo(0, 0)); await sleep(400); await reach(p, '#minds', 0.5); await sleep(600); const after = await p.evaluate(() => [...document.querySelectorAll('#minds .mind')].map((li) => +li.style.getPropertyValue('--o')).join()); ok('the order is generated once per page load: unchanged after the entrance, after scrolling away and back', before === after, before + ' / ' + after); } await p.close(); }
  ok('every load gets a valid permutation of the eight columns (no duplicates, no gaps)', orders.every((o) => o.length === 8 && new Set(o).size === 8 && o.every((v) => v >= 0 && v <= 7)), orders.map((o) => o.join('')).join(' | '));
  ok('the order is genuinely shuffled: it differs between page loads and is not the left-to-right order', new Set(orders.map((o) => o.join())).size >= 3 && orders.some((o) => o.join() !== '0,1,2,3,4,5,6,7'), orders.map((o) => o.join('')).join(' | '));
  const p = await open(D); const geom = await p.evaluate(() => [...document.querySelectorAll('#minds .mind')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width), e.querySelector('.mind-title').textContent, e.classList.contains('mind-open')].join(':'); }).join('|'));
  const idx = await p.evaluate(() => [...document.querySelectorAll('#minds .mind')].map((e) => e.style.getPropertyValue('--i')).join());
  ok('only the reveal offsets are random: column positions, content order (Mind 01 → 08), indices and the active (third) column are untouched', idx === '0,1,2,3,4,5,6,7' && /:Mind 01:false\|.*:Mind 03:true\|.*:Mind 08:false$/.test(geom) && geom.split('|').map((g) => g.split(':')[2]).join() === Array.from({ length: 8 }, (_, i) => `Mind 0${i + 1}`).join(), geom);
  for (const y of [700, 560, 420, 300]) { await p.evaluate((y) => { const l = document.querySelector('.minds-list').getBoundingClientRect(); scrollTo(0, scrollY + l.top - y); }, y); await sleep(120); }
  const anims = await p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#minds')).length);
  ok('no timed playback at all while the reveal runs: zero CSS animations/transitions on the Minds section during scrolling', anims === 0, String(anims));
  await p.close();
}

// ───────── F. mobile (390) ─────────
{
  const p = await open(M);
  const a0 = await attr(p); ok('mobile: both entrances wait offscreen', a0[0] === 'pre' && a0[1] === 'pre');
  const lo = await sampler(p, '#services', 0.45, 1400, 'lens'); const lp = lo.find((s) => s.a === 'playing'); const ls = lo.find((s) => s.t > lp.t && Math.abs(s.rot) < 0.05 && s.op > 0.995 && s.ty < 0.05);
  ok(`mobile lens entrance: ring ${Math.abs(lo[0].rot)}° turn, ${lo[0].ty}px lift, completes in ${Math.round(ls ? ls.t - lp.t : 9999)} ms`, Math.abs(lo[0].rot) >= 10 && lo[0].ty >= 12 && lo[0].ty <= 16 && ls && ls.t - lp.t <= 1000);
  await sleep(600);
  const mo = await sampler(p, '#minds', 0.45, 1300, 'minds'); const mp = mo.find((s) => s.a === 'playing'); const mt0 = mp.t;
  const starts = Array.from({ length: 8 }, (_, i) => { const s = mo.find((q) => q.t >= mt0 && q.op[i] >= 0.05); return s ? s.t : null; }); const diffs = starts.slice(1).map((v, i) => v - starts[i]); const avg = diffs.reduce((a, c) => a + c, 0) / diffs.length;
  const md = mo.find((s) => s.t > mt0 && s.op.every((o) => o > 0.995) && s.ty.every((v) => v < 0.05));
  ok(`mobile accordion UNCHANGED: still top → bottom in order, shorter stagger (≈ ${avg.toFixed(0)} ms/item), ${mo[0].ty[0]}px lift, whole sequence ${Math.round(md ? md.t - mt0 : 9999)} ms`, starts.every((v, i) => v !== null && (i === 0 || v >= starts[i - 1])) && avg >= 25 && avg <= 48 && mo[0].ty.every((v) => v === 16) && md && md.t - mt0 <= 850 && avg < 45);
  ok('mobile accordion: third item stays open, nothing opens or closes, no horizontal overflow', mo.every((s) => s.open.join() === 'false,false,true,false,false,false,false,false') && !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  await p.close();
  const q = await open(M); await reach(q, '#minds', 0.5); await sleep(150);
  const el = (await q.$$('#minds .mind-cover'))[1]; await el.evaluate((e) => e.scrollIntoView({ block: 'center' })); await sleep(50); const bx = await el.boundingBox(); await q.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); await sleep(80);
  const qa = await q.evaluate(() => [document.querySelector('#minds').dataset.entrance, [...document.querySelectorAll('#minds .mind')].map((e) => +getComputedStyle(e).opacity)]);
  ok('mobile: tapping during the entrance finishes it instantly', ['instant', 'done'].includes(qa[0]) && qa[1].every((o) => o === 1), qa[0]); await q.close();
  const r = await open(M); await reach(r, '#services', 0.5); await sleep(200); const y0 = await r.evaluate(() => scrollY); await r.touchscreen.touchStart(200, 650); for (let i = 1; i <= 10; i++) { await r.touchscreen.touchMove(200, 650 - i * 30); await sleep(16); } await r.touchscreen.touchEnd(); await sleep(500);
  ok('mobile: touch-scrolling during the entrance works normally (nothing is locked)', (await r.evaluate(() => scrollY)) > y0 + 100); await r.close();
  const s = await open(M); const lf = await s.evaluate(() => { const r = document.querySelector('#services').getBoundingClientRect().height; return r; }); await reach(s, '#minds', 0.45); await sleep(1500);
  ok('mobile: no layout shift from the entrances (lens height unchanged)', Math.abs((await s.evaluate(() => document.querySelector('#services').getBoundingClientRect().height)) - lf) < 0.5); ok('mobile: no page errors', s.errs.length === 0, s.errs.join('|')); await s.close();
}

// ───────── G. reduced motion and no-JS: final state, always visible ─────────
{
  for (const [name, vp] of [['desktop', D], ['mobile', M]]) {
    const p = await open(vp, { rm: true }); const a = await attr(p); const s = await lensNow(p); const m = await p.evaluate(() => [...document.querySelectorAll('#minds .mind')].map((e) => [+getComputedStyle(e).opacity, getComputedStyle(e).translate]));
    ok(`reduced motion (${name}): final state immediately — no start state, rotation, blade movement, translation or stagger`, a.every((x) => !x || x === 'done') && s.op === 1 && s.rot === 'none' && s.ty === 'none' && Math.abs(s.blade - 37.7) < 0.5 && m.every((c) => c[0] === 1 && c[1] === 'none'), JSON.stringify([a, s.rot, s.ty]));
    const tr = await p.evaluate(() => ({ e: getComputedStyle(document.querySelector('#services .lens-enter')).transitionDuration, m: getComputedStyle(document.querySelector('#minds .mind')).transitionDuration })); ok(`reduced motion (${name}): no scroll reveal either — no data-reveal, columns not clipped`, await p.evaluate(() => !document.querySelector('#minds').dataset.reveal && [...document.querySelectorAll('#minds .mind')].every((m) => getComputedStyle(m).clipPath === 'none'))); ok(`reduced motion (${name}): no entrance transitions exist`, /^0s/.test(tr.e) && /^0s/.test(tr.m), JSON.stringify(tr)); await p.close();
  }
  const j = await open(D, { js: false }); const jv = await j.evaluate(() => ({ lens: [...document.querySelectorAll('#services .lens-enter')].every((e) => +getComputedStyle(e).opacity === 1), cols: [...document.querySelectorAll('#minds .mind')].every((e) => +getComputedStyle(e).opacity === 1 && getComputedStyle(e).translate === 'none'), a: [document.querySelector('#services').dataset.entrance, document.querySelector('#minds').dataset.entrance], n: document.querySelectorAll('#minds .mind').length, clip: [...document.querySelectorAll('#minds .mind')].every((e) => getComputedStyle(e).clipPath === 'none') && !document.querySelector('#minds').dataset.reveal }));
  ok('JavaScript off: server markup is the final state — all content visible, no hidden start state, columns not clipped', jv.lens && jv.cols && jv.a.every((x) => !x) && jv.n === 8 && jv.clip, JSON.stringify(jv)); await j.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
