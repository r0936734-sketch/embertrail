export function createIntro(camera) {
  let active = true;
  let t = 0;
  const duration = 6.8;

  const letterTop = document.getElementById('letterTop');
  const letterBottom = document.getElementById('letterBottom');
  const skipHint = document.getElementById('skipHint');
  const hudEl = document.getElementById('hud');
  hudEl.style.opacity = '0';

  function skip() {
    if (!active) return;
    active = false;
    letterTop.style.opacity = '0';
    letterBottom.style.opacity = '0';
    skipHint.style.opacity = '0';
    hudEl.style.opacity = '1';
  }

  function update(dt) {
    t += dt;
    const p = Math.min(1, t / duration);
    const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const ang = -Math.PI * 0.65 + ease * Math.PI * 1.25;
    const rad = 105 - ease * 78;
    const h = 52 - ease * 36;
    camera.position.set(Math.cos(ang) * rad, h, Math.sin(ang) * rad);
    camera.lookAt(0, 7 - ease * 5, 0);
    if (p >= 1) skip();
  }

  return {
    get active() { return active; },
    skip,
    update
  };
}