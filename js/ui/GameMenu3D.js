// js/ui/GameMenu3D.js – In-game settings: camera, vehicle, audio controls

export class GameMenu3D {
  constructor() {
    this._el    = null;
    this._open  = false;
    this.settings = {
      cameraMode:       'chase',   // chase|cockpit|hood|cinematic
      cameraDistance:   18,        // spring arm length
      cameraHeight:     6.5,
      cameraLag:        5.5,
      steerSensitivity: 1.0,       // 0.5 – 2.0
      gearMode:         'auto',    // auto | manual
      cruiseSpeed:      0,         // 0 = off
      musicVolume:      0.4,
      sfxVolume:        0.8,
      showFPS:          false,
    };
    this._callbacks = {};
    this._build();
  }

  on(event, cb) { this._callbacks[event] = cb; }
  _emit(event, data) { this._callbacks[event]?.(data); }

  _build() {
    const el = document.createElement('div');
    el.id = 'gameMenu3d';
    el.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      background:rgba(5,5,20,0.96); border:2px solid #FFD700;
      border-radius:16px; padding:28px 36px; min-width:500px; max-width:600px;
      color:#FFF; font-family:'Segoe UI',Arial,sans-serif; z-index:100;
      display:none; box-shadow:0 8px 40px rgba(0,0,0,0.8);
    `;
    el.innerHTML = this._html();
    document.body.appendChild(el);
    this._el = el;
    this._bindEvents();
  }

  _html() { return `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="color:#FFD700;font-size:22px;font-weight:bold;margin-bottom:4px">⚙ SETTINGS</div>
      <div style="color:#888;font-size:12px">Press TAB or ESC to close</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <!-- CAMERA -->
      <div style="background:#0d1117;border-radius:10px;padding:14px">
        <div style="color:#3498DB;font-weight:bold;font-size:13px;margin-bottom:10px">📷 CAMERA</div>
        <div style="margin-bottom:8px">
          <div style="color:#888;font-size:11px;margin-bottom:4px">Mode</div>
          <div style="display:flex;gap:4px">
            ${['Chase','Cockpit','Hood','Cinematic'].map((m,i)=>`<button class="cmodeBtn" data-idx="${i+1}" style="flex:1;padding:5px;background:#1a2040;border:1px solid #333;color:#FFF;border-radius:5px;cursor:pointer;font-size:11px">${m}</button>`).join('')}
          </div>
        </div>
        <label style="font-size:11px;color:#888">Distance: <span id="camDistVal">${this.settings.cameraDistance}</span>m</label>
        <input id="camDist" type="range" min="8" max="35" value="${this.settings.cameraDistance}" style="width:100%;margin:3px 0"><br>
        <label style="font-size:11px;color:#888">Height: <span id="camHVal">${this.settings.cameraHeight}</span>m</label>
        <input id="camH" type="range" min="2" max="18" value="${this.settings.cameraHeight}" style="width:100%;margin:3px 0"><br>
        <label style="font-size:11px;color:#888">Lag: <span id="camLagVal">${this.settings.cameraLag}</span></label>
        <input id="camLag" type="range" min="1" max="12" step="0.5" value="${this.settings.cameraLag}" style="width:100%;margin:3px 0">
      </div>

      <!-- VEHICLE -->
      <div style="background:#0d1117;border-radius:10px;padding:14px">
        <div style="color:#E74C3C;font-weight:bold;font-size:13px;margin-bottom:10px">🚛 VEHICLE</div>
        <label style="font-size:11px;color:#888">Steering Sensitivity: <span id="steerVal">${this.settings.steerSensitivity}</span>x</label>
        <input id="steerSens" type="range" min="0.5" max="2.0" step="0.1" value="${this.settings.steerSensitivity}" style="width:100%;margin:3px 0"><br>
        <div style="margin-top:8px">
          <div style="color:#888;font-size:11px;margin-bottom:4px">Transmission</div>
          <div style="display:flex;gap:6px">
            <button id="autoGear" style="flex:1;padding:6px;background:#1a6020;border:1px solid #2ECC71;color:#FFF;border-radius:6px;cursor:pointer;font-size:12px">AUTO</button>
            <button id="manualGear" style="flex:1;padding:6px;background:#1a1a1a;border:1px solid #333;color:#888;border-radius:6px;cursor:pointer;font-size:12px">MANUAL (Q/E)</button>
          </div>
        </div>
        <div style="margin-top:10px">
          <div style="color:#888;font-size:11px;margin-bottom:4px">Cruise Control (C)</div>
          <div id="cruiseDisplay" style="background:#0d1117;border:1px solid #333;border-radius:6px;padding:4px 10px;font-size:12px;color:#666">OFF</div>
        </div>
      </div>

      <!-- AUDIO -->
      <div style="background:#0d1117;border-radius:10px;padding:14px">
        <div style="color:#F39C12;font-weight:bold;font-size:13px;margin-bottom:10px">🎵 AUDIO</div>
        <label style="font-size:11px;color:#888">Music Volume: <span id="musVolVal">${Math.round(this.settings.musicVolume*100)}%</span></label>
        <input id="musVol" type="range" min="0" max="100" value="${Math.round(this.settings.musicVolume*100)}" style="width:100%;margin:3px 0"><br>
        <label style="font-size:11px;color:#888">SFX Volume: <span id="sfxVolVal">${Math.round(this.settings.sfxVolume*100)}%</span></label>
        <input id="sfxVol" type="range" min="0" max="100" value="${Math.round(this.settings.sfxVolume*100)}" style="width:100%;margin:3px 0">
        <button id="muteAll" style="width:100%;margin-top:8px;padding:6px;background:#400a0a;border:1px solid #E74C3C;color:#FFF;border-radius:6px;cursor:pointer;font-size:12px">🔇 MUTE ALL</button>
      </div>

      <!-- DISPLAY -->
      <div style="background:#0d1117;border-radius:10px;padding:14px">
        <div style="color:#9B59B6;font-weight:bold;font-size:13px;margin-bottom:10px">🖥 DISPLAY</div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;margin-bottom:8px">
          <input id="showFps" type="checkbox" ${this.settings.showFPS?'checked':''}> Show FPS
        </label>
        <div style="color:#888;font-size:11px;margin-top:6px">Controls reference:</div>
        <div style="color:#666;font-size:10px;line-height:1.7;margin-top:4px">
          W/S/A/D – Drive &nbsp; Space – Handbrake<br>
          F – Refuel &nbsp; R – Repair &nbsp; H – Horn<br>
          M – Country Map &nbsp; Tab – This menu<br>
          1/2/3/4 – Camera &nbsp; Q/E – Manual gear<br>
          C – Cruise control &nbsp; Right-drag – Orbit
        </div>
      </div>
    </div>

    <div style="text-align:center;margin-top:16px">
      <button id="closeMenu" style="padding:10px 40px;background:#C0392B;border:none;color:#FFF;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer">
        ▶ RESUME DRIVING
      </button>
    </div>
  `; }

  _bindEvents() {
    const el = this._el;

    el.querySelectorAll('.cmodeBtn').forEach(btn => {
      btn.addEventListener('click', () => { this._emit('cameraMode', parseInt(btn.dataset.idx)); });
    });

    this._bindSlider('camDist',  'camDistVal', v => { this.settings.cameraDistance=v; this._emit('camDist',v); });
    this._bindSlider('camH',     'camHVal',    v => { this.settings.cameraHeight=v;   this._emit('camHeight',v); });
    this._bindSlider('camLag',   'camLagVal',  v => { this.settings.cameraLag=v;      this._emit('camLag',v); });
    this._bindSlider('steerSens','steerVal',   v => { this.settings.steerSensitivity=v; this._emit('steerSens',v); });
    this._bindSlider('musVol',   'musVolVal',  v => { this.settings.musicVolume=v/100; this._emit('musicVol',v/100); }, true);
    this._bindSlider('sfxVol',   'sfxVolVal',  v => { this.settings.sfxVolume=v/100;  this._emit('sfxVol',v/100); }, true);

    el.querySelector('#autoGear')?.addEventListener('click', () => {
      this.settings.gearMode='auto';
      this._styleGearBtns(true);
      this._emit('gearMode','auto');
    });
    el.querySelector('#manualGear')?.addEventListener('click', () => {
      this.settings.gearMode='manual';
      this._styleGearBtns(false);
      this._emit('gearMode','manual');
    });

    el.querySelector('#muteAll')?.addEventListener('click', () => this._emit('mute'));
    el.querySelector('#showFps')?.addEventListener('change', e => { this.settings.showFPS=e.target.checked; });
    el.querySelector('#closeMenu')?.addEventListener('click', () => this.close());
  }

  _bindSlider(id, valId, cb, pct=false) {
    const slider = this._el.querySelector('#'+id);
    const label  = this._el.querySelector('#'+valId);
    if (!slider) return;
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      if (label) label.textContent = pct ? Math.round(v)+'%' : parseFloat(v).toFixed(1);
      cb(v);
    });
  }

  _styleGearBtns(auto) {
    const a = this._el.querySelector('#autoGear');
    const m = this._el.querySelector('#manualGear');
    if (!a||!m) return;
    a.style.background = auto ? '#1a6020' : '#1a1a1a';
    a.style.borderColor= auto ? '#2ECC71' : '#333';
    a.style.color      = auto ? '#FFF'    : '#888';
    m.style.background = auto ? '#1a1a1a' : '#400a0a';
    m.style.borderColor= auto ? '#333'    : '#E74C3C';
    m.style.color      = auto ? '#888'    : '#FFF';
  }

  updateCruise(speed) {
    const d = this._el?.querySelector('#cruiseDisplay');
    if (d) d.textContent = speed > 0 ? `ON — ${Math.round(speed)} km/h` : 'OFF';
    if (d) d.style.color = speed > 0 ? '#2ECC71' : '#666';
  }

  toggle() { this._open ? this.close() : this.open(); }
  open()  { this._el.style.display='block'; this._open=true; document.body.style.cursor='default'; }
  close() { this._el.style.display='none'; this._open=false; document.body.style.cursor='crosshair'; this._emit('close'); }
  get isOpen() { return this._open; }
}
