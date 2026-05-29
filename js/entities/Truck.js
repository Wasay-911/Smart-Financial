// js/entities/Truck.js

import { clamp } from '../utils.js';
import { WORLD_W, WORLD_H } from '../constants.js';

export class Truck {
  constructor(config = {}) {
    // Identity
    this.id   = config.id   || 'truck_player';
    this.name = config.name || 'Starter Truck';

    // Position / movement
    this.x     = config.x     ?? 480;
    this.y     = config.y     ?? 2000;
    this.angle = config.angle ?? Math.PI / 2;  // facing east (toward Hyderabad)
    this.speed = 0;

    // Collision size (half-dims in world units)
    this.halfW = 14;
    this.halfH = 30;

    // Vital stats
    this.health    = 100;
    this.maxHealth = 100;

    // Fuel (use getter/setter to enforce cap)
    this._fuel = 100;

    // Upgrade levels  0–3
    this.engineLevel   = 0;
    this.handlingLevel = 0;
    this.brakeLevel    = 0;
    this.fuelTankLevel = 0;

    // Cargo
    this.hasCargo = false;
    this.cargo    = null;   // Cargo instance

    // Per-mission tracking
    this.totalDamageThisMission = 0;

    // Invincibility after hit
    this.isInvincible    = false;
    this._invincibleTimer = 0;
    this.INVINCIBLE_DUR   = 1.5;   // seconds
  }

  // ── Computed stats ──────────────────────────────────────────
  get maxSpeed()     { return 200 + this.engineLevel   * 30;  }
  get acceleration() { return 120 + this.engineLevel   * 15;  }
  get deceleration() { return 180 + this.brakeLevel    * 20;  }
  get turnSpeed()    { return 2.0 + this.handlingLevel * 0.25; }
    get maxFuel()      { return 120 + this.fuelTankLevel * 25;  }
    get fuelRate()     { return Math.max(0.3, 1.0 - this.fuelTankLevel * 0.12); }

  get fuel()      { return this._fuel; }
  set fuel(v)     { this._fuel = clamp(v, 0, this.maxFuel); }
  get fuelPct()   { return this._fuel / this.maxFuel; }
  get healthPct() { return this.health / this.maxHealth; }
  get speedAbs()  { return Math.abs(this.speed); }

  // ── Physics actions ─────────────────────────────────────────
  accelerate(dt) {
    if (this._fuel <= 0) return;
    this.speed = Math.min(this.speed + this.acceleration * dt, this.maxSpeed);
  }

  brake(dt) {
    if (this.speed > 0) {
      this.speed = Math.max(0, this.speed - this.deceleration * dt);
    } else {
      this.speed = Math.max(-this.maxSpeed * 0.35, this.speed - this.acceleration * 0.5 * dt);
    }
  }

  coast(dt) {
    const fr = 55;
    if (this.speed > 0)       this.speed = Math.max(0, this.speed - fr * dt);
    else if (this.speed < 0)  this.speed = Math.min(0, this.speed + fr * dt);
  }

  turnLeft(dt) {
    if (this.speedAbs < 4) return;
    const tf  = 0.4 + 0.6 * this.speedAbs / this.maxSpeed;
    const dir = this.speed > 0 ? 1 : -1;
    this.angle -= this.turnSpeed * tf * dt * dir;
  }

  turnRight(dt) {
    if (this.speedAbs < 4) return;
    const tf  = 0.4 + 0.6 * this.speedAbs / this.maxSpeed;
    const dir = this.speed > 0 ? 1 : -1;
    this.angle += this.turnSpeed * tf * dt * dir;
  }

  consumeFuel(dt) {
    if (this.speedAbs > 1) {
      this._fuel = Math.max(0, this._fuel - this.fuelRate * (this.speedAbs / 100) * dt);
    }
  }

  /**
   * Apply damage and start invincibility window.
   * Returns actual damage dealt (0 if invincible).
   */
  takeDamage(amount) {
    if (this.isInvincible) return 0;
    const actual = Math.min(amount, this.health);
    this.health  -= actual;
    this.totalDamageThisMission += actual;
    if (this.cargo && this.cargo.isFragile) {
      this.cargo.condition = Math.max(0.3, this.cargo.condition - (actual / 100) * 0.6);
    }
    this.isInvincible    = true;
    this._invincibleTimer = this.INVINCIBLE_DUR;
    return actual;
  }

  repair(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // ── Per-frame update ────────────────────────────────────────
  update(dt) {
    // Move
    this.x += Math.sin(this.angle) * this.speed * dt;
    this.y -= Math.cos(this.angle) * this.speed * dt;

    // Clamp to world
    this.x = clamp(this.x, 50, WORLD_W - 50);
    this.y = clamp(this.y, 50, WORLD_H - 50);

    // Invincibility countdown
    if (this.isInvincible) {
      this._invincibleTimer -= dt;
      if (this._invincibleTimer <= 0) this.isInvincible = false;
    }

    // Fuel
    this.consumeFuel(dt);
  }

  // ── Mission lifecycle ───────────────────────────────────────
  resetForMission() {
    this.x     = 480;
    this.y     = 2000;
    this.angle = Math.PI / 2;
    this.speed = 0;
    this._fuel = this.maxFuel;
    this.health = this.maxHealth;
    this.hasCargo  = false;
    this.cargo     = null;
    this.totalDamageThisMission = 0;
    this.isInvincible    = false;
    this._invincibleTimer = 0;
  }

  // ── Serialization ───────────────────────────────────────────
  toJSON() {
    return {
      engineLevel:   this.engineLevel,
      handlingLevel: this.handlingLevel,
      brakeLevel:    this.brakeLevel,
      fuelTankLevel: this.fuelTankLevel,
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.engineLevel   = data.engineLevel   || 0;
    this.handlingLevel = data.handlingLevel || 0;
    this.brakeLevel    = data.brakeLevel    || 0;
    this.fuelTankLevel = data.fuelTankLevel || 0;
    this._fuel = this.maxFuel;
  }
}
