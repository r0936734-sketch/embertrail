/**
 * Embertrail — The Sunken Ruins landmark
 * Self-contained scenery group: exterior pillar ring + sunken staircase,
 * plus an isolated underground chamber with relic, runes, torches, and dust.
 * THREE is global (r128). No imports.
 */

const RUINS_X = -110;
const RUINS_Z = 90;
const PILLAR_RING_R = 14;
const CHAMBER_DEPTH = 300;

// Weathered stone material (shared exterior / chamber walls)
function stoneMat(color = 0x6b5b4a) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
    metalness: 0.05,
  });
}

// Dim moss
function mossMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x2a3a22,
    flatShading: true,
    roughness: 1,
    metalness: 0,
  });
}

/**
 * Create a torch: cylinder handle + cone flame + PointLight.
 * Returns { group, light, flame } so the caller can flicker them.
 */
function makeTorch(height = 1.2) {
  const g = new THREE.Group();

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, height, 6),
    stoneMat(0x3a2e24)
  );
  handle.position.y = height * 0.5;
  g.add(handle);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.35, 5),
    new THREE.MeshBasicMaterial({ color: 0xffaa44 })
  );
  flame.position.y = height + 0.12;
  g.add(flame);

  const light = new THREE.PointLight(0xff8833, 0.55, 8, 1.5);
  light.position.y = height + 0.2;
  g.add(light);

  return { group: g, light, flame };
}

/**
 * Flicker helper — scale pulse + intensity jitter (campfire style).
 */
function flickerTorch(torch, elapsed, phase = 0) {
  const t = elapsed * 7 + phase;
  const s = 0.85 + 0.2 * Math.sin(t) + 0.08 * Math.sin(t * 2.3);
  torch.flame.scale.setScalar(s);
  torch.light.intensity = 0.4 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.7));
}

export function createRuins(scene, terrainHeight, collision) {
  const y0 = terrainHeight(RUINS_X, RUINS_Z);
  const RUINS_POS = { x: RUINS_X, z: RUINS_Z };

  // ── Exterior group ──────────────────────────────────────────────
  const exterior = new THREE.Group();
  exterior.position.set(RUINS_X, y0, RUINS_Z);
  scene.add(exterior);

  const stone = stoneMat(0x6b5b4a);
  const stoneDark = stoneMat(0x524538);
  const moss = mossMat();

  // Pillars in a rough circle
  const pillarCount = 7;
  const pillars = [];
  const torches = []; // { group, light, flame }

  for (let i = 0; i < pillarCount; i++) {
    const angle = (i / pillarCount) * Math.PI * 2 + 0.15;
    const r = PILLAR_RING_R + (Math.sin(i * 2.1) * 0.8);
    const px = Math.cos(angle) * r;
    const pz = Math.sin(angle) * r;

    // Vary height: some snapped short, some tall
    const isTall = i === 1 || i === 5; // flanking the entrance-ish
    const isBroken = i % 3 === 0;
    const h = isTall ? 5.5 + Math.random() * 1.2 : isBroken ? 1.6 + Math.random() * 1.4 : 3.2 + Math.random() * 1.8;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55 + Math.random() * 0.15, 0.7, h, 7),
      i % 2 === 0 ? stone : stoneDark
    );
    pillar.position.set(px, h * 0.5, pz);
    pillar.rotation.y = Math.random() * Math.PI;
    // Slight lean on broken ones
    if (isBroken) {
      pillar.rotation.z = (Math.random() - 0.5) * 0.25;
      pillar.rotation.x = (Math.random() - 0.5) * 0.15;
    }
    exterior.add(pillar);
    pillars.push(pillar);

    // Moss patches on a few
    if (i % 2 === 1) {
      const patch = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.08, 0.5),
        moss
      );
      patch.position.set(px + 0.4, h * 0.4 + Math.random() * 0.5, pz);
      patch.rotation.y = angle;
      exterior.add(patch);
    }

    // Torches on the two tall flanking pillars
    if (isTall) {
      const torch = makeTorch(0.9);
      torch.group.position.set(px * 0.92, h * 0.72, pz * 0.92);
      exterior.add(torch.group);
      torches.push(torch);
    }
  }

  // Scattered rubble & boulders
  const rubbleColliders = [];
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = 3 + Math.random() * (PILLAR_RING_R + 3);
    const rx = Math.cos(a) * rr;
    const rz = Math.sin(a) * rr;
    const size = 0.25 + Math.random() * 0.55;

    if (Math.random() > 0.45) {
      // Box rubble
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(size * 1.4, size * 0.7, size),
        Math.random() > 0.5 ? stone : stoneDark
      );
      block.position.set(rx, size * 0.35, rz);
      block.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.3);
      exterior.add(block);
    } else {
      // Boulder
      const boulder = new THREE.Mesh(
        new THREE.IcosahedronGeometry(size, 0),
        stoneDark
      );
      boulder.position.set(rx, size * 0.55, rz);
      boulder.rotation.set(Math.random(), Math.random(), Math.random());
      exterior.add(boulder);
      if (size > 0.55) {
        rubbleColliders.push({ x: RUINS_X + rx, z: RUINS_Z + rz, r: size * 1.1 });
      }
    }
  }

  // Centerpiece: sunken staircase leading into a rectangular pit
  const stepCount = 6;
  const stepW = 2.4;
  const stepD = 0.7;
  const stepH = 0.38;
  const pitDepth = stepCount * stepH + 0.4;

  // Pit walls / opening rim
  const pitW = 3.2;
  const pitL = stepCount * stepD + 1.2;
  const rimMat = stoneDark;

  // Floor of the pit (bottom of exterior stairs)
  const pitFloor = new THREE.Mesh(
    new THREE.BoxGeometry(pitW - 0.2, 0.2, pitL),
    stone
  );
  pitFloor.position.set(0, -pitDepth + 0.1, pitL * 0.15);
  exterior.add(pitFloor);

  // Simple pit side walls
  const sideH = pitDepth + 0.3;
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, sideH, pitL + 0.4),
      rimMat
    );
    wall.position.set(side * (pitW * 0.5), -sideH * 0.5 + 0.15, pitL * 0.12);
    exterior.add(wall);
  }
  // Back wall of pit
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(pitW + 0.4, sideH, 0.35),
    rimMat
  );
  backWall.position.set(0, -sideH * 0.5 + 0.15, -pitL * 0.35);
  exterior.add(backWall);

  // Descending steps (toward -Z into the pit)
  for (let i = 0; i < stepCount; i++) {
    const sy = -i * stepH - stepH * 0.5;
    const sz = i * stepD - 0.6;
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(stepW - i * 0.08, stepH, stepD * 0.95),
      i % 2 === 0 ? stone : stoneDark
    );
    step.position.set(0, sy, sz);
    exterior.add(step);
  }

  // Entry point: bottom of the exterior staircase pit
  const entryPoint = {
    x: RUINS_X,
    y: y0 - pitDepth + 0.5,
    z: RUINS_Z + pitL * 0.1,
  };

  // Colliders
  if (collision && typeof collision.addCollider === 'function') {
    collision.addCollider(RUINS_X, RUINS_Z, PILLAR_RING_R * 0.72);
    for (const c of rubbleColliders) {
      collision.addCollider(c.x, c.z, c.r);
    }
  }

  // ── Underground chamber (isolated far below) ────────────────────
  const chamberY = y0 - CHAMBER_DEPTH;
  const chamberGroup = new THREE.Group();
  chamberGroup.position.set(RUINS_X, chamberY, RUINS_Z);
  scene.add(chamberGroup);

  const chamberR = 7;
  const chamberH = 6;
  const floorY = 0;
  const wallMat = stoneMat(0x4a3f35);
  const floorMat = stoneMat(0x5a4e42);

  // Stone floor (slightly raised disk via cylinder)
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(chamberR + 0.3, chamberR + 0.3, 0.4, 10),
    floorMat
  );
  floor.position.y = floorY - 0.2;
  chamberGroup.add(floor);

  // Hexagonal-ish wall ring (box segments)
  const wallSegments = 8;
  for (let i = 0; i < wallSegments; i++) {
    const a = (i / wallSegments) * Math.PI * 2;
    const wx = Math.cos(a) * chamberR;
    const wz = Math.sin(a) * chamberR;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, chamberH, 0.55),
      wallMat
    );
    wall.position.set(wx, chamberH * 0.5, wz);
    wall.rotation.y = -a;
    chamberGroup.add(wall);
  }

  // Simple ceiling ring (open center for atmosphere)
  for (let i = 0; i < wallSegments; i++) {
    const a = (i / wallSegments) * Math.PI * 2 + Math.PI / wallSegments;
    const cx = Math.cos(a) * (chamberR * 0.7);
    const cz = Math.sin(a) * (chamberR * 0.7);
    const ceil = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.35, 1.8),
      stoneDark
    );
    ceil.position.set(cx, chamberH - 0.1, cz);
    ceil.rotation.y = -a;
    chamberGroup.add(ceil);
  }

  // Raised stone altar / pedestal
  const pedestalBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.7, 1.6),
    stone
  );
  pedestalBase.position.y = 0.35;
  chamberGroup.add(pedestalBase);

  const pedestalTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.18, 1.9),
    stoneDark
  );
  pedestalTop.position.y = 0.8;
  chamberGroup.add(pedestalTop);

  // Glowing relic gem
  const relic = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.38, 1),
    new THREE.MeshStandardMaterial({
      color: 0x8a5fff,
      emissive: 0x8a5fff,
      emissiveIntensity: 0.6,
      flatShading: true,
      roughness: 0.35,
      metalness: 0.2,
    })
  );
  relic.position.y = 1.35;
  chamberGroup.add(relic);

  // Soft light above relic
  const relicLight = new THREE.PointLight(0xaa88ff, 0.9, 12, 1.2);
  relicLight.position.y = 2.1;
  chamberGroup.add(relicLight);

  // Thin torus halo
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.035, 8, 24),
    new THREE.MeshBasicMaterial({
      color: 0xc4a0ff,
      transparent: true,
      opacity: 0.65,
    })
  );
  halo.position.y = 1.35;
  halo.rotation.x = Math.PI * 0.5;
  chamberGroup.add(halo);

  // Glowing rune markings on walls
  const runes = [];
  const runePositions = [
    { a: 0.4, h: 2.2 },
    { a: 2.1, h: 3.0 },
    { a: 3.8, h: 2.5 },
    { a: 5.2, h: 2.8 },
  ];
  for (let i = 0; i < runePositions.length; i++) {
    const { a, h } = runePositions[i];
    const rx = Math.cos(a) * (chamberR - 0.32);
    const rz = Math.sin(a) * (chamberR - 0.32);
    const rune = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.9),
      new THREE.MeshBasicMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
    );
    rune.position.set(rx, h, rz);
    // Face toward chamber center (local origin)
    rune.lookAt(0, h, 0);
    chamberGroup.add(rune);
    runes.push({ mesh: rune, phase: i * 1.3 });
  }

  // Chamber wall torches
  const chamberTorchAngles = [1.0, 3.2, 5.0];
  for (const a of chamberTorchAngles) {
    const tx = Math.cos(a) * (chamberR - 0.7);
    const tz = Math.sin(a) * (chamberR - 0.7);
    const torch = makeTorch(0.85);
    torch.group.position.set(tx, 2.1, tz);
    chamberGroup.add(torch.group);
    torches.push(torch);
  }

  // Dust motes / ceiling drips — Points particle system
  const moteCount = 36;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * (chamberR * 0.85);
    motePositions[i * 3] = Math.cos(a) * r;
    motePositions[i * 3 + 1] = 0.5 + Math.random() * (chamberH - 1);
    motePositions[i * 3 + 2] = Math.sin(a) * r;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = new THREE.PointsMaterial({
    color: 0xccbbaa,
    size: 0.06,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  chamberGroup.add(motes);

  // Where the player should appear inside the chamber
  const chamberPoint = {
    x: RUINS_X,
    y: chamberY + 1.2,
    z: RUINS_Z + 2.5,
  };

  // POI list entry
  const poiList = [
    {
      name: 'The Sunken Ruins',
      pos: { x: RUINS_X, z: RUINS_Z },
      r: 18,
      flavor:
        'Broken pillars circle a stair that sinks into the earth. Far below, a violet light waits on a forgotten altar.',
    },
  ];

  // ── Update loop ─────────────────────────────────────────────────
  function update(dt, elapsed) {
    // Torches
    for (let i = 0; i < torches.length; i++) {
      flickerTorch(torches[i], elapsed, i * 1.7);
    }

    // Relic spin
    relic.rotation.y += dt * 0.45;
    relic.rotation.x = Math.sin(elapsed * 0.6) * 0.12;

    // Halo rotate + opacity pulse
    halo.rotation.z += dt * 0.7;
    halo.material.opacity = 0.4 + 0.35 * (0.5 + 0.5 * Math.sin(elapsed * 1.8));

    // Rune opacity pulse (staggered)
    for (const r of runes) {
      const o = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 1.4 + r.phase));
      r.mesh.material.opacity = o;
    }

    // Dust motes drift downward, wrap to top
    const pos = motes.geometry.attributes.position.array;
    for (let i = 0; i < moteCount; i++) {
      pos[i * 3 + 1] -= dt * (0.12 + (i % 5) * 0.02);
      // gentle horizontal drift
      pos[i * 3] += Math.sin(elapsed * 0.3 + i) * dt * 0.04;
      pos[i * 3 + 2] += Math.cos(elapsed * 0.25 + i * 0.7) * dt * 0.04;
      if (pos[i * 3 + 1] < 0.3) {
        pos[i * 3 + 1] = chamberH - 0.4;
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * (chamberR * 0.8);
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 2] = Math.sin(a) * r;
      }
    }
    motes.geometry.attributes.position.needsUpdate = true;
  }

  return {
    update,
    poiList,
    RUINS_POS,
    entryPoint,
    chamberPoint,
    chamberGroup,
  };
}