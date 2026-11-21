import puppeteer from 'puppeteer-core';
// Scripted Chrome (real CDP wheel input). About / featured-work focus: whole-section wheel navigation once the stage is aligned.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 600 }, { width: 1920, height: 1080 }]) {
  console.log(`\n── ${vp.width}x${vp.height}`);
  const p = await b.newPage(); await p.setViewport(vp); await p.goto('http://localhost:3111/', { waitUntil: 'networkidle0' }); await sleep(1200);
  const info = () => p.evaluate(() => { const st = document.querySelector('.fw-stage').getBoundingClientRect(), tr = document.querySelector('.fw-track'); return { y: scrollY, top: st.top, bottom: st.bottom, T: tr.getBoundingClientRect().top + scrollY, dwell: tr.offsetHeight - st.height, hh: Math.max(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')), document.querySelector('header').getBoundingClientRect().bottom), vh: innerHeight }; });
  const step = () => p.evaluate(() => document.querySelector('.fw-step').textContent.trim());
  const goTo = async (y) => { await p.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await sleep(300); };
  const wheel = async (x, y, d, n, k = 1, gap = 16) => { await p.mouse.move(x, y); let v = d; for (let i = 0; i < n; i++) { await p.mouse.wheel({ deltaY: v }); v *= k; await sleep(gap); } };
  const a0 = async () => { const g = await info(); return g.T - g.hh; };
  let g = await info(); ok('short dwell (≤ 0.3 × stage)', g.dwell > 100 && g.dwell <= 0.3 * (g.vh - g.hh) + 5, `dwell=${g.dwell}`);
  // approach: stage 160px low, pointer in the middle of the cards → page scrolls, no step
  await goTo((await a0()) - 160); let y0 = (await info()).y; await wheel(vp.width / 2, vp.height / 2, 60, 3); await sleep(900);
  ok('approach: wheel moves the page', (await info()).y > y0 + 100); ok('approach: no flip', (await step()) === '01 / 12', await step());
  // aligned, pointer on EMPTY areas far from the cards (left margin; heading band) still drives the cards
  for (const [label, x, y] of [['left margin', 30, vp.height - 40], ['top band', vp.width / 2, g.hh + 20], ['right margin', vp.width - 20, vp.height / 2]]) {
    await goTo((await a0()) + 30); const s0 = await step(); const y1 = (await info()).y; await wheel(x, y, 60, 2); await sleep(1100);
    const s1 = await step(); ok(`aligned, pointer on ${label}: wheel advances`, s1 !== s0, `${s0} → ${s1}`); ok('  page did not move', Math.abs((await info()).y - y1) <= 1);
    await sleep(500); await wheel(x, y, -60, 2); await sleep(1100);
  }
  const al = await info(); ok('aligned geometry', Math.abs(al.top - al.hh) <= 1 && al.bottom <= al.vh + 1, JSON.stringify(al));
  // end: all 12 states then release
  await goTo((await a0()) + 30); for (let i = 0; i < 11; i++) { await wheel(vp.width / 2, vp.height / 2, 60, 2); await sleep(1000); }
  ok('reached last state', (await step()) === '12 / 12', await step()); const ye = (await info()).y; await sleep(400); await wheel(vp.width / 2, vp.height / 2, 60, 4); await sleep(900);
  ok('last: wheel releases to the page', (await info()).y > ye + 60);
  await goTo((await a0()) + 30); for (let i = 0; i < 11; i++) { await wheel(vp.width / 2, vp.height / 2, -60, 2); await sleep(1000); }
  ok('back at first state', (await step()) === '01 / 12', await step()); const yf = (await info()).y; await sleep(400); await wheel(vp.width / 2, vp.height / 2, -60, 4); await sleep(900);
  ok('first: wheel up releases to the page', (await info()).y < yf - 60);
  // momentum ending inside the aligned zone must not step
  await goTo((await a0()) - 600); await sleep(300); await wheel(vp.width / 2, vp.height / 2, 36.7, 70, 0.95, 16); await sleep(150);
  ok('momentum approach rests aligned', Math.abs((await info()).top - (await info()).hh) <= 1); ok('momentum tail does not flip', (await step()) === '01 / 12', await step());
  await sleep(900); await wheel(vp.width / 2, vp.height / 2, 60, 2); await sleep(1000); ok('fresh gesture afterwards flips', (await step()) === '02 / 12', await step());
  await p.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
