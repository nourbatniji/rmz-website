import puppeteer from 'puppeteer-core';
// usage: node record-liquid-image.mjs <outdir> — close-up recording (software WebGL). A dot marks the pointer (headless Chrome draws no cursor).
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(1200);
await p.evaluate(() => { const t = document.querySelector('.fw-track'); scrollTo({ top: t.getBoundingClientRect().top + scrollY - 92, behavior: 'instant' });
  const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:2px solid #fff;background:rgba(255,202,38,.55);pointer-events:none;z-index:99999;mix-blend-mode:normal'; document.body.appendChild(d);
  addEventListener('pointermove', (e) => { d.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true }); }); await sleep(1500);
const r = await p.evaluate(() => { const e = document.querySelector('.fw-img').getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width, h: e.height }; });
console.log(JSON.stringify(r));
const mv = async (x, y, ms, n = 20) => { const s = await p.evaluate(() => 0); for (let i = 1; i <= n; i++) { await p.mouse.move(x(i / n), y(i / n)); await sleep(ms); } };
const rec = await p.screencast({ path: `${out}/liquid-image-raw.mp4`, fps: 20 });
await p.mouse.move(r.x - 80, r.y + 60); await sleep(1200);                                                     // rest: sharp original
await p.mouse.move(r.x + 30, r.y + r.h * 0.5);
await mv((t) => r.x + 30 + (r.w - 60) * t, (t) => r.y + r.h * (0.5 + 0.2 * Math.sin(t * 6)), 45, 24); await sleep(1800);   // slow sweep, then stop: settles
await mv((t) => r.x + r.w - 30 - (r.w - 60) * t, (t) => r.y + r.h * (0.3 + 0.4 * t), 10, 14); await sleep(1800);   // fast sweep, then stop
await mv((t) => r.x + r.w * 0.5 + 90 * Math.cos(t * 9), (t) => r.y + r.h * 0.45 + 90 * Math.sin(t * 9), 22, 30); await p.mouse.move(r.x - 120, r.y + r.h + 40); await sleep(1800); // swirl, then leave
await p.evaluate(() => { const t = document.querySelector('.fw-track'), st = document.querySelector('.fw-stage'); const px = (t.offsetHeight - st.offsetHeight) / 11; scrollTo({ top: t.getBoundingClientRect().top + scrollY - 92 + 4 * px, behavior: 'instant' }); }); await sleep(1500);  // switch to card 3
const r3 = await p.evaluate(() => { const e = document.querySelectorAll('.fw-img')[2].getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width, h: e.height }; });
await p.mouse.move(r3.x + 30, r3.y + r3.h * 0.4); await mv((t) => r3.x + 30 + (r3.w - 60) * t, (t) => r3.y + r3.h * (0.4 + 0.25 * Math.sin(t * 5)), 30, 24); await sleep(1800);
await rec.stop(); await b.close();
