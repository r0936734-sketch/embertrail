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

  return {
    bgm,
    hoofPool,
    hoofIdx: 0,
    rear,
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
  updateSoundIcon(audio);
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
