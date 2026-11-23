import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
// usage: node hero-handoff-check.mjs <outdir> — (1) the hero after the opening is pixel-identical to the normal (skipped) hero; (2) the first regular banner transition afterwards is correct.
const out = process.argv[2]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + d}`); };
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const URL = 'http://localhost:3111/lab/hero-three-worlds';
const frame = (p) => p.screenshot({ type: 'jpeg', quality: 10 }).catch(() => {});
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
await p.goto(URL, { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 100; i++) { await frame(p); if (await p.evaluate(() => document.querySelector('.hw-root').dataset.open === 'done')) break; await sleep(30); }
await sleep(300); await frame(p); const doneAt = Date.now();
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Pause automatic/.test(x.ariaLabel || ''))?.click()); await sleep(250); await frame(p);
await p.screenshot({ path: `${out}/_after-opening.png` });
await p.goto(URL, { waitUntil: 'networkidle0' }); await sleep(1600); await frame(p); // same tab → skipped: the normal hero
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Pause automatic/.test(x.ariaLabel || ''))?.click()); await sleep(300);
await p.screenshot({ path: `${out}/_normal.png` });
const diff = execFileSync('python3', ['-c', `
from PIL import Image, ImageChops
a=Image.open('${out}/_after-opening.png').convert('RGB'); b=Image.open('${out}/_normal.png').convert('RGB')
# the pause/resume label differs only if the pause state differs; compare the whole frame, ignoring nothing
d=ImageChops.difference(a,b); bb=d.getbbox(); import sys
px=sum(1 for v in d.convert('L').getdata() if v>6)
print(px, bb)`]).toString().trim();
const [px, bbox] = [parseInt(diff), diff.slice(diff.indexOf(' ') + 1)];
ok('final composition after the opening is pixel-identical to the normal hero (≤ 50 px differ by >2 %)', px <= 50, `diff px=${px} bbox=${bbox}`);
await p.close();
// first regular transition after an opening
const q = await b.newPage(); await q.setViewport({ width: 1440, height: 900 }); await q.goto(URL, { waitUntil: 'domcontentloaded' });
const log = []; const t0 = Date.now();
while (Date.now() - t0 < 11000) { await frame(q); log.push(await q.evaluate(() => ({ t: Math.round(performance.now()), open: document.querySelector('.hw-root').dataset.open, st: [...document.querySelectorAll('.hw-phrase')].map((x) => x.dataset.state).join(), c: document.body.innerText.match(/0\d \/ 03/)?.[0], tr: [...document.querySelectorAll('.hw-rib')].slice(0, 1).map((r) => r.style.transform)[0], tl: getComputedStyle(document.querySelector('.hw-rib')).translate, sc: getComputedStyle(document.querySelector('.hw-ribs')).scale, lead: document.querySelector('.hw-phrase[data-state=active] .hw-line.t-display > span').textContent }))); await sleep(50); }
const done = log.find((x) => x.open === 'done'), sw = log.find((x) => x.c === '02 / 03');
ok('first automatic change comes ≈5 s after the opening finished (not before)', done && sw && sw.t - done.t >= 4600 && sw.t - done.t <= 5900, `${sw && done && sw.t - done.t} ms`);
const mid = log.filter((x) => x.c === '02 / 03');
ok('the transition is the normal one: old phrase out, new phrase in, ribs rotate to -120°', mid.some((x) => /out/.test(x.st)) && mid.at(-1).st === 'idle,active,idle' && /IMPOSSIBLE/.test(mid.at(-1).lead) && /-120deg/.test(mid.at(-1).tr), JSON.stringify(mid.at(-1)));
ok('no opening residue after the handoff (translate none, scale none)', log.filter((x) => x.open === 'done').every((x) => x.tl === 'none' && x.sc === 'none'), JSON.stringify(log.filter((x) => x.open === 'done').find((x) => x.tl !== 'none' || x.sc !== 'none')));
await b.close(); console.log(`${pass}/${pass + fail} passed`);
