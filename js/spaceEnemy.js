// spaceEnemy.js — arcade-retro space enemies floating high above the trail.
// Look almost straight up (see the camPitch clamp changes noted alongside
// this file) and shoot them with the bow (F to draw). Registers each enemy
// with the existing archery hit system, same pattern as hunting.js/range.js,
// so no changes to archery.js are needed.

const SPACE_TYPES = {
  asteroid: { hp: 1, color: 0x8a8478, dark: 0x5c554a, scale: 2.5, points: 10, speed: 2.2, spin: 0.4 },
  drone:    { hp: 1, color: 0x4fd1ff, dark: 0x1c5866, scale: 1.5, points: 15, speed: 9,   spin: 0 },
  ufo:      { hp: 2, color: 0xbef85a, dark: 0x5c8c2e, scale: 2.0, points: 25, speed: 5,   spin: 0 },
  mine:     { hp: 1, color: 0xff5566, dark: 0x8c1f2a, scale: 1.2, points: 20, speed: 0,   spin: 0.8 }
};

const DOME_RADIUS = 60;    // horizontal spread around the field center
const DOME_HEIGHT_MIN = 35;
const DOME_HEIGHT_MAX = 50;
const ENEMY_COUNT = 6;     // reduced for better performance

export function createSpaceEnemies({ scene, archery, center = { x: 0, z: 0 }, onEvent = () => {}, playHitSound = null }) {
  console.log('Creating space enemies system with center:', center);
  const mats = {};
  function mat(color, emissive = 0x000000, intensity = 0) {
    const key = `${color}-${emissive}-${intensity}`;
    if (!mats[key]) {
      mats[key] = new THREE.MeshStandardMaterial({
        color, emissive, emissiveIntensity: intensity,
        roughness: 0.7, flatShading: true, fog: false // Disable fog for space enemies
      });
    }
    return mats[key];
  }

  // ---------- low-poly builders, one per type ----------
  function buildAsteroid(spec) {
    const g = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), mat(spec.color));
    rock.scale.set(1, 0.85, 1.1);
    g.add(rock);
    for (let i = 0; i < 3; i++) {
      const bump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + Math.random() * 0.12, 0), mat(spec.dark));
      const a = (i / 3) * Math.PI * 2;
      bump.position.set(Math.cos(a) * 0.45, (Math.random() - 0.5) * 0.3, Math.sin(a) * 0.45);
      g.add(bump);
    }
    return g;
  }

  function buildDrone(spec) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 4), mat(spec.color, spec.color, 0.4));
    body.rotation.x = Math.PI / 2;
    g.add(body);
    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.16), mat(spec.dark));
      wing.position.set(side * 0.32, 0, -0.05);
      g.add(wing);
    });
    return g;
  }

  function buildUfo(spec) {
    const g = new THREE.Group();
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.22, 10), mat(spec.color));
    g.add(saucer);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(0xeaffea, 0xbef85a, 0.5)
    );
    dome.position.y = 0.1;
    g.add(dome);
    const rim = new THREE.PointLight(spec.color, 0.9, 6, 2);
    rim.position.y = -0.15;
    g.add(rim);
    g.userData.rim = rim;
    return g;
  }

  function buildMine(spec) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), mat(spec.dark, spec.color, 0.5));
    g.add(core);
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 4), mat(spec.dark));
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      spike.position.copy(dir).multiplyScalar(0.32);
      spike.lookAt(dir.clone().multiplyScalar(2));
      spike.rotateX(Math.PI / 2);
      g.add(spike);
    }
    g.userData.core = core;
    return g;
  }

  const BUILDERS = { asteroid: buildAsteroid, drone: buildDrone, ufo: buildUfo, mine: buildMine };
  const TYPE_KEYS = Object.keys(SPACE_TYPES);

  // ---------- small debris burst used on death (visual only, not shootable) ----------
  function burst(pos, color) {
    // Disabled debris burst for performance
  }
  const debris = [];

  // ---------- spawn ----------
  const enemies = [];

  function randomDomePos() {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * DOME_RADIUS;
    return {
      x: center.x + Math.cos(a) * r,
      y: DOME_HEIGHT_MIN + Math.random() * (DOME_HEIGHT_MAX - DOME_HEIGHT_MIN),
      z: center.z + Math.sin(a) * r
    };
  }

  function spawn(index) {
    const type = TYPE_KEYS[index % TYPE_KEYS.length];
    const spec = SPACE_TYPES[type];
    const mesh = BUILDERS[type](spec);
    mesh.scale.setScalar(spec.scale);
    const home = randomDomePos();
    mesh.position.set(home.x, home.y, home.z);
    mesh.visible = true; // Ensure visible from spawn
    // Ensure all children are also visible and have fog disabled
    mesh.traverse(child => {
      if (child.isMesh) {
        child.visible = true;
        if (child.material) {
          child.material.fog = false;
        }
      }
    });
    scene.add(mesh);
    console.log(`Spawned ${type} at`, home); // Debug log

    const enemy = {
      type, spec, mesh, home,
      hp: spec.hp,
      dead: false,
      hitFlash: 0,
      respawn: 0,
      phase: Math.random() * Math.PI * 2,
      heading: Math.random() * Math.PI * 2,
      burstTimer: 0.6 + Math.random() * 1.4 // used by drone's darting movement
    };

    archery.register({
      name: `space-${type}-${index}`,
      radius: 1.1 * spec.scale,
      get dead() { return enemy.dead; },
      getPos: () => enemy.mesh.position.clone(),
      onHit: power => hit(enemy, power)
    });

    enemies.push(enemy);
    console.log(`Registered ${type} with archery system`);
  }

  for (let i = 0; i < ENEMY_COUNT; i++) spawn(i);
  console.log(`Created ${ENEMY_COUNT} space enemies at heights ${DOME_HEIGHT_MIN}-${DOME_HEIGHT_MAX}`);

  function hit(enemy, power) {
    if (enemy.dead) return;
    enemy.hp -= 0.6 + power * 0.8;
    enemy.hitFlash = 0.25;
    
    // Play hit sound if available
    if (playHitSound) {
      playHitSound();
    }
    
    if (enemy.hp <= 0) kill(enemy);
  }

  function kill(enemy) {
    enemy.dead = true;
    enemy.mesh.visible = false;
    enemy.respawn = 4 + Math.random() * 5;
    burst(enemy.mesh.position, enemy.spec.color);
    onEvent('spaceKill', { type: enemy.type, points: enemy.spec.points });
  }

  // ---------- per-type movement ----------
  function moveAsteroid(e, dt, t) {
    e.mesh.position.x += Math.sin(e.phase) * e.spec.speed * dt * 0.3;
    e.mesh.position.z += Math.cos(e.phase) * e.spec.speed * dt * 0.3;
    e.mesh.rotation.x += e.spec.spin * dt;
    e.mesh.rotation.y += e.spec.spin * dt * 0.6;
  }

  function moveDrone(e, dt) {
    e.burstTimer -= dt;
    if (e.burstTimer <= 0) {
      e.heading = Math.random() * Math.PI * 2;
      e.burstTimer = 0.6 + Math.random() * 1.2;
    }
    e.mesh.position.x += Math.cos(e.heading) * e.spec.speed * dt;
    e.mesh.position.z += Math.sin(e.heading) * e.spec.speed * dt;
    e.mesh.position.y += Math.sin(e.phase * 3) * dt * 1.5;
    e.mesh.rotation.y = -e.heading;
    // soft leash back toward the dome so drones don't wander off forever
    const d = Math.hypot(e.mesh.position.x - e.home.x, e.mesh.position.z - e.home.z);
    if (d > 60) e.heading = Math.atan2(e.home.z - e.mesh.position.z, e.home.x - e.mesh.position.x);
  }

  function moveUfo(e, dt, t) {
    const orbit = 18;
    e.phase += dt * (e.spec.speed / orbit);
    e.mesh.position.x = e.home.x + Math.cos(e.phase) * orbit;
    e.mesh.position.z = e.home.z + Math.sin(e.phase) * orbit;
    e.mesh.position.y = e.home.y + Math.sin(t * 1.3 + e.phase) * 4;
    e.mesh.rotation.y += dt * 0.6;
    if (e.mesh.userData.rim) e.mesh.userData.rim.intensity = 0.7 + Math.sin(t * 5) * 0.3;
  }

  function moveMine(e, dt, t) {
    e.mesh.position.y = e.home.y + Math.sin(t * 0.8 + e.phase) * 1.2;
    e.mesh.rotation.y += e.spec.spin * dt;
    e.mesh.rotation.x += e.spec.spin * dt * 0.5;
    if (e.mesh.userData.core) {
      e.mesh.userData.core.material.emissiveIntensity = 0.35 + Math.sin(t * 4 + e.phase) * 0.25;
    }
  }

  const MOVERS = { asteroid: moveAsteroid, drone: moveDrone, ufo: moveUfo, mine: moveMine };

  // ---------- update ----------
  function update(dt, elapsed) {
    // Always update space enemies since they're meant to be looked up at
    
    for (const e of enemies) {
      if (e.dead) {
        e.respawn -= dt;
        if (e.respawn <= 0) {
          e.dead = false;
          e.hp = e.spec.hp;
          e.mesh.visible = true;
          e.home = randomDomePos();
          e.mesh.position.set(e.home.x, e.home.y, e.home.z);
        }
        continue;
      }

      e.phase += dt * 0.6;
      MOVERS[e.type](e, dt, elapsed);

      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        const s = e.spec.scale * (1 + Math.max(0, e.hitFlash) * 0.3);
        e.mesh.scale.setScalar(s);
      } else {
        e.mesh.scale.setScalar(e.spec.scale);
      }
    }

    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.life -= dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.vel.multiplyScalar(0.9);
      d.mesh.rotation.x += dt * 4;
      if (d.life <= 0) {
        scene.remove(d.mesh);
        debris.splice(i, 1);
      }
    }
  }

  return { update, enemies };
}
