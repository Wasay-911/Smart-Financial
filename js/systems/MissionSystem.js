// js/systems/MissionSystem.js

import { MISSION_DEFS, CARGO_DEFS, PICKUP_POS, DELIVERY_POS, CITIES, MISSION_PHASE } from '../constants.js';
import { Cargo } from '../entities/Cargo.js';
import { dist } from '../utils.js';

export class MissionSystem {
  constructor() {
    this.definitions   = MISSION_DEFS;
    this.selectedIdx   = 0;

    this.active        = null;   // active Mission object
    this.phase         = null;   // MISSION_PHASE value
    this.lastCompleted = null;   // set after win
    this.missionCount  = 0;
    this.pickupPos     = {...PICKUP_POS};
    this.deliveryPos   = {...DELIVERY_POS};
  }

  // ── Accessors for Renderer ──────────────────────────────────
  /** For Renderer: provide phase + positions as a single object */
  get markerData() {
    if (!this.active) return null;
    return { phase: this.phase, pickupPos: this.pickupPos, deliveryPos: this.deliveryPos };
  }

  // ── Start a mission ─────────────────────────────────────────
  startMission(defIdx) {
    const def   = this.definitions[defIdx];
    const cargoDef = CARGO_DEFS.find(c => c.id === def.cargoId);

    this.active = {
      id:        def.id,
      name:      def.name,
      def,
      cargo:     new Cargo(cargoDef),
      fromCity:  CITIES[def.fromCity],
      toCity:    CITIES[def.toCity],
      startTime: Date.now(),
    };
    this.phase         = MISSION_PHASE.PICKUP;
    this.lastCompleted = null;
  }

  // ── Per-frame update ────────────────────────────────────────
  /**
   * @param {Truck} truck
   * @param {NotificationSystem} notif
   * @returns {'pickup_done'|'delivered'|null}
   */
  update(truck, notif) {
    if (!this.active || !this.phase) return null;

    if (this.phase === MISSION_PHASE.PICKUP) {
      if (dist(truck.x, truck.y, this.pickupPos.x, this.pickupPos.y) < 100) {
        truck.hasCargo = true;
        truck.cargo    = this.active.cargo;
        this.phase     = MISSION_PHASE.DELIVERY;
        notif?.notify('📦  Cargo loaded! Drive to Hyderabad!', '#2ECC71', 3);
        notif?.burst(truck.x, truck.y, 18, ['#2ECC71', '#FFD700']);
        return 'pickup_done';
      }
    } else if (this.phase === MISSION_PHASE.DELIVERY) {
      if (dist(truck.x, truck.y, this.deliveryPos.x, this.deliveryPos.y) < 120) {
        return this._completeDelivery(truck, notif);
      }
    }
    return null;
  }

  _completeDelivery(truck, notif) {
    const cargo  = this.active.cargo;
    const reward = cargo.calculateReward(truck);
    const stars  = cargo.getStars(truck);

    this.lastCompleted = {
      mission: this.active,
      reward,
      stars,
      damage: truck.totalDamageThisMission,
    };

    truck.hasCargo = false;
    truck.cargo    = null;
    this.missionCount++;
    this.active = null;
    this.phase  = null;

    notif?.burst(truck.x, truck.y, 50, ['#FFD700','#2ECC71','#E74C3C','#3498DB']);
    return 'delivered';
  }

  // ── Reset after game over ───────────────────────────────────
  cancelMission(truck) {
    truck.hasCargo = false;
    truck.cargo    = null;
    this.active    = null;
    this.phase     = null;
  }
}
