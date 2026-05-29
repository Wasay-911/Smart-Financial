// js/ui/MenuSystem.js – All game screens (menu, mission select, garage, overlays)

import { clamp, rrect, uiBtn, shadeHex } from '../utils.js';
import { MISSION_DEFS, UPGRADE_DEFS, CARGO_DEFS } from '../constants.js';

export class MenuSystem {
  constructor(ctx) {
    this.ctx  = ctx;
    this._pts = []; // star particles for menu background
    this._t   = 0;
  }

  // ── Main Menu ───────────────────────────────────────────────
  /**
   * @returns {'play'|'garage'|null}
   */
  drawMainMenu(dt, missionCount, money, mouse, W, H) {
    this._t += dt;
    const c = this.ctx;

    // Night sky
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#06071a'); g.addColorStop(0.7, '#181a3a'); g.addColorStop(1, '#0d0d12');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // Stars
    if (!this._pts.length) this._initStars(W, H);
    c.fillStyle = '#FFF';
    for (const p of this._pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < 0) { p.y = H; p.x = Math.random() * W; }
      c.globalAlpha = p.o; c.fillRect(p.x, p.y, p.s, p.s);
    }
    c.globalAlpha = 1;

    // Desert silhouette
    c.fillStyle = '#18140e'; c.fillRect(0, H * 0.62, W, H * 0.38);
    c.fillStyle = '#221c10'; c.fillRect(0, H * 0.68, W, H * 0.18);

    // Road
    c.fillStyle = '#2a2820'; c.fillRect(0, H * 0.70, W, H * 0.12);
    c.fillStyle = '#FFD700'; c.globalAlpha = 0.65;
    const off = (this._t * 68) % 100;
    for (let x = -100; x < W + 100; x += 100) c.fillRect(x - off, H * 0.755, 72, 4);
    c.globalAlpha = 1;

    // Truck silhouette driving
    this._truckSil(W * 0.18 + Math.sin(this._t * 0.5) * 14, H * 0.68, c);

    // Moon
    c.fillStyle = 'rgba(255,250,215,0.88)';
    c.beginPath(); c.arc(W * 0.82, H * 0.11, 36, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#07091a';
    c.beginPath(); c.arc(W * 0.82 - 12, H * 0.11 - 8, 32, 0, Math.PI * 2); c.fill();

    // Title
    c.save();
    c.shadowColor = '#FFD700'; c.shadowBlur = 40;
    c.fillStyle = '#FFD700';
    c.font = `bold ${clamp(W * 0.085, 40, 82)}px Segoe UI`;
    c.textAlign = 'center';
    c.fillText('MOHALLAH', W / 2, H * 0.22);
    c.shadowColor = '#FFF'; c.shadowBlur = 22; c.fillStyle = '#FFF';
    c.font = `bold ${clamp(W * 0.055, 28, 55)}px Segoe UI`;
    c.fillText('LOGESTIC', W / 2, H * 0.22 + clamp(W * 0.083, 40, 74));
    c.restore();

    c.fillStyle = '#F39C12'; c.font = `${clamp(W * 0.022, 14, 22)}px Segoe UI`; c.textAlign = 'center';
    c.fillText('TRUCK SIMULATION RPG  –  Phase 2', W / 2, H * 0.22 + clamp(W * 0.117, 54, 110));
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = `italic ${clamp(W * 0.016, 11, 17)}px Segoe UI`;
    c.fillText('From a single truck driver to a logistics empire…', W / 2, H * 0.22 + clamp(W * 0.14, 64, 132));
    c.textAlign = 'left';

    // Buttons
    const bw = 252, bh = 54, bx = W / 2 - bw / 2;
    const by = H * 0.5;
    let action = null;
    if (uiBtn(c, '▶  PLAY GAME',      bx, by,      bw, bh, {bg:'#C0392B',hov:'#FFD700',txt:'#FFF',htxt:'#000',font:'bold 20px Segoe UI'}, mouse)) action = 'play';
    if (uiBtn(c, '🔧  UPGRADE GARAGE', bx, by + 68, bw, bh, {bg:'#1a3050',hov:'#2ECC71',txt:'#FFF',htxt:'#000',font:'bold 18px Segoe UI'}, mouse)) action = 'garage';

    c.fillStyle = 'rgba(255,255,255,0.38)'; c.font = '12px Segoe UI'; c.textAlign = 'center';
    c.fillText(`Deliveries: ${missionCount}  |  Balance: $${money.toLocaleString()}`, W / 2, H * 0.9);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.font = '10px Segoe UI';
    c.fillText('v2.0  |  Mohallah Logestic  |  Phase 1-3 Architecture', W / 2, H - 12);
    c.textAlign = 'left';
    return action;
  }

  _initStars(W, H) {
    this._pts = [];
    for (let i = 0; i < 70; i++) {
      this._pts.push({x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-0.5)*0.4, vy:-Math.random()*0.7-0.2, s:Math.random()*2+0.5, o:Math.random()*0.5+0.2});
    }
  }

  _truckSil(x, y, c) {
    c.fillStyle = '#C0392B'; c.fillRect(x - 30, y - 55, 60, 55);
    c.fillStyle = '#8B2020'; c.fillRect(x + 26, y - 42, 95, 42);
    c.fillStyle = 'rgba(100,180,255,0.3)'; c.fillRect(x - 24, y - 49, 50, 22);
    c.fillStyle = '#111';
    [[x-15,y],[x+15,y],[x+65,y],[x+100,y]].forEach(([cx,cy])=>{c.beginPath();c.arc(cx,cy,11,0,Math.PI*2);c.fill();});
  }

  // ── Mission Select ──────────────────────────────────────────
  /**
   * @returns {{ action:'accept'|'back'|null, selectedIdx:number }}
   */
  drawMissionSelect(selectedIdx, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = '#0d1117'; c.fillRect(0, 0, W, H);

    c.fillStyle = '#FFD700'; c.font = 'bold 32px Segoe UI'; c.textAlign = 'center';
    c.fillText('SELECT MISSION', W / 2, 58);
    c.fillStyle = '#888'; c.font = '15px Segoe UI';
    c.fillText('Choose your cargo and destination', W / 2, 86);
    c.textAlign = 'left';

    const cols = W > 1100 ? 3 : W > 700 ? 2 : 1;
    const cw = Math.min(370, (W - 80) / cols), ch = 130, mg = 18;
    const totalW = cols * cw + (cols - 1) * mg;
    const gx = W / 2 - totalW / 2;

    let newSel = selectedIdx;

    MISSION_DEFS.forEach((m, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = gx + col * (cw + mg), cy = 108 + row * (ch + mg);
      const hov = mouse.x >= cx && mouse.x <= cx + cw && mouse.y >= cy && mouse.y <= cy + ch;
      const sel = selectedIdx === i;
      if (hov && mouse.clicked) newSel = i;

      rrect(c, cx, cy, cw, ch, 10, sel ? '#1E2D40' : hov ? '#1a1f2e' : '#161b22', sel ? '#FFD700' : hov ? '#3498DB' : '#30363D');

      const cargo = CARGO_DEFS.find(cd => cd.id === m.cargoId);
      c.fillStyle = cargo.color; c.fillRect(cx + 14, cy + 14, 7, ch - 28);

      c.fillStyle = '#FFD700'; c.font = 'bold 16px Segoe UI'; c.fillText(m.name, cx + 32, cy + 34);
      c.fillStyle = m.difficultyColor; c.font = '11px Segoe UI'; c.fillText(m.difficulty, cx + 32, cy + 52);
      c.fillStyle = '#AAA'; c.font = '12px Segoe UI'; c.fillText(cargo.desc, cx + 32, cy + 70);
      c.fillStyle = '#666'; c.font = '12px Segoe UI'; c.fillText('Karachi → Hyderabad', cx + 32, cy + 90);
      c.fillStyle = '#2ECC71'; c.font = 'bold 17px Segoe UI'; c.textAlign = 'right';
      c.fillText('$' + m.baseReward.toLocaleString(), cx + cw - 14, cy + 36);
      c.fillStyle = cargo.color; c.font = '11px Segoe UI';
      c.fillText(cargo.type, cx + cw - 14, cy + 52);
      c.textAlign = 'left';
    });

    const aby = H - 120;
    let action = null;
    if (uiBtn(c, '✓  ACCEPT MISSION', W/2-125, aby, 250, 52, {bg:'#C0392B',hov:'#2ECC71',txt:'#FFF',htxt:'#000',font:'bold 18px Segoe UI'}, mouse)) action = 'accept';
    if (uiBtn(c, '← Back', W/2-295, aby, 150, 52, {bg:'#222',hov:'#444',txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'}, mouse)) action = 'back';

    return { action, selectedIdx: newSel };
  }

  // ── Upgrade Garage ──────────────────────────────────────────
  /**
   * @returns {{ action:'back'|'upgrade'|null, upgradeKey:string|null }}
   */
  drawGarage(truck, economy, upgrades, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = '#0d1117'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#FFD700'; c.font = 'bold 32px Segoe UI'; c.textAlign = 'center';
    c.fillText('🔧  UPGRADE GARAGE', W / 2, 58);
    c.fillStyle = '#2ECC71'; c.font = 'bold 18px Segoe UI';
    c.fillText('Balance: $' + economy.money.toLocaleString(), W / 2, 90);
    c.textAlign = 'left';

    const keys2  = Object.keys(UPGRADE_DEFS);
    const cw     = Math.min(252, (W - 80) / keys2.length), ch = 310;
    const totalW = keys2.length * cw + (keys2.length - 1) * 20;
    const gx     = W / 2 - totalW / 2;

    let upgradeKey = null;

    keys2.forEach((k, i) => {
      const def = UPGRADE_DEFS[k];
      const lvl = upgrades.getLevel(truck, k);
      const cx  = gx + i * (cw + 20), cy = 118;
      const hov = mouse.x >= cx && mouse.x <= cx + cw && mouse.y >= cy && mouse.y <= cy + ch;
      rrect(c, cx, cy, cw, ch, 12, '#161b22', hov ? '#3498DB' : '#30363D');

      c.fillStyle = '#FFD700'; c.font = 'bold 20px Segoe UI'; c.textAlign = 'center';
      c.fillText(def.icon + '  ' + def.name, cx + cw / 2, cy + 38);
      // Stars
      for (let s = 0; s < def.maxLevel; s++) {
        c.fillStyle = s < lvl ? '#FFD700' : '#333'; c.font = '22px Segoe UI';
        c.fillText('★', cx + cw / 2 - 30 + s * 30, cy + 64);
      }
      c.fillStyle = '#3498DB'; c.font = '12px Segoe UI'; c.fillText(def.stat, cx + cw / 2, cy + 84);

      if (lvl < def.maxLevel) {
        c.fillStyle = '#888'; c.font = '12px Segoe UI';
        c.fillText(upgrades.getNextDesc(truck, k), cx + cw / 2, cy + 106);
        const cost = upgrades.getCost(truck, k);
        const can  = economy.canAfford(cost);

        if (uiBtn(c, `Upgrade: $${cost.toLocaleString()}`, cx + 10, cy + ch - 58, cw - 20, 42,
          {bg: can?'#C0392B':'#222', hov: can?'#2ECC71':'#2a2a2a', txt: can?'#FFF':'#555', htxt:'#000', font:'bold 13px Segoe UI'}, mouse)) {
          if (can) upgradeKey = k;
        }
      } else {
        c.fillStyle = '#2ECC71'; c.font = 'bold 14px Segoe UI'; c.fillText('MAX LEVEL', cx + cw / 2, cy + 106);
        rrect(c, cx + 10, cy + ch - 58, cw - 20, 42, 6, '#0d2a0d');
        c.fillStyle = '#2ECC71'; c.font = 'bold 13px Segoe UI'; c.fillText('✓ MAXED OUT', cx + cw / 2, cy + ch - 30);
      }
      c.textAlign = 'left';
    });

    let action = null;
    if (uiBtn(c, '← Back to Menu', W/2 - 120, H - 76, 240, 50, {bg:'#1a2030',hov:'#3498DB',txt:'#FFF',htxt:'#FFF',font:'bold 16px Segoe UI'}, mouse)) action = 'back';
    return { action, upgradeKey };
  }

  // ── Pause ───────────────────────────────────────────────────
  /** @returns {'resume'|'garage'|'menu'|null} */
  drawPause(mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.68)'; c.fillRect(0, 0, W, H);
    const pw = 300, ph = 248, px = W/2-pw/2, py = H/2-ph/2;
    rrect(c, px, py, pw, ph, 14, '#0d1117', '#FFD700', 2);
    c.fillStyle = '#FFD700'; c.font = 'bold 28px Segoe UI'; c.textAlign = 'center';
    c.fillText('PAUSED', W/2, py + 52);
    c.textAlign = 'left';

    let act = null;
    if (uiBtn(c,'▶  Resume',   W/2-95, py+80,  190,48,{bg:'#1a6020',hov:'#2ECC71',txt:'#FFF',htxt:'#FFF',font:'bold 16px Segoe UI'},mouse)) act='resume';
    if (uiBtn(c,'🔧  Upgrades', W/2-95, py+142, 190,48,{bg:'#1a2040',hov:'#3498DB',txt:'#FFF',htxt:'#FFF',font:'bold 16px Segoe UI'},mouse)) act='garage';
    if (uiBtn(c,'⬅  Main Menu',W/2-95, py+204, 190,48,{bg:'#400a0a',hov:'#E74C3C',txt:'#FFF',htxt:'#FFF',font:'bold 16px Segoe UI'},mouse)) act='menu';
    return act;
  }

  // ── Mission Complete ────────────────────────────────────────
  /** @returns {'next'|'garage'|null} */
  drawMissionComplete(result, mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.78)'; c.fillRect(0, 0, W, H);
    const pw = 500, ph = 400, px = W/2-pw/2, py = H/2-ph/2;
    rrect(c, px, py, pw, ph, 16, '#0d1a0d', '#2ECC71', 3);

    c.font = '58px Segoe UI'; c.textAlign = 'center';
    c.fillText('🏆', W/2, py + 78);

    c.fillStyle = '#2ECC71'; c.font = 'bold 28px Segoe UI'; c.fillText('DELIVERY COMPLETE!', W/2, py + 125);
    c.fillStyle = '#FFD700'; c.font = 'bold 26px Segoe UI'; c.fillText('+$' + (result?.reward || 0).toLocaleString(), W/2, py + 162);
    c.fillStyle = '#FFF'; c.font = '15px Segoe UI'; c.fillText(result?.mission?.name || '', W/2, py + 194);

    // Stars
    const stars = result?.stars || 1;
    c.font = '32px Segoe UI';
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i < stars ? '#FFD700' : '#333';
      c.fillText('★', W/2 - 48 + i * 48, py + 234);
    }

    // Stats
    c.fillStyle = '#888'; c.font = '13px Segoe UI';
    c.fillText(`Damage taken: ${result?.damage || 0} HP`, W/2, py + 262);
    c.fillStyle = stars === 3 ? '#2ECC71' : stars === 2 ? '#F39C12' : '#E74C3C';
    c.fillText(stars===3?'Perfect run! No damage!':stars===2?'Good run – minor damage':'Rough ride – heavy damage', W/2, py + 284);
    c.textAlign = 'left';

    let act = null;
    if (uiBtn(c,'🚚  NEXT MISSION',  W/2-120, py+ph-112, 240,50,{bg:'#C0392B',hov:'#FFD700',txt:'#FFF',htxt:'#000',font:'bold 16px Segoe UI'},mouse)) act='next';
    if (uiBtn(c,'🔧  UPGRADE TRUCK', W/2-120, py+ph-52,  240,50,{bg:'#1a2040',hov:'#2ECC71',txt:'#FFF',htxt:'#000',font:'bold 16px Segoe UI'},mouse)) act='garage';
    return act;
  }

  // ── Game Over ───────────────────────────────────────────────
  /** @returns {'retry'|'menu'|null} */
  drawGameOver(mouse, W, H) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.82)'; c.fillRect(0, 0, W, H);
    const pw = 400, ph = 290, px = W/2-pw/2, py = H/2-ph/2;
    rrect(c, px, py, pw, ph, 16, '#1a0505', '#E74C3C', 3);

    c.font = '58px Segoe UI'; c.textAlign = 'center';
    c.fillText('💀', W/2, py + 78);
    c.fillStyle = '#E74C3C'; c.font = 'bold 30px Segoe UI'; c.fillText('GAME OVER', W/2, py + 128);
    c.fillStyle = '#FFF'; c.font = '15px Segoe UI'; c.fillText('Your truck ran out of fuel!', W/2, py + 158);
    c.fillStyle = '#888'; c.font = '13px Segoe UI'; c.fillText('Stop at fuel stations along the route', W/2, py + 182);
    c.textAlign = 'left';

    let act = null;
    if (uiBtn(c,'🔄  TRY AGAIN',  W/2-125, py+ph-90, 250,50,{bg:'#C0392B',hov:'#FFD700',txt:'#FFF',htxt:'#000',font:'bold 16px Segoe UI'},mouse)) act='retry';
    if (uiBtn(c,'⬅  Main Menu',  W/2-125, py+ph-30, 250,50,{bg:'#222',hov:'#444',txt:'#FFF',htxt:'#FFF',font:'bold 15px Segoe UI'},mouse)) act='menu';
    return act;
  }
}
