// js/systems/AudioSystem.js – Web Audio API procedural sound engine

export class AudioSystem {
  constructor() {
    this._ctx         = null;
    this._engineOsc   = null;
    this._engineGain  = null;
    this._rainNode    = null;
    this._rainGain    = null;
    this._started     = false;
    this.muted        = false;
    this._masterGain  = null;
  }

  // ── Bootstrap ─────────────────────────────────────────────
  /** Must be called after a user gesture (click / key) */
  init() {
    if (this._ctx) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 1.0;
      this._masterGain.connect(this._ctx.destination);
      this._started = true;
    } catch (e) {
      console.warn('[AudioSystem] Web Audio API unavailable:', e);
    }
  }

  get ready() { return this._started && this._ctx && this._ctx.state !== 'closed'; }

  /** Toggle mute/unmute */
  toggleMute() {
    this.muted = !this.muted;
    if (this._masterGain) {
      this._masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this._ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  // ── Engine sound (continuous oscillator) ──────────────────
  startEngine() {
    if (!this.ready || this._engineOsc) return;

    // Two detuned oscillators for richness
    this._engineGain = this._ctx.createGain();
    this._engineGain.gain.value = 0.04;

    const filter = this._ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 150;
    filter.Q.value = 0.6;

    this._engineOsc = this._ctx.createOscillator();
    this._engineOsc.type = 'sawtooth';
    this._engineOsc.frequency.value = 55;
    this._engineOsc.connect(filter);

    const osc2 = this._ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 57;
    osc2.connect(filter);

    filter.connect(this._engineGain);
    this._engineGain.connect(this._masterGain);
    this._engineOsc.start();
    osc2.start();
    this._engineOsc2 = osc2;
  }

  /** Update engine pitch based on current speed */
  updateEngine(speed, maxSpeed) {
    if (!this.ready || !this._engineOsc) return;
    const t   = this._ctx.currentTime;
    const pct = Math.abs(speed) / maxSpeed;
    const f   = 55 + pct * 220;    // 55Hz idle → 275Hz full throttle
    const g   = 0.025 + pct * 0.04; // louder at speed
    this._engineOsc.frequency.setTargetAtTime(f, t, 0.12);
    this._engineOsc2?.frequency.setTargetAtTime(f * 1.03, t, 0.12);
    this._engineGain.gain.setTargetAtTime(g, t, 0.1);
  }

  stopEngine() {
    if (!this.ready || !this._engineOsc) return;
    try { this._engineOsc.stop(); this._engineOsc2?.stop(); } catch (e) {}
    this._engineOsc  = null;
    this._engineOsc2 = null;
    this._engineGain = null;
  }

  // ── Rain ambient sound ─────────────────────────────────────
  startRain(intensity = 0.3) {
    if (!this.ready || this._rainNode) return;
    const bufSize = this._ctx.sampleRate * 2;
    const buf     = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    this._rainNode = this._ctx.createBufferSource();
    this._rainNode.buffer = buf;
    this._rainNode.loop   = true;

    const lp = this._ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 600;

    this._rainGain = this._ctx.createGain();
    this._rainGain.gain.value = intensity * 0.12;

    this._rainNode.connect(lp);
    lp.connect(this._rainGain);
    this._rainGain.connect(this._masterGain);
    this._rainNode.start();
  }

  updateRain(intensity) {
    if (this._rainGain) {
      this._rainGain.gain.setTargetAtTime(intensity * 0.12, this._ctx.currentTime, 0.5);
    } else if (intensity > 0.05) {
      this.startRain(intensity);
    }
  }

  stopRain() {
    if (!this._rainNode) return;
    try { this._rainNode.stop(); } catch (e) {}
    this._rainNode = null;
    this._rainGain = null;
  }

  // ── One-shot sounds ────────────────────────────────────────
  horn() {
    if (!this.ready) return;
    const freqs = [349, 440]; // F4 + A4 chord
    freqs.forEach(freq => {
      const osc  = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type = 'square'; osc.frequency.value = freq;
      const t = this._ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.setValueAtTime(0.15, t + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.connect(gain); gain.connect(this._masterGain);
      osc.start(t); osc.stop(t + 0.7);
    });
  }

  collision(intensity = 1.0) {
    if (!this.ready) return;
    const dur    = 0.3;
    const bufSz  = Math.ceil(this._ctx.sampleRate * dur);
    const buf    = this._ctx.createBuffer(1, bufSz, this._ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufSz; i++) data[i] = Math.random() * 2 - 1;

    const src  = this._ctx.createBufferSource();
    src.buffer = buf;
    const hp   = this._ctx.createBiquadFilter();
    hp.type    = 'highpass'; hp.frequency.value = 200;
    const gain = this._ctx.createGain();
    const t    = this._ctx.currentTime;
    gain.gain.setValueAtTime(0.6 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp); hp.connect(gain); gain.connect(this._masterGain);
    src.start(t);
  }

  success() {
    if (!this.ready) return;
    // Ascending major chord arpeggio
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc  = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type   = 'sine'; osc.frequency.value = freq;
      const t    = this._ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain); gain.connect(this._masterGain);
      osc.start(t); osc.stop(t + 0.4);
    });
  }

  levelUp() {
    if (!this.ready) return;
    // Triumphant fanfare
    [523, 659, 784, 659, 1047].forEach((freq, i) => {
      const osc  = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type   = 'triangle'; osc.frequency.value = freq;
      const t    = this._ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain); gain.connect(this._masterGain);
      osc.start(t); osc.stop(t + 0.5);
    });
  }

  uiClick() {
    if (!this.ready) return;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type   = 'sine'; osc.frequency.value = 880;
    const t    = this._ctx.currentTime;
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain); gain.connect(this._masterGain);
    osc.start(t); osc.stop(t + 0.08);
  }

  achievementUnlocked() {
    if (!this.ready) return;
    [660, 880, 1100].forEach((freq, i) => {
      const osc  = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type   = 'sine'; osc.frequency.value = freq;
      const t    = this._ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain); gain.connect(this._masterGain);
      osc.start(t); osc.stop(t + 0.32);
    });
  }

  refuel() {
    if (!this.ready) return;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type   = 'sine'; osc.frequency.value = 330;
    const t    = this._ctx.currentTime;
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.setValueAtTime(0.1, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain); gain.connect(this._masterGain);
    osc.start(t); osc.stop(t + 0.3);
  }
}
