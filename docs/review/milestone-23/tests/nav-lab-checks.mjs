import puppeteer from 'puppeteer-core';
// usage: node nav-lab-checks.mjs — focused navigation/menu interaction checks on /lab/navigation (production preview, port 3111): slim directions A (quiet editorial), B (balanced centre), C (minimal menu).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const BASE = 'http://localhost:3111/lab/navigation';
const fr = (p) => p.screenshot({ type: 'jpeg', quality: 10 }).catch(() => {});
const w0 = await b.newPage(); await w0.goto(BASE, { waitUntil: 'networkidle0' }); await w0.close();
const hdr = (p) => p.evaluate(() => { const h = document.querySelector('header.nv'); const r = h.getBoundingClientRect(); return { h: Math.round(r.height), top: Math.round(r.top), vis: getComputedStyle(h).visibility, solid: h.classList.contains('is-solid'), cur: [...new Set([...h.querySelectorAll('[aria-current="location"]')].filter((a) => a.offsetParent !== null).map((a) => a.getAttribute('href')))].join() }; });
const trig = (v) => `#nv-${v.toLowerCase()}-panel`;
const desktop = async (v) => {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(`${BASE}?v=${v}`, { waitUntil: 'domcontentloaded' });
  await sleep(500); await fr(p); const early = await p.evaluate(() => ({ hdr: !!document.querySelector('header.nv'), open: document.querySelector('.hw-root')?.dataset.open }));
  ok(`${v}: header is visible from the first moments of the hero opening (hero ${early.open})`, early.hdr && /armed|running|pending|measure/.test(early.open || ''), JSON.stringify(early));
  await sleep(4200); await fr(p);
  const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('header.nv a[href^="#"]')].filter((a) => a.offsetParent !== null && getComputedStyle(a).visibility !== 'hidden' && a.getAttribute('href') !== '#top').map((a) => a.getAttribute('href')))]);
  ok(`${v}: ${v === 'C' ? 'the visible Contact link (the rest are in the menu)' : 'the visible desktop links'} use the existing destinations`, v === 'C' ? links.join() === '#contact' : links.join() === '#work,#services,#minds,#contact', links.join());
  // scroll behaviour: constant height, no jitter (surface changes once going down, once going up)
  const h0 = await hdr(p); const seen = []; for (let y = 0; y <= 2200; y += 110) { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await fr(p); const s = await hdr(p); seen.push(s); }
  for (let y = 2200; y >= 0; y -= 110) { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await fr(p); seen.push(await hdr(p)); }
  const flips = seen.reduce((n, s, i) => n + (i && s.solid !== seen[i - 1].solid ? 1 : 0), 0);
  ok(`${v}: slim header (68–76 px), always visible, height never changes (${h0.h}px), surface flips exactly twice over a full down-and-up scroll`, h0.h >= 68 && h0.h <= 76 && seen.every((s) => s.h === h0.h && s.top >= 0 && s.vis === 'visible') && flips === 2, JSON.stringify({ h: [...new Set(seen.map((s) => s.h))], flips }));
  // destinations: click every link
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await fr(p);
  const res = [];
  for (const id of ['work', 'services', 'minds', 'contact']) {
    if (v === 'C') { await p.evaluate(() => document.querySelector('.nv-menubtn').click()); await sleep(700); await fr(p); await p.evaluate((id) => document.querySelector(`.nv-sheet-stage a[href="#${id}"]`).click(), id); await sleep(700); }
    else await p.evaluate((id) => [...document.querySelectorAll('header.nv a')].find((a) => a.getAttribute('href') === `#${id}` && a.offsetParent !== null).click(), id);
    for (let i = 0; i < 6; i++) { await fr(p); await sleep(80); }
    const r = await p.evaluate((id) => ({ top: Math.round(document.getElementById(id).getBoundingClientRect().top), y: scrollY }), id); const hh = await hdr(p);
    res.push(Math.abs(r.top) < 140 && (v === 'C' || hh.cur === `#${id}`));
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await fr(p); await sleep(150);
  }
  ok(`${v}: each link lands its section below the header${v === 'C' ? '' : ' and marks it current'}`, res.every(Boolean), res.join());
  if (v === 'C') {
    // the menu: expanded state, Escape, focus return, scroll position restore, inert background, focus trap
    await p.evaluate(() => scrollTo({ top: 1500, behavior: 'instant' })); await fr(p); const y0 = await p.evaluate(() => scrollY);
    await p.focus('.nv-menubtn'); await p.keyboard.press('Enter'); await sleep(1100); await fr(p);
    const o = await p.evaluate(() => ({ exp: document.querySelector('.nv-menubtn').getAttribute('aria-expanded'), inert: document.querySelector('main#top').hasAttribute('inert'), ovf: getComputedStyle(document.documentElement).overflow, f: document.activeElement?.closest('.nv-sheet-stage') ? 'panel' : document.activeElement?.className }));
    ok('C: Menu is aria-expanded, page behind is inert, scrolling contained, focus moved into the stage', o.exp === 'true' && o.inert && o.ovf === 'hidden' && o.f === 'panel', JSON.stringify(o));
    const stay = []; for (let i = 0; i < 7; i++) { await p.keyboard.press('Tab'); stay.push(await p.evaluate(() => document.activeElement?.closest('.nv-sheet-stage') ? 'panel' : document.activeElement === document.querySelector('.nv-menubtn') ? 'trigger' : 'OUT')); }
    ok('C: Tab stays inside the stage (links + the Close button), never reaches the page behind', !stay.includes('OUT'), stay.join());
    await p.keyboard.press('Escape'); await sleep(1000); await fr(p);
    const c = await p.evaluate(() => ({ exp: document.querySelector('.nv-menubtn').getAttribute('aria-expanded'), inert: document.querySelector('main#top').hasAttribute('inert'), ovf: getComputedStyle(document.documentElement).overflow, f: document.activeElement === document.querySelector('.nv-menubtn'), y: scrollY, cls: document.querySelector('header.nv').className }));
    ok('C: Escape closes, focus returns to Menu, scroll lock released and the prior scroll position is untouched', c.exp === 'false' && !c.inert && c.ovf !== 'hidden' && c.f && Math.abs(c.y - y0) <= 1 && !/is-open|is-closing/.test(c.cls), JSON.stringify({ ...c, y0 }));
  }
  await p.close();
};
for (const v of ['A', 'B', 'C']) await desktop(v);
{ // type: slim, plain, weight 400-500, 12-14 px, no uppercase / fills / borders / shadows on the navigation
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(`${BASE}?v=A`, { waitUntil: 'networkidle0' }); await sleep(800);
  for (const v of ['A', 'B', 'C']) {
    await p.evaluate((v) => { const u = new URL(location.href); u.searchParams.set('v', v); }, v);
    await p.goto(`${BASE}?v=${v}`, { waitUntil: 'networkidle0' }); await sleep(700);
    const t = await p.evaluate(() => { const links = [...document.querySelectorAll('header.nv .nv-link, header.nv .nv-menubtn')].filter((a) => a.offsetParent !== null); const cs = links.map((a) => getComputedStyle(a)); const row = document.querySelector('header.nv .nv-row'); const all = [...document.querySelectorAll('header.nv .nv-row *')].filter((e) => e.offsetParent !== null); return { sizes: [...new Set(cs.map((c) => c.fontSize))].join(), weights: [...new Set(cs.map((c) => c.fontWeight))].join(), upper: cs.some((c) => c.textTransform === 'uppercase'), fills: all.some((e) => { const c = getComputedStyle(e).backgroundColor; return c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent'; }), borders: all.some((e) => parseFloat(getComputedStyle(e).borderTopWidth) > 0 && getComputedStyle(e).borderTopStyle !== 'none'), shadows: all.some((e) => getComputedStyle(e).boxShadow !== 'none'), n: links.length }; });
    ok(`${v}: navigation type is 14 px / 500, not uppercase, and the row has no fills, borders or shadows`, t.sizes === '14px' && /^(400|500)$/.test(t.weights) && !t.upper && !t.fills && !t.borders && !t.shadows, JSON.stringify(t));
  }
  await p.close();
}
// mobile: real 390 viewport — menus of every direction
for (const v of ['A', 'B', 'C']) {
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await p.goto(`${BASE}?v=${v}`, { waitUntil: 'domcontentloaded' }); await sleep(4300); await fr(p);
  const sel = '.nv-menubtn';
  const m0 = await p.evaluate((sel) => { const t = document.querySelector(sel); const r = t.getBoundingClientRect(); return { exp: t.getAttribute('aria-expanded'), w: Math.round(r.width), h: Math.round(r.height), contact: [...document.querySelectorAll('header.nv a')].filter((a) => a.offsetParent !== null && /contact/i.test(a.textContent)).length, links: [...document.querySelectorAll('header.nv nav[aria-label="Primary"]')].filter((n) => n.offsetParent !== null).length }; }, sel);
  ok(`${v} mobile: labelled/identifiable menu control ≥ 44 px, Contact visible in the closed header (A: menu only, by design)`, m0.exp === 'false' && m0.h >= 44 && (m0.w >= 44) && (v === 'A' ? true : m0.contact >= 1), JSON.stringify(m0));
  await p.evaluate(() => scrollTo({ top: 1400, behavior: 'instant' })); await fr(p); const y0 = await p.evaluate(() => scrollY);
  await p.focus(sel); await p.keyboard.press('Enter'); await sleep(1000); await fr(p);
  const o = await p.evaluate((sel) => ({ exp: document.querySelector(sel).getAttribute('aria-expanded'), inert: document.querySelector('main#top').hasAttribute('inert'), ovf: getComputedStyle(document.documentElement).overflow, inPanel: !!document.activeElement?.closest('[id^="nv-"][id$="-panel"]'), rows: [...document.querySelectorAll('[id^="nv-"][id$="-panel"] a')].filter((a) => a.getBoundingClientRect().height >= 44).length }), sel);
  ok(`${v} mobile: menu opens (aria-expanded), background inert, scroll contained, focus inside, touch rows ≥ 44 px`, o.exp === 'true' && o.inert && o.ovf === 'hidden' && o.inPanel && o.rows >= 3, JSON.stringify(o));
  await p.keyboard.press('Escape'); await sleep(900); await fr(p);
  const c = await p.evaluate((sel) => ({ exp: document.querySelector(sel).getAttribute('aria-expanded'), inert: document.querySelector('main#top').hasAttribute('inert'), ovf: getComputedStyle(document.documentElement).overflow, f: document.activeElement === document.querySelector(sel), y: scrollY }), sel);
  ok(`${v} mobile: Escape closes, focus returns to the menu button, scroll lock released, position unchanged`, c.exp === 'false' && !c.inert && c.ovf !== 'hidden' && c.f && Math.abs(c.y - y0) <= 1, JSON.stringify({ ...c, y0 }));
  // following a link from the open menu
  await p.click(sel); await sleep(900); await fr(p);
  await p.evaluate(() => [...document.querySelectorAll('[id^="nv-"][id$="-panel"] a')].find((a) => a.getAttribute('href') === '#minds').click()); await sleep(1000); for (let i = 0; i < 5; i++) { await fr(p); await sleep(80); }
  const f = await p.evaluate(() => ({ top: Math.round(document.getElementById('minds').getBoundingClientRect().top), ovf: getComputedStyle(document.documentElement).overflow, inert: document.querySelector('main#top').hasAttribute('inert') }));
  ok(`${v} mobile: following a link closes the menu, releases the lock and lands the section`, Math.abs(f.top) < 130 && f.ovf !== 'hidden' && !f.inert, JSON.stringify(f));
  await p.close();
}
{ // reduced motion (forced by the lab toggle): no sweeps — D opens instantly
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(`${BASE}?v=C`, { waitUntil: 'networkidle0' }); await sleep(4300);
  await p.evaluate(() => [...document.querySelectorAll('.lab-seg[aria-label="Motion"] button')].find((x) => /Reduced/.test(x.textContent)).click()); await sleep(200);
  const d = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('.nv-sheet-stage')); return { td: s.transitionDuration, flag: document.documentElement.dataset.nvReduce }; });
  ok('reduced motion toggle: the menu reveal collapses to ~0 (instant)', d.flag === '1' && parseFloat(d.td) < 0.01, JSON.stringify(d));
  await p.close();
}
await b.close(); console.log(`${pass}/${pass + fail} passed`);
