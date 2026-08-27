// Open-world settlements, NPCs, and story interactions.
// Talk with E while standing near a character (mount/cabin still win if closer).

import { distSq } from './perf.js';

export function createWorld(scene, terrainHeight, collision, { inventory, onEvent = () => {} } = {}) {
  const dummy = new THREE.Object3D();
  const poiList = [];
  const npcs = [];
  const props = [];

  const wood = new THREE.MeshLambertMaterial({ color: 0x6a4a2c, flatShading: true });
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x3a2616, flatShading: true });
  const plaster = new THREE.MeshLambertMaterial({ color: 0xcbb89a, flatShading: true });
  const thatch = new THREE.MeshLambertMaterial({ color: 0x8a6a38, flatShading: true });
  const stone = new THREE.MeshLambertMaterial({ color: 0x8a8278, flatShading: true });
  const cloth = new THREE.MeshLambertMaterial({ color: 0x6b3a2a, flatShading: true });
  const sail = new THREE.MeshLambertMaterial({ color: 0xd8c9a4, flatShading: true });
  const water = new THREE.MeshLambertMaterial({
    color: 0x4a9ec0, transparent: true, opacity: 0.72, flatShading: true
  });

  function addPoi(name, x, z, r, flavor) {
    poiList.push({ name, pos: { x, z }, r, flavor });
  }

  function placeY(x, z) {
    return terrainHeight(x, z);
  }

  function hut(x, z, w, d, h, yaw = 0) {
    const g = new THREE.Group();
    const y = placeY(x, z);
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plaster);
    body.position.y = h * 0.5;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.55, 4), thatch);
    roof.position.y = h + h * 0.18;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    // Keep the doorway readable at the same scale as the full-size villagers.
    const doorH = Math.max(1.85, h * 0.52);
    const door = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.2, w * 0.22), doorH, 0.08), darkWood);
    door.position.set(0, doorH * 0.5, d * 0.5 + 0.02);
    g.add(door);
    scene.add(g);
    if (collision) collision.addCollider(x, z, Math.max(w, d) * 0.42);
    props.push(g);
    return g;
  }

  function stall(x, z, yaw) {
    const g = new THREE.Group();
    g.position.set(x, placeY(x, z), z);
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
    scene.add(g);
    props.push(g);
  }

  function lantern(x, z, color = 0xffb45b) {
    const g = new THREE.Group();
    g.position.set(x, placeY(x, z), z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 2.7, 6), darkWood);
    post.position.y = 1.35;
    const lampMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), lampMat);
    lamp.position.y = 2.47;
    g.add(post, lamp);
    const light = new THREE.PointLight(color, 0.6, 7, 2);
    light.position.y = 2.45;
    g.add(light);
    scene.add(g);
    props.push(g);
  }

  function crateStack(x, z, yaw = 0) {
    const g = new THREE.Group();
    g.position.set(x, placeY(x, z), z);
    g.rotation.y = yaw;
    const crateA = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.82, 0.9), wood);
    crateA.position.set(-0.32, 0.41, 0);
    const crateB = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.68, 0.72), wood);
    crateB.position.set(0.32, 0.34, 0.08);
    crateB.rotation.y = 0.25;
    g.add(crateA, crateB);
    scene.add(g);
    props.push(g);
  }

  function makePerson(palette, scale = 1) {
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

    // This mirrors the player's jointed walker proportions: hips, torso,
    // shoulder/elbow arms, knee legs, feet and a full head.
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

    const makeLeg = x => {
      const hip = new THREE.Group();
      // Anchor at the waist (not ground level), matching the player's walker
      // rig. The upper/lower legs then extend down to the feet above terrain.
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
    const makeArm = x => {
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
      return { shoulder, elbow };
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
    g.userData = { head, hips, arms, legs, shadow };
    return g;
  }

  function addNpc(cfg) {
    // Player walker height is about 2.3 world units; keep every NPC there too.
    const mesh = makePerson(cfg.palette, cfg.scale ?? 1.08);
    const y = placeY(cfg.x, cfg.z);
    mesh.position.set(cfg.x, y, cfg.z);
    mesh.rotation.y = cfg.yaw || 0;
    scene.add(mesh);
    const npc = {
      ...cfg,
      mesh,
      home: { x: cfg.x, z: cfg.z },
      heading: cfg.yaw || 0,
      wanderT: 1 + Math.random() * 4,
      state: 'idle',
      pace: cfg.pace || 1.35,
      homeR: cfg.homeR || 5.5,
      greetT: 0,
      greeted: false,
      talkIndex: 0,
      given: false
    };
    npcs.push(npc);
    return npc;
  }

  // ---------- Emberford village ----------
  const V = { x: -148, z: 48 };
  addPoi('Emberford', V.x, V.z, 28,
    'Lanterns hang from eaves. Mira keeps the last warm inn on the trail.');
  hut(V.x - 6, V.z + 4, 7.2, 6.0, 4.3, 0.2);
  hut(V.x + 8, V.z - 2, 6.5, 5.6, 4.0, -0.4);
  hut(V.x + 2, V.z + 12, 6.8, 5.5, 4.1, 0.9);
  hut(V.x - 12, V.z - 8, 5.8, 5.1, 3.7, 0.1);
  stall(V.x + 1, V.z + 1, 0.4);
  stall(V.x - 3, V.z - 6, -0.8);
  lantern(V.x - 10, V.z + 8);
  lantern(V.x + 10, V.z + 7);
  crateStack(V.x - 5, V.z - 4, 0.35);

  const well = new THREE.Group();
  well.position.set(V.x - 1, placeY(V.x - 1, V.z + 2), V.z + 2);
  well.add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.7, 10), stone));
  const wellWater = new THREE.Mesh(new THREE.CircleGeometry(0.85, 12), water);
  wellWater.rotation.x = -Math.PI / 2;
  wellWater.position.y = 0.28;
  well.add(wellWater);
  scene.add(well);
  if (collision) collision.addCollider(V.x - 1, V.z + 2, 1.15);

  addNpc({
    id: 'mira',
    name: 'Mira',
    title: 'Farmkeeper',
    x: V.x + 0.5, z: V.z + 5.5, yaw: 0.2,
    palette: { skin: 0xe8c4a8, shirt: 0x8b2e2e, pants: 0x2c2430, hair: 0x3a2218 },
    lines: [
      'Rider, my farm is being torn apart every night. Will you help me protect the fields?',
      'The raiders hide among the crop rows. Drive them out and I will make sure the farm feeds the trail.'
    ],
    laterLines: [
      'The fields are safe again. You have a place at my table whenever you ride this way.'
    ]
  });

  addNpc({
    id: 'pip',
    name: 'Pip',
    title: 'Runner',
    x: V.x + 6, z: V.z + 8, yaw: -1.2, pace: 2.4, homeR: 9,
    palette: { skin: 0xf0d0b0, shirt: 0x3d6b8a, pants: 0x4a3a28, hair: 0x6b3a18 },
    gift: { feather: 2 }, giftMessage: 'Pip slips two bright feathers from a runner\'s pouch.',
    lines: [
      'You\'re the rider! Mira said someone would come.',
      'If you see nightberries near the hermit\'s camp, bring me one? I trade stories.',
      'East of here the lantern market glows even in rain. West is the abbey. Don\'t get lost.'
    ]
  });

  addNpc({
    id: 'hal',
    name: 'Hal',
    title: 'Miller',
    x: V.x - 8, z: V.z - 2, yaw: 1.1,
    palette: { skin: 0xd4b08c, shirt: 0xc4b48a, pants: 0x3a342c, hair: 0xb8b0a4 },
    gift: { branch: 4 }, giftMessage: 'Hal shares straight ash branches, good for arrow shafts.',
    guideTo: 'The Old Windmill', guideMessage: 'Hal marks the Old Windmill on your trail map.',
    lines: [
      'The old mill on the hill still has locked sails. A good shot wakes them.',
      'Grain, wind, and patience. Same as a long ride.',
      'If you hunt, leave a little meat for the inn. Mira feeds whoever still walks the trail.'
    ]
  });

  addNpc({
    id: 'bram',
    name: 'Bram',
    title: 'Bard',
    x: -70, z: 28, yaw: 0.4, pace: 1.6, homeR: 18,
    palette: { skin: 0xe0b898, shirt: 0x6b2d5c, pants: 0x241820, hair: 0x4a2010 },
    gift: { herb: 2 }, giftMessage: 'Bram gives you a bundle of sweettrail herbs for the road.',
    lines: [
      'A rider, a letter, a dead beacon — I have that song half-written.',
      'West is Emberford. South, salt water. North, stones that watch the sky.',
      'If you name a constellation, come back. I will put it in the chorus.'
    ]
  });

  addNpc({
    id: 'flameGuide', name: 'Flame Keeper', title: 'Beacon Keeper',
    x: 130, z: 56, yaw: 0,
    palette: { skin: 0xd6a77f, shirt: 0x9a442e, pants: 0x2c2522, hair: 0x241812 },
    activity: 'flame', lines: ['The beacon needs your arrow.']
  });
  addNpc({
    id: 'windmillGuide', name: 'Mill Keeper', title: 'Windmill Keeper',
    x: 30, z: 51, yaw: 0,
    palette: { skin: 0xc99d78, shirt: 0x496b70, pants: 0x302722, hair: 0x211812 },
    activity: 'windmill', lines: ['The old mill waits for a clean shot.']
  });

  // ---------- Saltmarsh docks ----------
  const D = { x: 38, z: 178 };
  addPoi('Saltmarsh Docks', D.x, D.z, 22,
    'Weathered piers lean into a wide water. Kael swears the trout remember the stars.');
  const pier = new THREE.Mesh(new THREE.BoxGeometry(14, 0.28, 3.2), wood);
  pier.position.set(D.x, placeY(D.x, D.z) + 0.2, D.z);
  scene.add(pier);
  const harbor = new THREE.Mesh(new THREE.CircleGeometry(16, 20), water);
  harbor.rotation.x = -Math.PI / 2;
  harbor.position.set(D.x + 8, placeY(D.x, D.z) + 0.04, D.z + 10);
  scene.add(harbor);
  const boat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 1.4), darkWood);
  boat.position.set(D.x + 10, placeY(D.x, D.z) + 0.35, D.z + 8);
  scene.add(boat);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 5), wood);
  mast.position.set(D.x + 10, placeY(D.x, D.z) + 2.1, D.z + 8);
  scene.add(mast);
  const sailM = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), sail);
  sailM.position.set(D.x + 10.6, placeY(D.x, D.z) + 2.0, D.z + 8);
  scene.add(sailM);
  if (collision) collision.addCollider(D.x, D.z, 2.4);
  lantern(D.x - 5, D.z - 2, 0x85c9e8);
  crateStack(D.x - 5, D.z + 2, -0.2);

  addNpc({
    id: 'kael',
    name: 'Kael',
    title: 'Fisher',
    x: D.x - 2, z: D.z - 1.5, yaw: 2.4,
    palette: { skin: 0xc9a07a, shirt: 0x2f5d6e, pants: 0x243038, hair: 0x1c1814 },
    gift: { arrow: 3 }, giftMessage: 'Kael shares three fishing arrows for a promise to respect the water.',
    guideTo: 'The Quiet Abbey', guideMessage: 'Kael marks the Quiet Abbey on your trail map.',
    lines: [
      'The millpond inland is kinder than this marsh. Cast a line. Wait.',
      'A trout for Sister Wren and she\'ll bless your road. She\'s at the Quiet Abbey, southwest.',
      'Nights here, the water holds the constellations longer than the sky.'
    ]
  });

  // ---------- Quiet Abbey ----------
  const A = { x: -188, z: 132 };
  addPoi('The Quiet Abbey', A.x, A.z, 20,
    'A low stone chapel. Sister Wren keeps a lamp that never quite goes out.');
  const abbey = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 5.5), stone);
  abbey.position.set(A.x, placeY(A.x, A.z) + 2.1, A.z);
  scene.add(abbey);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 4), darkWood);
  spire.position.set(A.x, placeY(A.x, A.z) + 6.4, A.z);
  scene.add(spire);
  if (collision) collision.addCollider(A.x, A.z, 3.4);
  lantern(A.x - 5, A.z + 2, 0xffd28a);

  addNpc({
    id: 'wren',
    name: 'Sister Wren',
    title: 'Abbess',
    x: A.x + 4.2, z: A.z + 3, yaw: -0.6,
    palette: { skin: 0xead4c0, shirt: 0xe8e0d4, pants: 0xe8e0d4, hair: 0xcfc8bc },
    gift: { herb: 3 }, giftMessage: 'Sister Wren blesses your pack with three healing herbs.',
    lines: [
      'Peace, rider. Hunger makes a hard trail of even kind people.',
      'Bring a fish from the millpond or the docks. We share what we have.',
      'When you have named a star-path, the night will feel less empty. Look up. Press L.'
    ]
  });

  // ---------- Lantern Market ----------
  const M = { x: 168, z: 148 };
  addPoi('Lantern Market', M.x, M.z, 22,
    'Paper lamps and spice smoke. Traders come here when the seasons turn.');
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    stall(M.x + Math.cos(ang) * 8, M.z + Math.sin(ang) * 8, ang + Math.PI);
  }
  hut(M.x + 12, M.z - 4, 6.5, 5.4, 3.9, 0.3);
  lantern(M.x - 9, M.z, 0xffa35b);
  lantern(M.x + 7, M.z + 7, 0xffbd67);
  crateStack(M.x + 10, M.z + 3, 0.7);

  addNpc({
    id: 'nara',
    name: 'Nara',
    title: 'Lantern-seller',
    x: M.x, z: M.z + 2, yaw: 3.0,
    palette: { skin: 0xc89068, shirt: 0xd9782a, pants: 0x3a2a22, hair: 0x1a1210 },
    gift: { feather: 3 }, giftMessage: 'Nara hands over three wick-feathers for your next quiver.',
    guideTo: 'Ashen Ruins', guideMessage: 'Nara marks the Ashen Ruins on your trail map.',
    lines: [
      'A lantern for the Ashen Ruins, east of here. The scholar Ash lost theirs in the collapse.',
      'Markets remember every rider who paid in stories instead of coin.',
      'If you craft arrows, I\'ll take feathers. The lamps need wicks.'
    ]
  });

  // ---------- Ashen Ruins ----------
  const R = { x: 214, z: -52 };
  addPoi('Ashen Ruins', R.x, R.z, 24,
    'Broken arches and a scholar who will not leave the stones.');
  for (let i = 0; i < 6; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 3.8 + (i % 3), 6), stone);
    const ang = (i / 6) * Math.PI * 2;
    col.position.set(R.x + Math.cos(ang) * 7, placeY(R.x, R.z) + 1.9, R.z + Math.sin(ang) * 7);
    col.rotation.z = (i % 2) * 0.18;
    scene.add(col);
    if (collision) collision.addCollider(col.position.x, col.position.z, 0.6);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.35, 6, 10, Math.PI), stone);
  arch.position.set(R.x, placeY(R.x, R.z) + 3.4, R.z);
  arch.rotation.z = Math.PI;
  scene.add(arch);

  addNpc({
    id: 'ash',
    name: 'Ash',
    title: 'Ruin-scholar',
    x: R.x + 3, z: R.z - 2, yaw: 2.1,
    palette: { skin: 0xd8c0a8, shirt: 0x4a5560, pants: 0x2c3038, hair: 0x8a7a68 },
    guideTo: 'Mystic Stone', guideMessage: 'Ash marks the Mystic Stone on your trail map.',
    lines: [
      'These stones were a beacon-house, older than Emberford.',
      'Take the lost lantern. Mira can hang it in the inn when you return the last ember.',
      'The mystic stone in the meadow still answers a well-aimed arrow. Proof the old craft lives.'
    ]
  });

  // ---------- Skywatch ----------
  const S = { x: 52, z: -188 };
  addPoi('Skywatch Observatory', S.x, S.z, 18,
    'A ring of standing stones. Ivo maps the night as if it were a trail.');
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const menhir = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.8 + (i % 3) * 0.4, 0.45), stone);
    menhir.position.set(S.x + Math.cos(ang) * 7.5, placeY(S.x, S.z) + 1.5, S.z + Math.sin(ang) * 7.5);
    scene.add(menhir);
    if (collision) collision.addCollider(menhir.position.x, menhir.position.z, 0.5);
  }
  addNpc({
    id: 'ivo',
    name: 'Ivo',
    title: 'Stargazer',
    x: S.x, z: S.z + 1, yaw: 0,
    palette: { skin: 0xe6d2bc, shirt: 0x2a3350, pants: 0x1c1c28, hair: 0xeeeeee },
    gift: { arrow: 3 }, giftMessage: 'Ivo gives you three star-fletched practice arrows.',
    guideTo: 'Sunveil Ridge', guideMessage: 'Ivo marks Sunveil Ridge on your trail map.',
    lines: [
      'Look up on a clear night. The Wanderer, Ember\'s Bow, the Quiet Doe, Riverline.',
      'Hold L when a path of stars sits in your sight. Naming them keeps the dark honest.',
      'From here you can see Sunveil Ridge. The whole living trail is a sentence. Ride the rest of it.'
    ]
  });

  // ---------- Wolfhollow cave ----------
  const C = { x: -176, z: -128 };
  addPoi('Wolfhollow', C.x, C.z, 18,
    'A dark mouth in the ridge. Tracks braid the snow even in summer.');
  const cave = new THREE.Mesh(new THREE.SphereGeometry(4.2, 8, 6, 0, Math.PI), darkWood);
  cave.position.set(C.x, placeY(C.x, C.z) + 1.6, C.z);
  cave.rotation.y = 0.6;
  scene.add(cave);
  if (collision) collision.addCollider(C.x, C.z, 3.2);
  addNpc({
    id: 'fen',
    name: 'Fen',
    title: 'Tracker',
    x: C.x + 6, z: C.z + 3, yaw: -0.4,
    palette: { skin: 0xb89474, shirt: 0x4a3c32, pants: 0x2a241e, hair: 0x2a2018 },
    gift: { arrow: 4 }, giftMessage: 'Fen marks four broadhead arrows for the trail ahead.',
    guideTo: 'Wolfhollow', guideMessage: 'Fen marks Wolfhollow on your trail map.',
    lines: [
      'Wolves own this hollow. Give them room, or give them an arrow. Your choice.',
      'Boar root the eastern meadow. Bear sometimes crosses the far pines.',
      'A rider who listens lasts longer than a rider who gallops blind.'
    ]
  });

  // ---------- East Glade shrine ----------
  const G = { x: 118, z: 22 };
  addPoi('East Glade Shrine', G.x, G.z, 14,
    'A ring of mossy stones. Offerings of herbs still appear overnight.');
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), stone);
    rock.position.set(G.x + Math.cos(ang) * 5, placeY(G.x, G.z) + 0.4, G.z + Math.sin(ang) * 5);
    scene.add(rock);
  }

  const sites = [
    { id: 'well', x: V.x - 1, z: V.z + 2, r: 2.4, label: 'Drink from the well (E)',
      flavor: 'The well water tastes of iron and old snow. Emberford still drinks.' },
    { id: 'cave', x: C.x, z: C.z, r: 3.6, label: 'Enter Wolfhollow (E)',
      flavor: 'The cave breathes cold. Wolf prints braid the packed earth and vanish into dark.' },
    { id: 'ferry', x: D.x + 10, z: D.z + 8, r: 3.2, label: 'Sit in the skiff (E)',
      flavor: 'The skiff rocks. Marsh birds lift. For a moment the trail is only water.' },
    { id: 'bell', x: A.x, z: A.z + 2.8, r: 3.0, label: 'Ring the abbey bell (E)',
      flavor: 'One low note rolls across the west valley. Sister Wren does not flinch.' },
    { id: 'scope', x: S.x, z: S.z, r: 3.2, label: 'Study the stones (E)',
      flavor: 'Ivo\'s chalk marks name the Wanderer. At night, look up and press L.' }
  ];

  // ---------- dialogue UI ----------
  const panel = document.createElement('div');
  panel.id = 'dialoguePanel';
  Object.assign(panel.style, {
    position: 'fixed', left: '50%', bottom: '18%', transform: 'translateX(-50%)',
    width: 'min(520px, 86vw)', zIndex: '70', display: 'none',
    background: 'rgba(12,14,20,0.9)', border: '1px solid rgba(217,183,121,0.35)',
    borderRadius: '14px', padding: '14px 16px', color: '#f3ead9',
    fontFamily: 'inherit', pointerEvents: 'auto', backdropFilter: 'blur(8px)'
  });
  panel.innerHTML = `
    <div id="dlgName" style="font-size:11px;letter-spacing:2px;color:#d9b779;margin-bottom:6px"></div>
    <div id="dlgText" style="font-size:15px;line-height:1.45"></div>
    <div style="margin-top:10px;opacity:.65;font-size:11px">E / ACTION — continue &nbsp;·&nbsp; Esc — close</div>
    <div id="mobileTalkControls" style="display:none;gap:8px;margin-top:14px">
      <button id="mobileTalkNext" type="button" style="flex:1;padding:10px;border:1px solid rgba(255,255,255,.24);border-radius:8px;background:rgba(255,255,255,.08);color:#fff;font-weight:700">NEXT</button>
      <button id="mobileTalkClose" type="button" style="flex:1;padding:10px;border:1px solid rgba(255,150,120,.35);border-radius:8px;background:rgba(120,50,40,.28);color:#ffe5dc;font-weight:700">ESC / CLOSE</button>
    </div>`;
  document.body.appendChild(panel);

  const mobileTalkControls = panel.querySelector('#mobileTalkControls');
  const mobileTalkNext = panel.querySelector('#mobileTalkNext');
  const mobileTalkClose = panel.querySelector('#mobileTalkClose');
  if (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) {
    mobileTalkControls.style.display = 'flex';
  }

  const prompt = document.createElement('div');
  prompt.className = 'context-prompt';
  prompt.dataset.mobileKey = 'e';
  Object.assign(prompt.style, {
    position: 'fixed', left: '50%', bottom: '22%', transform: 'translateX(-50%)',
    background: 'rgba(12,15,22,0.72)', border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: '10px', padding: '9px 18px', color: '#f2f5ff', fontSize: '13px',
    zIndex: 13, opacity: '0', transition: 'opacity 0.18s', pointerEvents: 'none'
  });
  document.body.appendChild(prompt);

  let talking = null;
  let nearest = null;
  let nearestSite = null;
  let questsRef = null;

  function chapter() {
    return questsRef && typeof questsRef.chapter === 'number' ? questsRef.chapter : 0;
  }

  function grantStoryItems(npc) {
    if (npc.id === 'mira' && !npc.given && chapter() <= 1) {
      inventory.add('letter', 1);
      npc.given = true;
      return 'Mira presses a sealed letter into your hands.';
    }
    if (npc.id === 'ash' && !npc.given) {
      inventory.add('lantern', 1);
      npc.given = true;
      onEvent('lantern', { id: 'ash' });
      return 'Ash gives you a battered bronze lantern, still faintly warm.';
    }
    if (npc.gift && !npc.giftGiven) {
      Object.entries(npc.gift).forEach(([item, amount]) => inventory.add(item, amount));
      npc.giftGiven = true;
      return npc.giftMessage || `${npc.name} adds useful supplies to your pouch.`;
    }
    if (npc.guideTo && !npc.guideGiven) {
      npc.guideGiven = true;
      onEvent('npcGuide', { id: npc.id, target: npc.guideTo });
      return npc.guideMessage || `${npc.name} marks ${npc.guideTo} on your trail map.`;
    }
    return null;
  }

  function showLine(npc) {
    talking = npc;
    panel.style.display = 'block';
    document.getElementById('dlgName').textContent = `${npc.name.toUpperCase()}  ·  ${npc.title}`;
    const pack = (npc.laterLines && chapter() >= 10) ? npc.laterLines : npc.lines;
    const line = pack[Math.min(npc.talkIndex, pack.length - 1)];
    const extra = grantStoryItems(npc);
    document.getElementById('dlgText').textContent = extra ? `${line}\n\n${extra}` : line;
    if (npc.talkIndex === 0) onEvent('talk', { id: npc.id });
    npc.talkIndex = Math.min(npc.talkIndex + 1, pack.length - 1);
  }

  function closeTalk() {
    talking = null;
    panel.style.display = 'none';
  }

  mobileTalkNext.addEventListener('click', event => {
    event.stopPropagation();
    if (talking) tryInteract(null);
  });
  mobileTalkClose.addEventListener('click', event => {
    event.stopPropagation();
    closeTalk();
  });

  function tryInteract(player) {
    if (talking) {
      const pack = (talking.laterLines && chapter() >= 10) ? talking.laterLines : talking.lines;
      if (talking.talkIndex >= pack.length - 1) closeTalk();
      else showLine(talking);
      return true;
    }
    if (nearest) {
      const pack = (nearest.laterLines && chapter() >= 10) ? nearest.laterLines : nearest.lines;
      if (nearest.talkIndex >= pack.length - 1) nearest.talkIndex = 0;
      showLine(nearest);
      return true;
    }
    if (nearestSite) {
      onEvent('discover', { name: nearestSite.id });
      const toast = document.createElement('div');
      toast.textContent = nearestSite.flavor;
      Object.assign(toast.style, {
        position: 'fixed', left: '50%', top: '40%', transform: 'translateX(-50%)',
        background: 'rgba(20,16,12,0.82)', color: '#f6ecd8', padding: '12px 20px',
        borderRadius: '10px', fontSize: '14px', zIndex: 80, maxWidth: '70vw', textAlign: 'center'
      });
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3200);
      return true;
    }
    return false;
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && talking) closeTalk();
  });

  function update(dt, elapsed, playerPos, playerSpeed = 0) {
    nearest = null;
    nearestSite = null;
    let best = 3.6 * 3.6;
    const gallop = Math.abs(playerSpeed) > 6;

    for (const n of npcs) {
      const d2 = distSq(playerPos.x, playerPos.z, n.mesh.position.x, n.mesh.position.z);
      const far = d2 > 90 * 90;
      n.mesh.visible = !far;
      if (far) continue;

      const closeToPlayer = d2 < 3.2 * 3.2;
      if (talking === n || closeToPlayer) {
        n.state = 'idle';
      } else if (n.following || n.lockedPosition) {
        n.state = n.followWalking ? 'wander' : 'idle';
      } else if (talking === n) {
        const face = Math.atan2(playerPos.x - n.mesh.position.x, playerPos.z - n.mesh.position.z);
        n.mesh.rotation.y += (face - n.mesh.rotation.y) * Math.min(1, dt * 4);
        n.state = 'talk';
      } else if (n.id === 'pip' && gallop && d2 < 22 * 22) {
        n.state = 'flee';
        n.heading = Math.atan2(n.mesh.position.x - playerPos.x, n.mesh.position.z - playerPos.z);
        n.mesh.position.x += Math.sin(n.heading) * n.pace * 2.2 * dt;
        n.mesh.position.z += Math.cos(n.heading) * n.pace * 2.2 * dt;
      } else {
        n.wanderT -= dt;
        if (n.wanderT <= 0) {
          n.state = Math.random() < 0.45 ? 'idle' : 'wander';
          n.heading += (Math.random() - 0.5) * 1.6;
          n.wanderT = 2 + Math.random() * 5;
        }
        if (n.state === 'wander') {
          n.mesh.position.x += Math.sin(n.heading) * n.pace * dt;
          n.mesh.position.z += Math.cos(n.heading) * n.pace * dt;
          const hx = n.mesh.position.x - n.home.x;
          const hz = n.mesh.position.z - n.home.z;
          if (hx * hx + hz * hz > n.homeR * n.homeR) {
            n.heading = Math.atan2(-hx, -hz);
          }
        }
        n.mesh.rotation.y += (n.heading - n.mesh.rotation.y) * Math.min(1, dt * 2.4);
      }
      n.mesh.position.y = placeY(n.mesh.position.x, n.mesh.position.z);
      const rig = n.mesh.userData;
      if (rig.head) rig.head.rotation.y = Math.sin(elapsed * 1.4 + n.home.x) * 0.08;
      if (rig.hips) {
        const gait = elapsed * (n.state === 'wander' || n.state === 'flee' ? 7 : 2.2) + n.home.z;
        const walking = n.state === 'wander' || n.state === 'flee';
        rig.hips.position.y = 0.84 + (walking ? Math.abs(Math.sin(gait)) * 0.045 : Math.sin(gait) * 0.012);
        rig.arms.forEach((arm, index) => {
          arm.shoulder.rotation.x = walking
            ? Math.sin(gait + (index ? Math.PI : 0)) * 0.48
            : Math.sin(gait + index) * 0.08;
          arm.elbow.rotation.x = walking ? 0.12 + Math.max(0, -Math.sin(gait + index * Math.PI)) * 0.18 : 0.08;
        });
        rig.legs.forEach((leg, index) => {
          const swing = Math.sin(gait + (index ? Math.PI : 0));
          leg.hip.rotation.x = walking ? swing * 0.5 : 0;
          leg.knee.rotation.x = walking ? Math.max(0, -swing) * 0.36 : 0;
        });
        if (rig.shadow) rig.shadow.scale.x = walking ? 0.9 + Math.abs(Math.sin(gait)) * 0.12 : 1;
      }

      if (d2 < 16 * 16 && !n.greeted) {
        n.greetT += dt;
        if (n.greetT > 0.35) {
          n.greeted = true;
          onEvent('discover', { name: n.name });
        }
      }

      if (!n.interactionDisabled && d2 < best) {
        best = d2;
        nearest = n;
      }
    }

    if (!nearest) {
      let siteBest = 3.2 * 3.2;
      for (const s of sites) {
        const d2 = distSq(playerPos.x, playerPos.z, s.x, s.z);
        if (d2 < siteBest) {
          siteBest = d2;
          nearestSite = s;
        }
      }
    }

    if (talking) {
      prompt.style.opacity = '0';
      return;
    }
    if (nearest) {
      prompt.textContent = nearest.gift && !nearest.giftGiven
        ? `Talk to ${nearest.name} (E) — supplies available`
        : nearest.guideTo && !nearest.guideGiven
          ? `Talk to ${nearest.name} (E) — route available`
          : `Talk to ${nearest.name} (E)`;
      prompt.style.opacity = '1';
    } else if (nearestSite) {
      prompt.textContent = nearestSite.label;
      prompt.style.opacity = '1';
    } else {
      prompt.style.opacity = '0';
    }
  }

  return {
    poiList,
    npcs,
    update,
    tryInteract,
    setQuests(q) { questsRef = q; },
    getNpc(id) { return npcs.find(n => n.id === id) || null; },
    getNearestActivity() { return nearest && nearest.activity ? nearest.activity : null; },
    get isTalking() { return !!talking; },
    closeTalk
  };
}
