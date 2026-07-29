/**
 * Embertrail — The Flame Tower landmark
 * Tall stone beacon tower with base braziers, archery-ignitable top brazier,
 * dramatic layered flame + smoke when lit, and rain-extinguish logic.
 * THREE is global (r128). No imports.
 */

function stoneMat(color = 0x5a5048) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
    metalness: 0.05,
  });
}

function woodMat(color = 0x4a3424) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
    metalness: 0,
  });
}

/**
 * Small always-lit brazier: short post + shallow bowl + flame cone + PointLight.
 * Returns { group, flame, light } for flicker updates.
 */
function makeBaseBrazier(postH = 1.4) {
  const g = new THREE.Group();

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, postH, 5),
    woodMat(0x3a2a1c)
  );
  post.position.y = postH * 0.5;
  g.add(post);

  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.28, 0.22, 6),
    stoneMat(0x3a3530)
  );
  bowl.position.y = postH + 0.05;
  g.add(bowl);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.55, 5),
    new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.85,
    })
  );
  flame.position.y = postH + 0.4;
  g.add(flame);

  const light = new THREE.PointLight(0xff7722, 0.7, 10, 1.4);
  light.position.y = postH + 0.5;
  g.add(light);

  return { group: g, flame, light };
}

/**
 * Beacon flames — two layered cones only (lightweight) + PointLight.
 * Starts hidden; enabled when burning.
 */
function makeBeaconFire() {
  const g = new THREE.Group();
  g.visible = false;

  const mkCone = (r, h, color, opacity, y) => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 5),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
      })
    );
    m.position.y = y;
    g.add(m);
    return m;
  };

  // Two layers only — cheaper than three nested cones
  const core = mkCone(0.6, 1.6, 0xff5511, 0.88, 0.75);
  const mid = mkCone(0.95, 2.2, 0xffaa44, 0.65, 1.05);

  const light = new THREE.PointLight(0xff6622, 0, 26, 1.3);
  light.position.y = 1.5;
  g.add(light);

  return { group: g, core, mid, light };
}

/** Flicker a simple flame + light (base-brazier style). Uniform scale only. */
function flickerSimple(flame, light, elapsed, phase, baseIntensity = 0.7) {
  const t = elapsed * 6.5 + phase;
  const s = 0.85 + 0.18 * Math.sin(t);
  flame.scale.setScalar(s);
  light.intensity = baseIntensity * (0.8 + 0.25 * Math.sin(t * 1.6));
}

export function createFlameTower({
  scene,
  terrainHeight,
  collision,
  archery,
  position = { x: 130, z: 60 },
  onEvent = () => {},
}) {
  const px = position.x;
  const pz = position.z;
  const y0 = terrainHeight(px, pz);

  const group = new THREE.Group();
  group.position.set(px, y0, pz);
  scene.add(group);

  const stone = stoneMat(0x5a5048);
  const stoneDark = stoneMat(0x3e3832);
  const wood = woodMat(0x4a3424);
  const woodDark = woodMat(0x352418);

  // ── Tower shaft (stacked tapered cylinders) ─────────────────────
  const shaftH = 16;
  const segments = [
    { y: 0, h: 4.2, rBot: 2.1, rTop: 1.85 },
    { y: 4.2, h: 4.0, rBot: 1.85, rTop: 1.55 },
    { y: 8.2, h: 4.0, rBot: 1.55, rTop: 1.3 },
    { y: 12.2, h: 3.8, rBot: 1.3, rTop: 1.15 },
  ];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(s.rTop, s.rBot, s.h, 7),
      i % 2 === 0 ? stone : stoneDark
    );
    mesh.position.y = s.y + s.h * 0.5;
    group.add(mesh);
  }

  // Decorative stone bands
  for (const by of [4.2, 8.2, 12.2]) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(2.05 - by * 0.04, 2.05 - by * 0.04, 0.28, 7),
      stoneDark
    );
    band.position.y = by;
    group.add(band);
  }

  // Visual ladder rungs up one side
  for (let i = 0; i < 14; i++) {
    const ry = 0.9 + i * 1.1;
    const rung = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.08, 0.1),
      woodDark
    );
    rung.position.set(1.35 - i * 0.02, ry, 0);
    group.add(rung);
  }

  // ── Top platform / crown ────────────────────────────────────────
  const platformY = shaftH;
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.4, 0.35, 8),
    wood
  );
  platform.position.y = platformY + 0.1;
  group.add(platform);

  // Guard rail posts + top ring
  const railR = 3.0;
  const postCount = 8;
  for (let i = 0; i < postCount; i++) {
    const a = (i / postCount) * Math.PI * 2;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 1.1, 4),
      woodDark
    );
    post.position.set(Math.cos(a) * railR, platformY + 0.7, Math.sin(a) * railR);
    group.add(post);
  }
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(railR, 0.06, 4, 12),
    woodDark
  );
  rail.position.y = platformY + 1.2;
  rail.rotation.x = Math.PI * 0.5;
  group.add(rail);

  // Tattered banners
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0x6a2030,
    flatShading: true,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  for (const side of [-1, 1]) {
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 1.6),
      bannerMat
    );
    banner.position.set(side * 2.6, platformY + 0.3, 1.8);
    banner.rotation.y = side * 0.3;
    banner.rotation.z = side * 0.08;
    group.add(banner);
  }

  // ── Top brazier bowl (the ignitable beacon) ─────────────────────
  const brazierY = platformY + 0.55;
  const topBowl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 0.9, 0.45, 8),
    stoneMat(0x2e2a28)
  );
  topBowl.position.y = brazierY;
  group.add(topBowl);

  // Visible charcoal / coal pile — clear "this is the target" silhouette
  const coalMat = new THREE.MeshStandardMaterial({
    color: 0x2a1810,
    emissive: 0xff5511,
    emissiveIntensity: 0.55,
    flatShading: true,
    roughness: 1,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cr = 0.35 + (i % 2) * 0.15;
    const coal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18 + (i % 3) * 0.04, 0),
      coalMat
    );
    coal.position.set(
      Math.cos(a) * cr,
      brazierY + 0.28,
      Math.sin(a) * cr
    );
    coal.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(coal);
  }

  // Bright ember bed disc — readable from a distance
  const emberBed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.14, 7),
    new THREE.MeshStandardMaterial({
      color: 0x4a2208,
      emissive: 0xff4400,
      emissiveIntensity: 0.45,
      flatShading: true,
      roughness: 1,
    })
  );
  emberBed.position.y = brazierY + 0.2;
  group.add(emberBed);

  // Aim marker: thin vertical stake + glowing tip so the shoot point is obvious
  const stake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 1.5, 4),
    woodDark
  );
  stake.position.y = brazierY + 0.95;
  group.add(stake);

  const aimTip = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18, 0),
    new THREE.MeshBasicMaterial({ color: 0xff6622 })
  );
  aimTip.position.y = brazierY + 1.75;
  group.add(aimTip);

  // Soft ring halo around the bowl rim — further aim cue (unlit state)
  const aimRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.04, 4, 14),
    new THREE.MeshBasicMaterial({
      color: 0xff7733,
      transparent: true,
      opacity: 0.55,
    })
  );
  aimRing.position.y = brazierY + 0.22;
  aimRing.rotation.x = Math.PI * 0.5;
  group.add(aimRing);

  // Subtle unlit smoulder flame
  const smoulder = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.45, 5),
    new THREE.MeshBasicMaterial({
      color: 0xff6622,
      transparent: true,
      opacity: 0.28,
    })
  );
  smoulder.position.y = brazierY + 0.45;
  group.add(smoulder);

  const smoulderLight = new THREE.PointLight(0xff5522, 0.35, 8, 1.5);
  smoulderLight.position.y = brazierY + 0.55;
  group.add(smoulderLight);

  // Big beacon fire (hidden until lit)
  const beacon = makeBeaconFire();
  beacon.group.position.y = brazierY + 0.35;
  group.add(beacon.group);

  // ── Lightweight smoke particles (16 pts, simple rise) ───────────
  const particleCount = 16;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 0.7;
    particlePositions[i * 3 + 1] = Math.random() * 3;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xbb7744,
    size: 0.14,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.position.y = brazierY + 0.4;
  particles.visible = false;
  group.add(particles);

  // ── Base braziers (always lit) ──────────────────────────────────
  const baseBraziers = [];
  const baseOffsets = [
    { x: 4.5, z: 4.5 },
    { x: -4.5, z: 4.5 },
    { x: 4.5, z: -4.5 },
    { x: -4.5, z: -4.5 },
  ];
  for (let i = 0; i < baseOffsets.length; i++) {
    const o = baseOffsets[i];
    const bb = makeBaseBrazier(1.3 + (i % 2) * 0.15);
    bb.group.position.set(o.x, 0, o.z);
    group.add(bb.group);
    baseBraziers.push(bb);
  }

  // Collider for shaft footprint
  if (collision && typeof collision.addCollider === 'function') {
    collision.addCollider(px, pz, 2.4);
  }

  // ── State ───────────────────────────────────────────────────────
  let burning = false;
  let fadeOut = 0;
  let rainTimer = 0;
  let latestWeather = { isRaining: false, rainAmount: 0 };
  const RAIN_EXTINGUISH_SECS = 10;
  const FADE_DURATION = 1.6;

  // Hide aim markers when burning (flame replaces them)
  function setAimVisible(v) {
    aimTip.visible = v;
    aimRing.visible = v;
    stake.visible = v;
  }

  const topBrazierWorldPos = new THREE.Vector3(px, y0 + brazierY + 0.3, pz);

  if (archery && typeof archery.register === 'function') {
    archery.register({
      name: 'flameTowerBeacon',
      radius: 1.6,
      getPos: () => topBrazierWorldPos,
      onHit: (power) => {
        if (burning && fadeOut <= 0) return;
        const raining =
          latestWeather.isRaining || (latestWeather.rainAmount || 0) > 0.5;
        if (raining) {
          onEvent('towerLitFail', { reason: 'rain' });
          return;
        }
        if (!burning) {
          burning = true;
          fadeOut = 0;
          rainTimer = 0;
          beacon.group.visible = true;
          particles.visible = true;
          smoulder.visible = false;
          smoulderLight.intensity = 0;
          setAimVisible(false);
          onEvent('towerLit', { power });
        }
      },
    });
  }

  const poiList = [
    {
      name: 'The Flame Tower',
      pos: { x: px, z: pz },
      r: 16,
      flavor:
        'An old stone beacon rises above the ridge. Its crown is cold — a well-aimed arrow might wake the signal fire once more.',
    },
  ];

  // ── Update (kept lean) ──────────────────────────────────────────
  function update(dt, elapsed, weatherInfo = {}) {
    latestWeather = weatherInfo || latestWeather;
    const isRaining =
      !!latestWeather.isRaining || (latestWeather.rainAmount || 0) > 0.5;
    const rainAmt = latestWeather.rainAmount || 0;

    // Base braziers — uniform scale flicker only
    const baseBoost = burning && fadeOut < 0.5 ? 1.2 : 1.0;
    for (let i = 0; i < baseBraziers.length; i++) {
      const bb = baseBraziers[i];
      flickerSimple(bb.flame, bb.light, elapsed, i * 2.1, 0.7 * baseBoost);
    }

    if (burning) {
      if (isRaining) {
        rainTimer += dt;
        if (rainTimer >= RAIN_EXTINGUISH_SECS && fadeOut <= 0) {
          fadeOut = 0.001;
          onEvent('towerExtinguished', {});
        }
      } else {
        rainTimer = 0;
      }

      if (fadeOut > 0) {
        fadeOut += dt / FADE_DURATION;
        if (fadeOut >= 1) {
          burning = false;
          fadeOut = 0;
          rainTimer = 0;
          beacon.group.visible = false;
          particles.visible = false;
          beacon.light.intensity = 0;
          smoulder.visible = true;
          setAimVisible(true);
        }
      }

      const fade = fadeOut > 0 ? Math.max(0, 1 - fadeOut) : 1;

      // Two-cone flame — single sine each, uniform scale
      const t = elapsed * 5.2;
      const sCore = (0.9 + 0.14 * Math.sin(t)) * fade;
      const sMid = (0.92 + 0.12 * Math.sin(t * 1.2 + 0.6)) * fade;

      beacon.core.scale.setScalar(sCore);
      beacon.mid.scale.setScalar(sMid);
      beacon.core.material.opacity = 0.88 * fade;
      beacon.mid.material.opacity = 0.65 * fade;
      beacon.light.intensity = (3.0 + 0.7 * Math.sin(t * 1.4)) * fade;

      if (isRaining && fadeOut <= 0) {
        const damp = 1 - Math.min(0.3, rainAmt * 0.35);
        beacon.light.intensity *= damp;
      }

      // Lightweight particles — simple rise + wrap, minimal trig
      const pos = particles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        pos[i3 + 1] += dt * (1.2 + (i & 3) * 0.2) * fade;
        // cheap sway without per-particle sin of elapsed
        pos[i3] += ((i & 1) ? 1 : -1) * dt * 0.15;
        if (pos[i3 + 1] > 4.5) {
          pos[i3] = (Math.random() - 0.5) * 0.7;
          pos[i3 + 1] = 0;
          pos[i3 + 2] = (Math.random() - 0.5) * 0.7;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
      particleMat.opacity = 0.45 * fade;
    } else {
      // Unlit: pulse aim tip + smoulder so the target stays readable
      const t = elapsed * 3.2;
      const s = 0.75 + 0.2 * Math.sin(t);
      smoulder.scale.setScalar(s);
      smoulder.material.opacity = 0.2 + 0.1 * Math.sin(t * 1.3);
      smoulderLight.intensity = 0.25 + 0.12 * Math.sin(t * 1.5);
      emberBed.material.emissiveIntensity = 0.35 + 0.15 * Math.sin(t * 0.9);
      coalMat.emissiveIntensity = 0.4 + 0.2 * Math.sin(t * 1.1);
      aimTip.scale.setScalar(0.9 + 0.15 * Math.sin(t * 2.0));
      aimRing.material.opacity = 0.4 + 0.2 * Math.sin(t * 1.6);
    }
  }

  return {
    update,
    poiList,
    position: { x: px, z: pz },
    get burning() {
      return burning && fadeOut <= 0;
    },
    group,
  };
}