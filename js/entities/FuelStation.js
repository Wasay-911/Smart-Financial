// js/entities/FuelStation.js

import { dist } from '../utils.js';

export class FuelStation {
  constructor(def) {
    this.id   = def.id;
    this.x    = def.x;
    this.y    = def.y;
    this.name = def.name;

    this.fuelCostPerUnit   = 2;   // $ per fuel unit
    this.repairCostPerPoint = 5;  // $ per HP restored
    this.range = 130;             // world units
  }

  isInRange(truck) {
    return dist(truck.x, truck.y, this.x, this.y) <= this.range;
  }

  /**
   * Refuel the truck.
   * @param {Truck} truck
   * @param {EconomySystem} economy
   * @param {NotificationSystem} notif
   * @returns {boolean} success
   */
  refuel(truck, economy, notif) {
    const need = truck.maxFuel - truck.fuel;
    if (need < 1) { notif?.notify('Tank already full!', '#F39C12', 2); return false; }
    const cost = Math.ceil(need * this.fuelCostPerUnit);
    if (!economy.canAfford(cost)) {
      notif?.notify(`Not enough money! Need $${cost}`, '#E74C3C', 2.5);
      return false;
    }
    economy.spend(cost, 'Fuel');
    truck.fuel = truck.maxFuel;
    notif?.notify(`⛽ Refueled! -$${cost}`, '#F39C12', 2.5);
    return true;
  }

  /**
   * Repair the truck.
   * @param {Truck} truck
   * @param {EconomySystem} economy
   * @param {NotificationSystem} notif
   * @returns {boolean} success
   */
  repair(truck, economy, notif) {
    const need = truck.maxHealth - truck.health;
    if (need < 1) { notif?.notify('Truck already at full health!', '#2ECC71', 2); return false; }
    const cost = Math.ceil(need * this.repairCostPerPoint);
    if (!economy.canAfford(cost)) {
      notif?.notify(`Not enough money! Need $${cost} to repair`, '#E74C3C', 2.5);
      return false;
    }
    economy.spend(cost, 'Repair');
    truck.repair(need);
    notif?.notify(`🔧 Repaired! -$${cost}`, '#2ECC71', 2.5);
    return true;
  }

  update(_truck, _input, _economy, _notif) {}  // handled by GameEngine
}
