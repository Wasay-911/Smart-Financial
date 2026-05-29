// js/constants.js – Single source of truth for all game data (Phase 3)

export const WORLD_W = 9000;
export const WORLD_H = 4000;
export const ROAD_W  = 80;

/** Highway control points: Karachi → Hyderabad */
export const HIGHWAY = Object.freeze([
  {x:500,  y:2000},
  {x:1200, y:2000},
  {x:2000, y:1700},
  {x:2800, y:1700},
  {x:3500, y:2100},
  {x:4500, y:2100},
  {x:5200, y:1800},
  {x:6200, y:1800},
  {x:7000, y:2200},
  {x:7800, y:2200},
  {x:8500, y:2000},
]);

export const CITIES = Object.freeze({
  KARACHI:   {x:500,  y:2000, name:'Karachi',   color:'#E74C3C'},
  HYDERABAD: {x:8500, y:2000, name:'Hyderabad', color:'#3498DB'},
});

export const FUEL_STATION_DEFS = Object.freeze([
  {id:'kathor',    x:2800, y:1700, name:'Kathor Stop'},
  {id:'nawabshah', x:6200, y:1800, name:'Nawabshah Stop'},
]);

// ── Cargo types ──────────────────────────────────────────────
export const CARGO_DEFS = Object.freeze([
  {id:'food',         type:'Food',          color:'#E67E22', baseReward:800,  weight:1.0, isFragile:false, desc:'Fresh produce – deliver fresh!'},
  {id:'electronics',  type:'Electronics',   color:'#9B59B6', baseReward:1500, weight:0.8, isFragile:true,  desc:'Fragile electronics – drive carefully!'},
  {id:'construction', type:'Construction',  color:'#95A5A6', baseReward:600,  weight:1.5, isFragile:false, desc:'Heavy materials – lower speed'},
  {id:'fuel_cargo',   type:'Fuel',          color:'#F1C40F', baseReward:1100, weight:1.2, isFragile:false, desc:'Fuel tanker – hazardous goods'},
  {id:'furniture',    type:'Furniture',     color:'#8E44AD', baseReward:900,  weight:1.1, isFragile:false, desc:'Household furniture delivery'},
  {id:'medicine',     type:'Medicine',      color:'#2ECC71', baseReward:2000, weight:0.6, isFragile:true,  desc:'Medical supplies – urgent delivery!'},
  {id:'machinery',    type:'Machinery',     color:'#E74C3C', baseReward:1300, weight:2.0, isFragile:false, desc:'Industrial machinery – very heavy'},
  {id:'luxury',       type:'Luxury Goods',  color:'#FFD700', baseReward:2500, weight:0.5, isFragile:true,  desc:'Premium goods – handle with extreme care'},
]);

export const MISSION_DEFS = Object.freeze(
  CARGO_DEFS.map((cargo, i) => ({
    id: i + 1,
    name:            ['Food Run','Electronics Haul','Construction Haul','Fuel Transport','Furniture Move','Medicine Express','Machinery Haul','Luxury Delivery'][i],
    cargoId:         cargo.id,
    fromCity:        'KARACHI',
    toCity:          'HYDERABAD',
    baseReward:      cargo.baseReward,
    difficulty:      ['Easy','Hard','Easy','Medium','Medium','Expert','Hard','Expert'][i],
    difficultyColor: ['#2ECC71','#E74C3C','#2ECC71','#F39C12','#F39C12','#9B59B6','#E74C3C','#9B59B6'][i],
    timeLimit:       [null, null, null, null, null, 90, null, 120][i], // seconds; null = no limit
    timeBonusAmt:    [0, 0, 0, 0, 0, 500, 0, 750][i],
  }))
);

// ── Truck definitions ────────────────────────────────────────
export const TRUCK_DEFS = Object.freeze([
  {
    id:'starter',  name:'Starter Rig',        desc:'The reliable workhorse for new drivers',
    price:0,       color:'#E74C3C',            unlockLevel:1,
    maxSpeed:200,  acceleration:120, deceleration:180, turnSpeed:2.0,
    maxFuel:120,   fuelRate:1.0,     maxHealth:100,    cargoCapacity:1.0,
  },
  {
    id:'pickup',   name:'Heavy Pickup',        desc:'Nimble and fast – ideal for smaller cargo',
    price:8000,    color:'#3498DB',            unlockLevel:3,
    maxSpeed:250,  acceleration:155, deceleration:205, turnSpeed:2.4,
    maxFuel:95,    fuelRate:1.2,     maxHealth:80,     cargoCapacity:0.8,
  },
  {
    id:'semi',     name:'Semi Hauler',         desc:'Massive fuel tank and bulletproof durability',
    price:25000,   color:'#E67E22',            unlockLevel:7,
    maxSpeed:170,  acceleration:88,  deceleration:148, turnSpeed:1.6,
    maxFuel:200,   fuelRate:0.78,    maxHealth:160,    cargoCapacity:1.6,
  },
  {
    id:'express',  name:'Express Courier',     desc:'Blazing fast for time-critical deliveries',
    price:50000,   color:'#2ECC71',            unlockLevel:10,
    maxSpeed:290,  acceleration:185, deceleration:225, turnSpeed:2.55,
    maxFuel:80,    fuelRate:1.55,    maxHealth:65,     cargoCapacity:0.6,
  },
  {
    id:'armoured', name:'Armoured Tanker',     desc:'Near-indestructible – built for dangerous routes',
    price:100000,  color:'#7F8C8D',            unlockLevel:15,
    maxSpeed:150,  acceleration:70,  deceleration:130, turnSpeed:1.4,
    maxFuel:220,   fuelRate:0.65,    maxHealth:250,    cargoCapacity:1.8,
  },
]);

// ── Upgrades ─────────────────────────────────────────────────
export const UPGRADE_DEFS = Object.freeze({
  engine: {
    key:'engine', name:'Engine', icon:'⚙', maxLevel:3,
    costs:[2000,4000,8000],
    descriptions:['Power output +20%','Performance engine','Racing engine'],
    stat:'+30 km/h speed per level',
  },
  fuelTank: {
    key:'fuelTank', name:'Fuel Tank', icon:'⛽', maxLevel:3,
    costs:[1500,3000,6000],
    descriptions:['Extended capacity','Large reservoir','Maximum tank'],
    stat:'+25 fuel capacity per level',
  },
  handling: {
    key:'handling', name:'Handling', icon:'🔧', maxLevel:3,
    costs:[1000,2500,5000],
    descriptions:['Better steering','Sport suspension','Racing chassis'],
    stat:'+15% turn speed per level',
  },
  brakes: {
    key:'brakes', name:'Brakes', icon:'🛑', maxLevel:3,
    costs:[800,2000,4000],
    descriptions:['Disc brakes','Performance brakes','Carbon ceramics'],
    stat:'+20% braking power per level',
  },
});

// ── Player levels ─────────────────────────────────────────────
export const LEVEL_DEFS = Object.freeze([
  {level:1,  xpRequired:0,      title:'Rookie Driver',     reward:null},
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

// ── Achievements ──────────────────────────────────────────────
export const ACHIEVEMENT_DEFS = Object.freeze([
  // Delivery milestones
  {id:'first_delivery',  name:'First Delivery',    desc:'Complete your first delivery',        icon:'📦', xp:100, condition:g => g.missionCount >= 1},
  {id:'five_del',        name:'On a Roll',          desc:'Complete 5 deliveries',               icon:'🚚', xp:200, condition:g => g.missionCount >= 5},
  {id:'twenty_del',      name:'Veteran Trucker',    desc:'Complete 25 deliveries',              icon:'🏆', xp:500, condition:g => g.missionCount >= 25},
  {id:'fifty_del',       name:'Road Warrior',       desc:'Complete 50 deliveries',              icon:'👑', xp:800, condition:g => g.missionCount >= 50},
  // Economy
  {id:'earn_10k',        name:'First Payday',       desc:'Earn $10,000 total',                  icon:'💰', xp:150, condition:g => g.totalEarned >= 10000},
  {id:'earn_100k',       name:'Big Business',       desc:'Earn $100,000 total',                 icon:'💵', xp:400, condition:g => g.totalEarned >= 100000},
  {id:'earn_500k',       name:'Half Million Club',  desc:'Earn $500,000 total',                 icon:'🏦', xp:800, condition:g => g.totalEarned >= 500000},
  {id:'earn_1m',         name:'Millionaire',        desc:'Earn $1,000,000 total',               icon:'💎', xp:2000,condition:g => g.totalEarned >= 1000000},
  // Driving
  {id:'speed_demon',     name:'Speed Demon',        desc:'Reach max truck speed',               icon:'⚡', xp:100, condition:g => g.maxSpeedReached >= 190},
  {id:'long_haul',       name:'Long Hauler',        desc:'Drive 5,000 km total',                icon:'🛣', xp:300, condition:g => g.totalKm >= 5000},
  {id:'off_roader',      name:'Off Roader',         desc:'Drive 200 units off-road',            icon:'🏔', xp:150, condition:g => g.offRoadKm >= 200},
  // Damage
  {id:'clean_run',       name:'Clean Run',          desc:'Complete a delivery with no damage',  icon:'✨', xp:200, condition:g => g.lastRunClean},
  {id:'five_clean',      name:'Pristine Driver',    desc:'5 deliveries in a row, no damage',    icon:'🛡', xp:500, condition:g => g.cleanStreak >= 5},
  {id:'tank',            name:'Tank',               desc:'Survive a 40+ HP collision',          icon:'💪', xp:200, condition:g => g.maxSingleHit >= 40},
  // Upgrades & Fleet
  {id:'fully_upgraded',  name:'Fully Upgraded',     desc:'Max out all 4 upgrades',              icon:'🔧', xp:500, condition:g => g.allUpgradesMax},
  {id:'fleet_owner',     name:'Fleet Starter',      desc:'Own a second truck',                  icon:'🚛', xp:400, condition:g => g.fleetSize >= 2},
  // Progression
  {id:'level_5',         name:'Rising Star',        desc:'Reach Level 5',                       icon:'⭐', xp:300, condition:g => g.playerLevel >= 5},
  {id:'level_10',        name:'Road Legend',        desc:'Reach Level 10',                      icon:'🌟', xp:600, condition:g => g.playerLevel >= 10},
  // Weather
  {id:'storm_driver',    name:'Storm Chaser',       desc:'Complete a delivery in a storm',      icon:'⛈', xp:250, condition:g => g.deliveredInStorm},
  // Cargo
  {id:'all_cargo',       name:'Jack of All Trades', desc:'Deliver all 8 cargo types',           icon:'🎯', xp:350, condition:g => g.cargoTypesDelivered >= 8},
  // Economy challenge
  {id:'no_spending',     name:'Thrifty Driver',     desc:'Complete a mission without refueling', icon:'💡', xp:200, condition:g => g.lastNoRefuel},
  // Streak
  {id:'streak_3',        name:'3-Day Streak',       desc:'Login 3 days in a row',               icon:'📅', xp:200, condition:g => g.loginStreak >= 3},
  {id:'streak_7',        name:'Weekly Regular',     desc:'Login 7 days in a row',               icon:'🗓', xp:500, condition:g => g.loginStreak >= 7},
  // Special
  {id:'night_owl',       name:'Night Owl',          desc:'Complete a delivery at night',        icon:'🌙', xp:200, condition:g => g.deliveredAtNight},
]);

// ── NPC definitions ───────────────────────────────────────────
export const NPC_DEFS = Object.freeze([
  // Trucks (slow, wide)
  {type:'truck', waypointIdx:0, speed:70,  color:'#2980B9', laneOff:12},
  {type:'truck', waypointIdx:2, speed:85,  color:'#27AE60', laneOff:15},
  {type:'truck', waypointIdx:5, speed:75,  color:'#C0392B', laneOff:18},
  {type:'truck', waypointIdx:4, speed:65,  color:'#7F8C8D', laneOff:20},
  // Cars (fast, narrow)
  {type:'car',   waypointIdx:1, speed:120, color:'#8E44AD', laneOff:8},
  {type:'car',   waypointIdx:3, speed:110, color:'#D35400', laneOff:10},
  {type:'car',   waypointIdx:7, speed:130, color:'#16A085', laneOff:6},
  {type:'car',   waypointIdx:6, speed:105, color:'#F39C12', laneOff:14},
  // Buses (very slow, very wide)
  {type:'bus',   waypointIdx:1, speed:55,  color:'#2C3E50', laneOff:10},
  {type:'bus',   waypointIdx:6, speed:50,  color:'#1A252F', laneOff:12},
  // Motorcycles (very fast, tiny)
  {type:'moto',  waypointIdx:2, speed:160, color:'#E74C3C', laneOff:5},
  {type:'moto',  waypointIdx:8, speed:150, color:'#F39C12', laneOff:4},
]);

/** Static roadside obstacles – safely off-road (≥100 units from road centre) */
export const STATIC_OBSTACLE_DEFS = Object.freeze([
  {x:850,  y:2110, type:'rock',   r:12, dmg:10},
  {x:2400, y:1820, type:'barrel', r:10, dmg:8 },
  {x:3800, y:1990, type:'rock',   r:15, dmg:12},
  {x:4200, y:2220, type:'rock',   r:10, dmg:10},
  {x:5700, y:1685, type:'barrel', r:10, dmg:8 },
  {x:7100, y:2320, type:'rock',   r:14, dmg:12},
  {x:7500, y:2090, type:'rock',   r:11, dmg:10},
  {x:1600, y:2100, type:'barrel', r:10, dmg:8 },
  {x:3100, y:1600, type:'rock',   r:13, dmg:10},
]);

export const PICKUP_POS   = Object.freeze({x:700,  y:2000});
export const DELIVERY_POS = Object.freeze({x:8400, y:2010});

export const MISSION_PHASE = Object.freeze({
  PICKUP:   'pickup',
  DELIVERY: 'delivery',
  DONE:     'done',
});

export const GAME_STATE = Object.freeze({
  BOOT:             'boot',
  MAIN_MENU:        'main_menu',
  MISSION_SELECT:   'mission_select',
  DRIVING:          'driving',
  PAUSED:           'paused',
  MISSION_COMPLETE: 'mission_complete',
  GAME_OVER:        'game_over',
  GARAGE:           'garage',
  FLEET:            'fleet',
  ACHIEVEMENTS:     'achievements',
  PROFILE:          'profile',
  DAILY_REWARD:     'daily_reward',
  SETTINGS:         'settings',
});

// ── Paint colours ─────────────────────────────────────────────
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
