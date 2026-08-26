export function createConstellations(scene, starsMat, onNamed = () => {}) {
  const R = 470;
  const defs = [
    { name: 'The Wanderer', az: 20,  el: 62, pts: [[0,0],[6,3],[11,1],[15,5],[9,-4]] },
    { name: "Ember's Bow",  az: 140, el: 55, pts: [[0,0],[5,6],[10,4],[13,-2],[7,-6],[2,-3]] },
    { name: 'The Quiet Doe', az: 250, el: 68, pts: [[0,0],[-4,4],[-1,8],[4,7],[6,2]] },
    { name: 'Riverline',    az: 300, el: 48, pts: [[0,0],[8,1],[15,-1],[21,2],[27,0]] },
  ];

  const group = new THREE.Group();
  const dirs = [];

  defs.forEach(def => {
    const azR = def.az * Math.PI / 180, elR = def.el * Math.PI / 180;
    const centerDir = new THREE.Vector3(
      Math.cos(elR) * Math.sin(azR), Math.sin(elR), Math.cos(elR) * Math.cos(azR)
    ).normalize();
    dirs.push({ name: def.name, dir: centerDir });

    const positions = [];
    const starPositions = [];
    def.pts.forEach(([ox, oy], i) => {
      const azz = azR + ox * 0.018, ell = elR + oy * 0.018;
      const p = new THREE.Vector3(
        Math.cos(ell) * Math.sin(azz), Math.sin(ell), Math.cos(ell) * Math.cos(azz)
      ).multiplyScalar(R);
      starPositions.push(p);
      if (i > 0) {
        positions.push(starPositions[i - 1].x, starPositions[i - 1].y, starPositions[i - 1].z);
        positions.push(p.x, p.y, p.z);
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xdfe9ff, transparent: true, opacity: 0, fog: false });
    group.add(new THREE.LineSegments(geo, mat));

    starPositions.forEach(p => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false })
      );
      dot.position.copy(p);
      group.add(dot);
    });
  });
  scene.add(group);

  // caption UI (own element so it doesn't collide with POI captions)
  const capEl = document.createElement('div');
  Object.assign(capEl.style, {
    position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
    color: '#eaf0ff', fontFamily: 'inherit', fontSize: '16px', letterSpacing: '0.08em',
    textShadow: '0 2px 10px rgba(0,0,0,0.7)', opacity: '0', transition: 'opacity 0.6s ease',
    pointerEvents: 'none', zIndex: 12
  });
  document.body.appendChild(capEl);

  const learned = new Set();
  let captionTimer = 0;
  let lookingAt = null;
  let emitNamed = onNamed;

  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'l') return;
    if (!lookingAt) return;
    learned.add(lookingAt.name);
    capEl.textContent = `✦ ${lookingAt.name}`;
    capEl.style.opacity = '1';
    captionTimer = 3.5;
    emitNamed('named', { name: lookingAt.name });
  });

  function update(dt, camera, nightAmt) {
    const opac = THREE.MathUtils.clamp((nightAmt - 0.5) / 0.5, 0, 1) * 0.75;
    group.children.forEach(c => { c.material.opacity = opac; });

    lookingAt = null;
    if (nightAmt > 0.5) {
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      if (fwd.y > 0.35) {
        let best = null, bestDot = 0.93; // ~21° cone
        dirs.forEach(d => {
          const dot = fwd.dot(d.dir);
          if (dot > bestDot) { bestDot = dot; best = d; }
        });
        lookingAt = best;
      }
    }

    if (captionTimer > 0) {
      captionTimer -= dt;
      if (captionTimer <= 0) capEl.style.opacity = '0';
    }
  }

  return {
    update,
    setOnNamed(fn) { emitNamed = fn; },
    get learnedCount() { return learned.size; },
    get totalCount() { return defs.length; }
  };
}