import puppeteer from 'puppeteer-core';
// Variant A refinement (curved names, rise / hold / return choreography). Scripted Chrome; run against the production preview on :3111.
const U = 'http://localhost:3111/lab/orbital-services?v=A';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] });
const HOLD = 0.6, RISE = 0.36, TRAVEL = 0.62, N = 7;
const Q = HOLD + 6 * (RISE + TRAVEL + RISE + HOLD);
const holdStart = (k) => (k === 0 ? 0 : HOLD + (k - 1) * (2 * RISE + TRAVEL + HOLD) + RISE + TRAVEL + RISE);
const frame = (p) => p.screenshot({ type: 'jpeg', quality: 10 });
async function open(vp) { const p = await b.newPage(); await p.bringToFront(); await p.setViewport(vp); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(U, { waitUntil: 'networkidle0' }); await sleep(900); return p; }
const geo = (p) => p.evaluate(() => { const t = document.querySelector('.orb-track'), s = document.querySelector('.orb-stage'); return { top: t.getBoundingClientRect().top + scrollY, h: t.offsetHeight, sh: s.offsetHeight, hh: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) }; });
const atQ = async (p, q) => { const g = await geo(p); await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g.top - g.hh + (q / Q) * (g.h - g.sh)); await frame(p); await sleep(850); await frame(p); await sleep(120); };
const snap = (p) => p.evaluate(() => {
  const lens = document.querySelector('[data-orb-lens]').getBoundingClientRect(); const stage = document.querySelector('.orb-stage').getBoundingClientRect();
  const hit = [...document.querySelectorAll('button[data-orb-label]')].map((e) => { const r = e.getBoundingClientRect(); return { cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, text: e.textContent, on: e.getAttribute('aria-pressed') === 'true', tf: getComputedStyle(e).transform }; });
  const texts = [...document.querySelectorAll('svg.orb-arcs text')].map((t) => ({ txt: t.textContent, wt: +t.style.fontWeight, op: +t.getAttribute('opacity'), fs: +t.getAttribute('font-size'), fill: t.getAttribute('fill'), r: (() => { const q = t.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; })() }));
  const rc = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; }; const head = document.querySelector('.orb-head').getBoundingClientRect(); const desc = document.querySelector('.orb-dc').getBoundingClientRect(); const left = rc(document.querySelector('.orb-headblk')), right = rc(document.querySelector('.orb-descblk')); const wide = document.querySelector('.orb-stage').dataset.wide === '1'; const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'));
  return { lens: { l: lens.left, t: lens.top, r: lens.right, b: lens.bottom, cx: (lens.left + lens.right) / 2 }, stage: { t: stage.top, b: stage.bottom, l: stage.left, r: stage.right }, hit, texts, head: { b: head.bottom, t: head.top, l: head.left, r: head.right }, desc: { t: desc.top, b: desc.bottom, l: desc.left, r: desc.right }, left, right, wide, hh, sel: hit.findIndex((h) => h.on), desc0: [...document.querySelectorAll('.orb-d')].findIndex((d) => d.dataset.on === '1') };
});
// the visible (opaque) title text of the selected, lifted service
const lifted = (s) => s.texts.filter((t) => t.op > 0.5).sort((a, c) => c.fs - a.fs)[0];

for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 600 }]) {
  console.log(`\n── A refined ${vp.width}x${vp.height}`);
  const p = await open(vp); const g = await geo(p); const extra = g.h - g.sh;
  ok('scroll travel ≈ 35–40 % more than the previous 1,710 px at 900 tall (bounded on short screens)', vp.height === 900 ? extra >= 2300 && extra <= 2400 : extra >= 1780, `${extra}px`);
  // 1 hold poses for all seven services: selected, lifted, straight, centred above the lens, large + yellow; lens/description match
  let all = true, detail = [];
  for (let k = 0; k < N; k++) {
    await atQ(p, holdStart(k) + HOLD / 2); const s = await snap(p); const hit = s.hit[k]; const t = lifted(s);
    const straight = (() => { const m = s.hit[k].tf.match(/matrix\(([^)]+)\)/); if (!m) return true; const v = m[1].split(',').map(Number); return Math.abs(v[1]) < 0.01; })();
    const good = s.sel === k && s.desc0 === k && straight && Math.abs(hit.cx - s.lens.cx) < 4 && hit.cy < s.lens.t - 10 && hit.cy > s.stage.t && t && t.txt === s.hit[k].text && /243,232,204,1(\.0+)?\)/.test(t.fill) && t.fs > 27 && t.wt === 700 && s.texts.filter((x) => x !== t && x.op > 0.5).every((x) => x.wt === 400 && x.fs < 22);
    if (!good) { all = false; detail.push(`${k}:${JSON.stringify({ sel: s.sel, d: s.desc0, straight, dx: Math.round(hit.cx - s.lens.cx), cy: Math.round(hit.cy), lensT: Math.round(s.lens.t), headB: Math.round(s.head.b), t: t && t.txt })}`); }
  }
  ok('hold: each service is selected, lifted, straight, centred above the lens, enlarged (28.5 px) bold 700 + cream while the ring names stay 400, with matching lens/description', all, detail.join(' | '));
  // 2 the orbit is stationary during a hold (label position constant)
  await atQ(p, holdStart(2) + 0.05); const a1 = (await snap(p)).hit[2]; await atQ(p, holdStart(2) + HOLD - 0.05); const a2 = (await snap(p)).hit[2];
  ok('orbit stays aligned during the selected hold', Math.abs(a1.cx - a2.cx) < 1.5 && Math.abs(a1.cy - a2.cy) < 1.5, `${a1.cx.toFixed(1)},${a1.cy.toFixed(1)} → ${a2.cx.toFixed(1)},${a2.cy.toFixed(1)}`);
  // 3 forward vs reverse retrace at sampled positions
  const samples = []; for (let q = 0; q <= Q; q += Q / 36) samples.push(q);
  const sig = async (q) => { await atQ(p, q); const s = await snap(p); return s.hit.map((h) => `${Math.round(h.cx)},${Math.round(h.cy)}`).join(';') + '|' + s.sel; };
  const fwd = []; for (const q of samples) fwd.push(await sig(q)); const rev = []; for (const q of [...samples].reverse()) rev.push(await sig(q)); rev.reverse();
  ok('reverse scrolling retraces exactly the same poses (37 sampled positions)', fwd.every((x, i) => x === rev[i]), `${fwd.filter((x, i) => x !== rev[i]).length} differ`);
  // 4 the same label travels (no duplicate): at mid-rise exactly one label is between ring and title, and each name is drawn once at opacity>0.5 (plus ≤1 crossfade partner)
  await atQ(p, holdStart(3) - RISE / 2); const mid = await snap(p); const names = mid.texts.filter((t) => t.op > 0.05).map((t) => t.txt); const dup = names.filter((n, i) => names.indexOf(n) !== i);
  ok('mid-rise: the selected name exists once (same label moving, not a second heading)', mid.texts.filter((t) => t.txt === mid.hit[3].text && t.op > 0.05).length === 1, `dups: ${dup.join(',')}`);
  // 5 partial stop holds the pose
  await atQ(p, holdStart(4) - RISE * 0.4); const p1 = await snap(p); await sleep(700); await frame(p); const p2 = await snap(p);
  ok('stopping mid-motion holds the pose (no drift after smoothing)', p1.hit.every((h, i) => Math.abs(h.cx - p2.hit[i].cx) < 0.6 && Math.abs(h.cy - p2.hit[i].cy) < 0.6));
  // 6 geometry: nothing collides, nothing clipped, heading / lifted title / lens / description separate
  await atQ(p, holdStart(2) + HOLD / 2); const s = await snap(p);
  const ar = s.texts.filter((t) => t.op > 0.5);
  const inside = ar.every((t) => t.r.l >= s.stage.l - 1 && t.r.r <= s.stage.r + 1 && t.r.t >= s.stage.t - 1 && t.r.b <= s.stage.b + 1);
  ok('all names inside the stage, none clipped', inside, JSON.stringify(ar.filter((t) => t.r.l < s.stage.l || t.r.r > s.stage.r || t.r.t < s.stage.t || t.r.b > s.stage.b).map((t) => t.txt)));
  const T = lifted(s); const others = ar.filter((t) => t !== T);
  const lensCx = (s.stage.l + s.stage.r) / 2;
  ok('lens is centred in the section', Math.abs(s.lens.cx - lensCx) < 3, `${s.lens.cx.toFixed(1)} vs ${lensCx.toFixed(1)}`);
  if (s.wide) {
    const hit2 = (A, B) => A.l < B.r && B.l < A.r && A.t < B.b && B.t < A.b;
    ok('layout: heading UPPER LEFT, lens + orbit CENTRED, description LOWER RIGHT', s.head.r < s.lens.l && s.head.t < s.lens.t && s.desc.l > s.lens.r && s.desc.t > s.lens.t + (s.lens.b - s.lens.t) * 0.25, JSON.stringify({ headR: Math.round(s.head.r), lensL: Math.round(s.lens.l), descL: Math.round(s.desc.l), lensR: Math.round(s.lens.r), descT: Math.round(s.desc.t), lensT: Math.round(s.lens.t) }));
    ok('both text blocks clear of every curved name and the lifted title', ar.every((t) => !hit2(t.r, s.left) && !hit2(t.r, s.right)), '');
    ok('blocks inside the stage and below the header', s.left.l >= s.stage.l && s.left.t >= s.stage.t && s.right.r <= s.stage.r + 1 && s.right.b <= s.stage.b + 1 && s.right.t >= s.stage.t);
    // the whole rise / hold / return: no label ever touches either block
    let clash = [];
    for (let q = 0; q <= Q; q += Q / 54) { await atQ(p, q); const z = await snap(p); z.texts.filter((t) => t.op > 0.05).forEach((t) => { if (hit2(t.r, z.left) || hit2(t.r, z.right)) clash.push(`${q.toFixed(1)}:${t.txt}`); }); }
    ok('no collisions with either block across the whole timeline (55 positions)', clash.length === 0, clash.slice(0, 4).join(' '));
    await atQ(p, holdStart(2) + HOLD / 2);
  } else {
    ok('constrained width: heading, lifted title, lens, description stacked without overlap', s.head.b <= T.r.t + 40 && T.r.b < s.lens.t && s.lens.b < s.desc.t + 2 && s.desc.b <= s.stage.b + 1, JSON.stringify({ headB: s.head.b, titleT: T.r.t, lensT: s.lens.t, lensB: s.lens.b, descT: s.desc.t }));
  }
  const lensD = s.lens.r - s.lens.l; ok('lens rendered ≈ 600 px at 1440×900 (largest that fits on shorter screens)', vp.height < 800 ? lensD >= 330 : Math.abs(lensD - 600) <= 6, `${lensD.toFixed(0)}px`);
  const minFs = Math.min(...s.texts.map((t) => t.fs)); ok('curved names stay readable (≥ 15 px, weight 400)', minFs >= 14.5, `min ${minFs.toFixed(1)}`);
  // 7 per-name angular extents on the ring at a hold (no collisions between neighbouring arcs, clear of the rim)
  const ang = await p.evaluate(() => { const svg = document.querySelector('svg.orb-arcs'); const lensEl = document.querySelector('[data-orb-lens]').getBoundingClientRect(); const sc = lensEl.width / 600; const cx0 = (lensEl.left + lensEl.right) / 2, cy0 = (lensEl.top + lensEl.bottom) / 2; const out = []; svg.querySelectorAll('text').forEach((t) => { if (+t.getAttribute('opacity') < 0.5) return; const n = t.getNumberOfChars(); if (!n) return; const m = svg.getScreenCTM(); const a = t.getStartPositionOfChar(0), z = t.getEndPositionOfChar(n - 1); const P = (q) => { const pt = svg.createSVGPoint(); pt.x = q.x; pt.y = q.y; const r = pt.matrixTransform(m); return { x: r.x, y: r.y }; }; const A = P(a), Z = P(z); const rr = (q) => Math.hypot(q.x - cx0, q.y - cy0) / sc; const an = (q) => (Math.atan2(q.x - cx0, -(q.y - cy0)) * 180) / Math.PI; out.push({ txt: t.textContent, a0: an(A), a1: an(Z), r0: rr(A), r1: rr(Z) }); }); return out; });
  const ring = ang.filter((x) => x.txt !== (lifted(s) && lifted(s).txt)).sort((x, y) => x.a0 - y.a0);
  const minRadius = Math.min(...ring.map((x) => Math.min(x.r0, x.r1)));
  ok('names sit just outside the rim with a clear gap (≥ 20 design px from the 300 rim)', minRadius >= 319, `min radius ${minRadius.toFixed(1)}`);
  const norm = (a) => ((a % 360) + 360) % 360; const ext = ring.map((x) => { let d = norm(x.a1) - norm(x.a0); if (d < -180) d += 360; return { txt: x.txt, a0: norm(Math.min(norm(x.a0), norm(x.a1))), span: Math.abs(d) }; });
  ok('every name fits its arc (≤ 90% of its 51.4° slot)', ext.every((e) => e.span <= 0.9 * 51.43 && e.span >= 5), ext.map((e) => `${e.txt}:${e.span.toFixed(0)}°`).join(' '));
  // 8 direct selection lands on the hold
  await atQ(p, 0); const labs = await p.$$('button[data-orb-label]'); await labs[5].click(); await sleep(2600); await frame(p); await sleep(300); const d1 = await snap(p);
  ok('direct selection scrolls to the selected hold of that service', d1.sel === 5 && d1.desc0 === 5 && Math.abs(d1.hit[5].cx - d1.lens.cx) < 4 && d1.hit[5].cy < d1.lens.t - 10, `sel ${d1.sel}`);
  // 9 skip + release
  await p.click('.orb-skip'); await sleep(2300); await frame(p); const after = await p.evaluate(() => document.querySelector('.orb-after').getBoundingClientRect().top);
  ok('"Skip services" moves beyond the scene', after < vp.height * 0.4 && after > -250, `${Math.round(after)}`);
  await atQ(p, Q); const last = await snap(p); ok('last service held at the end, then the stage releases naturally', last.sel === 6 && last.desc0 === 6); await p.evaluate(() => scrollBy(0, 500)); await sleep(300); await frame(p);
  ok('releases into the following content', (await p.evaluate(() => document.querySelector('.orb-stage').getBoundingClientRect().top)) < 0);
  ok('wheel is not intercepted', await (async () => { await atQ(p, 1); const y0 = await p.evaluate(() => scrollY); await p.mouse.move(vp.width / 2, vp.height / 2); for (let i = 0; i < 4; i++) { await p.mouse.wheel({ deltaY: 100 }); await sleep(40); } await sleep(400); await frame(p); return (await p.evaluate(() => scrollY)) > y0 + 200; })());
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
