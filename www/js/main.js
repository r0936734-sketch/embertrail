import { createAudio, startAudio, toggleMute, playHoof, playWhistle, playRear, playMiraVoice, playActivityVoice, playArrowShot, playTicWin } from './audio.js';
import { createScene } from './scene.js';
import { createWindmill } from './windmill.js';
import { createMysticStone } from './mysticStone.js';
import { createFlameTower } from './flametower.js';
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
import { createTic } from './tic.js';
import { createBike } from './bike.js';
import { createHunting } from './hunting.js';
import { createRange, RANGE_ORIGIN } from './range.js';
import { createMandir, MANDIR_ORIGIN } from './mandir.js';
import { createForage } from './forage.js';
import { createQuests } from './quests.js';
import { createWorld } from './world.js';
import { createStunt, STUNT_ORIGIN } from './stunt.js';
import { createFarm, FARM_ORIGIN } from './farm.js';
import { createBalloon } from './balloon.js';
import { createBigMountain, BIG_MOUNTAIN_ORIGIN } from './bigmountain.js';
import { createOuterMountains, OUTER_MOUNTAINS } from './outermountains.js';
import { createSaveSystem } from './save.js';

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
    sunMesh, moon, moonGlow, starsMat, planetsGroup,
    qualityController
  } = createScene();

  const collision = createCollisionSystem();
  const terrain = createTerrain(scene);
  const bigMountain = createBigMountain(scene, terrain.terrainHeight, collision, {
    onEvent: (type, data) => {
      if (type === 'npcTalk') quests.toast(`${data.name}: ${data.line}`);
    }
  });
  const outerMountains = createOuterMountains(scene, terrain.terrainHeight, collision);
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
    waters: [{ x: 52, z: 36 }, { x: -62, z: -48 }, { x: 0, z: 0 }, { x: 38, z: 178 }],
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
    scene,
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
    interactRadius: 5,
    keepOnRadius: 14,
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

  // Flame Tower world position (shared by POI lists before the tower is constructed,
  // since createFlameTower needs archery which is created further below).
  const FLAME_TOWER_POS = { x: 130, z: 60 };
  const TIC_POS = { x: 95, z: 95 };
  const BIKE_POS = house.garageSpot;
  const flameTowerPoi = {
    name: 'The Flame Tower',
    pos: { x: FLAME_TOWER_POS.x, z: FLAME_TOWER_POS.z },
    r: 16,
    flavor:
      'An old stone beacon rises above the ridge. Its crown is cold — a well-aimed arrow might wake the signal fire once more.'
  };
  const BALLOON_POS = { x: -230, z: -52 };
  const binocularPois = [
    ...landmarks.poiList.map(p => ({ name: p.name, x: p.pos.x, z: p.pos.z })),
    { name: 'Sunveil Ridge', x: 95, z: -72 },
    { name: 'Northern Pines', x: -55, z: -30 },
    { name: 'Eastern Meadow', x: 48, z: 28 },
    { name: 'The Flame Tower', x: FLAME_TOWER_POS.x, z: FLAME_TOWER_POS.z },
    { name: 'The Old Windmill', x: 30, z: 55 },
    { name: 'Mystic Stone', x: 65, z: 35 },
    { name: 'Emberford', x: -148, z: 48 },
    { name: 'Saltmarsh Docks', x: 38, z: 178 },
    { name: 'The Quiet Abbey', x: -188, z: 132 },
    { name: 'Lantern Market', x: 168, z: 148 },
    { name: 'Sky Lantern Balloon', x: BALLOON_POS.x, z: BALLOON_POS.z },
    { name: 'Skyhold Peak', x: BIG_MOUNTAIN_ORIGIN.x, z: BIG_MOUNTAIN_ORIGIN.z },
    ...OUTER_MOUNTAINS.map(mountain => ({ name: mountain.name, x: mountain.x, z: mountain.z })),
    { name: 'Ashen Ruins', x: 214, z: -52 },
    { name: 'Skywatch Observatory', x: 52, z: -188 },
    { name: 'Wolfhollow', x: -176, z: -128 },
    { name: 'Farshot Practice Range', x: RANGE_ORIGIN.x, z: RANGE_ORIGIN.z },
    { name: 'Shree Baba Prasannadas Ji Mandir', x: MANDIR_ORIGIN.x, z: MANDIR_ORIGIN.z },
    { name: 'Tic-Tac Arena', x: TIC_POS.x, z: TIC_POS.z },
    { name: "Mira's Farm", x: FARM_ORIGIN.x, z: FARM_ORIGIN.z },
    { name: 'Home Garage', x: BIKE_POS.x, z: BIKE_POS.z }
  ];
  const binoculars = createBinoculars(binocularPois);
  const intro = createIntro(camera);

  // ---------- hunting / activities ----------
  const inventory = createInventory(100);
  const quests = createQuests({ inventory });
  const balloon = createBalloon(scene, terrain.terrainHeight, collision, {
    position: BALLOON_POS,
    maxHeight: 140,
    onEvent: type => {
      if (type === 'mount') quests.toast('Sky Lantern Balloon boarded — W/S fly, A/D turn, Shift/Space rise, Ctrl/C descend.');
      if (type === 'dismount') quests.toast('You step back onto the valley trail.');
    }
  });
  let ui;
  const world = createWorld(scene, terrain.terrainHeight, collision, {
    inventory,
    onEvent: (type, data) => {
      quests.handleEvent(type, data);
      if (type === 'npcGuide' && ui) ui.setWaypointByName(data.target);
    }
  });
  world.setQuests(quests);
  collectibles.setOnEvent((type, data) => quests.handleEvent(type, data));
  constellations.setOnNamed((type, data) => quests.handleEvent(type, data));
  const archery = createArchery({
    scene, camera, player,
    terrainHeight: terrain.terrainHeight,
    inventory,
    getAimOffset: () => camYawOffset,
    onEvent: (type, data) => {
      quests.handleEvent(type, data);
      if (type === 'shot') playArrowShot(audio);
    }
  });

  let flameTowerDone = false;
  let windmillDone = false;
  let flameAccepted = false;
  let windmillAccepted = false;
  let activityVoiceSequence = 0;
  let activityVoiceActive = false;
  const activityCaptions = {
    flameAsk: 'Hey... it\'s been too long. The Flame Tower\'s gone dark. I topped it up with gasoline. One clean shot, one arrow, light it up.',
    flameYes: 'Sure thing. Give me a second... and watch it light up.',
    windmillAsk: 'We\'re running low on power. Shoot the windmill\'s center to break the chain and get it moving again.',
    windmillYes: 'Got it. I\'ll take the shot.',
    no: 'Nah, some other time.'
  };

  function playActivityLine(name) {
    const sequence = ++activityVoiceSequence;
    activityHint.textContent = activityCaptions[name] || '';
    activityHint.style.display = 'block';
    return playActivityVoice(
      audio,
      name,
      () => {
        activityVoiceActive = true;
        if (sequence === activityVoiceSequence) activityHint.style.display = 'block';
      },
      () => {
        if (sequence !== activityVoiceSequence) return;
        activityVoiceActive = false;
        activityHint.style.display = 'none';
      }
    );
  }

  // Flame Tower requires archery for the beacon target registration.
  const flameTower = createFlameTower({
    scene,
    terrainHeight: terrain.terrainHeight,
    collision,
    archery,
    position: FLAME_TOWER_POS,
    onEvent: (type, data) => {
      quests.handleEvent(type, data);
      if (type === 'towerLit') {
        flameTowerDone = true;
        quests.toast('🔥 The beacon roars to life!');
      }
      if (type === 'towerExtinguished') {
        flameTowerDone = false;
        quests.toast('The rain has doused the flame tower.');
      }
    }
  });

  const windmill = createWindmill({
    scene,
    terrainHeight: terrain.terrainHeight,
    collision,
    archery,
    position: { x: 30, z: 55 },
    onEvent: (type, data) => {
      if (type === 'millUnlocked') {
        windmillDone = true;
        quests.toast('🌬️ The old sails creak and begin to turn once more.');
      }
    }
  });

  const mysticStone = createMysticStone({
    scene,
    terrainHeight: terrain.terrainHeight,
    archery,
    position: { x: 65, z: 35 },
    onEvent: (type, data) => {
      if (type === 'stoneActivated') quests.toast('✨ The ancient stone awakens with magical light!');
      if (type === 'stoneColorChanged') quests.toast('🎨 The stone shifts to a new color!');
    }
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
    inventory,
    collision,
    onEvent: (type, data) => {
      quests.handleEvent(type, data);
      if (type === 'trialEnd') quests.toast(`Time trial over — ${data.score} points`);
    },
    origin: RANGE_ORIGIN,
    targetDirection: { x: -1, z: 0 }
  });

  const mandir = createMandir(scene, terrain.terrainHeight, collision, {
    position: MANDIR_ORIGIN,
    rotationY: 0,
    getAudioCtx: () => audio.audioCtx,
    onEvent: (type, data) => quests.handleEvent(type, data)
  });

  let farmQuestState = 'none'; // none | traveling | active | complete | skipped
  const farm = createFarm(scene, terrain.terrainHeight, collision, archery, {
    position: FARM_ORIGIN,
    onEvent: (type, data) => {
      quests.handleEvent(type, data);
      if (type === 'farmPestKilled') quests.toast(`Raider driven off â€” ${data.killed}/${data.total}`);
      if (type === 'farmMissionComplete') {
        quests.toast('The fields are safe â€” Mira is thrilled!');
        inventory.add('herb', 4);
        inventory.add('arrow', 6);
        farmQuestState = 'complete';
      }
    }
  });

  // One lightweight world-space beacon represents the selected map waypoint.
  const waypointPin = new THREE.Group();
  const waypointMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd35e, transparent: true, opacity: 0.88, depthWrite: false, depthTest: false
  });

  const tic = createTic({
    scene,
    terrainHeight: terrain.terrainHeight,
    archery,
    position: TIC_POS,
    onEvent: (type, data) => {
      quests.handleEvent(type, data);
      if (type === 'ticWin') {
        playTicWin(audio);
        quests.toast('★ Board conquered!');
      }
      if (type === 'ticLose') quests.toast('The board claims victory…');
    }
  });

  const stunt = createStunt(scene, terrain.terrainHeight, collision, {
    position: STUNT_ORIGIN,
    onEvent: (type, data) => {
      quests.handleEvent(type, data);
      if (type === 'stuntCarJump') quests.toast('Car jump! +' + data.points);
      if (type === 'stuntTabletop') quests.toast('Tabletop! +' + data.points);
      if (type === 'stuntHalfpipe') quests.toast('Half-pipe! +' + data.points);
    }
  });

  const bike = createBike(scene, terrain.terrainHeight, collision, {
    position: BIKE_POS,
    rotationY: 0.55,
    maxSpeedKmh: 100,
    roadDistance: terrain.trailDistance,
    jumpProvider: (position, heading, speed) => stunt.getJumpImpulse(position, heading, speed),
    surfaceProvider: position => stunt.getSurfaceHeight(position),
    getAudioContext: () => audio.audioCtx,
    isMuted: () => audio.muted,
    onEvent: type => {
      if (type === 'mount') quests.toast('Bike mounted — stay on trails for top speed.');
    }
  });
  const waypointBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.18, 48, 6), waypointMaterial
  );
  waypointBeam.position.y = 24;
  const waypointHead = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.72, 0),
    new THREE.MeshBasicMaterial({ color: 0xfff0aa, transparent: true, opacity: 1, depthWrite: false, depthTest: false })
  );
  waypointHead.position.y = 48.8;
  const waypointRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.07, 5, 12), waypointMaterial
  );
  waypointRing.rotation.x = Math.PI / 2;
  waypointRing.position.y = 48.8;
  waypointPin.add(waypointBeam, waypointHead, waypointRing);
  waypointPin.traverse(object => {
    object.frustumCulled = false;
    object.renderOrder = 100;
  });
  waypointPin.visible = false;
  scene.add(waypointPin);
  let waypointTarget = null;

  const activityHint = document.createElement('div');
  Object.assign(activityHint.style, {
    position: 'fixed', left: '50%', top: '14%', transform: 'translateX(-50%)',
    display: 'none', maxWidth: '82vw', padding: '8px 14px', zIndex: '18',
    background: 'rgba(12,16,22,0.82)', border: '1px solid rgba(255,211,94,0.55)',
    borderRadius: '7px', color: '#ffe39a', fontSize: '12px', fontWeight: '700',
    letterSpacing: '0.03em', textAlign: 'center', pointerEvents: 'none'
  });
  document.body.appendChild(activityHint);

  function updateActivityHint(playerPos) {
    const distanceTo = point => Math.hypot(playerPos.x - point.x, playerPos.z - point.z);
    let message = '';
    if (flameAccepted && !flameTowerDone && distanceTo(FLAME_TOWER_POS) < 24) {
      message = 'Shoot the yellow brazier at the top of the Flame Tower';
    } else if (windmillAccepted && !windmillDone && distanceTo({ x: 30, z: 55 }) < 18) {
      message = 'Shoot the locking wedge at the center of the Windmill';
    } else if (farmQuestState === 'none' && distanceTo(FARM_ORIGIN) < 58) {
      message = 'Go to Emberford and bring Mira here to start the farm rescue';
    } else if (farmQuestState === 'active' && !farm.missionDone && distanceTo(FARM_ORIGIN) < 70) {
      message = 'Kill all animals destroying the crops';
    }
    if (!activityVoiceActive) activityHint.textContent = message;
    if (message && !activityVoiceActive) activityHint.style.display = 'block';
    else if (!message) activityHint.style.display = 'none';
  }

  const activityModal = document.createElement('div');
  Object.assign(activityModal.style, {
    position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
    display: 'none', zIndex: '95', pointerEvents: 'none'
  });
  activityModal.innerHTML = `<div style="width:min(380px,86vw);padding:18px;text-align:center;background:rgba(18,16,14,.96);border:1px solid rgba(217,183,121,.55);border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.3);pointer-events:auto">
    <div id="activityNpcName" style="font-size:11px;letter-spacing:2px;color:#d9b779;margin-bottom:8px"></div>
    <div id="activityNpcText" style="font-size:14px;line-height:1.5;margin-bottom:14px"></div>
    <div id="activityChoices" style="display:none;gap:8px;justify-content:center">
      <button id="activityYes" type="button" style="min-width:86px;padding:8px 12px;border:1px solid rgba(150,240,180,.7);border-radius:6px;background:#3b9b68;color:#fff;font-size:11px;font-weight:700">YES</button>
      <button id="activityNo" type="button" style="min-width:86px;padding:8px 12px;border:1px solid rgba(255,210,190,.45);border-radius:6px;background:rgba(120,55,45,.72);color:#fff1eb;font-size:11px;font-weight:700">NO</button>
    </div>
  </div>`;
  document.body.appendChild(activityModal);
  const activityChoices = activityModal.querySelector('#activityChoices');
  const activityYes = activityModal.querySelector('#activityYes');
  const activityNo = activityModal.querySelector('#activityNo');
  const activityNpcName = activityModal.querySelector('#activityNpcName');
  const activityNpcText = activityModal.querySelector('#activityNpcText');
  let activityDialogBusy = false;

  function openActivityDialog(activity) {
    if (activityDialogBusy) return true;
    const flame = activity === 'flame';
    if ((flame && flameTowerDone) || (!flame && windmillDone)) return true;
    activityDialogBusy = true;
    activityNpcName.textContent = flame ? 'FLAME KEEPER' : 'MILL KEEPER';
    activityNpcText.textContent = flame ? activityCaptions.flameAsk : activityCaptions.windmillAsk;
    activityChoices.style.display = 'none';
    activityModal.style.display = 'block';
    playActivityLine(flame ? 'flameAsk' : 'windmillAsk').then(() => {
      if (activityModal.style.display === 'block') {
        activityDialogBusy = false;
        activityChoices.style.display = 'flex';
      }
    });
    activityYes.onclick = () => {
      if (activityDialogBusy) return;
      activityDialogBusy = true;
      if (flame) flameAccepted = true;
      else windmillAccepted = true;
      activityModal.style.display = 'none';
      activityVoiceSequence++;
      activityVoiceActive = false;
      playActivityLine(flame ? 'flameYes' : 'windmillYes').then(() => { activityDialogBusy = false; });
    };
    activityNo.onclick = () => {
      if (activityDialogBusy) return;
      activityDialogBusy = true;
      activityModal.style.display = 'none';
      activityVoiceSequence++;
      activityVoiceActive = false;
      playActivityLine('no').then(() => { activityDialogBusy = false; });
    };
    return true;
  }

  // Create UI after all POIs are created
  const balloonPoi = {
    name: 'Sky Lantern Balloon',
    pos: BALLOON_POS,
    r: 18,
    flavor: 'A tethered balloon waits far out beyond the town paths. From here, the whole valley seems to open up beneath the sky.'
  };
  const bikePoi = {
    name: 'Home Garage', pos: BIKE_POS, r: 8,
    flavor: 'Your bike is parked in the garage beside the cabin. Dismount your horse, then press E to ride.'
  };
  ui = createUI(player, [...landmarks.poiList, ...waterfall.poiList, flameTowerPoi, ...windmill.poiList, ...mysticStone.poiList, ...world.poiList, ...range.poiList, ...mandir.poiList, ...tic.poiList, ...stunt.poiList, ...farm.poiList, ...bigMountain.poiList, ...outerMountains.poiList, balloonPoi, bikePoi], key => {
    if (typeof key === 'string' && key.startsWith('poi:')) {
      quests.discover(key.slice(4));
      return;
    }
    if (key !== 'climbUnlock') return;
    player.unlockClimb();
    const toast = document.createElement('div');
    toast.textContent = '⛰ You feel steadier on steep ground — hold Shift to sprint on foot.';
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
  }, target => {
    waypointTarget = target;
    waypointPin.visible = !!target;
    if (target) waypointPin.position.set(target.x, terrain.terrainHeight(target.x, target.z), target.z);
  });

  const saveSystem = createSaveSystem({
    collect: () => ({
      player: {
        x: player.position.x, y: player.position.y, z: player.position.z,
        heading: player.heading, climbUnlocked: player.climbUnlocked
      },
      inventory: { ...inventory.items },
      quests: quests.getState(),
      climate: { gameMinutes: climate.gameMinutes },
      balloon: balloon.getState()
    }),
    apply: data => {
      player.restoreState(data.player);
      inventory.restore(data.inventory);
      quests.restoreState(data.quests);
      climate.restoreState(data.climate);
      balloon.restoreState(data.balloon);
    }
  });
  saveSystem.load();

  // ---------- Mira's Farm quest ----------
  const mira = world.getNpc('mira');
  const farmModal = document.createElement('div');
  Object.assign(farmModal.style, {
    position: 'fixed', inset: '0', zIndex: '95', display: 'none',
    alignItems: 'center', justifyContent: 'center', background: 'transparent', pointerEvents: 'none'
  });
  farmModal.innerHTML = `
    <div style="width:min(420px,88vw);background:rgba(18,16,14,0.94);border:1px solid rgba(217,183,121,0.55);border-radius:12px;padding:20px;text-align:center;color:#f3ead9;font-family:inherit;box-shadow:0 12px 36px rgba(0,0,0,0.32);pointer-events:auto">
      <div style="font-size:11px;letter-spacing:2px;color:#d9b779;margin-bottom:6px">MIRA</div>
      <div style="font-size:14px;line-height:1.5;margin-bottom:18px">Rider â€” my farm out west has been raided every night. Something is tearing through the fences and crop rows. Would you ride out with me and drive them off?</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button id="farmHelpBtn" type="button" style="min-width:96px;padding:8px 12px;border-radius:6px;border:1px solid rgba(150,240,180,0.7);background:#3b9b68;color:#fff;font-weight:700;font-size:11px;letter-spacing:0.04em;cursor:pointer">HELP</button>
          <button id="farmSkipBtn" type="button" style="min-width:96px;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,210,190,0.45);background:rgba(120,55,45,0.72);color:#fff1eb;font-weight:700;font-size:11px;letter-spacing:0.04em;cursor:pointer">NO</button>
      </div>
    </div>`;
  document.body.appendChild(farmModal);

  const farmChoiceButtons = farmModal.querySelector('div > div:last-child');
  const farmHelpBtn = document.getElementById('farmHelpBtn');
  const farmSkipBtn = document.getElementById('farmSkipBtn');
  const miraSubtitle = document.createElement('div');
  Object.assign(miraSubtitle.style, {
    position: 'fixed', left: '50%', bottom: '9%', transform: 'translateX(-50%)',
    width: 'min(720px, 86vw)', padding: '10px 16px', display: 'none',
    background: 'rgba(8, 11, 16, 0.86)', border: '1px solid rgba(255, 220, 150, 0.42)',
    borderRadius: '8px', color: '#fff3d2', fontFamily: 'inherit', fontSize: '14px',
    lineHeight: '1.45', textAlign: 'center', zIndex: '110', pointerEvents: 'none'
  });
  document.body.appendChild(miraSubtitle);
  const miraCaptions = {
    ask: 'Rider - my farm out west has been raided every night. Something\'s tearing through the fences and the crop rows. Would you ride out with me and drive them off?',
    characterNo: 'Nah, some other time.',
    characterYes: 'Yeah, sure. Let\'s do this.',
    yes: 'Bless you. Climb up - I\'ll ride behind you. It\'s marked on your map now.'
  };
  let farmVoiceBusy = false;
  let miraVoiceSequence = 0;

  function setFarmChoiceVisible(visible) {
    farmChoiceButtons.style.display = visible ? 'flex' : 'none';
    farmHelpBtn.disabled = !visible;
    farmSkipBtn.disabled = !visible;
  }

  function playMiraLine(name) {
    const sequence = ++miraVoiceSequence;
    miraSubtitle.textContent = miraCaptions[name] || '';
    miraSubtitle.style.display = 'block';
    return playMiraVoice(
      audio,
      name,
      () => { if (sequence === miraVoiceSequence) miraSubtitle.style.display = 'block'; },
      () => { if (sequence === miraVoiceSequence) miraSubtitle.style.display = 'none'; }
    );
  }

  farmHelpBtn.addEventListener('click', () => {
    if (farmVoiceBusy) return;
    farmVoiceBusy = true;
    setFarmChoiceVisible(false);
    farmModal.style.display = 'none';
    farmQuestState = 'traveling';
    if (mira) {
      mira.following = true;
      mira.interactionDisabled = true;
    }
    ui.setWaypointByName("Mira's Farm");
    quests.toast('Mira rides along. Head for the farm â€” it is marked on your map.');
    const sequence = miraVoiceSequence + 1;
    playMiraLine('characterYes').then(() => {
      if (sequence !== miraVoiceSequence) return;
      setTimeout(() => {
        if (sequence === miraVoiceSequence) playMiraLine('yes');
      }, 1000);
    });
  });
  farmSkipBtn.addEventListener('click', () => {
    if (farmVoiceBusy) return;
    farmVoiceBusy = true;
    setFarmChoiceVisible(false);
    farmModal.style.display = 'none';
    farmQuestState = 'skipped';
    playMiraLine('characterNo');
  });

  const farmPromptEl = document.createElement('div');
  Object.assign(farmPromptEl.style, {
    position: 'fixed', left: '50%', bottom: '24%', transform: 'translateX(-50%)',
    padding: '8px 16px', background: 'rgba(20,16,12,0.76)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '14px', borderRadius: '9px',
    border: '1px solid rgba(255,255,255,0.18)', opacity: '0', transition: 'opacity 0.22s',
    pointerEvents: 'none', zIndex: '50'
  });
  farmPromptEl.classList.add('context-prompt');
  farmPromptEl.dataset.mobileKey = 'e';
  farmPromptEl.dataset.mobilePriority = 'high';
  farmPromptEl.textContent = 'Press E to hear Mira out';
  document.body.appendChild(farmPromptEl);

  function canOfferFarmQuest() {
    if (!mira || farmQuestState !== 'none' || quests.chapter > 0 || world.isTalking) return false;
    return Math.hypot(player.position.x - mira.mesh.position.x, player.position.z - mira.mesh.position.z) < 4;
  }

  function tryOpenFarmQuest() {
    if (!canOfferFarmQuest() || farmModal.style.display === 'flex') return false;
    farmModal.style.display = 'flex';
    farmVoiceBusy = true;
    setFarmChoiceVisible(false);
    playMiraLine('ask').then(() => {
      if (farmModal.style.display === 'flex') {
        farmVoiceBusy = false;
        setFarmChoiceVisible(true);
      }
    });
    return true;
  }

  function updateFarmQuest(dt, elapsed) {
    farmPromptEl.style.opacity = canOfferFarmQuest() && farmModal.style.display !== 'flex' ? '1' : '0';
    if (farmQuestState === 'traveling' && mira) {
      if (player.mounted) {
        mira.followWalking = false;
        const back = { x: -Math.sin(player.heading), z: -Math.cos(player.heading) };
        mira.mesh.position.set(player.position.x + back.x * 1.1, player.position.y + 1.55, player.position.z + back.z * 1.1);
        mira.mesh.rotation.y = player.heading;
      } else if (bike.riding) {
        mira.followWalking = false;
        const bh = bike.group.rotation.y;
        const back = { x: -Math.sin(bh), z: -Math.cos(bh) };
        mira.mesh.position.set(bike.group.position.x + back.x * 0.48, bike.group.position.y + 0.62, bike.group.position.z + back.z * 0.48);
        mira.mesh.rotation.y = bh;
        const rig = mira.mesh.userData;
        if (rig.hips) {
          rig.hips.position.y = 0.78;
          rig.hips.rotation.x = -0.18;
        }
        if (rig.legs) rig.legs.forEach((leg, index) => {
          leg.hip.rotation.x = -0.55;
          leg.knee.rotation.x = index % 2 === 0 ? 1.25 : 1.05;
        });
        if (rig.arms) rig.arms.forEach(arm => {
          arm.shoulder.rotation.x = -0.55;
          arm.elbow.rotation.x = -0.8;
        });
      } else {
        mira.followWalking = true;
        const targetX = player.position.x - Math.sin(player.heading) * 2.2 + Math.cos(player.heading) * 1.4;
        const targetZ = player.position.z - Math.cos(player.heading) * 2.2 - Math.sin(player.heading) * 1.4;
        mira.mesh.position.x += (targetX - mira.mesh.position.x) * Math.min(1, dt * 2.4);
        mira.mesh.position.z += (targetZ - mira.mesh.position.z) * Math.min(1, dt * 2.4);
        mira.mesh.position.y = terrain.terrainHeight(mira.mesh.position.x, mira.mesh.position.z);
      }
      if (Math.hypot(player.position.x - farm.position.x, player.position.z - farm.position.z) < 14) {
        farmQuestState = 'active';
        mira.following = false;
        mira.lockedPosition = true;
        mira.mesh.position.set(farm.arrivalSpot.x, terrain.terrainHeight(farm.arrivalSpot.x, farm.arrivalSpot.z), farm.arrivalSpot.z);
        ui.clearWaypoint();
        farm.startMission();
        quests.toast('Mira: "There â€” raiders are tearing through the crop rows. Take them down!"');
      }
    }
    farm.update(dt, elapsed, player.position);
    updateActivityHint(player.position);
  }

  // Add simple exploration targets at various locations
  const explorationTargets = [
    { x: 50, z: 60, name: "Ancient Tree" },
    { x: -60, z: -40, name: "Stone Circle" },
    { x: 30, z: -50, name: "Hidden Pond" },
    { x: -30, z: 70, name: "Windmill Hill" },
    { x: 80, z: 25, name: "East Glade" }
  ];

  const explorationMarkers = [];
  explorationTargets.forEach(target => {
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 2, 6),
      new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 1, flatShading: true })
    );
    marker.position.set(target.x, terrain.terrainHeight(target.x, target.z) + 1, target.z);
    marker.visible = false;
    scene.add(marker);
    
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.4 })
    );
    glow.position.set(target.x, terrain.terrainHeight(target.x, target.z) + 2.5, target.z);
    glow.visible = false;
    scene.add(glow);
    
    explorationMarkers.push({ marker, glow, x: target.x, z: target.z });
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
  gallopBtn.addEventListener('pointerdown', e => {
    startAudio(audio);
    if (bike.riding) bike.boost();
    else keys['shift'] = true;
    e.preventDefault();
  });
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
  const mapBtn = document.getElementById('mapBtn');
  const launchOverlay = document.getElementById('launchOverlay');
  const launchPageCredits = document.getElementById('launchPageCredits');
  const launchPageHowTo = document.getElementById('launchPageHowTo');
  const btnHowToPlay = document.getElementById('btnHowToPlay');
  const btnBackToCredits = document.getElementById('btnBackToCredits');
  const btnPlay = document.getElementById('btnPlay');
  const btnPlayCredits = document.getElementById('btnPlayCredits');
  const btnLaunchMusic = document.getElementById('btnLaunchMusic');
  const btnLaunchQuality = document.getElementById('btnLaunchQuality');
  const qualityNames = ['PERFORMANCE', 'BALANCED', 'ULTRA'];
  const savedQuality = Number.parseInt(localStorage.getItem('embertrail-quality') || '', 10);
  if (Number.isInteger(savedQuality) && savedQuality >= 0 && savedQuality <= 2) {
    qualityController.setQuality(savedQuality);
  }

  function refreshLaunchSettings() {
    if (btnLaunchMusic) {
      btnLaunchMusic.textContent = audio.muted ? '♫ MUSIC: OFF' : '♫ MUSIC: ON';
      btnLaunchMusic.classList.toggle('is-muted', audio.muted);
    }
    if (btnLaunchQuality) {
      btnLaunchQuality.textContent = `◈ OPTIMIZATION: ${qualityNames[qualityController.getLevel()]}`;
    }
  }
  if (btnLaunchMusic) btnLaunchMusic.addEventListener('click', e => {
    if (audio.started) toggleMute(audio);
    else {
      audio.muted = !audio.muted;
      audio.bgm.muted = audio.muted;
    }
    refreshLaunchSettings();
    e.stopPropagation();
  });
  if (btnLaunchQuality) btnLaunchQuality.addEventListener('click', e => {
    const next = (qualityController.getLevel() + 1) % 3;
    qualityController.setQuality(next);
    localStorage.setItem('embertrail-quality', String(next));
    refreshLaunchSettings();
    e.stopPropagation();
  });
  refreshLaunchSettings();
  contextBtn.style.display = 'none';

  function showLaunchPage(pageEl) {
    document.querySelectorAll('.launch-page').forEach(p => p.classList.remove('active'));
    pageEl.classList.add('active');
  }

  btnHowToPlay.addEventListener('click', () => { showLaunchPage(launchPageHowTo); });
  btnBackToCredits.addEventListener('click', () => { showLaunchPage(launchPageCredits); });
  btnPlay.addEventListener('click', launchGame);
  if (btnPlayCredits) btnPlayCredits.addEventListener('click', launchGame);
  // Also allow pressing any key on desktop to launch
  document.addEventListener('keydown', function onFirstKey(e) {
    if (launchOverlay && !launchOverlay.classList.contains('is-hidden')) {
      launchGame();
      document.removeEventListener('keydown', onFirstKey);
    }
  }, { once: false });
  // Tap on canvas also launches (desktop click)
  document.addEventListener('click', function onFirstClick(e) {
    if (!launchOverlay || launchOverlay.classList.contains('is-hidden')) return;
    // only dismiss if clicking outside the overlay cards (i.e. on the bg)
    if (e.target === launchOverlay || e.target.classList.contains('launch-bg-glow')) {
      launchGame();
    }
  });

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
    const deadZone = 0.08;
    const magnitude = Math.abs(value);
    if (magnitude <= deadZone) return 0;
    const normalized = (magnitude - deadZone) / (1 - deadZone);
    // More linear: gentle ease-in only at the very top end for smooth full turns
    return Math.sign(value) * (normalized * 0.72 + normalized * normalized * normalized * 0.28);
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
    // Increased radius for better precision — knob can travel 44% of the ring's radius
    const radius = rect.width * 0.44;
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

    // Read inline style opacity (set by each module's JS) — not getComputedStyle,
    // which would be overridden by CSS visibility rules on mobile.
    const prompts = [...document.querySelectorAll('.context-prompt')]
      .filter(el => el.dataset.mobileKey && Number.parseFloat(el.style.opacity || '0') > 0.5);

    // Priority: TV (v) first, then anything else
    const prompt = prompts.find(el => el.dataset.mobilePriority === 'high') ||
      prompts.find(el => el.dataset.mobileKey === 'v') || prompts[0];

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
    if (key === 'q') label = /off/i.test(promptText) ? 'BIKE OFF' : 'RIDE BIKE';
    if (key === 'e') {
      if (/dismount/i.test(promptText)) label = 'DISMOUNT';
      else if (/talk/i.test(promptText)) label = 'TALK';
      else if (/darshan/i.test(promptText)) label = 'DARSHAN';
      else if (/bell|ring/i.test(promptText)) label = 'RING';
      else if (/sleep/i.test(promptText)) label = 'SLEEP';
      else if (/open|enter/i.test(promptText)) label = 'ENTER';
      else if (/leave|exit/i.test(promptText)) label = 'EXIT';
      else if (/read/i.test(promptText)) label = 'READ';
      else if (/boiling|food/i.test(promptText)) label = 'COOK';
      else if (/light|dim/i.test(promptText)) label = 'LAMP';
      else if (/offer|jal|water/i.test(promptText)) label = 'OFFER';
      else if (/drink/i.test(promptText)) label = 'DRINK';
      else if (/sit/i.test(promptText)) label = 'SIT';
      else if (/study/i.test(promptText)) label = 'STUDY';
    }
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
    callHorseBtn.style.display = player.mounted || bike.riding ? 'none' : 'block';
    dismountBtn.style.display = player.mounted || bike.riding ? 'block' : 'none';
    gallopBtn.textContent = bike.riding ? 'BOOST' : player.mounted ? 'GALLOP' : 'SPRINT';
    gallopBtn.classList.toggle('nitro-ready', bike.riding);
    document.getElementById('rearBtn').style.display = player.mounted ? 'block' : 'none';
    bowBtn.style.display = player.canUseArchery ? 'block' : 'none';
  }

  let gameStarted = false;

  async function launchGame() {
    if (gameStarted) return; // prevent double-fire
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
    if (launchOverlay) launchOverlay.classList.add('is-hidden');
    // Reset and start the intro fly-by fresh now that the player pressed Play
    intro.reset();
    gameStarted = true;
  }

  // ── Android back-button → exit confirmation dialog ──────────────────
  const exitDialog = document.getElementById('exitDialog');
  const exitYes    = document.getElementById('exitYes');
  const exitNo     = document.getElementById('exitNo');

  function showExitDialog() {
    if (exitDialog) exitDialog.style.display = 'flex';
  }
  function hideExitDialog() {
    if (exitDialog) exitDialog.style.display = 'none';
  }

  if (exitYes) exitYes.addEventListener('click', () => {
    // Try Capacitor App plugin first, then standard window.close
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.exitApp();
      } else {
        window.close();
      }
    } catch (_) { window.close(); }
  });
  if (exitNo) exitNo.addEventListener('click', hideExitDialog);

  // Push a dummy history entry so the first back-press pops it (not exits)
  history.pushState({ embertrail: true }, '');
  window.addEventListener('popstate', () => {
    // Re-push so the next back press fires popstate again
    history.pushState({ embertrail: true }, '');
    // If the launch overlay is still visible, just ignore — no game yet
    if (launchOverlay && !launchOverlay.classList.contains('is-hidden')) return;
    if (world.isTalking) {
      world.closeTalk();
      return;
    }
    showExitDialog();
  });
  // ────────────────────────────────────────────────────────────────────

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
    mapBtn.addEventListener('pointerdown', e => {
      ui.toggleMap();
      // Keep the source button through this touch sequence. If it disappears
      // immediately, Android can deliver the ending click to the backdrop.
      setTimeout(() => {
        mobileActivityMenu.classList.remove('is-open');
        activityToggle.setAttribute('aria-expanded', 'false');
      }, 0);
      startAudio(audio);
      e.stopPropagation();
      e.preventDefault();
    });
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
    // launch handled by launchOverlay buttons wired above
    refreshMobileButtons();
  } else {
    [
      document.getElementById('dpad'), gallopBtn, document.getElementById('rearBtn'),
      joystick, contextBtn, document.getElementById('mobileQuickActions'), mobileSensitivity, mobileZoomActions,
      bowBtn, activityToggle, mobileActivityMenu
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
  let camDist = 8;
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
    // Positive dy = finger/mouse moved DOWN = camera should look down (pitch increases)
    // Negative dy = finger/mouse moved UP   = camera should look up  (pitch decreases)
    camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.004 * lookSensitivity, -0.65, 1.4);
    lastManualLook = performance.now();
  });
  domEl.addEventListener('wheel', e => {
    camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.02, 6, 36);
    e.preventDefault();
  }, { passive: false });

  // ── Pinch-to-zoom (two-finger) ───────────────────────────────────────
  let pinchDist = null;

  function canvasTouches(e) {
    // Only count fingers that actually started on the canvas — otherwise a
    // finger held on the AIM button (or any other HUD button) gets counted
    // toward e.touches.length too, since TouchList is page-wide, and that
    // falsely triggers pinch-zoom / kills the look-drag while aiming.
    return Array.from(e.touches).filter(t => t.target === domEl);
  }

  domEl.addEventListener('touchstart', e => {
    const ct = canvasTouches(e);
    if (ct.length === 2) {
      pinchDist = Math.hypot(
        ct[0].clientX - ct[1].clientX,
        ct[0].clientY - ct[1].clientY
      );
      e.preventDefault();
    } else {
      pinchDist = null;
    }
  }, { passive: false });

  domEl.addEventListener('touchmove', e => {
    const ct = canvasTouches(e);
    if (ct.length === 2 && pinchDist !== null) {
      const newDist = Math.hypot(
        ct[0].clientX - ct[1].clientX,
        ct[0].clientY - ct[1].clientY
      );
      const delta = pinchDist - newDist;
      camDist = THREE.MathUtils.clamp(camDist + delta * 0.04, 6, 36);
      pinchDist = newDist;
      dragging = false;
      e.preventDefault();
    } else if (ct.length < 2) {
      pinchDist = null;
    }
  }, { passive: false });

  domEl.addEventListener('touchend', e => {
    if (canvasTouches(e).length < 2) pinchDist = null;
  }, { passive: false });
  // ────────────────────────────────────────────────────────────────────

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
  let frameNumber = 0;
  let lastDomRefresh = 0;
  let environmentAccumulator = 0;
  let hudAccumulator = 0;
  let speciesProgress = { found: 0, total: 0 };

  function animate(now) {
    requestAnimationFrame(animate);

    const rawDt = Math.max(0, (now - lastTime) / 1000);
    let dt = Math.min(rawDt, 0.05);
    lastTime = now;
    const qualityLevel = qualityController.sample(now, rawDt);
    const visualStride = qualityLevel === 0 ? 3 : qualityLevel === 1 ? 2 : 1;
    const updateVisuals = frameNumber % visualStride === 0;
    // Keep player movement, vehicles and combat at display rate. Ambient
    // creatures, weather, particle worlds and DOM-heavy HUD updates look the
    // same at 18–30 Hz, but no longer compete with controls each frame.
    const environmentInterval = qualityLevel === 2 ? 1 / 30 : qualityLevel === 1 ? 1 / 24 : 1 / 18;
    environmentAccumulator += dt;
    const updateEnvironment = firstFrame || environmentAccumulator >= environmentInterval;
    const environmentDt = updateEnvironment ? Math.min(environmentAccumulator, 0.16) : 0;
    if (updateEnvironment) environmentAccumulator = 0;
    hudAccumulator += dt;
    const updateHud = firstFrame || hudAccumulator >= 1 / 15;
    const hudDt = updateHud ? hudAccumulator : 0;
    if (updateHud) hudAccumulator = 0;
    frameNumber++;
    elapsed += dt;
    windAngle += dt * 0.05;
    const windX = Math.sin(windAngle) * 1.1;
    const isSummer = climate.getSeasonName() === 'summer';

    if (intro.active) {
      // Only advance the intro fly-by after the player has pressed Play
      if (gameStarted) intro.update(dt);
    } else {
      structures.updateFire(elapsed, isSummer);

      // The cabin owns E while close to its door (or an item inside it);
      // elsewhere E keeps its normal mount/dismount behaviour.
      if (keys['e']) {
        if (tryOpenFarmQuest()) {
          keys['e'] = false;
        } else if (world.isTalking) {
          world.tryInteract(player);
          keys['e'] = false;
        } else if (house.tryInteract(player)) {
          keys['e'] = false;
        } else if (mandir.tryInteract(player)) {
          keys['e'] = false;
        } else if (world.getNearestActivity() && openActivityDialog(world.getNearestActivity())) {
          keys['e'] = false;
        } else if (world.tryInteract(player)) {
          keys['e'] = false;
        }
      }

      // Update archery first: F then owns the bow draw rather than the nearby-fire sit action.
      archery.update(dt, keys, elapsed);
      if (archery.aiming) binoculars.deactivate();
      traversal.update(dt, keys, player.position);
      bike.update(dt, keys, player);
      balloon.update(dt, keys, player, elapsed, windX);
      if (updateEnvironment) bigMountain.update(environmentDt, keys, player, elapsed);
      stunt.update(dt, elapsed, player.position, bike.riding ? bike.speed : 0);
      player.update(dt, keys, structures.fireGroup);
      player.setBinocularsActive(binoculars.active);

      inventory.update(dt, keys, () => quests.handleEvent('craft'));
      quests.update(dt, keys);
      forage.update(dt, keys, player.position);
      world.update(dt, elapsed, player.position, player.speed);
      updateFarmQuest(dt, elapsed);
      flameTower.update(dt, elapsed, { isRaining: weather.isRaining, rainAmount: weather.rainAmount });
      if (Math.abs(player.speed) > 0.15 && performance.now() - lastManualLook > 1500) {
        camYawOffset += (0 - camYawOffset) * Math.min(1, dt * 4.2);
      }
      if (archery.isFollowingArrow) {
        const target = archery.getFollowTarget();
        if (target) {
          const from = player.position.clone();
          from.y += 1.55;
          const dir = target.velocity && target.velocity.lengthSq() > 0.01
            ? target.velocity.clone().normalize()
            : new THREE.Vector3().subVectors(target.position, from).normalize();
          const camBack = from.clone().addScaledVector(dir, -4.5);
          camBack.y += 1.2;
          camera.position.lerp(camBack, Math.min(1, dt * 10));
          camera.lookAt(target.lookAt.x, target.lookAt.y, target.lookAt.z);
          if (archery.getLastShotDir && player.faceDirection) {
            player.faceDirection(archery.getLastShotDir(), Math.min(1, dt * 6));
          }
        } else {
          player.updateCamera(
            dt, elapsed, camera, camYawOffset, camPitch,
            house.resting ? Math.min(camDist, 3.8) : camDist
          );
        }
      } else {
        player.updateCamera(
          dt, elapsed, camera, camYawOffset, camPitch,
          house.resting ? Math.min(camDist, 3.8) : camDist
        );
      }

      house.update(dt, elapsed, player);
      tv.update(dt, keys, player.position, camera);
    }

    hunting.update(dt, elapsed, player.position);
    // Use the active player position so the range remains available while
    // dismounted instead of tracking the horse left behind elsewhere.
    range.update(dt, camera, player.position);
    if (updateEnvironment) {
      wildlife.update(environmentDt, elapsed, player.group.position, player.speed);
      mandir.update(environmentDt, elapsed, player.position);
      tic.update(environmentDt, elapsed, player.position);
      landmarks.update(environmentDt, elapsed, isSummer, player.group.position);
      waterfall.update(environmentDt, elapsed, player.group.position);
      const dMillpond = Math.hypot(
        player.group.position.x - landmarks.PD_POS.x,
        player.group.position.z - landmarks.PD_POS.z
      );
      const dTwinFalls = Math.hypot(
        player.group.position.x - waterfall.pondPos.x,
        player.group.position.z - waterfall.pondPos.z
      );
      const nearestPond = dTwinFalls < dMillpond ? waterfall.pondPos : landmarks.PD_POS;
      speciesProgress = collectibles.update(environmentDt, elapsed, player.group.position, nearestPond);
      climate.update(environmentDt, elapsed);
      windmill.update(environmentDt, elapsed, windX, 1 - climate.dayAmt, player.group.position);
      mysticStone.update(environmentDt, elapsed, player.group.position);
      outerMountains.update(player.group.position);
      weather.update(environmentDt, elapsed, player.group.position, climate.dayAmt, climate.getSeasonName(), camera);
      soundscape.update(environmentDt, elapsed, player.group.position, climate.dayAmt > 0.5, audio.muted, weather);
    }
    if (updateVisuals) fireflies.update(dt * visualStride, elapsed, 1 - climate.dayAmt);
    
    // Update exploration markers visibility
    if (updateVisuals) {
      explorationMarkers.forEach(em => {
        const dist = Math.hypot(player.group.position.x - em.x, player.group.position.z - em.z);
        const shouldRender = dist < 120;
        em.marker.visible = shouldRender;
        em.glow.visible = shouldRender;
      });
    }

    if (waypointTarget) {
      waypointPin.position.y = terrain.terrainHeight(waypointTarget.x, waypointTarget.z);
      const pulse = Math.sin(elapsed * 2.5) * 0.28;
      waypointHead.position.y = 48.8 + pulse;
      waypointRing.position.y = 48.8 + pulse;
      waypointRing.rotation.z = elapsed * 0.7;
    }
    
    if (updateVisuals) constellations.update(dt * visualStride, camera, 1 - climate.dayAmt);
    binoculars.update(dt, camera, player.group.position, name => ui.isDiscovered(name));
    player.setBinocularsActive(binoculars.active);
    if (updateHud) ui.update(hudDt, player, climate, speciesProgress, qualityController.getFps());
    saveSystem.update(dt);
    // These functions query and write several DOM nodes; neither needs to run
    // at display refresh rate.
    if (now - lastDomRefresh > (touchControls ? 120 : 300)) {
      refreshContextButton();
      refreshMobileButtons();
      lastDomRefresh = now;
    }

    if (updateVisuals) {
      vegetation.clouds.forEach(c => {
        c.position.x += c.userData.drift * dt * visualStride;
        if (c.position.x > 280) c.position.x = -280;
      });
    }

    if (updateVisuals) house.updateWindowView();
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
