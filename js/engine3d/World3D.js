// js/engine3d/World3D.js – Procedural 3D world with map-config support

import * as THREE from 'three';
import { DEFAULT_MAP } from './MapSystem3D.js';

function hash2(x, y) { const n=Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); }
function smNoise(x, y) {
  const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
  const ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy);
  const a=hash2(ix,iy), b=hash2(ix+1,iy), c=hash2(ix,iy+1), d=hash2(ix+1,iy+1);
  return a+(b-a)*ux+(c-a)*uy+(d-a+a-b+c-d)*ux*uy;
}
function fbm(x, y, oct=5) { let v=0, a=0.5, f=1; for(let i=0;i<oct;i++){v+=smNoise(x*f,y*f)*a;a*=0.5;f*=2;} return v; }

const TERRAIN_SIZE = 6000;
const TERRAIN_SEGS = 160;
const ROAD_WIDTH   = 12;
const TREE_COUNT   = 700;

export class World3D {
  constructor(scene, mapConfig = DEFAULT_MAP) {
    this.scene   = scene;
    this.config  = mapConfig;
    this.roadCurve = new THREE.CatmullRomCurve3(
      mapConfig.roadWaypoints.map(p => new THREE.Vector3(p.x, p.y, p.z)),
      false, 'catmullrom', 0.5
    );
    this._heightmap = null;
    this._hmRes     = TERRAIN_SEGS + 1;
    this._roadPts   = null;
    this.fuelStationPositions = [];
  }

  build() {
    this._buildTerrain();
    this._buildRoad();
    this._buildCities();
    this._buildTrees();
    this._buildFuelStations();
    this._buildProps();
    if (this.config.hasSea)       this._buildSea();
    if (this.config.hasMountains) this._buildMountainBG();
    if (this.config.hasFactories) this._buildFactories();
    if (this.config.hasNeonLights)this._buildNeonLights();
    this._buildRoadSigns();
  }

  // ── Terrain ───────────────────────────────────────────────
  _buildTerrain() {
    const { noiseScale, heightScale, flatness } = this.config.terrain;
    const res = this._hmRes, sz = TERRAIN_SIZE;
    const geo = new THREE.PlaneGeometry(sz, sz, TERRAIN_SEGS, TERRAIN_SEGS);
    geo.rotateX(-Math.PI/2);
    const pos = geo.attributes.position;
    this._heightmap = new Float32Array(res*res);
    this._roadPts   = this.roadCurve.getPoints(400);

    for (let i=0;i<pos.count;i++) {
      const x=pos.getX(i), z=pos.getZ(i);
      const natural = fbm(x*noiseScale, z*noiseScale, 5) * heightScale - heightScale*0.3;
      const flat = 0.3;
      const dRoad = this._distToRoadApprox(x,z);
      let h = dRoad < 35 ? this._lerp(flat, natural, dRoad/35) : natural;
      h = Math.max(0, h * (1 - flatness*0.5));
      pos.setY(i, h);
      const ix=Math.round((x/sz+0.5)*TERRAIN_SEGS);
      const iz=Math.round((z/sz+0.5)*TERRAIN_SEGS);
      const hi = Math.min(ix,TERRAIN_SEGS) + Math.min(iz,TERRAIN_SEGS)*res;
      if (hi>=0&&hi<this._heightmap.length) this._heightmap[hi]=h;
    }
    pos.needsUpdate=true; geo.computeVertexNormals();

    // Vertex colours
    const cols = [];
    for (let i=0;i<pos.count;i++) {
      const x=pos.getX(i), z=pos.getZ(i), y=pos.getY(i);
      const d=this._distToRoadApprox(x,z);
      const r = d<18 ? [0.22,0.22,0.22] : this._terrainColor(x,z,y);
      cols.push(r[0],r[1],r[2]);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols,3));
    const mat = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.9, metalness:0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow=true; mesh.name='terrain';
    this.scene.add(mesh); this.terrain=mesh;
  }

  _terrainColor(x, z, y) {
    const n = smNoise(x*0.02, z*0.02);
    const gc = this._hexToRgb(this.config.groundTint || '#C9AA7C');
    const rock  = [0.50+n*0.08, 0.44+n*0.05, 0.36+n*0.04];
    const base  = [gc[0]*(1+n*0.15), gc[1]*(1+n*0.1), gc[2]*(1+n*0.05)];
    return y > 8 ? this._lerpCol(base, rock, 0.6) : base;
  }

  _hexToRgb(hex) {
    const r=parseInt(hex.slice(1,3),16)/255;
    const g=parseInt(hex.slice(3,5),16)/255;
    const b=parseInt(hex.slice(5,7),16)/255;
    return [r,g,b];
  }
  _lerpCol(a,b,t){t=Math.max(0,Math.min(1,t));return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
  _lerp(a,b,t){return a+(b-a)*Math.max(0,Math.min(1,t));}
  _distToRoadApprox(x,z){let mn=1e9;for(const p of this._roadPts){const d=Math.hypot(x-p.x,z-p.z);if(d<mn)mn=d;}return mn;}

  // ── Road ──────────────────────────────────────────────────
  _buildRoad() {
    const segs=500, hw=ROAD_WIDTH/2;
    const curve=this.roadCurve;
    const verts=[],uvs=[],idx=[];
    const tex = this._createRoadTexture();
    const mat = new THREE.MeshStandardMaterial({ map:tex, roughness:0.82, metalness:0.04 });

    for(let i=0;i<=segs;i++){
      const t=i/segs, pt=curve.getPoint(t);
      const tan=curve.getTangent(t).normalize();
      const rt=new THREE.Vector3().crossVectors(tan,new THREE.Vector3(0,1,0)).normalize();
      const L=pt.clone().addScaledVector(rt,-hw);
      const R=pt.clone().addScaledVector(rt,hw);
      const uvT=t*40;
      verts.push(L.x,L.y+0.06,L.z, R.x,R.y+0.06,R.z);
      uvs.push(0,uvT,1,uvT);
      if(i<segs){const b=i*2;idx.push(b,b+1,b+2,b+1,b+3,b+2);}
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat); mesh.receiveShadow=true; mesh.name='road';
    this.scene.add(mesh); this.roadMesh=mesh;
    // Shoulder
    this._buildShoulder(curve,segs,hw+3);
  }

  _buildShoulder(curve,segs,hw) {
    const verts=[],idx=[];
    for(let i=0;i<=segs;i++){
      const t=i/segs, pt=curve.getPoint(t);
      const tan=curve.getTangent(t).normalize();
      const rt=new THREE.Vector3().crossVectors(tan,new THREE.Vector3(0,1,0)).normalize();
      const L=pt.clone().addScaledVector(rt,-hw);
      const R=pt.clone().addScaledVector(rt,hw);
      verts.push(L.x,L.y+0.03,L.z,R.x,R.y+0.03,R.z);
      if(i<segs){const b=i*2;idx.push(b,b+1,b+2,b+1,b+3,b+2);}
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x8B7355,roughness:0.95}));
    m.receiveShadow=true; this.scene.add(m);
  }

  _createRoadTexture(){
    const c=document.createElement('canvas'); c.width=c.height=512;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#2a2a2a'; ctx.fillRect(0,0,512,512);
    // Grain
    for(let i=0;i<6000;i++){ctx.fillStyle=`rgba(${40+Math.random()*20},${40+Math.random()*20},${40+Math.random()*20},0.25)`;ctx.fillRect(Math.random()*512,Math.random()*512,2,2);}
    ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(14,512);ctx.stroke();
    ctx.beginPath();ctx.moveTo(498,0);ctx.lineTo(498,512);ctx.stroke();
    ctx.strokeStyle='rgba(255,200,0,0.9)'; ctx.lineWidth=5;
    ctx.setLineDash([80,60]);
    ctx.beginPath();ctx.moveTo(256,0);ctx.lineTo(256,512);ctx.stroke();
    ctx.setLineDash([]);
    const tex=new THREE.CanvasTexture(c);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    return tex;
  }

  // ── Cities ─────────────────────────────────────────────────
  _buildCities() {
    const cities = this.config.cities || ['City A', 'City B'];
    const bMats = [0xE74C3C,0x3498DB,0xE67E22,0x2ECC71,0x9B59B6,0xECF0F1,0xF39C12].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:0.7}));
    const wMat  = new THREE.MeshStandardMaterial({color:0xADD8E6,emissive:0x334466,roughness:0.1,metalness:0.1});

    // Start city (near beginning of road)
    const p0 = this.roadCurve.getPoint(0.05);
    const tan0= this.roadCurve.getTangent(0.05).normalize();
    const rt0 = new THREE.Vector3().crossVectors(tan0,new THREE.Vector3(0,1,0)).normalize();
    this._buildCityCluster(p0.clone().addScaledVector(rt0,-160), 40, bMats, wMat, cities[0]||'Start');

    // End city
    const p1 = this.roadCurve.getPoint(0.92);
    const tan1= this.roadCurve.getTangent(0.92).normalize();
    const rt1 = new THREE.Vector3().crossVectors(tan1,new THREE.Vector3(0,1,0)).normalize();
    this._buildCityCluster(p1.clone().addScaledVector(rt1,150), 30, bMats, wMat, cities[1]||'End');

    // Waypoint towns
    for (const t of [0.30, 0.55, 0.72]) {
      const pt   = this.roadCurve.getPoint(t);
      const tan  = this.roadCurve.getTangent(t).normalize();
      const rt   = new THREE.Vector3().crossVectors(tan,new THREE.Vector3(0,1,0)).normalize();
      const side = Math.random()>0.5?1:-1;
      this._buildCityCluster(pt.clone().addScaledVector(rt,side*120), 10, bMats, wMat, null);
    }
  }

  _buildCityCluster(centerVec3, count, bMats, wMat, label) {
    const rng=(a,b)=>a+Math.random()*(b-a);
    for(let i=0;i<count;i++){
      const w=rng(6,22), h=rng(8,55), d=rng(6,22);
      const bx=centerVec3.x+rng(-140,140), bz=centerVec3.z+rng(-140,140);
      const mat=bMats[Math.floor(Math.random()*bMats.length)];
      const geo=new THREE.BoxGeometry(w,h,d);
      const m=new THREE.Mesh(geo,mat); m.position.set(bx,h/2,bz); m.castShadow=m.receiveShadow=true;
      const wm=new THREE.Mesh(new THREE.BoxGeometry(w-.1,h-.1,d-.1),wMat); wm.position.y=.05; m.add(wm);
      this.scene.add(m);
    }
    if(label) this._makeLabel(centerVec3.x,centerVec3.z,label);
  }

  _makeLabel(x,z,text){
    const c=document.createElement('canvas'); c.width=512; c.height=128;
    const ctx=c.getContext('2d');
    ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(0,0,512,128);
    ctx.fillStyle='#FFD700'; ctx.font='bold 68px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(text,256,64);
    const tex=new THREE.CanvasTexture(c);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(36,9),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));
    m.position.set(x,42,z); m.rotation.y=Math.PI/4; this.scene.add(m);
  }

  // ── Trees ──────────────────────────────────────────────────
  _buildTrees() {
    const tMat=new THREE.MeshStandardMaterial({color:0x5C3D1E,roughness:0.9});
    const cMat=new THREE.MeshStandardMaterial({color:0x2D6A2A,roughness:0.9});
    const tGeo=new THREE.CylinderGeometry(0.3,0.5,4,6);
    const cGeo=new THREE.ConeGeometry(2.5,6,6);
    const tI=new THREE.InstancedMesh(tGeo,tMat,TREE_COUNT);
    const cI=new THREE.InstancedMesh(cGeo,cMat,TREE_COUNT);
    tI.castShadow=cI.castShadow=true;
    const dm=new THREE.Object3D(); let cnt=0;
    for(let a=0;a<TREE_COUNT*6&&cnt<TREE_COUNT;a++){
      const x=(Math.random()-.5)*5000, z=(Math.random()-.5)*5000;
      if(this._distToRoadApprox(x,z)<28) continue;
      const h=this.getHeightAt(x,z); if(h<0.5) continue;
      const sc=0.7+Math.random()*0.8;
      dm.position.set(x,h+2*sc,z); dm.scale.setScalar(sc); dm.rotation.y=Math.random()*Math.PI*2; dm.updateMatrix();
      tI.setMatrixAt(cnt,dm.matrix);
      dm.position.set(x,h+4*sc+3*sc,z); dm.updateMatrix();
      cI.setMatrixAt(cnt,dm.matrix); cnt++;
    }
    tI.count=cI.count=cnt; this.scene.add(tI,cI);
  }

  // ── Fuel stations ─────────────────────────────────────────
  _buildFuelStations() {
    const defs=[{t:0.22},{t:0.50},{t:0.76}];
    const yMat=new THREE.MeshStandardMaterial({color:0xF39C12,roughness:0.7});
    const wMat=new THREE.MeshStandardMaterial({color:0xECF0F1,roughness:0.6});
    for(const def of defs){
      const pt=this.roadCurve.getPoint(def.t);
      const tan=this.roadCurve.getTangent(def.t).normalize();
      const rt=new THREE.Vector3().crossVectors(tan,new THREE.Vector3(0,1,0)).normalize();
      const base=pt.clone().addScaledVector(rt,20);
      const c=new THREE.Mesh(new THREE.BoxGeometry(20,.5,14),yMat); c.position.copy(base).setY(5); c.castShadow=true; this.scene.add(c);
      const b=new THREE.Mesh(new THREE.BoxGeometry(5,4,5),wMat); b.position.copy(base).setY(2); b.castShadow=b.receiveShadow=true; this.scene.add(b);
      for(let pi=0;pi<2;pi++){const p=new THREE.Mesh(new THREE.BoxGeometry(1,2.5,.5),yMat); p.position.copy(base).add(new THREE.Vector3(-3+pi*6,1.25,3)); p.castShadow=true; this.scene.add(p);}
      this.fuelStationPositions.push(base.clone());
    }
  }

  // ── Props: barrels, signs, barriers ─────────────────────────
  _buildProps() {
    const barrelMat=new THREE.MeshStandardMaterial({color:0xE74C3C,roughness:0.7});
    const barrierMat=new THREE.MeshStandardMaterial({color:0xF39C12,roughness:0.8});
    for(let i=0;i<18;i++){
      const t=0.05+i*0.052;
      const pt=this.roadCurve.getPoint(t);
      const tan=this.roadCurve.getTangent(t).normalize();
      const rt=new THREE.Vector3().crossVectors(tan,new THREE.Vector3(0,1,0)).normalize();
      const side=i%2===0?1:-1;
      const off=7+Math.random()*3;
      // Barrier
      const bar=new THREE.Mesh(new THREE.BoxGeometry(0.4,.9,2.5),barrierMat);
      bar.position.copy(pt).addScaledVector(rt,side*off).setY(.45); bar.castShadow=true; this.scene.add(bar);
    }
    // Barrels in industrial areas
    for(let i=0;i<8;i++){
      const t=0.1+i*0.1;
      const pt=this.roadCurve.getPoint(t);
      const tan=this.roadCurve.getTangent(t).normalize();
      const rt=new THREE.Vector3().crossVectors(tan,new THREE.Vector3(0,1,0)).normalize();
      const b=new THREE.Mesh(new THREE.CylinderGeometry(.5,.55,1.2,10),barrelMat);
      b.position.copy(pt).addScaledVector(rt,(Math.random()>.5?1:-1)*9).setY(.6); b.castShadow=true; this.scene.add(b);
    }
  }

  // ── Road signs ─────────────────────────────────────────────
  _buildRoadSigns() {
    const cities=this.config.cities||['A','B'];
    const signs=[
      {t:0.05,text:`${cities[0]} 0 km`},
      {t:0.25,text:`${cities[1]} 120 km`},
      {t:0.50,text:`${cities[1]} 60 km`},
      {t:0.75,text:`${cities[1]} 20 km`},
      {t:0.95,text:`${cities[1]} 0 km`},
    ];
    const poleMat=new THREE.MeshStandardMaterial({color:0x888888,metalness:0.8,roughness:0.3});
    for(const s of signs){
      const pt=this.roadCurve.getPoint(s.t);
      const tan=this.roadCurve.getTangent(s.t).normalize();
      const rt=new THREE.Vector3().crossVectors(tan,new THREE.Vector3(0,1,0)).normalize();
      const base=pt.clone().addScaledVector(rt,9);
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,6,8),poleMat); pole.position.copy(base).setY(3); this.scene.add(pole);
      const cc=document.createElement('canvas'); cc.width=256; cc.height=80;
      const ctx=cc.getContext('2d'); ctx.fillStyle='#1a5c1a'; ctx.fillRect(0,0,256,80);
      ctx.fillStyle='#FFF'; ctx.font='bold 24px Arial'; ctx.textAlign='center'; ctx.fillText(s.text,128,50);
      const brd=new THREE.Mesh(new THREE.PlaneGeometry(6,2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cc),side:THREE.DoubleSide}));
      brd.position.copy(base).setY(6.2); brd.rotation.y=Math.atan2(tan.x,tan.z); this.scene.add(brd);
    }
  }

  // ── Special environment builders ──────────────────────────
  _buildSea() {
    const seaZ = this.config.seaZ || 2500;
    const geo  = new THREE.PlaneGeometry(TERRAIN_SIZE, 1200);
    geo.rotateX(-Math.PI/2);
    const mat = new THREE.MeshStandardMaterial({ color:0x006994, roughness:0.05, metalness:0.1, transparent:true, opacity:0.88 });
    const m   = new THREE.Mesh(geo, mat);
    m.position.set(0, -0.5, seaZ);
    this.scene.add(m);
  }

  _buildMountainBG() {
    const mZ = this.config.mountainZ || -1000;
    const peaks = [
      {x:-600,z:mZ-200,h:380},{x:-200,z:mZ-100,h:480},{x:200,z:mZ-300,h:420},
      {x:600,z:mZ-150,h:360},{x:1000,z:mZ-250,h:500},{x:-1000,z:mZ-300,h:440},
    ];
    for(const pk of peaks){
      const mat=new THREE.MeshStandardMaterial({color:0x607858,roughness:0.9,flatShading:true});
      const geo=new THREE.ConeGeometry(pk.h*0.7,pk.h,7);
      const m=new THREE.Mesh(geo,mat); m.position.set(pk.x,pk.h/2,pk.z); m.castShadow=true; this.scene.add(m);
      // Snow cap
      const scap=new THREE.Mesh(new THREE.ConeGeometry(pk.h*0.18,pk.h*0.22,6),new THREE.MeshStandardMaterial({color:0xFFFFFF,roughness:0.7}));
      scap.position.set(pk.x,pk.h*0.9,pk.z); this.scene.add(scap);
    }
  }

  _buildFactories() {
    const fMat=new THREE.MeshStandardMaterial({color:0x8B8B8B,roughness:0.8});
    const chimneyMat=new THREE.MeshStandardMaterial({color:0x555555,roughness:0.7});
    for(let i=0;i<8;i++){
      const t=0.15+i*0.09, pt=this.roadCurve.getPoint(t);
      const tan=this.roadCurve.getTangent(t).normalize();
      const rt=new THREE.Vector3().crossVectors(tan,new THREE.Vector3(0,1,0)).normalize();
      const base=pt.clone().addScaledVector(rt,(i%2===0?1:-1)*80);
      const w=30+Math.random()*20, h=15+Math.random()*12, d=20+Math.random()*15;
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),fMat); m.position.copy(base).setY(h/2); m.castShadow=m.receiveShadow=true; this.scene.add(m);
      // Chimney
      const ch=new THREE.Mesh(new THREE.CylinderGeometry(1,1.5,20,8),chimneyMat); ch.position.copy(base).add(new THREE.Vector3(w/3,h+10,0)); ch.castShadow=true; this.scene.add(ch);
    }
  }

  _buildNeonLights() {
    const neonColors=[0xFF00AA,0x00FFAA,0xFF4400,0x44AAFF,0xFFDD00];
    for(let i=0;i<24;i++){
      const t=i/24, pt=this.roadCurve.getPoint(t);
      const tan=this.roadCurve.getTangent(t).normalize();
      const rt=new THREE.Vector3().crossVectors(tan,new THREE.Vector3(0,1,0)).normalize();
      const side=(i%2===0?1:-1);
      const col=neonColors[i%neonColors.length];
      const pos=pt.clone().addScaledVector(rt,side*9);
      const light=new THREE.PointLight(col,1.5,25);
      light.position.copy(pos).setY(5); this.scene.add(light);
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,4),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:3}));
      bulb.position.copy(pos).setY(5); this.scene.add(bulb);
    }
  }

  // ── Height query ───────────────────────────────────────────
  getHeightAt(x, z) {
    if(!this._heightmap) return 0;
    const sz=TERRAIN_SIZE, res=this._hmRes;
    const nx=(x/sz+0.5)*TERRAIN_SEGS, nz=(z/sz+0.5)*TERRAIN_SEGS;
    const ix=Math.floor(nx), iz=Math.floor(nz), fx=nx-ix, fz=nz-iz;
    const clamp=v=>Math.max(0,Math.min(TERRAIN_SEGS,v));
    const h=(xi,zi)=>{ const i=clamp(xi)+clamp(zi)*res; return this._heightmap[i]||0; };
    return h(ix,iz)*(1-fx)*(1-fz)+h(ix+1,iz)*fx*(1-fz)+h(ix,iz+1)*(1-fx)*fz+h(ix+1,iz+1)*fx*fz;
  }

  getNearestRoadPoint(x,z){let best=null,bestD=Infinity;for(const p of this._roadPts){const d=Math.hypot(x-p.x,z-p.z);if(d<bestD){bestD=d;best=p;}}return{point:best,dist:bestD};}
  isNearRoad(x,z,thr=20){return this.getNearestRoadPoint(x,z).dist<thr;}
}
