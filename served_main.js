import { createAudio, startAudio, toggleMute, playHoof } from './audio.js';
import { createScene } from './scene.js';
import { createTerrain } from './terrain.js';
import { createMountains } from './mountains.js';
import { createVegetation } from './vegetation.js';
import { createStructures } from './structures.js';
import { createWildlife } from './wildlife.js';
import { createPlayer } from './player.js';
import { createClimate } from './climate.js';
import { createUI } from './ui.js';
import { createIntro } from './intro.js';

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

  const player = createPlayer(
    scene,
    terrain.terrainHeight,
    terrain.terrainNormalApprox,
    (strength) => playHoof(audio, strength)
  );

  const climate = createClimate({
    scene,                                    // ? important
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

  const ui = createUI(player);
  const intro = createIntro(camera);

  // ---------- input ----------
  const keys = {};
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'shift') keys['shift'] = true;
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

  document.getElementById('climateBtn').addEventListener('click', () => {
    climate.skipSeason();
  });

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

    if (intro.active) {
      intro.update(dt);
    } else {
      player.update(dt, keys);
      player.updateCamera(dt, elapsed, camera, camYawOffset, camPitch, camDist);
    }

    vegetation.updateFallSystems(dt, elapsed, windX, player.group.position);
    wildlife.update(dt, elapsed, player.group.position, player.speed);
    structures.updateFire(elapsed);
    ui.update(dt, player, climate);
    climate.update(dt, elapsed);

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

