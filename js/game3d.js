// js/game3d.js – Mohallah Logestic 3D  |  Full game with 10 maps, 40 missions, pedestrians, music

import * as THREE from 'three';
import { Renderer3D }          from './engine3d/Renderer3D.js';
import { World3D }             from './engine3d/World3D.js';
import { TruckPhysics3D }      from './engine3d/TruckPhysics3D.js';
import { CameraSystem3D, CAM_MODE } from './engine3d/CameraSystem3D.js';
import { DayNightCycle }       from './engine3d/DayNightCycle.js';
import { WeatherSystem3D }     from './engine3d/WeatherSystem3D.js';
import { MapSystem3D, MAPS }   from './engine3d/MapSystem3D.js';
import { PedestrianSystem3D }  from './engine3d/PedestrianSystem3D.js';

import { Truck3D }             from './entities3d/Truck3D.js';
import { TrafficSystem3D }     from './entities3d/TrafficVehicle3D.js';

import { HUD3D }               from './ui/HUD3D.js';
import { GameMenu3D }          from './ui/GameMenu3D.js';

import { AudioSystem3D }       from './systems/AudioSystem3D.js';
import { EconomySystem }       from './systems/EconomySystem.js';
import { ProgressionSystem }   from './systems/ProgressionSystem.js';
import { CitySystem }          from './systems/CitySystem.js';

// ── 40 MISSIONS (8 per map theme) ────────────────────────────
const ALL_MISSIONS = [
  // Karachi Coastal (Map 0)
  {id:1, mapId:'karachi_coast',  name:'Fresh Fish Express',    cargo:'Food',         reward:820,  timeLim:null, color:'#E67E22', cargoColor:0xE67E22, diff:'Easy',   from:'Karachi', to:'Port Qasim'},
  {id:2, mapId:'karachi_coast',  name:'Container Port Haul',   cargo:'Machinery',    reward:1600, timeLim:160,  color:'#95A5A6', cargoColor:0x95A5A6, diff:'Hard',   from:'Port Qasim', to:'Karachi'},
  {id:3, mapId:'karachi_coast',  name:'Medical Supplies Rush', cargo:'Medicine',     reward:2200, timeLim:90,   color:'#2ECC71', cargoColor:0x2ECC71, diff:'Expert', from:'Karachi', to:'Port Qasim'},
  {id:4, mapId:'karachi_coast',  name:'Textile Delivery',      cargo:'Furniture',    reward:900,  timeLim:null, color:'#8E44AD', cargoColor:0x8E44AD, diff:'Normal', from:'Port Qasim', to:'Karachi'},
  // Sindh Desert (Map 1)
  {id:5, mapId:'sindh_desert',   name:'Desert Fuel Run',       cargo:'Fuel',         reward:1200, timeLim:null, color:'#F1C40F', cargoColor:0xF1C40F, diff:'Normal', from:'Hyderabad', to:'Sukkur'},
  {id:6, mapId:'sindh_desert',   name:'Salt Flat Cargo',       cargo:'Construction', reward:680,  timeLim:null, color:'#95A5A6', cargoColor:0x95A5A6, diff:'Easy',   from:'Sukkur', to:'Hyderabad'},
  {id:7, mapId:'sindh_desert',   name:'Urgent Electronics',    cargo:'Electronics',  reward:1800, timeLim:110,  color:'#9B59B6', cargoColor:0x9B59B6, diff:'Expert', from:'Hyderabad', to:'Sukkur'},
  {id:8, mapId:'sindh_desert',   name:'Camel Feed Delivery',   cargo:'Food',         reward:750,  timeLim:null, color:'#E67E22', cargoColor:0xE67E22, diff:'Easy',   from:'Sukkur', to:'Hyderabad'},
  // Multan Plains (Map 2)
  {id:9, mapId:'multan_plains',  name:'Mango Season Haul',     cargo:'Food',         reward:880,  timeLim:130,  color:'#F39C12', cargoColor:0xF39C12, diff:'Normal', from:'Multan', to:'Bahawalpur'},
  {id:10,mapId:'multan_plains',  name:'Cotton Factory Run',    cargo:'Furniture',    reward:950,  timeLim:null, color:'#8E44AD', cargoColor:0x8E44AD, diff:'Normal', from:'Bahawalpur', to:'Multan'},
  {id:11,mapId:'multan_plains',  name:'Agricultural Machinery',cargo:'Machinery',    reward:1500, timeLim:null, color:'#E74C3C', cargoColor:0xE74C3C, diff:'Hard',   from:'Multan', to:'Bahawalpur'},
  {id:12,mapId:'multan_plains',  name:'Punjab Grain Delivery', cargo:'Food',         reward:820,  timeLim:null, color:'#E67E22', cargoColor:0xE67E22, diff:'Easy',   from:'Bahawalpur', to:'Multan'},
  // Lahore Urban (Map 3)
  {id:13,mapId:'lahore_urban',   name:'Tech District Rush',    cargo:'Electronics',  reward:2100, timeLim:100,  color:'#9B59B6', cargoColor:0x9B59B6, diff:'Expert', from:'Lahore', to:'Gujranwala'},
  {id:14,mapId:'lahore_urban',   name:'GT Road Lumber',        cargo:'Construction', reward:720,  timeLim:null, color:'#95A5A6', cargoColor:0x95A5A6, diff:'Easy',   from:'Gujranwala', to:'Lahore'},
  {id:15,mapId:'lahore_urban',   name:'Lahore Food Festival',  cargo:'Food',         reward:950,  timeLim:120,  color:'#E67E22', cargoColor:0xE67E22, diff:'Normal', from:'Lahore', to:'Gujranwala'},
  {id:16,mapId:'lahore_urban',   name:'Factory Parts Delivery',cargo:'Machinery',    reward:1700, timeLim:null, color:'#E74C3C', cargoColor:0xE74C3C, diff:'Hard',   from:'Gujranwala', to:'Lahore'},
  // Islamabad Hills (Map 4)
  {id:17,mapId:'islamabad_hills',name:'Capital Diplomatic Run',cargo:'Luxury Goods', reward:2800, timeLim:95,   color:'#FFD700', cargoColor:0xFFD700, diff:'Expert', from:'Islamabad', to:'Rawalpindi'},
  {id:18,mapId:'islamabad_hills',name:'Hill Station Supplies', cargo:'Food',         reward:1100, timeLim:null, color:'#E67E22', cargoColor:0xE67E22, diff:'Normal', from:'Rawalpindi', to:'Islamabad'},
  {id:19,mapId:'islamabad_hills',name:'Mountain Hospital Aid', cargo:'Medicine',     reward:2400, timeLim:85,   color:'#2ECC71', cargoColor:0x2ECC71, diff:'Expert', from:'Islamabad', to:'Rawalpindi'},
  {id:20,mapId:'islamabad_hills',name:'Construction Materials',cargo:'Construction', reward:780,  timeLim:null, color:'#95A5A6', cargoColor:0x95A5A6, diff:'Easy',   from:'Rawalpindi', to:'Islamabad'},
  // Peshawar Mountain (Map 5)
  {id:21,mapId:'peshawar_mountain',name:'Khyber Pass Challenge',cargo:'Fuel',       reward:1500, timeLim:null, color:'#F1C40F', cargoColor:0xF1C40F, diff:'Hard',   from:'Peshawar', to:'Khyber'},
  {id:22,mapId:'peshawar_mountain',name:'Mountain Medical',   cargo:'Medicine',     reward:2600, timeLim:80,   color:'#2ECC71', cargoColor:0x2ECC71, diff:'Expert', from:'Khyber', to:'Peshawar'},
  {id:23,mapId:'peshawar_mountain',name:'Tribal Market Load', cargo:'Food',         reward:950,  timeLim:null, color:'#E67E22', cargoColor:0xE67E22, diff:'Normal', from:'Peshawar', to:'Khyber'},
  {id:24,mapId:'peshawar_mountain',name:'KPK Machinery',      cargo:'Machinery',    reward:1800, timeLim:null, color:'#E74C3C', cargoColor:0xE74C3C, diff:'Hard',   from:'Khyber', to:'Peshawar'},
  // Quetta Rocky (Map 6)
  {id:25,mapId:'quetta_rocky',   name:'Balochistan Minerals', cargo:'Construction', reward:900,  timeLim:null, color:'#95A5A6', cargoColor:0x95A5A6, diff:'Normal', from:'Quetta', to:'Mastung'},
  {id:26,mapId:'quetta_rocky',   name:'Plateau Fuel Transport',cargo:'Fuel',        reward:1300, timeLim:null, color:'#F1C40F', cargoColor:0xF1C40F, diff:'Normal', from:'Mastung', to:'Quetta'},
  {id:27,mapId:'quetta_rocky',   name:'Quetta Luxury Convoy', cargo:'Luxury Goods', reward:3000, timeLim:100,  color:'#FFD700', cargoColor:0xFFD700, diff:'Expert', from:'Quetta', to:'Mastung'},
  {id:28,mapId:'quetta_rocky',   name:'Rocky Desert Rations', cargo:'Food',         reward:800,  timeLim:null, color:'#E67E22', cargoColor:0xE67E22, diff:'Easy',   from:'Mastung', to:'Quetta'},
  // Gwadar Coast (Map 7)
  {id:29,mapId:'gawadar_coast',  name:'CPEC Machinery Haul',  cargo:'Machinery',    reward:2200, timeLim:null, color:'#E74C3C', cargoColor:0xE74C3C, diff:'Hard',   from:'Gwadar', to:'Ormara'},
  {id:30,mapId:'gawadar_coast',  name:'Port Seafood Express', cargo:'Food',         reward:1100, timeLim:90,   color:'#E67E22', cargoColor:0xE67E22, diff:'Normal', from:'Ormara', to:'Gwadar'},
  {id:31,mapId:'gawadar_coast',  name:'Oil Terminal Run',     cargo:'Fuel',         reward:1600, timeLim:null, color:'#F1C40F', cargoColor:0xF1C40F, diff:'Hard',   from:'Gwadar', to:'Ormara'},
  {id:32,mapId:'gawadar_coast',  name:'Coastal Electronics',  cargo:'Electronics',  reward:1900, timeLim:110,  color:'#9B59B6', cargoColor:0x9B59B6, diff:'Expert', from:'Ormara', to:'Gwadar'},
  // Industrial Zone (Map 8)
  {id:33,mapId:'industrial_zone',name:'Factory to Port',      cargo:'Machinery',    reward:1400, timeLim:null, color:'#E74C3C', cargoColor:0xE74C3C, diff:'Normal', from:'Port Terminal', to:'Industrial Area'},
  {id:34,mapId:'industrial_zone',name:'Chemical Plant Haul',  cargo:'Fuel',         reward:1700, timeLim:null, color:'#F1C40F', cargoColor:0xF1C40F, diff:'Hard',   from:'Industrial Area', to:'Port Terminal'},
  {id:35,mapId:'industrial_zone',name:'Urgent Spare Parts',   cargo:'Electronics',  reward:2400, timeLim:75,   color:'#9B59B6', cargoColor:0x9B59B6, diff:'Expert', from:'Port Terminal', to:'Industrial Area'},
  {id:36,mapId:'industrial_zone',name:'Industrial Food Supply',cargo:'Food',        reward:750,  timeLim:null, color:'#E67E22', cargoColor:0xE67E22, diff:'Easy',   from:'Industrial Area', to:'Port Terminal'},
  // Night City (Map 9)
  {id:37,mapId:'lahore_night',   name:'Night Shift Electronics',cargo:'Electronics',reward:2500, timeLim:85,   color:'#9B59B6', cargoColor:0x9B59B6, diff:'Expert', from:'Lahore Night', to:'Sheikhupura'},
  {id:38,mapId:'lahore_night',   name:'Late Pharmacy Run',     cargo:'Medicine',    reward:2800, timeLim:70,   color:'#2ECC71', cargoColor:0x2ECC71, diff:'Expert', from:'Sheikhupura', to:'Lahore Night'},
  {id:39,mapId:'lahore_night',   name:'Night Market Food',     cargo:'Food',        reward:950,  timeLim:null, color:'#E67E22', cargoColor:0xE67E22, diff:'Normal', from:'Lahore Night', to:'Sheikhupura'},
  {id:40,mapId:'lahore_night',   name:'Midnight Luxury Convoy',cargo:'Luxury Goods',reward:3500, timeLim:90,   color:'#FFD700', cargoColor:0xFFD700, diff:'Expert', from:'Sheikhupura', to:'Lahore Night'},
];

// ── Input ─────────────────────────────────────────────────────
const keys = {}, justDown = {};
window.addEventListener('keydown', e => {
  if (!keys[e.key]) justDown[e.key] = true;
  keys[e.key] = true;
  if ([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function getInput() {
  return {
    accel:     !!(keys['w']||keys['W']||keys['ArrowUp']),
    brake:     !!(keys['s']||keys['S']||keys['ArrowDown']),
    steer:     (keys['d']||keys['D']||keys['ArrowRight']?1:0)-(keys['a']||keys['A']||keys['ArrowLeft']?1:0),
    handbrake: !!(keys[' ']),
  };
}

// ── State ─────────────────────────────────────────────────────
let appState    = 'MAP_SELECT'; // MAP_SELECT | MISSION_SELECT | DRIVING | PAUSED
let selMap      = 0;
let selMission  = null;
let activeMission = null;
let missionPhase  = null;    // 'pickup' | 'delivery'
let missionTimer  = 0;
let missionScore  = 0;
let totalMoney  = 5000;
let totalScore  = 0;
let completedIds = new Set();
let gearMode    = 'auto';
let manualGear  = 1;
let cruiseSpeed = 0;
let steerSens   = 1.0;
let fpsDisplay  = false;
let showFPS     = false;

// ── 3D scene ──────────────────────────────────────────────────
let scene, r3d, camera, camSys, dayNight, weather;
let world, truck3d, physics, traffic, peds;
let hud, audio, gameMenu;
let roadPoints = [];
let autoSaveTimer = 0;

async function init() {
  const canvas = document.getElementById('c');
  scene   = new THREE.Scene();
  r3d     = new Renderer3D(canvas);
  camera  = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.5, 8000);
  camera.position.set(0, 10, -25);
  r3d.onResize((W,H) => { camera.aspect=W/H; camera.updateProjectionMatrix(); });

  hud       = new HUD3D();
  gameMenu  = new GameMenu3D();
  audio     = new AudioSystem3D();

  // Audio init on first interaction
  const _ai = () => { audio.init(); audio.startMusic('desert'); document.removeEventListener('click',_ai); document.removeEventListener('keydown',_ai); };
  document.addEventListener('click',  _ai);
  document.addEventListener('keydown',_ai);

  // GameMenu callbacks
  gameMenu.on('cameraMode', idx => { if(camSys) { const modes=[CAM_MODE.THIRD_PERSON,CAM_MODE.COCKPIT,CAM_MODE.HOOD,CAM_MODE.CINEMATIC]; camSys.mode=modes[idx-1]||modes[0]; }});
  gameMenu.on('camDist',    v => { if(camSys) camSys.ARM_LENGTH=v; });
  gameMenu.on('camHeight',  v => { if(camSys) camSys.ARM_HEIGHT=v; });
  gameMenu.on('camLag',     v => { if(camSys) camSys.POS_LAG=v; });
  gameMenu.on('steerSens',  v => { steerSens=v; });
  gameMenu.on('gearMode',   m => { gearMode=m; });
  gameMenu.on('musicVol',   v => { if(audio._musicGain) audio._musicGain.gain.setTargetAtTime(v,audio._ctx?.currentTime||0,0.2); });
  gameMenu.on('mute',         () => { audio.setMuted(!audio.muted); });
  gameMenu.on('close',        () => { if(appState==='PAUSED') appState='DRIVING'; });

  buildMapSelectUI();
  requestAnimationFrame(gameLoop);
}

// ── Build/tear down 3D world ──────────────────────────────────
function buildWorld(mapIdx) {
  // Remove old world objects
  if (truck3d)  { truck3d.dispose(); truck3d=null; }
  if (traffic)  { traffic.dispose(); traffic=null; }
  if (peds)     { peds.dispose(); peds=null; }
  // Clear scene (keep camera)
  while(scene.children.length) { const o=scene.children[0]; scene.remove(o); if(o.geometry)o.geometry.dispose(); }

  const map = MAPS[mapIdx] || MAPS[0];
  // Fog
  scene.fog = new THREE.FogExp2(map.fogColor, map.fogDensity);

  world     = new World3D(scene, map);
  world.build();

  dayNight  = new DayNightCycle(scene);
  dayNight.timeOfDay = map.timeOfDay;

  weather   = new WeatherSystem3D(scene);
  if (map.startWeather && map.startWeather !== 'clear') weather.forceWeather(map.startWeather.toUpperCase());

  physics   = new TruckPhysics3D(world);
  truck3d   = new Truck3D(scene, '#E74C3C');
  camSys    = new CameraSystem3D(camera);
  camSys.ARM_LENGTH = gameMenu.settings.cameraDistance;
  camSys.ARM_HEIGHT = gameMenu.settings.cameraHeight;
  camSys.POS_LAG    = gameMenu.settings.cameraLag;
  camSys.snapTo(physics.position);

  traffic   = new TrafficSystem3D(scene, world, map);
  peds      = new PedestrianSystem3D(scene, world.roadCurve);

  roadPoints = world.roadCurve.getPoints(120);

  // Audio music theme per map
  const theme = { karachi_coast:'coastal', sindh_desert:'desert', multan_plains:'desert', lahore_urban:'city', islamabad_hills:'mountain', peshawar_mountain:'mountain', quetta_rocky:'desert', gawadar_coast:'coastal', industrial_zone:'industrial', lahore_night:'night' }[map.id] || 'desert';
  audio.stopMusic();
  if (audio.ready) audio.startMusic(theme);

  dayNight._applyTimeOfDay();
}

// ── UI overlays ───────────────────────────────────────────────
let uiOverlay = null;

function makeOverlay(html) {
  if (uiOverlay) uiOverlay.remove();
  uiOverlay = document.createElement('div');
  uiOverlay.style.cssText = 'position:fixed;inset:0;z-index:200;overflow:auto;background:rgba(0,0,0,0.92);font-family:"Segoe UI",Arial,sans-serif;';
  uiOverlay.innerHTML = html;
  document.body.appendChild(uiOverlay);
  return uiOverlay;
}

// ── MAP SELECT ────────────────────────────────────────────────
function buildMapSelectUI() {
  const cardsHtml = MAPS.map((m,i) => `
    <div onclick="window._selectMap(${i})" style="
      background:${selMap===i?'#1E2D40':'#161b22'}; border:2px solid ${selMap===i?'#FFD700':'#333'};
      border-radius:12px; padding:16px; cursor:pointer; transition:all 0.2s;
    " onmouseover="this.style.borderColor='#3498DB'" onmouseout="this.style.borderColor='${selMap===i?'#FFD700':'#333'}'">
      <div style="font-size:28px;margin-bottom:6px">${m.thumbnail}</div>
      <div style="color:#FFD700;font-weight:bold;font-size:13px">${m.name}</div>
      <div style="color:#888;font-size:10px;margin-top:3px">${m.subtitle}</div>
      <div style="color:#444;font-size:9px;margin-top:6px">Lv${m.unlockLevel} · Traffic ×${m.trafficDensity}</div>
    </div>
  `).join('');

  const o = makeOverlay(`
    <div style="max-width:960px;margin:0 auto;padding:30px 20px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="color:#FFD700;font-size:32px;font-weight:900;letter-spacing:0.04em">🗺 SELECT MAP</div>
        <div style="color:#888;font-size:14px;margin-top:4px">Choose your region – each has unique terrain, traffic & missions</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin-bottom:28px">
        ${cardsHtml}
      </div>
      <div style="text-align:center">
        <button onclick="window._goMissions()" style="
          padding:14px 48px;background:#C0392B;border:none;color:#FFF;
          font-size:18px;font-weight:bold;border-radius:10px;cursor:pointer;
          letter-spacing:0.04em;transition:background 0.2s
        ">▶ SELECT MISSIONS →</button>
        <div style="color:#444;font-size:12px;margin-top:10px">$${totalMoney.toLocaleString()} available · ${completedIds.size}/40 missions done</div>
      </div>
    </div>
  `);
  window._selectMap = i => { selMap=i; buildMapSelectUI(); };
  window._goMissions = () => buildMissionSelectUI();
}

// ── MISSION SELECT ────────────────────────────────────────────
function buildMissionSelectUI() {
  const mapId = MAPS[selMap].id;
  const mapMissions = ALL_MISSIONS.filter(m => m.mapId === mapId);

  const cards = mapMissions.map(m => {
    const done = completedIds.has(m.id);
    return `
      <div onclick="window._selectMission(${m.id})" style="
        background:${selMission?.id===m.id?'#1E2D40':'#161b22'};
        border:2px solid ${done?'#2ECC71':selMission?.id===m.id?'#FFD700':'#333'};
        border-radius:10px;padding:14px 16px;cursor:pointer;position:relative;
      ">
        ${done?'<div style="position:absolute;top:8px;right:10px;color:#2ECC71;font-size:14px">✓</div>':''}
        <div style="color:#FFD700;font-weight:bold;font-size:13px">${m.name}</div>
        <div style="color:${m.color||'#888'};font-size:11px;margin:3px 0">${m.cargo}</div>
        <div style="color:#666;font-size:10px">${m.from} → ${m.to}</div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;align-items:center">
          <span style="color:#2ECC71;font-weight:bold;font-size:14px">$${m.reward.toLocaleString()}</span>
          <span style="color:${m.diff==='Expert'?'#9B59B6':m.diff==='Hard'?'#E74C3C':m.diff==='Normal'?'#F39C12':'#2ECC71'};font-size:10px">${m.diff}</span>
          ${m.timeLim?`<span style="color:#FF6B35;font-size:10px">⏱${m.timeLim}s</span>`:''}
        </div>
      </div>`;
  }).join('');

  makeOverlay(`
    <div style="max-width:900px;margin:0 auto;padding:30px 20px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <button onclick="window._backMap()" style="padding:8px 18px;background:#1a2030;border:1px solid #333;color:#888;border-radius:7px;cursor:pointer;font-size:13px">← Maps</button>
        <div>
          <div style="color:#FFD700;font-size:24px;font-weight:bold">${MAPS[selMap].thumbnail} ${MAPS[selMap].name}</div>
          <div style="color:#888;font-size:12px">${MAPS[selMap].subtitle}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px">
        ${cards}
      </div>
      <div style="text-align:center">
        <button onclick="window._startMission()" style="
          padding:13px 44px;background:${selMission?'#C0392B':'#333'};
          border:none;color:${selMission?'#FFF':'#666'};font-size:17px;font-weight:bold;
          border-radius:9px;cursor:${selMission?'pointer':'not-allowed'};
        ">${selMission?'▶ START MISSION':'Select a Mission Above'}</button>
        <div style="color:#444;font-size:11px;margin-top:8px">${completedIds.size}/40 completed</div>
      </div>
    </div>
  `);
  window._selectMission = id => { selMission=ALL_MISSIONS.find(m=>m.id===id); buildMissionSelectUI(); };
  window._backMap       = () => buildMapSelectUI();
  window._startMission  = () => { if(selMission) startDriving(); };
}

// ── START DRIVING ─────────────────────────────────────────────
function startDriving() {
  if (uiOverlay) { uiOverlay.remove(); uiOverlay=null; }
  buildWorld(selMap);

  activeMission  = selMission;
  missionPhase   = 'pickup';
  missionTimer   = activeMission.timeLim || 0;
  missionScore   = 0;
  appState       = 'DRIVING';

  // Set pickup & delivery positions from road curve
  const pStart = world.roadCurve.getPoint(0.05);
  const pEnd   = world.roadCurve.getPoint(0.93);
  const tanS   = world.roadCurve.getTangent(0.05).normalize();
  const rtS    = new THREE.Vector3().crossVectors(tanS,new THREE.Vector3(0,1,0)).normalize();
  activeMission._pickupPos3D   = pStart.clone().addScaledVector(rtS, -15);
  activeMission._deliveryPos3D = pEnd.clone().addScaledVector(rtS, 15);

  hud.notify(`📦 ${activeMission.name} – Drive to pickup!`, '#FFD700', 5000);
  audio.startEngine();
}

// ── MISSION COMPLETE / FAIL ────────────────────────────────────
function completeMission(success) {
  const reward = success ? activeMission.reward : Math.round(activeMission.reward * 0.2);
  totalMoney += reward;
  if (success) completedIds.add(activeMission.id);

  audio.stopEngine();
  audio.stopMusic();
  if (success) { audio.success(); setTimeout(()=>audio.startMusic('city'),2000); }

  const bonusText = success && activeMission.timeLim && missionTimer > 0 ? `<br><span style="color:#F39C12">⏱ On time! +20% bonus = $${Math.round(reward*0.2)}</span>` : '';

  makeOverlay(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:18px">
      <div style="font-size:72px">${success?'🏆':'💀'}</div>
      <div style="color:${success?'#2ECC71':'#E74C3C'};font-size:32px;font-weight:bold">${success?'DELIVERY COMPLETE!':'MISSION FAILED'}</div>
      <div style="color:#FFD700;font-size:26px;font-weight:bold">+$${reward.toLocaleString()}</div>
      <div style="color:#888;font-size:15px;text-align:center">${activeMission.name}${bonusText}</div>
      <div style="color:#666;font-size:13px">Total: $${totalMoney.toLocaleString()} · ${completedIds.size}/40 missions done</div>
      <div style="display:flex;gap:14px;margin-top:8px">
        <button onclick="window._nextMission()" style="padding:12px 32px;background:#C0392B;border:none;color:#FFF;font-size:16px;font-weight:bold;border-radius:8px;cursor:pointer">🚚 Next Mission</button>
        <button onclick="window._backMap()" style="padding:12px 32px;background:#1a2030;border:1px solid #444;color:#AAA;font-size:16px;border-radius:8px;cursor:pointer">🗺 Map Select</button>
      </div>
    </div>
  `);
  window._nextMission = () => { buildMissionSelectUI(); };
  window._backMap     = () => buildMapSelectUI();
  activeMission = null; appState = 'IDLE';
}

// ── PAUSE SCREEN ──────────────────────────────────────────────
function showPause() {
  appState = 'PAUSED';
  gameMenu.open();
}

// ── FPS COUNTER ───────────────────────────────────────────────
let fpsTime=0, fpsCount=0, fpsVal=0;
function updateFPS(dt) {
  fpsCount++; fpsTime+=dt;
  if(fpsTime>=1.0){fpsVal=Math.round(fpsCount/fpsTime);fpsCount=0;fpsTime=0;}
}

// ── MAIN GAME LOOP ────────────────────────────────────────────
let lastTime = performance.now();

function gameLoop(ts) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min((ts-lastTime)/1000, 0.05);
  lastTime = ts;
  updateFPS(dt);

  // ── Per-frame key events ─────────────────────────────────
  if (justDown['Tab'])    { if(appState==='DRIVING'||appState==='PAUSED') { gameMenu.toggle(); if(!gameMenu.isOpen) appState='DRIVING'; else appState='PAUSED'; } }
  if (justDown['Escape']) { if(appState==='DRIVING') showPause(); else if(appState==='PAUSED'&&!gameMenu.isOpen) appState='DRIVING'; }
  if (justDown['h']||justDown['H']) audio.horn();
  if (justDown['1']) camSys && (camSys.mode=CAM_MODE.THIRD_PERSON);
  if (justDown['2']) camSys && (camSys.mode=CAM_MODE.COCKPIT);
  if (justDown['3']) camSys && (camSys.mode=CAM_MODE.HOOD);
  if (justDown['4']) camSys && (camSys.mode=CAM_MODE.CINEMATIC);
  if (justDown['c']||justDown['C']) {
    cruiseSpeed = cruiseSpeed > 0 ? 0 : Math.max(0, physics?.speedKmh||0);
    gameMenu.updateCruise(cruiseSpeed);
    hud?.notify(cruiseSpeed>0?`🚗 Cruise ON @ ${Math.round(cruiseSpeed)} km/h`:'🚗 Cruise OFF','#F39C12',2000);
  }
  // Manual gear
  if (gearMode==='manual') {
    if ((justDown['q']||justDown['Q']) && physics && physics.gear>1) { physics.gear--; hud?.notify(`Gear ${physics.gear}`,'#3498DB',800); }
    if ((justDown['e']||justDown['E']) && physics && physics.gear<4) { physics.gear++; hud?.notify(`Gear ${physics.gear}`,'#3498DB',800); }
  }
  // Map toggle during driving
  if (justDown['m']||justDown['M']) { /* handled later */ }
  // Refuel/repair
  if ((justDown['f']||justDown['F']) && appState==='DRIVING' && physics) {
    let near=false;
    for(const sp of (world?.fuelStationPositions||[])){
      if(physics.position.distanceTo(sp)<22){near=true;break;}
    }
    if(near&&totalMoney>0){const cost=Math.ceil((physics.maxFuel-physics.fuel)*2);if(totalMoney>=cost){totalMoney-=cost;physics.refuel();hud?.notify(`⛽ Refueled -$${cost}`,'#F39C12',2500);audio.refuel();}}
  }
  if ((justDown['r']||justDown['R']) && appState==='DRIVING' && physics) {
    let near=false; for(const sp of (world?.fuelStationPositions||[])){if(physics.position.distanceTo(sp)<22){near=true;break;}}
    if(near){const c=Math.round((100-physics.health)*5);if(c>0&&totalMoney>=c){totalMoney-=c;physics.repair();hud?.notify(`🔧 Repaired -$${c}`,'#2ECC71',2500);}}
  }

  // Clear just-down
  for(const k in justDown) delete justDown[k];

  // ── DRIVING logic ────────────────────────────────────────
  if (appState === 'DRIVING' && physics && world && !gameMenu.isOpen) {
    const inp = getInput();
    let effectiveSteer = inp.steer * steerSens;
    let effectiveAccel = inp.accel;
    let effectiveBrake = inp.brake;

    // Cruise control
    if (cruiseSpeed > 0 && !inp.brake && !inp.handbrake) {
      const kph = physics.speedKmh;
      if (kph < cruiseSpeed - 2) effectiveAccel = true;
      else if (kph > cruiseSpeed + 2) effectiveBrake = true;
      else { effectiveAccel = false; effectiveBrake = false; }
    }
    if (inp.brake) cruiseSpeed = 0;

    physics.update(dt, effectiveAccel, effectiveBrake, effectiveSteer, inp.handbrake);

    // Weather traction
    const wt = weather?.tractionMultiplier||1;
    if(wt<1) physics.speed *= (1-(1-wt)*dt*6);

    truck3d.update(physics);
    traffic.update(dt, dayNight?.timeOfDay||0.4);
    peds.update(dt, physics.position);

    // Collision
    const dmg = traffic.checkCollisions(physics);
    if(dmg>0){ audio.collision(Math.min(dmg/40,1)); hud?.notify(`💥 Collision! -${dmg} HP`,'#E74C3C',2000);}

    camSys.update(physics, dt);
    dayNight?.update(dt, camera.position);
    dayNight?.updateShadowCamera(camera.position);
    weather?.update(dt, camera.position);

    // Headlights at night
    const isNight = (dayNight?.timeOfDay||0) > 0.78 || (dayNight?.timeOfDay||0) < 0.18;
    truck3d.setHeadlights(isNight);

    audio.updateEngine(physics.speedAbs, physics.MAX_SPEED);
    if(weather?.rainIntensity>0.1) audio.startRain(weather.rainIntensity);
    else audio.stopRain();

    // Mission logic
    if (activeMission) {
      if (activeMission.timeLim) {
        missionTimer -= dt;
        if (missionTimer <= 0) { hud?.notify('⏰ Time expired! Partial reward.','#E74C3C',3000); completeMission(false); return; }
      }

      if (missionPhase === 'pickup') {
        const pp = activeMission._pickupPos3D;
        if (pp && physics.position.distanceTo(pp) < 18) {
          missionPhase = 'delivery';
          truck3d.showCargo(activeMission.cargoColor || 0xE67E22);
          hud?.notify('📦 Cargo loaded! Drive to destination!','#2ECC71',4000);
          audio.refuel();
        }
      } else if (missionPhase === 'delivery') {
        const dp = activeMission._deliveryPos3D;
        if (dp && physics.position.distanceTo(dp) < 18) {
          completeMission(true);
          return;
        }
      }

      // Game over: fuel empty + health zero
      if (physics.fuel <= 0 && physics.speedAbs < 0.3) { completeMission(false); return; }
      if (physics.health <= 0) { completeMission(false); return; }
    }

    // Fuel station prompt
    let nearStation = false;
    for(const sp of (world.fuelStationPositions||[])){if(physics.position.distanceTo(sp)<22){nearStation=true;break;}}
    const sl = document.getElementById('stationLabel3d');
    if(sl) sl.style.display = nearStation ? 'block' : 'none';

    autoSaveTimer += dt;
    if(autoSaveTimer>=60){ autoSaveTimer=0; try{localStorage.setItem('ml3d_save',JSON.stringify({money:totalMoney,completed:[...completedIds]}));}catch(_){} }
  }

  // ── Render ───────────────────────────────────────────────
  if (world && appState !== 'IDLE') {
    hud.render(physics, { active:activeMission?{name:activeMission.name,cargo:{type:activeMission.cargo,color:activeMission.color||'#888'},fromCityDef:{name:activeMission.from},toCityDef:{name:activeMission.to},def:{baseReward:activeMission.reward}}:null, phase:missionPhase, timeRemaining:missionTimer, hasTimeLimit:!!activeMission?.timeLim, active:{timeBonusAmt:0,...(activeMission||{})} }, weather, camSys?.mode, roadPoints, dayNight?.timeOfDay||0.4);

    // FPS overlay
    const fe = document.getElementById('fpsOverlay3d');
    if(fe) fe.textContent = gameMenu.settings.showFPS ? `${fpsVal} FPS` : '';
    r3d.render(scene, camera);
  }
}

// ── Fuel station label overlay ─────────────────────────────────
const stLbl = document.createElement('div');
stLbl.id = 'stationLabel3d';
stLbl.style.cssText = 'position:fixed;top:48%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);border:2px solid #F39C12;border-radius:12px;padding:12px 26px;color:#F39C12;font-size:16px;font-weight:bold;display:none;z-index:15;pointer-events:none;';
stLbl.textContent = '⛽ F = Refuel   R = Repair';
document.body.appendChild(stLbl);

// FPS overlay
const fpsEl = document.createElement('div');
fpsEl.id = 'fpsOverlay3d';
fpsEl.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);color:#FFD700;font-size:13px;font-family:monospace;pointer-events:none;z-index:12;';
document.body.appendChild(fpsEl);

// Load save
try { const s=JSON.parse(localStorage.getItem('ml3d_save')||'{}'); totalMoney=s.money||5000; completedIds=new Set(s.completed||[]); } catch(_) {}

// ── Start ─────────────────────────────────────────────────────
init().catch(console.error);
