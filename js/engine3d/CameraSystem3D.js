// js/engine3d/CameraSystem3D.js – Spring-arm third-person camera

import * as THREE from 'three';

export const CAM_MODE = Object.freeze({
  THIRD_PERSON: 'third',
  COCKPIT:      'cockpit',
  HOOD:         'hood',
  FREE:         'free',
  CINEMATIC:    'cinematic',
});

export class CameraSystem3D {
  constructor(camera) {
    this.camera = camera;
    this.mode   = CAM_MODE.THIRD_PERSON;

    // ── Spring arm params ─────────────────────────────────
    this.ARM_LENGTH  = 18;   // metres behind
    this.ARM_HEIGHT  = 6.5;  // metres above pivot
    this.ARM_SIDE    = 0;    // lateral offset
    this.POS_LAG     = 5.5;  // position spring stiffness (higher = snappier)
    this.ROT_LAG     = 6.0;

    // Orbit input (right-mouse drag)
    this.orbitYaw   = 0;
    this.orbitPitch = 0;
    this.isOrbiting = false;

    // Current lerped state
    this._pos = new THREE.Vector3(0, 8, -20);
    this._lookAt = new THREE.Vector3(0, 1.5, 0);

    // Cockpit offset
    this.COCKPIT_OFFSET = new THREE.Vector3(0.4, 3.2, 2.2);

    // Cinematic path
    this._cinematicT = 0;
    this._cinematicRadius = 25;

    this._setupMouseOrbit();
  }

  _setupMouseOrbit() {
    let lastX = 0, lastY = 0, dragging = false;
    window.addEventListener('mousedown',  e => { if(e.button===2){dragging=true;lastX=e.clientX;lastY=e.clientY;} });
    window.addEventListener('mouseup',    e => { if(e.button===2) dragging=false; });
    window.addEventListener('mousemove',  e => {
      if (!dragging) return;
      this.orbitYaw   += (e.clientX - lastX) * 0.005;
      this.orbitPitch  = THREE.MathUtils.clamp(this.orbitPitch - (e.clientY - lastY) * 0.004, -0.5, 0.8);
      lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (e.key === '1') this.mode = CAM_MODE.THIRD_PERSON;
      if (e.key === '2') this.mode = CAM_MODE.COCKPIT;
      if (e.key === '3') this.mode = CAM_MODE.HOOD;
      if (e.key === '4') this.mode = CAM_MODE.CINEMATIC;
    });
  }

  update(physics, dt) {
    const truckPos = physics.position;
    const heading  = physics.heading + this.orbitYaw;

    switch (this.mode) {
      case CAM_MODE.THIRD_PERSON: this._updateThirdPerson(truckPos, physics, heading, dt); break;
      case CAM_MODE.COCKPIT:      this._updateCockpit(truckPos, physics, dt); break;
      case CAM_MODE.HOOD:         this._updateHood(truckPos, physics, dt); break;
      case CAM_MODE.CINEMATIC:    this._updateCinematic(truckPos, physics, dt); break;
    }

    // Decay orbit back to truck heading
    this.orbitYaw *= Math.pow(0.92, dt * 60);
  }

  _updateThirdPerson(truckPos, physics, heading, dt) {
    const sinH = Math.sin(heading), cosH = Math.cos(heading);
    const pitch = this.orbitPitch;
    const hDist = this.ARM_LENGTH * Math.cos(pitch);
    const vDist = this.ARM_HEIGHT + this.ARM_LENGTH * Math.sin(pitch);

    const idealPos = new THREE.Vector3(
      truckPos.x - sinH * hDist,
      truckPos.y + vDist,
      truckPos.z - cosH * hDist
    );

    // Spring lerp
    const k = 1 - Math.exp(-this.POS_LAG * dt);
    this._pos.lerp(idealPos, k);

    // Clip into terrain
    const groundUnder = physics.world.getHeightAt(this._pos.x, this._pos.z);
    if (this._pos.y < groundUnder + 1.5) this._pos.y = groundUnder + 1.5;

    this.camera.position.copy(this._pos);

    // Look slightly above truck
    const lookTarget = truckPos.clone().add(new THREE.Vector3(0, 2, 0));
    this._lookAt.lerp(lookTarget, 1 - Math.exp(-this.ROT_LAG * dt));
    this.camera.lookAt(this._lookAt);
  }

  _updateCockpit(truckPos, physics, dt) {
    const h = physics.heading;
    const off = this.COCKPIT_OFFSET.clone().applyEuler(new THREE.Euler(physics.pitch, h, physics.roll, 'YXZ'));
    const target = truckPos.clone().add(off);
    this._pos.lerp(target, 0.3);
    this.camera.position.copy(this._pos);
    const fwd = physics.forwardVec;
    const lookAt = target.clone().addScaledVector(fwd, 20).add(new THREE.Vector3(0, -0.5, 0));
    this.camera.lookAt(lookAt);
  }

  _updateHood(truckPos, physics, dt) {
    const h = physics.heading;
    const hoodOff = new THREE.Vector3(0, 3.8, 3.5).applyEuler(new THREE.Euler(0, h, 0));
    this._pos.lerp(truckPos.clone().add(hoodOff), 0.3);
    this.camera.position.copy(this._pos);
    const fwd = physics.forwardVec;
    this.camera.lookAt(truckPos.clone().addScaledVector(fwd, 30).add(new THREE.Vector3(0, 1, 0)));
  }

  _updateCinematic(truckPos, physics, dt) {
    this._cinematicT += dt * 0.3;
    const angle = this._cinematicT;
    const r = this._cinematicRadius;
    const pos = new THREE.Vector3(
      truckPos.x + Math.sin(angle) * r,
      truckPos.y + 8,
      truckPos.z + Math.cos(angle) * r
    );
    this._pos.lerp(pos, dt * 1.5);
    this.camera.position.copy(this._pos);
    this.camera.lookAt(truckPos.clone().add(new THREE.Vector3(0, 2, 0)));
  }

  snapTo(truckPos) {
    this._pos.copy(truckPos).add(new THREE.Vector3(0, this.ARM_HEIGHT, -this.ARM_LENGTH));
    this.camera.position.copy(this._pos);
  }
}
