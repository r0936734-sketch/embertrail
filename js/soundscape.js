export function createSoundscape(audio, zonePoints) {
  // zonePoints: { ridge: {x,z}, waters: [{x,z}, ...], meadow: {x,z} }
  let built = false;
  let windGain, waterGain, rainGain, chirpTimer = 0;
  let heardLightning = 0;

  function makeNoiseSource(ctx, type) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = type === 'wind' ? 500 : type === 'rain' ? 3200 : 1400;
    filter.Q.value = type === 'wind' ? 0.6 : type === 'rain' ? 0.35 : 0.9;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    return gain;
  }

  function build(ctx) {
    windGain = makeNoiseSource(ctx, 'wind');
    waterGain = makeNoiseSource(ctx, 'water');
    rainGain = makeNoiseSource(ctx, 'rain');
    built = true;
  }

  function dist(px, pz, p) {
    return Math.hypot(px - p.x, pz - p.z);
  }

  function update(dt, elapsed, playerPos, isDay, muted, weather = {}) {
    if (!audio.audioCtx || muted) {
      if (windGain) windGain.gain.value = 0;
      if (waterGain) waterGain.gain.value = 0;
      if (rainGain) rainGain.gain.value = 0;
      return;
    }
    if (!built) build(audio.audioCtx);

    const ridgeD = dist(playerPos.x, playerPos.z, zonePoints.ridge);
    const windT = 1 - THREE.MathUtils.clamp(ridgeD / 55, 0, 1);
    windGain.gain.value = windT * 0.05;

    let nearestWater = Infinity;
    zonePoints.waters.forEach(w => { nearestWater = Math.min(nearestWater, dist(playerPos.x, playerPos.z, w)); });
    const waterT = 1 - THREE.MathUtils.clamp(nearestWater / 20, 0, 1);
    waterGain.gain.value = waterT * 0.07;

    const rainAmount = weather.rainAmount || 0;
    rainGain.gain.value = rainAmount * 0.075;
    if (weather.lightningCount > heardLightning) {
      heardLightning = weather.lightningCount;
      const thunderDelay = 550 + Math.random() * 1300;
      setTimeout(() => {
        if (!audio.muted && audio.audioCtx) playThunder(audio.audioCtx);
      }, thunderDelay);
    }

    // occasional distant birdsong near the meadow, daytime only
    if (isDay) {
      const meadowD = dist(playerPos.x, playerPos.z, zonePoints.meadow);
      if (meadowD < 40) {
        chirpTimer -= dt;
        if (chirpTimer <= 0) {
          chirpTimer = 1.2 + Math.random() * 3;
          playChirp(audio.audioCtx, 1 - meadowD / 40);
        }
      }
    }
  }

  function playChirp(ctx, strength) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = 1800 + Math.random() * 900;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.3, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.05 * strength, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  function playThunder(ctx) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70 + Math.random() * 25, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.8);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.2);
  }

  return { update };
}
