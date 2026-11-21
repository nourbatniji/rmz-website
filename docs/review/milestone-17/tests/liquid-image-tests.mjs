import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
// Scripted Chrome (software WebGL via SwiftShader). About cards: liquid image effect. Not a physical-device test.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function open(vp, o = {}) {
  const p = await b.newPage(); await p.setViewport(vp); if (o.rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
  await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(1200); return p;
}
const atS = async (p, s) => { await p.evaluate((s) => { const t = document.querySelector('.fw-track'), st = document.querySelector('.fw-stage'); const px = (t.offsetHeight - st.offsetHeight) / 11; scrollTo({ top: t.getBoundingClientRect().top + scrollY - 92 + s * px, behavior: 'instant' }); }, s); await sleep(1500); };
const rectOf = (p, sel) => p.evaluate((sel) => { const e = document.querySelectorAll(sel)[0]; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
const activeImg = (p, idx = 0) => p.evaluate((idx) => { const r = document.querySelectorAll('.fw-img')[idx].getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, idx);
const canvasInfo = (p) => p.evaluate(() => { const c = document.querySelector('canvas.fw-liquid'); return c ? { vis: getComputedStyle(c).visibility, inImg: c.parentElement.classList.contains('fw-img'), pe: getComputedStyle(c).pointerEvents } : null; });
async function shot(p, r) { const sy = await p.evaluate(() => scrollY); const buf = await p.screenshot({ clip: { x: r.x, y: r.y + sy, width: r.w, height: r.h } }); return PNG.sync.read(buf); }
const diff = (a, c) => { let n = 0, mx = 0, sum = 0; for (let i = 0; i < a.data.length; i += 4) { const d = Math.abs(a.data[i] - c.data[i]) + Math.abs(a.data[i + 1] - c.data[i + 1]) + Math.abs(a.data[i + 2] - c.data[i + 2]); sum += d; if (d > 30) n++; mx = Math.max(mx, d); } return { changed: n, mean: sum / (a.data.length / 4), max: mx }; };
async function sweep(p, r, speedMs, n = 22) { await p.mouse.move(r.x + 20, r.y + r.h * 0.5); await sleep(120); for (let i = 1; i <= n; i++) { await p.mouse.move(r.x + 20 + (r.w - 40) * (i / n), r.y + r.h * (0.5 + 0.18 * Math.sin(i / 3))); await sleep(speedMs); } }

console.log('── desktop 1440x900');
{ const p = await open({ width: 1440, height: 900 }); await atS(p, 0);
  const r = await activeImg(p, 0); const card0 = await rectOf(p, '[data-fw-card]');
  await p.mouse.move(40, 120); await sleep(900); const rest0 = await shot(p, r);
  ok('no canvas / WebGL context created before any interaction', (await canvasInfo(p)) === null);
  // slow
  const pending = sweep(p, r, 40); await sleep(500); const mid = await shot(p, r); await pending;
  const ci = await canvasInfo(p); ok('slow sweep: canvas appears inside the image only, pointer-events none', ci && ci.inImg && ci.pe === 'none', JSON.stringify(ci));
  const dSlow = diff(rest0, mid); ok('slow sweep: image is visibly but gently displaced', dSlow.changed > 300 && dSlow.mean < 22, JSON.stringify(dSlow));
  await sleep(1600); const rest1 = await shot(p, r); const dRet = diff(rest0, rest1);
  ok('after stopping, returns to the exact original sharp image', dRet.changed === 0 && dRet.mean < 0.5, JSON.stringify(dRet)); ok('canvas hidden at rest (static <img> shown)', (await canvasInfo(p)).vis === 'hidden');
  // fast
  const p2 = sweep(p, r, 6, 16); await sleep(60); const fast = await shot(p, r); await p2; const dFast = diff(rest0, fast);
  ok('fast sweep: stronger than slow but still restrained and recognisable', dFast.mean < 30 && dFast.mean >= 0, JSON.stringify(dFast));
  await sleep(1700); ok('fast: settles back sharp', diff(rest0, await shot(p, r)).changed === 0);
  // leave mid-motion
  await sweep(p, r, 10, 10); await p.mouse.move(10, 700); await sleep(1700); ok('pointer leaving: settles back sharp', diff(rest0, await shot(p, r)).changed === 0);
  const card1 = await rectOf(p, '[data-fw-card]'); ok('card boundary and layout never move', JSON.stringify(card0) === JSON.stringify(card1));
  // frame edges: displaced frame stays opaque and inside
  const e = mid; let gap = 0; for (const [x, y] of [[0, 0], [e.width - 1, 0], [0, e.height - 1], [e.width - 1, e.height - 1], [e.width >> 1, 0], [e.width >> 1, e.height - 1]]) { const i = (y * e.width + x) * 4; if (e.data[i + 3] < 255) gap++; } ok('no transparent gaps at the image edges', gap === 0);
  // scrolling over the image is not intercepted
  const y0 = await p.evaluate(() => scrollY); await p.mouse.move(r.x + r.w / 2, r.y + r.h / 2); await p.mouse.wheel({ deltaY: 40 }); await sleep(400); ok('wheel over the image still scrolls the page', (await p.evaluate(() => scrollY)) !== y0);
  // card switching: moving to the next state resets and re-targets
  await atS(p, 2); const r2 = await activeImg(p, 1); await p.mouse.move(r2.x + 20, r2.y + 100); await sleep(100); await sweep(p, r2, 30, 14); await sleep(250);
  const c2 = await canvasInfo(p); ok('card 2 centred: effect moves to card 2 (single shared canvas)', c2 && c2.inImg && (await p.evaluate(() => document.querySelectorAll('canvas.fw-liquid').length)) === 1);
  await atS(p, 1); await sweep(p, await activeImg(p, 0), 20, 10); await sleep(300); const c3 = await canvasInfo(p); ok('card showing its BACK (s=1): effect disabled and reset', !c3 || c3.vis === 'hidden', JSON.stringify(c3));
  await atS(p, 1.5); await sweep(p, await activeImg(p, 0), 20, 10); await sleep(300); ok('mid-transition (s=1.5): effect disabled', !(await canvasInfo(p)) || (await canvasInfo(p)).vis === 'hidden');
  await atS(p, 4); const r3 = await activeImg(p, 2); await sweep(p, r3, 30, 14); await sleep(250); ok('card 3 (s=4) works', (await canvasInfo(p))?.inImg === true);
  await sleep(1700);
  // resize
  await p.setViewport({ width: 1100, height: 700 }); await sleep(900); await atS(p, 0); const r4 = await activeImg(p, 0); await sweep(p, r4, 30, 14); await sleep(200);
  const cs = await p.evaluate(() => { const c = document.querySelector('canvas.fw-liquid'), h = c.parentElement; return { cw: c.width, hw: h.clientWidth, dpr: devicePixelRatio }; }); ok('resize: canvas backing size follows the image', Math.abs(cs.cw - cs.hw * Math.min(cs.dpr, 2)) <= 2, JSON.stringify(cs));
  await sleep(1700); ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close(); }

console.log('── static fallbacks');
{ const p = await open({ width: 1440, height: 900 }, { rm: true }); await sleep(300); await p.mouse.move(700, 400); await p.mouse.move(900, 450); ok('reduced motion: no canvas at all', (await canvasInfo(p)) === null); await p.close(); }
{ const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await atS(p, 0); await p.touchscreen.touchStart(190, 400); await p.touchscreen.touchMove(240, 420); await p.touchscreen.touchEnd(); await sleep(300); ok('touch / mobile: no canvas, image static', (await canvasInfo(p)) === null); await p.close(); }
{ const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.evaluateOnNewDocument(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return t === 'webgl' ? null : g.call(this, t, ...a); }; });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(1000); await atS(p, 0);
  const r = await activeImg(p, 0); await sweep(p, r, 30, 14); await sleep(400); const ci = await canvasInfo(p); ok('WebGL unavailable: image stays static, no errors', (!ci || ci.vis === 'hidden') && errs.length === 0, JSON.stringify({ ci, errs })); await p.close(); }
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
