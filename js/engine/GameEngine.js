// js/engine/GameEngine.js – Phase 3 central orchestrator

import { GAME_STATE, NPC_DEFS, STATIC_OBSTACLE_DEFS, FUEL_STATION_DEFS } from '../constants.js';
import { clamp } from '../utils.js';
import { NPCVehicle, StaticObstacle } from '../entities/Obstacle.js';
import { FuelStation } from '../entities/FuelStation.js';

export class GameEngine {
  constructor() {
    this.canvas = null;
    this.ctx    = null;
    this.W = 0;
    this.H = 0;
    this.state     = GAME_STATE.MAIN_MENU;
    this.lastTime  = 0;
    this._prevState = null;

    // ── Injected modules ───────────────────────────────────
    this.input       = null;
    this.camera      = null;
    this.physics     = null;
    this.renderer    = null;
    this.truck       = null;
    this.missions    = null;
    this.economy     = null;
    this.upgrades    = null;
    this.saveSystem  = null;
    this.notif       = null;
    this.hud         = null;
    this.menu        = null;
    // Phase 3
    this.audio       = null;
    this.weather     = null;
    this.progression = null;
    this.achievements = null;
    this.dailyReward = null;
    this.maintenance = null;
    this.fleet       = null;

    // ── World entities ────────────────────────────────────
    this.obstacles    = [];
    this.fuelStations = [];

    // ── Environment ───────────────────────────────────────
    this.timeOfDay     = 0.25;
    this.dayDuration   = 300;

    // ── Aggregate stats (for achievements) ───────────────
    this.stats = {
      maxSpeedReached:  0,
      offRoadKm:        0,
      maxSingleHit:     0,
      lastRunClean:     false,
      allUpgradesMax:   false,
      deliveredInStorm: false,
      deliveredAtNight: false,
      lastNoRefuel:     false,
    };

    // ── Passive income tick accumulator ───────────────────
    this._passiveDisplay = 0;
  }

  // ── Init ─────────────────────────────────────────────────
  init(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W = canvas.width  = window.innerWidth;
    this.H = canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      this.W = canvas.width  = window.innerWidth;
      this.H = canvas.height = window.innerHeight;
      this.renderer?.resize(this.W, this.H);
    });
    this.renderer?.resize(this.W, this.H);
    return this;
  }

  loadSave() {
    const data = this.saveSystem.load();
    const state = {
      economy:     this.economy,
      fleet:       this.fleet,
      progression: this.progression,
      achievements:this.achievements,
      dailyReward: this.dailyReward,
      missions:    this.missions,
      truck:       this.truck,
      stats:       this.stats,
    };
    this.saveSystem.applyTo(data, state);

    // Sync active truck from fleet
    this.fleet.applyToTruck(this.truck);

    // Daily reward check
    if (this.dailyReward.checkLogin()) {
      this.setState(GAME_STATE.DAILY_REWARD);
    }

    // Level-up rewards from loaded save
    const levelReward = this.progression.popReward();
    if (levelReward?.reward?.money) {
      this.economy.earn(levelReward.reward.money, `Level ${levelReward.level} reward`);
    }
  }

  _saveState() {
    this.fleet.syncFromTruck(this.truck);
    return {
      economy:     this.economy,
      fleet:       this.fleet,
      progression: this.progression,
      achievements:this.achievements,
      dailyReward: this.dailyReward,
      missions:    this.missions,
      truck:       this.truck,
      stats:       this.stats,
    };
  }

  // ── State machine ─────────────────────────────────────────
  setState(s) { this._prevState = this.state; this.state = s; }

  _buildWorld() {
    this.obstacles    = NPC_DEFS.map(def => new NPCVehicle(def));
    for (const def of STATIC_OBSTACLE_DEFS) this.obstacles.push(new StaticObstacle(def));
    this.fuelStations = FUEL_STATION_DEFS.map(def => new FuelStation(def));
  }

  _startMission(idx) {
    this._buildWorld();
    this.truck.resetForMission();
    this.fleet.applyToTruck(this.truck);  // ensure active truck stats are applied
    this.truck.resetForMission();          // reset again after applying def
    this.camera.snapTo(this.truck.x, this.truck.y);
    this.missions.startMission(idx);
    this.timeOfDay = 0.25;
    this.weather.forceWeather('SUNNY');
    this.audio?.startEngine();
    this.setState(GAME_STATE.DRIVING);
  }

  // ── Main update ───────────────────────────────────────────
  update(dt) {
    this.saveSystem.tick(dt, this._saveState());
    this.weather?.update(dt, this.audio);
    this.fleet?.tick(dt, this.economy);

    switch (this.state) {
      case GAME_STATE.DRIVING: this._updateDriving(dt); break;
      default: break;
    }

    this.notif.update(dt);
    // Do NOT call clearFrame here – render needs mouse.clicked
  }

  _updateDriving(dt) {
    const {truck, input, physics, camera, missions, fuelStations, notif, economy, audio} = this;
    const weather = this.weather;
    const fx = weather.effects;

    // Input shortcuts
    if (input.wasPressed('Escape')) { this.setState(GAME_STATE.PAUSED); return; }
    if (input.wasPressed('u') || input.wasPressed('U')) { this.setState(GAME_STATE.GARAGE); return; }
    if (input.wasPressed('h') || input.wasPressed('H')) audio?.horn();

    // Truck movement
    if (input.accel)       truck.accelerate(dt);
    else if (input.brakei) truck.brake(dt);
    else                   truck.coast(dt);
    if (input.steerL) truck.turnLeft(dt);
    if (input.steerR) truck.turnRight(dt);

    // Terrain friction
    const onRoad = physics.distToRoad(truck.x, truck.y) < 50;
    if (!onRoad) {
      truck.speed *= (1 - 0.6 * dt);
      this.stats.offRoadKm += truck.speedAbs * dt * fx.traction;
    }

    // Truck update (weather traction)
    truck.update(dt, fx.traction);
    truck.consumeFuel(dt, fx.fuelMult, this.maintenance.getFuelMult(truck));

    // Maintenance wear
    this.maintenance.update(truck, dt);

    // Fuel empty
    if (truck.fuel <= 0 && truck.speedAbs < 0.5) {
      missions.cancelMission(truck);
      this.setState(GAME_STATE.GAME_OVER);
      return;
    }
    // Health gone
    if (truck.health <= 0) {
      missions.cancelMission(truck);
      this.setState(GAME_STATE.GAME_OVER);
      this._gameOverReason = 'health';
      return;
    }

    // NPCs
    for (const obs of this.obstacles) obs.update(dt);

    // Collisions
    const dmg = physics.checkCollisions(truck, this.obstacles, camera, notif);
    if (dmg > this.stats.maxSingleHit) this.stats.maxSingleHit = dmg;
    if (dmg > 0) audio?.collision(clamp(dmg / 50, 0.3, 1.2));

    // Fuel stations
    for (const st of fuelStations) {
      if (st.isInRange(truck)) {
        if (input.refuel)       { st.refuel(truck, economy, notif);  audio?.refuel(); truck.refueledThisMission = true; }
        if (input.wasPressed('r') || input.wasPressed('R')) st.repair(truck, economy, notif);
        if (input.wasPressed('t') || input.wasPressed('T')) this.maintenance.service(truck, economy, notif);
      }
    }

    // Mission progress
    const result = missions.update(truck, dt, notif,
      weather.isStorm,
      this.timeOfDay
    );

    if (result === 'delivered' || result === 'time_failed') {
      const lc  = missions.lastCompleted;
      economy.earn(lc.reward, `Delivery: ${lc.mission.name}`);
      audio?.success();

      // XP
      const isOnTime = result !== 'time_failed';
      const xpGained = this.progression.calcDeliveryXP(lc.noDamage, isOnTime && missions.completedOnTime, truck.totalKm);
      this.progression.addXP(xpGained, notif);

      // Level-up rewards
      let lvlReward = this.progression.popReward();
      while (lvlReward) {
        if (lvlReward.reward?.money) economy.earn(lvlReward.reward.money, `Level ${lvlReward.level} bonus`);
        audio?.levelUp();
        lvlReward = this.progression.popReward();
      }

      // Stats
      this.stats.lastRunClean     = lc.noDamage;
      this.stats.deliveredInStorm = missions.deliveredInStorm;
      this.stats.deliveredAtNight = missions.deliveredAtNight;
      this.stats.lastNoRefuel     = missions.lastNoRefuel;
      this.stats.allUpgradesMax   =
        truck.engineLevel === 3 && truck.handlingLevel === 3 &&
        truck.brakeLevel  === 3 && truck.fuelTankLevel === 3;
      if (truck.speedAbs > this.stats.maxSpeedReached) this.stats.maxSpeedReached = truck.speedAbs;

      // Achievements check
      const achieveStats = {
        missionCount:        missions.missionCount,
        totalEarned:         economy.totalEarned,
        maxSpeedReached:     this.stats.maxSpeedReached,
        totalKm:             truck.totalKm,
        offRoadKm:           this.stats.offRoadKm,
        lastRunClean:        this.stats.lastRunClean,
        cleanStreak:         missions.cleanStreak,
        maxSingleHit:        this.stats.maxSingleHit,
        allUpgradesMax:      this.stats.allUpgradesMax,
        fleetSize:           this.fleet.fleetSize,
        playerLevel:         this.progression.level,
        deliveredInStorm:    this.stats.deliveredInStorm,
        deliveredAtNight:    this.stats.deliveredAtNight,
        cargoTypesDelivered: missions.cargoTypesDelivered.size,
        lastNoRefuel:        this.stats.lastNoRefuel,
        loginStreak:         this.dailyReward.streak,
      };
      this.achievements.check(achieveStats, notif, audio);

      // Sync fleet
      this.fleet.syncFromTruck(truck);
      this.saveSystem.save(this._saveState());
      this.setState(GAME_STATE.MISSION_COMPLETE);
      return;
    }

    // Day/night
    this.timeOfDay = (this.timeOfDay + dt / this.dayDuration) % 1;

    // Audio engine pitch
    audio?.updateEngine(truck.speedAbs, truck.maxSpeed);

    // Camera
    camera.follow(truck, dt);
  }

  // ── Main render ───────────────────────────────────────────
  render(dt) {
    const {ctx, W, H, renderer, truck, camera, missions, fuelStations, hud, menu,
           economy, upgrades, input, notif, progression, weather, maintenance, fleet, audio} = this;

    ctx.clearRect(0, 0, W, H);

    switch (this.state) {
      case GAME_STATE.MAIN_MENU: {
        const act = menu.drawMainMenu(dt, missions.missionCount, economy.money,
          progression.level, progression.currentTitle, input.mouse, W, H);
        if (act === 'play')         { missions.refreshPool(progression.level); this.setState(GAME_STATE.MISSION_SELECT); }
        if (act === 'garage')       this.setState(GAME_STATE.GARAGE);
        if (act === 'achievements') this.setState(GAME_STATE.ACHIEVEMENTS);
        if (act === 'fleet')        this.setState(GAME_STATE.FLEET);
        if (act === 'profile')      this.setState(GAME_STATE.PROFILE);
        if (act === 'settings')     this.setState(GAME_STATE.SETTINGS);
        break;
      }
      case GAME_STATE.DAILY_REWARD: {
        const act = menu.drawDailyReward(this.dailyReward, input.mouse, W, H);
        if (act === 'claim') {
          const reward = this.dailyReward.claim();
          if (reward) {
            economy.earn(reward.money, 'Daily Reward');
            progression.addXP(reward.xp, notif);
            audio?.success();
            this.saveSystem.save(this._saveState());
          }
          this.setState(GAME_STATE.MAIN_MENU);
        }
        break;
      }
      case GAME_STATE.MISSION_SELECT: {
        const { action, selectedIdx } = menu.drawMissionSelect(missions, input.mouse, W, H);
        missions.selectedIdx = selectedIdx;
        if (action === 'accept')  this._startMission(selectedIdx);
        if (action === 'refresh') { missions.refreshPool(progression.level); notif.notify('New contracts available!', '#3498DB', 2); }
        if (action === 'back')    this.setState(GAME_STATE.MAIN_MENU);
        break;
      }
      case GAME_STATE.GARAGE: {
        const { action, upgradeKey, svcAction } = menu.drawGarage(truck, economy, upgrades, fleet, maintenance, input.mouse, W, H);
        if (upgradeKey) {
          const res = upgrades.upgrade(truck, upgradeKey);
          notif.notify(res.message, res.success ? '#2ECC71' : '#E74C3C', 2.5);
          if (res.success) { audio?.uiClick(); fleet.syncFromTruck(truck); this.saveSystem.save(this._saveState()); }
        }
        if (svcAction === 'service') {
          const r = maintenance.service(truck, economy, notif);
          if (r.success) { fleet.syncFromTruck(truck); this.saveSystem.save(this._saveState()); }
        }
        if (action === 'back') this.setState(this._prevState === GAME_STATE.PAUSED ? GAME_STATE.MAIN_MENU : GAME_STATE.MAIN_MENU);
        break;
      }
      case GAME_STATE.DRIVING:
      case GAME_STATE.PAUSED: {
        this._renderWorld();
        hud.render(truck, missions, economy, progression, weather, W, H, this.timeOfDay);
        if (this.state === GAME_STATE.PAUSED) {
          const act = menu.drawPause(input.mouse, W, H);
          if (act === 'resume')   this.setState(GAME_STATE.DRIVING);
          if (act === 'garage')   this.setState(GAME_STATE.GARAGE);
          if (act === 'settings') this.setState(GAME_STATE.SETTINGS);
          if (act === 'menu')     { audio?.stopEngine(); missions.cancelMission(truck); this.setState(GAME_STATE.MAIN_MENU); }
        }
        break;
      }
      case GAME_STATE.MISSION_COMPLETE: {
        this._renderWorld();
        hud.render(truck, missions, economy, progression, weather, W, H, this.timeOfDay);
        const act = menu.drawMissionComplete(missions.lastCompleted, input.mouse, W, H);
        if (act === 'next') {
          truck.resetForMission(); missions.refreshPool(progression.level);
          this.setState(GAME_STATE.MISSION_SELECT);
        }
        if (act === 'garage') { truck.resetForMission(); this.setState(GAME_STATE.GARAGE); }
        break;
      }
      case GAME_STATE.GAME_OVER: {
        this._renderWorld();
        hud.render(truck, missions, economy, progression, weather, W, H, this.timeOfDay);
        const act = menu.drawGameOver(this._gameOverReason || 'fuel', input.mouse, W, H);
        if (act === 'retry') { truck.resetForMission(); this._buildWorld(); missions.refreshPool(progression.level); this.setState(GAME_STATE.MISSION_SELECT); }
        if (act === 'menu')  { audio?.stopEngine(); truck.resetForMission(); this.setState(GAME_STATE.MAIN_MENU); }
        break;
      }
      case GAME_STATE.ACHIEVEMENTS: {
        const act = menu.drawAchievements(this.achievements, input.mouse, W, H);
        if (act === 'back') this.setState(GAME_STATE.MAIN_MENU);
        break;
      }
      case GAME_STATE.FLEET: {
        const act = menu.drawFleet(fleet, economy, progression, input.mouse, W, H);
        if (act === 'back') { fleet.syncFromTruck(truck); this.saveSystem.save(this._saveState()); this.setState(GAME_STATE.MAIN_MENU); }
        break;
      }
      case GAME_STATE.PROFILE: {
        const act = menu.drawProfile(progression, missions, economy, this.achievements, input.mouse, W, H);
        if (act === 'back') this.setState(GAME_STATE.MAIN_MENU);
        break;
      }
      case GAME_STATE.SETTINGS: {
        const act = menu.drawSettings(audio, input.mouse, W, H);
        if (act === 'toggleMute') audio?.toggleMute();
        if (act === 'resetSave') { this.saveSystem.reset(); notif.notify('Save data reset!', '#E74C3C', 3); }
        if (act === 'close') this.setState(this._prevState || GAME_STATE.MAIN_MENU);
        break;
      }
    }

    // Notifications always on top
    notif.draw(ctx, camera, W, H);

    // Touch controls when driving
    if (this.state === GAME_STATE.DRIVING) input.drawTouchControls(ctx, W, H);

    // Weather overlay (last, above everything)
    if (this.state === GAME_STATE.DRIVING || this.state === GAME_STATE.PAUSED) {
      weather?.drawOverlay(ctx, W, H, this.timeOfDay);
    }

    // Clear frame input state AFTER render
    this.input.clearFrame();
  }

  _renderWorld() {
    const { renderer, truck, camera, missions, fuelStations, obstacles } = this;
    renderer.drawBackground(this.timeOfDay);
    renderer.drawTerrain(camera, this.timeOfDay);
    renderer.drawRoad(camera);
    renderer.drawFuelStations(fuelStations, camera, truck);
    renderer.drawCities(camera);
    renderer.drawMissionMarkers(missions.markerData, camera, truck);
    renderer.drawObstacles(obstacles, camera);
    renderer.drawTruck(truck, camera);
    renderer.drawDayNightOverlay(this.timeOfDay);
  }

  // ── Loop ──────────────────────────────────────────────────
  gameLoop(ts) {
    const dt = clamp((ts - this.lastTime) / 1000, 0, 0.05);
    this.lastTime = ts;
    this.update(dt);
    this.render(dt);
    requestAnimationFrame(t => this.gameLoop(t));
  }

  start() {
    requestAnimationFrame(ts => { this.lastTime = ts; this.gameLoop(ts); });
  }
}
