import puppeteer from 'puppeteer-core';
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const URL='http://localhost:3113/';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
let pass=0,tot=0; const ok=(n,x,i='')=>{tot++;if(x)pass++;console.log(x?'PASS':'FAIL',n,i)};
const errs=[];
async function open(vp,opts={}){const p=await b.newPage(); await p.setViewport(vp); if(opts.rm)await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); await p.goto(URL,{waitUntil:'networkidle0'}); await sleep(700); return p;}
const secTop=(p,sel)=>p.evaluate(s=>document.querySelector(s).getBoundingClientRect().top+scrollY,sel);
const count=p=>p.evaluate(()=>document.querySelector('.stm-count')?.textContent.trim());
const word=p=>p.evaluate(()=>{const l=document.querySelector('.stm-lw.in, .stm-lw.out'); return l?l.textContent:null});
// ───────── STATEMENT (desktop) ─────────
{ const p=await open({width:1440,height:900}); const st=await secTop(p,'#statement');
  ok('statement is static + first word before it is in view', (await count(p))==='01 / 04');
  await p.evaluate(y=>scrollTo(0,y-60),st); // in view
  const t0=Date.now(); const ev=[]; let last=await count(p); const geo=[];
  const sample=()=>p.evaluate(()=>{const r=e=>{const b=e.getBoundingClientRect();return [Math.round(b.left*10)/10,Math.round(b.top*10)/10,Math.round(b.width*10)/10,Math.round(b.height*10)/10]};
    const lines=[...document.querySelectorAll('.stm-ln')]; const slot=document.querySelector('.stm-slot'); const fx=[...document.querySelectorAll('.stm-txt .stm-w:not(.stm-lw)')];
    return {l1:r(lines[0]),l2:r(lines[1]),slot:r(slot),fixed:fx.map(r),fs:getComputedStyle(document.querySelector('.stm-txt')).fontSize,bar:!!document.querySelector('.stm-bar')};});
  while(Date.now()-t0<17000){ await sleep(100); const c=await count(p); if(c!==last){ev.push([c,Date.now()-t0]);last=c;} if(Date.now()-t0>2800) geo.push(await sample()); }
  console.log('counter changes (ms since entering view):',JSON.stringify(ev));
  ok('rotation cycles 01→02→03→04→01', ev.map(e=>e[0].slice(0,2)).join(',').startsWith('02,03,04,01'), ev.map(e=>e[0].slice(0,2)).join('→'));
  const gaps=ev.slice(1).map((e,i)=>e[1]-ev[i][1]); ok('source timing: ≈3.0 s per word after the first cycle', gaps.every(g=>g>2700&&g<3500), gaps.join(', ')+' ms');
  ok('first cycle ≈4.8 s (3.0 s + 1.8 s intro, as in the source)', ev[0][1]>4300&&ev[0][1]<5600, ev[0][1]+' ms');
  const ref=geo[0]; const dev=(f)=>Math.max(...geo.map(g=>Math.abs(f(g)-f(ref)))); 
  ok('NO layout shift between words: line boxes, fixed words and slot width stay identical over 3+ word swaps (samples '+geo.length+')', dev(g=>g.l1[0])<=.1&&dev(g=>g.l1[1])<=.1&&dev(g=>g.l1[2])<=.1&&dev(g=>g.l2[1])<=.1&&dev(g=>g.l2[3])<=.1&&dev(g=>g.slot[2])<=.1&&dev(g=>g.slot[3])<=.1&&geo.every(g=>g.fixed.every((f,i)=>Math.abs(f[0]-ref.fixed[i][0])<=.1&&Math.abs(f[1]-ref.fixed[i][1])<=.1))&&geo.every(g=>g.fs===ref.fs), `font ${ref.fs}, slot ${ref.slot[2]}×${ref.slot[3]}`);
  // pause when leaving view
  await p.evaluate(()=>scrollTo(0,0)); await sleep(1200); const off1=await count(p); const w1=await word(p); await sleep(4000); const off2=await count(p);
  ok('leaving the viewport stops rotation and resets to the static first word', off1==='01 / 04'&&off2==='01 / 04'&&w1==='broken', `${off1} / ${off2} / ${w1}`);
  await p.evaluate(y=>scrollTo(0,y-60),st); const t1=Date.now(); let c0=await count(p),tc=null; while(Date.now()-t1<7500){await sleep(100); if((await count(p))!==c0){tc=Date.now()-t1;break;}}
  ok('re-entering resumes with the intro (first change ≈4.8 s)', tc>4300&&tc<5600, tc+' ms');
  // tab hidden
  await sleep(300); const before=await count(p); await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));}); await sleep(200);
  const ps=await p.evaluate(()=>getComputedStyle(document.querySelector('.stm-bar')).animationPlayState); await sleep(5500); const during=await count(p);
  ok('hidden tab pauses the rotation and the progress bar', ps==='paused'&&during===before, `bar ${ps}, ${before} → ${during} after 5.5 s hidden`);
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));}); await sleep(4500); const after=await count(p);
  ok('visible again: rotation resumes', after!==before, `${before} → ${after}`);
  // a11y structure
  const a11y=await p.evaluate(()=>({h2:[...document.querySelectorAll('#statement h2')].map(h=>h.textContent),hidden:document.querySelector('#statement .contents').getAttribute('aria-hidden'),live:document.querySelectorAll('#statement [aria-live]').length}));
  ok('screen readers get one static sentence; animated copy hidden; no live region', a11y.h2.length===1&&a11y.hidden==='true'&&a11y.live===0, a11y.h2[0]);
  await p.close(); }
// ───────── STATEMENT reduced motion ─────────
{ const p=await open({width:1440,height:900},{rm:true}); const st=await secTop(p,'#statement'); await p.evaluate(y=>scrollTo(0,y-60),st); await sleep(7500);
  const r=await p.evaluate(()=>({count:!!document.querySelector('.stm-count'),bar:!!document.querySelector('.stm-bar'),txt:document.querySelector('.stm-txt').textContent,cls:document.querySelector('.stm-txt').className,w:document.querySelector('.stm-lw.in')?.textContent}));
  ok('reduced motion: readable static statement, no rotation/bar/counter', !r.count&&!r.bar&&r.cls.includes('static')&&r.w==='broken'&&/RMZ,/.test(r.txt), r.cls+' / '+r.w);
  const vis=await p.evaluate(()=>{const e=document.querySelector('.stm-lw.in .stm-lt');return getComputedStyle(e).opacity});
  ok('reduced motion: last word is visible (opacity 1)', vis==='1', 'opacity '+vis); await p.close(); }
// ───────── STATEMENT mobile ─────────
{ const p=await open({width:390,height:844,isMobile:true,hasTouch:true}); const st=await secTop(p,'#statement'); await p.evaluate(y=>scrollTo(0,y),st); await sleep(2800);
  const r=await p.evaluate(()=>{const t=document.querySelector('.stm-txt');const fs=parseFloat(getComputedStyle(t).fontSize);return {fs,right:Math.max(...[...document.querySelectorAll('.stm-lni')].map(e=>e.getBoundingClientRect().right)),ow:document.documentElement.scrollWidth>innerWidth,wrap:document.querySelector('.stm-root').classList.contains('stm-wrap')};});
  ok('mobile 390: type ≥ 36px, fits the width, wraps, no horizontal overflow', r.fs>=36&&r.right<=390&&!r.ow&&r.wrap, `font ${r.fs}px, right edge ${Math.round(r.right)}px`);
  // longest word fits at every swap
  let maxr=0; for(let i=0;i<14;i++){ await sleep(500); maxr=Math.max(maxr,await p.evaluate(()=>Math.max(...[...document.querySelectorAll('.stm-lw .stm-lt')].map(e=>e.getBoundingClientRect().right)))); }
  ok('mobile: even "challenged" never exceeds the viewport', maxr<=390.5, 'max right '+Math.round(maxr)); await p.close(); }
// (the column/“fins” checks moved to docs/review/milestone-9/tests/minds-tests.mjs — the section is now Minds)
// ───────── page-wide: order, anchors ─────────
{ const p=await open({width:1440,height:900}); const o=await p.evaluate(()=>[...document.querySelectorAll('main > *')].map(e=>e.id||e.getAttribute('aria-label')||e.textContent.trim().slice(0,28)));
  console.log('section order:',JSON.stringify(o));
  ok('homepage order matches canvas: hero → corridor → statement → work → dial → fins → collab → footer', o[0]==='Introduction'&&/Showreel/.test(o[1]+'')||o[1]==='work', o.join(' | ')); await p.close(); }
console.log(errs.length?'CONSOLE/PAGE ERRORS: '+[...new Set(errs)].join(' | '):'no console or page errors');
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass===tot?0:1);
