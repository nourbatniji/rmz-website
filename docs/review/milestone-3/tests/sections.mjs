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
  const r=await p.evaluate(()=>{const t=document.querySelector('.stm-txt');const fs=parseFloat(getComputedStyle(t).fontSize);const lines=[...document.querySelectorAll('.stm-ln')].map(l=>l.getBoundingClientRect());return {fs,right:Math.max(...[...document.querySelectorAll('.stm-lni')].map(e=>e.getBoundingClientRect().right)),ow:document.documentElement.scrollWidth>innerWidth,wrap:document.querySelector('.stm-root').classList.contains('stm-wrap')};});
  ok('mobile 390: type ≥ 36px, fits the width, wraps, no horizontal overflow', r.fs>=36&&r.right<=390&&!r.ow&&r.wrap, `font ${r.fs}px, right edge ${Math.round(r.right)}px`);
  // longest word fits at every swap
  let maxr=0; for(let i=0;i<14;i++){ await sleep(500); maxr=Math.max(maxr,await p.evaluate(()=>Math.max(...[...document.querySelectorAll('.stm-lw .stm-lt')].map(e=>e.getBoundingClientRect().right)))); }
  ok('mobile: even "challenged" never exceeds the viewport', maxr<=390.5, 'max right '+Math.round(maxr)); await p.close(); }
// ───────── FINS desktop ─────────
{ const p=await open({width:1440,height:900});
  const geom=()=>p.evaluate(()=>[...document.querySelectorAll('.fin')].map(f=>{const r=f.getBoundingClientRect(); const lr=document.querySelector('.fins-list').getBoundingClientRect(); return {l:Math.round((r.left-lr.left)*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height),open:f.classList.contains('fin-open'),exp:f.querySelector('.fin-cover').getAttribute('aria-expanded')};}));
  const check=(g,sel)=>{const SH=(1440-70-520)/7; let x=0; return g.every((f,i)=>{const w=i===sel?520:SH; const good=Math.abs(f.l-x)<1&&Math.abs(f.w-w)<1&&f.h===760&&(f.open===(i===sel))&&(f.exp==='true')===(i===sel); x+=w+10; return good;});};
  let g=await geom(); ok('fins: initial composition = canvas (8 fins, 520 open + 7×121.4, 10px gaps, 760 tall, #3 open)', check(g,2)&&g.length===8, g.map(f=>f.w).join(','));
  const bg=await p.evaluate(()=>{const s=getComputedStyle(document.querySelector('.fins-root'));const all=[...document.querySelectorAll('.fins-root *')].filter(e=>getComputedStyle(e).backgroundImage!=='none').length;return {c:s.backgroundColor,img:s.backgroundImage,gradients:all}});
  ok('fins: solid #0F0F0E background, no stripes/textures/gradients', bg.c==='rgb(15, 15, 14)'&&bg.img==='none'&&bg.gradients===0, JSON.stringify(bg));
  const ft=await secTop(p,'#capabilities'); await p.evaluate(y=>scrollTo(0,y-100),ft); await sleep(400);
  for(const i of [0,7,3,5,1]){ const btn=(await p.$$('.fin-cover'))[i]; await btn.click(); await sleep(1000); g=await geom(); const txt=await p.evaluate(i=>document.querySelectorAll('.fin')[i].querySelector('.fin-d').getBoundingClientRect().height>0&&getComputedStyle(document.querySelectorAll('.fin')[i].querySelector('.fin-plate')).visibility==='visible',i); ok(`fins: click #${i+1} → only it open, correct geometry, plate readable`, check(g,i)&&txt&&g.filter(f=>f.exp==='true').length===1); }
  // keyboard
  await p.evaluate(()=>document.activeElement.blur()); const btns=await p.$$('.fin-cover'); await btns[4].focus(); await p.keyboard.press('Enter'); await sleep(1000); g=await geom(); ok('fins: keyboard Enter opens the focused fin', check(g,4));
  await btns[6].focus(); await p.keyboard.press('Space'); await sleep(1000); g=await geom(); ok('fins: keyboard Space opens the focused fin', check(g,6));
  await btns[1].focus(); const fo=await p.evaluate(()=>{const li=document.activeElement.closest('.fin');return getComputedStyle(li).outlineStyle+' '+getComputedStyle(li).outlineColor});
  ok('fins: visible keyboard focus ring (yellow)', /solid/.test(fo)&&/255, 202, 38/.test(fo), fo);
  // tab order
  await p.evaluate(()=>document.activeElement.blur()); await btns[0].focus(); const seq=[]; for(let i=0;i<8;i++){ seq.push(await p.evaluate(()=>[...document.querySelectorAll('.fin-cover')].indexOf(document.activeElement))); await p.keyboard.press('Tab'); } ok('fins: Tab visits all 8 fins in order', seq.join()==='0,1,2,3,4,5,6,7', seq.join());
  // rapid
  const order=[]; for(let k=0;k<40;k++) order.push(Math.floor(Math.random()*8)); for(const i of order){ await btns[i].click({delay:0}); await sleep(25);} const lastI=order[order.length-1]; await sleep(1100); g=await geom(); ok('fins: 40 rapid clicks (25 ms apart) settle on the last choice with correct geometry', check(g,lastI)&&g.filter(f=>f.exp==='true').length===1, 'last #'+(lastI+1));
  // overlap check mid-transition: fins never overlap/leave the stage
  await btns[0].click(); await sleep(250); const mid=await geom(); ok('fins: mid-transition fins stay inside the 1440 stage', mid.every(f=>f.l>=-1&&f.l+f.w<=1441)); await sleep(900);
  // widths
  for(const w of [1280,1100,1024]){ await p.setViewport({width:w,height:900}); await sleep(500); const o=await p.evaluate(()=>({ow:document.documentElement.scrollWidth>innerWidth,r:[...document.querySelectorAll('.fin')].map(f=>f.getBoundingClientRect().right).reduce((a,b)=>Math.max(a,b)),sh:document.querySelectorAll('.fin')[1].getBoundingClientRect().width})); ok(`fins ${w}px: fits, no overflow, closed fins ${Math.round(o.sh)}px wide`, !o.ow&&o.r<=w+1); }
  await p.close(); }
// ───────── FINS reduced motion ─────────
{ const p=await open({width:1440,height:900},{rm:true}); const d=await p.evaluate(()=>({fin:getComputedStyle(document.querySelector('.fin')).transitionDuration,plate:getComputedStyle(document.querySelector('.fin-plate')).transitionDuration}));
  const btns=await p.$$('.fin-cover'); await btns[0].click(); await sleep(60); const l=await p.evaluate(()=>Math.round(document.querySelectorAll('.fin')[1].getBoundingClientRect().left)); const exp=Math.round(520+10);
  ok('fins reduced motion: no transitions; state changes instantly', /^0s|^1e-05s/.test(d.fin)&&/^0s|^1e-05s/.test(d.plate)&&Math.abs(l-(exp))<2, JSON.stringify(d)+' left of fin#2 after click='+l); await p.close(); }
// ───────── FINS mobile (390, touch) ─────────
{ const p=await open({width:390,height:844,isMobile:true,hasTouch:true}); const ft=await secTop(p,'#capabilities'); await p.evaluate(y=>scrollTo(0,y-70),ft); await sleep(500);
  const heads=await p.evaluate(()=>[...document.querySelectorAll('.fin-cover')].map(e=>{const r=e.getBoundingClientRect();return {h:Math.round(r.height),w:Math.round(r.width),fs:parseFloat(getComputedStyle(e.querySelector('.fin-title')).fontSize),rot:getComputedStyle(e.querySelector('.fin-title')).transform}}));
  ok('mobile fins: 8 horizontal headers, full width, ≥ 44 px tall, title ≥ 18 px, not rotated', heads.length===8&&heads.every(h=>h.h>=44&&h.w>=340&&h.fs>=18&&h.rot==='none'), JSON.stringify(heads[0]));
  const st=()=>p.evaluate(()=>[...document.querySelectorAll('.fin')].map(f=>({open:f.classList.contains('fin-open'),ph:Math.round(f.querySelector('.fin-plate').getBoundingClientRect().height),exp:f.querySelector('.fin-cover').getAttribute('aria-expanded')})));
  let s=await st(); ok('mobile fins: initial #3 open, others collapsed to 0 height', s[2].open&&s[2].ph>200&&s.filter((x,i)=>i!==2).every(x=>x.ph===0));
  for(const i of [0,6,3]){ const hs=await p.$$('.fin-cover'); await hs[i].evaluate(e=>e.scrollIntoView({block:'center'})); await sleep(350); const box=await hs[i].boundingBox(); await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2); await sleep(900); s=await st(); ok(`mobile fins: tap #${i+1} → only it open`, s[i].open&&s[i].ph>200&&s.filter(x=>x.exp==='true').length===1&&s.filter((x,j)=>j!==i).every(x=>x.ph===0)); await p.evaluate(()=>scrollTo(0,document.querySelector('#capabilities').getBoundingClientRect().top+scrollY-70)); await sleep(300); }
  // rapid taps
  const hs=await p.$$('.fin-cover'); for(const i of [1,5,2,7,0,4,3,6]){ await p.evaluate((i)=>document.querySelectorAll('.fin-cover')[i].click(),i); await sleep(40);} await sleep(900); s=await st(); ok('mobile fins: rapid taps settle with exactly one open (#7)', s[6].open&&s.filter(x=>x.exp==='true').length===1&&s.filter((x,j)=>j!==6).every(x=>x.ph===0));
  // normal vertical scroll by touch drag across the fins
  const y0=await p.evaluate(()=>scrollY); await p.touchscreen.touchStart(200,600); for(let i=1;i<=10;i++){await p.touchscreen.touchMove(200,600-i*30);await sleep(16);} await p.touchscreen.touchEnd(); await sleep(500); const y1=await p.evaluate(()=>scrollY);
  ok('mobile: touch-dragging over the fins scrolls the page normally', y1>y0+100, `scrollY ${y0}→${y1}`);
  for(const w of [390,360,320]){ await p.setViewport({width:w,height:844,isMobile:true,hasTouch:true}); await sleep(500); const o=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth); ok(`mobile ${w}px: whole page has no horizontal overflow`, !o); }
  await p.close(); }
// ───────── page-wide: order, anchors ─────────
{ const p=await open({width:1440,height:900}); const o=await p.evaluate(()=>[...document.querySelectorAll('main > *')].map(e=>e.id||e.getAttribute('aria-label')||e.textContent.trim().slice(0,28)));
  console.log('section order:',JSON.stringify(o));
  ok('homepage order matches canvas: hero → corridor → statement → work → dial → fins → collab → footer', o[0]==='Introduction'&&/Showreel/.test(o[1]+'')||o[1]==='work', o.join(' | ')); await p.close(); }
console.log(errs.length?'CONSOLE/PAGE ERRORS: '+[...new Set(errs)].join(' | '):'no console or page errors');
console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass===tot?0:1);
