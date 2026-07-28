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
  scene.add(group);

  const laneLength = Math.hypot(targetDirection.x, targetDirection.z) || 1;
  const lane = { x: targetDirection.x / laneLength, z: targetDirection.z / laneLength };
  const laneRight = { x: lane.z, z: -lane.x };

  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1, flatShading: true });
  const white = new THREE.MeshStandardMaterial({ color: 0xf1ece0, roughness: 1 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc4402f, roughness: 1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8b23c, roughness: 0.5, metalness: 0.5 });

  const targets = [];
  const layout = [
  { distance: 28, lateral: -3.5, scale: 1.08 },
  { distance: 38, lateral: 4.2,  scale: 1.02 },
  { distance: 49, lateral: -5.2, scale: 0.96 },
  { distance: 61, lateral: 3.6,  scale: 0.92 },
  { distance: 73, lateral: -4.5, scale: 0.88 },
  { distance: 83, lateral: 5.6,  scale: 0.84 },
  { distance: 92, lateral: -2.2, scale: 0.8 }
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

  // A small stable firing deck on the mountain edge.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.25, 5.2), wood);
  deck.position.set(0, 0.04, 0);
  group.add(deck);
  [-3.25, 3.25].forEach(x => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.2, 6), wood);
    post.position.set(x, 0.62, 1.95);
    group.add(post);
  });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 6.6, 6), wood);
  rail.rotation.z = Math.PI * 0.5;
  rail.position.set(0, 1.08, 1.95);
  group.add(rail);

  layout.forEach(({ distance, lateral, scale }, i) => {
    const point = lanePoint(distance, lateral);
    const t = new THREE.Group();
    t.position.set(
      point.x - origin.x,
      terrainHeight(point.x, point.z) - baseY,
      point.z - origin.z
    );
    faceTowardShooter(t, point.x, point.z);
    t.scale.setScalar(scale);
    group.add(t);

    [-0.7, 0.7].forEach(o => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 5), wood);
      leg.position.set(o, 1.1, 0);
      t.add(leg);
    });

    const face = new THREE.Group();
    face.position.y = 1.9;
    t.add(face);
    [[1.0, white], [0.66, red], [0.32, white], [0.14, gold]].forEach(([r, m]) => {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 20), m);
      disc.rotation.x = Math.PI / 2;
      disc.position.z = 0.02 * (1.0 - r) * 10;
      face.add(disc);
    });

    const center = new THREE.Vector3();
    const worldPos = () => face.getWorldPosition(center.clone());

    archery.register({
      name: `ridge-target-${i}`,
      radius: 1.05 * Math.max(scale, 0.95 + distance * 0.006),
      getPos: worldPos,
      onHit: (power, at) => {
        const p = worldPos();
        const off = at.distanceTo(p);
        const score = off < 0.2 ? 100 : off < 0.45 ? 50 : off < 0.75 ? 25 : 10;
        popup(at, score, off < 0.2);
        wobble(t);
        addScore(score, off < 0.2);
        onEvent(off < 0.2 ? 'bullseye' : 'target', { score });
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
  function popup(at, score, crit) {
    const el = document.createElement('div');
    el.textContent = crit ? `BULLSEYE +${score}` : `+${score}`;
    Object.assign(el.style, {
      position: 'fixed', color: crit ? '#ffd35e' : '#f2f5ff', fontSize: crit ? '20px' : '15px',
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

  function update(dt, camera) {
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
      ? `<b>TIME TRIAL</b> · ${trial.toFixed(1)}s &nbsp;·&nbsp; ${score} pts <div style="font-size:9px;opacity:.55">bullseyes score double</div>`
      : `RANGE SCORE ${score}&nbsp;·&nbsp;BEST ${best}<div style="font-size:9px;opacity:.55">shoot the gong to start a 60s trial</div>`;

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
