// balloon.js — a tethered hot-air balloon ride: a calm, contemplative
// viewpoint activity (no combat, no timer). Press E near the basket to
// board; W/S rise and descend along the tether within a max height; the
// balloon drifts gently with the world's wind value. Press E again to
// return to the ground and step out.
export function createBalloon(scene, terrainHeight, collision, options = {}) {
  const position = options.position || { x: -230, z: -52 };
  const onEvent = options.onEvent || (() => {});
  const maxHeight = options.maxHeight ?? 46;
  const px = position.x, pz = position.z;
  const baseY = terrainHeight(px, pz);

  const envelopeMat = new THREE.MeshStandardMaterial({ color: 0xd9642c, roughness: 0.85, flatShading: true });
  const stripeMat   = new THREE.MeshStandardMaterial({ color: 0xf3e0b0, roughness: 0.85, flatShading: true });
  const basketMat   = new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 1, flatShading: true });
  const ropeMat     = new THREE.MeshStandardMaterial({ color: 0xb0955a, roughness: 1, flatShading: true });
  const burnerMat   = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.6, flatShading: true });
  const flameMat    = new THREE.MeshBasicMaterial({ color: 0xff7428, transparent: true, opacity: 0.92, depthWrite: false });
  const flameCoreMat = new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.98, depthWrite: false });
  const postMat     = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1, flatShading: true });

  // ---------- ground platform + anchor post ----------
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.3, 12), postMat);
  platform.position.set(px, baseY + 0.15, pz);
  scene.add(platform);
  const anchorPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5, 6), postMat);
  anchorPost.position.set(px + 2.6, baseY + 2.5, pz);
  scene.add(anchorPost);
  if (collision) collision.addCollider(px, pz, 3.7);

  // ---------- balloon rig (rises/falls as one group) ----------
  const rig = new THREE.Group();
  rig.position.set(px, baseY, pz);
  scene.add(rig);

  const envelope = new THREE.Group();
  const gores = 10;
  for (let i = 0; i < gores; i++) {
    const a = (i / gores) * Math.PI * 2;
    const panel = new THREE.Mesh(new THREE.SphereGeometry(2.6, 6, 8, a, (Math.PI * 2) / gores, 0, Math.PI * 0.62), i % 2 === 0 ? envelopeMat : stripeMat);
    envelope.add(panel);
  }
  envelope.position.y = 8.5;
  rig.add(envelope);
  const envelopeNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.0, 1.2, 10), envelopeMat);
  envelopeNeck.position.y = 5.6;
  rig.add(envelopeNeck);

  // shroud lines from envelope base to basket corners
  const basketY = 4.4;
  [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([x, z]) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x * 1.1, 5.2, z * 1.1),
      new THREE.Vector3(x, basketY + 0.6, z)
    ]);
    rig.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xb0955a })));
  });

  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 1.9), basketMat);
  basket.position.y = basketY;
  rig.add(basket);
  const burnerRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 12), burnerMat);
  burnerRing.rotation.x = Math.PI / 2;
  burnerRing.position.y = basketY + 0.85;
  rig.add(burnerRing);
  // A layered burner flame stays visible even against a night sky.  The old
  // single cone was small and hidden inside the neck of the envelope.
  const flame = new THREE.Group();
  flame.position.y = basketY + 1.3;
  const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.85, 7), flameMat);
  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.23, 1.35, 6), flameCoreMat);
  innerFlame.position.y = 0.08;
  const flameGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffc15a, transparent: true, opacity: 0.45, depthWrite: false })
  );
  flameGlow.position.y = -0.55;
  flame.add(outerFlame, innerFlame, flameGlow);
  rig.add(flame);
  const flameLight = new THREE.PointLight(0xff9a3d, 2.2, 10, 2);
  flameLight.position.y = basketY + 1.65;
  rig.add(flameLight);

  // tether rope (visual, from post to basket, sags as balloon rises)
  const tetherGeo = new THREE.BufferGeometry();
  const tether = new THREE.Line(tetherGeo, new THREE.LineBasicMaterial({ color: 0x8a7452 }));
  scene.add(tether);
  // Every landing gets its own visible mooring stake and rope.  This makes a
  // landed balloon feel secured to the trail instead of suspended in place.
  const mooring = new THREE.Group();
  const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.4, 6), postMat);
  stake.position.y = 1.2;
  const stakeCap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 6), burnerMat);
  stakeCap.position.y = 2.55;
  const tieBar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.2, 6), postMat);
  tieBar.rotation.z = Math.PI / 2;
  tieBar.position.y = 1.65;
  mooring.add(stake, stakeCap, tieBar);
  scene.add(mooring);
  const mooringGeo = new THREE.BufferGeometry();
  const mooringLine = new THREE.Line(mooringGeo, new THREE.LineBasicMaterial({ color: 0xc1a16a }));
  scene.add(mooringLine);
  function updateTether(riseAmt, basketX = px, basketZ = pz, groundY = baseY) {
    const basketWorldY = groundY + basketY + riseAmt;
    const pts = [];
    const segs = 10;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = THREE.MathUtils.lerp(px + 2.6, basketX, t);
      const y = THREE.MathUtils.lerp(baseY + 2.5, basketWorldY, t) - Math.sin(t * Math.PI) * (0.6 + riseAmt * 0.02);
      const z = THREE.MathUtils.lerp(pz, basketZ, t);
      pts.push(new THREE.Vector3(x, y, z));
    }
    tetherGeo.setFromPoints(pts);
  }
  function updateMooring(groundY) {
    const stakeX = flightX + Math.cos(heading + Math.PI / 2) * 2.35;
    const stakeZ = flightZ - Math.sin(heading + Math.PI / 2) * 2.35;
    mooring.position.set(stakeX, groundY, stakeZ);
    mooring.rotation.y = heading;
    const start = new THREE.Vector3(stakeX, groundY + 1.65, stakeZ);
    const end = new THREE.Vector3(flightX, groundY + basketY - 0.1, flightZ);
    const middle = start.clone().lerp(end, 0.5);
    middle.y -= 0.45;
    mooringGeo.setFromPoints([start, middle, end]);
  }
  updateTether(0);

  // ---------- prompt UI ----------
  const promptEl = document.createElement('div');
  Object.assign(promptEl.style, {
    position: 'fixed', left: '50%', bottom: '26%', transform: 'translateX(-50%)',
    padding: '8px 16px', background: 'rgba(20,16,12,0.76)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '14px', borderRadius: '9px',
    border: '1px solid rgba(255,255,255,0.18)', opacity: '0', transition: 'opacity 0.22s',
    pointerEvents: 'none', zIndex: '50'
  });
  promptEl.classList.add('context-prompt');
  promptEl.dataset.mobileKey = 'e';
  document.body.appendChild(promptEl);

  const poiList = [{
    name: 'Sky Lantern Balloon',
    pos: { x: px, z: pz },
    r: 20,
    flavor: 'A tethered balloon waits, its burner idling. From up there, the whole valley must be visible.'
  }];

  // ---------- state ----------
  const MOUNT_RADIUS = 10;
  let riding = false;
  let rise = 0; // 0..maxHeight
  let sway = 0;
  let flightX = px;
  let flightZ = pz;
  let heading = 0;
  let forwardSpeed = 0;
  let verticalSpeed = 0;
  // World-space altitude is deliberately independent of the terrain below.
  // Without this, crossing the edge of Skyhold made the balloon instantly
  // inherit the lower valley floor and appear to drop by the mountain height.
  let flightY = baseY;
  let prevE = false;

  function nearBalloon(pos) {
    return Math.hypot(pos.x - flightX, pos.z - flightZ) < MOUNT_RADIUS;
  }

  function board(player) {
    if (player.mounted) player.dismount();
    // Preserve the current real position if boarding after a save / landing.
    flightY = Math.max(flightY, terrainHeight(flightX, flightZ) + rise);
    riding = true;
    player.setVehiclePose('balloon');
    player.setExternalControl(true);
    onEvent('mount');
  }

  function alight(player) {
    if (rise > 0.4) return;
    riding = false;
    player.setVehiclePose('none');
    player.setExternalControl(false);
    const side = 3.0;
    player.teleportWalker(flightX + side, terrainHeight(flightX + side, flightZ), flightZ, heading);
    onEvent('dismount');
  }

  function update(dt, keys, player, elapsed, windX = 0) {
    const pos = player.position;
    const dist = Math.hypot(pos.x - flightX, pos.z - flightZ);
    const shouldRender = riding || dist < 220;
    rig.visible = shouldRender;
    platform.visible = shouldRender;
    anchorPost.visible = shouldRender;
    tether.visible = shouldRender && riding && Math.hypot(flightX - px, flightZ - pz) < 58;
    mooring.visible = shouldRender && !riding;
    mooringLine.visible = shouldRender && !riding;
    if (!shouldRender && !riding) return;

    const canBoard = !riding && !player.sitting && nearBalloon(pos);
    promptEl.textContent = riding
      ? (rise > 0.7 ? 'W/S fly · A/D turn · Shift/Space rise · Ctrl/C descend' : 'Press E to leave the balloon')
      : 'Press E to board the balloon';
    promptEl.style.opacity = (riding || canBoard) ? '1' : '0';

    const eDown = !!keys['e'];
    if (eDown && !prevE) {
      if (riding) alight(player);
      else if (canBoard) board(player);
      keys['e'] = false;
    }
    prevE = eDown;

    // idle burner flicker
    const flicker = 0.85 + 0.15 * Math.sin(elapsed * 9) + (Math.random() - 0.5) * 0.05;
    flame.scale.set(0.92 + flicker * 0.18, 0.92 + flicker * 0.32, 0.92 + flicker * 0.18);
    flame.rotation.y = elapsed * 2.4;
    flame.rotation.z = Math.sin(elapsed * 5.5) * 0.08;
    flameLight.intensity = 0.9 + Math.sin(elapsed * 7) * 0.2;

    if (riding) {
      sway += dt * 0.55;
      const forward = (Number(keys.joyForward) || 0) ||
        ((keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0));
      const turn = (Number(keys.joyTurn) || 0) ||
        ((keys['a'] || keys['arrowleft'] ? 1 : 0) - (keys['d'] || keys['arrowright'] ? 1 : 0));
      const lift = (keys['shift'] || keys[' '] ? 1 : 0) - (keys['ctrl'] || keys['c'] ? 1 : 0);

      // Balloon steering has inertia: it turns into the wind rather than
      // sliding sideways like a character controller.
      heading += turn * 1.2 * dt;
      const targetForward = forward * (8.5 + Math.min(4, rise * 0.035));
      forwardSpeed += (targetForward - forwardSpeed) * Math.min(1, dt * 2.6);
      const targetVertical = lift * 8.5;
      verticalSpeed += (targetVertical - verticalSpeed) * Math.min(1, dt * 3.2);
      // Ceiling remains the same absolute height the balloon had before this
      // change.  Ground height only supplies a collision floor, never a
      // reference that pulls a flying balloon downward.
      const localGroundY = terrainHeight(flightX, flightZ);
      flightY = THREE.MathUtils.clamp(
        flightY + verticalSpeed * dt,
        localGroundY,
        baseY + maxHeight
      );
      flightX = THREE.MathUtils.clamp(flightX + (Math.sin(heading) * forwardSpeed + windX * (0.55 + rise * 0.012)) * dt, -560, 560);
      flightZ = THREE.MathUtils.clamp(flightZ + Math.cos(heading) * forwardSpeed * dt, -560, 560);
      const groundAfterMove = terrainHeight(flightX, flightZ);
      // A newly-risen ridge can still catch the basket, but flying off a
      // ridge leaves the balloon at exactly the world altitude it had.
      flightY = Math.max(flightY, groundAfterMove);
      rise = Math.max(0, flightY - groundAfterMove);
      const driftX = Math.sin(sway) * 0.55;
      const driftZ = Math.cos(sway * 0.8) * 0.45;
      rig.position.set(flightX + driftX, flightY, flightZ + driftZ);
      rig.rotation.y = heading;
      rig.rotation.z = Math.sin(sway * 0.7) * 0.035;
      rig.rotation.x = Math.sin(sway * 0.5) * 0.02 - THREE.MathUtils.clamp(forwardSpeed * 0.008, -0.07, 0.07);
      if (tether.visible) updateTether(rise, rig.position.x, rig.position.z, groundAfterMove);

      // keep the player seated in the basket
      // Walker origin is at the feet; place it on the basket rim so the full
      // seated body reads above the wicker rather than buried inside it.
      player.teleportWalker(rig.position.x, rig.position.y + basketY + 0.92, rig.position.z, heading);
      player.setExternalSpeed(Math.abs(forwardSpeed) * 0.24 + Math.abs(verticalSpeed) * 0.1);

    } else {
      const localGroundY = terrainHeight(flightX, flightZ);
      rise = 0;
      flightY = localGroundY;
      forwardSpeed = 0;
      verticalSpeed = 0;
      rig.position.set(flightX, localGroundY, flightZ);
      rig.rotation.y = heading;
      rig.rotation.z = 0;
      rig.rotation.x = 0;
      updateMooring(localGroundY);
    }
  }

  return {
    update, poiList, position: { x: px, z: pz },
    getState() { return { x: flightX, z: flightZ, rise, flightY, heading, riding }; },
    restoreState(state = {}) {
      if (Number.isFinite(state.x)) flightX = state.x;
      if (Number.isFinite(state.z)) flightZ = state.z;
      rise = Number.isFinite(state.rise) ? Math.max(0, state.rise) : 0;
      flightY = Number.isFinite(state.flightY)
        ? state.flightY
        : terrainHeight(flightX, flightZ) + rise;
      if (Number.isFinite(state.heading)) heading = state.heading;
    },
    get riding() { return riding; }
  };
}
