// outermountains.js — three low-poly frontier mountains around the valley.
// They share their height helpers with terrain.js, so each silhouette has the
// same physical slope that the player, horse, bike and balloon experience.

export const OUTER_MOUNTAINS = [
  {
    id: 'frostpine', name: 'Frostpine Hollow', x: -390, z: -365,
    baseRadius: 158, plateauRadius: 38, height: 68, shape: 'alpine',
    rock: 0x65717a, shade: 0x404b55, roof: 0x34434a, wall: 0xbac0ba,
    tree: 'pine', house: 'lodge', flavor: 'A quiet blue-stone hollow with a cedar lodge beneath the northern pines.'
  },
  {
    id: 'sunstone', name: 'Sunstone Mesa', x: 395, z: 338,
    baseRadius: 150, plateauRadius: 52, height: 58, shape: 'mesa',
    rock: 0xa06e4c, shade: 0x694536, roof: 0xc07545, wall: 0xd7a66f,
    tree: 'cypress', house: 'adobe', flavor: 'Warm sandstone terraces, a sun-baked adobe home, and tall cypress sentinels.'
  },
  {
    id: 'mossglen', name: 'Mossglen Rise', x: -382, z: 330,
    baseRadius: 166, plateauRadius: 48, height: 54, shape: 'rounded',
    rock: 0x6d7062, shade: 0x474d45, roof: 0x5d4030, wall: 0xc6b38c,
    tree: 'birch', house: 'cottage', flavor: 'A rounded western rise with pale birches and a small timber cottage.'
  }
];

function smoothFalloff(distance, inner, outer) {
  if (distance >= outer) return 0;
  if (distance <= inner) return 1;
  const t = (distance - inner) / (outer - inner);
  return 0.5 + 0.5 * Math.cos(t * Math.PI);
}

export function outerMountainFootprintT(x, z, config) {
  const dx = x - config.x;
  const dz = z - config.z;
  return smoothFalloff(Math.hypot(dx, dz), config.plateauRadius, config.baseRadius);
}

export function outerMountainSurfaceY(x, z, config) {
  const dx = x - config.x;
  const dz = z - config.z;
  const distance = Math.hypot(dx, dz);
  const base = smoothFalloff(distance, config.plateauRadius, config.baseRadius);
  if (base <= 0) return 0;
  const slopeT = THREE.MathUtils.clamp(
    (distance - config.plateauRadius) / (config.baseRadius - config.plateauRadius), 0, 1
  );
  const angle = Math.atan2(dz, dx);
  let silhouette = 1;
  if (config.shape === 'alpine') {
    silhouette += Math.sin(angle * 4 + 0.7) * 0.07 * THREE.MathUtils.smoothstep(slopeT, 0.12, 0.86);
  } else if (config.shape === 'mesa') {
    // Subtle stepped sides give Sunstone a different, dry mesa profile while
    // remaining safe to climb with the bike.
    silhouette -= Math.max(0, Math.sin(slopeT * Math.PI * 3.2)) * 0.055;
  } else {
    silhouette += Math.sin(angle * 2 - 0.4) * 0.028 * THREE.MathUtils.smoothstep(slopeT, 0.2, 0.9);
  }
  return config.height * base * silhouette;
}

export function outerMountainHeightAt(x, z) {
  let height = 0;
  for (const config of OUTER_MOUNTAINS) height += outerMountainSurfaceY(x, z, config);
  return height;
}

export function createOuterMountains(scene, terrainHeight, collision) {
  const poiList = [];
  const roots = [];
  const wood = new THREE.MeshLambertMaterial({ color: 0x4c3424, flatShading: true });
  const door = new THREE.MeshLambertMaterial({ color: 0x2c211a, flatShading: true });
  const snow = new THREE.MeshLambertMaterial({ color: 0xd7dfdf, flatShading: true });

  function makeShell(config) {
    const segments = 40;
    const rings = 20;
    const positions = [];
    const colors = [];
    const indices = [];
    const lit = new THREE.Color(config.rock);
    const shade = new THREE.Color(config.shade);
    const color = new THREE.Color();
    for (let ring = 0; ring <= rings; ring++) {
      const radius = config.baseRadius * ring / rings;
      for (let seg = 0; seg < segments; seg++) {
        const angle = seg / segments * Math.PI * 2;
        const localX = Math.cos(angle) * radius;
        const localZ = Math.sin(angle) * radius;
        const worldX = config.x + localX;
        const worldZ = config.z + localZ;
        const y = terrainHeight(worldX, worldZ);
        positions.push(localX, y, localZ);
        const light = 0.48 + Math.cos(angle - 0.65) * 0.24 + (ring / rings) * 0.18;
        color.copy(shade).lerp(lit, THREE.MathUtils.clamp(light, 0.1, 0.95));
        colors.push(color.r, color.g, color.b);
      }
    }
    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segments; seg++) {
        const next = (seg + 1) % segments;
        const a = ring * segments + seg;
        const b = ring * segments + next;
        const c = (ring + 1) * segments + seg;
        const d = (ring + 1) * segments + next;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  }

  function addTree(parent, config, x, z, scale, index) {
    const group = new THREE.Group();
    group.position.set(x, terrainHeight(config.x + x, config.z + z), z);
    group.rotation.y = index * 1.71;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.6 * scale, 5), wood);
    trunk.position.y = 1.3 * scale;
    group.add(trunk);
    if (config.tree === 'cypress') {
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.9 * scale, 4.8 * scale, 7), new THREE.MeshLambertMaterial({ color: 0x3f5943, flatShading: true }));
      foliage.position.y = 4.35 * scale;
      group.add(foliage);
    } else if (config.tree === 'birch') {
      trunk.material = new THREE.MeshLambertMaterial({ color: 0xd8d3c6, flatShading: true });
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35 * scale, 0), new THREE.MeshLambertMaterial({ color: 0x72814d, flatShading: true }));
      canopy.position.y = 3.55 * scale;
      group.add(canopy);
    } else {
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.28 * scale, 3.8 * scale, 6), new THREE.MeshLambertMaterial({ color: 0x344d48, flatShading: true }));
      foliage.position.y = 3.9 * scale;
      group.add(foliage);
    }
    parent.add(group);
  }

  function addHouse(parent, config) {
    const group = new THREE.Group();
    const houseY = terrainHeight(config.x, config.z);
    group.position.y = houseY;
    const wall = new THREE.MeshLambertMaterial({ color: config.wall, flatShading: true });
    const roof = new THREE.MeshLambertMaterial({ color: config.roof, flatShading: true });
    if (config.house === 'adobe') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 5), wall);
      body.position.y = 1.7;
      const flatRoof = new THREE.Mesh(new THREE.BoxGeometry(6.45, 0.36, 5.45), roof);
      flatRoof.position.y = 3.55;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.35, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), wall);
      dome.position.set(-1.25, 3.65, 0.25);
      group.add(body, flatRoof, dome);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.2, 4.4), wall);
      body.position.y = 1.6;
      const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(4.5, config.house === 'lodge' ? 2.6 : 2.1, 4), roof);
      roofMesh.position.y = config.house === 'lodge' ? 4.25 : 3.95;
      roofMesh.rotation.y = Math.PI / 4;
      group.add(body, roofMesh);
      if (config.house === 'lodge') {
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.1, 0.65), snow);
        chimney.position.set(1.45, 4.6, -0.9);
        group.add(chimney);
      }
    }
    const doorway = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.9, 0.1), door);
    doorway.position.set(0, 0.95, 2.25);
    group.add(doorway);
    parent.add(group);
    if (collision) collision.addCollider(config.x, config.z, 3.3);
  }

  for (const config of OUTER_MOUNTAINS) {
    const root = new THREE.Group();
    root.position.set(config.x, 0, config.z);
    const shell = makeShell(config);
    root.add(shell);
    const details = new THREE.Group();
    root.add(details);
    addHouse(details, config);
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.399;
      const radius = 17 + (i % 3) * 9;
      addTree(details, config, Math.cos(angle) * radius, Math.sin(angle) * radius, 0.75 + (i % 4) * 0.12, i);
    }
    scene.add(root);
    roots.push({ root, details, config });
    poiList.push({ name: config.name, pos: { x: config.x, z: config.z }, r: 28, flavor: config.flavor });
  }

  function update(playerPos) {
    for (const item of roots) {
      const distance = Math.hypot(playerPos.x - item.config.x, playerPos.z - item.config.z);
      item.root.visible = distance < 620;
      item.details.visible = distance < 185;
    }
  }

  return { update, poiList, configs: OUTER_MOUNTAINS };
}
