// js/systems/AudioSystem3D.js – Web Audio API: ambient music + SFX

export class AudioSystem3D {
  constructor() {
    this._ctx          = null;
    this._master       = null;
    this._musicGain    = null;
    this._engineOsc    = null;
    this._engineGain   = null;
    this._rainNode     = null;
    this._rainGain     = null;
    this._melodySched  = null;
    this._ready        = false;
    this.muted         = false;
    this.musicVolume   = 0.4;
    this.sfxVolume     = 0.8;
    this._musicRunning = false;
  }

  // ── Bootstrap (must be called after user gesture) ─────────
  init() {
    if (this._ctx) return;
    try {
      this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = 1.0;
      this._master.connect(this._ctx.destination);
      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = this.musicVolume;
      this._musicGain.connect(this._master);
      this._ready  = true;
    } catch(e) { console.warn('[Audio3D]', e); }
  }

  get ready() { return this._ready && this._ctx?.state !== 'closed'; }

  setMuted(v) {
    this.muted = v;
    if (this._master) this._master.gain.setTargetAtTime(v ? 0 : 1, this._ctx.currentTime, 0.1);
  }

  // ── Background music ──────────────────────────────────────
  startMusic(theme = 'desert') {
    if (!this.ready || this._musicRunning) return;
    this._musicRunning = true;
    this._startDrone(theme);
    this._startMelody(theme);
    this._startRhythm(theme);
  }

  _droneFreqs(theme) {
    return {
      desert:    [65.4, 97.9, 130.8],  // C2 G2 C3
      city:      [82.4, 110,  164.8],  // E2 A2 E3
      mountain:  [55.0, 82.4, 110.0],  // A1 E2 A2
      coastal:   [73.4, 110,  146.8],  // D2 A2 D3
      night:     [49.0, 73.4, 98.0 ],  // G1 D2 G2
      industrial:[61.7, 92.5, 123.5],  // B1 F#2 B2
    }[theme] || [65.4, 97.9, 130.8];
  }

  _startDrone(theme) {
    const freqs = this._droneFreqs(theme);
    for (const freq of freqs) {
      const osc   = this._ctx.createOscillator();
      const gain  = this._ctx.createGain();
      const filt  = this._ctx.createBiquadFilter();
      osc.type    = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 12;
      filt.type   = 'lowpass'; filt.frequency.value = 400; filt.Q.value = 0.5;
      gain.gain.value = 0.03;
      // Tremolo LFO
      const lfo = this._ctx.createOscillator();
      const lg  = this._ctx.createGain();
      lfo.type = 'sine'; lfo.frequency.value = 0.15 + Math.random()*0.08;
      lg.gain.value = 0.008;
      lfo.connect(lg); lg.connect(gain.gain);
      lfo.start(); osc.connect(filt); filt.connect(gain);
      gain.connect(this._musicGain); osc.start();
    }
  }

  _scale(theme) {
    // Pakistani musical scales (frequency ratios from C4=261.6)
    const C4 = 261.6;
    return {
      desert:    [C4, C4*1.122, C4*1.189, C4*1.335, C4*1.498, C4*1.587, C4*1.782, C4*2],
      city:      [C4, C4*1.122, C4*1.260, C4*1.335, C4*1.498, C4*1.587, C4*1.782, C4*2],
      mountain:  [C4, C4*1.059, C4*1.189, C4*1.335, C4*1.498, C4*1.587, C4*1.782, C4*2],
      coastal:   [C4, C4*1.122, C4*1.260, C4*1.498, C4*1.587, C4*1.782, C4*2],
      night:     [C4, C4*1.059, C4*1.189, C4*1.335, C4*1.498, C4*1.682, C4*2],
    }[theme] || [C4, C4*1.122, C4*1.189, C4*1.335, C4*1.498, C4*1.587, C4*2];
  }

  _startMelody(theme) {
    const scale = this._scale(theme);
    let step = 0;
    const playNote = () => {
      if (!this.ready || !this._musicRunning) return;
      const freq = scale[step % scale.length] * (Math.random() < 0.2 ? 2 : 1);
      step++;
      const osc  = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      const t    = this._ctx.currentTime;
      osc.type   = 'sawtooth'; osc.frequency.value = freq;
      // Sitar-like pluck: sharp attack, long decay
      const filt = this._ctx.createBiquadFilter();
      filt.type  = 'bandpass'; filt.frequency.value = freq * 3; filt.Q.value = 8;
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      osc.connect(filt); filt.connect(gain); gain.connect(this._musicGain);
      osc.start(t); osc.stop(t + 2.0);
      this._melodySched = setTimeout(playNote, (1500 + Math.random() * 2000) * (theme === 'night' ? 1.5 : 1));
    };
    this._melodySched = setTimeout(playNote, 3000 + Math.random() * 2000);
  }

  _startRhythm(theme) {
    const bpm    = theme === 'night' ? 80 : theme === 'city' ? 110 : 90;
    const period = 60000 / bpm;
    // Tabla-style pattern
    const patterns = {
      desert:    [1,0,0.5,0, 0.7,0,0.5,0.3],
      city:      [1,0.3,0.7,0, 1,0,0.5,0.3, 0.7,0,1,0],
      mountain:  [1,0,0,0.4, 0.6,0,0,0.4],
      night:     [0.8,0,0,0, 0,0,0.5,0],
      industrial:[1,0,1,0.5, 1,0,0.7,0],
    };
    const pat  = patterns[theme] || patterns.desert;
    let pidx   = 0;

    const beat = () => {
      if (!this.ready || !this._musicRunning) return;
      const v = pat[pidx % pat.length];
      if (v > 0) this._tabla(v > 0.8 ? 100 : 160, v * 0.06);
      pidx++;
      this._rhythmTimer = setTimeout(beat, period / 2);
    };
    this._rhythmTimer = setTimeout(beat, 4000);
  }

  _tabla(freq, vol) {
    const t    = this._ctx.currentTime;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const filt = this._ctx.createBiquadFilter();
    osc.type   = 'sine'; osc.frequency.value = freq;
    filt.type  = 'bandpass'; filt.frequency.value = freq * 2; filt.Q.value = 12;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(filt); filt.connect(gain); gain.connect(this._musicGain);
    osc.start(t); osc.stop(t + 0.2);
  }

  stopMusic() {
    this._musicRunning = false;
    clearTimeout(this._melodySched);
    clearTimeout(this._rhythmTimer);
  }

  // ── Engine sound ───────────────────────────────────────────
  startEngine() {
    if (!this.ready || this._engineOsc) return;
    this._engineGain = this._ctx.createGain();
    this._engineGain.gain.value = 0.05;
    const filt = this._ctx.createBiquadFilter();
    filt.type  = 'bandpass'; filt.frequency.value = 220; filt.Q.value = 0.5;
    this._engineOsc = this._ctx.createOscillator();
    this._engineOsc.type = 'sawtooth'; this._engineOsc.frequency.value = 50;
    const o2 = this._ctx.createOscillator();
    o2.type = 'square'; o2.frequency.value = 52;
    this._engineOsc.connect(filt); o2.connect(filt);
    filt.connect(this._engineGain); this._engineGain.connect(this._master);
    this._engineOsc.start(); o2.start();
    this._engineOsc2 = o2;
  }

  updateEngine(speed, maxSpeed) {
    if (!this.ready || !this._engineOsc) return;
    const t = this._ctx.currentTime;
    const f = 48 + (speed / maxSpeed) * 240;
    const g = 0.02 + (speed / maxSpeed) * 0.05;
    this._engineOsc.frequency.setTargetAtTime(f,   t, 0.08);
    this._engineOsc2?.frequency.setTargetAtTime(f*1.025, t, 0.08);
    this._engineGain.gain.setTargetAtTime(g, t, 0.06);
  }

  stopEngine() {
    try { this._engineOsc?.stop(); this._engineOsc2?.stop(); } catch(_) {}
    this._engineOsc = null; this._engineOsc2 = null;
  }

  // ── Rain ambient ───────────────────────────────────────────
  startRain(intensity = 0.4) {
    if (!this.ready || this._rainNode) return;
    const buf = this._ctx.createBuffer(1, this._ctx.sampleRate * 2, this._ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    this._rainNode = this._ctx.createBufferSource();
    this._rainNode.buffer = buf; this._rainNode.loop = true;
    const lp = this._ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=700;
    this._rainGain = this._ctx.createGain(); this._rainGain.gain.value = intensity * 0.1;
    this._rainNode.connect(lp); lp.connect(this._rainGain); this._rainGain.connect(this._master);
    this._rainNode.start();
  }
  updateRain(v) { if(this._rainGain) this._rainGain.gain.setTargetAtTime(v*0.1, this._ctx.currentTime, 0.4); }
  stopRain()    { try { this._rainNode?.stop(); } catch(_){} this._rainNode=null; }

  // ── One-shot SFX ──────────────────────────────────────────
  horn() {
    if (!this.ready) return;
    [349,440].forEach(f => {
      const o=this._ctx.createOscillator(), g=this._ctx.createGain(), t=this._ctx.currentTime;
      o.type='square'; o.frequency.value=f;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.12,t+0.02);
      g.gain.setValueAtTime(0.12,t+0.4); g.gain.exponentialRampToValueAtTime(0.001,t+0.65);
      o.connect(g); g.connect(this._master); o.start(t); o.stop(t+0.7);
    });
  }

  collision(intensity = 1) {
    if (!this.ready) return;
    const sz = Math.ceil(this._ctx.sampleRate * 0.3);
    const buf = this._ctx.createBuffer(1,sz,this._ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for(let i=0;i<sz;i++) d[i]=Math.random()*2-1;
    const src=this._ctx.createBufferSource(); src.buffer=buf;
    const g=this._ctx.createGain(), t=this._ctx.currentTime;
    g.gain.setValueAtTime(0.5*intensity,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.3);
    src.connect(g); g.connect(this._master); src.start(t);
  }

  success() {
    if (!this.ready) return;
    [523,659,784,1047].forEach((f,i) => {
      const o=this._ctx.createOscillator(), g=this._ctx.createGain();
      const t=this._ctx.currentTime+i*0.12;
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0.18,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.35);
      o.connect(g); g.connect(this._master); o.start(t); o.stop(t+0.4);
    });
  }

  uiClick() {
    if (!this.ready) return;
    const o=this._ctx.createOscillator(), g=this._ctx.createGain(), t=this._ctx.currentTime;
    o.type='sine'; o.frequency.value=880;
    g.gain.setValueAtTime(0.06,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.06);
    o.connect(g); g.connect(this._master); o.start(t); o.stop(t+0.08);
  }

  refuel() {
    if (!this.ready) return;
    const o=this._ctx.createOscillator(), g=this._ctx.createGain(), t=this._ctx.currentTime;
    o.type='sine'; o.frequency.value=330;
    g.gain.setValueAtTime(0.1,t); g.gain.setValueAtTime(0.1,t+0.1);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.28);
    o.connect(g); g.connect(this._master); o.start(t); o.stop(t+0.3);
  }

  levelUp() {
    if (!this.ready) return;
    [523,659,784,659,1047].forEach((f,i) => {
      const o=this._ctx.createOscillator(), g=this._ctx.createGain();
      const t=this._ctx.currentTime+i*0.1;
      o.type='triangle'; o.frequency.value=f;
      g.gain.setValueAtTime(0.2,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.4);
      o.connect(g); g.connect(this._master); o.start(t); o.stop(t+0.45);
    });
  }
}
