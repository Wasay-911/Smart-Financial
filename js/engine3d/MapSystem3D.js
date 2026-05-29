// js/engine3d/MapSystem3D.js – 10 maps with long routes (z: -4800 → +4800 = 9600 world units)

import * as THREE from 'three';

export const MAPS = [
  {
    id: 'karachi_coast', name: 'Karachi Coastal Highway', subtitle: 'Arabian Sea shoreline · Fast & flat', thumbnail: '🌊', unlockLevel:1,
    timeOfDay:0.40, weather:'clear',
    terrain:{ noiseScale:0.0003, heightScale:5, flatness:0.88 },
    fogColor:0xC9B896, fogDensity:0.00055, skyTop:0x4A90D9, skyBot:0xC9B896, groundTint:'#C9AA7C',
    hasSea:true, seaZ:3500, hasMountains:false,
    roadWaypoints:[
      {x:  0,y:0.3,z:-4800},{x: 40,y:0.3,z:-3900},{x:100,y:0.3,z:-3000},
      {x: 70,y:0.3,z:-2000},{x:-50,y:0.3,z:-1000},{x:-80,y:0.3,z:   0},
      {x: 40,y:0.3,z: 1000},{x:100,y:0.3,z: 2000},{x: 60,y:0.3,z: 3000},
      {x:-20,y:0.3,z: 4000},{x: 10,y:0.3,z: 4800},
    ],
    cities:['Karachi','Port Qasim'], trafficDensity:1.2,
  },
  {
    id: 'sindh_desert', name: 'Sindh Desert Highway', subtitle: 'Scorching desert · Dust storms ahead', thumbnail: '🌵', unlockLevel:1,
    timeOfDay:0.50, weather:'dust',
    terrain:{ noiseScale:0.0003, heightScale:12, flatness:0.68 },
    fogColor:0xD4A060, fogDensity:0.0010, skyTop:0x3388BB, skyBot:0xD4A060, groundTint:'#C4903A',
    hasSea:false, hasMountains:false,
    roadWaypoints:[
      {x: 10,y:0.3,z:-4800},{x: 80,y:0.6,z:-3800},{x:160,y:0.9,z:-2800},
      {x:100,y:0.7,z:-1800},{x:-60,y:0.5,z: -800},{x:-130,y:0.6,z:  200},
      {x:-80,y:0.5,z: 1200},{x: 30,y:0.4,z: 2200},{x: 90,y:0.4,z: 3200},
      {x: 20,y:0.3,z: 4200},{x: 10,y:0.3,z: 4800},
    ],
    cities:['Hyderabad','Sukkur'], trafficDensity:0.7,
  },
  {
    id: 'multan_plains', name: 'Multan Agricultural Belt', subtitle: 'Green Punjab fields · Mango season', thumbnail: '🌾', unlockLevel:2,
    timeOfDay:0.35, weather:'cloudy',
    terrain:{ noiseScale:0.0005, heightScale:7, flatness:0.78 },
    fogColor:0xA8C068, fogDensity:0.0006, skyTop:0x7AB0D8, skyBot:0xA8C068, groundTint:'#8BAD5A',
    hasSea:false, hasMountains:false,
    roadWaypoints:[
      {x:-20,y:0.3,z:-4800},{x:-70,y:0.4,z:-3800},{x:-120,y:0.5,z:-2700},
      {x:-70,y:0.4,z:-1600},{x: 30,y:0.3,z: -600},{x: 90,y:0.4,z:  500},
      {x: 70,y:0.4,z: 1600},{x: 20,y:0.4,z: 2700},{x:-40,y:0.3,z: 3800},
      {x: 10,y:0.3,z: 4500},{x:  0,y:0.3,z: 4800},
    ],
    cities:['Multan','Bahawalpur'], trafficDensity:0.9,
  },
  {
    id: 'lahore_urban', name: 'Lahore Grand Trunk Road', subtitle: 'Historic GT Road · Dense city traffic', thumbnail: '🏙', unlockLevel:3,
    timeOfDay:0.42, weather:'clear',
    terrain:{ noiseScale:0.0004, heightScale:4, flatness:0.92 },
    fogColor:0xBBBBA0, fogDensity:0.0009, skyTop:0x6699CC, skyBot:0xBBBBA0, groundTint:'#888870',
    hasSea:false, hasMountains:false, hasTrafficLights:true,
    roadWaypoints:[
      {x: 0,y:0.3,z:-4800},{x: 25,y:0.3,z:-3900},{x: 65,y:0.3,z:-3000},
      {x: 40,y:0.3,z:-2000},{x:-25,y:0.3,z:-1000},{x:-45,y:0.3,z:    0},
      {x:-25,y:0.3,z: 1000},{x: 35,y:0.3,z: 2000},{x: 55,y:0.3,z: 3000},
      {x: 20,y:0.3,z: 4000},{x: 10,y:0.3,z: 4800},
    ],
    cities:['Lahore','Gujranwala'], trafficDensity:2.0,
  },
  {
    id: 'islamabad_hills', name: 'Islamabad Capital Route', subtitle: 'Margalla foothills · Winding roads', thumbnail: '🏛', unlockLevel:4,
    timeOfDay:0.38, weather:'cloudy',
    terrain:{ noiseScale:0.0006, heightScale:24, flatness:0.38 },
    fogColor:0x9AB88A, fogDensity:0.0010, skyTop:0x5588BB, skyBot:0x9AB88A, groundTint:'#6A9850',
    hasSea:false, hasMountains:true, mountainZ:-1200,
    roadWaypoints:[
      {x:  0,y:0.3,z:-4800},{x: 70,y:2.0,z:-3800},{x:140,y:4.5,z:-2800},
      {x:100,y:6.0,z:-1800},{x:-50,y:4.0,z: -800},{x:-120,y:2.5,z:  200},
      {x:-90,y:2.0,z: 1200},{x: 30,y:1.0,z: 2200},{x: 80,y:0.6,z: 3200},
      {x: 20,y:0.4,z: 4200},{x: 10,y:0.3,z: 4800},
    ],
    cities:['Islamabad','Rawalpindi'], trafficDensity:1.0,
  },
  {
    id: 'peshawar_mountain', name: 'Peshawar Mountain Pass', subtitle: 'Khyber Pass · High altitude switchbacks', thumbnail: '⛰', unlockLevel:5,
    timeOfDay:0.32, weather:'cloudy',
    terrain:{ noiseScale:0.0008, heightScale:38, flatness:0.18 },
    fogColor:0x889988, fogDensity:0.0014, skyTop:0x3A5A78, skyBot:0x889988, groundTint:'#607050',
    hasSea:false, hasMountains:true, mountainZ:-600,
    roadWaypoints:[
      {x:  0,y:0.5,z:-4800},{x: 50,y:3.0,z:-3900},{x:120,y:8.0,z:-2900},
      {x: 80,y:13., z:-1900},{x:-90,y:9.5,z: -900},{x:-140,y:5.5,z:  100},
      {x:-90,y:2.5,z: 1100},{x: 40,y:0.7,z: 2100},{x: 80,y:0.4,z: 3200},
      {x: 20,y:0.3,z: 4200},{x: 10,y:0.3,z: 4800},
    ],
    cities:['Peshawar','Khyber'], trafficDensity:0.5,
  },
  {
    id: 'quetta_rocky', name: 'Quetta Rocky Desert', subtitle: 'Balochistan plateau · Desolate & rugged', thumbnail: '🪨', unlockLevel:5,
    timeOfDay:0.48, weather:'dust',
    terrain:{ noiseScale:0.0004, heightScale:20, flatness:0.42 },
    fogColor:0xBB9966, fogDensity:0.0012, skyTop:0x5599AA, skyBot:0xBB9966, groundTint:'#9A7050',
    hasSea:false, hasMountains:true, mountainZ:-900,
    roadWaypoints:[
      {x:  0,y:1.0,z:-4800},{x: 70,y:3.0,z:-3800},{x:140,y:6.5,z:-2700},
      {x: 90,y:9.0,z:-1700},{x:-70,y:7.0,z: -700},{x:-110,y:4.5,z:  300},
      {x:-70,y:2.5,z: 1300},{x: 25,y:1.0,z: 2300},{x: 70,y:0.5,z: 3300},
      {x: 20,y:0.3,z: 4200},{x: 10,y:0.3,z: 4800},
    ],
    cities:['Quetta','Mastung'], trafficDensity:0.4,
  },
  {
    id: 'gawadar_coast', name: 'Gwadar Coastal Expressway', subtitle: 'CPEC route · Arabian Sea on both sides', thumbnail: '🚢', unlockLevel:6,
    timeOfDay:0.45, weather:'clear',
    terrain:{ noiseScale:0.0002, heightScale:4, flatness:0.94 },
    fogColor:0x88BBCC, fogDensity:0.0005, skyTop:0x2277BB, skyBot:0x88BBCC, groundTint:'#B0C8A0',
    hasSea:true, seaZ:-2500,
    roadWaypoints:[
      {x:  0,y:0.3,z:-4800},{x: 35,y:0.3,z:-3900},{x: 75,y:0.3,z:-3000},
      {x: 45,y:0.3,z:-2000},{x:-25,y:0.3,z:-1000},{x:-55,y:0.3,z:    0},
      {x:-30,y:0.3,z: 1000},{x: 35,y:0.3,z: 2000},{x: 60,y:0.3,z: 3000},
      {x: 20,y:0.3,z: 4000},{x: 10,y:0.3,z: 4800},
    ],
    cities:['Gwadar','Ormara'], trafficDensity:0.7,
  },
  {
    id: 'industrial_zone', name: 'Karachi Industrial Zone', subtitle: 'Port → Factory circuit · Heavy vehicles', thumbnail: '🏭', unlockLevel:3,
    timeOfDay:0.55, weather:'cloudy',
    terrain:{ noiseScale:0.0002, heightScale:2, flatness:0.97 },
    fogColor:0x999988, fogDensity:0.0011, skyTop:0x5566AA, skyBot:0x999988, groundTint:'#7A7870',
    hasSea:false, hasMountains:false, hasFactories:true,
    roadWaypoints:[
      {x:   0,y:0.2,z:-4800},{x:120,y:0.2,z:-3800},{x:230,y:0.2,z:-2700},
      {x:210,y:0.2,z:-1700},{x: 90,y:0.2,z: -700},{x:-90,y:0.2,z:  300},
      {x:-200,y:0.2,z:1300},{x:-120,y:0.2,z:2300},{x: 40,y:0.2,z:3300},
      {x: 60,y:0.2,z: 4200},{x: 10,y:0.2,z: 4800},
    ],
    cities:['Port Terminal','Industrial Area'], trafficDensity:1.6,
  },
  {
    id: 'lahore_night', name: 'Lahore Night Run', subtitle: 'City after dark · Neon lights & nightlife', thumbnail: '🌃', unlockLevel:4,
    timeOfDay:0.82, weather:'clear',
    terrain:{ noiseScale:0.0004, heightScale:3, flatness:0.93 },
    fogColor:0x0A0A22, fogDensity:0.0008, skyTop:0x02020A, skyBot:0x0A0A22, groundTint:'#3A3838',
    hasSea:false, hasMountains:false, hasNeonLights:true,
    roadWaypoints:[
      {x: 0,y:0.3,z:-4800},{x: 25,y:0.3,z:-3900},{x: 65,y:0.3,z:-3000},
      {x: 40,y:0.3,z:-2000},{x:-25,y:0.3,z:-1000},{x:-45,y:0.3,z:    0},
      {x:-25,y:0.3,z: 1000},{x: 35,y:0.3,z: 2000},{x: 55,y:0.3,z: 3000},
      {x: 20,y:0.3,z: 4000},{x: 10,y:0.3,z: 4800},
    ],
    cities:['Lahore Night','Sheikhupura'], trafficDensity:0.9, hasNeonLights:true,
  },
];

export const DEFAULT_MAP = MAPS[0];

export class MapSystem3D {
  constructor() { this.currentMapIdx = 0; }
  get current()  { return MAPS[this.currentMapIdx]; }
  getAll()       { return MAPS; }
  select(idx)    { this.currentMapIdx = Math.max(0, Math.min(MAPS.length-1, idx)); }
  isUnlocked(mapDef, level) { return level >= (mapDef.unlockLevel || 1); }
}
