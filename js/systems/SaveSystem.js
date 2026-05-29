// js/systems/SaveSystem.js – LocalStorage persistence with validation

const SAVE_KEY    = 'mohallah_v2';
const SAVE_VER    = 2;
const AUTO_INTERVAL = 60; // seconds

export class SaveSystem {
  constructor() {
    this._lastAutoSave = 0;
  }

  /** Build save payload from live game objects */
  buildPayload(truck, economy, missionCount) {
    return {
      version:      SAVE_VER,
      ts:           Date.now(),
      missionCount,
      truck:        truck.toJSON(),
      economy:      economy.toJSON(),
    };
  }

  /** Write to localStorage */
  save(truck, economy, missionCount) {
    try {
      const data = JSON.stringify(this.buildPayload(truck, economy, missionCount));
      localStorage.setItem(SAVE_KEY, data);
      return true;
    } catch (e) {
      console.warn('[SaveSystem] Could not save:', e);
      return false;
    }
  }

  /** Read and validate from localStorage */
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!this._validate(data)) { console.warn('[SaveSystem] Invalid save data'); return null; }
      return data;
    } catch (e) {
      console.warn('[SaveSystem] Could not load:', e);
      return null;
    }
  }

  /** Apply loaded data to truck and economy */
  applyTo(data, truck, economy) {
    if (!data) return 0;
    truck.fromJSON(data.truck);
    economy.fromJSON(data.economy);
    return data.missionCount || 0;
  }

  /** Trigger auto-save every AUTO_INTERVAL seconds */
  tick(dt, truck, economy, missionCount) {
    this._lastAutoSave += dt;
    if (this._lastAutoSave >= AUTO_INTERVAL) {
      this._lastAutoSave = 0;
      this.save(truck, economy, missionCount);
    }
  }

  /** Wipe save data */
  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  _validate(data) {
    if (typeof data !== 'object' || data === null) return false;
    if (data.version !== SAVE_VER) return false;
    if (typeof data.economy?.money !== 'number') return false;
    // Basic anti-cheat: cap money at $10 million
    if (data.economy.money > 10_000_000) return false;
    return true;
  }
}
