// js/entities3d/TrafficVehicle3D.js – 3D traffic with jam behavior, police, emergency

import * as THREE from 'three';

const NPC_TYPES = ['truck','car','bus','car','truck','moto','car','police','car','ambulance','car','bus'];

export class TrafficSystem3D {
  constructor(scene, world, mapConfig) {
    this.scene    = scene;
    this.world    = world;
    this.curve    = world.roadCurve;
    this.vehicles = [];
    this.density  = mapConfig?.trafficDensity ?? 1.0;
    this._jamZones = []; // random jam zone t values
    this._spawn();
    this._createJamZones();
  }

  _createJamZones() {
    const numJams = Math.floor(this.density * 1.5);
    for (let i = 0; i < numJams; i++) {
      this._jamZones.push({
        t:        0.2 + Math.random() * 0.6,
        radius:   0.08,
        active:   true,
        cooldown: 0,
        COOLDOWN: 60 + Math.random() * 90,
      });
    }
  }

  _spawn() {
    const count = Math.round(12 * this.density);
    for (let i = 0; i < Math.min(count, 20); i++) {
      const type = NPC_TYPES[i % NPC_TYPES.length];
      const t    = i / Math.max(count, 1);
      this.vehicles.push(new NPCVehicle3D(this.scene, this.world, this.curve, {
        type,
        speed:    this._baseSpeed(type),
        color:    this._randomColor(type),
        t,
        laneOff:  (Math.random()-0.5)*6,
      }));
    }
  }

  _baseSpeed(type) {
    return {truck:17,car:27,bus:13,moto:35,police:32,ambulance:28}[type] || 20;
  }
  _randomColor(type) {
    if(type==='police')     return 0x1144BB;
    if(type==='ambulance')  return 0xFFFFFF;
    const cols=[0xE74C3C,0x3498DB,0x2ECC71,0xF39C12,0x9B59B6,0xE67E22,0x1ABC9C,0xFFFF00,0x888888];
    return cols[Math.floor(Math.random()*cols.length)];
  }

  update(dt, timeOfDay) {
    // Update jam zones
    for (const jz of this._jamZones) {
      if (!jz.active) {
        jz.cooldown -= dt;
        if (jz.cooldown <= 0) { jz.active=true; jz.t=0.15+Math.random()*0.7; }
      }
    }

    // Build list of vehicle positions for gap-following
    const tPositions = this.vehicles.map(v => v._t);

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];

      // Check if in a jam zone
      let inJam = false;
      for (const jz of this._jamZones) {
        if (jz.active && Math.abs(v._t - jz.t) < jz.radius) { inJam=true; break; }
      }

      // Gap-based following: slow down if vehicle ahead is close
      let aheadGapOk = true;
      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;
        const ahead = this.vehicles[j];
        const gap   = (ahead._t - v._t + 1) % 1;
        if (gap > 0.001 && gap < 0.015) { aheadGapOk = false; break; }
      }

      v.update(dt, inJam || !aheadGapOk, timeOfDay);
    }
  }

  checkCollisions(physics) {
    const tp = physics.position;
    for (const v of this.vehicles) {
      const d = tp.distanceTo(v.position);
      const r = {bus:8, truck:7, ambulance:7, police:6, car:4.5, moto:3}[v.type]||5;
      if (d < r && physics.INVINCIBLE_TIMER <= 0) {
        const relSpd = Math.abs(physics.speed - (v._speed||0));
        const dmg    = Math.round(5 + relSpd * 1.2);
        physics.takeDamage(dmg);
        return dmg;
      }
    }
    return 0;
  }

  dispose() {
    for (const v of this.vehicles) v.dispose();
    this.vehicles = [];
  }
}

// ── Single NPC vehicle ───────────────────────────────────────
class NPCVehicle3D {
  constructor(scene, world, curve, def) {
    this.scene   = scene;
    this.world   = world;
    this.curve   = curve;
    this.type    = def.type;
    this._speed  = def.speed;
    this.color   = def.color;
    this._t      = def.t;
    this._laneOff = def.laneOff;
    this.position = new THREE.Vector3();
    this.heading  = 0;
    this._jammed  = false;
    this._hazardTimer = 0;
    this._sirens  = null;

    this._build();
    this.update(0, false, 0.4);
  }

  _build() {
    const dims = {
      truck:     {w:2.4,  h:3.2,  l:7.5},
      car:       {w:1.9,  h:1.45, l:4.4},
      bus:       {w:2.55, h:3.0,  l:11.5},
      moto:      {w:0.7,  h:1.2,  l:2.2},
      police:    {w:1.9,  h:1.5,  l:4.8},
      ambulance: {w:2.3,  h:2.5,  l:6.0},
    }[this.type] || {w:2,h:2,l:5};
    const { w, h, l } = dims;

    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color:this.color, roughness:0.5, metalness:0.25 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), bodyMat);
    body.position.y = h/2; body.castShadow = body.receiveShadow = true;
    this.group.add(body);

    // Roof / cab top
    if (this.type !== 'moto') {
      const roofH = h * (this.type==='bus'?0.2:0.42);
      const roofL = l * (this.type==='bus'?0.85:0.6);
      const roof  = new THREE.Mesh(new THREE.BoxGeometry(w-0.2, roofH, roofL), new THREE.MeshStandardMaterial({color:this.type==='bus'?0xFFFFFF:this.color,roughness:0.5}));
      roof.position.set(0, h+roofH/2, this.type==='bus'?0:l*0.1); roof.castShadow=true; this.group.add(roof);
    }

    // Windshield
    const wMat = new THREE.MeshStandardMaterial({color:0x88AACC,transparent:true,opacity:0.7,roughness:0.05});
    const ws   = new THREE.Mesh(new THREE.BoxGeometry(w-0.15, h*0.38, 0.08), wMat);
    ws.position.set(0, h*0.68, l/2+0.05); this.group.add(ws);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 10);
    const wMat2= new THREE.MeshStandardMaterial({color:0x111111,roughness:0.9});
    for (const [wx,wz] of [[-w/2-0.12,l/2-0.8],[w/2+0.12,l/2-0.8],[-w/2-0.12,-l/2+0.8],[w/2+0.12,-l/2+0.8]]) {
      const wh = new THREE.Mesh(wGeo,wMat2); wh.position.set(wx,0.35,wz); wh.rotation.z=Math.PI/2; this.group.add(wh);
    }

    // Headlights
    const hlMat=new THREE.MeshStandardMaterial({color:0xFFFFAA,emissive:0xFFFFAA,emissiveIntensity:0.8});
    for(const sx of [-w/2+0.3,w/2-0.3]){const hl=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.22,0.06),hlMat);hl.position.set(sx,h*0.44,l/2+0.04);this.group.add(hl);}

    // Tail lights
    const tlMat=new THREE.MeshStandardMaterial({color:0xFF2200,emissive:0xFF2200,emissiveIntensity:0.6});
    for(const sx of [-w/2+0.3,w/2-0.3]){const tl=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.22,0.06),tlMat);tl.position.set(sx,h*0.42,-l/2-0.04);this.group.add(tl);}

    // Police/ambulance emergency lights
    if (this.type === 'police' || this.type === 'ambulance') {
      const lColor = this.type==='police' ? 0xFF0000 : 0xFF6600;
      const rColor = this.type==='police' ? 0x0000FF : 0xFF0000;
      const lLight = new THREE.PointLight(lColor, 0, 15);
      const rLight = new THREE.PointLight(rColor, 0, 15);
      lLight.position.set(-0.5, h+1.2, 0.5);
      rLight.position.set(0.5, h+1.2, 0.5);
      this.group.add(lLight, rLight);
      this._sirens = [lLight, rLight];
      // Bar light
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w,0.25,1.2),new THREE.MeshStandardMaterial({color:0x222222,roughness:0.5}));
      bar.position.set(0,h+0.7,0.3); this.group.add(bar);
    }

    // Cargo text for trucks
    if (this.type==='truck') {
      const cc=document.createElement('canvas'); cc.width=256; cc.height=80;
      const ctx2=cc.getContext('2d');
      ctx2.fillStyle=`#${Math.abs(this.color).toString(16).padStart(6,'0').slice(-6)}`;
      ctx2.fillRect(0,0,256,80);
      ctx2.fillStyle='#FFF'; ctx2.font='bold 28px Arial'; ctx2.textAlign='center';
      ctx2.fillText('MOHALLAH LOGESTIC',128,50);
      const tPlane=new THREE.Mesh(new THREE.PlaneGeometry(l*.7,1.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cc),side:THREE.DoubleSide}));
      tPlane.position.set(0,h*.65,0); tPlane.rotation.y=Math.PI/2; this.group.add(tPlane);
    }

    this.scene.add(this.group);
    this._dims = dims;
  }

  update(dt, jammed, timeOfDay) {
    const curveLen = this.curve.getLength();
    this._jammed   = jammed;
    // Speed multiplier
    const speedMult = jammed ? 0.05 : 1.0;
    this._t = (this._t + this._speed * speedMult * dt / curveLen) % 1;

    const pt  = this.curve.getPoint(this._t);
    const tan = this.curve.getTangent(this._t).normalize();
    const rt  = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0,1,0)).normalize();

    this.position.copy(pt).addScaledVector(rt, this._laneOff);
    this.position.y = this.world.getHeightAt(this.position.x, this.position.z) + this._dims.h * 0.5;
    this.heading    = Math.atan2(tan.x, tan.z);

    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;

    // Hazard lights when jammed
    if (this._sirens) {
      const t2 = Date.now()/1000;
      const phase = this.type==='police';
      this._sirens[0].intensity = (Math.sin(t2 * 8 + (phase?0:Math.PI)) > 0) ? 2.5 : 0;
      this._sirens[1].intensity = (Math.sin(t2 * 8 + (phase?Math.PI:0)) > 0) ? 2.5 : 0;
    }

    // Hazard blink on tail lights when stopped
    if (jammed) {
      this._hazardTimer = (this._hazardTimer || 0) + dt;
      // Visual: could pulse tail light emissive
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(o=>{ if(o.isMesh){o.geometry.dispose();o.material.dispose();} });
  }
}
