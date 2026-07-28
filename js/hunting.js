// hunting.js — enhanced huntable game (rabbits, deer, boar)
// alert / flee / charge AI, arrow damage, loot, respawn cycle.
// Registers with archery. Drop-in replacement — same API.
export function createHunting({ scene, terrainHeight, archery, inventory, onEvent = () => {} }) {
  const SPECIES = {
    rabbit: {
      hp: 1.0, speed: 10.5, scale: 0.42, color: 0xbFae95,
      alert: 13, charge: 0, loot: { hide: 1, meat: 1 }, points: 5
    },
    deer: {
      hp: 2.0, speed: 12.5, scale: 1.0, color: 0x9a6b41,
      alert: 24, charge: 0, loot: { hide: 2, meat: 3 }, points: 12
    },
    boar: {
      hp: 3.2, speed: 9.5, scale: 0.9, color: 0x4b3a30,
      alert: 15, charge: 7.5, loot: { hide: 2, meat: 4 }, points: 18
    }
  };

  const ZONES = [
    { x: 48, z: 28, r: 26 }, { x: -55, z: -30, r: 28 },
    { x: -34, z: 24, r: 22 }, { x: 70, z: -40, r: 26 }
  ];

  const animals = [];
  const bodyMats = {};
  function mat(color) {
    if (!bodyMats[color]) {
      bodyMats[color] = new THREE.MeshStandardMaterial({
        color, roughness: 0.95, metalness: 0.05, flatShading: true
      });
    }
    return bodyMats[color];
  }

  function buildMesh(type) {
    const s = SPECIES[type];
    const g = new THREE.Group();
    const m = mat(s.color);

    // body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.9, 0.78), m);
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);

    // head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.48), m);
    head.position.set(0.98, 1.38, 0);
    head.castShadow = true;
    g.add(head);

    // ears (subtle)
    [[-0.12, 0.22], [0.12, 0.22]].forEach(([x, z]) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.08), m);
      ear.position.set(0.85 + x, 1.72, z);
      g.add(ear);
    });

    // legs
    [[-0.48, 0.28], [0.48, 0.28], [-0.48, -0.28], [0.48, -0.28]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 1.05, 0.17), m);
      leg.position.set(x, 0.52, z);
      leg.castShadow = true;
      g.add(leg);
    });

    // deer antlers
    if (type === 'deer') {
      [-0.15, 0.15].forEach(z => {
        const antler = new THREE.Mesh(
          new THREE.ConeGeometry(0.075, 0.75, 4),
          mat(0xd9cbb0)
        );
        antler.position.set(1.02, 1.9, z);
        antler.rotation.z = -0.28;
        antler.castShadow = true;
        g.add(antler);
      });
    }

    // boar tusks + thicker snout feel
    if (type === 'boar') {
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.4), m);
      snout.position.set(1.22, 1.25, 0);
      g.add(snout);

      [[0.14, 0.12], [-0.14, 0.12]].forEach(([z, yOff]) => {
        const tusk = new THREE.Mesh(
          new THREE.ConeGeometry(0.055, 0.32, 4),
          mat(0xe8e2cf)
        );
        tusk.position.set(1.35, 1.18 + yOff, z);
        tusk.rotation.z = Math.PI * 0.55;
        g.add(tusk);
      });
    }

    // rabbit tail
    if (type === 'rabbit') {
      const tail = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 6, 4),
        mat(0xf0e6d8)
      );
      tail.position.set(-0.75, 1.1, 0);
      g.add(tail);
    }

    g.scale.setScalar(s.scale);
    return g;
  }

  function spawn(type, zone) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * zone.r * 0.92;
    const x = zone.x + Math.cos(a) * r;
    const z = zone.z + Math.sin(a) * r;

    const mesh = buildMesh(type);
    mesh.position.set(x, terrainHeight(x, z), z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);

    const spec = SPECIES[type];
    const beast = {
      type,
      mesh,
      spec,
      hp: spec.hp,
      home: { x, z },
      state: 'graze',          // graze | alert | flee | charge | dead
      timer: Math.random() * 4,
      dead: false,
      vel: new THREE.Vector3(),
      fleeDir: new THREE.Vector3(),
      hitFlash: 0,
      respawn: 0,
      wanderAngle: mesh.rotation.y
    };

    beast.unregister = archery.register({
      name: type,
      radius: 1.15 * spec.scale + 0.45,
      get dead() { return beast.dead; },
      getPos: () =>
        beast.mesh.position
          .clone()
          .setY(beast.mesh.position.y + 1.05 * spec.scale),
      onHit: (power) => hit(beast, power)
    });

    animals.push(beast);
    return beast;
  }

  function hit(beast, power) {
    if (beast.dead) return;

    const dmg = 0.65 + power * 1.7;
    beast.hp -= dmg;
    beast.hitFlash = 0.35;
    beast.fleeDir.set(0, 0, 0);

    // always break into flee (or charge if close + aggressive)
    const dist = Math.hypot(
      beast.mesh.position.x - (beast._lastPlayerX ?? 0),
      beast.mesh.position.z - (beast._lastPlayerZ ?? 0)
    );

    if (beast.spec.charge > 0 && dist < beast.spec.charge + 2) {
      beast.state = 'charge';
      beast.timer = 1.8 + Math.random() * 0.6;
    } else {
      beast.state = 'flee';
      beast.timer = 5.5 + Math.random() * 2;
    }

    onEvent('wound', { type: beast.type, dmg });
    if (beast.hp <= 0) kill(beast);
  }

  function kill(beast) {
    if (beast.dead) return;
    beast.dead = true;
    beast.state = 'dead';
    beast.respawn = 28 + Math.random() * 28;
    beast.mesh.rotation.z = Math.PI * 0.5;
    beast.mesh.position.y = terrainHeight(
      beast.mesh.position.x,
      beast.mesh.position.z
    );

    Object.entries(beast.spec.loot).forEach(([k, v]) => inventory.add(k, v));
    inventory.add('arrow', 1); // recover one arrow

    onEvent('kill', {
      type: beast.type,
      points: beast.spec.points,
      loot: beast.spec.loot
    });
  }

  // initial population
  ZONES.forEach((zone, i) => {
    spawn('rabbit', zone);
    spawn('rabbit', zone);
    spawn('deer', zone);
    if (i % 2 === 0) spawn('boar', zone);
  });

  const tmp = new THREE.Vector3();
  const fwd = new THREE.Vector3();

  function update(dt, elapsed, playerPos) {
    // clamp dt so a long frame doesn't send animals flying
    const t = Math.min(dt, 0.05);

    for (const b of animals) {
      // remember player for hit logic
      b._lastPlayerX = playerPos.x;
      b._lastPlayerZ = playerPos.z;

      // ---------- dead / respawn ----------
      if (b.dead) {
        b.respawn -= t;
        if (b.respawn <= 0) {
          b.dead = false;
          b.hp = b.spec.hp;
          b.state = 'graze';
          b.timer = 1 + Math.random() * 3;
          b.hitFlash = 0;
          b.mesh.rotation.z = 0;
          b.mesh.rotation.x = 0;

          const ang = Math.random() * Math.PI * 2;
          const r = 4 + Math.random() * 10;
          b.mesh.position.set(
            b.home.x + Math.cos(ang) * r,
            0,
            b.home.z + Math.sin(ang) * r
          );
          b.mesh.position.y = terrainHeight(
            b.mesh.position.x,
            b.mesh.position.z
          );
          b.mesh.rotation.y = Math.random() * Math.PI * 2;
          b.fleeDir.set(0, 0, 0);
        }
        continue;
      }

      // hit flash (subtle scale pop)
      if (b.hitFlash > 0) {
        b.hitFlash -= t;
        const s = b.spec.scale * (1 + Math.max(0, b.hitFlash) * 0.12);
        b.mesh.scale.setScalar(s);
      } else {
        b.mesh.scale.setScalar(b.spec.scale);
      }

      const dist = Math.hypot(
        playerPos.x - b.mesh.position.x,
        playerPos.z - b.mesh.position.z
      );
      b.timer -= t;

      // ---------- state transitions ----------
      if (b.state !== 'flee' && b.state !== 'charge') {
        if (dist < b.spec.alert * 0.55) {
          // very close → flee or charge
          if (b.spec.charge > 0 && dist < b.spec.charge) {
            b.state = 'charge';
            b.timer = 1.6 + Math.random() * 0.8;
          } else {
            b.state = 'flee';
            b.timer = 4 + Math.random() * 2;
          }
        } else if (dist < b.spec.alert && b.state === 'graze') {
          b.state = 'alert';
          b.timer = 1.2 + Math.random();
        }
      }

      // leave flee when safe
      if (
        b.state === 'flee' &&
        b.timer <= 0 &&
        dist > b.spec.alert * 1.5
      ) {
        b.state = 'graze';
        b.timer = 2 + Math.random() * 3;
      }

      // leave charge when timer ends
      if (b.state === 'charge' && b.timer <= 0) {
        b.state = 'flee';
        b.timer = 3 + Math.random() * 2;
      }

      // leave alert back to graze
      if (b.state === 'alert' && b.timer <= 0) {
        b.state = dist < b.spec.alert ? 'flee' : 'graze';
        b.timer = 1.5 + Math.random() * 2;
      }

      // ---------- movement ----------
      const bob =
        Math.abs(Math.sin(elapsed * (b.state === 'flee' || b.state === 'charge' ? 10 : 5))) *
        0.055 *
        b.spec.scale;

      if (b.state === 'flee') {
        tmp
          .set(
            b.mesh.position.x - playerPos.x,
            0,
            b.mesh.position.z - playerPos.z
          )
          .normalize();
        if (tmp.lengthSq() < 0.0001) tmp.set(Math.cos(b.wanderAngle), 0, -Math.sin(b.wanderAngle));
        if (b.fleeDir.lengthSq() < 0.0001) b.fleeDir.copy(tmp);
        else b.fleeDir.lerp(tmp, Math.min(1, t * 2.2)).normalize();

        b.mesh.position.addScaledVector(b.fleeDir, b.spec.speed * t);
        const targetYaw = Math.atan2(b.fleeDir.x, b.fleeDir.z) - Math.PI / 2;
        let yawDelta = targetYaw - b.mesh.rotation.y;
        while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
        while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
        b.mesh.rotation.y += yawDelta * Math.min(1, t * 8);
        b.mesh.position.y =
          terrainHeight(b.mesh.position.x, b.mesh.position.z) + bob;
      } else if (b.state === 'charge') {
        // boar rushes the player
        tmp
          .set(
            playerPos.x - b.mesh.position.x,
            0,
            playerPos.z - b.mesh.position.z
          )
          .normalize();
        if (tmp.lengthSq() < 0.0001) tmp.set(Math.cos(b.wanderAngle), 0, -Math.sin(b.wanderAngle));
        if (b.fleeDir.lengthSq() < 0.0001) b.fleeDir.copy(tmp);
        else b.fleeDir.lerp(tmp, Math.min(1, t * 4.5)).normalize();
        const spd = b.spec.speed * 1.35;
        b.mesh.position.addScaledVector(b.fleeDir, spd * t);
        const targetYaw = Math.atan2(b.fleeDir.x, b.fleeDir.z) - Math.PI / 2;
        let yawDelta = targetYaw - b.mesh.rotation.y;
        while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
        while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
        b.mesh.rotation.y += yawDelta * Math.min(1, t * 10);
        b.mesh.position.y =
          terrainHeight(b.mesh.position.x, b.mesh.position.z) + bob * 1.2;
      } else if (b.state === 'alert') {
        // freeze + face player
        tmp
          .set(
            playerPos.x - b.mesh.position.x,
            0,
            playerPos.z - b.mesh.position.z
          )
          .normalize();
        b.mesh.rotation.y = Math.atan2(tmp.x, tmp.z) - Math.PI / 2;
        b.mesh.position.y = terrainHeight(
          b.mesh.position.x,
          b.mesh.position.z
        );
      } else {
        // graze / wander
        if (b.timer <= 0) {
          b.timer = 2.2 + Math.random() * 4.5;
          b.wanderAngle += (Math.random() - 0.5) * 1.8;
          b.mesh.rotation.y = b.wanderAngle;
        }

        fwd.set(
          Math.cos(b.mesh.rotation.y),
          0,
          -Math.sin(b.mesh.rotation.y)
        );
        const walkSpeed = 0.9 + Math.random() * 0.5;
        b.mesh.position.addScaledVector(fwd, walkSpeed * t);
        b.mesh.position.y =
          terrainHeight(b.mesh.position.x, b.mesh.position.z) +
          bob * 0.35;
      }

      // soft leash toward home
      const dh = Math.hypot(
        b.mesh.position.x - b.home.x,
        b.mesh.position.z - b.home.z
      );
      if (dh > 52) {
        const pull = Math.min(1, (dh - 52) * 0.04);
        b.mesh.position.x += (b.home.x - b.mesh.position.x) * t * (0.4 + pull);
        b.mesh.position.z += (b.home.z - b.mesh.position.z) * t * (0.4 + pull);
        b.mesh.position.y = terrainHeight(
          b.mesh.position.x,
          b.mesh.position.z
        );
      }
    }
  }

  return { update, animals, SPECIES };
}
