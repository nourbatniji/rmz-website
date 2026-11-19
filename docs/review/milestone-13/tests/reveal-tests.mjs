import puppeteer from 'puppeteer-core';
// usage: node reveal-tests.mjs [url]   — Minds desktop scroll-linked downward reveal (starts fully hidden; whole column incl. the expanded card is masked)
const URL = process.argv[2] || 'http://localhost:3111/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
async function open(vp, rm) { const p = await b.newPage(); await p.setViewport(vp); if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(900); return p; }
const D = { width: 1440, height: 900 };
const clamp = (x, a, c) => Math.min(c, Math.max(a, x));
// geometry of the reveal window for a viewport (derived from the spec: begins at 80 % of the usable viewport below the header; completes when the list fits)
const win = (vh) => { const hh = 92; const start = hh + 0.8 * (vh - hh); const end = vh - 760 - 20 - 80; return { start, end, D: clamp(start - end, 380, 760) }; };
// put the Minds section's top edge `y` px below the viewport top
const atRoot = async (p, y, wait = 450) => { await p.evaluate((y) => { const r = document.querySelector('#minds').getBoundingClientRect(); scrollTo(0, scrollY + r.top - y); }, y); await sleep(wait); };
const atRp = async (p, vh, rpT, wait = 450) => { const w = win(vh); await atRoot(p, w.start - rpT * w.D, wait); };
const rpNow = (p) => p.evaluate(() => +document.querySelector('.minds-list').style.getPropertyValue('--rp'));
// decode a screenshot once and run a function over its pixels (CSS px coordinates)
const withPixels = async (p, fn, arg) => { const b64 = await p.screenshot({ encoding: 'base64' }); return p.evaluate(async (b64, src, arg) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); const k = im.width / innerWidth; const lit = (x, y) => { const d = g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; return d[0] + d[1] + d[2] > 70; }; return (new Function('lit', 'arg', 'return (' + src + ')(lit, arg)'))(lit, arg); }, b64, fn.toString(), arg); };
const cols = (p) => p.evaluate(() => { const l = document.querySelector('.minds-list').getBoundingClientRect(); return { listTop: l.top, vh: innerHeight, cols: [...document.querySelectorAll('.minds-list > li')].map((e) => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, open: e.classList.contains('mind-open'), slot: +e.style.getPropertyValue('--o') }; }) }; });
// number of lit (non-dark) pixels in the list area inside the viewport — over every column, gaps included
const litInList = async (p) => { const g = await cols(p); return withPixels(p, (lit, a) => { let n = 0; for (let x = 2; x < innerWidth; x += 12) for (let y = Math.max(96, a.listTop + 1); y < innerHeight - 1; y += 6) if (lit(x, y)) n++; return n; }, { listTop: g.listTop }); };
// revealed height (px below the list top) of every column, scanned down its own left edge/centre; capped by the viewport
const revealed = async (p) => { const g = await cols(p); return withPixels(p, (lit, a) => a.cols.map((c) => { const x = c.open ? c.left + 6 : c.left + c.width / 2; let h = 0; const y0 = Math.max(96, Math.round(a.listTop + 1)); for (let y = y0; y < innerHeight; y++) { if (!lit(x, y)) break; h++; } return h + Math.round(y0 - a.listTop); }), g); };
// lit pixels strictly BELOW `from` (px under the list top) across a column's full width (leak check)
const leak = async (p, i, from) => { const g = await cols(p); return withPixels(p, (lit, a) => { const c = a.cols[a.i]; let n = 0; for (let x = c.left + 8; x < c.right - 8; x += 14) for (let y = Math.max(96, a.listTop + a.from + 6); y < innerHeight - 1; y += 6) if (lit(x, y)) n++; return n; }, { listTop: g.listTop, cols: g.cols, i, from }); };
const q = (rp, slot) => clamp((rp - 0.04 * slot) / 0.72, 0, 1);
const clips = (p) => p.evaluate(() => [...document.querySelectorAll('#minds .mind')].map((m) => getComputedStyle(m).clipPath));
const ALL_HIDDEN = /inset\(0px 0px 100%( 0px)?\)/;

// ───────── 1. before the trigger: absolutely nothing is visible ─────────
{
  const t = await open({ width: 1440, height: 2200 }); const w = win(2200);
  await atRoot(t, w.start + 30); const n0 = await litInList(t); const rp0 = await rpNow(t); const c0 = await clips(t);
  const lt = await t.evaluate(() => document.querySelector('.minds-list').getBoundingClientRect().top); const room = 2200 - lt;
  ok(`before the trigger (a tall viewport shows ${Math.round(room)} px of the list area): ZERO visible pixels from all eight columns, including the active/expanded card`, rp0 === 0 && n0 === 0 && c0.every((c) => ALL_HIDDEN.test(c)), `rp ${rp0}, lit pixels ${n0}, clip ${c0[2]}`);
  await atRoot(t, w.start + 0.5); const n1 = await litInList(t); ok('…and exactly at the trigger point (section top at 80 % of the usable viewport below the header) nothing shows yet', n1 === 0 && (await rpNow(t)) === 0, `lit ${n1}`);
  await atRoot(t, w.start - 40); const g = await cols(t); const revealing = await revealed(t); const first = g.cols.findIndex((c) => c.slot === 0);
  const rpj = await rpNow(t); const expj = g.cols.map((c) => Math.round(q(rpj, c.slot) * 760)); ok('the reveal starts only after that point: just past it the earliest slots have begun and every later-slot column is still completely hidden (matches each slot\'s progress)', revealing[first] > 5 && revealing.every((h, i) => Math.abs((h <= 1 ? 0 : h) - expj[i]) <= 4) && g.cols.some((c, i) => c.slot >= 4 && revealing[i] <= 1), revealing.join() + ' exp ' + expj.join());
  await t.close();
}

// ───────── 2. 1440×900: 25 / 50 / 75 %, the active card is clipped at its own edge ─────────
{
  const p = await open(D); const w = win(900);
  const sl = (await cols(p)).cols.map((c) => c.slot); ok(`one shuffled permutation of slots 0–7 (${sl.join('')}); the window begins at section-top ${Math.round(w.start)} px and completes at ${Math.round(w.end)} px (range ${Math.round(w.D)} px)`, new Set(sl).size === 8);
  const sec0 = await p.evaluate(() => ({ h: document.querySelector('#minds').getBoundingClientRect().height, lh: document.querySelector('.minds-list').getBoundingClientRect().height, sh: document.documentElement.scrollHeight }));
  const openIdx = (await cols(p)).cols.findIndex((c) => c.open); const res = [];
  for (const f of [0.25, 0.5, 0.75]) {
    await atRp(p, 900, f, 450); const g = await cols(p); const rp = await rpNow(p); const h = await revealed(p);
    const exp = g.cols.map((c) => Math.min(q(rp, c.slot) * 760, g.vh - g.listTop)); const err = h.map((v, i) => Math.abs(v - exp[i]));
    const aEdge = Math.round(q(rp, g.cols[openIdx].slot) * 760); const lk = aEdge + 10 < g.vh - g.listTop ? await leak(p, openIdx, aEdge) : -1;
    const allLeak = []; for (let i = 0; i < 8; i++) { const e = Math.round(q(rp, g.cols[i].slot) * 760); allLeak.push(e + 10 < g.vh - g.listTop ? await leak(p, i, e) : 0); }
    res.push({ f, rp, err: Math.max(...err), aEdge, lk, allLeak });
    ok(`${f * 100} %: every column (incl. the active cream card) is revealed exactly to its own edge — within ${Math.max(...err).toFixed(1)} px of its slot's progress (active card edge ${aEdge} px${lk >= 0 ? ', ' + lk + ' stray pixels below it' : ', edge below the fold'})`, Math.max(...err) <= 6 && lk <= 0 && allLeak.every((n) => n === 0), `h ${h.join(',')} exp ${exp.map(Math.round).join(',')}`);
  }
  ok('the active card shows different lengths at 25 / 50 / 75 % (it follows its own column\'s progress, never full-height ahead of it)', res[0].aEdge < res[1].aEdge && res[1].aEdge <= res[2].aEdge);
  const pts = []; for (let i = 0; i <= 14; i++) pts.push(i / 14);
  const fwd = []; for (const f of pts) { await atRp(p, 900, f, 450); fwd.push(await revealed(p)); }
  const bwd = []; for (const f of [...pts].reverse()) { await atRp(p, 900, f, 450); bwd.push(await revealed(p)); } bwd.reverse();
  ok('monotonic: columns only ever get longer on the way down', fwd.every((s, i) => i === 0 || s.every((v, k) => v >= fwd[i - 1][k] - 2)));
  ok('reversing retraces the same path (all sampled positions match the forward pass within 3 px)', fwd.every((s, i) => s.every((v, k) => Math.abs(v - bwd[i][k]) <= 3)), fwd.map((s, i) => Math.max(...s.map((v, k) => Math.abs(v - bwd[i][k])))).join(','));
  ok('reverse to the start: at rp = 0 every column is 0 px again', bwd[0].every((v) => v <= 1), bwd[0].join());
  await atRoot(p, w.start + 40, 450); ok('…and the whole list area shows zero visible pixels again', (await litInList(p)) === 0 && (await clips(p)).every((c) => ALL_HIDDEN.test(c)));
  await atRoot(p, w.end - 5, 450); const hf = await revealed(p); const cl = await clips(p);
  ok('completion: all eight columns reach their full existing height (760 px)', hf.every((v) => v >= 755) && cl.every((c) => /inset\(0px 0px 0(%|px)( 0px)?\)/.test(c)), hf.join());
  await atRp(p, 900, 0.5, 450); const hA = await revealed(p); await sleep(1500); const hB = await revealed(p); ok('stopping mid-way holds the exact partial state (no drift over 1.5 s)', hA.every((v, i) => Math.abs(v - hB[i]) <= 1), hA.join());
  await atRoot(p, w.start + 40, 60); const j1 = await litInList(p); await atRoot(p, w.end - 5, 60); const j2 = await revealed(p); await atRoot(p, w.start + 40, 60); const j3 = await litInList(p);
  ok('fast scroll (instant jumps): hidden → complete → hidden, always matching the position (no catch-up animation)', j1 === 0 && j2.every((v) => v >= 755) && j3 === 0);
  const props = []; for (const f of [0, 0.3, 0.6, 1]) { await atRp(p, 900, f, 450); props.push(await p.evaluate(() => { const l = document.querySelector('.minds-list').getBoundingClientRect(); const m = [...document.querySelectorAll('.mind')]; const cs = m.map((e) => getComputedStyle(e)); return { op: cs.every((c) => c.opacity === '1'), tr: cs.every((c) => c.translate === 'none' && c.transform === 'none' && c.scale === 'none'), tops: m.every((e) => Math.abs(e.getBoundingClientRect().top - l.top) < 0.5 && Math.abs(e.getBoundingClientRect().height - 760) < 0.5), anim: document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#minds')).length, sec: document.querySelector('#minds').getBoundingClientRect().height, lh: l.height, sh: document.documentElement.scrollHeight, topInset: cs.every((c) => /^inset\(0px /.test(c.clipPath)), pad: getComputedStyle(document.querySelector('#minds')).paddingTop }; })); }
  ok('no translate, scale, opacity fade or timed animation at any position — only the bottom mask changes (top edge fixed, content never stretched)', props.every((x) => x.op && x.tr && x.anim === 0 && x.topInset));
  ok('layout stays reserved: top edges anchored, columns keep 760 px, section 840 px, document height constant, 80 px red space above, nothing added below', props.every((x) => x.tops && x.sec === sec0.h && x.lh === sec0.lh && x.sh === sec0.sh && x.pad === '80px'), JSON.stringify([sec0, props[1].sec]));
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────── 3. switching the active column mid-reveal keeps every mask ─────────
{
  const p = await open(D); const w = win(900); const f = 0.5;
  await atRp(p, 900, f, 450); const g0 = await cols(p); const oldOpen = g0.cols.findIndex((c) => c.open);
  const target = [...g0.cols.keys()].filter((i) => i !== oldOpen && g0.cols[i].slot <= 2)[0];
  const x = g0.cols[target].left + g0.cols[target].width / 2; await p.mouse.click(x, g0.listTop + 40); await sleep(1300);
  const g = await cols(p); const rp = await rpNow(p); const h = await revealed(p); const nowOpen = g.cols.findIndex((c) => c.open); const cl = await clips(p);
  ok(`mouse-clicking column ${target + 1} mid-reveal makes it the active column and widens the layout (horizontal expansion preserved)`, nowOpen === target && g.cols.filter((c) => c.open).length === 1 && Math.abs(g.cols[nowOpen].width - 520) < 1);
  ok('…the click does NOT lift its mask: the new active card is still clipped at its own reveal edge (a mouse click focuses the button but is not keyboard focus)', cl[target] !== 'none' && Math.abs(h[target] - Math.min(q(rp, g.cols[target].slot) * 760, g.vh - g.listTop)) <= 6, `clip ${cl[target]} h ${h[target]}`);
  const exp = g.cols.map((c) => Math.min(q(rp, c.slot) * 760, g.vh - g.listTop)); const err = Math.max(...h.map((v, i) => Math.abs(v - exp[i])));
  ok(`every column (including the one that just closed) keeps clipping at its own slot's edge after the switch (max error ${err.toFixed(1)} px)`, err <= 6, h.join(','));
  const lkNew = await leak(p, nowOpen, Math.round(q(rp, g.cols[nowOpen].slot) * 760)); const lkOld = await leak(p, oldOpen, Math.round(q(rp, g.cols[oldOpen].slot) * 760));
  ok('no cream card, portrait, text or other content is visible below the reveal edge of the new active column or of the one that closed', lkNew === 0 && lkOld === 0, `${lkNew}/${lkOld}`);
  await atRp(p, 900, 0.8, 450); const g8 = await cols(p); const rp8 = await rpNow(p); const h8 = await revealed(p); const e8 = g8.cols.map((c) => Math.min(q(rp8, c.slot) * 760, g8.vh - g8.listTop));
  ok('scrolling on after the switch: each column keeps following its own slot (the new active card grows with its column)', Math.max(...h8.map((v, i) => Math.abs(v - e8[i]))) <= 6, h8.join(','));
  await atRoot(p, w.end - 5, 450); const hc = await revealed(p); ok('the reveal completes after the switch (all full height)', hc.every((v) => v >= 755), hc.join(','));
  await atRp(p, 900, 0.5, 450); const hmid = await revealed(p); ok('reverse after the switch: retracts smoothly (mid-way lengths follow the slots again)', Math.abs(hmid[target] - Math.min(q(0.5, g.cols[target].slot) * 760, g.vh - g.listTop)) <= 8);
  await atRoot(p, w.start + 40, 450); const nEnd = await litInList(p); ok('reverse to the start: every column, including the new active card, is completely hidden again (zero visible pixels)', nEnd === 0 && (await clips(p)).every((c) => ALL_HIDDEN.test(c)), `lit ${nEnd}`);
  await atRp(p, 900, 0.3, 450); await p.evaluate(() => document.activeElement && document.activeElement.blur()); const gk = await cols(p); const kc = gk.cols.findIndex((c) => c.slot === 3); const before = await revealed(p); await p.keyboard.press('Shift'); await p.evaluate((k) => document.querySelectorAll('#minds .mind-cover')[k].focus({ preventScroll: true }), kc); await sleep(150);
  const fv = await p.evaluate(() => document.activeElement.matches(':focus-visible')); const after = await revealed(p); const cl2 = await clips(p);
  ok('keyboard focus into a partly revealed column reveals it fully (focus-visible); the other columns are unaffected', fv && cl2[kc] === 'none' && after[kc] > before[kc] + 100 && before.every((v, i) => i === kc || Math.abs(v - after[i]) <= 2), `col ${kc}: ${before[kc]} → ${after[kc]} (focus-visible ${fv})`);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────── 4. other viewports ─────────
for (const [vw, vh] of [[1280, 720], [1920, 1080]]) {
  const p = await open({ width: vw, height: vh }); const w = win(vh);
  await atRoot(p, w.start + 30, 450); const n0 = await litInList(p); const r0 = await rpNow(p); await atRoot(p, w.end - 5, 450); const r1 = await rpNow(p); const hs = await revealed(p);
  ok(`${vw}×${vh}: nothing visible before the 80 %-of-usable-viewport trigger (rp ${r0}, ${n0} lit pixels); completes at full height (rp ${r1}); range ${Math.round(w.D)} px`, n0 === 0 && r0 === 0 && r1 === 1 && hs.every((v) => v >= Math.min(755, vh - (w.end + 80) - 4)), hs.join());
  const meds = []; for (const f of [0.25, 0.5, 0.75]) { await atRp(p, vh, f, 450); const g = await cols(p); const h = await revealed(p); meds.push({ med: Math.min(...h), room: g.vh - g.listTop }); }
  ok(`${vw}×${vh}: the reveal stays visible while it happens — the last-slot column's growing edge is on screen at 25 / 50 / 75 %`, meds.every((m) => m.med < m.room - 4), JSON.stringify(meds));
  await p.close();
}

// ───────── 5. reduced motion, JS off, mobile ─────────
{
  const r = await open(D, true); await atRoot(r, 700); const nr = await litInList(r);
  ok('reduced motion: complete columns immediately — not hidden, no data-reveal, no mask', await r.evaluate(() => !document.querySelector('#minds').dataset.reveal && [...document.querySelectorAll('.mind')].every((e) => getComputedStyle(e).clipPath === 'none')) && nr > 100, `lit ${nr}`); await r.close();
  const j = await b.newPage(); await j.setViewport(D); await j.setJavaScriptEnabled(false); await j.goto(URL, { waitUntil: 'networkidle0' }); await atRoot(j, 700, 450); const nj = await litInList(j);
  ok('JavaScript off: complete columns immediately (server markup, nothing masked)', await j.evaluate(() => !document.querySelector('#minds').dataset.reveal && [...document.querySelectorAll('.mind')].every((e) => getComputedStyle(e).clipPath === 'none')) && nj > 100, `lit ${nj}`); await j.close();
  const m = await open({ width: 390, height: 844, isMobile: true, hasTouch: true });
  ok('mobile accordion unchanged: no scroll reveal, nothing masked (its own entrance is untouched)', await m.evaluate(() => !document.querySelector('#minds').dataset.reveal && [...document.querySelectorAll('.mind')].every((e) => getComputedStyle(e).clipPath === 'none') && document.querySelector('#minds').dataset.entrance === 'pre'));
  ok('no horizontal overflow on mobile', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await m.close();
  const q2 = await open(D); await q2.setViewport({ width: 900, height: 800 }); await sleep(500); const off = await q2.evaluate(() => !document.querySelector('#minds').dataset.reveal && [...document.querySelectorAll('.mind')].every((e) => getComputedStyle(e).clipPath === 'none'));
  await q2.setViewport(D); await sleep(500); ok('resizing below 1024 px drops the reveal (complete accordion); back to desktop restores it', off && (await q2.evaluate(() => document.querySelector('#minds').dataset.reveal === 'on'))); await q2.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
