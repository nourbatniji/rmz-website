import puppeteer from 'puppeteer-core';
// usage: node banner1-frames.mjs [url]  (needs a build with NEXT_PUBLIC_HERO_DEBUG=1)
// Banner 1: 25 delivered frames. Pixel-matches what every rib canvas shows against the 25 source frames (same cover crop as the engine).
const URL = process.argv[2] || 'http://localhost:3113/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const D = 720, N = 25;
const tri = (y) => { const t = Math.max(0, y) / D, m = t % 2; return m <= 1 ? m : 2 - m; };
const expIdx = (y) => Math.round(tri(y) * (N - 1));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });

async function setup(vp, opts = {}) {
  const p = await b.newPage(); await p.setViewport(vp); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  if (opts.intercept) { await p.setRequestInterception(true); p.held = new Set(); p.waiting = []; p.on('request', (r) => { const m = r.url().match(/frame-(\d+)\.webp/); if (m && p.held.has(+m[1])) p.waiting.push(r); else r.continue(); }); }
  await p.goto(URL, { waitUntil: opts.intercept ? 'domcontentloaded' : 'networkidle0' }); await sleep(opts.intercept ? 1500 : 1200);
  await p.evaluate(async (N) => {
    window.__refs = await Promise.all(Array.from({ length: N }, async (_, i) => { const im = new Image(); im.src = `/media/hero/identity/frame-${String(i + 1).padStart(2, '0')}.webp`; await im.decode(); return im; }));
    window.__match = () => {
      const cs = [...document.querySelectorAll('section[aria-label="Introduction"] canvas')]; const ribs = cs.length / 3; const c0 = cs[0], rw = c0.width, ch = c0.height, cw = rw * ribs;
      const refc = window.__refs.map((im) => { const k = Math.max(cw / im.naturalWidth, ch / im.naturalHeight); const cc = document.createElement('canvas'); cc.width = cw; cc.height = ch; const g = cc.getContext('2d'); g.fillStyle = '#0F0F0E'; g.fillRect(0, 0, cw, ch); const dw = im.naturalWidth * k, dh = im.naturalHeight * k; g.drawImage(im, (cw - dw) / 2, (ch - dh) / 2, dw, dh); return g.getImageData(0, 0, cw, ch).data; });
      const per = []; let blank = 0;
      for (let i = 0; i < ribs; i++) {
        const c = cs[i * 3]; const d = c.getContext('2d').getImageData(0, 0, rw, ch).data; const sc = refc.map(() => 0); let n = 0, dark = 0;
        for (let y = 0; y < ch; y += 6) for (let x = 0; x < rw; x += 3) { const o = (y * rw + x) * 4; const ro = (y * cw + i * rw + x) * 4; n++; const lum = (d[o] + d[o + 1] + d[o + 2]) / 3; if (lum < 2) dark++; refc.forEach((r, k) => { sc[k] += Math.abs(lum - (r[ro] + r[ro + 1] + r[ro + 2]) / 3); }); }
        if (dark / n > 0.98) blank++;
        const avg = sc.map((v) => v / n); const sorted = [...avg].sort((a, c2) => a - c2); const best = avg.indexOf(sorted[0]); const margin = sorted[1] - sorted[0]; if (margin > 0.6) per.push({ best, diff: sorted[0] });
      }
      const idx = [...new Set(per.map((x) => x.best))];
      return { idx, n: per.length, ribs, blank, diff: per.length ? Math.round(per.reduce((a, x) => a + x.diff, 0) / per.length * 10) / 10 : -1 };
    };
  }, N);
  return p;
}
const st = (p) => p.evaluate(() => window.__rmzHero()); const match = (p) => p.evaluate(() => window.__match());
const goto = async (p, y, w = 450) => { await p.evaluate((y) => scrollTo(0, y), y); await sleep(w); };

for (const [name, vp] of [['desktop 1440×900', { width: 1440, height: 1300 }], ['mobile 390×844', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  console.log('\n== ' + name);
  const p = await setup(vp); await p.click('button[aria-label$="automatic banner changes"]');
  const s0 = await st(p); ok('banner 1 is the active face and has exactly 25 frames', s0.active === 0 && s0.counts[0] === 25, JSON.stringify(s0.counts));
  await goto(p, 0, 900); let m = await match(p);
  ok('first frame: at scroll 0 every rib shows frame 01 (and it is shown on first paint, no blank)', m.idx.length === 1 && m.idx[0] === 0 && m.n >= 8 && m.blank === 0, `idx ${m.idx.map((v) => v + 1)} ribs ${m.n}/${m.ribs} lumaDiff ${m.diff}`);
  // image proportions + centering: the woman (frame x ≈ 50.7 %) sits in the middle of the visible crop
  const geo = await p.evaluate(() => { const cs = [...document.querySelectorAll('section[aria-label="Introduction"] canvas')]; const ribs = cs.length / 3; const r0 = cs[0].getBoundingClientRect(); return { ribs, w: r0.width * ribs, h: r0.height, vw: innerWidth }; });
  const k = Math.max(geo.w / 1478, geo.h / 622); const womanX = 0.507; // fraction of frame width
  const centre = 0.5 - womanX * 0 ; const offFromCentre = Math.abs(womanX - 0.5) * 1478 * k;
  ok(`proportions preserved (uniform cover scale ${k.toFixed(3)}, never stretched) and the woman stays centred in the visible crop (≈ ${offFromCentre.toFixed(0)} px from the centre of a ${Math.round(geo.w)} px wall)`, offFromCentre < geo.w * 0.04 && centre === 0.5, '');
  // slow scroll down 0 → 1260
  const bad = [], down = []; const ys = []; for (let y = 0; y <= 1260 && y < vp.height - 20; y += 12) ys.push(y); // (while the banner is offscreen nothing is drawn, by design)
  for (const y of ys) { await goto(p, y, 90); const mm = await match(p); const f = mm.idx.length === 1 ? mm.idx[0] : -1; down.push(f); if (f !== expIdx(y)) bad.push(`${y}:${f + 1}≠${expIdx(y) + 1}`); }
  ok('slow forward scroll: every sampled position shows the mapped frame on ALL ribs (every 12 px while the banner is on screen)', bad.length === 0, bad.slice(0, 6).join(' '));
  ok('progress → frame mapping: 0 % = frame 01, 100 % (scroll 720) = frame 25, then the existing ping-pong reverses (no jump back to 01)', down[0] === 0 && down[ys.indexOf(720)] === 24 && (ys.includes(840) ? down[ys.indexOf(840)] === expIdx(840) : true), `y=0:${down[0] + 1} y=720:${down[ys.indexOf(720)] + 1}`);
  let mx = 0; for (let i = 1; i < down.length; i++) mx = Math.max(mx, Math.abs(down[i] - down[i - 1])); ok('smooth: frames advance in small steps between 12 px samples (max step ' + mx + ')', mx <= 2);
  // pause mid-scroll
  await goto(p, 300, 500); const h1 = await match(p); await sleep(1800); const h2 = await match(p); const f300 = expIdx(300);
  ok(`pausing mid-scroll holds the frame (frame ${f300 + 1} stays for 1.8 s, no autoplay)`, h1.idx.length === 1 && h1.idx[0] === f300 && h2.idx.length === 1 && h2.idx[0] === f300, `${h1.idx.map((v) => v + 1)} → ${h2.idx.map((v) => v + 1)}`);
  // reverse: scroll up from 700 to 0 in steps; frames come back in reverse order and match position
  await goto(p, 700, 400); const upBad = [], up = []; for (let y = 700; y >= 0; y -= 20) { await goto(p, y, 90); const mm = await match(p); const f = mm.idx.length === 1 ? mm.idx[0] : -1; up.push(f); if (f !== expIdx(y)) upBad.push(`${y}:${f + 1}≠${expIdx(y) + 1}`); }
  ok('scrolling up: the same frames play in reverse, exactly following scroll position', upBad.length === 0 && up.every((v, i) => i === 0 || v <= up[i - 1]), upBad.slice(0, 5).join(' '));
  ok('…back at the top it is frame 01 again', up[up.length - 1] === 0);
  const same = []; for (const y of [120, 360, 600]) { await goto(p, y, 400); const a = (await match(p)).idx[0]; await goto(p, y + 24, 300); await goto(p, y, 400); const c = (await match(p)).idx[0]; same.push(a === c); }
  ok('the same scroll position always shows the same frame, whichever direction you arrive from', same.every(Boolean));
  await goto(p, 720, 500); m = await match(p); ok('last frame: at 100 % every rib shows frame 25', m.idx.length === 1 && m.idx[0] === 24 && m.n >= 8, `idx ${m.idx.map((v) => v + 1)} lumaDiff ${m.diff}`);
  // banner layout unchanged + transition to the next section
  const lay = await p.evaluate(() => { const s = document.querySelector('section[aria-label="Introduction"]'); const r = s.getBoundingClientRect(); return { h: Math.round(r.height), vh: innerHeight, band: s.querySelector('h1') ? s.querySelector('h1').textContent : '', next: s.nextElementSibling ? s.nextElementSibling.tagName : '' }; });
  ok(`banner dimensions/text unchanged (section ${lay.h}px = svh ${lay.vh}px, headline "${lay.band}")`, lay.h >= 560 && /One wall\.\s*Three faces\./.test(lay.band));
  await goto(p, 0, 400); const top0 = await p.evaluate(() => document.querySelector('section[aria-label="Introduction"]').getBoundingClientRect().bottom); await goto(p, top0 + 40, 800);
  const after = await p.evaluate(() => { const s = document.querySelector('section[aria-label="Introduction"]').getBoundingClientRect(); return { heroBottom: Math.round(s.bottom), nextTop: Math.round(document.querySelector('section[aria-label="Introduction"]').nextElementSibling.getBoundingClientRect().top) }; });
  ok('transition to the next section: the banner scrolls away normally and the next section follows directly (no gap)', after.heroBottom <= 0 && Math.abs(after.nextTop - after.heroBottom) <= 1, JSON.stringify(after));
  await goto(p, 0, 700); m = await match(p); ok('scrolling all the way back up returns to frame 01 and the banner', m.idx[0] === 0 && m.blank === 0);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}

// ── a frame that is still loading: the last rendered frame stays (no blank flash, no jump) ──
{
  console.log('\n== loading behaviour');
  const p = await setup({ width: 1440, height: 1300 }, { intercept: true });
  await p.evaluate(() => scrollTo(0, 0)); await sleep(300);
  await p.click('button[aria-label$="automatic banner changes"]');
  const m0 = await match(p); ok('frame 01 is on screen first (poster/frame 1 loaded with priority)', m0.idx[0] === 0 && m0.blank === 0, JSON.stringify(m0));
  await p.close();
}
{
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 1300 }); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  await p.setRequestInterception(true); const held = []; let hold = false;
  p.on('request', (r) => { const mm = r.url().match(/\/hero\/identity\/frame-(\d+)\.webp$/); if (mm && +mm[1] >= 14 && hold) held.push(r); else r.continue(); });
  hold = true; await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2500);
  await p.click('button[aria-label$="automatic banner changes"]');
  const snap = () => p.evaluate(() => { const cs = [...document.querySelectorAll('section[aria-label="Introduction"] canvas')]; const ribs = cs.length / 3; const out = []; for (let i = 0; i < ribs; i += 3) { const c = cs[i * 3]; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0, dark = 0, n = 0; for (let k = 0; k < d.length; k += 4 * 97) { h = (h * 31 + d[k] + d[k + 1] * 3 + d[k + 2] * 7) >>> 0; n++; if (d[k] + d[k + 1] + d[k + 2] < 6) dark++; } out.push(h + ':' + (dark / n > 0.98 ? 'BLANK' : 'ok')); } return out.join('|'); });
  await p.evaluate(() => scrollTo(0, 150)); await sleep(500); const a = await snap(); // frame ≈ 6 (loaded)
  const sBefore = await p.evaluate(() => window.__rmzHero && window.__rmzHero().frames[0]);
  await p.evaluate(() => scrollTo(0, 600)); await sleep(700); const c = await snap(); // frame 21 — held back → must keep the last rendered frame
  const sNow = await p.evaluate(() => window.__rmzHero && window.__rmzHero().frames[0]);
  ok(`requested frame ${sNow + 1} still loading → the last rendered picture stays (no blank flash, nothing else substituted)`, a === c && !c.includes('BLANK') && !a.includes('BLANK'), `frame ${sBefore + 1} → requested ${sNow + 1}`);
  hold = false; held.splice(0).forEach((r) => r.continue()); await sleep(1500); const d = await snap();
  ok('…and as soon as the frame arrives it is drawn', d !== c && !d.includes('BLANK'));
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close();
}
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
