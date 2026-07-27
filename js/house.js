export function createHouse(scene, terrainHeight, options = {}) {
  const position = options.position || { x: 21, z: 12 };
  const rotationY = options.rotationY ?? Math.PI * 0.12;
  const enterRadius = options.enterRadius ?? 4.5;
  const staminaPerSecond = options.staminaPerSecond ?? 26;
  const baseY = terrainHeight(position.x, position.z);

  // ---------- exterior cabin ----------
  const group = new THREE.Group();
  group.position.set(position.x, baseY, position.z);
  group.scale.setScalar(options.scale ?? 1.7);
  group.rotation.y = rotationY;
  scene.add(group);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1, flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x4a3527, roughness: 1, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5b3a2e, roughness: 1, flatShading: true });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2e2018, roughness: 1, flatShading: true });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffcf87, emissive: 0xffa95b, emissiveIntensity: 0.55, roughness: 0.6, flatShading: true
  });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b6259, roughness: 1, flatShading: true });

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 3.6), wallMat);
  body.position.y = 1.3;
  group.add(body);
  [[-2.2, -1.8], [2.2, -1.8], [-2.2, 1.8], [2.2, 1.8]].forEach(([x, z]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.22), trimMat);
    post.position.set(x, 1.3, z);
    group.add(post);
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.1, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.65;
  group.add(roof);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.45, 0, 1.86);
  group.add(doorPivot);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.12), doorMat);
  door.position.set(0.45, 0.85, 0);
  doorPivot.add(door);

  [[-1.35, 1.4, 1.86], [1.35, 1.4, 1.86], [2.26, 1.4, 0]].forEach(([x, y, z], index) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), windowMat);
    window.position.set(x, y, z);
    if (index === 2) window.rotation.y = Math.PI / 2;
    group.add(window);
  });
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.6, 0.55), stoneMat);
  chimney.position.set(-1.1, 4, -0.4);
  group.add(chimney);
  const porchLight = new THREE.PointLight(0xffb15a, 0.9, 9, 2);
  porchLight.position.set(0, 1.6, 2.3);
  group.add(porchLight);

  // ---------- separate, fully enclosed interior ----------
  const interior = new THREE.Group();
  const interiorPos = { x: position.x + 900, z: position.z + 900 };
  interior.position.set(interiorPos.x, terrainHeight(interiorPos.x, interiorPos.z) + 0.1, interiorPos.z);
  scene.add(interior);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3b281c, roughness: 0.95, flatShading: true });
  const innerWallMat = new THREE.MeshStandardMaterial({ color: 0x6b4730, roughness: 1, flatShading: true });
  const beddingMat = new THREE.MeshStandardMaterial({ color: 0x6d8590, roughness: 0.9, flatShading: true });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x9c5541, roughness: 0.9, flatShading: true });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });
  const addBox = (size, pos, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...pos);
    interior.add(mesh);
    return mesh;
  };

  addBox([8, 0.18, 6], [0, 0, 0], floorMat);
  addBox([8, 4.5, 0.2], [0, 2.25, -3], innerWallMat);
  addBox([0.2, 4.5, 6], [-4, 2.25, 0], innerWallMat);
  addBox([0.2, 4.5, 6], [4, 2.25, 0], innerWallMat);
  addBox([8, 0.2, 6], [0, 4.5, 0], floorMat);

  addBox([2.65, 0.35, 1.85], [-2.15, 0.42, -1.55], trimMat);
  addBox([2.45, 0.28, 1.65], [-2.15, 0.72, -1.55], beddingMat);
  addBox([1.45, 0.12, 1.62], [-1.75, 0.92, -1.55], blanketMat);
  addBox([0.6, 0.16, 1.35], [-3.05, 0.94, -1.55], windowMat);
  addBox([0.85, 0.8, 0.75], [1.8, 0.48, -1.75], trimMat);
  addBox([2.8, 0.03, 1.8], [0.4, 0.12, 0.7], blanketMat);

  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.42, 8), stoneMat);
  lampBase.position.set(1.8, 1.08, -1.75);
  interior.add(lampBase);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.42, 8, 1, true), glowMat);
  lampShade.position.set(1.8, 1.47, -1.75);
  interior.add(lampShade);
  const lampLight = new THREE.PointLight(0xffbd67, 2.3, 12, 2);
  lampLight.position.set(1.8, 1.55, -1.75);
  interior.add(lampLight);
  const hearthFlame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 7), glowMat);
  hearthFlame.position.set(2.8, 0.5, -2.72);
  interior.add(hearthFlame);
  const hearthLight = new THREE.PointLight(0xff9445, 1.5, 8, 2);
  hearthLight.position.set(2.8, 0.7, -2.55);
  interior.add(hearthLight);

  // ---------- interaction UI ----------
  const promptEl = document.createElement('div');
  Object.assign(promptEl.style, {
    position: 'fixed', left: '50%', bottom: '14%', transform: 'translateX(-50%)', padding: '10px 18px',
    background: 'rgba(20,16,12,0.72)', color: '#f3ead9', fontFamily: 'inherit', fontSize: '15px',
    borderRadius: '10px', border: '1px solid rgba(255,255,255,0.18)', opacity: '0',
    transition: 'opacity 0.25s ease', pointerEvents: 'none', zIndex: '50'
  });
  document.body.appendChild(promptEl);
  const interiorLabel = document.createElement('div');
  interiorLabel.textContent = 'Inside the cabin — Press E to leave';
  Object.assign(interiorLabel.style, {
    position: 'fixed', left: '50%', top: '10%', transform: 'translateX(-50%)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '18px', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: '0',
    transition: 'opacity 0.4s ease', textShadow: '0 2px 10px rgba(0,0,0,0.6)', pointerEvents: 'none', zIndex: '41'
  });
  document.body.appendChild(interiorLabel);

  let inside = false;
  let inRange = false;
  const interiorCameraPos = new THREE.Vector3();
  const interiorCameraTarget = new THREE.Vector3();

  function isInRange(player) {
    const playerPos = player.position || player.group.position;
    return Math.hypot(playerPos.x - position.x, playerPos.z - position.z) < enterRadius;
  }

  function tryInteract(player) {
    if (inside) {
      player.setInside(false);
      inside = false;
      return true;
    }
    if (!isInRange(player) || player.mounted) return false;
    player.setInside(true);
    inside = true;
    return true;
  }

  function updateInteriorCamera(dt, elapsed, camera) {
    interiorCameraPos.set(0.25, 2.05, 2.25).add(interior.position);
    interiorCameraTarget.set(-0.35, 1.25, -1.3).add(interior.position);
    camera.position.lerp(interiorCameraPos, Math.min(1, dt * 5));
    camera.fov = THREE.MathUtils.lerp(camera.fov, 55, Math.min(1, dt * 3));
    camera.updateProjectionMatrix();
    camera.lookAt(interiorCameraTarget);
    const flicker = 0.9 + Math.sin(elapsed * 8) * 0.08 + Math.sin(elapsed * 17 + 1) * 0.05;
    hearthFlame.scale.set(flicker, flicker * 1.08, flicker);
    hearthLight.intensity = 1.4 + Math.sin(elapsed * 8) * 0.15;
    lampLight.intensity = 2.15 + Math.sin(elapsed * 2.1) * 0.08;
  }

  function update(dt, elapsed, player) {
    inRange = isInRange(player);
    doorPivot.rotation.y += ((inside ? -1.3 : 0) - doorPivot.rotation.y) * Math.min(1, dt * 6);
    porchLight.intensity = 0.82 + Math.sin(elapsed * 4.5) * 0.08;
    promptEl.textContent = player.mounted
      ? 'Press E to dismount, then enter the cabin'
      : 'Press E to open the door and enter';
    promptEl.style.opacity = !inside && inRange ? '1' : '0';
    interiorLabel.style.opacity = inside ? '1' : '0';
    if (inside) player.restoreStamina(dt * staminaPerSecond);
  }

  return {
    group,
    position,
    restRadius: enterRadius,
    update,
    tryInteract,
    updateInteriorCamera,
    get resting() { return inside; },
    exitRest() { inside = false; }
  };
}
