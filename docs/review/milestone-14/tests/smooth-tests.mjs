import puppeteer from 'puppeteer-core';
// usage: node smooth-tests.mjs [url] — smoothing of the Minds scroll-linked reveal progress (one shared --rp, damped toward the scroll target)
const URL = process.argv[2] || 'http://localhost:3111/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
async function open(vp, rm) { const p = await b.newPage(); await p.setViewport(vp); if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(900); return p; }
const D = { width: 1440, height: 900 };
// install an in-page frame sampler: every rAF records {t, rp (rendered), tg (exact scroll target)}; also counts --rp writes
const install = (p) => p.evaluate(() => {
  const root = document.querySelector('#minds'), list = document.querySelector('.minds-list');
  const clamp = (x, a, c) => Math.min(c, Math.max(a, x));
  const target = () => { const vh = innerHeight; const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 92; const start = hh + 0.8 * (vh - hh); const above = parseFloat(getComputedStyle(root).paddingTop) || 0; const end = vh - list.offsetHeight - 20 - above; const Dd = clamp(start - end, 380, 760); return clamp((start - root.getBoundingClientRect().top) / Dd, 0, 1); };
  window.__s = { frames: [], writes: 0, on: true };
  new MutationObserver(() => { window.__s.writes++; }).observe(list, { attributes: true, attributeFilter: ['style'] });
  const loop = (t) => { if (!window.__s.on) return; window.__s.frames.push({ t, rp: +list.style.getPropertyValue('--rp'), tg: target() }); requestAnimationFrame(loop); };
  requestAnimationFrame(loop); window.__target = target;
});
const reset = (p) => p.evaluate(() => { window.__s.frames = []; window.__s.writes = 0; });
const take = (p) => p.evaluate(() => ({ frames: window.__s.frames.slice(), writes: window.__s.writes }));
const w = (vh) => { const hh = 92; const start = hh + 0.8 * (vh - hh); const end = vh - 760 - 20 - 80; return { start, D: Math.min(760, Math.max(380, start - end)) }; };
const win = w(900);
const atRoot = (p, y) => p.evaluate((y) => { const r = document.querySelector('#minds').getBoundingClientRect(); scrollTo(0, scrollY + r.top - y); }, y);
const atRp = (p, f) => atRoot(p, win.start - f * win.D);

const p = await open(D); await install(p);
// ───────── 1. small step forward: catches up quickly, monotonic, no overshoot, exact end ─────────
await atRp(p, 0.3); await sleep(900); await reset(p);
await atRp(p, 0.37); const t0 = await p.evaluate(() => performance.now()); await sleep(700); let s = await take(p); const tgt = s.frames[s.frames.length - 1].tg;
const fr = s.frames.filter((f) => f.t >= t0);
const startRp = fr[0].rp; const tt = (frac) => { const f = fr.find((f) => Math.abs(f.rp - tgt) <= (1 - frac) * Math.abs(tgt - startRp)); return f ? f.t - t0 : Infinity; };
const t90 = tt(0.9), tdone = (fr.find((f) => Math.abs(f.rp - f.tg) < 1e-4) || { t: Infinity }).t - t0;
ok(`a 0.07 (≈50 px) scroll step: rendered progress catches up — 90 % in ${t90.toFixed(0)} ms, exact by ${tdone.toFixed(0)} ms (short ≈100–150 ms catch-up, not instant, not floaty)`, t90 >= 20 && t90 <= 170 && tdone <= 330, `start ${startRp.toFixed(4)} → ${tgt.toFixed(4)}`);
ok('…it eases monotonically toward the target and never overshoots or bounces', fr.every((f, i) => i === 0 || f.rp >= fr[i - 1].rp - 1e-9) && fr.every((f) => f.rp <= tgt + 1e-4));
ok('…and it really is smoothed (the first rendered frames are between the old and new progress, not already at the target)', fr.slice(0, 6).some((f) => f.rp > startRp + 1e-4 && f.rp < tgt - 1e-4), fr.slice(0, 5).map((f) => f.rp).join(','));

// ───────── 2. same in reverse ─────────
await reset(p); const t1 = await p.evaluate(() => performance.now()); await atRp(p, 0.30); await sleep(700); s = await take(p);
const fr2 = s.frames.filter((f) => f.t >= t1); const tg2 = fr2[fr2.length - 1].tg; const sr = fr2[0].rp;
const d90 = fr2.find((f) => Math.abs(f.rp - tg2) <= 0.1 * Math.abs(tg2 - sr));
ok(`reverse step: equally smooth — 90 % in ${d90 ? (d90.t - t1).toFixed(0) : '∞'} ms, monotonic, no undershoot, exact end`, d90 && d90.t - t1 <= 170 && fr2.every((f, i) => i === 0 || f.rp <= fr2[i - 1].rp + 1e-9) && fr2.every((f) => f.rp >= tg2 - 1e-4) && Math.abs(fr2[fr2.length - 1].rp - tg2) < 1e-4, `${sr.toFixed(4)} → ${tg2.toFixed(4)}`);

// ───────── 3. continuous slow scroll: rendered stays within a hair of the target (no noticeable lag) ─────────
await atRp(p, 0.05); await sleep(700); await reset(p);
for (let i = 0; i <= 60; i++) { await atRp(p, 0.05 + 0.9 * (i / 60)); await sleep(33); }
s = await take(p); const lag = Math.max(...s.frames.map((f) => Math.abs(f.tg - f.rp))) * win.D;
ok(`slow continuous scroll (≈ 700 px in 2 s): the rendered reveal trails the scroll position by at most ${lag.toFixed(0)} px`, lag <= 30);
await sleep(600); s = await take(p); const lastf = s.frames[s.frames.length - 1]; ok('…then settles exactly onto the position after the scroll stops (within 0.0001 ≈ 0.07 px)', Math.abs(lastf.rp - lastf.tg) < 1e-4);

// ───────── 4. rapid direction changes ─────────
await atRp(p, 0.4); await sleep(700); await reset(p);
const seq = [0.5, 0.42, 0.56, 0.38, 0.6, 0.45, 0.52];
for (const f of seq) { await atRp(p, f); await sleep(45); }
await sleep(800); s = await take(p); const ends = s.frames[s.frames.length - 1];
ok('rapid direction changes: the rendered progress always stays between the extremes of the targets (no overshoot/bounce), and settles exactly on the final position', s.frames.every((f) => f.rp >= Math.min(...seq) - 0.004 && f.rp <= Math.max(...seq) + 0.004) && Math.abs(ends.rp - ends.tg) < 1e-4, `${ends.rp} vs ${ends.tg}`);
const ov = s.frames.filter((f, i) => i > 0 && ((f.rp - s.frames[i - 1].rp) * (s.frames[i - 1].tg - s.frames[i - 1].rp) < -1e-9 && Math.abs(s.frames[i - 1].tg - s.frames[i - 1].rp) > 0.004)).length;
ok('…each frame moves toward the current target, never away from it (no bounce)', ov <= 2, `${ov} frames moving away`);

// ───────── 5. endpoints exact ─────────
await atRoot(p, win.start + 60); await sleep(800); const e0 = await p.evaluate(() => ({ v: document.querySelector('.minds-list').style.getPropertyValue('--rp'), c: [...document.querySelectorAll('#minds .mind')].map((m) => getComputedStyle(m).clipPath) }));
ok('fully hidden endpoint is exact: --rp = 0 and every column mask fully closed', e0.v === '0' && e0.c.every((c) => /inset\(0px 0px 100%( 0px)?\)/.test(c)), e0.v);
await atRoot(p, 10); await sleep(800); const e1 = await p.evaluate(() => ({ v: document.querySelector('.minds-list').style.getPropertyValue('--rp'), c: [...document.querySelectorAll('#minds .mind')].map((m) => getComputedStyle(m).clipPath) }));
ok('fully revealed endpoint is exact: --rp = 1 and no mask left on any column', e1.v === '1' && e1.c.every((c) => /inset\(0px 0px 0(%|px)( 0px)?\)/.test(c) || c === 'none'), e1.v);

// ───────── 6. loop stops when settled ─────────
await atRp(p, 0.5); await sleep(900); await reset(p); await sleep(1200); s = await take(p);
ok('idle: once settled the loop stops — zero --rp writes during 1.2 s with no scrolling', s.writes === 0, `${s.writes} writes`);

// ───────── 7. big jumps / anchors are immediate ─────────
await atRoot(p, win.start + 60); await sleep(700); await reset(p);
const tj = await p.evaluate(() => performance.now()); await atRoot(p, 10); await sleep(300); s = await take(p);
const jf = s.frames.filter((f) => f.t >= tj); const firstDone = jf.findIndex((f) => f.rp === 1);
ok(`large jump hidden → complete: rendered progress is exact within ${firstDone + 1} frame(s) (no trailing animation)`, firstDone >= 0 && firstDone <= 2, `frames ${jf.slice(0, 4).map((f) => f.rp).join(',')}`);
await reset(p); const tj2 = await p.evaluate(() => performance.now()); await atRoot(p, win.start + 60); await sleep(300); s = await take(p);
const jf2 = s.frames.filter((f) => f.t >= tj2); const fd2 = jf2.findIndex((f) => f.rp === 0);
ok(`large jump complete → hidden: exact within ${fd2 + 1} frame(s)`, fd2 >= 0 && fd2 <= 2);
await p.evaluate(() => { window.__s.on = false; }); await p.close();

// anchor navigation from the top and a reload part-way down
{
  const a = await open(D); await a.evaluate(() => { location.hash = '#minds'; }); await sleep(500);
  const r = await a.evaluate(() => ({ rp: +document.querySelector('.minds-list').style.getPropertyValue('--rp'), tg: 0 }));
  const exact = await a.evaluate(() => { const root = document.querySelector('#minds'), list = document.querySelector('.minds-list'); const vh = innerHeight; const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 92; const start = hh + 0.8 * (vh - hh); const end = vh - list.offsetHeight - 20 - parseFloat(getComputedStyle(root).paddingTop); const Dd = Math.min(760, Math.max(380, start - end)); return Math.min(1, Math.max(0, (start - root.getBoundingClientRect().top) / Dd)); });
  ok('anchor navigation (#minds from the top): after the jump the reveal matches the scroll position — never left hidden or trailing', Math.abs(r.rp - exact) <= 0.003, `${r.rp} vs ${exact.toFixed(4)}`);
  await a.reload({ waitUntil: 'networkidle0' }); await sleep(900); const r2 = await a.evaluate(() => +document.querySelector('.minds-list').style.getPropertyValue('--rp'));
  ok('reload (scroll restored): matches the position at once', r2 >= 0 && r2 <= 1 && a.errs.length === 0);
  await a.close();
}

// ───────── 8. column switch during the reveal, keyboard focus, reduced motion / mobile ─────────
{
  const c = await open(D); await install(c);
  await atRp(c, 0.5); await sleep(800);
  const x = await c.evaluate(() => { const cols = [...document.querySelectorAll('.minds-list > li')]; const i = cols.findIndex((e) => !e.classList.contains('mind-open') && e.getBoundingClientRect().left > 700); const r = cols[i].getBoundingClientRect(); return [r.left + r.width / 2, document.querySelector('.minds-list').getBoundingClientRect().top + 40, i]; });
  await c.mouse.click(x[0], x[1]); await atRp(c, 0.6); await sleep(900);
  const st = await c.evaluate((i) => { const m = document.querySelectorAll('.minds-list > li')[i]; return { open: m.classList.contains('mind-open'), clip: getComputedStyle(m).clipPath, rp: +document.querySelector('.minds-list').style.getPropertyValue('--rp'), tg: window.__target() }; }, x[2]);
  ok('switching the active column mid-reveal and scrolling on: it opens, stays masked (not lifted by the click) and the progress settles exactly on the position', st.open && st.clip !== 'none' && Math.abs(st.rp - st.tg) < 0.0006, JSON.stringify(st));
  await c.evaluate(() => { window.__s.on = false; });
  await c.keyboard.press('Shift'); await c.evaluate(() => document.querySelectorAll('#minds .mind-cover')[0].focus({ preventScroll: true })); await sleep(150);
  ok('keyboard focus still reveals its column fully', await c.evaluate(() => getComputedStyle(document.querySelectorAll('#minds .mind')[0]).clipPath === 'none'));
  ok('no page errors', c.errs.length === 0, c.errs.join('|')); await c.close();
  const r = await open(D, true); await atRoot(r, 400); await sleep(400);
  ok('reduced motion: no reveal state, no loop, complete columns (unchanged)', await r.evaluate(() => !document.querySelector('#minds').dataset.reveal && !document.querySelector('.minds-list').style.getPropertyValue('--rp') && [...document.querySelectorAll('.mind')].every((e) => getComputedStyle(e).clipPath === 'none'))); await r.close();
  const m = await open({ width: 390, height: 844, isMobile: true, hasTouch: true });
  ok('mobile: no reveal state (accordion unchanged)', await m.evaluate(() => !document.querySelector('#minds').dataset.reveal && !document.querySelector('.minds-list').style.getPropertyValue('--rp'))); await m.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
