// js/ui/NotificationSystem.js – In-world particles and screen notifications

import { lerp } from '../utils.js';

export class NotificationSystem {
  constructor() {
    this.notices   = [];  // {txt, col, life, maxLife, y}
    this.particles = [];  // {x,y,vx,vy,col,sz,life,decay}
  }

  // ── API ─────────────────────────────────────────────────────
  /**
   * Show a floating text notification at centre-screen.
   * @param {string} txt   Message
   * @param {string} col   Colour
   * @param {number} dur   Duration in seconds (default 2.5)
   */
  notify(txt, col = '#FFD700', dur = 2.5) {
    this.notices.push({txt, col, life: dur, maxLife: dur, y: 0});
  }

  /**
   * Spawn world-space particle burst.
   * @param {number} x  World x
   * @param {number} y  World y
   * @param {number} n  Particle count
   * @param {string[]} cols  Colour pool
   */
  burst(x, y, n, cols = ['#FFD700']) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.5) * 120,
        col: cols[Math.floor(Math.random() * cols.length)],
        sz:  5 + Math.random() * 5,
        life: 1,
        decay: 0.9 + Math.random() * 0.4,
      });
    }
  }

  // ── Update ──────────────────────────────────────────────────
  update(dt) {
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x   += p.vx * dt;
      p.y   += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    // Notices
    for (let i = this.notices.length - 1; i >= 0; i--) {
      const n = this.notices[i];
      n.life -= dt;
      if (n.life <= 0) { this.notices.splice(i, 1); continue; }
    }
  }

  // ── Draw ────────────────────────────────────────────────────
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {CameraSystem} cam
   * @param {number} W  Canvas width
   * @param {number} H  Canvas height
   */
  draw(ctx, cam, W, H) {
    // World particles
    for (const p of this.particles) {
      const sp = cam.w2s(p.x, p.y, W, H);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle   = p.col;
      ctx.fillRect(sp.x - p.sz / 2, sp.y - p.sz / 2, p.sz, p.sz);
    }
    ctx.globalAlpha = 1;

    // Screen notifications (centred, float upward)
    this.notices.forEach((n, idx) => {
      const alpha = Math.min(1, n.life);
      const y = H * 0.42 - idx * 32;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = n.col;
      ctx.font = 'bold 22px Segoe UI';
      ctx.textAlign   = 'center';
      ctx.fillText(n.txt, W / 2, y);
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
