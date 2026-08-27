import { MANDIR_ORIGIN } from './mandir.js';
import { RANGE_ORIGIN } from './range.js';
import { FARM_ORIGIN } from './farm.js';

export function createMountains(scene) {
  // ---------- materials that will be recolored by climate ----------
  const nearMat = new THREE.MeshStandardMaterial({
    color: 0x4f7a3d,          // summer green from the SVG
    roughness: 0.92,
    flatShading: true,
    vertexColors: true
  });

  const midMat = new THREE.MeshStandardMaterial({
    color: 0x7a93a8,
    roughness: 1,
    flatShading: true,
    fog: true
  });

  const farMat = new THREE.MeshBasicMaterial({
    color: 0xa9bfce,
    fog: true,
    transparent: true,
    opacity: 0.55
  });

  // ---------- detailed peak generator (lit / shadow + snow) ----------
  const rockLit   = new THREE.Color(0x4f7a3d);
  const rockShad  = new THREE.Color(0x2e4f26);
  const snowLit   = new THREE.Color(0xffffff);
  const snowShad  = new THREE.Color(0xcfe6f2);

  function makePeakGeo(r, h, segs) {
    const heightSegs = 4;
    const geo = new THREE.ConeGeometry(r, h, Math.min(segs, 8), heightSegs, false);
    const pa = geo.attributes.position;
    const colors = new Float32Array(pa.count * 3);
    const tmp = new THREE.Color();

    const seedA = Math.random() * Math.PI * 2;
    const seedB = Math.random() * Math.PI * 2;
    const seedC = Math.random() * Math.PI * 2;

    for (let i = 0; i < pa.count; i++) {
      const ox = pa.getX(i), oy = pa.getY(i), oz = pa.getZ(i);
      const yFrac = THREE.MathUtils.clamp((oy + h / 2) / h, 0, 1);
      const angle = Math.atan2(oz, ox);

      // multi-harmonic ridging → painterly silhouette
      const ridge =
          Math.sin(angle * 3.5 + seedA) * 0.17 +
          Math.sin(angle * 8   + seedB) * 0.12 * (0.3 + yFrac) +
          Math.sin(angle * 15  + seedC + yFrac * 7) * 0.07 * yFrac +
          Math.sin(angle * 2.1 + seedA * 0.6) * 0.08;

      const scale = Math.max(0.30, 1 + ridge);
      pa.setX(i, ox * scale);
      pa.setZ(i, oz * scale);
      pa.setY(i, oy + (Math.random() - 0.5) * h * 0.02);

      // decide lit vs shadow side (simple X-based lighting)
      const isLit = Math.cos(angle) > -0.15;

      // base rock color
      tmp.copy(isLit ? rockLit : rockShad);

      // snow cap (stronger near tip, soft threshold)
      const snowT = THREE.MathUtils.clamp(
        (yFrac - 0.48 + (Math.random() - 0.5) * 0.18) / 0.48, 0, 1
      );
      if (snowT > 0) {
        const snowCol = isLit ? snowLit : snowShad;
        tmp.lerp(snowCol, Math.pow(snowT, 1.25));
      }

      colors[i * 3]     = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }

  function makeMountain(x, z, scale) {
    const g = new THREE.Group();
    const peakCount = 4 + Math.floor(Math.random() * 3);
    const mainH = 60 + Math.random() * 50;

    for (let p = 0; p < peakCount; p++) {
      const isMain = p === 0;
      const h = mainH * (isMain ? 1 : 0.30 + Math.random() * 0.50);
      const r = (22 + Math.random() * 16) * (isMain ? 1 : 0.48 + Math.random() * 0.42);
      const segs = 10 + Math.floor(Math.random() * 4);
      const geo = makePeakGeo(r, h, segs);
      const m = new THREE.Mesh(geo, nearMat);

      const off = isMain
        ? { x: 0, z: 0 }
        : { x: (Math.random() - 0.5) * r * 1.5, z: (Math.random() - 0.5) * r * 1.5 };

      m.position.set(off.x, h / 2 - 6 - (isMain ? 0 : Math.random() * 10), off.z);
      m.rotation.y = Math.random() * Math.PI * 2;
      g.add(m);
    }

    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    return g;
  }

  // ---------- near range ----------
  const nearGroup = new THREE.Group();
  const mCount = 16;
  for (let i = 0; i < mCount; i++) {
    const ang = (i / mCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
    const rad = 310 + Math.random() * 50;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    // Mountain clusters have wide bases, so leave generous clear zones around
    // both dedicated activity areas instead of only avoiding their centres.
    if (Math.hypot(x - MANDIR_ORIGIN.x, z - MANDIR_ORIGIN.z) < 118) continue;
    if (Math.hypot(x - RANGE_ORIGIN.x, z - RANGE_ORIGIN.z) < 150) continue;
    if (Math.hypot(x - FARM_ORIGIN.x, z - FARM_ORIGIN.z) < 150) continue;
    nearGroup.add(makeMountain(x, z, 0.9 + Math.random() * 0.8));
  }
  scene.add(nearGroup);

  // ---------- mid range ----------
  const midGroup = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + Math.random() * 0.25;
    const rad = 420 + Math.random() * 55;
    const h = 80 + Math.random() * 70;
    const r = 30 + Math.random() * 26;
    const geo = new THREE.ConeGeometry(r, h, 8 + Math.floor(Math.random() * 2), 1);
    const pa = geo.attributes.position;
    for (let v = 0; v < pa.count; v++) {
      const j = (Math.random() - 0.5) * r * 0.22;
      pa.setX(v, pa.getX(v) + j);
      pa.setZ(v, pa.getZ(v) + j);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, midMat);
    const mx = Math.cos(ang) * rad, mz = Math.sin(ang) * rad;
    if (Math.hypot(mx - FARM_ORIGIN.x, mz - FARM_ORIGIN.z) < 150) continue;
    m.position.set(mx, h / 2 - 12, mz);
    midGroup.add(m);
  }
  scene.add(midGroup);

  // ---------- far hazy range ----------
  const farGroup = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
    const rad = 560 + Math.random() * 80;
    const h = 75 + Math.random() * 75;
    const r = 38 + Math.random() * 32;
    const geo = new THREE.ConeGeometry(r, h, 6, 1);
    const m = new THREE.Mesh(geo, farMat);
    m.position.set(Math.cos(ang) * rad, h / 2 - 10, Math.sin(ang) * rad);
    farGroup.add(m);
  }
  scene.add(farGroup);

  // ---------- climate update helper ----------
  // Called every frame from climate.js
  const _near = new THREE.Color();
  const _mid = new THREE.Color();
  const _far = new THREE.Color();
  function updateMountainClimate(palette, snowAmount) {
    _near.set(palette.near);
    _mid.set(palette.mid);
    _far.set(palette.far);
    nearMat.color.lerp(_near, 0.04);
    midMat.color.lerp(_mid, 0.04);
    farMat.color.lerp(_far, 0.04);
    farMat.opacity = 0.45 + snowAmount * 0.15;
  }

  return {
    nearMat, midMat, farMat,
    updateMountainClimate
  };
}
