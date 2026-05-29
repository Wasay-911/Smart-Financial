// js/systems/UpgradeSystem.js

import { UPGRADE_DEFS } from '../constants.js';

export class UpgradeSystem {
  /**
   * @param {EconomySystem} economy
   */
  constructor(economy) {
    this.economy = economy;
  }

  /** Map of upgrade key → Truck property name */
  static _propMap = {
    engine:   'engineLevel',
    fuelTank: 'fuelTankLevel',
    handling: 'handlingLevel',
    brakes:   'brakeLevel',
  };

  getLevel(truck, key)    { return truck[UpgradeSystem._propMap[key]] || 0; }
  getMaxLevel(key)        { return UPGRADE_DEFS[key].maxLevel; }
  getCost(truck, key)     { const lvl = this.getLevel(truck, key); return UPGRADE_DEFS[key].costs[lvl] ?? Infinity; }
  canUpgrade(truck, key)  { return this.getLevel(truck, key) < this.getMaxLevel(key); }
  canAfford(truck, key)   { return this.economy.canAfford(this.getCost(truck, key)); }

  /**
   * Purchase and apply upgrade.
   * @returns {{ success:boolean, message:string }}
   */
  upgrade(truck, key) {
    const def = UPGRADE_DEFS[key];
    if (!def) return {success:false, message:'Unknown upgrade'};
    if (!this.canUpgrade(truck, key)) return {success:false, message:`${def.name} is already max level!`};

    const cost = this.getCost(truck, key);
    if (!this.economy.canAfford(cost)) return {success:false, message:`Need $${cost.toLocaleString()} – not enough funds`};

    this.economy.spend(cost, `Upgrade: ${def.name}`);
    truck[UpgradeSystem._propMap[key]]++;
    // Refill fuel after tank upgrade
    if (key === 'fuelTank') truck.fuel = truck.maxFuel;

    const newLvl = this.getLevel(truck, key);
    return {success:true, message:`${def.name} upgraded to Level ${newLvl}!`};
  }

  /** UI description for next upgrade */
  getNextDesc(truck, key) {
    const lvl = this.getLevel(truck, key);
    const def = UPGRADE_DEFS[key];
    return lvl < def.maxLevel ? def.descriptions[lvl] : 'Max level reached';
  }
}
