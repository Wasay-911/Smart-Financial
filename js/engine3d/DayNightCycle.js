// js/engine3d/DayNightCycle.js – Dynamic sun, sky, lighting

import * as THREE from 'three';

export class DayNightCycle {
  constructor(scene) {
    this.scene = scene;
    this.timeOfDay  = 0.3;   // 0-1  (0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk)
    this.CYCLE_SECS = 300;   // 5 minutes per full day

    this._buildSky();
    this._buildLights();
    this._buildStars();
  }

  _buildSky() {
    // Large sphere sky dome with gradient shader
    const geo = new THREE.SphereGeometry(4800, 16, 8);
    geo.scale(-1, 1, -1); // flip so we see inside

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor:    { value: new THREE.Color(0x0a0a2e) },
        bottomColor: { value: new THREE.Color(0x87CEEB) },
        offset:      { value: 400 },
        exponent:    { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
  }

  _buildLights() {
    // Sun directional light
    this.sun = new THREE.DirectionalLight(0xFFE4B0, 1.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far  = 800;
    this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -400;
    this.sun.shadow.camera.right = this.sun.shadow.camera.top = 400;
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Hemisphere ambient (sky vs ground)
    this.hemi = new THREE.HemisphereLight(0xB1E1FF, 0xD4A040, 0.5);
    this.scene.add(this.hemi);

    // Moon (faint bluish directional)
    this.moon = new THREE.DirectionalLight(0x6688CC, 0);
    this.scene.add(this.moon);
    this.scene.add(this.moon.target);
  }

  _buildStars() {
    const geo   = new THREE.BufferGeometry();
    const verts = [];
    for (let i = 0; i < 2000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      verts.push(Math.sin(phi)*Math.cos(theta)*4500, Math.sin(phi)*Math.sin(theta)*4500, Math.cos(phi)*4500);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({color:0xFFFFFF, size:3, sizeAttenuation:false}));
    this.stars.visible = false;
    this.scene.add(this.stars);
  }

  update(dt, cameraPos) {
    this.timeOfDay = (this.timeOfDay + dt / this.CYCLE_SECS) % 1;
    this._applyTimeOfDay();

    // Sky dome follows camera
    if (cameraPos) this.sky.position.copy(cameraPos);
  }

  _applyTimeOfDay() {
    const t = this.timeOfDay;

    // Sun arc: rises at t=0.25, sets at t=0.75
    const sunAngle = (t - 0.5) * Math.PI * 2; // -π to +π over full day
    const sunH  = Math.sin(sunAngle * 0.5 + Math.PI * 0.5); // height 0→1→0
    const sunSX = Math.cos(sunAngle);
    const sunSZ = Math.sin(sunAngle) * 0.3;
    const sunDist = 400;

    this.sun.position.set(sunSX * sunDist, sunH * sunDist + 50, sunSZ * sunDist);
    this.sun.target.position.set(0, 0, 0);

    // Moon is opposite of sun
    this.moon.position.set(-sunSX * sunDist, (1 - sunH) * 80 + 20, -sunSZ * sunDist);
    this.moon.target.position.set(0, 0, 0);

    // Colour interpolation
    const isDay = sunH > 0;

    if (t < 0.2 || t > 0.85) {
      // Night
      this._setSkyColors(0x050520, 0x101028);
      this.sun.intensity  = 0;
      this.moon.intensity = 0.35;
      this.hemi.intensity = 0.08;
      this.stars.visible  = true;
      this.scene.fog = new THREE.FogExp2(0x050520, 0.0012);
    } else if (t < 0.3) {
      // Dawn
      const f = (t - 0.2) / 0.1;
      this._setSkyColors(this._lerpColor(0x050520, 0xFF7043, f), this._lerpColor(0x101028, 0xFF8C00, f));
      this.sun.color.set(this._lerpColor(0x8888FF, 0xFF8C00, f));
      this.sun.intensity  = f * 0.8;
      this.moon.intensity = (1-f) * 0.35;
      this.hemi.intensity = 0.08 + f * 0.4;
      this.stars.visible  = f < 0.5;
      this.scene.fog = new THREE.FogExp2(this._lerpColor(0x050520, 0xDDA060, f), 0.0015);
    } else if (t < 0.5) {
      // Morning → noon
      const f = (t - 0.3) / 0.2;
      this._setSkyColors(this._lerpColor(0x87CEEB, 0x4488FF, f), this._lerpColor(0xE0C070, 0xC4A070, f));
      this.sun.color.set(0xFFD080);
      this.sun.intensity  = 0.8 + f * 0.7;
      this.moon.intensity = 0;
      this.hemi.intensity = 0.48 + f * 0.12;
      this.stars.visible  = false;
      this.scene.fog = new THREE.FogExp2(0xC9AA7C, 0.001);
    } else if (t < 0.75) {
      // Noon → afternoon
      this._setSkyColors(0x4488FF, 0xC4A070);
      this.sun.color.set(0xFFDD88);
      this.sun.intensity  = 1.5;
      this.moon.intensity = 0;
      this.hemi.intensity = 0.6;
      this.stars.visible  = false;
      this.scene.fog = new THREE.FogExp2(0xC9AA7C, 0.001);
    } else {
      // Dusk
      const f = (t - 0.75) / 0.1;
      this._setSkyColors(this._lerpColor(0x4488FF, 0xFF4400, f), this._lerpColor(0xC4A070, 0xCC4400, f));
      this.sun.color.set(this._lerpColor(0xFFDD88, 0xFF6600, f));
      this.sun.intensity  = 1.5 - f * 1.5;
      this.moon.intensity = f * 0.35;
      this.hemi.intensity = 0.6 - f * 0.52;
      this.stars.visible  = f > 0.5;
      this.scene.fog = new THREE.FogExp2(this._lerpColor(0xC9AA7C, 0x050520, f), 0.0012 + f * 0.001);
    }
  }

  _setSkyColors(top, bot) {
    this.skyMat.uniforms.topColor.value.set(top);
    this.skyMat.uniforms.bottomColor.value.set(bot);
  }

  _lerpColor(a, b, t) {
    t = THREE.MathUtils.clamp(t, 0, 1);
    const ca = new THREE.Color(a), cb = new THREE.Color(b);
    return new THREE.Color(
      ca.r + (cb.r - ca.r) * t,
      ca.g + (cb.g - ca.g) * t,
      ca.b + (cb.b - ca.b) * t
    );
  }

  // Follow sun position for shadow updates
  updateShadowCamera(cameraPos) {
    const offset = this.sun.position.clone().normalize().multiplyScalar(350);
    this.sun.position.copy(cameraPos).add(offset);
    this.sun.target.position.copy(cameraPos);
    this.sun.shadow.camera.updateProjectionMatrix();
  }
}
