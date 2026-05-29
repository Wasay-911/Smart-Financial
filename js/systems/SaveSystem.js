// js/systems/SaveSystem.js – LocalStorage persistence v3 with migration

const SAVE_KEY = 'mohallah_v3';
const SAVE_VER = 3;
const AUTO_INTERVAL = 60;

export class SaveSystem {
  constructor() {
    this._lastAutoSave = 0;
  }

  save(state) {
    try {
      const payload = {
        version:       SAVE_VER,
        ts:            Date.now(),
        economy:       state.economy.toJSON(),
        fleet:         state.fleet.toJSON(),
        progression:   state.progression.toJSON(),
        achievements:  state.achievements.toJSON(),
        dailyReward:   state.dailyReward.toJSON(),
        missionCount:  state.missions.missionCount,
        // Aggregate stats
        stats: {
          totalEarned:      state.economy.totalEarned,
          missionCount:     state.missions.missionCount,
          cargoTypesDelivered: [...state.missions.cargoTypesDelivered],
          cleanStreak:      state.missions.cleanStreak,
          maxSpeedReached:  state.stats?.maxSpeedReached || 0,
          totalKm:          state.truck.totalKm,
          offRoadKm:        state.stats?.offRoadKm || 0,
          maxSingleHit:     state.stats?.maxSingleHit || 0,
          lastRunClean:     state.missions.lastCompleted?.noDamage || false,
          deliveredInStorm: state.missions.deliveredInStorm,
          deliveredAtNight: state.missions.deliveredAtNight,
          lastNoRefuel:     state.missions.lastNoRefuel,
          loginStreak:      state.dailyReward.streak,
        },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) { console.warn('[Save] Failed:', e); return false; }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!this._validate(data)) return null;
      return data;
    } catch (e) { console.warn('[Save] Load failed:', e); return null; }
  }

  applyTo(data, state) {
    if (!data) { state.fleet.initStarter(); return; }
    state.economy.fromJSON(data.economy);
    state.fleet.fromJSON(data.fleet);
    state.fleet.applyToTruck(state.truck);
    state.progression.fromJSON(data.progression);
    state.achievements.fromJSON(data.achievements);
    state.dailyReward.fromJSON(data.dailyReward);
    state.missions.missionCount = data.missionCount || 0;
    // Restore stats
    if (data.stats) {
      state.stats.maxSpeedReached = data.stats.maxSpeedReached || 0;
      state.stats.offRoadKm       = data.stats.offRoadKm       || 0;
      state.stats.maxSingleHit    = data.stats.maxSingleHit    || 0;
      state.missions.cargoTypesDelivered = new Set(data.stats.cargoTypesDelivered || []);
      state.missions.cleanStreak  = data.stats.cleanStreak     || 0;
    }
  }

  tick(dt, state) {
    this._lastAutoSave += dt;
    if (this._lastAutoSave >= AUTO_INTERVAL) {
      this._lastAutoSave = 0;
      this.save(state);
    }
  }

  reset() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  _validate(data) {
    if (!data || typeof data !== 'object') return false;
    if (data.version !== SAVE_VER) return false;
    if (typeof data.economy?.money !== 'number') return false;
    if (data.economy.money > 100_000_000) return false;  // anti-cheat cap $100M
    return true;
  }
}
