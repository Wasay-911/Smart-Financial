// js/config.js – Centralised game balance configuration
// Adjust these values to tune difficulty without touching game logic.

export const CONFIG = Object.freeze({

  // ── Economy ───────────────────────────────────────────────
  STARTING_MONEY:           5000,
  FUEL_COST_PER_UNIT:       2,        // $ per fuel unit when refuelling
  REPAIR_COST_PER_HP:       5,        // $ per HP when repairing at station
  SERVICE_COST_PER_WEAR:    8,        // $ per wear % when servicing
  DAMAGE_REWARD_PENALTY:    5,        // $ deducted per HP lost on mission
  REWARD_DISTANCE_EXPONENT: 0.72,     // <1 dampens long-route reward scaling
  MIN_REWARD_FRACTION:      0.30,     // floor: at least 30% of base reward

  // ── Progression ──────────────────────────────────────────
  BASE_DELIVERY_XP:         60,
  NO_DAMAGE_XP_BONUS:       35,
  ON_TIME_XP_BONUS:         25,
  XP_PER_100_KM:            1,

  // ── Truck physics ─────────────────────────────────────────
  OFF_ROAD_DRAG:            0.55,     // speed multiplier per second off-road
  COLLISION_RADIUS_PLAYER:  22,       // world units
  COLLISION_INVINCIBLE_DUR: 1.5,      // seconds of invincibility after hit
  FUEL_BASE_RATE:           1.0,      // fuel units per (speed/100) per second
  WEAR_PER_KM:              0.012,    // wear % per km driven

  // ── Traffic ──────────────────────────────────────────────
  TRAFFIC_SPEED_TRUCK:      { min:65,  max:90  },
  TRAFFIC_SPEED_CAR:        { min:100, max:140 },
  TRAFFIC_SPEED_BUS:        { min:50,  max:62  },
  TRAFFIC_SPEED_MOTO:       { min:145, max:175 },

  // ── Weather ──────────────────────────────────────────────
  WEATHER_RAIN_TRACTION:    0.75,     // max speed multiplier
  WEATHER_STORM_TRACTION:   0.55,
  WEATHER_FOG_VISIBILITY:   0.35,

  // ── Daily rewards ─────────────────────────────────────────
  DAILY_REWARD_MONEY:  [500, 750, 1000, 1500, 2000, 2500, 5000],
  DAILY_REWARD_XP:     [50,  75,  100,  150,  200,  250,  500 ],

  // ── Fleet ────────────────────────────────────────────────
  DRIVER_HIRE_COST:         2000,
  DRIVER_INCOME_RATE:       80,       // $ per minute per active driver
  MAX_FLEET_SIZE:           5,

  // ── Camera ───────────────────────────────────────────────
  DEFAULT_ZOOM:             1.4,
  CAMERA_SMOOTH:            4.5,      // lerp factor per second
  CAMERA_SHAKE_DECAY:       0.4,      // seconds for full shake decay

  // ── Performance ──────────────────────────────────────────
  MAX_PARTICLES:            200,
  MAX_NOTIFICATIONS:        5,
  MAX_TRANSACTION_LOG:      100,

  // ── Game ─────────────────────────────────────────────────
  AUTO_SAVE_INTERVAL:       60,       // seconds
  DAY_CYCLE_DURATION:       300,      // seconds per full day
  VERSION:                  '1.0.0',
  BUILD:                    'release',
});
