// hunting.js — enhanced huntable game: rabbits, deer, boar, fox, wolf,
// pheasant, bear. Alert/flee/charge/flush AI, jointed-leg animation,
// pack behavior for wolves, arrow damage, loot, respawn cycle.
// Registers with archery. Drop-in replacement — same API.
export function createHunting({ scene, terrainHeight, archery, inventory, onEvent = () => {} }) {
  const SPECIES = {
    rabbit: {
      hp: 1.0, speed: 10.5, scale: 0.42, color: 0xbfae95,
      alert: 13, charge: 0, loot: { hide: 1, meat: 1 }, points: 5,
      body: 'quad', legs: 4, evasive: false
    },
    deer: {
      hp: 2.0, speed: 12.5, scale: 1.0, color: 0x9a6b41,
      alert: 24, charge: 0, loot: { hide: 2, meat: 3 }, points: 12,
      body: 'quad', legs: 4, evasive: false
    },
    boar: {
      hp: 3.2, speed: 9.5, scale: 0.9, color: 0x4b3a30,
      alert: 15, charge: 7.5, loot: { hide: 2, meat: 4 }, points: 18,
      body: 'quad', legs: 4, evasive: false
    },
    fox: {
      hp: 1.4, speed: 13.5, scale: 0.55, color: 0xc2612f,
      alert: 20, charge: 0, loot: { hide: 1, meat: 2 }, points: 15,
      body: 'quad', legs: 4, evasive: true, hitRadiusMod: 0.78
    },
    wolf: {
      hp: 2.6, speed: 13.0, scale: 0.85, color: 0x6a6a68,
      alert: 26, charge: 9, loot: { hide: 2, meat: 3 }, points: 22,
      body: 'quad', legs: 4, evasive: false, packHunter: true, packRadius: 30
    },
    pheasant: {
      hp: 0.8, speed: 8.5, scale: 0.34, color: 0x5c3a24,
      alert: 9, charge: 0, loot: { feather: 2, meat: 1 }, points: 10,
      body: 'bird', flushSpeed: 9.5, points_bonus: 4
    },
    bear: {
      hp: 5.5, speed: 8.5, scale: 1.35, color: 0x3a2c1e,
      alert: 17, charge: 8.5, loot: { hide: 3, meat: 6 }, points: 35,
      body: 'quad', legs: 4, evasive: false, rare: true
    }
  };

  const ZONES = [
    { x: 48, z: 28, r: 26 },   { x: -55, z: -30, r: 28 },
    { x: -34, z: 24, r: 22 },  { x: 70, z: -40, r: 26 },
    { x: -80, z: -55, r: 24 } // wolf/bear territory
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

  // ---------- shared jointed-leg builder (hip pivot -> leg box) ----------
  function makeLeg(parent, x, y, z, m) {
    const hip = new THREE.Group();
    hip.position.set(x, y, z);
    parent.add(hip);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 1.05, 0.17), m);
    leg.position.y = -0.52;
    leg.castShadow = true;
    hip.add(leg);
    return hip;
  }

  function buildQuadMesh(type) {
    const s = SPECIES[type];
    const g = new THREE.Group();
    const m = mat(s.color);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.9, 0.78), m);
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);

    const headPivot = new THREE.Group();
    headPivot.position.set(0.78, 1.38, 0);
    g.add(headPivot);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.48), m);
    head.position.set(0.2, 0, 0);
    head.castShadow = true;
    headPivot.add(head);

    const earPivots = [];
    [[-0.12, 0.22], [0.12, 0.22]].forEach(([x, z]) => {
      const earPivot = new THREE.Group();
      earPivot.position.set(0.85 + x - 0.78, 1.72 - 1.38, z);
      headPivot.add(earPivot);
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.08), m);
      ear.position.y = 0.11;
      earPivot.add(ear);
      earPivots.push(earPivot);
    });

    const legPivots = [
      makeLeg(g, -0.48, 1.05, 0.28, m),
      makeLeg(g, 0.48, 1.05, 0.28, m),
      makeLeg(g, -0.48, 1.05, -0.28, m),
      makeLeg(g, 0.48, 1.05, -0.28, m)
    ];

    if (type === 'deer') {
      [-0.15, 0.15].forEach(z => {
        const antler = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.75, 4), mat(0xd9cbb0));
        antler.position.set(0.24, 0.52, z);
        antler.rotation.z = -0.28;
        antler.castShadow = true;
        headPivot.add(antler);
      });
    }
    if (type === 'boar') {
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.4), m);
      snout.position.set(0.44, -0.13, 0);
      headPivot.add(snout);
      [[0.14, 0.12], [-0.14, 0.12]].forEach(([z, yOff]) => {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.32, 4), mat(0xe8e2cf));
        tusk.position.set(0.57, -0.2 + yOff, z);
        tusk.rotation.z = Math.PI * 0.55;
        headPivot.add(tusk);
      });
    }
    if (type === 'wolf') {
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.24), m);
      snout.position.set(0.42, -0.1, 0);
      headPivot.add(snout);
    }
    if (type === 'bear') {
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.3), m);
      snout.position.set(0.4, -0.12, 0);
      headPivot.add(snout);
    }

    let tail = null;
    if (type === 'rabbit') {
      tail = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), mat(0xf0e6d8));
      tail.position.set(-0.75, 1.1, 0);
      g.add(tail);
    } else if (type === 'fox') {
      tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), mat(0xe8d6c0));
      tail.position.set(-0.95, 1.15, 0);
      tail.rotation.z = Math.PI / 2;
      g.add(tail);
    } else if (type === 'wolf' || type === 'deer' || type === 'boar' || type === 'bear') {
      tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 5), m);
      tail.position.set(-0.85, 1.15, 0);
      tail.rotation.z = Math.PI / 2;
      g.add(tail);
    }

    g.scale.setScalar(s.scale);
    return { group: g, headPivot, earPivots, legPivots, tail };
  }

  function buildBirdMesh(type) {
    const s = SPECIES[type];
    const g = new THREE.Group();
    const m = mat(s.color);

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.7, 6), m);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.32;
    g.add(body);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.44, 0.32);
    g.add(headPivot);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), m);
    headPivot.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), mat(0x2a1f16));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0, 0.16);
    headPivot.add(beak);

    const wingGeo = new THREE.PlaneGeometry(0.55, 0.22);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 1, flatShading: true, side: THREE.DoubleSide });
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-0.24, 0.34, 0);
    g.add(wingL);
    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.set(0.24, 0.34, 0);
    g.add(wingR);

    const tailFan = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 4), mat(0x2a1f16));
    tailFan.rotation.x = -Math.PI / 2;
    tailFan.position.set(0, 0.32, -0.42);
    g.add(tailFan);

    g.scale.setScalar(s.scale);
    return { group: g, headPivot, wingL, wingR };
  }

  function spawn(type, zone) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * zone.r * 0.92;
    const x = zone.x + Math.cos(a) * r;
    const z = zone.z + Math.sin(a) * r;
    const spec = SPECIES[type];
    const isBird = spec.body === 'bird';

    const built = isBird ? buildBirdMesh(type) : buildQuadMesh(type);
    const mesh = built.group;
    mesh.position.set(x, terrainHeight(x, z), z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);

    const beast = {
      type, mesh, spec, zone,
      headPivot: built.headPivot,
      earPivots: built.earPivots || [],
      legPivots: built.legPivots || [],
      wingL: built.wingL, wingR: built.wingR, tail: built.tail,
      hp: spec.hp,
      home: { x, z },
      // graze | alert | flee | charge | flush | dead
      state: 'graze',
      timer: Math.random() * 4,
      dead: false,
      fleeDir: new THREE.Vector3(),
      zigzagT: Math.random() * 10,
      hitFlash: 0,
      respawn: 0,
      wanderAngle: mesh.rotation.y,
      gaitPhase: Math.random() * 10,
      idlePhase: Math.random() * 10,
      flushHeight: 0,
      flushLandX: 0, flushLandZ: 0
    };

    beast.unregister = archery.register({
      name: type,
      radius: (1.15 * spec.scale + 0.45) * (spec.hitRadiusMod || 1),
      get dead() { return beast.dead; },
      getPos: () =>
        beast.mesh.position.clone().setY(
          beast.mesh.position.y + (isBird ? 0.4 * spec.scale : 1.05 * spec.scale)
        ),
      onHit: (power) => hit(beast, power)
    });

    animals.push(beast);
    return beast;
  }

  // ---------- wolf pack alert ----------
  function alertPack(source) {
    if (!source.spec.packHunter) return;
    const r = source.spec.packRadius;
    for (const b of animals) {
      if (b === source || b.dead || b.type !== source.type) continue;
      const d = Math.hypot(b.mesh.position.x - source.mesh.position.x, b.mesh.position.z - source.mesh.position.z);
      if (d < r && b.state !== 'flee' && b.state !== 'charge') {
        b.state = source.state === 'charge' ? 'charge' : 'flee';
        b.timer = (source.state === 'charge' ? 1.6 : 4) + Math.random();
      }
    }
  }

  function hit(beast, power) {
    if (beast.dead) return;

    // pheasant: if grounded, a hit flushes it into flight the first time
    // instead of just fleeing on foot — a much more interesting escape.
    if (beast.spec.body === 'bird' && beast.state !== 'flush') {
      startFlush(beast);
    }

    const dmg = 0.65 + power * 1.7;
    beast.hp -= dmg;
    beast.hitFlash = 0.35;
    beast.fleeDir.set(0, 0, 0);

    const dist = Math.hypot(
      beast.mesh.position.x - (beast._lastPlayerX ?? 0),
      beast.mesh.position.z - (beast._lastPlayerZ ?? 0)
    );

    if (beast.spec.charge > 0 && dist < beast.spec.charge + 2) {
      beast.state = 'charge';
      beast.timer = 1.8 + Math.random() * 0.6;
    } else if (beast.spec.body !== 'bird') {
      beast.state = 'flee';
      beast.timer = 5.5 + Math.random() * 2;
    }

    alertPack(beast);
    onEvent('wound', { type: beast.type, dmg });
    if (beast.hp <= 0) kill(beast);
  }

  function kill(beast) {
    if (beast.dead) return;
    beast.dead = true;
    beast.state = 'dead';
    beast.respawn = (beast.spec.rare ? 55 : 28) + Math.random() * 28;
    beast.mesh.rotation.z = Math.PI * 0.5;
    beast.mesh.position.y = terrainHeight(beast.mesh.position.x, beast.mesh.position.z);

    Object.entries(beast.spec.loot).forEach(([k, v]) => inventory.add(k, v));
    inventory.add('arrow', 1); // recover one arrow

    onEvent('kill', { type: beast.type, points: beast.spec.points, loot: beast.spec.loot });
  }

  function startFlush(beast) {
    beast.state = 'flush';
    beast.timer = 2.4 + Math.random() * 1.2;
    const ang = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 14;
    beast.flushLandX = beast.mesh.position.x + Math.cos(ang) * dist;
    beast.flushLandZ = beast.mesh.position.z + Math.sin(ang) * dist;
  }

  // initial population
  ZONES.forEach((zone, i) => {
    spawn('rabbit', zone);
    spawn('rabbit', zone);
    spawn('deer', zone);
    spawn('pheasant', zone);
    if (i % 2 === 0) spawn('boar', zone);
    if (i % 2 === 1) { spawn('fox', zone); }
  });
  // wolves & the rare bear live only in the far territory (last zone)
  const wildZone = ZONES[ZONES.length - 1];
  spawn('wolf', wildZone);
  spawn('wolf', wildZone);
  spawn('wolf', wildZone);
  spawn('bear', wildZone);
  spawn('fox', { x: 168, z: 148, r: 22 });
  spawn('deer', { x: 214, z: -52, r: 22 });

  const tmp = new THREE.Vector3();
  const fwd = new THREE.Vector3();

  // ---------- per-frame leg/head/tail animation ----------
  function animateQuad(b, t, speedFactor, aggressive) {
    // gait: legs swing opposite in pairs, faster + wider stride at speed
    const gaitSpeed = 2.2 + speedFactor * (aggressive ? 14 : 10);
    b.gaitPhase += t * gaitSpeed;
    const amp = 0.12 + speedFactor * (aggressive ? 0.75 : 0.55);
    const offs = [0, Math.PI, Math.PI * 0.92, -0.08];
    b.legPivots.forEach((p, i) => {
      p.rotation.x = Math.sin(b.gaitPhase + offs[i]) * amp;
    });

    // idle breathing / head bob
    b.idlePhase += t * 1.6;
    const breathe = Math.sin(b.idlePhase) * 0.02;
    b.mesh.scale.y = b.spec.scale * (1 + breathe * (b.state === 'graze' ? 1 : 0.3));

    if (b.headPivot) {
      const headBob = b.state === 'graze'
        ? Math.sin(b.idlePhase * 0.6) * 0.08
        : Math.sin(b.gaitPhase * 2) * 0.05 * speedFactor;
      b.headPivot.rotation.x = headBob - (b.state === 'alert' ? 0.12 : 0);
    }
    b.earPivots.forEach((e, i) => {
      e.rotation.x = Math.sin(b.idlePhase * 2 + i * 1.3) * 0.15;
    });
    if (b.tail) {
      const wag = b.state === 'flee' || b.state === 'charge' ? 6 : 1.4;
      b.tail.rotation.y = Math.sin(b.idlePhase * wag) * (b.state === 'flee' ? 0.5 : 0.15);
    }
  }

  function animateBird(b, dt, t) {
    if (b.state === 'flush') {
      const flap = Math.sin(t * 26) * 0.9;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
    } else {
      const settle = Math.sin(t * 3 + b.idlePhase) * 0.06;
      b.wingL.rotation.z = settle;
      b.wingR.rotation.z = -settle;
      if (b.headPivot) b.headPivot.rotation.x = Math.sin(t * 1.4 + b.idlePhase) * 0.2;
    }
  }

  function update(dt, elapsed, playerPos) {
    const t = Math.min(dt, 0.05);

    for (const b of animals) {
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
          b.mesh.scale.setScalar(b.spec.scale);

          const ang = Math.random() * Math.PI * 2;
          const r = 4 + Math.random() * 10;
          b.mesh.position.set(b.home.x + Math.cos(ang) * r, 0, b.home.z + Math.sin(ang) * r);
          b.mesh.position.y = terrainHeight(b.mesh.position.x, b.mesh.position.z);
          b.mesh.rotation.y = Math.random() * Math.PI * 2;
          b.fleeDir.set(0, 0, 0);
        }
        continue;
      }

      // hit flash (subtle scale pop)
      if (b.hitFlash > 0) {
        b.hitFlash -= t;
        const s = b.spec.scale * (1 + Math.max(0, b.hitFlash) * 0.12);
        b.mesh.scale.x = b.mesh.scale.z = s;
      } else {
        b.mesh.scale.x = b.mesh.scale.z = b.spec.scale;
      }

      const dist = Math.hypot(playerPos.x - b.mesh.position.x, playerPos.z - b.mesh.position.z);
      if (dist > 130) {
        b.mesh.visible = false;
        if (b.dead) {
          b.respawn -= t;
          if (b.respawn <= 0) {
            b.dead = false;
            b.hp = b.spec.hp;
            b.state = 'graze';
            b.timer = 1 + Math.random() * 3;
          }
        }
        continue;
      }
      b.mesh.visible = true;
      b.timer -= t;

      // ---------- pheasant: separate, simpler state machine ----------
      if (b.spec.body === 'bird') {
        if (b.state !== 'flush' && dist < b.spec.alert) startFlush(b);

        if (b.state === 'flush') {
          const midT = 1 - Math.min(1, b.timer / 2.4);
          b.flushHeight = Math.sin(Math.min(1, midT) * Math.PI) * 6.5;
          b.mesh.position.x += (b.flushLandX - b.mesh.position.x) * Math.min(1, t * 1.4);
          b.mesh.position.z += (b.flushLandZ - b.mesh.position.z) * Math.min(1, t * 1.4);
          const groundY = terrainHeight(b.mesh.position.x, b.mesh.position.z);
          b.mesh.position.y = groundY + 0.3 + b.flushHeight;
          const faceAng = Math.atan2(b.flushLandX - b.mesh.position.x, b.flushLandZ - b.mesh.position.z);
          b.mesh.rotation.y += (faceAng - b.mesh.rotation.y) * Math.min(1, t * 3);
          b.mesh.rotation.x = -b.flushHeight * 0.03;
          if (b.timer <= 0) {
            b.state = 'graze';
            b.timer = 2 + Math.random() * 3;
            b.mesh.position.y = groundY + 0.3;
            b.mesh.rotation.x = 0;
          }
        } else {
          // peck / wander slowly on the ground
          if (b.timer <= 0) {
            b.timer = 2 + Math.random() * 3;
            b.wanderAngle += (Math.random() - 0.5) * 1.6;
            b.mesh.rotation.y = b.wanderAngle;
          }
          fwd.set(Math.cos(b.mesh.rotation.y), 0, -Math.sin(b.mesh.rotation.y));
          b.mesh.position.addScaledVector(fwd, 0.5 * t);
          b.mesh.position.y = terrainHeight(b.mesh.position.x, b.mesh.position.z) + 0.3;
        }
        animateBird(b, t, elapsed);
        continue;
      }

      // ---------- quadruped state transitions ----------
      if (b.state !== 'flee' && b.state !== 'charge') {
        if (dist < b.spec.alert * 0.55) {
          if (b.spec.charge > 0 && dist < b.spec.charge) {
            b.state = 'charge';
            b.timer = 1.6 + Math.random() * 0.8;
            alertPack(b);
          } else {
            b.state = 'flee';
            b.timer = 4 + Math.random() * 2;
            alertPack(b);
          }
        } else if (dist < b.spec.alert && b.state === 'graze') {
          b.state = 'alert';
          b.timer = 1.2 + Math.random();
        }
      }

      if (b.state === 'flee' && b.timer <= 0 && dist > b.spec.alert * 1.5) {
        b.state = 'graze';
        b.timer = 2 + Math.random() * 3;
      }
      if (b.state === 'charge' && b.timer <= 0) {
        b.state = 'flee';
        b.timer = 3 + Math.random() * 2;
      }
      if (b.state === 'alert' && b.timer <= 0) {
        b.state = dist < b.spec.alert ? 'flee' : 'graze';
        b.timer = 1.5 + Math.random() * 2;
      }

      // ---------- movement ----------
      let speedFactor = 0;
      if (b.state === 'flee') {
        tmp.set(b.mesh.position.x - playerPos.x, 0, b.mesh.position.z - playerPos.z).normalize();
        if (tmp.lengthSq() < 0.0001) tmp.set(Math.cos(b.wanderAngle), 0, -Math.sin(b.wanderAngle));

        // foxes juke side-to-side instead of running in a straight line
        if (b.spec.evasive) {
          b.zigzagT += t * 6;
          const perp = new THREE.Vector3(-tmp.z, 0, tmp.x);
          tmp.addScaledVector(perp, Math.sin(b.zigzagT) * 0.5).normalize();
        }

        if (b.fleeDir.lengthSq() < 0.0001) b.fleeDir.copy(tmp);
        else b.fleeDir.lerp(tmp, Math.min(1, t * (b.spec.evasive ? 3.4 : 2.2))).normalize();

        b.mesh.position.addScaledVector(b.fleeDir, b.spec.speed * t);
        const targetYaw = Math.atan2(b.fleeDir.x, b.fleeDir.z) - Math.PI / 2;
        let yawDelta = targetYaw - b.mesh.rotation.y;
        while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
        while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
        b.mesh.rotation.y += yawDelta * Math.min(1, t * 8);
        b.mesh.position.y = terrainHeight(b.mesh.position.x, b.mesh.position.z);
        speedFactor = 1;
      } else if (b.state === 'charge') {
        tmp.set(playerPos.x - b.mesh.position.x, 0, playerPos.z - b.mesh.position.z).normalize();
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
        b.mesh.position.y = terrainHeight(b.mesh.position.x, b.mesh.position.z);
        speedFactor = 1.35;
      } else if (b.state === 'alert') {
        tmp.set(playerPos.x - b.mesh.position.x, 0, playerPos.z - b.mesh.position.z).normalize();
        b.mesh.rotation.y = Math.atan2(tmp.x, tmp.z) - Math.PI / 2;
        b.mesh.position.y = terrainHeight(b.mesh.position.x, b.mesh.position.z);
        speedFactor = 0;
      } else {
        if (b.timer <= 0) {
          b.timer = 2.2 + Math.random() * 4.5;
          b.wanderAngle += (Math.random() - 0.5) * 1.8;
          b.mesh.rotation.y = b.wanderAngle;
        }
        fwd.set(Math.cos(b.mesh.rotation.y), 0, -Math.sin(b.mesh.rotation.y));
        const walkSpeed = 0.9 + Math.random() * 0.5;
        b.mesh.position.addScaledVector(fwd, walkSpeed * t);
        b.mesh.position.y = terrainHeight(b.mesh.position.x, b.mesh.position.z);
        speedFactor = 0.12;
      }

      animateQuad(b, t, speedFactor, b.state === 'charge');

      // soft leash toward home
      const dh = Math.hypot(b.mesh.position.x - b.home.x, b.mesh.position.z - b.home.z);
      if (dh > 52) {
        const pull = Math.min(1, (dh - 52) * 0.04);
        b.mesh.position.x += (b.home.x - b.mesh.position.x) * t * (0.4 + pull);
        b.mesh.position.z += (b.home.z - b.mesh.position.z) * t * (0.4 + pull);
        b.mesh.position.y = terrainHeight(b.mesh.position.x, b.mesh.position.z);
      }
    }
  }

  return { update, animals, SPECIES };
}