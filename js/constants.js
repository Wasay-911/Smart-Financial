// js/constants.js – Phase 10 (Phase 16 polish): Full Pakistan map

// ── World ─────────────────────────────────────────────────────
export const WORLD_W = 22000;
export const WORLD_H =  8000;
export const ROAD_W  =    80;

// ──────────────────────────────────────────────────────────────
//  N5 MAIN HIGHWAY  (Karachi → Hyderabad → Sukkur → Multan →
//                    Lahore → Islamabad → Peshawar)
// ──────────────────────────────────────────────────────────────
export const HIGHWAY = Object.freeze([
  // Karachi segment
  {x:600,  y:4200},
  {x:1300, y:4200},
  {x:2000, y:4000},
  // Hyderabad area
  {x:2800, y:4000},
  {x:3200, y:3800},
  {x:3700, y:3700},
  // Sukkur approach
  {x:4500, y:3500},
  {x:5500, y:3400},
  {x:6000, y:3200},
  // Multan approach
  {x:7200, y:3200},
  {x:8200, y:3000},
  {x:9000, y:2900},
  {x:9500, y:2900},
  // Lahore approach
  {x:10500, y:2700},
  {x:11500, y:2600},
  {x:12200, y:2500},
  {x:13000, y:2500},
  // Islamabad approach
  {x:14000, y:2300},
  {x:14800, y:2200},
  {x:15500, y:2100},
  // Peshawar approach
  {x:16200, y:2000},
  {x:17000, y:1900},
  {x:17800, y:1800},
  {x:18500, y:1800},
]);

// N25 BRANCH: junction near Sukkur → Quetta
export const HIGHWAY_N25 = Object.freeze([
  {x:5500, y:3400},   // junction with N5
  {x:5200, y:4000},
  {x:5000, y:4700},
  {x:4800, y:5400},
  {x:5000, y:6200},
  {x:5500, y:6800},   // Quetta
]);

// All highway segments combined (for distToRoad checks)
export const ALL_HIGHWAYS = Object.freeze([HIGHWAY, HIGHWAY_N25]);

// ── City definitions ──────────────────────────────────────────
export const CITIES = Object.freeze({
  KARACHI:   {x:600,  y:4200, name:'Karachi',   color:'#E74C3C', unlockLevel:1,  region:'sindh',    desc:'Financial capital & gateway port',      pop:'15M+'},
  HYDERABAD: {x:3000, y:3750, name:'Hyderabad', color:'#3498DB', unlockLevel:1,  region:'sindh',    desc:'Gateway to interior Sindh',             pop:'1.7M'},
  SUKKUR:    {x:6000, y:3200, name:'Sukkur',    color:'#E67E22', unlockLevel:3,  region:'sindh',    desc:'Indus River crossing point',            pop:'500K'},
  MULTAN:    {x:9500, y:2900, name:'Multan',    color:'#27AE60', unlockLevel:5,  region:'punjab',   desc:'City of Saints, south Punjab',          pop:'1.9M'},
  LAHORE:    {x:13000,y:2500, name:'Lahore',    color:'#9B59B6', unlockLevel:8,  region:'punjab',   desc:'Cultural heart of Pakistan',            pop:'11M'},
  ISLAMABAD: {x:15500,y:2100, name:'Islamabad', color:'#1ABC9C', unlockLevel:10, region:'capital',  desc:'Capital city, nestled in the hills',    pop:'1M'},
  PESHAWAR:  {x:18500,y:1800, name:'Peshawar',  color:'#F39C12', unlockLevel:12, region:'kpk',      desc:'Gateway to the Khyber Pass',            pop:'1.9M'},
  QUETTA:    {x:5500, y:6800, name:'Quetta',    color:'#E74C3C', unlockLevel:7,  region:'balochistan',desc:'Fruit garden of Pakistan',           pop:'1M'},
});

// City ordered list for display
export const CITY_ORDER = ['KARACHI','HYDERABAD','SUKKUR','MULTAN','LAHORE','ISLAMABAD','PESHAWAR','QUETTA'];

// City warehouse positions (pickup / delivery point)
export const CITY_WAREHOUSES = Object.freeze({
  KARACHI:   {x:780,  y:4100},
  HYDERABAD: {x:2850, y:3650},
  SUKKUR:    {x:5900, y:3100},
  MULTAN:    {x:9350, y:2780},
  LAHORE:    {x:12850,y:2380},
  ISLAMABAD: {x:15350,y:1980},
  PESHAWAR:  {x:18350,y:1680},
  QUETTA:    {x:5350, y:6680},
});

// Routes between adjacent cities (defines available direct routes)
export const ROUTES = Object.freeze([
  {from:'KARACHI',   to:'HYDERABAD', highway:'N5',  dist:2800},
  {from:'HYDERABAD', to:'SUKKUR',    highway:'N5',  dist:3000},
  {from:'SUKKUR',    to:'MULTAN',    highway:'N5',  dist:3500},
  {from:'MULTAN',    to:'LAHORE',    highway:'N5',  dist:3500},
  {from:'LAHORE',    to:'ISLAMABAD', highway:'N5',  dist:2500},
  {from:'ISLAMABAD', to:'PESHAWAR',  highway:'N5',  dist:3000},
  {from:'SUKKUR',    to:'QUETTA',    highway:'N25', dist:4000},
]);

// ── Fuel stations along all highways ─────────────────────────
export const FUEL_STATION_DEFS = Object.freeze([
  {id:'s1', x:1700,  y:4100, name:'Thatta Stop'},
  {id:'s2', x:4000,  y:3800, name:'Kotri Stop'},
  {id:'s3', x:7200,  y:3200, name:'Rohri Stop'},
  {id:'s4', x:10800, y:2700, name:'Bahawalpur Stop'},
  {id:'s5', x:14400, y:2250, name:'GT Road Stop'},
  {id:'s6', x:17200, y:1880, name:'Attock Stop'},
  {id:'s7', x:5100,  y:5200, name:'Khuzdar Stop'},   // N25 branch
]);

// ── Cargo types (8) ──────────────────────────────────────────
export const CARGO_DEFS = Object.freeze([
  {id:'food',         type:'Food',          color:'#E67E22', baseReward:800,  weight:1.0, isFragile:false, desc:'Fresh produce – deliver fresh!'},
  {id:'electronics',  type:'Electronics',   color:'#9B59B6', baseReward:1500, weight:0.8, isFragile:true,  desc:'Fragile electronics – drive carefully!'},
  {id:'construction', type:'Construction',  color:'#95A5A6', baseReward:600,  weight:1.5, isFragile:false, desc:'Heavy building materials'},
  {id:'fuel_cargo',   type:'Fuel',          color:'#F1C40F', baseReward:1100, weight:1.2, isFragile:false, desc:'Fuel tanker – hazardous goods'},
  {id:'furniture',    type:'Furniture',     color:'#8E44AD', baseReward:900,  weight:1.1, isFragile:false, desc:'Household furniture delivery'},
  {id:'medicine',     type:'Medicine',      color:'#2ECC71', baseReward:2000, weight:0.6, isFragile:true,  desc:'Medical supplies – urgent!'},
  {id:'machinery',    type:'Machinery',     color:'#E74C3C', baseReward:1300, weight:2.0, isFragile:false, desc:'Industrial machinery – very heavy'},
  {id:'luxury',       type:'Luxury Goods',  color:'#FFD700', baseReward:2500, weight:0.5, isFragile:true,  desc:'Premium goods – extreme care'},
]);

// ── Upgrades ────────────────────────────────────────────────
export const UPGRADE_DEFS = Object.freeze({
  engine:  {key:'engine',  name:'Engine',   icon:'⚙', maxLevel:3, costs:[2000,4000,8000],  descriptions:['Power +20%','Performance engine','Racing engine'],   stat:'+30 km/h per level'},
  fuelTank:{key:'fuelTank',name:'Fuel Tank',icon:'⛽',maxLevel:3, costs:[1500,3000,6000],  descriptions:['Extended capacity','Large reservoir','Max tank'],      stat:'+25 fuel per level'},
  handling:{key:'handling',name:'Handling', icon:'🔧',maxLevel:3, costs:[1000,2500,5000],  descriptions:['Better steering','Sport suspension','Racing chassis'], stat:'+15% turn per level'},
  brakes:  {key:'brakes',  name:'Brakes',   icon:'🛑',maxLevel:3, costs:[800, 2000,4000],  descriptions:['Disc brakes','Performance brakes','Carbon ceramics'], stat:'+20% braking per level'},
});

// ── Trucks ──────────────────────────────────────────────────
export const TRUCK_DEFS = Object.freeze([
  {id:'starter',  name:'Starter Rig',        desc:'The reliable workhorse',                price:0,      color:'#E74C3C', unlockLevel:1,  maxSpeed:200, acceleration:120, deceleration:180, turnSpeed:2.0, maxFuel:120, fuelRate:1.0,  maxHealth:100},
  {id:'pickup',   name:'Heavy Pickup',        desc:'Nimble – ideal for smaller cargo',      price:8000,   color:'#3498DB', unlockLevel:3,  maxSpeed:250, acceleration:155, deceleration:205, turnSpeed:2.4, maxFuel:95,  fuelRate:1.2,  maxHealth:80},
  {id:'semi',     name:'Semi Hauler',         desc:'Massive tank, bulletproof durability',  price:25000,  color:'#E67E22', unlockLevel:7,  maxSpeed:170, acceleration:88,  deceleration:148, turnSpeed:1.6, maxFuel:200, fuelRate:0.78, maxHealth:160},
  {id:'express',  name:'Express Courier',     desc:'Blazing fast – time-critical runs',     price:50000,  color:'#2ECC71', unlockLevel:10, maxSpeed:290, acceleration:185, deceleration:225, turnSpeed:2.55,maxFuel:80,  fuelRate:1.55, maxHealth:65},
  {id:'armoured', name:'Armoured Tanker',     desc:'Near-indestructible – dangerous routes',price:100000, color:'#7F8C8D', unlockLevel:15, maxSpeed:150, acceleration:70,  deceleration:130, turnSpeed:1.4, maxFuel:220, fuelRate:0.65, maxHealth:250},
]);

// ── Levels ──────────────────────────────────────────────────
export const LEVEL_DEFS = Object.freeze([
  {level:1,  xpRequired:0,      title:'Rookie Driver'},
  {level:2,  xpRequired:200,    title:'Novice Driver',     reward:{money:1000}},
  {level:3,  xpRequired:500,    title:'Regular Driver',    reward:{money:2000}},
  {level:4,  xpRequired:1000,   title:'Skilled Driver',    reward:{money:3000}},
  {level:5,  xpRequired:1800,   title:'Pro Driver',        reward:{money:5000}},
  {level:6,  xpRequired:3000,   title:'Expert Driver',     reward:{money:5000}},
  {level:7,  xpRequired:4500,   title:'Master Driver',     reward:{money:8000}},
  {level:8,  xpRequired:6500,   title:'Elite Driver',      reward:{money:8000}},
  {level:9,  xpRequired:9000,   title:'Champion Driver',   reward:{money:10000}},
  {level:10, xpRequired:12000,  title:'Road Legend',       reward:{money:15000}},
  {level:11, xpRequired:16000,  title:'Road Veteran',      reward:{money:15000}},
  {level:12, xpRequired:21000,  title:'Highway King',      reward:{money:20000}},
  {level:13, xpRequired:27000,  title:'Cargo Baron',       reward:{money:20000}},
  {level:14, xpRequired:34000,  title:'Logistics Expert',  reward:{money:25000}},
  {level:15, xpRequired:42000,  title:'Fleet Admiral',     reward:{money:30000}},
  {level:16, xpRequired:52000,  title:'National Hauler',   reward:{money:35000}},
  {level:17, xpRequired:64000,  title:'Freight King',      reward:{money:40000}},
  {level:18, xpRequired:78000,  title:'Supply Chain Boss', reward:{money:45000}},
  {level:19, xpRequired:95000,  title:'Logistics Mogul',   reward:{money:50000}},
  {level:20, xpRequired:115000, title:'Empire Builder',    reward:{money:75000}},
]);

// ── Achievements ─────────────────────────────────────────────
export const ACHIEVEMENT_DEFS = Object.freeze([
  {id:'first_delivery',  name:'First Delivery',   desc:'Complete your first delivery',      icon:'📦', xp:100, condition:g=>g.missionCount>=1},
  {id:'five_del',        name:'On a Roll',         desc:'Complete 5 deliveries',             icon:'🚚', xp:200, condition:g=>g.missionCount>=5},
  {id:'twenty_del',      name:'Veteran Trucker',   desc:'Complete 25 deliveries',            icon:'🏆', xp:500, condition:g=>g.missionCount>=25},
  {id:'fifty_del',       name:'Road Warrior',      desc:'Complete 50 deliveries',            icon:'👑', xp:800, condition:g=>g.missionCount>=50},
  {id:'earn_10k',        name:'First Payday',      desc:'Earn $10,000 total',                icon:'💰', xp:150, condition:g=>g.totalEarned>=10000},
  {id:'earn_100k',       name:'Big Business',      desc:'Earn $100,000 total',               icon:'💵', xp:400, condition:g=>g.totalEarned>=100000},
  {id:'earn_500k',       name:'Half Million',      desc:'Earn $500,000 total',               icon:'🏦', xp:800, condition:g=>g.totalEarned>=500000},
  {id:'earn_1m',         name:'Millionaire',       desc:'Earn $1,000,000 total',             icon:'💎', xp:2000,condition:g=>g.totalEarned>=1000000},
  {id:'speed_demon',     name:'Speed Demon',       desc:'Reach max truck speed',             icon:'⚡', xp:100, condition:g=>g.maxSpeedReached>=190},
  {id:'long_haul',       name:'Long Hauler',       desc:'Drive 5,000 km total',              icon:'🛣', xp:300, condition:g=>g.totalKm>=5000},
  {id:'off_roader',      name:'Off Roader',        desc:'Drive 200 units off-road',          icon:'🏔', xp:150, condition:g=>g.offRoadKm>=200},
  {id:'clean_run',       name:'Clean Run',         desc:'Complete delivery with no damage',  icon:'✨', xp:200, condition:g=>g.lastRunClean},
  {id:'five_clean',      name:'Pristine Driver',   desc:'5 deliveries in a row, no damage',  icon:'🛡', xp:500, condition:g=>g.cleanStreak>=5},
  {id:'tank',            name:'Tank',              desc:'Survive a 40+ HP collision',        icon:'💪', xp:200, condition:g=>g.maxSingleHit>=40},
  {id:'fully_upgraded',  name:'Fully Upgraded',    desc:'Max all 4 upgrades',                icon:'🔧', xp:500, condition:g=>g.allUpgradesMax},
  {id:'fleet_owner',     name:'Fleet Starter',     desc:'Own a second truck',                icon:'🚛', xp:400, condition:g=>g.fleetSize>=2},
  {id:'level_5',         name:'Rising Star',       desc:'Reach Level 5',                     icon:'⭐', xp:300, condition:g=>g.playerLevel>=5},
  {id:'level_10',        name:'Road Legend',       desc:'Reach Level 10',                    icon:'🌟', xp:600, condition:g=>g.playerLevel>=10},
  {id:'storm_driver',    name:'Storm Chaser',      desc:'Complete a delivery in a storm',    icon:'⛈', xp:250, condition:g=>g.deliveredInStorm},
  {id:'all_cargo',       name:'Jack of All Trades',desc:'Deliver all 8 cargo types',         icon:'🎯', xp:350, condition:g=>g.cargoTypesDelivered>=8},
  {id:'no_spending',     name:'Thrifty Driver',    desc:'Complete a mission without refueling',icon:'💡',xp:200,condition:g=>g.lastNoRefuel},
  {id:'streak_3',        name:'3-Day Streak',      desc:'Login 3 days in a row',             icon:'📅', xp:200, condition:g=>g.loginStreak>=3},
  {id:'streak_7',        name:'Weekly Regular',    desc:'Login 7 days in a row',             icon:'🗓', xp:500, condition:g=>g.loginStreak>=7},
  {id:'night_owl',       name:'Night Owl',         desc:'Complete a delivery at night',      icon:'🌙', xp:200, condition:g=>g.deliveredAtNight},
  // City explorer achievements
  {id:'reach_lahore',    name:'Punjab Bound',      desc:'Complete a delivery to Lahore',     icon:'🏙', xp:300, condition:g=>g.citiesDelivered?.has('LAHORE')},
  {id:'reach_islamabad', name:'Capital Run',       desc:'Complete a delivery to Islamabad',  icon:'🏛', xp:500, condition:g=>g.citiesDelivered?.has('ISLAMABAD')},
  {id:'reach_peshawar',  name:'KPK Express',       desc:'Complete a delivery to Peshawar',   icon:'🏔', xp:600, condition:g=>g.citiesDelivered?.has('PESHAWAR')},
  {id:'reach_quetta',    name:'Balochistan Haul',  desc:'Complete a delivery to Quetta',     icon:'🌵', xp:400, condition:g=>g.citiesDelivered?.has('QUETTA')},
]);

// ── NPC definitions (spread across full highway) ────────────
export const NPC_DEFS = Object.freeze([
  // Trucks
  {type:'truck', waypointIdx:0,  speed:70,  color:'#2980B9', laneOff:12},
  {type:'truck', waypointIdx:4,  speed:80,  color:'#27AE60', laneOff:15},
  {type:'truck', waypointIdx:8,  speed:75,  color:'#C0392B', laneOff:18},
  {type:'truck', waypointIdx:12, speed:65,  color:'#7F8C8D', laneOff:20},
  {type:'truck', waypointIdx:16, speed:72,  color:'#D35400', laneOff:10},
  {type:'truck', waypointIdx:20, speed:68,  color:'#1ABC9C', laneOff:14},
  // Cars
  {type:'car',   waypointIdx:2,  speed:120, color:'#8E44AD', laneOff:8},
  {type:'car',   waypointIdx:6,  speed:110, color:'#F39C12', laneOff:6},
  {type:'car',   waypointIdx:10, speed:130, color:'#16A085', laneOff:9},
  {type:'car',   waypointIdx:14, speed:115, color:'#E74C3C', laneOff:7},
  {type:'car',   waypointIdx:18, speed:125, color:'#3498DB', laneOff:11},
  {type:'car',   waypointIdx:22, speed:118, color:'#9B59B6', laneOff:8},
  // Buses
  {type:'bus',   waypointIdx:3,  speed:55,  color:'#2C3E50', laneOff:12},
  {type:'bus',   waypointIdx:11, speed:52,  color:'#1A252F', laneOff:10},
  {type:'bus',   waypointIdx:19, speed:58,  color:'#2C3E50', laneOff:14},
  // Motorcycles
  {type:'moto',  waypointIdx:5,  speed:165, color:'#E74C3C', laneOff:5},
  {type:'moto',  waypointIdx:15, speed:155, color:'#F39C12', laneOff:4},
  {type:'moto',  waypointIdx:21, speed:170, color:'#2ECC71', laneOff:3},
]);

// Static obstacles (safely off-road ≥100u from centre)
export const STATIC_OBSTACLE_DEFS = Object.freeze([
  {x:1400, y:4050, type:'rock',   r:12, dmg:10},
  {x:3600, y:3600, type:'barrel', r:10, dmg:8 },
  {x:6500, y:3080, type:'rock',   r:15, dmg:12},
  {x:8000, y:2800, type:'rock',   r:10, dmg:10},
  {x:10200,y:2620, type:'barrel', r:10, dmg:8 },
  {x:12500,y:2440, type:'rock',   r:14, dmg:12},
  {x:14500,y:2160, type:'rock',   r:11, dmg:10},
  {x:16500,y:1880, type:'barrel', r:10, dmg:8 },
  {x:18000,y:1710, type:'rock',   r:12, dmg:10},
  {x:4900, y:5300, type:'rock',   r:13, dmg:10},  // N25
]);

// ── Paint ────────────────────────────────────────────────────
export const PAINT_COLORS = Object.freeze([
  {id:'red',     name:'Racing Red',    hex:'#E74C3C'},
  {id:'blue',    name:'Ocean Blue',    hex:'#2980B9'},
  {id:'green',   name:'Forest Green',  hex:'#27AE60'},
  {id:'orange',  name:'Sunset Orange', hex:'#E67E22'},
  {id:'yellow',  name:'Sand Yellow',   hex:'#F1C40F'},
  {id:'purple',  name:'Royal Purple',  hex:'#8E44AD'},
  {id:'teal',    name:'Turquoise',     hex:'#16A085'},
  {id:'grey',    name:'Steel Grey',    hex:'#7F8C8D'},
  {id:'black',   name:'Midnight',      hex:'#1a1a1a'},
  {id:'white',   name:'Arctic White',  hex:'#ECF0F1'},
  {id:'gold',    name:'Gold Rush',     hex:'#D4AC0D'},
  {id:'crimson', name:'Crimson Fire',  hex:'#B03A2E'},
]);

// ── Game states ──────────────────────────────────────────────
export const GAME_STATE = Object.freeze({
  MAIN_MENU:'main_menu', MISSION_SELECT:'mission_select', DRIVING:'driving',
  PAUSED:'paused', MISSION_COMPLETE:'mission_complete', GAME_OVER:'game_over',
  GARAGE:'garage', FLEET:'fleet', ACHIEVEMENTS:'achievements',
  PROFILE:'profile', DAILY_REWARD:'daily_reward', SETTINGS:'settings',
  COUNTRY_MAP:'country_map', TUTORIAL:'tutorial',
});

export const MISSION_PHASE = Object.freeze({PICKUP:'pickup',DELIVERY:'delivery',DONE:'done'});
