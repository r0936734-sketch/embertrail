export function createUI(player, landmarkPois = [], onDiscoverEvent = () => {}) {
  const clockEl = document.getElementById('clockEl');
  const speedEl = document.getElementById('speedEl');
  const fpsEl = document.getElementById('fpsEl');
  const gaitEl = document.getElementById('gaitEl');
  const staminaFill = document.getElementById('staminaFill');

  // compass
  const compassWrap = document.getElementById('compassWrap');
  const compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const compassSpans = [];
  for (let i = 0; i < 7; i++) {
    const s = document.createElement('span');
    compassWrap.appendChild(s);
    compassSpans.push(s);
  }
  let compassCenterX = 130;
  let compassSpanW = 65;

  function recalcCompassLayout() {
    compassCenterX = compassWrap.clientWidth / 2;
    compassSpanW = compassWrap.clientWidth / 4;
    compassSpans.forEach(s => { s.style.width = compassSpanW + 'px'; });
  }
  recalcCompassLayout();
  window.addEventListener('resize', recalcCompassLayout);

  function updateCompass(headingRad) {
    let deg = headingRad * 180 / Math.PI;
    deg = ((deg % 360) + 360) % 360;
    const exact = deg / 45;
    const base = Math.floor(exact);
    const activeIdx = Math.round(exact);

    for (let k = 0; k < 7; k++) {
      const i = base - 3 + k;
      const label = compassDirs[((i % 8) + 8) % 8];
      const x = compassCenterX + (i - exact) * compassSpanW - compassSpanW / 2;
      const span = compassSpans[k];
      span.textContent = label;
      span.style.left = x + 'px';
      if (i === activeIdx) {
        span.style.opacity = '1';
        span.style.fontWeight = '700';
        span.style.color = '#ffffff';
      } else {
        span.style.opacity = '0.5';
        span.style.fontWeight = '400';
        span.style.color = '#c7cedb';
      }
    }
  }

  // Camp locations and landmark POIs share one discovery system.
  const localPois = [
    { name: 'Camp by the Embers', x: 0, z: 0, r: 9, flavor: 'Warm firelight. The valley begins here.' },
    { name: 'The Blossom Grove', x: -34, z: 24, r: 18, flavor: 'Petals drift on the wind. A quiet place to rest.' },
    { name: 'Cabins at Trail’s End', x: 19, z: 11, r: 11, flavor: 'Smoke rises from the chimneys. Someone still lives here.' },
    { name: 'Sunveil Ridge', x: 95, z: -72, r: 18, flavor: 'The summit. Mist parts. The whole trail lies below.' },
    { name: 'Northern Pines', x: -55, z: -30, r: 14, flavor: 'Tall dark pines. The deer watch from the shadows.' },
    { name: 'Eastern Meadow', x: 48, z: 28, r: 13, flavor: 'Open grass. Rabbits scatter at the sound of hooves.' }
  ];
  const pois = [
    ...localPois,
    ...landmarkPois.map(p => ({
      name: p.name,
      x: p.pos.x,
      z: p.pos.z,
      r: p.r,
      flavor: p.flavor,
      onDiscover: p.onDiscover
    }))
  ];

  let currentPOI = null;
  let flavorTimer = 0;
  const discovered = new Set();
  const firedEvents = new Set();

  function updatePOI(dt, playerPos) {
    let found = null;
    for (const p of pois) {
      const dx = playerPos.x - p.x;
      const dz = playerPos.z - p.z;
      if (Math.sqrt(dx * dx + dz * dz) < p.r) {
        found = p;
        break;
      }
    }
    if (found !== currentPOI) {
      currentPOI = found;
      const el = document.getElementById('poiCaption');
      const fl = document.getElementById('flavorText');
      if (found) {
        discovered.add(found.name);
        if (found.onDiscover && !firedEvents.has(found.onDiscover)) {
          firedEvents.add(found.onDiscover);
          onDiscoverEvent(found.onDiscover);
        }
        el.textContent = found.name;
        el.style.opacity = '1';
        fl.textContent = found.flavor || '';
        fl.style.opacity = '1';
        flavorTimer = 5.5;
        refreshTracker();
      } else {
        el.style.opacity = '0';
        fl.style.opacity = '0';
      }
    }
    if (flavorTimer > 0) {
      flavorTimer -= dt;
      if (flavorTimer <= 0) {
        document.getElementById('flavorText').style.opacity = '0';
      }
    }
  }

  const trackerEl = document.createElement('div');
  trackerEl.id = 'progressTracker';
  Object.assign(trackerEl.style, {
    position: 'fixed', left: '20px', top: '50%', transform: 'translateY(-50%)',
    padding: '10px 14px', background: 'rgba(15,18,26,0.5)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    color: '#fff', fontSize: '11px', letterSpacing: '0.04em', lineHeight: '1.8',
    zIndex: '10', pointerEvents: 'none', opacity: '0.9'
  });
  document.body.appendChild(trackerEl);

  let lastSpeciesFound = 0;
  let lastSpeciesTotal = 0;
  function refreshTracker() {
    trackerEl.innerHTML =
      '<div style="opacity:0.6;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:2px">Places found</div>' +
      `<div style="font-weight:700;font-size:14px;margin-bottom:6px">${discovered.size} / ${pois.length}</div>` +
      (lastSpeciesTotal > 0
        ? '<div style="opacity:0.6;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:2px">Species observed</div>' +
          `<div style="font-weight:700;font-size:14px">${lastSpeciesFound} / ${lastSpeciesTotal}</div>`
        : '');
  }
  refreshTracker();

  let frameAccum = 0;
  let frameTimer = 0;

  function update(dt, player, climate, speciesProgress) {
    updateCompass(player.heading);
    updatePOI(dt, player.group.position);

    if (speciesProgress && (speciesProgress.found !== lastSpeciesFound || speciesProgress.total !== lastSpeciesTotal)) {
      lastSpeciesFound = speciesProgress.found;
      lastSpeciesTotal = speciesProgress.total;
      refreshTracker();
    }

    const hh = Math.floor(climate.gameMinutes / 60);
    const mm = Math.floor(climate.gameMinutes % 60);
    clockEl.textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    speedEl.textContent = Math.round(Math.abs(player.speed) * 3.6);
    gaitEl.textContent = player.gaitName;

    const pct = Math.round(player.stamina);
    staminaFill.style.width = pct + '%';
    staminaFill.style.background = pct > 50 ? '#6fdc8c' : pct > 20 ? '#e0c15a' : '#e0685a';

    frameAccum++;
    frameTimer += dt;
    if (frameTimer >= 0.5) {
      fpsEl.textContent = Math.round(frameAccum / frameTimer) + ' fps';
      frameAccum = 0;
      frameTimer = 0;
    }
  }

  return {
    update,
    get discoveredCount() { return discovered.size; },
    get totalPois() { return pois.length; },
    isDiscovered(name) { return discovered.has(name); }
  };
}
