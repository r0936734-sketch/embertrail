export function createAudio() {
  const bgm = new Audio('bgm.mp3');
  bgm.loop = true;
  bgm.volume = 0.38;

  const hoofPool = [];
  for (let i = 0; i < 4; i++) {
    const a = new Audio('horse.mp3');
    a.volume = 0.55;
    hoofPool.push(a);
  }
  const rear = new Audio('rear.mp3');
  rear.preload = 'auto';
  rear.volume = 0.72;
  const arrowShot = new Audio('arrow.mp3');
  const ticWin = new Audio('ticwin.mp3');
  arrowShot.preload = 'auto';
  arrowShot.volume = 0.62;
  ticWin.preload = 'auto';
  ticWin.volume = 0.82;
  const miraVoices = {
    ask: new Audio('voices/miraask.m4a'),
    characterNo: new Audio('voices/miracharno.m4a'),
    characterYes: new Audio('voices/miracharyes.m4a'),
    yes: new Audio('voices/mirayes.m4a')
  };
  const activityVoices = {
    flameAsk: new Audio('voices/flameask.m4a'),
    flameYes: new Audio('voices/flameyes.m4a'),
    windmillAsk: new Audio('voices/windmillask.m4a'),
    windmillYes: new Audio('voices/windmillyes.m4a'),
    no: new Audio('voices/miracharno.m4a')
  };
  Object.values(miraVoices).forEach(voice => {
    voice.preload = 'auto';
    voice.volume = 0.9;
  });
  Object.values(activityVoices).forEach(voice => {
    voice.preload = 'auto';
    voice.volume = 0.9;
  });

  return {
    bgm,
    hoofPool,
    hoofIdx: 0,
    rear,
    arrowShot,
    ticWin,
    miraVoices,
    activityVoices,
    started: false,
    muted: false,
    audioCtx: null
  };
}

export function startAudio(audio) {
  if (audio.started) return;
  audio.started = true;

  try {
    audio.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {}

  audio.bgm.play().catch(() => {});
  updateSoundIcon(audio);
}

export function toggleMute(audio) {
  if (!audio.started) {
    startAudio(audio);
    return;
  }
  audio.muted = !audio.muted;
  audio.bgm.muted = audio.muted;
  audio.hoofPool.forEach(a => (a.muted = audio.muted));
  audio.rear.muted = audio.muted;
  audio.arrowShot.muted = audio.muted;
  audio.ticWin.muted = audio.muted;
  Object.values(audio.miraVoices).forEach(voice => { voice.muted = audio.muted; });
  Object.values(audio.activityVoices).forEach(voice => { voice.muted = audio.muted; });
  updateSoundIcon(audio);
}

function playEffect(audio, effect) {
  if (!audio.started || audio.muted) return;
  effect.pause();
  effect.currentTime = 0;
  effect.play().catch(() => {});
}

export function playArrowShot(audio) {
  playEffect(audio, audio.arrowShot);
}

export function playTicWin(audio) {
  playEffect(audio, audio.ticWin);
}

export function playMiraVoice(audio, voiceName, onStart = () => {}, onFinish = () => {}) {
  return playVoice(audio, audio.miraVoices, voiceName, onStart, onFinish);
}

export function playActivityVoice(audio, voiceName, onStart = () => {}, onFinish = () => {}) {
  return playVoice(audio, audio.activityVoices, voiceName, onStart, onFinish);
}

function playVoice(audio, voices, voiceName, onStart, onFinish) {
  if (!audio.started || audio.muted) {
    onFinish(false);
    return Promise.resolve(false);
  }
  const voice = voices[voiceName];
  if (!voice) {
    onFinish(false);
    return Promise.resolve(false);
  }
  const allVoices = [...Object.values(audio.miraVoices), ...Object.values(audio.activityVoices)];
  allVoices.forEach(other => {
    if (other !== voice) other.pause();
  });
  voice.pause();
  voice.currentTime = 0;
  return new Promise(resolve => {
    let settled = false;
    const finish = played => {
      if (settled) return;
      settled = true;
      voice.removeEventListener('ended', onEnded);
      voice.removeEventListener('error', onError);
      clearTimeout(timeout);
      onFinish(played);
      resolve(played);
    };
    const onEnded = () => finish(true);
    const onError = () => finish(false);
    const timeout = setTimeout(() => finish(true), 30000);
    voice.addEventListener('ended', onEnded, { once: true });
    voice.addEventListener('error', onError, { once: true });
    onStart();
    voice.play().catch(() => finish(false));
  });
}

function updateSoundIcon(audio) {
  const el = document.getElementById('soundBtn');
  if (el) el.textContent = audio.muted ? '🔇' : '🔊';
}

export function playHoof(audio, strength) {
  if (!audio.started || audio.muted) return;
  const a = audio.hoofPool[audio.hoofIdx];
  audio.hoofIdx = (audio.hoofIdx + 1) % audio.hoofPool.length;
  a.currentTime = 0;
  a.volume = Math.min(0.75, 0.35 + strength * 0.4);
  a.playbackRate = 0.85 + strength * 0.35;
  a.play().catch(() => {});
}

// Synthesized whistle (no external file needed)
export function playWhistle(audio) {
  if (!audio.started || audio.muted || !audio.audioCtx) return;

  const ctx = audio.audioCtx;
  const now = ctx.currentTime;

  // A soft, slower rising whistle.
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'sine';

  osc1.frequency.setValueAtTime(600, now);
  osc1.frequency.exponentialRampToValueAtTime(820, now + 0.35);
  osc2.frequency.setValueAtTime(700, now + 0.15);
  osc2.frequency.exponentialRampToValueAtTime(950, now + 0.55);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + 0.12);
  osc1.stop(now + 0.95);
  osc2.stop(now + 0.95);
}

export function playRear(audio) {
  if (!audio.started || audio.muted) return;
  const rear = audio.rear;
  rear.currentTime = 0;
  rear.volume = 0.72;
  rear.play().catch(() => {});
}

// Synthesized hit sound for space enemies
export function playHit(audio) {
  if (!audio.started || audio.muted || !audio.audioCtx) return;

  const ctx = audio.audioCtx;
  const now = ctx.currentTime;

  // Short metallic ping
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}
