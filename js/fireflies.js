// Nighttime fireflies that gather around meadow and forest-edge clearings.
export function createFireflies(scene, terrainHeight) {
  const clusters = [
    { x: 48, z: 28, r: 16 },
    { x: -34, z: 24, r: 15 },
    { x: 52, z: 36, r: 12 },
    { x: -55, z: -30, r: 17 },
    { x: -80, z: -55, r: 13 }
  ];
  const perCluster = 32;
  const count = clusters.length * perCluster;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseX = new Float32Array(count);
  const baseY = new Float32Array(count);
  const baseZ = new Float32Array(count);
  const wanderSeeds = new Float32Array(count);
  const blinkSeeds = new Float32Array(count);

  let index = 0;
  for (const cluster of clusters) {
    for (let i = 0; i < perCluster; i++, index++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * cluster.r;
      const x = cluster.x + Math.cos(angle) * radius;
      const z = cluster.z + Math.sin(angle) * radius;
      const y = terrainHeight(x, z) + 0.35 + Math.random() * 1.5;

      baseX[index] = x;
      baseY[index] = y;
      baseZ[index] = z;
      wanderSeeds[index] = Math.random() * Math.PI * 2;
      blinkSeeds[index] = Math.random() * Math.PI * 2;
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.17,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = 5;
  scene.add(points);

  const glowColor = new THREE.Color(0xcdf25a);
  let currentOpacity = 0;

  function update(dt, elapsed, nightAmount) {
    const targetOpacity = THREE.MathUtils.clamp((nightAmount - 0.55) / 0.45, 0, 1) * 0.9;
    currentOpacity += (targetOpacity - currentOpacity) * Math.min(1, dt * 1.2);
    material.opacity = currentOpacity;
    if (currentOpacity < 0.01) return;

    for (let i = 0; i < count; i++) {
      const positionIndex = i * 3;
      const wander = elapsed * 0.6 + wanderSeeds[i];
      positions[positionIndex] = baseX[i] + Math.sin(wander) * 1.6 + Math.sin(wander * 0.37) * 0.8;
      positions[positionIndex + 1] = baseY[i] + Math.sin(elapsed * 0.9 + wanderSeeds[i] * 2) * 0.5;
      positions[positionIndex + 2] = baseZ[i] + Math.cos(wander * 0.8) * 1.6 + Math.cos(wander * 0.31) * 0.8;

      const blink = 0.35 + 0.65 * Math.max(0, Math.sin(elapsed * 2.1 + blinkSeeds[i]));
      colors[positionIndex] = glowColor.r * blink;
      colors[positionIndex + 1] = glowColor.g * blink;
      colors[positionIndex + 2] = glowColor.b * blink;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  return { update };
}
