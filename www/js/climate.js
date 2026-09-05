export function createClimate(deps) {
  const {
    scene,                    // ← now received
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
    groundMat,
    treeLeafMat,
    cherryCanopyMats,
    sakuraPalette,
    snowSys,
    petalSys,
    leafSys,
    mountains
  } = deps;

  const seasonNames = ['winter', 'spring', 'summer', 'autumn'];

  const seasonPalette = {
    winter: {
      skyTop: 0x0a1226, skyBottom: 0x5b7086, ground: 0xd9e2ee,
      cherry: 0x6b5236, pine: 0x1c3430,
      near: 0x8a97ab, mid: 0xa8b8c8, far: 0xc0d0dc,
      snow: 1.0, petal: 0.0, leaf: 0.05, mountainSnow: 1.0,
      weather: '❄ Snowfall'
    },
    spring: {
      skyTop: 0x27425e, skyBottom: 0xaecbe0, ground: 0x8fae6a,
      cherry: 0xf7c3d6, pine: 0x2b4a2c,
      near: 0x70756c, mid: 0x7a93a8, far: 0xa9bfce,
      snow: 0.05, petal: 1.0, leaf: 0.0, mountainSnow: 0.55,
      weather: '🌸 Cherry Blossoms'
    },
    summer: {
      skyTop: 0x123a63, skyBottom: 0x6f9bc9, ground: 0x5f8a45,
      cherry: 0x4f7a3a, pine: 0x274d2a,
      near: 0x6d746d, mid: 0x7a93a8, far: 0xa9bfce,
      snow: 0.0, petal: 0.12, leaf: 0.0, mountainSnow: 0.12,
      weather: '☀ Clear Skies'
    },
    autumn: {
      skyTop: 0x2b1f33, skyBottom: 0xa6784f, ground: 0xb08850,
      cherry: 0xd9843a, pine: 0x4d4326,
      near: 0x6b5a3a, mid: 0x8a7a60, far: 0xa89878,
      snow: 0.08, petal: 0.0, leaf: 1.0, mountainSnow: 0.30,
      weather: '🍂 Falling Leaves'
    }
  };

  const nightSky = {
    top: new THREE.Color(0x03060d),
    bottom: new THREE.Color(0x0d1524)
  };
  const duskTint = new THREE.Color(0xff9a5a);

  let climateWarming = 0;
  let seasonIdx = 0;
  let seasonT = 0;
  let seasonDurations = [70, 70, 80, 70];
  let gameMinutes = 21 * 60 + 40;
  let lastDayAmt = 1;

  function recomputeSeasonDurations() {
    seasonDurations[0] = THREE.MathUtils.lerp(70, 40, climateWarming);
    seasonDurations[1] = 70;
    seasonDurations[2] = THREE.MathUtils.lerp(80, 118, climateWarming);
    seasonDurations[3] = THREE.MathUtils.lerp(70, 58, climateWarming);
  }

  const _c1 = new THREE.Color();
  const _c2 = new THREE.Color();
  const _skyTop = new THREE.Color();
  const _skyBottom = new THREE.Color();
  const _seasonTop = new THREE.Color();
  const _seasonBottom = new THREE.Color();
  let lastWeatherLabel = '';
  let lastDriftLabel = '';
  let lastNightAmt = -1;

  function lerpHex(a, b, t) {
    return _c1.set(a).lerp(_c2.set(b), t);
  }

  function skipSeason() {
    seasonIdx = (seasonIdx + 1) % 4;
    seasonT = 0;
    gameMinutes = 12 * 60;
  }

  function sleep() {
    gameMinutes = (gameMinutes + 720) % 1440;
  }

  function update(dt, elapsed) {
    climateWarming = Math.min(1, elapsed / (60 * 18));
    recomputeSeasonDurations();

    seasonT += dt;
    if (seasonT > seasonDurations[seasonIdx]) {
      seasonT -= seasonDurations[seasonIdx];
      seasonIdx = (seasonIdx + 1) % 4;
    }

    const dur = seasonDurations[seasonIdx];
    const blend = THREE.MathUtils.smoothstep(seasonT / dur, 0.55, 1.0);
    const curName = seasonNames[seasonIdx];
    const nextName = seasonNames[(seasonIdx + 1) % 4];
    const cur = seasonPalette[curName];
    const nxt = seasonPalette[nextName];

    const snowAmt = THREE.MathUtils.lerp(cur.snow, nxt.snow, blend) * (1 - climateWarming * 0.35);
    const petalAmt = THREE.MathUtils.lerp(cur.petal, nxt.petal, blend);
    const leafAmt = THREE.MathUtils.lerp(cur.leaf, nxt.leaf, blend);
    const mountainSnowAmt = THREE.MathUtils.lerp(cur.mountainSnow, nxt.mountainSnow, blend) *
                            (1 - climateWarming * 0.5);

    snowSys.mat.opacity = snowAmt * 0.85;
    petalSys.mat.opacity = petalAmt * 0.8;
    leafSys.mat.opacity = leafAmt * 0.7;

    groundMat.color.copy(lerpHex(cur.ground, nxt.ground, blend));

    cherryCanopyMats.forEach((mat, idx) => {
      const base = sakuraPalette[idx];
      const curTarget = curName === 'spring' ? base : cur.cherry;
      const nxtTarget = nextName === 'spring' ? base : nxt.cherry;
      mat.color.copy(lerpHex(curTarget, nxtTarget, blend));
    });
    treeLeafMat.color.copy(lerpHex(cur.pine, nxt.pine, blend));

    // mountains
    mountains.updateMountainClimate(
      {
        near: THREE.MathUtils.lerp(cur.near, nxt.near, blend),
        mid:  THREE.MathUtils.lerp(cur.mid,  nxt.mid,  blend),
        far:  THREE.MathUtils.lerp(cur.far,  nxt.far,  blend)
      },
      mountainSnowAmt
    );

    // day / night cycle
    gameMinutes += dt * 1.5;
    if (gameMinutes >= 1440) gameMinutes -= 1440;

    const dayAngle = (gameMinutes / 1440) * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(dayAngle);
    const sunDist = 270;

    sunMesh.position.set(
      Math.cos(dayAngle) * sunDist,
      sunHeight * sunDist * 0.9 + 40,
      -60
    );
    moon.position.set(
      Math.cos(dayAngle + Math.PI) * sunDist * 0.8,
      Math.sin(dayAngle + Math.PI) * sunDist * 0.6 + 40,
      -80
    );
    moonGlow.position.copy(moon.position);
    sunLight.position.copy(sunMesh.position);
    moonLight.position.copy(moon.position);

    const dayAmt = THREE.MathUtils.smoothstep(sunHeight, -0.15, 0.35);
    lastDayAmt = dayAmt;
    const duskAmt = 1 - Math.min(1, Math.abs(sunHeight) / 0.3);

    sunLight.intensity = dayAmt * 1.08;
    moonLight.intensity = (1 - dayAmt) * 0.42;
    ambientLight.intensity = THREE.MathUtils.lerp(0.35, 1.0, dayAmt);
    hemiLight.intensity = THREE.MathUtils.lerp(0.22, 0.6, dayAmt);
    sunMesh.material.opacity = dayAmt;
    starsMat.opacity = (1 - dayAmt) * 0.78;
    skyUniforms.nightAmt.value = 1 - dayAmt;
    const nightAmt = 1 - dayAmt;
    if (Math.abs(nightAmt - lastNightAmt) > 0.01) {
      lastNightAmt = nightAmt;
      planetsGroup.children.forEach(planet => {
        planet.material.opacity = nightAmt * 0.9;
      });
    }

    _seasonTop.copy(lerpHex(cur.skyTop, nxt.skyTop, blend));
    _seasonBottom.copy(lerpHex(cur.skyBottom, nxt.skyBottom, blend));

    _skyTop.copy(nightSky.top).lerp(_seasonTop, dayAmt);
    _skyBottom.copy(nightSky.bottom).lerp(_seasonBottom, dayAmt);
    _skyTop.lerp(duskTint, duskAmt * 0.25);
    _skyBottom.lerp(duskTint, duskAmt * 0.45);

    skyUniforms.topColor.value.copy(_skyTop);
    skyUniforms.bottomColor.value.copy(_skyBottom);

    if (scene && scene.fog) {
      scene.fog.color.copy(_skyBottom);
    }

    const weatherLabel = blend < 0.5 ? cur.weather : nxt.weather;
    const driftLabel = climateWarming < 0.05
      ? 'first winter'
      : '+' + (climateWarming * 2.8).toFixed(1) + '°C drift';
    const weatherText = document.getElementById('weatherText');
    const driftText = document.getElementById('driftText');
    if (weatherText && weatherLabel !== lastWeatherLabel) {
      lastWeatherLabel = weatherLabel;
      weatherText.textContent = weatherLabel;
    }
    if (driftText && driftLabel !== lastDriftLabel) {
      lastDriftLabel = driftLabel;
      driftText.textContent = driftLabel;
    }
  }

  return {
    update,
    skipSeason,
    sleep,
    getSeasonName() {
      return seasonNames[seasonIdx];
    },
    get gameMinutes() { return gameMinutes; },
    get climateWarming() { return climateWarming; },
    get dayAmt() { return lastDayAmt; },
    restoreState(state = {}) {
      if (Number.isFinite(state.gameMinutes)) gameMinutes = ((state.gameMinutes % 1440) + 1440) % 1440;
      if (Number.isInteger(state.seasonIdx)) seasonIdx = THREE.MathUtils.clamp(state.seasonIdx, 0, seasonNames.length - 1);
      if (Number.isFinite(state.seasonT)) seasonT = Math.max(0, state.seasonT);
    }
  };
}
