// archery.js — first-person bow & arrow system.
// Hold F (or the mobile AIM button) to raise & draw the bow. While drawn you
// can freely look around (drag to aim) — release to loose, and the arrow
// always flies exactly where the reticle/camera is pointing. Arrows stick
// and remain visible wherever they land, including on hit targets/animals.
import { WORLD_RADIUS } from './perf.js';

export function createArchery({
  scene,
  camera,
  player,
  terrainHeight,
  inventory,
  getAimOffset = () => 0,
  onEvent = () => {}
}) {
  const GRAVITY = 0;        // was 18 — less drop over distance
const MAX_SPEED = 85;       // was 62 — reaches far targets faster/flatter
const MIN_SPEED = 80;       // was 26 — even weak draws still reach range targets
  const DRAW_TIME = 1.1;
  const ARROW_LIFE = 100;

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

  // ---------- materials ----------
  const shaftMat   = new THREE.MeshStandardMaterial({ color: 0xd7c39a, roughness: 1, flatShading: true });
  const headMat    = new THREE.MeshStandardMaterial({ color: 0x8f9aa5, roughness: 0.6, metalness: 0.4, flatShading: true });
  const fletchMat  = new THREE.MeshStandardMaterial({ color: 0xb5433a, roughness: 1, side: THREE.DoubleSide, flatShading: true });
  const bowLimbMat = new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.9, flatShading: true });
  const bowGripMat = new THREE.MeshStandardMaterial({ color: 0x3f2a19, roughness: 0.9, flatShading: true });
  const stringMat  = new THREE.MeshBasicMaterial({ color: 0xe9e2d0 });
  
  // Fiery arrow materials
  const fieryMat   = new THREE.MeshStandardMaterial({ 
    color: 0xff6600, 
    emissive: 0xff4400, 
    emissiveIntensity: 2, 
    roughness: 0.8, 
    flatShading: true 
  });
  const glowMat    = new THREE.MeshBasicMaterial({ 
    color: 0xffaa00, 
    transparent: true, 
    opacity: 0.6 
  });

  // Head points toward local -Z so it lines up with an object's forward
  // direction after either lookAt() (flying arrows) or a quaternion copy
  // from the camera (the nocked arrow on the bow view-model).
  function makeArrowMesh() {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.0, 5), shaftMat);
    shaft.rotation.x = Math.PI / 2;
    g.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 4), fieryMat);
    head.rotation.x = -Math.PI / 2;
    head.position.z = -0.58;
    g.add(head);
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), fletchMat);
      f.position.z = 0.42;
      f.rotation.z = (i / 3) * Math.PI * 2;
      f.rotation.y = Math.PI / 2;
      g.add(f);
    }
    
    // Add fiery glow effect around the arrow head
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), glowMat);
    glow.position.z = -0.4;
    g.add(glow);
    
    // Add point light for dynamic lighting
    const arrowLight = new THREE.PointLight(0xff6600, 0.6, 2.5, 1.2);
    arrowLight.position.z = -0.4;
    g.add(arrowLight);
    g.userData.light = arrowLight;
    
    return g;
  }

  // ---------- bow view-model ----------
  // Not attached to the character rig at all — every frame we copy the
  // camera's position/orientation onto it and offset it in camera-local
  // space, exactly like a weapon view-model in an FPS. This guarantees the
  // bow always reads as "aimed" wherever the camera/reticle points.
  const bow = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.34, 6), bowGripMat);
  bow.add(grip);
  const limbTop = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.6, 5), bowLimbMat);
  limbTop.position.y = 0.46;
  limbTop.rotation.z = 0.16;
  bow.add(limbTop);
  const limbBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.6, 5), bowLimbMat);
  limbBottom.position.y = -0.46;
  limbBottom.rotation.z = -0.16;
  bow.add(limbBottom);

  const stringGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.02, 0.75, 0),
    new THREE.Vector3(0.02, 0, 0),
    new THREE.Vector3(0.02, -0.75, 0)
  ]);
  const bowString = new THREE.Line(stringGeo, stringMat);
  bow.add(bowString);

  const nocked = makeArrowMesh();
  nocked.scale.setScalar(0.85);
  nocked.position.set(0.02, 0, -0.05);
  bow.add(nocked);

  bow.visible = false;
  scene.add(bow);

  // ---------- flying / stuck arrows ----------
  const arrows = [];
  const stuck = [];

  // ---------- HUD: scope vignette + reticle + power + ammo ----------
  const ui = document.createElement('div');
  Object.assign(ui.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 14,
    opacity: '0', transition: 'opacity .18s ease'
  });
  ui.innerHTML = `
    <div style="position:absolute;inset:0;
      background:radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 36%, rgba(0,0,0,0.5) 100%)"></div>
    <div id="archReticle" style="position:absolute;left:50%;top:50%;width:64px;height:64px;
      transform:translate(-50%,-50%);transition:transform .1s ease">
      <div style="position:absolute;inset:0;border:1.5px solid rgba(255,255,255,.65);border-radius:50%"></div>
      <div id="archPin" style="position:absolute;left:50%;top:50%;width:5px;height:5px;
        transform:translate(-50%,-50%);border-radius:50%;background:#ffd479;
        box-shadow:0 0 6px rgba(255,180,90,.9)"></div>
      <div style="position:absolute;left:50%;top:-14px;width:1.5px;height:10px;background:rgba(255,255,255,.6);transform:translateX(-50%)"></div>
      <div style="position:absolute;left:50%;bottom:-14px;width:1.5px;height:10px;background:rgba(255,255,255,.6);transform:translateX(-50%)"></div>
      <div style="position:absolute;top:50%;left:-14px;height:1.5px;width:10px;background:rgba(255,255,255,.6);transform:translateY(-50%)"></div>
      <div style="position:absolute;top:50%;right:-14px;height:1.5px;width:10px;background:rgba(255,255,255,.6);transform:translateY(-50%)"></div>
    </div>
    <div style="position:absolute;left:50%;top:calc(50% + 46px);transform:translateX(-50%);
      width:120px;height:5px;background:rgba(0,0,0,.45);border-radius:3px;overflow:hidden">
      <div id="archPower" style="width:0%;height:100%;background:linear-gradient(90deg,#ffd479,#ff6b3d)"></div>
    </div>
    <div id="archAmmo" style="position:absolute;left:50%;top:calc(50% + 62px);transform:translateX(-50%);
      color:#eee;font-size:11px;letter-spacing:2px;text-shadow:0 2px 6px #000">🏹 0</div>`;
  document.body.appendChild(ui);
  const powerEl = ui.querySelector('#archPower');
  const ammoEl = ui.querySelector('#archAmmo');
  const reticleEl = ui.querySelector('#archReticle');
  const pinEl = ui.querySelector('#archPin');

  let drawing = false;
  let draw = 0;
  let aiming = false;
  let cooldown = 0;
  let kick = 0;
  const tmpDir = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const segmentDelta = new THREE.Vector3();
  const impactPoint = new THREE.Vector3();

  function sweptHit(start, end, center, radius) {
    segmentDelta.subVectors(end, start);
    const lengthSq = segmentDelta.lengthSq();
    const effectiveRadius = Math.max(radius, 0.7) + 0.18;
    const effectiveRadiusSq = effectiveRadius * effectiveRadius;

    if (lengthSq <= 0.000001) {
      impactPoint.copy(start);
      return impactPoint.distanceToSquared(center) <= effectiveRadiusSq;
    }

    const steps = Math.max(4, Math.min(16, Math.ceil(Math.sqrt(lengthSq) / 0.35)));
    const step = 1 / steps;
    let bestDistSq = Infinity;
    let bestPoint = null;

    for (let i = 0; i <= steps; i++) {
      const t = i * step;
      impactPoint.copy(start).lerp(end, t);
      const distSq = impactPoint.distanceToSquared(center);
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestPoint = impactPoint.clone();
      }
      if (distSq <= effectiveRadiusSq) {
        impactPoint.copy(bestPoint || impactPoint);
        return true;
      }
    }

    impactPoint.copy(bestPoint || end);
    return false;
  }

  function fire() {
    const power = Math.max(0.12, Math.min(1, draw / DRAW_TIME));
    draw = 0;
    if (!inventory.take('arrow', 1)) { flash('out of arrows'); return; }

    // Fires along the exact camera direction the reticle is showing —
    // there's no separate "aim point" to drift out of sync with anymore.
    camera.getWorldDirection(tmpDir);
    camera.getWorldPosition(tmpPos);
    tmpPos.addScaledVector(tmpDir, 0.6);

    const mesh = makeArrowMesh();
    mesh.position.copy(tmpPos);
    mesh.lookAt(mesh.position.clone().add(tmpDir));
    scene.add(mesh);
    arrows.push({
      mesh,
      vel: tmpDir.clone().multiplyScalar(MIN_SPEED + (MAX_SPEED - MIN_SPEED) * power),
      life: ARROW_LIFE,
      power
    });
    kick = 0; // Removed kick entirely to prevent camera jump
    onEvent('shot', { power });
  }

  let flashTimer = 0;
  function flash(text) {
    ammoEl.textContent = text;
    flashTimer = 1.2;
  }

  function landArrow(a, pos, life = 999) {
    a.mesh.position.copy(pos);
    scene.add(a.mesh);
    stuck.push({ mesh: a.mesh, life: 999 }); // Arrows stay indefinitely
    if (stuck.length > 50) { // Increased limit
      const old = stuck.shift();
      scene.remove(old.mesh);
    }
  }

  // Clear stuck arrows when player moves significantly
  let lastPlayerPos = new THREE.Vector3();
  function clearArrowsOnMove() {
    const currentPos = player.group?.position || player.position;
    if (currentPos) {
      const moveDist = currentPos.distanceTo(lastPlayerPos);
      if (moveDist > 5) { // Clear arrows if player moves 5+ units
        stuck.forEach(s => scene.remove(s.mesh));
        stuck.length = 0;
        lastPlayerPos.copy(currentPos);
      }
    }
  }

  function updateBowTransform(t, pull) {
    bow.position.copy(camera.position);
    bow.quaternion.copy(camera.quaternion);
    bow.translateX(0.34);
    bow.translateY(-0.24 - pull * 0.015);
    bow.translateZ(-0.6);
    bow.rotateY(-0.14);
    bow.rotateZ(0.09);
    // tiny idle sway (removed kick)
    bow.translateX(Math.sin(t * 1.6) * 0.006);
    bow.translateY(Math.sin(t * 2.1) * 0.005);

    const nockZ = -0.05 + pull * 0.34;
    stringGeo.attributes.position.setXYZ(1, 0.02, 0, nockZ);
    stringGeo.attributes.position.needsUpdate = true;
    nocked.position.z = nockZ;
  }

  function update(dt, keys, t = 0) {
    cooldown = Math.max(0, cooldown - dt);
    // Removed kick decay since kick is now 0
    const mounted = !!player.mounted;
    const canAim = !mounted && !player.sitting && (player.canUseArchery === undefined || player.canUseArchery);
    const wantAim = !!keys['f'] && canAim;

    // Clear arrows on player movement
    clearArrowsOnMove();

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
    const pull = Math.min(1, draw / DRAW_TIME);

    // still drives whatever body pose player.js wants for the (now hidden) rig
    if (typeof player.setArcheryPose === 'function') {
      player.setArcheryPose(aiming, pull, aiming ? getAimOffset() : null);
    }

    bow.visible = aiming && !mounted;
    if (bow.visible) updateBowTransform(t, pull);

    // ---- HUD ----
    ui.style.opacity = aiming ? '1' : '0';
    powerEl.style.width = `${pull * 100}%`;
    reticleEl.style.transform = `translate(-50%,-50%) scale(${1 - pull * 0.18})`;
    pinEl.style.background = pull > 0.92 ? '#ffe27a' : '#ffd479';
    if (flashTimer > 0) flashTimer -= dt;
    else ammoEl.textContent = `🏹 ${inventory.count('arrow')}`;

    // ---- arrow physics ----
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i];
      a.life -= dt;
      const previousPos = tmpPos.copy(a.mesh.position).clone();
      a.vel.y -= GRAVITY * dt;
      a.mesh.position.addScaledVector(a.vel, dt);
      a.mesh.lookAt(a.mesh.position.clone().add(a.vel));

      let consumed = false;
      for (const tg of targets) {
        if (tg.dead) continue;
        const p = tg.getPos();
        if (sweptHit(previousPos, a.mesh.position, p, tg.radius || 1)) {
          a.mesh.position.copy(impactPoint);
          tg.onHit(a.power, impactPoint.clone());
          onEvent('hit', { name: tg.name, power: a.power });
          // stays visibly stuck at the point of impact indefinitely
          landArrow(a, a.mesh.position, 999);
          consumed = true;
          break;
        }
      }
      if (consumed) { arrows.splice(i, 1); continue; }

      const gy = terrainHeight(a.mesh.position.x, a.mesh.position.z);
      // Only land on ground if below reasonable height (space enemies are high up)
      if (a.mesh.position.y <= gy + 0.05 && a.mesh.position.y < 50) {
        a.mesh.position.y = gy + 0.04;
        landArrow(a, a.mesh.position);
        onEvent('miss', {});
        arrows.splice(i, 1);
        continue;
      }

      const shooter = player.position;
      const fromShooter = shooter
        ? Math.hypot(a.mesh.position.x - shooter.x, a.mesh.position.z - shooter.z)
        : 0;
      if (a.life <= 0 || fromShooter > WORLD_RADIUS) {
        // Arrow expires in mid-air - show it briefly before disappearing
        landArrow(a, a.mesh.position, 2); // Short life for expired arrows
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
