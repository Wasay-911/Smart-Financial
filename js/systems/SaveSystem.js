// js/systems/SaveSystem.js – v3 with cities

const SAVE_KEY = 'mohallah_v3';
const SAVE_VER = 3;
const AUTO_INTERVAL = 60;

export class SaveSystem {
  constructor() { this._lastAutoSave=0; }

  save(state) {
    try {
      const d = {
        version:      SAVE_VER,
        ts:           Date.now(),
        economy:      state.economy.toJSON(),
        fleet:        state.fleet.toJSON(),
        progression:  state.progression.toJSON(),
        achievements: state.achievements.toJSON(),
        dailyReward:  state.dailyReward.toJSON(),
        cities:       state.cities.toJSON(),
        missionCount: state.missions.missionCount,
        stats: {
          totalEarned:          state.economy.totalEarned,
          missionCount:         state.missions.missionCount,
          cargoTypesDelivered:  [...state.missions.cargoTypesDelivered],
          citiesDelivered:      [...state.missions.citiesDelivered],
          cleanStreak:          state.missions.cleanStreak,
          maxSpeedReached:      state.stats?.maxSpeedReached||0,
          totalKm:              state.truck.totalKm,
          offRoadKm:            state.stats?.offRoadKm||0,
          maxSingleHit:         state.stats?.maxSingleHit||0,
          lastRunClean:         state.missions.lastCompleted?.noDamage||false,
          deliveredInStorm:     state.missions.deliveredInStorm,
          deliveredAtNight:     state.missions.deliveredAtNight,
          lastNoRefuel:         state.missions.lastNoRefuel,
          loginStreak:          state.dailyReward.streak,
        },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(d));
      return true;
    } catch(e){console.warn('[Save]',e); return false;}
  }

  load() {
    try {
      const raw=localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d=JSON.parse(raw);
      if (!this._validate(d)) return null;
      return d;
    } catch(e){console.warn('[Load]',e); return null;}
  }

  applyTo(data, state) {
    if (!data) { state.fleet.initStarter(); return; }
    state.economy.fromJSON(data.economy);
    state.fleet.fromJSON(data.fleet);
    state.fleet.applyToTruck(state.truck);
    state.progression.fromJSON(data.progression);
    state.achievements.fromJSON(data.achievements);
    state.dailyReward.fromJSON(data.dailyReward);
    state.cities.fromJSON(data.cities);
    state.missions.missionCount = data.missionCount||0;
    if (data.stats) {
      state.stats.maxSpeedReached    = data.stats.maxSpeedReached||0;
      state.stats.offRoadKm          = data.stats.offRoadKm||0;
      state.stats.maxSingleHit       = data.stats.maxSingleHit||0;
      state.missions.cargoTypesDelivered = new Set(data.stats.cargoTypesDelivered||[]);
      state.missions.citiesDelivered     = new Set(data.stats.citiesDelivered||[]);
      state.missions.cleanStreak         = data.stats.cleanStreak||0;
    }
  }

  tick(dt, state) {
    this._lastAutoSave+=dt;
    if (this._lastAutoSave>=AUTO_INTERVAL) { this._lastAutoSave=0; this.save(state); }
  }

  reset() { try{localStorage.removeItem(SAVE_KEY);}catch(e){} }

  _validate(d) {
    if (!d||typeof d!=='object') return false;
    if (d.version!==SAVE_VER) return false;
    if (typeof d.economy?.money!=='number') return false;
    if (d.economy.money>100_000_000) return false;
    return true;
  }
}
