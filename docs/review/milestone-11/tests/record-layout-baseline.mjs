import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
// usage: node stm-layout.mjs <url> <out.json>   — records the statement's geometry (for a before/after comparison)
const [url, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const res = {};
for (const [name, vp] of [['1440x900', { width: 1440, height: 900 }], ['1280x720', { width: 1280, height: 720 }], ['390x844', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
  const p = await b.newPage(); await p.setViewport(vp); await p.goto(url, { waitUntil: 'networkidle0' }); await sleep(900);
  await p.evaluate(() => { const r = document.querySelector('#statement').getBoundingClientRect(); scrollTo(0, scrollY + r.top - 60); });
  await sleep(6500); // intro done, in the steady state
  res[name] = await p.evaluate(() => { const R = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }; const sec = document.querySelector('#statement'); const sr = sec.getBoundingClientRect(); const rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - sr.left, r.top - sr.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }; return { section: R(sec).slice(2), txt: rel(document.querySelector('.stm-txt')), lines: [...document.querySelectorAll('.stm-ln')].map(rel), slot: rel(document.querySelector('.stm-slot')), fixed: [...document.querySelectorAll('.stm-txt .stm-w:not(.stm-lw)')].map(rel), fs: getComputedStyle(document.querySelector('.stm-txt')).fontSize, counter: document.querySelector('.stm-count') ? rel(document.querySelector('.stm-count')) : null }; });
  await p.close();
}
fs.writeFileSync(out, JSON.stringify(res, null, 1)); console.log('saved', out);
await b.close();
