// js/game.js – Phase 3 bootstrap with all systems wired

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

import { NotificationSystem }  from './ui/NotificationSystem.js';
import { HUD }                 from './ui/HUD.js';
import { MenuSystem }          from './ui/MenuSystem.js';

// ── Canvas ────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');

// ── Instantiate everything ────────────────────────────────
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

// Phase 3 systems
const progression  = new ProgressionSystem();
const achievements = new AchievementSystem();
const dailyReward  = new DailyRewardSystem();
const weather      = new WeatherSystem();
const audio        = new AudioSystem();
const maintenance  = new MaintenanceSystem();
const fleet        = new FleetSystem();

// ── Wire audio to user gesture ────────────────────────────
// AudioContext must be created after a user interaction
const _audioInit = () => {
  audio.init();
  document.removeEventListener('click',   _audioInit);
  document.removeEventListener('keydown', _audioInit);
  document.removeEventListener('touchstart', _audioInit);
};
document.addEventListener('click',      _audioInit);
document.addEventListener('keydown',    _audioInit);
document.addEventListener('touchstart', _audioInit, {passive:true});

// ── Inject into engine ────────────────────────────────────
engine.input        = input;
engine.camera       = camera;
engine.physics      = physics;
engine.renderer     = renderer;
engine.truck        = truck;
engine.missions     = missions;
engine.economy      = economy;
engine.upgrades     = upgrades;
engine.saveSystem   = save;
engine.notif        = notif;
engine.hud          = hud;
engine.menu         = menu;
// Phase 3
engine.audio        = audio;
engine.weather      = weather;
engine.progression  = progression;
engine.achievements = achievements;
engine.dailyReward  = dailyReward;
engine.maintenance  = maintenance;
engine.fleet        = fleet;

// ── Start ─────────────────────────────────────────────────
engine.init(canvas);
engine.loadSave();
engine.start();
