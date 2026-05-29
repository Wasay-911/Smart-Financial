// js/entities/Obstacle.js – Static obstacles and NPC traffic

import { clamp } from '../utils.js';
import { HIGHWAY, WORLD_W } from '../constants.js';

/** Static obstacle (rock, barrel) */
export class StaticObstacle {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.type = def.type;
    this.collisionRadius = def.r;
    this.damage = def.dmg;
    this.isNPC = false;
  }

  update(_dt) {}  // static – no movement
}

/**
 * NPC vehicle that follows the highway waypoints in a loop.
 * Drives from Karachi (index 0) to Hyderabad (last index) then resets.
 */
export class NPCVehicle {
  constructor(def) {
    this.type  = def.type;  // 'truck' | 'car'
    this.color = def.color;
    this.speed = def.speed; // km/h in game units/s
    this.laneOff = def.laneOff || 12; // lateral offset from road centre

    this.waypointIdx = clamp(def.waypointIdx || 0, 0, HIGHWAY.length - 2);
    this.x     = HIGHWAY[this.waypointIdx].x;
    this.y     = HIGHWAY[this.waypointIdx].y + this.laneOff;
    this.angle = Math.PI / 2; // initially facing east

    // Collision
    this.isNPC = true;
    this.collisionRadius = this.type === 'truck' ? 28 : 20;
    this.damage = this.type === 'truck' ? 15 : 10;

    this._progress = 0; // distance along current segment
  }

  update(dt) {
    if (this.waypointIdx >= HIGHWAY.length - 1) {
      // Loop back to start
      this.waypointIdx = 0;
      this.x = HIGHWAY[0].x;
      this.y = HIGHWAY[0].y + this.laneOff;
      return;
    }

    const curr = HIGHWAY[this.waypointIdx];
    const next = HIGHWAY[this.waypointIdx + 1];

    const tx = next.x + this.laneOff * Math.sin(this.angle);
    const ty = next.y;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d  = Math.hypot(dx, dy);

    if (d < this.speed * dt + 4) {
      this.waypointIdx++;
      return;
    }

    // Update facing angle
    // Convention: sin(angle)*speed = vx, -cos(angle)*speed = vy
    this.angle = Math.atan2(dx, -dy);

    this.x += (dx / d) * this.speed * dt;
    this.y += (dy / d) * this.speed * dt;

    // Clamp to world
    this.x = clamp(this.x, 0, WORLD_W);
  }
}
