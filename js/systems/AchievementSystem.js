// js/systems/AchievementSystem.js – Achievement tracking, unlocking, and display

import { ACHIEVEMENT_DEFS } from '../constants.js';

export class AchievementSystem {
  constructor() {
    this._unlocked = new Set(); // Set of achievement IDs
    this.onUnlock  = null;      // (def) => void
  }

  // ── Check all achievements ────────────────────────────────
  /**
   * @param {Object} stats  Aggregated game stats object (built by GameEngine each frame)
   * @param {NotificationSystem} notif
   * @param {AudioSystem} audio
   */
  check(stats, notif, audio) {
    for (const def of ACHIEVEMENT_DEFS) {
      if (this._unlocked.has(def.id)) continue;
      try {
        if (def.condition(stats)) this._unlock(def, notif, audio);
      } catch (_) {}
    }
  }

  _unlock(def, notif, audio) {
    this._unlocked.add(def.id);
    notif?.notify(`🏅 Achievement: ${def.name}`, '#FFD700', 4);
    audio?.achievementUnlocked?.();
    if (this.onUnlock) this.onUnlock(def);
  }

  isUnlocked(id)  { return this._unlocked.has(id); }
  getAll()        { return ACHIEVEMENT_DEFS.map(d => ({...d, unlocked: this._unlocked.has(d.id)})); }
  get count()     { return this._unlocked.size; }
  get total()     { return ACHIEVEMENT_DEFS.length; }

  // ── Serialize ─────────────────────────────────────────────
  toJSON()  { return { unlocked: [...this._unlocked] }; }
  fromJSON(d) {
    if (d?.unlocked) d.unlocked.forEach(id => this._unlocked.add(id));
  }
}
