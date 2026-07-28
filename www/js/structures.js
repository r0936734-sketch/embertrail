export function createStructures(scene, terrainHeight) {
  // ... keep all the cabin / fence code exactly as before ...

  // campfire (same as before, just expose the light & flames)
  const fireGroup = new THREE.Group();

  const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 1, flatShading: true });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5b5b57, roughness: 1, flatShading: true });

  const logGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
  const log1 = new THREE.Mesh(logGeo, logMat);
  log1.rotation.z = Math.PI * 0.15;
  log1.position.set(0.25, 0.08, 0);
  const log2 = log1.clone();
  log2.rotation.z = -Math.PI * 0.15;
  log2.position.set(-0.25, 0.08, 0);
  const log3 = log1.clone();
  log3.rotation.x = Math.PI / 2;
  log3.position.set(0, 0.08, 0.25);
  const log4 = log3.clone();
  log4.position.set(0, 0.08, -0.25);
  fireGroup.add(log1, log2, log3, log4);

  const rockGeo = new THREE.DodecahedronGeometry(0.18, 0);
  for (let i = 0; i < 5; i++) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(Math.cos(i * 1.2) * 0.35, 0.05, Math.sin(i * 1.2) * 0.35);
    rock.scale.setScalar(0.7 + Math.random() * 0.3);
    fireGroup.add(rock);
  }

  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa056, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const flameGeo = new THREE.ConeGeometry(0.3, 0.8, 8);
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(0, 0.55, 0);
  flame.rotation.x = Math.PI;

  const flame2 = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  flame2.scale.set(0.7, 1.1, 0.7);
  flame2.position.set(0, 0.45, 0);

  const fireLight = new THREE.PointLight(0xffc97f, 2.2, 6, 2);
  fireLight.position.set(0, 0.5, 0);

  fireGroup.add(flame, flame2, fireLight);

  fireGroup.position.set(0, terrainHeight(0, 0), 0);
  scene.add(fireGroup);

  let fireOn = true;

  function setFireEnabled(enabled) {
    fireOn = enabled;
    flame.visible = enabled;
    flame2.visible = enabled;
    fireLight.visible = enabled;
    fireLight.intensity = enabled ? 2.2 : 0;
  }

  function updateFire(elapsed, isSummer) {
    // automatic seasonal rule
    setFireEnabled(!isSummer);

    if (!fireOn) return;

    const flicker =
      0.8 +
      0.15 * Math.sin(elapsed * 9) +
      0.15 * Math.sin(elapsed * 23.7 + 1.7) +
      (Math.random() - 0.5) * 0.06;
    flame.scale.set(flicker, flicker * 1.15, flicker);
    flame2.scale.set(flicker * 0.9, flicker * 1.05, flicker * 0.9);
    fireLight.intensity =
      1.9 +
      0.35 * Math.sin(elapsed * 9 + 0.5) +
      0.25 * Math.sin(elapsed * 17) +
      (Math.random() - 0.5) * 0.15;
  }

  return { updateFire, fireGroup, setFireEnabled };
}