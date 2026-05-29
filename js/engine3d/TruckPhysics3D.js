// js/engine3d/TruckPhysics3D.js – Reliable arcade-sim vehicle physics

import * as THREE from 'three';

export class TruckPhysics3D {
  constructor(world) {
    this.world = world;

    // ── State ─────────────────────────────────────────────
    this.position   = new THREE.Vector3(20, 2, -2000);
    this.heading    = 0;      // yaw: 0 = facing +Z (into scene)
    this.speed      = 0;      // m/s, positive = forward
    this.pitch      = 0;      // visual only
    this.roll       = 0;      // visual only

    // ── Tuning ────────────────────────────────────────────
    this.MAX_SPEED  = 33.3;   // ~120 km/h
    this.MAX_REV    = 8;      // ~29 km/h reverse
    this.ACCEL      = 28;     // m/s² forward
    this.DECEL      = 40;     // m/s² braking
    this.FRICTION   = 12;     // m/s² natural deceleration
    this.TURN_RATE  = 1.6;    // rad/s at max (speed-scaled)

    // ── Engine ────────────────────────────────────────────
    this.rpm         = 800;
    this.gear        = 1;
    this.throttle    = 0;
    this.brake       = 0;
    this.steerAngle  = 0;
    this.wheelRot    = 0;

    // ── Vitals ────────────────────────────────────────────
    this.fuel        = 120;
    this.maxFuel     = 120;
    this.health      = 100;

    // ── Suspension visual ─────────────────────────────────
    this._suspBob    = 0;
    this._suspVel    = 0;

    // ── Collision ─────────────────────────────────────────
    this.INVINCIBLE_TIMER = 0;
  }

  // ── Per-frame update ──────────────────────────────────────
  update(dt, inputAccel, inputBrake, inputSteer, inputHandbrake) {
    dt = Math.min(dt, 0.033);

    // ── Throttle / brake inputs ────────────────────────────
    const accel     = !!inputAccel;
    const braking   = !!inputBrake || !!inputHandbrake;
    const steer     = typeof inputSteer === 'number' ? inputSteer : 0;

    // ── Speed calculation ─────────────────────────────────
    if (accel && this.fuel > 0) {
      if (this.speed >= 0) {
        this.speed += this.ACCEL * dt;
      } else {
        // Pressing accel while reversing → brake
        this.speed += this.DECEL * dt;
      }
    } else if (braking) {
      if (this.speed > 0) {
        this.speed -= this.DECEL * dt;
        if (this.speed < 0) this.speed = 0;
      } else if (!inputHandbrake) {
        // Reverse
        this.speed -= this.ACCEL * 0.4 * dt;
      }
    } else {
      // Natural friction
      if (this.speed > 0)       this.speed = Math.max(0, this.speed - this.FRICTION * dt);
      else if (this.speed < 0)  this.speed = Math.min(0, this.speed + this.FRICTION * dt);
    }

    // Handbrake: kill speed fast
    if (inputHandbrake) this.speed *= Math.pow(0.08, dt);

    // Speed limits
    this.speed = THREE.MathUtils.clamp(this.speed, -this.MAX_REV, this.MAX_SPEED);

    // Off-road drag (mild)
    if (!this.world.isNearRoad(this.position.x, this.position.z, 18)) {
      this.speed *= (1 - 0.55 * dt);
    }

    // ── Steering ──────────────────────────────────────────
    if (Math.abs(this.speed) > 0.5) {
      // Turn rate decreases at high speed (realistic understeer)
      const speedFactor = Math.max(0.2, 1 - Math.abs(this.speed) / (this.MAX_SPEED * 1.3));
      const turnDir = Math.sign(this.speed);
      this.heading += steer * this.TURN_RATE * speedFactor * turnDir * dt;
    }

    // Smooth steer angle for wheel visual
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, steer * 0.45, dt * 7);

    // ── Move ──────────────────────────────────────────────
    const sinH = Math.sin(this.heading), cosH = Math.cos(this.heading);
    this.position.x += sinH * this.speed * dt;
    this.position.z += cosH * this.speed * dt;

    // ── Terrain following ─────────────────────────────────
    const gH  = this.world.getHeightAt(this.position.x, this.position.z);
    const tgt = gH + 1.15;
    // Soft spring: position.y tracks ground height
    this._suspVel += (tgt - this.position.y) * 22 * dt;
    this._suspVel *= (1 - 6 * dt);   // damping
    this.position.y += this._suspVel * dt;

    // ── Visual pitch/roll from slope ───────────────────────
    const fH = this.world.getHeightAt(this.position.x + sinH*2.5, this.position.z + cosH*2.5);
    const bH = this.world.getHeightAt(this.position.x - sinH*2.5, this.position.z - cosH*2.5);
    const lH = this.world.getHeightAt(this.position.x + cosH*1.8, this.position.z - sinH*1.8);
    const rH = this.world.getHeightAt(this.position.x - cosH*1.8, this.position.z + sinH*1.8);
    this.pitch = THREE.MathUtils.lerp(this.pitch, Math.atan2(bH - fH, 5) * 0.5, dt * 5);
    this.roll  = THREE.MathUtils.lerp(this.roll,  Math.atan2(rH - lH, 3.6) * 0.4, dt * 5);

    // ── RPM simulation ────────────────────────────────────
    const gearSpeeds = [0, 8, 16, 24, 33];
    const gMax = gearSpeeds[this.gear] || this.MAX_SPEED;
    const rpmTarget = 800 + (this.speed / gMax) * (accel ? 3400 : 2800);
    this.rpm = THREE.MathUtils.lerp(this.rpm, rpmTarget, dt * 4);
    this.rpm = THREE.MathUtils.clamp(this.rpm, 750, 4200);

    // ── Gear shifting ─────────────────────────────────────
    if (this.speed > 0) {
      if (this.speed > gMax * 0.94 && this.gear < 4) this.gear++;
      else if (this.speed < (gearSpeeds[this.gear-1]||0) * 0.58 && this.gear > 1) this.gear--;
    }

    // ── Wheel rotation visual ─────────────────────────────
    this.wheelRot -= this.speed * dt / 0.65;

    // ── Fuel ──────────────────────────────────────────────
    if (Math.abs(this.speed) > 0.5) {
      this.fuel = Math.max(0, this.fuel - 0.008 * (0.4 + (accel ? 0.6 : 0)) * dt);
    }

    // ── Invincibility cooldown ─────────────────────────────
    if (this.INVINCIBLE_TIMER > 0) this.INVINCIBLE_TIMER -= dt;
  }

  // ── Accessors ─────────────────────────────────────────────
  get speedKmh()   { return this.speed * 3.6; }
  get fuelPct()    { return this.fuel / this.maxFuel; }
  get healthPct()  { return this.health / 100; }
  get rpmPct()     { return (this.rpm - 750) / (4200 - 750); }

  get forwardVec() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  // ── Damage / repair ───────────────────────────────────────
  takeDamage(amount) {
    if (this.INVINCIBLE_TIMER > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.INVINCIBLE_TIMER = 1.5;
    this.speed *= 0.35;
  }

  refuel()  { this.fuel   = this.maxFuel; }
  repair()  { this.health = 100; }
}
