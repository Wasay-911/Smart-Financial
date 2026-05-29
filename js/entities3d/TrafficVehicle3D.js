// js/entities3d/TrafficVehicle3D.js – Two-way traffic with jam AI, police, ambulance

import * as THREE from 'three';

// Half forward, half oncoming
const NPC_DEFS = [
  // ── Forward lane (going toward destination, laneOff +ve = left-of-centre) ──
  {type:'truck',    speed:17,  color:0x2980B9, t:0.04,  dir:'fwd'},
  {type:'car',      speed:28,  color:0xE74C3C, t:0.12,  dir:'fwd'},
  {type:'bus',      speed:13,  color:0x2C3E50, t:0.22,  dir:'fwd'},
  {type:'car',      speed:25,  color:0x27AE60, t:0.34,  dir:'fwd'},
  {type:'moto',     speed:38,  color:0xF39C12, t:0.46,  dir:'fwd'},
  {type:'truck',    speed:19,  color:0x9B59B6, t:0.58,  dir:'fwd'},
  {type:'car',      speed:30,  color:0x1ABC9C, t:0.70,  dir:'fwd'},
  {type:'police',   speed:32,  color:0x1144BB, t:0.82,  dir:'fwd'},
  // ── Oncoming lane (traveling toward start, laneOff -ve = their left) ──
  {type:'car',      speed:27,  color:0xFF6600, t:0.08,  dir:'opp'},
  {type:'truck',    speed:16,  color:0x16A085, t:0.18,  dir:'opp'},
  {type:'bus',      speed:12,  color:0x34495E, t:0.30,  dir:'opp'},
  {type:'car',      speed:29,  color:0xE67E22, t:0.42,  dir:'opp'},
  {type:'ambulance',speed:30,  color:0xFFFFFF, t:0.54,  dir:'opp'},
  {type:'moto',     speed:40,  color:0xFF2244, t:0.64,  dir:'opp'},
  {type:'car',      speed:26,  color:0xDDA020, t:0.76,  dir:'opp'},
  {type:'truck',    speed:18,  color:0x7F8C8D, t:0.88,  dir:'opp'},
];

const LANE_OFFSET = 6; // metres from centre-line to lane centre

export class TrafficSystem3D {
  constructor(scene, world, mapConfig) {
    this.scene    = scene;
    this.world    = world;
    this.curve    = world.roadCurve;
    this.density  = mapConfig?.trafficDensity ?? 1.0;
    this._jamZones = [];
    this._vehicles = [];
    this._spawn();
    this._createJamZones();
  }

  get vehicles() { return this._vehicles; }

  _createJamZones() {
    const n = Math.round(this.density * 2);
    for (let i = 0; i < n; i++) {
      this._jamZones.push({
        t:        0.2 + Math.random() * 0.6,
        radius:   0.06,
        active:   true,
        cooldown: 0,
        COOLDOWN: 55 + Math.random() * 80,
      });
    }
  }

  _spawn() {
    const countScale = Math.min(this.density, 2.0);
    for (let i = 0; i < NPC_DEFS.length; i++) {
      if (Math.random() > countScale * 0.6 + 0.4) continue;
      this._vehicles.push(new NPCVehicle3D(this.scene, this.world, this.curve, NPC_DEFS[i]));
    }
  }

  update(dt, timeOfDay) {
    // Update jam zones
    for (const jz of this._jamZones) {
      if (!jz.active) { jz.cooldown -= dt; if(jz.cooldown<=0){jz.active=true;jz.t=0.15+Math.random()*0.7;} }
    }

    for (let i = 0; i < this._vehicles.length; i++) {
      const v = this._vehicles[i];
      let inJam = false;
      for (const jz of this._jamZones) {
        if (jz.active && Math.abs(v._t - jz.t) < jz.radius) { inJam=true; break; }
      }
      // Gap-following within same direction
      let blocked = false;
      for (let j = 0; j < this._vehicles.length; j++) {
        if (i === j || this._vehicles[j]._dir !== v._dir) continue;
        // gap in direction of travel
        const gapFwd = v._dir === 'fwd'
          ? (this._vehicles[j]._t - v._t + 1) % 1
          : (v._t - this._vehicles[j]._t + 1) % 1;
        if (gapFwd > 0.0005 && gapFwd < 0.012) { blocked = true; break; }
      }
      v.update(dt, inJam || blocked, timeOfDay);
    }
  }

  checkCollisions(physics) {
    const tp = physics.position;
    for (const v of this._vehicles) {
      const d = tp.distanceTo(v.position);
      const r = {bus:8,truck:7,ambulance:7,police:6,car:4.5,moto:3}[v.type]||5;
      if (d < r && physics.INVINCIBLE_TIMER <= 0) {
        const rel = Math.abs(physics.speed) + Math.abs(v._speed || 0);
        const dmg = Math.round(6 + rel * 0.8);
        physics.takeDamage(dmg); return dmg;
      }
    }
    return 0;
  }

  dispose() { for(const v of this._vehicles) v.dispose(); this._vehicles=[]; }
}

// ── NPC Vehicle ───────────────────────────────────────────────
class NPCVehicle3D {
  constructor(scene, world, curve, def) {
    this.scene   = scene;
    this.world   = world;
    this.curve   = curve;
    this.type    = def.type;
    this._speed  = def.speed;
    this.color   = def.color;
    this._t      = def.t;
    this._dir    = def.dir || 'fwd';        // 'fwd' | 'opp'
    this._tStep  = this._dir === 'fwd' ? 1 : -1;
    // Lane offset: forward traffic keeps left (+), oncoming keeps left on THEIR side (-)
    this._laneOff = this._dir === 'fwd' ? LANE_OFFSET : -LANE_OFFSET;
    this.position = new THREE.Vector3();
    this.heading  = 0;
    this._sirens  = null;
    this._build();
    this.update(0, false, 0.4);
  }

  _build() {
    const dims = {
      truck:{w:2.4,h:3.2,l:7.5}, car:{w:1.9,h:1.45,l:4.4}, bus:{w:2.5,h:3.0,l:11.5},
      moto:{w:0.7,h:1.2,l:2.2}, police:{w:1.9,h:1.5,l:4.8}, ambulance:{w:2.3,h:2.5,l:6.0},
    }[this.type] || {w:2,h:2,l:5};
    const {w,h,l} = dims; this._dims = dims;

    this.group = new THREE.Group();
    const bMat = new THREE.MeshStandardMaterial({color:this.color,roughness:0.5,metalness:0.25});

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(w,h,l),bMat);
    body.position.y=h/2; body.castShadow=body.receiveShadow=true; this.group.add(body);

    // Cab roof
    if(this.type!=='moto'){
      const rH=h*(this.type==='bus'?0.18:0.40), rL=l*(this.type==='bus'?0.82:0.55);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(w-.2,rH,rL),new THREE.MeshStandardMaterial({color:this.type==='bus'?0xFFFFFF:this.color,roughness:0.5}));
      roof.position.set(0,h+rH/2,l*0.08); roof.castShadow=true; this.group.add(roof);
    }

    // Windshield
    const wMat=new THREE.MeshStandardMaterial({color:0x88AACC,transparent:true,opacity:0.7});
    const ws=new THREE.Mesh(new THREE.BoxGeometry(w-.15,h*.36,0.08),wMat);
    ws.position.set(0,h*.66,l/2+.05); this.group.add(ws);

    // Wheels
    const wGeo=new THREE.CylinderGeometry(0.38,0.38,0.26,10);
    const wMat2=new THREE.MeshStandardMaterial({color:0x111111,roughness:0.9});
    const wPos=[[-w/2-.12,l/2-.9],[w/2+.12,l/2-.9],[-w/2-.12,-l/2+.9],[w/2+.12,-l/2+.9]];
    for(const[wx,wz] of wPos){const wh=new THREE.Mesh(wGeo,wMat2);wh.position.set(wx,.38,wz);wh.rotation.z=Math.PI/2;this.group.add(wh);}

    // Headlights
    const hlMat=new THREE.MeshStandardMaterial({color:0xFFFFAA,emissive:0xFFFFAA,emissiveIntensity:.9});
    for(const sx of [-w/2+.3,w/2-.3]){const hl=new THREE.Mesh(new THREE.BoxGeometry(.35,.22,.06),hlMat);hl.position.set(sx,h*.43,l/2+.04);this.group.add(hl);}

    // Tail lights
    const tlMat=new THREE.MeshStandardMaterial({color:0xFF2200,emissive:0xFF2200,emissiveIntensity:.7});
    for(const sx of [-w/2+.3,w/2-.3]){const tl=new THREE.Mesh(new THREE.BoxGeometry(.35,.22,.06),tlMat);tl.position.set(sx,h*.42,-l/2-.04);this.group.add(tl);}

    // Emergency lights for police / ambulance
    if(this.type==='police'||this.type==='ambulance'){
      const lC=this.type==='police'?0xFF0000:0xFF6600;
      const rC=this.type==='police'?0x0000FF:0xFF0000;
      const lL=new THREE.PointLight(lC,0,18), rL=new THREE.PointLight(rC,0,18);
      lL.position.set(-.5,h+1.3,.5); rL.position.set(.5,h+1.3,.5);
      this.group.add(lL,rL); this._sirens=[lL,rL];
      const bar=new THREE.Mesh(new THREE.BoxGeometry(w,.24,1.3),new THREE.MeshStandardMaterial({color:0x222222,roughness:.5}));
      bar.position.set(0,h+.75,.3); this.group.add(bar);
    }

    // Direction indicator stripe for visual distinction
    const stripeColor = this._dir === 'opp' ? 0xFF4400 : 0x00AAFF;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w+.05,.12,l*.5),
      new THREE.MeshStandardMaterial({color:stripeColor,emissive:stripeColor,emissiveIntensity:.4}));
    stripe.position.set(0,h+.05,0); this.group.add(stripe);

    this.scene.add(this.group);
  }

  update(dt, jammed, timeOfDay) {
    const len = this.curve.getLength();
    const spd = jammed ? this._speed * 0.04 : this._speed;
    const step = spd * dt / len;

    // Move in correct direction
    this._t = this._dir === 'fwd'
      ? (this._t + step) % 1
      : ((this._t - step) + 1) % 1;

    const pt  = this.curve.getPoint(this._t);
    const tan = this.curve.getTangent(this._t).normalize();
    const rt  = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0,1,0)).normalize();

    this.position.copy(pt).addScaledVector(rt, this._laneOff);
    this.position.y = this.world.getHeightAt(this.position.x, this.position.z) + this._dims.h * 0.5;

    // Face correct direction
    const faceTan = this._dir === 'fwd' ? tan : tan.clone().negate();
    this.heading = Math.atan2(faceTan.x, faceTan.z);

    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;

    // Siren flash
    if(this._sirens){
      const t2=Date.now()/1000;
      this._sirens[0].intensity=(Math.sin(t2*8)>0)?3:0;
      this._sirens[1].intensity=(Math.sin(t2*8)>0)?0:3;
    }
  }

  dispose(){this.scene.remove(this.group);this.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
}
