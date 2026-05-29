// js/engine3d/WeatherSystem3D.js – 3D weather: rain, dust, fog

import * as THREE from 'three';

export const WEATHER3D = Object.freeze({
  CLEAR: 'clear', CLOUDY: 'cloudy', RAIN: 'rain', STORM: 'storm', DUST: 'dust',
});

const TRANSITION_TABLE = {
  clear:  [{w:'clear',p:65},{w:'cloudy',p:30},{w:'dust',p:5}],
  cloudy: [{w:'clear',p:30},{w:'cloudy',p:35},{w:'rain',p:35}],
  rain:   [{w:'cloudy',p:40},{w:'rain',p:35},{w:'storm',p:25}],
  storm:  [{w:'rain',p:55},{w:'storm',p:30},{w:'cloudy',p:15}],
  dust:   [{w:'clear',p:50},{w:'dust',p:30},{w:'cloudy',p:20}],
};

export class WeatherSystem3D {
  constructor(scene) {
    this.scene   = scene;
    this.current = WEATHER3D.CLEAR;
    this._timer  = 120;

    this.rainIntensity = 0;
    this.dustIntensity = 0;
    this._target = { rain:0, dust:0 };

    this._buildRainSystem();
    this._buildCloudLayer();
  }

  _buildRainSystem() {
    const count = 8000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const spread = 80;

    for (let i=0;i<count;i++) {
      pos[i*3]   = (Math.random()-0.5)*spread*2;
      pos[i*3+1] = Math.random()*50;
      pos[i*3+2] = (Math.random()-0.5)*spread*2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xAABBCC, size: 0.15, transparent:true, opacity:0, depthWrite:false,
      sizeAttenuation: true,
    });
    this.rain     = new THREE.Points(geo, mat);
    this.rainData = pos;
    this.scene.add(this.rain);
  }

  _buildCloudLayer() {
    const geo = new THREE.PlaneGeometry(6000, 6000, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(256,256,50,256,256,256);
    grd.addColorStop(0,'rgba(200,200,200,0.85)');
    grd.addColorStop(1,'rgba(200,200,200,0)');
    ctx.fillStyle = grd; ctx.fillRect(0,0,512,512);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
    this.cloudLayer = new THREE.Mesh(geo, mat);
    this.cloudLayer.position.y = 200;
    this.scene.add(this.cloudLayer);
  }

  update(dt, cameraPos, fogRef) {
    this._timer -= dt;
    if (this._timer <= 0) this._advance();

    // Smooth intensities
    this.rainIntensity = THREE.MathUtils.lerp(this.rainIntensity, this._target.rain, dt * 0.3);
    this.dustIntensity = THREE.MathUtils.lerp(this.dustIntensity, this._target.dust, dt * 0.25);

    // Rain particles follow camera
    if (cameraPos && this.rainIntensity > 0.05) {
      const pos = this.rainData;
      for (let i=0;i<pos.length/3;i++) {
        pos[i*3+1] -= (2 + Math.random()*2) * 60 * dt; // fall speed
        if (pos[i*3+1] < cameraPos.y - 5) {
          pos[i*3+1] = cameraPos.y + 45;
          pos[i*3]   = cameraPos.x + (Math.random()-0.5)*160;
          pos[i*3+2] = cameraPos.z + (Math.random()-0.5)*160;
        }
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
      this.rain.position.set(0, 0, 0);
    }

    this.rain.material.opacity    = this.rainIntensity * 0.7;
    this.cloudLayer.material.opacity = Math.min(1, this.rainIntensity * 1.2 + this.dustIntensity * 0.5);

    // Move clouds slowly
    this.cloudLayer.rotation.y += dt * 0.002;
    if (cameraPos) this.cloudLayer.position.set(cameraPos.x, 200, cameraPos.z);
  }

  _advance() {
    const rows = TRANSITION_TABLE[this.current];
    const total = rows.reduce((s,r)=>s+r.p,0);
    let rnd = Math.random() * total;
    for (const r of rows) { rnd -= r.p; if (rnd <= 0){ this.current=r.w; break; } }
    this._timer = 60 + Math.random() * 90;

    this._target.rain = this.current==='rain'?0.7:this.current==='storm'?1.0:0;
    this._target.dust = this.current==='dust'?0.6:0;
  }

  get tractionMultiplier() {
    return this.current==='storm'?0.55:this.current==='rain'?0.75:this.current==='dust'?0.85:1.0;
  }

  get fuelMultiplier() {
    return this.current==='storm'?1.2:this.current==='rain'?1.1:1.0;
  }

  get displayName() {
    return {clear:'☀️ Clear',cloudy:'☁️ Cloudy',rain:'🌧 Rain',storm:'⛈ Storm',dust:'💨 Dust Storm'}[this.current];
  }

  forceWeather(w) { this.current = w; this._timer = 60; this._advance(); }
}
