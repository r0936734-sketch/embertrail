// Nighttime fireflies that gather around meadow and forest-edge clearings.
export function createFireflies(scene, terrainHeight) {

  const clusters = [
    { x: 48, z: 28, r: 16 },
    { x: -34, z: 24, r: 15 },
    { x: 52, z: 36, r: 12 },
    { x: -55, z: -30, r: 17 },
    { x: -80, z: -55, r: 13 }
  ];

  const perCluster = 36;
  const count = clusters.length * perCluster;

  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const baseX = new Float32Array(count);
  const baseY = new Float32Array(count);
  const baseZ = new Float32Array(count);

  const velocityX = new Float32Array(count);
  const velocityY = new Float32Array(count);
  const velocityZ = new Float32Array(count);

  const phase = new Float32Array(count);
  const blinkSeed = new Float32Array(count);
  const size = new Float32Array(count);

  const clusterIndex = new Uint8Array(count);

  let ptr = 0;

  for (let c = 0; c < clusters.length; c++) {

    const cluster = clusters[c];

    for (let i = 0; i < perCluster; i++, ptr++) {

      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * cluster.r;

      const x = cluster.x + Math.cos(a) * r;
      const z = cluster.z + Math.sin(a) * r;
      const y = terrainHeight(x, z) + 0.4 + Math.random() * 1.8;

      baseX[ptr] = x;
      baseY[ptr] = y;
      baseZ[ptr] = z;

      positions[ptr * 3] = x;
      positions[ptr * 3 + 1] = y;
      positions[ptr * 3 + 2] = z;

      velocityX[ptr] = (Math.random() - 0.5) * 0.25;
      velocityY[ptr] = (Math.random() - 0.5) * 0.08;
      velocityZ[ptr] = (Math.random() - 0.5) * 0.25;

      phase[ptr] = Math.random() * 1000;
      blinkSeed[ptr] = Math.random() * Math.PI * 2;

      size[ptr] = 0.08 + Math.random() * 0.12;

      clusterIndex[ptr] = c;
    }
  }

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(colors, 3)
  );

  geometry.setAttribute(
    "size",
    new THREE.BufferAttribute(size, 1)
  );

  const material = new THREE.PointsMaterial({
    size: 0.19,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  points.renderOrder = 5;

  scene.add(points);

  const warm = new THREE.Color(0xfff38a);
  const lime = new THREE.Color(0xbef85a);

  let currentOpacity = 0;

  function update(dt, elapsed, nightAmount) {

    const targetOpacity =
      THREE.MathUtils.clamp((nightAmount - 0.55) / 0.45, 0, 1) * 0.92;

    currentOpacity +=
      (targetOpacity - currentOpacity) *
      Math.min(1, dt * 1.5);

    material.opacity = currentOpacity;

    if (currentOpacity < 0.01)
      return;

    for (let i = 0; i < count; i++) {

      const p = i * 3;

      const cluster = clusters[clusterIndex[i]];

      const px = positions[p];
      const py = positions[p + 1];
      const pz = positions[p + 2];

      const dx = cluster.x - px;
      const dz = cluster.z - pz;

      velocityX[i] += dx * dt * 0.015;
      velocityZ[i] += dz * dt * 0.015;

      velocityX[i] += (Math.sin(elapsed * 0.7 + phase[i]) * 0.02) * dt;
      velocityZ[i] += (Math.cos(elapsed * 0.8 + phase[i] * 0.8) * 0.02) * dt;

      velocityY[i] +=
        Math.sin(elapsed * 1.6 + phase[i] * 1.7) *
        0.01 *
        dt;

      velocityX[i] *= 0.992;
      velocityY[i] *= 0.985;
      velocityZ[i] *= 0.992;

      positions[p] += velocityX[i];
      positions[p + 1] += velocityY[i];
      positions[p + 2] += velocityZ[i];

      const ground =
        terrainHeight(positions[p], positions[p + 2]) + 0.35;

      if (positions[p + 1] < ground)
        positions[p + 1] = ground;

      if (positions[p + 1] > ground + 2.3)
        positions[p + 1] -= dt * 0.8;

      const hover =
        Math.sin(elapsed * 2.4 + phase[i]) * 0.05;

      positions[p + 1] += hover;

      const blink =
        Math.pow(
          Math.max(
            0,
            Math.sin(elapsed * (2 + (i % 5) * 0.25) + blinkSeed[i])
          ),
          3
        );

      const tint =
        0.5 + 0.5 * Math.sin(phase[i]);

      const color = warm.clone().lerp(lime, tint);

      colors[p] = color.r * blink;
      colors[p + 1] = color.g * blink;
      colors[p + 2] = color.b * blink;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  return {
    update
  };
}