export function createIntro(camera) {
  let active = true;
  let t = 0;
  const duration = 6.8;

  const letterTop    = document.getElementById('letterTop');
  const letterBottom = document.getElementById('letterBottom');
  const skipHint     = document.getElementById('skipHint');
  const hudEl        = document.getElementById('hud');
  hudEl.style.opacity = '0';

  // Set initial aerial camera position so background looks good before Play
  const ang0 = -Math.PI * 0.65;
  camera.position.set(Math.cos(ang0) * 105, 52, Math.sin(ang0) * 105);
  camera.lookAt(0, 7, 0);

  function skip() {
    if (!active) return;
    active = false;
    if (letterTop)    letterTop.style.opacity    = '0';
    if (letterBottom) letterBottom.style.opacity = '0';
    if (skipHint)     skipHint.style.opacity     = '0';
    hudEl.style.opacity = '1';
  }

  function reset() {
    active = true;
    t = 0;
    if (letterTop) {
      letterTop.style.opacity = '1';
      letterTop.textContent = 'THE LAST EMBER';
    }
    if (letterBottom) {
      letterBottom.style.opacity = '1';
      letterBottom.textContent = 'Hearths go cold along the living trail. Ride west to Emberford.';
    }
    if (skipHint) skipHint.style.opacity = '1';
    hudEl.style.opacity = '0';
    // Reset camera to start position
    const ang = -Math.PI * 0.65;
    camera.position.set(Math.cos(ang) * 105, 52, Math.sin(ang) * 105);
    camera.lookAt(0, 7, 0);
  }

  function update(dt) {
    t += dt;
    const p    = Math.min(1, t / duration);
    const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const ang  = -Math.PI * 0.65 + ease * Math.PI * 1.25;
    const rad  = 105 - ease * 78;
    const h    = 52  - ease * 36;
    camera.position.set(Math.cos(ang) * rad, h, Math.sin(ang) * rad);
    camera.lookAt(0, 7 - ease * 5, 0);
    if (p >= 1) skip();
  }

  return {
    get active() { return active; },
    skip,
    reset,
    update
  };
}
