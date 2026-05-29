// js/game.js – Bootstrap: wire all modules and start the engine

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

import { NotificationSystem }  from './ui/NotificationSystem.js';
import { HUD }                 from './ui/HUD.js';
import { MenuSystem }          from './ui/MenuSystem.js';

// ── Canvas ────────────────────────────────────────────────────
const canvas = document.getElementById('c');

// ── Instantiate all modules ───────────────────────────────────
const engine  = new GameEngine();
const input   = new InputManager().bind();
const camera  = new CameraSystem(1.4);
const physics = new PhysicsEngine();

const truck   = new Truck();
const ctx     = canvas.getContext('2d');

const renderer = new Renderer(ctx);
const notif    = new NotificationSystem();
const hud      = new HUD(ctx);
const menu     = new MenuSystem(ctx);

const economy  = new EconomySystem(5000);
const missions = new MissionSystem();
const upgrades = new UpgradeSystem(economy);
const save     = new SaveSystem();

// ── Inject dependencies into engine ──────────────────────────
engine.input     = input;
engine.camera    = camera;
engine.physics   = physics;
engine.renderer  = renderer;
engine.truck     = truck;
engine.missions  = missions;
engine.economy   = economy;
engine.upgrades  = upgrades;
engine.saveSystem = save;
engine.notif     = notif;
engine.hud       = hud;
engine.menu      = menu;

// ── Start ─────────────────────────────────────────────────────
engine.init(canvas);
engine.loadSave();
engine.start();
