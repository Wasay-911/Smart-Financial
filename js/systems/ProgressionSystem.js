// js/systems/ProgressionSystem.js – XP, levels, titles, and unlock rewards

import { LEVEL_DEFS } from '../constants.js';

export class ProgressionSystem {
  constructor() {
    this.xp           = 0;
    this.level        = 1;
    this._pendingRewards = []; // Queued level-up rewards to display

    // Callbacks
    this.onLevelUp = null; // (newLevel, reward) => void
  }

  // ── XP Gain ───────────────────────────────────────────────
  addXP(amount, notif) {
    if (amount <= 0) return;
    this.xp += amount;
    if (notif) notif.notify(`+${amount} XP`, '#9B59B6', 1.8);
    this._checkLevelUp(notif);
  }

  _checkLevelUp(notif) {
    let leveled = false;
    for (;;) {
      const nextDef = LEVEL_DEFS.find(d => d.level === this.level + 1);
      if (!nextDef || this.xp < nextDef.xpRequired) break;
      this.level++;
      leveled = true;
      const def = LEVEL_DEFS.find(d => d.level === this.level);
      this._pendingRewards.push({ level: this.level, reward: def?.reward, title: def?.title });
      if (notif) notif.notify(`🎉 LEVEL UP! You are now Level ${this.level}!`, '#FFD700', 4);
      if (this.onLevelUp) this.onLevelUp(this.level, def?.reward);
    }
  }

  // ── Calculated delivery XP ────────────────────────────────
  calcDeliveryXP(noDoamge, fastDelivery, distanceTraveled) {
    let xp = 60;                              // base
    if (noDoamge)      xp += 35;              // clean run bonus
    if (fastDelivery)  xp += 25;              // time bonus
    xp += Math.floor(distanceTraveled / 100); // 1 XP per 100 units
    return xp;
  }

  // ── Accessors ─────────────────────────────────────────────
  get currentTitle() {
    const def = [...LEVEL_DEFS].reverse().find(d => d.level <= this.level);
    return def?.title || 'Rookie Driver';
  }

  get currentDef()   { return LEVEL_DEFS.find(d => d.level === this.level) || LEVEL_DEFS[0]; }
  get nextDef()      { return LEVEL_DEFS.find(d => d.level === this.level + 1); }
  get xpForNext()    { return this.nextDef?.xpRequired ?? Infinity; }
  get xpIntoLevel()  { return this.xp - (this.currentDef?.xpRequired ?? 0); }
  get xpNeededForLevel() {
    const cur = this.currentDef?.xpRequired ?? 0;
    const nxt = this.xpForNext;
    return nxt === Infinity ? 1 : nxt - cur;
  }
  /** 0-1 progress toward next level */
  get levelProgress() {
    const n = this.xpNeededForLevel;
    return n <= 0 ? 1 : Math.min(1, this.xpIntoLevel / n);
  }

  popReward() { return this._pendingRewards.shift() || null; }

  // ── Serialize ─────────────────────────────────────────────
  toJSON()  { return { xp: this.xp, level: this.level }; }
  fromJSON(d) {
    if (!d) return;
    this.xp    = d.xp    || 0;
    this.level = d.level || 1;
  }
}
