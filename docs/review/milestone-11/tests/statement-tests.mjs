import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
// usage: node statement-tests.mjs [url] [baseline.json]
const URL = process.argv[2] || 'http://localhost:3111/';
const BASE = process.argv[3];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
async function open(vp, rm) { const p = await b.newPage(); await p.setViewport(vp); if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); }); await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(900); return p; }
const toStm = (p, off = 60) => p.evaluate((o) => { const r = document.querySelector('#statement').getBoundingClientRect(); scrollTo(0, scrollY + r.top - o); }, off);
const count = (p) => p.evaluate(() => document.querySelector('.stm-count')?.textContent.trim());
const D = { width: 1440, height: 900 }, M = { width: 390, height: 844, isMobile: true, hasTouch: true };

// ───────── 1. progress bar removed, counter kept ─────────
{
  const p = await open(D); await toStm(p); await sleep(2500);
  const s = await p.evaluate(() => ({
    track: document.querySelectorAll('.stm-track').length, bar: document.querySelectorAll('.stm-bar').length,
    anim: document.getAnimations().filter((a) => /stm-bar/.test(a.animationName || '')).length,
    kf: [...document.styleSheets].some((ss) => { try { return [...ss.cssRules].some((r) => r.type === CSSRule.KEYFRAMES_RULE && /stm-bar/.test(r.name)); } catch { return false; } }),
    css: [...document.styleSheets].some((ss) => { try { return [...ss.cssRules].some((r) => /stm-(bar|track)/.test(r.cssText)); } catch { return false; } }),
    counter: document.querySelector('.stm-count')?.textContent.trim(), counterOp: +getComputedStyle(document.querySelector('.stm-lab')).opacity, aria: document.querySelector('.stm-count')?.getAttribute('aria-hidden'),
    foot: document.querySelector('.stm-foot').children.length,
  }));
  ok('progress bar, track and animated fill are gone (no elements, no keyframes, no rules, no running animation)', s.track === 0 && s.bar === 0 && s.anim === 0 && !s.kf && !s.css, JSON.stringify(s));
  ok('the "NN / NN" counter stays (visible, aria-hidden) and is the only footer element', /^0\d \/ 04$/.test(s.counter) && s.counterOp === 1 && s.aria === 'true' && s.foot === 1, s.counter);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ───────── 2. interval: 2000 ms start to start; no overlapping animations ─────────
{
  const p = await open(D);
  await p.evaluate(() => {
    window.__ev = [];
    const slot = document.querySelector('#statement .stm-txt .stm-slot');
    const running = () => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.classList && a.effect.target.classList.contains('stm-lt')).length;
    new MutationObserver((muts) => { for (const m of muts) { const el = m.target; if (!el.classList.contains('stm-lw')) continue; const was = (m.oldValue || '').includes('out'); const now = el.classList.contains('out'); const wasIn = (m.oldValue || '').includes(' in') || (m.oldValue || '').split(' ').includes('in'); const nowIn = el.classList.contains('in');
      if (now && !was) window.__ev.push({ t: performance.now(), type: 'exit', word: el.textContent, running: running() });
      else if (nowIn && !wasIn) window.__ev.push({ t: performance.now(), type: 'enter', word: el.textContent, running: running() }); } }).observe(slot, { attributes: true, attributeOldValue: true, attributeFilter: ['class'], subtree: true });
  });
  const t0 = await p.evaluate(() => performance.now()); await toStm(p); await sleep(15500);
  const ev = await p.evaluate(() => window.__ev); const exits = ev.filter((e) => e.type === 'exit'); const enters = ev.filter((e) => e.type === 'enter');
  const gaps = exits.slice(1).map((e, i) => e.t - exits[i].t); const dev = Math.max(...gaps.map((g) => Math.abs(g - 2000)));
  ok(`transitions start every 2000 ms, measured start to start, without drift (${gaps.map(Math.round).join(', ')} ms)`, gaps.length >= 5 && dev < 45, `max deviation ${dev.toFixed(1)} ms`);
  ok(`first transition after the 1.8 s intro: ${Math.round(exits[0].t - t0)} ms after scrolling in`, exits[0].t - t0 > 3000 && exits[0].t - t0 < 3900);
  const order = exits.map((e) => e.word); ok('word order unchanged: broken → rewritten → exceeded → challenged → broken …', JSON.stringify(order.slice(0, 5)) === JSON.stringify(['broken', 'rewritten', 'exceeded', 'challenged', 'broken']), order.join(' → '));
  ok('no overlapping animations: when each exit starts, no letter animation is still running (the previous entrance has finished)', exits.every((e) => e.running === 0), exits.map((e) => e.running).join());
  ok('…and when each new word swaps in, the previous word\'s exit has finished (nothing running)', enters.slice(1).every((e) => e.running === 0), enters.map((e) => e.running).join());
  const swapGap = enters.slice(1).map((e, i) => e.t - exits[i].t); ok(`exit → swap ≈ 620 ms (${swapGap.map(Math.round).join(', ')})`, swapGap.length >= 4 && swapGap.every((g) => g > 590 && g < 680));
  // intro style preserved; rotating entrance uses the tightened stagger
  const st = await p.evaluate(() => { const w = [...document.querySelectorAll('#statement .stm-txt .stm-lw')]; const d = (el) => [...el.querySelectorAll('.stm-lt')].map((l) => parseFloat(l.style.getPropertyValue('--d'))); const x = (el) => [...el.querySelectorAll('.stm-lt')].map((l) => parseFloat(l.style.getPropertyValue('--x'))); return { d: d(w[3]), x: x(w[3]) }; });
  ok('transition style intact (same classes/easing); rotating letter staggers: entrance 30 ms, exit 16 ms', st.d.every((v, i) => i === 0 || Math.abs(v - st.d[i - 1] - 30) < 0.5) && st.x.every((v, i) => i === 0 || Math.abs(v - st.x[i - 1] - 16) < 0.5), JSON.stringify([st.d.slice(0, 3), st.x.slice(0, 3)]));
  const css = await p.evaluate(() => ({ inn: getComputedStyle(document.querySelector('#statement .stm-lw.in .stm-lt')).transitionTimingFunction, out: (() => { const e = document.querySelector('#statement .stm-lw.out .stm-lt'); return e ? getComputedStyle(e).transitionTimingFunction : null; })() }));
  ok('easing curves unchanged (springy entrance cubic-bezier(.34,1.56,.64,1))', /0\.34, 1\.56, 0\.64, 1/.test(css.inn), css.inn);
  await p.close();
}

// ───────── 3. layout unchanged vs the recorded baseline (the bar's removal must not shift the statement) ─────────
if (BASE && fs.existsSync(BASE)) {
  const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  for (const [name, vp] of [['1440x900', D], ['1280x720', { width: 1280, height: 720 }], ['390x844', M]]) {
    const p = await open(vp); await toStm(p); await sleep(6500);
    const now = await p.evaluate(() => { const sec = document.querySelector('#statement'); const sr = sec.getBoundingClientRect(); const rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - sr.left, r.top - sr.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }; return { section: [sr.width, sr.height].map((v) => Math.round(v * 10) / 10), txt: rel(document.querySelector('.stm-txt')), lines: [...document.querySelectorAll('.stm-ln')].map(rel), slot: rel(document.querySelector('.stm-slot')), fixed: [...document.querySelectorAll('.stm-txt .stm-w:not(.stm-lw)')].map(rel), fs: getComputedStyle(document.querySelector('.stm-txt')).fontSize, counter: rel(document.querySelector('.stm-count')) }; });
    const B = base[name]; const flat = (o) => JSON.stringify(o); const close = (a, c) => a.length === c.length && a.every((v, i) => Math.abs(v - c[i]) <= 0.2);
    ok(`${name}: statement geometry identical to before — section, text block, both lines, every fixed word and the font size (${now.fs})`, close(now.section, B.section) && close(now.txt, B.txt) && now.lines.every((l, i) => close(l, B.lines[i])) && now.fixed.every((f, i) => close(f, B.fixed[i])) && now.fs === B.fs && close(now.slot, B.slot), flat({ now: now.lines, was: B.lines }));
    ok(`${name}: the counter stays exactly where it was`, close(now.counter, B.counter), flat([now.counter, B.counter]));
    await p.close();
  }
}

// ───────── 4. no layout shift while words swap ─────────
{
  const p = await open(D); await toStm(p); const geo = []; const t0 = Date.now(); await sleep(2800);
  while (Date.now() - t0 < 11500) { geo.push(await p.evaluate(() => { const r = (e) => { const b2 = e.getBoundingClientRect(); return [b2.left, b2.top, b2.width, b2.height]; }; const lines = [...document.querySelectorAll('.stm-ln')]; const fx = [...document.querySelectorAll('.stm-txt .stm-w:not(.stm-lw)')]; return { l: lines.map(r), fx: fx.map(r), slot: r(document.querySelector('#statement .stm-txt .stm-slot')) }; })); await sleep(120); }
  const ref = geo[0]; const dv = Math.max(...geo.map((g) => Math.max(...g.l.flatMap((l, i) => l.map((v, k) => Math.abs(v - ref.l[i][k]))), ...g.fx.flatMap((l, i) => l.map((v, k) => Math.abs(v - ref.fx[i][k]))), ...g.slot.map((v, k) => Math.abs(v - ref.slot[k])))));
  ok(`no layout shift across ${geo.length} samples spanning several word swaps (max drift ${dv.toFixed(2)} px)`, dv <= 0.15); await p.close();
}

// ───────── 5. visibility, hidden tab, reduced motion, mobile ─────────
{
  const p = await open(D); await toStm(p); await sleep(5200); const during = await count(p);
  await p.evaluate(() => scrollTo(0, 0)); await sleep(1500); const off = await count(p); const w = await p.evaluate(() => document.querySelector('.stm-lw.in, .stm-lw.out')?.textContent); await sleep(4500); const off2 = await count(p);
  ok('visibility-based playback unchanged: rotating while in view; leaving the viewport resets to the static first word and stops', during !== '01 / 04' && off === '01 / 04' && off2 === '01 / 04' && w === 'broken', `${during} → ${off} → ${off2}`);
  await toStm(p); await sleep(300); const c0 = await count(p); let moved = null; const t1 = Date.now(); while (Date.now() - t1 < 6000) { await sleep(100); if ((await count(p)) !== c0) { moved = Date.now() - t1; break; } }
  ok(`re-entering replays the intro, first change ≈ 3.8 s (${moved} ms)`, moved > 3300 && moved < 4500);
  await sleep(500); const before = await count(p);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(5000); const hidden = await count(p);
  ok('hidden tab pauses the rotation in place', hidden === before, `${before} → ${hidden}`);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(3800); const after = await count(p);
  ok('visible again: rotation resumes (no burst of catch-up transitions)', after !== before, `${before} → ${after}`);
  const live = await p.evaluate(() => ({ h2: [...document.querySelectorAll('#statement h2')].map((h) => h.textContent), hidden: document.querySelector('#statement .contents').getAttribute('aria-hidden'), live: document.querySelectorAll('#statement [aria-live]').length }));
  ok('accessibility unchanged: one static sentence, animated copy hidden, no live region', live.h2.length === 1 && live.hidden === 'true' && live.live === 0); await p.close();
  const r = await open(D, true); await toStm(r); await sleep(7000);
  const rs = await r.evaluate(() => ({ count: !!document.querySelector('.stm-count'), cls: document.querySelector('.stm-txt').className, w: document.querySelector('.stm-lw.in')?.textContent, op: getComputedStyle(document.querySelector('.stm-lw.in .stm-lt')).opacity, txt: document.querySelector('.stm-txt').textContent }));
  ok('reduced motion unchanged: static readable statement, no rotation, no counter', !rs.count && rs.cls.includes('static') && rs.w === 'broken' && rs.op === '1' && /RMZ,/.test(rs.txt)); await r.close();
  const m = await open(M); await toStm(m, 0); await sleep(2800);
  const geo = await m.evaluate(() => ({ fs: parseFloat(getComputedStyle(document.querySelector('.stm-txt')).fontSize), ov: document.documentElement.scrollWidth > innerWidth, counter: document.querySelector('.stm-count')?.textContent.trim() }));
  let maxr = 0; const ts = Date.now(); let changes = []; let last = await count(m); while (Date.now() - ts < 9000) { await sleep(120); maxr = Math.max(maxr, await m.evaluate(() => Math.max(...[...document.querySelectorAll('.stm-lw .stm-lt')].map((e) => e.getBoundingClientRect().right)))); const c = await count(m); if (c !== last) { changes.push(Date.now() - ts); last = c; } }
  const mg = changes.slice(1).map((v, i) => v - changes[i]);
  ok('mobile 390: type ≥ 36px, no overflow, even "challenged" fits, counter present, 2 s rotation', geo.fs >= 36 && !geo.ov && maxr <= 390.5 && /^0\d \/ 04$/.test(geo.counter) && mg.length >= 2 && mg.every((g) => g > 1750 && g < 2300), `${geo.fs}px, max right ${Math.round(maxr)}, gaps ${mg.join(',')}`);
  ok('mobile: no page errors', m.errs.length === 0, m.errs.join('|')); await m.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
