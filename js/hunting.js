// hunting.js — huntable game (rabbits, deer, boar) with alert/flee AI, arrow
// damage, loot drops and a respawn cycle. Registers itself with archery.
export function createHunting({ scene, terrainHeight, archery, inventory, onEvent = () => {} }) {
  const SPECIES = {
    rabbit: { hp: 1.0, speed: 9,  scale: 0.45, color: 0xbFae95, alert: 14, loot: { hide: 1, meat: 1 }, points: 5 },
    deer:   { hp: 1.8, speed: 11, scale: 1.0,  color: 0x9a6b41, alert: 22, loot: { hide: 2, meat: 3 }, points: 12 },
    boar:   { hp: 2.6, speed: 8,  scale: 0.85, color: 0x4b3a30, alert: 16, loot: { hide: 2, meat: 4 }, points: 18 }
  };

  const ZONES = [
    { x: 48, z: 28, r: 26 }, { x: -55, z: -30, r: 28 },
    { x: -34, z: 24, r: 22 }, { x: 70, z: -40, r: 26 }
  ];

  const animals = [];
  const bodyMats = {};
  function mat(color) {
    if (!bodyMats[color]) bodyMats[color] = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
    return bodyMats[color];
  }

  function buildMesh(type) {
    const s = SPECIES[type];
    const g = new THREE.Group();
    const m = mat(s.color);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 0.75), m);
    body.position.y = 1.0;
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.45), m);
    head.position.set(0.95, 1.35, 0);
    g.add(head);
    [[-0.5, 0.3], [0.5, 0.3], [-0.5, -0.3], [0.5, -0.3]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), m);
      leg.position.set(x, 0.5, z);
      g.add(leg);
    });
    if (type === 'deer') {
      [-0.16, 0.16].forEach(z => {
        const antler = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.7, 4), mat(0xd9cbb0));
        antler.position.set(1.0, 1.85, z);
        antler.rotation.z = -0.3;
        g.add(antler);
      });
    }
    if (type === 'boar') {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), mat(0xe8e2cf));
      tusk.position.set(1.25, 1.2, 0.16);
      tusk.rotation.z = Math.PI * 0.5;
      g.add(tusk);
    }
    g.scale.setScalar(s.scale);
    return g;
  }

  function spawn(type, zone) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * zone.r;
    const x = zone.x + Math.cos(a) * r;
    const z = zone.z + Math.sin(a) * r;
    const mesh = buildMesh(type);
    mesh.position.set(x, terrainHeight(x, z), z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);

    const spec = SPECIES[type];
    const beast = {
      type, mesh, spec, hp: spec.hp, home: { x, z },
      state: 'graze', timer: Math.random() * 3, dead: false,
      vel: new THREE.Vector3(), fleeDir: new THREE.Vector3(), respawn: 0
    };

    beast.unregister = archery.register({
      name: type,
      radius: 1.1 * spec.scale + 0.5,
      get dead() { return beast.dead; },
      getPos: () => beast.mesh.position.clone().setY(beast.mesh.position.y + 1.0 * spec.scale),
      onHit: (power) => hit(beast, power)
    });

    animals.push(beast);
    return beast;
  }

  function hit(beast, power) {
    if (beast.dead) return;
    beast.hp -= 0.7 + power * 1.6;
    beast.state = 'flee';
    beast.timer = 6;
    onEvent('wound', { type: beast.type });
    if (beast.hp <= 0) kill(beast);
  }

  function kill(beast) {
    beast.dead = true;
    beast.state = 'dead';
    beast.respawn = 30 + Math.random() * 25;
    beast.mesh.rotation.z = Math.PI * 0.5;
    Object.entries(beast.spec.loot).forEach(([k, v]) => inventory.add(k, v));
    inventory.add('arrow', 1); // recover an arrow from the kill
    onEvent('kill', { type: beast.type, points: beast.spec.points, loot: beast.spec.loot });
  }

  ZONES.forEach((zone, i) => {
    spawn('rabbit', zone);
    spawn('rabbit', zone);
    spawn('deer', zone);
    if (i % 2 === 0) spawn('boar', zone);
  });

  const tmp = new THREE.Vector3();

  function update(dt, elapsed, playerPos) {
    for (const b of animals) {
      if (b.dead) {
        b.respawn -= dt;
        if (b.respawn <= 0) {
          b.dead = false;
          b.hp = b.spec.hp;
          b.mesh.rotation.z = 0;
          const ang = Math.random() * Math.PI * 2;
          b.mesh.position.set(
            b.home.x + Math.cos(ang) * 8, 0, b.home.z + Math.sin(ang) * 8
          );
          b.mesh.position.y = terrainHeight(b.mesh.position.x, b.mesh.position.z);
        }
        continue;
      }

      const dist = Math.hypot(playerPos.x - b.mesh.position.x, playerPos.z - b.mesh.position.z);
      b.timer -= dt;

      if (dist < b.spec.alert && b.state !== 'flee') { b.state = 'flee'; b.timer = 3.5; }
      if (b.state === 'flee' && b.timer <= 0 && dist > b.spec.alert * 1.4) { b.state = 'graze'; b.timer = 2 + Math.random() * 3; }

      if (b.state === 'flee') {
        tmp.set(b.mesh.position.x - playerPos.x, 0, b.mesh.position.z - playerPos.z).normalize();
        b.mesh.position.addScaledVector(tmp, b.spec.speed * dt);
        b.mesh.rotation.y = Math.atan2(tmp.x, tmp.z) - Math.PI / 2;
        b.mesh.position.y = terrainHeight(b.mesh.position.x, b.mesh.position.z)
          + Math.abs(Math.sin(elapsed * 12)) * 0.18 * b.spec.scale;
      } else {
        if (b.timer <= 0) { b.timer = 2 + Math.random() * 4; b.mesh.rotation.y += (Math.random() - 0.5) * 2; }
        const fwd = new THREE.Vector3(Math.cos(b.mesh.rotation.y), 0, -Math.sin(b.mesh.rotation.y));
        b.mesh.position.addScaledVector(fwd, dt * 1.2);
        b.mesh.position.y = terrainHeight(b.mesh.position.x, b.mesh.position.z);
      }

      // keep them near home
      const dh = Math.hypot(b.mesh.position.x - b.home.x, b.mesh.position.z - b.home.z);
      if (dh > 55) {
        b.mesh.position.x += (b.home.x - b.mesh.position.x) * dt * 0.5;
        b.mesh.position.z += (b.home.z - b.mesh.position.z) * dt * 0.5;
      }
    }
  }

  return { update, animals, SPECIES };
}
