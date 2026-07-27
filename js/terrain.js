export function createTerrain(scene) {

  // ---------- multi-octave, domain-warped pseudo noise ----------
  // (kept dependency-free — no external noise lib — but layered so the
  // sine-grid artifacts of the original single-octave version disappear)

  function hash2(x, z) {
    // cheap deterministic pseudo-random wobble used to break sine symmetry
    return Math.sin(x * 12.9898 + z * 78.233) * 43758.5453 % 1;
  }

  function warp(x, z) {
    const wx = Math.sin(x * 0.011 + z * 0.017) * 6.5 + Math.cos(z * 0.013 - x * 0.009) * 4.0;
    const wz = Math.cos(x * 0.014 - z * 0.012) * 6.5 + Math.sin(z * 0.018 + x * 0.01) * 4.0;
    return { wx, wz };
  }

  function fbm(x, z) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    const octaves = [
      { a: 4.4, f: 0.021, px: -2.0, pz: 1.4 },
      { a: 2.8, f: 0.045, px: 1.0, pz: 0.0 },
      { a: 3.2, f: 0.012, px: 0.7, pz: 0.0 },
      { a: 1.3, f: 0.09, px: 3.0, pz: 0.0 },
      { a: 0.6, f: 0.19, px: 0.4, pz: 2.1 },
      { a: 0.28, f: 0.37, px: 1.8, pz: 0.9 }
    ];
    for (const o of octaves) {
      sum += Math.sin(x * o.f + o.px) * Math.cos(z * o.f * 0.92 + o.pz) * o.a;
      norm += o.a;
    }
    return sum;
  }

  // ridged noise gives crisper ridgelines near the high vista/mountain edge
  function ridged(x, z) {
    const n = fbm(x * 0.6, z * 0.6) / 9;
    return 1 - Math.abs(n);
  }

  function noise2D(x, z) {
    const { wx, wz } = warp(x, z);
    return fbm(x + wx * 0.5, z + wz * 0.5);
  }

  // low-frequency noise used purely for tinting (rock/dry/lush patches),
  // deliberately a different phase set than the height noise so color
  // patches don't line up 1:1 with hills
  function moistureNoise(x, z) {
    const n =
      Math.sin(x * 0.017 + 4.1) * Math.cos(z * 0.019 - 1.7) * 0.6 +
      Math.sin(x * 0.05 - 2.3) * Math.cos(z * 0.047 + 0.6) * 0.3 +
      Math.sin(x * 0.004 + 1.1) * Math.cos(z * 0.006 - 0.4) * 0.35;
    return THREE.MathUtils.clamp(n * 0.5 + 0.5, 0, 1);
  }

  const vistaCenter = { x: 95, z: -72 };
  const vistaRadius = 22;
  const vistaHeight = 34;

  function terrainHeight(x, z) {
    const d = Math.sqrt(x * x + z * z);
    const flatten = Math.min(1, Math.max(0, (d - 14) / 22));
    let h = noise2D(x, z) * flatten;
    h += Math.sin(x * 0.018) * Math.cos(z * 0.016) * 1.8 * flatten;

    // gentle ridged detail, faded in with distance so the near-spawn
    // clearing stays soft underfoot but the wider valley feels carved
    h += (ridged(x, z) - 0.5) * 1.4 * flatten;

    const vd = Math.sqrt(
      (x - vistaCenter.x) * (x - vistaCenter.x) +
      (z - vistaCenter.z) * (z - vistaCenter.z)
    );
    const vt = 1 - Math.min(1, Math.max(0, vd / (vistaRadius * 1.7)));
    const smooth = vt * vt * (3 - 2 * vt);
    h = h + (vistaHeight - h) * smooth;
    return h;
  }

  function terrainNormalApprox(x, z) {
    const e = 0.6;
    const hL = terrainHeight(x - e, z);
    const hR = terrainHeight(x + e, z);
    const hD = terrainHeight(x, z - e);
    const hU = terrainHeight(x, z + e);
    return { sx: (hR - hL) / (2 * e), sz: (hU - hD) / (2 * e) };
  }

  // scalar slope magnitude, handy for both coloring and (optionally)
  // for other modules that want to avoid placing props on steep ground
  function terrainSlope(x, z) {
    const { sx, sz } = terrainNormalApprox(x, z);
    return Math.sqrt(sx * sx + sz * sz);
  }

  const groundSize = 420;
  const segs = 180;
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, segs, segs);
  groundGeo.rotateX(-Math.PI / 2);

  const gPos = groundGeo.attributes.position;
  const gColors = [];

  // shading palette — these all act as *tint multipliers*: climate.js
  // overwrites groundMat.color every frame with the seasonal hue, and
  // these per-vertex values ride underneath it as brightness/texture
  const cLow = new THREE.Color(0x3a4224);   // low, shaded hollows
  const cHigh = new THREE.Color(0x7c8c4c);  // sunlit rises
  const cRock = new THREE.Color(0x8b8478);  // exposed steep ground
  const cDry = new THREE.Color(0x9c9560);   // sparse/dry patches
  const cLush = new THREE.Color(0x445a2e);  // damp, dense growth
  const cPath = new THREE.Color(0xab8f66);  // worn dirt near camp/trails

  const _mix = new THREE.Color();

  for (let i = 0; i < gPos.count; i++) {
    const x = gPos.getX(i);
    const z = gPos.getZ(i);
    const h = terrainHeight(x, z);
    gPos.setY(i, h);

    const heightT = THREE.MathUtils.clamp((h + 2) / 9, 0, 1);
    _mix.copy(cLow).lerp(cHigh, heightT);

    // blend in moisture-driven dry/lush patches
    const moist = moistureNoise(x, z);
    if (moist > 0.55) {
      _mix.lerp(cLush, (moist - 0.55) / 0.45 * 0.55);
    } else if (moist < 0.4) {
      _mix.lerp(cDry, (0.4 - moist) / 0.4 * 0.5);
    }

    // expose rock on steep slopes
    const slope = terrainSlope(x, z);
    const rockT = THREE.MathUtils.clamp((slope - 0.55) / 1.1, 0, 1);
    if (rockT > 0) _mix.lerp(cRock, rockT * 0.85);

    // worn dirt path radiating from the camp clearing at the origin
    const dCamp = Math.sqrt(x * x + z * z);
    const pathT = 1 - THREE.MathUtils.smoothstep(dCamp, 6, 15);
    if (pathT > 0) _mix.lerp(cPath, pathT * 0.6);

    // tiny per-vertex speckle so large flat stretches don't look flat-shaded/plasticky
    const speckle = 1 + (hash2(x, z) % 1) * 0.06;
    gColors.push(
      THREE.MathUtils.clamp(_mix.r * speckle, 0, 1),
      THREE.MathUtils.clamp(_mix.g * speckle, 0, 1),
      THREE.MathUtils.clamp(_mix.b * speckle, 0, 1)
    );
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(gColors, 3));
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  scene.add(ground);

  return {
    terrainHeight,
    terrainNormalApprox,
    terrainSlope,
    moistureNoise,
    groundMat,
    vistaCenter,
    vistaRadius,
    vistaHeight
  };
}