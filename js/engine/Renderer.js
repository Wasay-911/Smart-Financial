// js/engine/Renderer.js – Canvas world-drawing (Phase 3: weather, new NPC types, paint)

import { clamp, onScreen, shadeHex } from '../utils.js';
import { HIGHWAY, ROAD_W, CITIES, WORLD_W, WORLD_H } from '../constants.js';

const BLDG_RECTS = [
  [-70,-88,38,88],[-18,-65,30,65],[20,-78,44,78],[76,-68,32,68],
  [-110,-50,28,50],[112,-55,30,55],[-44,-40,24,40],[56,-44,22,44],
];

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.W   = 0;
    this.H   = 0;
  }

  resize(W, H) { this.W = W; this.H = H; }

  _s(wx, wy, cam) { return cam.w2s(wx, wy, this.W, this.H); }

  // ── Sky / background ──────────────────────────────────────
  drawBackground(timeOfDay) {
    const [sc, gc] = this._dayGradient(timeOfDay);
    const g = this.ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, sc); g.addColorStop(1, gc);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  _dayGradient(t) {
    if      (t < 0.1)  return ['#FF6B35','#C9AA7C'];
    else if (t < 0.4)  return ['#87CEEB','#C9AA7C'];
    else if (t < 0.6)  return ['#FF7043','#B07050'];
    else if (t < 0.8)  return ['#1a1a3e','#302010'];
    else               return ['#0a0a1e','#201508'];
  }

  // ── Terrain ───────────────────────────────────────────────
  drawTerrain(cam, timeOfDay) {
    const c = this.ctx;
    const [, gc] = this._dayGradient(timeOfDay);
    c.fillStyle = gc; c.fillRect(0, 0, this.W, this.H);

    c.globalAlpha = 0.28;
    for (let i = 0; i < 60; i++) {
      const wx = (i * 557 + 300) % WORLD_W, wy = (i * 347 + 200) % WORLD_H;
      const sp = this._s(wx, wy, cam);
      const sz = (60 + (i * 97) % 180) * cam.zoom;
      if (!onScreen(sp.x, sp.y, sz, this.W, this.H)) continue;
      c.fillStyle = i % 3 === 0 ? '#A08050' : i % 3 === 1 ? '#B8C48A' : '#D4A060';
      c.beginPath(); c.ellipse(sp.x, sp.y, sz, sz * 0.55, (i * 0.6) % Math.PI, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;

    // Bushes
    c.fillStyle = '#5A8A40';
    for (let i = 0; i < 50; i++) {
      const wx = (i * 811 + 600) % WORLD_W, wy = (i * 503 + 300) % WORLD_H;
      const sp = this._s(wx, wy, cam);
      const sz = (10 + (i % 12)) * cam.zoom;
      if (!onScreen(sp.x, sp.y, sz * 2, this.W, this.H)) continue;
      c.beginPath(); c.arc(sp.x, sp.y, sz, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4A7030';
      c.beginPath(); c.arc(sp.x - sz * 0.3, sp.y - sz * 0.2, sz * 0.7, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5A8A40';
    }
  }

  // ── Road ──────────────────────────────────────────────────
  drawRoad(cam) {
    const c   = this.ctx;
    const pts = HIGHWAY.map(p => this._s(p.x, p.y, cam));
    const zr  = ROAD_W * cam.zoom;

    c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = zr + 14 * cam.zoom; c.strokeStyle = '#111';
    this._polyline(c, pts);

    c.lineWidth = zr; c.strokeStyle = '#3D3D3D';
    this._polyline(c, pts);

    // Road shoulders
    c.lineWidth = 6 * cam.zoom; c.strokeStyle = 'rgba(255,255,255,0.25)'; c.setLineDash([]);
    // (single road; edges implied by shadow)

    c.lineWidth = 4 * cam.zoom; c.strokeStyle = '#FFD700';
    c.setLineDash([55 * cam.zoom, 35 * cam.zoom]);
    this._polyline(c, pts);
    c.setLineDash([]);
  }

  _polyline(c, pts) {
    c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.stroke();
  }

  // ── Cities ────────────────────────────────────────────────
  drawCities(cam) { for (const k in CITIES) this._drawCity(CITIES[k], cam); }

  _drawCity(city, cam) {
    const sp = this._s(city.x, city.y, cam);
    if (!onScreen(sp.x, sp.y, 350, this.W, this.H)) return;
    const c = this.ctx;
    c.globalAlpha = 0.88;
    BLDG_RECTS.forEach(([bx, by, bw, bh], bi) => {
      c.fillStyle = bi % 2 === 0 ? city.color : shadeHex(city.color, -25);
      c.fillRect(sp.x + bx * cam.zoom, sp.y + by * cam.zoom, bw * cam.zoom, bh * cam.zoom);
      c.fillStyle = 'rgba(255,240,180,0.5)';
      for (let wy = by + 10; wy < by + bh - 10; wy += 18)
        for (let wx = bx + 6; wx < bx + bw - 6; wx += 12)
          c.fillRect(sp.x + wx * cam.zoom, sp.y + wy * cam.zoom, 5 * cam.zoom, 7 * cam.zoom);
    });
    c.globalAlpha = 1;
    c.save(); c.shadowColor = '#000'; c.shadowBlur = 6;
    c.fillStyle = '#FFF'; c.font = `bold ${clamp(20 * cam.zoom, 11, 28)}px Segoe UI`; c.textAlign = 'center';
    c.fillText(city.name, sp.x, sp.y - 95 * cam.zoom);
    c.restore(); c.textAlign = 'left';
  }

  // ── Fuel stations ─────────────────────────────────────────
  drawFuelStations(stations, cam, truck) {
    for (const st of stations) {
      const sp = this._s(st.x, st.y, cam);
      if (!onScreen(sp.x, sp.y, 200, this.W, this.H)) continue;
      const c = this.ctx, sz = 18 * cam.zoom;
      c.fillStyle = '#F39C12'; c.fillRect(sp.x - sz * 1.6, sp.y - sz * 0.3, sz * 3.2, sz * 0.45);
      c.fillStyle = '#E67E22'; c.fillRect(sp.x - sz, sp.y - sz, sz * 2, sz * 2);
      c.fillStyle = '#BDC3C7'; c.fillRect(sp.x - sz * 0.35, sp.y - sz * 0.7, sz * 0.7, sz * 1.4);
      c.fillStyle = '#FFF'; c.font = `${clamp(11 * cam.zoom, 8, 15)}px Segoe UI`; c.textAlign = 'center';
      c.fillText(st.name, sp.x, sp.y - sz - 6);
      if (truck && st.isInRange(truck)) {
        c.fillStyle = '#2ECC71'; c.font = `bold ${clamp(13 * cam.zoom, 9, 16)}px Segoe UI`;
        c.fillText('F=Refuel  R=Repair  T=Service', sp.x, sp.y - sz - 26);
      }
      c.textAlign = 'left';
    }
  }

  // ── Mission markers ───────────────────────────────────────
  drawMissionMarkers(mission, cam, truck) {
    if (!mission || !mission.phase) return;
    const t = Date.now() / 1000, pulse = (Math.sin(t * 3) + 1) * 0.5;
    const c = this.ctx;
    let tx, ty, col, lbl;
    if (mission.phase === 'pickup')   { ({x:tx,y:ty} = mission.pickupPos);   col='#2ECC71'; lbl='PICKUP'; }
    else if (mission.phase==='delivery') { ({x:tx,y:ty} = mission.deliveryPos);col='#E74C3C'; lbl='DELIVER'; }
    else return;
    const sp = this._s(tx, ty, cam);
    c.globalAlpha = 0.65 - pulse * 0.25; c.strokeStyle = col; c.lineWidth = 3;
    c.beginPath(); c.arc(sp.x, sp.y, (28 + pulse * 16) * cam.zoom, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = col; c.beginPath(); c.arc(sp.x, sp.y, 13 * cam.zoom, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#FFF'; c.font = `bold ${clamp(9 * cam.zoom, 7, 13)}px Segoe UI`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(lbl, sp.x, sp.y);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    if (!onScreen(sp.x, sp.y, 30, this.W, this.H)) this._drawArrow(tx, ty, col, cam, truck);
  }

  _drawArrow(wx, wy, col, cam, truck) {
    if (!truck) return;
    const angle = Math.atan2(wy - cam.y, wx - cam.x);
    const margin = 65;
    const ax = this.W / 2 + Math.cos(angle) * (Math.min(this.W, this.H) / 2 - margin);
    const ay = this.H / 2 + Math.sin(angle) * (Math.min(this.W, this.H) / 2 - margin);
    const c = this.ctx;
    c.save(); c.translate(ax, ay); c.rotate(angle + Math.PI / 2);
    c.fillStyle = col; c.beginPath(); c.moveTo(0, -22); c.lineTo(13, 12); c.lineTo(-13, 12); c.closePath(); c.fill();
    c.rotate(-(angle + Math.PI / 2));
    const d = Math.hypot(wx - truck.x, wy - truck.y);
    c.fillStyle = '#FFF'; c.font = 'bold 12px Segoe UI'; c.textAlign = 'center';
    c.fillText(Math.round(d / 10) + ' km', 0, 32);
    c.restore();
  }

  // ── Player Truck ──────────────────────────────────────────
  drawTruck(truck, cam) {
    const sp = this._s(truck.x, truck.y, cam);
    const c  = this.ctx;
    const tw = 14, th = 30;

    c.save();
    c.translate(sp.x, sp.y); c.rotate(truck.angle); c.scale(cam.zoom, cam.zoom);

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.beginPath(); c.ellipse(3, 3, tw, th * 0.55, 0, 0, Math.PI * 2); c.fill();

    // Trailer
    const cg = truck.hasCargo ? truck.cargo : null;
    c.fillStyle = cg ? cg.color : '#7F8C8D';
    c.fillRect(-tw + 1, 4, (tw - 1) * 2, th - 4);
    c.fillStyle = cg ? shadeHex(cg.color, 15) : '#959EA0';
    c.fillRect(-tw + 4, 7, (tw - 4) * 2, 8);
    if (cg) {
      c.fillStyle = 'rgba(255,255,255,0.18)';
      for (let i = 0; i < 3; i++) c.fillRect(-tw + 4, 12 + i * 10, (tw - 4) * 2, 4);
    }

    // Cab – use truck's paintColor
    const cabFlash = truck.isInvincible && Math.sin(Date.now() / 90) > 0;
    c.fillStyle = cabFlash ? '#FF9999' : truck.paintColor;
    c.fillRect(-tw, -th, tw * 2, th + 8);
    c.fillStyle = shadeHex(truck.paintColor, -30);
    c.fillRect(-tw + 1, -th + 1, tw * 2 - 2, th * 0.44);
    c.fillStyle = 'rgba(100,200,255,0.82)'; c.fillRect(-tw + 4, -th + 3, tw * 2 - 8, th * 0.37);
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-tw + 6, -th + 4, 6, th * 0.18);
    // Mirrors
    c.fillStyle = truck.paintColor;
    c.fillRect(-tw - 5, -th + 8, 5, 7); c.fillRect(tw, -th + 8, 5, 7);
    // Wheels
    c.fillStyle = '#1C1C1C';
    [[-th + 16], [-2], [th - 18]].forEach(([fy]) => {
      c.fillRect(-tw - 7, fy, 8, 13); c.fillRect(tw - 1, fy, 8, 13);
      c.fillStyle = '#888';
      c.fillRect(-tw - 5, fy + 2, 4, 9); c.fillRect(tw + 1, fy + 2, 4, 9);
      c.fillStyle = '#1C1C1C';
    });
    // Lights
    c.fillStyle = '#FFFDE7';
    c.fillRect(-tw + 2, -th, 8, 4); c.fillRect(tw - 10, -th, 8, 4);
    c.fillStyle = '#E74C3C';
    c.fillRect(-tw + 2, th - 2, 8, 4); c.fillRect(tw - 10, th - 2, 8, 4);
    // Golden grill (Pakistani style)
    c.fillStyle = 'rgba(255,215,0,0.65)';
    c.fillRect(-tw + 2, -th + th * 0.48, tw * 2 - 4, 2);

    c.restore();

    // Exhaust particles
    if (truck.speedAbs > 30 && Math.random() < 0.35) {
      const ex = truck.x - Math.sin(truck.angle) * 32;
      const ey = truck.y + Math.cos(truck.angle) * 32;
      // Particle spawn deferred to NotificationSystem via GameEngine
    }
  }

  // ── Obstacles & NPC traffic ───────────────────────────────
  drawObstacles(obstacles, cam) {
    for (const obs of obstacles) {
      const sp = this._s(obs.x, obs.y, cam);
      if (!onScreen(sp.x, sp.y, 80, this.W, this.H)) continue;
      obs.isNPC ? this._drawNPC(obs, sp, cam) : this._drawStaticObs(obs, sp, cam);
    }
  }

  _drawNPC(npc, sp, cam) {
    const c = this.ctx;
    const props = {
      truck: {tw:12, th:26, roofFrac:0.44},
      car:   {tw:8,  th:16, roofFrac:0.40},
      bus:   {tw:16, th:36, roofFrac:0.25},
      moto:  {tw:4,  th:10, roofFrac:0.30},
    }[npc.type] || {tw:10, th:20, roofFrac:0.38};

    const {tw, th, roofFrac} = props;
    c.save(); c.translate(sp.x, sp.y); c.rotate(npc.angle); c.scale(cam.zoom, cam.zoom);

    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.beginPath(); c.ellipse(2, 2, tw, th * 0.5, 0, 0, Math.PI * 2); c.fill();

    // Body
    c.fillStyle = npc.color; c.fillRect(-tw, -th, tw * 2, th * 2);
    c.fillStyle = shadeHex(npc.color, -30); c.fillRect(-tw + 2, -th + 2, tw * 2 - 4, th * roofFrac);

    // Windshield
    c.fillStyle = 'rgba(150,220,255,0.7)';
    c.fillRect(-tw + 3, -th + 3, tw * 2 - 6, th * (roofFrac - 0.06));

    // Wheels
    c.fillStyle = '#1C1C1C';
    c.fillRect(-tw - 4, -th + 8, 4, 10); c.fillRect(tw, -th + 8, 4, 10);
    c.fillRect(-tw - 4, th - 14, 4, 10); c.fillRect(tw, th - 14, 4, 10);

    // Bus windows
    if (npc.type === 'bus') {
      c.fillStyle = 'rgba(180,230,255,0.5)';
      for (let i = 0; i < 3; i++) c.fillRect(-tw + 3, -th * 0.3 + i * 12, tw * 2 - 6, 8);
    }

    // Motorcycle rider
    if (npc.type === 'moto') {
      c.fillStyle = '#FFD700'; c.fillRect(-3, -th - 4, 6, 6); // helmet
    }

    c.restore();
  }

  _drawStaticObs(obs, sp, cam) {
    const c = this.ctx, sz = obs.collisionRadius * cam.zoom;
    if (obs.type === 'rock') {
      c.fillStyle = '#8B7355'; c.beginPath(); c.arc(sp.x, sp.y, sz, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#A08060'; c.beginPath(); c.arc(sp.x - sz * 0.3, sp.y - sz * 0.3, sz * 0.45, 0, Math.PI * 2); c.fill();
    } else if (obs.type === 'barrel') {
      c.fillStyle = '#E74C3C'; c.fillRect(sp.x - sz, sp.y - sz * 1.3, sz * 2, sz * 2.6);
      c.fillStyle = '#FFF'; c.fillRect(sp.x - sz, sp.y - sz * 0.1, sz * 2, sz * 0.25);
    }
  }

  // ── Day/night overlay ─────────────────────────────────────
  drawDayNightOverlay(timeOfDay) {
    let darkness = 0;
    if      (timeOfDay > 0.6 && timeOfDay < 0.7) darkness = (timeOfDay - 0.6) / 0.1;
    else if (timeOfDay >= 0.7 && timeOfDay <= 0.8) darkness = 1;
    else if (timeOfDay > 0.8 && timeOfDay < 0.9) darkness = 1 - (timeOfDay - 0.8) / 0.1;
    if (darkness > 0) {
      this.ctx.fillStyle = `rgba(0,0,20,${darkness * 0.55})`;
      this.ctx.fillRect(0, 0, this.W, this.H);
    }
  }
}
