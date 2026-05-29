// js/ui/HUD.js – Version 1.0 HUD with journey progress, smoothed speedometer

import { clamp, lerp, rrect, dist } from '../utils.js';
import { HIGHWAY, HIGHWAY_N25, CITIES, CITY_ORDER, CITY_WAREHOUSES } from '../constants.js';

export class HUD {
  constructor(ctx) {
    this.ctx = ctx;
    this._smoothSpeed = 0;   // lerped display speed (avoids 0-flicker)
  }

  render(truck, missions, economy, progression, weather, W, H, timeOfDay) {
    // Update smoothed speed
    this._smoothSpeed = lerp(this._smoothSpeed, Math.abs(truck.speed), 0.18);

    this._money(economy.money, W, H);
    this._fuel(truck, W, H);
    this._health(truck, W, H);
    this._xpBar(progression, W, H);
    this._speedometer(truck, W, H);
    this._missionPanel(missions, truck, W, H);
    this._timeLimit(missions, W, H);
    this._journeyProgress(missions, truck, W, H);
    this._minimap(truck, missions, W, H);
    this._controls(W, H);
    this._weatherBadge(weather, W, H);
    this._timeIcon(timeOfDay, W, H);
  }

  // ── Money ────────────────────────────────────────────────
  _money(money, W, H) {
    const c = this.ctx;
    rrect(c, 18, 18, 210, 62, 10, 'rgba(0,0,0,0.80)', '#FFD700', 2);
    c.fillStyle = '#FFD700'; c.font = 'bold 13px Segoe UI'; c.fillText('💰  MONEY', 32, 40);
    c.fillStyle = '#FFF';    c.font = 'bold 24px Segoe UI'; c.fillText('$' + money.toLocaleString(), 32, 66);
  }

  // ── Fuel ─────────────────────────────────────────────────
  _fuel(truck, W, H) {
    const c = this.ctx, fx = W - 232, fw = 212;
    rrect(c, fx, 18, fw, 70, 10, 'rgba(0,0,0,0.80)', '#F39C12', 2);
    c.fillStyle = '#F39C12'; c.font = 'bold 13px Segoe UI'; c.fillText('⛽  FUEL', fx + 14, 38);
    const pct  = truck.fuelPct;
    const fcol = pct > 0.5 ? '#2ECC71' : pct > 0.2 ? '#F39C12' : '#E74C3C';
    c.fillStyle = '#1a1a1a'; c.fillRect(fx + 14, 46, fw - 28, 22);
    c.fillStyle = fcol;      c.fillRect(fx + 14, 46, (fw - 28) * pct, 22);
    // Tick marks
    c.fillStyle = 'rgba(255,255,255,0.2)';
    for (let i = 1; i < 4; i++) c.fillRect(fx + 14 + (fw - 28) * i / 4 - 1, 46, 2, 22);
    c.fillStyle = '#FFF'; c.font = '12px Segoe UI'; c.textAlign = 'center';
    c.fillText(`${Math.ceil(truck.fuel)} / ${truck.maxFuel}`, fx + fw / 2, 61);
    c.textAlign = 'left';
    if (pct < 0.2 && Math.sin(Date.now() / 200) > 0) {
      c.fillStyle = 'rgba(231,76,60,0.14)'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#E74C3C'; c.font = 'bold 17px Segoe UI'; c.textAlign = 'center';
      c.fillText('⚠  LOW FUEL – Stop at a station!', W / 2, 100);
      c.textAlign = 'left';
    }
  }

  // ── Health ───────────────────────────────────────────────
  _health(truck, W, H) {
    const c = this.ctx, fx = W - 232, fw = 212;
    rrect(c, fx, 98, fw, 46, 10, 'rgba(0,0,0,0.74)', '#E74C3C', 2);
    c.fillStyle = '#E74C3C'; c.font = 'bold 12px Segoe UI'; c.fillText('❤  HEALTH', fx + 14, 116);
    c.fillStyle = '#1a1a1a'; c.fillRect(fx + 14, 122, fw - 28, 14);
    c.fillStyle = truck.healthPct > 0.6 ? '#2ECC71' : truck.healthPct > 0.3 ? '#F39C12' : '#E74C3C';
    c.fillRect(fx + 14, 122, (fw - 28) * truck.healthPct, 14);
    c.fillStyle = '#FFF'; c.font = '11px Segoe UI'; c.textAlign = 'center';
    c.fillText(`${Math.ceil(truck.health)} / ${truck.maxHealth} HP`, fx + fw / 2, 133);
    c.textAlign = 'left';
  }

  // ── XP bar ────────────────────────────────────────────────
  _xpBar(prog, W, H) {
    const c = this.ctx, fx = W - 232, fw = 212;
    rrect(c, fx, 154, fw, 46, 10, 'rgba(0,0,0,0.74)', '#9B59B6', 2);
    c.fillStyle = '#9B59B6'; c.font = 'bold 11px Segoe UI';
    c.fillText(`⭐ Lv ${prog.level}  ${prog.currentTitle}`, fx + 14, 172);
    c.fillStyle = '#1a1a1a'; c.fillRect(fx + 14, 177, fw - 28, 14);
    c.fillStyle = '#9B59B6';
    c.fillRect(fx + 14, 177, (fw - 28) * prog.levelProgress, 14);
    c.fillStyle = '#FFF'; c.font = '10px Segoe UI'; c.textAlign = 'center';
    c.fillText(`${prog.xpIntoLevel} / ${prog.xpNeededForLevel} XP`, fx + fw / 2, 188);
    c.textAlign = 'left';
  }

  // ── Speedometer (arc + smooth) ────────────────────────────
  _speedometer(truck, W, H) {
    const c   = this.ctx;
    const sx  = W - 198, sy = H - 162, sw = 180, sh = 130;
    rrect(c, sx, sy, sw, sh, 12, 'rgba(0,0,0,0.88)', '#3498DB', 2);
    c.fillStyle = '#3498DB'; c.font = 'bold 12px Segoe UI'; c.fillText('🚚  SPEED', sx + 14, sy + 20);

    const pct = clamp(this._smoothSpeed / truck.maxSpeed, 0, 1);
    const cx2 = sx + sw / 2, cy2 = sy + sh - 35, r = 40;

    // Track
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 9;
    c.beginPath(); c.arc(cx2, cy2, r, Math.PI * 0.75, Math.PI * 2.25); c.stroke();
    // Speed bands
    const bands = [{start:0, end:0.5, col:'#2ECC71'},{start:0.5, end:0.8, col:'#F39C12'},{start:0.8, end:1, col:'#E74C3C'}];
    for (const b of bands) {
      if (pct > b.start) {
        c.strokeStyle = b.col; c.lineWidth = 7;
        const s = lerp(Math.PI*0.75, Math.PI*2.25, b.start);
        const e = lerp(Math.PI*0.75, Math.PI*2.25, Math.min(pct, b.end));
        c.beginPath(); c.arc(cx2, cy2, r, s, e); c.stroke();
      }
    }
    // Needle dot
    const needleAngle = lerp(Math.PI*0.75, Math.PI*2.25, pct);
    c.fillStyle = '#FFF';
    c.beginPath(); c.arc(cx2 + Math.cos(needleAngle)*r, cy2 + Math.sin(needleAngle)*r, 5, 0, Math.PI*2); c.fill();

    c.fillStyle = '#FFF'; c.font = 'bold 22px Segoe UI'; c.textAlign = 'center';
    c.fillText(Math.round(this._smoothSpeed), cx2, cy2 + 9);
    c.fillStyle = '#999'; c.font = '10px Segoe UI';
    c.fillText('km/h', cx2, cy2 + 23);
    c.textAlign = 'left';
  }

  // ── Mission panel ─────────────────────────────────────────
  _missionPanel(missions, truck, W, H) {
    const m = missions.active;
    if (!m) return;
    const c = this.ctx, mw = 430, mx = W / 2 - mw / 2;
    rrect(c, mx, 18, mw, 95, 10, 'rgba(0,0,0,0.84)', '#FFD700', 2);

    // Cargo type badge
    const cargo = m.cargo;
    c.fillStyle = cargo.color; c.font = 'bold 11px Segoe UI'; c.textAlign = 'center';
    c.fillText(`● ${cargo.type.toUpperCase()}`, W / 2, 36);
    c.fillStyle = '#FFD700'; c.font = 'bold 17px Segoe UI';
    c.fillText(m.name, W / 2, 54);
    c.fillStyle = '#CCC'; c.font = '12px Segoe UI';
    if (missions.phase === 'pickup') {
      const fromName = m.fromCityDef?.name || 'Origin';
      c.fillText(`Go to ${fromName} Warehouse to collect cargo`, W / 2, 72);
    } else {
      const d = dist(truck.x, truck.y, missions.deliveryPos.x, missions.deliveryPos.y);
      const toName = m.toCityDef?.name || 'Destination';
      c.fillText(`Deliver to ${toName}  ·  ${Math.round(d / 10)} km remaining`, W / 2, 72);
    }
    const rwd = cargo.calculateReward(truck);
    c.fillStyle = '#2ECC71'; c.font = 'bold 12px Segoe UI';
    c.fillText(`Est. Reward: $${rwd.toLocaleString()}`, W / 2, 88);
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
    const bx = W / 2 - 92, by = 119;
    rrect(c, bx, by, 184, 38, 8, 'rgba(0,0,0,0.84)', col, 2);
    c.fillStyle = col; c.font = 'bold 14px Segoe UI'; c.textAlign = 'center';
    c.fillText(`⏱ ${mins}:${String(secs).padStart(2,'0')} remaining`, W / 2, by + 18);
    if (missions.active.timeBonusAmt) {
      c.fillStyle = '#FFD700'; c.font = '11px Segoe UI';
      c.fillText(`+$${missions.active.timeBonusAmt} time bonus`, W / 2, by + 32);
    }
    c.textAlign = 'left';
  }

  // ── Journey progress bar ──────────────────────────────────
  _journeyProgress(missions, truck, W, H) {
    if (!missions.active || missions.phase !== 'delivery') return;
    const pPos   = missions.pickupPos;
    const dPos   = missions.deliveryPos;
    const total  = dist(pPos.x, pPos.y, dPos.x, dPos.y);
    const remain = dist(truck.x, truck.y, dPos.x, dPos.y);
    const pct    = clamp(1 - remain / total, 0, 1);

    const c  = this.ctx;
    const bx = W / 2 - 200, by = missions.hasTimeLimit ? 162 : 119, bw = 400, bh = 12;

    rrect(c, bx - 4, by - 2, bw + 8, bh + 4, 4, 'rgba(0,0,0,0.7)');
    c.fillStyle = '#222'; c.fillRect(bx, by, bw, bh);
    // Gradient fill
    const grad = c.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#2ECC71'); grad.addColorStop(0.6, '#F39C12'); grad.addColorStop(1, '#E74C3C');
    c.fillStyle = grad; c.fillRect(bx, by, bw * pct, bh);
    // Truck icon on bar
    const tx = bx + bw * pct;
    c.fillStyle = '#FFF'; c.font = '10px Segoe UI'; c.textAlign = 'center';
    c.fillText('🚛', tx, by - 3);
    // Labels
    const fromName = missions.active?.fromCityDef?.name || 'Origin';
    const toName   = missions.active?.toCityDef?.name   || 'Dest';
    c.fillStyle = '#666'; c.font = '9px Segoe UI';
    c.textAlign = 'left';  c.fillText(fromName, bx, by + bh + 11);
    c.textAlign = 'right'; c.fillText(toName,   bx + bw, by + bh + 11);
    c.fillStyle = '#AAA'; c.font = 'bold 10px Segoe UI'; c.textAlign = 'center';
    c.fillText(`${Math.round(pct * 100)}% complete`, bx + bw / 2, by + bh + 11);
    c.textAlign = 'left';
  }

  // ── Minimap (full Pakistan) ───────────────────────────────
  _minimap(truck, missions, W, H) {
    const c = this.ctx, mmX = 18, mmY = H - 365, mmW = 220, mmH = 100;
    const WW = 22000, WH = 8000;
    const sx = mmW / WW, sy = mmH / WH;
    rrect(c, mmX, mmY, mmW, mmH, 6, 'rgba(0,0,0,0.85)', '#555', 1);

    // N5
    c.strokeStyle = '#555'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(mmX + HIGHWAY[0].x * sx, mmY + HIGHWAY[0].y * sy);
    for (let i = 1; i < HIGHWAY.length; i++) c.lineTo(mmX + HIGHWAY[i].x * sx, mmY + HIGHWAY[i].y * sy);
    c.stroke();
    // N25 branch
    c.strokeStyle = '#443'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(mmX + HIGHWAY_N25[0].x * sx, mmY + HIGHWAY_N25[0].y * sy);
    for (let i = 1; i < HIGHWAY_N25.length; i++) c.lineTo(mmX + HIGHWAY_N25[i].x * sx, mmY + HIGHWAY_N25[i].y * sy);
    c.stroke();

    // City dots
    for (const key of CITY_ORDER) {
      const city = CITIES[key];
      c.fillStyle = city.color; c.globalAlpha = 0.85;
      c.beginPath(); c.arc(mmX + city.x * sx, mmY + city.y * sy, 3, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;

    // Mission target blink
    if (missions.active) {
      const tPos = missions.phase === 'pickup' ? missions.pickupPos : missions.deliveryPos;
      const tCol = missions.phase === 'pickup' ? '#2ECC71' : '#E74C3C';
      const pulse = (Math.sin(Date.now() / 300) + 1) * 0.5;
      c.fillStyle = tCol; c.globalAlpha = 0.5 + pulse * 0.5;
      c.fillRect(mmX + tPos.x * sx - 4, mmY + tPos.y * sy - 4, 8, 8);
      c.globalAlpha = 1;
    }

    // Truck icon
    c.save();
    c.translate(mmX + truck.x * sx, mmY + truck.y * sy); c.rotate(truck.angle);
    c.fillStyle = truck.paintColor || '#E74C3C'; c.fillRect(-3, -5, 6, 10);
    c.restore();

    // Map label + M key hint
    c.fillStyle = '#666'; c.font = '9px Segoe UI'; c.textAlign = 'center';
    c.fillText('MAP  [M = Full View]', mmX + mmW / 2, mmY + mmH + 13);
    c.textAlign = 'left';
  }

  // ── Controls ──────────────────────────────────────────────
  _controls(W, H) {
    const c = this.ctx;
    rrect(c, 18, H - 222, 182, 203, 10, 'rgba(0,0,0,0.74)', '#444', 1);
    c.fillStyle = '#FFD700'; c.font = 'bold 12px Segoe UI'; c.fillText('CONTROLS', 32, H - 198);
    c.fillStyle = '#CCC'; c.font = '11px Segoe UI';
    ['W/↑  Accelerate','S/↓  Brake / Rev.','A/←  Steer Left','D/→  Steer Right',
     'F     Refuel','R     Repair','T     Service','H     Horn',
     'M    Country Map','U     Garage','ESC  Pause'
    ].forEach((l, i) => c.fillText(l, 32, H - 176 + i * 17));
  }

  // ── Weather badge ─────────────────────────────────────────
  _weatherBadge(weather, W, H) {
    if (!weather || weather.current === 'sunny') return;
    const c = this.ctx;
    rrect(c, 18, H - 248, 182, 26, 6, 'rgba(0,0,0,0.65)', '#3498DB', 1);
    c.fillStyle = '#7EC8E3'; c.font = 'bold 12px Segoe UI'; c.textAlign = 'center';
    c.fillText(weather.displayName, 18 + 91, H - 229);
    c.textAlign = 'left';
  }

  // ── Day/night icon ────────────────────────────────────────
  _timeIcon(t, W, H) {
    const c = this.ctx;
    const icons = ['🌅','☀️','🌆','🌙'];
    const idx = Math.floor((t * 4) % 4);
    c.fillStyle = 'rgba(0,0,0,0.60)';
    c.beginPath(); c.arc(W - 30, H - 30, 22, 0, Math.PI * 2); c.fill();
    c.font = '16px Segoe UI'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(icons[idx], W - 30, H - 30);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  }
}
