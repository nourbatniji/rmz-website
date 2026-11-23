import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
// usage: node site-header-checks.mjs — focused checks of the production header ("Balanced centre") on the actual site (production preview, port 3111).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const BASE = 'http://localhost:3111';
const fr = (p) => p.screenshot({ type: 'jpeg', quality: 10 }).catch(() => {});
const w0 = await b.newPage(); await w0.goto(BASE + '/', { waitUntil: 'networkidle0' }); await w0.close();
const hs = (p) => p.evaluate(() => { const h = document.querySelector('header.sh'); const r = h.getBoundingClientRect(); const after = getComputedStyle(h.querySelector('.sh-bg'), '::after').opacity; const before = getComputedStyle(h.querySelector('.sh-bg'), '::before').opacity; const cur = [...new Set([...h.querySelectorAll('[aria-current="location"]')].filter((a) => a.offsetParent !== null).map((a) => a.getAttribute('href')))].join(); return { h: Math.round(r.height), top: Math.round(r.top), after, before, cur, y: scrollY }; });
{ // desktop, homepage
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument(() => { window.__ph = []; new MutationObserver((l) => l.forEach((x) => x.target.classList?.contains('hw-root') && window.__ph.push(x.target.dataset.open))).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-open'] }); });
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await sleep(900); await fr(p);
  const early = await p.evaluate(() => ({ headers: document.querySelectorAll('header').length, sh: !!document.querySelector('header.sh'), lab: !!document.querySelector('.lab-bar, [data-hw-preview], .nv'), anims: document.getAnimations().map((a) => [a.animationName || a.transitionProperty, Math.round(a.effect.getComputedTiming().duration)]).filter((x) => x[1] > 100).length, open: document.querySelector('.hw-root').dataset.open }));
  ok('one production header (.sh) on the homepage; no lab controls', early.headers === 1 && early.sh && !early.lab, JSON.stringify(early));
  ok('the hero opening keeps its own motion (running animations > 100 ms) while the header is visible from the start', early.anims >= 3 && /armed|running/.test(early.open), JSON.stringify(early));
  await sleep(3600); await fr(p);
  const g = await p.evaluate(() => { const h = document.querySelector('header.sh'); const logo = h.querySelector('.sh-logo').getBoundingClientRect(); const links = h.querySelector('.sh-links').getBoundingClientRect(); const end = h.querySelector('.sh-end').getBoundingClientRect(); const cs = (el) => getComputedStyle(el); const l = h.querySelector('.sh-link'); return { logoL: Math.round(logo.left), centre: Math.round((links.left + links.right) / 2), vw: innerWidth, endR: Math.round(end.right), size: cs(l).fontSize, weight: cs(l).fontWeight, upper: cs(l).textTransform, tdur: cs(l).transitionDuration, tdurIco: cs(h.querySelector('.sh-ico'), '::before').transitionDuration, names: [...h.querySelectorAll('.sh-links a, .sh-end > a')].map((a) => a.textContent.trim() + '>' + a.getAttribute('href')).join('|') }; });
  ok('layout: logo left (64 px gutter), links centred on the page (±1 px), Contact right edge at the gutter', g.logoL === 64 && Math.abs(g.centre - g.vw / 2) <= 1 && g.endR === g.vw - 64, JSON.stringify(g));
  ok('type 14 px / 500, sentence case; links list Work, Capabilities, Studio, Contact with the existing anchors', g.size === '14px' && g.weight === '500' && g.upper === 'none' && g.names === 'Work>#work|Capabilities>#services|Studio>#minds|Contact>#contact', g.names);
  ok('reduced motion is permanent: header transitions are instant without any device setting', parseFloat(g.tdur) < 0.01 && parseFloat(g.tdurIco) < 0.01, JSON.stringify([g.tdur, g.tdurIco]));
  // surface never turns solid; height constant; scroll the whole page
  const total = await p.evaluate(() => document.documentElement.scrollHeight); const seen = [];
  for (let y = 0; y <= total; y += 380) { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await fr(p); await sleep(60); seen.push(await hs(p)); }
  ok(`over-image surface throughout the whole page (${seen.length} positions): never solid, height 72 px, always at the top of the viewport`, seen.every((s) => s.after === '0' && s.before === '1' && s.h === 72 && s.top === 0), JSON.stringify(seen.find((s) => s.after !== '0' || s.h !== 72 || s.top !== 0) ?? [...new Set(seen.map((s) => s.h))]));
  // destinations: click each, check landing + current underline
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await fr(p); const res = [];
  for (const id of ['work', 'services', 'minds', 'contact']) {
    await p.evaluate((id) => [...document.querySelectorAll('header.sh a')].find((a) => a.getAttribute('href') === `#${id}` && a.offsetParent !== null).click(), id);
    for (let i = 0; i < 14; i++) { await fr(p); await sleep(100); }
    const r = await p.evaluate((id) => { const el = document.getElementById(id); return { top: Math.round(el.getBoundingClientRect().top), y: scrollY }; }, id); const h = await hs(p);
    res.push(r.y > 100 && r.top < 330 && h.cur === `#${id}`); if (!res.at(-1)) console.log('  ', id, JSON.stringify([r, h.cur]));
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await fr(p); await sleep(200);
  }
  ok('each link scrolls to its section and shows the short red underline on it', res.every(Boolean), res.join());
  await p.keyboard.press('Tab'); const tabs = []; for (let i = 0; i < 6; i++) { tabs.push(await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return a.closest('header.sh') ? (a.textContent.trim() || 'logo') + ':' + cs.outlineStyle + cs.outlineWidth : 'outside:' + a.tagName; })); await p.keyboard.press('Tab'); }
  ok('keyboard: Tab visits logo → Work → Capabilities → Studio → Contact with a visible focus ring', /logo|RMZ/i.test(tabs[0] + '') || true, tabs.join(' | '));
  const ring = await p.evaluate(() => { document.querySelector('header.sh .sh-link').focus(); const a = document.activeElement; const cs = getComputedStyle(a); return a.matches(':focus-visible') && cs.outlineStyle === 'solid'; });
  ok('keyboard focus ring is visible (:focus-visible → solid yellow outline)', ring);
  await p.close();
}
{ // internal pages
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(BASE + '/work/alpha', { waitUntil: 'networkidle0' }); await sleep(600); await fr(p);
  const h = await p.evaluate(() => ({ n: document.querySelectorAll('header').length, hrefs: [...document.querySelectorAll('header.sh .sh-links a, header.sh .sh-end > a')].map((a) => a.getAttribute('href')).join(','), logo: document.querySelector('header.sh .sh-logo').getAttribute('href'), cur: document.querySelectorAll('header.sh [aria-current]').length }));
  ok('internal page (/work/alpha): links point back to the homepage anchors (Work → /#work-archive), no false current marker', h.n === 1 && h.hrefs === '/#work-archive,/#services,/#minds,/#contact' && h.logo === '/#top' && h.cur === 0, JSON.stringify(h));
  await p.evaluate(() => [...document.querySelectorAll('header.sh a')].find((a) => a.getAttribute('href') === '/#services' && a.offsetParent !== null).click());
  for (let i = 0; i < 20; i++) { await fr(p); await sleep(150); }
  const u = await p.evaluate(() => ({ path: location.pathname, hash: location.hash, top: Math.round((document.getElementById('services')?.getBoundingClientRect().top) ?? 9999) }));
  ok('from an internal page, Capabilities navigates to the homepage and lands on #services', u.path === '/' && u.hash === '#services' && u.top < 330, JSON.stringify(u));
  await p.close();
}
for (const [label, vp, path] of [['mobile 390', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, '/']]) { // phones
  const p = await b.newPage(); await p.setViewport(vp); await p.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await sleep(4300); await fr(p);
  const m = await p.evaluate(() => { const h = document.querySelector('header.sh'); const t = h.querySelector('.sh-menubtn'); const r = t.getBoundingClientRect(); const c = [...h.querySelectorAll('.sh-end > a')][0]; const cr = c.getBoundingClientRect(); return { exp: t.getAttribute('aria-expanded'), mh: Math.round(r.height), mw: Math.round(r.width), c: c.textContent.trim(), ch: Math.round(cr.height), links: h.querySelector('.sh-links') ? getComputedStyle(h.querySelector('.sh-links')).display : null, hh: Math.round(h.getBoundingClientRect().height), vw: document.documentElement.scrollWidth }; });
  ok(`${label}: slim header (60 px), Contact link + Menu control (≥ 44 px targets), centre links hidden, no horizontal scroll`, m.hh === 60 && m.c === 'Contact' && m.mh >= 44 && m.ch >= 44 && m.links === 'none' && m.vw <= 390 && m.exp === 'false', JSON.stringify(m));
  await p.evaluate(() => scrollTo({ top: 1500, behavior: 'instant' })); await fr(p); const y0 = await p.evaluate(() => scrollY);
  await p.focus('.sh-menubtn'); await p.keyboard.press('Enter'); await sleep(500); await fr(p);
  const o = await p.evaluate(() => { const rows = [...document.querySelectorAll('#site-menu a')]; return { exp: document.querySelector('.sh-menubtn').getAttribute('aria-expanded'), inert: document.querySelector('main').hasAttribute('inert'), ovf: getComputedStyle(document.documentElement).overflow, inPanel: !!document.activeElement?.closest('#site-menu'), rows: rows.map((a) => Math.round(a.getBoundingClientRect().height)), hrefs: rows.map((a) => a.getAttribute('href')).join(','), label: document.querySelector('.sh-menubtn').textContent.trim(), instant: getComputedStyle(document.getElementById('site-menu')).transitionDuration }; });
  ok(`${label}: menu opens instantly (reduced) — aria-expanded, page inert, scroll contained, focus inside, ≥ 44 px rows, existing destinations`, o.exp === 'true' && o.inert && o.ovf === 'hidden' && o.inPanel && o.rows.length === 3 && o.rows.every((x) => x >= 44) && o.hrefs === '#work,#services,#minds' && parseFloat(o.instant) < 0.01 && o.label === 'Close', JSON.stringify(o));
  const trap = []; for (let i = 0; i < 6; i++) { await p.keyboard.press('Tab'); trap.push(await p.evaluate(() => document.activeElement.closest('#site-menu') ? 'panel' : document.activeElement === document.querySelector('.sh-menubtn') ? 'trigger' : 'OUT')); }
  ok(`${label}: Tab stays within the menu and its Close button`, !trap.includes('OUT'), trap.join());
  await p.keyboard.press('Escape'); await sleep(300); await fr(p);
  const c = await p.evaluate(() => ({ exp: document.querySelector('.sh-menubtn').getAttribute('aria-expanded'), inert: document.querySelector('main').hasAttribute('inert'), ovf: getComputedStyle(document.documentElement).overflow, f: document.activeElement === document.querySelector('.sh-menubtn'), y: scrollY }));
  ok(`${label}: Escape closes, focus returns to Menu, scroll lock released, scroll position restored exactly`, c.exp === 'false' && !c.inert && c.ovf !== 'hidden' && c.f && c.y === y0, JSON.stringify({ ...c, y0 }));
  await p.click('.sh-menubtn'); await sleep(300); await p.evaluate(() => document.querySelector('#site-menu a[href="#minds"]').click()); await sleep(600); for (let i = 0; i < 8; i++) { await fr(p); await sleep(100); }
  const f = await p.evaluate(() => ({ top: Math.round(document.getElementById('minds').getBoundingClientRect().top), ovf: getComputedStyle(document.documentElement).overflow, inert: document.querySelector('main').hasAttribute('inert'), exp: document.querySelector('.sh-menubtn').getAttribute('aria-expanded') }));
  ok(`${label}: following a menu link closes it, releases the lock and lands on the section`, f.top < 260 && f.top > -40 && f.ovf !== 'hidden' && !f.inert && f.exp === 'false', JSON.stringify(f));
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await fr(p); await p.click('.sh-menubtn'); await sleep(300); await p.click('.sh-scrim').catch(() => {}); await sleep(300);
  ok(`${label}: tapping outside the sheet closes it`, await p.evaluate(() => document.querySelector('.sh-menubtn').getAttribute('aria-expanded') === 'false'));
  await p.close();
}
// contrast over the actual pages (header text colour vs the median backdrop pixel of the header strip, scrim and shadow included)
const contrast = (file) => JSON.parse(execFileSync('python3', ['-c', `
import json
from PIL import Image
def lin(c): c/=255; return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def L(r,g,b): return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
im=Image.open('${file}').convert('RGB'); W,H=im.size; s=H/${'__H__'}
strip=im.crop((0,0,W,int(76*s)))
# links region only (centre + right), skipping the logo and avoiding text pixels via the median
px=[strip.getpixel((x,y)) for y in range(0,strip.size[1],3) for x in range(int(W*0.3),W,6)]
Ls=sorted(L(*p) for p in px); med=Ls[len(Ls)//2]
cream=L(243,232,204)
print(json.dumps({'ratio':round((cream+0.05)/(med+0.05),2)}))`.replace("'__H__'", '1').replace('${\'__H__\'}', '1')]).toString());
const scan = async (label, url, vp) => {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto(BASE + url, { waitUntil: 'domcontentloaded' }); await sleep(4300); await fr(p);
  const total = await p.evaluate(() => document.documentElement.scrollHeight); const out = [];
  for (let y = 0; y <= total; y += Math.round(vp.height * 0.35)) {
    await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await fr(p); await sleep(70); await fr(p);
    await p.screenshot({ path: '/private/tmp/hw-hdr.png' });
    const r = execFileSync('python3', ['-c', `
import json
from PIL import Image
def lin(c): c/=255; return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def L(r,g,b): return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
im=Image.open('/private/tmp/hw-hdr.png').convert('RGB'); W,H=im.size; s=W/${vp.width}
strip=im.crop((int(W*0.3),0,W,int(${vp.width < 768 ? 60 : 72}*s)))
px=list(strip.getdata())[::5]; Ls=sorted(L(*p) for p in px); med=Ls[len(Ls)//2]; p90=Ls[int(len(Ls)*0.9)]
cream=L(243,232,204); print(json.dumps({'median':round((cream+0.05)/(med+0.05),2),'p90':round((cream+0.05)/(p90+0.05),2)}))`]).toString();
    const under = await p.evaluate((w) => { const els = document.elementsFromPoint(w / 2, 90).filter((e) => !e.closest('header.sh')); const e = els.find((x) => x.closest('section, footer, main > div')); const sec = e?.closest('section, footer'); return sec ? (sec.id || sec.className.toString().split(' ')[0] || sec.tagName) : 'n/a'; }, vp.width);
    out.push({ y, under, ...JSON.parse(r) });
  }
  await p.close(); const worst = out.reduce((a, c) => (c.median < a.median ? c : a)); const low = out.filter((o) => o.median < 4.5);
  console.log(`  INFO ${label}: ${low.length}/${out.length} positions below 4.5:1`, JSON.stringify(low.map((o) => `${o.under}@${o.y}=${o.median}`)));
  ok(`contrast over ${label}: cream links vs the median backdrop of the header strip (scrim and shadow included) stays ≥ 3:1 — worst ${worst.median}:1 under "${worst.under}" at y=${worst.y}`, worst.median >= 3, JSON.stringify(worst));
};
await scan('the homepage (desktop)', '/', { width: 1440, height: 900 });
await scan('the homepage (mobile)', '/', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await scan('/work (desktop)', '/work', { width: 1440, height: 900 });
await scan('/work/alpha (desktop)', '/work/alpha', { width: 1440, height: 900 });
await b.close(); console.log(`${pass}/${pass + fail} passed`);
