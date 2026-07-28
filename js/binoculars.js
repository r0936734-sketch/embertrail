export function createBinoculars(pois) {
  const ridge = { x: 95, z: -72, r: 22 };
  let active = false;
  let nearRidge = false;

  const promptEl = document.createElement('div');
  Object.assign(promptEl.style, {
    position: 'fixed', left: '50%', bottom: '30%', transform: 'translateX(-50%)',
    padding: '8px 16px', background: 'rgba(20,16,12,0.72)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '14px', borderRadius: '9px',
    border: '1px solid rgba(255,255,255,0.18)', opacity: '0', transition: 'opacity 0.25s',
    pointerEvents: 'none', zIndex: 50
  });
  promptEl.classList.add('context-prompt');
  promptEl.dataset.mobileKey = 'b';
  document.body.appendChild(promptEl);

  const viewEl = document.createElement('div');
  viewEl.className = 'binocular-view';
  viewEl.setAttribute('aria-hidden', 'true');
  viewEl.innerHTML = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <mask id="binocularLensCutouts" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="white" />
          <ellipse cx="33.5" cy="50" rx="24.5" ry="42" fill="black" />
          <ellipse cx="66.5" cy="50" rx="24.5" ry="42" fill="black" />
        </mask>
      </defs>
      <rect class="binocular-shade" width="100" height="100" mask="url(#binocularLensCutouts)" />
      <ellipse class="binocular-inner" cx="33.5" cy="50" rx="25.4" ry="42.9" />
      <ellipse class="binocular-inner" cx="66.5" cy="50" rx="25.4" ry="42.9" />
      <ellipse class="binocular-lens" cx="33.5" cy="50" rx="24.3" ry="41.8" />
      <ellipse class="binocular-lens" cx="66.5" cy="50" rx="24.3" ry="41.8" />
      <path class="binocular-bridge" d="M48.5 47 Q50 43.5 51.5 47 L51.5 53 Q50 56.5 48.5 53 Z" />
    </svg>
    <div class="binocular-readout">BINOCULARS · B TO LOWER</div>
  `;
  document.body.appendChild(viewEl);

  const markers = pois.map(p => {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed', padding: '4px 10px', background: 'rgba(15,18,26,0.6)',
      border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px',
      color: '#fff', fontSize: '11px', letterSpacing: '0.03em',
      transform: 'translate(-50%,-50%)', opacity: '0', pointerEvents: 'none', zIndex: 15,
      transition: 'opacity 0.15s'
    });
    document.body.appendChild(el);
    return { p, el };
  });

  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'b') return;
    if (!nearRidge && !active) return;
    active = !active;
  });

  const v = new THREE.Vector3();

  function insideLens(x, y) {
    const left = ((x + 0.33) / 0.49) ** 2 + (y / 0.84) ** 2 < 1;
    const right = ((x - 0.33) / 0.49) ** 2 + (y / 0.84) ** 2 < 1;
    return left || right;
  }

  function update(dt, camera, playerPos, isDiscoveredFn) {
    const d = Math.hypot(playerPos.x - ridge.x, playerPos.z - ridge.z);
    nearRidge = d < ridge.r;
    if (active && !nearRidge) active = false;
    promptEl.textContent = active ? 'Press B to lower binoculars' : 'Press B to raise binoculars';
    promptEl.style.opacity = (nearRidge || active) ? '1' : '0';
    viewEl.classList.toggle('is-active', active);

    if (!active) {
      markers.forEach(m => { m.el.style.opacity = '0'; });
      return;
    }

    camera.fov = 20;
    camera.updateProjectionMatrix();

    markers.forEach(m => {
      if (isDiscoveredFn(m.p.name)) { m.el.style.opacity = '0'; return; }
      v.set(m.p.x, 3, m.p.z).project(camera);
      const behind = v.z > 1;
      if (behind || v.x < -1.05 || v.x > 1.05 || v.y < -1.05 || v.y > 1.05 || !insideLens(v.x, v.y)) {
        m.el.style.opacity = '0';
        return;
      }
      const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
      m.el.style.left = sx + 'px';
      m.el.style.top = sy + 'px';
      m.el.textContent = m.p.name;
      m.el.style.opacity = '0.9';
    });
  }

  return { update, get active() { return active; } };
}
