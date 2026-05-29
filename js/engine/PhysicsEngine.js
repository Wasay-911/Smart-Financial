// js/engine/PhysicsEngine.js – Phase 10: multi-highway distance support

import { clamp, dist } from '../utils.js';
import { ALL_HIGHWAYS, ROAD_W } from '../constants.js';

export class PhysicsEngine {
  constructor() {
    this.offRoadDrag = 0.55;
    this.collisionCooldown = 1.5;
  }

  /** Minimum perpendicular distance from point to ANY highway polyline */
  distToRoad(px, py) {
    let mn = Infinity;
    for (const highway of ALL_HIGHWAYS) {
      for (let i = 0; i < highway.length - 1; i++) {
        const ax=highway[i].x, ay=highway[i].y;
        const bx=highway[i+1].x, by=highway[i+1].y;
        const dx=bx-ax, dy=by-ay, len2=dx*dx+dy*dy;
        if (len2===0){mn=Math.min(mn,dist(px,py,ax,ay));continue;}
        const t=clamp(((px-ax)*dx+(py-ay)*dy)/len2,0,1);
        mn=Math.min(mn,dist(px,py,ax+t*dx,ay+t*dy));
      }
    }
    return mn;
  }

  applyTerrainFriction(truck, dt) {
    if (this.distToRoad(truck.x,truck.y)>ROAD_W/2+10) {
      truck.speed*=(1-this.offRoadDrag*dt);
    }
  }

  checkCollisions(truck, obstacles, camera, notif) {
    if (truck.isInvincible) return 0;
    const truckR=22;
    for (const obs of obstacles) {
      const d=dist(truck.x,truck.y,obs.x,obs.y);
      if (d<truckR+obs.collisionRadius) {
        const spd=Math.abs(truck.speed);
        const dmg=Math.round(obs.damage*clamp(spd/100,0.3,1.5));
        const actual=truck.takeDamage(dmg);
        if (actual>0){
          const angle=Math.atan2(truck.y-obs.y,truck.x-obs.x);
          truck.x+=Math.cos(angle)*12; truck.y+=Math.sin(angle)*12;
          truck.speed*=0.35;
          camera?.shake(clamp(dmg/40,0.3,1.2),0.4);
          notif?.notify(`💥 Collision! -${actual} HP`,'#E74C3C',2.5);
          notif?.burst(truck.x,truck.y,12,['#E74C3C','#F39C12','#FFF']);
        }
        return actual;
      }
    }
    return 0;
  }
}
