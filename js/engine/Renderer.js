// js/engine/Renderer.js – Phase 10+16: full Pakistan map, regional terrain, polish

import { clamp, onScreen, shadeHex } from '../utils.js';
import { HIGHWAY, HIGHWAY_N25, CITIES, ROAD_W, WORLD_W, WORLD_H } from '../constants.js';

// Building cluster templates per city size
const BLDG_SM  = [[-50,-70,30,70],[-10,-55,25,55],[25,-65,35,65],[65,-55,25,55],[-85,-45,22,45]];
const BLDG_MED = [[-70,-88,38,88],[-18,-65,30,65],[20,-78,44,78],[76,-68,32,68],[-110,-50,28,50],[112,-55,30,55]];
const BLDG_LG  = [[-90,-100,42,100],[-30,-78,34,78],[22,-90,48,90],[85,-80,36,80],[-140,-60,32,60],[140,-65,34,65],[-55,-50,26,50],[65,-52,28,52]];

const CITY_SIZE = {
  KARACHI:'lg', LAHORE:'lg',
  HYDERABAD:'med', MULTAN:'med', ISLAMABAD:'med', PESHAWAR:'med',
  SUKKUR:'sm', QUETTA:'sm',
};

export class Renderer {
  constructor(ctx) { this.ctx=ctx; this.W=0; this.H=0; }
  resize(W,H) { this.W=W; this.H=H; }
  _s(wx,wy,cam) { return cam.w2s(wx,wy,this.W,this.H); }

  // ── Background ─────────────────────────────────────────────
  drawBackground(timeOfDay, camX) {
    const c=this.ctx;
    // Regional sky tint (blue-ish near coast, warmer inland)
    const [sc,gc]=this._skyColors(timeOfDay, camX);
    const g=c.createLinearGradient(0,0,0,this.H);
    g.addColorStop(0,sc); g.addColorStop(1,gc);
    c.fillStyle=g; c.fillRect(0,0,this.W,this.H);
  }

  _skyColors(t,cx=0){
    // Northern region is cooler/darker
    const regional = cx > 14000 ? -0.1 : 0;
    if      (t<0.1)  return ['#FF6B35','#C9AA7C'];
    else if (t<0.4)  return ['#87CEEB','#C9AA7C'];
    else if (t<0.6)  return ['#FF7043','#B07050'];
    else if (t<0.8)  return ['#1a1a3e','#302010'];
    else             return ['#0a0a1e','#201508'];
  }

  // ── Terrain (regional variation) ──────────────────────────
  drawTerrain(cam, timeOfDay) {
    const c=this.ctx;
    c.fillRect(0,0,this.W,this.H); // already covered by background

    // Regional ground color based on x (camera position)
    const regionColor = (wx) => {
      if (wx < 2500)  return '#C9AA7C'; // Sindh coast – sandy
      if (wx < 6500)  return '#C4A46A'; // Sindh desert
      if (wx < 12000) return '#A8B86C'; // Punjab – agricultural green-tan
      if (wx < 16000) return '#8FAD5A'; // Islamabad foothills
      return '#6B9A4A';                 // KPK – lush green
    };

    // Large terrain patches
    c.globalAlpha=0.30;
    for (let i=0;i<80;i++){
      const wx=(i*557+300)%WORLD_W, wy=(i*347+200)%WORLD_H;
      const sp=this._s(wx,wy,cam);
      const sz=(60+(i*97)%200)*cam.zoom;
      if (!onScreen(sp.x,sp.y,sz,this.W,this.H)) continue;
      const base=regionColor(wx);
      c.fillStyle = i%3===0 ? shadeHex(base,-15) : i%3===1 ? shadeHex(base,10) : base;
      c.beginPath(); c.ellipse(sp.x,sp.y,sz,sz*0.55,(i*0.6)%Math.PI,0,Math.PI*2); c.fill();
    }
    c.globalAlpha=1;

    // Bushes and vegetation (more north of x=6500)
    for (let i=0;i<60;i++){
      const wx=(i*811+600)%WORLD_W, wy=(i*503+300)%WORLD_H;
      const sp=this._s(wx,wy,cam);
      const sz=(10+(i%12))*cam.zoom;
      if (!onScreen(sp.x,sp.y,sz*2,this.W,this.H)) continue;
      const greenness = wx > 6500 ? 0.7 : 0.3;
      if (Math.random() > greenness + 0.1 * i % 1) {
        c.fillStyle='#5A8A40';
        c.beginPath(); c.arc(sp.x,sp.y,sz,0,Math.PI*2); c.fill();
        c.fillStyle='#4A7030';
        c.beginPath(); c.arc(sp.x-sz*0.3,sp.y-sz*0.2,sz*0.7,0,Math.PI*2); c.fill();
      }
    }

    // Mountain silhouettes near Islamabad/Peshawar
    this._drawMountains(cam);

    // Sea hint near Karachi (bottom of world)
    this._drawSea(cam);
  }

  _drawMountains(cam) {
    const c=this.ctx;
    const peaks = [
      {wx:13500,wy:800,h:400,col:'#6B7B5A'},
      {wx:15000,wy:600,h:500,col:'#5A6A4A'},
      {wx:16500,wy:700,h:450,col:'#6B7B5A'},
      {wx:18000,wy:500,h:600,col:'#4A5A3A'},
      {wx:19500,wy:600,h:500,col:'#5A6A4A'},
    ];
    for (const pk of peaks) {
      const sp=this._s(pk.wx,pk.wy,cam);
      if (!onScreen(sp.x,sp.y,300*cam.zoom,this.W,this.H)) continue;
      const w=250*cam.zoom, h=pk.h*cam.zoom;
      c.fillStyle=pk.col;
      c.beginPath(); c.moveTo(sp.x-w,sp.y+h); c.lineTo(sp.x,sp.y); c.lineTo(sp.x+w,sp.y+h); c.closePath(); c.fill();
      // Snow cap
      c.fillStyle='rgba(255,255,255,0.5)';
      c.beginPath(); c.moveTo(sp.x-w*0.15,sp.y+h*0.18); c.lineTo(sp.x,sp.y); c.lineTo(sp.x+w*0.15,sp.y+h*0.18); c.closePath(); c.fill();
    }
  }

  _drawSea(cam) {
    const c=this.ctx;
    // Ocean south of Karachi (y > 6000 in world)
    const seaSP=this._s(0,7000,cam);
    if (seaSP.y < this.H+50) {
      const g=c.createLinearGradient(0,seaSP.y,0,this.H+50);
      g.addColorStop(0,'rgba(30,120,180,0.6)'); g.addColorStop(1,'rgba(10,60,120,0.8)');
      c.fillStyle=g; c.fillRect(0,seaSP.y,this.W,this.H-seaSP.y+100);
      // Wave lines
      c.strokeStyle='rgba(255,255,255,0.15)'; c.lineWidth=2; c.setLineDash([20*cam.zoom,15*cam.zoom]);
      for (let wy=7200;wy<8000;wy+=200){
        const wp=this._s(0,wy,cam);
        c.beginPath(); c.moveTo(0,wp.y); c.lineTo(this.W,wp.y); c.stroke();
      }
      c.setLineDash([]);
    }
  }

  // ── Roads ────────────────────────────────────────────────
  drawRoad(cam) {
    this._drawHighway(HIGHWAY, cam, '#3D3D3D', '#FFD700');
    this._drawHighway(HIGHWAY_N25, cam, '#3A3A3A', '#F39C12'); // branch uses orange dashes
  }

  _drawHighway(hw, cam, asphalt, dashColor) {
    const c=this.ctx;
    const pts=hw.map(p=>this._s(p.x,p.y,cam));
    const zr=ROAD_W*cam.zoom;

    c.lineCap='round'; c.lineJoin='round';
    c.lineWidth=zr+14*cam.zoom; c.strokeStyle='#111';
    this._poly(c,pts);
    c.lineWidth=zr; c.strokeStyle=asphalt;
    this._poly(c,pts);
    // Shoulder hints
    c.lineWidth=4*cam.zoom; c.strokeStyle='rgba(255,255,255,0.2)'; c.setLineDash([]);
    // Center dashes
    c.lineWidth=4*cam.zoom; c.strokeStyle=dashColor;
    c.setLineDash([55*cam.zoom,35*cam.zoom]);
    this._poly(c,pts);
    c.setLineDash([]);
  }

  _poly(c,pts){
    c.beginPath(); c.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++) c.lineTo(pts[i].x,pts[i].y);
    c.stroke();
  }

  // ── Cities ───────────────────────────────────────────────
  drawCities(cam, unlockedCities=[]) {
    for (const key in CITIES) {
      const city=CITIES[key];
      const locked=!unlockedCities.includes(key);
      this._drawCity(key, city, cam, locked);
    }
  }

  _drawCity(key, city, cam, locked=false) {
    const sp=this._s(city.x,city.y,cam);
    if (!onScreen(sp.x,sp.y,400,this.W,this.H)) return;
    const c=this.ctx;
    const size=CITY_SIZE[key]||'sm';
    const BLDGS=size==='lg'?BLDG_LG:size==='med'?BLDG_MED:BLDG_SM;
    const col=locked?'#444':city.color;

    c.globalAlpha=locked?0.4:0.88;
    BLDGS.forEach(([bx,by,bw,bh],bi)=>{
      c.fillStyle=bi%2===0?col:shadeHex(col,-25);
      c.fillRect(sp.x+bx*cam.zoom,sp.y+by*cam.zoom,bw*cam.zoom,bh*cam.zoom);
      if (!locked){
        c.fillStyle='rgba(255,240,180,0.5)';
        for(let wy=by+10;wy<by+bh-10;wy+=18)
          for(let wx=bx+6;wx<bx+bw-6;wx+=12)
            c.fillRect(sp.x+wx*cam.zoom,sp.y+wy*cam.zoom,5*cam.zoom,7*cam.zoom);
      }
    });
    c.globalAlpha=1;

    c.save(); c.shadowColor='#000'; c.shadowBlur=6;
    c.fillStyle=locked?'#666':'#FFF';
    c.font=`bold ${clamp(18*cam.zoom,10,26)}px Segoe UI`; c.textAlign='center';
    const label=locked?`🔒 ${city.name} (Lv ${city.unlockLevel})`:city.name;
    c.fillText(label,sp.x,sp.y-(BLDGS[0][1]-10)*cam.zoom);
    c.restore(); c.textAlign='left';
  }

  // ── Warehouse markers (drawn via drawMissionMarkers) ──────

  // ── Fuel stations ─────────────────────────────────────────
  drawFuelStations(stations, cam, truck) {
    for (const st of stations) {
      const sp=this._s(st.x,st.y,cam);
      if (!onScreen(sp.x,sp.y,200,this.W,this.H)) continue;
      const c=this.ctx, sz=18*cam.zoom;
      c.fillStyle='#F39C12'; c.fillRect(sp.x-sz*1.6,sp.y-sz*0.3,sz*3.2,sz*0.45);
      c.fillStyle='#E67E22'; c.fillRect(sp.x-sz,sp.y-sz,sz*2,sz*2);
      c.fillStyle='#BDC3C7'; c.fillRect(sp.x-sz*0.35,sp.y-sz*0.7,sz*0.7,sz*1.4);
      c.fillStyle='#FFF'; c.font=`${clamp(11*cam.zoom,8,15)}px Segoe UI`; c.textAlign='center';
      c.fillText(st.name,sp.x,sp.y-sz-6);
      if (truck&&st.isInRange(truck)){
        c.fillStyle='#2ECC71'; c.font=`bold ${clamp(12*cam.zoom,9,15)}px Segoe UI`;
        c.fillText('F=Refuel  R=Repair  T=Service',sp.x,sp.y-sz-24);
      }
      c.textAlign='left';
    }
  }

  // ── Mission markers ───────────────────────────────────────
  drawMissionMarkers(mission, cam, truck) {
    if (!mission||!mission.phase) return;
    const t=Date.now()/1000, pulse=(Math.sin(t*3)+1)*0.5;
    const c=this.ctx;
    let tx,ty,col,lbl;
    if      (mission.phase==='pickup')   {({x:tx,y:ty}=mission.pickupPos);   col='#2ECC71'; lbl='PICKUP';}
    else if (mission.phase==='delivery') {({x:tx,y:ty}=mission.deliveryPos); col='#E74C3C'; lbl='DELIVER';}
    else return;
    const sp=this._s(tx,ty,cam);
    c.globalAlpha=0.65-pulse*0.25; c.strokeStyle=col; c.lineWidth=3;
    c.beginPath(); c.arc(sp.x,sp.y,(28+pulse*16)*cam.zoom,0,Math.PI*2); c.stroke();
    c.globalAlpha=1;
    c.fillStyle=col; c.beginPath(); c.arc(sp.x,sp.y,13*cam.zoom,0,Math.PI*2); c.fill();
    c.fillStyle='#FFF'; c.font=`bold ${clamp(9*cam.zoom,7,13)}px Segoe UI`;
    c.textAlign='center'; c.textBaseline='middle'; c.fillText(lbl,sp.x,sp.y);
    c.textAlign='left'; c.textBaseline='alphabetic';
    if (!onScreen(sp.x,sp.y,30,this.W,this.H)) this._drawArrow(tx,ty,col,cam,truck);
  }

  _drawArrow(wx,wy,col,cam,truck){
    if (!truck) return;
    const angle=Math.atan2(wy-cam.y,wx-cam.x);
    const margin=65;
    const ax=this.W/2+Math.cos(angle)*(Math.min(this.W,this.H)/2-margin);
    const ay=this.H/2+Math.sin(angle)*(Math.min(this.W,this.H)/2-margin);
    const c=this.ctx;
    c.save(); c.translate(ax,ay); c.rotate(angle+Math.PI/2);
    c.fillStyle=col; c.beginPath(); c.moveTo(0,-22); c.lineTo(13,12); c.lineTo(-13,12); c.closePath(); c.fill();
    c.rotate(-(angle+Math.PI/2));
    const d=Math.hypot(wx-truck.x,wy-truck.y);
    c.fillStyle='#FFF'; c.font='bold 12px Segoe UI'; c.textAlign='center';
    c.fillText(Math.round(d/10)+' km',0,32);
    c.restore();
  }

  // ── Truck ────────────────────────────────────────────────
  drawTruck(truck, cam) {
    const sp=this._s(truck.x,truck.y,cam);
    const c=this.ctx, tw=14, th=30;
    c.save();
    c.translate(sp.x,sp.y); c.rotate(truck.angle); c.scale(cam.zoom,cam.zoom);
    c.fillStyle='rgba(0,0,0,0.22)';
    c.beginPath(); c.ellipse(3,3,tw,th*0.55,0,0,Math.PI*2); c.fill();
    const cg=truck.hasCargo?truck.cargo:null;
    c.fillStyle=cg?cg.color:'#7F8C8D'; c.fillRect(-tw+1,4,(tw-1)*2,th-4);
    c.fillStyle=cg?shadeHex(cg.color,15):'#959EA0'; c.fillRect(-tw+4,7,(tw-4)*2,8);
    if(cg){c.fillStyle='rgba(255,255,255,0.18)';for(let i=0;i<3;i++) c.fillRect(-tw+4,12+i*10,(tw-4)*2,4);}
    const cabFlash=truck.isInvincible&&Math.sin(Date.now()/90)>0;
    c.fillStyle=cabFlash?'#FF9999':truck.paintColor;
    c.fillRect(-tw,-th,tw*2,th+8);
    c.fillStyle=shadeHex(truck.paintColor,-30); c.fillRect(-tw+1,-th+1,tw*2-2,th*0.44);
    c.fillStyle='rgba(100,200,255,0.82)'; c.fillRect(-tw+4,-th+3,tw*2-8,th*0.37);
    c.fillStyle='rgba(255,255,255,0.3)'; c.fillRect(-tw+6,-th+4,6,th*0.18);
    c.fillStyle=truck.paintColor; c.fillRect(-tw-5,-th+8,5,7); c.fillRect(tw,-th+8,5,7);
    c.fillStyle='#1C1C1C';
    [[-th+16],[-2],[th-18]].forEach(([fy])=>{
      c.fillRect(-tw-7,fy,8,13); c.fillRect(tw-1,fy,8,13);
      c.fillStyle='#888'; c.fillRect(-tw-5,fy+2,4,9); c.fillRect(tw+1,fy+2,4,9);
      c.fillStyle='#1C1C1C';
    });
    c.fillStyle='#FFFDE7'; c.fillRect(-tw+2,-th,8,4); c.fillRect(tw-10,-th,8,4);
    c.fillStyle='#E74C3C'; c.fillRect(-tw+2,th-2,8,4); c.fillRect(tw-10,th-2,8,4);
    c.fillStyle='rgba(255,215,0,0.65)'; c.fillRect(-tw+2,-th+th*0.48,tw*2-4,2);
    c.restore();
  }

  // ── Obstacles / NPCs ─────────────────────────────────────
  drawObstacles(obstacles, cam) {
    for (const obs of obstacles) {
      const sp=this._s(obs.x,obs.y,cam);
      if (!onScreen(sp.x,sp.y,80,this.W,this.H)) continue;
      obs.isNPC?this._drawNPC(obs,sp,cam):this._drawObs(obs,sp,cam);
    }
  }

  _drawNPC(npc,sp,cam){
    const c=this.ctx;
    const p={truck:{tw:12,th:26,rf:0.44},car:{tw:8,th:16,rf:0.40},bus:{tw:16,th:36,rf:0.25},moto:{tw:4,th:10,rf:0.30}}[npc.type]||{tw:10,th:20,rf:0.38};
    c.save(); c.translate(sp.x,sp.y); c.rotate(npc.angle); c.scale(cam.zoom,cam.zoom);
    c.fillStyle='rgba(0,0,0,0.16)'; c.beginPath(); c.ellipse(2,2,p.tw,p.th*0.5,0,0,Math.PI*2); c.fill();
    c.fillStyle=npc.color; c.fillRect(-p.tw,-p.th,p.tw*2,p.th*2);
    c.fillStyle=shadeHex(npc.color,-30); c.fillRect(-p.tw+2,-p.th+2,p.tw*2-4,p.th*p.rf);
    c.fillStyle='rgba(150,220,255,0.7)'; c.fillRect(-p.tw+3,-p.th+3,p.tw*2-6,p.th*(p.rf-0.06));
    c.fillStyle='#1C1C1C';
    c.fillRect(-p.tw-4,-p.th+8,4,10); c.fillRect(p.tw,-p.th+8,4,10);
    c.fillRect(-p.tw-4,p.th-14,4,10); c.fillRect(p.tw,p.th-14,4,10);
    if(npc.type==='bus'){c.fillStyle='rgba(180,230,255,0.5)';for(let i=0;i<3;i++) c.fillRect(-p.tw+3,-p.th*0.3+i*12,p.tw*2-6,8);}
    if(npc.type==='moto'){c.fillStyle='#FFD700'; c.fillRect(-3,-p.th-4,6,6);}
    c.restore();
  }

  _drawObs(obs,sp,cam){
    const c=this.ctx, sz=obs.collisionRadius*cam.zoom;
    if(obs.type==='rock'){
      c.fillStyle='#8B7355'; c.beginPath(); c.arc(sp.x,sp.y,sz,0,Math.PI*2); c.fill();
      c.fillStyle='#A08060'; c.beginPath(); c.arc(sp.x-sz*0.3,sp.y-sz*0.3,sz*0.45,0,Math.PI*2); c.fill();
    } else {
      c.fillStyle='#E74C3C'; c.fillRect(sp.x-sz,sp.y-sz*1.3,sz*2,sz*2.6);
      c.fillStyle='#FFF'; c.fillRect(sp.x-sz,sp.y-sz*0.1,sz*2,sz*0.25);
    }
  }

  // ── Day/night overlay ─────────────────────────────────────
  drawDayNightOverlay(t) {
    let d=0;
    if(t>0.6&&t<0.7) d=(t-0.6)/0.1;
    else if(t>=0.7&&t<=0.8) d=1;
    else if(t>0.8&&t<0.9) d=1-(t-0.8)/0.1;
    if(d>0){this.ctx.fillStyle=`rgba(0,0,20,${d*0.55})`;this.ctx.fillRect(0,0,this.W,this.H);}
  }

  // ── Country map overlay ───────────────────────────────────
  drawCountryMap(ctx, W, H, cities, truck, missions, unlockedCities) {
    const PAD=60, mw=W-PAD*2, mh=H-PAD*2;
    const scx=mw/WORLD_W, scy=mh/WORLD_H;
    const ox=PAD, oy=PAD;

    // Background
    ctx.fillStyle='rgba(10,12,30,0.95)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#0f1628'; ctx.fillRect(ox,oy,mw,mh);

    // Draw highways
    const drawHW=(hw,col)=>{
      ctx.strokeStyle=col; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(ox+hw[0].x*scx,oy+hw[0].y*scy);
      for(let i=1;i<hw.length;i++) ctx.lineTo(ox+hw[i].x*scx,oy+hw[i].y*scy);
      ctx.stroke();
    };
    drawHW(HIGHWAY,'#555');
    drawHW(HIGHWAY_N25,'#443');

    // Cities
    for (const key in cities) {
      const city=cities[key];
      const cx=ox+city.x*scx, cy=oy+city.y*scy;
      const locked=!unlockedCities.includes(key);
      const isDestination=missions?.active?.toCity===key;
      const isOrigin=missions?.active?.fromCity===key;

      // Glow for active mission cities
      if (isDestination||isOrigin) {
        const pulse=(Math.sin(Date.now()/300)+1)*0.5;
        ctx.globalAlpha=0.3+pulse*0.3;
        ctx.fillStyle=isDestination?'#E74C3C':'#2ECC71';
        ctx.beginPath(); ctx.arc(cx,cy,18+pulse*6,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      }

      ctx.fillStyle=locked?'#333':city.color;
      ctx.beginPath(); ctx.arc(cx,cy,locked?5:9,0,Math.PI*2); ctx.fill();
      if (!locked) {
        ctx.strokeStyle='#FFF'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2); ctx.stroke();
      }
      ctx.fillStyle=locked?'#555':'#FFF';
      ctx.font=`bold ${locked?10:13}px Segoe UI`; ctx.textAlign='center';
      ctx.fillText(locked?`🔒 Lv${city.unlockLevel}`:city.name, cx, cy-14);
    }

    // Player truck dot
    const tx=ox+truck.x*scx, ty=oy+truck.y*scy;
    const pulse2=(Math.sin(Date.now()/200)+1)*0.5;
    ctx.fillStyle='rgba(255,215,0,0.3)';
    ctx.beginPath(); ctx.arc(tx,ty,14+pulse2*5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FFD700';
    ctx.beginPath(); ctx.arc(tx,ty,8,0,Math.PI*2); ctx.fill();

    ctx.textAlign='left';
    // Title
    ctx.fillStyle='#FFD700'; ctx.font='bold 22px Segoe UI';
    ctx.fillText('🗺  PAKISTAN ROUTE MAP', PAD+10, PAD-10);

    // Legend
    ctx.fillStyle='#888'; ctx.font='12px Segoe UI';
    ctx.fillText('● You are here', W-220, oy+20);
    ctx.fillStyle='#2ECC71'; ctx.fillText('● Pickup city', W-220, oy+38);
    ctx.fillStyle='#E74C3C'; ctx.fillText('● Delivery city', W-220, oy+56);
    ctx.textAlign='left';
  }
}
