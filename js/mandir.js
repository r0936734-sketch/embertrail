// ============================================================================
// mandir.js — "Shree Shree Baba Prasannadas Ji Maharaj 1008" temple campus
// ============================================================================
// A self-contained, drop-in landmark module in the same style as
// house.js / windmill.js / flametower.js / landmarks.js in this project.
// THREE is expected as a global (loaded via <script> tag), exactly like
// every other file in js/ — no import of THREE here.
//
// WHAT THIS BUILDS
//   • A walled temple compound with a big decorated entrance gate.
//     The gate crown carries a Hindi signboard:
//         श्री श्री बाबा प्रसन्नदास जी महाराज 1008
//         खड़ान, चंदौली
//   • Four small shrines inside:
//       - Baba Prasannadas ji Maharaj (main/largest shrine, back-centre)
//       - Hanuman ji (left)
//       - Ganesh ji (right)
//       - An open-air Shivling mandap (centre), the linga is modelled
//         procedurally (no image needed for it).
//   • Two sacred trees, each ringed by a circular "chabutra" platform
//     with a seating wall, wrapped in a red sacred thread.
//   • Dharmik (devotional) Sanskrit/Hindi quote panels mounted on the
//     inner compound walls.
//   • Interactive elements (press E near them, same pattern as
//     house.js / world.js):
//       - the gate bell (rings + toast)
//       - each of the four shrines (darshan → toast with a devotional line)
//       - the Shivling (jal abhishek → toast + linga sheen pulse)
//       - each chabutra (sit under the sacred tree → toast)
//
// IMAGE FILES
//   The three portrait images are referenced by filename only, exactly as
//   requested, and are expected to sit alongside index.html (project root),
//   the same way js/house.js already loads 'download.jpg' / 'me.jpg':
//       hanumanji.jpeg      — Hanuman ji
//       ganeshji.jpeg       — Ganesh ji
//       prashanndasji.jpeg  — Baba Prasannadas ji Maharaj
//   If your actual files are .jpg instead of .jpeg, just edit the three
//   constants right below the imports — nothing else needs to change.
//
// INTEGRATION (add to js/main.js)
//   import { createMandir } from './mandir.js';
//   ...
//   const mandir = createMandir(scene, terrain.terrainHeight, collision, {
//     position: { x: 260, z: -260 },   // pick any open spot on your map
//     rotationY: 0,
//     getAudioCtx: () => audio.audioCtx,
//     onEvent: (type, data) => quests.handleEvent(type, data)
//   });
//   // add mandir.poiList to your discoverable-places array:
//   //   [...landmarks.poiList, ...mandir.poiList, ...]
//   // inside the 'e' key handling block, alongside house/world:
//   //   else if (mandir.tryInteract(player)) { keys['e'] = false; }
//   // inside animate():
//   //   mandir.update(dt, elapsed, player.group.position);
// ============================================================================

// Resolve from this module rather than the browser's current page. This works
// both from the project root and Capacitor's generated www/ directory.
const assetUrl = file => new URL(`../${file}`, import.meta.url).href;
const IMG_HANUMAN     = assetUrl('hanumanji.jpg');
const IMG_GANESH      = assetUrl('ganeshji.jpg');
const IMG_PRASANNADAS = assetUrl('prashanndasji.jpg');

// A broad, flat site inside the mountain ring, away from the cabin, ruins,
// Skywatch, and Farshot. The old south-east site sat among near mountains.
export const MANDIR_ORIGIN = { x: 160, z: -160 };

export function mandirFootprintT(x, z) {
  const dx = Math.abs(x - MANDIR_ORIGIN.x);
  const dz = Math.abs(z - MANDIR_ORIGIN.z);
  // Include a generous apron around the compound so all of its walls, gate,
  // sacred trees, and approach stand on one level plaza.
  const tx = 1 - Math.min(1, Math.max(0, (dx - 24) / 12));
  const tz = 1 - Math.min(1, Math.max(0, (dz - 23) / 12));
  return tx * tz;
}

export function createMandir(scene, terrainHeight, collision, options = {}) {
  const position   = options.position   || MANDIR_ORIGIN;
  const rotationY  = options.rotationY  ?? 0;
  const getAudioCtx = options.getAudioCtx || (() => null);
  const onEvent     = options.onEvent     || (() => {});

  const px = position.x;
  const pz = position.z;
  const baseY = terrainHeight(px, pz);

  const root = new THREE.Group();
  root.position.set(px, baseY, pz);
  root.rotation.y = rotationY;
  scene.add(root);

  // ---------- shared materials ----------
  const wallMat      = new THREE.MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.92, flatShading: true });
  const wallTrimMat  = new THREE.MeshStandardMaterial({ color: 0x8a2418, roughness: 0.85, flatShading: true });
  const pillarMat    = new THREE.MeshStandardMaterial({ color: 0xdfc088, roughness: 0.85, flatShading: true });
  const roofMat      = new THREE.MeshStandardMaterial({ color: 0xd9762c, roughness: 0.8, flatShading: true });
  const shikharaMat  = new THREE.MeshStandardMaterial({ color: 0xf6ecd8, roughness: 0.82, flatShading: true });
  const goldMat      = new THREE.MeshStandardMaterial({ color: 0xe8b23c, roughness: 0.32, metalness: 0.65, flatShading: true });
  const plazaMat     = new THREE.MeshStandardMaterial({ color: 0xbcae90, roughness: 1, flatShading: true });
  const plazaEdgeMat = new THREE.MeshStandardMaterial({ color: 0x8a7452, roughness: 1, flatShading: true });
  const trunkMat     = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 1, flatShading: true });
  const leafMatA     = new THREE.MeshStandardMaterial({ color: 0x3f6b2c, roughness: 0.9, flatShading: true });
  const leafMatB     = new THREE.MeshStandardMaterial({ color: 0x557a3a, roughness: 0.9, flatShading: true });
  const threadMat    = new THREE.MeshStandardMaterial({ color: 0xb5342a, roughness: 0.6, flatShading: true });
  const flagMat      = new THREE.MeshStandardMaterial({ color: 0xe8642c, roughness: 0.7, side: THREE.DoubleSide, flatShading: true });
  const lingaMat     = new THREE.MeshStandardMaterial({ color: 0x17151a, roughness: 0.28, metalness: 0.35, flatShading: false });
  const yoniMat      = new THREE.MeshStandardMaterial({ color: 0x8a8072, roughness: 0.85, flatShading: true });
  const naagMat      = new THREE.MeshStandardMaterial({ color: 0x2e5a2e, roughness: 0.6, flatShading: true });
  const bellMat      = new THREE.MeshStandardMaterial({ color: 0xd6ac4c, roughness: 0.35, metalness: 0.7, flatShading: true });
  const flameMat     = new THREE.MeshBasicMaterial({ color: 0xffa84a, transparent: true, opacity: 0.92 });
  const stepMat      = new THREE.MeshStandardMaterial({ color: 0xcbb996, roughness: 1, flatShading: true });

  // ---------- canvas text-panel helper (renders Devanagari via canvas) ----------
  function makeTextPanel(lines, opts = {}) {
    const width   = opts.width  ?? 6;
    const height  = opts.height ?? 1.7;
    const bg      = opts.bg     ?? '#7a2413';
    const fg      = opts.fg     ?? '#ffe6ab';
    const accent  = opts.accent ?? '#ffcf80';
    const pxW     = opts.pxW    ?? 1024;
    const pxH     = Math.round(pxW * (height / width));
    const fontMain = opts.fontMain ?? Math.round(pxH * 0.30);
    const fontSub  = opts.fontSub  ?? Math.round(pxH * 0.17);

    const canvas = document.createElement('canvas');
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, pxW, pxH);
    const bw = Math.max(4, Math.round(pxW * 0.012));
    ctx.strokeStyle = accent;
    ctx.lineWidth = bw;
    ctx.strokeRect(bw / 2, bw / 2, pxW - bw, pxH - bw);
    ctx.strokeRect(bw * 1.8, bw * 1.8, pxW - bw * 3.6, pxH - bw * 3.6);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxTextWidth = pxW * 0.84;
    const makeFont = (size, primary) =>
      `${primary ? '700 ' : '600 '}${size}px "Noto Sans Devanagari","Mangal","Nirmala UI","Arial Unicode MS",sans-serif`;
    // Long Devanagari names used to overflow their canvas and be visibly cut
    // off. Measure every row and reduce only that row until it fits.
    const rows = lines.map((line, i) => {
      let size = i === 0 ? fontMain : fontSub;
      const primary = i === 0;
      ctx.font = makeFont(size, primary);
      while (ctx.measureText(line).width > maxTextWidth && size > 18) {
        size -= 2;
        ctx.font = makeFont(size, primary);
      }
      return { line, size, primary, lineH: size * (primary ? 1.3 : 1.42) };
    });
    const totalH = rows.reduce((sum, row) => sum + row.lineH, 0);
    let y = pxH / 2 - totalH / 2 + rows[0].lineH / 2;
    rows.forEach(row => {
      ctx.font = makeFont(row.size, row.primary);
      ctx.fillStyle = row.primary ? fg : accent;
      ctx.fillText(row.line, pxW / 2, y);
      y += row.lineH;
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  }

  // ---------- framed idol-photo helper ----------
  const photoLoader = new THREE.TextureLoader();
  function makeIdolFrame(src, w, h) {
    const g = new THREE.Group();
    const photoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false });
    const tex = photoLoader.load(
      src,
      loaded => {
        if ('colorSpace' in loaded && THREE.SRGBColorSpace) loaded.colorSpace = THREE.SRGBColorSpace;
        else if ('encoding' in loaded) loaded.encoding = THREE.sRGBEncoding;
        photoMat.map = loaded;
        photoMat.needsUpdate = true;
      },
      undefined,
      () => {
        // Preserve a visible framed panel if an install is missing an asset.
        photoMat.color.setHex(0x8a2418);
        console.warn(`Mandir portrait could not load: ${src}`);
      }
    );
    // TextureLoader completes synchronously only from cache; apply color-space
    // here as well for that case.
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    else if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
    const photo = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      photoMat
    );
    photo.position.z = 0.03;
    g.add(photo);
    const addB = (bw, bh, x, y) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.09), goldMat);
      b.position.set(x, y, 0.01);
      g.add(b);
    };
    addB(w + 0.3, 0.15, 0, h / 2 + 0.08);
    addB(w + 0.3, 0.15, 0, -h / 2 - 0.08);
    addB(0.15, h + 0.3, -w / 2 - 0.08, 0);
    addB(0.15, h + 0.3, w / 2 + 0.08, 0);
    return g;
  }

  // ---------- diya (oil lamp) helper ----------
  const diyas = [];
  function makeDiya(x, y, z, parent) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.06, 8), goldMat);
    g.add(saucer);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 6), flameMat);
    flame.position.y = 0.12;
    g.add(flame);
    const light = new THREE.PointLight(0xffb15a, 0.55, 3.2, 2);
    light.position.y = 0.16;
    g.add(light);
    parent.add(g);
    const entry = { flame, light, seed: Math.random() * Math.PI * 2, boost: 0 };
    diyas.push(entry);
    return entry;
  }

  // ---------- bell helper ----------
  const bells = [];
  function makeBell(scale, parent, localPos) {
    const pivot = new THREE.Group();
    pivot.position.copy(localPos);
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 5), bellMat);
    hook.position.y = 0.07;
    pivot.add(hook);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), bellMat);
    body.position.y = -0.02;
    pivot.add(body);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.02, 6, 12), bellMat);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = -0.12;
    pivot.add(lip);
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), bellMat);
    clapper.position.y = -0.24;
    pivot.add(clapper);
    pivot.scale.setScalar(scale);
    parent.add(pivot);
    const entry = { pivot, swing: 0 };
    bells.push(entry);
    return entry;
  }

  function ringBell(bell) {
    bell.swing = 1;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [520, 780].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.86, now + 1.4);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(i === 0 ? 0.16 : 0.09, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.65);
    });
  }

  // ---------- flag (dhwaja) helper ----------
  const flags = [];
  function makeFlag(parent, x, y, z, h = 1.0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, h, 5), goldMat);
    pole.position.y = h / 2;
    g.add(pole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26), flagMat);
    cloth.position.set(0.22, h - 0.16, 0);
    g.add(cloth);
    parent.add(g);
    flags.push({ cloth, seed: Math.random() * Math.PI * 2 });
    return g;
  }

  // ---------- shikhara (temple tower) helper ----------
  function makeShikhara(parent, baseW, baseTop, levels, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    let w = baseW;
    let cy = 0;
    for (let i = 0; i < levels; i++) {
      const h = baseTop * (1 - i * 0.12);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.9, w, h, 4), shikharaMat);
      seg.rotation.y = Math.PI / 4;
      seg.position.y = cy + h / 2;
      g.add(seg);
      cy += h * 0.86;
      w *= 0.74;
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(w * 1.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), goldMat);
    dome.position.y = cy;
    g.add(dome);
    const kalash = new THREE.Mesh(new THREE.SphereGeometry(w * 0.6, 8, 6), goldMat);
    kalash.position.y = cy + w * 0.7;
    g.add(kalash);
    makeFlag(g, 0, cy + w * 1.1, 0, 0.9);
    parent.add(g);
    return g;
  }

  // ---------- interactive registry ----------
  const interactables = [];
  function addInteractable(lx, lz, r, label, action) {
    interactables.push({ lx, lz, r, label, action, worldPos: new THREE.Vector3() });
  }

  // ============================================================
  // COMPOUND DIMENSIONS
  // ============================================================
  const HW = 17;      // half-width  (x)
  const HD = 16;       // half-depth (z) — gate is on the +z (south) side
  const WALL_H = 2.6;
  const WALL_T = 0.45;
  const GATE_W = 6.4;

  // ---------- courtyard plaza ----------
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 - 0.6, 0.22, HD * 2 - 0.6), plazaMat);
  plaza.position.set(0, 0.1, 0);
  root.add(plaza);
  const plazaEdge = new THREE.Mesh(
    new THREE.RingGeometry(Math.min(HW, HD) * 1.02, Math.min(HW, HD) * 1.1, 4, 1),
    plazaEdgeMat
  );
  plazaEdge.rotation.x = -Math.PI / 2;
  plazaEdge.position.y = 0.21;
  plazaEdge.visible = false; // decorative ring omitted (kept cheap); square plaza above reads fine
  root.add(plazaEdge);

  // ============================================================
  // BOUNDARY WALLS + CORNER PILLARS
  // ============================================================
  function addWallBox(cx, cz, halfW, halfD) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, WALL_H, halfD * 2), wallMat);
    wall.position.set(cx, WALL_H / 2, cz);
    root.add(wall);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.1, 0.16, halfD * 2 + 0.1), wallTrimMat);
    cap.position.set(cx, WALL_H + 0.08, cz);
    root.add(cap);
    if (collision && rotationY === 0) {
      collision.addBox(px + cx, pz + cz, halfW, halfD);
    }
  }
  // north wall (back)
  addWallBox(0, -HD, HW, WALL_T);
  // east / west walls
  addWallBox(HW, 0, WALL_T, HD);
  addWallBox(-HW, 0, WALL_T, HD);
  // south wall, split around the gate gap
  const southSpan = (HW - GATE_W / 2);
  addWallBox(-(GATE_W / 2 + southSpan / 2), HD, southSpan / 2, WALL_T);
  addWallBox((GATE_W / 2 + southSpan / 2), HD, southSpan / 2, WALL_T);

  function makeCornerPillar(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, WALL_H + 0.8, 8), pillarMat);
    shaft.position.y = (WALL_H + 0.8) / 2;
    g.add(shaft);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.46, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), goldMat);
    dome.position.y = WALL_H + 0.8;
    g.add(dome);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), goldMat);
    finial.position.y = WALL_H + 1.15;
    g.add(finial);
    root.add(g);
    if (collision && rotationY === 0) collision.addCollider(px + x, pz + z, 0.5);
  }
  [[-HW, -HD], [HW, -HD], [-HW, HD], [HW, HD]].forEach(([x, z]) => makeCornerPillar(x, z));

  // ============================================================
  // GATE (south wall centre)
  // ============================================================
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0, HD);
  root.add(gateGroup);

  const GATE_PILLAR_H = 5.6;
  [-GATE_W / 2, GATE_W / 2].forEach(gx => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, GATE_PILLAR_H, 0.9), pillarMat);
    pillar.position.set(gx, GATE_PILLAR_H / 2, 0);
    gateGroup.add(pillar);
    for (let b = 0; b < 3; b++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.14, 1.02), wallTrimMat);
      band.position.set(gx, 1.2 + b * 1.6, 0);
      gateGroup.add(band);
    }
    // small chatri (dome pavilion) atop each gate pillar
    const chatriBase = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.14, 8), goldMat);
    chatriBase.position.set(gx, GATE_PILLAR_H + 0.1, 0);
    gateGroup.add(chatriBase);
    const chatriDome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), shikharaMat);
    chatriDome.position.set(gx, GATE_PILLAR_H + 0.2, 0);
    gateGroup.add(chatriDome);
    const chatriFinial = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), goldMat);
    chatriFinial.position.set(gx, GATE_PILLAR_H + 0.78, 0);
    gateGroup.add(chatriFinial);
    // ॐ medallion on each pillar
    const om = makeTextPanel(['ॐ'], { width: 0.7, height: 0.7, bg: '#8a2418', fg: '#ffe6ab', accent: '#ffcf80', fontMain: 210, pxW: 256 });
    om.position.set(gx, 2.6, 0.47);
    gateGroup.add(om);
  });

  // lintel / arch beam
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(GATE_W + 1.1, 0.55, 0.95), wallTrimMat);
  lintel.position.set(0, GATE_PILLAR_H, 0);
  gateGroup.add(lintel);
  const lintelGold = new THREE.Mesh(new THREE.BoxGeometry(GATE_W + 1.1, 0.1, 1.0), goldMat);
  lintelGold.position.set(0, GATE_PILLAR_H + 0.3, 0);
  gateGroup.add(lintelGold);

  // crown above the lintel (holds the Hindi signboard)
  const crown = new THREE.Mesh(new THREE.BoxGeometry(GATE_W - 0.4, 1.2, 0.75), pillarMat);
  crown.position.set(0, GATE_PILLAR_H + 0.95, 0);
  gateGroup.add(crown);
  // small decorative shikhara over the gate crown
  makeShikhara(gateGroup, 0.9, 0.9, 3, 0, GATE_PILLAR_H + 1.55, 0);

  // ── the requested Hindi heading, mounted on the gate's upper wall ──
  const signMain = makeTextPanel(
    ['श्री श्री बाबा प्रसन्नदास जी महाराज 1008', 'खड़ान, चंदौली'],
    { width: 7.4, height: 2.0, bg: '#8a2418', fg: '#ffe6ab', accent: '#ffcf80', pxW: 1400, fontMain: 118, fontSub: 74 }
  );
  signMain.position.set(0, GATE_PILLAR_H + 0.95, 0.39);
  gateGroup.add(signMain);
  const signMainBack = signMain.clone();
  signMainBack.position.z = -0.39;
  signMainBack.rotation.y = Math.PI;
  gateGroup.add(signMainBack);

  // gate bell, hung under the lintel
  const gateBell = makeBell(1.5, gateGroup, new THREE.Vector3(0, GATE_PILLAR_H - 0.35, 0));

  // marigold garland strung across the gate opening
  const garlandMat = new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.7, flatShading: true });
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const bx = THREE.MathUtils.lerp(-GATE_W / 2 + 0.3, GATE_W / 2 - 0.3, t);
    const sag = Math.sin(t * Math.PI) * 0.5;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), garlandMat);
    bead.position.set(bx, GATE_PILLAR_H - 0.55 - sag, 0.42);
    gateGroup.add(bead);
  }

  // gate steps (leading in from outside, +z)
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(GATE_W + 0.6, 0.16, 0.5), stepMat);
    step.position.set(0, 0.08 + i * 0.16, 0.9 + i * 0.45);
    gateGroup.add(step);
  }

  addInteractable(0, HD - 1.6, 3.2, '🔔 Press E to ring the temple bell', () => {
    ringBell(gateBell);
    showToast('🔔 The temple bell rings out across Khadaan, Chandauli.');
    onEvent('mandirBell', {});
  });

  // ============================================================
  // DHARMIK QUOTE PANELS on inner compound walls
  // ============================================================
  const quotes = [
    ['सत्यमेव जयते', 'Truth alone triumphs'],
    ['वसुधैव कुटुम्बकम्', 'The whole world is one family'],
    ['अहिंसा परमो धर्मः', 'Non-violence is the highest duty'],
    ['सर्वे भवन्तु सुखिनः', 'May all beings be happy']
  ];
  const quotePositions = [
    { x: -HW + 0.5, z: -6, ry: Math.PI / 2 },
    { x: -HW + 0.5, z: 8, ry: Math.PI / 2 },
    { x: HW - 0.5, z: -6, ry: -Math.PI / 2 },
    { x: HW - 0.5, z: 8, ry: -Math.PI / 2 }
  ];
  quotePositions.forEach((pos, i) => {
    const panel = makeTextPanel(quotes[i], {
      width: 3.2, height: 1.5, bg: '#3a2a1c', fg: '#ffe6ab', accent: '#d9b06a',
      pxW: 800, fontMain: 130, fontSub: 62
    });
    panel.position.set(pos.x, 1.7, pos.z);
    panel.rotation.y = pos.ry;
    root.add(panel);
  });
  // one more quote panel on the back (north) wall, facing the courtyard
  const backQuote = makeTextPanel(
    ['श्रद्धावान् लभते ज्ञानम्', 'The faithful attain wisdom'],
    { width: 4.4, height: 1.5, bg: '#3a2a1c', fg: '#ffe6ab', accent: '#d9b06a', pxW: 1000, fontMain: 110, fontSub: 58 }
  );
  backQuote.position.set(0, 1.7, -HD + 0.5);
  root.add(backQuote);

  // ============================================================
  // SHRINE BUILDER
  // ============================================================
  function buildShrine(lx, lz, opts) {
    const { w, d, wallH, levels, image, kind, name, quoteLines } = opts;
    const g = new THREE.Group();
    g.position.set(lx, 0, lz);
    root.add(g);

    // plinth + steps (front side is +z, toward the courtyard/gate)
    const plinthH = 0.4;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, plinthH, d + 0.5), stepMat);
    plinth.position.y = plinthH / 2;
    g.add(plinth);
    for (let i = 0; i < 2; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5 - i * 0.3, 0.14, 0.5), stepMat);
      step.position.set(0, 0.07 + i * 0.14, d / 2 + 0.4 - i * 0.35);
      g.add(step);
    }

    const wallTop = plinthH + wallH;
    const open = kind === 'shivling'; // shivling mandap has no side walls, only pillars

    if (!open) {
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, WALL_T), wallMat);
      back.position.set(0, plinthH + wallH / 2, -d / 2);
      g.add(back);
      const left = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, wallH, d), wallMat);
      left.position.set(-w / 2, plinthH + wallH / 2, 0);
      g.add(left);
      const right = left.clone();
      right.position.x = w / 2;
      g.add(right);
    }

    // front pillars
    [-w / 2 + 0.3, w / 2 - 0.3].forEach(fx => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, wallH, 8), pillarMat);
      pillar.position.set(fx, plinthH + wallH / 2, d / 2 - 0.3);
      g.add(pillar);
    });
    if (open) {
      // shivling mandap: also needs rear pillars since there are no walls
      [-w / 2 + 0.3, w / 2 - 0.3].forEach(fx => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, wallH, 8), pillarMat);
        pillar.position.set(fx, plinthH + wallH / 2, -d / 2 + 0.3);
        g.add(pillar);
      });
    }

    // roof slab
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.22, d + 0.3), roofMat);
    roof.position.set(0, wallTop + 0.11, 0);
    g.add(roof);

    // shikhara tower
    makeShikhara(g, Math.min(w, d) * 0.42, 0.7, levels, 0, wallTop + 0.22, open ? 0 : -d * 0.15);

    // garland across the front opening
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const bx = THREE.MathUtils.lerp(-w / 2 + 0.35, w / 2 - 0.35, t);
      const sag = Math.sin(t * Math.PI) * 0.28;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), garlandMat);
      bead.position.set(bx, wallTop - 0.25 - sag, d / 2 - 0.28);
      g.add(bead);
    }

    // idol
    if (kind === 'photo') {
      const idol = makeIdolFrame(image, Math.min(w, d) * 0.62, wallH * 0.6);
      // The inner surface of the back wall is at -d/2 + WALL_T/2. The old
      // 0.09 offset embedded the picture inside the wall, hiding every idol.
      idol.position.set(0, plinthH + wallH * 0.55, -d / 2 + WALL_T / 2 + 0.035);
      g.add(idol);
      makeDiya(-w * 0.26, plinthH + 0.06, d * 0.1, g);
      makeDiya(w * 0.26, plinthH + 0.06, d * 0.1, g);
    } else {
      // procedurally modelled Shivling on a central altar
      const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.3, 10), stepMat);
      altar.position.y = plinthH + 0.15;
      g.add(altar);
      const yoni = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.34, 1.1), yoniMat);
      yoni.position.y = plinthH + 0.32 + 0.17;
      g.add(yoni);
      const spout = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.5), yoniMat);
      spout.position.set(0, plinthH + 0.32 + 0.08, 0.75);
      g.add(spout);
      const linga = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.62, 12), lingaMat);
      linga.position.y = plinthH + 0.32 + 0.34 + 0.31;
      g.add(linga);
      const lingaTop = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), lingaMat);
      lingaTop.position.y = plinthH + 0.32 + 0.34 + 0.62;
      g.add(lingaTop);
      // small naag (serpent) coiled near the base, a common Shivling motif
      const naag = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 6, 16, Math.PI * 1.5), naagMat);
      naag.rotation.x = Math.PI / 2;
      naag.position.y = plinthH + 0.32 + 0.4;
      g.add(naag);
      // suspended kalash for jal-abhishek (a continuous water offering)
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, wallH * 0.62, 5), goldMat);
      chain.position.set(0, wallTop - wallH * 0.31, 0);
      g.add(chain);
      const kalashPot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), goldMat);
      kalashPot.position.set(0, wallTop - wallH * 0.62 + 0.05, 0);
      g.add(kalashPot);
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.85 })
      );
      drop.position.set(0, wallTop - wallH * 0.62 - 0.05, 0);
      g.add(drop);
      g.userData.linga = linga;
      g.userData.lingaTop = lingaTop;
      g.userData.drop = drop;
      g.userData.dropTop = wallTop - wallH * 0.62 - 0.05;
      g.userData.dropBottom = plinthH + 0.32 + 0.34 + 0.62 + 0.05;
      makeDiya(-0.7, plinthH + 0.32 + 0.34, 0.55, g);
      makeDiya(0.7, plinthH + 0.32 + 0.34, 0.55, g);
    }

    // bell inside the shrine, front-centre
    const bell = makeBell(1.0, g, new THREE.Vector3(0, wallTop - 0.15, d / 2 - 0.15));

    // small name plaque at the base
    const plaque = makeTextPanel([name], {
      width: Math.min(w, 3.4), height: 0.55, bg: '#3a2a1c', fg: '#ffe6ab', accent: '#d9b06a',
      pxW: 700, fontMain: 150
    });
    plaque.position.set(0, plinthH + 0.32, d / 2 + 0.42);
    g.add(plaque);

    if (collision && rotationY === 0) {
      collision.addBox(px + lx, pz + lz, w / 2 + 0.3, d / 2 + 0.3);
    }

    return { group: g, bell };
  }

  // ---------- the four shrines ----------
  const shrinePrasannadas = buildShrine(0, -9.2, {
    w: 6.2, d: 5.2, wallH: 3.2, levels: 5, kind: 'photo',
    image: IMG_PRASANNADAS, name: 'श्री बाबा प्रसन्नदास जी'
  });
  const shrineHanuman = buildShrine(-9.4, -3, {
    w: 4.4, d: 3.8, wallH: 2.6, levels: 4, kind: 'photo',
    image: IMG_HANUMAN, name: 'श्री हनुमान जी'
  });
  const shrineGanesh = buildShrine(9.4, -3, {
    w: 4.4, d: 3.8, wallH: 2.6, levels: 4, kind: 'photo',
    image: IMG_GANESH, name: 'श्री गणेश जी'
  });
  const shrineShiv = buildShrine(0, 2.4, {
    w: 4.6, d: 4.6, wallH: 2.4, levels: 3, kind: 'shivling',
    name: 'श्री शिवलिंग'
  });

  // small parikrama (circumambulation) markers ringing the Shivling mandap
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), stepMat);
    stone.position.set(2.4 * Math.cos(a), 0.3, 2.4 + 2.4 * Math.sin(a));
    root.add(stone);
  }

  const darshanLines = {
    prasannadas: [
      '🙏 आप श्री बाबा प्रसन्नदास जी महाराज के दर्शन करते हैं।',
      'जहाँ श्रद्धा है, वहीं कृपा है — बाबा प्रसन्नदास जी।'
    ],
    hanuman: [
      '🙏 बुद्धिर्बलं यशोधैर्यं निर्भयत्वमरोगता — हनुमान जी की कृपा।',
      'जय हनुमान ज्ञान गुण सागर — संकट मोचन।'
    ],
    ganesh: [
      '🙏 वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ — गणपति बप्पा मोरया!',
      'हर शुभ कार्य का आरंभ श्री गणेश से।'
    ]
  };
  let darshanIdx = { prasannadas: 0, hanuman: 0, ganesh: 0 };

  function darshan(key, diyaGroup) {
    const lines = darshanLines[key];
    const line = lines[darshanIdx[key] % lines.length];
    darshanIdx[key]++;
    showToast(line);
    diyas.forEach(d => { if (diyaGroup.userData.__mine && diyaGroup.userData.__mine.includes(d)) d.boost = 1; });
    onEvent('mandirDarshan', { deity: key });
  }

  addInteractable(0, -9.2 + 2.9, 4.6, '🙏 Press E for darshan of Baba Prasannadas ji Maharaj', () => {
    darshan('prasannadas', shrinePrasannadas.group);
    ringBell(shrinePrasannadas.bell);
  });
  addInteractable(-9.4, -3 + 2.1, 4.0, '🙏 Press E for darshan of Hanuman ji', () => {
    darshan('hanuman', shrineHanuman.group);
    ringBell(shrineHanuman.bell);
  });
  addInteractable(9.4, -3 + 2.1, 4.0, '🙏 Press E for darshan of Ganesh ji', () => {
    darshan('ganesh', shrineGanesh.group);
    ringBell(shrineGanesh.bell);
  });
  addInteractable(0, 2.4, 4.2, '💧 Press E to offer jal (water) to the Shivling', () => {
    showToast('🕉️ ॐ नमः शिवाय — जल अभिषेक अर्पित किया गया।');
    shrineShiv.group.userData.__shine = 1;
    ringBell(shrineShiv.bell);
    onEvent('mandirDarshan', { deity: 'shiva' });
  });

  // ============================================================
  // SACRED TREES + CHABUTRA
  // ============================================================
  const sacredLeafGeo = new THREE.IcosahedronGeometry(1, 0);
  function buildTree(lx, lz, { banyan = false } = {}) {
    const g = new THREE.Group();
    g.position.set(lx, 0, lz);
    root.add(g);

    const platformRadius = banyan ? 3.65 : 2.9;
    const trunkHeight = banyan ? 6.6 : 4.4;

    // circular chabutra platform
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(platformRadius, platformRadius + 0.2, 0.4, 16), stepMat);
    platform.position.y = 0.2;
    g.add(platform);
    const seatWall = new THREE.Mesh(new THREE.TorusGeometry(platformRadius - 0.35, 0.16, 6, 20), pillarMat);
    seatWall.rotation.x = Math.PI / 2;
    seatWall.position.y = 0.55;
    g.add(seatWall);

    // trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(banyan ? 0.46 : 0.34, banyan ? 0.68 : 0.5, trunkHeight, 7), trunkMat);
    trunk.position.y = 0.4 + trunkHeight / 2;
    g.add(trunk);

    // A bargad has several supporting trunks and exposed roots; these static
    // low-poly forms make it feel old and broad without an animated system.
    if (banyan) {
      const supportOffsets = [[-1.15, 0.35], [1.05, 0.55], [-0.55, -1.05], [0.75, -0.95]];
      supportOffsets.forEach(([x, z], i) => {
        const support = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, 3.1 + (i % 2) * 0.45, 6), trunkMat);
        support.position.set(x, 1.75, z);
        support.rotation.z = x * -0.13;
        g.add(support);
        const rootArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 1.55, 5), trunkMat);
        rootArm.position.set(x * 0.62, 0.6, z * 0.62);
        rootArm.rotation.z = Math.PI / 2 - 0.18;
        rootArm.rotation.y = Math.atan2(z, x);
        g.add(rootArm);
      });
    }

    // sacred red thread wound around the trunk
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.03, 5, 10), threadMat);
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      ring.rotation.z = i * 0.5;
      ring.position.y = 0.9 + i * 0.55;
      g.add(ring);
    }

    // canopy
    const canopyY = 0.4 + trunkHeight;
    const canopyCount = banyan ? 18 : 9;
    const canopyRadius = banyan ? 3.25 : 1.6;
    for (let i = 0; i < canopyCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * canopyRadius;
      const leaf = new THREE.Mesh(
        sacredLeafGeo,
        Math.random() > 0.5 ? leafMatA : leafMatB
      );
      leaf.position.set(Math.cos(a) * r, canopyY + Math.random() * (banyan ? 1.8 : 1.3), Math.sin(a) * r);
      leaf.scale.setScalar((banyan ? 1.15 : 0.8) + Math.random() * (banyan ? 0.7 : 0.4));
      g.add(leaf);
    }
    // a couple of hanging aerial roots (banyan/peepal character)
    (banyan ? [-1.5, -0.8, 0.55, 1.35] : [0.6, -0.5]).forEach(ox => {
      const root2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.6, 5), trunkMat);
      root2.position.set(ox, canopyY - (banyan ? 2.3 : 1.2), 0.3);
      g.add(root2);
    });

    // Small static offerings add life to the chabutra while staying cheap.
    [-0.8, 0, 0.8].forEach((x, i) => {
      const offering = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.1, 8), i === 1 ? goldMat : wallTrimMat);
      offering.position.set(x, 0.52, platformRadius - 0.72);
      g.add(offering);
    });

    if (collision && rotationY === 0) collision.addCollider(px + lx, pz + lz, banyan ? 1.05 : 0.55);

    addInteractable(lx, lz, 3.2, '🌳 Press E to sit at the chabutra under the sacred tree', () => {
      const lines = [
        'जैसे वृक्ष सबको छाया देता है, वैसे ही परोपकार ही सच्चा धर्म है।',
        'शांत मन ही सबसे बड़ा तीर्थ है — यहीं बैठकर कुछ पल विश्राम करें।'
      ];
      showToast('🌿 ' + lines[Math.floor(Math.random() * lines.length)]);
      onEvent('mandirRest', {});
    });

    return g;
  }
  buildTree(-11, 7.5, { banyan: true });
  buildTree(13, 8);

  // ============================================================
  // interaction UI (prompt + toast), same visual language as the
  // rest of the project's context prompts
  // ============================================================
  const promptEl = document.createElement('div');
  Object.assign(promptEl.style, {
    position: 'fixed', left: '50%', bottom: '18%', transform: 'translateX(-50%)',
    padding: '9px 18px', background: 'rgba(40,20,12,0.78)', color: '#ffe6ab',
    fontFamily: 'inherit', fontSize: '14px', borderRadius: '10px',
    border: '1px solid rgba(255,207,128,0.4)', opacity: '0', transition: 'opacity 0.22s',
    pointerEvents: 'none', zIndex: '50', textAlign: 'center', whiteSpace: 'pre-line'
  });
  promptEl.classList.add('context-prompt');
  promptEl.dataset.mobileKey = 'e';
  document.body.appendChild(promptEl);

  const toastEl = document.createElement('div');
  Object.assign(toastEl.style, {
    position: 'fixed', left: '50%', top: '20%', transform: 'translateX(-50%)',
    padding: '10px 20px', background: 'rgba(40,20,12,0.9)', color: '#ffe6ab',
    fontFamily: 'inherit', fontSize: '15px', borderRadius: '10px',
    border: '1px solid rgba(255,207,128,0.45)', opacity: '0', transition: 'opacity 0.35s',
    pointerEvents: 'none', zIndex: '60', maxWidth: '72vw', textAlign: 'center'
  });
  document.body.appendChild(toastEl);
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, 3600);
  }

  // ---------- resolve interactable world positions once ----------
  root.updateMatrixWorld(true);
  const _v = new THREE.Vector3();
  interactables.forEach(it => {
    _v.set(it.lx, 0, it.lz);
    root.localToWorld(_v);
    it.worldPos.copy(_v);
  });

  let nearest = null;

  const poiList = [{
    name: 'Shree Baba Prasannadas Ji Mandir',
    pos: { x: px, z: pz },
    r: Math.max(HW, HD) + 8,
    flavor: 'A walled temple campus at Khadaan, Chandauli — shrines for Baba Prasannadas ji Maharaj, Hanuman ji, Ganesh ji, and a Shivling, shaded by two sacred trees.'
  }];

  // ============================================================
  // update
  // ============================================================
  function update(dt, elapsed, playerPos) {
    // diya flicker
    diyas.forEach(d => {
      const boost = d.boost > 0 ? (d.boost -= dt * 0.6, Math.max(0, d.boost)) : 0;
      const flicker = 0.85 + 0.15 * Math.sin(elapsed * 9 + d.seed) + boost * 0.4;
      d.flame.scale.setScalar(Math.max(0.4, flicker));
      d.light.intensity = 0.5 * flicker + boost * 0.8;
    });

    // bell swing decay
    bells.forEach(b => {
      if (b.swing > 0.001) {
        b.swing *= 0.92;
        b.pivot.rotation.z = Math.sin(elapsed * 14) * b.swing * 0.4;
      } else {
        b.pivot.rotation.z = 0;
      }
    });

    // flags sway
    flags.forEach(f => {
      f.cloth.rotation.y = Math.sin(elapsed * 2.2 + f.seed) * 0.35;
    });

    // shivling jal-abhishek drip + shine pulse
    const shiv = shrineShiv.group.userData;
    if (shiv.drop) {
      const t = (elapsed * 0.6) % 1;
      shiv.drop.position.y = THREE.MathUtils.lerp(shiv.dropTop, shiv.dropBottom, t);
      shiv.drop.material.opacity = t < 0.9 ? 0.85 : 0.85 * (1 - (t - 0.9) * 10);
    }
    if (shiv.__shine) {
      shiv.__shine = Math.max(0, shiv.__shine - dt * 0.5);
      const s = 0.28 + shiv.__shine * 0.5;
      shiv.linga.material.roughness = Math.max(0.05, 0.28 - shiv.__shine * 0.2);
      shiv.lingaTop.material.roughness = shiv.linga.material.roughness;
    }

    // find nearest interactable
    let best = null;
    let bestD = Infinity;
    for (const it of interactables) {
      const d = Math.hypot(playerPos.x - it.worldPos.x, playerPos.z - it.worldPos.z);
      if (d < it.r && d < bestD) { bestD = d; best = it; }
    }
    nearest = best;
    if (nearest) {
      promptEl.textContent = nearest.label;
      promptEl.style.opacity = '1';
    } else {
      promptEl.style.opacity = '0';
    }
  }

  function tryInteract() {
    if (!nearest) return false;
    nearest.action();
    return true;
  }

  return {
    update,
    tryInteract,
    poiList,
    position: { x: px, z: pz },
    group: root
  };
}
