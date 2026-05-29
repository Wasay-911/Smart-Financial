// js/systems/MissionGenerator.js – Procedural mission contract generation

import { CARGO_DEFS, CITIES } from '../constants.js';

const DIFFICULTY_TABLE = [
  {label:'Easy',   color:'#2ECC71', rewardMult:0.85, timeMultiplier:1.5, hasTimeLimit:false},
  {label:'Normal', color:'#F39C12', rewardMult:1.0,  timeMultiplier:1.3, hasTimeLimit:false},
  {label:'Hard',   color:'#E74C3C', rewardMult:1.35, timeMultiplier:1.1, hasTimeLimit:true },
  {label:'Expert', color:'#9B59B6', rewardMult:1.7,  timeMultiplier:1.0, hasTimeLimit:true },
  {label:'Urgent', color:'#FF6B35', rewardMult:2.0,  timeMultiplier:0.85,hasTimeLimit:true }, // bonus timed
];

const NAME_TEMPLATES = [
  '{type} Express',     '{type} Haul #{n}',    'Urgent {type} Run',
  '{type} Contract',    'Priority {type}',      '{type} Shipment',
  'Emergency {type}',   '{type} Delivery #{n}',
];

let _idCounter = 1000;

export class MissionGenerator {
  /**
   * Generate a pool of n missions, weighted by player level.
   * Higher level = higher chance of harder missions.
   * @param {number} n  Pool size
   * @param {number} level  Player level (1-20)
   */
  static generatePool(n = 6, level = 1) {
    const missions = [];
    for (let i = 0; i < n; i++) {
      missions.push(MissionGenerator.generate(level));
    }
    return missions;
  }

  static generate(level = 1) {
    const cargo  = CARGO_DEFS[Math.floor(Math.random() * CARGO_DEFS.length)];
    const diff   = MissionGenerator._pickDifficulty(level);
    const tpl    = NAME_TEMPLATES[Math.floor(Math.random() * NAME_TEMPLATES.length)];
    const name   = tpl.replace('{type}', cargo.type).replace('#{n}', `#${Math.floor(Math.random() * 9999)}`);
    const reward = Math.round(cargo.baseReward * diff.rewardMult * (1 + (level - 1) * 0.05));
    const BASE_TIME = 180; // seconds (3 min at comfortable pace)
    const timeLimit = diff.hasTimeLimit ? Math.round(BASE_TIME * diff.timeMultiplier) : null;

    return {
      id:              _idCounter++,
      name,
      cargoId:         cargo.id,
      fromCity:        'KARACHI',
      toCity:          'HYDERABAD',
      baseReward:      reward,
      difficulty:      diff.label,
      difficultyColor: diff.color,
      timeLimit,                    // null = no limit; number = seconds allowed
      timeBonusAmt:    timeLimit ? Math.round(reward * 0.25) : 0,
      isGenerated:     true,
    };
  }

  static _pickDifficulty(level) {
    // Weight distribution shifts toward harder as level increases
    const weights = [
      Math.max(0, 60 - level * 4),   // Easy
      Math.max(10, 30 - level),       // Normal
      Math.min(30, level * 2),        // Hard
      Math.min(20, Math.max(0, (level - 5) * 2)), // Expert
      Math.min(10, Math.max(0, (level - 8) * 1)), // Urgent
    ];
    const total = weights.reduce((s, w) => s + w, 0);
    let rnd = Math.random() * total;
    for (let i = 0; i < DIFFICULTY_TABLE.length; i++) {
      rnd -= weights[i];
      if (rnd <= 0) return DIFFICULTY_TABLE[i];
    }
    return DIFFICULTY_TABLE[1];
  }
}
