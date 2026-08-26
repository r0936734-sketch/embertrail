// ============================================================================
// player.js — rebuilt limb rig
//
// What changed vs the original:
//  1. Dismounted character had NO ARMS at all -> added full shoulder/elbow/hand
//     arms, swung naturally opposite the legs.
//  2. Legs (both horse and walker) rotated a single box around its own
//     center instead of swinging from a joint -> rebuilt as hip -> upper leg
//     -> knee -> lower leg -> foot/hoof, same pattern used for arms.
//  3. BUG: horse legs kept swinging even at speed = 0 while mounted, because
//     gaitAmp/gaitFreq had a non-zero baseline ("0.15 + ...", "1.6 + ...").
//     Now amplitude/frequency target 0 when the horse isn't moving and are
//     smoothly damped toward that target, so legs ease to a stopped stance
//     instead of endlessly swinging (or snapping).
//  4. Added extra realism: knee bend during swing, hooves, ears, mane,
//     tail/ear idle sway, breathing, head nod, and the rider bouncing/
//     leaning with the horse's gait.
//
// Public API (createPlayer signature + returned object) is unchanged, so
// this file is a drop-in replacement — nothing else needs to change.
// ============================================================================

export function createPlayer(scene, terrainHeight, terrainNormalApprox, playHoofFn, playWhistleFn, playRearFn, collision) {
  const player = new THREE.Group();
  const horseMat = new THREE.MeshStandardMaterial({ color: 0x6b3a22, roughness: 1, flatShading: true });
  const darkMat  = new THREE.MeshStandardMaterial({ color: 0x2e1c12, roughness: 1, flatShading: true });
  const hoofMat  = new THREE.MeshStandardMaterial({ color: 0x14100d, roughness: 0.9, flatShading: true });

  // ---------- reusable jointed-limb builders ----------
  // Leg: hip (swing) -> upper leg -> knee (bend) -> lower leg -> foot/hoof
  function makeLimb(parent, hipPos, upperLen, lowerLen, thickness, upperMat, lowerMat, footSize, footMat) {
    const hip = new THREE.Group();
    hip.position.set(hipPos.x, hipPos.y, hipPos.z);
    parent.add(hip);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(thickness, upperLen, thickness), upperMat);
    upper.position.y = -upperLen / 2;
    hip.add(upper);

    const knee = new THREE.Group();
    knee.position.y = -upperLen;
    hip.add(knee);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(thickness * 0.82, lowerLen, thickness * 0.82), lowerMat);
    lower.position.y = -lowerLen / 2;
    knee.add(lower);

    let foot = null;
    if (footSize) {
      foot = new THREE.Mesh(new THREE.BoxGeometry(footSize.x, footSize.y, footSize.z), footMat || lowerMat);
      foot.position.set(0, -lowerLen - footSize.y / 2, footSize.z * 0.18);
      knee.add(foot);
    }
    return { hip, knee, upper, lower, foot };
  }

  // Arm: shoulder (swing) -> upper arm -> elbow (bend) -> lower arm -> hand
  function makeArm(parent, shoulderPos, upperLen, lowerLen, thickness, sleeveMat, handMat, handRadius) {
    const shoulder = new THREE.Group();
    shoulder.position.set(shoulderPos.x, shoulderPos.y, shoulderPos.z);
    parent.add(shoulder);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(thickness, upperLen, thickness), sleeveMat);
    upper.position.y = -upperLen / 2;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -upperLen;
    shoulder.add(elbow);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(thickness * 0.82, lowerLen, thickness * 0.82), sleeveMat);
    lower.position.y = -lowerLen / 2;
    elbow.add(lower);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(handRadius, 8, 8), handMat);
    hand.position.y = -lowerLen - handRadius * 0.7;
    elbow.add(hand);

    return { shoulder, elbow, upper, lower, hand };
  }

  // ---------- Horse ----------
  const horseBody = new THREE.Group();
  player.add(horseBody);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 2.3), horseMat);
  body.position.y = 1.55;
  horseBody.add(body);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.0, 0.6), horseMat);
  neck.position.set(0, 2.15, 1.25);
  neck.rotation.x = -0.5;
  horseBody.add(neck);

  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.18), darkMat);
  mane.position.set(0, 2.5, 1.05);
  mane.rotation.x = -0.5;
  horseBody.add(mane);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.9), horseMat);
  head.position.set(0, 2.55, 1.85);
  horseBody.add(head);

  const forelock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.12), darkMat);
  forelock.position.set(0, 2.83, 1.55);
  horseBody.add(forelock);

  const earGeo = new THREE.BoxGeometry(0.1, 0.2, 0.08);
  const earL = new THREE.Mesh(earGeo, horseMat);
  earL.position.set(-0.16, 0.32, -0.05);
  earL.rotation.z = 0.25;
  head.add(earL);
  const earR = new THREE.Mesh(earGeo, horseMat);
  earR.position.set(0.16, 0.32, -0.05);
  earR.rotation.z = -0.25;
  head.add(earR);

  const legUpperLen = 0.6, legLowerLen = 0.42, legThickness = 0.26;
  const legHipY = 0.58 + 0.575; // same pivot height as the original rig
  const legs = [];
  [[-0.42, 0.85], [0.42, 0.85], [-0.42, -0.85], [0.42, -0.85]].forEach(p => {
    legs.push(makeLimb(
      horseBody,
      { x: p[0], y: legHipY, z: p[1] },
      legUpperLen, legLowerLen, legThickness,
      darkMat, darkMat,
      { x: 0.3, y: 0.135, z: 0.32 }, hoofMat
    ));
  });

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.0, 6), darkMat);
  tail.position.set(0, 1.5, -1.25);
  tail.rotation.x = Math.PI * 0.42;
  horseBody.add(tail);

  // ---------- Rider (visible only when mounted) ----------
  const riderGroup = new THREE.Group();
  horseBody.add(riderGroup);

  const riderMat = new THREE.MeshStandardMaterial({ color: 0x2b3a55, roughness: 1, flatShading: true });
  const skinMat  = new THREE.MeshStandardMaterial({ color: 0xc9946b, roughness: 1, flatShading: true });
  const hatMat   = new THREE.MeshStandardMaterial({ color: 0x1c1a17, roughness: 1, flatShading: true });
  const shirtDetailMat = new THREE.MeshStandardMaterial({ color: 0x7fa5d4, roughness: 0.82, flatShading: true });
  const packMat = new THREE.MeshStandardMaterial({ color: 0x5a3825, roughness: 0.9, flatShading: true });
  const faceDetailMat = new THREE.MeshBasicMaterial({ color: 0x241a16 });

  const torsoBaseY = 2.55;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.4), riderMat);
  torso.position.set(0, torsoBaseY, 0.05);
  riderGroup.add(torso);
  const riderPlacket = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.62, 0.025), shirtDetailMat);
  riderPlacket.position.set(0, torsoBaseY, 0.265);
  riderGroup.add(riderPlacket);
  const riderPack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.2), packMat);
  riderPack.position.set(0, 2.58, -0.22);
  riderGroup.add(riderPack);

  const riderHeadBaseY = 3.15;
  const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), skinMat);
  riderHead.position.set(0, riderHeadBaseY, 0.05);
  riderGroup.add(riderHead);
  [-0.08, 0.08].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.027, 6, 6), faceDetailMat);
    eye.position.set(x, riderHeadBaseY + 0.04, 0.27);
    riderGroup.add(eye);
  });

  const hatBrimBaseY = 3.34;
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 10), hatMat);
  hatBrim.position.set(0, hatBrimBaseY, 0.05);
  riderGroup.add(hatBrim);

  const hatTopBaseY = 3.48;
  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.24, 10), hatMat);
  hatTop.position.set(0, hatTopBaseY, 0.05);
  riderGroup.add(hatTop);

  const riderArmBaseY = 2.85;
  const riderArmL = makeArm(riderGroup, { x: -0.34, y: riderArmBaseY, z: 0.15 }, 0.3, 0.28, 0.15, riderMat, skinMat, 0.09);
  const riderArmR = makeArm(riderGroup, { x: 0.34, y: riderArmBaseY, z: 0.15 }, 0.3, 0.28, 0.15, riderMat, skinMat, 0.09);
  [riderArmL, riderArmR].forEach(arm => {
    arm.shoulder.rotation.x = -0.4; // arms angled forward/down toward the reins
    arm.elbow.rotation.x = -1.0;    // forearm bent forward
  });

  function makeBinoculars(parent, pos, scale = 1) {
    const binoculars = new THREE.Group();
    binoculars.position.set(...pos);
    binoculars.scale.setScalar(scale);
    const casing = new THREE.MeshStandardMaterial({ color: 0x161a1d, roughness: 0.55, metalness: 0.45, flatShading: true });
    const lens = new THREE.MeshBasicMaterial({ color: 0x6ea9c9 });
    [-0.11, 0.11].forEach(x => {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.32, 10), casing);
      tube.rotation.x = Math.PI / 2;
      tube.position.x = x;
      binoculars.add(tube);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), lens);
      glass.position.set(x, 0, 0.165);
      binoculars.add(glass);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.22), casing);
    binoculars.add(bridge);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 5, 12, Math.PI), casing);
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0, -0.18, -0.03);
    binoculars.add(strap);
    binoculars.visible = false;
    parent.add(binoculars);
    return binoculars;
  }

  const riderBinoculars = makeBinoculars(riderGroup, [0, 3.2, 0.36], 0.9);

  // ---------- Walking character (shown when dismounted) ----------
  const walker = new THREE.Group();
  walker.visible = false;
  scene.add(walker);

  const walkHipY = 0.85;
  const walkUpperBody = new THREE.Group(); // everything above the hips: leans/bobs as one unit
  walkUpperBody.position.y = walkHipY;
  walker.add(walkUpperBody);

  const walkBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.85, 0.3), riderMat);
  walkBody.position.set(0, 0.40, 0);
  walkUpperBody.add(walkBody);
  const walkPlacket = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.7, 0.022), shirtDetailMat);
  walkPlacket.position.set(0, 0.4, 0.162);
  walkUpperBody.add(walkPlacket);
  const walkPocket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.025), shirtDetailMat);
  walkPocket.position.set(-0.13, 0.5, 0.165);
  walkUpperBody.add(walkPocket);
  const walkPack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.48, 0.18), packMat);
  walkPack.position.set(0, 0.45, -0.22);
  walkUpperBody.add(walkPack);

  const walkHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), skinMat);
  walkHead.position.set(0, 1.05, 0);
  walkUpperBody.add(walkHead);
  [-0.07, 0.07].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.023, 6, 6), faceDetailMat);
    eye.position.set(x, 1.08, 0.215);
    walkUpperBody.add(eye);
  });
  const walkBeard = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.035), faceDetailMat);
  walkBeard.position.set(0, 0.96, 0.215);
  walkUpperBody.add(walkBeard);

  const walkHatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.05, 10), hatMat);
  walkHatBrim.position.set(0, 1.22, 0);
  walkUpperBody.add(walkHatBrim);
  const walkHatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.22, 10), hatMat);
  walkHatTop.position.set(0, 1.35, 0);
  walkUpperBody.add(walkHatTop);
  const walkHatBand = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.025, 6, 10), shirtDetailMat);
  walkHatBand.rotation.x = Math.PI / 2;
  walkHatBand.position.set(0, 1.28, 0);
  walkUpperBody.add(walkHatBand);

  // arms — this is what the dismounted character was missing entirely
  const walkArmL = makeArm(walkUpperBody, { x: -0.29, y: 0.70, z: 0 }, 0.30, 0.26, 0.14, riderMat, skinMat, 0.085);
  const walkArmR = makeArm(walkUpperBody, { x: 0.29, y: 0.70, z: 0 }, 0.30, 0.26, 0.14, riderMat, skinMat, 0.085);
  [walkArmL, walkArmR].forEach(arm => {
    arm.shoulder.rotation.x = -0.05;
    arm.elbow.rotation.x = 0.08;
  });
  const walkBinoculars = makeBinoculars(walkUpperBody, [0, 1.08, 0.31]);

  // legs — now jointed at hip + knee instead of rotating a single box
  const walkLegUpperLen = 0.42, walkLegLowerLen = 0.35, walkLegThickness = 0.16;
  const walkLegL = makeLimb(walker, { x: -0.14, y: walkHipY, z: 0 }, walkLegUpperLen, walkLegLowerLen, walkLegThickness, riderMat, riderMat, { x: 0.16, y: 0.08, z: 0.26 }, darkMat);
  const walkLegR = makeLimb(walker, { x: 0.14, y: walkHipY, z: 0 }, walkLegUpperLen, walkLegLowerLen, walkLegThickness, riderMat, riderMat, { x: 0.16, y: 0.08, z: 0.26 }, darkMat);

  // shadow
  const shadowBlob = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, fog: false })
  );
  shadowBlob.rotation.x = -Math.PI / 2;
  shadowBlob.position.y = 0.02;
  player.add(shadowBlob);

  player.position.set(4, terrainHeight(4, 6), 6);
  scene.add(player);

  // ---------- state ----------
  let mounted = true;          // true = riding, false = walking
  let sitting = false;
  let heading = 0.3;
  let speed = 0;
  let stamina = 100;
  const staminaMax = 100;
  const maxWalk = 3.2, maxTrot = 6.6, maxCanter = 10.2, maxGallop = 15.5;
  const walkSpeed = 2.8;
  const accelBase = 13, decelBase = 16, turnRateBase = 2.3;
  let gaitPhase = 0;
  let gaitAmpSmoothed = 0;
  let gaitFreqSmoothed = 0;
  let rearing = false;
  let rearTimer = 0;
  let bankZ = 0;
  let pitchX = 0;
  let hoofAccum = 0;
  let walkPhase = 0;
  let walkLegAmp = 0;
  let walkKneeAmp = 0;
  let walkBob = 0;
  let walkLean = 0;
  let walkForwardLean = 0;
  let idleTime = 0;
  let climbUnlocked = false;
  let velocityY = 0;
  let grounded = true;
  let externalControl = false;
  let isInside = false;
  let cameraNeedsSnap = false;
  let indoorCameraBounds = null;
  let traversalPose = 'none';
  let binocularsRaised = false;
  let archeryActive = false;
  let archeryDraw = 0;
  let archeryYaw = null;
  let groundHeightFn = terrainHeight;
  const GRAVITY = 22;
  const JUMP_SPEED = 7.4;
  const WALK_RADIUS = 0.48;
  const HORSE_RADIUS = 0.95;

  const legPhaseOffsets = [0, Math.PI, Math.PI * 0.9, -0.1];

  // horse stays where we left it when dismounted
  let horsePos = new THREE.Vector3();
  let horseHeading = 0;

  function resetLegPose(limb) {
    limb.hip.rotation.x = 0;
    limb.knee.rotation.x = 0;
  }

  function currentGaitName(abs) {
    if (sitting) return 'sitting';
    if (!mounted) return 'walking';
    if (rearing) return 'rearing';
    if (abs < 0.25) return 'idle';
    if (abs < maxWalk + 0.3) return 'walk';
    if (abs < maxTrot + 0.3) return 'trot';
    if (abs < maxCanter + 0.4) return 'canter';
    return 'gallop';
  }

  function triggerRear() {
    if (!mounted || rearing || sitting) return;
    if (Math.abs(speed) < 1.2) {
      rearing = true;
      rearTimer = 0.75;
      playRearFn();
    }
  }

  function dismount() {
    if (!mounted || sitting) return;
    mounted = false;
    speed = 0;

    // hide rider on horse, show walking character
    riderGroup.visible = false;
    walker.visible = true;

    // place walker a bit to the side of the horse
    const side = 1.8;
    walker.position.set(
      player.position.x + Math.cos(heading) * side,
      terrainHeight(player.position.x, player.position.z),
      player.position.z - Math.sin(heading) * side
    );
    walker.rotation.y = heading;
    walker.rotation.z = 0;

    // stand the walker in a clean neutral pose rather than resuming mid-stride
    walkUpperBody.rotation.set(0, 0, 0);
    walkUpperBody.position.y = walkHipY;
    walkLegAmp = 0; walkKneeAmp = 0; walkBob = 0; walkLean = 0; walkForwardLean = 0;
    resetLegPose(walkLegL);
    resetLegPose(walkLegR);
    walkArmL.shoulder.rotation.x = -0.05; walkArmL.elbow.rotation.x = 0.08;
    walkArmR.shoulder.rotation.x = -0.05; walkArmR.elbow.rotation.x = 0.08;

    // the horse settles into a resting stance the moment the rider dismounts
    legs.forEach(resetLegPose);
    gaitAmpSmoothed = 0;
    gaitFreqSmoothed = 0;

    // remember where the horse is
    horsePos.copy(player.position);
    horseHeading = heading;
  }

  function mount() {
    if (mounted || sitting) return;

    // only allow mount if close enough to the horse
    const dist = walker.position.distanceTo(player.position);
    if (dist > 4.5) return;

    mounted = true;
    riderGroup.visible = true;
    walker.visible = false;

    // snap horse to current player position (already correct)
    speed = 0;
  }

  function callHorse() {
    if (mounted || sitting) return;
    playWhistleFn();

    // gently move the horse toward the player
    const dx = walker.position.x - player.position.x;
    const dz = walker.position.z - player.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 2) return;

    // simple lerp over a few frames is done in update
    player.userData.called = true;
    player.userData.callTarget = walker.position.clone();
  }

  function trySit(fireGroup) {
    if (sitting) {
      // stand up
      sitting = false;
      walker.visible = true;

      walkUpperBody.rotation.set(0, 0, 0);
      walkUpperBody.position.y = walkHipY;
      resetLegPose(walkLegL);
      resetLegPose(walkLegR);
      walkArmL.shoulder.rotation.x = -0.05; walkArmL.elbow.rotation.x = 0.08;
      walkArmR.shoulder.rotation.x = -0.05; walkArmR.elbow.rotation.x = 0.08;
      return;
    }
    if (mounted) return;

    const dist = walker.position.distanceTo(fireGroup.position);
    if (dist > 5.5) return;

    sitting = true;
    walker.visible = false;
    // move a bit closer and face the fire
    const dir = new THREE.Vector3()
      .subVectors(fireGroup.position, walker.position)
      .normalize();
    walker.position.addScaledVector(dir, 1.2);
    walker.position.y = terrainHeight(walker.position.x, walker.position.z);
    walker.lookAt(fireGroup.position.x, walker.position.y, fireGroup.position.z);

    // sit down: bent knees, hands resting near the knees, slight forward lean
    walkUpperBody.rotation.set(0.15, 0, 0);
    walkUpperBody.position.y = walkHipY - 0.15;
    resetLegPose(walkLegL);
    resetLegPose(walkLegR);
    walkLegL.hip.rotation.x = -1.3; walkLegL.knee.rotation.x = 1.4;
    walkLegR.hip.rotation.x = -1.3; walkLegR.knee.rotation.x = 1.4;
    walkArmL.shoulder.rotation.x = -0.3; walkArmL.elbow.rotation.x = 0.3;
    walkArmR.shoulder.rotation.x = -0.3; walkArmR.elbow.rotation.x = 0.3;
    walkLegAmp = 0; walkKneeAmp = 0; walkBob = 0; walkLean = 0; walkForwardLean = 0;
  }

  function update(dt, keys, fireGroup) {
    if (archeryActive) keys = { ...keys, shift: false }; // aim while walking, never sprint
    if (externalControl) return;
    idleTime += dt;

    // ---------- key actions ----------
    if (keys['e']) {
      if (mounted) dismount();
      else mount();
      keys['e'] = false;
    }
    if (keys['h']) {
      callHorse();
      keys['h'] = false;
    }
    if (keys['t']) {
      trySit(fireGroup);
      keys['t'] = false;
    }
    if (keys[' ']) {
      if (mounted) triggerRear();
      else if (!sitting && grounded) {
        velocityY = JUMP_SPEED;
        grounded = false;
      }
      keys[' '] = false;
    }

    // ---------- always-on idle life for the horse (visible whether mounted or not) ----------
    const idleBreath = Math.sin(idleTime * 1.6) * 0.015;
    tail.rotation.z = Math.sin(idleTime * 1.4) * 0.08;
    earL.rotation.x = Math.sin(idleTime * 2.2) * 0.06;
    earR.rotation.x = Math.sin(idleTime * 2.35 + 0.6) * 0.06;

    // ---------- called horse walks toward player ----------
    if (player.userData.called && !mounted) {
      const target = player.userData.callTarget;
      const dx = target.x - player.position.x;
      const dz = target.z - player.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 2.2) {
        const ang = Math.atan2(dx, dz);
        player.position.x += Math.sin(ang) * 4.5 * dt;
        player.position.z += Math.cos(ang) * 4.5 * dt;
        player.position.y = terrainHeight(player.position.x, player.position.z);
        player.rotation.y = ang;

        // walking leg animation while the horse comes on its own
        gaitPhase += dt * 8;
        const amp = 0.4;
        for (let i = 0; i < 4; i++) {
          const targetHip = Math.sin(gaitPhase + legPhaseOffsets[i]) * amp;
          legs[i].hip.rotation.x += (targetHip - legs[i].hip.rotation.x) * Math.min(1, dt * 10);
          const targetKnee = Math.max(0, Math.cos(gaitPhase + legPhaseOffsets[i])) * amp * 1.3;
          legs[i].knee.rotation.x += (targetKnee - legs[i].knee.rotation.x) * Math.min(1, dt * 10);
        }
        body.position.y = 1.55 + Math.sin(gaitPhase * 2) * 0.04;
      } else {
        player.userData.called = false;
      }
    } else if (!mounted) {
      body.position.y = 1.55 + idleBreath;
    }

    // ---------- sitting → do nothing ----------
    if (sitting) {
      speed = 0;
      return;
    }

    // ---------- walking mode ----------
    if (!mounted) {
      let acc = 0;
      const joystickDrive = Number(keys.joyForward) || 0;
      if (Math.abs(joystickDrive) > 0.001) acc = joystickDrive;
      else if (keys['w'] || keys['arrowup']) acc = 1;
      else if (keys['s'] || keys['arrowdown']) acc = -0.6;

      if (acc !== 0) {
        const sprinting = !!keys['shift'];
        const cap = walkSpeed * (sprinting ? 2.05 : 1);
        speed = THREE.MathUtils.clamp(speed + acc * (sprinting ? 10 : 8) * dt, -walkSpeed * 0.6, cap);
      } else {
        speed *= Math.max(0, 1 - dt * 6);
      }

      let turn = 0;
      const joystickTurn = Number(keys.joyTurn) || 0;
      if (Math.abs(joystickTurn) > 0.001) turn = joystickTurn;
      else if (keys['a'] || keys['arrowleft']) turn = 1;
      else if (keys['d'] || keys['arrowright']) turn = -1;
      heading += turn * 2.8 * dt;

      walker.rotation.y = heading;
      walker.position.x += Math.sin(heading) * speed * dt;
      walker.position.z += Math.cos(heading) * speed * dt;
      if (collision) {
        const resolved = collision.resolve({ x: walker.position.x, z: walker.position.z }, WALK_RADIUS);
        walker.position.x = resolved.x;
        walker.position.z = resolved.z;
      }
      const groundY = groundHeightFn(walker.position.x, walker.position.z);
      velocityY -= GRAVITY * dt;
      walker.position.y += velocityY * dt;
      if (walker.position.y <= groundY) {
        walker.position.y = groundY;
        velocityY = 0;
        grounded = true;
      } else {
        grounded = false;
      }

      // ---- walk cycle: hips, knees, arms, torso lean & bob ----
      const moveFactor = THREE.MathUtils.clamp(Math.abs(speed) / 1.6, 0, 1);
      walkPhase += dt * (3.6 + Math.abs(speed) * 3.0);

      const legAmpTarget = moveFactor * 0.5;
      walkLegAmp += (legAmpTarget - walkLegAmp) * Math.min(1, dt * 8);
      const kneeAmpTarget = moveFactor * 0.85;
      walkKneeAmp += (kneeAmpTarget - walkKneeAmp) * Math.min(1, dt * 8);

      const phaseL = walkPhase;
      const phaseR = walkPhase + Math.PI;

      const hipAngleL = Math.sin(phaseL) * walkLegAmp;
      const hipAngleR = Math.sin(phaseR) * walkLegAmp;
      walkLegL.hip.rotation.x += (hipAngleL - walkLegL.hip.rotation.x) * Math.min(1, dt * 12);
      walkLegR.hip.rotation.x += (hipAngleR - walkLegR.hip.rotation.x) * Math.min(1, dt * 12);

      const kneeAngleL = Math.max(0, Math.cos(phaseL)) * walkKneeAmp;
      const kneeAngleR = Math.max(0, Math.cos(phaseR)) * walkKneeAmp;
      walkLegL.knee.rotation.x += (kneeAngleL - walkLegL.knee.rotation.x) * Math.min(1, dt * 12);
      walkLegR.knee.rotation.x += (kneeAngleR - walkLegR.knee.rotation.x) * Math.min(1, dt * 12);

      // arms swing opposite the same-side leg, like a natural stride
      const armAngleL = Math.sin(phaseR) * walkLegAmp * 0.8 - 0.05;
      const armAngleR = Math.sin(phaseL) * walkLegAmp * 0.8 - 0.05;
      walkArmL.shoulder.rotation.x += (armAngleL - walkArmL.shoulder.rotation.x) * Math.min(1, dt * 12);
      walkArmR.shoulder.rotation.x += (armAngleR - walkArmR.shoulder.rotation.x) * Math.min(1, dt * 12);
      const elbowBendTarget = 0.08 + walkLegAmp * 0.35;
      walkArmL.elbow.rotation.x += (elbowBendTarget - walkArmL.elbow.rotation.x) * Math.min(1, dt * 10);
      walkArmR.elbow.rotation.x += (elbowBendTarget - walkArmR.elbow.rotation.x) * Math.min(1, dt * 10);

      // torso bob (double-frequency, one bounce per footstep) + turning lean
      const bobTarget = Math.abs(Math.sin(walkPhase)) * 0.06 * moveFactor;
      walkBob += (bobTarget - walkBob) * Math.min(1, dt * 10);
      const idleSway = Math.sin(idleTime * 1.1) * 0.01 * (1 - moveFactor);
      walkUpperBody.position.y = walkHipY + walkBob + idleSway;

      const leanTarget = -turn * 0.09 * moveFactor;
      walkLean += (leanTarget - walkLean) * Math.min(1, dt * 6);
      walkUpperBody.rotation.z = walkLean;

      const forwardLeanTarget = moveFactor * 0.06;
      walkForwardLean += (forwardLeanTarget - walkForwardLean) * Math.min(1, dt * 6);
      walkUpperBody.rotation.x = walkForwardLean;

      return;
    }

    // ---------- mounted mode (original horse logic, gait now smoothed) ----------
    if (rearing) {
      rearTimer -= dt;
      speed *= Math.max(0, 1 - dt * 3);
      if (rearTimer <= 0) rearing = false;
    } else {
      let accInput = 0;
      const joystickDrive = Number(keys.joyForward) || 0;
      if (Math.abs(joystickDrive) > 0.001) accInput = joystickDrive;
      else if (keys['w'] || keys['arrowup']) accInput = 1;
      else if (keys['s'] || keys['arrowdown']) accInput = -0.55;

      const galloping = keys['shift'] && accInput > 0;
      const desiredMax = galloping ? maxGallop : maxCanter;

      if (accInput > 0) speed = Math.min(desiredMax, speed + accelBase * dt * (galloping ? 1.15 : 1));
      else if (accInput < 0) speed = Math.max(-maxWalk * 0.6, speed + accInput * accelBase * dt);
      else {
        if (speed > 0) speed = Math.max(0, speed - decelBase * dt);
        else if (speed < 0) speed = Math.min(0, speed + decelBase * dt);
      }

      stamina = staminaMax;

      let turnInput = 0;
      const joystickTurn = Number(keys.joyTurn) || 0;
      if (Math.abs(joystickTurn) > 0.001) turnInput = joystickTurn;
      else if (keys['a'] || keys['arrowleft']) turnInput = 1;
      else if (keys['d'] || keys['arrowright']) turnInput = -1;

      const speedRatio = THREE.MathUtils.clamp(Math.abs(speed) / maxGallop, 0, 1);
      const idleFactor = THREE.MathUtils.clamp(Math.abs(speed) / 1.4, 0, 1);
      const turnRate = turnRateBase * (0.4 + 0.6 * idleFactor) * (1 - speedRatio * 0.55);
      heading += turnInput * turnRate * dt;

      const { sx, sz } = terrainNormalApprox(player.position.x, player.position.z);
      const facing = { x: Math.sin(heading), z: Math.cos(heading) };
      const slopeAlong = -(sx * facing.x + sz * facing.z);
      speed += slopeAlong * (climbUnlocked ? 3.2 : 6.5) * dt;
      speed = THREE.MathUtils.clamp(speed, -maxWalk * 0.6, maxGallop);

      const targetBank = -turnInput * speedRatio * 0.32;
      bankZ += (targetBank - bankZ) * Math.min(1, dt * 6);
      const targetPitch = THREE.MathUtils.clamp(Math.atan2(slopeAlong, 1) * 0.6, -0.35, 0.35) - speedRatio * 0.06;
      pitchX += (targetPitch - pitchX) * Math.min(1, dt * 4);
    }

    player.rotation.y = heading;
    player.position.x += Math.sin(heading) * speed * dt;
    player.position.z += Math.cos(heading) * speed * dt;
    if (collision) {
      const resolved = collision.resolve({ x: player.position.x, z: player.position.z }, HORSE_RADIUS);
      player.position.x = resolved.x;
      player.position.z = resolved.z;
    }
    const gy = groundHeightFn(player.position.x, player.position.z);
    player.position.y += (gy - player.position.y) * Math.min(1, dt * 10);

    const absSpeed = Math.abs(speed);
    const moving = absSpeed > 0.05;

    // ---- FIX: gait amplitude/frequency now target 0 and are damped toward
    // that target when the horse isn't moving, instead of having a
    // permanent baseline. This is what stops the legs from swinging while
    // the horse is stopped, and eases them to rest instead of popping. ----
    const targetGaitFreq = moving ? (1.4 + (absSpeed / maxGallop) * 11) : 0;
    gaitFreqSmoothed += (targetGaitFreq - gaitFreqSmoothed) * Math.min(1, dt * 8);
    gaitPhase += gaitFreqSmoothed * dt;

    const targetGaitAmp = rearing ? 0 : (moving ? (0.12 + (absSpeed / maxGallop) * 0.5) : 0);
    gaitAmpSmoothed += (targetGaitAmp - gaitAmpSmoothed) * Math.min(1, dt * 8);

    for (let i = 0; i < 4; i++) {
      const targetHip = Math.sin(gaitPhase + legPhaseOffsets[i]) * gaitAmpSmoothed;
      legs[i].hip.rotation.x += (targetHip - legs[i].hip.rotation.x) * Math.min(1, dt * 10);
      const targetKnee = Math.max(0, Math.cos(gaitPhase + legPhaseOffsets[i])) * gaitAmpSmoothed * 1.3;
      legs[i].knee.rotation.x += (targetKnee - legs[i].knee.rotation.x) * Math.min(1, dt * 10);
    }

    const bounce = rearing ? 0 : Math.sin(gaitPhase * 2) * 0.05 * Math.min(1, absSpeed / 2.5);
    const idleBreathMounted = idleBreath * (1 - Math.min(1, absSpeed / 1.0));
    body.position.y = 1.55 + bounce + idleBreathMounted;

    const headBobTarget = rearing ? 0 : Math.sin(gaitPhase * 2 + 0.6) * 0.05 * Math.min(1, absSpeed / maxTrot);
    head.rotation.x += (headBobTarget - head.rotation.x) * Math.min(1, dt * 6);

    if (!rearing && absSpeed > 0.35) {
      hoofAccum += dt * gaitFreqSmoothed * 2;
      if (hoofAccum >= Math.PI) {
        hoofAccum -= Math.PI;
        playHoofFn(0.35 + Math.min(1, absSpeed / maxGallop) * 0.65);
      }
    } else {
      hoofAccum = 0;
    }

    if (rearing) {
      const rr = Math.sin(Math.min(1, (0.75 - rearTimer) / 0.25) * Math.PI * 0.5) *
                 (rearTimer > 0.15 ? 1 : rearTimer / 0.15);
      horseBody.rotation.x = -0.55 * rr;
      horseBody.position.z = -0.3 * rr;
      legs[0].hip.rotation.x = -0.9 * rr;
      legs[1].hip.rotation.x = -0.9 * rr;
      legs[0].knee.rotation.x = 0.6 * rr;
      legs[1].knee.rotation.x = 0.6 * rr;
    } else {
      horseBody.rotation.x = pitchX;
      horseBody.position.z = 0;
    }
    player.rotation.z = bankZ * (rearing ? 0 : 1);

    // ---- rider bounces and leans with the horse's motion ----
    const riderBounce = bounce * 0.9;
    torso.position.y = torsoBaseY + riderBounce;
    riderHead.position.y = riderHeadBaseY + riderBounce;
    hatBrim.position.y = hatBrimBaseY + riderBounce;
    hatTop.position.y = hatTopBaseY + riderBounce;
    riderArmL.shoulder.position.y = riderArmBaseY + riderBounce;
    riderArmR.shoulder.position.y = riderArmBaseY + riderBounce;
    const riderLeanRatio = THREE.MathUtils.clamp(absSpeed / maxGallop, 0, 1);
    riderGroup.rotation.x = -riderLeanRatio * 0.12;
    riderGroup.rotation.z = bankZ * 0.5;
  }

  // camera follows either the horse or the walker
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const baseFov = 55;

  // Raise the camera enough that the entire line between the player and the
  // camera stays above the terrain. Sampling the path prevents the camera
  // from cutting through a ridge while descending a steep slope.
  function keepCameraAboveTerrain(follow, desiredCameraPos) {
    const lookY = follow.position.y + 2.2;
    let safeY = desiredCameraPos.y;
    const samples = 10;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const x = THREE.MathUtils.lerp(follow.position.x, desiredCameraPos.x, t);
      const z = THREE.MathUtils.lerp(follow.position.z, desiredCameraPos.z, t);
      const requiredY = terrainHeight(x, z) + 1.6;
      const lineY = THREE.MathUtils.lerp(lookY, safeY, t);
      if (lineY < requiredY) {
        safeY = Math.max(safeY, lookY + (requiredY - lookY) / t);
      }
    }
    desiredCameraPos.y = safeY;
  }

  function poseArm(arm, shoulderX, elbowX, dt) {
    const blend = Math.min(1, dt * 14);
    arm.shoulder.rotation.x += (shoulderX - arm.shoulder.rotation.x) * blend;
    arm.elbow.rotation.x += (elbowX - arm.elbow.rotation.x) * blend;
  }

  function updateSpecialPose(dt, t) {
    const climbing = traversalPose === 'climb';
    const ziplining = traversalPose === 'zipline';
    const usingBinoculars = binocularsRaised && traversalPose === 'none' && !archeryActive;

    walkBinoculars.visible = usingBinoculars && !mounted;
    riderBinoculars.visible = usingBinoculars && mounted;
    if (climbing) {
      const reach = Math.sin(t * 5.8) * 0.16;
      poseArm(walkArmL, -1.1 + reach, 0.62, dt);
      poseArm(walkArmR, -1.1 - reach, 0.62, dt);
      walkLegL.hip.rotation.x = Math.sin(t * 5.8 + Math.PI) * 0.18;
      walkLegR.hip.rotation.x = Math.sin(t * 5.8) * 0.18;
      walkLegL.knee.rotation.x = 0.35;
      walkLegR.knee.rotation.x = 0.35;
      walkUpperBody.rotation.x = 0.14;
    } else if (ziplining) {
      // Both hands stay above the head and forward on the ropeway handle.
      poseArm(walkArmL, -2.08, 0.35, dt);
      poseArm(walkArmR, -2.08, 0.35, dt);
      walkLegL.hip.rotation.x = 0.28;
      walkLegR.hip.rotation.x = 0.28;
      walkLegL.knee.rotation.x = 0.45;
      walkLegR.knee.rotation.x = 0.45;
      walkUpperBody.rotation.x = -0.08;
    } else if (archeryActive && !mounted) {
      const d = archeryDraw;
      poseArm(walkArmL, -1.48 - d * 0.06, 0.06, dt);
      poseArm(walkArmR, -1.24 - d * 0.10, 0.55 + d * 1.35, dt);

      // The torso turns into the sightline, but the feet stay stable so aiming
      // cannot feed back into the third-person camera and spin the player.
      const shoulderTurn = THREE.MathUtils.clamp(archeryYaw || 0, -0.8, 0.8);
      walkUpperBody.rotation.y += (0.34 + shoulderTurn * 0.45 - walkUpperBody.rotation.y) * Math.min(1, dt * 8);
      walkUpperBody.rotation.x += ((-0.05 + Math.sin(t * 1.6) * 0.012 * (1 - d)) - walkUpperBody.rotation.x) * Math.min(1, dt * 8);
      walkUpperBody.rotation.z += (-0.05 - walkUpperBody.rotation.z) * Math.min(1, dt * 8);

      walkLegL.hip.rotation.x += (-0.16 - walkLegL.hip.rotation.x) * Math.min(1, dt * 8);
      walkLegR.hip.rotation.x += (0.14 - walkLegR.hip.rotation.x) * Math.min(1, dt * 8);
      walkLegL.knee.rotation.x += (0.18 - walkLegL.knee.rotation.x) * Math.min(1, dt * 8);
      walkLegR.knee.rotation.x += (0.22 - walkLegR.knee.rotation.x) * Math.min(1, dt * 8);
    } else if (usingBinoculars) {
      const leftArm = mounted ? riderArmL : walkArmL;
      const rightArm = mounted ? riderArmR : walkArmR;
      poseArm(leftArm, -0.95, 1.08, dt);
      poseArm(rightArm, -0.95, 1.08, dt);
    } else if (Math.abs(walkUpperBody.rotation.y) > 0.001) {
      // Release the archery shoulder twist so walking resumes naturally.
      walkUpperBody.rotation.y += (0 - walkUpperBody.rotation.y) * Math.min(1, dt * 8);
    }
  }

  function updateCamera(dt, t, camera, camYawOffset, camPitch, camDist) {
    updateSpecialPose(dt, t);
    if (!mounted && !sitting) walker.visible = !archeryActive;
    const follow = mounted ? player : walker;
    const speedRatio = mounted
      ? THREE.MathUtils.clamp(Math.abs(speed) / maxGallop, 0, 1)
      : THREE.MathUtils.clamp(Math.abs(speed) / walkSpeed, 0, 1) * 0.4;

    camera.fov = THREE.MathUtils.lerp(camera.fov, baseFov + speedRatio * 5, Math.min(1, dt * 3));
    camera.updateProjectionMatrix();

    if (archeryActive && !mounted) {
      // True first-person sight view: the eye, reticle and arrow direction
      // share the same sightline, with fully free look while the bow is drawn.
      const aimYaw = walker.rotation.y + camYawOffset;
      const aimPitch = THREE.MathUtils.clamp(camPitch, -0.65, 1.15);
      const horizontal = Math.cos(aimPitch);
      const dirX = Math.sin(aimYaw) * horizontal;
      const dirY = Math.sin(aimPitch);
      const dirZ = Math.cos(aimYaw) * horizontal;

      camPos.set(walker.position.x, walker.position.y + 1.62, walker.position.z);
      // Skip terrain height check entirely when aiming to prevent camera snapping
      camTarget.set(camPos.x + dirX * 70, camPos.y + dirY * 70, camPos.z + dirZ * 70);
      const zoomFov = THREE.MathUtils.lerp(50, 34, archeryDraw);
      camera.fov = THREE.MathUtils.lerp(camera.fov, zoomFov, Math.min(1, dt * 10));
      camera.updateProjectionMatrix();
      // Direct camera positioning to prevent smoothing issues
      camera.position.copy(camPos);
      camera.lookAt(camTarget);
      return;
    }

    if (binocularsRaised) {
      camera.fov = 20;
      camera.updateProjectionMatrix();
      const viewAngle = (mounted ? heading : walker.rotation.y) + camYawOffset;
      const eyeHeight = mounted ? 3.38 : 2.03;
      const eyeForward = 0.24;
      camPos.set(
        follow.position.x + Math.sin(viewAngle) * eyeForward,
        follow.position.y + eyeHeight,
        follow.position.z + Math.cos(viewAngle) * eyeForward
      );
      const horizLook = Math.cos(camPitch);
      camTarget.set(
        camPos.x + Math.sin(viewAngle) * horizLook * 60,
        camPos.y + Math.sin(camPitch) * 60,
        camPos.z + Math.cos(viewAngle) * horizLook * 60
      );
      camera.position.lerp(camPos, Math.min(1, dt * 14));
      camera.lookAt(camTarget);
      return;
    }

    const totalAngle = (mounted ? heading : walker.rotation.y) + Math.PI + camYawOffset;
    const horiz = camDist * Math.cos(camPitch);
    const cx = follow.position.x + Math.sin(totalAngle) * horiz;
    const cz = follow.position.z + Math.cos(totalAngle) * horiz;
    const cy = follow.position.y + 2.4 + camDist * Math.sin(camPitch);

    camPos.set(cx, cy, cz);
    if (!isInside) keepCameraAboveTerrain(follow, camPos);
    if (isInside && indoorCameraBounds) {
      camPos.x = THREE.MathUtils.clamp(camPos.x, indoorCameraBounds.minX, indoorCameraBounds.maxX);
      camPos.y = THREE.MathUtils.clamp(camPos.y, indoorCameraBounds.minY, indoorCameraBounds.maxY);
      camPos.z = THREE.MathUtils.clamp(camPos.z, indoorCameraBounds.minZ, indoorCameraBounds.maxZ);
    }
    if (cameraNeedsSnap) {
      camera.position.copy(camPos);
      cameraNeedsSnap = false;
    } else {
      camera.position.lerp(camPos, Math.min(1, dt * 5));
    }


    // The smoothing and movement shake can briefly leave the camera below a
    // newly reached slope, so clamp its final position as a safeguard.
    if (!isInside) {
      camera.position.y = Math.max(
        camera.position.y,
        terrainHeight(camera.position.x, camera.position.z) + 1.6
      );
    }

    camTarget.set(follow.position.x, follow.position.y + 2.2, follow.position.z);
    camera.lookAt(camTarget);
  }

  return {
    group: player,
    get position() { return mounted ? player.position : walker.position; },
    get speed() { return speed; },
    get heading() { return mounted ? heading : walker.rotation.y; },
    get stamina() { return stamina; },
    get gaitName() { return currentGaitName(Math.abs(speed)); },
    get mounted() { return mounted; },
    get sitting() { return sitting; },
    get canMount() { return !mounted && !sitting && walker.position.distanceTo(player.position) <= 4.5; },
    get climbUnlocked() { return climbUnlocked; },
    unlockClimb() { climbUnlocked = true; },
    setInside(value) {
      if (mounted) return;
      isInside = value;
      cameraNeedsSnap = true;
      // Keep the player visible in the larger third-person cabin space.
      walker.visible = true;
      speed = 0;
    },
    setIndoorCameraBounds(bounds) {
      indoorCameraBounds = bounds;
      cameraNeedsSnap = true;
    },
    setTraversalPose(pose) {
      traversalPose = pose || 'none';
      if (traversalPose !== 'none') {
        binocularsRaised = false;
        archeryActive = false;
      }
    },
    setBinocularsActive(active) {
      binocularsRaised = Boolean(active) && !archeryActive;
    },
    setArcheryPose(active, draw = 0, yaw = null) {
      archeryActive = Boolean(active) && !mounted && traversalPose === 'none' && !sitting && !externalControl;
      archeryDraw = THREE.MathUtils.clamp(draw, 0, 1);
      archeryYaw = archeryActive ? yaw : null;
      if (archeryActive) binocularsRaised = false;
    },
    restoreStamina(amount) { stamina = Math.min(staminaMax, stamina + amount); },
    setExternalControl(value) {
      externalControl = value;
      if (!value) { velocityY = 0; grounded = true; }
    },
    setGroundHeightFn(fn) { groundHeightFn = fn || terrainHeight; },
    teleportWalker(x, y, z, headingY) {
      walker.position.set(x, y, z);
      if (headingY !== undefined) {
        heading = headingY;
        walker.rotation.y = headingY;
      }
      speed = 0;
      velocityY = 0;
      grounded = true;
    },
    get grounded() { return grounded; },
    get canUseArchery() { return !mounted && !sitting && traversalPose === 'none' && !externalControl; },
    get archeryActive() { return archeryActive; },
    getBowHand() { return walkArmL.hand; },
    getDrawHand() { return walkArmR.hand; },
    triggerRear,
    update,
    updateCamera
  };
}
