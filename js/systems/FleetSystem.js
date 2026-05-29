// js/systems/FleetSystem.js – Fleet management: buy trucks, hire drivers, passive income

import { TRUCK_DEFS } from '../constants.js';

const DRIVER_HIRE_COST   = 2000;   // one-time hiring fee
const DRIVER_INCOME_RATE = 80;     // $ per minute per active driver

export class FleetSystem {
  constructor() {
    /**
     * Each entry: { id, defId, name, upgrades, paintColor, mileage, wear, driverAssigned, driverName }
     * Entry 0 is always the player's active truck.
     */
    this.trucks  = [];
    this._passiveAccum = 0; // accumulated passive $ (fractional)
  }

  // ── Initialise with starter truck ──────────────────────────
  initStarter() {
    if (this.trucks.length > 0) return;
    this.trucks.push({
      id:             1,
      defId:          'starter',
      name:           'My Starter Truck',
      upgrades:       { engine:0, fuelTank:0, handling:0, brakes:0 },
      paintColor:     '#E74C3C',
      mileage:        0,
      wear:           0,
      totalKm:        0,
      driverAssigned: false,
      driverName:     null,
    });
  }

  get activeTruck() { return this.trucks[0] || null; }
  get fleetSize()   { return this.trucks.length; }
  get driverCount() { return this.trucks.filter(t => t.driverAssigned).length; }

  getAvailableTrucks(level) {
    return TRUCK_DEFS.filter(d => d.unlockLevel <= level);
  }

  // ── Buy a new truck ─────────────────────────────────────────
  buyTruck(defId, economy, notif, playerLevel) {
    const def = TRUCK_DEFS.find(d => d.id === defId);
    if (!def) return false;
    if (def.unlockLevel > playerLevel) {
      notif?.notify(`Reach Level ${def.unlockLevel} to unlock this truck!`, '#E74C3C', 3);
      return false;
    }
    if (!economy.canAfford(def.price)) {
      notif?.notify(`Need $${def.price.toLocaleString()} to buy ${def.name}`, '#E74C3C', 2.5);
      return false;
    }
    if (this.trucks.length >= 5) {
      notif?.notify('Fleet is full! (Max 5 trucks)', '#E74C3C', 2.5);
      return false;
    }
    economy.spend(def.price, `Bought ${def.name}`);
    this.trucks.push({
      id:             Date.now(),
      defId,
      name:           def.name,
      upgrades:       { engine:0, fuelTank:0, handling:0, brakes:0 },
      paintColor:     def.color,
      mileage:        0,
      wear:           0,
      totalKm:        0,
      driverAssigned: false,
      driverName:     null,
    });
    notif?.notify(`🚛 ${def.name} added to your fleet!`, '#2ECC71', 3);
    return true;
  }

  // ── Hire / fire driver ──────────────────────────────────────
  hireDriver(truckIdx, driverName, economy, notif) {
    const truck = this.trucks[truckIdx];
    if (!truck || truck.driverAssigned) return false;
    if (!economy.canAfford(DRIVER_HIRE_COST)) {
      notif?.notify(`Need $${DRIVER_HIRE_COST} to hire a driver`, '#E74C3C', 2.5);
      return false;
    }
    economy.spend(DRIVER_HIRE_COST, `Hired driver: ${driverName}`);
    truck.driverAssigned = true;
    truck.driverName     = driverName;
    notif?.notify(`👨‍✈️ ${driverName} hired!`, '#2ECC71', 3);
    return true;
  }

  fireDriver(truckIdx, notif) {
    const truck = this.trucks[truckIdx];
    if (!truck || !truck.driverAssigned) return;
    const name = truck.driverName;
    truck.driverAssigned = false;
    truck.driverName     = null;
    notif?.notify(`${name} has been let go.`, '#888', 2.5);
  }

  // ── Passive income tick ─────────────────────────────────────
  tick(dt, economy) {
    const active = this.trucks.filter((t, i) => i > 0 && t.driverAssigned).length;
    if (active === 0) return 0;
    this._passiveAccum += (DRIVER_INCOME_RATE / 60) * active * dt;
    if (this._passiveAccum >= 1) {
      const earned = Math.floor(this._passiveAccum);
      this._passiveAccum -= earned;
      economy.earn(earned, 'Fleet Passive Income');
      return earned;
    }
    return 0;
  }

  get passiveIncomeRate() {
    return (this.trucks.filter((t, i) => i > 0 && t.driverAssigned).length) * DRIVER_INCOME_RATE;
  }

  // ── Apply saved truck data to the active Truck entity ───────
  applyToTruck(truckEntity) {
    const data = this.activeTruck;
    if (!data) return;
    truckEntity.fromJSON(data.upgrades ? {
      engineLevel:   data.upgrades.engine,
      handlingLevel: data.upgrades.handling,
      brakeLevel:    data.upgrades.brakes,
      fuelTankLevel: data.upgrades.fuelTank,
    } : {});
    truckEntity.paintColor = data.paintColor || '#E74C3C';
    truckEntity.mileage    = data.mileage || 0;
    truckEntity.wear       = data.wear    || 0;
    truckEntity.totalKm    = data.totalKm || 0;
  }

  /** Save current truck entity stats back to fleet data */
  syncFromTruck(truckEntity) {
    const data = this.activeTruck;
    if (!data) return;
    data.upgrades  = {
      engine:   truckEntity.engineLevel,
      fuelTank: truckEntity.fuelTankLevel,
      handling: truckEntity.handlingLevel,
      brakes:   truckEntity.brakeLevel,
    };
    data.paintColor = truckEntity.paintColor;
    data.mileage    = truckEntity.mileage;
    data.wear       = truckEntity.wear;
    data.totalKm    = truckEntity.totalKm;
  }

  // ── Serialize ───────────────────────────────────────────────
  toJSON()  { return { trucks: this.trucks }; }
  fromJSON(d) {
    if (d?.trucks && d.trucks.length > 0) {
      this.trucks = d.trucks;
    } else {
      this.initStarter();
    }
  }
}
