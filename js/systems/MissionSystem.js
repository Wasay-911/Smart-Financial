// js/systems/MissionSystem.js (Phase 3 – contract pool + time limits)

import { MISSION_DEFS, CARGO_DEFS, PICKUP_POS, DELIVERY_POS, CITIES, MISSION_PHASE } from '../constants.js';
import { MissionGenerator } from './MissionGenerator.js';
import { Cargo } from '../entities/Cargo.js';
import { dist } from '../utils.js';

export class MissionSystem {
  constructor() {
    this.definitions   = MISSION_DEFS;
    this.contractPool  = [];    // generated mission pool for selection screen
    this.selectedIdx   = 0;

    this.active        = null;
    this.phase         = null;
    this.timeElapsed   = 0;     // seconds into current mission
    this.lastCompleted = null;
    this.missionCount  = 0;
    this.pickupPos     = {...PICKUP_POS};
    this.deliveryPos   = {...DELIVERY_POS};

    // Per-session stats for achievements
    this.cargoTypesDelivered = new Set();
    this.cleanStreak         = 0;
    this.lastNoRefuel        = false;
    this.deliveredInStorm    = false;
    this.deliveredAtNight    = false;
  }

  // ── Contract pool ────────────────────────────────────────
  refreshPool(playerLevel = 1) {
    this.contractPool = MissionGenerator.generatePool(6, playerLevel);
  }

  /** Current pool for display (falls back to static defs if empty) */
  get displayMissions() {
    return this.contractPool.length > 0 ? this.contractPool : [...this.definitions];
  }

  // ── Marker data for Renderer ─────────────────────────────
  get markerData() {
    if (!this.active) return null;
    return { phase: this.phase, pickupPos: this.pickupPos, deliveryPos: this.deliveryPos };
  }

  // ── Time limit helpers ────────────────────────────────────
  get hasTimeLimit()    { return !!this.active?.timeLimit; }
  get timeRemaining()   {
    if (!this.hasTimeLimit) return Infinity;
    return Math.max(0, this.active.timeLimit - this.timeElapsed);
  }
  get timeFailed()      { return this.hasTimeLimit && this.timeRemaining <= 0; }
  get completedOnTime() { return this.hasTimeLimit && this.timeElapsed <= this.active.timeLimit; }

  // ── Start ────────────────────────────────────────────────
  startMission(defOrIdx) {
    const def = typeof defOrIdx === 'number' ? this.displayMissions[defOrIdx] : defOrIdx;
    const cargoDef = CARGO_DEFS.find(c => c.id === def.cargoId);

    this.active = {
      id:          def.id,
      name:        def.name,
      def,
      cargo:       new Cargo(cargoDef),
      fromCity:    CITIES[def.fromCity],
      toCity:      CITIES[def.toCity],
      timeLimit:   def.timeLimit || null,
      timeBonusAmt:def.timeBonusAmt || 0,
      startTime:   Date.now(),
    };
    this.phase       = MISSION_PHASE.PICKUP;
    this.timeElapsed = 0;
    this.lastCompleted = null;
  }

  // ── Update ────────────────────────────────────────────────
  /**
   * @param {Truck} truck
   * @param {number} dt
   * @param {NotificationSystem} notif
   * @param {boolean} isStorm  For achievement tracking
   * @param {number} timeOfDay For night delivery achievement
   * @returns {'pickup_done'|'delivered'|'time_failed'|null}
   */
  update(truck, dt, notif, isStorm = false, timeOfDay = 0) {
    if (!this.active || !this.phase) return null;

    if (this.phase === MISSION_PHASE.PICKUP || this.phase === MISSION_PHASE.DELIVERY) {
      this.timeElapsed += dt;
    }

    // Time limit failure
    if (this.timeFailed) {
      notif?.notify('⏰ Time limit exceeded! Partial reward…', '#E74C3C', 4);
      return this._failTimeLimit(truck, notif);
    }

    if (this.phase === MISSION_PHASE.PICKUP) {
      if (dist(truck.x, truck.y, this.pickupPos.x, this.pickupPos.y) < 100) {
        truck.hasCargo = true;
        truck.cargo    = this.active.cargo;
        this.phase     = MISSION_PHASE.DELIVERY;
        notif?.notify('📦  Cargo loaded! Drive to Hyderabad!', '#2ECC71', 3);
        notif?.burst(truck.x, truck.y, 18, ['#2ECC71','#FFD700']);
        return 'pickup_done';
      }
    } else if (this.phase === MISSION_PHASE.DELIVERY) {
      if (dist(truck.x, truck.y, this.deliveryPos.x, this.deliveryPos.y) < 120) {
        return this._completeDelivery(truck, notif, isStorm, timeOfDay);
      }
    }
    return null;
  }

  _completeDelivery(truck, notif, isStorm, timeOfDay) {
    const cargo   = this.active.cargo;
    let   reward  = cargo.calculateReward(truck);

    // Time bonus
    if (this.hasTimeLimit && this.completedOnTime) {
      reward += this.active.timeBonusAmt;
      notif?.notify(`⏱ Time Bonus! +$${this.active.timeBonusAmt}`, '#FFD700', 2.5);
    }

    const stars = cargo.getStars(truck);
    const noDamage = truck.totalDamageThisMission === 0;

    // Achievement tracking
    this.cargoTypesDelivered.add(cargo.id);
    if (noDamage) this.cleanStreak++;
    else          this.cleanStreak = 0;
    this.lastNoRefuel    = !truck.refueledThisMission;
    this.deliveredInStorm = isStorm;
    this.deliveredAtNight = timeOfDay > 0.65 || timeOfDay < 0.1;

    this.lastCompleted = {
      mission:     this.active,
      reward,
      stars,
      damage:      truck.totalDamageThisMission,
      timeElapsed: this.timeElapsed,
      noDamage,
    };

    truck.hasCargo = false;
    truck.cargo    = null;
    this.missionCount++;
    this.active = null;
    this.phase  = null;

    notif?.burst(truck.x, truck.y, 50, ['#FFD700','#2ECC71','#E74C3C','#3498DB']);
    return 'delivered';
  }

  _failTimeLimit(truck, notif) {
    // Deliver anyway but with greatly reduced reward
    const cargo  = this.active.cargo;
    const reward = Math.round(cargo.baseReward * 0.25); // 25% for late delivery
    this.lastCompleted = {
      mission: this.active, reward, stars: 0,
      damage: truck.totalDamageThisMission, timeElapsed: this.timeElapsed,
      noDamage: false, timeFailed: true,
    };
    truck.hasCargo = false; truck.cargo = null;
    this.missionCount++;
    this.active = null; this.phase = null;
    return 'time_failed';
  }

  cancelMission(truck) {
    truck.hasCargo = false; truck.cargo = null;
    this.active = null; this.phase = null;
  }
}
