// range.js — an archery practice range near camp: three scoring targets with
// bullseye rings, floating score popups and a 60s time-trial when you hit the
// gong. Registers its targets with the archery system.
export function createRange({
  scene, terrainHeight, archery, onEvent = () => {},
  origin = { x: 95, z: -72 },
  targetDirection = { x: -0.66, z: 0.75 }
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

  // Organized layout with clear distance lanes
  // Lane 1: Close range (left), Lane 2: Medium range (center), Lane 3: Long range (right)
  const layout = [
    // Close range lane (left) - 20m, 25m, 30m
    { distance: 20, lateral: -8, scale: 1.2, moving: false, lane: 'close' },
    { distance: 25, lateral: -8, scale: 1.15, moving: true, lane: 'close' },
    { distance: 30, lateral: -8, scale: 1.1, moving: false, lane: 'close' },
    
    // Medium range lane (center) - 40m, 45m, 50m  
    { distance: 40, lateral: 0, scale: 1.0, moving: false, lane: 'medium' },
    { distance: 45, lateral: 0, scale: 0.95, moving: true, lane: 'medium' },
    { distance: 50, lateral: 0, scale: 0.9, moving: false, lane: 'medium' },
    
    // Long range lane (right) - 60m, 70m, 80m
    { distance: 60, lateral: 8, scale: 0.85, moving: false, lane: 'long' },
    { distance: 70, lateral: 8, scale: 0.8, moving: true, lane: 'long' },
    { distance: 80, lateral: 8, scale: 0.75, moving: false, lane: 'long' }
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

  layout.forEach(({ distance, lateral, scale, moving, lane }, i) => {
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
    face.position.y = 1.9;
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
        baseY: baseYTarget,
        offset: 0,
        speed: 0.8 + Math.random() * 0.4,
        range: 2.5,
        phase: Math.random() * Math.PI * 2,
        direction: Math.random() > 0.5 ? 1 : -1
      };
      movingTargets.push({ target: t, data: movingData, face });
    }

    const center = new THREE.Vector3();
    const worldPos = () => face.getWorldPosition(center.clone());

    archery.register({
      name: `range-target-${i}`,
      radius: 1.05 * Math.max(scale, 0.95 + distance * 0.006),
      getPos: worldPos,
      onHit: (power, at) => {
        const p = worldPos();
        const off = at.distanceTo(p);
        const baseScore = off < 0.2 ? 100 : off < 0.45 ? 50 : off < 0.75 ? 25 : 10;
        const distanceBonus = Math.floor(distance / 10); // Bonus points for longer distance
        const movingBonus = moving ? 15 : 0; // Bonus for hitting moving targets
        const totalScore = baseScore + distanceBonus + movingBonus;
        popup(at, totalScore, off < 0.2, moving);
        wobble(t);
        addScore(totalScore, off < 0.2);
        onEvent(off < 0.2 ? 'bullseye' : 'target', { score: totalScore });
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
    hud.style.opacity = hudTimer > 0 ? '1' : '0';
    hud.innerHTML = trialActive
      ? `<b>TIME TRIAL</b> · ${trial.toFixed(1)}s &nbsp;·&nbsp; ${score} pts <div style="font-size:9px;opacity:.55">bullseyes score double · moving targets +15</div>`
      : `RANGE SCORE ${score}&nbsp;·&nbsp;BEST ${best}<div style="font-size:9px;opacity:.55">Lanes: Close(20-30m) Medium(40-50m) Long(60-80m) · shoot gong for trial</div>`;

    // Skip 3D updates if not visible
    if (!isVisible) return;

    // Update moving targets
    movingTargets.forEach(({ target, data, face }) => {
      data.phase += dt * data.speed;
      const movement = Math.sin(data.phase) * data.range;
      target.position.x = movement;
      
      // Add slight vertical bob for extra challenge
      face.position.y = 1.9 + Math.sin(data.phase * 2) * 0.15;
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

  return { update, position: origin, get score() { return score; }, get best() { return best; } };
}
