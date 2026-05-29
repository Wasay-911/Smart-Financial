// js/systems/MissionGenerator.js – City-aware procedural contract generation

import { CARGO_DEFS, CITIES } from '../constants.js';

const DIFFICULTY_TABLE = [
  {label:'Easy',   color:'#2ECC71', rewardMult:0.85, timeMultiplier:1.5, hasTimeLimit:false},
  {label:'Normal', color:'#F39C12', rewardMult:1.0,  timeMultiplier:1.3, hasTimeLimit:false},
  {label:'Hard',   color:'#E74C3C', rewardMult:1.35, timeMultiplier:1.1, hasTimeLimit:true },
  {label:'Expert', color:'#9B59B6', rewardMult:1.7,  timeMultiplier:1.0, hasTimeLimit:true },
  {label:'Urgent', color:'#FF6B35', rewardMult:2.0,  timeMultiplier:0.85,hasTimeLimit:true },
];

const NAME_TEMPLATES = [
  '{type} Express', '{type} Haul #{n}', 'Urgent {type} Run',
  '{type} Contract', 'Priority {type}', '{type} Shipment',
  '{type} Delivery #{n}', 'Emergency {type}',
];

const BASE_DIST  = 2800; // Karachi–Hyderabad reference distance
const BASE_REWARD = 800;  // Base reward at reference distance

let _idCounter = 2000;

export class MissionGenerator {
  /**
   * Generate a pool of missions using available city pairs.
   * @param {number}   n           Pool size
   * @param {number}   level       Player level
   * @param {string[]} unlockedCities  Array of city keys
   */
  static generatePool(n = 6, level = 1, unlockedCities = ['KARACHI','HYDERABAD']) {
    const pairs = MissionGenerator._buildPairs(unlockedCities);
    const missions = [];
    for (let i = 0; i < n; i++) {
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      missions.push(MissionGenerator.generate(level, pair.from, pair.to, pair.dist));
    }
    return missions;
  }

  static _buildPairs(unlocked) {
    const pairs = [];
    for (let i = 0; i < unlocked.length; i++) {
      for (let j = i + 1; j < unlocked.length; j++) {
        pairs.push({from: unlocked[i], to: unlocked[j], dist: 3000});
      }
    }
    // Always add adjacent pairs with realistic distances
    const adjacentDistances = {
      'KARACHI-HYDERABAD':   2800, 'HYDERABAD-SUKKUR':  3000,
      'SUKKUR-MULTAN':       3500, 'MULTAN-LAHORE':     3500,
      'LAHORE-ISLAMABAD':    2500, 'ISLAMABAD-PESHAWAR':3000,
      'SUKKUR-QUETTA':       4000,
    };
    for (const [key, d] of Object.entries(adjacentDistances)) {
      const [from, to] = key.split('-');
      if (unlocked.includes(from) && unlocked.includes(to)) {
        const existing = pairs.find(p => (p.from===from&&p.to===to)||(p.from===to&&p.to===from));
        if (existing) existing.dist = d;
        else pairs.push({from, to, dist:d});
      }
    }
    return pairs.length ? pairs : [{from:'KARACHI', to:'HYDERABAD', dist:2800}];
  }

  static generate(level = 1, fromCity = 'KARACHI', toCity = 'HYDERABAD', routeDist = 2800) {
    const cargo  = CARGO_DEFS[Math.floor(Math.random() * CARGO_DEFS.length)];
    const diff   = MissionGenerator._pickDiff(level);
    const tpl    = NAME_TEMPLATES[Math.floor(Math.random() * NAME_TEMPLATES.length)];
    const name   = tpl.replace('{type}', cargo.type).replace('#{n}', `#${Math.floor(Math.random()*9999)}`);

    // Reward scales with distance and difficulty
    const distMult = routeDist / BASE_DIST;
    const reward   = Math.round(cargo.baseReward * distMult * diff.rewardMult * (1 + (level-1)*0.04));
    const BASE_TIME = 60 + routeDist / 100; // seconds
    const timeLimit = diff.hasTimeLimit ? Math.round(BASE_TIME * diff.timeMultiplier) : null;

    return {
      id:             _idCounter++,
      name,
      cargoId:        cargo.id,
      fromCity,
      toCity,
      baseReward:     reward,
      difficulty:     diff.label,
      difficultyColor:diff.color,
      timeLimit,
      timeBonusAmt:   timeLimit ? Math.round(reward * 0.25) : 0,
      routeDist,
      isGenerated:    true,
    };
  }

  static _pickDiff(level) {
    const w = [
      Math.max(0, 60 - level*4),
      Math.max(10, 30 - level),
      Math.min(30, level*2),
      Math.min(20, Math.max(0, (level-5)*2)),
      Math.min(10, Math.max(0, (level-8)*1)),
    ];
    const total = w.reduce((s,v)=>s+v,0);
    let rnd = Math.random()*total;
    for (let i=0;i<DIFFICULTY_TABLE.length;i++){rnd-=w[i];if(rnd<=0) return DIFFICULTY_TABLE[i];}
    return DIFFICULTY_TABLE[1];
  }
}
