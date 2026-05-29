// js/engine3d/TruckPhysics3D.js – Arcade-sim vehicle physics with suspension

import * as THREE from 'three';

const DEG = Math.PI / 180;

export class TruckPhysics3D {
  constructor(world) {
    this.world = world;

    // Position and orientation
    this.position = new THREE.Vector3(20, 2, -2100);
    this.heading  = 0;   // yaw in radians (0 = facing +Z = into screen/scene)
    this.pitch    = 0;   // visual pitch from terrain slope
    this.roll     = 0;   // visual roll from terrain slope

    // Movement
    this.speed     = 0;    // m/s
    this.MAX_SPEED = 33;   // ~120 km/h
    this.MAX_REV   = 8;    // 8 m/s reverse

    // Engine & gears
    this.gear   = 1;
    this.rpm    = 800;
    this.TARGET_RPM_MAX = 3800;
    this.idleRPM = 700;

    // Gear ratios and max speed per gear
    this.GEARS = [0, 8, 16, 24, 33]; // max speed per gear 1-4

    // Inputs
    this.throttle = 0;  // 0-1
    this.brake    = 0;  // 0-1
    this.steer    = 0;  // -1 to +1

    // Physics constants
    this.MASS         = 5000;    // kg (lighter for responsive feel)
    this.ENGINE_FORCE = 220000;  // Newtons at peak
    this.BRAKE_FORCE  = 350000;
    this.AERO_DRAG    = 0.55;   // speed drag coefficient
    this.ROLL_RESIST  = 0.015;  // rolling resistance

    // Suspension
    this.suspY   = 0;     // current suspension offset
    this.suspVel = 0;     // suspension velocity
    this.SUSP_STIFFNESS = 20;
    this.SUSP_DAMPING   = 5;
    this.SUSP_REST      = 1.2; // resting height above terrain

    // Wheel rotation for visual
    this.wheelRot     = 0;
    this.steerAngle   = 0;   // current front wheel angle

    // Extra state
    this.onGround = true;
    this.handbrake = false;
    this.fuel      = 120;
    this.maxFuel   = 120;
    this.health    = 100;

    // Damage
    this.INVINCIBLE_TIMER = 0;

    // Exhaust / smoke particles pool
    this.exhaustTimer = 0;
  }

  // ── Physics update ────────────────────────────────────────
  update(dt, inputAccel, inputBrake, inputSteer, inputHandbrake) {
    dt = Math.min(dt, 0.033); // cap at 30fps minimum

    // ── Inputs (fast response) ────────────────────────────────
    this.throttle  = inputAccel    ? Math.min(1, this.throttle + dt * 5) : Math.max(0, this.throttle - dt * 8);
    this.brake     = inputBrake    ? Math.min(1, this.brake    + dt * 8) : Math.max(0, this.brake    - dt * 8);
    this.steer     = THREE.MathUtils.lerp(this.steer, inputSteer * 1.0, Math.min(1, dt * 8));
    this.handbrake = !!inputHandbrake;

    // ── Steer angle (reduces at high speed) ─────────────────
    const maxSteer = 35 * DEG * (1 - Math.abs(this.speed) / (this.MAX_SPEED * 1.4));
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, this.steer * maxSteer, dt * 6);

    // ── Engine torque → force ────────────────────────────────
    const gearMaxSpd = this.GEARS[this.gear] || this.MAX_SPEED;
    let engineForce = 0;
    if (this.fuel > 0 && this.throttle > 0.01 && this.speed >= 0) {
      const rpmRatio = Math.max(0, 1 - this.speed / gearMaxSpd);
      engineForce = this.ENGINE_FORCE * this.throttle * (0.4 + rpmRatio * 0.6);
    } else if (this.speed < 0 && this.brake > 0.01) {
      // Reverse acceleration
      engineForce = -this.ENGINE_FORCE * 0.35 * this.brake;
    }

    // ── Brake force ──────────────────────────────────────────
    let brakeForce = 0;
    if (this.speed > 0.5 && (this.brake > 0.01 || this.handbrake)) {
      brakeForce = this.BRAKE_FORCE * Math.max(this.brake, this.handbrake ? 0.6 : 0);
    }

    // ── Drag ─────────────────────────────────────────────────
    const drag = this.AERO_DRAG * this.speed * Math.abs(this.speed);
    const rollRes = this.ROLL_RESIST * this.MASS * 9.81 * Math.sign(this.speed);

    // ── Net acceleration ──────────────────────────────────────
    const netF   = engineForce - Math.sign(this.speed) * brakeForce - drag - rollRes;
    const accel  = netF / this.MASS;
    this.speed  += accel * dt;
    this.speed   = THREE.MathUtils.clamp(this.speed, -this.MAX_REV, this.MAX_SPEED);

    // Friction stop near zero
    if (Math.abs(this.speed) < 0.1 && this.throttle < 0.01) this.speed = 0;

    // ── Steering heading change ───────────────────────────────
    if (Math.abs(this.speed) > 0.3) {
      const turnRate = (this.steerAngle / 5.5) * (this.speed / gearMaxSpd * 0.5 + 0.5);
      this.heading += turnRate * Math.sign(this.speed) * dt;
    }

    // ── Forward direction ─────────────────────────────────────
    const fwd = new THREE.Vector3(
      Math.sin(this.heading),
      0,
      Math.cos(this.heading)
    );

    // ── Move truck ────────────────────────────────────────────
    this.position.addScaledVector(fwd, this.speed * dt);

    // ── Terrain following ─────────────────────────────────────
    const groundH = this.world.getHeightAt(this.position.x, this.position.z);
    const targetY = groundH + this.SUSP_REST;
    // Spring suspension
    const diff = targetY - this.position.y;
    this.suspVel += (diff * this.SUSP_STIFFNESS - this.suspVel * this.SUSP_DAMPING) * dt;
    this.position.y += this.suspVel * dt;
    this.onGround = diff > -0.5;

    // ── Visual pitch/roll from terrain ───────────────────────
    const rt = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
    const fH = this.world.getHeightAt(this.position.x + fwd.x*2.5, this.position.z + fwd.z*2.5);
    const bH = this.world.getHeightAt(this.position.x - fwd.x*2.5, this.position.z - fwd.z*2.5);
    const lH = this.world.getHeightAt(this.position.x - rt.x*1.8,  this.position.z - rt.z*1.8);
    const rH = this.world.getHeightAt(this.position.x + rt.x*1.8,  this.position.z + rt.z*1.8);
    this.pitch = THREE.MathUtils.lerp(this.pitch, Math.atan2(bH - fH, 5) * 0.5, dt * 4);
    this.roll  = THREE.MathUtils.lerp(this.roll,  Math.atan2(rH - lH, 3.6) * 0.4, dt * 4);

    // ── RPM calculation ───────────────────────────────────────
    const targetRPM = this.idleRPM + (this.speed / gearMaxSpd) * (this.TARGET_RPM_MAX - this.idleRPM);
    this.rpm = THREE.MathUtils.lerp(this.rpm, targetRPM + this.throttle * 400, dt * 3);
    this.rpm = THREE.MathUtils.clamp(this.rpm, this.idleRPM, this.TARGET_RPM_MAX + 200);

    // ── Gear shifting ─────────────────────────────────────────
    if (this.speed > 0) {
      if (this.speed > (this.GEARS[this.gear] || 0) * 0.95 && this.gear < this.GEARS.length - 1) {
        this.gear = Math.min(this.GEARS.length - 1, this.gear + 1);
      } else if (this.speed < (this.GEARS[this.gear - 1] || 0) * 0.6 && this.gear > 1) {
        this.gear = Math.max(1, this.gear - 1);
      }
    }

    // ── Fuel consumption ─────────────────────────────────────
    if (Math.abs(this.speed) > 0.5 && this.fuel > 0) {
      const fuelRate = 0.008 * (0.5 + this.throttle * 0.5) * (Math.abs(this.speed) / 20);
      this.fuel = Math.max(0, this.fuel - fuelRate * dt);
    }

    // ── Wheel rotation visual ─────────────────────────────────
    this.wheelRot -= (this.speed / 0.65) * dt; // wheel circumference ~4m

    // ── Off-road drag ─────────────────────────────────────────
    if (!this.world.isNearRoad(this.position.x, this.position.z, 10)) {
      this.speed *= (1 - 0.4 * dt);
    }

    // ── Invincibility timer ───────────────────────────────────
    if (this.INVINCIBLE_TIMER > 0) this.INVINCIBLE_TIMER -= dt;
  }

  takeDamage(amount) {
    if (this.INVINCIBLE_TIMER > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.INVINCIBLE_TIMER = 1.5;
    this.speed *= 0.4;
  }

  refuel() { this.fuel = this.maxFuel; }
  repair() { this.health = 100; }

  get speedKmh()   { return this.speed * 3.6; }
  get fuelPct()    { return this.fuel / this.maxFuel; }
  get healthPct()  { return this.health / 100; }
  get rpmPct()     { return (this.rpm - this.idleRPM) / (this.TARGET_RPM_MAX - this.idleRPM); }

  // Direction vector in world space
  get forwardVec() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }
}
