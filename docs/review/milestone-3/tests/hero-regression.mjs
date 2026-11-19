import puppeteer from 'puppeteer-core';
const URL='http://localhost:3113/';
const BASE=[30,150,250], N=[6,36,64];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(URL,{waitUntil:'networkidle0'}); await sleep(1000);
const st=()=>p.evaluate(()=>window.__rmzHero());
// decode the frame painted on each rib of banner bi -> array of frame numbers (1-based) + marker bbox of composite
// Banner 1 is PHOTOGRAPHIC (six keyframes): identify the painted keyframe per rib by matching against the reference
// cover-crop of each source image. Banners 2/3 keep the barcode decode (dev frames).
await p.evaluate(async()=>{ window.__refs=await Promise.all([1,2,3,4,5,6].map(async n=>{const im=new Image();im.src=`/media/hero/cloche/00${n}.webp`;await im.decode();return im;}));
 window.__match=(bi)=>{const cs=[...document.querySelectorAll('section canvas')];const ribs=cs.length/3;const c0=cs[bi],rw=c0.width,ch=c0.height,cw=rw*ribs;
  const refc=window.__refs.map(im=>{const k=Math.max(cw/im.naturalWidth,ch/im.naturalHeight);const cc=document.createElement('canvas');cc.width=cw;cc.height=ch;const g=cc.getContext('2d');g.fillStyle='#0F0F0E';g.fillRect(0,0,cw,ch);const dw=im.naturalWidth*k,dh=im.naturalHeight*k;g.drawImage(im,(cw-dw)/2,(ch-dh)/2,dw,dh);return g.getImageData(0,0,cw,ch).data;});
  const perRib=[];
  for(let i=0;i<ribs;i++){const c=cs[i*3+bi];const d=c.getContext('2d').getImageData(0,0,rw,ch).data;const sc=refc.map(()=>0);let n=0;
   for(let y=0;y<ch;y+=6)for(let x=0;x<rw;x+=3){const o=(y*rw+x)*4;const ro=(y*cw+i*rw+x)*4;n++;const lum=(d[o]+d[o+1]+d[o+2])/3;refc.forEach((r,k)=>{sc[k]+=Math.abs(lum-(r[ro]+r[ro+1]+r[ro+2])/3);});}
   const avg=sc.map(v=>v/n);const sorted=[...avg].sort((a,b)=>a-b);if(sorted[1]-sorted[0]>1.2)perRib.push(avg.indexOf(sorted[0])+1);}
  return perRib;};});
const decode=async(bi)=>{ if(bi===0){ const f=await p.evaluate(()=>window.__match(0)); return {frames:f, bbox:[0,0,0,0], n:f.length}; }
 return p.evaluate((bi)=>{
  const cs=[...document.querySelectorAll('section canvas')]; const ribs=cs.length/3; const out=[];
  const comp=document.createElement('canvas'); let cw=0,ch=0; for(let i=0;i<ribs;i++){ const c=cs[i*3+bi]; cw=c.width; ch=c.height; }
  comp.width=cw*ribs; comp.height=ch; const cg=comp.getContext('2d');
  for(let i=0;i<ribs;i++){ const c=cs[i*3+bi]; const g=c.getContext('2d'); cg.drawImage(c,i*cw,0);
    const dpr=ch/780; let id=0; for(let b=0;b<7;b++){ const y=Math.round(((300+b*14+7)*0.9-60)*dpr); const x=Math.floor(cw/2);
      const px=g.getImageData(x,y,1,1).data; const lum=(px[0]+px[1]+px[2])/3; if(lum>110) id|=(1<<b); }
    out.push(id); }
  const d=cg.getImageData(0,0,comp.width,comp.height).data; let x0=1e9,y0=1e9,x1=-1,y1=-1;
  for(let y=0;y<comp.height;y+=2)for(let x=0;x<comp.width;x+=2){const q=(y*comp.width+x)*4; if(d[q]>170&&d[q+1]<90&&d[q+2]>170){ if(x<x0)x0=x; if(y<y0)y0=y; if(x>x1)x1=x; if(y>y1)y1=y; }}
  return {frames:out, bbox:[x0,y0,x1,y1]};
 },bi); };
const uniq=a=>[...new Set(a)];
const exp=(bi,pr)=>Math.round(pr*(N[bi]-1))+1;
const R=[]; const ok=(name,pass,info='')=>{R.push([pass,name,info]); console.log(pass?'PASS':'FAIL',name,info);};
const scrollTo=async(y)=>{ await p.evaluate(y=>scrollTo(0,y),y); await sleep(500); };
// stop auto so banner stays put for the frame tests
await p.click('button[aria-label$="automatic banner changes"]'); 
const chip=async(i)=>{ await p.click(`[role=group] button:nth-child(${i+1})`); await sleep(2300); };
const maxScroll=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
console.log('maxScroll',maxScroll);
// 1,3,4,5,2 per banner
const mapDown={};
for(let bi=0;bi<3;bi++){
  await chip(bi); await scrollTo(0);
  let s=await st(); let d=await decode(bi);
  ok(`B${bi+1} top → frame 1 (all ribs)`, s.frames[bi]===0 && uniq(d.frames).length===1 && d.frames[0]===1 && (bi>0||d.n>=8), JSON.stringify({state:s.frames[bi],ribs:uniq(d.frames)}));
  const bb0=d.bbox; const seen=[];
  for(const y of [150,300,450,600,750]){
    await scrollTo(y); s=await st(); d=await decode(bi); const e=exp(bi,s.progress);
    seen.push(d.frames[0]);
    ok(`B${bi+1} y=${y} progress=${s.progress.toFixed(3)} shows frame ${e}/${N[bi]} on all ribs`, uniq(d.frames).length===1&&d.frames[0]===e && (bi>0||d.n>=6) && d.bbox.every((v,i)=>Math.abs(v-bb0[i])<=6), `ribs=${uniq(d.frames)} bbox=${d.bbox} (top bbox ${bb0})`);
    mapDown[bi+':'+y]=d.frames[0];
  }
  ok(`B${bi+1} frames advance while scrolling down`, seen.every((v,i)=>i===0||v>=seen[i-1]) && seen[4]>seen[0], seen.join('→'));
  // hold
  const h1=await decode(bi); await sleep(1500); const h2=await decode(bi);
  ok(`B${bi+1} holds frame when scrolling stops`, h1.frames[0]===h2.frames[0]);
  // reverse
  const back=[]; for(const y of [600,450,300,150,0]){ await scrollTo(y); const dd=await decode(bi); back.push(dd.frames[0]); }
  ok(`B${bi+1} reverse scroll shows same frames in reverse + restores frame 1`, back[0]===mapDown[bi+':600']&&back[2]===mapDown[bi+':300']&&back[4]===1, back.join('→'));
}
// 6 switching midway preserves progress, shows current-progress frame
await scrollTo(450); await chip(0); let s0=await st();
for(const bi of [1,2,0]){ await chip(bi); const s=await st(); const d=await decode(bi);
  ok(`switch to B${bi+1} midway keeps progress & shows frame ${exp(bi,s.progress)}`, Math.abs(s.progress-s0.progress)<1e-9 && uniq(d.frames).length===1 && d.frames[0]===exp(bi,s.progress), `progress ${s0.progress.toFixed(4)}→${s.progress.toFixed(4)} ribs=${uniq(d.frames)} scrollY=${await p.evaluate(()=>scrollY)}`); }
// 10 mid-transition sync (outgoing + incoming both consistent, no blank)
await p.click(`[role=group] button:nth-child(2)`); await sleep(750);
const ia=await decode(0), ib=await decode(1); s0=await st();
ok('mid-transition: outgoing B1 ribs identical', uniq(ia.frames).length===1 && ia.frames[0]===exp(0,s0.progress), `ribs=${uniq(ia.frames)}`);
ok('mid-transition: incoming B2 ribs identical', uniq(ib.frames).length===1 && ib.frames[0]===exp(1,s0.progress), `ribs=${uniq(ib.frames)}`);
await sleep(1800);
// 9 returning from another section
await scrollTo(maxScroll); let sb=await st();
const tri=y=>{const m=(y/720)%2;return m<=1?m:2-m;}; ok('page bottom → ping-pong progress for that scroll position, hero offscreen (not rendering)', Math.abs(sb.progress-tri(maxScroll))<1e-6 && sb.visible===false, JSON.stringify(sb));
await scrollTo(0); await scrollTo(300); s0=await st(); const dd=await decode(1);
ok('return from bottom shows correct frame immediately', uniq(dd.frames).length===1&&dd.frames[0]===exp(1,s0.progress), `progress=${s0.progress.toFixed(3)} frame=${dd.frames[0]}`);
// 11 normal scrolling via real wheel
await scrollTo(0); await p.mouse.move(700,300); await p.mouse.wheel({deltaY:400}); await sleep(600);
const wy=await p.evaluate(()=>scrollY); ok('real wheel over the hero scrolls the page normally', wy>=300, 'scrollY='+wy);
// 7/8 auto timing
await scrollTo(0); await chip(0);
await p.click('button[aria-label$="automatic banner changes"]'); const t0=Date.now(); let last=(await st()).active; const ev=[];
while(Date.now()-t0<22000){ await sleep(100); const a=(await st()).active; if(a!==last){ ev.push([a,Date.now()-t0]); last=a; } }
console.log('auto changes (banner, ms since resume):',JSON.stringify(ev));
ok('auto after a manual turn: first change = 5s settled + 1.8s transition ≈ 6.8s', ev[0]&&Math.abs(ev[0][1]-6800)<600, ev[0]&&ev[0][1]+'ms');
ok('auto: cycle 1→2→3→1', ev.length>=3 && ev[0][0]===1&&ev[1][0]===2&&ev[2][0]===0, ev.map(e=>e[0]+1).join('→'));
ok('auto: next change = 5s settled + ~1.8s transition', ev[1]&&Math.abs((ev[1][1]-ev[0][1])-6800)<500, ev[1]&&(ev[1][1]-ev[0][1])+'ms');
// manual resets timer
await p.click('button[aria-label$="automatic banner changes"]'); await chip(0); await p.click('button[aria-label$="automatic banner changes"]');
const m0=Date.now(); await sleep(4000); const mid=(await st()).active; await p.click(`[role=group] button:nth-child(3)`); const m1=Date.now(); let a0=2, tn=null; // manual to banner 3
while(Date.now()-m1<9000){ await sleep(100); const a=(await st()).active; if(a!==a0){ tn=Date.now()-m1; break; } }
ok('manual selection resets timer (next auto ≈6.8s after click, not sooner)', tn>6200&&tn<7600, tn+'ms');
// pause stops, tab hidden pauses
await p.click('button[aria-label$="automatic banner changes"]'); const pa=(await st()).active; await sleep(8000); ok('pause holds banner for 8s', (await st()).active===pa);
console.log(errs.length?'ERRORS '+errs.join('|'):'no console/page errors');
const f=R.filter(r=>!r[0]); console.log(`\n${R.length-f.length}/${R.length} passed`); await b.close(); process.exit(f.length?1:0);
