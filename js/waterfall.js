// js/waterfall.js — twin-valley waterfall: two cliff streams merge into an
// upper basin, which overflows down a second cascade into a large lower
// pond suitable for fishing. Self-contained, follows the same particle-
// stream pattern as landmarks.js.
export function createWaterfall(scene, terrainHeight, collision) {
  const WF_POS = { x: -15, z: -95 };
  const baseY = terrainHeight(WF_POS.x, WF_POS.z);
  const group = new THREE.Group();
  group.position.set(WF_POS.x, baseY, WF_POS.z);
  scene.add(group);

  // ── materials ──────────────────────────────────────────────────────────
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x6e625a, roughness: 0.92, metalness: 0.05, flatShading: true
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x8a8076, roughness: 0.9, metalness: 0.04, flatShading: true
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x5c544c, roughness: 0.95, metalness: 0.03, flatShading: true
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x3d5a28, roughness: 1, metalness: 0, flatShading: true
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x4eb8d4, roughness: 0.08, metalness: 0.35,
    transparent: true, opacity: 0.78, side: THREE.FrontSide
  });
  const deepWaterMat = new THREE.MeshStandardMaterial({
    color: 0x2a8aab, roughness: 0.12, metalness: 0.4,
    transparent: true, opacity: 0.55, side: THREE.FrontSide
  });
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xeaf8ff, transparent: true, opacity: 0.58
  });
  const lilyMat = new THREE.MeshStandardMaterial({
    color: 0x2e5a26, roughness: 1, flatShading: true
  });
  const lilyPadMat = new THREE.MeshStandardMaterial({
    color: 0x3a6b30, roughness: 0.95, flatShading: true
  });
  const reedMat = new THREE.MeshStandardMaterial({
    color: 0x7a9040, roughness: 1, flatShading: true
  });
  const cattailMat = new THREE.MeshStandardMaterial({
    color: 0x5c4020, roughness: 1, flatShading: true
  });
  const sprayMat = new THREE.PointsMaterial({
    color: 0xc8eef8, size: 0.22, transparent: true, opacity: 0.55, depthWrite: false
  });

  // ── two source cliffs (the "twin valleys") ─────────────────────────────
  const cliffOffsets = [-9, 9];
  const cliffHeight = 15;

  cliffOffsets.forEach(cx => {
    // main cliff body
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(6.8, cliffHeight, 4.2), cliffMat);
    cliff.position.set(cx, cliffHeight / 2, -8);
    group.add(cliff);

    // stepped ledges for visual depth
    for (let step = 0; step < 3; step++) {
      const ledge = new THREE.Mesh(
        new THREE.BoxGeometry(7.4 - step * 0.6, 1.1, 1.6),
        darkStoneMat
      );
      ledge.position.set(cx, 3 + step * 3.8, -6.4 - step * 0.15);
      group.add(ledge);
    }

    // scattered rocks on face
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.55 + Math.random() * 0.85, 0),
        Math.random() > 0.45 ? stoneMat : darkStoneMat
      );
      r.position.set(
        cx + (Math.random() - 0.5) * 5.2,
        1.8 + Math.random() * 11,
        -5.8 + Math.random() * 1.8
      );
      r.rotation.set(Math.random() * 1.2, Math.random() * 2, Math.random() * 1.2);
      group.add(r);
    }

    // moss streaks + patches
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.9 + Math.random() * 0.7, 2.2 + Math.random() * 2.5, 0.18),
        mossMat
      );
      m.position.set(
        cx + (Math.random() - 0.5) * 3.8,
        2.5 + Math.random() * 9,
        -6.05
      );
      group.add(m);
    }
  });

  // connecting rock wall + overhang
  const midWall = new THREE.Mesh(new THREE.BoxGeometry(11.5, 9.5, 3.8), cliffMat);
  midWall.position.set(0, 4.75, -8.1);
  group.add(midWall);

  const overhang = new THREE.Mesh(new THREE.BoxGeometry(12.2, 1.4, 2.2), darkStoneMat);
  overhang.position.set(0, 9.6, -6.9);
  group.add(overhang);

  // ── upper basin ────────────────────────────────────────────────────────
  const upperBasin = new THREE.Mesh(new THREE.CircleGeometry(6.4, 28), waterMat.clone());
  upperBasin.rotation.x = -Math.PI / 2;
  upperBasin.position.set(0, 0.08, -1);
  group.add(upperBasin);

  // subtle deeper water underlay
  const upperDeep = new THREE.Mesh(new THREE.CircleGeometry(5.2, 24), deepWaterMat.clone());
  upperDeep.rotation.x = -Math.PI / 2;
  upperDeep.position.set(0, 0.05, -1);
  group.add(upperDeep);

  const upperFoam = new THREE.Mesh(new THREE.RingGeometry(5.7, 7.0, 28), foamMat.clone());
  upperFoam.rotation.x = -Math.PI / 2;
  upperFoam.position.set(0, 0.11, -1);
  group.add(upperFoam);

  // secondary thinner foam ring
  const upperFoam2 = new THREE.Mesh(new THREE.RingGeometry(4.4, 5.3, 24), foamMat.clone());
  upperFoam2.material = foamMat.clone();
  upperFoam2.material.opacity = 0.32;
  upperFoam2.rotation.x = -Math.PI / 2;
  upperFoam2.position.set(0, 0.12, -1);
  group.add(upperFoam2);

  // rim stones
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    const r = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.28 + Math.random() * 0.45, 0),
      Math.random() > 0.5 ? stoneMat : darkStoneMat
    );
    r.position.set(Math.cos(ang) * 6.55, 0.18, -1 + Math.sin(ang) * 6.55);
    r.rotation.set(Math.random(), Math.random() * 2, Math.random());
    group.add(r);
  }

  // overflow lip
  const lip = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.3, 2.1), stoneMat);
  lip.position.set(0, 0.45, 5.1);
  group.add(lip);

  // small rocks on the lip
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.25 + Math.random() * 0.3, 0),
      darkStoneMat
    );
    r.position.set((Math.random() - 0.5) * 5.5, 1.05, 5.0 + (Math.random() - 0.5) * 0.6);
    group.add(r);
  }

  // ── lower pond (fishing spot) ──────────────────────────────────────────
  const POND_LOCAL = { x: 0, z: 18 };
  const pondY = -3.4;

  const pondMesh = new THREE.Mesh(new THREE.CircleGeometry(9.4, 32), waterMat.clone());
  pondMesh.rotation.x = -Math.PI / 2;
  pondMesh.position.set(POND_LOCAL.x, pondY + 0.08, POND_LOCAL.z);
  group.add(pondMesh);

  const pondDeep = new THREE.Mesh(new THREE.CircleGeometry(7.2, 28), deepWaterMat.clone());
  pondDeep.rotation.x = -Math.PI / 2;
  pondDeep.position.set(POND_LOCAL.x, pondY + 0.04, POND_LOCAL.z);
  group.add(pondDeep);

  const pondFoam = new THREE.Mesh(new THREE.RingGeometry(8.7, 10.4, 32), foamMat.clone());
  pondFoam.rotation.x = -Math.PI / 2;
  pondFoam.position.set(POND_LOCAL.x, pondY + 0.1, POND_LOCAL.z);
  group.add(pondFoam);

  const pondFoam2 = new THREE.Mesh(new THREE.RingGeometry(6.8, 7.9, 28), foamMat.clone());
  pondFoam2.material = foamMat.clone();
  pondFoam2.material.opacity = 0.28;
  pondFoam2.rotation.x = -Math.PI / 2;
  pondFoam2.position.set(POND_LOCAL.x, pondY + 0.11, POND_LOCAL.z);
  group.add(pondFoam2);

  // lily pads (two sizes + slight color variation)
  for (let i = 0; i < 11; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 1.6 + Math.random() * 5.8;
    const size = 0.42 + Math.random() * 0.55;
    const lily = new THREE.Mesh(
      new THREE.CircleGeometry(size, 9),
      Math.random() > 0.4 ? lilyMat : lilyPadMat
    );
    lily.rotation.x = -Math.PI / 2;
    lily.position.set(
      POND_LOCAL.x + Math.cos(ang) * rad,
      pondY + 0.11,
      POND_LOCAL.z + Math.sin(ang) * rad
    );
    group.add(lily);
  }

  // reeds + cattails around the rim
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const rad = 8.9 + Math.random() * 1.7;
    const tx = POND_LOCAL.x + Math.cos(ang) * rad;
    const tz = POND_LOCAL.z + Math.sin(ang) * rad;
    const h = 1.5 + Math.random() * 0.7;

    const reed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.048, h, 5),
      reedMat
    );
    reed.position.set(tx, pondY + h * 0.5, tz);
    reed.rotation.z = (Math.random() - 0.5) * 0.15;
    group.add(reed);

    if (Math.random() > 0.35) {
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.045, 0.32 + Math.random() * 0.12, 5),
        cattailMat
      );
      top.position.set(tx, pondY + h + 0.18, tz);
      group.add(top);
    }
  }

  // pond-edge boulders
  for (let i = 0; i < 9; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.45 + Math.random() * 0.75, 0),
      Math.random() > 0.5 ? stoneMat : darkStoneMat
    );
    r.position.set(
      POND_LOCAL.x + Math.cos(ang) * (9.7 + Math.random() * 0.8),
      pondY + 0.28,
      POND_LOCAL.z + Math.sin(ang) * (9.7 + Math.random() * 0.8)
    );
    r.rotation.set(Math.random(), Math.random() * 2, Math.random());
    group.add(r);
  }

  // ── particle stream helper ─────────────────────────────────────────────
  function makeStream(count, spreadX, startY, endY, zPos, size, color, opacity, speed = 8.5) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);

    function reset(i, stagger) {
      pos[i * 3] = (Math.random() - 0.5) * spreadX;
      pos[i * 3 + 1] = stagger ? startY * Math.random() : startY + Math.random() * 0.4;
      pos[i * 3 + 2] = zPos + (Math.random() - 0.5) * 0.7;
      seed[i] = Math.random() * Math.PI * 2;
    }

    for (let i = 0; i < count; i++) reset(i, true);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color, size, transparent: true, opacity, depthWrite: false
    });
    const points = new THREE.Points(geo, mat);
    group.add(points);

    return { geo, pos, seed, count, startY, endY, reset, speed, mat };
  }

  // left & right upper cascades (core + fine spray)
  const streamL = makeStream(180, 4.2, cliffHeight - 0.8, 0.45, -7.1, 0.30, 0xaae4f8, 0.72);
  const streamR = makeStream(180, 4.2, cliffHeight - 0.8, 0.45, -7.1, 0.30, 0xaae4f8, 0.72);
  const sprayL  = makeStream(90, 5.0, cliffHeight - 1.2, 0.6, -6.9, 0.18, 0xd4f2fa, 0.42, 7.2);
  const sprayR  = makeStream(90, 5.0, cliffHeight - 1.2, 0.6, -6.9, 0.18, 0xd4f2fa, 0.42, 7.2);

  // offset to cliffs
  for (let i = 0; i < streamL.count; i++) streamL.pos[i * 3] += -9;
  for (let i = 0; i < streamR.count; i++) streamR.pos[i * 3] += 9;
  for (let i = 0; i < sprayL.count; i++)  sprayL.pos[i * 3]  += -9;
  for (let i = 0; i < sprayR.count; i++)  sprayR.pos[i * 3]  += 9;

  streamL.geo.attributes.position.needsUpdate = true;
  streamR.geo.attributes.position.needsUpdate = true;
  sprayL.geo.attributes.position.needsUpdate = true;
  sprayR.geo.attributes.position.needsUpdate = true;

  // main overflow cascade into lower pond
  const streamDown = makeStream(170, 6.4, 0.15, pondY + 0.35, 6.1, 0.28, 0xaae4f8, 0.68);
  const sprayDown  = makeStream(80, 7.2, 0.0, pondY + 0.5, 6.3, 0.16, 0xd4f2fa, 0.38, 7.0);

  // ── mist ───────────────────────────────────────────────────────────────
  function makeMist(count, cx, cz, baseY2, radius = 5.5) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = cx + (Math.random() - 0.5) * radius;
      pos[i * 3 + 1] = baseY2 + Math.random() * 2.4;
      pos[i * 3 + 2] = cz + (Math.random() - 0.5) * (radius * 0.75);
      seed[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xdff5ff, size: 0.95, transparent: true, opacity: 0.30, depthWrite: false
    });
    const points = new THREE.Points(geo, mat);
    group.add(points);

    return { geo, pos, seed, count, baseY: baseY2, mat };
  }

  const mistUpper = makeMist(55, 0, -1, 0.25, 6.5);
  const mistLower = makeMist(60, POND_LOCAL.x, POND_LOCAL.z - 5.5, pondY + 0.25, 7.5);

  // ── soft lights ────────────────────────────────────────────────────────
  const wfLight = new THREE.PointLight(0x8ecfee, 1.35, 22, 2);
  wfLight.position.set(0, 3.2, -2);
  group.add(wfLight);

  const wfLight2 = new THREE.PointLight(0x8ecfee, 1.15, 20, 2);
  wfLight2.position.set(POND_LOCAL.x, pondY + 2.6, POND_LOCAL.z - 5);
  group.add(wfLight2);

  // ── collision ──────────────────────────────────────────────────────────
  if (collision) {
    collision.addCollider(WF_POS.x, WF_POS.z - 8, 6.8);
    collision.addCollider(WF_POS.x, WF_POS.z + POND_LOCAL.z, 9.8);
  }

  const worldPondPos = { x: WF_POS.x + POND_LOCAL.x, z: WF_POS.z + POND_LOCAL.z };

  const poiList = [{
    name: 'Twin Falls',
    pos: WF_POS,
    r: 20,
    flavor: 'Two mountain streams meet here and tumble together into a wide, still pond below.'
  }];

  // ── update helpers ─────────────────────────────────────────────────────
  function updateStream(s, dt, t) {
    const speed = s.speed || 8.5;
    for (let i = 0; i < s.count; i++) {
      const iy = i * 3 + 1;
      s.pos[iy] -= dt * speed;
      s.pos[i * 3] += Math.sin(t * 2.1 + s.seed[i]) * 0.045 * dt;
      s.pos[i * 3 + 2] += Math.cos(t * 1.7 + s.seed[i] * 1.3) * 0.02 * dt;
      if (s.pos[iy] < s.endY) s.reset(i, false);
    }
    s.geo.attributes.position.needsUpdate = true;
  }

  function updateMist(m, dt, t) {
    for (let i = 0; i < m.count; i++) {
      m.pos[i * 3]     += Math.sin(t * 0.45 + m.seed[i]) * 0.22 * dt;
      m.pos[i * 3 + 2] += Math.cos(t * 0.38 + m.seed[i] * 0.9) * 0.12 * dt;
      m.pos[i * 3 + 1] += 0.20 * dt;
      if (m.pos[i * 3 + 1] > m.baseY + 2.6) {
        m.pos[i * 3 + 1] = m.baseY + Math.random() * 0.3;
      }
    }
    m.geo.attributes.position.needsUpdate = true;
  }

  function update(dt, t) {
    updateStream(streamL, dt, t);
    updateStream(streamR, dt, t);
    updateStream(sprayL, dt, t);
    updateStream(sprayR, dt, t);
    updateStream(streamDown, dt, t);
    updateStream(sprayDown, dt, t);
    updateMist(mistUpper, dt, t);
    updateMist(mistLower, dt, t);

    // living water + light
    const pulse = Math.sin(t * 1.25);
    upperBasin.material.opacity = 0.74 + pulse * 0.045;
    pondMesh.material.opacity   = 0.74 + Math.sin(t * 1.25 + 0.6) * 0.045;
    upperDeep.material.opacity  = 0.52 + pulse * 0.04;
    pondDeep.material.opacity   = 0.52 + Math.sin(t * 1.25 + 0.6) * 0.04;

    wfLight.intensity  = 1.15 + Math.sin(t * 4.1) * 0.22;
    wfLight2.intensity = 1.05 + Math.sin(t * 3.5 + 1.1) * 0.18;

    // gentle foam shimmer
    upperFoam.material.opacity = 0.52 + Math.sin(t * 2.3) * 0.08;
    pondFoam.material.opacity  = 0.52 + Math.sin(t * 2.1 + 0.7) * 0.08;
  }

  return { update, poiList, WF_POS, pondPos: worldPondPos };
}