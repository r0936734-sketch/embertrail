import { createAudio, startAudio, toggleMute, playHoof, playWhistle, playRear } from './audio.js';
import { createScene } from './scene.js';
import { createTerrain } from './terrain.js';
import { createTelevision } from './television.js';
import { createCollisionSystem } from './collision.js';
import { createMountains } from './mountains.js';
import { createVegetation } from './vegetation.js';
import { createStructures } from './structures.js';
import { createTraversal } from './traversal.js';
import { createWildlife } from './wildlife.js';
import { createHouse } from './house.js';
import { createPlayer } from './player.js';
import { createClimate } from './climate.js';
import { createUI } from './ui.js';
import { createIntro } from './intro.js';
import { createLandmarks } from './landmarks.js';
import { createWaterfall } from './waterfall.js';
import { createCollectibles } from './collectibles.js';
import { createFireflies } from './fireflies.js';
import { createWeather } from './weather.js';
import { createConstellations } from './constellations.js';
import { createSoundscape } from './soundscape.js';
import { createBinoculars } from './binoculars.js';
import { createInventory } from './inventory.js';
import { createArchery } from './archery.js';
import { createHunting } from './hunting.js';
import { createRange } from './range.js';
import { createForage } from './forage.js';
import { createQuests } from './quests.js';

(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    document.getElementById('loadingScreen').textContent =
      'Could not load the 3D engine — check your connection and reload.';
    return;
  }

  // ---------- core systems ----------
  const audio = createAudio();
  const {
    scene, camera, renderer, skyUniforms,
    ambientLight, hemiLight, sunLight, moonLight,
    sunMesh, moon, moonGlow, starsMat, planetsGroup
  } = createScene();

  const collision = createCollisionSystem();
  const terrain = createTerrain(scene);
  const mountains = createMountains(scene);
  const vegetation = createVegetation(scene, terrain.terrainHeight, collision);
  const structures = createStructures(scene, terrain.terrainHeight);
  const wildlife = createWildlife(scene, terrain.terrainHeight);
  const landmarks = createLandmarks(scene, terrain.terrainHeight, collision);
  const waterfall = createWaterfall(scene, terrain.terrainHeight, collision);
  const collectibles = createCollectibles(scene, terrain.terrainHeight);
  const fireflies = createFireflies(scene, terrain.terrainHeight);
  const weather = createWeather(scene);
  const constellations = createConstellations(scene, starsMat);
  const soundscape = createSoundscape(audio, {
    ridge: { x: 95, z: -72 },
    waters: [{ x: 52, z: 36 }, { x: -62, z: -48 }, { x: 0, z: 0 }],
    meadow: { x: 48, z: 28 }
  });

  // houses / points of interest
  const house = createHouse(scene, terrain.terrainHeight, collision, renderer);

  const player = createPlayer(
  scene,
  terrain.terrainHeight,
  terrain.terrainNormalApprox,
  (strength) => playHoof(audio, strength),
  () => playWhistle(audio),
  () => playRear(audio),
  collision
);

  const climate = createClimate({
    scene,                                    // ← important
    skyUniforms,
    ambientLight,
    hemiLight,
    sunLight,
    moonLight,
    sunMesh,
    moon,
    moonGlow,
    starsMat,
    planetsGroup,
    groundMat: terrain.groundMat,
    treeLeafMat: vegetation.treeLeafMat,
    cherryCanopyMats: vegetation.cherryCanopyMats,
    sakuraPalette: vegetation.sakuraPalette,
    snowSys: vegetation.snowSys,
    petalSys: vegetation.petalSys,
    leafSys: vegetation.leafSys,
    mountains
  });

  house.setSleepCallback(() => climate.sleep());

  // ---------- television (inside the cabin) ----------
  // These must match the position passed to createHouse (default is
  // { x: 21, z: 12 } — see house.js) so the TV lines up with the interior room.
  const housePos = { x: 21, z: 12 };
  const interiorFloorY = terrain.terrainHeight(housePos.x, housePos.z) - 400;

  const tv = createTelevision(scene, {
  position: { x: housePos.x - 7.7, y: interiorFloorY + 1.55, z: housePos.z - 1.0 },
  rotationY: Math.PI / 2,
  interactRadius: 5,   // how close to show the prompt / press V
  keepOnRadius: 14,    // how far you can walk before it turns off
  collision
});

  const traversal = createTraversal(
    scene,
    player,
    terrain.terrainHeight,
    landmarks.TW_POS,
    landmarks.TW_BASE_Y,
    house.ziplineAnchor
  );

  const ui = createUI(player, [...landmarks.poiList, ...waterfall.poiList], key => {
    if (key !== 'climbUnlock') return;
    player.unlockClimb();
    const toast = document.createElement('div');
    toast.textContent = '⛰ You feel steadier on steep ground — hold Shift while on foot to push harder.';
    Object.assign(toast.style, {
      position: 'fixed', left: '50%', top: '38%', transform: 'translateX(-50%)',
      color: '#f3ead9', background: 'rgba(20,16,12,0.8)', padding: '12px 20px',
      borderRadius: '10px', fontSize: '14px', maxWidth: '70vw', textAlign: 'center',
      zIndex: 60, opacity: '0', transition: 'opacity 0.6s'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 700);
    }, 4500);
  });
  const binocularPois = [
    ...landmarks.poiList.map(p => ({ name: p.name, x: p.pos.x, z: p.pos.z })),
    { name: 'Sunveil Ridge', x: 95, z: -72 },
    { name: 'Northern Pines', x: -55, z: -30 },
    { name: 'Eastern Meadow', x: 48, z: 28 }
  ];
  const binoculars = createBinoculars(binocularPois);
  const intro = createIntro(camera);

  // ---------- hunting / activities ----------
  const inventory = createInventory(18);
  const quests = createQuests({ inventory });
  const archery = createArchery({
    scene, camera, player,
    terrainHeight: terrain.terrainHeight,
    inventory,
    getAimOffset: () => camYawOffset,
    onEvent: (type, data) => quests.handleEvent(type, data)
  });
  const hunting = createHunting({
    scene,
    terrainHeight: terrain.terrainHeight,
    archery, inventory,
    onEvent: (type, data) => {
      quests.handleEvent(type, data);
      if (type === 'kill') quests.toast(`Clean shot — ${data.type} taken (+${data.points} pts)`);
    }
  });
  const range = createRange({
    scene,
    terrainHeight: terrain.terrainHeight,
    archery,
    onEvent: (type, data) => {
      quests.handleEvent(type, data);
      if (type === 'trialEnd') quests.toast(`Time trial over — ${data.score} points`);
    },
    origin: { x: 95, z: -72 },
    targetDirection: { x: -0.66, z: 0.75 }
  });
  const forage = createForage({
    scene,
    terrainHeight: terrain.terrainHeight,
    inventory,
    onEvent: (type, data) => quests.handleEvent(type, data)
  });

  // ---------- input ----------
  const keys = {};
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'shift') keys['shift'] = true;
    if (k === 'k') climate.skipSeason();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'f', 'g', 'v', 'x', 'i', 'j'].includes(k)) e.preventDefault();
    startAudio(audio);
    if (intro.active) intro.skip();
  });
  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
    if (e.key === 'Shift') keys['shift'] = false;
  });

  document.querySelectorAll('.dbtn').forEach(btn => {
    const k = btn.getAttribute('data-k');
    const on  = e => { keys[k] = true;  e.preventDefault(); };
    const off = e => { keys[k] = false; e.preventDefault(); };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointerleave', off);
    btn.addEventListener('pointercancel', off);
  });

  const gallopBtn = document.getElementById('gallopBtn');
  gallopBtn.addEventListener('pointerdown', e => { keys['shift'] = true;  e.preventDefault(); });
  gallopBtn.addEventListener('pointerup',   e => { keys['shift'] = false; e.preventDefault(); });
  gallopBtn.addEventListener('pointerleave', () => { keys['shift'] = false; });

  document.getElementById('rearBtn').addEventListener('pointerdown', e => {
    startAudio(audio);
    player.triggerRear();
    e.preventDefault();
  });

  const touchControls = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (touchControls) {
    document.addEventListener('selectstart', e => {
      if (e.target.closest('button, .touch-joystick, .mobile-activity-menu')) e.preventDefault();
    });
    document.addEventListener('dragstart', e => {
      if (e.target.closest('button, .touch-joystick, .mobile-activity-menu')) e.preventDefault();
    });
  }
  const joystick = document.getElementById('touchJoystick');
  const joystickKnob = document.getElementById('touchJoystickKnob');
  const contextBtn = document.getElementById('contextBtn');
  const callHorseBtn = document.getElementById('callHorseBtn');
  const dismountBtn = document.getElementById('dismountBtn');
  const seasonBtn = document.getElementById('seasonBtn');
  const mobileSensitivity = document.getElementById('mobileSensitivity');
  const mobileZoomActions = document.getElementById('mobileZoomActions');
  const sensitivitySlider = document.getElementById('sensitivitySlider');
  const sensitivityValue = document.getElementById('sensitivityValue');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const bowBtn = document.getElementById('bowBtn');
  const activityToggle = document.getElementById('activityToggle');
  const mobileActivityMenu = document.getElementById('mobileActivityMenu');
  const craftBtn = document.getElementById('craftBtn');
  const pouchBtn = document.getElementById('pouchBtn');
  const questsBtn = document.getElementById('questsBtn');
  const mobileLaunch = document.getElementById('mobileLaunch');
  const mobileLaunchBtn = document.getElementById('mobileLaunchBtn');
  contextBtn.style.display = 'none';

  function pulseKey(key) {
    if (!key) return;
    const code = `Key${key.toUpperCase()}`;
    keys[key] = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true }));
    requestAnimationFrame(() => {
      keys[key] = false;
      window.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true }));
    });
  }

  function shapeJoystickInput(value) {
    const deadZone = 0.16;
    const magnitude = Math.abs(value);
    if (magnitude <= deadZone) return 0;
    const normalized = (magnitude - deadZone) / (1 - deadZone);
    return Math.sign(value) * normalized * normalized;
  }

  function setJoystickDirection(dx, dy) {
    // Keep the joystick analog: a small sideways tilt now makes a small turn.
    keys.joyForward = -shapeJoystickInput(dy);
    keys.joyTurn = -shapeJoystickInput(dx);
  }

  function resetJoystick() {
    keys.joyForward = 0;
    keys.joyTurn = 0;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
  }

  function updateJoystick(event) {
    const rect = joystick.getBoundingClientRect();
    const radius = rect.width * 0.3;
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy) || 1;
    if (length > radius) {
      dx = (dx / length) * radius;
      dy = (dy / length) * radius;
    }
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    setJoystickDirection(dx / radius, dy / radius);
  }

  function refreshContextButton() {
  if (!touchControls) return;

  // Prefer the TV prompt if it is visible
  const prompts = [...document.querySelectorAll('.context-prompt')]
    .filter(el => el.dataset.mobileKey && Number.parseFloat(getComputedStyle(el).opacity) > 0.5);

  // Priority: TV (v) first, then anything else
  const prompt = prompts.find(el => el.dataset.mobileKey === 'v') || prompts[0];

  if (!prompt && player.canMount) {
    contextBtn.textContent = 'MOUNT';
    contextBtn.dataset.key = 'e';
    contextBtn.style.display = 'block';
    return;
  }
  if (!prompt) {
    contextBtn.style.display = 'none';
    contextBtn.dataset.key = '';
    return;
  }

  const key = prompt.dataset.mobileKey;
  const promptText = prompt.textContent;
  let label = ({ e: 'INTERACT', b: 'BINOCS', g: 'COLLECT', c: 'FISH', v: 'TV' })[key] || 'ACTION';
  if (key === 'b') label = /lower/i.test(promptText) ? 'LOWER' : 'BINOCS';
  if (key === 'r') label = /ropeway/i.test(promptText) ? 'ROPEWAY' : 'CLIMB';
  if (key === 'c' && /^fishing/i.test(promptText)) label = 'STOP FISH';
  if (key === 'v') label = /turn off/i.test(promptText) ? 'TV OFF' : 'TV';
  contextBtn.textContent = label || 'ACTION';
  contextBtn.dataset.key = key;
  contextBtn.style.display = 'block';
}
  function refreshMobileButtons() {
    if (!touchControls) return;
    callHorseBtn.style.display = player.mounted ? 'none' : 'block';
    dismountBtn.style.display = player.mounted ? 'block' : 'none';
    gallopBtn.textContent = player.mounted ? 'GALLOP' : 'SPRINT';
    document.getElementById('rearBtn').style.display = player.mounted ? 'block' : 'none';
    bowBtn.style.display = player.canUseArchery ? 'block' : 'none';
  }

  async function launchMobileGame() {
    startAudio(audio);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch (_) {
      // Browsers may deny fullscreen/orientation locking; the game remains playable.
    }
    mobileLaunch.classList.add('is-hidden');
    if (intro.active) intro.skip();
  }

  if (touchControls) {
    document.body.classList.add('touch-controls');
    let joystickPointer = null;
    joystick.addEventListener('pointerdown', e => {
      joystickPointer = e.pointerId;
      joystick.setPointerCapture(e.pointerId);
      updateJoystick(e);
      startAudio(audio);
      e.preventDefault();
    });
    joystick.addEventListener('pointermove', e => {
      if (e.pointerId === joystickPointer) updateJoystick(e);
    });
    const endJoystick = e => {
      if (e.pointerId !== joystickPointer) return;
      joystickPointer = null;
      resetJoystick();
    };
    joystick.addEventListener('pointerup', endJoystick);
    joystick.addEventListener('pointercancel', endJoystick);
    contextBtn.addEventListener('pointerdown', e => {
      pulseKey(contextBtn.dataset.key);
      startAudio(audio);
      e.preventDefault();
    });
    callHorseBtn.addEventListener('pointerdown', e => {
      pulseKey('h');
      e.preventDefault();
    });
    dismountBtn.addEventListener('pointerdown', e => {
      pulseKey('e');
      e.preventDefault();
    });
    seasonBtn.addEventListener('pointerdown', e => {
      climate.skipSeason();
      startAudio(audio);
      e.preventDefault();
    });
    const startBowDraw = e => {
      keys.f = true;
      startAudio(audio);
      e.preventDefault();
    };
    const endBowDraw = e => {
      keys.f = false;
      e.preventDefault();
    };
    bowBtn.addEventListener('pointerdown', startBowDraw);
    bowBtn.addEventListener('pointerup', endBowDraw);
    bowBtn.addEventListener('pointerleave', endBowDraw);
    bowBtn.addEventListener('pointercancel', endBowDraw);
    activityToggle.addEventListener('pointerdown', e => {
      const open = mobileActivityMenu.classList.toggle('is-open');
      activityToggle.setAttribute('aria-expanded', String(open));
      startAudio(audio);
      e.preventDefault();
    });
    const useActivity = (key, event) => {
      pulseKey(key);
      mobileActivityMenu.classList.remove('is-open');
      activityToggle.setAttribute('aria-expanded', 'false');
      startAudio(audio);
      event.preventDefault();
    };
    craftBtn.addEventListener('pointerdown', e => useActivity('x', e));
    pouchBtn.addEventListener('pointerdown', e => useActivity('i', e));
    questsBtn.addEventListener('pointerdown', e => useActivity('j', e));
    sensitivitySlider.addEventListener('input', e => {
      setLookSensitivity(e.target.value);
    });
    sensitivitySlider.addEventListener('pointerdown', e => {
      startAudio(audio);
    });
    zoomOutBtn.addEventListener('pointerdown', e => {
      changeCameraZoom(2.2);
      startAudio(audio);
      e.preventDefault();
    });
    zoomInBtn.addEventListener('pointerdown', e => {
      changeCameraZoom(-2.2);
      startAudio(audio);
      e.preventDefault();
    });
    mobileLaunchBtn.addEventListener('click', launchMobileGame);
    refreshMobileButtons();
  } else {
    [
      document.getElementById('dpad'), gallopBtn, document.getElementById('rearBtn'),
      joystick, contextBtn, document.getElementById('mobileQuickActions'), mobileSensitivity, mobileZoomActions,
      bowBtn, activityToggle, mobileActivityMenu, mobileLaunch
    ].forEach(el => { el.style.display = 'none'; });
  }

  // climate skip is now triggered by keyboard (`k`) — no HUD button

  document.getElementById('soundBtn').addEventListener('click', e => {
    toggleMute(audio);
    e.stopPropagation();
  });

  if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) {
    document.getElementById('dpad').style.display = 'none';
    gallopBtn.style.display = 'none';
    document.getElementById('rearBtn').style.display = 'none';
  }

  // camera controls
  let camYawOffset = 0.15;
  let camPitch = 0.38;
  let camDist = 13;
  let lookSensitivity = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastManualLook = 0;

  function refreshCameraControls() {
    const percent = Math.round(lookSensitivity * 100);
    sensitivitySlider.value = String(percent);
    sensitivityValue.textContent = `LOOK ${percent}%`;
  }

  function setLookSensitivity(value) {
    lookSensitivity = THREE.MathUtils.clamp(Number(value) / 100, 0.5, 1.5);
    refreshCameraControls();
  }

  function changeCameraZoom(amount) {
    camDist = THREE.MathUtils.clamp(camDist + amount, 6, 36);
  }

  refreshCameraControls();

  const domEl = renderer.domElement;
  domEl.style.touchAction = 'none';
  domEl.addEventListener('contextmenu', e => e.preventDefault());
  let dragPointerId = null;
  domEl.addEventListener('pointerdown', e => {
    if (dragging) return;
    dragging = true;
    dragPointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    startAudio(audio);
    if (intro.active) intro.skip();
  });
  window.addEventListener('pointerup', e => {
    if (e.pointerId !== dragPointerId) return;
    dragging = false;
    dragPointerId = null;
  });
  window.addEventListener('pointercancel', e => {
    if (e.pointerId !== dragPointerId) return;
    dragging = false;
    dragPointerId = null;
  });
  window.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== dragPointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    camYawOffset -= dx * 0.006 * lookSensitivity;
    camPitch = THREE.MathUtils.clamp(camPitch - dy * 0.004 * lookSensitivity, -1.3, 1.4);
    lastManualLook = performance.now();
  });
  domEl.addEventListener('wheel', e => {
    camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.02, 6, 36);
    e.preventDefault();
  }, { passive: false });
  
  // Desktop can fullscreen the canvas; mobile must fullscreen the document so HUD controls remain visible.
  domEl.addEventListener('dblclick', e => {
    e.preventDefault();
    if (touchControls) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      return;
    }
    const wrap = document.getElementById('canvas-wrap');
    if (wrap.requestFullscreen) wrap.requestFullscreen();
    else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
    else if (wrap.msRequestFullscreen) wrap.msRequestFullscreen();
  });

  // ensure renderer/camera update when fullscreen changes
  window.addEventListener('fullscreenchange', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  

  // ---------- main loop ----------
  let lastTime = performance.now();
  let elapsed = 0;
  let firstFrame = true;
  let windAngle = 0;

  function animate(now) {
    requestAnimationFrame(animate);

    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.min(dt, 0.05);
    elapsed += dt;
    windAngle += dt * 0.05;
    const windX = Math.sin(windAngle) * 1.1;
    const isSummer = climate.getSeasonName() === 'summer';

    if (intro.active) {
      intro.update(dt);
    } else {
      structures.updateFire(elapsed, isSummer);

      // The cabin owns E while close to its door (or an item inside it);
      // elsewhere E keeps its normal mount/dismount behaviour.
      if (keys['e'] && house.tryInteract(player)) keys['e'] = false;

      // Update archery first: F then owns the bow draw rather than the nearby-fire sit action.
      archery.update(dt, keys, elapsed);
      if (archery.aiming) binoculars.deactivate();
      player.update(dt, keys, structures.fireGroup);
      traversal.update(dt, keys, player.position);
      player.setBinocularsActive(binoculars.active);

      inventory.update(dt, keys, () => quests.handleEvent('craft'));
      quests.update(dt, keys);
      forage.update(dt, keys, player.position);

      if (Math.abs(player.speed) > 0.15 && performance.now() - lastManualLook > 1500) {
        camYawOffset += (0 - camYawOffset) * Math.min(1, dt * 4.2);
      }
      player.updateCamera(
        dt, elapsed, camera, camYawOffset, camPitch,
        house.resting ? Math.min(camDist, 3.8) : camDist
      );

      house.update(dt, elapsed, player);
      tv.update(dt, keys, player.position, camera);
    }

    vegetation.updateFallSystems(dt, elapsed, windX, player.group.position);
    wildlife.update(dt, elapsed, player.group.position, player.speed);
    hunting.update(dt, elapsed, player.position);
    range.update(dt, camera);
    landmarks.update(dt, elapsed, isSummer);
    waterfall.update(dt, elapsed);
    const dMillpond = Math.hypot(
      player.group.position.x - landmarks.PD_POS.x,
      player.group.position.z - landmarks.PD_POS.z
    );
    const dTwinFalls = Math.hypot(
      player.group.position.x - waterfall.pondPos.x,
      player.group.position.z - waterfall.pondPos.z
    );
    const nearestPond = dTwinFalls < dMillpond ? waterfall.pondPos : landmarks.PD_POS;
    const speciesProgress = collectibles.update(dt, elapsed, player.group.position, nearestPond);
    climate.update(dt, elapsed);
    fireflies.update(dt, elapsed, 1 - climate.dayAmt);
    weather.update(dt, elapsed, player.group.position, climate.dayAmt, climate.getSeasonName(), camera);
    constellations.update(dt, camera, 1 - climate.dayAmt);
    soundscape.update(dt, elapsed, player.group.position, climate.dayAmt > 0.5, audio.muted, weather);
    binoculars.update(dt, camera, player.group.position, name => ui.isDiscovered(name));
    player.setBinocularsActive(binoculars.active);
    ui.update(dt, player, climate, speciesProgress);
    refreshContextButton();
    refreshMobileButtons();

    vegetation.clouds.forEach(c => {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 280) c.position.x = -280;
    });

    house.updateWindowView();
    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      const ls = document.getElementById('loadingScreen');
      if (ls) {
        ls.style.opacity = '0';
        setTimeout(() => ls.remove(), 850);
      }
    }
  }

  requestAnimationFrame(animate);
})();