// js/entities3d/TrafficVehicle3D.js – NPC 3D traffic following road curve

import * as THREE from 'three';
import { ROAD_CURVE_PTS } from '../engine3d/World3D.js';

const NPC_DEFS = [
  {type:'truck', speed:19, color:0x2980B9, t:0.05},
  {type:'car',   speed:28, color:0xE74C3C, t:0.12},
  {type:'bus',   speed:14, color:0x2C3E50, t:0.22},
  {type:'car',   speed:30, color:0x27AE60, t:0.30},
  {type:'truck', speed:22, color:0xD35400, t:0.38},
  {type:'car',   speed:32, color:0x8E44AD, t:0.47},
  {type:'bus',   speed:12, color:0x16A085, t:0.55},
  {type:'car',   speed:27, color:0xF39C12, t:0.63},
  {type:'truck', speed:20, color:0x1ABC9C, t:0.72},
  {type:'car',   speed:31, color:0xE67E22, t:0.80},
  {type:'truck', speed:18, color:0x7F8C8D, t:0.88},
  {type:'car',   speed:29, color:0x9B59B6, t:0.93},
];

export class TrafficSystem3D {
  constructor(scene, world) {
    this.scene    = scene;
    this.world    = world;
    this.vehicles = [];
    this.curve    = new THREE.CatmullRomCurve3(ROAD_CURVE_PTS, false, 'catmullrom', 0.5);
    this._spawn();
  }

  _spawn() {
    for (const def of NPC_DEFS) {
      const v = new NPCVehicle3D(this.scene, this.world, this.curve, def);
      this.vehicles.push(v);
    }
  }

  update(dt) {
    for (const v of this.vehicles) v.update(dt);
  }

  checkCollisions(physics) {
    const truckPos = physics.position;
    for (const v of this.vehicles) {
      const d = truckPos.distanceTo(v.position);
      const minD = v.type === 'bus' ? 7 : v.type === 'truck' ? 6 : 4.5;
      if (d < minD && physics.INVINCIBLE_TIMER <= 0) {
        const relSpeed = Math.abs(physics.speed - v.speed);
        const dmg = Math.round(8 + relSpeed * 1.5);
        physics.takeDamage(dmg);
        return dmg;
      }
    }
    return 0;
  }

  dispose() {
    for (const v of this.vehicles) v.dispose();
  }
}

class NPCVehicle3D {
  constructor(scene, world, curve, def) {
    this.scene  = scene;
    this.world  = world;
    this.curve  = curve;
    this.type   = def.type;
    this.speed  = def.speed;
    this.color  = def.color;
    this._t     = def.t;
    this._laneOff = (Math.random() - 0.5) * 4; // lateral lane offset

    this.position = new THREE.Vector3();
    this.heading  = 0;

    this._build();
    this.update(0); // set initial position
  }

  _build() {
    const dims = {
      truck: {w:2.4, h:3.4, l:8.0},
      car:   {w:1.9, h:1.5, l:4.5},
      bus:   {w:2.5, h:3.2, l:11.0},
    }[this.type];

    this.group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(dims.w, dims.h, dims.l),
      new THREE.MeshStandardMaterial({ color:this.color, roughness:0.5, metalness:0.3 })
    );
    body.position.y = dims.h / 2;
    body.castShadow = body.receiveShadow = true;
    this.group.add(body);

    // Windshield
    const wMat = new THREE.MeshStandardMaterial({ color:0x88AACC, transparent:true, opacity:0.6 });
    const ws = new THREE.Mesh(new THREE.BoxGeometry(dims.w-0.2, dims.h*0.45, 0.1), wMat);
    ws.position.set(0, dims.h*0.65, dims.l/2 + 0.05);
    this.group.add(ws);

    // Wheels
    const wh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10),
      new THREE.MeshStandardMaterial({ color:0x111111, roughness:0.9 })
    );
    const wPos = [[-dims.w/2-0.15, 0.42, dims.l/2-0.8],[dims.w/2+0.15, 0.42, dims.l/2-0.8],
                  [-dims.w/2-0.15, 0.42,-dims.l/2+0.8],[dims.w/2+0.15, 0.42,-dims.l/2+0.8]];
    for (const [x,y,z] of wPos) {
      const w2 = wh.clone(); w2.position.set(x,y,z); w2.rotation.z=Math.PI/2;
      this.group.add(w2);
    }

    // Headlights
    const hlMat = new THREE.MeshStandardMaterial({ color:0xFFFFAA, emissive:0xFFFFAA, emissiveIntensity:0.5 });
    for (const sx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.08), hlMat);
      hl.position.set(sx, dims.h*0.45, dims.l/2+0.05);
      this.group.add(hl);
    }

    this.scene.add(this.group);
  }

  update(dt) {
    this._t = (this._t + this.speed * dt / this.curve.getLength()) % 1;

    const pt  = this.curve.getPoint(this._t);
    const tan = this.curve.getTangent(this._t).normalize();
    const rt  = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0,1,0)).normalize();

    this.position.copy(pt).addScaledVector(rt, this._laneOff);
    const groundH = this.world.getHeightAt(this.position.x, this.position.z);
    this.position.y = groundH + 0.42;

    this.heading = Math.atan2(tan.x, tan.z);
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(obj => {
      if (obj.isMesh) { obj.geometry.dispose(); obj.material.dispose(); }
    });
  }
}
