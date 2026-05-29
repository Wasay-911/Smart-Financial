// js/game.js – Phase 10 bootstrap: all modules including CitySystem

import { GameEngine }          from './engine/GameEngine.js';
import { InputManager }        from './engine/InputManager.js';
import { CameraSystem }        from './engine/CameraSystem.js';
import { PhysicsEngine }       from './engine/PhysicsEngine.js';
import { Renderer }            from './engine/Renderer.js';

import { Truck }               from './entities/Truck.js';

import { MissionSystem }       from './systems/MissionSystem.js';
import { EconomySystem }       from './systems/EconomySystem.js';
import { UpgradeSystem }       from './systems/UpgradeSystem.js';
import { SaveSystem }          from './systems/SaveSystem.js';
import { ProgressionSystem }   from './systems/ProgressionSystem.js';
import { AchievementSystem }   from './systems/AchievementSystem.js';
import { DailyRewardSystem }   from './systems/DailyRewardSystem.js';
import { WeatherSystem }       from './systems/WeatherSystem.js';
import { AudioSystem }         from './systems/AudioSystem.js';
import { MaintenanceSystem }   from './systems/MaintenanceSystem.js';
import { FleetSystem }         from './systems/FleetSystem.js';
import { CitySystem }          from './systems/CitySystem.js';

import { NotificationSystem }  from './ui/NotificationSystem.js';
import { HUD }                 from './ui/HUD.js';
import { MenuSystem }          from './ui/MenuSystem.js';

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');

// ── Instantiate all modules ───────────────────────────────
const engine      = new GameEngine();
const input       = new InputManager().bind();
const camera      = new CameraSystem(1.4);
const physics     = new PhysicsEngine();
const renderer    = new Renderer(ctx);
const truck       = new Truck();
const notif       = new NotificationSystem();
const hud         = new HUD(ctx);
const menu        = new MenuSystem(ctx);
const economy     = new EconomySystem(5000);
const missions    = new MissionSystem();
const upgrades    = new UpgradeSystem(economy);
const save        = new SaveSystem();
const progression  = new ProgressionSystem();
const achievements = new AchievementSystem();
const dailyReward  = new DailyRewardSystem();
const weather      = new WeatherSystem();
const audio        = new AudioSystem();
const maintenance  = new MaintenanceSystem();
const fleet        = new FleetSystem();
const cities       = new CitySystem();           // Phase 10

// ── Wire audio to user gesture ────────────────────────────
const _audioInit = () => {
  audio.init();
  ['click','keydown','touchstart'].forEach(ev => document.removeEventListener(ev, _audioInit));
};
['click','keydown','touchstart'].forEach(ev => document.addEventListener(ev, _audioInit, {passive:true}));

// ── Inject into engine ────────────────────────────────────
Object.assign(engine, {
  input, camera, physics, renderer, truck, missions, economy, upgrades,
  saveSystem:save, notif, hud, menu,
  audio, weather, progression, achievements, dailyReward, maintenance, fleet,
  cities,       // Phase 10
});

// ── Start ─────────────────────────────────────────────────
engine.init(canvas);
engine.loadSave();
engine.start();
