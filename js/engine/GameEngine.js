// js/engine/GameEngine.js – Central game orchestrator

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

    this.state    = GAME_STATE.MAIN_MENU;
    this.lastTime = 0;

    // Injected modules (set by game.js bootstrap)
    this.input     = null;
    this.camera    = null;
    this.physics   = null;
    this.renderer  = null;
    this.truck     = null;
    this.missions  = null;
    this.economy   = null;
    this.upgrades  = null;
    this.saveSystem = null;
    this.notif     = null;
    this.hud       = null;
    this.menu      = null;

    // World entities
    this.obstacles    = [];
    this.fuelStations = [];

    // Environment
    this.timeOfDay        = 0.2; // start at day
    this.dayDuration      = 300; // 5 minutes per cycle
    this.weatherIntensity = 0;
    this._weatherTimer    = 0;
    this._weatherTarget   = 0;
  }

  // ── Bootstrap ───────────────────────────────────────────────
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

  /** Load saved game data on startup */
  loadSave() {
    const data = this.saveSystem.load();
    const count = this.saveSystem.applyTo(data, this.truck, this.economy);
    this.missions.missionCount = count;
  }

  // ── World entities ───────────────────────────────────────────
  _buildWorld() {
    // NPC traffic
    this.obstacles = NPC_DEFS.map(def => new NPCVehicle(def));
    // Static obstacles
    for (const def of STATIC_OBSTACLE_DEFS) {
      this.obstacles.push(new StaticObstacle(def));
    }
    // Fuel stations
    this.fuelStations = FUEL_STATION_DEFS.map(def => new FuelStation(def));
  }

  // ── State machine ────────────────────────────────────────────
  setState(s) { this.state = s; }

  _startMission(idx) {
    this._buildWorld();
    this.truck.resetForMission();
    this.camera.snapTo(this.truck.x, this.truck.y);
    this.missions.startMission(idx);
    this.timeOfDay = 0.2;
    this._weatherTimer = 0; this._weatherTarget = 0; this.weatherIntensity = 0;
    this.setState(GAME_STATE.DRIVING);
  }

  // ── Main update ──────────────────────────────────────────────
  update(dt) {
    this.saveSystem.tick(dt, this.truck, this.economy, this.missions.missionCount);

    switch (this.state) {
      case GAME_STATE.DRIVING:
        this._updateDriving(dt); break;
      case GAME_STATE.MAIN_MENU:
      case GAME_STATE.MISSION_SELECT:
      case GAME_STATE.GARAGE:
      case GAME_STATE.PAUSED:
      case GAME_STATE.MISSION_COMPLETE:
      case GAME_STATE.GAME_OVER:
        break; // Handled by render / menu interaction
    }

    this.notif.update(dt);
    // NOTE: clearFrame() is called AFTER render(), not here
  }

  _updateDriving(dt) {
    const { truck, input, physics, camera, missions, fuelStations, notif, economy } = this;

    // Shortcuts
    if (input.wasPressed('Escape')) { this.setState(GAME_STATE.PAUSED); return; }
    if (input.wasPressed('u') || input.wasPressed('U')) { this.setState(GAME_STATE.GARAGE); return; }

    // Truck physics
    if (input.accel)  truck.accelerate(dt);
    else if (input.brakei) truck.brake(dt);
    else              truck.coast(dt);

    if (input.steerL) truck.turnLeft(dt);
    if (input.steerR) truck.turnRight(dt);

    physics.applyTerrainFriction(truck, dt);
    truck.update(dt);

    // Fuel empty
    if (truck.fuel <= 0 && truck.speedAbs < 0.5) {
      missions.cancelMission(truck);
      this.setState(GAME_STATE.GAME_OVER);
      return;
    }

    // NPCs
    for (const obs of this.obstacles) obs.update(dt);

    // Collisions
    physics.checkCollisions(truck, this.obstacles, camera, notif);

    // Fuel stations – keyboard F / R
    for (const st of fuelStations) {
      if (st.isInRange(truck)) {
        if (input.refuel) st.refuel(truck, economy, notif);
        if (input.wasPressed('r') || input.wasPressed('R')) st.repair(truck, economy, notif);
      }
    }

    // Mission progress
    const result = missions.update(truck, notif);
    if (result === 'delivered') {
      const lc = missions.lastCompleted;
      economy.earn(lc.reward, `Delivery: ${lc.mission.name}`);
      this.saveSystem.save(truck, economy, missions.missionCount);
      this.setState(GAME_STATE.MISSION_COMPLETE);
      return;
    }

    // Health dead
    if (truck.health <= 0) {
      missions.cancelMission(truck);
      this.setState(GAME_STATE.GAME_OVER);
      return;
    }

    // Day / night cycle
    this.timeOfDay = (this.timeOfDay + dt / this.dayDuration) % 1;

    // Weather transitions
    this._updateWeather(dt);

    // Camera follow
    camera.follow(truck, dt);
  }

  _updateWeather(dt) {
    this._weatherTimer -= dt;
    if (this._weatherTimer <= 0) {
      this._weatherTimer = 30 + Math.random() * 60; // next event in 30–90s
      this._weatherTarget = Math.random() < 0.3 ? Math.random() * 0.7 : 0;
    }
    const step = 0.3 * dt;
    if (this.weatherIntensity < this._weatherTarget)
      this.weatherIntensity = Math.min(this._weatherTarget, this.weatherIntensity + step);
    else
      this.weatherIntensity = Math.max(this._weatherTarget, this.weatherIntensity - step);
  }

  // ── Main render ──────────────────────────────────────────────
  render(dt) {
    const { ctx, W, H, renderer, truck, camera, missions, fuelStations, hud, menu, economy, upgrades, input, notif } = this;

    ctx.clearRect(0, 0, W, H);

    switch (this.state) {
      case GAME_STATE.MAIN_MENU: {
        const action = menu.drawMainMenu(dt, missions.missionCount, economy.money, input.mouse, W, H);
        if (action === 'play')   this.setState(GAME_STATE.MISSION_SELECT);
        if (action === 'garage') this.setState(GAME_STATE.GARAGE);
        break;
      }
      case GAME_STATE.MISSION_SELECT: {
        const { action, selectedIdx } = menu.drawMissionSelect(missions.selectedIdx, input.mouse, W, H);
        missions.selectedIdx = selectedIdx;
        if (action === 'accept') this._startMission(selectedIdx);
        if (action === 'back')   this.setState(GAME_STATE.MAIN_MENU);
        break;
      }
      case GAME_STATE.GARAGE: {
        const { action, upgradeKey } = menu.drawGarage(truck, economy, upgrades, input.mouse, W, H);
        if (upgradeKey) {
          const res = upgrades.upgrade(truck, upgradeKey);
          notif.notify(res.message, res.success ? '#2ECC71' : '#E74C3C', 2.5);
          if (res.success) this.saveSystem.save(truck, economy, missions.missionCount);
        }
        if (action === 'back') this.setState(GAME_STATE.MAIN_MENU);
        break;
      }
      case GAME_STATE.DRIVING:
      case GAME_STATE.PAUSED: {
        this._renderWorld();
        hud.render(truck, missions, economy, W, H, this.timeOfDay);
        if (this.state === GAME_STATE.PAUSED) {
          const act = menu.drawPause(input.mouse, W, H);
          if (act === 'resume') this.setState(GAME_STATE.DRIVING);
          if (act === 'garage') this.setState(GAME_STATE.GARAGE);
          if (act === 'menu')   this.setState(GAME_STATE.MAIN_MENU);
        }
        break;
      }
      case GAME_STATE.MISSION_COMPLETE: {
        this._renderWorld();
        hud.render(truck, missions, economy, W, H, this.timeOfDay);
        const act = menu.drawMissionComplete(missions.lastCompleted, input.mouse, W, H);
        if (act === 'next')   { truck.resetForMission(); this.setState(GAME_STATE.MISSION_SELECT); }
        if (act === 'garage') { truck.resetForMission(); this.setState(GAME_STATE.GARAGE); }
        break;
      }
      case GAME_STATE.GAME_OVER: {
        this._renderWorld();
        const act = menu.drawGameOver(input.mouse, W, H);
        if (act === 'retry') { truck.resetForMission(); this._buildWorld(); this.setState(GAME_STATE.MISSION_SELECT); }
        if (act === 'menu')  this.setState(GAME_STATE.MAIN_MENU);
        break;
      }
    }

    notif.draw(ctx, camera, W, H);

    // Touch overlay (only while driving)
    if (this.state === GAME_STATE.DRIVING) {
      input.drawTouchControls(ctx, W, H);
    }
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
    renderer.drawDayNightOverlay(this.timeOfDay, this.weatherIntensity);
  }

  // ── Game loop ────────────────────────────────────────────────
  gameLoop(ts) {
    const dt = clamp((ts - this.lastTime) / 1000, 0, 0.05);
    this.lastTime = ts;
    this.update(dt);
    this.render(dt);
    this.input.clearFrame();   // clear AFTER render so buttons see clicks
    requestAnimationFrame(t => this.gameLoop(t));
  }

  start() {
    requestAnimationFrame(ts => { this.lastTime = ts; this.gameLoop(ts); });
  }
}
