// js/engine3d/World3D.js – Procedural 3D world: terrain, road, buildings, trees, props

import * as THREE from 'three';

// ── Simple noise ────────────────────────────────────────────
function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function smNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix+1, iy);
  const c = hash2(ix, iy+1), d = hash2(ix+1, iy+1);
  return a + (b-a)*ux + (c-a)*uy + (d-a+a-b+c-d)*ux*uy;
}
function fbm(x, y, oct = 5) {
  let v=0, a=0.5, f=1;
  for (let i=0;i<oct;i++){v+=smNoise(x*f,y*f)*a;a*=0.5;f*=2;}
  return v;
}

// ── Highway definition (world-space metres, +Z = forward) ──
export const ROAD_CURVE_PTS = [
  new THREE.Vector3( 20, 0.3, -2200),
  new THREE.Vector3( 60, 0.3, -1600),
  new THREE.Vector3(120, 0.3, -1000),
  new THREE.Vector3( 60, 0.3,  -400),
  new THREE.Vector3(-80, 0.3,    100),
  new THREE.Vector3(-60, 0.3,   700),
  new THREE.Vector3( 40, 0.3,  1300),
  new THREE.Vector3( 80, 0.3,  1900),
  new THREE.Vector3( 20, 0.3,  2400),
];

const ROAD_WIDTH    = 12;    // metres
const TERRAIN_SIZE  = 6000;
const TERRAIN_SEGS  = 180;
const TREE_COUNT    = 800;
const ROAD_SEGS     = 500;

export class World3D {
  constructor(scene) {
    this.scene      = scene;
    this.roadCurve  = new THREE.CatmullRomCurve3(ROAD_CURVE_PTS, false, 'catmullrom', 0.5);
    this._heightmap = null;
    this._hmRes     = TERRAIN_SEGS + 1;
    this._terrainSz = TERRAIN_SIZE;
    this._roadPts   = null;   // cached road sample points
  }

  // ── Build everything ──────────────────────────────────────
  build() {
    this._buildTerrain();
    this._buildRoad();
    this._buildCities();
    this._buildTrees();
    this._buildFuelStations();
    this._buildRoadSigns();
  }

  // ── Terrain ───────────────────────────────────────────────
  _buildTerrain() {
    const res  = this._hmRes;
    const sz   = this._terrainSz;
    const geo  = new THREE.PlaneGeometry(sz, sz, TERRAIN_SEGS, TERRAIN_SEGS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    this._heightmap = new Float32Array(res * res);

    // Cache road sample points for flattening
    this._roadPts = this.roadCurve.getPoints(400);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let h = this._naturalHeight(x, z);
      // Flatten near road
      const dRoad = this._distToRoadApprox(x, z);
      if (dRoad < 35) h = this._lerp(0.3, h, dRoad / 35);
      pos.setY(i, h);
      const ix = Math.round((x / sz + 0.5) * TERRAIN_SEGS);
      const iz = Math.round((z / sz + 0.5) * TERRAIN_SEGS);
      const hi = Math.min(ix, TERRAIN_SEGS) + Math.min(iz, TERRAIN_SEGS) * res;
      if (hi >= 0 && hi < this._heightmap.length) this._heightmap[hi] = h;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    // Vertex colours for regional variation
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
      const d = this._distToRoadApprox(x, z);
      const r = d < 20 ? [0.2,0.2,0.2] : this._terrainColor(x, z, y);
      colors.push(r[0], r[1], r[2]);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors:     true,
      roughness:        0.9,
      metalness:        0.0,
      envMapIntensity:  0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    this.scene.add(mesh);
    this.terrain = mesh;
  }

  _naturalHeight(x, z) {
    const s = 0.0008;
    const macro  = fbm(x*s*0.3,  z*s*0.3, 4)  * 18;  // large hills
    const medium = fbm(x*s,       z*s, 5)       * 6;   // medium variation
    const micro  = fbm(x*s*4,     z*s*4, 3)     * 1.5; // small bumps
    return Math.max(0, macro + medium + micro - 5);
  }

  _terrainColor(x, z, y) {
    // Regional blending: brown (south) → greener (north in z)
    const t = (z + 3000) / 6000;
    const sand  = [0.76, 0.65, 0.42];
    const grass = [0.40, 0.55, 0.28];
    const rock  = [0.50, 0.44, 0.36];
    const c1 = y > 5 ? rock : this._lerpCol(sand, grass, t * 0.6);
    // Add noise-based variation
    const n = smNoise(x*0.02, z*0.02);
    return this._lerpCol(c1, rock, n * 0.3);
  }

  _lerpCol(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
  }

  _lerp(a, b, t) { return a + (b-a) * Math.max(0, Math.min(1, t)); }

  _distToRoadApprox(x, z) {
    let minD = 1e9;
    for (const p of this._roadPts) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < minD) minD = d;
    }
    return minD;
  }

  // ── Road mesh ─────────────────────────────────────────────
  _buildRoad() {
    const curve = this.roadCurve;
    const segs  = ROAD_SEGS;
    const hw    = ROAD_WIDTH / 2;

    const verts = [], uvs = [], normals = [], idx = [];

    const roadTex = this._createRoadTexture();
    const mat = new THREE.MeshStandardMaterial({
      map:       roadTex,
      roughness: 0.8,
      metalness: 0.05,
    });

    for (let i = 0; i <= segs; i++) {
      const t   = i / segs;
      const pt  = curve.getPoint(t);
      const tan = curve.getTangent(t).normalize();
      const up  = new THREE.Vector3(0, 1, 0);
      const rt  = new THREE.Vector3().crossVectors(tan, up).normalize();

      const L = pt.clone().addScaledVector(rt, -hw);
      const R = pt.clone().addScaledVector(rt,  hw);
      const uvT = t * 40; // repeat texture

      verts.push(L.x, L.y + 0.05, L.z,   R.x, R.y + 0.05, R.z);
      uvs.push(0, uvT,   1, uvT);
      normals.push(0,1,0,  0,1,0);

      if (i < segs) {
        const b = i * 2;
        idx.push(b, b+1, b+2, b+1, b+3, b+2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(idx);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'road';
    this.scene.add(mesh);
    this.roadMesh = mesh;

    // Road shoulders (wider flat strip with different material)
    this._buildRoadShoulders(curve, segs);
  }

  _buildRoadShoulders(curve, segs) {
    const hw = ROAD_WIDTH / 2 + 3; // 3m shoulders
    const mat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness:0.95 });
    const verts = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i/segs, pt = curve.getPoint(t);
      const tan = curve.getTangent(t).normalize();
      const rt  = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0,1,0)).normalize();
      const L = pt.clone().addScaledVector(rt, -hw);
      const R = pt.clone().addScaledVector(rt,  hw);
      verts.push(L.x, L.y+0.02, L.z, R.x, R.y+0.02, R.z);
      if (i<segs){const b=i*2;idx.push(b,b+1,b+2,b+1,b+3,b+2);}
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  _createRoadTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    // Asphalt
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0,0,512,512);
    // Noise grain
    for (let i=0;i<8000;i++){
      ctx.fillStyle=`rgba(${40+Math.random()*20},${40+Math.random()*20},${40+Math.random()*20},0.3)`;
      ctx.fillRect(Math.random()*512,Math.random()*512,2,2);
    }
    // White shoulder lines
    ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(12,512);ctx.stroke();
    ctx.beginPath();ctx.moveTo(500,0);ctx.lineTo(500,512);ctx.stroke();
    // Yellow centre dashes
    ctx.strokeStyle='rgba(255,200,0,0.9)'; ctx.lineWidth=5;
    ctx.setLineDash([80,60]);
    ctx.beginPath();ctx.moveTo(256,0);ctx.lineTo(256,512);ctx.stroke();
    ctx.setLineDash([]);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // ── Cities (building clusters) ────────────────────────────
  _buildCities() {
    const buildingMats = [
      new THREE.MeshStandardMaterial({color:0xE74C3C,roughness:0.7}),
      new THREE.MeshStandardMaterial({color:0x3498DB,roughness:0.7}),
      new THREE.MeshStandardMaterial({color:0xE67E22,roughness:0.7}),
      new THREE.MeshStandardMaterial({color:0x2ECC71,roughness:0.7}),
      new THREE.MeshStandardMaterial({color:0x9B59B6,roughness:0.7}),
      new THREE.MeshStandardMaterial({color:0xECF0F1,roughness:0.7}),
    ];
    const windowMat = new THREE.MeshStandardMaterial({color:0xADD8E6,emissive:0x334466,roughness:0.1,metalness:0.1});

    // Karachi cluster (near start)
    this._buildCityCluster(-200, -2000, 45, buildingMats, windowMat, 'Karachi');
    // Hyderabad cluster (near end)
    this._buildCityCluster(150, 2100, 35, buildingMats, windowMat, 'Hyderabad');
    // Small waypoint towns
    this._buildCityCluster(-150, -600, 12, buildingMats, windowMat, null);
    this._buildCityCluster(200, 500, 15, buildingMats, windowMat, null);
  }

  _buildCityCluster(cx, cz, count, bMats, wMat, label) {
    const rng = (lo, hi) => lo + Math.random() * (hi - lo);

    for (let i = 0; i < count; i++) {
      const w = rng(8, 25), h = rng(10, 60), d = rng(8, 25);
      const x = cx + rng(-150, 150), z = cz + rng(-150, 150);
      const y = h / 2;
      const mat = bMats[Math.floor(Math.random() * bMats.length)];
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;

      // Windows
      const wGeo = new THREE.BoxGeometry(w - 0.1, h - 0.1, d - 0.1);
      const wMesh = new THREE.Mesh(wGeo, wMat);
      wMesh.position.y = 0.05;
      mesh.add(wMesh);

      this.scene.add(mesh);
    }

    // City label billboard
    if (label) this._buildLabel(cx, cz, label);
  }

  _buildLabel(x, z, text) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000000cc'; ctx.fillRect(0,0,512,128);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 72px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), mat);
    mesh.position.set(x, 40, z);
    mesh.rotation.y = Math.PI/4;
    this.scene.add(mesh);
  }

  // ── Trees (instanced for performance) ────────────────────
  _buildTrees() {
    const trunkGeo  = new THREE.CylinderGeometry(0.3, 0.5, 4, 6);
    const crownGeo  = new THREE.ConeGeometry(2.5, 6, 6);
    const trunkMat  = new THREE.MeshStandardMaterial({color:0x5C3D1E,roughness:0.9});
    const crownMat  = new THREE.MeshStandardMaterial({color:0x2D6A2A,roughness:0.9});

    const tTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_COUNT);
    const tCrowns = new THREE.InstancedMesh(crownGeo, crownMat, TREE_COUNT);
    tTrunks.castShadow = tCrowns.castShadow = true;
    tTrunks.receiveShadow = tCrowns.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let count = 0;
    const attempts = TREE_COUNT * 8;

    for (let a = 0; a < attempts && count < TREE_COUNT; a++) {
      const x = (Math.random() - 0.5) * 5000;
      const z = (Math.random() - 0.5) * 5000;
      const d = this._distToRoadApprox(x, z);
      if (d < 30) continue; // keep clear of road

      const h = this.getHeightAt(x, z);
      if (h < 0.5) continue;

      const sc = 0.7 + Math.random() * 0.8;
      dummy.position.set(x, h + 2 * sc, z);
      dummy.scale.setScalar(sc);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      tTrunks.setMatrixAt(count, dummy.matrix);

      dummy.position.set(x, h + 4 * sc + 3 * sc, z);
      dummy.updateMatrix();
      tCrowns.setMatrixAt(count, dummy.matrix);

      count++;
    }
    tTrunks.count = tCrowns.count = count;
    this.scene.add(tTrunks, tCrowns);
  }

  // ── Fuel stations ─────────────────────────────────────────
  _buildFuelStations() {
    const stationDefs = [
      { t:0.22 }, { t:0.55 }, { t:0.78 },
    ];
    const mat = [
      new THREE.MeshStandardMaterial({color:0xF39C12, roughness:0.7}),
      new THREE.MeshStandardMaterial({color:0xECF0F1, roughness:0.6}),
    ];

    for (const def of stationDefs) {
      const pt  = this.roadCurve.getPoint(def.t);
      const tan = this.roadCurve.getTangent(def.t).normalize();
      const rt  = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0,1,0)).normalize();
      const base = pt.clone().addScaledVector(rt, 18); // offset from road

      // Canopy
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 14), mat[0]);
      canopy.position.copy(base).setY(4.5);
      canopy.castShadow = true;
      this.scene.add(canopy);

      // Booth
      const booth = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), mat[1]);
      booth.position.copy(base).setY(2);
      booth.castShadow = booth.receiveShadow = true;
      this.scene.add(booth);

      // Pump(s)
      for (let pi = 0; pi < 2; pi++) {
        const pump = new THREE.Mesh(new THREE.BoxGeometry(1, 2.5, 0.5), mat[0]);
        pump.position.copy(base).add(new THREE.Vector3(-3+pi*6, 1.25, 3));
        pump.castShadow = true;
        this.scene.add(pump);
      }

      // Store world position for interaction detection
      if (!this.fuelStationPositions) this.fuelStationPositions = [];
      this.fuelStationPositions.push(base.clone());
    }
  }

  // ── Road signs ────────────────────────────────────────────
  _buildRoadSigns() {
    const signs = [
      {t:0.05, text:'KARACHI 0 km'},
      {t:0.25, text:'SUKKUR 120 km'},
      {t:0.50, text:'MULTAN 250 km'},
      {t:0.75, text:'LAHORE 380 km'},
      {t:0.95, text:'HYDERABAD 480 km'},
    ];
    const poleMat = new THREE.MeshStandardMaterial({color:0x888888, metalness:0.8, roughness:0.3});

    for (const s of signs) {
      const pt  = this.roadCurve.getPoint(s.t);
      const tan = this.roadCurve.getTangent(s.t).normalize();
      const rt  = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0,1,0)).normalize();
      const base = pt.clone().addScaledVector(rt, 8);

      // Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 8), poleMat);
      pole.position.copy(base).setY(3);
      this.scene.add(pole);

      // Board
      const c = document.createElement('canvas');
      c.width=256; c.height=80;
      const ctx=c.getContext('2d');
      ctx.fillStyle='#1a5c1a'; ctx.fillRect(0,0,256,80);
      ctx.fillStyle='#FFF'; ctx.font='bold 26px Arial'; ctx.textAlign='center';
      ctx.fillText(s.text,128,50);
      const tex=new THREE.CanvasTexture(c);
      const board=new THREE.Mesh(new THREE.PlaneGeometry(6,2),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
      board.position.copy(base).setY(6.2);
      board.rotation.y = Math.atan2(tan.x, tan.z);
      this.scene.add(board);
    }
  }

  // ── Height query (bilinear interpolation) ─────────────────
  getHeightAt(x, z) {
    if (!this._heightmap) return 0;
    const sz  = this._terrainSz;
    const res = this._hmRes;
    const nx  = (x / sz + 0.5) * TERRAIN_SEGS;
    const nz  = (z / sz + 0.5) * TERRAIN_SEGS;
    const ix  = Math.floor(nx), iz = Math.floor(nz);
    const fx  = nx - ix,        fz = nz - iz;

    const clamp = v => Math.max(0, Math.min(TERRAIN_SEGS, v));
    const h = (xi, zi) => {
      const i = clamp(xi) + clamp(zi) * res;
      return this._heightmap[i] || 0;
    };

    return h(ix,iz)*(1-fx)*(1-fz) + h(ix+1,iz)*fx*(1-fz)
         + h(ix,iz+1)*(1-fx)*fz   + h(ix+1,iz+1)*fx*fz;
  }

  // ── Road snapping helpers ─────────────────────────────────
  getNearestRoadPoint(x, z) {
    let best = null, bestD = Infinity;
    for (const p of this._roadPts) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return {point: best, dist: bestD};
  }

  isNearRoad(x, z, threshold = 20) {
    return this.getNearestRoadPoint(x, z).dist < threshold;
  }
}
