// js/entities/Truck.js (Phase 3 – adds mileage, wear, paintColor, horn, maintenance awareness)

import { clamp } from '../utils.js';
import { WORLD_W, WORLD_H } from '../constants.js';

export class Truck {
  constructor(config = {}) {
    this.id   = config.id   || 'truck_player';
    this.name = config.name || 'Starter Rig';

    // Position / movement
    this.x     = config.x     ?? 480;
    this.y     = config.y     ?? 2000;
    this.angle = config.angle ?? Math.PI / 2;
    this.speed = 0;

    // Collision half-dims (world units)
    this.halfW = 14;
    this.halfH = 30;

    // Vital stats
    this.health    = 100;
    this.maxHealth = 100;
    this._fuel     = 120;

    // ── Truck class base stats (overridden when a fleet truck is activated) ──
    this._bMaxSpd  = 200;
    this._bAccel   = 120;
    this._bDecel   = 180;
    this._bTurn    = 2.0;
    this._bFuel    = 120;
    this._bFuelRate = 1.0;

    // Upgrade levels 0–3
    this.engineLevel   = 0;
    this.handlingLevel = 0;
    this.brakeLevel    = 0;
    this.fuelTankLevel = 0;

    // Cargo
    this.hasCargo = false;
    this.cargo    = null;

    // Appearance
    this.paintColor = '#E74C3C';

    // Odometer / wear (for MaintenanceSystem)
    this.mileage  = 0;    // km-equiv since purchase
    this.wear     = 0;    // 0–100 %
    this.totalKm  = 0;    // lifetime km-equiv (for achievements)

    // Per-mission tracking
    this.totalDamageThisMission = 0;
    this.refueledThisMission    = false;
    this.maxSpeedThisMission    = 0;

    // Invincibility after hit
    this.isInvincible    = false;
    this._invincibleTimer = 0;
    this.INVINCIBLE_DUR   = 1.5;
  }

  // ── Computed stats ─────────────────────────────────────────
  get maxSpeed()     { return this._bMaxSpd   + this.engineLevel   * 30;  }
  get acceleration() { return this._bAccel    + this.engineLevel   * 15;  }
  get deceleration() { return this._bDecel    + this.brakeLevel    * 20;  }
  get turnSpeed()    { return this._bTurn     + this.handlingLevel * 0.25; }
  get maxFuel()      { return this._bFuel     + this.fuelTankLevel * 25;  }
  get fuelRate()     { return Math.max(0.3, this._bFuelRate - this.fuelTankLevel * 0.12); }

  get fuel()      { return this._fuel; }
  set fuel(v)     { this._fuel = clamp(v, 0, this.maxFuel); }
  get fuelPct()   { return this._fuel / this.maxFuel; }
  get healthPct() { return this.health / this.maxHealth; }
  get speedAbs()  { return Math.abs(this.speed); }

  // ── Apply a TruckDef (fleet system) ────────────────────────
  applyDef(def) {
    this._bMaxSpd   = def.maxSpeed;
    this._bAccel    = def.acceleration;
    this._bDecel    = def.deceleration;
    this._bTurn     = def.turnSpeed;
    this._bFuel     = def.maxFuel;
    this._bFuelRate = def.fuelRate;
    this.maxHealth  = def.maxHealth;
    this.paintColor = def.color;
  }

  // ── Actions ────────────────────────────────────────────────
  accelerate(dt) {
    if (this._fuel <= 0) return;
    this.speed = Math.min(this.speed + this.acceleration * dt, this.maxSpeed);
  }

  brake(dt) {
    if (this.speed > 0) this.speed = Math.max(0, this.speed - this.deceleration * dt);
    else this.speed = Math.max(-this.maxSpeed * 0.35, this.speed - this.acceleration * 0.5 * dt);
  }

  coast(dt) {
    const fr = 55;
    if (this.speed > 0)      this.speed = Math.max(0, this.speed - fr * dt);
    else if (this.speed < 0) this.speed = Math.min(0, this.speed + fr * dt);
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

  consumeFuel(dt, weatherFuelMult = 1.0, wearFuelMult = 1.0) {
    if (this.speedAbs > 1) {
      const use = this.fuelRate * (this.speedAbs / 100) * dt * weatherFuelMult * wearFuelMult;
      this._fuel = Math.max(0, this._fuel - use);
    }
  }

  takeDamage(amount) {
    if (this.isInvincible) return 0;
    const actual = Math.min(amount, this.health);
    this.health -= actual;
    this.totalDamageThisMission += actual;
    if (this.cargo?.isFragile) {
      this.cargo.condition = Math.max(0.3, this.cargo.condition - (actual / 100) * 0.55);
    }
    this.isInvincible    = true;
    this._invincibleTimer = this.INVINCIBLE_DUR;
    return actual;
  }

  repair(amount) { this.health = Math.min(this.maxHealth, this.health + amount); }

  // ── Per-frame update ────────────────────────────────────────
  update(dt, weatherTractionMult = 1.0) {
    // Speed cap (weather + wear may reduce)
    const effectiveMax = this.maxSpeed * weatherTractionMult;
    if (this.speed > effectiveMax) this.speed = effectiveMax;

    // Move
    this.x += Math.sin(this.angle) * this.speed * dt;
    this.y -= Math.cos(this.angle) * this.speed * dt;
    this.x  = clamp(this.x, 50, WORLD_W - 50);
    this.y  = clamp(this.y, 50, WORLD_H - 50);

    // Track max speed this mission
    if (this.speedAbs > this.maxSpeedThisMission) this.maxSpeedThisMission = this.speedAbs;

    // Invincibility
    if (this.isInvincible) {
      this._invincibleTimer -= dt;
      if (this._invincibleTimer <= 0) this.isInvincible = false;
    }
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
    this.refueledThisMission    = false;
    this.maxSpeedThisMission    = 0;
    this.isInvincible    = false;
    this._invincibleTimer = 0;
  }

  // ── Serialisation ───────────────────────────────────────────
  toJSON() {
    return {
      engineLevel:   this.engineLevel,
      handlingLevel: this.handlingLevel,
      brakeLevel:    this.brakeLevel,
      fuelTankLevel: this.fuelTankLevel,
      paintColor:    this.paintColor,
      mileage:       this.mileage,
      wear:          this.wear,
      totalKm:       this.totalKm,
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.engineLevel   = data.engineLevel   || 0;
    this.handlingLevel = data.handlingLevel || 0;
    this.brakeLevel    = data.brakeLevel    || 0;
    this.fuelTankLevel = data.fuelTankLevel || 0;
    this.paintColor    = data.paintColor    || '#E74C3C';
    this.mileage       = data.mileage       || 0;
    this.wear          = data.wear          || 0;
    this.totalKm       = data.totalKm       || 0;
    this._fuel = this.maxFuel;
  }
}
