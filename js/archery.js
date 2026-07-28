// archery.js — bow & arrow system: aim, charge, fire, arrow physics, hit registry.
// Uses the global THREE (same as the rest of the game).
//
// Controls:  hold  F  (or the mobile AIM button) to draw, release to loose.
//            arrows arc with gravity and stick into terrain/objects.
export function createArchery({
  scene,
  camera,
  player,
  terrainHeight,
  inventory,
  getAimOffset = () => 0,
  onEvent = () => {}
}) {
  const GRAVITY = 18;
  const MAX_SPEED = 62;
  const MIN_SPEED = 26;
  const DRAW_TIME = 1.1;          // seconds to full power
  const ARROW_LIFE = 9;

  // ---------- hit registry ----------
  // register({ getPos(), radius, onHit(power, arrowPos), name })
  const targets = [];
  function register(target) {
    targets.push(target);
    return () => {
      const i = targets.indexOf(target);
      if (i >= 0) targets.splice(i, 1);
    };
  }

  // ---------- meshes ----------
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xd7c39a, roughness: 1, flatShading: true });
  const headMat  = new THREE.MeshStandardMaterial({ color: 0x8f9aa5, roughness: 0.6, metalness: 0.4, flatShading: true });
  const fletchMat = new THREE.MeshStandardMaterial({ color: 0xb5433a, roughness: 1, side: THREE.DoubleSide, flatShading: true });
  const bowMat   = new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 1, flatShading: true });
  const stringMat = new THREE.MeshBasicMaterial({ color: 0xe9e2d0 });

  function makeArrowMesh() {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.0, 5), shaftMat);
    shaft.rotation.x = Math.PI / 2;
    g.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 4), headMat);
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.58;
    g.add(head);
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), fletchMat);
      f.position.z = -0.42;
      f.rotation.z = (i / 3) * Math.PI * 2;
      f.rotation.y = Math.PI / 2;
      g.add(f);
    }
    return g;
  }

  // ---------- bow held by the player ----------
  const bow = new THREE.Group();
  const limb = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 5, 12, Math.PI * 1.15), bowMat);
  limb.rotation.z = Math.PI * 0.5;
  bow.add(limb);
  const stringGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.52, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.52, 0)
  ]);
  const bowString = new THREE.Line(stringGeo, stringMat);
  bow.add(bowString);
  const nocked = makeArrowMesh();
  nocked.scale.setScalar(0.9);
  bow.add(nocked);
  bow.visible = false;
  scene.add(bow);

  // ---------- flying arrows ----------
  const arrows = [];
  const stuck = [];

  // ---------- crosshair / power UI ----------
  const ui = document.createElement('div');
  Object.assign(ui.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 14,
    opacity: '0', transition: 'opacity .18s ease'
  });
  ui.innerHTML = `
    <div id="archCross" style="position:absolute;left:50%;top:50%;width:26px;height:26px;
      transform:translate(-50%,-50%);border:1.5px solid rgba(255,255,255,.85);border-radius:50%;
      box-shadow:0 0 8px rgba(0,0,0,.6)"></div>
    <div style="position:absolute;left:50%;top:calc(50% + 26px);transform:translateX(-50%);
      width:120px;height:5px;background:rgba(0,0,0,.45);border-radius:3px;overflow:hidden">
      <div id="archPower" style="width:0%;height:100%;background:linear-gradient(90deg,#ffd479,#ff6b3d)"></div>
    </div>
    <div id="archAmmo" style="position:absolute;left:50%;top:calc(50% + 42px);transform:translateX(-50%);
      color:#eee;font-size:11px;letter-spacing:2px;text-shadow:0 2px 6px #000">🏹 0</div>`;
  document.body.appendChild(ui);
  const powerEl = ui.querySelector('#archPower');
  const ammoEl = ui.querySelector('#archAmmo');
  const crossEl = ui.querySelector('#archCross');

  let drawing = false;
  let draw = 0;
  const handPos = new THREE.Vector3();
  const hasRig = typeof player.setArcheryPose === 'function';
  let aiming = false;
  let cooldown = 0;
  const tmpDir = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();

  function fire() {
    const power = Math.max(0.12, Math.min(1, draw / DRAW_TIME));
    draw = 0;
    if (!inventory.take('arrow', 1)) { flash('out of arrows'); return; }

    camera.getWorldDirection(tmpDir);
    // Spawn from the bow hand so the arrow leaves the rig, not the hips.
    if (hasRig && player.getBowHand && player.getBowHand()) {
      player.getBowHand().getWorldPosition(tmpPos);
    } else {
      tmpPos.copy(player.position);
      tmpPos.y += 1.55;
    }
    tmpPos.addScaledVector(tmpDir, 0.35);

    const mesh = makeArrowMesh();
    mesh.position.copy(tmpPos);
    scene.add(mesh);
    arrows.push({
      mesh,
      vel: tmpDir.clone().multiplyScalar(MIN_SPEED + (MAX_SPEED - MIN_SPEED) * power),
      life: ARROW_LIFE,
      power
    });
    onEvent('shot', { power });
  }

  let flashTimer = 0;
  function flash(text) {
    ammoEl.textContent = text;
    flashTimer = 1.2;
  }

  function landArrow(a, pos) {
    a.mesh.position.copy(pos);
    scene.add(a.mesh);
    stuck.push({ mesh: a.mesh, life: 22 });
    if (stuck.length > 24) {
      const old = stuck.shift();
      scene.remove(old.mesh);
    }
  }

  function update(dt, keys) {
    cooldown = Math.max(0, cooldown - dt);
    const mounted = !!player.mounted;
    const canAim = !mounted && !player.sitting && (player.canUseArchery === undefined || player.canUseArchery);
    const wantAim = !!keys['f'] && canAim;

    // draw / release
    if (wantAim && !drawing && cooldown <= 0) { drawing = true; draw = 0; }
    if (drawing) {
      draw = Math.min(DRAW_TIME * 1.4, draw + dt);
      if (!wantAim) {
        drawing = false;
        if (canAim) fire(); else draw = 0;
        cooldown = 0.35;
      }
    }
    aiming = drawing;

    // ---- drive the character rig: yaw toward the camera, draw the bow ----
    const pull = Math.min(1, draw / DRAW_TIME);
    camera.getWorldDirection(tmpDir);
    if (hasRig) player.setArcheryPose(aiming, pull, aiming ? getAimOffset() : null);

    // bow follows the left hand of the rig and points where you look
    bow.visible = aiming && !mounted;
    if (bow.visible) {
      if (hasRig && player.getBowHand && player.getBowHand()) {
        player.getBowHand().getWorldPosition(handPos);
        bow.position.copy(handPos);
      } else {
        bow.position.copy(player.position);
        bow.position.y += 1.45;
        bow.position.addScaledVector(tmpDir, 0.55);
      }
      bow.lookAt(bow.position.clone().add(tmpDir));
      bow.rotation.z += Math.PI * 0.5; // limbs vertical, like a held longbow
      nocked.position.z = -0.18 - pull * 0.35;
      bowString.scale.x = 1 + pull * 1.6;
    }

    // ui
    ui.style.opacity = aiming ? '1' : '0';
    const pct = pull;
    powerEl.style.width = `${pct * 100}%`;
    crossEl.style.width = crossEl.style.height = `${26 - pct * 12}px`;
    if (flashTimer > 0) flashTimer -= dt;
    else ammoEl.textContent = `🏹 ${inventory.count('arrow')}`;

    // arrow physics
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i];
      a.life -= dt;
      a.vel.y -= GRAVITY * dt;
      a.mesh.position.addScaledVector(a.vel, dt);
      a.mesh.lookAt(a.mesh.position.clone().add(a.vel));

      let consumed = false;

      // target hits
      for (const t of targets) {
        if (t.dead) continue;
        const p = t.getPos();
        if (a.mesh.position.distanceTo(p) <= (t.radius || 1)) {
          t.onHit(a.power, a.mesh.position.clone());
          onEvent('hit', { name: t.name, power: a.power });
          consumed = true;
          break;
        }
      }

      // ground
      const gy = terrainHeight(a.mesh.position.x, a.mesh.position.z);
      if (!consumed && a.mesh.position.y <= gy + 0.05) {
        a.mesh.position.y = gy + 0.04;
        landArrow(a, a.mesh.position);
        onEvent('miss', {});
        arrows.splice(i, 1);
        continue;
      }

      if (consumed || a.life <= 0 || Math.hypot(a.mesh.position.x, a.mesh.position.z) > 320) {
        scene.remove(a.mesh);
        arrows.splice(i, 1);
      }
    }

    for (let i = stuck.length - 1; i >= 0; i--) {
      stuck[i].life -= dt;
      if (stuck[i].life <= 0) { scene.remove(stuck[i].mesh); stuck.splice(i, 1); }
    }
  }

  return { update, register, get aiming() { return aiming; }, makeArrowMesh };
}
