// stunt.js — One big stunt ramp, with real jump physics + a meters-jumped toast.
//
// Down to a single, honest mechanic instead of a bunch of half-wired props:
// a runway → launch ramp → gap → long flat landing field. The ramp gives
// the bike a real launch impulse scaled by its speed and the ramp's angle;
// gravity + motion after that are entirely your bike's own physics (this
// file doesn't fake a trajectory). What THIS file adds on top is simple
// and honest: it watches the bike go airborne off the ramp and land again,
// measures the straight-line distance between those two points, and pops
// a toast + fires onEvent with the number. Distance flags every 10m along
// the landing field give you a visual ruler while you're in the air.
//
// ---------------------------------------------------------------------
// Wiring:
//
//   import { createStunt, STUNT_ORIGIN } from './stunt.js';
//   ...
//   const stunt = createStunt(scene, terrain.terrainHeight, collision, {
//     position: STUNT_ORIGIN,          // or any {x,z}
//     rotationY: 0,
//     onEvent: (type, data) => {
//       // type === 'stuntJump' → data = { distance, best }
//       if (type === 'stuntJump') quests.toast(`🚀 ${data.distance.toFixed(1)}m jump!`);
//     }
//   });
//
//   // add stunt.poiList to your discoverable list
//
// inside animate(), after computing the bike's intended next position:
//   const surf = stunt.getSurfaceHeight(bike.position);
//   if (surf !== null) bike.groundHeight = Math.max(bike.groundHeight, surf);
//
//   // when the bike is on the ground and moving forward on the ramp:
//   const boost = stunt.getJumpImpulse(bike.position, bike.heading, bike.speed);
//   if (boost) bike.verticalVelocity += boost;   // add on top of your existing gravity integration
//
//   // every frame, regardless of jumping or not — this is what measures
//   // airtime and fires the toast on landing:
//   stunt.update(dt, elapsed, bike.position, bike.riding ? bike.speed : 0);
// ---------------------------------------------------------------------

export const STUNT_ORIGIN = { x: -80, z: 260 };
export const STUNT_ROTATION = 0;
export const STUNT_PAD_OFFSET = 0.6;

const STUNT_RAMP_Z0 = -30;
const STUNT_LANDING_Z1 = 140;
// This includes a small shoulder around the 20m-wide asphalt.  Keeping the
// terrain flat beyond the visible edge avoids grass clipping through it and
// gives the bike a safe recovery area after an imperfect landing.
const STUNT_HALF_WIDTH = 14;

function stuntToLocal(x, z, position = STUNT_ORIGIN, rotationY = STUNT_ROTATION) {
  const dx = x - position.x, dz = z - position.z;
  const cos = Math.cos(-rotationY), sin = Math.sin(-rotationY);
  return { lx: dx * cos - dz * sin, lz: dx * sin + dz * cos };
}

export function stuntCorridorT(x, z, position = STUNT_ORIGIN, rotationY = STUNT_ROTATION) {
  const { lx, lz } = stuntToLocal(x, z, position, rotationY);
  const edge = (value, min, max, fade) => {
    if (value < min) return 1 - Math.min(1, (min - value) / fade);
    if (value > max) return 1 - Math.min(1, (value - max) / fade);
    return 1;
  };
  const along = edge(lz, STUNT_RAMP_Z0 - 14, STUNT_LANDING_Z1, 8);
  const across = edge(Math.abs(lx), STUNT_HALF_WIDTH, STUNT_HALF_WIDTH, 4);
  return Math.max(0, Math.min(1, along * across));
}

export function stuntBaseY(terrainHeight, position = STUNT_ORIGIN, rotationY = STUNT_ROTATION) {
  const toWorld = (lx, lz) => ({
    x: position.x + lx * Math.cos(rotationY) + lz * Math.sin(rotationY),
    z: position.z - lx * Math.sin(rotationY) + lz * Math.cos(rotationY)
  });
  let baseY = terrainHeight(position.x, position.z);
  for (let sx = -45; sx <= 45; sx += 15) {
    for (let sz = -45; sz <= 150; sz += 15) {
      const sample = toWorld(sx, sz);
      baseY = Math.min(baseY, terrainHeight(sample.x, sample.z));
    }
  }
  return baseY;
}

export function createStunt(scene, terrainHeight, collision, options = {}) {
  const position  = options.position  || STUNT_ORIGIN;
  const rotationY = options.rotationY ?? 0;
  const onEvent   = options.onEvent   || (() => {});

  const px = position.x;
  const pz = position.z;
  // terrain.js has already flattened this corridor to its stunt pad height.
  // Do not search surrounding (unflattened) hills here: a low sample outside
  // the pad would drag the complete arena underground.
  const baseY = terrainHeight(px, pz) + STUNT_PAD_OFFSET;

  const root = new THREE.Group();
  root.position.set(px, baseY, pz);
  root.rotation.y = rotationY;
  root.visible = false;
  scene.add(root);

  // ─────────────────────────────────────────────────────────────────
  // MATERIALS
  // ─────────────────────────────────────────────────────────────────
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.95, flatShading: true });
  const rampMat    = new THREE.MeshStandardMaterial({ color: 0x3d4450, roughness: 0.9, flatShading: true });
  const railMat    = new THREE.MeshStandardMaterial({ color: 0xb0b6c0, roughness: 0.35, metalness: 0.7, flatShading: true });
  const towerMat   = new THREE.MeshStandardMaterial({ color: 0x565f6b, roughness: 0.6, metalness: 0.3, flatShading: true });
  const stripeMat  = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
  const coneMat    = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.7, flatShading: true });
  const coneWhite  = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.7, flatShading: true });
  const metalMat   = new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.4, metalness: 0.65, flatShading: true });
  const darkMat    = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.8, flatShading: true });
  const lightMat   = new THREE.MeshBasicMaterial({ color: 0xfff2cc });
  const glowMat    = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.35 });

  // ─────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────
  function box(w, h, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function cyl(rTop, rBot, h, segs, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function makeCheckered(w, d, tilesX, tilesZ, y, x0, z0, parent) {
    const tw = w / tilesX, td = d / tilesZ;
    const matA = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, flatShading: true });
    const matB = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9, flatShading: true });
    for (let ix = 0; ix < tilesX; ix++) {
      for (let iz = 0; iz < tilesZ; iz++) {
        box(tw * 0.98, 0.04, td * 0.98, (ix + iz) % 2 === 0 ? matA : matB,
          x0 - w / 2 + tw / 2 + ix * tw, y, z0 - d / 2 + td / 2 + iz * td, parent);
      }
    }
  }
  function makeCone(parent, x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    parent.add(g);
    cyl(0.08, 0.28, 0.7, 6, coneMat, 0, 0.35, 0, g);
    box(0.5, 0.05, 0.5, coneWhite, 0, 0.03, 0, g);
    cyl(0.18, 0.22, 0.08, 6, coneWhite, 0, 0.45, 0, g);
  }
  const floodLights = [];
  function makeFloodLight(parent, x, z, h = 9) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    parent.add(g);
    cyl(0.14, 0.2, h, 6, metalMat, 0, h / 2, 0, g);
    box(0.9, 0.35, 0.6, darkMat, 0, h + 0.1, 0.15, g);
    box(0.7, 0.15, 0.15, lightMat, 0, h + 0.05, 0.4, g);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), glowMat);
    glow.position.set(0, h + 0.05, 0.5);
    g.add(glow);
    floodLights.push({ glow, seed: Math.random() * 10 });
  }
  // distance marker flag — a little pole + numbered cloth beside the
  // landing field every 10m so you have a visual ruler mid-air
  function makeDistanceFlag(parent, meters, z, halfWidth) {
    const g = new THREE.Group();
    g.position.set(halfWidth + 1.5, 0, z);
    parent.add(g);
    cyl(0.04, 0.05, 1.6, 5, metalMat, 0, 0.8, 0, g);

    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#fff';
    ctx.font = '700 30px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meters + 'm', 64, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), mat);
    cloth.position.set(0.5, 1.35, 0);
    g.add(cloth);
  }

  // ─────────────────────────────────────────────────────────────────
  // THE RAMP — the arena's one physics object. Registered as a simple
  // line segment (start point+height → end point+height + width) so
  // surface height and the launch impulse both read off the same real
  // geometry instead of separate hand-tuned numbers.
  //
  // Layout along local +Z (arena-local, unrotated space):
  //   z -30 .......... -14   runway climbs into the launch ramp
  //   z -14 (lip)             ← launch edge, impulse fires here
  //   z -14 ......  +2        the gap (open air, nothing underfoot)
  //   z  +2 .......  +90      long flat landing field, ground level
  // ─────────────────────────────────────────────────────────────────
  const RAMP_RISE = 5.5;
  const RAMP_RUN  = 32;
  const RAMP_WIDTH = 9;
  const rampSeg = {
    x0: 0, z0: -30, h0: 0,
    x1: 0, z1: -30 + RAMP_RUN, h1: RAMP_RISE,
    halfWidth: RAMP_WIDTH / 2,
    minSpeed: 6.5,
    impulseBase: 6.5,
    impulseScale: 0.24
  };
  const LANDING_Z0 = rampSeg.z1 + 20; // leave a real gap after the launch lip
  const LANDING_Z1 = 140;
  const LANDING_HALF_W = 9;

  function buildRamp() {
    const dx = rampSeg.x1 - rampSeg.x0, dz = rampSeg.z1 - rampSeg.z0;
    const len = Math.hypot(dx, dz);
    const incline = Math.atan2(rampSeg.h1 - rampSeg.h0, len);
    const midH = (rampSeg.h0 + rampSeg.h1) / 2;

    const g = new THREE.Group();
    g.position.set((rampSeg.x0 + rampSeg.x1) / 2, midH, (rampSeg.z0 + rampSeg.z1) / 2);
    root.add(g);

    const surface = box(RAMP_WIDTH, 0.25, len, rampMat, 0, 0, 0, g);
    surface.rotation.x = -incline;
    // lip stripe right at the launch edge so it visually reads as "jump here"
    const lip = box(RAMP_WIDTH, 0.28, 0.4, stripeMat, 0, 0, len / 2 - 0.2, g);
    lip.rotation.x = -incline;

    const railH = 0.55;
    [-RAMP_WIDTH / 2 + 0.12, RAMP_WIDTH / 2 - 0.12].forEach(rx => {
      const rail = box(0.16, railH, len, railMat, rx, railH / 2 + 0.12, 0, g);
      rail.rotation.x = -incline;
    });

    // support legs, taller toward the high end
    const legCount = 6;
    for (let i = 0; i < legCount; i++) {
      const t = (i + 0.5) / legCount;
      const legZ = -len / 2 + t * len;
      const legH = Math.max(0.4, rampSeg.h0 + (rampSeg.h1 - rampSeg.h0) * t) * 0.85;
      [-RAMP_WIDTH / 2 + 0.4, RAMP_WIDTH / 2 - 0.4].forEach(lx => {
        box(0.2, legH, 0.2, towerMat, lx, -midH / 2 - legH / 2 + 0.5, legZ, g);
      });
    }

    // approach runway before the ramp
    box(RAMP_WIDTH, 0.12, 18, asphaltMat, 0, -midH, -len / 2 - 9, g);
  }
  buildRamp();

  // landing field — flat, generous, with a checkerboard right where most
  // jumps will actually land, plus distance flags as a visual ruler
  box(LANDING_HALF_W * 2 + 2, 0.12, LANDING_Z1 - LANDING_Z0, asphaltMat,
    0, 0.06, (LANDING_Z0 + LANDING_Z1) / 2, root);
  makeCheckered(LANDING_HALF_W * 2 - 2, 14, 8, 6, 0.08, 0, LANDING_Z0 + 10, root);

  for (let m = 10; m <= 70; m += 10) {
    // marker distance measured from the launch lip (z = rampSeg.z1)
    makeDistanceFlag(root, m, rampSeg.z1 + m, LANDING_HALF_W);
  }

  // gap markers so the pit reads clearly as "nothing here, don't stop"
  makeCone(root, -RAMP_WIDTH / 2 - 1, rampSeg.z1 + 2);
  makeCone(root, RAMP_WIDTH / 2 + 1, rampSeg.z1 + 2);

  makeFloodLight(root, -RAMP_WIDTH / 2 - 3, rampSeg.z0 - 4, 8);
  makeFloodLight(root, RAMP_WIDTH / 2 + 3, rampSeg.z0 - 4, 8);
  makeFloodLight(root, -LANDING_HALF_W - 3, LANDING_Z0 + 20, 9);
  makeFloodLight(root, LANDING_HALF_W + 3, LANDING_Z0 + 20, 9);

  // small scoreboard showing last + best jump
  const scoreGroup = new THREE.Group();
  scoreGroup.position.set(LANDING_HALF_W + 6, 0, LANDING_Z0 + 4);
  root.add(scoreGroup);
  box(4.6, 2.8, 0.25, darkMat, 0, 3, 0, scoreGroup);
  box(0.3, 3, 0.3, metalMat, -2.2, 1.5, 0, scoreGroup);
  box(0.3, 3, 0.3, metalMat,  2.2, 1.5, 0, scoreGroup);
  const scoreCanvas = document.createElement('canvas');
  scoreCanvas.width = 480; scoreCanvas.height = 288;
  const scoreCtx = scoreCanvas.getContext('2d');
  const scoreTex = new THREE.CanvasTexture(scoreCanvas);
  const scorePlane = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.6),
    new THREE.MeshBasicMaterial({ map: scoreTex }));
  scorePlane.position.set(0, 3, 0.14);
  scoreGroup.add(scorePlane);

  let lastDistance = 0;
  let bestDistance = 0;
  function refreshScoreboard() {
    scoreCtx.fillStyle = '#0d1118';
    scoreCtx.fillRect(0, 0, 480, 288);
    scoreCtx.strokeStyle = '#ffaa44';
    scoreCtx.lineWidth = 6;
    scoreCtx.strokeRect(8, 8, 464, 272);
    scoreCtx.fillStyle = '#ffcc66';
    scoreCtx.font = '700 26px "Segoe UI", system-ui, sans-serif';
    scoreCtx.textAlign = 'center';
    scoreCtx.fillText('LAST JUMP', 240, 46);
    scoreCtx.font = '700 60px "Segoe UI", system-ui, sans-serif';
    scoreCtx.fillStyle = '#7dffb0';
    scoreCtx.fillText(lastDistance.toFixed(1) + 'm', 240, 118);
    scoreCtx.font = '700 24px "Segoe UI", system-ui, sans-serif';
    scoreCtx.fillStyle = '#a8c8ff';
    scoreCtx.fillText('BEST', 240, 180);
    scoreCtx.font = '700 44px "Segoe UI", system-ui, sans-serif';
    scoreCtx.fillStyle = '#ffe08a';
    scoreCtx.fillText(bestDistance.toFixed(1) + 'm', 240, 232);
    scoreTex.needsUpdate = true;
  }
  refreshScoreboard();

  // ─────────────────────────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────────────────────────
  const toastEl = document.createElement('div');
  Object.assign(toastEl.style, {
    position: 'fixed', left: '50%', top: '22%', transform: 'translateX(-50%)',
    padding: '10px 22px', background: 'rgba(20,14,10,0.88)', color: '#ffe6ab',
    fontFamily: 'inherit', fontSize: '15px', borderRadius: '10px',
    border: '1px solid rgba(255,200,100,0.45)', opacity: '0', transition: 'opacity 0.3s',
    pointerEvents: 'none', zIndex: '60', textAlign: 'center', maxWidth: '70vw'
  });
  document.body.appendChild(toastEl);
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, 3200);
  }

  // ─────────────────────────────────────────────────────────────────
  // POI
  // ─────────────────────────────────────────────────────────────────
  const poiList = [{
    name: 'Stunt Ramp',
    pos: { x: px, z: pz },
    r: 50,
    flavor: 'One big ramp, one big gap. Hit it fast and see how far you fly.'
  }];

  // ─────────────────────────────────────────────────────────────────
  // GEOMETRY QUERIES USED BY THE BIKE
  // ─────────────────────────────────────────────────────────────────
  function toLocal(pos) {
    return stuntToLocal(pos.x, pos.z, position, rotationY);
  }

  function projectToSegment(lx, lz, seg) {
    const dx = seg.x1 - seg.x0, dz = seg.z1 - seg.z0;
    const lenSq = dx * dx + dz * dz || 1e-6;
    const t = ((lx - seg.x0) * dx + (lz - seg.z0) * dz) / lenSq;
    const tc = Math.max(0, Math.min(1, t));
    const projX = seg.x0 + dx * tc, projZ = seg.z0 + dz * tc;
    const dist = Math.hypot(lx - projX, lz - projZ);
    const len = Math.sqrt(lenSq);
    return { t, tc, dist, dirX: dx / len, dirZ: dz / len };
  }

  // Ground/ramp/landing-field height under the bike (null = arena has no
  // opinion here, e.g. mid-gap — fall back to your normal terrain height).
  function getSurfaceHeight(pos) {
    if (!pos) return null;
    const { lx, lz } = toLocal(pos);
    let surface = null;

    // runway before the ramp
    if (Math.abs(lx) <= RAMP_WIDTH / 2 && lz >= rampSeg.z0 - 14 && lz <= rampSeg.z0) {
      surface = baseY;
    }
    // the ramp itself
    const p = projectToSegment(lx, lz, rampSeg);
    if (p.dist <= rampSeg.halfWidth && p.t >= -0.02 && p.t <= 1.02) {
      const h = baseY + rampSeg.h0 + (rampSeg.h1 - rampSeg.h0) * p.tc;
      if (surface === null || h > surface) surface = h;
    }
    // the flat landing field (ground level)
    if (Math.abs(lx) <= LANDING_HALF_W && lz >= LANDING_Z0 && lz <= LANDING_Z1) {
      if (surface === null) surface = baseY;
    }
    return surface;
  }

  // Fires once per approach when the bike crosses the launch lip fast
  // enough and roughly straight — scaled by the ramp's real angle and
  // the bike's own speed, so a faster hit really does launch you further.
  let lastLaunch = -999;
  let airborne = null; // { startX, startZ, startTime }

  function getJumpImpulse(pos, heading, speed) {
    if (!pos || speed < rampSeg.minSpeed) return 0;
    if (elapsedLocal - lastLaunch < 1.0) return 0;

    const { lx, lz } = toLocal(pos);
    const p = projectToSegment(lx, lz, rampSeg);
    // Trigger at the lip, not halfway up the ramp. This makes entrance speed,
    // line and timing matter instead of producing one repeatable jump length.
    if (p.dist > rampSeg.halfWidth || p.t < 0.90 || p.t > 1.06) return 0;

    const forwardX = Math.sin(heading - rotationY);
    const forwardZ = Math.cos(heading - rotationY);
    const aligned = forwardX * p.dirX + forwardZ * p.dirZ;
    if (aligned < 0.65) return 0;

    const rise = rampSeg.h1 - rampSeg.h0;
    const run = Math.hypot(rampSeg.x1 - rampSeg.x0, rampSeg.z1 - rampSeg.z0);
    const steepness = rise / run;
    const speedSkill = THREE.MathUtils.smoothstep(speed, rampSeg.minSpeed, 28);
    const alignmentSkill = THREE.MathUtils.smoothstep(aligned, 0.65, 1);
    const lipSkill = THREE.MathUtils.smoothstep(p.tc, 0.90, 1);

    lastLaunch = elapsedLocal;
    airborne = { startX: pos.x, startZ: pos.z, startTime: elapsedLocal };

    return 5.7 + steepness * 2.4 + speedSkill * 5.2 + alignmentSkill * 1.15 + lipSkill * 1.25;
  }

  // ─────────────────────────────────────────────────────────────────
  // AIRTIME / LANDING TRACKING — this is what produces the toast.
  // We don't simulate the trajectory ourselves; we watch the bike's own
  // real position each frame while it's above the ground we know about,
  // and measure the straight-line gap once it lands.
  // ─────────────────────────────────────────────────────────────────
  const AIR_CLEARANCE = 0.4; // how far above the known surface counts as "still airborne"

  function trackAirtime(pos, elapsed) {
    if (!airborne) return;
    const surface = getSurfaceHeight(pos);
    const groundY = (surface === null ? baseY : surface);
    const stillUp = pos.y > groundY + AIR_CLEARANCE;

    if (stillUp) return; // keep waiting for landing

    // require a minimum airtime so we don't "land" one frame after launch
    if (elapsed - airborne.startTime < 0.25) return;

    const distance = Math.hypot(pos.x - airborne.startX, pos.z - airborne.startZ);
    airborne = null;
    lastDistance = distance;
    const isBest = distance > bestDistance;
    if (isBest) bestDistance = distance;
    refreshScoreboard();
    showToast(`🚀 ${distance.toFixed(1)}m jump!${isBest ? '  (new best!)' : ''}`);
    onEvent('stuntJump', { distance, best: bestDistance });
  }

  // ─────────────────────────────────────────────────────────────────
  // VISIBILITY + FRAME UPDATE
  // ─────────────────────────────────────────────────────────────────
  let isVisible = false;
  const RENDER_DIST = 180;
  let elapsedLocal = 0;

  function update(dt, elapsed, pos, speed = 0) {
    elapsedLocal = elapsed;
    if (!pos) return;

    const dist = Math.hypot(pos.x - px, pos.z - pz);
    const should = dist < RENDER_DIST;
    if (should !== isVisible) {
      isVisible = should;
      root.visible = isVisible;
    }
    if (!isVisible) return;

    floodLights.forEach(f => {
      f.glow.material.opacity = 0.28 + 0.12 * Math.sin(elapsed * 3.1 + f.seed);
    });

    trackAirtime(pos, elapsed);
  }

  return {
    update,
    getJumpImpulse,
    getSurfaceHeight,
    poiList,
    position: { x: px, z: pz },
    group: root,
    get lastDistance() { return lastDistance; },
    get bestDistance() { return bestDistance; },
    get score() { return bestDistance; },
    resetScore() {
      lastDistance = 0;
      bestDistance = 0;
      airborne = null;
      refreshScoreboard();
    }
  };
}
