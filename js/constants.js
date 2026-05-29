// js/constants.js – All shared world data and definitions

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

export const CARGO_DEFS = Object.freeze([
  {id:'food',         type:'Food',         color:'#E67E22', baseReward:800,  weight:1.0, isFragile:false, desc:'Fresh produce – deliver fresh!'},
  {id:'electronics',  type:'Electronics',  color:'#9B59B6', baseReward:1500, weight:0.8, isFragile:true,  desc:'Fragile electronics – drive carefully!'},
  {id:'construction', type:'Construction', color:'#95A5A6', baseReward:600,  weight:1.5, isFragile:false, desc:'Heavy materials – lower speed'},
  {id:'fuel',         type:'Fuel',         color:'#F1C40F', baseReward:1100, weight:1.2, isFragile:false, desc:'Fuel tanker – hazardous goods'},
  {id:'furniture',    type:'Furniture',    color:'#8E44AD', baseReward:900,  weight:1.1, isFragile:false, desc:'Household furniture delivery'},
]);

export const MISSION_DEFS = Object.freeze(
  CARGO_DEFS.map((cargo, i) => ({
    id: i + 1,
    name:            ['Food Run','Electronics Haul','Construction Haul','Fuel Transport','Furniture Move'][i],
    cargoId:         cargo.id,
    fromCity:        'KARACHI',
    toCity:          'HYDERABAD',
    baseReward:      cargo.baseReward,
    difficulty:      ['Easy','Hard','Easy','Medium','Medium'][i],
    difficultyColor: ['#2ECC71','#E74C3C','#2ECC71','#F39C12','#F39C12'][i],
  }))
);

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

export const PICKUP_POS   = Object.freeze({x:700,  y:2000});
export const DELIVERY_POS = Object.freeze({x:8400, y:2010});

/** NPC vehicle spawn configuration */
export const NPC_DEFS = Object.freeze([
  {type:'truck', waypointIdx:0, speed:70,  color:'#2980B9', laneOff:12},
  {type:'truck', waypointIdx:2, speed:85,  color:'#27AE60', laneOff:15},
  {type:'car',   waypointIdx:1, speed:110, color:'#8E44AD', laneOff:8},
  {type:'car',   waypointIdx:3, speed:95,  color:'#D35400', laneOff:10},
  {type:'truck', waypointIdx:5, speed:75,  color:'#C0392B', laneOff:18},
  {type:'car',   waypointIdx:7, speed:120, color:'#16A085', laneOff:6},
  {type:'truck', waypointIdx:4, speed:65,  color:'#7F8C8D', laneOff:20},
  {type:'car',   waypointIdx:6, speed:100, color:'#F39C12', laneOff:14},
]);

/**
 * Static roadside obstacles – placed ≥100 units perpendicular from road centre
 * so they are visible hazards but not on the default driving line.
 */
export const STATIC_OBSTACLE_DEFS = Object.freeze([
  // Near seg (500,2000)→(1200,2000) – south side
  {x:850,  y:2110, type:'rock',   r:12, dmg:10},
  // Near seg (2000,1700)→(2800,1700) – south side
  {x:2400, y:1820, type:'barrel', r:10, dmg:8 },
  // Near seg (3500,2100)→(4500,2100) – north side
  {x:3800, y:1990, type:'rock',   r:15, dmg:12},
  // Near seg (3500,2100)→(4500,2100) – south side
  {x:4200, y:2220, type:'rock',   r:10, dmg:10},
  // Near seg (5200,1800)→(6200,1800) – north side
  {x:5700, y:1685, type:'barrel', r:10, dmg:8 },
  // Near seg (7000,2200)→(7800,2200) – south side
  {x:7100, y:2320, type:'rock',   r:14, dmg:12},
  // Near seg (7000,2200)→(7800,2200) – north side
  {x:7500, y:2090, type:'rock',   r:11, dmg:10},
  // Near seg (1200,2000)→(2000,1700) – east side
  {x:1600, y:2100, type:'barrel', r:10, dmg:8 },
  // Near seg (2800,1700)→(3500,2100) – west side
  {x:3100, y:1600, type:'rock',   r:13, dmg:10},
]);

export const GAME_STATE = Object.freeze({
  BOOT:             'boot',
  MAIN_MENU:        'main_menu',
  MISSION_SELECT:   'mission_select',
  DRIVING:          'driving',
  PAUSED:           'paused',
  MISSION_COMPLETE: 'mission_complete',
  GAME_OVER:        'game_over',
  GARAGE:           'garage',
  SETTINGS:         'settings',
});

export const MISSION_PHASE = Object.freeze({
  PICKUP:   'pickup',
  DELIVERY: 'delivery',
  DONE:     'done',
});
