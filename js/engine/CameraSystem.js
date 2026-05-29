// js/engine/CameraSystem.js

import { lerp, clamp } from '../utils.js';
import { WORLD_W, WORLD_H } from '../constants.js';

export class CameraSystem {
  constructor(zoom = 1.4) {
    this.x    = 500;
    this.y    = 2000;
    this.zoom = zoom;

    // Shake state
    this._shakeX  = 0;
    this._shakeY  = 0;
    this._shakeDur = 0;
    this._shakeMax = 0;

    this.smoothFactor = 4.5;
  }

  /** Smoothly follow a target object with {x, y} */
  follow(target, dt) {
    this.x = lerp(this.x, target.x, this.smoothFactor * dt);
    this.y = lerp(this.y, target.y, this.smoothFactor * dt);

    // Clamp to world bounds
    this.x = clamp(this.x, 0, WORLD_W);
    this.y = clamp(this.y, 0, WORLD_H);

    // Update shake
    if (this._shakeDur > 0) {
      this._shakeDur -= dt;
      const t = this._shakeDur / this._shakeMax;
      const mag = this._shakeMax * t * 20;
      this._shakeX = (Math.random() * 2 - 1) * mag;
      this._shakeY = (Math.random() * 2 - 1) * mag;
    } else {
      this._shakeX = 0;
      this._shakeY = 0;
    }
  }

  /** Trigger a camera shake */
  shake(intensity = 1.0, duration = 0.4) {
    this._shakeMax = duration;
    this._shakeDur = duration * intensity;
  }

  /** Convert world coordinates → screen pixels */
  w2s(wx, wy, W, H) {
    return {
      x: (wx - this.x) * this.zoom + W * 0.5 + this._shakeX,
      y: (wy - this.y) * this.zoom + H * 0.5 + this._shakeY,
    };
  }

  /** Teleport instantly to position */
  snapTo(x, y) {
    this.x = x;
    this.y = y;
  }
}
