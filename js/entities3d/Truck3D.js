// js/entities3d/Truck3D.js – Procedural 3D truck mesh (box-assemblage)

import * as THREE from 'three';

export class Truck3D {
  constructor(scene, paintColor = '#E74C3C') {
    this.scene      = scene;
    this.paintColor = paintColor;
    this.group      = new THREE.Group();

    this._wheels     = [];   // { mesh, isFront, isLeft }
    this._headlights = [];
    this._brakelights = [];
    this._exhaustMesh = null;
    this._trailerMesh = null;
    this._cargoMesh   = null;

    this._build();
    scene.add(this.group);
  }

  _mat(color, roughness = 0.5, metalness = 0.4) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  _build() {
    const g = this.group;

    // ── Cab body ────────────────────────────────────────────
    const cabColor = new THREE.Color(this.paintColor);
    const cabMat   = new THREE.MeshStandardMaterial({ color:cabColor, roughness:0.35, metalness:0.55 });

    // Main cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.8, 4.8), cabMat);
    cab.position.set(0, 3.0, 2.2);
    cab.castShadow = cab.receiveShadow = true;
    g.add(cab);

    // Cab roof (sleeper)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 3.2), cabMat);
    roof.position.set(0, 4.8, 2.0);
    roof.castShadow = true;
    g.add(roof);

    // Windshield (front)
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.4, 0.12),
      new THREE.MeshStandardMaterial({ color:0x77AACC, roughness:0.05, metalness:0.1, transparent:true, opacity:0.75 })
    );
    windshield.position.set(0, 3.6, 4.65);
    g.add(windshield);

    // Side windows
    for (const sx of [-1.27, 1.27]) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.0, 1.5),
        new THREE.MeshStandardMaterial({ color:0x6699BB, transparent:true, opacity:0.7, roughness:0.1 })
      );
      win.position.set(sx, 3.5, 2.2);
      g.add(win);
    }

    // Front grille
    const grille = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.2, 0.15),
      new THREE.MeshStandardMaterial({ color:0x888888, roughness:0.3, metalness:0.8 })
    );
    grille.position.set(0, 2.4, 4.65);
    g.add(grille);

    // Bumper
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.4, 0.3),
      this._mat(0x555555, 0.4, 0.7)
    );
    bumper.position.set(0, 1.5, 4.7);
    g.add(bumper);

    // Side mirrors
    for (const sx of [-1.45, 1.45]) {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.5), cabMat);
      mirror.position.set(sx, 4.0, 3.5);
      g.add(mirror);
    }

    // Exhaust pipes (right side)
    const exMat = this._mat(0x777777, 0.2, 0.9);
    for (let i = 0; i < 2; i++) {
      const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.5, 8), exMat);
      ex.position.set(1.4 + i*0.25, 4.8, 1.5);
      ex.castShadow = true;
      g.add(ex);
    }

    // ── Trailer ─────────────────────────────────────────────
    const trailerMat = new THREE.MeshStandardMaterial({ color:0x7F8C8D, roughness:0.7, metalness:0.15 });
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.6, 12.5), trailerMat);
    trailer.position.set(0, 2.5, -5.2);
    trailer.castShadow = trailer.receiveShadow = true;
    g.add(trailer);
    this._trailerMesh = trailer;

    // Trailer chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 13), this._mat(0x555555, 0.8, 0.3));
    chassis.position.set(0, 0.85, -5.2);
    g.add(chassis);

    // Trailer rear door
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.4, 0.15),
      new THREE.MeshStandardMaterial({ color:0x666666, roughness:0.6 })
    );
    door.position.set(0, 2.5, -11.9);
    g.add(door);

    // Kingpin connector
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 8), this._mat(0x888888, 0.3, 0.8));
    pin.position.set(0, 1.2, 0.3);
    g.add(pin);

    // ── Wheels ──────────────────────────────────────────────
    this._addWheels(g);

    // ── Lights ──────────────────────────────────────────────
    this._addLights(g);

    // ── Decorative elements ─────────────────────────────────
    this._addDecorations(g, cabMat);
  }

  _addWheels(g) {
    const tireMat  = new THREE.MeshStandardMaterial({ color:0x1a1a1a, roughness:0.95, metalness:0 });
    const rimMat   = new THREE.MeshStandardMaterial({ color:0xBBBBBB, roughness:0.15, metalness:0.9 });

    const wheelDefs = [
      // Front steer axle
      {x: 1.35, y:0.65, z:3.5,  isFront:true,  isLeft:false},
      {x:-1.35, y:0.65, z:3.5,  isFront:true,  isLeft:true },
      // Drive axle 1
      {x: 1.35, y:0.65, z:-0.3, isFront:false, isLeft:false},
      {x:-1.35, y:0.65, z:-0.3, isFront:false, isLeft:true },
      // Trailer axle 1
      {x: 1.35, y:0.65, z:-7.5, isFront:false, isLeft:false},
      {x:-1.35, y:0.65, z:-7.5, isFront:false, isLeft:true },
      // Trailer axle 2
      {x: 1.35, y:0.65, z:-9.0, isFront:false, isLeft:false},
      {x:-1.35, y:0.65, z:-9.0, isFront:false, isLeft:true },
    ];

    for (const def of wheelDefs) {
      const wheelGroup = new THREE.Group();

      // Tire
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.38, 16), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Rim
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.4, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      // Hub
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 8), rimMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      wheelGroup.position.set(def.x, def.y, def.z);
      g.add(wheelGroup);
      this._wheels.push({ mesh: wheelGroup, isFront: def.isFront, isLeft: def.isLeft });
    }
  }

  _addLights(g) {
    // Headlights (emissive quads)
    for (const sx of [-0.8, 0.8]) {
      const lens = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.35, 0.1),
        new THREE.MeshStandardMaterial({ color:0xFFFFCC, emissive:0xFFFFCC, emissiveIntensity:0 })
      );
      lens.position.set(sx, 2.8, 4.72);
      g.add(lens);
      this._headlights.push(lens.material);
    }

    // Three.js point lights for actual illumination (night-time)
    for (const sx of [-0.8, 0.8]) {
      const pt = new THREE.SpotLight(0xFFFF88, 0, 80, Math.PI * 0.12, 0.4, 1.5);
      pt.position.set(sx, 2.8, 4.72);
      pt.target.position.set(sx, 0, 20);
      g.add(pt); g.add(pt.target);
      this._headlights.push(pt);
    }

    // Brake/tail lights
    for (const sx of [-0.8, 0.8]) {
      const lens = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.35, 0.1),
        new THREE.MeshStandardMaterial({ color:0xFF2200, emissive:0xFF2200, emissiveIntensity:0 })
      );
      lens.position.set(sx, 2.5, -11.98);
      g.add(lens);
      this._brakelights.push(lens.material);
    }
  }

  _addDecorations(g, cabMat) {
    // Golden grill stripe (Pakistani decoration)
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.15, 0.12),
      new THREE.MeshStandardMaterial({ color:0xFFD700, emissive:0xFFD700, emissiveIntensity:0.4 })
    );
    stripe.position.set(0, 1.8, 4.68);
    g.add(stripe);

    // Horn (on roof)
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8), this._mat(0x888888, 0.2, 0.9));
    horn.position.set(0.5, 5.25, 2.8);
    horn.rotation.x = Math.PI / 4;
    g.add(horn);

    // Company badge area on trailer
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.8),
      new THREE.MeshStandardMaterial({ color:0xFFD700, roughness:0.5 })
    );
    badge.position.set(0, 3.5, -11.85);
    badge.rotation.y = Math.PI;
    g.add(badge);
  }

  // ── Update visual from physics ─────────────────────────────
  update(physics) {
    const { position, heading, pitch, roll, wheelRot, steerAngle, speed } = physics;

    this.group.position.copy(position);
    this.group.rotation.set(pitch, heading, roll, 'YXZ');

    // Wheel rotation and steering
    for (const w of this._wheels) {
      w.mesh.rotation.x = wheelRot;
      if (w.isFront) {
        w.mesh.rotation.y = steerAngle;
      }
    }

    // Headlights (on at night – caller manages)
    // Brake lights when braking
    const braking = physics.brake > 0.2;
    for (const mat of this._brakelights) {
      if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = braking ? 2 : 0.2;
    }
  }

  setHeadlights(on) {
    for (const item of this._headlights) {
      if (item.isObject3D) { item.intensity = on ? 2.5 : 0; }
      else if (item.emissiveIntensity !== undefined) item.emissiveIntensity = on ? 2 : 0;
    }
  }

  // ── Cargo visual (set when loaded) ────────────────────────
  showCargo(color) {
    if (this._cargoMesh) { this.group.remove(this._cargoMesh); this._cargoMesh = null; }
    if (!color) return;
    const mat  = new THREE.MeshStandardMaterial({ color, roughness:0.7 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.3, 12), mat);
    mesh.position.set(0, 2.45, -5.2);
    mesh.castShadow = true;
    this.group.add(mesh);
    this._cargoMesh = mesh;
  }

  // ── Paint change ───────────────────────────────────────────
  setPaintColor(hex) {
    this.paintColor = hex;
    this.group.traverse(obj => {
      if (obj.isMesh && obj.material?.color) {
        const c = new THREE.Color(this.paintColor);
        if (obj.material.color.getHex() === new THREE.Color(this.paintColor).getHex()) return;
        // Only update cab-colored parts (roughly match original paint)
      }
    });
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(obj => {
      if (obj.isMesh) { obj.geometry.dispose(); obj.material.dispose(); }
    });
  }
}
