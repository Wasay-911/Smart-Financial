// js/engine/InputManager.js

export class InputManager {
  constructor() {
    this._keys  = {};
    this._just  = {};
    this.mouse  = {x:0, y:0, clicked:false, down:false};

    /** Touch-based virtual buttons (mobile) */
    this.touch = {
      accelerate: false,
      brake:      false,
      left:       false,
      right:      false,
      action:     false,  // refuel / interact
    };

    this._touchIds = {}; // tracking which finger controls which button
    this._btnRects = {}; // populated by drawTouchControls()
  }

  /** Call once on startup */
  bind() {
    window.addEventListener('keydown', e => {
      if (!this._keys[e.key]) this._just[e.key] = true;
      this._keys[e.key] = true;
      const nav = [' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
      if (nav.includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this._keys[e.key] = false; });

    window.addEventListener('mousemove',  e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    window.addEventListener('mousedown',  e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.down = true; this.mouse.clicked = true; });
    window.addEventListener('mouseup',    ()=> { this.mouse.down = false; });

    window.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this.mouse.x = t.clientX; this.mouse.y = t.clientY;
        this.mouse.clicked = true; this.mouse.down = true;
        this._evalTouchStart(t);
      }
    }, {passive:false});

    window.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) this._evalTouchMove(t);
    }, {passive:false});

    window.addEventListener('touchend', e => {
      e.preventDefault();
      for (const t of e.changedTouches) this._evalTouchEnd(t);
      if (e.touches.length === 0) this.mouse.down = false;
    }, {passive:false});

    return this;
  }

  _evalTouchStart(t) {
    for (const [name, r] of Object.entries(this._btnRects)) {
      if (t.clientX >= r.x && t.clientX <= r.x + r.w &&
          t.clientY >= r.y && t.clientY <= r.y + r.h) {
        this.touch[name]  = true;
        this._touchIds[t.identifier] = name;
      }
    }
  }

  _evalTouchMove(t) {
    const name = this._touchIds[t.identifier];
    if (name) return; // already assigned
    this._evalTouchStart(t);
  }

  _evalTouchEnd(t) {
    const name = this._touchIds[t.identifier];
    if (name) {
      this.touch[name] = false;
      delete this._touchIds[t.identifier];
    }
  }

  /** Query helpers */
  isDown(key)    { return !!this._keys[key]; }
  wasPressed(key){ return !!this._just[key]; }

  /** Must be called at end of each frame */
  clearFrame() {
    this._just = {};
    this.mouse.clicked = false;
  }

  /** Returns true if accelerate action is active (keyboard or touch) */
  get accel()  { return this.isDown('w')||this.isDown('W')||this.isDown('ArrowUp')   ||this.touch.accelerate; }
  get brakei() { return this.isDown('s')||this.isDown('S')||this.isDown('ArrowDown') ||this.touch.brake;      }
  get steerL() { return this.isDown('a')||this.isDown('A')||this.isDown('ArrowLeft') ||this.touch.left;       }
  get steerR() { return this.isDown('d')||this.isDown('D')||this.isDown('ArrowRight')||this.touch.right;      }
  get refuel() { return this.isDown('f')||this.isDown('F')||this.touch.action; }

  /**
   * Render virtual buttons and register their hit-rects.
   * Call from render loop when in DRIVING state.
   */
  drawTouchControls(ctx, W, H) {
    const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!isMobile) { this._btnRects = {}; return; }

    const sz = Math.min(W, H) * 0.12;
    const pad = 12;
    const bY = H - sz - pad;

    const btns = [
      {name:'left',       x: pad,              y: bY,          w: sz, h: sz, label:'◄'},
      {name:'right',      x: pad + sz + pad,   y: bY,          w: sz, h: sz, label:'►'},
      {name:'accelerate', x: W - sz*2 - pad*2, y: bY - sz - pad, w: sz*2, h: sz, label:'▲'},
      {name:'brake',      x: W - sz*2 - pad*2, y: bY,          w: sz*2, h: sz, label:'▼'},
    ];

    ctx.save();
    for (const b of btns) {
      this._btnRects[b.name] = {x:b.x, y:b.y, w:b.w, h:b.h};
      const pressed = this.touch[b.name];
      ctx.fillStyle   = pressed ? 'rgba(255,211,0,0.55)' : 'rgba(255,255,255,0.18)';
      ctx.strokeStyle = pressed ? '#FFD700' : 'rgba(255,255,255,0.45)';
      ctx.lineWidth   = 2;

      const r = 12;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, r);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle   = '#FFF';
      ctx.font        = `bold ${sz * 0.4}px Segoe UI`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w/2, b.y + b.h/2);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
}
