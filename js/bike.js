// bike.js — rideable cruiser motorcycle (Bullet / Avenger style)
//
// Design goals:
//  • Reads as a real motorcycle (fat tank, engine, dual exhausts, high bars,
//    dual seat, fenders) while staying cheap (~60 small meshes).
//  • Self-contained. Riding mirrors traversal.js: setExternalControl(true)
//    + teleportWalker every frame so the walker-follow camera still works.
//  • Mount / dismount with E (same as horse / cabin). Engine sound is synthesized.
//
// Wiring (main.js):
//
//   const bike = createBike(scene, terrain.terrainHeight, collision, {
//     position: BIKE_POS,
//     rotationY: 0.55,
//     maxSpeedKmh: 100,
//     roadDistance: terrain.trailDistance,
//     onEvent: type => { ... }
//   });
//
//   // inside animate, after player.update / traversal.update, BEFORE camera:
//   bike.update(dt, keys, player);
//
export function createBike(scene, terrainHeight, collision, options = {}) {
  const position     = options.position     || { x: 9, z: 4 };
  const rotationY    = options.rotationY    ?? 0.5;
  const frameColor   = options.frameColor   ?? 0xd1461a; // burnt orange
  const onEvent      = options.onEvent      || (() => {});
  const roadDistance = options.roadDistance || (() => Infinity);
  const jumpProvider = options.jumpProvider || (() => 0);
  const surfaceProvider = options.surfaceProvider || (() => null);
  // 100 km/h = 27.78 m/s — reach this on good trail/road
  const maxSpeedMps  = Math.max(1, (options.maxSpeedKmh ?? 100) / 3.6);

  // ---------- materials ----------
  const frameMat  = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.42, metalness: 0.38, flatShading: true });
  const darkMat   = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.35, metalness: 0.6, flatShading: true });
  const tireMat   = new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.95, flatShading: true });
  const rimMat    = new THREE.MeshStandardMaterial({ color: 0xc9cdd3, roughness: 0.25, metalness: 0.82, flatShading: true });
  const spokeMat  = new THREE.MeshStandardMaterial({ color: 0xaeb4bd, roughness: 0.3, metalness: 0.7, flatShading: true });
  const rotorMat  = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.85, flatShading: true });
  const seatMat   = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.85, flatShading: true });
  const gripMat   = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.8, flatShading: true });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd0d4d8, roughness: 0.2, metalness: 0.9, flatShading: true });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.4, metalness: 0.7, flatShading: true });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0 });
  const reflectorMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });

  // ---------- helpers ----------
  const _dir = new THREE.Vector3();
  const _up  = new THREE.Vector3(0, 1, 0);
  function tubeBetween(p1, p2, radius, mat, group) {
    _dir.subVectors(p2, p1);
    const len = _dir.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), mat);
    mesh.position.copy(p1).addScaledVector(_dir, 0.5);
    mesh.quaternion.setFromUnitVectors(_up, _dir.clone().normalize());
    group.add(mesh);
    return mesh;
  }

  // Motorcycle-scale wheels (noticeably bigger than the old bicycle)
  const WHEEL_R    = 0.46;
  const WHEEL_TUBE = 0.18;

  function makeWheel() {
    const g = new THREE.Group();
    const tireGeo = new THREE.TorusGeometry(WHEEL_R, WHEEL_TUBE, 6, 18);
    tireGeo.rotateY(Math.PI / 2);
    g.add(new THREE.Mesh(tireGeo, tireMat));

    const rimGeo = new THREE.CylinderGeometry(
      WHEEL_R - WHEEL_TUBE * 1.15,
      WHEEL_R - WHEEL_TUBE * 1.15,
      WHEEL_TUBE * 0.62, 16, 1, true
    );
    rimGeo.rotateZ(Math.PI / 2);
    g.add(new THREE.Mesh(rimGeo, rimMat));

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, WHEEL_TUBE * 2.0, 8), darkMat);
    hub.rotation.z = Math.PI / 2;
    g.add(hub);

    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.018, 12), rotorMat);
    rotor.rotation.z = Math.PI / 2;
    rotor.position.x = 0.06;
    g.add(rotor);

    const spokeGeo = new THREE.BoxGeometry(0.024, WHEEL_R - WHEEL_TUBE * 1.1, 0.024);
    for (let i = 0; i < 8; i++) {
      const pivot = new THREE.Group();
      pivot.rotation.x = (i / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.position.y = (WHEEL_R - WHEEL_TUBE * 1.1) / 2;
      pivot.add(spoke);
      g.add(pivot);
    }
    return g;
  }

  // ---------- assemble motorcycle ----------
  const bikeGroup = new THREE.Group();
  const baseY = terrainHeight(position.x, position.z);
  bikeGroup.position.set(position.x, baseY, position.z);
  bikeGroup.rotation.y = rotationY;
  // Overall scale so it reads as a real bike next to the walker (~1.7 m tall)
  bikeGroup.scale.setScalar(1.22);
  scene.add(bikeGroup);

  // Local points: x=right, y=up, z=forward — long cruiser wheelbase
  const rearAxle       = new THREE.Vector3(0, WHEEL_R, -0.78);
  const frontAxle      = new THREE.Vector3(0, WHEEL_R, 0.82);
  const bottomBracket  = new THREE.Vector3(0, 0.36, -0.06);
  const seatTop        = new THREE.Vector3(0, 0.92, -0.32);
  const headTubeTop    = new THREE.Vector3(0, 1.05, 0.52);
  const headTubeBottom = new THREE.Vector3(0, 0.58, 0.64);

  const chassis = new THREE.Group();
  bikeGroup.add(chassis);

  // main frame
  tubeBetween(bottomBracket, seatTop, 0.032, frameMat, chassis);
  tubeBetween(seatTop, headTubeTop, 0.030, frameMat, chassis);
  tubeBetween(headTubeBottom, headTubeTop, 0.030, darkMat, chassis);
  tubeBetween(bottomBracket, headTubeBottom, 0.034, frameMat, chassis);

  [-0.10, 0.10].forEach(x => {
    tubeBetween(bottomBracket.clone().setX(x), rearAxle.clone().setX(x), 0.022, frameMat, chassis);
    tubeBetween(seatTop.clone().setX(x * 0.6), rearAxle.clone().setX(x), 0.020, frameMat, chassis);
  });
  [-0.095, 0.095].forEach(x => {
    tubeBetween(headTubeBottom.clone().setX(x), frontAxle.clone().setX(x), 0.024, darkMat, chassis);
  });

  // fat teardrop tank
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.36, 0.68), frameMat);
  tank.position.set(0, 0.78, 0.14);
  chassis.add(tank);
  const tankTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.60, 10), frameMat);
  tankTop.rotation.z = Math.PI / 2;
  tankTop.position.set(0, 0.90, 0.14);
  chassis.add(tankTop);
  // chrome tank badges
  [-0.17, 0.17].forEach(x => {
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.10, 0.18), chromeMat);
    badge.position.set(x, 0.80, 0.14);
    chassis.add(badge);
  });

  // dual seat (rider + pillion) — this is what the walker sits on
  const mainSeat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.50), seatMat);
  mainSeat.position.copy(seatTop).add(new THREE.Vector3(0, 0.06, 0.04));
  chassis.add(mainSeat);

  const pillion = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.32), seatMat);
  pillion.position.copy(seatTop).add(new THREE.Vector3(0, 0.05, -0.32));
  chassis.add(pillion);

  const seatPan = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.06, 0.70), darkMat);
  seatPan.position.copy(seatTop).add(new THREE.Vector3(0, -0.02, -0.10));
  chassis.add(seatPan);

  // engine block
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.50), engineMat);
  engine.position.copy(bottomBracket).add(new THREE.Vector3(0, 0.04, 0.04));
  chassis.add(engine);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 8), chromeMat);
  cyl.position.copy(bottomBracket).add(new THREE.Vector3(0, 0.22, 0.06));
  chassis.add(cyl);
  // cooling fins
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.012, 0.14), darkMat);
    fin.position.copy(bottomBracket).add(new THREE.Vector3(0, 0.08 + i * 0.05, 0.04));
    chassis.add(fin);
  }

  // dual chrome exhausts
  [-0.13, 0.13].forEach(x => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.58, 6), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, 0.24, -0.40);
    chassis.add(pipe);
    const muff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.38, 8), chromeMat);
    muff.rotation.x = Math.PI / 2;
    muff.position.set(x, 0.20, -0.82);
    chassis.add(muff);
  });

  // high cruiser bars
  const stemEnd = headTubeTop.clone().add(new THREE.Vector3(0, 0.14, -0.08));
  tubeBetween(headTubeTop, stemEnd, 0.04, darkMat, chassis);

  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.09, 0.09), darkMat);
  bar.position.copy(stemEnd);
  chassis.add(bar);

  const barClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.16, 8), chromeMat);
  barClamp.rotation.z = Math.PI / 2;
  barClamp.position.copy(stemEnd);
  chassis.add(barClamp);

  [-0.42, 0.42].forEach(x => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 8), gripMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.copy(stemEnd).add(new THREE.Vector3(x, 0.03, 0));
    chassis.add(grip);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.13), darkMat);
    lever.position.copy(stemEnd).add(new THREE.Vector3(x * 0.88, -0.01, 0.08));
    lever.rotation.x = -0.28;
    chassis.add(lever);
  });

  // headlight + housing
  const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), headlightMat);
  headlight.position.copy(headTubeBottom).add(new THREE.Vector3(0, 0.10, 0.10));
  chassis.add(headlight);
  const hlHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), chromeMat);
  hlHousing.rotation.x = Math.PI / 2;
  hlHousing.position.copy(headlight.position).add(new THREE.Vector3(0, 0, -0.025));
  chassis.add(hlHousing);

  const rearLight = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), reflectorMat);
  rearLight.position.copy(seatTop).add(new THREE.Vector3(0, -0.04, -0.48));
  chassis.add(rearLight);

  // fenders
  const frontFender = new THREE.Mesh(
    new THREE.TorusGeometry(WHEEL_R + 0.05, 0.035, 4, 14, Math.PI * 0.75), darkMat
  );
  frontFender.rotation.y = Math.PI / 2;
  frontFender.rotation.z = -0.12;
  frontFender.position.copy(frontAxle).add(new THREE.Vector3(0, 0.10, 0));
  chassis.add(frontFender);

  const rearFender = new THREE.Mesh(
    new THREE.TorusGeometry(WHEEL_R + 0.06, 0.04, 4, 14, Math.PI * 0.85), darkMat
  );
  rearFender.rotation.y = Math.PI / 2;
  rearFender.rotation.z = 0.45;
  rearFender.position.copy(rearAxle).add(new THREE.Vector3(0, 0.14, -0.06));
  chassis.add(rearFender);

  // wheels
  const frontWheel = makeWheel();
  frontWheel.position.copy(frontAxle);
  bikeGroup.add(frontWheel);
  const rearWheel = makeWheel();
  rearWheel.position.copy(rearAxle);
  bikeGroup.add(rearWheel);

  // kickstand
  const kickstandPivot = new THREE.Group();
  kickstandPivot.position.copy(bottomBracket).add(new THREE.Vector3(0.10, -0.05, -0.10));
  chassis.add(kickstandPivot);
  const kickRod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.52, 6), darkMat);
  kickRod.position.y = -0.26;
  kickstandPivot.add(kickRod);

  const bikeCollider = collision ? collision.addCollider(position.x, position.z, 0.7) : null;

  // ---------- mount prompt (E key) ----------
  const promptEl = document.createElement('div');
  Object.assign(promptEl.style, {
    position: 'fixed', left: '50%', bottom: '26%', transform: 'translateX(-50%)',
    padding: '8px 16px', background: 'rgba(20,16,12,0.76)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '14px', borderRadius: '9px',
    border: '1px solid rgba(255,255,255,0.18)', opacity: '0', transition: 'opacity 0.22s',
    pointerEvents: 'none', zIndex: '50'
  });
  promptEl.classList.add('context-prompt');
  promptEl.dataset.mobileKey = 'e'; // mobile ACTION button uses E
  document.body.appendChild(promptEl);

  // ---------- synthesized engine audio ----------
  let audioContext = null;
  let engineGain = null;
  let engineFilter = null;
  let engineOscillator = null;
  let engineHarmonic = null;
  let engineNoise = null;
  let engineNoiseGain = null;
  let starterOscillator = null;

  function startEngine() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    if (engineOscillator) return;

    engineGain = audioContext.createGain();
    engineFilter = audioContext.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 900;
    engineFilter.Q.value = 1.2;
    engineGain.gain.value = 0;
    engineFilter.connect(engineGain);
    engineGain.connect(audioContext.destination);

    engineOscillator = audioContext.createOscillator();
    engineOscillator.type = 'sawtooth';
    engineOscillator.frequency.value = 48;
    engineOscillator.connect(engineFilter);

    engineHarmonic = audioContext.createOscillator();
    engineHarmonic.type = 'square';
    engineHarmonic.frequency.value = 96;
    const harmonicGain = audioContext.createGain();
    harmonicGain.gain.value = 0.22;
    engineHarmonic.connect(harmonicGain).connect(engineFilter);

    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
    engineNoise = audioContext.createBufferSource();
    engineNoise.buffer = noiseBuffer;
    engineNoise.loop = true;
    engineNoiseGain = audioContext.createGain();
    engineNoiseGain.gain.value = 0.035;
    engineNoise.connect(engineNoiseGain).connect(engineFilter);

    engineOscillator.start();
    engineHarmonic.start();
    engineNoise.start();

    // Brief ignition sweep gives the bike a clear self-start response.
    const now = audioContext.currentTime;
    const starterGain = audioContext.createGain();
    starterGain.gain.setValueAtTime(0.0001, now);
    starterGain.gain.exponentialRampToValueAtTime(0.045, now + 0.07);
    starterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    starterOscillator = audioContext.createOscillator();
    starterOscillator.type = 'square';
    starterOscillator.frequency.setValueAtTime(48, now);
    starterOscillator.frequency.exponentialRampToValueAtTime(155, now + 0.25);
    starterOscillator.connect(starterGain).connect(engineFilter);
    starterOscillator.onended = () => { starterOscillator = null; };
    starterOscillator.start(now);
    starterOscillator.stop(now + 0.34);

    engineGain.gain.setTargetAtTime(0.04, now, 0.08);
  }

  function stopEngine() {
    if (!audioContext || !engineOscillator) return;
    const now = audioContext.currentTime;
    if (starterOscillator) {
      starterOscillator.stop(now + 0.01);
      starterOscillator = null;
    }
    engineGain.gain.setTargetAtTime(0, now, 0.06);
    engineOscillator.stop(now + 0.2);
    engineHarmonic.stop(now + 0.2);
    engineNoise.stop(now + 0.2);
    engineOscillator = null;
    engineHarmonic = null;
    engineNoise = null;
  }

  function updateEngineSound(absSpeed) {
    if (!audioContext || !engineOscillator) return;
    const t = THREE.MathUtils.clamp(absSpeed / maxSpeedMps, 0, 1);
    const now = audioContext.currentTime;
    const frequency = 48 + t * 118;
    engineOscillator.frequency.setTargetAtTime(frequency, now, 0.045);
    engineHarmonic.frequency.setTargetAtTime(frequency * 2.01, now, 0.045);
    engineFilter.frequency.setTargetAtTime(700 + t * 2200, now, 0.08);
    engineGain.gain.setTargetAtTime(0.03 + t * 0.05, now, 0.08);
    engineNoiseGain.gain.setTargetAtTime(0.00625 + t * 0.01375, now, 0.08);
  }

  // ---------- dust ----------
  const DUST_N = 18;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST_N * 3);
  const dustAge = new Float32Array(DUST_N).fill(999);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xcabf9e, size: 0.2, transparent: true, opacity: 0, depthWrite: false
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);
  let dustCursor = 0;

  // ---------- state ----------
  const MOUNT_RADIUS = 3.6;
  let riding = false;
  let heading = rotationY;
  let speed = 0;
  let leanZ = 0;
  let kickAmt = 1;
  let bobT = 0;
  let prevE = false;
  let verticalVelocity = 0;
  let airborne = false;
  let jumpCooldown = 0;
  const _seatWorld = new THREE.Vector3();

  function nearBike(px, pz) {
    return Math.hypot(px - bikeGroup.position.x, pz - bikeGroup.position.z) < MOUNT_RADIUS;
  }

  function startRiding(player) {
    riding = true;
    speed = 0;
    verticalVelocity = 0;
    airborne = false;
    heading = bikeGroup.rotation.y;
    player.setVehiclePose('bike');
    player.setExternalControl(true);
    // make sure the walking mesh is the one we park on the seat
    if (player.mounted) {
      // should not happen (canRide guards), but be safe
    }
    startEngine();
    onEvent('mount');
  }

  function stopRiding(player) {
    riding = false;
    speed = 0;
    const sideX = Math.cos(heading) * 1.5;
    const sideZ = -Math.sin(heading) * 1.5;
    player.setVehiclePose('none');
    player.setExternalControl(false);
    player.teleportWalker(
      bikeGroup.position.x + sideX,
      terrainHeight(bikeGroup.position.x + sideX, bikeGroup.position.z + sideZ),
      bikeGroup.position.z + sideZ,
      heading
    );
    stopEngine();
    onEvent('dismount');
  }

  function spawnDust() {
    const i = dustCursor;
    dustCursor = (dustCursor + 1) % DUST_N;
    const backX = bikeGroup.position.x - Math.sin(heading) * (WHEEL_R + 0.4);
    const backZ = bikeGroup.position.z - Math.cos(heading) * (WHEEL_R + 0.4);
    dustPos[i * 3]     = backX + (Math.random() - 0.5) * 0.4;
    dustPos[i * 3 + 1] = bikeGroup.position.y + 0.14;
    dustPos[i * 3 + 2] = backZ + (Math.random() - 0.5) * 0.4;
    dustAge[i] = 0;
  }

  function update(dt, keys, player) {
    if (!player) return;
    const p = player.position;
    const canRide = !player.mounted && !player.sitting;
    const near = !riding && canRide && nearBike(p.x, p.z);

    const shouldRender = riding || Math.hypot(p.x - bikeGroup.position.x, p.z - bikeGroup.position.z) < 145;
    bikeGroup.visible = shouldRender;
    dustPoints.visible = shouldRender;
    if (!shouldRender) return;

    promptEl.textContent = riding ? 'Press E to hop off the bike' : 'Press E to hop on the bike';
    promptEl.style.opacity = (!riding && near) ? '1' : '0';

    // E to mount / dismount (consume key so horse/cabin don't also fire)
    const eDown = !!keys['e'];
    if (eDown && !prevE) {
      if (riding) {
        stopRiding(player);
        keys['e'] = false;
      } else if (near) {
        startRiding(player);
        keys['e'] = false;
      }
    }
    prevE = eDown;

    if (riding) {
      jumpCooldown = Math.max(0, jumpCooldown - dt);
      let acc = 0;
      const joyDrive = Number(keys.joyForward) || 0;
      if (Math.abs(joyDrive) > 0.001) acc = joyDrive;
      else if (keys['w'] || keys['arrowup']) acc = 1;
      else if (keys['s'] || keys['arrowdown']) acc = -1;

      // Road/trail is fastest; off-road still works but caps lower
      const roadGrip = 1 - THREE.MathUtils.smoothstep(
        roadDistance(bikeGroup.position.x, bikeGroup.position.z), 1.25, 6.0
      );
      // The motorcycle has one 100 km/h top speed on every surface. Trails can
      // still improve acceleration and handling without making forward input
      // depend on Shift.
      const roadMax = maxSpeedMps;
      const maxSpeed = maxSpeedMps;

      if (acc > 0) {
        // Stronger accel so 0→100 feels like a real bike (~6–8 s on road)
        speed = THREE.MathUtils.clamp(
          speed + acc * THREE.MathUtils.lerp(10, 22, roadGrip) * dt,
          -4, maxSpeed
        );
      } else if (acc < 0) {
        if (speed > 0.05) speed = Math.max(0, speed - THREE.MathUtils.lerp(14, 26, roadGrip) * dt);
        else speed = Math.max(-4, speed - 11 * dt);
      } else {
        speed *= Math.max(0, 1 - dt * THREE.MathUtils.lerp(2.4, 0.9, roadGrip));
      }

      let turn = 0;
      const joyTurn = Number(keys.joyTurn) || 0;
      if (Math.abs(joyTurn) > 0.001) turn = joyTurn;
      else if (keys['a'] || keys['arrowleft']) turn = 1;
      else if (keys['d'] || keys['arrowright']) turn = -1;

      const speedFactor = Math.min(1, Math.abs(speed) / Math.max(5, roadMax * 0.35));
      const turnRate = 1.65 * (0.28 + 0.72 * speedFactor) *
        (1 - Math.min(1, Math.abs(speed) / Math.max(1, maxSpeed)) * 0.42);
      heading += turn * turnRate * dt * (speed < 0 ? -1 : 1);
      bikeGroup.rotation.y = heading;

      const terrainAhead = terrainHeight(
        bikeGroup.position.x + Math.sin(heading) * 1.5,
        bikeGroup.position.z + Math.cos(heading) * 1.5
      );
      const terrainFarAhead = terrainHeight(
        bikeGroup.position.x + Math.sin(heading) * 3.2,
        bikeGroup.position.z + Math.cos(heading) * 3.2
      );
      const terrainRise = terrainAhead - terrainHeight(bikeGroup.position.x, bikeGroup.position.z);
      const crestDrop = terrainFarAhead - terrainAhead;
      const terrainJump = !airborne && jumpCooldown <= 0 && Math.abs(speed) > 8 && terrainRise > 0.38 && crestDrop < 0.18
        ? THREE.MathUtils.clamp(Math.abs(speed) * 0.42 + terrainRise * 2.0, 5.5, 12.5)
        : 0;
      const jumpImpulse = Math.max(
        jumpProvider(bikeGroup.position, heading, Math.abs(speed)),
        terrainJump
      );
      let launchedThisFrame = false;
      if (!airborne && jumpImpulse > 0) {
        airborne = true;
        launchedThisFrame = true;
        jumpCooldown = 0.9;
        verticalVelocity = jumpImpulse;
      }

      const moveSteps = THREE.MathUtils.clamp(Math.ceil(Math.abs(speed * dt) / 0.45), 1, 5);
      const stepDistance = speed * dt / moveSteps;
      for (let step = 0; step < moveSteps; step++) {
        bikeGroup.position.x += Math.sin(heading) * stepDistance;
        bikeGroup.position.z += Math.cos(heading) * stepDistance;
        if (collision) {
          const resolved = collision.resolve(
            { x: bikeGroup.position.x, z: bikeGroup.position.z }, 0.65
          );
          bikeGroup.position.x = resolved.x;
          bikeGroup.position.z = resolved.z;
        }
      }

      const terrainY = terrainHeight(bikeGroup.position.x, bikeGroup.position.z);
      const surfaceY = surfaceProvider(bikeGroup.position);
      const gy = surfaceY === null ? terrainY : Math.max(terrainY, surfaceY);
      const aheadY = terrainHeight(
        bikeGroup.position.x + Math.sin(heading) * 1.4,
        bikeGroup.position.z + Math.cos(heading) * 1.4
      );
      speed -= ((aheadY - gy) / 1.4) * 4.8 * dt;
      speed = THREE.MathUtils.clamp(speed, -4, roadMax);

      if (airborne) {
        if (launchedThisFrame) bikeGroup.position.y = Math.max(bikeGroup.position.y, gy);
        verticalVelocity -= 22 * dt;
        bikeGroup.position.y += verticalVelocity * dt;
        if (bikeGroup.position.y <= gy) {
          bikeGroup.position.y = gy;
          verticalVelocity = 0;
          airborne = false;
        }
      } else {
        bikeGroup.position.y += (gy - bikeGroup.position.y) * Math.min(1, dt * 10);
      }

      const targetLean = THREE.MathUtils.clamp(-turn * speedFactor * 0.38, -0.42, 0.42);
      leanZ += (targetLean - leanZ) * Math.min(1, dt * 7);
      bikeGroup.rotation.z = leanZ;

      const wheelSpin = speed / WHEEL_R;
      frontWheel.rotation.x += wheelSpin * dt;
      rearWheel.rotation.x += wheelSpin * dt;

      bobT += dt * (5 + speedFactor * 9);
      chassis.position.y = Math.sin(bobT) * 0.007 * speedFactor;

      kickAmt += (0 - kickAmt) * Math.min(1, dt * 8);
      kickstandPivot.rotation.z = kickAmt * 0.95;

      if (bikeCollider) bikeCollider.enabled = false;

      // ===== sit the walker astride the main seat =====
      // Hip height of walker is ~0.85; seat top is the pad surface.
      // Offset so the character's hips rest ON the seat, legs hang astride.
      mainSeat.getWorldPosition(_seatWorld);
      player.teleportWalker(
        _seatWorld.x,
        _seatWorld.y - 0.87,   // walker origin places hips on the saddle
        _seatWorld.z,
        heading
      );
      player.setExternalSpeed(speed);

      updateEngineSound(Math.abs(speed));

      if (Math.abs(speed) > 3.5) spawnDust();
      dustMat.opacity = Math.abs(speed) > 3.5 ? 0.48 : Math.max(0, dustMat.opacity - dt);
      for (let i = 0; i < DUST_N; i++) {
        if (dustAge[i] > 1.2) continue;
        dustAge[i] += dt;
        dustPos[i * 3 + 1] += dt * 0.45;
      }
      dustGeo.attributes.position.needsUpdate = true;

    } else {
      kickAmt += (1 - kickAmt) * Math.min(1, dt * 4);
      kickstandPivot.rotation.z = kickAmt * 0.95;
      leanZ += (0.14 - leanZ) * Math.min(1, dt * 3);
      bikeGroup.rotation.z = leanZ;
      chassis.position.y += (0 - chassis.position.y) * Math.min(1, dt * 4);

      if (bikeCollider) {
        bikeCollider.enabled = true;
        bikeCollider.x = bikeGroup.position.x;
        bikeCollider.z = bikeGroup.position.z;
      }
      dustMat.opacity = Math.max(0, dustMat.opacity - dt);
    }
  }

  return {
    update,
    group: bikeGroup,
    get riding() { return riding; },
    get position() { return bikeGroup.position; },
    get speed() { return speed; }
  };
}