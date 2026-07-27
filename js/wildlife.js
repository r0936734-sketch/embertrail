export function createWildlife(scene, terrainHeight) {
  // ---------- deer ----------
  const deerBodyMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 1, flatShading: true });
  const deerDarkMat = new THREE.MeshStandardMaterial({ color: 0x352417, roughness: 1, flatShading: true });
  const deerPatchMat = new THREE.MeshStandardMaterial({ color: 0xe8ddc9, roughness: 1, flatShading: true });

  function makeDeer() {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.6, 1.15), deerBodyMat);
    torso.position.y = 0.95;
    g.add(torso);

    const rump = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.22), deerPatchMat);
    rump.position.set(0, 0.85, -0.62);
    g.add(rump);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.32), deerBodyMat);
    neck.position.set(0, 1.32, 0.55);
    neck.rotation.x = -0.55;
    g.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.42), deerBodyMat);
    head.position.set(0, 1.62, 0.85);
    g.add(head);

    [[-0.08, 1.78, 0.72], [0.08, 1.78, 0.72]].forEach(p => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), deerBodyMat);
      ear.position.set(...p);
      ear.rotation.x = -0.4;
      g.add(ear);
    });

    if (Math.random() < 0.45) {
      [[-0.09, 1.78, 0.78], [0.09, 1.78, 0.78]].forEach(p => {
        const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.42, 4), deerDarkMat);
        antler.position.set(p[0], p[1] + 0.2, p[2]);
        antler.rotation.z = p[0] < 0 ? 0.3 : -0.3;
        antler.rotation.x = -0.3;
        g.add(antler);
      });
    }

    const legGeo = new THREE.BoxGeometry(0.13, 0.62, 0.13);
    const legPivots = [];
    [[-0.2, 0.62, 0.4], [0.2, 0.62, 0.4], [-0.2, 0.62, -0.4], [0.2, 0.62, -0.4]].forEach(p => {
      const pivot = new THREE.Group();
      pivot.position.set(p[0], p[1] + 0.31, p[2]);
      const leg = new THREE.Mesh(legGeo, deerDarkMat);
      leg.position.y = -0.31;
      pivot.add(leg);
      g.add(pivot);
      legPivots.push(pivot);
    });

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 5), deerPatchMat);
    tail.position.set(0, 1.02, -0.65);
    tail.rotation.x = Math.PI * 0.55;
    g.add(tail);

    return { group: g, legPivots };
  }

  const deerHerd = [];
  const deerHomes = [
    { x: -40, z: -18 }, { x: 30, z: -25 }, { x: -8, z: 40 },
    { x: 45, z: 20 }, { x: -55, z: -4 }, { x: 12, z: -48 }, { x: -62, z: 22 }
  ];
  deerHomes.forEach(home => {
    const d = makeDeer();
    d.group.position.set(home.x, terrainHeight(home.x, home.z), home.z);
    scene.add(d.group);
    deerHerd.push({
      ...d, home,
      heading: Math.random() * Math.PI * 2,
      speed: 0, state: 'idle',
      timer: 1 + Math.random() * 3,
      target: { x: home.x, z: home.z },
      gaitPhase: 0
    });
  });

  // ---------- rabbits ----------
  const rabbitMat = new THREE.MeshStandardMaterial({ color: 0xcbb89a, roughness: 1, flatShading: true });
  const rabbitEarMat = new THREE.MeshStandardMaterial({ color: 0xe9c9c9, roughness: 1, flatShading: true });

  function makeRabbit() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6), rabbitMat);
    body.scale.set(1, 0.85, 1.3);
    body.position.y = 0.24;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), rabbitMat);
    head.position.set(0, 0.36, 0.24);
    g.add(head);

    [[-0.06, 0.5, 0.22], [0.06, 0.5, 0.22]].forEach(p => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 5), rabbitEarMat);
      ear.position.set(...p);
      g.add(ear);
    });

    const tail = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 1, flatShading: true })
    );
    tail.position.set(0, 0.24, -0.32);
    g.add(tail);
    return g;
  }

  const rabbits = [];
  const rabbitHomes = [
    { x: -11, z: -2 }, { x: -28, z: 14 }, { x: -40, z: 30 },
    { x: 12, z: 9 }, { x: 6, z: -6 }, { x: -20, z: 18 },
    { x: 22, z: -18 }, { x: -52, z: 8 }
  ];
  rabbitHomes.forEach(home => {
    const g = makeRabbit();
    g.position.set(home.x, terrainHeight(home.x, home.z), home.z);
    scene.add(g);
    rabbits.push({
      group: g, home,
      heading: Math.random() * Math.PI * 2,
      hopping: false, hopT: 0, hopDur: 0.4,
      timer: Math.random() * 2
    });
  });

  // ---------- birds ----------
  const birdMat = new THREE.MeshStandardMaterial({ color: 0x2c2a28, roughness: 1, flatShading: true });

  function makeBird() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 5), birdMat);
    body.rotation.x = Math.PI / 2;
    g.add(body);

    const wingGeo = new THREE.PlaneGeometry(0.5, 0.16);
    const wingL = new THREE.Mesh(wingGeo, birdMat);
    wingL.material.side = THREE.DoubleSide;
    const wingR = wingL.clone();
    wingL.position.x = -0.24;
    wingR.position.x = 0.24;
    g.add(wingL, wingR);
    return { group: g, wingL, wingR };
  }

  const birdFlocks = [];
  for (let f = 0; f < 3; f++) {
    const center = { x: (Math.random() - 0.5) * 160, z: (Math.random() - 0.5) * 160 };
    const flock = {
      center,
      radiusX: 40 + Math.random() * 28,
      radiusZ: 30 + Math.random() * 20,
      height: 32 + f * 16,
      speed: 0.16 + Math.random() * 0.09,
      birds: []
    };
    const n = 9 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const b = makeBird();
      scene.add(b.group);
      flock.birds.push({ ...b, phase: (i / n) * Math.PI * 2, bob: Math.random() * Math.PI * 2 });
    }
    birdFlocks.push(flock);
  }

  // ---------- update ----------
  function update(dt, t, playerPos, playerSpeed) {
    // deer
    deerHerd.forEach(d => {
      const dx = d.group.position.x - playerPos.x;
      const dz = d.group.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const fast = Math.abs(playerSpeed) > 4.5;

      if (d.state !== 'flee' && dist < 12 && (fast || dist < 5.5)) {
        d.state = 'flee';
        const ang = Math.atan2(dx, dz);
        d.target = {
          x: d.group.position.x + Math.sin(ang) * 16,
          z: d.group.position.z + Math.cos(ang) * 16
        };
        d.timer = 2.4 + Math.random() * 1.5;
      }

      d.timer -= dt;
      if (d.state === 'idle') {
        d.speed = Math.max(0, d.speed - dt * 3);
        if (d.timer <= 0) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.random() * 15;
          d.target = { x: d.home.x + Math.cos(ang) * rad, z: d.home.z + Math.sin(ang) * rad };
          d.state = 'walk';
          d.timer = 3 + Math.random() * 4;
        }
      } else {
        const tdx = d.target.x - d.group.position.x;
        const tdz = d.target.z - d.group.position.z;
        const distT = Math.sqrt(tdx * tdx + tdz * tdz);
        let desired = Math.atan2(tdx, tdz);
        let diff = desired - d.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        d.heading += diff * Math.min(1, dt * 3);
        const maxSp = d.state === 'flee' ? 6.2 : 1.8;
        d.speed = Math.min(maxSp, d.speed + dt * 4);
        if (distT < 1.1 || d.timer <= 0) {
          d.state = 'idle';
          d.timer = 2 + Math.random() * 3;
          d.speed = 0;
        }
      }

      d.group.position.x += Math.sin(d.heading) * d.speed * dt;
      d.group.position.z += Math.cos(d.heading) * d.speed * dt;
      const gy = terrainHeight(d.group.position.x, d.group.position.z);
      d.group.position.y += (gy - d.group.position.y) * Math.min(1, dt * 8);
      d.group.rotation.y = d.heading;

      d.gaitPhase += dt * (2 + d.speed * 3.2);
      const amp = 0.1 + Math.min(1, d.speed / 3) * 0.5;
      const offs = [0, Math.PI, Math.PI * 0.9, -0.1];
      d.legPivots.forEach((p, i) => {
        p.rotation.x = Math.sin(d.gaitPhase + offs[i]) * amp;
      });
    });

    // rabbits
    rabbits.forEach(r => {
      if (!r.hopping) {
        r.timer -= dt;
        if (r.timer <= 0) {
          r.heading = Math.random() * Math.PI * 2;
          const toHome = Math.atan2(r.home.x - r.group.position.x, r.home.z - r.group.position.z);
          if (Math.random() < 0.4) r.heading = toHome + (Math.random() - 0.5) * 1.2;
          r.hopping = true;
          r.hopT = 0;
        }
      } else {
        r.hopT += dt;
        const frac = Math.min(1, r.hopT / r.hopDur);
        r.group.position.x += Math.sin(r.heading) * 2.7 * dt;
        r.group.position.z += Math.cos(r.heading) * 2.7 * dt;
        const gy = terrainHeight(r.group.position.x, r.group.position.z);
        r.group.position.y = gy + Math.sin(frac * Math.PI) * 0.22;
        r.group.rotation.y = r.heading;
        if (frac >= 1) {
          r.hopping = false;
          r.timer = 0.5 + Math.random() * 1.6;
        }
      }
    });

    // birds
    birdFlocks.forEach(flock => {
      flock.birds.forEach(b => {
        const ang = t * flock.speed + b.phase;
        const x = flock.center.x + Math.cos(ang) * flock.radiusX;
        const z = flock.center.z + Math.sin(ang) * flock.radiusZ;
        const y = flock.height + Math.sin(t * 0.3 + b.bob) * 3.2;
        b.group.position.set(x, y, z);
        b.group.rotation.y = Math.atan2(
          -Math.sin(ang) * flock.radiusX,
          Math.cos(ang) * flock.radiusZ
        );
        const flap = Math.sin(t * 9 + b.phase * 3) * 0.7;
        b.wingL.rotation.z = flap;
        b.wingR.rotation.z = -flap;
      });
    });
  }

  return { update };
}