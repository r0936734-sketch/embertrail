import { createAudio, startAudio, toggleMute, playHoof, playWhistle } from './audio.js';
import { createScene } from './scene.js';
import { createTerrain } from './terrain.js';
import { createMountains } from './mountains.js';
import { createVegetation } from './vegetation.js';
import { createStructures } from './structures.js';
import { createWildlife } from './wildlife.js';
import { createHouse } from './house.js';
import { createPlayer } from './player.js';
import { createClimate } from './climate.js';
import { createUI } from './ui.js';
import { createIntro } from './intro.js';
import { createLandmarks } from './landmarks.js';
import { createCollectibles } from './collectibles.js';
import { createFireflies } from './fireflies.js';
import { createWeather } from './weather.js';
import { createConstellations } from './constellations.js';
import { createSoundscape } from './soundscape.js';
import { createBinoculars } from './binoculars.js';

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
    sunMesh, moon, moonGlow, starsMat
  } = createScene();

  const terrain = createTerrain(scene);
  const mountains = createMountains(scene);
  const vegetation = createVegetation(scene, terrain.terrainHeight);
  const structures = createStructures(scene, terrain.terrainHeight);
  const wildlife = createWildlife(scene, terrain.terrainHeight);
  const landmarks = createLandmarks(scene, terrain.terrainHeight);
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
  const house = createHouse(scene, terrain.terrainHeight);

  const player = createPlayer(
  scene,
  terrain.terrainHeight,
  terrain.terrainNormalApprox,
  (strength) => playHoof(audio, strength),
  () => playWhistle(audio)          // ← new
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
    groundMat: terrain.groundMat,
    treeLeafMat: vegetation.treeLeafMat,
    cherryCanopyMats: vegetation.cherryCanopyMats,
    sakuraPalette: vegetation.sakuraPalette,
    snowSys: vegetation.snowSys,
    petalSys: vegetation.petalSys,
    leafSys: vegetation.leafSys,
    mountains
  });

  const ui = createUI(player, landmarks.poiList, key => {
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

  // ---------- input ----------
  const keys = {};
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'shift') keys['shift'] = true;
    if (k === 'k') climate.skipSeason();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
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
    player.triggerRear();
    e.preventDefault();
  });

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
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const domEl = renderer.domElement;
  domEl.style.touchAction = 'none';
  domEl.addEventListener('contextmenu', e => e.preventDefault());
  domEl.addEventListener('pointerdown', e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    startAudio(audio);
    if (intro.active) intro.skip();
  });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    camYawOffset -= dx * 0.006;
    camPitch = THREE.MathUtils.clamp(camPitch - dy * 0.004, 0.08, 1.1);
  });
  domEl.addEventListener('wheel', e => {
    camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.02, 6, 36);
    e.preventDefault();
  }, { passive: false });
  
  // dblclick canvas-wrap to enter fullscreen (uses browser default fullscreen)
  domEl.addEventListener('dblclick', () => {
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

      // The cabin owns E while close to its door; elsewhere E keeps its
      // normal mount/dismount behaviour in the player controller.
      if (keys['e'] && house.tryInteract(player)) keys['e'] = false;

      if (!house.resting) {
        player.update(dt, keys, structures.fireGroup);
        // Third-person games naturally settle the camera behind the character
        // when movement starts, even if the player had been looking sideways.
        if (Math.abs(player.speed) > 0.15) {
          camYawOffset += (0 - camYawOffset) * Math.min(1, dt * 4.2);
        }
        player.updateCamera(dt, elapsed, camera, camYawOffset, camPitch, camDist);
      } else {
        house.updateInteriorCamera(dt, elapsed, camera);
      }
      // House updates its door, interior UI, and stamina restoration.
      house.update(dt, elapsed, player);
    }

    vegetation.updateFallSystems(dt, elapsed, windX, player.group.position);
    wildlife.update(dt, elapsed, player.group.position, player.speed);
    landmarks.update(dt, elapsed, isSummer);
    const speciesProgress = collectibles.update(dt, elapsed, player.group.position, landmarks.PD_POS);
    climate.update(dt, elapsed);
    fireflies.update(dt, elapsed, 1 - climate.dayAmt);
    weather.update(dt, elapsed, player.group.position, climate.dayAmt, climate.getSeasonName(), camera);
    constellations.update(dt, camera, 1 - climate.dayAmt);
    soundscape.update(dt, elapsed, player.group.position, climate.dayAmt > 0.5, audio.muted, weather);
    binoculars.update(dt, camera, player.group.position, name => ui.isDiscovered(name));
    ui.update(dt, player, climate, speciesProgress);

    vegetation.clouds.forEach(c => {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 280) c.position.x = -280;
    });

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
