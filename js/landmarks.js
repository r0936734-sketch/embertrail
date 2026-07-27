// landmarks.js — waterfall+pool, ruined watchtower, rope bridge, hermit's camp, fishing pond

export function createLandmarks(scene, terrainHeight) {
  const dummy = new THREE.Object3D();

  const stoneMat  = new THREE.MeshStandardMaterial({ color: 0x8a8076, roughness: 1, flatShading: true });
  const mossMat   = new THREE.MeshStandardMaterial({ color: 0x3d5a28, roughness: 1, flatShading: true });
  const woodMat   = new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 1, flatShading: true });
  const darkWood  = new THREE.MeshStandardMaterial({ color: 0x3a2615, roughness: 1, flatShading: true });
  const ropeMat   = new THREE.MeshStandardMaterial({ color: 0xb0955a, roughness: 1, flatShading: true });
  const waterMat  = new THREE.MeshStandardMaterial({ color: 0x5abcd8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.78, side: THREE.FrontSide });
  const cliffMat  = new THREE.MeshStandardMaterial({ color: 0x6e625a, roughness: 1, flatShading: true });
  const gorgeMat  = new THREE.MeshStandardMaterial({ color: 0x6b5e52, roughness: 1, flatShading: true });
  const tentMat   = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 1, flatShading: true });

  const poiList = []; // { name, pos, r, flavor, onDiscover? }

  // ─────────────────────────────────────────────────────────────────────────
  // 1.  WATERFALL + POOL  (southwest ravine)
  // ─────────────────────────────────────────────────────────────────────────
  const WF_POS = { x: -62, z: -48 };
  const wfGroup = new THREE.Group();
  wfGroup.position.set(WF_POS.x, terrainHeight(WF_POS.x, WF_POS.z), WF_POS.z);
  scene.add(wfGroup);

  // cliff face
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 3.5), cliffMat);
  cliff.position.set(0, 6, -1.5);
  wfGroup.add(cliff);

  // cliff rubble
  [[-3, 2, 0.2], [3, 4, 0.5], [-2, 8, 0.3], [2, 10, -0.2]].forEach(([x, y, z]) => {
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + Math.random() * 0.6, 0), stoneMat);
    r.position.set(x, y, z);
    wfGroup.add(r);
  });

  // pool
  const pool = new THREE.Mesh(new THREE.CircleGeometry(5.5, 20), waterMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.08, 5);
  wfGroup.add(pool);

  // foam ring
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0.55, side: THREE.FrontSide });
  const foam = new THREE.Mesh(new THREE.RingGeometry(4.8, 6.2, 20), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.1, 5);
  wfGroup.add(foam);

  // pool-edge rocks
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + Math.random() * 0.45, 0), stoneMat);
    r.position.set(Math.cos(ang) * 5.8, 0.18, 5 + Math.sin(ang) * 5.8);
    wfGroup.add(r);
  }

  // waterfall particle stream
  const WF_COUNT = 220;
  const wfGeo  = new THREE.BufferGeometry();
  const wfPos  = new Float32Array(WF_COUNT * 3);
  const wfSeed = new Float32Array(WF_COUNT);
  const wfAge  = new Float32Array(WF_COUNT);

  function resetWF(i, stagger) {
    wfPos[i * 3]     = (Math.random() - 0.5) * 3.5;
    wfPos[i * 3 + 1] = stagger ? Math.random() * 11 : 11;
    wfPos[i * 3 + 2] = -1 + Math.random() * 0.5;
    wfSeed[i] = Math.random() * Math.PI * 2;
    wfAge[i]  = 0;
  }
  for (let i = 0; i < WF_COUNT; i++) resetWF(i, true);
  wfGeo.setAttribute('position', new THREE.BufferAttribute(wfPos, 3));

  const wfMat    = new THREE.PointsMaterial({ color: 0xaae4f8, size: 0.35, transparent: true, opacity: 0.7, depthWrite: false });
  const wfPoints = new THREE.Points(wfGeo, wfMat);
  wfGroup.add(wfPoints);

  const wfLight = new THREE.PointLight(0x8ecfee, 1.4, 18, 2);
  wfLight.position.set(0, 2, 5);
  wfGroup.add(wfLight);

  // mist
  const MIST_COUNT = 60;
  const mistGeo  = new THREE.BufferGeometry();
  const mistPos  = new Float32Array(MIST_COUNT * 3);
  const mistSeed = new Float32Array(MIST_COUNT);
  for (let i = 0; i < MIST_COUNT; i++) {
    mistPos[i * 3]     = (Math.random() - 0.5) * 6;
    mistPos[i * 3 + 1] = Math.random() * 2.5;
    mistPos[i * 3 + 2] = 3 + Math.random() * 4;
    mistSeed[i] = Math.random() * Math.PI * 2;
  }
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mistMat    = new THREE.PointsMaterial({ color: 0xdff5ff, size: 0.9, transparent: true, opacity: 0.35, depthWrite: false });
  const mistPoints = new THREE.Points(mistGeo, mistMat);
  wfGroup.add(mistPoints);

  poiList.push({ name: 'Hidden Falls', pos: WF_POS, r: 14, flavor: 'Water cascades into a secret pool. The air hangs cool and misty.' });

  // ─────────────────────────────────────────────────────────────────────────
  // 2.  RUINED WATCHTOWER / SHRINE
  // ─────────────────────────────────────────────────────────────────────────
  const TW_POS = { x: 60, z: -36 };
  const twGroup = new THREE.Group();
  twGroup.position.set(TW_POS.x, terrainHeight(TW_POS.x, TW_POS.z), TW_POS.z);
  scene.add(twGroup);

  // base platform
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x7c7268, roughness: 1, flatShading: true });
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.6, 5.5), baseMat);
  base.position.y = 0.3;
  twGroup.add(base);

  // tower shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 8.5, 8), stoneMat);
  shaft.position.y = 4.85;
  twGroup.add(shaft);

  // broken crown
  const crownA = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 3.2, 8), stoneMat);
  crownA.position.set(0.9, 9.8, 0);
  crownA.rotation.z = 0.26;
  twGroup.add(crownA);

  // moss patches on shaft
  [0, 2, 1.82, 0, 5, 1.75, -0.8, 7.5, 1.72].forEach((v, idx) => {
    if (idx % 3 === 2) return; // skip every 3rd (z already set)
    // (skipping — adding them in a loop below)
  });
  [[0, 2, 1.82], [-1, 4.5, 1.74], [0.8, 7.2, 1.73]].forEach(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.8), mossMat);
    m.position.set(x, y, z);
    twGroup.add(m);
  });

  // rubble around base
  for (let i = 0; i < 9; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 2 + Math.random() * 3.5;
    const rb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25 + Math.random() * 0.55, 0), stoneMat);
    rb.position.set(Math.cos(ang) * rad, 0.3, Math.sin(ang) * rad);
    rb.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    twGroup.add(rb);
  }

  // altar stone
  const altar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.6), baseMat);
  altar.position.set(2.5, 0.4, 0);
  twGroup.add(altar);
  const altarTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.72), stoneMat);
  altarTop.position.set(2.5, 0.86, 0);
  twGroup.add(altarTop);

  // candle nub on altar
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0xf8f0d0, roughness: 0.9, flatShading: true }));
  candle.position.set(2.5, 0.95, 0);
  twGroup.add(candle);
  const candleLight = new THREE.PointLight(0xffaa44, 0.65, 5.5, 2);
  candleLight.position.set(2.5, 1.2, 0);
  twGroup.add(candleLight);

  poiList.push({
    name: 'Ember Watchtower',
    pos: TW_POS,
    r: 16,
    flavor: 'A ruined tower half-reclaimed by moss. A carved stone reads: "Those who climb far, see far — those who see far, go farther."',
    onDiscover: 'climbUnlock'
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3.  ROPE / LOG BRIDGE  over a gorge
  // ─────────────────────────────────────────────────────────────────────────
  const BR_POS = { x: 46, z: -22 };
  const brGroup = new THREE.Group();
  const brBaseY = terrainHeight(BR_POS.x, BR_POS.z) - 1.2;
  brGroup.position.set(BR_POS.x, brBaseY, BR_POS.z);
  brGroup.rotation.y = 0.18;
  scene.add(brGroup);

  const PLANK_COUNT = 13;
  const BRIDGE_LEN  = 16;

  for (let i = 0; i < PLANK_COUNT; i++) {
    const t = i / (PLANK_COUNT - 1);
    const sag = Math.sin(t * Math.PI) * 0.55;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.13, 0.48), woodMat);
    plank.position.set(0, -sag, -BRIDGE_LEN / 2 + t * BRIDGE_LEN);
    plank.rotation.x = Math.sin(t * Math.PI) * 0.06;
    brGroup.add(plank);
  }

  // rope rails
  [-1.4, 1.4].forEach(rx => {
    // end posts
    [-BRIDGE_LEN / 2, BRIDGE_LEN / 2].forEach(rz => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.5, 6), darkWood);
      post.position.set(rx, 1.25, rz);
      brGroup.add(post);
    });
    // rope segments (8 pieces with sag)
    for (let s = 0; s < 8; s++) {
      const t  = (s + 0.5) / 8;
      const sag = Math.sin(t * Math.PI) * 0.38;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, BRIDGE_LEN / 8 + 0.12), ropeMat);
      seg.position.set(rx, 2.4 - sag, -BRIDGE_LEN / 2 + t * BRIDGE_LEN);
      brGroup.add(seg);
    }
  });

  // gorge walls
  [-BRIDGE_LEN / 2 - 2.5, BRIDGE_LEN / 2 + 2.5].forEach(offZ => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(6, 10, 5.5), gorgeMat);
    wall.position.set(0, -1.5, offZ);
    brGroup.add(wall);
    for (let j = 0; j < 4; j++) {
      const rb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + Math.random() * 0.6, 0), stoneMat);
      rb.position.set((Math.random() - 0.5) * 4, -0.5 + Math.random() * 4, offZ + (Math.random() - 0.5) * 2);
      brGroup.add(rb);
    }
  });

  poiList.push({ name: 'Ravine Bridge', pos: BR_POS, r: 12, flavor: 'A hand-built crossing of logs and rope. The gorge drops sharply below. The far side beckons.' });

  // ─────────────────────────────────────────────────────────────────────────
  // 4.  HERMIT'S CAMP
  // ─────────────────────────────────────────────────────────────────────────
  const HM_POS = { x: -80, z: -55 };
  const hmGroup = new THREE.Group();
  hmGroup.position.set(HM_POS.x, terrainHeight(HM_POS.x, HM_POS.z), HM_POS.z);
  scene.add(hmGroup);

  // tent / lean-to
  const tent = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.8, 4), tentMat);
  tent.rotation.y = Math.PI / 4;
  tent.position.set(-3, 1.9, 0);
  hmGroup.add(tent);

  const tenPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), darkWood);
  tenPole.position.set(-3, 2.1, 0);
  hmGroup.add(tenPole);

  // campfire
  const hmFire = new THREE.Group();
  hmFire.position.set(1.5, 0, 0);
  hmGroup.add(hmFire);

  const logMat2 = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 1, flatShading: true });
  const rockMat2 = new THREE.MeshStandardMaterial({ color: 0x5b5b57, roughness: 1, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6), logMat2);
    log.rotation.z = i % 2 === 0 ? 0.18 : -0.18;
    log.rotation.y = (i / 4) * Math.PI;
    log.position.set(Math.cos((i / 4) * Math.PI) * 0.18, 0.06, Math.sin((i / 4) * Math.PI) * 0.18);
    hmFire.add(log);
  }
  for (let i = 0; i < 4; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), rockMat2);
    rock.position.set(Math.cos(i * 1.2) * 0.28, 0.04, Math.sin(i * 1.2) * 0.28);
    hmFire.add(rock);
  }

  const hmFlameMat  = new THREE.MeshBasicMaterial({ color: 0xff7040, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
  const hmFlame2Mat = new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
  const hmFlame  = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 7), hmFlameMat);
  const hmFlame2 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.45, 7), hmFlame2Mat);
  hmFlame.position.set(0, 0.4, 0);   hmFlame.rotation.x  = Math.PI;
  hmFlame2.position.set(0, 0.38, 0); hmFlame2.rotation.x = Math.PI;
  hmFire.add(hmFlame, hmFlame2);

  const hmFireLight = new THREE.PointLight(0xffb070, 1.8, 10, 2);
  hmFireLight.position.set(0, 0.5, 0);
  hmFire.add(hmFireLight);

  // log seat
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.6, 8), logMat2);
  seat.rotation.z = Math.PI / 2;
  seat.position.set(-0.4, 0.3, 1.9);
  hmGroup.add(seat);

  // bucket
  const toolMat = new THREE.MeshStandardMaterial({ color: 0x7a7260, roughness: 1, flatShading: true });
  const bucket  = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.32, 8), toolMat);
  bucket.position.set(2.2, 0.16, -1.2);
  hmGroup.add(bucket);

  // drying rack with herbs
  const rk1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 6), darkWood);
  rk1.position.set(-4.5, 1.1, 1);
  hmGroup.add(rk1);
  const rk2 = rk1.clone(); rk2.position.set(-3.5, 1.1, 1); hmGroup.add(rk2);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 5), darkWood);
  bar.rotation.z = Math.PI / 2; bar.position.set(-4, 2.2, 1); hmGroup.add(bar);

  const herbMat = new THREE.MeshStandardMaterial({ color: 0x5a8040, roughness: 1, flatShading: true });
  for (let h = 0; h < 5; h++) {
    const herb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.12), herbMat);
    herb.position.set(-4.4 + h * 0.22, 2.0, 1);
    herb.rotation.z = (Math.random() - 0.5) * 0.5;
    hmGroup.add(herb);
  }

  poiList.push({
    name: "Hermit's Hollow",
    pos: HM_POS,
    r: 14,
    flavor: "A lone camp deep in the woods. Herbs hang to dry. The fire crackles. Whoever lives here hasn't gone far."
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5.  FISHING POND
  // ─────────────────────────────────────────────────────────────────────────
  const PD_POS = { x: 52, z: 36 };
  const pdGroup = new THREE.Group();
  pdGroup.position.set(PD_POS.x, terrainHeight(PD_POS.x, PD_POS.z) - 0.35, PD_POS.z);
  scene.add(pdGroup);

  const pondWaterMat = waterMat.clone();
  const pondMesh = new THREE.Mesh(new THREE.CircleGeometry(7.5, 24), pondWaterMat);
  pondMesh.rotation.x = -Math.PI / 2;
  pondMesh.position.y = 0.06;
  pdGroup.add(pondMesh);

  const pondFoamMat = foamMat.clone();
  const pondFoam = new THREE.Mesh(new THREE.RingGeometry(7.1, 8.8, 24), pondFoamMat);
  pondFoam.rotation.x = -Math.PI / 2;
  pondFoam.position.y = 0.07;
  pdGroup.add(pondFoam);

  const lilyMat = new THREE.MeshStandardMaterial({ color: 0x2e5a26, roughness: 1, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 2 + Math.random() * 4;
    const lily = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 0.4, 8), lilyMat);
    lily.rotation.x = -Math.PI / 2;
    lily.position.set(Math.cos(ang) * rad, 0.09, Math.sin(ang) * rad);
    pdGroup.add(lily);
  }

  const reedMat    = new THREE.MeshStandardMaterial({ color: 0x7a9040, roughness: 1, flatShading: true });
  const cattailMat = new THREE.MeshStandardMaterial({ color: 0x5c4020, roughness: 1, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const rad = 7.4 + Math.random() * 1.8;
    const tx  = Math.cos(ang) * rad, tz = Math.sin(ang) * rad;
    const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.8, 5), reedMat);
    reed.position.set(tx, 0.9, tz);
    pdGroup.add(reed);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.35, 5), cattailMat);
    top.position.set(tx, 1.96, tz);
    pdGroup.add(top);
  }

  poiList.push({ name: 'Millpond', pos: PD_POS, r: 14, flavor: 'Still water mirrors the sky. Dragonflies drift over lily pads.' });

  // ─────────────────────────────────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────────────────────────────────
  let hmFireOn = true;

  function update(dt, t, isSummer) {
    // waterfall stream
    for (let i = 0; i < WF_COUNT; i++) {
      wfAge[i] += dt;
      wfPos[i * 3 + 1] -= dt * 7.5;
      wfPos[i * 3]     += Math.sin(t * 2 + wfSeed[i]) * 0.04 * dt;
      if (wfPos[i * 3 + 1] < 0.5) resetWF(i, false);
    }
    wfGeo.attributes.position.needsUpdate = true;

    // mist drift
    for (let i = 0; i < MIST_COUNT; i++) {
      mistPos[i * 3]     += Math.sin(t * 0.5 + mistSeed[i]) * 0.2 * dt;
      mistPos[i * 3 + 1] += 0.25 * dt;
      if (mistPos[i * 3 + 1] > 3.5) {
        mistPos[i * 3 + 1] = 0;
        mistPos[i * 3]     = (Math.random() - 0.5) * 6;
      }
    }
    mistGeo.attributes.position.needsUpdate = true;
    wfLight.intensity = 1.2 + Math.sin(t * 4.2) * 0.2;

    // hermit fire
    hmFireOn = !isSummer;
    hmFlame.visible  = hmFireOn;
    hmFlame2.visible = hmFireOn;
    hmFireLight.visible = hmFireOn;
    if (hmFireOn) {
      const f = 0.85 + 0.1 * Math.sin(t * 9.3) + 0.08 * Math.sin(t * 22 + 1.2) + (Math.random() - 0.5) * 0.04;
      hmFlame.scale.set(f, f * 1.1, f);
      hmFlame2.scale.set(f * 0.8, f * 1.05, f * 0.8);
      hmFireLight.intensity = 1.6 + 0.25 * Math.sin(t * 8.7) + (Math.random() - 0.5) * 0.12;
    }

    // pond shimmer
    pondWaterMat.opacity = 0.74 + Math.sin(t * 1.3) * 0.04;

    // candle flicker
    candleLight.intensity = 0.5 + Math.sin(t * 7 + 0.8) * 0.12;
  }

  return { poiList, update, WF_POS, TW_POS, BR_POS, HM_POS, PD_POS };
}
