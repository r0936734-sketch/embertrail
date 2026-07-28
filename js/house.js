export function createHouse(scene, terrainHeight, collision, options = {}) {
  const position = options.position || { x: 21, z: 12 };
  const rotationY = options.rotationY ?? Math.PI * 0.12;
  const enterRadius = options.enterRadius ?? 4.5;
  const staminaPerSecond = options.staminaPerSecond ?? 26;
  const scale = options.scale ?? 1.7;
  const baseY = terrainHeight(position.x, position.z);

  // ---------- exterior cabin ----------
  const group = new THREE.Group();
  group.position.set(position.x, baseY, position.z);
  group.scale.setScalar(scale);
  group.rotation.y = rotationY;
  scene.add(group);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1, flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x4a3527, roughness: 1, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5b3a2e, roughness: 1, flatShading: true });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2e2018, roughness: 1, flatShading: true });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffcf87, emissive: 0xffa95b, emissiveIntensity: 0.55, roughness: 0.6, flatShading: true
  });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b6259, roughness: 1, flatShading: true });

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 3.6), wallMat);
  body.position.y = 1.3;
  group.add(body);
  [[-2.2, -1.8], [2.2, -1.8], [-2.2, 1.8], [2.2, 1.8]].forEach(([x, z]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.22), trimMat);
    post.position.set(x, 1.3, z);
    group.add(post);
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.1, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.65;
  group.add(roof);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.45, 0, 1.86);
  group.add(doorPivot);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.12), doorMat);
  door.position.set(0.45, 0.85, 0);
  doorPivot.add(door);

  [[-1.35, 1.4, 1.86], [1.35, 1.4, 1.86], [2.26, 1.4, 0]].forEach(([x, y, z], index) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), windowMat);
    window.position.set(x, y, z);
    if (index === 2) window.rotation.y = Math.PI / 2;
    group.add(window);
  });
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.6, 0.55), stoneMat);
  chimney.position.set(-1.1, 4, -0.4);
  group.add(chimney);
  const porchLight = new THREE.PointLight(0xffb15a, 0.9, 9, 2);
  porchLight.position.set(0, 1.6, 2.3);
  group.add(porchLight);

  // ropeway anchor post — the far end of the mountain ropeway
  const zipPoleMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1, flatShading: true });
  const zipPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 5.4, 6), zipPoleMat);
  zipPole.position.set(position.x + 3.4, baseY + 2.7, position.z - 3.0);
  scene.add(zipPole);
  const ziplineAnchor = { x: position.x + 3.4, y: baseY + 5.3, z: position.z - 3.0 };

  // ---------- separate, fully enclosed interior ----------
  const interior = new THREE.Group();
  const interiorPos = { x: position.x + 900, z: position.z + 900 };
  const interiorFloorY = terrainHeight(interiorPos.x, interiorPos.z) + 0.1;
  interior.position.set(interiorPos.x, interiorFloorY, interiorPos.z);
  scene.add(interior);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3b281c, roughness: 0.95, flatShading: true });
  const innerWallMat = new THREE.MeshStandardMaterial({ color: 0x6b4730, roughness: 1, flatShading: true });
  const beddingMat = new THREE.MeshStandardMaterial({ color: 0x6d8590, roughness: 0.9, flatShading: true });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x9c5541, roughness: 0.9, flatShading: true });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });
  const addBox = (size, pos, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...pos);
    interior.add(mesh);
    return mesh;
  };

  addBox([8, 0.18, 6], [0, 0, 0], floorMat);
  addBox([8, 4.5, 0.2], [0, 2.25, -3], innerWallMat);
  addBox([0.2, 4.5, 6], [-4, 2.25, 0], innerWallMat);
  addBox([0.2, 4.5, 6], [4, 2.25, 0], innerWallMat);
  addBox([8, 0.2, 6], [0, 4.5, 0], floorMat);

  addBox([2.65, 0.35, 1.85], [-2.15, 0.42, -1.55], trimMat);    // bed frame
  addBox([2.45, 0.28, 1.65], [-2.15, 0.72, -1.55], beddingMat); // mattress
  addBox([1.45, 0.12, 1.62], [-1.75, 0.92, -1.55], blanketMat); // blanket
  addBox([0.6, 0.16, 1.35], [-3.05, 0.94, -1.55], windowMat);
  addBox([0.85, 0.8, 0.75], [1.8, 0.48, -1.75], trimMat);       // side table
  addBox([2.8, 0.03, 1.8], [0.4, 0.12, 0.7], blanketMat);       // rug

  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.42, 8), stoneMat);
  lampBase.position.set(1.8, 1.08, -1.75);
  interior.add(lampBase);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.42, 8, 1, true), glowMat);
  lampShade.position.set(1.8, 1.47, -1.75);
  interior.add(lampShade);
  const lampLight = new THREE.PointLight(0xffbd67, 2.3, 12, 2);
  lampLight.position.set(1.8, 1.55, -1.75);
  interior.add(lampLight);

  // stove / hearth with a cooking pot + steam
  const hearthFlame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 7), glowMat);
  hearthFlame.position.set(2.8, 0.5, -2.72);
  interior.add(hearthFlame);
  const hearthLight = new THREE.PointLight(0xff9445, 1.5, 8, 2);
  hearthLight.position.set(2.8, 0.7, -2.55);
  interior.add(hearthLight);
  const potMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.6, metalness: 0.4 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.28, 10), potMat);
  pot.position.set(2.8, 0.55, -2.55);
  interior.add(pot);

  const STEAM_COUNT = 18;
  const steamGeo = new THREE.BufferGeometry();
  const steamPos = new Float32Array(STEAM_COUNT * 3);
  const steamSeed = new Float32Array(STEAM_COUNT);
  for (let i = 0; i < STEAM_COUNT; i++) {
    steamPos[i * 3] = 2.8 + (Math.random() - 0.5) * 0.2;
    steamPos[i * 3 + 1] = 0.7 + Math.random() * 0.6;
    steamPos[i * 3 + 2] = -2.55 + (Math.random() - 0.5) * 0.2;
    steamSeed[i] = Math.random() * 10;
  }
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  const steamMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.5, depthWrite: false });
  interior.add(new THREE.Points(steamGeo, steamMat));

  // study table, chair, and a book to read
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x5a3d26, roughness: 1, flatShading: true });
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.75), tableMat);
  tableTop.position.set(-1.7, 0.62, 1.7);
  interior.add(tableTop);
  [[-0.55, -0.28], [0.55, -0.28], [-0.55, 0.28], [0.55, 0.28]].forEach(([ox, oz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), tableMat);
    leg.position.set(-1.7 + ox, 0.31, 1.7 + oz);
    interior.add(leg);
  });
  const bookMat = new THREE.MeshStandardMaterial({ color: 0x7a2e2e, roughness: 0.85, flatShading: true });
  const bookMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.24), bookMat);
  bookMesh.position.set(-1.7, 0.69, 1.7);
  bookMesh.rotation.y = 0.35;
  interior.add(bookMesh);
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), tableMat);
  chairSeat.position.set(-1.7, 0.4, 1.15);
  interior.add(chairSeat);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.08), tableMat);
  chairBack.position.set(-1.7, 0.68, 0.92);
  interior.add(chairBack);

  // ---------- interactive hotspots (world-space) ----------
  const bedPos    = { x: interiorPos.x - 2.15, z: interiorPos.z - 1.55, r: 1.5 };
  const lampPos   = { x: interiorPos.x + 1.8,  z: interiorPos.z - 1.75, r: 1.1 };
  const hearthPos = { x: interiorPos.x + 2.8,  z: interiorPos.z - 2.6,  r: 1.3 };
  const bookPos   = { x: interiorPos.x - 1.7,  z: interiorPos.z + 1.7,  r: 1.2 };

  if (collision) {
    collision.addCollider(position.x, position.z, 3.1 * (scale / 1.7));
    collision.addBox(interiorPos.x, interiorPos.z - 3, 4, 0.15);
    collision.addBox(interiorPos.x - 4, interiorPos.z, 0.15, 3);
    collision.addBox(interiorPos.x + 4, interiorPos.z, 0.15, 3);
  }

  // ---------- interaction UI ----------
  const promptEl = document.createElement('div');
  Object.assign(promptEl.style, {
    position: 'fixed', left: '50%', bottom: '14%', transform: 'translateX(-50%)', padding: '10px 18px',
    background: 'rgba(20,16,12,0.72)', color: '#f3ead9', fontFamily: 'inherit', fontSize: '15px',
    borderRadius: '10px', border: '1px solid rgba(255,255,255,0.18)', opacity: '0',
    transition: 'opacity 0.25s ease', pointerEvents: 'none', zIndex: '50'
  });
  document.body.appendChild(promptEl);

  const interiorLabel = document.createElement('div');
  interiorLabel.textContent = 'Inside the cabin';
  Object.assign(interiorLabel.style, {
    position: 'fixed', left: '50%', top: '10%', transform: 'translateX(-50%)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '18px', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: '0',
    transition: 'opacity 0.4s ease', textShadow: '0 2px 10px rgba(0,0,0,0.6)', pointerEvents: 'none', zIndex: '41'
  });
  document.body.appendChild(interiorLabel);

  const toastEl = document.createElement('div');
  Object.assign(toastEl.style, {
    position: 'fixed', left: '50%', top: '18%', transform: 'translateX(-50%)',
    padding: '8px 16px', background: 'rgba(40,30,20,0.88)', color: '#f3ead9', fontFamily: 'inherit',
    fontSize: '14px', borderRadius: '9px', border: '1px solid rgba(255,220,100,0.35)',
    opacity: '0', transition: 'opacity 0.3s', pointerEvents: 'none', zIndex: '60'
  });
  document.body.appendChild(toastEl);
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, 3000);
  }

  const fadeEl = document.createElement('div');
  Object.assign(fadeEl.style, {
    position: 'fixed', inset: '0', background: '#000', opacity: '0',
    transition: 'opacity 0.9s ease', pointerEvents: 'none', zIndex: '90'
  });
  document.body.appendChild(fadeEl);

  const bookLines = [
    "The pages describe an old trail south of the ridge, half-erased by water damage.",
    "A pressed wildflower marks a page about the valley's first snowfall.",
    'Someone has scrawled a note in the margin: "the deer come back every spring."',
    'A hand-drawn map shows a crossing near the gorge, marked with a small star.'
  ];

  let inside = false;
  let inRange = false;
  let sleeping = false;
  let lampOn = true;
  let onSleepCallback = null;

  function dist(px, pz, ox, oz) { return Math.hypot(px - ox, pz - oz); }
  function isInRange(player) {
    const p = player.position;
    return Math.hypot(p.x - position.x, p.z - position.z) < enterRadius;
  }

  function toggleLamp() {
    lampOn = !lampOn;
    lampLight.intensity = lampOn ? 2.15 : 0;
    lampShade.material.color.set(lampOn ? 0xffd27d : 0x554530);
    showToast(lampOn ? 'The lamp flickers to life.' : 'You dim the lamp.');
  }

  function startSleep(player) {
    if (sleeping) return;
    sleeping = true;
    showToast('You lie down to rest…');
    fadeEl.style.opacity = '1';
    setTimeout(() => {
      if (onSleepCallback) onSleepCallback();
      player.restoreStamina(1000);
      setTimeout(() => {
        fadeEl.style.opacity = '0';
        sleeping = false;
      }, 700);
    }, 950);
  }

  function tryInteract(player) {
    if (sleeping) return true;

    if (inside) {
      const p = player.position;
      if (dist(p.x, p.z, bedPos.x, bedPos.z) < bedPos.r) { startSleep(player); return true; }
      if (dist(p.x, p.z, hearthPos.x, hearthPos.z) < hearthPos.r) { showToast('The stew simmers — smells almost ready.'); return true; }
      if (dist(p.x, p.z, bookPos.x, bookPos.z) < bookPos.r) { showToast(bookLines[Math.floor(Math.random() * bookLines.length)]); return true; }
      if (dist(p.x, p.z, lampPos.x, lampPos.z) < lampPos.r) { toggleLamp(); return true; }

      // leave the cabin
      player.setGroundHeightFn(null);
      player.teleportWalker(
        position.x + Math.cos(rotationY + Math.PI / 2) * 3.2,
        terrainHeight(position.x, position.z),
        position.z + Math.sin(rotationY + Math.PI / 2) * 3.2,
        rotationY
      );
      inside = false;
      return true;
    }

    if (!isInRange(player) || player.mounted) return false;
    player.teleportWalker(interiorPos.x, interiorFloorY, interiorPos.z + 2.3, Math.PI);
    player.setGroundHeightFn(() => interiorFloorY);
    inside = true;
    return true;
  }

  function update(dt, elapsed, player) {
    inRange = isInRange(player);
    doorPivot.rotation.y += ((inside ? -1.3 : 0) - doorPivot.rotation.y) * Math.min(1, dt * 6);
    porchLight.intensity = 0.82 + Math.sin(elapsed * 4.5) * 0.08;

    const flicker = 0.9 + Math.sin(elapsed * 8) * 0.08 + Math.sin(elapsed * 17 + 1) * 0.05;
    hearthFlame.scale.set(flicker, flicker * 1.08, flicker);
    hearthLight.intensity = 1.4 + Math.sin(elapsed * 8) * 0.15;
    if (lampOn) lampLight.intensity = 2.15 + Math.sin(elapsed * 2.1) * 0.08;

    for (let i = 0; i < STEAM_COUNT; i++) {
      steamPos[i * 3 + 1] += dt * 0.35;
      steamPos[i * 3] += Math.sin(elapsed * 0.6 + steamSeed[i]) * 0.05 * dt;
      if (steamPos[i * 3 + 1] > 1.5) {
        steamPos[i * 3 + 1] = 0.7;
        steamPos[i * 3] = 2.8 + (Math.random() - 0.5) * 0.2;
        steamPos[i * 3 + 2] = -2.55 + (Math.random() - 0.5) * 0.2;
      }
    }
    steamGeo.attributes.position.needsUpdate = true;

    if (!inside) {
      promptEl.textContent = player.mounted
        ? 'Press E to dismount, then enter the cabin'
        : 'Press E to open the door and enter';
      promptEl.style.opacity = inRange && !sleeping ? '1' : '0';
      interiorLabel.style.opacity = '0';
      return;
    }

    interiorLabel.style.opacity = sleeping ? '0' : '1';
    if (!sleeping) player.restoreStamina(dt * staminaPerSecond * 0.4);

    const p = player.position;
    if (dist(p.x, p.z, bedPos.x, bedPos.z) < bedPos.r) promptEl.textContent = 'Press E to sleep';
    else if (dist(p.x, p.z, hearthPos.x, hearthPos.z) < hearthPos.r) promptEl.textContent = 'Press E to check the stew';
    else if (dist(p.x, p.z, bookPos.x, bookPos.z) < bookPos.r) promptEl.textContent = 'Press E to read';
    else if (dist(p.x, p.z, lampPos.x, lampPos.z) < lampPos.r) promptEl.textContent = `Press E to ${lampOn ? 'dim' : 'light'} the lamp`;
    else promptEl.textContent = 'Press E to leave the cabin';
    promptEl.style.opacity = sleeping ? '0' : '1';
  }

  return {
    group,
    position,
    ziplineAnchor,
    restRadius: enterRadius,
    update,
    tryInteract,
    setSleepCallback(fn) { onSleepCallback = fn; },
    get resting() { return inside; },
    get sleeping() { return sleeping; }
  };
}