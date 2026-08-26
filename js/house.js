export function createHouse(scene, terrainHeight, collision, renderer, options = {}) {
  // Preserve the former fourth-argument options form for any external callers.
  if (renderer && typeof renderer.render !== 'function') {
    options = renderer;
    renderer = null;
  }
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
  // Keep the cabin directly below its exterior so it remains inside the sky sphere.
  const interiorPos = { x: position.x, z: position.z };
  const interiorFloorY = terrainHeight(position.x, position.z) - 400;
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

  const ROOM_W = 16;
  const ROOM_D = 12;
  const WALL_H = 5.6;
  const ROOM_HALF_W = ROOM_W / 2;
  const ROOM_HALF_D = ROOM_D / 2;
  const frontZ = ROOM_HALF_D;

  addBox([ROOM_W, 0.18, ROOM_D], [0, 0, 0], floorMat);
  addBox([ROOM_W, WALL_H, 0.2], [0, WALL_H / 2, -ROOM_HALF_D], innerWallMat);
  addBox([0.2, WALL_H, ROOM_D], [-ROOM_HALF_W, WALL_H / 2, 0], innerWallMat);
  addBox([0.2, WALL_H, ROOM_D], [ROOM_HALF_W, WALL_H / 2, 0], innerWallMat);
  addBox([ROOM_W, 0.2, ROOM_D], [0, WALL_H, 0], floorMat);

  // The front wall is fully enclosed apart from a large, framed picture window.
  const WINDOW_W = 5.2;
  const WINDOW_BOTTOM = 0.82;
  const WINDOW_TOP = 4.38;
  const sideWidth = (ROOM_W - WINDOW_W) / 2;
  addBox([ROOM_W, WINDOW_BOTTOM, 0.2], [0, WINDOW_BOTTOM / 2, frontZ], innerWallMat);
  addBox([ROOM_W, WALL_H - WINDOW_TOP, 0.2], [0, (WALL_H + WINDOW_TOP) / 2, frontZ], innerWallMat);
  addBox([sideWidth, WINDOW_TOP - WINDOW_BOTTOM, 0.2], [-(WINDOW_W + sideWidth) / 2, (WINDOW_TOP + WINDOW_BOTTOM) / 2, frontZ], innerWallMat);
  addBox([sideWidth, WINDOW_TOP - WINDOW_BOTTOM, 0.2], [(WINDOW_W + sideWidth) / 2, (WINDOW_TOP + WINDOW_BOTTOM) / 2, frontZ], innerWallMat);

  const windowTarget = renderer ? new THREE.WebGLRenderTarget(768, 512) : null;
  const windowPane = new THREE.Mesh(
    new THREE.PlaneGeometry(WINDOW_W - 0.18, WINDOW_TOP - WINDOW_BOTTOM - 0.18),
    new THREE.MeshBasicMaterial({
      map: windowTarget ? windowTarget.texture : null,
      color: windowTarget ? 0xffffff : 0x7896b5,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false
    })
  );
  windowPane.position.set(0, (WINDOW_TOP + WINDOW_BOTTOM) / 2, frontZ - 0.12);
  interior.add(windowPane);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2e1d14, roughness: 0.95, flatShading: true });
  const addFrame = (size, pos) => addBox(size, pos, frameMat);
  addFrame([WINDOW_W + 0.16, 0.16, 0.18], [0, WINDOW_BOTTOM, frontZ - 0.13]);
  addFrame([WINDOW_W + 0.16, 0.16, 0.18], [0, WINDOW_TOP, frontZ - 0.13]);
  addFrame([0.16, WINDOW_TOP - WINDOW_BOTTOM + 0.16, 0.18], [-WINDOW_W / 2, (WINDOW_TOP + WINDOW_BOTTOM) / 2, frontZ - 0.13]);
  addFrame([0.16, WINDOW_TOP - WINDOW_BOTTOM + 0.16, 0.18], [WINDOW_W / 2, (WINDOW_TOP + WINDOW_BOTTOM) / 2, frontZ - 0.13]);
  addFrame([0.12, WINDOW_TOP - WINDOW_BOTTOM, 0.16], [0, (WINDOW_TOP + WINDOW_BOTTOM) / 2, frontZ - 0.14]);

  // Personal wall art: each supplied image is mounted in a simple wooden frame.
  const photoLoader = new THREE.TextureLoader();
  function addFramedPhoto(src, width, height, pos, rotationY = 0) {
    const frame = new THREE.Group();
    frame.position.set(...pos);
    frame.rotation.y = rotationY;
    const photoTexture = photoLoader.load(src);
    photoTexture.encoding = THREE.sRGBEncoding;
    const photo = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: photoTexture, side: THREE.DoubleSide, toneMapped: false })
    );
    photo.position.z = 0.045;
    frame.add(photo);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x29170f, roughness: 0.82, flatShading: true });
    const addBorder = (size, x, y) => {
      const border = new THREE.Mesh(new THREE.BoxGeometry(...size), borderMat);
      border.position.set(x, y, 0.02);
      frame.add(border);
    };
    addBorder([width + 0.24, 0.16, 0.13], 0, height / 2 + 0.02);
    addBorder([width + 0.24, 0.16, 0.13], 0, -height / 2 - 0.02);
    addBorder([0.16, height + 0.24, 0.13], -width / 2 - 0.02, 0);
    addBorder([0.16, height + 0.24, 0.13], width / 2 + 0.02, 0);
    interior.add(frame);
    return frame;
  }

  // The devotional picture faces into the room from the back wall.
  addFramedPhoto('download.jpg', 2.05, 2.65, [-4.65, 3.45, -ROOM_HALF_D + 0.13]);
  // The portrait is on the right-hand wall; no incense belongs beneath it.
  addFramedPhoto('me.jpg', 2.35, 2.35, [ROOM_HALF_W - 0.13, 3.35, 1.5], -Math.PI / 2);

  const incenseMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9, flatShading: true });
  const incenseGlowMat = new THREE.MeshBasicMaterial({ color: 0xff7d34, transparent: true, opacity: 0.9 });
  const incenseShelf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.13, 0.42), trimMat);
  incenseShelf.position.set(-4.65, 1.68, -ROOM_HALF_D + 0.35);
  interior.add(incenseShelf);
  const incenseHolder = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.19, 0.12, 12), incenseMat);
  incenseHolder.position.set(-4.65, 1.82, -ROOM_HALF_D + 0.22);
  interior.add(incenseHolder);
  const incenseTips = [];
  [-0.13, 0, 0.13].forEach((offset, index) => {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.72, 6), incenseMat);
    stick.position.set(-4.65 + offset, 2.18, -ROOM_HALF_D + 0.22);
    stick.rotation.z = (index - 1) * 0.13;
    interior.add(stick);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), incenseGlowMat.clone());
    tip.position.set(-4.65 + offset + (index - 1) * 0.045, 2.54, -ROOM_HALF_D + 0.22);
    interior.add(tip);
    incenseTips.push(tip);
  });
  const incenseLight = new THREE.PointLight(0xff8b42, 0.34, 3.5, 2);
  incenseLight.position.set(-4.65, 2.45, -ROOM_HALF_D + 0.5);
  interior.add(incenseLight);
  const INCENSE_SMOKE_COUNT = 16;
  const incenseSmokeGeo = new THREE.BufferGeometry();
  const incenseSmokePos = new Float32Array(INCENSE_SMOKE_COUNT * 3);
  const incenseSmokeSeed = new Float32Array(INCENSE_SMOKE_COUNT);
  for (let i = 0; i < INCENSE_SMOKE_COUNT; i++) {
    incenseSmokePos[i * 3] = -4.65 + (Math.random() - 0.5) * 0.15;
    incenseSmokePos[i * 3 + 1] = 2.55 + Math.random() * 1.2;
    incenseSmokePos[i * 3 + 2] = -ROOM_HALF_D + 0.24;
    incenseSmokeSeed[i] = Math.random() * Math.PI * 2;
  }
  incenseSmokeGeo.setAttribute('position', new THREE.BufferAttribute(incenseSmokePos, 3));
  const incenseSmoke = new THREE.Points(
    incenseSmokeGeo,
    new THREE.PointsMaterial({ color: 0xd8d2c8, size: 0.11, transparent: true, opacity: 0.45, depthWrite: false })
  );
  interior.add(incenseSmoke);

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

  // Compact gas kitchen: a live blue flame keeps the pot visibly boiling.
  const STOVE_X = 4.65;
  const STOVE_Z = -4.65;
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x6b4730, roughness: 0.9, flatShading: true });
  const stoveMat = new THREE.MeshStandardMaterial({ color: 0x1f2528, roughness: 0.55, metalness: 0.55, flatShading: true });
  const utensilMat = new THREE.MeshStandardMaterial({ color: 0xb7bdc2, roughness: 0.28, metalness: 0.82, flatShading: true });
  addBox([3.9, 1.35, 1.65], [STOVE_X, 0.68, STOVE_Z], counterMat);
  addBox([4.1, 0.14, 1.85], [STOVE_X, 1.42, STOVE_Z], trimMat);
  const gasStove = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.14, 1.2), stoveMat);
  gasStove.position.set(STOVE_X, 1.57, STOVE_Z);
  interior.add(gasStove);
  [-0.48, 0.48].forEach(offset => {
    const burner = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 6, 16), utensilMat);
    burner.rotation.x = Math.PI / 2;
    burner.position.set(STOVE_X + offset, 1.68, STOVE_Z);
    interior.add(burner);
  });
  const hearthFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.5, 7),
    new THREE.MeshBasicMaterial({ color: 0x4fa8ff, transparent: true, opacity: 0.82 })
  );
  hearthFlame.position.set(STOVE_X + 0.48, 1.88, STOVE_Z);
  interior.add(hearthFlame);
  const hearthLight = new THREE.PointLight(0x77b8ff, 1.05, 6, 2);
  hearthLight.position.set(STOVE_X + 0.48, 1.9, STOVE_Z);
  interior.add(hearthLight);
  const potMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.6, metalness: 0.4 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.46, 0.58, 14), potMat);
  pot.position.set(STOVE_X + 0.48, 2.08, STOVE_Z);
  interior.add(pot);
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0xd58a3f }));
  soup.rotation.x = -Math.PI / 2;
  soup.position.set(STOVE_X + 0.48, 2.38, STOVE_Z);
  interior.add(soup);
  const potHandle = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.045, 6, 14, Math.PI), potMat);
  potHandle.rotation.y = Math.PI / 2;
  potHandle.position.set(STOVE_X + 0.48, 2.1, STOVE_Z);
  interior.add(potHandle);
  const boilingBubbles = [];
  for (let i = 0; i < 7; i++) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.045 + Math.random() * 0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.85 }));
    bubble.userData.phase = Math.random() * Math.PI * 2;
    bubble.position.set(STOVE_X + 0.48 + (Math.random() - 0.5) * 0.55, 2.405, STOVE_Z + (Math.random() - 0.5) * 0.55);
    interior.add(bubble);
    boilingBubbles.push(bubble);
  }

  // Plates, bowls, a pan, and loose cooking tools make the kitchen usable.
  [0, 0.07, 0.14].forEach(y => {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.045, 16), new THREE.MeshStandardMaterial({ color: 0xe5d9c4, roughness: 0.5 }));
    plate.position.set(STOVE_X - 1.45, 1.58 + y, STOVE_Z + 0.34);
    interior.add(plate);
  });
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.2, 12, 1, true), utensilMat);
  bowl.position.set(STOVE_X - 1.22, 1.72, STOVE_Z - 0.38);
  interior.add(bowl);
  [[-0.9, -0.55, 0.32], [-0.65, -0.5, -0.25], [-0.34, -0.55, 0.14]].forEach(([ox, oz, rot]) => {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), utensilMat);
    handle.rotation.z = Math.PI / 2;
    handle.rotation.y = rot;
    handle.position.set(STOVE_X + ox, 1.72, STOVE_Z + oz);
    interior.add(handle);
    const spoon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), utensilMat);
    spoon.scale.set(0.75, 0.3, 1);
    spoon.position.set(STOVE_X + ox + 0.34, 1.72, STOVE_Z + oz);
    interior.add(spoon);
  });
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.31, 0.1, 14), stoveMat);
  pan.position.set(STOVE_X - 0.48, 1.77, STOVE_Z);
  interior.add(pan);
  const panHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.72, 8), stoveMat);
  panHandle.rotation.z = Math.PI / 2;
  panHandle.position.set(STOVE_X - 0.02, 1.77, STOVE_Z);
  interior.add(panHandle);

  const STEAM_COUNT = 18;
  const steamGeo = new THREE.BufferGeometry();
  const steamPos = new Float32Array(STEAM_COUNT * 3);
  const steamSeed = new Float32Array(STEAM_COUNT);
  for (let i = 0; i < STEAM_COUNT; i++) {
    steamPos[i * 3] = STOVE_X + 0.48 + (Math.random() - 0.5) * 0.35;
    steamPos[i * 3 + 1] = 2.45 + Math.random() * 0.7;
    steamPos[i * 3 + 2] = STOVE_Z + (Math.random() - 0.5) * 0.35;
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
  const hearthPos = { x: interiorPos.x + STOVE_X, z: interiorPos.z + STOVE_Z, r: 2.3 };
  const bookPos   = { x: interiorPos.x - 1.7,  z: interiorPos.z + 1.7,  r: 1.2 };

  let exteriorCollider;
  const interiorColliders = [];
  if (collision) {
    exteriorCollider = collision.addCollider(position.x, position.z, 3.1 * (scale / 1.7));
    interiorColliders.push(
      collision.addBox(interiorPos.x, interiorPos.z - ROOM_HALF_D, ROOM_HALF_W, 0.15),
      collision.addBox(interiorPos.x, interiorPos.z + ROOM_HALF_D, ROOM_HALF_W, 0.15),
      collision.addBox(interiorPos.x - ROOM_HALF_W, interiorPos.z, 0.15, ROOM_HALF_D),
      collision.addBox(interiorPos.x + ROOM_HALF_W, interiorPos.z, 0.15, ROOM_HALF_D),
      // Furnishings: the player must walk around these rather than through them.
      collision.addBox(interiorPos.x - 2.15, interiorPos.z - 1.55, 1.48, 1.08),
      collision.addBox(interiorPos.x + 1.8, interiorPos.z - 1.75, 0.58, 0.52),
      collision.addBox(interiorPos.x - 1.7, interiorPos.z + 1.7, 0.82, 0.6),
      collision.addBox(interiorPos.x + STOVE_X, interiorPos.z + STOVE_Z, 2.12, 0.98)
    );
    interiorColliders.forEach(collider => { collider.enabled = false; });
  }

  function setInteriorCollision(active) {
    if (exteriorCollider) exteriorCollider.enabled = !active;
    interiorColliders.forEach(collider => { collider.enabled = active; });
  }

  // ---------- interaction UI ----------
  const promptEl = document.createElement('div');
  Object.assign(promptEl.style, {
    position: 'fixed', left: '50%', bottom: '14%', transform: 'translateX(-50%)', padding: '10px 18px',
    background: 'rgba(20,16,12,0.72)', color: '#f3ead9', fontFamily: 'inherit', fontSize: '15px',
    borderRadius: '10px', border: '1px solid rgba(255,255,255,0.18)', opacity: '0',
    transition: 'opacity 0.25s ease', pointerEvents: 'none', zIndex: '50'
  });
  promptEl.classList.add('context-prompt');
  promptEl.dataset.mobileKey = 'e';
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
    transition: 'opacity 0.35s ease', pointerEvents: 'none', zIndex: '90'
  });
  document.body.appendChild(fadeEl);

  const bookLines = [
  "The ink whispers: 'Every trail remembers the footsteps that forget it.'",
  "A faded sketch of a mountain bears the words: 'The summit is never conquered—only borrowed.'",
  "Pressed between the pages lies a crimson maple leaf that has somehow never withered.",
  "Someone wrote in trembling handwriting: 'The forest does not hide secrets. It waits for those who stop searching.'",

  "धर्मो रक्षति रक्षितः — 'Dharma protects those who protect it.'",
  "यतो धर्मस्ततो जयः — 'Where there is Dharma, there is victory.'",
  "The margin reads: 'Power without compassion becomes another form of darkness.'",
  "A page is stained with ash. Beneath it: 'Even fire bows before time.'",

  "The old monk wrote: 'The river never argues with the stone. It simply continues flowing.'",
  "One page is completely blank except for a single sentence: 'Silence is also an answer.'",
  "A charcoal drawing of a deer is captioned: 'Only the patient witness miracles.'",
  "The parchment smells faintly of cedar and rain.",

  "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन — 'Your duty is to act, never to cling to the reward.'",
  "The next line has been scratched out, as if someone wished the truth forgotten.",
  "A note says: 'Fear walks faster than wisdom, but never farther.'",
  "The paper feels strangely warm, though the air is cold.",

  "वसुधैव कुटुम्बकम् — 'The whole world is one family.'",
  "Someone added below: 'The trees knew this long before humans did.'",
  "The map ends abruptly at a circle labeled only: 'Where echoes become memories.'",
  "A feather rests inside the book. It crumbles into glowing dust when touched.",

  "The final page simply asks: 'When the journey ends... who is left to arrive?'",
  "अहिंसा परमो धर्मः — 'Non-violence is the highest Dharma.'",
  "The last sentence is barely visible: 'The forest never belonged to us. We were merely invited.'"
];

  let inside = false;
  let transitioning = false;
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

  function completeTransition(player, entering) {
    if (entering) {
      setInteriorCollision(true);
      player.teleportWalker(interiorPos.x, interiorFloorY, interiorPos.z + 1.8, Math.PI);
      player.setGroundHeightFn(() => interiorFloorY);
      player.setInside(true);
      player.setIndoorCameraBounds({
        minX: interiorPos.x - ROOM_HALF_W + 0.42,
        maxX: interiorPos.x + ROOM_HALF_W - 0.42,
        minY: interiorFloorY + 1.1,
        maxY: interiorFloorY + WALL_H - 0.45,
        minZ: interiorPos.z - ROOM_HALF_D + 0.42,
        maxZ: interiorPos.z + ROOM_HALF_D - 0.42
      });
      inside = true;
    } else {
      setInteriorCollision(false);
      player.setGroundHeightFn(null);
      player.teleportWalker(
        position.x + Math.cos(rotationY + Math.PI / 2) * 3.2,
        terrainHeight(position.x, position.z),
        position.z + Math.sin(rotationY + Math.PI / 2) * 3.2,
        rotationY
      );
      player.setInside(false);
      player.setIndoorCameraBounds(null);
      inside = false;
    }

    // Give the snapped indoor/outdoor camera one frame while the screen is dark.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { fadeEl.style.opacity = '0'; });
    });
    setTimeout(() => {
      player.setExternalControl(false);
      transitioning = false;
    }, 520);
  }

  function beginTransition(player, entering) {
    transitioning = true;
    player.setExternalControl(true);
    // Let the animated door begin opening before the dissolve hides the swap.
    setTimeout(() => { fadeEl.style.opacity = '1'; }, 160);
    setTimeout(() => completeTransition(player, entering), 550);
  }

  function tryInteract(player) {
    if (sleeping || transitioning) return true;

    if (inside) {
      const p = player.position;
      if (dist(p.x, p.z, bedPos.x, bedPos.z) < bedPos.r) { startSleep(player); return true; }
      if (dist(p.x, p.z, hearthPos.x, hearthPos.z) < hearthPos.r) { showToast('The food bubbles softly on the gas stove.'); return true; }
      if (dist(p.x, p.z, bookPos.x, bookPos.z) < bookPos.r) { showToast(bookLines[Math.floor(Math.random() * bookLines.length)]); return true; }
      if (dist(p.x, p.z, lampPos.x, lampPos.z) < lampPos.r) { toggleLamp(); return true; }

      // Leave through the same short, camera-safe fade used for entry.
      beginTransition(player, false);
      return true;
    }

    if (!isInRange(player) || player.mounted) return false;
    beginTransition(player, true);
    return true;
  }

  function update(dt, elapsed, player) {
    inRange = isInRange(player);
    doorPivot.rotation.y += (((inside || transitioning) ? -1.3 : 0) - doorPivot.rotation.y) * Math.min(1, dt * 6);
    porchLight.intensity = 0.82 + Math.sin(elapsed * 4.5) * 0.08;

    const flicker = 0.9 + Math.sin(elapsed * 8) * 0.08 + Math.sin(elapsed * 17 + 1) * 0.05;
    hearthFlame.scale.set(flicker, flicker * 1.08, flicker);
    hearthLight.intensity = 1.4 + Math.sin(elapsed * 8) * 0.15;
    // Interior particle buffers only need updating while the cabin is nearby.
    if (inside || inRange) {
    boilingBubbles.forEach((bubble, index) => {
      const rise = (Math.sin(elapsed * 4.5 + bubble.userData.phase) + 1) * 0.5;
      bubble.position.y = 2.405 + rise * 0.14;
      const bubbleScale = 0.65 + rise * 0.6;
      bubble.scale.setScalar(bubbleScale);
      bubble.visible = Math.sin(elapsed * 4.5 + bubble.userData.phase + index) > -0.35;
    });
    if (lampOn) lampLight.intensity = 2.15 + Math.sin(elapsed * 2.1) * 0.08;

    for (let i = 0; i < STEAM_COUNT; i++) {
      steamPos[i * 3 + 1] += dt * 0.35;
      steamPos[i * 3] += Math.sin(elapsed * 0.6 + steamSeed[i]) * 0.05 * dt;
      if (steamPos[i * 3 + 1] > 3.5) {
        steamPos[i * 3 + 1] = 2.45;
        steamPos[i * 3] = STOVE_X + 0.48 + (Math.random() - 0.5) * 0.35;
        steamPos[i * 3 + 2] = STOVE_Z + (Math.random() - 0.5) * 0.35;
      }
    }
    steamGeo.attributes.position.needsUpdate = true;

    for (let i = 0; i < INCENSE_SMOKE_COUNT; i++) {
      incenseSmokePos[i * 3 + 1] += dt * 0.22;
      incenseSmokePos[i * 3] += Math.sin(elapsed * 0.85 + incenseSmokeSeed[i]) * 0.045 * dt;
      if (incenseSmokePos[i * 3 + 1] > 3.8) {
        incenseSmokePos[i * 3] = -4.65 + (Math.random() - 0.5) * 0.15;
        incenseSmokePos[i * 3 + 1] = 2.55;
        incenseSmokePos[i * 3 + 2] = -ROOM_HALF_D + 0.24;
      }
    }
    incenseSmokeGeo.attributes.position.needsUpdate = true;
    const incenseGlow = 0.65 + Math.sin(elapsed * 7.5) * 0.2;
    incenseTips.forEach(tip => {
      tip.material.opacity = incenseGlow;
      tip.scale.setScalar(0.8 + incenseGlow * 0.25);
    });
    incenseLight.intensity = 0.26 + incenseGlow * 0.14;
    }

    if (!inside) {
      promptEl.textContent = player.mounted
        ? 'Press E to dismount, then enter the cabin'
        : 'Press E to open the door and enter';
      promptEl.style.opacity = inRange && !sleeping && !transitioning ? '1' : '0';
      interiorLabel.style.opacity = '0';
      return;
    }

    interiorLabel.style.opacity = sleeping || transitioning ? '0' : '1';
    if (!sleeping) player.restoreStamina(dt * staminaPerSecond * 0.4);

    const p = player.position;
    if (dist(p.x, p.z, bedPos.x, bedPos.z) < bedPos.r) promptEl.textContent = 'Press E to sleep';
    else if (dist(p.x, p.z, hearthPos.x, hearthPos.z) < hearthPos.r) promptEl.textContent = 'Press E to check the boiling food';
    else if (dist(p.x, p.z, bookPos.x, bookPos.z) < bookPos.r) promptEl.textContent = 'Press E to read';
    else if (dist(p.x, p.z, lampPos.x, lampPos.z) < lampPos.r) promptEl.textContent = `Press E to ${lampOn ? 'dim' : 'light'} the lamp`;
    else promptEl.textContent = 'Press E to leave the cabin';
    promptEl.style.opacity = sleeping || transitioning ? '0' : '1';
  }

  const exteriorWindowLocal = new THREE.Vector3(0, 1.85, 2.35);
  const exteriorWindowPos = new THREE.Vector3();
  const exteriorWindowForward = new THREE.Vector3();
  const exteriorWindowTarget = new THREE.Vector3();
  const windowCamera = new THREE.PerspectiveCamera(58, 768 / 512, 0.1, 900);

  function updateWindowView() {
    if (!inside || !renderer || !windowTarget) return;
    group.updateMatrixWorld(true);
    exteriorWindowPos.copy(exteriorWindowLocal).applyMatrix4(group.matrixWorld);
    exteriorWindowForward.set(0, 0, 1).transformDirection(group.matrixWorld);
    exteriorWindowTarget.copy(exteriorWindowPos).addScaledVector(exteriorWindowForward, 70);
    windowCamera.position.copy(exteriorWindowPos);
    windowCamera.lookAt(exteriorWindowTarget);

    // Do not let the screen render itself while producing the real-time exterior view.
    windowPane.visible = false;
    const previousTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(windowTarget);
    renderer.clear();
    renderer.render(scene, windowCamera);
    renderer.setRenderTarget(previousTarget);
    windowPane.visible = true;
  }

  return {
    group,
    position,
    ziplineAnchor,
    restRadius: enterRadius,
    update,
    updateWindowView,
    tryInteract,
    setSleepCallback(fn) { onSleepCallback = fn; },
    get resting() { return inside; },
    get sleeping() { return sleeping; }
  };
}
