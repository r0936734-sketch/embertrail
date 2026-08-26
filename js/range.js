// range.js — a dedicated archery practice ground with varied challenge shots,
// unlimited practice arrows, scoring targets and a 60s gong time-trial.
export function createRange({
  scene, terrainHeight, archery, inventory, onEvent = () => {},
  origin = { x: 250, z: 260 },
  targetDirection = { x: -1, z: 0 }
}) {
  const group = new THREE.Group();
  const baseY = terrainHeight(origin.x, origin.z);
  group.position.set(origin.x, baseY, origin.z);
  group.visible = false;
  scene.add(group);

  const laneLength = Math.hypot(targetDirection.x, targetDirection.z) || 1;
  const lane = { x: targetDirection.x / laneLength, z: targetDirection.z / laneLength };
  const laneRight = { x: lane.z, z: -lane.x };

  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1, flatShading: true });
  const white = new THREE.MeshStandardMaterial({ color: 0xf1ece0, roughness: 1 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc4402f, roughness: 1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8b23c, roughness: 0.5, metalness: 0.5 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x4a7db8, roughness: 1 });

  const targets = [];
  const movingTargets = [];

  // Three lanes mix close, low, elevated, moving, and distant small targets.
  const layout = [
    { distance: 18, lateral: -9, scale: 1.2, moving: false, elevation: 0, label: 'close' },
    { distance: 27, lateral: -9, scale: 1.05, moving: true, elevation: 0, label: 'runner' },
    { distance: 36, lateral: -9, scale: 0.82, moving: false, elevation: -0.72, label: 'low' },
    { distance: 42, lateral: 0, scale: 1.0, moving: false, elevation: 0, label: 'medium' },
    { distance: 52, lateral: 0, scale: 0.84, moving: true, elevation: 0.85, label: 'riser' },
    { distance: 61, lateral: 0, scale: 0.72, moving: false, elevation: 1.45, label: 'tower' },
    { distance: 66, lateral: 9, scale: 0.76, moving: false, elevation: 0, label: 'long' },
    { distance: 76, lateral: 9, scale: 0.62, moving: true, elevation: 0.3, label: 'swift' },
    { distance: 88, lateral: 9, scale: 0.5, moving: false, elevation: 1.15, label: 'far' }
  ];
  function lanePoint(distance, lateral = 0) {
    return {
      x: origin.x + lane.x * distance + laneRight.x * lateral,
      z: origin.z + lane.z * distance + laneRight.z * lateral
    };
  }

  function faceTowardShooter(object, worldX, worldZ) {
    object.rotation.y = Math.atan2(origin.x - worldX, origin.z - worldZ);
  }

  // Enhanced firing platform with distance markers
  const deck = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 6), wood);
  deck.position.set(0, 0.05, 0);
  group.add(deck);
  
  // Railings
  [-5.5, 5.5].forEach(x => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.4, 6), wood);
    post.position.set(x, 0.72, 2.4);
    group.add(post);
  });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 11.2, 6), wood);
  rail.rotation.z = Math.PI * 0.5;
  rail.position.set(0, 1.25, 2.4);
  group.add(rail);

  // Distance marker signs
  const distances = [20, 30, 40, 50, 60, 70, 80];
  distances.forEach(dist => {
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 5), wood);
    const signPoint = lanePoint(dist, -12);
    signPost.position.set(
      signPoint.x - origin.x,
      terrainHeight(signPoint.x, signPoint.z) - baseY + 0.9,
      signPoint.z - origin.z
    );
    group.add(signPost);
    
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.08), white);
    sign.position.set(0, 0.7, 0);
    signPost.add(sign);
  });

  // Lane markers on the ground
  const laneColors = [red, white, blue]; // Close, Medium, Long
  const lanePositions = [-8, 0, 8];
  lanePositions.forEach((lat, idx) => {
    for (let d = 15; d <= 85; d += 5) {
      const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8), laneColors[idx]);
      const mp = lanePoint(d, lat);
      marker.position.set(
        mp.x - origin.x,
        terrainHeight(mp.x, mp.z) - baseY + 0.04,
        mp.z - origin.z
      );
      group.add(marker);
    }
  });

  layout.forEach(({ distance, lateral, scale, moving, elevation, label }, i) => {
    const point = lanePoint(distance, lateral);
    const t = new THREE.Group();
    const baseYTarget = terrainHeight(point.x, point.z) - baseY;
    t.position.set(point.x - origin.x, baseYTarget, point.z - origin.z);
    faceTowardShooter(t, point.x, point.z);
    t.scale.setScalar(scale);
    group.add(t);

    // Target stand
    [-0.6, 0.6].forEach(o => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 5), wood);
      leg.position.set(o, 1.1, 0);
      t.add(leg);
    });

    const face = new THREE.Group();
    face.position.y = 1.9 + elevation;
    t.add(face);
    
    // Standard target rings
    const rings = [[1.0, white], [0.66, red], [0.32, white], [0.14, gold]];
    rings.forEach(([r, m]) => {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 20), m);
      disc.rotation.x = Math.PI / 2;
      disc.position.z = 0.02 * (1.0 - r) * 10;
      face.add(disc);
    });
    rings.forEach(([r, m]) => {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 20), m);
      disc.rotation.x = Math.PI / 2;
      disc.position.z = -0.06 - 0.02 * (1.0 - r) * 10;
      face.add(disc);
    });

    // Moving target mechanism
    let movingData = null;
    if (moving) {
      const slideRail = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.15), wood);
      slideRail.position.set(0, 0.1, 0);
      t.add(slideRail);
      
      movingData = {
        baseLocal: t.position.clone(),
        speed: 0.8 + Math.random() * 0.4,
        range: 2.8,
        phase: Math.random() * Math.PI * 2,
        elevation
      };
      movingTargets.push({ target: t, data: movingData, face });
    }

    const center = new THREE.Vector3();
    const worldPos = () => face.getWorldPosition(center.clone());

    archery.register({
      name: `range-target-${i}`,
      radius: 1.08 * scale,
      getPos: worldPos,
      onHit: (power, at) => {
        // Convert the arrow impact into the face's local X/Y plane. This
        // makes the gold centre reliably count as a bullseye at every range.
        const localHit = face.worldToLocal(at.clone());
        const off = Math.hypot(localHit.x, localHit.y);
        const bullseye = off <= 0.17;
        const baseScore = bullseye ? 100 : off < 0.42 ? 50 : off < 0.72 ? 25 : 10;
        const distanceBonus = Math.floor(distance / 10); // Bonus points for longer distance
        const movingBonus = moving ? 15 : 0; // Bonus for hitting moving targets
        const elevationBonus = elevation > 0.5 ? 10 : 0;
        const totalScore = baseScore + distanceBonus + movingBonus;
        popup(at, totalScore + elevationBonus, bullseye, moving);
        wobble(t);
        addScore(totalScore + elevationBonus, bullseye);
        onEvent(bullseye ? 'bullseye' : 'target', { score: totalScore + elevationBonus, label });
      }
    });

    targets.push(t);
  });

  // gong that starts the time trial
  const gong = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 18), gold);
  gong.rotation.x = Math.PI / 2;
  gong.position.set(0, 2.0, -5);
  group.add(gong);
  const gongPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3, 0.16), wood);
  gongPost.position.set(0, 1.5, -5.3);
  group.add(gongPost);

  archery.register({
    name: 'gong',
    radius: 1.0,
    getPos: () => gong.getWorldPosition(new THREE.Vector3()),
    onHit: () => { startTrial(); wobble(gongPost); }
  });

  // ---------- score popups ----------
  const popups = [];
  function popup(at, score, crit, moving = false) {
    const el = document.createElement('div');
    const movingText = moving ? ' MOVING!' : '';
    el.textContent = crit ? `BULLSEYE${movingText} +${score}` : `${movingText}+${score}`;
    Object.assign(el.style, {
      position: 'fixed', color: crit ? '#ffd35e' : (moving ? '#4a7db8' : '#f2f5ff'), 
      fontSize: crit ? '20px' : '15px',
      fontWeight: '700', letterSpacing: '1px', textShadow: '0 2px 8px #000',
      pointerEvents: 'none', zIndex: 15, transition: 'opacity .8s ease, transform .8s ease'
    });
    document.body.appendChild(el);
    popups.push({ el, at: at.clone(), life: 1.2 });
  }

  const wobbles = [];
  function wobble(obj) { wobbles.push({ obj, t: 0 }); }

  // ---------- scoreboard / time trial ----------
  const hud = document.createElement('div');
  Object.assign(hud.style, {
    position: 'fixed', top: '92px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(15,18,26,0.6)', border: '1px solid rgba(255,255,255,.14)',
    borderRadius: '10px', padding: '8px 16px', color: '#f4f7ff', fontSize: '13px',
    letterSpacing: '1px', zIndex: 13, opacity: '0', transition: 'opacity .3s',
    pointerEvents: 'none', textAlign: 'center'
  });
  document.body.appendChild(hud);

  let score = 0, best = 0, trial = 0, trialActive = false, hudTimer = 0;

  function startTrial() {
    trialActive = true; trial = 60; score = 0;
    hudTimer = 2;
  }
  function addScore(v, crit) {
    if (trialActive) score += crit ? v * 2 : v;
    else score += v;
    hudTimer = 3;
    best = Math.max(best, score);
  }

  const poiList = [{
    name: 'Farshot Practice Range', pos: { x: origin.x, z: origin.z }, r: 26,
    flavor: 'A dedicated range for close, moving, elevated, and long-distance shots. Practice arrows are unlimited here.'
  }];
  const PRACTICE_RADIUS = 20;
  const PRACTICE_ARROW_COUNT = 60;
  let isVisible = false;
  const RENDER_DISTANCE = 120;

  function setVisibility(playerPos) {
    const dist = Math.hypot(playerPos.x - origin.x, playerPos.z - origin.z);
    const shouldRender = dist < RENDER_DISTANCE;
    
    if (shouldRender !== isVisible) {
      isVisible = shouldRender;
      group.visible = isVisible;
    }
  }

  function update(dt, camera, playerPos) {
    setVisibility(playerPos);
    const inPracticeArea = Math.hypot(playerPos.x - origin.x, playerPos.z - origin.z) < PRACTICE_RADIUS;
    if (inPracticeArea && inventory && inventory.count('arrow') < PRACTICE_ARROW_COUNT) {
      inventory.add('arrow', PRACTICE_ARROW_COUNT - inventory.count('arrow'));
    }
    
    // Always update HUD and trial state, even when not visible
    if (trialActive) {
      trial -= dt;
      if (trial <= 0) {
        trialActive = false;
        onEvent('trialEnd', { score });
        hudTimer = 4;
      }
    } else if (hudTimer <= 0) score = 0;

    hudTimer -= dt;
    hud.style.opacity = (hudTimer > 0 || inPracticeArea) ? '1' : '0';
    hud.innerHTML = trialActive
      ? `<b>TIME TRIAL</b> · ${trial.toFixed(1)}s &nbsp;·&nbsp; ${score} pts <div style="font-size:9px;opacity:.55">bullseyes score double · moving targets +15</div>`
      : `RANGE SCORE ${score}&nbsp;·&nbsp;BEST ${best}<div style="font-size:9px;opacity:.55">PRACTICE ARROWS ∞ · close, low, moving, elevated & long shots · shoot gong for trial</div>`;

    // Skip 3D updates if not visible
    if (!isVisible) return;

    // Update moving targets
    movingTargets.forEach(({ target, data, face }) => {
      data.phase += dt * data.speed;
      const movement = Math.sin(data.phase) * data.range;
      const localX = data.baseLocal.x + laneRight.x * movement;
      const localZ = data.baseLocal.z + laneRight.z * movement;
      target.position.x = localX;
      target.position.z = localZ;
      target.position.y = terrainHeight(origin.x + localX, origin.z + localZ) - baseY;
      face.position.y = 1.9 + data.elevation + Math.sin(data.phase * 2) * 0.15;
      faceTowardShooter(target, origin.x + localX, origin.z + localZ);
    });

    for (let i = wobbles.length - 1; i >= 0; i--) {
      const w = wobbles[i];
      w.t += dt;
      w.obj.rotation.z = Math.sin(w.t * 30) * 0.12 * Math.max(0, 1 - w.t * 1.5);
      if (w.t > 0.8) { w.obj.rotation.z = 0; wobbles.splice(i, 1); }
    }

    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.life -= dt;
      const v = p.at.clone().project(camera);
      p.el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
      p.el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight - (1.2 - p.life) * 40}px`;
      p.el.style.opacity = String(Math.max(0, p.life));
      if (p.life <= 0) { p.el.remove(); popups.splice(i, 1); }
    }
  }

  return { update, position: origin, poiList, get score() { return score; }, get best() { return best; } };
}
