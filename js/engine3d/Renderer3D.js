// js/engine3d/Renderer3D.js – Three.js WebGL renderer setup

import * as THREE from 'three';

export class Renderer3D {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });

    const dpr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Professional rendering pipeline
    this.renderer.shadowMap.enabled     = true;
    this.renderer.shadowMap.type        = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping           = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure   = 1.1;
    this.renderer.outputColorSpace      = THREE.SRGBColorSpace;

    window.addEventListener('resize', () => this._onResize());
  }

  _onResize() {
    const W = window.innerWidth, H = window.innerHeight;
    this.renderer.setSize(W, H);
    if (this._onResizeCb) this._onResizeCb(W, H);
  }

  onResize(cb) { this._onResizeCb = cb; }

  render(scene, camera) { this.renderer.render(scene, camera); }

  get domElement() { return this.renderer.domElement; }
}
