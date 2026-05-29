// js/engine3d/PedestrianSystem3D.js – Walking humans near cities

import * as THREE from 'three';

const COLORS = [0xE8D5B0, 0x8B4513, 0xF5CBA7, 0xC68642, 0xFFDBAC];
const SHIRT_COLORS = [0xE74C3C, 0x3498DB, 0x2ECC71, 0xF39C12, 0x9B59B6, 0xFFFFFF, 0x1ABC9C];
const TROUSER_COLORS = [0x2C3E50, 0x1a1a2e, 0x34495E, 0x483D8B, 0x3D2B1F];

export class PedestrianSystem3D {
  constructor(scene, roadCurve) {
    this.scene     = scene;
    this.roadCurve = roadCurve;
    this._peds     = [];
    this._time     = 0;

    this._spawnPedestrians(60);
  }

  _spawnPedestrians(count) {
    for (let i = 0; i < count; i++) {
      this._peds.push(this._createPed(i));
    }
  }

  _createPed(idx) {
    const group = new THREE.Group();

    const skin  = COLORS[Math.floor(Math.random() * COLORS.length)];
    const shirt = SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
    const pants = TROUSER_COLORS[Math.floor(Math.random() * TROUSER_COLORS.length)];
    const male  = Math.random() > 0.4;

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color:skin, roughness:0.8 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), headMat);
    head.position.y = 1.72;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 8, 4),
      new THREE.MeshStandardMaterial({ color: male ? 0x1a1008 : 0x1a1008, roughness:0.9 })
    );
    hair.position.set(0, 1.87, -0.03);
    hair.scale.y = 0.6;
    group.add(hair);

    // Body (torso)
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.55, 0.22),
      new THREE.MeshStandardMaterial({ color:shirt, roughness:0.9 })
    );
    torso.position.y = 1.22;
    torso.castShadow = true;
    group.add(torso);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color:pants, roughness:0.9 });
    for (const sx of [-0.1, 0.1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.16), legMat);
      leg.position.set(sx, 0.67, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    // Arms
    const armMat = new THREE.MeshStandardMaterial({ color:shirt, roughness:0.9 });
    const arms = [];
    for (const sx of [-0.28, 0.28]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), armMat);
      arm.position.set(sx, 1.18, 0);
      arm.castShadow = true;
      group.add(arm);
      arms.push(arm);
    }

    // Feet
    const footMat = new THREE.MeshStandardMaterial({ color:0x1a1008, roughness:0.9 });
    for (const sx of [-0.1, 0.1]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), footMat);
      foot.position.set(sx, 0.38, 0.04);
      group.add(foot);
    }

    // Pakistani clothing – dupatta/shawl (some female pedestrians)
    if (!male) {
      const shawl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.6),
        new THREE.MeshStandardMaterial({ color:SHIRT_COLORS[Math.floor(Math.random()*SHIRT_COLORS.length)], side:THREE.DoubleSide, transparent:true, opacity:0.85 })
      );
      shawl.position.set(0, 1.4, -0.12);
      shawl.rotation.x = 0.2;
      group.add(shawl);
    }

    // Placement: near road, sidewalk zone (8-20m from road)
    const t    = (idx / 60 + Math.random() * 0.02);
    const pt   = this.roadCurve.getPoint(t % 1);
    const tan  = this.roadCurve.getTangent(t % 1).normalize();
    const rt   = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0,1,0)).normalize();
    const side = Math.random() > 0.5 ? 1 : -1;
    const off  = 8 + Math.random() * 12;

    group.position.copy(pt).addScaledVector(rt, side * off);
    group.position.y = 0.3;
    group.rotation.y = Math.random() * Math.PI * 2;

    this.scene.add(group);

    return {
      group,
      arms,
      // Patrol path: walk back and forth along a short segment
      basePos: group.position.clone(),
      walkDir: new THREE.Vector3(tan.x, 0, tan.z),
      phase:   Math.random() * Math.PI * 2,
      speed:   0.8 + Math.random() * 0.6,
      range:   4 + Math.random() * 6,
      panic:   false,
    };
  }

  update(dt, truckPos) {
    this._time += dt;

    for (const p of this._peds) {
      // Panic if truck very close
      const dist = truckPos.distanceTo(p.group.position);
      p.panic = dist < 12;

      if (p.panic) {
        // Run away from truck
        const flee = p.group.position.clone().sub(truckPos).normalize();
        flee.y = 0;
        p.group.position.addScaledVector(flee, p.speed * 3 * dt);
        p.group.rotation.y = Math.atan2(flee.x, flee.z);
      } else {
        // Normal walking patrol
        const walkT = Math.sin(this._time * p.speed * 0.3 + p.phase);
        const newX   = p.basePos.x + p.walkDir.x * walkT * p.range;
        const newZ   = p.basePos.z + p.walkDir.z * walkT * p.range;
        p.group.position.x = newX;
        p.group.position.z = newZ;
        // Face walking direction
        const vx = newX - p.group.position.x, vz = newZ - p.group.position.z;
        if (Math.abs(vx) + Math.abs(vz) > 0.01) p.group.rotation.y = Math.atan2(vx, vz);
      }

      // Walking animation: arm+leg swing
      const walkCycle = Math.sin(this._time * p.speed * 4 + p.phase);
      if (p.arms.length >= 2) {
        p.arms[0].rotation.x =  walkCycle * 0.5;
        p.arms[1].rotation.x = -walkCycle * 0.5;
      }

      // Vertical bob when walking
      p.group.position.y = 0.3 + Math.abs(Math.sin(this._time * p.speed * 4 + p.phase)) * 0.05;
    }
  }

  dispose() {
    for (const p of this._peds) {
      this.scene.remove(p.group);
      p.group.traverse(o => { if(o.isMesh){ o.geometry.dispose(); o.material.dispose(); } });
    }
    this._peds = [];
  }
}
