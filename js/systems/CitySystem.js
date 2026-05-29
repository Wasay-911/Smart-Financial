// js/systems/CitySystem.js – City unlocking, routing, distance calculation

import { CITIES, CITY_ORDER, ROUTES, CITY_WAREHOUSES, HIGHWAY, HIGHWAY_N25 } from '../constants.js';
import { dist } from '../utils.js';

export class CitySystem {
  constructor() {
    /** Set of unlocked city keys */
    this.unlocked = new Set(['KARACHI', 'HYDERABAD']);

    /** Set of city keys where the player has delivered cargo */
    this.delivered = new Set();

    this.onCityUnlocked = null; // (cityKey, cityDef) => void
  }

  // ── Accessors ────────────────────────────────────────────
  isUnlocked(key)       { return this.unlocked.has(key); }
  getUnlocked()         { return CITY_ORDER.filter(k => this.unlocked.has(k)); }
  getLockedNext()       { return CITY_ORDER.find(k => !this.unlocked.has(k)); }
  getAllForMap()         { return CITY_ORDER.map(k => ({key:k, def:CITIES[k], unlocked:this.unlocked.has(k)})); }
  warehouseOf(cityKey)  { return CITY_WAREHOUSES[cityKey]; }

  // ── Available routes ──────────────────────────────────────
  /** Get all routeable city pairs the player can currently select */
  getAvailablePairs() {
    const pairs = [];
    const ul = this.getUnlocked();
    for (let i = 0; i < ul.length; i++) {
      for (let j = i + 1; j < ul.length; j++) {
        const from = ul[i], to = ul[j];
        pairs.push({ from, to,
          fromDef: CITIES[from], toDef: CITIES[to],
          dist: this.routeDistance(from, to),
        });
      }
    }
    return pairs;
  }

  // ── Distance between two cities (sum of segments) ─────────
  routeDistance(fromKey, toKey) {
    if (fromKey === toKey) return 0;
    const route = ROUTES.find(r =>
      (r.from === fromKey && r.to === toKey) ||
      (r.from === toKey   && r.to === fromKey)
    );
    if (route) return route.dist;

    // Multi-hop: sum of adjacent segments
    const path = this._findPath(fromKey, toKey);
    if (!path) return 8000; // fallback
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const seg = ROUTES.find(r =>
        (r.from===path[i]&&r.to===path[i+1]) ||
        (r.from===path[i+1]&&r.to===path[i])
      );
      total += seg ? seg.dist : 3000;
    }
    return total;
  }

  _findPath(from, to) {
    const visited = new Set([from]);
    const queue   = [[from]];
    while (queue.length) {
      const path = queue.shift();
      const cur  = path[path.length - 1];
      for (const r of ROUTES) {
        let next = null;
        if (r.from === cur) next = r.to;
        else if (r.to === cur) next = r.from;
        if (!next || visited.has(next)) continue;
        const newPath = [...path, next];
        if (next === to) return newPath;
        visited.add(next);
        queue.push(newPath);
      }
    }
    return null;
  }

  // ── Unlock check (call after each level up or delivery) ───
  checkUnlocks(playerLevel, notif) {
    let newlyUnlocked = [];
    for (const key of CITY_ORDER) {
      if (this.unlocked.has(key)) continue;
      const def = CITIES[key];
      if (playerLevel >= def.unlockLevel) {
        this.unlocked.add(key);
        newlyUnlocked.push(key);
        notif?.notify(`🏙  ${def.name} unlocked! New delivery routes available.`, '#FFD700', 5);
        if (this.onCityUnlocked) this.onCityUnlocked(key, def);
      }
    }
    return newlyUnlocked;
  }

  markDelivered(cityKey) { this.delivered.add(cityKey); }

  // ── Spawn position for truck at city ──────────────────────
  spawnPosFor(cityKey) {
    const c = CITIES[cityKey];
    if (!c) return {x:600, y:4200, angle: Math.PI/2};
    // Find the nearest highway point to spawn the truck ON the road
    let bestPt = {x:c.x, y:c.y}, bestD = Infinity;
    for (const hw of [HIGHWAY, HIGHWAY_N25]) {
      for (const pt of hw) {
        const d = dist(c.x, c.y, pt.x, pt.y);
        if (d < bestD) { bestD = d; bestPt = pt; }
      }
    }
    // Angle facing roughly east (toward city chain)
    return {x: bestPt.x - 80, y: bestPt.y, angle: Math.PI/2};
  }

  // ── Serialise ─────────────────────────────────────────────
  toJSON()  { return { unlocked:[...this.unlocked], delivered:[...this.delivered] }; }
  fromJSON(d) {
    if (!d) return;
    if (d.unlocked)  d.unlocked.forEach(k  => this.unlocked.add(k));
    if (d.delivered) d.delivered.forEach(k => this.delivered.add(k));
  }
}
