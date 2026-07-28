// traversal.js — watchtower climb + mountain-to-cabin ropeway (zipline).
// Both are scripted moves that drive the walker's transform directly via
// player.teleportWalker(), with player.setExternalControl(true) suppressing
// normal WASD handling. The normal third-person camera keeps following the
// walker throughout, so no special camera code is needed here.
export function createTraversal(scene, player, terrainHeight, towerPos, towerBaseY, cabinAnchor) {
  const deckHeight = towerBaseY + 9.35;
  const climbBase = { x: towerPos.x, z: towerPos.z + 3.3 };
  const deckCenter = { x: towerPos.x, y: deckHeight, z: towerPos.z };

  const dirX = cabinAnchor.x - towerPos.x;
  const dirZ = cabinAnchor.z - towerPos.z;
  const dirLen = Math.hypot(dirX, dirZ) || 1;
  const ux = dirX / dirLen, uz = dirZ / dirLen;

  const ropeStart = { x: towerPos.x + ux * 2.0, y: deckHeight + 0.3, z: towerPos.z + uz * 2.0 };
  const ropeEnd = { x: cabinAnchor.x, y: cabinAnchor.y, z: cabinAnchor.z };

  const SEGMENTS = 24;
  const sagAmount = Math.min(3.5, dirLen * 0.05);
  const ropePts = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const x = THREE.MathUtils.lerp(ropeStart.x, ropeEnd.x, t);
    const z = THREE.MathUtils.lerp(ropeStart.z, ropeEnd.z, t);
    const straightY = THREE.MathUtils.lerp(ropeStart.y, ropeEnd.y, t);
    ropePts.push(new THREE.Vector3(x, straightY - Math.sin(t * Math.PI) * sagAmount, z));
  }
  const ropeGeo = new THREE.BufferGeometry().setFromPoints(ropePts);
  scene.add(new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: 0x2a2018 })));

  const postMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1, flatShading: true });
  const startPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 6), postMat);
  startPost.position.set(ropeStart.x, ropeStart.y - 0.55, ropeStart.z);
  scene.add(startPost);

  const promptEl = document.createElement('div');
  Object.assign(promptEl.style, {
    position: 'fixed', left: '50%', bottom: '26%', transform: 'translateX(-50%)',
    padding: '8px 16px', background: 'rgba(20,16,12,0.76)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '14px', borderRadius: '9px',
    border: '1px solid rgba(255,255,255,0.18)', opacity: '0', transition: 'opacity 0.22s',
    pointerEvents: 'none', zIndex: '50'
  });
  document.body.appendChild(promptEl);

  let state = 'none'; // none | climbing | onDeck | climbdown | zipline | falling
  let climbT = 0, ziplineT = 0, ziplineSpeed = 0, fallVel = 0;
  let climbStartPos = null;

  const dist2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

  function pointOnRope(t) {
    const idxF = t * SEGMENTS;
    const i0 = Math.min(SEGMENTS - 1, Math.floor(idxF));
    return new THREE.Vector3().lerpVectors(ropePts[i0], ropePts[i0 + 1], idxF - i0);
  }

  function startClimb() {
    if (state !== 'none' || player.mounted || player.sitting) return;
    state = 'climbing';
    climbT = 0;
    climbStartPos = player.position.clone();
    player.setExternalControl(true);
  }
  function startZipline() {
    if (state !== 'onDeck') return;
    state = 'zipline'; ziplineT = 0; ziplineSpeed = 2.2;
  }
  function releaseZipline() {
    if (state !== 'zipline') return;
    state = 'falling'; fallVel = 0;
  }
  function exitDeck() {
    if (state !== 'onDeck') return;
    state = 'climbdown'; climbT = 0;
  }

  function update(dt, keys, playerPos) {
    const nearClimb = state === 'none' && !player.mounted &&
      dist2D(playerPos.x, playerPos.z, climbBase.x, climbBase.z) < 3;
    const nearZiplineStart = state === 'onDeck' &&
      dist2D(playerPos.x, playerPos.z, ropeStart.x, ropeStart.z) < 2.4;

    if (nearClimb) {
      promptEl.textContent = 'Press R to climb the watchtower';
      promptEl.style.opacity = '1';
    } else if (state === 'onDeck') {
      promptEl.textContent = nearZiplineStart ? 'Press R to grab the ropeway' : 'Press R to climb back down';
      promptEl.style.opacity = '1';
    } else if (state === 'zipline') {
      promptEl.textContent = 'Press R to let go';
      promptEl.style.opacity = '1';
    } else {
      promptEl.style.opacity = '0';
    }

    if (keys['r']) {
      keys['r'] = false;
      if (nearClimb) startClimb();
      else if (state === 'onDeck' && nearZiplineStart) startZipline();
      else if (state === 'onDeck') exitDeck();
      else if (state === 'zipline') releaseZipline();
    }

    if (state === 'climbing' || state === 'climbdown') {
      climbT += dt / 3.2;
      const t = Math.min(1, climbT);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const up = state === 'climbing';
      const fromP = up ? climbBase : deckCenter;
      const toP = up ? deckCenter : climbBase;
      const fromY = up ? climbStartPos.y : deckHeight;
      const toY = up ? deckHeight : terrainHeight(climbBase.x, climbBase.z);
      const x = THREE.MathUtils.lerp(fromP.x, toP.x, ease * 0.9);
      const z = THREE.MathUtils.lerp(fromP.z, toP.z, ease * 0.9);
      const y = THREE.MathUtils.lerp(fromY, toY, ease);
      player.teleportWalker(x, y, z, Math.atan2(toP.x - fromP.x, toP.z - fromP.z));
      if (t >= 1) {
        if (up) { state = 'onDeck'; }
        else { state = 'none'; player.setExternalControl(false); }
      }
    } else if (state === 'onDeck') {
      let mx = 0, mz = 0;
      if (keys['w'] || keys['arrowup']) mz -= 1;
      if (keys['s'] || keys['arrowdown']) mz += 1;
      if (keys['a'] || keys['arrowleft']) mx -= 1;
      if (keys['d'] || keys['arrowright']) mx += 1;
      if (mx || mz) {
        const len = Math.hypot(mx, mz) || 1;
        const nx = playerPos.x + (mx / len) * 1.6 * dt;
        const nz = playerPos.z + (mz / len) * 1.6 * dt;
        const dc = dist2D(nx, nz, deckCenter.x, deckCenter.z);
        const fx = dc > 2.0 ? deckCenter.x + (nx - deckCenter.x) * (2.0 / dc) : nx;
        const fz = dc > 2.0 ? deckCenter.z + (nz - deckCenter.z) * (2.0 / dc) : nz;
        player.teleportWalker(fx, deckHeight, fz, Math.atan2(mx, mz));
      }
    } else if (state === 'zipline') {
      ziplineSpeed = Math.min(9, ziplineSpeed + dt * 3.5);
      ziplineT += (ziplineSpeed * dt) / dirLen;
      const t = Math.min(1, ziplineT);
      const p = pointOnRope(t);
      player.teleportWalker(p.x, p.y - 1.3, p.z, Math.atan2(ux, uz));
      if (t >= 1) { state = 'falling'; fallVel = 0; }
    } else if (state === 'falling') {
      fallVel += 18 * dt;
      const newY = playerPos.y - fallVel * dt;
      const groundY = terrainHeight(playerPos.x, playerPos.z);
      if (newY <= groundY) {
        player.teleportWalker(playerPos.x, groundY, playerPos.z);
        state = 'none';
        player.setExternalControl(false);
      } else {
        player.teleportWalker(playerPos.x, newY, playerPos.z);
      }
    }
  }

  return { update, get state() { return state; } };
}