import puppeteer from 'puppeteer-core';
// usage: node hero-opening-tests.mjs — ONE focused run for the "world comes alive" opening (production preview, port 3111). Frames are read from the section's data-hw-frame.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const URL = 'http://localhost:3111/lab/hero-three-worlds';
const fr = (p) => p.screenshot({ type: 'jpeg', quality: 10 }).catch(() => {});
const st = (p) => p.evaluate(() => { const r = document.querySelector('.hw-root'); return { f: +r.dataset.hwFrame, open: r.dataset.open, y: scrollY, c: document.body.innerText.match(/0\d \/ 03/)?.[0], ph: [...document.querySelectorAll('.hw-phrase')].map((x) => x.dataset.state).join() }; });
const scrollTo = async (p, y) => { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await fr(p); await sleep(120); await fr(p); return st(p); };
{ // 1 + 2: playback, hold, forward/reverse after the handoff
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument(() => { window.__f = []; const t = setInterval(() => { const r = document.querySelector('.hw-root'); if (r) window.__f.push([Math.round(performance.now()), r.dataset.open, +r.dataset.hwFrame]); }, 16); });
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); let s0 = Date.now(); while (Date.now() - s0 < 3200) { await fr(p); await sleep(30); }
  const F = await p.evaluate(() => window.__f); const run = F.filter((x) => x[1] === 'running'); const fs = run.map((x) => x[2]);
  ok('plays frames in original order (never backwards)', fs.every((v, i) => i === 0 || v >= fs[i - 1]), fs.join());
  ok('plays frame 0 → 18 (frames 1–19 of 25)', fs[0] <= 1 && Math.max(...fs) === 18, `${fs[0]}..${Math.max(...fs)}`);
  const t18 = run.find((x) => x[2] === 18)?.[0], t0 = run[0][0];
  ok('scene motion ≈1.0–1.4 s (headless frame cadence)', t18 - t0 >= 900 && t18 - t0 <= 1500, `${t18 - t0} ms`);
  const e = await st(p); ok('holds the last frame (18) after playback, until the user scrolls', e.f === 18 && e.y === 0 && e.open === 'done', JSON.stringify(e));
  const a = await scrollTo(p, 30), c = await scrollTo(p, 90), d = await scrollTo(p, 150);
  ok('first scroll continues forward from frame 18 (no reset to 0, no jump)', a.f >= 18 && a.f <= 20 && c.f > a.f && d.f >= c.f, JSON.stringify([a.f, c.f, d.f]));
  const top = await scrollTo(p, 0); ok('back at the top the hero shows the same held frame (18) — deterministic, no jump to 0', top.f === 18, `${top.f}`);
  const far = []; for (const y of [150, 300, 500, 720, 900, 1200]) far.push((await scrollTo(p, y)).f);
  ok('normal range & reverse behaviour preserved after the handoff (approaches the end frame, turns back, goes on)', Math.max(...far) >= 23 && far.some((v, i) => i && v < far[i - 1]) && far.at(-1) < 24, far.join());
  await p.close();
}
{ // 3: scroll during the opening
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(URL, { waitUntil: 'domcontentloaded' }); await p.mouse.move(700, 500);
  let s; for (let i = 0; i < 120; i++) { await fr(p); s = await st(p); if (s.open === 'running' && s.f >= 7) break; await sleep(15); }
  await p.mouse.wheel({ deltaY: 40 }); await p.evaluate(() => scrollBy(0, 40)); await fr(p); await sleep(100); await fr(p); const a = await st(p); await sleep(700); await fr(p); const b2 = await st(p);
  ok('scroll mid-opening stops automatic playback at once and keeps the displayed frame (not 0, not continuing to 18)', a.open === 'done' && a.f >= 7 && a.f <= 10 && b2.f === a.f && b2.y > 0, JSON.stringify([s.f, a, b2.f]));
  await p.evaluate(() => scrollBy(0, 60)); await fr(p); await sleep(100); await fr(p); const c = await st(p);
  ok('…and scrolling carries on forward from that frame', c.f > a.f, JSON.stringify([a.f, c.f]));
  await p.close();
}
{ // 4: banner selection mid-opening, then the next regular transition
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  let s; for (let i = 0; i < 120; i++) { await fr(p); s = await st(p); if (s.open === 'running' && s.f >= 5) break; await sleep(15); }
  await p.evaluate(() => [...document.querySelectorAll('[aria-label="Banners"] button')].find((x) => /campaign/i.test(x.textContent)).click());
  await sleep(2600); await fr(p); const a = await st(p); const txt = await p.evaluate(() => document.querySelector('.hw-phrase[data-state=active]').textContent);
  ok('selection mid-opening is honoured immediately (campaign banner + phrase, 02 / 03)', a.ph === 'idle,active,idle' && a.c === '02 / 03' && /IMPOSSIBLE/.test(txt), JSON.stringify(a));
  const t0 = Date.now(); let got = null; while (Date.now() - t0 < 9000) { await fr(p); const x = await st(p); if (x.c === '03 / 03') { got = Date.now() - t0; break; } await sleep(60); }
  ok('regular 5 s countdown runs after the interruption → next regular transition (03 / 03, digital phrase)', got !== null && got > 3000 && got < 8200, `${got} ms`);
  await sleep(2400); await fr(p); ok('…with the correct phrase', /BEYOND THE/.test(await p.evaluate(() => document.querySelector('.hw-phrase[data-state=active]').textContent)));
  await p.close();
}
{ // skips & reduced motion (one pass each)
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(3200); await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(900); await fr(p);
  const s = await st(p); ok('second entry in the same tab: skipped (normal hero at frame 0)', s.open === 'done' && s.f === 0, JSON.stringify(s)); await p.close();
  const r = await b.newPage(); await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await r.setViewport({ width: 1440, height: 900 }); await r.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(900); await fr(r);
  const t = await st(r); ok('reduced motion: static hero at once (frame 0, done)', t.open === 'done' && t.f === 0, JSON.stringify(t)); await r.close();
  const q = await b.newPage(); await q.setViewport({ width: 1440, height: 900 }); await q.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(3000); await fr(q);
  await q.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Replay/.test(x.textContent)).click()); const seen = new Set(); const t0 = Date.now(); while (Date.now() - t0 < 2600) { await fr(q); const x = await st(q); seen.add(x.open + ':' + x.f); await sleep(40); }
  const fin = await st(q); ok('Replay resets the controller and plays again from frame 0 to 18', [...seen].some((v) => /^running:[0-2]$/.test(v)) && fin.f === 18 && fin.open === 'done', JSON.stringify(fin));
  await q.close();
}
await b.close(); console.log(`${pass}/${pass + fail} passed`);
