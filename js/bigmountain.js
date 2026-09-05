// bigmountain.js — Skyhold Peak: a massive distant mountain that is its own
// mini-map. Walkable slopes, a high plateau village with homes, NPCs, circular
// ring-roads, lanterns, a shrine, and market stalls. Export footprint helpers
// so terrain.js can raise the physical ground and the balloon can fly here.
//
// Origin is far north of the main valley so it feels like a separate realm.
// Scale is intentionally huge.

// Keep the summit inside the playable world.  The former centre was beyond
// WORLD_RADIUS, which meant riders could see Skyhold but never reach its plaza.
export const BIG_MOUNTAIN_ORIGIN = { x: 60, z: -410 };
export const BIG_MOUNTAIN_BASE_RADIUS = 270;   // broad, rideable outer foot
export const BIG_MOUNTAIN_PLATEAU_RADIUS = 106; // generous summit village zone
export const BIG_MOUNTAIN_HEIGHT = 84;         // wide, climbable alpine rise

// A long switchback starts at the existing northern trail and enters the
// southern ring road. It is shared with terrain.js so it also gains trail grip.
export const BIG_MOUNTAIN_ROAD = [
  { x: 52, z: -188 }, { x: 74, z: -218 }, { x: 126, z: -236 },
  { x: 174, z: -268 }, { x: 194, z: -310 }, { x: 168, z: -347 },
  { x: 122, z: -365 }, { x: 82, z: -389 }, { x: 60, z: -325 }
];

// Soft footprint 0..1 used by terrain.js to blend the mountain into the world mesh.
// Returns 1 at the peak plateau, fades through the slopes, 0 outside the base.
export function bigMountainFootprintT(x, z, origin = BIG_MOUNTAIN_ORIGIN) {
  const dx = x - origin.x;
  const dz = z - origin.z;
  const d = Math.hypot(dx, dz);
  if (d >= BIG_MOUNTAIN_BASE_RADIUS) return 0;
  if (d <= BIG_MOUNTAIN_PLATEAU_RADIUS) return 1;
  // Smooth falloff from plateau edge to base
  const t = (d - BIG_MOUNTAIN_PLATEAU_RADIUS) / (BIG_MOUNTAIN_BASE_RADIUS - BIG_MOUNTAIN_PLATEAU_RADIUS);
  return THREE.MathUtils.clamp(1 - t * t * (3 - 2 * t), 0, 1);
}

// Ideal surface height contribution (added on top of valley floor baseline).
export function bigMountainSurfaceY(x, z, origin = BIG_MOUNTAIN_ORIGIN) {
  const dx = x - origin.x;
  const dz = z - origin.z;
  const d = Math.hypot(dx, dz);
  if (d >= BIG_MOUNTAIN_BASE_RADIUS) return 0;
  // Plateau is flat; slopes use a smooth cosine profile so walking feels natural.
  let heightFrac = 1;
  if (d > BIG_MOUNTAIN_PLATEAU_RADIUS) {
    const slopeT = (d - BIG_MOUNTAIN_PLATEAU_RADIUS) / (BIG_MOUNTAIN_BASE_RADIUS - BIG_MOUNTAIN_PLATEAU_RADIUS);
    heightFrac = 0.5 + 0.5 * Math.cos(Math.min(1, slopeT) * Math.PI);
  }
  // Keep the village plateau mathematically flat.  Applying this ridge at
  // d <= plateauRadius was the source of floating roads and uneven physics.
  // It fades in only on the outer slope, where it adds a useful silhouette.
  const angle = Math.atan2(dz, dx);
  const slopeT = THREE.MathUtils.clamp(
    (d - BIG_MOUNTAIN_PLATEAU_RADIUS) /
      (BIG_MOUNTAIN_BASE_RADIUS - BIG_MOUNTAIN_PLATEAU_RADIUS), 0, 1
  );
  const ridgeAmount = THREE.MathUtils.smoothstep(slopeT, 0.12, 0.82) * 0.065;
  const ridge = 1 + (Math.sin(angle * 3.2) * 0.7 + Math.sin(angle * 7.1) * 0.3) * ridgeAmount;
  return BIG_MOUNTAIN_HEIGHT * heightFrac * ridge;
}

export function createBigMountain(scene, terrainHeight, collision, options = {}) {
  const origin = options.position || BIG_MOUNTAIN_ORIGIN;
  const onEvent = options.onEvent || (() => {});
  const ox = origin.x;
  const oz = origin.z;

  // Base Y of the plateau in world space (terrainHeight already includes the mountain)
  const plateauY = terrainHeight(ox, oz);

  const root = new THREE.Group();
  root.position.set(ox, 0, oz);
  scene.add(root);
  const detailRoot = new THREE.Group();
  scene.add(detailRoot);

  // ---------- materials ----------
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x6d6d69, roughness: 0.95, flatShading: true, vertexColors: true
  });
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x7a6a52, roughness: 1, flatShading: true
  });
  const plaster = new THREE.MeshLambertMaterial({ color: 0xcbb89a, flatShading: true });
  const thatch = new THREE.MeshLambertMaterial({ color: 0x8a6a38, flatShading: true });
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x3a2616, flatShading: true });
  const stone = new THREE.MeshLambertMaterial({ color: 0x8a8278, flatShading: true });
  const cloth = new THREE.MeshLambertMaterial({ color: 0x6b3a2a, flatShading: true });
  const wood = new THREE.MeshLambertMaterial({ color: 0x6a4a2c, flatShading: true });
  const bannerMat = new THREE.MeshLambertMaterial({ color: 0x8b2e2e, flatShading: true });
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x68734d, roughness: 1, flatShading: true });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3020, roughness: 1, flatShading: true });
  const scopeMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.6, flatShading: true });

  // ---------- visual mountain mass (low-poly shell, physics come from terrain) ----------
  function makePeakShell() {
    const segs = 72;
    const rings = 52;
    const positions = [];
    const colors = [];
    const indices = [];
    const col = new THREE.Color();
    const rockLit = new THREE.Color(0x7d7466);
    const rockShad = new THREE.Color(0x4c4b50);

    for (let ring = 0; ring <= rings; ring++) {
      const radius = BIG_MOUNTAIN_BASE_RADIUS * ring / rings;
      for (let seg = 0; seg < segs; seg++) {
        const angle = (seg / segs) * Math.PI * 2;
        // Sample the same X/Z surface as terrainHeight. A separate visual
        // radial distortion here made bikes appear to clip through the slope.
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = terrainHeight(ox + x, oz + z) + 0.025;
        col.copy(Math.cos(angle - 0.4) > -0.1 ? rockLit : rockShad);
        positions.push(x, y, z);
        colors.push(col.r, col.g, col.b);
      }
    }
    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segs; seg++) {
        const next = (seg + 1) % segs;
        const a = ring * segs + seg;
        const b = ring * segs + next;
        const c = (ring + 1) * segs + next;
        const d = (ring + 1) * segs + seg;
        indices.push(a, b, d, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, rockMat);
    // Vertices are sampled from terrainHeight, so the shell cannot disagree
    // with the ground used by the player, horse, or bike.
    mesh.position.set(0, 0, 0);
    root.add(mesh);
    return mesh;
  }
  makePeakShell();

  // A single level summit floor gives the village one physical surface. It
  // uses the same plateauY read by the player and bike height queries.
  const summitPlain = new THREE.Mesh(
    new THREE.CircleGeometry(BIG_MOUNTAIN_PLATEAU_RADIUS - 1.5, 48),
    grassMat
  );
  summitPlain.rotation.x = -Math.PI / 2;
  summitPlain.position.set(ox, plateauY + 0.012, oz);
  detailRoot.add(summitPlain);

  function summitTree(x, z, scale = 1) {
    const tree = new THREE.Group();
    tree.position.set(ox + x, plateauY, oz + z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.6, 6), trunkMat);
    trunk.position.y = 1.3 * scale;
    trunk.scale.setScalar(scale);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.35, 3.2, 7), grassMat);
    crown.position.y = 3.25 * scale;
    crown.scale.setScalar(scale);
    tree.add(trunk, crown);
    detailRoot.add(tree);
    if (collision) collision.addCollider(ox + x, oz + z, 0.55 * scale);
  }

  const summitTrees = [
    [-52, -18, 1.1], [-45, 34, 0.9], [-22, 54, 1.2], [18, 54, 1.0],
    [47, 28, 1.15], [51, -24, 0.95], [28, -51, 1.1], [-28, -50, 0.9]
  ];
  summitTrees.forEach(tree => summitTree(tree[0], tree[1], tree[2]));

  function cairn(wx, wz, scale = 1) {
    const g = new THREE.Group();
    g.position.set(wx, terrainHeight(wx, wz), wz);
    for (let i = 0; i < 5; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry((0.28 + i * 0.055) * scale, 0), stone);
      rock.position.set((i % 2 ? -0.07 : 0.07) * scale, (0.17 + i * 0.18) * scale, (i % 3 - 1) * 0.035 * scale);
      rock.rotation.y = i * 0.7;
      g.add(rock);
    }
    detailRoot.add(g);
  }
  cairn(118, -355, 1.15);
  cairn(-18, -300, 0.9);

  const lookout = new THREE.Group();
  const lookoutX = ox - 66, lookoutZ = oz + 46;
  lookout.position.set(lookoutX, plateauY, lookoutZ);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.7, 0.28, 10), wood);
  deck.position.y = 0.14;
  lookout.add(deck);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.4, 5), darkWood);
    post.position.set(Math.cos(a) * 2.85, 0.7, Math.sin(a) * 2.85);
    lookout.add(post);
  }
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.25, 7), scopeMat);
  scope.rotation.z = Math.PI / 2;
  scope.position.set(0.25, 1.15, -0.2);
  lookout.add(scope);
  detailRoot.add(lookout);
  if (collision) collision.addCollider(lookoutX, lookoutZ, 3.0);

  // ---------- circular ring roads on the plateau ----------
  function ringRoad(radius, width = 4.2, yOffset = 0.12) {
    const segs = 48;
    const geo = new THREE.RingGeometry(radius - width / 2, radius + width / 2, segs);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, pathMat);
    mesh.position.set(ox, plateauY + yOffset * 0.35, oz);
    detailRoot.add(mesh);
    return mesh;
  }

  // Outer circuit + inner plaza ring
  ringRoad(BIG_MOUNTAIN_PLATEAU_RADIUS - 10, 5.5, 0.14);
  ringRoad(28, 4.0, 0.14);
  // Radial spokes connecting rings
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const path = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.18, 40),
      pathMat
    );
    path.position.set(
      ox + Math.cos(a) * 48,
      plateauY + 0.035,
      oz + Math.sin(a) * 48
    );
    path.rotation.y = Math.PI / 2 - a;
    detailRoot.add(path);
  }

  // A wide, terrain-following switchback joins the normal northern map to
  // Skyhold. Its 300m route keeps the grade comfortable for both horse/bike.
  const bridgeSegments = new Set([1, 3, 5]);
  for (let i = 0; i < BIG_MOUNTAIN_ROAD.length - 1; i++) {
    const a = BIG_MOUNTAIN_ROAD[i], b = BIG_MOUNTAIN_ROAD[i + 1];
    const ax = a.x, az = a.z;
    const bx = b.x, bz = b.z;
    const dx = bx - ax, dz = bz - az;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    const yA = terrainHeight(ax, az), yB = terrainHeight(bx, bz);
    const samples = 6;
    const roadGeometry = new THREE.BufferGeometry();
    const roadPositions = [];
    const roadIndices = [];
    for (let sample = 0; sample <= samples; sample++) {
      const t = sample / samples;
      const x = ax + dx * t, z = az + dz * t;
      const nx = -dz / length * 4.6, nz = dx / length * 4.6;
      roadPositions.push(x + nx, terrainHeight(x + nx, z + nz) + 0.035, z + nz);
      roadPositions.push(x - nx, terrainHeight(x - nx, z - nz) + 0.035, z - nz);
    }
    for (let sample = 0; sample < samples; sample++) {
      const i = sample * 2;
      roadIndices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    }
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeometry.setIndex(roadIndices);
    roadGeometry.computeVertexNormals();
    const road = new THREE.Mesh(roadGeometry, pathMat);
    detailRoot.add(road);

    if (bridgeSegments.has(i)) {
      const railHeight = 1.05;
      [-4.1, 4.1].forEach(offset => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, railHeight, length), darkWood);
        rail.position.set((ax + bx) / 2, (yA + yB) / 2 + railHeight / 2 + 0.08, (az + bz) / 2);
        rail.rotation.y = Math.atan2(dx, dz);
        rail.rotation.x = -Math.atan2(yB - yA, length);
        detailRoot.add(rail);
      });
      const pierCount = Math.max(2, Math.ceil(length / 15));
      for (let pier = 1; pier < pierCount; pier++) {
        const t = pier / pierCount;
        const x = ax + dx * t, z = az + dz * t;
        const y = terrainHeight(x, z);
        const support = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 1.15, 6), stone);
        support.position.set(x, y + 0.575, z);
        detailRoot.add(support);
      }
    }
  }

  // ---------- village buildings (world space) ----------
  function hut(wx, wz, w, d, h, yaw = 0) {
    const g = new THREE.Group();
    const y = terrainHeight(wx, wz);
    g.position.set(wx, y, wz);
    g.rotation.y = yaw;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plaster);
    body.position.y = h * 0.5;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.55, 4), thatch);
    roof.position.y = h + h * 0.18;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const doorH = Math.max(1.7, h * 0.5);
    const door = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.1, w * 0.22), doorH, 0.08), darkWood);
    door.position.set(0, doorH * 0.5, d * 0.5 + 0.02);
    g.add(door);
    detailRoot.add(g);
    if (collision) collision.addCollider(wx, wz, Math.max(w, d) * 0.42);
    return g;
  }

  function stall(wx, wz, yaw) {
    const g = new THREE.Group();
    g.position.set(wx, terrainHeight(wx, wz), wz);
    g.rotation.y = yaw;
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.1), wood);
    table.position.y = 0.85;
    g.add(table);
    const clothM = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.04, 0.95), cloth);
    clothM.position.y = 0.93;
    g.add(clothM);
    [-0.95, 0.95].forEach(sx => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.7, 4), darkWood);
      post.position.set(sx, 0.85, -0.4);
      g.add(post);
    });
    detailRoot.add(g);
  }

  function lantern(wx, wz, color = 0xffb45b) {
    const g = new THREE.Group();
    g.position.set(wx, terrainHeight(wx, wz), wz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 2.7, 6), darkWood);
    post.position.y = 1.35;
    const lampMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), lampMat);
    lamp.position.y = 2.47;
    g.add(post, lamp);
    const light = new THREE.PointLight(color, 0.55, 8, 2);
    light.position.y = 2.45;
    g.add(light);
    detailRoot.add(g);
  }

  // Homes arranged around the outer ring road
  const homeAngles = [0.15, 0.9, 1.7, 2.5, 3.4, 4.1, 5.0, 5.7];
  homeAngles.forEach((a, i) => {
    const r = BIG_MOUNTAIN_PLATEAU_RADIUS - 22 - (i % 2) * 6;
    const wx = ox + Math.cos(a) * r;
    const wz = oz + Math.sin(a) * r;
    hut(wx, wz, 5.8 + (i % 3) * 0.6, 5.0 + (i % 2) * 0.5, 3.6 + (i % 3) * 0.25, a + Math.PI);
  });

  // Market stalls near centre plaza
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    stall(ox + Math.cos(a) * 14, oz + Math.sin(a) * 14, a + Math.PI / 2);
  }

  // Central shrine / stone circle
  const shrine = new THREE.Group();
  shrine.position.set(ox, plateauY, oz);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.7, 10), stone);
  plinth.position.y = 0.35;
  shrine.add(plinth);
  const monolith = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.2, 0.7), stone);
  monolith.position.y = 2.5;
  shrine.add(monolith);
  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.9), bannerMat);
  banner.position.set(0.7, 3.2, 0);
  shrine.add(banner);
  detailRoot.add(shrine);
  if (collision) collision.addCollider(ox, oz, 3.2);

  // Lanterns along the outer ring
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = BIG_MOUNTAIN_PLATEAU_RADIUS - 11;
    lantern(ox + Math.cos(a) * r, oz + Math.sin(a) * r);
  }

  // ---------- NPCs ----------
  const npcs = [];
  const poiList = [{
    name: 'Skyhold Peak',
    pos: { x: ox, z: oz },
    r: BIG_MOUNTAIN_PLATEAU_RADIUS + 12,
    flavor: 'A whole village rests on the high plateau. Circular roads ring the summit; the valley looks small from here.'
  }];

  function makePerson(palette, scale = 1.05) {
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: palette.skin, flatShading: true });
    const shirt = new THREE.MeshLambertMaterial({ color: palette.shirt, flatShading: true });
    const pants = new THREE.MeshLambertMaterial({ color: palette.pants, flatShading: true });
    const hair = new THREE.MeshLambertMaterial({ color: palette.hair, flatShading: true });
    const boot = new THREE.MeshLambertMaterial({ color: 0x211914, flatShading: true });
    const face = new THREE.MeshBasicMaterial({ color: 0x2a1b18 });
    const hips = new THREE.Group();
    hips.position.y = 0.84;
    g.add(hips);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.84, 0.34), shirt);
    torso.position.y = 0.4;
    hips.add(torso);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.075, 0.37), pants);
    belt.position.y = 0.04;
    hips.add(belt);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.245, 8, 8), skin);
    head.position.y = 1.05;
    hips.add(head);
    [-0.075, 0.075].forEach(x => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), face);
      eye.position.set(x, 1.09, 0.225);
      hips.add(eye);
    });
    const hairM = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.4), hair);
    hairM.position.y = 1.24;
    hips.add(hairM);
    const makeLeg = (x) => {
      const hip = new THREE.Group();
      hip.position.set(x, 0.84, 0);
      g.add(hip);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.43, 0.2), pants);
      upper.position.y = -0.215;
      hip.add(upper);
      const knee = new THREE.Group();
      knee.position.y = -0.43;
      hip.add(knee);
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.17), pants);
      lower.position.y = -0.175;
      knee.add(lower);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.28), boot);
      foot.position.set(0, -0.395, 0.045);
      knee.add(foot);
      return { hip, knee };
    };
    const makeArm = (x) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(x, 0.7, 0);
      hips.add(shoulder);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.31, 0.15), shirt);
      upper.position.y = -0.155;
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.31;
      shoulder.add(elbow);
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.27, 0.125), shirt);
      lower.position.y = -0.135;
      elbow.add(lower);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 7), skin);
      hand.position.y = -0.315;
      elbow.add(hand);
      return { shoulder, elbow, hand };
    };
    const legs = [makeLeg(-0.15), makeLeg(0.15)];
    const arms = [makeArm(-0.33), makeArm(0.33)];
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    g.add(shadow);
    g.scale.setScalar(scale);
    g.userData = { hips, arms, legs, shadow };
    return g;
  }

  function addNpc(cfg) {
    const mesh = makePerson(cfg.palette, cfg.scale ?? 1.08);
    const y = terrainHeight(cfg.x, cfg.z);
    mesh.position.set(cfg.x, y, cfg.z);
    mesh.rotation.y = cfg.yaw || 0;
    detailRoot.add(mesh);
    const npc = {
      ...cfg,
      mesh,
      home: { x: cfg.x, z: cfg.z },
      heading: cfg.yaw || 0,
      wanderT: 2 + Math.random() * 5,
      state: 'idle',
      pace: cfg.pace || 1.2,
      homeR: cfg.homeR || 6,
      talkIndex: 0
    };
    npcs.push(npc);
    return npc;
  }

  addNpc({
    id: 'skyhold_elder',
    name: 'Elder Varu',
    title: 'Summit Keeper',
    x: ox + 6, z: oz + 4, yaw: -0.6,
    palette: { skin: 0xe0b898, shirt: 0x3d4a6b, pants: 0x2a2430, hair: 0xc8c0b0 },
    lines: [
      'Welcome to Skyhold. The ring-roads keep the wind from stealing our homes.',
      'From the outer circuit you can see the whole valley. Few riders climb this high.',
      'If your balloon drifts this far, land gently — the plateau is stone under the snow.'
    ]
  });

  addNpc({
    id: 'skyhold_guide', name: 'Asha', title: 'Trail Guide',
    x: ox - 34, z: oz + 22, yaw: 0.8,
    palette: { skin: 0xc98e68, shirt: 0x7a5135, pants: 0x253342, hair: 0x201510 },
    lines: ['The switchback is safest in daylight. Follow the cairns when the snow comes in.', 'The road below was rebuilt stone by stone. Keep to its warm, worn center.'],
    homeR: 12, pace: 1.45
  });
  addNpc({
    id: 'skyhold_shepherd', name: 'Doran', title: 'Alpine Shepherd',
    x: ox + 39, z: oz - 34, yaw: -1.1,
    palette: { skin: 0x9e674a, shirt: 0x52614b, pants: 0x4a3930, hair: 0x17120f },
    lines: ['The wind is softer behind the south ridge. That is where the yaks sleep.', 'A mountain has moods. Today it is willing to let you pass.'],
    homeR: 11, pace: 1.1
  });
  addNpc({
    id: 'skyhold_lantern', name: 'Meera', title: 'Lantern Keeper',
    x: ox - 24, z: oz - 43, yaw: 2.1,
    palette: { skin: 0xe0b18b, shirt: 0x6a3e55, pants: 0x302a38, hair: 0x342015 },
    lines: ['At dusk, every lantern points a rider home.', 'The lookout is open to travelers. Do not miss the valley lights.'],
    homeR: 9, pace: 1.25
  });

  addNpc({
    id: 'skyhold_trader',
    name: 'Nira',
    title: 'High Market',
    x: ox - 12, z: oz + 8, yaw: 1.2,
    palette: { skin: 0xd4a574, shirt: 0xa63b2a, pants: 0x3a2e28, hair: 0x1a1210 },
    lines: [
      'Dried fruit and warm wool — better than anything down in the valley fog.',
      'The circular road brings every stall the same share of morning light.'
    ]
  });

  addNpc({
    id: 'skyhold_scout',
    name: 'Kesh',
    title: 'Ridge Scout',
    x: ox + 22, z: oz - 18, yaw: 2.4,
    palette: { skin: 0xc99670, shirt: 0x4a6b4a, pants: 0x2c2a24, hair: 0x2a1c14 },
    lines: [
      'I watch the lower slopes. Avalanche paths shift after every hard frost.',
      'Your balloon can reach us if the wind is kind. Land near the outer ring.'
    ],
    homeR: 10,
    pace: 1.5
  });

  addNpc({
    id: 'skyhold_child',
    name: 'Tavi',
    title: 'Snow Runner',
    x: ox - 8, z: oz - 14, yaw: 0.4,
    palette: { skin: 0xf0c8a8, shirt: 0x5a7a9a, pants: 0x3a3a48, hair: 0x4a3020 },
    lines: [
      'Race you around the outer road!',
      'Sometimes clouds sit right on the plateau. Then it feels like we live in the sky.'
    ],
    homeR: 14,
    pace: 1.8
  });

  // Simple wander + talk prompt state
  let talkTarget = null;
  const promptEl = document.createElement('div');
  Object.assign(promptEl.style, {
    position: 'fixed', left: '50%', bottom: '26%', transform: 'translateX(-50%)',
    padding: '8px 16px', background: 'rgba(20,16,12,0.76)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '14px', borderRadius: '9px',
    border: '1px solid rgba(255,255,255,0.18)', opacity: '0', transition: 'opacity 0.22s',
    pointerEvents: 'none', zIndex: '50', maxWidth: '360px', textAlign: 'center'
  });
  promptEl.classList.add('context-prompt');
  promptEl.dataset.mobileKey = 'e';
  document.body.appendChild(promptEl);

  let prevE = false;

  function update(dt, keys, player, elapsed) {
    const playerPos = player && player.position;
    const mountainDistance = playerPos ? Math.hypot(playerPos.x - ox, playerPos.z - oz) : Infinity;
    // The shell is cheap and gives a distant landmark; the village contains
    // many individual meshes/lights, so only draw and animate it nearby.
    const shellVisible = mountainDistance < 620;
    const detailVisible = mountainDistance < 230;
    root.visible = shellVisible;
    detailRoot.visible = detailVisible;
    if (!detailVisible) {
      promptEl.style.opacity = '0';
      return;
    }

    // Keep NPCs on the plateau surface and wander gently
    for (const npc of npcs) {
      npc.wanderT -= dt;
      if (npc.wanderT <= 0) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * npc.homeR;
        npc.target = {
          x: npc.home.x + Math.cos(ang) * r,
          z: npc.home.z + Math.sin(ang) * r
        };
        npc.wanderT = 3 + Math.random() * 6;
        npc.state = 'walk';
      }
      if (npc.state === 'walk' && npc.target) {
        const dx = npc.target.x - npc.mesh.position.x;
        const dz = npc.target.z - npc.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.4) {
          npc.state = 'idle';
        } else {
          const sp = npc.pace * dt;
          npc.mesh.position.x += (dx / dist) * sp;
          npc.mesh.position.z += (dz / dist) * sp;
          npc.mesh.position.y = terrainHeight(npc.mesh.position.x, npc.mesh.position.z);
          npc.mesh.rotation.y = Math.atan2(dx, dz);
          // simple leg bob
          const bob = Math.sin(elapsed * 8) * 0.15;
          if (npc.mesh.userData.legs) {
            npc.mesh.userData.legs[0].hip.rotation.x = bob;
            npc.mesh.userData.legs[1].hip.rotation.x = -bob;
          }
        }
      } else if (npc.mesh.userData.legs) {
        npc.mesh.userData.legs[0].hip.rotation.x *= 0.9;
        npc.mesh.userData.legs[1].hip.rotation.x *= 0.9;
      }
    }

    // Interaction
    const pos = player.position;
    let nearest = null;
    let nearestD = 4.2;
    for (const npc of npcs) {
      const d = Math.hypot(pos.x - npc.mesh.position.x, pos.z - npc.mesh.position.z);
      if (d < nearestD) {
        nearestD = d;
        nearest = npc;
      }
    }
    talkTarget = nearest;
    if (talkTarget && !player.mounted && !(player.riding === true)) {
      const line = talkTarget.lines[talkTarget.talkIndex % talkTarget.lines.length];
      promptEl.textContent = `Press E — ${talkTarget.name}: "${line.slice(0, 48)}${line.length > 48 ? '…' : ''}"`;
      promptEl.style.opacity = '1';
    } else {
      promptEl.style.opacity = '0';
    }

    const eDown = !!keys['e'];
    if (eDown && !prevE && talkTarget) {
      const line = talkTarget.lines[talkTarget.talkIndex % talkTarget.lines.length];
      onEvent('npcTalk', { id: talkTarget.id, name: talkTarget.name, line });
      talkTarget.talkIndex++;
      // brief toast-style feedback via event; UI may show full line
      promptEl.textContent = `${talkTarget.name}: ${line}`;
      keys['e'] = false;
    }
    prevE = eDown;
  }

  return {
    update,
    poiList,
    origin: { x: ox, z: oz },
    plateauY,
    npcs,
    // Helpers for other systems
    footprintT: (x, z) => bigMountainFootprintT(x, z, origin),
    surfaceY: (x, z) => bigMountainSurfaceY(x, z, origin)
  };
}
