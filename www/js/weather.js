export function createWeather(scene) {
  const mobile = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  // ---------- rain ----------
  const rainCount = mobile ? 720 : 1800;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(rainCount * 3);
  const rainSeed = new Float32Array(rainCount);
  const spread = 90;
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3]     = (Math.random() - 0.5) * spread;
    rainPos[i * 3 + 1] = Math.random() * 40;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    rainSeed[i] = Math.random();
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0xaacbe0, size: 0.16, transparent: true, opacity: 0, depthWrite: false, fog: false
  });
  const rainPoints = new THREE.Points(rainGeo, rainMat);
  scene.add(rainPoints);

  // ---------- lightning ----------
  const lightningGeo = new THREE.BufferGeometry();
  const lightningMat = new THREE.LineBasicMaterial({
    color: 0xe8f4ff, transparent: true, opacity: 0, depthWrite: false, fog: false
  });
  const lightningBolt = new THREE.LineSegments(lightningGeo, lightningMat);
  lightningBolt.renderOrder = 6;
  scene.add(lightningBolt);
  const lightningLight = new THREE.DirectionalLight(0xddeeff, 0);
  lightningLight.position.set(20, 55, 15);
  scene.add(lightningLight);

  // ---------- rainbow (7 nested half-arcs) ----------
  const rainbowGroup = new THREE.Group();
  const hues = [0, 0.09, 0.16, 0.33, 0.55, 0.72, 0.82];
  hues.forEach((h, i) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(h, 0.68, 0.66),
      transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
    });
    // A large, vertical half arc reads as a distant rainbow rather than a
    // ring on the terrain. Fog is intentionally enabled for a softer look.
     const arc = new THREE.Mesh(new THREE.TorusGeometry(100 - i * 1.8, 0.8, 5, mobile ? 32 : 56, Math.PI), mat);
    arc.userData.mat = mat;
    rainbowGroup.add(arc);
  });
  scene.add(rainbowGroup);

  let state = 'clear';     // 'clear' | 'rain'
  let stateTimer = 8 + Math.random() * 20;
  let rainAmt = 0;
  let rainbowT = 0;        // >0 while a rainbow is showing, counts down
  let justRained = false;
  let rainbowPlaced = false;
  const rainbowDirection = new THREE.Vector3();
  let lightningTimer = mobile ? 16 + Math.random() * 18 : 9 + Math.random() * 15;
  let lightningFlash = 0;
  let lightningCount = 0;
  let rainFrame = 0;

  function strikeLightning(playerPos) {
    const x = playerPos.x + (Math.random() - 0.5) * 100;
    const z = playerPos.z + (Math.random() - 0.5) * 100;
    const points = [];
    let px = x;
    let py = 62;
    let pz = z;
    for (let i = 0; i < 7; i++) {
      const nextX = px + (Math.random() - 0.5) * 7;
      const nextY = py - 7 - Math.random() * 4;
      const nextZ = pz + (Math.random() - 0.5) * 7;
      points.push(px, py, pz, nextX, nextY, nextZ);
      px = nextX;
      py = nextY;
      pz = nextZ;
    }
    lightningGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    lightningLight.position.set(x, 58, z);
    lightningFlash = 0.22;
    lightningCount++;
  }

  function update(dt, elapsed, playerPos, dayAmt, seasonName, camera) {
    const rainySeason = seasonName === 'spring' || seasonName === 'autumn';

    // ---- state machine ----
    stateTimer -= dt;
    if (stateTimer <= 0) {
      const rainChance = rainySeason ? 0.72 : 0.2;
      if (state === 'clear') {
        state = Math.random() < rainChance ? 'rain' : 'clear';
        stateTimer = state === 'rain'
          ? (rainySeason ? 28 + Math.random() * 35 : 16 + Math.random() * 22)
          : 15 + Math.random() * 30;
      } else {
        state = 'clear';
        stateTimer = 25 + Math.random() * 35;
        justRained = true;
      }
    }

    const target = state === 'rain' ? 1 : 0;
    rainAmt += (target - rainAmt) * Math.min(1, dt * 0.6);
    rainMat.opacity = rainAmt * 0.6;

    // A rainy season can build into an occasional storm. The bolt and broad
    // light flash make it visible even when the actual zig-zag is behind fog.
    if (state === 'rain' && rainAmt > 0.65 && rainySeason) {
      lightningTimer -= dt;
      if (lightningTimer <= 0) {
        strikeLightning(playerPos);
         lightningTimer = mobile ? 16 + Math.random() * 24 : 9 + Math.random() * 19;
      }
    } else {
      lightningTimer = Math.max(lightningTimer, 4);
    }
    lightningFlash = Math.max(0, lightningFlash - dt);
    lightningMat.opacity = lightningFlash > 0 ? Math.min(1, lightningFlash * 5) : 0;
    lightningLight.intensity = lightningFlash > 0 ? lightningFlash * 18 : 0;

    const weatherText = document.getElementById('weatherText');
    if (weatherText && rainAmt > 0.12) {
      weatherText.textContent = lightningFlash > 0 ? '⛈ Thunderstorm' : rainySeason ? '🌧 Rainy Season' : '🌦 Rain Shower';
    }

    // follow player, animate fall
    rainPoints.position.x = playerPos.x;
    rainPoints.position.z = playerPos.z;
    // Rain is spatially attached to the player, so updating it at 30Hz on
    // touch devices is visually equivalent while halving buffer writes.
    if (rainAmt > 0.02 && (!mobile || !(++rainFrame & 1))) {
      for (let i = 0; i < rainCount; i++) {
        const iy = i * 3 + 1;
        rainPos[iy] -= dt * (22 + rainSeed[i] * 6);
        if (rainPos[iy] < -2) rainPos[iy] = 38 + Math.random() * 6;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    // fog thickens with rain
    if (scene.fog) {
      const baseNear = 55, baseFar = 280;
      scene.fog.near = THREE.MathUtils.lerp(baseNear, 22, rainAmt);
      scene.fog.far = THREE.MathUtils.lerp(baseFar, 130, rainAmt);
    }

    // ---- rainbow ----
    if (justRained && rainAmt < 0.05 && dayAmt > 0.55) {
      rainbowT = 42;
      justRained = false;
      rainbowPlaced = false;
    }
    if (rainbowT > 0) {
      rainbowT -= dt;
      if (!rainbowPlaced) {
        if (camera) {
          camera.getWorldDirection(rainbowDirection);
          rainbowDirection.y = 0;
          if (rainbowDirection.lengthSq() < 0.001) rainbowDirection.set(0, 0, -1);
          else rainbowDirection.normalize();
        } else {
          rainbowDirection.set(0, 0, -1);
        }

        // 120 units away with a 100-unit radius puts the crest near 40° up:
        // large and easy to notice, but still comfortably inside the camera's
        // normal upward viewing range.
        rainbowGroup.position.set(
          playerPos.x + rainbowDirection.x * 120,
          playerPos.y - 3,
          playerPos.z + rainbowDirection.z * 120
        );
        rainbowGroup.rotation.y = Math.atan2(-rainbowDirection.x, -rainbowDirection.z);
        rainbowPlaced = true;
      }
      const fadeT = rainbowT > 36 ? (42 - rainbowT) / 6 : Math.min(1, rainbowT / 6);
      rainbowGroup.children.forEach(arc => { arc.userData.mat.opacity = fadeT * 0.34; });
    } else {
      rainbowGroup.children.forEach(arc => { arc.userData.mat.opacity = 0; });
    }
  }

  return {
    update,
    get isRaining() { return rainAmt > 0.3; },
    get rainAmount() { return rainAmt; },
    get lightningCount() { return lightningCount; }
  };
}
