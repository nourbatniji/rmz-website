import puppeteer from 'puppeteer-core';
// Homepage integration checks for the orbital Services section (real homepage, real content source). Scripted Chrome; run against the production preview on :3111.
const U = 'http://localhost:3111/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, tot = 0; const ok = (n, x, i = '') => { tot++; if (x) pass++; console.log(x ? 'PASS' : 'FAIL', n, i); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] });
const HOLD = 0.6, RISE = 0.36, TRAVEL = 0.62, N = 7; const Q = HOLD + 6 * (2 * RISE + TRAVEL + HOLD);
const holdStart = (k) => (k === 0 ? 0 : HOLD + (k - 1) * (2 * RISE + TRAVEL + HOLD) + RISE + TRAVEL + RISE);
const frame = (p) => p.screenshot({ type: 'jpeg', quality: 10 });
async function open(vp, o = {}, hash = '') { const p = await b.newPage(); await p.bringToFront(); await p.setViewport(vp); if (o.rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); if (o.nojs) await p.setJavaScriptEnabled(false); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(U + hash, { waitUntil: 'networkidle0' }); await sleep(1000); return p; }
const geo = (p) => p.evaluate(() => { const t = document.querySelector('#services .orb-track'), s = document.querySelector('#services .orb-stage'); const cs = getComputedStyle(document.documentElement); return t ? { top: t.getBoundingClientRect().top + scrollY, h: t.offsetHeight, sh: s.offsetHeight, hh: parseFloat(cs.getPropertyValue('--header-h')) } : null; });
const atQ = async (p, q) => { const g = await geo(p); await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g.top - g.hh + (q / Q) * (g.h - g.sh)); await frame(p); await sleep(850); await frame(p); await sleep(100); };
const snap = (p) => p.evaluate(() => { const sec = document.querySelector('#services'); const r = (e) => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; }; const lens = sec.querySelector('[data-orb-lens]').getBoundingClientRect(); const hit = [...sec.querySelectorAll('button[data-orb-label]')]; const texts = [...sec.querySelectorAll('svg.orb-arcs text')].map((t) => ({ txt: t.textContent, op: +t.getAttribute('opacity'), fs: +t.getAttribute('font-size'), wt: +t.style.fontWeight, r: r(t) })); return { lensW: lens.width, lensCx: (lens.left + lens.right) / 2, sel: hit.findIndex((h) => h.getAttribute('aria-pressed') === 'true'), desc: [...sec.querySelectorAll('.orb-d')].findIndex((d) => d.dataset.on === '1'), stage: r(sec.querySelector('.orb-stage')), texts, hit: hit.map((h) => { const q = h.getBoundingClientRect(); return { cx: (q.left + q.right) / 2, cy: (q.top + q.bottom) / 2, text: h.textContent }; }), vw: innerWidth }; });
const lifted = (s) => s.texts.filter((t) => t.op > 0.5).sort((a, c) => c.fs - a.fs)[0];

console.log('── structure (1440x900)');
{ const p = await open({ width: 1440, height: 900 });
  const st = await p.evaluate(() => ({ n: document.querySelectorAll('#services').length, lab: /Previous section|Next section · stub|orb-switch/.test(document.body.innerHTML), sections: ['hero', 'work', 'statement', 'selected', 'services', 'minds', 'work-archive', 'collaborations', 'contact'].map((id) => !!document.getElementById(id) || !!document.querySelector(`main > section:first-child`)), nav: [...document.querySelectorAll('header a')].filter((a) => /capabilit/i.test(a.textContent)).map((a) => a.getAttribute('href')), old: !!document.querySelector('.lens-root'), order: [...document.querySelectorAll('main > section, main > div')].map((e) => e.id).filter(Boolean).join('>') }));
  ok('exactly one #services section; no preview switch / lab / stub UI; the old lens section is gone', st.n === 1 && !st.lab && !st.old, JSON.stringify({ n: st.n, lab: st.lab, old: st.old }));
  ok('Capabilities link still points to #services', st.nav.includes('#services'), JSON.stringify(st.nav));
  ok('section order intact (selected → services → minds …)', /selected.*services.*minds/.test(st.order), st.order);
  const g = await geo(p); ok('scroll travel 2,340 px at 900 tall (sticky scene under the real header)', Math.abs((g.h - g.sh) - 2340) <= 2, `${g.h - g.sh}px, header ${g.hh}px`);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close(); }

console.log('\n── flow: entering, completing, leaving, reverse (1440x900)');
{ const p = await open({ width: 1440, height: 900 }); const g = await geo(p);
  // entering from the preceding section: ordinary wheel scrolling moves the page right up to the scene
  await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g.top - g.hh - 700); await frame(p); await sleep(500);
  await p.mouse.move(720, 500); const y0 = await p.evaluate(() => scrollY); for (let i = 0; i < 6; i++) { await p.mouse.wheel({ deltaY: 100 }); await sleep(40); } await sleep(500); await frame(p);
  ok('approaching from the preceding section: wheel scrolls the page (never intercepted)', (await p.evaluate(() => scrollY)) > y0 + 500);
  await atQ(p, 0); let s = await snap(p);
  ok('scene start: stage seated under the header, service 1 selected and lifted', Math.abs(s.stage.t - g.hh) <= 1 && s.sel === 0 && s.desc === 0 && lifted(s) && lifted(s).txt === 'Branding', JSON.stringify({ stT: s.stage.t, sel: s.sel }));
  const seq = []; for (let k = 0; k < N; k++) { await atQ(p, holdStart(k) + HOLD / 2); const z = await snap(p); const t = lifted(z); seq.push(z.sel === k && z.desc === k && t && t.wt === 700 && t.fs > 27 && Math.abs(z.hit[k].cx - z.lensCx) < 4 ? 'ok' : `bad${k}`); }
  ok('all seven services: selected, lifted, bold, description + lens in sync', seq.every((x) => x === 'ok'), seq.join());
  ok('lens ≈ 600 px at 1440×900', Math.abs(s.lensW - 600) <= 6, `${s.lensW.toFixed(0)}px`);
  await atQ(p, Q); s = await snap(p); ok('end of the scene: last service held', s.sel === 6);
  // leaving into the following section (Minds)
  const g2 = await geo(p); await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), g2.top - g2.hh + (g2.h - g2.sh) + 500); await frame(p); await sleep(700); await frame(p);
  const out = await p.evaluate(() => { const m = document.getElementById('minds').getBoundingClientRect(); const st = document.querySelector('#services .orb-stage').getBoundingClientRect(); return { mindsTop: m.top, stageBottom: st.bottom, vh: innerHeight }; });
  ok('leaving: the stage scrolls away and Minds follows without a gap', out.stageBottom < out.vh && out.mindsTop < out.vh && out.mindsTop >= out.stageBottom - 4, JSON.stringify(out));
  // reverse
  const back = []; for (let k = N - 1; k >= 0; k--) { await atQ(p, holdStart(k) + HOLD / 2); back.push((await snap(p)).sel); } ok('reverse scrolling retraces 7 → 1', back.join() === '6,5,4,3,2,1,0', back.join());
  // direct selection + prev/next
  await atQ(p, 0); const labs = await p.$$('#services button[data-orb-label]'); await labs[4].click(); await sleep(3200); await frame(p); await sleep(300); s = await snap(p);
  ok('direct selection lands in that service\'s hold', s.sel === 4 && s.desc === 4 && Math.abs(s.hit[4].cx - s.lensCx) < 4, `sel ${s.sel}`);
  await p.click('#services button[aria-label="Next service"]'); await sleep(3200); await frame(p); await sleep(300); ok('next button lands in the next hold', (await snap(p)).sel === 5);
  await p.click('#services button[aria-label="Previous service"]'); await sleep(3200); await frame(p); await sleep(300); ok('previous button lands in the previous hold', (await snap(p)).sel === 4);
  await p.click('#services .orb-skip'); await sleep(3200); await frame(p); const after = await p.evaluate(() => document.querySelector('#services .orb-after').getBoundingClientRect().top); ok('"Skip services" moves beyond the scene', after < 500 && after > -300, `${Math.round(after)}`);
  // keyboard
  await atQ(p, 0); const l0 = (await p.$$('#services button[data-orb-label]'))[0]; await l0.focus(); await p.keyboard.press('ArrowRight'); await sleep(3000); await frame(p); await sleep(300); const kb = await snap(p); ok('keyboard: arrow key moves the selection, focus follows', kb.sel === 1 && (await p.evaluate(() => document.activeElement && document.activeElement.textContent)) === kb.hit[1].text, `sel ${kb.sel}`);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close(); }

console.log('\n── navigating directly to #services');
{ const p = await open({ width: 1440, height: 900 }, {}, '#services'); await frame(p); await sleep(900); await frame(p); const g = await geo(p); const s = await snap(p);
  ok('#services lands with the scene seated under the header and service 1 selected', Math.abs(s.stage.t - g.hh) <= 2 && s.sel === 0, JSON.stringify({ stT: s.stage.t, hh: g.hh, sel: s.sel }));
  const nav = await p.evaluate(() => { const a = [...document.querySelectorAll('header a')].find((x) => /capabilit/i.test(x.textContent)); return !!a; }); ok('Capabilities nav link present', nav); await p.close(); }

console.log('\n── content: all seven labels, scenes, descriptions, links');
{ const p = await open({ width: 1440, height: 900 }); const c = await p.evaluate(() => { const sec = document.querySelector('#services'); return { labels: [...sec.querySelectorAll('button[data-orb-label]')].map((b) => b.textContent), arcs: [...sec.querySelectorAll('svg.orb-arcs text')].filter((t) => +t.getAttribute('opacity') > 0.5).length, scenes: sec.querySelectorAll('[data-sc]').length, descs: [...sec.querySelectorAll('.orb-d .orb-body')].map((d) => d.textContent.trim().length > 20), links: [...sec.querySelectorAll('.orb-d a')].map((a) => a.getAttribute('href')), staticItems: sec.querySelectorAll('.orb-static li').length }; });
  const expected = ['Branding', 'Creative Strategy', 'Content Production', 'Social Media', 'Design', 'Paid Media', 'Web Experiences'];
  ok('all seven service names, in order, from the content source', JSON.stringify(c.labels) === JSON.stringify(expected), c.labels.join('|'));
  ok('seven lens scenes and seven non-empty descriptions', c.scenes === 7 && c.descs.length === 7 && c.descs.every(Boolean), JSON.stringify({ scenes: c.scenes, descs: c.descs.length }));
  ok('links: every service link present in the content is rendered (none configured today)', c.links.every((h) => h && h.length > 0), JSON.stringify(c.links));
  ok('no-JS list carries the same seven services', c.staticItems === 7); await p.close(); }

console.log('\n── resize, short viewport, mobile, reduced motion, no JS');
{ const p = await open({ width: 1440, height: 900 }); const modes = [];
  for (const vp of [{ width: 1280, height: 600 }, { width: 1100, height: 800 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) { await p.setViewport(vp); await sleep(900); await frame(p); modes.push(await p.evaluate(() => ({ w: innerWidth, mobile: document.querySelector('#services').classList.contains('orb-m'), pinned: !!document.querySelector('#services .orb-track'), ow: document.documentElement.scrollWidth <= innerWidth + 1 }))); }
  ok('resizing 1440 → 1280×600 → 1100 → 390 → 1440 switches layouts without overflow or errors', modes[0].pinned && modes[1].pinned && modes[2].mobile && !modes[2].pinned && modes[3].pinned && modes.every((m) => m.ow) && p.errs.length === 0, JSON.stringify(modes)); await p.close(); }
{ const p = await open({ width: 1280, height: 600 }); const g = await geo(p); await atQ(p, holdStart(2) + HOLD / 2); const s = await snap(p); const ar = s.texts.filter((t) => t.op > 0.5);
  ok('1280×600: nothing clipped, lens fits, header clear', ar.every((t) => t.r.l >= s.stage.l - 1 && t.r.r <= s.stage.r + 1 && t.r.t >= s.stage.t - 1 && t.r.b <= s.stage.b + 1) && s.lensW > 330 && Math.abs(s.stage.t - g.hh) <= 1, `lens ${s.lensW.toFixed(0)}px`);
  let all = true; for (let k = 0; k < N; k++) { await atQ(p, holdStart(k) + HOLD / 2); const z = await snap(p); const zz = z.texts.filter((t) => t.op > 0.5); if (!zz.every((t) => t.r.l >= z.stage.l - 1 && t.r.r <= z.stage.r + 1 && t.r.t >= z.stage.t - 1 && t.r.b <= z.stage.b + 1)) all = false; } ok('1280×600: all seven names inside the stage at every hold', all); await p.close(); }
{ const p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, {}, ''); await p.evaluate(() => { const e = document.querySelector('#services'); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 84, behavior: 'instant' }); }); await sleep(500);
  const m = await p.evaluate(() => { const sec = document.querySelector('#services'); const l = sec.querySelector('[data-orb-lens]').getBoundingClientRect(), d = sec.querySelector('.orb-desc').getBoundingClientRect(); return { pend: sec.dataset.mobileDesign, lensW: l.width, below: d.top >= l.bottom - 1, pinned: !!sec.querySelector('.orb-track') }; });
  ok('mobile: orbital prototype adaptation (marked pending approval), description below the lens, no pinned tour', m.pend === 'pending-approval' && m.below && !m.pinned && m.lensW > 240, JSON.stringify(m));
  await p.click('#services button[aria-label="Next service"]'); await sleep(1200); ok('mobile: next button selects the next service', (await p.evaluate(() => [...document.querySelectorAll('#services button[data-orb-label]')].findIndex((b) => b.getAttribute('aria-pressed') === 'true'))) === 1);
  ok('no page errors', p.errs.length === 0, p.errs.join('|')); await p.close(); }
{ const p = await open({ width: 1440, height: 900 }, { rm: true }); const m = await p.evaluate(() => ({ pinned: !!document.querySelector('#services .orb-track'), n: document.querySelectorAll('#services button[data-orb-label]').length })); ok('reduced motion: no pinned scene; all seven selectable', !m.pinned && m.n === 7, JSON.stringify(m)); await p.close(); }
{ const p = await open({ width: 1440, height: 900 }, { nojs: true }); const m = await p.evaluate(() => ({ st: getComputedStyle(document.querySelector('#services .orb-static')).display, h3: document.querySelectorAll('#services .orb-static h3').length })); ok('JavaScript off: all seven services readable as plain text', m.st === 'block' && m.h3 === 7, JSON.stringify(m)); await p.close(); }
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass === tot ? 0 : 1);
