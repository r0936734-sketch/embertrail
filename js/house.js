export function createHouse(scene, terrainHeight, options = {}) {
  const position = options.position || { x: 21, z: 12 };   // near "Cabins at Trail's End"
  const rotationY = options.rotationY ?? Math.PI * 0.12;
  const restRadius = options.restRadius ?? 4.5;
  const restKeyCode = options.restKey || 'KeyE';
  const staminaPerSecond = options.staminaPerSecond ?? 26;

  const baseY = terrainHeight(position.x, position.z);
  const group = new THREE.Group();
  group.position.set(position.x, baseY, position.z);
  const houseScale = options.scale ?? 1.7;
  group.scale.set(houseScale, houseScale, houseScale);
  group.rotation.y = rotationY;
  scene.add(group);

  // ---------------- structure ----------------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1, flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x4a3527, roughness: 1, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5b3a2e, roughness: 1, flatShading: true });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2e2018, roughness: 1, flatShading: true });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffcf87, roughness: 0.6, flatShading: true,
    emissive: 0xffb15a, emissiveIntensity: 0.55
  });
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x6b6259, roughness: 1, flatShading: true });

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 3.6), wallMat);
  body.position.y = 1.3;
  group.add(body);

  // corner posts for a cabin-log look
  [[-2.2, -1.8], [2.2, -1.8], [-2.2, 1.8], [2.2, 1.8]].forEach(([x, z]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.22), trimMat);
    post.position.set(x, 1.3, z);
    group.add(post);
  });

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.1, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.6 + 1.05;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.12), doorMat);
  door.position.set(0, 0.85, 1.86);
  group.add(door);

  [[-1.35, 1.4, 1.86], [1.35, 1.4, 1.86], [2.26, 1.4, 0]].forEach(([x, y, z], i) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), windowMat);
    win.position.set(x, y, z);
    if (i === 2) win.rotation.y = Math.PI / 2;
    group.add(win);
  });

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.6, 0.55), chimneyMat);
  chimney.position.set(-1.1, 2.6 + 1.4, -0.4);
  group.add(chimney);

  // warm porch light so the cabin reads as "lived in" after dusk
  const porchLight = new THREE.PointLight(0xffb15a, 0.9, 9, 2);
  porchLight.position.set(0, 1.6, 2.3);
  group.add(porchLight);

  // ---------------- chimney smoke ----------------
  const smokeCount = 140;
  const smokeGeo = new THREE.BufferGeometry();
  const smokePos = new Float32Array(smokeCount * 3);
  const smokeCol = new Float32Array(smokeCount * 3);
  const smokeSeed = new Float32Array(smokeCount);
  const smokeAge = new Float32Array(smokeCount);
  const grayPalette = [0xcfcac2, 0xb9b3a9, 0xa39c90];
  const _tmpC = new THREE.Color();

  const chimneyWorld = new THREE.Vector3();
  chimney.getWorldPosition(chimneyWorld);
  const chimneyTop = chimneyWorld.y + 0.85;

  function resetSmokeParticle(i, staggered) {
    smokePos[i * 3]     = chimneyWorld.x + (Math.random() - 0.5) * 0.15;
    smokePos[i * 3 + 1] = chimneyTop + (staggered ? Math.random() * 3.5 : 0);
    smokePos[i * 3 + 2] = chimneyWorld.z + (Math.random() - 0.5) * 0.15;
    smokeSeed[i] = Math.random() * Math.PI * 2;
    smokeAge[i] = 0;
    _tmpC.set(grayPalette[Math.floor(Math.random() * grayPalette.length)]);
    smokeCol[i * 3] = _tmpC.r; smokeCol[i * 3 + 1] = _tmpC.g; smokeCol[i * 3 + 2] = _tmpC.b;
  }
  for (let i = 0; i < smokeCount; i++) resetSmokeParticle(i, true);

  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  smokeGeo.setAttribute('color', new THREE.BufferAttribute(smokeCol, 3));
  const smokeMat = new THREE.PointsMaterial({
    size: 0.34, transparent: true, opacity: 0.5, depthWrite: false, vertexColors: true
  });
  const smokePoints = new THREE.Points(smokeGeo, smokeMat);
  scene.add(smokePoints);

  const riseSpeed = 0.85;
  const maxAge = 4.2; // seconds of life before recycling

  function updateSmoke(dt, t) {
    for (let i = 0; i < smokeCount; i++) {
      smokeAge[i] += dt;
      const iy = i * 3 + 1, ix = i * 3, iz = i * 3 + 2;
      smokePos[iy] += dt * riseSpeed * (0.6 + smokeAge[i] * 0.25);
      smokePos[ix] += Math.sin(t * 0.5 + smokeSeed[i]) * 0.18 * dt + 0.05 * dt;
      smokePos[iz] += Math.cos(t * 0.4 + smokeSeed[i]) * 0.18 * dt;
      if (smokeAge[i] > maxAge) resetSmokeParticle(i, false);
    }
    smokeGeo.attributes.position.needsUpdate = true;
    // gently fade the whole puff in/out with a slow breathing rhythm so it
    // doesn't look mechanically identical every loop
    smokeMat.opacity = 0.42 + Math.sin(t * 0.6) * 0.06;
  }

  // ---------------- rest prompt + overlay UI (self-contained, no HTML edits needed) ----------------
  let promptEl = document.getElementById('houseRestPrompt');
  if (!promptEl) {
    promptEl = document.createElement('div');
    promptEl.id = 'houseRestPrompt';
    Object.assign(promptEl.style, {
      position: 'fixed', left: '50%', bottom: '14%', transform: 'translateX(-50%)',
      padding: '10px 18px', background: 'rgba(20,16,12,0.72)', color: '#f3ead9',
      fontFamily: 'inherit', fontSize: '15px', borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.18)', letterSpacing: '0.02em',
      opacity: '0', transition: 'opacity 0.25s ease', pointerEvents: 'none', zIndex: 50
    });
    document.body.appendChild(promptEl);
  }

  let overlayEl = document.getElementById('houseRestOverlay');
  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.id = 'houseRestOverlay';
    Object.assign(overlayEl.style, {
      position: 'fixed', inset: '0',
      background: 'radial-gradient(ellipse at center, rgba(20,14,8,0.15) 0%, rgba(10,7,4,0.72) 100%)',
      opacity: '0', transition: 'opacity 0.6s ease', pointerEvents: 'none', zIndex: 40
    });
    document.body.appendChild(overlayEl);
  }

  let restLabelEl = document.getElementById('houseRestLabel');
  if (!restLabelEl) {
    restLabelEl = document.createElement('div');
    restLabelEl.id = 'houseRestLabel';
    Object.assign(restLabelEl.style, {
      position: 'fixed', left: '50%', top: '10%', transform: 'translateX(-50%)',
      color: '#f3ead9', fontFamily: 'inherit', fontSize: '18px', letterSpacing: '0.08em',
      textTransform: 'uppercase', opacity: '0', transition: 'opacity 0.6s ease',
      textShadow: '0 2px 10px rgba(0,0,0,0.6)', pointerEvents: 'none', zIndex: 41
    });
    restLabelEl.textContent = 'Resting by the fire…';
    document.body.appendChild(restLabelEl);
  }

  let resting = false;
  let inRange = false;
  let savedVisible = true;

  function setResting(value) {
    resting = value;
    overlayEl.style.opacity = resting ? '1' : '0';
    restLabelEl.style.opacity = resting ? '1' : '0';
    promptEl.style.opacity = resting ? '0' : (inRange ? '1' : '0');
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== restKeyCode) return;
    if (!resting && !inRange) return;
    setResting(!resting);
  });

  function update(dt, t, player) {
    updateSmoke(dt, t);

    const dx = player.group.position.x - (position.x);
    const dz = player.group.position.z - (position.z);
    const dist = Math.sqrt(dx * dx + dz * dz);
    inRange = dist < restRadius;

    if (!resting) {
      promptEl.textContent = 'Press E to rest inside';
      promptEl.style.opacity = inRange ? '1' : '0';
      if (!savedVisible === false) savedVisible = player.group.visible !== false;
    } else {
      // player is "inside" — hide them, hold them in place, restore stamina
      if (player.group.visible !== false) {
        savedVisible = true;
        player.group.visible = false;
      }
      if (typeof player.stamina === 'number') {
        player.stamina = Math.min(100, player.stamina + dt * staminaPerSecond);
      }
      if (typeof player.speed === 'number') player.speed = 0;
    }

    if (!resting && player.group.visible === false) {
      player.group.visible = true;
    }
  }

  return {
    group,
    position,
    restRadius,
    update,
    get resting() { return resting; },
    exitRest() { setResting(false); }
  };
}