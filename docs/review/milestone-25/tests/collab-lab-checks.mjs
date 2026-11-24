import puppeteer from 'puppeteer-core';
// usage: node collab-lab-checks.mjs — focused interaction/layout checks of the four Collaborations prototypes on /lab/collaborations (production preview, port 3111).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const BASE = 'http://localhost:3111/lab/collaborations';
const fr = (p) => p.screenshot({ type: 'jpeg', quality: 10 }).catch(() => {});
const w0 = await b.newPage(); await w0.goto(BASE, { waitUntil: 'networkidle0' }); await w0.close();
const open = async (v, vp = { width: 1440, height: 900 }, extra = '') => { const p = await b.newPage(); await p.setViewport(vp); await p.goto(`${BASE}?v=${v}${extra}`, { waitUntil: 'networkidle0' }); await sleep(600); await p.evaluate(() => document.getElementById('collab-proto').scrollIntoView({ behavior: 'instant' })); await fr(p); await sleep(200); return p; };
const rects = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)].join(','); }).join('|'), sel);
const NAMES = ['Northwind', 'Halo', 'Orbital Press', 'kiln.', 'Tideworks', 'Mango Lab', 'Paper Moon', 'Atlas & Co', 'Fable', 'Solstice', 'Brick House', 'Nine Lines'];
{ // context + dataset
  const p = await open('A');
  const c = await p.evaluate(() => ({ archive: !!document.querySelector('.cb-ctx-before #work-archive'), footer: !!document.querySelector('.cb-ctx-after #contact'), inert: document.querySelector('.cb-ctx-before').hasAttribute('inert') && document.querySelector('.cb-ctx-after').hasAttribute('inert'), header: !!document.querySelector('header.sh') }));
  ok('the prototype sits between the REAL preceding section (work archive) and following section (footer); the context is inert; the production header is present', c.archive && c.footer && c.inert && c.header, JSON.stringify(c));
  await p.close();
}
for (const v of ['A', 'B', 'C', 'D']) {
  const p = await open(v); const n = await p.evaluate(() => { const sec = document.querySelector('.cb'); const names = new Set(); sec.querySelectorAll('[role="img"], img').forEach((e) => { const l = (e.getAttribute('aria-label') || e.getAttribute('alt') || '').replace(/ \(placeholder wordmark\)/, ''); if (l) names.add(l); }); return [...names]; });
  ok(`${v}: the same 12-partner dataset (names, roles, placeholder marks) is shown`, NAMES.every((x) => n.includes(x)) && n.length === 12, n.join(', '));
  const noLinks = await p.evaluate(() => ({ links: document.querySelectorAll('.cb a').length, cursors: [...document.querySelectorAll('.cb .cb-entry')].filter((e) => getComputedStyle(e).cursor === 'pointer').length }));
  ok(`${v}: logos without a destination are not links (no <a>, no pointer cursor)${v === 'C' ? ' — roster rows are buttons' : ''}`, noLinks.links === 0 && noLinks.cursors === 0, JSON.stringify(noLinks));
  const oflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(`${v}: no horizontal overflow at 1440`, oflow <= 0, `${oflow}`);
  await p.close();
}
{ // A
  const p = await open('A'); const before = await rects(p, '.cb-a .cb-entry'); const cap0 = await rects(p, '.cb-cap');
  await p.hover('.cb-a-cell:nth-child(3) .cb-entry'); await sleep(350); await fr(p);
  const h = await p.evaluate(() => ({ name: document.querySelector('.cb-cap-name').textContent, role: document.querySelector('.cb-cap-role').textContent.trim(), dim: [...document.querySelectorAll('.cb-a-cell')].filter((c) => !c.classList.contains('sel')).every((c) => +getComputedStyle(c.querySelector('.cb-entry')).opacity < 0.5) }));
  const after = await rects(p, '.cb-a .cb-entry'); const cap1 = await rects(p, '.cb-cap');
  ok('A: hover reveals name + role in the one reserved caption, dims the others, and nothing moves (entries and caption keep identical geometry)', h.name === 'Orbital Press' && h.role === 'Content' && h.dim && before === after && cap0 === cap1, JSON.stringify(h));
  await p.mouse.move(5, 5); await sleep(300);
  await p.focus('.cb-a-cell:nth-child(5) .cb-entry'); await sleep(300); await fr(p);
  const f = await p.evaluate(() => ({ name: document.querySelector('.cb-cap-name').textContent, ring: getComputedStyle(document.activeElement).outlineStyle })); ok('A: keyboard focus reveals the same caption with a visible focus ring', f.name === 'Tideworks' && f.ring === 'solid', JSON.stringify(f));
  await p.close();
}
{ // B
  const p = await open('B'); await sleep(400);
  const m = await p.evaluate(() => { const t = document.querySelector('.cb-b-track'); const cs = getComputedStyle(t); return { an: cs.animationName, st: cs.animationPlayState, dur: parseFloat(cs.animationDuration), copies: t.querySelectorAll('li[aria-hidden="true"]').length, items: t.querySelectorAll('li').length, rows: document.querySelectorAll('.cb-b-pause').length }; });
  ok('B: seamless slow drift (running, duplicated second copy is aria-hidden, > 60 s per loop), explicit Pause control present', /drift/.test(m.an) && m.st === 'running' && m.dur > 60 && m.copies === 12 && m.items === 24 && m.rows === 1, JSON.stringify(m));
  const x0 = await p.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.cb-b-track')).transform).m41); await sleep(1500); await fr(p);
  const x1 = await p.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.cb-b-track')).transform).m41); ok('B: it really moves (leftwards) while running', x1 < x0 - 10, `${x0} → ${x1}`);
  await p.hover('.cb-b-ribbon'); await sleep(300); const hp = await p.evaluate(() => getComputedStyle(document.querySelector('.cb-b-track')).animationPlayState); ok('B: pauses on hover', hp === 'paused', hp);
  await p.mouse.move(5, 5); await sleep(200); await p.focus('.cb-b-item:nth-child(3) .cb-entry'); await sleep(300);
  const fp = await p.evaluate(() => ({ st: getComputedStyle(document.querySelector('.cb-b-track')).animationPlayState, name: document.querySelector('.cb-cap-name').textContent })); ok('B: pauses on keyboard focus and names the mark in the reserved caption', fp.st === 'paused' && fp.name === 'Orbital Press', JSON.stringify(fp));
  await p.evaluate(() => document.activeElement.blur()); await p.mouse.move(5, 5); await sleep(300);
  await p.click('.cb-b-pause'); await sleep(250); const pb = await p.evaluate(() => ({ pressed: document.querySelector('.cb-b-pause').getAttribute('aria-pressed'), st: getComputedStyle(document.querySelector('.cb-b-track')).animationPlayState, txt: document.querySelector('.cb-b-pause').textContent.trim() })); ok('B: the Pause control stops it (aria-pressed, label becomes Play) and Play resumes', pb.pressed === 'true' && pb.st === 'paused' && pb.txt === 'Play', JSON.stringify(pb));
  await p.click('.cb-b-pause'); await sleep(250); ok('B: Play resumes', await p.evaluate(() => getComputedStyle(document.querySelector('.cb-b-track')).animationPlayState) === 'running');
  await p.close();
  const q = await open('B', undefined, '&few=1'); await sleep(500); const fw = await q.evaluate(() => { const t = document.querySelector('.cb-b-track'); return { an: getComputedStyle(t).animationName, items: t.querySelectorAll('li').length, hidden: t.querySelectorAll('li[aria-hidden]').length, pause: document.querySelectorAll('.cb-b-pause').length, static: document.querySelector('.cb-b-ribbon').classList.contains('is-static') }; }); ok('B: with few logos (5) there is no loop — a static centred arrangement, no duplicate copy, no pause control needed', fw.an === 'none' && fw.items === 5 && fw.hidden === 0 && fw.static && fw.pause === 0, JSON.stringify(fw)); await q.close();
  const r = await open('B', undefined, '&reduce=1'); await r.evaluate(() => [...document.querySelectorAll('.lab-seg[aria-label="Motion"] button')].find((x) => /Reduced/.test(x.textContent)).click()); await sleep(500); const rd = await r.evaluate(() => ({ an: getComputedStyle(document.querySelector('.cb-b-track')).animationName, st: document.querySelector('.cb-b-ribbon').classList.contains('is-static'), items: document.querySelectorAll('.cb-b-track li').length })); ok('B: reduced motion shows the static arrangement (no animation, no duplicates)', rd.an === 'none' && rd.st && rd.items === 12, JSON.stringify(rd)); await r.close();
}
{ // C
  const p = await open('C'); await sleep(300);
  const d = await p.evaluate(() => ({ sel: document.querySelector('.cb-c-row[aria-selected="true"]').textContent, op: [...document.querySelectorAll('.cb-c-logo')].map((e) => +getComputedStyle(e).opacity), role: document.querySelector('.cb-c-role').textContent }));
  ok('C: the first name is selected by default and its logo is shown (understandable without interaction)', d.sel === 'Northwind' && d.op[0] === 1 && d.op.slice(1).every((x) => x === 0) && d.role === 'Identity', JSON.stringify(d));
  const st0 = await rects(p, '.cb-c-stage'); await p.hover('.cb-c-row:nth-child(1)'); await p.hover('.cb-c-list li:nth-child(6) .cb-c-row'); await sleep(350); await fr(p);
  const pv = await p.evaluate(() => ({ op: [...document.querySelectorAll('.cb-c-logo')].map((e) => +getComputedStyle(e).opacity).indexOf(1), role: document.querySelector('.cb-c-role').textContent })); const st1 = await rects(p, '.cb-c-stage');
  ok('C: hover previews that name\'s logo in the same reserved stage (Mango Lab / Campaign) without moving the stage', pv.op === 5 && pv.role === 'Campaign' && st0 === st1, JSON.stringify(pv));
  await p.mouse.move(5, 5); await sleep(250); await p.click('.cb-c-list li:nth-child(9) .cb-c-row'); await p.mouse.move(5, 5); await sleep(350);
  const sl = await p.evaluate(() => ({ sel: document.querySelector('.cb-c-row[aria-selected="true"]').textContent, shown: [...document.querySelectorAll('.cb-c-logo')].map((e) => +getComputedStyle(e).opacity).indexOf(1) })); ok('C: click selects (Fable) and it stays after the pointer leaves', sl.sel === 'Fable' && sl.shown === 8, JSON.stringify(sl));
  await p.keyboard.press('Shift'); await p.focus('.cb-c-list li:nth-child(2) .cb-c-row'); await sleep(300); const ff = await p.evaluate(() => ({ ring: getComputedStyle(document.activeElement).outlineStyle, shown: [...document.querySelectorAll('.cb-c-logo')].map((e) => +getComputedStyle(e).opacity).indexOf(1) })); ok('C: keyboard focus previews with a visible ring', ff.ring === 'solid' && ff.shown === 1, JSON.stringify(ff));
  await p.close();
}
{ // D
  const p = await open('D');
  const g = await p.evaluate(() => { const sec = document.querySelector('.cb-d'); const sr = sec.getBoundingClientRect(); const logos = [...sec.querySelectorAll('.cb-d-f .cb-entry, .cb-d-r .cb-entry')].map((e) => e.getBoundingClientRect()); const scroller = [...sec.querySelectorAll('*')].some((e) => ['auto', 'scroll'].includes(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1); return { n: logos.length, inside: logos.every((r) => r.width > 0 && r.top >= sr.top && r.bottom <= sr.bottom && r.left >= 0 && r.right <= innerWidth), scroller, feat: sec.querySelectorAll('.cb-d-f').length, roster: sec.querySelectorAll('.cb-d-r').length, note: /provisional/i.test(sec.querySelector('.cb-note').textContent) }; });
  ok('D: featured (3, provisional & configurable) + roster (9) = all 12 visible inside the section, no inner scrolling', g.n === 12 && g.inside && !g.scroller && g.feat === 3 && g.roster === 9 && g.note, JSON.stringify(g));
  const c0 = await rects(p, '.cb-d-rcap'); const e0 = await rects(p, '.cb-d .cb-entry'); await p.hover('.cb-d-r:nth-child(4) .cb-entry'); await sleep(350); await fr(p);
  const h = await p.evaluate(() => ({ cap: document.querySelector('.cb-d-rcap').textContent })); const c1 = await rects(p, '.cb-d-rcap'); const e1 = await rects(p, '.cb-d .cb-entry');
  ok('D: roster hover names the mark in its reserved line; nothing moves', /Mango Lab|kiln|Tideworks/.test(h.cap) && c0 === c1 && e0 === e1, JSON.stringify(h));
  await p.close();
}
// phones
for (const v of ['A', 'B', 'C', 'D']) {
  const p = await open(v, { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await sleep(300);
  const m = await p.evaluate(() => { const sec = document.querySelector('.cb'); const ents = [...sec.querySelectorAll('.cb-entry')].filter((e) => !e.closest('[aria-hidden="true"]')); const sizes = (ents.length ? ents : [document.body]).map((e) => { const r = e.getBoundingClientRect(); const g = (e.querySelector ? e.querySelector('svg,img') : null)?.getBoundingClientRect() ?? r; return { h: Math.round(r.height), w: Math.round(g.width) }; }); return { over: document.documentElement.scrollWidth - innerWidth, minLogoW: Math.min(...sizes.map((s) => s.w)), minTap: Math.min(...sizes.map((s) => s.h)), n: ents.length }; });
  ok(`${v} mobile 390: no horizontal overflow${v === 'C' ? ' (names, not logos, in the list; the stage logo is large)' : ', logos ≥ 46 px wide, touch targets ≥ 44 px'}`, m.over <= 0 && (v === 'C' ? true : m.minLogoW >= 46 && m.minTap >= 44), JSON.stringify(m));
  if (v === 'A') { await p.tap('.cb-a-cell:nth-child(7) .cb-entry'); await sleep(300); await fr(p); const t = await p.evaluate(() => { const c = document.querySelector('.cb-a-capwrap').getBoundingClientRect(); return { name: document.querySelector('.cb-cap-name').textContent, inView: c.bottom <= innerHeight + 1 && c.top >= 0 }; }); ok('A mobile: tap reveals the caption, pinned in view while the page scrolls normally', t.name === 'Paper Moon' && t.inView, JSON.stringify(t)); }
  if (v === 'B') { const t = await p.evaluate(() => ({ pause: document.querySelector('.cb-b-pause').getBoundingClientRect().height, an: getComputedStyle(document.querySelector('.cb-b-track')).animationName })); ok('B mobile: ribbon drifts and the Pause control is a ≥ 44 px target', t.pause >= 44 && /drift/.test(t.an), JSON.stringify(t)); }
  if (v === 'C') { await p.tap('.cb-c-list li:nth-child(12) .cb-c-row'); await sleep(350); await p.evaluate(() => document.querySelector('.cb-c-list li:nth-child(12) .cb-c-row').scrollIntoView({ block: 'center', behavior: 'instant' })); await fr(p); await sleep(200); const t = await p.evaluate(() => { const s = document.querySelector('.cb-c-stage').getBoundingClientRect(); const idx = [...document.querySelectorAll('.cb-c-logo')].map((e) => +getComputedStyle(e).opacity).indexOf(1); return { stageTop: Math.round(s.top), stageBottom: Math.round(s.bottom), idx, row: document.querySelector('.cb-c-row').getBoundingClientRect().height }; }); ok('C mobile: tapping the last name selects it and the logo stays visible (sticky stage) while the list scrolls; rows ≥ 44 px', t.idx === 11 && t.stageTop >= 0 && t.stageTop < 120 && t.row >= 44, JSON.stringify(t)); }
  if (v === 'D') { await p.tap('.cb-d-r:nth-child(5) .cb-entry'); await sleep(300); await fr(p); const t = await p.evaluate(() => ({ cap: document.querySelector('.cb-d-rcap').textContent, cols: getComputedStyle(document.querySelector('.cb-d-rgrid')).gridTemplateColumns.split(' ').length, f1: getComputedStyle(document.querySelector('.cb-d-f1')).alignSelf })); ok('D mobile: roster is a 3-column grid, featured marks stack with alternating alignment, tap names the mark', t.cols === 3 && /end/.test(t.f1) && t.cap.length > 5, JSON.stringify(t)); }
  await p.close();
}
await b.close(); console.log(`${pass}/${pass + fail} passed`);
