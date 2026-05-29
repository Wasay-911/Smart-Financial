// js/systems/MissionSystem.js – Phase 10: city-to-city missions

import { CARGO_DEFS, CITIES, CITY_WAREHOUSES, MISSION_PHASE } from '../constants.js';
import { MissionGenerator } from './MissionGenerator.js';
import { Cargo } from '../entities/Cargo.js';
import { dist } from '../utils.js';

export class MissionSystem {
  constructor() {
    this.contractPool  = [];
    this.selectedIdx   = 0;
    this.active        = null;
    this.phase         = null;
    this.timeElapsed   = 0;
    this.lastCompleted = null;
    this.missionCount  = 0;
    this.pickupPos     = {x:780, y:4100};
    this.deliveryPos   = {x:2850, y:3650};

    // Per-session stats
    this.cargoTypesDelivered = new Set();
    this.citiesDelivered     = new Set();
    this.cleanStreak         = 0;
    this.lastNoRefuel        = false;
    this.deliveredInStorm    = false;
    this.deliveredAtNight    = false;
  }

  // ── Pool ─────────────────────────────────────────────────
  refreshPool(playerLevel, unlockedCities) {
    this.contractPool = MissionGenerator.generatePool(6, playerLevel, unlockedCities);
  }

  get displayMissions() { return this.contractPool.length > 0 ? this.contractPool : []; }

  // ── Marker data ──────────────────────────────────────────
  get markerData() {
    if (!this.active) return null;
    return { phase:this.phase, pickupPos:this.pickupPos, deliveryPos:this.deliveryPos };
  }

  get hasTimeLimit()    { return !!this.active?.timeLimit; }
  get timeRemaining()   { return this.hasTimeLimit ? Math.max(0,this.active.timeLimit-this.timeElapsed) : Infinity; }
  get timeFailed()      { return this.hasTimeLimit && this.timeRemaining<=0; }
  get completedOnTime() { return this.hasTimeLimit && this.timeElapsed<=this.active.timeLimit; }

  // ── Start mission ─────────────────────────────────────────
  startMission(defOrIdx) {
    const def = typeof defOrIdx==='number' ? this.displayMissions[defOrIdx] : defOrIdx;
    if (!def) { console.warn('[MissionSystem] No mission at index', defOrIdx); return; }

    const cargoDef = CARGO_DEFS.find(c=>c.id===def.cargoId) || CARGO_DEFS[0];

    // Resolve pickup and delivery world positions from city warehouses
    const pPos = CITY_WAREHOUSES[def.fromCity] || {x:780, y:4100};
    const dPos = CITY_WAREHOUSES[def.toCity]   || {x:2850, y:3650};
    this.pickupPos   = {...pPos};
    this.deliveryPos = {...dPos};

    this.active = {
      id:           def.id,
      name:         def.name,
      def,
      cargo:        new Cargo(cargoDef),
      fromCity:     def.fromCity,
      toCity:       def.toCity,
      fromCityDef:  CITIES[def.fromCity],
      toCityDef:    CITIES[def.toCity],
      timeLimit:    def.timeLimit||null,
      timeBonusAmt: def.timeBonusAmt||0,
      routeDist:    def.routeDist||2800,
      startTime:    Date.now(),
    };
    this.phase       = MISSION_PHASE.PICKUP;
    this.timeElapsed = 0;
    this.lastCompleted = null;
  }

  // ── Per-frame update ──────────────────────────────────────
  update(truck, dt, notif, isStorm=false, timeOfDay=0) {
    if (!this.active || !this.phase) return null;

    if (this.phase===MISSION_PHASE.PICKUP || this.phase===MISSION_PHASE.DELIVERY) {
      this.timeElapsed += dt;
    }

    if (this.timeFailed) {
      notif?.notify('⏰ Time limit exceeded! Partial reward…', '#E74C3C', 4);
      return this._failTime(truck, notif);
    }

    if (this.phase===MISSION_PHASE.PICKUP) {
      if (dist(truck.x, truck.y, this.pickupPos.x, this.pickupPos.y) < 110) {
        truck.hasCargo = true; truck.cargo = this.active.cargo;
        this.phase = MISSION_PHASE.DELIVERY;
        const dest = this.active.toCityDef?.name || 'destination';
        notif?.notify(`📦 Cargo loaded! Drive to ${dest}!`, '#2ECC71', 3);
        notif?.burst(truck.x, truck.y, 18, ['#2ECC71','#FFD700']);
        return 'pickup_done';
      }
    } else if (this.phase===MISSION_PHASE.DELIVERY) {
      if (dist(truck.x, truck.y, this.deliveryPos.x, this.deliveryPos.y) < 120) {
        return this._complete(truck, notif, isStorm, timeOfDay);
      }
    }
    return null;
  }

  _complete(truck, notif, isStorm, timeOfDay) {
    const cargo  = this.active.cargo;
    let   reward = cargo.calculateReward(truck);
    if (this.hasTimeLimit && this.completedOnTime) {
      reward += this.active.timeBonusAmt;
      notif?.notify(`⏱ Time Bonus! +$${this.active.timeBonusAmt}`, '#FFD700', 2.5);
    }
    const stars    = cargo.getStars(truck);
    const noDamage = truck.totalDamageThisMission===0;

    this.cargoTypesDelivered.add(cargo.id);
    this.citiesDelivered.add(this.active.toCity);
    if (noDamage) this.cleanStreak++; else this.cleanStreak=0;
    this.lastNoRefuel    = !truck.refueledThisMission;
    this.deliveredInStorm  = isStorm;
    this.deliveredAtNight  = timeOfDay>0.65||timeOfDay<0.1;

    this.lastCompleted = {
      mission:     this.active,
      reward, stars,
      damage:      truck.totalDamageThisMission,
      timeElapsed: this.timeElapsed,
      noDamage,
      fromCity:    this.active.fromCity,
      toCity:      this.active.toCity,
    };
    truck.hasCargo=false; truck.cargo=null;
    this.missionCount++;
    this.active=null; this.phase=null;
    notif?.burst(truck.x, truck.y, 50, ['#FFD700','#2ECC71','#E74C3C','#3498DB']);
    return 'delivered';
  }

  _failTime(truck, notif) {
    const reward = Math.round(this.active.cargo.baseReward * 0.25);
    this.lastCompleted = {
      mission:this.active, reward, stars:0,
      damage:truck.totalDamageThisMission, timeElapsed:this.timeElapsed,
      noDamage:false, timeFailed:true,
      fromCity:this.active.fromCity, toCity:this.active.toCity,
    };
    truck.hasCargo=false; truck.cargo=null;
    this.missionCount++;
    this.active=null; this.phase=null;
    return 'time_failed';
  }

  cancelMission(truck) {
    truck.hasCargo=false; truck.cargo=null;
    this.active=null; this.phase=null;
  }
}
