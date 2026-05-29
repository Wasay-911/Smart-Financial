// js/systems/WeatherSystem.js – Weather state machine with gameplay effects

export const WEATHER = Object.freeze({
  SUNNY:  'sunny',
  CLOUDY: 'cloudy',
  RAIN:   'rain',
  FOG:    'fog',
  STORM:  'storm',
});

/** Weighted transition table: from → [{to, weight}] */
const TRANSITIONS = {
  sunny:  [{to:'sunny', w:70}, {to:'cloudy', w:25}, {to:'fog',   w:5}],
  cloudy: [{to:'sunny', w:30}, {to:'cloudy', w:35}, {to:'rain',  w:30}, {to:'fog', w:5}],
  rain:   [{to:'cloudy', w:40},{to:'rain',   w:35}, {to:'storm', w:25}],
  fog:    [{to:'sunny',  w:40},{to:'cloudy', w:40}, {to:'fog',   w:20}],
  storm:  [{to:'rain',   w:50},{to:'storm',  w:30}, {to:'cloudy',w:20}],
};

const WEATHER_DURATION = { sunny:120, cloudy:90, rain:60, fog:80, storm:45 }; // seconds

/** Effects per weather state (gameplay multipliers 1.0 = normal) */
const WEATHER_EFFECTS = {
  sunny:  { traction:1.0, visibility:1.0, rewardBonus:1.0,  fuelMult:1.0  },
  cloudy: { traction:0.95,visibility:0.9, rewardBonus:1.05, fuelMult:1.0  },
  rain:   { traction:0.75,visibility:0.7, rewardBonus:1.15, fuelMult:1.1  },
  fog:    { traction:0.9, visibility:0.3, rewardBonus:1.2,  fuelMult:1.0  },
  storm:  { traction:0.55,visibility:0.4, rewardBonus:1.4,  fuelMult:1.15 },
};

export class WeatherSystem {
  constructor() {
    this.current     = WEATHER.SUNNY;
    this._timer      = WEATHER_DURATION.sunny;
    this._transition = 0;      // 0-1 blend toward next state
    this._next       = null;
    this._rain       = [];     // rain particle cache
    this._lightning  = 0;     // flash timer

    // Expose for renderer
    this.rainIntensity = 0;    // 0-1
    this.fogIntensity  = 0;    // 0-1
  }

  // ── Properties ────────────────────────────────────────────
  get effects()    { return WEATHER_EFFECTS[this.current]; }
  get isStorm()    { return this.current === WEATHER.STORM; }
  get isRaining()  { return this.current === WEATHER.RAIN || this.isStorm; }
  get isFoggy()    { return this.current === WEATHER.FOG  || this.isStorm; }
  get displayName(){ return {sunny:'☀️ Sunny',cloudy:'☁️ Cloudy',rain:'🌧 Rain',fog:'🌫 Fog',storm:'⛈ Storm'}[this.current]; }

  // ── Update ────────────────────────────────────────────────
  update(dt, audio) {
    this._timer -= dt;
    if (this._timer <= 0) this._advance();

    // Smooth rain/fog intensities
    const target = { rain: this.isRaining ? 1 : 0, fog: this.isFoggy ? 0.7 : 0 };
    const spd = 0.5 * dt;
    this.rainIntensity = this._approach(this.rainIntensity, target.rain, spd);
    this.fogIntensity  = this._approach(this.fogIntensity,  target.fog,  spd * 0.5);

    // Storm lightning flash
    if (this.isStorm) {
      this._lightning -= dt;
      if (this._lightning <= 0) this._lightning = 8 + Math.random() * 15;
    } else {
      this._lightning = 99;
    }

    // Audio
    if (audio?.ready) audio.updateRain(this.rainIntensity);
    if (!this.isRaining) audio?.stopRain?.();

    // Generate rain particles (consumed by Renderer)
    this._updateRainParticles(dt);
  }

  _approach(val, target, step) {
    if (val < target) return Math.min(target, val + step);
    if (val > target) return Math.max(target, val - step);
    return val;
  }

  _advance() {
    const rows  = TRANSITIONS[this.current];
    const total = rows.reduce((s, r) => s + r.w, 0);
    let   rnd   = Math.random() * total;
    for (const row of rows) {
      rnd -= row.w;
      if (rnd <= 0) { this.current = row.to; break; }
    }
    this._timer = WEATHER_DURATION[this.current] + (Math.random() - 0.5) * 20;
  }

  // ── Rain particle simulation ───────────────────────────────
  _updateRainParticles(dt) {
    if (!this.isRaining) { this._rain = []; return; }
    const count = Math.floor(this.rainIntensity * 120);
    while (this._rain.length < count) {
      this._rain.push({x: Math.random(), y: Math.random(), spd: 0.4 + Math.random() * 0.5});
    }
    for (const r of this._rain) {
      r.y += r.spd * dt;
      r.x += 0.06 * dt; // wind effect
      if (r.y > 1) { r.y = 0; r.x = Math.random(); }
    }
  }

  /** Draw weather overlay on canvas */
  drawOverlay(ctx, W, H, timeOfDay) {
    // Rain drops
    if (this.rainIntensity > 0.05) {
      ctx.save();
      ctx.strokeStyle = `rgba(150,190,220,${this.rainIntensity * 0.55})`;
      ctx.lineWidth = 1;
      for (const r of this._rain) {
        const x = r.x * W, y = r.y * H;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 14 * r.spd); ctx.stroke();
      }
      ctx.restore();
    }

    // Fog overlay
    if (this.fogIntensity > 0.05) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      const a = this.fogIntensity * 0.65;
      grad.addColorStop(0, `rgba(220,230,240,${a})`);
      grad.addColorStop(1, `rgba(200,215,225,${a * 0.7})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Storm lightning flash
    if (this.isStorm && this._lightning < 0.12) {
      ctx.fillStyle = `rgba(255,255,255,${(0.12 - this._lightning) / 0.12 * 0.45})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Weather banner (brief display on change)
    // (handled by NotificationSystem via GameEngine)
  }

  /** Returns true this frame for achievement tracking */
  get lightningFlash() { return this.isStorm && this._lightning < 0.05; }

  forceWeather(state) {
    if (WEATHER[state.toUpperCase()]) {
      this.current = WEATHER[state.toUpperCase()];
      this._timer = WEATHER_DURATION[this.current];
    }
  }
}
