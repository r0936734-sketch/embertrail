// farm.js — Mira's Farm, far out on the western plains.
// A fenced-field homestead with a farmhouse, a barn, and five crop-raiding
// pests hiding in the rows. Pests stay dormant (invisible, unregistered
// with archery) until startMission() is called, so nothing can be shot
// here before the quest is actually accepted.
export const FARM_ORIGIN = { x: -340, z: -240 };
export const FARM_SCALE = 2.4;

// Shared by terrain.js so the physical ground is as level as the farm assets.
export function farmFootprintT(x, z, position = FARM_ORIGIN) {
  const dx = Math.abs(x - position.x);
  const dz = Math.abs(z - position.z);
  const edge = Math.max(dx / 86, dz / 76);
  return THREE.MathUtils.clamp(1 - (edge - 1) / 0.32, 0, 1);
}

export function createFarm(scene, terrainHeight, collision, archery, options = {}) {
  const position = options.position || FARM_ORIGIN;
  const onEvent = options.onEvent || (() => {});
  const px = position.x, pz = position.z;
  const baseY = terrainHeight(px, pz);

  const root = new THREE.Group();
  root.position.set(px, baseY, pz);
  root.scale.setScalar(FARM_SCALE);
  scene.add(root);

  // ---------- materials ----------
  const wallMat     = new THREE.MeshStandardMaterial({ color: 0xcbb08a, roughness: 1, flatShading: true });
  const roofMat      = new THREE.MeshStandardMaterial({ color: 0x7a3b2c, roughness: 1, flatShading: true });
  const woodMat      = new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 1, flatShading: true });
  const fenceMat     = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1, flatShading: true });
  const soilMat      = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 1, flatShading: true });
  const cropMat      = new THREE.MeshStandardMaterial({ color: 0x7fae3a, roughness: 0.9, flatShading: true });
  const cropRipeMat  = new THREE.MeshStandardMaterial({ color: 0xe8b23c, roughness: 0.9, flatShading: true });
  const strawMat     = new THREE.MeshStandardMaterial({ color: 0xd9c07a, roughness: 1, flatShading: true });
  const barnMat      = new THREE.MeshStandardMaterial({ color: 0x8a2e24, roughness: 1, flatShading: true });
  const shirtMat     = new THREE.MeshStandardMaterial({ color: 0x4a5f8a, roughness: 1, flatShading: true });

  // ---------- farmhouse ----------
  const house = new THREE.Group();
  house.position.set(-8, 0, -6);
  root.add(house);
  const houseBody = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.0, 4.4), wallMat);
  houseBody.position.y = 1.5;
  house.add(houseBody);
  const houseRoof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.2, 4), roofMat);
  houseRoof.rotation.y = Math.PI / 4;
  houseRoof.position.y = 3.6;
  house.add(houseRoof);
  const houseDoor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.1), woodMat);
  houseDoor.position.set(0, 0.85, 2.22);
  house.add(houseDoor);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), woodMat);
  chimney.position.set(-1.6, 4.1, -0.6);
  house.add(chimney);
  if (collision) collision.addBox(px - 8 * FARM_SCALE, pz - 6 * FARM_SCALE, 2.9 * FARM_SCALE, 2.4 * FARM_SCALE);

  // ---------- barn ----------
  const barn = new THREE.Group();
  barn.position.set(6, 0, -9);
  root.add(barn);
  const barnBody = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.6, 5.0), barnMat);
  barnBody.position.y = 1.8;
  barn.add(barnBody);
  const roofL = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.2, 3.4), roofMat);
  roofL.position.set(0, 3.9, -1.4);
  roofL.rotation.x = 0.55;
  barn.add(roofL);
  const roofR = roofL.clone();
  roofR.position.z = 1.4;
  roofR.rotation.x = -0.55;
  barn.add(roofR);
  const barnDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.1), woodMat);
  barnDoor.position.set(0, 1.2, 2.52);
  barn.add(barnDoor);
  if (collision) collision.addBox(px + 6 * FARM_SCALE, pz - 9 * FARM_SCALE, 3.3 * FARM_SCALE, 2.7 * FARM_SCALE);

  // ---------- fenced fields ----------
  const fieldCenters = [
    { x: 5, z: 9, w: 24, d: 15 },
    { x: -15, z: 13, w: 19, d: 13 },
    { x: 18, z: 13, w: 17, d: 12 },
    { x: -2, z: 25, w: 28, d: 13 }
  ];
  const crops = [];
  function makeFence(cx, cz, w, d) {
    const halfW = w / 2, halfD = d / 2;
    const postGeo = new THREE.CylinderGeometry(0.07, 0.08, 1.0, 5);
    const railGeo = new THREE.BoxGeometry(1, 0.08, 0.08);
    function railLine(x0, z0, x1, z1) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const segs = Math.max(1, Math.round(len / 1.6));
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(THREE.MathUtils.lerp(x0, x1, t), 0.5, THREE.MathUtils.lerp(z0, z1, t));
        root.add(post);
      }
      for (let r = 0; r < 2; r++) {
        const rail = new THREE.Mesh(railGeo, fenceMat);
        rail.scale.x = len;
        rail.position.set((x0 + x1) / 2, 0.35 + r * 0.35, (z0 + z1) / 2);
        rail.rotation.y = Math.atan2(z1 - z0, x1 - x0);
        root.add(rail);
      }
    }
    railLine(cx - halfW, cz - halfD, cx + halfW, cz - halfD);
    railLine(cx - halfW, cz + halfD, cx + halfW, cz + halfD);
    railLine(cx - halfW, cz - halfD, cx - halfW, cz + halfD);
    railLine(cx + halfW, cz - halfD, cx + halfW, cz + halfD);
  }
  fieldCenters.forEach(f => {
    makeFence(f.x, f.z, f.w, f.d);
    const soil = new THREE.Mesh(new THREE.BoxGeometry(f.w - 0.6, 0.1, f.d - 0.6), soilMat);
    soil.position.set(f.x, 0.05, f.z);
    root.add(soil);
    const rows = Math.floor((f.d - 1.5) / 1.1);
    const perRow = Math.floor((f.w - 1.5) / 0.9);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < perRow; c++) {
        const cx = f.x - f.w / 2 + 1.0 + c * 0.9;
        const cz = f.z - f.d / 2 + 1.0 + r * 1.1;
        const ripe = Math.random() < 0.4;
        const crop = new THREE.Mesh(
          new THREE.ConeGeometry(0.16, 0.55 + Math.random() * 0.25, 5),
          ripe ? cropRipeMat : cropMat
        );
        crop.position.set(cx, 0.35, cz);
        crop.userData.homeY = crop.position.y;
        crop.userData.damage = 0;
        crops.push(crop);
        root.add(crop);
      }
    }
  });

  // hay bales + scarecrow for flavor
  for (let i = 0; i < 6; i++) {
    const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 10), strawMat);
    bale.rotation.z = Math.PI / 2;
    bale.position.set(12 + i * 1.1, 0.5, -7);
    root.add(bale);
  }
  const scarecrow = new THREE.Group();
  scarecrow.position.set(4, 0, 1.5);
  root.add(scarecrow);
  const scarecrowPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 5), woodMat);
  scarecrowPost.position.y = 1.1;
  scarecrow.add(scarecrowPost);
  const scarecrowArms = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.08), woodMat);
  scarecrowArms.position.y = 1.7;
  scarecrow.add(scarecrowArms);
  const scarecrowShirt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), shirtMat);
  scarecrowShirt.position.y = 1.5;
  scarecrow.add(scarecrowShirt);
  const scarecrowHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6), strawMat);
  scarecrowHead.position.y = 2.05;
  scarecrow.add(scarecrowHead);

  const poiList = [{
    name: "Mira's Farm",
    pos: { x: px, z: pz },
    r: 52,
    flavor: 'Fenced fields far from Emberford. Something keeps getting past the fence and tearing up the crop rows.'
  }];

  // Where the rider should arrive / where Mira dismounts and stands.
  const arrivalSpot = { x: px + 2 * FARM_SCALE, z: pz + 2 * FARM_SCALE };

  // ---------- pest animals ----------
  const PEST_SPAWNS = [
    { type: 'boar', x: 7, z: 8 }, { type: 'fox', x: -5, z: 14 },
    { type: 'hippo', x: 16, z: 15 }, { type: 'boar', x: -15, z: 13 },
    { type: 'fox', x: 2, z: 25 }, { type: 'hippo', x: 14, z: 25 }
  ];
  const animalMats = {
    boar: new THREE.MeshStandardMaterial({ color: 0x4b3a30, roughness: 1, flatShading: true }),
    fox: new THREE.MeshStandardMaterial({ color: 0xc2612f, roughness: 1, flatShading: true }),
    hippo: new THREE.MeshStandardMaterial({ color: 0x716b78, roughness: 1, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a1f16, roughness: 1, flatShading: true }),
    tusk: new THREE.MeshStandardMaterial({ color: 0xe8e2cf, roughness: 1, flatShading: true })
  };
  const animalBodyGeo = new THREE.SphereGeometry(1, 8, 6);
  const animalHeadGeo = new THREE.SphereGeometry(0.5, 7, 5);
  const animalLegGeo = new THREE.CylinderGeometry(0.11, 0.14, 0.62, 5);
  const animalEarGeo = new THREE.ConeGeometry(0.12, 0.28, 5);

  function makePest(type) {
    const isHippo = type === 'hippo';
    const bodyMat = animalMats[type];
    const g = new THREE.Group();
    const body = new THREE.Mesh(animalBodyGeo, bodyMat);
    body.scale.set(isHippo ? 0.95 : 0.72, isHippo ? 0.62 : 0.48, isHippo ? 0.62 : 0.48);
    body.position.y = isHippo ? 0.82 : 0.68;
    g.add(body);
    const head = new THREE.Mesh(animalHeadGeo, bodyMat);
    head.scale.set(isHippo ? 0.65 : 0.48, isHippo ? 0.56 : 0.45, isHippo ? 0.58 : 0.46);
    head.position.set(isHippo ? 0.72 : 0.58, isHippo ? 0.86 : 0.78, 0);
    g.add(head);
    [-0.08, 0.08].forEach(z => {
      const ear = new THREE.Mesh(animalEarGeo, type === 'fox' ? bodyMat : animalMats.dark);
      ear.position.set(isHippo ? 0.7 : 0.55, isHippo ? 1.28 : 1.04, z * (isHippo ? 1.4 : 1.7));
      g.add(ear);
    });
    const legGeo = new THREE.BoxGeometry(0.1, 0.42, 0.1);
    const legs = [];
    [[-0.28, 0.18], [0.28, 0.18], [-0.28, -0.18], [0.28, -0.18]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(animalLegGeo, bodyMat);
      leg.scale.y = isHippo ? 1.2 : 0.82;
      leg.position.set(x * (isHippo ? 1.7 : 1.35), isHippo ? 0.38 : 0.28, z * (isHippo ? 1.5 : 1.3));
      g.add(leg);
      legs.push(leg);
    });
    const tail = new THREE.Mesh(new THREE.ConeGeometry(isHippo ? 0.06 : 0.09, isHippo ? 0.22 : 0.42, 5), type === 'fox' ? bodyMat : animalMats.dark);
    tail.position.set(isHippo ? -0.78 : -0.65, isHippo ? 0.84 : 0.7, 0);
    tail.rotation.z = Math.PI / 2;
    g.add(tail);
    if (type === 'boar') {
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), bodyMat);
      snout.scale.z = 1.25;
      snout.position.set(0.98, 0.78, 0);
      g.add(snout);
      [-0.13, 0.13].forEach(z => {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 4), animalMats.tusk);
        tusk.position.set(1.05, 0.68, z);
        tusk.rotation.z = Math.PI * 0.55;
        g.add(tusk);
      });
    }
    return { group: g, legs };
  }

  const pests = PEST_SPAWNS.map((spot, i) => {
    const built = makePest(spot.type);
    const wx = px + spot.x, wz = pz + spot.z;
    // terrain.js flattens the farm footprint, so all farm props share this
    // stable local floor even after the farm is scaled up.
    built.group.position.set(spot.x, 0, spot.z);
    built.group.rotation.y = Math.random() * Math.PI * 2;
    built.group.visible = false;
    root.add(built.group);
    return {
      ...built,
      localHome: { x: spot.x, z: spot.z },
      alive: true,
      unregister: null,
      wanderT: Math.random() * 3,
      heading: Math.random() * Math.PI * 2,
      phase: i * 1.7
    };
  });

  let missionActive = false;
  let missionDone = false;
  let killed = 0;
  const _worldPos = new THREE.Vector3();

  function activatePest(p) {
    p.group.visible = true;
    p.unregister = archery.register({
      name: 'farmPest',
      radius: 1.55,
      get dead() { return !p.alive; },
      getPos: () => {
        p.group.getWorldPosition(_worldPos);
        _worldPos.y += 1.45;
        return _worldPos;
      },
      onHit: () => {
        if (!p.alive) return;
        p.alive = false;
        p.group.visible = false;
        if (p.unregister) p.unregister();
        killed++;
        onEvent('farmPestKilled', { killed, total: pests.length });
        if (killed >= pests.length && !missionDone) {
          missionDone = true;
          missionActive = false;
          onEvent('farmMissionComplete', {});
        }
      }
    });
  }

  function startMission() {
    if (missionActive || missionDone) return;
    missionActive = true;
    pests.forEach(p => { if (p.alive) activatePest(p); });
  }

  function update(dt, elapsed, playerPos) {
    const nearby = !playerPos || Math.hypot(playerPos.x - px, playerPos.z - pz) < 180;
    root.visible = nearby;
    if (!nearby) return;
    for (const p of pests) {
      if (!p.alive || !p.group.visible) continue;
      p.wanderT -= dt;
      if (p.wanderT <= 0) {
        p.wanderT = 1.5 + Math.random() * 2.5;
        p.heading += (Math.random() - 0.5) * 1.8;
      }
      const nx = p.group.position.x + Math.cos(p.heading) * 0.6 * dt;
      const nz = p.group.position.z - Math.sin(p.heading) * 0.6 * dt;
      // simple leash so pests don't wander out of the fields
      if (Math.hypot(nx - p.localHome.x, nz - p.localHome.z) < 6) {
        p.group.position.x = nx;
        p.group.position.z = nz;
      } else {
        p.heading = Math.atan2(p.localHome.z - p.group.position.z, p.localHome.x - p.group.position.x) + Math.PI;
      }
      p.group.rotation.y = -p.heading + Math.PI / 2;
      p.phase += dt * 6;
      p.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(p.phase + (i % 2) * Math.PI) * 0.35; });
      crops.forEach(crop => {
        const dx = crop.position.x - p.group.position.x;
        const dz = crop.position.z - p.group.position.z;
        if (dx * dx + dz * dz < 2.25) crop.userData.damage = Math.min(1, crop.userData.damage + dt * 0.8);
      });
    }
    crops.forEach(crop => {
      const damage = crop.userData.damage;
      crop.rotation.z = damage * 0.9;
      crop.scale.y = 1 - damage * 0.65;
      crop.position.y = crop.userData.homeY - damage * 0.18;
    });
  }

  return {
    update,
    startMission,
    poiList,
    position: { x: px, z: pz },
    arrivalSpot,
    get missionActive() { return missionActive; },
    get missionDone() { return missionDone; },
    get killedCount() { return killed; },
    get totalCount() { return pests.length; },
    group: root
  };
}
