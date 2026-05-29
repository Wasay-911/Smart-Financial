// js/entities/Cargo.js

export class Cargo {
  constructor(def) {
    this.id       = def.id;
    this.type     = def.type;
    this.color    = def.color;
    this.baseReward = def.baseReward;
    this.weight   = def.weight;   // 1.0 = normal, >1 = heavy (speed penalty)
    this.isFragile = def.isFragile;
    this.desc     = def.desc;

    /** 1.0 = perfect; decremented when fragile truck takes damage */
    this.condition = 1.0;
  }

  /**
   * Calculate final delivery reward.
   * @param {Truck} truck
   */
  calculateReward(truck) {
    let r = this.baseReward;

    // Damage penalty: each HP lost costs $5
    r -= truck.totalDamageThisMission * 5;

    // Fragile cargo uses condition multiplier
    if (this.isFragile) r *= this.condition;

    // Clamp to [30%, 100%] of base
    return Math.max(Math.round(this.baseReward * 0.3), Math.round(r));
  }

  /** Star rating (1-3) based on condition */
  getStars(truck) {
    const dmg = truck.totalDamageThisMission;
    if (dmg === 0) return 3;
    if (dmg < 30)  return 2;
    return 1;
  }
}
