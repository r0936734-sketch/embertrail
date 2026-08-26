// range.js — Farshot practice grounds: four labeled shooting stations,
// unlimited practice arrows, scoring targets and a 60s gong time-trial.
export const RANGE_ORIGIN = { x: 250, z: 260 };
export const RANGE_DOWNRANGE = { x: -1, z: 0 };

export function rangeCorridorT(x, z) {
  const dx = x - RANGE_ORIGIN.x;
  const dz = z - RANGE_ORIGIN.z;
  const along = dx * RANGE_DOWNRANGE.x + dz * RANGE_DOWNRANGE.z;
  const lat = -dx * RANGE_DOWNRANGE.z + dz * RANGE_DOWNRANGE.x;
  let t = 1;
  if (along < -14) t *= 1 - Math.min(1, (-14 - along) / 7);
  if (along > 102) t *= 1 - Math.min(1, (along - 102) / 14);
  t *= 1 - Math.min(1, Math.max(0, (Math.abs(lat) - 12) / 8));
  return Math.max(0, Math.min(1, t));
}

function makeSignTexture(text, fg = '#f4efe4', bg = '#2c2116') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.strokeRect(4, 4, 248, 56);
  ctx.fillStyle = fg;
  ctx.font = '700 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function createRange({
  scene, terrainHeight, archery, inventory, collision, onEvent = () => {},
  origin = RANGE_ORIGIN,
  targetDirection = RANGE_DOWNRANGE
}) {
  const group = new THREE.Group();
  const baseY = terrainHeight(origin.x, origin.z);
  group.position.set(origin.x, baseY, origin.z);
  const laneLen = Math.hypot(targetDirection.x, targetDirection.z) || 1;
  const lane = { x: targetDirection.x / laneLen, z: targetDirection.z / laneLen };
  group.rotation.y = Math.atan2(lane.x, lane.z);
  group.visible = false;
  scene.add(group);

  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1, flatShading: true });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x3d2918, roughness: 1, flatShading: true });
  const white = new THREE.MeshStandardMaterial({ color: 0xf1ece0, roughness: 1 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc4402f, roughness: 1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8b23c, roughness: 0.5, metalness: 0.5 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x4a7db8, roughness: 1 });
  const hay = new THREE.MeshStandardMaterial({ color: 0xc4a45a, roughness: 1, flatShading: true });
  const rope = new THREE.MeshStandardMaterial({ color: 0xd9c39a, roughness: 1 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0xb33b2a, roughness: 1, side: THREE.DoubleSide });

  const movers = [];
  const tmpHit = new THREE.Vector3();

  function toWorld(localX, localZ) {
    const c = Math.cos(group.rotation.y);
    const s = Math.sin(group.rotation.y);
    return {
      x: origin.x + s * localZ + c * localX,
      z: origin.z + c * localZ - s * localX
    };
  }

  function addWorldCollider(localX, localZ, r) {
    if (!collision) return;
    const p = toWorld(localX, localZ);
    collision.addCollider(p.x, p.z, r);
  }

  function addSign(text, x, y, z, w = 1.7, fg, bg) {
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w * 0.28),
      new THREE.MeshBasicMaterial({ map: makeSignTexture(text, fg, bg) })
    );
    board.position.set(x, y, z);
    group.add(board);
    return board;
  }

  // Packed firing deck facing downrange (+Z)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(26, 0.28, 8.5), wood);
  deck.position.set(0, 0.08, -1.2);
  group.add(deck);

  [-12.4, 12.4].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.05, 8.2), darkWood);
    rail.position.set(x, 0.62, -1.2);
    group.add(rail);
  });
  const rearRail = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.12, 0.12), darkWood);
  rearRail.position.set(0, 1.12, -5.2);
  group.add(rearRail);

  const stations = [
    {
      x: -9.4, label: 'WARM-UP', color: red, hint: '12–22m',
      targets: [
        { z: 14, scale: 1.28, motion: 'static' },
        { z: 22, scale: 1.12, motion: 'static' }
      ]
    },
    {
      x: -3.15, label: 'MARK', color: white, hint: '32–46m',
      targets: [
        { z: 32, scale: 1.0, motion: 'static' },
        { z: 46, scale: 0.78, motion: 'static', elev: 0.55 }
      ]
    },
    {
      x: 3.15, label: 'MOVER', color: blue, hint: 'moving',
      targets: [
        { z: 28, scale: 0.94, motion: 'strafe' },
        { z: 40, scale: 0.86, motion: 'pendulum' },
        { z: 54, scale: 0.8, motion: 'popup' }
      ]
    },
    {
      x: 9.4, label: 'LONG', color: gold, hint: '62–94m',
      targets: [
        { z: 62, scale: 0.7, motion: 'static' },
        { z: 78, scale: 0.56, motion: 'strafe', elev: 0.85 },
        { z: 94, scale: 0.46, motion: 'static', elev: 1.55 }
      ]
    }
  ];

  stations.forEach(st => {
    const stall = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.08, 3.4), darkWood);
    stall.position.set(st.x, 0.24, -0.4);
    group.add(stall);
    [-2.4, 2.4].forEach(ox => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.1, 6), wood);
      post.position.set(st.x + ox, 1.15, 1.15);
      group.add(post);
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 0.1), wood);
    bar.position.set(st.x, 2.12, 1.15);
    group.add(bar);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42), cloth);
    flag.position.set(st.x + 2.4, 2.45, 1.15);
    group.add(flag);
    addSign(st.label, st.x, 2.42, 1.22, 2.2, '#fff6e8', '#1c1610');
    addSign(st.hint, st.x, 0.58, 1.55, 1.5, '#ffe7a8', '#3a2a18');
  });

  addSign('FARSHOT RANGE', 0, 3.15, -5.05, 4.4, '#ffe7a8', '#24180f');

  // Distance posts along the left edge
  [15, 25, 40, 55, 70, 90].forEach(dist => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.7, 5), wood);
    post.position.set(-13.6, 0.85, dist);
    group.add(post);
    addSign(`${dist}m`, -13.6, 1.85, dist, 1.35);
    const tick = new THREE.Mesh(new THREE.BoxGeometry(27, 0.05, 0.18), darkWood);
    tick.position.set(0, 0.04, dist);
    group.add(tick);
  });

  // Lane ropes downrange
  stations.forEach(st => {
    for (const side of [-2.55, 2.55]) {
      for (let z = 6; z <= 98; z += 4.5) {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 4), wood);
        peg.position.set(st.x + side, 0.28, z);
        group.add(peg);
      }
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 92, 4), rope);
      line.rotation.x = Math.PI / 2;
      line.position.set(st.x + side, 0.52, 52);
      group.add(line);
    }
  });

  function makeTargetFace() {
    const face = new THREE.Group();
    const rings = [[1.0, white], [0.66, red], [0.32, white], [0.14, gold]];
    rings.forEach(([r, m]) => {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 18), m);
      disc.rotation.x = Math.PI / 2;
      disc.position.z = 0.02 * (1 - r) * 10;
      face.add(disc);
    });
    rings.forEach(([r, m]) => {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 18), m);
      disc.rotation.x = Math.PI / 2;
      disc.position.z = -0.06 - 0.02 * (1 - r) * 10;
      face.add(disc);
    });
    return face;
  }

  let targetIndex = 0;
  stations.forEach(st => {
    st.targets.forEach(spec => {
      const i = targetIndex++;
      const elev = spec.elev || 0;
      const stand = new THREE.Group();
      stand.position.set(st.x, 0, spec.z);
      group.add(stand);

      [-0.55, 0.55].forEach(o => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2 + elev, 5), wood);
        leg.position.set(o, (2.2 + elev) * 0.5, 0);
        stand.add(leg);
      });

      let faceParent = stand;
      if (spec.motion === 'pendulum') {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), darkWood);
        beam.position.set(0, 3.15, 0);
        stand.add(beam);
        const pivot = new THREE.Group();
        pivot.position.set(0, 3.15, 0);
        stand.add(pivot);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.35, 5), wood);
        rod.position.y = -0.65;
        pivot.add(rod);
        faceParent = pivot;
      }

      const face = makeTargetFace();
      if (spec.motion === 'pendulum') face.position.set(0, -1.45, 0);
      else face.position.set(0, 1.85 + elev, 0);
      faceParent.add(face);

      if (spec.motion === 'popup') {
        const cover = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.15, 0.16), darkWood);
        cover.position.set(0, 0.7, 0.35);
        stand.add(cover);
      }
      if (spec.motion === 'strafe') {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.1, 0.16), wood);
        rail.position.set(0, 0.12, 0);
        stand.add(rail);
      }

      const motion = {
        type: spec.motion,
        stand,
        face,
        faceParent,
        baseX: st.x,
        restY: face.position.y,
        speed: spec.motion === 'popup' ? 1.15 : 0.85 + (i % 3) * 0.12,
        phase: i * 0.9,
        span: spec.motion === 'strafe' ? 2.35 : 0.62
      };
      if (spec.motion !== 'static') movers.push(motion);

      const getPos = () => face.getWorldPosition(tmpHit);
      archery.register({
        name: `range-target-${i}`,
        radius: Math.max(0.95, 1.2 * spec.scale),
        getPos,
        onHit: (_power, at) => {
          const localHit = face.worldToLocal(at.clone());
          const off = Math.hypot(localHit.x, localHit.y);
          const bullseye = off <= 0.17;
          const baseScore = bullseye ? 100 : off < 0.42 ? 50 : off < 0.72 ? 25 : 10;
          const distBonus = Math.floor(spec.z / 10);
          const moveBonus = spec.motion === 'static' ? 0 : spec.motion === 'popup' ? 18 : 15;
          const elevBonus = elev > 0.5 ? 10 : 0;
          const total = baseScore + distBonus + moveBonus + elevBonus;
          popup(at, total, bullseye, spec.motion !== 'static', st.label);
          wobble(stand);
          addScore(total, bullseye);
          onEvent(bullseye ? 'bullseye' : 'target', { score: total, label: st.label, station: st.label });
        }
      });
      stand.scale.setScalar(spec.scale);
    });
  });

  // Hay backstops so misses read as a real range
  for (let x = -12; x <= 12; x += 4) {
    const bale = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 1.4), hay);
    bale.position.set(x, 0.85, 102);
    group.add(bale);
    addWorldCollider(x, 102, 1.4);
  }

  const gong = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 18), gold);
  gong.rotation.x = Math.PI / 2;
  gong.position.set(0, 1.85, -5.4);
  group.add(gong);
  const gongPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), wood);
  gongPost.position.set(0, 1.3, -5.7);
  group.add(gongPost);
  addSign('TRIAL', 0, 3.55, -5.35, 1.4, '#24180f', '#e8b23c');

  archery.register({
    name: 'gong',
    radius: 1.05,
    getPos: () => gong.getWorldPosition(new THREE.Vector3()),
    onHit: () => { startTrial(); wobble(gongPost); }
  });

  const popups = [];
  function popup(at, score, crit, moving = false, laneName = '') {
    const el = document.createElement('div');
    const tag = moving ? ' MOVING' : '';
    el.textContent = crit ? `BULLSEYE${tag} +${score}` : `${laneName}${tag} +${score}`;
    Object.assign(el.style, {
      position: 'fixed', color: crit ? '#ffd35e' : (moving ? '#8ec5ff' : '#f2f5ff'),
      fontSize: crit ? '20px' : '15px',
      fontWeight: '700', letterSpacing: '1px', textShadow: '0 2px 8px #000',
      pointerEvents: 'none', zIndex: 15, transition: 'opacity .8s ease, transform .8s ease'
    });
    document.body.appendChild(el);
    popups.push({ el, at: at.clone(), life: 1.2 });
  }

  const wobbles = [];
  function wobble(obj) { wobbles.push({ obj, t: 0 }); }

  const hud = document.createElement('div');
  Object.assign(hud.style, {
    position: 'fixed', top: '92px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(15,18,26,0.72)', border: '1px solid rgba(255,220,150,.22)',
    borderRadius: '12px', padding: '9px 18px', color: '#f4f7ff', fontSize: '13px',
    letterSpacing: '1px', zIndex: 13, opacity: '0', transition: 'opacity .3s',
    pointerEvents: 'none', textAlign: 'center', maxWidth: '520px'
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
    name: 'Farshot Practice Range', pos: { x: origin.x, z: origin.z }, r: 28,
    flavor: 'Four practice stations: warm-up, marksman, movers, and longshot. Practice arrows are unlimited on the firing line.'
  }];
  const PRACTICE_RADIUS = 22;
  const PRACTICE_ARROW_COUNT = 60;
  let isVisible = false;
  const RENDER_DISTANCE = 200;

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
      ? `<b>TIME TRIAL</b> · ${trial.toFixed(1)}s &nbsp;·&nbsp; ${score} pts
         <div style="font-size:9px;opacity:.55;margin-top:3px">bullseyes score double · movers pay extra</div>`
      : `<b>FARSHOT</b> · ${score} &nbsp;·&nbsp; BEST ${best}
         <div style="font-size:9px;opacity:.62;margin-top:3px">WARM-UP · MARK · MOVER · LONG &nbsp;·&nbsp; practice arrows ∞ &nbsp;·&nbsp; shoot the gold gong for a 60s trial</div>`;

    if (!isVisible) return;

    movers.forEach(m => {
      m.phase += dt * m.speed;
      if (m.type === 'strafe') {
        m.stand.position.x = m.baseX + Math.sin(m.phase) * m.span;
      } else if (m.type === 'pendulum') {
        m.faceParent.rotation.z = Math.sin(m.phase) * m.span;
      } else if (m.type === 'popup') {
        const rise = 0.5 + 0.5 * Math.sin(m.phase);
        m.face.position.y = 0.55 + rise * 1.55;
      }
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
