// js/game3d.js – Mohallah Logestic 3D  |  Full game v2
// Fixes: longer routes, two-way traffic, 3D markers, weather controls, camera UI

import * as THREE from 'three';
import { Renderer3D }               from './engine3d/Renderer3D.js';
import { World3D }                  from './engine3d/World3D.js';
import { TruckPhysics3D }           from './engine3d/TruckPhysics3D.js';
import { CameraSystem3D, CAM_MODE } from './engine3d/CameraSystem3D.js';
import { DayNightCycle }            from './engine3d/DayNightCycle.js';
import { WeatherSystem3D, WEATHER3D }from './engine3d/WeatherSystem3D.js';
import { MapSystem3D, MAPS }        from './engine3d/MapSystem3D.js';
import { PedestrianSystem3D }       from './engine3d/PedestrianSystem3D.js';
import { Truck3D }                  from './entities3d/Truck3D.js';
import { TrafficSystem3D }          from './entities3d/TrafficVehicle3D.js';
import { HUD3D }                    from './ui/HUD3D.js';
import { GameMenu3D }               from './ui/GameMenu3D.js';
import { AudioSystem3D }            from './systems/AudioSystem3D.js';
import { EconomySystem }            from './systems/EconomySystem.js';

// ── 40 MISSIONS ───────────────────────────────────────────────
const ALL_MISSIONS = [
  {id:1, mapId:'karachi_coast',  name:'Fresh Fish Express',     cargo:'Food',         reward:820,  timeLim:null, col:'#E67E22', cCol:0xE67E22, diff:'Easy',   from:'Karachi',      to:'Port Qasim'},
  {id:2, mapId:'karachi_coast',  name:'Container Port Haul',    cargo:'Machinery',    reward:1600, timeLim:160,  col:'#95A5A6', cCol:0x95A5A6, diff:'Hard',   from:'Port Qasim',   to:'Karachi'},
  {id:3, mapId:'karachi_coast',  name:'Medical Supplies Rush',  cargo:'Medicine',     reward:2200, timeLim:90,   col:'#2ECC71', cCol:0x2ECC71, diff:'Expert', from:'Karachi',      to:'Port Qasim'},
  {id:4, mapId:'karachi_coast',  name:'Textile Delivery',       cargo:'Furniture',    reward:900,  timeLim:null, col:'#8E44AD', cCol:0x8E44AD, diff:'Normal', from:'Port Qasim',   to:'Karachi'},
  {id:5, mapId:'sindh_desert',   name:'Desert Fuel Run',        cargo:'Fuel',         reward:1200, timeLim:null, col:'#F1C40F', cCol:0xF1C40F, diff:'Normal', from:'Hyderabad',    to:'Sukkur'},
  {id:6, mapId:'sindh_desert',   name:'Salt Flat Cargo',        cargo:'Construction', reward:680,  timeLim:null, col:'#95A5A6', cCol:0x95A5A6, diff:'Easy',   from:'Sukkur',       to:'Hyderabad'},
  {id:7, mapId:'sindh_desert',   name:'Urgent Electronics',     cargo:'Electronics',  reward:1800, timeLim:110,  col:'#9B59B6', cCol:0x9B59B6, diff:'Expert', from:'Hyderabad',    to:'Sukkur'},
  {id:8, mapId:'sindh_desert',   name:'Camel Feed Delivery',    cargo:'Food',         reward:750,  timeLim:null, col:'#E67E22', cCol:0xE67E22, diff:'Easy',   from:'Sukkur',       to:'Hyderabad'},
  {id:9, mapId:'multan_plains',  name:'Mango Season Haul',      cargo:'Food',         reward:880,  timeLim:130,  col:'#F39C12', cCol:0xF39C12, diff:'Normal', from:'Multan',       to:'Bahawalpur'},
  {id:10,mapId:'multan_plains',  name:'Cotton Factory Run',     cargo:'Furniture',    reward:950,  timeLim:null, col:'#8E44AD', cCol:0x8E44AD, diff:'Normal', from:'Bahawalpur',   to:'Multan'},
  {id:11,mapId:'multan_plains',  name:'Agricultural Machinery', cargo:'Machinery',    reward:1500, timeLim:null, col:'#E74C3C', cCol:0xE74C3C, diff:'Hard',   from:'Multan',       to:'Bahawalpur'},
  {id:12,mapId:'multan_plains',  name:'Punjab Grain Delivery',  cargo:'Food',         reward:820,  timeLim:null, col:'#E67E22', cCol:0xE67E22, diff:'Easy',   from:'Bahawalpur',   to:'Multan'},
  {id:13,mapId:'lahore_urban',   name:'Tech District Rush',     cargo:'Electronics',  reward:2100, timeLim:100,  col:'#9B59B6', cCol:0x9B59B6, diff:'Expert', from:'Lahore',       to:'Gujranwala'},
  {id:14,mapId:'lahore_urban',   name:'GT Road Lumber',         cargo:'Construction', reward:720,  timeLim:null, col:'#95A5A6', cCol:0x95A5A6, diff:'Easy',   from:'Gujranwala',   to:'Lahore'},
  {id:15,mapId:'lahore_urban',   name:'Lahore Food Festival',   cargo:'Food',         reward:950,  timeLim:120,  col:'#E67E22', cCol:0xE67E22, diff:'Normal', from:'Lahore',       to:'Gujranwala'},
  {id:16,mapId:'lahore_urban',   name:'Factory Parts Delivery', cargo:'Machinery',    reward:1700, timeLim:null, col:'#E74C3C', cCol:0xE74C3C, diff:'Hard',   from:'Gujranwala',   to:'Lahore'},
  {id:17,mapId:'islamabad_hills',name:'Capital Diplomatic Run', cargo:'Luxury Goods', reward:2800, timeLim:95,   col:'#FFD700', cCol:0xFFD700, diff:'Expert', from:'Islamabad',    to:'Rawalpindi'},
  {id:18,mapId:'islamabad_hills',name:'Hill Station Supplies',  cargo:'Food',         reward:1100, timeLim:null, col:'#E67E22', cCol:0xE67E22, diff:'Normal', from:'Rawalpindi',   to:'Islamabad'},
  {id:19,mapId:'islamabad_hills',name:'Mountain Hospital Aid',  cargo:'Medicine',     reward:2400, timeLim:85,   col:'#2ECC71', cCol:0x2ECC71, diff:'Expert', from:'Islamabad',    to:'Rawalpindi'},
  {id:20,mapId:'islamabad_hills',name:'Construction Materials', cargo:'Construction', reward:780,  timeLim:null, col:'#95A5A6', cCol:0x95A5A6, diff:'Easy',   from:'Rawalpindi',   to:'Islamabad'},
  {id:21,mapId:'peshawar_mountain',name:'Khyber Pass Challenge',cargo:'Fuel',         reward:1500, timeLim:null, col:'#F1C40F', cCol:0xF1C40F, diff:'Hard',   from:'Peshawar',     to:'Khyber'},
  {id:22,mapId:'peshawar_mountain',name:'Mountain Medical',     cargo:'Medicine',     reward:2600, timeLim:80,   col:'#2ECC71', cCol:0x2ECC71, diff:'Expert', from:'Khyber',       to:'Peshawar'},
  {id:23,mapId:'peshawar_mountain',name:'Tribal Market Load',   cargo:'Food',         reward:950,  timeLim:null, col:'#E67E22', cCol:0xE67E22, diff:'Normal', from:'Peshawar',     to:'Khyber'},
  {id:24,mapId:'peshawar_mountain',name:'KPK Machinery',        cargo:'Machinery',    reward:1800, timeLim:null, col:'#E74C3C', cCol:0xE74C3C, diff:'Hard',   from:'Khyber',       to:'Peshawar'},
  {id:25,mapId:'quetta_rocky',   name:'Balochistan Minerals',   cargo:'Construction', reward:900,  timeLim:null, col:'#95A5A6', cCol:0x95A5A6, diff:'Normal', from:'Quetta',       to:'Mastung'},
  {id:26,mapId:'quetta_rocky',   name:'Plateau Fuel Transport', cargo:'Fuel',         reward:1300, timeLim:null, col:'#F1C40F', cCol:0xF1C40F, diff:'Normal', from:'Mastung',      to:'Quetta'},
  {id:27,mapId:'quetta_rocky',   name:'Quetta Luxury Convoy',   cargo:'Luxury Goods', reward:3000, timeLim:100,  col:'#FFD700', cCol:0xFFD700, diff:'Expert', from:'Quetta',       to:'Mastung'},
  {id:28,mapId:'quetta_rocky',   name:'Rocky Desert Rations',   cargo:'Food',         reward:800,  timeLim:null, col:'#E67E22', cCol:0xE67E22, diff:'Easy',   from:'Mastung',      to:'Quetta'},
  {id:29,mapId:'gawadar_coast',  name:'CPEC Machinery Haul',    cargo:'Machinery',    reward:2200, timeLim:null, col:'#E74C3C', cCol:0xE74C3C, diff:'Hard',   from:'Gwadar',       to:'Ormara'},
  {id:30,mapId:'gawadar_coast',  name:'Port Seafood Express',   cargo:'Food',         reward:1100, timeLim:90,   col:'#E67E22', cCol:0xE67E22, diff:'Normal', from:'Ormara',       to:'Gwadar'},
  {id:31,mapId:'gawadar_coast',  name:'Oil Terminal Run',       cargo:'Fuel',         reward:1600, timeLim:null, col:'#F1C40F', cCol:0xF1C40F, diff:'Hard',   from:'Gwadar',       to:'Ormara'},
  {id:32,mapId:'gawadar_coast',  name:'Coastal Electronics',    cargo:'Electronics',  reward:1900, timeLim:110,  col:'#9B59B6', cCol:0x9B59B6, diff:'Expert', from:'Ormara',       to:'Gwadar'},
  {id:33,mapId:'industrial_zone',name:'Factory to Port',        cargo:'Machinery',    reward:1400, timeLim:null, col:'#E74C3C', cCol:0xE74C3C, diff:'Normal', from:'Port Terminal','to':'Industrial Area'},
  {id:34,mapId:'industrial_zone',name:'Chemical Plant Haul',    cargo:'Fuel',         reward:1700, timeLim:null, col:'#F1C40F', cCol:0xF1C40F, diff:'Hard',   from:'Industrial Area','to':'Port Terminal'},
  {id:35,mapId:'industrial_zone',name:'Urgent Spare Parts',     cargo:'Electronics',  reward:2400, timeLim:75,   col:'#9B59B6', cCol:0x9B59B6, diff:'Expert', from:'Port Terminal','to':'Industrial Area'},
  {id:36,mapId:'industrial_zone',name:'Industrial Food Supply', cargo:'Food',         reward:750,  timeLim:null, col:'#E67E22', cCol:0xE67E22, diff:'Easy',   from:'Industrial Area','to':'Port Terminal'},
  {id:37,mapId:'lahore_night',   name:'Night Shift Electronics',cargo:'Electronics',  reward:2500, timeLim:85,   col:'#9B59B6', cCol:0x9B59B6, diff:'Expert', from:'Lahore Night', to:'Sheikhupura'},
  {id:38,mapId:'lahore_night',   name:'Late Pharmacy Run',      cargo:'Medicine',     reward:2800, timeLim:70,   col:'#2ECC71', cCol:0x2ECC71, diff:'Expert', from:'Sheikhupura',  to:'Lahore Night'},
  {id:39,mapId:'lahore_night',   name:'Night Market Food',      cargo:'Food',         reward:950,  timeLim:null, col:'#E67E22', cCol:0xE67E22, diff:'Normal', from:'Lahore Night', to:'Sheikhupura'},
  {id:40,mapId:'lahore_night',   name:'Midnight Luxury Convoy', cargo:'Luxury Goods', reward:3500, timeLim:90,   col:'#FFD700', cCol:0xFFD700, diff:'Expert', from:'Sheikhupura',  to:'Lahore Night'},
];

// ── Input ─────────────────────────────────────────────────────
const keys = {}, justDown = {};
window.addEventListener('keydown', e => { if(!keys[e.key]) justDown[e.key]=true; keys[e.key]=true; if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault(); });
window.addEventListener('keyup',   e => { keys[e.key]=false; });
const inp = () => ({
  accel:     !!(keys['w']||keys['W']||keys['ArrowUp']),
  brake:     !!(keys['s']||keys['S']||keys['ArrowDown']),
  steer:     (keys['d']||keys['D']||keys['ArrowRight']?1:0)-(keys['a']||keys['A']||keys['ArrowLeft']?1:0),
  handbrake: !!(keys[' ']),
});

// ── Game state ────────────────────────────────────────────────
let appState = 'MAP_SELECT';  // MAP_SELECT | MISSION_SELECT | DRIVING | PAUSED
let selMap = 0, selMission = null, activeMission = null;
let missionPhase = null, missionTimer = 0;
let totalMoney = 5000;
let completedIds = new Set();
let gearMode = 'auto', manualGear = 1, cruiseSpeed = 0, steerSens = 1.0;
let scene, r3d, camera, camSys, dayNight, weather;
let world, truck3d, physics, traffic, peds;
let hud, audio, gameMenu;
let pickupMarker3D = null, deliveryMarker3D = null;
let roadPoints = [];
let autoSaveTimer = 0;
let fpsT = 0, fpsC = 0, fpsVal = 0;

// ── Bootstrap ─────────────────────────────────────────────────
async function init() {
  const canvas = document.getElementById('c');
  scene  = new THREE.Scene();
  r3d    = new Renderer3D(canvas);
  camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.5, 9000);
  r3d.onResize((W,H) => { camera.aspect=W/H; camera.updateProjectionMatrix(); });

  hud      = new HUD3D();
  gameMenu = new GameMenu3D();
  audio    = new AudioSystem3D();

  // Audio: init on first click/key
  const _ai = () => { audio.init(); setTimeout(()=>audio.startMusic('desert'),500); ['click','keydown'].forEach(e=>document.removeEventListener(e,_ai)); };
  ['click','keydown'].forEach(e=>document.addEventListener(e,_ai));

  // GameMenu callbacks
  gameMenu.on('cameraMode', idx=>{if(camSys){const M=[CAM_MODE.THIRD_PERSON,CAM_MODE.COCKPIT,CAM_MODE.HOOD,CAM_MODE.CINEMATIC];camSys.mode=M[idx-1]||M[0];}});
  gameMenu.on('camDist',    v=>{if(camSys)camSys.ARM_LENGTH=v;});
  gameMenu.on('camHeight',  v=>{if(camSys)camSys.ARM_HEIGHT=v;});
  gameMenu.on('camLag',     v=>{if(camSys)camSys.POS_LAG=v;});
  gameMenu.on('steerSens',  v=>{steerSens=v;});
  gameMenu.on('gearMode',   m=>{gearMode=m;});
  gameMenu.on('musicVol',   v=>{if(audio._musicGain)audio._musicGain.gain.setTargetAtTime(v,audio._ctx?.currentTime||0,.2);});
  gameMenu.on('mute',       ()=>audio.setMuted(!audio.muted));
  gameMenu.on('close',      ()=>{if(appState==='PAUSED'){appState='DRIVING';}});

  buildUI_MapSelect();
  requestAnimationFrame(gameLoop);
}

// ── Build 3D world from map config ─────────────────────────────
function buildWorld(mapIdx) {
  // Dispose old
  if(truck3d){truck3d.dispose();truck3d=null;}
  if(traffic){traffic.dispose();traffic=null;}
  if(peds){peds.dispose();peds=null;}
  remove3DMarkers();
  while(scene.children.length){const o=scene.children[0];scene.remove(o);if(o.geometry)o.geometry.dispose();}

  const map = MAPS[mapIdx]||MAPS[0];
  scene.fog = new THREE.FogExp2(map.fogColor, map.fogDensity);

  world    = new World3D(scene, map);
  world.build();

  dayNight = new DayNightCycle(scene);
  dayNight.timeOfDay = map.timeOfDay||0.4;

  weather  = new WeatherSystem3D(scene);
  if(map.weather && map.weather!=='clear') weather.forceWeather(map.weather.toUpperCase());

  physics  = new TruckPhysics3D(world);
  truck3d  = new Truck3D(scene,'#E74C3C');
  camSys   = new CameraSystem3D(camera);
  camSys.ARM_LENGTH = gameMenu.settings.cameraDistance;
  camSys.ARM_HEIGHT = gameMenu.settings.cameraHeight;
  camSys.POS_LAG    = gameMenu.settings.cameraLag;
  camSys.snapTo(physics.position);

  traffic  = new TrafficSystem3D(scene, world, map);
  peds     = new PedestrianSystem3D(scene, world.roadCurve);
  roadPoints = world.roadCurve.getPoints(150);

  // Music per region
  const themeMap = {karachi_coast:'coastal',sindh_desert:'desert',multan_plains:'desert',lahore_urban:'city',islamabad_hills:'mountain',peshawar_mountain:'mountain',quetta_rocky:'desert',gawadar_coast:'coastal',industrial_zone:'industrial',lahore_night:'night'};
  audio.stopMusic();
  if(audio.ready) audio.startMusic(themeMap[map.id]||'desert');

  updateWeatherUI();
}

// ── 3D Mission Beacons ────────────────────────────────────────
function create3DMarker(pos, color) {
  const g = new THREE.Group();
  // Vertical beam
  const beamGeo = new THREE.CylinderGeometry(0.6, 2.0, 25, 12, 1, true);
  const beamMat = new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:2.5, transparent:true, opacity:0.55, side:THREE.DoubleSide });
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.y=12.5; g.add(beam);
  // Pulsing ring
  const ringGeo = new THREE.TorusGeometry(5, 0.5, 8, 32);
  const ringMat = new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:3 });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x=-Math.PI/2; ring.position.y=0.5; g.add(ring);
  // Inner ground disc
  const discGeo = new THREE.CircleGeometry(5, 32);
  const discMat = new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:1.5, transparent:true, opacity:0.3 });
  const disc = new THREE.Mesh(discGeo, discMat); disc.rotation.x=-Math.PI/2; disc.position.y=0.1; g.add(disc);
  // Point light
  const light = new THREE.PointLight(color, 3, 40); light.position.y=10; g.add(light);

  g.position.copy(pos);
  scene.add(g);
  g._ring = ring; g._beam = beam; g._light = light;
  return g;
}

function animate3DMarkers(t) {
  const pulse = (Math.sin(t*3)+1)*0.5;
  for(const m of [pickupMarker3D, deliveryMarker3D]) {
    if(!m) continue;
    if(m._ring) { m._ring.scale.setScalar(0.9+pulse*0.2); m._ring.rotation.z=t*0.8; }
    if(m._beam) m._beam.material.opacity = 0.35 + pulse * 0.35;
    if(m._light) m._light.intensity = 2 + pulse * 2;
  }
}

function remove3DMarkers() {
  for(const m of [pickupMarker3D, deliveryMarker3D]) {
    if(m) { scene.remove(m); m.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}}); }
  }
  pickupMarker3D = null; deliveryMarker3D = null;
}

// ── UI ────────────────────────────────────────────────────────
let uiOverlay = null;

function makeOverlay(html) {
  if(uiOverlay) uiOverlay.remove();
  uiOverlay = document.createElement('div');
  uiOverlay.style.cssText = 'position:fixed;inset:0;z-index:200;overflow-y:auto;background:rgba(0,0,0,0.92);font-family:"Segoe UI",Arial,sans-serif;';
  uiOverlay.innerHTML = html;
  document.body.appendChild(uiOverlay);
  return uiOverlay;
}

// ── MAP SELECT ────────────────────────────────────────────────
function buildUI_MapSelect() {
  const cards = MAPS.map((m,i) => `
    <div onclick="window._selectMap(${i})" style="
      background:${selMap===i?'#1E2D40':'#161b22'}; border:2px solid ${selMap===i?'#FFD700':'#333'};
      border-radius:12px; padding:16px; cursor:pointer; text-align:center;
    " onmouseover="this.style.borderColor='#3498DB'" onmouseout="this.style.borderColor='${selMap===i?'#FFD700':'#333'}'">
      <div style="font-size:30px;margin-bottom:6px">${m.thumbnail}</div>
      <div style="color:#FFD700;font-weight:bold;font-size:12px;margin-bottom:4px">${m.name}</div>
      <div style="color:#888;font-size:10px;line-height:1.4">${m.subtitle}</div>
      <div style="color:#555;font-size:9px;margin-top:6px">Traffic ×${m.trafficDensity} · Lv${m.unlockLevel}</div>
    </div>`).join('');

  makeOverlay(`
    <div style="max-width:1000px;margin:0 auto;padding:30px 20px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="color:#FFD700;font-size:28px;font-weight:900">🗺 SELECT MAP</div>
        <div style="color:#888;font-size:13px;margin-top:5px">10 unique Pakistan routes · 9,600+ metres each · Two-way traffic</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px">${cards}</div>
      <div style="text-align:center">
        <button onclick="window._goMissions()" style="padding:13px 44px;background:#C0392B;border:none;color:#FFF;font-size:17px;font-weight:bold;border-radius:9px;cursor:pointer">
          ▶ SELECT MISSION →
        </button>
        <div style="color:#444;font-size:12px;margin-top:10px">💰 $${totalMoney.toLocaleString()} · ✅ ${completedIds.size}/40 missions complete</div>
        <div style="color:#555;font-size:11px;margin-top:6px">
          Controls: <b style="color:#888">WASD</b> drive · <b style="color:#888">F</b> refuel · <b style="color:#888">R</b> repair · <b style="color:#888">H</b> horn · <b style="color:#888">Z</b> weather · <b style="color:#888">1-4</b> camera · <b style="color:#888">TAB</b> settings
        </div>
      </div>
    </div>
  `);
  window._selectMap = i => { selMap=i; buildUI_MapSelect(); };
  window._goMissions = () => buildUI_MissionSelect();
}

// ── MISSION SELECT ────────────────────────────────────────────
function buildUI_MissionSelect() {
  const mapMissions = ALL_MISSIONS.filter(m => m.mapId === MAPS[selMap].id);
  const cards = mapMissions.map(m => {
    const done = completedIds.has(m.id);
    return `
      <div onclick="window._selectMission(${m.id})" style="
        background:${selMission?.id===m.id?'#1E2D40':'#161b22'};
        border:2px solid ${done?'#2ECC71':selMission?.id===m.id?'#FFD700':'#333'};
        border-radius:10px;padding:12px 14px;cursor:pointer;position:relative;
      ">
        ${done?'<div style="position:absolute;top:7px;right:9px;color:#2ECC71;font-size:13px">✓</div>':''}
        <div style="color:#FFD700;font-weight:bold;font-size:12px">${m.name}</div>
        <div style="color:${m.col||'#888'};font-size:10px;margin:3px 0">${m.cargo}</div>
        <div style="color:#555;font-size:9px">${m.from} → ${m.to}</div>
        <div style="display:flex;justify-content:space-between;margin-top:7px;align-items:center">
          <span style="color:#2ECC71;font-weight:bold;font-size:13px">$${m.reward.toLocaleString()}</span>
          <span style="color:${m.diff==='Expert'?'#9B59B6':m.diff==='Hard'?'#E74C3C':m.diff==='Normal'?'#F39C12':'#2ECC71'};font-size:10px">${m.diff}</span>
          ${m.timeLim?`<span style="color:#FF6B35;font-size:9px">⏱${m.timeLim}s</span>`:''}
        </div>
      </div>`;
  }).join('');

  makeOverlay(`
    <div style="max-width:900px;margin:0 auto;padding:28px 20px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
        <button onclick="window._backMap()" style="padding:7px 16px;background:#1a2030;border:1px solid #333;color:#888;border-radius:7px;cursor:pointer;font-size:12px">← Maps</button>
        <div>
          <div style="color:#FFD700;font-size:20px;font-weight:bold">${MAPS[selMap].thumbnail} ${MAPS[selMap].name}</div>
          <div style="color:#666;font-size:11px">${MAPS[selMap].subtitle}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:10px;margin-bottom:20px">${cards}</div>
      <div style="text-align:center">
        <button onclick="window._startMission()" style="
          padding:12px 40px;background:${selMission?'#C0392B':'#333'};
          border:none;color:${selMission?'#FFF':'#666'};font-size:16px;font-weight:bold;
          border-radius:8px;cursor:${selMission?'pointer':'not-allowed'};
        ">${selMission?'▶ START MISSION':'← Select a Mission'}</button>
      </div>
    </div>
  `);
  window._selectMission = id => { selMission=ALL_MISSIONS.find(m=>m.id===id); buildUI_MissionSelect(); };
  window._backMap       = () => buildUI_MapSelect();
  window._startMission  = () => { if(selMission) startDriving(); };
}

// ── START DRIVING ─────────────────────────────────────────────
function startDriving() {
  if(uiOverlay){uiOverlay.remove();uiOverlay=null;}

  // Show loading screen BEFORE building (buildWorld can take ~100–200ms)
  const loadEl = document.createElement('div');
  loadEl.style.cssText = `
    position:fixed;inset:0;background:#000011;z-index:300;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
    font-family:'Segoe UI',Arial,sans-serif;
  `;
  loadEl.innerHTML = `
    <style>@keyframes sp{to{transform:rotate(360deg)}}</style>
    <div style="width:52px;height:52px;border:4px solid rgba(255,215,0,.2);border-top-color:#FFD700;border-radius:50%;animation:sp .85s linear infinite"></div>
    <div style="color:#FFD700;font-size:22px;font-weight:bold">Building 3D World…</div>
    <div style="color:#555;font-size:12px">${MAPS[selMap]?.thumbnail || ''} ${MAPS[selMap]?.name || ''}</div>
  `;
  document.body.appendChild(loadEl);

  // Use setTimeout(0) so the browser renders the loading screen first
  setTimeout(() => {
    try {
      buildWorld(selMap);
    } catch(err) {
      console.error('[3D Build Error]', err);
      loadEl.innerHTML = `
        <div style="color:#E74C3C;font-size:20px;font-weight:bold">⚠ Failed to build world</div>
        <div style="color:#888;font-size:14px">${err.message}</div>
        <button onclick="buildUI_MapSelect()" style="margin-top:12px;padding:10px 24px;background:#C0392B;border:none;color:#FFF;border-radius:8px;cursor:pointer;font-size:15px">← Back to Maps</button>
      `;
      return;
    }

    loadEl.remove();

    activeMission  = selMission;
    missionPhase   = 'pickup';
    missionTimer   = activeMission.timeLim || 0;

    // Place 3D markers near road endpoints
    const pPickup  = world.roadCurve.getPoint(0.04);
    const pDeliver = world.roadCurve.getPoint(0.93);
    activeMission._pickup3D   = pPickup.clone();
    activeMission._deliver3D  = pDeliver.clone();

    pickupMarker3D   = create3DMarker(pPickup,   0x00FF66);
    deliveryMarker3D = create3DMarker(pDeliver,  0xFF4422);

    appState = 'DRIVING';   // set AFTER world is built successfully

    updateWeatherUI();
    showCameraUI();
    hud.notify(`📦 ${activeMission.name}  ·  Drive to the GREEN beacon!`, '#FFD700', 5000);
    audio.startEngine();
    setTimeout(()=>hud.notify('W=Drive · Z=Weather · 1-4=Camera · TAB=Settings','#3498DB',4000), 5500);
  }, 60); // 60ms: enough for one repaint
}

// ── MISSION COMPLETE ──────────────────────────────────────────
function endMission(success) {
  const reward = success ? activeMission.reward : Math.round(activeMission.reward*0.2);
  totalMoney  += reward;
  if(success) completedIds.add(activeMission.id);
  audio.stopEngine(); audio.stopMusic();
  if(success){audio.success(); setTimeout(()=>audio.startMusic('city'),2000);}
  remove3DMarkers();
  hideCameraUI(); hideWeatherUI();

  makeOverlay(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px">
      <div style="font-size:68px">${success?'🏆':'💀'}</div>
      <div style="color:${success?'#2ECC71':'#E74C3C'};font-size:30px;font-weight:bold">${success?'DELIVERY COMPLETE!':'MISSION FAILED'}</div>
      <div style="color:#FFD700;font-size:24px;font-weight:bold">+$${reward.toLocaleString()}</div>
      <div style="color:#888;font-size:14px">${activeMission.name}</div>
      <div style="color:#555;font-size:12px">Balance: $${totalMoney.toLocaleString()} · ${completedIds.size}/40 missions done</div>
      <div style="display:flex;gap:12px;margin-top:10px">
        <button onclick="window._nextM()" style="padding:11px 28px;background:#C0392B;border:none;color:#FFF;font-size:15px;font-weight:bold;border-radius:8px;cursor:pointer">🚚 Next Mission</button>
        <button onclick="window._toMaps()" style="padding:11px 28px;background:#1a2030;border:1px solid #444;color:#AAA;font-size:15px;border-radius:8px;cursor:pointer">🗺 Change Map</button>
      </div>
    </div>
  `);
  window._nextM  = ()=>{ selMission=null; buildUI_MissionSelect(); };
  window._toMaps = ()=>buildUI_MapSelect();
  activeMission=null; appState='IDLE';
}

// ── PAUSE ─────────────────────────────────────────────────────
function togglePause() {
  if(appState==='DRIVING'){appState='PAUSED';gameMenu.open();}
  else if(appState==='PAUSED'){appState='DRIVING';gameMenu.close();}
}

// ── Weather UI overlay ─────────────────────────────────────────
function updateWeatherUI() {
  const el=document.getElementById('weatherBar3d');
  if(!el||!weather) return;
  el.textContent=weather.displayName;
  el.style.display='block';
}
function hideWeatherUI(){const el=document.getElementById('weatherBar3d'); if(el) el.style.display='none';}

function cycleWeather() {
  if(!weather) return;
  const order=['SUNNY','CLOUDY','RAIN','FOG','STORM'];
  const cur=order.findIndex(w=>w.toLowerCase()===weather.current.toLowerCase());
  const next=order[(cur+1)%order.length];
  weather.forceWeather(next);
  updateWeatherUI();
  hud.notify(`🌤 Weather: ${weather.displayName}`, '#7EC8E3', 2500);
}

// ── Camera mode UI ─────────────────────────────────────────────
function showCameraUI(){const el=document.getElementById('camUI3d'); if(el) el.style.display='flex';}
function hideCameraUI(){const el=document.getElementById('camUI3d'); if(el) el.style.display='none';}
function updateCamUI() {
  const el=document.getElementById('camUI3d');
  if(!el||!camSys) return;
  const modes=['Chase','Cockpit','Hood','Cinematic'];
  const labels=['1️⃣','2️⃣','3️⃣','4️⃣'];
  const modeKeys=[CAM_MODE.THIRD_PERSON,CAM_MODE.COCKPIT,CAM_MODE.HOOD,CAM_MODE.CINEMATIC];
  el.querySelectorAll('.camBtn3d').forEach((b,i)=>{
    b.style.background = modeKeys[i]===camSys.mode?'rgba(255,215,0,0.7)':'rgba(0,0,0,0.55)';
    b.style.color      = modeKeys[i]===camSys.mode?'#000':'#AAA';
  });
}

// ── MAIN LOOP ──────────────────────────────────────────────────
let lastTime = performance.now();
function gameLoop(ts) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min((ts-lastTime)/1000, 0.05);
  lastTime = ts;

  // FPS
  fpsC++; fpsT+=dt;
  if(fpsT>=1){fpsVal=Math.round(fpsC/fpsT);fpsC=0;fpsT=0;}

  // ── Per-frame key events ───────────────────────────────────
  if(justDown['Tab'])    { if(appState==='DRIVING'||appState==='PAUSED') togglePause(); }
  if(justDown['Escape']) { if(appState==='DRIVING') togglePause(); else if(appState==='PAUSED'&&!gameMenu.isOpen){appState='DRIVING';} }
  if(justDown['h']||justDown['H']) audio.horn();
  if(justDown['z']||justDown['Z']) cycleWeather();
  if(justDown['1']) { if(camSys){camSys.mode=CAM_MODE.THIRD_PERSON; updateCamUI(); hud.notify('📷 Chase Camera','#3498DB',1200);} }
  if(justDown['2']) { if(camSys){camSys.mode=CAM_MODE.COCKPIT;      updateCamUI(); hud.notify('📷 Cockpit View','#3498DB',1200);} }
  if(justDown['3']) { if(camSys){camSys.mode=CAM_MODE.HOOD;         updateCamUI(); hud.notify('📷 Hood Camera','#3498DB',1200);} }
  if(justDown['4']) { if(camSys){camSys.mode=CAM_MODE.CINEMATIC;    updateCamUI(); hud.notify('📷 Cinematic','#3498DB',1200);} }
  if(justDown['c']||justDown['C']) {
    cruiseSpeed = cruiseSpeed>0 ? 0 : Math.max(0,physics?.speedKmh||0);
    gameMenu.updateCruise(cruiseSpeed);
    hud?.notify(cruiseSpeed>0?`🚗 Cruise ON @ ${Math.round(cruiseSpeed)} km/h`:'🚗 Cruise OFF','#F39C12',2000);
  }
  if(gearMode==='manual'&&physics){
    if(justDown['q']||justDown['Q']) { if(physics.gear>1){physics.gear--;hud?.notify(`Gear ${physics.gear}`,'#3498DB',700);} }
    if(justDown['e']||justDown['E']) { if(physics.gear<4){physics.gear++;hud?.notify(`Gear ${physics.gear}`,'#3498DB',700);} }
  }
  // Refuel / repair at station
  if((justDown['f']||justDown['F'])&&appState==='DRIVING'&&physics&&world){
    let near=false; for(const sp of world.fuelStationPositions){if(physics.position.distanceTo(sp)<24){near=true;break;}}
    if(near){const c=Math.ceil((physics.maxFuel-physics.fuel)*2); if(totalMoney>=c){totalMoney-=c;physics.refuel();hud.notify(`⛽ Refueled! -$${c}`,'#F39C12',2500);audio.refuel();} else hud.notify('Not enough money!','#E74C3C',2000);}
    else hud.notify('Get closer to a fuel station first!','#E74C3C',2000);
  }
  if((justDown['r']||justDown['R'])&&appState==='DRIVING'&&physics&&world){
    let near=false; for(const sp of world.fuelStationPositions){if(physics.position.distanceTo(sp)<24){near=true;break;}}
    if(near){const c=Math.round((100-physics.health)*5); if(c>0&&totalMoney>=c){totalMoney-=c;physics.repair();hud.notify(`🔧 Repaired! -$${c}`,'#2ECC71',2500);} }
  }
  // Clear just-down
  for(const k in justDown) delete justDown[k];

  // ── DRIVING UPDATE ─────────────────────────────────────────
  if(appState==='DRIVING' && physics && world && !gameMenu.isOpen) {
    const i = inp();
    let aAccel=i.accel, aBrake=i.brake;
    // Cruise control
    if(cruiseSpeed>0&&!i.brake&&!i.handbrake){
      const kph=physics.speedKmh;
      if(kph<cruiseSpeed-2) aAccel=true; else if(kph>cruiseSpeed+2) aBrake=true; else {aAccel=false;aBrake=false;}
    }
    if(i.brake) cruiseSpeed=0;

    physics.update(dt, aAccel, aBrake, i.steer*steerSens, i.handbrake);

    // Weather traction
    const wt=weather?.tractionMultiplier||1; if(wt<1) physics.speed*=(1-(1-wt)*dt*5);

    truck3d.update(physics);
    traffic.update(dt, dayNight?.timeOfDay||0.4);
    peds.update(dt, physics.position);

    const dmg=traffic.checkCollisions(physics);
    if(dmg>0){audio.collision(Math.min(dmg/40,1));hud.notify(`💥 Collision! -${dmg} HP`,'#E74C3C',2000);}

    camSys.update(physics, dt);
    dayNight?.update(dt, camera.position);
    dayNight?.updateShadowCamera(camera.position);
    weather?.update(dt, camera.position);

    const isNight=(dayNight?.timeOfDay||0)>0.78||(dayNight?.timeOfDay||0)<0.18;
    truck3d.setHeadlights(isNight);

    audio.updateEngine(physics.speedAbs, physics.MAX_SPEED);
    if(weather?.rainIntensity>0.12){audio.startRain(weather.rainIntensity);} else {audio.stopRain();}

    // Station proximity label
    let nearStation=false;
    for(const sp of world.fuelStationPositions){if(physics.position.distanceTo(sp)<24){nearStation=true;break;}}
    const sl=document.getElementById('stationLabel3d');
    if(sl) sl.style.display=nearStation?'block':'none';

    // Mission logic
    if(activeMission){
      if(activeMission.timeLim){
        missionTimer-=dt;
        if(missionTimer<=0){hud.notify('⏰ Time up! Partial reward.','#E74C3C',3000);endMission(false);return;}
      }
      if(missionPhase==='pickup'){
        const d=physics.position.distanceTo(activeMission._pickup3D||new THREE.Vector3(0,0,-4700));
        if(d<20){
          missionPhase='delivery';
          truck3d.showCargo(activeMission.cCol||0xE67E22);
          if(pickupMarker3D){scene.remove(pickupMarker3D);pickupMarker3D=null;}
          hud.notify('📦 Cargo loaded!  Drive to RED beacon!','#2ECC71',4000);
          audio.refuel();
        }
      } else if(missionPhase==='delivery'){
        const d=physics.position.distanceTo(activeMission._deliver3D||new THREE.Vector3(0,0,4700));
        if(d<20){truck3d.showCargo(null);endMission(true);return;}
      }
      if(physics.fuel<=0&&physics.speedAbs<.3){endMission(false);return;}
      if(physics.health<=0){endMission(false);return;}
    }

    animate3DMarkers(ts/1000);

    autoSaveTimer+=dt;
    if(autoSaveTimer>=60){autoSaveTimer=0;try{localStorage.setItem('ml3d_save',JSON.stringify({money:totalMoney,done:[...completedIds]}));}catch(_){}}
  }

  // ── RENDER ────────────────────────────────────────────────
  if(world&&appState!=='IDLE'){
    // Build a mission-proxy that matches what HUD3D._missionPanel expects
    const mData = activeMission ? {
      active: {
        name:         activeMission.name,
        cargo:        { type: activeMission.cargo, color: activeMission.col || '#888' },
        fromCityDef:  { name: activeMission.from },
        toCityDef:    { name: activeMission.to   },
        def:          { baseReward: activeMission.reward },
        timeBonusAmt: 0,
      },
      phase:         missionPhase,
      timeRemaining: missionTimer,
      hasTimeLimit:  !!activeMission.timeLim,
      pickupPos:     activeMission._pickup3D  ? { x: activeMission._pickup3D.x,  y: activeMission._pickup3D.z  } : null,
      deliveryPos:   activeMission._deliver3D ? { x: activeMission._deliver3D.x, y: activeMission._deliver3D.z } : null,
    } : { active:null, phase:null, timeRemaining:0, hasTimeLimit:false, pickupPos:null, deliveryPos:null };

    hud.render(physics, mData, weather, camSys?.mode, roadPoints, dayNight?.timeOfDay||0.4);

    const fEl=document.getElementById('fpsOverlay3d');
    if(fEl&&gameMenu.settings.showFPS) fEl.textContent=`${fpsVal} FPS`;

    r3d.render(scene, camera);
  }
}

// ── Static HTML overlays ───────────────────────────────────────
function buildStaticOverlays() {
  // Fuel station label
  const sl=document.createElement('div');
  sl.id='stationLabel3d';
  sl.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.88);border:2px solid #F39C12;border-radius:12px;padding:10px 24px;color:#F39C12;font-size:15px;font-weight:bold;display:none;z-index:15;pointer-events:none;';
  sl.innerHTML='⛽ <b>F</b> = Refuel &nbsp; | &nbsp; <b>R</b> = Repair';
  document.body.appendChild(sl);

  // FPS
  const fe=document.createElement('div');
  fe.id='fpsOverlay3d';
  fe.style.cssText='position:fixed;top:18px;left:50%;transform:translateX(-50%);color:#FFD700;font-size:11px;font-family:monospace;pointer-events:none;z-index:12;';
  document.body.appendChild(fe);

  // Weather badge
  const wb=document.createElement('div');
  wb.id='weatherBar3d';
  wb.style.cssText='position:fixed;top:18px;left:16px;background:rgba(0,0,10,0.78);border:1px solid #3498DB;border-radius:8px;padding:5px 14px;color:#7EC8E3;font-size:13px;font-weight:bold;display:none;z-index:12;cursor:pointer;';
  wb.title='Press Z to change weather';
  wb.onclick=cycleWeather;
  document.body.appendChild(wb);

  // Camera mode bar
  const cb=document.createElement('div');
  cb.id='camUI3d';
  cb.style.cssText='position:fixed;top:18px;right:16px;display:none;gap:6px;z-index:12;';
  ['Chase','Cockpit','Hood','Cine'].forEach((lbl,i)=>{
    const b=document.createElement('button');
    b.className='camBtn3d';
    b.textContent=`${i+1} ${lbl}`;
    b.style.cssText='padding:5px 10px;background:rgba(0,0,0,0.55);border:1px solid #444;color:#AAA;border-radius:6px;cursor:pointer;font-size:11px;';
    b.onclick=()=>{ const M=[CAM_MODE.THIRD_PERSON,CAM_MODE.COCKPIT,CAM_MODE.HOOD,CAM_MODE.CINEMATIC]; if(camSys)camSys.mode=M[i]; updateCamUI(); };
    cb.appendChild(b);
  });
  document.body.appendChild(cb);
}

// ── Load save & launch ─────────────────────────────────────────
try {
  const s=JSON.parse(localStorage.getItem('ml3d_save')||'{}');
  totalMoney=s.money||5000;
  completedIds=new Set(s.done||[]);
} catch(_) {}

buildStaticOverlays();
init().catch(console.error);
