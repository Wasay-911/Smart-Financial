// js/ui/HUD3D.js – Professional HTML overlay HUD for 3D truck simulation

export class HUD3D {
  constructor() {
    this._container = null;
    this._speedCanvas = null;
    this._rpmCanvas   = null;
    this._mapCanvas   = null;
    this._elements    = {};
    this._create();
  }

  _create() {
    // Main HUD container
    const hud = document.createElement('div');
    hud.id = 'hud3d';
    hud.style.cssText = `
      position:fixed; inset:0; pointer-events:none;
      font-family:'Segoe UI',Arial,sans-serif;
      user-select:none; z-index:10;
    `;
    document.body.appendChild(hud);
    this._container = hud;

    this._buildSpeedometer();
    this._buildFuelHealth();
    this._buildMissionPanel();
    this._buildMinimap();
    this._buildGearIndicator();
    this._buildWeatherBadge();
    this._buildNotifications();
    this._buildCameraMode();
    this._buildControls();
  }

  _el(tag, css, parent = this._container) {
    const el = document.createElement(tag);
    el.style.cssText = css;
    parent.appendChild(el);
    return el;
  }

  // ── Speedometer + RPM (bottom right) ──────────────────────
  _buildSpeedometer() {
    const wrap = this._el('div', `
      position:absolute; bottom:24px; right:24px;
      display:flex; gap:14px; align-items:flex-end;
    `);

    // RPM gauge (smaller)
    this._rpmCanvas = document.createElement('canvas');
    this._rpmCanvas.width = this._rpmCanvas.height = 140;
    wrap.appendChild(this._rpmCanvas);

    // Speedometer (larger)
    this._speedCanvas = document.createElement('canvas');
    this._speedCanvas.width = this._speedCanvas.height = 190;
    wrap.appendChild(this._speedCanvas);

    this._elements.wrap = wrap;
  }

  _drawGauge(canvas, value, max, label, unit, color, bgColor = '#0a0a18', gearOrExtra = '') {
    const c   = canvas.getContext('2d');
    const W   = canvas.width, H = canvas.height, cx = W/2, cy = H/2, r = W/2 - 12;
    c.clearRect(0, 0, W, H);

    // Background circle
    c.fillStyle = bgColor;
    c.beginPath(); c.arc(cx, cy, r+4, 0, Math.PI*2); c.fill();

    // Outer ring
    c.strokeStyle = '#333'; c.lineWidth = 3;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI*2); c.stroke();

    // Track arc
    const startA = Math.PI * 0.75, endA = Math.PI * 2.25;
    c.strokeStyle = '#1a1a2e'; c.lineWidth = 10;
    c.beginPath(); c.arc(cx, cy, r-6, startA, endA); c.stroke();

    // Value arc (colour gradient)
    const pct = Math.min(value/max, 1);
    if (pct > 0) {
      const grad = c.createConicalGradient ? null : null;
      c.strokeStyle = pct > 0.8 ? '#E74C3C' : pct > 0.5 ? '#F39C12' : color;
      c.lineWidth = 10;
      c.lineCap = 'round';
      c.beginPath(); c.arc(cx, cy, r-6, startA, startA + (endA-startA)*pct); c.stroke();
    }

    // Tick marks
    c.fillStyle = '#666';
    for (let i = 0; i <= 10; i++) {
      const a = startA + (endA-startA)*i/10;
      const ri = i % 5 === 0 ? r-18 : r-14;
      c.fillRect(
        cx + Math.cos(a)*(r-4) - 1,
        cy + Math.sin(a)*(r-4) - 1,
        2, 2
      );
      // Major marks
      if (i % 2 === 0) {
        c.fillStyle = '#888';
        c.font = `${W < 160 ? 8 : 10}px Segoe UI`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const tv = Math.round(max * i / 10);
        c.fillText(tv, cx + Math.cos(a)*ri, cy + Math.sin(a)*ri);
        c.fillStyle = '#666';
      }
    }

    // Needle
    const needleA = startA + (endA-startA)*pct;
    c.strokeStyle = '#FFD700'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx - Math.cos(needleA)*12, cy - Math.sin(needleA)*12);
    c.lineTo(cx + Math.cos(needleA)*(r-18), cy + Math.sin(needleA)*(r-18));
    c.stroke();

    // Centre cap
    c.fillStyle = '#222'; c.beginPath(); c.arc(cx, cy, 8, 0, Math.PI*2); c.fill();
    c.fillStyle = '#FFD700'; c.beginPath(); c.arc(cx, cy, 5, 0, Math.PI*2); c.fill();

    // Value text
    c.fillStyle = '#FFF'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `bold ${W < 160 ? 22 : 30}px Segoe UI`;
    c.fillText(Math.round(value), cx, cy + r*0.15);
    c.fillStyle = '#999'; c.font = `${W < 160 ? 9 : 11}px Segoe UI`;
    c.fillText(unit, cx, cy + r*0.36);

    // Label at top
    c.fillStyle = '#888'; c.font = `bold ${W < 160 ? 9 : 11}px Segoe UI`;
    c.fillText(label, cx, cy - r*0.62);

    // Extra (gear)
    if (gearOrExtra) {
      c.fillStyle = '#FFD700'; c.font = `bold ${W < 160 ? 12 : 18}px Segoe UI`;
      c.fillText(gearOrExtra, cx + r*0.55, cy + r*0.55);
    }
  }

  // ── Fuel / Health bars (bottom right area, above gauges) ──
  _buildFuelHealth() {
    const wrap = this._el('div', `
      position:absolute; bottom:240px; right:24px; width:216px;
    `);
    this._elements.fuelWrap = wrap;
    this._elements.fuelBar  = this._makeBar('⛽ FUEL', '#F39C12', wrap, 'fuelBar');
    this._elements.healthBar = this._makeBar('❤ HEALTH', '#E74C3C', wrap, 'healthBar');
  }

  _makeBar(label, color, parent, id) {
    const wrap = this._el('div', `margin-bottom:6px;`, parent);
    this._el('div', `
      color:${color}; font-size:11px; font-weight:bold;
      text-shadow:0 1px 3px #000; margin-bottom:2px;
    `, wrap).textContent = label;
    const track = this._el('div', `
      background:rgba(0,0,0,0.6); border:1px solid #333; border-radius:4px;
      height:14px; overflow:hidden;
    `, wrap);
    const fill = this._el('div', `
      height:100%; background:${color}; border-radius:3px;
      width:100%; transition:width 0.1s;
    `, track);
    fill.id = id;
    return fill;
  }

  // ── Mission panel (top center) ────────────────────────────
  _buildMissionPanel() {
    const panel = this._el('div', `
      position:absolute; top:20px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,8,0.78); border:2px solid #FFD700;
      border-radius:12px; padding:10px 20px; min-width:400px; max-width:520px;
      text-align:center; backdrop-filter:blur(4px);
    `);
    this._elements.missionTitle = this._el('div', `color:#FFD700;font-size:16px;font-weight:bold;`, panel);
    this._elements.missionSub   = this._el('div', `color:#CCC;font-size:12px;margin-top:4px;`, panel);
    this._elements.missionReward = this._el('div', `color:#2ECC71;font-size:12px;font-weight:bold;margin-top:4px;`, panel);
    this._elements.missionPanel  = panel;
    panel.style.display = 'none';
  }

  // ── GPS Minimap (bottom left) ──────────────────────────────
  _buildMinimap() {
    const wrap = this._el('div', `
      position:absolute; bottom:24px; left:24px;
      background:rgba(0,0,10,0.82); border:2px solid #444;
      border-radius:10px; overflow:hidden; padding:2px;
    `);
    this._mapCanvas = document.createElement('canvas');
    this._mapCanvas.width = this._mapCanvas.height = 200;
    wrap.appendChild(this._mapCanvas);
    const lbl = this._el('div', `
      color:#666; font-size:10px; text-align:center;
      background:rgba(0,0,0,0.5); padding:2px;
    `, wrap);
    lbl.textContent = 'GPS MAP  [M = Full Map]';
  }

  // ── Gear indicator ─────────────────────────────────────────
  _buildGearIndicator() {
    const el = this._el('div', `
      position:absolute; bottom:240px; right:252px;
      background:rgba(0,0,10,0.85); border:2px solid #333; border-radius:10px;
      padding:8px 14px; text-align:center;
    `);
    this._el('div', `color:#888;font-size:10px;`, el).textContent = 'GEAR';
    this._elements.gear = this._el('div', `
      color:#FFD700; font-size:36px; font-weight:bold; line-height:1;
    `, el);
    this._elements.gear.textContent = '1';
    this._elements.gearBox = el;
  }

  // ── Weather badge ──────────────────────────────────────────
  _buildWeatherBadge() {
    const el = this._el('div', `
      position:absolute; top:20px; left:20px;
      background:rgba(0,0,10,0.75); border:1px solid #333; border-radius:8px;
      padding:6px 14px; color:#7EC8E3; font-size:13px; font-weight:bold;
    `);
    el.textContent = '☀️ Clear';
    this._elements.weather = el;
  }

  // ── Notifications (top center, below mission) ──────────────
  _buildNotifications() {
    const el = this._el('div', `
      position:absolute; top:150px; left:50%; transform:translateX(-50%);
      display:flex; flex-direction:column; align-items:center; gap:8px; pointer-events:none;
    `);
    this._elements.notifArea = el;
    this._notifs = [];
  }

  notify(text, color = '#FFD700', duration = 3000) {
    const el = document.createElement('div');
    el.style.cssText = `
      background:rgba(0,0,8,0.82); border:1px solid ${color}; border-radius:8px;
      padding:8px 20px; color:${color}; font-size:16px; font-weight:bold;
      animation:fadeInOut 0.3s ease; box-shadow:0 2px 12px rgba(0,0,0,0.6);
    `;
    el.textContent = text;
    this._elements.notifArea.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  // ── Camera mode label ──────────────────────────────────────
  _buildCameraMode() {
    const el = this._el('div', `
      position:absolute; top:20px; right:20px;
      background:rgba(0,0,10,0.7); border:1px solid #333; border-radius:6px;
      padding:4px 10px; color:#888; font-size:11px;
    `);
    el.textContent = '1=Chase  2=Cockpit  3=Hood  4=Cinematic';
    this._elements.camHint = el;
  }

  // ── Controls hint ──────────────────────────────────────────
  _buildControls() {
    const el = this._el('div', `
      position:absolute; top:60px; left:20px;
      background:rgba(0,0,8,0.75); border:1px solid #333; border-radius:8px;
      padding:8px 12px; color:#888; font-size:11px; line-height:1.6;
    `);
    el.innerHTML = `
      <span style="color:#FFD700;font-weight:bold">CONTROLS</span><br>
      W/↑ Accelerate<br>S/↓ Brake/Rev<br>
      A/← D/→ Steer<br>Space Handbrake<br>
      F Refuel  R Repair<br>H Horn  M Map<br>
      <span style="color:#9B59B6">Right-drag: orbit cam</span>
    `;
    this._elements.controls = el;
    // Auto-hide after 8s
    setTimeout(() => el.style.display = 'none', 8000);
  }

  // ── Main render call ───────────────────────────────────────
  render(physics, missions, weather, camMode, roadPoints, timeOfDay) {
    if (!physics) return;   // guard: called before world is ready

    // Speedometer
    this._drawGauge(
      this._speedCanvas,
      Math.max(0, physics.speedKmh || 0),
      140,
      'SPEED', 'km/h',
      '#3498DB',
      '#0a0a18',
      `G${physics.gear || 1}`
    );

    // RPM
    this._drawGauge(
      this._rpmCanvas,
      physics.rpm,
      4200,
      'RPM', 'x100',
      '#E74C3C',
      '#0a0a18'
    );

    // Fuel bar
    if (this._elements.fuelBar)  this._elements.fuelBar.style.width  = `${physics.fuelPct  * 100}%`;
    if (this._elements.healthBar)this._elements.healthBar.style.width = `${physics.healthPct* 100}%`;
    // Low fuel warning
    if (physics.fuelPct < 0.15) {
      this._elements.fuelBar.style.background = Math.sin(Date.now()/200)>0 ? '#E74C3C' : '#F39C12';
    }

    // Gear
    if (this._elements.gear) this._elements.gear.textContent = physics.speed < -0.5 ? 'R' : String(physics.gear);

    // Weather
    if (weather && this._elements.weather) {
      this._elements.weather.textContent = weather.displayName;
    }

    // Mission panel
    this._updateMissionPanel(missions);

    // Minimap
    this._drawMinimap(physics, missions, roadPoints, timeOfDay);
  }

  _updateMissionPanel(missions) {
    const panel = this._elements.missionPanel;
    if (!panel) return;
    if (!missions?.active) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    const m = missions.active;
    this._elements.missionTitle.textContent = m.name;
    const phase = missions.phase;
    if (phase === 'pickup') {
      this._elements.missionSub.textContent = `Drive to ${m.fromCityDef?.name || 'origin'} warehouse`;
    } else {
      this._elements.missionSub.textContent = `Deliver to ${m.toCityDef?.name || 'destination'}`;
    }
    this._elements.missionReward.textContent = `Reward: $${m.def?.baseReward?.toLocaleString() || 0}`;
  }

  _drawMinimap(physics, missions, roadPts, timeOfDay) {
    const c = this._mapCanvas.getContext('2d');
    const W = this._mapCanvas.width, H = this._mapCanvas.height;
    c.clearRect(0, 0, W, H);

    // Background
    c.fillStyle = '#0a0a1a'; c.fillRect(0, 0, W, H);

    const WORLD = 5000;
    const toMap = (wx, wz) => ({
      x: (wx / WORLD + 0.5) * W,
      y: (wz / WORLD + 0.5) * H,
    });

    // Draw road
    if (roadPts && roadPts.length > 1) {
      c.strokeStyle = '#444'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath();
      const p0 = toMap(roadPts[0].x, roadPts[0].z);
      c.moveTo(p0.x, p0.y);
      for (let i = 1; i < roadPts.length; i += 3) {
        const p = toMap(roadPts[i].x, roadPts[i].z);
        c.lineTo(p.x, p.y);
      }
      c.stroke();
    }

    // Mission markers
    if (missions?.active) {
      const phase = missions.phase;
      const pos3d = phase === 'pickup' ? missions.pickupPos : missions.deliveryPos;
      if (pos3d) {
        const mp = toMap(pos3d.x, pos3d.z);
        const pulse = (Math.sin(Date.now()/300) + 1) * 0.5;
        c.fillStyle = phase === 'pickup' ? '#2ECC71' : '#E74C3C';
        c.globalAlpha = 0.5 + pulse * 0.5;
        c.beginPath(); c.arc(mp.x, mp.y, 6, 0, Math.PI*2); c.fill();
        c.globalAlpha = 1;
      }
    }

    // Player truck
    const tp = toMap(physics.position.x, physics.position.z);
    c.save();
    c.translate(tp.x, tp.y);
    c.rotate(physics.heading);
    c.fillStyle = '#FFD700';
    c.beginPath(); c.moveTo(0,-7); c.lineTo(5,5); c.lineTo(-5,5); c.closePath(); c.fill();
    c.restore();

    // Compass rose
    c.fillStyle = '#333'; c.beginPath(); c.arc(W-22, 22, 18, 0, Math.PI*2); c.fill();
    c.fillStyle = '#E74C3C'; c.font = 'bold 11px Arial'; c.textAlign='center'; c.textBaseline='middle';
    c.fillText('N', W-22, 22-11);
    c.fillStyle = '#888';
    c.fillText('S', W-22, 22+11);
    c.fillText('W', W-22-11, 22);
    c.fillText('E', W-22+11, 22);
  }

  // ── Pickup / delivery 3D markers (called from game) ───────
  show3DMarker(renderer, camera, scene, worldPos, label, color) {
    // Implemented externally via CSS3DRenderer or simple HTML overlay
    // For now, arrows handled in game3d.js via HTML element
  }

  dispose() {
    if (this._container) this._container.remove();
  }
}
