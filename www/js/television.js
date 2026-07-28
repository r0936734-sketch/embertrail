// television.js — an in-house television mounted on a wall.
// Walk close, then press V (desktop) or tap ACTION (mobile) to turn it on.
// While it's on, a YouTube player is overlaid on the wall where the
// screen sits — it tracks the four corners of the physical screen every frame
// so it stays locked to the wall instead of drifting as you turn the camera.
//
// Change channel with the + / − keys (or = / -) on desktop,
// or the ⟨ ⟩ buttons on mobile.
// Fill CHANNELS below with YouTube IDs.

const CHANNELS = [
  'dR9B_gPxjkk',
  '9db3FLy-_1g',
  "TW9d8vYrVFQ", // Elektronomia - Sky High
  "3nQNiWdeH2Q", // Janji - Heroes Tonight
  "13ARO0HDZsQ", // Different Heaven - Safe & Sound
  "K4DyBUG242c", // Tobu - Hope
  "xshEZzpS4CQ", // DEAF KEV - Invincible
  "__CRWE-L45k", // Cartoon - On & On
  "WyRx7oqcehU", // Electro-Light - Symbolism
  "lP6mK2-nLIk", // Different Heaven & EH!DE - My Heart

];

export function createTelevision(scene, options = {}) {
  const position = options.position || { x: 0, y: 0, z: 0 };
  const rotationY = options.rotationY ?? 0;
  const scale = options.scale ?? 1;

  const interactRadius = options.interactRadius ?? 4.5;
  const keepOnRadius   = options.keepOnRadius   ?? 12;
  const collision = options.collision || null;

  const SCREEN_W = 3;
  const SCREEN_H = 1.5;
  const OVERLAY_SCALE = 1.06;

  // ---------- 3D model ----------
  const group = new THREE.Group();
  group.position.set(position.x, position.y, position.z);
  group.rotation.y = rotationY;
  group.scale.setScalar(scale);
  scene.add(group);

  const standMat = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.6, metalness: 0.3, flatShading: true });
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 0.5, metalness: 0.4, flatShading: true });
  const screenOffMat = new THREE.MeshStandardMaterial({
    color: 0x050608, roughness: 0.35, metalness: 0.1,
    emissive: 0x0d1c26, emissiveIntensity: 0.15
  });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });

  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.22), standMat);
  mount.position.set(0, 0, 0.11);
  group.add(mount);

  const bezel = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_W + 0.12, SCREEN_H + 0.12, 0.07), bezelMat);
  bezel.position.set(0, 0, 0.23);
  group.add(bezel);

  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), screenOffMat);
  screenMesh.position.set(0, 0, 0.267);
  group.add(screenMesh);

  const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), ledMat);
  led.position.set(SCREEN_W / 2 - 0.07, -SCREEN_H / 2 + 0.07, 0.27);
  group.add(led);

  const screenLight = new THREE.PointLight(0x8fd0ff, 0, 3.5, 2);
  screenLight.position.set(0, 0, 0.6);
  group.add(screenLight);

  if (collision) collision.addBox(position.x, position.z, 0.5 * scale, 0.4 * scale);

  group.updateMatrixWorld(true);

  const localCorners = [
    new THREE.Vector3(-SCREEN_W / 2,  SCREEN_H / 2, 0),
    new THREE.Vector3( SCREEN_W / 2,  SCREEN_H / 2, 0),
    new THREE.Vector3( SCREEN_W / 2, -SCREEN_H / 2, 0),
    new THREE.Vector3(-SCREEN_W / 2, -SCREEN_H / 2, 0)
  ];

  const screenCenterWorld = new THREE.Vector3();
  const screenNormalWorld = new THREE.Vector3();

  // ---------- DOM overlay ----------
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '16', pointerEvents: 'none'
  });
  document.body.appendChild(overlay);

  const frame = document.createElement('div');
  Object.assign(frame.style, {
    position: 'absolute', overflow: 'hidden', background: '#000',
    boxShadow: '0 0 0 2px rgba(0,0,0,0.65)', opacity: '0', transition: 'opacity 0.25s',
    pointerEvents: 'none', border: 'none'
  });
  overlay.appendChild(frame);

  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%', border: '0',
    pointerEvents: 'none'
  });
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('controls', '0');
  frame.appendChild(iframe);

  const noSignal = document.createElement('div');
  Object.assign(noSignal.style, {
    position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#8fa0ad', fontFamily: 'inherit', fontSize: '11px', letterSpacing: '2px',
    background: 'repeating-linear-gradient(45deg,#111 0,#111 2px,#1a1a1a 2px,#1a1a1a 4px)', textAlign: 'center'
  });
  noSignal.textContent = 'NO SIGNAL';
  frame.appendChild(noSignal);

  const promptEl = document.createElement('div');
  Object.assign(promptEl.style, {
    position: 'fixed', left: '50%', bottom: '22%', transform: 'translateX(-50%)',
    padding: '9px 18px', background: 'rgba(20,16,12,0.76)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '14px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.18)', opacity: '0', transition: 'opacity 0.22s',
    pointerEvents: 'none', zIndex: '50', whiteSpace: 'pre-line', textAlign: 'center'
  });
  promptEl.classList.add('context-prompt');
  promptEl.dataset.mobileKey = 'v';
  document.body.appendChild(promptEl);

  // ---------- Mobile channel buttons (created ONCE) ----------
  const chPrevBtn = document.createElement('button');
  const chNextBtn = document.createElement('button');

  [chPrevBtn, chNextBtn].forEach(btn => {
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '28%',
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      border: '1px solid rgba(255,255,255,0.25)',
      background: 'rgba(20,16,12,0.82)',
      color: '#f3ead9',
      fontSize: '22px',
      fontWeight: 'bold',
      zIndex: '55',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
      touchAction: 'manipulation'
    });
    btn.classList.add('tv-channel-btn');
    document.body.appendChild(btn);
  });

  chPrevBtn.textContent = '⟨';
  chPrevBtn.style.left = 'calc(50% - 70px)';
  chNextBtn.textContent = '⟩';
  chNextBtn.style.left = 'calc(50% + 18px)';

  chPrevBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    changeChannel(-1);
  });
  chNextBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    changeChannel(1);
  });

  // ---------- state ----------
  let isOn = false;
  let channelIndex = 0;
  let prevKeyState = { v: false, plus: false, minus: false };

  function currentId() {
    return CHANNELS.length
      ? CHANNELS[((channelIndex % CHANNELS.length) + CHANNELS.length) % CHANNELS.length]
      : null;
  }

  function loadChannel() {
    const id = currentId();
    if (id) {
      iframe.src =
        `https://www.youtube-nocookie.com/embed/${id}` +
        `?autoplay=1&mute=0&controls=0&rel=0&modestbranding=1` +
        `&playsinline=1&iv_load_policy=3&disablekb=1&fs=0`;
      iframe.style.display = 'block';
      noSignal.style.display = 'none';
    } else {
      iframe.src = '';
      iframe.style.display = 'none';
      noSignal.style.display = 'flex';
    }
  }

  function setOn(on) {
    isOn = on;
    screenOffMat.emissiveIntensity = on ? 0.9 : 0.15;
    screenOffMat.emissive.set(on ? 0x111111 : 0x0d1c26);
    screenLight.intensity = on ? 0.9 : 0;
    ledMat.color.set(on ? 0x53d16a : 0x2a2a2a);
    if (on) {
      loadChannel();
    } else {
      iframe.src = '';
      frame.style.opacity = '0';
      frame.style.pointerEvents = 'none';
    }
  }

  function changeChannel(dir) {
    if (!isOn || !CHANNELS.length) return;
    channelIndex += dir;
    loadChannel();
  }

  // ---------- per-frame ----------
  const _tmpCam = new THREE.Vector3();
  const _toCam  = new THREE.Vector3();
  const _corner = new THREE.Vector3();

  function update(dt, keys, playerPos, camera) {
    const dx = playerPos.x - position.x;
    const dz = playerPos.z - position.z;
    const distXZ = Math.hypot(dx, dz);

    const near      = distXZ < interactRadius;
    const stillNear = distXZ < keepOnRadius;

    if (isOn && !stillNear) setOn(false);

    // prompt
    if (near) {
      if (isOn) {
        promptEl.textContent =
          'Press V / Interact to turn off the TV\n' +
          '+ / −  or  ⟨ ⟩  change channel';
      } else {
        promptEl.textContent = 'Press V / Interact to turn on the TV';
      }
      promptEl.style.opacity = '1';
    } else {
      promptEl.style.opacity = '0';
    }

    // show/hide mobile channel buttons
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const showChBtns = isTouch && isOn && near;
    chPrevBtn.style.display = showChBtns ? 'flex' : 'none';
    chNextBtn.style.display = showChBtns ? 'flex' : 'none';

    // key handling
    const vKey = !!keys['v'] || !!keys['e'];
    if (vKey && !prevKeyState.v && near) setOn(!isOn);
    prevKeyState.v = vKey;

    const plusKey  = keys['+'] === true || keys['='] === true;
    const minusKey = keys['-'] === true;
    if (plusKey  && !prevKeyState.plus)  changeChannel(1);
    if (minusKey && !prevKeyState.minus) changeChannel(-1);
    prevKeyState.plus  = plusKey;
    prevKeyState.minus = minusKey;

    if (!isOn) return;

    // ---- corner projection ----
    screenMesh.updateMatrixWorld(true);
    screenMesh.getWorldPosition(screenCenterWorld);
    screenNormalWorld.set(0, 0, 1).transformDirection(screenMesh.matrixWorld).normalize();

    camera.getWorldPosition(_tmpCam);
    const dist = _tmpCam.distanceTo(screenCenterWorld);
    _toCam.subVectors(_tmpCam, screenCenterWorld).normalize();
    const facingDot = _toCam.dot(screenNormalWorld);

    let minX =  Infinity, minY =  Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    let allBehind = true;

    for (let i = 0; i < 4; i++) {
      _corner.copy(localCorners[i]).applyMatrix4(screenMesh.matrixWorld);
      _corner.project(camera);

      const sx = (_corner.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-_corner.y * 0.5 + 0.5) * window.innerHeight;

      if (_corner.z < 1) allBehind = false;
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    }

    const onScreen =
      !allBehind &&
      maxX > 0 && minX < window.innerWidth &&
      maxY > 0 && minY < window.innerHeight;

    const visible = facingDot > 0.12 && onScreen && dist < 50 && dist > 0.3;

    if (!visible) {
      frame.style.opacity = '0';
      frame.style.pointerEvents = 'none';
      return;
    }

    const angleFactor = THREE.MathUtils.clamp(facingDot, 0.38, 1);
    let w = (maxX - minX) * OVERLAY_SCALE * angleFactor;
    let h = (maxY - minY) * OVERLAY_SCALE;

    w = Math.min(w, window.innerWidth  * 0.94);
    h = Math.min(h, window.innerHeight * 0.94);

    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;

    frame.style.left   = `${cx - w / 2}px`;
    frame.style.top    = `${cy - h / 2}px`;
    frame.style.width  = `${w}px`;
    frame.style.height = `${h}px`;
    frame.style.opacity = '1';
    frame.style.pointerEvents = 'none';
  }

  return {
    group,
    update,
    get isOn() { return isOn; },
    get position() { return position; },
    turnOff() { setOn(false); }
  };
}