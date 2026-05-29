// js/engine/PhysicsEngine.js

import { clamp, dist } from '../utils.js';
import { HIGHWAY, ROAD_W } from '../constants.js';

export class PhysicsEngine {
  constructor() {
    this.offRoadDrag = 0.55;   // per-second speed reduction fraction when off-road
    this.collisionCooldown = 1.5; // seconds of invincibility after hit
  }

  /** Nearest perpendicular distance from point to the highway polyline */
  distToRoad(px, py) {
    let mn = Infinity;
    for (let i = 0; i < HIGHWAY.length - 1; i++) {
      const ax = HIGHWAY[i].x,   ay = HIGHWAY[i].y;
      const bx = HIGHWAY[i+1].x, by = HIGHWAY[i+1].y;
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) { mn = Math.min(mn, dist(px, py, ax, ay)); continue; }
      const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
      mn = Math.min(mn, dist(px, py, ax + t * dx, ay + t * dy));
    }
    return mn;
  }

  /** Apply off-road drag to a truck */
  applyTerrainFriction(truck, dt) {
    const d = this.distToRoad(truck.x, truck.y);
    if (d > ROAD_W / 2 + 10) {
      truck.speed *= (1 - this.offRoadDrag * dt);
    }
  }

  /**
   * Check truck vs all obstacles with circle collision.
   * @param {Truck} truck
   * @param {Obstacle[]} obstacles
   * @param {CameraSystem} camera
   * @param {NotificationSystem} notif
   * @returns {number} total damage dealt this frame
   */
  checkCollisions(truck, obstacles, camera, notif) {
    if (truck.isInvincible) return 0;
    const truckR = 22; // collision radius in world units

    for (const obs of obstacles) {
      const d = dist(truck.x, truck.y, obs.x, obs.y);
      if (d < truckR + obs.collisionRadius) {
        const spd = Math.abs(truck.speed);
        // Damage scales with relative speed
        const speedFactor = clamp(spd / 100, 0.3, 1.5);
        const dmg = Math.round(obs.damage * speedFactor);

        const actual = truck.takeDamage(dmg);
        if (actual > 0) {
          // Bounce-back impulse
          const angle = Math.atan2(truck.y - obs.y, truck.x - obs.x);
          truck.x += Math.cos(angle) * 12;
          truck.y += Math.sin(angle) * 12;
          truck.speed *= 0.35; // lose speed on impact

          camera.shake(clamp(dmg / 40, 0.3, 1.2), 0.4);

          if (notif) {
            notif.notify(`💥 Collision! -${actual} HP`, '#E74C3C', 2.5);
            notif.burst(truck.x, truck.y, 12, ['#E74C3C', '#F39C12', '#FFF']);
          }
        }
        return actual;
      }
    }
    return 0;
  }

  /**
   * Nearest highway waypoint index from a position.
   */
  nearestWaypointIdx(px, py) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < HIGHWAY.length; i++) {
      const d = dist(px, py, HIGHWAY[i].x, HIGHWAY[i].y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
}
