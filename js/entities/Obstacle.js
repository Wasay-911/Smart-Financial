// js/entities/Obstacle.js – Static obstacles + NPC traffic (truck, car, bus, motorcycle)

import { clamp } from '../utils.js';
import { HIGHWAY, WORLD_W } from '../constants.js';

export class StaticObstacle {
  constructor(def) {
    this.x = def.x; this.y = def.y;
    this.type = def.type;
    this.collisionRadius = def.r;
    this.damage = def.dmg;
    this.isNPC  = false;
  }
  update(_dt) {}
}

/**
 * NPC Vehicle – follows the highway waypoints in a loop.
 * Supports types: 'truck' | 'car' | 'bus' | 'moto'
 */
export class NPCVehicle {
  constructor(def) {
    this.type     = def.type;
    this.color    = def.color;
    this.speed    = def.speed;
    this.laneOff  = def.laneOff || 10;

    this.waypointIdx = clamp(def.waypointIdx || 0, 0, HIGHWAY.length - 2);
    this.x     = HIGHWAY[this.waypointIdx].x;
    this.y     = HIGHWAY[this.waypointIdx].y + this.laneOff;
    this.angle = Math.PI / 2;
    this.isNPC = true;

    // Per-type physical profile
    switch (this.type) {
      case 'truck': this.collisionRadius = 28; this.damage = 15; break;
      case 'car':   this.collisionRadius = 18; this.damage = 10; break;
      case 'bus':   this.collisionRadius = 32; this.damage = 20; break;
      case 'moto':  this.collisionRadius = 10; this.damage = 6;  break;
      default:      this.collisionRadius = 20; this.damage = 12;
    }
  }

  update(dt) {
    if (this.waypointIdx >= HIGHWAY.length - 1) {
      // Loop back to start
      this.waypointIdx = 0;
      this.x = HIGHWAY[0].x;
      this.y = HIGHWAY[0].y + this.laneOff;
      return;
    }

    const next = HIGHWAY[this.waypointIdx + 1];
    const tx   = next.x;
    const ty   = next.y + (this.laneOff * (this.type === 'moto' ? Math.sin(Date.now()/2000) : 1));
    const dx   = tx - this.x;
    const dy   = ty - this.y;
    const d    = Math.hypot(dx, dy);

    if (d < this.speed * dt + 4) {
      this.waypointIdx++;
      return;
    }

    this.angle = Math.atan2(dx, -dy);
    this.x += (dx / d) * this.speed * dt;
    this.y += (dy / d) * this.speed * dt;
    this.x  = clamp(this.x, 0, WORLD_W);
  }
}
