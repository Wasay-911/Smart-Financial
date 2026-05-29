// js/game3d.js – Phase 1 3D bootstrap: Mohallah Logestic 3D

import * as THREE from 'three';

import { Renderer3D }          from './engine3d/Renderer3D.js';
import { World3D, ROAD_CURVE_PTS } from './engine3d/World3D.js';
import { TruckPhysics3D }      from './engine3d/TruckPhysics3D.js';
import { CameraSystem3D }      from './engine3d/CameraSystem3D.js';
import { DayNightCycle }       from './engine3d/DayNightCycle.js';
import { WeatherSystem3D }     from './engine3d/WeatherSystem3D.js';

import { Truck3D }             from './entities3d/Truck3D.js';
import { TrafficSystem3D }     from './entities3d/TrafficVehicle3D.js';

import { HUD3D }               from './ui/HUD3D.js';
import { MissionSystem }       from './systems/MissionSystem.js';
import { EconomySystem }       from './systems/EconomySystem.js';
import { SaveSystem }          from './systems/SaveSystem.js';
import { ProgressionSystem }   from './systems/ProgressionSystem.js';
import { CitySystem }          from './systems/CitySystem.js';

// ── Input ─────────────────────────────────────────────────────
const keys = {};
let hornPressed = false;
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (!keys._prev?.[e.key]) {
    if (e.key === 'h' || e.key === 'H') hornPressed = true;
    if (e.key === 'f' || e.key === 'F') refuelAction  = true;
    if (e.key === 'r' || e.key === 'R') repairAction  = true;
    if (e.key === 'm' || e.key === 'M') mapToggle     = true;
  }
  if ([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

let refuelAction = false, repairAction = false, mapToggle = false;

function getInput() {
  return {
    accel:     !!(keys['w']||keys['W']||keys['ArrowUp']),
    brake:     !!(keys['s']||keys['S']||keys['ArrowDown']),
    left:      !!(keys['a']||keys['A']||keys['ArrowLeft']),
    right:     !!(keys['d']||keys['D']||keys['ArrowRight']),
    handbrake: !!(keys[' ']),
    steer:     (keys['d']||keys['D']||keys['ArrowRight'] ? 1 : 0) - (keys['a']||keys['A']||keys['ArrowLeft'] ? 1 : 0),
  };
}

// ── Bootstrap ──────────────────────────────────────────────────
async function init() {
  const canvas = document.getElementById('c');

  // ── Scene ──────────────────────────────────────────────────
  const scene  = new THREE.Scene();

  // ── Renderer ───────────────────────────────────────────────
  const r3d  = new Renderer3D(canvas);

  // ── Camera ─────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.5, 8000);
  camera.position.set(0, 10, -25);
  r3d.onResize((W, H) => { camera.aspect = W / H; camera.updateProjectionMatrix(); });

  // ── World ──────────────────────────────────────────────────
  const world = new World3D(scene);
  world.build();

  // ── Physics ────────────────────────────────────────────────
  const physics = new TruckPhysics3D(world);

  // ── Truck mesh ─────────────────────────────────────────────
  const truck3d = new Truck3D(scene, '#E74C3C');
  truck3d.group.position.copy(physics.position);

  // ── Camera system ──────────────────────────────────────────
  const camSys = new CameraSystem3D(camera);
  camSys.snapTo(physics.position);

  // ── Day/night ──────────────────────────────────────────────
  const dayNight = new DayNightCycle(scene);

  // ── Weather ────────────────────────────────────────────────
  const weather = new WeatherSystem3D(scene);

  // ── Traffic ────────────────────────────────────────────────
  const traffic = new TrafficSystem3D(scene, world);

  // ── Game systems ───────────────────────────────────────────
  const economy    = new EconomySystem(5000);
  const missions   = new MissionSystem();
  const progression = new ProgressionSystem();
  const cities     = new CitySystem();
  const saveSystem = new SaveSystem();

  // Load save
  try {
    const data = saveSystem.load();
    if (data) {
      economy.fromJSON(data.economy);
      progression.fromJSON(data.progression);
      cities.fromJSON(data.cities);
      missions.missionCount = data.missionCount || 0;
    }
  } catch(_) {}

  // Generate initial missions and override positions for 3D world
  missions.refreshPool(progression.level, cities.getUnlocked());
  // Override city warehouse positions to match 3D world (x = world X, y = world Z)
  const CITY_WAREHOUSES_3D = {
    KARACHI:   {x:  30, y: -2000},
    HYDERABAD: {x:  20, y:  2300},
    SUKKUR:    {x: -50, y: -200},
    MULTAN:    {x: 100, y:  800},
    LAHORE:    {x: -80, y:  500},
    ISLAMABAD: {x:  40, y: 1500},
    PESHAWAR:  {x:  60, y: 2000},
    QUETTA:    {x:-100, y:-1000},
  };
  // Patch MissionSystem to use 3D positions
  const origStart = missions.startMission.bind(missions);
  missions.startMission = (idx) => {
    origStart(idx);
    const m = missions.active;
    if (m) {
      missions.pickupPos   = CITY_WAREHOUSES_3D[m.fromCity]   || {x:30,  y:-2000};
      missions.deliveryPos = CITY_WAREHOUSES_3D[m.toCity]     || {x:20,  y:2300};
    }
  };

  // ── HUD ────────────────────────────────────────────────────
  const hud = new HUD3D();

  // ── Mission markers (3D world markers via HTML) ────────────
  const markerDiv = document.createElement('div');
  markerDiv.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9;';
  document.body.appendChild(markerDiv);

  // ── Road sample points for minimap ─────────────────────────
  const roadCurve = new THREE.CatmullRomCurve3(ROAD_CURVE_PTS);
  const roadPoints = roadCurve.getPoints(120);

  // ── Auto-start first mission ────────────────────────────────
  let missionStarted = false;
  function tryStartFirstMission() {
    if (missionStarted || missions.displayMissions.length === 0) return;
    missions.startMission(0);
    missionStarted = true;
    hud.notify(`📦 Contract: ${missions.active?.name}`, '#FFD700', 4000);
  }
  setTimeout(tryStartFirstMission, 2000);

  // ── Audio (Web Audio API) ──────────────────────────────────
  let audioCtx = null, engineOsc = null, engineGain = null;

  function initAudio() {
    if (audioCtx) return;
    audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = audioCtx.createGain(); masterGain.gain.value = 0.8;
    masterGain.connect(audioCtx.destination);

    engineGain = audioCtx.createGain(); engineGain.gain.value = 0.05;
    engineGain.connect(masterGain);

    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 50;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 200; filter.Q.value = 0.5;
    engineOsc.connect(filter); filter.connect(engineGain);
    engineOsc.start();
  }

  document.addEventListener('click', initAudio, { once: true });
  document.addEventListener('keydown', initAudio, { once: true });

  function updateEngineAudio(physics) {
    if (!audioCtx || !engineOsc) return;
    const f = 55 + (physics.speedKmh / 140) * 220;
    const g = 0.02 + (physics.throttle || 0) * 0.04;
    engineOsc.frequency.setTargetAtTime(f, audioCtx.currentTime, 0.1);
    engineGain.gain.setTargetAtTime(g, audioCtx.currentTime, 0.1);
  }

  function playHorn() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square'; osc.frequency.value = 440;
    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t+0.6);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t); osc.stop(t+0.65);
  }

  // ── Fuel station interaction label ─────────────────────────
  const stationLabel = document.createElement('div');
  stationLabel.style.cssText = `
    position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    background:rgba(0,0,0,0.85); border:2px solid #F39C12;
    border-radius:12px; padding:14px 28px; color:#F39C12;
    font-size:18px; font-weight:bold; display:none; z-index:15;
    pointer-events:none;
  `;
  document.body.appendChild(stationLabel);

  // ── Country map overlay ────────────────────────────────────
  const mapOverlay = document.createElement('div');
  mapOverlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,10,0.92);
    display:none; z-index:50; justify-content:center; align-items:center;
    flex-direction:column;
  `;
  mapOverlay.innerHTML = `
    <div style="color:#FFD700;font-size:26px;font-weight:bold;margin-bottom:16px">
      🗺 PAKISTAN ROUTE MAP
    </div>
    <div style="color:#888;font-size:13px;margin-bottom:24px">
      Press ESC or M to close
    </div>
    <canvas id="bigMap" width="900" height="500" style="border:2px solid #444;border-radius:10px;"></canvas>
    <div style="color:#666;font-size:12px;margin-top:14px">
      Deliver cargo between cities to unlock new routes
    </div>
  `;
  document.body.appendChild(mapOverlay);
  let mapOpen = false;

  function toggleMap() {
    mapOpen = !mapOpen;
    mapOverlay.style.display = mapOpen ? 'flex' : 'none';
    if (mapOpen) drawBigMap();
  }
  mapOverlay.addEventListener('click', e => { if(e.target===mapOverlay) toggleMap(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape' && mapOpen) toggleMap(); });

  function drawBigMap() {
    const mc = document.getElementById('bigMap');
    if (!mc) return;
    const ctx = mc.getContext('2d');
    ctx.fillStyle = '#0d1117'; ctx.fillRect(0,0,900,500);
    // Draw road
    const pts = roadCurve.getPoints(200);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 4;
    ctx.beginPath();
    pts.forEach((p,i) => {
      const x = (p.x/5000+0.5)*880+10, y = (p.z/5000+0.5)*480+10;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.stroke();
    // Player
    const tx = (physics.position.x/5000+0.5)*880+10;
    const tz = (physics.position.z/5000+0.5)*480+10;
    ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(tx,tz,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign='center';
    ctx.fillText('YOU', tx, tz-14);
    // Cities
    const cityData = [{name:'Karachi',x:-2000,z:-1900},{name:'Hyderabad',x:80,z:2350}];
    cityData.forEach(c => {
      const cx=(c.x/5000+0.5)*880+10, cz=(c.z/5000+0.5)*480+10;
      ctx.fillStyle='#E74C3C'; ctx.beginPath(); ctx.arc(cx,cz,9,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFF'; ctx.font='bold 13px Segoe UI'; ctx.textAlign='center';
      ctx.fillText(c.name, cx, cz-16);
    });
  }

  // ── Main game loop ─────────────────────────────────────────
  let lastTime = performance.now();
  let autoSaveTimer = 0;

  function gameLoop(ts) {
    requestAnimationFrame(gameLoop);

    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    const inp = getInput();

    // ── Physics ──────────────────────────────────────────────
    physics.update(dt,
      inp.accel, inp.brake, inp.steer, inp.handbrake
    );

    // Apply weather traction
    if (weather.tractionMultiplier < 1.0) {
      physics.speed *= (1 - (1 - weather.tractionMultiplier) * dt * 8);
    }

    // ── Truck mesh ────────────────────────────────────────────
    truck3d.update(physics);

    // ── Headlights at night ───────────────────────────────────
    const night = dayNight.timeOfDay > 0.78 || dayNight.timeOfDay < 0.18;
    truck3d.setHeadlights(night);

    // ── Traffic ───────────────────────────────────────────────
    traffic.update(dt);
    const collisionDmg = traffic.checkCollisions(physics);
    if (collisionDmg > 0) hud.notify(`💥 Collision! -${collisionDmg} HP`, '#E74C3C', 2000);

    // ── Camera ───────────────────────────────────────────────
    camSys.update(physics, dt);
    dayNight.updateShadowCamera(camera.position);

    // ── Day/night ─────────────────────────────────────────────
    dayNight.update(dt, camera.position);

    // ── Weather ───────────────────────────────────────────────
    weather.update(dt, camera.position, scene.fog);

    // ── Fuel stations ─────────────────────────────────────────
    let nearStation = false;
    if (world.fuelStationPositions) {
      for (const sp of world.fuelStationPositions) {
        if (physics.position.distanceTo(sp) < 20) {
          nearStation = true;
          stationLabel.style.display = 'block';
          stationLabel.textContent   = '⛽ F = Refuel ($' + Math.ceil((physics.maxFuel - physics.fuel) * 2) + ')  |  R = Repair';
          if (refuelAction) {
            const cost = Math.ceil((physics.maxFuel - physics.fuel) * 2);
            if (economy.canAfford(cost)) {
              economy.spend(cost, 'Fuel'); physics.refuel();
              hud.notify(`⛽ Refueled! -$${cost}`, '#F39C12', 2500);
            } else {
              hud.notify('Not enough money!', '#E74C3C', 2000);
            }
          }
          if (repairAction) {
            const cost = Math.round((100 - physics.health) * 5);
            if (cost > 0 && economy.canAfford(cost)) {
              economy.spend(cost,'Repair'); physics.repair();
              hud.notify(`🔧 Repaired! -$${cost}`, '#2ECC71', 2500);
            }
          }
          break;
        }
      }
    }
    if (!nearStation) stationLabel.style.display = 'none';

    // ── Mission system ─────────────────────────────────────────
    // Adapt 3D physics to 2D mission system interface
    const truckProxy = {
      x: physics.position.x, y: physics.position.z, // 3D Z maps to 2D Y
      totalDamageThisMission: 0, refueledThisMission: false,
      hasCargo: missions.phase === 'delivery', cargo: missions.active?.cargo || null,
      speed: physics.speedKmh,
    };
    const mResult = missions.update(truckProxy, dt, null, weather.current==='storm', dayNight.timeOfDay);
    if (mResult === 'delivered' || mResult === 'time_failed') {
      const lc = missions.lastCompleted;
      economy.earn(lc.reward, 'Delivery');
      const xp = progression.calcDeliveryXP(lc.noDamage, true, physics.totalKm || 0);
      progression.addXP(xp, null);
      hud.notify(`🏆 Delivered! +$${lc.reward.toLocaleString()}  +${xp} XP`, '#FFD700', 5000);
      // Reset for next mission
      setTimeout(() => {
        missions.refreshPool(progression.level, cities.getUnlocked());
        if (missions.displayMissions.length > 0) {
          missions.startMission(0);
          hud.notify(`📦 New contract: ${missions.active?.name}`, '#3498DB', 3000);
        }
      }, 3000);
    }
    // Sync truck cargo visual
    if (missions.active) {
      const ph = missions.phase;
      if (ph === 'delivery' && missions.active.cargo) {
        truck3d.showCargo(missions.active.cargo.color);
      } else {
        truck3d.showCargo(null);
      }
    }

    // ── Horn ──────────────────────────────────────────────────
    if (hornPressed) { playHorn(); hornPressed = false; }

    // ── Map toggle ────────────────────────────────────────────
    if (mapToggle) { toggleMap(); mapToggle = false; }

    // ── Audio ─────────────────────────────────────────────────
    updateEngineAudio(physics);

    // ── Auto-save ─────────────────────────────────────────────
    autoSaveTimer += dt;
    if (autoSaveTimer >= 60) {
      autoSaveTimer = 0;
      try {
        saveSystem.save({
          economy, fleet: { toJSON:()=>({trucks:[]}), trucks:[] },
          progression, achievements: { toJSON:()=>({unlocked:[]}) },
          dailyReward: { toJSON:()=>({}) }, cities,
          missions, truck: { totalKm:0, toJSON:()=>({}) }, stats:{},
          tutorial: { toJSON:()=>({}) },
        });
      } catch(_) {}
    }

    // ── Clear per-frame flags ─────────────────────────────────
    refuelAction = false; repairAction = false;

    // ── Render ────────────────────────────────────────────────
    hud.render(physics, missions, weather, camSys.mode, roadPoints, dayNight.timeOfDay);
    r3d.render(scene, camera);
  }

  requestAnimationFrame(gameLoop);
}

// ── Entry ────────────────────────────────────────────────────
init().catch(console.error);
