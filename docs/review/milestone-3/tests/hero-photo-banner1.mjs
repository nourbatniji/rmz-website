import puppeteer from 'puppeteer-core';
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const D=720, N=6;
const tri=y=>{const t=Math.max(0,y)/D,m=t%2;return m<=1?m:2-m;}; const expIdx=y=>Math.round(tri(y)*(N-1));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p=await b.newPage(); await p.setViewport({width:1440,height:1300}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:3113/',{waitUntil:'networkidle0'}); await sleep(1000);
// load references once (same cover crop as the engine), expose matcher
await p.evaluate(async()=>{ window.__refs=await Promise.all([1,2,3,4,5,6].map(async n=>{const im=new Image();im.src=`/media/hero/cloche/00${n}.webp`;await im.decode();return im;})); 
 window.__match=(bi)=>{const cs=[...document.querySelectorAll('section canvas')];const ribs=cs.length/3;const c0=cs[bi],rw=c0.width,ch=c0.height,cw=rw*ribs;
  const refc=window.__refs.map(im=>{const k=Math.max(cw/im.naturalWidth,ch/im.naturalHeight);const cc=document.createElement('canvas');cc.width=cw;cc.height=ch;const g=cc.getContext('2d');g.fillStyle='#0F0F0E';g.fillRect(0,0,cw,ch);const dw=im.naturalWidth*k,dh=im.naturalHeight*k;g.drawImage(im,(cw-dw)/2,(ch-dh)/2,dw,dh);return g.getImageData(0,0,cw,ch).data;});
  const perRib=[],diffs=[];
  for(let i=0;i<ribs;i++){const c=cs[i*3+bi];const d=c.getContext('2d').getImageData(0,0,rw,ch).data;const sc=refc.map(()=>0);let n=0;
   for(let y=0;y<ch;y+=6)for(let x=0;x<rw;x+=3){const o=(y*rw+x)*4;const ro=(y*cw+i*rw+x)*4;n++;const lum=(d[o]+d[o+1]+d[o+2])/3;refc.forEach((r,k)=>{sc[k]+=Math.abs(lum-(r[ro]+r[ro+1]+r[ro+2])/3);});}
   const avg=sc.map(v=>v/n);const sorted=[...avg].sort((a,b)=>a-b);const best=avg.indexOf(sorted[0]);const margin=sorted[1]-sorted[0];if(margin>1.2){perRib.push(best);diffs.push(sorted[0]);}}
  return {idx:[...new Set(perRib)],n:perRib.length,diff:diffs.length?Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length*10)/10:-1};};});
const st=()=>p.evaluate(()=>window.__rmzHero()); const match=(bi)=>p.evaluate(bi=>window.__match(bi),bi);
const goto=async(y,w=450)=>{await p.evaluate(y=>scrollTo(0,y),y);await sleep(w);};
let pass=0,tot=0; const ok=(n,x,i='')=>{tot++;if(x)pass++;console.log(x?'PASS':'FAIL',n,i)};
await p.click('button[aria-label$="automatic banner changes"]'); // pause auto for the photographic banner
let s=await st(); ok('banner 1 (photo) selected by default', s.active===0 && s.counts[0]===6, JSON.stringify(s.counts));
await goto(0,900); let m=await match(0); ok('page top: lid closed = frame 1 on every rib', m.idx.length===1&&m.idx[0]===0&&m.n>=8, `idx ${m.idx} informative ribs ${m.n}/30 meanLumaDiff ${m.diff}`);
// scroll down slowly 0→1260 step 12
const down=[],bad=[]; const ys=[]; for(let y=0;y<=1260;y+=12) ys.push(y);
for(const y of ys){await goto(y,80); const mm=await match(0); const f=mm.idx.length===1?mm.idx[0]:-1; down.push(f); if(f!==expIdx(y)) bad.push(`${y}:${f}≠${expIdx(y)}`);} await sleep(300);
ok('slow scroll: every step shows the expected keyframe on ALL ribs (106 samples)', bad.length===0, bad.slice(0,5).join(' '));
const seen=[...new Set(down)]; ok('opening passes through all 6 keyframes in order 1→6', JSON.stringify(seen.slice(0,6))==='[0,1,2,3,4,5]', 'sequence seen: '+down.filter((v,i)=>i===0||v!==down[i-1]).map(v=>v+1).join('→'));
ok('ping-pong: peak frame 6 at y=720, then 5 (no jump to frame 1)', down[ys.indexOf(720)]===5 && down[ys.indexOf(732)]===5 && down[ys.indexOf(840)]===4, `y=720:${down[ys.indexOf(720)]+1} y=840:${down[ys.indexOf(840)]+1} y=1260:${down[down.length-1]+1}`);
// no jump anywhere
let mx=0;for(let i=1;i<down.length;i++)mx=Math.max(mx,Math.abs(down[i]-down[i-1])); ok('never skips more than one keyframe between 12px samples', mx<=1, 'max step '+mx);
// hold
await goto(300); const h1=(await match(0)).idx[0]; await sleep(2500); const h2=(await match(0)).idx[0]; ok('stop → frame holds', h1===h2, `frame ${h1+1}`);
// reverse retrace
const rb=[]; for(let i=ys.length-1;i>=0;i--){await goto(ys[i],80); const mm=await match(0); if(mm.idx[0]!==down[i]||mm.idx.length!==1) rb.push(ys[i]);}
ok('scroll up retraces exactly the same frames (incl. across the boundary)', rb.length===0, rb.slice(0,5).join(','));
await goto(0,800); m=await match(0); ok('back at top: lid closed again (frame 1)', m.idx[0]===0&&m.idx.length===1);
// crop/position stability: match diff small for every keyframe (== identical to reference cover-crop)
const dif=[]; for(const y of [0,144,288,432,576,720]){await goto(y,500); dif.push((await match(0)).diff);} ok('fixed crop: each painted frame matches its reference cover-crop (mean luma diff low, same for all frames)', Math.max(...dif)-Math.min(...dif)<2.5 && Math.max(...dif)<14, 'diffs '+dif.join(', '));
// other banners untouched (dev sequences)
await goto(0,500); for(const bi of [1,2]){ await p.click(`[role=group] button:nth-child(${bi+1})`); await sleep(2300); const r=await p.evaluate((bi)=>{const cs=[...document.querySelectorAll('section canvas')];const ribs=cs.length/3;const out=new Set();for(let i=0;i<ribs;i++){const c=cs[i*3+bi];const g=c.getContext('2d');const cw=c.width*ribs,ch=c.height;const k=Math.max(cw/1600,ch/1000);let id=0;for(let q=0;q<7;q++){const y=Math.round((300+q*14+7)*k-(1000*k-ch)/2);const px=g.getImageData(Math.floor(c.width/2),y,1,1).data;if((px[0]+px[1]+px[2])/3>110)id|=1<<q;}out.add(id);}return [...out];},bi); ok(`banner ${bi+1} dev sequence preserved (frame 1 at top)`, r.length===1&&r[0]===1, 'id '+r); }
await p.click('[role=group] button:nth-child(1)'); await sleep(2300);
// resume auto: full cycle
await p.click('button[aria-label$="automatic banner changes"]'); const t0=Date.now(); let last=(await st()).active; const ev=[];
while(Date.now()-t0<22000){await sleep(100);const a=(await st()).active;if(a!==last){ev.push(a+1);last=a;}}
ok('auto switching resumes: cycle continues 2→3→1', ev.slice(0,3).join('→')==='2→3→1', ev.join('→'));
await goto(300,600); await sleep(0); ok('real wheel scrolling still works', await (async()=>{await p.mouse.move(700,300);const y0=await p.evaluate(()=>scrollY);await p.mouse.wheel({deltaY:300});await sleep(600);return (await p.evaluate(()=>scrollY))>y0;})());
console.log(errs.length?'ERRORS '+errs:'no page errors'); console.log(`\n${pass}/${tot} passed`); await b.close(); process.exit(pass===tot?0:1);
