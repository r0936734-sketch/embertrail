import { rangeCorridorT } from './range.js';
import { mandirFootprintT } from './mandir.js';

export function createVegetation(scene, terrainHeight, collision) {
  const dummy = new THREE.Object3D();
  const onReserved = (x, z) => rangeCorridorT(x, z) > 0.2 || mandirFootprintT(x, z) > 0.2;
  function scatterXZ(place, tries = 10) {
    for (let n = 0; n < tries; n++) {
      const p = place();
      if (!onReserved(p.x, p.z)) return p;
    }
    return place();
  }
  const mobile = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  function rand(min, max) { return min + Math.random() * (max - min); }

  // ---------------------------------------------------------------
  // pines (unchanged core, kept so climate.js's treeLeafMat hook works)
  // ---------------------------------------------------------------
  const treeTrunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.2, 6);
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2c1e, roughness: 1, flatShading: true });
  const treeLeafGeo = new THREE.ConeGeometry(1.6, 3.6, 6);
  const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x223a24, roughness: 1, flatShading: true });

  const treeCount = mobile ? 40 : 58;
  const trunkMesh = new THREE.InstancedMesh(treeTrunkGeo, treeTrunkMat, treeCount);
  const leafMesh = new THREE.InstancedMesh(treeLeafGeo, treeLeafMat, treeCount);

  for (let i = 0; i < treeCount; i++) {
    const { x, z } = scatterXZ(() => {
      const ang = Math.random() * Math.PI * 2;
      const rad = 28 + Math.random() * 280;
      return { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad };
    });
    const y = terrainHeight(x, z);
    const s = 0.75 + Math.random() * 1.0;

    dummy.position.set(x, y + 1.1 * s, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    if (collision) collision.addCollider(x, z, 0.42 * s);

    dummy.position.y = y + 3.6 * s;
    dummy.updateMatrix();
    leafMesh.setMatrixAt(i, dummy.matrix);
  }
  trunkMesh.instanceMatrix.needsUpdate = true;
  leafMesh.instanceMatrix.needsUpdate = true;
  scene.add(trunkMesh, leafMesh);

  // ---------------------------------------------------------------
  // sakura grove (unchanged core, kept for climate.js compatibility)
  // ---------------------------------------------------------------
  const sakuraPalette = [0xfff0f5, 0xffd1dc, 0xffc0cb, 0xffb7c5, 0xff91a4];
  const cherryTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3527, roughness: 1, flatShading: true });
  const cherryCanopyMats = sakuraPalette.map(
    hex => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, flatShading: true })
  );

  const cherryCount = mobile ? 12 : 16;
  const blobsPerTree = 3;
  const capacityPerMat = Math.ceil((cherryCount * blobsPerTree) / cherryCanopyMats.length) + 3;

  const cherryTrunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.22, 0.3, 2.4, 5),
    cherryTrunkMat,
    cherryCount
  );
  const cherryCanopyMeshes = cherryCanopyMats.map(
    mat => new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.15, 0), mat, capacityPerMat)
  );
  const counters = cherryCanopyMats.map(() => 0);
  const groveCenter = { x: -34, z: 24 };
  let robin = 0;

  for (let i = 0; i < cherryCount; i++) {
    let x, z;
    if (i < cherryCount * 0.78) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * 19;
      x = groveCenter.x + Math.cos(ang) * rad;
      z = groveCenter.z + Math.sin(ang) * rad;
    } else {
      const ang = Math.random() * Math.PI * 2;
      const rad = 45 + Math.random() * 240;
      x = Math.cos(ang) * rad;
      z = Math.sin(ang) * rad;
    }
    if (onReserved(x, z)) {
      const p = scatterXZ(() => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 45 + Math.random() * 240;
        return { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad };
      });
      x = p.x; z = p.z;
    }
    const y = terrainHeight(x, z);
    const s = 0.72 + Math.random() * 0.75;

    dummy.position.set(x, y + 1.2 * s, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    cherryTrunkMesh.setMatrixAt(i, dummy.matrix);
    if (collision) collision.addCollider(x, z, 0.4 * s);

    for (let b = 0; b < blobsPerTree; b++) {
      const matIdx = robin % cherryCanopyMats.length;
      robin++;
      const offX = (Math.random() - 0.5) * 2.2 * s;
      const offZ = (Math.random() - 0.5) * 2.2 * s;
      const offY = (Math.random() - 0.3) * 1.15 * s;
      dummy.position.set(x + offX, y + 2.9 * s + offY, z + offZ);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.setScalar(s * (0.62 + Math.random() * 0.58));
      dummy.updateMatrix();
      const slot = counters[matIdx]++;
      cherryCanopyMeshes[matIdx].setMatrixAt(slot, dummy.matrix);
    }
  }
  cherryCanopyMeshes.forEach((m, idx) => {
    m.count = counters[idx];
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
  });
  cherryTrunkMesh.instanceMatrix.needsUpdate = true;
  scene.add(cherryTrunkMesh);

  // ---------------------------------------------------------------
  // NEW: birch trees — mixed in with the pines for visual variety
  // ---------------------------------------------------------------
  const birchTrunkMat = new THREE.MeshStandardMaterial({ color: 0xe6ddce, roughness: 0.9, flatShading: true });
  const birchBarkMat = new THREE.MeshStandardMaterial({ color: 0x2b2621, roughness: 1, flatShading: true });
  const birchLeafPalette = [0x6e8a3e, 0x86a04a, 0x5c7a34];
  const birchLeafMats = birchLeafPalette.map(
    hex => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, flatShading: true })
  );

  const birchCount = mobile ? 10 : 14;
  const birchTrunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.16, 0.22, 3.0, 5), birchTrunkMat, birchCount
  );
  const birchMarkMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.34, 0.14, 0.05), birchBarkMat, birchCount * 3
  );
  const birchBlobsPerTree = 2;
  const birchCapacity = Math.ceil((birchCount * birchBlobsPerTree) / birchLeafMats.length) + 3;
  const birchLeafMeshes = birchLeafMats.map(
    mat => new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.35, 0), mat, birchCapacity)
  );
  const birchCounters = birchLeafMats.map(() => 0);
  let markIdx = 0, birchRobin = 0;

  for (let i = 0; i < birchCount; i++) {
    const { x, z } = scatterXZ(() => {
      const ang = Math.random() * Math.PI * 2;
      const rad = 20 + Math.random() * 280;
      return { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad };
    });
    const y = terrainHeight(x, z);
    const s = 0.8 + Math.random() * 0.7;

    dummy.position.set(x, y + 1.5 * s, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    birchTrunkMesh.setMatrixAt(i, dummy.matrix);
    if (collision) collision.addCollider(x, z, 0.3 * s);

    for (let m = 0; m < 3; m++) {
      dummy.position.set(x + (Math.random() - 0.5) * 0.05, y + (0.6 + m * 0.9) * s, z + 0.19 * s);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      birchMarkMesh.setMatrixAt(markIdx++, dummy.matrix);
    }

    for (let b = 0; b < birchBlobsPerTree; b++) {
      const matIdx = birchRobin % birchLeafMats.length;
      birchRobin++;
      const offX = (Math.random() - 0.5) * 1.6 * s;
      const offZ = (Math.random() - 0.5) * 1.6 * s;
      dummy.position.set(x + offX, y + 3.4 * s + Math.random() * 0.6 * s, z + offZ);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.setScalar(s * (0.6 + Math.random() * 0.5));
      dummy.updateMatrix();
      const slot = birchCounters[matIdx]++;
      birchLeafMeshes[matIdx].setMatrixAt(slot, dummy.matrix);
    }
  }
  birchTrunkMesh.instanceMatrix.needsUpdate = true;
  birchMarkMesh.instanceMatrix.needsUpdate = true;
  scene.add(birchTrunkMesh, birchMarkMesh);
  birchLeafMeshes.forEach((m, idx) => {
    m.count = birchCounters[idx];
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
  });

  // ---------------------------------------------------------------
  // NEW: undergrowth — bushes, ferns, wildflowers, grass tufts
  // ---------------------------------------------------------------

  // bushes / shrubs — low clumps near tree lines and trail edges
  const bushPalette = [0x3f5a2c, 0x4d6c34, 0x35502a];
  const bushMats = bushPalette.map(hex => new THREE.MeshStandardMaterial({ color: hex, roughness: 1, flatShading: true }));
  const bushCount = mobile ? 22 : 32;
  const bushCapacity = Math.ceil(bushCount / bushMats.length) + 3;
  const bushMeshes = bushMats.map(mat => new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 0), mat, bushCapacity));
  const bushCounters = bushMats.map(() => 0);

  for (let i = 0; i < bushCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 8 + Math.random() * 280;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = terrainHeight(x, z);
    const s = 0.6 + Math.random() * 0.9;
    const matIdx = Math.floor(Math.random() * bushMats.length);

    dummy.position.set(x, y + 0.35 * s, z);
    dummy.rotation.set(Math.random() * 0.3, Math.random() * Math.PI * 2, Math.random() * 0.3);
    dummy.scale.set(s * (0.9 + Math.random() * 0.4), s * (0.6 + Math.random() * 0.3), s * (0.9 + Math.random() * 0.4));
    dummy.updateMatrix();
    const slot = bushCounters[matIdx]++;
    bushMeshes[matIdx].setMatrixAt(slot, dummy.matrix);
  }
  bushMeshes.forEach((m, idx) => {
    m.count = bushCounters[idx];
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
  });

  // ferns — dark, low, clustered mostly under tree cover
  const fernMat = new THREE.MeshStandardMaterial({ color: 0x263c1f, roughness: 1, flatShading: true });
  const fernCount = mobile ? 28 : 40;
  const fernFrondMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.22, 0.55, 3), fernMat, fernCount * 3);
  let fernIdx = 0;

  for (let i = 0; i < fernCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 6 + Math.random() * 270;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = terrainHeight(x, z);
    const s = 0.6 + Math.random() * 0.7;

    for (let f = 0; f < 3; f++) {
      const fa = (f / 3) * Math.PI * 2 + Math.random() * 0.6;
      dummy.position.set(x + Math.cos(fa) * 0.12 * s, y + 0.27 * s, z + Math.sin(fa) * 0.12 * s);
      dummy.rotation.set(0.35 + Math.random() * 0.2, fa, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      fernFrondMesh.setMatrixAt(fernIdx++, dummy.matrix);
    }
  }
  fernFrondMesh.count = fernIdx;
  fernFrondMesh.instanceMatrix.needsUpdate = true;
  scene.add(fernFrondMesh);

  // wildflowers — tiny colored blooms scattered through open meadow
  const flowerPalette = [0xf5e04a, 0xffffff, 0xdd7fd6, 0xff8fa3, 0x8fb4ff];
  const flowerMats = flowerPalette.map(hex => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7, flatShading: true }));
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3d5a2a, roughness: 1, flatShading: true });
  const flowerCount = mobile ? 40 : 60;
  const flowerCapacity = Math.ceil(flowerCount / flowerMats.length) + 3;
  const flowerHeadMeshes = flowerMats.map(mat => new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.075, 0), mat, flowerCapacity));
  const flowerStemMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.016, 0.28, 3), stemMat, flowerCount);
  const flowerCounters = flowerMats.map(() => 0);

  for (let i = 0; i < flowerCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 5 + Math.random() * 270;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    // keep flowers out of the densest grove interior so they read as meadow, not undergrowth
    const distGrove = Math.hypot(x - groveCenter.x, z - groveCenter.z);
    if (distGrove < 10) continue;
    const y = terrainHeight(x, z);
    const s = 0.7 + Math.random() * 0.6;

    dummy.position.set(x, y + 0.14 * s, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    flowerStemMesh.setMatrixAt(i, dummy.matrix);

    const matIdx = Math.floor(Math.random() * flowerMats.length);
    dummy.position.set(x, y + 0.29 * s, z);
    dummy.rotation.set(Math.random(), Math.random(), Math.random());
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    const slot = flowerCounters[matIdx]++;
    flowerHeadMeshes[matIdx].setMatrixAt(slot, dummy.matrix);
  }
  flowerStemMesh.instanceMatrix.needsUpdate = true;
  scene.add(flowerStemMesh);
  flowerHeadMeshes.forEach((m, idx) => {
    m.count = flowerCounters[idx];
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
  });

  // grass tufts — dense low-poly ground cover, the biggest visual lift
  // for "explore the valley" — kept cheap: single geometry, few materials
  const grassPalette = [0x4a6b2c, 0x5c7f36, 0x3f5c26];
  const grassMats = grassPalette.map(hex => new THREE.MeshStandardMaterial({ color: hex, roughness: 1, flatShading: true }));
  const grassCount = mobile ? 180 : 280;
  const grassCapacity = Math.ceil(grassCount / grassMats.length) + 4;
  const grassMeshes = grassMats.map(mat => new THREE.InstancedMesh(new THREE.ConeGeometry(0.16, 0.46, 3), mat, grassCapacity));
  const grassCounters = grassMats.map(() => 0);

  for (let i = 0; i < grassCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * 300;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const distCamp = Math.hypot(x, z);
    if (distCamp < 9 || onReserved(x, z)) continue;
    const y = terrainHeight(x, z);
    const s = 0.55 + Math.random() * 0.85;
    const matIdx = Math.floor(Math.random() * grassMats.length);

    dummy.position.set(x, y + 0.23 * s, z);
    dummy.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.3);
    dummy.scale.set(s * (0.8 + Math.random() * 0.5), s, s * (0.8 + Math.random() * 0.5));
    dummy.updateMatrix();
    const slot = grassCounters[matIdx]++;
    if (slot < grassCapacity) grassMeshes[matIdx].setMatrixAt(slot, dummy.matrix);
  }
  grassMeshes.forEach((m, idx) => {
    m.count = Math.min(grassCounters[idx], grassCapacity);
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
  });

  // rocks / boulders — scattered exploration detail, favor slopes & ridgelines
  const rockPalette = [0x8b8478, 0x9a9284, 0x7c766a];
  const rockMats = rockPalette.map(hex => new THREE.MeshStandardMaterial({ color: hex, roughness: 1, flatShading: true }));
  const rockCount = 36;
  const rockCapacity = Math.ceil(rockCount / rockMats.length) + 3;
  const rockMeshes = rockMats.map(mat => new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.6, 0), mat, rockCapacity));
  const rockCounters = rockMats.map(() => 0);

  for (let i = 0; i < rockCount; i++) {
    const { x, z } = scatterXZ(() => {
      const ang = Math.random() * Math.PI * 2;
      const rad = 10 + Math.random() * 290;
      return { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad };
    });
    const y = terrainHeight(x, z);
    const s = 0.35 + Math.random() * 1.1;
    const matIdx = Math.floor(Math.random() * rockMats.length);

    dummy.position.set(x, y + 0.28 * s, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(s * (0.8 + Math.random() * 0.6), s * (0.6 + Math.random() * 0.5), s * (0.8 + Math.random() * 0.6));
    dummy.updateMatrix();
    const slot = rockCounters[matIdx]++;
    rockMeshes[matIdx].setMatrixAt(slot, dummy.matrix);
    if (collision) collision.addCollider(x, z, 0.55 * s);
  }
  rockMeshes.forEach((m, idx) => {
    m.count = rockCounters[idx];
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
  });

  // fallen logs — occasional horizontal trunks for exploration flavor
  const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 1, flatShading: true });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x4d6c34, roughness: 1, flatShading: true });
  const logCount = 10;
  const logMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.28, 3.4, 5), logMat, logCount);
  const mossMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.08, 1.2), mossMat, logCount);

  for (let i = 0; i < logCount; i++) {
    const { x, z } = scatterXZ(() => {
      const ang = Math.random() * Math.PI * 2;
      const rad = 15 + Math.random() * 280;
      return { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad };
    });
    const y = terrainHeight(x, z);
    const s = 0.7 + Math.random() * 0.6;
    const rot = Math.random() * Math.PI * 2;

    dummy.position.set(x, y + 0.28 * s, z);
    dummy.rotation.set(0, rot, Math.PI / 2);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    logMesh.setMatrixAt(i, dummy.matrix);

    dummy.rotation.set(0, rot, 0);
    dummy.position.y = y + 0.5 * s;
    dummy.updateMatrix();
    mossMesh.setMatrixAt(i, dummy.matrix);
  }
  logMesh.instanceMatrix.needsUpdate = true;
  mossMesh.instanceMatrix.needsUpdate = true;
  scene.add(logMesh, mossMesh);

  // mushrooms — tiny detail clusters near tree bases and logs
  const mushCapMat = new THREE.MeshStandardMaterial({ color: 0xb5473a, roughness: 0.8, flatShading: true });
  const mushStemMat = new THREE.MeshStandardMaterial({ color: 0xe8ddc9, roughness: 1, flatShading: true });
  const mushCount = 22;
  const mushCapMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 5, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), mushCapMat, mushCount);
  const mushStemMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.035, 0.14, 4), mushStemMat, mushCount);

  for (let i = 0; i < mushCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 6 + Math.random() * 270;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = terrainHeight(x, z);
    const s = 0.7 + Math.random() * 0.7;

    dummy.position.set(x, y + 0.07 * s, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    mushStemMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.y = y + 0.14 * s;
    dummy.updateMatrix();
    mushCapMesh.setMatrixAt(i, dummy.matrix);
  }
  mushCapMesh.instanceMatrix.needsUpdate = true;
  mushStemMesh.instanceMatrix.needsUpdate = true;
  scene.add(mushCapMesh, mushStemMesh);

  // ---------------------------------------------------------------
  // clouds (unchanged, count nudged up slightly for a fuller sky)
  // ---------------------------------------------------------------
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.48, fog: false
  });
  const clouds = [];
  const cloudGroup = new THREE.Group();
  for (let i = 0; i < (mobile ? 7 : 10); i++) {
    const c = new THREE.Group();
    const puffs = mobile ? 2 : 2 + Math.floor(Math.random() * 3);
    for (let p = 0; p < puffs; p++) {
      const puff = new THREE.Mesh(
        new THREE.IcosahedronGeometry(3.2 + Math.random() * 2.8, 0),
        cloudMat
      );
      puff.position.set(
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 6
      );
      c.add(puff);
    }
    const ang = Math.random() * Math.PI * 2;
    const rad = 90 + Math.random() * 180;
    c.position.set(Math.cos(ang) * rad, 48 + Math.random() * 40, Math.sin(ang) * rad);
    c.userData.drift = 1.1 + Math.random() * 1.9;
    clouds.push(c);
    cloudGroup.add(c);
  }
  scene.add(cloudGroup);

  // Climate still writes seasonal opacity values, so keep lightweight shims
  // rather than allocating invisible Points geometries every season.
  const disabledFallSystem = () => ({ mat: { opacity: 0 } });
  const snowSys = disabledFallSystem();
  const petalSys = disabledFallSystem();
  const leafSys = disabledFallSystem();
  function updateFallSystems() {}

  return {
    treeLeafMat,
    cherryCanopyMats,
    sakuraPalette,
    snowSys,
    petalSys,
    leafSys,
    clouds,
    updateFallSystems,
    // extra decorative refs (not required by other modules, but exposed
    // in case you want to hook them into future seasonal tinting etc.)
    birchLeafMats,
    grassMats,
    bushMats,
    flowerMats
  };
}
