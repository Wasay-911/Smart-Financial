// js/ui/MenuSystem.js – v1.0 (tutorial, route preview, achievements, daily reward, fleet, profile, settings)

import { clamp, rrect, uiBtn, shadeHex } from '../utils.js';
import { UPGRADE_DEFS, CARGO_DEFS, TRUCK_DEFS, PAINT_COLORS, CITIES, HIGHWAY, HIGHWAY_N25 } from '../constants.js';
import { TUTORIAL_STEPS } from '../systems/TutorialSystem.js';
import { CONFIG } from '../config.js';

export class MenuSystem {
  constructor(ctx) {
    this.ctx  = ctx;
    this._pts = [];
    this._t   = 0;
  }

  // ── Main Menu ─────────────────────────────────────────────
  drawMainMenu(dt, missionCount, money, level, title, mouse, W, H) {
    this._t += dt;
    const c = this.ctx;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,'#06071a'); g.addColorStop(0.7,'#181a3a'); g.addColorStop(1,'#0d0d12');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (!this._pts.length) this._initStars(W, H);
    c.fillStyle = '#FFF';
    for (const p of this._pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < 0) { p.y = H; p.x = Math.random() * W; }
      c.globalAlpha = p.o; c.fillRect(p.x, p.y, p.s, p.s);
    }
    c.globalAlpha = 1;
    c.fillStyle = '#18140e'; c.fillRect(0, H * 0.62, W, H * 0.38);
    c.fillStyle = '#2a2820'; c.fillRect(0, H * 0.70, W, H * 0.12);
    c.fillStyle = '#FFD700'; c.globalAlpha = 0.65;
    const off = (this._t * 68) % 100;
    for (let x = -100; x < W + 100; x += 100) c.fillRect(x - off, H * 0.755, 72, 4);
    c.globalAlpha = 1;
    this._truckSil(W * 0.18 + Math.sin(this._t * 0.5) * 14, H * 0.68, c);
    c.fillStyle = 'rgba(255,250,215,0.88)';
    c.beginPath(); c.arc(W * 0.82, H * 0.11, 36, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#07091a';
    c.beginPath(); c.arc(W * 0.82 - 12, H * 0.11 - 8, 32, 0, Math.PI * 2); c.fill();

    c.save();
    c.shadowColor = '#FFD700'; c.shadowBlur = 40; c.fillStyle = '#FFD700';
    c.font = `bold ${clamp(W * 0.085, 40, 82)}px Segoe UI`; c.textAlign = 'center';
    c.fillText('MOHALLAH', W / 2, H * 0.22);
    c.shadowColor = '#FFF'; c.shadowBlur = 22; c.fillStyle = '#FFF';
    c.font = `bold ${clamp(W * 0.055, 28, 55)}px Segoe UI`;
    c.fillText('LOGESTIC', W / 2, H * 0.22 + clamp(W * 0.083, 40, 74));
    c.restore();
    c.fillStyle = '#F39C12'; c.font = `${clamp(W * 0.022, 14, 22)}px Segoe UI`; c.textAlign = 'center';
    c.fillText('TRUCK SIMULATION RPG  –  Phase 3', W / 2, H * 0.22 + clamp(W * 0.117, 54, 110));
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = `italic ${clamp(W * 0.015, 11, 17)}px Segoe UI`;
    c.fillText('From a single truck driver to a logistics empire…', W / 2, H * 0.22 + clamp(W * 0.140, 64, 132));
    c.textAlign = 'left';

    const bw = 252, bh = 54, bx = W / 2 - bw / 2, by = H * 0.5;
    let action = null;
    if (uiBtn(c,'▶  PLAY GAME',       bx, by,      bw, bh, {bg:'#C0392B',hov:'#FFD700',txt:'#FFF',htxt:'#000',font:'bold 20px Segoe UI'}, mouse)) action='play';
    if (uiBtn(c,'🔧  UPGRADE GARAGE',  bx, by+68,   bw, bh, {bg:'#1a3050',hov:'#2ECC71',txt:'#FFF',htxt:'#000',font:'bold 18px Segoe UI'}, mouse)) action='garage';
    if (uiBtn(c,'🏅  ACHIEVEMENTS',    bx, by+136,  bw, bh, {bg:'#2C2200',hov:'#FFD700',txt:'#FFF',htxt:'#000',font:'bold 18px Segoe UI'}, mouse)) action='achievements';
    if (uiBtn(c,'🚛  FLEET',           bx-130, by,  122, bh, {bg:'#1a2040',hov:'#3498DB',txt:'#FFF',htxt:'#FFF',font:'bold 16px Segoe UI'}, mouse)) action='fleet';
    if (uiBtn(c,'👤  PROFILE',         bx-130, by+68,122, bh, {bg:'#1a2040',hov:'#9B59B6',txt:'#FFF',htxt:'#FFF',font:'bold 16px Segoe UI'}, mouse)) action='profile';
    if (uiBtn(c,'⚙  SETTINGS',        bx-130, by+136,122,bh, {bg:'#1a2040',hov:'#888',   txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'}, mouse)) action='settings';

    c.fillStyle = 'rgba(255,255,255,0.38)'; c.font = '12px Segoe UI'; c.textAlign = 'center';
    c.fillText(`⭐ Level ${level}  ${title}  |  Deliveries: ${missionCount}  |  $${money.toLocaleString()}`, W / 2, H * 0.91);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.font = '10px Segoe UI';
    c.fillText('v3.0  |  Mohallah Logestic  |  Master Development Phase', W / 2, H - 12);
    c.textAlign = 'left';
    return action;
  }

  _initStars(W, H) {
    this._pts = [];
    for (let i = 0; i < 70; i++) this._pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*0.4,vy:-Math.random()*0.7-0.2,s:Math.random()*2+0.5,o:Math.random()*0.5+0.2});
  }
  _truckSil(x, y, c) {
    c.fillStyle = '#C0392B'; c.fillRect(x-30,y-55,60,55);
    c.fillStyle = '#8B2020'; c.fillRect(x+26,y-42,95,42);
    c.fillStyle = 'rgba(100,180,255,0.3)'; c.fillRect(x-24,y-49,50,22);
    c.fillStyle = '#111';
    [[x-15,y],[x+15,y],[x+65,y],[x+100,y]].forEach(([cx,cy])=>{c.beginPath();c.arc(cx,cy,11,0,Math.PI*2);c.fill();});
  }

  // ── Mission Select ────────────────────────────────────────
  drawMissionSelect(missions, cities, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = '#0d1117'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#FFD700'; c.font = 'bold 32px Segoe UI'; c.textAlign = 'center';
    c.fillText('SELECT CONTRACT', W / 2, 58);
    const unlocked = cities ? cities.getUnlocked() : ['KARACHI','HYDERABAD'];
    c.fillStyle = '#888'; c.font = '14px Segoe UI';
    c.fillText(`${unlocked.length} cities unlocked  |  Choose your cargo contract`, W / 2, 84);
    c.textAlign = 'left';

    const pool = missions.displayMissions;
    const cols = Math.min(pool.length, W > 1100 ? 3 : W > 700 ? 2 : 1);
    const cw = Math.min(380, (W - 80) / cols), ch = 145, mg = 18;
    const gx = W / 2 - (cols * cw + (cols - 1) * mg) / 2;

    let newSel = missions.selectedIdx, action = null;

    pool.forEach((m, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = gx + col * (cw + mg), cy = 108 + row * (ch + mg);
      const hov = mouse.x >= cx && mouse.x <= cx + cw && mouse.y >= cy && mouse.y <= cy + ch;
      const sel = missions.selectedIdx === i;
      if (hov && mouse.clicked) newSel = i;
      rrect(c, cx, cy, cw, ch, 10, sel ? '#1E2D40' : hov ? '#1a1f2e' : '#161b22', sel ? '#FFD700' : hov ? '#3498DB' : '#30363D');
      const cargo = CARGO_DEFS.find(cd => cd.id === m.cargoId) || CARGO_DEFS[0];
      c.fillStyle = cargo.color; c.fillRect(cx + 14, cy + 14, 7, ch - 28);
      c.fillStyle = '#FFD700'; c.font = 'bold 15px Segoe UI'; c.fillText(m.name, cx + 32, cy + 32);
      c.fillStyle = m.difficultyColor || '#888'; c.font = '11px Segoe UI'; c.fillText(m.difficulty, cx + 32, cy + 50);
      c.fillStyle = '#AAA'; c.font = '12px Segoe UI'; c.fillText(cargo.desc, cx + 32, cy + 68);
      const fromCity = m.fromCity || 'Karachi', toCity = m.toCity || 'Hyderabad';
      const routeDist = m.routeDist ? Math.round(m.routeDist/100)*100+' u' : '';
      c.fillStyle = '#666'; c.font = '11px Segoe UI'; c.fillText(`${fromCity} → ${toCity}  ${routeDist}`, cx + 32, cy + 86);
      if (m.timeLimit) {
        const mins = Math.floor(m.timeLimit / 60), secs = m.timeLimit % 60;
        c.fillStyle = '#FF6B35'; c.font = 'bold 11px Segoe UI';
        c.fillText(`⏱ ${mins}:${String(secs).padStart(2,'0')} limit  +$${m.timeBonusAmt} bonus`, cx + 32, cy + 104);
      }
      c.fillStyle = '#2ECC71'; c.font = 'bold 16px Segoe UI'; c.textAlign = 'right';
      c.fillText('$' + m.baseReward.toLocaleString(), cx + cw - 14, cy + 34);
      c.fillStyle = cargo.color; c.font = '11px Segoe UI'; c.fillText(cargo.type, cx + cw - 14, cy + 52);
      c.textAlign = 'left';
    });

    // Route preview for selected mission
    const selMission = pool[newSel];
    if (selMission) {
      const previewH = 110;
      this.drawRoutePreview(c, selMission, W, H, W/2 - 190, H - 250, 380, previewH);
    }

    const aby = H - 125;
    if (uiBtn(c, '✓  ACCEPT CONTRACT', W/2-125, aby, 250, 52, {bg:'#C0392B',hov:'#2ECC71',txt:'#FFF',htxt:'#000',font:'bold 18px Segoe UI'}, mouse)) action = 'accept';
    if (uiBtn(c, '🔄 Refresh',          W/2+135, aby,     180, 52, {bg:'#1a3050',hov:'#3498DB',txt:'#FFF',htxt:'#FFF',font:'bold 14px Segoe UI'}, mouse)) action = 'refresh';
    if (uiBtn(c, '🗺 Map',              W/2+135, aby+60,  180, 42, {bg:'#0d1a1a',hov:'#1ABC9C',txt:'#FFF',htxt:'#FFF',font:'bold 14px Segoe UI'}, mouse)) action = 'map';
    if (uiBtn(c, '← Back',             W/2-315, aby, 150, 52, {bg:'#222',hov:'#444',txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'}, mouse)) action = 'back';
    return { action, selectedIdx: newSel };
  }

  // ── Upgrade Garage ────────────────────────────────────────
  drawGarage(truck, economy, upgrades, fleet, maintenance, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = '#0d1117'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#FFD700'; c.font = 'bold 30px Segoe UI'; c.textAlign = 'center';
    c.fillText('🔧  UPGRADE GARAGE', W / 2, 52);
    c.fillStyle = '#2ECC71'; c.font = 'bold 16px Segoe UI';
    c.fillText('Balance: $' + economy.money.toLocaleString(), W / 2, 78);
    c.textAlign = 'left';

    // Wear indicator
    const wearInfo = maintenance.getWearLabel(truck.wear);
    c.fillStyle = wearInfo.color; c.font = 'bold 13px Segoe UI'; c.textAlign = 'center';
    c.fillText(`Truck condition: ${wearInfo.label} (${Math.round(truck.wear)}% wear)`, W / 2, 100);
    c.textAlign = 'left';

    // Upgrade cards
    const keys2 = Object.keys(UPGRADE_DEFS);
    const cw = Math.min(245, (W - 180) / keys2.length), ch = 310;
    const totalW = keys2.length * cw + (keys2.length - 1) * 18;
    const gx = W / 2 - totalW / 2;

    let upgradeKey = null;
    keys2.forEach((k, i) => {
      const def = UPGRADE_DEFS[k], lvl = upgrades.getLevel(truck, k);
      const cx = gx + i * (cw + 18), cy = 118;
      const hov = mouse.x >= cx && mouse.x <= cx + cw && mouse.y >= cy && mouse.y <= cy + ch;
      rrect(c, cx, cy, cw, ch, 12, '#161b22', hov ? '#3498DB' : '#30363D');
      c.fillStyle = '#FFD700'; c.font = 'bold 19px Segoe UI'; c.textAlign = 'center';
      c.fillText(def.icon + '  ' + def.name, cx + cw / 2, cy + 36);
      for (let s = 0; s < def.maxLevel; s++) {
        c.fillStyle = s < lvl ? '#FFD700' : '#333'; c.font = '20px Segoe UI';
        c.fillText('★', cx + cw / 2 - 28 + s * 28, cy + 62);
      }
      c.fillStyle = '#3498DB'; c.font = '11px Segoe UI'; c.fillText(def.stat, cx + cw / 2, cy + 82);
      if (lvl < def.maxLevel) {
        c.fillStyle = '#888'; c.font = '11px Segoe UI'; c.fillText(upgrades.getNextDesc(truck, k), cx + cw / 2, cy + 100);
        const cost = upgrades.getCost(truck, k), can = economy.canAfford(cost);
        if (uiBtn(c, `Upgrade $${cost.toLocaleString()}`, cx + 10, cy + ch - 58, cw - 20, 42,
          {bg:can?'#C0392B':'#222',hov:can?'#2ECC71':'#2a2a2a',txt:can?'#FFF':'#555',htxt:'#000',font:'bold 13px Segoe UI'}, mouse)) {
          if (can) upgradeKey = k;
        }
      } else {
        c.fillStyle = '#2ECC71'; c.font = 'bold 14px Segoe UI'; c.fillText('MAX LEVEL', cx + cw / 2, cy + 102);
        rrect(c, cx + 10, cy + ch - 58, cw - 20, 42, 6, '#0d2a0d');
        c.fillStyle = '#2ECC71'; c.font = 'bold 13px Segoe UI'; c.fillText('✓ MAXED OUT', cx + cw / 2, cy + ch - 30);
      }
      c.textAlign = 'left';
    });

    // Paint & Service row
    const rowY = 118 + ch + 20;
    let svcAction = null;
    const svcCost = maintenance.getServiceCost(truck);
    if (uiBtn(c, `🔧 Service: $${svcCost}`, W/2 - 340, rowY, 200, 46,
      {bg:'#1a3050',hov:'#3498DB',txt:'#FFF',htxt:'#FFF',font:'bold 14px Segoe UI'}, mouse)) svcAction = 'service';

    // Paint presets
    c.fillStyle = '#FFF'; c.font = 'bold 13px Segoe UI';
    c.fillText('PAINT:', W/2 - 110, rowY + 16);
    PAINT_COLORS.forEach((pc, i) => {
      const px = W / 2 - 70 + i * 28, py = rowY + 2;
      c.fillStyle = pc.hex;
      c.beginPath(); c.arc(px + 10, py + 10, 11, 0, Math.PI * 2); c.fill();
      if (pc.hex === truck.paintColor) {
        c.strokeStyle = '#FFD700'; c.lineWidth = 3;
        c.beginPath(); c.arc(px + 10, py + 10, 13, 0, Math.PI * 2); c.stroke();
      }
      if (mouse.clicked && Math.hypot(mouse.x - (px + 10), mouse.y - (py + 10)) < 11) {
        truck.paintColor = pc.hex; // instant preview
      }
    });

    let action = null;
    if (uiBtn(c,'← Back',W/2-120,H-76,240,50,{bg:'#1a2030',hov:'#3498DB',txt:'#FFF',htxt:'#FFF',font:'bold 16px Segoe UI'},mouse)) action='back';
    return { action, upgradeKey, svcAction };
  }

  // ── Pause ─────────────────────────────────────────────────
  drawPause(mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.68)'; c.fillRect(0, 0, W, H);
    const pw = 300, ph = 268, px = W/2-pw/2, py = H/2-ph/2;
    rrect(c, px, py, pw, ph, 14, '#0d1117', '#FFD700', 2);
    c.fillStyle = '#FFD700'; c.font = 'bold 28px Segoe UI'; c.textAlign = 'center';
    c.fillText('PAUSED', W/2, py + 52); c.textAlign = 'left';
    let act = null;
    if (uiBtn(c,'▶  Resume',   W/2-95,py+78, 190,48,{bg:'#1a6020',hov:'#2ECC71',txt:'#FFF',htxt:'#FFF',font:'bold 16px Segoe UI'},mouse)) act='resume';
    if (uiBtn(c,'🔧  Upgrades', W/2-95,py+140,190,48,{bg:'#1a2040',hov:'#3498DB',txt:'#FFF',htxt:'#FFF',font:'bold 16px Segoe UI'},mouse)) act='garage';
    if (uiBtn(c,'⚙  Settings', W/2-95,py+202,190,48,{bg:'#1a1a2a',hov:'#888',   txt:'#FFF',htxt:'#FFF',font:'bold 16px Segoe UI'},mouse)) act='settings';
    if (uiBtn(c,'⬅  Main Menu',W/2-95,py+264,190,38,{bg:'#400a0a',hov:'#E74C3C',txt:'#FFF',htxt:'#FFF',font:'bold 14px Segoe UI'},mouse)) act='menu';
    return act;
  }

  // ── Mission Complete ──────────────────────────────────────
  drawMissionComplete(result, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.78)'; c.fillRect(0, 0, W, H);
    const pw = 520, ph = 430, px = W/2-pw/2, py = H/2-ph/2;
    rrect(c, px, py, pw, ph, 16, '#0d1a0d', result?.timeFailed ? '#E74C3C' : '#2ECC71', 3);
    c.font = '58px Segoe UI'; c.textAlign = 'center';
    c.fillText(result?.timeFailed ? '⏰' : '🏆', W/2, py + 76);
    c.fillStyle = result?.timeFailed ? '#E74C3C' : '#2ECC71'; c.font = 'bold 26px Segoe UI';
    c.fillText(result?.timeFailed ? 'LATE DELIVERY' : 'DELIVERY COMPLETE!', W/2, py + 120);
    c.fillStyle = '#FFD700'; c.font = 'bold 26px Segoe UI';
    c.fillText('+$' + (result?.reward || 0).toLocaleString(), W/2, py + 155);
    c.fillStyle = '#FFF'; c.font = '14px Segoe UI'; c.fillText(result?.mission?.name || '', W/2, py + 182);
    // Stars
    const stars = result?.stars || 0;
    c.font = '30px Segoe UI';
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i < stars ? '#FFD700' : '#333';
      c.fillText('★', W/2 - 44 + i * 44, py + 220);
    }
    c.fillStyle = '#888'; c.font = '12px Segoe UI';
    c.fillText(`Damage: ${result?.damage || 0} HP  |  Time: ${Math.round(result?.timeElapsed || 0)}s`, W/2, py + 248);
    c.fillStyle = stars === 3 ? '#2ECC71' : stars === 2 ? '#F39C12' : stars >= 1 ? '#E74C3C' : '#888';
    c.fillText(stars===3?'★★★ Perfect run!':stars===2?'★★ Good work':stars===1?'★ Rough ride':'⏰ Late delivery penalty', W/2, py + 268);
    c.textAlign = 'left';
    let act = null;
    if (uiBtn(c,'🚚  NEXT CONTRACT',  W/2-120,py+ph-112,240,50,{bg:'#C0392B',hov:'#FFD700',txt:'#FFF',htxt:'#000',font:'bold 16px Segoe UI'},mouse)) act='next';
    if (uiBtn(c,'🔧  UPGRADE TRUCK',  W/2-120,py+ph-52, 240,50,{bg:'#1a2040',hov:'#2ECC71',txt:'#FFF',htxt:'#000',font:'bold 16px Segoe UI'},mouse)) act='garage';
    return act;
  }

  // ── Game Over ─────────────────────────────────────────────
  drawGameOver(reason, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.82)'; c.fillRect(0, 0, W, H);
    const pw = 420, ph = 300, px = W/2-pw/2, py = H/2-ph/2;
    rrect(c, px, py, pw, ph, 16, '#1a0505', '#E74C3C', 3);
    c.font = '58px Segoe UI'; c.textAlign = 'center';
    c.fillText('💀', W/2, py + 78);
    c.fillStyle = '#E74C3C'; c.font = 'bold 30px Segoe UI'; c.fillText('GAME OVER', W/2, py + 128);
    c.fillStyle = '#FFF'; c.font = '15px Segoe UI';
    c.fillText(reason === 'health' ? 'Truck destroyed in a collision!' : 'Your truck ran out of fuel!', W/2, py + 158);
    c.fillStyle = '#888'; c.font = '13px Segoe UI';
    c.fillText(reason === 'health' ? 'Upgrade your brakes and avoid NPCs' : 'Stop at fuel stations along the route', W/2, py + 180);
    c.textAlign = 'left';
    let act = null;
    if (uiBtn(c,'🔄  TRY AGAIN', W/2-125,py+ph-90,250,50,{bg:'#C0392B',hov:'#FFD700',txt:'#FFF',htxt:'#000',font:'bold 16px Segoe UI'},mouse)) act='retry';
    if (uiBtn(c,'⬅  Main Menu', W/2-125,py+ph-30,250,50,{bg:'#222',hov:'#444',txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'},mouse)) act='menu';
    return act;
  }

  // ── Achievements ──────────────────────────────────────────
  drawAchievements(achievements, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = '#0d1117'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#FFD700'; c.font = 'bold 30px Segoe UI'; c.textAlign = 'center';
    c.fillText('🏅  ACHIEVEMENTS', W / 2, 52);
    c.fillStyle = '#888'; c.font = '14px Segoe UI';
    c.fillText(`${achievements.count} / ${achievements.total} unlocked`, W / 2, 78);
    c.textAlign = 'left';

    const all  = achievements.getAll();
    const cols = Math.min(4, Math.floor((W - 60) / 220));
    const cw   = Math.floor((W - 60) / cols) - 10, ch = 88, mg = 10;
    const gx   = 30, gy = 98;

    all.forEach((a, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx  = gx + col * (cw + mg), cy = gy + row * (ch + mg);
      if (cy + ch > H - 70) return;
      const locked = !a.unlocked;
      rrect(c, cx, cy, cw, ch, 8, locked ? '#0d0d0d' : '#1E2D1E', locked ? '#333' : '#2ECC71');
      c.globalAlpha = locked ? 0.4 : 1;
      c.font = '24px Segoe UI'; c.fillText(a.icon, cx + 14, cy + 35);
      c.fillStyle = locked ? '#666' : '#FFD700'; c.font = 'bold 13px Segoe UI';
      c.fillText(a.name, cx + 48, cy + 24);
      c.fillStyle = locked ? '#444' : '#AAA'; c.font = '11px Segoe UI';
      const words = a.desc.split(' '); let line = '', ly = cy + 40;
      for (const w of words) {
        if ((line + w).length > Math.floor(cw / 7)) { c.fillText(line, cx + 48, ly); line = w + ' '; ly += 15; }
        else line += w + ' ';
      }
      c.fillText(line, cx + 48, ly);
      c.fillStyle = locked ? '#333' : '#9B59B6'; c.font = 'bold 11px Segoe UI';
      c.fillText(`+${a.xp} XP`, cx + cw - 50, cy + 22);
      c.globalAlpha = 1;
    });

    if (uiBtn(c,'← Back',W/2-100,H-60,200,46,{bg:'#1a2030',hov:'#3498DB',txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'},mouse)) return 'back';
    return null;
  }

  // ── Daily Reward ──────────────────────────────────────────
  drawDailyReward(dailyReward, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.88)'; c.fillRect(0, 0, W, H);
    const pw = 520, ph = 380, px = W/2-pw/2, py = H/2-ph/2;
    rrect(c, px, py, pw, ph, 16, '#0d1117', '#FFD700', 3);
    c.font = '52px Segoe UI'; c.textAlign = 'center';
    c.fillText('🎁', W/2, py + 72);
    c.fillStyle = '#FFD700'; c.font = 'bold 26px Segoe UI';
    c.fillText('DAILY REWARD', W/2, py + 112);
    c.fillStyle = '#888'; c.font = '14px Segoe UI';
    c.fillText(`Day ${dailyReward.streak} streak`, W/2, py + 136);

    // Streak circles
    const reward = dailyReward.getCurrentReward();
    const days   = dailyReward.streakDays;
    const circX  = pw / 2 - ((days.length - 1) * 60) / 2;
    days.forEach((d, i) => {
      const x = px + circX + i * 60, y = py + 165;
      const done = i < dailyReward.streak;
      c.fillStyle = done ? '#FFD700' : '#222';
      c.strokeStyle = done ? '#F39C12' : '#444'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = done ? '#000' : '#666'; c.font = 'bold 11px Segoe UI'; c.textAlign = 'center';
      c.fillText(d.label.replace('Day ',''), x, y + 5);
    });

    c.fillStyle = '#2ECC71'; c.font = 'bold 28px Segoe UI'; c.textAlign = 'center';
    c.fillText(`+$${reward.money.toLocaleString()}`, W/2, py + 230);
    c.fillStyle = '#9B59B6'; c.font = 'bold 18px Segoe UI';
    c.fillText(`+${reward.xp} XP`, W/2, py + 260);
    c.textAlign = 'left';

    let act = null;
    if (uiBtn(c,'🎉  CLAIM REWARD',W/2-130,py+ph-80,260,54,{bg:'#C0392B',hov:'#FFD700',txt:'#FFF',htxt:'#000',font:'bold 20px Segoe UI'},mouse)) act='claim';
    return act;
  }

  // ── Fleet ─────────────────────────────────────────────────
  drawFleet(fleet, economy, progression, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = '#0d1117'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#FFD700'; c.font = 'bold 30px Segoe UI'; c.textAlign = 'center';
    c.fillText('🚛  FLEET MANAGEMENT', W / 2, 52);
    c.fillStyle = '#2ECC71'; c.font = '14px Segoe UI';
    c.fillText(`Passive Income: $${fleet.passiveIncomeRate}/min  |  Balance: $${economy.money.toLocaleString()}`, W/2, 78);
    c.textAlign = 'left';

    // Owned trucks
    const ownedW = (W - 60) / Math.max(fleet.fleetSize, 1), gy = 100;
    fleet.trucks.forEach((td, i) => {
      const cx = 30 + i * (Math.min(ownedW, 240) + 14), cy = gy;
      const bw = Math.min(ownedW - 14, 226), bh = 220;
      rrect(c, cx, cy, bw, bh, 12, '#161b22', i === 0 ? '#FFD700' : '#30363D');
      c.fillStyle = td.paintColor || '#E74C3C';
      c.fillRect(cx + 12, cy + 14, bw - 24, 60);
      c.fillStyle = shadeHex(td.paintColor || '#E74C3C', -40);
      c.fillRect(cx + 12, cy + 14, bw - 24, 20);
      c.fillStyle = '#FFF'; c.font = 'bold 13px Segoe UI'; c.textAlign = 'center';
      c.fillText(td.name, cx + bw / 2, cy + 92);
      c.fillStyle = '#888'; c.font = '11px Segoe UI';
      c.fillText(`${Math.round(td.mileage)} km  |  ${Math.round(td.wear)}% wear`, cx + bw / 2, cy + 110);
      if (i === 0) {
        c.fillStyle = '#FFD700'; c.font = 'bold 11px Segoe UI'; c.fillText('ACTIVE (Your truck)', cx + bw/2, cy + 130);
      } else if (td.driverAssigned) {
        c.fillStyle = '#2ECC71'; c.font = '11px Segoe UI';
        c.fillText(`👨‍✈️ ${td.driverName}`, cx + bw/2, cy + 130);
        c.fillText(`+$${Math.round(80/60 * 60)}/min`, cx + bw/2, cy + 148);
        if (uiBtn(c, 'Fire Driver', cx + 14, cy + bh - 46, bw - 28, 36,
          {bg:'#400a0a',hov:'#E74C3C',txt:'#FFF',htxt:'#FFF',font:'bold 12px Segoe UI'}, mouse)) {
          fleet.fireDriver(i);
        }
      } else {
        c.fillStyle = '#888'; c.font = '11px Segoe UI'; c.fillText('No driver', cx + bw/2, cy + 130);
        if (uiBtn(c, 'Hire $2,000', cx + 14, cy + bh - 46, bw - 28, 36,
          {bg:'#1a3050',hov:'#2ECC71',txt:'#FFF',htxt:'#FFF',font:'bold 12px Segoe UI'}, mouse)) {
          const names = ['Ahmed','Rashid','Tariq','Bilal','Usman','Hassan'];
          fleet.hireDriver(i, names[Math.floor(Math.random() * names.length)], economy);
        }
      }
      c.textAlign = 'left';
    });

    // Buy truck section
    const byY = gy + 250;
    c.fillStyle = '#FFF'; c.font = 'bold 16px Segoe UI'; c.fillText('BUY NEW TRUCK', 30, byY);
    const level = progression.level;
    const available = TRUCK_DEFS.filter(d => d.price > 0);
    available.forEach((td, i) => {
      const tx = 30 + i * 230, ty = byY + 18;
      const locked = td.unlockLevel > level;
      rrect(c, tx, ty, 220, 130, 10, locked ? '#0d0d0d' : '#161b22', locked ? '#333' : '#3498DB');
      c.globalAlpha = locked ? 0.5 : 1;
      c.fillStyle = td.color; c.fillRect(tx + 12, ty + 12, 60, 36);
      c.fillStyle = shadeHex(td.color, -30); c.fillRect(tx + 12, ty + 12, 60, 12);
      c.fillStyle = locked ? '#666' : '#FFF'; c.font = 'bold 14px Segoe UI';
      c.fillText(td.name, tx + 80, ty + 26);
      c.fillStyle = '#888'; c.font = '11px Segoe UI';
      c.fillText(td.desc.slice(0, 28) + '…', tx + 12, ty + 64);
      c.fillStyle = locked ? '#666' : '#2ECC71'; c.font = 'bold 13px Segoe UI';
      c.fillText(locked ? `🔒 Level ${td.unlockLevel}` : `$${td.price.toLocaleString()}`, tx + 12, ty + 84);
      c.globalAlpha = 1;
      if (!locked && uiBtn(c, 'Buy', tx + 150, ty + 74, 60, 32,
        {bg:economy.canAfford(td.price)?'#C0392B':'#333',hov:'#2ECC71',txt:'#FFF',htxt:'#000',font:'bold 13px Segoe UI'}, mouse)) {
        fleet.buyTruck(td.id, economy, null, level);
      }
    });

    let act = null;
    if (uiBtn(c,'← Back',W/2-100,H-60,200,46,{bg:'#1a2030',hov:'#3498DB',txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'},mouse)) act='back';
    return act;
  }

  // ── Profile / Driver Card ─────────────────────────────────
  drawProfile(progression, missions, economy, achievements, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = '#0d1117'; c.fillRect(0, 0, W, H);
    const pw = Math.min(600, W - 40), ph = Math.min(520, H - 40);
    const px = W/2-pw/2, py = H/2-ph/2;
    rrect(c, px, py, pw, ph, 16, '#0d1117', '#9B59B6', 2);

    c.font = '64px Segoe UI'; c.textAlign = 'center'; c.fillText('🧑‍✈️', W/2, py + 80);
    c.fillStyle = '#FFD700'; c.font = `bold 24px Segoe UI`;
    c.fillText(`Level ${progression.level}  ${progression.currentTitle}`, W/2, py + 115);
    c.fillStyle = '#9B59B6'; c.font = 'bold 14px Segoe UI';
    c.fillText(`${progression.xp.toLocaleString()} XP total`, W/2, py + 138);

    // XP bar
    rrect(c, px + 40, py + 150, pw - 80, 20, 4, '#1a1a2a');
    const xpPct = progression.levelProgress;
    c.fillStyle = '#9B59B6'; c.fillRect(px + 40, py + 150, (pw - 80) * xpPct, 20);
    c.fillStyle = '#FFF'; c.font = '11px Segoe UI';
    c.fillText(`${progression.xpIntoLevel} / ${progression.xpNeededForLevel} XP to next level`, W/2, py + 164);

    // Stats grid
    const stats = [
      ['Deliveries', missions.missionCount],
      ['Total Earned', '$' + economy.totalEarned.toLocaleString()],
      ['Achievements', `${achievements.count} / ${achievements.total}`],
      ['Login Streak', `${missions.cleanStreak || 0} clean runs`],
    ];
    stats.forEach(([label, val], i) => {
      const sx = px + 30 + (i % 2) * (pw / 2 - 30);
      const sy = py + 185 + Math.floor(i / 2) * 55;
      rrect(c, sx, sy, pw / 2 - 40, 46, 8, '#161b22');
      c.fillStyle = '#888'; c.font = '11px Segoe UI'; c.textAlign = 'left';
      c.fillText(label, sx + 14, sy + 18);
      c.fillStyle = '#FFF'; c.font = 'bold 16px Segoe UI';
      c.fillText(val, sx + 14, sy + 38);
    });

    c.textAlign = 'left';
    let act = null;
    if (uiBtn(c,'← Back',W/2-100,H-60,200,46,{bg:'#1a2030',hov:'#9B59B6',txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'},mouse)) act='back';
    return act;
  }

  // ── Settings ──────────────────────────────────────────────
  drawSettings(audio, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.88)'; c.fillRect(0, 0, W, H);
    const pw = 340, ph = 280, px = W/2-pw/2, py = H/2-ph/2;
    rrect(c, px, py, pw, ph, 14, '#0d1117', '#888', 2);
    c.fillStyle = '#FFF'; c.font = 'bold 24px Segoe UI'; c.textAlign = 'center';
    c.fillText('⚙  SETTINGS', W/2, py + 48); c.textAlign = 'left';

    const muteLabel = audio?.muted ? '🔇  UNMUTE AUDIO' : '🔊  MUTE AUDIO';
    let act = null;
    if (uiBtn(c, muteLabel, W/2-100, py+78, 200, 46, {bg:'#1a2030',hov:'#3498DB',txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'}, mouse)) act = 'toggleMute';
    if (uiBtn(c,'🗑  RESET SAVE', W/2-100, py+140, 200, 46, {bg:'#400a0a',hov:'#E74C3C',txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'}, mouse)) act = 'resetSave';
    if (uiBtn(c,'← Close',       W/2-100, py+202, 200, 46, {bg:'#222',hov:'#444',txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'}, mouse)) act = 'close';
    // Version info
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.font = '11px Segoe UI'; c.textAlign = 'center';
    c.fillText(`Mohallah Logestic  v${CONFIG.VERSION}`, W/2, py + ph - 14);
    c.textAlign = 'left';
    return act;
  }

  // ── Tutorial Overlay ─────────────────────────────────────
  /**
   * @param {TutorialSystem} tutorial
   * @param {Object} mouse
   * @returns {'next'|'skip'|null}
   */
  drawTutorial(tutorial, mouse, W, H) {
    const c    = this.ctx;
    const step = tutorial.currentStep;
    const pw   = Math.min(560, W - 40), ph = 360;
    const px   = W / 2 - pw / 2, py = H / 2 - ph / 2;

    // Dim background
    c.fillStyle = 'rgba(0,0,10,0.82)'; c.fillRect(0, 0, W, H);
    rrect(c, px, py, pw, ph, 16, '#0d1120', '#3498DB', 2);

    // Step icon
    c.font = '56px Segoe UI'; c.textAlign = 'center';
    c.fillText(step.icon, W / 2, py + 72);

    // Title
    c.fillStyle = '#FFD700'; c.font = 'bold 22px Segoe UI';
    c.fillText(step.title, W / 2, py + 112);

    // Body
    c.fillStyle = '#DDD'; c.font = '15px Segoe UI';
    const words = step.body.split(' ');
    let line = '', ly = py + 142;
    const maxW = pw - 60;
    c.textAlign = 'center';
    for (const w of words) {
      const test = line + w + ' ';
      if (c.measureText(test).width > maxW && line) {
        c.fillText(line.trim(), W / 2, ly); line = w + ' '; ly += 22;
      } else { line = test; }
    }
    if (line) c.fillText(line.trim(), W / 2, ly);

    // Hint
    if (step.hint) {
      c.fillStyle = '#F39C12'; c.font = 'italic 13px Segoe UI';
      c.fillText(step.hint, W / 2, py + ph - 105);
    }

    // Progress dots
    for (let i = 0; i < tutorial.totalSteps; i++) {
      c.fillStyle = i === tutorial.stepIdx ? '#3498DB' : (i < tutorial.stepIdx ? '#2ECC71' : '#333');
      c.beginPath(); c.arc(W / 2 - (tutorial.totalSteps - 1) * 12 + i * 24, py + ph - 72, 6, 0, Math.PI * 2); c.fill();
    }

    c.textAlign = 'left';
    let act = null;
    const nextLabel = tutorial.isLastStep ? '🚀  LET\'S DRIVE!' : 'Next  →';
    if (uiBtn(c, nextLabel, W/2 + 10, py + ph - 54, 160, 44, {bg:'#2ECC71',hov:'#27AE60',txt:'#000',htxt:'#000',font:'bold 16px Segoe UI'}, mouse)) act = 'next';
    if (uiBtn(c, 'Skip Tutorial', W/2 - 180, py + ph - 54, 160, 44, {bg:'#222',hov:'#444',txt:'#888',htxt:'#FFF',font:'14px Segoe UI'}, mouse)) act = 'skip';
    return act;
  }

  // ── Route preview mini-panel (used inside mission select) ──
  drawRoutePreview(c, mission, W, H, px, py, pw, ph) {
    if (!mission) return;
    rrect(c, px, py, pw, ph, 10, '#0d1a28', '#3498DB', 1);

    // Route label
    const fromDef = CITIES[mission.fromCity] || {name:'Unknown', color:'#888'};
    const toDef   = CITIES[mission.toCity]   || {name:'Unknown', color:'#888'};
    c.font = 'bold 14px Segoe UI'; c.textAlign = 'center';
    c.fillStyle = fromDef.color; c.fillText(fromDef.name, px + pw*0.25, py + 22);
    c.fillStyle = '#FFF'; c.fillText('→', px + pw*0.5, py + 22);
    c.fillStyle = toDef.color;   c.fillText(toDef.name, px + pw*0.75, py + 22);

    // Mini route map
    const mapX = px + 10, mapY = py + 32, mapW = pw - 20, mapH = ph - 70;
    rrect(c, mapX, mapY, mapW, mapH, 6, '#060e1a');
    const WW = 22000, WH = 8000;
    const sx = mapW / WW, sy = mapH / WH;
    // Highways
    c.strokeStyle = '#3D3D3D'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(mapX + HIGHWAY[0].x*sx, mapY + HIGHWAY[0].y*sy);
    for (let i=1;i<HIGHWAY.length;i++) c.lineTo(mapX + HIGHWAY[i].x*sx, mapY + HIGHWAY[i].y*sy);
    c.stroke();
    c.strokeStyle = '#2a2a20'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(mapX + HIGHWAY_N25[0].x*sx, mapY + HIGHWAY_N25[0].y*sy);
    for (let i=1;i<HIGHWAY_N25.length;i++) c.lineTo(mapX + HIGHWAY_N25[i].x*sx, mapY + HIGHWAY_N25[i].y*sy);
    c.stroke();
    // Origin/destination
    [[fromDef, mission.fromCity], [toDef, mission.toCity]].forEach(([def, key]) => {
      const city = CITIES[key]; if (!city) return;
      c.fillStyle = def.color;
      c.beginPath(); c.arc(mapX + city.x*sx, mapY + city.y*sy, 4, 0, Math.PI*2); c.fill();
    });

    // Stats row
    const distKm   = Math.round((mission.routeDist || 2800) / 100) * 100;
    const estTime  = Math.round(distKm / 200) + 1; // rough minutes at ~200 u/s
    c.fillStyle = '#888'; c.font = '11px Segoe UI'; c.textAlign = 'center';
    c.fillText(`~${distKm} units  ·  Est. ${estTime} min  ·  $${(mission.baseReward||0).toLocaleString()} reward`, px+pw/2, py+ph-10);
    c.textAlign = 'left';
  }
}
