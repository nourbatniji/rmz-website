import puppeteer from 'puppeteer-core';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const R=[]; const ok=(n,x,i='')=>{R.push(x);console.log(x?'PASS':'FAIL',n,i)};
const decode=(p,bi)=>p.evaluate((bi)=>{const cs=[...document.querySelectorAll('section[aria-label="Introduction"] canvas')];const ribs=cs.length/3;const out=[];
 for(let i=0;i<ribs;i++){const c=cs[i*3+bi];const g=c.getContext('2d');const dpr=c.height/780;let id=0;for(let k=0;k<7;k++){const y=Math.round(((300+k*14+7)*0.9-60)*dpr);const px=g.getImageData(Math.floor(c.width/2),y,1,1).data;if((px[0]+px[1]+px[2])/3>110)id|=1<<k;}out.push(id);}return [...new Set(out)];},bi);
const st=p=>p.evaluate(()=>window.__rmzHero());
async function page(opts={}){const p=await b.newPage();await p.setViewport({width:1440,height:900});if(opts.rm)await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);if(opts.pre)await opts.pre(p);await p.goto('http://localhost:3113/',{waitUntil:'networkidle0'});await sleep(800);return p;}
// A fresh load: first automatic change ≈5s
{const p=await page(); const a0=(await st(p)).active; let t=null; const t0=Date.now(); while(Date.now()-t0<9000){await sleep(50); if((await st(p)).active!==a0){t=await p.evaluate(()=>Math.round(performance.now()));break;}}
 ok('fresh load: first automatic change ≈5s after the page mounted (measured from navigation start)', t>4800&&t<6300, t+'ms'); await p.close();}
// reduced motion starts paused, no rib transition
{const p=await page({rm:true}); const a0=(await st(p)).active; await sleep(7500); const lbl=await p.$eval('button[aria-label$="automatic banner changes"]',e=>e.getAttribute('aria-label'));
 ok('reduced motion: starts paused, no auto change in 7.5s', (await st(p)).active===a0 && lbl.startsWith('Resume'), lbl); await p.close();}
// tab hidden pauses
{const p=await page(); await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));}); const a0=(await st(p)).active; await sleep(8000);
 ok('hidden tab: no automatic change in 8s', (await st(p)).active===a0);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));}); const t0=Date.now(); let t=null; while(Date.now()-t0<8000){await sleep(100); if((await st(p)).active!==a0){t=Date.now()-t0;break;}}
 ok('tab visible again: timer restarts (≈5s)', t>4500&&t<5800, t+'ms'); await p.close();}
// failed frames keep last valid frame (photographic banner 1: identity frames 14-25 blocked); unusable sequence -> poster
{const p=await page({pre:async p=>{await p.setRequestInterception(true);p.on('request',r=>{const u=r.url(); const m=u.match(/identity\/frame-(1[4-9]|2[0-5])\.webp/); if(m) return r.abort(); if(/banner-2\/\d+\.webp/.test(u)) return r.abort(); r.continue();});}});
 await p.click('button[aria-label$="automatic banner changes"]');
 await p.evaluate(async()=>{ window.__refs=await Promise.all(Array.from({length:13},(_,i)=>i+1).map(async n=>{const im=new Image();im.src=`/media/hero/identity/frame-${String(n).padStart(2,'0')}.webp`;await im.decode();return im;}));
  window.__match=(bi)=>{const cs=[...document.querySelectorAll('section[aria-label="Introduction"] canvas')];const ribs=cs.length/3;const c0=cs[bi],rw=c0.width,ch=c0.height,cw=rw*ribs;
   const refc=window.__refs.map(im=>{const k=Math.max(cw/im.naturalWidth,ch/im.naturalHeight);const cc=document.createElement('canvas');cc.width=cw;cc.height=ch;const g=cc.getContext('2d');g.fillStyle='#0F0F0E';g.fillRect(0,0,cw,ch);const dw=im.naturalWidth*k,dh=im.naturalHeight*k;g.drawImage(im,(cw-dw)/2,(ch-dh)/2,dw,dh);return g.getImageData(0,0,cw,ch).data;});
   const per=[];for(let i=0;i<ribs;i++){const c=cs[i*3+bi];const d=c.getContext('2d').getImageData(0,0,rw,ch).data;const sc=refc.map(()=>0);let n=0;for(let y=0;y<ch;y+=6)for(let x=0;x<rw;x+=3){const o=(y*rw+x)*4;const ro=(y*cw+i*rw+x)*4;n++;const lum=(d[o]+d[o+1]+d[o+2])/3;refc.forEach((r,k)=>{sc[k]+=Math.abs(lum-(r[ro]+r[ro+1]+r[ro+2])/3);});}const avg=sc.map(v=>v/n);const so=[...avg].sort((a,b)=>a-b);if(so[1]-so[0]>1.2)per.push(avg.indexOf(so[0])+1);}return [...new Set(per)];};});
 await p.evaluate(()=>scrollTo(0,450)); await sleep(1500); // B1 wants frame 16 of 25; frames 14..25 are blocked → the LAST RENDERED frame stays
 const s=await st(p); const d=await p.evaluate(()=>window.__match(0));
 ok('failed frames: banner keeps the last rendered frame (no blank)', d.length===1 && d[0]>=1 && d[0]<=13, `wanted ${s.frames[0]+1}, showing ${d}`);
 await p.click('[role=group] button:nth-child(2)'); await sleep(2300); const d2=await decode(p,1);
 ok('banner with unusable sequence falls back to its poster (frame-1 art), not blank', d2.length===1 && d2[0]===1, 'showing id '+d2); await p.close();}
console.log(R.every(Boolean)?'ALL PASS':'SOME FAIL'); await b.close();
