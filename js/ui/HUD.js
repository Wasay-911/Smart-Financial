// js/ui/HUD.js – Phase 3 HUD (XP bar, level, weather, time limit countdown, wear)

import { clamp, lerp, rrect, dist } from '../utils.js';
import { HIGHWAY } from '../constants.js';

export class HUD {
  constructor(ctx) { this.ctx = ctx; }

  render(truck, missions, economy, progression, weather, W, H, timeOfDay) {
    this._money(economy.money, W, H);
    this._fuel(truck, W, H);
    this._health(truck, W, H);
    this._xpBar(progression, W, H);
    this._speedometer(truck, W, H);
    this._mission(missions, truck, W, H);
    this._timeLimit(missions, W, H);
    this._minimap(truck, missions, W, H);
    this._controls(W, H);
    this._weatherBadge(weather, W, H);
    this._timeIcon(timeOfDay, W, H);
    this._passiveIncome(W, H);
  }

  // ── Money ────────────────────────────────────────────────
  _money(money, W, H) {
    const c = this.ctx;
    rrect(c, 18, 18, 210, 62, 10, 'rgba(0,0,0,0.78)', '#FFD700', 2);
    c.fillStyle = '#FFD700'; c.font = 'bold 13px Segoe UI'; c.fillText('💰  MONEY', 32, 40);
    c.fillStyle = '#FFF';    c.font = 'bold 24px Segoe UI'; c.fillText('$' + money.toLocaleString(), 32, 66);
  }

  // ── Fuel ─────────────────────────────────────────────────
  _fuel(truck, W, H) {
    const c = this.ctx, fx = W - 232, fw = 212;
    rrect(c, fx, 18, fw, 70, 10, 'rgba(0,0,0,0.78)', '#F39C12', 2);
    c.fillStyle = '#F39C12'; c.font = 'bold 13px Segoe UI'; c.fillText('⛽  FUEL', fx + 14, 38);
    const pct  = truck.fuelPct;
    const fcol = pct > 0.5 ? '#2ECC71' : pct > 0.2 ? '#F39C12' : '#E74C3C';
    c.fillStyle = '#1a1a1a'; c.fillRect(fx + 14, 46, fw - 28, 22);
    c.fillStyle = fcol;      c.fillRect(fx + 14, 46, (fw - 28) * pct, 22);
    c.fillStyle = '#FFF'; c.font = '12px Segoe UI'; c.textAlign = 'center';
    c.fillText(`${Math.ceil(truck.fuel)} / ${truck.maxFuel}`, fx + fw / 2, 61);
    c.textAlign = 'left';
    if (pct < 0.2 && Math.sin(Date.now() / 200) > 0) {
      c.fillStyle = 'rgba(231,76,60,0.15)'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#E74C3C'; c.font = 'bold 17px Segoe UI'; c.textAlign = 'center';
      c.fillText('⚠  LOW FUEL – Stop at a station!', W / 2, 100);
      c.textAlign = 'left';
    }
  }

  // ── Health ───────────────────────────────────────────────
  _health(truck, W, H) {
    const c = this.ctx, fx = W - 232, fw = 212;
    rrect(c, fx, 98, fw, 46, 10, 'rgba(0,0,0,0.72)', '#E74C3C', 2);
    c.fillStyle = '#E74C3C'; c.font = 'bold 12px Segoe UI'; c.fillText('❤  HEALTH', fx + 14, 116);
    c.fillStyle = '#1a1a1a'; c.fillRect(fx + 14, 122, fw - 28, 14);
    c.fillStyle = truck.healthPct > 0.5 ? '#E74C3C' : '#FF6B35';
    c.fillRect(fx + 14, 122, (fw - 28) * truck.healthPct, 14);
    c.fillStyle = '#FFF'; c.font = '11px Segoe UI'; c.textAlign = 'center';
    c.fillText(`${Math.ceil(truck.health)} / ${truck.maxHealth}`, fx + fw / 2, 133);
    c.textAlign = 'left';
  }

  // ── XP bar ────────────────────────────────────────────────
  _xpBar(prog, W, H) {
    const c = this.ctx, fx = W - 232, fw = 212;
    rrect(c, fx, 154, fw, 46, 10, 'rgba(0,0,0,0.72)', '#9B59B6', 2);
    c.fillStyle = '#9B59B6'; c.font = 'bold 11px Segoe UI';
    c.fillText(`⭐ Lv ${prog.level}  ${prog.currentTitle}`, fx + 14, 171);
    c.fillStyle = '#1a1a1a'; c.fillRect(fx + 14, 176, fw - 28, 14);
    c.fillStyle = '#9B59B6';
    c.fillRect(fx + 14, 176, (fw - 28) * prog.levelProgress, 14);
    c.fillStyle = '#FFF'; c.font = '10px Segoe UI'; c.textAlign = 'center';
    c.fillText(`${prog.xpIntoLevel} / ${prog.xpNeededForLevel} XP`, fx + fw / 2, 187);
    c.textAlign = 'left';
  }

  // ── Speedometer ──────────────────────────────────────────
  _speedometer(truck, W, H) {
    const c  = this.ctx;
    const sx = W - 198, sy = H - 162, sw = 180, sh = 130;
    rrect(c, sx, sy, sw, sh, 12, 'rgba(0,0,0,0.85)', '#3498DB', 2);
    c.fillStyle = '#3498DB'; c.font = 'bold 12px Segoe UI'; c.fillText('🚚  SPEED', sx + 14, sy + 20);
    const pct = Math.abs(truck.speed) / truck.maxSpeed;
    const cx2 = sx + sw / 2, cy2 = sy + sh - 35, r = 40;
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 9;
    c.beginPath(); c.arc(cx2, cy2, r, Math.PI * 0.75, Math.PI * 2.25); c.stroke();
    c.strokeStyle = pct < 0.5 ? '#2ECC71' : pct < 0.8 ? '#F39C12' : '#E74C3C'; c.lineWidth = 7;
    c.beginPath(); c.arc(cx2, cy2, r, Math.PI * 0.75, lerp(Math.PI * 0.75, Math.PI * 2.25, pct)); c.stroke();
    c.fillStyle = '#FFF'; c.font = 'bold 24px Segoe UI'; c.textAlign = 'center';
    c.fillText(Math.round(Math.abs(truck.speed)), cx2, cy2 + 9);
    c.fillStyle = '#999'; c.font = '10px Segoe UI'; c.fillText('km/h', cx2, cy2 + 23);
    c.textAlign = 'left';
  }

  // ── Mission banner ────────────────────────────────────────
  _mission(missions, truck, W, H) {
    const m = missions.active;
    if (!m) return;
    const c = this.ctx, mw = 430, mx = W / 2 - mw / 2;
    rrect(c, mx, 18, mw, 92, 10, 'rgba(0,0,0,0.82)', '#FFD700', 2);
    const cargo = m.cargo;
    c.fillStyle = cargo.color; c.font = 'bold 11px Segoe UI'; c.textAlign = 'center';
    c.fillText('● ' + cargo.type.toUpperCase(), W / 2, 36);
    c.fillStyle = '#FFD700'; c.font = 'bold 18px Segoe UI'; c.fillText(m.name, W / 2, 56);
    c.fillStyle = '#CCC'; c.font = '12px Segoe UI';
    if (missions.phase === 'pickup') {
      c.fillText('Go to Karachi Warehouse to collect cargo', W / 2, 76);
    } else {
      const d = dist(truck.x, truck.y, missions.deliveryPos.x, missions.deliveryPos.y);
      c.fillText('Deliver to Hyderabad — ' + Math.round(d / 10) + ' km remaining', W / 2, 76);
    }
    const rwd = cargo.calculateReward(truck);
    c.fillStyle = '#2ECC71'; c.font = 'bold 12px Segoe UI';
    c.fillText('Est. Reward: $' + rwd.toLocaleString(), W / 2, 94);
    c.textAlign = 'left';
  }

  // ── Time limit countdown ──────────────────────────────────
  _timeLimit(missions, W, H) {
    if (!missions.hasTimeLimit || !missions.active) return;
    const rem  = missions.timeRemaining;
    const mins = Math.floor(rem / 60), secs = Math.floor(rem % 60);
    const pct  = rem / missions.active.timeLimit;
    const col  = pct > 0.5 ? '#2ECC71' : pct > 0.2 ? '#F39C12' : '#E74C3C';
    const c    = this.ctx;
    const bx   = W / 2 - 90, by = 116;
    rrect(c, bx, by, 180, 38, 8, 'rgba(0,0,0,0.82)', col, 2);
    c.fillStyle = col; c.font = 'bold 14px Segoe UI'; c.textAlign = 'center';
    c.fillText(`⏱ ${mins}:${String(secs).padStart(2,'0')} remaining`, W / 2, by + 18);
    // Bonus label
    if (missions.active.timeBonusAmt) {
      c.fillStyle = '#FFD700'; c.font = '11px Segoe UI';
      c.fillText(`+$${missions.active.timeBonusAmt} bonus if on time`, W / 2, by + 32);
    }
    c.textAlign = 'left';
  }

  // ── Minimap ───────────────────────────────────────────────
  _minimap(truck, missions, W, H) {
    const c = this.ctx, mmX = 18, mmY = H - 355, mmW = 178, mmH = 130;
    const WORLD_W = 9000, WORLD_H = 4000;
    const sx = mmW / WORLD_W, sy = mmH / WORLD_H;
    rrect(c, mmX, mmY, mmW, mmH, 6, 'rgba(0,0,0,0.82)', '#555', 1);
    c.strokeStyle = '#555'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(mmX + HIGHWAY[0].x * sx, mmY + HIGHWAY[0].y * sy);
    for (let i = 1; i < HIGHWAY.length; i++) c.lineTo(mmX + HIGHWAY[i].x * sx, mmY + HIGHWAY[i].y * sy);
    c.stroke();
    if (missions.active) {
      const tPos = missions.phase === 'pickup' ? missions.pickupPos : missions.deliveryPos;
      const tCol = missions.phase === 'pickup' ? '#2ECC71' : '#E74C3C';
      const pulse = (Math.sin(Date.now() / 300) + 1) * 0.5;
      c.fillStyle = tCol; c.globalAlpha = 0.5 + pulse * 0.5;
      c.fillRect(mmX + tPos.x * sx - 4, mmY + tPos.y * sy - 4, 8, 8);
      c.globalAlpha = 1;
    }
    c.save(); c.translate(mmX + truck.x * sx, mmY + truck.y * sy); c.rotate(truck.angle);
    c.fillStyle = truck.paintColor || '#E74C3C'; c.fillRect(-3, -5, 6, 10);
    c.restore();
    c.fillStyle = '#777'; c.font = '9px Segoe UI'; c.textAlign = 'center';
    c.fillText('MAP', mmX + mmW / 2, mmY + mmH + 13);
    c.textAlign = 'left';
  }

  // ── Controls ──────────────────────────────────────────────
  _controls(W, H) {
    const c = this.ctx;
    rrect(c, 18, H - 205, 182, 186, 10, 'rgba(0,0,0,0.72)', '#444', 1);
    c.fillStyle = '#FFD700'; c.font = 'bold 12px Segoe UI'; c.fillText('CONTROLS', 32, H - 182);
    c.fillStyle = '#CCC'; c.font = '11px Segoe UI';
    ['W/↑  Accelerate','S/↓  Brake / Rev.','A/←  Steer Left','D/→  Steer Right',
     'F     Refuel','R     Repair','T     Service','H     Horn',
     'U     Garage','ESC  Pause'].forEach((l, i) => c.fillText(l, 32, H - 160 + i * 17));
  }

  // ── Weather badge ─────────────────────────────────────────
  _weatherBadge(weather, W, H) {
    if (!weather || weather.current === 'sunny') return;
    const c = this.ctx;
    rrect(c, 18, H - 240, 182, 28, 6, 'rgba(0,0,0,0.65)', '#3498DB', 1);
    c.fillStyle = '#7EC8E3'; c.font = 'bold 12px Segoe UI'; c.textAlign = 'center';
    c.fillText(weather.displayName, 18 + 91, H - 220);
    c.textAlign = 'left';
  }

  // ── Day/night indicator ───────────────────────────────────
  _timeIcon(t, W, H) {
    const c = this.ctx;
    const icons = ['🌅','☀️','🌆','🌙'];
    const idx = Math.floor((t * 4) % 4);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.beginPath(); c.arc(W - 30, H - 30, 22, 0, Math.PI * 2); c.fill();
    c.font = '16px Segoe UI'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(icons[idx], W - 30, H - 30);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  }

  // ── Passive income ticker ─────────────────────────────────
  _passiveIncome(W, H) { /* shown in money panel if fleet has drivers */ }
}
