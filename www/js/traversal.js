// traversal.js — physical watchtower ladder climb + mountain-to-cabin ropeway.
export function createTraversal(scene, player, terrainHeight, towerPos, towerBaseY, cabinAnchor) {
  const deckHeight = towerBaseY + 9.35;
  // This is aligned with the ladder added to the tower's southern face.
  const ladderBase = { x: towerPos.x, z: towerPos.z + 2.42 };
  const ladderGroundY = terrainHeight(ladderBase.x, ladderBase.z);
  const ladderTop = { x: ladderBase.x, y: deckHeight - 0.18, z: ladderBase.z };
  const deckCenter = { x: towerPos.x, y: deckHeight, z: towerPos.z };
  const deckEntry = { x: towerPos.x, y: deckHeight, z: towerPos.z + 1.38 };

  const dirX = cabinAnchor.x - towerPos.x;
  const dirZ = cabinAnchor.z - towerPos.z;
  const dirLen = Math.hypot(dirX, dirZ) || 1;
  const ux = dirX / dirLen;
  const uz = dirZ / dirLen;
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
  promptEl.classList.add('context-prompt');
  promptEl.dataset.mobileKey = 'r';
  document.body.appendChild(promptEl);

  let state = 'none'; // none | climbing | mountDeck | onDeck | toLadder | climbdown | zipline | falling
  let climbT = 0;
  let transitionT = 0;
  let ziplineT = 0;
  let ziplineSpeed = 0;
  let fallVel = 0;
  let deckExitStart = null;

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
    player.setExternalControl(true);
    player.setTraversalPose('climb');
  }

  function startZipline() {
    if (state !== 'onDeck') return;
    state = 'zipline';
    ziplineT = 0;
    ziplineSpeed = 2.2;
    player.setTraversalPose('zipline');
  }

  function releaseZipline() {
    if (state !== 'zipline') return;
    state = 'falling';
    fallVel = 0;
    player.setTraversalPose('none');
  }

  function exitDeck() {
    if (state !== 'onDeck') return;
    state = 'toLadder';
    transitionT = 0;
    deckExitStart = player.position.clone();
    player.setTraversalPose('climb');
  }

  function moveAlongLadder(y) {
    player.teleportWalker(ladderBase.x, y, ladderBase.z, Math.PI);
    player.setTraversalPose('climb');
  }

  function update(dt, keys, playerPos) {
    const nearClimb = state === 'none' && !player.mounted &&
      dist2D(playerPos.x, playerPos.z, ladderBase.x, ladderBase.z) < 2.1;
    const nearZiplineStart = state === 'onDeck' &&
      dist2D(playerPos.x, playerPos.z, ropeStart.x, ropeStart.z) < 2.4;

    if (nearClimb) {
      promptEl.textContent = 'Press R to climb the watchtower ladder';
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

    if (state === 'climbing') {
      climbT += dt / 4.2;
      moveAlongLadder(THREE.MathUtils.lerp(ladderGroundY, ladderTop.y, Math.min(1, climbT)));
      if (climbT >= 1) {
        state = 'mountDeck';
        transitionT = 0;
      }
    } else if (state === 'mountDeck') {
      transitionT += dt / 0.5;
      const t = Math.min(1, transitionT);
      const eased = t * t * (3 - 2 * t);
      player.teleportWalker(
        THREE.MathUtils.lerp(ladderTop.x, deckEntry.x, eased),
        THREE.MathUtils.lerp(ladderTop.y, deckEntry.y, eased),
        THREE.MathUtils.lerp(ladderTop.z, deckEntry.z, eased),
        Math.PI
      );
      if (t >= 1) {
        state = 'onDeck';
        player.setTraversalPose('none');
      }
    } else if (state === 'toLadder') {
      transitionT += dt / 0.5;
      const t = Math.min(1, transitionT);
      const eased = t * t * (3 - 2 * t);
      player.teleportWalker(
        THREE.MathUtils.lerp(deckExitStart.x, ladderTop.x, eased),
        THREE.MathUtils.lerp(deckExitStart.y, ladderTop.y, eased),
        THREE.MathUtils.lerp(deckExitStart.z, ladderTop.z, eased),
        Math.PI
      );
      if (t >= 1) {
        state = 'climbdown';
        climbT = 0;
      }
    } else if (state === 'climbdown') {
      climbT += dt / 4.2;
      moveAlongLadder(THREE.MathUtils.lerp(ladderTop.y, ladderGroundY, Math.min(1, climbT)));
      if (climbT >= 1) {
        state = 'none';
        player.setTraversalPose('none');
        player.setExternalControl(false);
      }
    } else if (state === 'onDeck') {
      let mx = 0;
      let mz = 0;
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
      player.setTraversalPose('zipline');
      if (t >= 1) {
        state = 'falling';
        fallVel = 0;
        player.setTraversalPose('none');
      }
    } else if (state === 'falling') {
      fallVel += 22 * dt;
      const newY = playerPos.y - fallVel * dt;
      const groundY = terrainHeight(playerPos.x, playerPos.z);
      if (newY <= groundY) {
        player.teleportWalker(playerPos.x, groundY, playerPos.z);
        state = 'none';
        player.setTraversalPose('none');
        player.setExternalControl(false);
      } else {
        player.teleportWalker(playerPos.x, newY, playerPos.z);
      }
    }
  }

  return { update, get state() { return state; } };
}
